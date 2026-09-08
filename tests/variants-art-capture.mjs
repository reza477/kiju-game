// Neutral art-review runner. Uses the product HUD and real models; the test-only
// clock advances gameplay without waiting for wall time. Expanded-city fixtures
// are labeled explicitly. No material, geometry or environment substitutions.
import {createRequire} from 'node:module';import path from 'node:path';import {homedir} from 'node:os';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright');}catch{pw=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/variants-builder-01');await fs.mkdir(out,{recursive:true});
const browser=await pw.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--mute-audio']});
const report={fixture:'1440x960 normal HUD. Existing tick/render/UI functions advance under deterministic clock. Populated upper-ward shots use a labeled late-game building fixture after paid expansion. Only transient pause/toast overlays hidden.',screenshots:[],observations:[],checks:[],errors:[],remote:[]};
const versions={cyborg:'kaiju',flesh:'kaiju',standard:'crawler',drill:'crawler',horizontal:'airship',vertical:'airship'};
const selected=process.env.VARIANTS?process.env.VARIANTS.split(','):Object.keys(versions);assert.ok(selected.every(v=>versions[v]));report.variants=selected;
const step=(p,t)=>p.evaluate(t=>window.__reviewStep(t),t);
async function capture(page,name){
 const data=await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),{state:s,scene:g}=window.__colossus,c=g.city;
  const bounds=new T.Box3();c.root.traverse(o=>{if(o.isMesh&&o.material?.visible!==false&&!o.userData.slot&&!o.userData.enemy){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
  return {variant:s.variant,faction:s.faction,rings:s.rings,view:g.view,lighting:g.light,time:s.time,camera:g.camera.position.toArray(),aim:g.cameraAim.toArray(),zoom:g.zoom,visibleFloor:c.inspectedFloor,people:c.people?.populationCount,occupiedFloors:c.people?.group.userData.occupiedFloors,envelopes:c.envelopes?.length,drillRotation:c.drill?.rotation.z,contextLost:g.renderer.getContext().isContextLost(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},render:{...g.renderer.info.render}};
 });assert.ok(data.camera.every(Number.isFinite));assert.equal(data.contextLost,false);assert.ok(data.bounds.min.every(Number.isFinite)&&data.bounds.max.every(Number.isFinite));report.observations.push({name,...data});
 await page.screenshot({path:path.join(out,name+'.png'),style:'#paused-banner,#toast{visibility:hidden!important}'});report.screenshots.push(name+'.png');return data;
}
try{
 for(const variant of selected){const faction=versions[variant];
  const context=await browser.newContext({viewport:{width:1440,height:960}});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4178'||['blob:','data:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>window.__colossus?.scene.environmentReady && window.__colossus.scene.surfaceDiagnostics().pending===0);
  await page.evaluate(()=>{window.__reviewStep=async(seconds)=>{const {tick}=await import('/src/simulation.js');const a=window.__colossus,n=Math.max(1,Math.ceil(seconds/.1));for(let i=0;i<n;i++){const dt=seconds/n;tick(a.state,dt);a.advance(0);a.scene.update(a.state,dt,null);a.refreshMarkers();}};});
  await page.locator(`[data-faction="${faction}"]`).click();await page.locator(`[data-variant="${variant}"]`).click();await step(page,1.8);await capture(page,variant+'-title');
  assert.equal(await page.locator(`[data-variant="${variant}"]`).getAttribute('aria-pressed'),'true');
  await page.locator('#begin').click();await page.evaluate(()=>{window.__colossus.state.paused=true;});await step(page,1.8);await capture(page,variant+'-city');
  assert.equal(await page.evaluate(()=>window.__colossus.state.variant),variant);
  if(faction==='kaiju'){await page.locator('[data-view="carrier"]').click();}else await page.evaluate(()=>{const g=window.__colossus.scene;g.pitch=.25;g.zoom=g.city.variant==='vertical'?110:100;});
  await step(page,1.5);await capture(page,variant+'-body');
  if(faction==='kaiju'){await page.evaluate(()=>window.__colossus.scene.zoom=64);await step(page,1.5);await capture(page,variant+'-body-close');await page.evaluate(()=>window.__colossus.scene.zoom=100);}
  await page.evaluate(()=>{const {state:s,scene:g}=window.__colossus;s.paused=false;s.target={x:s.x+10,z:s.z+25};g.setLighting('dusk');});await step(page,.8);const a=await capture(page,variant+'-moving-a');await step(page,.6);const b=await capture(page,variant+'-moving-b');assert.ok(b.time>a.time);
  await page.evaluate(()=>{const s=window.__colossus.state;s.paused=true;s.target=null;});
  await page.locator('[data-view="people"]').click();await step(page,1.5);await capture(page,variant+'-streets');
  if(faction==='kaiju'){
   await page.locator('[data-view="city"]').click();await page.locator('#expand-ring').click();await page.evaluate(()=>{window.__colossus.state.paused=false;window.__colossus.advance(12.5);window.__colossus.state.paused=true;});await step(page,.2);
   assert.equal(await page.evaluate(()=>window.__colossus.state.rings),2);
   await page.evaluate(()=>{const {state:s,scene:g}=window.__colossus;for(let i=0;i<20;i++)if(!s.buildings[i])s.buildings[i]={type:i%4===0?'cannon':i%3===0?'housing':i%3===1?'foundry':'farm',level:1,remaining:0};g.setView('city');});await step(page,1.5);await capture(page,variant+'-expanded-city');
   await page.evaluate(()=>{const g=window.__colossus.scene;g.yaw+=Math.PI;g.pitch=.19;g.zoom=94;});await step(page,1.5);await capture(page,variant+'-expanded-reverse');
   await page.locator('#tower-floor').selectOption('2');await step(page,1.5);const middle=await capture(page,variant+'-level3-streets');assert.equal(middle.visibleFloor,2);
   await page.locator('#tower-floor').selectOption('4');await step(page,1.5);const crown=await capture(page,variant+'-level5-streets');assert.equal(crown.visibleFloor,4);
  }
  if(variant==='vertical'){
   assert.equal(await page.evaluate(()=>window.__colossus.scene.city.envelopes.filter(o=>o.userData.carrierEnvelope==='vertical').length),4);
   await page.locator('[data-view="world"]').click();await step(page,1.5);await capture(page,'six-variant-world');
   await page.setViewportSize({width:390,height:844});await step(page,1);await capture(page,'vertical-mobile');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.locator('#save').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('colossus-wake-save-v1')).variant);assert.equal(saved,variant);
  report.checks.push(`${variant}: selected in UI, rendered, moved, inspected and saved.`);await context.close();console.log('Captured '+variant);
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'capture-report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output:out,shots:report.screenshots.length,errors:report.errors,remote:report.remote,failure:report.failure}));
