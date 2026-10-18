import * as THREE from 'three';
import { loadTreeInto } from './tree-assets.js?v=2';
import { loadBuildingInto } from './building-assets.js';
import { nearestRoad, roadsideBuildings } from './building-placement.js';
import { BUILDING_TYPES } from './scenery-options.js?v=4';
import { gradeTerrainAlongRoad } from './road-terrain.js?v=2';

const ROAD_HALF_WIDTH = 3.1;
// Raised above the terrain mesh enough to stay visible on steep, detailed land.
// This also aligns the road surface with the bicycle wheel contact point.
const ROAD_SURFACE_OFFSET = 0.35;
const GROUND_COLORS = { grass: '#6f9259', rock: '#88847a', sand: '#d6b36c', dirt: '#8d5c3b' };
const TERRAIN_HALF_SIZE = 450;
const TERRAIN_SEGMENTS = 600;
const TERRAIN_STEP = (TERRAIN_HALF_SIZE * 2) / TERRAIN_SEGMENTS;

function createTerrainTexture(world) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d');
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const worldX = x / size * 900 - 450;
      const worldZ = y / size * 900 - 450;
      const color = new THREE.Color(world.ground);
      const variation = (Math.sin(worldX * 1.73 + worldZ * 2.91) + Math.sin(worldX * 4.17 - worldZ * 1.13)) * .035;
      color.offsetHSL(0, 0, variation);
      context.fillStyle = color.getStyle();
      context.fillRect(x, y, 4, 4);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const groundPatchTextures = new Map();

function groundPatchTexture(type) {
  if (groundPatchTextures.has(type)) return groundPatchTextures.get(type);
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 96;
  const context = canvas.getContext('2d');
  const base = new THREE.Color(GROUND_COLORS[type]);
  context.fillStyle = base.getStyle();
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 460; index += 1) {
    const x = (index * 47) % canvas.width;
    const y = (index * 71) % canvas.height;
    context.fillStyle = index % 3 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.10)';
    context.fillRect(x, y, type === 'rock' ? 3 : 2, type === 'rock' ? 2 : 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  groundPatchTextures.set(type, texture);
  return texture;
}

function terrainHeightOnBaseMesh(world, x, z) {
  const rawColumn = Math.max(0, Math.min(TERRAIN_SEGMENTS - .000001, (x + TERRAIN_HALF_SIZE) / TERRAIN_STEP));
  const rawRow = Math.max(0, Math.min(TERRAIN_SEGMENTS - .000001, (z + TERRAIN_HALF_SIZE) / TERRAIN_STEP));
  const column = Math.floor(rawColumn);
  const row = Math.floor(rawRow);
  const tx = rawColumn - column;
  const tz = rawRow - row;
  const x0 = -TERRAIN_HALF_SIZE + column * TERRAIN_STEP;
  const z0 = -TERRAIN_HALF_SIZE + row * TERRAIN_STEP;
  const topLeft = world.terrain(x0, z0);
  const topRight = world.terrain(x0 + TERRAIN_STEP, z0);
  const bottomLeft = world.terrain(x0, z0 + TERRAIN_STEP);
  const bottomRight = world.terrain(x0 + TERRAIN_STEP, z0 + TERRAIN_STEP);
  return tx + tz <= 1
    ? topLeft + tx * (topRight - topLeft) + tz * (bottomLeft - topLeft)
    : topRight * (1 - tz) + bottomLeft * (1 - tx) + bottomRight * (tx + tz - 1);
}

function terrainAlignedCoordinates(start, end) {
  const coordinates = [start];
  const firstLine = Math.ceil((start + TERRAIN_HALF_SIZE) / TERRAIN_STEP);
  for (let line = firstLine; line <= TERRAIN_SEGMENTS; line += 1) {
    const coordinate = -TERRAIN_HALF_SIZE + line * TERRAIN_STEP;
    if (coordinate > start + .0001 && coordinate < end - .0001) coordinates.push(coordinate);
  }
  coordinates.push(end);
  return coordinates;
}

function addGroundPatches(scene, world) {
  if (!world.groundPatches?.length) return;
  const patchesByGround = new Map();
  world.groundPatches.forEach((patch) => {
    if (!patchesByGround.has(patch.ground)) patchesByGround.set(patch.ground, []);
    patchesByGround.get(patch.ground).push(patch);
  });

  patchesByGround.forEach((patches, groundType) => {
    const vertices = [];
    const uvs = [];
    const normals = [];
    const indices = [];
    patches.forEach((patch) => {
      const vertexOffset = vertices.length / 3;
      const xCoordinates = terrainAlignedCoordinates(patch.x - 25, patch.x + 25);
      const zCoordinates = terrainAlignedCoordinates(patch.z - 25, patch.z + 25);
      for (let row = 0; row < zCoordinates.length; row += 1) {
        for (let column = 0; column < xCoordinates.length; column += 1) {
          const x = xCoordinates[column];
          const z = zCoordinates[row];
          // Match the base mesh triangle height exactly; the small offset prevents
          // z-fighting while keeping the material flush with the terrain.
          vertices.push(x, terrainHeightOnBaseMesh(world, x, z) + .025, z);
          // World-space UVs make the material pattern continuous across cells.
          uvs.push(x / 12.5, z / 12.5);
          const sampleDistance = .5;
          const slopeX = (terrainHeightOnBaseMesh(world, x + sampleDistance, z) - terrainHeightOnBaseMesh(world, x - sampleDistance, z)) / (2 * sampleDistance);
          const slopeZ = (terrainHeightOnBaseMesh(world, x, z + sampleDistance) - terrainHeightOnBaseMesh(world, x, z - sampleDistance)) / (2 * sampleDistance);
          const normal = new THREE.Vector3(-slopeX, 1, -slopeZ).normalize();
          // Matching positions receive matching normals, even when they originated
          // from neighboring Builder blocks.
          normals.push(normal.x, normal.y, normal.z);
        }
      }
      for (let row = 0; row < zCoordinates.length - 1; row += 1) {
        for (let column = 0; column < xCoordinates.length - 1; column += 1) {
          const topLeft = vertexOffset + row * xCoordinates.length + column;
          const topRight = topLeft + 1;
          const bottomLeft = topLeft + xCoordinates.length;
          const bottomRight = bottomLeft + 1;
          indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
        }
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    const surface = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: GROUND_COLORS[groundType], map: groundPatchTexture(groundType), roughness: 1, side: THREE.DoubleSide }));
    surface.receiveShadow = true;
    surface.renderOrder = 1;
    scene.add(surface);
  });
}

function createRoadTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 32;
  const context = canvas.getContext('2d');
  context.fillStyle = color; context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 220; index += 1) {
    const x = (index * 37) % canvas.width;
    const y = (index * 19) % canvas.height;
    context.fillStyle = index % 3 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.11)';
    context.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(50, 1);
  return texture;
}

function addTerrain(scene, world) {
  const segments = TERRAIN_SEGMENTS;
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row <= segments; row += 1) {
    for (let column = 0; column <= segments; column += 1) {
      const x = -450 + column * (900 / segments);
      const z = -450 + row * (900 / segments);
      const naturalHeight = world.terrain(x, z);
      vertices.push(x, Number.isFinite(naturalHeight) ? naturalHeight : 0, z);
      uvs.push(column / segments, row / segments);
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
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: createTerrainTexture(world), roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);
}

function roadTangent(points, index) {
  const closed = points[0].distanceToSquared(points.at(-1)) < .000001;
  const previous = points[index === 0 && closed ? points.length - 2 : Math.max(0, index - 1)];
  const next = points[index === points.length - 1 && closed ? 1 : Math.min(points.length - 1, index + 1)];
  const tangent = next.clone().sub(previous);
  tangent.y = 0;
  return tangent.lengthSq() ? tangent.normalize() : new THREE.Vector3(0, 0, 1);
}

function addRoad(scene, route, world) {
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let index = 0; index < route.points.length; index += 1) {
    const tangent = roadTangent(route.points, index);
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(ROAD_HALF_WIDTH);
    const center = route.points[index].clone().add(new THREE.Vector3(0, ROAD_SURFACE_OFFSET, 0));
    vertices.push(...center.clone().sub(side), ...center.clone().add(side));
    const progress = index / Math.max(1, route.points.length - 1);
    uvs.push(progress, 0, progress, 1);
    if (index < route.points.length - 1) indices.push(index * 2, index * 2 + 1, index * 2 + 2, index * 2 + 1, index * 2 + 3, index * 2 + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const road = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: createRoadTexture(world.road), roughness: 0.94, side: THREE.DoubleSide }));
  road.receiveShadow = true;
  scene.add(road);

  // A terrain-colored collar joins the exact road edge to the graded land.
  // It covers sub-grid interpolation differences without vertical retaining walls.
  const fillVertices = [];
  const fillColors = [];
  const addFillTriangle = (a, b, c) => {
    fillVertices.push(...a, ...b, ...c);
    for (const p of [a, b, c]) {
      const type = world.groundAt?.(p.x, p.z);
      const color = new THREE.Color(GROUND_COLORS[type] || world.ground);
      fillColors.push(color.r, color.g, color.b);
    }
  };
  for (let index = 0; index < route.points.length - 1; index += 1) {
    const leftA = new THREE.Vector3().fromArray(vertices, index * 6);
    const rightA = new THREE.Vector3().fromArray(vertices, index * 6 + 3);
    const leftB = new THREE.Vector3().fromArray(vertices, (index + 1) * 6);
    const rightB = new THREE.Vector3().fromArray(vertices, (index + 1) * 6 + 3);
    const centerA = leftA.clone().lerp(rightA,.5);
    const centerB = leftB.clone().lerp(rightB,.5);
    for (const [a, b] of [[leftA, leftB], [rightA, rightB]]) {
      const outwardA=a.clone().sub(centerA).normalize();
      const outwardB=b.clone().sub(centerB).normalize();
      const shoulderPoint = (edge, outward, distance) => {
        const p=edge.clone().addScaledVector(outward,distance);
        const ground = terrainHeightOnBaseMesh(world,p.x,p.z)+.03;
        // Small asphalt lip (~3 cm), then a smooth shoulder; never let a
        // locally higher grass triangle pull the inner shoulder over the road.
        const blend = Math.min(1,distance/4);
        p.y = (edge.y-.03)*(1-blend) + Math.min(ground,edge.y-.03+distance)*(blend);
        return p;
      };
      for (let step=0;step<8;step++) {
        const innerA=shoulderPoint(a,outwardA,step*.5), innerB=shoulderPoint(b,outwardB,step*.5);
        const outerA=shoulderPoint(a,outwardA,(step+1)*.5), outerB=shoulderPoint(b,outwardB,(step+1)*.5);
        addFillTriangle(innerA,outerA,innerB);
        addFillTriangle(innerB,outerA,outerB);
      }
    }
  }
  const fillGeometry = new THREE.BufferGeometry();
  fillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fillVertices, 3));
  fillGeometry.setAttribute('color', new THREE.Float32BufferAttribute(fillColors, 3));
  fillGeometry.computeVertexNormals();
  const fill = new THREE.Mesh(fillGeometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, side: THREE.DoubleSide,
  }));
  fill.name = 'Graded road shoulders';
  fill.receiveShadow = true;
  scene.add(fill);

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
  loadTreeInto(tree, 'pine', x, z, scale);
}

function deciduous(scene, world, x, z, scale) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.2 * scale, .3 * scale, 2.7 * scale, 7), new THREE.MeshStandardMaterial({ color: '#70452d' }));
  trunk.position.y = 1.35 * scale;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.65 * scale, 9, 7), new THREE.MeshStandardMaterial({ color: ['#416c35', '#527d3e', '#365d31'][Math.floor(Math.random() * 3)] }));
  crown.position.y = 3.8 * scale;
  tree.add(trunk, crown);
  place(scene, tree, world, x, z);
  loadTreeInto(tree, 'deciduous', x, z, scale);
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
  loadTreeInto(plant, 'cactus', x, z, scale);
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
  loadTreeInto(tree, 'palm', x, z, scale);
}

function farm(scene, world, x, z, scale) {
  const group = new THREE.Group();
  const bale = new THREE.Mesh(new THREE.CylinderGeometry(.7 * scale, .7 * scale, 1.1 * scale, 12), new THREE.MeshStandardMaterial({ color: '#d5ae48' }));
  bale.rotation.z = Math.PI / 2;
  bale.position.y = .72 * scale;
  group.add(bale);
  place(scene, group, world, x, z);
}

function villa(scene, world, x, z, scale, yaw = 0) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.2 * scale, 2.1 * scale, 2.8 * scale), new THREE.MeshStandardMaterial({ color: '#f0dfbd' }));
  base.position.y = 1.05 * scale;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6 * scale, 1.4 * scale, 4), new THREE.MeshStandardMaterial({ color: '#bd6548' }));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.8 * scale;
  group.add(base, roof);
  place(scene, group, world, x, z);
  loadBuildingInto(group, 'villa', x, z, scale);
  group.rotation.y = yaw;
}

function house(scene, world, x, z, scale, yaw = 0) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4 * scale, 2.2 * scale, 3 * scale), new THREE.MeshStandardMaterial({ color: ['#d8e0df', '#e5c5b2', '#d9d3a8'][Math.floor(Math.random() * 3)] }));
  base.position.y = 1.1 * scale;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7 * scale, 1.5 * scale, 4), new THREE.MeshStandardMaterial({ color: '#55585d' }));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3 * scale;
  group.add(base, roof);
  place(scene, group, world, x, z);
  loadBuildingInto(group, 'house', x, z, scale);
  group.rotation.y = yaw;
}

function extraPlant(type) {
  return (scene, world, x, z, scale, yaw) => {
    const group = new THREE.Group();
    const fallback = new THREE.Mesh(new THREE.SphereGeometry(.8, 8, 6), new THREE.MeshStandardMaterial({ color: '#416a35' }));
    fallback.position.y = .8; group.add(fallback);
    place(scene, group, world, x, z); loadTreeInto(group, type, x, z, scale, yaw);
  };
}

function extraBuilding(type) {
  return (scene, world, x, z, scale, yaw = 0) => {
    const group = new THREE.Group();
    const fallback = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), new THREE.MeshStandardMaterial({ color: '#a4987a' }));
    fallback.position.y = 1.5; group.add(fallback);
    place(scene, group, world, x, z); group.rotation.y = yaw;
    loadBuildingInto(group, type, x, z, scale);
  };
}

function isNearRoad(route, x, z, clearance = ROAD_HALF_WIDTH + 3.5) {
  const clearanceSq = clearance * clearance;
  for (let index = 0; index < route.points.length - 1; index += 1) {
    const start = route.points[index];
    const end = route.points[index + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSq = dx * dx + dz * dz;
    const progress = lengthSq ? Math.max(0, Math.min(1, ((x - start.x) * dx + (z - start.z) * dz) / lengthSq)) : 0;
    const nearestX = start.x + dx * progress;
    const nearestZ = start.z + dz * progress;
    if ((x - nearestX) ** 2 + (z - nearestZ) ** 2 <= clearanceSq) return true;
  }
  return false;
}

function addScenery(scene, world, route) {
  const makers = { pine, cactus, palm, farm, mediterranean: villa, suburb: house };
  if (world.customScenery) {
    const customMakers = { pine, deciduous, cactus, palm, farm, villa, house,
      shrub: extraPlant('shrub'), flowers: extraPlant('flowers'),
      grape: extraPlant('grape'),
      sunflower: extraPlant('sunflower'),
      cottage: extraBuilding('cottage'), barn: extraBuilding('barn') };
    const occupied = [];
    world.customScenery.forEach((item) => {
      if (BUILDING_TYPES.includes(item.scenery)) {
        const buildings = roadsideBuildings(route.points, item, occupied);
        buildings.forEach(p => customMakers[item.scenery](scene, world, p.x, p.z, 1, p.yaw));
        occupied.push(...buildings);
        return;
      }
      if (!isNearRoad(route, item.x, item.z)) customMakers[item.scenery](scene, world, item.x, item.z, item.scale ?? (item.scenery === 'villa' || item.scenery === 'house' ? 1 : 1.15), item.yaw);
    });
    return;
  }
  const maker = makers[world.scenery];
  const total = world.scenery === 'suburb' ? 70 : 190;
  let placed = 0;
  let attempts = 0;
  while (placed < total && attempts < total * 12) {
    attempts += 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = 60 + Math.random() * 390;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (isNearRoad(route, x, z)) continue;
    const road = nearestRoad(route.points, x, z);
    maker(scene, world, x, z, 0.55 + Math.random() * 1.1, Math.atan2(road.x - x, road.z - z));
    placed += 1;
  }
}

export function buildWorld(scene, route, world) {
  // Keep route/physics elevations unchanged; grade only the rendered landscape
  // and scenery foundations to meet the road surface.
  world = gradeTerrainAlongRoad(world, route.points, ROAD_HALF_WIDTH, ROAD_SURFACE_OFFSET);
  addTerrain(scene, world);
  addGroundPatches(scene, world);
  addRoad(scene, route, world);
  addScenery(scene, world, route);
}
