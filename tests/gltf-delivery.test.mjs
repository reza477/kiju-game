import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, mkdtemp, rm, copyFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {buildMobileRelease, sha256} from '../scripts/build-mobile-release.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const addonSources = [
  ['GLTFLoader.js', 'loaders/GLTFLoader.js'],
  ['BufferGeometryUtils.js', 'utils/BufferGeometryUtils.js'],
  ['SkeletonUtils.js', 'utils/SkeletonUtils.js'],
];
const vendorFiles = ['three.module.js', 'three.core.js', 'LICENSE', ...addonSources.map(([file]) => file)];

// An original one-triangle fixture exercises the binary loader, not Meshy art.
// Browser tests remain responsible for real embedded-image decoding and shading.
function triangleGlb() {
  const binary = Buffer.alloc(104);
  const positions = [0, 0, 0, 2, 0, 0, 0, 3, 0];
  const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
  const uv = [0, 0, 1, 0, 0, 1];
  for (const [values, offset] of [[positions, 0], [normals, 36], [uv, 72]]) values.forEach((value, i) => binary.writeFloatLE(value, offset + i * 4));
  [0, 1, 2].forEach((value, i) => binary.writeUInt16LE(value, 96 + i * 2));
  const json = {
    asset: {version: '2.0', generator: 'Colossus Wake loader regression fixture'},
    scene: 0, scenes: [{nodes: [0]}], nodes: [{mesh: 0}],
    meshes: [{primitives: [{attributes: {POSITION: 0, NORMAL: 1, TEXCOORD_0: 2}, indices: 3, material: 0}]}],
    materials: [{name: 'Matte fixture', pbrMetallicRoughness: {baseColorFactor: [.3, .4, .2, 1], metallicFactor: 0, roughnessFactor: .94}}],
    buffers: [{byteLength: binary.length}],
    bufferViews: [{buffer: 0, byteOffset: 0, byteLength: 36}, {buffer: 0, byteOffset: 36, byteLength: 36}, {buffer: 0, byteOffset: 72, byteLength: 24}, {buffer: 0, byteOffset: 96, byteLength: 6}],
    accessors: [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [2, 3, 0]}, {bufferView: 1, componentType: 5126, count: 3, type: 'VEC3'}, {bufferView: 2, componentType: 5126, count: 3, type: 'VEC2'}, {bufferView: 3, componentType: 5123, count: 3, type: 'SCALAR'}],
  };
  const serialized = Buffer.from(JSON.stringify(json)), jsonBytes = Buffer.alloc(Math.ceil(serialized.length / 4) * 4, 32);
  serialized.copy(jsonBytes);
  const result = Buffer.alloc(12 + 8 + jsonBytes.length + 8 + binary.length);
  result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(jsonBytes.length, 12); result.writeUInt32LE(0x4e4f534a, 16); jsonBytes.copy(result, 20);
  const binOffset = 20 + jsonBytes.length;
  result.writeUInt32LE(binary.length, binOffset); result.writeUInt32LE(0x004e4942, binOffset + 4); binary.copy(result, binOffset + 8);
  return result;
}

test('pinned local glTF loader uses the game Three instance and preserves binary geometry/material data', async () => {
  const dependency = JSON.parse(await readFile(path.join(ROOT, 'node_modules/three/package.json')));
  assert.equal(dependency.version, '0.185.1'); assert.equal(T.REVISION, '185');
  for (const [file, upstream] of addonSources) {
    const original = await readFile(path.join(ROOT, 'node_modules/three/examples/jsm', upstream), 'utf8');
    const expected = original.replace("} from 'three';", "} from './three.module.js';")
      .replace("from '../utils/BufferGeometryUtils.js'", "from './BufferGeometryUtils.js'")
      .replace("from '../utils/SkeletonUtils.js'", "from './SkeletonUtils.js'");
    assert.equal((await readFile(path.join(ROOT, 'vendor', file), 'utf8')).replaceAll('\r\n', '\n'), expected.replaceAll('\r\n', '\n'), file + ' differs from pinned upstream beyond local import paths');
  }
  const requested = [], manager = new T.LoadingManager();
  manager.setURLModifier(url => {requested.push(url); throw new Error('Fixture must not request an external resource');});
  const bytes = triangleGlb(), gltf = await new GLTFLoader(manager).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length), '');
  assert.ok(gltf.scene instanceof T.Group);
  const mesh = gltf.scene.children[0];
  assert.ok(mesh instanceof T.Mesh); assert.ok(mesh.geometry instanceof T.BufferGeometry); assert.ok(mesh.material instanceof T.MeshStandardMaterial);
  assert.deepEqual(Array.from(mesh.geometry.attributes.position.array), [0, 0, 0, 2, 0, 0, 0, 3, 0]);
  assert.deepEqual(Array.from(mesh.geometry.attributes.normal.array), [0, 0, 1, 0, 0, 1, 0, 0, 1]);
  assert.deepEqual(Array.from(mesh.geometry.attributes.uv.array), [0, 0, 1, 0, 0, 1]);
  assert.deepEqual(Array.from(mesh.geometry.index.array), [0, 1, 2]);
  assert.equal(mesh.material.roughness, .94); assert.equal(mesh.material.metalness, 0); assert.equal(mesh.material.transparent, false);
  assert.deepEqual(new T.Box3().setFromObject(gltf.scene).getSize(new T.Vector3()).toArray(), [2, 3, 0]);
  assert.deepEqual(requested, []);
  mesh.geometry.dispose(); mesh.material.dispose();
});

async function fixtureRoot() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'colossus-glb-delivery-'));
  for (const name of ['src', 'vendor', 'assets/pilot', 'pwa']) await mkdir(path.join(directory, name), {recursive: true});
  for (const file of ['server.mjs', 'pwa/service-worker.js', 'pwa/manifest.webmanifest', 'assets/icon.svg', ...vendorFiles.map(file => 'vendor/' + file)]) await copyFile(path.join(ROOT, file), path.join(directory, file));
  await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><head></head><body>Isolated delivery fixture</body></html>');
  await writeFile(path.join(directory, 'src/main.js'), "import {GLTFLoader} from '../vendor/GLTFLoader.js'; export {GLTFLoader};\n");
  await writeFile(path.join(directory, 'assets/pilot/fixture.glb'), triangleGlb());
  return directory;
}
async function cleanFixture(directory) {
  const absolute = path.resolve(directory);
  assert.equal(path.dirname(absolute), path.resolve(os.tmpdir()));
  assert.ok(path.basename(absolute).startsWith('colossus-glb-delivery-'));
  await rm(absolute, {recursive: true, force: true});
}

test('release includes exact GLB bytes, every local loader dependency and content identity', async () => {
  const directory = await fixtureRoot();
  try {
    const first = await buildMobileRelease({root: directory, writeSourceBuildInfo: false});
    const descriptor = JSON.parse(await readFile(path.join(first.output, 'release.json')));
    for (const url of ['/assets/pilot/fixture.glb', ...vendorFiles.map(file => '/vendor/' + file)]) {
      const entry = descriptor.files.find(file => file.url === url);
      assert.ok(entry, url + ' missing from release');
      const bytes = await readFile(path.join(first.output, url.slice(1)));
      assert.equal(bytes.length, entry.bytes); assert.equal(sha256(bytes), entry.sha256);
    }
    const model = descriptor.files.find(file => file.url.endsWith('.glb'));
    assert.equal(model.type, 'model/gltf-binary');
    assert.deepEqual(await readFile(path.join(first.output, model.url.slice(1))), triangleGlb());
    const worker = await readFile(path.join(first.output, 'sw.js'), 'utf8');
    assert.ok(worker.includes(JSON.stringify(model)), 'Offline descriptor must include GLB bytes and type');
    const modified = triangleGlb(); modified[modified.length - 1] = 1;
    await writeFile(path.join(directory, 'assets/pilot/fixture.glb'), modified);
    const next = await buildMobileRelease({root: directory, writeSourceBuildInfo: false});
    assert.notEqual(first.buildId, next.buildId, 'A model byte change must invalidate the package identity');
  } finally {await cleanFixture(directory);}
});

async function unusedPort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve);});
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

test('actual local server serves GLB with a local-only embedded-image policy', async () => {
  const directory = await fixtureRoot(); let child;
  try {
    const port = await unusedPort();
    child = spawn(process.execPath, [path.join(directory, 'server.mjs')], {cwd: directory, env: {...process.env, PORT: String(port)}, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Fixture server did not start')), 10000);
      const finish = error => {clearTimeout(timeout); child.off('exit', exited); error ? reject(error) : resolve();};
      const exited = code => finish(new Error('Fixture server exited before listen: ' + code));
      child.once('error', finish); child.once('exit', exited);
      child.stdout.on('data', bytes => {if (bytes.toString().includes('Colossus Wake local server:')) finish();});
    });
    const origin = 'http://127.0.0.1:' + port, response = await fetch(origin + '/assets/pilot/fixture.glb');
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'model/gltf-binary');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), triangleGlb());
    const csp = new Map(response.headers.get('content-security-policy').split(';').map(part => {const [name, ...values] = part.trim().split(/\s+/); return [name, values];}));
    assert.deepEqual(csp.get('img-src'), ["'self'", 'blob:']);
    assert.deepEqual(csp.get('connect-src'), ["'self'", 'blob:']);
    assert.deepEqual(csp.get('script-src'), ["'self'"]); assert.deepEqual(csp.get('object-src'), ["'none'"]);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const head = await fetch(origin + '/assets/pilot/fixture.glb', {method: 'HEAD'});
    assert.equal(head.status, 200); assert.equal((await head.arrayBuffer()).byteLength, 0);
    assert.equal(Number(head.headers.get('content-length')), triangleGlb().length);
    assert.equal((await fetch(origin + '/server.mjs')).status, 404);
  } finally {
    if (child && child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill(); await exited;
    }
    await cleanFixture(directory);
  }
});
