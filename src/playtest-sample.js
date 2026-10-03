// This measures browser callback scheduling only. It never advances game time.
export const SAMPLE_ACTIVE_LIMIT_MS = 120000;
export const SAMPLE_INTERVAL_LIMIT = 36000;
export const LONG_INTERVAL_THRESHOLDS_MS = Object.freeze([50, 100, 250]);
const REASONS = ['hidden', 'paused', 'notStarted'];
const reasonFor = ({hidden = false, started = true, paused = false} = {}) => hidden ? 'hidden' : !started ? 'notStarted' : paused ? 'paused' : null;
const copy = value => value == null ? null : JSON.parse(JSON.stringify(value));

export function createFrameSample({activeLimitMs = SAMPLE_ACTIVE_LIMIT_MS, intervalLimit = SAMPLE_INTERVAL_LIMIT} = {}) {
  if (!(activeLimitMs > 0 && activeLimitMs <= SAMPLE_ACTIVE_LIMIT_MS) || !Number.isInteger(intervalLimit) || intervalLimit < 1 || intervalLimit > SAMPLE_INTERVAL_LIMIT) throw new RangeError('Invalid bounded sample limits.');
  let values = null, count, activeMs, status, stopReason, startTime, eventTime, lastFrame, pauseReason, exclusions, longIntervals;
  let startMetadata, endMetadata, configurations, configurationChanges, omittedConfigurations, lastMetadataKey;
  function reset() {
    values = null; count = activeMs = 0; status = 'idle'; stopReason = null;
    startTime = eventTime = lastFrame = null; pauseReason = null;
    exclusions = Object.fromEntries(REASONS.map(reason => [reason, {episodes: 0, wallMs: 0}]));
    Object.assign(exclusions, {rebasedCallbacks: 0, boundaryIntervals: 0, boundaryIntervalMs: 0, invalidTimestamps: 0, duplicateTimestamps: 0, limitBoundaryIntervals: 0, limitBoundaryMs: 0});
    longIntervals = Object.fromEntries(LONG_INTERVAL_THRESHOLDS_MS.map(ms => [`over${ms}Ms`, 0]));
    startMetadata = endMetadata = null; configurations = []; configurationChanges = omittedConfigurations = 0; lastMetadataKey = null;
  }
  reset();
  function noteMetadata(metadata) {
    if (status !== 'running' || metadata == null) return;
    const key = JSON.stringify(metadata);
    if (key === lastMetadataKey) return;
    const safe = copy(metadata);
    if (!startMetadata) startMetadata = safe;
    else configurationChanges++;
    endMetadata = safe; lastMetadataKey = key;
    if (configurations.length < 16) configurations.push({afterSampledActiveMs: activeMs, ...safe});
    else omittedConfigurations++;
  }
  function start(now, eligibility = {}, metadata = null) {
    if (!Number.isFinite(now)) throw new TypeError('A finite monotonic timestamp is required.');
    reset(); values = new Float64Array(intervalLimit); status = 'running'; startTime = eventTime = now;
    pauseReason = reasonFor(eligibility);
    if (pauseReason) exclusions[pauseReason].episodes++;
    noteMetadata(metadata);
  }
  function transition(now, eligibility) {
    if (status !== 'running') return false;
    if (!Number.isFinite(now) || now < eventTime) { exclusions.invalidTimestamps++; lastFrame = null; return false; }
    if (pauseReason) exclusions[pauseReason].wallMs += now - eventTime;
    eventTime = now;
    const next = reasonFor(eligibility);
    if (next !== pauseReason) {
      if (lastFrame !== null && now > lastFrame) { exclusions.boundaryIntervals++; exclusions.boundaryIntervalMs += now - lastFrame; }
      lastFrame = null; pauseReason = next;
      if (next) exclusions[next].episodes++;
    }
    return true;
  }
  function finish(reason) { status = 'complete'; stopReason = reason; lastFrame = null; }
  function frame(now, eligibility = {}) {
    if (!transition(now, eligibility) || pauseReason) return;
    if (lastFrame === null) { lastFrame = now; exclusions.rebasedCallbacks++; return; }
    const interval = now - lastFrame; lastFrame = now;
    if (interval === 0) { exclusions.duplicateTimestamps++; return; }
    // Keep complete intervals only: never truncate a stall into an invented short interval.
    if (activeMs + interval > activeLimitMs) {
      exclusions.limitBoundaryIntervals++; exclusions.limitBoundaryMs += interval; finish('120-second active-play limit'); return;
    }
    values[count++] = interval; activeMs += interval;
    for (const threshold of LONG_INTERVAL_THRESHOLDS_MS) if (interval > threshold) longIntervals[`over${threshold}Ms`]++;
    if (activeMs >= activeLimitMs) finish('120-second active-play limit');
    else if (count >= intervalLimit) finish('bounded interval capacity');
  }
  function stop(now, eligibility = {}) {
    if (!transition(now, eligibility)) return;
    if (lastFrame !== null && now > lastFrame) { exclusions.boundaryIntervals++; exclusions.boundaryIntervalMs += now - lastFrame; }
    lastFrame = null; status = 'stopped'; stopReason = 'explicit stop';
  }
  const progress = () => ({status, pauseReason, count, activeMs, stopReason});
  function snapshot() {
    const sorted = count ? values.slice(0, count).sort() : null;
    const medianMs = sorted ? count % 2 ? sorted[(count - 1) / 2] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : null;
    const p95Ms = sorted ? sorted[Math.ceil(count * .95) - 1] : null;
    return {...progress(), metric: 'Browser requestAnimationFrame scheduling intervals; not GPU timings or native presented FPS.',
      activeLimitMs, intervalLimit, elapsedObservedWallMs: eventTime === null ? 0 : eventTime - startTime,
      medianMs, p95Ms, percentileMethod: 'Median of complete intervals; p95 is nearest rank (ceil(0.95 × count)).',
      longIntervals: {...longIntervals}, exclusions: copy(exclusions),
      metadata: {start: copy(startMetadata), end: copy(endMetadata), configurationChanges, configurations: copy(configurations), omittedConfigurations}};
  }
  return {start, frame, stop, reset, setEligibility: transition, noteMetadata, progress, snapshot, get active() { return status === 'running'; }};
}

export function formatFrameSample(sample) {
  const number = value => value === null ? 'not sampled' : `${value.toFixed(2)} ms`;
  const excluded = REASONS.map(reason => `${reason}: ${sample.exclusions[reason].wallMs.toFixed(0)} ms / ${sample.exclusions[reason].episodes} episode(s)`).join('; ');
  return `Frame-scheduling sample: ${sample.status}${sample.stopReason ? ` (${sample.stopReason})` : ''}\n` +
    `Accepted active-play duration: ${(sample.activeMs / 1000).toFixed(3)} s; ${sample.count} complete RAF intervals (maximum 120 s / ${sample.intervalLimit} intervals).\n` +
    `Median RAF interval: ${number(sample.medianMs)}; p95 RAF interval: ${number(sample.p95Ms)}.\n` +
    `Long intervals (strictly greater than threshold): >50 ms: ${sample.longIntervals.over50Ms}; >100 ms: ${sample.longIntervals.over100Ms}; >250 ms: ${sample.longIntervals.over250Ms}.\n` +
    `Excluded observed time: ${excluded}. Hidden takes priority over not-started, then paused.\n` +
    `Rebased callbacks: ${sample.exclusions.rebasedCallbacks}; pause/stop boundary intervals: ${sample.exclusions.boundaryIntervals} (${sample.exclusions.boundaryIntervalMs.toFixed(2)} ms); limit boundary intervals: ${sample.exclusions.limitBoundaryIntervals} (${sample.exclusions.limitBoundaryMs.toFixed(2)} ms); invalid/duplicate timestamps: ${sample.exclusions.invalidTimestamps}/${sample.exclusions.duplicateTimestamps}.\n` +
    `Observed wall duration: ${(sample.elapsedObservedWallMs / 1000).toFixed(3)} s. Excluded times are observed state-boundary durations; no interval is bridged across a pause/resume.\n` +
    `${sample.percentileMethod}\n` +
    `Sample configuration: ${JSON.stringify(sample.metadata)}\n` +
    `${sample.metric} This short opt-in sample is not proof of sustained performance. No exact device model is inferred. Reset before each preset comparison.`;
}
