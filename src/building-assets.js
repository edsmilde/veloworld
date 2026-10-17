import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const templates = new Map();

export function loadBuildingInto(container, type, x, z, scale) {
  const seed = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  const variant = 1 + Math.floor((seed - Math.floor(seed)) * 3);
  const key = `${type}-${variant}`;
  if (!templates.has(key)) {
    templates.set(key, loader.loadAsync(new URL(`../assets/buildings/${key}.glb`, import.meta.url).href));
  }
  return templates.get(key).then(({ scene }) => {
    const building = scene.clone(true);
    building.scale.setScalar(scale);
    building.traverse((object) => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    container.clear(); container.add(building);
  }).catch((error) => console.warn(`Could not load ${key}; keeping basic building.`, error));
}
