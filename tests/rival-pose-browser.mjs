// A standing rival titan is posed on the CPU every frame, which costs about
// 20 ms for the beast. It must keep being posed while it is near and in view,
// and must be left alone while it is far away, where nobody can see it breathe.
// Usage: GAME_TEST_URL=http://127.0.0.1:4188 node tests/rival-pose-browser.mjs
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4188'),report={checks:[],errors:[]};
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});
try{
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  await page.goto(new URL('/?test=1',base).href);await page.waitForFunction(()=>!!window.__colossus&&document.querySelector('#loading').classList.contains('hidden'),null,{timeout:180000});
  await page.locator('[data-faction="crawler"]').click();await page.locator('#begin').click();
  await page.waitForFunction(()=>!document.querySelector('#hud').classList.contains('hidden'),null,{timeout:120000});
  // Counts skin-corrective updates of the rival beast across a number of drawn frames.
  const observe=frames=>page.evaluate(async frames=>{
    const {scene,state}=window.__colossus,beast=scene.enemyCities.find(city=>city.variant==='flesh'),rival=state.enemies.find(enemy=>enemy.id===beast.id);
    const updates=()=>beast.meshyCarrier.controller.status().surfaceCorrective.updates,before=updates(),start=scene.framesSinceGame;
    await new Promise(resolve=>{const wait=()=>scene.framesSinceGame-start>=frames?resolve():requestAnimationFrame(wait);requestAnimationFrame(wait);});
    const centre=beast.root.position.clone();centre.y+=25;
    return{posed:updates()-before,frames:scene.framesSinceGame-start,cameraDistance:Math.round(centre.distanceTo(scene.camera.position)),rival:{x:rival.x,z:rival.z},visible:beast.root.visible,everPosed:updates()>0};
  },frames);
  const far=await observe(60);
  assert.ok(far.everPosed,'Every rival is posed once when the game starts');
  assert.ok(far.cameraDistance>170,'The start is far from the rival beast: '+far.cameraDistance);
  assert.equal(far.posed,0,'A distant rival beast is not re-posed: '+JSON.stringify(far));
  report.checks.push(`Rival beast ${far.cameraDistance} m from the camera was posed 0 times in ${far.frames} frames.`);
  // Stand the player beside the rival and look at it.
  await page.evaluate(({x,z})=>{const {scene,state}=window.__colossus;state.x=x-45;state.z=z;state.target=null;scene.yaw=Math.atan2(-1,0);scene.snapCamera=true;scene.focus.set(x-45,0,z);},far.rival);
  await page.waitForTimeout(1500);
  const near=await observe(60);
  assert.ok(near.cameraDistance<170,'The camera is now near the rival beast: '+near.cameraDistance);
  assert.ok(near.posed>=55,'A nearby rival beast in view is posed every frame: '+JSON.stringify(near));
  report.checks.push(`Rival beast ${near.cameraDistance} m from the camera was posed ${near.posed} times in ${near.frames} frames.`);
  // Walk away again.
  await page.evaluate(({x,z})=>{const {scene,state}=window.__colossus;state.x=x>0?x-330:x+330;state.z=z>0?z-200:z+200;scene.snapCamera=true;scene.focus.set(state.x,0,state.z);},far.rival);
  await page.waitForTimeout(1500);
  const again=await observe(60);
  assert.ok(again.cameraDistance>170);assert.equal(again.posed,0,'Leaving stops the posing again: '+JSON.stringify(again));
  report.checks.push('Walking away stops the posing again.');
  // Far hulls and airships keep moving, but their citizens are refreshed less often than every frame.
  const people=await page.evaluate(async()=>{
    const {scene,state}=window.__colossus,rows=[];state.paused=false;
    const cities=scene.enemyCities.filter(city=>!city.meshyCarrier),last=new Map(cities.map(city=>[city,city.citizenTime])),count=new Map(cities.map(city=>[city,0])),start=scene.framesSinceGame;
    await new Promise(resolve=>{const wait=()=>{for(const city of cities)if(city.citizenTime!==last.get(city)){last.set(city,city.citizenTime);count.set(city,count.get(city)+1);}scene.framesSinceGame-start>=60?resolve():requestAnimationFrame(wait);};requestAnimationFrame(wait);});
    for(const city of cities)rows.push({variant:city.variant,refreshes:count.get(city),posed:city.poseTime===state.time||state.time-city.poseTime<.2});
    return{frames:scene.framesSinceGame-start,rows};
  });
  for(const row of people.rows){assert.ok(row.posed,'A far hull or airship still moves every frame: '+JSON.stringify(row));assert.ok(row.refreshes>=1&&row.refreshes<people.frames,'Its citizens refresh, but not every frame: '+JSON.stringify(row)+' in '+people.frames);}
  report.checks.push(`Far rivals' citizens refreshed ${people.rows.map(row=>row.refreshes).join(', ')} times in ${people.frames} frames.`);
  // A rival that neither the view nor the sun's shadow volume contains is hidden; one in view is shown.
  const culling=await page.evaluate(async()=>{
    const T=await import('/vendor/three.module.js'),{scene,state}=window.__colossus;
    // Turn the camera to look outward from the valley, so the rivals are behind it.
    scene.setCameraMode('steady');scene.yaw=Math.atan2(-state.x,-state.z);scene.snapCamera=true;const start=scene.framesSinceGame;
    await new Promise(resolve=>{const wait=()=>scene.framesSinceGame-start>=6?resolve():requestAnimationFrame(wait);requestAnimationFrame(wait);});
    const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(scene.camera.projectionMatrix,scene.camera.matrixWorldInverse));
    return scene.enemyCities.map(city=>{const sphere=new T.Sphere(city.root.position.clone().add(new T.Vector3(0,25,0)),60),shadow=scene.renderer.shadowMap.enabled&&scene.sun.shadow.getFrustum().intersectsSphere(sphere);return{variant:city.variant,visible:city.root.visible,inView:frustum.intersectsSphere(sphere),inShadowVolume:shadow};});
  });
  for(const row of culling)assert.equal(row.visible,row.inView||row.inShadowVolume,'Rival visibility follows the view and shadow volumes: '+JSON.stringify(row));
  assert.ok(culling.some(row=>!row.visible),'At least one rival is outside both volumes here: '+JSON.stringify(culling));
  report.checks.push(`${culling.filter(row=>!row.visible).length} of ${culling.length} rivals are outside the view and shadow volumes and hidden.`);
  // When time stops, every rival is brought to that instant once.
  const frozen=await page.evaluate(async()=>{
    const {scene,state}=window.__colossus;state.paused=true;const start=scene.framesSinceGame;
    await new Promise(resolve=>{const wait=()=>scene.framesSinceGame-start>=4?resolve():requestAnimationFrame(wait);requestAnimationFrame(wait);});
    const rows=scene.enemyCities.map(city=>({variant:city.variant,poseTime:city.poseTime,citizenTime:city.citizenTime}));state.paused=false;return{time:state.time,rows};
  });
  for(const row of frozen.rows){assert.equal(row.poseTime,frozen.time,'A paused rival is posed at the paused instant: '+JSON.stringify(row));assert.equal(row.citizenTime,frozen.time,'and so are its citizens: '+JSON.stringify(row));}
  report.checks.push('Pausing brings every rival and its citizens to the paused instant.');
  assert.deepEqual(report.errors,[]);
}catch(error){report.failure=String(error?.stack??error);}
finally{await browser.close();console.log(JSON.stringify(report,null,2));if(report.failure)process.exitCode=1;}
