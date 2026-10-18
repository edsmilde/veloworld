import assert from 'node:assert/strict';
import { gradeTerrainAlongRoad } from '../src/road-terrain.js';
for (const slope of [0,.2,-.4]) {
  const world={terrain:(x,z)=>slope*z+x*.2,ground:'#6f9259'};
  const points=Array.from({length:101},(_,i)=>({x:0,z:i-50,y:slope*(i-50)+.04}));
  const graded=gradeTerrainAlongRoad(world,points);
  const target=slope*10+.04+.35-.08;
  for (const x of [-3.1,0,3.1]) assert.ok(graded.terrain(x,10)<=target+1e-9);
  assert.equal(graded.terrain(30,10),world.terrain(30,10));
  assert.equal(world.terrain(0,10),slope*10);
  for (let x=3.1;x<14;x+=.1) assert.ok(Number.isFinite(graded.terrain(x,10)));
  assert.ok(Math.abs(graded.terrain(15.3,10)-world.terrain(15.3,10))<1e-9);
}
const empty={terrain:()=>5};
// Sample the actual grid-triangle interpolation at abrupt hill crests/valleys.
for (const sign of [-1,1]) {
  const height=z=>sign*Math.abs(z-.3)*.7;
  const points=Array.from({length:201},(_,i)=>({x:0,z:i*.5-50,y:height(i*.5-50)+.04}));
  const graded=gradeTerrainAlongRoad({terrain:(x,z)=>height(z)+x*.5},points);
  for (let z=-5;z<5;z+=.1) for (let x=-3;x<=3;x+=.5) {
    const step=1.5, x0=Math.floor(x/step)*step, z0=Math.floor(z/step)*step;
    const tx=(x-x0)/step, tz=(z-z0)/step;
    const a=graded.terrain(x0,z0),b=graded.terrain(x0+step,z0),c=graded.terrain(x0,z0+step),d=graded.terrain(x0+step,z0+step);
    const ground=tx+tz<=1?a+tx*(b-a)+tz*(c-a):b*(1-tz)+c*(1-tx)+d*(tx+tz-1);
    const index=Math.min(points.length-2,Math.floor((z+50)/.5));
    const start=points[index],end=points[index+1];
    const road=start.y+(end.y-start.y)*(z-start.z)/.5+.35;
    assert.ok(ground<road-.03,`Terrain crosses road at ${x},${z}`);
  }
}
assert.equal(gradeTerrainAlongRoad(empty,[]).terrain(0,0),5);
console.log('Passed flat/uphill/downhill edge matching, outer blending, unchanged source terrain and empty routes.');
