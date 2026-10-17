// Bluetooth SIG Heart Rate Service / Heart Rate Measurement.
// https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/HRS_v1.0/out/en/index-en.html
export function parseHeartRate(value) {
  if (!value || value.byteLength < 2) return null;
  const flags = value.getUint8(0);
  if ((flags & 4) && !(flags & 2)) return null; // Supported contact detection reports no contact.
  if ((flags & 1) && value.byteLength < 3) return null;
  const bpm = flags & 1 ? value.getUint16(1, true) : value.getUint8(1);
  return bpm > 0 ? bpm : null;
}

export function currentHeartRate(state, now = performance.now()) {
  return state.heartRateMonitor && now - state.heartRateUpdatedAt < 10000 ? state.heartRate : null;
}

export async function connectHeartRateMonitor({ onValue, onDisconnect }) {
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [0x180D] }] });
  let measurement;
  const changed = event => onValue(parseHeartRate(event.target.value));
  const disconnected = () => {
    measurement?.removeEventListener('characteristicvaluechanged', changed);
    device.removeEventListener('gattserverdisconnected', disconnected);
    onDisconnect();
  };
  try {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(0x180D);
    measurement = await service.getCharacteristic(0x2A37);
    measurement.addEventListener('characteristicvaluechanged', changed);
    device.addEventListener('gattserverdisconnected', disconnected);
    await measurement.startNotifications();
    if (!device.gatt.connected) throw new Error('Heart rate monitor disconnected during setup.');
    return { name: device.name || 'Heart rate monitor', disconnect: () => device.gatt.disconnect() };
  } catch (error) {
    measurement?.removeEventListener('characteristicvaluechanged', changed);
    device.removeEventListener('gattserverdisconnected', disconnected);
    if (device.gatt.connected) device.gatt.disconnect();
    throw error;
  }
}
