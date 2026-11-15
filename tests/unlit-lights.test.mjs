import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';

// The renderer's light loop is patched once, when presentation.js loads. If a
// three.js update changes that loop, the patch must fail loudly rather than
// silently stop skipping the eight local lights that are dark all day.
test('point and spot lights that do not reach a fragment are skipped; directional lights are untouched', async () => {
  const original = T.ShaderChunk.lights_fragment_begin, call = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  assert.equal(original.split(call).length - 1, 3, 'three.js still evaluates point, spot and directional lights with this call');
  await import('../src/presentation.js');
  const patched = T.ShaderChunk.lights_fragment_begin, guarded = 'if ( directLight.visible ) { ' + call + ' }';
  assert.equal(patched.split(guarded).length - 1, 2, 'point and spot loops are guarded');
  assert.equal(patched.split(call).length - 1, 3, 'no evaluation was removed');
  const directional = patched.slice(patched.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )'));
  assert.equal(directional.includes(guarded), false, 'the sun and rim light always shade');
  assert.equal(patched.replaceAll(guarded, call), original, 'nothing else in the loop changed');
  // three.js itself decides whether a light reaches the fragment.
  for (const name of ['getPointLightInfo', 'getSpotLightInfo']) {
    const body = T.ShaderChunk.lights_pars_begin.slice(T.ShaderChunk.lights_pars_begin.indexOf('void ' + name));
    assert.match(body.slice(0, 900), /light\.visible = \( light\.color != vec3\( 0\.0 \) \);/, name + ' reports an unlit fragment');
  }
});
