// Actual current citizen/tool/cloth vertices against the current room meshes
// and shared exterior solids. Uses the real derived routes, including corners.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/tapered-castle-residents');await fs.mkdir(out,{recursive:true});
const report={errors:[],remote:[]},browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(300000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/tapered-resident-fixture')return r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'});if(u.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
 await page.goto('http://127.0.0.1:4178/tapered-resident-fixture');
 Object.assign(report,await page.evaluate(async gunYaw=>{
  const T=await import('/vendor/three.module.js'),{createVerticalLayout,VERTICAL_SLOT_ORDER}=await import('/src/vertical-city.js'),{verticalCastleSolids}=await import('/src/vertical-castle.js'),{createVerticalDistrict}=await import('/src/architecture.js'),{createBattery}=await import('/src/armaments.js'),{createCitizens,animateCitizens}=await import('/src/citizens.js'),{disposeGroup}=await import('/src/materials.js');
  const types=['keep','housing','farm','sawmill','foundry','armor','cannon'],v=new T.Vector3(),delta=new T.Vector3(),matrix=new T.Matrix4(),localMatrix=new T.Matrix4(),rootInverse=new T.Matrix4(),ray=new T.Ray(),direction=new T.Vector3(.173,.271,.946).normalize(),hit=new T.Vector3(),morph={morphTargetInfluences:[0,0]};
  const cases=[];let vertices=0,minCeilingGap=Infinity,maxHandError=0,maxSoleGap=0,solidCandidates=0;
  function inside(point,solid){
   const {min,max,triangles}=solid,e=1e-5;
   if(point.x<=min[0]+e||point.x>=max[0]-e||point.y<=min[1]+e||point.y>=max[1]-e||point.z<=min[2]+e||point.z>=max[2]-e)return false;
   ray.set(point,direction);const distances=[];
   for(const tri of triangles){if(ray.intersectTriangle(tri[0],tri[1],tri[2],false,hit)){const distance=point.distanceTo(hit);if(distance>e&&!distances.some(d=>Math.abs(d-distance)<e))distances.push(distance);}}
   return distances.length%2===1;
  }
  for(const variant of['flesh','cyborg'])for(const level of[1,3]){
   const buildings=Array(20).fill(null);for(const [i,id]of VERTICAL_SLOT_ORDER.entries())buildings[id]={type:types[i%types.length],level,remaining:0};
   const layout=createVerticalLayout(buildings,[],variant),root=new T.Group();root.scale.setScalar(.55);const stations=[],districts=[];
   for(const f of layout.floors){const room=f.type==='cannon'?createBattery('kaiju',level,gunYaw,f.slot):createVerticalDistrict(f.type,level,f.height,layout.heightScale);room.position.set(0,34+f.y+layout.districtOffset,-12);if(f.type==='cannon')room.scale.setScalar(layout.weaponScale);else room.rotation.y=Math.PI;root.add(room);districts.push(room);if(room.userData.activityStation)stations.push({...room.userData.activityStation,tier:f.tier,slot:f.slot});}
   const people=createCitizens(root,34,'kaiju',{scale:.55,layout:'tower',rings:2,slotPositions:layout.positions});root.updateWorldMatrix(true,true);rootInverse.copy(root.matrixWorld).invert();
   const solids=verticalCastleSolids(layout).map(s=>({...s,triangles:s.triangles.map(t=>t.map(p=>new T.Vector3(...p)))}));
   for(const [tier,room]of districts.entries())room.traverse(o=>{
    if(!o.isMesh)return;let p=o;while(p&&p!==room){if(p===room.userData.activityStation?.foot.parent)return;p=p.parent;}
    const geometry=o.geometry,pos=geometry.attributes.position,indices=geometry.index,triangles=[];localMatrix.multiplyMatrices(rootInverse,o.matrixWorld);
    for(let i=0;i<(indices?.count??pos.count);i+=3){const triangle=[];for(let j=0;j<3;j++)triangle.push(new T.Vector3().fromBufferAttribute(pos,indices?indices.getX(i+j):i+j).applyMatrix4(localMatrix));triangles.push(triangle);}
    const box=new T.Box3();for(const t of triangles)for(const p of t)box.expandByPoint(p);solids.push({id:`room:${tier}:${o.name||geometry.type}`,min:box.min.toArray(),max:box.max.toArray(),triangles});
   });
   const cells=new Map();for(const solid of solids)for(const f of layout.floors){if(solid.max[1]<34+f.y||solid.min[1]>34+f.y+f.height)continue;for(let x=Math.floor(solid.min[0]);x<=Math.floor(solid.max[0]);x++)for(let z=Math.floor(solid.min[2]);z<=Math.floor(solid.max[2]);z++){const key=`${f.tier}:${x}:${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(solid);}}
   let caseVertices=0,caseGap=Infinity;
   const animate=(time,activityStations=[])=>animateCitizens(people,time,false,48,{layout:'tower',rings:2,slotPositions:layout.positions,verticalLayout:layout,activityStations});
   animate(0);
   for(let phase=0;phase<16;phase++){
    // Full-loop phases cover every side and corner, while native walking,
    // carrying, conversation and work gestures use their ordinary animation.
    const time=phase<12?phase*.17:25+(phase-12)*.45,traffic=people.towerCirculation;traffic.time=time-.10;
    for(const lane of traffic.lanes)lane.positions=lane.ids.map((id,i)=>phase/16*lane.length+i*lane.length/lane.ids.length);
    const chosen=phase%4===0?stations.filter(s=>s.tier>=13).slice((phase/4)%3,3+(phase/4)%3):[];animate(time,chosen);root.updateWorldMatrix(true,true);
    for(const [name,bucket]of Object.entries(people.buckets)){
     const geometry=bucket.mesh.geometry,pos=geometry.attributes.position,targets=geometry.morphAttributes.position;
     for(let i=0;i<bucket.count;i++){
      bucket.mesh.getMatrixAt(i,matrix);localMatrix.multiplyMatrices(rootInverse,bucket.mesh.matrixWorld).multiply(matrix);
      const f=[...layout.floors].reverse().find(f=>34+f.y<=localMatrix.elements[13]+.01)??layout.floors[0],ceiling=34+f.y+f.height-.32*layout.heightScale;
      if(targets?.length)bucket.mesh.getMorphAt(i,morph);
      for(let j=0;j<pos.count;j++){
       v.fromBufferAttribute(pos,j);if(targets?.length)for(let t=0;t<targets.length;t++){delta.fromBufferAttribute(targets[t],j);if(!geometry.morphTargetsRelative)delta.sub(new T.Vector3().fromBufferAttribute(pos,j));v.addScaledVector(delta,morph.morphTargetInfluences[t]??0);}
       v.applyMatrix4(localMatrix);caseVertices++;const gap=ceiling-v.y;caseGap=Math.min(caseGap,gap);if(gap<=0)throw Error(`${variant}/${level}/${phase}: ${name} crosses tier ${f.tier} ceiling by ${-gap}`);
       const candidates=cells.get(`${f.tier}:${Math.floor(v.x)}:${Math.floor(v.z)}`)??[];solidCandidates+=candidates.length;
       for(const solid of candidates)if(inside(v,solid))throw Error(`${variant}/${level}/${phase}: ${name} vertex ${j} instance ${i} inside ${solid.id} at ${v.toArray()}`);
      }
     }
    }
    for(const c of people.stationContacts.filter(c=>c.side===-1)){const station=chosen.find(s=>s.slot===c.slot);if(station)maxHandError=Math.max(maxHandError,new T.Vector3(...c.hand).distanceTo(station.left.getWorldPosition(new T.Vector3())));}
    const shoes=people.buckets.shoes;for(let i=0;i<shoes.count;i+=2){let low=Infinity,point=new T.Vector3();for(const index of[i,i+1]){shoes.mesh.getMatrixAt(index,matrix);localMatrix.multiplyMatrices(rootInverse,shoes.mesh.matrixWorld).multiply(matrix);for(let j=0;j<shoes.mesh.geometry.attributes.position.count;j++){v.fromBufferAttribute(shoes.mesh.geometry.attributes.position,j).applyMatrix4(localMatrix);if(v.y<low){low=v.y;point.copy(v);}}}const f=[...layout.floors].reverse().find(f=>34+f.y<=low+.01)??layout.floors[0],surface=chosen.find(s=>s.slot===people.routes[i/2]?.stationSlot)?.foot.getWorldPosition(new T.Vector3()).applyMatrix4(rootInverse).y??(34+f.y+f.surfaceOffset);maxSoleGap=Math.max(maxSoleGap,Math.abs(low-surface));if(Math.abs(low-surface)>1e-5)throw Error(`${variant}/${level}/${phase}: planted sole differs from floor ${f.tier} by ${low-surface}`);}
   }
   cases.push({variant,level,caseVertices,caseGap});vertices+=caseVertices;minCeilingGap=Math.min(minCeilingGap,caseGap);disposeGroup(root);
  }
  if(maxHandError>1e-6)throw Error(`Workstation hand contact drift ${maxHandError}`);
  return {cases,vertices,minCeilingGap,maxHandError,maxSoleGap,solidCandidates,gunYaw};
 },Number(process.env.CANNON_YAW??Math.PI)));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
