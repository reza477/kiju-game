// Read-only binary inspection of locally downloaded GLB files. No remote loads.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export async function inspectGlb(file) {
  const bytes=await fs.readFile(file);
  assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  let json,bin;
  for(let p=12;p<bytes.length;){const n=bytes.readUInt32LE(p),type=bytes.readUInt32LE(p+4);assert.ok(p+8+n<=bytes.length);const chunk=bytes.subarray(p+8,p+8+n);if(type===0x4e4f534a)json=JSON.parse(chunk.toString());if(type===0x004e4942)bin=chunk;p+=8+n;}
  assert.equal(json.asset.version,'2.0');assert.ok(bin);assert.equal(json.buffers.length,1);
  assert.ok(!json.buffers[0].uri);assert.ok(!(json.images||[]).some(x=>x.uri));
  assert.deepEqual(json.extensionsRequired||[],[],'Unsupported compressed/extension asset must be handled explicitly');
  const types={5120:[1,'readInt8'],5121:[1,'readUInt8'],5122:[2,'readInt16LE'],5123:[2,'readUInt16LE'],5125:[4,'readUInt32LE'],5126:[4,'readFloatLE']},width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
  const access=index=>{const a=json.accessors[index],v=json.bufferViews[a.bufferView],[size,read]=types[a.componentType],n=width[a.type];assert.ok(!a.sparse);const offset=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||n*size;assert.ok(offset+(a.count-1)*stride+n*size<=bin.length);const min=Array(n).fill(Infinity),max=Array(n).fill(-Infinity);let zeroVectors=0;for(let i=0;i<a.count;i++){let length=0;for(let k=0;k<n;k++){const value=bin[read](offset+i*stride+k*size);assert.ok(Number.isFinite(value));min[k]=Math.min(min[k],value);max[k]=Math.max(max[k],value);length+=value*value;}if(length<1e-12)zeroVectors++;}return{count:a.count,type:a.type,componentType:a.componentType,min,max,zeroVectors};};
  const primitives=(json.meshes||[]).flatMap(mesh=>mesh.primitives.map(p=>{assert.equal(p.mode??4,4);assert.ok(p.attributes.NORMAL!==undefined&&p.attributes.TEXCOORD_0!==undefined);const position=access(p.attributes.POSITION),normal=access(p.attributes.NORMAL),uv=access(p.attributes.TEXCOORD_0),indices=p.indices!==undefined?access(p.indices):null;assert.equal(normal.zeroVectors,0);assert.equal(position.count,normal.count);assert.equal(position.count,uv.count);if(indices)assert.ok(indices.max[0]<position.count);return{material:p.material,triangles:(indices?.count??position.count)/3,position,normal,uv};}));
  const images=(json.images||[]).map(im=>{const v=json.bufferViews[im.bufferView],b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);let w,h;if(im.mimeType==='image/png'){assert.equal(b.toString('ascii',1,4),'PNG');w=b.readUInt32BE(16);h=b.readUInt32BE(20);}else if(im.mimeType==='image/jpeg'){for(let p=2;p<b.length;){if(b[p++]!==255)continue;const marker=b[p++];if(marker===0xd9||marker===0xda)break;const length=b.readUInt16BE(p);if([0xc0,0xc1,0xc2].includes(marker)){h=b.readUInt16BE(p+3);w=b.readUInt16BE(p+5);break;}p+=length;}}assert.ok(w>0&&h>0,'Embedded image dimensions readable');return{mimeType:im.mimeType,bytes:b.length,width:w,height:h,sha256:createHash('sha256').update(b).digest('hex')};});
  return{file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),asset:json.asset,extensionsUsed:json.extensionsUsed||[],nodes:json.nodes,primitives,triangles:primitives.reduce((n,p)=>n+p.triangles,0),materials:json.materials,images,externalResources:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/inspect-glb.mjs'))console.log(JSON.stringify(await inspectGlb(process.argv[2]),null,2));
