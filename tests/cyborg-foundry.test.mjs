import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {carrierSculptFixture} from './helpers/carrier-sculpt-fixture.mjs';
import {buildFoundryCyborg} from '../src/cyborg-foundry.js';
import {createMeshyCarrierCache} from '../src/meshy-carriers.js';
import {createMeshyCyborg,animateMeshyCyborg,disposeMeshyCyborg} from '../src/meshy-cyborg.js';
const hash=a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const identity=(g,i)=>['position','skinIndex','skinWeight'].flatMap(name=>Array.from({length:g.attributes[name].itemSize},(_,k)=>g.attributes[name].getComponent(i,k))).join(',');

test('foundry shell replaces broad body geometry while keeping the inspected rig and sole/hand contact vertices',async()=>{
 const {mesh,gltf}=await carrierSculptFixture('cyborg');gltf.scene.updateMatrixWorld(true);
 const source=mesh.geometry,original=hash(source.attributes.position.array),rig=JSON.stringify(mesh.skeleton.bones.map(b=>b.matrixWorld.toArray()));
 const g=buildFoundryCyborg(mesh),again=buildFoundryCyborg(mesh);
 assert.equal(hash(source.attributes.position.array),original);assert.equal(JSON.stringify(mesh.skeleton.bones.map(b=>b.matrixWorld.toArray())),rig);
 assert.equal(hash(g.attributes.position.array),hash(again.attributes.position.array));
 assert.ok(g.userData.foundryCyborg.authoredVertices>10000);assert.equal(g.userData.foundryCyborg.retainedTriangles,608);
 assert.ok(g.index.count/3<57620,'authored body stays below original triangle count');
 for(const part of g.userData.foundryCyborg.parts)assert.ok(part.volume>0,'authored closed casting must face outward: '+part.bone);
 for(const attribute of Object.values(g.attributes))for(const v of attribute.array)assert.ok(Number.isFinite(v));
 for(let i=0;i<g.attributes.position.count;i++){
  let total=0;for(let k=0;k<4;k++){const index=g.attributes.skinIndex.getComponent(i,k);assert.ok(index>=0&&index<mesh.skeleton.bones.length);total+=g.attributes.skinWeight.getComponent(i,k);}
  assert.ok(Math.abs(total-1)<2e-5);
 }
 assert.equal(g.userData.sourceContactVertices,source.attributes.position.count);
 const retained=new Set();for(let i=0;i<g.userData.sourceContactVertices;i++){retained.add(identity(g,i));assert.equal(identity(g,i),identity(source,i));}
 const sourceIndices=new Set(source.index.array),p=source.attributes.position;
 let checked=0;for(const i of sourceIndices)if(p.getY(i)<.22){assert.ok(retained.has(identity(source,i)),'weight-bearing source boot vertex missing');checked++;}
 assert.ok(checked>1000);
 for(const side of['Left','Right']){
  const hand=mesh.skeleton.bones.find(b=>b.name==='mixamorig'+side+'Hand'),joints=new Set();hand.traverse(b=>{if(b.isBone)joints.add(mesh.skeleton.bones.indexOf(b));});
  const direction=hand.getWorldPosition(new T.Vector3()).sub(hand.parent.getWorldPosition(new T.Vector3())).normalize().transformDirection(mesh.matrixWorld.clone().invert());
  let best=-1,score=-Infinity;for(const i of sourceIndices){let influence=0;for(let k=0;k<4;k++)if(joints.has(source.attributes.skinIndex.getComponent(i,k)))influence+=source.attributes.skinWeight.getComponent(i,k);if(influence<.99999)continue;const d=p.getX(i)*direction.x+p.getY(i)*direction.y+p.getZ(i)*direction.z;if(d>score){score=d;best=i;}}
  assert.ok(best>=0&&retained.has(identity(source,best)),'exact terminal hand contact missing');
 }
 const visibleBounds=new T.Box3(),vertex=new T.Vector3();for(const i of g.index.array)visibleBounds.expandByPoint(vertex.fromBufferAttribute(g.attributes.position,i));
 assert.ok(visibleBounds.min.y>=source.boundingBox.min.y-1e-6);assert.ok(visibleBounds.max.y<1.7);
});

test('authored cyborg loads through the real cache and supports the unchanged native walking adapter',async()=>{
 const fixture=await carrierSculptFixture('cyborg');
 const cache=createMeshyCarrierCache({fetchAsset:async()=>new Response(fixture.input),parse:async()=>fixture.gltf});
 await cache.load('cyborg');
 const root=new T.Group();root.scale.setScalar(.55);
 const adapter=createMeshyCyborg(root,{instantiate:cache.instantiate,cityScale:.55});
 const city={root,meshyCarrier:adapter,heading:0,strikeTime:-Infinity};
 try{
  assert.ok(adapter.renderMeshes[0].geometry.userData.foundryCyborg);
  assert.ok(adapter.profile.stanceSamples>=8);assert.ok(adapter.strideDistance>0);
  for(let i=0;i<14;i++){
   root.position.z=i*.35;root.updateMatrixWorld(true);
   animateMeshyCyborg(city,i*.05,i>0,{height:()=>0,normal:()=>new T.Vector3(0,1,0)});
   assert.ok(Number.isFinite(adapter.metrics.minimumFootGap));
   assert.ok(Math.abs(adapter.metrics.minimumFootGap)<.025,'foot support stays on the flat test ground');
   for(const bone of adapter.renderMeshes[0].skeleton.bones)assert.ok(bone.matrixWorld.elements.every(Number.isFinite));
  }
 }finally{disposeMeshyCyborg(adapter);cache.dispose();}
});
