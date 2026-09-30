import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {deliveryBrowserOptions} from '../scripts/browser-runtime.mjs';

// A real browser/worker transport regression, separate from the rendered-game
// gate. Only a synthetic release descriptor and cookie leave these local servers.
const root = process.env.GAME_RELEASE_DIR;
assert.ok(root, 'Use the same frozen runtime as the delivery gate.');
const source = await readFile(path.join(root, 'src/release-fetch-worker.js'));
const descriptor = {app: 'colossus-wake', schemaVersion: 1, buildId: 'a'.repeat(20), files: [{url: '/index.html'}, {url: '/src/build-info.js'}]};
let mode = 'fast', foreignRequests = 0, metadataStarted;
const requests = [], timers = new Set();
const foreign = http.createServer((request, response) => {foreignRequests++; response.end('Foreign fixture');});
await new Promise(resolve => foreign.listen(0, '127.0.0.1', resolve));
const foreignOrigin = `http://127.0.0.1:${foreign.address().port}`;
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (pathname === '/') {
    response.writeHead(200, {'Content-Type': 'text/html', 'Set-Cookie': 'metadata-probe=synthetic; Path=/; SameSite=Lax'}).end('<!doctype html><title>Metadata transport regression</title>');
    return;
  }
  if (pathname === '/src/release-fetch-worker.js') {
    response.writeHead(200, {'Content-Type': 'text/javascript'}).end(source); return;
  }
  if (pathname !== '/release.json') {response.writeHead(404).end(); return;}
  const record = {mode, receivedAt: Date.now(), sameOriginCookie: request.headers.cookie === 'metadata-probe=synthetic'};
  requests.push(record);
  metadataStarted?.();
  response.on('finish', () => {record.finishedAt = Date.now();});
  request.on('close', () => {record.closedAt = Date.now();});
  if (mode === 'redirect') {response.writeHead(302, {Location: `${foreignOrigin}/metadata`}).end(); return;}
  if (mode === 'unauthorized') {response.writeHead(401, {'Content-Type': 'application/json'}).end('{}'); return;}
  if (mode === 'missing') {response.writeHead(404).end(); return;}
  if (mode === 'html') {response.writeHead(200, {'Content-Type': 'text/html'}).end('<title>Sign in</title>'); return;}
  if (mode === 'slow-headers') return; // Worker must abort the real pending fetch.
  response.writeHead(200, {'Content-Type': 'application/json'});
  if (mode === 'slow-body') {response.write('{"app":'); return;}
  if (mode === 'fast') {
    // Complete while the separate main-thread stall is actually in progress.
    const timer = setTimeout(() => {timers.delete(timer); response.end(JSON.stringify(descriptor));}, 750);
    timers.add(timer); return;
  }
  response.end(mode === 'invalid' ? '{broken JSON' : JSON.stringify(descriptor));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = {scope: 'Real dedicated-worker transport only; not gameplay or physical-phone evidence.', checks: [], requests, foreignRequests: 0};
let browser, context;
try {
  browser = await chromium.launch(deliveryBrowserOptions());
  report.browser = browser.version();
  context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin);
  for (const scenario of ['fast', 'slow-headers', 'slow-body', 'unauthorized', 'missing', 'html', 'invalid', 'redirect']) {
    mode = scenario;
    const started = new Promise(resolve => {metadataStarted = resolve;});
    const pending = page.evaluate(async () => {
      const start = performance.now();
      return new Promise((resolve, reject) => {
        const worker = new Worker('/src/release-fetch-worker.js');
        const timer = setTimeout(() => {worker.terminate(); reject(new Error('Transport regression exceeded 20 seconds.'));}, 20000);
        worker.onerror = event => {event.preventDefault(); clearTimeout(timer); worker.terminate(); reject(new Error('Transport worker failed to load.'));};
        worker.onmessage = ({data}) => {
          if (data.type === 'release-ready') {
            worker.postMessage({type: 'fetch-release'});
            return;
          }
          clearTimeout(timer); worker.terminate(); resolve({data, elapsedMs: performance.now() - start});
        };
      });
    });
    let stall;
    if (scenario === 'fast') {
      await Promise.race([started, pending.then(() => {throw new Error('Worker finished before issuing its metadata request.');})]);
      stall = await page.evaluate(() => {
        // Start after the worker's request reached the server, before its body
        // completes. Do not accidentally defer the request until after the stall.
        const began = Date.now(), until = performance.now() + 10500;
        while (performance.now() < until) { /* Deliberate regression fixture. */ }
        return {began, ended: Date.now()};
      });
    }
    const result = await pending;
    metadataStarted = null;
    const request = requests.at(-1);
    assert.equal(request.mode, scenario);
    assert.equal(request.sameOriginCookie, true, 'Same-origin authentication accompanies worker metadata requests.');
    if (scenario === 'fast') {
      assert.equal(result.data.type, 'release-result');
      assert.deepEqual(result.data.release, descriptor);
      assert.ok(result.elapsedMs >= 10500, 'Completed metadata survives delayed main-thread delivery beyond 8 seconds.');
      assert.ok(request.finishedAt - request.receivedAt < 8000, 'The server completed metadata inside its original deadline.');
      assert.ok(request.finishedAt > stall.began && request.finishedAt < stall.ended, 'The response really completed while the main thread was blocked.');
    } else {
      assert.equal(result.data.type, 'release-error');
      const expectedKind = scenario.startsWith('slow-') ? 'timeout' : scenario === 'missing' ? 'unavailable' : scenario === 'invalid' ? 'invalid' : scenario === 'redirect' ? 'network' : 'unverified';
      assert.equal(result.data.kind, expectedKind);
      if (scenario.startsWith('slow-')) assert.ok(result.elapsedMs >= 7500 && result.elapsedMs < 15000, 'A genuinely unfinished response retains the eight-second deadline.');
    }
    assert.equal(foreignRequests, 0, 'Metadata redirects never contact a foreign origin.');
    report.checks.push({scenario, elapsedMs: result.elapsedMs, outcome: result.data.type, ...(stall ? {mainThreadStall: stall} : {}), ...(result.data.kind ? {kind: result.data.kind} : {})});
    console.log(`PASS metadata transport: ${scenario}`);
  }
  report.passed = true;
} catch (error) {
  report.failure = error.message; process.exitCode = 1; throw error;
} finally {
  report.foreignRequests = foreignRequests;
  const output = path.resolve(process.env.OUTPUT_DIR || 'artifacts/delivery/browser');
  await mkdir(output, {recursive: true});
  await writeFile(path.join(output, 'release-transport.json'), JSON.stringify(report, null, 2));
  await context?.close(); await browser?.close();
  for (const timer of timers) clearTimeout(timer);
  server.closeAllConnections(); foreign.closeAllConnections();
  await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => foreign.close(resolve))]);
}
