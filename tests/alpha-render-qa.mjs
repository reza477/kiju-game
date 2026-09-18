// Full local render matrix plus a 30-second wall-clock motion soak.
// Run serially after reserving the GPU slot:
// $env:GAME_TEST_URL='http://127.0.0.1:4188'; node tests/alpha-render-qa.mjs
// Uses a fresh Playwright profile; no persistent user profile or iframe.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4188');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'A loopback game server is required.');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/alpha1/render-qa');
const scope=process.env.ALPHA_RENDER_SCOPE||'all';
assert.ok(['all','matrix','soak'].includes(scope),'ALPHA_RENDER_SCOPE must be all, matrix or soak.');
await fs.mkdir(out,{recursive:true});
async function sourceRecord(label){
  const names=['index.html','package.json',...(await fs.readdir('src')).filter(name=>name.endsWith('.js')||name.endsWith('.css')).map(name=>'src/'+name)].sort();
  const files=[];
  for(const name of names)files.push({name,sha256:createHash('sha256').update(await fs.readFile(name)).digest('hex')});
  await fs.writeFile(path.join(out,label+'-source-diff.patch'),execFileSync('git',['diff','--','src','index.html','package.json'],{encoding:'utf8',maxBuffer:16*1024*1024}));
  return {at:new Date().toISOString(),files,status:execFileSync('git',['status','--short'],{encoding:'utf8'})};
}
const variants=[['kaiju','cyborg'],['kaiju','flesh'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']];
const report={startedAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  requestedScope:scope,scope:'180 combinations: six carriers, every supported view, three quality presets and three lighting presets. Six real gameplay callbacks on native RAF per combination; screenshots receive 24 additional callbacks. Separate 5-second settle and 30-second route warmup before the 30-second measured real-time crawler motion soak. No accelerated or fabricated frame timestamps.',
  limitations:'Desktop Chromium only. Frame and heap observations are not physical mobile benchmarks or evidence of long-session stability. HDR/bloom pixels are sampled, not exhaustively read. JS heap observations are sensitive to garbage collection.',
  matrix:[],geometry:[],screenshots:[],errors:[],shaderErrors:[],remote:[],failedRequests:[],checks:[]};
report.sourceStart=await sourceRecord('start');
const browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--mute-audio','--enable-precise-memory-info']});
report.browser=browser.version();
let activePage;
// A stalled driver never leaves its browser rendering indefinitely.
const watchdog=setTimeout(()=>{report.timeoutFailure='Render QA exceeded its 10-minute wall-clock limit.';void browser.close();},600000);

async function openGame(label){
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===base.origin||['data:','blob:'].includes(url.protocol))return route.continue();
    report.remote.push({label,url:url.href});return route.abort();
  });
  const page=await context.newPage();activePage=page;page.setDefaultTimeout(60000);
  page.on('pageerror',error=>report.errors.push({label,message:error.message}));
  page.on('console',message=>{
    if(message.type()==='error')report.errors.push({label,message:message.text()});
    if(/shader error|VALIDATE_STATUS|WebGLProgram.*Error|GL_INVALID|WebGL.*INVALID_OPERATION/i.test(message.text()))report.shaderErrors.push({label,message:message.text()});
  });
  page.on('requestfailed',request=>report.failedRequests.push({label,url:request.url(),failure:request.failure()}));
  await page.addInitScript(()=>{
    const nativeRAF=window.requestAnimationFrame.bind(window);
    let nextGameFrame=null,totalFrames=0;
    // Store the application's callback. Only the explicit pump schedules it,
    // using untouched browser RAF timestamps and the production main() loop.
    window.requestAnimationFrame=callback=>{nextGameFrame=callback;return 1;};
    window.__alphaPump=({frames=6,durationMs=0,onFrame}={})=>new Promise((resolve,reject)=>{
      const start=performance.now();let count=0,previous=null;const intervals=[];
      const timeout=setTimeout(()=>reject(new Error('Native RAF pump timed out.')),Math.max(20000,durationMs+15000));
      const step=now=>{
        try{
          if(!nextGameFrame)throw new Error('The production gameplay callback stopped scheduling frames.');
          if(previous!==null)intervals.push(now-previous);previous=now;
          const callback=nextGameFrame;nextGameFrame=null;callback(now);count++;totalFrames++;
          onFrame?.({now,elapsedMs:performance.now()-start,count});
          if((durationMs?performance.now()-start>=durationMs:count>=frames)){
            clearTimeout(timeout);resolve({frames:count,totalFrames,wallMs:performance.now()-start,intervals});
          }else nativeRAF(step);
        }catch(error){clearTimeout(timeout);reject(error);}
      };
      nativeRAF(step);
    });
  });
  await page.goto(new URL('/?test=1',base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__colossus?.scene?.renderer);
  await page.locator('#begin').click();
  await page.waitForFunction(()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0,null,{timeout:60000});
  await page.evaluate(async()=>{
    window.__alphaThree=await import('/vendor/three.module.js');
    window.__alphaSim=await import('/src/simulation.js');
    window.__alphaSnapshot=({geometry=false,radiance=false}={})=>{
      const {scene:g,state:s}=window.__colossus,T=window.__alphaThree,r=g.renderer,gl=r.getContext();
      let invalidMatrices=0,matrixValues=0,geometryValues=0,invalidGeometry=0,geometries=0;
      const seen=new Set();
      const inspectArray=(array,kind)=>{if(!array)return;for(const value of array){if(kind==='geometry'){geometryValues++;if(!Number.isFinite(value))invalidGeometry++;}else{matrixValues++;if(!Number.isFinite(value))invalidMatrices++;}}};
      g.scene.updateMatrixWorld(true);
      g.scene.traverse(object=>{
        inspectArray(object.matrixWorld.elements,'matrix');
        inspectArray(object.instanceMatrix?.array,'matrix');inspectArray(object.skeleton?.boneMatrices,'matrix');
        if(!object.geometry||seen.has(object.geometry))return;
        seen.add(object.geometry);geometries++;
        if(!geometry)return;
        for(const attribute of Object.values(object.geometry.attributes))inspectArray(attribute.array||attribute.data?.array,'geometry');
        for(const attributes of Object.values(object.geometry.morphAttributes))for(const attribute of attributes)inspectArray(attribute.array||attribute.data?.array,'geometry');
      });
      const pixels=[];
      if(radiance&&g.presentation.enabled){
        for(const [name,target]of [['hdr',g.presentation.target],...g.presentation.bloom.targets.map((target,index)=>['bloom'+index,target])]){
          const w=Math.min(8,target.width),h=Math.min(8,target.height),half=target.texture.type===T.HalfFloatType;
          let invalid=0,channels=0;
          for(const [u,v]of [[.15,.2],[.5,.5],[.85,.8]]){
            const x=Math.min(target.width-w,Math.floor(target.width*u)),y=Math.min(target.height-h,Math.floor(target.height*v));
            const data=half?new Uint16Array(w*h*4):new Uint8Array(w*h*4);
            r.readRenderTargetPixels(target,x,y,w,h,data);
            for(const value of data){channels++;if(half&&(value&0x7c00)===0x7c00)invalid++;}
          }
          pixels.push({name,width:target.width,height:target.height,channels,invalid});
        }
      }
      const camera=[...g.camera.position.toArray(),...g.camera.quaternion.toArray(),...g.camera.projectionMatrix.elements,...g.camera.matrixWorldInverse.elements];
      const extension=gl.getExtension('WEBGL_debug_renderer_info');
      return {variant:s.variant,faction:s.faction,view:g.view,quality:g.quality,lighting:g.light,time:s.time,position:{x:s.x,z:s.z},
        contextLost:gl.isContextLost(),glError:gl.getError(),render:{...r.info.render},memory:{...r.info.memory},programs:r.info.programs?.length??0,
        heapBytes:performance.memory?.usedJSHeapSize??null,cameraFinite:camera.every(Number.isFinite),invalidMatrices,matrixValues,invalidGeometry,geometryValues,geometries,pixels,
        surface:g.surfaceDiagnostics(),environmentReady:g.environmentReady,canvas:[gl.drawingBufferWidth,gl.drawingBufferHeight],
        renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
        hudVisible:!document.getElementById('hud').classList.contains('hidden'),paused:s.paused};
    };
  });
  return {context,page};
}
async function pump(page,frames=6){return page.evaluate(frames=>window.__alphaPump({frames}),frames);}
async function fixture(page,faction,variant){
  await page.evaluate(({faction,variant})=>{
    const api=window.__colossus,{state:s,scene:g}=api,sim=window.__alphaSim;
    for(const key of Object.keys(s))delete s[key];
    Object.assign(s,sim.createGame(faction,variant),{rings:2,time:12,day:1,x:-60,z:45,paused:false});
    for(const [slot,type]of [[0,'sawmill'],[1,'foundry'],[2,'cannon'],[3,'armor'],[4,'housing']])s.buildings[slot]={type,level:2,remaining:0};
    if(faction==='kaiju')s.towerOrder=[7,11,13,0,1,2,3,4];
    s.hp=sim.maxHull(s);s.population=36;g.setGame(s);g.setCameraMode('steady');api.advance(0);
  },{faction,variant});
  await page.locator('[data-view="city"]').click();
  await page.waitForFunction(()=>window.__colossus.scene.surfaceDiagnostics().pending===0);
  await pump(page,12);
}
async function cycle(page,id,property,value){
  for(let i=0;i<3;i++){
    if(await page.evaluate(property=>window.__colossus.scene[property],property)===value)return;
    await page.locator('#'+id).click();
  }
  assert.equal(await page.evaluate(property=>window.__colossus.scene[property],property),value);
}
function validate(snapshot,label){
  assert.equal(snapshot.contextLost,false,label+': context lost');assert.equal(snapshot.glError,0,label+': WebGL error');
  assert.equal(snapshot.cameraFinite,true,label+': nonfinite camera');assert.equal(snapshot.invalidMatrices,0,label+': nonfinite object/instance/bone matrix');
  assert.equal(snapshot.invalidGeometry,0,label+': nonfinite vertex or morph attribute');
  assert.equal(snapshot.surface.pending,0,label+': pending textures');assert.deepEqual(snapshot.surface.failures,[],label+': texture load failure');
  assert.equal(snapshot.environmentReady,true,label+': environment incomplete');assert.equal(snapshot.hudVisible,true,label+': HUD hidden');
  assert.equal(snapshot.paused,false,label+': gameplay paused');assert.ok(snapshot.render.triangles>0,label+': no rendered triangles');
  assert.ok(snapshot.canvas.every(value=>value>0),label+': empty canvas');
  for(const pixels of snapshot.pixels)assert.equal(pixels.invalid,0,label+': nonfinite sampled '+pixels.name);
}
async function shot(page,name){
  await pump(page,24);
  await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');
}
const summary=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return {count:sorted.length,min:sorted[0]??null,median:sorted[Math.floor(sorted.length*.5)]??null,p95:sorted[Math.floor(sorted.length*.95)]??null,max:sorted.at(-1)??null};
};

try{
  if(scope!=='soak'){
  const {context,page}=await openGame('render-matrix');
  try{
    for(const[faction,variant]of variants){
      await fixture(page,faction,variant);
      const geometry=await page.evaluate(()=>window.__alphaSnapshot({geometry:true}));validate(geometry,variant+' geometry');report.geometry.push(geometry);
      const views=faction==='kaiju'?['city','world','people','carrier']:['city','world','people'];
      for(const quality of ['high','balanced','performance']){
        await cycle(page,'quality','quality',quality);
        for(const lighting of ['day','dusk','night']){
          await cycle(page,'lighting','light',lighting);
          for(const view of views){
            await page.locator(`[data-view="${view}"]`).click();
            const timing=await pump(page);
            const snapshot=await page.evaluate(radiance=>window.__alphaSnapshot({radiance}),view==='city');
            const name=[variant,quality,lighting,view].join('-');validate(snapshot,name);
            assert.deepEqual([snapshot.variant,snapshot.quality,snapshot.lighting,snapshot.view],[variant,quality,lighting,view]);
            report.matrix.push({name,...snapshot,frames:timing.frames,wallMs:timing.wallMs});
            const representative=quality==='high'&&(lighting==='day'&&(view==='city'||view==='carrier')||lighting==='night'&&view==='people')
              ||quality==='balanced'&&lighting==='dusk'&&view==='world'&&['cyborg','standard','horizontal'].includes(variant);
            if(representative)await shot(page,name);
          }
        }
      }
      console.log('Render matrix completed: '+variant);
    }
    assert.equal(report.matrix.length,180);report.checks.push('All 180 carrier/view/quality/light combinations rendered through the production gameplay callback.');
  }finally{await context.close();activePage=null;}
  }

  if(scope!=='matrix'){
  const soak=await openGame('real-time-soak');
  try{
    await fixture(soak.page,'crawler','standard');await cycle(soak.page,'quality','quality','high');await cycle(soak.page,'lighting','light','day');
    await soak.page.locator('[data-view="city"]').click();await soak.page.locator('#world').focus();
    report.soak=await soak.page.evaluate(async()=>{
      const api=window.__colossus,canvas=document.getElementById('world'),keys=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'];
      let held=null;
      const hold=key=>{if(key===held)return;if(held)canvas.dispatchEvent(new KeyboardEvent('keyup',{key:held,bubbles:true}));held=key;if(held)canvas.dispatchEvent(new KeyboardEvent('keydown',{key:held,bubbles:true}));};
      const capture=elapsedMs=>({elapsedMs,time:api.state.time,x:api.state.x,z:api.state.z,...window.__alphaSnapshot()});
      try{
        hold('ArrowRight');const settle=await window.__alphaPump({durationMs:5000});hold('ArrowUp');
        // Traverse the same full route once before measuring. Frustum-culled
        // scenery uploads geometry lazily, so an idle warmup cannot establish
        // a meaningful GPU-resource baseline for movement into unseen cells.
        const warmup=await window.__alphaPump({durationMs:30000,onFrame:({elapsedMs})=>hold(keys[Math.min(3,Math.floor(elapsedMs/7500))])});hold('ArrowUp');
        const baseline=capture(0),samples=[baseline],startTime=api.state.time;let nextSample=5000,travelled=0,last={x:api.state.x,z:api.state.z};
        const timing=await window.__alphaPump({durationMs:30000,onFrame:({elapsedMs})=>{
          hold(keys[Math.min(3,Math.floor(elapsedMs/7500))]);
          travelled+=Math.hypot(api.state.x-last.x,api.state.z-last.z);last={x:api.state.x,z:api.state.z};
          if(elapsedMs>=nextSample){samples.push(capture(elapsedMs));nextSample+=5000;}
        }});
        const final=window.__alphaSnapshot({geometry:true,radiance:true});
        if(samples.at(-1).elapsedMs<timing.wallMs)samples.push({...final,elapsedMs:timing.wallMs});
        return {method:'Native browser RAF timestamps driving the untouched production frame callback; actual keyboard handlers switch direction every 7.5 wall-clock seconds. The same full route is warmed before measurement. No screenshots or artificial simulation advance during the measured window.',settle:{frames:settle.frames,wallMs:settle.wallMs},warmup:{frames:warmup.frames,wallMs:warmup.wallMs},wallMs:timing.wallMs,frames:timing.frames,intervals:timing.intervals,simulationSeconds:api.state.time-startTime,travelled,samples,final};
      }finally{hold(null);}
    });
    report.soak.frameMilliseconds=summary(report.soak.intervals);delete report.soak.intervals;
    assert.ok(report.soak.wallMs>=30000,'Soak must cover 30 actual wall-clock seconds.');
    assert.ok(report.soak.frames>1&&report.soak.simulationSeconds>0&&report.soak.travelled>1,'The soak must render and move through gameplay.');
    for(const sample of report.soak.samples)validate(sample,'soak at '+sample.elapsedMs);validate(report.soak.final,'soak final buffers');
    const first=report.soak.samples[0],last=report.soak.samples.at(-1);
    report.soak.resourceGrowth={sceneGeometries:last.geometries-first.geometries,uploadedGeometries:last.memory.geometries-first.memory.geometries,textures:last.memory.textures-first.memory.textures,programs:last.programs-first.programs,heapBytes:first.heapBytes!==null&&last.heapBytes!==null?last.heapBytes-first.heapBytes:null};
    // A few first-visible materials may warm after movement starts; persistent
    // GPU object counts must still stay within a small, fixed allocation budget.
    for(const sample of report.soak.samples){
      assert.ok(sample.geometries<=first.geometries+8,'Unexpected post-warmup scene geometry allocation.');
      assert.ok(sample.memory.geometries<=first.memory.geometries+8,'Unbounded post-warmup geometry growth.');
      assert.ok(sample.memory.textures<=first.memory.textures+8,'Unbounded post-warmup texture growth.');
      assert.ok(sample.programs<=first.programs+8,'Unbounded post-warmup shader-program growth.');
    }
    report.checks.push('High-quality crawler completed 30 real-time seconds of keyboard motion after warming the same full route, with bounded sampled scene/GPU resource counts.');
    await shot(soak.page,'crawler-high-day-soak-end-hud');
  }finally{await soak.context.close();activePage=null;}
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.shaderErrors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.failedRequests,[]);
}catch(error){
  report.failure=error.stack;process.exitCode=1;
  if(activePage&&!activePage.isClosed())await activePage.screenshot({path:path.join(out,'failure-hud.png'),timeout:10000}).catch(()=>{});
}finally{
  clearTimeout(watchdog);report.finishedAt=new Date().toISOString();await browser.close();report.sourceFinish=await sourceRecord('finish');
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({output:out,cases:report.matrix.length,screenshots:report.screenshots.length,checks:report.checks,soak:report.soak?{wallMs:report.soak.wallMs,simulationSeconds:report.soak.simulationSeconds,frames:report.soak.frames,frameMilliseconds:report.soak.frameMilliseconds,resourceGrowth:report.soak.resourceGrowth}:null,errors:report.errors,shaderErrors:report.shaderErrors,remote:report.remote,failedRequests:report.failedRequests,failure:report.failure||report.timeoutFailure||null},null,2));
