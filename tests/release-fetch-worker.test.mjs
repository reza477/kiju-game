import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/release-fetch-worker.js', import.meta.url), 'utf8');
const release = {app: 'colossus-wake', schemaVersion: 1, buildId: 'a'.repeat(20), files: [{url: '/index.html'}, {url: '/src/build-info.js'}]};
const response = value => new Response(typeof value === 'string' ? value : JSON.stringify(value), {headers: {'Content-Type': 'application/json'}});

function harness(fetcher) {
  const messages = [], timers = new Map(), calls = []; let receive, sequence = 0;
  vm.runInNewContext(source, {
    self: {addEventListener: (name, callback) => {assert.equal(name, 'message'); receive = callback;}, postMessage: data => messages.push(structuredClone(data))},
    AbortController,
    fetch: (url, options) => {calls.push({url, options}); return fetcher(url, options);},
    setTimeout: (callback, milliseconds) => {const id = ++sequence; timers.set(id, {callback, milliseconds}); return id;},
    clearTimeout: id => timers.delete(id),
  });
  return {messages, timers, calls, run: data => receive({data: data ?? {type: 'fetch-release'}})};
}

test('worker reads the full body and clears its 8-second deadline before late main delivery', async () => {
  let readBody = false;
  const worker = harness(async () => ({ok: true, status: 200, redirected: false, headers: new Headers({'Content-Type': 'application/json'}), async json() {readBody = true; return release;}}));
  assert.deepEqual(worker.messages, [{type: 'release-ready'}]);
  await worker.run();
  assert.equal(readBody, true); assert.equal(worker.timers.size, 0);
  assert.deepEqual(worker.messages[1], {type: 'release-result', release});
  const call = worker.calls[0];
  assert.equal(call.url, '/release.json');
  assert.equal(call.options.cache, 'no-store'); assert.equal(call.options.credentials, 'same-origin'); assert.equal(call.options.redirect, 'error');
  assert.equal(call.options.signal.aborted, false);
  // The outbound message may wait while the main thread renders. Its transport
  // is already complete; no remaining worker timer can invalidate it.
  for (const timer of worker.timers.values()) timer.callback();
  assert.equal(call.options.signal.aborted, false); assert.equal(worker.messages.length, 2);
  await worker.run(); assert.equal(worker.calls.length, 1, 'A single transport cannot start duplicate requests');
});

for (const stage of ['headers', 'body']) {
  test(`the unchanged 8-second deadline aborts genuinely hung ${stage}`, async () => {
    const worker = harness(async () => stage === 'headers' ? new Promise(() => {}) : {
      ok: true, status: 200, redirected: false, headers: new Headers({'Content-Type': 'application/json'}), json: () => new Promise(() => {}),
    });
    const pending = worker.run(); await Promise.resolve();
    const timers = [...worker.timers.values()]; assert.equal(timers.length, 1); assert.equal(timers[0].milliseconds, 8000);
    timers[0].callback(); await pending;
    assert.equal(worker.calls[0].options.signal.aborted, true);
    assert.deepEqual(worker.messages[1], {type: 'release-error', kind: 'timeout'});
    assert.equal(worker.timers.size, 0);
  });
}

test('authentication, HTML, redirects, malformed JSON and invalid metadata fail closed', async () => {
  const redirected = response(release); Object.defineProperty(redirected, 'redirected', {value: true});
  const cases = [
    [new Response('Unavailable', {status: 404}), 'unavailable'],
    [new Response('Denied', {status: 401}), 'unverified'],
    [new Response('<html>Sign in</html>', {headers: {'Content-Type': 'text/html'}}), 'unverified'],
    [redirected, 'unverified'],
    [response('{broken'), 'invalid'],
    [response(null), 'invalid'],
    [response({...release, buildId: 'wrong'}), 'invalid'],
    [response({...release, files: [{url: '/index.html'}]}), 'invalid'],
  ];
  for (const [body, kind] of cases) {
    const worker = harness(async () => body); await worker.run();
    assert.deepEqual(worker.messages[1], {type: 'release-error', kind}); assert.equal(worker.timers.size, 0);
  }
  const worker = harness(async () => {throw new TypeError('Redirect or network failure with details that must not be forwarded');});
  await worker.run();
  assert.deepEqual(worker.messages[1], {type: 'release-error', kind: 'network'});
});
