// Focused production-runtime gate. Both releases are built before this script;
// the primary frozen release is never rebuilt or modified by browser checks.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createDeliveryServer, readFrozenRelease} from './helpers/delivery-server.mjs';
import {deliveryBrowserOptions, browserGraphicsInfo} from '../scripts/browser-runtime.mjs';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';

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
  checks: [], observations: [], pageErrors: [], unexpectedConsoleErrors: [], expectedFaultErrors: [], failedRequests: [], remoteRequests: [],
  limitations: ['Quota exhaustion, worker restart and deployment mutation cases require worker unit coverage; this browser gate does not claim real device storage exhaustion.', 'Foreground/connectivity events are browser-dispatched lifecycle checks; physical lock/resume remains untested.'],
};
const browser = await chromium.launch(deliveryBrowserOptions());
report.browser = browser.version();
report.graphics = await browserGraphicsInfo(browser);
let context, page, other, offlineBaseline, phase = 'startup', faultExpected = false, deliberatelyOffline = false;
const contexts = new Set();
const saveKey = 'colossus-wake-save-v1';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function observe(target) {
  target.setDefaultTimeout(20000);
  target.on('pageerror', error => report.pageErrors.push({phase, message: error.message}));
  target.on('console', message => {
    if (message.type() !== 'error') return;
    const location = message.location();
    const offlineMetadataFailure = deliberatelyOffline && location.url === `${server.origin}/release.json`
      && /net::ERR_INTERNET_DISCONNECTED/.test(message.text());
    (faultExpected || offlineMetadataFailure ? report.expectedFaultErrors : report.unexpectedConsoleErrors).push({phase, message: message.text(), location});
  });
  target.on('requestfailed', request => report.failedRequests.push({phase, path: new URL(request.url()).pathname, error: request.failure()?.errorText}));
}
async function freshContext(origin = server.origin) {
  const value = await browser.newContext({viewport: {width: 844, height: 390}, deviceScaleFactor: 1, isMobile: true, hasTouch: true});
  contexts.add(value);
  await value.addInitScript(() => {localStorage.setItem('colossus-quality-v1', 'performance'); localStorage.setItem('colossus-camera-mode', 'steady');});
  value.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== origin && !['blob:', 'data:'].includes(url.protocol)) report.remoteRequests.push({phase, origin: url.origin, path: url.pathname});
  });
  return value;
}
async function loaded(target, build) {
  await until(target, async expected => !!window.__colossus && (await import('/src/build-info.js')).BUILD_ID === expected, build);
}
async function until(target, predicate, argument, timeout = 120000) {
  return waitForBrowserCondition(target, predicate, argument, {timeoutMs: timeout});
}
async function offlineStatus(target = page) {
  return target.evaluate(async () => (await import('/src/offline.js')).refreshOfflineStatus());
}
async function installed(target, build) {
  await until(target, async expected => {
    const status = await (await import('/src/offline.js')).refreshOfflineStatus();
    return status.canPlayOffline && status.installedBuildId === expected;
  }, build, 150000);
}
async function open(target, host = server) {
  observe(target);
  await target.goto(`${host.origin}/?test=1`, {waitUntil: 'domcontentloaded', timeout: 120000});
}
async function readyA(value, host = server) {
  host.select('A'); host.inject(null);
  const target = await value.newPage(); await open(target, host); await loaded(target, A.descriptor.buildId);
  await installed(target, A.descriptor.buildId);
  // First installation owns its automatic safe title reload. A competing test
  // reload here would create an artificial registration/update race.
  await target.waitForFunction(() => !!navigator.serviceWorker.controller && !!window.__colossus, null, {timeout: 120000});
  await loaded(target, A.descriptor.buildId);
  return target;
}
async function menu(target = page) {await target.locator('#mobile-menu').tap();}
async function playtest(target = page) {await menu(target); await target.locator('[data-dialog-action="playtest"]').tap();}
async function check(name, action) {
  phase = name; await action(); report.checks.push(name); console.log(`PASS ${name}`);
}
async function position(target = page) {return target.evaluate(() => ({x: window.__colossus.state.x, z: window.__colossus.state.z}));}
async function touchMove(target = page) {
  const start = await position(target), box = await target.locator('[data-move="up"]').boundingBox();
  assert.ok(box, 'Movement control is visible');
  const session = await target.context().newCDPSession(target);
  await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{id: 0, x: box.x + box.width / 2, y: box.y + box.height / 2}]});
  await target.waitForTimeout(900);
  await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await session.detach();
  const end = await position(target);
  assert.ok(Math.hypot(end.x - start.x, end.z - start.z) > .5, 'Actual held touch moves the city');
}
async function savedIdentity(target = page) {
  return target.evaluate(key => {
    const raw = localStorage.getItem(key); if (!raw) return null;
    const save = JSON.parse(raw); return {variant: save.variant, faction: save.faction, towerOrder: save.towerOrder, buildings: save.buildings.map(building => building && {type: building.type, level: building.level})};
  }, saveKey);
}

try {
  context = await freshContext();
  await check('Frozen A starts, automatically installs offline, accepts touch and preserves save/Continue', async () => {
    page = await readyA(context);
    await page.locator('[data-faction="crawler"]').tap(); await page.locator('[data-variant="standard"]').tap(); await page.locator('#begin').tap();
    await touchMove();
    await menu(); await page.locator('[data-dialog-action="save"]').tap();
    const saved = await savedIdentity(); assert.equal(saved.variant, 'standard');
    await page.reload({waitUntil: 'domcontentloaded'}); await loaded(page, A.descriptor.buildId);
    await page.locator('#continue').tap(); assert.deepEqual(await savedIdentity(), saved);
    await playtest();
    report.observations.push({phase, offline: await offlineStatus()});
    // Create the second A client before the host ever changes to B. From this
    // point the main origin only advances A -> B, including failed attempts.
    other = await context.newPage(); await open(other); await loaded(other, A.descriptor.buildId); await other.locator('#continue').tap();
    await page.bringToFront();
  });

  const faultAsset = B.descriptor.files.find(file => file.url === '/src/main.js').url;
  for (const injected of [{kind: 'unauthorized', path: '/release.json'}, {kind: 'html', path: '/release.json'}, {kind: 'missing', path: faultAsset}, {kind: 'html', path: faultAsset}, {kind: 'interrupt', path: faultAsset}]) {
    await check(`${injected.kind} at ${injected.path} cannot replace complete A or its save`, async () => {
      server.select('B'); server.inject(injected); faultExpected = true;
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
      await delay(150); server.inject(null); faultExpected = false;
    });
  }

  await check('Interrupted B leaves A playable after an actual offline reopen', async () => {
    const before = await savedIdentity();
    deliberatelyOffline = true; await context.setOffline(true);
    const retained = await context.newPage(); await open(retained); await loaded(retained, A.descriptor.buildId);
    await retained.locator('#continue').tap(); assert.deepEqual(await savedIdentity(retained), before);
    await touchMove(retained);
    const current = await offlineStatus(retained);
    assert.equal(current.canPlayOffline, true); assert.equal(current.installedBuildId, A.descriptor.buildId);
    await retained.screenshot({path: path.join(output, 'interrupted-update-offline-A.png')});
    await retained.close(); await context.setOffline(false); deliberatelyOffline = false;
    await page.bringToFront();
  });

  await check('B downloads during play while two existing clients retain A', async () => {
    await other.bringToFront(); await loaded(other, A.descriptor.buildId);
    await other.evaluate(() => {const game = window.__colossus, rival = game.state.enemies[0]; game.state.x = rival.x - 32; game.state.z = rival.z; game.state.target = null; game.scene.snapCamera = true; game.advance(0);});
    await other.locator('[data-mobile-panel="map"]').tap();
    const minimap = await other.locator('#minimap').boundingBox(), rival = await other.evaluate(() => window.__colossus.state.enemies[0]);
    await other.touchscreen.tap(minimap.x + (rival.x + 180) / 360 * minimap.width, minimap.y + (rival.z + 180) / 360 * minimap.height);
    await other.locator('[data-engage]').tap();
    assert.equal(await other.evaluate(() => window.__colossus.state.mode), 'battle');
    await page.bringToFront();
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
    report.observations.push({phase, offline: await offlineStatus()});
  });

  await check('Failed save blocks update; successful Save and update reloads only its caller into B', async () => {
    const before = await savedIdentity(), expectedPosition = await position(), firstOrigin = await page.evaluate(() => performance.timeOrigin), otherOrigin = await other.evaluate(() => performance.timeOrigin);
    await page.evaluate(key => {
      const original = Storage.prototype.setItem;
      window.__restoreDeliverySave = () => {Storage.prototype.setItem = original; delete window.__restoreDeliverySave;};
      Storage.prototype.setItem = function(name, value) {if (name === key) throw new DOMException('Deliberate isolated save failure', 'QuotaExceededError'); return original.call(this, name, value);};
    }, saveKey);
    await page.locator('#offline-apply').tap();
    await until(page, () => document.getElementById('offline-status')?.textContent.includes('could not be saved') === true);
    assert.equal(await page.evaluate(() => performance.timeOrigin), firstOrigin);
    assert.deepEqual(await savedIdentity(), before);
    await page.evaluate(() => window.__restoreDeliverySave());
    await page.locator('#offline-apply').tap(); await loaded(page, B.descriptor.buildId);
    assert.notEqual(await page.evaluate(() => performance.timeOrigin), firstOrigin);
    assert.equal(await other.evaluate(() => performance.timeOrigin), otherOrigin, 'Other expedition never reloads');
    await loaded(other, A.descriptor.buildId);
    assert.equal(await other.evaluate(() => window.__colossus.state.mode), 'battle', 'Other client remains in its battle after B activation');
    assert.match(await other.evaluate(async () => (await fetch('/src/build-info.js')).text()), new RegExp(A.descriptor.buildId), 'Old client still receives its own release bytes');
    assert.deepEqual(await savedIdentity(), before);
    await page.locator('#continue').tap(); assert.deepEqual(await savedIdentity(), before);
    const resumedPosition = await position();
    assert.ok(Math.hypot(resumedPosition.x - expectedPosition.x, resumedPosition.z - expectedPosition.z) < .001, 'B resumes the updated caller’s saved world position');
    await page.screenshot({path: path.join(output, 'updated-B.png')});
    await other.locator('#withdraw').tap();
    assert.equal(await other.evaluate(() => window.__colossus.state.mode), 'expedition', 'Retained A combat still accepts actual controls');
    await other.close(); other = null;
    // Save and close the updated app before later reopening it offline. Other
    // cases use distinct origins, so even queued native worker checks cannot
    // discover their intentional A fixtures as a rollback on this app origin.
    await page.bringToFront(); await menu(); await page.locator('[data-dialog-action="save"]').tap();
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
    await titleContext.close(); contexts.delete(titleContext);
    auxiliaryRequests.push({case: phase, requests: host.requests}); await host.close(); ownedServers.delete(host);
  });

  await check('Evicted A boot module recovers directly to hosted B without losing the save', async () => {
    const host = await createDeliveryServer({A, B}); ownedServers.add(host);
    const recoveryContext = await freshContext(host.origin);
    const oldPage = await readyA(recoveryContext, host);
    await oldPage.locator('#begin').tap(); await menu(oldPage); await oldPage.locator('[data-dialog-action="save"]').tap();
    const before = await savedIdentity(oldPage);
    await oldPage.evaluate(async build => {
      for (const name of await caches.keys()) if (name.startsWith('colossus-wake-release-' + build)) await (await caches.open(name)).delete('/src/main.js');
    }, A.descriptor.buildId);
    host.select('B'); await oldPage.close();
    const recoveryPage = await recoveryContext.newPage(); await open(recoveryPage, host);
    await recoveryPage.locator('#recovery-repair').waitFor({state: 'visible', timeout: 30000});
    assert.equal(await recoveryPage.evaluate(() => !!window.__colossus), false, 'Recovery does not depend on the evicted game boot module');
    await recoveryPage.locator('#recovery-repair').tap(); await loaded(recoveryPage, B.descriptor.buildId);
    assert.deepEqual(await savedIdentity(recoveryPage), before);
    await recoveryPage.locator('#continue').tap();
    assert.deepEqual(await savedIdentity(recoveryPage), before);
    await recoveryContext.close(); contexts.delete(recoveryContext);
    auxiliaryRequests.push({case: phase, requests: host.requests}); await host.close(); ownedServers.delete(host);
  });

  await check('B reopens and continues offline after its server is stopped', async () => {
    assert.ok(offlineBaseline, 'The verified B page saved before independent server-switch fixtures');
    await server.close(); deliberatelyOffline = true; await context.setOffline(true);
    page = await context.newPage(); await open(page); await loaded(page, B.descriptor.buildId);
    await page.locator('#continue').tap(); assert.deepEqual(await savedIdentity(), offlineBaseline);
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
  report.failure = {phase, message: error.stack}; process.exitCode = 1;
  if (page && !page.isClosed()) {
    let diagnosticTimer;
    report.failure.browserState = await Promise.race([page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/');
      return {readyState: document.readyState, hidden: document.hidden, online: navigator.onLine, timeOrigin: performance.timeOrigin,
        navigation: performance.getEntriesByType('navigation').map(entry => ({domContentLoadedEventEnd: entry.domContentLoadedEventEnd, loadEventEnd: entry.loadEventEnd})),
        status: (await import('/src/offline.js')).getOfflineStatus(), statusText: document.getElementById('offline-status')?.textContent,
        applyClass: document.getElementById('offline-apply')?.className, active: reg?.active?.state, waiting: reg?.waiting?.state, installing: reg?.installing?.state};
    }), new Promise((_, reject) => {diagnosticTimer = setTimeout(() => reject(new Error('Failure-state capture exceeded 10 seconds.')), 10000);})])
      .catch(error => ({unavailable: error.message})).finally(() => clearTimeout(diagnosticTimer));
    await page.screenshot({path: path.join(output, 'failure.png'), timeout: 10000}).catch(() => {});
  }
} finally {
  for (const value of contexts) await value.close().catch(() => {});
  await browser.close(); for (const host of ownedServers) await host.close();
  report.finishedAt = new Date().toISOString(); report.requests = server.requests; report.auxiliaryRequests = auxiliaryRequests;
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({checks: report.checks, errors: report.pageErrors, failure: report.failure, report: path.join(output, 'results.json')}, null, 2));
}
