// Observe ordinary Begin/Continue with native RAF and real UI input. No fixture
// reset, scene compile, simulation advance, hidden movement or image capture.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = path.resolve(process.env.OUTPUT_DIR || 'artifacts/first-use/timing');
const mode = process.env.MODE || 'single';
const profiles = [
  {name:'desktop', viewport:{width:1440,height:960}, deviceScaleFactor:1, mobile:false, quality:'high'},
  {name:'phone-portrait', viewport:{width:390,height:844}, deviceScaleFactor:2, mobile:true, quality:'performance'},
  {name:'phone-landscape', viewport:{width:844,height:390}, deviceScaleFactor:2, mobile:true, quality:'performance'}
].filter(p => !process.env.PROFILE || p.name === process.env.PROFILE);
assert.ok(profiles.length, 'Unknown PROFILE.');
assert.ok(['single','interleave'].includes(mode), 'MODE must be single or interleave.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (cwd,...args) => execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
async function sourceEvidence(sourceRoot) {
  const names = new Set(git(sourceRoot,'ls-files','src','index.html','assets','vendor','package.json','package-lock.json').split('\n'));
  git(sourceRoot,'ls-files','--others','--exclude-standard','src','index.html','assets','vendor').split('\n').forEach(p => names.add(p));
  const hashes = {};
  for (const file of [...names].filter(Boolean).sort()) hashes[file] = sha(await fs.readFile(path.join(sourceRoot,file)));
  return {root:sourceRoot,commit:git(sourceRoot,'rev-parse','HEAD'),branch:git(sourceRoot,'branch','--show-current'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}

// Writes even a failed visit to the index; never retries an unfavorable run.
if (mode === 'interleave') {
  const pairs = Number(process.env.PAIRS || 3);
  assert.ok(Number.isInteger(pairs) && pairs >= 1 && pairs <= 3);
  for (const key of ['BASELINE_ROOT','CANDIDATE_ROOT','BASELINE_URL','CANDIDATE_URL']) assert.ok(process.env[key], `${key} required.`);
  const index = {startedAt:new Date().toISOString(),protocol:'ordinary-ui-first-use-v2-deferred-gl-metadata',method:'Sequential A1/B1/A2/B2/A3/B3 per profile; each child closes its foreground browser.',sequence:[],pairs:[],sourceFingerprints:{},passed:false};
  await fs.mkdir(out,{recursive:true});
  try {
    for (const profile of profiles) for (let pair=1;pair<=pairs;pair++) for (const build of ['A','B']) {
      const label=build+pair, visitOut=path.join(out,profile.name,label), before=build==='A';
      await fs.mkdir(visitOut,{recursive:true});
      const row={profile:profile.name,label,startedAt:new Date().toISOString(),report:path.join(visitOut,'report.json')};
      index.sequence.push(row);
      const args=[fileURLToPath(import.meta.url)], env={...process.env,MODE:'single',PROFILE:profile.name,RUN_LABEL:label,
        SOURCE_ROOT:process.env[before?'BASELINE_ROOT':'CANDIDATE_ROOT'],GAME_TEST_URL:process.env[before?'BASELINE_URL':'CANDIDATE_URL'],OUTPUT_DIR:visitOut};
      row.command={executable:process.execPath,args,environment:Object.fromEntries(['MODE','PROFILE','RUN_LABEL','SOURCE_ROOT','GAME_TEST_URL','OUTPUT_DIR','HEADLESS','GPU_TIMING','SCENE_CPU'].filter(k=>env[k]!==undefined).map(k=>[k,env[k]]))};
      row.exitCode=await new Promise((resolve,reject)=>{
        const child=spawn(process.execPath,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});
        const chunks=[];for(const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>{chunks.push(chunk);process.stdout.write(chunk);});
        child.once('error',reject);child.once('close',async code=>{await fs.writeFile(path.join(visitOut,'process.log'),Buffer.concat(chunks));resolve(code);});
      });
      row.finishedAt=new Date().toISOString();
      await fs.writeFile(path.join(out,'interleaved-report.json'),JSON.stringify(index,null,2));
      assert.equal(row.exitCode,0,`${profile.name} ${label} failed; original evidence retained, no retry.`);
      const visit=JSON.parse(await fs.readFile(row.report,'utf8'));
      row.sourceFingerprint=visit.sourceStart.fingerprint;
      assert.equal(visit.sourceStart.fingerprint,visit.sourceFinish.fingerprint);
      index.sourceFingerprints[build]??=row.sourceFingerprint;
      assert.equal(row.sourceFingerprint,index.sourceFingerprints[build],build+': source changed between visits');
      if(build==='B') {
        const a=JSON.parse(await fs.readFile(index.sequence.at(-2).report,'utf8')), b=visit;
        for(const key of ['version','headless','channel','args']) assert.deepEqual(a.browser[key],b.browser[key],`Paired browser ${key}`);
        const comparisons=[];
        for(let i=0;i<a.routes.length;i++) {
          const x=a.routes[i],y=b.routes[i];assert.equal(x.label,y.label);
          for(const key of ['viewport','deviceDpr','rendererDpr','drawingBuffer','quality','light','gpu','webgl','cameraControls']) assert.deepEqual(x.start.environment[key],y.start.environment[key],`${x.label}: paired ${key}`);
          comparisons.push({label:x.label,configurationMatched:true,
            startDelta:{x:y.start.state.x-x.start.state.x,z:y.start.state.z-x.start.state.z,time:y.start.state.time-x.start.state.time,angle:y.start.state.angle-x.start.state.angle},
            endDelta:{x:y.end.state.x-x.end.state.x,z:y.end.state.z-x.end.state.z},
            note:'Native state/time and settled camera pose are not forced equal. Retain deltas; Continue uses the save produced by that visit.'});
        }
        index.pairs.push({profile:profile.name,pair,comparisons});
      }
      await fs.writeFile(path.join(out,'interleaved-report.json'),JSON.stringify(index,null,2));
      console.log(JSON.stringify({event:'first-use-visit-complete',profile:profile.name,label}));
    }
    index.passed=true;
  } catch(error) { index.failure=error.stack;process.exitCode=1; }
  index.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'interleaved-report.json'),JSON.stringify(index,null,2));
} else {
  assert.equal(profiles.length,1,'Single visits require PROFILE; interleave selects all profiles by default.');
  const profile=profiles[0], sourceRoot=await fs.realpath(path.resolve(process.env.SOURCE_ROOT||root));
  const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4201/');
  assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'Local game server required.');
  await fs.mkdir(out,{recursive:true});
  await assert.rejects(fs.access(path.join(out,'report.json')), 'Refuse to overwrite an existing visit.');
  const report={startedAt:new Date().toISOString(),protocol:'ordinary-ui-first-use-v2-deferred-gl-metadata',runLabel:process.env.RUN_LABEL||null,profile,sourceStart:await sourceEvidence(sourceRoot),
    command:{executable:process.execPath,args:process.argv.slice(1),environment:Object.fromEntries(['MODE','PROFILE','RUN_LABEL','SOURCE_ROOT','GAME_TEST_URL','OUTPUT_DIR','HEADLESS','GPU_TIMING','SCENE_CPU'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))},
    method:'Fresh isolated storage. Real title crawler/standard selection, Begin, native held-left movement, opposite warmed return, Save/reload/Continue, first movement, opposite warmed return. No scene reset/precompile/advance or pre-movement settling. Native frame callback executes once with its original timestamp.',
    limitations:'Foreground Windows Chrome by default; HEADLESS=1 is explicitly separate. Phone profiles are viewport/touch emulation. First rendered changed-state completion is an input-response proxy, not display photon latency. RAF intervals are not display refresh certification. Callback wall time includes waits. Driver/OS caches and machine activity are uncontrolled. Warmed opposite routes have different start positions/history; Continue uses this isolated visit\'s actual save. No fixture-reset measurement is substituted here.',
    routes:[],startups:[],errors:[],warnings:[],remote:[],failedRequests:[],passed:false};
  let browser,context,page;
  try {
    const health=await(await fetch(new URL('/health',base))).json();
    assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,sha(sourceRoot.replaceAll('\\','/').toLowerCase()));
    report.server={url:base.href,health};
    const headless=process.env.HEADLESS==='1',args=['--mute-audio','--enable-gpu','--use-angle=d3d11'];
    browser=await chromium.launch({channel:'chrome',headless,args});
    report.browser={version:browser.version(),channel:'chrome',headless,args};
    context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.deviceScaleFactor,isMobile:profile.mobile,hasTouch:profile.mobile});
    await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();report.remote.push(url.href);return route.abort();});
    await context.addInitScript(({quality,gpuTiming,sceneTiming})=>{
      localStorage.setItem('colossus-quality-v1',quality);
      const nativeRAF=requestAnimationFrame.bind(window), timings={startups:[],active:null,lastFrame:null};window.__firstUse=timings;
      let renderer,gl,ext,route,oldUpdate,query=null,sceneMs=0;
      const state=()=>{const s=window.__colossus.state;return{x:s.x,z:s.z,time:s.time,angle:s.angle,paused:s.paused,moving:s.moving,population:s.population,mode:s.mode};};
      // Input observers must not synchronously query the graphics driver. These
      // are existing JS/DOM properties only; GL adapter/version/buffer queries
      // are deferred until input is released and the measured route has ended.
      const environment=()=>{const g=window.__colossus.scene,r=g.renderer;return{
        viewport:[innerWidth,innerHeight],deviceDpr:devicePixelRatio,rendererDpr:r.getPixelRatio(),drawingBuffer:[r.domElement.width,r.domElement.height],quality:g.quality,light:g.light,
        cameraControls:{view:g.view,mode:g.cinematic.mode,yaw:g.yaw,pitch:g.pitch,zoom:g.zoom},cameraFov:g.camera.fov,cameraPosition:g.camera.position.toArray(),cameraAim:g.cameraAim.toArray(),
        environmentReady:g.environmentReady,surfaces:g.surfaceDiagnostics(),visibility:document.visibilityState,focused:document.hasFocus()};};
      const snapshot=()=>{const g=window.__colossus.scene;return{state:state(),environment:environment(),memory:{...g.renderer.info.memory},programs:(g.renderer.info.programs||[]).map(p=>({id:p.id,name:p.name,usedTimes:p.usedTimes,cacheKey:p.cacheKey})),
        movementPreparation:g.movementPreparation?{...g.movementPreparation.status}:null,resourceIdentities:{city:g.city.root.uuid,enemies:g.enemyCities.map(c=>c.root.uuid),sites:g.labels.map(s=>({id:s.uuid,name:s.name}))}};};
      const summary=values=>{const v=[...values].sort((a,b)=>a-b);return{samples:v.length,median:v[Math.floor(v.length*.5)]??null,p95:v[Math.floor(v.length*.95)]??null,max:v.at(-1)??null,above50:v.filter(x=>x>50).length,above100:v.filter(x=>x>100).length};};
      timings.snapshot=snapshot;
      window.addEventListener('click',event=>{const button=event.target.closest('#begin,#continue');if(button)timings.startups.push({action:button.id,clickAt:performance.now(),stateBefore:window.__colossus?state():null});},true);
      window.addEventListener('click',event=>{if(!event.target.closest('#begin,#continue'))return;const s=timings.startups.at(-1);s.handlerEndAt=performance.now();s.handlerWallMs=s.handlerEndAt-s.clickAt;});
      function collect() {
        if(!ext||!route)return;
        if(gl.getParameter(ext.GPU_DISJOINT_EXT)){route.disjoint++;route.queryAccounting.discardedDisjoint+=route.pending.length;for(const q of route.pending)gl.deleteQuery(q);route.pending=[];return;}
        while(route.pending.length&&gl.getQueryParameter(route.pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=route.pending.shift();route.gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
      }
      timings.arm=(label,direction)=>{
        if(route)throw Error('Route already active');
        renderer=window.__colossus.scene.renderer;gl=renderer.getContext();ext=gpuTiming?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;
        let resolve;const promise=new Promise(r=>resolve=r);timings.result=promise;
        route={label,direction,resolve,start:null,end:null,frames:[],gpu:[],pending:[],disjoint:0,queryAccounting:{issued:0,skippedPending:0,skippedBusy:0,discardedDisjoint:0},focusLost:false};
        route.watchdog=setTimeout(()=>{if(!route.start){route.resolve({inputMissing:true});return;}finish(true);},45000);
        if(sceneTiming){const g=window.__colossus.scene;oldUpdate=g.update;g.update=function(...a){const t=performance.now();try{return oldUpdate.apply(this,a);}finally{sceneMs+=performance.now()-t;}};}
      };
      const input=event=>{
        if(!route||route.start)return;
        const match=event.type==='keydown'?(event.key.toLowerCase()===(route.direction==='left'?'a':'d')):event.target.closest('[data-move]')?.dataset.move===route.direction;
        if(!match)return;
        route.inputAt=performance.now();route.start=snapshot();route.inputObservationMs=performance.now()-route.inputAt;route.prior=timings.lastFrame;
        route.vector={x:Math.cos(route.start.environment.cameraControls.yaw)*(route.direction==='left'?-1:1),z:-Math.sin(route.start.environment.cameraControls.yaw)*(route.direction==='left'?-1:1)};
      };
      window.addEventListener('keydown',input,true);window.addEventListener('pointerdown',input,true);
      window.addEventListener('blur',()=>{if(route?.start&&!route.end)route.focusLost=true;});
      document.addEventListener('visibilitychange',()=>{if(route?.start&&!route.end&&document.hidden)route.focusLost=true;});
      function finish(timedOut) {
        if(!route||route.end)return;route.end=snapshot();route.endAt=performance.now();route.timedOut=timedOut;clearTimeout(route.watchdog);
        if(sceneTiming){window.__colossus.scene.update=oldUpdate;oldUpdate=null;}
        route.resolve({reached:!timedOut});
      }
      timings.drain=()=>new Promise(resolve=>{
        let turns=0;const complete=()=>{
          collect();if(route.pending.length&&++turns<120){nativeRAF(complete);return;}
          const r=route;for(const q of r.pending)gl.deleteQuery(q);
          const metadataAt=performance.now(),debug=gl.getExtension('WEBGL_debug_renderer_info');
          const metadata={gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webgl:gl.getParameter(gl.VERSION)};
          const actualBuffer=[gl.drawingBufferWidth,gl.drawingBufferHeight];
          const metadataObservation={when:'After measured route, input release and GPU query drain; not part of input observation',durationMs:performance.now()-metadataAt,
            actualDrawingBuffer:actualBuffer,bufferMatchesEnd:actualBuffer.every((v,i)=>v===r.end.environment.drawingBuffer[i])};
          for(const endpoint of [r.start,r.end])Object.assign(endpoint.environment,metadata,{adapterMetadataObserved:'after route',drawingBufferSource:'renderer.domElement width/height; checked against GL after route'});
          const values=key=>r.frames.map(f=>f[key]).filter(v=>v!==null);
          const endState=r.end.state,startState=r.start.state;
          const result={label:r.label,input:r.direction,start:r.start,end:r.end,inputAt:r.inputAt,inputObservationMs:r.inputObservationMs,endAt:r.endAt,wallDurationMs:r.endAt-r.inputAt,
            startupClickToInputMs:r.label.endsWith('-first')?r.inputAt-timings.startups.at(-1).clickAt:null,
            firstRenderedMovementMs:r.firstResponse??null,responseMeaning:'Input event capture to completion of first native main.frame whose state position changed; input snapshot reads no GL metadata. Actual display presentation is not measured.',metadataObservation,
            route:{targetProjectedDistance:60,projectedDistance:(endState.x-startState.x)*r.vector.x+(endState.z-startState.z)*r.vector.z,worldDisplacement:Math.hypot(endState.x-startState.x,endState.z-startState.z)},
            frameIntervalMs:summary(values('interval')),mainCallbackMs:summary(values('callback')),sceneCallbackMs:sceneTiming?summary(values('scene')):null,gpuMs:summary(r.gpu),
            renderCalls:summary(values('calls')),renderTriangles:summary(values('triangles')),frames:r.frames,gpuExtension:!!ext,gpuTimingRequested:gpuTiming,
            queryAccounting:{...r.queryAccounting,completed:r.gpu.length,missingFrameSamples:r.frames.length-r.gpu.length,discardedAfterDrain:r.pending.length},
            shaderPrograms:{start:r.start.programs.length,end:r.end.programs.length},focusLost:r.focusLost,contextLost:gl.isContextLost(),timedOut:r.timedOut};
          route=null;resolve(result);
        };complete();
      });
      window.requestAnimationFrame=callback=>nativeRAF(timestamp=>{
        if(callback.name!=='frame'){callback(timestamp);return;}
        const active=route?.start&&!route.end;let interval=null;
        if(active){collect();interval=route.prior===null?null:timestamp-route.prior;route.prior=timestamp;sceneMs=0;
          if(ext){if(route.pending.length>=8)route.queryAccounting.skippedPending++;else if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))route.queryAccounting.skippedBusy++;else{query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);route.queryAccounting.issued++;}}}
        const begin=performance.now();
        try{callback(timestamp);}finally{
          const end=performance.now();timings.lastFrame=timestamp;
          if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);route.pending.push(query);query=null;}
          const startup=timings.startups.at(-1);
          if(startup&&!startup.firstGameplayFrameAt&&window.__colossus&&!window.__colossus.scene.preview&&!document.getElementById('hud').classList.contains('hidden')){startup.firstGameplayFrameAt=end;startup.clickToFirstGameplayFrameMs=end-startup.clickAt;startup.stateAfterFirstFrame=state();}
          if(active){const s=state(),start=route.start.state;route.frames.push({timestamp,interval,callback:end-begin,scene:sceneTiming?sceneMs:null,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,programs:renderer.info.programs.length});
            const moved=Math.hypot(s.x-start.x,s.z-start.z);if(moved>1e-6&&route.firstResponse===undefined)route.firstResponse=end-route.inputAt;
            if((s.x-start.x)*route.vector.x+(s.z-start.z)*route.vector.z>=60)finish(false);
          }
        }
      });
    },{quality:profile.quality,gpuTiming:process.env.GPU_TIMING!=='0',sceneTiming:process.env.SCENE_CPU==='1'});
    page=await context.newPage();page.setDefaultTimeout(45000);
    page.on('pageerror',e=>report.errors.push({message:e.message}));
    page.on('console',m=>{if(m.type()==='error')report.errors.push({message:m.text()});if(['warning','warn'].includes(m.type()))report.warnings.push(m.text());});
    page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()?.errorText}));
    let contact;
    async function held(direction,down) {
      if(!profile.mobile){await page.keyboard[down?'down':'up'](direction==='left'?'a':'d');return;}
      contact??=await context.newCDPSession(page);
      if(!down){await contact.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return;}
      const bounds=await page.locator(`[data-move="${direction}"]`).boundingBox();assert.ok(bounds,'Touch control missing.');
      await contact.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2,id:1}]});
    }
    async function route(label,direction) {
      await page.evaluate(({label,direction})=>window.__firstUse.arm(label,direction),{label,direction});
      let completion;
      try{await held(direction,true);completion=await page.evaluate(()=>window.__firstUse.result);}finally{await held(direction,false);}
      assert.equal(completion.inputMissing,undefined,label+': no matching native input event was observed');
      const result=await page.evaluate(()=>window.__firstUse.drain());report.routes.push(result);
      assert.equal(result.timedOut,false,label+': native route timeout');assert.equal(result.focusLost,false,label+': foreground lost');assert.equal(result.contextLost,false);
      assert.equal(result.metadataObservation.bufferMatchesEnd,true,label+': actual GL buffer differs from recorded endpoint canvas buffer');
      assert.equal(result.start.environment.quality,profile.quality);assert.equal(result.start.environment.visibility,'visible');
      if(!report.browser.headless)assert.equal(result.start.environment.focused,true,label+': foreground focus missing at input');
      assert.deepEqual(result.start.environment.viewport,[profile.viewport.width,profile.viewport.height]);
      assert.equal(result.start.environment.deviceDpr,profile.deviceScaleFactor);
      const expectedDpr=profile.quality==='high'?1.25:.85;
      assert.equal(result.start.environment.rendererDpr,expectedDpr);
      assert.deepEqual(result.start.environment.drawingBuffer,[Math.floor(profile.viewport.width*expectedDpr),Math.floor(profile.viewport.height*expectedDpr)]);
      assert.ok(result.firstRenderedMovementMs!==null);assert.ok(result.route.projectedDistance>=60&&result.route.projectedDistance<61.5,'Native endpoint must remain within one normal movement step.');
      console.log(JSON.stringify({event:'route-complete',label,main:result.mainCallbackMs,interval:result.frameIntervalMs}));
    }
    const navigationAt=Date.now();await page.goto(new URL('?test=1',base).href,{waitUntil:'domcontentloaded'});await page.bringToFront();
    await page.locator('#begin').waitFor({state:'visible'});await page.waitForFunction(()=>!!window.__colossus);
    report.navigationToUiReadyMs=Date.now()-navigationAt;
    await page.locator('[data-faction="crawler"]').click();await page.locator('[data-variant="standard"]').click();
    await page.locator('#begin').click();
    await route('begin-first','left');await route('begin-warmed-opposite','right');
    report.startups.push(...await page.evaluate(()=>window.__firstUse.startups));
    await page.locator(profile.mobile?'#mobile-menu':'#menu').click();await page.locator('[data-dialog-action="save"]').click();await page.locator('[data-dialog-action="close"]').click();
    report.saveBeforeReload=await page.evaluate(()=>({saved:JSON.parse(localStorage.getItem('colossus-wake-save-v1')),state:window.__colossus.snapshot()}));
    const reloadAt=Date.now();await page.reload({waitUntil:'domcontentloaded'});await page.locator('#continue').waitFor({state:'visible'});await page.waitForFunction(()=>!!window.__colossus);
    report.reloadToUiReadyMs=Date.now()-reloadAt;
    await page.locator('#continue').click();await route('continue-first','left');await route('continue-warmed-opposite','right');
    report.startups.push(...await page.evaluate(()=>window.__firstUse.startups));
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.failedRequests,[]);
    report.passed=true;
  } catch(error) {report.failure=error.stack;process.exitCode=1;}
  finally {
    if(context)await context.close();if(browser)await browser.close();
    report.sourceFinish=await sourceEvidence(sourceRoot);report.sourceStable=report.sourceStart.fingerprint===report.sourceFinish.fingerprint;
    if(!report.sourceStable){report.passed=false;process.exitCode=1;}
    report.finishedAt=new Date().toISOString();report.exitCode=process.exitCode||0;
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({event:'first-use-finished',passed:report.passed,exitCode:report.exitCode,report:path.join(out,'report.json')}));
  }
}
