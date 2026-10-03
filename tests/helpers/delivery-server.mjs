import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Serves only integrity-listed runtime files, plus the two generated release
// files. It never serves the checkout, profiles, reports, or arbitrary paths.
export async function readFrozenRelease(directory) {
  assert.ok(directory, 'A frozen release directory is required; this gate never builds its tested releases.');
  const root = await fs.realpath(path.resolve(directory));
  const releaseBytes = await fs.readFile(path.join(root, 'release.json'));
  const descriptor = JSON.parse(releaseBytes);
  assert.equal(descriptor.app, 'colossus-wake');
  assert.match(descriptor.buildId, /^[a-f0-9]{20}$/);
  const files = new Map();
  for (const entry of descriptor.files) {
    assert.match(entry.url, /^\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/);
    assert.ok(!entry.url.split('/').includes('..'));
    assert.ok(!files.has(entry.url), `Duplicate runtime path ${entry.url}`);
    const bytes = await fs.readFile(path.join(root, entry.url.slice(1)));
    assert.equal(bytes.length, entry.bytes, `${entry.url} length`);
    assert.equal(digest(bytes), entry.sha256, `${entry.url} digest`);
    files.set(entry.url, {bytes, type: entry.type});
  }
  files.set('/release.json', {bytes: releaseBytes, type: 'application/json'});
  files.set('/sw.js', {bytes: await fs.readFile(path.join(root, 'sw.js')), type: 'text/javascript'});
  return {root, descriptor, files};
}

export async function createDeliveryServer(releases) {
  let selected = 'A', fault = null;
  const requests = [], sockets = new Set();
  const server = http.createServer((request, response) => {
    const address = new URL(request.url, 'http://localhost');
    const pathname = address.pathname === '/' ? '/index.html' : address.pathname;
    // No cookies, authorization headers, or request query strings are logged.
    const record = {at: new Date().toISOString(), release: selected, path: pathname, status: 200, injected: false};
    requests.push(record);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET' && request.method !== 'HEAD') {record.status = 405; response.writeHead(405).end(); return;}
    if (fault?.path === pathname) {
      record.injected = true;
      if (fault.kind === 'interrupt') {record.status = 'connection-dropped'; request.socket.destroy(); return;}
      if (fault.kind === 'html') {record.status = 200; response.writeHead(200, {'Content-Type': 'text/html'}).end('<!doctype html><title>Authentication fixture</title><p>Sign in</p>'); return;}
      const status = fault.kind === 'unauthorized' ? 401 : 404;
      record.status = status; response.writeHead(status, {'Content-Type': 'text/plain'}).end('Deliberate delivery test fixture'); return;
    }
    const file = releases[selected].files.get(pathname);
    if (!file) {record.status = 404; response.writeHead(404).end(); return;}
    response.writeHead(200, {'Content-Type': file.type, 'Content-Length': file.bytes.length});
    response.end(request.method === 'HEAD' ? undefined : file.bytes);
  });
  server.on('connection', socket => {sockets.add(socket); socket.on('close', () => sockets.delete(socket));});
  const listen = port => new Promise((resolve, reject) => {
    const clear = () => {server.off('error', failed); server.off('listening', ready);};
    const failed = error => {clear(); reject(error);};
    const ready = () => {clear(); resolve();};
    server.once('error', failed); server.once('listening', ready);
    try {server.listen(port, '127.0.0.1');} catch (error) {failed(error);}
  });
  await listen(0);
  const port = server.address().port;
  // Preserve the exact origin across a real server outage. Serialize lifecycle
  // requests so resume cannot race an unfinished close, or choose a fresh port.
  let lifecycle = Promise.resolve();
  const transition = action => {
    const result = lifecycle.then(action);
    lifecycle = result.catch(() => {}); return result;
  };
  return {
    origin: `http://127.0.0.1:${port}`, requests,
    select(name) {assert.ok(releases[name]); selected = name;},
    inject(value) {fault = value;},
    close() {
      return transition(async () => {
        if (!server.listening) return;
        const closed = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        for (const socket of sockets) socket.destroy();
        await closed;
      });
    },
    resume() {
      return transition(async () => {if (!server.listening) await listen(port);});
    },
  };
}
