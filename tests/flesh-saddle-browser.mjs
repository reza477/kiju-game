// Native, isolated saddle UI regression. No simulation advancement, RAF rewrite,
// page-state assignment after initialization, user browser profile or publishing.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';

const baselineCommit='ef5a6b5a68b5646a04e54ca55a4593570189292a';
const root=path.resolve(process.env.SOURCE_ROOT||fileURLToPath(new URL('..',import.meta.url)));
const fixtureRoot=path.resolve(process.env.BASELINE_ROOT||path.join(root,'../../rig-ground-release/Kiju Game'));
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4219/');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/flesh-saddle/native-browser');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024});
const paths=['src','index.html','assets','vendor','package.json','package-lock.json'];
const profiles=[
  {name:'desktop',viewport:{width:1440,height:960},deviceScaleFactor:1,mobile:false,quality:'high'},
  {name:'phone-portrait',viewport:{width:390,height:844},deviceScaleFactor:2,mobile:true,quality:'performance'},
];
async function fingerprint(){
  const names=[...new Set([...git('ls-files',...paths).toString().split('\n'),...git('ls-files','--others','--exclude-standard','src','assets','vendor').toString().split('\n')])].filter(Boolean).sort(),hashes={};
  for(const name of names)hashes[name]=sha(await fs.readFile(path.join(root,name)));
  return{root,commit:git('rev-parse','HEAD').toString().trim(),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
async function oldFixture(){
  const hashes={};
  async function dependency(file){
    const name=path.relative(fixtureRoot,file).split(path.sep).join('/');
    assert.ok(!name.startsWith('../')&&!path.isAbsolute(name),'Baseline dependency escaped its checkout');
    if(hashes[name])return;
    const bytes=await fs.readFile(file),recorded=git('show',baselineCommit+':'+name);
    assert.equal(sha(bytes),sha(recorded),'Baseline fixture dependency differs: '+name);hashes[name]=sha(bytes);
    for(const match of bytes.toString().matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
      if(!match[1].startsWith('.'))continue;
      await dependency(path.resolve(path.dirname(file),match[1]));
    }
  }
  await dependency(path.join(fixtureRoot,'src/simulation.js'));
  const sim=await import(pathToFileURL(path.join(fixtureRoot,'src/simulation.js')).href);
  const original=sim.createGame('kaiju','flesh'),before=sim.serialize(original);
  original.resources={wood:9000,iron:9000,food:9000};
  const fixture=sim.serialize(original),check=JSON.parse(fixture),old=JSON.parse(before);
  delete check.resources;delete old.resources;assert.deepEqual(check,old,'Only initial test resources may differ');
  assert.ok(sim.deserialize(fixture));return{fixture,baselineStarter:before,dependencyHashes:hashes,fixtureRoot,baselineCommit,resourcesOnly:true};
}

export async function runFleshSaddleBrowser(){
  assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'Local testing only');
  assert.ok(!['4214','4178'].includes(base.port),'Do not target the protected user origins4214/4178');
  await fs.mkdir(out,{recursive:true});assert.deepEqual(await fs.readdir(out),[],'Fresh output directory required; preserve prior evidence');
  const report={protocol:'flesh-saddle-native-ui-v1',startedAt:new Date().toISOString(),base:base.href,
    command:{executable:process.execPath,args:process.argv.slice(1),environment:Object.fromEntries(['SOURCE_ROOT','BASELINE_ROOT','GAME_TEST_URL','OUTPUT_DIR','HEADLESS','EXPECTED_FINGERPRINT'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))},
    method:'Fresh isolated browser contexts seeded once with verified pre-saddle starter save plus initial resources only. Real Continue/build/select/upgrade/reinforce/save controls, real wall-clock construction and movement, ordinary reload. Read-only runtime observations; no advance call, frame pumping, fake clock or runtime assignment.',
    limitations:['Chrome desktop and phone touch/viewport emulation; not physical iPhone/iPad or Safari.','Functional UI test, not a performance benchmark, art review, offline/install/update or long-session gate.','Reload-time ERR_ABORTED cancellations are retained separately; other failed requests and all runtime/HTTP errors fail.','Old save is initialized in isolated localStorage then opened with Continue; this does not test the separate save-file import dialog.'],
    visits:[],passed:false,exitCode:null};
  const write=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  let browser,context,page,visit;
  try{
    report.sourceStart=await fingerprint();
    if(process.env.EXPECTED_FINGERPRINT)assert.equal(report.sourceStart.fingerprint,process.env.EXPECTED_FINGERPRINT);
    report.toolHashes=Object.fromEntries(await Promise.all(['tests/flesh-saddle-browser.mjs','tests/helpers/browser-condition.mjs'].map(async f=>[f,sha(await fs.readFile(path.join(root,f)))])));
    const fixture=await oldFixture();report.fixture={...fixture,sha256:sha(fixture.fixture)};await fs.writeFile(path.join(out,'initial-baseline-save.json'),fixture.fixture,{flag:'wx'});
    report.serverIdentity=[];
    for(const name of ['src/main.js','src/saddle-layout.js','src/build-info.js']){
      const response=await fetch(new URL(name,base));assert.equal(response.status,200,'Wrong server or missing '+name);
      const actual=sha(Buffer.from(await response.arrayBuffer())),expected=report.sourceStart.hashes[name];
      report.serverIdentity.push({name,status:response.status,actual,expected});assert.equal(actual,expected,'Server does not serve this exact source: '+name);
    }
    await write();
    browser=await chromium.launch({channel:'chrome',headless:process.env.HEADLESS==='1',args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});
    report.browser={version:browser.version(),channel:'chrome',headless:process.env.HEADLESS==='1'};
    for(const profile of profiles){
      visit={profile,startedAt:new Date().toISOString(),actions:[],checks:[],errors:[],warnings:[],remoteRequests:[],failedRequests:[],closed:false};report.visits.push(visit);await write();
      context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.deviceScaleFactor,isMobile:profile.mobile,hasTouch:profile.mobile,serviceWorkers:'block'});
      await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();visit.remoteRequests.push(url.href);return route.abort();});
      await context.addInitScript(({fixture,quality})=>{if(localStorage.getItem('colossus-wake-save-v1')===null)localStorage.setItem('colossus-wake-save-v1',fixture);localStorage.setItem('colossus-quality-v1',quality);localStorage.setItem('colossus-camera-mode','steady');},{fixture:fixture.fixture,quality:profile.quality});
      page=await context.newPage();page.setDefaultTimeout(30000);
      page.on('pageerror',e=>visit.errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')visit.errors.push(m.text());else if(m.type()==='warning')visit.warnings.push(m.text());});
      page.on('requestfailed',r=>visit.failedRequests.push({url:r.url(),reason:r.failure()?.errorText}));
      page.on('response',r=>{if(r.status()>=400)visit.errors.push('HTTP '+r.status()+' '+r.url());});
      const until=(predicate,arg,timeoutMs=60000)=>waitForBrowserCondition(page,predicate,arg,{timeoutMs,pollingMs:100});
      const tap=async selector=>{visit.actions.push({at:new Date().toISOString(),selector,kind:profile.mobile?'tap':'click'});await(profile.mobile?page.locator(selector).tap():page.locator(selector).click());};
      const panel=async name=>{if(profile.mobile&&await page.evaluate(()=>document.body.dataset.mobilePanel)!==name)await tap('[data-mobile-panel="'+name+'"]');};
      const snapshot=()=>page.evaluate(()=>{const s=window.__colossus.state,g=window.__colossus.scene,l=g.city.saddleLayout;return{time:s.time,x:s.x,z:s.z,paused:s.paused,mode:s.mode,speed:s.speed,variant:s.variant,rings:s.rings,ringConstruction:structuredClone(s.ringConstruction),buildings:structuredClone(s.buildings),towerOrder:[...s.towerOrder],stats:structuredClone(s.stats),worldDamage:structuredClone(s.worldDamage),layout:{kind:g.city.layout,order:[...l.order],rearLoaded:l.rearLoaded,rearFrameVisible:g.city.meshyCarrier.saddle.rearFrame.visible,positions:l.positions.map(p=>({x:p.x,y:p.y,z:p.z,height:p.height,tier:p.tier}))},view:g.view,tier:g.towerTier,selectedText:document.querySelector('#selection').textContent,environmentReady:g.environmentReady,glLost:g.renderer.getContext().isContextLost(),shaderFailures:g.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.name),hudVisible:!document.querySelector('#hud').classList.contains('hidden'),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};});
      const ready=async()=>{await until(()=>!!window.__colossus?.scene?.renderer,null,120000);assert.match(await page.title(),/Colossus Wake/i);await tap('#continue');await until(()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0,null,120000);};
      const validate=s=>{assert.equal(s.variant,'flesh');assert.equal(s.layout.kind,'saddle');assert.equal(s.glLost,false);assert.deepEqual(s.shaderFailures,[]);assert.equal(s.hudVisible,true);assert.equal(s.horizontalOverflow,false);assert.deepEqual(s.layout.order,s.towerOrder);};
      await page.goto(new URL('/?test=1',base).href,{waitUntil:'domcontentloaded',timeout:120000});await page.bringToFront();await ready();
      visit.initial=await snapshot();validate(visit.initial);assert.deepEqual(visit.initial.buildings,JSON.parse(fixture.fixture).buildings);assert.deepEqual(visit.initial.towerOrder,[7,11,13]);assert.equal(visit.initial.layout.rearFrameVisible,false);visit.checks.push('Verified old baseline starter save opens as the low flesh saddle with historical IDs');
      const built=[];
      async function attachWard(){
        await panel('build');await tap('[data-building="housing"]');
        const button=page.locator('#selection [data-slot]');assert.equal(await button.count(),1);
        const id=Number(await button.getAttribute('data-slot')),before=await snapshot();assert.equal(before.buildings[id],null);
        await tap('#selection [data-slot="'+id+'"]');await until(id=>!!window.__colossus.state.buildings[id],id);
        const start=await snapshot();assert.deepEqual(start.towerOrder,[...before.towerOrder,id]);assert.ok(start.buildings[id].remaining>0);
        const wallStart=performance.now();await until(id=>window.__colossus.state.buildings[id]?.remaining===0,id);
        const end=await snapshot();validate(end);assert.equal(end.buildings[id].type,'housing');assert.equal(end.buildings[id].level,1);assert.ok(end.time>start.time);
        built.push(id);visit.actions.push({kind:'real-construction-completed',id,start,end,observedWaitMs:performance.now()-wallStart});await write();return id;
      }
      const first=await attachWard();visit.checks.push('Attach next ward completes through real-time native UI');
      await panel('city');await page.locator('#tower-floor').selectOption('3');
      visit.actions.push({kind:'native-select-control',selector:'#tower-floor',value:'3',at:new Date().toISOString()});
      await until(()=>window.__colossus.scene.view==='people'&&window.__colossus.scene.towerTier===3);
      const inspected=await snapshot();assert.match(inspected.selectedText,/SADDLE WARD 4/);assert.equal(inspected.towerOrder[inspected.tier],first);assert.equal(await page.locator('[data-upgrade="'+first+'"]').count(),1);
      await tap('[data-upgrade="'+first+'"]');await until(id=>window.__colossus.state.buildings[id].upgrading===true,first);
      const upgrading=await snapshot();assert.ok(upgrading.buildings[first].remaining>0);
      async function saveMenu(){
        await tap(profile.mobile?'#mobile-menu':'#menu');await tap('[data-dialog-action="save"]');
        const saved=await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1'));assert.ok(saved);return JSON.parse(saved);
      }
      const pendingSave=await saveMenu();assert.equal(pendingSave.buildings[first].upgrading,true);visit.pendingUpgradeSave=pendingSave;
      await page.reload({waitUntil:'domcontentloaded',timeout:120000});await ready();const restored=await snapshot();validate(restored);
      assert.deepEqual(restored.towerOrder,pendingSave.towerOrder);assert.equal(restored.buildings[first].level,pendingSave.buildings[first].level);assert.equal(restored.buildings[first].upgrading,true);assert.ok(restored.buildings[first].remaining>0&&restored.buildings[first].remaining<=pendingSave.buildings[first].remaining+.01);
      await until(id=>window.__colossus.state.buildings[id]?.level===2&&!window.__colossus.state.buildings[id]?.upgrading,first);
      const upgraded=await snapshot();for(const id of inspected.towerOrder)for(const axis of ['x','y','z'])assert.equal(upgraded.layout.positions[id][axis],inspected.layout.positions[id][axis]);
      visit.checks.push('Selected ward upgrades locally; native save/reload retains pending upgrade, order and progress');
      await panel('city');await tap('#expand-ring');await until(()=>window.__colossus.state.rings===2&&!window.__colossus.state.ringConstruction);
      const reinforced=await snapshot();assert.equal(reinforced.layout.rearFrameVisible,false);assert.deepEqual(reinforced.towerOrder,upgraded.towerOrder);visit.checks.push('Native reinforcement adds capacity without empty rear framing');
      while((await snapshot()).towerOrder.length<7)await attachWard();
      const loaded=await snapshot();assert.equal(loaded.layout.rearLoaded,true);assert.equal(loaded.layout.rearFrameVisible,true);assert.deepEqual(loaded.towerOrder,[...visit.initial.towerOrder,...built]);visit.checks.push('First occupied rear ward enables its real support frame');
      if(profile.mobile&&await page.locator('.left-stack').isVisible())await tap('.left-stack [data-close-panel]');
      visit.movement=[];const cdp=profile.mobile?await context.newCDPSession(page):null;
      for(const direction of ['up','left']){
        const before=await snapshot(),startedAt=new Date().toISOString(),wall=performance.now();
        if(profile.mobile){const b=await page.locator('[data-move="'+direction+'"]').boundingBox();assert.ok(b&&b.width>0);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:b.x+b.width/2,y:b.y+b.height/2}]});try{await page.waitForTimeout(900);}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}}
        else{const key=direction==='up'?'ArrowUp':'ArrowLeft';await page.keyboard.down(key);try{await page.waitForTimeout(900);}finally{await page.keyboard.up(key);}}
        const after=await snapshot();assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>1);assert.ok(after.time>before.time);validate(after);visit.movement.push({direction,startedAt,elapsedMs:performance.now()-wall,before,after});
      }
      visit.checks.push('Ordinary keyboard or touch-pad input moves the running carrier in two directions');
      const completedSave=await saveMenu();visit.completedSave=completedSave;await page.reload({waitUntil:'domcontentloaded',timeout:120000});await ready();
      visit.final=await snapshot();validate(visit.final);assert.deepEqual(visit.final.towerOrder,completedSave.towerOrder);assert.deepEqual(visit.final.buildings,completedSave.buildings);assert.equal(visit.final.rings,completedSave.rings);assert.deepEqual(visit.final.worldDamage,completedSave.worldDamage);assert.equal(visit.final.layout.rearFrameVisible,true);
      visit.checks.push('Final save/reload preserves seven wards, upgrade, capacity, destruction progress and rear support');
      const imagePath=path.join(out,profile.name+'-final.png');await page.screenshot({path:imagePath});const image=await fs.readFile(imagePath);visit.image={path:imagePath,sha256:sha(image),bytes:image.length,dimensions:[image.readUInt32BE(16),image.readUInt32BE(20)],phoneEmulation:profile.mobile,original:true};
      assert.deepEqual(visit.errors,[]);assert.deepEqual(visit.remoteRequests,[]);assert.deepEqual(visit.failedRequests.filter(r=>r.reason!=='net::ERR_ABORTED'),[]);
      visit.finishedAt=new Date().toISOString();await context.close();context=null;visit.closed=true;await write();console.log('PASS '+profile.name+' '+visit.checks.length+' native checks');
    }
    report.passed=true;
  }catch(error){report.failure=error.stack||String(error);if(page&&!page.isClosed())try{const failurePath=path.join(out,'failure.png');await page.screenshot({path:failurePath});report.failureImage=failurePath;}catch(screenshotError){report.failureScreenshotError=screenshotError.message;}}
  finally{
    if(context){try{await context.close();if(visit)visit.closed=true;}catch(error){report.closeError=error.message;report.passed=false;}}
    if(browser){try{await browser.close();report.browserClosed=true;}catch(error){report.closeError=error.message;report.passed=false;}}
    try{report.sourceFinish=await fingerprint();report.sourceStable=report.sourceStart?.fingerprint===report.sourceFinish.fingerprint;if(!report.sourceStable){report.passed=false;report.sourceFailure='Runtime source changed during the native UI test';}}catch(error){report.passed=false;report.sourceFailure=error.message;}
    report.finishedAt=new Date().toISOString();report.exitCode=report.passed?0:1;await write();process.exitCode=report.exitCode;console.log(JSON.stringify({passed:report.passed,exitCode:report.exitCode,sourceStable:report.sourceStable,report:path.join(out,'report.json'),failure:report.failure??null}));
  }
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await runFleshSaddleBrowser();

