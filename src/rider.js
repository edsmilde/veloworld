import * as THREE from 'three';

function createLimb(length, radius, material) {
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.86, radius, length, 8), material);
  limb.position.y = -length / 2;
  return limb;
}

function createLeg(rider, side, kitMaterial, darkMaterial) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.23, 1.28, 0.08);
  hip.add(createLimb(0.72, 0.14, darkMaterial));

  const knee = new THREE.Group();
  knee.position.y = -0.7;
  knee.add(createLimb(0.67, 0.11, darkMaterial));
  hip.add(knee);

  const shoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.42),
    new THREE.MeshStandardMaterial({ color: '#f1f2ed' }),
  );
  shoe.position.set(0, -0.69, 0.12);
  knee.add(shoe);
  rider.add(hip);
  return { hip, knee, shoe };
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
  const kitMaterial = new THREE.MeshStandardMaterial({ color: '#f15f4e', roughness: 0.55 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: '#172127' });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: '#e5a072' });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.285, 0.9, 5, 10), kitMaterial);
  torso.position.set(0, 1.64, -0.08);
  torso.rotation.x = -0.68;
  rider.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.245, 12, 10), skinMaterial);
  head.position.set(0, 2.35, -0.58);
  rider.add(head);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: '#f7f3e5', roughness: 0.4 }),
  );
  helmet.position.copy(head.position).add(new THREE.Vector3(0, 0.07, 0));
  rider.add(helmet);

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
  rider.add(bike);

  const legs = [createLeg(rider, -1, kitMaterial, darkMaterial), createLeg(rider, 1, kitMaterial, darkMaterial)];
  createArm(rider, -1, kitMaterial, skinMaterial);
  createArm(rider, 1, kitMaterial, skinMaterial);
  rider.traverse((object) => { object.castShadow = true; });

  return { rider, bike, legs };
}

export function updateRider(rig, pose, speed, watts, elapsed, deltaTime) {
  const { rider, bike, legs } = rig;
  rider.position.copy(pose.position).add(new THREE.Vector3(0, 0.34, 0));
  rider.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), pose.tangent.clone().setY(0).normalize());
  rider.rotateX(-Math.asin(pose.tangent.y));

  bike.children.forEach((part) => {
    if (part.geometry?.type === 'TorusGeometry') part.rotation.z -= speed * deltaTime / 0.52;
  });

  const cadence = (48 + watts * 0.18) * THREE.MathUtils.clamp(speed / 3.5, 0.2, 1);
  const pedalAngle = elapsed * cadence * Math.PI / 30;
  legs.forEach((leg, index) => {
    const phase = pedalAngle + index * Math.PI;
    leg.hip.rotation.x = Math.sin(phase) * 0.72 - 0.22;
    leg.knee.rotation.x = 0.42 - Math.sin(phase) * 0.82;
    leg.shoe.rotation.x = -leg.knee.rotation.x * 0.4;
  });
}
