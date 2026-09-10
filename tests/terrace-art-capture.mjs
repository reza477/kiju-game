// Actual crawler travel on the Westbank Shelf; normal HUD, unchanged assets.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/graphics-09-builder-04/terrace-carriers');await fs.mkdir(out,{recursive:true});
const report={fixture:'Normal1440x960HUD. Real travel/tick/placeCity/animateCity over two labeled terrace routes. Initial positions and camera are controlled; no asset, terrain, lighting or geometry substitutions.',shots:[],errors:[],remote:[]};
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--mute-audio']});
try{
 for(const variant of ['standard','drill']){
  const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();page.setDefaultTimeout(120000);
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4178'||['blob:','data:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await page.goto('http://127.0.0.1:4178/?test=1');
  await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);
  await page.locator('[data-faction="crawler"]').click();await page.locator(`[data-variant="${variant}"]`).click();await page.locator('#begin').click();await page.locator('[data-view="world"]').click();
  for(const route of [{name:'across',from:[-46,74],to:[16,74]},{name:'along',from:[-7,36],to:[-7,118]}]){
   await page.evaluate(async r=>{const{state:s,scene:g}=window.__colossus,{travel}=await import('/src/simulation.js');s.x=r.from[0];s.z=r.from[1];s.angle=Math.atan2(r.to[0]-s.x,r.to[1]-s.z);s.paused=false;s.speed=1;g.setLighting('day');travel(s,...r.to);},route);
   for(const[fraction,angle,name]of[[.28,.35,'front'],[.52,1.6,'side'],[.76,3.0,'reverse']]){
    const data=await page.evaluate(async({route,fraction,angle})=>{const{state:s,scene:g,advance,refreshMarkers}=window.__colossus,{tick}=await import('/src/simulation.js');
     const initial=Math.hypot(route.to[0]-route.from[0],route.to[1]-route.from[1]);let frames=0;
     while(Math.hypot(route.to[0]-s.x,route.to[1]-s.z)>initial*(1-fraction)&&frames++<1000){tick(s,.1);advance(0);g.update(s,.1,null);}
     g.yaw=s.angle+angle;g.pitch=.18;g.zoom=s.variant==='drill'?83:68;g.snapCamera=true;tick(s,.05);advance(0);g.update(s,.05,null);refreshMarkers();
     return{x:s.x,z:s.z,time:s.time,moving:s.moving,heading:s.angle,position:g.city.root.position.toArray(),rotation:g.city.root.quaternion.toArray(),camera:g.camera.position.toArray(),contextLost:g.renderer.getContext().isContextLost(),render:{...g.renderer.info.render}};
    },{route,fraction,angle});
    assert.equal(data.moving,true);assert.equal(data.contextLost,false);assert.ok([...data.position,...data.rotation,...data.camera].every(Number.isFinite));
    const file=`${variant}-${route.name}-${name}.png`;await page.screenshot({path:path.join(out,file),style:'#paused-banner,#toast{visibility:hidden!important}'});report.shots.push({file,variant,route:route.name,...data});
   }
  }await context.close();
 }
 assert.equal(report.shots.length,12);assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({out,shots:report.shots.length,errors:report.errors,remote:report.remote,failure:report.failure}));
