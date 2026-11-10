import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {bindFleshCargoPose,clearFleshCargoPose,fleshCargoOffset} from '../src/flesh-cargo-pose.js';
import * as sim from '../src/simulation.js';
import {batteryPosition,batterySolution} from '../src/weapon-layout.js';
import {createSaddleLayout} from '../src/saddle-layout.js';
import {VERTICAL_SLOT_ORDER} from '../src/vertical-city.js';
import {createSaddleFoundation,createSaddleDistrict} from '../src/saddle-city.js';
import {cannonMuzzleLocal,cannonMountProfile,castleBarrelClearance,castleShotClearance} from '../src/castle-collision.js';
import {FLESH_BODY_ENVELOPE} from '../src/flesh-body-envelope.js';
import {disposeGroup} from '../src/materials.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';

function battle(variant='flesh',faction='kaiju'){
 const state=sim.createGame(faction,variant),enemy=state.enemies[0];state.x=enemy.x;state.z=enemy.z;
 assert.ok(sim.startBattle(state,enemy.id));
 state.buildings[0]={type:'cannon',level:1,remaining:0,facing:0};state.buildings[1]={type:'cannon',level:2,remaining:0,facing:0};
 state.battle.player={x:0,z:0,angle:0};state.battle.enemy={x:0,z:40,angle:Math.PI};state.battle.enemyReload=999;state.battle.command='approach';
 return state;
}

test('auto-fire resolves current moved pose once, outside saves, before choosing batteries',()=>{
 const state=battle(),observations=[];
 bindFleshCargoPose(state,current=>{observations.push({time:current.time,x:current.battle.player.x,z:current.battle.player.z,angle:current.battle.player.angle});return -2.5;});
 const before=sim.serialize(state);sim.weaponStatus(state);assert.equal(sim.serialize(state),before);assert.equal(observations.length,1);
 observations.length=0;sim.tick(state,.1);
 assert.equal(observations.length,1,'One native pose resolution serves the entire auto-fire battery batch');
 assert.equal(observations[0].time,state.time);assert.equal(observations[0].z,state.battle.player.z);assert.ok(observations[0].z>0);
 assert.equal(observations[0].angle,state.battle.player.angle);assert.ok(state.battle.events.some(event=>event.kind==='shot'));
 const saved=sim.serialize(state),copy=sim.deserialize(saved);assert.ok(copy);assert.equal(fleshCargoOffset(copy),0,'Deserialized states cannot inherit another city resolver');
 clearFleshCargoPose(state);assert.equal(fleshCargoOffset(state),0);assert.equal(sim.serialize(state),saved);
 bindFleshCargoPose(state,()=>NaN);assert.throws(()=>fleshCargoOffset(state),/finite/);
 bindFleshCargoPose(state,()=>sim.weaponStatus(state));assert.throws(()=>fleshCargoOffset(state),/recursively/);clearFleshCargoPose(state);
});

test('other five variants ignore flesh binding exactly and keep original save data',()=>{
 for(const [faction,variant]of [['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']]){
  const state=battle(variant,faction),expected=sim.weaponStatus(state),saved=sim.serialize(state);
  bindFleshCargoPose(state,()=>{throw new Error('Other variants must not resolve flesh cargo');});
  assert.deepEqual(sim.weaponStatus(state),expected);assert.equal(sim.serialize(state),saved);assert.equal(fleshCargoOffset(state),0);clearFleshCargoPose(state);
 }
});

function boxEntry(a,b,box,pad){
 let low=0,high=1;
 for(let axis=0;axis<3;axis++){
  const d=b[axis]-a[axis],min=box[axis]-pad,max=box[axis+3]+pad;
  if(Math.abs(d)<1e-12){if(a[axis]<min||a[axis]>max)return null;continue;}
  const one=(min-a[axis])/d,two=(max-a[axis])/d;low=Math.max(low,Math.min(one,two));high=Math.min(high,Math.max(one,two));
  if(low>high)return null;
 }
 return low;
}

test('lowered cargo hits the stationary real body envelope and reports cargo-local hit points',()=>{
 // Empty cargo isolates the actual 3,889-box native envelope. This is a
 // transform witness, independent of the current art profile or district mix.
 const layout=createSaddleLayout(Array(20).fill(null),[]);layout.signature='cargo-body-transform-witness';layout.positions[0]={x:0,y:-9,z:0,rotation:0};
 const pair=cannonMuzzleLocal(0,1,0,0,layout),radius=cannonMountProfile(layout).barrelRadius;
 let hits=0,clear=0;
 for(const offset of [-3,-2.5,0,3]){
  const a=[pair.breech.x,pair.breech.y+offset,pair.breech.z],b=[pair.muzzle.x,pair.muzzle.y+offset,pair.muzzle.z];
  const entries=FLESH_BODY_ENVELOPE.map(box=>boxEntry(a,b,box,radius)).filter(t=>t!==null),expected=entries.length?Math.min(...entries):null;
  const result=castleBarrelClearance({layout,slot:0,level:1,yaw:0,cargoOffsetY:offset});
  assert.equal(result.clear,expected===null);
  if(expected===null){clear++;continue;}hits++;assert.equal(result.blocker,'castle:flesh-body:canonical');
  assert.ok(Math.abs(result.hit.t-expected)<1e-12);
  const worldHit=result.hit.point.map((v,i)=>v+(i===1?offset:0)),reference=a.map((v,i)=>v+(b[i]-v)*expected);
  assert.ok(new T.Vector3(...worldHit).distanceTo(new T.Vector3(...reference))<1e-10,'Translated BVH hit point must map back to the stationary body');
 }
 assert.ok(hits>=2&&clear>=2,'Both crossing and clear physical body witnesses must be exercised');
});

test('translated real cargo rooms and rails still block projectile paths in world space',()=>{
 const restore=installCPUCarrierEnvironment();let observedHits=0,clearCases=0;
 try{
  const state=sim.createGame('kaiju','flesh');state.rings=2;state.buildings.fill(null);state.towerOrder=[...VERTICAL_SLOT_ORDER];
  for(const [tier,slot]of state.towerOrder.entries())state.buildings[slot]={type:tier%3===0?'housing':'cannon',level:1,remaining:0,facing:0};
  const layout=createSaddleLayout(state.buildings,state.towerOrder),cargo=new T.Group();cargo.add(createSaddleFoundation(undefined,false,layout));
  for(const floor of layout.floors)if(floor.type!=='cannon'){
   const p=layout.positions[floor.slot],district=createSaddleDistrict(floor.type,1,{zone:p.zone});district.position.set(p.x,34+p.y+layout.districtOffset,p.z);district.rotation.y=p.rotation;cargo.add(district);
  }
  cargo.traverse(mesh=>{if(mesh.isMesh)for(const material of [mesh.material].flat())material.side=T.DoubleSide;});
  const trace=(a,b)=>{const delta=b.clone().sub(a);return new T.Raycaster(a,delta.normalize(),1e-7,a.distanceTo(b)).intersectObject(cargo,true)[0];};
  for(const offset of [-2.5,0,2]){
   cargo.position.y=offset;cargo.updateMatrixWorld(true);
   bindFleshCargoPose(state,()=>offset);
   for(const tier of [1,4,7,10,13,16,19]){
    const slot=state.towerOrder[tier],p=layout.positions[slot],building=state.buildings[slot];
    for(const yaw of [p.rotation,p.rotation+Math.PI/2,p.rotation+Math.PI]){
     building.facing=yaw;state.battle={enemyFaction:'crawler'};
     const target={x:p.x*.55+Math.sin(yaw)*40,y:10,z:p.z*.55+Math.cos(yaw)*40};
     const solution=batterySolution(state,slot,{x:0,z:0,angle:0},target,54);
     const end=new T.Vector3(target.x/.55,target.y/.55,target.z/.55),pair=cannonMuzzleLocal(slot,1,yaw,0,layout);
     const a=new T.Vector3(pair.breech.x,pair.breech.y+offset,pair.breech.z),b=new T.Vector3(pair.muzzle.x,pair.muzzle.y+offset,pair.muzzle.z);
     let hit=trace(a,b),previous=b;
     for(let step=1;!hit&&step<=100;step++){const t=step/100,next=b.clone().lerp(end,t);next.y+=Math.sin(t*Math.PI)*3/.55;hit=trace(previous,next);previous=next;}
     if(hit){observedHits++;assert.equal(solution.active,false,'Actual translated cargo geometry must block the simulated shot');}
     if(solution.active)clearCases++;
     const mount=batteryPosition('kaiju',slot,'flesh',layout,offset),zero=batteryPosition('kaiju',slot,'flesh',layout);
     assert.equal(mount.x,zero.x);assert.equal(mount.z,zero.z);assert.ok(Math.abs(mount.y-zero.y-offset*.55)<1e-12);
     const mechanical=castleShotClearance({layout,slot,level:1,yaw,cargoOffsetY:offset,target:{x:end.x,y:end.y-offset,z:end.z}});
     assert.equal(solution.active,mechanical.clear,'Bridge, target-space conversion and collision query must agree');
    }
   }
  }
  clearFleshCargoPose(state);disposeGroup(cargo);
 }finally{restore();}
 assert.ok(observedHits>5,`Expected actual translated room/rail ray witnesses; got ${observedHits}`);assert.ok(clearCases>5,`Expected useful firing lanes; got ${clearCases}`);
});
