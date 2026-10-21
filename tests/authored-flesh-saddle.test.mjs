import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three.module.js';
import {intersectsSaddleSlab as intersects,saddleSlabCollisions as collisions} from './helpers/saddle-slab-clearance.mjs';
import {fleshSculptFixture} from './helpers/carrier-sculpt-fixture.mjs';
import {cpuImageBitmap} from './beast-integration-cpu.mjs';

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
  globalThis.createImageBitmap = cpuImageBitmap;
  return () => {for (const [key, value] of originals) {if (value === undefined) delete globalThis[key]; else globalThis[key] = value;}};
}

test('slab intersection detects edge crossings without vertex containment',()=>{
  const deck={x:0,z:0,absoluteY:0,co:1,si:0};
  assert.ok(intersects([[-3,0,0],[3,0,0],[0,0,3]],deck,[1,1],-.1,.1));
  assert.equal(intersects([[-3,.2,0],[3,.2,0],[0,.2,3]],deck,[1,1],-.1,.1),false);
});

test('authored visible skin clears all 20 occupied saddle slabs through stand, walk, turn and stop',async t=>{
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
    const used=new Set([...sourceIndices,...visibleIndices]),point=new T.Vector3(),failures=[];let x=0,z=0,samples=0;
    for(let frame=0;frame<=360;frame++) {
      const time=frame/60,moving=frame>12&&frame<300,heading=frame<120?0:.35*Math.sin((frame-120)/60);
      if(moving){x+=Math.sin(heading)*.12;z+=Math.cos(heading)*.12;}
      placeCity(city,x,z,heading);animateCity(city,time,moving,0);city.root.updateMatrixWorld(true);
      if(frame%12!==0)continue;
      const inverse=city.rig.matrixWorld.clone().invert(),vertices=Array(mesh.geometry.attributes.position.count);
      for(const id of used){mesh.getVertexPosition(id,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);vertices[id]=point.toArray();}
      const source=collisions(vertices,sourceIndices),authored=collisions(vertices,visibleIndices,.12);
      const nonzero=counts=>counts.flatMap((triangles,tier)=>triangles?[{tier,triangles}]:[]);
      if(source.some(Boolean)||authored.some(Boolean))failures.push({frame,inherited:nonzero(source),authored:nonzero(authored)});
      samples++;
    }
    assert.equal(samples,31);
    if(failures.length)t.diagnostic(JSON.stringify({marginRigUnits:.12,marginWorldUnits:.066,failures}));
    assert.deepEqual(failures,[],'All actual source and authored skin triangles must clear the occupied slabs in every sampled pose');
  } finally {if(city)dispose(city.meshyCarrier.instance);restore();}
});
