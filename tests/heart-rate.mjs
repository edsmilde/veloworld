import assert from 'node:assert/strict';
import { parseHeartRate, currentHeartRate, connectHeartRateMonitor } from '../src/heart-rate.js';
import { downloadTCX } from '../src/ui.js';
const data = bytes => new DataView(Uint8Array.from(bytes).buffer);
assert.equal(parseHeartRate(data([0, 145])), 145);
assert.equal(parseHeartRate(data([1, 44, 1])), 300);
assert.equal(parseHeartRate(data([4, 145])), null);
assert.equal(parseHeartRate(data([6, 145])), 145);
assert.equal(parseHeartRate(data([0, 0])), null);
assert.equal(parseHeartRate(data([1, 44])), null);
assert.equal(parseHeartRate(data([])), null);
const state = { heartRateMonitor: {}, heartRate: 145, heartRateUpdatedAt: 100, elapsed: 3, distance: 15 };
assert.equal(currentHeartRate(state, 1000), 145);
assert.equal(currentHeartRate(state, 10100), null);
assert.equal(currentHeartRate({ ...state, heartRateMonitor: null }, 1000), null);
const samples = [145, null, 150].map((heartRate, i) => ({ heartRate, time: i, dist: i * 5, speed: 5, watts: 200 }));
const xml = downloadTCX(samples, state);
assert.equal((xml.match(/<HeartRateBpm>/g) || []).length, 2);
assert.match(xml, /<HeartRateBpm><Value>145<\/Value><\/HeartRateBpm>/);
assert.ok(!xml.includes('<Value>0</Value>'));
let listener, disconnected, last, lost = false;
const characteristic = {
  addEventListener: (_, fn) => { listener = fn; },
  removeEventListener: () => { listener = null; },
  startNotifications: async () => {},
};
const device = { name: 'Test strap',
  addEventListener: (_, fn) => { disconnected = fn; }, removeEventListener() {},
  gatt: { connected: true, connect: async () => ({ getPrimaryService: async () => ({ getCharacteristic: async () => characteristic }) }),
    disconnect: () => { device.gatt.connected = false; disconnected(); } },
};
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { bluetooth: { requestDevice: async () => device } } });
const monitor = await connectHeartRateMonitor({ onValue: value => { last = value; }, onDisconnect: () => { lost = true; } });
listener({ target: { value: data([0, 155]) } }); assert.equal(last, 155);
monitor.disconnect(); assert.equal(lost, true); assert.equal(listener, null);
console.log('Passed HR parsing, contact loss, stale readings, TCX fields, Bluetooth notifications and disconnect cleanup.');
