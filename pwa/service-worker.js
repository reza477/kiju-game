/* This template is compiled with an immutable, content-addressed manifest. */
'use strict';
const RELEASE = __RELEASE_DESCRIPTOR__;
const CACHE_PREFIX = 'colossus-wake-release-';
// A repair uses its own cache, preserving the old copy until natural activation.
const REPAIR = new URL(self.location.href).searchParams.get('repair');
const CACHE_NAME = CACHE_PREFIX + RELEASE.buildId + (REPAIR ? '-repair-' + REPAIR : '');
const COMPLETE_URL = new URL('/__colossus_cache_complete__', self.location.origin).href;
const FILES = new Map(RELEASE.files.map((file) => [file.url, file]));
let installFailure = '';

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
  const finished = 'The complete game is downloaded. Close all game windows, then reopen. Your saved expedition has been kept.';
  function workerStatus(worker) {
    if (!worker) return Promise.resolve(null);
    const url = new URL(worker.scriptURL);
    if (url.origin !== location.origin || url.pathname !== '/sw.js') return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('The installer did not respond. Close and reopen the game, then try again.')); }, 15000);
      channel.port1.onmessage = ({ data }) => { clearTimeout(timer); channel.port1.close(); resolve(data); };
      worker.postMessage({ type: 'COLOSSUS_OFFLINE_STATUS' }, [channel.port2]);
    });
  }
  function installed(worker) {
    if (!worker) return Promise.reject(new Error('The repair did not start. Reconnect and try again.'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('The download is taking too long. Keep this window open and connected, then try again.')), 10 * 60 * 1000);
      function finish(error) { clearTimeout(timer); worker.removeEventListener('statechange', changed); error ? reject(error) : resolve(); }
      function changed() {
        if (worker.state === 'installed' || worker.state === 'activated') finish();
        else if (worker.state === 'redundant') finish(new Error('The repair could not verify every file. Check your connection and available device storage, then try again.'));
      }
      worker.addEventListener('statechange', changed);
      changed();
    });
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Downloading and verifying the complete game. Keep this window open and connected.';
    try {
      let response;
      try { response = await fetch('/release.json', { cache: 'no-store', credentials: 'same-origin', redirect: 'error' }); }
      catch { throw new Error('Reconnect to the internet, then try Repair offline game again.'); }
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('The game download is unavailable. Reconnect and check that the game address is signed in, then try again.');
      let release;
      try { release = await response.json(); } catch { throw new Error('The address did not return a valid game release. Try again when the game download is available.'); }
      if (release.app !== 'colossus-wake' || release.schemaVersion !== 1 || !/^[a-f0-9]{20}$/.test(release.buildId) || !Array.isArray(release.files) || !release.files.some((file) => file.url === '/index.html') || !release.files.some((file) => file.url === '/src/build-info.js')) throw new Error('The address did not return a valid Colossus Wake release.');
      const previous = await navigator.serviceWorker.getRegistration('/');
      const waiting = await workerStatus(previous?.waiting);
      if (waiting?.complete && waiting.buildId === release.buildId) { status.textContent = finished; return; }
      const reg = await navigator.serviceWorker.register('/sw.js?build=' + release.buildId + '&repair=' + Date.now(), { scope: '/', updateViaCache: 'none' });
      await installed(reg.installing || reg.waiting || reg.active);
      const verified = await workerStatus(reg.waiting || reg.active || reg.installing);
      if (!verified?.complete || verified.buildId !== release.buildId) throw new Error('The complete repair could not be verified. Keep the connection open and try again.');
      status.textContent = finished;
      // No skipWaiting, reload, cache deletion, or save access from this page.
    } catch (error) {
      status.textContent = error.message || 'The repair could not finish. Reconnect and try again.';
      button.disabled = false;
    }
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

async function cacheIsComplete() {
  if (!(await caches.has(CACHE_NAME))) return false;
  const cache = await caches.open(CACHE_NAME);
  const marker = await cache.match(COMPLETE_URL);
  if (!marker) return false;
  try { if ((await marker.json()).buildId !== RELEASE.buildId) return false; }
  catch { return false; }
  // A marker alone must not claim readiness after partial storage eviction.
  for (const file of RELEASE.files) if (!(await cache.match(file.url))) return false;
  return true;
}

async function installRelease() {
  const requestedBuild = new URL(self.location.href).searchParams.get('build');
  if (requestedBuild !== RELEASE.buildId) throw new Error('The hosted release changed while downloading. Check for updates and retry.');
  if (REPAIR && !/^\d{13,20}$/.test(REPAIR)) throw new Error('Invalid repair identifier.');
  if (await cacheIsComplete()) return;
  await caches.delete(CACHE_NAME);
  const cache = await caches.open(CACHE_NAME);
  try {
    for (const file of RELEASE.files) {
      const response = await fetch(file.url, { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
      if (!response.ok || response.type === 'opaque') throw new Error(`Download failed: ${file.url} (${response.status}).`);
      const bytes = await response.arrayBuffer();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) => n.toString(16).padStart(2, '0')).join('');
      if (bytes.byteLength !== file.bytes || digest !== file.sha256) throw new Error(`Integrity check failed: ${file.url}. The host may have returned a sign-in page or a different release.`);
      const headers = new Headers(response.headers);
      headers.delete('content-encoding');
      headers.delete('content-length');
      headers.set('Content-Type', file.type);
      await cache.put(file.url, new Response(bytes, { status: 200, headers }));
    }
    // The marker is written only after every response is verified and cached.
    await cache.put(COMPLETE_URL, new Response(JSON.stringify({ buildId: RELEASE.buildId }), { headers: { 'Content-Type': 'application/json' } }));
  } catch (error) {
    installFailure = error.message || String(error);
    await caches.delete(CACHE_NAME);
    throw error;
  }
}

self.addEventListener('install', (event) => event.waitUntil(installRelease()));

self.addEventListener('activate', (event) => event.waitUntil((async () => {
  if (!(await cacheIsComplete())) throw new Error('The complete offline release is missing.');
  // No skipWaiting or clients.claim: existing games retain their original worker.
  // Natural activation happens after ALL windows using the previous build close.
  for (const name of await caches.keys()) if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
})()));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/__colossus-recovery.js') { event.respondWith(recoveryResponse(RECOVERY_SCRIPT, 'text/javascript')); return; }
  if (url.pathname === '/__colossus-recovery.css') { event.respondWith(recoveryResponse(RECOVERY_CSS, 'text/css')); return; }
  if (url.pathname === '/__colossus-recovery.svg') { event.respondWith(recoveryResponse(RECOVERY_ICON, 'image/svg+xml')); return; }
  // Health checks, release discovery, worker scripts, and diagnostics stay network-only.
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!FILES.has(pathname)) return;
  event.respondWith((async () => {
    if (request.mode === 'navigate' && pathname === '/index.html') {
      // Checking the entire copy also catches an evicted boot module while the
      // HTML itself survives. Never boot a page that cannot load its own repair UI.
      try { if (!(await cacheIsComplete())) return recoveryResponse(RECOVERY_HTML, 'text/html'); }
      catch { return recoveryResponse(RECOVERY_HTML, 'text/html'); }
    }
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(pathname);
    // Never fill missing files from a newer hosted build: that would mix versions.
    return response || new Response('An offline game file is missing. Reload the game to open its repair page.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  })());
});

self.addEventListener('message', (event) => {
  if (!event.ports?.[0] || event.data?.type !== 'COLOSSUS_OFFLINE_STATUS') return;
  event.waitUntil((async () => {
    try {
      event.ports[0].postMessage({ buildId: RELEASE.buildId, complete: await cacheIsComplete(), failure: installFailure });
    } catch (error) {
      event.ports[0].postMessage({ buildId: RELEASE.buildId, complete: false, failure: error.message || String(error) });
    }
  })());
});
