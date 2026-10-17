import { trainerGrade, NEUTRAL_GEAR } from './shifting.js';

const FTMS_SERVICE = 0x1826;
const FITNESS_MACHINE_FEATURE = 0x2ACC;
const INDOOR_BIKE_DATA = 0x2AD2;
const FITNESS_MACHINE_CONTROL_POINT = 0x2AD9;
const REQUEST_CONTROL = 0x00;
const SET_INDOOR_BIKE_SIMULATION = 0x11;
const RESPONSE_CODE = 0x80;
const SUCCESS = 0x01;

function controlWrite(characteristic, value) {
  return characteristic.writeValueWithResponse
    ? characteristic.writeValueWithResponse(value)
    : characteristic.writeValue(value);
}

function simulationCommand(grade) {
  const command = new Uint8Array(7);
  const view = new DataView(command.buffer);
  command[0] = SET_INDOOR_BIKE_SIMULATION;
  view.setInt16(1, 0, true); // wind speed: 0.001 m/s
  view.setInt16(3, Math.round(grade * 100), true); // grade: 0.01%
  command[5] = 40; // rolling resistance coefficient: 0.0040
  command[6] = 51; // wind resistance coefficient: 0.51 kg/m
  return command;
}

export async function connectSmartTrainer({ onStatus, onDisconnect }) {
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [FTMS_SERVICE] }] });
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(FTMS_SERVICE);
  const controlPoint = await service.getCharacteristic(FITNESS_MACHINE_CONTROL_POINT);
  const feature = await service.getCharacteristic(FITNESS_MACHINE_FEATURE).catch(() => null);
  const bikeData = await service.getCharacteristic(INDOOR_BIKE_DATA).catch(() => null);
  if (feature) await feature.readValue(); // Confirms the FTMS capability characteristic is available.
  if (bikeData) await bikeData.startNotifications();

  let pendingResponse;
  let active = true;
  let sending = false;
  let lastGrade = null;
  let lastSentAt = 0;

  await controlPoint.startNotifications();
  controlPoint.addEventListener('characteristicvaluechanged', (event) => {
    const value = event.target.value;
    if (value.getUint8(0) !== RESPONSE_CODE || !pendingResponse) return;
    const { opcode, resolve, reject, timer } = pendingResponse;
    if (value.getUint8(1) !== opcode) return;
    clearTimeout(timer);
    pendingResponse = null;
    if (value.getUint8(2) === SUCCESS) resolve();
    else reject(new Error(`Trainer rejected FTMS command 0x${opcode.toString(16)}.`));
  });

  async function sendCommand(command) {
    const opcode = command[0];
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pendingResponse?.opcode === opcode) pendingResponse = null;
        reject(new Error('Trainer did not acknowledge the control command.'));
      }, 2500);
      pendingResponse = { opcode, resolve, reject, timer };
    });
    try {
      await controlWrite(controlPoint, command);
      await response;
    } catch (error) {
      if (pendingResponse?.opcode === opcode) {
        clearTimeout(pendingResponse.timer);
        pendingResponse = null;
      }
      throw error;
    }
  }

  device.addEventListener('gattserverdisconnected', () => {
    active = false;
    onDisconnect?.();
  });

  await sendCommand(new Uint8Array([REQUEST_CONTROL]));
  onStatus(`Connected to ${device.name || 'smart trainer'} · route resistance active`);

  return {
    updateGrade(routeGrade, difficulty, gear = NEUTRAL_GEAR) {
      if (!active || sending) return;
      const targetGrade = trainerGrade(routeGrade, difficulty, gear);
      const now = performance.now();
      if (lastGrade !== null && Math.abs(targetGrade - lastGrade) < .15 && now - lastSentAt < 2500) return;
      if (now - lastSentAt < 400) return;
      sending = true;
      sendCommand(simulationCommand(targetGrade))
        .then(() => { lastGrade = targetGrade; lastSentAt = performance.now(); })
        .catch((error) => onStatus(`Trainer control paused: ${error.message}`))
        .finally(() => { sending = false; });
    },
  };
}
