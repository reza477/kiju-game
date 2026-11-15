// Repeatable pictures of fixed moments in the game, for before/after comparison
// of rendering changes. Time, frame stepping and random numbers are all under
// the script's control, so the same code draws the same pixels on the same
// machine; compare two runs with tests/visual-reference-compare.mjs.
//
// Usage: GAME_TEST_URL=http://127.0.0.1:4188 OUTPUT_DIR=artifacts/visual/name node tests/visual-reference-capture.mjs [scenes]
//   scenes  comma list from the SCENES table below (default: all)
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4188'),out=path.resolve(process.env.OUTPUT_DIR||'artifacts/visual/latest');
await fs.mkdir(out,{recursive:true});
// name: [faction, variant, view, light, details]
const SCENES={
  'title':[null,null,'title','day',['high']],
  'beast-city':['kaiju','flesh','city','day',['high','balanced','performance']],
  'beast-titan':['kaiju','flesh','carrier','day',['high']],
  'beast-streets':['kaiju','flesh','people','day',['high']],
  'beast-walking':['kaiju','flesh','walking','day',['high']],
  'beast-strike':['kaiju','flesh','strike','day',['high']],
  'cyborg-city':['kaiju','cyborg','city','day',['high','balanced']],
  'crawler-city':['crawler','standard','city','day',['high','balanced','performance']],
  'crawler-world':['crawler','standard','world','day',['high']],
  'crawler-dusk':['crawler','standard','city','dusk',['high']],
  'crawler-night':['crawler','standard','city','night',['high','balanced','performance']],
  'airship-city':['airship','horizontal','city','day',['high']],
};
const wanted=(process.argv[2]?process.argv[2].split(','):Object.keys(SCENES));
for(const name of wanted)if(!SCENES[name])throw new Error('Unknown scene '+name);
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});
const report={base:base.href,startedAt:new Date().toISOString(),viewport:[960,600],scale:2,captures:[],errors:[]};
try{
  for(const name of wanted){
    const [faction,variant,view,light,details]=SCENES[name];
    const context=await browser.newContext({viewport:{width:960,height:600},deviceScaleFactor:2}),page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(name+': '+error.message));page.on('console',message=>{if(message.type()==='error'&&!/favicon/.test(message.text()))report.errors.push(name+': '+message.text());});
    await page.addInitScript(()=>{
      // One clock for everything: frames advance it by exactly 1/60 s.
      let clock=1000,seed=0x2f6e2b1;
      const random=()=>{seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
      Math.random=random;performance.now=()=>clock;const realDate=Date.now();Date.now=()=>realDate-performance.timeOrigin+clock;
      window.requestAnimationFrame=callback=>{window.__referenceFrame=callback;return 1;};
      window.__step=count=>{for(let i=0;i<count;i++){clock+=1000/60;const callback=window.__referenceFrame;window.__referenceFrame=null;callback?.(clock);}};
    });
    await page.goto(new URL('/?test=1',base).href);
    // A slow machine that has just drawn several hundred heavy frames can take minutes to start the next page.
    await page.waitForFunction(()=>!!window.__colossus&&document.querySelector('#loading').classList.contains('hidden'),null,{timeout:600000,polling:100});
    const step=count=>page.evaluate(count=>window.__step(count),count);
    // Let asynchronous texture uploads and shader compiles finish between bursts of frames.
    const settle=async(bursts=6)=>{for(let i=0;i<bursts;i++){await step(10);await page.waitForTimeout(250);}await page.waitForFunction(()=>{const scene=window.__colossus.scene;return scene.environmentReady!==false&&(!scene.surfaceDiagnostics||scene.surfaceDiagnostics().pending===0);},null,{timeout:120000,polling:100}).catch(()=>{});await step(4);};
    await settle();
    if(faction){
      await page.locator(`[data-faction="${faction}"]`).click();await step(2);await page.locator(`[data-variant="${variant}"]`).click();await step(2);
      await page.locator('#begin').click();await step(3);
      await page.evaluate(({view,light})=>{
        const {scene,state}=window.__colossus;scene.setCameraMode('steady');scene.setLighting(light);
        if(['city','world','carrier','people'].includes(view))document.querySelector(`[data-view="${view}"]`).click();
      },{view,light});
      if(view==='walking'){await page.keyboard.down('w');await step(150);}
      if(view==='strike')await page.evaluate(async()=>{
        const sim=await import('/src/simulation.js'),{state}=window.__colossus,rival=state.enemies.find(enemy=>enemy.variant==='standard');
        sim.travel(state,rival.x,rival.z);for(let i=0;i<4000&&sim.distance(state,rival)>=35;i++)sim.tick(state,.25);
        if(!sim.startBattle(state,rival.id))throw new Error('Battle did not start');
        const battle=state.battle,reach=sim.meleeReach('kaiju',battle.enemyFaction,'flesh',battle.enemyVariant),gap=()=>Math.hypot(battle.player.x-battle.enemy.x,battle.player.z-battle.enemy.z);
        battle.autoFire=false;battle.command='approach';for(let n=0;n<4000&&gap()>reach-.5;n++)sim.tick(state,.05,{x:0,z:0});battle.command='hold';
        for(let n=0;n<40;n++)sim.tick(state,.05,{x:0,z:0});if(!sim.fire(state))throw new Error('Strike did not fire');
        for(let n=0;n<70;n++)sim.tick(state,.01,{x:0,z:0});state.paused=true;
      });
      await settle(view==='strike'?8:6);
      if(view==='walking')await page.keyboard.up('w');
    }
    // Only the 3D canvas is compared. The page's vignette is a CSS gradient
    // whose rasterisation flips about 5% of pixels by one level between runs.
    await page.addStyleTag({content:'#hud,#markers,#toast,#intro,#faction-select,.vignette{visibility:hidden!important}'});
    for(const detail of details){
      await page.evaluate(detail=>{window.__colossus.scene.setQuality(detail,{persist:false});},detail);
      // Lighting eases towards its preset by a fixed share each frame, and the
      // environment map arrives when it arrives. Run long enough that neither
      // leaves a trace: 300 frames reduce any remainder below one part in 1e8.
      await settle(5);
      if(!['walking','strike'].includes(view))await step(300);
      // Freeze the simulation for the picture itself; two frames, same clock state.
      // Stepped frames are issued faster than a slow graphics chip draws them. Wait for it to catch
      // up, or the screenshot queues behind several hundred frames and times out.
      const info=await page.evaluate(()=>{const {scene,state}=window.__colossus;const was=state.paused;state.paused=true;window.__step(2);state.paused=was;scene.renderer.getContext().finish();const render=scene.renderer.info.render;return{time:+state.time.toFixed(4),calls:render.calls,triangles:render.triangles,quality:scene.quality,view:scene.view,light:scene.light,canvas:[scene.renderer.domElement.width,scene.renderer.domElement.height]};});
      const file=`${name}-${detail}.png`;await page.screenshot({path:path.join(out,file),timeout:180000});
      report.captures.push({file,scene:name,detail,...info});
    }
    await context.close();
  }
}catch(error){report.failure=String(error?.stack??error);}
finally{await browser.close();report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,1)+'\n');
  console.log(JSON.stringify({output:out,captures:report.captures.map(c=>[c.file,c.calls,c.triangles,c.time]),errors:report.errors,failure:report.failure??null},null,1));if(report.failure)process.exitCode=1;}
