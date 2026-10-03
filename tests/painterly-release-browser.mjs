// Real frozen A -> B -> A, using the existing production delivery-server
// harness. No cache deletion, worker unregister, personal profile or publishing.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {readFrozenRelease,createDeliveryServer} from './helpers/delivery-server.mjs';
import {deliveryBrowserOptions,browserGraphicsInfo} from '../scripts/browser-runtime.mjs';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';
import {verifyRuntime} from '../scripts/delivery-lib.mjs';

const output=path.resolve(process.env.OUTPUT_DIR||'artifacts/painterly/release-browser');
await fs.mkdir(output,{recursive:true});
const A=await readFrozenRelease(process.env.GAME_RELEASE_DIR),B=await readFrozenRelease(process.env.GAME_NEXT_RELEASE_DIR);
assert.notEqual(A.descriptor.buildId,B.descriptor.buildId);
assert.notEqual(A.descriptor.gitCommit,'local');assert.notEqual(B.descriptor.gitCommit,'local');
const server=await createDeliveryServer({A,B}),saveKey='colossus-wake-save-v1';
const report={startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),environment:Object.fromEntries(['GAME_RELEASE_DIR','GAME_NEXT_RELEASE_DIR','OUTPUT_DIR','PLAYWRIGHT_CHANNEL','PLAYTEST_GRAPHICS_BACKEND'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]))},
  protocol:'Actual frozen baseline A and art candidate B, same isolated loopback origin; native RAF, UI Save/Continue/update, real stopped-server offline, rollback.',
  fixtures:['Rich old save is prepared through the baseline production simulation build/upgrade/tick functions, with accelerated fixture time and a position at the existing forest to gather. No resource grants, costs, rates, geometry, random seeds or rules are changed.',
    'Eight existing tree/rock damage IDs are restored through production landscape reset. This tests serialized damage reconstruction, not a claim of input-driven crushing.',
    'Test-owned browser context only. Windows desktop Chromium touch emulation is not physical iPhone/iPad or Safari evidence. Ordinary Playwright tabs prove multiple-client byte pinning; they do not establish native background-tab or lock/resume behavior.',
    'Concurrent-save conflict resolution is not proven: unchanged main.js saves each started session on pagehide/beforeunload. The old A client stays open through compatibility assertions; closing a stale client could overwrite newer progress under that existing last-writer behavior. This source-supported risk is separate from release-byte pinning and is not repaired or runtime-reproduced by this art gate.'],
  releases:{A:{buildId:A.descriptor.buildId,commit:A.descriptor.gitCommit,root:A.root},B:{buildId:B.descriptor.buildId,commit:B.descriptor.gitCommit,root:B.root}},
  checks:[],observations:[],pageErrors:[],consoleErrors:[],expectedFaults:[],remoteRequests:[],failedRequests:[],passed:false};
let browser,context,page,peer,phase='startup',offline=false,fault=null;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const until=(target,predicate,argument)=>waitForBrowserCondition(target,predicate,argument,{timeoutMs:150000});
const write=()=>fs.writeFile(path.join(output,'results.json'),JSON.stringify({...report,requests:server.requests},null,2)+'\n');
async function check(name,callback){phase=name;report.currentStage={name,startedAt:new Date().toISOString()};await write();console.log('START '+name);await callback();report.checks.push({name,finishedAt:new Date().toISOString()});console.log('PASS '+name);await write();}
function observe(target){
  target.setDefaultTimeout(30000);
  target.on('pageerror',error=>report.pageErrors.push({phase,message:error.message}));
  target.on('requestfailed',request=>report.failedRequests.push({phase,path:new URL(request.url()).pathname,error:request.failure()?.errorText}));
  target.on('console',message=>{
    if(message.type()!=='error')return;
    const location=message.location(),pathname=location.url?new URL(location.url).pathname:'';
    const expected=(offline&&['/sw.js','/release.json'].includes(pathname)&&/net::ERR_(?:INTERNET_DISCONNECTED|CONNECTION_REFUSED)/.test(message.text()))
      ||(fault&&pathname===fault.path&&/^Failed to load resource: net::ERR_(?:EMPTY_RESPONSE|CONNECTION_CLOSED|CONNECTION_RESET|INCOMPLETE_CHUNKED_ENCODING|CONTENT_LENGTH_MISMATCH)/.test(message.text()));
    (expected?report.expectedFaults:report.consoleErrors).push({phase,message:message.text(),location});
  });
}
async function open(build){const target=await context.newPage();observe(target);await target.bringToFront();await target.goto(server.origin+'/?test=1',{waitUntil:'domcontentloaded',timeout:120000});await loaded(target,build);return target;}
async function loaded(target,release){await until(target,async id=>!!window.__colossus&&(await import('/src/build-info.js')).BUILD_ID===id,release.descriptor.buildId);}
async function rendered(target){await until(target,()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0);const state=await target.evaluate(()=>({surface:window.__colossus.scene.surfaceDiagnostics(),environmentError:window.__colossus.scene.environmentError,draws:window.__colossus.scene.renderer.info.render.calls}));assert.deepEqual(state.surface.failures,[]);assert.equal(state.environmentError,null);assert.ok(state.draws>0);return state;}
async function rawSave(target=page){return target.evaluate(key=>localStorage.getItem(key),saveKey);}
async function menu(target=page){if(!await target.locator('#dialog').evaluate(element=>element.open))await target.locator('#mobile-menu').tap();}
async function save(target=page){await menu(target);await target.locator('[data-dialog-action="save"]').tap();return JSON.parse(await rawSave(target));}
async function panel(target=page){await menu(target);if(!await target.locator('#offline-apply').count())await target.locator('[data-dialog-action="playtest"]').tap();}
async function status(target=page){return target.evaluate(async()=> (await import('/src/offline.js')).refreshOfflineStatus());}
async function installed(target,release){await until(target,async id=>{const s=await(await import('/src/offline.js')).refreshOfflineStatus();return s.canPlayOffline&&s.installedBuildId===id;},release.descriptor.buildId);}
async function identity(target,expected){
  const current=await target.evaluate(()=>window.__colossus.snapshot());
  for(const field of ['version','faction','variant','towerOrder','rings','ringConstruction','worldDamage','nodes','enemies'])assert.deepEqual(current[field],expected[field],field+' changed after save reconstruction');
  assert.deepEqual(current.buildings.map(b=>b&&({type:b.type,level:b.level,facing:b.facing,upgrading:b.upgrading})),expected.buildings.map(b=>b&&({type:b.type,level:b.level,facing:b.facing,upgrading:b.upgrading})), 'District IDs, order, levels, facings and upgrade state');
  assert.equal(current.resources.wood,expected.resources.wood);assert.equal(current.resources.iron,expected.resources.iron);
  assert.ok(current.time>=expected.time&&current.time-expected.time<5,'Only bounded native wall-time may elapse at Continue');
  assert.ok(Math.abs(current.resources.food-expected.resources.food)<5,'Food changed outside bounded ordinary elapsed simulation');
  for(let i=0;i<20;i++)if(expected.buildings[i]?.remaining>0)assert.ok(current.buildings[i].remaining<=expected.buildings[i].remaining&&current.buildings[i].remaining>Math.max(0,expected.buildings[i].remaining-5));
  const damage=await target.evaluate(()=>{const{scene,state}=window.__colossus;scene.update(state,0,null);const anchors=new Set(scene.landscape.crushables.map(r=>r.id));let hidden=0;scene.landscape.group.traverse(mesh=>{if(mesh.isInstancedMesh)for(let i=0;i<mesh.count;i++)if(mesh.instanceMatrix.array[i*16+13]===-5000)hidden++;});return{ids:state.worldDamage.expedition.slice(),allValid:state.worldDamage.expedition.every(id=>anchors.has(id)),destroyedCount:scene.landscape.stats.destroyedCount,hidden};});
  assert.equal(damage.allValid,true);assert.equal(damage.destroyedCount,expected.worldDamage.expedition.length);assert.ok(damage.hidden>=damage.destroyedCount);
  report.observations.push({phase,time:current.time,resources:current.resources,buildings:current.buildings,towerOrder:current.towerOrder,damage});
  return current;
}
async function resume(target,expected){await target.locator('#continue').tap();await menu(target);await rendered(target);return identity(target,expected);}
async function verifyClientBytes(target,release){
  const actual=await target.evaluate(async files=>{const out=[];for(const file of files){const response=await fetch(file.url),bytes=await response.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');out.push({url:file.url,status:response.status,bytes:bytes.byteLength,sha256:hash,type:response.headers.get('Content-Type')});}return out;},release.descriptor.files);
  for(const file of release.descriptor.files){const value=actual.find(item=>item.url===file.url);assert.equal(value.status,200);assert.equal(value.sha256,file.sha256,file.url+' mixed release bytes');assert.equal(value.bytes,file.bytes);assert.equal(value.type,file.type,file.url+' MIME');}
  report.observations.push({phase,pinnedRelease:release.descriptor.buildId,verifiedFileCount:actual.length,verifiedBytes:release.descriptor.totalBytes});
}
async function cachesComplete(target){
  const inventories=await target.evaluate(async ids=>{const out=[];for(const name of await caches.keys()){const id=ids.find(id=>name.startsWith('colossus-wake-release-'+id));if(!id)continue;const cache=await caches.open(name),keys=await cache.keys();out.push({name,id,paths:keys.map(key=>new URL(key.url).pathname)});}return out;},[A.descriptor.buildId,B.descriptor.buildId]);
  for(const release of [A,B]){const found=inventories.find(x=>x.id===release.descriptor.buildId);assert.ok(found,'Complete historical release cache missing');for(const file of release.descriptor.files)assert.ok(found.paths.includes(file.url),'Retained cache lost '+file.url);}
  report.observations.push({phase,caches:inventories.map(({name,id,paths})=>({name,id,fileCount:paths.length}))});
}
async function updateTo(release){await panel();await page.evaluate(async()=> (await import('/src/offline.js')).checkForUpdate());await until(page,async id=>{const s=await(await import('/src/offline.js')).refreshOfflineStatus();return s.canApplyUpdate&&s.updateBuildId===id;},release.descriptor.buildId);const before=await rawSave();await page.locator('#offline-apply').tap();await loaded(page,release);assert.equal(await rawSave(),before,'Paused Save and update must preserve exact rich save');return JSON.parse(before);}

try{
  report.releases.A.artifactSha256=(await verifyRuntime(A.root)).artifactSha256;report.releases.B.artifactSha256=(await verifyRuntime(B.root)).artifactSha256;
  browser=await chromium.launch(deliveryBrowserOptions());report.browser=browser.version();report.graphics=await browserGraphicsInfo(browser);
  context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{localStorage.setItem('colossus-quality-v1','performance');localStorage.setItem('colossus-camera-mode','steady');});
  context.on('request',request=>{const url=new URL(request.url());if(url.origin!==server.origin&&!['data:','blob:'].includes(url.protocol))report.remoteRequests.push({phase,origin:url.origin,path:url.pathname});});
  let oldSave,newSave;
  await check('Actual A automatically installs completely and owns its normal title reopen',async()=>{
    page=await open(A);await installed(page,A);await until(page,()=>!!navigator.serviceWorker.controller&&!!window.__colossus);await loaded(page,A);await rendered(page);await verifyClientBytes(page,A);
  });
  await check('A creates a valid rich cyborg save with vertical construction, upgrade, gathered resources and saved damage',async()=>{
    await page.locator('[data-faction="kaiju"]').tap();await page.locator('[data-variant="cyborg"]').tap();await page.locator('#begin').tap();
    report.fixture=await page.evaluate(async()=>{
      const sim=await import('/src/simulation.js'),vertical=await import('/src/vertical-city.js'),{state:s,scene}=window.__colossus;
      s.paused=false;const first=vertical.nextVerticalSlot(s.buildings,s.rings),cannon=sim.build(s,'cannon',first);
      if(!cannon.ok)throw Error(cannon.message);for(let i=0;i<40;i++)sim.tick(s,.25);
      const upgrade=sim.upgrade(s,11);if(!upgrade.ok)throw Error(upgrade.message);for(let i=0;i<36;i++)sim.tick(s,.25);
      const forest=s.nodes.find(node=>node.id==='forest'),start={x:s.x,z:s.z};s.x=forest.x;s.z=forest.z;s.target=null;for(let i=0;i<20;i++)sim.tick(s,.25);s.x=start.x;s.z=start.z;s.gathering=null;
      const second=vertical.nextVerticalSlot(s.buildings,s.rings),farm=sim.build(s,'farm',second);if(!farm.ok)throw Error(farm.message);
      const records=scene.landscape.crushables,trees=records.filter(r=>r.kind==='tree'),rocks=records.filter(r=>r.kind==='rock');
      s.worldDamage.expedition=[...trees.slice(0,4),...rocks.slice(0,4)].map(r=>r.id);s.worldDamage.battle=[trees.at(-1).id,rocks.at(-1).id];s.paused=true;scene.update(s,0,null);window.__colossus.advance(0);
      return{first,second,cannon,upgrade,farm,damage:s.worldDamage,layout:vertical.createVerticalLayout(s.buildings,s.towerOrder,s.variant)};
    });
    oldSave=await save();assert.ok(oldSave.stats.gathered>0);assert.equal(oldSave.buildings[11].level,2);assert.equal(oldSave.towerOrder.at(-1),report.fixture.second);assert.equal(report.fixture.layout.heightScale,.5);assert.ok(oldSave.buildings[report.fixture.second].remaining>0);await identity(page,oldSave);
    await fs.writeFile(path.join(output,'isolated-old-save.json'),JSON.stringify(oldSave,null,2)+'\n');
  });
  await check('A reload/Continue reconstructs districts, resources and destroyed scenery before updating',async()=>{
    await page.reload({waitUntil:'domcontentloaded'});await loaded(page,A);await resume(page,oldSave);oldSave=await save();await panel();
    peer=await open(A);await resume(peer,oldSave);await page.bringToFront();
  });
  await check('Interrupted B art-module download cannot replace complete A or alter its save',async()=>{
    const artModule=B.descriptor.files.find(file=>file.url==='/src/painterly-vegetation.js');
    assert.ok(artModule,'Candidate inventory must include the migrated crown/cover module.');
    server.select('B');fault={kind:'interrupt',path:artModule.url};server.inject(fault);
    const before=await rawSave(),time=await page.evaluate(()=>performance.timeOrigin),index=server.requests.length;
    const result=await page.evaluate(async()=> (await import('/src/offline.js')).checkForUpdate());
    assert.ok(server.requests.slice(index).some(r=>r.injected&&r.path===fault.path),'Art-module interruption was not exercised');assert.equal(result.canApplyUpdate,false);assert.equal(await rawSave(),before);assert.equal(await page.evaluate(()=>performance.timeOrigin),time);await installed(page,A);
    report.observations.push({phase,status:result});
  });
  await check('Interrupted B leaves complete A playable on offline reopening with the actual server stopped',async()=>{
    offline=true;await server.close();server.inject(null);fault=null;await context.setOffline(true);const requests=server.requests.length;
    const retained=await open(A);await resume(retained,oldSave);await verifyClientBytes(retained,A);assert.equal(server.requests.length,requests);await retained.screenshot({path:path.join(output,'interrupted-B-offline-A.png')});await retained.close();
    await server.resume();await context.setOffline(false);offline=false;await page.bringToFront();
  });
  await check('B fully downloads while both open A clients retain their old runtime and art bytes',async()=>{
    await page.evaluate(async()=> (await import('/src/offline.js')).checkForUpdate());await until(page,async()=> (await import('/src/offline.js')).getOfflineStatus().canApplyUpdate);
    await loaded(page,A);await loaded(peer,A);await verifyClientBytes(peer,A);await verifyClientBytes(page,A);
  });
  await check('Save and update loads actual B and preserves the rich A save; the old A session remains pinned',async()=>{
    // A peer may save on focus changes; capture the caller's current frozen state
    // through the production save control before moving to the update panel.
    await page.locator('#close-dialog').tap();oldSave=await save();await panel();oldSave=await updateTo(B);
    // Keep the old session open through the gate. Closing a started expedition
    // deliberately invokes its ordinary pagehide save; that is a separate
    // last-writer policy and must not overwrite this caller's compatibility
    // fixture merely as test cleanup between assertions.
    await loaded(peer,A);await verifyClientBytes(peer,A);
    await verifyClientBytes(page,B);await resume(page,oldSave);await cachesComplete(page);
  });
  await check('B progresses the imported save through unchanged production rules and saves/reopens it',async()=>{
    await page.locator('#close-dialog').tap();
    report.newProgress=await page.evaluate(async()=>{const sim=await import('/src/simulation.js'),vertical=await import('/src/vertical-city.js'),{state:s,scene}=window.__colossus;s.paused=false;for(let i=0;i<32;i++)sim.tick(s,.25);const slot=vertical.nextVerticalSlot(s.buildings,s.rings),built=sim.build(s,'housing',slot);if(!built.ok)throw Error(built.message);for(let i=0;i<28;i++)sim.tick(s,.25);s.paused=true;scene.update(s,0,null);window.__colossus.advance(0);return{slot,built,layout:vertical.createVerticalLayout(s.buildings,s.towerOrder,s.variant)};});
    newSave=await save();assert.equal(newSave.buildings[report.fixture.second].remaining,0);assert.equal(newSave.buildings[report.newProgress.slot].type,'housing');assert.deepEqual(newSave.towerOrder.slice(0,oldSave.towerOrder.length),oldSave.towerOrder);
    await fs.writeFile(path.join(output,'isolated-new-save.json'),JSON.stringify(newSave,null,2)+'\n');await page.reload({waitUntil:'domcontentloaded'});await loaded(page,B);await resume(page,newSave);newSave=await save();
  });
  await check('Complete B reopens offline with its new visuals and compatible saved progress',async()=>{
    await page.close();offline=true;await server.close();await context.setOffline(true);const requests=server.requests.length;page=await open(B);await resume(page,newSave);await verifyClientBytes(page,B);await installed(page,B);assert.equal(server.requests.length,requests);await page.screenshot({path:path.join(output,'offline-B.png')});
  });
  await check('Rollback to preserved A uses the same update protocol and keeps B-created progress',async()=>{
    server.select('A');await server.resume();await context.setOffline(false);offline=false;
    newSave=await save();await panel();newSave=await updateTo(A);await verifyClientBytes(page,A);await resume(page,newSave);await cachesComplete(page);await page.screenshot({path:path.join(output,'rollback-A.png')});
  });
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.remoteRequests,[]);
  for(const [label,release]of [['A',A],['B',B]])assert.equal((await verifyRuntime(release.root)).artifactSha256,report.releases[label].artifactSha256,'Packaged bytes changed during browser gate.');
  report.passed=true;
}catch(error){report.failure={phase,message:error.stack};process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.png'),timeout:10000}).catch(()=>{});}
finally{
  report.finishedAt=new Date().toISOString();await write();
  const cleanup=[];for(const[name,callback]of [['context',()=>context?.close()],['browser',()=>browser?.close()],['loopback-server',()=>server.close()]]){try{await callback();cleanup.push({name,ok:true});}catch(error){cleanup.push({name,ok:false,message:error.message});report.passed=false;process.exitCode=1;}}
  report.cleanup=cleanup;await write();
}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failure:report.failure,report:path.join(output,'results.json')},null,2));
