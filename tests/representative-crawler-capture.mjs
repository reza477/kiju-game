// Matching normal-camera images and actual main-loop motion, using local assets.
// Fixed simulation timestamps make paths identical; native RAF schedules frames.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const phase=process.env.PHASE||'before',ref='75a5056d86e0d0fc8cb820694bbcc29e87be6e92',out=path.resolve(process.env.OUTPUT_DIR||`artifacts/representative-crawler/${phase}`);await fs.mkdir(out,{recursive:true});
const report={phase,checkpoint:ref,fixture:'1440x960 Chrome, deviceScaleFactor1, High detail, day, standard crawler, normal City view (yaw.72,pitch.6,zoom76). Fixed1/60s game timestamps dispatched through the actual main.frame on native RAF; real keyboard input. Three240-frame motion samples after120 warmup frames each. No recording during timing. Headless observations, not a device/foreground FPS guarantee.',errors:[],remote:[],shots:[],runs:[]};
const baseline=process.env.BASELINE==='1',sources=new Map();
if(baseline)for(const name of execFileSync('git',['ls-tree','-r','--name-only',ref,'src'],{encoding:'utf8'}).trim().split('\n'))sources.set('/'+name,execFileSync('git',['show',`${ref}:${name}`],{encoding:'utf8'}));
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(120000);
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4178'){if(sources.has(u.pathname))return r.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'application/javascript',body:sources.get(u.pathname)});return r.continue();}if(['blob:','data:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);let callback,time;window.requestAnimationFrame=f=>(callback=f,1);window.__nativeRAF=raf;window.__stepMain=()=>{time??=performance.now();time+=1000/60;const f=callback;callback=null;if(!f)throw Error('Main frame was not scheduled');f(time);};});
 await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);
 await page.evaluate(()=>window.__stepMain());await page.locator('[data-faction="crawler"]').click();await page.locator('[data-variant="standard"]').click();await page.locator('#begin').click();
 await page.evaluate(async()=>{
  const {state:s,scene:g}=window.__colossus,{serialize,deserialize}=await import('/src/simulation.js'),{riverX,roadZ}=await import('/src/terrain.js');
  const x=riverX(140)-31,z=roadZ(x)-17;s.x=x;s.z=z;s.angle=0;s.paused=true;s.time=0;
  window.__studyStart=serialize(s);
  window.__resetStudy=()=>{Object.assign(s,deserialize(window.__studyStart));s.paused=true;g.setGame(s);g.setView('city');g.setLighting('day');g.setQuality('high');g.setCameraMode('cinematic');g.snapCamera=true;window.__colossus.advance(0);};
  window.__pump=n=>new Promise(resolve=>{let i=0;function f(){window.__stepMain();if(++i>=n)resolve();else window.__nativeRAF(f);}window.__nativeRAF(f);});window.__resetStudy();
 });
 await page.evaluate(()=>window.__pump(120));
 report.environment=await page.evaluate(()=>{const{scene:g,state:s}=window.__colossus,r=g.renderer,gl=r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{browser:navigator.userAgent,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webgl:gl.getParameter(gl.VERSION),timerQuery:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),viewport:[innerWidth,innerHeight],drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],dpr:r.getPixelRatio(),camera:{yaw:g.yaw,pitch:g.pitch,zoom:g.zoom,fov:g.camera.fov},start:[s.x,s.z],light:g.light,quality:g.quality};});
 console.log(JSON.stringify({phase,baselineLoaded:baseline,environment:report.environment}));
 async function shot(name){const state=await page.evaluate(()=>{const{state:s,scene:g}=window.__colossus;return {x:s.x,z:s.z,time:s.time,angle:s.angle,moving:s.moving,camera:g.camera.position.toArray(),aim:g.cameraAim.toArray(),render:{...g.renderer.info.render}};});await page.screenshot({path:path.join(out,name+'.png'),style:'#paused-banner,#toast{visibility:hidden!important}'});report.shots.push({name,...state});}
 await shot('normal-city');await page.evaluate(()=>window.__colossus.scene.yaw+=Math.PI);await page.evaluate(()=>window.__pump(120));await shot('reverse-city');
 await page.evaluate(()=>window.__resetStudy());await page.evaluate(()=>window.__pump(120));await page.locator('#pause').click();await page.keyboard.down('a');await page.evaluate(()=>window.__pump(90));await shot('moving-a');await page.evaluate(()=>window.__pump(60));await shot('moving-b');await page.keyboard.up('a');
 for(let run=0;run<3;run++){
  await page.evaluate(()=>window.__resetStudy());await page.evaluate(()=>window.__pump(120));await page.locator('#pause').click();await page.keyboard.down('a');
  const result=await page.evaluate(()=>new Promise(resolve=>{
   const{scene:g,state:s}=window.__colossus,r=g.renderer,gl=r.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),pending=[],cpu=[],intervals=[],gpu=[];let prior,frames=0,disjoint=0;
   function collect(){if(!ext)return;if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;for(const q of pending)gl.deleteQuery(q);pending.length=0;return;}while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=pending.shift();gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}}
   const begin={x:s.x,z:s.z,time:s.time};
   function step(now){collect();if(prior!==undefined)intervals.push(now-prior);prior=now;let q;if(ext&&pending.length<8){q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}const t=performance.now();window.__stepMain();cpu.push(performance.now()-t);if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}if(++frames<240){window.__nativeRAF(step);return;}const end={x:s.x,z:s.z,time:s.time,moving:s.moving},render={...r.info.render};let waits=0;function finish(){collect();if(pending.length&&waits++<120){window.__nativeRAF(finish);return;}for(const q of pending)gl.deleteQuery(q);const summary=a=>{const v=[...a].sort((a,b)=>a-b);return{samples:v.length,median:v[Math.floor(v.length*.5)]??null,p95:v[Math.floor(v.length*.95)]??null,max:v.at(-1)??null};};resolve({frames,begin,end,render,frameIntervalMs:summary(intervals),mainCpuMs:summary(cpu),gpuMs:summary(gpu),disjoint,lost:gl.isContextLost()});}window.__nativeRAF(finish);}
   window.__nativeRAF(step);
  }));await page.keyboard.up('a');assert.equal(result.frames,240);assert.equal(result.end.moving,true);assert.ok(Math.hypot(result.end.x-result.begin.x,result.end.z-result.begin.z)>10);assert.equal(result.lost,false);report.runs.push(result);console.log(JSON.stringify({phase,run,...result}));
 }
 // Optional critic-owned captures: normal player-accessible orbit/zoom, HUD on.
 // These occur after timing, so screenshots never contaminate measured frames.
 if(process.env.REVIEW==='1'){
  await page.evaluate(()=>{window.__resetStudy();Object.assign(window.__colossus.scene,{yaw:.72+Math.PI,pitch:.42,zoom:55,snapCamera:true});});
  await page.evaluate(()=>window.__pump(120));await shot('close-city');
  await page.locator('#pause').click();await page.keyboard.down('a');
  for(let i=0;i<6;i++){await page.evaluate(()=>window.__pump(15));await shot(`close-motion-${i+1}`);}
  await page.keyboard.up('a');
  await page.evaluate(()=>{window.__resetStudy();Object.assign(window.__colossus.scene,{yaw:.72+Math.PI,pitch:.6,zoom:112,snapCamera:true});});
  await page.evaluate(()=>window.__pump(120));await shot('wide-city');
 }
 // Exercise real save and reload without touching the user's browser profile.
 await page.locator('#save').click();report.saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('colossus-wake-save-v1')));assert.equal(report.saved.variant,'standard');
 await page.reload();await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);await page.evaluate(()=>window.__stepMain());await page.locator('#continue').click();
 report.restored=await page.evaluate(()=>window.__colossus.snapshot());assert.equal(report.restored.x,report.saved.x);assert.equal(report.restored.z,report.saved.z);assert.deepEqual(report.restored.buildings,report.saved.buildings);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({out,phase,shots:report.shots.length,runs:report.runs.length,errors:report.errors,remote:report.remote,failure:report.failure}));
