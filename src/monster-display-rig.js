import * as T from '../vendor/three.module.js';

// Presentation-only two-link limbs. Their targets come from the unchanged
// contact rig; a stable bend pole avoids that imported rig's elbow reversals.
export function createMonsterDisplayPose(instance,{allBones,mesh,displayRig}){
  if(!displayRig)return null;
  if(displayRig.version!==1||displayRig.space!=='model'||displayRig.originalJointCount!==54)throw new Error('Unsupported display limb space');
  const body=instance.body,inverse=new T.Matrix4(),matrix=new T.Matrix4();
  const position=new T.Vector3(),scale=new T.Vector3(),from=new T.Vector3(),direction=new T.Vector3(),world=new T.Vector3();
  const rootPoint=new T.Vector3(),goal=new T.Vector3(),knee=new T.Vector3(),pole=new T.Vector3(),offset=new T.Vector3();
  const frameQ=new T.Quaternion(),endQ=new T.Quaternion(),parentQ=new T.Quaternion(),oldQ=new T.Quaternion(),deltaQ=new T.Quaternion();
  const modelPosition=(bone,target)=>bone.getWorldPosition(target).applyMatrix4(inverse);
  const modelQuaternion=(bone,target)=>{matrix.multiplyMatrices(inverse,bone.matrixWorld);matrix.decompose(position,target,scale);return target;};
  const numbers=(value,count)=>Array.isArray(value)&&value.length===count&&value.every(Number.isFinite);
  const vector=value=>{if(!numbers(value,3))throw new Error('Invalid display limb vector');return new T.Vector3(...value);};
  const quaternion=value=>{if(!numbers(value,4))throw new Error('Invalid display limb orientation');return new T.Quaternion(...value).normalize();};
  body.updateWorldMatrix(true,true);inverse.copy(body.matrixWorld).invert();
  const chains=displayRig.chains.map(spec=>{
    if(spec.joints.length!==3||!numbers(spec.lengths,2)||spec.lengths.some(value=>value<=0))throw new Error('Display limb requires two positive fixed lengths');
    const bones=spec.joints.map(name=>allBones.get(name));
    if(bones.some(bone=>!bone)||bones[1].parent!==bones[0]||bones[2].parent!==bones[1])throw new Error('Display limb hierarchy mismatch');
    const sourceRoot=allBones.get(spec.sourceRoot),sourceEnd=allBones.get(spec.sourceEnd),frame=allBones.get(spec.frameBone);
    if(!sourceRoot||!sourceEnd||!frame)throw new Error('Display limb source bone absent');
    const rest=bones.map(bone=>({position:bone.position.clone(),quaternion:bone.quaternion.clone(),scale:bone.scale.clone()}));
    const points=bones.map(bone=>modelPosition(bone,new T.Vector3()));
    for(let i=0;i<2;i++)if(Math.abs(points[i].distanceTo(points[i+1])-spec.lengths[i])>1e-5)throw new Error('Display limb rest length differs from metadata');
    const bend=vector(spec.pole);if(bend.lengthSq()<1e-8)throw new Error('Display limb pole is zero');
    return{key:spec.key,bones,sourceRoot,sourceEnd,frame,rest,lengths:[...spec.lengths],rootOffset:vector(spec.rootOffset),endOffset:vector(spec.endOffset),
      frameNeutralInverse:quaternion(spec.frameNeutralQuaternion).invert(),endNeutralInverse:quaternion(spec.sourceEndNeutralQuaternion).invert(),
      endRest:modelQuaternion(bones[2],new T.Quaternion()),pole:bend.normalize(),previousPole:new T.Vector3(),error:null,lengthError:null,unreachable:false};
  });
  function align(bone,child,desired){
    modelPosition(child,from);modelPosition(bone,position);from.sub(position).normalize();
    deltaQ.setFromUnitVectors(from,desired);modelQuaternion(bone,oldQ);modelQuaternion(bone.parent,parentQ).invert();
    bone.quaternion.copy(parentQ).multiply(deltaQ).multiply(oldQ).normalize();bone.updateWorldMatrix(false,true);
  }
  const strikePole=new T.Vector3(1,-1.2,.25).normalize();
  const supportPole=new T.Vector3(0,-.65,-.8).normalize();
  const loadedSupportPole=new T.Vector3(-.39,-.65,-.8).normalize();
  function update({strikeWeight=0}={}){
    body.updateWorldMatrix(true,true);inverse.copy(body.matrixWorld).invert();
    for(const chain of chains){
      const [upper,hinge,end]=chain.bones,[a,b]=chain.lengths;
      for(let i=0;i<3;i++){const bone=chain.bones[i],rest=chain.rest[i];bone.position.copy(rest.position);bone.quaternion.copy(rest.quaternion);bone.scale.copy(rest.scale);}
      modelQuaternion(chain.frame,frameQ).multiply(chain.frameNeutralInverse).normalize();
      modelQuaternion(chain.sourceEnd,endQ).multiply(chain.endNeutralInverse).normalize();
      modelPosition(chain.sourceRoot,rootPoint).add(offset.copy(chain.rootOffset).applyQuaternion(frameQ));
      modelPosition(chain.sourceEnd,goal).add(offset.copy(chain.endOffset).applyQuaternion(endQ));
      world.copy(rootPoint).applyMatrix4(body.matrixWorld);upper.position.copy(upper.parent.worldToLocal(world));upper.updateWorldMatrix(false,true);
      direction.subVectors(goal,rootPoint);const requested=direction.length();
      if(requested<1e-9)direction.set(0,-1,0);else direction.divideScalar(requested);
      const distance=T.MathUtils.clamp(requested,Math.abs(a-b)+1e-7,a+b-1e-7),along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
      // The striking forearm opens to the outside and below the saddle. Its
      // neutral rearward bend would otherwise fold through loaded decks.
      // Only this presentation elbow changes; the contact rig, shoulder and
      // paw targets, fixed lengths and attack timing remain the authority.
      pole.copy(chain.pole);
      if(chain.key==='frontRight')pole.lerp(strikePole,T.MathUtils.smoothstep(strikeWeight,0,.65)).normalize();
      // Lower the support elbow during load transfer, then open it outward
      // near full extension. Opening early or holding it through recovery
      // would sweep the shoulder through the breast harness; peak extension
      // needs this modest outward bend to clear the loaded rear pannier.
      if(chain.key==='frontLeft'){
        pole.lerp(supportPole,T.MathUtils.smoothstep(strikeWeight,0,.65)).normalize();
        pole.lerp(loadedSupportPole,T.MathUtils.smoothstep(strikeWeight,.9,1)).normalize();
      }
      pole.applyQuaternion(frameQ).addScaledVector(direction,-pole.dot(direction));
      if(pole.lengthSq()<1e-8){pole.copy(chain.previousPole).addScaledVector(direction,-chain.previousPole.dot(direction));}
      if(pole.lengthSq()<1e-8){pole.set(Math.abs(direction.y)<.9?0:1,Math.abs(direction.y)<.9?1:0,0).addScaledVector(direction,-pole.dot(direction));}
      pole.normalize();chain.previousPole.copy(pole);
      knee.copy(rootPoint).addScaledVector(direction,along).addScaledVector(pole,height);
      align(upper,hinge,offset.subVectors(knee,rootPoint).normalize());
      modelPosition(hinge,position);align(hinge,end,offset.copy(direction).multiplyScalar(distance).add(rootPoint).sub(position).normalize());
      modelQuaternion(end.parent,parentQ).invert();end.quaternion.copy(parentQ).multiply(endQ).multiply(chain.endRest).normalize();end.updateWorldMatrix(false,true);
      modelPosition(end,position);chain.error=position.distanceTo(goal);chain.unreachable=requested>a+b+1e-6||requested<Math.abs(a-b)-1e-6;
      const actual=chain.bones.map(bone=>modelPosition(bone,new T.Vector3()));chain.lengthError=Math.max(...chain.lengths.map((length,i)=>Math.abs(actual[i].distanceTo(actual[i+1])-length)));
    }
    mesh.updateMatrixWorld(true);
  }
  const status=()=>chains.map(chain=>({key:chain.key,error:chain.error,lengthError:chain.lengthError,unreachable:chain.unreachable,lengths:[...chain.lengths]}));
  return{update,status};
}
