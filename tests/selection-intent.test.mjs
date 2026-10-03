import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionIntent} from '../src/selection-intent.js';

test('ordinary empty-ground travel never opens a contextual panel', () => {
  assert.deepEqual(selectionIntent({ground: {x: 10, z: 20}}), {kind: 'travel', opensContext: false});
  assert.deepEqual(selectionIntent({}), {kind: 'ignore', opensContext: false});
  assert.deepEqual(selectionIntent(null), {kind: 'ignore', opensContext: false});
});
test('district, resource and rival selections open context with the existing precedence', () => {
  assert.deepEqual(selectionIntent({slot: 0, node: 'wood', enemy: 'rival', ground: {x: 1, z: 2}}), {kind: 'slot', opensContext: true});
  assert.deepEqual(selectionIntent({node: 'wood', enemy: 'rival', ground: {x: 1, z: 2}}), {kind: 'node', opensContext: true});
  assert.deepEqual(selectionIntent({enemy: 'rival', ground: {x: 1, z: 2}}), {kind: 'enemy', opensContext: true});
});
test('ground taps during placement retain placement guidance; cancellation restores ordinary travel', () => {
  const hit = {ground: {x: 1, z: 2}};
  assert.deepEqual(selectionIntent(hit, {placingBuilding: true}), {kind: 'placement-hint', opensContext: true});
  assert.deepEqual(selectionIntent(hit, {placingBuilding: false}), {kind: 'travel', opensContext: false});
  assert.equal(selectionIntent({slot: 0}, {placingBuilding: true}).kind, 'slot');
});
test('title, modal and battle selection guards apply before any contextual panel decision', () => {
  for (const guard of [{started: false}, {dialogOpen: true}, {mode: 'battle'}]) {
    for (const hit of [{slot: 0}, {node: 'wood'}, {enemy: 'rival'}, {ground: {x: 1, z: 2}}]) {
      assert.deepEqual(selectionIntent(hit, guard), {kind: 'ignore', opensContext: false});
    }
  }
});
