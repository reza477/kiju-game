import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {createMeshyMonsterPose} from '../src/meshy-monster.js';

// Historical implementation guard. This archived V13 is deliberately not the
// runtime beast, and its private contact pool is not a native27 requirement.
test('legacy V13 contact pool excludes appended fully weighted display vertices',async()=>{
 const restore=installCPUCarrierEnvironment();let baseline,candidate,original,altered,mesh,gltf;
 try{
  const bytes=fs.readFileSync(new URL('../asset-sources/legacy-titanhorn-v13/titanhorn-v13.glb',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'b61609b1cb0756759fe968e612ac15a70480d39998dd14a83e560357c4a3d762');
  gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');mesh=gltf.scene.getObjectByProperty('isSkinnedMesh',true);
  original=mesh.geometry;original.userData.sourceContactVertices=mesh.userData.sourceContactVertices;assert.equal(original.userData.sourceContactVertices,85568);
  const root=new T.Group();root.add(gltf.scene);const instance={body:gltf.scene,root,capabilities:{animations:[]}};
  baseline=createMeshyMonsterPose(instance,{groundHeight:()=>0,strideDistance:8.8});const before=baseline.status(),tip=before.strikeVertexIndex;
  altered=original.clone();
  for(const [name,attribute]of Object.entries(original.attributes)){
   const values=new attribute.array.constructor(attribute.array.length+attribute.itemSize*3);values.set(attribute.array);
   for(let i=0;i<3;i++)for(let lane=0;lane<attribute.itemSize;lane++)values[attribute.array.length+i*attribute.itemSize+lane]=attribute.getComponent(tip,lane);
   if(name==='position')for(let i=0;i<3;i++){const at=attribute.array.length+i*3;values[at]+=(i-1)*.1;values[at+1]-=.3+(i===1?.03:0);values[at+2]+=1;}
   altered.setAttribute(name,new T.BufferAttribute(values,attribute.itemSize,attribute.normalized));
  }
  const first=original.attributes.position.count;altered.setIndex([...original.index.array,first,first+1,first+2]);mesh.geometry=altered;
  candidate=createMeshyMonsterPose(instance,{groundHeight:()=>0,strideDistance:8.8});assert.equal(candidate.status().strikeVertexIndex,tip);assert.deepEqual(candidate.status().legs.map(leg=>leg.soleSamples),before.legs.map(leg=>leg.soleSamples));
 }finally{
  baseline?.dispose();candidate?.dispose();if(mesh)mesh.geometry=original;altered?.dispose();
  const disposed=new Set();gltf?.scene.traverse(object=>{for(const value of [object.geometry,...[object.material].flat()])if(value&&!disposed.has(value)){disposed.add(value);value.dispose?.();}});restore();
 }
});
