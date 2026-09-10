import * as THREE from 'three';

export const ROUTE_LENGTH_METERS = 8400;
export const VISUAL_DISTANCE_SCALE = 8;

export function terrainHeight(x, z) {
  return 2.5 * Math.sin(x / 170)
    + 4 * Math.cos(z / 220)
    + 3 * Math.sin((x + z) / 190)
    + 1.5 * Math.cos((x - z) / 130);
}

function pointAt(distance) {
  const progress = distance / ROUTE_LENGTH_METERS;
  const angle = progress * Math.PI * 2;
  const x = 220 * Math.cos(angle) + 35 * Math.cos(angle * 2);
  const z = 150 * Math.sin(angle) - 22 * Math.sin(angle * 2);
  return new THREE.Vector3(x, terrainHeight(x, z) + 0.12, z);
}

export const routePoints = [];
for (let distance = 0; distance <= ROUTE_LENGTH_METERS; distance += 10) {
  routePoints.push(pointAt(distance));
}

export const routeCurve = new THREE.CatmullRomCurve3(routePoints, false, 'centripetal');

export function routeHeight(distance) {
  return pointAt(distance).y;
}

export function getRoutePose(rideDistance) {
  const progress = ((rideDistance * VISUAL_DISTANCE_SCALE) % ROUTE_LENGTH_METERS) / ROUTE_LENGTH_METERS;
  const position = routeCurve.getPointAt(progress);
  const tangent = routeCurve.getTangentAt(progress).normalize();
  const rawGrade = tangent.y / Math.hypot(tangent.x, tangent.z) * 100;

  return {
    position,
    tangent,
    grade: THREE.MathUtils.clamp(rawGrade, -10, 10),
  };
}
