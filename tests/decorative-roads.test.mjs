import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {createDecorativeRoadPlan,createDecorativeRoadRemnants,decorativeRoadLocationAllowed,DECORATIVE_ROAD_LIMITS} from '../src/decorative-roads.js';
import {renderedTerrainHeight} from '../src/terrain.js';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const records=Object.freeze([Object.freeze({id:'tree:fixture',kind:'tree',x:-62,z:48,size:3,parts:Object.freeze([])}),Object.freeze({id:'rock:fixture',kind:'rock',x:108,z:70,size:4,parts:Object.freeze([])})]);

test('broken road plan is deterministic, samples protected terrain and leaves existing scenery untouched',()=>{
  const before=digest(records),originalRandom=Math.random;let a;
  Math.random=()=>{throw new Error('Decoration must not consume shared randomness');};
  try{a=createDecorativeRoadPlan(records);}finally{Math.random=originalRandom;}
  assert.equal(digest(a),digest(createDecorativeRoadPlan([...records].reverse())));assert.equal(digest(records),before);
  assert.ok(a.length>=15&&a.length<=DECORATIVE_ROAD_LIMITS.maxFragments);
  assert.equal(new Set(a.map(f=>f.route)).size,3);
  for(const f of a){
    assert.ok(f.stations.length>=3);
    for(const s of f.stations){
      const r=Math.max(s.left,s.right)+.2;
      assert.ok(decorativeRoadLocationAllowed(s.x,s.z,r));
      for(const record of records){const rr=Math.min(8,Math.max(.8,record.size*(record.kind==='rock'?1.25:.75)));assert.ok(Math.hypot(s.x-record.x,s.z-record.z)>=r+rr);}
    }
    for(let i=1;i<f.stations.length;i++)assert.ok(Math.hypot(f.stations[i].x-f.stations[i-1].x,f.stations[i].z-f.stations[i-1].z)<1.5);
  }
  for(const p of[[-30,40],[105,8],[-92,-80],[75,-145],[-145,125],[135,125],[-65,-15],[40,-45],[55,65],[90,-105],[-110,90],[-115,-110],[NaN,0]])assert.equal(decorativeRoadLocationAllowed(...p),false);
});

test('two opaque merged road surfaces conform to terrain, face up, cannot pick or receive saved destruction ownership',()=>{
  const layer=createDecorativeRoadRemnants({existingRecords:records}),before=digest(records),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3(),centre=new T.Vector3();
  try{
    assert.equal(layer.stats.draws,2);assert.ok(layer.stats.triangles<DECORATIVE_ROAD_LIMITS.maxTriangles);assert.ok(layer.stats.geometryBytes<1200000);
    assert.equal(layer.group.raycast(),false);assert.equal(typeof layer.update,'undefined');assert.equal(digest(records),before);
    assert.equal(new Set(layer.group.children.map(m=>m.material)).size,1);
    for(const mesh of layer.group.children){
      assert.equal(mesh.raycast(),false);assert.equal(mesh.castShadow,false);assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.map,null);assert.equal(mesh.material.alphaTest,0);
      assert.deepEqual(Object.keys(mesh.userData).sort(),['decorativeRoad','noBatch']);
      const pos=mesh.geometry.attributes.position;
      for(const attr of Object.values(mesh.geometry.attributes))for(const value of attr.array)assert.ok(Number.isFinite(value));
      for(let i=0;i<pos.count;i++){
        a.fromBufferAttribute(pos,i);const lift=a.y-renderedTerrainHeight(a.x,a.z);
        assert.ok(lift>.030&&lift<.046);assert.ok(mesh.geometry.boundingBox.containsPoint(a));
      }
      for(let i=0;i<pos.count;i+=3){
        a.fromBufferAttribute(pos,i);b.fromBufferAttribute(pos,i+1);c.fromBufferAttribute(pos,i+2);
        centre.copy(a).add(b).add(c).multiplyScalar(1/3);
        normal.copy(b).sub(a).cross(c.clone().sub(a));assert.ok(normal.lengthSq()>1e-10);assert.ok(normal.y>0);
        assert.ok(centre.y-renderedTerrainHeight(centre.x,centre.z)>-.035,'Road triangle must not be buried through its middle');
      }
    }
    const ray=new T.Raycaster(new T.Vector3(-65,100,50),new T.Vector3(0,-1,0));assert.deepEqual(ray.intersectObject(layer.group,true),[]);
    const geometryBytes=layer.group.children.map(m=>digest(Array.from(m.geometry.attributes.position.array)));
    for(const q of['high','retro','low','balanced'])layer.setQuality(q);
    assert.deepEqual(layer.group.children.map(m=>digest(Array.from(m.geometry.attributes.position.array))),geometryBytes);
  }finally{layer.dispose();}
  assert.equal(layer.stats.disposed,true);assert.equal(layer.group.children.length,0);
});

test('road resource ownership is local and disposal is idempotent',()=>{
  const a=createDecorativeRoadRemnants(),b=createDecorativeRoadRemnants(),events=new Map();
  try{
    assert.notEqual(a.group.children[0].material,b.group.children[0].material);
    for(const r of new Set(a.group.children.flatMap(m=>[m.geometry,m.material]))){events.set(r,0);r.addEventListener('dispose',()=>events.set(r,events.get(r)+1));}
    a.dispose();a.dispose();a.setQuality('retro');for(const count of events.values())assert.equal(count,1);
    assert.ok(b.group.children.length);assert.equal(b.stats.disposed,false);
  }finally{a.dispose();b.dispose();}
});

// Golden plan from attempt 1: surface erosion may change, safe route footprints
// and scenery-clearance decisions must not move with the visual repair.
test('erosion stays inside unchanged safe road footprints and leaves sparse paint survivors',()=>{
  const plan=createDecorativeRoadPlan(records);
  assert.equal(digest(plan),'7a0066f820bf4e71ab2ed75efcab61515059599e9f7673f7cd84ed9dddd42941');
  const corner=(s,k)=>[s.x-s.tz*k,s.z+s.tx*k];
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const area=(a,b,c)=>Math.abs(cross(a,b,c))*.5;
  const cells=[];
  for(const fragment of plan)for(let i=0;i<fragment.stations.length-1;i++){
    const a=fragment.stations[i],b=fragment.stations[i+1],p=corner(a,-a.left),q=corner(a,a.right),r=corner(b,-b.left),s=corner(b,b.right);
    cells.push({triangles:[[p,q,r],[q,s,r]],minX:Math.min(p[0],q[0],r[0],s[0]),maxX:Math.max(p[0],q[0],r[0],s[0]),minZ:Math.min(p[1],q[1],r[1],s[1]),maxZ:Math.max(p[1],q[1],r[1],s[1])});
  }
  const inside=(p,tri)=>{const signs=[cross(tri[0],tri[1],p),cross(tri[1],tri[2],p),cross(tri[2],tri[0],p)];return signs.every(v=>v>=-.00008)||signs.every(v=>v<=.00008);};
  const footprint=cells.reduce((sum,cell)=>sum+cell.triangles.reduce((n,tri)=>n+area(...tri),0),0),areas={};
  const layer=createDecorativeRoadRemnants({existingRecords:records});
  try{
    for(const mesh of layer.group.children){
      const pos=mesh.geometry.attributes.position;let total=0;
      for(let i=0;i<pos.count;i+=3){
        const tri=[0,1,2].map(j=>[pos.getX(i+j),pos.getZ(i+j)]),centre=[tri.reduce((n,p)=>n+p[0],0)/3,tri.reduce((n,p)=>n+p[1],0)/3];
        total+=area(...tri);
        for(const p of [...tri,centre])assert.ok(cells.some(cell=>p[0]>=cell.minX-.00008&&p[0]<=cell.maxX+.00008&&p[1]>=cell.minZ-.00008&&p[1]<=cell.maxZ+.00008&&cell.triangles.some(t=>inside(p,t))),'Eroded surface escaped its original safe footprint');
      }
      areas[mesh.userData.decorativeRoad]=total;
    }
    assert.ok(areas.asphalt>footprint*.35&&areas.asphalt<footprint*.82,'Real missing ground must interrupt the original solid footprint');
    assert.ok(areas.markings>0&&areas.markings<areas.asphalt*.006,'Paint must survive as sparse fragments rather than intact repeated line pairs');
  }finally{layer.dispose();}
});
