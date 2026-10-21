import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';

export const DISPLAY_CHAIN_KEYS=['frontLeft','frontRight','rearLeft','rearRight'];
const sources={frontLeft:['Bone_035','Bone_033','Bone_007'],frontRight:['Bone_040','Bone_038','Bone_007'],rearLeft:['Bone_005','Bone_026','Bone_001'],rearRight:['Bone_003','Bone_020','Bone_001']};
const finite=(value,count)=>Array.isArray(value)&&value.length===count&&value.every(Number.isFinite);
export function assertDisplayBendHemisphere({key,direction,frameDelta,neutralPole,bend,strikeWeight=0,label=''}){
 assert.ok(Number.isFinite(strikeWeight)&&strikeWeight>=0&&strikeWeight<=1,'Valid observed strike weight');
 const project=value=>value.addScaledVector(direction,-value.dot(direction)),neutral=project(new T.Vector3(...neutralPole).applyQuaternion(frameDelta)),actual=project(bend.clone());
 if(neutral.length()<=1e-4||actual.length()<=1e-5)return null;
 neutral.normalize();actual.normalize();const hemisphere=neutral.clone();
 if(key==='frontRight'&&strikeWeight>0){
  // The metadata describes the neutral bend. During a strike the elbow may
  // open outward/downward; this anatomical hemisphere admits that change
  // without copying the runtime's blend pole or its transition schedule.
  // Actual loaded-deck triangle checks independently constrain its envelope.
  const outward=project(new T.Vector3(1,-1,0).applyQuaternion(frameDelta));
  if(outward.length()>1e-4){hemisphere.add(outward.normalize());assert.ok(hemisphere.length()>1e-6,'Strike bend hemisphere is defined: '+label);hemisphere.normalize();}
 }
 const dot=hemisphere.dot(actual);assert.ok(dot>0,key+' bends outside its '+(key==='frontRight'&&strikeWeight>0?'neutral-to-outward strike':'neutral anatomical')+' hemisphere at '+label);
 return dot;
}
export function assertDisplayRigDeclaration(mesh){
 const rig=mesh.userData.displayLimbRig;
 assert.equal(rig?.version,1);assert.equal(rig.space,'model');assert.equal(rig.originalJointCount,54);
 assert.deepEqual(rig.chains.map(c=>c.key).sort(),DISPLAY_CHAIN_KEYS.slice().sort());
 for(const chain of rig.chains){
  assert.deepEqual(chain.joints,['upper','hinge','end'].map(part=>'Titanhorn_'+chain.key+'_'+part));
  assert.deepEqual([chain.sourceRoot,chain.sourceEnd,chain.frameBone],sources[chain.key]);
  assert.ok(finite(chain.lengths,2)&&chain.lengths.every(length=>length>0));
  for(const name of ['rootOffset','endOffset','pole'])assert.ok(finite(chain[name],3),name);
  assert.ok(new T.Vector3(...chain.pole).length()>1e-6);
  for(const name of ['frameNeutralQuaternion','sourceEndNeutralQuaternion'])assert.ok(finite(chain[name],4)&&Math.abs(new T.Quaternion(...chain[name]).length()-1)<1e-5,name);
 }
 return rig;
}

// Independently measure the actual joint positions. Do not use displayStatus
// as evidence for its own solver's target reach, fixed lengths or bend side.
export function createDisplayGeometryVerifier(instance){
 const mesh=instance.body.getObjectByProperty('isSkinnedMesh',true),rig=assertDisplayRigDeclaration(mesh),bones=new Map(mesh.skeleton.bones.map(bone=>[bone.name,bone]));
 const scales=new Map(mesh.skeleton.bones.map(bone=>[bone.name,bone.scale.toArray()])),childPositions=new Map();
 for(const chain of rig.chains)for(let index=1;index<3;index++){const bone=bones.get(chain.joints[index]);assert.equal(bone.parent,bones.get(chain.joints[index-1]),'Declared display chain hierarchy');childPositions.set(bone.name,bone.position.toArray());}
 const metrics={poses:0,maxRootErrorMetres:0,maxEndpointErrorMetres:0,maxLengthErrorModel:0,minimumBendDot:Infinity};
 const inverse=new T.Matrix4(),matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3();
 function modelPoint(name){return bones.get(name).getWorldPosition(new T.Vector3()).applyMatrix4(inverse);}
 function modelQuaternion(name){const result=new T.Quaternion();matrix.multiplyMatrices(inverse,bones.get(name).matrixWorld).decompose(position,result,scale);return result;}
 function check(label,{strikeWeight=0}={}){
  instance.body.updateWorldMatrix(true,true);inverse.copy(instance.body.matrixWorld).invert();
  for(const bone of mesh.skeleton.bones)assert.deepEqual(bone.scale.toArray(),scales.get(bone.name),'No scale change: '+bone.name+' '+label);
  for(const [name,position]of childPositions)assert.deepEqual(bones.get(name).position.toArray(),position,'Display child offset remains fixed: '+name+' '+label);
  for(const chain of rig.chains){
   const frameDelta=modelQuaternion(chain.frameBone).multiply(new T.Quaternion(...chain.frameNeutralQuaternion).invert());
   const endDelta=modelQuaternion(chain.sourceEnd).multiply(new T.Quaternion(...chain.sourceEndNeutralQuaternion).invert());
   const targetRoot=modelPoint(chain.sourceRoot).add(new T.Vector3(...chain.rootOffset).applyQuaternion(frameDelta));
   const targetEnd=modelPoint(chain.sourceEnd).add(new T.Vector3(...chain.endOffset).applyQuaternion(endDelta));
   const points=chain.joints.map(modelPoint),world=p=>p.clone().applyMatrix4(instance.body.matrixWorld);
   const rootError=world(points[0]).distanceTo(world(targetRoot)),endError=world(points[2]).distanceTo(world(targetEnd));
   const lengthError=Math.max(...chain.lengths.map((length,index)=>Math.abs(points[index].distanceTo(points[index+1])-length)));
   metrics.maxRootErrorMetres=Math.max(metrics.maxRootErrorMetres,rootError);metrics.maxEndpointErrorMetres=Math.max(metrics.maxEndpointErrorMetres,endError);metrics.maxLengthErrorModel=Math.max(metrics.maxLengthErrorModel,lengthError);
   assert.ok(rootError<.001,chain.key+' display root misses declared source anchor at '+label+': '+rootError);
   assert.ok(endError<.001,chain.key+' display endpoint misses the original paw at '+label+': '+endError);
   assert.ok(lengthError<1e-5,chain.key+' stretches a fixed display segment at '+label+': '+lengthError);
   const direction=targetEnd.clone().sub(targetRoot).normalize(),actual=points[1].clone().sub(points[0]);
   const dot=assertDisplayBendHemisphere({key:chain.key,direction,frameDelta,neutralPole:chain.pole,bend:actual,strikeWeight,label});
   if(dot!==null)metrics.minimumBendDot=Math.min(metrics.minimumBendDot,dot);
  }
  metrics.poses++;return{...metrics};
 }
 return{check,metrics};
}
