import * as THREE from 'three';

const ROAD_HALF_WIDTH = 3.1;
const ROAD_SURFACE_OFFSET = 0.2;

function addTerrain(scene, world) {
  const segments = 120;
  const vertices = [];
  const indices = [];
  for (let row = 0; row <= segments; row += 1) {
    for (let column = 0; column <= segments; column += 1) {
      const x = -450 + column * (900 / segments);
      const z = -450 + row * (900 / segments);
      const naturalHeight = world.terrain(x, z);
      vertices.push(x, Number.isFinite(naturalHeight) ? naturalHeight : 0, z);
    }
  }
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const topLeft = row * (segments + 1) + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + segments + 1;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: world.ground, roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);
}

function roadTangent(points, index) {
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const tangent = next.clone().sub(previous);
  tangent.y = 0;
  return tangent.lengthSq() ? tangent.normalize() : new THREE.Vector3(0, 0, 1);
}

function addRoad(scene, route, world) {
  const vertices = [];
  const indices = [];
  for (let index = 0; index < route.points.length; index += 1) {
    const tangent = roadTangent(route.points, index);
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(ROAD_HALF_WIDTH);
    const center = route.points[index].clone().add(new THREE.Vector3(0, ROAD_SURFACE_OFFSET, 0));
    vertices.push(...center.clone().sub(side), ...center.clone().add(side));
    if (index < route.points.length - 1) indices.push(index * 2, index * 2 + 1, index * 2 + 2, index * 2 + 1, index * 2 + 3, index * 2 + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const road = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: world.road, roughness: 0.94, side: THREE.DoubleSide }));
  road.receiveShadow = true;
  scene.add(road);

  for (const side of [-(ROAD_HALF_WIDTH - 0.08), ROAD_HALF_WIDTH - 0.08]) {
    const edges = route.points.map((point, index) => {
      const tangent = roadTangent(route.points, index);
      return point.clone().add(new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(side)).add(new THREE.Vector3(0, ROAD_SURFACE_OFFSET + 0.015, 0));
    });
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edges), new THREE.LineBasicMaterial({ color: '#e7e8dc' })));
  }
}

function place(scene, object, world, x, z) {
  object.position.set(x, world.terrain(x, z), z);
  object.traverse((item) => { item.castShadow = true; });
  scene.add(object);
}

function pine(scene, world, x, z, scale) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.3 * scale, 2.5 * scale, 7), new THREE.MeshStandardMaterial({ color: '#754b2c' }));
  trunk.position.y = 1.25 * scale;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.4 * scale, 4.6 * scale, 8), new THREE.MeshStandardMaterial({ color: ['#315b36', '#3f713d', '#274f36'][Math.floor(Math.random() * 3)] }));
  crown.position.y = 4 * scale;
  tree.add(trunk, crown);
  place(scene, tree, world, x, z);
}

function cactus(scene, world, x, z, scale) {
  const plant = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#496b3a' });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22 * scale, .26 * scale, 3 * scale, 8), material);
  trunk.position.y = 1.5 * scale;
  plant.add(trunk);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.12 * scale, .14 * scale, 1.1 * scale, 8), material);
    arm.rotation.z = side * Math.PI / 2;
    arm.position.set(side * .46 * scale, 2.05 * scale, 0);
    plant.add(arm);
  }
  place(scene, plant, world, x, z);
}

function palm(scene, world, x, z, scale) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.14 * scale, .28 * scale, 4.6 * scale, 8), new THREE.MeshStandardMaterial({ color: '#8b5c37' }));
  trunk.position.y = 2.3 * scale;
  tree.add(trunk);
  for (let index = 0; index < 6; index += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(.7 * scale, 2.7 * scale, 4), new THREE.MeshStandardMaterial({ color: '#287143', side: THREE.DoubleSide }));
    leaf.position.y = 4.7 * scale;
    leaf.rotation.z = Math.PI / 2;
    leaf.rotation.y = index * Math.PI / 3;
    tree.add(leaf);
  }
  place(scene, tree, world, x, z);
}

function farm(scene, world, x, z, scale) {
  const group = new THREE.Group();
  const bale = new THREE.Mesh(new THREE.CylinderGeometry(.7 * scale, .7 * scale, 1.1 * scale, 12), new THREE.MeshStandardMaterial({ color: '#d5ae48' }));
  bale.rotation.z = Math.PI / 2;
  bale.position.y = .72 * scale;
  group.add(bale);
  place(scene, group, world, x, z);
}

function villa(scene, world, x, z, scale) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.2 * scale, 2.1 * scale, 2.8 * scale), new THREE.MeshStandardMaterial({ color: '#f0dfbd' }));
  base.position.y = 1.05 * scale;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6 * scale, 1.4 * scale, 4), new THREE.MeshStandardMaterial({ color: '#bd6548' }));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.8 * scale;
  group.add(base, roof);
  place(scene, group, world, x, z);
}

function house(scene, world, x, z, scale) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4 * scale, 2.2 * scale, 3 * scale), new THREE.MeshStandardMaterial({ color: ['#d8e0df', '#e5c5b2', '#d9d3a8'][Math.floor(Math.random() * 3)] }));
  base.position.y = 1.1 * scale;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7 * scale, 1.5 * scale, 4), new THREE.MeshStandardMaterial({ color: '#55585d' }));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3 * scale;
  group.add(base, roof);
  place(scene, group, world, x, z);
}

function addScenery(scene, world) {
  const makers = { pine, cactus, palm, farm, mediterranean: villa, suburb: house };
  if (world.customScenery) {
    const customMakers = { pine, cactus, palm, farm, villa, house };
    world.customScenery.forEach((item) => customMakers[item.scenery](scene, world, item.x, item.z, item.scenery === 'villa' || item.scenery === 'house' ? 1 : 1.15));
    return;
  }
  const maker = makers[world.scenery];
  const total = world.scenery === 'suburb' ? 70 : 190;
  for (let index = 0; index < total; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 60 + Math.random() * 390;
    maker(scene, world, Math.cos(angle) * radius, Math.sin(angle) * radius, 0.55 + Math.random() * 1.1);
  }
}

export function buildWorld(scene, route, world) {
  addTerrain(scene, world);
  addRoad(scene, route, world);
  addScenery(scene, world);
}
