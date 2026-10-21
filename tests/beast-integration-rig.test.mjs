import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment,embeddedImageDimensions} from './beast-integration-cpu.mjs';
import {createMeshyMonsterPose} from '../src/meshy-monster.js';
import {glbSource,sha256,geometryDigest,assertNativeDeclaration,createNativeGeometryVerifier,createNativeSurfaceCorrectionVerifier,NATIVE_KEYS} from './helpers/native-beast-contract.mjs';
import {createSurfacePlantVerifier,nativeTestGround,nativeGroundEdgeClearance} from './helpers/native-beast-surface.mjs';

const activeURL=new URL('../assets/beast-integration/titanhorn-rigged.glb',import.meta.url);
const walkingURL=new URL('../asset-sources/meshy-quadruped-rig-2026-10-21/Meshy_AI_Titanhorn_quadruped/Meshy_AI_Titanhorn_quadruped_model_Animation_Walking_withSkin.glb',import.meta.url);
const pbrURL=new URL('../asset-sources/meshy-quadruped-rig-2026-10-21/Meshy_AI_Titanhorn_1021121044_texture.glb',import.meta.url);
let restore,assets;
const activeMetadata=()=>glbSource(activeURL).document.meshes[0].extras.nativeQuadruped;
function instantiateNative(){const metadata=activeMetadata();return assets.instantiateMeshyCarrier('flesh',{clipName:metadata.clipName,strideDistance:metadata.strideDistance});}
before(async()=>{restore=installCPUCarrierEnvironment();assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers(['flesh']);});
after(()=>restore?.());

function fixture(groundHeight=()=>0){
 const instance=instantiateNative(),contract=assertNativeDeclaration(instance),actor=new T.Group(),fit=contract.metadata.fit;
 actor.scale.setScalar(.55);instance.root.position.set(fit.x,fit.y,fit.z);instance.root.scale.set(fit.scaleX,fit.scaleY,fit.scaleZ);actor.add(instance.root);actor.updateMatrixWorld(true);
 const sourceGeometry=contract.mesh.geometry;const controller=createMeshyMonsterPose(instance,{groundHeight,strideDistance:contract.metadata.strideDistance});
 return{instance,actor,controller,sourceGeometry,...contract};
}
const transforms=objects=>objects.map(object=>[object.position.toArray(),object.quaternion.toArray(),object.scale.toArray()]);

test('native runtime uses the original connected quadruped surface, 27-joint rig, clip and exact source PBR payloads',()=>{
 const source=glbSource(walkingURL),pbr=glbSource(pbrURL),active=glbSource(activeURL),instance=instantiateNative();
 try{
  const {mesh,metadata,topology}=assertNativeDeclaration(instance),primitive=source.document.meshes[0].primitives[0];
  assert.equal(sha256(source.bytes),'e72e56349f3c1f85479b9e45df35be371556e4fad5ae6c78852be2a621c2d223');
  assert.equal(sha256(pbr.bytes),'0d232dc99627451dff25c9488e7e975294a5e166fc2683b7196c2c2fd2a8492d');
  for(const [name,semantic]of Object.entries({position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0'}))assert.deepEqual(Array.from(mesh.geometry.attributes[name].array),source.accessor(primitive.attributes[semantic]),name+' retains original native anatomy');
  assert.deepEqual(Array.from(mesh.geometry.index.array),source.accessor(primitive.indices));
  assert.equal(topology.faces,100400);assert.equal(topology.used.length,mesh.geometry.attributes.position.count,'There is no unused hidden contact pool');assert.equal(topology.components,1,'All source feet connect to the rendered body');
  const skin=source.document.skins[0],ibm=source.accessor(skin.inverseBindMatrices),stripMetadata=nodes=>nodes.map(({extras,...node})=>node);
  assert.deepEqual(stripMetadata(active.document.nodes),stripMetadata(source.document.nodes),'Raw exported node declarations remain exact; instantiated nodes may already have Walking t0 applied');
  assert.deepEqual(active.document.skins,source.document.skins);
  assert.deepEqual(mesh.skeleton.bones.map(bone=>bone.name),skin.joints.map(id=>source.document.nodes[id].name));
  for(let i=0;i<skin.joints.length;i++){
   assert.deepEqual(mesh.skeleton.boneInverses[i].toArray(),ibm.slice(i*16,i*16+16));
  }
  const writtenPrimitive=active.document.meshes[0].primitives[0];
  // Asset provenance compares written accessors. GLTFLoader normalizes the
  // Float32 weight attribute on load; that separate operation is checked
  // exactly below, rather than treating its rounding as an authoring edit.
  const positions=source.accessor(primitive.attributes.POSITION),originalJ=source.accessor(primitive.attributes.JOINTS_0),originalW=source.accessor(primitive.attributes.WEIGHTS_0),nextJ=active.accessor(writtenPrimitive.attributes.JOINTS_0),nextW=active.accessor(writtenPrimitive.attributes.WEIGHTS_0);
  assert.deepEqual(Array.from(mesh.geometry.attributes.skinIndex.array),nextJ,'Loader preserves written joint indices');
  const correction=metadata.plantarWeightCorrection;assert.equal(correction.fullBelowRawY,.00065);assert.equal(correction.unchangedAboveRawY,.0012);
  const jointNames=skin.joints.map(id=>source.document.nodes[id].name),chains=Object.fromEntries(NATIVE_KEYS.map(key=>[key,metadata.chains[key].map(name=>jointNames.indexOf(name))])),affected=Object.fromEntries(NATIVE_KEYS.map(key=>[key,0]));
  for(let vertex=0;vertex<positions.length/3;vertex++){
   const offset=vertex*4,oldJ=originalJ.slice(offset,offset+4),oldW=originalW.slice(offset,offset+4),j=Array.from(nextJ.slice(offset,offset+4)),w=Array.from(nextW.slice(offset,offset+4)),y=positions[vertex*3+1];
   const reciprocal=1/(Math.abs(w[0])+Math.abs(w[1])+Math.abs(w[2])+Math.abs(w[3])),expectedRuntime=reciprocal===Infinity?[1,0,0,0]:w.map(value=>Math.fround(value*reciprocal));
   assert.deepEqual(Array.from(mesh.geometry.attributes.skinWeight.array.slice(offset,offset+4)),expectedRuntime,'Exact independent Float32 normalization of written weights at '+vertex);
   assert.ok(j.every(id=>Number.isInteger(id)&&id>=0&&id<27)&&w.every(value=>Number.isFinite(value)&&value>=0));assert.ok(Math.abs(w.reduce((sum,value)=>sum+value,0)-1)<1e-5);
   const eligible=NATIVE_KEYS.filter(key=>y<.0012&&oldW.reduce((sum,value,lane)=>sum+(chains[key].includes(oldJ[lane])?value:0),0)>=.5);
   assert.ok(eligible.length<=1,'Plantar correction has one anatomical owner');
   if(!eligible.length){assert.deepEqual(j,oldJ,'Unmodified upper/non-paw joints at '+vertex);assert.deepEqual(w,oldW,'Unmodified upper/non-paw weights at '+vertex);continue;}
   const key=eligible[0],terminal=chains[key].at(-1),priorTerminal=oldW.reduce((sum,value,lane)=>sum+(oldJ[lane]===terminal?value:0),0),terminalWeight=w.reduce((sum,value,lane)=>sum+(j[lane]===terminal?value:0),0);affected[key]++;
   for(let lane=0;lane<4;lane++)if(w[lane]>0)assert.ok(j[lane]===terminal||oldJ.some((id,index)=>id===j[lane]&&oldW[index]>0),'Correction cannot introduce unrelated joint influence');
   assert.ok(terminalWeight+1e-7>=priorTerminal,'Plantar cleanup cannot reduce its own terminal influence');
   if(y<=.00065)assert.ok(Math.abs(terminalWeight-1)<1e-7,'Actual low sole belongs rigidly to its native paw');
  }
  for(const key of NATIVE_KEYS)assert.equal(affected[key],correction.changes[key].vertices,'Recorded bounded plantar scope '+key);
  assert.deepEqual(active.document.animations,source.document.animations,'Source clip declaration is preserved in the private asset');
  const imageSummary=images=>images.map(({mimeType,sha256})=>({mimeType,sha256}));assert.deepEqual(imageSummary(active.images()),imageSummary(pbr.images()));
  const material=pbr.document.materials[0],imageFor=index=>pbr.images()[pbr.document.textures[index].source].payload;
  const textureIndices={map:material.pbrMetallicRoughness.baseColorTexture.index,normalMap:material.normalTexture.index,roughnessMap:material.pbrMetallicRoughness.metallicRoughnessTexture.index,metalnessMap:material.pbrMetallicRoughness.metallicRoughnessTexture.index};
  for(const [key,index]of Object.entries(textureIndices)){const expected=embeddedImageDimensions(imageFor(index));assert.deepEqual([mesh.material[key]?.image.width,mesh.material[key]?.image.height],[expected.width,expected.height],key+' retains its actual source resolution');}
  assert.equal(mesh.material.vertexColors,false);
  assert.ok([metadata.fit.scaleX,metadata.fit.scaleY,metadata.fit.scaleZ].every(value=>Number.isFinite(value)&&value>0));assert.equal(metadata.fit.scaleX,metadata.fit.scaleY);assert.equal(metadata.fit.scaleY,metadata.fit.scaleZ,'No old31.25percent vertical stretch');
 }finally{assets.disposeMeshyCarrier(instance);}
});

test('native distance phase pauses exactly and cannot change the actor, fitted root or game marker',()=>{
 const f=fixture(),marker=new T.Object3D();f.actor.add(marker);const original=transforms([f.actor,f.instance.root,marker]);
 try{
  const idle=f.controller.update({time:0,moving:false,heading:0}),first=f.controller.update({time:1,moving:true,distanceDelta:f.metadata.strideDistance*.1,heading:0});
  assert.ok(Math.abs(first.phaseNormalized-(idle.phaseNormalized+.1)%1)<1e-10,'Actual travelled distance advances the native clip from its declared initial phase');
  const pausedPositions=f.mesh.geometry.attributes.position.array.slice(),pausedNormals=f.mesh.geometry.attributes.normal.array.slice();const bones=f.mesh.skeleton.bones.map(b=>[b.position.toArray(),b.quaternion.toArray(),b.scale.toArray()]);
  assert.deepEqual(f.controller.update({time:1,moving:true,distanceDelta:100,heading:0}),first,'Repeated simulation time must not advance native motion');
  assert.deepEqual(f.mesh.skeleton.bones.map(b=>[b.position.toArray(),b.quaternion.toArray(),b.scale.toArray()]),bones);
  assert.deepEqual(f.mesh.geometry.attributes.position.array,pausedPositions,'Paused corrected positions exact');assert.deepEqual(f.mesh.geometry.attributes.normal.array,pausedNormals,'Paused corrected normals exact');f.controller.update({time:2,moving:false,distanceDelta:100,heading:0});assert.equal(f.controller.status().phaseNormalized,first.phaseNormalized,'Stopped actor cannot accumulate a walking cycle');
  assert.deepEqual(transforms([f.actor,f.instance.root,marker]),original,'Presentation solver cannot move the actor, fitted root or marker');
 }finally{f.controller.dispose();assets.disposeMeshyCarrier(f.instance);}
});

test('native visible soles stay planted and every indexed body vertex clears terrain across 360 walk, turn and stop frames',t=>{
 const f=fixture(nativeTestGround),verifier=createNativeGeometryVerifier(f.instance),plants=createSurfacePlantVerifier(f.mesh,nativeTestGround),surfaceContract=createNativeSurfaceCorrectionVerifier(f.mesh,f.sourceGeometry),used=plants.topology.used,index=f.mesh.geometry.index.array;
 const point=new T.Vector3(),gaps=new Float64Array(f.mesh.geometry.attributes.position.count),metrics={frames:0,vertexTests:0,triangleFrames:0,nearGroundFaces:0,minimumVertex:Infinity,minimumTriangle:Infinity,minimum:null,stanceSamples:Object.fromEntries(NATIVE_KEYS.map(key=>[key,0])),swingSamples:Object.fromEntries(NATIVE_KEYS.map(key=>[key,0]))};
 let x=0,z=0;
 try{
  for(let frame=0;frame<360;frame++){
   const moving=frame>=12&&frame<300,heading=frame<120?0:.35*Math.sin((frame-120)/60),distanceDelta=moving?.12:0;
   x+=Math.sin(heading)*distanceDelta;z+=Math.cos(heading)*distanceDelta;f.actor.position.set(x,nativeTestGround(x,z),z);f.actor.rotation.y=heading;
   const state=f.controller.update({time:frame/60,moving,distanceDelta,heading});f.actor.updateMatrixWorld(true);
   const legs=state.legs.map(leg=>({...leg,name:leg.name??leg.key}));
   surfaceContract.check('gait-'+frame);verifier.check('gait-'+frame);plants.check(legs,'gait-'+frame);
   for(const leg of legs){
    (leg.planted?metrics.stanceSamples:metrics.swingSamples)[leg.name]++;
    if(moving){const stance=f.metadata.feet[leg.name].stance,relative=((state.phaseNormalized-stance.start)%1+1)%1,edgeDistance=Math.min(relative,Math.abs(relative-stance.duration),1-relative);
     // Avoid claiming the source's120-sample phase classification is exact at
     // its quantized boundary. Physical contact checks still run every frame.
     if(edgeDistance>1/120)assert.equal(leg.planted,relative<stance.duration,leg.name+' documented stance window at '+frame);
    }
   }
   const vertices=frame%12===0?[]:null;
   for(const id of used){f.mesh.getVertexPosition(id,point).applyMatrix4(f.mesh.matrixWorld);const gap=point.y-nativeTestGround(point.x,point.z);gaps[id]=gap;if(gap<metrics.minimumVertex){metrics.minimumVertex=gap;metrics.minimum={frame,vertex:id,world:point.toArray()};}if(vertices)vertices[id]=point.clone();metrics.vertexTests++;}
   if(vertices){for(let i=0;i<index.length;i+=3){const ids=[index[i],index[i+1],index[i+2]];if(Math.min(...ids.map(id=>gaps[id]))>.300000001)continue;metrics.nearGroundFaces++;for(let edge=0;edge<3;edge++)metrics.minimumTriangle=Math.min(metrics.minimumTriangle,nativeGroundEdgeClearance(vertices[ids[edge]],vertices[ids[(edge+1)%3]]));}metrics.triangleFrames++;}
   metrics.frames++;
  }
  t.diagnostic(JSON.stringify({surface:metrics,plants:plants.metrics,rig:verifier.metrics}));
  assert.equal(metrics.frames,360);assert.equal(metrics.triangleFrames,30);assert.equal(metrics.vertexTests,used.length*360);assert.ok(metrics.nearGroundFaces>0);
  assert.ok(metrics.minimumVertex>=-.001,'Actual indexed native body penetrates terrain');assert.ok(metrics.minimumTriangle>=-.001,'Actual native triangle crosses the independent slope/wave');
  for(const key of NATIVE_KEYS){assert.ok(metrics.stanceSamples[key]>10,key+' has real planted coverage');assert.ok(metrics.swingSamples[key]>10,key+' has real swinging coverage');assert.ok(plants.metrics.stanceEntries[key]>=2,key+' completes multiple actual stance entries');}
  assert.ok(f.controller.status().legs.every(leg=>leg.planted),'Stopped native feet settle onto terrain');
  t.diagnostic(JSON.stringify({surfaceCorrection:surfaceContract.finish()}));
 }finally{f.controller.dispose();assets.disposeMeshyCarrier(f.instance);}
});
