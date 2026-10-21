// Reusable normal-HUD capture and bounded native-control smoke test.
// Run against an explicitly identified local checkout, always in isolated saves.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';

const toolRoot=fileURLToPath(new URL('..',import.meta.url));
const sourceRoot=await fs.realpath(path.resolve(process.env.SOURCE_ROOT||toolRoot));
const fixtureRoot=await fs.realpath(path.resolve(process.env.FIXTURE_ROOT||sourceRoot));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/art-remake/capture');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4224/');
const mode=process.env.MODE||'capture',label=process.env.RUN_LABEL||'AFTER';
const requestedLight=process.env.LIGHT||'day';
assert.ok(['capture','smoke'].includes(mode));
assert.ok(['day','dusk','night'].includes(requestedLight));
assert.ok(['localhost','127.0.0.1'].includes(base.hostname),'Only isolated loopback servers allowed.');
assert.ok(!['4178','4214'].includes(base.port),'Do not use the owner playtest ports.');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const variants=[['kaiju','cyborg'],['kaiju','flesh'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']];
const profiles={
 desktop:{viewport:{width:1440,height:960},deviceScaleFactor:1,isMobile:false,hasTouch:false,quality:'high'},
 portrait:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,quality:'performance'},
 landscape:{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true,quality:'performance'},
};
const views=[
 {name:'desktop-normal-city',profile:'desktop',yaw:.72,pitch:.6,zoom:76},
 {name:'desktop-reverse',profile:'desktop',yaw:.72+Math.PI,pitch:.6,zoom:76},
 {name:'desktop-close',profile:'desktop',yaw:.72,pitch:.6,zoom:57},
 {name:'phone-portrait-city',profile:'portrait',yaw:.72,pitch:.6,zoom:76},
 {name:'phone-landscape-city',profile:'landscape',yaw:.72,pitch:.6,zoom:76},
];
async function fingerprint(root){
 const names=[...new Set([...git(root,'ls-files','src','assets','vendor','index.html','package.json','package-lock.json').split('\n'),...git(root,'ls-files','--others','--exclude-standard','src','assets','vendor').split('\n')])].filter(Boolean).sort();
 const hashes={};for(const name of names){try{hashes[name]=sha(await fs.readFile(path.join(root,name)));}catch(error){if(error.code!=='ENOENT')throw error;hashes[name]='DELETED';}}
 return{root,commit:git(root,'rev-parse','HEAD'),status:git(root,'status','--short'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0,'Output must be empty; never overwrite original evidence.');
const report={protocol:'art-remake-v1',mode,label,startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),environment:Object.fromEntries(['MODE','RUN_LABEL','SOURCE_ROOT','FIXTURE_ROOT','OUTPUT_DIR','GAME_TEST_URL','VIEW','VARIANT','CAPTURE_VARIANT','LIGHT','HEADLESS','RECORD_VIDEO','OBSERVE_FRAMES'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))},method:'Fresh isolated context per case; baseline createGame fixture, ordinary Continue click, native orbit/wheel/touch, normal gameplay with HUD. No screenshot retouching, runtime state writes, time overrides or frame pumping.',limitations:['Phone captures are Windows Chrome emulation, not physical Apple-device verification.','Initial fixture and framing are fixed; native elapsed time and animation pose are recorded and can differ.','Bounded smoke is not a release, offline/update, performance or art gate.','Optional RAF observations measure native callback intervals in this view only; they are not GPU time, sustained performance or comparative speedup evidence.'],visits:[],passed:false};
const write=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
await write();let browser,context,page,visit;
const snapshot=()=>page.evaluate(()=>{const {state:s,scene:g}=window.__colossus,gl=g.renderer.getContext();return{time:s.time,faction:s.faction,variant:s.variant,x:s.x,z:s.z,angle:s.angle,paused:s.paused,speed:s.speed,mode:s.mode,buildings:s.buildings,towerOrder:s.towerOrder??null,resources:s.resources,worldDamage:s.worldDamage,camera:{yaw:g.yaw,pitch:g.pitch,zoom:g.zoom,view:g.view,mode:g.cinematic.mode,position:g.camera.position.toArray(),target:g.focus.toArray()},quality:g.quality,light:g.light,render:{calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles,canvasWidth:g.canvas.width,canvasHeight:g.canvas.height},hud:!document.getElementById('hud').classList.contains('hidden'),dialog:document.getElementById('dialog').open,overflow:document.documentElement.scrollWidth>innerWidth+1,environmentReady:g.environmentReady,environmentError:g.environmentError,surfaces:g.surfaceDiagnostics(),contextLost:gl.isContextLost(),shaderFailures:(g.renderer.info.programs??[]).filter(p=>p.diagnostics?.runnable===false).map(p=>p.name)};});
const until=(predicate,arg,timeoutMs=120000)=>waitForBrowserCondition(page,predicate,arg,{timeoutMs,pollingMs:100});
const tap=selector=>profiles[visit.profile].isMobile?page.locator(selector).tap():page.locator(selector).click();
async function nativeCamera(target){
 const point=await page.evaluate(()=>{const c=window.__colossus.scene.canvas;for(const y of [.48,.38,.58,.28])for(const x of [.5,.4,.6,.3,.7]){const p={x:innerWidth*x,y:innerHeight*y};if(document.elementFromPoint(p.x,p.y)===c)return p;}throw Error('No unobscured canvas drag point');});
 const mobile=profiles[visit.profile].isMobile,cdp=mobile?await context.newCDPSession(page):null,strokes=[];
 for(let i=0;i<30;i++){
  const current=(await snapshot()).camera,dx=Math.max(-65,Math.min(65,(current.yaw-target.yaw)/.006)),dy=Math.max(-40,Math.min(40,(target.pitch-current.pitch)/.004));
  if(Math.abs(dx)<.3&&Math.abs(dy)<.3)break;
  if(mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+8,y:point.y,id:1}]});for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+8+(dx-8)*n/8,y:point.y+dy*n/8,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+8,point.y);await page.mouse.move(point.x+dx,point.y+dy,{steps:8});await page.mouse.up();}
  strokes.push({dx,dy});
 }
 const camera=(await snapshot()).camera;
 if(Math.abs(camera.zoom-target.zoom)>.02){assert.equal(mobile,false,'Phone captures use normal City zoom.');await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,(target.zoom-camera.zoom)/.06);}
 await until(()=>!window.__colossus.scene.snapCamera);
 await page.waitForTimeout(900);
 const actual=(await snapshot()).camera;for(const key of ['yaw','pitch','zoom'])assert.ok(Math.abs(actual[key]-target[key])<.02,`${key} did not match requested capture frame`);
 visit.cameraInput={target,actual,point,strokes};
}
function validate(s){assert.equal(s.paused,false);assert.equal(s.speed,1);assert.equal(s.mode,'expedition');assert.equal(s.hud,true);assert.equal(s.dialog,false);assert.equal(s.overflow,false);assert.equal(s.contextLost,false);assert.equal(s.environmentReady,true);assert.equal(s.environmentError,null);assert.equal(s.surfaces.pending,0);assert.deepEqual(s.surfaces.failures,[]);assert.deepEqual(s.shaderFailures,[]);assert.ok(s.render.calls>0&&s.render.triangles>0);}
async function screenshot(name){const file=path.join(out,`${label}-${name}.png`);await page.screenshot({path:file});const bytes=await fs.readFile(file);return{path:file,bytes:bytes.length,sha256:sha(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),original:true,phoneEmulation:profiles[visit.profile].isMobile,capturedAt:new Date().toISOString()};}
async function selectLighting(){
 const before=(await snapshot()).light;if(before===requestedLight)return;
 const mobile=profiles[visit.profile].isMobile;if(mobile)await tap('#mobile-menu');
 let clicks=0;for(;clicks<3;clicks++){if((await snapshot()).light===requestedLight)break;await tap(mobile?'[data-setting="lighting"]':'#lighting');}
 if(mobile)await tap('[data-dialog-action="close"]');
 assert.equal((await snapshot()).light,requestedLight);await page.waitForTimeout(2500);
 visit.lightingInput={method:mobile?'Native menu lighting button':'Native #lighting button',before,requested:requestedLight,clicks};
}
async function observePerformance(){
 const count=Number(process.env.OBSERVE_FRAMES||0);if(!count)return;
 assert.ok(Number.isInteger(count)&&count>=30&&count<=600);
 const observations=await page.evaluate(count=>new Promise(resolve=>{
  const intervals=[],g=window.__colossus.scene,gl=g.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');let prior=null,first=null;
  const sample=t=>{first??=t;if(prior!==null)intervals.push(t-prior);prior=t;if(intervals.length<count){requestAnimationFrame(sample);return;}resolve({count,intervalsMs:intervals,elapsedMs:t-first,quality:g.quality,canvas:{width:g.canvas.width,height:g.canvas.height},render:{calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles},adapter:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable',contextLost:gl.isContextLost()});};requestAnimationFrame(sample);
 }),count);
 const sorted=[...observations.intervalsMs].sort((a,b)=>a-b),percentile=p=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
 visit.performance={method:'Read-only native requestAnimationFrame callback intervals during stationary normal gameplay; no extra render or time advance calls.',...observations,meanMs:observations.elapsedMs/count,p50Ms:percentile(.5),p95Ms:percentile(.95),worstMs:sorted.at(-1),observedCallbacksPerSecond:count*1000/observations.elapsedMs};
}
async function smoke(){
 const before=await snapshot();await page.keyboard.down('w');
 try{await until(({x,z})=>Math.hypot(window.__colossus.state.x-x,window.__colossus.state.z-z)>=3,{x:before.x,z:before.z},20000);}finally{await page.keyboard.up('w');}
 const moved=await snapshot();assert.ok(moved.time>before.time);visit.movement={before,after:moved,distance:Math.hypot(moved.x-before.x,moved.z-before.z)};
 await tap('[data-building="sawmill"]');const empty=page.locator('[data-slot]:not([disabled])').first();const slot=Number(await empty.getAttribute('data-slot'));await empty.click();
 await until(i=>window.__colossus.state.buildings[i]?.type==='sawmill',slot);await until(i=>window.__colossus.state.buildings[i]?.remaining===0,slot,45000);
 const built=await snapshot();assert.equal(built.resources.wood,before.resources.wood-25);assert.equal(built.resources.iron,before.resources.iron-20);visit.construction={slot,completed:built.buildings[slot],towerOrder:built.towerOrder};
 await page.keyboard.press('p');await until(()=>window.__colossus.state.paused);
 await tap('#save');const saved=await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1'));assert.ok(saved);const savedState=JSON.parse(saved);
 await page.reload({waitUntil:'domcontentloaded',timeout:120000});await until(()=>!!window.__colossus);await tap('#continue');await until(()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);
 const restored=await snapshot();for(const k of ['variant','faction','x','z','angle'])assert.equal(restored[k],savedState[k]);assert.deepEqual(restored.buildings,savedState.buildings);assert.deepEqual(restored.towerOrder,savedState.towerOrder??null);assert.deepEqual(restored.worldDamage,savedState.worldDamage);visit.saveRoundtrip={sha256:sha(saved),bytes:Buffer.byteLength(saved),preserved:['variant','faction','position','angle','buildings','towerOrder','worldDamage'],restored};
 validate(restored);visit.image=await screenshot(`smoke-${visit.variant}`);
}
try{
 report.sourceStart=await fingerprint(sourceRoot);report.fixtureSource=await fingerprint(fixtureRoot);report.toolSha256=sha(await fs.readFile(fileURLToPath(import.meta.url)));
 const response=await fetch(new URL('/health',base));assert.equal(response.status,200);const health=await response.json();assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,sha(sourceRoot.replaceAll('\\','/').toLowerCase()));report.server={url:base.href,health};
 const sim=await import(pathToFileURL(path.join(fixtureRoot,'src/simulation.js')).href);
 const captureVariant=process.env.CAPTURE_VARIANT||'standard',captureIdentity=variants.find(([,variant])=>variant===captureVariant);assert.ok(captureIdentity,'Unknown CAPTURE_VARIANT');
 const cases=mode==='capture'?views.filter(v=>!process.env.VIEW||v.name===process.env.VIEW).map(v=>({...v,faction:captureIdentity[0],variant:captureVariant})):variants.filter(([,v])=>!process.env.VARIANT||v===process.env.VARIANT).map(([faction,variant])=>({name:variant,profile:'desktop',faction,variant}));assert.ok(cases.length);
 browser=await chromium.launch({channel:'chrome',headless:process.env.HEADLESS==='1',args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});report.browser={version:browser.version(),channel:'chrome',headless:process.env.HEADLESS==='1',args:['--mute-audio','--enable-gpu','--use-angle=d3d11']};
 for(const item of cases){
  const profile=profiles[item.profile],{quality,...contextOptions}=profile,state=sim.createGame(item.faction,item.variant),fixture=sim.serialize(state);assert.ok(sim.deserialize(fixture));
  visit={...item,startedAt:new Date().toISOString(),profileSettings:profile,fixture:{sha256:sha(fixture),state},errors:[],warnings:[],failedRequests:[],remoteRequests:[]};report.visits.push(visit);await write();
  context=await browser.newContext({...contextOptions,serviceWorkers:'block',...(process.env.RECORD_VIDEO==='1'?{recordVideo:{dir:path.join(out,'motion'),size:profile.viewport}}:{})});
  await context.route('**/*',route=>{const url=route.request().url();if(!url.startsWith(base.origin)&&!url.startsWith('blob:'+base.origin)&&!url.startsWith('data:')){visit.remoteRequests.push(url);return route.abort();}return route.continue();});
  await context.addInitScript(({fixture,quality})=>{if(!sessionStorage.getItem('art-remake-fixture')){localStorage.setItem('colossus-wake-save-v1',fixture);sessionStorage.setItem('art-remake-fixture','1');}localStorage.setItem('colossus-quality-v1',quality);localStorage.setItem('colossus-camera-mode','steady');},{fixture,quality});
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>visit.errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')visit.warnings.push(m.text());if(m.type()==='error')visit.errors.push(m.text());});page.on('requestfailed',r=>visit.failedRequests.push({url:r.url(),failure:r.failure()}));
  await page.goto(new URL('/?test=1',base).href,{waitUntil:'domcontentloaded',timeout:120000});await page.bringToFront();await until(()=>!!window.__colossus);
  if(mode==='smoke'){
   await tap(`[data-faction="${item.faction}"]`);await tap(`[data-variant="${item.variant}"]`);
   await tap('#begin');await tap('[data-dialog-action="restart"]');
   visit.selection={method:'Native faction, variant, begin and confirm-new-expedition controls',faction:item.faction,variant:item.variant};
  }else await tap('#continue');
  await until(()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);
  const initial=await snapshot();assert.equal(initial.faction,item.faction);assert.equal(initial.variant,item.variant);assert.equal(initial.quality,quality);visit.initial=initial;
  if(mode==='capture'){
   const target=item.variant==='standard'?item:{...item,yaw:initial.camera.yaw+(item.name==='desktop-reverse'?Math.PI:0),pitch:initial.camera.pitch,zoom:initial.camera.zoom*(item.name==='desktop-close'?.75:1)};
   await nativeCamera(target);await selectLighting();visit.capture=await snapshot();validate(visit.capture);visit.image=await screenshot(item.name);
   if(process.env.RECORD_VIDEO==='1'){visit.motionStart=await snapshot();await page.waitForTimeout(5000);visit.motionEnd=await snapshot();assert.ok(visit.motionEnd.time>visit.motionStart.time);}
  }
  else await smoke();
  await observePerformance();
  assert.deepEqual(visit.errors,[]);assert.deepEqual(visit.remoteRequests,[]);visit.finishedAt=new Date().toISOString();visit.passed=true;await write();await context.close();context=null;page=null;console.log(`PASS ${item.name}`);
 }
 report.sourceFinish=await fingerprint(sourceRoot);assert.equal(report.sourceFinish.fingerprint,report.sourceStart.fingerprint,'Runtime changed during the evidence run.');report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};if(visit)visit.passed=false;process.exitCode=1;console.error(error.stack);}
finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});report.finishedAt=new Date().toISOString();report.exitCode=process.exitCode||0;await write();console.log(JSON.stringify({passed:report.passed,visits:report.visits.length,report:path.join(out,'report.json')}));}
