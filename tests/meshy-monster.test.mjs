import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {createMeshyMonsterPose, inspectMeshyMonsterRig, MONSTER_RIG} from '../src/meshy-monster.js';

// Use the actual, locally inspected skin. Images are omitted only from this
// CPU-only parser; geometry, joints, weights and bind matrices remain exact.
const candidates = ['../assets/carriers/meshy/flesh.glb'].map(path => new URL(path, import.meta.url));
const source = candidates.find(path => fs.existsSync(path));
const assetTest = (name, fn) => test('legacy original54: '+name, {skip: !source && 'The inspected local Meshy monster GLB is unavailable'}, fn);
const digest = value => createHash('sha256').update(Buffer.from(value.buffer, value.byteOffset, value.byteLength)).digest('hex');
async function fixture(groundHeight = () => 0, options = {}) {
  const input = fs.readFileSync(source), jsonLength = input.readUInt32LE(12), document = JSON.parse(input.subarray(20, 20 + jsonLength));
  for (const material of document.materials || []) {
    delete material.normalTexture; delete material.occlusionTexture; delete material.emissiveTexture;
    delete material.pbrMetallicRoughness.baseColorTexture; delete material.pbrMetallicRoughness.metallicRoughnessTexture;
  }
  const encoded = Buffer.from(JSON.stringify(document)), json = Buffer.alloc((encoded.length + 3) & ~3, 32); encoded.copy(json);
  const binary = input.subarray(20 + jsonLength), output = Buffer.alloc(20 + json.length + binary.length);
  input.copy(output, 0, 0, 20); output.writeUInt32LE(output.length, 8); output.writeUInt32LE(json.length, 12); json.copy(output, 20); binary.copy(output, 20 + json.length);
  const gltf = await new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength), '');
  const actor = new T.Group(), root = new T.Group(), deck = new T.Object3D(), marker = new T.Object3D();
  deck.position.set(0, 34, -12); marker.position.set(6, 35, 4); actor.scale.setScalar(.55);
  root.scale.set(16, 21, 16); root.position.set(-.325, -1.8, -12); root.add(gltf.scene); actor.add(root, deck, marker);
  const instance = {body: gltf.scene, root, capabilities: {animations: gltf.animations.map(clip => clip.name)}};
  const inspection = inspectMeshyMonsterRig(instance), controller = createMeshyMonsterPose(instance, {groundHeight, strideDistance: 3.4, ...options});
  return {actor, root, deck, marker, instance, controller, ...inspection};
}
function soleVertices(mesh, end) {
  const joints = new Set(); end.traverse(bone => {if (bone.isBone) joints.add(mesh.skeleton.bones.indexOf(bone));});
  const result = [], index = mesh.geometry.attributes.skinIndex.array, weight = mesh.geometry.attributes.skinWeight.array;
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    let total = 0; for (let k = 0; k < 4; k++) if (joints.has(index[i * 4 + k])) total += weight[i * 4 + k];
    if (total > .4) result.push(i);
  }
  return result;
}

assetTest('actual Smart Rig has four complete weighted leg chains; incompatible rigs are rejected explicitly', async () => {
  const f = await fixture(); assert.equal(f.bones.size, 54);
  assert.equal(f.mesh.geometry.index.count / 3, 57692, 'Keep every triangle of the new rigged remesh');
  for (const [name, chain] of Object.entries(MONSTER_RIG)) if (name !== 'tail') assert.ok(soleVertices(f.mesh, f.bones.get(chain.at(-1))).length > 30);
  assert.throws(() => inspectMeshyMonsterRig({...f.instance, capabilities: {animations: ['guessed walk']}}), /static Smart Rig/);
  f.bones.get('Bone_033').name = 'different rig'; assert.throws(() => inspectMeshyMonsterRig(f.instance), /differs/);
});

assetTest('distance drives gait, paused/repeated time freezes it, and actor/deck/strike marker data are untouched', async () => {
  const f = await fixture(), before = [f.actor, f.root, f.deck, f.marker].map(object => [object.position.toArray(), object.quaternion.toArray(), object.scale.toArray()]);
  f.controller.update({time: 0, moving: true}); const first = f.controller.update({time: 1, moving: true, distanceDelta: .34});
  assert.ok(Math.abs(first.phase - .1) < 1e-12);
  const rotations = [...f.bones.values()].map(bone => bone.quaternion.toArray());
  assert.deepEqual(f.controller.update({time: 1, moving: true, distanceDelta: 100}), first);
  assert.deepEqual([...f.bones.values()].map(bone => bone.quaternion.toArray()), rotations);
  f.controller.update({time: 2, moving: false, distanceDelta: 100}); assert.equal(f.controller.status().phase, first.phase);
  assert.deepEqual([f.actor, f.root, f.deck, f.marker].map(object => [object.position.toArray(), object.quaternion.toArray(), object.scale.toArray()]), before);
  assert.throws(() => f.controller.update({time: 3, moving: true, distanceDelta: -1}), /Invalid/);
});

assetTest('weight-bearing paws keep the inspected wrist-to-toe pose through start, stride, turn and sustained stop', async () => {
  const f = await fixture(() => 0, {strideDistance: 8.8, supportCrouch: .12});
  const toes = Object.entries(MONSTER_RIG).filter(([name]) => name !== 'tail').map(([name, chain]) => {
    const toe = f.bones.get(chain.at(-1)); return {name, toe, rest: toe.quaternion.clone()};
  });
  for (let frame = 0; frame < 120; frame++) {
    const moving = frame >= 12 && frame < 90, heading = frame < 50 ? 0 : .8;
    f.actor.position.z += moving ? .08 : 0; f.actor.rotation.y = heading;
    f.controller.update({time: frame / 30, moving, distanceDelta: moving ? .08 : 0, heading});
    for (const {name, toe, rest} of toes) assert.ok(toe.quaternion.angleTo(rest) < 1e-6, name + ': the supporting paw must not curl through the toe joint');
  }
  f.controller.dispose();
});

assetTest('four-beat walk plants the actual weighted paws while turning on uneven ground with nonuniform body fit', async () => {
  const ground = (x, z) => .045 * x + .025 * z + .15 * Math.sin(z * .15), f = await fixture(ground), point = new T.Vector3();
  const groups = Object.entries(MONSTER_RIG).filter(([key]) => key !== 'tail').map(([name, chain]) => ({name, vertices: soleVertices(f.mesh, f.bones.get(chain.at(-2)))}));
  let worstPenetration = 0, largestContactGap = 0, maxIkError = 0, previous = null, swingingFrames = 0;
  for (let frame = 0; frame < 360; frame++) {
    const time = frame / 60, angle = time * .12;
    f.actor.position.set(16 * Math.sin(angle), 0, 16 * (1 - Math.cos(angle))); f.actor.position.y = ground(f.actor.position.x, f.actor.position.z);
    f.actor.rotation.y = Math.PI / 2 - angle; f.root.rotation.x = .035 * Math.sin(time);
    const state = f.controller.update({time, moving: true, distanceDelta: frame ? 1.92 / 60 : 0, heading: f.actor.rotation.y});
    assert.ok(state.legs.filter(leg => leg.planted).length >= 3);
    if (state.legs.some(leg => !leg.planted)) swingingFrames++;
    for (const group of groups) {
      const leg = state.legs.find(leg => leg.name === group.name); if (!leg.planted) continue;
      const old = previous?.legs.find(old => old.name === leg.name);
      if (old?.planted && leg.phase > old.phase) {assert.equal(leg.target[0], old.target[0]); assert.equal(leg.target[2], old.target[2]);}
      maxIkError = Math.max(maxIkError, leg.soleError);
      let clearance = Infinity;
      for (const index of group.vertices) {
        point.fromBufferAttribute(f.mesh.geometry.attributes.position, index); f.mesh.applyBoneTransform(index, point).applyMatrix4(f.mesh.matrixWorld);
        clearance = Math.min(clearance, point.y - ground(point.x, point.z));
      }
      worstPenetration = Math.min(worstPenetration, clearance); largestContactGap = Math.max(largestContactGap, clearance);
    }
    previous = state;
  }
  assert.ok(swingingFrames > 300); assert.ok(maxIkError < .001, String(maxIkError));
  assert.ok(worstPenetration > -.003, String(worstPenetration)); assert.ok(largestContactGap < .012, String(largestContactGap));
});

assetTest('poses preserve original vertex/skin/bind data and curled tail stays inside existing resting pick footprint', async () => {
  const f = await fixture(), attributes = Object.fromEntries(Object.entries(f.mesh.geometry.attributes).map(([name, attribute]) => [name, digest(attribute.array)]));
  const inverseBinds = f.mesh.skeleton.boneInverses.map(matrix => matrix.toArray());
  f.controller.update({time: 0, moving: false}); f.controller.update({time: 1, moving: false});
  assert.deepEqual(Object.fromEntries(Object.entries(f.mesh.geometry.attributes).map(([name, attribute]) => [name, digest(attribute.array)])), attributes);
  assert.deepEqual(f.mesh.skeleton.boneInverses.map(matrix => matrix.toArray()), inverseBinds);
  const bounds = new T.Box3(), point = new T.Vector3();
  for (let i = 0; i < f.mesh.geometry.attributes.position.count; i++) {
    point.fromBufferAttribute(f.mesh.geometry.attributes.position, i); f.mesh.applyBoneTransform(i, point).applyMatrix4(f.mesh.matrixWorld); f.actor.worldToLocal(point); bounds.expandByPoint(point);
  }
  assert.ok(bounds.min.x > -12 && bounds.max.x < 12, JSON.stringify(bounds));
  assert.ok(bounds.min.z > -25 && bounds.max.z < 9, JSON.stringify(bounds));
});

assetTest('front paw follows a supplied reachable strike marker without changing it; disposal prevents later poses', async () => {
  const f = await fixture(); f.controller.update({time: 0, moving: false});
  const goal = f.bones.get('Bone_037').getWorldPosition(new T.Vector3()).add(new T.Vector3(.15, .2, .1)), original = goal.clone();
  const state = f.controller.update({time: .1, moving: false, strikeHand: goal, strikeWeight: 1});
  assert.ok(state.strikeError < .002, String(state.strikeError)); assert.deepEqual(goal, original);
  assert.equal(state.legs.find(leg => leg.name === 'frontRight').planted, false);
  const rotations = [...f.bones.values()].map(bone => bone.quaternion.toArray()); f.controller.dispose();
  assert.equal(f.controller.update({time: 1, moving: true, distanceDelta: 1}), null);
  assert.deepEqual([...f.bones.values()].map(bone => bone.quaternion.toArray()), rotations);
});

assetTest('actual travel controls and carrier support keep a heavy 8.8m stride reachable through heading jumps and hills', async () => {
  const priorDocument = globalThis.document;
  const context = new Proxy({createLinearGradient: () => ({addColorStop() {}}), createRadialGradient: () => ({addColorStop() {}}),
    createImageData: (width, height) => ({data: new Uint8ClampedArray(width * height * 4), width, height}), measureText: text => ({width: String(text).length * 8})},
  {get: (target, key) => key in target ? target[key] : () => {}});
  globalThis.document = {createElement: () => ({width: 512, height: 512, getContext: () => context}), createElementNS: () => ({addEventListener() {}, removeEventListener() {}, setAttribute() {}})};
  try {
    const {makeCity, animateCity} = await import('../src/carriers.js'), {placeCity} = await import('../src/scene.js');
    const simulation = await import('../src/simulation.js'), {renderedTerrainHeight} = await import('../src/terrain.js');
    const city = makeCity('kaiju', false, 1, 'flesh'), point = new T.Vector3();
    for (const route of ['forward', 'reverse', 'turn', 'hill']) {
      const f = await fixture(renderedTerrainHeight, {strideDistance: 8.8, supportCrouch: .12}); city.rig.add(f.root);
      const state = simulation.createGame('kaiju', 'flesh'); state.x = route === 'hill' ? -130 : -55; state.z = route === 'hill' ? -5 : 40;
      state.angle = route === 'reverse' ? Math.PI : 0; state.resources.food = 100000;
      simulation.travel(state, ...(route === 'reverse' ? [state.x, state.z - 90] : route === 'hill' ? [-40, -5] : [state.x, state.z + 90]));
      delete city.gaitPrevious; delete city.gaitDistance; for (const limb of city.limbs) {limb.plant = null; limb.swing = null;}
      const groups = Object.entries(MONSTER_RIG).filter(([key]) => key !== 'tail').map(([name, chain]) => ({name, vertices: soleVertices(f.mesh, f.bones.get(chain.at(-2)))}));
      let previous = null, replants = 0, minimum = Infinity, maximum = -Infinity, maxError = 0;
      for (let frame = 0; frame < 480; frame++) {
        const before = {x: state.x, z: state.z};
        if (route === 'turn' && frame % 90 === 0) simulation.travel(state, -55 + 45 * Math.sin(frame / 480 * Math.PI * 2), 40 + 45 * Math.cos(frame / 480 * Math.PI * 2));
        simulation.tick(state, 1 / 60); placeCity(city, state.x, state.z, state.angle); animateCity(city, state.time, state.moving, 0);
        const saved = simulation.serialize(state), status = f.controller.update({time: state.time, moving: state.moving, distanceDelta: Math.hypot(state.x - before.x, state.z - before.z), heading: state.angle});
        assert.equal(simulation.serialize(state), saved);
        for (const group of groups) {
          const leg = status.legs.find(leg => leg.name === group.name), old = previous?.legs.find(old => old.name === group.name);
          if (leg.replanted) replants++;
          if (!leg.planted) continue;
          if (old?.planted && !leg.replanted && leg.phase > old.phase) {assert.equal(leg.target[0], old.target[0]); assert.equal(leg.target[2], old.target[2]);}
          maxError = Math.max(maxError, leg.soleError); let clearance = Infinity;
          for (const index of group.vertices) {
            point.fromBufferAttribute(f.mesh.geometry.attributes.position, index); f.mesh.applyBoneTransform(index, point).applyMatrix4(f.mesh.matrixWorld);
            clearance = Math.min(clearance, point.y - renderedTerrainHeight(point.x, point.z));
          }
          minimum = Math.min(minimum, clearance); maximum = Math.max(maximum, clearance);
        }
        previous = status;
      }
      assert.ok(maxError < .002, route + ' IK: ' + maxError);
      assert.ok(minimum > -.001, route + ' penetration: ' + minimum); assert.ok(maximum < .02, route + ' gap: ' + maximum);
      if (route === 'turn') assert.ok(replants >= 20 && replants <= 24, 'bounded turn replants: ' + replants); else assert.equal(replants, 0, route);
      f.controller.dispose(); f.root.removeFromParent();
    }
  } finally {if (priorDocument === undefined) delete globalThis.document; else globalThis.document = priorDocument;}
});
