import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createMeshyCarrierCache, inspectCarrierDocument, updateMeshyCarrier, disposeMeshyCarrier, markMeshyCarrierPose} from '../src/meshy-carriers.js';
import {batchStatic, disposeGroup} from '../src/materials.js';

function glb(document = {asset: {version: '2.0'}, buffers: [{byteLength: 4}]}, binary = new Uint8Array(4)) {
  const text = new TextEncoder().encode(JSON.stringify(document)), jsonLength = (text.length + 3) & ~3, binLength = (binary.length + 3) & ~3;
  const bytes = new ArrayBuffer(28 + jsonLength + binLength), view = new DataView(bytes), output = new Uint8Array(bytes);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, jsonLength, true); view.setUint32(16, 0x4e4f534a, true); output.fill(32, 20, 20 + jsonLength); output.set(text, 20);
  view.setUint32(20 + jsonLength, binLength, true); view.setUint32(24 + jsonLength, 0x004e4942, true); output.set(binary, 28 + jsonLength);
  return bytes;
}
function actualRigGlb(cubic = false) {
  const blocks = [], bufferViews = [], accessors = []; let length = 0;
  const accessor = (array, componentType, count, type, bounds = {}) => {
    const index = bufferViews.length; bufferViews.push({buffer: 0, byteOffset: length, byteLength: array.byteLength});
    blocks.push(new Uint8Array(array.buffer)); length += array.byteLength;
    accessors.push({bufferView: index, componentType, count, type, ...bounds}); return accessors.length - 1;
  };
  const position = accessor(new Float32Array([-1, 0, -.4, 1, 0, .4, 0, 2, 0]), 5126, 3, 'VEC3', {min: [-1, 0, -.4], max: [1, 2, .4]});
  const normal = accessor(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 5126, 3, 'VEC3');
  const joints = accessor(new Uint16Array(12), 5123, 3, 'VEC4');
  const weights = accessor(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]), 5126, 3, 'VEC4');
  const inverse = accessor(new Float32Array(new T.Matrix4().elements), 5126, 1, 'MAT4');
  const times = accessor(new Float32Array([0, 1, 2]), 5126, 3, 'SCALAR', {min: [0], max: [2]});
  const values = accessor(new Float32Array(cubic ? [0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, .2, 2, 0, 0, 2, 0, 0, 2, 0, 0, 4, 0, 0, 2] : [0, 0, 0, 0, .2, 2, 0, 0, 4]), 5126, cubic ? 9 : 3, 'VEC3');
  const binary = new Uint8Array(length); let cursor = 0; for (const block of blocks) {binary.set(block, cursor); cursor += block.length;}
  return glb({asset: {version: '2.0'}, buffers: [{byteLength: length}], bufferViews, accessors,
    materials: [{pbrMetallicRoughness: {baseColorFactor: [.3, .4, .5, 1], metallicFactor: .2, roughnessFactor: .8}}],
    meshes: [{primitives: [{attributes: {POSITION: position, NORMAL: normal, JOINTS_0: joints, WEIGHTS_0: weights}, material: 0}]}],
    nodes: [{name: 'Rig', children: [1, 2]}, {name: 'TravelRoot'}, {name: 'Body', mesh: 0, skin: 0}],
    skins: [{joints: [1], skeleton: 1, inverseBindMatrices: inverse}], scenes: [{nodes: [0]}], scene: 0,
    animations: [{name: 'Walking', samplers: [{input: times, output: values, interpolation: cubic ? 'CUBICSPLINE' : 'LINEAR'}], channels: [{sampler: 0, target: {node: 1, path: 'translation'}}]}]}, binary);
}
function fixture() {
  const scene = new T.Group(), bone = new T.Bone(), limb = new T.Bone(); bone.name = 'TravelRoot'; limb.name = 'Limb'; bone.add(limb); scene.add(bone);
  const geometry = new T.BoxGeometry(1, 2, 1), count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  const weights = new Float32Array(count * 4); for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4));
  const image = {width: 16, height: 16, closes: 0, close() {this.closes++;}}, texture = new T.Texture(image), material = new T.MeshStandardMaterial({map: texture, roughness: .76});
  const mesh = new T.SkinnedMesh(geometry, material); scene.add(mesh); mesh.bind(new T.Skeleton([bone, limb]));
  const animation = new T.AnimationClip('Walking', 2, [new T.VectorKeyframeTrack('TravelRoot.position', [0, 1, 2], [0, 0, 0, .2, .4, 2, 0, 0, 4]), new T.QuaternionKeyframeTrack('Limb.quaternion', [0, 1, 2], [0, 0, 0, 1, 0, .70710678, 0, .70710678, 0, 0, 0, 1])]);
  const released = new Map(); for (const resource of [geometry, material, texture]) {released.set(resource, 0); resource.addEventListener('dispose', () => released.set(resource, released.get(resource) + 1));}
  return {scene, scenes: [scene], animations: [animation], mesh, bone, limb, geometry, material, texture, image, released};
}
const options = {clipName: 'Walking', rootMotionNode: 'TravelRoot', strideDistance: 8};
function fixtureCache(f = fixture()) {
  const calls = [];
  const cache = createMeshyCarrierCache({fetchAsset: async url => {calls.push(url.href); return new Response(glb());}, parse: async () => f});
  return {cache, f, calls};
}

test('validates embedded GLB before decoding; external resources and unavailable decoders are rejected', () => {
  assert.equal(inspectCarrierDocument(actualRigGlb()).asset.version, '2.0');
  const base = {asset: {version: '2.0'}, buffers: [{byteLength: 4}]};
  for (const document of [
    {...base, buffers: [{byteLength: 4, uri: 'https://example.invalid/body.bin'}]},
    {...base, images: [{uri: 'data:image/png;base64,AA=='}]},
    {...base, bufferViews: [{buffer: 0, byteOffset: 3, byteLength: 4}]},
    {...base, meshes: [{primitives: [{extensions: {KHR_draco_mesh_compression: {}}}]}]},
    {...base, textures: [{extensions: {KHR_texture_basisu: {}}}]},
    {...base, extensionsRequired: ['unknown_extension']}
  ]) assert.throws(() => inspectCarrierDocument(glb(document)), /embedded|buffer view|decoder|Unsupported/);
  const truncated = actualRigGlb().slice(0, 40); assert.throws(() => inspectCarrierDocument(truncated), /header/);
});

test('actual vendored GLTF loader preserves skin, clip, geometry and colours with the approved matte material response', async () => {
  const bytes = actualRigGlb(), cache = createMeshyCarrierCache({fetchAsset: async () => new Response(bytes)});
  await cache.load('cyborg');
  const inventory = cache.status().assets[0].capabilities;
  assert.equal(inventory.skinnedMeshes, 1); assert.deepEqual(inventory.bones, ['TravelRoot']); assert.equal(inventory.animations[0].name, 'Walking');
  assert.deepEqual(inventory.animations[0].translations[0].displacement, [0, 0, 4]);
  const instance = cache.instantiate('cyborg', options), mesh = instance.body.getObjectByName('Body');
  assert.equal(mesh.isSkinnedMesh, true); assert.deepEqual(Array.from(mesh.geometry.attributes.position.array), [-1, 0, Math.fround(-.4), 1, 0, Math.fround(.4), 0, 2, 0]);
  assert.equal(mesh.material.roughness, .8); assert.equal(mesh.material.metalness, .2*.34); assert.deepEqual(mesh.material.color.toArray(), [.3, .4, .5]);
  assert.equal(mesh.frustumCulled, false); disposeMeshyCarrier(instance); cache.dispose();
});

test('each bounded local master loads once; status snapshots cannot mutate it; flesh rig names are not guessed', async () => {
  const {cache, calls} = fixtureCache(), one = cache.load('cyborg');
  assert.equal(cache.load('cyborg'), one); await one; await cache.load('cyborg');
  assert.equal(calls.length, 1); assert.ok(calls[0].endsWith('/assets/carriers/meshy/cyborg.glb'));
  assert.throws(() => cache.load('tank'), /Unknown/); assert.throws(() => cache.instantiate('flesh'), /preload/);
  const status = cache.status(); status.assets[0].capabilities.bones[0] = 'changed';
  assert.equal(cache.status().assets[0].capabilities.bones[0], 'TravelRoot');
  assert.throws(() => cache.instantiate('cyborg', {...options, clipName: 'GuessDogWalk'}), /inspected animation/);
  assert.throws(() => cache.instantiate('cyborg', {...options, rootMotionNode: 'GuessHips'}), /No position track/);
  assert.throws(() => cache.instantiate('cyborg', {clipName: 'Walking'}), /strideDistance/);
  cache.dispose(); assert.throws(() => cache.load('cyborg'), /disposed/);
});

test('independent skeletons and mixers share immutable mesh resources, survive batching, and dispose separately', async () => {
  const {cache, f} = fixtureCache(); await cache.load('cyborg');
  const first = cache.instantiate('cyborg', options), second = cache.instantiate('cyborg', options);
  const meshes = [first, second].map(instance => {let mesh; instance.body.traverse(object => {if (object.isSkinnedMesh) mesh = object;}); return mesh;});
  assert.notEqual(meshes[0].skeleton, meshes[1].skeleton); assert.notEqual(meshes[0].skeleton.bones[0], meshes[1].skeleton.bones[0]);
  assert.notEqual(meshes[0].skeleton.boneInverses[0], meshes[1].skeleton.boneInverses[0]);
  assert.equal(meshes[0].geometry, meshes[1].geometry); assert.equal(meshes[0].material, meshes[1].material); assert.equal(meshes[0].material.map, f.texture);
  for (const resource of [f.geometry, f.material, f.texture]) assert.equal(resource.userData.shared, true);
  const castle = new T.Group(), deck = new T.Object3D(); deck.position.set(0, 34, -12); castle.add(deck, first.root); batchStatic(castle);
  assert.equal(meshes[0].parent !== null, true); assert.equal(first.root.userData.noBatch, true);
  updateMeshyCarrier(first, {time: 0, moving: true}); updateMeshyCarrier(first, {time: 1, moving: true, distanceDelta: 4});
  assert.ok(meshes[0].skeleton.bones[1].quaternion.y > .7); assert.equal(meshes[1].skeleton.bones[1].quaternion.y, 0);
  assert.deepEqual(deck.position.toArray(), [0, 34, -12]); assert.deepEqual(first.root.position.toArray(), [0, 0, 0]);
  assert.throws(() => cache.dispose(), /instances/);
  disposeMeshyCarrier(first); disposeMeshyCarrier(first); disposeGroup(castle);
  assert.equal(first.mixer.stats.actions.inUse, 0); assert.equal(first.mixer.stats.bindings.inUse, 0); assert.equal(cache.status().activeInstances, 1);
  assert.ok([...f.released.values()].every(count => count === 0)); assert.equal(f.image.closes, 0);
  disposeMeshyCarrier(second); cache.dispose(); assert.ok([...f.released.values()].every(count => count === 1)); assert.equal(f.image.closes, 1);
});

test('in-place adaptation affects cloned travel only; actual distance controls phase and pause/repeated time freezes it', async () => {
  const {cache, f} = fixtureCache(); await cache.load('cyborg');
  const original = Array.from(f.animations[0].tracks[0].values), instance = cache.instantiate('cyborg', options);
  assert.deepEqual(Array.from(f.animations[0].tracks[0].values), original);
  assert.deepEqual(Array.from(instance.clip.tracks[0].values), [0, 0, 0, Math.fround(.2), Math.fround(.4), 0, 0, 0, 0]);
  updateMeshyCarrier(instance, {time: 10, moving: true, distanceDelta: 100});
  assert.equal(updateMeshyCarrier(instance, {time: 11, moving: true, distanceDelta: 2, speed: 999}), .25);
  assert.equal(updateMeshyCarrier(instance, {time: 11, moving: true, distanceDelta: 2}), .25);
  assert.equal(updateMeshyCarrier(instance, {time: 12, moving: false, distanceDelta: 2}), .25);
  assert.equal(updateMeshyCarrier(instance, {time: 13, moving: true, speed: 2}), .5);
  assert.equal(updateMeshyCarrier(instance, {time: 14, moving: true, distanceDelta: 4}), 0);
  assert.equal(updateMeshyCarrier(instance, {time: 0, moving: true, distanceDelta: 4}), 0);
  assert.throws(() => updateMeshyCarrier(instance, {time: 1, moving: true, distanceDelta: NaN}), /Invalid/);
  disposeMeshyCarrier(instance); assert.equal(updateMeshyCarrier(instance, {time: 1, moving: true}), null); cache.dispose();
});

test('cubic source interpolation is retained while travel values and derivative tangents become in-place', async () => {
  const cache = createMeshyCarrierCache({fetchAsset: async () => new Response(actualRigGlb(true))}); await cache.load('cyborg');
  const instance = cache.instantiate('cyborg', options), track = instance.clip.tracks[0];
  assert.equal(track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline, true);
  for (let i = 2; i < track.values.length; i += 3) assert.equal(track.values[i], 0, 'Every travel value and travel derivative must be removed');
  updateMeshyCarrier(instance, {time: 0, moving: true}); updateMeshyCarrier(instance, {time: .25, moving: true, distanceDelta: 1});
  const bone = instance.body.getObjectByName('TravelRoot'); assert.equal(bone.position.z, 0); assert.ok(bone.position.y > 0);
  assert.deepEqual(cache.status().assets[0].capabilities.animations[0].translations[0].displacement, [0, 0, 4], 'Inspected source motion is unchanged');
  disposeMeshyCarrier(instance); cache.dispose();
});

test('failed loads are cached and release partial decoded dependencies, including late arrivals, exactly once', async () => {
  const f = fixture(); let requests = 0, lateCollect;
  const cache = createMeshyCarrierCache({fetchAsset: async () => {requests++; return new Response(glb());}, parse: async (_bytes, collect) => {
    collect(f.geometry); collect(f.material); lateCollect = collect; throw new Error('decode failed');
  }});
  const failed = cache.load('flesh'); await assert.rejects(failed, /decode failed/); assert.equal(cache.load('flesh'), failed);
  await assert.rejects(cache.load('flesh'), /decode failed/); assert.equal(requests, 1); assert.equal(cache.status().assets[1].state, 'failed');
  lateCollect(f.scene); lateCollect(f.scene);
  assert.ok([...f.released.values()].every(count => count === 1)); assert.equal(f.image.closes, 1); cache.dispose();
});

test('validation failures dispose completed resources and do not turn an unrelated ready master into a failure', async () => {
  const good = fixture(), bad = fixture(); bad.geometry.attributes.position.array[0] = NaN; let parses = 0;
  const cache = createMeshyCarrierCache({fetchAsset: async () => new Response(glb()), parse: async () => ++parses === 1 ? good : bad});
  await cache.load('cyborg'); await assert.rejects(cache.load('flesh'), /non-finite/);
  assert.ok([...bad.released.values()].every(count => count === 1)); assert.ok([...good.released.values()].every(count => count === 0));
  const live = cache.instantiate('cyborg', options); disposeMeshyCarrier(live); cache.dispose();
});

test('untrusted URI is rejected before parser or image loading begins', async () => {
  let parses = 0;
  const cache = createMeshyCarrierCache({fetchAsset: async () => new Response(glb({asset: {version: '2.0'}, buffers: [{byteLength: 4, uri: 'https://example.invalid'}]})), parse: async () => {parses++; return fixture();}});
  await assert.rejects(cache.load('cyborg'), /embedded/); assert.equal(parses, 0); cache.dispose();
});

test('real parsed skin raycasts scan bounds once per marked pose and preserve exact hits beyond the bind-pose envelope', async () => {
  const cache = createMeshyCarrierCache({fetchAsset: async () => new Response(actualRigGlb())});
  await cache.load('cyborg'); const instance = cache.instantiate('cyborg', options);
  let mesh; instance.body.traverse(object => {if (object.isSkinnedMesh) mesh = object;});
  let spheres = 0, boxes = 0;
  const sphere = mesh.computeBoundingSphere.bind(mesh), box = mesh.computeBoundingBox.bind(mesh);
  mesh.computeBoundingSphere = () => {spheres++; return sphere();}; mesh.computeBoundingBox = () => {boxes++; return box();};
  for (const x of [20, 40]) {
    mesh.skeleton.bones[0].position.x = x; mesh.skeleton.bones[0].rotation.z = x / 50;
    instance.root.updateMatrixWorld(true); markMeshyCarrierPose(instance);
    const vertices = Array.from({length: 3}, (_, i) => mesh.getVertexPosition(i, new T.Vector3()));
    const centre = vertices.reduce((sum, vertex) => sum.add(vertex), new T.Vector3()).multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld);
    const ray = new T.Raycaster(centre.clone().add(new T.Vector3(0, 0, 10)), new T.Vector3(0, 0, -1));
    for (let query = 0; query < 2; query++) {
      const hit = ray.intersectObject(instance.root, true)[0];
      assert.ok(hit, 'Moving skin must remain hittable outside original bounds');
      assert.ok(hit.point.distanceTo(centre) < 1e-6, 'Conservative broad phase must retain the exact triangle contact');
    }
    for (const vertex of vertices) {
      assert.ok(mesh.boundingBox.containsPoint(vertex), 'Exact box must contain the current skin');
      assert.ok(vertex.distanceTo(mesh.boundingSphere.center) <= mesh.boundingSphere.radius + 1e-10, 'Conservative sphere must contain the current skin');
    }
  }
  assert.equal(spheres, 0, 'Never perform a second full skin scan for the sphere');
  assert.equal(boxes, 2, 'Repeat rays in the same pose reuse the exact box'); disposeMeshyCarrier(instance); cache.dispose();
});
