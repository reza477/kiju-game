import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,build,upgrade,serialize,deserialize} from '../src/simulation.js';
import {createVerticalLayout,VERTICAL_SLOT_ORDER} from '../src/vertical-city.js';
import {verticalCastleDescriptors} from '../src/vertical-castle.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('cyborg castle is exactly half-height with unchanged footprint and every district retained',()=>{
 for(const count of[3,7,20])for(const level of[1,3]){
  const buildings=Array(20).fill(null);
  for(const [i,id]of VERTICAL_SLOT_ORDER.slice(0,count).entries())buildings[id]={type:['keep','housing','farm','cannon','foundry','sawmill'][i%6],level,remaining:0};
  const full=createVerticalLayout(buildings,[],'flesh'),compact=createVerticalLayout(buildings,[],'cyborg');
  assert.deepEqual(compact.order,full.order);assert.deepEqual(compact.footprint,full.footprint);near(compact.height,full.height/2);near(compact.towerTop-34,(full.towerTop-34)/2);
  assert.notEqual(compact.signature,full.signature,'Geometry caches must distinguish the two castle profiles');
  for(const [i,f]of compact.floors.entries()){near(f.y,full.floors[i].y/2);near(f.height,full.floors[i].height/2);assert.deepEqual(f.path,full.floors[i].path);near(f.surfaceOffset,full.floors[i].surfaceOffset/2);}
  const a=verticalCastleDescriptors(full),b=verticalCastleDescriptors(compact);assert.equal(a.length,b.length);
  for(let i=0;i<a.length;i++){assert.equal(a[i].id,b[i].id);assert.deepEqual(a[i].faces,b[i].faces);for(let j=0;j<a[i].vertices.length;j++){near(a[i].vertices[j][0],b[i].vertices[j][0]);near(a[i].vertices[j][2],b[i].vertices[j][2]);near(34+(a[i].vertices[j][1]-34)/2,b[i].vertices[j][1]);}}
 }
});

test('compact profile preserves saved progress and still adds and upgrades upward',()=>{
 const s=createGame('kaiju','cyborg');s.resources={wood:900,iron:900,food:900};
 const layout=()=>createVerticalLayout(s.buildings,s.towerOrder,s.variant),initial=layout();
 assert.ok(build(s,'housing',0).ok);near(layout().positions[0].y,initial.height);
 const before=layout();assert.ok(upgrade(s,7).ok);near(layout().positions[0].y,before.positions[0].y+.4);
 const saved=serialize(s),restored=deserialize(saved);assert.deepEqual(restored,s);
 assert.deepEqual(createVerticalLayout(restored.buildings,restored.towerOrder,restored.variant),layout());
 assert.equal(serialize(restored),saved,'The size profile is derived, not a destructive save migration');
 const legacy={...s};delete legacy.towerOrder;assert.ok(deserialize(serialize(legacy)));
});
