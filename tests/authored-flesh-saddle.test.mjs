import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three.module.js';
import {SADDLE_MOUNTS} from '../src/saddle-layout.js';
import {fleshSculptFixture} from './helpers/carrier-sculpt-fixture.mjs';

function cpuBrowser() {
  const keys = ['document', 'self', 'fetch', 'createImageBitmap'];
  const originals = new Map(keys.map(key => [key, globalThis[key]]));
  const context = new Proxy({createLinearGradient: () => ({addColorStop() {}}), createRadialGradient: () => ({addColorStop() {}}),
    createImageData: (width, height) => ({data: new Uint8ClampedArray(width * height * 4), width, height}), measureText: text => ({width: String(text).length * 8})},
  {get: (target, key) => key in target ? target[key] : () => {}});
  globalThis.document = {createElement: () => ({width: 512, height: 512, getContext: () => context}), createElementNS: () => ({addEventListener() {}, removeEventListener() {}, setAttribute() {}})};
  globalThis.self = globalThis;
  globalThis.fetch = async (value, options) => {
    const url = new URL(value);
    if (url.protocol === 'file:') return new Response(fs.readFileSync(fileURLToPath(url)), {headers: {'content-type': 'model/gltf-binary'}});
    if (url.protocol === 'blob:') return originals.get('fetch')(value, options);
    throw new Error('CPU fixture blocks nonlocal fetch: ' + url.protocol);
  };
  globalThis.createImageBitmap = async blob => {
    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), close() {}};
  };
  return () => {for (const [key, value] of originals) {if (value === undefined) delete globalThis[key]; else globalThis[key] = value;}};
}

function clip(poly, axis, value, sign) {
  const output=[];
  for(let j=0;j<poly.length;j++) {
    const a=poly[j],b=poly[(j+1)%poly.length],da=sign*(a[axis]-value),db=sign*(b[axis]-value);
    if(da<=0)output.push(a);
    if((da<0)!==(db<0)){const t=da/(da-db);output.push(a.map((v,k)=>v+(b[k]-v)*t));}
  }
  return output;
}
function intersects(triangle, deck, half, low, high) {
  let poly=triangle.map(p=>[deck.co*(p[0]-deck.x)-deck.si*(p[2]-deck.z),p[1]-deck.absoluteY,deck.si*(p[0]-deck.x)+deck.co*(p[2]-deck.z)]);
  for(const [axis,value,sign] of [[0,half[0],1],[0,-half[0],-1],[1,high,1],[1,low,-1],[2,half[1],1],[2,-half[1],-1]]) {
    poly=clip(poly,axis,value,sign);if(!poly.length)return false;
  }
  if(poly.length<3)return false;
  const a=new T.Vector3(...poly[0]),b=new T.Vector3(),c=new T.Vector3();let area=0;
  for(let i=1;i<poly.length-1;i++)area+=b.set(...poly[i]).sub(a).cross(c.set(...poly[i+1]).sub(a)).length();
  return area>1e-8;
}
function collisions(vertices, indices, margin=0) {
  // Exact two walking-slab boxes from createSaddleFoundation: iron 3.46 x .14
  // x 3.8 at y-.05, and paving 3.42 x .10 x 3.76 at y+.04. The mount transforms
  // come from the production layout. An expanded slab proves a clearance margin.
  const decks=SADDLE_MOUNTS.map((d,tier)=>({...d,tier,co:Math.cos(d.rotation),si:Math.sin(d.rotation)})),counts=Array(20).fill(0);
  for(let i=0;i<indices.length;i+=3) {
    const p=[vertices[indices[i]],vertices[indices[i+1]],vertices[indices[i+2]]],min=[0,1,2].map(k=>Math.min(p[0][k],p[1][k],p[2][k])),max=[0,1,2].map(k=>Math.max(p[0][k],p[1][k],p[2][k]));
    for(const d of decks) {
      const hx=Math.abs(d.co)*(1.73+margin)+Math.abs(d.si)*(1.9+margin),hz=Math.abs(d.si)*(1.73+margin)+Math.abs(d.co)*(1.9+margin);
      // Broad-phase bounds reject only; an exact triangle/polyhedron clip is
      // required for every reported crossing, including edges with no vertex inside.
      if(min[0]>d.x+hx||max[0]<d.x-hx||min[2]>d.z+hz||max[2]<d.z-hz||min[1]>d.absoluteY+.09+margin||max[1]<d.absoluteY-.12-margin)continue;
      if(intersects(p,d,[1.73+margin,1.9+margin],-.12-margin,.02+margin)||intersects(p,d,[1.71+margin,1.88+margin],-.01-margin,.09+margin))counts[d.tier]++;
    }
  }
  return counts;
}

test('slab intersection detects edge crossings without vertex containment',()=>{
  const deck={x:0,z:0,absoluteY:0,co:1,si:0};
  assert.ok(intersects([[-3,0,0],[3,0,0],[0,0,3]],deck,[1,1],-.1,.1));
  assert.equal(intersects([[-3,.2,0],[3,.2,0],[0,.2,3]],deck,[1,1],-.1,.1),false);
});

test('authored visible skin clears all 20 occupied saddle slabs through stand, walk, turn and stop',async()=>{
  const restore=cpuBrowser();let city,dispose;
  try {
    const carriers=await import('../src/meshy-carriers.js');await carriers.loadMeshyCarriers(['flesh']);dispose=carriers.disposeMeshyCarrier;
    const {makeCity,animateCity,setCityRings}=await import('../src/carriers.js'),{placeCity}=await import('../src/scene.js'),{createGame}=await import('../src/simulation.js');
    const baseline=await fleshSculptFixture(),state=createGame('kaiju','flesh'),type=state.buildings.find(Boolean).type;
    city=makeCity('kaiju',false,2,'flesh');setCityRings(city,2,Array.from({length:20},()=>({type,level:1,remaining:0})),[]);
    assert.equal(city.saddleLayout.floors.length,20);
    const mesh=city.meshyCarrier.renderMeshes[0],sourceIndices=baseline.mesh.geometry.index.array,visibleIndices=mesh.geometry.index.array;
    // Source indices address the retained original pool; every source position
    // and influence is asserted equal before comparing the identical real pose.
    for(const name of ['position','skinIndex','skinWeight'])assert.deepEqual(mesh.geometry.attributes[name].array.subarray(0,baseline.mesh.geometry.attributes[name].array.length),baseline.mesh.geometry.attributes[name].array,name);
    const used=new Set([...sourceIndices,...visibleIndices]),point=new T.Vector3();let x=0,z=0,samples=0;
    for(let frame=0;frame<=360;frame++) {
      const time=frame/60,moving=frame>12&&frame<300,heading=frame<120?0:.35*Math.sin((frame-120)/60);
      if(moving){x+=Math.sin(heading)*.12;z+=Math.cos(heading)*.12;}
      placeCity(city,x,z,heading);animateCity(city,time,moving,0);city.root.updateMatrixWorld(true);
      if(frame%12!==0)continue;
      const inverse=city.rig.matrixWorld.clone().invert(),vertices=Array(mesh.geometry.attributes.position.count);
      for(const id of used){mesh.getVertexPosition(id,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);vertices[id]=point.toArray();}
      assert.deepEqual(collisions(vertices,sourceIndices),Array(20).fill(0),'Inherited source slab crossing at frame '+frame);
      assert.deepEqual(collisions(vertices,visibleIndices,.12),Array(20).fill(0),'Authored skin violates .12 rig-unit / .066 world-unit deck clearance at frame '+frame);
      samples++;
    }
    assert.equal(samples,31);
  } finally {if(city)dispose(city.meshyCarrier.instance);restore();}
});
