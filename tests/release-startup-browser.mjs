import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {deliveryBrowserOptions} from '../scripts/browser-runtime.mjs';

// Exercise the actual offline.js client and native Worker while its first ready
// message is delayed. The separate transport test covers the network deadline.
const root = process.env.GAME_RELEASE_DIR;
assert.ok(root, 'Use the same frozen runtime as the full game gate.');
const files = new Map(await Promise.all(['offline.js', 'build-info.js', 'release-fetch-worker.js'].map(async name =>
  [`/src/${name}`, await readFile(path.join(root, 'src', name))])));
const descriptor = {app: 'colossus-wake', schemaVersion: 1, buildId: 'a'.repeat(20), files: [{url: '/index.html'}, {url: '/src/build-info.js'}]};
let mode;
const timers = new Set(), requests = [];
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const record = {scenario: mode, path: pathname, receivedAt: Date.now()};
  requests.push(record);
  response.on('finish', () => {record.finishedAt = Date.now();});
  response.setHeader('Cache-Control', 'no-store');
  if (pathname === '/') {response.writeHead(200, {'Content-Type': 'text/html'}).end('<!doctype html><title>Checker startup regression</title>'); return;}
  if (pathname === '/release.json') {response.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify(descriptor)); return;}
  if (!files.has(pathname)) {response.writeHead(404).end(); return;}
  const send = () => response.writeHead(200, {'Content-Type': 'text/javascript'}).end(
    pathname.endsWith('/release-fetch-worker.js') && mode === 'never-ready' ? '// Deliberately never announces readiness.' : files.get(pathname));
  if (pathname.endsWith('/release-fetch-worker.js') && mode === 'repeated-stalls') {
    const timer = setTimeout(() => {timers.delete(timer); send();}, 26000);
    timers.add(timer);
  } else send();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = {scope: 'Native worker bootstrap with the frozen production client. Registration is intentionally stopped at the installation boundary; no gameplay/device claim.', checks: [], observations: [], requests};
let browser, context;
try {
  browser = await chromium.launch(deliveryBrowserOptions());
  report.browser = browser.version();
  context = await browser.newContext();
  for (const scenario of ['single-stall', 'repeated-stalls', 'never-ready']) {
    mode = scenario;
    const page = await context.newPage();
    await page.goto(origin);
    let guard;
    const result = await Promise.race([page.evaluate(async selected => {
      const offline = await import('/src/offline.js');
      const statuses = [], workers = [];
      const unsubscribe = offline.subscribeOfflineStatus(value => statuses.push({state: value.state, message: value.message}));
      // This fixture ends once the real client hands verified metadata to its
      // installer. Full service-worker/save behavior belongs to delivery-browser.
      navigator.serviceWorker.getRegistration = async () => null;
      navigator.serviceWorker.register = async () => {throw new Error('Intentional test boundary after verified metadata');};
      const NativeWorker = window.Worker;
      let constructed;
      const construction = new Promise(resolve => {constructed = resolve;});
      window.Worker = class extends NativeWorker {
        constructor(...args) {super(...args); workers.push(this); constructed();}
        terminate() {this.testTerminated = true; return super.terminate();}
      };
      const start = performance.now(), stalls = [];
      const operation = offline.prepareOffline();
      await construction;
      const block = milliseconds => {
        const began = Date.now(), until = performance.now() + milliseconds;
        while (performance.now() < until) { /* Deliberate main-thread fixture. */ }
        stalls.push({began, ended: Date.now()});
      };
      if (selected === 'single-stall') block(31500);
      if (selected === 'repeated-stalls') {
        block(16000);
        await new Promise(resolve => setTimeout(resolve, 500));
        block(16000);
      }
      const status = await operation;
      unsubscribe(); window.Worker = NativeWorker;
      return {elapsedMs: performance.now() - start, status, statuses, stalls, workerCount: workers.length,
        terminated: workers.every(worker => worker.testTerminated === true)};
    }, scenario), new Promise((_, reject) => {guard = setTimeout(() => reject(new Error(`Startup regression ${scenario} exceeded 50 seconds.`)), 50000);})]).finally(() => clearTimeout(guard));
    report.observations.push({scenario, ...result});
    assert.equal(result.workerCount, 1);
    assert.equal(result.terminated, true, 'Every startup outcome cleans its native worker.');
    if (scenario === 'never-ready') {
      assert.match(result.status.message, /checker could not start/);
      assert.ok(result.elapsedMs >= 29500 && result.elapsedMs < 45000, 'Responsive-page startup failure stays near thirty seconds.');
      assert.equal(result.statuses.some(status => status.state === 'installing'), false);
      assert.equal(requests.some(request => request.scenario === scenario && request.path === '/release.json'), false);
    } else {
      assert.equal(result.statuses.some(status => status.state === 'installing'), true, 'Verified metadata reaches installation despite startup rendering stalls.');
      assert.match(result.status.message, /Intentional test boundary/);
      assert.ok(result.elapsedMs >= 31500);
      const workerRequest = requests.find(request => request.scenario === scenario && request.path.endsWith('/release-fetch-worker.js'));
      assert.ok(workerRequest?.finishedAt, 'A real worker source was served.');
      assert.ok(requests.some(request => request.scenario === scenario && request.path === '/release.json'), 'The real worker fetched metadata.');
    }
    report.checks.push({scenario, ...result});
    console.log(`PASS metadata startup: ${scenario}`);
    await page.close();
  }
  report.passed = true;
} catch (error) {
  report.failure = error.message; process.exitCode = 1; throw error;
} finally {
  const output = path.resolve(process.env.OUTPUT_DIR || 'artifacts/delivery/browser');
  await mkdir(output, {recursive: true});
  await writeFile(path.join(output, 'release-startup.json'), JSON.stringify(report, null, 2));
  await context?.close(); await browser?.close();
  for (const timer of timers) clearTimeout(timer);
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
