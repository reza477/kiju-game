// A cold start compiles about a hundred shaders. Two things kept it far
// slower than it had to be, and this guards both:
//  - the stand-in environment was half the size of the daylight photograph
//    that replaces it, and an environment map's size is compiled into every
//    lit shader, so each was compiled twice, the second time while the title
//    screen was already showing;
//  - the renderer compiled each shader when it first drew with it and waited
//    for it, one at a time, instead of handing them over together.
// Usage: GAME_TEST_URL=http://127.0.0.1:4188 node tests/startup-shaders-browser.mjs
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4188'),report={checks:[],errors:[],warnings:[]};
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});
try{
  const page=await (await browser.newContext({viewport:{width:1024,height:640}})).newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());if(message.type()==='warning')report.warnings.push(message.text());});
  await page.addInitScript(()=>{
    // Every frame: which shader programs exist, which environment is in use, and how often a
    // program was created by drawing with it (rather than by the submission before the frame).
    const log=window.__startup={frames:[],created:0,drawing:false},proto=WebGL2RenderingContext.prototype,create=proto.createProgram;
    proto.createProgram=function(){if(log.drawing)log.created++;return create.call(this);};
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>raf(time=>{const before=log.created;log.drawing=true;try{callback(time);}finally{log.drawing=false;}
      const scene=window.__colossus?.scene;if(!scene)return;const image=scene.scene.environment?.image;
      log.frames.push({final:scene.environmentReady===true,environment:[image?.width,image?.height],keys:scene.renderer.info.programs.map(program=>program.cacheKey),createdWhileDrawing:log.created-before});});
  });
  await page.goto(new URL('/?test=1',base).href);
  await page.waitForFunction(()=>{const frames=window.__startup?.frames??[],first=frames.findIndex(frame=>frame.final);return first>=0&&frames.length>=first+20;},null,{timeout:900000,polling:250});
  const frames=await page.evaluate(()=>window.__startup.frames),first=frames.findIndex(frame=>frame.final);
  assert.ok(first>0,'At least one frame is drawn with the stand-in environment before the daylight one arrives; arrived at frame '+(first+1));
  const standIn=frames[first-1],daylight=frames[first];
  assert.deepEqual(standIn.environment,daylight.environment,'The stand-in environment is the size of the daylight environment');
  report.checks.push(`Stand-in and daylight environment maps are both ${daylight.environment.join(' by ')}.`);
  const kept=standIn.keys.filter(key=>daylight.keys.includes(key)).length,settled=frames.at(-1);
  assert.equal(kept,standIn.keys.length,'Every shader compiled for the stand-in environment is still in use with the daylight one');
  assert.ok(settled.keys.length-standIn.keys.length<=12,`The daylight environment brings no second set of shaders: ${standIn.keys.length} before, ${settled.keys.length} after`);
  report.checks.push(`${standIn.keys.length} shader programs before the daylight environment arrived, ${settled.keys.length} twenty frames after; none was replaced.`);
  const whileDrawing=frames.reduce((sum,frame)=>sum+frame.createdWhileDrawing,0);
  assert.ok(frames[0].keys.length>=40,'The first frame already has the scene\'s shaders: '+frames[0].keys.length);
  assert.ok(whileDrawing<=frames[0].keys.length*.4,`Most shaders are handed over before the first frame, not created one by one while drawing: ${whileDrawing} of ${frames[0].keys.length} were created while drawing`);
  report.checks.push(`${frames[0].keys.length-frames[0].createdWhileDrawing} of the first frame's ${frames[0].keys.length} shader programs were submitted before it was drawn; ${whileDrawing} were created while drawing, over all ${frames.length} frames.`);
  assert.deepEqual(report.warnings.filter(text=>/environment/i.test(text)),[],'No warning about environment sizes');
  assert.deepEqual(report.errors,[]);
}catch(error){report.failure=String(error?.stack??error);}
finally{await browser.close();console.log(JSON.stringify(report,null,2));if(report.failure)process.exitCode=1;}
