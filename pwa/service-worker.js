/* This template is compiled with an immutable, content-addressed manifest. */
'use strict';
const RELEASE = __RELEASE_DESCRIPTOR__;
const CACHE_PREFIX = 'colossus-wake-release-';
const CACHE_NAME = CACHE_PREFIX + RELEASE.buildId;
const CLIENT_CACHE = 'colossus-wake-client-pins-v1';
const COMPLETE_URL = new URL('/__colossus_cache_complete__', self.location.origin).href;
const FILES = new Map(RELEASE.files.map((file) => [file.url, file]));
let installFailure = '';
let repairing = null;

// These recovery resources live in the installed worker itself. They remain
// available when eviction removes index.html or the game's JavaScript modules.
const RECOVERY_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Repair Colossus Wake</title><link rel="icon" href="/__colossus-recovery.svg" type="image/svg+xml"><link rel="stylesheet" href="/__colossus-recovery.css"><script defer src="/__colossus-recovery.js"></script></head>
<body><main><p class="eyebrow">COLOSSUS WAKE</p><h1>Repair offline play</h1>
<p>The offline game is incomplete. This repair keeps your saved expedition on this device.</p>
<p id="recovery-status" role="status">Reconnect to the internet, then download a complete copy of the game.</p>
<button id="recovery-repair" type="button">Repair offline game</button>
<noscript><p>JavaScript must be enabled to repair the game.</p></noscript></main></body></html>`;
const RECOVERY_CSS = `:root{color-scheme:dark;font:18px/1.55 system-ui,sans-serif;color:#e8dfc7;background:#172622}body{margin:0;padding:calc(36px + env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) 36px max(24px,env(safe-area-inset-left))}main{max-width:36rem;margin:8vh auto}h1{font-size:clamp(2rem,6vw,3rem);line-height:1.15}.eyebrow{font-size:.75rem;letter-spacing:.22em;color:#d6c397}button{font:inherit;min-height:48px;padding:12px 20px;border:1px solid #d6c397;border-radius:5px;color:#172622;background:#d6c397;cursor:pointer}button:disabled{opacity:.65;cursor:wait}`;

function recoveryPageClient() {
  const status = document.getElementById('recovery-status');
  const button = document.getElementById('recovery-repair');
  function message(worker, type, timeout = 300000) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Repair timed out. Reconnect and try again; your save is kept.')); }, timeout);
      channel.port1.onmessage = ({data}) => { clearTimeout(timer); channel.port1.close(); data.error ? reject(new Error(data.error)) : resolve(data); };
      worker.postMessage({type}, [channel.port2]);
    });
  }
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'COLOSSUS_IDENTIFY_CLIENT' && event.ports?.[0]) event.ports[0].postMessage({protocol: 2, recovery: true});
  });
  function installed(worker, activating = false) {
    if (!worker) return Promise.reject(new Error('The new installer did not start. Reconnect and retry.'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('The download is taking too long. Your save is kept. Reconnect and retry.')), 300000);
      const finish = error => {clearTimeout(timer); worker.removeEventListener('statechange', changed); error ? reject(error) : resolve();};
      const changed = () => {if (worker.state === 'activated' || !activating && worker.state === 'installed') finish(); else if (worker.state === 'redundant') finish(new Error('The release changed or a file failed verification. Retry while connected.'));};
      worker.addEventListener('statechange', changed); changed();
    });
  }
  function bounded(promise, milliseconds = 15000) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('The update check timed out. Your saved expedition is kept.')), milliseconds);})]).finally(() => clearTimeout(timer));
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Downloading and verifying the complete game. Your saved expedition is kept.';
    try {
      let reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg?.active) throw new Error('Reconnect and reopen the game to repair it.');
      const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 8000);
      let release;
      try {
        const response = await fetch('/release.json', {cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: abort.signal});
        if (!response.ok || response.redirected || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Reconnect and sign in to this game address before repairing.');
        release = await response.json();
      } finally {clearTimeout(timer);}
      if (release.app !== 'colossus-wake' || release.schemaVersion !== 1 || !/^[a-f0-9]{20}$/.test(release.buildId) || !Array.isArray(release.files) || !release.files.some(file => file.url === '/index.html') || !release.files.some(file => file.url === '/src/build-info.js')) throw new Error('The address did not return a valid game release.');
      const active = await message(reg.active, 'COLOSSUS_OFFLINE_STATUS', 8000);
      if (active.buildId === release.buildId) {
        const result = await message(reg.active, 'COLOSSUS_REPAIR');
        if (!result.complete) throw new Error('The complete repair could not be verified.');
      } else {
        // Evicted A can recover straight to B even if main.js is missing. The
        // independently embedded recovery UI follows the same safe protocol.
        const stable = [reg.active, reg.waiting, reg.installing].some(worker => worker && new URL(worker.scriptURL).pathname === '/sw.js' && !new URL(worker.scriptURL).search);
        if (stable) await bounded(reg.update(), 90000);
        else reg = await bounded(navigator.serviceWorker.register('/sw.js', {scope: '/', updateViaCache: 'none'}));
        await installed(reg.installing || reg.waiting || reg.active);
        const candidate = reg.waiting || reg.active;
        const verified = await message(candidate, 'COLOSSUS_OFFLINE_STATUS', 8000);
        if (!verified.complete || verified.buildId !== release.buildId) throw new Error('The host changed during repair. Retry the latest release.');
        if (reg.waiting) {await message(candidate, 'COLOSSUS_ACTIVATE', 15000); await installed(candidate, true);}
      }
      status.textContent = 'Repair verified. Reopening your game…';
      location.reload();
    } catch (error) { status.textContent = error.message; button.disabled = false; }
  });
}
const RECOVERY_SCRIPT = '(' + recoveryPageClient.toString() + ')();';
// The existing game emblem also stays available when every cached asset is gone.
const RECOVERY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#233b35"/><path d="M22 72V44l10-21 9 21v14h18V37l10-22 10 22v35z" fill="#d6c397"/><path d="M17 77h66" stroke="#d6c397" stroke-width="5"/></svg>';
function recoveryResponse(body, type) {
  return new Response(body, { headers: {
    'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    'X-Content-Type-Options': 'nosniff',
  } });
}

async function cachedRelease(buildId = RELEASE.buildId, complete = false, excluded = new Set()) {
  const names = (await caches.keys()).filter(name => !excluded.has(name) && (name === CACHE_PREFIX + buildId || name.startsWith(CACHE_PREFIX + buildId + '-repair-'))).sort().reverse();
  for (const name of names) {
    const cache = await caches.open(name), marker = await cache.match(COMPLETE_URL);
    if (!marker) continue;
    let descriptor;
    try { descriptor = await marker.json(); } catch { continue; }
    // Legacy markers contain only a build ID; only this worker's own descriptor
    // can safely supply their file list. Unknown legacy clients block activation.
    if (descriptor.buildId !== buildId) continue;
    if (!Array.isArray(descriptor.files)) { if (buildId !== RELEASE.buildId) continue; descriptor = RELEASE; }
    if (complete) {
      let intact = true;
      for (const file of descriptor.files) if (!(await cache.match(file.url))) { intact = false; break; }
      if (!intact) continue;
    }
    return {name, cache, descriptor};
  }
  return null;
}
async function cacheIsComplete() { return !!(await cachedRelease(RELEASE.buildId, true)); }
async function pinClient(id, buildId) {
  if (!id) return;
  const cache = await caches.open(CLIENT_CACHE);
  await cache.put('/__colossus_client/' + encodeURIComponent(id), new Response(buildId));
}
async function clientBuild(id) {
  if (!id || !(await caches.has(CLIENT_CACHE))) return null;
  const value = await (await caches.open(CLIENT_CACHE)).match('/__colossus_client/' + encodeURIComponent(id));
  return value ? value.text() : null;
}
async function installRelease(repair = false) {
  if (!repair && await cacheIsComplete()) return;
  const candidate = repair ? CACHE_NAME + '-repair-' + Date.now() : CACHE_NAME;
  // Only this incomplete candidate is disposable. No prior complete cache or
  // client pin is touched if quota, authentication, network or integrity fails.
  if (!repair) await caches.delete(candidate);
  const cache = await caches.open(candidate);
  const deadline = Date.now() + 240000;
  try {
    for (const file of RELEASE.files) {
      if (Date.now() > deadline) throw new Error('Download timed out. Retry when connected.');
      const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 20000);
      let response, bytes;
      try {
        response = await fetch(file.url, {cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: abort.signal});
        if (!response.ok || response.type === 'opaque' || response.redirected) throw new Error('Download failed: ' + file.url + ' (' + response.status + ').');
        bytes = await response.arrayBuffer();
      } finally { clearTimeout(timer); }
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
      if (bytes.byteLength !== file.bytes || digest !== file.sha256) throw new Error('Integrity check failed: ' + file.url + '. Sign in again or retry the complete release.');
      const headers = new Headers(response.headers);
      headers.delete('content-encoding'); headers.delete('content-length'); headers.set('Content-Type', file.type);
      await cache.put(file.url, new Response(bytes, {status: 200, headers}));
    }
    await cache.put(COMPLETE_URL, new Response(JSON.stringify(RELEASE), {headers: {'Content-Type': 'application/json'}}));
    installFailure = '';
  } catch (error) {
    installFailure = error.message || String(error);
    await caches.delete(candidate);
    throw error;
  }
}
function identify(client) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Another game window could not confirm its version. Close other game windows, then try again.')); }, 3000);
    channel.port1.onmessage = ({data}) => { clearTimeout(timer); channel.port1.close(); resolve(data); };
    client.postMessage({type: 'COLOSSUS_IDENTIFY_CLIENT'}, [channel.port2]);
  });
}
async function activateSafely() {
  if (!(await cacheIsComplete())) throw new Error('The downloaded update is incomplete. Retry while connected.');
  const clients = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
  // Persist every pin before changing controllers. All clients must identify;
  // hidden, suspended and legacy tabs never count as approval to replace bytes.
  for (const client of clients) {
    const data = await identify(client);
    if (data?.protocol !== 2) throw new Error('Close older game windows before updating.');
    if (data.recovery === true) { await pinClient(client.id, RELEASE.buildId); continue; }
    if (!/^[a-f0-9]{20}$/.test(data.buildId) || !(await cachedRelease(data.buildId, true))) throw new Error('An open game has no complete matching offline release. Close that window before updating.');
    await pinClient(client.id, data.buildId);
  }
  const known = new Set(clients.map(client => client.id));
  const latest = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
  for (const client of latest) if (!known.has(client.id) && !(await clientBuild(client.id))) throw new Error('A game window opened during the update. Try Save and update again.');
  await self.skipWaiting();
  return {activating: true, buildId: RELEASE.buildId};
}
self.addEventListener('install', event => event.waitUntil(installRelease()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  if (!(await cacheIsComplete())) throw new Error('The complete offline release is missing.');
  // Deliberately retain complete historical releases. A suspended iOS client may
  // reappear after matchAll, so enumeration is not proof that its cache is unused.
  // Quota failures preserve the existing copy; storage eviction remains possible.
  // No clients.claim: the first online page reloads only at a safe title boundary.
})()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/__colossus-recovery.js') { event.respondWith(recoveryResponse(RECOVERY_SCRIPT, 'text/javascript')); return; }
  if (url.pathname === '/__colossus-recovery.css') { event.respondWith(recoveryResponse(RECOVERY_CSS, 'text/css')); return; }
  if (url.pathname === '/__colossus-recovery.svg') { event.respondWith(recoveryResponse(RECOVERY_ICON, 'image/svg+xml')); return; }
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  // Metadata, worker and diagnostics must always reach the network. Runtime
  // routing uses the pinned descriptor, including files removed in the new build.
  if (['/release.json', '/sw.js', '/health', '/diagnostics'].includes(pathname)) return;
  if (!(pathname === '/index.html' || pathname === '/manifest.webmanifest' || /^\/(src|vendor|assets|icons)\//.test(pathname))) return;
  event.respondWith((async () => {
    const navigation = request.mode === 'navigate' && pathname === '/index.html';
    const pinnedBuild = navigation ? null : await clientBuild(event.clientId);
    // A lost pin is not permission to give an old live document new JavaScript.
    // Fail closed until its verified status handshake restores its own build.
    if (!navigation && event.clientId && !pinnedBuild) return new Response('This window must confirm its saved release. Reopen the game if the file remains unavailable.', {status: 503, headers: {'Content-Type': 'text/plain'}});
    const buildId = navigation ? RELEASE.buildId : pinnedBuild || RELEASE.buildId;
    const release = await cachedRelease(buildId, navigation);
    if (!release) return navigation ? recoveryResponse(RECOVERY_HTML, 'text/html') : new Response('Offline release missing. Reload to repair.', {status: 503});
    if (navigation) await pinClient(event.resultingClientId, buildId);
    if (!release.descriptor.files.some(file => file.url === pathname)) return new Response('File is not part of this release.', {status: 404});
    let response = await release.cache.match(pathname);
    if (!response) {
      // Storage eviction can remove one file from a newer repair while its
      // original same-build copy survives. Only certified copies with the exact
      // same build AND file digest may supply that byte; never cross into B.
      const expected = release.descriptor.files.find(file => file.url === pathname);
      const attempted = new Set([release.name]);
      let alternative;
      while ((alternative = await cachedRelease(buildId, false, attempted))) {
        attempted.add(alternative.name);
        if (!alternative.descriptor.files.some(file => file.url === pathname && file.sha256 === expected.sha256 && file.bytes === expected.bytes)) continue;
        response = await alternative.cache.match(pathname);
        if (response) break;
      }
    }
    return response || new Response('An offline game file is missing. Reload the game to open its repair page.', {status: 503, headers: {'Content-Type': 'text/plain'}});
  })());
});
self.addEventListener('message', event => {
  if (!event.ports?.[0]) return;
  const type = event.data?.type;
  if (!['COLOSSUS_OFFLINE_STATUS', 'COLOSSUS_ACTIVATE', 'COLOSSUS_REPAIR', 'COLOSSUS_PIN_CLIENT'].includes(type)) return;
  event.waitUntil((async () => {
    try {
      let result;
      if (type === 'COLOSSUS_ACTIVATE') result = await activateSafely();
      else if (type === 'COLOSSUS_REPAIR') {
        if (!repairing) repairing = installRelease(true).finally(() => { repairing = null; });
        await repairing; result = {buildId: RELEASE.buildId, complete: await cacheIsComplete()};
      } else if (type === 'COLOSSUS_PIN_CLIENT') {
        if (!event.source?.id || !/^[a-f0-9]{20}$/.test(event.data.buildId) || !(await cachedRelease(event.data.buildId, true))) throw new Error('Client version could not be pinned.');
        await pinClient(event.source.id, event.data.buildId); result = {pinned: true};
      } else {
        const requested = event.data.buildId;
        const clientRelease = requested && /^[a-f0-9]{20}$/.test(requested) ? await cachedRelease(requested, true) : null;
        if (clientRelease && event.source?.id) await pinClient(event.source.id, requested);
        result = {protocol: 2, buildId: RELEASE.buildId, complete: await cacheIsComplete(), clientBuildId: requested || RELEASE.buildId, clientComplete: requested ? !!clientRelease : await cacheIsComplete(), failure: installFailure};
      }
      event.ports[0].postMessage(result);
    } catch (error) { event.ports[0].postMessage({buildId: RELEASE.buildId, complete: false, error: error.message || String(error)}); }
  })());
});
