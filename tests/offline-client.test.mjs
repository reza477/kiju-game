import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import { BUILD_ID } from '../src/build-info.js';

const releaseWorkerSource = await readFile(new URL('../src/release-fetch-worker.js', import.meta.url), 'utf8');
let moduleCount = 0;
async function withBrowser(overrides, run) {
  const saved = new Map();
  const keys = ['navigator', 'location', 'isSecureContext', 'caches', 'fetch', 'window', 'document', 'Worker', 'setTimeout', 'clearTimeout', 'performance'];
  for (const key of keys) saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  let registrations = 0, fetches = 0;
  const workers = [];
  // Execute the actual classic-worker transport in an isolated realm. Main
  // client tests still use fake browser APIs; transport behavior is not a
  // second hand-written implementation of its status/MIME/security rules.
  class BrowserWorker {
    constructor(url) {
      this.url = url; this.terminated = false; this.handlers = new Map(); this.timers = new Set(); workers.push(this);
      const self = {addEventListener: (name, listener) => this.handlers.set(name, listener),
        postMessage: data => queueMicrotask(() => {if (!this.terminated) this.onmessage?.({data});})};
      vm.runInNewContext(releaseWorkerSource, {self, AbortController, fetch: (...args) => globalThis.fetch(...args),
        setTimeout: (callback, ms) => {const id = setTimeout(() => {this.timers.delete(id); callback();}, ms); this.timers.add(id); return id;},
        clearTimeout: id => {clearTimeout(id); this.timers.delete(id);}});
    }
    postMessage(data) {queueMicrotask(() => {if (!this.terminated) void this.handlers.get('message')?.({data});});}
    terminate() {this.terminated = true; for (const id of this.timers) clearTimeout(id); this.timers.clear();}
  }
  const serviceWorker = Object.assign(new EventTarget(), { controller: null, getRegistration: async () => null, register: async () => { registrations++; throw new Error('Unexpected registration'); }, ...overrides.serviceWorker });
  let reloads = 0; const address = new URL('https://game.example/'); address.reload = () => { reloads++; };
  const doc = Object.assign(new EventTarget(), {hidden: false});
  const values = { window: new EventTarget(), document: doc, navigator: { serviceWorker, onLine: true }, location: address, isSecureContext: true, caches: {}, Worker: BrowserWorker, fetch: async () => { fetches++; throw new Error('Unexpected network request'); }, ...overrides.globals };
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  try {
    const offline = await import(`../src/offline.js?test=${++moduleCount}`);
    await run(offline, { serviceWorker, workers, defaultWorker: BrowserWorker, counts: () => ({ registrations, fetches, reloads }) });
  } finally {
    for (const worker of workers) worker.terminate();
    for (const [key, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key];
  }
}

const validRelease = {app: 'colossus-wake', schemaVersion: 1, buildId: BUILD_ID, files: [{url: '/index.html'}, {url: '/src/build-info.js'}]};

function startupClock() {
  let now = 0, sequence = 0; const timers = new Map();
  return {
    timers,
    globals: {
      performance: {now: () => now},
      setTimeout: (callback, ms) => {const id = ++sequence; timers.set(id, {callback, ms, at: now + ms}); return id;},
      clearTimeout: id => timers.delete(id),
    },
    jumpWithoutCallbacks(ms) {now += ms;},
    advance(ms, {blocked = false} = {}) {
      const until = now + ms;
      if (blocked) now = until;
      while (true) {
        const due = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        if (!blocked) now = due[1].at;
        timers.delete(due[0]); due[1].callback();
      }
      now = until;
    },
  };
}

test('metadata transport terminates after success and main validates the descriptor independently', async () => {
  const active = fakeWorker(BUILD_ID);
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active})}, globals: {
    fetch: async () => new Response(JSON.stringify(validRelease), {headers: {'Content-Type': 'application/json'}}),
  }}, async (offline, browser) => {
    assert.equal((await offline.prepareOffline()).canPlayOffline, true);
    assert.equal(browser.workers.length, 1); assert.equal(browser.workers[0].terminated, true);
    let invalidWorker;
    globalThis.Worker = class {
      constructor() {invalidWorker = this; queueMicrotask(() => this.onmessage({data: {type: 'release-ready'}}));}
      postMessage() {queueMicrotask(() => this.onmessage({data: {type: 'release-result', release: {app: 'other-app'}}}));}
      terminate() {this.terminated = true;}
    };
    const result = await offline.prepareOffline();
    assert.equal(result.state, 'error'); assert.match(result.message, /valid Colossus Wake release/);
    assert.equal(invalidWorker.terminated, true); assert.equal(browser.counts().registrations, 0);
  });
});

test('worker load failure is cleaned up and the next manual attempt creates a fresh transport', async () => {
  const active = fakeWorker(BUILD_ID);
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active})}, globals: {
    fetch: async () => new Response(JSON.stringify(validRelease), {headers: {'Content-Type': 'application/json'}}),
  }}, async (offline, browser) => {
    let failedWorker, prevented = false, attempts = 0;
    globalThis.Worker = class {
      constructor(url) {
        if (++attempts > 1) return new browser.defaultWorker(url);
        failedWorker = this;
        queueMicrotask(() => this.onerror({preventDefault() {prevented = true;}}));
      }
      postMessage() {}
      terminate() {this.terminated = true;}
    };
    assert.match((await offline.prepareOffline()).message, /could not run/);
    assert.equal(failedWorker.terminated, true); assert.equal(prevented, true);
    assert.equal((await offline.prepareOffline()).canPlayOffline, true);
    assert.equal(attempts, 2); assert.equal(browser.workers[0].terminated, true);
  });
});

test('a 31.5-second startup stall does not spend the observable startup budget or delay the queued request', async () => {
  const clock = startupClock(); let worker;
  const active = fakeWorker(BUILD_ID);
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active})}, globals: {
    ...clock.globals,
    Worker: class {
      constructor() {worker = this; this.commands = [];}
      postMessage(data) {this.commands.push(data);}
      terminate() {this.terminated = true;}
    },
  }}, async offline => {
    const waiting = offline.prepareOffline(); await Promise.resolve();
    assert.deepEqual(worker.commands, [{type: 'fetch-release'}]);
    assert.deepEqual([...clock.timers.values()].map(timer => timer.ms), [250, 90000]);
    clock.advance(31500, {blocked: true}); assert.notEqual(worker.terminated, true);
    worker.onmessage({data: {type: 'release-ready'}});
    // Advancing any amount of main-thread time cannot expire the worker's
    // completed response: there is deliberately no main response timer.
    assert.equal(clock.timers.size, 0); clock.advance(100000);
    worker.onmessage({data: {type: 'release-result', release: validRelease}});
    assert.equal((await waiting).canPlayOffline, true);
    assert.equal(worker.terminated, true); assert.equal(clock.timers.size, 0);
  });
});

test('a responsive page terminates a never-ready worker after 30 seconds of startup opportunity', async () => {
  const clock = startupClock(); let worker;
  await withBrowser({globals: {
    ...clock.globals,
    Worker: class {constructor() {worker = this;} postMessage() {} terminate() {this.terminated = true;}},
  }}, async offline => {
    const waiting = offline.prepareOffline(); await Promise.resolve();
    clock.advance(29999); assert.notEqual(worker.terminated, true); clock.advance(1);
    assert.match((await waiting).message, /could not start/); assert.equal(worker.terminated, true);
    assert.equal(worker.onmessage, null); assert.equal(worker.onerror, null); assert.equal(clock.timers.size, 0);
  });
});

test('repeated stalls cannot exceed the 90-second startup ceiling and a later attempt can succeed', async () => {
  const clock = startupClock(), created = []; const active = fakeWorker(BUILD_ID);
  await withBrowser({serviceWorker: {controller: active, getRegistration: async () => ({active})}, globals: {
    ...clock.globals,
    Worker: class {constructor() {created.push(this);} postMessage() {} terminate() {this.terminated = true;}},
  }}, async offline => {
    const waiting = offline.prepareOffline(); await Promise.resolve();
    for (let i = 0; i < 4; i++) {clock.advance(20000, {blocked: true}); assert.notEqual(created[0].terminated, true);}
    clock.advance(10000, {blocked: true});
    assert.match((await waiting).message, /could not start/); assert.equal(created[0].terminated, true);
    assert.equal(clock.timers.size, 0);
    const retry = offline.prepareOffline(); await Promise.resolve();
    assert.equal(created.length, 2);
    created[1].onmessage({data: {type: 'release-ready'}});
    assert.equal(clock.timers.size, 0);
    created[1].onmessage({data: {type: 'release-result', release: validRelease}});
    assert.equal((await retry).canPlayOffline, true); assert.equal(created[1].terminated, true);
    assert.equal(clock.timers.size, 0);
  });
});

test('ready delivered before overdue timers still cannot bypass the absolute startup ceiling', async () => {
  const clock = startupClock(); let worker;
  await withBrowser({globals: {
    ...clock.globals,
    Worker: class {constructor() {worker = this;} postMessage() {} terminate() {this.terminated = true;}},
  }}, async (offline, browser) => {
    const waiting = offline.prepareOffline(); await Promise.resolve();
    clock.jumpWithoutCallbacks(90000);
    assert.equal(clock.timers.size, 2, 'The overdue timer callbacks have not run');
    worker.onmessage({data: {type: 'release-ready'}});
    assert.match((await waiting).message, /could not start/);
    assert.equal(worker.terminated, true); assert.equal(clock.timers.size, 0);
    assert.equal(browser.counts().registrations, 0);
  });
});

test('unreadable and unexpected worker responses terminate and cannot register a service worker', async () => {
  for (const mode of ['messageerror', 'unexpected']) {
    let worker;
    await withBrowser({globals: {Worker: class {
      constructor() {worker = this; queueMicrotask(() => mode === 'messageerror' ? this.onmessageerror() : this.onmessage({data: {type: 'not-the-protocol'}}));}
      postMessage() {}
      terminate() {this.terminated = true;}
    }}}, async (offline, browser) => {
      assert.equal((await offline.prepareOffline()).state, 'error');
      assert.equal(worker.terminated, true); assert.equal(browser.counts().registrations, 0);
    });
  }
});
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
