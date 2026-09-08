// Neutral capture tour for an independent reviewer. Run in an isolated profile;
// keeps the normal HUD, never evaluates aesthetic quality or assigns scores.
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const output=path.resolve(process.env.OUTPUT_DIR||'artifacts/art-review');
const url=new URL(process.env.GAME_BASE_URL||'http://127.0.0.1:4178/');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname));url.searchParams.set('test','1');
await fs.mkdir(output,{recursive:true});
const browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const report={time:new Date().toISOString(),browser:browser.version(),screenshots:[],errors:[],remote:[],views:[]};
try{
 for(const faction of ['kaiju','crawler','airship']){
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===url.origin||['data:','blob:'].includes(u.protocol))return route.continue();report.remote.push(u.href);return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  const shot=async name=>{await page.waitForTimeout(1000);const file=`${faction}-${name}.png`;await page.screenshot({path:path.join(output,file),style:'#paused-banner,#toast{visibility:hidden!important}'});report.screenshots.push(file);report.views.push(await page.evaluate(name=>{const {scene}=window.__colossus;return {name,view:scene.view,yaw:scene.yaw,pitch:scene.pitch,zoom:scene.zoom,contextLost:scene.renderer.getContext().isContextLost()};},file));};
  await page.goto(url.href);await page.waitForFunction(()=>window.__colossus?.scene?.city);
  if(faction!=='kaiju')await page.locator(`[data-faction="${faction}"]`).click();
  await shot('developed-title');await page.locator('#begin').click();await shot('default-city');
  await page.locator('[data-view="people"]').click();await shot('streets-a');await page.waitForTimeout(1300);await shot('streets-b');
  await page.locator('[data-view="city"]').click();
  if(faction==='kaiju'){
   await page.locator('[data-view="carrier"]').click();await shot('front');
   for(const [name,yaw]of [['rear',Math.PI],['side',Math.PI/2]]){await page.evaluate(yaw=>{const s=window.__colossus.scene;s.yaw=yaw;s.zoom=68;s.pitch=.27;},yaw);await shot(name);}
   await page.locator('[data-view="city"]').click();
   await page.evaluate(()=>{const {state,scene}=window.__colossus;state.rings=2;for(const i of [0,1,2,3,4,5,6,8,9,10,12,14,15,16,17,18,19])state.buildings[i]={type:i%5===0?'cannon':i%4===0?'farm':'housing',level:1+i%3,remaining:0};state.buildings[7].level=3;window.__colossus.advance(0);scene.zoom=36;scene.pitch=.7;scene.yaw=2.6;});await shot('developed-ring');
  }
  await page.locator('[data-view="world"]').click();await shot('world');
  await page.evaluate(()=>{const s=window.__colossus.scene;s.pitch=.25;s.zoom=200;s.yaw=2.2;});await shot('terrain-low');
  if(faction==='kaiju'){
   await page.locator('[data-view="carrier"]').click();await page.evaluate(()=>{const {state}=window.__colossus;state.target={x:state.x+22,z:state.z+8};});await shot('walk-a');await page.waitForTimeout(450);await shot('walk-b');
  }
  await page.evaluate(async()=>{const {startBattle}=await import('/src/simulation.js');const {state}=window.__colossus;state.x=state.enemies[0].x;state.z=state.enemies[0].z;startBattle(state,state.enemies[0].id);state.battle.autoFire=false;state.battle.enemyReload=999;state.paused=true;window.__colossus.advance(0);});await shot('battle-entry');
  await context.close();console.log(`Captured ${faction} review views.`);
 }
}catch(e){report.failure=e.message;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(output,'capture-report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,shots:report.screenshots.length,errors:report.errors,remote:report.remote,failure:report.failure||null}));
