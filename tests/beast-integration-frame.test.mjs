import test from 'node:test';

import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {surface,meshes,contacts,cannonSweep,cannonSweepGap} from './helpers/frame-clearance.mjs';

test('occupied frame clears full district roofs and articulated resident corners at all upgrade levels',async t=>{
const restore=installCPUCarrierEnvironment(),startedAt=new Date().toISOString();
const report={startedAt,scope:'Actual full triangulated new frame against complete rendered district geometry and real instanced resident parts. Static CPU fixtures use unmodified saddle renderers/layout and scene placement. No browser or performance claim.',intentionalJoins:'Frame endpoints meet their own occupied deck undersides; deck/frame intersections are not roof/resident defects.',stages:[],districts:[],citizens:[],failures:[]};
try{
 const {createSaddleLayout,SADDLE_SLOT_ORDER,SADDLE_DECK_Y}=await import('../src/saddle-layout.js'),{createSaddleFoundation,createSaddleDistrict}=await import('../src/saddle-city.js'),{createCitizens,animateCitizens}=await import('../src/citizens.js'),{createBattery}=await import('../src/armaments.js'),{BUILDINGS}=await import('../src/simulation.js');
 const root=new T.Group(),build=n=>{const b=Array(20).fill(null);for(const slot of SADDLE_SLOT_ORDER.slice(0,n))b[slot]={type:'housing',level:1,remaining:0};return b;};
 let full,frame,layout;
 for(const n of[0,1,4,8,12,16,20]){const b=build(n),l=createSaddleLayout(b,[]),f=createSaddleFoundation(SADDLE_DECK_Y,false,l);root.add(f);root.updateMatrixWorld(true);const g=f.getObjectByName('Occupied pannier load frame'),links=g?.userData.pannierLinks??[];
  for(const link of links)assert.ok(link.slots.every(id=>b[id]),'No frame joins an unoccupied mount');
  const result={occupied:n,links:links.length,tiers:links.filter(v=>v.kind==='tier-rib').length,joists:links.filter(v=>v.kind==='underdeck-joist').length,triangles:g?surface(meshes(g)).indices.length/3:0};report.stages.push(result);if(n===20){full=f;frame=g;layout=l;}else root.remove(f);
 }
 assert.ok(frame);const frameSurface=surface(meshes(frame));report.frameLinks=frame.userData.pannierLinks;
 // Structural additions must remain within the existing saddle footprint.
 assert.equal(layout.footprint.width,24.8,'Approved wider fit for the native quadruped');
 for(const point of frameSurface.vertices)assert.ok(Math.abs(point.x)<=12.4+1e-6,'Frame expands the approved deck footprint');
 // All districts, including all upgraded roofs and working annexes, at every
 // occupied mount. Actual triangle intersections use full inclined members.
 for(const type of Object.keys(BUILDINGS))for(const level of[1,2,3])for(const facing of(type==='cannon'?[0,Math.PI/2,Math.PI,3*Math.PI/2]:[null])){
  const districtRoot=new T.Group();districtRoot.position.y=SADDLE_DECK_Y;root.add(districtRoot);const list=[];
  for(const floor of layout.floors){const p=layout.positions[floor.slot],g=type==='cannon'?createBattery('kaiju',level,facing,floor.slot):createSaddleDistrict(type,level,{zone:p.zone});if(type!=='cannon')g.rotation.y=p.rotation;g.position.set(p.x,p.y+layout.districtOffset,p.z);districtRoot.add(g);list.push(...meshes(g,{slot:floor.slot,tier:floor.tier,type,level,facing}));}
  root.updateMatrixWorld(true);const actual=contacts(frameSurface,surface(list)),entry={type,level,facing,...actual};report.districts.push(entry);if(actual.count)report.failures.push({kind:'frame/district',type,level,facing,count:actual.count});root.remove(districtRoot);
 }
 let sweepMinimum=Infinity;
 for(const level of[1,2,3]){
  const battery=createBattery('kaiju',level,0,0);battery.position.y=layout.districtOffset;battery.updateMatrixWorld(true);const profile=cannonSweep(surface(meshes(battery)));
  for(const floor of layout.floors){const gap=cannonSweepGap(frameSurface,profile,layout.positions[floor.slot]);sweepMinimum=Math.min(sweepMinimum,gap.minimum);assert.ok(gap.minimum>1e-7,JSON.stringify({kind:'continuous cannon sweep',level,slot:floor.slot,...gap}));}
 }
 report.continuousCannonSweep={levels:3,mounts:20,minimumConservativeRadialGap:sweepMinimum};
 // The fixture sets only disposable traffic distances to sample exact path
 // corners and their approach/departure. All articulated body, gait, clothing
 // and per-instance morph transforms still come from animateCitizens.
 const citizens=createCitizens(root,SADDLE_DECK_Y,'kaiju',{scale:.55,layout:'saddle',rings:2,slotPositions:layout.positions});
 const options={layout:'saddle',rings:2,slotPositions:layout.positions,verticalLayout:layout};
 animateCitizens(citizens,0,true,48,options);
 for(const time of[0,.13,.29])for(let corner=0;corner<4;corner++)for(const offset of[-.08,0,.08]){
  citizens.towerCirculation.time=time;
  for(const lane of citizens.towerCirculation.lanes){const start=lane.segments[corner].start+offset;lane.positions=lane.ids.map((_,i)=>start+i*lane.length/lane.ids.length);lane.walking=lane.ids.map(()=>true);}
  animateCitizens(citizens,time,true,48,options);root.updateMatrixWorld(true);const parts=[],temporary=[];
  for(const [name,bucket]of Object.entries(citizens.buckets))for(let i=0;i<bucket.mesh.count;i++){
   const instance=new T.Matrix4();bucket.mesh.getMatrixAt(i,instance);const matrix=new T.Matrix4().multiplyMatrices(bucket.mesh.matrixWorld,instance),object=new T.Mesh(bucket.mesh.geometry,bucket.mesh.material);if(bucket.mesh.morphTexture)bucket.mesh.getMorphAt(i,object);
   object.geometry.computeBoundingBox();const bound=object.geometry.boundingBox.clone().applyMatrix4(matrix),frameBounds=new T.Box3().setFromPoints(frameSurface.vertices);if(!bound.intersectsBox(frameBounds))continue;
   parts.push({object,matrix,name:'resident/'+name,meta:{bucket:name,instance:i}});temporary.push(object);
  }
  const actual=contacts(frameSurface,surface(parts)),entry={time,corner,offset,residents:48,renderedParts:parts.length,...actual};report.citizens.push(entry);if(actual.count)report.failures.push({kind:'frame/resident',time,corner,offset,count:actual.count});
 }
 report.finishedAt=new Date().toISOString();report.passed=report.failures.length===0;

 t.diagnostic(JSON.stringify({stages:report.stages,districtCases:report.districts.length,residentCases:report.citizens.length,residents:48,cannonSweep:report.continuousCannonSweep,failures:report.failures},null,2));assert.equal(report.failures.length,0,'Actual new frame must clear districts and resident corner bodies');
}finally{restore();}

});
