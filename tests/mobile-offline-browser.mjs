import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import http from 'node:http';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildMobileRelease} from '../scripts/build-mobile-release.mjs';
import {deliveryBrowserOptions, browserGraphicsInfo} from '../scripts/browser-runtime.mjs';
import {classifyCarrierRequest} from './carrier-request-origin.mjs';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
// This test owns its server so it can prove offline reopening with that server
// stopped. It never writes a build ID into the PC working copy.
const output=process.env.GAME_RELEASE_DIR&&path.resolve(process.env.GAME_RELEASE_DIR);
const release=output?{output}:await buildMobileRelease({writeSourceBuildInfo:false,outputRoot:path.resolve(process.env.GAME_RELEASE_OUTPUT||'artifacts/mobile-offline-release')});
const descriptor=JSON.parse(await fs.readFile(path.join(release.output,'release.json'),'utf8'));
release.buildId=descriptor.buildId;
assert.equal(descriptor.app,'colossus-wake');assert.match(release.buildId,/^[a-f0-9]{20}$/);
// Opt-in coverage for the carrier asset pass. Existing delivery scenarios and
// deadlines are unchanged; this records actual manifest/cache bytes and rigs.
const requireCarrierAssets=process.env.CARRIER_ASSETS_REQUIRED==='1';
const carrierEvidence={enabled:requireCarrierAssets,manifest:[],phases:[]};
const requireMeshyTrees=process.env.MESHY_TREES_REQUIRED==='1';
const treeEvidence={enabled:requireMeshyTrees,manifest:[],phases:[]};
if(requireMeshyTrees){
 const sourceRoot=fileURLToPath(new URL('..',import.meta.url));
 for(const url of ['/assets/scenery/meshy-pilot/pine.glb','/assets/scenery/meshy-pilot/broadleaf.glb','/assets/scenery/meshy-pilot/pine-lods.glb','/assets/scenery/meshy-pilot/broadleaf-lods.glb','/src/meshy-pilot.js','/src/landscape.js']){
  const row=descriptor.files.find(file=>file.url===url);assert.ok(row,'Release omitted Meshy tree input '+url);
  const source=await fs.readFile(path.join(sourceRoot,url.slice(1))),emitted=await fs.readFile(path.join(release.output,url.slice(1)));
  assert.deepEqual(emitted,source,'Frozen release tree input differs from source '+url);
  assert.equal(row.sha256,createHash('sha256').update(source).digest('hex'));
  treeEvidence.manifest.push({...row});
 }
}
if(requireCarrierAssets){
 const sourceRoot=fileURLToPath(new URL('..',import.meta.url));
 for(const url of ['/assets/carriers/meshy/cyborg.glb','/assets/carriers/meshy/flesh.glb']){
  const row=descriptor.files.find(file=>file.url===url);assert.ok(row,'Release manifest omitted '+url);assert.equal(row.type,'model/gltf-binary');
  const source=await fs.readFile(path.join(sourceRoot,url.slice(1))),emitted=await fs.readFile(path.join(release.output,url.slice(1)));
  assert.deepEqual(emitted,source,'Frozen release has different carrier bytes: '+url);assert.equal(row.bytes,source.length);
  assert.equal(row.sha256,createHash('sha256').update(source).digest('hex'),'Release descriptor has wrong carrier hash: '+url);
  carrierEvidence.manifest.push({...row});
 }
 carrierEvidence.requiredModules=['/src/impact-anchor.js','/src/meshy-carriers.js','/src/meshy-cyborg.js','/src/meshy-monster.js','/src/meshy-monster-city.js'];
 for(const url of carrierEvidence.requiredModules)assert.ok(descriptor.files.some(file=>file.url===url&&file.bytes>0),'Release manifest omitted carrier module '+url);
}
const files=new Map(descriptor.files.map(file=>[file.url,file.type]));files.set('/sw.js','text/javascript');files.set('/release.json','application/json');
const requests=[];
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=url.pathname==='/'?'/index.html':url.pathname;requests.push(file);
 if(file==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({testNetworkOnly:true}));return;}
 if(!files.has(file)){res.writeHead(404);res.end();return;}
 try{const bytes=await fs.readFile(path.join(release.output,file.slice(1)));res.writeHead(200,{'Content-Type':files.get(file),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);}catch{res.writeHead(500);res.end();}
});
const port=Number(process.env.GAME_TEST_PORT||0);assert.ok(Number.isInteger(port)&&port>=0&&port<=65535,'GAME_TEST_PORT must be a valid loopback port');
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
const base=`http://127.0.0.1:${server.address().port}`,out=process.env.OUTPUT_DIR||process.env.GAME_TEST_OUTPUT||'artifacts/mobile-offline';await fs.mkdir(out,{recursive:true});
const browser=await playwright.chromium.launch({channel:'chrome',...deliveryBrowserOptions()});
const graphics=await browserGraphicsInfo(browser);
const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,isMobile:true,deviceScaleFactor:1});
let page=await context.newPage();const errors=[],checks=[],remote=[],failedRequests=[],localBlobRequests=[];
const observe=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),location:m.location()});});page.on('request',r=>{const kind=classifyCarrierRequest(r.url(),base);if(kind==='external')remote.push(r.url());else if(kind==='same-origin-blob')localBlobRequests.push(r.url());});page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));};observe(page);
// Await the evaluated Boolean in Node. An async waitForFunction predicate can
// otherwise be accepted as a truthy Promise by the pinned browser-test runtime.
async function waitForPageBoolean(target,predicate,argument,timeout=120000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){
  let timer;
  try{
   const value=await Promise.race([target.evaluate(predicate,argument),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timed out waiting for the verified offline game state.')),Math.max(1,deadline-Date.now()));})]);
   if(value===true)return;
  }catch(error){
   if(!/Execution context was destroyed|Cannot find context|frame was detached/i.test(error.message))throw error;
   // First installation intentionally reloads the title into its verified copy.
  }finally{clearTimeout(timer);}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw new Error('Timed out waiting for the verified offline game state.');
}
async function verifyCarrierAssets(phase,{offline=false}={}){
 if(!requireCarrierAssets)return;
 const actual=await page.evaluate(async expected=>{
  const status=(await import('/src/meshy-carriers.js')).meshyCarriersStatus(),g=window.__colossus.scene;
  const actors=[g.city,...g.enemyCities].filter(actor=>actor.meshyCarrier).map(actor=>({kind:actor.meshyCarrier.kind,
   meshes:actor.meshyCarrier.renderMeshes.map(mesh=>({skinned:mesh.isSkinnedMesh===true,bones:mesh.skeleton?.bones.length??0,
    inScene:g.scene.getObjectByProperty('uuid',mesh.uuid)===mesh,finite:mesh.matrixWorld.elements.every(Number.isFinite)}))}));
  const completeCaches=[];
  for(const name of await caches.keys()){
   if(name!=='colossus-wake-release-'+expected&&!name.startsWith('colossus-wake-release-'+expected+'-repair-'))continue;
   const cache=await caches.open(name),marker=await cache.match('/__colossus_cache_complete__');if(!marker)continue;
   const descriptor=await marker.json();if(descriptor.buildId!==expected)continue;
   const glbs=[];
   for(const url of ['/assets/carriers/meshy/cyborg.glb','/assets/carriers/meshy/flesh.glb']){
    const response=await cache.match(url);if(!response){glbs.push({url,missing:true});continue;}
    const bytes=await response.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
    glbs.push({url,bytes:bytes.byteLength,sha256:[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join(''),type:response.headers.get('content-type')});
   }
   completeCaches.push({name,buildId:descriptor.buildId,glbs});
  }
  return{online:navigator.onLine,status,actors,completeCaches};
 },release.buildId);
 carrierEvidence.phases.push({phase,checkedAt:new Date().toISOString(),...actual});
 if(offline)assert.equal(actual.online,false,'Carrier reopen check must run with browser networking offline');
 assert.equal(actual.status.state,'ready');assert.deepEqual(actual.status.assets.map(asset=>asset.kind).sort(),['cyborg','flesh']);
 assert.ok(actual.status.assets.every(asset=>asset.state==='ready'&&asset.error===null),'Imported carrier failed and used a fallback');
 assert.deepEqual([...new Set(actual.actors.map(actor=>actor.kind))].sort(),['cyborg','flesh'],'Both actual imported carrier identities are required');
 assert.ok(actual.actors.every(actor=>actor.meshes.length===1&&actor.meshes.every(mesh=>mesh.skinned&&mesh.inScene&&mesh.finite&&mesh.bones===(actor.kind==='cyborg'?28:66))),'Imported rig missing or invalid');
 assert.ok(actual.completeCaches.length>0,'No complete cache exists for the actual release build');
 for(const cache of actual.completeCaches){
  assert.equal(cache.glbs.length,2);for(const expected of carrierEvidence.manifest){const cached=cache.glbs.find(file=>file.url===expected.url);assert.ok(cached&&!cached.missing,'Cached carrier missing: '+expected.url);for(const key of ['bytes','sha256','type'])assert.equal(cached[key],expected[key],phase+': cached carrier '+key+' mismatch');}
 }
 checks.push(phase+': both GLBs match source and manifest byte hashes in the installed cache; both actual imported rigs are ready with valid scene-owned meshes');
}
async function verifyMeshyTrees(phase){
 if(!requireMeshyTrees)return;
 const actual=await page.evaluate(async expected=>{
  const status=(await import('/src/meshy-pilot.js')).meshyPilotStatus(),scene=window.__colossus.scene,coverage=structuredClone(scene.landscape.stats.meshyTreeCoverage),meshes=[];
  scene.scene.traverse(mesh=>{if(mesh.userData.meshyTreeCoverage)meshes.push({name:mesh.name,kind:mesh.userData.meshyTreeCoverage,count:mesh.count,finite:mesh.matrixWorld.elements.every(Number.isFinite)});});
  const completeCaches=[];
  for(const name of await caches.keys()){
   if(name!=='colossus-wake-release-'+expected.build&&!name.startsWith('colossus-wake-release-'+expected.build+'-repair-'))continue;
   const cache=await caches.open(name),marker=await cache.match('/__colossus_cache_complete__');
   if(!marker||(await marker.json()).buildId!==expected.build)continue;
   const entries=[];
   for(const file of expected.files){
    const response=await cache.match(file.url);if(!response){entries.push({url:file.url,missing:true});continue;}
    const bytes=await response.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',bytes);
    entries.push({url:file.url,bytes:bytes.byteLength,sha256:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),type:response.headers.get('content-type')});
   }
   completeCaches.push({name,entries});
  }
  return{status,coverage,meshes,completeCaches};
 },{build:release.buildId,files:treeEvidence.manifest});
 assert.equal(actual.status.state,'ready');assert.equal(actual.coverage.near.state,'ready');assert.equal(actual.coverage.distant.state,'ready');
 assert.ok(actual.coverage.near.count>300&&actual.coverage.distant.count>500,'World Meshy tree coverage is incomplete');
 assert.ok(actual.meshes.length>0&&actual.meshes.every(mesh=>mesh.count>0&&mesh.finite));
 assert.ok(actual.completeCaches.length>0,'No installed exact-build tree cache');
 for(const cache of actual.completeCaches)for(const file of treeEvidence.manifest){const cached=cache.entries.find(row=>row.url===file.url);assert.ok(cached&&!cached.missing,'Cached Meshy tree input missing: '+file.url);for(const key of ['bytes','sha256','type'])assert.equal(cached[key],file[key],phase+': tree cache '+key);}
 treeEvidence.phases.push({phase,...actual});checks.push(phase+': original Meshy atlases, derived LODs and tree runtime match the installed cache; near, distant and scene-owned imports are ready');
}
try{
 await page.goto(`${base}/?test=1`);
 // Finish the production cold-title install/reload before starting a save, so
 // an intentional first-install navigation cannot race the Begin tap.
 await waitForPageBoolean(page,async expected=>{
  if(!window.__colossus||!navigator.serviceWorker.controller)return false;
  const status=(await import('/src/offline.js')).getOfflineStatus();
  return status.canPlayOffline&&status.installedBuildId===expected&&!status.needsReopen;
 },release.buildId);
 await page.locator('#begin').tap();await page.locator('#menu').tap();await page.locator('[data-dialog-action="save"]').tap();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('colossus-wake-save-v1')));
 await page.locator('[data-dialog-action="playtest"]').tap();await page.locator('#offline-prepare').tap();
 await waitForPageBoolean(page,async()=>(await import('/src/offline.js')).getOfflineStatus().canPlayOffline);
 await page.evaluate(()=>navigator.serviceWorker.ready);
 const ready=await page.evaluate(async()=>({...await (await import('/src/offline.js')).refreshOfflineStatus(),runtimeBuild:(await import('/src/build-info.js')).BUILD_ID}));
 assert.equal(ready.installedBuildId,release.buildId);assert.equal(ready.runtimeBuild,release.buildId);assert.equal(typeof ready.needsReopen,'boolean');checks.push('Automatic/manual offline preparation verifies the complete runtime and matching build identity');
 await verifyCarrierAssets('installation-ready');
 await verifyMeshyTrees('installation-ready');
 assert.equal((await page.evaluate(async()=>await (await fetch('/health')).json())).testNetworkOnly,true);checks.push('Health endpoint remains network-only');
 await page.screenshot({path:`${out}/installation-ready.png`});
 await page.close();await new Promise(resolve=>server.close(resolve));await context.setOffline(true);
 page=await context.newPage();observe(page);await page.goto(`${base}/?test=1`);await page.waitForFunction(()=>!!window.__colossus,{},{timeout:90000});
 assert.ok(await page.evaluate(()=>!!navigator.serviceWorker.controller));await page.locator('#continue').tap();await page.waitForTimeout(1000);
 assert.equal(await page.evaluate(()=>window.__colossus.state.variant),saved.variant);assert.ok(await page.evaluate(()=>window.__colossus.state.time)>=saved.time);checks.push('With server stopped and network offline, reopened game resumes the saved expedition');
 await verifyCarrierAssets('server-stopped-offline-reopen',{offline:true});
 await verifyMeshyTrees('server-stopped-offline-reopen');
 const position=await page.evaluate(()=>({x:window.__colossus.state.x,z:window.__colossus.state.z}));
 const session=await context.newCDPSession(page),pad=await page.locator('[data-move="up"]').boundingBox();
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:pad.x+22,y:pad.y+22}]});await page.waitForTimeout(1200);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.ok(await page.evaluate(p=>Math.hypot(window.__colossus.state.x-p.x,window.__colossus.state.z-p.z)>1,position));checks.push('Actual offline game renders and responds to touch movement');
 await page.screenshot({path:`${out}/offline-gameplay.png`});
 await page.locator('#menu').tap();await page.locator('[data-dialog-action="playtest"]').tap();await page.waitForFunction(()=>document.getElementById('offline-status')?.textContent.includes('Offline — using saved build'));
 assert.equal(await page.locator('#playtest-build').textContent(),release.buildId);checks.push('Offline panel discovers installed build without network access');
 // Emulate partial storage eviction: the repair screen must not depend on the
 // boot module that was lost, and must preserve the expedition through repair.
 await page.evaluate(async()=>{for(const key of await caches.keys())if(key.startsWith('colossus-wake-release-'))await(await caches.open(key)).delete('/src/main.js');});
 await page.close();page=await context.newPage();observe(page);await page.goto(`${base}/`);await page.locator('#recovery-repair').waitFor();
 const recoverySave=await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1'));
 assert.match(await page.locator('#recovery-status').textContent(),/Reconnect/);checks.push('Missing boot module opens an independent repair screen while offline');
 await new Promise(resolve=>server.listen(Number(new URL(base).port),'127.0.0.1',resolve));await context.setOffline(false);await page.locator('#recovery-repair').tap();
 await page.locator('#begin').waitFor({timeout:120000});
 await page.locator('#loading').waitFor({state:'hidden',timeout:120000});
 assert.equal(await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1')),recoverySave);
 assert.ok(context.serviceWorkers().every(worker=>new URL(worker.url()).pathname==='/sw.js'&&!new URL(worker.url()).search));
 await page.goto(`${base}/?test=1`);await page.waitForFunction(()=>!!window.__colossus,{},{timeout:90000});await page.locator('#continue').tap();
 assert.equal(await page.evaluate(()=>window.__colossus.state.variant),saved.variant);checks.push('Explicit full-cache repair restores the game without deleting its save');
 await verifyCarrierAssets('after-explicit-cache-repair');
 await verifyMeshyTrees('after-explicit-cache-repair');
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);checks.push('No browser runtime errors or third-party requests');
 await fs.writeFile(`${out}/results.json`,JSON.stringify({release,browser:browser.version(),graphics,checks,errors,remote,localBlobRequests,...(requireCarrierAssets?{carrierEvidence}:{}),...(requireMeshyTrees?{treeEvidence}:{}),limitation:'Isolated desktop Chromium with touch emulation; physical iPad/iPhone and Safari installation not tested.'},null,2));console.log(JSON.stringify({release,graphics,checks,errors,remote,localBlobRequests},null,2));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.error(JSON.stringify({release,checks,errors,failedRequests,remote,localBlobRequests,...(requireCarrierAssets?{carrierEvidence}:{}),...(requireMeshyTrees?{treeEvidence}:{}),failure:error.stack},null,2));process.exitCode=1;}finally{server.close();await browser.close();}
