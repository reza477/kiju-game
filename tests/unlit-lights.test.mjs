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
  // A lamp that is switched off is skipped before its direction and falloff are worked out.
  let restored = patched;
  for (const light of ['point', 'spot']) {
    const fetch = `${light}Light = ${light}Lights[ i ];`, dark = `${fetch}\n\t\tif ( ${light}Light.color != vec3( 0.0 ) ) {`;
    assert.equal(patched.split(dark).length - 1, 1, `the ${light} loop tests the lamp's own colour first`);
    const start = restored.indexOf(dark), close = '\n\t\t}\n\t}\n\t#pragma unroll_loop_end', end = restored.indexOf(close, start);
    assert.ok(start >= 0 && end > start, `the ${light} loop's test closes at the end of its turn`);
    const turn = restored.slice(start + dark.length, end);
    assert.ok(turn.includes(`get${light[0].toUpperCase()}${light.slice(1)}LightInfo`) && turn.includes(guarded), 'the test encloses the whole turn');
    restored = restored.slice(0, start) + fetch + turn + '\n\t}\n\t#pragma unroll_loop_end' + restored.slice(end + close.length);
  }
  assert.equal(directional.includes('.color != vec3( 0.0 ) ) {'), false, 'directional lights are not tested');
  assert.equal(restored.replaceAll(guarded, call), original, 'nothing else in the loop changed');
  // three.js unrolls these loops with a pattern; the patched text must still match it, braces balanced.
  const unroll = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
  const sized = text => text.replace(/NUM_POINT_LIGHTS/g, '6').replace(/NUM_SPOT_LIGHTS/g, '2').replace(/NUM_DIR_LIGHTS/g, '2').replace(/NUM_RECT_AREA_LIGHTS/g, '0').replace(/NUM_HEMI_LIGHTS/g, '1');
  const bodies = text => [...sized(text).matchAll(unroll)].map(match => match[3]);
  assert.equal(bodies(patched).length, bodies(original).length, 'every loop is still unrolled');
  for (const body of bodies(patched)) assert.equal((body.match(/{/g) ?? []).length, (body.match(/}/g) ?? []).length, 'each turn is a complete block');
  // three.js itself decides whether a light reaches the fragment, and a
  // colour of zero can only stay zero: it is multiplied by a falloff that
  // the renderer keeps finite.
  for (const name of ['getPointLightInfo', 'getSpotLightInfo']) {
    const body = T.ShaderChunk.lights_pars_begin.slice(T.ShaderChunk.lights_pars_begin.indexOf('void ' + name));
    assert.match(body.slice(0, 900), /light\.visible = \( light\.color != vec3\( 0\.0 \) \);/, name + ' reports an unlit fragment');
    assert.match(body.slice(0, 900), /light\.color (\*)?= [a-zA-Z]+Light\.color/, name + ' starts from the lamp\'s own colour');
  }
  const falloff = T.ShaderChunk.lights_pars_begin.slice(T.ShaderChunk.lights_pars_begin.indexOf('float getDistanceAttenuation'));
  assert.match(falloff.slice(0, 500), /1\.0 \/ max\( pow\( lightDistance, decayExponent \), 0\.01 \)/, 'the distance falloff is bounded');
});
