// Focused native Continue/save/reload regression for the independently observed
// first-pose terrain failure. This tool never invokes a pose or render method.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createGame,serialize,deserialize} from '../src/simulation.js';

const root=fileURLToPath(new URL('..',import.meta.url)),out=path.resolve(root,process.argv[2]??'artifacts/nov10-improvements/diagnostics/reload-browser');
const relative=path.relative(path.join(root,'artifacts'),out);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
await fs.mkdir(out,{recursive:false});
const base=process.env.GAME_TEST_URL??'http://127.0.0.1:4230/',sha=v=>createHash('sha256').update(v).digest('hex');
const report={startedAt:new Date().toISOString(),method:'Observed failed saved location/heading with real Continue, pause, Save and reload controls; original screenshots; native clock/rendering only.',visits:[],passed:false};
const write=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');let browser,context;
try{
 const health=await(await fetch(new URL('/health',base))).json();assert.equal(health.rootId,sha(root.replaceAll('\\','/').replace(/\/$/,'').toLowerCase()));report.server=health;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});report.browser={version:browser.version(),channel:'chrome',headless:true};
 for(const time of[8.530299999999984,0]){
  const fixture=createGame('kaiju','flesh');Object.assign(fixture,{time,x:-33.13126537296777,z:43.09271052218807,angle:-.7915926535897931,paused:true});fixture.buildings[0]={type:'sawmill',level:1,remaining:0};fixture.towerOrder.push(0);
  const saved=serialize(fixture);assert.ok(deserialize(saved));const visit={time,fixtureSha256:sha(saved),fixture:JSON.parse(saved),errors:[],failedRequests:[],snapshots:[]};report.visits.push(visit);await write();
  context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.addInitScript(saved=>{if(!sessionStorage.getItem('harness-reload-fixture')){localStorage.setItem('colossus-wake-save-v1',saved);sessionStorage.setItem('harness-reload-fixture','1');}localStorage.setItem('colossus-quality-v1','high');localStorage.setItem('colossus-camera-mode','steady');},saved);
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>visit.errors.push({message:error.message,stack:error.stack}));page.on('console',message=>{if(message.type()==='error')visit.errors.push({message:message.text(),source:'console'});});page.on('requestfailed',request=>visit.failedRequests.push({url:request.url(),failure:request.failure()}));
  const snapshot=async label=>{
   const row=await page.evaluate(()=>{const {state:s,scene}=window.__colossus,c=scene.city;return{time:s.time,faction:s.faction,variant:s.variant,x:s.x,z:s.z,angle:s.angle,buildings:s.buildings,towerOrder:s.towerOrder,renderedVariant:c.variant,renderedFaction:c.faction,sceneUsesLoadedState:scene.state===s,activeActor:c.root.parent===scene.scene,preview:scene.preview,nativeBody:c.meshyCarrier?.kind,harnessFitted:c.meshyCarrier?.saddle?.harness?.fitted,origin:c.meshyCarrier?.saddle?.harness?.bands.map(b=>b.fitMetadata),rootPosition:c.root.position.toArray(),cargoOffset:c.cargoOffsetY,render:{...scene.renderer.info.render},hud:!document.getElementById('hud').classList.contains('hidden'),contextLost:scene.renderer.getContext().isContextLost()};});
   visit.snapshots.push({label,...row});await write();
   assert.equal(row.variant,'flesh');assert.equal(row.renderedVariant,row.variant,'Loaded save and rendered actor must agree');assert.equal(row.renderedFaction,row.faction);assert.equal(row.nativeBody,'flesh');assert.equal(row.sceneUsesLoadedState,true);assert.equal(row.activeActor,true);assert.equal(row.preview,false);assert.equal(row.harnessFitted,true);assert.equal(row.hud,true);assert.equal(row.contextLost,false);assert.ok(row.render.calls>0&&row.render.triangles>0);assert.ok(Math.abs(row.rootPosition[0]-row.x)<1e-8&&Math.abs(row.rootPosition[2]-row.z)<1e-8);assert.deepEqual(visit.errors,[]);return row;
  };
  const ready=async()=>{await page.waitForFunction(()=>!!window.__colossus);await page.locator('#continue').click();await page.waitForFunction(()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);await page.waitForTimeout(1000);};
  await page.goto(new URL('/?test=1',base).href,{waitUntil:'domcontentloaded'});await ready();const first=await snapshot('initial-native-continue');
  assert.equal(first.x,fixture.x);assert.equal(first.z,fixture.z);assert.equal(first.angle,fixture.angle);assert.deepEqual(first.buildings,fixture.buildings);assert.deepEqual(first.towerOrder,fixture.towerOrder);
  await page.screenshot({path:path.join(out,`first-${time===0?'zero':'saved'}-clock.png`)});
  await page.keyboard.press('p');await page.waitForFunction(()=>window.__colossus.state.paused);await page.locator('#save').click();const persisted=JSON.parse(await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1')));
  await page.reload({waitUntil:'domcontentloaded'});await ready();const again=await snapshot('native-save-reload-continue');
  for(const key of['x','z','angle','faction','variant'])assert.equal(again[key],persisted[key]);assert.deepEqual(again.buildings,persisted.buildings);assert.deepEqual(again.towerOrder,persisted.towerOrder);
  await page.waitForTimeout(1200);const continued=await snapshot('continued-native-animation');assert.ok(continued.time>again.time);await page.screenshot({path:path.join(out,`reloaded-${time===0?'zero':'saved'}-clock.png`)});
  assert.deepEqual(visit.failedRequests,[]);visit.passed=true;await context.close();context=null;await write();
 }
 report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}
finally{await context?.close();await browser?.close();report.finishedAt=new Date().toISOString();report.exitCode=process.exitCode||0;await write();console.log(JSON.stringify({report:path.join(out,'report.json'),passed:report.passed,exitCode:report.exitCode}));}
