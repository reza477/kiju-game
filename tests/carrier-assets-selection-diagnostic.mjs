// Read-only game diagnosis through normal UI in two fresh isolated contexts.
// A completed reproduction is evidence of an existing defect, not a release pass.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(directory,...args)=>execFileSync('git',args,{cwd:directory,encoding:'utf8'}).trim();
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/carrier-assets/selection-diagnostic-final-4');
const plan=[{label:'baseline',root:await fs.realpath(process.env.BASELINE_ROOT||'C:\\Users\\user\\.codex\\worktrees\\ground-dressing-release\\Kiju Game'),url:process.env.BASELINE_URL||'http://127.0.0.1:4217/',expected:'dee57c47ba1f50d5f9c4c217b7802fd788721ff9b36aa259aecde4752654a760'},
 {label:'candidate',root:await fs.realpath(root),url:process.env.GAME_TEST_URL||'http://127.0.0.1:4214/',expected:process.env.EXPECTED_SOURCE_FINGERPRINT||'6ac806e4bff7b94951cdd36ab8dc14b09cbec7772cc3daa24960da1042d9fffd'}];
async function source(directory){const files=[...new Set((git(directory,'ls-files','src','assets','vendor','index.html','package.json','package-lock.json')+'\n'+git(directory,'ls-files','--others','--exclude-standard','src','assets','vendor')).split('\n').filter(Boolean))].sort(),hashes={};for(const file of files)hashes[file]=sha(await fs.readFile(path.join(directory,file)));return{root:directory,commit:git(directory,'rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};}
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0,'Fresh diagnostic directory required.');
const report={startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),cwd:root},toolSha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),plan,visits:[],diagnosticCompleted:false,productCheckPassed:null,
 method:'Actual fresh Begin flesh; select Sky Lantern Court through minimap; Menu / Save and return to title; choose cyborg; Begin new expedition through confirmation. No fixture, runtime mutation, simulation advance or timing replacement. Repeat on old and candidate source.',
 limitations:['This minimal probe tests stale selected-rival DOM across a new expedition. It does not repeat the critic combat-victory sequence or create a defeated rival.','Desktop Chrome only; not performance, installed update, physical Apple or a release pass.']};
let browser,context;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});report.browser=browser.version();
 for(const item of plan){
  const visit={label:item.label,startedAt:new Date().toISOString(),sourceStart:await source(item.root),errors:[],remote:[],failedRequests:[],closed:false};report.visits.push(visit);assert.equal(visit.sourceStart.fingerprint,item.expected);
  const base=new URL(item.url),health=await(await fetch(new URL('/health',base))).json();assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,sha(item.root.replaceAll('\\','/').toLowerCase()));visit.server=health;
  context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,serviceWorkers:'block'});
  try{
   await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();visit.remote.push(url.href);return route.abort();});
   const page=await context.newPage();page.on('pageerror',error=>visit.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')visit.errors.push(message.text());});page.on('requestfailed',request=>visit.failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
   await page.goto(new URL('?test=1',base).href,{waitUntil:'domcontentloaded'});await waitForBrowserCondition(page,()=>!!window.__colossus&&window.__colossus.scene.environmentReady);assert.match(await page.title(),/Colossus Wake/i);
   await page.locator('[data-faction="kaiju"]').click();await page.locator('[data-variant="flesh"]').click();await page.locator('#begin').click();
   await waitForBrowserCondition(page,()=>window.__colossus.state.variant==='flesh'&&!document.getElementById('hud').classList.contains('hidden'));
   const target=await page.evaluate(()=>window.__colossus.state.enemies.find(enemy=>enemy.variant==='vertical'));assert.ok(target&&!target.defeated);visit.target=target;
   const map=await page.locator('#minimap').boundingBox();assert.ok(map);await page.mouse.click(map.x+(target.x+180)/360*map.width,map.y+(target.z+180)/360*map.height);
   await waitForBrowserCondition(page,name=>document.querySelector('#selection h3')?.textContent===name,target.name);
   visit.before=await page.evaluate(()=>({state:window.__colossus.snapshot(),html:document.getElementById('selection').innerHTML,text:document.getElementById('selection').textContent}));
   await page.locator('#menu').click();await page.locator('[data-dialog-action="title"]').click();await page.locator('#continue').waitFor({state:'visible'});
   await page.locator('[data-faction="kaiju"]').click();await page.locator('[data-variant="cyborg"]').click();await page.locator('#begin').click();await page.locator('[data-dialog-action="restart"]').click();
   await waitForBrowserCondition(page,()=>window.__colossus.state.variant==='cyborg'&&!document.getElementById('hud').classList.contains('hidden'));
   visit.after=await page.evaluate(()=>({state:window.__colossus.snapshot(),html:document.getElementById('selection').innerHTML,text:document.getElementById('selection').textContent,visible:document.getElementById('selection').checkVisibility()}));
   assert.equal(visit.after.state.variant,'cyborg');assert.equal(visit.after.state.day,1);assert.equal(visit.after.state.resources.wood,160);assert.equal(visit.after.state.resources.iron,135);assert.ok(visit.after.state.time<5);assert.equal(visit.after.state.stats.built,0);assert.equal(visit.after.state.stats.victories,0);
   visit.stalePanelReproduced=visit.after.visible&&visit.after.html===visit.before.html&&visit.after.text.includes(target.name);visit.productCheckPassed=!visit.stalePanelReproduced;
   await page.screenshot({path:path.join(out,item.label+'-fresh-expedition-stale-panel.png')});assert.deepEqual(visit.errors,[]);assert.deepEqual(visit.remote,[]);assert.deepEqual(visit.failedRequests,[]);
  }finally{await context.close();context=null;visit.closed=true;visit.finishedAt=new Date().toISOString();visit.sourceFinish=await source(item.root);assert.equal(visit.sourceStart.fingerprint,visit.sourceFinish.fingerprint);}
 }
 report.reproducedBoth=report.visits.every(visit=>visit.stalePanelReproduced);report.diagnosticCompleted=true;report.productCheckPassed=report.visits.every(visit=>visit.productCheckPassed);
 report.conclusion=report.reproducedBoth?'Same stale-rival panel reproduced in old and candidate builds through identical normal UI. Existing new-expedition DOM reset defect confirmed; no repair made.':'Paired results differ or do not reproduce; no pre-existing-defect conclusion established by this run.';
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{await context?.close();await browser?.close();report.cleanup={ownedBrowserClosed:true};report.finishedAt=new Date().toISOString();report.exitCode=process.exitCode||0;await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({diagnosticCompleted:report.diagnosticCompleted,productCheckPassed:report.productCheckPassed,reproducedBoth:report.reproducedBoth,exitCode:report.exitCode,report:path.join(out,'report.json'),failure:report.failure},null,2));}
