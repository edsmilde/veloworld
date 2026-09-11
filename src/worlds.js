const loop = (radiusX, radiusZ, wobble = 0) => (progress) => {
  const angle = progress * Math.PI * 2;
  return {
    x: radiusX * Math.cos(angle) + wobble * Math.cos(angle * 2),
    z: radiusZ * Math.sin(angle) - wobble * Math.sin(angle * 2),
  };
};

export const WORLDS = {
  mountain: {
    label: 'Alpine Pass',
    sky: '#8bbad5', fog: '#8bbad5', ground: '#6f9259', road: '#3c4245', scenery: 'pine',
    route: loop(220, 150, 35),
    terrain: (x, z) => 2.5 * Math.sin(x / 170) + 4 * Math.cos(z / 220) + 3 * Math.sin((x + z) / 190) + 1.5 * Math.cos((x - z) / 130),
  },
  desert: {
    label: 'Red Rock Desert',
    sky: '#f3b47f', fog: '#f3b47f', ground: '#c98d55', road: '#4a423d', scenery: 'cactus',
    route: loop(240, 135, 24),
    terrain: (x, z) => 1.2 * Math.sin(x / 95) + 1.7 * Math.cos(z / 130) + 0.8 * Math.sin((x + z) / 55),
  },
  tropical: {
    label: 'Tropical Coast',
    sky: '#78d2e6', fog: '#78d2e6', ground: '#83b865', road: '#424246', scenery: 'palm',
    route: loop(210, 145, 28),
    terrain: (x, z) => 1.1 * Math.sin(x / 120) + 1.6 * Math.cos(z / 160) + 0.6 * Math.sin((x - z) / 75),
  },
  farmland: {
    label: 'Golden Farmland',
    sky: '#b8d7eb', fog: '#b8d7eb', ground: '#a7b960', road: '#454647', scenery: 'farm',
    route: loop(235, 155, 16),
    terrain: (x, z) => 1.2 * Math.sin(x / 200) + 1.3 * Math.cos(z / 180),
  },
  mediterranean: {
    label: 'Mediterranean Hills',
    sky: '#91cae2', fog: '#91cae2', ground: '#a9ad61', road: '#454247', scenery: 'mediterranean',
    route: loop(215, 145, 30),
    terrain: (x, z) => 1.8 * Math.sin(x / 160) + 2.4 * Math.cos(z / 205) + 0.8 * Math.sin((x + z) / 95),
  },
  suburb: {
    label: 'Suburban Loop',
    sky: '#a7d2e7', fog: '#a7d2e7', ground: '#79ac69', road: '#3d4143', scenery: 'suburb',
    route: loop(205, 135, 42),
    terrain: (x, z) => 0.7 * Math.sin(x / 190) + 0.8 * Math.cos(z / 170),
  },
};

export function getSelectedWorld() {
  const worldId = new URLSearchParams(location.search).get('world');
  if (worldId === 'custom') {
    const custom = loadCustomWorld();
    if (custom) return createCustomWorld(custom);
  }
  return WORLDS[worldId] ? { id: worldId, ...WORLDS[worldId] } : { id: 'mountain', ...WORLDS.mountain };
}
import { createCustomWorld, loadCustomWorld } from './custom-world.js?v=6';
