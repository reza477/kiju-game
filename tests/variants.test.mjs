import test from 'node:test';
import assert from 'node:assert/strict';
import {CARRIER_VARIANTS} from '../src/variants.js';
import {createGame,serialize,deserialize,startBattle,meleeReach,expandRing,tick,build,fire,ability} from '../src/simulation.js';
import {batteryPosition,batterySolution} from '../src/weapon-layout.js';
import {KAIJU_SCALE} from '../src/city-layout.js';
import {createVerticalLayout,VERTICAL_SLOT_ORDER} from '../src/vertical-city.js';
import {castleShotClearance,castleSolids} from '../src/castle-collision.js';

function towerFixture(count=3,variant='cyborg'){
 const s=createGame('kaiju',variant);s.rings=count>7?2:1;s.buildings.fill(null);s.towerOrder=VERTICAL_SLOT_ORDER.slice(0,count);
 for(const slot of s.towerOrder)s.buildings[slot]={type:'farm',level:1,remaining:0};
 return s;
}
const towerLayout=s=>createVerticalLayout(s.buildings,s.towerOrder,s.variant);
const mountPosition=(s,slot)=>batteryPosition('kaiju',slot,s.variant,towerLayout(s));

test('every selectable carrier starts with the other five distinct variants',()=>{
 for(const [variant,{faction}] of Object.entries(CARRIER_VARIANTS)){
  const s=createGame(faction,variant);assert.equal(s.variant,variant);assert.equal(s.enemies.length,5);
  assert.deepEqual([s.variant,...s.enemies.map(e=>e.variant)].sort(),Object.keys(CARRIER_VARIANTS).sort());
  assert.deepEqual(deserialize(serialize(s)),s);
  s.x=s.enemies[0].x;s.z=s.enemies[0].z;assert.ok(startBattle(s,s.enemies[0].id));
  assert.equal(deserialize(serialize(s)).battle.enemyVariant,s.enemies[0].variant);
 }
});
test('old saves retain their three rivals and construction while variants are migrated',()=>{
 const s=createGame('kaiju');s.enemies=s.enemies.slice(0,3);delete s.variant;for(const e of s.enemies)delete e.variant;
 assert.ok(build(s,'housing',0).ok);tick(s,.25);s.enemies[0].defeated=true;s.stats.victories=1;
 const loaded=deserialize(serialize(s));assert.ok(loaded);assert.equal(loaded.variant,'cyborg');assert.equal(loaded.enemies.length,3);
 assert.deepEqual(loaded.buildings,s.buildings);assert.equal(loaded.stats.victories,1);assert.ok(loaded.enemies[0].defeated);
 for(const e of loaded.enemies)assert.equal(CARRIER_VARIANTS[e.variant].faction,e.faction);
});
test('cross-faction and mismatched battle variants are rejected',()=>{
 const s=createGame('crawler','drill');s.variant='flesh';assert.equal(deserialize(serialize(s)),null);
 s.variant='drill';s.enemies[0].variant='vertical';assert.equal(deserialize(serialize(s)),null);
 const b=createGame();b.x=b.enemies[0].x;b.z=b.enemies[0].z;startBattle(b,b.enemies[0].id);b.battle.enemyVariant='flesh';assert.equal(deserialize(serialize(b)),null);
});
test('harness expansion grants capacity; each new district adds a supported floor above the existing city',()=>{
 const s=createGame('kaiju','flesh'),before=towerLayout(s);
 assert.equal(before.floors.length,3);assert.ok(expandRing(s).ok);for(let i=0;i<48;i++)tick(s,.25);
 assert.equal(s.rings,2);assert.deepEqual(towerLayout(s),before,'Unused capacity must not manufacture empty castle storeys');
 assert.ok(build(s,'cannon',19).ok);const after=towerLayout(s);
 assert.equal(after.floors.length,before.floors.length+1);
 assert.deepEqual(after.footprint,before.footprint);assert.deepEqual(after.floors.slice(0,-1),before.floors);
 const floor=after.floors.at(-1);assert.equal(floor.slot,19);assert.equal(floor.y,before.height);
 assert.deepEqual(floor.path,before.floors[0].path);
 const p=mountPosition(s,19),base=mountPosition(s,7);
 assert.equal(p.x,base.x);assert.equal(p.z,base.z);assert.ok(p.y>base.y);
});
test('drill hull elongates mounts and physical melee spacing',()=>{
 const standard=batteryPosition('crawler',17,'standard'),drill=batteryPosition('crawler',17,'drill');
 assert.equal(drill.z,standard.z*1.32);assert.equal(drill.x,standard.x*.85);
 assert.ok(meleeReach('kaiju','crawler','flesh','drill')>40);
 assert.ok(meleeReach('crawler','kaiju','drill','cyborg')>36);
 const s=createGame('crawler','drill');s.buildings.fill(null);s.buildings[17]={type:'cannon',level:1,remaining:0,facing:Math.PI/4};
 const result=batterySolution(s,17,{x:0,z:0,angle:0},{x:drill.x+20*.85,z:drill.z+20*1.32},70);
 assert.ok(result.active);assert.ok(Math.abs(result.bearing-Math.PI/4)<1e-10);
});
test('the ground drill uses real ranged attacks against airborne rivals',()=>{
 for(const variant of ['horizontal','vertical']){
  const s=createGame('crawler','drill'),e=s.enemies.find(e=>e.variant===variant);s.x=e.x;s.z=e.z;startBattle(s,e.id);
  const b=s.battle;b.player={x:0,z:0,angle:0};b.enemy={x:0,z:35,angle:Math.PI};b.autoFire=false;b.enemyReload=999;
  assert.equal(meleeReach('crawler','airship','drill',variant),0);assert.ok(fire(s));assert.equal(b.events.at(-1).kind,'shot');
  const position={...b.player};assert.ok(ability(s).ok);assert.deepEqual(b.player,position);assert.equal(b.events.at(-1).kind,'shot');assert.equal(b.events.at(-1).damage,60);
  const before=b.enemyHp;tick(s,.25);tick(s,.25);assert.equal(b.enemyHp,before);tick(s,.05);assert.equal(b.enemyHp,before-89);
 }
});
test('low castle guns hit the titan while a genuinely built high floor clears its shoulders and still respects masonry',()=>{
 for(const variant of ['cyborg','flesh']){
  // A compact cyborg needs more actual occupied storeys to reach above the
  // unchanged robot. Its twelfth floor is no longer the old tall mount.
  const s=towerFixture(variant==='cyborg'?20:12,variant),lowSlot=s.towerOrder[0],highSlot=s.towerOrder.at(-1);
  for(const slot of [lowSlot,highSlot])s.buildings[slot]={type:'cannon',level:1,remaining:0,facing:0};
  const low=batterySolution(s,lowSlot,{x:0,z:0,angle:0},{x:0,z:45},54),high=batterySolution(s,highSlot,{x:0,z:0,angle:0},{x:0,z:45},54);
  assert.equal(low.blocker,'carrier');assert.equal(low.active,false);
  assert.ok(mountPosition(s,highSlot).y>51*KAIJU_SCALE,'Upper mount must physically be above the head');
  assert.notEqual(high.blocker,'carrier');assert.ok(String(high.blocker).startsWith('castle:vertical:apse-'));
  assert.equal(high.active,false,'Clearing the titan does not permit firing through the castle apse');
  s.buildings[lowSlot].facing=Math.PI;const rear=batterySolution(s,lowSlot,{x:0,z:0,angle:0},{x:0,z:-45},54);
  assert.equal(rear.blocker,null);assert.ok(rear.active,'The castle portal faces outward behind the carrier');
 }
});

test('vertical castle masonry blocks oblique cannon damage while its outward port stays usable',()=>{
 for(const variant of ['cyborg','flesh'])for(const {level,offset} of [{level:1,offset:30},{level:1,offset:-30},{level:3,offset:35},{level:3,offset:40}]){
  const s=towerFixture(3,variant),slot=11;s.buildings[slot]={type:'cannon',level,remaining:0};
  const rival=s.enemies.find(e=>e.variant==='standard');s.x=rival.x;s.z=rival.z;startBattle(s,rival.id);
  const b=s.battle,p=mountPosition(s,slot),yaw=towerLayout(s).positions[slot].rotation+offset*Math.PI/180;
  b.player={x:0,z:0,angle:0};b.enemy={x:p.x+Math.sin(yaw)*45,z:p.z+Math.cos(yaw)*45,angle:Math.PI};b.autoFire=false;b.enemyReload=999;
  const result=batterySolution(s,slot,b.player,b.enemy,54);assert.ok(result.inArc&&result.inRange);assert.equal(result.active,false);assert.ok(String(result.blocker).startsWith('castle:vertical:front-cheek:'));
  assert.ok(fire(s));const event=b.events.at(-1);assert.ok(!event.mounts.includes(slot),'A blocked district must not add a muzzle or damage to the attack');
  const withoutCannon=deserialize(serialize(s));withoutCannon.buildings[slot]={type:'farm',level,remaining:0};withoutCannon.battle.reload=0;withoutCannon.battle.events=[];
  assert.ok(fire(withoutCannon));assert.equal(event.damage,withoutCannon.battle.events.at(-1).damage);
 }
 for(const count of [1,3,7,20]){
  const s=towerFixture(count),slot=s.towerOrder[Math.min(1,count-1)];s.buildings[slot]={type:'cannon',level:3,remaining:0};s.battle={enemyFaction:'crawler'};
  const p=mountPosition(s,slot),result=batterySolution(s,slot,{x:0,z:0,angle:0},{x:p.x,z:p.z-45},54);
  assert.equal(result.blocker,null);assert.ok(result.active,'A built lower outward port stays useful as further storeys are added above it');
 }
});

test('actual vertical castle portal trim, corner shafts and lancet frames stop curved cannon shots',()=>{
 for(const variant of ['cyborg','flesh'])for(const {level,degrees,enemyFaction,solid} of [
  {level:3,degrees:20,enemyFaction:'crawler',solid:'vertical:gun-portal:1:0'},
  {level:1,degrees:40,enemyFaction:'airship',solid:'vertical:corner:1:-1:-1'},
  {level:1,degrees:variant==='cyborg'?51:45,enemyFaction:'airship',solid:variant==='cyborg'?'vertical:side-arch:1:-1:0:7':'vertical:side-arch:1:-1:0:0'},
 ]){
  const s=towerFixture(3,variant),slot=11;s.buildings[slot]={type:'cannon',level,remaining:0};s.battle={enemyFaction};
  const layout=towerLayout(s),p=mountPosition(s,slot),yaw=layout.positions[slot].rotation+degrees*Math.PI/180;
  const target={x:p.x+Math.sin(yaw)*50,y:enemyFaction==='airship'?18:10,z:p.z+Math.cos(yaw)*50};
  const result=batterySolution(s,slot,{x:0,z:0,angle:0},target,54);
  const clearance=castleShotClearance({layout,slot,level,yaw,target:Object.fromEntries(Object.entries(target).map(([axis,value])=>[axis,value/KAIJU_SCALE]))});
  assert.ok(result.inArc&&result.inRange);assert.equal(result.active,false);assert.equal(result.blocker,`castle:${solid}`);
  assert.equal(clearance.barrelClear,true,'The fixture must test the curved projectile beyond a physically clear barrel');
  assert.equal(clearance.hit?.id,solid);assert.ok(castleSolids(s.rings,layout).some(s=>s.id===solid),'The hit must name an actual shared rendered solid');
 }
});
