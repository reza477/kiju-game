import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const SYSTEMS_BASELINE='6c7ee9b2ec3bb44aaefbc2ec3ea9bd86e9d60f5c';
export const BEAST_VARIANTS=[['kaiju','flesh'],['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']];
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// The same deterministic actions are run against committed baseline modules
// and current modules. Hash complete saves, including logs, pending hits and IDs.
export function systemsTrace(sim,faction,variant){
 const state=sim.createGame(faction,variant),stream=createHash('sha256'),saves=[],events=[],seen=new Set();let samples=0;
 const record=label=>{const raw=sim.serialize(state),restored=sim.deserialize(raw);assert.ok(restored,label+' restores');assert.equal(sim.serialize(restored),raw,label+' exact round trip');stream.update(label+'\n'+raw+'\n');samples++;return raw;};
 const checkpoint=label=>{saves.push({label,sha256:digest(record(label))});};
 const advance=(seconds,label)=>{for(let i=0;i<seconds*4;i++){sim.tick(state,.25);record(label+':'+i);}};
 checkpoint('initial');state.resources={wood:9000,iron:9000,food:9000};
 assert.ok(sim.build(state,'cannon',0).ok);assert.ok(sim.build(state,'foundry',3).ok);advance(3,'partial-build');checkpoint('building-save');advance(7,'complete-build');
 assert.ok(sim.upgrade(state,11).ok);advance(3,'partial-upgrade');checkpoint('upgrading-save');advance(5,'complete-upgrade');
 if(faction==='kaiju'){assert.ok(sim.expandRing(state).ok);advance(5,'partial-harness');checkpoint('harness-save');advance(7,'complete-harness');}
 for(const slot of [6,4,9,2,18,1,19,5,12,16,3,8,10,14,15,17])if(!state.buildings[slot])assert.ok(sim.build(state,slot%4===0?'cannon':slot%3===0?'housing':'farm',slot).ok);
 advance(10,'full-city');assert.equal(state.buildings.filter(Boolean).length,20);assert.ok(sim.setBatteryFacing(state,0,Math.PI*.63).ok);checkpoint('twenty-districts');
 sim.travel(state,state.x+2,state.z+3);
 for(let i=0;i<90;i++){sim.tick(state,1/60,i<25?{x:1,z:.25}:{x:0,z:0});record('travel:'+i);}
 checkpoint('travel-save');state.paused=true;const paused=sim.serialize(state);sim.tick(state,.25,{x:1,z:1});assert.equal(sim.serialize(state),paused);state.paused=false;
 const rival=state.enemies[0];rival.x=state.x+10;rival.z=state.z;assert.ok(sim.startBattle(state,rival.id));
 state.battle.player={x:-20,z:0,angle:Math.PI/2};state.battle.enemy={x:20,z:0,angle:-Math.PI/2};state.battle.autoFire=false;sim.fire(state);
 for(let i=0;i<600;i++){
  if(i===90)sim.ability(state);if(i===220)sim.fire(state);if(i===400&&state.battle)state.battle.command='retreat';
  sim.tick(state,1/60,i>=300&&i<340?{x:.3,z:1}:{x:0,z:0});
  for(const event of state.battle?.events??[])if(!seen.has(event.id)){seen.add(event.id);assert.ok(Math.abs(event.impactAt-event.time-sim.attackDelay(event.kind))<1e-12);events.push(structuredClone(event));}
  if([15,93,450].includes(i))checkpoint('battle-save:'+i);record('battle:'+i);
 }
 assert.ok(events.length>0,'Trace must exercise real combat events');checkpoint('final');
 return{faction,variant,sha256:stream.digest('hex'),samples,saves,eventsSha256:digest(events),eventCount:events.length,finalMode:state.mode,finalBuildingIds:state.buildings.flatMap((b,i)=>b?[i]:[]),finalOrder:state.towerOrder??null};
}

export function layoutTrace(saddle,vertical,variants){
 const cases=[];
 for(const count of [3,7,20])for(const level of [1,3]){
  const buildings=Array(20).fill(null),order=vertical.VERTICAL_SLOT_ORDER.slice(0,count);
  for(const [i,id]of order.entries())buildings[id]={type:['keep','housing','farm','cannon','foundry','sawmill'][i%6],level,remaining:0};
  cases.push({count,level,saddle:saddle.createSaddleLayout(buildings,order),cyborg:vertical.createVerticalLayout(buildings,order,'cyborg')});
 }
 return{sha256:digest({cases,mounts:saddle.SADDLE_MOUNTS,identities:variants.CARRIER_VARIANTS,footprints:BEAST_VARIANTS.map(([f,v])=>[f,v,variants.variantFootprint(f,v)])}),cases:cases.length};
}
