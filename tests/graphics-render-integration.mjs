// Matching frozen frames isolate citizen culling; normal UI checks the lantern.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/graphics-09-builder-02/integration');await fs.mkdir(out,{recursive:true});
const report={fixture:'Same camera, time, lighting and geometry for paired native-culling renders. Image hashes compare canvas PNGs captured immediately after rendering. Submission counts are not measured GPU frame rates.',errors:[],remote:[],lanterns:[],pairs:[]};
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--mute-audio']});
try{
 for(const variant of ['cyborg','flesh']){
  const context=await browser.newContext({viewport:{width:1440,height:960}});await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0,null,{timeout:60000});
  await page.locator(`[data-variant="${variant}"]`).click();await page.locator('#begin').click();await page.evaluate(()=>{window.__colossus.state.paused=true;});
  for(const [view,floor,mode]of [['city',null,'day'],['people',0,'night'],['people',1,'night'],['world',null,'day']]){
   await page.locator(`[data-view="${view}"]`).click();
   if(view==='people')await page.locator('#tower-floor').selectOption(String(floor));
   const state=await page.evaluate(mode=>{const {state:s,scene:g}=window.__colossus;g.setLighting(mode);for(let i=0;i<22;i++)g.update(s,.1,null);const slot=g.cityLighting.slots[0];return{floor:g.city.inspectedFloor,lantern:slot.search.visible,spot:slot.spot.intensity,quality:g.quality,surfaces:g.surfaceDiagnostics()};},mode);
   assert.deepEqual(state.surfaces.failures,[]);assert.equal(state.surfaces.pending,0);assert.equal(state.lantern,!(view==='people'&&floor===0));
   if(view==='people')assert.equal(state.spot>0,floor!==0);
   const name=`${variant}-${view}-${floor??'all'}-${mode}`;report.lanterns.push({name,...state});
   if(view==='people')await page.screenshot({path:path.join(out,name+'.png'),style:'#paused-banner,#toast{visibility:hidden!important}'});
   const pair=await page.evaluate(()=>{
    const {scene:g}=window.__colossus,meshes=[g.city,...g.enemyCities].flatMap(c=>Object.values(c.people.instances)),take=enabled=>{
     for(const m of meshes)m.frustumCulled=enabled;
     for(let i=0;i<3;i++)g.presentation.render(g.scene);
     return{render:{...g.renderer.info.render},png:g.canvas.toDataURL('image/png')};
    };
    return{unculled:take(false),native:take(true)};
   });
   const raw=value=>Buffer.from(value.split(',')[1],'base64'),hash=value=>createHash('sha256').update(raw(value)).digest('hex');
   const same=hash(pair.unculled.png)===hash(pair.native.png);report.pairs.push({name,identicalPixels:same,unculled:pair.unculled.render,native:pair.native.render});
   if(!same){await fs.writeFile(path.join(out,name+'-unculled.png'),raw(pair.unculled.png));await fs.writeFile(path.join(out,name+'-native.png'),raw(pair.native.png));}
   assert.ok(same,`${name}: culling changes the frozen rendered image`);assert.ok(pair.native.render.triangles<=pair.unculled.render.triangles);
  }
  await context.close();console.log(`Verified lanterns and paired frames: ${variant}`);
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.ok(report.pairs.some(p=>p.native.triangles<p.unculled.triangles),'At least one matching view must remove off-screen submissions');
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await fs.writeFile(path.join(out,'integration-report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
