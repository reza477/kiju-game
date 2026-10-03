import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {homedir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const base = (process.env.GAME_TEST_URL || 'http://127.0.0.1:4192').replace(/\/$/, '');
const out = process.env.OUTPUT_DIR || 'artifacts/iphone-pass1/browser-regression';
await fs.mkdir(out, {recursive: true});
const report = {timestamp: new Date().toISOString(), base, revision: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  evidence: 'Desktop Chrome touch emulation and desktop mouse; not desktop WebKit, physical iPhone or iOS Safari.',
  fixtures: ['Fresh isolated saves. Selected crawler uses existing starter resources.', 'Target cleared between independent gesture checks only.', 'Battle setup relocates carrier 32 metres from first rival; actual Engage/Withdraw controls used.', 'Construction waits use real wall time.'],
  checks: [], observations: [], errors: [], remote: [], layouts: [], failures: []};
const browser = await playwright.chromium.launch({headless: true, channel: 'chrome', args: ['--mute-audio']});
report.browser = browser.version();
let page, context, session;
const wait = ms => page.waitForTimeout(ms);
const state = () => page.evaluate(() => window.__colossus.snapshot());
const panel = () => page.evaluate(() => document.body.dataset.mobilePanel || '');
async function check(name, action) {
  try { await action(); report.checks.push(name); console.log(`PASS ${name}`); }
  catch (error) { report.failures.push({name, message: error.stack}); throw error; }
}
async function screenshot(name) { await page.screenshot({path: path.join(out, `${name}.png`)}); }
async function closePanel() {
  const button = page.locator('[data-close-panel]:visible').first();
  if (await button.count()) await tap(button);
  await wait(100);
}
async function hitTarget(locator, {minimum = 44, font = null} = {}) {
  await locator.scrollIntoViewIfNeeded();
  const info = await locator.evaluate(element => {
    const r = element.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y), style = getComputedStyle(element);
    return {x, y, width: r.width, height: r.height, font: parseFloat(style.fontSize), label: element.getAttribute('aria-label') || element.textContent.trim(), hit: hit === element || element.contains(hit), viewport: {width: innerWidth, height: innerHeight}};
  });
  assert.ok(info.width >= minimum - .1 && info.height >= minimum - .1, `${info.label} target is ${info.width}×${info.height}`);
  assert.ok(info.hit, `Actual pointer target for ${info.label} is covered or clipped`);
  assert.ok(info.x >= 0 && info.x < info.viewport.width && info.y >= 0 && info.y < info.viewport.height, `${info.label} center outside viewport`);
  if (font !== null) assert.ok(info.font >= font, `${info.label} font ${info.font}px < ${font}px`);
  return info;
}
async function tap(selector, options) {
  const locator = typeof selector === 'string' ? page.locator(selector).first() : selector;
  await hitTarget(locator, options);
  if (session) await locator.tap(); else await locator.click();
}
async function touch(type, points = []) { await session.send('Input.dispatchTouchEvent', {type, touchPoints: points.map((point, id) => ({id, ...point}))}); }
async function begin(viewport, mobile) {
  context = await browser.newContext({viewport, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write']});
  await context.addInitScript(() => { localStorage.setItem('colossus-quality-v1', 'performance'); localStorage.setItem('colossus-camera-mode', 'steady'); });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(`${base}/`) || /^(blob:|data:)/.test(url)) return route.continue();
    report.remote.push(url); return route.abort();
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') report.errors.push(message.text());});
  session = mobile ? await context.newCDPSession(page) : null;
  await page.goto(`${base}/?test=1`, {waitUntil: 'domcontentloaded', timeout: 90000});
  await page.waitForFunction(() => !!window.__colossus, null, {timeout: 90000});
  // Title card sizing is outside the targeted gameplay HUD assertions.
  await page.locator('[data-faction="crawler"]').click();
  await page.locator('[data-variant="standard"]').click();
  await page.locator('#begin').click(); await wait(1400);
  report.layouts.push(await page.evaluate(async () => ({viewport: {width: innerWidth, height: innerHeight}, build: (await import('/src/build-info.js')).BUILD_ID, quality: window.__colossus.scene.quality, renderBuffer: {width: world.width, height: world.height}, userAgent: navigator.userAgent})));
}
async function clearTargetFixture() { await page.evaluate(() => {window.__colossus.state.target = null;}); await wait(80); }
async function worldPoint({ground = false, slot} = {}) {
  return page.evaluate(async ({ground, slot}) => {
    const T = await import('/vendor/three.module.js'), scene = window.__colossus.scene;
    const ray = new T.Raycaster(), pointer = new T.Vector2();
    const objects = [...scene.city.slots.filter(h => !h.userData.locked), ...scene.enemyCities.filter(c => c.root.visible).map(c => c.enemyProxy), ...scene.pickables, scene.ground];
    for (let y = 155; y < innerHeight - 75; y += 18) for (let x = 24; x < innerWidth - 24; x += 18) {
      if (document.elementFromPoint(x, y)?.id !== 'world') continue;
      pointer.set(x / innerWidth * 2 - 1, -y / innerHeight * 2 + 1); ray.setFromCamera(pointer, scene.camera);
      const hit = ray.intersectObjects(objects, true).find(item => ['ground', 'slot', 'node', 'enemy'].some(key => item.object.userData[key] !== undefined));
      if (hit && (ground ? hit.object.userData.ground : hit.object.userData.slot === slot)) return {x, y, hit: hit.point.toArray()};
    }
    return null;
  }, {ground, slot});
}
async function canvasArea() {
  return page.evaluate(() => {
    for (let y = 170; y < innerHeight - 125; y += 20) for (let x = 105; x < innerWidth - 105; x += 20) {
      if ([-65, 0, 65].every(dx => document.elementFromPoint(x + dx, y)?.id === 'world') && document.elementFromPoint(x, y + 40)?.id === 'world') return {x, y};
    }
    return null;
  });
}
async function markerEvidence(label, {requireOne = false} = {}) {
  await wait(450);
  const result = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('.map-marker')].filter(element => getComputedStyle(element).display !== 'none');
    const occlusions = [...document.querySelectorAll('[data-marker-occlusion]')].filter(element => element.getClientRects().length && getComputedStyle(element).display !== 'none').map(element => ({id: element.id || element.className, r: element.getBoundingClientRect()}));
    return visible.map(element => {
      const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {id: element.dataset.id, name: element.textContent, rect: {x: r.x, y: r.y, width: r.width, height: r.height}, inBounds: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, hit: element === hit || element.contains(hit), overlaps: occlusions.filter(({r: box}) => r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top).map(item => item.id)};
    });
  });
  report.observations.push({label, markers: result});
  if (requireOne) assert.ok(result.length > 0, `${label}: no visible resource/rival labels`);
  for (const marker of result) { assert.ok(marker.inBounds, `${label}: ${marker.name} clips viewport`); assert.ok(marker.hit, `${label}: ${marker.name} is not pointer-reachable`); assert.deepEqual(marker.overlaps, [], `${label}: marker covers controls`); }
  return result;
}
async function openPlaytest() { await tap('#mobile-menu'); await tap('[data-dialog-action="playtest"]'); }
async function sampleCount() { const text = await page.locator('#sample-status').textContent(); return Number(/· (\d+) intervals/.exec(text)?.[1] ?? 0); }
async function checkDialogToolbar(label) {
  const geometry = await page.evaluate(() => {
    const dialog = document.getElementById('dialog'), toolbar = dialog.querySelector('.dialog-toolbar');
    const d = dialog.getBoundingClientRect(), r = toolbar.getBoundingClientRect(), style = getComputedStyle(toolbar);
    const samples = [.05, .5, .95].map(fraction => document.elementFromPoint(r.left + r.width * fraction, r.top + r.height / 2));
    return {scrollTop: dialog.scrollTop, clientWidth: dialog.clientWidth, toolbar: {left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height}, dialogTop: d.top,
      position: style.position, background: style.backgroundColor, hitAcrossWidth: samples.every(element => element === toolbar || toolbar.contains(element))};
  });
  assert.equal(geometry.position, 'sticky');
  assert.ok(geometry.toolbar.width >= geometry.clientWidth - 2, `${label}: toolbar does not reserve the dialog's full content width`);
  assert.ok(geometry.toolbar.height >= 44 && Math.abs(geometry.toolbar.top - geometry.dialogTop) <= 3, `${label}: toolbar no longer anchored to dialog top`);
  assert.match(geometry.background, /^rgb\(|^rgba\([^)]*,\s*1\)$/, `${label}: toolbar must have an opaque background`);
  assert.ok(geometry.hitAcrossWidth, `${label}: scrolled text is pointer-exposed through the reserved header`);
  // Do not scroll the Close control into place: it must already be accessible.
  const close = await page.locator('#close-dialog').evaluate(element => {const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);return {width: r.width, height: r.height, hit: hit === element || element.contains(hit)};});
  assert.ok(close.hit && close.width >= 44 && close.height >= 44, `${label}: Close is covered, clipped or undersized`);
  report.observations.push({label: `${label} dialog toolbar`, ...geometry});
}
async function dialogNavigationCheck(label) {
  await openPlaytest();
  assert.ok(await page.locator('#dialog').evaluate(element => element.scrollTop <= 1), `${label}: opening Playtest did not reset scroll`);
  await checkDialogToolbar(`${label} initial`);
  for (const section of ['playtest-offline', 'playtest-saves', 'playtest-feedback']) {
    await tap(`[data-playtest-section="${section}"]`, {font: 14});
    const heading = await page.locator(`#${section} h3`).evaluate(element => {const r = element.getBoundingClientRect(), toolbar = document.querySelector('.dialog-toolbar').getBoundingClientRect(), dialog = document.getElementById('dialog').getBoundingClientRect();return {top: r.top, bottom: r.bottom, reservedBottom: toolbar.bottom, dialogBottom: dialog.bottom};});
    assert.ok(heading.top >= heading.reservedBottom - 1 && heading.bottom <= heading.dialogBottom, `${label}: ${section} shortcut places its heading under the toolbar or below the viewport`);
    await checkDialogToolbar(`${label} ${section}`);
  }
  await screenshot(`${label}-playtest-toolbar`);
  await tap('#close-dialog'); await tap('#mobile-menu');
  await checkDialogToolbar(`${label} reopened menu`);
  const reopenedScroll = await page.locator('#dialog').evaluate(element => element.scrollTop);
  assert.ok(reopenedScroll <= 1, `${label}: reopened menu inherited ${reopenedScroll}px of deep Playtest scroll`);
  await tap('#close-dialog');
}
async function initialRivalAction(label, kind) {
  const geometry = await page.locator(`[data-${kind}]`).evaluate(element => {
    const r = element.getBoundingClientRect(), sheet = document.querySelector('.left-stack').getBoundingClientRect(), header = document.querySelector('.left-stack .sheet-heading').getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, availableTop: Math.max(sheet.top, header.bottom), availableBottom: sheet.bottom, availableLeft: sheet.left, availableRight: sheet.right, hit: hit === element || element.contains(hit)};
  });
  assert.ok(geometry.top >= geometry.availableTop - 1 && geometry.bottom <= geometry.availableBottom + 1 && geometry.left >= geometry.availableLeft && geometry.right <= geometry.availableRight, `${label}: primary rival action is clipped before any scrolling: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.hit && geometry.width >= 44 && geometry.height >= 44, `${label}: initial rival action is not an unobstructed 44px target`);
  report.observations.push({label: `${label} initial rival action`, kind, ...geometry});
}
async function battlePanelGeometry(label) {
  const boxes = await page.evaluate(() => {
    const selectors = ['.battle-title', '.battle-actions', '.topbar', '#touch-pad'];
    return selectors.map(selector => {const r = document.querySelector(selector).getBoundingClientRect();return {selector, left: r.left, right: r.right, top: r.top, bottom: r.bottom};});
  });
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
    const one = boxes[a], two = boxes[b];
    assert.ok(!(one.left < two.right - 1 && one.right > two.left + 1 && one.top < two.bottom - 1 && one.bottom > two.top + 1), `${label}: ${one.selector} overlaps ${two.selector}`);
  }
  for (const selector of ['#enemy-name', '#enemy-hp', '#battle-distance', '#battle-own-hull']) {
    const visible = await page.locator(selector).evaluate(element => {const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);return r.top >= 0 && r.bottom <= innerHeight && (hit === element || element.contains(hit));});
    assert.ok(visible, `${label}: battle information ${selector} is clipped or covered`);
  }
  report.observations.push({label: `${label} battle panel separation`, boxes});
}
async function battleToastGeometry(label, expectedText) {
  await page.waitForFunction(() => {const element = document.getElementById('toast'); return element.classList.contains('show') && Number(getComputedStyle(element).opacity) > .9;});
  const geometry = await page.evaluate(() => {
    const element = document.getElementById('toast'), r = element.getBoundingClientRect(), range = document.createRange();
    range.selectNodeContents(element);
    const box = rect => ({left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height});
    return {text: element.textContent, visible: element.checkVisibility(), viewport: {width: innerWidth, height: innerHeight}, rect: box(r),
      textRects: [...range.getClientRects()].map(box),
      obstacles: ['.topbar', '.battle-title', '.battle-actions', '#touch-pad'].map(selector => ({selector, ...box(document.querySelector(selector).getBoundingClientRect())}))};
  });
  assert.match(geometry.text, expectedText, `${label}: expected real gameplay toast`);
  assert.ok(geometry.visible && geometry.rect.width > 0 && geometry.rect.height > 0, `${label}: toast is not visible`);
  const r = geometry.rect;
  assert.ok(r.left >= 0 && r.top >= 0 && r.right <= geometry.viewport.width && r.bottom <= geometry.viewport.height, `${label}: toast clips viewport`);
  assert.ok(geometry.textRects.length, `${label}: toast has no rendered text bounds`);
  for (const text of geometry.textRects) assert.ok(text.left >= r.left - 1 && text.right <= r.right + 1 && text.top >= r.top - 1 && text.bottom <= r.bottom + 1, `${label}: rendered text escapes its toast panel: ${JSON.stringify({panel: r, text})}`);
  for (const other of geometry.obstacles) assert.ok(!(r.left < other.right - 1 && r.right > other.left + 1 && r.top < other.bottom - 1 && r.bottom > other.top + 1), `${label}: toast overlaps ${other.selector}`);
  report.observations.push({label: `${label} actual toast bounds`, ...geometry});
}
async function outOfRangeAbilityToast(label) {
  await tap('[data-command="retreat"]');
  await page.waitForFunction(() => {const b = window.__colossus.state.battle; return b && b.abilityCooldown === 0 && Math.hypot(b.player.x - b.enemy.x, b.player.z - b.enemy.z) > 75;});
  await tap('#ability');
  await battleToastGeometry(label, /Close to within 70 metres before rushing\./);
  assert.equal((await state()).battle.abilityCooldown, 0, 'Out-of-range ability consumed its cooldown');
  await screenshot(`${label}-ability-toast`);
}

try {
  await begin({width: 390, height: 844}, true);
  await check('390×844 primary controls and critical population/resource text are readable and real pointer targets', async () => {
    for (const selector of ['#pause', '[data-mobile-panel="city"]', '[data-mobile-panel="build"]', '[data-mobile-panel="map"]', '#mobile-menu', '[data-view="city"]', '[data-view="world"]', '[data-move="up"]', '[data-move="left"]', '[data-move="down"]', '[data-move="right"]']) await hitTarget(page.locator(selector));
    for (const id of ['wood', 'iron', 'food', 'population']) assert.ok(await page.locator(`#${id}`).evaluate(element => element.checkVisibility() && parseFloat(getComputedStyle(element).fontSize) >= 14), `${id} unavailable or below 14px`);
    await tap('[data-mobile-panel="city"]');
    for (const id of ['city-population', 'city-food-rate', 'hull-number']) {await page.locator(`#${id}`).scrollIntoViewIfNeeded(); assert.ok(await page.locator(`#${id}`).evaluate(element => parseFloat(getComputedStyle(element).fontSize) >= 14));}
    await screenshot('portrait-population'); await closePanel();
  });
  await check('Empty-ground touch orders travel without opening City sheet', async () => {
    await tap('[data-view="world"]'); await wait(1200); await clearTargetFixture();
    const point = await worldPoint({ground: true}); assert.ok(point, 'No unobstructed ground pointer target');
    await page.touchscreen.tap(point.x, point.y); await wait(120);
    assert.ok((await state()).target); assert.equal(await panel(), '');
    await screenshot('portrait-ground-destination');
  });
  await check('Actual resource/rival markers avoid open and closed HUD occlusions in portrait', async () => {
    await clearTargetFixture();
    const markers = await markerEvidence('portrait panels closed', {requireOne: true});
    await tap(page.locator(`.map-marker[data-id="${markers[0].id}"]`));
    assert.equal(await panel(), 'city'); assert.equal((await state()).target, null);
    await markerEvidence('portrait City open'); await screenshot('portrait-resource-selection'); await closePanel();
    await tap('[data-mobile-panel="map"]'); await markerEvidence('portrait Map open'); await closePanel();
  });
  await check('UI taps and sheet dismissal never issue ground travel; resource course button still does', async () => {
    await clearTargetFixture();
    for (const name of ['city', 'build', 'map']) {await tap(`[data-mobile-panel="${name}"]`); assert.equal((await state()).target, null); await closePanel(); assert.equal((await state()).target, null);}
    await tap('[data-mobile-panel="map"]'); await tap('#destinations-toggle');
    await tap('#destinations button'); assert.ok((await state()).target); await screenshot('portrait-resource-course'); await closePanel(); await clearTargetFixture();
  });
  await check('Portrait initial rival action is fully visible without scrolling', async () => {
    await tap('[data-mobile-panel="map"]'); await page.locator('#minimap').scrollIntoViewIfNeeded(); const box = await page.locator('#minimap').boundingBox(), enemy = (await state()).enemies[0];
    await page.touchscreen.tap(box.x + (enemy.x + 180) / 360 * box.width, box.y + (enemy.z + 180) / 360 * box.height);
    await initialRivalAction('portrait', 'approach'); await tap('[data-approach]'); assert.ok((await state()).target);
    await screenshot('portrait-rival-action'); await closePanel(); await clearTargetFixture();
  });
  await check('Portrait Playtest toolbar reserves opaque full width, section shortcuts land correctly and dialog scroll resets', async () => {await dialogNavigationCheck('portrait');});
  await check('Construction/cancellation, real-time completion and selected-district upgrades remain usable', async () => {
    await tap('[data-mobile-panel="build"]');
    for (const part of ['.build-option .name', '.build-option .cost']) assert.ok(await page.locator(part).first().evaluate(element => parseFloat(getComputedStyle(element).fontSize) >= 14));
    await tap('[data-building="sawmill"]'); assert.equal(await panel(), 'city');
    const ground = await worldPoint({ground: true});
    if (ground) {await page.touchscreen.tap(ground.x, ground.y); assert.equal((await state()).target, null);}
    await tap('[data-mobile-panel="build"]'); await tap('#cancel-build'); assert.equal((await state()).buildings[0], null);
    await tap('[data-building="sawmill"]'); await tap('[data-slot="0"]');
    assert.equal((await state()).buildings[0].type, 'sawmill'); await screenshot('portrait-construction');
    await page.waitForFunction(() => window.__colossus.state.buildings[0].remaining <= 0, null, {timeout: 20000});
    await tap('[data-upgrade="0"]'); assert.equal((await state()).buildings[0].upgrading, true);
    assert.equal((await state()).target, null); await screenshot('portrait-upgrade'); await closePanel();
  });
  await check('Camera drag, pinch and touch cancellation do not pick terrain; direction-pad cancellation clears movement', async () => {
    await tap('[data-view="world"]'); await wait(1100); await clearTargetFixture();
    const point = await canvasArea(); assert.ok(point);
    const yaw = await page.evaluate(() => window.__colossus.scene.yaw);
    await touch('touchStart', [point]); await touch('touchMove', [{x: point.x + 45, y: point.y + 30}]); await touch('touchEnd');
    assert.notEqual(await page.evaluate(() => window.__colossus.scene.yaw), yaw); assert.equal((await state()).target, null);
    const zoom = await page.evaluate(() => window.__colossus.scene.zoom);
    await touch('touchStart', [{x: point.x - 35, y: point.y}, {x: point.x + 35, y: point.y}]);
    await touch('touchMove', [{x: point.x - 65, y: point.y}, {x: point.x + 65, y: point.y}]); await touch('touchEnd');
    assert.ok(await page.evaluate(before => window.__colossus.scene.zoom < before, zoom)); assert.equal((await state()).target, null);
    await touch('touchStart', [point]); await touch('touchCancel'); assert.equal((await state()).target, null);
    const up = await hitTarget(page.locator('[data-move="up"]')), before = await state();
    await touch('touchStart', [{x: up.x, y: up.y}]); await wait(600); await touch('touchCancel');
    const stopped = await state(); assert.ok(Math.hypot(stopped.x - before.x, stopped.z - before.z) > .3);
    await wait(400); const after = await state(); assert.ok(Math.hypot(after.x - stopped.x, after.z - stopped.z) < .05, 'Movement continues after pointercancel');
  });
  await check('Orientation change preserves reachable labels, panels and targets at 844×390', async () => {
    await page.setViewportSize({width: 844, height: 390}); await wait(1200);
    await tap('[data-view="world"]'); await markerEvidence('landscape panels closed', {requireOne: true});
    for (const name of ['city', 'map', 'build']) {await tap(`[data-mobile-panel="${name}"]`); await hitTarget(page.locator('[data-close-panel]:visible').first()); await markerEvidence(`landscape ${name} open`); await screenshot(`landscape-${name}`); await closePanel();}
    for (const selector of ['#pause', '[data-mobile-panel="city"]', '[data-mobile-panel="build"]', '[data-mobile-panel="map"]', '#mobile-menu', '[data-move="up"]']) await hitTarget(page.locator(selector));
    await tap('[data-mobile-panel="city"]');
    const sheet = page.locator('.left-stack'); const dims = await sheet.evaluate(element => ({height: element.clientHeight, scroll: element.scrollHeight}));
    assert.ok(dims.scroll > dims.height, 'Landscape City sheet should have scrollable content');
    const before = await sheet.evaluate(element => element.scrollTop); const box = await sheet.boundingBox();
    await touch('touchStart', [{x: box.x + box.width - 24, y: box.y + box.height - 25}]);
    for (let step = 1; step <= 5; step++) {await touch('touchMove', [{x: box.x + box.width - 24, y: box.y + box.height - 25 - step * 18}]); await wait(35);}
    await touch('touchEnd'); await wait(150);
    assert.ok(await sheet.evaluate((element, before) => element.scrollTop > before, before), 'Actual touch swipe did not scroll City sheet');
    await closePanel();
  });
  await check('Settings preserve manual preset choice and prior pause state without UI travel', async () => {
    await clearTargetFixture(); await tap('#pause'); assert.equal((await state()).paused, true);
    await tap('#mobile-menu');
    for (const key of ['quality', 'lighting', 'camera-motion', 'sound', 'audio-settings', 'speed']) await hitTarget(page.locator(`[data-setting="${key}"]`), {font: 14});
    const q = await page.evaluate(() => window.__colossus.scene.quality);
    for (let i = 0; i < 3; i++) await tap('[data-setting="quality"]');
    assert.equal(await page.evaluate(() => window.__colossus.scene.quality), q);
    assert.equal(await page.evaluate(() => localStorage.getItem('colossus-quality-v1')), q);
    await screenshot('landscape-settings'); await tap('#close-dialog');
    assert.equal((await state()).paused, true); assert.equal((await state()).target, null); await tap('#pause');
  });
  await check('Landscape Playtest toolbar reserves opaque full width, section shortcuts land correctly and dialog scroll resets', async () => {await dialogNavigationCheck('landscape');});
  await check('Opt-in sample excludes paused menu time, observes actual play, copies/downloads then stops/resets', async () => {
    await openPlaytest(); await tap('#sample-start'); await wait(800); assert.equal(await sampleCount(), 0);
    await tap('#close-dialog'); await wait(2200); await openPlaytest(); await wait(650);
    const count = await sampleCount(); assert.ok(count > 10, `Sample only has ${count} intervals after active play`);
    await wait(650); assert.equal(await sampleCount(), count, 'Paused menu continued sampling');
    await tap('#sample-stop'); await page.locator('#feedback-notes').fill('Isolated iPhone presentation regression.');
    await tap('#copy-feedback');
    const copied = await page.evaluate(async () => navigator.clipboard.readText());
    assert.match(copied, /Frame-scheduling sample: stopped/); assert.match(copied, /Render buffer: \d+ × \d+/);
    assert.match(copied, /Browser requestAnimationFrame scheduling intervals; not GPU timings or native presented FPS/);
    assert.match(copied, /paused: [\d.]+ ms \/ [1-9]\d* episode/);
    const downloadPromise = page.waitForEvent('download'); await tap('#download-feedback');
    const download = await downloadPromise; await download.saveAs(path.join(out, 'sample-feedback.txt'));
    assert.equal((await fs.readFile(path.join(out, 'sample-feedback.txt'), 'utf8')).replace(/\r\n/g, '\n'), copied.replace(/\r\n/g, '\n'));
    await screenshot('landscape-playtest'); await tap('#sample-reset'); assert.match(await page.locator('#sample-status').textContent(), /No sample yet/);
    await tap('#close-dialog');
    await page.waitForFunction(() => !document.getElementById('dialog').open && !window.__colossus.state.paused);
    assert.equal((await state()).paused, false);
  });
  await check('Background/pagehide clears held controls; headless visibility capability reported separately', async () => {
    await clearTargetFixture(); const up = await hitTarget(page.locator('[data-move="up"]'));
    await touch('touchStart', [{x: up.x, y: up.y}]); await wait(150);
    const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront(); await wait(100);
    const reallyHidden = await page.evaluate(() => document.hidden);
    if (!reallyHidden) {report.observations.push({background: 'Headless Chrome kept document visible. Pagehide input-clearing event is synthetic; real iOS lock/background is untested.'}); await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));}
    else report.observations.push({background: 'Actual tab switching produced document.hidden=true.'});
    await page.bringToFront(); await other.close();
    assert.equal(await page.locator('[data-move="up"]').evaluate(element => element._heldPointers?.size || 0), 0, 'Held pointer bookkeeping survived background/pagehide');
    await touch('touchCancel');
    if ((await state()).paused) await tap('#pause');
    const before = await state(); await wait(450); const after = await state();
    assert.ok(Math.hypot(after.x - before.x, after.z - before.z) < .05, 'Held movement survived background/pagehide');
  });
  await check('Battle controls are readable touch targets and still operate', async () => {
    await page.evaluate(() => {const s = window.__colossus.state; s.x = s.enemies[0].x - 32; s.z = s.enemies[0].z; s.target = null; window.__colossus.advance(0);});
    await tap('[data-mobile-panel="map"]'); await page.locator('#minimap').scrollIntoViewIfNeeded(); const box = await page.locator('#minimap').boundingBox(); const enemy = (await state()).enemies[0];
    await page.touchscreen.tap(box.x + (enemy.x + 180) / 360 * box.width, box.y + (enemy.z + 180) / 360 * box.height);
    await initialRivalAction('landscape', 'engage'); await screenshot('landscape-rival-action');
    await tap('[data-engage]'); assert.equal((await state()).mode, 'battle');
    await battleToastGeometry('landscape battle entry', /Battle stations\. Choose your distance and use your special ability\./);
    await screenshot('landscape-battle-entry-toast');
    await battlePanelGeometry('landscape');
    for (const selector of ['[data-command="approach"]', '[data-command="hold"]', '[data-command="retreat"]', '#autofire', '#fire', '#ability', '#withdraw']) await hitTarget(page.locator(selector), {font: 14});
    await outOfRangeAbilityToast('landscape-battle');
    await tap('[data-command="approach"]'); assert.equal((await state()).battle.command, 'approach');
    await tap('[data-command="hold"]'); await screenshot('landscape-battle');
    await page.setViewportSize({width: 390, height: 844}); await wait(400); await battlePanelGeometry('portrait');
    for (const selector of ['[data-command="approach"]', '#autofire', '#fire', '#ability', '#withdraw']) await hitTarget(page.locator(selector), {font: 14});
    await outOfRangeAbilityToast('portrait-battle');
    await screenshot('portrait-battle'); await tap('#withdraw'); assert.equal((await state()).mode, 'expedition');
  });
  await context.close();
  await begin({width: 1440, height: 960}, false);
  await check('Desktop camera/keyboard controls and actual marker pointer targets remain intact', async () => {
    await tap('[data-view="world"]', {minimum: 0}); await wait(1200); await markerEvidence('desktop normal HUD', {requireOne: true});
    const before = await state(); await page.keyboard.down('w'); await wait(450); await page.keyboard.up('w'); const after = await state();
    assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > .5);
    const p = await canvasArea(); assert.ok(p); const yaw = await page.evaluate(() => window.__colossus.scene.yaw);
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 40, p.y + 15, {steps: 5}); await page.mouse.up();
    assert.notEqual(await page.evaluate(() => window.__colossus.scene.yaw), yaw); await screenshot('desktop-hud');
  });
  assert.deepEqual(report.errors, []); assert.deepEqual(report.remote, []);
} catch (error) {
  if (!report.failures.length) report.failures.push({name: 'setup/runtime', message: error.stack});
  try {await screenshot('failure');} catch {}
  console.error(error.stack); process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({checks: report.checks.length, failures: report.failures.length, output: out}, null, 2));
}
