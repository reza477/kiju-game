// Focused production-runtime gate. Both releases are built before this script;
// the primary frozen release is never rebuilt or modified by browser checks.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createDeliveryServer, readFrozenRelease} from './helpers/delivery-server.mjs';
import {deliveryBrowserOptions, browserGraphicsInfo} from '../scripts/browser-runtime.mjs';
import {launchNativeTabContext, prepareNativeTouchPage, tapNativeLocator, tapNativeCoordinates} from '../scripts/native-tab-browser.mjs';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';
import {installDeliveryDiagnostics} from './helpers/delivery-diagnostics.mjs';

const output = path.resolve(process.env.OUTPUT_DIR || 'artifacts/delivery/browser');
await fs.mkdir(output, {recursive: true});
const A = await readFrozenRelease(process.env.GAME_RELEASE_DIR);
const B = await readFrozenRelease(process.env.GAME_NEXT_RELEASE_DIR);
assert.notEqual(A.descriptor.buildId, B.descriptor.buildId, 'The harmless next-release fixture must have a distinct identity.');
const server = await createDeliveryServer({A, B});
const ownedServers = new Set([server]);
const auxiliaryRequests = [];
const report = {
  startedAt: new Date().toISOString(), releases: {A: A.descriptor.buildId, B: B.descriptor.buildId},
  evidence: 'Isolated desktop Chromium with touch emulation, native RAF and wall time. Not hosted, desktop WebKit, physical iPhone, or a performance benchmark.',
  diagnosticExtendedWait: process.env.DELIVERY_DIAGNOSE_UPDATE === '1',
  fixtures: ['B is a separately frozen harmless release-metadata fixture.', 'Fault injection only affects this random-port loopback server.', 'One isolated page temporarily rejects its save-key write to exercise update refusal.', 'The second client is placed near its first rival solely to exercise actual Engage/Withdraw controls without a long travel wait. No hull, resources, combat statistics, or simulation clock are granted.'],
  checks: [], stages: [], observations: [], pageErrors: [], unexpectedConsoleErrors: [], expectedFaultErrors: [], failedRequests: [], remoteRequests: [], diagnosticNetwork: [],
  limitations: ['Quota exhaustion, worker restart and deployment mutation cases require worker unit coverage; this browser gate does not claim real device storage exhaustion.', 'Foreground/connectivity events are browser-dispatched lifecycle checks; physical lock/resume remains untested.'],
};
const launchOptions = deliveryBrowserOptions();
const diagnosticExecutablePath = process.env.PLAYTEST_NATIVE_TABS_DIAGNOSTIC_EXECUTABLE;
const nativeTabs = process.env.PLAYTEST_GRAPHICS_BACKEND === 'llvmpipe' || !!diagnosticExecutablePath;
const nativeLaunchOptions = {launchOptions, ...(diagnosticExecutablePath ? {diagnosticExecutablePath} : {})};
report.nativeSessionMode = nativeTabs ? (diagnosticExecutablePath ? 'native tabs with explicit local diagnostic executable' : 'native tabs with pinned Chromium') : 'ordinary Playwright context';
let browser, primaryNativeSession, primaryNativeClaimed = false;
let context, page, other, diagnosticPage, offlineBaseline, phase = 'startup', expectedFault = null, deliberatelyOffline = false;
const contexts = new Set();
const nativeSessions = new Map();
const diagnosticRequests = new WeakMap();
let diagnosticRequestSequence = 0, diagnosticPageSequence = 0;
const saveKey = 'colossus-wake-save-v1';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function boundedDriver(action, label, timeoutMs = 60000) {
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(action), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded its ${timeoutMs}ms Node driver deadline.`)), timeoutMs);
    })]);
  } finally {clearTimeout(timer);}
}
async function stage(name, action, {timeoutMs = 60000} = {}) {
  const started = performance.now();
  const record = async (event, extra = {}) => {
    const entry = {at: new Date().toISOString(), phase, stage: name, event, ...extra};
    report.currentStage = entry; report.stages.push(entry);
    await fs.writeFile(path.join(output, 'progress.json'), JSON.stringify({startedAt: report.startedAt, releases: report.releases,
      browser: report.browser, graphics: report.graphics, currentStage: entry, completedChecks: report.checks, stages: report.stages}, null, 2));
    console.log(`${entry.at} ${event} ${name}${extra.elapsedMs === undefined ? '' : ` (${extra.elapsedMs}ms)`}`);
  };
  // Persist before touching the browser: even an interrupted runner leaves the
  // precise pending operation, instead of an ambiguous nine-minute first group.
  await record('START');
  try {
    const value = timeoutMs === null ? await action() : await boundedDriver(action, name, timeoutMs);
    await record('END', {elapsedMs: Math.round(performance.now() - started)}); return value;
  } catch (error) {
    await record('FAIL', {elapsedMs: Math.round(performance.now() - started), message: error.message}); throw error;
  }
}
async function writeReport() {
  report.requests = server.requests; report.auxiliaryRequests = auxiliaryRequests;
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
}

function observe(target) {
  const pageId = ++diagnosticPageSequence;
  const recordNetwork = (event, request, extra = {}) => {
    const url = new URL(request.url());
    // Only the loopback delivery server's release/worker lifecycle is recorded.
    // Never include request headers, bodies, credentials, or unrelated URLs.
    if (!['/release.json', '/sw.js'].includes(url.pathname) || ![...ownedServers].some(host => host.origin === url.origin)) return;
    if (!diagnosticRequests.has(request)) diagnosticRequests.set(request, ++diagnosticRequestSequence);
    report.diagnosticNetwork.push({at: new Date().toISOString(), phase, pageId, requestId: diagnosticRequests.get(request), event, path: url.pathname, ...extra});
  };
  target.on('request', request => recordNetwork('request', request));
  target.on('response', response => recordNetwork('response', response.request(), {status: response.status()}));
  target.on('requestfinished', request => recordNetwork('finished', request, {timing: request.timing()}));
  target.on('requestfailed', request => recordNetwork('failed', request, {error: request.failure()?.errorText}));
  // The verified CPU renderer can spend >20s in initial shader/render work
  // before Playwright observes two stable frames. Keep real actionability and
  // touch dispatch; give this test driver time without changing game deadlines.
  target.setDefaultTimeout(report.graphics.requestedBackend === 'llvmpipe' ? 60000 : 20000);
  target.on('pageerror', error => report.pageErrors.push({phase, message: error.message}));
  target.on('console', message => {
    if (message.type() !== 'error') return;
    const location = message.location();
    const offlineMetadataFailure = deliberatelyOffline && ['/release.json', '/sw.js'].some(resource => location.url === `${server.origin}${resource}`)
      && /net::ERR_(?:INTERNET_DISCONNECTED|CONNECTION_REFUSED)/.test(message.text());
    const injectedResourceFailure = expectedFault && location.url === `${server.origin}${expectedFault.path}`
      && /^Failed to load resource: (?:the server responded with a status of (?:401|404)\b|net::ERR_(?:EMPTY_RESPONSE|CONNECTION_CLOSED|CONNECTION_RESET|INCOMPLETE_CHUNKED_ENCODING|CONTENT_LENGTH_MISMATCH))/.test(message.text());
    (injectedResourceFailure || offlineMetadataFailure ? report.expectedFaultErrors : report.unexpectedConsoleErrors).push({phase, message: message.text(), location});
  });
  target.on('requestfailed', request => report.failedRequests.push({phase, path: new URL(request.url()).pathname, error: request.failure()?.errorText}));
}
async function freshContext(origin = server.origin) {
  let value;
  if (nativeTabs) {
    const session = primaryNativeClaimed ? await launchNativeTabContext(nativeLaunchOptions) : primaryNativeSession;
    primaryNativeClaimed = true; value = session.context;
    nativeSessions.set(value, session); contexts.add(value);
    if (session !== primaryNativeSession) {
      const graphics = await browserGraphicsInfo(session.browser, {nativeContext: value});
      report.observations.push({phase, independentContextGraphics: graphics});
    }
  } else {
    value = await browser.newContext({viewport: {width: 844, height: 390}, deviceScaleFactor: 1, isMobile: true, hasTouch: true});
    contexts.add(value);
  }
  await value.addInitScript(installDeliveryDiagnostics);
  await value.addInitScript(() => {localStorage.setItem('colossus-quality-v1', 'performance'); localStorage.setItem('colossus-camera-mode', 'steady');});
  value.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== origin && !['blob:', 'data:'].includes(url.protocol)) report.remoteRequests.push({phase, origin: url.origin, path: url.pathname});
  });
  return value;
}
async function closeContext(value) {
  const session = nativeSessions.get(value);
  if (session) await session.close(); else await value.close();
  nativeSessions.delete(value); contexts.delete(value);
}
async function loaded(target, build) {
  await until(target, async expected => !!window.__colossus && (await import('/src/build-info.js')).BUILD_ID === expected, build);
}
async function until(target, predicate, argument, timeout = 120000) {
  return waitForBrowserCondition(target, predicate, argument, {timeoutMs: timeout});
}
async function offlineStatus(target = page) {
  return boundedDriver(() => target.evaluate(async () => (await import('/src/offline.js')).refreshOfflineStatus()), 'Read offline status');
}
async function installed(target, build) {
  await until(target, async expected => {
    const status = await (await import('/src/offline.js')).refreshOfflineStatus();
    return status.canPlayOffline && status.installedBuildId === expected;
  }, build, 150000);
}
async function foreground(target, label) {
  diagnosticPage = target;
  await stage(label, () => target.bringToFront());
}
async function observeSessions(label) {
  const sessions = await stage(label, () => Promise.all([page, other].map(target => target.evaluate(() => ({
    visibility: document.visibilityState, hidden: document.hidden,
    mode: window.__colossus?.state.mode, paused: window.__colossus?.state.paused,
  })))));
  report.observations.push({phase, label, sessions: {first: sessions[0], second: sessions[1]}});
}
async function open(target, host = server) {
  // Retain the page before readyA can fail. Its caller receives the page only
  // after installation, which previously left startup failures uncaptured.
  diagnosticPage = target;
  observe(target);
  if (nativeTabs) await stage('Open game: prepare native touch viewport', () => prepareNativeTouchPage(target, {width: 844, height: 390, deviceScaleFactor: 1}));
  // A headed tab must be selected before loading or interacting. Background
  // RAF/actionability can otherwise stall. Leave its peer genuinely hidden so
  // production visibility, pause and save handlers still run normally.
  await foreground(target, 'Open game: select target tab');
  await target.goto(`${host.origin}/?test=1`, {waitUntil: 'domcontentloaded', timeout: 120000});
}
async function readyA(value, host = server) {
  host.select('A'); host.inject(null);
  const target = await stage('readyA: create page', () => value.newPage());
  await stage('readyA: open game', () => open(target, host), {timeoutMs: null});
  await stage('readyA: initial runtime loaded', () => loaded(target, A.descriptor.buildId), {timeoutMs: null});
  await stage('readyA: offline installation', () => installed(target, A.descriptor.buildId), {timeoutMs: null});
  // First installation owns its automatic safe title reload. A competing test
  // reload here would create an artificial registration/update race.
  await stage('readyA: automatic title reopen controls page', () => target.waitForFunction(() => !!navigator.serviceWorker.controller && !!window.__colossus, null, {timeout: 120000}), {timeoutMs: null});
  await stage('readyA: reopened runtime loaded', () => loaded(target, A.descriptor.buildId), {timeoutMs: null});
  return target;
}
async function tap(target, selector) {
  const locator = target.locator(selector);
  if (nativeTabs) await boundedDriver(() => tapNativeLocator(locator), `Native touch ${selector}`); else await locator.tap();
}
async function tapCoordinates(target, x, y) {
  if (nativeTabs) await boundedDriver(() => tapNativeCoordinates(target, x, y), 'Native coordinate touch'); else await target.touchscreen.tap(x, y);
}
async function menu(target = page) {await tap(target, '#mobile-menu');}
async function playtest(target = page) {await menu(target); await tap(target, '[data-dialog-action="playtest"]');}
async function check(name, action) {
  phase = name; diagnosticPage = page; await action(); report.checks.push(name); console.log(`PASS ${name}`);
}
async function position(target = page) {return boundedDriver(() => target.evaluate(() => ({x: window.__colossus.state.x, z: window.__colossus.state.z})), 'Read city position');}
async function touchMove(target = page) {
  const start = await stage('touchMove: initial position', () => position(target));
  const box = await stage('touchMove: movement control box', () => target.locator('[data-move="up"]').boundingBox());
  assert.ok(box, 'Movement control is visible');
  const session = await stage('touchMove: create CDP session', () => target.context().newCDPSession(target));
  await stage('touchMove: touchStart', () => session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{id: 0, x: box.x + box.width / 2, y: box.y + box.height / 2}]}));
  await stage('touchMove: held 900ms', () => target.waitForTimeout(900));
  await stage('touchMove: touchEnd', () => session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}));
  await stage('touchMove: detach CDP session', () => session.detach());
  const end = await stage('touchMove: final position', () => position(target));
  assert.ok(Math.hypot(end.x - start.x, end.z - start.z) > .5, 'Actual held touch moves the city');
}
async function savedIdentity(target = page) {
  return boundedDriver(() => target.evaluate(key => {
    const raw = localStorage.getItem(key); if (!raw) return null;
    const save = JSON.parse(raw); return {variant: save.variant, faction: save.faction, towerOrder: save.towerOrder, buildings: save.buildings.map(building => building && {type: building.type, level: building.level})};
  }, saveKey), 'Read saved expedition identity');
}

try {
  if (nativeTabs) {
    primaryNativeSession = await stage('Launch native tab browser', () => launchNativeTabContext(nativeLaunchOptions));
    browser = primaryNativeSession.browser;
    nativeSessions.set(primaryNativeSession.context, primaryNativeSession); contexts.add(primaryNativeSession.context);
  } else browser = await stage('Launch browser', () => chromium.launch(launchOptions));
  report.browser = browser.version();
  report.graphics = await stage('Verify graphics and tab lifecycle', () => browserGraphicsInfo(browser, nativeTabs ? {nativeContext: primaryNativeSession.context} : {}));
  context = await stage('Create gameplay context', () => freshContext());
  await check('Frozen A starts, automatically installs offline, accepts touch and preserves save/Continue', async () => {
    page = await readyA(context);
    await stage('First expedition: select crawler', () => tap(page, '[data-faction="crawler"]'));
    await stage('First expedition: select standard variant', () => tap(page, '[data-variant="standard"]'));
    await stage('First expedition: begin', () => tap(page, '#begin'));
    await touchMove();
    await stage('First expedition: open save menu', () => menu());
    await stage('First expedition: save', () => tap(page, '[data-dialog-action="save"]'));
    const saved = await stage('First expedition: read saved identity', () => savedIdentity()); assert.equal(saved.variant, 'standard');
    await stage('First expedition: reload', () => page.reload({waitUntil: 'domcontentloaded'}));
    await stage('First expedition: reload runtime loaded', () => loaded(page, A.descriptor.buildId), {timeoutMs: null});
    await stage('First expedition: Continue', () => tap(page, '#continue'));
    assert.deepEqual(await stage('First expedition: resumed save identity', () => savedIdentity()), saved);
    await stage('First expedition: open playtest menu', () => menu());
    await stage('First expedition: open playtest panel', () => tap(page, '[data-dialog-action="playtest"]'));
    report.observations.push({phase, offline: await stage('First expedition: offline status', () => offlineStatus())});
    // Create the second A client before the host ever changes to B. From this
    // point the main origin only advances A -> B, including failed attempts.
    other = await stage('Second A session: create page', () => context.newPage());
    await stage('Second A session: open game', () => open(other), {timeoutMs: null});
    await stage('Second A session: runtime loaded', () => loaded(other, A.descriptor.buildId), {timeoutMs: null});
    await stage('Second A session: Continue', () => tap(other, '#continue'));
    await foreground(page, 'First expedition: return to foreground');
    await observeSessions('Two A sessions: actual visibility and pause state');
  });

  const faultAsset = B.descriptor.files.find(file => file.url === '/src/main.js').url;
  for (const injected of [{kind: 'unauthorized', path: '/release.json'}, {kind: 'html', path: '/release.json'}, {kind: 'missing', path: faultAsset}, {kind: 'html', path: faultAsset}, {kind: 'interrupt', path: faultAsset}]) {
    await check(`${injected.kind} at ${injected.path} cannot replace complete A or its save`, async () => {
      server.select('B'); server.inject(injected); expectedFault = injected;
      const before = await savedIdentity(), start = await page.evaluate(() => performance.timeOrigin), requestIndex = server.requests.length;
      const result = await page.evaluate(async () => (await import('/src/offline.js')).checkForUpdate());
      report.observations.push({phase, status: result});
      if (process.env.DELIVERY_DIAGNOSE_UPDATE === '1' && !server.requests.slice(requestIndex).some(request => request.injected && request.path === injected.path)) {
        for (let attempt = 0; attempt < 6; attempt++) {
          await delay(10000);
          const registration = await page.evaluate(async () => {const reg = await navigator.serviceWorker.getRegistration('/'); return {active: reg.active?.state, waiting: reg.waiting?.state, installing: reg.installing?.state, hidden: document.hidden, online: navigator.onLine, caches: await caches.keys()};});
          report.observations.push({phase, delayedSeconds: (attempt + 1) * 10, registration, recent: server.requests.slice(-3)});
          console.log(JSON.stringify(report.observations.at(-1)));
          if (server.requests.slice(requestIndex).some(request => request.injected && request.path === injected.path)) break;
        }
      }
      assert.ok(server.requests.slice(requestIndex).some(request => request.injected && request.path === injected.path), 'Fault was actually exercised');
      assert.equal(result.canApplyUpdate, false, 'No partial/authenticated candidate can be applied');
      assert.equal(await page.evaluate(() => performance.timeOrigin), start, 'Update failure cannot reload active play');
      const current = await offlineStatus(); assert.equal(current.installedBuildId, A.descriptor.buildId); assert.equal(current.canPlayOffline, true);
      assert.deepEqual(await savedIdentity(), before);
      // Let failed worker console diagnostics arrive before ending this fixture.
      // Keep the fault until the next one replaces it, then until the server
      // stops. A native service-worker soft update must not find a healthy B
      // in an accidental gap between this failed-update and offline fixture.
      await delay(150);
    });
  }

  await check('Interrupted B leaves A playable after an actual offline reopen', async () => {
    deliberatelyOffline = true;
    await stage('Interrupted update: stop the actual server', () => server.close());
    server.inject(null); expectedFault = null;
    const offlineRequestCount = server.requests.length;
    const before = await savedIdentity();
    await context.setOffline(true);
    const retained = await context.newPage(); await open(retained); await loaded(retained, A.descriptor.buildId);
    await tap(retained, '#continue'); assert.deepEqual(await savedIdentity(retained), before);
    await touchMove(retained);
    const current = await offlineStatus(retained);
    assert.equal(current.canPlayOffline, true); assert.equal(current.installedBuildId, A.descriptor.buildId);
    assert.equal(server.requests.length, offlineRequestCount, 'No browser or worker can reach the stopped server during offline reopening');
    await retained.screenshot({path: path.join(output, 'interrupted-update-offline-A.png')});
    await retained.close();
    await stage('Interrupted update: restore the same server origin', () => server.resume());
    await context.setOffline(false); deliberatelyOffline = false;
    await foreground(page, 'Interrupted update: return to first expedition');
  });

  await check('B downloads during play while two existing clients retain A', async () => {
    await foreground(other, 'Retained A: select expedition for Engage'); await loaded(other, A.descriptor.buildId);
    await other.evaluate(() => {const game = window.__colossus, rival = game.state.enemies[0]; game.state.x = rival.x - 32; game.state.z = rival.z; game.state.target = null; game.scene.snapCamera = true; game.advance(0);});
    await tap(other, '[data-mobile-panel="map"]');
    const minimap = await other.locator('#minimap').boundingBox(), rival = await other.evaluate(() => window.__colossus.state.enemies[0]);
    await tapCoordinates(other, minimap.x + (rival.x + 180) / 360 * minimap.width, minimap.y + (rival.z + 180) / 360 * minimap.height);
    await tap(other, '[data-engage]');
    assert.equal(await other.evaluate(() => window.__colossus.state.mode), 'battle');
    await foreground(page, 'Update caller: return to foreground');
    const original = {first: await page.evaluate(() => performance.timeOrigin), second: await other.evaluate(() => performance.timeOrigin)};
    server.select('B');
    // Production online handler is used; this event does not fake a response.
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    // Manual check keeps the CI gate bounded if the automatic handler correctly
    // debounces a closely preceding failed check. Automatic discovery is checked
    // independently at the title boundary below.
    await page.evaluate(async () => (await import('/src/offline.js')).checkForUpdate());
    await until(page, async () => (await import('/src/offline.js')).getOfflineStatus().canApplyUpdate, undefined, 150000);
    assert.equal(await page.evaluate(() => performance.timeOrigin), original.first);
    assert.equal(await other.evaluate(() => performance.timeOrigin), original.second);
    await loaded(page, A.descriptor.buildId); await loaded(other, A.descriptor.buildId);
    await observeSessions('B ready: both sessions visibility and pause state');
    report.observations.push({phase, offline: await offlineStatus()});
  });

  await check('Failed save blocks update; successful Save and update reloads only its caller into B', async () => {
    const before = await savedIdentity(), expectedPosition = await position(), firstOrigin = await page.evaluate(() => performance.timeOrigin), otherOrigin = await other.evaluate(() => performance.timeOrigin);
    await page.evaluate(key => {
      const original = Storage.prototype.setItem;
      window.__restoreDeliverySave = () => {Storage.prototype.setItem = original; delete window.__restoreDeliverySave;};
      Storage.prototype.setItem = function(name, value) {if (name === key) throw new DOMException('Deliberate isolated save failure', 'QuotaExceededError'); return original.call(this, name, value);};
    }, saveKey);
    await tap(page, '#offline-apply');
    await until(page, () => document.getElementById('offline-status')?.textContent.includes('could not be saved') === true);
    assert.equal(await page.evaluate(() => performance.timeOrigin), firstOrigin);
    assert.deepEqual(await savedIdentity(), before);
    await page.evaluate(() => window.__restoreDeliverySave());
    await tap(page, '#offline-apply'); await loaded(page, B.descriptor.buildId);
    assert.notEqual(await page.evaluate(() => performance.timeOrigin), firstOrigin);
    assert.equal(await other.evaluate(() => performance.timeOrigin), otherOrigin, 'Other expedition never reloads');
    await loaded(other, A.descriptor.buildId);
    assert.equal(await other.evaluate(() => window.__colossus.state.mode), 'battle', 'Other client remains in its battle after B activation');
    assert.match(await other.evaluate(async () => (await fetch('/src/build-info.js')).text()), new RegExp(A.descriptor.buildId), 'Old client still receives its own release bytes');
    assert.deepEqual(await savedIdentity(), before);
    await tap(page, '#continue'); assert.deepEqual(await savedIdentity(), before);
    const resumedPosition = await position();
    assert.ok(Math.hypot(resumedPosition.x - expectedPosition.x, resumedPosition.z - expectedPosition.z) < .001, 'B resumes the updated caller’s saved world position');
    await page.screenshot({path: path.join(output, 'updated-B.png')});
    await foreground(other, 'Retained A: select battle for Withdraw');
    await tap(other, '#withdraw');
    assert.equal(await other.evaluate(() => window.__colossus.state.mode), 'expedition', 'Retained A combat still accepts actual controls');
    await other.close(); other = null;
    // Save and close the updated app before later reopening it offline. Other
    // cases use distinct origins, so even queued native worker checks cannot
    // discover their intentional A fixtures as a rollback on this app origin.
    await foreground(page, 'Updated B: return to foreground for save'); await menu(); await tap(page, '[data-dialog-action="save"]');
    offlineBaseline = await savedIdentity();
    const current = await offlineStatus();
    assert.equal(current.installedBuildId, B.descriptor.buildId);
    assert.equal(current.canApplyUpdate, false);
    await page.close();
  });

  await check('Cold title automatically discovers and applies B without an Update button', async () => {
    const host = await createDeliveryServer({A, B}); ownedServers.add(host);
    const titleContext = await freshContext(host.origin);
    const title = await readyA(titleContext, host);
    host.select('B');
    await title.close();
    const reopened = await titleContext.newPage(); await open(reopened, host);
    await loaded(reopened, B.descriptor.buildId);
    assert.equal(await reopened.locator('#intro').evaluate(element => element.classList.contains('hidden')), false);
    await closeContext(titleContext);
    auxiliaryRequests.push({case: phase, requests: host.requests}); await host.close(); ownedServers.delete(host);
  });

  await check('Evicted A boot module recovers directly to hosted B without losing the save', async () => {
    const host = await createDeliveryServer({A, B}); ownedServers.add(host);
    const recoveryContext = await freshContext(host.origin);
    const oldPage = await readyA(recoveryContext, host);
    await tap(oldPage, '#begin'); await menu(oldPage); await tap(oldPage, '[data-dialog-action="save"]');
    const before = await savedIdentity(oldPage);
    await oldPage.evaluate(async build => {
      for (const name of await caches.keys()) if (name.startsWith('colossus-wake-release-' + build)) await (await caches.open(name)).delete('/src/main.js');
    }, A.descriptor.buildId);
    host.select('B'); await oldPage.close();
    const recoveryPage = await recoveryContext.newPage(); await open(recoveryPage, host);
    await recoveryPage.locator('#recovery-repair').waitFor({state: 'visible', timeout: 30000});
    assert.equal(await recoveryPage.evaluate(() => !!window.__colossus), false, 'Recovery does not depend on the evicted game boot module');
    await tap(recoveryPage, '#recovery-repair'); await loaded(recoveryPage, B.descriptor.buildId);
    assert.deepEqual(await savedIdentity(recoveryPage), before);
    await tap(recoveryPage, '#continue');
    assert.deepEqual(await savedIdentity(recoveryPage), before);
    await closeContext(recoveryContext);
    auxiliaryRequests.push({case: phase, requests: host.requests}); await host.close(); ownedServers.delete(host);
  });

  await check('B reopens and continues offline after its server is stopped', async () => {
    assert.ok(offlineBaseline, 'The verified B page saved before independent server-switch fixtures');
    await server.close(); deliberatelyOffline = true; await context.setOffline(true);
    page = await context.newPage(); await open(page); await loaded(page, B.descriptor.buildId);
    await tap(page, '#continue'); assert.deepEqual(await savedIdentity(), offlineBaseline);
    await touchMove(); await playtest();
    const status = await page.evaluate(async () => (await import('/src/offline.js')).checkForUpdate());
    assert.equal(status.canPlayOffline, true); assert.equal(status.installedBuildId, B.descriptor.buildId);
    assert.notEqual(status.state, 'up-to-date', 'Offline is not a successful latest-release verification');
    assert.equal(status.checkedAt, null, 'Cold offline launch has no successful online release check');
    report.observations.push({phase, offline: status});
    await page.screenshot({path: path.join(output, 'offline-B.png')});
  });
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.remoteRequests, []);
  assert.deepEqual(report.unexpectedConsoleErrors, []);
} catch (error) {
  report.failure = {phase, stage: report.currentStage, message: error.stack}; process.exitCode = 1;
  await writeReport();
  const failedPage = diagnosticPage && !diagnosticPage.isClosed() ? diagnosticPage : page;
  if (failedPage && !failedPage.isClosed()) {
    let diagnosticTimer;
    report.failure.browserState = await Promise.race([failedPage.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/');
      return {readyState: document.readyState, hidden: document.hidden, online: navigator.onLine, timeOrigin: performance.timeOrigin,
        diagnostics: window.__deliveryDiagnostics?.snapshot(),
        navigation: performance.getEntriesByType('navigation').map(entry => ({domContentLoadedEventEnd: entry.domContentLoadedEventEnd, loadEventEnd: entry.loadEventEnd})),
        status: (await import('/src/offline.js')).getOfflineStatus(), statusText: document.getElementById('offline-status')?.textContent,
        applyClass: document.getElementById('offline-apply')?.className, active: reg?.active?.state, waiting: reg?.waiting?.state, installing: reg?.installing?.state};
    }), new Promise((_, reject) => {diagnosticTimer = setTimeout(() => reject(new Error('Failure-state capture exceeded 10 seconds.')), 10000);})])
      .catch(error => ({unavailable: error.message})).finally(() => clearTimeout(diagnosticTimer));
    report.failure.screenshot = await failedPage.screenshot({path: path.join(output, 'failure.png'), timeout: 10000})
      .then(() => ({file: 'failure.png'})).catch(error => ({unavailable: error.message}));
  }
} finally {
  report.finishedAt = new Date().toISOString(); report.cleanup = {state: 'pending', steps: []};
  // Write evidence first. A driver/transport shutdown failure cannot erase the
  // last completed assertion, pending substage, or already captured diagnosis.
  await writeReport();
  const clean = async (name, action, timeoutMs) => {
    try {await boundedDriver(action, `Cleanup ${name}`, timeoutMs); report.cleanup.steps.push({name, ok: true});}
    catch (error) {
      report.cleanup.steps.push({name, ok: false, message: error.message}); process.exitCode = 1;
      report.failure ??= {phase: 'cleanup', message: `${name}: ${error.message}`};
    }
    await writeReport();
  };
  await clean('owned contexts', async () => {
    const results = await Promise.allSettled([...contexts].map(value => closeContext(value)));
    const failure = results.find(result => result.status === 'rejected'); if (failure) throw failure.reason;
  }, 15000);
  if (!nativeTabs && browser) await clean('owned browser', () => browser.close(), 15000);
  await clean('owned loopback servers', async () => {
    const results = await Promise.allSettled([...ownedServers].map(host => host.close()));
    const failure = results.find(result => result.status === 'rejected'); if (failure) throw failure.reason;
  }, 10000);
  report.cleanup.state = report.cleanup.steps.every(step => step.ok) ? 'complete' : 'failed';
  report.cleanup.finishedAt = new Date().toISOString(); await writeReport();
  console.log(JSON.stringify({checks: report.checks, errors: report.pageErrors, failure: report.failure, report: path.join(output, 'results.json')}, null, 2));
}
