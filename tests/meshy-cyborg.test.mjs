import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {loadMeshyCarriers, meshyCarriersStatus} from '../src/meshy-carriers.js';
import {disposeMeshyCyborg, CYBORG_BODY_FIT} from '../src/meshy-cyborg.js';
import {makeCity, animateCity, setCityRings} from '../src/carriers.js';
import {disposeGroup} from '../src/materials.js';
import {terrainHeight, renderedTerrainHeight} from '../src/terrain.js';
import {createGame, attackDelay, tick, travel} from '../src/simulation.js';
import {CYBORG_CONTACT_HULLS} from '../src/cyborg-contact-hulls.js';
import {carrierSculptFixture} from './helpers/carrier-sculpt-fixture.mjs';

// Real local skin and animation, CPU transforms/geometry only. Embedded PNG
// dimensions are inspected here; pixel decoding and rendering need browser QA.
const old = {document: globalThis.document, self: globalThis.self, bitmap: globalThis.createImageBitmap, fetch: globalThis.fetch};
let legacy;
const cities = [];
const close = city => {if (city.meshyCarrier) disposeMeshyCyborg(city.meshyCarrier); disposeGroup(city.root);};
function build() {const city = makeCity('kaiju', false, 1, 'cyborg'); const state = createGame('kaiju', 'cyborg'); setCityRings(city, state.rings, state.buildings, state.towerOrder); cities.push(city); return city;}
function place(city, x, z, heading = 0) {city.heading = heading; city.root.position.set(x, terrainHeight(x, z), z); city.root.rotation.set(0, heading, 0); city.root.updateMatrixWorld(true);}
function functional(city) {return [city.rig.matrixWorld.elements, city.strikeHand.matrixWorld.elements, ...city.baseWeapons.map(w => w.group.matrixWorld.elements), ...city.slots.map(slot => slot.matrixWorld.elements)].flat();}
function assertArrayClose(a, b, tolerance = 1e-9) {assert.equal(a.length, b.length); for (let i = 0; i < a.length; i++) assert.ok(Math.abs(a[i] - b[i]) <= tolerance, `element ${i}: ${a[i]} != ${b[i]}`);}
function skinMetrics(city) {
  const mesh = city.meshyCarrier.renderMeshes[0], vertex = new T.Vector3(), bounds = new T.Box3(); let gap = Infinity, castleVertices = 0;
  // Authored armor keeps the original skin as an unrendered contact pool.
  // Appearance metrics must inspect triangles that are actually drawn; exact
  // source contact/support scans remain separate tests below.
  const visible = mesh.geometry.index ? new Set(mesh.geometry.index.array) : Array.from({length: mesh.geometry.attributes.position.count}, (_, i) => i);
  for (const i of visible) {
    mesh.getVertexPosition(i, vertex); vertex.applyMatrix4(mesh.matrixWorld); gap = Math.min(gap, vertex.y - renderedTerrainHeight(vertex.x, vertex.z));
    city.rig.worldToLocal(vertex); bounds.expandByPoint(vertex);
    if (vertex.y >= 34 && Math.abs(vertex.x) <= 4.4 && vertex.z >= -17.2 && vertex.z <= -6.8) castleVertices++;
  }
  return {gap, castleVertices, bounds};
}

before(async () => {
  const gradient = {addColorStop() {}}, context = new Proxy({createLinearGradient: () => gradient, createRadialGradient: () => gradient, measureText: () => ({width: 8})}, {get: (value, key) => value[key] ?? (() => {})});
  globalThis.document = {createElement: () => ({width: 0, height: 0, getContext: () => context}), createElementNS: () => ({addEventListener() {}, removeEventListener() {}})};
  legacy = build(); assert.equal(legacy.meshyCarrier, null, 'Unavailable import retains original visible carrier');
  globalThis.self = globalThis;
  globalThis.createImageBitmap = async blob => {const view = new DataView(await blob.arrayBuffer()); return {width: view.getUint32(16), height: view.getUint32(20), close() {}};};
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url || input.href);
    if (url.protocol === 'blob:') return old.fetch(input, options);
    assert.ok(url.pathname.endsWith('/assets/carriers/meshy/cyborg.glb'), 'Only the local robot may be loaded'); return new Response(await readFile(url));
  };
  await loadMeshyCarriers(['cyborg']);
});
after(() => {
  for (const city of cities) close(city);
  for (const [key, value] of [['document', old.document], ['self', old.self], ['createImageBitmap', old.bitmap], ['fetch', old.fetch]]) {if (value === undefined) delete globalThis[key]; else globalThis[key] = value;}
});

test('actual robot uses requested clip, keeps exact castle/weapon/control transforms, and leaves original body fallback', () => {
  const imported = build(); assert.equal(imported.meshyCarrier.kind, 'cyborg'); assert.equal(imported.meshyCarrier.instance.clip.name, 'Casual_Walk');
  const authored = imported.meshyCarrier.renderMeshes[0].geometry.userData.foundryCyborg;
  assert.equal(authored.sourceTriangles, 57620, 'The original Meshy source remains intact');
  assert.equal(imported.meshyCarrier.instance.capabilities.triangles, 12836, 'The drawn body is the authored armor and contact hulls');
  assert.equal(imported.meshyCarrier.instance.capabilities.bones.length, 28);
  assert.equal(imported.deckY, 34); assert.equal(imported.scale, .55); assert.equal(imported.verticalLayout.heightScale, .5);
  assert.ok(imported.limbs.every(limb => !limb.obj.visible)); assert.ok(legacy.limbs.every(limb => limb.obj.visible));
  for (let i = 0; i < 100; i++) {
    for (const city of [legacy, imported]) {place(city, 0, i * .2); animateCity(city, i / 55, true);}
    assertArrayClose(functional(imported), functional(legacy));
  }
  assert.ok(imported.meshyCarrier.strideDistance > 30 && imported.meshyCarrier.strideDistance < 45, 'Whole four-second clip contains several strides; do not use the old single-stride travel');
});

test('actual robot skips hidden legacy raycast subtrees but preserves slot, weapon and harness intersections', () => {
  const city = build(); place(city, 0, 0); animateCity(city, 0, false); city.root.updateMatrixWorld(true);
  const hidden = [], saved = []; let descendantQueries = 0;
  city.root.traverse(object => {if (object.userData.legacyCarrierBody) hidden.push(object);});
  assert.ok(hidden.length > 4);
  for (const root of hidden) root.traverse(object => {
    if (object === root || !object.isMesh) return;
    saved.push([object, object.raycast]); object.raycast = () => {descendantQueries++;};
  });
  assert.ok(saved.length > 0, 'There must be real replaced body descendants to exercise');
  try {
    const ray = new T.Raycaster(new T.Vector3(0, 40, 100), new T.Vector3(0, 0, -1));
    assert.deepEqual(ray.intersectObjects(hidden, true), []);
    assert.equal(descendantQueries, 0, 'Hidden body descendants must never enter their triangle raycasts');
  } finally {for (const [object, raycast] of saved) object.raycast = raycast;}

  // Aim at an actual triangle, not a guessed centre that could be an opening.
  const faceRay = mesh => {
    const geometry = mesh.geometry, positions = geometry.attributes.position, index = geometry.index;
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), normal = new T.Vector3();
    for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
      for (const [vertex, offset] of [[a, 0], [b, 1], [c, 2]]) vertex.fromBufferAttribute(positions, index ? index.getX(i + offset) : i + offset).applyMatrix4(mesh.matrixWorld);
      normal.crossVectors(b.clone().sub(a), c.clone().sub(a)); if (normal.lengthSq() < 1e-12) continue;
      normal.normalize(); const centre = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      return new T.Raycaster(centre.addScaledVector(normal, .05), normal.negate());
    }
    throw new Error('Expected a nondegenerate visible triangle');
  };
  const slot = city.slots[0]; assert.equal(slot.material.visible, false);
  assert.ok(faceRay(slot).intersectObject(slot, true).some(hit => hit.object === slot), 'Intentional invisible plot proxy remains selectable');
  const weaponMeshes = []; city.baseWeapons[0].group.traverse(object => {if (object.isMesh && object.visible && object.material.visible) weaponMeshes.push(object);});
  assert.ok(weaponMeshes.length > 0);
  assert.ok(faceRay(weaponMeshes[0]).intersectObject(city.root, true).some(hit => hit.object === weaponMeshes[0]), 'Visible body weapon remains a surface target');
  const harness = city.frame.children.filter(object => object.isMesh && object.userData.batched && object.visible && object.material.visible);
  assert.ok(harness.length > 0, 'The separately constructed cyborg harness remains visible');
  for (const mesh of harness) assert.ok(faceRay(mesh).intersectObject(city.root, true).some(hit => hit.object === mesh), 'Visible harness remains a surface target');
});

test('remeshed contact is a hand-owned skin vertex and complete boot geometry remains available for exact support', () => {
  const city = build(), adapter = city.meshyCarrier, mesh = adapter.renderMeshes[0], joints = new Set();
  adapter.arm.hand.traverse(object => {if (object.isBone) joints.add(mesh.skeleton.bones.indexOf(object));});
  const index = adapter.arm.contactVertex, skin = mesh.geometry.attributes.skinIndex, weight = mesh.geometry.attributes.skinWeight;
  assert.ok(Number.isInteger(index) && index >= 0 && index < mesh.geometry.attributes.position.count);
  let influence = 0; for (let lane = 0; lane < 4; lane++) if (joints.has(skin.getComponent(index, lane))) influence += weight.getComponent(index, lane);
  assert.ok(influence > .99999, 'The visual marker must follow only the actual hand and its descendants');
  for (const foot of adapter.feet) {
    assert.ok(foot.fullIndices.length > 1000, 'The complete remeshed boot cannot be replaced by the old sparse hull');
    assert.ok(foot.indices.length < foot.fullIndices.length);
    assert.ok(foot.indices.every(index => foot.fullIndices.includes(index)));
    const legJoints = new Set(); foot.upper.traverse(bone => {if (bone.isBone) legJoints.add(mesh.skeleton.bones.indexOf(bone));});
    for (const vertex of foot.fullIndices) for (let k = 0; k < 4; k++) {
      if (weight.getComponent(vertex, k) > 0) assert.ok(legJoints.has(skin.getComponent(vertex, k)), 'A later opposite-leg or arm solve must not invalidate this boot support minimum');
    }
  }
});

test('world-Y support metric equals the actual complete skinned boot minimum through motion and stops', () => {
  const city = build(), adapter = city.meshyCarrier, mesh = adapter.renderMeshes[0], vertex = new T.Vector3();
  for (let frame = 0; frame < 32; frame++) {
    place(city, -40 + frame * .17, -5 + frame * .23, Math.floor(frame / 8) * .7);
    animateCity(city, frame / 15, frame < 20);
    let minimum = Infinity;
    for (const foot of adapter.feet) for (const index of foot.fullIndices) {
      mesh.getVertexPosition(index, vertex); vertex.applyMatrix4(mesh.matrixWorld);
      minimum = Math.min(minimum, vertex.y - renderedTerrainHeight(vertex.x, vertex.z));
    }
    assert.ok(Math.abs(minimum - adapter.metrics.minimumFootGap) < 1e-7, 'Support metric must equal a fresh complete boot scan: ' + minimum + ' / ' + adapter.metrics.minimumFootGap);
  }
});

test('actual skinned boot hull clears rendered terrain and walking upper body clears the unchanged castle volume', t => {
  const city = build(); let minimumGap = Infinity, intrusions = 0; const envelope = new T.Box3();
  for (let i = 0; i < 160; i++) {
    place(city, 0, i * .35); animateCity(city, i / 30, true);
    const metrics = skinMetrics(city);
    minimumGap = Math.min(minimumGap, metrics.gap); intrusions += metrics.castleVertices; envelope.union(metrics.bounds);
  }
  const width = envelope.max.x - envelope.min.x;
  t.diagnostic(JSON.stringify({visibleWalkingEnvelope: {min: envelope.min.toArray(), max: envelope.max.toArray(), width}, minimumGap, castleIntrusions: intrusions}));
  assert.ok(minimumGap >= -.005, 'Real boot penetration: ' + minimumGap);
  assert.equal(intrusions, 0); assert.ok(width < 24.1, 'Walking body width exceeds unchanged proxy width: ' + width);
  assert.equal(CYBORG_BODY_FIT.scaleY, 32); assert.equal(CYBORG_BODY_FIT.scaleZ, 22);
});

test('visible palm reaches the unchanged physical marker at the existing contact event without changing limb scale', () => {
  assert.equal(attackDelay('impact'), .7);
  for (const goal of [[0, 9, 9], [0, 11, 12], [0, 4, 11], [0, 16, 7]]) {
    const city = build(); place(city, 0, 0); animateCity(city, 0, false);
    city.strikeTime = 0; city.strikeTarget = new T.Vector3(...goal);
    let maxError = 0;
    for (let i = 1; i <= 38; i++) {
      const time = i * .025; animateCity(city, time, false);
      if (time >= .7 && time <= .92) {
        assert.ok(city.strikeContactError < 1e-8, 'Original marker changed'); maxError = Math.max(maxError, city.meshyCarrier.metrics.visibleStrikeError);
        assert.deepEqual(city.meshyCarrier.arm.upper.scale.toArray(), [1, 1, 1]); assert.deepEqual(city.meshyCarrier.arm.lower.scale.toArray(), [1, 1, 1]);
      }
    }
    assert.ok(maxError < .025, 'Visible imported contact miss for ' + goal + ': ' + maxError);
  }
});

test('rendered wrist castings overlap both exact hand hulls throughout idle, walking, and strikes', async t => {
  const fixture = await carrierSculptFixture('cyborg'); fixture.gltf.scene.updateMatrixWorld(true);
  const city = build(), mesh = city.meshyCarrier.renderMeshes[0], geometry = mesh.geometry;
  const position = geometry.attributes.position, skin = geometry.attributes.skinIndex, weight = geometry.attributes.skinWeight;
  const parts = geometry.userData.foundryCyborg.parts, drawn = new Set(geometry.index.array);
  const key = i => ['position', 'skinIndex', 'skinWeight'].flatMap(name => Array.from({length: geometry.attributes[name].itemSize}, (_, k) => geometry.attributes[name].getComponent(i, k))).join(',');
  const visibleCopies = new Map();
  for (const i of drawn) if (i >= geometry.userData.sourceContactVertices + geometry.userData.foundryCyborg.authoredVertices) visibleCopies.set(key(i), i);
  const vertex = i => new T.Vector3().fromBufferAttribute(position, i);
  const eachTriangle = (part, visit) => {for (let i = part.firstVertex; i < part.firstVertex + part.vertices; i += 3) visit(new T.Triangle(vertex(i), vertex(i + 1), vertex(i + 2)));};
  // Count unique crossings of the real closed triangle surface. This detects
  // a missing or shortened connector, unlike checking hypothetical radii.
  const inside = (part, point) => {
    const ray = new T.Ray(point, new T.Vector3(.6123, .4871, .9317).normalize()), hit = new T.Vector3(), crossings = [];
    eachTriangle(part, triangle => {if (ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, hit)) crossings.push(hit.distanceTo(point));});
    crossings.sort((a, b) => a - b);
    return crossings.filter((d, i) => d > 1e-8 && (i === 0 || d - crossings[i - 1] > 1e-7)).length % 2 === 1;
  };
  const boneMatrix = index => new T.Matrix4().copy(mesh.matrixWorld).multiply(mesh.bindMatrixInverse).multiply(mesh.skeleton.bones[index].matrixWorld).multiply(mesh.skeleton.boneInverses[index]).multiply(mesh.bindMatrix);
  const wrists = ['Left', 'Right'].map(side => {
    const foreIndex = fixture.mesh.skeleton.bones.findIndex(b => b.name === 'mixamorig' + side + 'ForeArm');
    const handIndex = fixture.mesh.skeleton.bones.findIndex(b => b.name === 'mixamorig' + side + 'Hand');
    const toMesh = fixture.mesh.matrixWorld.clone().invert();
    const a = fixture.mesh.skeleton.bones[foreIndex].getWorldPosition(new T.Vector3()).applyMatrix4(toMesh);
    const b = fixture.mesh.skeleton.bones[handIndex].getWorldPosition(new T.Vector3()).applyMatrix4(toMesh), axis = b.clone().sub(a).normalize();
    const findPart = (role, bone) => {
      const part = parts.find(p => p.role === side + ' ' + role); assert.ok(part, side + ': missing rendered ' + role);
      assert.ok(part.vertices > 0 && part.vertices % 3 === 0);
      for (let i = part.firstVertex; i < part.firstVertex + part.vertices; i++) {
        assert.ok(drawn.has(i), role + ' must be visible triangles, not the hidden source pool');
        assert.equal(skin.getX(i), bone); assert.equal(weight.getX(i), 1);
        assert.equal(weight.getY(i) + weight.getZ(i) + weight.getW(i), 0);
      }
      return part;
    };
    const casting = findPart('forearm casting', foreIndex), sleeve = findPart('wrist sleeve', foreIndex), bearing = findPart('wrist bearing', handIndex);
    const extent = part => {
      let min = Infinity, max = -Infinity;
      for (let i = part.firstVertex; i < part.firstVertex + part.vertices; i++) {const d = vertex(i).sub(a).dot(axis); min = Math.min(min, d); max = Math.max(max, d);}
      return {min, max};
    };
    const castExtent = extent(casting), sleeveExtent = extent(sleeve);
    const low = Math.max(castExtent.min, sleeveExtent.min), high = Math.min(castExtent.max, sleeveExtent.max);
    assert.ok(high > low, side + ': forearm and sleeve have no axial overlap');
    const castingOverlap = a.clone().addScaledVector(axis, (low + high) / 2);
    assert.ok(inside(casting, castingOverlap) && inside(sleeve, castingOverlap), side + ': sleeve is disconnected from the forearm casting');
    // Derive the guaranteed inner radius from the actual bearing triangles.
    // The hull must intersect this solid volume, even between sphere vertices.
    assert.ok(inside(bearing, b), side + ': wrist pivot is outside its rendered bearing');
    let innerRadius = Infinity;
    eachTriangle(bearing, triangle => {if (triangle.getArea() > 1e-12) innerRadius = Math.min(innerRadius, Math.abs(triangle.getPlane(new T.Plane()).distanceToPoint(b)));});
    const sleeveProbe = a.clone().addScaledVector(axis, sleeveExtent.max - Math.min(innerRadius * .3, (sleeveExtent.max - sleeveExtent.min) * .2));
    assert.ok(inside(sleeve, sleeveProbe), side + ': bearing probe misses the actual sleeve');
    const hull = CYBORG_CONTACT_HULLS[side.toLowerCase() + 'Hand'];
    const visibleIds = new Map(hull.vertexIndices.map(id => {
      const visible = visibleCopies.get(key(id)); assert.ok(visible !== undefined && drawn.has(visible), side + ': exact original hull vertex is not drawn');
      return [id, visible];
    }));
    return {side, b, foreIndex, handIndex, bearing, sleeveProbe, innerRadius, hull, visibleIds, maxPivotSeparation: 0, minimumHandOverlap: Infinity};
  });
  let poses = 0;
  const verify = label => {
    poses++;
    for (const wrist of wrists) {
      const fore = boneMatrix(wrist.foreIndex), hand = boneMatrix(wrist.handIndex), inverse = hand.clone().invert();
      const pivotGap = wrist.b.clone().applyMatrix4(fore).distanceTo(wrist.b.clone().applyMatrix4(hand));
      wrist.maxPivotSeparation = Math.max(wrist.maxPivotSeparation, pivotGap);
      assert.ok(pivotGap < 1e-5, label + ': ' + wrist.side + ' pivots separate');
      const probe = wrist.sleeveProbe.clone().applyMatrix4(fore).applyMatrix4(inverse);
      assert.ok(inside(wrist.bearing, probe), label + ': ' + wrist.side + ' sleeve is outside its moving bearing');
      const points = new Map([...wrist.visibleIds].map(([source, visible]) => [source, mesh.getVertexPosition(visible, new T.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse)]));
      const triangle = new T.Triangle(), nearest = new T.Vector3(); let distance = Infinity;
      for (let i = 0; i < wrist.hull.triangleIndices.length; i += 3) {
        triangle.set(...wrist.hull.triangleIndices.slice(i, i + 3).map(id => points.get(id)));
        triangle.closestPointToPoint(wrist.b, nearest); distance = Math.min(distance, nearest.distanceTo(wrist.b));
      }
      const overlap = wrist.innerRadius - distance; wrist.minimumHandOverlap = Math.min(wrist.minimumHandOverlap, overlap);
      assert.ok(overlap > 1e-4, label + ': ' + wrist.side + ' visible hand hull disconnects from bearing: ' + overlap);
    }
  };
  for (let i = 0; i < 12; i++) {place(city, 0, 0); animateCity(city, i / 30, false); verify('idle ' + i);}
  for (let i = 0; i < 160; i++) {place(city, 0, i * .35); animateCity(city, 1 + i / 30, true); verify('walk ' + i);}
  for (const [j, goal] of [[0, 9, 9], [0, 11, 12], [0, 4, 11], [0, 16, 7]].entries()) {
    const start = 7 + j * 2; place(city, 0, 0); city.strikeTime = start; city.strikeTarget = new T.Vector3(...goal);
    for (let i = 0; i <= 38; i++) {animateCity(city, start + i * .025, false); verify('strike ' + j + '/' + i);}
  }
  t.diagnostic(JSON.stringify({wristContinuity: {poses, wrists: wrists.map(w => ({side: w.side, actualBearingInnerRadius: w.innerRadius, minimumHandOverlap: w.minimumHandOverlap, maximumPivotSeparationMetres: w.maxPivotSeparation}))}}));
});

test('repeated paused evaluation cannot accumulate imported IK or spine bends; temporary pose skeleton is released', () => {
  const city = build(); place(city, 0, 0); animateCity(city, 0, false); city.strikeTime = 0; city.strikeTarget = new T.Vector3(0, 9, 9); animateCity(city, .75, false);
  const bones = city.meshyCarrier.renderMeshes[0].skeleton.bones, first = bones.flatMap(bone => bone.matrixWorld.elements);
  const marker = city.strikeHand.getWorldPosition(new T.Vector3());
  for (let i = 0; i < 10; i++) animateCity(city, .75, false);
  assertArrayClose(bones.flatMap(bone => bone.matrixWorld.elements), first, 1e-8); assert.ok(marker.distanceTo(city.strikeHand.getWorldPosition(new T.Vector3())) < 1e-10);
  const count = meshyCarriersStatus().activeInstances; assert.equal(count % 2, 0);
  close(city); cities.splice(cities.indexOf(city), 1); assert.equal(meshyCarriersStatus().activeInstances, count - 2);
});

test('the requested multi-stride clip closes onto its original first upper-body pose without editing source keys', () => {
  const city = build(); place(city, 0, 0); animateCity(city, 0, true);
  const adapter = city.meshyCarrier, hand = adapter.arm.hand, hips = adapter.instance.body.getObjectByName('mixamorigHips');
  const firstHand = hand.quaternion.clone(), firstHips = hips.position.clone();
  const keys = adapter.poseInstance.clip.tracks.map(track => Array.from(track.values));
  for (let i = 1; i <= 120; i++) {place(city, 0, adapter.strideDistance * (1 - 1e-7) * i / 120); animateCity(city, i / 30, true);}
  assert.ok(adapter.metrics.phase > .99999); assert.ok(firstHand.angleTo(hand.quaternion) < 1e-7); assert.ok(firstHips.distanceTo(hips.position) < 1e-8);
  assert.deepEqual(adapter.poseInstance.clip.tracks.map(track => Array.from(track.values)), keys);
});

test('native Grove to Foundry routes settle both complete boot hulls, including shin-weighted toes, at 15/30/60 Hz', () => {
  for (const hz of [15, 30, 60]) {
    const city = build(), state = createGame('kaiju', 'cyborg'), adapter = city.meshyCarrier, mesh = adapter.renderMeshes[0];
    const position = mesh.geometry.attributes.position, skin = mesh.geometry.attributes.skinIndex, weight = mesh.geometry.attributes.skinWeight;
    const boots = ['Left', 'Right'].map(side => {
      const joints = new Set(mesh.skeleton.bones.flatMap((bone, index) => bone.name.startsWith('mixamorig' + side) && /Leg|Foot|Toe/.test(bone.name) ? [index] : []));
      const indices = [];
      for (let i = 0; i < position.count; i++) {
        let total = 0; for (let k = 0; k < 4; k++) if (joints.has(skin.getComponent(i, k))) total += weight.getComponent(i, k);
        if (total > .4 && position.getY(i) < .23) indices.push(i);
      }
      assert.ok(indices.length > 400, 'Include the full boot: this source left toe is weighted to its shin');
      const z = indices.map(i => position.getZ(i)), x = indices.map(i => position.getX(i));
      return {indices, middle: (Math.min(...z) + Math.max(...z)) / 2, across: (Math.min(...x) + Math.max(...x)) / 2};
    });
    const update = () => {place(city, state.x, state.z, state.angle); animateCity(city, state.time, state.moving); city.root.updateMatrixWorld(true);};
    const support = () => boots.map(boot => {
      const vertex = new T.Vector3(); let front = Infinity, rear = Infinity, left = Infinity, right = Infinity;
      for (const index of boot.indices) {
        mesh.getVertexPosition(index, vertex); vertex.applyMatrix4(mesh.matrixWorld);
        const gap = vertex.y - renderedTerrainHeight(vertex.x, vertex.z);
        if (position.getZ(index) < boot.middle) rear = Math.min(rear, gap); else front = Math.min(front, gap);
        if (position.getX(index) < boot.across) left = Math.min(left, gap); else right = Math.min(right, gap);
      }
      return {front, rear, left, right};
    });
    const verifySupport = label => {
      for (const foot of support()) {
        assert.ok(Math.min(foot.front, foot.rear) >= -.005 && Math.min(foot.front, foot.rear) < .025, label + ': real boot must touch without penetrating: ' + JSON.stringify(foot));
        assert.ok(Math.max(foot.front, foot.rear) < .4, label + ': boot must not remain perched on a toe/heel above the ground: ' + JSON.stringify(foot));
        assert.ok(Math.max(foot.left, foot.right) < .4, label + ': both sides of the boot need support: ' + JSON.stringify(foot));
      }
      const ankles = adapter.feet.map(foot => adapter.instance.root.worldToLocal(foot.foot.getWorldPosition(new T.Vector3())));
      assert.ok(Math.abs(ankles[0].x - ankles[1].x) > .45, label + ': resting feet must retain a separated weight-bearing stance');
    };
    const settle = () => {for (let i = 0; i < hz * 2; i++) {tick(state, 1 / hz); update();}};
    update();
    for (const id of ['forest', 'ruins']) {
      const node = state.nodes.find(node => node.id === id), distance = Math.hypot(state.x - node.x, state.z - node.z);
      // Exact shipped Resource destinations approach offset, then real tick.
      travel(state, node.x + (state.x - node.x) / distance * 22, node.z + (state.z - node.z) / distance * 22);
      let frames = 0; while (state.target && frames++ < hz * 30) {tick(state, 1 / hz); update();}
      assert.equal(state.target, null); assert.equal(state.moving, false);
      assert.ok(adapter.metrics.idleWeight < 1, 'Arrival must begin a blend rather than snap straight to the resting pose');
      const originalPhase = adapter.metrics.phase; settle(); verifySupport(id + ' at ' + hz + ' Hz');
      assert.equal(adapter.metrics.phase, originalPhase, 'Resting-pose blend must not advance original walk travel');
    }
    for (const turn of [Math.PI / 2, Math.PI / 2]) {state.angle += turn; tick(state, 1 / hz); update(); settle(); verifySupport('Foundry turn at ' + hz + ' Hz');}
    travel(state, state.x + 15, state.z + 10);
    for (let i = 0; i < hz; i++) {tick(state, 1 / hz); update();}
    assert.equal(adapter.metrics.idleWeight, 0, 'Ordinary movement must return completely to the original distance-driven clip');
  }
});
