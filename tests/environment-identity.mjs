// Read-only paired environment construction. No WebGLRenderer or GPU capture.
// Baseline source is served from Git in memory; the checkout is never replaced.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),pw=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const revision=process.env.BASELINE_REV||'45b0b9f',out=path.resolve(process.env.OUTPUT_DIR||'artifacts/graphics-09-builder-03/environment-identity');await fs.mkdir(out,{recursive:true});
const baseline=new Map(['src/landscape.js','src/authored-valley.js'].map(file=>['/'+file,execFileSync('git',['show',revision+':'+file],{encoding:'utf8'})]));
const report={revision,fixture:'Production landscape and resource meshes in a blank document; no renderer. Baseline environment source read from Git; all other dependencies use current checkout.',errors:[],remote:[]};
const browser=await pw.chromium.launch({headless:true,channel:'chrome',args:['--disable-gpu','--mute-audio']});
try{
 for(const mode of['baseline','current']){
  const context=await browser.newContext(),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(mode+': '+e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(mode+': '+m.text());});
  await page.route('**/*',r=>{const url=new URL(r.request().url());if(url.origin!=='http://127.0.0.1:4178'&&!['data:','blob:'].includes(url.protocol)){report.remote.push(url.href);return r.abort();}if(url.pathname==='/__environment_identity')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body>Environment identity audit</body></html>'});if(mode==='baseline'&&baseline.has(url.pathname))return r.fulfill({contentType:'application/javascript',body:baseline.get(url.pathname)});return r.continue();});
  await page.goto('http://127.0.0.1:4178/__environment_identity');
  report[mode]=await page.evaluate(async()=>{
   const T=await import('/vendor/three.module.js'),{createLandscape,createResourceSite}=await import('/src/landscape.js'),{WORLD_NODES}=await import('/src/simulation.js'),terrain=await import('/src/terrain.js');
   const landscape=createLandscape(),resourceSites=WORLD_NODES.map(node=>({node,group:createResourceSite(node)}));
   let finiteAttributes=0,finiteMatrices=0,triangles=0,meshes=0,maxDepositionOffset=0;
   const inspect=group=>group.traverse(mesh=>{if(!mesh.isMesh)return;meshes++;for(const attribute of Object.values(mesh.geometry.attributes))for(const n of attribute.array){if(!Number.isFinite(n))throw Error(mesh.name+' has non-finite geometry');finiteAttributes++;}if(mesh.isInstancedMesh)for(const n of mesh.instanceMatrix.array){if(!Number.isFinite(n))throw Error(mesh.name+' has non-finite matrix');finiteMatrices++;}triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
    if(mesh.name==='Runoff mineral deposition'){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),offset=p.getY(i)-terrain.renderedTerrainHeight(x,z);if(offset<-.0001||offset>.0321)throw Error('Mineral surface exceeds supported offset: '+offset);maxDepositionOffset=Math.max(maxDepositionOffset,offset);}}
   });inspect(landscape.group);resourceSites.forEach(({group})=>inspect(group));
   const protectedAnchors=landscape.crushables.filter(r=>terrain.protectedResource(r.x,r.z));if(protectedAnchors.length)throw Error('Protected destruction anchors');
   const anchors=landscape.crushables,damage=anchors.slice(0,40).map(r=>r.id);landscape.resetInteractions({mode:'expedition',damage:JSON.parse(JSON.stringify(damage))});if(landscape.stats.destroyedCount!==40)throw Error('Save damage restore lost anchors');landscape.resetInteractions();if(landscape.stats.poolDraw.submittedInstances!==0)throw Error('Reset left pool submissions');
   const resources=resourceSites.map(({node,group})=>{group.updateMatrixWorld(true);return{id:node.id,x:node.x,z:node.z,position:group.position.toArray()};});
   const heights=[];for(let z=-176;z<=176;z+=8)for(let x=-176;x<=176;x+=8)heights.push(terrain.terrainHeight(x,z));
   const valley=await import('/src/authored-valley.js');let drainageSamples=0;
   if(valley.valleyDrainage){
    const d=valley.valleyDrainageDiagnostics();if(d.processedSamples!==d.totalSamples)throw Error('Runoff graph contains an unprocessed cycle');
    for(let z=-256;z<=256;z+=4)for(let x=-256;x<=256;x+=4){const sample=valley.valleyDrainage(x,z);for(const value of Object.values(sample))if(!Number.isFinite(value)||value<0||value>1.00001)throw Error('Invalid drainage field sample');if(terrain.protectedResource(x,z,1)&&Object.values(sample).some(Boolean))throw Error('Drainage crossed protected resource');drainageSamples++;}
    for(let along=-254;along<=254;along+=2)for(const[x,z]of[[254,along],[-254,along],[along,254],[along,-254]])if(Object.values(valley.valleyDrainage(x,z)).some(Boolean))throw Error('Drainage field does not blend to zero at boundary');
   }
   return{anchors,resources,heights,stats:landscape.stats,finiteAttributes,finiteMatrices,triangles,meshes,maxDepositionOffset,drainageSamples};
  });await context.close();
 }
 assert.deepEqual(report.current.anchors,report.baseline.anchors,'Saved scenery ID/kind/x/z/size changed');assert.deepEqual(report.current.resources,report.baseline.resources,'Resource transforms changed');assert.deepEqual(report.current.heights,report.baseline.heights,'Terrain changed');assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
 report.verified={anchors:report.current.anchors.length,resources:report.current.resources.length,heights:report.current.heights.length,maxDepositionOffset:report.current.maxDepositionOffset};
 report.geometryDelta={triangles:report.current.triangles-report.baseline.triangles,meshes:report.current.meshes-report.baseline.meshes};
 for(const mode of['baseline','current']){delete report[mode].anchors;delete report[mode].heights;}
}catch(error){report.failure=error.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
