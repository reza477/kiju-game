import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildMobileRelease, sha256 } from '../scripts/build-mobile-release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = await readFile(path.join(ROOT, 'pwa/service-worker.js'), 'utf8');
const ORIGIN = 'https://game.example';
const fullUrl = (url) => new URL(typeof url === 'string' ? url : url.url, ORIGIN).href;

function fakeCaches({ failPut } = {}) {
  const stores = new Map();
  return {
    stores,
    async keys() { return [...stores.keys()]; },
    async has(name) { return stores.has(name); },
    async delete(name) { return stores.delete(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const items = stores.get(name);
      return {
        async match(url) { return items.get(fullUrl(url))?.clone(); },
        async put(url, response) { if (failPut?.(name, fullUrl(url))) throw new Error('Quota exceeded'); items.set(fullUrl(url), response.clone()); },
      };
    },
  };
}
function fixture(buildId = 'a'.repeat(20)) {
  const contents = new Map([['/index.html', `<html>${buildId}</html>`], ['/src/main.js', `export const version = '${buildId}';`], ['/src/build-info.js', `export const BUILD_ID = '${buildId}';`], ['/assets/test.png', 'PNG fixture bytes']]);
  const files = [...contents].map(([url, value]) => ({ url, bytes: Buffer.byteLength(value), sha256: sha256(value), type: url.endsWith('.html') ? 'text/html' : 'application/octet-stream' }));
  return { release: { app: 'colossus-wake', schemaVersion: 1, buildId, files }, contents };
}
function workerHarness(fix = fixture(), { cache = fakeCaches(), fetchOverride, scriptBuildId = fix.release.buildId, repair = '' } = {}) {
  const handlers = new Map(), fetches = [];
  const self = { location: new URL(`/sw.js?build=${scriptBuildId}${repair ? '&repair=' + repair : ''}`, ORIGIN), addEventListener: (name, callback) => handlers.set(name, callback) };
  const context = vm.createContext({ self, caches: cache, crypto: webcrypto, URL, Response, Headers, Map, Array, Uint8Array, fetch: async (url) => {
    fetches.push(url);
    if (fetchOverride) return fetchOverride(url);
    return new Response(fix.contents.get(url), { status: fix.contents.has(url) ? 200 : 404 });
  } });
  vm.runInContext(template.replace('__RELEASE_DESCRIPTOR__', JSON.stringify(fix.release)), context);
  async function lifecycle(name) { let result; handlers.get(name)({ waitUntil: (promise) => { result = promise; } }); return result; }
  async function status() {
    let data, result;
    handlers.get('message')({ data: { type: 'COLOSSUS_OFFLINE_STATUS' }, ports: [{ postMessage: (value) => { data = value; } }], waitUntil: (promise) => { result = promise; } });
    await result; return data;
  }
  async function request(url, options = {}) {
    let response;
    handlers.get('fetch')({ request: { url: fullUrl(url), method: options.method || 'GET', mode: options.mode || 'cors' }, respondWith: (promise) => { response = promise; } });
    return response;
  }
  return { cache, fetches, lifecycle, status, request, buildId: fix.release.buildId };
}

test('a complete release is verified before offline readiness and serves offline without network', async () => {
  const app = workerHarness();
  assert.equal((await app.status()).complete, false);
  await app.lifecycle('install');
  assert.equal((await app.status()).complete, true);
  assert.equal(app.fetches.length, 4);
  const response = await app.request('/?from=homescreen');
  assert.match(await response.text(), /aaaaaaaa/);
  assert.equal(app.fetches.length, 4);
  assert.equal(await app.request('/health'), undefined);
  assert.equal(await app.request('/release.json'), undefined);
  assert.equal(await app.request('/sw.js?build=next'), undefined);
  assert.equal(await app.request('/diagnostics'), undefined);
  assert.equal(await app.request('/src/main.js', { method: 'POST' }), undefined);
});

test('a successful HTTP login page is rejected by digest; failed new build preserves old cache', async () => {
  const cache = fakeCaches();
  const old = workerHarness(fixture(), { cache }); await old.lifecycle('install');
  const next = workerHarness(fixture('b'.repeat(20)), { cache, fetchOverride: async () => new Response('<html>Sign in</html>', { status: 200 }) });
  await assert.rejects(next.lifecycle('install'), /Integrity check failed/);
  assert.equal((await next.status()).complete, false);
  assert.equal((await old.status()).complete, true);
  assert.equal(await cache.has('colossus-wake-release-' + next.buildId), false);
  assert.match(await (await old.request('/')).text(), /aaaaaaaa/);
});

test('quota or download failure never leaves a complete partial release', async () => {
  const cache = fakeCaches({ failPut: (name, url) => url.endsWith('/src/main.js') });
  const app = workerHarness(fixture(), { cache });
  await assert.rejects(app.lifecycle('install'), /Quota exceeded/);
  assert.equal((await app.status()).complete, false);
  assert.deepEqual(await cache.keys(), []);
  const brokenNetwork = workerHarness(fixture(), { fetchOverride: async () => { throw new Error('Offline'); } });
  await assert.rejects(brokenNetwork.lifecycle('install'), /Offline/);
  assert.equal((await brokenNetwork.status()).complete, false);
});

test('waiting update never changes the old game; natural activation cleans only older game caches', async () => {
  const cache = fakeCaches();
  const old = workerHarness(fixture(), { cache }); await old.lifecycle('install');
  await cache.open('unrelated-application');
  const next = workerHarness(fixture('b'.repeat(20)), { cache }); await next.lifecycle('install');
  assert.match(await (await old.request('/')).text(), /aaaaaaaa/);
  assert.match(await (await next.request('/')).text(), /bbbbbbbb/);
  assert.equal((await old.status()).complete, true);
  assert.equal((await next.status()).complete, true);
  assert.doesNotMatch(template, /self\.skipWaiting\s*\(|clients\.claim\s*\(/);
  // Browser invokes activate only after prior controlled windows have closed.
  await next.lifecycle('activate');
  assert.equal(await cache.has('colossus-wake-release-' + old.buildId), false);
  assert.equal(await cache.has('unrelated-application'), true);
  assert.equal((await next.status()).complete, true);
});

test('storage loss invalidates readiness and cannot pull one file from a newer network build', async () => {
  const app = workerHarness(); await app.lifecycle('install');
  app.cache.stores.get('colossus-wake-release-' + app.buildId).delete(fullUrl('/src/main.js'));
  assert.equal((await app.status()).complete, false);
  const response = await app.request('/src/main.js');
  assert.equal(response.status, 503);
  assert.equal(app.fetches.length, 4);
});

for (const missingFile of ['/index.html', '/src/main.js', 'entire-cache']) {
  test(`missing ${missingFile} loads worker-backed recovery, repairs completely, and waits for safe activation`, async () => {
    const fix = fixture(), cache = fakeCaches();
    const old = workerHarness(fix, { cache }); await old.lifecycle('install');
    const oldName = 'colossus-wake-release-' + old.buildId;
    if (missingFile === 'entire-cache') await cache.delete(oldName);
    else cache.stores.get(oldName).delete(fullUrl(missingFile));
    const html = await old.request('/', { mode: 'navigate' });
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-security-policy'), /script-src 'self'/);
    const markup = await html.text();
    assert.match(markup, /Repair offline play/);
    assert.match(markup, /<script defer src="\/__colossus-recovery.js">/);
    assert.doesNotMatch(markup, /\/src\/main.js/);
    const script = await (await old.request('/__colossus-recovery.js')).text();
    assert.match((await old.request('/__colossus-recovery.css')).headers.get('content-type'), /text\/css/);
    assert.match((await old.request('/__colossus-recovery.svg')).headers.get('content-type'), /image\/svg\+xml/);
    assert.equal(old.fetches.length, 4);
    let click, online = false, repairs = 0, repaired, network = 0;
    const status = { textContent: '' };
    const button = { disabled: false, addEventListener(name, handler) { assert.equal(name, 'click'); click = handler; } };
    function clientWorker(app, scriptURL, state) {
      return { scriptURL, state, addEventListener() {}, removeEventListener() {}, postMessage(message, ports) {
        assert.equal(message.type, 'COLOSSUS_OFFLINE_STATUS');
        app.status().then((data) => ports[0].postMessage(data));
      } };
    }
    const active = clientWorker(old, fullUrl('/sw.js?build=' + old.buildId), 'activated');
    let reg = { active };
    const browser = vm.createContext({
      URL, MessageChannel, setTimeout, clearTimeout, Date,
      location: new URL(ORIGIN),
      document: { getElementById: (id) => id === 'recovery-status' ? status : button },
      localStorage: { getItem() { assert.fail('Recovery must not access saves'); }, setItem() { assert.fail('Recovery must not alter saves'); }, clear() { assert.fail('Recovery must not clear saves'); } },
      fetch: async (url, options) => {
        network++;
        assert.equal(url, '/release.json'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
        if (!online) throw new Error('Offline');
        return new Response(JSON.stringify(fix.release), { headers: { 'Content-Type': 'application/json' } });
      },
      navigator: { serviceWorker: {
        getRegistration: async () => reg,
        register: async (url, options) => {
          repairs++;
          const address = new URL(url, ORIGIN);
          assert.equal(address.pathname, '/sw.js'); assert.equal(options.scope, '/'); assert.equal(options.updateViaCache, 'none');
          assert.equal(address.searchParams.get('build'), old.buildId);
          assert.match(address.searchParams.get('repair'), /^\d{13,20}$/);
          repaired = workerHarness(fix, { cache, repair: address.searchParams.get('repair') });
          await repaired.lifecycle('install');
          reg = { active, waiting: clientWorker(repaired, address.href, 'installed') };
          return reg;
        },
      } },
    });
    vm.runInContext(script, browser);
    assert.equal(repairs, 0); assert.equal(network, 0);
    await click();
    assert.match(status.textContent, /Reconnect to the internet/);
    assert.equal(button.disabled, false); assert.equal(repairs, 0);
    online = true;
    await click();
    assert.equal(repairs, 1);
    assert.equal(button.disabled, true);
    assert.match(status.textContent, /Close all game windows, then reopen/);
    assert.equal((await old.status()).complete, false);
    assert.equal((await repaired.status()).complete, true);
    assert.match(await (await old.request('/', { mode: 'navigate' })).text(), /Repair offline play/);
    await repaired.lifecycle('activate');
    assert.equal(await cache.has(oldName), false);
    assert.match(await (await repaired.request('/', { mode: 'navigate' })).text(), /aaaaaaaa/);
  });
}

test('repair of an evicted build is transactional and leaves the prior cache untouched until activation', async () => {
  const cache = fakeCaches();
  const old = workerHarness(fixture(), { cache }); await old.lifecycle('install');
  const oldCache = cache.stores.get('colossus-wake-release-' + old.buildId);
  oldCache.delete(fullUrl('/assets/test.png'));
  const repair = workerHarness(fixture(), { cache, repair: '1789500000000' });
  await repair.lifecycle('install');
  assert.equal(oldCache.has(fullUrl('/assets/test.png')), false);
  assert.equal((await old.status()).complete, false);
  assert.equal((await repair.status()).complete, true);
  assert.equal(await cache.has('colossus-wake-release-' + old.buildId), true);
  await repair.lifecycle('activate');
  assert.equal(await cache.has('colossus-wake-release-' + old.buildId), false);
  assert.equal((await repair.status()).complete, true);
});

test('deployment changing between discovery and worker download is rejected', async () => {
  const app = workerHarness(fixture(), { scriptBuildId: 'b'.repeat(20) });
  await assert.rejects(app.lifecycle('install'), /hosted release changed/);
  assert.equal(app.fetches.length, 0);
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
    const first = await buildMobileRelease({ root });
    const second = await buildMobileRelease({ root });
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
