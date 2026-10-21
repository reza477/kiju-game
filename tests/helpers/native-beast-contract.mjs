import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../vendor/three.module.js';
import {nativeVisibleTopology,assertConnectedPawRegion} from './native-beast-surface.mjs';

export const NATIVE_KEYS=['frontLeft','frontRight','rearLeft','rearRight'];
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const geometryDigest=geometry=>Object.fromEntries([...Object.entries(geometry.attributes),['index',geometry.index]].map(([name,attribute])=>[name,sha256(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength))]));
export function glbSource(url){
 const bytes=fs.readFileSync(url),length=bytes.readUInt32LE(12),document=JSON.parse(bytes.subarray(20,20+length)),binary=bytes.subarray(28+length);
 const declaredCustom=new Set((document.meshes??[]).flatMap(mesh=>mesh.extras?.nativeQuadruped?.surfaceCorrective?(mesh.primitives??[]).flatMap(p=>Object.entries(p.attributes).filter(([name])=>name.startsWith('_MUSH_')).map(([,id])=>id)):[]));
 function accessor(id){
  const a=document.accessors[id],lanes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],[size,method]=({5121:[1,'readUInt8'],5123:[2,'readUInt16LE'],5125:[4,'readUInt32LE'],5126:[4,'readFloatLE']})[a.componentType];assert.ok(!a.normalized,'Raw native source accessors are not normalized');
  assert.ok(!a.sparse||declaredCustom.has(id),'Sparse data must be a declared CPU corrective attribute');
  assert.ok(a.bufferView!==undefined||declaredCustom.has(id),'Only declared corrective tables may have an implicit zero base');
  const values=new Array(a.count*lanes).fill(0);
  const read=(viewId,offset,count,stride,bytesPerValue,reader)=>{const view=document.bufferViews[viewId];assert.ok(view&&offset>=0&&count>=0);assert.ok(!count||offset+(count-1)*stride+bytesPerValue<=view.byteLength,'Accessor range stays inside its view');return Array.from({length:count},(_,i)=>binary[reader]((view.byteOffset??0)+offset+i*stride));};
  if(a.bufferView!==undefined){const view=document.bufferViews[a.bufferView],stride=view.byteStride??lanes*size;for(let lane=0;lane<lanes;lane++){const component=read(a.bufferView,(a.byteOffset??0)+lane*size,a.count,stride,size,method);for(let i=0;i<a.count;i++)values[i*lanes+lane]=component[i];}}
  if(a.sparse){const sparse=a.sparse;assert.ok(Number.isInteger(sparse.count)&&sparse.count>0&&sparse.count<=a.count);const indexType=({5121:[1,'readUInt8'],5123:[2,'readUInt16LE'],5125:[4,'readUInt32LE']})[sparse.indices.componentType];assert.ok(indexType,'Unsigned sparse indices');const ids=read(sparse.indices.bufferView,sparse.indices.byteOffset??0,sparse.count,indexType[0],indexType[0],indexType[1]);for(let i=0;i<ids.length;i++)assert.ok(ids[i]<a.count&&(i===0||ids[i]>ids[i-1]),'Sparse indices are increasing and in range');for(let lane=0;lane<lanes;lane++){const component=read(sparse.values.bufferView,(sparse.values.byteOffset??0)+lane*size,sparse.count,lanes*size,size,method);for(let i=0;i<ids.length;i++)values[ids[i]*lanes+lane]=component[i];}}
  return values;
 }
 function images(){return(document.images??[]).map(image=>{const view=document.bufferViews[image.bufferView],payload=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);return{mimeType:image.mimeType,sha256:sha256(payload),payload};});}
 return{bytes,document,binary,accessor,images};
}

export function assertNativeDeclaration(instance){
 const meshes=[];instance.body.traverse(object=>{if(object.isSkinnedMesh)meshes.push(object);});assert.equal(meshes.length,1,'One actual connected native skin');
 const mesh=meshes[0],metadata=mesh.userData.nativeQuadruped;assert.equal(metadata?.version,1,'Runtime must select native27, not the old implementation');
 assert.equal(mesh.skeleton.bones.length,27);assert.equal(new Set(mesh.skeleton.bones.map(b=>b.name)).size,27);assert.deepEqual(Object.keys(metadata.chains).sort(),NATIVE_KEYS.slice().sort());
 assert.ok(Number.isFinite(metadata.strideDistance)&&metadata.strideDistance>0);assert.ok(Number.isFinite(metadata.clipDuration)&&metadata.clipDuration>0);
 assert.ok(instance.capabilities.animations.some(clip=>clip.name===metadata.clipName),'Native distance gait has the actual declared source clip');
 assert.equal(instance.clip?.name,metadata.clipName,'Native instance selects its declared distance-driven source clip');
 const bones=new Map(mesh.skeleton.bones.map(bone=>[bone.name,bone])),topology=nativeVisibleTopology(mesh);
 for(const key of NATIVE_KEYS){
  const chain=metadata.chains[key],foot=metadata.feet[key];assert.equal(chain.length,4,key+' retains knee and hock');assert.ok(chain.every(name=>bones.has(name)));
  for(let i=1;i<chain.length;i++)assert.equal(bones.get(chain[i]).parent,bones.get(chain[i-1]),key+' joint hierarchy');
  assertConnectedPawRegion(topology,foot.faces,[foot.sole,foot.strike],key);
  assert.ok(Number.isFinite(foot.stance.start)&&foot.stance.start>=0&&foot.stance.start<1);assert.ok(Number.isFinite(foot.stance.duration)&&foot.stance.duration>0&&foot.stance.duration<1);
 }
 return{mesh,metadata,bones,topology};
}

// Three-link dimensions come independently from the actual inverse bind
// matrices, not from a controller's lengthError or metadata length report.
export function createNativeGeometryVerifier(instance){
 const {mesh,metadata,bones}=assertNativeDeclaration(instance),inverses=mesh.skeleton.boneInverses.map(matrix=>matrix.toArray()),scales=new Map(mesh.skeleton.bones.map(bone=>[bone.name,metadata.bindPose[bone.name].scale]));
 const bindPoints=new Map(mesh.skeleton.bones.map((bone,i)=>[bone.name,new T.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[i].clone().invert())]));
 const rawLengths=Object.fromEntries(NATIVE_KEYS.map(key=>[key,metadata.chains[key].slice(1).map((name,i)=>bindPoints.get(name).distanceTo(bindPoints.get(metadata.chains[key][i])))]));
 const metrics={samples:0,maxLengthErrorMetres:0,maxScaleAnisotropy:0};
 return{mesh,metadata,metrics,check(label){
  instance.root.updateWorldMatrix(true,true);const scale=instance.root.getWorldScale(new T.Vector3()),anisotropy=Math.max(scale.x,scale.y,scale.z)/Math.min(scale.x,scale.y,scale.z)-1;
  metrics.maxScaleAnisotropy=Math.max(metrics.maxScaleAnisotropy,anisotropy);assert.ok(anisotropy<1e-6,'Native whole-body fit stays isotropic at '+label);
  for(const bone of mesh.skeleton.bones){
   assert.deepEqual(bone.scale.toArray(),scales.get(bone.name),'No native bone stretching: '+bone.name+' '+label);
   if(bone.name!==metadata.bodyRoot)assert.deepEqual(bone.position.toArray(),metadata.bindPose[bone.name].position,'Native fixed attachment length: '+bone.name+' '+label);
  }
  for(const key of NATIVE_KEYS){const points=metadata.chains[key].map(name=>bones.get(name).getWorldPosition(new T.Vector3()));for(let i=0;i<3;i++){const expected=rawLengths[key][i]*scale.x,error=Math.abs(points[i].distanceTo(points[i+1])-expected);metrics.maxLengthErrorMetres=Math.max(metrics.maxLengthErrorMetres,error);assert.ok(error<1e-5,key+' link '+i+' changes physical length at '+label+': '+error);}}
  assert.deepEqual(mesh.skeleton.boneInverses.map(matrix=>matrix.toArray()),inverses,'Pose does not rewrite inverse binds');metrics.samples++;return{...metrics};
 }};
}

// A declared surface correction owns mutable rendered positions/normals only.
// Its original geometry, topology, UVs, skin, inverse binds and protected
// vertices remain exact. This does not waive terrain or self-intersection tests.
export function createNativeSurfaceCorrectionVerifier(mesh,sourceGeometry){
 const declaration=mesh.userData.nativeQuadruped?.surfaceCorrective,sourceDigest=geometryDigest(sourceGeometry),mask=declaration?sourceGeometry.attributes[declaration.maskAttribute]:null;
 const bytes=attribute=>Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength),ranges=[];
 if(declaration){assert.equal(declaration.version,1);assert.ok(mask);assert.notEqual(mesh.geometry,sourceGeometry);for(const name of['position','normal'])assert.notEqual(mesh.geometry.attributes[name].array,sourceGeometry.attributes[name].array,'Per-actor mutable '+name);for(const name of Object.keys(mesh.geometry.attributes))assert.ok(!name.startsWith('_mush_'),'CPU-only corrective tables are not renderer VBOs');let start=-1;for(let id=0;id<=mask.count;id++){const protectedVertex=id<mask.count&&mask.getX(id)===0;if(protectedVertex&&start<0)start=id;if(!protectedVertex&&start>=0){ranges.push([start,id]);start=-1;}}}
 let samples=0,changed=false;
 return{check(label){
  if(!declaration){assert.deepEqual(geometryDigest(mesh.geometry),sourceDigest,'Undeclared geometry stays immutable '+label);samples++;return;}
  for(const[name,attribute]of Object.entries(sourceGeometry.attributes))if(!name.startsWith('_mush_')&&!['position','normal'].includes(name)){assert.notEqual(mesh.geometry.attributes[name].array,attribute.array,'Owned GPU buffer '+name);assert.ok(bytes(mesh.geometry.attributes[name]).equals(bytes(attribute)),'Immutable render attribute '+name);}assert.notEqual(mesh.geometry.index.array,sourceGeometry.index.array);assert.ok(bytes(mesh.geometry.index).equals(bytes(sourceGeometry.index)),'Index topology exact');
  for(const name of['position','normal']){const actual=mesh.geometry.attributes[name],reference=sourceGeometry.attributes[name],ab=bytes(actual),rb=bytes(reference);assert.equal(actual.count,reference.count);for(const[start,end]of ranges)assert.ok(ab.subarray(start*12,end*12).equals(rb.subarray(start*12,end*12)),'Protected '+name+' exact '+label);for(let id=0;id<mask.count;id++)if(mask.getX(id)>0)for(let k=0;k<3;k++)assert.ok(Number.isFinite(actual.array[id*3+k]),'Finite corrective '+name);if(name==='position'&&!ab.equals(rb))changed=true;}
  samples++;
 },finish(){assert.deepEqual(geometryDigest(sourceGeometry),sourceDigest,'Loaded source geometry remains immutable');if(declaration)assert.ok(changed,'Declared correction actually changes the rendered surface');return{samples,declared:Boolean(declaration),changed,sourceUnchanged:true};}};
}
