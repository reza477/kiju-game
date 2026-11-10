import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {createGame, serialize, deserialize, SAVE_KEY} from '../src/simulation.js';
import {CARRIER_VARIANTS} from '../src/variants.js';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';

const root=process.cwd(),base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4230/');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/nov10-improvements/expedition/browser-01');
assert.ok(['localhost','127.0.0.1'].includes(base.hostname)&&!['4178','4214'].includes(base.port));
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
async function fingerprint(){
  const files=[...new Set([...git('ls-files','src','assets','vendor','index.html','package.json','package-lock.json').split('\n'),...git('ls-files','--others','--exclude-standard','src','assets','vendor').split('\n')])].filter(Boolean).sort();
  const hashes={};for(const file of files)hashes[file]=sha(await fs.readFile(path.join(root,file)));
  return {commit:git('rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
const profiles={desktop:{viewport:{width:1440,height:960},deviceScaleFactor:1,isMobile:false,hasTouch:false},portrait:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},landscape:{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true}};
const cases=[['flesh','desktop'],['cyborg','desktop'],['standard','portrait'],['drill','landscape'],['horizontal','desktop'],['vertical','portrait']];
const report={startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),cwd:root,environment:{GAME_TEST_URL:base.href,OUTPUT_DIR:out}},method:'Isolated production-generated save fixtures, ordinary Continue and native clicks/taps/keyboard. No runtime state writes, response substitutions, clock overrides or manual simulation stepping.',limitations:['Phone profiles are desktop Chrome emulation, not physical phone performance.','This is bounded feature validation, not art acceptance or sustained performance.'],sourceBefore:await fingerprint(),visits:[],passed:false};
const write=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
await write();let browser,context,page,visit;
try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});report.browser=browser.version();
  for(const [variant,profile] of cases){
    const fixture=createGame(CARRIER_VARIANTS[variant].faction,variant);fixture.resources.wood=fixture.resources.iron=1000;
    if(variant==='flesh'){fixture.nodes[0].amount=5;}
    if(variant==='standard'){fixture.x=fixture.nodes[2].x;fixture.z=fixture.nodes[2].z;fixture.resources.food=0;fixture.buildings[13]=null;fixture.nodes[0].amount=0;}
    const raw=serialize(fixture);assert.ok(deserialize(raw));
    visit={variant,profile,profileOptions:profiles[profile],fixture:JSON.parse(raw),fixtureSha:sha(raw),startedAt:new Date().toISOString(),errors:[],warnings:[],failedRequests:[],servedHashes:{},actions:[],screenshots:[]};report.visits.push(visit);
    context=await browser.newContext({...profiles[profile],serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(15000);
    await context.addInitScript(({raw,key})=>{localStorage.setItem(key,raw);localStorage.setItem('colossus-quality-v1','performance');localStorage.setItem('colossus-camera-mode','steady');},{raw,key:SAVE_KEY});
    page.on('pageerror',error=>visit.errors.push(error.message));page.on('console',message=>{if(['error','warning'].includes(message.type()))visit.warnings.push(message.text());});
    page.on('requestfailed',request=>visit.failedRequests.push({url:request.url(),error:request.failure()}));
    const pending=[];page.on('response',response=>{const url=new URL(response.url()),file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));if(['index.html','src/main.js','src/simulation.js','src/expedition-planning.js','src/remake-ui.css'].includes(file)){pending.push(response.body().then(body=>{visit.servedHashes[file]=sha(body);assert.equal(visit.servedHashes[file],report.sourceBefore.hashes[file],`Served source differs: ${file}`);}));}});
    const until=(predicate,arg,timeoutMs=60000)=>waitForBrowserCondition(page,predicate,arg,{timeoutMs,pollingMs:100});
    const tap=selector=>profiles[profile].isMobile?page.locator(selector).tap():page.locator(selector).click();
    const panel=async name=>{if(profiles[profile].isMobile&&await page.locator('body').getAttribute('data-mobile-panel')!==name)await tap(`[data-mobile-panel="${name}"]`);};
    const screenshot=async name=>{const filename=`${variant}-${profile}-${name}.png`;const bytes=await page.screenshot({path:path.join(out,filename),fullPage:false});visit.screenshots.push({file:filename,bytes:bytes.length,sha256:sha(bytes)});};
    const state=()=>page.evaluate(()=>({variant:window.__colossus.state.variant,mode:window.__colossus.state.mode,paused:window.__colossus.state.paused,time:window.__colossus.state.time,x:window.__colossus.state.x,z:window.__colossus.state.z,target:window.__colossus.state.target,food:window.__colossus.state.resources.food,population:window.__colossus.state.population,starving:window.__colossus.state.starving,view:window.__colossus.scene.view,overflow:document.documentElement.scrollWidth>innerWidth+1}));
    await page.goto(new URL('?test=expedition-planning',base).href,{waitUntil:'domcontentloaded'});
    await until(()=>!!window.__colossus&&document.querySelector('#loading').classList.contains('hidden'));
    await tap('#continue');await until(()=>!document.querySelector('#hud').classList.contains('hidden'));
    await panel('city');await tap('#district-overview summary');
    assert.equal(await page.locator('#district-roster button').count(),fixture.buildings.filter(Boolean).length);
    const roster=await page.locator('[data-district-slot="11"]').elementHandle();
    await tap('[data-district-slot="11"]');
    assert.equal((await state()).view,'city','Roster inspection does not force a camera mode');
    await tap('[data-upgrade="11"]');
    await until(()=>document.querySelector('[data-district-slot="11"] small').textContent.includes('Upgrading'));
    assert.equal(await roster.evaluate(element=>element===document.querySelector('[data-district-slot="11"]')),true);
    await screenshot('districts');visit.actions.push({kind:'inspect-and-upgrade-existing-district',after:await state()});
    await tap(profiles[profile].isMobile?'#mobile-menu':'#menu');await tap('[data-dialog-action="save"]');
    const saved=await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY),loaded=deserialize(saved);assert.ok(loaded);assert.equal(loaded.variant,variant);assert.deepEqual(loaded.towerOrder,fixture.towerOrder);assert.equal(loaded.buildings[11].type,'housing');
    await tap('#close-dialog');visit.actions.push({kind:'native-save',sha256:sha(saved),districtIds:loaded.buildings.flatMap((building,slot)=>building?[slot]:[])});
    if(variant==='flesh'){
      await panel('map');await tap('#destinations-toggle');
      const resource=await page.locator('[data-resource-id="forest"]').elementHandle();
      await tap('[data-resource-id="forest"]');await until(()=>!!window.__colossus.state.target);
      await tap('#stop-course');const stopped=await state();await page.waitForTimeout(700);const later=await state();
      assert.equal(later.target,null);assert.ok(Math.hypot(later.x-stopped.x,later.z-stopped.z)<.001);
      await tap('[data-resource-id="forest"]');
      await until(()=>window.__colossus.state.nodes[0].amount===0,undefined,20000);
      await until(()=>document.querySelector('[data-resource-id="forest"]').disabled);
      assert.equal(await resource.evaluate(element=>element===document.querySelector('[data-resource-id="forest"]')),true);
      assert.match(await page.locator('[data-resource-id="forest"]').textContent(),/Depleted/);
      await screenshot('depleted-resource');visit.actions.push({kind:'stop-course-and-native-depletion',after:await state()});
      await page.locator('#tower-floor').focus();await page.keyboard.press('End');await page.keyboard.press('Enter');
      const focused=await page.locator('#tower-floor').elementHandle();await page.waitForTimeout(700);
      assert.equal(await focused.evaluate(element=>document.activeElement===element),true);
      assert.equal(await page.locator('#tower-floor').inputValue(),'2');
      visit.actions.push({kind:'native-kaiju-select-keyboard-focus-retained'});
    }
    if(variant==='standard'){
      assert.equal((await state()).starving,false);assert.ok((await state()).population>=fixture.population);
      assert.match(await page.locator('#food-rate').textContent(),/^\+3\./);
      await panel('map');await tap('#destinations-toggle');assert.equal(await page.locator('[data-resource-id="forest"]').isDisabled(),true);
      const before=await state();await tap('[data-resource-id="fields"]');await page.waitForTimeout(400);const after=await state();
      assert.equal(after.target,null);assert.ok(Math.hypot(after.x-before.x,after.z-before.z)<.001);
      await screenshot('food-gathering');await tap('#pause');await until(()=>document.querySelector('#food-rate').textContent==='Paused');await tap('#pause');
      visit.actions.push({kind:'native-food-harvest-nearby-route-and-pause',after:await state()});
    }
    assert.equal((await state()).overflow,false);assert.deepEqual(visit.errors,[]);assert.deepEqual(visit.failedRequests,[]);
    await Promise.all(pending);for(const file of ['index.html','src/main.js','src/simulation.js','src/expedition-planning.js','src/remake-ui.css'])assert.ok(visit.servedHashes[file]);
    visit.finishedAt=new Date().toISOString();visit.passed=true;await write();await context.close();context=null;
  }
  report.sourceAfter=await fingerprint();assert.equal(report.sourceAfter.fingerprint,report.sourceBefore.fingerprint,'Runtime source changed during feature capture');report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};if(page&&!page.isClosed())try{await page.screenshot({path:path.join(out,'failure.png'),fullPage:false});}catch{}process.exitCode=1;
}finally{if(context)await context.close();if(browser)await browser.close();report.finishedAt=new Date().toISOString();report.exitCode=report.passed?0:1;await write();console.log(JSON.stringify({out,passed:report.passed,visits:report.visits.map(v=>({variant:v.variant,profile:v.profile,passed:v.passed,errors:v.errors})),error:report.error},null,2));}
