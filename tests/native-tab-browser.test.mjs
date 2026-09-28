import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {nativeBrowserLaunchSpec, prepareNativeTouchPage, tapNativeCoordinates, tapNativeLocator} from '../scripts/native-tab-browser.mjs';

const env = {PLAYTEST_GRAPHICS_BACKEND: 'llvmpipe', DISPLAY: ':99', LIBGL_ALWAYS_SOFTWARE: 'true', GALLIUM_DRIVER: 'llvmpipe'};
const profileDirectory = path.resolve('artifacts', 'fake-owned-native-profile');

test('native driver is pinned, isolated, headed, and rejects broad endpoint/profile overrides', () => {
  const specification = nativeBrowserLaunchSpec({platform: 'linux', env, profileDirectory, launchOptions: {args: ['--use-angle=gl']}});
  assert.match(specification.executable, /chrom(?:e|ium)/i);
  assert.ok(specification.args.includes('--remote-debugging-address=127.0.0.1'));
  assert.ok(specification.args.includes('--remote-debugging-port=0'));
  assert.ok(specification.args.includes(`--user-data-dir=${profileDirectory}`));
  assert.ok(specification.args.includes('--use-angle=gl'));
  assert.equal(specification.args.some(value => /headless|disable-background-timer-throttling|disable-backgrounding-occluded-windows|disable-renderer-backgrounding/.test(value)), false);
  for (const missing of Object.keys(env)) assert.throws(() => nativeBrowserLaunchSpec({platform: 'linux', env: {...env, [missing]: ''}, profileDirectory}), /requires? the|require the/);
  assert.throws(() => nativeBrowserLaunchSpec({platform: 'win32', env, profileDirectory}), /require/);
  assert.throws(() => nativeBrowserLaunchSpec({platform: 'linux', env, profileDirectory, launchOptions: {channel: 'chrome'}}), /pinned/);
  for (const flag of ['--headless', '--headless=new', '--remote-debugging-port=9222', '--remote-debugging-pipe', '--remote-debugging-address=0.0.0.0', '--user-data-dir=somewhere']) {
    assert.throws(() => nativeBrowserLaunchSpec({platform: 'linux', env, profileDirectory, launchOptions: {args: [flag]}}), /may not replace/);
  }
});

test('installed diagnostic executable is an explicit absolute-path exception, never a channel lookup or install', () => {
  const executable = path.resolve('diagnostic', 'chrome.exe');
  assert.equal(nativeBrowserLaunchSpec({profileDirectory, diagnosticExecutablePath: executable}).executable, executable);
  assert.throws(() => nativeBrowserLaunchSpec({profileDirectory, diagnosticExecutablePath: 'chrome.exe'}), /absolute/);
  assert.throws(() => nativeBrowserLaunchSpec({profileDirectory: 'relative', diagnosticExecutablePath: executable}), /absolute/);
});

function fakePage() {
  const calls = [], listeners = new Map();
  let sessions = 0;
  const page = {context: () => ({async newCDPSession() {sessions++; return {async send(method, parameters) {calls.push({method, parameters});}, async detach() {calls.push({method: 'detach'});}};}}),
    once(name, callback) {listeners.set(name, callback);}};
  return {page, calls, listeners, sessionCount: () => sessions};
}

test('native mobile preparation retains its session without focus, script, RAF or clock changes', async () => {
  const fixture = fakePage();
  await prepareNativeTouchPage(fixture.page);
  assert.deepEqual(fixture.calls, [
    {method: 'Emulation.setDeviceMetricsOverride', parameters: {width: 844, height: 390, deviceScaleFactor: 1, mobile: true, screenWidth: 844, screenHeight: 390, screenOrientation: {type: 'landscapePrimary', angle: 90}}},
    {method: 'Emulation.setTouchEmulationEnabled', parameters: {enabled: true, maxTouchPoints: 1}},
  ]);
  await prepareNativeTouchPage(fixture.page);
  assert.equal(fixture.sessionCount(), 1);
  fixture.listeners.get('close')();
  assert.equal(fixture.calls.at(-1).method, 'detach');
  await assert.rejects(tapNativeCoordinates(fixture.page, 1, 1), /Prepare/);
});

test('locator touch retains trial actionability and sends actual touch start/end only', async () => {
  const fixture = fakePage(), sequence = [];
  await prepareNativeTouchPage(fixture.page); fixture.calls.length = 0;
  const locator = {async click(options) {sequence.push(options);}, async boundingBox() {sequence.push('box'); return {x: 10, y: 20, width: 60, height: 40};}, page: () => fixture.page};
  await tapNativeLocator(locator, {timeout: 1200});
  assert.deepEqual(sequence, [{trial: true, timeout: 1200}, 'box']);
  assert.deepEqual(fixture.calls, [
    {method: 'Input.dispatchTouchEvent', parameters: {type: 'touchStart', touchPoints: [{id: 0, x: 40, y: 40}]}},
    {method: 'Input.dispatchTouchEvent', parameters: {type: 'touchEnd', touchPoints: []}},
  ]);
  fixture.calls.length = 0;
  await assert.rejects(tapNativeLocator({...locator, async click() {throw new Error('not actionable');}}), /not actionable/);
  await assert.rejects(tapNativeLocator({...locator, async boundingBox() {return null;}}), /bounding box/);
  await assert.rejects(tapNativeCoordinates(fixture.page, NaN, 2), /finite/);
  await assert.rejects(tapNativeCoordinates(fixture.page, -1, 2), /nonnegative/);
  assert.deepEqual(fixture.calls, []);
});
