import {after, before, test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import * as sim from '../src/simulation.js';
import {loadMeshyCarriers} from '../src/meshy-carriers.js';
import {resolveImpactAnchor} from '../src/impact-anchor.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {indexedSurfacePoint} from './helpers/native-beast-surface.mjs';
import {createSceneBattle, assertExactPause, visibleCyborgContact, actualAnchorPoint, visibleTargetHit, terminalApproachHit} from './helpers/native-scene-fixture.mjs';

let restore;
before(async () => {restore = installCPUCarrierEnvironment(); await loadMeshyCarriers();});
after(() => restore?.());

test('production scene resolves simultaneous cyborg/native melee against current indexed surfaces and preserves pause', t => {
  const f = createSceneBattle({opponent: ['kaiju', 'cyborg'], distance: 12, enemyReady: true});
  t.after(() => f.dispose());
  assert.equal(sim.fire(f.state), true); sim.tick(f.state, 0, {x: 0, z: 0});
  assert.equal(f.battle.events.length, 2);
  assert.ok(f.battle.events.every(event => event.kind === 'impact'));
  assert.equal(f.battle.events[0].time, f.battle.events[1].time);
  for (const event of f.battle.events) assert.ok(Math.abs(event.impactAt - event.time - .7) < 1e-12, 'Original melee event timing');
  const contact = visibleCyborgContact(f.enemy), mesh = f.city.meshyCarrier.renderMeshes[0];
  let maxPasses = 0, maxResidual = 0, priorIncomingSurface;
  for (let frame = 0; frame <= 78; frame++) {
    if (frame) f.step(); else f.present();
    const outgoing = f.scene.fx.find(effect => effect.kind === 'impact' && effect.source === 'player');
    const incoming = f.scene.fx.find(effect => effect.kind === 'impact' && effect.source === 'enemy');
    assert.ok(outgoing?.anchor && incoming?.anchor, 'Both legal melee events create visible effects and material targets');
    if (f.scene.nativeContactPose) {
      maxPasses = Math.max(maxPasses, f.scene.nativeContactPose.passes);
      maxResidual = Math.max(maxResidual, f.scene.nativeContactPose.residual);
    }
    if (frame === 33) assertExactPause(f);
    if (frame === 41) priorIncomingSurface = actualAnchorPoint(incoming.anchor);
    if (frame === 42) {
      const status = f.city.meshyCarrier.controller.status();
      const nativeClaw = indexedSurfacePoint(mesh, status.strikeSurface), nativeMarker = f.city.strikeHand.getWorldPosition(new T.Vector3());
      const cyborgHand = contact(), cyborgMarker = f.enemy.strikeHand.getWorldPosition(new T.Vector3());
      const outgoingTarget = actualAnchorPoint(outgoing.anchor), incomingTarget = actualAnchorPoint(incoming.anchor);
      assert.ok(nativeClaw.distanceTo(nativeMarker) < .002, 'Actual native claw reaches its unchanged marker');
      assert.ok(cyborgHand.distanceTo(cyborgMarker) < .025, 'Actually indexed cyborg hand reaches its unchanged marker');
      assert.ok(nativeMarker.distanceTo(outgoingTarget) < .001, 'Outgoing marker follows current opponent skin');
      assert.ok(cyborgMarker.distanceTo(incomingTarget) < .001, 'Incoming marker follows current native skin, not the previous frame');
      t.diagnostic(JSON.stringify({nativeContactMetres: nativeClaw.distanceTo(outgoingTarget), cyborgContactMetres: cyborgHand.distanceTo(incomingTarget), nativeTargetMotionMetres: priorIncomingSurface.distanceTo(incomingTarget)}));
    }
  }
  t.diagnostic(JSON.stringify({settlingMaxPasses: maxPasses, settlingMaxResidualMetres: maxResidual}));
});

const projectileCases = [
  {name: 'crawler cannon into loaded native player', opponent: ['crawler', 'standard'], distance: 40, action: 'enemy'},
  {name: 'drill cannon into loaded native player', opponent: ['crawler', 'drill'], distance: 60, action: 'enemy'},
  {name: 'cyborg cannon into loaded native player', opponent: ['kaiju', 'cyborg'], distance: 40, action: 'enemy'},
  {name: 'horizontal airship salvo into loaded native enemy', player: ['airship', 'horizontal'], opponent: ['kaiju', 'flesh'], distance: 60, action: 'salvo'},
  {name: 'vertical airship salvo into loaded native enemy', player: ['airship', 'vertical'], opponent: ['kaiju', 'flesh'], distance: 60, action: 'salvo'},
  {name: 'native rear district cannons into cyborg', opponent: ['kaiju', 'cyborg'], distance: 40, rear: true, action: 'cannons'},
  {name: 'rear cyborg cannon into loaded native player', opponent: ['kaiju', 'cyborg'], distance: 40, rear: true, action: 'enemy'},
  {name: 'rear horizontal airship shot into loaded native player', opponent: ['airship', 'horizontal'], distance: 60, rear: true, action: 'enemy'},
  {name: 'rear vertical airship shot into loaded native player', opponent: ['airship', 'vertical'], distance: 60, rear: true, action: 'enemy'},
];

for (const spec of projectileCases) test('production projectile: ' + spec.name, t => {
  const f = createSceneBattle({...spec, enemyReady: spec.action === 'enemy', districtCannons: spec.action === 'cannons'});
  t.after(() => f.dispose());
  const legalDistrictSlots = spec.action === 'enemy' ? [] : sim.weaponStatus(f.state).batteries.filter(battery => battery.active).map(battery => battery.slot).sort((a, b) => a - b);
  if (spec.action === 'enemy') sim.tick(f.state, 0, {x: 0, z: 0});
  else if (spec.action === 'salvo') assert.equal(sim.ability(f.state).ok, true);
  else {
    assert.ok(sim.weaponStatus(f.state).active > 0, 'Actual district cannon must be legally active');
    assert.equal(sim.fire(f.state), true);
  }
  assert.equal(f.battle.events.length, 1);
  const event = f.battle.events[0], source = spec.action === 'enemy' ? 'enemy' : 'player';
  assert.equal(event.kind, spec.action === 'enemy' ? 'enemyShot' : spec.action === 'salvo' ? 'salvo' : 'shot');
  assert.ok(Math.abs(event.impactAt - event.time - .55) < 1e-12, 'Original projectile event timing');
  assert.deepEqual([...(event.mounts ?? [])].sort((a, b) => a - b), legalDistrictSlots, 'Real fire/ability selects the legally active district batteries');
  const previous = new Map(); let count, districtCount, maxArrival = 0, maxTangent = 0;
  for (let frame = 0; frame <= 36; frame++) {
    if (frame) f.step(); else f.present();
    const effects = f.scene.fx.filter(effect => !effect.flash && effect.source === source && effect.kind === event.kind);
    if (frame === 0) {
      count = effects.length; districtCount = effects.filter(effect => effect.slot !== null).length;
      assert.ok(count > 0, 'Legal attack creates actual projectiles');
      assert.ok(effects.every(effect => effect.actor === (source === 'enemy' ? f.enemy : f.city) && effect.target === (source === 'enemy' ? f.city : f.enemy)));
      assert.deepEqual(effects.filter(effect => effect.slot !== null).map(effect => effect.slot).sort((a, b) => a - b), [...(event.mounts ?? [])].sort((a, b) => a - b), 'Every district battery selected by the real event produces its rendered shot');
      if (spec.action === 'cannons') assert.ok(districtCount > 0, 'At least one actual district cannon fires');
    }
    assert.equal(effects.length, count);
    for (const effect of effects) {
      const actual = actualAnchorPoint(effect.anchor), resolved = resolveImpactAnchor(effect.anchor);
      assert.ok(resolved.distanceTo(actual) < 1e-6, 'Anchor resolution agrees with independently evaluated indexed skin');
      const current = effect.object.getWorldPosition(new T.Vector3()), last = previous.get(effect);
      if (last && frame >= 20 && frame <= 33) {
        const hit = visibleTargetHit(effect.target, last, current);
        assert.ok(!hit || hit.point.distanceTo(actual) <= .001,
          `${spec.name}: visible target face ${hit?.faceIndex} precedes the chosen material anchor on observed segment ${frame}`);
      }
      previous.set(effect, current);
      if (frame >= 33) {
        assert.ok(effect.arrived, 'Projectile arrives at the original .55-second event time');
        const error = current.distanceTo(actual); maxArrival = Math.max(maxArrival, error);
        assert.ok(error < .001, 'Actual projectile reaches its current material anchor');
      }
      if (frame === 33) {
        const {point, hit} = terminalApproachHit(effect);
        assert.ok(hit, 'Actual terminal approach meets visible target geometry');
        const error = hit.point.distanceTo(point); maxTangent = Math.max(maxTangent, error);
        assert.ok(error <= .001, 'An earlier visible surface must not conceal the selected impact anchor');
      }
    }
    if (frame === 20) assertExactPause(f, 5);
  }
  t.diagnostic(JSON.stringify({projectiles: count, districtShots: districtCount, maxArrivalMetres: maxArrival, maxTerminalRayMetres: maxTangent}));
});
