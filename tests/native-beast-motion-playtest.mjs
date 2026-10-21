// Supplemental neutral capture: valid pre-populated save fixtures, then native
// movement/combat controls. No browser game-state writes or manual time pumping.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import * as sim from '../src/simulation.js';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';

const root=fileURLToPath(new URL('..',import.meta.url)),out=path.resolve(process.env.OUTPUT_DIR||'artifacts/beast-integration/native-active-motion');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4224/'),scenario=process.env.SCENARIO||'populated';
const requestedLight=process.env.LIGHT||'day',fixtureOnly=process.env.FIXTURE_ONLY==='1';
const fullCity=scenario==='populated'||process.env.FULL_CITY==='1';
const combatTarget=process.env.COMBAT_TARGET||'standard';
assert.ok(['standard','drill','flesh','cyborg','horizontal','vertical'].includes(combatTarget));
assert.ok(['127.0.0.1','localhost'].includes(base.hostname)&&!['4178','4214'].includes(base.port));
assert.ok(['populated','combat'].includes(scenario));
assert.ok(['day','dusk','night'].includes(requestedLight));
const sha=b=>createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
async function source(){
 const names=[...new Set([...git('ls-files','src','assets','vendor','index.html','package.json','package-lock.json').split('\n'),...git('ls-files','--others','--exclude-standard','src','assets','vendor').split('\n')])].filter(Boolean).sort(),hashes={};
 for(const name of names)hashes[name]=sha(await fs.readFile(path.join(root,name)));
 return{commit:git('rev-parse','HEAD'),workingTree:git('status','--short'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
await fs.mkdir(out,{recursive:true});assert.deepEqual(await fs.readdir(out),[],'Preserve original evidence; use a new folder');
const report={scenario,fullCity,combatTarget,requestedLight,startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),environment:Object.fromEntries(['OUTPUT_DIR','GAME_TEST_URL','SCENARIO','FULL_CITY','COMBAT_TARGET','LIGHT','HEADLESS','FIXTURE_ONLY','EXPECTED_RUNTIME_SHA'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))},method:'ACTIVE SOURCE: the local server serves its actual files without response substitution. A valid isolated saved fixture is prepared in Node before startup. After Continue, only ordinary native keyboard/mouse/UI inputs change game state; browser evaluations only observe. Original normal-HUD PNGs and a native-time WebM are retained.',limitations:['Populated fixture proves rendering and motion at capacity; it does not claim all20 districts were constructed through UI in this run.','Combat fixture starts at a valid saved battle entrance. Approach and attack are ordinary game controls, not scripted simulation calls.','Windows Chrome desktop evidence, not physical-device validation.','Automated observations do not award an art score or clear release blockers. Known source self-crossing remains an explicit separate technical failure.','Short combat PNG windows may miss a phase because screenshots cost time; original WebM and read-only samples retain native motion.'],actions:[],images:[],errors:[],failedRequests:[],remoteRequests:[],warnings:[],passed:false};
report.adaptedFrom={path:'artifacts/beast-integration/quadruped-native-preview-v3.mjs',sha256:'570edc89c3ecc08dcf6c04d884092ac02618adbe6fc3153d57d5273ba219045b'};
report.observationEligible=false;report.artReviewRequired=true;
report.servedResponses=[];report.servedIdentityErrors=[];
const pendingResponses=[];
async function settleResponseChecks(){
 let timer;try{await Promise.race([(async()=>{let done=0;while(done<pendingResponses.length){const batch=pendingResponses.slice(done);done+=batch.length;await Promise.all(batch);}})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Response-byte verification exceeded its30-second deadline')),30000);})]);}finally{clearTimeout(timer);}
}
const write=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');let browser,context,page;
try{
 report.sourceStart=await source();report.toolSha256=sha(await fs.readFile(fileURLToPath(import.meta.url)));
 const state=sim.createGame('kaiju','flesh');
 if(fullCity){
  state.resources={wood:9000,iron:9000,food:9000};assert.ok(sim.expandRing(state).ok);for(let i=0;i<48;i++)sim.tick(state,.25);assert.equal(state.rings,2);
  // Use the production construction and upgrade functions to prepare a valid
  // completed city; this is fixture setup, not evidence of native UI building.
  for(let slot=0;slot<20;slot++){
   if(!state.buildings[slot]){assert.ok(sim.build(state,slot%4===0?'farm':'housing',slot).ok);for(let i=0;i<120&&state.buildings[slot].remaining>0;i++)sim.tick(state,.25);assert.equal(state.buildings[slot].remaining,0);}
   if(slot%3===0)for(let level=state.buildings[slot].level;level<3;level++){assert.ok(sim.upgrade(state,slot).ok);for(let i=0;i<40;i++)sim.tick(state,.25);}
  }
 }
 if(scenario==='combat'){
  if(combatTarget==='flesh'&&!state.enemies.some(enemy=>enemy.variant==='flesh')){
   const donor=sim.createGame('crawler','standard').enemies.find(enemy=>enemy.variant==='flesh');assert.ok(donor);
   const replaced=state.enemies[0];state.enemies[0]={...donor,id:replaced.id,x:replaced.x,z:replaced.z};
   assert.ok(sim.deserialize(sim.serialize(state)),'Same-variant diagnostic fixture remains a valid save');
   report.fixtureOverride={kind:'same-variant diagnostic rival',method:'A production-generated flesh rival replaces one existing rival before save/startBattle. Count, ID and location remain valid.',replaced,replacement:state.enemies[0],limitation:'This does not claim a normal flesh campaign spawns a flesh rival.'};
  }
  const rival=state.enemies.find(e=>e.variant===combatTarget);assert.ok(rival,'Requested battle variant must exist in the valid world fixture');
  sim.travel(state,rival.x,rival.z);for(let i=0;i<2000&&sim.distance(state,rival)>=35;i++)sim.tick(state,.25);assert.ok(sim.distance(state,rival)<35);assert.ok(sim.startBattle(state,rival.id));state.battle.autoFire=false;
  report.target={id:rival.id,faction:rival.faction,variant:rival.variant,meleeReach:sim.meleeReach(state.faction,rival.faction,state.variant,rival.variant)};
 }
 const fixture=sim.serialize(state);assert.equal(sim.serialize(sim.deserialize(fixture)),fixture,'Fixture must round-trip exactly');report.fixture={sha256:sha(fixture),state,setup:'Isolated resources seeded. Production reinforcement/build/upgrade/travel/startBattle APIs prepare the save; native UI controls perform subsequent motion and combat.',description:(fullCity?'All20 occupied mounts with mixed level1/3 upgrades, production construction order. ':'')+(scenario==='combat'?`Saved battle against ${report.target.faction}/${report.target.variant}, manual player fire`:'Expedition movement fixture')};await write();
 if(process.env.EXPECTED_RUNTIME_SHA)assert.equal(report.sourceStart.fingerprint,process.env.EXPECTED_RUNTIME_SHA,'Active runtime differs from the requested checkpoint');
 const assetPath='assets/beast-integration/titanhorn-rigged.glb',assetBytes=await fs.readFile(path.join(root,assetPath)),assetJSON=JSON.parse(assetBytes.subarray(20,20+assetBytes.readUInt32LE(12))),native=assetJSON.meshes.find(m=>m.extras?.nativeQuadruped)?.extras.nativeQuadruped;
 assert.ok(native);assert.deepEqual(Object.keys(native.chains).sort(),['frontLeft','frontRight','rearLeft','rearRight']);assert.ok(assetJSON.skins.some(s=>s.joints.length===27));
 report.nativeSource={path:assetPath,sha256:sha(assetBytes),nativeQuadruped:true,joints:27,chains:native.chains};
 if(fixtureOnly){report.fixtureValidated=true;report.browserRun=false;report.sourceFinish=await source();assert.equal(report.sourceFinish.fingerprint,report.sourceStart.fingerprint);report.passed=true;}
 else{
 const health=await(await fetch(new URL('/health',base))).json();assert.equal(health.rootId,sha(root.replaceAll('\\','/').replace(/\/$/,'').toLowerCase()));report.server={url:base.href,health};
 browser=await chromium.launch({channel:'chrome',headless:process.env.HEADLESS==='1',args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});report.browser={version:browser.version(),headless:process.env.HEADLESS==='1'};
 context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,serviceWorkers:'block',recordVideo:{dir:path.join(out,'motion'),size:{width:1440,height:960}},storageState:{cookies:[],origins:[{origin:base.origin,localStorage:[{name:sim.SAVE_KEY,value:fixture},{name:'colossus-quality-v1',value:'high'},{name:'colossus-camera-mode',value:'steady'}]}]}});
 page=await context.newPage();page.setDefaultTimeout(30000);page.on('request',request=>{const u=new URL(request.url());if(!['blob:','data:'].includes(u.protocol)&&u.origin!==base.origin)report.remoteRequests.push(u.href);});page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()}));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});
 page.on('response',response=>{
  const url=new URL(response.url()),file=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).slice(1),expected=report.sourceStart.hashes[file];
  if(url.origin!==base.origin||!expected)return;
  // Observe the actual response, including decoded compressed bodies. Never
  // intercept, fulfill, route or substitute a request to obtain this identity.
  pendingResponses.push((async()=>{try{
   const bytes=await response.body(),actual=sha(bytes),record={file,url:url.href,status:response.status(),bytes:bytes.length,expectedSha256:expected,sha256:actual,matched:actual===expected,checkedAt:new Date().toISOString()};report.servedResponses.push(record);
   if(!record.matched)report.servedIdentityErrors.push({file,url:url.href,expectedSha256:expected,sha256:actual,error:'Served runtime bytes differ from sourceStart'});
  }catch(error){report.servedIdentityErrors.push({file,url:url.href,error:error.message});}})());
 });
 const until=(fn,arg,timeoutMs=120000)=>waitForBrowserCondition(page,fn,arg,{timeoutMs,pollingMs:30});
 const snapshot=()=>page.evaluate(()=>{const {state:s,scene:g}=window.__colossus;return{time:s.time,mode:s.mode,paused:s.paused,speed:s.speed,x:s.x,z:s.z,angle:s.angle,moving:s.moving,hp:s.hp,buildings:s.buildings,towerOrder:s.towerOrder,battle:s.battle,camera:{view:g.view,yaw:g.yaw,pitch:g.pitch,zoom:g.zoom},light:g.light,carrier:g.city.meshyCarrier?.metrics,pose:g.city.meshyCarrier?.controller.status(),nativeRig:g.city.meshyCarrier?.renderMeshes.filter(m=>m.isSkinnedMesh).map(m=>({bones:m.skeleton.bones.length,vertices:m.geometry.attributes.position.count,nativeQuadruped:!!m.userData.nativeQuadruped})),harness:g.city.meshyCarrier?.saddle.harness.bands.map(b=>({station:b.z,visible:b.mesh.visible,anchors:b.anchors.length})),hud:!document.querySelector('#hud').classList.contains('hidden'),overflow:document.documentElement.scrollWidth>innerWidth,contextLost:g.renderer.getContext().isContextLost(),shaderFailures:g.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.name)};});
 const shot=async name=>{const file=path.join(out,name+'.png');const before=await snapshot();await page.screenshot({path:file});const after=await snapshot(),bytes=await fs.readFile(file);report.images.push({name,path:file,bytes:bytes.length,sha256:sha(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),capturedAt:new Date().toISOString(),original:true,state:before,after});await write();};
 const observeNative=duration=>page.evaluate(duration=>new Promise(resolve=>{
  const start=performance.now(),result={method:'Read-only native RAF sampling of the 27-bone quadruped controller; these diagnostic values do not substitute for independent actual-surface tests or art review.',frames:0,maxSoleError:0,maxSegmentLengthError:0,minSampledSkinClearance:Infinity,badFrames:0,samples:[]};
  function frame(){
   const {state,scene}=window.__colossus,pose=scene.city.meshyCarrier.controller.status(),legs=pose.legs??[];result.frames++;
   const bad=pose.nativeQuadruped!==true||legs.length!==4||legs.some(leg=>!Number.isFinite(leg.soleError)||leg.soleError>1e-5||leg.lengths.length!==3||leg.actualLengths.length!==3||leg.actualLengths.some((length,i)=>!Number.isFinite(length)||Math.abs(length-leg.lengths[i])>1e-5));
   for(const leg of legs){result.maxSoleError=Math.max(result.maxSoleError,leg.soleError??Infinity);result.maxSegmentLengthError=Math.max(result.maxSegmentLengthError,...leg.actualLengths.map((length,i)=>Math.abs(length-leg.lengths[i])));result.minSampledSkinClearance=Math.min(result.minSampledSkinClearance,leg.sampledSkinClearance);}
   if(bad)result.badFrames++;
   if(result.samples.length<1200)result.samples.push({time:state.time,wallTime:performance.timeOrigin+performance.now(),paused:state.paused,speed:state.speed,pose});
   if(performance.now()-start>=duration)resolve(result);else requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }),duration);
 const press=async(key,ms)=>{const before=await snapshot(),start=performance.now(),observing=observeNative(ms);await page.keyboard.down(key);try{await page.waitForTimeout(ms);}finally{await page.keyboard.up(key);}const nativeObservation=await observing,after=await snapshot();report.actions.push({kind:'native-key-hold',key,requestedMs:ms,elapsedMs:performance.now()-start,before,after,nativeObservation});assert.ok(after.time>before.time);assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>1);assert.ok(nativeObservation.frames>0);assert.equal(nativeObservation.badFrames,0,'Native quadruped solver reports reachable targets and fixed segment lengths throughout movement');await write();};
 const orbit=async(yaw,pitch=.28,zoom=60)=>{
  const point=await page.evaluate(()=>{const canvas=window.__colossus.scene.canvas;for(const y of[.48,.38,.58])for(const x of[.5,.4,.6]){const p={x:innerWidth*x,y:innerHeight*y};if(document.elementFromPoint(p.x,p.y)===canvas)return p;}throw Error('No unobscured native orbit point');});
  const wrap=value=>Math.atan2(Math.sin(value),Math.cos(value)),strokes=[];
  for(let i=0;i<30;i++){
   const camera=(await snapshot()).camera,dx=Math.max(-65,Math.min(65,wrap(camera.yaw-yaw)/.006)),dy=Math.max(-40,Math.min(40,(pitch-camera.pitch)/.004));
   if(Math.abs(dx)<.3&&Math.abs(dy)<.3)break;
   await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+8,point.y);await page.mouse.move(point.x+dx,point.y+dy,{steps:8});await page.mouse.up();strokes.push({dx,dy});
  }
  const camera=(await snapshot()).camera;await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,(zoom-camera.zoom)/.06);await page.waitForTimeout(900);
  const after=await snapshot();assert.ok(Math.abs(wrap(after.camera.yaw-yaw))<.02&&Math.abs(after.camera.pitch-pitch)<.02&&Math.abs(after.camera.zoom-zoom)<.02,'Native supplementary framing reached target');
  report.actions.push({kind:'native-orbit-and-wheel',target:{yaw,pitch,zoom},point,strokes,after});
 };
 await page.goto(new URL('/?test=1',base).href,{waitUntil:'domcontentloaded',timeout:120000});await until(()=>!!window.__colossus);await page.locator('#continue').click();
 await until(()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);await page.bringToFront();
 const lightBefore=(await snapshot()).light;let lightClicks=0;
 while((await snapshot()).light!==requestedLight&&lightClicks<3){await page.locator('#lighting').click();lightClicks++;}
 assert.equal((await snapshot()).light,requestedLight);if(lightClicks)await page.waitForTimeout(2500);
 report.actions.push({kind:'native-lighting-button',selector:'#lighting',before:lightBefore,requested:requestedLight,clicks:lightClicks,at:new Date().toISOString()});
 report.initial=await snapshot();assert.equal(report.initial.mode,scenario==='combat'?'battle':'expedition');assert.equal(report.initial.hud,true);assert.equal(report.initial.speed,1);assert.equal(report.initial.pose.nativeQuadruped,true);assert.ok(report.initial.nativeRig.length>0&&report.initial.nativeRig.every(m=>m.bones===27));
 if(fullCity){assert.equal(report.initial.buildings.filter(Boolean).length,20);assert.ok(report.initial.harness.every(b=>b.visible));}
 if(scenario==='populated')await page.locator('[data-view="carrier"]').click();await page.waitForTimeout(900);await shot('01-ready');
 if(scenario==='populated'){
  assert.equal(report.initial.buildings.filter(Boolean).length,20);assert.ok(report.initial.harness.every(b=>b.visible));
  const initialCamera=(await snapshot()).camera,heading=(await snapshot()).angle;
  await orbit(heading);await shot('01b-full-saddle-front');await orbit(heading+Math.PI/2);await shot('01c-full-saddle-side');await orbit(initialCamera.yaw,initialCamera.pitch,initialCamera.zoom);
  await Promise.all([press('w',3200),(async()=>{await page.waitForTimeout(1400);await shot('02a-walking');})()]);await shot('02-walk-stop');
  await Promise.all([press('d',1800),(async()=>{await page.waitForTimeout(750);await shot('03a-turning');})()]);await shot('03-turn-stop');await page.waitForTimeout(1600);await shot('04-idle-recovery');
  await page.locator('[data-view="city"]').click();await page.waitForTimeout(900);await shot('05-full-saddle-city');
 }else{
  await page.locator('[data-command="approach"]').click();report.actions.push({kind:'native-button',selector:'[data-command="approach"]',at:new Date().toISOString()});
  await until(reach=>{const b=window.__colossus.state.battle;return b&&Math.hypot(b.player.x-b.enemy.x,b.player.z-b.enemy.z)<=reach-.1;},report.target.meleeReach,30000);
  await page.locator('[data-command="hold"]').click();await until(()=>!document.querySelector('#fire').disabled);await shot('02-melee-ready');
  const before=await snapshot();assert.equal(before.battle.autoFire,false);const strikeObserving=observeNative(2200);await page.locator('#fire').click();
  report.actions.push({kind:'native-button',selector:'#fire',before,at:new Date().toISOString()});
  await until(seq=>window.__colossus.state.battle.events.some(e=>e.id>seq&&e.source==='player'&&e.kind==='impact'),before.battle.seq,5000);
  const launched=(await snapshot()).battle.events.find(e=>e.id>before.battle.seq&&e.source==='player'&&e.kind==='impact');
  await shot('03-strike-start');await until(at=>window.__colossus.state.battle.time>=at-.15,launched.impactAt,5000);await shot('04-strike-impact-window');await page.waitForTimeout(1100);await shot('05-strike-recovery');
  const after=await snapshot(),event=after.battle.events.find(e=>e.id>before.battle.seq&&e.source==='player'&&e.kind==='impact');assert.ok(event);assert.ok(after.battle.enemyHp<before.battle.enemyHp);report.strike={event,before,after,nativeObservation:await strikeObserving};assert.ok(report.strike.nativeObservation.frames>0);
 }
 report.final=await snapshot();assert.equal(report.final.hud,true);assert.equal(report.final.contextLost,false);assert.equal(report.final.overflow,false);assert.deepEqual(report.final.shaderFailures,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);assert.deepEqual(report.remoteRequests,[]);
 await settleResponseChecks();assert.deepEqual(report.servedIdentityErrors,[],'Actual runtime responses must match the checkpoint');
 for(const file of['index.html','src/main.js','src/scene.js','src/monster-quadruped-pose.js','assets/beast-integration/titanhorn-rigged.glb'])assert.ok(report.servedResponses.some(r=>r.file===file&&r.matched),'Required actual runtime response was not verified: '+file);
 report.servedIdentityVerified=true;
 report.sourceFinish=await source();assert.equal(report.sourceFinish.fingerprint,report.sourceStart.fingerprint,'Runtime changed during capture');assert.equal(report.sourceFinish.commit,report.sourceStart.commit,'Commit changed during capture');report.browserRun=true;report.observationEligible=true;report.passed=true;
 }
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{
 try{await settleResponseChecks();if(report.servedIdentityErrors.length){report.passed=false;report.observationEligible=false;report.servedIdentityVerified=false;process.exitCode=1;}}catch(error){report.servedIdentityErrors.push({error:error.message});report.passed=false;report.observationEligible=false;report.servedIdentityVerified=false;process.exitCode=1;}
 if(context)await context.close();if(browser)await browser.close();
 // Failed captures still retain their actual after-source identity. The
 // observation's eligibility never depends on an automated art judgement.
 if(report.sourceStart)try{
  report.sourceFinish??=await source();report.sourceUnchanged=report.sourceFinish.fingerprint===report.sourceStart.fingerprint;report.commitUnchanged=report.sourceFinish.commit===report.sourceStart.commit;
  assert.ok(report.sourceUnchanged&&report.commitUnchanged,'Runtime or checkpoint changed during the observation');
 }catch(error){report.sourceCheckError=error.message;report.passed=false;report.observationEligible=false;process.exitCode=1;}
 report.finishedAt=new Date().toISOString();report.exitCode=process.exitCode??0;await write();console.log(JSON.stringify({passed:report.passed,scenario,report:path.join(out,'report.json'),error:report.error?.message??report.sourceCheckError}));
}
