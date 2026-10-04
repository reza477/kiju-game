// Focused native-UI verification. Separate from the frozen A/B timing driver.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';
import {classifyCarrierRequest} from './carrier-request-origin.mjs';

const toolRoot=fileURLToPath(new URL('..',import.meta.url));
const root=await fs.realpath(process.env.SOURCE_ROOT||toolRoot);
const fixtureRoot=await fs.realpath(process.env.FIXTURE_ROOT||'C:/Users/user/.codex/worktrees/ground-cover-volume-baseline/Kiju Game');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4219/');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/ground-cover-volume/lifecycle-final');
const beforePath=path.resolve(process.env.BASELINE_CAPTURE_REPORT||'artifacts/ground-cover-volume/before-captures-1/report.json');
const baselineCommit='3193014c0ac7fd6c3ebc8cbe970938918974c8d2';
const baselineFingerprint='8d429fdd36d07ca9f503951af43354352f7bc9598451c06a7dcc10a2450898a7';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
async function source(cwd){
  const names=[...new Set((git(cwd,'ls-files','src','assets','vendor','index.html','package.json','package-lock.json')+'\n'+git(cwd,'ls-files','--others','--exclude-standard','src','assets','vendor')).split('\n').filter(Boolean))].sort();
  const hashes={};for(const name of names)hashes[name]=sha(await fs.readFile(path.join(cwd,name)));
  return{root:cwd,commit:git(cwd,'rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
assert.ok(['127.0.0.1','localhost'].includes(base.hostname));
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0,'Use a fresh evidence directory.');
const report={startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),cwd:process.cwd(),environment:{SOURCE_ROOT:root,FIXTURE_ROOT:fixtureRoot,GAME_TEST_URL:base.href,OUTPUT_DIR:out,BASELINE_CAPTURE_REPORT:beforePath}},
  method:'Fresh isolated unaltered baseline crawler save. Actual Continue, Pause/Resume and menu Detail controls. Read-only uploaded uGroundCoverTime/uCoverRange, geometry and instance-buffer hashes. Native game loop is not wrapped or advanced. A separate raycaster reads only the new decorative subtree.',
  limitations:['Desktop Windows Chrome, not physical Apple/Safari.','No benchmark, installation/update or long-session claim.','Resource identity checks cover this one quality cycle and pause interval, not a proof of all memory behavior.'],checks:[],snapshots:[],errors:[],warnings:[],remoteRequests:[],failedRequests:[],passed:false};
let browser,context,page;
try{
  report.sourceStart=await source(root);report.fixtureSource=await source(fixtureRoot);assert.equal(report.fixtureSource.fingerprint,baselineFingerprint);
  const before=JSON.parse(await fs.readFile(beforePath));assert.equal(before.passed,true);assert.equal(before.sourceStart.fingerprint,baselineFingerprint);assert.equal(before.sourceFinish.fingerprint,baselineFingerprint);
  report.baseline={commit:baselineCommit,fingerprint:baselineFingerprint,report:beforePath,sha256:sha(await fs.readFile(beforePath))};
  const mutable=new Set(['src/landscape.js','src/build-info.js']),added=new Set(['src/ground-cover-volume.js']);
  for(const [name,digest]of Object.entries(before.sourceStart.hashes))if(!mutable.has(name))assert.equal(report.sourceStart.hashes[name],digest,'Unrelated runtime changed: '+name);
  for(const name of Object.keys(report.sourceStart.hashes))assert.ok(name in before.sourceStart.hashes||added.has(name),'Unexpected runtime addition: '+name);
  for(const name of added)assert.ok(report.sourceStart.hashes[name],'Missing expected cover module');
  report.checks.push('Only landscape integration, generated build metadata and the new cover module may differ; water materials and other baseline runtime bytes are preserved.');
  report.toolHashes={};for(const name of ['tests/ground-cover-volume-lifecycle.mjs','tests/helpers/browser-condition.mjs','tests/carrier-request-origin.mjs'])report.toolHashes[name]=sha(await fs.readFile(path.join(toolRoot,name)));
  const health=await(await fetch(new URL('/health',base))).json();assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,sha(root.replaceAll('\\','/').toLowerCase()));report.server=health;
  const sim=await import(pathToFileURL(path.join(fixtureRoot,'src/simulation.js')).href),state=sim.createGame('crawler','standard'),fixture=sim.serialize(state);
  report.fixture={sha256:sha(fixture),raw:JSON.parse(fixture),initialOnly:[]};assert.equal(report.fixture.sha256,before.visits[0].fixture.sha256);
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});report.browser=browser.version();
  context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',route=>{const url=route.request().url();if(classifyCarrierRequest(url,base.href)==='external'){report.remoteRequests.push(url);return route.abort();}return route.continue();});
  await context.addInitScript(fixture=>{localStorage.setItem('colossus-wake-save-v1',fixture);localStorage.setItem('colossus-quality-v1','high');localStorage.setItem('colossus-camera-mode','steady');},fixture);
  page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()}));
  const until=(fn,arg)=>waitForBrowserCondition(page,fn,arg,{timeoutMs:120000,pollingMs:75});
  await page.goto(new URL('/?test=1',base).href,{waitUntil:'domcontentloaded',timeout:120000});await until(()=>!!window.__colossus);await page.locator('#continue').click();
  async function settle(){await until(()=>{const g=window.__colossus.scene;let material;g.landscape.group.traverse(m=>{if(m.userData.groundCoverVolume)material=m.material;});const p=material&&g.renderer.properties.get(material).currentProgram;return g.environmentReady&&g.surfaceDiagnostics().pending===0&&Number.isFinite(p?.getUniforms?.()?.map?.uGroundCoverTime?.cache?.[0]);});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
  await settle();
  async function snapshot(label){
    const value=await page.evaluate(async()=>{
      const {scene:g,state:s}=window.__colossus,cover=[];g.landscape.group.traverse(m=>{if(m.userData.groundCoverVolume)cover.push(m);});
      const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(v=>v.toString(16).padStart(2,'0')).join('');
      const array=async a=>a?{itemSize:a.itemSize,count:a.count,version:a.version,sha256:await hash(a.array)}:null;
      const identities=[],geometries=new Map(),materials=new Map();
      for(const mesh of cover){
        if(!geometries.has(mesh.geometry.uuid)){const attributes={};for(const [name,a]of Object.entries(mesh.geometry.attributes))attributes[name]=await array(a);geometries.set(mesh.geometry.uuid,{uuid:mesh.geometry.uuid,attributes,index:await array(mesh.geometry.index)});}
        materials.set(mesh.material.uuid,mesh.material);
        identities.push({name:mesh.name,kind:mesh.userData.groundCoverVolume,uuid:mesh.uuid,geometry:mesh.geometry.uuid,material:mesh.material.uuid,matrix:await array(mesh.instanceMatrix),colour:await array(mesh.instanceColor),pickingTags:Object.fromEntries(['node','ground','slot','enemy'].filter(k=>mesh.userData[k]!==undefined).map(k=>[k,mesh.userData[k]]))});
      }
      const uniforms=[...materials.values()].map(m=>{const p=g.renderer.properties.get(m).currentProgram,u=p?.getUniforms?.()?.map;return{material:m.uuid,time:u?.uGroundCoverTime?.cache?.[0]??null,range:u?.uCoverRange?.cache?Array.from(u.uCoverRange.cache):null};});
      const T=await import('/vendor/three.module.js'),coverGroup=g.landscape.group.getObjectByName('Low-poly ground cover');
      const ray=new T.Raycaster(new T.Vector3(s.x,200,s.z),new T.Vector3(0,-1,0)),hits=ray.intersectObject(coverGroup,true);
      const water=g.landscape.water.geometry,waterAttributes={};for(const [name,a]of Object.entries(water.attributes))waterAttributes[name]={itemSize:a.itemSize,count:a.count,normalized:a.normalized,arrayType:a.array.constructor.name,sha256:await hash(a.array)};
      const gl=g.renderer.getContext();return{browserTime:performance.now(),state:{time:s.time,paused:s.paused,speed:s.speed,x:s.x,z:s.z,worldDamage:structuredClone(s.worldDamage)},quality:g.quality,stats:structuredClone(g.landscape.stats.groundCoverVolume),uniforms,identities,geometries:[...geometries.values()],counts:cover.map(m=>({name:m.name,count:m.count,visible:m.visible})),activeCount:cover.reduce((n,m)=>n+m.count,0),rayHits:hits.length,groupRaycastResult:coverGroup.raycast(ray,[]),meshRaycastResults:cover.map(m=>m.raycast(ray,[])),crushableSha256:await hash(new TextEncoder().encode(JSON.stringify(g.landscape.crushables))),waterGeometry:{attributes:waterAttributes,index:{count:water.index.count,sha256:await hash(water.index.array)},drawRange:{start:water.drawRange.start,count:Number.isFinite(water.drawRange.count)?water.drawRange.count:'Infinity'}},contextLost:gl.isContextLost(),glError:gl.getError(),shaderFailures:(g.renderer.info.programs||[]).filter(p=>p.diagnostics?.runnable===false).map(p=>p.name),surface:g.surfaceDiagnostics()};
    });
    assert.ok(value.identities.length>0);assert.equal(value.uniforms.length,1,'Cover should share one material');assert.equal(value.geometries.length,3,'Expected three shared shape masters');
    for(const u of value.uniforms){assert.ok(Number.isFinite(u.time),'Uploaded cover clock unavailable');assert.equal(u.range.length,2);}
    for(const m of value.identities)assert.deepEqual(m.pickingTags,{});assert.equal(value.rayHits,0);assert.equal(value.groupRaycastResult,false);assert.ok(value.meshRaycastResults.every(v=>v===false));
    assert.equal(value.contextLost,false);assert.equal(value.glError,0);assert.deepEqual(value.shaderFailures,[]);assert.deepEqual(value.surface.failures,[]);assert.equal(value.activeCount,value.stats.activeInstances);
    assert.deepEqual(value.waterGeometry,before.visits[0].worldStart.geometry);assert.equal(value.crushableSha256,before.visits[0].worldStart.crushableSha256);
    report.snapshots.push({label,...value});return value;
  }
  const playingA=await snapshot('high-playing-start');await page.waitForTimeout(1250);const playingB=await snapshot('high-playing-continued');
  assert.ok(playingB.uniforms[0].time-playingA.uniforms[0].time>.8);assert.ok(playingB.state.time-playingA.state.time>.8);
  report.checks.push('Uploaded new cover shader time advances during native play; water arrays and collision/destruction identities match baseline.');
  await page.locator('#pause').click();await until(()=>window.__colossus.state.paused);await page.waitForTimeout(100);const pausedA=await snapshot('high-paused-start');await page.waitForTimeout(1250);const pausedB=await snapshot('high-paused-continued');
  assert.equal(pausedA.state.time,pausedB.state.time);assert.equal(pausedA.uniforms[0].time,pausedB.uniforms[0].time);await page.screenshot({path:path.join(out,'paused.png')});
  await page.locator('#pause').click();await until(()=>!window.__colossus.state.paused);await page.waitForTimeout(1250);const resumed=await snapshot('high-resumed');assert.ok(resumed.uniforms[0].time-pausedB.uniforms[0].time>.8);
  report.checks.push('Native Pause freezes uploaded cover time; Resume advances it again without replacing geometry, materials or instance buffers.');
  await page.locator('#menu').click();await page.locator('[data-setting="quality"]').click();await until(()=>window.__colossus.scene.quality==='balanced');await settle();const balanced=await snapshot('balanced-menu');
  await page.locator('[data-setting="quality"]').click();await until(()=>window.__colossus.scene.quality==='performance');await settle();const performance=await snapshot('performance-menu');await page.screenshot({path:path.join(out,'performance.png')});
  await page.locator('[data-setting="quality"]').click();await until(()=>window.__colossus.scene.quality==='high');await settle();const restored=await snapshot('high-restored-menu');await page.screenshot({path:path.join(out,'high-restored.png')});
  assert.equal(playingA.quality,'high');assert.equal(performance.stats.quality,'retro');assert.ok(performance.activeCount>0&&performance.activeCount<balanced.activeCount&&balanced.activeCount<playingA.activeCount);
  for(const v of [playingA,balanced,performance,restored]){const budget=v.stats.qualityBudgets[v.stats.quality];assert.equal(v.activeCount,budget.instances);assert.equal(v.stats.activeTriangles,budget.triangles);assert.deepEqual(v.uniforms[0].range,[budget.fadeStart,budget.fadeEnd]);}
  assert.deepEqual(restored.counts,playingA.counts);assert.deepEqual(restored.uniforms[0].range,playingA.uniforms[0].range);
  report.checks.push('Actual menu cycles High→Balanced→Performance→High. Active counts and uploaded fade range follow declared budgets; High restores exact deterministic per-chunk counts.');
  await page.locator('[data-dialog-action="close"]').click();await until(()=>!window.__colossus.state.paused);await page.waitForTimeout(1250);const final=await snapshot('high-playing-after-menu');assert.ok(final.uniforms[0].time-restored.uniforms[0].time>.8);
  for(const v of report.snapshots){assert.deepEqual(v.identities,playingA.identities);assert.deepEqual(v.geometries,playingA.geometries);assert.equal(v.state.x,playingA.state.x);assert.equal(v.state.z,playingA.state.z);assert.equal(v.state.speed,1);assert.deepEqual(v.state.worldDamage,playingA.state.worldDamage);}
  report.checks.push('One shared material, three shared shape masters and every existing instance buffer retain identity/content/version across native time and the quality cycle. Decorative group/meshes decline raycasts and add no picking tags.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.remoteRequests,[]);assert.deepEqual(report.failedRequests,[]);report.checks.push('No runtime, shader, context or request errors.');report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{
  try{await context?.close();await browser?.close();report.cleanup={ownedBrowserClosed:true};}catch(error){report.cleanup={error:error.message};report.passed=false;process.exitCode=1;}
  report.sourceFinish=await source(root);report.sourceStable=report.sourceStart?.fingerprint===report.sourceFinish.fingerprint;if(!report.sourceStable){report.passed=false;process.exitCode=1;}
  report.finishedAt=new Date().toISOString();report.exitCode=report.passed?0:1;await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,checks:report.checks,sourceStable:report.sourceStable,report:path.join(out,'report.json'),failure:report.failure},null,2));
}
