import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createVerticalLayout,VERTICAL_SLOT_ORDER} from '../src/vertical-city.js';
import {verticalCastleDescriptors,verticalCastleSolids} from '../src/vertical-castle.js';

function layout(count,level=1){const b=Array(20).fill(null);for(const[index,id]of VERTICAL_SLOT_ORDER.slice(0,count).entries())b[id]={type:['keep','housing','farm','sawmill','foundry','cannon'][index%6],level,remaining:0};return createVerticalLayout(b);}
function rayHits(solids,from,to){
 const a=new T.Vector3(...from),b=new T.Vector3(...to),length=a.distanceTo(b),ray=new T.Ray(a,b.sub(a).normalize()),point=new T.Vector3(),hits=[];
 for(const s of solids)for(const triangle of s.triangles){const hit=ray.intersectTriangle(...triangle.map(v=>new T.Vector3(...v)),false,point);if(hit&&hit.distanceTo(a)<=length+1e-8)hits.push({id:s.id,distance:hit.distanceTo(a),point:hit.toArray()});}
 return hits.sort((a,b)=>a.distance-b.distance);
}

test('every new Gothic storey raises the supported roof without expanding the plan',()=>{
 for(const count of[1,3,4,12,20]){
  const l=layout(count),solids=verticalCastleSolids(l),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const s of solids)for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],s.min[axis]);max[axis]=Math.max(max[axis],s.max[axis]);}
  assert.ok(max[0]-min[0]<=8.800001);assert.ok(max[2]-min[2]<=10.400001);
  assert.ok(Math.abs(max[1]-(34+l.height+8.97))<1e-8);
  for(const f of l.floors){
   // Samples follow the real human route, including all four supported corners.
   for(const[x,z]of[[-3,-15.7],[0,-15.7],[3,-15.7],[3,-12],[3,-8.3],[0,-8.3],[-3,-8.3],[-3,-12]]){
    const y=34+f.y+.109,hits=rayHits(solids,[x,y+.03,z],[x,y-.08,z]);assert.ok(hits.length,`Missing floor support on storey ${f.tier} at ${x},${z}`);
    assert.ok(Math.abs(hits[0].point[1]-y)<1e-8,`Citizen sole and top of promenade differ on storey ${f.tier}`);
   }
  }
 }
});

test('all storeys retain a real central cannon portal and obstruct their solid flank walls',()=>{
 for(const level of[1,3])for(const count of[3,20]){
  const l=layout(count,level),solids=verticalCastleSolids(l);
  for(const f of l.floors){
   const y=34+f.y+1.5;
   assert.deepEqual(rayHits(solids,[0,y,-14.45],[0,y,-24]),[],`Forward battery blocked on storey ${f.tier}`);
   assert.ok(rayHits(solids,[0,y,-12],[8,y,-12]).length,`Opaque side glazing is absent from collision on storey ${f.tier}`);
  }
 }
});

test('render descriptors and tight collision triangles agree and contain finite nondegenerate geometry',()=>{
 for(const count of[1,3,20]){
  const l=layout(count,3),descriptors=verticalCastleDescriptors(l),solids=verticalCastleSolids(l);assert.equal(descriptors.length,solids.length);
  const ids=new Set();for(let i=0;i<descriptors.length;i++){
   const d=descriptors[i],s=solids[i];assert.ok(!ids.has(d.id),`Duplicate structural ID ${d.id}`);ids.add(d.id);
   assert.deepEqual(s.triangles,d.faces.map(f=>f.map(i=>d.vertices[i])));assert.ok(d.tier>=0&&d.tier<count);
   for(const triangle of s.triangles){const[a,b,c]=triangle.map(v=>new T.Vector3(...v));assert.ok(triangle.flat().every(Number.isFinite));assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>1e-17,`Degenerate triangle ${d.id}`);}
  }
  assert.strictEqual(verticalCastleSolids(l),solids,'Stable layouts should reuse the bounded collision cache');
 }
});

test('new-storey construction has open masonry and a visible full-height lifting frame',()=>{
 const buildings=Array(20).fill(null);for(const id of VERTICAL_SLOT_ORDER.slice(0,4))buildings[id]={type:'housing',level:1,remaining:0};
 const slot=VERTICAL_SLOT_ORDER[3];buildings[slot].remaining=15;
 const l=createVerticalLayout(buildings),tier=l.floors.length-1,d=verticalCastleDescriptors(l),construction=d.filter(s=>s.tier===tier);
 assert.ok(construction.some(s=>s.id.includes('unfinished-side')));assert.ok(construction.some(s=>s.id.includes('scaffold-post')));assert.ok(construction.some(s=>s.id.includes('unfinished-hoist-mast')));
 assert.ok(!construction.some(s=>s.id.includes('cathedral-crown')));assert.ok(!construction.some(s=>['glass','light'].includes(s.material)),'New walls must not arrive already glazed');
 const solids=verticalCastleSolids(l);assert.ok(Math.abs(Math.max(...solids.map(s=>s.max[1]))-(34+l.height+8.97))<1e-8,'The lifting frame makes the new height visible');
 const newY=34+l.floors.at(-1).y;
 assert.deepEqual(rayHits(solids,[0,newY+1.5,-14.45],[0,newY+1.5,-24]),[],'The new exterior does not close the central gun lane');
 for(const[x,z]of[[-3,-15.7],[3,-15.7],[3,-8.3],[-3,-8.3]])assert.ok(rayHits(solids,[x,newY+.15,z],[x,newY+.03,z]).length,'The incomplete storey is still a supported storey');
 for(const s of construction)for(const f of s.faces){const[a,b,c]=f.map(i=>new T.Vector3(...s.vertices[i]));assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>1e-17,`Degenerate construction geometry ${s.id}`);}
 buildings[slot].remaining=0;const finished=verticalCastleDescriptors(createVerticalLayout(buildings));assert.ok(finished.some(s=>s.tier===tier&&s.material==='glass'));assert.ok(!finished.some(s=>s.id.includes('unfinished-hoist')));assert.ok(finished.some(s=>s.id==='vertical:cathedral-crown'));
});

test('lower-storey upgrade preserves old wall heights and exposes only the added band',()=>{
 const buildings=Array(20).fill(null);for(const id of VERTICAL_SLOT_ORDER.slice(0,4))buildings[id]={type:'housing',level:1,remaining:0};
 const old=createVerticalLayout(buildings),oldWalls=verticalCastleDescriptors(old).filter(d=>d.tier===0&&/side-light|front-cheek/.test(d.id));
 buildings[7]={type:'housing',level:1,remaining:20,upgrading:true};const l=createVerticalLayout(buildings),d=verticalCastleDescriptors(l),tier=d.filter(s=>s.tier===0);
 assert.equal(l.floors[0].height,4.6);assert.ok(Math.abs(l.floors[1].y-old.floors[1].y-.8)<1e-8);
 for(const before of oldWalls){const after=d.find(s=>s.id===before.id);assert.deepEqual(after.vertices,before.vertices,'Existing glazing and walls stay intact below the construction band');}
 const staging=tier.filter(s=>s.id.includes('scaffold-staging'));assert.equal(staging.length,2);
 assert.ok(staging.every(s=>Math.min(...s.vertices.map(v=>v[1]))>=34+3.6));
 assert.ok(!tier.some(s=>s.id.includes('unfinished-side')));assert.ok(d.some(s=>s.id==='vertical:cathedral-crown'),'A lower upgrade keeps the upper crown intact');
});
