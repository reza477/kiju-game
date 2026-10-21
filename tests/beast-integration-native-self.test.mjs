import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {posedVisibleSurface} from './beast-integration-geometry.mjs';
import {nativeVisibleTopology} from './helpers/native-beast-surface.mjs';
import {nativeSelfIntersections} from './helpers/native-self-intersection.mjs';

test('native connected body avoids self-crossing through representative gait and six-target strike/recovery poses',async t=>{
 const restore=installCPUCarrierEnvironment(),reports=[];let assets,city,enemy;
 try{
  assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers();
  const {makeCity,animateCity,setCityRings}=await import('../src/carriers.js'),{placeCity,GameScene}=await import('../src/scene.js'),sim=await import('../src/simulation.js');
  function populate(city){const state=sim.createGame('kaiju','flesh');state.rings=2;const extra=state.buildings.flatMap((b,i)=>b?[]:[i]);for(const i of extra)state.buildings[i]={type:'housing',level:1,remaining:0};state.towerOrder.push(...extra);setCityRings(city,2,state.buildings,state.towerOrder);return state;}
  function check(label,topology){city.root.updateMatrixWorld(true);const surface=posedVisibleSurface(city.meshyCarrier.renderMeshes[0],city.rig),result=nativeSelfIntersections(surface,topology);reports.push({label,...result});}
  function close(value){value?.meshyCarrier?.controller.dispose();if(value?.meshyCarrier)assets.disposeMeshyCarrier(value.meshyCarrier.instance);}
  city=makeCity('kaiju',false,2,'flesh');populate(city);assert.equal(city.meshyCarrier.renderMeshes[0].userData.nativeQuadruped?.version,1);
  let topology=nativeVisibleTopology(city.meshyCarrier.renderMeshes[0]),x=0,z=0;
  for(let frame=0;frame<360;frame++){
   const moving=frame>=12&&frame<300,heading=frame<120?0:.35*Math.sin((frame-120)/60);if(moving){x+=Math.sin(heading)*.12;z+=Math.cos(heading)*.12;}
   placeCity(city,x,z,heading);animateCity(city,frame/60,moving,0);if([0,60,120,180,240,299,359].includes(frame))check('gait-'+frame,topology);
  }
  close(city);city=null;
  for(const [faction,variant]of [['crawler','standard'],['crawler','drill'],['kaiju','flesh'],['kaiju','cyborg'],['airship','horizontal'],['airship','vertical']]){
   city=makeCity('kaiju',false,2,'flesh');const state=populate(city),reach=sim.meleeReach('kaiju',faction,'flesh',variant);enemy=makeCity(faction,true,1,variant);enemy.id='native-self-target';
   topology=nativeVisibleTopology(city.meshyCarrier.renderMeshes[0]);placeCity(city,-60,30,0);placeCity(enemy,-60,30+reach-.5,Math.PI);animateCity(city,0,false,0);animateCity(enemy,0,false,0);
   state.time=1;state.battle={time:0,enemyId:enemy.id,player:{x:-60,z:30},enemy:{x:-60,z:30+reach-.5}};const saved=sim.serialize(state),context={city,enemyCities:[enemy],state,scene:new T.Scene(),fx:[],cinematic:{mode:'steady',impulse(){}}};
   GameScene.prototype.createEffect.call(context,{kind:'impact',source:'player',time:0,from:state.battle.player,to:state.battle.enemy,mounts:[]});
   for(let frame=0;frame<=78;frame++){animateCity(city,1+frame/60,false,0);if([31,42,64].includes(frame))check(variant+'-strike-'+frame,topology);}
   assert.equal(sim.serialize(state),saved);close(city);city=null;close(enemy);enemy=null;
  }
  t.diagnostic(JSON.stringify({coverage:'All indexed body faces at25 representative actual native poses; not every animation instant',poses:reports.map(({label,checkedSourceFaces,comparisons,intersections,examples})=>({label,checkedSourceFaces,comparisons,intersections,examples})),epsilonRigUnits:1e-7}));
  assert.equal(reports.length,25);assert.ok(reports.every(report=>report.checkedSourceFaces===100400));assert.deepEqual(reports.filter(report=>report.intersections),[],'Native connected anatomy must not fold through itself');
 }finally{for(const value of [city,enemy])if(value?.meshyCarrier){value.meshyCarrier.controller.dispose();assets.disposeMeshyCarrier(value.meshyCarrier.instance);}restore();}
});
