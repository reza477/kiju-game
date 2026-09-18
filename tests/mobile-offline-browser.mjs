import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import http from 'node:http';
import {homedir} from 'node:os';
import path from 'node:path';
import {buildMobileRelease} from '../scripts/build-mobile-release.mjs';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const release=await buildMobileRelease(),descriptor=JSON.parse(await fs.readFile(path.join(release.output,'release.json'),'utf8'));
const files=new Map(descriptor.files.map(file=>[file.url,file.type]));files.set('/sw.js','text/javascript');files.set('/release.json','application/json');
const requests=[];
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=url.pathname==='/'?'/index.html':url.pathname;requests.push(file);
 if(file==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({testNetworkOnly:true}));return;}
 if(!files.has(file)){res.writeHead(404);res.end();return;}
 try{const bytes=await fs.readFile(path.join(release.output,file.slice(1)));res.writeHead(200,{'Content-Type':files.get(file),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);}catch{res.writeHead(500);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,out='artifacts/mobile-offline';await fs.mkdir(out,{recursive:true});
const browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,isMobile:true,deviceScaleFactor:1});
let page=await context.newPage();const errors=[],checks=[],remote=[],failedRequests=[];
const observe=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),location:m.location()});});page.on('request',r=>{if(!r.url().startsWith(base))remote.push(r.url());});page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));};observe(page);
try{
 await page.goto(`${base}/?test=1`);await page.waitForFunction(()=>!!window.__colossus,{},{timeout:90000});await page.locator('#begin').tap();await page.locator('#save').tap();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('colossus-wake-save-v1')));
 await page.locator('#menu').tap();await page.locator('[data-dialog-action="playtest"]').tap();await page.locator('#offline-prepare').tap();
 await page.waitForFunction(()=>document.getElementById('offline-status')?.textContent.includes('The complete game is stored'),{},{timeout:120000});
 await page.evaluate(()=>navigator.serviceWorker.ready);
 const ready=await page.evaluate(async()=>({...await (await import('/src/offline.js')).refreshOfflineStatus(),pcBuild:(await import('/src/build-info.js')).BUILD_ID}));
 assert.equal(ready.installedBuildId,release.buildId);assert.equal(ready.pcBuild,release.buildId);assert.equal(ready.needsReopen,true);checks.push('UI downloads and verifies full release, with the same build ID as PC');
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
 await page.locator('#menu').tap();await page.locator('[data-dialog-action="playtest"]').tap();await page.waitForFunction(()=>document.getElementById('offline-status')?.textContent.includes('on this device for offline play'));
 assert.equal(await page.locator('#playtest-build').textContent(),release.buildId);checks.push('Offline panel discovers installed build without network access');
 // Emulate partial storage eviction: the repair screen must not depend on the
 // boot module that was lost, and must preserve the expedition through repair.
 await page.evaluate(async()=>{for(const key of await caches.keys())if(key.startsWith('colossus-wake-release-'))await(await caches.open(key)).delete('/src/main.js');});
 await page.close();page=await context.newPage();observe(page);await page.goto(`${base}/`);await page.locator('#recovery-repair').waitFor();
 const recoverySave=await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1'));
 assert.match(await page.locator('#recovery-status').textContent(),/Reconnect/);checks.push('Missing boot module opens an independent repair screen while offline');
 await new Promise(resolve=>server.listen(Number(new URL(base).port),'127.0.0.1',resolve));await context.setOffline(false);await page.locator('#recovery-repair').tap();
 await page.waitForFunction(()=>document.getElementById('recovery-status')?.textContent.includes('The complete game is downloaded'),{},{timeout:120000});
 assert.equal(await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1')),recoverySave);
 await page.close();
 // Let the waiting worker naturally activate with zero game clients.
 const repairWorker=context.serviceWorkers().find(worker=>worker.url().includes('repair='));assert.ok(repairWorker);
 await repairWorker.evaluate(()=>new Promise(resolve=>{const check=()=>self.registration.active?.scriptURL.includes('repair=')?resolve():setTimeout(check,50);check();}));
 page=await context.newPage();observe(page);await page.goto(`${base}/?test=1`);await page.waitForFunction(()=>!!window.__colossus,{},{timeout:90000});await page.locator('#continue').tap();
 assert.equal(await page.evaluate(()=>window.__colossus.state.variant),saved.variant);checks.push('Explicit full-cache repair restores the game without deleting its save');
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);checks.push('No browser runtime errors or third-party requests');
 await fs.writeFile(`${out}/results.json`,JSON.stringify({release,checks,errors,remote,limitation:'Isolated desktop Chromium with touch emulation; physical iPad/iPhone and Safari installation not tested.'},null,2));console.log(JSON.stringify({release,checks,errors,remote},null,2));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.error(JSON.stringify({release,checks,errors,failedRequests,failure:error.stack},null,2));process.exitCode=1;}finally{server.close();await browser.close();}
