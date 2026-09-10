import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { calculateTargetSpeed } from './src/physics.js';
import { createRider, updateRider } from './src/rider.js';
import { getRoutePose, routeHeight, VISUAL_DISTANCE_SCALE } from './src/route.js';
import { bindControls, createRideState, createUI, renderRideMetrics } from './src/ui.js';
import { buildWorld } from './src/world.js';

const ui = createUI();
const state = createRideState();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#91c9dd');
scene.fog = new THREE.Fog('#91c9dd', 90, 370);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('scene').append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = true;
controls.zoomSpeed = 1.15;
controls.minDistance = 7;
controls.maxDistance = 23;
controls.maxPolarAngle = 1.48;
controls.addEventListener('start', () => { controls.userMoved = true; });
renderer.domElement.addEventListener('wheel', () => { controls.userMoved = true; }, { passive: true });

scene.add(new THREE.HemisphereLight('#d9f2ff', '#566634', 2.2));
const sun = new THREE.DirectionalLight('#fff2d4', 2.8);
sun.position.set(-70, 95, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

buildWorld(scene);
const riderRig = createRider();
scene.add(riderRig.rider);

const startingPose = getRoutePose(0);
controls.target.copy(startingPose.position)
  .add(startingPose.tangent.clone().multiplyScalar(7))
  .add(new THREE.Vector3(0, 1.2, 0));
camera.position.copy(startingPose.position)
  .add(startingPose.tangent.clone().multiplyScalar(-20))
  .add(new THREE.Vector3(0, 18, 0));
camera.lookAt(controls.target);

function recordSample() {
  state.samples.push({
    time: state.elapsed,
    watts: Math.round(state.watts),
    speed: state.speed,
    dist: state.distance,
  });
}

function updateCamera(pose) {
  const target = pose.position.clone()
    .add(pose.tangent.clone().multiplyScalar(7))
    .add(new THREE.Vector3(0, 1.2, 0));
  controls.target.lerp(target, 0.07);

  if (!controls.userMoved) {
    const desired = pose.position.clone()
      .add(pose.tangent.clone().multiplyScalar(-17))
      .add(new THREE.Vector3(0, 12, 0));
    camera.position.lerp(desired, 0.025);
  }
  controls.update();
}

let lastFrame = performance.now();
let lastElevation = routeHeight(0);

function animate(now) {
  requestAnimationFrame(animate);
  const deltaTime = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  let pose = getRoutePose(state.distance);

  if (!state.paused) {
    const result = calculateTargetSpeed(state.watts, pose.grade);
    state.model = result.model;
    state.speed += THREE.MathUtils.clamp((result.speed - state.speed) * 1.8, -4, 5) * deltaTime;
    state.distance += state.speed * deltaTime;
    state.elapsed += deltaTime;

    const elevation = routeHeight(state.distance * VISUAL_DISTANCE_SCALE);
    state.elevationGain += Math.max(0, elevation - lastElevation);
    lastElevation = elevation;
    if (now - state.lastSample > 1000) {
      recordSample();
      state.lastSample = now;
    }
  }

  pose = getRoutePose(state.distance);
  updateRider(riderRig, pose, state.speed, state.watts, state.elapsed, deltaTime);
  updateCamera(pose);
  renderRideMetrics(ui, state, pose.grade);
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

bindControls(state, ui);
animate(performance.now());
