// Numerical regression for shared terrain sampling, including warm repeated
// queries and both interpolation triangles. Uses direct uncached vertex heights.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {terrainHeight,terrainGridCoordinate,TERRAIN_SEGMENTS,renderedTerrainHeight} from '../src/terrain.js';

const grid=Array.from({length:TERRAIN_SEGMENTS+1},(_,i)=>terrainGridCoordinate(i));
function uncached(x,z){
  if(Math.abs(x)>600||Math.abs(z)>600)return terrainHeight(x,z);
  // A linear interval lookup is deliberately independent of the runtime search.
  const ix=Math.max(0,Math.min(TERRAIN_SEGMENTS-1,grid.findLastIndex(value=>value<=x)));
  const iz=Math.max(0,Math.min(TERRAIN_SEGMENTS-1,grid.findLastIndex(value=>value<=z)));
  const ax=grid[ix],bx=grid[ix+1],az=grid[iz],bz=grid[iz+1];
  const u=(x-ax)/(bx-ax),v=(z-az)/(bz-az);
  const a=Math.fround(terrainHeight(ax,az)),b=Math.fround(terrainHeight(bx,az));
  const c=Math.fround(terrainHeight(ax,bz)),d=Math.fround(terrainHeight(bx,bz));
  return u+v<=1?a*(1-u-v)+b*u+c*v:d*(u+v-1)+b*(1-v)+c*(1-u);
}
let seed=71,checks=0;
const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const points=[[-600,-600],[600,600],[-601,37],[41,601],[0,0],[-178,178],[-180,180],[-360,360]];
for(let i=0;i<16000;i++)points.push([random()*1220-610,random()*1220-610]);
for(const [x,z] of points){
  const expected=uncached(x,z);
  assert.equal(renderedTerrainHeight(x,z),expected);
  assert.equal(renderedTerrainHeight(x,z),expected);
  checks+=2;
}
const report={points:points.length,exactChecks:checks,cacheBytes:(TERRAIN_SEGMENTS+1)**2*5,exact:true};
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/graphics-09-builder-04/terrain-cache');
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
