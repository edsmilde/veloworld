import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

// Material names are shared with the editable Blender source.
export function setRiderColors(rig, colors) {
  rig.colors = { ...rig.colors, ...colors };
  rig.model?.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (rig.colors[material.name]) material.color.set(rig.colors[material.name]);
    });
  });
}

function createLimb(length, radius, material) {
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.86, radius, length, 8), material);
  limb.position.y = -length / 2;
  return limb;
}

function createLeg(rider, side, kitMaterial, darkMaterial) {
  const upperLength = 0.72;
  const lowerLength = 0.67;
  const hip = new THREE.Group();
  hip.position.set(side * 0.23, 1.28, 0.08);
  hip.add(createLimb(upperLength, 0.14, darkMaterial));

  const knee = new THREE.Group();
  knee.position.y = -upperLength;
  knee.add(createLimb(lowerLength, 0.11, darkMaterial));
  hip.add(knee);

  const shoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.42),
    new THREE.MeshStandardMaterial({ color: '#f1f2ed' }),
  );
  // The rear of the shoe (heel) meets the ankle; the toe points forward (-Z).
  shoe.position.set(0, -lowerLength, -0.18);
  knee.add(shoe);
  rider.add(hip);
  return { hip, knee, shoe, upperLength, lowerLength };
}

function createArm(rider, side, kitMaterial, skinMaterial) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.32, 2.02, -0.3);
  shoulder.rotation.x = 0.65;
  shoulder.add(createLimb(0.58, 0.1, kitMaterial));

  const elbow = new THREE.Group();
  elbow.position.y = -0.56;
  elbow.rotation.x = -0.45;
  elbow.add(createLimb(0.36, 0.08, skinMaterial));
  shoulder.add(elbow);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), skinMaterial);
  hand.position.set(0, -0.42, 0);
  elbow.add(hand);
  rider.add(shoulder);
}

export function createRider() {
  const rider = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.12;
  rider.add(body);
  const kitMaterial = new THREE.MeshStandardMaterial({ color: '#f15f4e', roughness: 0.55 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: '#172127' });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: '#e5a072' });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.285, 0.9, 5, 10), kitMaterial);
  torso.position.set(0, 1.64, -0.08);
  torso.rotation.x = -0.68;
  body.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.245, 12, 10), skinMaterial);
  head.position.set(0, 2.35, -0.58);
  body.add(head);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: '#f7f3e5', roughness: 0.4 }),
  );
  helmet.position.copy(head.position).add(new THREE.Vector3(0, 0.07, 0));
  body.add(helmet);

  const bike = new THREE.Group();
  const wheelGeometry = new THREE.TorusGeometry(0.52, 0.045, 8, 18);
  for (const z of [-0.72, 0.72]) {
    const wheel = new THREE.Mesh(wheelGeometry, darkMaterial);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.55, z);
    bike.add(wheel);
  }

  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.35), kitMaterial);
  frame.rotation.x = 0.76;
  frame.position.y = 0.88;
  bike.add(frame);

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), darkMaterial);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 1.24, -0.72);
  bike.add(handlebar);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.42), darkMaterial);
  saddle.position.set(0, 1.16, 0.25);
  bike.add(saddle);
  rider.add(bike);

  const legs = [createLeg(body, -1, kitMaterial, darkMaterial), createLeg(body, 1, kitMaterial, darkMaterial)];
  createArm(body, -1, kitMaterial, skinMaterial);
  createArm(body, 1, kitMaterial, skinMaterial);
  rider.traverse((object) => { object.castShadow = true; });

  const rig = { rider, bike, legs, pedalAngle: 0, colors: {}, model: null };
  rig.ready = new GLTFLoader().loadAsync(new URL('../assets/road-cyclist.glb', import.meta.url).href)
    .then((gltf) => {
      rider.children.forEach((child) => { child.visible = false; });
      rig.model = gltf.scene;
      // Blender model uses meters: retain real-world rider and bicycle dimensions.
      rig.model.scale.setScalar(1);
      rig.model.traverse((object) => {
        if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
      });
      rider.add(rig.model);
      rig.mixer = new THREE.AnimationMixer(rig.model);
      gltf.animations.forEach((clip) => rig.mixer.clipAction(clip).play());
      rig.wheels = ['RearWheel', 'FrontWheel'].map((name) => rig.model.getObjectByName(name)).filter(Boolean);
      setRiderColors(rig, rig.colors);
      return rig;
    })
    .catch((error) => { console.warn('Cyclist asset could not load; using the original rider.', error); return rig; });
  return rig;
}

export function updateRider(rig, pose, speed, watts, elapsed, deltaTime, paused = false) {
  const { rider, bike, legs } = rig;
  rider.position.copy(pose.position).add(new THREE.Vector3(0, 0.34, 0));
  const horizontalTangent = pose.tangent.clone().setY(0);
  const horizontalLength = horizontalTangent.length();
  if (horizontalLength > 0.0001) {
    horizontalTangent.divideScalar(horizontalLength);
    const yaw = Math.atan2(-horizontalTangent.x, -horizontalTangent.z);
    const pitch = Math.atan2(pose.tangent.y, horizontalLength);
    rider.rotation.set(0, yaw, 0);
    rider.rotateX(pitch);
  }

  bike.children.forEach((part) => {
    if (part.geometry?.type === 'TorusGeometry') part.rotation.z -= speed * deltaTime / 0.52;
  });

  const cadence = THREE.MathUtils.clamp(55 + watts * 0.12, 55, 105);
  if (rig.model) {
    // GLB origin is the tire contact plane; road is 0.35 m above route points.
    rider.position.copy(pose.position).add(new THREE.Vector3(0, .35, 0));
    rig.mixer.update(paused ? 0 : deltaTime * cadence / 60);
    if (!paused) rig.wheels.forEach((wheel) => { wheel.rotation.x -= speed * deltaTime / .35; });
    return;
  }
  if (!paused) rig.pedalAngle -= deltaTime * cadence * Math.PI / 30;
  legs.forEach((leg, index) => {
    const phase = rig.pedalAngle + index * Math.PI;
    const crankY = 0.56;
    const crankZ = 0.06;
    const crankRadius = 0.22;
    const pedalY = crankY + Math.cos(phase) * crankRadius;
    const pedalZ = crankZ + Math.sin(phase) * crankRadius;
    const deltaY = pedalY - leg.hip.position.y;
    const deltaZ = pedalZ - leg.hip.position.z;
    const distance = THREE.MathUtils.clamp(Math.hypot(deltaY, deltaZ), 0.12, leg.upperLength + leg.lowerLength - 0.02);
    const kneeAngle = -Math.acos(THREE.MathUtils.clamp(
      (distance ** 2 - leg.upperLength ** 2 - leg.lowerLength ** 2) / (2 * leg.upperLength * leg.lowerLength),
      -1,
      1,
    ));
    const hipAngle = Math.atan2(-deltaZ, -deltaY)
      - Math.atan2(leg.lowerLength * Math.sin(kneeAngle), leg.upperLength + leg.lowerLength * Math.cos(kneeAngle));
    leg.hip.rotation.x = hipAngle;
    leg.knee.rotation.x = kneeAngle;
    // Counter-rotate the two leg joints so shoes remain nearly level.
    leg.shoe.rotation.x = -hipAngle - kneeAngle + 0.08;
  });
}
