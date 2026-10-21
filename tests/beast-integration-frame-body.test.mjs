import test from 'node:test';
import assert from 'node:assert/strict';import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment}from'./beast-integration-cpu.mjs';
import {posedVisibleSurface}from'./beast-integration-geometry.mjs';
import {surface,meshes,contacts,componentSeeds}from'./helpers/frame-clearance.mjs';

test('occupied frame clears the visible posed beast through gait and all six strikes; bolsters retain original envelope',async t=>{
const restore=installCPUCarrierEnvironment(),startedAt=new Date().toISOString(),report={startedAt,scope:'Actual indexed visible body versus complete new rib/joist faces; intentional pad/skin contact compared by exact containment inside the previous solid box. CPU only.',skinMarginRig:.04,skinMarginWorld:.022,samples:[],bolsters:[],failures:[]};
const assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers();const{makeCity,animateCity,setCityRings}=await import('../src/carriers.js'),{placeCity,GameScene}=await import('../src/scene.js'),sim=await import('../src/simulation.js');
function populate(city){const state=sim.createGame('kaiju','flesh');state.rings=2;const added=state.buildings.flatMap((b,i)=>b?[]:[i]);for(const i of added)state.buildings[i]={type:'housing',level:1,remaining:0};state.towerOrder.push(...added);setCityRings(city,2,state.buildings,state.towerOrder);return state;}
function check(city,label){
 city.root.updateMatrixWorld(true);const skin=posedVisibleSurface(city.meshyCarrier.renderMeshes[0],city.rig);skin.faces=skin.bounds.map((_,i)=>({name:'actual visible body',sourceFace:i}));
 const frame=city.foundation.getObjectByName('Occupied pannier load frame'),frameSurface=surface(meshes(frame),city.rig.matrixWorld),result=contacts(frameSurface,skin,.04);report.samples.push({label,...result});if(result.count)report.failures.push({label,count:result.count,actualAmongExamples:result.examples.filter(e=>e.distance<1e-7).length,examples:result.examples});
 // A closed frame component wholly inside the body must not evade face tests.
 const maxX=Math.ceil(Math.max(...skin.bounds.map(b=>b.max[0]))),ray=new T.Ray(),point=new T.Vector3();
 for(const [link,vertex]of componentSeeds(frameSurface).entries()){
  const seed=vertex.clone().add(new T.Vector3(0,1.234e-5,7.891e-6)),near=new Set();
  for(let x=Math.floor(seed.x);x<=maxX;x++)for(const i of skin.grid.get(x+','+Math.floor(seed.y)+','+Math.floor(seed.z))??[])near.add(i);
  ray.set(seed,new T.Vector3(1,0,0));const hits=[];for(const i of near){const q=[0,1,2].map(k=>skin.vertices[skin.indices[i+k]]);if(ray.intersectTriangle(...q,false,point))hits.push(point.x);}hits.sort((a,b)=>a-b);const unique=hits.filter((v,i)=>i===0||Math.abs(v-hits[i-1])>1e-6);if(unique.length%2)report.failures.push({label,kind:'frame seed inside skin',link,seed:seed.toArray()});
 }
}
let city;
try{
 city=makeCity('kaiju',false,2,'flesh');populate(city);let x=0,z=0;
 for(let frame=0;frame<=360;frame++){const time=frame/60,moving=frame>12&&frame<300,heading=frame<120?0:.35*Math.sin((frame-120)/60);if(moving){x+=Math.sin(heading)*.12;z+=Math.cos(heading)*.12;}placeCity(city,x,z,heading);animateCity(city,time,moving,0);if(frame%12===0)check(city,'gait-'+frame);}
 for(const support of city.meshyCarrier.saddle.supports){const p=support.pad.geometry.attributes.position,limits=[1.25,Math.fround(.3),Math.fround(1.55)],bounds=new T.Box3().setFromBufferAttribute(p);let excess=-Infinity;for(let i=0;i<p.count;i++)for(let k=0;k<3;k++)excess=Math.max(excess,Math.abs(p.getComponent(i,k))-limits[k]);assert.ok(excess<=1e-12);assert.deepEqual(bounds.min.toArray(),limits.map(v=>-v));assert.deepEqual(bounds.max.toArray(),limits);report.bolsters.push({side:support.side,z:support.z,vertices:p.count,triangles:support.pad.geometry.index.count/3,oldSolidHalfExtents:limits,maxOutsideOldSolid:excess,explanation:'Every triangle is a convex combination of vertices contained in the old convex solid box; with unchanged pad transform this cannot create volume outside the prior body-contact support.'});}
 city.meshyCarrier.controller.dispose();assets.disposeMeshyCarrier(city.meshyCarrier.instance);city=null;
 for(const[faction,variant]of[['crawler','standard'],['crawler','drill'],['kaiju','flesh'],['kaiju','cyborg'],['airship','horizontal'],['airship','vertical']]){
  city=makeCity('kaiju',false,2,'flesh');const state=populate(city),enemy=makeCity(faction,true,1,variant),reach=sim.meleeReach('kaiju',faction,'flesh',variant);enemy.id='cpu-frame-target';placeCity(city,-60,30,0);placeCity(enemy,-60,30+reach-.5,Math.PI);animateCity(city,0,false,0);animateCity(enemy,0,false,0);state.time=1;state.battle={time:0,enemyId:enemy.id,player:{x:-60,z:30},enemy:{x:-60,z:30+reach-.5}};const saved=sim.serialize(state),context={city,enemyCities:[enemy],state,scene:new T.Scene(),fx:[],cinematic:{mode:'steady',impulse(){}}};GameScene.prototype.createEffect.call(context,{kind:'impact',source:'player',time:0,from:state.battle.player,to:state.battle.enemy,mounts:[]});
  for(let frame=0;frame<=78;frame++){animateCity(city,1+frame/60,false,0);if([0,12,24,29,31,32,42,57,58,59,60,62,63,64,65,77].includes(frame))check(city,variant+'-strike-'+frame);}assert.equal(sim.serialize(state),saved);
  city.meshyCarrier.controller.dispose();assets.disposeMeshyCarrier(city.meshyCarrier.instance);city=null;if(enemy.meshyCarrier){enemy.meshyCarrier.controller?.dispose();assets.disposeMeshyCarrier(enemy.meshyCarrier.instance);}
 }
 report.finishedAt=new Date().toISOString();report.passed=report.failures.length===0;t.diagnostic(JSON.stringify({poses:report.samples.length,bolsters:report.bolsters,failures:report.failures},null,2));assert.equal(report.failures.length,0,'New frame must clear actual animated body');
}finally{if(city?.meshyCarrier){city.meshyCarrier.controller.dispose();assets.disposeMeshyCarrier(city.meshyCarrier.instance);}restore();}

});
