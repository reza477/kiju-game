import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, tick, travel, stopTravel, gatheringRate, income, build, upgrade, serialize, deserialize, startBattle} from '../src/simulation.js';
import {CARRIER_VARIANTS} from '../src/variants.js';
import {readTransfer, writeTransfer} from '../src/save-transfer.js';
import {resourceDestination, setResourceCourse, foodFlow, routeEstimate, districtOverview, createPlanningPanels} from '../src/expedition-planning.js';

test('resource courses arrive inside gathering range without moving nearby cities outward, for all six carriers', () => {
  for (const [variant, definition] of Object.entries(CARRIER_VARIANTS)) {
    const state = createGame(definition.faction, variant), node = state.nodes[0];
    const estimate = resourceDestination(state, node.id);
    assert.ok(estimate.travelSeconds > 0);
    assert.equal(setResourceCourse(state, node.id).ok, true);
    let elapsed = 0;
    while (state.target && elapsed < 30) { tick(state, .05); elapsed += .05; }
    assert.equal(state.target, null);
    assert.ok(Math.abs(elapsed - estimate.travelSeconds) < .1);
    assert.equal(state.gathering, node.id);
    const position = {x: state.x, z: state.z};
    assert.equal(setResourceCourse(state, node.id).nearby, true);
    tick(state, .1);
    assert.deepEqual({x: state.x, z: state.z}, position);
    assert.equal(resourceDestination(state, node.id).travelSeconds, 0);
    // At the exact centre, no divide-by-zero or outward travel is introduced.
    state.x = node.x; state.z = node.z;
    assert.equal(setResourceCourse(state, node.id).nearby, true);
    assert.equal(state.target, null);
  }
});

test('stale, depleted, unknown and battle resource orders cannot replace a live course', () => {
  const state = createGame();
  travel(state, 20, 30);
  const node = state.nodes[0];
  assert.equal(resourceDestination(state, node.id).canOrder, true);
  node.amount = 0;
  const saved = serialize(state);
  assert.equal(setResourceCourse(state, node.id).ok, false);
  assert.equal(setResourceCourse(state, 'missing').ok, false);
  assert.equal(serialize(state), saved);
  state.x = state.enemies[0].x; state.z = state.enemies[0].z;
  assert.ok(startBattle(state, state.enemies[0].id));
  const battle = serialize(state);
  assert.equal(setResourceCourse(state, state.nodes[1].id).ok, false);
  assert.equal(stopTravel(state), false);
  assert.equal(serialize(state), battle);
});

test('Stop course cancels only automatic expedition travel and survives save transfer', () => {
  let state = createGame('crawler');
  assert.equal(stopTravel(state), false);
  setResourceCourse(state, state.nodes[0].id); tick(state, .2);
  const position = {x: state.x, z: state.z};
  state.paused = true;
  assert.equal(stopTravel(state), true);
  assert.equal(state.target, null); assert.equal(state.moving, false);
  state = readTransfer(writeTransfer(state, 'planning-test'));
  tick(state, .2);
  assert.deepEqual({x: state.x, z: state.z}, position);
  assert.equal(routeEstimate(state), null);
  tick(state, .2, {x: 1, z: 0});
  assert.ok(state.x > position.x, 'Manual movement still works after stopping a course.');
});

test('rates use completed industry levels and keep existing benefits during upgrades', () => {
  const state = createGame('crawler'), node = state.nodes[0];
  state.x = node.x; state.z = node.z; state.resources.wood = state.resources.iron = 1000;
  assert.ok(build(state, 'sawmill', 0).ok);
  assert.equal(resourceDestination(state, node.id).rate, 2.5);
  let before = state.resources.wood; tick(state, .25);
  assert.equal(state.resources.wood - before, 2.5 * .25);
  for (let i = 0; i < 28; i++) tick(state, .25);
  assert.equal(gatheringRate(state, node), 5);
  assert.ok(upgrade(state, 0).ok);
  assert.equal(resourceDestination(state, node.id).rate, 5);
  const copy = deserialize(serialize(state));
  assert.equal(gatheringRate(copy, copy.nodes[0]), 5);
  for (let i = 0; i < 32; i++) tick(copy, .25);
  before = copy.resources.wood; tick(copy, .25);
  assert.equal(copy.resources.wood - before, 7.5 * .25);
});

test('same-tick field harvest prevents false starvation, but exhausted supplies still matter', () => {
  const state = createGame(), field = state.nodes.find(node => node.kind === 'food');
  state.buildings[13] = null; state.resources.food = 0;
  state.x = field.x; state.z = field.z;
  const population = state.population;
  tick(state, .25);
  assert.equal(state.starving, false);
  assert.ok(state.population > population);
  assert.ok(Math.abs(state.resources.food - (3.8 - population * .018) * .25) < 1e-10);
  assert.equal(state.gathering, field.id);
  assert.equal(foodFlow(state).collection, 3.8);
  assert.equal(foodFlow(state).rate, income(state).food + 3.8);
  field.amount = .01; state.resources.food = 0;
  const hungryPopulation = state.population;
  tick(state, .25);
  assert.equal(field.amount, 0);
  assert.equal(state.resources.food, 0);
  assert.equal(state.starving, true);
  assert.ok(state.population < hungryPopulation);
  assert.equal(foodFlow(state).collection, 0);
});

test('food HUD excludes paused, battle and moving gathering, with no economy mutation', () => {
  const state = createGame(), field = state.nodes.find(node => node.kind === 'food');
  state.x = field.x; state.z = field.z; tick(state, .1);
  const before = serialize(state);
  assert.ok(foodFlow(state).rate > income(state).food);
  assert.equal(serialize(state), before);
  state.paused = true;
  assert.equal(foodFlow(state).rate, 0); assert.equal(foodFlow(state).status, 'paused');
  state.paused = false; travel(state, field.x + 10, field.z);
  assert.equal(foodFlow(state).collection, 0);
  state.mode = 'battle';
  assert.equal(foodFlow(state).rate, 0); assert.equal(foodFlow(state).status, 'battle');
});

test('travel estimates use game seconds and freeze with the paused expedition', () => {
  const state = createGame('airship');
  setResourceCourse(state, state.nodes[1].id);
  const original = routeEstimate(state);
  state.speed = 2; tick(state, .25);
  assert.ok(Math.abs(routeEstimate(state).seconds - (original.seconds - .5)) < 1e-10);
  state.paused = true;
  const paused = routeEstimate(state); tick(state, .25);
  assert.deepEqual(routeEstimate(state), paused);
  assert.equal(paused.paused, true);
});

test('district overview preserves all six variants, saved order and unfinished upgrade levels', () => {
  for (const [variant, definition] of Object.entries(CARRIER_VARIANTS)) {
    const state = createGame(definition.faction, variant);
    state.resources.wood = state.resources.iron = 1000;
    assert.ok(build(state, 'sawmill', 0).ok);
    assert.ok(upgrade(state, 11).ok);
    const before = serialize(state), overview = districtOverview(state);
    assert.equal(serialize(state), before);
    assert.deepEqual(overview.map(row => row.slot), definition.faction === 'kaiju' ? [7, 11, 13, 0] : [0, 7, 11, 13]);
    assert.equal(overview.find(row => row.slot === 0).remaining, 7);
    assert.equal(overview.find(row => row.slot === 11).level, 1);
    assert.equal(overview.find(row => row.slot === 11).upgrading, true);
    assert.deepEqual(districtOverview(readTransfer(writeTransfer(state, 'overview-test'))), overview);
  }
});

function fakeDocument() {
  const doc = {activeElement: null};
  doc.createElement = tag => {
    const element = {tag, ownerDocument: doc, children: [], parentElement: null, textContent: '', dataset: {}, attrs: {}, handlers: {}, disabled: false,
      classList: {values: new Set(), toggle(name, active) { active ? this.values.add(name) : this.values.delete(name); }},
      append(...children) { for (const child of children) this.insertBefore(child, null); },
      insertBefore(child, before) { child.remove(); const index=before ? this.children.indexOf(before) : this.children.length; this.children.splice(index,0,child); child.parentElement=this; },
      remove() { if(this.parentElement){const list=this.parentElement.children;list.splice(list.indexOf(this),1);this.parentElement=null;} },
      replaceChildren(...children) { for(const child of [...this.children])child.remove(); this.append(...children); },
      addEventListener(name, fn) { this.handlers[name]=fn; }, setAttribute(name, value) { this.attrs[name]=value; }};
    return element;
  };
  return doc;
}

test('live rows and focused native options retain identity during updates and resolve current save state', () => {
  const document = fakeDocument(), destinations=document.createElement('div'), districts=document.createElement('div');
  const districtCount=document.createElement('span'), towerSelect=document.createElement('select');
  let state=createGame(), inspected=null;
  const panels=createPlanningPanels({destinations,districts,districtCount,towerSelect,
    onTravel:id=>setResourceCourse(state,id), onInspect:slot=>{inspected=slot;}});
  panels.update(state, null, 0);
  const button=destinations.children[0], district=districts.children[1], option=towerSelect.children[1];
  document.activeElement=towerSelect; towerSelect.value='1';
  state.buildings[11].remaining=7.4; state.buildings[11].upgrading=true;
  panels.update(state,11,0);
  assert.equal(destinations.children[0],button); assert.equal(districts.children[1],district);
  assert.equal(towerSelect.children[1],option); assert.equal(towerSelect.value,'1');
  assert.equal(district.attrs['aria-pressed'],'true');
  assert.match(option.textContent,/Upgrading 8s/);
  district.handlers.click(); assert.equal(inspected,11);
  // A reused row must act on the new expedition, never its original captured node.
  state=createGame('crawler'); state.nodes[0].amount=0;
  travel(state,55,60); const target={...state.target};
  button.handlers.click(); assert.deepEqual(state.target,target);
  panels.update(state,null);
  assert.equal(destinations.children[0],button); assert.equal(button.disabled,true);
  assert.match(button.attrs['aria-label'],/Depleted/);
  assert.equal(districts.children[0].dataset.districtSlot,'7');
});
