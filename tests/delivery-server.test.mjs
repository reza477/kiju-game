import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import {createDeliveryServer} from './helpers/delivery-server.mjs';

const release = name => ({files: new Map([
  ['/index.html', {bytes: Buffer.from(`<title>Frozen ${name}</title>`), type: 'text/html'}],
  ['/release.json', {bytes: Buffer.from(JSON.stringify({build: name})), type: 'application/json'}],
])});
const releases = () => ({A: release('A'), B: release('B')});

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = http.request(url, {agent: false, ...options}, incoming => {
      const chunks = [];
      incoming.on('data', chunk => chunks.push(chunk)); incoming.on('error', reject);
      incoming.on('end', () => resolve({status: incoming.statusCode, body: Buffer.concat(chunks).toString()}));
    });
    outgoing.on('error', reject);
    outgoing.setTimeout(2000, () => outgoing.destroy(new Error('Socket test request exceeded two seconds.')));
    outgoing.end(options.body);
  });
}

test('actual server outage refuses sockets, retains no requests, and resumes B at the exact A origin', async () => {
  const host = await createDeliveryServer(releases()), origin = host.origin;
  try {
    host.inject({kind: 'unauthorized', path: '/protected'});
    assert.deepEqual(await request(origin), {status: 200, body: '<title>Frozen A</title>'});
    await Promise.all([host.close(), host.close()]);
    const count = host.requests.length;
    await assert.rejects(request(`${origin}/release.json`), error => error.code === 'ECONNREFUSED');
    await assert.rejects(request(origin), error => error.code === 'ECONNREFUSED');
    assert.equal(host.requests.length, count, 'No server request is recorded during the actual outage');
    host.select('B');
    await Promise.all([host.resume(), host.resume()]);
    assert.equal(host.origin, origin);
    assert.deepEqual(await request(origin), {status: 200, body: '<title>Frozen B</title>'});
    assert.equal((await request(`${origin}/protected`)).status, 401, 'Fault selection survives the outage');
    assert.deepEqual(host.requests.map(({release, path}) => [release, path]), [['A', '/index.html'], ['B', '/index.html'], ['B', '/protected']]);
  } finally {await host.close(); await host.close();}
  await assert.rejects(request(origin), error => error.code === 'ECONNREFUSED');
});

test('resume rejects an occupied original port and remains usable after that conflict clears', async () => {
  const host = await createDeliveryServer(releases()), port = Number(new URL(host.origin).port);
  const blocker = http.createServer();
  try {
    await host.close();
    await new Promise((resolve, reject) => {blocker.once('error', reject); blocker.listen(port, '127.0.0.1', resolve);});
    await assert.rejects(host.resume(), error => error.code === 'EADDRINUSE');
    assert.equal(host.requests.length, 0);
    await new Promise((resolve, reject) => blocker.close(error => error ? reject(error) : resolve()));
    await host.resume();
    assert.deepEqual(await request(host.origin), {status: 200, body: '<title>Frozen A</title>'});
    await Promise.all([host.close(), host.resume()]);
    assert.deepEqual(await request(host.origin), {status: 200, body: '<title>Frozen A</title>'}, 'Queued resume waits for the preceding close');
  } finally {
    if (blocker.listening) await new Promise(resolve => blocker.close(resolve));
    await host.close();
  }
});

test('request timestamps are valid and evidence omits query strings, credentials and bodies', async () => {
  const host = await createDeliveryServer(releases());
  try {
    const began = Date.now();
    await request(`${host.origin}/release.json?token=query-secret`, {method: 'POST',
      headers: {Authorization: 'Bearer header-secret', Cookie: 'session=cookie-secret'}, body: 'body-secret'});
    assert.equal(host.requests.length, 1);
    const record = host.requests[0];
    assert.deepEqual(Object.keys(record).sort(), ['at', 'injected', 'path', 'release', 'status']);
    assert.equal(record.path, '/release.json'); assert.equal(record.status, 405);
    assert.match(record.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.ok(Date.parse(record.at) >= began && Date.parse(record.at) <= Date.now());
    assert.doesNotMatch(JSON.stringify(host.requests), /secret|token|Bearer|session=/);
  } finally {await host.close();}
});
