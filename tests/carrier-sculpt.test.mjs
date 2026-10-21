import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {sculptFleshGeometry,fleshContactBoneIndices} from '../src/carrier-sculpt.js';
import {fleshSculptFixture} from './helpers/carrier-sculpt-fixture.mjs';

const hash = array => createHash('sha256').update(new Uint8Array(array.buffer,array.byteOffset,array.byteLength)).digest('hex');
const point = (attribute,i) => [attribute.getX(i),attribute.getY(i),attribute.getZ(i)];

test('bounded sculpt attenuates an uneven surface while retaining its open edges and source attributes',()=>{
  const size=21,positions=[],uv=[],indices=[];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){positions.push(x*.5,y*.5,.1*Math.sin(x*2.12)*Math.cos(y*1.73));uv.push(x/(size-1),y/(size-1));}
  for(let y=0;y<size-1;y++)for(let x=0;x<size-1;x++){const a=y*size+x;indices.push(a,a+1,a+size,a+1,a+size+1,a+size);}
  const source=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setAttribute('uv',new T.Float32BufferAttribute(uv,2)).setIndex(indices);
  source.computeVertexNormals(); const original=hash(source.attributes.position.array),uvHash=hash(source.attributes.uv.array),indexHash=hash(source.index.array);
  const {geometry,stats}=sculptFleshGeometry(source,{soleFraction:0});
  assert.notEqual(geometry,source); assert.equal(hash(source.attributes.position.array),original);
  assert.equal(hash(geometry.attributes.uv.array),uvHash); assert.equal(hash(geometry.index.array),indexHash);
  let before=0,after=0;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x;
    if(!x||!y||x===size-1||y===size-1)assert.deepEqual(point(geometry.attributes.position,i),point(source.attributes.position,i));
    else {before+=source.attributes.position.getZ(i)**2;after+=geometry.attributes.position.getZ(i)**2;}
  }
  assert.ok(after<before*.5,`ripple energy should decrease: ${after}/${before}`);
  assert.ok(stats.movedVertices>200); assert.ok(stats.maxDisplacement<=stats.displacementLimit+1e-6);
  assert.deepEqual(stats.originalBounds,stats.derivedBounds); assert.equal(stats.flippedTriangles,0);assert.equal(stats.collapsedTriangles,0);
});

test('actual flesh keeps GLB, rig, weights, UVs, bounds and paw contacts exact, with nonzero bounded movement and valid faces',async()=>{
  const {mesh,gltf,input}=await fleshSculptFixture(),source=mesh.geometry,protectedBoneIndices=fleshContactBoneIndices(mesh.skeleton.bones);
  const assetHash=hash(input),attributeHashes=Object.fromEntries(Object.entries(source.attributes).map(([name,attribute])=>[name,hash(attribute.isInterleavedBufferAttribute?attribute.data.array:attribute.array)])),indexHash=hash(source.index.array);
  const rigBefore=JSON.stringify(mesh.skeleton.bones.map(bone=>({name:bone.name,matrix:bone.matrix.toArray(),inverse:mesh.skeleton.boneInverses[mesh.skeleton.bones.indexOf(bone)].toArray()})));
  assert.deepEqual(protectedBoneIndices,[8,9,16,17,40,41,45,46]);
  gltf.scene.updateMatrixWorld(true); const bindBounds=new T.Box3().setFromObject(gltf.scene,true);
  const {geometry,stats}=sculptFleshGeometry(source,{protectedBoneIndices});
  assert.ok(stats.movedVertices>source.attributes.position.count*.65); assert.ok(stats.maxDisplacement>0.005); assert.ok(stats.maxDisplacement<=stats.displacementLimit+1e-6);
  assert.equal(stats.appliedStrength,1); assert.deepEqual(stats.derivedBounds,stats.originalBounds);assert.equal(stats.watertight,false);
  assert.equal(stats.flippedTriangles,0);assert.equal(stats.collapsedTriangles,0);
  assert.equal(hash(source.index.array),indexHash);assert.equal(hash(geometry.index.array),indexHash);
  for(const [name,attribute] of Object.entries(source.attributes)){
    assert.equal(hash(attribute.isInterleavedBufferAttribute?attribute.data.array:attribute.array),attributeHashes[name],`${name} source bytes`);
    if(name!=='position'&&name!=='normal')assert.equal(hash(geometry.attributes[name].isInterleavedBufferAttribute?geometry.attributes[name].data.array:geometry.attributes[name].array),attributeHashes[name],`${name} derived bytes`);
  }
  const old=source.attributes.position,next=geometry.attributes.position,weights=source.attributes.skinWeight,bones=source.attributes.skinIndex,protectedSet=new Set(protectedBoneIndices),seams=new Map();let protectedCount=0;
  for(let i=0;i<old.count;i++){
    let pawWeight=0;for(let j=0;j<weights.itemSize;j++)if(protectedSet.has(bones.getComponent(i,j)))pawWeight+=weights.getComponent(i,j);
    if(pawWeight>=.05){assert.deepEqual(point(next,i),point(old,i));protectedCount++;}
    const key=point(old,i).join('/'),delta=point(next,i).map((v,j)=>v-point(old,i)[j]);
    if(seams.has(key))assert.deepEqual(delta,seams.get(key),'identical source seam positions share one displacement');else seams.set(key,delta);
    assert.ok(point(next,i).every(Number.isFinite));assert.ok(point(geometry.attributes.normal,i).every(Number.isFinite));
  }
  assert.ok(protectedCount>4000);
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),oldNormal=new T.Vector3(),newNormal=new T.Vector3(),edge=new T.Vector3();
  for(let i=0;i<source.index.count;i+=3){
    const ids=[source.index.getX(i),source.index.getX(i+1),source.index.getX(i+2)];
    const normal=(attribute,target)=>{a.fromBufferAttribute(attribute,ids[0]);b.fromBufferAttribute(attribute,ids[1]);c.fromBufferAttribute(attribute,ids[2]);return target.subVectors(b,a).cross(edge.subVectors(c,a));};
    normal(old,oldNormal);normal(next,newNormal);
    if(oldNormal.length()>1e-12){assert.ok(oldNormal.dot(newNormal)>0,`face ${i/3} orientation`);assert.ok(newNormal.length()>=oldNormal.length()*.1,`face ${i/3} area`);}
  }
  mesh.geometry=geometry; mesh.boundingBox=null; mesh.boundingSphere=null; const nextBindBounds=new T.Box3().setFromObject(gltf.scene,true);
  assert.deepEqual(nextBindBounds.min.toArray(),bindBounds.min.toArray());assert.deepEqual(nextBindBounds.max.toArray(),bindBounds.max.toArray());
  assert.equal(JSON.stringify(mesh.skeleton.bones.map(bone=>({name:bone.name,matrix:bone.matrix.toArray(),inverse:mesh.skeleton.boneInverses[mesh.skeleton.bones.indexOf(bone)].toArray()}))),rigBefore);
  assert.equal(hash(fs.readFileSync(new URL('../assets/carriers/meshy/flesh.glb',import.meta.url))),assetHash);
  const repeated=sculptFleshGeometry(source,{protectedBoneIndices});assert.equal(hash(repeated.geometry.attributes.position.array),hash(geometry.attributes.position.array));
});

test('morph targets and unprotected skinning are refused rather than modified',()=>{
  const geometry=new T.PlaneGeometry(1,1,2,2);
  geometry.morphAttributes.position=[geometry.attributes.position.clone()];assert.throws(()=>sculptFleshGeometry(geometry),/morph targets/);geometry.morphAttributes={};
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(new Uint16Array(geometry.attributes.position.count*4),4));
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*4),4));
  assert.throws(()=>sculptFleshGeometry(geometry),/protected paw bones/);assert.throws(()=>fleshContactBoneIndices([]),/inspected paw joint/);
  assert.throws(()=>sculptFleshGeometry(new T.PlaneGeometry(),{iterations:4}),/bounded Taubin passes/);
});
