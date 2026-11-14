import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGovernor} from '../src/adaptive-quality.js';
import {initialGraphicsQuality} from '../src/camera-input.js';

// Feeds evenly spaced frames and returns the first level change, if any.
function run(governor, {from = 0, seconds, frameMs, level, options}) {
  let now = from, change = null;
  for (; now < from + seconds * 1000 && !change; now += frameMs) change = governor.frame(now, level, options);
  return {change, now};
}

test('a smooth device keeps High detail', () => {
  const governor = createDetailGovernor();
  assert.equal(run(governor, {seconds: 60, frameMs: 1000 / 60, level: 'high'}).change, null);
  assert.equal(run(governor, {from: 60000, seconds: 60, frameMs: 1000 / 45, level: 'high'}).change, null, '45 frames a second is playable');
});

test('a slow device steps down one level at a time and never below Performance', () => {
  const governor = createDetailGovernor();
  const first = run(governor, {seconds: 30, frameMs: 1000 / 25, level: 'high'});
  assert.equal(first.change, 'balanced');
  assert.ok(first.now >= 5000 && first.now < 7000, 'decides after the settle period and one window, not instantly: ' + first.now);
  const second = run(governor, {from: first.now, seconds: 30, frameMs: 1000 / 25, level: 'balanced'});
  assert.equal(second.change, 'performance');
  assert.equal(run(governor, {from: second.now, seconds: 30, frameMs: 1000 / 10, level: 'performance'}).change, null);
});

test('a level that is fast enough after stepping down is kept', () => {
  const governor = createDetailGovernor();
  const first = run(governor, {seconds: 30, frameMs: 1000 / 26, level: 'high'});
  assert.equal(first.change, 'balanced');
  assert.equal(run(governor, {from: first.now, seconds: 120, frameMs: 1000 / 44, level: 'balanced'}).change, null);
});

test('stalls, hidden tabs and the frames after a change are not counted', () => {
  const governor = createDetailGovernor();
  // Smooth play interrupted by a half-second hitch every second.
  let now = 0, change = null;
  for (let second = 0; second < 40 && !change; second++) {
    for (let i = 0; i < 30 && !change; i++, now += 1000 / 60) change = governor.frame(now, 'high');
    now += 500;
  }
  assert.equal(change, null, 'isolated stalls do not lower detail');
  const hidden = createDetailGovernor();
  assert.equal(run(hidden, {seconds: 30, frameMs: 1000 / 5, level: 'high', options: {hidden: true}}).change, null);
  const settling = createDetailGovernor();
  assert.equal(run(settling, {seconds: 2, frameMs: 1000 / 12, level: 'high'}).change, null, 'slow frames while a new scene compiles are ignored');
  settling.settle(2000);
  assert.equal(run(settling, {from: 2000, seconds: 2, frameMs: 1000 / 12, level: 'high'}).change, null, 'a new game gets the same grace');
});

test('the player choosing a level switches the governor off', () => {
  const governor = createDetailGovernor();
  governor.disable();
  assert.equal(governor.enabled, false);
  assert.equal(run(governor, {seconds: 30, frameMs: 1000 / 10, level: 'high'}).change, null);
});

test('starting detail prefers the player, then the last automatic level, then the device default', () => {
  assert.equal(initialGraphicsQuality('high', false, 'performance'), 'high');
  assert.equal(initialGraphicsQuality(null, false, 'balanced'), 'balanced');
  assert.equal(initialGraphicsQuality(null, true, 'balanced'), 'balanced');
  assert.equal(initialGraphicsQuality(null, false, 'nonsense'), 'high');
  assert.equal(initialGraphicsQuality(null, false), 'high');
  assert.equal(initialGraphicsQuality(null, true), 'performance');
});
