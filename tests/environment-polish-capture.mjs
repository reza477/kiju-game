// Local, real-game evidence. Native RAF timestamps and simulation timing are
// never replaced. Input is delivered through Chromium's keyboard/touch APIs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const sourceRoot=await fs.realpath(path.resolve(process.env.SOURCE_ROOT||root));
const checkpoint='8230ce17a4ae26f3374e8ef9594db1095d5cb77f';
const phase=process.env.PHASE||'before',mode=process.env.MODE||'full';
const timingProtocol=process.env.TIMING_PROTOCOL||'frames',routeEndX=-44,watchdogMs=45000;
assert.ok(['frames','route'].includes(timingProtocol),'TIMING_PROTOCOL must be frames or route.');
const out=path.resolve(process.env.OUTPUT_DIR||`artifacts/environment-pass1/${phase}`);
const base=new URL(process.env.CAPTURE_URL||'http://127.0.0.1:4197/');
assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'Local server required.');
const profiles=[
  {name:'desktop',viewport:{width:1440,height:960},deviceScaleFactor:1,mobile:false,quality:'high'},
  {name:'phone-portrait',viewport:{width:390,height:844},deviceScaleFactor:2,mobile:true,quality:'performance'},
  {name:'phone-landscape',viewport:{width:844,height:390},deviceScaleFactor:2,mobile:true,quality:'performance'}
].filter(p=>!process.env.PROFILE||p.name===process.env.PROFILE);
assert.ok(profiles.length,'Unknown profile.');
const git=(...args)=>execFileSync('git',args,{cwd:sourceRoot,encoding:'utf8'}).trim();
const sourcePaths=git('ls-files','src','index.html','assets','vendor').split('\n').filter(Boolean);
async function sourceEvidence(){
  const hashes={};for(const name of sourcePaths)hashes[name]=createHash('sha256').update(await fs.readFile(path.join(sourceRoot,name))).digest('hex');
  const changes=git('diff','--name-only',checkpoint,'--','src','index.html','assets','vendor').split('\n').filter(Boolean);
  const untracked=git('ls-files','--others','--exclude-standard','src','assets','vendor').split('\n').filter(Boolean);
  return {root:sourceRoot,commit:git('rev-parse','HEAD'),checkpoint,changes,untracked,fingerprint:createHash('sha256').update(JSON.stringify(hashes)).digest('hex')};
}
const health=await(await fetch(new URL('/health',base))).json();
const expectedRootId=createHash('sha256').update(sourceRoot.replaceAll('\\','/').toLowerCase()).digest('hex');
assert.equal(health.app,'colossus-wake-local','Unexpected loopback application.');
assert.equal(health.rootId,expectedRootId,'HTTP server root does not match SOURCE_ROOT provenance.');
await fs.mkdir(out,{recursive:true});
const report={phase,mode,checkpoint,capturedAt:new Date().toISOString(),source:await sourceEvidence(),server:{url:base.href,health,expectedRootId},profiles:[],errors:[],warnings:[],remote:[],
  protocol:timingProtocol==='route'?'native-fixed-world-route-v1':'native-moving-warmup-v1',
  timingUse:timingProtocol==='route'?'Same-world-route steady-state comparison; excludes loading and first-use shader stutter':'Exploratory fixed-frame observation; routes differ with native frame rate.',
  method:'Fresh isolated Chromium contexts, bundled local assets, ordinary standard crawler at x=-14,z=82,time=12; City camera yaw=.92,pitch=.55,zoom=80,day,cinematic. Same serialized starting fixture per profile and run. Unmodified HUD, no CSS hiding. '+(timingProtocol==='route'?'Two unmeasured held-left routes to x<=-44 per profile precede three measured identical routes, each bounded by a 45-second wall watchdog. Route end is the first native frame crossing the target; small endpoint overshoot is reported.':'One unmeasured 240-frame held-left moving warmup per profile precedes three measured 240-frame held-left runs.')+' After every production fixture reset, Three renderer.compileAsync precompiles current-scene materials outside timing and verifies simulation state is unchanged. Each measured run then settles 120 native frames, then observes native camera coordinate changes below 1e-7 for 15 consecutive frames before input. No screenshots or recording during timing. Native main.frame timestamps, built-in dt cap and simulation timing retained.',
  limitations:'One Windows PC using headless Chromium. Phone profiles are touch/viewport/DPR emulation, not physical phones or Safari. '+(timingProtocol==='route'?'World-route endpoints are matched within one native movement step; sample counts and frame timing vary, and no simulation timestamp or position is forced during movement.':'Native timing gives different final simulation times and positions; fixed-frame results are exploratory, not identical-route performance evidence.')+' Renderer submissions are not frame-rate evidence. GPU results are unavailable if the extension is absent or disjoint. Device DPR and actual rendering DPR are reported separately.'};
if(phase==='before'){assert.deepEqual(report.source.changes,[],'Untouched baseline product source differs from checkpoint.');assert.deepEqual(report.source.untracked,[]);}
let fixture;
try{fixture=await fs.readFile(path.resolve(process.env.FIXTURE_PATH||'artifacts/environment-pass1/fixture.json'),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
const browserChannel=process.env.BROWSER_CHANNEL||'chrome';
const browser=await chromium.launch({headless:true,...(browserChannel==='pinned'?{}:{channel:browserChannel}),args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});
report.browser={version:browser.version(),channel:browserChannel,headless:true,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']};
const browserSession=await browser.newBrowserCDPSession();
try{report.browser.commandLine=(await browserSession.send('Browser.getBrowserCommandLine')).arguments;}
catch(error){report.browser.commandLineUnavailable=error.message;}
finally{await browserSession.detach();}
async function open(profile,video=false){
  const context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.deviceScaleFactor,isMobile:profile.mobile,hasTouch:profile.mobile,
    ...(video?{recordVideo:{dir:path.join(out,'video'),size:profile.viewport}}:{})});
  const page=await context.newPage();page.setDefaultTimeout(120000);
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===base.origin||['blob:','data:'].includes(u.protocol))return route.continue();report.remote.push(u.href);return route.abort();});
  page.on('pageerror',error=>report.errors.push({profile:profile.name,message:error.message}));
  page.on('console',message=>{const type=message.type();if(type==='error')report.errors.push({profile:profile.name,message:message.text(),location:message.location()});else if(type==='warning'||type==='warn')report.warnings.push({profile:profile.name,message:message.text(),location:message.location()});});
  await context.addInitScript(({quality})=>{
    localStorage.setItem('colossus-quality-v1',quality);
    const nativeRAF=window.requestAnimationFrame.bind(window);
    window.__polishNativeRAF=nativeRAF;
    window.__polishFrames=0;window.__polishMeasure=null;
    // Only observe the real application's named frame callback; all callbacks
    // still execute once, with the timestamp supplied by Chromium itself.
    window.requestAnimationFrame=callback=>nativeRAF(timestamp=>{
      if(callback.name!=='frame'){callback(timestamp);return;}
      const measure=window.__polishMeasure;
      if(measure)measure.before(timestamp);
      const start=performance.now();callback(timestamp);const cpu=performance.now()-start;
      window.__polishFrames++;
      if(measure)measure.after(timestamp,cpu);
    });
  },{quality:profile.quality});
  await page.goto(new URL('?test=1',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);
  await page.locator('[data-faction="crawler"]').click();
  await page.locator('[data-variant="standard"]').click();
  await page.locator('#begin').click();
  if(mode==='preview'&&phase==='before'&&process.env.CAPTURE_DEFAULT==='1'){
    await page.evaluate(()=>{window.__colossus.state.paused=true;window.__colossus.state.time=12;window.__colossus.advance(0);});
    await page.waitForTimeout(1500);
    const file=path.join(out,`${profile.name}-default-city.png`);await page.screenshot({path:file});console.log(JSON.stringify({event:'default-screenshot',profile:profile.name,file}));
  }
  if(!fixture){
    fixture=await page.evaluate(async()=>{const{createGame,serialize}=await import('/src/simulation.js');const s=createGame('crawler','standard');Object.assign(s,{x:-14,z:82,angle:0,time:12,paused:true,target:null,moving:false});return serialize(s);});
    const fixturePath=path.resolve(process.env.FIXTURE_PATH||'artifacts/environment-pass1/fixture.json');await fs.mkdir(path.dirname(fixturePath),{recursive:true});await fs.writeFile(fixturePath,fixture);
  }
  await page.evaluate(async({fixture,quality})=>{
    const {deserialize}=await import('/src/simulation.js');
    window.__polishReset=()=>{const{state:s,scene:g}=window.__colossus;Object.assign(s,deserialize(fixture));s.paused=true;g.setGame(s);g.setView('city');g.setLighting('day');g.setQuality(quality,{persist:false});g.setCameraMode('cinematic');Object.assign(g,{yaw:.92,pitch:.55,zoom:80,snapCamera:true});window.__colossus.advance(0);};
    window.__polishWaitFrames=n=>new Promise(resolve=>{const end=window.__polishFrames+n;const poll=()=>window.__polishFrames>=end?resolve():window.__polishNativeRAF(poll);window.__polishNativeRAF(poll);});
    window.__polishWaitCamera=()=>new Promise((resolve,reject)=>{
      const g=window.__colossus.scene,began=performance.now(),first=window.__polishFrames;let previous,stable=0,delta=Infinity;
      const poll=()=>{const now=[...g.camera.position.toArray(),...g.cameraAim.toArray()];if(previous){delta=Math.max(...now.map((v,i)=>Math.abs(v-previous[i])));stable=delta<1e-7?stable+1:0;}previous=now;
        if(stable>=15){const result={nativeFrames:window.__polishFrames-first,wallMs:performance.now()-began,consecutiveStableFrames:stable,lastCoordinateDelta:delta,tolerance:1e-7};window.__polishCameraSettle=result;resolve(result);}
        else if(performance.now()-began>24000)reject(new Error('Native camera smoothing did not converge within 24 seconds.'));
        else window.__polishNativeRAF(poll);
      };window.__polishNativeRAF(poll);
    });
    window.__polishPrecompile=async()=>{
      const {state:s,scene:g}=window.__colossus,stateBefore=JSON.stringify(s),began=performance.now(),programCountBefore=g.renderer.info.programs.length;
      await g.renderer.compileAsync(g.scene,g.camera);
      return{method:'Three renderer.compileAsync on rebuilt current scene outside timing',wallMs:performance.now()-began,stateUnchanged:JSON.stringify(s)===stateBefore,programCountBefore,programCountAfter:g.renderer.info.programs.length};
    };
    window.__polishRenderEvidence=()=>{
      const g=window.__colossus.scene,r=g.renderer,gl=r.getContext(),env=g.scene.environment;
      return{fixed:{viewport:[innerWidth,innerHeight],deviceDpr:devicePixelRatio,rendererDpr:r.getPixelRatio(),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],quality:g.quality,light:g.light,environmentReady:g.environmentReady,
        environment:{uuid:env.uuid,name:env.name,intensity:g.scene.environmentIntensity,rotation:g.scene.environmentRotation.toArray(),width:env.image?.width,height:env.image?.height,type:env.type,format:env.format,mapping:env.mapping,colorSpace:env.colorSpace},
        lighting:{sun:{intensity:g.sun.intensity,color:g.sun.color.toArray()},ambient:{intensity:g.ambient.intensity,color:g.ambient.color.toArray(),groundColor:g.ambient.groundColor.toArray()},rim:{intensity:g.rim.intensity,color:g.rim.color.toArray()},fog:{color:g.scene.fog.color.toArray(),density:g.scene.fog.density}},
        output:{toneMapping:r.toneMapping,exposure:r.toneMappingExposure,colorSpace:r.outputColorSpace,shadows:r.shadowMap.enabled,shadowSize:g.sun.shadow.mapSize.toArray()},
        cameraControls:{view:g.view,mode:g.cinematic.mode,yaw:g.yaw,pitch:g.pitch,zoom:g.zoom,fov:g.camera.fov,aspect:g.camera.aspect}},
        camera:{position:g.camera.position.toArray(),aim:g.cameraAim.toArray()},surfaces:g.surfaceDiagnostics()};
    };
    window.__polishReset();
  },{fixture,quality:profile.quality});
  await page.evaluate(()=>window.__polishWaitFrames(120));
  const cdp=profile.mobile?await context.newCDPSession(page):null;
  return{context,page,cdp,profile};
}
async function heldInput(session,down){
  const{page,cdp}=session;
  if(!cdp){await page.keyboard[down?'down':'up']('a');return;}
  const b=await page.locator('[data-move="left"]').boundingBox();assert.ok(b&&b.width>0,'Visible touch movement target required.');
  await cdp.send('Input.dispatchTouchEvent',{type:down?'touchStart':'touchEnd',touchPoints:down?[{id:0,x:b.x+b.width/2,y:b.y+b.height/2}]:[]});
}
async function snapshot(page){return page.evaluate(()=>{
  const{state:s,scene:g}=window.__colossus,r=g.renderer,gl=r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return{state:{x:s.x,z:s.z,time:s.time,angle:s.angle,moving:s.moving,paused:s.paused,buildings:s.buildings,worldDamage:s.worldDamage},
    browser:navigator.userAgent,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webgl:gl.getParameter(gl.VERSION),timerQuery:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),contextLost:gl.isContextLost(),
    viewport:[innerWidth,innerHeight],deviceDpr:devicePixelRatio,rendererDpr:r.getPixelRatio(),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],canvasCss:[r.domElement.clientWidth,r.domElement.clientHeight],renderEnvironment:window.__polishRenderEvidence(),
    quality:g.quality,light:g.light,camera:{view:g.view,mode:g.cinematic.mode,yaw:g.yaw,pitch:g.pitch,zoom:g.zoom,fov:g.camera.fov,position:g.camera.position.toArray(),aim:g.cameraAim.toArray()},
    render:{...r.info.render},memory:{...r.info.memory},surfaces:g.surfaceDiagnostics(),hud:{visible:!document.getElementById('hud').classList.contains('hidden'),horizontalOverflow:document.documentElement.scrollWidth>innerWidth,toastOpacity:Number(getComputedStyle(document.getElementById('toast')).opacity),toastTransitionRunning:document.getElementById('toast').getAnimations().some(animation=>animation.playState==='running'||animation.pending)}};
});}
async function capture(session,row,name){
  // Class removal begins a CSS fade. Wait for actual transparency and transition
  // completion through ordinary UI time; do not hide or restyle any HUD element.
  await session.page.waitForFunction(()=>{
    const toast=document.getElementById('toast');
    return !toast.classList.contains('show')&&Number(getComputedStyle(toast).opacity)===0&&
      !toast.getAnimations().some(animation=>animation.playState==='running'||animation.pending);
  });
  if(await session.page.evaluate(()=>window.__colossus.state.paused))await session.page.evaluate(()=>window.__polishWaitCamera());
  const evidence=await snapshot(session.page),file=path.join(out,`${row.name}-${name}.png`);
  await session.page.screenshot({path:file});row.shots.push({name,file,...evidence});
  console.log(JSON.stringify({event:'screenshot',phase,profile:row.name,name,file,environment:evidence}));
}
async function visibleBatches(page){return page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),g=window.__colossus.scene;
  g.scene.updateMatrixWorld(true);g.camera.updateMatrixWorld(true);
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(g.camera.projectionMatrix,g.camera.matrixWorldInverse));
  const batches=[],grouped=new Map();
  g.scene.traverseVisible(mesh=>{
    if(!mesh.isInstancedMesh||mesh.count===0||mesh.frustumCulled&&!frustum.intersectsObject(mesh))return;
    const geometry=mesh.geometry,triangles=(geometry.index?.count??geometry.attributes.position.count)/3*mesh.count;
    const row={name:mesh.name,material:Array.isArray(mesh.material)?mesh.material.map(m=>m.name):mesh.material.name,geometry:geometry.name||geometry.type,instances:mesh.count,triangles,spatialCell:mesh.userData.spatialCell??null,spatialBatch:mesh.userData.spatialBatch??null,wind:!!mesh.userData.windAnimated,castShadow:mesh.castShadow,frustumCulled:mesh.frustumCulled};batches.push(row);
    const key=mesh.name,group=grouped.get(key)||{name:key,material:row.material,visibleDraws:0,instances:0,triangles:0,spatialCells:false,wind:row.wind};
    group.visibleDraws++;group.instances+=mesh.count;group.triangles+=triangles;group.spatialCells||=row.spatialCell!==null;grouped.set(key,group);
  });
  return{note:'One camera-frustum snapshot outside timing. Counts describe visible instanced geometry submissions only, not measured GPU cost or shadow-pass visibility.',topBatches:batches.sort((a,b)=>b.triangles-a.triangles).slice(0,30),groups:[...grouped.values()].sort((a,b)=>b.triangles-a.triangles)};
});}
async function measure(session){
  await session.page.evaluate(()=>window.__polishReset());
  const precompile=timingProtocol==='route'?await session.page.evaluate(()=>window.__polishPrecompile()):null;
  if(precompile)assert.equal(precompile.stateUnchanged,true,'Precompilation must not change simulation state.');
  await session.page.evaluate(()=>window.__polishWaitFrames(120));
  const cameraSettle=await session.page.evaluate(()=>window.__polishWaitCamera());
  await heldInput(session,true);
  const result=await session.page.evaluate(({timingProtocol,routeEndX,watchdogMs})=>new Promise(resolve=>{
    const{state:s,scene:g}=window.__colossus,r=g.renderer,gl=r.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const pending=[],cpu=[],sceneCpu=[],intervals=[],gpu=[],calls=[],triangles=[];let frames=0,prior,query,disjoint=0,drainFrames=0,start,end,finished=false,settled=false,timedOut=false,sceneElapsed=0;
    const originalUpdate=g.update;g.update=function(...args){const t=performance.now();try{return originalUpdate.apply(this,args);}finally{sceneElapsed+=performance.now()-t;}};
    const state=()=>({x:s.x,z:s.z,time:s.time,angle:s.angle,moving:s.moving,renderEnvironment:window.__polishRenderEvidence(),programCount:r.info.programs?.length??null,programs:r.info.programs?.map(p=>({id:p.id,name:p.name,usedTimes:p.usedTimes}))??[],worldDamage:JSON.parse(JSON.stringify(s.worldDamage))});
    function collect(){if(!ext)return;if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;for(const q of pending)gl.deleteQuery(q);pending.length=0;return;}while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=pending.shift();gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}}
    const summary=a=>{const v=[...a].sort((a,b)=>a-b);return{samples:v.length,median:v[Math.floor(v.length*.5)]??null,p95:v[Math.floor(v.length*.95)]??null,max:v.at(-1)??null};};
    function done(){if(settled)return;settled=true;clearTimeout(watchdog);for(const q of pending)gl.deleteQuery(q);g.update=originalUpdate;window.__polishMeasure=null;resolve({frames,start,end,wallDurationMs:start?prior-start.timestamp:null,mainCpuMs:summary(cpu),sceneCpuMs:summary(sceneCpu),frameIntervalMs:summary(intervals),gpuMs:summary(gpu),renderCalls:summary(calls),renderTriangles:summary(triangles),gpuExtension:!!ext,disjoint,contextLost:gl.isContextLost(),nativeTiming:true,timedOut,route:timingProtocol==='route'?{targetX:routeEndX,reached:!!end&&end.x<=routeEndX,overshootX:end?routeEndX-end.x:null,distance:start&&end?Math.hypot(end.x-start.x,end.z-start.z):null}:null});}
    const watchdog=setTimeout(()=>{timedOut=true;end={...state(),timestamp:prior};s.paused=true;finished=true;done();},watchdogMs);
    window.__polishMeasure={before(timestamp){
      collect();if(finished){if(!pending.length||++drainFrames>120)done();return;}
      if(!start){start={...state(),timestamp};s.paused=false;}
      if(prior!==undefined)intervals.push(timestamp-prior);prior=timestamp;sceneElapsed=0;
      if(ext&&pending.length<8&&!gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)){query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);}
    },after(timestamp,duration){
      if(finished)return;
      if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query);query=null;}
      cpu.push(duration);sceneCpu.push(sceneElapsed);calls.push(r.info.render.calls);triangles.push(r.info.render.triangles);
      frames++;
      if(timingProtocol==='route'?s.x<=routeEndX:frames===240){end={...state(),timestamp};s.paused=true;finished=true;}
    }};
  }),{timingProtocol,routeEndX,watchdogMs});
  await heldInput(session,false);
  result.cameraSettle=cameraSettle;
  result.precompile=precompile;
  assert.deepEqual(result.start.renderEnvironment.fixed,result.end.renderEnvironment.fixed,'Renderer configuration, radiance/light or camera controls changed within a route.');
  const actual=result.start.renderEnvironment.fixed,profile=session.profile,expectedDpr=profile.quality==='high'?1.25:.85;
  assert.equal(actual.quality,profile.quality);assert.equal(actual.light,'day');assert.equal(actual.deviceDpr,profile.deviceScaleFactor);assert.equal(actual.rendererDpr,expectedDpr);
  assert.deepEqual(actual.viewport,[profile.viewport.width,profile.viewport.height]);assert.deepEqual(actual.drawingBuffer,[Math.floor(profile.viewport.width*expectedDpr),Math.floor(profile.viewport.height*expectedDpr)]);
  assert.deepEqual(actual.cameraControls,{view:'city',mode:'cinematic',yaw:.92,pitch:.55,zoom:80,fov:42,aspect:profile.viewport.width/profile.viewport.height});
  assert.equal(actual.environmentReady,true);assert.equal(result.end.renderEnvironment.surfaces.pending,0);
  result.endpointRendererParity=true;
  assert.equal(result.timedOut,false,'Native movement exceeded the wall watchdog.');
  if(timingProtocol==='route'){assert.equal(result.route.reached,true);assert.ok(result.route.overshootX>=0&&result.route.overshootX<.5,'Endpoint must remain within one native movement step.');}
  else assert.equal(result.frames,240);
  assert.equal(result.end.moving,true);assert.ok(Math.hypot(result.end.x-result.start.x,result.end.z-result.start.z)>5,'Real input must move the crawler.');assert.equal(result.contextLost,false);
  result.shaderProgramsStable=result.end.programCount===result.start.programCount;
  return result;
}
async function movingWarmup(session){
  await session.page.evaluate(()=>window.__polishReset());
  const precompile=timingProtocol==='route'?await session.page.evaluate(()=>window.__polishPrecompile()):null;
  if(precompile)assert.equal(precompile.stateUnchanged,true,'Precompilation must not change simulation state.');
  await session.page.evaluate(()=>window.__polishWaitFrames(120));
  const cameraSettle=await session.page.evaluate(()=>window.__polishWaitCamera());
  await heldInput(session,true);
  const result=await session.page.evaluate(async({timingProtocol,routeEndX,watchdogMs})=>{
    const s=window.__colossus.state,r=window.__colossus.scene.renderer,state=()=>({x:s.x,z:s.z,time:s.time,moving:s.moving,programCount:r.info.programs?.length??null});const start=state(),firstFrame=window.__polishFrames,began=performance.now();s.paused=false;
    let timedOut=false;
    if(timingProtocol==='route')await new Promise(resolve=>{
      let finished=false;const finish=()=>{if(finished)return;finished=true;clearTimeout(watchdog);resolve();};
      const watchdog=setTimeout(()=>{timedOut=true;finish();},watchdogMs);
      const poll=()=>{if(finished)return;if(s.x<=routeEndX)finish();else window.__polishNativeRAF(poll);};window.__polishNativeRAF(poll);
    });else await window.__polishWaitFrames(240);
    const end=state();s.paused=true;return{frames:window.__polishFrames-firstFrame,start,end,wallDurationMs:performance.now()-began,measured:false,timedOut,route:timingProtocol==='route'?{targetX:routeEndX,reached:end.x<=routeEndX,overshootX:routeEndX-end.x}:null};
  },{timingProtocol,routeEndX,watchdogMs});
  await heldInput(session,false);result.cameraSettle=cameraSettle;result.precompile=precompile;assert.equal(result.timedOut,false);assert.equal(result.end.moving,true);if(timingProtocol==='route')assert.equal(result.route.reached,true);return result;
}
try{
  for(const profile of profiles){
    const current=await sourceEvidence();if(phase==='before')assert.equal(current.fingerprint,report.source.fingerprint,'Product source changed during baseline.');
    const row={...profile,shots:[],runs:[]};report.profiles.push(row);const session=mode==='record'?null:await open(profile);
    if(session)try{
      row.environment=await snapshot(session.page);
      assert.ok(!/SwiftShader|llvmpipe|software rasterizer|Microsoft Basic Render/i.test(row.environment.gpu),'Software rendering is not hardware performance evidence.');
      row.visibleInstances=await visibleBatches(session.page);
      await fs.writeFile(path.join(out,`${profile.name}-visible-instances.json`),JSON.stringify(row.visibleInstances,null,2));
      if(mode!=='timing'){
        await capture(session,row,'city');
        await session.page.evaluate(()=>{const g=window.__colossus.scene;g.yaw+=Math.PI;g.snapCamera=true;});await session.page.evaluate(()=>window.__polishWaitFrames(60));await capture(session,row,'reverse');
        await session.page.evaluate(()=>{const g=window.__colossus.scene;g.zoom=52;g.pitch=.42;g.snapCamera=true;});await session.page.evaluate(()=>window.__polishWaitFrames(60));await capture(session,row,'close');
        await session.page.evaluate(()=>{window.__polishReset();const g=window.__colossus.scene;g.zoom=112;g.snapCamera=true;});await session.page.evaluate(()=>window.__polishWaitFrames(60));await capture(session,row,'wide');
      }
      if(mode!=='preview'&&mode!=='record'){
        row.movingWarmups=[];
        for(let warmup=0;warmup<(timingProtocol==='route'?2:1);warmup++){
          row.movingWarmup=await movingWarmup(session);row.movingWarmups.push(row.movingWarmup);console.log(JSON.stringify({event:'moving-warmup',phase,profile:profile.name,warmup,...row.movingWarmup}));
        }
      }
      if(mode!=='preview'&&mode!=='record')for(let run=0;run<3;run++){
        const result=await measure(session);row.runs.push(result);console.log(JSON.stringify({event:'timing',phase,profile:profile.name,run,...result}));
        await fs.writeFile(path.join(out,'report-in-progress.json'),JSON.stringify(report,null,2));
        if(!result.shaderProgramsStable){row.steadyStateClean=false;report.steadyStateClean=false;report.compilationLimitation='Shader program growth persisted after the bounded precompile retry. Retain real native-route metrics, but do not claim clean steady-state results.';}
      }
      if(mode!=='preview'&&mode!=='record'&&mode!=='timing'){
        await session.page.evaluate(()=>window.__polishReset());await session.page.evaluate(()=>window.__polishWaitFrames(120));
        await heldInput(session,true);await session.page.evaluate(()=>{window.__colossus.state.paused=false;});await session.page.evaluate(()=>window.__polishWaitFrames(30));
        await capture(session,row,'active-motion');await heldInput(session,false);
      }
      if(mode!=='timing'){
      await session.page.evaluate(()=>window.__polishReset());
      if(profile.mobile){await session.page.locator('#mobile-menu').tap();await session.page.locator('[data-dialog-action="save"]').tap();}
      else await session.page.locator('#save').click();
      row.saved=await session.page.evaluate(()=>JSON.parse(localStorage.getItem('colossus-wake-save-v1')));
      assert.equal(row.saved.time,12);assert.equal(row.saved.x,-14);assert.equal(row.saved.z,82);
      await session.page.reload();await session.page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);await session.page.locator('#continue').click();
      row.restored=await session.page.evaluate(()=>{const s=window.__colossus.state;s.paused=true;return window.__colossus.snapshot();});
      assert.equal(row.restored.x,row.saved.x);assert.equal(row.restored.z,row.saved.z);assert.deepEqual(row.restored.buildings,row.saved.buildings);assert.deepEqual(row.restored.worldDamage,row.saved.worldDamage);
      }
    }finally{await session.context.close();}
    if(process.env.RECORD==='1'||mode==='record'){
      const video=await open(profile,true);const handle=video.page.video();
      await video.page.waitForFunction(()=>{const toast=document.getElementById('toast');return !toast.classList.contains('show')&&Number(getComputedStyle(toast).opacity)===0&&!toast.getAnimations().some(a=>a.playState==='running'||a.pending);});
      await video.page.evaluate(()=>window.__polishWaitCamera());
      row.videoEnvironment=await snapshot(video.page);await heldInput(video,true);
      row.videoMovement=await video.page.evaluate(async()=>{
        const s=window.__colossus.state,at=()=>({wallUnixMs:Date.now(),performanceMs:performance.now(),x:s.x,z:s.z,time:s.time,moving:s.moving,paused:s.paused});
        s.paused=false;const start=at();await new Promise(resolve=>setTimeout(resolve,8000));const end=at();s.paused=true;return{start,end};
      });
      await heldInput(video,false);await video.context.close();row.rawVideo=await handle.path();row.videoClosedWallUnixMs=Date.now();
      const ffmpeg=process.env.FFMPEG_PATH;assert.ok(ffmpeg,'Recording requires FFMPEG_PATH pointing to an existing local FFmpeg; no installation is attempted.');
      row.video=path.join(out,`${profile.name}-active-gameplay.webm`);
      // Keep six seconds inside the eight-second active tail, leaving a full
      // second margin at each endpoint for input release and context shutdown.
      execFileSync(ffmpeg,['-hide_banner','-y','-sseof','-7','-i',row.rawVideo,'-t','6','-an','-c:v','libvpx','-b:v','2400k',row.video],{stdio:['ignore','ignore','pipe']});
      row.videoTrim={seconds:6,seekFromEndSeconds:-7,method:'Six-second internal slice of eight-second movement tail; raw recording and exact movement wall clocks retained.',contextShutdownMs:row.videoClosedWallUnixMs-row.videoMovement.end.wallUnixMs};
      assert.ok(row.videoTrim.contextShutdownMs<750,'Video context close exceeded the trim safety margin; review raw timing before using the clip.');
      console.log(JSON.stringify({event:'video',profile:profile.name,file:row.video,raw:row.rawVideo,movement:row.videoMovement,trim:row.videoTrim}));
    }
  }
  report.finalSource=await sourceEvidence();assert.equal(report.finalSource.fingerprint,report.source.fingerprint,'Runtime files changed while evidence was captured.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await fs.writeFile(path.join(out,mode==='preview'?'preview-report.json':mode==='timing'?'timing-report.json':'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({event:'complete',out,phase,mode,profiles:report.profiles.map(p=>({name:p.name,shots:p.shots.length,runs:p.runs.length})),errors:report.errors,warnings:report.warnings.length,remote:report.remote,failure:report.failure}));
