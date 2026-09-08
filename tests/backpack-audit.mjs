/**
 * Ordinary local browser audit for the vertical kaiju castle backpack.
 * Isolated Chrome profile; no normal save changes and no GPU instrumentation.
 * Run only after model integration: node tests/backpack-audit.mjs
 * Optional OUTPUT_DIR (default artifacts/backpack-final) and GAME_BASE_URL.
 */
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}catch{playwright=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const output=path.resolve(process.env.OUTPUT_DIR||'artifacts/backpack-final');
const base=new URL(process.env.GAME_BASE_URL||'http://127.0.0.1:4178/');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'Audit uses a local server only.');
const gameUrl=new URL('?test=1',base);
await fs.mkdir(output,{recursive:true});
const report={capturedAt:new Date().toISOString(),gameUrl:base.href,environment:{node:process.version,platform:os.platform(),headless:true},checks:[],screenshots:[],layouts:[],clicks:[],errors:[],remoteRequests:[]};
const browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
report.environment.browser=browser.version();
let context,page;
const settle=()=>page.waitForTimeout(1000);
const cleanStyle='#hud,#markers,#toast,#paused-banner,.vignette{visibility:hidden!important}';

async function newGame(faction='kaiju'){
 if(context)await context.close();
 context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin===base.origin||['data:','blob:'].includes(url.protocol))return route.continue();
  report.remoteRequests.push({url:url.href,blocked:true});return route.abort('blockedbyclient');
 });
 page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(gameUrl.href,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__colossus?.scene?.city?.layout==='backpack',{},{timeout:15000});
 if(faction!=='kaiju')await page.locator(`[data-faction="${faction}"]`).click();
 await settle();
}
async function capture(name,clean=false){
 const file=name+'.png';await page.screenshot({path:path.join(output,file),...(clean?{style:cleanStyle}:{})});report.screenshots.push(file);
}
async function layout(name,expected){
 const data=await page.evaluate(name=>{
  const {scene,state}=window.__colossus,city=scene.city;
  return {name,faction:state.faction,layout:city.layout,deckY:city.deckY,positions:city.slotPositions.map(p=>({...p})),hitSlots:city.slots.map((hit,i)=>({index:i,slot:hit.userData.slot,x:hit.position.x,z:hit.position.z,baseY:hit.position.y-hit.scale.y*(hit.geometry.parameters.height||1)/2})),buildings:state.buildings.map(b=>b?{...b}:null),render:{...scene.renderer.info.render},memory:{...scene.renderer.info.memory},contextLost:scene.renderer.getContext().isContextLost()};
 },name);
 assert.equal(data.layout,expected,`${name}: expected carrier layout`);
 assert.equal(data.positions.length,20,`${name}: 20 authored plot positions`);
 assert.equal(data.hitSlots.length,20,`${name}: 20 interaction proxies`);
 assert.equal(data.buildings.length,20,`${name}: 20 simulation slot IDs`);
 assert.ok(data.positions.every(p=>[p.x,p.y,p.z].every(Number.isFinite)),`${name}: finite plot coordinates`);
 assert.deepEqual(data.hitSlots.map(h=>h.slot),Array.from({length:20},(_,i)=>i),`${name}: proxy slot identity`);
 for(let i=0;i<20;i++){
  assert.ok(Math.abs(data.hitSlots[i].x-data.positions[i].x)<.001,`${name}: plot ${i} x mapping`);
  assert.ok(Math.abs(data.hitSlots[i].z-data.positions[i].z)<.001,`${name}: plot ${i} z mapping`);
  assert.ok(Math.abs(data.hitSlots[i].baseY-data.positions[i].y)<.001,`${name}: plot ${i} tier elevation`);
 }
 const levels=[...new Set(data.positions.map(p=>p.y))].sort((a,b)=>a-b);
 assert.equal(levels.length,expected==='backpack'?4:1,`${name}: elevation tier count`);
 if(expected==='backpack'){
  assert.ok(levels.every(y=>data.positions.filter(p=>p.y===y).length===5),`${name}: five plots per tier`);
  assert.equal(new Set([0,5,10,15].map(i=>data.positions[i].y)).size,4,`${name}: representative index on every tier`);
 }
 assert.equal(data.contextLost,false,`${name}: WebGL context survives`);
 assert.ok(data.render.triangles>0,`${name}: rendered geometry`);
 report.layouts.push(data);return data;
}
async function angle(yaw,pitch=.3){
 await page.evaluate(({yaw,pitch})=>{const scene=window.__colossus.scene;scene.setView('city');scene.yaw=yaw;scene.pitch=pitch;},{yaw,pitch});
 await settle();
 // Fit through the public Three.js scene/camera data; do not modify render APIs.
 for(let attempt=0;attempt<5;attempt++){
  const fits=await page.evaluate(async()=>{
   const T=await import('/vendor/three.module.js');const scene=window.__colossus.scene;
   scene.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(scene.city.root);
   for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=scene.project(x,y,z);if(!p.visible||p.x<innerWidth*.08||p.x>innerWidth*.92||p.y<innerHeight*.06||p.y>innerHeight*.94)return false;
   }
   return true;
  });
  if(fits)return;
  await page.evaluate(()=>window.__colossus.scene.zoom*=1.17);await settle();
 }
}
async function clickSlot(index){
 // Looking from several directions keeps each actual click on an exposed proxy.
 // Ray tests only select a visible target point; UI text verifies the real click.
 for(const yaw of [Math.PI,.7,Math.PI/2,-Math.PI/2,0]){
  await angle(yaw,.46);
  const target=await page.evaluate(index=>{
   const {scene}=window.__colossus,hit=scene.city.slots[index];scene.scene.updateMatrixWorld(true);
   for(const height of [.46,.15,-.15]){
    const position=hit.getWorldPosition(scene.camera.position.clone());position.y+=hit.scale.y*height;
    const p=scene.project(position.x,position.y,position.z);
    if(!p.visible||document.elementFromPoint(p.x,p.y)?.id!=='world')continue;
    scene.pointer.set(p.x/innerWidth*2-1,-p.y/innerHeight*2+1);scene.ray.setFromCamera(scene.pointer,scene.camera);
    const first=scene.ray.intersectObjects([scene.city.hitGroup],true)[0];
    if(first?.object.userData.slot===index)return {x:p.x,y:p.y,yaw:scene.yaw};
   }
   return null;
  },index);
  if(!target)continue;
  await page.mouse.click(target.x,target.y);
  await page.waitForFunction(i=>document.querySelector('#selection .eyebrow')?.textContent.match(new RegExp(`^DISTRICT ${i+1}( ·|$)`)),index,{timeout:2000});
  report.clicks.push({slot:index,...target});return;
 }
 throw new Error(`No exposed canvas click target found for plot ${index+1} across five camera directions.`);
}
async function developed(){
 await page.evaluate(()=>{
  const {state,scene}=window.__colossus;
  state.paused=true;state.time=32.5;state.population=76;state.moving=false;state.target=null;
  const types=['housing','farm','cannon','foundry','armor','sawmill','housing'];
  state.buildings=Array.from({length:20},(_,i)=>({type:i===7?'keep':types[i%types.length],level:1+i%3,remaining:0}));
  window.__colossus.advance(0);scene.setView('city');
 });await settle();
}

try{
 const health=await fetch(new URL('health',base));assert.equal(health.status,200);assert.equal((await health.json()).app,'colossus-wake-local');
 const localIndex=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');assert.equal(await (await fetch(base)).text(),localIndex,'Live game matches current workspace index.');
 report.checks.push('Actual local game link returns the expected app and current workspace index.');
 await newGame();await capture('title-backpack');
 await page.locator('#begin').click();await settle();await capture('management-starting');
 assert.equal(await page.locator('#titan-view').isVisible(),true,'Kaiju has an actual Titan view control.');
 await page.locator('#titan-view').click();await settle();
 assert.equal(await page.evaluate(()=>window.__colossus.scene.view),'carrier');await capture('titan-button-starting');
 assert.ok(await page.evaluate(()=>{const {scene,state}=window.__colossus;return Math.cos(scene.yaw-state.angle)>0;}),'Titan camera faces the front hemisphere.');
 await page.keyboard.press('1');await settle();assert.equal(await page.evaluate(()=>window.__colossus.scene.view),'city');
 await page.keyboard.press('3');await settle();assert.equal(await page.evaluate(()=>window.__colossus.scene.view),'carrier','Key3 opens Titan view.');
 await page.locator('[data-view="city"]').click();await settle();
 assert.ok(await page.evaluate(()=>{const {scene,state}=window.__colossus;return Math.cos(scene.yaw-state.angle)<0;}),'City camera faces the rear castle hemisphere.');
 await capture('city-button-starting');report.checks.push('Actual Titan/City view controls and keys switch between front-body and rear-castle cameras.');
 const original=await layout('starting-kaiju','backpack');
 assert.equal(original.buildings.filter(Boolean).length,3,'Starting game retains three simulation buildings.');
 for(const [name,yaw]of [['front-positive-z',0],['side-positive-x',Math.PI/2],['rear-negative-z',Math.PI]]){await angle(yaw);await capture('starting-'+name,true);}
 for(const index of [0,5,10,15])await clickSlot(index);
 report.checks.push('All 20 plot IDs map to four elevations; actual canvas selection works on representative plots 0, 5, 10, 15.');
 for(const index of [0,5,10,15]){
  await page.locator('[data-building="sawmill"]').click();await page.locator(`[data-slot="${index}"]`).click();
  assert.equal(await page.evaluate(i=>window.__colossus.state.buildings[i]?.type,index),'sawmill',`DOM construction preserves slot ${index}`);
 }
 await page.evaluate(()=>window.__colossus.advance(8));await settle();
 await clickSlot(0);await page.locator('[data-upgrade="0"]').click();await page.evaluate(()=>window.__colossus.advance(9));await settle();
 assert.equal(await page.evaluate(()=>window.__colossus.state.buildings[0].level),2,'Upgrade preserves plot0 and reaches level2.');
 const upgraded=await layout('built-and-upgraded','backpack');assert.deepEqual(upgraded.positions,original.positions,'Building and upgrading preserve all 20 tier coordinates.');
 for(const index of [5,10,15])assert.equal(upgraded.buildings[index].level,1,`Upgrade leaves plot${index} unchanged.`);
 report.checks.push('Real DOM building orders on all four tiers and a plot 0 upgrade preserve plot IDs and elevations.');
 await page.locator('#save').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('colossus-wake-save-v1')));assert.equal(saved.version,1);
 await page.reload();await page.waitForFunction(()=>window.__colossus?.scene?.city?.layout==='backpack');await page.locator('#continue').click();await settle();
 const restored=await layout('resumed-save-v1','backpack');assert.deepEqual(restored.buildings,saved.buildings,'Version 1 save resumes every building in its original slot.');assert.deepEqual(restored.positions,original.positions);
 report.checks.push('Existing version 1 save format resumes all 20 slot identities and the new backpack layout.');
 await developed();await layout('developed-kaiju','backpack');
 for(const [name,yaw]of [['front-positive-z',0],['side-positive-x',Math.PI/2],['rear-negative-z',Math.PI]]){await angle(yaw);await capture('developed-'+name,true);}
 await page.locator('[data-view="world"]').click();await settle();await capture('world-backpack');
 await page.locator('[data-view="city"]').click();await settle();
 await page.setViewportSize({width:390,height:844});await settle();await capture('mobile-backpack');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'390px mobile layout has no document overflow.');
 assert.equal(await page.locator('#buildings').isVisible(),true);report.checks.push('390px viewport has no horizontal overflow and construction controls remain visible.');
 for(const faction of ['crawler','airship']){
  await newGame(faction);await capture(`title-${faction}`);await page.locator('#begin').click();await settle();
  assert.equal(await page.locator('#titan-view').isVisible(),false,'Titan view stays hidden for other factions.');await page.keyboard.press('3');assert.equal(await page.evaluate(()=>window.__colossus.scene.view),'city');
  const other=await layout(`starting-${faction}`,'deck');assert.equal(other.buildings.filter(Boolean).length,3);await capture(`management-${faction}`);
  await page.locator('[data-building="sawmill"]').click();await page.locator('[data-slot="0"]').click();await page.evaluate(()=>window.__colossus.advance(8));
  assert.equal(await page.evaluate(()=>window.__colossus.state.buildings[0]?.type),'sawmill');
  report.checks.push(`${faction} retains its normal 20 plot deck and functional building UI.`);
 }
 assert.deepEqual(report.errors,[],'No browser errors.');assert.deepEqual(report.remoteRequests,[],'No attempted remote requests.');
 report.checks.push('All renders are valid, with no browser errors, WebGL context loss, or remote requests.');
}catch(error){
 report.failure=error.message;process.exitCode=1;
 if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
}finally{
 await fs.writeFile(path.join(output,'backpack-results.json'),JSON.stringify(report,null,2));
 await browser.close();
}
console.log(JSON.stringify({output,screenshots:report.screenshots.length,checks:report.checks,errors:report.errors,remoteRequests:report.remoteRequests,failure:report.failure||null},null,2));
