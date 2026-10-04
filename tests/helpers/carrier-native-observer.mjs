// Carrier-only fork of the recorded Meshy native observer. Keeps its native RAF/input semantics. This
// function is serialized into a fresh test context; it never advances game time.
export function installCarrierObserver({quality, fixture, gpuTiming}) {
  localStorage.setItem('colossus-quality-v1',quality);
  localStorage.setItem('colossus-camera-mode','steady');
  // A fresh isolated context receives the fixture once. Reload must retain the
  // save written by actual controls instead of silently reinstalling the fixture.
  if(localStorage.getItem('colossus-wake-save-v1')===null)localStorage.setItem('colossus-wake-save-v1',fixture);
  const nativeRAF=requestAnimationFrame.bind(window),api={lastFrame:null,startups:[]};
  window.__meshyProbe=api;
  let route=null,goal=null,gl=null,ext=null,renderer=null,query=null;
  const state=()=>{const s=window.__colossus.state;return{x:s.x,z:s.z,time:s.time,angle:s.angle,paused:s.paused,moving:s.moving,population:s.population,mode:s.mode,speed:s.speed,resources:{...s.resources},worldDamage:structuredClone(s.worldDamage)};};
  api.snapshot=()=>{const g=window.__colossus.scene,r=g.renderer;return{state:state(),environment:{viewport:[innerWidth,innerHeight],deviceDpr:devicePixelRatio,rendererDpr:r.getPixelRatio(),drawingBuffer:[r.domElement.width,r.domElement.height],quality:g.quality,light:g.light,visible:document.visibilityState,focused:document.hasFocus(),camera:{view:g.view,mode:g.cinematic.mode,yaw:g.yaw,pitch:g.pitch,zoom:g.zoom,fov:g.camera.fov,position:g.camera.position.toArray(),aim:g.cameraAim.toArray()}},render:{...r.info.render},memory:{...r.info.memory},programCount:r.info.programs.length,preparation:{...g.movementPreparation?.status},surfaces:g.surfaceDiagnostics(),hud:{visible:!document.getElementById('hud').classList.contains('hidden'),horizontalOverflow:document.documentElement.scrollWidth>innerWidth,dialogOpen:document.getElementById('dialog').open,pauseOverlay:document.getElementById('pause-overlay')?.checkVisibility()??false}};};
  const summary=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return{samples:a.length,median:a[Math.floor(a.length*.5)]??null,p95:a[Math.floor(a.length*.95)]??null,p99:a[Math.floor(a.length*.99)]??null,mean:a.length?a.reduce((sum,n)=>sum+n,0)/a.length:null,max:a.at(-1)??null,above50:a.filter(x=>x>50).length,above100:a.filter(x=>x>100).length};};
  function collect(){
    if(!ext||!route)return;
    if(gl.getParameter(ext.GPU_DISJOINT_EXT)){route.disjoint++;route.discardedDisjoint+=route.pending.length;for(const q of route.pending)gl.deleteQuery(q);route.pending=[];return;}
    while(route.pending.length&&gl.getQueryParameter(route.pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=route.pending.shift();route.gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
  }
  api.arm=label=>{
    if(route)throw Error('A measured route is already active.');
    renderer=window.__colossus.scene.renderer;gl=renderer.getContext();ext=gpuTiming?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;
    route={label,start:null,end:null,frames:[],gpu:[],pending:[],inputs:[],disjoint:0,discardedDisjoint:0,issued:0,skippedPending:0,skippedBusy:0,focusLost:false};
  };
  api.watch=(direction,distance)=>{
    if(goal)throw Error('A native travel segment is already active.');
    const s=state(),yaw=window.__colossus.scene.yaw;
    const vectors={right:[Math.cos(yaw),-Math.sin(yaw)],left:[-Math.cos(yaw),Math.sin(yaw)],up:[-Math.sin(yaw),-Math.cos(yaw)],down:[Math.sin(yaw),Math.cos(yaw)]};
    let resolve;api.goalSettled=false;api.goalResult=new Promise(r=>resolve=r);goal={start:s,vector:vectors[direction],distance,resolve,startedAt:performance.now()};
  };
  api.cancelGoal=()=>{if(goal){goal.resolve({cancelled:true});api.goalSettled=true;goal=null;}};
  const observe=event=>{
    const movement=event.type.startsWith('key')?['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(event.key.toLowerCase()):!!event.target.closest?.('[data-move]');
    if(!route)return;
    if(!route.start&&movement&&['keydown','pointerdown'].includes(event.type)){route.inputAt=performance.now();route.start=api.snapshot();route.inputObservationMs=performance.now()-route.inputAt;route.prior=api.lastFrame;}
    if(route.start&&!route.end)route.inputs.push({at:performance.now(),type:event.type,key:event.key??null,target:event.target.id||event.target.dataset?.move||event.target.tagName,state:state(),yaw:window.__colossus.scene.yaw});
  };
  for(const type of ['keydown','keyup','pointerdown','pointerup','click','wheel'])window.addEventListener(type,observe,true);
  window.addEventListener('click',event=>{if(event.target.closest?.('#continue,#begin'))api.startups.push({action:event.target.id,at:performance.now()});},true);
  window.addEventListener('click',event=>{if(!event.target.closest?.('#continue,#begin'))return;const startup=api.startups.at(-1);if(startup){startup.handlerEndAt=performance.now();startup.handlerWallMs=startup.handlerEndAt-startup.at;}});
  window.addEventListener('blur',()=>{if(route?.start&&!route.end)route.focusLost=true;});
  document.addEventListener('visibilitychange',()=>{if(route?.start&&!route.end&&document.hidden)route.focusLost=true;});
  api.finish=()=>new Promise(resolve=>{
    if(!route?.start)throw Error('No native route input was observed.');
    route.end=api.snapshot();route.endAt=performance.now();let turns=0;
    const complete=()=>{
      collect();if(route.pending.length&&++turns<120){nativeRAF(complete);return;}
      const r=route;for(const q of r.pending)gl.deleteQuery(q);
      const debug=gl.getExtension('WEBGL_debug_renderer_info'),actualBuffer=[gl.drawingBufferWidth,gl.drawingBufferHeight];
      const values=key=>r.frames.map(f=>f[key]);
      const result={label:r.label,start:r.start,end:r.end,inputAt:r.inputAt,endAt:r.endAt,inputObservationMs:r.inputObservationMs,wallDurationMs:r.endAt-r.inputAt,firstRenderedMovementMs:r.firstResponse??null,responseMeaning:'Native input capture to completion of the first production frame with changed position; not physical display latency.',frameIntervalMs:summary(values('interval')),mainCallbackMs:summary(values('callback')),movingCallbackMs:summary(r.frames.filter(f=>f.moving).map(f=>f.callback)),gpuMs:summary(r.gpu),gpuSamplesMs:r.gpu.slice(),renderCalls:summary(values('calls')),renderTriangles:summary(values('triangles')),frames:r.frames,inputs:r.inputs,gpuExtension:!!ext,gpuTimingRequested:gpuTiming,queryAccounting:{issued:r.issued,completed:r.gpu.length,missingFrameSamples:r.frames.length-r.gpu.length,discardedDisjoint:r.discardedDisjoint,discardedAfterDrain:r.pending.length,skippedPending:r.skippedPending,skippedBusy:r.skippedBusy},disjoint:r.disjoint,focusLost:r.focusLost,contextLost:gl.isContextLost(),driverMetadataAfterRoute:{gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webgl:gl.getParameter(gl.VERSION),actualBuffer,bufferMatchesEnd:actualBuffer.every((v,i)=>v===r.end.environment.drawingBuffer[i])}};
      route=null;resolve(result);
    };complete();
  });
  window.requestAnimationFrame=callback=>nativeRAF(timestamp=>{
    if(callback.name!=='frame'){callback(timestamp);return;}
    const active=route?.start&&!route.end;let interval=null;
    if(active){collect();interval=route.prior===null?null:timestamp-route.prior;route.prior=timestamp;
      if(ext){if(route.pending.length>=8)route.skippedPending++;else if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))route.skippedBusy++;else{query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);route.issued++;}}}
    const begin=performance.now();
    try{callback(timestamp);}finally{
      const end=performance.now();api.lastFrame=timestamp;
      const startup=api.startups.at(-1);if(startup&&!startup.firstGameplayFrameAt&&window.__colossus&&!window.__colossus.scene.preview&&!document.getElementById('hud').classList.contains('hidden')){startup.firstGameplayFrameAt=end;startup.clickToFirstGameplayFrameMs=end-startup.at;}
      if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);route.pending.push(query);query=null;}
      if(active){const s=state();route.frames.push({timestamp,interval,callback:end-begin,moving:s.moving,x:s.x,z:s.z,yaw:window.__colossus.scene.yaw,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,programs:renderer.info.programs.length});if(Math.hypot(s.x-route.start.state.x,s.z-route.start.state.z)>1e-6&&route.firstResponse===undefined)route.firstResponse=end-route.inputAt;}
      if(goal){const s=state(),projected=(s.x-goal.start.x)*goal.vector[0]+(s.z-goal.start.z)*goal.vector[1];if(projected>=goal.distance||performance.now()-goal.startedAt>30000){goal.resolve({state:s,projected,timeout:projected<goal.distance});api.goalSettled=true;goal=null;}}
    }
  });
}
