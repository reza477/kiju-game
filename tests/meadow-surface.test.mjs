import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {getMaterial} from '../src/materials.js';
import {paintGround,paintRiver,getRuinMaterial} from '../src/painterly-surfaces.js';
import {WIND_GLSL} from '../src/weather.js';

// Approved migration removes the old packed meadow overlay. These tests cover
// the active replacement's ownership and shader integration, not GPU appearance.
const shader=()=>({vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}});

test('painted ground borrows only owner textures and preserves render configuration',()=>{
  const first=new T.MeshStandardMaterial({color:0x637758,roughness:.91,side:T.FrontSide}),second=first.clone();
  const weights=new T.DataTexture(new Uint8Array(4),1,1),detail=new T.DataTexture(new Uint8Array(4),1,1),otherWeights=weights.clone(),otherDetail=detail.clone();
  const before={color:first.color.getHex(),roughness:first.roughness,side:first.side,depthWrite:first.depthWrite,transparent:first.transparent};
  paintGround(first,{weights,detail});paintGround(second,{weights:otherWeights,detail:otherDetail});
  const a=shader(),b=shader();first.onBeforeCompile(a);second.onBeforeCompile(b);
  assert.equal(a.uniforms.uHabitat.value,weights);assert.equal(a.uniforms.uBrushGrain.value,detail);
  assert.equal(b.uniforms.uHabitat.value,otherWeights);assert.equal(b.uniforms.uBrushGrain.value,otherDetail);
  assert.notEqual(a.uniforms.uHabitat,b.uniforms.uHabitat);
  assert.deepEqual({color:first.color.getHex(),roughness:first.roughness,side:first.side,depthWrite:first.depthWrite,transparent:first.transparent},before);
  assert.match(a.vertexShader,/attribute float groundMoisture/);
  assert.ok(!/transformed\s*[+*\/-]?=/.test(a.vertexShader),'Ground surface hook must not displace functional terrain.');
  assert.ok(!/grassScan|soilScan|uMeadow/.test(a.fragmentShader),'Obsolete meadow sampling must not survive.');
  let disposed=0;for(const texture of[weights,detail])texture.addEventListener('dispose',()=>disposed++);
  first.dispose();assert.equal(disposed,0,'Material disposal must not independently release owner-managed textures.');
  second.dispose();for(const texture of[weights,detail,otherWeights,otherDetail])texture.dispose();
});

test('ground and river keys differ while river clocks and local inputs remain independent',()=>{
  const ground=new T.MeshStandardMaterial(),a=new T.MeshStandardMaterial(),b=new T.MeshStandardMaterial();
  const texture=new T.DataTexture(new Uint8Array(4),1,1),clockA={value:7},clockB={value:11};
  paintGround(ground,{weights:texture,detail:texture});paintRiver(a,clockA,texture,WIND_GLSL);paintRiver(b,clockB,texture,WIND_GLSL);
  const first=shader(),second=shader();a.onBeforeCompile(first);b.onBeforeCompile(second);
  assert.notEqual(ground.customProgramCacheKey(),a.customProgramCacheKey());assert.equal(a.customProgramCacheKey(),b.customProgramCacheKey());
  assert.equal(first.uniforms.uRiverTime,clockA);assert.equal(second.uniforms.uRiverTime,clockB);
  assert.equal(first.uniforms.uRiverBrush.value,texture);clockA.value=23;assert.equal(clockB.value,11);
  assert.match(first.vertexShader,/attribute vec4 riverField/);
  assert.ok(!/riverCentre|riverHalfWidth/.test(first.vertexShader+first.fragmentShader),'Use supplied channel field, not duplicate shoreline equations.');
  for(const material of[ground,a,b])material.dispose();texture.dispose();
});

test('ruin variants reuse shared surfaces without modifying carrier sources or borrowed maps',()=>{
  const oldDocument=globalThis.document,gradient={addColorStop(){}};
  const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]??(()=>{})});
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};
  try{
    for(const kind of['stone','brick','pavement','rock']){
      const source=getMaterial(kind,0xffffff),before={roughness:source.roughness,normal:source.normalScale.toArray(),compile:source.onBeforeCompile,key:source.customProgramCacheKey};
      const variant=getRuinMaterial(kind,0xffffff);
      assert.notEqual(variant,source);assert.equal(getRuinMaterial(kind,0xffffff),variant);assert.equal(variant.userData.shared,true);
      assert.equal(variant.map,source.map);assert.equal(variant.normalMap,source.normalMap);assert.equal(variant.roughnessMap,source.roughnessMap);
      assert.deepEqual({roughness:source.roughness,normal:source.normalScale.toArray(),compile:source.onBeforeCompile,key:source.customProgramCacheKey},before);
      assert.ok(variant.normalScale.x<source.normalScale.x);assert.notEqual(variant.customProgramCacheKey(),source.customProgramCacheKey());
    }
    assert.equal(getRuinMaterial('metal',0xffffff),getMaterial('metal',0xffffff),'Retain existing shared iron preparation material.');
  }finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
