// One actual candidate UI save reopened by the frozen old browser build.
// Uses only fresh isolated storage, native Continue/RAF and observation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const baselineRoot=await fs.realpath(process.env.BASELINE_ROOT||'C:\\Users\\user\\.codex\\worktrees\\ground-dressing-release\\Kiju Game');
const base=new URL(process.env.BASELINE_URL||'http://127.0.0.1:4217/');
const input=path.resolve(process.env.CANDIDATE_LIFECYCLE_REPORT||'artifacts/carrier-assets/lifecycle-final-4/report.json');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/carrier-assets/rollback-final-4');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(directory,...args)=>execFileSync('git',args,{cwd:directory,encoding:'utf8'}).trim();
async function source(directory){const names=[...new Set((git(directory,'ls-files','src','assets','vendor','index.html','package.json','package-lock.json')+'\n'+git(directory,'ls-files','--others','--exclude-standard','src','assets','vendor')).split('\n').filter(Boolean))].sort();const hashes={};for(const file of names)hashes[file]=sha(await fs.readFile(path.join(directory,file)));return{root:directory,commit:git(directory,'rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};}
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0,'Do not overwrite rollback evidence.');
const bytes=await fs.readFile(input),lifecycle=JSON.parse(bytes);assert.equal(lifecycle.passed,true);assert.equal(lifecycle.sourceStable,true);
const recorded=lifecycle.snapshots.find(snapshot=>snapshot.savedRaw&&JSON.parse(snapshot.savedRaw).worldDamage?.expedition?.length>0);assert.ok(recorded,'Actual candidate UI save with destruction is required.');
const saved=JSON.parse(recorded.savedRaw);assert.equal(saved.mode,'expedition');
const report={startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),environment:{BASELINE_ROOT:baselineRoot,BASELINE_URL:base.href,CANDIDATE_LIFECYCLE_REPORT:input,OUTPUT_DIR:out}},
 tool:{file:'tests/carrier-assets-rollback-browser.mjs',sha256:sha(await fs.readFile(fileURLToPath(import.meta.url)))},sourceStart:await source(root),baselineSourceStart:await source(baselineRoot),
 candidateSave:{report:input,reportSha256:sha(bytes),snapshotLabel:recorded.label,saveSha256:sha(recorded.savedRaw),raw:recorded.savedRaw,sourceFingerprint:lifecycle.sourceStart.fingerprint},
 method:'Reopen one actual final candidate UI-written expedition with nonempty saved destruction in a fresh old-build Chrome context. Native Continue click snapshot before the next frame proves exact deserialize normalization; ordinary frames apply saved scenery damage. No user storage, simulation advance, pause, runtime state edit, or renderer substitution.',
 limitations:['One actual candidate-to-baseline browser rollback, not all saves or installed-update rollback.','Desktop Chrome/ANGLE D3D11, not physical Apple/Safari or a performance benchmark.'],checks:[],errors:[],failedRequests:[],remote:[],passed:false};
let browser,context,page;
try{
 assert.equal(report.sourceStart.fingerprint,lifecycle.sourceStart.fingerprint,'Current candidate differs from the source that wrote this save.');
 assert.equal(report.baselineSourceStart.fingerprint,'dee57c47ba1f50d5f9c4c217b7802fd788721ff9b36aa259aecde4752654a760');
 const health=await(await fetch(new URL('/health',base))).json();assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,sha(baselineRoot.replaceAll('\\','/').toLowerCase()));report.server=health;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});report.browser={version:browser.version(),channel:'chrome',headless:true};
 context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,serviceWorkers:'block'});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();report.remote.push(url.href);return route.abort();});
 await context.addInitScript(raw=>{localStorage.setItem('colossus-wake-save-v1',raw);localStorage.setItem('colossus-quality-v1','high');window.addEventListener('click',event=>{if(event.target.closest('button')?.id==='continue')window.__rollbackClickState=window.__colossus.snapshot();});},recorded.savedRaw);
 page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});page.on('requestfailed',request=>report.failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
 await page.goto(new URL('?test=1',base).href,{waitUntil:'domcontentloaded'});await waitForBrowserCondition(page,()=>!!window.__colossus&&window.__colossus.scene.environmentReady);
 assert.match(await page.title(),/Colossus Wake/i);assert.equal(await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1')),recorded.savedRaw);
 report.worldBefore=await page.evaluate(()=>{const g=window.__colossus.scene;window.__rollbackWorldMatrices=new Map();g.world.traverse(mesh=>{if(mesh.isInstancedMesh&&mesh.count>0)window.__rollbackWorldMatrices.set(mesh.uuid,new Float32Array(mesh.instanceMatrix.array));});return{id:g.world.uuid,destroyedCount:g.landscape.stats.destroyedCount,staticMeshes:window.__rollbackWorldMatrices.size};});assert.equal(report.worldBefore.destroyedCount,0);
 await page.locator('#continue').click();report.resumed=await page.evaluate(()=>window.__rollbackClickState);
 assert.deepEqual(report.resumed,{...saved,paused:false,speed:1},'Old build changed candidate save beyond established Continue pause/speed normalization');report.checks.push('Actual old-build Continue recovered exact candidate save at click boundary, with only established pause/speed normalization.');
 await waitForBrowserCondition(page,expected=>window.__colossus.scene.landscape.stats.destroyedCount===expected,saved.worldDamage.expedition.length);
 report.world=await page.evaluate(ids=>{const g=window.__colossus.scene,hidden=[];g.world.traverse(mesh=>{const prior=window.__rollbackWorldMatrices.get(mesh.uuid);if(!prior)return;for(let i=0;i<mesh.count;i++)if(prior[i*16+13]!==-5000&&mesh.instanceMatrix.array[i*16+13]===-5000)hidden.push({mesh:mesh.name,uuid:mesh.uuid,index:i});});return{id:g.world.uuid,state:window.__colossus.snapshot(),savedRaw:localStorage.getItem('colossus-wake-save-v1'),render:{...g.renderer.info.render},destroyedCount:g.landscape.stats.destroyedCount,poolDraw:{...g.landscape.stats.poolDraw},hiddenStaticInstances:hidden,owners:ids.map(id=>g.landscape.crushables.find(record=>record.id===id)??{id,missing:true})};},saved.worldDamage.expedition);
 assert.deepEqual(report.world.state.worldDamage,saved.worldDamage);assert.equal(report.world.savedRaw,recorded.savedRaw);assert.equal(report.world.destroyedCount,saved.worldDamage.expedition.length);
 assert.equal(report.world.id,report.worldBefore.id);assert.ok(report.world.owners.every(owner=>!owner.missing),'Old build lacks a saved scenery identity');assert.ok(report.world.hiddenStaticInstances.length>0,'Actual old-build scenery did not change to hidden destruction matrices');assert.ok(report.world.poolDraw.activeInstances>0&&report.world.render.calls>0);
 report.checks.push('All saved damage IDs remain present and applied with the matching destroyed count; actual previously visible scenery instances become hidden and debris renders. Saved bytes remain intact. Public inventory does not expose per-owner part ranges, so no per-owner geometry claim is made here.');
 await page.screenshot({path:path.join(out,'baseline-reopened-candidate-save.png')});assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);assert.deepEqual(report.remote,[]);report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{await context?.close();await browser?.close();report.cleanup={ownedBrowserClosed:true};report.sourceFinish=await source(root);report.baselineSourceFinish=await source(baselineRoot);report.sourceStable=report.sourceStart.fingerprint===report.sourceFinish.fingerprint&&report.baselineSourceStart.fingerprint===report.baselineSourceFinish.fingerprint;if(!report.sourceStable){report.passed=false;process.exitCode=1;}report.finishedAt=new Date().toISOString();report.exitCode=process.exitCode||0;await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,exitCode:report.exitCode,sourceStable:report.sourceStable,report:path.join(out,'report.json'),failure:report.failure},null,2));}
