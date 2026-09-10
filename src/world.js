import * as THREE from 'three';
import { routeCurve, routePoints, terrainHeight } from './route.js';

function addTerrain(scene) {
  const geometry = new THREE.PlaneGeometry(900, 900, 80, 80);
  const positions = geometry.attributes.position;

  for (let index = 0; index < positions.count; index += 1) {
    positions.setZ(index, terrainHeight(positions.getX(index), -positions.getY(index)));
  }

  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: '#6e9b50', roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

function addRoad(scene) {
  const vertices = [];
  const indices = [];

  for (let index = 0; index < routePoints.length; index += 1) {
    const tangent = routeCurve.getTangent(index / (routePoints.length - 1)).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(3.1);
    const center = routePoints[index].clone().add(new THREE.Vector3(0, 0.28, 0));

    vertices.push(...center.clone().sub(side), ...center.clone().add(side));
    if (index < routePoints.length - 1) {
      indices.push(index * 2, index * 2 + 1, index * 2 + 2, index * 2 + 1, index * 2 + 3, index * 2 + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const road = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: '#3c4245', roughness: 0.94, side: THREE.DoubleSide }),
  );
  road.receiveShadow = true;
  scene.add(road);

  for (const side of [-3.02, 3.02]) {
    const edgePoints = routePoints.map((point, index) => {
      const tangent = routeCurve.getTangent(index / (routePoints.length - 1)).normalize();
      return point.clone()
        .add(new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(side))
        .add(new THREE.Vector3(0, 0.3, 0));
    });
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(edgePoints),
      new THREE.LineBasicMaterial({ color: '#e7e8dc' }),
    ));
  }
}

function addTree(scene, x, z, scale) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * scale, 0.3 * scale, 2.5 * scale, 7),
    new THREE.MeshStandardMaterial({ color: '#754b2c' }),
  );
  trunk.position.y = 1.25 * scale;

  const greens = ['#315b36', '#3f713d', '#274f36'];
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.4 * scale, 4.6 * scale, 8),
    new THREE.MeshStandardMaterial({ color: greens[Math.floor(Math.random() * greens.length)] }),
  );
  crown.position.y = 4 * scale;

  tree.add(trunk, crown);
  tree.position.set(x, terrainHeight(x, z), z);
  tree.traverse((object) => { object.castShadow = true; });
  scene.add(tree);
}

function addTrees(scene) {
  for (let index = 0; index < 360; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 60 + Math.random() * 390;
    addTree(scene, Math.cos(angle) * radius, Math.sin(angle) * radius, 0.55 + Math.random() * 1.1);
  }
}

export function buildWorld(scene) {
  addTerrain(scene);
  addRoad(scene);
  addTrees(scene);
}
