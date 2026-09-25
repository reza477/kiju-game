import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile, mkdtemp, readdir, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildMobileRelease, sha256} from '../scripts/build-mobile-release.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = await readFile(path.join(ROOT, 'pwa/service-worker.js'), 'utf8');
const ORIGIN = 'https://game.example';
const fullUrl = url => new URL(typeof url === 'string' ? url : url.url, ORIGIN).href;
function fakeCaches({failPut} = {}) {
  const stores = new Map();
  return {stores, async keys() {return [...stores.keys()];}, async has(name) {return stores.has(name);}, async delete(name) {return stores.delete(name);}, async open(name) {
    if (!stores.has(name)) stores.set(name, new Map()); const items = stores.get(name);
    return {async match(url) {return items.get(fullUrl(url))?.clone();}, async put(url, response) {if (failPut?.(name, fullUrl(url))) throw new Error('Quota exceeded'); items.set(fullUrl(url), response.clone());}};
  }};
}
function fixture(buildId = 'a'.repeat(20)) {
  const contents = new Map([['/index.html', `<html>${buildId}</html>`], ['/src/main.js', `export const version = '${buildId}';`], ['/src/build-info.js', `export const BUILD_ID = '${buildId}';`], ['/assets/test.png', 'PNG fixture bytes']]);
  const files = [...contents].map(([url, value]) => ({url, bytes: Buffer.byteLength(value), sha256: sha256(value), type: url.endsWith('.html') ? 'text/html' : 'application/octet-stream'}));
  return {release: {app: 'colossus-wake', schemaVersion: 1, buildId, files}, contents};
}
function workerHarness(fix = fixture(), {cache = fakeCaches(), fetchOverride, clients = []} = {}) {
  const handlers = new Map(), fetches = []; let activated = 0;
  const self = {location: new URL('/sw.js', ORIGIN), clients: {matchAll: async () => [...clients]}, skipWaiting: async () => {activated++;}, addEventListener: (name, callback) => handlers.set(name, callback)};
  const context = vm.createContext({self, caches: cache, crypto: webcrypto, URL, Response, Headers, Map, Set, Array, Uint8Array, Date, AbortController, MessageChannel, setTimeout, clearTimeout, fetch: async (url, options) => {
    fetches.push(url); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    if (fetchOverride) return fetchOverride(url, options);
    return new Response(fix.contents.get(url), {status: fix.contents.has(url) ? 200 : 404});
  }});
  vm.runInContext(template.replace('__RELEASE_DESCRIPTOR__', JSON.stringify(fix.release)), context);
  async function lifecycle(name) {let result; handlers.get(name)({waitUntil: promise => {result = promise;}}); return result;}
  async function message(type = 'COLOSSUS_OFFLINE_STATUS', extra = {}, source) {
    let data, result; handlers.get('message')({data: {type, ...extra}, source, ports: [{postMessage: value => {data = value;}}], waitUntil: promise => {result = promise;}}); await result; return data;
  }
  async function request(url, options = {}) {
    let response; handlers.get('fetch')({clientId: options.clientId || '', resultingClientId: options.resultingClientId || '', request: {url: fullUrl(url), method: options.method || 'GET', mode: options.mode || 'cors'}, respondWith: promise => {response = promise;}}); return response;
  }
  return {cache, fetches, lifecycle, message, status: () => message(), request, buildId: fix.release.buildId, activated: () => activated};
}
const client = (id, buildId, protocol = 2) => ({id, postMessage(message, ports) {assert.equal(message.type, 'COLOSSUS_IDENTIFY_CLIENT'); ports[0].postMessage({protocol, buildId});}});

test('complete stable-URL release verifies all bytes before offline readiness and keeps metadata network-only', async () => {
  const app = workerHarness(); assert.equal((await app.status()).complete, false); await app.lifecycle('install'); assert.equal((await app.status()).complete, true);
  assert.equal(app.fetches.length, 4); assert.match(await (await app.request('/?from=homescreen')).text(), /aaaaaaaa/);
  for (const url of ['/release.json', '/sw.js', '/health', '/diagnostics']) assert.equal(await app.request(url), undefined);
  assert.equal(await app.request('/src/main.js', {method: 'POST'}), undefined); assert.equal(app.fetches.length, 4);
});
for (const failure of ['html', 'missing', 'interrupt', 'quota', 'changed-release']) {
  test(`candidate ${failure} cannot replace the complete previous release`, async () => {
    let fail = false; const cache = fakeCaches({failPut: (name, url) => fail && failure === 'quota' && name.includes('bbbb') && url.endsWith('/src/main.js')});
    const old = workerHarness(fixture(), {cache}); await old.lifecycle('install'); fail = true;
    const fix = fixture('b'.repeat(20));
    const next = workerHarness(fix, {cache, fetchOverride: async url => {
      if (url === '/src/main.js') {
        if (failure === 'interrupt') throw new Error('Connection interrupted');
        if (failure === 'html') return new Response('<html>Sign in</html>');
        if (failure === 'missing') return new Response('Missing', {status: 404});
        if (failure === 'changed-release') return new Response(fixture('c'.repeat(20)).contents.get(url));
      }
      return new Response(fix.contents.get(url));
    }});
    await assert.rejects(next.lifecycle('install')); assert.equal((await next.status()).complete, false); assert.equal((await old.status()).complete, true);
    assert.match(await (await old.request('/src/main.js')).text(), /aaaaaaaa/); assert.equal(await cache.has('colossus-wake-release-' + next.buildId), false);
  });
}
test('redirected success response is never cached even when its body matches', async () => {
  const fix = fixture(); const app = workerHarness(fix, {fetchOverride: async url => {const response = new Response(fix.contents.get(url)); Object.defineProperty(response, 'redirected', {value: true}); return response;}});
  await assert.rejects(app.lifecycle('install'), /Download failed/); assert.equal((await app.status()).complete, false);
});
test('two existing clients retain A bytes after safe B activation, including worker restart and B navigation', async () => {
  const cache = fakeCaches(), a = fixture(), b = fixture('b'.repeat(20));
  // Include a file removed in B: routing must consult the pinned A descriptor.
  a.contents.set('/src/removed.js', 'A-only module'); a.release.files.push({url: '/src/removed.js', bytes: 13, sha256: sha256('A-only module'), type: 'text/javascript'});
  const old = workerHarness(a, {cache}); await old.lifecycle('install');
  const clients = [client('playing-A', a.release.buildId), client('title-A', a.release.buildId)];
  const next = workerHarness(b, {cache, clients}); await next.lifecycle('install');
  assert.equal((await next.message('COLOSSUS_ACTIVATE')).activating, true); assert.equal(next.activated(), 1); await next.lifecycle('activate');
  assert.equal((await old.status()).complete, true);
  const resumedWorker = workerHarness(b, {cache, clients});
  assert.match(await (await resumedWorker.request('/src/main.js', {clientId: 'playing-A'})).text(), /aaaaaaaa/);
  assert.equal(await (await resumedWorker.request('/src/removed.js', {clientId: 'playing-A'})).text(), 'A-only module');
  assert.match(await (await resumedWorker.request('/', {mode: 'navigate', clientId: 'title-A', resultingClientId: 'reloaded-B'})).text(), /bbbbbbbb/);
  assert.match(await (await resumedWorker.request('/src/main.js', {clientId: 'reloaded-B'})).text(), /bbbbbbbb/);
  assert.equal((await resumedWorker.message('COLOSSUS_OFFLINE_STATUS', {buildId: a.release.buildId})).clientComplete, true);
  assert.doesNotMatch(template, /clients\.claim\s*\(/);
});
test('client-pin metadata eviction fails closed and a verified A handshake restores A rather than serving B', async () => {
  const cache = fakeCaches(), old = workerHarness(fixture(), {cache}); await old.lifecycle('install');
  const next = workerHarness(fixture('b'.repeat(20)), {cache, clients: [client('playing-A', old.buildId)]}); await next.lifecycle('install');
  assert.equal((await next.message('COLOSSUS_ACTIVATE')).activating, true); await next.lifecycle('activate');
  await cache.delete('colossus-wake-client-pins-v1');
  const blocked = await next.request('/src/main.js', {clientId: 'playing-A'}); assert.equal(blocked.status, 503); assert.doesNotMatch(await blocked.text(), /bbbbbbbb/);
  const restored = await next.message('COLOSSUS_OFFLINE_STATUS', {buildId: old.buildId}, {id: 'playing-A'}); assert.equal(restored.clientComplete, true);
  assert.match(await (await next.request('/src/main.js', {clientId: 'playing-A'})).text(), /aaaaaaaa/);
  await next.message('COLOSSUS_OFFLINE_STATUS', {buildId: 'c'.repeat(20)}, {id: 'unknown-client'});
  assert.equal((await next.request('/src/main.js', {clientId: 'unknown-client'})).status, 503);
  assert.match(await (await next.request('/', {mode: 'navigate', resultingClientId: 'fresh-B'})).text(), /bbbbbbbb/);
  assert.match(await (await next.request('/src/main.js', {clientId: 'fresh-B'})).text(), /bbbbbbbb/);
});

test('legacy clients or clients without a complete old cache block activation', async () => {
  for (const openClient of [client('legacy', 'a'.repeat(20), 1), client('missing', 'c'.repeat(20))]) {
    const app = workerHarness(fixture(), {clients: [openClient]}); await app.lifecycle('install');
    const result = await app.message('COLOSSUS_ACTIVATE'); assert.ok(result.error); assert.equal(app.activated(), 0);
  }
});
test('a new unidentified window during activation blocks the controller switch', async () => {
  const clients = [], app = workerHarness(fixture(), {clients}); await app.lifecycle('install');
  clients.push({id: 'first', postMessage(message, ports) {clients.push({id: 'racing'}); ports[0].postMessage({protocol: 2, buildId: app.buildId});}});
  const result = await app.message('COLOSSUS_ACTIVATE'); assert.match(result.error, /window opened/); assert.equal(app.activated(), 0);
});
for (const missingFile of ['/index.html', '/src/main.js', 'entire-cache']) {
  test(`eviction of ${missingFile} produces independent recovery and transactional same-worker repair`, async () => {
    const cache = fakeCaches(), app = workerHarness(fixture(), {cache}); await app.lifecycle('install');
    const name = 'colossus-wake-release-' + app.buildId;
    if (missingFile === 'entire-cache') await cache.delete(name); else cache.stores.get(name).delete(fullUrl(missingFile));
    assert.equal((await app.status()).complete, false); assert.match(await (await app.request('/', {mode: 'navigate'})).text(), /Repair offline play/);
    assert.equal((await app.request('/src/main.js')).status, missingFile === '/index.html' ? 200 : 503);
    const repair = await app.message('COLOSSUS_REPAIR'); assert.equal(repair.complete, true); assert.equal(app.activated(), 0);
    assert.match(await (await app.request('/', {mode: 'navigate'})).text(), /aaaaaaaa/);
    assert.match(await (await app.request('/__colossus-recovery.js')).text(), /COLOSSUS_REPAIR/);
  });
}
test('failed repair retains surviving old bytes and never touches client/save storage', async () => {
  const cache = fakeCaches(), old = workerHarness(fixture(), {cache}); await old.lifecycle('install');
  cache.stores.get('colossus-wake-release-' + old.buildId).delete(fullUrl('/assets/test.png'));
  const broken = workerHarness(fixture(), {cache, fetchOverride: async () => {throw new Error('Offline');}});
  assert.match((await broken.message('COLOSSUS_REPAIR')).error, /Offline/);
  assert.match(await (await broken.request('/src/main.js')).text(), /aaaaaaaa/);
  assert.doesNotMatch(template, /localStorage|indexedDB/);
});

test('partial repaired-copy eviction falls back only to identical same-build files, including after worker restart', async () => {
  const cache = fakeCaches(), fix = fixture(), old = workerHarness(fix, {cache}); await old.lifecycle('install');
  assert.equal((await old.message('COLOSSUS_REPAIR')).complete, true);
  const repairedName = (await cache.keys()).find(name => name.includes('-repair-')); assert.ok(repairedName);
  cache.stores.get(repairedName).delete(fullUrl('/src/main.js'));
  const b = workerHarness(fixture('b'.repeat(20)), {cache}); await b.lifecycle('install');
  const restarted = workerHarness(fix, {cache});
  assert.match(await (await restarted.request('/', {mode: 'navigate', resultingClientId: 'still-A'})).text(), /aaaaaaaa/);
  assert.match(await (await restarted.request('/src/main.js', {clientId: 'still-A'})).text(), /aaaaaaaa/);
  cache.stores.get('colossus-wake-release-' + old.buildId).delete(fullUrl('/src/main.js'));
  const blocked = await b.request('/src/main.js', {clientId: 'still-A'});
  assert.equal(blocked.status, 503); assert.doesNotMatch(await blocked.text(), /bbbbbbbb/);
  assert.equal(b.fetches.length, 4, 'Missing A never falls through to a B network response');
});

test('standalone recovery rejects login HTML and can download a newer verified release without main.js', async () => {
  const app = workerHarness(); await app.lifecycle('install');
  const script = await (await app.request('/__colossus-recovery.js')).text();
  for (const login of [true, false]) {
    let click, registrations = 0, reloads = 0, repairs = 0, activations = 0;
    const text = {textContent: ''}, button = {disabled: false, addEventListener(type, callback) {assert.equal(type, 'click'); click = callback;}};
    function worker(buildId) {
      return {scriptURL: ORIGIN + '/sw.js', state: 'installed', addEventListener() {}, removeEventListener() {}, postMessage(message, ports) {
        if (message.type === 'COLOSSUS_OFFLINE_STATUS') ports[0].postMessage({buildId, complete: true});
        else if (message.type === 'COLOSSUS_ACTIVATE') {activations++; this.state = 'activated'; ports[0].postMessage({activating: true});}
        else {repairs++; assert.fail('A cannot be repaired using B bytes');}
      }};
    }
    const active = worker(app.buildId), waiting = worker('b'.repeat(20));
    const registration = {active, waiting: null, async update() {registrations++; this.waiting = waiting;}};
    const browser = vm.createContext({URL, MessageChannel, AbortController, setTimeout, clearTimeout,
      document: {getElementById: id => id === 'recovery-status' ? text : button}, location: {reload() {reloads++;}},
      localStorage: {getItem() {assert.fail('Recovery cannot access saves');}, setItem() {assert.fail('Recovery cannot change saves');}},
      navigator: {serviceWorker: {addEventListener() {}, getRegistration: async () => registration, register: async () => {assert.fail('Stable recovery must update the existing registration directly');}}},
      fetch: async (url, options) => {assert.equal(url, '/release.json'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store'); return login ? new Response('<html>Sign in</html>', {headers: {'Content-Type': 'text/html'}}) : new Response(JSON.stringify(fixture('b'.repeat(20)).release), {headers: {'Content-Type': 'application/json'}});},
    });
    vm.runInContext(script, browser); await click();
    if (login) {assert.equal(registrations, 0); assert.equal(reloads, 0); assert.match(text.textContent, /sign in/); assert.equal(button.disabled, false);}
    else {assert.equal(registrations, 1); assert.equal(activations, 1); assert.equal(reloads, 1); assert.equal(repairs, 0);}
  }
});

test('release packaging is deterministic, runtime-only, and writes identical PC/release build IDs', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'colossus-release-test-'));
  try {
    for (const dir of ['src', 'vendor', 'assets', 'pwa', 'tests']) await mkdir(path.join(root, dir));
    for (const file of ['pwa/service-worker.js', 'pwa/manifest.webmanifest', 'assets/icon.svg']) await writeFile(path.join(root, file), await readFile(path.join(ROOT, file)));
    await writeFile(path.join(root, 'index.html'), '<html><head></head><body>Game</body></html>');
    await writeFile(path.join(root, 'src/main.js'), 'export const game = true;');
    await writeFile(path.join(root, 'src/style.css'), 'body { color: white; }');
    await writeFile(path.join(root, 'src/notes.md'), 'not runtime');
    await writeFile(path.join(root, 'vendor/three.js'), 'export const THREE = {};');
    await writeFile(path.join(root, 'vendor/LICENSE'), 'Dependency license');
    await writeFile(path.join(root, '.env'), 'NOT_FOR_RELEASE=secret');
    await writeFile(path.join(root, 'tests/diagnostics.js'), 'not for release');
    const untouchedIdentity = "export const BUILD_ID = 'source-checkpoint';\n";
    await writeFile(path.join(root, 'src/build-info.js'), untouchedIdentity);
    const isolatedOutput = path.join(root, 'isolated-verification');
    const isolated = await buildMobileRelease({ root, outputRoot: isolatedOutput, writeSourceBuildInfo: false });
    assert.equal(isolated.sourceBuildInfoWritten, false);
    assert.equal(isolated.output, path.join(isolatedOutput, isolated.buildId));
    assert.equal(await readFile(path.join(root, 'src/build-info.js'), 'utf8'), untouchedIdentity);
    assert.match(await readFile(path.join(isolated.output, 'src/build-info.js'), 'utf8'), new RegExp(isolated.buildId));
    assert.equal(await readFile(path.join(root, 'src/main.js'), 'utf8'), 'export const game = true;');
    const first = await buildMobileRelease({ root });
    const second = await buildMobileRelease({ root });
    assert.equal(first.sourceBuildInfoWritten, true);
    assert.equal(first.buildId, isolated.buildId);
    assert.equal(first.buildId, second.buildId);
    const release = JSON.parse(await readFile(path.join(first.output, 'release.json'), 'utf8'));
    const sourceBuild = await readFile(path.join(root, 'src/build-info.js'), 'utf8');
    assert.equal(sourceBuild, await readFile(path.join(first.output, 'src/build-info.js'), 'utf8'));
    assert.match(sourceBuild, new RegExp(first.buildId));
    assert.equal(await readFile(path.join(first.output, 'src/main.js'), 'utf8'), await readFile(path.join(root, 'src/main.js'), 'utf8'));
    for (const file of release.files) {
      const bytes = await readFile(path.join(first.output, file.url.slice(1)));
      assert.equal(sha256(bytes), file.sha256);
      assert.equal(bytes.length, file.bytes);
      assert.doesNotMatch(file.url, /(?:\.env|tests|notes\.md|health|diagnostics|release\.json|sw\.js)/);
    }
    assert.deepEqual((await readdir(first.output)).sort(), ['assets', 'icons', 'index.html', 'manifest.webmanifest', 'release.json', 'src', 'sw.js', 'vendor']);
    assert.match(await readFile(path.join(first.output, 'index.html'), 'utf8'), /apple-touch-icon/);
    for (const [name, size] of [['apple-touch-icon', 180], ['icon-192', 192], ['icon-512', 512]]) {
      const png = await readFile(path.join(first.output, 'icons', name + '.png'));
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
      assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
    }
    await writeFile(path.join(root, 'src/main.js'), 'export const game = "changed";');
    const changed = await buildMobileRelease({ root });
    assert.notEqual(changed.buildId, first.buildId);
  } finally {
    // mkdtemp supplies the exact isolated test directory, never a project path.
    assert.ok(root.startsWith(path.join(os.tmpdir(), 'colossus-release-test-')));
    await rm(root, { recursive: true, force: true });
  }
});
