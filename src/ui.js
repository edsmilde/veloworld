const byId = (id) => document.getElementById(id);

export function createRideState() {
  return {
    watts: 145,
    speed: 0,
    distance: 0,
    elapsed: 0,
    elevationGain: 0,
    paused: false,
    samples: [],
    lastSample: 0,
    connected: false,
    model: null,
  };
}

export function createUI() {
  return {
    power: byId('power'),
    speed: byId('speed'),
    grade: byId('grade'),
    time: byId('time'),
    distance: byId('distance'),
    elevation: byId('elevation'),
    status: byId('connection-status'),
    physics: byId('physics'),
  };
}

export function renderRideMetrics(ui, state, grade) {
  ui.power.textContent = Math.round(state.watts);
  ui.speed.textContent = (state.speed * 3.6).toFixed(1);
  ui.grade.textContent = grade.toFixed(1);

  const minutes = Math.floor(state.elapsed / 60);
  const seconds = Math.floor(state.elapsed % 60);
  ui.time.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  ui.distance.textContent = `${(state.distance / 1000).toFixed(2)} km`;
  ui.elevation.textContent = `${Math.round(state.elevationGain)} m`;

  if (state.model) {
    ui.physics.textContent = `Physics: ${state.model.power} W × 97% = ${state.model.usable} W · gravity ${state.model.gravity} N · rolling ${state.model.rolling} N · aero ${state.model.aero} N`;
  }
}

function downloadTCX(samples, state) {
  const start = new Date(Date.now() - state.elapsed * 1000).toISOString();
  const track = samples.map((sample) => `<Trackpoint><Time>${new Date(Date.parse(start) + sample.time * 1000).toISOString()}</Time><DistanceMeters>${sample.dist.toFixed(1)}</DistanceMeters><Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Watts>${sample.watts}</Watts><Speed>${sample.speed.toFixed(2)}</Speed></TPX></Extensions></Trackpoint>`).join('');
  return `<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="Biking"><Id>${start}</Id><Lap StartTime="${start}"><TotalTimeSeconds>${state.elapsed.toFixed(1)}</TotalTimeSeconds><DistanceMeters>${state.distance.toFixed(1)}</DistanceMeters><Track>${track}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
}

export function bindControls(state, ui) {
  const slider = byId('power-slider');
  slider.addEventListener('input', () => {
    if (state.connected) return;
    state.watts = Number(slider.value);
    byId('slider-output').value = `${state.watts} W`;
  });

  byId('pause-button').onclick = () => {
    state.paused = !state.paused;
    byId('pause-button').textContent = state.paused ? 'Resume' : 'Pause';
  };

  byId('ble-button').onclick = async () => {
    if (!navigator.bluetooth) {
      ui.status.textContent = 'Web Bluetooth is unavailable here — simulation remains active.';
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [0x1818] }] });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(0x1818);
      const characteristic = await service.getCharacteristic(0x2A63);
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        state.watts = event.target.value.getInt16(2, true);
        state.connected = true;
        slider.disabled = true;
        ui.status.textContent = `Connected to ${device.name || 'power meter'} · live power active`;
      });
    } catch (error) {
      if (error.message?.toLowerCase().includes('globally disabled')) {
        ui.status.textContent = 'Bluetooth is disabled in this browser. Open VeloWorld in Chrome or Edge at localhost, then try again.';
      } else {
        ui.status.textContent = `Could not connect: ${error.message}`;
      }
    }
  };

  byId('export-button').onclick = () => {
    if (!state.samples.length) {
      ui.status.textContent = 'Ride a little longer before exporting.';
      return;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([downloadTCX(state.samples, state)], { type: 'application/vnd.garmin.tcx+xml' }));
    link.download = 'veloworld-ride.tcx';
    link.click();
    URL.revokeObjectURL(link.href);
    ui.status.textContent = 'TCX downloaded — ready to upload to Strava.';
  };
}
