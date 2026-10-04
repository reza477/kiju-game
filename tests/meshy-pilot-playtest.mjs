// Local pilot evidence only. Routes use ordinary UI Continue and held native
// keys/touch arrows. The initial isolated save is the only position fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {installMeshyObserver} from './helpers/meshy-native-observer.mjs';
import {pilotConfig,profiles,nextNativeSegment,validatePilotConfig} from './helpers/meshy-pilot-config.mjs';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';
import {runMeshyFunctional} from './helpers/meshy-functional.mjs';

const toolRoot=fileURLToPath(new URL('..',import.meta.url)),out=path.resolve(process.env.OUTPUT_DIR||'artifacts/meshy-pilot/playtest');
const mode=process.env.MODE||'timing',sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.ok(['timing','capture','functional','paired-timing','paired-capture'].includes(mode),'Unknown MODE.');
const configBytes=process.env.PILOT_CONFIG?await fs.readFile(process.env.PILOT_CONFIG):Buffer.from(JSON.stringify(pilotConfig));
const config=validatePilotConfig(JSON.parse(configBytes)),selected=profiles.filter(p=>!process.env.PROFILE||process.env.PROFILE===p.name);
assert.ok(selected.length,'Unknown PROFILE.');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
async function fingerprint(root){
  const names=new Set([...git(root,'ls-files','src','index.html','assets','vendor','package.json','package-lock.json').split('\n'),...git(root,'ls-files','--others','--exclude-standard','src','assets','vendor').split('\n')]);
  const hashes={};for(const name of [...names].filter(Boolean).sort())hashes[name]=sha(await fs.readFile(path.join(root,name)));
  return{root,commit:git(root,'rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
await fs.mkdir(out,{recursive:true});
await assert.rejects(fs.access(path.join(out,'report.json')),'Refuse to overwrite an existing run, including failure.');
const report={startedAt:new Date().toISOString(),protocol:'meshy-southern-bend-native-v1',mode,config,configSha256:sha(configBytes),command:{executable:process.execPath,args:process.argv.slice(1),environment:Object.fromEntries(['MODE','PROFILE','OUTPUT_DIR','SOURCE_ROOT','BASELINE_ROOT','CANDIDATE_ROOT','GAME_TEST_URL','BASELINE_URL','CANDIDATE_URL','RUN_LABEL','HEADLESS','GPU_TIMING','PILOT_CONFIG','PILOT_REQUIRE_ASSETS'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))},
  method:'Initial test-only baseline save places the existing crawler at the southern bend, without changing resources, time or rules. Every route then uses native controls and normal simulation time. First traversal and same-session repeat are separate; later routes may encounter already warm resources. These are varied-route checks, not a replacement for ordinary fresh-start first-use timing. Screenshots run only in capture mode.',
  limitations:['Windows Chrome desktop/touch emulation, not physical iPhone, iPad or Safari.','Matched control plans and original save bytes do not force identical native timestamps, reached positions, population or damage. Every delta is retained.','No scripted result substitutes for the separate 5–10 minute human/CUA playtest, art review, update/save/offline gates or release approval.','RAF interval, main-callback wall time and optional GPU query are separate metrics; callback time is not pure CPU work and GPU missing samples remain reported. Driver/OS cache and machine activity are uncontrolled.'],visits:[],pairs:[],errors:[],passed:false};
const write=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
await write();

if(mode.startsWith('paired-')){
  try{
    for(const key of ['BASELINE_ROOT','CANDIDATE_ROOT','BASELINE_URL','CANDIDATE_URL'])assert.ok(process.env[key],key+' required.');
    const childMode=mode.replace('paired-',''),sequence=childMode==='capture'?[null]:selected.map(p=>p.name);
    for(const profile of sequence){
      const visits=[];
      for(const build of ['A','B']){
        const visitOut=path.join(out,profile||'captures',build),before=build==='A';
        await fs.mkdir(visitOut,{recursive:true});
        const env={...process.env,MODE:childMode,PROFILE:profile||'',OUTPUT_DIR:visitOut,RUN_LABEL:build,SOURCE_ROOT:process.env[before?'BASELINE_ROOT':'CANDIDATE_ROOT'],GAME_TEST_URL:process.env[before?'BASELINE_URL':'CANDIDATE_URL'],PILOT_REQUIRE_ASSETS:before?'0':(process.env.PILOT_REQUIRE_ASSETS||'1')};
        const row={build,profile,startedAt:new Date().toISOString(),report:path.join(visitOut,'report.json')};report.visits.push(row);await write();
        row.exitCode=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(import.meta.url)],{cwd:toolRoot,env,stdio:['ignore','pipe','pipe']}),chunks=[];for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{chunks.push(chunk);process.stdout.write(chunk);});child.once('error',reject);child.once('close',async code=>{await fs.writeFile(path.join(visitOut,'process.log'),Buffer.concat(chunks));resolve(code);});});
        row.finishedAt=new Date().toISOString();await write();assert.equal(row.exitCode,0,build+' failed; original evidence retained without automatic retry.');
        visits.push(JSON.parse(await fs.readFile(row.report,'utf8')));
      }
      const [a,b]=visits;assert.equal(a.configSha256,b.configSha256);assert.equal(a.fixtureGeneratorCommit,b.fixtureGeneratorCommit);
      assert.equal(a.visits.length,b.visits.length);
      const comparison={profile,sourceA:a.sourceStart.fingerprint,sourceB:b.sourceStart.fingerprint,conditions:[]};
      for(let i=0;i<a.visits.length;i++){
        const x=a.visits[i],y=b.visits[i];assert.equal(x.name,y.name);assert.equal(x.fixture.sha256,y.fixture.sha256);assert.deepEqual(x.profile,y.profile);
        assert.deepEqual(x.browser,y.browser);assert.equal(x.routes?.length,y.routes?.length);
        const snapshots=childMode==='capture'?[[x.capture,y.capture]]:x.routes.map((route,j)=>[route.start,y.routes[j].start]);
        for(const [left,right] of snapshots){
          for(const key of ['viewport','deviceDpr','rendererDpr','drawingBuffer','quality','light'])assert.deepEqual(left.environment[key],right.environment[key],x.name+' paired '+key);
          for(const key of ['view','mode'])assert.equal(left.environment.camera[key],right.environment.camera[key]);
          for(const key of ['yaw','pitch','zoom'])assert.ok(Math.abs(left.environment.camera[key]-right.environment.camera[key])<.012,key+' differs');
          comparison.conditions.push({name:x.name,matchedSettings:true,startDelta:Object.fromEntries(['x','z','time','population','angle'].map(key=>[key,right.state[key]-left.state[key]])),note:'Position/time/population are observed, not asserted identical.'});
        }
      }
      report.pairs.push(comparison);await write();
    }
    report.passed=true;
  }catch(error){report.failure=error.stack;process.exitCode=1;}
}else{
  const root=await fs.realpath(path.resolve(process.env.SOURCE_ROOT||toolRoot)),fixtureRoot=await fs.realpath(path.resolve(process.env.BASELINE_ROOT||root));
  const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4214/');
  assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'Only a local game origin is permitted.');
  report.sourceStart=await fingerprint(root);report.fixtureGeneratorCommit=git(fixtureRoot,'rev-parse','HEAD');
  const sim=await import(pathToFileURL(path.join(fixtureRoot,'src/simulation.js')).href);
  const makeFixture=position=>{const state=sim.createGame('crawler','standard');state.x=position.x;state.z=position.z;const raw=sim.serialize(state);assert.ok(sim.deserialize(raw));return raw;};
  let browser,context,page,cdp;
  const until=(predicate,arg,timeoutMs=120000)=>waitForBrowserCondition(page,predicate,arg,{timeoutMs,pollingMs:75});
  const snapshot=()=>page.evaluate(()=>window.__meshyProbe.snapshot());
  async function tap(selector){const locator=page.locator(selector);if(context._pilotMobile)await locator.tap();else await locator.click();}
  async function moveSegment(segment,visit){
    const before=await snapshot(),key={up:'w',down:'s',left:'a',right:'d'}[segment.direction];
    let touch;
    if(visit.profile.mobile){const box=await page.locator(`[data-move="${segment.direction}"]`).boundingBox();assert.ok(box,'Visible native touch arrow required.');touch={x:box.x+box.width/2,y:box.y+box.height/2,id:1};}
    await page.evaluate(s=>window.__meshyProbe.watch(s.direction,s.distance),segment);
    let result;
    try{
      if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});else await page.keyboard.down(key);
      await until(()=>window.__meshyProbe.goalSettled,undefined,35000);result=await page.evaluate(()=>window.__meshyProbe.goalResult);
    }finally{
      if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up(key);
      await page.evaluate(()=>window.__meshyProbe.cancelGoal());
    }
    const after=await snapshot();assert.equal(result.timeout,false,'Native movement failed to reach segment.');assert.equal(after.state.speed,1);assert.equal(after.state.paused,false);
    return{...segment,input:touch?'native-touch-arrow':'native-keyboard',key:touch?null:key,started:before.state,reached:after.state,yaw:before.environment.camera.yaw,observer:result};
  }
  async function navigate(waypoint,visit){
    const record={requested:{x:waypoint[0],z:waypoint[1]},segments:[]};
    for(let n=0;n<24;n++){
      const current=await snapshot(),segment=nextNativeSegment(current.state,waypoint,current.environment.camera.yaw,config.tolerance);
      if(!segment){record.reached=current.state;record.errorMetres=Math.hypot(current.state.x-waypoint[0],current.state.z-waypoint[1]);return record;}
      record.segments.push(await moveSegment(segment,visit));
    }
    throw Error('Native waypoint did not converge: '+JSON.stringify(record));
  }
  async function pilotObservation(){return page.evaluate(async()=>{
    const g=window.__colossus.scene,stats=g.landscape.stats.meshyPilot||null;
    const status=stats?(await import('/src/meshy-pilot.js')).meshyPilotStatus():null;
    return{status,stats,render:{...g.renderer.info.render},surface:g.surfaceDiagnostics(),environmentError:g.environmentError};
  });}
  async function captureReady(){
    await until(()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);
    if(process.env.PILOT_REQUIRE_ASSETS==='1')await until(async()=>{const status=(await import('/src/meshy-pilot.js')).meshyPilotStatus();if(status.error)throw Error(status.error);return status.state==='ready';});
    const observed=await pilotObservation();assert.equal(observed.environmentError,null);assert.deepEqual(observed.surface.failures,[]);
    if(process.env.PILOT_REQUIRE_ASSETS==='1'){assert.equal(observed.status.state,'ready');assert.ok(observed.status.assets.length);assert.ok(observed.stats,'Pilot records are attached to the actual game landscape.');}
    return observed;
  }
  async function resourceDestination(id,visit){
    const node=await page.evaluate(id=>window.__colossus.state.nodes.find(n=>n.id===id),id);assert.ok(node);
    if(!await page.locator('#destinations').isVisible())await tap('#destinations-toggle');
    const button=page.locator('#destinations button').filter({hasText:node.name});
    await button.evaluate(button=>button.addEventListener('click',()=>{const s=window.__colossus.state;window.__meshyProbe.resourceClick={x:s.x,z:s.z,time:s.time};},{capture:true,once:true}));
    if(visit.profile.mobile)await button.tap();else await button.click();
    const observed=await page.evaluate(()=>({boundary:window.__meshyProbe.resourceClick,target:{...window.__colossus.state.target}}));
    assert.ok(observed.boundary,'The actual resource-button click was not observed');
    const distance=Math.hypot(observed.boundary.x-node.x,observed.boundary.z-node.z);
    const direction=distance>.01?[(observed.boundary.x-node.x)/distance,(observed.boundary.z-node.z)/distance]:[0,1];
    const expected={x:node.x+direction[0]*22,z:node.z+direction[1]*22};
    assert.deepEqual(observed.target,expected,'Resource travel must preserve the existing 22 m stand-off');
    await until(()=>window.__colossus.state.target===null,undefined,90000);
    const arrival=await snapshot();assert.ok(Math.hypot(arrival.state.x-node.x,arrival.state.z-node.z)<23,'Native resource arrival missed its existing gathering radius');
    assert.equal(await page.evaluate(()=>window.__colossus.state.gathering),node.id);
    if(await page.locator('#destinations').isVisible())await tap('#destinations-toggle');
    return{requested:node,eventBoundary:observed.boundary,selectedTarget:observed.target,expectedTarget:expected,arrival,input:'Real Resource destinations button'};
  }
  async function nativeCamera(target,visit,{allowPinch=false}={}){
    // Choose a real unoccluded canvas rectangle; HUD stays fully visible.
    const point=await page.evaluate(()=>{const c=window.__colossus.scene.renderer.domElement;for(const y of [.48,.38,.58,.28])for(const x of [.5,.4,.6,.3,.7]){const px=innerWidth*x,py=innerHeight*y;if(document.elementFromPoint(px,py)===c)return{x:px,y:py};}throw Error('No visible canvas drag start.');});
    const strokes=[];
    for(let tries=0;tries<20;tries++){
      const current=(await snapshot()).environment.camera,dx=Math.max(-70,Math.min(70,(current.yaw-target.yaw)/.006)),dy=Math.max(-45,Math.min(45,(target.pitch-current.pitch)/.004));
      if(Math.abs(dx)<.3&&Math.abs(dy)<.3)break;
      // Cross the production six-pixel drag threshold first, then correct in
      // the same held gesture. Tiny corrective gestures otherwise become picks
      // and can neither converge nor safely frame a playing screenshot.
      if(visit.profile.mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+8,y:point.y,id:1}]});for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+8+(dx-8)*n/8,y:point.y+dy*n/8,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
      else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+8,point.y);await page.mouse.move(point.x+dx,point.y+dy,{steps:8});await page.mouse.up();}
      strokes.push({dx,dy,point,after:(await snapshot()).environment.camera});
    }
    const before=(await snapshot()).environment.camera;
    if(Math.abs(before.zoom-target.zoom)>.02){
      if(visit.profile.mobile){
        if(!allowPinch)throw Error('Pilot phone capture defaults must retain the normal City zoom; use the separate native functional pinch check.');
        for(let tries=0;tries<10;tries++){
          const current=(await snapshot()).environment.camera.zoom;if(Math.abs(current-target.zoom)<.01)break;
          const contact=await page.evaluate(()=>{const canvas=window.__colossus.scene.renderer.domElement,half=Math.min(55,innerWidth*.12);for(const y of [.48,.38,.58,.28])for(const x of [.5,.4,.6]){const px=innerWidth*x,py=innerHeight*y;if([-.15,-1.5,1.5,.15].every(scale=>document.elementFromPoint(px+half*scale,py)===canvas))return{x:px,y:py,half};}throw Error('No unoccluded two-contact canvas span');});
          const ratio=Math.max(.65,Math.min(1.5,current/target.zoom)),contacts=scale=>[-1,1].map((side,index)=>({x:contact.x+contact.half*scale*side,y:contact.y,id:index+1}));
          try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:contacts(1)});for(let n=1;n<=10;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:contacts(1+(ratio-1)*n/10)});}
          finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
          strokes.push({pinch:true,contact,ratio,before:current,after:(await snapshot()).environment.camera.zoom});
        }
      }else{await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,(target.zoom-before.zoom)/.06);}
    }
    await until(()=>{const s=window.__colossus.scene;return Math.abs(s.camera.position.distanceTo(s.cameraAim))>0;});
    const actual=(await snapshot()).environment.camera;
    visit.cameraInput={target,actual,point,strokes,method:visit.profile.mobile?(allowPinch?'Native canvas orbit and two-contact pinch':'Native single-touch canvas drag; normal City zoom'):'Native canvas mouse drag and wheel'};
    for(const key of ['yaw','pitch','zoom'])assert.ok(Math.abs(actual[key]-target[key])<.012,'Native camera '+key+' failed: '+JSON.stringify({target,actual}));
  }
  try{
    const health=await(await fetch(new URL('/health',base))).json();assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,sha(root.replaceAll('\\','/').toLowerCase()));report.server={url:base.href,health};
    const cases=mode==='capture'?config.captures.filter(c=>selected.some(p=>p.name===c.profile)):selected.map(p=>({name:p.name,profile:p.name,position:config.initial}));
    for(const item of cases){
      const profile=profiles.find(p=>p.name===item.profile),fixture=makeFixture(item.position),visit={name:item.name,profile,startedAt:new Date().toISOString(),fixture:{sha256:sha(fixture),initialPosition:item.position,origin:'Baseline createGame crawler/standard; isolated save changes only x/z before ordinary UI Continue',raw:JSON.parse(fixture)},routes:[],errors:[],warnings:[],failedRequests:[],remoteRequests:[]};
      report.visits.push(visit);await write();
      const args=['--mute-audio','--enable-gpu','--use-angle=d3d11'],headless=process.env.HEADLESS==='1';browser=await chromium.launch({channel:'chrome',headless,args});visit.browser={version:browser.version(),channel:'chrome',headless,args};
      context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.deviceScaleFactor,isMobile:profile.mobile,hasTouch:profile.mobile});context._pilotMobile=profile.mobile;
      await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['data:','blob:'].includes(url.protocol))return route.continue();visit.remoteRequests.push(url.href);return route.abort();});
      await context.addInitScript(installMeshyObserver,{quality:profile.quality,fixture,gpuTiming:process.env.GPU_TIMING==='1'});
      page=await context.newPage();page.setDefaultTimeout(30000);cdp=await context.newCDPSession(page);
      page.on('pageerror',error=>visit.errors.push(error.message));page.on('console',message=>{if(['error','warning'].includes(message.type()))(message.type()==='error'?visit.errors:visit.warnings).push(message.text());});page.on('requestfailed',request=>visit.failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
      await page.goto(new URL('/?test=1',base).href,{waitUntil:'domcontentloaded',timeout:120000});await page.bringToFront();await until(()=>!!window.__colossus);await tap('#continue');
      assert.equal((await snapshot()).hud.visible,true);
      if(mode==='timing'){
        for(const route of config.routes)for(const warmth of ['first-traversal','warmed-repeat']){
          const label=route.name+'/'+warmth,row={name:route.name,warmth,waypoints:[]};visit.routes.push(row);await write();await page.evaluate(label=>window.__meshyProbe.arm(label),label);
          for(const waypoint of route.waypoints)row.waypoints.push(await navigate(waypoint,visit));
          if(route.resourceId){
            row.resource=await resourceDestination(route.resourceId,visit);
            for(const waypoint of route.returnWaypoints)row.waypoints.push(await navigate(waypoint,visit));
          }
          Object.assign(row,await page.evaluate(()=>window.__meshyProbe.finish()));assert.equal(row.focusLost,false,'Measured route lost foreground focus');assert.equal(row.contextLost,false);assert.ok(row.frames.length>10);assert.ok(row.firstRenderedMovementMs!==null);assert.ok(row.frameIntervalMs.max<1000,'One-second frame stall');await write();
        }
        visit.directionCoverage=[...new Set(visit.routes.flatMap(route=>route.waypoints.flatMap(waypoint=>waypoint.segments.map(segment=>segment.direction))))].sort();
        assert.deepEqual(visit.directionCoverage,['down','left','right','up'],'Varied routes must exercise all four ordinary movement directions');
        visit.pilot=await captureReady();visit.final=await snapshot();
      }else if(mode==='functional'){
        visit.functional=await runMeshyFunctional({page,visit,cdp,tap,snapshot,nativeCamera,navigate,captureReady,until,resourceDestination,record:write});
      }else{
        visit.pilot=await captureReady();await nativeCamera(item.camera,visit);
        // A fixed number of native rendered frames lets the ordinary spring
        // camera settle; this is capture-only and excluded from timing routes.
        await page.evaluate(()=>new Promise(resolve=>{let n=0;const settle=()=>++n>=45?resolve():requestAnimationFrame(settle);requestAnimationFrame(settle);}));
        visit.capture=await snapshot();assert.equal(visit.capture.state.paused,false);assert.equal(visit.capture.state.speed,1);assert.equal(visit.capture.hud.visible,true);assert.equal(visit.capture.hud.dialogOpen,false);assert.equal(visit.capture.hud.pauseOverlay,false);assert.equal(visit.capture.hud.horizontalOverflow,false);
        const imagePath=path.join(out,item.name+'.png');await page.screenshot({path:imagePath});const bytes=await fs.readFile(imagePath);visit.image={path:imagePath,bytes:bytes.length,sha256:sha(bytes),dimensions:[bytes.readUInt32BE(16),bytes.readUInt32BE(20)],original:true,phoneEmulation:profile.mobile};
      }
      visit.startups=await page.evaluate(()=>window.__meshyProbe.startups);assert.deepEqual(visit.errors,[]);assert.deepEqual(visit.remoteRequests,[]);assert.deepEqual(visit.failedRequests,[]);
      visit.resourceRequests=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({url:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize,duration:r.duration,initiatorType:r.initiatorType})));
      visit.finishedAt=new Date().toISOString();await context.close();context=null;await browser.close();browser=null;visit.closed=true;await write();console.log('PASS '+mode+' '+item.name);
    }
    report.sourceFinish=await fingerprint(root);assert.equal(report.sourceStart.fingerprint,report.sourceFinish.fingerprint,'Runtime/assets changed during evidence run');report.passed=true;
  }catch(error){report.failure=error.stack;process.exitCode=1;}
  finally{try{await context?.close();await browser?.close();report.cleanup={ownedBrowserClosed:true};}catch(error){report.cleanup={error:error.message};process.exitCode=1;}report.sourceFinish??=await fingerprint(root);}
}
report.finishedAt=new Date().toISOString();await write();
console.log(JSON.stringify({passed:report.passed,mode,report:path.join(out,'report.json')}));
