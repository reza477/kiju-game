// Neutral, normal-HUD lighting/detail evidence and uncalibrated local timing.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/beauty-render-builder-01');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--mute-audio']});
const report={fixture:'1440x960 normal HUD, initial city. Actual day/dusk/night and detail controls. Only transient toast/pause overlays hidden. Frame timing is an uncalibrated headless observation, not a guaranteed player frame rate.',errors:[],remote:[],observations:[],screenshots:[]};
try{for(const [faction,variant]of [['kaiju','cyborg'],['kaiju','flesh'],['crawler','drill'],['airship','vertical']]){
 const context=await browser.newContext({viewport:{width:1440,height:960}});await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4178')return r.continue();report.remote.push(u.href);return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:4178/?test=1',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);
 await page.locator(`[data-faction="${faction}"]`).click();await page.locator(`[data-variant="${variant}"]`).click();await page.locator('#begin').click();await page.locator('#pause').click();
 for(const mode of ['day','dusk','night']){
  if(mode!=='day')await page.locator('#lighting').click();await page.waitForTimeout(1300);
  const name=`${variant}-${mode}-city`;await page.screenshot({path:path.join(out,name+'.png'),style:'#paused-banner,#toast{visibility:hidden!important}'});report.screenshots.push(name+'.png');
  const observation=await page.evaluate(async name=>{const g=window.__colossus.scene,r=g.renderer,gl=r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');const frames=[];let prev;await new Promise(resolve=>{const start=performance.now();function sample(t){if(prev)frames.push(t-prev);prev=t;if(t-start>1800)resolve();else requestAnimationFrame(sample);}requestAnimationFrame(sample);});frames.sort((a,b)=>a-b);return {name,quality:g.quality,light:g.light,surfaces:g.surfaceDiagnostics(),hdr:g.environmentReady,error:g.environmentError,contextLost:gl.isContextLost(),render:{...r.info.render},memory:{...r.info.memory},gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),timing:{samples:frames.length,median:frames[Math.floor(frames.length/2)],p95:frames[Math.floor(frames.length*.95)]}};},name);
  assert.ok(observation.hdr);assert.equal(observation.error,null);assert.deepEqual(observation.surfaces.failures,[]);assert.equal(observation.contextLost,false);report.observations.push(observation);
 }
 await page.locator('[data-view="people"]').click();await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,variant+'-night-streets.png'),style:'#paused-banner,#toast{visibility:hidden!important}'});report.screenshots.push(variant+'-night-streets.png');
 if(variant==='flesh'){for(const q of ['balanced','performance','high']){await page.locator('#quality').click();await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>window.__colossus.scene.quality),q);await page.screenshot({path:path.join(out,`streets-${q}.png`),style:'#paused-banner,#toast{visibility:hidden!important}'});report.screenshots.push(`streets-${q}.png`);}}
 await context.close();console.log(`Lighting captured ${variant}`);
}assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);}catch(e){report.failure=e.message;process.exitCode=1;}finally{await fs.writeFile(path.join(out,'render-report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({out,shots:report.screenshots.length,errors:report.errors,remote:report.remote,failure:report.failure}));
