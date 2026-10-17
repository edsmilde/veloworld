// Includes intermediate tiles crossed by long route segments and the closing leg.
export function isRouteTile(cell, route) {
  return route.some((start, i) => {
    const end = route[(i + 1) % route.length];
    let low = 0; let high = 1;
    for (const axis of ['column', 'row']) {
      const delta = end[axis] - start[axis];
      const min = cell[axis] - .5; const max = cell[axis] + .5;
      if (!delta) { if (start[axis] < min || start[axis] > max) return false; }
      else {
        const a = (min - start[axis]) / delta; const b = (max - start[axis]) / delta;
        low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b));
      }
    }
    return low <= high;
  });
}

export function nearestRoad(points, x, z) {
  let best = null;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]; const b = points[i + 1];
    const dx = b.x - a.x; const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (!length) continue;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (length * length)));
    const px = a.x + dx * t; const pz = a.z + dz * t;
    const distance = Math.hypot(x - px, z - pz);
    if (!best || distance < best.distance) best = { x: px, z: pz, dx: dx / length, dz: dz / length, distance };
  }
  return best;
}

export function roadsideBuildings(points, tile, occupied = []) {
  const candidates = points.filter((p) => Math.abs(p.x - tile.x) < 25 && Math.abs(p.z - tile.z) < 25);
  if (!candidates.length) return [];
  const result = [];
  for (const fraction of [.2, .5, .8]) {
    const sample = candidates[Math.floor((candidates.length - 1) * fraction)];
    const road = nearestRoad(points, sample.x, sample.z);
    for (const side of [-1, 1]) {
      const x = road.x - road.dz * side * 14;
      const z = road.z + road.dx * side * 14;
      // Avoid buildings intruding into another leg on a bend, or neighboring rows.
      if (nearestRoad(points, x, z).distance < 11) continue;
      if ([...occupied, ...result].some(p => Math.hypot(p.x - x, p.z - z) < 14)) continue;
      result.push({ x, z, yaw: Math.atan2(road.x - x, road.z - z) });
    }
  }
  return result;
}
