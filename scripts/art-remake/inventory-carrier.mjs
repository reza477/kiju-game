import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
const {values:args}=parseArgs({options:{repo:{type:'string'},input:{type:'string'},output:{type:'string'}}});
const repo=path.resolve(args.repo??fileURLToPath(new URL('../../',import.meta.url)));
if(!args.output)throw Error('Usage: node inventory-carrier.mjs --repo ROOT --input GLB --output JSON');
const T=await import(pathToFileURL(path.join(repo,'vendor/three.module.js')));
const {GLTFLoader}=await import(pathToFileURL(path.join(repo,'vendor/GLTFLoader.js')));
const destination=path.resolve(args.output);if(fs.existsSync(destination))throw Error('Choose a fresh output filename');
fs.mkdirSync(path.dirname(destination),{recursive:true});

const source=pathToFileURL(path.resolve(args.input??path.join(repo,'assets/carriers/meshy/flesh.glb'))),input=fs.readFileSync(source),length=input.readUInt32LE(12),document=JSON.parse(input.subarray(20,20+length));
for(const material of document.materials||[]){delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;delete material.pbrMetallicRoughness?.baseColorTexture;delete material.pbrMetallicRoughness?.metallicRoughnessTexture;}
const encoded=Buffer.from(JSON.stringify(document)),json=Buffer.alloc((encoded.length+3)&~3,32);encoded.copy(json);const binary=input.subarray(20+length),output=Buffer.alloc(20+json.length+binary.length);input.copy(output,0,0,20);output.writeUInt32LE(output.length,8);output.writeUInt32LE(json.length,12);json.copy(output,20);binary.copy(output,20+json.length);
const gltf=await new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength),'');gltf.scene.updateMatrixWorld(true);
const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
const vector=new T.Vector3(),world=new T.Vector3(),bonePoint=new T.Vector3(),boxJSON=box=>box.isEmpty()?null:{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new T.Vector3()).toArray()};
const report={generatedAt:new Date().toISOString(),source:{path:source.pathname,bytes:input.length,sha256:createHash('sha256').update(input).digest('hex')},method:'CPU GLTFLoader on untouched GLB bytes, material image references removed only in memory. Dominant bone is the largest actual decoded skin weight. Bone-local bounds transform source mesh vertices through bind mesh matrixWorld and inverse bone matrixWorld. Original assets/runtime are unmodified.',meshes:meshes.map(mesh=>{
 const bones=mesh.skeleton.bones,position=mesh.geometry.attributes.position,skinIndex=mesh.geometry.attributes.skinIndex,skinWeight=mesh.geometry.attributes.skinWeight;
 const accum=bones.map(bone=>({bone,worldToLocal:bone.matrixWorld.clone().invert(),meshBox:new T.Box3(),boneBox:new T.Box3(),strongBox:new T.Box3(),weightedSum:new T.Vector3(),count:0,strongCount:0,weightSum:0,minWeight:Infinity,maxWeight:0}));
 for(let i=0;i<position.count;i++){
  let axis=0;for(let j=1;j<skinWeight.itemSize;j++)if(skinWeight.getComponent(i,j)>skinWeight.getComponent(i,axis))axis=j;
  const weight=skinWeight.getComponent(i,axis),id=skinIndex.getComponent(i,axis),a=accum[id];if(!a)throw Error('Unknown bone '+id);
  vector.fromBufferAttribute(position,i);world.copy(vector).applyMatrix4(mesh.matrixWorld);bonePoint.copy(world).applyMatrix4(a.worldToLocal);a.meshBox.expandByPoint(vector);a.boneBox.expandByPoint(bonePoint);a.weightedSum.addScaledVector(bonePoint,weight);a.count++;a.weightSum+=weight;a.minWeight=Math.min(a.minWeight,weight);a.maxWeight=Math.max(a.maxWeight,weight);if(weight>=.75){a.strongBox.expandByPoint(bonePoint);a.strongCount++;}
 }
 return{name:mesh.name,sourceVertices:position.count,triangles:(mesh.geometry.index?.count??position.count)/3,meshBindWorldMatrix:mesh.matrixWorld.toArray(),bindMatrix:mesh.bindMatrix.toArray(),jointCount:bones.length,bones:accum.map((a,index)=>({index,name:a.bone.name,parent:a.bone.parent?.name??null,parentIndex:bones.indexOf(a.bone.parent),children:a.bone.children.filter(o=>o.isBone).map(o=>({name:o.name,index:bones.indexOf(o)})),bindLocalPosition:a.bone.position.toArray(),bindLocalQuaternion:a.bone.quaternion.toArray(),bindLocalScale:a.bone.scale.toArray(),bindWorldPosition:new T.Vector3().setFromMatrixPosition(a.bone.matrixWorld).toArray(),bindWorldMatrix:a.bone.matrixWorld.toArray(),inverseBindMatrix:mesh.skeleton.boneInverses[index].toArray(),dominantVertexCount:a.count,dominantWeightSum:a.weightSum,dominantWeightRange:a.count?[a.minWeight,a.maxWeight]:null,dominantMeshLocalBounds:boxJSON(a.meshBox),dominantBoneLocalBounds:boxJSON(a.boneBox),dominantWeightedBoneLocalCentroid:a.weightSum?a.weightedSum.divideScalar(a.weightSum).toArray():null,strongDominantVertexCount:a.strongCount,strongDominantBoneLocalBounds:boxJSON(a.strongBox)}))};
})};
fs.writeFileSync(destination,JSON.stringify(report,null,2));console.log(JSON.stringify({source:report.source,meshes:report.meshes.map(m=>({name:m.name,vertices:m.sourceVertices,triangles:m.triangles,joints:m.jointCount,bones:m.bones.map(b=>({index:b.index,name:b.name,parent:b.parent,bindWorldPosition:b.bindWorldPosition,vertices:b.dominantVertexCount}))}))},null,2));

