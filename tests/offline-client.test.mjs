import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD_ID } from '../src/build-info.js';

let moduleCount = 0;
async function withBrowser(overrides, run) {
  const saved = new Map();
  const keys = ['navigator', 'location', 'isSecureContext', 'caches', 'fetch'];
  for (const key of keys) saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  let registrations = 0, fetches = 0;
  const serviceWorker = { controller: null, getRegistration: async () => null, register: async () => { registrations++; throw new Error('Unexpected registration'); }, ...overrides.serviceWorker };
  const values = { navigator: { serviceWorker }, location: new URL('https://game.example/'), isSecureContext: true, caches: {}, fetch: async () => { fetches++; throw new Error('Unexpected network request'); }, ...overrides.globals };
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  try {
    const offline = await import(`../src/offline.js?test=${++moduleCount}`);
    await run(offline, { serviceWorker, counts: () => ({ registrations, fetches }) });
  } finally {
    for (const [key, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key];
  }
}
function fakeWorker(buildId, complete = true) {
  const messages = [];
  return { scriptURL: `https://game.example/sw.js?build=${buildId}`, state: 'activated', messages,
    addEventListener() {}, removeEventListener() {},
    postMessage(message, ports) { messages.push(message.type); ports[0].postMessage({ buildId, complete, failure: '' }); },
  };
}

test('opening the offline panel never registers a worker or accesses the network', async () => {
  await withBrowser({}, async (offline, browser) => {
    const status = await offline.refreshOfflineStatus();
    assert.equal(status.state, 'not-installed');
    assert.equal(status.canPlayOffline, false);
    assert.deepEqual(browser.counts(), { registrations: 0, fetches: 0 });
  });
});

test('Prepare requested during a pending panel refresh is queued and never silently dropped', async () => {
  let resolveRegistration, releaseFetches = 0;
  const pendingRegistration = new Promise((resolve) => { resolveRegistration = resolve; });
  await withBrowser({ serviceWorker: { getRegistration: async () => pendingRegistration }, globals: {
    fetch: async () => { releaseFetches++; return new Response('Not found', { status: 404 }); },
  } }, async (offline) => {
    const refreshed = offline.refreshOfflineStatus();
    const prepared = offline.prepareOffline();
    await Promise.resolve();
    assert.equal(releaseFetches, 0);
    resolveRegistration(null);
    assert.equal((await refreshed).state, 'not-installed');
    assert.equal((await prepared).state, 'unavailable');
    assert.equal(releaseFetches, 1);
  });
});

test('fresh offline launch obtains truthful cache readiness without a network request', async () => {
  const active = fakeWorker('a'.repeat(20));
  await withBrowser({ serviceWorker: { controller: active, getRegistration: async () => ({ active }) } }, async (offline, browser) => {
    const status = await offline.refreshOfflineStatus();
    assert.equal(status.state, 'ready');
    assert.equal(status.canPlayOffline, true);
    assert.equal(status.installedBuildId, 'a'.repeat(20));
    assert.deepEqual(browser.counts(), { registrations: 0, fetches: 0 });
  });
});

test('first installation reports cached readiness and explicitly requires reopening the uncontrolled window', async () => {
  const active = fakeWorker('a'.repeat(20));
  await withBrowser({ serviceWorker: { getRegistration: async () => ({ active }) } }, async (offline) => {
    const status = await offline.refreshOfflineStatus();
    assert.equal(status.canPlayOffline, true);
    assert.equal(status.needsReopen, true);
    assert.match(status.message, /close and reopen the game once before testing offline/);
  });
});

test('local PC server release 404 cannot register or silently cache the working copy', async () => {
  await withBrowser({ globals: { fetch: async () => new Response('Not found', { status: 404 }) } }, async (offline, browser) => {
    const status = await offline.prepareOffline();
    assert.equal(status.state, 'unavailable');
    assert.equal(status.canPlayOffline, false);
    assert.equal(browser.counts().registrations, 0);
  });
});

test('HTML sign-in response cannot cause worker registration', async () => {
  await withBrowser({ globals: { fetch: async () => new Response('<html>Sign in</html>', { headers: { 'Content-Type': 'text/html' } }) } }, async (offline, browser) => {
    const status = await offline.prepareOffline();
    assert.equal(status.state, 'error');
    assert.match(status.message, /could not be verified/);
    assert.equal(browser.counts().registrations, 0);
  });
});

test('save-before-update only returns close-all-windows instructions and retains old readiness', async () => {
  const active = fakeWorker('a'.repeat(20)), waiting = fakeWorker('b'.repeat(20));
  await withBrowser({ serviceWorker: { controller: active, getRegistration: async () => ({ active, waiting }) } }, async (offline) => {
    const status = await offline.applyUpdate();
    assert.equal(status.state, 'update-ready');
    assert.equal(status.canPlayOffline, true);
    assert.equal(status.canApplyUpdate, true);
    assert.match(status.message, /Close all game windows/);
    assert.deepEqual(active.messages, ['COLOSSUS_OFFLINE_STATUS']);
    assert.deepEqual(waiting.messages, ['COLOSSUS_OFFLINE_STATUS']);
  });
});

test('partial cache eviction cannot be reported as offline-ready', async () => {
  const active = fakeWorker('a'.repeat(20), false);
  await withBrowser({ serviceWorker: { controller: active, getRegistration: async () => ({ active }) } }, async (offline) => {
    const status = await offline.refreshOfflineStatus();
    assert.equal(status.state, 'not-installed');
    assert.equal(status.canPlayOffline, false);
  });
});

test('prepare repairs an evicted cache using a separate worker and keeps the same build ID', async () => {
  const active = fakeWorker(BUILD_ID, false), waiting = fakeWorker(BUILD_ID);
  waiting.state = 'installed';
  let reg = { active }, registeredUrl;
  const release = { app: 'colossus-wake', schemaVersion: 1, buildId: BUILD_ID, files: [{ url: '/index.html' }, { url: '/src/build-info.js' }] };
  await withBrowser({ serviceWorker: {
    controller: active,
    getRegistration: async () => reg,
    register: async (url) => { registeredUrl = url; waiting.scriptURL = new URL(url, 'https://game.example').href; reg = { active, waiting }; return reg; },
  }, globals: { fetch: async () => new Response(JSON.stringify(release), { headers: { 'Content-Type': 'application/json' } }) } }, async (offline) => {
    const status = await offline.prepareOffline();
    assert.match(registeredUrl, new RegExp(`^/sw\\.js\\?build=${BUILD_ID}&repair=\\d{13,20}$`));
    assert.equal(status.state, 'update-ready');
    assert.equal(status.canPlayOffline, false);
    assert.equal(status.canApplyUpdate, true);
    assert.equal(status.updateBuildId, BUILD_ID);
  });
});
