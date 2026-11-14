// Frame-rate benchmark in headless Chrome on the machine's real graphics chip.
// Prints one row per detail level: frames per second, median frame time and
// the milliseconds of the game's own code per frame (scene.update).
//
// Usage: GAME_TEST_URL=http://127.0.0.1:4188 node tests/frame-time-benchmark.mjs [variant] [views] [width height scale]
//   variant  flesh | cyborg | standard | drill | horizontal | vertical   (default flesh)
//   views    comma list of city | world | moving                          (default city,moving)
//   size     viewport in CSS pixels and device scale factor               (default 1024 768 2)
//
// Numbers move with whatever else the machine is doing, so compare runs made
// back to back. Headless Chrome ran this game's code about 1.3 times slower
// than Node on the M2 used on 13 November 2026, so a visible window is
// likely a little faster than these figures. This does not measure Safari.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4188');
const [variant='flesh',views='city,moving',width='1024',height='768',scale='2']=process.argv.slice(2);
const faction={flesh:'kaiju',cyborg:'kaiju',standard:'crawler',drill:'crawler',horizontal:'airship',vertical:'airship'}[variant];
if(!faction)throw new Error('Unknown carrier variant: '+variant);
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});
try{
  const context=await browser.newContext({viewport:{width:+width,height:+height},deviceScaleFactor:+scale}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(new URL('/?test=1',base).href);
  await page.waitForFunction(()=>!!window.__colossus&&document.querySelector('#loading').classList.contains('hidden'),null,{timeout:180000});
  const graphics=await page.evaluate(()=>{const gl=window.__colossus.scene.renderer.getContext(),info=gl.getExtension('WEBGL_debug_renderer_info');return info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):'unknown';});
  const measure=seconds=>page.evaluate(async seconds=>{
    const scene=window.__colossus.scene,original=scene.update,code=[];
    scene.update=function(...args){const start=performance.now(),result=original.apply(this,args);code.push(performance.now()-start);return result;};
    const gaps=await new Promise(resolve=>{const out=[];let last=null,start=null;const frame=time=>{if(start===null)start=time;if(last!==null)out.push(time-last);last=time;if(time-start>seconds*1000)resolve(out);else requestAnimationFrame(frame);};requestAnimationFrame(frame);});
    scene.update=original;
    const median=values=>[...values].sort((a,b)=>a-b)[values.length>>1],info=scene.renderer.info.render;
    return{fps:+(gaps.length/(gaps.reduce((a,b)=>a+b,0)/1000)).toFixed(1),frameMs:+median(gaps).toFixed(1),gameCodeMs:+median(code).toFixed(1),drawCalls:info.calls,triangles:info.triangles,canvas:[scene.renderer.domElement.width,scene.renderer.domElement.height]};
  },seconds);
  const rows=[{scene:'title',detail:await page.evaluate(()=>window.__colossus.scene.quality),...(await measure(3))}];
  await page.locator(`[data-faction="${faction}"]`).click();await page.locator(`[data-variant="${variant}"]`).click();await page.locator('#begin').click();
  await page.waitForFunction(()=>!document.querySelector('#hud').classList.contains('hidden'),null,{timeout:180000});
  for(const view of views.split(','))for(const detail of['high','balanced','performance']){
    await page.evaluate(({detail,view})=>{window.__colossus.scene.setQuality(detail,{persist:false});document.querySelector(`[data-view="${view==='world'?'world':'city'}"]`).click();},{detail,view});
    if(view==='moving')await page.keyboard.down('w');
    await page.waitForTimeout(2500);const row=await measure(4);
    if(view==='moving')await page.keyboard.up('w');
    rows.push({scene:variant+' '+view,detail,...row});
  }
  console.log(JSON.stringify({graphics,viewport:[+width,+height],scale:+scale,rows,errors},null,1));
}finally{await browser.close();}
