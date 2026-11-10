import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {surface,meshes,contacts,cannonSweep,cannonSweepGap} from './helpers/frame-clearance.mjs';
import {posedVisibleSurface} from './beast-integration-geometry.mjs';
import {saddleSlabCollisions} from './helpers/saddle-slab-clearance.mjs';

test('refitted cradle and full rotating base guns clear occupied rooms, walking decks and posed native skin',async t=>{
 const restore=installCPUCarrierEnvironment(),created=[],samples=[],failures=[];let assets;
 try{
  assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers();
  const {makeCity,animateCity,setCityRings}=await import('../src/carriers.js'),{placeCity,GameScene}=await import('../src/scene.js'),sim=await import('../src/simulation.js');
  const {createSaddleLayout,SADDLE_SLOT_ORDER}=await import('../src/saddle-layout.js'),{createSaddleFoundation,createSaddleDistrict}=await import('../src/saddle-city.js'),{createBattery}=await import('../src/armaments.js'),{FLESH_SADDLE_PROFILE}=await import('../src/flesh-saddle-profile.js');
  const make=(f='kaiju',e=false,v='flesh')=>{const c=makeCity(f,e,2,v);created.push(c);return c;};
  const populate=c=>{const s=sim.createGame('kaiju','flesh');for(const slot of SADDLE_SLOT_ORDER)s.buildings[slot]={type:'housing',level:3,remaining:0};s.towerOrder=[...SADDLE_SLOT_ORDER];s.rings=2;setCityRings(c,2,s.buildings,s.towerOrder);return s;};
  const buildings=Array.from({length:20},()=>({type:'keep',level:3,remaining:0})),layout=createSaddleLayout(buildings,SADDLE_SLOT_ORDER),roomRoot=new T.Group(),foundation=createSaddleFoundation(34,false,layout,{geometryOnly:true});
  // The union of all real room types at maximum upgrade protects every future
  // construction choice; no simplified roof boxes stand in for the renderer.
  for(const floor of layout.floors)for(const type of Object.keys(sim.BUILDINGS).filter(v=>v!=='cannon')){const p=layout.positions[floor.slot],g=createSaddleDistrict(type,3,{geometryOnly:true});g.position.set(p.x,34+p.y+layout.districtOffset,p.z);g.rotation.y=p.rotation;roomRoot.add(g);}
  roomRoot.updateMatrixWorld(true);foundation.updateMatrixWorld(true);const rooms=surface(meshes(roomRoot)),fixedCity=surface([...meshes(roomRoot),...meshes(foundation)]),gun=createBattery('kaiju',1);gun.scale.setScalar(1.22);gun.updateMatrixWorld(true);const sweep=cannonSweep(surface(meshes(gun.weapon.turret)));
  for(const seat of FLESH_SADDLE_PROFILE.baseGuns){const result=cannonSweepGap(fixedCity,sweep,{x:seat.x,z:seat.z,absoluteY:seat.y});assert.ok(result.minimum>.04,JSON.stringify({kind:'base turret / upgraded city',seat,...result}));}
  const check=(city,label)=>{
   city.root.updateMatrixWorld(true);
   const skin=posedVisibleSurface(city.meshyCarrier.renderMeshes[0],city.cargo??city.rig);skin.faces=Array.from({length:skin.indices.length/3},(_,face)=>({face}));
   const list=meshes(city.meshyCarrier.saddle.group),complete=surface(list,(city.cargo??city.rig).matrixWorld),rigid=surface(list.filter(e=>!['Compressed saddle bolster','Padded saddle load cradle'].includes(e.object.name)),(city.cargo??city.rig).matrixWorld);
   const body=contacts(rigid,skin,.04),room=contacts(complete,rooms,.04),slabs=saddleSlabCollisions(complete.vertices.map(p=>p.toArray()),complete.indices,.04),guns=FLESH_SADDLE_PROFILE.baseGuns.map(g=>cannonSweepGap(skin,sweep,{x:g.x,z:g.z,absoluteY:g.y})),supportSweep=FLESH_SADDLE_PROFILE.baseGuns.map(g=>cannonSweepGap(complete,sweep,{x:g.x,z:g.z,absoluteY:g.y}));
   const entry={label,rigidSkinContacts:body.count,roomContacts:room.count,walkingSlabContacts:slabs.reduce((a,b)=>a+b,0),minimumGunBodyGap:Math.min(...guns.map(v=>v.minimum)),minimumGunSupportGap:Math.min(...supportSweep.map(v=>v.minimum))};samples.push(entry);
   if(body.count||room.count||entry.walkingSlabContacts||entry.minimumGunBodyGap<=.04||entry.minimumGunSupportGap<=.04)failures.push({...entry,body:body.examples,room:room.examples,slabs,guns,supportSweep});
  };
  let city=make();populate(city);let x=0,z=0;
  for(let frame=0;frame<=420;frame++){const moving=frame>12&&frame<300,heading=frame<120?0:.35*Math.sin((frame-120)/60);if(moving){x+=Math.sin(heading)*.12;z+=Math.cos(heading)*.12;}placeCity(city,x,z,heading);animateCity(city,frame/60,moving,0);if([0,60,120,180,228,234,240,270,299,300,306,330,359,420].includes(frame))check(city,'gait-'+frame);}
  for(const[faction,variant]of[['crawler','standard'],['crawler','drill'],['kaiju','flesh'],['kaiju','cyborg'],['airship','horizontal'],['airship','vertical']]){
   city=make();const state=populate(city),reach=sim.meleeReach('kaiju',faction,'flesh',variant),enemy=make(faction,true,variant);enemy.id='refit-clearance-target';placeCity(city,-60,30,0);placeCity(enemy,-60,30+reach-.5,Math.PI);animateCity(city,0,false,0);animateCity(enemy,0,false,0);state.time=1;state.battle={time:0,enemyId:enemy.id,player:{x:-60,z:30},enemy:{x:-60,z:30+reach-.5}};
   const context={city,enemyCities:[enemy],state,scene:new T.Scene(),fx:[],cinematic:{mode:'steady',impulse(){}}};GameScene.prototype.createEffect.call(context,{kind:'impact',source:'player',time:0,from:state.battle.player,to:state.battle.enemy,mounts:[]});
   for(let frame=0;frame<=90;frame++){animateCity(city,1+frame/60,false,0);if([24,31,42,77,90].includes(frame))check(city,variant+'-strike-'+frame);}
  }
  t.diagnostic(JSON.stringify({samples,failures},null,2));assert.equal(failures.length,0,'The complete low cradle and rotating base guns must clear bodies, rooms and walking decks');
 }finally{for(const c of created)if(c.meshyCarrier){c.meshyCarrier.controller.dispose();assets.disposeMeshyCarrier(c.meshyCarrier.instance);}restore();}
});
