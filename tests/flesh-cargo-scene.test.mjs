import test from 'node:test';
import assert from 'node:assert/strict';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';

test('live cargo resolver poses before firing and reuses exact same-time native inputs',async()=>{
 const restore=installCPUCarrierEnvironment();let assets,city,state,clear;
 try{
  assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers();
  const sim=await import('../src/simulation.js'),{makeCity}=await import('../src/carriers.js'),{posePlayerCargo}=await import('../src/scene.js'),bridge=await import('../src/flesh-cargo-pose.js');clear=bridge.clearFleshCargoPose;
  state=sim.createGame('kaiju','flesh');state.buildings[0]={type:'cannon',level:1,remaining:0,facing:0};state.towerOrder.push(0);state.resources={wood:9000,food:9000,iron:9000};
  const rival=state.enemies[0];rival.x=state.x+10;rival.z=state.z;assert.ok(sim.startBattle(state,rival.id));state.battle.player={x:-60,z:30,angle:0};state.battle.enemy={x:-60,z:70,angle:Math.PI};state.battle.command='hold';state.battle.autoFire=false;
  city=makeCity('kaiju',false,state.rings,'flesh');const scene={city,state,preview:false};let resolves=0;bridge.bindFleshCargoPose(state,()=>{resolves++;return posePlayerCargo(scene,state);});
  const before=sim.serialize(state);assert.equal(city.cargoOffsetY,0);sim.weaponStatus(state);assert.notEqual(city.cargoOffsetY,0,'Pre-fire status must solve attachment before scene.update');assert.equal(resolves,1,'Resolve once for the complete cannon batch');assert.equal(sim.serialize(state),before,'Transient pose cannot enter saves');
  for(const part of[city.foundation,city.districts,city.plots,city.hitGroup,city.people.group,...city.baseWeapons.map(w=>w.group)])assert.equal(part.parent,city.cargo);
  assert.deepEqual(city.cargo.position.toArray(),[0,city.cargoOffsetY,0]);assert.deepEqual(city.cargo.quaternion.toArray(),[0,0,0,1]);assert.deepEqual(city.cargo.scale.toArray(),[1,1,1]);
  const input=city.nativePoseInput,bones=()=>city.meshyCarrier.renderMeshes[0].skeleton.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]),prior=bones(),traffic=JSON.stringify(city.people.towerCirculation);
  for(let i=0;i<4;i++)sim.weaponStatus(state);
  assert.equal(city.nativePoseInput,input);assert.deepEqual(bones(),prior,'Repeated status cannot advance gait/plants');assert.equal(JSON.stringify(city.people.towerCirculation),traffic,'Repeated clock cannot advance walking residents');
  state.battle.player.x+=.2;state.battle.player.angle=.2;sim.weaponStatus(state);assert.notEqual(city.nativePoseInput,input);assert.equal(city.root.position.x,state.battle.player.x);assert.equal(city.root.rotation.y,.2);
  const moved=city.nativePoseInput;city.strikeTarget=city.root.position.clone().addScalar(2);city.strikeTime=state.time;sim.weaponStatus(state);assert.notEqual(city.nativePoseInput,moved,'Same-clock strike input must invalidate the body solve');
  const strike=city.nativePoseInput;city.strikeTarget.y+=.1;sim.weaponStatus(state);assert.notEqual(city.nativePoseInput,strike,'Contact settling must be able to re-pose at the same clock');
  bridge.clearFleshCargoPose(state);assert.equal(bridge.fleshCargoOffset(state),0);const count=resolves;sim.weaponStatus(state);assert.equal(resolves,count,'A cleared state cannot retain a disposed city resolver');
 }finally{if(state)clear?.(state);if(city?.meshyCarrier){city.meshyCarrier.controller.dispose();assets.disposeMeshyCarrier(city.meshyCarrier.instance);}restore();}
});
