import assert from 'node:assert/strict';
import test from 'node:test';
import {deliveryBrowserOptions, browserGraphicsInfo} from '../scripts/browser-runtime.mjs';

const mesaEnvironment = {PLAYTEST_GRAPHICS_BACKEND: 'llvmpipe', DISPLAY: ':99', LIBGL_ALWAYS_SOFTWARE: 'true', GALLIUM_DRIVER: 'llvmpipe'};
const renderer = 'ANGLE (Mesa, llvmpipe (LLVM 20.1.2, 256 bits), OpenGL 4.5)';

test('ordinary Windows and Linux browser settings retain their existing backends', () => {
  assert.deepEqual(deliveryBrowserOptions({platform: 'win32', env: {}}), {
    headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--use-angle=d3d11'],
  });
  assert.deepEqual(deliveryBrowserOptions({platform: 'linux', env: {}}), {
    headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader'],
  });
  assert.equal(deliveryBrowserOptions({platform: 'win32', env: {PLAYWRIGHT_CHANNEL: 'chrome'}}).channel, 'chrome');
});

test('Mesa diagnosis is explicit and needs the existing Linux display and software driver selection', () => {
  assert.deepEqual(deliveryBrowserOptions({platform: 'linux', env: mesaEnvironment}).args, [
    '--mute-audio', '--enable-gpu', '--use-gl=angle', '--use-angle=gl', '--use-cmd-decoder=passthrough',
  ]);
  for (const key of ['DISPLAY', 'LIBGL_ALWAYS_SOFTWARE', 'GALLIUM_DRIVER']) {
    assert.throws(() => deliveryBrowserOptions({platform: 'linux', env: {...mesaEnvironment, [key]: ''}}), /requires Linux/);
  }
  assert.throws(() => deliveryBrowserOptions({platform: 'win32', env: mesaEnvironment}), /requires Linux/);
  assert.throws(() => deliveryBrowserOptions({platform: 'linux', env: {PLAYTEST_GRAPHICS_BACKEND: 'unknown'}}), /Unsupported/);
});

function mockBrowser({cdpRenderer = renderer, probeResult = {}, evaluateError} = {}) {
  const calls = {detached: 0, closed: 0, pages: 0, pageClosed: 0};
  const browser = {
    async newBrowserCDPSession() {
      return {async send() {return {gpu: {auxAttributes: {glRenderer: cdpRenderer}, featureStatus: {webgl: 'enabled'}}};}, async detach() {calls.detached++;}};
    },
    async newPage() {
      calls.pages++;
      return {async evaluate() {
        if (evaluateError) throw evaluateError;
        return {available: true, renderer, version: 'WebGL 2.0 (OpenGL ES 3.0 Chromium)', pixel: [64, 128, 191, 255], error: 0, elapsedMs: 4, ...probeResult};
      }, async close() {calls.pageClosed++;}};
    },
    async close() {calls.closed++;},
  };
  return {browser, calls};
}

test('ordinary renderer reporting does not add a probe or change browser behavior', async () => {
  const {browser, calls} = mockBrowser();
  const info = await browserGraphicsInfo(browser, {platform: 'linux', env: {}});
  assert.equal(info.renderer, renderer);
  assert.equal(info.requestedBackend, 'auto');
  assert.deepEqual(calls, {detached: 1, closed: 0, pages: 0, pageClosed: 0});
});

test('Mesa diagnosis requires real WebGL2 pixel output and agrees with the CDP renderer', async () => {
  const {browser, calls} = mockBrowser();
  const info = await browserGraphicsInfo(browser, {platform: 'linux', env: mesaEnvironment});
  assert.equal(info.webgl2Probe.available, true);
  assert.equal(info.webgl2Probe.elapsedMs, 4);
  assert.deepEqual(info.webgl2Probe.pixel, [64, 128, 191, 255]);
  assert.deepEqual(calls, {detached: 2, closed: 0, pages: 1, pageClosed: 1});
});

test('Mesa diagnosis fails closed on fallback, unavailable WebGL2, or failed pixel rendering', async () => {
  for (const mismatch of [
    {cdpRenderer: 'ANGLE (Google, SwiftShader)'},
    {probeResult: {renderer: 'ANGLE (Google, SwiftShader)'}},
    {probeResult: {available: false}},
    {probeResult: {version: 'WebGL 1.0'}},
    {probeResult: {error: 1280}},
    {probeResult: {pixel: [0, 0, 0, 0]}},
    {evaluateError: new Error('Context creation failed')},
  ]) {
    const {browser, calls} = mockBrowser(mismatch);
    await assert.rejects(browserGraphicsInfo(browser, {platform: 'linux', env: mesaEnvironment}), /Backend evidence:/);
    assert.deepEqual(calls, {detached: mismatch.evaluateError ? 1 : 2, closed: 1, pages: 1, pageClosed: 1});
  }
});
