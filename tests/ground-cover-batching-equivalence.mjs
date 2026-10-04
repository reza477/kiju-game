// Exact CPU proof of the reviewed cell-prefix subsets after draw consolidation.
// The browser only decodes existing local assets and constructs the landscape;
// it never creates a renderer, RAF loop, or a real player save.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import * as T from '../vendor/three.module.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const origin=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4219/');
assert.ok(['127.0.0.1','localhost'].includes(origin.hostname));
const out=path.resolve(process.env.OUTPUT_DIR||path.join(root,'artifacts/ground-cover-volume/batching-equivalence'));
await fs.mkdir(out,{recursive:true});
await assert.rejects(fs.access(path.join(out,'report.json')),'Existing evidence must not be overwritten');
const oldPath=path.join(root,'artifacts/ground-cover-volume/attempt4-source/ground-cover-volume.js');
const sha=value=>createHash('sha256').update(value).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
async function source(){
  const scope=['src','assets','vendor','index.html','package.json','package-lock.json'];
  const files=[...new Set((git('ls-files',...scope)+'\n'+git('ls-files','--others','--exclude-standard',...scope)).split('\n').filter(Boolean))].sort();
  const hashes={};for(const file of files)hashes[file]=sha(await fs.readFile(path.join(root,file)));
  return {commit:git('rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
const report={protocol:'ground-cover-batching-equivalence-v1',startedAt:new Date().toISOString(),
  command:{executable:process.execPath,args:process.argv.slice(1),cwd:root,environment:{GAME_TEST_URL:origin.href,OUTPUT_DIR:out,EXPECTED_SOURCE_FINGERPRINT:process.env.EXPECTED_SOURCE_FINGERPRINT??null}},
  sourceStart:await source(),checks:[],fixtures:[],errors:[],failedRequests:[],externalRequests:[],passed:false,
  limitations:['CPU equivalence does not demonstrate GPU compilation, motion appearance, culling performance or frame rate. Separate final-source gameplay evidence is required.',
    'Three global bounds replace per-cell culling bounds. Active geometry is identical, but offscreen instances may now be submitted; a lower draw count is not proof of lower frame cost.',
    'The production fixture records only the id/kind/x/z/size inputs consumed by placement. It is not a serialization or interaction test; production preservation is independently tested.']};
let browser;
const plainRecords=records=>records.map(row=>Object.freeze({...row}));
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
function geometry(g){
  return {name:g.name,index:g.index?sha(bytes(g.index.array)):null,attributes:Object.fromEntries(Object.entries(g.attributes).map(([key,a])=>[key,{type:a.array.constructor.name,itemSize:a.itemSize,normalized:a.normalized,count:a.count,sha256:sha(bytes(a.array))}])),
    groups:g.groups,drawRange:g.drawRange,bounds:{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray(),center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius}};
}
function material(m,clock){
  const json=m.toJSON();delete json.metadata;delete json.uuid;
  const shader={uniforms:{},vertexShader:T.ShaderLib.lambert.vertexShader,fragmentShader:T.ShaderLib.lambert.fragmentShader};
  m.onBeforeCompile(shader);assert.equal(shader.uniforms.uGroundCoverTime,clock);
  return {json,hook:m.onBeforeCompile.toString(),key:m.customProgramCacheKey(),vertexShader:shader.vertexShader,fragmentShader:shader.fragmentShader,uniforms:shader.uniforms};
}
function active(layer){
  const rows=[],byKind={grass:0,fern:0,shrub:0};let triangles=0;
  for(const mesh of layer.group.children){
    const kind=mesh.userData.groundCoverVolume;assert.equal(mesh.visible,mesh.count>0);
    byKind[kind]+=mesh.count;triangles+=mesh.count*mesh.geometry.attributes.position.count/3;
    for(let i=0;i<mesh.count;i++)rows.push(kind+':'+bytes(mesh.instanceMatrix.array.subarray(i*16,i*16+16)).toString('hex')+':'+bytes(mesh.instanceColor.array.subarray(i*3,i*3+3)).toString('hex'));
  }
  rows.sort();return {rows,byKind,instances:rows.length,triangles,sha256:sha(rows.join('\n'))};
}
function stable(layer){return layer.group.children.map(mesh=>({id:mesh.uuid,geometry:mesh.geometry.uuid,material:mesh.material.uuid,matrix:sha(bytes(mesh.instanceMatrix.array)),color:sha(bytes(mesh.instanceColor.array)),matrixVersion:mesh.instanceMatrix.version,colorVersion:mesh.instanceColor.version}));}
function integrity(layer){
  assert.equal(layer.group.raycast(),false);assert.equal(layer.group.userData.noBatch,true);assert.equal(layer.update,undefined);
  const matrix=new T.Matrix4(),point=new T.Vector3(),ray=new T.Raycaster();let testedVertices=0;
  layer.group.updateMatrixWorld(true);
  for(const mesh of layer.group.children){
    assert.ok(mesh.isInstancedMesh);assert.equal(mesh.raycast(),false);assert.equal(mesh.userData.noBatch,true);
    assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);assert.equal(mesh.frustumCulled,true);
    assert.deepEqual(mesh.matrixWorld.elements,new T.Matrix4().elements);
    for(const key of ['node','ground','slot','enemy'])assert.equal(mesh.userData[key],undefined);
    assert.equal(mesh.instanceMatrix.usage,T.StaticDrawUsage);assert.equal(mesh.instanceColor.usage,T.StaticDrawUsage);
    assert.equal(mesh.count,mesh.instanceMatrix.count);assert.equal(mesh.count,mesh.instanceColor.count);
    assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.map,null);assert.equal(mesh.material.alphaTest,0);
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);
      for(let j=0;j<mesh.geometry.attributes.position.count;j++){
        point.fromBufferAttribute(mesh.geometry.attributes.position,j).applyMatrix4(matrix);
        assert.ok(mesh.boundingBox.containsPoint(point),'Uncontained instance vertex in box');
        assert.ok(mesh.boundingSphere.containsPoint(point),'Uncontained instance vertex in sphere');testedVertices++;
      }
      if(i===0||i===mesh.count-1){point.setFromMatrixPosition(matrix);ray.set(point.clone().add(new T.Vector3(0,100,0)),new T.Vector3(0,-1,0));assert.deepEqual(ray.intersectObject(layer.group,true),[]);}
    }
  }
  return testedVertices;
}
function compareFixture(name,records,oldModule,newModule){
  Object.freeze(records);const input=JSON.stringify(records),clockA={value:3.75},clockB={value:3.75};
  assert.deepEqual(newModule.GROUND_COVER_LIMITS,oldModule.GROUND_COVER_LIMITS);
  const aPlacement=oldModule.createGroundCoverPlacements(records),bPlacement=newModule.createGroundCoverPlacements(records);
  assert.deepEqual(bPlacement,aPlacement,name+': placement data changed');
  const a=oldModule.createGroundCoverVolume({timeUniform:clockA,existingRecords:records});
  const b=newModule.createGroundCoverVolume({timeUniform:clockB,existingRecords:records});
  const result={name,recordCount:records.length,recordSha256:sha(input),placementSha256:sha(JSON.stringify(aPlacement)),instances:aPlacement.placements.length,oldDrawMeshes:a.group.children.length,newDrawMeshes:b.group.children.length,quality:[]};
  try{
    assert.equal(b.group.children.length,3);assert.equal(new Set(b.group.children.map(m=>m.geometry)).size,3);assert.equal(new Set(b.group.children.map(m=>m.material)).size,1);
    result.boundsVerticesChecked={before:integrity(a),after:integrity(b)};
    for(const kind of ['grass','fern','shrub'])assert.deepEqual(geometry(b.group.children.find(m=>m.userData.groundCoverVolume===kind).geometry),geometry(a.group.children.find(m=>m.userData.groundCoverVolume===kind).geometry),name+': '+kind+' master changed');
    const aMat=material(a.group.children[0].material,clockA),bMat=material(b.group.children[0].material,clockB);
    for(const key of ['json','hook','key','vertexShader','fragmentShader'])assert.deepEqual(bMat[key],aMat[key],name+': material '+key+' changed');
    result.shaderSha256={vertex:sha(aMat.vertexShader),fragment:sha(aMat.fragmentShader),hook:sha(aMat.hook)};
    const stableA=stable(a),stableB=stable(b),initial=active(a);
    for(const setting of ['high','balanced','medium','low','performance','retro','high','unknown-setting']){
      a.setQuality(setting);b.setQuality(setting);const aa=active(a),bb=active(b);
      assert.equal(bb.sha256,aa.sha256,name+': exact active matrix/color multiset changed at '+setting);
      assert.deepEqual(bb.byKind,aa.byKind);assert.equal(bb.instances,aa.instances);assert.equal(bb.triangles,aa.triangles);
      assert.equal(b.stats.activeInstances,a.stats.activeInstances);assert.equal(b.stats.activeTriangles,a.stats.activeTriangles);
      assert.deepEqual(bMat.uniforms.uCoverRange.value.toArray(),aMat.uniforms.uCoverRange.value.toArray());
      assert.deepEqual(stable(a),stableA);assert.deepEqual(stable(b),stableB);
      result.quality.push({setting,effectiveQuality:b.stats.quality,instances:aa.instances,byKind:aa.byKind,triangles:aa.triangles,exactInstanceMultisetSha256:aa.sha256,range:bMat.uniforms.uCoverRange.value.toArray(),oldDraws:a.group.children.filter(m=>m.visible).length,newDraws:b.group.children.filter(m=>m.visible).length});
    }
    assert.equal(active(b).sha256,initial.sha256);assert.equal(clockA.value,3.75);assert.equal(clockB.value,3.75);assert.equal(JSON.stringify(records),input);
    for(const key of ['instances','maxInstanceBudget','byKind','masterTriangles','totalTriangles','uniqueGeometryBytes','instanceBytes','placementSummary'])assert.deepEqual(b.stats[key],a.stats[key],name+': immutable stats changed '+key);
    for(const quality of Object.keys(a.stats.qualityBudgets)){
      const {maxDraws:oldDraws,...oldBudget}=a.stats.qualityBudgets[quality],{maxDraws:newDraws,...newBudget}=b.stats.qualityBudgets[quality];
      assert.deepEqual(newBudget,oldBudget);assert.ok(newDraws<=3&&newDraws<=oldDraws);
    }
    result.unchangedStats=Object.fromEntries(['byKind','totalTriangles','uniqueGeometryBytes','instanceBytes'].map(key=>[key,b.stats[key]]));
    for(const layer of [a,b]){
      const resources=new Set(layer.group.children.flatMap(m=>[m,m.geometry,m.material])),counts=new Map();
      for(const resource of resources){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}
      layer.dispose();layer.dispose();layer.setQuality('low');for(const n of counts.values())assert.equal(n,1);
      assert.equal(layer.group.children.length,0);assert.equal(layer.stats.disposed,true);
    }
    result.passed=true;return result;
  }finally{a.dispose();b.dispose();}
}
try{
  if(process.env.EXPECTED_SOURCE_FINGERPRINT)assert.equal(report.sourceStart.fingerprint,process.env.EXPECTED_SOURCE_FINGERPRINT);
  const oldBytes=await fs.readFile(oldPath),oldText=oldBytes.toString('utf8');
  const reviewed=JSON.parse(await fs.readFile(path.join(root,'artifacts/ground-cover-volume/after-captures-final/report.json'),'utf8'));
  assert.equal(sha(oldBytes),reviewed.sourceStart.hashes['src/ground-cover-volume.js'],'Frozen reference must be exactly the captured R4 module');
  report.reviewedSource={module:oldPath,sha256:sha(oldBytes),fingerprint:reviewed.sourceStart.fingerprint,captureReport:'artifacts/ground-cover-volume/after-captures-final/report.json'};
  let imports=0;const oldNode=oldText.replace(/from (['"])(\.\.\/vendor\/three\.module\.js|\.\/terrain\.js)\1/g,(_match,_quote,spec)=>{imports++;return 'from '+JSON.stringify(pathToFileURL(path.resolve(root,'src',spec)).href);});
  assert.equal(imports,2,'Only the two declared reference module import paths may be adapted for Node');
  report.referenceImportAdaptation={replacements:imports,adaptedSha256:sha(oldNode),purpose:'Resolve unchanged pinned Three and terrain modules from a frozen copied module; no behavior edits.'};
  assert.equal(report.sourceStart.hashes['src/terrain.js'],reviewed.sourceStart.hashes['src/terrain.js']);assert.equal(report.sourceStart.hashes['vendor/three.module.js'],reviewed.sourceStart.hashes['vendor/three.module.js']);
  const oldModule=await import('data:text/javascript;base64,'+Buffer.from(oldNode).toString('base64'));
  const newModule=await import(pathToFileURL(path.join(root,'src/ground-cover-volume.js')).href);
  report.health=await (await fetch(new URL('/health',origin))).json();
  assert.equal(report.health.app,'colossus-wake-local');
  assert.equal(report.health.rootId,sha(path.resolve(root).replace(/\\/g,'/').toLowerCase()));
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu','--mute-audio']});report.browser=browser.version();
  const context=await browser.newContext({serviceWorkers:'block'});
  let production;
  try{
    const page=await context.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
    await page.route('**/*',route=>{const u=new URL(route.request().url());if(['blob:','data:'].includes(u.protocol))return route.continue();if(u.origin!==origin.origin){report.externalRequests.push(u.href);return route.abort();}if(u.pathname==='/__cover_batching_cpu')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Ground-cover CPU equivalence fixture</title>'});return route.continue();});
    await page.goto(new URL('/__cover_batching_cpu',origin).href);
    production=await page.evaluate(async()=>{
      const pilot=await import('/src/meshy-pilot.js'),patch=await import('/src/ground-patch.js');await pilot.loadMeshyPilot();await patch.loadGroundPatch();
      if(pilot.meshyPilotStatus().state!=='ready'||patch.groundPatchStatus().state!=='ready')throw Error('Existing local preloads failed');
      const {createLandscape}=await import('/src/landscape.js'),{surfaceDiagnostics}=await import('/src/surface-library.js');
      const landscape=createLandscape(),start=performance.now();while(surfaceDiagnostics().pending){if(performance.now()-start>30000)throw Error('Surface decoding timeout');await new Promise(r=>setTimeout(r,25));}
      if(surfaceDiagnostics().failures.length)throw Error('Existing surface decode failed');
      return {records:landscape.crushables.map(({id,kind,x,z,size})=>({id,kind,x,z,size})),stats:landscape.stats.groundCoverVolume,preloads:{pilot:pilot.meshyPilotStatus(),patch:patch.groundPatchStatus(),surfaces:surfaceDiagnostics()},rendererCreated:false};
    });
  }finally{await context.close();await browser.close();browser=null;}
  report.production={recordCount:production.records.length,recordSha256:sha(JSON.stringify(production.records)),stats:production.stats,preloads:production.preloads,rendererCreated:production.rendererCreated};
  assert.equal(production.records.length,1665);await fs.writeFile(path.join(out,'production-records.json'),JSON.stringify(production.records,null,2)+'\n',{flag:'wx'});
  const fixtures=[['actual-production',plainRecords(production.records)],['empty',[]],['small-fixture',plainRecords([{id:'tree:fixture',kind:'tree',x:-72,z:49,size:1.5},{id:'rock:fixture',kind:'rock',x:106,z:5,size:3}])],['mixed-boundaries',plainRecords(Array.from({length:72},(_,i)=>({id:'boundary:'+i,kind:i%3===0?'ignored':i%2?'tree':'rock',x:(i%9-4)*42+.001,z:(Math.floor(i/9)-4)*45-.001,size:i%7*.55})))]];
  for(const [name,records]of fixtures)report.fixtures.push(compareFixture(name,records,oldModule,newModule));
  assert.deepEqual(report.fixtures[0].unchangedStats.byKind,production.stats.byKind);assert.equal(report.fixtures[0].instances,production.stats.instances);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);assert.deepEqual(report.externalRequests,[]);
  report.checks=['Frozen reference hash equals the actual reviewed R4 capture source; shared terrain and pinned Three bytes are unchanged.','Actual 1665 production anchors and three additional fixture sets produce exact unchanged placements, masters and material shader.','Every quality has an exact bytewise multiset of the same active matrices/colors; counts, triangles and fade ranges match.','Exactly three repaired draws retain finite contained geometry, opaque material, no shadows, no picking, unchanged buffer versions and no CPU animation updater.','Quality cycling does not rewrite buffers; high restores the exact subset; repeated disposal frees each owned resource once.'];report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{
  await browser?.close();report.finishedAt=new Date().toISOString();report.sourceFinish=await source();report.sourceStable=report.sourceStart.fingerprint===report.sourceFinish.fingerprint;
  if(!report.sourceStable){report.passed=false;report.sourceFailure='Production source changed during proof';process.exitCode=1;}
  report.exitCode=process.exitCode||0;await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({passed:report.passed,sourceStable:report.sourceStable,exitCode:report.exitCode,fixtures:report.fixtures.map(({name,oldDrawMeshes,newDrawMeshes,passed})=>({name,oldDrawMeshes,newDrawMeshes,passed})),failure:report.failure,report:path.join(out,'report.json')},null,2));
