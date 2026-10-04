import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three.module.js';

// CPU only: actual production GLBs, skeletons, skin and surface raycasts.
// Canvas drawing and PNG decoding are dimension stand-ins, not rendered pixels.
function cpuBrowser() {
  const keys = ['document', 'self', 'fetch', 'createImageBitmap'];
  const originals = new Map(keys.map(key => [key, globalThis[key]]));
  const context = new Proxy({createLinearGradient: () => ({addColorStop() {}}), createRadialGradient: () => ({addColorStop() {}}),
    createImageData: (width, height) => ({data: new Uint8ClampedArray(width * height * 4), width, height}), measureText: text => ({width: String(text).length * 8})},
  {get: (target, key) => key in target ? target[key] : () => {}});
  globalThis.document = {createElement: () => ({width: 512, height: 512, getContext: () => context}), createElementNS: () => ({addEventListener() {}, removeEventListener() {}, setAttribute() {}})};
  globalThis.self = globalThis;
  globalThis.fetch = async (value, options) => {
    const url = new URL(value);
    if (url.protocol === 'file:') return new Response(fs.readFileSync(fileURLToPath(url)), {headers: {'content-type': 'model/gltf-binary'}});
    if (url.protocol === 'blob:') return originals.get('fetch')(value, options);
    throw new Error('CPU fixture blocks nonlocal fetch: ' + url.protocol);
  };
  globalThis.createImageBitmap = async blob => {
    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), close() {}};
  };
  return () => {for (const [key, value] of originals) {if (value === undefined) delete globalThis[key]; else globalThis[key] = value;}};
}

function foundationIntersections(mesh, rig) {
  // Exact unchanged hanging-foundation in vertical-castle.js: tapered from
  // 4.1 x 5.3 at y29 to 8.5 x 10.1 at y33.64, centred at z-12.
  // Clip actual skinned triangles, not merely their vertices or bounding box.
  const sx = 2.2 / 4.64, sz = 2.4 / 4.64;
  const planes = [[0, -1, 0, -29], [0, 1, 0, 33.64], [1, -sx, 0, 2.05 - 29 * sx], [-1, -sx, 0, 2.05 - 29 * sx], [0, -sz, 1, -9.35 - 29 * sz], [0, -sz, -1, 14.65 - 29 * sz]];
  const vertices = [], point = new T.Vector3(), inverse = rig.matrixWorld.clone().invert();
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    point.fromBufferAttribute(mesh.geometry.attributes.position, i);
    mesh.applyBoneTransform(i, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse); vertices.push(point.toArray());
  }
  const indices = mesh.geometry.index.array; let intersections = 0;
  for (let i = 0; i < indices.length; i += 3) {
    let polygon = [vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]];
    if (polygon.every(p => p[1] < 29) || polygon.every(p => p[1] > 33.64) || polygon.every(p => p[0] < -4.25) || polygon.every(p => p[0] > 4.25) || polygon.every(p => p[2] < -17.05) || polygon.every(p => p[2] > -6.95)) continue;
    for (const [a, b, c, d] of planes) {
      const clipped = [];
      for (let j = 0; j < polygon.length; j++) {
        const start = polygon[j], end = polygon[(j + 1) % polygon.length];
        const ds = a * start[0] + b * start[1] + c * start[2] - d + .001, de = a * end[0] + b * end[1] + c * end[2] - d + .001;
        if (ds <= 0) clipped.push(start);
        if ((ds < 0) !== (de < 0)) {const t = ds / (ds - de); clipped.push(start.map((v, k) => v + (end[k] - v) * t));}
      }
      polygon = clipped; if (!polygon.length) break;
    }
    if (polygon.length >= 3) intersections++;
  }
  return intersections;
}

const transform = object => [object.position.toArray(), object.quaternion.toArray(), object.scale.toArray()];
const variants = [['crawler', 'standard'], ['crawler', 'drill'], ['kaiju', 'flesh'], ['kaiju', 'cyborg'], ['airship', 'horizontal'], ['airship', 'vertical']];
const assetsPresent = ['flesh', 'cyborg'].every(kind => fs.existsSync(new URL('../assets/carriers/meshy/' + kind + '.glb', import.meta.url)));

test('actual imported monster claw reaches all six original impact surfaces at 0.7s without stretching or intersecting its fixed foundation', {skip: !assetsPresent && 'Production Meshy carrier assets unavailable'}, async t => {
  const restore = cpuBrowser();
  try {
    const {loadMeshyCarriers} = await import('../src/meshy-carriers.js'); await loadMeshyCarriers();
    const {makeCity, animateCity} = await import('../src/carriers.js'), {placeCity, GameScene} = await import('../src/scene.js'), sim = await import('../src/simulation.js');
    for (const [faction, variant] of variants) await t.test(variant, () => {
      const city = makeCity('kaiju', false, 1, 'flesh'), enemy = makeCity(faction, true, 1, variant);
      const reach = sim.meleeReach('kaiju', faction, 'flesh', variant); enemy.id = 'cpu-target';
      placeCity(city, -60, 30, 0); placeCity(enemy, -60, 30 + reach - .5, Math.PI);
      animateCity(city, 0, false, 0); animateCity(enemy, 0, false, 0);
      assert.equal(city.meshyCarrier?.kind, 'flesh');
      if (faction === 'kaiju') assert.equal(enemy.meshyCarrier?.kind, variant, 'Test must use imported target, not fallback anatomy');
      const {instance, controller} = city.meshyCarrier, mesh = instance.body.getObjectByProperty('isSkinnedMesh', true);
      const bones = mesh.skeleton.bones.map(bone => ({bone, position: bone.position.toArray(), scale: bone.scale.toArray()}));
      const inverseBinds = mesh.skeleton.boneInverses.map(matrix => matrix.toArray());
      const state = sim.createGame('kaiju', 'flesh'); state.time = 1;
      state.battle = {time: 0, enemyId: enemy.id, player: {x: -60, z: 30}, enemy: {x: -60, z: 30 + reach - .5}};
      const beforeSave = sim.serialize(state);
      const harness = {city, enemyCities: [enemy], state, scene: new T.Scene(), fx: [], cinematic: {mode: 'steady', impulse() {}}};
      GameScene.prototype.createEffect.call(harness, {kind: 'impact', source: 'player', time: 0, from: state.battle.player, to: state.battle.enemy, mounts: []});
      assert.ok(city.strikeTarget?.isVector3, 'Original surface raycast must produce the impact anchor');
      const target = city.strikeTarget.clone(); let contactChecked = false;
      for (let frame = 0; frame <= 78; frame++) {
        const time = 1 + frame / 60; animateCity(city, time, false, 0);
        if ([0, 12, 24, 42, 60, 77].includes(frame)) assert.equal(foundationIntersections(mesh, city.rig), 0, variant + ' castle intersection at ' + frame / 60);
        for (const {bone, position, scale} of bones) {
          assert.deepEqual(bone.scale.toArray(), scale, 'No bone stretching: ' + bone.name);
          if (bone.name === 'Bone_000') {assert.equal(bone.position.x, position[0]); assert.equal(bone.position.z, position[2]); assert.ok(Math.abs(bone.position.y - position[1]) <= .041);}
          else assert.deepEqual(bone.position.toArray(), position, 'Original attachment length: ' + bone.name);
        }
        if (frame !== 42) continue;
        const status = controller.status(), marker = city.strikeHand.getWorldPosition(new T.Vector3()), actual = new T.Vector3();
        actual.fromBufferAttribute(mesh.geometry.attributes.position, status.strikeVertexIndex); mesh.applyBoneTransform(status.strikeVertexIndex, actual).applyMatrix4(mesh.matrixWorld);
        assert.ok(actual.distanceTo(marker) < .002, variant + ' actual claw error ' + actual.distanceTo(marker));
        assert.ok(Math.abs(actual.distanceTo(marker) - status.strikeError) < 1e-8);
        assert.ok(marker.distanceTo(target) < .001, 'Original rig marker still reaches its unchanged target');
        const fixed = [city.root, city.rig, city.strikeHand, instance.root], transforms = fixed.map(transform);
        controller.update({time: time + .000001, moving: false, heading: city.heading, strikeHand: marker, strikeWeight: 1});
        assert.deepEqual(fixed.map(transform), transforms, 'Body-only fit must not move original rig, root or strike marker');
        assert.deepEqual(city.strikeTarget, target); contactChecked = true;
      }
      assert.ok(contactChecked); assert.equal(sim.serialize(state), beforeSave);
      assert.deepEqual(mesh.skeleton.boneInverses.map(matrix => matrix.toArray()), inverseBinds);
      controller.dispose(); enemy.meshyCarrier?.controller?.dispose();
    });
  } finally {restore();}
});
