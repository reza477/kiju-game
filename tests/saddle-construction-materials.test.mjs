import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {districtTypes,observations,snapshot} from './helpers/saddle-construction-snapshot.mjs';

// Captured through the production constructors before the material edit on
// d05c003. The independent recorded baseline command and source identity are
// retained in artifacts/nov10-improvements/saddle/round4-baseline-check-02.
const baseline=JSON.parse(readFileSync(new URL('./fixtures/saddle-construction-baseline.json',import.meta.url)));
test('housing construction materials preserve every district mesh, collision triangle and city budget',async t=>{
 const restore=installCPUCarrierEnvironment();
 try{
  const {createSaddleDistrict}=await import('../src/saddle-city.js'),actual=observations(createSaddleDistrict);
  assert.equal(Object.keys(actual.cases).length,72);
  for(const [key,value]of Object.entries(actual.cases)){
   const before=baseline.cases[key];
   for(const field of['geometry','triangles','bounds','meshes','vertices','indexCount'])assert.deepEqual(value[field],before[field],key+' '+field);
   if(!key.includes('/housing/'))assert.deepEqual(value,before,key+' is wholly unchanged');
   if(key.startsWith('rendered/'))assert.equal(value.geometry,actual.cases[key.replace('rendered/','collision/')].geometry,key+' uses the collision geometry');
  }
  for(const name of['starter','full20']){
   const value=actual[name],before=baseline[name];
   for(const field of['layoutHash','saveHash'])assert.equal(value[field],before[field],name+' '+field);
   for(const phase of['before','batched']){
    for(const field of['triangles','bounds','vertices','indexCount'])assert.deepEqual(value[phase][field],before[phase][field],name+' '+phase+' '+field);
    for(const field of['materialCount','textureCount'])assert.ok(value[phase][field]<=before[phase][field],name+' '+phase+' '+field);
   }
   for(const field of['meshes','geometryCount','attributeBytes'])assert.equal(value.batched[field],before.batched[field],name+' batched '+field);
   assert.equal(value.before.triangles,value.batched.triangles,name+' batching retains actual world triangles and normals');
  }
  t.diagnostic(JSON.stringify({baselineCommit:baseline.commit,cases:72,starter:actual.starter,full20:actual.full20}));
 }finally{restore();}
});

test('housing levels use existing timber, plaster, stone and slate roles without changing shared resources',async()=>{
 const restore=installCPUCarrierEnvironment();
 try{
  const {createSaddleDistrict}=await import('../src/saddle-city.js');
  const existing=districtTypes.map(type=>createSaddleDistrict(type,3)),before=existing.map(snapshot);
  for(const level of[1,2,3,1,3,2]){
   const room=createSaddleDistrict('housing',level).children[0],wall=level<3?'plaster':'stone',frame=level===1?'wood':'stone',roof=level===1?'wood':'roof';
   assert.equal(room.children[0].material.name.split(' ')[0],wall);
   for(const index of[1,2])assert.equal(room.children[index].material.name.split(' ')[0],frame);
   assert.equal(room.children[3].material.name.split(' ')[0],roof);
   const corners=room.children.filter(o=>Math.abs(o.position.x)===.99);assert.equal(corners.length,4);
   for(const corner of corners)assert.equal(corner.material.name.split(' ')[0],frame);
   for(const dormer of room.children.filter(o=>o.isGroup&&Math.abs(o.position.x)===.57)){
    assert.equal(dormer.children[0].material.name.split(' ')[0],wall);assert.equal(dormer.children[2].material.name.split(' ')[0],roof);
   }
   room.traverse(o=>{if(!o.isMesh||!o.material.userData.surfaceScale)return;const {position:p,normal:n,uv}=o.geometry.attributes,scale=o.material.userData.surfaceScale;for(let i=0;i<p.count;i++){const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));assert.equal(uv.getX(i),Math.fround((y>x&&y>z?p.getX(i):x>z?p.getZ(i):p.getX(i))/scale));assert.equal(uv.getY(i),Math.fround((y>x&&y>z?-p.getZ(i):p.getY(i))/scale));}});
  }
  assert.deepEqual(existing.map(snapshot),before,'Constructing and upgrading houses never mutates existing geometry UVs or material assignments');
 }finally{restore();}
});
