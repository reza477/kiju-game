// Asset authoring only: UV-aware simplification of the untouched Meshy export.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {MeshoptSimplifier} from '../../node_modules/three/examples/jsm/libs/meshopt_simplifier.module.js';
const {values:a}=parseArgs({options:{input:{type:'string'},output:{type:'string'},report:{type:'string'},triangles:{type:'string',default:'100000'}}});
if(!a.input||!a.output||!a.report)throw Error('Usage: node simplify-source.mjs --input GLB --output NEW_GLB --report NEW_JSON [--triangles 100000]');
for(const p of[a.output,a.report]){assert.ok(!fs.existsSync(p),'Output already exists: '+p);fs.mkdirSync(path.dirname(p),{recursive:true});}
const startedAt=new Date().toISOString(),input=fs.readFileSync(a.input),hash=b=>createHash('sha256').update(b).digest('hex'),jl=input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,20+jl)),bin=input.subarray(28+jl);
assert.equal(doc.meshes.length,1);assert.equal(doc.meshes[0].primitives.length,1);assert.equal(doc.skins,undefined);
const primitive=doc.meshes[0].primitives[0],widths={SCALAR:1,VEC2:2,VEC3:3},types={5126:Float32Array,5125:Uint32Array};
const read=id=>{const x=doc.accessors[id],v=doc.bufferViews[x.bufferView],T=types[x.componentType],w=widths[x.type];assert.ok(T);assert.ok(!v.byteStride||v.byteStride===w*T.BYTES_PER_ELEMENT);const b=bin.subarray((v.byteOffset||0)+(x.byteOffset||0),(v.byteOffset||0)+(x.byteOffset||0)+x.count*w*T.BYTES_PER_ELEMENT);return new T(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));};
const p=read(primitive.attributes.POSITION),n=read(primitive.attributes.NORMAL),uv=read(primitive.attributes.TEXCOORD_0),indices=read(primitive.indices),attr=new Float32Array(p.length/3*5);
for(let i=0;i<p.length/3;i++){attr.set(n.subarray(i*3,i*3+3),i*5);attr.set(uv.subarray(i*2,i*2+2),i*5+3);}
await MeshoptSimplifier.ready;
const [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(indices,p,3,attr,5,[.1,.1,.1,1,1],null,Number(a.triangles)*3,.025,['LockBorder']);
const [remap,count]=MeshoptSimplifier.compactMesh(reduced),positions=new Float32Array(count*3),normals=new Float32Array(count*3),texcoords=new Float32Array(count*2),sourceIds=new Uint32Array(count);
for(let i=0;i<remap.length;i++)if(remap[i]<count){positions.set(p.subarray(i*3,i*3+3),remap[i]*3);normals.set(n.subarray(i*3,i*3+3),remap[i]*3);texcoords.set(uv.subarray(i*2,i*2+2),remap[i]*2);sourceIds[remap[i]]=i;}
const sourceImages=doc.images.map(im=>{const v=doc.bufferViews[im.bufferView];return bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);});
const chunks=[];let offset=0;doc.bufferViews=[];doc.accessors=[];
const view=bytes=>{const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}const id=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;return id;};
const accessor=(data,type,componentType)=>{const w=widths[type],entry={bufferView:view(Buffer.from(data.buffer,data.byteOffset,data.byteLength)),componentType,count:data.length/w,type};if(type==='VEC3'){entry.min=[Infinity,Infinity,Infinity];entry.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i++){entry.min[i%3]=Math.min(entry.min[i%3],data[i]);entry.max[i%3]=Math.max(entry.max[i%3],data[i]);}}const id=doc.accessors.length;doc.accessors.push(entry);return id;};
primitive.attributes={POSITION:accessor(positions,'VEC3',5126),NORMAL:accessor(normals,'VEC3',5126),TEXCOORD_0:accessor(texcoords,'VEC2',5126)};primitive.indices=accessor(reduced,'SCALAR',5125);
doc.images.forEach((im,i)=>im.bufferView=view(sourceImages[i]));doc.buffers=[{byteLength:offset}];doc.asset.generator='Colossus Wake / UV-aware Meshopt simplification / original Meshy 2K JPEG maps';
const jsonRaw=Buffer.from(JSON.stringify(doc)),json=Buffer.alloc((jsonRaw.length+3)&~3,32);jsonRaw.copy(json);const raw=Buffer.concat(chunks),binary=Buffer.alloc((raw.length+3)&~3);raw.copy(binary);const out=Buffer.alloc(28+json.length+binary.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);out.writeUInt32LE(binary.length,20+json.length);out.writeUInt32LE(0x004e4942,24+json.length);binary.copy(out,28+json.length);fs.writeFileSync(a.output,out,{flag:'wx'});
const report={startedAt,finishedAt:new Date().toISOString(),command:process.argv.join(' '),input:a.input,inputSha256:hash(input),output:a.output,outputSha256:hash(out),outputBytes:out.length,sourceVertices:p.length/3,sourceTriangles:indices.length/3,vertices:count,triangles:reduced.length/3,targetTriangles:Number(a.triangles),meshoptRelativeError:error,textureByteHashes:sourceImages.map(hash),method:'Meshopt attribute-aware vertex-collapse simplification; normal and UV attributes included, boundaries locked, retained vertex UVs exact, all original JPEG image bytes preserved.',sourceUnchanged:hash(fs.readFileSync(a.input))===hash(input)};fs.writeFileSync(a.report,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
