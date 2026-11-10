import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {posedVisibleSurface,closedGirdleTopology,assertSurfaceClearance} from './beast-integration-geometry.mjs';
import {surface,meshes} from './helpers/frame-clearance.mjs';
import {saddleSlabCollisions} from './helpers/saddle-slab-clearance.mjs';

test('saved sloped-terrain flesh pose fits the real torso before its first frame and retains its anchors',async t=>{
 const restore=installCPUCarrierEnvironment(),samples=[];let assets,city;
 try{
  assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers();
  const sim=await import('../src/simulation.js'),{makeCity,animateCity,setCityRings}=await import('../src/carriers.js'),{placeCity}=await import('../src/scene.js');
  // Exact native-control movement/build/reload observation from independent
  // Nov10 round1: six-carrier-smoke/report.json. The same pose also failed at
  // time0, so neither restarting nor clamping the saved clock is a repair.
  const savedLocation={x:-33.13126537296777,z:43.09271052218807,angle:-.7915926535897931};
  for(const input of[
   {label:'exact-save',...savedLocation,time:8.530299999999984,moving:false},
   {label:'same-location-zero-clock',...savedLocation,time:0,moving:false},
   {label:'saved-location-moving',...savedLocation,time:8.530299999999984,moving:true},
   {label:'opposite-heading',...savedLocation,angle:savedLocation.angle+Math.PI,time:120,moving:false},
   {label:'new-game-late-clock',x:-30,z:40,angle:0,time:120,moving:false},
  ]){
   const state=sim.createGame('kaiju','flesh');Object.assign(state,input);delete state.label;
   state.buildings[0]={type:'sawmill',level:1,remaining:0};state.towerOrder.push(0);
   const serialized=sim.serialize(state),loaded=sim.deserialize(serialized);assert.ok(loaded);assert.equal(sim.serialize(loaded),serialized);
   city=makeCity(loaded.faction,false,loaded.rings,loaded.variant);setCityRings(city,loaded.rings,loaded.buildings,loaded.towerOrder);
   placeCity(city,loaded.x,loaded.z,loaded.angle);animateCity(city,loaded.time,input.moving,loaded.population);
   assert.equal(city.variant,loaded.variant);assert.equal(city.meshyCarrier.kind,'flesh');assert.equal(city.meshyCarrier.saddleFitted,true);
   const harness=city.meshyCarrier.saddle.harness,anchorSets=harness.bands.map(b=>b.anchors),origins=harness.bands.map(b=>b.origin.clone());
   const check=label=>{
    city.root.updateMatrixWorld(true);const skin=posedVisibleSurface(city.meshyCarrier.renderMeshes[0],city.rig);let comparisons=0;
    for(const [index,band]of harness.bands.entries()){
     assert.equal(band.anchors,anchorSets[index],'Later updates must retain their original indexed skin anchors');assert.deepEqual(band.origin,origins[index]);
     assert.equal(band.fitMetadata.originBone,'Hips');assert.ok(Math.abs(band.origin.clone().sub(band.referenceOrigin).dot(band.w))<1e-12,'Selection movement must stay inside the original transverse plane');
     assert.deepEqual(band.fitMetadata.contours.map(c=>c.width),[-.24,0,.24]);
     for(const contour of band.fitMetadata.contours){assert.equal(contour.loops.filter(l=>l.containsOrigin).length,1);assert.equal(contour.invalidComponents.length,0);}
     assert.equal(closedGirdleTopology(band.mesh.geometry).faces,1536);
     const parts=[band.mesh];for(const buckle of band.buckles)buckle.object.traverse(part=>{if(part.isMesh)parts.push(part);});
     for(const part of parts)comparisons+=assertSurfaceClearance(part,city.rig,skin,label+'/'+part.name,.04).comparisons;
    }
    const actual=surface(meshes(harness.group),(city.cargo??city.rig).matrixWorld),slabs=saddleSlabCollisions(actual.vertices.map(p=>p.toArray()),actual.indices,.04);
    assert.deepEqual(slabs,Array(20).fill(0),'Actual cargo-frame harness must clear all20 walking slabs');
    samples.push({label,origin:harness.bands.map(b=>b.origin.toArray()),bodyCrouch:city.meshyCarrier.controller.status().bodyCrouch,comparisons});
   };
   check(input.label+'/first');
   for(let frame=1;frame<=12;frame++){const step=input.moving?frame*.1:0;placeCity(city,loaded.x+Math.sin(loaded.angle)*step,loaded.z+Math.cos(loaded.angle)*step,loaded.angle);animateCity(city,loaded.time+frame/60,input.moving,loaded.population);}
   check(input.label+'/continued');assert.equal(sim.serialize(loaded),serialized);
   city.meshyCarrier.controller.dispose();assets.disposeMeshyCarrier(city.meshyCarrier.instance);city=null;
  }
  t.diagnostic(JSON.stringify({skinMarginRig:.04,slabMarginRig:.04,samples}));
 }finally{if(city?.meshyCarrier){city.meshyCarrier.controller.dispose();assets.disposeMeshyCarrier(city.meshyCarrier.instance);}restore();}
});
