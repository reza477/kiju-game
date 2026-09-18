import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {partitionStaticInstances} from '../src/spatial-instances.js';
import {createWorldLife} from '../src/world-life.js';
import {createWorldInteractions} from '../src/landscape.js';
import {terrainHeight} from '../src/terrain.js';
import {Presentation} from '../src/presentation.js';

// Production CPU scene construction only. These inert canvas/image surfaces
// satisfy procedural materials; no browser, network, render context or GPU.
const gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]??(()=>{})});
const documentStub={createElement:()=>({width:0,height:0,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};

function fixture(count=800){
  const geometry=new T.BoxGeometry(1,2,1),material=new T.MeshStandardMaterial(),items=[],roots=new Float32Array(count*4);
  const source=new T.InstancedMesh(geometry,material,count),temp=new T.Object3D(),colour=new T.Color();source.name='Identity fixture vegetation';source.userData.windAnimated=true;
  for(let i=0;i<count;i++){
    const x=(i%40-20)*20,z=(Math.floor(i/40)-10)*20,y=Math.sin(i)*3;
    const item={x,y,z,windRoot:[x,y,z,6]};items.push(item);roots.set(item.windRoot,i*4);
    temp.position.set(x,y,z);temp.rotation.y=i*.7;temp.scale.set(.7+i%3,1.1+i%5,.6+i%2);temp.updateMatrix();source.setMatrixAt(i,temp.matrix);source.setColorAt(i,colour.setRGB(i/count,.4,.2));
  }
  geometry.setAttribute('windRoot',new T.InstancedBufferAttribute(roots,4));source.computeBoundingSphere();
  return{source,items,container:partitionStaticInstances(source,items)};
}

test('render cells preserve every canonical instance, material and rooted attribute',()=>{
  const {source,items,container}=fixture(),seen=new Set(),matrix=new T.Matrix4(),expected=new T.Matrix4();
  assert.equal(source.parent,null,'The canonical CPU storage must never be rendered a second time.');
  assert.equal(source.count,items.length);assert.equal(source.spatialSlots.length,items.length);assert.ok(Object.isFrozen(source.spatialSlots));
  for(const mesh of container.children){
    assert.equal(mesh.geometry.index,source.geometry.index);assert.equal(mesh.geometry.attributes.position,source.geometry.attributes.position);
    assert.equal(mesh.material,source.material);assert.equal(mesh.name,source.name);assert.ok(Object.isFrozen(mesh.userData.spatialIndices));
    assert.notEqual(mesh.geometry.attributes.windRoot,source.geometry.attributes.windRoot);
    mesh.userData.spatialIndices.forEach((index,local)=>{
      assert.ok(!seen.has(index));seen.add(index);assert.ok(Object.isFrozen(source.spatialSlots[index]));
      source.getMatrixAt(index,expected);mesh.getMatrixAt(local,matrix);assert.deepEqual(matrix.elements,expected.elements);
      assert.deepEqual(Array.from(mesh.geometry.attributes.windRoot.array.slice(local*4,local*4+4)),Array.from(source.geometry.attributes.windRoot.array.slice(index*4,index*4+4)));
      assert.deepEqual(Array.from(mesh.instanceColor.array.slice(local*3,local*3+3)),Array.from(source.instanceColor.array.slice(index*3,index*3+3)));
    });
  }
  assert.equal(seen.size,items.length);
  const triangles=mesh=>mesh.count*mesh.geometry.index.count/3;
  assert.equal(container.children.reduce((sum,mesh)=>sum+triangles(mesh),0),triangles(source),'Partitioning must not remove any scenery geometry.');
});

test('saved original addressing routes destruction, restoration and dirty uploads to the same cell slots',()=>{
  const {source,items,container}=fixture(),indices=[3,155,702],originals=indices.map(i=>source.instanceMatrix.array.slice(i*16,i*16+16));
  const versions=new Map(container.children.map(mesh=>[mesh,mesh.instanceMatrix.version]));
  const matrix=new T.Matrix4().makeScale(.0001,.0001,.0001).setPosition(0,-5000,0);
  const bounds=container.children.map(mesh=>mesh.boundingSphere.clone());
  for(const index of indices)source.setMatrixAt(index,matrix);
  const changed=new Set(indices.map(i=>source.spatialSlots[i].mesh));
  assert.ok(container.children.every(mesh=>mesh.instanceMatrix.version===versions.get(mesh)),'Matrices upload only when the existing caller flushes needsUpdate.');
  source.instanceMatrix.needsUpdate=true;
  for(const mesh of container.children)assert.equal(mesh.instanceMatrix.version,versions.get(mesh)+(changed.has(mesh)?1:0));
  for(const index of indices){const slot=source.spatialSlots[index];assert.equal(source.instanceMatrix.array[index*16+13],-5000);assert.equal(slot.mesh.instanceMatrix.array[slot.index*16+13],-5000);}
  indices.forEach((index,i)=>source.setMatrixAt(index,matrix.fromArray(originals[i])));source.instanceMatrix.needsUpdate=true;
  for(const index of indices){const slot=source.spatialSlots[index];assert.deepEqual(Array.from(source.instanceMatrix.array.slice(index*16,index*16+16)),Array.from(slot.mesh.instanceMatrix.array.slice(slot.index*16,slot.index*16+16)));}
  container.children.forEach((mesh,i)=>assert.deepEqual(mesh.boundingSphere,bounds[i],'Hiding and restoring saved scenery must retain conservative original bounds.'));
  source.visible=false;let visible=0;container.traverseVisible(o=>{if(o.isMesh)visible++;});assert.equal(visible,0);
  source.visible=true;source.castShadow=true;source.receiveShadow=false;assert.ok(container.children.every(mesh=>mesh.castShadow&&!mesh.receiveShadow));
  source.count=199;assert.equal(container.children.reduce((sum,mesh)=>sum+mesh.count,0),199);source.count=items.length;
  assert.equal(container.children.reduce((sum,mesh)=>sum+mesh.count,0),items.length);
});

test('native cell bounds reduce offscreen submissions and never exclude an in-frustum original instance',()=>{
  const {source,container}=fixture();container.updateMatrixWorld(true);
  const camera=new T.PerspectiveCamera(42,1.5,.25,420),projection=new T.Matrix4(),frustum=new T.Frustum(),matrix=new T.Matrix4(),sphere=new T.Sphere();
  source.geometry.computeBoundingSphere();let removed=0;
  for(const [x,z] of [[0,120],[150,0],[-140,-80]]){
    camera.position.set(x,45,z);camera.lookAt(0,0,0);camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
    const shown=new Set(container.children.filter(mesh=>frustum.intersectsObject(mesh)));
    const submitted=[...shown].reduce((sum,mesh)=>sum+mesh.count,0);removed+=source.count-submitted;
    assert.ok(submitted<source.count*.75,'The controlled view must cull a substantial offscreen portion.');
    for(let i=0;i<source.count;i++){
      source.getMatrixAt(i,matrix);sphere.copy(source.geometry.boundingSphere).applyMatrix4(matrix);sphere.radius+=1.5;
      if(frustum.intersectsSphere(sphere))assert.ok(shown.has(source.spatialSlots[i].mesh),'A visible, wind-padded instance was incorrectly culled.');
    }
  }
  assert.ok(removed>source.count);
});

test('actual interaction save reload mutates canonical scenery and its matching rendered cells together',()=>{
  const previous=globalThis.document;globalThis.document=documentStub;
  try{
    const group=new T.Group(),source=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial(),40),items=[],records=[],m=new T.Matrix4();
    const batch={items,mesh:source};
    for(let i=0;i<40;i++){const x=220+i%10*18,z=-390+Math.floor(i/10)*20,y=terrainHeight(x,z);items.push({x,y,z,sx:1,sy:1,sz:1,yaw:0});source.setMatrixAt(i,m.makeTranslation(x,y,z));records.push({id:'spatial:'+i,kind:i%2?'tree':'rock',x,z,size:1,parts:[{batch,first:i,count:1}]});}
    group.add(partitionStaticInstances(source,items));const api=createWorldInteractions(group,records),saved=['spatial:2','spatial:17','spatial:29'];
    const original=source.instanceMatrix.array.slice();
    api.resetInteractions({mode:'expedition',damage:JSON.parse(JSON.stringify(saved))});assert.equal(api.stats.destroyedCount,3);
    for(let i=0;i<source.count;i++){const slot=source.spatialSlots[i],hidden=saved.includes('spatial:'+i);assert.equal(source.instanceMatrix.array[i*16+13]===-5000,hidden);assert.equal(slot.mesh.instanceMatrix.array[slot.index*16+13],source.instanceMatrix.array[i*16+13]);}
    api.resetInteractions();assert.deepEqual(source.instanceMatrix.array,original);assert.equal(api.stats.poolDraw.submittedInstances,0);
    api.resetInteractions({mode:'expedition',damage:JSON.parse(JSON.stringify(saved))});assert.equal(api.stats.destroyedCount,3);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('saved pine crowns use the pine debris pool and every species restores its full original matrices',()=>{
  const previous=globalThis.document;globalThis.document=documentStub;
  try{
    const group=new T.Group(),records=[],sources=[],originals=[],temp=new T.Object3D();
    for(const [species,name]of ['Pine boughs','Distant Pine boughs','Broadleaf canopies'].entries()){
      const source=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial(),2),items=[];source.name=name;
      for(let i=0;i<2;i++){
        const x=230+species*70+i*4,z=-380+species*25,y=terrainHeight(x,z)+i*2;
        temp.position.set(x,y,z);temp.rotation.set(.13*i,species*.71+i*.23,-.11*i);temp.scale.set(.8+i*.3,1.3+i*.4,.6+i*.2);temp.updateMatrix();
        source.setMatrixAt(i,temp.matrix);items.push({x,y,z,sx:temp.scale.x,sy:temp.scale.y,sz:temp.scale.z,rotation:temp.quaternion.clone()});
      }
      group.add(partitionStaticInstances(source,items));sources.push(source);originals.push(source.instanceMatrix.array.slice());
      records.push({id:'species:'+species,kind:'tree',x:items[0].x,z:items[0].z,size:1.2,parts:[{batch:{mesh:source,items},first:0,count:2}]});
    }
    const api=createWorldInteractions(group,records),pine=group.getObjectByName('Crushed fallen pine boughs'),broadleaf=group.getObjectByName('Crushed fallen boughs');
    assert.notEqual(pine.material.map,broadleaf.material.map,'Species must retain their distinct foliage silhouettes.');
    for(let species=0;species<records.length;species++){
      api.resetInteractions({mode:'expedition',damage:JSON.parse(JSON.stringify([records[species].id]))});assert.equal(api.stats.destroyedCount,1);
      const expected=species<2?pine:broadleaf,other=species<2?broadleaf:pine;
      assert.equal(expected.count,3);assert.equal(expected.visible,true);assert.equal(other.count,0);assert.equal(other.visible,false);
      for(let i=0;i<2;i++){const source=sources[species],slot=source.spatialSlots[i];assert.equal(source.instanceMatrix.array[i*16+13],-5000);assert.equal(slot.mesh.instanceMatrix.array[slot.index*16+13],-5000);}
      api.resetInteractions();assert.equal(api.stats.poolDraw.submittedInstances,0);assert.equal(pine.count,0);assert.equal(broadleaf.count,0);
      sources.forEach((source,index)=>{assert.deepEqual(source.instanceMatrix.array,originals[index]);source.spatialSlots.forEach((slot,i)=>assert.deepEqual(slot.mesh.instanceMatrix.array.slice(slot.index*16,slot.index*16+16),originals[index].slice(i*16,i*16+16)));});
    }
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('wildlife frozen frames preserve all matrices and avoid buffer uploads, while time and actor changes still refresh',()=>{
  const previous=globalThis.document;globalThis.document=documentStub;
  try{
    const life=createWorldLife(),meshes=life.group.children;
    life.update(32.5,0,[]);const versions=meshes.map(m=>m.instanceMatrix.version),matrices=meshes.map(m=>m.instanceMatrix.array.slice());
    for(let i=0;i<100;i++)life.update(32.5,0,[]);
    meshes.forEach((mesh,i)=>{assert.equal(mesh.instanceMatrix.version,versions[i]);assert.deepEqual(mesh.instanceMatrix.array,matrices[i]);});
    life.update(32.6,0,[]);assert.ok(meshes.every((m,i)=>m.instanceMatrix.version===versions[i]+1));
    const actor={faction:'crawler',moving:true,x:-92,z:29,scale:1};life.update(32.6,0,[actor]);assert.ok(meshes.every((m,i)=>m.instanceMatrix.version===versions[i]+2));
    life.update(32.6,0,[{...actor}]);assert.ok(meshes.every((m,i)=>m.instanceMatrix.version===versions[i]+2));
    actor.x+=1;life.update(32.6,0,[actor]);assert.ok(meshes.every((m,i)=>m.instanceMatrix.version===versions[i]+3));
    life.update(32.6,.016,[actor]);assert.ok(meshes.every((m,i)=>m.instanceMatrix.version===versions[i]+4));
    assert.ok(meshes.every(m=>Array.from(m.instanceMatrix.array).every(Number.isFinite)));
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('Balanced selects six AO samples and High restores the existing twelve-sample normalization',()=>{
  const renderer={extensions:{has:()=>true},capabilities:{maxSamples:4}},camera=new T.PerspectiveCamera(42,1,.25,1500),presentation=new Presentation(renderer,camera);
  presentation.setQuality('high');assert.equal(presentation.material.uniforms.aoSamples.value,12);assert.equal(presentation.material.uniforms.aoStrength.value,.8);
  presentation.setQuality('balanced');assert.equal(presentation.material.uniforms.aoSamples.value,6);assert.equal(presentation.material.uniforms.aoStrength.value,.48);
  assert.match(presentation.material.fragmentShader,/if\(i>=aoSamples\)break/);assert.match(presentation.material.fragmentShader,/shade\/\(float\(aoSamples\)\*\.5\)/);
  presentation.setQuality('high');assert.equal(presentation.material.uniforms.aoSamples.value*.5,6);assert.equal(presentation.target.samples,4);
  presentation.setQuality('performance');assert.equal(presentation.enabled,false);presentation.dispose();
});
