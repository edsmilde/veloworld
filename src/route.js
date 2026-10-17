import * as THREE from 'three';

const ROUTE_SAMPLES = 840;

function measuredRoute(points, curve, world) {
  curve.arcLengthDivisions = 4096;
  curve.updateArcLengths();
  const lengthMeters = curve.getLength();
  if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) throw new Error('Route must have a positive length.');
  const progressAt = distance => ((distance % lengthMeters) + lengthMeters) % lengthMeters / lengthMeters;
  return {
    points, curve, lengthMeters,
    elevationMetersPerSceneUnit: world.elevationMetersPerSceneUnit || 1,
    heightAt: distance => curve.getPointAt(progressAt(distance)).y,
    getPose(distance) {
      const progress = progressAt(distance);
      const position = curve.getPointAt(progress);
      const tangent = curve.getTangentAt(progress).normalize();
      const grade = tangent.y / Math.hypot(tangent.x, tangent.z) * 100;
      return { position, tangent, grade };
    },
  };
}

export function createRoute(world) {
  if (world.routePoints) return createCustomRoute(world);

  function pointAt(distance) {
    const progress = distance / ROUTE_SAMPLES;
    const { x, z } = world.route(progress);
    return new THREE.Vector3(x, world.terrain(x, z) + 0.04, z);
  }

  const points = [];
  for (let distance = 0; distance <= ROUTE_SAMPLES; distance += 1) {
    points.push(pointAt(distance));
  }

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');

  return measuredRoute(points, curve, world);
}

function createCustomRoute(world) {
  const controls = createRoundedControls(world.routePoints);
  const segmentLengths = controls.map((start, index) => start.distanceTo(controls[(index + 1) % controls.length]));
  const routeLength = segmentLengths.reduce((total, length) => total + length, 0);
  const pointAtDistance = (distance) => {
    let remaining = distance % routeLength;
    for (let index = 0; index < controls.length; index += 1) {
      const length = segmentLengths[index];
      if (remaining <= length) return controls[index].clone().lerp(controls[(index + 1) % controls.length], remaining / length);
      remaining -= length;
    }
    return controls[0].clone();
  };
  const points = [];
  for (let index = 0; index < 840; index += 1) {
    const point = pointAtDistance(routeLength * index / 840);
    point.y = world.terrain(point.x, point.z) + 0.04;
    points.push(point);
  }
  points.push(points[0].clone());
  const curve = new THREE.CurvePath();
  for (let index = 0; index < points.length - 1; index += 1) curve.add(new THREE.LineCurve3(points[index], points[index + 1]));

  return measuredRoute(points, curve, world);
}

function createRoundedControls(routePoints) {
  const corners = routePoints.map((point) => new THREE.Vector3(point.x, 0, point.z));
  const radius = 11;
  const cornerData = corners.map((corner, index) => {
    const previous = corners[(index - 1 + corners.length) % corners.length];
    const next = corners[(index + 1) % corners.length];
    const incomingLength = corner.distanceTo(previous);
    const outgoingLength = corner.distanceTo(next);
    const offset = Math.min(radius, incomingLength * 0.28, outgoingLength * 0.28);
    return {
      center: corner,
      entry: corner.clone().lerp(previous, offset / incomingLength),
      exit: corner.clone().lerp(next, offset / outgoingLength),
    };
  });

  const rounded = [cornerData[0].exit.clone()];
  for (let index = 1; index <= cornerData.length; index += 1) {
    const corner = cornerData[index % cornerData.length];
    rounded.push(corner.entry.clone());
    for (let step = 1; step <= 4; step += 1) {
      const progress = step / 4;
      const fromEntry = corner.entry.clone().lerp(corner.center, progress);
      const fromCenter = corner.center.clone().lerp(corner.exit, progress);
      rounded.push(fromEntry.lerp(fromCenter, progress));
    }
  }
  rounded.pop();
  return rounded;
}
