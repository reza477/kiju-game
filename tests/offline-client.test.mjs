import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD_ID } from '../src/build-info.js';

let moduleCount = 0;
async function withBrowser(overrides, run) {
  const saved = new Map();
  const keys = ['navigator', 'location', 'isSecureContext', 'caches', 'fetch', 'window', 'document'];
  for (const key of keys) saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  let registrations = 0, fetches = 0;
  const serviceWorker = Object.assign(new EventTarget(), { controller: null, getRegistration: async () => null, register: async () => { registrations++; throw new Error('Unexpected registration'); }, ...overrides.serviceWorker });
  let reloads = 0; const address = new URL('https://game.example/'); address.reload = () => { reloads++; };
  const doc = Object.assign(new EventTarget(), {hidden: false});
  const values = { window: new EventTarget(), document: doc, navigator: { serviceWorker, onLine: true }, location: address, isSecureContext: true, caches: {}, fetch: async () => { fetches++; throw new Error('Unexpected network request'); }, ...overrides.globals };
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  try {
    const offline = await import(`../src/offline.js?test=${++moduleCount}`);
    await run(offline, { serviceWorker, counts: () => ({ registrations, fetches, reloads }) });
  } finally {
    for (const [key, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key];
  }
}
function fakeWorker(buildId, complete = true, overrides = {}) {
  const messages = [];
  return { scriptURL: 'https://game.example/sw.js', state: 'activated', messages,
    addEventListener() {}, removeEventListener() {},
    postMessage(message, ports) { messages.push(message.type); if (message.type === 'COLOSSUS_ACTIVATE') { this.state = 'activated'; ports[0].postMessage({activating: true}); }
      else if (message.type === 'COLOSSUS_REPAIR') { complete = true; ports[0].postMessage({buildId, complete}); }
      else ports[0].postMessage({protocol: 2, buildId, complete, clientComplete: complete, failure: ''}); }, ...overrides,
  };
}

test('opening the offline panel never registers a worker or accesses the network', async () => {
  await withBrowser({}, async (offline, browser) => {
    const status = await offline.refreshOfflineStatus();
    assert.equal(status.state, 'not-installed');
    assert.equal(status.canPlayOffline, false);
    assert.deepEqual(browser.counts(), { registrations: 0, fetches: 0, reloads: 0 });
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
  const active = fakeWorker(BUILD_ID);
  await withBrowser({ serviceWorker: { controller: active, getRegistration: async () => ({ active }) } }, async (offline, browser) => {
    const status = await offline.refreshOfflineStatus();
    assert.equal(status.state, 'ready');
    assert.equal(status.canPlayOffline, true);
    assert.equal(status.installedBuildId, BUILD_ID);
    assert.deepEqual(browser.counts(), { registrations: 0, fetches: 0, reloads: 0 });
  });
});

test('first installation reports cached readiness and explicitly requires reopening the uncontrolled window', async () => {
  const active = fakeWorker(BUILD_ID);
  await withBrowser({ serviceWorker: { getRegistration: async () => ({ active }) } }, async (offline) => {
    const status = await offline.refreshOfflineStatus();
    assert.equal(status.canPlayOffline, true);
    assert.equal(status.needsReopen, true);
    assert.match(status.message, /Reopen to use this offline copy/);
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

test('Save and update confirms a successful save before activation and reload', async () => {
  const active = fakeWorker(BUILD_ID), waiting = fakeWorker('b'.repeat(20)); waiting.state = 'installed'; let saved = 0;
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active, waiting})}}, async (offline, browser) => {
    const result = await offline.applyUpdate({save: () => {saved++; return true;}, canReload: () => true});
    assert.equal(result.state, 'applying'); assert.equal(saved, 2); assert.equal(browser.counts().reloads, 1); assert.ok(waiting.messages.includes('COLOSSUS_ACTIVATE'));
  });
});
test('failed save or combat boundary cannot activate or reload a downloaded update', async () => {
  for (const allowed of [true, false]) {
    const active = fakeWorker(BUILD_ID), waiting = fakeWorker('b'.repeat(20));
    await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active, waiting})}}, async (offline, browser) => {
      const result = await offline.applyUpdate({save: () => false, canReload: () => allowed});
      assert.equal(result.state, 'error'); assert.equal(browser.counts().reloads, 0); assert.ok(!waiting.messages.includes('COLOSSUS_ACTIVATE'));
    });
  }
});
test('a changed safe boundary during activation suppresses reload and keeps playing', async () => {
  const active = fakeWorker(BUILD_ID), waiting = fakeWorker('b'.repeat(20)); let checks = 0;
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active, waiting})}}, async (offline, browser) => {
    const result = await offline.applyUpdate({save: () => true, canReload: () => ++checks === 1});
    assert.match(result.message, /continue/); assert.equal(browser.counts().reloads, 0);
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

test('prepare repairs an evicted cache with the stable existing worker, without re-registering', async () => {
  const active = fakeWorker(BUILD_ID, false);
  const release = {app: 'colossus-wake', schemaVersion: 1, buildId: BUILD_ID, files: [{url: '/index.html'}, {url: '/src/build-info.js'}]};
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active})}, globals: {fetch: async () => new Response(JSON.stringify(release), {headers: {'Content-Type': 'application/json'}})}}, async (offline, browser) => {
    const result = await offline.prepareOffline(); assert.equal(result.canPlayOffline, true); assert.ok(active.messages.includes('COLOSSUS_REPAIR')); assert.equal(browser.counts().registrations, 0);
  });
});
test('automatic opening and lifecycle events are debounced and never reload active play', async () => {
  const active = fakeWorker(BUILD_ID), waiting = fakeWorker('b'.repeat(20)); let discoveries = 0;
  const release = {app: 'colossus-wake', schemaVersion: 1, buildId: 'b'.repeat(20), files: [{url: '/index.html'}, {url: '/src/build-info.js'}]};
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active, waiting})}, globals: {fetch: async () => {discoveries++; return new Response(JSON.stringify(release), {headers: {'Content-Type': 'application/json'}});}}}, async (offline, browser) => {
    offline.startAutomaticUpdates({isTitle: () => false});
    window.dispatchEvent(new Event('online')); window.dispatchEvent(new Event('pageshow')); document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(resolve => setTimeout(resolve, 450));
    assert.equal(discoveries, 1); assert.equal(offline.getOfflineStatus().canApplyUpdate, true); assert.equal(browser.counts().reloads, 0);
    window.dispatchEvent(new Event('online')); await new Promise(resolve => setTimeout(resolve, 450)); assert.equal(discoveries, 1);
  });
});
test('title automatically applies a fully verified waiting release without blocking the initial page', async () => {
  const active = fakeWorker(BUILD_ID), waiting = fakeWorker('b'.repeat(20));
  const release = {app: 'colossus-wake', schemaVersion: 1, buildId: 'b'.repeat(20), files: [{url: '/index.html'}, {url: '/src/build-info.js'}]};
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active, waiting})}, globals: {fetch: async () => new Response(JSON.stringify(release), {headers: {'Content-Type': 'application/json'}})}}, async (offline, browser) => {
    offline.startAutomaticUpdates({isTitle: () => true}); assert.equal(browser.counts().reloads, 0);
    await new Promise(resolve => setTimeout(resolve, 450)); assert.equal(browser.counts().reloads, 1);
  });
});
test('authentication and offline checks retain existing readiness and never claim verified latest', async () => {
  for (const response of [new Response('Denied', {status: 401}), new Response('<html>Login</html>', {headers: {'Content-Type': 'text/html'}})]) {
    const active = fakeWorker(BUILD_ID);
    await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active})}, globals: {fetch: async () => response}}, async (offline) => {
      const result = await offline.checkForUpdate(); assert.equal(result.state, 'error'); assert.equal(result.canPlayOffline, true); assert.equal(result.checkedAt, null);
      navigator.onLine = false; const cached = await offline.checkForUpdate(); assert.equal(cached.state, 'offline'); assert.match(cached.message, /not checked/);
    });
  }
});

test('existing stable registration explicitly checks new worker bytes before selecting a candidate', async () => {
  const active = fakeWorker(BUILD_ID), waiting = fakeWorker('b'.repeat(20)); waiting.state = 'installed';
  let updates = 0, registered;
  const reg = {active, waiting: null, async update() {updates++; this.waiting = waiting;}};
  const release = {app: 'colossus-wake', schemaVersion: 1, buildId: 'b'.repeat(20), files: [{url: '/index.html'}, {url: '/src/build-info.js'}]};
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => reg, register: async url => {registered = url; return reg;}}, globals: {fetch: async () => new Response(JSON.stringify(release), {headers: {'Content-Type': 'application/json'}})}}, async offline => {
    const result = await offline.checkForUpdate(); assert.equal(registered, undefined); assert.equal(updates, 1); assert.equal(result.updateBuildId, release.buildId); assert.equal(result.canApplyUpdate, true);
  });
});

test('a final save failure after asynchronous activation preserves the current page instead of reloading', async () => {
  const active = fakeWorker(BUILD_ID), waiting = fakeWorker('b'.repeat(20)); let saves = 0;
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active, waiting})}}, async (offline, browser) => {
    const result = await offline.applyUpdate({save: () => ++saves === 1, canReload: () => true});
    assert.equal(saves, 2); assert.ok(waiting.messages.includes('COLOSSUS_ACTIVATE')); assert.equal(browser.counts().reloads, 0);
    assert.match(result.message, /latest progress could not be saved/); assert.equal(result.canPlayOffline, true);
  });
});
test('offline before the first complete download never claims to be using a saved release', async () => {
  await withBrowser({}, async offline => {
    navigator.onLine = false;
    const result = await offline.checkForUpdate(); assert.equal(result.state, 'not-installed'); assert.equal(result.canPlayOffline, false); assert.match(result.message, /has not downloaded/); assert.doesNotMatch(result.message, /using saved build/);
  });
});

test('a panel operation cannot remove its existing permanent status subscription', async () => {
  await withBrowser({}, async offline => {
    const observed = [], listener = status => observed.push(status.message);
    const unsubscribe = offline.subscribeOfflineStatus(listener);
    await offline.refreshOfflineStatus({onStatus: listener}); const count = observed.length;
    await offline.refreshOfflineStatus(); assert.ok(observed.length > count);
    unsubscribe(); const after = observed.length; await offline.refreshOfflineStatus(); assert.equal(observed.length, after);
  });
});
for (const title of [false, true]) {
  test(`native late waiting-worker events surface verified readiness and ${title ? 'apply at title' : 'keep active play running'}`, async () => {
    const active = fakeWorker(BUILD_ID);
    const pending = Object.assign(new EventTarget(), fakeWorker('b'.repeat(20)));
    delete pending.addEventListener; delete pending.removeEventListener;
    const reg = Object.assign(new EventTarget(), {active, waiting: null, installing: null});
    const release = {app: 'colossus-wake', schemaVersion: 1, buildId: BUILD_ID, files: [{url: '/index.html'}, {url: '/src/build-info.js'}]};
    let announced = 0;
    await withBrowser({serviceWorker: {controller: active, getRegistration: async () => reg}, globals: {fetch: async () => new Response(JSON.stringify(release), {headers: {'Content-Type': 'application/json'}})}}, async (offline, browser) => {
      offline.startAutomaticUpdates({isTitle: () => title, onReady: () => {announced++;}});
      await new Promise(resolve => setTimeout(resolve, 450)); assert.equal(browser.counts().reloads, 0);
      pending.state = 'installing'; reg.installing = pending; reg.dispatchEvent(new Event('updatefound'));
      pending.state = 'installed'; reg.installing = null; reg.waiting = pending; pending.dispatchEvent(new Event('statechange'));
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(announced, 1); assert.equal(offline.getOfflineStatus().canApplyUpdate, true); assert.equal(browser.counts().reloads, title ? 1 : 0);
      assert.equal(pending.messages.includes('COLOSSUS_ACTIVATE'), title);
    });
  });
}
