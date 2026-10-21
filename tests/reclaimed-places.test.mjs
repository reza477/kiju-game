import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {createLandscape} from '../src/landscape.js';
import {disposeGroup} from '../src/materials.js';
import {renderedTerrainHeight} from '../src/terrain.js';
import {createReclaimedMasters,planReclaimedPlaces,reclaimedLocationAllowed,RECLAIMED_LIMITS} from '../src/reclaimed-places.js';
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
let world,prior,masters,plan;
before(()=>{
  prior=globalThis.document;const gradient={addColorStop(){}},context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})});
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};
  world=createLandscape();masters=createReclaimedMasters();plan=planReclaimedPlaces(world.crushables,masters);
});
after(()=>{disposeGroup(world.group);for(const g of Object.values(masters))g.dispose();if(prior===undefined)delete globalThis.document;else globalThis.document=prior;});

test('composed places are deterministic, bounded and own no new simulation records',()=>{
  const before=digest(world.crushables),original=Math.random;let repeated;
  Math.random=()=>{throw Error('The scenery planner must not consume global randomness');};
  try{repeated=planReclaimedPlaces([...world.crushables].reverse(),masters);}finally{Math.random=original;}
  assert.equal(digest(plan),digest(repeated));assert.equal(digest(world.crushables),before);
  assert.ok(plan.places.length>=10&&plan.places.length<=20,'Recognizable places must reach the open valley, not only one corner');
  assert.equal(new Set(plan.places.map(p=>p.ownerId)).size,plan.places.length);
  assert.deepEqual([...new Set(plan.places.map(p=>p.kind))].sort(),['field','waymark','workyard']);
  assert.ok(plan.items.length>200&&plan.items.length<=RECLAIMED_LIMITS.maxInstances);
  assert.ok(plan.places.some(p=>p.x<0&&p.z>0)&&plan.places.some(p=>p.x>0&&p.z<0));
  for(const item of plan.items){assert.ok(reclaimedLocationAllowed(item.x,item.z,item.radius));assert.ok(world.crushables.some(r=>r.id===item.ownerId));}
});

test('every actual authored base stays grounded without hiding the entire piece',()=>{
  const matrix=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),root=new T.Vector3(),scale=new T.Vector3();
  for(const item of plan.items){
    const g=masters[item.kind],a=g.attributes.position,b=g.boundingBox,ceiling=b.min.y+(b.max.y-b.min.y)*.035;
    matrix.compose(root.set(item.x,item.y,item.z),q.setFromAxisAngle(new T.Vector3(0,1,0),item.yaw),scale.set(item.sx,item.sy,item.sz));
    let maxGap=-Infinity,minGap=Infinity,maxVisible=-Infinity;
    for(let i=0;i<a.count;i++){
      p.fromBufferAttribute(a,i).applyMatrix4(matrix);const gap=p.y-renderedTerrainHeight(p.x,p.z);maxVisible=Math.max(maxVisible,gap);
      if(a.getY(i)<=ceiling){maxGap=Math.max(maxGap,gap);minGap=Math.min(minGap,gap);}
    }
    assert.ok(maxGap<=-.0249&&maxGap>=-.0251,item.kind+' actual root collar must contact the rendered surface');
    assert.ok(minGap>=-Math.max(.20,(b.max.y-b.min.y)*item.sy*.42)-.026,item.kind+' excessive burial');
    assert.ok(maxVisible>.05,item.kind+' should remain visibly above soil');
  }
});

test('saved destruction hides and restores every new part using its original owner ID',()=>{
  const meshes=[];world.group.traverse(m=>{if(m.isInstancedMesh&&m.userData.reclaimedPlaces)meshes.push(m);});
  const snapshots=meshes.map(m=>m.instanceMatrix.array.slice()),damage=world.stats.reclaimedPlaces.places.map(p=>p.ownerId);
  assert.equal(plan.items.length,meshes.reduce((n,m)=>n+m.count,0));
  world.resetInteractions({mode:'expedition',damage});
  assert.equal(world.stats.destroyedCount,damage.length);
  for(const m of meshes)for(let i=0;i<m.count;i++)assert.equal(m.instanceMatrix.array[i*16+13],-5000,'No unowned immortal marker or plant may remain');
  world.resetInteractions({mode:'expedition',damage:[]});
  meshes.forEach((m,i)=>assert.deepEqual(m.instanceMatrix.array,snapshots[i]));
  assert.equal(world.stats.destroyedCount,0);
});

test('new geometry, shadow policy and instance storage have a finite measured budget',()=>{
  const stats=world.stats.reclaimedPlaces;
  assert.ok(stats.triangles<=RECLAIMED_LIMITS.maxTriangles);assert.ok(stats.draws<=RECLAIMED_LIMITS.maxDraws);
  assert.ok(stats.geometryBytes<150000&&stats.instanceBytes<120000);
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(const g of Object.values(masters)){
    for(const attr of Object.values(g.attributes))for(const n of attr.array)assert.ok(Number.isFinite(n));
    const index=g.index?.array??Array.from({length:g.attributes.position.count},(_,i)=>i);
    for(let i=0;i<index.length;i+=3){a.fromBufferAttribute(g.attributes.position,index[i]);b.fromBufferAttribute(g.attributes.position,index[i+1]);c.fromBufferAttribute(g.attributes.position,index[i+2]);assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>1e-11,g.name+' zero-area face');}
  }
  world.setQuality('low');world.group.traverse(m=>{if(m.userData.reclaimedPlaces){assert.equal(m.castShadow,false);assert.equal(m.visible,m.userData.reclaimedPlaces!=='leaves');}});
  assert.ok(stats.activeTriangles<18000);assert.ok(stats.activeDraws<=4);
  world.setQuality('high');world.group.traverse(m=>{if(m.userData.reclaimedPlaces)assert.equal(m.castShadow,m.userData.reclaimedPlaces!=='leaves');});
});

function structuralEntries(){
  const indices={},entries=[];for(const item of plan.items){const index=indices[item.kind]??0;indices[item.kind]=index+1;if(item.kind!=='leaves')entries.push({item,index,mesh:world.group.getObjectByName('Reclaimed places '+item.kind)});}return entries;
}
function cross(entry,{distance=4,faction='kaiju',moving=true,mode='expedition',damage=[]}={}){
  const item=entry.item,owner=world.crushables.find(r=>r.id===item.ownerId),ox=item.x-owner.x,oz=item.z-owner.z,r=Math.hypot(ox,oz),dx=-oz/r,dz=ox/r,angle=Math.atan2(dx,dz),scale=faction==='kaiju'?.55:1;
  const actor={id:'reclaimed-regression',faction,scale,angle,x:item.x-dx*distance/2,z:item.z-dz*distance/2,moving:false};
  world.interact([actor],1/60,{mode,damage});actor.x=item.x+dx*distance/2;actor.z=item.z+dz*distance/2;actor.moving=moving;world.interact([actor],1/60,{mode,damage});return{actor,damage};
}

test('all142 actual structures break away on swept passage, including the former missed-owner piers',()=>{
  const entries=structuralEntries(),m=new T.Matrix4(),v=new T.Vector3();let cosmeticOnly=0;
  assert.equal(entries.length,142);assert.ok(entries.some(e=>e.item.kind==='marker'&&e.item.ownerId==='valley-forest:206'&&Math.abs(e.item.x+70.5681462963)<1e-6));
  for(const [i,entry]of entries.entries()){
    const damage=[];world.resetInteractions({mode:'expedition',damage});const {damage:result}=cross(entry,{distance:i%2?40:4,damage});entry.mesh.getMatrixAt(entry.index,m);
    if(result.includes(entry.item.ownerId)){assert.equal(m.elements[13],-5000);continue;}
    cosmeticOnly++;assert.ok(m.elements[5]<entry.item.sy*.31,'A directly crossed structure cannot remain upright merely because its old owner was missed');
    const g=masters[entry.item.kind],a=g.attributes.position,b=g.boundingBox,base=b.min.y+(b.max.y-b.min.y)*.035;let maxRoot=-Infinity,visible=-Infinity;
    for(let j=0;j<a.count;j++){v.fromBufferAttribute(a,j).applyMatrix4(m);const gap=v.y-renderedTerrainHeight(v.x,v.z);visible=Math.max(visible,gap);if(a.getY(j)<=base)maxRoot=Math.max(maxRoot,gap);}
    assert.ok(Math.abs(maxRoot+.025)<.00003,'Flattened rubble must rest on its own rendered terrain');
    assert.ok(visible>.015,'Breakaway must leave visible low rubble or wood, rather than hiding the geometry');
  }
  assert.ok(cosmeticOnly>=100,'The regression must actually cover the former102 missed-owner cases');
  world.resetInteractions();
});

test('standing, airships and teleport discontinuities do not crush; repeated contact does not upload',()=>{
  const entry=structuralEntries().find(e=>e.item.kind==='marker'),snapshot=()=>Array.from(entry.mesh.instanceMatrix.array.slice(entry.index*16,entry.index*16+16));
  for(const options of[{moving:false},{faction:'airship'},{distance:80}]){
    world.resetInteractions({mode:'expedition',damage:[]});const before=snapshot();cross(entry,options);assert.deepEqual(snapshot(),before);assert.equal(world.stats.reclaimedPlaces.breakaway.active,0);
  }
  const damage=[];world.resetInteractions({mode:'expedition',damage});const {actor}=cross(entry,{damage}),stats=world.stats.reclaimedPlaces.breakaway;
  assert.ok(stats.active>0);const uploads=stats.matrixUploads,version=entry.mesh.instanceMatrix.version,flat=snapshot();
  for(let i=0;i<12;i++)world.interact([{...actor,moving:i%2===0}],1/60,{mode:'expedition',damage});
  cross(entry,{damage}); // Repeat the moving sweep itself, not only idle frames.
  assert.equal(stats.matrixUploads,uploads);assert.equal(entry.mesh.instanceMatrix.version,version);assert.deepEqual(snapshot(),flat);
  world.resetInteractions();
});

test('cosmetic state resets across modes/reload without reviving saved owner destruction',()=>{
  const entry=structuralEntries().find(e=>e.item.kind==='marker'),snapshot=()=>Array.from(entry.mesh.instanceMatrix.array.slice(entry.index*16,entry.index*16+16)),damage=[];
  world.resetInteractions({mode:'expedition',damage});const upright=snapshot();cross(entry,{damage});assert.notDeepEqual(snapshot(),upright);
  world.interact([],1/60,{mode:'battle',damage:[]});assert.deepEqual(snapshot(),upright);assert.equal(world.stats.reclaimedPlaces.breakaway.active,0);
  world.resetInteractions({mode:'expedition',damage:[]});cross(entry);
  const saved=[entry.item.ownerId],copy=JSON.stringify(saved);world.resetInteractions({mode:'expedition',damage:saved});assert.equal(snapshot()[13],-5000);
  cross(entry,{damage:saved});assert.equal(snapshot()[13],-5000);assert.equal(JSON.stringify(saved),copy,'Cosmetic contact must not append a save ID');
  world.resetInteractions({mode:'expedition',damage:[]});assert.deepEqual(snapshot(),upright);assert.equal(world.stats.reclaimedPlaces.breakaway.active,0);
});
