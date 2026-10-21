import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {GROUND_COVER_LIMITS,createGroundCoverGeometry,createGroundCoverPlacements,createGroundCoverVolume,groundCoverLocationAllowed} from '../src/ground-cover-volume.js';
import {bankWidth,protectedResource,renderedTerrainHeight,roadZ,shoreDistance,terrainNormal} from '../src/terrain.js';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const records=Object.freeze([
  Object.freeze({id:'tree:fixture',kind:'tree',x:-72,z:49,size:1.5,parts:Object.freeze([])}),
  Object.freeze({id:'rock:fixture',kind:'rock',x:106,z:5,size:3,parts:Object.freeze([])}),
]);

test('opaque masters are finite nondegenerate shapes within the small plant envelope',()=>{
  const counts={grass:10,fern:32,shrub:288},a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),edge=new T.Vector3();
  for(const kind of Object.keys(counts)){
    const geometry=createGroundCoverGeometry(kind);
    try{
      assert.equal(geometry.attributes.position.count/3,counts[kind]);
      assert.deepEqual(Object.keys(geometry.attributes).sort(),['color','normal','position']);
      for(const attr of Object.values(geometry.attributes))for(const value of attr.array)assert.ok(Number.isFinite(value));
      for(let i=0;i<geometry.attributes.position.count;i+=3){
        a.fromBufferAttribute(geometry.attributes.position,i);b.fromBufferAttribute(geometry.attributes.position,i+1);c.fromBufferAttribute(geometry.attributes.position,i+2);
        assert.ok(edge.copy(b).sub(a).cross(c.sub(a)).lengthSq()>1e-9,kind+' degenerate triangle');
      }
      for(let i=0;i<geometry.attributes.normal.count;i++){a.fromBufferAttribute(geometry.attributes.normal,i);assert.ok(Math.abs(a.length()-1)<1e-5);}
      assert.ok(geometry.boundingBox.min.y>=0);assert.ok(geometry.boundingBox.max.y<=1.000001);
      assert.ok(geometry.boundingBox.max.x-geometry.boundingBox.min.x<2.4);
      assert.ok(geometry.boundingBox.max.z-geometry.boundingBox.min.z<2.4);
      assert.ok(geometry.boundingSphere.radius>0&&geometry.boundingSphere.radius<1.7);
    }finally{geometry.dispose();}
  }
});

test('independent deterministic colonies respect banks, road, resources, start, slopes and original records',()=>{
  const before=digest(records),random=Math.random;let result;
  Math.random=()=>{throw new Error('World/global randomness must not be consumed');};
  try{result=createGroundCoverPlacements(records);}finally{Math.random=random;}
  const repeated=createGroundCoverPlacements([...records].reverse());
  assert.equal(digest(records),before);assert.equal(digest(result),digest(repeated));
  assert.ok(result.placements.length>=3000&&result.placements.length<=GROUND_COVER_LIMITS.instances);
  assert.ok(result.patchCount>50&&result.patchCount<GROUND_COVER_LIMITS.patches);
  assert.ok(result.attempts<GROUND_COVER_LIMITS.patches*60);
  assert.equal(result.coreInstances+result.fringeInstances,result.placements.length);
  assert.ok(result.fringeInstances>=result.placements.length*.28,'Budget must include substantial feathered low cover');
  const fringe=result.placements.filter(item=>item.zone==='fringe');
  assert.ok(fringe.every(item=>item.kind==='grass'&&item.sy<.78));
  assert.ok(fringe.some(item=>Math.abs(item.x)<90&&Math.abs(item.z)<110),'Eligible middle-valley gaps receive small grass colonies');
  const kinds=new Set(),quadrants=new Set();
  for(const item of result.placements){
    kinds.add(item.kind);quadrants.add(Math.sign(item.x)+','+Math.sign(item.z));
    for(const key of['x','y','z','sx','sy','sz','yaw','radius'])assert.ok(Number.isFinite(item[key]));
    assert.ok(groundCoverLocationAllowed(item.x,item.z,item.radius));
    assert.equal(protectedResource(item.x,item.z,item.radius+2),false);
    assert.ok(Math.hypot(item.x+30,item.z-40)>=27+item.radius);
    assert.ok(Math.abs(item.z-roadZ(item.x))>=10);
    assert.ok(shoreDistance(item.x,item.z)>=bankWidth(item.x,item.z)+2.5);
    assert.ok(terrainNormal(item.x,item.z).y>=GROUND_COVER_LIMITS.minimumNormalY);
    assert.equal(item.y,renderedTerrainHeight(item.x,item.z)-.035);
    assert.ok(item.radius<=GROUND_COVER_LIMITS.maxRadius);
    for(const record of records){const radius=Math.min(7,Math.max(.7,record.size*(record.kind==='rock'?1.2:.65)));assert.ok(Math.hypot(item.x-record.x,item.z-record.z)>=radius+item.radius*.58);}
  }
  assert.equal(kinds.size,3);assert.equal(quadrants.size,4);
  for(const point of[[-30,40],[-65,-15],[40,-45],[55,65],[90,-105],[-110,90],[-115,-110],[0,134],[NaN,0],[0,Infinity]])assert.equal(groundCoverLocationAllowed(...point),false);
});

test('three global draws share only three masters and one opaque material, with no picking, shadows or CPU animation tick',()=>{
  const clock={value:3},layer=createGroundCoverVolume({timeUniform:clock,existingRecords:records}),before=digest(records);
  try{
    assert.equal(layer.group.name,'Low-poly ground cover');assert.equal(layer.group.userData.noBatch,true);assert.equal(layer.group.raycast(),false);
    const meshes=layer.group.children,geometrySet=new Set(meshes.map(m=>m.geometry)),materialSet=new Set(meshes.map(m=>m.material));
    assert.equal(geometrySet.size,3);assert.equal(materialSet.size,1);assert.equal(meshes.length,3);
    // Approved botanical replacement: 288-triangle compound shrub, with the
    // same 6400-instance/three-draw cap and measured 35.6KB master storage.
    assert.ok(layer.stats.totalTriangles<=220000);assert.ok(layer.stats.uniqueGeometryBytes<40000);
    assert.equal(layer.stats.instanceBytes,layer.stats.instances*(16+3)*4);
    assert.equal('placements' in layer.stats,false,'Runtime diagnostics retain only compact summaries');
    assert.equal(typeof layer.update,'undefined');assert.equal(clock.value,3);assert.equal(digest(records),before);
    const point=new T.Vector3(),matrix=new T.Matrix4();
    for(const mesh of meshes){
      assert.ok(mesh.isInstancedMesh);assert.equal(mesh.raycast(),false);assert.equal(mesh.userData.noBatch,true);
      assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);assert.equal(mesh.frustumCulled,true);
      assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.map,null);assert.equal(mesh.material.alphaTest,0);
      assert.equal(mesh.instanceMatrix.usage,T.StaticDrawUsage);assert.equal(mesh.instanceColor.usage,T.StaticDrawUsage);
      for(const value of mesh.instanceMatrix.array)assert.ok(Number.isFinite(value));
      // Full-size geometry and all roots lie inside the padded culling bounds.
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);
        for(let j=0;j<mesh.geometry.attributes.position.count;j++){
          point.fromBufferAttribute(mesh.geometry.attributes.position,j).applyMatrix4(matrix);
          assert.ok(mesh.boundingBox.containsPoint(point));assert.ok(mesh.boundingSphere.containsPoint(point));
        }
      }
    }
    const shader={uniforms:{},vertexShader:T.ShaderLib.lambert.vertexShader,fragmentShader:T.ShaderLib.lambert.fragmentShader};
    const material=meshes[0].material;material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.uGroundCoverTime,clock);assert.ok(shader.vertexShader.includes('transformed*=coverScale'));
    assert.equal(shader.fragmentShader,T.ShaderLib.lambert.fragmentShader);
    assert.equal((shader.vertexShader.match(/uniform float uGroundCoverTime/g)||[]).length,1);
    assert.equal(material.customProgramCacheKey(),'ground-cover-volume-v1');
    const matrixVersions=meshes.map(m=>m.instanceMatrix.version);
    for(const quality of['performance','retro','low','balanced','high']){
      layer.setQuality(quality);const budget=layer.stats.qualityBudgets[quality];
      assert.equal(meshes.reduce((n,m)=>n+m.count,0),budget.instances);assert.equal(layer.stats.activeInstances,budget.instances);
      assert.equal(layer.stats.activeTriangles,budget.triangles);
      assert.deepEqual(meshes.map(m=>m.instanceMatrix.version),matrixVersions);
    }
    const raycaster=new T.Raycaster(new T.Vector3(-72,100,49),new T.Vector3(0,-1,0));
    assert.deepEqual(raycaster.intersectObject(layer.group,true),[]);
  }finally{layer.dispose();}
  assert.equal(layer.stats.disposed,true);assert.equal(layer.group.children.length,0);
});

test('independent owners and idempotent disposal never free another layer or mutate the supplied clock',()=>{
  const clock={value:0},a=createGroundCoverVolume({timeUniform:clock}),b=createGroundCoverVolume({timeUniform:clock}),events=new Map();
  try{
    assert.notEqual(a.group.children[0].material,b.group.children[0].material);
    const resources=new Set(a.group.children.flatMap(mesh=>[mesh,mesh.geometry,mesh.material]));
    for(const resource of resources){events.set(resource,0);resource.addEventListener('dispose',()=>events.set(resource,events.get(resource)+1));}
    a.dispose();a.dispose();a.setQuality('low');
    for(const count of events.values())assert.equal(count,1);
    assert.ok(b.group.children.length);assert.equal(b.stats.disposed,false);assert.equal(clock.value,0);
  }finally{a.dispose();b.dispose();}
  assert.throws(()=>createGroundCoverVolume({timeUniform:{value:NaN}}),/finite/);
});
