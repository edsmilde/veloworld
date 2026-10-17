import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const templates = new Map();

function variationAt(x, z, salt) {
  const value = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

// Geometry and materials are shared by clones; each variant is fetched once.
export function loadTreeInto(container, type, x, z, scale) {
  const variant = 1 + Math.floor(variationAt(x, z, 1) * 3);
  const key = `${type}-${variant}`;
  if (!templates.has(key)) {
    templates.set(key, loader.loadAsync(new URL(`../assets/trees/${key}.glb`, import.meta.url).href));
  }
  return templates.get(key).then((gltf) => {
    const tree = gltf.scene.clone(true);
    tree.scale.setScalar(scale);
    tree.rotation.y = variationAt(x, z, 2) * Math.PI * 2;
    tree.traverse((object) => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    container.clear();
    container.add(tree);
  }).catch((error) => {
    console.warn(`Could not load ${key}; keeping the basic tree.`, error);
  });
}
