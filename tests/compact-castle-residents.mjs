import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/compact-castle-builder/residents');await fs.mkdir(out,{recursive:true});
const report={errors:[],remote:[],checks:[]},browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1300,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/compact-resident-fixture')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#293940"></body></html>'});if(u.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
 await page.goto('http://127.0.0.1:4178/compact-resident-fixture');
 Object.assign(report,await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{createVerticalDistrict}=await import('/src/architecture.js'),{createVerticalLayout}=await import('/src/vertical-city.js'),{createCitizens,animateCitizens}=await import('/src/citizens.js'),{CityLighting}=await import('/src/city-lighting.js'),{disposeGroup}=await import('/src/materials.js');
  const checks=[],measurements=[],expect=(test,message)=>{if(!test)throw Error(message);checks.push(message);},matrix=new T.Matrix4(),v=new T.Vector3(),inverse=new T.Matrix4(),ray=new T.Raycaster(),renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1300,1000);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color(0x293940);scene.add(new T.HemisphereLight(0xd0e5ff,0x65734e,2));const sun=new T.DirectionalLight(0xffe0b5,2.6);sun.position.set(-12,60,-25);scene.add(sun);const camera=new T.PerspectiveCamera(40,1.3,.1,250),lightPool=new CityLighting(scene);
  let active,smallestCeilingGap=Infinity,maxHand=0,maxSoleGap=0,maxNaturalScaleDifference=0;
  const dimensionalReference=new Map();
  function fixture(variant,type,level){
   if(active){active.root.removeFromParent();disposeGroup(active.root);}
   const buildings=Array(20).fill(null);for(const id of[7,11,13])buildings[id]={type,level,remaining:0};const layout=createVerticalLayout(buildings,[],variant),root=new T.Group();root.scale.setScalar(.55);scene.add(root);const stations=[],districts=[];
   for(const f of layout.floors){
    const district=createVerticalDistrict(type,level,f.height,layout.heightScale);district.position.set(0,34+f.y+.18*layout.heightScale,-12);district.rotation.y=Math.PI;root.add(district);districts.push(district);
    if(district.userData.activityStation)stations.push({...district.userData.activityStation,tier:f.tier,slot:f.slot});
    const slab=new T.Mesh(new T.BoxGeometry(8.8,.32*layout.heightScale,10.4),new T.MeshStandardMaterial({color:0x85877d,roughness:.9}));slab.position.set(0,34+f.y-.16*layout.heightScale,-12);root.add(slab);
   }
   const people=createCitizens(root,34,'kaiju',{scale:.55,layout:'tower',rings:2,slotPositions:layout.positions});const city={rig:root,deckY:34,scale:.55,faction:'kaiju',layout:'tower',rings:2,slotPositions:layout.positions,verticalLayout:layout};
   const animate=(time,extra={})=>animateCitizens(people,time,false,48,{layout:'tower',rings:2,slotPositions:layout.positions,verticalLayout:layout,activityStations:stations,...extra});
   active={root,layout,people,stations,districts,city,animate};return active;
  }
  for(const variant of['flesh','cyborg'])for(const type of['housing','farm','sawmill','foundry'])for(const level of[1,3]){
   const f=fixture(variant,type,level),scale=f.layout.heightScale;f.animate(0);f.root.updateWorldMatrix(true,true);let localMaxHead=0,minGap=Infinity,handError=0,soleGap=0;
   expect(Math.abs(f.people.group.position.y-(34+.109*scale))<1e-9,`${variant}/${type}/${level}: promenade baseline matches physical surface`);
   for(const d of f.districts){
    expect(d.scale.equals(new T.Vector3(1,1,1)),`${variant}/${type}/${level}: district root stays unscaled`);
    const station=d.userData.activityStation,relative=station.contact.position.clone().sub(station.foot.position),key=`${type}:${level}`;
    if(variant==='flesh')dimensionalReference.set(key,relative.toArray());else maxNaturalScaleDifference=Math.max(maxNaturalScaleDifference,relative.distanceTo(new T.Vector3(...dimensionalReference.get(key))));
    expect(station.foot.parent.scale.equals(new T.Vector3(1,1,1)),`${variant}/${type}/${level}: table has natural dimensions`);
    if(variant==='cyborg'){const local=station.foot.getWorldPosition(new T.Vector3());f.root.worldToLocal(local);const floor=f.layout.floors.find(x=>x.slot===f.stations.find(s=>s.foot===station.foot).slot);expect(Math.abs(local.y-(34+floor.y+floor.surfaceOffset))<1e-7,`${variant}/${type}/${level}: worker pad meets cloister surface`);}
    if(variant==='cyborg'&&type==='sawmill'){
     const blade=d.getObjectByName('Circular saw blade'),bounds=new T.Box3().setFromObject(blade),size=bounds.getSize(new T.Vector3());expect(Math.abs(size.x-size.y)<1e-6,`${variant}/${type}/${level}: real saw blade remains circular after all parent transforms`);
     expect(Math.abs(size.x-.9*.55)<1e-6,`${variant}/${type}/${level}: saw retains natural diameter`);
    }
    if(variant==='cyborg'&&type==='housing')d.traverse(part=>{if(part.name==='Compact doorway opening'){const size=new T.Box3().setFromObject(part).getSize(new T.Vector3());expect(Math.abs(size.y-1.40*.55)<1e-6,`${variant}/${type}/${level}: compact doorway has intentionally authored height`);}});
   }
   // Scan real head/hood geometry and every resident part against the next
   // slab, at several walk/work phases. No synthetic humanoid bounds.
   for(let tick=0;tick<18;tick++){
    f.animate(tick/12);f.root.updateWorldMatrix(true,true);const baseline=f.people.group.position.y;
    for(const [name,bucket]of Object.entries(f.people.buckets)){
     const p=bucket.mesh.geometry.attributes.position;
     for(let i=0;i<bucket.count;i++){
      bucket.mesh.getMatrixAt(i,matrix);const centreY=matrix.elements[13],floor=[...f.layout.floors].reverse().find(x=>x.y<=centreY+.01)??f.layout.floors[0],ceiling=34+floor.y+floor.height-.32*scale;
      for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(matrix);const top=v.y+baseline,gap=ceiling-top;minGap=Math.min(minGap,gap);if(['heads','headwear','hair','brim'].includes(name))localMaxHead=Math.max(localMaxHead,v.y-floor.y);}
     }
    }
    for(const contact of f.people.stationContacts.filter(c=>c.side===-1)){const station=f.stations.find(s=>s.slot===contact.slot);handError=Math.max(handError,new T.Vector3(...contact.hand).distanceTo(station.left.getWorldPosition(new T.Vector3())));}
    const shoeBucket=f.people.buckets.shoes;
    for(let worker=0;worker<Math.min(3,f.stations.length);worker++){
     const station=f.stations[worker],point=station.foot.getWorldPosition(new T.Vector3()),normal=new T.Vector3(0,1,0).transformDirection(station.foot.matrixWorld),plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,point);
     for(const side of[0,1]){shoeBucket.mesh.getMatrixAt(worker*2+side,matrix);matrix.premultiply(shoeBucket.mesh.matrixWorld);let closest=Infinity;const p=shoeBucket.mesh.geometry.attributes.position;for(let j=0;j<p.count;j++)closest=Math.min(closest,plane.distanceToPoint(v.fromBufferAttribute(p,j).applyMatrix4(matrix)));soleGap=Math.max(soleGap,Math.abs(closest));}
     ray.set(point.clone().addScaledVector(normal,.04),normal.clone().negate());ray.far=.09;expect(ray.intersectObject(station.foot.parent,true).length>0,`${variant}/${type}/${level}: worker has real pad support at phase${tick}`);
    }
   }
   expect(minGap>0,`${variant}/${type}/${level}: heads, hats, limbs and tools stay under next slab`);expect(handError<1e-6,`${variant}/${type}/${level}: hands meet the natural work surface`);expect(soleGap<1e-5,`${variant}/${type}/${level}: natural shoes meet their pad plane`);
   const snapshot=JSON.stringify(Object.values(f.people.buckets).map(b=>Array.from(b.mesh.instanceMatrix.array.slice(0,b.count*16))));f.animate(17/12);expect(snapshot===JSON.stringify(Object.values(f.people.buckets).map(b=>Array.from(b.mesh.instanceMatrix.array.slice(0,b.count*16)))),`${variant}/${type}/${level}: paused work and walking poses are exact`);
   f.animate(2,{visibleFloor:1});expect(f.people.buckets.heads.count===f.people.routes.filter(r=>r.tier<=1).length,`${variant}/${type}/${level}: cutaway keeps natural residents only on visible floors`);
   lightPool.assign(lightPool.slots[0],f.city);const slot=lightPool.slots[0];for(const lamp of slot.lamps){const floor=f.layout.floors[lamp.group.userData.towerTier];lamp.group.updateWorldMatrix(true,true);let top=-Infinity;lamp.group.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld);f.root.worldToLocal(v);top=Math.max(top,v.y);}});expect(top<34+floor.y+floor.height-.32*scale,`${variant}/${type}/${level}: actual lantern clears ceiling`);}
   expect(slot.targetMarker.position.y===42.5-f.city.deckY,`${variant}/${type}/${level}: light target stays on unchanged robot`);
   if(variant==='cyborg'){const housingBounds=new T.Box3().setFromObject(slot.search);f.root.worldToLocal(housingBounds.max);expect(housingBounds.max.y<34+f.layout.floors[0].height-.32*scale,`${variant}/${type}/${level}: shoulder light housing clears the compact slab`);}
   measurements.push({variant,type,level,height:f.layout.floors[0].height,minGap,localMaxHead,handError,soleGap});smallestCeilingGap=Math.min(smallestCeilingGap,minGap);maxHand=Math.max(maxHand,handError);maxSoleGap=Math.max(maxSoleGap,soleGap);
  }
  for(const type of['keep','housing','armor'])for(const level of[1,3]){
   const height=(3.8+.8*(level-1))*.5,district=createVerticalDistrict(type,level,height,.5);district.updateWorldMatrix(true,true);let doors=0,maxDoorTop=0;
   district.traverse(part=>{if(part.name==='Compact doorway opening'||part.name==='Compact doorway surround'){const bounds=new T.Box3().setFromObject(part);maxDoorTop=Math.max(maxDoorTop,bounds.max.y);if(part.name==='Compact doorway opening')doors++;}});
   expect(doors===(type==='housing'?2:1),`${type}/${level}: compact room retains its intended entrances`);
   expect(maxDoorTop+.09<height-.16,`${type}/${level}: complete compact doorway surround clears the next slab`);
   expect(new T.Box3().setFromObject(district).max.y+.09<height-.16,`${type}/${level}: adapted room and windows remain inside physical ceiling`);
   disposeGroup(district);
  }
  expect(maxNaturalScaleDifference<1e-12,'Cyborg and flesh work surfaces have identical natural dimensions');
  window.compactResidentFixture={scene,renderer,camera,fixture,lightPool};
  return {checks,measurements,smallestCeilingGap,maxHand,maxSoleGap,maxNaturalScaleDifference};
 }));
 for(const[type,name]of[['housing','ledger'],['farm','garden'],['sawmill','workshop']]){
  await page.evaluate(type=>{const v=window.compactResidentFixture,f=v.fixture('cyborg',type,1);f.animate(5,{visibleFloor:1});v.lightPool.update(f.city,null,'day');v.camera.position.set(8,25,-16.5);v.camera.lookAt(0,20.2,-6.6);v.renderer.render(v.scene,v.camera);},type);
  await page.waitForFunction(async()=>{const {surfaceDiagnostics}=await import('/src/surface-library.js');return surfaceDiagnostics().pending===0;});await page.evaluate(()=>{const v=window.compactResidentFixture;v.renderer.render(v.scene,v.camera);});await page.screenshot({path:path.join(out,`compact-${name}.png`)});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);console.log(JSON.stringify({checks:report.checks.length,smallestCeilingGap:report.smallestCeilingGap,maxHand:report.maxHand,maxSoleGap:report.maxSoleGap,maxNaturalScaleDifference:report.maxNaturalScaleDifference,errors:report.errors,output:out}));
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.stack);}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
