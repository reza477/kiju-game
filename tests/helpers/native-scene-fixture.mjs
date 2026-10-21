import assert from 'node:assert/strict';
import * as T from '../../vendor/three.module.js';
import * as sim from '../../src/simulation.js';
import {makeCity, animateCity} from '../../src/carriers.js';
import {GameScene, placeCity} from '../../src/scene.js';
import {disposeMeshyCarrier} from '../../src/meshy-carriers.js';
import {resolveImpactAnchor} from '../../src/impact-anchor.js';

// Only graphics/camera/environment I/O is stubbed. Every update, effect,
// district, weapon, actor pose and simulation event uses production code.
const noop = () => {};
function sceneContext(state, city, enemy) {
  const scene = Object.create(GameScene.prototype);
  Object.assign(scene, {
    city, enemyCities: [enemy], state, scene: new T.Scene(), camera: new T.PerspectiveCamera(), fx: [],
    cinematic: {mode: 'steady', manualTime: 0, impulse: noop, transition: noop, reset: noop},
    preview: false, view: 'carrier', zoom: 100, lastMode: 'battle', lastEvent: 0,
    focus: new T.Vector3(), sun: new T.DirectionalLight(), rim: new T.DirectionalLight(),
    sunOffset: new T.Vector3(80, 110, 35), labels: [],
    routeLine: new T.Object3D(), destination: new T.Object3D(), selection: new T.Object3D(), coverage: new T.Object3D(),
    cityLighting: {update: noop}, landscape: {interact: noop, update: noop}, atmosphere: {update: noop, emit: noop},
    impactLights: [new T.PointLight(), new T.PointLight()], impactDirection: new T.Vector3(),
    presentation: {enabled: false, render: noop}, environmentReady: false, environmentError: false,
    applyLighting: noop, updateCamera: noop,
  });
  // setFaction normally creates this hidden construction-preview object.
  city.expansionGhost = new T.Object3D(); city.expansionGhost.visible = false;
  scene.scene.add(city.root, enemy.root);
  return scene;
}

function loadedNative(state, cannons = false) {
  state.rings = 2;
  state.buildings = Array.from({length: 20}, (_, slot) => ({
    type: slot === 7 ? 'keep' : cannons ? 'cannon' : 'housing',
    level: cannons ? 1 : 3, remaining: 0,
    ...(cannons && slot !== 7 ? {facing: Math.PI} : {}),
  }));
  state.towerOrder = [7, ...Array.from({length: 20}, (_, slot) => slot).filter(slot => slot !== 7)];
}

function newBattle(player, opponent) {
  const state = sim.createGame(...player), rival = state.enemies.find(enemy => enemy.variant === opponent[1]);
  assert.ok(rival, 'The chosen opponent exists in the real expedition');
  // Preserve the original reported encounter's one-second animation phase by
  // actually ticking the expedition, rather than assigning a synthetic clock.
  for (let frame = 0; frame < 60; frame++) sim.tick(state, 1 / 60, {x: 0, z: 0});
  state.x = rival.x; state.z = rival.z;
  assert.equal(sim.startBattle(state, rival.id), true);
  state.battle.autoFire = false; state.battle.command = 'hold';
  return {state, rival};
}

export function createSceneBattle({player = ['kaiju', 'flesh'], opponent, distance, rear = false, enemyReady = false, districtCannons = false}) {
  const {state, rival} = newBattle(player, opponent), battle = state.battle;
  if (enemyReady) {
    // Let the normal cooldown elapse outside weapon range. No invented impact
    // event, reload override or oversized simulation timestep is required.
    battle.player = {x: -80, z: 0, angle: Math.PI / 2};
    battle.enemy = {x: 80, z: 0, angle: -Math.PI / 2};
    let frames = 0;
    while (battle.enemyReload > 0 && frames++ < 180) sim.tick(state, 1 / 60, {x: 0, z: 0});
    assert.equal(battle.enemyReload, 0);
    assert.equal(battle.events.length, 0, 'Cooldown preparation stays outside attack range');
  }
  // Controlled, legal land positions are fixture initial conditions.
  const enemyZ = 30 + (rear ? -distance : distance), enemyHeading = rear ? 0 : Math.PI;
  battle.player = {x: -60, z: 30, angle: 0}; battle.enemy = {x: -60, z: enemyZ, angle: enemyHeading};
  if (player[1] === 'flesh') loadedNative(state, districtCannons);
  const city = makeCity(player[0], false, 2, player[1]), enemy = makeCity(opponent[0], true, 2, opponent[1]);
  enemy.id = rival.id;
  placeCity(city, -60, 30, 0); placeCity(enemy, -60, enemyZ, enemyHeading);
  animateCity(city, 0, false, 0); animateCity(enemy, 0, false, 0);
  if (opponent[1] === 'flesh') {
    // Reach the same private district builder through a disposable real scene
    // update. This populates the enemy; it does not copy builder implementation.
    const setup = newBattle(['kaiju', 'flesh'], player);
    loadedNative(setup.state); setup.state.time = state.time;
    setup.state.battle.player = {...battle.enemy}; setup.state.battle.enemy = {...battle.player};
    city.id = setup.rival.id;
    GameScene.prototype.update.call(sceneContext(setup.state, enemy, city), setup.state, 0, null);
  }
  const scene = sceneContext(state, city, enemy);
  function present(dt = 1 / 60) {
    const before = sim.serialize(state);
    GameScene.prototype.update.call(scene, state, dt, null);
    assert.equal(sim.serialize(state), before, 'Rendering does not mutate the saved simulation');
  }
  present(0);
  return {
    state, battle, city, enemy, scene, present,
    step(dt = 1 / 60) {sim.tick(state, dt, {x: 0, z: 0}); present(dt);},
    dispose() {
      for (const actor of [city, enemy]) if (actor.meshyCarrier) {
        actor.meshyCarrier.controller?.dispose(); disposeMeshyCarrier(actor.meshyCarrier.instance);
      }
    },
  };
}

function actorPose(actor) {
  const mesh = actor.meshyCarrier?.renderMeshes?.[0];
  return {
    root: actor.root.matrixWorld.toArray(), rig: actor.rig.matrixWorld.toArray(),
    bones: mesh?.skeleton?.bones.map(bone => [bone.position.toArray(), bone.quaternion.toArray(), bone.scale.toArray()]),
    marker: actor.strikeHand?.getWorldPosition(new T.Vector3()).toArray(),
    status: actor.meshyCarrier?.instance?.capabilities?.nativeQuadruped ? actor.meshyCarrier.controller.status() : null,
  };
}
export function assertExactPause(fixture, repeats = 10) {
  const {state, city, enemy, scene} = fixture;
  state.paused = true;
  const saved = sim.serialize(state);
  const signature = () => JSON.stringify({
    city: actorPose(city), enemy: actorPose(enemy),
    effects: scene.fx.filter(effect => !effect.flash).map(effect => ({
      age: effect.age, position: effect.object.getWorldPosition(new T.Vector3()).toArray(),
      rotation: effect.object.quaternion.toArray(), surface: resolveImpactAnchor(effect.anchor).toArray(),
    })),
  });
  const before = signature();
  for (let i = 0; i < repeats; i++) {
    fixture.step();
    assert.equal(sim.serialize(state), saved, 'Paused simulation is unchanged');
    assert.equal(signature(), before, 'Repeated paused scene updates preserve both actual poses and effects exactly');
  }
  state.paused = false;
}

export function visibleCyborgContact(city) {
  const mesh = city.meshyCarrier.renderMeshes[0], geometry = mesh.geometry;
  const source = city.meshyCarrier.arm.contactVertex, used = new Set(geometry.index.array);
  const same = candidate => ['position', 'skinIndex', 'skinWeight'].every(name => {
    const attribute = geometry.attributes[name];
    for (let lane = 0; lane < attribute.itemSize; lane++) if (attribute.array[source * attribute.itemSize + lane] !== attribute.array[candidate * attribute.itemSize + lane]) return false;
    return true;
  });
  const vertex = used.has(source) ? source : [...used].find(same);
  assert.ok(Number.isInteger(vertex), 'The actual rendered cyborg hand includes the controller contact');
  return () => mesh.getVertexPosition(vertex, new T.Vector3()).applyMatrix4(mesh.matrixWorld);
}

const validatedAnchors = new WeakSet();
export function actualAnchorPoint(anchor) {
  assert.ok(anchor?.surface, 'A skinned target uses an actual indexed material anchor');
  const {object, surface} = anchor, geometry = object.geometry;
  if (!validatedAnchors.has(anchor)) {
    assert.ok(object.isSkinnedMesh && geometry.index);
    const indices = geometry.index.array, wanted = surface.indices;
    let offset = -1;
    for (let i = 0; i < indices.length; i += 3) if (indices[i] === wanted[0] && indices[i + 1] === wanted[1] && indices[i + 2] === wanted[2]) {offset = i; break;}
    assert.ok(offset >= geometry.drawRange.start && offset + 2 < geometry.drawRange.start + geometry.drawRange.count, 'The anchor names a drawn triangle');
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const groups = geometry.groups.filter(group => offset >= group.start && offset + 2 < group.start + group.count);
    const used = groups.length ? groups.map(group => materials[group.materialIndex]) : materials;
    assert.ok(used.length && used.every(material => material?.visible && material.opacity > 0), 'The anchored face has a visible material');
    assert.ok(surface.weights.toArray().every(weight => Number.isFinite(weight) && weight >= -1e-8 && weight <= 1 + 1e-8));
    assert.ok(Math.abs(surface.weights.x + surface.weights.y + surface.weights.z - 1) < 1e-8);
    validatedAnchors.add(anchor);
  }
  for (let current = object; current; current = current.parent) assert.notEqual(current.visible, false);
  const point = new T.Vector3();
  for (let lane = 0; lane < 3; lane++) point.addScaledVector(object.getVertexPosition(surface.indices[lane], new T.Vector3()), surface.weights.getComponent(lane));
  return point.applyMatrix4(object.matrixWorld);
}

export function visibleTargetHit(target, start, end) {
  const direction = end.clone().sub(start), length = direction.length();
  if (length < 1e-8) return null;
  target.root.updateMatrixWorld(true);
  const ray = new T.Raycaster(start, direction.divideScalar(length), 1e-7, length + 1e-7);
  return ray.intersectObject(target.root, true).find(hit => {
    for (let object = hit.object; object; object = object.parent) if (!object.visible) return false;
    const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
    return material?.visible && !(material.transparent && material.opacity < .2);
  }) ?? null;
}

export function terminalApproachHit(effect) {
  const point = actualAnchorPoint(effect.anchor), derivative = point.clone().sub(effect.start);
  // Differentiate the actual sin(pi*t) flight arc. Relative material-target
  // velocity cancels at t=1, so this remains valid for a moving target.
  derivative.y -= Math.PI * (effect.missile ? 12 : 3);
  const start = point.clone().addScaledVector(derivative.normalize(), -.5);
  return {point, hit: visibleTargetHit(effect.target, start, point)};
}
