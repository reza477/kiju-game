import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGovernor,readTooSlow} from '../src/adaptive-quality.js';
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

test('a device that runs a lower level at full rate is raised again, one level at a time', () => {
  const governor = createDetailGovernor();
  const first = run(governor, {seconds: 60, frameMs: 1000 / 60, level: 'performance'});
  assert.equal(first.change, 'balanced');
  assert.ok(first.now >= 12000 && first.now < 14000, 'after the settle period and ten seconds at full rate: ' + first.now);
  const second = run(governor, {from: first.now, seconds: 60, frameMs: 1000 / 60, level: 'balanced'});
  assert.equal(second.change, 'high');
  assert.equal(run(governor, {from: second.now, seconds: 120, frameMs: 1000 / 60, level: 'high'}).change, null);
});

test('a level below full rate is not raised', () => {
  const governor = createDetailGovernor();
  assert.equal(run(governor, {seconds: 120, frameMs: 1000 / 50, level: 'performance'}).change, null, '50 frames a second leaves no proven headroom');
  assert.equal(run(governor, {from: 120000, seconds: 120, frameMs: 1000 / 39, level: 'balanced'}).change, null);
});

test('a raised level is kept only while it holds about 45 frames a second, and is not tried again', () => {
  const governor = createDetailGovernor();
  const raised = run(governor, {seconds: 60, frameMs: 1000 / 60, level: 'balanced'});
  assert.equal(raised.change, 'high');
  // 40 frames a second would be kept on a device that started on High. Here Balanced ran at 60.
  const back = run(governor, {from: raised.now, seconds: 30, frameMs: 1000 / 40, level: 'high'});
  assert.equal(back.change, 'balanced');
  assert.equal(run(governor, {from: back.now, seconds: 300, frameMs: 1000 / 60, level: 'balanced'}).change, null, 'High was too slow; it is not tried again');
  assert.deepEqual(Object.keys(governor.tooSlow()), ['high']);
  const kept = createDetailGovernor(), up = run(kept, {seconds: 60, frameMs: 1000 / 60, level: 'balanced'});
  assert.equal(up.change, 'high');
  assert.equal(run(kept, {from: up.now, seconds: 120, frameMs: 1000 / 50, level: 'high'}).change, null, '50 frames a second on the raised level is kept');
});

test('a level that was too slow is left alone for a day, then tried again', () => {
  const day = 86400000;let wall = 10 * day;
  const recent = createDetailGovernor({tooSlow: {high: wall - 3600000}, wallClock: () => wall});
  assert.equal(run(recent, {seconds: 120, frameMs: 1000 / 60, level: 'balanced'}).change, null, 'an hour later High is not tried');
  wall += day;
  const later = createDetailGovernor({tooSlow: {high: wall - day - 3600000}, wallClock: () => wall});
  assert.equal(run(later, {seconds: 60, frameMs: 1000 / 60, level: 'balanced'}).change, 'high', 'a day later it is');
  const stepped = createDetailGovernor({wallClock: () => wall});
  assert.equal(run(stepped, {seconds: 30, frameMs: 1000 / 20, level: 'high'}).change, 'balanced');
  assert.deepEqual(stepped.tooSlow(), {high: wall}, 'stepping down records when');
});

test('a device is never raised above its own starting level', () => {
  const phone = createDetailGovernor({ceiling: 'performance'});
  assert.equal(run(phone, {seconds: 300, frameMs: 1000 / 60, level: 'performance'}).change, null);
  const middle = createDetailGovernor({ceiling: 'balanced'});
  assert.equal(run(middle, {seconds: 60, frameMs: 1000 / 60, level: 'performance'}).change, 'balanced');
  assert.equal(run(middle, {from: 60000, seconds: 300, frameMs: 1000 / 60, level: 'balanced'}).change, null);
});

test('the stored record of slow levels survives nonsense', () => {
  assert.deepEqual(readTooSlow('{"high":1700000000000,"balanced":"soon","retro":5}'), {high: 1700000000000});
  assert.deepEqual(readTooSlow('not json'), {});assert.deepEqual(readTooSlow(null), {});assert.deepEqual(readTooSlow('null'), {});
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
