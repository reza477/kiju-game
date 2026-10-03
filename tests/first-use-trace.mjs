// Detailed diagnostic only: deliberately separate from low-overhead timing.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:4201';
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/first-use/trace-baseline');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});
const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
await context.addInitScript(()=>{
  localStorage.setItem('colossus-quality-v1','high');
  const log=window.__trace={phase:'loading',events:[],frames:[],longTasks:[],frame:0,current:null};
  new PerformanceObserver(list=>{for(const e of list.getEntries())log.longTasks.push({start:e.startTime,duration:e.duration,name:e.name});}).observe({type:'longtask',buffered:true});
  const ids=new WeakMap();let nextId=0;
  const id=o=>o&&typeof o==='object'?(ids.has(o)?ids.get(o):(ids.set(o,++nextId),nextId)):o;
  for(const name of ['compileShader','linkProgram','getProgramParameter','getShaderParameter','getUniformLocation','getProgramInfoLog','getShaderInfoLog','getActiveUniform','getAttribLocation','texImage2D','texSubImage2D','texStorage2D','bufferData','bufferSubData','drawElements','drawElementsInstanced']){
    const proto=WebGL2RenderingContext.prototype,original=proto[name];
    proto[name]=function(...args){const start=performance.now();const result=original.apply(this,args);const ms=performance.now()-start;
      if(ms>.25||['compileShader','linkProgram','texImage2D','texStorage2D'].includes(name))log.events.push({kind:name,phase:log.phase,frame:log.frame,start,ms,object:log.current,glIdentity:id(args[0]),arg1:typeof args[1]==='number'?args[1]:null});return result;};
  }
  const raf=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=cb=>raf(t=>{if(cb.name!=='frame'){cb(t);return;}const start=performance.now();cb(t);log.frames.push({phase:log.phase,frame:log.frame++,start,ms:performance.now()-start,t,x:window.__colossus?.state.x,z:window.__colossus?.state.z});});
});
const start=new Date().toISOString();
try{
  await page.goto(base+'/?test=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__colossus?.scene);
  await page.bringToFront();
  await page.evaluate(()=>{
    const g=window.__colossus.scene,r=g.renderer,log=window.__trace,watched=new WeakSet();
    const materials=group=>{const list=new Map();group.traverse(o=>{for(const m of [o.material,o.customDepthMaterial,o.customDistanceMaterial].flat().filter(Boolean))list.set(m.uuid,m);});return list;};
    const watch=()=>{for(const m of materials(g.scene).values())if(!watched.has(m)){watched.add(m);m.addEventListener('dispose',()=>log.events.push({kind:'materialDispose',phase:log.phase,frame:log.frame,uuid:m.uuid,name:m.name,shared:m.userData.shared,inWorld:materials(g.world).has(m.uuid),programs:[...(r.properties.get(m).programs?.values()||[])].map(p=>p.id)}));const prior=m.onBeforeCompile,key=m.customProgramCacheKey();m.customProgramCacheKey=()=>key;m.onBeforeCompile=function(...args){log.events.push({kind:'onBeforeCompile',phase:log.phase,frame:log.frame,uuid:m.uuid,name:m.name,key:m.customProgramCacheKey(),object:log.current});return prior.apply(this,args);};}};
    window.__traceSnapshot=()=>({frame:log.frame,time:performance.now(),state:{x:window.__colossus.state.x,z:window.__colossus.state.z,time:window.__colossus.state.time},memory:r.info.memory,programs:r.info.programs.map(p=>({id:p.id,key:p.cacheKey,usedTimes:p.usedTimes})),materials:[...materials(g.scene).values()].map(m=>({uuid:m.uuid,name:m.name,shared:m.userData.shared,world:materials(g.world).has(m.uuid),map:m.map?.uuid,source:m.map?.source.uuid,programs:[...(r.properties.get(m).programs?.values()||[])].map(p=>p.id)}))});
    const originalSet=g.setGame;g.setGame=function(...args){watch();const before=window.__traceSnapshot(),start=performance.now();const result=originalSet.apply(this,args),ms=performance.now()-start;watch();log.events.push({kind:'setGame',phase:log.phase,ms,before,after:window.__traceSnapshot()});return result;};
    const direct=r.renderBufferDirect;r.renderBufferDirect=function(camera,scene,geometry,material,object,group){const previous=log.current;log.current={mesh:object.uuid,name:object.name,material:material.uuid,materialName:material.name,geometry:geometry.uuid,map:material.map?.uuid,alphaMap:material.alphaMap?.uuid,count:object.count};const start=performance.now();try{return direct.apply(this,arguments);}finally{const ms=performance.now()-start;if(ms>.5)log.events.push({kind:'renderBufferDirect',phase:log.phase,frame:log.frame,start,ms,object:log.current});log.current=previous;}};
    watch();
  });
  await page.evaluate(()=>window.__trace.phase='choose-crawler');
  await page.locator('[data-faction="crawler"]').click();
  const profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.start');
  await page.evaluate(()=>window.__trace.phase='begin');
  await page.locator('#begin').click();
  async function route(name){
    await page.evaluate(name=>{window.__trace.phase=name;window.__routeStart={x:window.__colossus.state.x,z:window.__colossus.state.z};},name);
    await page.keyboard.down('a');
    await page.waitForFunction(()=>Math.hypot(window.__colossus.state.x-window.__routeStart.x,window.__colossus.state.z-window.__routeStart.z)>=30,{},{timeout:45000,polling:'raf'});
    await page.keyboard.up('a');
    await page.evaluate(()=>window.__trace.phase='idle');
  }
  await route('ordinary-first-movement');
  await page.screenshot({path:path.join(out,'ordinary-foreground.png')});
  await route('warmed-next-movement');
  await page.locator('#menu').click();
  await page.evaluate(()=>window.__trace.phase='return-title');
  await page.locator('[data-dialog-action="title"]').click();
  await page.evaluate(()=>window.__trace.phase='continue');
  await page.locator('#continue').click();
  await route('continue-first-movement');
  const cpu=await profiler.send('Profiler.stop');await fs.writeFile(path.join(out,'cpu-profile.json'),JSON.stringify(cpu));
  const result=await page.evaluate(()=>({trace:window.__trace,final:window.__traceSnapshot(),visibility:document.visibilityState,userAgent:navigator.userAgent}));
  const report={startedAt:start,endedAt:new Date().toISOString(),url:base,headless:false,diagnosticOverhead:true,scriptCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),errors,...result};
  await fs.writeFile(path.join(out,'trace.json'),JSON.stringify(report,null,2));
  const phaseSummary={};for(const frame of result.trace.frames){const phase=phaseSummary[frame.phase]??={frames:0,maxCallback:0,longFrames:[]};phase.frames++;phase.maxCallback=Math.max(phase.maxCallback,frame.ms);if(frame.ms>50)phase.longFrames.push(frame);}
  const disposals=result.trace.events.filter(e=>e.kind==='materialDispose'&&e.inWorld);
  await fs.writeFile(path.join(out,'summary.json'),JSON.stringify({phaseSummary,sharedWorldDisposals:disposals,expensive:result.trace.events.filter(e=>e.ms>10)},null,2));
  console.log(JSON.stringify({out,phaseSummary,sharedWorldDisposals:disposals.length,errors}));
}finally{await browser.close();}
