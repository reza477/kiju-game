import { BUILD_ID } from './build-info.js';

let status = Object.freeze({ state: 'not-installed', buildId: BUILD_ID, installedBuildId: null, updateBuildId: null, message: 'Prepare offline play while connected to the internet.', canPlayOffline: false, canApplyUpdate: false, needsReopen: false });
let busy = null;
const listeners = new Set();
const unavailableMessage = 'Offline installation is available in the packaged HTTPS app. The local PC game continues to work normally.';

export function getOfflineStatus() { return { ...status }; }
export function subscribeOfflineStatus(listener) {
  listeners.add(listener);
  listener(getOfflineStatus());
  return () => listeners.delete(listener);
}
function publish(change) {
  status = Object.freeze({ ...status, ...change });
  for (const listener of listeners) {
    try { listener(getOfflineStatus()); } catch (error) { console.error('Offline status listener:', error); }
  }
  return getOfflineStatus();
}
function supported() { return globalThis.isSecureContext && 'serviceWorker' in navigator && 'caches' in globalThis; }
function isOurWorker(worker) {
  if (!worker) return false;
  const url = new URL(worker.scriptURL);
  return url.origin === location.origin && url.pathname === '/sw.js';
}
async function registration() {
  if (!supported()) return null;
  const candidate = await navigator.serviceWorker.getRegistration('/');
  return candidate && [candidate.active, candidate.waiting, candidate.installing].some(isOurWorker) ? candidate : null;
}
function workerStatus(worker) {
  if (!isOurWorker(worker)) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('The offline installer did not respond. Reopen the app and try again.')); }, 15000);
    channel.port1.onmessage = ({ data }) => { clearTimeout(timer); channel.port1.close(); resolve(data); };
    worker.postMessage({ type: 'COLOSSUS_OFFLINE_STATUS' }, [channel.port2]);
  });
}
async function refresh() {
  if (!supported()) return publish({ state: 'unavailable', message: unavailableMessage, canPlayOffline: false, canApplyUpdate: false });
  const reg = await registration();
  if (!reg) return publish({ state: 'not-installed', installedBuildId: null, updateBuildId: null, canPlayOffline: false, canApplyUpdate: false, message: 'Prepare offline play while connected to the internet. This downloads the complete game to this device.' });
  const current = isOurWorker(navigator.serviceWorker.controller) ? navigator.serviceWorker.controller : reg.active;
  const active = await workerStatus(current);
  const waiting = await workerStatus(reg.waiting);
  const ready = !!active?.complete;
  const update = !!waiting?.complete && reg.waiting !== current;
  const needsReopen = ready && !isOurWorker(navigator.serviceWorker.controller);
  return publish({
    state: update ? 'update-ready' : ready ? 'ready' : reg.installing ? 'installing' : 'not-installed',
    installedBuildId: active?.buildId || null,
    updateBuildId: update ? waiting.buildId : null,
    canPlayOffline: ready,
    canApplyUpdate: update,
    needsReopen,
    message: update ? 'An update is downloaded. Save, then close every game window and reopen to use it.' : needsReopen ? 'The complete game is stored. Save, then close and reopen the game once before testing offline play. This first window still uses the online version.' : ready ? 'The complete game is stored on this device for offline play. Device storage can be cleared by the browser or operating system; keep a save backup.' : 'The complete offline game is not stored. Prepare offline play while connected to the internet.',
  });
}
function operation(callback, options = {}) {
  const onStatus = options.onStatus;
  // Queue every requested operation. A pending panel refresh must never swallow
  // a subsequent Prepare click, and overlapping installs must not race.
  const next = (busy || Promise.resolve()).then(async () => {
    if (onStatus) listeners.add(onStatus);
    try { return await callback(); }
    catch (error) { return publish({ state: error.unavailable ? 'unavailable' : 'error', message: error.message || String(error) }); }
    finally { if (onStatus) listeners.delete(onStatus); }
  });
  busy = next;
  return next.finally(() => { if (busy === next) busy = null; });
}
export function refreshOfflineStatus(options) { return operation(refresh, options); }

async function fetchRelease(requireCurrentBuild) {
  if (!supported()) throw Object.assign(new Error(unavailableMessage), { unavailable: true });
  const response = await fetch('/release.json', { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
  if (response.status === 404) throw Object.assign(new Error(unavailableMessage), { unavailable: true });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('The hosted release could not be verified. Connect to the internet and check that the game address is signed in.');
  const release = await response.json();
  if (release.app !== 'colossus-wake' || release.schemaVersion !== 1 || !/^[a-f0-9]{20}$/.test(release.buildId) || !Array.isArray(release.files) || !release.files.some((file) => file.url === '/index.html') || !release.files.some((file) => file.url === '/src/build-info.js')) throw new Error('The address did not return a valid Colossus Wake release.');
  if (requireCurrentBuild && release.buildId !== BUILD_ID) throw new Error('The hosted release changed after this game opened. Save your expedition, close the game, reopen while online, and try again.');
  return release;
}
function waitUntilInstalled(worker, waitForActivation = false) {
  if (!worker) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Offline preparation is taking too long. Keep the app open and connected, then check its status.')), 10 * 60 * 1000);
    const finish = (error) => { clearTimeout(timer); worker.removeEventListener('statechange', changed); error ? reject(error) : resolve(); };
    const changed = () => {
      if (worker.state === 'activated' || (!waitForActivation && worker.state === 'installed')) finish();
      else if (worker.state === 'redundant') finish(new Error('Offline preparation failed. A file did not download correctly, the host returned a different release, or device storage is full. The previous offline build is retained.'));
    };
    worker.addEventListener('statechange', changed);
    changed();
  });
}
async function install(release) {
  const previous = await registration();
  const active = await workerStatus(previous?.active);
  const waiting = await workerStatus(previous?.waiting);
  if (waiting?.complete && waiting.buildId === release.buildId) return refresh();
  if (active?.complete && active.buildId === release.buildId) return refresh();
  if (active && !isOurWorker(navigator.serviceWorker.controller)) throw new Error('Save, close all game windows, and reopen once before preparing an update. This first window is still using the online version.');
  const repair = active?.buildId === release.buildId && !active.complete ? `&repair=${Date.now()}` : '';
  publish({ state: 'installing', message: 'Downloading and verifying the complete game. Keep this window open and connected.' });
  const reg = await navigator.serviceWorker.register(`/sw.js?build=${release.buildId}${repair}`, { scope: '/', updateViaCache: 'none' });
  await waitUntilInstalled(reg.installing || reg.waiting || reg.active, !previous?.active);
  // First installation may still be activating when the installed event fires.
  const installed = reg.waiting || reg.active || reg.installing;
  const verification = await workerStatus(installed);
  if (!verification?.complete || verification.buildId !== release.buildId) throw new Error('The complete offline release could not be verified. Retry while online.');
  // Persistence is a best-effort request, not a guarantee and not a readiness condition.
  try { await navigator.storage?.persist?.(); } catch { /* Unsupported or denied by browser policy. */ }
  return refresh();
}
export function prepareOffline(options) {
  return operation(async () => {
    const release = await fetchRelease(true);
    return install(release);
  }, options);
}
export function checkForUpdate(options) {
  return operation(async () => {
    const reg = await registration();
    const release = await fetchRelease(!reg?.active);
    const previous = await refresh();
    if (previous.installedBuildId === release.buildId && previous.canPlayOffline) return previous.needsReopen ? previous : publish({ message: 'The installed offline game is up to date.' });
    if (previous.updateBuildId === release.buildId && previous.canApplyUpdate) return previous;
    return install(release);
  }, options);
}
export function applyUpdate(options) {
  return operation(async () => {
    const current = await refresh();
    if (!current.canApplyUpdate) return publish({ message: 'No downloaded update is waiting. Check for updates while online.' });
    // Caller saves before invoking this. Never skipWaiting, claim, or reload clients.
    return publish({ message: 'Save complete. Close all game windows, then reopen to use the downloaded update.' });
  }, options);
}
