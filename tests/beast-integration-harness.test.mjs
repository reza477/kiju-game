import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {posedVisibleSurface,closedGirdleTopology,assertSurfaceClearance,triangleBoxIntersection,assertClosedSurfacesDisjoint} from './beast-integration-geometry.mjs';
import {SADDLE_MOUNTS} from '../src/saddle-layout.js';
import {GIRDLE_SECTIONS,GIRDLE_WIDTH_SAMPLES} from '../src/saddle-harness.js';

for(const mutualOnly of[false,true])test(mutualOnly?'front and rear girdles and opposite buckles remain disjoint through gait, turns, stop and strike':'actual closed girdle faces clear posed beast and 20 occupied decks through gait, turns, stop and strike',async t=>{
 const restore=installCPUCarrierEnvironment();let city,enemy,assets;
 try{
  assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers(['flesh']);
  const {makeCity,animateCity,setCityRings}=await import('../src/carriers.js'),{placeCity,GameScene}=await import('../src/scene.js'),sim=await import('../src/simulation.js');
  city=makeCity('kaiju',false,2,'flesh');const mesh=city.meshyCarrier.renderMeshes[0];assert.equal(mesh.userData.riggedBeast,true,'Use the new runtime skin');
  const state=sim.createGame('kaiju','flesh'),type=state.buildings.find(Boolean).type;setCityRings(city,2,Array.from({length:20},()=>({type,level:1,remaining:0})),[]);assert.equal(city.saddleLayout.floors.length,20);
  const harness=city.meshyCarrier.saddle.harness;assert.equal(harness.bands.length,2);assert.equal(GIRDLE_SECTIONS,128);assert.equal(GIRDLE_WIDTH_SAMPLES,3);let samples=0,comparisons=0,mutualPairs=0,mutualTriangleComparisons=0;
  const sourceFaces=new Map(city.meshyCarrier.renderMeshes.map(object=>{
   const index=object.geometry.index.array,faces=new Set();for(let i=0;i<index.length;i+=3)faces.add(`${index[i]},${index[i+1]},${index[i+2]}`);return[object,faces];
  }));
  function checkAnchorPayload(){for(const band of harness.bands){
   assert.equal(band.contours.length,GIRDLE_WIDTH_SAMPLES);assert.ok(band.contours.every(contour=>contour.length>=3),'Each width track has a complete closed contour');assert.ok(band.strip.length>=3,'The whole connected skin strip supports the belt');
   const anchors=[...band.contours.flat(),...band.strip];assert.equal(band.anchors.length,anchors.length);assert.ok(anchors.every((anchor,i)=>anchor===band.anchors[i]),'All contour and strip anchors are evaluated');
   for(const anchor of anchors){
    const {object,surface}=anchor;assert.ok(sourceFaces.has(object),'Anchor belongs to an actual animated skin');assert.ok(surface&&sourceFaces.get(object).has(surface.indices.join(',')),'Anchor references an exact indexed source triangle');
    const weights=surface.weights.toArray();assert.ok(weights.every(weight=>Number.isFinite(weight)&&weight>=-1e-8&&weight<=1+1e-8),'Barycentric weights lie on the source face');assert.ok(Math.abs(weights.reduce((sum,weight)=>sum+weight,0)-1)<1e-8,'Barycentric weights sum to one');
   }
  }}
  function checkPose(label){
   if(samples===0)checkAnchorPayload();
   city.root.updateMatrixWorld(true);const skin=mutualOnly?null:posedVisibleSurface(mesh,city.rig),assemblies=[];
   for(const band of harness.bands){
    assert.equal(band.mesh.visible,true);assert.equal(band.mesh.userData.saddleGirdle,true);assert.equal(band.mesh.userData.sections,GIRDLE_SECTIONS);
    const topology=closedGirdleTopology(band.mesh.geometry);assert.equal(topology.vertices,GIRDLE_SECTIONS*GIRDLE_WIDTH_SAMPLES*2);assert.equal(topology.faces,1536);
    const displays=[band.mesh];for(const buckle of band.buckles)buckle.object.traverse(object=>{if(object.isMesh)displays.push(object);});
    if(mutualOnly)assemblies.push(displays.map(display=>posedVisibleSurface(display,city.rig)));
    if(!mutualOnly)for(const [part,display]of displays.entries()){
     const actual=assertSurfaceClearance(display,city.rig,skin,label+'/part-'+part,.04);comparisons+=actual.comparisons;
     for(let i=0;i<actual.indices.length;i+=3){const triangle=[actual.vertices[actual.indices[i]],actual.vertices[actual.indices[i+1]],actual.vertices[actual.indices[i+2]]];
      assert.ok(new T.Triangle(...triangle).getArea()>1e-8,band.mesh.name+' collapsed face at '+label);
      for(const [tier,deck]of SADDLE_MOUNTS.entries())assert.equal(triangleBoxIntersection(triangle,deck,[1.73,1.9],-.12,.02)||triangleBoxIntersection(triangle,deck,[1.71,1.88],-.01,.09),false,`${band.mesh.name} part ${part} face ${i/3} crosses occupied deck ${tier} at ${label}`);
     }
    }
   }
   // Compare separate front/rear assemblies only; bars intentionally join
   // their own buckle and leather, so those designed contacts are excluded.
   if(mutualOnly)for(const [front,a]of assemblies[0].entries())for(const [rear,b]of assemblies[1].entries()){
    const result=assertClosedSurfacesDisjoint(a,b,`Front part ${front}/rear part ${rear} at ${label}`);mutualPairs++;mutualTriangleComparisons+=result.comparisons;
   }
   samples++;
  }
  let x=0,z=0;
  for(let frame=0;frame<=360;frame++){
   const time=frame/60,moving=frame>12&&frame<300,heading=frame<120?0:.35*Math.sin((frame-120)/60);if(moving){x+=Math.sin(heading)*.12;z+=Math.cos(heading)*.12;}
   placeCity(city,x,z,heading);animateCity(city,time,moving,0);if(frame%12===0)checkPose('gait-frame-'+frame);
  }
  assert.equal(samples,31);
  // Use the unchanged impact-event path, target raycast and real strike marker.
  const reach=sim.meleeReach('kaiju','crawler','flesh','standard');enemy=makeCity('crawler',true,1,'standard');enemy.id='harness-strike-target';placeCity(city,x,z,0);placeCity(enemy,x,z+reach-.5,Math.PI);animateCity(city,7,false,0);animateCity(enemy,7,false,0);
  state.time=7;state.battle={time:0,enemyId:enemy.id,player:{x,z},enemy:{x,z:z+reach-.5}};const saved=sim.serialize(state);
  const scene={city,enemyCities:[enemy],state,scene:new T.Scene(),fx:[],cinematic:{mode:'steady',impulse(){}}};
  GameScene.prototype.createEffect.call(scene,{kind:'impact',source:'player',time:0,from:state.battle.player,to:state.battle.enemy,mounts:[]});assert.ok(city.strikeTarget?.isVector3);
  // Exercise both ends of the late supporting-arm bend, including its blend.
  for(let frame=0;frame<=78;frame++){animateCity(city,7+frame/60,false,0);if([0,12,24,29,31,32,42,57,58,59,60,77].includes(frame))checkPose('strike-frame-'+frame);}
  assert.equal(sim.serialize(state),saved,'Harness/strike animation must not mutate saved game state');assert.equal(samples,43);
  harness.setLoad({rearLoaded:false});harness.update();assert.equal(harness.bands[1].mesh.visible,false);assert.ok(harness.bands[1].buckles.every(b=>!b.object.visible));assert.equal(harness.bands[0].mesh.visible,true);
  harness.setLoad({rearLoaded:true});harness.update();assert.equal(harness.bands[1].mesh.visible,true);assert.ok(harness.bands[1].buckles.every(b=>b.object.visible));
  t.diagnostic(JSON.stringify({coverage:mutualOnly?'mutual assemblies':'skin and decks',sampledPoses:samples,triangleComparisons:comparisons,mutualPairs,mutualTriangleComparisons,clearanceRigUnits:.04,clearanceWorldUnits:.022,mutualContactEpsilonRigUnits:1e-7}));
 }finally{city?.meshyCarrier?.controller.dispose();if(city?.meshyCarrier)assets.disposeMeshyCarrier(city.meshyCarrier.instance);enemy?.meshyCarrier?.controller.dispose();if(enemy?.meshyCarrier)assets.disposeMeshyCarrier(enemy.meshyCarrier.instance);restore();}
});
