/**
 * Local visual evidence only. Runs Chrome in an isolated profile, blocks remote
 * requests, and writes screenshots plus uncalibrated frame/renderer observations.
 *
 * OUTPUT_DIR=artifacts/graphics-after node tests/graphics-audit.mjs
 * GRAPHICS_BASE_URL=http://127.0.0.1:4178 is the default local server.
 * A developed-city fixture uses only the explicitly enabled ?test=1 API.
 */
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}

const output=path.resolve(process.env.OUTPUT_DIR||'artifacts/graphics-after');
const base=new URL(process.env.GRAPHICS_BASE_URL||'http://127.0.0.1:4178/');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'Graphics audit requires a local server.');
base.searchParams.set('test','1');
await fs.mkdir(output,{recursive:true});
const browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
const errors=[],remoteRequests=[],screenshots=[],observations=[],checks=[];
const environment={browser:browser.version(),headless:true,node:process.version,platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,memoryGiB:Math.round(os.totalmem()/2**30)};
const result={label:'Uncalibrated local headless observations; these are not guaranteed user FPS or mobile-device performance.',capturedAt:new Date().toISOString(),environment,viewports:[{width:1440,height:960},{width:1920,height:1080},{width:390,height:844}],fixture:'12 completed districts, mixed levels 1 to 3, all seven building types; simulation paused at time 32.5 in an isolated test profile.',screenshots,observations,checks,errors,remoteRequests};
let activePage;

async function openGame(viewport){
 const context=await browser.newContext({viewport,deviceScaleFactor:1});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin===base.origin||['data:','blob:'].includes(url.protocol))return route.continue();
  remoteRequests.push({url:url.href,method:route.request().method(),blocked:true});return route.abort('blockedbyclient');
 });
 const page=await context.newPage();activePage=page;
 page.on('pageerror',error=>errors.push({viewport,message:error.message}));
 page.on('console',message=>{if(message.type()==='error')errors.push({viewport,message:message.text()});});
 await page.goto(base.href,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>!!window.__colossus?.scene?.renderer);
 await page.evaluate(()=>document.fonts.ready);
 await settle(page);
 return {context,page};
}
async function settle(page){await page.waitForTimeout(1000);}
async function capture(page,name){
 const file=name+'.png';await page.screenshot({path:path.join(output,file)});screenshots.push(file);
}
async function inspect(page,name,sampleFrames=false){
 const observation=await page.evaluate(async({name,sampleFrames})=>{
  const samples=[];
  if(sampleFrames){
   let previous;const start=performance.now();
   await new Promise(resolve=>{function sample(time){if(previous!==undefined)samples.push(time-previous);previous=time;if(time-start>=2500)resolve();else requestAnimationFrame(sample);}requestAnimationFrame(sample);});
  }
  const api=window.__colossus,renderer=api.scene.renderer,gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
  samples.sort((a,b)=>a-b);
  const percentile=q=>samples[Math.min(samples.length-1,Math.floor((samples.length-1)*q))];
  return {name,faction:api.state.faction,view:api.scene.view,quality:api.scene.quality,lighting:api.scene.light,buildings:api.state.buildings.filter(Boolean).length,viewport:{width:innerWidth,height:innerHeight},canvas:{width:renderer.domElement.width,height:renderer.domElement.height,cssWidth:renderer.domElement.clientWidth,cssHeight:renderer.domElement.clientHeight},render:{...renderer.info.render},memory:{...renderer.info.memory},programs:renderer.info.programs?.length??null,webgl:{version:gl.getParameter(gl.VERSION),renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),contextLost:gl.isContextLost()},frameMilliseconds:samples.length?{sampleWindowMs:2500,count:samples.length,median:percentile(.5),p95:percentile(.95),min:samples[0],max:samples.at(-1)}:null,ui:{scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,horizontalOverflow:document.documentElement.scrollWidth>innerWidth}};
 },{name,sampleFrames});
 assert.equal(observation.webgl.contextLost,false,`${name}: WebGL context survives`);
 assert.ok(observation.render.triangles>0,`${name}: 3D geometry is rendered`);
 assert.ok(observation.canvas.width>0&&observation.canvas.height>0,`${name}: nonzero canvas`);
 observations.push(observation);return observation;
}
async function developedCity(page){
 await page.evaluate(()=>{
  const {state,scene}=window.__colossus;
  state.paused=true;state.time=32.5;state.population=54;state.target=null;state.moving=false;state.rings=2;
  state.buildings=Array(20).fill(null);
  for(const [slot,type,level]of [[0,'housing',2],[1,'foundry',2],[3,'armor',2],[5,'sawmill',2],[6,'housing',3],[7,'keep',3],[9,'cannon',2],[10,'farm',2],[11,'housing',1],[13,'farm',3],[16,'foundry',1],[18,'cannon',3]])state.buildings[slot]={type,level,remaining:0};
  window.__colossus.advance(0);
  scene.setView('city');scene.yaw=state.faction==='kaiju'?2.35:.72;scene.pitch=.64;scene.zoom=78;
 });
 await settle(page);
}

try{
 for(const viewport of result.viewports.slice(0,2)){
  const suffix=`${viewport.width}x${viewport.height}`;
  for(const faction of ['kaiju','crawler','airship']){
   const {context,page}=await openGame(viewport);
   try{
    if(faction!=='kaiju'){await page.locator(`[data-faction="${faction}"]`).click();await settle(page);}
    await capture(page,`title-${faction}-${suffix}`);await inspect(page,`title-${faction}-${suffix}`);
    await page.locator('#begin').click();await settle(page);
    await capture(page,`city-${faction}-${suffix}`);await inspect(page,`city-${faction}-${suffix}`);
    await page.locator('[data-view="world"]').click();await settle(page);
    await capture(page,`world-${faction}-${suffix}`);await inspect(page,`world-${faction}-${suffix}`,true);
    await page.locator('[data-view="city"]').click();
    await developedCity(page);
    await page.screenshot({path:path.join(output,`developed-${faction}-${suffix}.png`),style:'#hud,#markers,#toast,#paused-banner,.vignette{visibility:hidden!important}'});
    screenshots.push(`developed-${faction}-${suffix}.png`);await inspect(page,`developed-${faction}-${suffix}`,true);
    if(faction==='kaiju'&&viewport.width===1440){
     assert.equal(await page.evaluate(()=>window.__colossus.scene.quality),'high','Initial detail preset is high.');
     await inspect(page,'quality-high-developed-1440x960',true);
     for(const quality of ['balanced','performance','high']){
      await page.locator('#quality').click();await settle(page);
      assert.equal(await page.evaluate(()=>window.__colossus.scene.quality),quality,`Detail UI selects ${quality}.`);
      await capture(page,`quality-${quality}-1440x960`);await inspect(page,`quality-${quality}-1440x960`,quality!=='high');
     }
     for(const light of ['day','dusk','night']){
      if(light!=='day'){await page.locator('#lighting').click();await settle(page);}
      assert.equal(await page.evaluate(()=>window.__colossus.scene.light),light,`Lighting UI selects ${light}.`);
      const file=`developed-kaiju-${light}-1440x960.png`;
      await page.screenshot({path:path.join(output,file),style:'#hud,#markers,#toast,#paused-banner,.vignette{visibility:hidden!important}'});
      screenshots.push(file);await inspect(page,`developed-kaiju-${light}-1440x960`);
     }
     await page.locator('#lighting').click();await settle(page);
     assert.equal(await page.evaluate(()=>window.__colossus.scene.light),'day','Lighting restores daylight.');
     checks.push('Actual detail and lighting controls cycle all presets, restoring high/day without browser errors or WebGL context loss.');
    }
    await page.evaluate(()=>{const scene=window.__colossus.scene;scene.zoom=scene.city.layout==='circular'?32:49;scene.pitch=.86;});await settle(page);
    await page.screenshot({path:path.join(output,`districts-${faction}-${suffix}.png`),style:'#hud,#markers,#toast,#paused-banner,.vignette{visibility:hidden!important}'});
    screenshots.push(`districts-${faction}-${suffix}.png`);await inspect(page,`districts-${faction}-${suffix}`);
    checks.push(`${faction} title, city, world, developed city, and close districts rendered at ${suffix}.`);
    console.log(`Captured ${faction} at ${suffix}.`);
   }finally{await context.close();activePage=null;}
  }
 }
 const viewport=result.viewports[2],{context,page}=await openGame(viewport);
 try{
  await capture(page,'title-kaiju-390x844');
  assert.equal((await inspect(page,'title-kaiju-390x844')).ui.horizontalOverflow,false,'390px title has no document overflow.');
  await page.locator('#begin').click();await settle(page);await capture(page,'city-kaiju-390x844');
  assert.equal((await inspect(page,'city-kaiju-390x844')).ui.horizontalOverflow,false,'390px city has no document overflow.');
  assert.equal(await page.locator('#buildings').isVisible(),true,'390px construction controls remain visible.');
  checks.push('390px title and city have no horizontal document overflow; construction controls are visible.');
 }finally{await context.close();activePage=null;}
 assert.deepEqual(remoteRequests,[],'No attempted remote requests.');assert.deepEqual(errors,[],'No browser errors.');
 checks.push('All renders have nonzero geometry and canvas dimensions, with no WebGL context loss, browser errors, or remote requests.');
}catch(error){
 result.failure=error.message;process.exitCode=1;
 if(activePage&&!activePage.isClosed())await activePage.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
}finally{
 await fs.writeFile(path.join(output,'graphics-results.json'),JSON.stringify(result,null,2));
 await browser.close();
}
console.log(JSON.stringify({output,screenshots:screenshots.length,checks,errors,remoteRequests,failure:result.failure||null},null,2));
