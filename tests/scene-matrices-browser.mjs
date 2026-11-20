// The scene derives its own matrices before it renders and leaves out rivals
// that are not drawn or that nothing has moved (GameScene.deriveMatrices).
// This plays an expedition, a turn of the camera, a pause, the world view and
// a battle, and on every frame compares each matrix the renderer is about to
// use with the one three.js would have derived for the whole scene. The
// reference is computed and then put back, so a stale matrix cannot be healed
// by the check itself and go unnoticed on a later frame.
// Usage: GAME_TEST_URL=http://127.0.0.1:4188 node tests/scene-matrices-browser.mjs [variant ...]
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4188'),report={checks:[],errors:[]};
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});
try{
  const variants=process.argv.slice(2).length?process.argv.slice(2):['drill','flesh'],factions={flesh:'kaiju',cyborg:'kaiju',standard:'crawler',drill:'crawler',horizontal:'airship',vertical:'airship'};
  let page;
  const open=async()=>{
    const context=await browser.newContext({viewport:{width:1024,height:640}});page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
    await page.goto(new URL('/?test=1',base).href);await page.waitForFunction(()=>!!window.__colossus&&document.querySelector('#loading').classList.contains('hidden'),null,{timeout:400000});
    await install();
  };
  const install=()=>page.evaluate(()=>{
    const {scene}=window.__colossus,presentation=scene.presentation,render=presentation.render.bind(presentation);
    const tally=window.__matrices={frames:0,nodes:0,skippedRivalFrames:0,drawnRivalFrames:0,wrong:[]};
    const same=(a,b)=>{for(let i=0;i<16;i++)if(!Object.is(a[i],b[i]))return false;return true;};
    presentation.render=function(target){
      // What the renderer is about to use, for everything it can draw.
      const drawn=[],all=[];
      for(const child of target.children){const visible=child.visible;child.traverse(node=>{const row={node,local:node.matrix.elements.slice(),world:node.matrixWorld.elements.slice(),flag:node.matrixWorldNeedsUpdate,bind:node.isSkinnedMesh?node.bindMatrixInverse.elements.slice():null};all.push(row);if(visible)drawn.push(row);});
        const rival=scene.enemyCities.find(city=>city.root===child);if(rival){if(visible)tally.drawnRivalFrames++;else tally.skippedRivalFrames++;}}
      // The reference: three's own derivation of the whole scene.
      for(const child of target.children)child.updateMatrixWorld(true);
      for(const row of drawn){tally.nodes++;if(!same(row.world,row.node.matrixWorld.elements)||!same(row.local,row.node.matrix.elements)||(row.bind&&!same(row.bind,row.node.bindMatrixInverse.elements))){if(tally.wrong.length<12){let top=row.node;while(top.parent&&top.parent!==target)top=top.parent;tally.wrong.push({frame:tally.frames,node:row.node.name||row.node.type,under:top.name||top.type,rival:scene.enemyCities.find(city=>city.root===top)?.variant??null,mode:scene.state.mode,view:scene.view});}}}
      // Put back exactly what was there.
      for(const row of all){row.node.matrix.elements.splice(0,16,...row.local);row.node.matrixWorld.elements.splice(0,16,...row.world);row.node.matrixWorldNeedsUpdate=row.flag;if(row.bind)row.node.bindMatrixInverse.elements.splice(0,16,...row.bind);}
      tally.frames++;return render(target);
    };
  });
  const frames=count=>page.evaluate(async count=>{const {scene}=window.__colossus,start=scene.framesSinceGame;await new Promise(resolve=>{const wait=()=>scene.framesSinceGame-start>=count?resolve():requestAnimationFrame(wait);requestAnimationFrame(wait);});},count);
  const tally=()=>page.evaluate(()=>({...window.__matrices,wrong:window.__matrices.wrong.slice()}));
  const stage=async(label,before)=>{const from=await tally();if(before)await before();const now=await tally();
    assert.deepEqual(now.wrong,[],label+': every drawn matrix is the one three.js derives');
    process.stderr.write(label+'\n');report.checks.push(`${label}: ${now.nodes-from.nodes} drawn matrices over ${now.frames-from.frames} frames match three.js; rivals drawn ${now.drawnRivalFrames-from.drawnRivalFrames} times, left out ${now.skippedRivalFrames-from.skippedRivalFrames} times.`);};
  for(const variant of variants){
    const faction=factions[variant];await open();process.stderr.write(variant+' opened\n');
    await stage(variant+' title preview',()=>frames(20));
    await page.evaluate(()=>window.__colossus.scene.setQuality('balanced',{persist:false}));
    await page.locator(`[data-faction="${faction}"]`).click({timeout:120000});await page.locator(`[data-variant="${variant}"]`).click({timeout:120000});await page.locator('#begin').click({timeout:120000});
    await page.waitForFunction(()=>!document.querySelector('#hud').classList.contains('hidden'),null,{timeout:400000});
    await stage(variant+' expedition, standing',()=>frames(40));
    await stage(variant+' expedition, walking',async()=>{await page.keyboard.down('w');await frames(50);await page.keyboard.up('w');await frames(10);});
    await stage(variant+' camera turned through a full circle',async()=>{for(let step=0;step<12;step++){await page.evaluate(step=>{const {scene}=window.__colossus;scene.setCameraMode('steady');scene.yaw=step*Math.PI/6;scene.snapCamera=true;},step);await frames(6);}});
    await stage(variant+' paused, camera turning',async()=>{await page.evaluate(()=>{window.__colossus.state.paused=true;});for(let step=0;step<6;step++){await page.evaluate(step=>{const {scene}=window.__colossus;scene.yaw=step*Math.PI/3+.4;scene.snapCamera=true;},step);await frames(5);}await page.evaluate(()=>{window.__colossus.state.paused=false;});await frames(6);});
    await stage(variant+' world view',async()=>{await page.locator('[data-view="world"]').click();await frames(30);await page.locator('[data-view="city"]').click();await frames(10);});
    await stage(variant+' beside a rival',async()=>{await page.evaluate(()=>{const {scene,state}=window.__colossus,rival=state.enemies.find(e=>!e.defeated);state.x=rival.x-48;state.z=rival.z;state.target=null;scene.yaw=Math.atan2(-1,0);scene.snapCamera=true;});await frames(40);});
    await stage(variant+' battle',async()=>{
      const started=await page.evaluate(async()=>{const sim=await import('/src/simulation.js'),{state}=window.__colossus,rival=state.enemies.find(e=>!e.defeated);state.x=rival.x-30;state.z=rival.z;state.target=null;return sim.startBattle(state,rival.id);});
      assert.equal(started,true,'The battle starts');await frames(30);
      await page.locator('[data-command="approach"]').click();await frames(60);
      assert.equal(await page.evaluate(()=>window.__colossus.state.mode),'battle');
    });
    await stage(variant+' after withdrawing from the battle',async()=>{
      await page.evaluate(async()=>{const sim=await import('/src/simulation.js');sim.leaveBattle(window.__colossus.state,true);});await frames(60);
      assert.equal(await page.evaluate(()=>window.__colossus.state.mode),'expedition');
    });
    await page.context().close();
  }
  assert.deepEqual(report.errors,[]);
}catch(error){report.failure=String(error?.stack??error);}
finally{await browser.close();console.log(JSON.stringify(report,null,2));if(report.failure)process.exitCode=1;}
