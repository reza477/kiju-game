import * as T from '../vendor/three.module.js';

const ease = (a, b, x) => {const t = T.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t);};

function clawPoint(city) {
  const mesh = city.meshyCarrier.renderMeshes[0], surface = mesh.userData.nativeQuadruped.feet.frontRight.strike;
  city.root.updateMatrixWorld(true); mesh.skeleton.update();
  const point = new T.Vector3(), vertex = new T.Vector3();
  for (let corner = 0; corner < 3; corner++) {
    mesh.getVertexPosition(mesh.geometry.index.getX(surface.triangle * 3 + corner), vertex).applyMatrix4(mesh.matrixWorld);
    point.addScaledVector(vertex, surface.barycentric[corner]);
  }
  return point;
}

export function createNativeQuadrupedCityPose(city) {
  if (!city.meshyCarrier?.instance.capabilities.nativeQuadruped) return false;
  const marker = new T.Object3D(); marker.name = 'native-quadruped-strike-marker'; city.root.add(marker);
  city.strikeHand = marker;
  city.root.updateMatrixWorld(true);
  const hips = city.meshyCarrier.renderMeshes[0].skeleton.bones.find(bone => bone.name === 'Hips');
  if (!hips) throw new Error('Native quadruped hip pivot is missing');
  const hipPivot = city.rig.worldToLocal(hips.getWorldPosition(new T.Vector3()));
  const mesh = city.meshyCarrier.renderMeshes[0];
  const shoulder = mesh.skeleton.bones.find(bone => bone.name === mesh.userData.nativeQuadruped.chains.frontRight[0]);
  if (!shoulder) throw new Error('Native quadruped striking shoulder is missing');
  city.nativeQuadrupedPresentation = {version: 7, strike: null, hipPivot, shoulder, flight: null};
  marker.position.copy(city.root.worldToLocal(clawPoint(city)));
  return true;
}

export function animateNativeQuadrupedCityPose(city, time) {
  const pose = city.nativeQuadrupedPresentation;
  if (!pose) throw new Error('Native quadruped city presentation is not initialized');
  city.root.updateWorldMatrix(true, false);
  const input = [time, city.strikeTime, city.strikeContactTime, city.strikeDuration,
    city.strikeTarget?.x ?? null, city.strikeTarget?.y ?? null, city.strikeTarget?.z ?? null, ...city.root.matrixWorld.elements];
  // The reach estimate reads the last solved shoulder. Re-rendering an exact
  // paused input must retain the first resolved presentation, not feed that
  // solved pose back into another displacement calculation.
  if (pose.lastInput && input.every((value, i) => value === pose.lastInput[i])) return;
  // The native body controller owns four-legged ground support. The old
  // humanoid hip pivot, arm crouch and two-foot strike lunge do not apply.
  // All saddle mounts remain in their original rig frame; actor state is fixed.
  city.rig.position.set(0, 0, 0); city.rig.rotation.set(0, 0, 0);
  city.root.updateMatrixWorld(true);
  const age = time - city.strikeTime, contact = city.strikeContactTime ?? .7, end = city.strikeDuration ?? 1.3;
  const active = age >= 0 && age < end && city.strikeTarget?.isVector3;
  city.strikePhase = !active ? 'idle' : age < .22 ? 'windup' : age < contact ? 'reach' : age < contact + .22 ? 'contact' : 'recovery';
  if (!active) {
    pose.strike = null; pose.flight = null; pose.lastInput = input; city.strikeContactError = Infinity;
    city.strikeHand.position.copy(city.root.worldToLocal(clawPoint(city)));
    return;
  }
  if (pose.strike?.time !== city.strikeTime) {
    const shoulder = pose.shoulder.getWorldPosition(new T.Vector3()), delta = city.strikeTarget.clone().sub(shoulder), rise = delta.y;
    const mesh = city.meshyCarrier.renderMeshes[0], chain = mesh.userData.nativeQuadruped.chains.frontRight.map(name => mesh.skeleton.bones.find(bone => bone.name === name));
    const joints = chain.map(bone => bone.getWorldPosition(new T.Vector3()));
    const reach = joints.slice(1).reduce((sum, point, i) => sum + point.distanceTo(joints[i]), 0) + clawPoint(city).distanceTo(joints[3]);
    pose.strike = {time: city.strikeTime, startLocal: city.root.worldToLocal(clawPoint(city)),
      braceAngle: .02 + .04 * ease(0, 4, rise), reach, leap: null, launch: .22};
  }
  // Gameplay permits changing movement commands after firing. Resolve reach
  // against the refreshed actual target in the current actor frame, so a
  // retreating target cannot outrun a cached visual displacement.
  const delta = city.strikeTarget.clone().sub(pose.shoulder.getWorldPosition(new T.Vector3()));
  if (pose.strike.leap || delta.length() > pose.strike.reach - .5) {
    if (!pose.strike.leap) pose.strike.launch = Math.min(Math.max(.22, age), contact - .1);
    const usable = pose.strike.reach - 1, fraction = Math.max(0, 1 - usable / delta.length());
    const leap = delta.clone().multiplyScalar(fraction); leap.y = Math.max(.7, leap.y + .35);
    const horizontal = Math.hypot(delta.x, delta.z), vertical = delta.y - leap.y;
    const horizontalReach = Math.sqrt(Math.max(0, usable * usable - vertical * vertical));
    const advance = Math.max(Math.hypot(leap.x, leap.z), horizontal - horizontalReach);
    if (horizontal > 1e-8) {leap.x = delta.x / horizontal * advance; leap.z = delta.z / horizontal * advance;}
    pose.strike.leap = leap;
  }
  // A 1.15–3.44 degree brace follows target height: low targets retain the
  // shallow brace, while overhead targets raise the shoulder without
  // lengthening the limb. The three support paws retain their world plants.
  // The carried saddle moves with the body, preserving every local mount.
  const brace = ease(.14, .55, age) * (1 - ease(contact + .22, end, age));
  city.rig.rotation.x = -pose.strike.braceAngle * brace;
  city.rig.position.copy(pose.hipPivot).sub(pose.hipPivot.clone().applyQuaternion(city.rig.quaternion));
  const launch = pose.strike.launch, landing = end, progress = T.MathUtils.clamp((age - launch) / (landing - launch), 0, 1);
  const airborne = Boolean(pose.strike.leap && age > launch && age < landing);
  pose.flight = airborne ? {active: true, progress, tuck: .45 * Math.sin(Math.PI * progress)} : null;
  if (pose.strike.leap) {
    const envelope = ease(launch, contact, age) * (1 - ease(contact + .12, landing, age));
    const parentOrigin = city.rig.parent.getWorldPosition(new T.Vector3());
    const localOffset = city.rig.parent.worldToLocal(parentOrigin.clone().addScaledVector(pose.strike.leap, envelope));
    city.rig.position.add(localOffset);
  }
  city.root.updateMatrixWorld(true);
  const start = city.root.localToWorld(pose.strike.startLocal.clone());
  const forward = new T.Vector3(0, 0, 1).applyQuaternion(city.root.getWorldQuaternion(new T.Quaternion())); forward.y = 0; forward.normalize();
  const windup = start.clone().add(new T.Vector3(0, 1.6, 0)).addScaledVector(forward, -.5);
  let goal = age < .22 ? start.clone().lerp(windup, ease(0, .22, age)) : windup.clone().lerp(city.strikeTarget, ease(.22, contact, age));
  const release = ease(contact + .22, end, age);
  if (release > 0) goal = city.strikeTarget.clone().lerp(start, release);
  city.strikeHand.position.copy(city.root.worldToLocal(goal));
  pose.lastInput = input;
  city.root.updateMatrixWorld(true);
}

export function finishNativeQuadrupedCityPose(city) {
  if (city.strikePhase !== 'idle') city.strikeContactError = clawPoint(city).distanceTo(city.strikeTarget);
}
