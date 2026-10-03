// Normal-speed touch workflow evidence, using only installed browser/encoder tools.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright');}catch{pw=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:4192',out=path.resolve(process.env.OUTPUT_DIR||'artifacts/iphone-pass1/touch-recording');await fs.mkdir(out,{recursive:true});
const report={startedAt:new Date().toISOString(),device:'Desktop Chrome touch emulation; NOT physical iPhone',viewport:[844,390],quality:'performance',audio:'Silent browser recording',timing:'Native RAF and actual wall time. No time/speed changes. Loading/title are included before game-ready time zero.',fixture:'One explicitly logged carrier-position jump before engaging a rival. No resources, HP or combat values changed.',timeline:[],errors:[],remote:[]};
const browser=await pw.chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});report.browser=browser.version();
const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,hasTouch:true,isMobile:true,recordVideo:{dir:out,size:{width:844,height:390}}});
await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===base||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
await context.addInitScript(()=>{localStorage.setItem('colossus-quality-v1','performance');localStorage.setItem('colossus-camera-mode','steady');});
const page=await context.newPage(),video=page.video();page.setDefaultTimeout(90000);page.on('pageerror',e=>report.errors.push(e.message));
const cdp=await context.newCDPSession(page),send=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,id)=>({id,...p}))});
let origin;const mark=(event,fixture=false)=>report.timeline.push({secondsSinceGameReady:(Date.now()-origin)/1000,event,fixture});
try{
 await page.goto(base+'/?test=1',{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);origin=Date.now();
 report.build=await page.evaluate(async()=>(await import('/src/build-info.js')).BUILD_ID);
 await page.locator('[data-faction="crawler"]').tap();await page.locator('[data-variant="drill"]').tap();await page.locator('#begin').tap();mark('Fresh drill-crawler expedition');
 const up=await page.locator('[data-move="up"]').boundingBox();await send('touchStart',[{x:up.x+22,y:up.y+22}]);await page.waitForTimeout(1800);await send('touchEnd');mark('Held touch movement for 1.8 seconds');
 await send('touchStart',[{x:310,y:165}]);for(let i=1;i<=8;i++)await send('touchMove',[{x:310+i*7,y:165+i*2}]);await send('touchEnd');
 await send('touchStart',[{x:280,y:165},{x:410,y:165}]);await send('touchMove',[{x:255,y:165},{x:435,y:165}]);await send('touchEnd');await page.waitForTimeout(900);mark('One-finger orbit and two-finger pinch');
 await page.locator('[data-mobile-panel="build"]').tap();await page.locator('[data-building="sawmill"]').tap();await page.locator('[data-slot="0"]').tap();mark('Purchased Timber guild through touch controls');
 await page.waitForFunction(()=>window.__colossus.state.buildings[0].remaining===0,null,{timeout:45000});assert.equal(await page.evaluate(()=>window.__colossus.state.buildings[0].remaining),0);mark('Construction completed with real waiting');
 await page.locator('[data-upgrade="0"]').tap();await page.waitForTimeout(1200);mark('Selected and ordered district upgrade');
 await page.locator('.left-stack [data-close-panel]').tap();
 await page.locator('#mobile-menu').tap();await page.locator('[data-setting="quality"]').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);mark('Opened presentation settings without changing preset');
 await page.locator('[data-dialog-action="playtest"]').tap();await page.locator('#sample-start').tap();await page.locator('[data-dialog-action="close"]').tap();await page.waitForTimeout(1500);mark('Armed opt-in sample then returned to normal play');
 await page.evaluate(()=>{const a=window.__colossus,e=a.state.enemies[0];a.state.x=e.x-32;a.state.z=e.z;a.state.target=null;a.scene.snapCamera=true;a.advance(0);});mark('FIXTURE: placed carrier near first rival to omit travel downtime',true);
 await page.locator('[data-mobile-panel="map"]').tap();const box=await page.locator('#minimap').boundingBox(),e=await page.evaluate(()=>window.__colossus.state.enemies[0]);await page.touchscreen.tap(box.x+(e.x+180)/360*box.width,box.y+(e.z+180)/360*box.height);
 await page.locator('[data-engage]').tap();await page.locator('[data-command="approach"]').tap();await page.waitForTimeout(6500);mark('Engaged and approached through actual touch combat controls');await page.locator('#withdraw').tap();await page.waitForTimeout(700);mark('Withdrew to management');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;}finally{await context.close();const from=await video.path(),to=path.join(out,'iphone-touch-workflow-silent.webm');if(from!==to)await fs.rename(from,to);report.video=path.basename(to);await browser.close();report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'recording-report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
