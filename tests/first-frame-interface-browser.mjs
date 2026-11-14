// The title must not be swapped for the game's interface before the new
// game has been drawn (review finding N04-E3). Frames are stepped by hand so
// the gap between starting a game and its first frame can be observed.
// Usage: GAME_TEST_URL=http://127.0.0.1:4188 node tests/first-frame-interface-browser.mjs
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createGame,serialize,SAVE_KEY} from '../src/simulation.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4188'),report={checks:[],errors:[]};
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});
try{
  for(const [label,start]of[['Begin','#begin'],['Continue','#continue']]){
    const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
    await page.addInitScript(({key,raw,stored})=>{
      if(stored)localStorage.setItem(key,raw);
      window.requestAnimationFrame=callback=>{window.__frame=callback;return 1;};
      window.__frames=count=>{for(let i=0;i<count;i++){window.__now=Math.max(window.__now||0,performance.now())+1000/60;const callback=window.__frame;window.__frame=null;callback?.(window.__now);}};
    },{key:SAVE_KEY,raw:serialize(createGame('kaiju','flesh')),stored:label==='Continue'});
    await page.goto(new URL('/?test=1',base).href);await page.waitForFunction(()=>!!window.__colossus,null,{timeout:120000,polling:100});
    await page.evaluate(()=>window.__frames(2));
    const look=()=>page.evaluate(()=>({hud:!document.querySelector('#hud').classList.contains('hidden'),title:!document.querySelector('#intro').classList.contains('hidden'),frames:window.__colossus.scene.framesSinceGame,rendered:window.__colossus.scene.city.variant,state:window.__colossus.state.variant,preview:window.__colossus.scene.preview}));
    // The title previews the cyborg; the game being started carries the beast.
    assert.equal((await look()).rendered,'cyborg');
    if(label==='Begin')await page.locator('[data-variant="flesh"]').click();
    await page.evaluate(()=>window.__frames(1));await page.locator(start).click();
    const before=await look();
    assert.deepEqual(before,{hud:false,title:true,frames:0,rendered:'flesh',state:'flesh',preview:false},label+': nothing of the new game is drawn yet, so its interface stays hidden');
    await page.evaluate(()=>window.__frames(1));
    const after=await look();
    assert.deepEqual(after,{hud:true,title:false,frames:1,rendered:'flesh',state:'flesh',preview:false},label+': the interface arrives with the first drawn frame');
    report.checks.push(label+' keeps the title until the new game is drawn, then presents its interface.');await context.close();
  }
  assert.deepEqual(report.errors,[]);
}catch(error){report.failure=String(error?.stack??error);}
finally{await browser.close();console.log(JSON.stringify(report,null,2));if(report.failure)process.exitCode=1;}
