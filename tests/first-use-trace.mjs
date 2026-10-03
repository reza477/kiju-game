// Attribution diagnostic only; deliberately separate from low-overhead timing.
// TRACE_DETAIL=light omits GL/material probes. CPU_PROFILE/CDP_TIMELINE override
// their defaults (enabled in full mode, disabled in light mode).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const sourceRoot=await fs.realpath(path.resolve(process.env.SOURCE_ROOT||root));
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4202/');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/residual-stutter/trace');
const profiles=[
  {name:'desktop',viewport:{width:1440,height:960},deviceScaleFactor:1,mobile:false,quality:'high'},
  {name:'phone-portrait',viewport:{width:390,height:844},deviceScaleFactor:2,mobile:true,quality:'performance'},
  {name:'phone-landscape',viewport:{width:844,height:390},deviceScaleFactor:2,mobile:true,quality:'performance'}
];
const profile=profiles.find(p=>p.name===(process.env.PROFILE||'desktop'));
const detail=process.env.TRACE_DETAIL||'full';
const inputMethod=process.env.TRACE_INPUT||'playwright';
assert.ok(['playwright','cdp'].includes(inputMethod),'TRACE_INPUT must be playwright or cdp.');
const timelineCategories='devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline,toplevel,renderer.scheduler,blink.scheduler,cc,input,latencyInfo';
const cpuEnabled=process.env.CPU_PROFILE===undefined?detail==='full':process.env.CPU_PROFILE==='1';
const timelineEnabled=process.env.CDP_TIMELINE===undefined?detail==='full':process.env.CDP_TIMELINE==='1';
assert.ok(profile,'Unknown PROFILE.');assert.ok(['full','light'].includes(detail),'TRACE_DETAIL must be full or light.');
assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'A local game server is required.');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
async function sourceEvidence(cwd){
  const names=new Set(git(cwd,'ls-files','src','index.html','assets','vendor','package.json','package-lock.json').split('\n'));
  git(cwd,'ls-files','--others','--exclude-standard','src','index.html','assets','vendor').split('\n').forEach(name=>names.add(name));
  const hashes={};for(const name of [...names].filter(Boolean).sort())hashes[name]=sha(await fs.readFile(path.join(cwd,name)));
  return{root:cwd,commit:git(cwd,'rev-parse','HEAD'),branch:git(cwd,'branch','--show-current'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
await fs.mkdir(out,{recursive:true});
await assert.rejects(fs.access(path.join(out,'trace.json')),'Refuse to overwrite an existing trace.');
const report={startedAt:new Date().toISOString(),protocol:'ordinary-input-attribution-v3',profile,detail,diagnosticOverhead:true,
  sourceStart:await sourceEvidence(sourceRoot),tool:{path:fileURLToPath(import.meta.url),sha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),commit:git(root,'rev-parse','HEAD')},
  command:{executable:process.execPath,args:process.argv.slice(1),cwd:process.cwd(),environment:Object.fromEntries(['PROFILE','SOURCE_ROOT','GAME_TEST_URL','OUTPUT_DIR','TRACE_DETAIL','TRACE_INPUT','CPU_PROFILE','CDP_TIMELINE'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))},
  method:'Fresh foreground isolated Chrome; ordinary crawler/standard Begin, first held-left 60 m route, opposite warmed return, actual Save & return to title/Continue, first and opposite routes. Continue here retains the renderer; the low-overhead timing harness separately uses reload/Continue. Native input, timestamps and simulation remain unchanged.',
  limitations:['Diagnostic wrappers and optional CPU/CDP tracing add overhead; use the separate timing harness for benefit measurements.','No GL metadata queries occur at input. Full mode times actual production GL calls; light mode does not wrap GL or material disposal.','No shader callback or customProgramCacheKey is replaced. No compile, render, simulation advance, camera change or warmup is requested by this tool.','Page events use performance.now milliseconds and timeOrigin. The CDP user-timing clock marker aligns its monotonic microsecond clock. Node harness-command timestamps are a separate clock.','Changed-state callback completion is not physical display latency. Phone profiles are Windows emulation, not Apple/WebKit.'],
  inputMethod,timelineCategories,cpuProfileEnabled:cpuEnabled,cdpTimelineEnabled:timelineEnabled,harness:[],errors:[],warnings:[],remote:[],failedRequests:[],diagnosticFailures:[],passed:false};
let browser,context,page,cdp,cpuStarted=false,timelineStarted=false,timelineComplete;
const harness=(action,extra={})=>report.harness.push({action,utc:new Date().toISOString(),nodeMonotonicNs:process.hrtime.bigint().toString(),...extra});
try{
  const health=await(await fetch(new URL('/health',base))).json();assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,sha(sourceRoot.replaceAll('\\','/').toLowerCase()));report.server={url:base.href,health};
  const args=['--mute-audio','--enable-gpu','--use-angle=d3d11'];browser=await chromium.launch({channel:'chrome',headless:false,args});report.browser={version:browser.version(),channel:'chrome',headless:false,args};
  context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.deviceScaleFactor,isMobile:profile.mobile,hasTouch:profile.mobile});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();report.remote.push(url.href);return route.abort();});
  await context.addInitScript(({quality,detail})=>{
    localStorage.setItem('colossus-quality-v1',quality);
    const nativeRAF=requestAnimationFrame.bind(window),nativeAdd=EventTarget.prototype.addEventListener,nativeRemove=EventTarget.prototype.removeEventListener;
    const log=window.__trace={phase:'loading',timeOrigin:performance.timeOrigin,events:[],frames:[],longTasks:[],routes:[],listeners:[],callbacks:[],clockMarkers:[],frame:0,current:null,currentFrame:null};
    const state=()=>{const s=window.__colossus?.state;return s?{x:s.x,z:s.z,time:s.time,angle:s.angle,paused:s.paused,moving:s.moving,population:s.population,mode:s.mode}:null;};
    // Existing JS/DOM fields only: no GL query, extension lookup or driver probe.
    const snapshot=()=>{const g=window.__colossus.scene,r=g.renderer;return{time:performance.now(),state:state(),environment:{viewport:[innerWidth,innerHeight],deviceDpr:devicePixelRatio,rendererDpr:r.getPixelRatio(),drawingBuffer:[r.domElement.width,r.domElement.height],quality:g.quality,light:g.light,
      cameraControls:{view:g.view,mode:g.cinematic.mode,yaw:g.yaw,pitch:g.pitch,zoom:g.zoom},cameraPosition:g.camera.position.toArray(),cameraAim:g.cameraAim.toArray(),cameraFov:g.camera.fov,visibility:document.visibilityState,focused:document.hasFocus()},movementPreparation:g.movementPreparation?{...g.movementPreparation.status}:null};};
    log.snapshot=snapshot;
    const targetName=t=>t===window?'window':t===document?'document':t?.id?'#'+t.id:t?.dataset?.move?'[data-move='+t.dataset.move+']':t?.nodeName||t?.constructor?.name||null;
    const eventIds=new WeakMap();let nextEvent=0;
    const eventId=e=>{if(!eventIds.has(e))eventIds.set(e,++nextEvent);return eventIds.get(e);};
    const eventData=e=>({event:eventId(e),type:e.type,eventTimeStamp:e.timeStamp,key:e.key,repeat:e.repeat,pointerType:e.pointerType,pointerId:e.pointerId,isTrusted:e.isTrusted,target:targetName(e.target)});
    const span=(kind,start,extra={})=>{const end=performance.now();log.events.push({kind,phase:log.phase,frame:log.currentFrame??log.frame,start,end,ms:end-start,...extra});};
    let route=null,resolveRoute;
    window.__traceArm=(label,direction)=>{
      if(route&&!route.end)throw Error('A trace route is already active.');
      log.phase=label;route={label,direction,armedAt:performance.now(),start:null,end:null,focusLost:false};log.routes.push(route);
      window.__traceRouteResult=new Promise(resolve=>resolveRoute=resolve);route.watchdog=setTimeout(()=>finishRoute(true),45000);
    };
    function finishRoute(timedOut){
      if(!route||route.end)return;route.end=snapshot();route.timedOut=timedOut;clearTimeout(route.watchdog);delete route.watchdog;
      if(route.start){const a=route.start.state,b=route.end.state;route.projectedDistance=(b.x-a.x)*route.vector.x+(b.z-a.z)*route.vector.z;}
      resolveRoute({inputMissing:!route.start,timedOut,projectedDistance:route.projectedDistance});
    }
    // Capture delivery before production listeners; wrappers retain registration
    // order, capture/passive/once options, remove identity and target binding.
    const inputTypes=new Set(['keydown','keyup','pointerdown','pointerup','pointercancel','lostpointercapture','click']);
    for(const type of inputTypes)nativeAdd.call(window,type,e=>{
      const at=performance.now(),data=eventData(e);log.events.push({kind:'inputDelivery',phase:log.phase,frame:log.frame,start:at,...data});
      const match=route&&!route.start&&(type==='keydown'?e.key.toLowerCase()===(route.direction==='left'?'a':'d'):type==='pointerdown'&&e.target.closest?.('[data-move]')?.dataset.move===route.direction);
      if(match){route.inputAt=at;route.inputEvent=data.event;route.start=snapshot();route.inputObservationMs=performance.now()-at;route.vector={x:Math.cos(route.start.environment.cameraControls.yaw)*(route.direction==='left'?-1:1),z:-Math.sin(route.start.environment.cameraControls.yaw)*(route.direction==='left'?-1:1)};}
    },true);
    const listenerRegistry=new WeakMap();
    EventTarget.prototype.addEventListener=function(type,listener,options){
      if(!listener||!inputTypes.has(type))return nativeAdd.call(this,type,listener,options);
      let listeners=listenerRegistry.get(this);if(!listeners)listenerRegistry.set(this,listeners=new WeakMap());
      let entries=listeners.get(listener);if(!entries)listeners.set(listener,entries=new Map());
      const capture=typeof options==='boolean'?options:!!options?.capture,key=type+':'+capture;
      if(!entries.has(key)){
        const descriptor={id:log.listeners.length,type,target:targetName(this),capture,name:listener.name||listener.handleEvent?.name||'anonymous',registrationStack:new Error().stack};log.listeners.push(descriptor);
        entries.set(key,function(e){const start=performance.now();try{return typeof listener==='function'?listener.call(this,e):listener.handleEvent.call(listener,e);}finally{span('productionHandler',start,{listener:descriptor.id,...eventData(e),defaultPrevented:e.defaultPrevented});}});
      }
      return nativeAdd.call(this,type,entries.get(key),options);
    };
    EventTarget.prototype.removeEventListener=function(type,listener,options){const capture=typeof options==='boolean'?options:!!options?.capture;return nativeRemove.call(this,type,listenerRegistry.get(this)?.get(listener)?.get(type+':'+capture)||listener,options);};
    nativeAdd.call(window,'blur',()=>{if(route?.start&&!route.end)route.focusLost=true;});nativeAdd.call(document,'visibilitychange',()=>{if(route?.start&&!route.end&&document.hidden)route.focusLost=true;});
    new PerformanceObserver(list=>{for(const e of list.getEntries())log.longTasks.push({start:e.startTime,duration:e.duration,name:e.name,attribution:e.attribution?.map(a=>({name:a.name,containerType:a.containerType,containerId:a.containerId}))});}).observe({type:'longtask',buffered:true});
    const callbackIds=new WeakMap();
    const callbackId=(cb,kind)=>{if(!callbackIds.has(cb)){const id=log.callbacks.length;callbackIds.set(cb,id);log.callbacks.push({id,kind,name:cb.name||'anonymous',registrationStack:new Error().stack});}return callbackIds.get(cb);};
    window.requestAnimationFrame=cb=>{
      if(typeof cb!=='function')return nativeRAF(cb);const callback=callbackId(cb,'raf'),requestedAt=performance.now();
      return nativeRAF(timestamp=>{
        const main=cb.name==='frame',frame=log.frame,priorFrame=log.currentFrame,start=performance.now(),phase=log.phase;if(main)log.currentFrame=frame;
        try{return cb(timestamp);}finally{
          const end=performance.now();log.events.push({kind:main?'mainRAF':'otherRAF',phase,frame,callback,requestedAt,timestamp,start,end,ms:end-start});
          if(main){const s=state();log.frames.push({phase,frame,start,end,ms:end-start,t:timestamp,x:s?.x,z:s?.z,state:s});log.frame++;log.currentFrame=priorFrame;
            if(route?.start&&!route.end){const a=route.start.state;if(Math.hypot(s.x-a.x,s.z-a.z)>1e-6&&route.firstChangedFrameAt===undefined){route.firstChangedFrameAt=end;route.firstRenderedMovementMs=end-route.inputAt;route.firstChangedFrame=frame;}
              if((s.x-a.x)*route.vector.x+(s.z-a.z)*route.vector.z>=60)finishRoute(false);}
          }
        }
      });
    };
    for(const kind of ['setTimeout','setInterval','requestIdleCallback','queueMicrotask']){
      const original=window[kind];if(!original)continue;
      window[kind]=function(cb,...args){if(typeof cb!=='function')return original.call(this,cb,...args);const callback=callbackId(cb,kind),requestedAt=performance.now();return original.call(this,function(...a){const start=performance.now();try{return cb.apply(this,a);}finally{span(kind,start,{callback,requestedAt});}},...args);};
    }
    const ids=new WeakMap();let nextId=0;const identity=o=>o&&typeof o==='object'?(ids.has(o)?ids.get(o):(ids.set(o,++nextId),nextId)):o;log.glIdentity=identity;
    if(detail==='full')for(const name of ['createProgram','compileShader','linkProgram','getProgramParameter','getShaderParameter','getUniformLocation','getProgramInfoLog','getShaderInfoLog','getActiveUniform','getAttribLocation','getParameter','getExtension','texImage2D','texSubImage2D','texStorage2D','bufferData','bufferSubData','drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced']){
      const proto=WebGL2RenderingContext.prototype,original=proto[name];
      proto[name]=function(...args){const start=performance.now();let result;try{return result=original.apply(this,args);}finally{const end=performance.now(),ms=end-start;
        if(ms>.25||['createProgram','compileShader','linkProgram','texImage2D','texStorage2D'].includes(name))log.events.push({kind:name,phase:log.phase,frame:log.currentFrame??log.frame,start,end,ms,object:log.current,glIdentity:identity(name==='createProgram'?result:args[0]),arg1:typeof args[1]==='number'?args[1]:null,...(ms>10?{stack:new Error().stack}:{})});}
      };
    }
  },{quality:profile.quality,detail});
  page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',e=>report.errors.push({message:e.message,stack:e.stack}));page.on('console',m=>{if(m.type()==='error')report.errors.push({message:m.text()});if(['warning','warn'].includes(m.type()))report.warnings.push(m.text());});page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()?.errorText}));
  harness('navigation-start');await page.goto(new URL('?test=1',base).href,{waitUntil:'domcontentloaded'});await page.bringToFront();await page.locator('#begin').waitFor({state:'visible'});await page.waitForFunction(()=>!!window.__colossus?.scene);harness('ui-ready');
  await page.evaluate(detail=>{
    const g=window.__colossus.scene,r=g.renderer,log=window.__trace,watched=new WeakSet();
    const materials=group=>{const list=new Map();group.traverse(o=>{for(const m of [o.material,o.customDepthMaterial,o.customDistanceMaterial].flat().filter(Boolean))list.set(m.uuid,m);});return list;};
    const worldMaterials=materials(g.world);
    const watch=()=>{if(detail!=='full')return;for(const m of materials(g.scene).values())if(!watched.has(m)){watched.add(m);m.addEventListener('dispose',()=>log.events.push({kind:'materialDispose',phase:log.phase,frame:log.currentFrame??log.frame,start:performance.now(),uuid:m.uuid,name:m.name,shared:m.userData.shared,inWorld:worldMaterials.has(m.uuid)}));}};
    const programData=m=>[...(r.properties.get(m).programs?.values()||[])].map(p=>({id:p.id,glIdentity:log.glIdentity(p.program),key:p.cacheKey}));
    const resources=()=>({memory:{...r.info.memory},programs:r.info.programs.map(p=>({id:p.id,key:p.cacheKey,usedTimes:p.usedTimes,glIdentity:log.glIdentity(p.program)})),materials:detail==='full'?[...materials(g.scene).values()].map(m=>({uuid:m.uuid,name:m.name,type:m.type,shared:m.userData.shared,world:worldMaterials.has(m.uuid),map:m.map?.uuid,source:m.map?.source.uuid,key:m.customProgramCacheKey(),defines:m.defines,programs:programData(m)})):null});
    window.__traceSnapshot=()=>({...log.snapshot(),...resources()});
    const wrap=(object,name,kind,extra=()=>({}))=>{const original=object[name];object[name]=function(...args){const start=performance.now(),data=extra(...args);try{return original.apply(this,args);}finally{const end=performance.now();log.events.push({kind,phase:log.phase,frame:log.currentFrame??log.frame,start,end,ms:end-start,...data});}};};
    wrap(g,'update','sceneUpdate',()=>({state:log.snapshot().state}));
    wrap(r,'render','renderSubmission',(scene,camera)=>({scene:{uuid:scene.uuid,name:scene.name,type:scene.type},camera:{uuid:camera.uuid,type:camera.type},target:r.getRenderTarget()?.uuid||null}));
    wrap(r,'compile','compileSubmission',(object,camera,target)=>({object:{uuid:object.uuid,name:object.name,type:object.type},camera:camera.uuid,scene:target?.uuid,target:r.getRenderTarget()?.uuid||null}));
    if(g.movementPreparation)wrap(g.movementPreparation,'prepare','movementPreparation',(...args)=>({key:args[3]}));
    const originalSet=g.setGame;g.setGame=function(...args){const metadataStart=performance.now();watch();const before=resources(),start=performance.now();try{return originalSet.apply(this,args);}finally{const end=performance.now();watch();const after=resources();log.events.push({kind:'setGame',phase:log.phase,frame:log.currentFrame??log.frame,start,end,ms:end-start,before,after,metadataOverheadMs:start-metadataStart+performance.now()-end});}};
    if(detail==='full'){
      const direct=r.renderBufferDirect;r.renderBufferDirect=function(camera,scene,geometry,material,object){const previous=log.current;log.current={mesh:object.uuid,name:object.name,material:material.uuid,materialName:material.name,materialType:material.type,key:material.customProgramCacheKey(),defines:material.defines,geometry:geometry.uuid,map:material.map?.uuid,alphaMap:material.alphaMap?.uuid,count:object.count,camera:camera.type,target:r.getRenderTarget()?.uuid||null};
        const start=performance.now();try{return direct.apply(this,arguments);}finally{const end=performance.now(),ms=end-start;if(ms>.5)log.events.push({kind:'renderBufferDirect',phase:log.phase,frame:log.currentFrame??log.frame,start,end,ms,object:log.current,programs:programData(material),...(ms>10?{stack:new Error().stack}:{})});log.current=previous;}};
    }
    watch();
  },detail);
  cdp=await context.newCDPSession(page);
  if(timelineEnabled){timelineComplete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.start',{categories:timelineCategories,transferMode:'ReturnAsStream'});timelineStarted=true;}
  if(cpuEnabled){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');cpuStarted=true;}
  report.clock=await page.evaluate(()=>{const marker={name:'colossus-input-trace-clock',now:performance.now(),timeOrigin:performance.timeOrigin};performance.mark(marker.name);console.timeStamp(marker.name);window.__trace.clockMarkers.push(marker);return marker;});
  await page.evaluate(()=>window.__trace.phase='choose-crawler');await page.locator('[data-faction="crawler"]').click();await page.locator('[data-variant="standard"]').click();
  await page.evaluate(()=>window.__trace.phase='begin');harness('begin-command-start');await page.locator('#begin').click();harness('begin-command-end');
  async function held(direction,down){
    harness('input-command-start',{direction,down});
    if(!profile.mobile){
      const key=direction==='left'?'a':'d';
      if(inputMethod==='cdp'){
        // Match pinned Playwright's printable-key payload exactly. rawKeyDown
        // would suppress the character event and would not be an equal control.
        const code=key==='a'?'KeyA':'KeyD',windowsVirtualKeyCode=key==='a'?65:68;
        const payload=down?{type:'keyDown',modifiers:0,windowsVirtualKeyCode,code,commands:[],key,text:key,unmodifiedText:key,autoRepeat:false,location:0,isKeypad:false}
          :{type:'keyUp',modifiers:0,key,windowsVirtualKeyCode,code,location:0};
        harness('direct-cdp-payload',{payload});await cdp.send('Input.dispatchKeyEvent',payload);
      }else await page.keyboard[down?'down':'up'](key);
    }
    else if(!down)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else{const box=await page.locator(`[data-move="${direction}"]`).boundingBox();assert.ok(box,'Movement control missing.');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});}
    harness('input-command-end',{direction,down});
  }
  async function route(label,direction){
    harness('route-arm-start',{label});await page.evaluate(({label,direction})=>window.__traceArm(label,direction),{label,direction});harness('route-arm-end',{label});
    let result;try{await held(direction,true);result=await page.evaluate(()=>window.__traceRouteResult);}finally{await held(direction,false);}
    assert.equal(result.inputMissing,false,label+': native input missing');assert.equal(result.timedOut,false,label+': route timed out');assert.ok(result.projectedDistance>=60&&result.projectedDistance<61.5,label+': endpoint outside native movement step');
    await page.evaluate(()=>window.__trace.phase='between-routes');console.log(JSON.stringify({event:'trace-route-complete',profile:profile.name,label,...result}));
  }
  await route('begin-first','left');await route('begin-warmed-opposite','right');
  await page.locator(profile.mobile?'#mobile-menu':'#menu').click();await page.evaluate(()=>window.__trace.phase='return-title');await page.locator('[data-dialog-action="title"]').click();await page.evaluate(()=>window.__trace.phase='continue');
  harness('continue-command-start');await page.locator('#continue').click();harness('continue-command-end');await route('continue-first-same-renderer','left');await route('continue-warmed-opposite','right');
  await page.screenshot({path:path.join(out,'ordinary-foreground.png')});
  const final=await page.evaluate(()=>window.__traceSnapshot()),dpr=profile.quality==='high'?1.25:.85;
  assert.equal(final.environment.quality,profile.quality);assert.equal(final.environment.rendererDpr,dpr);assert.deepEqual(final.environment.drawingBuffer,[Math.floor(profile.viewport.width*dpr),Math.floor(profile.viewport.height*dpr)]);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.failedRequests,[]);report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{
  if(cpuStarted)try{const cpu=await cdp.send('Profiler.stop');await fs.writeFile(path.join(out,'cpu-profile.json'),JSON.stringify(cpu));}catch(error){report.diagnosticFailures.push({stage:'cpu-profile',message:error.message});}
  if(timelineStarted)try{
    await cdp.send('Tracing.end');const {stream}=await timelineComplete,chunks=[];
    try{while(true){const part=await cdp.send('IO.read',{handle:stream});chunks.push(Buffer.from(part.data,part.base64Encoded?'base64':'utf8'));if(part.eof)break;}}finally{await cdp.send('IO.close',{handle:stream});}
    await fs.writeFile(path.join(out,'cdp-timeline.json'),Buffer.concat(chunks));
  }catch(error){report.diagnosticFailures.push({stage:'cdp-timeline',message:error.message});}
  if(page&&!page.isClosed())try{
    Object.assign(report,await page.evaluate(()=>{
      const r=window.__colossus?.scene.renderer,gl=r?.getContext();let adapter=null;
      // After routes and input release only, never an input-boundary probe.
      if(gl){const debug=gl.getExtension('WEBGL_debug_renderer_info');adapter={gpu:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),webgl:gl.getParameter(gl.VERSION),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],contextLost:gl.isContextLost()};}
      return{trace:window.__trace,final:window.__traceSnapshot?.(),adapter,visibility:document.visibilityState,userAgent:navigator.userAgent};
    }));
    for(const route of report.trace?.routes||[])if(route.focusLost||route.start?.environment.visibility!=='visible'||!route.start?.environment.focused)report.diagnosticFailures.push({stage:'foreground',route:route.label});
    if(report.adapter&&report.final&&!report.adapter.drawingBuffer.every((v,i)=>v===report.final.environment.drawingBuffer[i]))report.diagnosticFailures.push({stage:'actual-buffer-mismatch'});
  }catch(error){report.diagnosticFailures.push({stage:'final-page-evidence',message:error.message});}
  if(context)await context.close();if(browser)await browser.close();
  report.sourceFinish=await sourceEvidence(sourceRoot);report.sourceStable=report.sourceStart.fingerprint===report.sourceFinish.fingerprint;
  if(!report.sourceStable||report.diagnosticFailures.length){report.passed=false;process.exitCode=1;}
  report.endedAt=new Date().toISOString();report.exitCode=process.exitCode||0;await fs.writeFile(path.join(out,'trace.json'),JSON.stringify(report,null,2));
  const phaseSummary={};for(const frame of report.trace?.frames||[]){const phase=phaseSummary[frame.phase]??={frames:0,maxCallback:0,longFrames:[]};phase.frames++;phase.maxCallback=Math.max(phase.maxCallback,frame.ms);if(frame.ms>50)phase.longFrames.push(frame);}
  const events=report.trace?.events||[],disposals=events.filter(e=>e.kind==='materialDispose'&&e.inWorld);
  await fs.writeFile(path.join(out,'summary.json'),JSON.stringify({profile,detail,passed:report.passed,exitCode:report.exitCode,sourceFingerprint:report.sourceStart.fingerprint,phaseSummary,routes:report.trace?.routes,sharedWorldDisposals:disposals,expensive:events.filter(e=>e.ms>10),errors:report.errors,warnings:report.warnings,diagnosticFailures:report.diagnosticFailures},null,2));
  console.log(JSON.stringify({event:'trace-finished',out,passed:report.passed,exitCode:report.exitCode,phaseSummary,sharedWorldDisposals:disposals.length,errors:report.errors}));
}
