// CPU authoring bake from the real preserved controller; no game or art score.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from '../../vendor/three.module.js';
import {installCPUCarrierEnvironment} from '../../tests/beast-integration-cpu.mjs';
import {createMeshyMonsterPose} from '../../src/meshy-monster.js';
const args=Object.fromEntries(process.argv.slice(2).reduce((a,x,i,list)=>{if(x.startsWith('--'))a.push([x.slice(2),list[i+1]]);return a;},[]));
for(const key of ['input','output','report'])if(!args[key])throw Error('--'+key+' required');
for(const key of ['output','report']){if(fs.existsSync(args[key]))throw Error('Preserve existing output: '+args[key]);fs.mkdirSync(path.dirname(args[key]),{recursive:true});}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),input=fs.readFileSync(args.input),startedAt=new Date().toISOString();
const restore=installCPUCarrierEnvironment(),baseFetch=globalThis.fetch;
globalThis.fetch=(value,options)=>String(value).endsWith('/assets/beast-integration/titanhorn-rigged.glb')?Promise.resolve(new Response(input,{headers:{'content-type':'model/gltf-binary'}})):baseFetch(value,options);
let assets,instance,controller,city,enemy;
try{
 assets=await import('../../src/meshy-carriers.js');await assets.loadMeshyCarriers(['flesh']);
 const moving=args.moving==='true',frames=Number(args.frames??0),strike=args.strike==='true';let state,actor,poseDescription;
 if(strike){
  const {makeCity,animateCity}=await import('../../src/carriers.js'),{placeCity,GameScene}=await import('../../src/scene.js'),sim=await import('../../src/simulation.js');
  city=makeCity('kaiju',false,2,'flesh');enemy=makeCity('crawler',true,1,'standard');enemy.id='authoring-strike-target';
  const game=sim.createGame('kaiju','flesh'),distance=sim.meleeReach('kaiju','crawler','flesh','standard')-.5;
  placeCity(city,0,0,0);placeCity(enemy,0,distance,Math.PI);animateCity(city,7,false,0);animateCity(enemy,7,false,0);
  game.time=7;game.battle={time:0,enemyId:enemy.id,player:{x:0,z:0},enemy:{x:0,z:distance}};
  const scene={city,enemyCities:[enemy],state:game,scene:new T.Scene(),fx:[],cinematic:{mode:'steady',impulse(){}}};
  GameScene.prototype.createEffect.call(scene,{kind:'impact',source:'player',time:0,from:game.battle.player,to:game.battle.enemy,mounts:[]});
  for(let frame=0;frame<=frames;frame++)animateCity(city,7+frame/60,false,0);
  instance=city.meshyCarrier.instance;controller=city.meshyCarrier.controller;actor=city.root;state=controller.status();
  poseDescription={mode:'actual GameScene melee target/marker',target:'crawler standard',ground:'actual renderedTerrainHeight',frames,time:7+frames/60,impactTime:.7,visibleStrikeError:city.meshyCarrier.metrics.visibleStrikeError};
 }else{
  instance=assets.instantiateMeshyCarrier('flesh');actor=new T.Group();actor.scale.setScalar(.55);instance.root.position.set(-.325,-1.8,-12);instance.root.scale.set(16,21,16);actor.add(instance.root);actor.updateMatrixWorld(true);
  controller=createMeshyMonsterPose(instance,{groundHeight:()=>0,strideDistance:8.8,supportCrouch:.12});
  for(let frame=0;frame<=frames;frame++){
   const distanceDelta=moving&&frame?1.92/60:0;actor.position.z+=distanceDelta;actor.updateMatrixWorld(true);
   state=controller.update({time:frame/60,moving,distanceDelta,heading:0});
  }
  poseDescription={ground:'flat zero',supportCrouch:.12,strideDistance:8.8,actorScale:.55,moving,frames,time:frames/60};
 }
 actor.updateMatrixWorld(true);let mesh;instance.body.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});mesh.skeleton.update();
 const inverseWorld=mesh.matrixWorld.clone().invert(),jointMatrices=mesh.skeleton.bones.map((bone,i)=>new T.Matrix4().multiplyMatrices(mesh.bindMatrixInverse,bone.matrixWorld).multiply(mesh.skeleton.boneInverses[i]).multiply(mesh.bindMatrix).toArray());
 const joints=mesh.skeleton.bones.map((bone,i)=>({index:i,name:bone.name,position:bone.getWorldPosition(new T.Vector3()).applyMatrix4(inverseWorld).toArray(),boneMatrix:new T.Matrix4().multiplyMatrices(inverseWorld,bone.matrixWorld).toArray(),skinMatrix:jointMatrices[i]}));
 const jsonLength=input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,20+jsonLength)),bin=Buffer.from(input.subarray(28+jsonLength)),primitive=doc.meshes[0].primitives[0];
 function writeAttribute(name,values){const a=doc.accessors[primitive.attributes[name]],v=doc.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??12;for(let i=0;i<a.count;i++)for(let k=0;k<3;k++)bin.writeFloatLE(values[i*3+k],start+i*stride+k*4);a.min=[0,1,2].map(k=>{let n=Infinity;for(let i=k;i<values.length;i+=3)n=Math.min(n,values[i]);return n;});a.max=[0,1,2].map(k=>{let n=-Infinity;for(let i=k;i<values.length;i+=3)n=Math.max(n,values[i]);return n;});}
 const count=mesh.geometry.attributes.position.count,positions=new Float32Array(count*3),normals=new Float32Array(count*3),point=new T.Vector3(),normal=new T.Vector3(),mixed=new T.Matrix4();
 const sk=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight,sourceNormal=mesh.geometry.attributes.normal;
 for(let i=0;i<count;i++){
  mesh.getVertexPosition(i,point).toArray(positions,i*3);mixed.elements.fill(0);
  for(let k=0;k<4;k++){const matrix=jointMatrices[sk.getComponent(i,k)],w=sw.getComponent(i,k);for(let e=0;e<16;e++)mixed.elements[e]+=matrix[e]*w;}
  normal.fromBufferAttribute(sourceNormal,i).transformDirection(mixed).toArray(normals,i*3);
 }
 writeAttribute('POSITION',positions);writeAttribute('NORMAL',normals);delete primitive.attributes.JOINTS_0;delete primitive.attributes.WEIGHTS_0;for(const node of doc.nodes)delete node.skin;delete doc.skins;doc.meshes[0].extras={staticAuthoringPose:true};
 const encoded=Buffer.from(JSON.stringify(doc)),padding=Buffer.alloc((4-encoded.length%4)%4,32),j=Buffer.concat([encoded,padding]),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+bin.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4);const out=Buffer.concat([header,j,binHeader,bin]);fs.writeFileSync(args.output,out);
 const provenance=Object.fromEntries(['src/meshy-monster.js','src/monster-display-rig.js','src/meshy-carriers.js','src/meshy-monster-city.js','src/saddle-harness.js','tests/beast-integration-cpu.mjs','scripts/beast-integration/export-authoring-pose.mjs'].map(p=>[p,sha(fs.readFileSync(p))]));
 const report={startedAt,finishedAt:new Date().toISOString(),command:process.argv,input:args.input,inputSha256:sha(input),output:args.output,outputSha256:sha(out),provenance,pose:poseDescription,joints,status:state,displayStatus:controller.displayStatus?.()??null,limitations:['CPU authoring bake using real procedural controller; not native render, all terrain or art acceptance.']};fs.writeFileSync(args.report,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({input:args.input,output:args.output,outputSha256:sha(out),report:args.report,pose:report.pose,displayStatus:report.displayStatus}));
}finally{controller?.dispose();if(instance)assets?.disposeMeshyCarrier(instance);restore();}
