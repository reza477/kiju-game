import * as T from '../vendor/three.module.js';
import {markMeshyCarrierPose} from './meshy-carriers.js';
import {createNativeSkinCorrective} from './native-skin-corrective.js';

// Candidate source. Preview routes this unchanged file at /src/monster-quadruped-pose.js.
// Simulation owns actor transforms, attack targets, event timing and damage.
const UP = new T.Vector3(0, 1, 0);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = x => {x = clamp(x, 0, 1); return x * x * (3 - 2 * x);};
const cycle = x => ((x % 1) + 1) % 1;
const copySurface = s => ({triangle: s.triangle, barycentric: [...s.barycentric]});

export function inspectMeshyQuadrupedRig(instance) {
  const meshes = [], bones = new Map();
  instance.body.traverse(o => {if (o.isSkinnedMesh) meshes.push(o); if (o.isBone) bones.set(o.name, o);});
  if (meshes.length !== 1) throw new Error('Native quadruped requires one connected skinned surface');
  const mesh = meshes[0], metadata = mesh.userData.nativeQuadruped;
  if (metadata?.version !== 1 || !metadata.feet || !metadata.bindPose || !instance.clip) throw new Error('Incomplete native quadruped contract');
  if (instance.clip.name !== metadata.clipName) throw new Error('Native quadruped Walking clip mismatch');
  if (bones.size !== Object.keys(metadata.bindPose).length) throw new Error('Native quadruped joint declaration mismatch');
  for (const names of Object.values(metadata.chains)) {
    if (names.length !== 4 || names.some(n => !bones.has(n))) throw new Error('Native quadruped needs three anatomical limb segments');
    for (let i = 1; i < 4; i++) if (bones.get(names[i]).parent !== bones.get(names[i - 1])) throw new Error('Disconnected native limb hierarchy');
  }
  return {mesh, bones, metadata};
}

export function createMeshyQuadrupedPose(instance, {groundHeight = () => 0, strideDistance, initialPhase = 0, supportCrouch = .12} = {}) {
  const rig = inspectMeshyQuadrupedRig(instance), {mesh, bones, metadata} = rig;
  const surfaceCorrective=createNativeSkinCorrective(mesh);
  const stride = strideDistance ?? metadata.strideDistance;
  if (!(stride > 0)) throw new Error('Native quadruped stride must be positive world metres');
  const rest = new Map(Object.entries(metadata.bindPose).map(([name, p]) => [name, {
    position: new T.Vector3().fromArray(p.position), quaternion: new T.Quaternion().fromArray(p.quaternion), scale: new T.Vector3().fromArray(p.scale),
  }]));
  const rootQ = new T.Quaternion(), rootScale = new T.Vector3(), rootInverse = new T.Matrix4();
  const scratch = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  const q = new T.Quaternion(), parentQ = new T.Quaternion();
  const index = mesh.geometry.index;
  const nativeTracks = instance.clip.tracks.map(track => {
    const binding = T.PropertyBinding.parseTrackName(track.name), bone = bones.get(binding.nodeName);
    if (!bone || !['position', 'quaternion', 'scale'].includes(binding.propertyName) || binding.objectName || binding.propertyIndex !== undefined) throw new Error('Unsupported native quadruped animation track');
    return {bone, property: binding.propertyName, interpolant: track.createInterpolant()};
  });
  const refresh = () => {instance.root.updateWorldMatrix(true, false); instance.root.updateMatrixWorld(true); mesh.skeleton.update();};
  function resetBind() {
    for (const [name, p] of rest) {const bone = bones.get(name); bone.position.copy(p.position); bone.quaternion.copy(p.quaternion); bone.scale.copy(p.scale);}
  }
  function surfacePoint(surface, result = new T.Vector3()) {
    result.set(0, 0, 0);
    for (let k = 0; k < 3; k++) if (surface.barycentric[k] !== 0) {
      mesh.getVertexPosition(index.getX(surface.triangle * 3 + k), scratch).applyMatrix4(mesh.matrixWorld);
      result.addScaledVector(scratch, surface.barycentric[k]);
    }
    return result;
  }
  function terrainNormal(x, z) {
    const h = .06, dx = (groundHeight(x + h, z) - groundHeight(x - h, z)) / (2 * h), dz = (groundHeight(x, z + h) - groundHeight(x, z - h)) / (2 * h);
    return new T.Vector3(-dx, 1, -dz).normalize();
  }
  function segmentFrame(direction, lateral) {
    const longitudinal = direction.clone().normalize(), normal = lateral.clone();
    normal.addScaledVector(longitudinal, -normal.dot(longitudinal));
    if (normal.lengthSq() < 1e-12) throw new Error('Native limb material frame is degenerate');
    normal.normalize();
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(longitudinal, normal, longitudinal.clone().cross(normal)));
  }
  resetBind(); refresh(); instance.root.getWorldQuaternion(rootQ);
  const legs = Object.entries(metadata.feet).map(([key, foot]) => {
    const chain = foot.chain.map(n => bones.get(n)), points = chain.map(b => b.getWorldPosition(new T.Vector3()));
    const endQ = chain[3].getWorldQuaternion(new T.Quaternion()), endInverse = chain[3].matrixWorld.clone().invert();
    const endScale = chain[3].getWorldScale(new T.Vector3());
    const vertexFaces = new Map();
    for (const face of foot.faces) for (let i = 0; i < 3; i++) if (!vertexFaces.has(index.getX(face * 3 + i))) vertexFaces.set(index.getX(face * 3 + i), {triangle: face, barycentric: [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0]});
    const endIndex = mesh.skeleton.bones.indexOf(chain[3]), si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
    const rigidVertices = foot.groundSampleVertices.filter(id => {
      let amount = 0; for (let k = 0; k < 4; k++) if (si.array[id * 4 + k] === endIndex) amount += sw.array[id * 4 + k]; return amount > .999999;
    });
    if (!rigidVertices.length) throw new Error('Native paw has no connected rigid plantar surface');
    const rigidOffsets = new Map(rigidVertices.map(id => [id, mesh.getVertexPosition(id, new T.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(endInverse)]));
    const side = key.endsWith('Left') ? -1 : 1, lateral = new T.Vector3(side, 0, 0).applyQuaternion(rootQ);
    const segmentMaterialOffsets = points.slice(1).map((point, i) => segmentFrame(point.clone().sub(points[i]), lateral).invert().multiply(chain[i].getWorldQuaternion(new T.Quaternion())));
    // The bind limb, in the root's frame, is the one shape known to carry its
    // skin without folding. A strike swings this shape from the shoulder.
    const rootInverseQ = rootQ.clone().invert(), strikeClaw = surfacePoint(foot.strike);
    const strikeRest = {
      upper: points[1].clone().sub(points[0]).applyQuaternion(rootInverseQ),
      forearm: points[2].clone().sub(points[1]).applyQuaternion(rootInverseQ),
      hand: strikeClaw.sub(points[2]).applyQuaternion(rootInverseQ),
      bones: chain.map(bone => rootInverseQ.clone().multiply(bone.getWorldQuaternion(new T.Quaternion()))),
    };
    return {key, foot, chain, side, segmentMaterialOffsets, strikeRest, lengths: points.slice(1).map((p, i) => p.distanceTo(points[i])),
      restingSoleRoot: surfacePoint(foot.sole).applyMatrix4(instance.root.matrixWorld.clone().invert()),
      endRelativeRoot: rootQ.clone().invert().multiply(endQ),
      lastVectorEnd: points[3].clone().sub(points[2]).applyQuaternion(endQ.clone().invert()).divide(endScale),
      soleOffset: surfacePoint(foot.sole).applyMatrix4(endInverse), strikeOffset: surfacePoint(foot.strike).applyMatrix4(endInverse),
      rigidVertices, rigidOffsets, vertexFaces, surface: copySurface(foot.sole), offset: surfacePoint(foot.sole).applyMatrix4(endInverse),
      walkLateral: foot.bindSolePosition[0] - foot.bindJointPositions[0][0],
      planted: false, plant: null, orientation: endQ.clone(), swingFrom: null, swingStartPhase: 0, swingDuration: 0, lastLanding: null, settling: null, previousNatural: null,
    };
  });
  let phase = cycle(metadata.initialPhase + initialPhase), previousTime = null, motionBlend = 0, bodyCrouch = 0, lastStatus = null, disposed = false, lastInput = null, lastBonePose = null;
  let previousRootHeading = null, supportGeneration = 0;
  let restPending = false, restQueue = [];
  let previousFrameRoot = null, previousFrameRootQ = null, wasAirborne = false, flightCrouch = 0;
  function orientedFoot(leg, point) {
    const normal = terrainNormal(point.x, point.z), up = UP.clone().applyQuaternion(rootQ);
    return new T.Quaternion().setFromUnitVectors(up, normal).multiply(rootQ).multiply(leg.endRelativeRoot);
  }
  function worldRotation(bone, desired) {
    bone.parent.getWorldQuaternion(parentQ); bone.quaternion.copy(parentQ.invert()).multiply(desired); bone.updateWorldMatrix(false, true);
  }
  // Native knee + hock/pastern + whole paw. The last segment keeps a ground/strike
  // orientation; an analytic upper pair preserves its source anatomical bend.
  function solve(leg, point, orientation, offset) {
    const chain = leg.chain, p = chain.map(x => x.getWorldPosition(new T.Vector3()));
    const endScale = chain[3].getWorldScale(new T.Vector3()), endTarget = point.clone().sub(offset.clone().multiply(endScale).applyQuaternion(orientation));
    const last = leg.lastVectorEnd.clone().multiply(endScale).applyQuaternion(orientation);
    const toward = endTarget.clone().sub(p[0]), d = toward.length();
    const [l0, l1, l2] = leg.lengths, upper = l0 + l1;
    if (d > 1e-8) {
      const dir = toward.clone().divideScalar(d), cosine = (d * d + l2 * l2 - (upper - 1e-7) ** 2) / (2 * d * l2);
      if (cosine > -1 && last.clone().normalize().dot(dir) < cosine) {
        const angle = Math.acos(clamp(cosine, -1, 1)), side = last.clone().addScaledVector(dir, -last.dot(dir));
        if (side.lengthSq() < 1e-12) side.copy(p[2]).sub(p[0]).addScaledVector(dir, -p[2].clone().sub(p[0]).dot(dir));
        side.normalize(); last.copy(dir).multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).multiplyScalar(l2);
      }
    }
    const hock = endTarget.clone().sub(last), axis = hock.clone().sub(p[0]);
    const distance = clamp(axis.length(), Math.abs(l0 - l1) + 1e-7, upper - 1e-7); axis.normalize();
    // Both hind knees use a forward/outward anatomical plane. The native left
    // bind knee is nearly collinear and its backward pole sign is unstable.
    // The modest outward component follows the native hip-to-paw lateral slope.
    const isRear = leg.key.startsWith('rear');
    const pole = isRear ? new T.Vector3(leg.side * .18, 0, 1).applyQuaternion(rootQ) : p[1].clone().sub(p[0]);
    pole.addScaledVector(axis, -pole.dot(axis));
    if (pole.lengthSq() < 1e-12) pole.set(0, 0, leg.key.startsWith('front') ? -1 : 1).applyQuaternion(rootQ).addScaledVector(axis, -pole.dot(axis));
    pole.normalize();
    const along = (l0 * l0 - l1 * l1 + distance * distance) / (2 * distance), radius = Math.sqrt(Math.max(0, l0 * l0 - along * along));
    const knee = p[0].clone().addScaledVector(axis, along).addScaledVector(pole, radius);
    const wanted = [p[0], knee, p[0].clone().addScaledVector(axis, distance), endTarget];
    const planeNormal = axis.clone().cross(pole).normalize();
    if (planeNormal.dot(new T.Vector3(leg.side, 0, 0).applyQuaternion(rootQ)) < 0) planeNormal.negate();
    for (let i = 0; i < 3; i++) {
      const here = chain[i].getWorldPosition(a), child = chain[i + 1].getWorldPosition(b), from = child.clone().sub(here).normalize(), to = wanted[i + 1].clone().sub(here).normalize();
      if (isRear) {
        // Direction alone leaves axial roll unconstrained. Retain each native
        // bone's authored material-frame offset in the solved anatomical plane.
        worldRotation(chain[i], segmentFrame(to, planeNormal).multiply(leg.segmentMaterialOffsets[i]));
      } else {
        chain[i].getWorldQuaternion(q); worldRotation(chain[i], new T.Quaternion().setFromUnitVectors(from, to).multiply(q));
      }
    }
    worldRotation(chain[3], orientation); refresh();
    // Exact rigid source skin witnesses give a direct geometric residual.
    return endTarget.distanceTo(chain[3].getWorldPosition(a));
  }
  // A strike keeps the whole limb in its bind shape and aims it from the
  // shoulder. Only the elbow hinges to fit the distance; the wrist opens, and
  // only towards straight, when a far target needs the last of the reach.
  // The former solve aimed the toes along the attack and reached the same
  // point by folding the wrist, which drove the paw through its own forearm.
  // The pads now meet the target as they meet the ground. The claw witness,
  // target, timing and every support paw are unchanged.
  const STRIKE_MAX_ELBOW = 170 * Math.PI / 180;
  function solveStrike(leg, target, blend) {
    const chain = leg.chain, rest = leg.strikeRest;
    const shoulder = chain[0].getWorldPosition(new T.Vector3()), toward = target.clone().sub(shoulder), reach = toward.length();
    if (reach < 1e-8) return target.distanceTo(surfacePoint(leg.foot.strike));
    const upper = rest.upper.clone().applyQuaternion(rootQ), forearm = rest.forearm.clone().applyQuaternion(rootQ), hand = rest.hand.clone().applyQuaternion(rootQ);
    const l0 = upper.length(), l1 = forearm.length(), lh = hand.length();
    const hinge = (first, second, change) => {
      // Rotating the outer link about first x second closes the interior
      // angle, so a positive change (opening) uses the negative rotation.
      const axis = first.clone().cross(second);
      if (axis.lengthSq() < 1e-16) return new T.Quaternion();
      return new T.Quaternion().setFromAxisAngle(axis.normalize(), -change);
    };
    const span = (a, b, angle) => Math.sqrt(Math.max(0, a * a + b * b - 2 * a * b * Math.cos(angle)));
    const interior = (a, b, c) => Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b), -1, 1));
    let wristQ = new T.Quaternion(), outer = forearm.clone().add(hand), lo = outer.length();
    if (reach > span(l0, lo, STRIKE_MAX_ELBOW)) {
      // Elbow-to-claw length that reaches the target at the widest elbow.
      const needed = l0 * Math.cos(STRIKE_MAX_ELBOW) + Math.sqrt(Math.max(0, reach * reach - (l0 * Math.sin(STRIKE_MAX_ELBOW)) ** 2));
      const wanted = interior(l1, lh, Math.min(needed, l1 + lh - 1e-7)), current = Math.PI - forearm.angleTo(hand);
      if (wanted > current) {wristQ = hinge(forearm, hand, wanted - current); hand.applyQuaternion(wristQ); outer = forearm.clone().add(hand); lo = outer.length();}
    }
    const elbowAngle = Math.min(interior(l0, lo, reach), Math.PI - 1e-4), elbowQ = hinge(upper, outer, elbowAngle - (Math.PI - upper.angleTo(outer)));
    const claw = upper.clone().add(outer.applyQuaternion(elbowQ));
    const aimQ = new T.Quaternion().setFromUnitVectors(claw.normalize(), toward.divideScalar(reach));
    const lower = aimQ.clone().multiply(elbowQ), distal = lower.clone().multiply(wristQ);
    const desired = [aimQ, lower, distal, distal].map((turn, i) => turn.clone().multiply(rootQ).multiply(rest.bones[i]));
    const current = chain.map(bone => bone.getWorldQuaternion(new T.Quaternion()));
    for (let i = 0; i < 4; i++) worldRotation(chain[i], blend >= 1 ? desired[i] : current[i].slerp(desired[i], blend));
    refresh();
    return target.distanceTo(surfacePoint(leg.foot.strike));
  }
  function lowestRigidSurface(leg) {
    let value = Infinity, vertex = -1;
    for (const id of leg.rigidVertices) {
      mesh.getVertexPosition(id, a).applyMatrix4(mesh.matrixWorld); const gap = a.y - groundHeight(a.x, a.z);
      if (gap < value) {value = gap; vertex = id;}
    }
    return {surface: copySurface(leg.vertexFaces.get(vertex)), value};
  }
  function choosePlant(leg, desired, orientation) {
    // Select the true rigid sole support before IK. An unreachable preliminary
    // solve must not silently move a newly landing contact horizontally.
    const scale = leg.chain[3].getWorldScale(new T.Vector3());
    const end = desired.clone().sub(leg.soleOffset.clone().multiply(scale).applyQuaternion(orientation));
    let minimum = Infinity, vertex = -1, plant;
    for (const [id, offset] of leg.rigidOffsets) {
      const point = offset.clone().multiply(scale).applyQuaternion(orientation).add(end);
      const clearance = point.y - groundHeight(point.x, point.z);
      if (clearance < minimum) {minimum = clearance; vertex = id; plant = point;}
    }
    leg.surface = copySurface(leg.vertexFaces.get(vertex)); leg.offset.copy(leg.rigidOffsets.get(vertex));
    leg.plant = plant; leg.plant.y = groundHeight(leg.plant.x, leg.plant.z) + .0005;
    leg.orientation.copy(orientation); leg.planted = true; leg.settling = null;
    leg.previousNatural = leg.plant.clone().add(leg.soleOffset.clone().sub(leg.offset).multiply(scale).applyQuaternion(orientation));
  }
  function minimumFootClearance(leg) {
    let min = Infinity;
    for (const id of leg.foot.groundSampleVertices) {mesh.getVertexPosition(id, a).applyMatrix4(mesh.matrixWorld); min = Math.min(min, a.y - groundHeight(a.x, a.z));}
    return min;
  }
  function correctSwingClearance(leg, desired, orientation) {
    // Near full extension the fixed-length solve only partially realizes a
    // target lift. Iterate that measured residual to the same 0.5mm support
    // height instead of stopping after three under-converged corrections.
    // The 1 micrometre target buffer covers Float32 skinning roundoff; it does
    // not change the required clearance or add any stretch to a native link.
    let previous = null;
    for (let attempt = 0; attempt < 16; attempt++) {
      const clearance = minimumFootClearance(leg);
      if (clearance >= .0005) return;
      const residual = .0005 - clearance;
      let lift = residual;
      if (previous && desired.y - previous.y > 1e-10) {
        const response = (clearance - previous.clearance) / (desired.y - previous.y);
        // Use the measured vertical response of the same actual rigid paw.
        // A positive, sub-unit response identifies near-extension clamping;
        // cap the extrapolation to 15cm and retain the conservative residual
        // step whenever the response is flat, reversed or ill-conditioned.
        if (response > .02 && response < 1) lift = Math.max(lift, Math.min(.15, residual / response));
      }
      previous = {y: desired.y, clearance};
      desired.y += lift + .000001;
      solve(leg, desired, orientation, leg.soleOffset);
    }
  }
  function update({time, moving = false, distanceDelta = 0, heading = 0, strikeHand = null, strikeWeight = 0, flight = null} = {}) {
    if (disposed) return null;
    if (!Number.isFinite(time) || !Number.isFinite(distanceDelta) || distanceDelta < 0 || !Number.isFinite(heading) || !Number.isFinite(strikeWeight)) throw new Error('Invalid native quadruped pose input');
    instance.root.updateWorldMatrix(true, false);
    // Distance belongs to a simulation tick; repeated ticks ignore it even if
    // the caller repeats an accumulated delta. Time still distinguishes steps.
    const input = [time, moving, heading, strikeWeight, Boolean(flight?.active), flight?.progress ?? 0, flight?.tuck ?? 0, strikeHand?.x ?? null, strikeHand?.y ?? null, strikeHand?.z ?? null, ...instance.root.matrixWorld.elements];
    if (lastInput && input.every((value, i) => value === lastInput[i])) {
      // An upstream mixer may have sampled the same tick again. Restore the
      // exact final pose instead of iterating the IK or advancing the stride.
      for (const [bone, pose] of lastBonePose) {bone.position.copy(pose.position); bone.quaternion.copy(pose.quaternion); bone.scale.copy(pose.scale);}
      refresh(); return lastStatus;
    }
    surfaceCorrective?.reset();
    const airborne = Boolean(flight?.active), landing = wasAirborne && !airborne;
    const firstUpdate = previousTime === null;
    const advancesTime = previousTime === null || time > previousTime;
    const dt = previousTime === null ? 0 : clamp(time - previousTime, 0, .1); previousTime = Math.max(previousTime ?? time, time);
    if (advancesTime && moving && distanceDelta > 0) phase = cycle(phase + distanceDelta / stride);
    motionBlend = clamp(motionBlend + (moving ? 1 : -1) * dt / .2, 0, 1);
    // PropertyMixer intentionally skips writing unchanged samples. These bones
    // are also IK outputs, so a stopped clip must be sampled independently or
    // the prior solved crouch/rotation feeds recursively into the next blend.
    resetBind();
    for (const track of nativeTracks) track.bone[track.property].fromArray(track.interpolant.evaluate(phase * instance.clip.duration));
    for (const [name, p] of rest) {
      const bone = bones.get(name), animatedQuaternion = bone.quaternion.clone(); bone.quaternion.slerpQuaternions(p.quaternion, animatedQuaternion, motionBlend); bone.scale.copy(p.scale);
      if (name === metadata.bodyRoot) {bone.position.z = T.MathUtils.lerp(p.position.z, bone.position.z, motionBlend); bone.position.x = p.position.x; bone.position.y = p.position.y;}
      else bone.position.copy(p.position);
    }
    refresh(); instance.root.getWorldQuaternion(rootQ); instance.root.getWorldScale(rootScale); rootInverse.copy(instance.root.matrixWorld).invert();
    const rootForward = new T.Vector3(0, 0, 1).applyQuaternion(rootQ), rootHeading = Math.atan2(rootForward.x, rootForward.z);
    const angleDelta = previousRootHeading === null ? 0 : Math.atan2(Math.sin(rootHeading - previousRootHeading), Math.cos(rootHeading - previousRootHeading));
    const discontinuity = previousRootHeading !== null && (Math.abs(angleDelta) > .6 || distanceDelta >= stride * .5);
    const supportReset = discontinuity ? {reason: Math.abs(angleDelta) > .6 ? 'actor-reorientation' : 'actor-displacement', angularDeltaRadians: angleDelta, distanceDelta, generation: ++supportGeneration} : null;
    previousRootHeading = rootHeading;
    if (discontinuity) {
      // The simulation can rotate the entire actor instantaneously when input
      // changes direction. Release the old support frame explicitly; a fixed
      // anatomical limb cannot span the old world plant after that jump.
      bodyCrouch = 0;
      for (const leg of legs) {leg.planted = false; leg.plant = null; leg.swingFrom = null; leg.lastLanding = null; leg.previousNatural = null; leg.settling = null;}
      restPending = false; restQueue = [];
    }
    // Quiet breathing remains visible at rest; every planted paw is solved after it.
    const body = bones.get(metadata.bodyRoot), bodyParentQ = body.parent.getWorldQuaternion(new T.Quaternion()), bodyParentScale = body.parent.getWorldScale(new T.Vector3());
    const lift = -.12 + .025 * Math.sin(time * 1.55); body.position.add(new T.Vector3(0, lift - (supportCrouch - .12), 0).applyQuaternion(bodyParentQ.invert()).divide(bodyParentScale)); refresh();
    const attack = strikeHand && strikeWeight > 1e-8, w = clamp(strikeWeight, 0, 1), strikeTarget = strikeHand ? new T.Vector3().copy(strikeHand) : null;
    if (airborne && !wasAirborne) {
      const oldInverse = (previousFrameRoot || instance.root.matrixWorld).clone().invert();
      const oldQ = (previousFrameRootQ || rootQ).clone().invert();
      flightCrouch = bodyCrouch; restPending = false; restQueue = [];
      for (const leg of legs) {
        leg.flightSole = (leg.previousNatural?.clone() || surfacePoint(leg.foot.sole)).applyMatrix4(oldInverse);
        leg.flightOrientation = oldQ.clone().multiply(leg.orientation);
        leg.planted = false; leg.plant = null; leg.swingFrom = null; leg.lastLanding = null; leg.settling = null;
      }
    }
    if (lastStatus?.moving && !moving && !airborne) restPending = true;
    if (!airborne && (moving || attack)) {
      // An interrupted settling step lands at its current horizontal location
      // before a new gait/attack. The other three material plants never move.
      for (const leg of legs) if (leg.settling?.kind === 'rest') {
        const at = leg.previousNatural?.clone() || surfacePoint(leg.foot.sole);
        at.y = groundHeight(at.x, at.z) + .0005;
        choosePlant(leg, at, orientedFoot(leg, at)); leg.settling = null;
      }
      restQueue = []; restPending = Boolean(attack);
    }
    // Terrain support is required on the first rendered frame too. Establish
    // real connected paw witnesses before calculating the body's reach limit.
    if (!airborne && (firstUpdate || discontinuity || landing)) for (const leg of legs) {
      const desired = landing && leg.flightSole ? leg.flightSole.clone().applyMatrix4(instance.root.matrixWorld) : surfacePoint(leg.foot.sole);
      if (moving) {
        const forward = new T.Vector3(0, 0, 1).applyQuaternion(rootQ); forward.y = 0; forward.normalize();
        const localPhase = cycle(phase - leg.foot.stance.start);
        desired.copy(leg.chain[0].getWorldPosition(new T.Vector3()))
          .add(new T.Vector3(leg.walkLateral * rootScale.x, 0, 0).applyQuaternion(rootQ))
          .addScaledVector(forward, stride * (leg.foot.stance.duration / 2 - Math.min(localPhase, leg.foot.stance.duration)));
      }
      const orientation = orientedFoot(leg, desired);
      desired.y = groundHeight(desired.x, desired.z) + .0005;
      choosePlant(leg, desired, orientation);
    }
    // Every stance entry, not only initialization, participates in this frame's
    // support solve. Swing landing targets are actual world positions.
    if (!airborne && moving) for (const leg of legs) if (!leg.planted && cycle(phase - leg.foot.stance.start) < leg.foot.stance.duration) {
      const desired = leg.lastLanding?.clone() || surfacePoint(leg.foot.sole);
      desired.y = groundHeight(desired.x, desired.z) + .0005;
      choosePlant(leg, desired, orientedFoot(leg, desired));
    }
    // A resting step's landing is a support constraint in this same frame,
    // just like a gait stance entry; do not plant it after crouch was solved.
    for (const leg of legs) if (leg.settling?.kind === 'rest' && time - leg.settling.start >= .18) {
      const to = leg.settling.to;
      choosePlant(leg, to, orientedFoot(leg, to)); leg.settling = null;
    }
    if (!airborne && !moving && !attack && motionBlend <= .001 && !legs.some(leg => leg.settling?.kind === 'rest')) {
      if (restPending && legs.every(leg => leg.planted)) {
        restQueue = legs.map(leg => {
          const to = leg.restingSoleRoot.clone().applyMatrix4(instance.root.matrixWorld), from = leg.previousNatural?.clone() || surfacePoint(leg.foot.sole);
          return {leg, distance: Math.hypot(to.x - from.x, to.z - from.z)};
        }).filter(item => item.distance > .15).sort((a, b) => b.distance - a.distance).map(item => item.leg);
        restPending = false;
      }
      const leg = restQueue.shift();
      if (leg) {
        const from = leg.previousNatural?.clone() || surfacePoint(leg.foot.sole), to = leg.restingSoleRoot.clone().applyMatrix4(instance.root.matrixWorld);
        to.y = groundHeight(to.x, to.z) + .0005;
        leg.planted = false; leg.plant = null; leg.lastLanding = null; leg.swingFrom = null;
        leg.settling = {kind: 'rest', start: time, from, to};
      }
    }
    // The generic export's hip bob was not ground-constrained. Settle its body
    // over the real planted feet; never elongate a segment to preserve a bob.
    let requiredCrouch = 0;
    for (const leg of legs) {
      const stance = !moving || cycle(phase - leg.foot.stance.start) < leg.foot.stance.duration;
      if (!leg.planted || !stance || attack && leg.key === 'frontRight') continue;
      const endScale = leg.chain[3].getWorldScale(new T.Vector3());
      const end = leg.plant.clone().sub(leg.offset.clone().multiply(endScale).applyQuaternion(leg.orientation));
      const hip = leg.chain[0].getWorldPosition(new T.Vector3()), reach = leg.lengths.reduce((a, b) => a + b, 0) - .025;
      const horizontalSq = (hip.x - end.x) ** 2 + (hip.z - end.z) ** 2;
      if (horizontalSq < reach * reach) requiredCrouch = Math.max(requiredCrouch, hip.y - end.y - Math.sqrt(reach * reach - horizontalSq));
    }
    bodyCrouch = airborne ? flightCrouch : Math.max(0, requiredCrouch, bodyCrouch - dt * .7);
    if (bodyCrouch > 0) {body.position.add(new T.Vector3(0, -bodyCrouch, 0).applyQuaternion(bodyParentQ).divide(bodyParentScale)); refresh();}
    const natural = new Map(legs.map(leg => [leg.key, {sole: surfacePoint(leg.foot.sole), endQ: leg.chain[3].getWorldQuaternion(new T.Quaternion())}]));
    const legStatuses = [];
    for (const leg of legs) {
      const n = natural.get(leg.key), localPhase = cycle(phase - leg.foot.stance.start), inStance = localPhase < leg.foot.stance.duration;
      const qFoot = orientedFoot(leg, n.sole), desired = n.sole.clone();
      desired.y = groundHeight(desired.x, desired.z) + .0005;
      const wantsPlant = !airborne && (!moving || inStance), isStrike = attack && leg.key === 'frontRight';
      const restingStep = leg.settling?.kind === 'rest';
      if (airborne) {
        desired.copy(leg.flightSole).applyMatrix4(instance.root.matrixWorld); desired.y += flight.tuck;
        qFoot.copy(rootQ).multiply(leg.flightOrientation);
        solve(leg, desired, qFoot, leg.soleOffset);
        correctSwingClearance(leg, desired, qFoot);
      } else if (restingStep) {
        const progress = clamp((time - leg.settling.start) / .18, 0, 1), step = leg.settling;
        desired.lerpVectors(step.from, step.to, smooth(progress));
        desired.y = groundHeight(desired.x, desired.z) + .0005 + .75 * Math.sin(Math.PI * progress);
        if (progress >= 1) {choosePlant(leg, step.to, orientedFoot(leg, step.to)); leg.settling = null;}
        else {solve(leg, desired, qFoot, leg.soleOffset); correctSwingClearance(leg, desired, qFoot);}
      } else if (wantsPlant && !leg.planted) {
        if (!moving && motionBlend > .001 && leg.previousNatural) {
          leg.settling ??= {start: time, from: leg.previousNatural.clone(), to: desired.clone()};
          const t = smooth((time - leg.settling.start) / .18); desired.lerpVectors(leg.settling.from, leg.settling.to, t);
          if (t >= 1) choosePlant(leg, desired, qFoot); else {
            solve(leg, desired, qFoot, leg.soleOffset);
            correctSwingClearance(leg, desired, qFoot);
          }
        } else choosePlant(leg, leg.lastLanding || desired, qFoot);
      } else if (!wantsPlant && leg.planted) {
        leg.swingFrom = leg.previousNatural?.clone() || surfacePoint(leg.foot.sole); leg.swingStartPhase = phase; leg.swingDuration = Math.max(.02, cycle(leg.foot.stance.start - phase)); leg.planted = false; leg.settling = null;
      }
      if (leg.planted) solve(leg, leg.plant, leg.orientation, leg.offset);
      else if (!airborne && !leg.settling) {
        if (!leg.swingFrom) {leg.swingFrom = leg.previousNatural?.clone() || n.sole.clone(); leg.swingStartPhase = phase; leg.swingDuration = Math.max(.02, cycle(leg.foot.stance.start - phase));}
        const progress = clamp(cycle(phase - leg.swingStartPhase) / leg.swingDuration, 0, 1);
        const remaining = Math.max(0, leg.swingDuration - cycle(phase - leg.swingStartPhase));
        const forward = new T.Vector3(0, 0, 1).applyQuaternion(rootQ); forward.y = 0; forward.normalize();
        // A walking stance is balanced around its real anatomical hip. The
        // source bind paw's rearward offset belongs to the resting silhouette.
        const landing = leg.chain[0].getWorldPosition(new T.Vector3())
          .add(new T.Vector3(leg.walkLateral * rootScale.x, 0, 0).applyQuaternion(rootQ))
          .addScaledVector(forward, stride * (remaining + leg.foot.stance.duration / 2));
        landing.y = groundHeight(landing.x, landing.z) + .0005; leg.lastLanding = landing;
        desired.lerpVectors(leg.swingFrom, landing, smooth(progress));
        desired.y = groundHeight(desired.x, desired.z) + .0005 + (leg.key.startsWith('front') ? .85 : .7) * Math.sin(Math.PI * progress);
        solve(leg, desired, qFoot, leg.soleOffset);
        correctSwingClearance(leg, desired, qFoot);
      }
      let strikeSolveTarget = null;
      if (isStrike) {
        const base = surfacePoint(leg.foot.strike), shoulder = leg.chain[0].getWorldPosition(new T.Vector3());
        const floor = Math.min(base.distanceTo(shoulder), strikeTarget.distanceTo(shoulder)), target = base.lerp(strikeTarget, w);
        // A straight chord between two points at arm's length passes close
        // to the shoulder and crumples the limb. Carry the claw around at
        // the nearer endpoint's radius; both endpoints remain exact.
        const outward = target.clone().sub(shoulder), radius = outward.length();
        if (radius > 1e-8 && radius < floor - 1e-9) target.copy(shoulder).addScaledVector(outward, floor / radius);
        strikeSolveTarget = target.clone();
        solveStrike(leg, target, smooth(w / .5));
      }
      const contact = isStrike ? leg.foot.strike : leg.planted ? leg.surface : leg.foot.sole, point = surfacePoint(contact), target = isStrike ? strikeSolveTarget : leg.planted ? leg.plant : point;
      const clearance = minimumFootClearance(leg); leg.previousNatural = surfacePoint(leg.foot.sole);
      legStatuses.push({key: leg.key, name: leg.key, phase: localPhase, phaseNormalized: phase, planted: leg.planted && !isStrike, contactSurface: copySurface(contact),
        replanted: discontinuity, supportGeneration, supportResetReason: supportReset?.reason ?? null,
        target: target.toArray(), plantWorld: leg.planted && !isStrike ? leg.plant.toArray() : null, contactWorld: point.toArray(),
        soleError: point.distanceTo(target), sampledSkinClearance: clearance, sourceStance: inStance, settling: Boolean(leg.settling),
        lengths: [...leg.lengths], actualLengths: leg.chain.slice(1).map((bone, i) => bone.getWorldPosition(a).distanceTo(leg.chain[i].getWorldPosition(b))),
      });
    }
    refresh(); surfaceCorrective?.update(); markMeshyCarrierPose(instance);
    const attackingLeg = legs.find(x => x.key === 'frontRight'), strikePoint = surfacePoint(attackingLeg.foot.strike);
    lastStatus = {nativeQuadruped: true, phase, phaseNormalized: phase, moving, motionBlend, bodyCrouch, airborne, strideDistance: stride, supportReset,
      strikeError: strikeTarget ? strikePoint.distanceTo(strikeTarget) : 0, strikeSurface: copySurface(attackingLeg.foot.strike), strikeSurfacePoint: strikePoint.toArray(),
      legs: legStatuses, surfaceCorrective:surfaceCorrective?.status(), limitations: 'Candidate controller: independent full surface and native quality verification required'};
    wasAirborne = airborne; previousFrameRoot = instance.root.matrixWorld.clone(); previousFrameRootQ = rootQ.clone();
    lastInput = input;
    lastBonePose = [...bones.values()].map(bone => [bone, {position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone()}]);
    return lastStatus;
  }
  return {rig, instance, update, status: () => lastStatus ? {...structuredClone(lastStatus), disposed} : {disposed},
    displayStatus: () => lastStatus ? lastStatus.legs.map(l => ({nativeQuadruped: true, key: l.key, error: l.soleError,
      lengthError: Math.max(...l.actualLengths.map((n, i) => Math.abs(n - l.lengths[i]))), unreachable: l.soleError > .001})) : [],
    dispose() {disposed = true; surfaceCorrective?.dispose(); lastInput = null; lastBonePose = null; for (const leg of legs) {leg.plant = null; leg.swingFrom = null; leg.lastLanding = null; leg.settling = null;}}
  };
}
