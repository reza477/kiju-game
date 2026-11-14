import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {posedVisibleSurface} from './beast-integration-geometry.mjs';
import {nativeVisibleTopology} from './helpers/native-beast-surface.mjs';
import {nativeSelfIntersections} from './helpers/native-self-intersection.mjs';

// Crossing pairs recorded on 13 November 2026, after the strike kept the
// foreleg in its bind shape and the body began bounding in to a bent-elbow
// contact (docs/IMPROVEMENTS_2026-11-13.md). They total 5,546. The same
// detector and poses counted 19,635 before that change. This is a ceiling
// for the ceiling test below, never a target: the strict test still requires
// zero. Lower a figure when a repair lowers the count; never raise one.
const RECORDED_CROSSINGS=Object.freeze({
 'gait-0':172,'gait-60':496,'gait-120':230,'gait-180':332,'gait-240':310,'gait-299':213,'gait-359':183,
 'standard-strike-31':190,'standard-strike-42':183,'standard-strike-64':189,
 'drill-strike-31':183,'drill-strike-42':255,'drill-strike-64':177,
 'flesh-strike-31':193,'flesh-strike-42':196,'flesh-strike-64':186,
 'cyborg-strike-31':197,'cyborg-strike-42':221,'cyborg-strike-64':194,
 'horizontal-strike-31':197,'horizontal-strike-42':243,'horizontal-strike-64':183,
 'vertical-strike-31':197,'vertical-strike-42':243,'vertical-strike-64':183,
});

// One scan of all 25 poses serves both tests; it takes several minutes.
let scan=null;
function scanNativePoses(){
 return scan??=(async()=>{
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
   assert.equal(reports.length,25);assert.ok(reports.every(report=>report.checkedSourceFaces===100400));
   return reports;
  }finally{for(const value of [city,enemy])if(value?.meshyCarrier){value.meshyCarrier.controller.dispose();assets.disposeMeshyCarrier(value.meshyCarrier.instance);}restore();}
 })();
}

// Tracked, not gating. On 13 November 2026 the person directing development
// decided that the remaining crossings, which no review has been able to see,
// should stop blocking an alpha and be tracked instead (AGENTS.md). The test
// is unchanged: same detector, same epsilon, same 25 poses, zero required.
// It runs on every suite and reports as TODO while it fails. The ceiling
// test below is the gate, and it fails on any pose that gets worse.
const TRACKED='Tracked target, not a gate: decision of 13 November 2026, see AGENTS.md';
test('native connected body avoids self-crossing through representative gait and six-target strike/recovery poses',{todo:TRACKED},async t=>{
 const reports=await scanNativePoses();
 t.diagnostic(JSON.stringify({coverage:'All indexed body faces at25 representative actual native poses; not every animation instant',poses:reports.map(({label,checkedSourceFaces,comparisons,intersections,examples})=>({label,checkedSourceFaces,comparisons,intersections,examples})),epsilonRigUnits:1e-7}));
 assert.deepEqual(reports.filter(report=>report.intersections),[],'Native connected anatomy must not fold through itself');
});

test('native self-crossing never exceeds its recorded count in any of the 25 poses',async t=>{
 const reports=await scanNativePoses(),counts=Object.fromEntries(reports.map(report=>[report.label,report.intersections]));
 assert.deepEqual(Object.keys(counts).sort(),Object.keys(RECORDED_CROSSINGS).sort(),'Every recorded pose is scanned');
 const worse=reports.filter(report=>report.intersections>RECORDED_CROSSINGS[report.label]).map(report=>({pose:report.label,recorded:RECORDED_CROSSINGS[report.label],now:report.intersections}));
 const better=reports.filter(report=>report.intersections<RECORDED_CROSSINGS[report.label]).map(report=>({pose:report.label,recorded:RECORDED_CROSSINGS[report.label],now:report.intersections}));
 const total=values=>Object.values(values).reduce((sum,value)=>sum+value,0);
 t.diagnostic(JSON.stringify({recordedTotal:total(RECORDED_CROSSINGS),total:total(counts),before13November2026:19635,improvedPosesToLowerInTheRecord:better}));
 assert.deepEqual(worse,[],'A change must not add self-crossing to the native body');
});
