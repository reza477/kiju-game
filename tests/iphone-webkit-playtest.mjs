// Bounded real-game check in patched Windows WebKit, not physical iPhone Safari.
// Supply a frozen release or an explicitly identified isolated source server.
// This runner never builds or publishes its input.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFrozenRelease,createDeliveryServer} from './helpers/delivery-server.mjs';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';
const require=createRequire(import.meta.url);
const playwrightRoot=process.env.PLAYWRIGHT_PACKAGE_ROOT?path.resolve(process.env.PLAYWRIGHT_PACKAGE_ROOT):path.dirname(require.resolve('playwright/package.json'));
const {webkit}=require(playwrightRoot);
const {PNG}=require(path.join(path.dirname(playwrightRoot),'playwright-core/lib/utilsBundle.js'));
const playwrightVersion=JSON.parse(await fs.readFile(path.join(playwrightRoot,'package.json'),'utf8')).version;

const root=process.cwd(),out=path.resolve(process.env.OUTPUT_DIR||'artifacts/nov10-improvements/iphone/webkit-01');
const release=process.env.GAME_RELEASE_DIR?await readFrozenRelease(process.env.GAME_RELEASE_DIR):null;
const sourceBase=release?null:new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4230/');
if(sourceBase)assert.ok(['localhost','127.0.0.1'].includes(sourceBase.hostname)&&!['4178','4214'].includes(sourceBase.port),'Use an isolated loopback source server');
assert.ok(!await fs.stat(out).catch(()=>null),'Preserve previous evidence; choose a fresh OUTPUT_DIR');
await fs.mkdir(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function sourceFingerprint(){
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
 const roots=['src','assets','vendor','index.html','package.json','package-lock.json'];
 const files=[...new Set([...git('ls-files','--',...roots).split('\n'),...git('ls-files','--others','--exclude-standard','--',...roots).split('\n')])].filter(Boolean).sort();
 const hashes={};for(const file of files)hashes[file]=sha(await fs.readFile(path.join(root,file)));
 return {commit:git('rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
const sourceStart=release?null:await sourceFingerprint();
const expectedHashes=release?Object.fromEntries([...release.files].map(([name,file])=>[name,sha(file.bytes)])):Object.fromEntries(Object.entries(sourceStart.hashes).map(([name,hash])=>['/'+name,hash]));
const report={startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),cwd:root,environment:{...(release?{GAME_RELEASE_DIR:release.root}:{GAME_TEST_URL:sourceBase.href}),OUTPUT_DIR:out,WEBKIT_FLESH_ONLY:process.env.WEBKIT_FLESH_ONLY??null,PLAYWRIGHT_PACKAGE_ROOT:playwrightRoot}},toolSha256:sha(await fs.readFile(new URL(import.meta.url))),
  sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),buildId:release?.descriptor.buildId??'source-working-copy',releaseCommit:release?.descriptor.gitCommit??null,
  releaseDescriptorSha256:release?sha(release.files.get('/release.json').bytes):null,runtimeInventory:release?.descriptor.files??null,sourceStart,
  evidence:'Windows Playwright WebKit with phone viewport/touch emulation. Not branded Safari, physical iPhone, Home Screen installation, hosted authentication or sustained performance.',
  method:'Frozen real runtime; isolated production-generated saves; native Continue, panel and route taps; actual simulation time; viewport rotation; native save and reload. No response replacement or runtime state writes.',
  limitations:['Pinch and physical held-touch gestures are not exercised by this runner.','Service workers are blocked for this bounded rendering/control check; offline installation requires its separate check.'],visits:[],passed:false};
const write=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
const sim=await import(pathToFileURL(path.join(release?.root??root,'src/simulation.js')).href);
let browser,server,context,page,visit;
try{
  if(release)server=await createDeliveryServer({A:release});
  else{
    const health=await(await fetch(new URL('/health',sourceBase))).json();
    assert.equal(health.rootId,sha((await fs.realpath(root)).replaceAll('\\','/').replace(/\/$/,'').toLowerCase()));
    report.serverHealth=health;server={origin:sourceBase.origin};
  }
  report.origin=server.origin;
  browser=await webkit.launch({headless:true});report.browser={name:'Playwright WebKit',version:browser.version(),playwrightVersion,packageRoot:playwrightRoot,executable:webkit.executablePath(),platform:process.platform};
  for(const [faction,variant]of (process.env.WEBKIT_FLESH_ONLY==='1'?[['kaiju','flesh']]:[['kaiju','flesh'],['crawler','standard']])){
    const fixture=sim.createGame(faction,variant);fixture.resources.wood=fixture.resources.iron=1000;
    const raw=sim.serialize(fixture);assert.ok(sim.deserialize(raw));
    visit={faction,variant,fixtureSha256:sha(raw),profile:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},startedAt:new Date().toISOString(),errors:[],warnings:[],failedRequests:[],remoteRequests:[],servedHashes:{},screenshots:[],actions:[],passed:false};report.visits.push(visit);await write();
    context=await browser.newContext({...visit.profile,serviceWorkers:'block'});
    await context.addInitScript(({raw,key})=>{
      if(localStorage.getItem(key)===null)localStorage.setItem(key,raw);
      localStorage.setItem('colossus-quality-v1','performance');localStorage.setItem('colossus-camera-mode','steady');
    },{raw,key:sim.SAVE_KEY});
    page=await context.newPage();page.setDefaultTimeout(20000);
    const pending=[];
    page.on('pageerror',error=>visit.errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')visit.errors.push(message.text());else if(message.type()==='warning')visit.warnings.push(message.text());});
    page.on('requestfailed',request=>visit.failedRequests.push({url:request.url(),error:request.failure()}));
    page.on('request',request=>{const u=new URL(request.url());if(!['data:','blob:'].includes(u.protocol)&&u.origin!==server.origin)visit.remoteRequests.push(u.href);});
    page.on('response',response=>{
      const u=new URL(response.url()),file=u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname),expected=expectedHashes[file];
      if(u.origin===server.origin&&expected)pending.push(response.body().then(bytes=>{assert.equal(response.status(),200,file+' response');assert.equal(sha(bytes),expected,file+' served bytes');visit.servedHashes[file]=sha(bytes);}).catch(error=>{visit.errors.push(error.message);}));
    });
    const until=predicate=>waitForBrowserCondition(page,predicate,undefined,{timeoutMs:90000,pollingMs:100});
    const tap=selector=>page.locator(selector).tap();
    const panel=async name=>{if(await page.locator('body').getAttribute('data-mobile-panel')!==name)await tap(`[data-mobile-panel="${name}"]`);};
    const closePanel=async()=>{const button=page.locator('[data-close-panel]:visible').first();if(await button.count())await button.tap();};
    const snapshot=async()=>{
     const result=await page.evaluate(()=>{
      const {state,scene}=window.__colossus,gl=scene.renderer.getContext(),canvas=scene.renderer.domElement;
      return {variant:state.variant,time:state.time,x:state.x,z:state.z,paused:state.paused,mode:state.mode,target:state.target,
        renderedVariant:scene.city.variant,actorInScene:scene.city.root.parent===scene.scene,sceneStateMatches:scene.state===state,preview:scene.preview,
        buildings:state.buildings,towerOrder:state.towerOrder,quality:scene.quality,view:scene.view,
        overflow:document.documentElement.scrollWidth>innerWidth+1,canvas:[canvas.width,canvas.height],triangles:scene.renderer.info.render.triangles,renderFrame:scene.renderer.info.render.frame,
        contextLost:gl.isContextLost(),webglVersion:gl.getParameter(gl.VERSION),renderer:gl.getParameter(gl.RENDERER),
        bodyKind:scene.city.meshyCarrier?.kind??null,cargoY:scene.city.cargoOffsetY??null};
     });
     assert.equal(result.renderedVariant,result.variant,'Rendered carrier must match the loaded save, including after reload');
     assert.equal(result.actorInScene,true,'Loaded carrier must belong to the active scene');
     assert.equal(result.sceneStateMatches,true,'Renderer and HUD must use the same loaded state');
     assert.equal(result.preview,false,'Gameplay must not retain the title preview');
     if(result.variant==='flesh')assert.equal(result.bodyKind,'flesh','Loaded flesh game must render its native beast');
     return result;
    };
    const screenshot=async label=>{
      const file=`${variant}-${label}.png`,bytes=await page.screenshot({path:path.join(out,file),fullPage:false});
      const record={file,bytes:bytes.length,sha256:sha(bytes),original:true,phoneEmulation:true,capturedAt:new Date().toISOString()};visit.screenshots.push(record);
      // Decode original PNG in Node. Do not load media into the game or change
      // its CSP. This central landscape region excludes normal HUD/left toast.
      const png=PNG.sync.read(bytes),colors=new Set(),low=[255,255,255],high=[0,0,0];
      for(let y=0;y<12;y++)for(let x=0;x<12;x++){
        const offset=(Math.floor(png.height*(.35+y/11*.3))*png.width+Math.floor(png.width*(.4+x/11*.4)))*4,pixel=png.data.subarray(offset,offset+3);
        colors.add([...pixel].map(value=>Math.floor(value/16)).join(','));for(let c=0;c<3;c++){low[c]=Math.min(low[c],pixel[c]);high[c]=Math.max(high[c],pixel[c]);}
      }
      record.centralRaster={colorBuckets:colors.size,channelRange:Math.max(...high.map((value,index)=>value-low[index]))};return record;
    };
    const boot=async()=>{
      await until(()=>!!window.__colossus&&document.querySelector('#loading').classList.contains('hidden')||!document.querySelector('#error').classList.contains('hidden'));
      const error=await page.locator('#error').textContent();assert.equal(await page.locator('#error').isVisible(),false,error);
      assert.equal(await page.evaluate(()=>!!window.__colossus),true,'Game API must exist after real renderer startup');
      await tap('#continue');await until(()=>!document.querySelector('#hud').classList.contains('hidden'));
    };
    await page.goto(server.origin+'/?test=webkit-phone',{waitUntil:'domcontentloaded',timeout:90000});await boot();
    let initial=await snapshot();assert.equal(initial.variant,variant);assert.equal(initial.quality,'performance');assert.ok(initial.triangles>0);assert.equal(initial.contextLost,false);assert.equal(initial.overflow,false);
    if(variant==='flesh')assert.equal(initial.bodyKind,'flesh','Native beast must be loaded, not a fallback');visit.initial=initial;
    await screenshot('portrait-city');
    await panel('city');await tap('#district-overview summary');assert.equal(await page.locator('#district-roster button').count(),3);
    await tap('[data-district-slot="11"]');await tap('[data-upgrade="11"]');
    await until(()=>window.__colossus.state.buildings[11].upgrading===true);
    visit.actions.push({kind:'native-district-upgrade',state:await snapshot()});
    await panel('map');await tap('#destinations-toggle');await tap('[data-resource-id="forest"]');
    await until(()=>!!window.__colossus.state.target);const moving=await snapshot();
    await page.waitForTimeout(700);const moved=await snapshot();assert.ok(Math.hypot(moved.x-moving.x,moved.z-moving.z)>.01,'Native route must move the carrier');
    await panel('city');await tap('#stop-course');await until(()=>window.__colossus.state.target===null);
    const stopped=await snapshot();await page.waitForTimeout(500);const settled=await snapshot();assert.ok(Math.hypot(settled.x-stopped.x,settled.z-stopped.z)<1e-8);
    visit.actions.push({kind:'native-route-and-stop',before:moving,after:settled});
    await closePanel();await page.setViewportSize({width:844,height:390});await page.waitForTimeout(400);
    const landscape=await snapshot();assert.equal(landscape.overflow,false);assert.ok(landscape.triangles>0);assert.equal(landscape.contextLost,false);visit.landscape=landscape;await screenshot('landscape-city');
    await until(()=>window.__colossus.scene.renderer.info.render.frame>0);
    await page.waitForTimeout(1500);const delayed=await snapshot();
    assert.ok(delayed.renderFrame>landscape.renderFrame,'Native renderer frames must advance after rotation');
    const delayedImage=await screenshot('landscape-city-delayed');
    await tap('[data-view="world"]');await until(()=>window.__colossus.scene.view==='world');
    await tap('[data-view="city"]');await until(()=>window.__colossus.scene.view==='city');await page.waitForTimeout(1000);
    const inputImage=await screenshot('landscape-city-after-native-input');
    visit.actions.push({kind:'rotation-visual-probe',immediate:landscape,delayed,afterInput:await snapshot(),delayedImage:delayedImage.file,inputImage:inputImage.file});await write();
    visit.rotationVisibleAfterDelay=delayedImage.centralRaster.colorBuckets>8&&delayedImage.centralRaster.channelRange>24;
    await tap('#mobile-menu');await tap('[data-dialog-action="save"]');
    const saved=await page.evaluate(key=>localStorage.getItem(key),sim.SAVE_KEY),loaded=sim.deserialize(saved);assert.ok(loaded);assert.equal(loaded.variant,variant);assert.deepEqual(loaded.towerOrder,fixture.towerOrder);
    visit.saved={sha256:sha(saved),x:loaded.x,z:loaded.z,building:loaded.buildings[11]};
    await page.reload({waitUntil:'domcontentloaded'});await boot();
    const resumed=await snapshot();assert.equal(resumed.variant,variant);assert.deepEqual(resumed.towerOrder,loaded.towerOrder);assert.ok(Math.hypot(resumed.x-loaded.x,resumed.z-loaded.z)<1e-8);
    assert.equal(resumed.buildings[11].type,'housing');assert.ok(resumed.buildings[11].level>=loaded.buildings[11].level);
    visit.actions.push({kind:'native-save-and-reload',state:resumed});
    await screenshot('landscape-city-after-reload');await write();
    await Promise.all(pending);for(const file of ['/index.html','/src/main.js','/src/simulation.js','/src/flesh-saddle-profile.js'])assert.ok(visit.servedHashes[file],file+' verified response missing');
    if(variant==='flesh')assert.ok(visit.servedHashes['/assets/beast-integration/titanhorn-rigged.glb']);
    assert.deepEqual(visit.errors,[]);assert.deepEqual(visit.failedRequests,[]);assert.deepEqual(visit.remoteRequests,[]);
    assert.equal(visit.rotationVisibleAfterDelay,true,'Landscape remains visually blank after native frames and delay; native-input and reload captures retained for diagnosis');
    visit.passed=true;visit.finishedAt=new Date().toISOString();await write();await context.close();context=null;
  }
  if(release){const after=await readFrozenRelease(release.root);assert.deepEqual(after.descriptor,release.descriptor,'Frozen release changed during WebKit check');}
  else{report.sourceFinish=await sourceFingerprint();assert.equal(report.sourceFinish.fingerprint,report.sourceStart.fingerprint,'Runtime changed during WebKit check');}
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};if(page&&!page.isClosed())try{await page.screenshot({path:path.join(out,'failure.png'),fullPage:false});}catch{}process.exitCode=1;}
finally{if(context)await context.close();if(browser)await browser.close();if(server?.close){report.requests=server.requests;await server.close();}if(!release&&!report.sourceFinish)try{report.sourceFinish=await sourceFingerprint();}catch{}report.finishedAt=new Date().toISOString();report.exitCode=report.passed?0:1;await write();console.log(JSON.stringify({out,buildId:report.buildId,passed:report.passed,visits:report.visits.map(v=>({variant:v.variant,passed:v.passed})),error:report.error},null,2));}
