import test from 'node:test';
import {cpuImageBitmap} from './beast-integration-cpu.mjs';
import {createDisplayGeometryVerifier} from './beast-integration-display.mjs';
import {saddleSlabCollisions,visibleSkinVerticesInRig} from './helpers/saddle-slab-clearance.mjs';
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
  globalThis.createImageBitmap = cpuImageBitmap;
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
// Include both sides of the late support-elbow transition. Endpoints alone
// miss geometry that crosses a deck between reach, contact and recovery.
// Dense strike checks exposed shoulder/deck crossings during recovery frames62–65.
const loadedStrikeFrames=[0,12,24,29,31,32,42,57,58,59,60,62,63,64,65,77];
const assetsPresent = ['flesh', 'cyborg'].every(kind => fs.existsSync(new URL('../assets/carriers/meshy/' + kind + '.glb', import.meta.url)));

test('authored flesh contact pool excludes added fully weighted display vertices', {skip: !assetsPresent && 'Production Meshy carrier assets unavailable'}, async () => {
  const restore = cpuBrowser(); let instance, altered, original, baseline, candidate, dispose;
  try {
    const assets = await import('../src/meshy-carriers.js'); await assets.loadMeshyCarriers(); dispose = assets.disposeMeshyCarrier;
    const {createMeshyMonsterPose} = await import('../src/meshy-monster.js');
    instance = assets.instantiateMeshyCarrier('flesh'); const mesh = instance.body.getObjectByProperty('isSkinnedMesh', true);
    original = mesh.geometry; assert.ok(original.userData.sourceContactVertices < original.attributes.position.count);
    baseline = createMeshyMonsterPose(instance, {groundHeight: () => 0, strideDistance: 8.8});
    const before = baseline.status(), tip = before.strikeVertexIndex;
    altered = original.clone();
    // A later cosmetic append may legitimately use the terminal joint. A
    // visibly farther tip or lower pad must not redefine the original solver.
    for (const [name, attribute] of Object.entries(original.attributes)) {
      const values = new attribute.array.constructor(attribute.array.length + attribute.itemSize * 3); values.set(attribute.array);
      for (let i = 0; i < 3; i++) for (let lane = 0; lane < attribute.itemSize; lane++) values[attribute.array.length + i * attribute.itemSize + lane] = attribute.getComponent(tip, lane);
      if (name === 'position') for (let i = 0; i < 3; i++) {const offset = attribute.array.length + i * 3; values[offset] += (i - 1) * .1; values[offset + 1] -= .3 + (i === 1 ? .03 : 0); values[offset + 2] += 1;}
      altered.setAttribute(name, new T.BufferAttribute(values, attribute.itemSize, attribute.normalized));
    }
    const first = original.attributes.position.count;
    altered.setIndex([...original.index.array, first, first + 1, first + 2]); mesh.geometry = altered;
    candidate = createMeshyMonsterPose(instance, {groundHeight: () => 0, strideDistance: 8.8});
    assert.equal(candidate.status().strikeVertexIndex, tip);
    assert.deepEqual(candidate.status().legs.map(l => l.soleSamples), before.legs.map(l => l.soleSamples));
  } finally {
    baseline?.dispose(); candidate?.dispose();
    if (instance) {instance.body.getObjectByProperty('isSkinnedMesh', true).geometry = original; dispose(instance);}
    altered?.dispose(); restore();
  }
});

test('actual imported monster claw reaches all six original impact surfaces without stretching or intersecting its fixed foundation and 20 occupied decks', {skip: !assetsPresent && 'Production Meshy carrier assets unavailable'}, async t => {
  const restore = cpuBrowser();
  try {
    const {loadMeshyCarriers} = await import('../src/meshy-carriers.js'); await loadMeshyCarriers();
    const {makeCity, animateCity, setCityRings} = await import('../src/carriers.js'), {placeCity, GameScene} = await import('../src/scene.js'), sim = await import('../src/simulation.js');
    for (const [faction, variant] of variants) await t.test(variant, context => {
      const state=sim.createGame('kaiju','flesh');state.rings=2;
      const added=state.buildings.flatMap((building,slot)=>building?[]:[slot]);
      for(const slot of added)state.buildings[slot]={type:'housing',level:1,remaining:0};
      state.towerOrder.push(...added);
      const city = makeCity('kaiju', false, state.rings, 'flesh'), enemy = makeCity(faction, true, 1, variant);
      setCityRings(city,state.rings,state.buildings,state.towerOrder);assert.equal(city.saddleLayout.floors.length,20,'All20 production deck slabs must be occupied during the strike');
      const reach = sim.meleeReach('kaiju', faction, 'flesh', variant); enemy.id = 'cpu-target';
      placeCity(city, -60, 30, 0); placeCity(enemy, -60, 30 + reach - .5, Math.PI);
      animateCity(city, 0, false, 0); animateCity(enemy, 0, false, 0);
      assert.equal(city.meshyCarrier?.kind, 'flesh');
      if (faction === 'kaiju') assert.equal(enemy.meshyCarrier?.kind, variant, 'Test must use imported target, not fallback anatomy');
      const {instance, controller} = city.meshyCarrier, mesh = instance.body.getObjectByProperty('isSkinnedMesh', true);
      if (mesh.userData.authoredFlesh) {
        const contactCount = mesh.geometry.userData.sourceContactVertices;
        assert.equal(contactCount, mesh.userData.sourceContactVertices, 'Preserved source pool metadata reaches the pose geometry');
        assert.ok(contactCount < mesh.geometry.attributes.position.count, 'Fixture includes additional authored display vertices');
        const contact = controller.status().strikeVertexIndex;
        assert.ok(contact < contactCount, 'Strike sampling stays in the exact original contact pool');
        const signature = id => ['position', 'skinIndex', 'skinWeight'].flatMap(name => {const a=mesh.geometry.attributes[name];return Array.from({length:a.itemSize},(_,lane)=>a.getComponent(id,lane));}).join(',');
        const expected = signature(contact);
        const visible=new Set(mesh.geometry.index.array),matching=[...visible].filter(id=>signature(id)===expected);
        assert.ok(matching.length>0, 'The selected original claw vertex '+contact+' remains on the visible paw hull, including exact UV seam duplicates');
        if(mesh.userData.riggedBeast){
          // The new UV atlas duplicates visible hull vertices after the hidden
          // source pool. Require an exact rendered position/weight signature
          // and explicit source mapping; index placement is not contact proof.
          const hulls=Object.values(mesh.userData.visibleContactHulls??{});
          assert.ok(hulls.some(hull=>hull.visibleVertexIds.some((id,i)=>visible.has(id)&&matching.includes(id)&&signature(hull.sourceVertexIds[i])===expected)), 'Visible strike duplicate must map to the exact original contact');
        }
      }
      const bones = mesh.skeleton.bones.map(bone => ({bone, position: bone.position.toArray(), scale: bone.scale.toArray()}));
      const originalNames=new Set(Array.from({length:54},(_,i)=>'Bone_'+String(i).padStart(3,'0'))),displayVerifier=mesh.userData.displayLimbRig?createDisplayGeometryVerifier(instance):null;
      // Observe the production call, forwarding it unchanged. The verifier
      // must not reconstruct the attack timing or assume a neutral-only pole.
      const originalUpdate=controller.update;let observedStrikeWeight=0;
      controller.update=function(args){observedStrikeWeight=args.strikeWeight??0;return originalUpdate.call(this,args);};
      const inverseBinds = mesh.skeleton.boneInverses.map(matrix => matrix.toArray());
      state.time = 1;
      state.battle = {time: 0, enemyId: enemy.id, player: {x: -60, z: 30}, enemy: {x: -60, z: 30 + reach - .5}};
      const beforeSave = sim.serialize(state);
      const harness = {city, enemyCities: [enemy], state, scene: new T.Scene(), fx: [], cinematic: {mode: 'steady', impulse() {}}};
      GameScene.prototype.createEffect.call(harness, {kind: 'impact', source: 'player', time: 0, from: state.battle.player, to: state.battle.enemy, mounts: []});
      assert.ok(city.strikeTarget?.isVector3, 'Original surface raycast must produce the impact anchor');
      const target = city.strikeTarget.clone(); let contactChecked = false,loadedStrikeSamples=0;
      for (let frame = 0; frame <= 78; frame++) {
        const time = 1 + frame / 60; animateCity(city, time, false, 0);
        if (loadedStrikeFrames.includes(frame)) {
          assert.equal(foundationIntersections(mesh, city.rig), 0, variant + ' castle intersection at ' + frame / 60);
          city.root.updateMatrixWorld(true);
          const counts=saddleSlabCollisions(visibleSkinVerticesInRig(mesh,city.rig),mesh.geometry.index.array,.12);
          assert.deepEqual(counts,Array(20).fill(0),variant+' actual visible skin violates20 occupied slab clearance at strike-frame-'+frame+'; counts by tier '+JSON.stringify(counts));loadedStrikeSamples++;
        }
        for (const {bone, position, scale} of bones) {
          assert.deepEqual(bone.scale.toArray(), scale, 'No bone stretching: ' + bone.name);
          if (bone.name === 'Bone_000') {assert.equal(bone.position.x, position[0]); assert.equal(bone.position.z, position[2]); assert.ok(Math.abs(bone.position.y - position[1]) <= .041);}
          else if(originalNames.has(bone.name)) assert.deepEqual(bone.position.toArray(), position, 'Original attachment length: ' + bone.name);
        }
        displayVerifier?.check(variant+' strike-frame-'+frame,{strikeWeight:observedStrikeWeight});
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
      assert.equal(loadedStrikeSamples,loadedStrikeFrames.length);context.diagnostic(JSON.stringify({variant,loadedStrikeSamples,occupiedDecks:20,marginRigUnits:.12,marginWorldUnits:.066}));
      controller.update=originalUpdate;controller.dispose(); enemy.meshyCarrier?.controller?.dispose();
    });
  } finally {restore();}
});
