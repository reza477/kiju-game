import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, tick, build, expandRing, slotUnlocked, ringCost,
  serialize, deserialize, startBattle, setBatteryFacing,
  weaponStatus, fire, FACTIONS,
} from '../src/simulation.js';
import { RING_SLOTS, KAIJU_CENTER, KAIJU_SCALE, kaijuSlotPosition } from '../src/city-layout.js';
import { facingOf, batteryArc, batteryPosition, batterySolution } from '../src/weapon-layout.js';
import { terrainHeight, terrainNormal, protectedResource, RESOURCE_CENTRES } from '../src/terrain.js';
import { CinematicCamera } from '../src/cinematic-camera.js';

function advance(state, seconds) {
  const steps = Math.round(seconds * 4);
  for (let i = 0; i < steps; i++) tick(state, .25);
}

function enterBattle(state, target = { x: 0, z: 55 }) {
  state.x = state.enemies[0].x;
  state.z = state.enemies[0].z;
  assert.equal(startBattle(state, state.enemies[0].id), true);
  state.battle.player = { x: 0, z: 0, angle: 0 };
  state.battle.enemy = { ...target, angle: Math.PI };
  state.battle.enemyHp = state.battle.enemyMaxHp = 5000;
  state.battle.autoFire = false;
  return state;
}

function batteryBattle({ faction = 'crawler', slot = 17, level = 2, facing = 0, remaining = 0, target } = {}) {
  const state = createGame(faction);
  state.buildings[slot] = { type: 'cannon', level, remaining };
  assert.equal(setBatteryFacing(state, slot, facing).ok, true);
  return enterBattle(state, target);
}

function shoot(state) {
  const before = state.battle.enemyHp;
  assert.equal(fire(state), true);
  const event=state.battle.events.at(-1);assert.equal(state.battle.enemyHp,before);advance(state,.75);
  return { damage: before - state.battle.enemyHp, event };
}

test('cinematic offsets are bounded and decay without changing orbit state',()=>{const c=new CinematicCamera();for(let i=0;i<30;i++)c.impulse(5);assert.equal(c.pulses.length,6);let peak=0;for(let i=0;i<90;i++){const o=c.update({dt:1/60,time:i/60,battle:true});peak=Math.max(peak,Math.abs(o.right));assert.ok(Math.abs(o.right)<=.8&&Math.abs(o.up)<=.55&&o.fov<=1.1);assert.ok(Object.values(o).every(Number.isFinite));}assert.ok(peak>.1);assert.equal(c.pulses.length,0);assert.equal(c.output.fov,0);});
test('steady, paused and direct camera control suppress cinematic motion',()=>{const c=new CinematicCamera();c.transition('battle');c.impulse(1);assert.ok(Object.values(c.update({dt:.05,time:1,battle:true})).some(v=>v!==0));const age=c.pulses[0].age;assert.ok(Object.values(c.update({dt:.1,time:1,battle:true,paused:true})).every(v=>v===0));assert.equal(c.pulses[0].age,age);c.manual();c.impulse(1);assert.equal(c.pulses.length,0);assert.ok(Object.values(c.update({dt:.05,time:2,battle:true})).every(v=>v===0));c.setMode('steady');c.transition('battle');c.impulse(1);assert.ok(Object.values(c.update({dt:.1,time:10,battle:true,moving:true})).every(v=>v===0));});
test('close management cameras stay stable during cinematic transitions and effects',()=>{for(const view of ['city','people']){const c=new CinematicCamera();c.transition(view);c.impulse(1);const o=c.update({dt:.05,time:8,view,moving:true});assert.ok(Object.values(o).every(v=>v===0));}});
test('attack framing follows the impact clock and relinquishes the tactical view',()=>{
  const c=new CinematicCamera(),frame=(shotAge,extra={})=>({...c.update({dt:.05,time:shotAge,battle:true,shotAge,impactDelay:.7,...extra})});
  assert.equal(frame(0).focus,0);assert.ok(frame(.15).focus>0);
  const contact=frame(.7);assert.equal(contact.focus,.24);assert.ok(contact.dolly<0);
  assert.ok(frame(1.1).focus<contact.focus);assert.equal(frame(1.8).focus,0);
  assert.equal(frame(.7,{paused:true}).focus,0);assert.equal(frame(.7,{battle:false,view:'people'}).focus,0);
  c.manual();assert.equal(frame(.7).focus,0);c.setMode('steady');assert.equal(frame(.7).focus,0);
});

test('a new circular city starts with its central castle and six unlocked inner plots', () => {
  const state = createGame('kaiju');
  assert.equal(state.rings, 1);
  assert.deepEqual(state.buildings.flatMap((b, id) => b ? [id] : []), [7, 11, 13]);
  assert.deepEqual(Array.from({ length: 20 }, (_, id) => id).filter(id => slotUnlocked(state, id)), RING_SLOTS.slice(0, 2).flat().sort((a, b) => a - b));
  for (let id = 0; id < 20; id++) assert.equal(kaijuSlotPosition(id).y, 0);
  const before = { ...state.resources };
  assert.equal(build(state, 'housing', RING_SLOTS[2][0]).ok, false);
  assert.deepEqual(state.resources, before);
});

test('ring expansion pays once, requires twelve active seconds and opens thirteen new plots', () => {
  const state = createGame('kaiju'), initial = { ...state.resources };
  assert.equal(expandRing(state).ok, true);
  assert.equal(state.resources.wood, initial.wood - ringCost.wood);
  assert.equal(state.resources.iron, initial.iron - ringCost.iron);
  const paid = { ...state.resources };
  assert.equal(expandRing(state).ok, false);
  assert.deepEqual(state.resources, paid);
  advance(state, 11.75);
  assert.equal(state.rings, 1);
  assert.equal(slotUnlocked(state, 19), false);
  advance(state, .25);
  assert.equal(state.rings, 2);
  assert.equal(state.ringConstruction, null);
  assert.equal(state.stats.built, 1);
  assert.equal(Array.from({ length: 20 }, (_, id) => slotUnlocked(state, id)).every(Boolean), true);
  advance(state, 4);
  assert.equal(state.stats.built, 1);
  const complete = { ...state.resources };
  assert.equal(expandRing(state).ok, false);
  assert.deepEqual(state.resources, complete);
  assert.equal(build(state, 'housing', 19).ok, true);
});

test('paused ring work freezes and rejected expansion orders cannot spend resources', () => {
  const state = createGame('kaiju');
  assert.equal(expandRing(state).ok, true);
  advance(state, 3);
  state.paused = true;
  const paused = serialize(state);
  advance(state, 25);
  assert.equal(serialize(state), paused);
  state.paused = false;
  advance(state, 9);
  assert.equal(state.rings, 2);

  const unaffordable = createGame('kaiju'); unaffordable.resources.iron = ringCost.iron - 1;
  const blocked = [unaffordable, createGame('crawler'), createGame('airship'), enterBattle(createGame('kaiju'))];
  for (const candidate of blocked) {
    const before = serialize(candidate);
    assert.equal(expandRing(candidate).ok, false);
    assert.equal(serialize(candidate), before);
  }
});

test('pending ring construction survives a save and resumes only its remaining duration', () => {
  const state = createGame('kaiju');
  expandRing(state); advance(state, 5);
  const loaded = deserialize(serialize(state));
  assert.ok(loaded);
  assert.deepEqual(loaded.ringConstruction, { target: 2, remaining: 7 });
  assert.equal(loaded.rings, 1);
  assert.deepEqual(loaded.resources, state.resources);
  advance(loaded, 6.75);
  assert.equal(loaded.rings, 1);
  advance(loaded, .25);
  assert.equal(loaded.rings, 2);
  assert.equal(loaded.resources.wood, state.resources.wood);
  assert.equal(loaded.resources.iron, state.resources.iron);
});

test('legacy outer buildings unlock the required ring without moving IDs or charging resources', () => {
  const old = createGame('kaiju');
  delete old.rings; delete old.ringConstruction; delete old.worldDamage;
  old.buildings[4] = { type: 'foundry', level: 2, remaining: 0 };
  old.buildings[19] = { type: 'cannon', level: 3, remaining: 4 };
  const before = JSON.parse(JSON.stringify(old));
  const loaded = deserialize(JSON.stringify(old));
  assert.ok(loaded);
  assert.equal(loaded.rings, 2);
  assert.deepEqual(loaded.buildings, before.buildings);
  assert.deepEqual(loaded.resources, before.resources);
  assert.deepEqual(loaded.stats, before.stats);
  assert.equal(slotUnlocked(loaded, 19), true);
  assert.equal(loaded.ringConstruction, null);
  assert.deepEqual(loaded.worldDamage, { expedition: [], battle: [] });
});

test('corrupt ring, facing and destruction records are rejected instead of granting progression', () => {
  const invalid = [
    s => { s.rings = 3; }, s => { s.rings = -.1; }, s => { s.rings = '2'; },
    s => { s.ringConstruction = { remaining: -1, target: 2 }; },
    s => { s.ringConstruction = { remaining: 13, target: 2 }; },
    s => { s.ringConstruction = { remaining: 5, target: 1 }; },
    s => { s.rings = 2; s.ringConstruction = { remaining: 5, target: 2 }; },
    s => { s.faction = 'crawler'; s.rings = 2; s.ringConstruction = { remaining: 5, target: 2 }; },
    s => { s.buildings[0] = { type: 'cannon', level: 1, remaining: 0, facing: 'north' }; },
    s => { s.worldDamage.expedition = [17]; },
    s => { s.worldDamage.battle = Array(513).fill('fallen-tree'); },
  ];
  const accepted = invalid.flatMap((mutate, index) => {
    const state = createGame('kaiju'); mutate(state);
    return deserialize(serialize(state)) === null ? [] : [index];
  });
  assert.deepEqual(accepted, [], 'Corrupt save records must all be rejected');
});

test('changing a broadside battery direction changes real damage and the firing mount event', () => {
  const forward = batteryBattle({ facing: 0, target: { x: 50, z: 0 } });
  const starboard = batteryBattle({ facing: Math.PI / 2, target: { x: 50, z: 0 } });
  assert.equal(weaponStatus(forward).active, 0);
  assert.equal(weaponStatus(starboard).active, 1);
  const a = shoot(forward), b = shoot(starboard);
  assert.equal(a.damage, FACTIONS.crawler.damage);
  assert.equal(b.damage - a.damage, 18);
  assert.deepEqual(a.event.mounts, []);
  assert.deepEqual(b.event.mounts, [17]);
  assert.equal(b.event.source, 'player');
});

test('only completed batteries contribute their actual level bonus', () => {
  for (const level of [1, 2, 3]) {
    const state = batteryBattle({ level });
    assert.equal(shoot(state).damage, FACTIONS.crawler.damage + 9 * level);
  }
  const unfinished = batteryBattle({ level: 3, remaining: 1 });
  assert.equal(weaponStatus(unfinished).active, 0);
  const result = shoot(unfinished);
  assert.equal(result.damage, FACTIONS.crawler.damage);
  assert.deepEqual(result.event.mounts, []);
});

test('mounted range can fire a battery alone beyond base-gun range', () => {
  const state = batteryBattle({ slot: 17, level: 2, target: { x: 0, z: 75 } });
  const status = weaponStatus(state);
  assert.equal(status.baseInRange, false);
  assert.equal(status.batteries[0].inRange, true);
  assert.equal(status.canFire, true);
  const result = shoot(state);
  assert.equal(result.damage, 18);
  assert.deepEqual(result.event.mounts, [17]);
  assert.equal(result.event.base, false);
});

test('a rear mount outside its own range adds no damage even while base guns reach', () => {
  // The left rear mount has a clear route that misses the central citadel.
  const state = batteryBattle({ slot: 0, level: 3, target: { x: -6.1, z: 70 } });
  const status = weaponStatus(state);
  assert.equal(status.baseInRange, true);
  assert.equal(status.batteries[0].blocker, null);
  assert.equal(status.batteries[0].inRange, false);
  const result = shoot(state);
  assert.equal(result.damage, FACTIONS.crawler.damage);
  assert.deepEqual(result.event.mounts, []);
  assert.equal(result.event.base, true);
});

test('kaiju mount coordinates preserve the scaled backpack offset through city rotation', () => {
  const state = createGame('kaiju'), slot = 11;
  state.buildings[slot] = { type: 'cannon', level: 1, remaining: 0, facing: Math.PI };
  const local = batteryPosition('kaiju', slot), plot = kaijuSlotPosition(slot);
  assert.ok(Math.abs(local.z - (KAIJU_CENTER.z - 4.6) * KAIJU_SCALE) < 1e-10);
  const attacker = { x: 100, z: -20, angle: Math.PI / 2 };
  const solution = batterySolution(state, slot, attacker, { x: 65, z: -20 }, FACTIONS.kaiju.range);
  assert.ok(Math.abs(solution.position.x - (100 + plot.z * KAIJU_SCALE)) < 1e-10);
  assert.ok(Math.abs(solution.position.z + 20) < 1e-10);
  assert.equal(solution.active, true);
});

test('airship missile batteries cover a wider firing arc than ground and kaiju cannons', () => {
  assert.ok(Math.abs(batteryArc('crawler') * 180 / Math.PI - 150) < 1e-10);
  assert.ok(Math.abs(batteryArc('airship') * 180 / Math.PI - 240) < 1e-10);
  for (const faction of ['crawler', 'airship']) {
    const state = createGame(faction), slot = 17;
    state.buildings[slot] = { type: 'cannon', level: 1, remaining: 0, facing: 0 };
    const p = batteryPosition(faction, slot), angle = 110 * Math.PI / 180;
    const target = { x: p.x + Math.sin(angle) * 40, z: p.z + Math.cos(angle) * 40 };
    const result = batterySolution(state, slot, { x: 0, z: 0, angle: 0 }, target, FACTIONS[faction].range);
    assert.equal(result.inArc, faction === 'airship');
  }
});

test('solid city buildings block gun batteries; lofted missiles clear the same obstruction', () => {
  for (const type of ['housing', 'keep', 'foundry', 'sawmill']) {
    const state = batteryBattle({ slot: type === 'keep' ? 2 : 12 });
    const blocker = type === 'keep' ? 7 : 17;
    if (type !== 'keep') state.buildings[blocker] = { type, level: 1, remaining: 0 };
    const status = weaponStatus(state);
    assert.equal(status.batteries[0].blocker, blocker, `${type} should obstruct the gun line`);
    assert.equal(status.active, 0);
    assert.deepEqual(shoot(state).event.mounts, []);
  }
  const aircraft = batteryBattle({ faction: 'airship', slot: 12 });
  aircraft.buildings[17] = { type: 'housing', level: 3, remaining: 0 };
  assert.equal(weaponStatus(aircraft).batteries[0].blocker, null);
  assert.equal(shoot(aircraft).damage, FACTIONS.airship.damage + 18);
});

test('close combat uses the faction melee weapon and never adds battery gun damage', () => {
  for (const faction of ['kaiju', 'crawler', 'airship']) {
    const state = batteryBattle({ faction, level: 3, target: { x: 0, z: 10 } });
    const result = shoot(state);
    assert.equal(result.damage, FACTIONS[faction].melee);
    assert.equal(result.event.kind, 'impact');
    assert.deepEqual(result.event.mounts, []);
  }
});

test('a narrow humanoid must be closer than a broad hull before a kaiju can punch it', () => {
  const narrow=batteryBattle({faction:'kaiju',target:{x:0,z:17}});narrow.battle.enemyFaction='kaiju';
  assert.equal(shoot(narrow).event.kind,'shot');
  const broad=batteryBattle({faction:'kaiju',target:{x:0,z:17}});broad.battle.enemyFaction='crawler';
  assert.equal(shoot(broad).event.kind,'impact');
  const close=batteryBattle({faction:'kaiju',target:{x:0,z:11}});close.battle.enemyFaction='kaiju';
  assert.equal(shoot(close).event.kind,'impact');
});

test('battery facing survives saves, wraps angles, and cannot be edited during battle', () => {
  const state = createGame('kaiju');
  assert.equal(build(state, 'cannon', 0).ok, true);
  assert.equal(setBatteryFacing(state, 0, Math.PI * 4 + .7).ok, true);
  const facing = facingOf(state.faction, 0, state.buildings[0]);
  assert.ok(Math.abs(facing - .7) < 1e-10);
  const loaded = deserialize(serialize(state));
  assert.ok(loaded);
  assert.equal(facingOf('kaiju', 0, loaded.buildings[0]), facing);
  assert.equal(setBatteryFacing(loaded, 0, NaN).ok, false);
  assert.equal(setBatteryFacing(loaded, 7, 0).ok, false);
  enterBattle(loaded);
  assert.equal(setBatteryFacing(loaded, 0, -1).ok, false);
  assert.equal(loaded.buildings[0].facing, facing);
});

test('battle saves require valid headings for mounted firing solutions', () => {
  const accepted = [];
  for (const side of ['player', 'enemy']) for (const value of [undefined, 'east', null]) {
    const state = batteryBattle();
    state.battle[side].angle = value;
    if (deserialize(serialize(state)) !== null) accepted.push({ side, value: String(value) });
  }
  assert.deepEqual(accepted, [], 'Corrupt battle headings must all be rejected');
});

test('playable terrain has real relief, finite unit normals and level resource sites', () => {
  const heights = [];
  for (let x = -160; x <= 160; x += 40) for (let z = -160; z <= 160; z += 40) {
    const height = terrainHeight(x, z), normal = terrainNormal(x, z);
    assert.ok(Number.isFinite(height));
    assert.ok(Object.values(normal).every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(normal.x, normal.y, normal.z) - 1) < 1e-10);
    assert.ok(normal.y > 0);
    heights.push(height);
  }
  assert.ok(Math.max(...heights) - Math.min(...heights) > 18, 'Travel should cross visibly distinct hills inside playable bounds');
  for (const [x, z] of RESOURCE_CENTRES) {
    const level = terrainHeight(x, z);
    for (const dx of [-10, 0, 10]) for (const dz of [-10, 0, 10]) assert.ok(Math.abs(terrainHeight(x + dx, z + dz) - level) < 1e-10, 'Resource buildings need a level local clearing');
  }
});

test('resource protection follows the full clearing and honors requested margins', () => {
  for (const [x, z] of RESOURCE_CENTRES) {
    assert.equal(protectedResource(x, z), true);
    assert.equal(protectedResource(x + 26, z), true);
    assert.equal(protectedResource(x + 27, z), false);
    assert.equal(protectedResource(x + 30, z, 5), true);
    assert.equal(protectedResource(x + 22, z, -5), false);
  }
  assert.equal(protectedResource(0, 0), false);
});
