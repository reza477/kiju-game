import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {bindMeshyTreeCoverage} from '../src/meshy-pilot.js';
import {createWorldInteractions} from '../src/landscape.js';
import {disposeGroup} from '../src/materials.js';

// CPU-only ownership fixtures. Browser tests remain responsible for actual
// visible/depth wind, normal-camera appearance, loading and frame rate.
class FixtureInstances {
  constructor(group,geometry,material,castShadow=true,wind=null){Object.assign(this,{group,geometry,material,castShadow,wind,items:[]});}
  finish(name){
    if(!this.items.length)return null;
    const mesh=this.mesh=new T.InstancedMesh(this.geometry,this.material,this.items.length),object=new T.Object3D();mesh.name=name;mesh.castShadow=this.castShadow;
    this.items.forEach((item,index)=>{object.position.set(item.x,item.y,item.z);object.scale.set(item.sx,item.sy,item.sz);if(item.rotation)object.quaternion.copy(item.rotation);else object.rotation.set(0,item.yaw,0);object.updateMatrix();mesh.setMatrixAt(index,object.matrix);});
    mesh.computeBoundingBox();mesh.computeBoundingSphere();this.group.add(mesh);return mesh;
  }
}
const item=(x,z,extra={})=>({x,y:2,z,sx:1,sy:2,sz:.8,colour:0x789456,yaw:.4,...extra});
const ref=(batch,first,count=1)=>({batch,first,count});
function masters(){
  return new Map(['pine','broadleaf'].map(kind=>{
    const geometry=new T.BoxGeometry(1,1,1).translate(0,.5,0);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.shared=true;
    const near=geometry.clone(),far=new T.CylinderGeometry(.1,.5,1,4).translate(0,.5,0);far.computeBoundingBox();far.computeBoundingSphere();
    near.userData.shared=far.userData.shared=true;
    const texture=new T.Texture(),material=new T.MeshStandardMaterial({map:texture});texture.userData.shared=material.userData.shared=true;
    return[kind,{geometry,material,lods:{near,far}}];
  }));
}
function closeMasters(assets){for(const master of assets.values()){master.geometry.dispose();for(const lod of Object.values(master.lods??{}))lod.dispose();master.material.map?.dispose();master.material.dispose();}}
function createFixture({distant=false,resource=false,registered=true}={}){
  const group=new T.Group();if(resource)group.position.set(130,12,-85);
  const make=geometry=>new FixtureInstances(group,geometry,new T.MeshStandardMaterial());
  const trees={distant,wood:make(new T.BoxGeometry(.4,1,.4)),leaves:make(new T.BoxGeometry(2,1.2,2)),needles:make(new T.BoxGeometry(1.5,2,1.5))};
  const growth=make(new T.BoxGeometry(.3,.6,.3));
  const roots=[[2,2,-119,8],[5,2,-117,6],[80,3,30,9],[-82,4,100,7]];
  const retained={logs:[item(-8,-120,{sx:2,sy:.25,rotation:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),.3)}),item(-10,-116,{sx:3,sy:.3})],shrubs:[item(3,-120,{sx:.6,sy:.4}),item(7,-116,{sx:.4,sy:.3})]};
  // Deliberately interleave retained items, so a replacement must repair every
  // later ownership range, including records whose own tree is unchanged.
  trees.wood.items.push(retained.logs[0]);trees.leaves.items.push(retained.shrubs[0]);
  const rootParts=[];
  roots.forEach((root,index)=>{
    const parts=[],first=trees.wood.items.length;
    trees.wood.items.push(item(root[0],root[2],{y:root[1]+root[3]/2,sy:root[3],windRoot:root}));parts.push(ref(trees.wood,first));
    const crown=index%2===0?trees.needles:trees.leaves,start=crown.items.length;
    crown.items.push(item(root[0]+.25,root[2],{y:root[1]+root[3]*.72,sy:2,windRoot:root}));parts.push(ref(crown,start));rootParts.push(parts);
    if(index===0){trees.wood.items.push(retained.logs[1]);trees.leaves.items.push(retained.shrubs[1]);}
  });
  growth.items.push(item(2,-118,{sy:.4}),item(5,-116,{sy:.6}));
  const records=registered?[
    {id:'standing-pine',kind:'tree',x:2,z:-119,size:1.1,parts:[...rootParts[0],ref(trees.wood,2),ref(growth,0)]},
    {id:'standing-broadleaf',kind:'tree',x:5,z:-117,size:1.2,parts:[...rootParts[1],ref(trees.leaves,1),ref(growth,1)]},
    {id:'retained-owner',kind:'rock',x:-8,z:-120,size:.5,parts:[ref(trees.wood,0),ref(trees.leaves,0)]},
  ]:[];
  return{group,trees,growth,roots,retained,records,identity:JSON.stringify(records.map(({parts,...record})=>record))};
}
function bind(f,assets){
  const result=bindMeshyTreeCoverage({group:f.group,Instances:FixtureInstances,trees:f.trees,records:f.records,assets});
  for(const[batch,name]of [[f.trees.wood,'Rootless logs'],[f.trees.leaves,'Rootless shrubs'],[f.trees.needles,'Remaining needles'],[f.growth,'Attached growth']])batch.finish(name);
  return result;
}
function matrices(group){const values=new Map();group.traverse(mesh=>{if(mesh.isInstancedMesh)values.set(mesh,Array.from(mesh.instanceMatrix.array));});return values;}
function mockCanvas(){
  const previous=globalThis.document,gradient={addColorStop(){}},context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]??(()=>{})});
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};
  return()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;};
}

test('all standing roots become Meshy displays, including unregistered, distant and resource-local trees',()=>{
  const assets=masters();
  try{for(const options of [{},{distant:true},{resource:true,registered:false}]){
    const f=createFixture(options),result=bind(f,assets);
    try{
      assert.equal(result.stats.state,'ready');assert.equal(result.stats.count,f.roots.length);assert.equal(result.stats.level,options.distant?'far':'near');
      assert.deepEqual(result.stats.roots.map(r=>r.root),f.roots);assert.equal(result.meshes.reduce((s,m)=>s+m.count,0),f.roots.length);
      assert.ok(result.stats.roots.slice(2).every(root=>root.owners.length===0),'Unregistered displays must not invent saved owners.');
      assert.equal(JSON.stringify(f.records.map(({parts,...record})=>record)),f.identity);
      assert.deepEqual(f.group.position.toArray(),options.resource?[130,12,-85]:[0,0,0]);
      for(const mesh of result.meshes){const kind=mesh.userData.meshyTreeCoverage,master=assets.get(kind),expected=master.lods[result.stats.level];assert.deepEqual(mesh.geometry.index.array,expected.index.array);assert.equal(mesh.material,master.material);assert.equal(mesh.castShadow,!options.distant);assert.ok(mesh.name.endsWith(kind==='pine'?'Pine boughs':'Broadleaf canopies'));}
      assert.equal(result.stats.triangles,result.meshes.reduce((s,m)=>s+m.count*m.geometry.index.count/3,0));
      assert.ok([f.trees.wood,f.trees.leaves,f.trees.needles].every(batch=>batch.items.every(value=>!value.windRoot)),'Old standing display pieces must not remain underneath.');
    }finally{disposeGroup(f.group);}
  }}finally{closeMasters(assets);}
});

test('varied crown orientations stay deterministic and inside the prior root-centred envelope',()=>{
  const assets=masters(),a=createFixture(),b=createFixture();
  const boxes=new Map(),object=new T.Object3D();
  for(const batch of [a.trees.wood,a.trees.leaves,a.trees.needles]){
    batch.geometry.computeBoundingBox();
    for(const item of batch.items){if(!item.windRoot)continue;object.position.set(item.x,item.y,item.z);object.scale.set(item.sx,item.sy,item.sz);object.rotation.set(0,item.yaw,0);object.updateMatrix();const key=item.windRoot.join(',');if(!boxes.has(key))boxes.set(key,new T.Box3());boxes.get(key).union(batch.geometry.boundingBox.clone().applyMatrix4(object.matrix));}
  }
  try{
    const first=bind(a,assets),second=bind(b,assets),rotations=[];
    for(const mesh of first.meshes){const twin=second.meshes.find(m=>m.userData.meshyTreeCoverage===mesh.userData.meshyTreeCoverage);assert.deepEqual(mesh.instanceMatrix.array,twin.instanceMatrix.array);}
    for(const record of a.records)for(const part of record.parts){if(!part.batch.mesh.userData.meshyTreeCoverage)continue;const item=part.batch.items[part.first],prior=boxes.get(item.windRoot.join(',')),root=item.windRoot;rotations.push(item.yaw);const matrix=new T.Matrix4();part.batch.mesh.getMatrixAt(part.first,matrix);const actual=assets.get(part.batch.mesh.userData.meshyTreeCoverage).geometry.boundingBox.clone().applyMatrix4(matrix);for(const[axis,index]of [['x',0],['z',2]]){const extent=Math.max(Math.abs(prior.min[axis]-root[index]),Math.abs(prior.max[axis]-root[index]));assert.ok(actual.min[axis]>=root[index]-extent-1e-5);assert.ok(actual.max[axis]<=root[index]+extent+1e-5);}assert.ok(actual.max.y<=prior.max.y+1e-5);assert.ok(actual.min.y>=root[1]-1e-5);}
    assert.ok(new Set(rotations).size>1,'Different roots should expose different source-crown orientations.');
  }finally{disposeGroup(a.group);disposeGroup(b.group);closeMasters(assets);}
});

test('standing-root compaction preserves rootless logs, shrubs, attached growth and every owner range',()=>{
  const assets=masters(),f=createFixture();
  const growth=f.growth.items.slice();
  try{
    bind(f,assets);assert.deepEqual(f.trees.wood.items,f.retained.logs);assert.deepEqual(f.trees.leaves.items,f.retained.shrubs);assert.deepEqual(f.growth.items,growth);
    const pine=f.records[0],leaf=f.records[1],other=f.records[2];
    assert.equal(pine.parts.find(part=>part.batch===f.trees.wood).first,1);assert.equal(leaf.parts.find(part=>part.batch===f.trees.leaves).first,1);
    assert.equal(other.parts.find(part=>part.batch===f.trees.wood).first,0);assert.equal(other.parts.find(part=>part.batch===f.trees.leaves).first,0);
    for(const record of f.records)for(const part of record.parts){assert.ok(part.count>0);assert.ok(part.first>=0&&part.first+part.count<=part.batch.items.length);}
    for(const[index,record]of [pine,leaf].entries()){
      const parts=record.parts.filter(part=>part.batch.mesh.userData.meshyTreeCoverage);assert.equal(parts.length,1);assert.equal(parts[0].count,1);
      const replacement=parts[0].batch.items[parts[0].first];assert.deepEqual(replacement.windRoot,f.roots[index]);assert.deepEqual([replacement.x,replacement.y,replacement.z],f.roots[index].slice(0,3));
      assert.deepEqual(replacement.windFlex,[.66,.008]);assert.deepEqual(replacement.windMotion,[.73,2.4]);
    }
    assert.equal(other.parts.filter(part=>part.batch.mesh.userData.meshyTreeCoverage).length,0);
  }finally{disposeGroup(f.group);closeMasters(assets);}
});

test('existing destruction IDs hide only their replacement and attached parts, then restore exact matrices',()=>{
  const restoreDocument=mockCanvas(),assets=masters(),f=createFixture();
  try{
    bind(f,assets);const before=matrices(f.group),interactions=createWorldInteractions(f.group,f.records),saved=['standing-pine'];
    for(const mode of ['expedition','battle']){
      const damage=JSON.parse(JSON.stringify(saved));interactions.resetInteractions({mode,damage});assert.deepEqual(damage,saved);assert.equal(interactions.stats.destroyedCount,1);
      for(const record of f.records)for(const part of record.parts)for(let i=part.first;i<part.first+part.count;i++)assert.equal(part.batch.mesh.instanceMatrix.array[i*16+13]===-5000,record.id==='standing-pine',record.id);
      assert.equal(f.group.getObjectByName('Crushed fallen pine boughs').count,3);assert.equal(f.group.getObjectByName('Crushed fallen boughs').count,0);
      interactions.resetInteractions();for(const[mesh,array]of before)assert.deepEqual(Array.from(mesh.instanceMatrix.array),array);
    }
    assert.deepEqual(saved,['standing-pine']);assert.deepEqual(interactions.crushables,f.records.map(({parts,...record})=>record));
  }finally{disposeGroup(f.group);closeMasters(assets);restoreDocument();}
});

test('independent worlds own LOD geometry and instance state while sharing the immutable source atlas',()=>{
  const assets=masters(),a=createFixture(),b=createFixture(),first=bind(a,assets),second=bind(b,assets),disposed=new Map();let closedA=false;
  try{
    for(const master of assets.values())for(const resource of [master.geometry,...Object.values(master.lods),master.material,master.material.map]){disposed.set(resource,0);resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));}
    for(const mesh of first.meshes){
      const kind=mesh.userData.meshyTreeCoverage,other=second.meshes.find(m=>m.userData.meshyTreeCoverage===kind),master=assets.get(kind);
      assert.notEqual(mesh.geometry,other.geometry);assert.notEqual(mesh.geometry,master.lods.near);assert.equal(mesh.geometry.userData.shared,false);assert.notEqual(mesh.instanceMatrix,other.instanceMatrix);assert.equal(mesh.material.map,master.material.map);
      const x=other.instanceMatrix.array[12];mesh.instanceMatrix.array[12]+=99;assert.equal(other.instanceMatrix.array[12],x);
      disposed.set(mesh.geometry,0);mesh.geometry.addEventListener('dispose',()=>disposed.set(mesh.geometry,disposed.get(mesh.geometry)+1));
    }
    disposeGroup(a.group);closedA=true;
    for(const mesh of first.meshes)assert.equal(disposed.get(mesh.geometry),1);
    for(const master of assets.values())for(const resource of [master.geometry,...Object.values(master.lods),master.material,master.material.map])assert.equal(disposed.get(resource),0);
    for(const mesh of second.meshes)assert.ok(mesh.geometry.attributes.position.count>0);
  }finally{if(!closedA)disposeGroup(a.group);disposeGroup(b.group);closeMasters(assets);}
});

test('CPU-only omitted assets stay untouched, while an incomplete loaded LOD library rejects replacement',()=>{
  const f=createFixture(),before={wood:f.trees.wood.items.slice(),leaves:f.trees.leaves.items.slice(),needles:f.trees.needles.items.slice()},assets=masters();
  try{
    const absent=bindMeshyTreeCoverage({group:f.group,Instances:FixtureInstances,trees:f.trees,records:f.records,assets:new Map()});assert.equal(absent.stats.state,'not-loaded');assert.equal(absent.meshes.length,0);
    for(const[name,items]of Object.entries(before))assert.deepEqual(f.trees[name].items,items);
    assets.get('pine').lods.near.dispose();delete assets.get('pine').lods.near;
    assert.throws(()=>bindMeshyTreeCoverage({group:f.group,Instances:FixtureInstances,trees:f.trees,records:f.records,assets}),/pine near LOD is not loaded/);
    for(const[name,items]of Object.entries(before))assert.deepEqual(f.trees[name].items,items);
    assert.equal(JSON.stringify(f.records.map(({parts,...record})=>record)),f.identity);
  }finally{for(const batch of [f.trees.wood,f.trees.leaves,f.trees.needles,f.growth]){batch.geometry.dispose();batch.material.dispose();}closeMasters(assets);}
});

test('shipped Meshy LODs remain bounded geometry-only derivatives with unchanged source provenance',async()=>{
  let packageBytes=0;
  for(const kind of ['pine','broadleaf']){
    const bytes=await readFile(new URL(`../assets/scenery/meshy-pilot/${kind}-lods.glb`,import.meta.url));packageBytes+=bytes.length;
    assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
    const model=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.ok(!model.images?.length&&!model.textures?.length&&!model.animations?.length&&!model.skins?.length);assert.ok(!model.buffers.some(buffer=>buffer.uri));
    const original=await readFile(new URL(`../assets/scenery/meshy-pilot/${kind}.glb`,import.meta.url));assert.equal(model.extras.sourceSha256,createHash('sha256').update(original).digest('hex'));
    const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
    try{for(const level of ['near','far']){
      const mesh=gltf.scene.getObjectByName(`${kind}-${level}`);assert.ok(mesh?.isMesh);assert.equal(mesh.material.map,null);const geometry=mesh.geometry;geometry.computeBoundingBox();
      assert.deepEqual({min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()},model.extras.bounds);
      const triangles=geometry.index.count/3;assert.ok(triangles>100&&triangles<=7000);
      for(const name of ['position','normal','uv']){assert.ok(geometry.attributes[name]);for(const value of geometry.attributes[name].array)assert.ok(Number.isFinite(value));}
    }}finally{gltf.scene.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose();}});}
  }
  assert.ok(packageBytes>0&&packageBytes<1250000,'Geometry-only package must remain within the seam-preserving local derivative budget.');
});

// Decode the actual indexed source without loading its images or substituting
// fixture geometry. Source UV charts are connected position+UV components;
// normal-only vertex splits must not be mistaken for different atlas islands.
function indexedSourceGlb(bytes){
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
  let model,binary;
  for(let offset=12;offset<bytes.length;){const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4),chunk=bytes.subarray(offset+8,offset+8+length);if(type===0x4e4f534a)model=JSON.parse(chunk);if(type===0x004e4942)binary=chunk;offset+=8+length;}
  assert.ok(model&&binary);
  const values=index=>{
    const a=model.accessors[index],view=model.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3}[a.type],info={5123:[Uint16Array,2,'getUint16'],5125:[Uint32Array,4,'getUint32'],5126:[Float32Array,4,'getFloat32']}[a.componentType];
    assert.ok(size&&info&&!a.sparse&&!a.normalized);const [Type,bytes,method]=info,result=new Type(a.count*size),data=new DataView(binary.buffer,binary.byteOffset,binary.byteLength),first=(view.byteOffset??0)+(a.byteOffset??0),stride=view.byteStride??size*bytes;
    for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)result[i*size+j]=data[method](first+i*stride+j*bytes,true);
    return new T.BufferAttribute(result,size);
  };
  const scene=model.scenes[model.scene??0];assert.equal(scene.nodes.length,1);const node=model.nodes[scene.nodes[0]];assert.ok(!node.children?.length);
  const mesh=model.meshes[node.mesh];assert.equal(mesh.primitives.length,1);const primitive=mesh.primitives[0];assert.ok(primitive.mode===undefined||primitive.mode===4);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',values(primitive.attributes.POSITION));geometry.setAttribute('uv',values(primitive.attributes.TEXCOORD_0));geometry.setIndex(values(primitive.indices));
  const transform=new T.Matrix4();if(node.matrix)transform.fromArray(node.matrix);else transform.compose(new T.Vector3().fromArray(node.translation??[0,0,0]),new T.Quaternion().fromArray(node.rotation??[0,0,0,1]),new T.Vector3().fromArray(node.scale??[1,1,1]));
  geometry.applyMatrix4(transform);geometry.computeBoundingBox();const box=geometry.boundingBox,height=box.max.y-box.min.y,position=geometry.attributes.position;
  let x=0,z=0,count=0;for(let i=0;i<position.count;i++)if(position.getY(i)<=box.min.y+height*.035){x+=position.getX(i);z+=position.getZ(i);count++;}
  assert.ok(height>0&&count>0);geometry.translate(-x/count,-box.min.y,-z/count);geometry.scale(1/height,1/height,1/height);return geometry;
}

test('shipped near and far triangles preserve original Meshy UV chart boundaries',async()=>{
  for(const kind of ['pine','broadleaf']){
    const original=indexedSourceGlb(await readFile(new URL(`../assets/scenery/meshy-pilot/${kind}.glb`,import.meta.url)));
    const bytes=await readFile(new URL(`../assets/scenery/meshy-pilot/${kind}-lods.glb`,import.meta.url)),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
    try{
      const position=original.attributes.position.array,uv=original.attributes.uv.array,index=original.index.array,count=original.attributes.position.count;
      const parent=Int32Array.from({length:count},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},union=(a,b)=>{parent[find(a)]=find(b);};
      const key=(p,u,i)=>[p[i*3],p[i*3+1],p[i*3+2],u[i*2],u[i*2+1]].join(','),vertices=new Map();
      for(let i=0;i<count;i++){const k=key(position,uv,i);if(vertices.has(k))union(i,vertices.get(k));else vertices.set(k,i);}
      for(let i=0;i<index.length;i+=3){union(index[i],index[i+1]);union(index[i],index[i+2]);}
      const charts=Int32Array.from({length:count},(_,i)=>find(i));assert.ok(new Set(charts).size>1,'The actual source must expose its multiple UV charts.');
      for(const level of ['near','far']){
        const geometry=gltf.scene.getObjectByName(`${kind}-${level}`).geometry,p=geometry.attributes.position.array,u=geometry.attributes.uv.array,indices=geometry.index.array;
        const chart=Int32Array.from({length:geometry.attributes.position.count},(_,i)=>{const source=vertices.get(key(p,u,i));assert.notEqual(source,undefined,`${kind}/${level} changed an original position/UV value`);return charts[source];});
        let crossing=0;for(let i=0;i<indices.length;i+=3)if(chart[indices[i]]!==chart[indices[i+1]]||chart[indices[i]]!==chart[indices[i+2]])crossing++;
        assert.equal(crossing,0,`${kind}/${level}: ${crossing}/${indices.length/3} triangles bridge separate original UV charts and interpolate unrelated atlas regions`);
      }
    }finally{original.dispose();gltf.scene.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose();}});}
  }
});
