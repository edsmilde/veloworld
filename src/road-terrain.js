// Spatial bins keep terrain grading local rather than scanning the entire loop
// for every terrain vertex. Heights are derived from the actual road ribbon.
export function gradeTerrainAlongRoad(world, points, halfWidth = 3.1, offset = .35) {
  // A terrain triangle spans up to 2.13 m on the 1.5 m grid. Keep all
  // vertices supporting the road footprint below the asphalt, including at
  // sharp grade changes. The separate shoulders hide this shallow excavation.
  const meshMargin = 2.2;
  const corridor = halfWidth + meshMargin;
  const radius = corridor + 10;
  const binSize = 20;
  const bins = new Map();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    for (let x = Math.floor((Math.min(a.x,b.x)-radius)/binSize); x <= Math.floor((Math.max(a.x,b.x)+radius)/binSize); x++) {
      for (let z = Math.floor((Math.min(a.z,b.z)-radius)/binSize); z <= Math.floor((Math.max(a.z,b.z)+radius)/binSize); z++) {
        const key = `${x},${z}`;
        if (!bins.has(key)) bins.set(key, []);
        bins.get(key).push({a,b});
      }
    }
  }
  return { ...world, terrain(x,z) {
    const natural = world.terrain(x,z);
    let nearest = radius, roadHeight = natural;
    let conservativeHeight = Infinity;
    for (const {a,b} of bins.get(`${Math.floor(x/binSize)},${Math.floor(z/binSize)}`) || []) {
      const dx=b.x-a.x, dz=b.z-a.z, lengthSq=dx*dx+dz*dz;
      if (!lengthSq) continue;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/lengthSq));
      const distance=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
      if (distance <= corridor) {
        const dt = meshMargin / Math.sqrt(lengthSq);
        const lowT = Math.max(0,t-dt), highT = Math.min(1,t+dt);
        conservativeHeight = Math.min(conservativeHeight,
          a.y+(b.y-a.y)*lowT+offset-.08,
          a.y+(b.y-a.y)*highT+offset-.08);
      }
      if (distance < nearest) { nearest=distance; roadHeight=a.y+(b.y-a.y)*t+offset-.035; }
    }
    if (Number.isFinite(conservativeHeight)) roadHeight = Math.min(roadHeight, conservativeHeight);
    const t=Math.max(0,Math.min(1,(nearest-corridor)/10));
    const blend=t*t*(3-2*t);
    return roadHeight*(1-blend)+natural*blend;
  } };
}
