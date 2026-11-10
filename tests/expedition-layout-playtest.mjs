import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {createGame, serialize, SAVE_KEY} from '../src/simulation.js';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';

const root=process.cwd(),base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4230/');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/nov10-improvements/expedition/layout-01');
assert.ok(['localhost','127.0.0.1'].includes(base.hostname)&&!['4178','4214'].includes(base.port));
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
async function fingerprint(){
  const files=[...new Set([...git('ls-files','src','assets','vendor','index.html','package.json','package-lock.json').split('\n'),...git('ls-files','--others','--exclude-standard','src','assets','vendor').split('\n')])].filter(Boolean).sort();
  const hashes={};for(const file of files)hashes[file]=sha(await fs.readFile(path.join(root,file)));
  return {commit:git('rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
const fixture=serialize(createGame('kaiju','cyborg'));
const report={startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),cwd:root,environment:{GAME_TEST_URL:base.href,OUTPUT_DIR:out}},toolSha256:sha(await fs.readFile(new URL(import.meta.url))),profile:{viewport:{width:1440,height:600},deviceScaleFactor:1,isMobile:false,hasTouch:false},method:'Isolated save fixture, native Continue, Space keys and resource button click. Production source served unchanged. No owner saves or runtime state writes.',fixtureSha256:sha(fixture),sourceBefore:await fingerprint(),errors:[],warnings:[],failedRequests:[],servedHashes:{},actions:[],passed:false};
let browser,page;const pending=[];
try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});report.browser=browser.version();
  const context=await browser.newContext({...report.profile,serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(15000);
  await context.addInitScript(({raw,key})=>{localStorage.setItem(key,raw);localStorage.setItem('colossus-quality-v1','performance');localStorage.setItem('colossus-camera-mode','steady');},{raw:fixture,key:SAVE_KEY});
  page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(['error','warning'].includes(message.type()))report.warnings.push(message.text());});
  page.on('requestfailed',request=>report.failedRequests.push({url:request.url(),error:request.failure()}));
  page.on('response',response=>{const url=new URL(response.url()),file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));if(['index.html','src/main.js','src/remake-ui.css'].includes(file))pending.push(response.body().then(body=>{report.servedHashes[file]=sha(body);assert.equal(report.servedHashes[file],report.sourceBefore.hashes[file]);}));});
  const until=(predicate,arg)=>waitForBrowserCondition(page,predicate,arg,{timeoutMs:60000,pollingMs:100});
  await page.goto(new URL('?test=expedition-layout',base).href,{waitUntil:'domcontentloaded'});
  await until(()=>!!window.__colossus&&document.querySelector('#loading').classList.contains('hidden'));
  await page.locator('#continue').click();await until(()=>!document.querySelector('#hud').classList.contains('hidden'));
  for(const selector of ['#district-overview','#objective']){
    await page.locator(`${selector} summary`).focus();
    await page.keyboard.press('Space');await until(selector=>document.querySelector(selector).open,selector);
    await page.keyboard.press('Space');await until(selector=>!document.querySelector(selector).open,selector);
    report.actions.push({kind:'native-space-opens-and-closes-summary',selector});
  }
  await page.locator('#destinations-toggle').click();
  assert.equal(await page.locator('#destination-list button').count(),6);
  const last=page.locator('#destination-list button').last();await last.scrollIntoViewIfNeeded();
  report.layout=await last.evaluate(element=>{const r=element.getBoundingClientRect(),stack=element.closest('.right-stack'),center=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {button:{x:r.x,y:r.y,width:r.width,height:r.height},scrollTop:stack.scrollTop,clientHeight:stack.clientHeight,scrollHeight:stack.scrollHeight,overflow:getComputedStyle(stack).overflowY,clickable:element.contains(center),viewportHeight:innerHeight,pageOverflow:document.documentElement.scrollWidth>innerWidth+1};});
  assert.equal(report.layout.overflow,'auto');assert.ok(report.layout.scrollTop>0);assert.ok(report.layout.scrollHeight>report.layout.clientHeight);
  assert.ok(report.layout.button.y>=0&&report.layout.button.y+report.layout.button.height<=600);assert.equal(report.layout.clickable,true);assert.equal(report.layout.pageOverflow,false);
  await last.click();await until(()=>!!window.__colossus.state.target);
  report.actions.push({kind:'last-of-six-resource-buttons-visible-and-orders-course',resourceId:await last.getAttribute('data-resource-id')});
  const image=await page.screenshot({path:path.join(out,'short-desktop-destinations.png'),fullPage:false});report.screenshot={file:'short-desktop-destinations.png',bytes:image.length,sha256:sha(image)};
  await Promise.all(pending);assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);
  report.sourceAfter=await fingerprint();assert.equal(report.sourceAfter.fingerprint,report.sourceBefore.fingerprint);report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};if(page&&!page.isClosed())try{await page.screenshot({path:path.join(out,'failure.png'),fullPage:false});}catch{}process.exitCode=1;
}finally{if(browser)await browser.close();report.finishedAt=new Date().toISOString();report.exitCode=report.passed?0:1;await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,passed:report.passed,actions:report.actions,error:report.error},null,2));}
