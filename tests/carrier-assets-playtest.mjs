// Carrier-only capture/motion evidence. Uses isolated saves and ordinary native
// simulation/controls. Does not change the earlier pilot harness or run timings.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {installMeshyObserver} from './helpers/meshy-native-observer.mjs';
import {installCarrierObserver} from './helpers/carrier-native-observer.mjs';
import {profiles,nextNativeSegment} from './helpers/meshy-pilot-config.mjs';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';

export const carrierVariants = Object.freeze([
  {faction:'kaiju',variant:'cyborg'},{faction:'kaiju',variant:'flesh'},
  {faction:'crawler',variant:'standard'},{faction:'crawler',variant:'drill'},
  {faction:'airship',variant:'horizontal'},{faction:'airship',variant:'vertical'},
]);
export const carrierBaseline = Object.freeze({
  commit:'383fb6277041e49e2d71b1918ab1ee5e1e50ba14',
  runtimeCommit:'f1c2541e7e430e1f6fdfbe00fbd2bf7245bf36a0',
  runtimeFingerprint:'dee57c47ba1f50d5f9c4c217b7802fd788721ff9b36aa259aecde4752654a760',
});
export const carrierMotionRoutes=Object.freeze([
  {name:'courtyard-direction-changes',waypoints:[[-50,38],[-50,58],[-30,60],[-30,40]]},
  {name:'ridge-slalom',waypoints:[[-22,18],[-4,25],[-16,44],[-30,40]]},
  {name:'grove-approach-and-return',waypoints:[[-52,12],[-65,-2],[-42,8],[-30,40]]},
]);
export function carrierCaptureCases(){
  const views=[
    {view:'desktop-normal',profile:'desktop',camera:{preset:'normal-city',yawOffset:0,zoomFactor:1}},
    {view:'desktop-reverse',profile:'desktop',camera:{preset:'normal-city',yawOffset:Math.PI,zoomFactor:1}},
    {view:'desktop-close',profile:'desktop',camera:{preset:'normal-city',yawOffset:0,zoomFactor:.75}},
    {view:'phone-portrait',profile:'phone-portrait',camera:{preset:'normal-city',yawOffset:0,zoomFactor:1}},
    {view:'phone-landscape',profile:'phone-landscape',camera:{preset:'normal-city',yawOffset:0,zoomFactor:1}},
  ];
  return [
    ...['cyborg','flesh'].flatMap(variant=>views.map(view=>({...view,faction:'kaiju',variant,name:variant+'-'+view.view,set:'primary-five',position:{x:-30,z:40}}))),
    ...carrierVariants.map(v=>({...v,name:'six-variants-'+v.variant,set:'extra-six',view:'desktop-normal',profile:'desktop',position:{x:-30,z:40},camera:{preset:'normal-city',yawOffset:0,zoomFactor:1}})),
  ];
}
const toolRoot=fileURLToPath(new URL('..',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const sourcePaths=['src','index.html','assets','vendor','package.json','package-lock.json'];
async function fingerprint(root,names){
  names??=[...new Set([...git(root,'ls-files',...sourcePaths).split('\n'),...git(root,'ls-files','--others','--exclude-standard','src','assets','vendor').split('\n')])];
  const hashes={};for(const name of names.filter(Boolean).sort())hashes[name]=sha(await fs.readFile(path.join(root,name)));
  return{root,commit:git(root,'rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}

export async function runCarrierAssetsPlaytest(){
  const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/carrier-assets/playtest'),mode=process.env.MODE||'capture',label=process.env.RUN_LABEL||'candidate';
  assert.ok(['capture','motion','timing'].includes(mode));assert.ok(['baseline','candidate'].includes(label));
  const root=await fs.realpath(path.resolve(process.env.SOURCE_ROOT||toolRoot)),fixtureRoot=await fs.realpath(path.resolve(process.env.FIXTURE_ROOT||root));
  const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4214/');
  assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'Local game only.');
  await fs.mkdir(out,{recursive:true});
  assert.equal((await fs.readdir(out)).length,0,'Use a new empty directory; never overwrite failed evidence.');
  const commandKeys=['MODE','RUN_LABEL','OUTPUT_DIR','SOURCE_ROOT','FIXTURE_ROOT','GAME_TEST_URL','PROFILE','VARIANT','CAPTURE_SET','COMPARE_BEFORE','RESUME_FROM','HEADLESS','GPU_TIMING'];
  const report={protocol:'carrier-assets-native-v1',startedAt:new Date().toISOString(),mode,label,baseline:carrierBaseline,
    command:{executable:process.execPath,args:process.argv.slice(1),environment:Object.fromEntries(commandKeys.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))},
    method:'Fresh isolated browser context/save per case. Unmodified baseline createGame data, ordinary Continue click, real canvas orbit/wheel/touch, normal City view with HUD and native continuously running RAF. No time override, frame pumping, pause or runtime state mutation. Timing mode separately observes three varied closed routes, each first traversal then warmed repeat; it does not force native game timestamps/poses/endpoints to match.',
    limitations:['Windows Chrome touch/viewport emulation is not physical iPhone/iPad/Safari testing.','Live simulation time and animated pose may differ between before/after; fixture, framing, profile and input targets are fixed, and actual values remain recorded.','No GPU/RAF timing claims, long session, release/update/offline gate or independent art review are supplied by this tool.','Baseline full source includes separately recorded unreferenced additions; baseline tracked production files must match the frozen source fingerprint.'],
    visits:[],pairs:[],passed:false};
  const write=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  await write();
  let browser,context,page,cdp,beforeReport;
  const until=(predicate,arg,timeoutMs=120000)=>waitForBrowserCondition(page,predicate,arg,{timeoutMs,pollingMs:75});
  const snapshot=()=>page.evaluate(()=>window.__meshyProbe.snapshot());
  const tap=async selector=>{const locator=page.locator(selector);if(context._carrierMobile)await locator.tap();else await locator.click();};
  const trackedBaseline=git(root,'ls-tree','-r','--name-only',carrierBaseline.commit,'--',...sourcePaths).split('\n');
  async function assertBaseline(){
    assert.equal(git(root,'diff',carrierBaseline.commit,'--',...sourcePaths),'','Baseline tracked runtime/assets changed.');
    const source=await fingerprint(root,trackedBaseline);assert.equal(source.fingerprint,carrierBaseline.runtimeFingerprint,'Frozen baseline content mismatch.');return source;
  }
  async function nativeCamera(target,visit){
    const point=await page.evaluate(()=>{const c=window.__colossus.scene.renderer.domElement;for(const y of [.48,.38,.58,.28])for(const x of [.5,.4,.6,.3,.7]){const px=innerWidth*x,py=innerHeight*y;if(document.elementFromPoint(px,py)===c)return{x:px,y:py};}throw Error('No unoccluded native canvas drag start.');});
    const strokes=[];
    for(let tries=0;tries<20;tries++){
      const current=(await snapshot()).environment.camera,dx=Math.max(-70,Math.min(70,(current.yaw-target.yaw)/.006)),dy=Math.max(-45,Math.min(45,(target.pitch-current.pitch)/.004));
      if(Math.abs(dx)<.3&&Math.abs(dy)<.3)break;
      // The production six-pixel drag threshold must be crossed before correction.
      if(visit.profile.mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+8,y:point.y,id:1}]});for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+8+(dx-8)*n/8,y:point.y+dy*n/8,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
      else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+8,point.y);await page.mouse.move(point.x+dx,point.y+dy,{steps:8});await page.mouse.up();}
      strokes.push({dx,dy,point,after:(await snapshot()).environment.camera});
    }
    const before=(await snapshot()).environment.camera;
    if(Math.abs(before.zoom-target.zoom)>.02){
      assert.equal(visit.profile.mobile,false,'Phone captures retain the ordinary City zoom.');
      await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,(target.zoom-before.zoom)/.06);
    }
    const actual=(await snapshot()).environment.camera;
    for(const key of ['yaw','pitch','zoom'])assert.ok(Math.abs(actual[key]-target[key])<.012,'Native camera '+key+' mismatch');
    visit.cameraInput={target,actual,point,strokes,method:visit.profile.mobile?'Native canvas single-touch orbit; default City zoom':'Native canvas mouse orbit and wheel'};
  }
  async function diagnostic(){return page.evaluate(()=>{
    const {scene:g,state:s}=window.__colossus,gl=g.renderer.getContext(),adapter=g.city.meshyCarrier;let invalidMatrices=0,skinnedMeshes=0,bones=0;
    g.city.root.traverse(o=>{if(o.matrixWorld.elements.some(n=>!Number.isFinite(n)))invalidMatrices++;if(o.isSkinnedMesh){skinnedMeshes++;bones+=o.skeleton.bones.length;if(o.skeleton.boneMatrices.some(n=>!Number.isFinite(n)))invalidMatrices++;}});
    return{faction:s.faction,variant:s.variant,contextLost:gl.isContextLost(),glError:gl.getError(),invalidMatrices,skinnedMeshes,bones,
      shaderFailures:(g.renderer.info.programs??[]).filter(p=>p.diagnostics?.runnable===false).map(p=>p.name),
      environmentReady:g.environmentReady,environmentError:g.environmentError,surface:g.surfaceDiagnostics(),
      carrier:adapter?{kind:adapter.kind??null,metrics:adapter.metrics?structuredClone(adapter.metrics):null,
        controller:typeof adapter.controller?.status==='function'?structuredClone(adapter.controller.status()):null,
        importedCapabilities:adapter.instance?.capabilities?structuredClone(adapter.instance.capabilities):null}:null,
      buildings:structuredClone(s.buildings),towerOrder:Array.isArray(s.towerOrder)?[...s.towerOrder]:null,cityType:document.getElementById('city-type').textContent};
  });}
  function validate(state,diag,item){
    assert.equal(diag.faction,item.faction);assert.equal(diag.variant,item.variant);assert.equal(diag.contextLost,false);assert.equal(diag.glError,0);assert.equal(diag.invalidMatrices,0);assert.deepEqual(diag.shaderFailures,[]);
    if(label==='candidate'&&item.faction==='kaiju'){assert.equal(diag.carrier?.kind,item.variant,'Candidate must render its imported carrier, not pass using a fallback body.');assert.ok(diag.skinnedMeshes>0&&diag.bones>0,'Candidate imported rig is missing.');}
    assert.equal(diag.environmentReady,true);assert.equal(diag.environmentError,null);assert.equal(diag.surface.pending,0);assert.deepEqual(diag.surface.failures,[]);
    assert.equal(state.state.paused,false);assert.equal(state.state.speed,1);assert.equal(state.state.mode,'expedition');assert.equal(state.environment.camera.view,'city');assert.equal(state.environment.camera.mode,'steady');
    assert.equal(state.hud.visible,true);assert.equal(state.hud.dialogOpen,false);assert.equal(state.hud.pauseOverlay,false);assert.equal(state.hud.horizontalOverflow,false);assert.ok(state.render.triangles>0&&state.render.calls>0);
  }
  async function move(direction,visit,{distance=4,timing=false}={}){
    const key={up:'w',down:'s',left:'a',right:'d'}[direction],before=await snapshot();let contact;
    if(visit.profile.mobile){const box=await page.locator(`[data-move="${direction}"]`).boundingBox();assert.ok(box);contact={x:box.x+box.width/2,y:box.y+box.height/2,id:1};}
    await page.evaluate(({direction,distance})=>window.__meshyProbe.watch(direction,distance),{direction,distance});
    let result;
    try{
      if(contact)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact]});else await page.keyboard.down(key);
      await until(()=>window.__meshyProbe.goalSettled,undefined,35000);result=await page.evaluate(()=>window.__meshyProbe.goalResult);
    }finally{if(contact)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up(key);await page.evaluate(()=>window.__meshyProbe.cancelGoal());}
    const after=await snapshot();assert.equal(result.timeout,false);assert.ok(after.state.time>before.state.time);assert.ok(Math.hypot(after.state.x-before.state.x,after.state.z-before.state.z)>=distance-.2);
    return{direction,distance,input:contact?'native-touch-arrow':'native-keyboard',before,after,observed:result,...(!timing?{diagnostic:await diagnostic()}: {})};
  }
  async function navigate(waypoint,visit){
    const row={target:waypoint,segments:[]};
    for(let attempt=0;attempt<24;attempt++){
      const current=await snapshot(),segment=nextNativeSegment(current.state,waypoint,current.environment.camera.yaw,1.6);
      if(!segment){row.reached=current.state;row.errorMetres=Math.hypot(current.state.x-waypoint[0],current.state.z-waypoint[1]);return row;}
      row.segments.push(await move(segment.direction,visit,{distance:segment.distance,timing:true}));
    }throw Error('Native carrier waypoint did not converge: '+JSON.stringify(row));
  }
  try{
    report.sourceStart=await fingerprint(root);
    report.toolHashes=Object.fromEntries(await Promise.all(['tests/carrier-assets-playtest.mjs','tests/helpers/meshy-native-observer.mjs','tests/helpers/carrier-native-observer.mjs','tests/helpers/meshy-pilot-config.mjs','tests/helpers/browser-condition.mjs'].map(async file=>[file,sha(await fs.readFile(path.join(toolRoot,file)))])));
    if(process.env.COMPARE_BEFORE){beforeReport=JSON.parse(await fs.readFile(process.env.COMPARE_BEFORE,'utf8'));assert.equal(beforeReport.passed,true);assert.equal(beforeReport.label,'baseline');}
    if(label==='baseline'){report.productionSourceStart=await assertBaseline();report.unreferencedAdditions=Object.keys(report.sourceStart.hashes).filter(file=>!trackedBaseline.includes(file));}
    const health=await(await fetch(new URL('/health',base))).json();assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,sha(root.replaceAll('\\','/').toLowerCase()));report.server={url:base.href,health};
    // Fixture-only modules must remain baseline-identical even for candidate visits.
    const fixtureFiles=['src/simulation.js','src/city-layout.js','src/vertical-city.js','src/variants.js','src/weapon-layout.js'];
    assert.equal(git(fixtureRoot,'diff',carrierBaseline.commit,'--',...fixtureFiles),'','Fixture generator differs from approved baseline.');
    report.fixtureGenerator={root:fixtureRoot,baselineCommit:carrierBaseline.commit,hashes:(await fingerprint(fixtureRoot,fixtureFiles)).hashes};
    const sim=await import(pathToFileURL(path.join(fixtureRoot,'src/simulation.js')).href);
    const cases=(mode==='capture'?carrierCaptureCases():(mode==='timing'?carrierVariants.filter(v=>v.faction==='kaiju'):carrierVariants).flatMap(v=>profiles.map(p=>({...v,name:v.variant+'-'+p.name+'-'+mode,set:mode,profile:p.name,position:{x:-30,z:40},camera:{preset:'normal-city',yawOffset:0,zoomFactor:1}}))))
      .filter(c=>(!process.env.PROFILE||c.profile===process.env.PROFILE)&&(!process.env.VARIANT||c.variant===process.env.VARIANT)&&(!process.env.CAPTURE_SET||c.set===process.env.CAPTURE_SET));
    assert.ok(cases.length,'No selected capture/motion cases');report.plan=cases;report.planSha256=sha(JSON.stringify(cases));
    if(mode==='timing'){
      report.routePlan=carrierMotionRoutes;report.routePlanSha256=sha(JSON.stringify(carrierMotionRoutes));
      report.limitations=report.limitations.filter(x=>!x.startsWith('No GPU/RAF timing'));
      report.limitations.push('One first traversal and one warmed repeat per route/profile/carrier; not three independent timing runs or a whole-game/thermal claim. Later routes can reuse already warm resources.','Frame interval (RAF), whole game callback wall time and optional GPU timer are separate. Callback includes CPU work and driver blocking; it is not pure CPU time. Query accounting includes unavailable/disjoint/missing samples.','Operating-system/driver caches and background machine activity are uncontrolled. Baseline and candidate are sequential; all native state/time deltas are retained.','No physical Apple device, Safari, long-session, offline/update/release or independent art acceptance is supplied.');
    }
    const reusable=new Map();
    if(process.env.RESUME_FROM){
      assert.equal(label,'baseline','Continuation is only for an unchanged frozen baseline');assert.equal(mode,'capture');
      const previous=JSON.parse(await fs.readFile(process.env.RESUME_FROM,'utf8'));
      assert.equal(previous.label,'baseline');assert.equal(previous.mode,'capture');assert.equal(previous.planSha256,report.planSha256);
      assert.equal(previous.productionSourceStart.fingerprint,report.productionSourceStart.fingerprint);
      assert.deepEqual(previous.productionSourceStart.hashes,report.productionSourceStart.hashes);
      assert.equal(previous.cleanup?.ownedBrowserClosed,true);
      for(const visit of previous.visits.filter(v=>v.closed)){
        assert.deepEqual(visit.errors,[]);assert.deepEqual(visit.failedRequests,[]);assert.deepEqual(visit.remoteRequests,[]);assert.equal(visit.image.original,true);
        const bytes=await fs.readFile(visit.image.path);assert.equal(sha(bytes),visit.image.sha256);assert.equal(bytes.length,visit.image.bytes);
        assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],visit.image.dimensions);
        reusable.set(visit.name,{visit,bytes});
      }
      report.continuation={from:path.resolve(process.env.RESUME_FROM),priorPassed:previous.passed,priorFailure:previous.failure??null,
        priorStartedAt:previous.startedAt,priorFinishedAt:previous.finishedAt,priorToolHashes:previous.toolHashes,
        method:'Reuse only individually completed original captures after source/plan/hash/dimension checks. Original failed report is retained. Only missing cases execute now.',reused:[]};
    }
    for(const item of cases){
      const profile=profiles.find(p=>p.name===item.profile),state=sim.createGame(item.faction,item.variant);state.x=item.position.x;state.z=item.position.z;
      const fixture=sim.serialize(state);assert.ok(sim.deserialize(fixture));
      if(reusable.has(item.name)){
        const {visit:previous,bytes}=reusable.get(item.name);assert.equal(previous.fixture.sha256,sha(fixture));assert.deepEqual(previous.profile,profile);
        const visit=structuredClone(previous),destination=path.join(out,item.name+'.png');await fs.writeFile(destination,bytes,{flag:'wx'});
        visit.reusedOriginal={report:report.continuation.from,image:previous.image.path,verifiedAt:new Date().toISOString(),sha256:sha(bytes)};visit.image.path=destination;
        report.visits.push(visit);report.continuation.reused.push(item.name);await write();console.log('REUSED verified original '+item.name);continue;
      }
      const visit={...item,profile,startedAt:new Date().toISOString(),fixture:{sha256:sha(fixture),raw:JSON.parse(fixture),origin:'Isolated baseline createGame; no user storage is attached.'},errors:[],warnings:[],failedRequests:[],remoteRequests:[]};report.visits.push(visit);await write();
      const args=['--mute-audio','--enable-gpu','--use-angle=d3d11'],headless=process.env.HEADLESS==='1';
      browser=await chromium.launch({channel:'chrome',headless,args});visit.browser={version:browser.version(),channel:'chrome',headless,args};
      context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.deviceScaleFactor,isMobile:profile.mobile,hasTouch:profile.mobile,serviceWorkers:'block'});context._carrierMobile=profile.mobile;
      await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['data:','blob:'].includes(url.protocol))return route.continue();visit.remoteRequests.push(url.href);return route.abort();});
      await context.addInitScript(mode==='timing'?installCarrierObserver:installMeshyObserver,{quality:profile.quality,fixture,gpuTiming:mode==='timing'&&process.env.GPU_TIMING==='1'});
      page=await context.newPage();page.setDefaultTimeout(30000);cdp=await context.newCDPSession(page);
      page.on('pageerror',error=>visit.errors.push(error.message));page.on('console',message=>{if(['error','warning'].includes(message.type()))(message.type()==='error'?visit.errors:visit.warnings).push(message.text());});
      page.on('requestfailed',request=>visit.failedRequests.push({url:request.url(),error:request.failure()?.errorText}));page.on('response',response=>{if(response.status()>=400)visit.errors.push('HTTP '+response.status()+' '+response.url());});
      const navigationAt=performance.now();await page.goto(new URL('/?test=1',base).href,{waitUntil:'domcontentloaded',timeout:120000});await page.bringToFront();await until(()=>!!window.__colossus?.scene?.renderer);visit.navigationToRendererReadyMs=performance.now()-navigationAt;
      visit.documentTitle=await page.title();assert.match(visit.documentTitle,/Colossus Wake/i,'Wrong browser app.');await tap('#continue');
      await until(()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);
      visit.nativeCityCamera=(await snapshot()).environment.camera;
      const baselineTarget=beforeReport?.visits.find(v=>v.name===item.name)?.cameraInput.target;
      const target=baselineTarget??{yaw:visit.nativeCityCamera.yaw+item.camera.yawOffset,pitch:visit.nativeCityCamera.pitch,zoom:visit.nativeCityCamera.zoom*item.camera.zoomFactor};
      await nativeCamera(target,visit);
      // Native RAF only; a capture settle period is not a synthetic game clock.
      await page.evaluate(()=>new Promise(resolve=>{let count=0;const frame=()=>++count>=45?resolve():requestAnimationFrame(frame);requestAnimationFrame(frame);}));
      visit.initial=await snapshot();visit.diagnostic=await diagnostic();validate(visit.initial,visit.diagnostic,item);
      if(mode==='motion'){
        visit.movements=[];for(const direction of ['up','right','down','left']){const movement=await move(direction,visit);validate(movement.after,movement.diagnostic,item);visit.movements.push(movement);await write();}
      }
      if(mode==='timing'){
        visit.routes=[];
        for(const route of carrierMotionRoutes)for(const warmth of ['first-traversal','warmed-repeat']){
          const row={name:route.name,warmth,waypoints:[]};visit.routes.push(row);await write();
          await page.evaluate(name=>window.__meshyProbe.arm(name),route.name+'/'+warmth);
          for(const waypoint of route.waypoints)row.waypoints.push(await navigate(waypoint,visit));
          Object.assign(row,await page.evaluate(()=>window.__meshyProbe.finish()));
          assert.equal(row.contextLost,false);assert.equal(row.focusLost,false,'Timing window lost focus');assert.ok(row.frames.length>10);assert.notEqual(row.firstRenderedMovementMs,null);
          const intervals=row.frames.map(f=>f.interval).filter(Number.isFinite);row.fps={definition:'1000 / mean RAF interval; reciprocal percentiles show frame pacing, not physical display FPS',mean:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),fromP50:1000/row.frameIntervalMs.median,fromP95:1000/row.frameIntervalMs.p95,fromP99:1000/row.frameIntervalMs.p99};
          // Expensive GL/skin diagnostics occur only after measurement/drain.
          row.diagnostic=await diagnostic();validate(row.end,row.diagnostic,item);await write();console.log('ROUTE '+label+' '+item.name+' '+route.name+' '+warmth);
        }
        visit.directionCoverage=[...new Set(visit.routes.flatMap(r=>r.waypoints.flatMap(w=>w.segments.map(s=>s.direction))))].sort();assert.deepEqual(visit.directionCoverage,['down','left','right','up']);
      }
      visit.capture=await snapshot();visit.finalDiagnostic=await diagnostic();validate(visit.capture,visit.finalDiagnostic,item);
      const imagePath=path.join(out,item.name+'.png');await page.screenshot({path:imagePath});const bytes=await fs.readFile(imagePath);
      visit.image={path:imagePath,bytes:bytes.length,sha256:sha(bytes),dimensions:[bytes.readUInt32BE(16),bytes.readUInt32BE(20)],original:true,phoneEmulation:profile.mobile,label:label.toUpperCase()};
      visit.startups=await page.evaluate(()=>window.__meshyProbe.startups);
      visit.resourceRequests=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({url:r.name,encodedBodySize:r.encodedBodySize,transferSize:r.transferSize})));
      if(label==='baseline')for(const name of report.unreferencedAdditions)assert.equal(visit.resourceRequests.some(r=>new URL(r.url).pathname==='/'+name),false,'Unreferenced baseline addition was actually loaded: '+name);
      assert.deepEqual(visit.errors,[]);assert.deepEqual(visit.remoteRequests,[]);assert.deepEqual(visit.failedRequests,[]);
      visit.finishedAt=new Date().toISOString();await context.close();context=null;await browser.close();browser=null;visit.closed=true;await write();console.log('PASS '+label+' '+mode+' '+item.name);
    }
    report.sourceFinish=await fingerprint(root);
    if(label==='baseline'){
      report.productionSourceFinish=await assertBaseline();report.unreferencedAdditionsAtFinish=Object.keys(report.sourceFinish.hashes).filter(file=>!trackedBaseline.includes(file));
      for(const visit of report.visits)for(const name of report.unreferencedAdditionsAtFinish)assert.equal(visit.resourceRequests.some(r=>new URL(r.url).pathname==='/'+name),false,'New baseline addition actually loaded: '+name);
    }else assert.equal(report.sourceStart.fingerprint,report.sourceFinish.fingerprint,'Candidate runtime/assets changed during evidence');
    if(process.env.COMPARE_BEFORE){
      const before=beforeReport;assert.equal(before.planSha256,report.planSha256);
      for(let i=0;i<report.visits.length;i++){
        const a=before.visits[i],b=report.visits[i];assert.equal(a.name,b.name);assert.equal(a.fixture.sha256,b.fixture.sha256);assert.deepEqual(a.profile,b.profile);assert.deepEqual(a.browser,b.browser);assert.deepEqual(a.cameraInput.target,b.cameraInput.target);
        for(const key of ['viewport','deviceDpr','rendererDpr','drawingBuffer','quality','light'])assert.deepEqual(a.capture.environment[key],b.capture.environment[key],key+' differs');
        for(const key of ['yaw','pitch','zoom'])assert.ok(Math.abs(a.capture.environment.camera[key]-b.capture.environment.camera[key])<.012,key+' differs');
        report.pairs.push({name:a.name,fixtureSha256:a.fixture.sha256,before:a.image,after:b.image,settingsMatched:true,nativeStateDelta:Object.fromEntries(['x','z','angle','time','population'].map(k=>[k,b.capture.state[k]-a.capture.state[k]]))});
        if(mode==='timing'){
          assert.equal(before.routePlanSha256,report.routePlanSha256);assert.equal(a.routes.length,b.routes.length);
          report.pairs.at(-1).routes=a.routes.map((ar,j)=>{const br=b.routes[j];assert.equal(ar.label,br.label);for(const key of ['viewport','deviceDpr','rendererDpr','drawingBuffer','quality','light'])assert.deepEqual(ar.start.environment[key],br.start.environment[key],ar.label+' '+key+' mismatch');assert.deepEqual(ar.driverMetadataAfterRoute,br.driverMetadataAfterRoute,'GPU/context conditions differ');return{label:ar.label,settingsMatched:true,startDelta:Object.fromEntries(['x','z','angle','time','population'].map(k=>[k,br.start.state[k]-ar.start.state[k]])),endDelta:Object.fromEntries(['x','z','angle','time','population'].map(k=>[k,br.end.state[k]-ar.end.state[k]]))};});
        }
      }
    }
    report.passed=true;
  }catch(error){report.failure=error.stack;process.exitCode=1;}
  finally{
    try{await context?.close();await browser?.close();report.cleanup={ownedBrowserClosed:true};}catch(error){report.cleanup={error:error.message};process.exitCode=1;report.passed=false;}
    report.finishedAt=new Date().toISOString();report.exitCode=report.passed?0:1;await write();
  }
  console.log(JSON.stringify({passed:report.passed,mode,label,report:path.join(out,'report.json')}));return report;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))await runCarrierAssetsPlaytest();
