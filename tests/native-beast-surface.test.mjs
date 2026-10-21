import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {nativeVisibleTopology,indexedSurfacePoint,assertConnectedPawRegion,createSurfacePlantVerifier,nativeGroundEdgeClearance} from './helpers/native-beast-surface.mjs';

function fixture(extra=[]){
  const positions=[-1,0,-1,1,0,-1,1,0,1,-1,0,1,...extra],geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex([0,2,1,0,3,2,...(extra.length?[4,5,6]:[])]);
  const count=positions.length/3,weights=new Float32Array(count*4);for(let i=0;i<count;i++)weights[i*4]=1;
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(new Uint16Array(count*4),4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const mesh=new T.SkinnedMesh(geometry,new T.MeshBasicMaterial()),bone=new T.Bone();mesh.add(bone);mesh.bind(new T.Skeleton([bone]));mesh.updateMatrixWorld(true);
  return mesh;
}
const witness={triangle:0,barycentric:[.25,.5,.25]};
const legs=()=>['frontLeft','frontRight','rearLeft','rearRight'].map(name=>({name,planted:true,contactSurface:witness}));

test('native contact comes from an indexed connected skin triangle, not an arbitrary point',()=>{
  const mesh=fixture(),topology=nativeVisibleTopology(mesh);
  assert.deepEqual(indexedSurfacePoint(mesh,witness,topology).toArray(),[.5,0,0]);
  assert.doesNotThrow(()=>assertConnectedPawRegion(topology,[0,1],[witness],'real sole'));
  assert.throws(()=>indexedSurfacePoint(mesh,{triangle:2,barycentric:[1,0,0]},topology),/existing indexed/);
  assert.throws(()=>indexedSurfacePoint(mesh,{triangle:0,barycentric:[2,-1,0]},topology),/barycentrics/);
  mesh.material.opacity=0;assert.throws(()=>indexedSurfacePoint(mesh,witness,topology),/visible material/);
});

test('isolated and point-connected witness triangles cannot prove native foot contact',()=>{
  for(const extra of [[3,0,0,3.1,0,0,3,0,.1],[-1,0,-1,-1.1,0,-1,-1,0,-1.1]]){
    const mesh=fixture(extra),topology=nativeVisibleTopology(mesh);assert.equal(topology.components,2);
    assert.throws(()=>indexedSurfacePoint(mesh,{triangle:2,barycentric:[1,0,0]},topology),/isolated witness/);
  }
});

test('plant latch measures actual world slip independently of an updated reported target',()=>{
  const mesh=fixture(),verifier=createSurfacePlantVerifier(mesh,()=>0);verifier.check(legs(),'plant entry');
  mesh.position.x=.002;mesh.updateMatrixWorld(true);const moved=legs();for(const leg of moved)leg.target=indexedSurfacePoint(mesh,witness).toArray();
  assert.throws(()=>verifier.check(moved,'sliding stance'),/visible stance witness slides/);
});

test('ground contact and documented swing transitions are measured separately',()=>{
  const mesh=fixture(),verifier=createSurfacePlantVerifier(mesh,()=>0);verifier.check(legs(),'first stance');
  mesh.position.y=.002;mesh.updateMatrixWorld(true);assert.throws(()=>createSurfacePlantVerifier(mesh,()=>0).check(legs(),'hovering entry'),/misses terrain/);
  const swing=legs().map(leg=>({...leg,planted:false}));assert.doesNotThrow(()=>verifier.check(swing,'swing'));
  mesh.position.set(.1,0,0);mesh.updateMatrixWorld(true);assert.doesNotThrow(()=>verifier.check(legs(),'new valid stance'));
  assert.equal(verifier.metrics.stanceEntries.frontLeft,2);
});

test('analytic terrain clearance catches a crest missed by endpoints and midpoint',()=>{
  const span=2*Math.PI/.15,a=new T.Vector3(0,.1,0),b=new T.Vector3(0,.1+.025*span,span);
  assert.ok(Math.abs(nativeGroundEdgeClearance(a,b)+.05)<1e-12);
});
