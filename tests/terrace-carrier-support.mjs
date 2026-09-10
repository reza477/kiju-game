// Actual product movement and rendered contact geometry, without a renderer.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/graphics-09-builder-04/traversal');await fs.mkdir(out,{recursive:true});
const baseline=execFileSync('git',['show','3aa57be:src/terrain.js'],{encoding:'utf8'})+`\nexport const scenerySelectionHeight=terrainHeight,scenerySelectionNormal=terrainNormal;export const westernTerraceDelta=()=>0;export const WESTERN_TERRACE={name:'The Westbank Shelf',zMin:30,zMax:124,shoreMin:8,shoreMax:54,resourceClearance:40,roadClearance:12};`;
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-gpu','--mute-audio']}),report={errors:[],remote:[],fixture:'Real tick/travel/save/restore, makeCity, placeCity and animateCity. Actual rendered sole/tread vertices. No WebGLRenderer. Baseline is literal3aa57be terrain with compatibility aliases; other product code is current in both contexts.'};
try{
 for(const mode of ['baseline','current']){
  const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(300000);
  page.on('pageerror',e=>report.errors.push(mode+': '+e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(mode+': '+m.text());});
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/terrace-support-fixture')return r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'});if(u.origin==='http://127.0.0.1:4178'){if(mode==='baseline'&&u.pathname==='/src/terrain.js')return r.fulfill({contentType:'application/javascript',body:baseline});return r.continue();}report.remote.push(u.href);return r.abort();});
  await page.goto('http://127.0.0.1:4178/terrace-support-fixture');
  report[mode]=await page.evaluate(async()=>{
   const T=await import('/vendor/three.module.js'),{makeCity,setCityRings,animateCity}=await import('/src/carriers.js'),{placeCity}=await import('/src/scene.js'),sim=await import('/src/simulation.js'),{renderedTerrainHeight,westernTerraceDelta}=await import('/src/terrain.js'),{disposeGroup}=await import('/src/materials.js');
   const routes=[{name:'across',from:[-46,74],to:[16,74]},{name:'along',from:[-7,36],to:[-7,118]},{name:'notch',from:[-30,52],to:[8,104]}],cases=[];
   let soleSamples=0,treadSamples=0,globalMinSole=Infinity,globalMaxSole=0,globalSlip=0,maxPoseError=0;
   function treadVertices(city){
    city.root.updateWorldMatrix(true,true);const inverse=city.root.matrixWorld.clone().invert(),points=new Map(),p=new T.Vector3(),instance=new T.Matrix4();
    city.frame.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,base=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld);
     for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=base.clone();if(o.isInstancedMesh){o.getMatrixAt(i,instance);matrix.multiply(instance);}
      for(let j=0;j<a.count;j++){p.fromBufferAttribute(a,j).applyMatrix4(matrix);if(Math.abs(p.x)>=7.15&&Math.abs(p.x)<=11.1&&p.y<1.35&&Math.abs(p.z)<9*(city.footprintScale?.z??1))points.set(p.toArray().map(n=>n.toFixed(6)).join(','),p.clone());}
     }
    });if(points.size<64)throw Error('Insufficient actual tread geometry: '+points.size);return [...points.values()];
   }
   for(const variant of ['flesh','cyborg','standard','drill'])for(const speed of [1,2])for(const route of routes){
    const faction=['flesh','cyborg'].includes(variant)?'kaiju':'crawler';let state=sim.createGame(faction,variant),city=makeCity(faction,false,2,variant);
    state.resources={wood:99999,iron:99999,food:99999};state.speed=speed;state.x=route.from[0];state.z=route.from[1];state.angle=Math.atan2(route.to[0]-state.x,route.to[1]-state.z);
    if(faction==='kaiju'){state.rings=2;for(let i=0;i<20;i++)if(!state.buildings[i])state.buildings[i]={type:'housing',level:1,remaining:0};setCityRings(city,2,state.buildings,state.towerOrder);}
    let treads=faction==='crawler'?treadVertices(city):[],minTread=Infinity,maxTread=-Infinity,maxLiftedMinimum=0,maxDelta=0,reloaded=false,frames=[];const previous=new Map();
    sim.travel(state,...route.to);const initialDistance=Math.hypot(route.to[0]-state.x,route.to[1]-state.z);
    for(let frame=0;frame<2400;frame++){
     sim.tick(state,.05);placeCity(city,state.x,state.z,state.angle);animateCity(city,state.time,state.moving,0);city.root.updateWorldMatrix(true,true);
     if(city.root.matrixWorld.elements.some(n=>!Number.isFinite(n)))throw Error(`${variant}/${route.name}: nonfinite pose`);
     maxDelta=Math.max(maxDelta,westernTerraceDelta(state.x,state.z));let floorMin=Infinity,floorMax=-Infinity;
     if(faction==='kaiju'){
      for(const limb of city.limbs.filter(l=>l.leg)){
       const center=limb.foot.localToWorld(limb.soleCentre.clone());
       if(limb.contact){let gap=Infinity;
        for(const local of limb.solePoints){const point=limb.foot.localToWorld(local.clone()),d=point.y-renderedTerrainHeight(point.x,point.z);soleSamples++;globalMinSole=Math.min(globalMinSole,d);gap=Math.min(gap,d);if(!Number.isFinite(d)||d<-.0001)throw Error(`${variant}/${route.name}: planted sole penetrates ${d}`);}
        globalMaxSole=Math.max(globalMaxSole,gap);if(gap>.006)throw Error(`${variant}/${route.name}: planted sole floats ${gap}`);
        const prior=previous.get(limb.side);if(prior&&state.moving){const slip=Math.hypot(center.x-prior.x,center.z-prior.z);globalSlip=Math.max(globalSlip,slip);if(slip>.001)throw Error(`${variant}/${route.name}: planted sole slips ${slip}`);}previous.set(limb.side,center);
        const error=limb.foot.getWorldPosition(new T.Vector3()).distanceTo(limb.contactTarget);maxPoseError=Math.max(maxPoseError,error);if(error>.001)throw Error('Leg solver missed actual sole');
       }else previous.delete(limb.side);
      }
     }else for(const local of treads){const point=local.clone().applyMatrix4(city.root.matrixWorld),d=point.y-renderedTerrainHeight(point.x,point.z);if(!Number.isFinite(d))throw Error('Nonfinite tread clearance');treadSamples++;floorMin=Math.min(floorMin,d);floorMax=Math.max(floorMax,d);}
     if(faction==='crawler'){minTread=Math.min(minTread,floorMin);maxTread=Math.max(maxTread,floorMax);maxLiftedMinimum=Math.max(maxLiftedMinimum,floorMin);frames.push({x:state.x,z:state.z,min:floorMin,max:floorMax});}
     const distance=Math.hypot(route.to[0]-state.x,route.to[1]-state.z);
     if(!reloaded&&distance<initialDistance*.5){
      const restored=sim.deserialize(sim.serialize(state));if(!restored||restored.x!==state.x||restored.z!==state.z||JSON.stringify(restored.buildings)!==JSON.stringify(state.buildings))throw Error('Mid-traverse save changed position or districts');
      state=restored;disposeGroup(city.root);city=makeCity(faction,false,2,variant);if(faction==='kaiju')setCityRings(city,2,state.buildings,state.towerOrder);else treads=treadVertices(city);previous.clear();reloaded=true;
     }
     if(!state.target){if(distance>.16)throw Error('Travel stopped short');break;}if(frame===2399)throw Error('Traversal did not finish');
    }
    if(!reloaded)throw Error('Missing mid-route reload');cases.push({variant,speed,route:route.name,minTread:faction==='crawler'?minTread:null,maxTread:faction==='crawler'?maxTread:null,maxLiftedMinimum,maxDelta,treadVertices:treads.length,reloaded,frames});disposeGroup(city.root);
   }
   return {cases,soleSamples,treadSamples,globalMinSole,globalMaxSole,globalSlip,maxPoseError};
  });await context.close();
 }
 report.comparisons=report.current.cases.filter(c=>c.treadVertices).map(current=>{const baseline=report.baseline.cases.find(c=>c.variant===current.variant&&c.speed===current.speed&&c.route===current.route);assert.equal(current.frames.length,baseline.frames.length);let worstAddedPenetration=0;for(let i=0;i<current.frames.length;i++){const a=current.frames[i],b=baseline.frames[i];assert.equal(a.x,b.x);assert.equal(a.z,b.z);worstAddedPenetration=Math.max(worstAddedPenetration,Math.max(0,-a.min)-Math.max(0,-b.min));}return {variant:current.variant,speed:current.speed,route:current.route,baselineMin:baseline.minTread,currentMin:current.minTread,worstAddedPenetration,maxLiftedMinimum:current.maxLiftedMinimum};});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.equal(report.current.cases.length,24);
 if(process.env.MEASURE_ONLY!=='1')for(const c of report.comparisons){
  assert.ok(c.currentMin>=-.0001,`${c.variant}/${c.route}: actual lower tread vertices penetrate ${c.currentMin}m`);
  assert.ok(c.maxLiftedMinimum<=.15,`${c.variant}/${c.route}: lower tread support gap exceeds 15cm`);
  assert.ok(c.worstAddedPenetration<=.06,`${c.variant}/${c.route}: terrace adds ${c.worstAddedPenetration}m tread penetration`);
 }
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({out,failure:report.failure,errors:report.errors,remote:report.remote,comparisons:report.comparisons,soles:report.current&&{samples:report.current.soleSamples,min:report.current.globalMinSole,max:report.current.globalMaxSole,slip:report.current.globalSlip}}));
