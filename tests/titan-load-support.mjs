// Measure the real planted soles while carrying small, growing and full castles.
// This fixture has no WebGLRenderer and does not substitute terrain or animation.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/graphics-09-builder-03/load');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),report={errors:[],remote:[],fixture:'Actual carrier, castle, terrain and distance-driven animation. No renderer. Supported sole vertices are measured over multiple complete strides on level and sloping ground.'};
try{
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/titan-load-fixture')return r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'});if(u.origin==='http://127.0.0.1:4178')return r.continue();report.remote.push(u.href);return r.abort();});
 await page.goto('http://127.0.0.1:4178/titan-load-fixture');
 Object.assign(report,await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{makeCity,setCityRings,animateCity}=await import('/src/carriers.js'),{terrainHeight,renderedTerrainHeight}=await import('/src/terrain.js'),{VERTICAL_SLOT_ORDER}=await import('/src/vertical-city.js'),{disposeGroup}=await import('/src/materials.js');
  const fixtures=[],loadInvariants=[];let samples=0,minClearance=Infinity,maxContactGap=0,maxSlip=0,maxTargetError=0;
  for(const variant of ['flesh','cyborg']){
   const city=makeCity('kaiju',false,2,variant);
   for(const count of [3,10,20]){
    const buildings=Array(20).fill(null);for(const id of VERTICAL_SLOT_ORDER.slice(0,count))buildings[id]={type:'housing',level:count===10?3:1,remaining:0};setCityRings(city,2,buildings);
    for(const [site,x,z] of [['level',-82,-15],['slope',-53,11]]){
     city.gaitPrevious=null;city.gaitDistance=0;city.heading=Math.PI/2;city.root.rotation.set(0,city.heading,0);for(const limb of city.limbs){limb.plant=null;limb.swing=null;}
     const previous=new Map();let contacts=0;
     for(let i=0;i<97;i++){
      const px=x+i*.25;city.root.position.set(px,terrainHeight(px,z),z);animateCity(city,i/12,true,0);city.root.updateMatrixWorld(true);
      if(city.rig.matrixWorld.elements.some(v=>!Number.isFinite(v)))throw Error(`${variant}/${count}: nonfinite rig`);
      for(const limb of city.limbs.filter(l=>l.leg)){
       const centre=limb.foot.localToWorld(limb.soleCentre.clone());
       if(limb.contact){
        contacts++;let gap=Infinity;
        for(const local of limb.solePoints){const p=limb.foot.localToWorld(local.clone()),clearance=p.y-renderedTerrainHeight(p.x,p.z);samples++;gap=Math.min(gap,clearance);minClearance=Math.min(minClearance,clearance);if(!Number.isFinite(clearance)||clearance<-.0001)throw Error(`${variant}/${count}/${site}/${i}: sole penetrates terrain by ${-clearance}`);}
        maxContactGap=Math.max(maxContactGap,gap);if(gap>.006)throw Error(`${variant}/${count}/${site}/${i}: planted sole floats ${gap}`);
        const prior=previous.get(limb.side);if(prior){const slip=Math.hypot(centre.x-prior.x,centre.z-prior.z);maxSlip=Math.max(maxSlip,slip);if(slip>.001)throw Error(`${variant}/${count}/${site}: planted sole slides ${slip}`);}
        previous.set(limb.side,centre);
        const error=limb.foot.getWorldPosition(new T.Vector3()).distanceTo(limb.contactTarget);maxTargetError=Math.max(maxTargetError,error);if(error>.001)throw Error(`${variant}/${count}/${site}: leg solver misses sole target ${error}`);
       }else previous.delete(limb.side);
      }
     }
     fixtures.push({variant,count,site,contacts,height:city.verticalLayout.height});
    }
   }
   const baseline=Array(20).fill(null);for(const id of VERTICAL_SLOT_ORDER.slice(0,3))baseline[id]={type:'housing',level:1,remaining:0};
   const pose=(buildings,rings)=>{setCityRings(city,rings,buildings);animateCity(city,20,false,0);return [...city.rig.position.toArray(),city.rig.rotation.x,city.rig.rotation.z];};
   const original=pose(baseline,1),capacity=pose(baseline,2),pending=baseline.map(b=>b?{...b}:null);pending[VERTICAL_SLOT_ORDER[3]]={type:'housing',level:1,remaining:10};
   const building=pose(pending,2),upgrading=baseline.map(b=>b?{...b}:null);upgrading[VERTICAL_SLOT_ORDER[0]]={type:'housing',level:1,remaining:10,upgrading:true};
   for(const [name,actual]of [['capacity-only',capacity],['new-scaffolding',building],['retained-upgrade-masonry',pose(upgrading,2)]]){const error=Math.max(...actual.map((v,i)=>Math.abs(v-original[i])));if(error>1e-10)throw Error(`${variant}/${name}: existing occupied load changed by ${error}`);loadInvariants.push({variant,name,error});}
   disposeGroup(city.root);
  }
  return {fixtures,loadInvariants,samples,minClearance,maxContactGap,maxSlip,maxTargetError};
 }));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.equal(report.fixtures.length,12);assert.ok(report.samples>10000);
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await fs.writeFile(path.join(out,'load-support-report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
