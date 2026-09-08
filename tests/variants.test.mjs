import test from 'node:test';
import assert from 'node:assert/strict';
import {CARRIER_VARIANTS} from '../src/variants.js';
import {createGame,serialize,deserialize,startBattle,meleeReach,expandRing,tick,build,fire,ability} from '../src/simulation.js';
import {batteryPosition,batterySolution} from '../src/weapon-layout.js';
import {kaijuWalkFloors,kaijuSlotPosition} from '../src/city-layout.js';

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
test('upper wards add height while preserving the castle footprint and existing plots',()=>{
 const s=createGame('kaiju','flesh'),before=Array.from({length:20},(_,i)=>kaijuSlotPosition(i));
 assert.equal(kaijuWalkFloors(s.rings).length,2);assert.ok(expandRing(s).ok);for(let i=0;i<48;i++)tick(s,.25);
 const floors=kaijuWalkFloors(s.rings);assert.equal(floors.length,5);assert.deepEqual(Array.from({length:20},(_,i)=>kaijuSlotPosition(i)),before);
 for(const floor of floors){assert.deepEqual(floor.path,floors[0].path);assert.equal(floor.y,floor.tier*8.2);}
 assert.ok(build(s,'cannon',19).ok);assert.ok(batteryPosition('kaiju',19).y>batteryPosition('kaiju',0).y+15);
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
