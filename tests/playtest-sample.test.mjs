import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameSample, formatFrameSample, SAMPLE_ACTIVE_LIMIT_MS, SAMPLE_INTERVAL_LIMIT} from '../src/playtest-sample.js';

const playing = {started: true, paused: false, hidden: false};
const paused = {...playing, paused: true};
const hidden = {...paused, hidden: true};

test('sampling is opt-in, stores no idle intervals, and reset releases the sample', () => {
  const sample = createFrameSample();
  for (let t = 0; t < 1000; t += 16) sample.frame(t, playing);
  assert.equal(sample.snapshot().count, 0); assert.equal(sample.active, false);
  sample.start(1000, playing); sample.frame(1000, playing); sample.frame(1016, playing);
  sample.stop(1020, playing);
  assert.equal(sample.snapshot().count, 1); assert.equal(sample.snapshot().activeMs, 16);
  sample.frame(5000, playing); assert.equal(sample.snapshot().count, 1);
  sample.reset(); assert.equal(sample.snapshot().status, 'idle'); assert.equal(sample.snapshot().count, 0);
  assert.equal(sample.snapshot().medianMs, null); assert.equal(sample.snapshot().metadata.start, null);
});

test('median, nearest-rank p95 and explicitly strict long thresholds use complete RAF intervals', () => {
  const sample = createFrameSample(); sample.start(0, playing); sample.frame(0, playing);
  let now = 0;
  for (const ms of [10, 10, 20, 30, 50, 51, 100, 101, 250, 251]) sample.frame(now += ms, playing);
  const result = sample.snapshot();
  assert.equal(result.medianMs, 50.5); assert.equal(result.p95Ms, 251); assert.equal(result.activeMs, 873);
  assert.deepEqual(result.longIntervals, {over50Ms: 5, over100Ms: 3, over250Ms: 1});
  const text = formatFrameSample(result);
  assert.match(text, /not GPU timings or native presented FPS/);
  assert.match(text, /not proof of sustained performance/);
  assert.match(text, />50 ms: 5; >100 ms: 3; >250 ms: 1/);
  assert.match(text, /No exact device model is inferred/);
});

test('hidden time with no callbacks is excluded and the next visible callback rebases', () => {
  const sample = createFrameSample(); sample.start(0, playing);
  sample.frame(0, playing); sample.frame(16, playing);
  sample.setEligibility(20, hidden);
  sample.setEligibility(10020, playing);
  sample.frame(10024, playing); sample.frame(10040, playing);
  const result = sample.snapshot();
  assert.equal(result.count, 2); assert.equal(result.activeMs, 32); assert.equal(result.p95Ms, 16);
  assert.deepEqual(result.exclusions.hidden, {episodes: 1, wallMs: 10000});
  assert.equal(result.exclusions.paused.wallMs, 0); assert.equal(result.exclusions.boundaryIntervalMs, 4);
  assert.equal(result.exclusions.rebasedCallbacks, 2);
});

test('menus and not-started gameplay pause without bridging intervals or changing the 120s budget', () => {
  const sample = createFrameSample(); sample.start(0, paused);
  sample.frame(1000, paused); sample.frame(2000, playing); sample.frame(2020, playing);
  sample.frame(2030, {started: false}); sample.frame(9030, {started: false});
  sample.frame(10030, playing); sample.frame(10050, playing);
  const result = sample.snapshot();
  assert.equal(result.activeMs, 40); assert.equal(result.count, 2); assert.equal(result.activeLimitMs, 120000);
  assert.deepEqual(result.exclusions.paused, {episodes: 1, wallMs: 2000});
  assert.deepEqual(result.exclusions.notStarted, {episodes: 1, wallMs: 8000});
  assert.equal(result.exclusions.boundaryIntervalMs, 10);
});

test('sample ends after at most 120 active seconds, excluding a whole over-limit interval', () => {
  const sample = createFrameSample(); sample.start(0, playing); sample.frame(0, playing);
  for (let t = 20; t < 120000; t += 20) sample.frame(t, playing);
  sample.frame(120015, playing);
  const result = sample.snapshot();
  assert.equal(result.status, 'complete'); assert.equal(result.activeMs, 119980); assert.equal(result.count, 5999);
  assert.equal(result.exclusions.limitBoundaryIntervals, 1); assert.equal(result.exclusions.limitBoundaryMs, 35);
  assert.equal(result.medianMs, 20); assert.equal(sample.active, false);
  sample.frame(120030, playing); assert.equal(sample.snapshot().count, 5999);
});

test('an exact 120-second sample completes, and unusually high callback rates stop at bounded capacity', () => {
  const exact = createFrameSample(); exact.start(0, playing); exact.frame(0, playing); exact.frame(SAMPLE_ACTIVE_LIMIT_MS, playing);
  assert.equal(exact.snapshot().status, 'complete'); assert.equal(exact.snapshot().activeMs, SAMPLE_ACTIVE_LIMIT_MS);
  const bounded = createFrameSample({intervalLimit: 3}); bounded.start(0, playing);
  for (let t = 0; t < 20; t++) bounded.frame(t, playing);
  assert.equal(bounded.snapshot().count, 3); assert.equal(bounded.snapshot().activeMs, 3);
  assert.equal(bounded.snapshot().stopReason, 'bounded interval capacity');
  assert.throws(() => createFrameSample({intervalLimit: SAMPLE_INTERVAL_LIMIT + 1}), RangeError);
  assert.throws(() => createFrameSample({activeLimitMs: SAMPLE_ACTIVE_LIMIT_MS + 1}), RangeError);
});

test('timestamps never create negative or duplicate intervals and are rebased after an invalid timestamp', () => {
  const sample = createFrameSample(); sample.start(100, playing); sample.frame(100, playing);
  sample.frame(116, playing); sample.frame(116, playing); sample.frame(110, playing);
  sample.frame(132, playing); sample.frame(148, playing); sample.frame(NaN, playing);
  const result = sample.snapshot();
  assert.equal(result.count, 2); assert.equal(result.activeMs, 32);
  assert.equal(result.exclusions.duplicateTimestamps, 1); assert.equal(result.exclusions.invalidTimestamps, 2);
  assert.throws(() => sample.start(NaN, playing), TypeError);
});

test('report retains sample metadata when current display changes and configuration history is bounded', () => {
  const sample = createFrameSample();
  const metadata = {build: 'test-build', quality: 'performance', viewport: {width: 390, height: 844}, renderBuffer: {width: 331, height: 717}, devicePixelRatio: 3, browserReportedUserAgent: 'Reported by browser', displayMode: 'standalone'};
  sample.start(0, playing, metadata); metadata.viewport.width = 999;
  sample.noteMetadata({...metadata, viewport: {width: 390, height: 844}});
  assert.equal(sample.snapshot().metadata.configurationChanges, 0);
  for (let i = 0; i < 30; i++) sample.noteMetadata({...metadata, quality: i % 2 ? 'high' : 'balanced', viewport: {width: 844, height: 390}});
  const result = sample.snapshot();
  assert.equal(result.metadata.start.viewport.width, 390); assert.equal(result.metadata.end.quality, 'high');
  assert.equal(result.metadata.configurationChanges, 30); assert.equal(result.metadata.configurations.length, 16);
  assert.equal(result.metadata.omittedConfigurations, 15);
  result.metadata.start.build = 'external mutation'; assert.equal(sample.snapshot().metadata.start.build, 'test-build');
  sample.stop(10, playing); sample.noteMetadata({build: 'other'}); assert.equal(sample.snapshot().metadata.end.build, 'test-build');
  assert.match(formatFrameSample(sample.snapshot()), /test-build/);
});
