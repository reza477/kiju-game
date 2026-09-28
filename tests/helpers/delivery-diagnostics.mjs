// Serialized into the isolated browser before the game. Only observes the
// loopback release check; native promise identity, bodies and clocks are kept.
export function installDeliveryDiagnostics() {
  const events = [], statuses = [], longTasks = [], frames = [];
  const responses = new WeakMap();
  let sequence = 0, priorFrame = null, priorStatus = null;
  const now = () => Math.round(performance.now() * 1000) / 1000;
  const push = (items, value, limit) => {if (items.length < limit) items.push(value);};
  const record = (event, fields = {}) => push(events, {at: now(), event, ...fields}, 128);
  const localPath = (value, expected) => {
    try {const url = new URL(typeof value === 'string' || value instanceof URL ? value : value.url, location.href); return url.origin === location.origin && url.pathname === expected;}
    catch {return false;}
  };
  const errorName = error => typeof error?.name === 'string' ? error.name.slice(0, 80) : 'Error';
  const watch = (promise, resolved, rejected) => {void promise.then(resolved, rejected); return promise;};
  const cleanMessage = value => String(value || '').replace(/https?:\/\/\S+/g, '[url]').replace(/\?\S*/g, '[query]').slice(0, 240);
  const recordStatus = status => {
    const value = {state: status.state, message: cleanMessage(status.message), installedBuildId: status.installedBuildId,
      updateBuildId: status.updateBuildId, canPlayOffline: status.canPlayOffline, canApplyUpdate: status.canApplyUpdate, needsReopen: status.needsReopen};
    const identity = JSON.stringify(value);
    if (identity !== priorStatus) {priorStatus = identity; push(statuses, {at: now(), ...value}, 64);}
  };
  Object.defineProperty(window, '__deliveryDiagnostics', {configurable: true, value: {
    snapshot: () => ({timeOrigin: performance.timeOrigin, capturedAt: now(), events: [...events], statuses: [...statuses], longTasks: [...longTasks], frames: [...frames],
      caps: {events: 128, statuses: 64, longTasks: 64, frames: 96}}),
  }});

  const nativeFetch = window.fetch;
  window.fetch = function(input, options) {
    if (!localPath(input, '/release.json')) return Reflect.apply(nativeFetch, this, arguments);
    const id = ++sequence, signal = options?.signal ?? input?.signal;
    record('metadata-fetch-start', {id});
    signal?.addEventListener('abort', () => record('metadata-signal-abort', {id, error: errorName(signal.reason)}), {once: true});
    return watch(Reflect.apply(nativeFetch, this, arguments), response => {
      responses.set(response, id); record('metadata-headers', {id, status: response.status});
    }, error => record('metadata-fetch-rejected', {id, error: errorName(error)}));
  };
  const nativeJson = Response.prototype.json;
  Response.prototype.json = function() {
    const id = responses.get(this);
    if (!id) return Reflect.apply(nativeJson, this, arguments);
    record('metadata-body-start', {id});
    return watch(Reflect.apply(nativeJson, this, arguments), () => record('metadata-body-resolved', {id}),
      error => record('metadata-body-rejected', {id, error: errorName(error)}));
  };
  if (navigator.serviceWorker) {
    const nativeRegister = navigator.serviceWorker.register;
    navigator.serviceWorker.register = function(script) {
      if (!localPath(script, '/sw.js')) return Reflect.apply(nativeRegister, this, arguments);
      record('service-worker-register-start');
      return watch(Reflect.apply(nativeRegister, this, arguments), registration => record('service-worker-register-resolved', {
        active: registration.active?.state, waiting: registration.waiting?.state, installing: registration.installing?.state,
      }), error => record('service-worker-register-rejected', {error: errorName(error)}));
    };
  }
  try {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) push(longTasks, {at: entry.startTime, duration: entry.duration}, 64);
      if (longTasks.length === 64) observer.disconnect();
    });
    observer.observe({type: 'longtask', buffered: true});
  } catch (error) {record('longtask-observer-unavailable', {error: errorName(error)});}
  function frame(timestamp) {
    push(frames, {at: timestamp, interval: priorFrame === null ? null : timestamp - priorFrame}, 96);
    priorFrame = timestamp;
    if (frames.length < 96) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('DOMContentLoaded', () => {
    record('dom-content-loaded');
    // Main's normal module graph has finished by this event. Do not import any
    // game module on recovery/error documents where normal boot did not finish.
    if (!window.__colossus) return;
    void import('/src/offline.js').then(offline => offline.subscribeOfflineStatus(recordStatus))
      .catch(error => record('status-observer-unavailable', {error: errorName(error)}));
  }, {once: true});
}
