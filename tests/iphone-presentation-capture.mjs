// Matched actual-HUD evidence. Fixtures use production simulation and cameras.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright');}catch{pw=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:4192',out=path.resolve(process.env.OUTPUT_DIR||'artifacts/iphone-pass1/after');
await fs.mkdir(out,{recursive:true});
const report={base,createdAt:new Date().toISOString(),fixture:'Matched drill crawler, day/steady City camera, initial resources; one normal purchased workshop. Simulation waiting and camera settlement stepped for repeatable stills; battle positioned near rival through explicit fixture. Full production HUD, no render/style substitutions.',captures:[],errors:[]};
const browser=await pw.chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});report.browser=browser.version();
async function settle(page){await page.evaluate(()=>{const a=window.__colossus;a.state.target=null;a.state.time=12;a.advance(0);for(let i=0;i<90;i++)a.scene.update(a.state,1/60,null);a.refreshMarkers();});await page.waitForTimeout(160);await page.evaluate(()=>window.__colossus.refreshMarkers());}
try{
 for(const [label,width,height,mobile]of [['portrait',390,844,true],['landscape',844,390,true],['desktop',1440,960,false]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
  await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===base||['data:','blob:'].includes(u.protocol)?r.continue():r.abort();});
  const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(quality=>{localStorage.setItem('colossus-quality-v1',quality);localStorage.setItem('colossus-camera-mode','steady');window.requestAnimationFrame=()=>0;},mobile?'performance':'high');
  await page.goto(base+'/?test=1');await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);
  await page.locator('[data-faction="crawler"]').click();await page.locator('[data-variant="drill"]').click();await page.locator('#begin').click();
  await page.evaluate(()=>{const a=window.__colossus;a.scene.yaw=.72;a.scene.pitch=.55;a.scene.zoom=80;});
  async function shot(name){await settle(page);const file=`${label}-${name}.png`;await page.screenshot({path:path.join(out,file)});report.captures.push({file,...await page.evaluate(async()=>{const a=window.__colossus,g=a.scene,{BUILD_ID}=await import('/src/build-info.js');return{build:BUILD_ID,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,buffer:[g.canvas.width,g.canvas.height],quality:g.quality,view:g.view,camera:g.camera.position.toArray(),aim:g.cameraAim.toArray(),variant:a.state.variant,time:a.state.time,mode:a.state.mode,populationVisible:!!document.querySelector('#population').getClientRects().length};}),device:mobile?'desktop Chromium touch emulation; not physical iPhone':'desktop Chromium'});}
  await shot('gameplay-population');
  if(mobile)await page.locator('[data-mobile-panel="map"]').click();
  const rect=await page.locator('#minimap').boundingBox(),node=await page.evaluate(()=>window.__colossus.state.nodes[0]);
  await page.mouse.click(rect.x+(node.x+180)/360*rect.width,rect.y+(node.z+180)/360*rect.height);await shot('resource');
  if(mobile)await page.locator('[data-mobile-panel="build"]').click();
  await page.locator('[data-building="sawmill"]').click();await page.locator('[data-slot="0"]').click();await shot('construction');
  await page.evaluate(()=>window.__colossus.advance(8));await shot('upgrade');
  await page.locator('#menu').click();await shot('settings');await page.locator('[data-dialog-action="playtest"]').click();await shot('playtest');
  await page.locator('[data-dialog-action="close"]').click();
  await page.evaluate(async()=>{const{startBattle}=await import('/src/simulation.js'),a=window.__colossus,e=a.state.enemies[0];a.state.x=e.x-32;a.state.z=e.z;assertFixture(startBattle(a.state,e.id));a.advance(0);function assertFixture(x){if(!x)throw Error('Battle fixture failed');}});await shot('battle');
  await context.close();console.log('Captured '+label);
 }
 assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'capture-report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({captures:report.captures.length,errors:report.errors,failure:report.failure}));

