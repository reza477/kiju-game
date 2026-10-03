import { BUILD_ID } from './build-info.js';

let status = Object.freeze({state: 'not-installed', buildId: BUILD_ID, installedBuildId: null, updateBuildId: null, message: 'Checking availability of offline play.', canPlayOffline: false, canApplyUpdate: false, needsReopen: false, checkedAt: null});
let busy = null, automatic = null;
const listeners = new Set();
const observedRegistrations = new WeakSet(), observedWorkers = new WeakSet();
const unavailableMessage = 'Offline installation is available in the packaged HTTPS app. The local PC game continues to work normally.';
export function getOfflineStatus() { return {...status}; }
export function subscribeOfflineStatus(listener) { listeners.add(listener); listener(getOfflineStatus()); return () => listeners.delete(listener); }
function publish(change) {
  status = Object.freeze({...status, ...change});
  for (const listener of listeners) { try { listener(getOfflineStatus()); } catch (error) { console.error('Offline status listener:', error); } }
  return getOfflineStatus();
}
function supported() { return globalThis.isSecureContext && 'serviceWorker' in navigator && 'caches' in globalThis; }
function isOurWorker(worker) { if (!worker) return false; const url = new URL(worker.scriptURL); return url.origin === location.origin && url.pathname === '/sw.js'; }
async function registration() {
  if (!supported()) return null;
  const candidate = await navigator.serviceWorker.getRegistration('/');
  if (!candidate || ![candidate.active, candidate.waiting, candidate.installing].some(isOurWorker)) return null;
  observeRegistration(candidate);
  return candidate;
}
function observeRegistration(reg) {
  if (observedRegistrations.has(reg)) return;
  observedRegistrations.add(reg);
  const observeWorker = () => {
    const worker = reg.installing || reg.waiting;
    if (!isOurWorker(worker) || observedWorkers.has(worker)) return;
    observedWorkers.add(worker);
    worker.addEventListener('statechange', () => {
      if (!['installed', 'activated'].includes(worker.state)) return;
      // Native update work can outlive our bounded UI check. Its eventual
      // completion still gets verified and surfaced, without polling or reload
      // of an active expedition. Queue behind any current install operation.
      void refreshOfflineStatus().then(() => automatic?.ready()).catch(() => {});
    });
  };
  reg.addEventListener?.('updatefound', observeWorker);
  observeWorker();
}
function message(worker, type, extra = {}, timeout = 8000) {
  if (!isOurWorker(worker)) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('The offline installer did not respond. Reopen the app and retry.')); }, timeout);
    channel.port1.onmessage = ({data}) => { clearTimeout(timer); channel.port1.close(); data?.error ? reject(new Error(data.error)) : resolve(data); };
    worker.postMessage({type, ...extra}, [channel.port2]);
  });
}
function workerStatus(worker) { return message(worker, 'COLOSSUS_OFFLINE_STATUS', {buildId: BUILD_ID}); }
function bounded(promise, milliseconds = 15000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('The update check timed out. Your current game is kept.')), milliseconds); })]).finally(() => clearTimeout(timer));
}
async function refresh() {
  if (!supported()) return publish({state: 'unavailable', message: unavailableMessage, canPlayOffline: false, canApplyUpdate: false});
  const reg = await registration();
  if (!reg) return publish({state: 'not-installed', installedBuildId: null, updateBuildId: null, canPlayOffline: false, canApplyUpdate: false, message: 'The complete offline game has not downloaded yet.'});
  const active = await workerStatus(reg.active), waiting = await workerStatus(reg.waiting);
  const ready = active?.protocol === 2 ? !!active.clientComplete : !!active?.complete;
  const candidate = waiting?.complete ? waiting : active?.complete && active.buildId !== BUILD_ID ? active : null;
  const needsReopen = !!active?.complete && !isOurWorker(navigator.serviceWorker.controller);
  const offline = navigator.onLine === false;
  return publish({state: candidate ? 'update-ready' : ready ? offline ? 'offline' : 'ready' : reg.installing ? 'installing' : 'not-installed', installedBuildId: ready ? BUILD_ID : active?.buildId || null, updateBuildId: candidate?.buildId || null, canPlayOffline: ready, canApplyUpdate: !!candidate, needsReopen,
    message: candidate ? 'Ready to update. Save and update when your expedition is safe.' : needsReopen ? 'The complete game is stored. Reopen to use this offline copy.' : ready ? offline ? 'Offline — using saved build. Latest release not checked.' : 'Saved build is available offline. Latest release not checked yet.' : 'The complete offline game is not stored. Connect to download or repair it.'});
}
function operation(callback, options = {}) {
  const next = (busy || Promise.resolve()).then(async () => {
    const temporaryListener = options.onStatus && !listeners.has(options.onStatus);
    if (temporaryListener) listeners.add(options.onStatus);
    try { return await callback(); }
    catch (error) { return publish({state: error.unavailable ? 'unavailable' : navigator.onLine === false && status.canPlayOffline ? 'offline' : 'error', message: error.unavailable ? unavailableMessage : navigator.onLine === false && status.canPlayOffline ? 'Offline — using saved build. Latest release not checked.' : `Update failed. ${error.message || error} Retry when connected.`}); }
    finally { if (temporaryListener) listeners.delete(options.onStatus); }
  });
  busy = next;
  return next.finally(() => { if (busy === next) busy = null; });
}
export function refreshOfflineStatus(options) { return operation(refresh, options); }
async function fetchRelease() {
  if (!supported()) throw Object.assign(new Error(unavailableMessage), {unavailable: true});
  const release = await new Promise((resolve, reject) => {
    let worker, loading, startupCeiling, ready = false, finished = false;
    const clearStartup = () => {clearTimeout(loading); clearTimeout(startupCeiling);};
    const finish = (error, value) => {
      if (finished) return;
      finished = true; clearStartup();
      if (worker) {worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate();}
      error ? reject(error) : resolve(value);
    };
    try {
      // Bootstrap allows 30 seconds of observable event-loop opportunity:
      // a late 250ms heartbeat charges at most 250ms, not a whole render stall.
      // A separate 90-second wall ceiling still bounds a never-ready worker.
      // These startup limits end at ready; the worker retains its own unchanged
      // 8-second request/body deadline, independent of main-thread delivery.
      worker = new Worker(new URL('./release-fetch-worker.js', import.meta.url));
      const startupFailure = () => finish(new Error('The release checker could not start. Reopen the app and retry.'));
      const began = performance.now(); let observed = 0, previous = began;
      const observeStartup = () => {
        if (ready || finished) return;
        const now = performance.now(); observed += Math.min(250, Math.max(0, now - previous)); previous = now;
        if (observed >= 30000 || now - began >= 90000) startupFailure();
        else loading = setTimeout(observeStartup, 250);
      };
      loading = setTimeout(observeStartup, 250);
      startupCeiling = setTimeout(startupFailure, 90000);
      worker.onerror = event => {event.preventDefault?.(); finish(new Error('The release checker could not run. Reopen the app and retry.'));};
      worker.onmessageerror = () => finish(new Error('The release checker returned an unreadable response.'));
      worker.onmessage = ({data}) => {
        if (!ready && data?.type === 'release-ready') {
          // Different task sources need not deliver an overdue timer before a
          // queued message. A late ready cannot cancel the absolute ceiling.
          if (performance.now() - began >= 90000) {startupFailure(); return;}
          ready = true; clearStartup();
        } else if (ready && data?.type === 'release-result') finish(null, data.release);
        else if (ready && data?.type === 'release-error') {
          const messages = {
            unavailable: unavailableMessage,
            timeout: 'The release download timed out. Your current game is kept.',
            unverified: 'The hosted release could not be verified. Check that this game address is signed in.',
            invalid: 'This address did not return a valid Colossus Wake release.',
            network: 'The release download could not finish. Retry when connected.',
          };
          finish(Object.assign(new Error(messages[data.kind] || 'The release checker failed to verify the response.'), {unavailable: data.kind === 'unavailable'}));
        } else finish(new Error('The release checker returned an unexpected response.'));
      };
      // Queue immediately: the worker can load and fetch while this thread is
      // busy. Its ready message precedes its result on the same message channel.
      worker.postMessage({type: 'fetch-release'});
    } catch {finish(new Error('The release checker could not start. Reopen the app and retry.'));}
  });
  if (!release || release.app !== 'colossus-wake' || release.schemaVersion !== 1 || !/^[a-f0-9]{20}$/.test(release.buildId) || !Array.isArray(release.files) || !release.files.some(file => file?.url === '/index.html') || !release.files.some(file => file?.url === '/src/build-info.js')) throw new Error('This address did not return a valid Colossus Wake release.');
  return release;
}
function waitUntilInstalled(worker, waitForActivation = false) {
  if (!worker) throw new Error('The installer did not start. Retry when connected.');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Download timed out. Your previous complete build is kept. Retry when connected.')), 300000);
    const finish = error => { clearTimeout(timer); worker.removeEventListener('statechange', changed); error ? reject(error) : resolve(); };
    const changed = () => { if (worker.state === 'activated' || !waitForActivation && worker.state === 'installed') finish(); else if (worker.state === 'redundant') finish(new Error('A file failed verification or device storage is full. The previous complete build is retained.')); };
    worker.addEventListener('statechange', changed); changed();
  });
}
async function install(release) {
  let reg = await registration();
  let active = await workerStatus(reg?.active), waiting = await workerStatus(reg?.waiting);
  if (waiting?.complete && waiting.buildId === release.buildId || active?.complete && active.buildId === release.buildId) return refresh();
  publish({state: 'installing', message: 'Update downloading. You can keep playing the saved build.'});
  if (active?.buildId === release.buildId && !active.complete && active.protocol === 2) {
    await message(reg.active, 'COLOSSUS_REPAIR', {}, 300000);
  } else {
    // Stable URL: the browser compares the newly fetched worker bytes.
    const firstInstallation = !reg?.active;
    const stableRegistration = reg && [reg.active, reg.waiting, reg.installing].some(worker => worker && new URL(worker.scriptURL).pathname === '/sw.js' && !new URL(worker.scriptURL).search);
    // Do not queue a redundant register job before update on an existing stable
    // registration. update() is the explicit network worker comparison.
    if (stableRegistration) await bounded(reg.update(), 90000);
    else reg = await bounded(navigator.serviceWorker.register('/sw.js', {scope: '/', updateViaCache: 'none'}));
    observeRegistration(reg);
    await waitUntilInstalled(reg.installing || reg.waiting || reg.active, firstInstallation);
  }
  active = await workerStatus(reg.active); waiting = await workerStatus(reg.waiting);
  const verified = waiting?.complete && waiting.buildId === release.buildId || active?.complete && active.buildId === release.buildId;
  if (!verified) throw new Error('The host changed during download. The previous build is kept; retry for the latest release.');
  try { await navigator.storage?.persist?.(); } catch { /* Best effort; never a promise of persistent storage. */ }
  return refresh();
}
export function prepareOffline(options) { return operation(async () => install(await fetchRelease()), options); }
export function checkForUpdate(options) {
  return operation(async () => {
    await refresh();
    if (navigator.onLine === false) return publish({state: status.canPlayOffline ? 'offline' : 'not-installed', message: status.canPlayOffline ? 'Offline — using saved build. Latest release not checked.' : 'Offline. A complete game copy has not downloaded yet. Connect to prepare offline play.'});
    publish({message: 'Checking for an update. You can keep playing.'});
    const release = await fetchRelease();
    const result = await install(release);
    return publish({checkedAt: new Date().toISOString(), message: result.canApplyUpdate ? 'Ready to update. Save and update when your expedition is safe.' : result.needsReopen ? result.message : 'Up to date. The complete game is saved for offline play.'});
  }, options);
}
export function applyUpdate(options = {}) {
  return operation(async () => {
    // Save belongs to the game, not the release cache. A failed write prevents
    // activation AND reload. Recheck the boundary after asynchronous work.
    if (!options.canReload?.()) throw new Error('Finish combat or return to the title screen before updating.');
    if (options.save && options.save() !== true) throw new Error('Your expedition could not be saved. Export a backup before updating.');
    const current = await refresh(), reg = await registration();
    if (!current.canApplyUpdate && !current.needsReopen) return publish({message: 'No downloaded update is waiting.'});
    if (reg?.waiting) {
      const candidate = reg.waiting;
      await message(candidate, 'COLOSSUS_ACTIVATE', {}, 15000);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('Activation is still pending. Your expedition is kept; retry.')), 10000);
        const finish = error => { clearTimeout(timer); candidate.removeEventListener('statechange', changed); error ? reject(error) : resolve(); };
        const changed = () => { if (candidate.state === 'activated') finish(); else if (candidate.state === 'redundant') finish(new Error('A newer update arrived. Retry safely.')); };
        candidate.addEventListener('statechange', changed); changed();
      });
    }
    if (!options.canReload()) return publish({message: 'Update is ready. Your current expedition will continue until you choose Save and update.'});
    // The dialog may have closed while activation was waiting for other tabs.
    // Save the latest live state again immediately before the synchronous reload.
    // If this write fails, the client stays on its pinned old release and plays on.
    if (options.save && options.save() !== true) throw new Error('Your latest progress could not be saved. The game will stay open; export a backup before updating.');
    publish({state: 'applying', message: 'Update verified. Reopening your game…'});
    location.reload();
    return getOfflineStatus();
  }, options);
}
export function startAutomaticUpdates({isTitle, onReady} = {}) {
  if (automatic || !supported()) return automatic || {check() {}, title() {}};
  if (document.querySelector && !document.querySelector('link[rel="manifest"]')) {
    publish({state: 'unavailable', message: unavailableMessage});
    return {check() {}, title() {}};
  }
  let scheduled = null, lastCheck = -Infinity, checking = false, announced = null, applyingTitle = false;
  const canTitleReload = () => isTitle?.() === true && !document.hidden;
  async function title() {
    if (applyingTitle || !canTitleReload() || !(status.canApplyUpdate || status.needsReopen)) return;
    applyingTitle = true;
    try { await applyUpdate({canReload: canTitleReload}); }
    finally { applyingTitle = false; }
  }
  async function ready() {
    if (status.canApplyUpdate && announced !== status.updateBuildId) { announced = status.updateBuildId; onReady?.(); }
    await title();
  }
  async function check() {
    if (checking || document.hidden || Date.now() - lastCheck < 15000) return;
    checking = true; lastCheck = Date.now();
    try {
      await checkForUpdate();
      await ready();
    } finally { checking = false; }
  }
  const schedule = () => { clearTimeout(scheduled); scheduled = setTimeout(check, 350); };
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'COLOSSUS_IDENTIFY_CLIENT' && event.ports?.[0]) event.ports[0].postMessage({protocol: 2, buildId: BUILD_ID});
  });
  // A newly active worker must never force other active expeditions to reload.
  navigator.serviceWorker.addEventListener('controllerchange', () => { void refreshOfflineStatus().then(title); });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('online', schedule);
  window.addEventListener('offline', () => { void refreshOfflineStatus(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  automatic = {check: schedule, title, ready};
  schedule();
  return automatic;
}
