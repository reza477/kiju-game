import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {authoredTreeGeometry,createAuthoredTreeDisplay} from '../src/authored-trees.js';
import {createLandscape} from '../src/landscape.js';
import {disposeGroup} from '../src/materials.js';
import {assertPlatformDigest} from './helpers/platform-digest.mjs';

async function envelope(kind){
  const bytes=await readFile(new URL(`../assets/scenery/meshy-pilot/${kind}-lods.glb`,import.meta.url));
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))),box=json.extras.bounds;
  return new T.Box3(new T.Vector3().fromArray(box.min),new T.Vector3().fromArray(box.max));
}
function audit(geometry){
  const p=geometry.attributes.position,n=geometry.attributes.normal,edges=new Map(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let volume=0;
  for(let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
    const face=b.clone().sub(a).cross(c.clone().sub(a));assert.ok(face.lengthSq()>1e-16,'Even the smallest twig cap has real area');
    volume+=a.dot(b.clone().cross(c))/6;
    const vertices=[a,b,c].map(v=>v.toArray().join(','));
    for(let j=0;j<3;j++){const from=vertices[j],to=vertices[(j+1)%3],key=[from,to].sort().join(':');const edge=edges.get(key)??{count:0,direction:0};edge.count++;edge.direction+=from<to?1:-1;edges.set(key,edge);}
  }
  // Overlapping buttress caps can share a diagonal inside the trunk. Their
  // incidence still balances; any missing face leaves an odd/open edge.
  assert.ok(volume>0);for(const edge of edges.values()){assert.equal(edge.count%2,0);assert.equal(edge.direction,0);}
  for(const attr of Object.values(geometry.attributes))for(const value of attr.array)assert.ok(Number.isFinite(value));
  for(let i=0;i<n.count;i++)assert.ok(Math.abs(a.fromBufferAttribute(n,i).length()-1)<1e-5);
}
function segmentDistance(point,a,b){const direction=b.clone().sub(a),t=Math.max(0,Math.min(1,point.clone().sub(a).dot(direction)/direction.lengthSq()));return point.distanceTo(a.clone().addScaledVector(direction,t));}

test('authored trees are opaque closed volumes within actual original rooted envelopes and fixed triangle budgets',async()=>{
  for(const kind of['pine','broadleaf']){
    const box=await envelope(kind),before=box.clone();
    for(const distant of[false,true]){
      const first=authoredTreeGeometry(kind,box,distant),second=authoredTreeGeometry(kind,box,distant);
      try{
        assert.deepEqual(box,before);assert.deepEqual(first.attributes.position.array,second.attributes.position.array);assert.deepEqual(first.attributes.color.array,second.attributes.color.array);
        assert.notEqual(first.attributes.position.array,second.attributes.position.array);audit(first);
        for(const axis of['x','y','z']){assert.ok(first.boundingBox.min[axis]>=box.min[axis]-1e-7);assert.ok(first.boundingBox.max[axis]<=box.max[axis]+1e-7);}
        assert.equal(first.boundingBox.min.y,0);assert.deepEqual(first.userData.root,[0,0,0]);
        assert.ok(first.index.count/3<=(distant?(kind==='pine'?3327:6552):7000));
        assert.ok(first.userData.leafCount>80);assert.ok(first.userData.limbCount>50);
      }finally{first.dispose();second.dispose();}
    }
  }
});

test('leaf fans attach to their supporting twigs and display material uses its own painted vertex colours',async()=>{
  for(const kind of['pine','broadleaf']){
    const display=createAuthoredTreeDisplay(kind,await envelope(kind));
    try{
      for(const geometry of Object.values(display.lods)){
        const segments=geometry.userData.branches.flatMap(points=>points.slice(1).map((b,i)=>[new T.Vector3().fromArray(points[i]),new T.Vector3().fromArray(b)]));
        for(const root of geometry.userData.leafRoots){const p=new T.Vector3().fromArray(root);assert.ok(Math.min(...segments.map(([a,b])=>segmentDistance(p,a,b)))<.0035,'Leaves must grow from the actual curved twig, not float around a crown centre');}
      }
      assert.equal(display.material.vertexColors,true);assert.equal(display.material.map,null);assert.equal(display.material.normalMap,null);
      assert.equal(display.material.transparent,false);assert.equal(display.material.side,T.FrontSide);assert.equal(display.material.metalness,0);
      assert.equal(display.material.userData.authoredTree,true);assert.equal(display.material.userData.shared,true);
    }finally{for(const geometry of Object.values(display.lods))geometry.dispose();display.material.dispose();}
  }
});

test('landform repaint preserves the exact pre-remake walking mesh, normals and all 1665 logical scenery records',()=>{
  const original=globalThis.document,gradient={addColorStop(){}},context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,k)=>t[k]??(()=>{})});
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};
  let world;
  const hash=value=>createHash('sha256').update(value).digest('hex'),bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
  try{
    world=createLandscape();const g=world.ground.geometry;
    // Independently captured before the round-three display rebuild. These
    // guard collision/placement identities, never colour or aesthetic scores.
    assert.equal(hash(bytes(g.attributes.position.array)),'02720570dc13eef2f9262c9beec6e40dae5d0a57c068869fd735bea13464e9dd');
    assert.equal(hash(bytes(g.index.array)),'ca9954a9e7c1565686f9c6720a8e3ca42a7d2f7166e17c20b092b0f6e1cccdd1');
    assert.equal(hash(bytes(g.attributes.normal.array)),'008d813666eb45f565f3380045a88f780c76dc44d839e81b244c6fed03b80aa8');
    assert.equal(world.crushables.length,1665);assertPlatformDigest({exact:hash(JSON.stringify(world.crushables)),expectedExact:'97987d016ae2e7c91ca3b139e09900687cbc37da7e8b103cd408b88ddbcb41d8',rounded:()=>world.crushables,expectedRounded:{arm64:'87b0f62f9921e6773f50c41ef4d1f948c9e95c659ad800102a52ec8e0c25c4ca'},message:'All 1665 logical scenery records'});
    const {data,width}=world.ground.material.map.image,greenPixels=[];
    for(let z=-130;z<=130;z+=13)for(let x=-150;x<=150;x+=15){const at=(Math.round((600-z)/1200*(width-1))*width+Math.round((x+600)/1200*(width-1)))*4;greenPixels.push(data[at+1]-data[at]);}
    assert.ok(greenPixels.filter(difference=>difference>9).length>100,'Turf and woodland must retain distinct green paint rather than averaging all exposed land to beige.');
  }finally{if(world)disposeGroup(world.group);if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
