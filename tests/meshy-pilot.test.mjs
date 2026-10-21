import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {bindMeshyPilot, MESHY_PILOT_AREA} from '../src/meshy-pilot.js';
import {createWorldInteractions} from '../src/landscape.js';
import {disposeGroup} from '../src/materials.js';
import {readFile} from 'node:fs/promises';

// CPU-only original shapes establish ownership, not the imported art's quality.
// Production visible/depth wind and real GLB images require browser validation.
class FixtureInstances {
  constructor(group, geometry, material, castShadow = true, wind = null) {Object.assign(this, {group, geometry, material, castShadow, wind, items: []});}
  finish(name) {
    if (!this.items.length) return null;
    this.mesh = new T.InstancedMesh(this.geometry, this.material, this.items.length); this.mesh.name = name;
    const object = new T.Object3D();
    this.items.forEach((item, index) => {object.position.set(item.x, item.y, item.z); object.scale.set(item.sx, item.sy, item.sz); if (item.rotation) object.quaternion.copy(item.rotation); else object.rotation.set(0, item.yaw, 0); object.updateMatrix(); this.mesh.setMatrixAt(index, object.matrix);});
    this.mesh.computeBoundingBox(); this.mesh.computeBoundingSphere(); this.group.add(this.mesh); return this.mesh;
  }
}
const item = (x, z, extra = {}) => ({x, y: 2, z, sx: 1, sy: 2, sz: .8, colour: 0xffffff, yaw: .4, ...extra});
function fixture(assets, bind = bindMeshyPilot) {
  const group = new T.Group(), create = geometry => new FixtureInstances(group, geometry, new T.MeshStandardMaterial());
  const rocks = create(new T.BoxGeometry(2, 1.5, 1.6)), growth = create(new T.BoxGeometry(.3, .6, .3));
  const trees = {wood: create(new T.BoxGeometry(.4, 1, .4)), leaves: create(new T.BoxGeometry(2, 1.2, 2)), needles: create(new T.BoxGeometry(1.5, 2, 1.5))};
  rocks.items.push(item(-30, -103), item(-29, -102), item(90, 90), item(-5, -112));
  growth.items.push(item(-29, -104), item(-4, -111));
  const roots = [[2, 2, -119, 8], [5, 2, -117, 6], [80, 2, 30, 6]];
  roots.forEach((root, index) => {
    trees.wood.items.push(item(root[0], root[2], {y: 2 + root[3] / 2, sy: root[3], windRoot: root}));
    (index === 0 ? trees.needles : trees.leaves).items.push(item(root[0] + .25, root[2], {y: 2 + root[3] * .72, sy: 2, windRoot: root}));
  });
  // A static fallen branch is attached to this logical tree, but is not part
  // of its standing tree model and must survive the display-root replacement.
  trees.wood.items.push(item(3, -118, {sy: .2, sx: 2}));
  const ref = (batch, first, count = 1) => ({batch, first, count});
  const records = [
    {id: 'old-rock-a', kind: 'rock', x: -30, z: -103, size: 1, parts: [ref(rocks, 0, 2), ref(growth, 0)]},
    {id: 'outside-rock', kind: 'rock', x: 90, z: 90, size: 1, parts: [ref(rocks, 2)]},
    {id: 'old-rock-b', kind: 'rock', x: -5, z: -112, size: .7, parts: [ref(rocks, 3), ref(growth, 1)]},
    {id: 'old-pine', kind: 'tree', x: 2, z: -119, size: 1.1, parts: [ref(trees.wood, 0), ref(trees.needles, 0), ref(trees.wood, 3)]},
    {id: 'old-broadleaf', kind: 'tree', x: 5, z: -117, size: 1.2, parts: [ref(trees.wood, 1), ref(trees.leaves, 0)]},
    {id: 'outside-tree', kind: 'tree', x: 80, z: 30, size: 1, parts: [ref(trees.wood, 2), ref(trees.leaves, 1)]},
  ];
  const identity = JSON.stringify(records.map(({parts, ...record}) => record));
  const oldRockItems = rocks.items.map(value => ({...value}));
  const pilot = bind({group, Instances: FixtureInstances, records, trees, rocks, assets});
  for (const [batch, name] of [[rocks, 'Original rocks'], [growth, 'Attached growth'], [trees.wood, 'Tree trunks and branches'], [trees.leaves, 'Broadleaf canopies'], [trees.needles, 'Pine boughs']]) batch.finish(name);
  return {group, trees, rocks, growth, records, pilot, identity, oldRockItems, roots};
}
function masters() {
  return new Map(['rock', 'pine', 'broadleaf'].map(kind => {
    const geometry = new T.BoxGeometry(1, 1, 1); if (kind !== 'rock') geometry.translate(0, .5, 0);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere(); geometry.userData.shared = true;
    const material = new T.MeshStandardMaterial(); material.userData.shared = true;
    return [kind, {geometry, material}];
  }));
}
function closeMasters(assets) {for (const master of assets.values()) {master.geometry.dispose(); master.material.dispose();}}
function snapshotMeshes(group) {const values = new Map(); group.traverse(mesh => {if (mesh.isInstancedMesh) values.set(mesh, Array.from(mesh.instanceMatrix.array));}); return values;}

test('bounded imported displays preserve logical anchors, every retained range and original rock transforms', () => {
  const assets = masters(), f = fixture(assets);
  try {
    assert.equal(JSON.stringify(f.records.map(({parts, ...record}) => record)), f.identity);
    assert.deepEqual(f.pilot.stats.area, MESHY_PILOT_AREA);
    assert.deepEqual(f.pilot.stats.records.map(record => record.id), ['old-rock-a', 'old-rock-b', 'old-pine', 'old-broadleaf']);
    assert.equal(f.pilot.stats.instances, 5);
    assert.deepEqual(f.rocks.items, [f.oldRockItems[2]]);
    const outside = f.records.find(record => record.id === 'outside-rock');
    assert.equal(outside.parts[0].first, 0); assert.equal(outside.parts[0].count, 1); assert.equal(outside.parts[0].batch.items[0].x, 90);
    assert.deepEqual(f.growth.items.map(value => [value.x, value.z]), [[-29, -104], [-4, -111]]);
    assert.deepEqual(f.trees.wood.items.map(value => [value.x, value.z]), [[80, 30], [3, -118]], 'No old standing wood underneath the import; retain outside tree and owned fallen branch');
    assert.equal(f.trees.needles.items.length, 0); assert.equal(f.trees.leaves.items.length, 1);
    const rockParts = f.records.filter(record => record.id.startsWith('old-rock')).flatMap(record => record.parts.filter(part => part.batch.mesh?.name === 'Meshy pilot riverbank rocks'));
    assert.deepEqual(rockParts.flatMap(part => part.batch.items.slice(part.first, part.first + part.count)), [f.oldRockItems[0], f.oldRockItems[1], f.oldRockItems[3]]);
    for (const [index, id] of ['old-pine', 'old-broadleaf'].entries()) {
      const record = f.records.find(record => record.id === id), part = record.parts.find(ref => ref.batch.mesh?.userData.meshyPilot);
      assert.deepEqual(part.batch.items[part.first].windRoot, f.roots[index]);
      assert.deepEqual([part.batch.items[part.first].x, part.batch.items[part.first].y, part.batch.items[part.first].z], [record.x, 2, record.z]);
      assert.ok(part.batch.items[part.first].sy > 0);
    }
  } finally {disposeGroup(f.group); closeMasters(assets);}
});

test('old destroyed IDs hide imports and attached growth, preserve pine debris, and restore exact matrices', () => {
  const previous = globalThis.document, gradient = {addColorStop() {}};
  const context = new Proxy({createLinearGradient: () => gradient, createRadialGradient: () => gradient}, {get: (target, key) => target[key] ?? (() => {})});
  globalThis.document = {createElement: () => ({width: 0, height: 0, getContext: () => context}), createElementNS: () => ({addEventListener() {}, removeEventListener() {}})};
  const assets = masters(), f = fixture(assets);
  try {
    const original = snapshotMeshes(f.group), interactions = createWorldInteractions(f.group, f.records);
    const saved = ['old-rock-a', 'old-pine'];
    for (const mode of ['expedition', 'battle']) {
      interactions.resetInteractions({mode, damage: JSON.parse(JSON.stringify(saved))});
      assert.equal(interactions.stats.destroyedCount, 2);
      for (const record of f.records) for (const ref of record.parts) for (let i = ref.first; i < ref.first + ref.count; i++) {
        const mesh = ref.batch.mesh;
        assert.equal(mesh.instanceMatrix.array[i * 16 + 13] === -5000, saved.includes(record.id), record.id + ' display ownership mismatch');
      }
      assert.equal(f.group.getObjectByName('Crushed fallen pine boughs').count, 6);
      assert.equal(f.group.getObjectByName('Crushed fallen boughs').count, 0);
      interactions.resetInteractions();
      for (const [mesh, matrices] of original) assert.deepEqual(Array.from(mesh.instanceMatrix.array), matrices);
    }
    assert.deepEqual(saved, ['old-rock-a', 'old-pine']);
  } finally {disposeGroup(f.group); closeMasters(assets); if (previous === undefined) delete globalThis.document; else globalThis.document = previous;}
});

test('independent imported owners share immutable masters but have separate geometry and instance state', () => {
  const assets = masters(), first = fixture(assets), second = fixture(assets), counts = new Map();
  try {
    for (const master of assets.values()) {counts.set(master.material, 0); master.material.addEventListener('dispose', () => counts.set(master.material, counts.get(master.material) + 1));}
    for (const [index, mesh] of first.pilot.meshes.entries()) {
      const other = second.pilot.meshes[index];
      assert.notEqual(mesh.geometry, other.geometry); assert.notEqual(mesh.instanceMatrix, other.instanceMatrix); assert.equal(mesh.material, other.material);
      const original = other.instanceMatrix.array[12]; mesh.instanceMatrix.array[12] += 30; assert.equal(other.instanceMatrix.array[12], original);
    }
    disposeGroup(first.group);
    for (const count of counts.values()) assert.equal(count, 0);
    for (const mesh of second.pilot.meshes) assert.ok(mesh.geometry.attributes.position.count > 0);
  } finally {disposeGroup(second.group); closeMasters(assets);}
});

test('all three actual embedded GLBs load once with matte materials and independent instance ownership', async () => {
  const originalFetch = globalThis.fetch, originalSelf = globalThis.self, originalBitmap = globalThis.createImageBitmap;
  const local = new Set(['rock', 'pine', 'broadleaf', 'pine-lods', 'broadleaf-lods'].map(kind => new URL('../assets/scenery/meshy-pilot/' + kind + '.glb', import.meta.url).href));
  const requests = [], images = [], owners = [];
  try {
    globalThis.self = globalThis;
    // This validates real mesh/UV/material parsing and ownership. Decoding is
    // mocked here; actual image pixels and shaders require the browser checks.
    globalThis.createImageBitmap = async () => {const image = {width: 1024, height: 1024, closed: 0, close() {this.closed++;}}; images.push(image); return image;};
    globalThis.fetch = async (input, options) => {
      const url = new URL(typeof input === 'string' ? input : input.url || input.href);
      if (url.protocol === 'file:') {
        assert.ok(local.has(url.href), 'Only the three local masters and two derived geometry files may load');
        requests.push(url.href); return new Response(await readFile(url), {headers: {'Content-Type': 'model/gltf-binary'}});
      }
      assert.equal(url.protocol, 'blob:', 'Imported assets must not contact an external service'); return originalFetch(input, options);
    };
    const module = await import('../src/meshy-pilot.js?actual-assets-success');
    const firstLoad = module.loadMeshyPilot(), secondLoad = module.loadMeshyPilot();
    assert.equal(firstLoad, secondLoad, 'Concurrent callers must share one bounded preload');
    await firstLoad;
    const status = module.meshyPilotStatus();
    assert.equal(status.state, 'ready'); assert.equal(status.error, null);
    assert.deepEqual(status.assets.map(asset => asset.kind).sort(), ['broadleaf', 'pine', 'rock']);
    assert.deepEqual(requests.slice().sort(), [...local].sort());
    assert.equal(status.bytes, status.assets.reduce((sum, asset) => sum + asset.bytes, 0) + status.treeLodBytes);
    assert.ok(status.treeLodBytes > 0 && status.treeLodBytes < 1250000, 'Shared geometry-only LOD download remains bounded');
    for (const asset of status.assets.filter(asset => asset.kind !== 'rock')) {
      assert.ok(asset.lods.near.triangles < 7000); assert.ok(asset.lods.far.triangles < 7000);
    }
    assert.equal(images.length, 6, 'Each prepared master retains only its embedded base and normal images');
    for (const asset of status.assets) {assert.equal(asset.textures.length, 2); assert.ok(asset.triangles > 0); assert.ok(asset.vertices > 0);}
    const first = fixture(undefined, module.bindMeshyPilot), second = fixture(undefined, module.bindMeshyPilot); owners.push(first, second);
    for (const [index, mesh] of first.pilot.meshes.entries()) {
      const other = second.pilot.meshes[index], material = mesh.material, kind = mesh.userData.meshyPilot;
      assert.notEqual(mesh.geometry, other.geometry); assert.notEqual(mesh.instanceMatrix, other.instanceMatrix); assert.equal(material, other.material);
      assert.equal(material.metalness,0);assert.equal(material.transparent,false);
      assert.equal(material.roughnessMap,null);assert.equal(material.metalnessMap,null);
      if(kind==='rock'){
        assert.equal(material.roughness,.90);assert.equal(material.map.colorSpace,T.SRGBColorSpace);assert.equal(material.normalMap.colorSpace,T.NoColorSpace);
        assert.deepEqual(material.normalScale.toArray(),[.22,.22]);assert.deepEqual(material.color.toArray(),[.98,1.05,.90]);
      }else{
        assert.equal(material.userData.authoredTree,true);assert.equal(material.vertexColors,true);assert.equal(material.roughness,.96);
        assert.equal(material.map,null);assert.equal(material.normalMap,null);assert.equal(material.envMapIntensity,.65);
        assert.deepEqual(material.color.toArray(),[1,1,1]);assert.equal(mesh.geometry.userData.authoredTree,kind);
        const inventory=status.assets.find(asset=>asset.kind===kind);assert.equal(inventory.display.source,'src/authored-trees.js');
        assert.equal(mesh.geometry.index.count/3,inventory.display.lods.near.triangles);
      }
      for (const attribute of Object.values(mesh.geometry.attributes)) for (const value of attribute.array) assert.ok(Number.isFinite(value));
      assert.ok(mesh.geometry.boundingSphere.radius > 0);
    }
    assert.equal(module.loadMeshyPilot(), firstLoad); await module.loadMeshyPilot(); assert.equal(requests.length, 5);
    for (const image of images) assert.equal(image.closed, 0, 'Prepared shared image data must remain usable for the page lifetime');
  } finally {
    for (const owner of owners) disposeGroup(owner.group);
    globalThis.fetch = originalFetch;
    if (originalSelf === undefined) delete globalThis.self; else globalThis.self = originalSelf;
    if (originalBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = originalBitmap;
  }
});

test('rejected imports release source and normalized resources and close shared image data exactly once', async () => {
  const source = await readFile(new URL('../assets/scenery/meshy-pilot/rock.glb', import.meta.url));
  const originalFetch = globalThis.fetch, originalSelf = globalThis.self, originalBitmap = globalThis.createImageBitmap;
  const disposals = new Map(), geometryDispose = T.BufferGeometry.prototype.dispose, materialDispose = T.Material.prototype.dispose, textureDispose = T.Texture.prototype.dispose;
  const wrap = original => function () {disposals.set(this, (disposals.get(this) || 0) + 1); return original.call(this);};
  T.BufferGeometry.prototype.dispose = wrap(geometryDispose); T.Material.prototype.dispose = wrap(materialDispose); T.Texture.prototype.dispose = wrap(textureDispose);
  try {
    globalThis.self = globalThis;
    for (const [label, mutate, expected] of [
      ['transparent', document => {document.materials[0].alphaMode = 'BLEND';}, /opaque PBR/],
      ['missing-uv', document => {for (const mesh of document.meshes) for (const primitive of mesh.primitives) delete primitive.attributes.TEXCOORD_0;}, /missing uv/],
      ['zero-scale', document => {for (const node of document.nodes) if (node.mesh !== undefined) node.scale = [0, 0, 0];}, /invalid dimensions/],
    ]) {
      const length = source.readUInt32LE(12), document = JSON.parse(source.subarray(20, 20 + length)); mutate(document);
      const serialized = Buffer.from(JSON.stringify(document)), json = Buffer.alloc(Math.ceil(serialized.length / 4) * 4, 32); serialized.copy(json);
      const remainder = source.subarray(20 + length), bytes = Buffer.alloc(20 + json.length + remainder.length);
      source.copy(bytes, 0, 0, 20); bytes.writeUInt32LE(bytes.length, 8); bytes.writeUInt32LE(json.length, 12); json.copy(bytes, 20); remainder.copy(bytes, 20 + json.length);
      disposals.clear(); const images = [], requests = [];
      // A lifecycle mock only: no bitmap decode, GPU or visual-quality claim.
      globalThis.createImageBitmap = async () => {const image = {width: 1024, height: 1024, closed: 0, close() {this.closed++;}}; images.push(image); return image;};
      globalThis.fetch = async (input, options) => {
        const url = new URL(typeof input === 'string' ? input : input.url || input.href); requests.push(url.protocol);
        if (url.protocol === 'file:') return new Response(bytes, {headers: {'Content-Type': 'model/gltf-binary'}});
        assert.equal(url.protocol, 'blob:', 'An embedded fixture must not access external services'); return originalFetch(input, options);
      };
      const module = await import('../src/meshy-pilot.js?failure=' + label);
      await assert.rejects(module.loadMeshyPilot(), expected);
      assert.equal(module.meshyPilotStatus().state, 'failed');
      await assert.rejects(module.loadMeshyPilot(), expected);
      assert.equal(requests.filter(protocol => protocol === 'file:').length, 1, 'A failed page load must not start duplicate asset requests');
      assert.ok(images.length >= 2); for (const image of images) assert.equal(image.closed, 1, label + ': shared image data closed more or less than once');
      assert.ok([...disposals.keys()].filter(value => value.isBufferGeometry).length >= 2, 'Both source and normalized geometry need cleanup');
      assert.ok([...disposals.keys()].some(value => value.isMaterial)); assert.ok([...disposals.keys()].some(value => value.isTexture));
      for (const count of disposals.values()) assert.equal(count, 1, label + ': resource disposed more than once');
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSelf === undefined) delete globalThis.self; else globalThis.self = originalSelf;
    if (originalBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = originalBitmap;
    T.BufferGeometry.prototype.dispose = geometryDispose; T.Material.prototype.dispose = materialDispose; T.Texture.prototype.dispose = textureDispose;
  }
});

test('an embedded decode failure rejects once, revokes every URL and closes successful sibling/prior images', async () => {
  const old = {fetch: globalThis.fetch, self: globalThis.self, bitmap: globalThis.createImageBitmap, error: console.error, create: URL.createObjectURL, revoke: URL.revokeObjectURL};
  const originalDispose = [T.BufferGeometry.prototype.dispose, T.Material.prototype.dispose, T.Texture.prototype.dispose];
  const disposals = new Map();
  const wrap = original => function() {disposals.set(this, (disposals.get(this) || 0) + 1); return original.call(this);};
  T.BufferGeometry.prototype.dispose = wrap(originalDispose[0]); T.Material.prototype.dispose = wrap(originalDispose[1]); T.Texture.prototype.dispose = wrap(originalDispose[2]);
  try {
    globalThis.self = globalThis;
    // Either texture of the first asset may fail. The later failure also proves
    // that the previously normalized master is released, not left in the cache.
    for (const failedDecode of [1, 2, 3]) {
      const created = [], revoked = [], images = [], requests = []; let decodes = 0, errors = 0;
      disposals.clear();
      URL.createObjectURL = function(...args) {const url = old.create.apply(this, args); created.push(url); return url;};
      URL.revokeObjectURL = function(url) {revoked.push(url); return old.revoke.call(this, url);};
      console.error = () => errors++;
      globalThis.createImageBitmap = async () => {
        if (++decodes === failedDecode) throw Error('Injected embedded image decode failure');
        const image = {width: 1024, height: 1024, closed: 0, close() {this.closed++;}}; images.push(image); return image;
      };
      globalThis.fetch = async (input, options) => {
        const url = new URL(typeof input === 'string' ? input : input.url || input.href);
        if (url.protocol === 'file:') {
          const allowed = ['rock', 'pine', 'broadleaf'].map(kind => new URL('../assets/scenery/meshy-pilot/' + kind + '.glb', import.meta.url).href);
          assert.ok(allowed.includes(url.href), 'Only local embedded pilot assets may be fetched'); requests.push(url.href);
          return new Response(await readFile(url));
        }
        assert.equal(url.protocol, 'blob:'); return old.fetch(input, options);
      };
      const module = await import('../src/meshy-pilot.js?decode-failure=' + failedDecode), first = module.loadMeshyPilot();
      await assert.rejects(first, /decoded base and normal maps/);
      assert.equal(module.loadMeshyPilot(), first); await assert.rejects(module.loadMeshyPilot(), /decoded base and normal maps/);
      assert.equal(module.meshyPilotStatus().state, 'failed'); assert.match(module.meshyPilotStatus().error, /decoded base and normal maps/);
      assert.equal(requests.length, Math.ceil(failedDecode / 2), 'No later asset or duplicate load should run after a failure');
      assert.equal(decodes, requests.length * 2); assert.equal(errors, 1);
      assert.equal(created.length, decodes); assert.deepEqual([...revoked].sort(), [...created].sort(), 'Every success/failure object URL must be revoked exactly once');
      assert.equal(images.length, decodes - 1); for (const image of images) assert.equal(image.closed, 1, 'Successful sibling or prior master image remained open');
      assert.ok([...disposals.keys()].some(value => value.isBufferGeometry)); assert.ok([...disposals.keys()].some(value => value.isMaterial)); assert.ok([...disposals.keys()].some(value => value.isTexture));
      for (const count of disposals.values()) assert.equal(count, 1, 'A failed load disposed a resource more than once');
    }
  } finally {
    globalThis.fetch = old.fetch;
    if (old.self === undefined) delete globalThis.self; else globalThis.self = old.self;
    if (old.bitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = old.bitmap;
    console.error = old.error; URL.createObjectURL = old.create; URL.revokeObjectURL = old.revoke;
    [T.BufferGeometry.prototype.dispose, T.Material.prototype.dispose, T.Texture.prototype.dispose] = originalDispose;
  }
});
