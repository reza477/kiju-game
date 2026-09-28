// Test-driver support only. A temporary Chromium default context connected with
// noDefaults avoids Playwright's focus override. The caller must independently
// prove native visibility and RAF behavior; noDefaults alone is not proof.
// This does not alter the game, its RAF, clocks, storage, or service workers.
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const nativePages = new WeakMap();
const forbiddenLaunchArgument = /^--(?:user-data-dir|remote-debugging-(?:port|pipe|address)|headless)(?:=|$)/;

export function nativeBrowserLaunchSpec({launchOptions = {}, profileDirectory, diagnosticExecutablePath,
  platform = process.platform, env = process.env} = {}) {
  if (!path.isAbsolute(profileDirectory || '')) throw new Error('A private absolute temporary profile path is required.');
  const diagnostic = !!diagnosticExecutablePath;
  if (diagnostic && !path.isAbsolute(diagnosticExecutablePath)) throw new Error('The diagnostic browser executable must be an absolute path.');
  if (!diagnostic && (platform !== 'linux' || env.PLAYTEST_GRAPHICS_BACKEND !== 'llvmpipe' || !env.DISPLAY
      || env.LIBGL_ALWAYS_SOFTWARE !== 'true' || env.GALLIUM_DRIVER !== 'llvmpipe')) {
    throw new Error('Native delivery tabs require the explicitly selected Linux llvmpipe/Xvfb environment.');
  }
  if (!diagnostic && (launchOptions.channel || launchOptions.executablePath)) {
    throw new Error('Native delivery tabs use the pinned Playwright Chromium executable.');
  }
  const additional = launchOptions.args || [];
  if (!Array.isArray(additional) || additional.some(value => typeof value !== 'string' || forbiddenLaunchArgument.test(value))) {
    throw new Error('Browser arguments may not replace the owned profile, debugging endpoint, or native window mode.');
  }
  return {
    executable: diagnosticExecutablePath || chromium.executablePath(),
    args: ['--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
      '--disable-default-apps', '--disable-extensions', '--disable-sync', '--password-store=basic', '--use-mock-keychain',
      '--enable-automation', '--no-sandbox', '--window-size=1000,700', '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0', `--user-data-dir=${profileDirectory}`, ...additional, 'about:blank'],
  };
}

async function settledWithin(promise, milliseconds) {
  let timer;
  try {return await Promise.race([promise.then(() => true, () => true), new Promise(resolve => {timer = setTimeout(() => resolve(false), milliseconds);})]);}
  finally {clearTimeout(timer);}
}

// The only Windows use is an explicitly selected, already installed executable
// for local diagnosis. CI always uses its pinned Linux Chromium, with no install.
export async function launchNativeTabContext({launchOptions = {}, timeoutMs = 30000, diagnosticExecutablePath} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('A positive native browser startup timeout is required.');
  const base = path.resolve(os.tmpdir()), profileDirectory = await fs.mkdtemp(path.join(base, 'colossus-native-'));
  let child, browser, closed, processError, exited = Promise.resolve();
  const cleanup = async () => {
    const problems = [];
    if (browser?.isConnected()) {
      const shutdown = (async () => {
        const session = await browser.newBrowserCDPSession();
        // Browser.close targets this owned browser, unlike browser.close(),
        // which merely disconnects a connectOverCDP client.
        await session.send('Browser.close').catch(() => {});
      })();
      await settledWithin(shutdown, 3000);
      await settledWithin(browser.close(), 3000);
    }
    if (child && child.exitCode === null && child.signalCode === null && !await settledWithin(exited, 2000)) {
      if (process.platform === 'win32') {
        // Exact owned PID and descendants only; never kill by process name.
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
        await settledWithin(new Promise(resolve => {killer.once('exit', resolve); killer.once('error', resolve);}), 5000);
      } else {
        try {process.kill(-child.pid, 'SIGTERM');} catch (error) {if (error.code !== 'ESRCH') problems.push('Could not terminate owned browser process group.');}
        if (!await settledWithin(exited, 3000)) {
          try {process.kill(-child.pid, 'SIGKILL');} catch (error) {if (error.code !== 'ESRCH') problems.push('Could not stop owned browser process group.');}
        }
      }
      if (!await settledWithin(exited, 3000)) problems.push('Owned browser process did not exit.');
    }
    // mkdtemp is the sole source of this path. Check its exact parent/name again
    // before deleting recursively; never accept a caller-supplied profile.
    if (path.dirname(profileDirectory) !== base || !path.basename(profileDirectory).startsWith('colossus-native-')) {
      problems.push('Refused unexpected temporary profile cleanup path.');
    } else {
      try {await fs.rm(profileDirectory, {recursive: true, force: true, maxRetries: 3, retryDelay: 200});}
      catch {problems.push('Could not remove the owned temporary browser profile.');}
    }
    if (problems.length) throw new Error(problems.join(' '));
  };
  const close = () => closed ||= cleanup();
  try {
    const specification = nativeBrowserLaunchSpec({launchOptions, profileDirectory, diagnosticExecutablePath});
    const began = performance.now();
    child = spawn(specification.executable, specification.args, {
      stdio: 'ignore', windowsHide: true, detached: process.platform !== 'win32',
    });
    exited = new Promise(resolve => {
      child.once('exit', resolve);
      child.once('error', () => {processError = true; resolve();});
    });
    let endpoint;
    while (performance.now() - began < timeoutMs) {
      if (processError || child.exitCode !== null || child.signalCode !== null) throw new Error('The owned native browser exited before connecting.');
      let value;
      try {value = await fs.readFile(path.join(profileDirectory, 'DevToolsActivePort'), 'utf8');}
      catch (error) {if (error.code !== 'ENOENT') throw new Error('Could not read the owned browser debugging endpoint.');}
      const [port, suffix] = (value || '').trim().split(/\r?\n/);
      if (/^\d+$/.test(port || '') && Number(port) > 0 && Number(port) <= 65535 && /^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(suffix || '')) {
        endpoint = `ws://127.0.0.1:${port}${suffix}`; break;
      }
      await pause(50);
    }
    if (!endpoint) throw new Error('The owned native browser did not expose its loopback endpoint within the startup deadline.');
    const remaining = timeoutMs - (performance.now() - began);
    if (remaining <= 0) throw new Error('Native browser startup exceeded its deadline.');
    browser = await chromium.connectOverCDP(endpoint, {noDefaults: true, isLocal: true, timeout: remaining});
    const contexts = browser.contexts();
    if (contexts.length !== 1) throw new Error('Expected exactly one private native browser default context.');
    return {browser, context: contexts[0], close};
  } catch (error) {
    await close().catch(cleanupError => {error.message += ` Cleanup: ${cleanupError.message}`;});
    throw error;
  }
}

export async function prepareNativeTouchPage(page, {width = 844, height = 390, deviceScaleFactor = 1} = {}) {
  if (![width, height, deviceScaleFactor].every(value => Number.isFinite(value) && value > 0)) throw new Error('Native touch viewport dimensions must be positive.');
  let session = nativePages.get(page);
  if (!session) {
    session = await page.context().newCDPSession(page);
    nativePages.set(page, session);
    page.once('close', () => {nativePages.delete(page); void session.detach().catch(() => {});});
  }
  // Keep this CDP session alive: emulation belongs to its session. Do not send a
  // focus command or inject visibility, RAF, timers, or input handlers.
  await session.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor, mobile: true,
    screenWidth: width, screenHeight: height, screenOrientation: {type: width >= height ? 'landscapePrimary' : 'portraitPrimary', angle: width >= height ? 90 : 0}});
  await session.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 1});
}

export async function tapNativeCoordinates(page, x, y) {
  if (![x, y].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Native tap requires finite nonnegative viewport coordinates.');
  const session = nativePages.get(page);
  if (!session) throw new Error('Prepare the native touch page before tapping.');
  let sent = false;
  try {
    await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{id: 0, x, y}]});
    sent = true;
  } finally {
    if (sent) await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  }
}

export async function tapNativeLocator(locator, {timeout} = {}) {
  // noDefaults leaves Playwright's immutable hasTouch context option unset, so
  // locator.tap() rejects. Preserve actionability with a no-input trial, then
  // dispatch a native touch sequence. This is not a mouse click or DOM click.
  await locator.click({trial: true, ...(timeout === undefined ? {} : {timeout})});
  const box = await locator.boundingBox();
  if (!box || ![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0) {
    throw new Error('The native touch target has no visible bounding box.');
  }
  await tapNativeCoordinates(locator.page(), box.x + box.width / 2, box.y + box.height / 2);
}
