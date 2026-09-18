// Focused regression checks in a fresh browser profile. Run serially with other
// renderer checks: GAME_TEST_URL=http://127.0.0.1:4178 node tests/alpha-ui-browser.mjs
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4178');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'Use a local game server.');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/alpha1-ui');
await fs.mkdir(out,{recursive:true});
const report={checks:[],errors:[],remote:[]};
const browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width:1440,height:960}});
const page=await context.newPage();
page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();
  report.remote.push(url.href);return route.abort();
});
// Keep the real game's frame callback, but advance it in bounded steps. This
// makes held-key tests deterministic and avoids a continuous GPU render loop.
await page.addInitScript(()=>{
  window.requestAnimationFrame=callback=>{window.__alphaFrame=callback;return 1;};
  window.__alphaFrames=count=>{
    for(let i=0;i<count;i++){
      window.__alphaNow=Math.max(window.__alphaNow||0,performance.now())+1000/60;
      const callback=window.__alphaFrame;window.__alphaFrame=null;callback?.(window.__alphaNow);
    }
  };
});
const step=(count=1)=>page.evaluate(count=>window.__alphaFrames(count),count);
try{
  await page.goto(new URL('/?test=1',base).href);
  await page.waitForFunction(()=>!!window.__colossus,null,{timeout:90000});
  await page.locator('#begin').click();await step();
  await page.locator('#save').click();
  const originalSave=await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1'));
  await page.locator('[data-building="sawmill"]').click();
  await page.locator('[data-slot="0"]').click();
  await page.locator('#menu').click();
  const unsaved=await page.evaluate(()=>window.__colossus.snapshot());
  await page.evaluate(()=>{
    window.__alphaSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key==='colossus-wake-save-v1')throw new DOMException('Simulated full storage','QuotaExceededError');
      return window.__alphaSetItem.call(this,key,value);
    };
  });
  await page.locator('[data-dialog-action="title"]').click();
  assert.equal(await page.locator('#dialog').evaluate(dialog=>dialog.open),true);
  assert.deepEqual(await page.evaluate(()=>window.__colossus.snapshot()),unsaved);
  assert.equal(await page.evaluate(()=>localStorage.getItem('colossus-wake-save-v1')),originalSave);
  assert.match(await page.locator('#toast').textContent(),/storage is unavailable/);
  report.checks.push('Failed Save & return keeps the current expedition, original save and recovery menu.');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__alphaSetItem;delete window.__alphaSetItem;});
  await page.locator('[data-dialog-action="title"]').click();
  assert.equal(await page.locator('#intro').isVisible(),true);
  await page.locator('#continue').click();await step();
  assert.equal(await page.evaluate(()=>window.__colossus.state.buildings[0].type),'sawmill');
  report.checks.push('Retrying Save & return after storage recovers persists and resumes that same expedition.');

  await page.locator('#tower-floor').selectOption('0');
  await page.locator('#tower-floor').focus();
  const before=await page.evaluate(()=>({x:window.__colossus.state.x,z:window.__colossus.state.z}));
  await page.keyboard.down('ArrowDown');await step(4);await page.keyboard.up('ArrowDown');
  assert.equal(await page.locator('#tower-floor').inputValue(),'1');
  assert.deepEqual(await page.evaluate(()=>({x:window.__colossus.state.x,z:window.__colossus.state.z})),before);
  await page.keyboard.press('p');await page.keyboard.press('2');
  assert.equal(await page.evaluate(()=>window.__colossus.state.paused),false);
  assert.equal(await page.evaluate(()=>window.__colossus.scene.view),'people');
  report.checks.push('Focused storey selector accepts arrow navigation without moving, pausing or changing camera via shortcuts.');
  await page.locator('#world').focus();
  await page.keyboard.down('ArrowUp');await step(4);await page.keyboard.up('ArrowUp');
  assert.ok(await page.evaluate(before=>Math.hypot(window.__colossus.state.x-before.x,window.__colossus.state.z-before.z)>.1,before));
  report.checks.push('Arrow-key movement still works when the game canvas has focus.');

  async function finishBattle(result){
    await page.evaluate(async result=>{
      const {startBattle,tick,fire}=await import('/src/simulation.js');
      const state=window.__colossus.state,rival=state.enemies.find(enemy=>!enemy.defeated);
      state.x=rival.x;state.z=rival.z;
      if(!startBattle(state,rival.id))throw new Error('Could not start result fixture.');
      state.battle.player={x:0,z:0,angle:0};state.battle.enemy={x:0,z:20,angle:Math.PI};
      state.battle.autoFire=false;
      if(result==='victory'){state.battle.enemyHp=1;state.battle.enemyReload=999;if(!fire(state))throw new Error('Could not fire victory fixture.');}
      else{state.hp=1;state.battle.enemyReload=0;}
      for(let i=0;i<40&&!state.battle.result;i++)tick(state,.1);
      if(state.battle.result!==result)throw new Error('Unexpected battle result.');
      window.__colossus.advance(1);
    },result);
    assert.equal(await page.locator('#dialog').evaluate(dialog=>dialog.open),true);
    assert.equal(await page.locator('#close-dialog').isVisible(),false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#dialog').evaluate(dialog=>dialog.open),true);
    await page.evaluate(()=>document.getElementById('close-dialog').click());
    assert.equal(await page.locator('#dialog').evaluate(dialog=>dialog.open),true);
  }
  await finishBattle('victory');
  await page.locator('[data-dialog-action="return"]').click();
  assert.equal(await page.locator('#dialog').evaluate(dialog=>dialog.open),false);
  assert.equal(await page.evaluate(()=>window.__colossus.state.mode),'expedition');
  assert.equal(await page.evaluate(()=>window.__colossus.state.paused),false);
  report.checks.push('Victory stays actionable after Escape or a stale close click; Return resumes the expedition.');
  await finishBattle('defeat');
  await page.locator('[data-dialog-action="restart"]').click();
  assert.equal(await page.locator('#dialog').evaluate(dialog=>dialog.open),false);
  assert.equal(await page.evaluate(()=>window.__colossus.state.mode),'expedition');
  assert.ok(await page.evaluate(()=>window.__colossus.state.hp>0));
  assert.equal(await page.evaluate(()=>window.__colossus.state.paused),false);
  await page.locator('#menu').click();assert.equal(await page.locator('#close-dialog').isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#dialog').evaluate(dialog=>dialog.open),false);
  report.checks.push('Defeat keeps Restart reachable, starts a healthy expedition, and ordinary menus still dismiss normally.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
  console.log(JSON.stringify(report,null,2));
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(JSON.stringify(report,null,2));}
finally{await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));await browser.close();}
