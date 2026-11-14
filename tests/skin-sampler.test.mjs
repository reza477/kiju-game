import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {createSkinSampler} from '../src/skin-sampler.js';

// The paw-clearance solve feeds on these positions, so the sampler has to
// return exactly what three.js returns, not merely something close.
test('skin sampler reproduces SkinnedMesh.getVertexPosition exactly through walking and a strike', async () => {
  const restore = installCPUCarrierEnvironment(); let assets, city, enemy;
  try {
    assets = await import('../src/meshy-carriers.js'); await assets.loadMeshyCarriers();
    const {makeCity, animateCity} = await import('../src/carriers.js'), {placeCity, GameScene} = await import('../src/scene.js'), sim = await import('../src/simulation.js');
    city = makeCity('kaiju', false, 1, 'flesh'); placeCity(city, 0, 0, 0);
    const mesh = city.meshyCarrier.renderMeshes[0], sampler = createSkinSampler(mesh), metadata = mesh.userData.nativeQuadruped;
    const count = mesh.geometry.attributes.position.count, ids = [];
    for (let id = 0; id < count; id += 97) ids.push(id);
    for (const foot of Object.values(metadata.feet)) for (let i = 0; i < foot.groundSampleVertices.length; i += 53) ids.push(foot.groundSampleVertices[i]);
    const expected = new T.Vector3(), actual = new T.Vector3(); let compared = 0;
    const compare = label => {
      city.root.updateMatrixWorld(true); sampler.sync();
      for (const id of ids) {
        mesh.getVertexPosition(id, expected).applyMatrix4(mesh.matrixWorld); sampler.worldPosition(id, actual);
        assert.ok(Object.is(actual.x, expected.x) && Object.is(actual.y, expected.y) && Object.is(actual.z, expected.z), `vertex ${id} at ${label}: ${actual.toArray()} versus ${expected.toArray()}`);
        compared++;
      }
    };
    let z = 0;
    for (let frame = 0; frame < 150; frame++) {
      const moving = frame >= 10 && frame < 120, heading = .3 * Math.sin(frame / 40); if (moving) z += .12;
      placeCity(city, Math.sin(heading) * 2, z, heading); animateCity(city, frame / 60, moving, 0);
      if (frame % 15 === 0) compare('gait frame ' + frame);
    }
    const state = sim.createGame('kaiju', 'flesh'), reach = sim.meleeReach('kaiju', 'crawler', 'flesh', 'standard');
    enemy = makeCity('crawler', true, 1, 'standard'); enemy.id = 'sampler-target';
    placeCity(city, -60, 30, 0); placeCity(enemy, -60, 30 + reach - .5, Math.PI); animateCity(city, 10, false, 0); animateCity(enemy, 10, false, 0);
    state.time = 11; state.battle = {time: 0, enemyId: enemy.id, player: {x: -60, z: 30}, enemy: {x: -60, z: 30 + reach - .5}};
    GameScene.prototype.createEffect.call({city, enemyCities: [enemy], state, scene: new T.Scene(), fx: [], cinematic: {mode: 'steady', impulse() {}}}, {kind: 'impact', source: 'player', time: 0, from: state.battle.player, to: state.battle.enemy, mounts: []});
    for (let frame = 0; frame <= 78; frame++) {animateCity(city, 11 + frame / 60, false, 0); if (frame % 13 === 0) compare('strike frame ' + frame);}
    assert.ok(compared > 10000, 'compared ' + compared + ' positions');
  } finally {
    for (const value of [city, enemy]) if (value?.meshyCarrier) {value.meshyCarrier.controller?.dispose(); assets.disposeMeshyCarrier(value.meshyCarrier.instance);}
    restore();
  }
});
