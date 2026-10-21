import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {createMeshyMonsterPose,inspectMeshyMonsterRig,MONSTER_RIG} from '../src/meshy-monster.js';
import {fleshSculptFixture} from './helpers/carrier-sculpt-fixture.mjs';

const provenance=JSON.parse(fs.readFileSync(new URL('../asset-sources/authored-flesh.json',import.meta.url)));
const digest=value=>createHash('sha256').update(Buffer.from(value.buffer,value.byteOffset,value.byteLength)).digest('hex');
const ground=(x,z)=>.045*x+.025*z+.15*Math.sin(z*.15);
async function candidateFixture(){
  const input=fs.readFileSync(new URL('../assets/art-remake/flesh-sculpt.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength),'');
  let mesh;gltf.scene.traverse(object=>{if(object.isSkinnedMesh)mesh=object;});
  return{gltf,mesh,input};
}
function posedFixture(fixture){
  const {gltf}=fixture,actor=new T.Group(),root=new T.Group();
  actor.scale.setScalar(.55);root.scale.set(16,21,16);root.position.set(-.325,-1.8,-12);
  root.add(gltf.scene);actor.add(root);
  const instance={body:gltf.scene,root,capabilities:{animations:gltf.animations.map(clip=>clip.name)}};
  const controller=createMeshyMonsterPose(instance,{groundHeight:ground,strideDistance:8.8,supportCrouch:.12});
  return{actor,root,controller,...inspectMeshyMonsterRig(instance)};
}

test('authored flesh bytes, original contact attributes, and complete rig match their recorded provenance',async()=>{
  const baseline=await fleshSculptFixture(),next=await candidateFixture();
  assert.equal(digest(baseline.input),provenance.source.sha256);
  assert.equal(digest(next.input),provenance.output.sha256);
  assert.equal(next.input.length,provenance.output.bytes);
  const count=baseline.mesh.geometry.attributes.position.count;
  assert.equal(next.mesh.userData.authoredFlesh,true);
  assert.equal(next.mesh.userData.sourceContactVertices,count);
  assert.equal(next.mesh.userData.sourceContactSha256,provenance.source.sha256);
  for(const key of ['position','uv','skinIndex','skinWeight']){
    const source=baseline.mesh.geometry.attributes[key].array,candidate=next.mesh.geometry.attributes[key].array;
    assert.equal(digest(candidate.subarray(0,source.length)),digest(source),key+' source pool remains byte exact');
  }
  assert.equal(next.mesh.skeleton.bones.length,54);assert.equal(next.gltf.animations.length,0);
  for(let i=0;i<54;i++){
    const source=baseline.mesh.skeleton.bones[i],candidate=next.mesh.skeleton.bones[i];
    assert.equal(candidate.name,source.name);assert.equal(candidate.parent.name,source.parent.name);
    assert.deepEqual(candidate.position.toArray(),source.position.toArray());
    assert.deepEqual(candidate.quaternion.toArray(),source.quaternion.toArray());
    assert.deepEqual(candidate.scale.toArray(),source.scale.toArray());
    assert.deepEqual(next.mesh.skeleton.boneInverses[i].toArray(),baseline.mesh.skeleton.boneInverses[i].toArray());
  }
  assert.ok(next.mesh.material.vertexColors,'The authored paint remains part of the asset');
  assert.equal(next.mesh.material.map,null,'The new body does not sample the old shredded atlas');
});

test('authored upper skull keeps a visible surface at the original combat height band',async()=>{
  const {mesh}=await candidateFixture(),geometry=mesh.geometry;
  const visible=new Set(geometry.index.array);
  assert.ok(Math.max(...[...visible].map(index=>geometry.attributes.position.getY(index)))<1.7,'The crest stays below the original maximum height');
  // The original skin surface crossed by unchanged combat rays was near this
  // bind-space height and x coordinate. The old low skull left an empty ray.
  const material=new T.MeshBasicMaterial(),bindMesh=new T.Mesh(geometry,material);
  const ray=new T.Raycaster(new T.Vector3(-.124703,1.549029,1.5),new T.Vector3(0,0,-1));
  const hit=ray.intersectObject(bindMesh,false)[0];
  assert.ok(hit&&hit.point.z>.65&&hit.point.z<.95,'A coherent upper-skull surface must intercept the original head-height band');
  const bone=mesh.skeleton.bones.findIndex(value=>value.name==='Bone_053');
  const position=geometry.attributes.position,barycentric=new T.Vector3();
  T.Triangle.getBarycoord(hit.point,new T.Vector3().fromBufferAttribute(position,hit.face.a),new T.Vector3().fromBufferAttribute(position,hit.face.b),new T.Vector3().fromBufferAttribute(position,hit.face.c),barycentric);
  let influence=0;
  [hit.face.a,hit.face.b,hit.face.c].forEach((index,corner)=>{for(let lane=0;lane<4;lane++)if(geometry.attributes.skinIndex.getComponent(index,lane)===bone)influence+=geometry.attributes.skinWeight.getComponent(index,lane)*barycentric.getComponent(corner);});
  assert.ok(influence>.5,'Upper-skull target follows the original nape joint');
  material.dispose();
});

test('authored paw hulls retain actual rendered contact through walking, turning, stopping and slopes',async()=>{
  const baseline=posedFixture(await fleshSculptFixture()),next=posedFixture(await candidateFixture());
  const count=baseline.mesh.geometry.attributes.position.count;
  const indices=baseline.mesh.geometry.attributes.skinIndex,weights=baseline.mesh.geometry.attributes.skinWeight;
  const paws=Object.fromEntries(Object.entries(MONSTER_RIG).filter(([name])=>name!=='tail').map(([name,chain])=>{
    const joints=chain.slice(-2).map(bone=>baseline.mesh.skeleton.bones.indexOf(baseline.bones.get(bone))),source=new Set();
    for(let vertex=0;vertex<count;vertex++){
      let total=0;for(let axis=0;axis<4;axis++)if(joints.includes(indices.getComponent(vertex,axis)))total+=weights.getComponent(vertex,axis);
      if(total>=.4)source.add(vertex);
    }
    return[name,{source,hull:new Set(),faces:[]}];
  }));
  const faces=next.mesh.geometry.index;
  for(let i=0;i<faces.count;i+=3){
    const triangle=[faces.getX(i),faces.getX(i+1),faces.getX(i+2)];
    if(triangle.some(vertex=>vertex>=count))continue;
    const paw=Object.values(paws).find(value=>triangle.every(vertex=>value.source.has(vertex)));
    assert.ok(paw,'Every visible original-pool triangle belongs to one retained paw');
    paw.faces.push(triangle);for(const vertex of triangle)paw.hull.add(vertex);
  }
  for(const paw of Object.values(paws)){assert.ok(paw.source.size>30);assert.ok(paw.faces.length>20);assert.ok(paw.hull.size>10);}
  assert.deepEqual(next.controller.status().legs.map(leg=>leg.soleSamples),baseline.controller.status().legs.map(leg=>leg.soleSamples));
  assert.equal(next.controller.status().strikeVertexIndex,baseline.controller.status().strikeVertexIndex);
  const point=new T.Vector3(),corners=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
  let maxRenderedGap=0,minHullClearance=Infinity,minFaceClearance=Infinity,maxSoleError=0;
  for(let frame=0;frame<360;frame++){
    const time=frame/60,moving=frame>=12&&frame<300,angle=time*.12;
    const state={time,moving,distanceDelta:moving?1.92/60:0,heading:Math.PI/2-angle};
    for(const fixture of [baseline,next]){
      fixture.actor.position.set(16*Math.sin(angle),0,16*(1-Math.cos(angle)));
      fixture.actor.position.y=ground(fixture.actor.position.x,fixture.actor.position.z);
      fixture.actor.rotation.y=state.heading;fixture.root.rotation.x=.035*Math.sin(time);
      fixture.controller.update(state);fixture.actor.updateMatrixWorld(true);
    }
    assert.deepEqual(next.controller.status(),baseline.controller.status(),'Contact solver differs at frame '+frame);
    for(const leg of next.controller.status().legs)maxSoleError=Math.max(maxSoleError,leg.soleError);
    for(const paw of Object.values(paws)){
      let sourceMinimum=Infinity,hullMinimum=Infinity;
      for(const vertex of paw.source){baseline.mesh.getVertexPosition(vertex,point).applyMatrix4(baseline.mesh.matrixWorld);sourceMinimum=Math.min(sourceMinimum,point.y-ground(point.x,point.z));}
      for(const vertex of paw.hull){next.mesh.getVertexPosition(vertex,point).applyMatrix4(next.mesh.matrixWorld);hullMinimum=Math.min(hullMinimum,point.y-ground(point.x,point.z));}
      maxRenderedGap=Math.max(maxRenderedGap,Math.abs(hullMinimum-sourceMinimum));
      minHullClearance=Math.min(minHullClearance,hullMinimum);
      // A face can pass below curved terrain even with all vertices above it.
      // Test actual skinned centres and edge midpoints, not just the hidden pool.
      for(const face of paw.faces){
        face.forEach((vertex,index)=>next.mesh.getVertexPosition(vertex,corners[index]).applyMatrix4(next.mesh.matrixWorld));
        for(const sample of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){
          point.set(0,0,0);corners.forEach((corner,index)=>point.addScaledVector(corner,sample[index]));
          minFaceClearance=Math.min(minFaceClearance,point.y-ground(point.x,point.z));
        }
      }
    }
    for(const bone of next.bones.values())assert.ok(bone.matrixWorld.elements.every(Number.isFinite));
  }
  assert.ok(maxRenderedGap<1e-6,'Rendered hull minimum must equal the original source sole minimum');
  assert.ok(minHullClearance>=-.001,'Rendered paw vertices penetrate sampled terrain');
  assert.ok(minFaceClearance>=-.001,'Rendered paw faces penetrate sampled terrain');
  assert.ok(maxSoleError<.001,'Source sole solver must retain submillimetre contact error');
});
