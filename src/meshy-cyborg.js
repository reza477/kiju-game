import * as T from '../vendor/three.module.js';
import {instantiateMeshyCarrier, meshyCarriersStatus, updateMeshyCarrier, disposeMeshyCarrier, markMeshyCarrierPose} from './meshy-carriers.js';
import {renderedTerrainHeight, terrainNormal} from './terrain.js';

// The existing city rig remains the authority for the deck, harness, guns,
// physical strike marker and event timing. This adapter adjusts only the skin.
export const CYBORG_BODY_FIT = Object.freeze({scaleX: 24, scaleY: 32, scaleZ: 22, x: -1.125, y: 0, z: .3, yaw: 0});
const CLIP = 'Casual_Walk', HIP = 'mixamorigHips', profiles = new WeakMap();
const ease = (a, b, x) => {const t = T.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t);};
const bone = (instance, name) => {const value = instance.body.getObjectByName('mixamorig' + name); if (!value?.isBone) throw new Error('Inspected cyborg rig lacks ' + name); return value;};
const point = object => object.getWorldPosition(new T.Vector3());
const clipOptions = strideDistance => ({clipName: CLIP, rootMotionNode: HIP, strideDistance});

export const meshyCyborgReady = () => meshyCarriersStatus().assets.find(asset => asset.kind === 'cyborg')?.state === 'ready';

function soleIndices(mesh, side) {
  const skin = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight, position = mesh.geometry.attributes.position;
  const joints = new Set(mesh.skeleton.bones.map((b, i) => b.name.startsWith('mixamorig' + side) && /Leg|Foot|Toe/.test(b.name) ? i : -1)); joints.delete(-1);
  const candidates = [], p = new T.Vector3();
  for (let i = 0; i < position.count; i++) {
    let influence = 0;
    for (let k = 0; k < 4; k++) if (joints.has(skin.getComponent(i, k))) influence += weights.getComponent(i, k);
    if (influence > .4 && position.getY(i) < .4) candidates.push({index: i, y: position.getY(i)});
  }
  if (!candidates.length) throw new Error('Inspected cyborg lacks weighted ' + side + ' sole vertices');
  const unique = new Map();
  for (const item of candidates) {p.fromBufferAttribute(position, item.index); unique.set(p.toArray().map(n => n.toFixed(5)).join(','), item.index);}
  const indices = [...unique.values()];
  // Bounded real skin vertices per foot. Keep actual 3D boundary extrema,
  // not an invisible box whose flat bottom could hide a penetrating boot.
  const chosen = new Set();
  for (let a = 0; a < 16; a++) for (const y of [-1, 0, 1]) {
    let best = null, score = -Infinity;
    for (const index of indices) {const value = Math.cos(a * Math.PI / 8) * position.getX(index) + y * position.getY(index) + Math.sin(a * Math.PI / 8) * position.getZ(index); if (value > score) {score = value; best = index;}}
    if (best !== null) chosen.add(best);
  }
  indices.sort((a, b) => position.getY(a) - position.getY(b));
  for (const index of indices) {if (chosen.size >= 48) break; chosen.add(index);}
  return [...chosen];
}

function sampleSole(mesh, indices, height = () => 0, dx = 0, dz = 0) {
  const p = new T.Vector3(); let gap = Infinity;
  for (const index of indices) {mesh.getVertexPosition(index, p); p.applyMatrix4(mesh.matrixWorld); gap = Math.min(gap, p.y - height(p.x + dx, p.z + dz));}
  return gap;
}

function profileFor(probe) {
  let mesh; probe.body.traverse(object => {if (object.isSkinnedMesh) {if (mesh) throw new Error('Cyborg adapter requires the inspected single skinned body'); mesh = object;}});
  if (!mesh) throw new Error('Cyborg adapter requires the inspected skinned body');
  if (profiles.has(mesh.geometry)) return profiles.get(mesh.geometry);
  const feet = ['Left', 'Right'].map(side => ({side, indices: soleIndices(mesh, side), foot: bone(probe, side + 'Foot'), samples: [], minimum: Infinity}));
  const duration = probe.clip.duration, count = 120, step = duration / count;
  for (let i = 0; i <= count; i++) {
    probe.mixer.setTime(Math.min(duration - 1e-6, i * step)); probe.root.updateMatrixWorld(true);
    for (const foot of feet) {const sample = {height: sampleSole(mesh, foot.indices), z: point(foot.foot).z}; foot.samples.push(sample); foot.minimum = Math.min(foot.minimum, sample.height);}
  }
  const velocities = [];
  for (const foot of feet) for (let i = 1; i < count; i++) {
    const backward = (foot.samples[i - 1].z - foot.samples[i + 1].z) / (2 * step);
    if (foot.samples[i].height < foot.minimum + .045 && backward > .1 && backward < 2) velocities.push(backward);
  }
  if (velocities.length < 8) throw new Error('Cannot measure a grounded stride from inspected Casual_Walk');
  velocities.sort((a, b) => a - b);
  // This double-support moment in the original Casual_Walk has both real
  // boot hulls down. An arbitrary frozen walk phase can balance on its toes;
  // ankle-only correction also misses this export's shin-weighted left boot.
  const idlePhase = .675;
  probe.mixer.setTime(duration * idlePhase); probe.root.updateMatrixWorld(true);
  const idlePose = poseSnapshot(probe.body).map(({object, position, quaternion, scale}) => ({name: object.name, position, quaternion, scale}));
  // The exported boots have asymmetric weights. Use the right leg's planted
  // moment from a later stride of that same clip, instead of flattening a
  // shin-weighted boot by twisting its ankle or changing imported skin data.
  const idleRightPhase = 110 / 120;
  probe.mixer.setTime(duration * idleRightPhase);
  for (const pose of idlePose) if (pose.name.startsWith('mixamorigRight') && /Leg|Foot|Toe/.test(pose.name)) {
    const source = probe.body.getObjectByName(pose.name); pose.position.copy(source.position); pose.quaternion.copy(source.quaternion); pose.scale.copy(source.scale);
  }
  const profile = {duration, count, sourceDistance: velocities[Math.floor(velocities.length / 2)] * duration, stanceSamples: velocities.length, idlePhase, idleRightPhase, idlePose,
    feet: feet.map(({side, indices, samples, minimum}) => ({side, indices, samples, minimum}))};
  profiles.set(mesh.geometry, profile); return profile;
}

function poseSnapshot(body) {const poses = []; body.traverse(object => {if (object.isBone) poses.push({object, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone()});}); return poses;}

export function createMeshyCyborg(rig, {instantiate = instantiateMeshyCarrier, cityScale = .55} = {}) {
  const probe = instantiate('cyborg', clipOptions(1)); let profile;
  try {profile = profileFor(probe);} finally {disposeMeshyCarrier(probe);}
  const strideDistance = profile.sourceDistance * CYBORG_BODY_FIT.scaleZ * cityScale;
  const instance = instantiate('cyborg', clipOptions(strideDistance));
  // Keep an unmodified pose evaluator. Three skips assigning unchanged track
  // values, so rewinding the visible mixer's clock alone cannot undo prior IK
  // on a paused/idle frame. This second skeleton shares every heavy resource.
  const poseInstance = instantiate('cyborg', clipOptions(strideDistance));
  const posePairs = []; instance.body.traverse(object => {if (object.isBone) posePairs.push([object, poseInstance.body.getObjectByName(object.name)]);});
  const idlePose = profile.idlePose.map(pose => ({...pose, object: instance.body.getObjectByName(pose.name)}));
  const rest = poseSnapshot(instance.body), feet = profile.feet.map(foot => ({...foot, upper: bone(instance, foot.side + 'UpLeg'), lower: bone(instance, foot.side + 'Leg'), foot: bone(instance, foot.side + 'Foot'), plant: null}));
  // Existing positive-X strike side is Meshy's named Left arm. The source's
  // named Right arm lies on negative X; never infer side from its English name.
  const arm = {upper: bone(instance, 'LeftArm'), lower: bone(instance, 'LeftForeArm'), hand: bone(instance, 'LeftHand')};
  // Inspected vertex 5065 lies on the palm/knuckle surface and is weighted
  // solely to LeftHand (.6325766) and its Middle4 child (.3674234). The bone
  // endpoint is inside the palm, so an arbitrary fraction of it is not contact.
  const knuckle = new T.Object3D(); knuckle.name = 'Imported cyborg visible palm contact'; arm.hand.add(knuckle); arm.knuckle = knuckle; arm.contactVertex = 5065;
  const renderMeshes = []; instance.body.traverse(object => {if (object.isSkinnedMesh) renderMeshes.push(object);});
  const surface = new T.Vector3(); renderMeshes[0].getVertexPosition(arm.contactVertex, surface); surface.applyMatrix4(renderMeshes[0].matrixWorld); arm.knuckle.position.copy(arm.hand.worldToLocal(surface));
  instance.root.scale.set(CYBORG_BODY_FIT.scaleX, CYBORG_BODY_FIT.scaleY, CYBORG_BODY_FIT.scaleZ); instance.root.position.set(CYBORG_BODY_FIT.x, CYBORG_BODY_FIT.y, CYBORG_BODY_FIT.z); instance.root.rotation.y = CYBORG_BODY_FIT.yaw; rig.add(instance.root);
  return {kind: 'cyborg', instance, poseInstance, posePairs, idlePose, motion: {time: null, idle: 0, heading: null, moving: null}, controller: {dispose: () => disposeMeshyCarrier(poseInstance)}, profile, rest, feet, arm, spine: bone(instance, 'Spine'), renderMeshes, previous: null, strideDistance,
    metrics: {clip: CLIP, sourceDistance: profile.sourceDistance, strideDistance, stanceSamples: profile.stanceSamples, phase: 0, minimumFootGap: null, visibleStrikeError: null, unreachableStrike: false}};
}

function relativeQuaternion(object, space) {
  const rotation = new T.Quaternion();
  for (let node = object; node && node !== space; node = node.parent) rotation.premultiply(node.quaternion);
  return rotation;
}

function spaceRotate(object, delta, space) {
  const parent = relativeQuaternion(object.parent, space), world = relativeQuaternion(object, space);
  object.quaternion.copy(parent.invert()).multiply(delta).multiply(world); object.updateWorldMatrix(false, true);
}

// Two-bone correction uses each imported chain's measured length and bind axes.
// It never stretches the skin, changes the old physical rig or moves its marker.
function solveChain(upper, lower, effector, worldTarget, space) {
  const local = object => space.worldToLocal(point(object)), target = space.worldToLocal(worldTarget.clone());
  const start = local(upper), elbow = local(lower), end = local(effector), a = elbow.clone().sub(start), b = end.clone().sub(elbow);
  const l1 = a.length(), l2 = b.length(), line = target.clone().sub(start), raw = line.length();
  if (raw < 1e-7 || l1 < 1e-7 || l2 < 1e-7) return Infinity;
  const distance = T.MathUtils.clamp(raw, Math.abs(l1 - l2) + 1e-5, l1 + l2 - 1e-5), direction = line.multiplyScalar(1 / raw);
  let bend = a.clone().addScaledVector(direction, -a.dot(direction));
  if (bend.lengthSq() < 1e-8) bend = new T.Vector3(0, 0, 1).addScaledVector(direction, -direction.z);
  if (bend.lengthSq() < 1e-8) bend.set(1, 0, 0);
  bend.normalize();
  const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance), desiredElbow = direction.clone().multiplyScalar(along).addScaledVector(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
  spaceRotate(upper, new T.Quaternion().setFromUnitVectors(a.normalize(), desiredElbow.normalize()), space);
  const currentLower = local(effector).sub(local(lower)), desiredLower = target.clone().sub(local(lower));
  spaceRotate(lower, new T.Quaternion().setFromUnitVectors(currentLower.normalize(), desiredLower.normalize()), space);
  return point(effector).distanceTo(worldTarget);
}

function closeCycle(adapter, phase) {
  // Source is untouched. The last .18 seconds blend to its exact first pose;
  // its left foot otherwise jumps 10.30 degrees at the 4.2083-second seam.
  const blend = ease(1 - .18 / adapter.profile.duration, 1, phase);
  if (!blend) return;
  for (const pose of adapter.rest) {pose.object.position.lerp(pose.position, blend); pose.object.quaternion.slerp(pose.quaternion, blend); pose.object.scale.lerp(pose.scale, blend);}
}

function leanForContact(adapter, worldTarget, weight) {
  const space = adapter.instance.root, spine = adapter.spine, original = spine.quaternion.clone();
  const target = space.worldToLocal(worldTarget.clone()), base = space.worldToLocal(point(spine));
  const horizontal = target.clone().sub(base); horizontal.y = 0;
  if (horizontal.lengthSq() < 1e-8) return 0;
  const axis = new T.Vector3(0, 1, 0).cross(horizontal.normalize()).normalize();
  const reachError = () => {
    const upper = space.worldToLocal(point(adapter.arm.upper)), lower = space.worldToLocal(point(adapter.arm.lower)), hand = space.worldToLocal(point(adapter.arm.knuckle));
    return Math.max(0, target.distanceTo(upper) - upper.distanceTo(lower) - lower.distanceTo(hand) + .0001);
  };
  let bestAngle = 0, bestError = reachError();
  if (bestError > 0) for (let step = 1; step <= 32; step++) {
    const angle = step / 32 * 1.05 * weight;
    spine.quaternion.copy(original); spine.updateWorldMatrix(false, true);
    spaceRotate(spine, new T.Quaternion().setFromAxisAngle(axis, angle), space);
    const error = reachError();
    if (error < bestError) {bestError = error; bestAngle = angle;}
    if (error === 0) break;
  }
  spine.quaternion.copy(original); spine.updateWorldMatrix(false, true);
  if (bestAngle) spaceRotate(spine, new T.Quaternion().setFromAxisAngle(axis, bestAngle), space);
  return bestAngle;
}

export function animateMeshyCyborg(city, time, moving, {height = renderedTerrainHeight, normal = terrainNormal} = {}) {
  const adapter = city.meshyCarrier; if (!adapter || adapter.kind !== 'cyborg') return;
  const instance = adapter.instance, current = point(city.root), previous = adapter.previous;
  const distance = previous ? Math.hypot(current.x - previous.x, current.z - previous.z) : 0;
  adapter.previous = current;
  const phase = updateMeshyCarrier(adapter.poseInstance, {time, moving, distanceDelta: distance < 8 ? distance : 0}) ?? 0; adapter.metrics.phase = phase;
  // Re-evaluate even when standing: previous frame's IK must not feed back
  // into the source pose. This does not advance the paused animation clock.
  for (const [target, source] of adapter.posePairs) {target.position.copy(source.position); target.quaternion.copy(source.quaternion); target.scale.copy(source.scale);}
  closeCycle(adapter, phase);
  const motion = adapter.motion, previousIdle = motion.idle, elapsed = motion.time === null ? 0 : Math.max(0, time - motion.time);
  const turned = motion.heading !== null && Math.abs(Math.atan2(Math.sin(city.heading - motion.heading), Math.cos(city.heading - motion.heading))) > .18;
  const changed = motion.moving !== null && motion.moving !== moving;
  if (motion.time === null) motion.idle = moving ? 0 : 1;
  else motion.idle = T.MathUtils.clamp(motion.idle + (moving ? -1 : 1) * elapsed / .4, 0, 1);
  const idleWeight = ease(0, 1, motion.idle);
  for (const pose of adapter.idlePose) {pose.object.position.lerp(pose.position, idleWeight); pose.object.quaternion.slerp(pose.quaternion, idleWeight); pose.object.scale.lerp(pose.scale, idleWeight);}
  // Release only visual foot plants when the carrier turns or changes gait.
  // During the short source-pose blend, support follows that changing stance;
  // the final resting contacts then remain planted in world space.
  if (turned || changed || motion.idle !== previousIdle) for (const foot of adapter.feet) foot.plant = null;
  motion.time = time; motion.heading = city.heading; motion.moving = moving;
  adapter.metrics.idleWeight = idleWeight;
  instance.root.position.set(CYBORG_BODY_FIT.x, CYBORG_BODY_FIT.y, CYBORG_BODY_FIT.z); city.root.updateMatrixWorld(true);
  const mesh = adapter.renderMeshes[0], worldScale = instance.root.getWorldScale(new T.Vector3()).y;
  let minimumFootGap = Infinity;
  for (const foot of adapter.feet) {
    const sample = foot.samples[Math.min(adapter.profile.count, Math.floor(phase * adapter.profile.count))];
    const next = foot.samples[Math.min(adapter.profile.count, Math.floor(phase * adapter.profile.count) + 1)];
    const stance = !moving || idleWeight > .5 || sample.height < foot.minimum + .045 && next.z <= sample.z;
    const lift = stance ? 0 : Math.max(0, sample.height - foot.minimum - .025) * worldScale * (1 - idleWeight);
    const ankle = point(foot.foot);
    if (!stance || distance >= 8) foot.plant = null;
    if (stance && !foot.plant) {
      const n = normal(ankle.x, ankle.z), tilt = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(n.x, n.y, n.z));
      foot.plant = {x: ankle.x, z: ankle.z, quaternion: tilt.multiply(foot.foot.getWorldQuaternion(new T.Quaternion()))};
    }
    const target = ankle.clone(); if (foot.plant) {target.x = foot.plant.x; target.z = foot.plant.z;}
    for (let iteration = 0; iteration < 5; iteration++) {
      const actual = point(foot.foot), gap = sampleSole(mesh, foot.indices, height, target.x - actual.x, target.z - actual.z);
      target.y = actual.y - gap + lift + .003;
      solveChain(foot.upper, foot.lower, foot.foot, target, instance.root);
      if (foot.plant) {const parent = foot.foot.parent.getWorldQuaternion(new T.Quaternion()); foot.foot.quaternion.copy(parent.invert()).multiply(foot.plant.quaternion);}
      instance.root.updateMatrixWorld(true);
    }
    foot.contact = stance; foot.contactTarget = target;
    minimumFootGap = Math.min(minimumFootGap, sampleSole(mesh, foot.indices, height));
  }
  // The retargeted export has slightly asymmetric boot heights. Settle its
  // visible body on the lowest supported boot after IK; leave the city rig and
  // its fixed attachment/weapon points exactly where the original solver put it.
  const supportCorrection = T.MathUtils.clamp(.003 - minimumFootGap, -1.2, 1.2);
  const supported = point(instance.root); supported.y += supportCorrection;
  instance.root.position.copy(instance.root.parent.worldToLocal(supported)); instance.root.updateMatrixWorld(true);
  adapter.metrics.bodySupportCorrection = supportCorrection;
  adapter.metrics.minimumFootGap = Math.min(...adapter.feet.map(foot => sampleSole(mesh, foot.indices, height)));
  const age = time - city.strikeTime, contact = city.strikeContactTime ?? .7, end = city.strikeDuration ?? 1.3;
  const active = age >= 0 && age < end && city.strikeTarget?.isVector3 && city.strikeHand;
  adapter.metrics.visibleStrikeError = null; adapter.metrics.unreachableStrike = false;
  if (active) {
    const surface = new T.Vector3(); mesh.getVertexPosition(adapter.arm.contactVertex, surface); surface.applyMatrix4(mesh.matrixWorld);
    adapter.arm.knuckle.position.copy(adapter.arm.hand.worldToLocal(surface)); adapter.arm.knuckle.updateWorldMatrix(false, false);
    const weight = ease(.14, .55, age) * (1 - ease(contact + .22, end, age)), physicalTarget = point(city.strikeHand);
    adapter.metrics.strikeLean = leanForContact(adapter, physicalTarget, weight);
    const target = point(adapter.arm.knuckle).lerp(physicalTarget, weight);
    const error = solveChain(adapter.arm.upper, adapter.arm.lower, adapter.arm.knuckle, target, instance.root); instance.root.updateMatrixWorld(true);
    mesh.getVertexPosition(adapter.arm.contactVertex, surface); surface.applyMatrix4(mesh.matrixWorld);
    adapter.metrics.visibleStrikeError = surface.distanceTo(point(city.strikeHand));
    adapter.metrics.unreachableStrike = weight > .999 && error > .025;
  }
  markMeshyCarrierPose(instance);
}

export function disposeMeshyCyborg(adapter) {if (adapter) {adapter.controller.dispose(); disposeMeshyCarrier(adapter.instance);}}
