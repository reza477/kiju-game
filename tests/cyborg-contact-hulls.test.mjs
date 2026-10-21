import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {CYBORG_CONTACT_SOURCE as source,CYBORG_CONTACT_HULLS as regions} from '../src/cyborg-contact-hulls.js';
const bytes=fs.readFileSync(new URL('../assets/carriers/meshy/cyborg.glb',import.meta.url));
const jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength)),binary=bytes.subarray(jsonLength+28),primitive=doc.meshes[0].primitives[0];
const sizes={5121:1,5123:2,5125:4,5126:4},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},readers={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'};
function component(accessorIndex,index,lane){const a=doc.accessors[accessorIndex],v=doc.bufferViews[a.bufferView],size=sizes[a.componentType];return binary[readers[a.componentType]]((v.byteOffset??0)+(a.byteOffset??0)+index*(v.byteStride??widths[a.type]*size)+lane*size);}
const p=(id,lane)=>component(primitive.attributes.POSITION,id,lane);
test('contact hull dataset matches the exact private source and all 312 original positions',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);assert.equal(doc.accessors[primitive.attributes.POSITION].count,source.vertexCount);
 assert.deepEqual(Object.keys(regions).sort(),['leftBoot','leftHand','rightBoot','rightHand']);let count=0;
 for(const r of Object.values(regions)){assert.equal(r.positions.length,r.vertexIndices.length);for(let i=0;i<r.vertexIndices.length;i++){const id=r.vertexIndices[i];assert.ok(Number.isInteger(id)&&id>=0&&id<source.vertexCount);assert.deepEqual(r.positions[i],[p(id,0),p(id,1),p(id,2)]);count++;}}
 assert.equal(count,312);
});
test('each terminal hull is a closed outward-facing manifold with no omitted or degenerate faces',()=>{
 let triangles=0;
 for(const r of Object.values(regions)){
  const vertices=new Set(r.vertexIndices),edges=new Map(),centre=[0,0,0];assert.equal(vertices.size,r.vertexIndices.length);for(const xyz of r.positions)for(let k=0;k<3;k++)centre[k]+=xyz[k]/r.positions.length;
  assert.equal(r.triangleIndices.length%3,0);
  for(let i=0;i<r.triangleIndices.length;i+=3){const f=r.triangleIndices.slice(i,i+3);assert.equal(new Set(f).size,3);for(const id of f)assert.ok(vertices.has(id));
   const a=f.map(id=>[p(id,0),p(id,1),p(id,2)]),u=a[1].map((x,k)=>x-a[0][k]),v=a[2].map((x,k)=>x-a[0][k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
   assert.ok(n.reduce((sum,x)=>sum+x*x,0)>1e-18);assert.ok(n.reduce((sum,x,k)=>sum+x*(a[0][k]-centre[k]),0)>0,'Face normal points into the solid');
   for(let k=0;k<3;k++){const x=f[k],y=f[(k+1)%3],key=[Math.min(x,y),Math.max(x,y)].join(',');const e=edges.get(key)??[0,0];e[0]++;e[1]+=x<y?1:-1;edges.set(key,e);}triangles++;
  }
  for(const e of edges.values())assert.deepEqual(e,[2,0]);assert.equal(vertices.size-edges.size+r.triangleIndices.length/3,2);
 }
 assert.equal(triangles,608);
});
test('both original terminal strike vertices remain direct hull vertices with pure hand ownership',()=>{
 for(const [key,id] of Object.entries(source.palmContactVertexIndices)){
  const r=regions[key];assert.equal(r.contactVertexIndex,id);assert.ok(r.vertexIndices.includes(id));let handWeight=0;
  for(let lane=0;lane<4;lane++){const joint=component(primitive.attributes.JOINTS_0,id,lane),name=doc.nodes[doc.skins[0].joints[joint]].name;if(name.includes((key.startsWith('left')?'Left':'Right')+'Hand'))handWeight+=component(primitive.attributes.WEIGHTS_0,id,lane);}
  assert.ok(handWeight>=.99999);
 }
});
