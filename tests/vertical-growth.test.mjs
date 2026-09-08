import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,build,upgrade,tick,expandRing,serialize,deserialize} from '../src/simulation.js';
import {createVerticalLayout,VERTICAL_SLOT_ORDER,nextVerticalSlot} from '../src/vertical-city.js';
import {batteryPosition} from '../src/weapon-layout.js';
const layout=s=>createVerticalLayout(s.buildings,s.towerOrder);
const advance=(s,time)=>{for(let i=0;i<time*4;i++)tick(s,.25);};
const rich=(variant='cyborg')=>{const s=createGame('kaiju',variant);s.resources={wood:9000,iron:9000,food:9000};return s;};

test('both Gothic variants start with three directly overlapping district footprints',()=>{
 for(const v of ['cyborg','flesh']){const s=rich(v),l=layout(s);assert.deepEqual(l.order,[7,11,13]);assert.equal(l.floors.length,3);for(let i=0;i<3;i++){const p=l.positions[l.order[i]];assert.equal(p.x,0);assert.equal(p.z,-12);assert.equal(p.tier,i);assert.ok(Math.abs(p.y-i*3.8)<1e-10);}assert.equal(l.height,11.399999999999999);}
});
test('every addition appends above the top even when historical slot IDs are out of order',()=>{
 const s=rich();for(const id of [2,0,3,1]){const before=layout(s);assert.ok(build(s,'housing',id).ok);const after=layout(s);assert.equal(after.order.at(-1),id);assert.equal(after.positions[id].y,before.height);assert.ok(after.towerTop>before.towerTop);for(const prev of before.order)assert.deepEqual(after.positions[prev],before.positions[prev]);assert.deepEqual(after.footprint,before.footprint);advance(s,7);}
 assert.deepEqual(s.towerOrder,[7,11,13,2,0,3,1]);
});
test('an upgrade raises its storey and every district above while preserving lower floors',()=>{
 const s=rich();build(s,'cannon',0);advance(s,10);const before=layout(s),muzzle=batteryPosition('kaiju',0,s.variant,before);
 assert.ok(upgrade(s,11).ok);const working=layout(s);assert.equal(working.positions[7].y,before.positions[7].y);assert.equal(working.positions[11].y,before.positions[11].y);assert.ok(Math.abs(working.positions[13].y-before.positions[13].y-.8)<1e-10);assert.ok(Math.abs(batteryPosition('kaiju',0,s.variant,working).y-muzzle.y-.8*.55)<1e-10);
 advance(s,8);assert.equal(layout(s).height,working.height);assert.deepEqual(layout(s).order,before.order);assert.equal(s.buildings[11].level,2);
});
test('harness reinforcement unlocks capacity without spawning empty floors',()=>{
 const s=rich(),before=layout(s);assert.ok(expandRing(s).ok);assert.equal(layout(s).height,before.height);advance(s,12);assert.equal(s.rings,2);assert.equal(layout(s).height,before.height);
 while(nextVerticalSlot(s.buildings,s.rings)!==null){const next=nextVerticalSlot(s.buildings,s.rings),top=layout(s).height;assert.ok(build(s,'farm',next).ok);assert.equal(layout(s).positions[next].y,top);}
 const l=layout(s);assert.equal(l.floors.length,20);assert.equal(new Set(l.floors.map(f=>f.y)).size,20);assert.equal(nextVerticalSlot(s.buildings,2),null);assert.deepEqual(l.footprint,before.footprint);
});
test('legacy saves migrate to a deterministic vertical order without losing buildings or economy',()=>{
 const s=rich('flesh');s.rings=2;s.buildings[19]={type:'cannon',level:2,remaining:4,facing:.7};s.buildings[2]={type:'foundry',level:3,remaining:0};delete s.towerOrder;
 const loaded=deserialize(serialize(s));assert.ok(loaded);assert.deepEqual(loaded.towerOrder,VERTICAL_SLOT_ORDER.filter(i=>s.buildings[i]));for(const key of ['buildings','resources','nodes','enemies','stats','rings','variant'])assert.deepEqual(loaded[key],s[key]);
});
test('nonsequential order and pending lower upgrades survive save/reload',()=>{
 const s=rich();for(const id of [3,1,0])build(s,'farm',id);advance(s,8);upgrade(s,11);advance(s,2);const resumed=deserialize(serialize(s));assert.deepEqual(resumed,s);assert.deepEqual(layout(resumed),layout(s));advance(resumed,6);assert.equal(resumed.buildings[11].level,2);assert.equal(layout(resumed).height,layout(s).height);
 for(const bad of [[7,7],[-1],['7'],[20],{}]){const corrupt={...s,towerOrder:bad};assert.equal(deserialize(serialize(corrupt)),null);}
});
test('crawler and airship additions retain horizontal deck layout and create no tower order',()=>{
 for(const faction of ['crawler','airship']){const s=createGame(faction),before=Array.from({length:20},(_,i)=>batteryPosition(faction,i,s.variant));assert.ok(build(s,'housing',0).ok);assert.ok(build(s,'farm',1).ok);advance(s,8);assert.equal(s.towerOrder,undefined);assert.deepEqual(Array.from({length:20},(_,i)=>batteryPosition(faction,i,s.variant)),before);assert.equal(before[0].y,before[19].y);assert.notEqual(before[0].x,before[19].x);}
});
