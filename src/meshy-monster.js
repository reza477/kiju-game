import * as T from '../vendor/three.module.js';
import {markMeshyCarrierPose} from './meshy-carriers.js';

// Inspected 54-joint Smart Rig exported from the owner's remeshed monster.
// This asset has a valid skin but no exported clips. This adapter poses only
// its cloned bones; it does not schedule attacks or change actor/game state.
const names = values => values.map(value => 'Bone_' + String(value).padStart(3, '0'));
export const MONSTER_RIG = Object.freeze({
  frontLeft: Object.freeze(names([35, 34, 33, 32])),
  frontRight: Object.freeze(names([40, 39, 38, 37])),
  rearLeft: Object.freeze(names([5, 4, 28, 27, 26, 25])),
  rearRight: Object.freeze(names([3, 2, 22, 21, 20, 19])),
  tail: Object.freeze(names([16, 15, 14, 13, 12, 11, 10]))
});
const offsets = {frontLeft: 0, frontRight: .5, rearLeft: .75, rearRight: .25};
const tailAngles = [-115, -85, -55, -20, 35, 80].map(degrees => degrees * Math.PI / 180);
const mod = value => ((value % 1) + 1) % 1;
const smooth = value => value * value * (3 - 2 * value);

export function inspectMeshyMonsterRig(instance) {
  if (!instance?.body?.isObject3D || !instance.root?.isObject3D) throw new Error('Monster pose requires an imported carrier instance');
  const bones = new Map(), meshes = [];
  instance.body.traverse(object => {if (object.isBone) bones.set(object.name, object); if (object.isSkinnedMesh) meshes.push(object);});
  if (meshes.length !== 1 || bones.size !== 54 || instance.capabilities?.animations?.length) throw new Error('Monster pose requires the inspected 54-joint static Smart Rig');
  for (const chain of Object.values(MONSTER_RIG)) for (let i = 0; i < chain.length; i++) {
    if (!bones.has(chain[i]) || i && bones.get(chain[i]).parent !== bones.get(chain[i - 1])) throw new Error('Monster chain differs from the inspected rig: ' + chain[i]);
  }
  if (bones.get('Bone_040').parent?.name !== 'Bone_041') throw new Error('Monster strike requires its inspected scapula joint');
  if (!meshes[0].geometry.attributes.skinIndex || !meshes[0].geometry.attributes.skinWeight) throw new Error('Monster pose requires original skin weights');
  return {bones, mesh: meshes[0]};
}

export function createMeshyMonsterPose(instance, {groundHeight, strideDistance, initialPhase = 0, supportCrouch = 0} = {}) {
  if (typeof groundHeight !== 'function' || !Number.isFinite(strideDistance) || strideDistance <= 0 || !Number.isFinite(initialPhase) || !Number.isFinite(supportCrouch) || supportCrouch < 0 || supportCrouch > .25) throw new Error('Monster pose requires terrain sampling and a positive world stride');
  const {bones, mesh} = inspectMeshyMonsterRig(instance), body = instance.body;
  const inverse = new T.Matrix4(), matrix = new T.Matrix4(), position = new T.Vector3(), scale = new T.Vector3(), quaternion = new T.Quaternion();
  const bodyBone = bones.get('Bone_000'), bodyOrigin = bodyBone.position.clone();
  const rest = new Map([...bones].map(([name, bone]) => [name, bone.quaternion.clone()]));
  const modelPosition = (bone, target) => bone.getWorldPosition(target).applyMatrix4(inverse);
  const modelQuaternion = (bone, target) => {matrix.multiplyMatrices(inverse, bone.matrixWorld); matrix.decompose(position, target, scale); return target;};
  body.updateWorldMatrix(true, true); inverse.copy(body.matrixWorld).invert();
  const tail = MONSTER_RIG.tail.map(name => bones.get(name));
  const skinIndex = mesh.geometry.attributes.skinIndex, skinWeight = mesh.geometry.attributes.skinWeight;
  const legs = Object.entries(MONSTER_RIG).filter(([key]) => key !== 'tail').map(([key, names]) => {
    // The last Smart Rig joint is a toe, not the wrist/hock. Letting FABRIK
    // bend that short paw segment curls the weight-bearing pad into a knuckle.
    // Solve to the paw root and retain the source toe's local resting pose.
    const chain = names.slice(0, -1).map(name => bones.get(name)), end = chain.at(-1), points = chain.map(bone => modelPosition(bone, new T.Vector3()));
    const attackChain = [chain[0].parent, ...chain], attackPoints = attackChain.map(bone => modelPosition(bone, new T.Vector3()));
    const attackLength = attackPoints.slice(1).map((point, i) => point.distanceTo(attackPoints[i]));
    const endRest = points.at(-1).clone(), length = points.slice(1).map((point, i) => point.distanceTo(points[i]));
    const descendants = new Set(); end.traverse(bone => {if (bone.isBone) descendants.add(mesh.skeleton.bones.indexOf(bone));});
    // The actual weighted toe vertices establish sole clearance. Nothing here
    // changes mesh positions, indices, weights, or inverse bind matrices.
    let minY = Infinity, total = 0; const soleVertices = []; const centre = new T.Vector3(), vertex = new T.Vector3();
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      let weight = 0;
      for (let k = 0; k < 4; k++) if (descendants.has(skinIndex.array[i * 4 + k])) weight += skinWeight.array[i * 4 + k];
      if (weight < .4) continue;
      vertex.fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
      minY = Math.min(minY, vertex.y); centre.addScaledVector(vertex, weight); total += weight; soleVertices.push({index: i, point: vertex.clone()});
    }
    if (!total || !Number.isFinite(minY)) throw new Error('Inspected monster paw has no weighted sole: ' + key);
    centre.divideScalar(total); centre.y = minY;
    // Keep unique skin vertices; seam duplicates provide no extra clearance
    // information. The denser source needs a bounded lower-envelope sample.
    const uniqueSole = new Map();
    for (const entry of soleVertices) {
      const identity = [...entry.point.toArray().map(value => value.toFixed(6)), ...Array.from(skinIndex.array.slice(entry.index * 4, entry.index * 4 + 4)), ...Array.from(skinWeight.array.slice(entry.index * 4, entry.index * 4 + 4))].join(':');
      uniqueSole.set(identity, entry.index);
    }
    const samples = new Set();
    const unique = [...uniqueSole.values()], positions = new Map(soleVertices.map(entry => [entry.index, entry.point]));
    if (unique.length <= 160) for (const index of unique) samples.add(index);
    else {
      const bounds = new T.Box3().setFromPoints(unique.map(index => positions.get(index))), size = bounds.getSize(new T.Vector3()), cells = new Map();
      for (const index of unique) {
        const p = positions.get(index), x = Math.min(11, Math.floor((p.x - bounds.min.x) / Math.max(size.x, 1e-8) * 12)), z = Math.min(11, Math.floor((p.z - bounds.min.z) / Math.max(size.z, 1e-8) * 12));
        const cell = x + ',' + z, current = cells.get(cell);
        if (current === undefined || p.y < positions.get(current).y) cells.set(cell, index);
      }
      for (const index of cells.values()) samples.add(index);
      // Retain the true geometric extremes in addition to each ground cell.
      for (const axis of ['x', 'y', 'z']) for (const direction of [-1, 1]) {
        let best = unique[0]; for (const index of unique) if (positions.get(index)[axis] * direction > positions.get(best)[axis] * direction) best = index;
        samples.add(best);
      }
    }
    const tip = soleVertices.reduce((best, entry) => entry.point.z > best.point.z ? entry : best, soleVertices[0]);
    const soleRest = modelPosition(bones.get(names.at(-1)), new T.Vector3()); soleRest.y = minY;
    // Flat paws expose their full width. A small inward plant keeps that width
    // within the unchanged carrier footprint without reshaping the source paw.
    soleRest.x -= Math.sign(soleRest.x) * .02;
    const restOrientation = modelQuaternion(end, new T.Quaternion()), soleOffset = centre.sub(endRest).applyQuaternion(restOrientation.clone().invert());
    return {key, tipIndex: tip.index, tipOffset: tip.point.clone().sub(endRest).applyQuaternion(restOrientation.clone().invert()),
      attack: {chain: attackChain, points: attackPoints, length: attackLength, reach: attackLength.reduce((a, b) => a + b, 0)}, chain, points, length, reach: length.reduce((a, b) => a + b, 0), end, endRest, soleRest, restOrientation, soleOffset,
      samples: [...samples], replanted: false, replantCount: 0, skinClearance: null, lift: 0, settleStart: null, settleLift: 0, phase: mod(initialPhase + offsets[key]), plant: null, swing: null, target: new T.Vector3(), contact: true, error: 0};
  });
  const from = new T.Vector3(), to = new T.Vector3(), direction = new T.Vector3(), worldTarget = new T.Vector3(), modelTarget = new T.Vector3();
  const deltaQ = new T.Quaternion(), parentQ = new T.Quaternion(), oldQ = new T.Quaternion(), footQ = new T.Quaternion(), groundQ = new T.Quaternion();
  const strikeContact = new T.Vector3(), strikeGoal = new T.Vector3(), strikeCorrection = new T.Vector3();
  const scratch = new T.Vector3(), normal = new T.Vector3(), forward = new T.Vector3(), right = new T.Vector3(), basis = new T.Matrix4();
  let lastTime = null, lastHeading = null, phase = mod(initialPhase), disposed = false, lastMoving = false, strikeError = null;
  const stance = .78;

  function align(bone, child, desired) {
    modelPosition(child, from); modelPosition(bone, to); from.sub(to).normalize();
    deltaQ.setFromUnitVectors(from, desired);
    modelQuaternion(bone, oldQ); modelQuaternion(bone.parent, parentQ).invert();
    bone.quaternion.copy(parentQ).multiply(deltaQ).multiply(oldQ).normalize(); bone.updateWorldMatrix(false, true);
  }
  function solve(leg, target, attack = false) {
    if (attack) leg = leg.attack;
    const {chain, points, length} = leg;
    for (let i = 0; i < chain.length; i++) modelPosition(chain[i], points[i]);
    const anchor = points[0].clone(), end = points.at(-1), goal = target.clone();
    const limit = leg.reach * (attack ? .999999 : .999);
    if (anchor.distanceTo(goal) > limit) goal.sub(anchor).setLength(limit).add(anchor);
    for (let iteration = 0; iteration < 96; iteration++) {
      end.copy(goal);
      for (let i = points.length - 2; i >= 0; i--) points[i].sub(points[i + 1]).setLength(length[i]).add(points[i + 1]);
      points[0].copy(anchor);
      for (let i = 1; i < points.length; i++) points[i].sub(points[i - 1]).setLength(length[i - 1]).add(points[i - 1]);
      if (end.distanceToSquared(goal) < 1e-10) break;
    }
    for (let i = 0; i < chain.length - 1; i++) align(chain[i], chain[i + 1], direction.copy(points[i + 1]).sub(points[i]).normalize());
  }
  function height(x, z) {const value = groundHeight(x, z); if (!Number.isFinite(value)) throw new Error('Monster terrain sample is not finite'); return value;}
  function groundFrame(point, heading) {
    // Convert the world support normal and forward vector into unscaled body
    // coordinates before solving. Non-uniform body fitting therefore leaves
    // the true bone lengths and bind data intact.
    const radius = .18;
    normal.set(height(point.x - radius, point.z) - height(point.x + radius, point.z), radius * 2, height(point.x, point.z - radius) - height(point.x, point.z + radius)).normalize();
    normal.applyMatrix3(new T.Matrix3().setFromMatrix4(body.matrixWorld).transpose()).normalize();
    forward.set(Math.sin(heading), 0, Math.cos(heading)).transformDirection(inverse);
    forward.addScaledVector(normal, -forward.dot(normal)).normalize(); right.crossVectors(normal, forward).normalize(); forward.crossVectors(right, normal).normalize();
    basis.makeBasis(right, normal, forward); return groundQ.setFromRotationMatrix(basis);
  }
  function update({time, moving, distanceDelta = 0, heading = 0, strikeHand = null, strikeWeight = 0} = {}) {
    if (disposed) return null;
    if (![time, distanceDelta, heading, strikeWeight].every(Number.isFinite) || distanceDelta < 0 || strikeWeight < 0 || strikeWeight > 1 || strikeHand && !strikeHand.isVector3) throw new Error('Invalid monster pose update');
    if (lastTime !== null && time <= lastTime) return status();
    const elapsed = lastTime === null ? 0 : time - lastTime; lastTime = time;
    const headingJump = lastHeading !== null && Math.abs(Math.atan2(Math.sin(heading - lastHeading), Math.cos(heading - lastHeading))) > .12;
    const teleport = distanceDelta > strideDistance * 2 || headingJump; lastHeading = heading;
    if (moving && elapsed > 0 && !teleport) phase = mod(phase + distanceDelta / strideDistance);
    for (const [name, rotation] of rest) bones.get(name).quaternion.copy(rotation);
    bodyBone.position.copy(bodyOrigin); bodyBone.position.y -= supportCrouch * (1 - strikeWeight / 3);
    body.updateWorldMatrix(true, true); inverse.copy(body.matrixWorld).invert(); mesh.updateMatrixWorld(true);
    // The inspected crest joint tucks the high plates below the unchanged
    // tapered castle foundation. A restrained upper-spine rear accompanies a
    // strike; limb lengths, local attachment positions and scales never change.
    for (const [name, axis, angle] of [['Bone_008', new T.Vector3(1, 0, 0), -.15 * strikeWeight], ['Bone_053', new T.Vector3(1, 0, 0), -.32]]) {
      const part = bones.get(name); modelQuaternion(part, oldQ); modelQuaternion(part.parent, parentQ).invert();
      part.quaternion.copy(parentQ).multiply(deltaQ.setFromAxisAngle(axis, angle)).multiply(oldQ); part.updateWorldMatrix(false, true);
    }
    // Fold the long exported tail beneath the haunches so the visible body
    // remains within the established carrier picking footprint.
    for (let i = 0; i < tail.length - 1; i++) {
      const angle = tailAngles[i], sway = Math.sin(time * .55 + i * .32) * .018;
      direction.set(sway, Math.sin(angle), Math.cos(angle)).normalize(); align(tail[i], tail[i + 1], direction);
    }
    strikeError = null;
    for (const leg of legs) {
      leg.replanted = teleport; if (teleport) leg.replantCount++;
      const nextPhase = mod(phase + offsets[leg.key]), standing = !moving || nextPhase < stance;
      const worldStride = scratch.set(0, 0, 1).applyMatrix4(body.matrixWorld).sub(position.set(0, 0, 0).applyMatrix4(body.matrixWorld)).length();
      const nominalStride = strideDistance / worldStride;
      const nominal = leg.soleRest.clone(); nominal.z += moving ? nominalStride * (stance / 2 - Math.min(nextPhase, stance)) : 0;
      nominal.applyMatrix4(body.matrixWorld);
      const changedMode = Boolean(moving) !== lastMoving;
      if (standing) {
        if (!leg.plant || teleport) leg.plant = {point: (!teleport && leg.swing ? leg.target : nominal).clone(), heading};
        worldTarget.copy(leg.plant.point); leg.swing = null;
      } else {
        if (!leg.swing || teleport || changedMode) leg.swing = (leg.plant?.point || (elapsed > 0 && !changedMode ? leg.target : nominal)).clone();
        leg.plant = null;
        const landing = leg.soleRest.clone(); landing.z += nominalStride * stance / 2; landing.applyMatrix4(body.matrixWorld);
        const fraction = (nextPhase - stance) / (1 - stance);
        worldTarget.copy(leg.swing).lerp(landing, smooth(fraction));
      }
      let lift = standing ? 0 : Math.sin((nextPhase - stance) / (1 - stance) * Math.PI) * .09 * body.getWorldScale(scratch).y;
      if (changedMode && !moving) {leg.settleStart = time; leg.settleLift = leg.lift;}
      if (!moving && leg.settleStart !== null) lift = leg.settleLift * (1 - smooth(T.MathUtils.clamp((time - leg.settleStart) / .22, 0, 1)));
      leg.lift = lift;
      worldTarget.y = height(worldTarget.x, worldTarget.z) + lift + .006;
      const supportHeading = leg.plant?.heading ?? heading;
      const attacking = leg.key === 'frontRight' && strikeHand && strikeWeight > 0;
      footQ.copy(groundFrame(worldTarget, supportHeading)).multiply(leg.restOrientation);
      if (attacking) {
        modelPosition(leg.attack.chain[0], from);
        scratch.copy(strikeHand).applyMatrix4(inverse).sub(from).applyQuaternion(parentQ.copy(groundQ).invert());
        const clawDirection = leg.tipOffset.clone().applyQuaternion(leg.restOrientation);
        const sourcePitch = Math.atan2(clawDirection.y, Math.hypot(clawDirection.x, clawDirection.z));
        const pitch = T.MathUtils.clamp(Math.atan2(scratch.y, Math.hypot(scratch.x, scratch.z)) - sourcePitch, -.65, .65);
        footQ.copy(groundQ).multiply(deltaQ.setFromAxisAngle(new T.Vector3(1, 0, 0), -pitch * strikeWeight)).multiply(leg.restOrientation);
      }
      // Target the weighted sole, not the paw joint above it.
      modelTarget.copy(worldTarget).applyMatrix4(inverse).sub(scratch.copy(leg.soleOffset).applyQuaternion(footQ));
      if (!(leg.key === 'frontRight' && strikeHand && strikeWeight > 0) && modelPosition(leg.chain[0], scratch).distanceTo(modelTarget) > leg.reach * .985) {
        // Existing controls may change heading instantly. A planted paw cannot
        // stay on the old side of an unreachable body. Replant only this visual
        // foot at its neutral reachable position; no actor transform changes.
        worldTarget.copy(leg.soleRest).applyMatrix4(body.matrixWorld); worldTarget.y = height(worldTarget.x, worldTarget.z) + lift + .006;
        footQ.copy(groundFrame(worldTarget, heading)).multiply(leg.restOrientation);
        modelTarget.copy(worldTarget).applyMatrix4(inverse).sub(scratch.copy(leg.soleOffset).applyQuaternion(footQ));
        leg.plant = standing ? {point: worldTarget.clone(), heading} : null; leg.swing = standing ? null : worldTarget.clone(); leg.replanted = true; leg.replantCount++;
      }
      if (attacking) {
        // Contact is an actual weighted claw-tip vertex, not an invisible paw
        // joint. The scapula participates in the reach without stretching bones.
        scratch.copy(leg.tipOffset).applyQuaternion(footQ);
        strikeGoal.copy(modelTarget).add(scratch).applyMatrix4(body.matrixWorld).lerp(strikeHand, strikeWeight);
        modelTarget.copy(strikeGoal).applyMatrix4(inverse).sub(scratch);
      }
      const fitPasses = attacking ? 8 : 5;
      for (let fit = 0; fit < fitPasses; fit++) {
        solve(leg, modelTarget, attacking);
        modelQuaternion(leg.end.parent, parentQ).invert(); leg.end.quaternion.copy(parentQ).multiply(footQ).normalize(); leg.end.updateWorldMatrix(false, true);
        if (attacking) {
          strikeContact.fromBufferAttribute(mesh.geometry.attributes.position, leg.tipIndex); mesh.applyBoneTransform(leg.tipIndex, strikeContact).applyMatrix4(mesh.matrixWorld);
          strikeCorrection.copy(strikeGoal).sub(strikeContact);
          if (strikeCorrection.length() > .0003 && fit < fitPasses - 1) {
            modelTarget.applyMatrix4(body.matrixWorld).add(strikeCorrection).applyMatrix4(inverse); continue;
          }
          break;
        }
        let clearance = Infinity;
        for (const index of leg.samples) {
          scratch.fromBufferAttribute(mesh.geometry.attributes.position, index); mesh.applyBoneTransform(index, scratch).applyMatrix4(mesh.matrixWorld);
          clearance = Math.min(clearance, scratch.y - height(scratch.x, scratch.z));
        }
        leg.skinClearance = clearance;
        const correction = lift + .006 - clearance;
        if (Math.abs(correction) < .002 || fit === fitPasses - 1) break;
        worldTarget.y += T.MathUtils.clamp(correction, -1, 1);
        modelTarget.copy(worldTarget).applyMatrix4(inverse).sub(scratch.copy(leg.soleOffset).applyQuaternion(footQ));
      }
      leg.target.copy(worldTarget); leg.phase = nextPhase; leg.contact = standing && lift < .01 && !(leg.key === 'frontRight' && strikeWeight > .01);
      const actual = leg.end.localToWorld(scratch.copy(leg.soleOffset)); leg.error = actual.distanceTo(worldTarget);
      if (attacking) strikeError = strikeContact.distanceTo(strikeHand);
    }
    lastMoving = Boolean(moving); body.updateWorldMatrix(true, true); mesh.updateMatrixWorld(true); markMeshyCarrierPose(instance);
    return status();
  }
  function status() {return {phase, disposed, strikeError, strikeSurfacePoint: strikeError === null ? null : strikeContact.toArray(), strikeVertexIndex: legs.find(leg => leg.key === 'frontRight').tipIndex, legs: legs.map(leg => ({name: leg.key, phase: leg.phase, planted: leg.contact, target: leg.target.toArray(), soleError: leg.error, sampledSkinClearance: leg.skinClearance, soleSamples: leg.samples.length, replanted: leg.replanted, replantCount: leg.replantCount}))};}
  return {update, status, dispose() {disposed = true; for (const leg of legs) {leg.plant = null; leg.swing = null;}}, instance};
}
