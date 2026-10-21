import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {fleshSculptFixture} from './helpers/carrier-sculpt-fixture.mjs';
import {createMeshyMonsterPose,inspectMeshyMonsterRig,MONSTER_RIG} from '../src/meshy-monster.js';
import {MONSTER_BODY_FIT} from '../src/meshy-monster-city.js';
import {assertDisplayRigDeclaration,createDisplayGeometryVerifier} from './beast-integration-display.mjs';

const asset=new URL('../assets/beast-integration/titanhorn-rigged.glb',import.meta.url),original=new URL('../asset-sources/meshy-beast-2026-10-20/Meshy_AI_Titanhorn_1021061157_texture.glb',import.meta.url);
const sha=value=>createHash('sha256').update(value).digest('hex');
const digest=attribute=>sha(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));
let restore,assets;
before(async()=>{assert.ok(fs.existsSync(asset),'New integrated beast asset must exist; no fallback/skip');restore=installCPUCarrierEnvironment();assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers(['flesh']);});
after(()=>restore?.());
function imageHashes(bytes){const length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);return(g.images??[]).map(image=>{const v=g.bufferViews[image.bufferView];return{mimeType:image.mimeType,sha256:sha(bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength))};});}
function signature(geometry,index){return['position','skinIndex','skinWeight'].flatMap(name=>{const a=geometry.attributes[name];return Array.from({length:a.itemSize},(_,k)=>a.getComponent(index,k));}).join(',');}

test('actual runtime beast retains original rig/contact data and the three private Meshy texture payloads',async()=>{
 const source=await fleshSculptFixture(),instance=assets.instantiateMeshyCarrier('flesh');
 try{
  const {mesh,bones,allBones,displayRig}=inspectMeshyMonsterRig(instance),geometry=mesh.geometry,count=source.mesh.geometry.attributes.position.count;
  assert.equal(mesh.userData.riggedBeast,true,'Runtime must select the new Meshy-derived body');assert.equal(geometry.userData.riggedBeast,true);
  assert.equal(count,85568);assert.equal(mesh.userData.sourceContactVertices,count);assert.equal(geometry.userData.sourceContactVertices,count);
  for(const name of ['position','uv','skinIndex','skinWeight']){
   const a=source.mesh.geometry.attributes[name],b=geometry.attributes[name];assert.equal(a.itemSize,b.itemSize);
   for(let i=0;i<a.array.length;i++)assert.equal(b.array[i],a.array[i],name+' source contact value '+i);
  }
  assert.equal(instance.capabilities.animations.length,0);assert.equal(source.mesh.skeleton.bones.length,54);assert.equal(bones.size,54);
  assert.equal(assertDisplayRigDeclaration(mesh),displayRig);
  const declaredDisplay=displayRig.chains.flatMap(chain=>chain.joints);
  assert.equal(new Set(declaredDisplay).size,declaredDisplay.length);assert.equal(mesh.skeleton.bones.length,54+declaredDisplay.length);assert.equal(allBones.size,mesh.skeleton.bones.length);
  assert.deepEqual(mesh.skeleton.bones.slice(54).map(bone=>bone.name).sort(),declaredDisplay.slice().sort(),'Only explicitly declared display joints may be appended');
  assert.ok(declaredDisplay.every(name=>!bones.has(name)),'Display joints do not replace the original contact skeleton');
  for(let i=0;i<54;i++){
   const a=source.mesh.skeleton.bones[i],b=mesh.skeleton.bones[i];assert.equal(b.name,a.name);assert.equal(b.parent.name,a.parent.name);
   assert.deepEqual(b.position.toArray(),a.position.toArray());assert.deepEqual(b.quaternion.toArray(),a.quaternion.toArray());assert.deepEqual(b.scale.toArray(),a.scale.toArray());assert.deepEqual(mesh.skeleton.boneInverses[i].toArray(),source.mesh.skeleton.boneInverses[i].toArray());
  }
  instance.root.updateMatrixWorld(true);
  for(let i=54;i<mesh.skeleton.bones.length;i++){
   const bone=mesh.skeleton.bones[i],identity=bone.matrixWorld.clone().multiply(mesh.skeleton.boneInverses[i]);
   assert.ok(identity.elements.every((value,index)=>Number.isFinite(value)&&Math.abs(value-(index%5===0?1:0))<1e-5),'Appended inverse bind matches its actual rest joint: '+bone.name);
  }
  assert.ok(geometry.index.count/3<=200000,'Do not expand the loader triangle budget to fit the source');
  for(const id of new Set(geometry.index.array)){
   let total=0;for(let lane=0;lane<4;lane++){const joint=geometry.attributes.skinIndex.getComponent(id,lane),weight=geometry.attributes.skinWeight.getComponent(id,lane);assert.ok(Number.isInteger(joint)&&joint>=0&&joint<mesh.skeleton.bones.length,'Rendered vertex joint exists in the actual skeleton');assert.ok(Number.isFinite(weight)&&weight>=0&&weight<=1,'Rendered skin weight is valid');total+=weight;}
   assert.ok(Math.abs(total-1)<1e-5,'Rendered vertex weights remain normalized: '+id);
  }
  const privateBytes=fs.readFileSync(original);assert.equal(sha(privateBytes),'46bf950200c1740c10c9a868da13780bf6c6a7bd9790706c30a55688394c1750');
  assert.deepEqual(imageHashes(fs.readFileSync(asset)),imageHashes(privateBytes),'All three original embedded PBR payloads remain exact');
  for(const key of ['map','normalMap','roughnessMap','metalnessMap'])assert.deepEqual([mesh.material[key]?.image.width,mesh.material[key]?.image.height],[2048,2048],key+' survives the runtime material path');
  assert.equal(mesh.material.vertexColors,false,'New paint comes from the preserved UV atlas');
  assert.deepEqual(MONSTER_BODY_FIT,{x:-.325,y:-1.8,z:-12,scaleX:16,scaleY:21,scaleZ:16,strikeAdvance:3.3});
 }finally{assets.disposeMeshyCarrier(instance);}
});

test('visible new paws match original contact through 360 walking, turning and stopping poses on slopes',async t=>{
 const source=await fleshSculptFixture(),candidate=assets.instantiateMeshyCarrier('flesh'),sourceInstance={body:source.gltf.scene,root:new T.Group(),capabilities:{animations:[]}};sourceInstance.root.add(source.gltf.scene);
 const ground=(x,z)=>.045*x+.025*z+.15*Math.sin(z*.15),controllers=[];
 // Exact clearance along an edge of this independently chosen slope/wave.
 // At fixed z the clearance on a triangle is affine, so its minimum is on
 // the boundary. Include analytic edge extrema, not just face vertices.
 function edgeClearance(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,clear=t=>{const x=a.x+t*dx,z=a.z+t*dz;return a.y+t*dy-ground(x,z);};
  let minimum=Math.min(clear(0),clear(1));if(Math.abs(dz)<1e-12)return minimum;
  const ratio=(dy-.045*dx-.025*dz)/(.0225*dz);if(Math.abs(ratio)>1)return minimum;
  const angle=Math.acos(ratio),low=.15*Math.min(a.z,b.z),high=.15*Math.max(a.z,b.z);
  for(const sign of [-1,1])for(let cycle=Math.floor((low-sign*angle)/(2*Math.PI));cycle<=Math.ceil((high-sign*angle)/(2*Math.PI));cycle++){
   const t=(sign*angle+cycle*2*Math.PI-.15*a.z)/(.15*dz);if(t>0&&t<1)minimum=Math.min(minimum,clear(t));
  }
  return minimum;
 }
 const fullWave=2*Math.PI/.15;
 assert.ok(Math.abs(edgeClearance(new T.Vector3(0,.1,0),new T.Vector3(0,.1+.025*fullWave,fullWave))+.05)<1e-12,'Analytic edge check catches a terrain crest missed by endpoints and midpoint');
 function pose(instance){const actor=new T.Group();actor.scale.setScalar(.55);instance.root.position.set(-.325,-1.8,-12);instance.root.scale.set(16,21,16);actor.add(instance.root);const controller=createMeshyMonsterPose(instance,{groundHeight:ground,strideDistance:8.8,supportCrouch:.12});controllers.push(controller);return{instance,actor,controller,...inspectMeshyMonsterRig(instance)};}
 const baseline=pose(sourceInstance),next=pose(candidate),sourceGeometry=baseline.mesh.geometry,geometry=next.mesh.geometry,used=new Set(geometry.index.array),groups={},displayVerifier=createDisplayGeometryVerifier(candidate);
 try{
  const originalSignatures=new Map();
  for(const [name,chain]of Object.entries(MONSTER_RIG))if(name!=='tail'){
   const joints=chain.slice(-2).map(b=>baseline.mesh.skeleton.bones.indexOf(baseline.bones.get(b))),sourceIds=[];
   for(let id=0;id<sourceGeometry.attributes.position.count;id++){let weight=0;for(let k=0;k<4;k++)if(joints.includes(sourceGeometry.attributes.skinIndex.getComponent(id,k)))weight+=sourceGeometry.attributes.skinWeight.getComponent(id,k);if(weight>=.4){sourceIds.push(id);originalSignatures.set(signature(sourceGeometry,id),name);}}
   groups[name]={joints,sourceIds,visible:[],hull:new Set(),faces:[]};
  }
  const inherited=new Map();
  for(const id of used){const name=originalSignatures.get(signature(geometry,id));if(name)inherited.set(id,name);for(const group of Object.values(groups)){let weight=0;for(let k=0;k<4;k++)if(group.joints.includes(geometry.attributes.skinIndex.getComponent(id,k)))weight+=geometry.attributes.skinWeight.getComponent(id,k);if(weight>=.4)group.visible.push(id);}}
  for(let i=0;i<geometry.index.count;i+=3){const face=[geometry.index.getX(i),geometry.index.getX(i+1),geometry.index.getX(i+2)],name=inherited.get(face[0]);if(name&&face.every(id=>inherited.get(id)===name)){groups[name].faces.push(face);face.forEach(id=>groups[name].hull.add(id));}}
  for(const group of Object.values(groups)){assert.ok(group.faces.length>20,'Visible original paw hull is required');assert.ok(group.visible.length>=group.hull.size);}
  const tip=next.controller.status().strikeVertexIndex;assert.ok([...used].some(id=>signature(geometry,id)===signature(sourceGeometry,tip)),'Original strike tip must exist in the actual rendered mesh, including UV duplicates');
  const attributes=Object.fromEntries(Object.entries(geometry.attributes).map(([name,a])=>[name,digest(a)])),point=new T.Vector3(),corners=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
  let maxRenderedGap=0,minVisible=Infinity,minFaces=Infinity,maxSoleError=0,swingingFrames=0,minWholeMesh=Infinity,minWholeFaces=Infinity,wholeMeshSamples=0,wholeTriangleSamples=0,wholeVertexTests=0,nearGroundFaces=0,wholeMinimum=null;
  const wholeClearances=new Float64Array(geometry.attributes.position.count);
  for(let frame=0;frame<360;frame++){
   const time=frame/60,moving=frame>=12&&frame<300,angle=time*.12,state={time,moving,distanceDelta:moving?1.92/60:0,heading:Math.PI/2-angle};
   for(const fixture of [baseline,next]){fixture.actor.position.set(16*Math.sin(angle),0,16*(1-Math.cos(angle)));fixture.actor.position.y=ground(fixture.actor.position.x,fixture.actor.position.z);fixture.actor.rotation.y=state.heading;fixture.instance.root.rotation.x=.035*Math.sin(time);fixture.controller.update(state);fixture.actor.updateMatrixWorld(true);}
   assert.deepEqual(next.controller.status(),baseline.controller.status(),'Original solver changes at frame '+frame);if(next.controller.status().legs.some(leg=>!leg.planted))swingingFrames++;
   for(const [name,bone]of baseline.bones){const actual=next.bones.get(name);assert.deepEqual(actual.position.toArray(),bone.position.toArray(),'Original local position '+name+' at '+frame);assert.deepEqual(actual.quaternion.toArray(),bone.quaternion.toArray(),'Original local orientation '+name+' at '+frame);assert.deepEqual(actual.scale.toArray(),bone.scale.toArray(),'Original local scale '+name+' at '+frame);}
   displayVerifier.check('slope-gait-frame-'+frame);
   for(const leg of next.controller.status().legs)maxSoleError=Math.max(maxSoleError,leg.soleError);
   // Every indexed display vertex is checked at every actual gait frame,
   // independent of original paw weights. Retain expensive analytic triangle
   // edge checks at the representative poses without weakening their margin.
   const wholePoints=frame%12===0?[]:null;
   for(const id of used){next.mesh.getVertexPosition(id,point).applyMatrix4(next.mesh.matrixWorld);const gap=point.y-ground(point.x,point.z);wholeClearances[id]=gap;
    if(gap<minWholeMesh){minWholeMesh=gap;wholeMinimum={frame,vertex:id,world:point.toArray()};}
    if(wholePoints)wholePoints[id]=point.clone();wholeVertexTests++;
   }
   wholeMeshSamples++;
   for(const group of Object.values(groups)){
    let oldMin=Infinity,hullMin=Infinity;
    for(const id of group.sourceIds){baseline.mesh.getVertexPosition(id,point).applyMatrix4(baseline.mesh.matrixWorld);oldMin=Math.min(oldMin,point.y-ground(point.x,point.z));}
    for(const id of group.visible){minVisible=Math.min(minVisible,wholeClearances[id]);if(group.hull.has(id))hullMin=Math.min(hullMin,wholeClearances[id]);}
    maxRenderedGap=Math.max(maxRenderedGap,Math.abs(hullMin-oldMin));
    for(const face of group.faces){face.forEach((id,k)=>next.mesh.getVertexPosition(id,corners[k]).applyMatrix4(next.mesh.matrixWorld));for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){point.set(0,0,0);corners.forEach((corner,k)=>point.addScaledVector(corner,weights[k]));minFaces=Math.min(minFaces,point.y-ground(point.x,point.z));}}
   }
   if(wholePoints){
    for(let i=0;i<geometry.index.count;i+=3){const face=[geometry.index.getX(i),geometry.index.getX(i+1),geometry.index.getX(i+2)];
     // The wave's full range is .30m, a conservative analytic bound for
     // interpolation error; only proven distant faces are rejected here.
     if(Math.min(...face.map(id=>wholeClearances[id]))>.300000001)continue;
     nearGroundFaces++;for(let edge=0;edge<3;edge++)minWholeFaces=Math.min(minWholeFaces,edgeClearance(wholePoints[face[edge]],wholePoints[face[(edge+1)%3]]));
    }
    wholeTriangleSamples++;
   }
  }
  t.diagnostic(JSON.stringify({maxRenderedGap,minVisible,minFaces,maxSoleError,swingingFrames,minWholeMesh,minWholeFaces,wholeMeshSamples,wholeTriangleSamples,wholeVertexTests,wholeMinimum,nearGroundFaces,display:displayVerifier.metrics}));
  assert.ok(swingingFrames>200);assert.ok(maxRenderedGap<1e-6);assert.ok(minVisible>=-.001,'New weighted paw surface penetrates terrain');assert.ok(minFaces>=-.001,'Visible hull face penetrates terrain');assert.ok(maxSoleError<.001);
  assert.equal(wholeMeshSamples,360);assert.equal(wholeTriangleSamples,30);assert.equal(wholeVertexTests,used.size*360);assert.ok(nearGroundFaces>0);assert.ok(minWholeMesh>=-.001,'An actual indexed display vertex penetrates terrain');assert.ok(minWholeFaces>=-.001,'An actual indexed display triangle crosses the slope/wave terrain');
  assert.deepEqual(Object.fromEntries(Object.entries(geometry.attributes).map(([name,a])=>[name,digest(a)])),attributes,'Animation must not rewrite geometry or skin data');
 }finally{controllers.forEach(c=>c.dispose());assets.disposeMeshyCarrier(candidate);}
});
