import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalRuntimeBytes} from '../../scripts/build-mobile-release.mjs';

const asset='/assets/beast-integration/titanhorn-rigged.glb';
const sourceRoot=fileURLToPath(new URL('../..',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

// Opt-in coverage for the current native beast, independently of the retained
// older carrier export check. This reads the frozen release; it never builds it.
export async function nativeBeastOfflineEvidence(output,descriptor){
  const manifest=[];
  for(const url of [asset,'/src/meshy-carriers.js','/src/meshy-monster.js','/src/meshy-monster-city.js','/src/monster-quadruped-pose.js','/src/saddle-harness.js','/src/flesh-saddle-profile.js']){
    const row=descriptor.files.find(file=>file.url===url);assert.ok(row,'Release omitted current native beast input '+url);
    const source=canonicalRuntimeBytes(url,await fs.readFile(path.join(sourceRoot,url.slice(1))));
    const emitted=await fs.readFile(path.join(output,url.slice(1)));
    assert.deepEqual(emitted,source,'Frozen native beast input differs from source '+url);
    assert.equal(row.bytes,emitted.length);assert.equal(row.sha256,hash(emitted));manifest.push({...row});
  }
  const bytes=await fs.readFile(path.join(output,asset.slice(1)));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
  const declaration=gltf.meshes.map(mesh=>mesh.extras?.nativeQuadruped).find(Boolean);
  assert.equal(declaration?.version,1,'Active beast must declare its native quadruped rig');
  assert.ok(gltf.animations.some(clip=>clip.name===declaration.clipName));
  assert.equal(gltf.skins.length,1);
  const boneNames=gltf.skins[0].joints.map(index=>gltf.nodes[index].name).sort();
  assert.equal(boneNames.length,27,'The active native beast is the inspected 27-joint export');
  const loader=await fs.readFile(path.join(output,'src/meshy-carriers.js'),'utf8');
  assert.ok(loader.includes("flesh: '.."+asset+"'"),'Frozen loader must select the verified native beast asset');
  return {enabled:true,buildId:descriptor.buildId,asset,manifest,rig:{boneNames,clipName:declaration.clipName},phases:[]};
}

export async function verifyNativeBeastOffline(page,evidence,phase,{offline=false}={}){
  const actual=await page.evaluate(async expected=>{
    const game=window.__colossus,scene=game.scene,actor=scene.city.meshyCarrier;
    const status=(await import('/src/meshy-carriers.js')).meshyCarriersStatus().assets.find(row=>row.kind==='flesh');
    const meshes=(actor?.renderMeshes??[]).map(mesh=>({skinned:mesh.isSkinnedMesh===true,
      boneNames:mesh.skeleton?.bones.map(bone=>bone.name).sort(),nativeVersion:mesh.userData.nativeQuadruped?.version,
      inScene:scene.scene.getObjectByProperty('uuid',mesh.uuid)===mesh,finite:mesh.matrixWorld.elements.every(Number.isFinite)}));
    const cachesFound=[];
    for(const name of await caches.keys()){
      if(name!=='colossus-wake-release-'+expected.buildId&&!name.startsWith('colossus-wake-release-'+expected.buildId+'-repair-'))continue;
      const cache=await caches.open(name),marker=await cache.match('/__colossus_cache_complete__');
      if(!marker||(await marker.json()).buildId!==expected.buildId)continue;
      const files=[];
      for(const file of expected.manifest){
        const response=await cache.match(file.url);if(!response){files.push({url:file.url,missing:true});continue;}
        const bytes=await response.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
        files.push({url:file.url,bytes:bytes.byteLength,sha256:[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join(''),type:response.headers.get('content-type')});
      }
      cachesFound.push({name,files});
    }
    return {online:navigator.onLine,variant:game.state.variant,kind:actor?.kind,
      clipName:actor?.instance.clip?.name,triangles:scene.renderer.info.render.triangles,
      contextLost:scene.renderer.getContext().isContextLost(),status,meshes,caches:cachesFound};
  },{buildId:evidence.buildId,manifest:evidence.manifest});
  evidence.phases.push({phase,checkedAt:new Date().toISOString(),...actual});
  if(offline)assert.equal(actual.online,false,'Native beast reopen must use offline browser networking');
  assert.equal(actual.variant,'flesh');assert.equal(actual.kind,'flesh');
  assert.equal(actual.status?.state,'ready');assert.equal(actual.status.error,null);
  assert.equal(actual.status.capabilities.nativeQuadruped.version,1);
  assert.equal(actual.clipName,evidence.rig.clipName);assert.equal(actual.contextLost,false);assert.ok(actual.triangles>0);
  assert.equal(actual.meshes.length,1);
  for(const mesh of actual.meshes){assert.equal(mesh.skinned,true);assert.equal(mesh.nativeVersion,1);assert.equal(mesh.inScene,true);assert.equal(mesh.finite,true);assert.deepEqual(mesh.boneNames,evidence.rig.boneNames);}
  assert.ok(actual.caches.length>0,'No complete cache contains the active native beast');
  for(const cache of actual.caches)for(const expected of evidence.manifest){
    const cached=cache.files.find(file=>file.url===expected.url);assert.ok(cached&&!cached.missing,'Native beast cache input missing '+expected.url);
    for(const key of ['bytes','sha256','type'])assert.equal(cached[key],expected[key],phase+': native beast cache '+key+' mismatch');
  }
  return phase+': current native beast and saddle inputs match complete-cache bytes; the actual scene owns the valid 27-joint native actor';
}
