// Read-only paired environment construction. No WebGLRenderer or GPU capture.
// Baseline source is served from Git in memory; the checkout is never replaced.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),pw=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const revision=process.env.BASELINE_REV||'75a5056d86e0d0fc8cb820694bbcc29e87be6e92',out=path.resolve(process.env.OUTPUT_DIR||'artifacts/representative-crawler/environment-identity');await fs.mkdir(out,{recursive:true});
const baseline=new Map(['src/terrain.js','src/landscape.js','src/authored-valley.js'].map(file=>['/'+file,execFileSync('git',['show',revision+':'+file],{encoding:'utf8'})]));
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
   let finiteAttributes=0,finiteMatrices=0,triangles=0,meshes=0,maxDepositionOffset=0;const placements=[],treeRoots=[];
   const inspect=group=>group.traverse(mesh=>{if(!mesh.isMesh)return;meshes++;for(const attribute of Object.values(mesh.geometry.attributes))for(const n of attribute.array){if(!Number.isFinite(n))throw Error(mesh.name+' has non-finite geometry');finiteAttributes++;}if(mesh.isInstancedMesh)for(const n of mesh.instanceMatrix.array){if(!Number.isFinite(n))throw Error(mesh.name+' has non-finite matrix');finiteMatrices++;}triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
    if(mesh.name==='Runoff mineral deposition'){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),offset=p.getY(i)-terrain.renderedTerrainHeight(x,z);if(offset<-.0001||offset>.0321)throw Error('Mineral surface exceeds supported offset: '+offset);maxDepositionOffset=Math.max(maxDepositionOffset,offset);}}
    if(mesh.isInstancedMesh&&mesh.count){const xz=[];for(let i=0;i<mesh.count;i++)xz.push(mesh.instanceMatrix.array[i*16+12],mesh.instanceMatrix.array[i*16+14]);const root=mesh.geometry.attributes.windRoot,roots=[];if(root)for(let i=0;i<root.count;i++)roots.push(root.getX(i),root.getZ(i));placements.push({name:mesh.name,xz,roots});}
   });inspect(landscape.group);resourceSites.forEach(({group})=>inspect(group));
   const bridge=landscape.group.getObjectByName('Fractured highway bridge abutments');
   if(bridge){
    if(bridge.children.filter(o=>o.isMesh).length!==3)throw Error('Bridge must have three material draws');
    bridge.updateMatrixWorld(true);
    const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    bridge.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;
     for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-12)throw Error('Degenerate bridge face');}
     for(let i=0;i<p.count;i++){a.fromBufferAttribute(p,i);b.fromBufferAttribute(n,i);if(b.lengthSq()<.99)throw Error('Invalid bridge normal');const bz=terrain.roadZ(terrain.riverX(140)),cx=terrain.riverX(bz),side=a.x<cx?-1:1,anchor=cx+side*(terrain.riverWidth(bz)+4);if(Math.abs(a.x-anchor)>3.001||Math.abs(a.z-bz)>5.201||a.y>1.801)throw Error('Bridge escaped existing envelope');}
    });
   }
   const protectedAnchors=landscape.crushables.filter(r=>terrain.protectedResource(r.x,r.z));if(protectedAnchors.length)throw Error('Protected destruction anchors');
   const anchors=landscape.crushables,inFeature=(x,z)=>{const d=terrain.riverX(z)-terrain.riverWidth(z)-x;return z>30&&z<124&&d>8&&d<54;};
   const damage=[...new Set([...anchors.filter(r=>inFeature(r.x,r.z)).slice(0,12),...anchors.slice(0,40)].map(r=>r.id))].slice(0,40);landscape.resetInteractions({mode:'expedition',damage:JSON.parse(JSON.stringify(damage))});if(landscape.stats.destroyedCount!==40)throw Error('Save damage restore lost anchors');landscape.resetInteractions();if(landscape.stats.poolDraw.submittedInstances!==0)throw Error('Reset left pool submissions');
   const rootHeights=new Map();landscape.group.traverse(mesh=>{if(!['Broadleaf canopies','Pine boughs','Distant Broadleaf canopies','Distant Pine boughs'].includes(mesh.name))return;const a=mesh.geometry.attributes.windRoot;if(a)for(let i=0;i<a.count;i++)rootHeights.set(a.getX(i)+','+a.getZ(i),a.getY(i));});
   for(const r of anchors.filter(r=>r.kind==='tree')){const x=Math.fround(r.x),z=Math.fround(r.z),y=rootHeights.get(x+','+z);if(y===undefined)throw Error('Saved tree has no rooted canopy: '+r.id);treeRoots.push({id:r.id,x,z,y,delta:terrain.westernTerraceDelta?.(x,z)||0});}
   const resources=resourceSites.map(({node,group})=>{group.updateMatrixWorld(true);return{id:node.id,x:node.x,z:node.z,position:group.position.toArray()};});
   const heights=[];let maxSlope=0,boundaryChecks=0,meshSamples=0,maxMeshError=0;
   for(let z=-256;z<=256;z+=4)for(let x=-256;x<=256;x+=4){const y=terrain.terrainHeight(x,z),normal=terrain.terrainNormal(x,z),delta=terrain.westernTerraceDelta?.(x,z)||0,protectedArea=terrain.RESOURCE_CENTRES.some(([cx,cz])=>Math.hypot(x-cx,z-cz)<=40),road=Math.abs(z-terrain.roadZ(x))<=12;
    if(!Number.isFinite(y)||Math.abs(Math.hypot(normal.x,normal.y,normal.z)-1)>1e-10)throw Error('Invalid actual terrain');if((!inFeature(x,z)||protectedArea||road)&&delta!==0)throw Error('Terrace escaped its permitted footprint');if(delta)maxSlope=Math.max(maxSlope,Math.hypot(normal.x,normal.z)/normal.y);heights.push({x,z,y,delta,outside:!inFeature(x,z)||protectedArea||road});}
   if(terrain.westernTerraceDelta){for(let z=30;z<=124;z+=.5)for(const d of[8,54]){const x=terrain.riverX(z)-terrain.riverWidth(z)-d;for(const offset of[-.0001,0,.0001])if(Math.abs(terrain.westernTerraceDelta(x+offset,z))>1e-7)throw Error('Unblended lateral terrace boundary');boundaryChecks++;}for(let d=8;d<=54;d+=.5)for(const z of[30,124]){const x=terrain.riverX(z)-terrain.riverWidth(z)-d;for(const offset of[-.0001,0,.0001])if(Math.abs(terrain.westernTerraceDelta(x,z+offset))>1e-7)throw Error('Unblended terrace end');boundaryChecks++;}}
   const ground=landscape.ground.geometry,p=ground.attributes.position,index=ground.index;
   for(let i=0;i<p.count;i++){if(p.getY(i)!==Math.fround(terrain.terrainHeight(p.getX(i),p.getZ(i))))throw Error('Terrain vertex diverged from shared height');}
   for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2),x=p.getX(a)*.23+p.getX(b)*.38+p.getX(c)*.39,z=p.getZ(a)*.23+p.getZ(b)*.38+p.getZ(c)*.39;if(i%2991!==0&&!inFeature(x,z))continue;const y=p.getY(a)*.23+p.getY(b)*.38+p.getY(c)*.39,error=Math.abs(y-terrain.renderedTerrainHeight(x,z));maxMeshError=Math.max(maxMeshError,error);if(error>2e-5)throw Error('Rendered triangle and footing surface disagree');meshSamples++;}
   const valley=await import('/src/authored-valley.js');let drainageSamples=0;
   if(valley.valleyDrainage){
    const d=valley.valleyDrainageDiagnostics();if(d.processedSamples!==d.totalSamples)throw Error('Runoff graph contains an unprocessed cycle');
    for(let z=-256;z<=256;z+=4)for(let x=-256;x<=256;x+=4){const sample=valley.valleyDrainage(x,z);for(const value of Object.values(sample))if(!Number.isFinite(value)||value<0||value>1.00001)throw Error('Invalid drainage field sample');if(terrain.protectedResource(x,z,1)&&Object.values(sample).some(Boolean))throw Error('Drainage crossed protected resource');drainageSamples++;}
    for(let along=-254;along<=254;along+=2)for(const[x,z]of[[254,along],[-254,along],[along,254],[along,-254]])if(Object.values(valley.valleyDrainage(x,z)).some(Boolean))throw Error('Drainage field does not blend to zero at boundary');
   }
   return{anchors,resources,heights,placements,treeRoots,damage,stats:landscape.stats,finiteAttributes,finiteMatrices,triangles,meshes,maxDepositionOffset,drainageSamples,maxSlope,boundaryChecks,meshSamples,maxMeshError};
  });await context.close();
 }
 assert.deepEqual(report.current.anchors,report.baseline.anchors,'Saved scenery ID/kind/x/z/size changed');assert.deepEqual(report.current.resources,report.baseline.resources,'Resource transforms changed');assert.deepEqual(report.current.placements,report.baseline.placements,'Scenery or vegetation x/z placement changed');assert.deepEqual(report.current.damage,report.baseline.damage,'Saved destruction selection changed');
 assert.deepEqual(report.current.heights,report.baseline.heights,'Terrain physics changed');
 assert.deepEqual(report.current.treeRoots,report.baseline.treeRoots,'Saved tree root changed');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
 report.verified={anchors:report.current.anchors.length,resources:report.current.resources.length,heightSamples:report.current.heights.length,rootedTrees:report.current.treeRoots.length,placementBatches:report.current.placements.length};
 report.geometryDelta={triangles:report.current.triangles-report.baseline.triangles,meshes:report.current.meshes-report.baseline.meshes};
 for(const mode of['baseline','current'])for(const key of['anchors','heights','placements','treeRoots'])delete report[mode][key];
}catch(error){report.failure=error.stack;process.exitCode=1;}finally{await browser.close();for(const mode of['baseline','current'])if(report[mode])for(const key of['anchors','heights','placements','treeRoots'])delete report[mode][key];await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
