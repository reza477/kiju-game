// Validate actual posed and cloth-morphed vertices against native batch bounds.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/graphics-09-builder-02/culling');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),report={errors:[],remote:[]};
try{
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/citizen-bounds-fixture')return r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'});if(u.origin==='http://127.0.0.1:4178')return r.continue();report.remote.push(u.href);return r.abort();});
 await page.goto('http://127.0.0.1:4178/citizen-bounds-fixture');
 Object.assign(report,await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{createCitizens,animateCitizens}=await import('/src/citizens.js'),{createVerticalLayout}=await import('/src/vertical-city.js'),{createVerticalDistrict}=await import('/src/architecture.js'),{slotPosition}=await import('/src/carriers.js'),{disposeGroup}=await import('/src/materials.js');
  const matrix=new T.Matrix4(),v=new T.Vector3(),base=new T.Vector3(),target=new T.Vector3(),pose={morphTargetInfluences:[0,0]},fixtures=[];let samples=0,minMargin=Infinity;
  for(const variant of ['flesh','cyborg','standard','drill','horizontal','vertical'])for(const floors of (['flesh','cyborg'].includes(variant)?[3,20]:[0])){
   const faction=['flesh','cyborg'].includes(variant)?'kaiju':['standard','drill'].includes(variant)?'crawler':'airship',scale=faction==='kaiju'?.55:1,deckY=faction==='kaiju'?34:faction==='crawler'?10:18,layout=floors?'tower':'deck';
   const root=new T.Group();root.scale.set(scale,scale,scale*(variant==='drill'?1.55:1));root.position.set(121,17,-87);root.rotation.set(.06,1.13,-.04);
   const buildings=Array(20).fill(null);for(let i=0;i<floors;i++)buildings[i]={type:['keep','sawmill','housing','farm'][i%4],level:i%3===1?3:1,remaining:0};
   const verticalLayout=floors?createVerticalLayout(buildings,[],variant):undefined,slots=verticalLayout?.positions??Array.from({length:20},(_,i)=>slotPosition(i,faction)),stations=[];
   if(verticalLayout)for(const f of verticalLayout.floors.slice(0,3)){
    const d=createVerticalDistrict(f.type,f.level,f.height,verticalLayout.heightScale);d.position.set(0,deckY+f.y+.18*verticalLayout.heightScale,-12);d.rotation.y=Math.PI;root.add(d);
    if(d.userData.activityStation)stations.push({...d.userData.activityStation,tier:f.tier,slot:f.slot});
   }
   const people=createCitizens(root,deckY,faction,{scale,layout,rings:2,slotPositions:slots});
   for(const [time,visibleFloor]of [[0,undefined],[1.75,undefined],[17,undefined],[26,undefined],...(floors?[[27,0],[28,floors-1]]:[])]){
    animateCitizens(people,time,true,48,{layout,rings:2,slotPositions:slots,verticalLayout,visibleFloor,activityStations:stations});root.updateWorldMatrix(true,true);
    for(const mesh of Object.values(people.instances)){
     if(!mesh.frustumCulled||!mesh.boundingSphere)throw Error('Missing native citizen bounds');
     const p=mesh.geometry.attributes.position,morph=mesh.geometry.morphAttributes.position??[];
     for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);if(mesh.morphTexture)mesh.getMorphAt(i,pose);
      for(let j=0;j<p.count;j++){
       v.fromBufferAttribute(p,j);base.copy(v);
       for(let k=0;k<morph.length;k++){target.fromBufferAttribute(morph[k],j);if(!mesh.geometry.morphTargetsRelative)target.sub(base);v.addScaledVector(target,pose.morphTargetInfluences[k]??0);}
       v.applyMatrix4(matrix);const margin=mesh.boundingSphere.radius-v.distanceTo(mesh.boundingSphere.center);samples++;minMargin=Math.min(minMargin,margin);
       if(!Number.isFinite(margin)||margin<-.00001)throw Error(`${variant}/${floors}/${time}/${mesh.name}: vertex outside visibility envelope`);
      }
     }
    }
   }
   animateCitizens(people,30,false,0,{layout,rings:2,slotPositions:slots,verticalLayout});
   if(Object.values(people.instances).some(m=>m.count!==0||m.visible||m.boundingSphere.radius!==0))throw Error('Empty citizens still have rendered instances');
   fixtures.push({variant,floors});disposeGroup(root);
  }
  return {fixtures,samples,minMargin};
 }));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.ok(report.samples>1000000);
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await fs.writeFile(path.join(out,'bounds-report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
