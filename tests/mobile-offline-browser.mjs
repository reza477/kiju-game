import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import http from 'node:http';
import {homedir} from 'node:os';
import path from 'node:path';
import {buildMobileRelease} from '../scripts/build-mobile-release.mjs';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
// This test owns its server so it can prove offline reopening with that server
// stopped. It never writes a build ID into the PC working copy.
const output=process.env.GAME_RELEASE_DIR&&path.resolve(process.env.GAME_RELEASE_DIR);
const release=output?{output}:await buildMobileRelease({writeSourceBuildInfo:false,outputRoot:path.resolve(process.env.GAME_RELEASE_OUTPUT||'artifacts/mobile-offline-release')});
const descriptor=JSON.parse(await fs.readFile(path.join(release.output,'release.json'),'utf8'));
release.buildId=descriptor.buildId;
assert.equal(descriptor.app,'colossus-wake');assert.match(release.buildId,/^[a-f0-9]{20}$/);
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
const browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,isMobile:true,deviceScaleFactor:1});
let page=await context.newPage();const errors=[],checks=[],remote=[],failedRequests=[];
const observe=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),location:m.location()});});page.on('request',r=>{if(!r.url().startsWith(base))remote.push(r.url());});page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));};observe(page);
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
 assert.equal((await page.evaluate(async()=>await (await fetch('/health')).json())).testNetworkOnly,true);checks.push('Health endpoint remains network-only');
 await page.screenshot({path:`${out}/installation-ready.png`});
 await page.close();await new Promise(resolve=>server.close(resolve));await context.setOffline(true);
 page=await context.newPage();observe(page);await page.goto(`${base}/?test=1`);await page.waitForFunction(()=>!!window.__colossus,{},{timeout:90000});
 assert.ok(await page.evaluate(()=>!!navigator.serviceWorker.controller));await page.locator('#continue').tap();await page.waitForTimeout(1000);
 assert.equal(await page.evaluate(()=>window.__colossus.state.variant),saved.variant);assert.ok(await page.evaluate(()=>window.__colossus.state.time)>=saved.time);checks.push('With server stopped and network offline, reopened game resumes the saved expedition');
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
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);checks.push('No browser runtime errors or third-party requests');
 await fs.writeFile(`${out}/results.json`,JSON.stringify({release,checks,errors,remote,limitation:'Isolated desktop Chromium with touch emulation; physical iPad/iPhone and Safari installation not tested.'},null,2));console.log(JSON.stringify({release,checks,errors,remote},null,2));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.error(JSON.stringify({release,checks,errors,failedRequests,failure:error.stack},null,2));process.exitCode=1;}finally{server.close();await browser.close();}
