import test from 'node:test';
import {cpuImageBitmap} from './beast-integration-cpu.mjs';
import {createNativeGeometryVerifier,assertNativeDeclaration} from './helpers/native-beast-contract.mjs';
import {indexedSurfacePoint} from './helpers/native-beast-surface.mjs';
import {resolveImpactAnchor} from '../src/impact-anchor.js';
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

const transform = object => [object.position.toArray(), object.quaternion.toArray(), object.scale.toArray()];
const variants = [['crawler', 'standard'], ['crawler', 'drill'], ['kaiju', 'flesh'], ['kaiju', 'cyborg'], ['airship', 'horizontal'], ['airship', 'vertical']];
// Include both sides of the late support-elbow transition. Endpoints alone
// miss geometry that crosses a deck between reach, contact and recovery.
// Dense strike checks exposed shoulder/deck crossings during recovery frames62–65.
const loadedStrikeFrames=Array.from({length:91},(_,frame)=>frame);
const assetsPresent = ['flesh', 'cyborg'].every(kind => fs.existsSync(new URL('../assets/carriers/meshy/' + kind + '.glb', import.meta.url)));

test('actual native quadruped claw reaches all six original impact surfaces without stretching or intersecting its 20 occupied decks', {skip: !assetsPresent && 'Production Meshy carrier assets unavailable'}, async t => {
  const restore = cpuBrowser();
  try {
    const {loadMeshyCarriers} = await import('../src/meshy-carriers.js'); await loadMeshyCarriers();
    const {makeCity, animateCity, setCityRings} = await import('../src/carriers.js'), {placeCity, GameScene} = await import('../src/scene.js'), sim = await import('../src/simulation.js');
    // AI approaches to range minus 0.5m; manual attacks can fire at the exact legal boundary.
    for (const rangeInset of [.5, 0]) for (const [faction, variant] of variants) await t.test(variant + ' at range minus ' + rangeInset + 'm', context => {
      const state=sim.createGame('kaiju','flesh');state.rings=2;
      const added=state.buildings.flatMap((building,slot)=>building?[]:[slot]);
      for(const slot of added)state.buildings[slot]={type:'housing',level:1,remaining:0};
      state.towerOrder.push(...added);
      const city = makeCity('kaiju', false, state.rings, 'flesh'), enemy = makeCity(faction, true, 1, variant);
      setCityRings(city,state.rings,state.buildings,state.towerOrder);assert.equal(city.saddleLayout.floors.length,20,'All20 production deck slabs must be occupied during the strike');
      const reach = sim.meleeReach('kaiju', faction, 'flesh', variant); enemy.id = 'cpu-target';
      placeCity(city, -60, 30, 0); placeCity(enemy, -60, 30 + reach - rangeInset, Math.PI);
      animateCity(city, 0, false, 0); animateCity(enemy, 0, false, 0);
      assert.equal(city.meshyCarrier?.kind, 'flesh');
      if (faction === 'kaiju') assert.equal(enemy.meshyCarrier?.kind, variant, 'Test must use imported target, not fallback anatomy');
      const {instance, controller} = city.meshyCarrier, mesh = instance.body.getObjectByProperty('isSkinnedMesh', true);
      const native=assertNativeDeclaration(instance),nativeVerifier=createNativeGeometryVerifier(instance);
      assert.equal(city.strikeContactTime,.7);assert.equal(city.strikeDuration,1.3);
      // Observe the production call, forwarding it unchanged. The verifier
      // must not reconstruct the attack timing or assume a neutral-only pole.
      const originalUpdate=controller.update;let observedStrikeWeight=0,observedArgs=null;
      controller.update=function(args){observedStrikeWeight=args.strikeWeight??0;observedArgs=args;return originalUpdate.call(this,args);};
      const inverseBinds = mesh.skeleton.boneInverses.map(matrix => matrix.toArray());
      state.time = 1;
      state.battle = {time: 0, enemyId: enemy.id, player: {x: -60, z: 30}, enemy: {x: -60, z: 30 + reach - rangeInset}};
      const beforeSave = sim.serialize(state);
      const harness = {city, enemyCities: [enemy], state, scene: new T.Scene(), fx: [], cinematic: {mode: 'steady', impulse() {}}};
      GameScene.prototype.createEffect.call(harness, {kind: 'impact', source: 'player', time: 0, from: state.battle.player, to: state.battle.enemy, mounts: []});
      assert.ok(city.strikeTarget?.isVector3, 'Original surface raycast must produce the impact anchor');
      const effect=harness.fx.find(item=>item.kind==='impact');assert.ok(effect?.anchor);
      const target = city.strikeTarget.clone(); let contactChecked = false,loadedStrikeSamples=0,airborneSamples=0,landedSamples=0;
      for (let frame = 0; frame <= 90; frame++) {
        const time = 1 + frame / 60;
        // Match battle rendering: animated target surface, then the attacker.
        animateCity(enemy,time,true,0);resolveImpactAnchor(effect.anchor,target);city.strikeTarget.copy(target);
        animateCity(city, time, false, 0);
        const support=controller.status();
        if(support.airborne){
          airborneSamples++;assert.ok(support.legs.every(leg=>!leg.planted&&leg.plantWorld===null),'A leap must release actual support witnesses');
        }else if(frame>80){
          landedSamples++;assert.ok(support.legs.filter(leg=>leg.planted).length>=3,'A completed bound regains at least three real support contacts during any final rest step');
          for(const leg of support.legs)if(leg.planted)assert.ok(leg.soleError<.001,'Landing returns to real connected skin contacts');
        }
        if (loadedStrikeFrames.includes(frame)) {
          city.root.updateMatrixWorld(true);
          const counts=saddleSlabCollisions(visibleSkinVerticesInRig(mesh,city.rig),mesh.geometry.index.array,.12);
          assert.deepEqual(counts,Array(20).fill(0),variant+' actual visible skin violates20 occupied slab clearance at strike-frame-'+frame+'; counts by tier '+JSON.stringify(counts));loadedStrikeSamples++;
        }
        nativeVerifier.check(variant+' strike-frame-'+frame);
        if (frame !== 42) continue;
        const status=controller.status(),marker=city.strikeHand.getWorldPosition(new T.Vector3());
        assert.ok(status.strikeSurface,'Controller exposes the actual indexed claw witness');
        const actual=indexedSurfacePoint(mesh,status.strikeSurface,native.topology);
        assert.equal(observedStrikeWeight,1,'Original impact event reaches its unchanged contact phase');
        assert.ok(actual.distanceTo(marker) < .002, variant + ' actual claw error ' + actual.distanceTo(marker));
        assert.ok(Math.abs(actual.distanceTo(marker) - status.strikeError) < 1e-8);
        assert.ok(marker.distanceTo(target) < .001, 'Original rig marker still reaches its unchanged target');
        const fixed = [city.root, city.rig, city.strikeHand, instance.root], transforms = fixed.map(transform);
        controller.update({...observedArgs,time: time + .000001});
        assert.deepEqual(fixed.map(transform), transforms, 'Body-only fit must not move original rig, root or strike marker');
        assert.deepEqual(city.strikeTarget, target); contactChecked = true;
      }
      assert.ok(contactChecked);assert.equal(landedSamples,10); assert.equal(sim.serialize(state), beforeSave);
      assert.deepEqual(mesh.skeleton.boneInverses.map(matrix => matrix.toArray()), inverseBinds);
      assert.equal(loadedStrikeSamples,loadedStrikeFrames.length);context.diagnostic(JSON.stringify({variant,rangeInset,loadedStrikeSamples,airborneSamples,landedSamples,occupiedDecks:20,marginRigUnits:.12,marginWorldUnits:.066}));
      controller.update=originalUpdate;controller.dispose(); enemy.meshyCarrier?.controller?.dispose();
    });
  } finally {restore();}
});
