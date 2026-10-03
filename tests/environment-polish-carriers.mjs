// Bounded desktop regression: six actual title-card choices, 54 normal City
// quality/light combinations, real canvas pointer selections, and saved resume.
// Run only after reserving the browser/GPU slot. This is not a benchmark.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4197');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'Use a local game server.');
const out=path.resolve(process.env.OUTPUT_DIR||path.join(root,'artifacts/environment-polish/carriers'));
const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const variants=[['kaiju','flesh'],['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']];
const report={startedAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),base:base.href,
  scope:'Six fresh Chrome contexts. Real faction/variant/Begin clicks. All 54 City quality/light combinations use the production callback and native RAF timestamps. Real canvas district/ground clicks plus Save/reload/Continue for each variant.',
  limitations:'Desktop Chrome/ANGLE D3D11 only. Bounded frame execution between UI checks; no performance benchmark, soak, physical-device or Safari claim. Radiance checks sample small areas, not every pixel.',
  variants:[],matrix:[],checks:[],screenshots:[],errors:[],shaderErrors:[],remote:[],failedRequests:[],hdrRequests:[]};
await fs.mkdir(out,{recursive:true});
async function sourceRecord(){
  const files=['index.html','package.json',...(await fs.readdir(path.join(root,'src'))).filter(name=>/\.(js|css)$/.test(name)).map(name=>'src/'+name)].sort();
  const result=[];for(const file of files)result.push({file,sha256:createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex')});return result;
}
report.sourceStart=await sourceRecord();
let browser,activePage;
const watchdog=setTimeout(()=>{report.timeoutFailure='Carrier checks exceeded ten wall-clock minutes.';void browser?.close();},600000);

async function pump(page,frames=6){
  return page.evaluate(frames=>window.__environmentCarrierPump(frames),frames);
}
async function cycle(page,id,property,value){
  for(let i=0;i<3;i++){
    if(await page.evaluate(property=>window.__colossus.scene[property],property)===value)return;
    await page.locator('#'+id).click();
  }
  assert.equal(await page.evaluate(property=>window.__colossus.scene[property],property),value);
}
async function openVariant(faction,variant){
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.addInitScript(()=>{
    if(localStorage.getItem('colossus-quality-v1')===null)localStorage.setItem('colossus-quality-v1','performance');
    localStorage.setItem('colossus-camera-mode','steady');
    const nativeRAF=window.requestAnimationFrame.bind(window);
    let pending=null,pumping=false,total=0;
    window.requestAnimationFrame=callback=>{pending=callback;return 1;};
    window.__environmentCarrierPump=frames=>new Promise((resolve,reject)=>{
      if(pumping)return reject(Error('Concurrent production-frame pumps are not permitted.'));
      pumping=true;let count=0;const start=performance.now();
      const timeout=setTimeout(()=>{pumping=false;reject(Error('Production frame pump timed out.'));},30000);
      const step=now=>{
        try{
          if(!pending)throw Error('Production callback stopped scheduling frames.');
          const callback=pending;pending=null;callback(now);count++;total++;
          if(count>=frames){clearTimeout(timeout);pumping=false;resolve({frames:count,total,wallMs:performance.now()-start});}
          else nativeRAF(step);
        }catch(error){clearTimeout(timeout);pumping=false;reject(error);}
      };
      nativeRAF(step);
    });
  });
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===base.origin||['data:','blob:'].includes(url.protocol))return route.continue();
    report.remote.push({variant,url:url.href});return route.abort();
  });
  const page=await context.newPage();activePage=page;page.setDefaultTimeout(30000);
  page.on('pageerror',error=>report.errors.push({variant,message:error.message}));
  page.on('console',message=>{
    if(message.type()==='error')report.errors.push({variant,message:message.text()});
    if(/shader error|VALIDATE_STATUS|WebGLProgram.*Error|GL_INVALID|WebGL.*INVALID_OPERATION/i.test(message.text()))report.shaderErrors.push({variant,message:message.text()});
  });
  page.on('requestfailed',request=>report.failedRequests.push({variant,phase:page.__carrierPhase??'startup',url:request.url(),failure:request.failure()?.errorText,resourceType:request.resourceType()}));
  for(const event of ['request','requestfinished','requestfailed'])page.on(event,request=>{if(new URL(request.url()).pathname.endsWith('/daylight.hdr'))report.hdrRequests.push({variant,event,phase:page.__carrierPhase??'startup',at:new Date().toISOString(),url:request.url()});});
  page.on('response',response=>{if(response.status()>=400)report.errors.push({variant,message:'HTTP '+response.status()+' '+response.url()});});
  await page.goto(new URL('/?test=1',base).href,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>!!window.__colossus?.scene?.renderer,null,{timeout:90000,polling:100});
  await page.locator(`[data-faction="${faction}"]`).click();
  await page.locator(`[data-variant="${variant}"]`).click();
  const choice=await page.evaluate(()=>({faction:document.querySelector('[data-faction].active')?.dataset.faction,
    variant:document.querySelector('[data-variant][aria-pressed="true"]')?.dataset.variant,
    state:{faction:window.__colossus.state.faction,variant:window.__colossus.state.variant},
    introVisible:!document.getElementById('intro').classList.contains('hidden')}));
  assert.deepEqual(choice,{faction,variant,state:{faction,variant},introVisible:true},'Actual title choice mismatch');
  await page.locator('#begin').click();
  await page.waitForFunction(()=>window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0,null,{timeout:90000,polling:100});
  await page.locator('[data-view="city"]').click();
  if(await page.evaluate(()=>window.__colossus.scene.cinematic.mode)!=='steady')await page.locator('#camera-motion').click();
  assert.equal(await page.evaluate(()=>window.__colossus.scene.cinematic.mode),'steady');
  await pump(page,18);
  return{context,page,choice};
}
async function snapshot(page,{geometry=false,radiance=false}={}){
  return page.evaluate(async({geometry,radiance})=>{
    const T=await import('/vendor/three.module.js'),{scene:g,state:s}=window.__colossus,r=g.renderer,gl=r.getContext();
    let invalidMatrices=0,invalidGeometry=0,matrixValues=0,geometryValues=0;const geometries=new Set();
    const inspect=(array,kind)=>{if(!array)return;for(const value of array){if(kind==='geometry'){geometryValues++;if(!Number.isFinite(value))invalidGeometry++;}else{matrixValues++;if(!Number.isFinite(value))invalidMatrices++;}}};
    g.scene.updateMatrixWorld(true);
    g.scene.traverse(object=>{
      inspect(object.matrixWorld.elements,'matrix');inspect(object.instanceMatrix?.array,'matrix');inspect(object.skeleton?.boneMatrices,'matrix');
      if(!geometry||!object.geometry||geometries.has(object.geometry))return;
      geometries.add(object.geometry);
      for(const attribute of [...Object.values(object.geometry.attributes),object.geometry.index].filter(Boolean))inspect(attribute.array??attribute.data?.array,'geometry');
      for(const attributes of Object.values(object.geometry.morphAttributes))for(const attribute of attributes)inspect(attribute.array??attribute.data?.array,'geometry');
    });
    const pixels=[];
    if(radiance&&g.presentation.enabled)for(const[name,target]of [['hdr',g.presentation.target],...g.presentation.bloom.targets.map((target,index)=>['bloom'+index,target])]){
      const w=Math.min(4,target.width),h=Math.min(4,target.height),half=target.texture.type===T.HalfFloatType;let invalid=0,channels=0;
      for(const[u,v]of [[.25,.3],[.5,.5],[.75,.7]]){
        const values=half?new Uint16Array(w*h*4):new Uint8Array(w*h*4);
        r.readRenderTargetPixels(target,Math.min(target.width-w,Math.floor(target.width*u)),Math.min(target.height-h,Math.floor(target.height*v)),w,h,values);
        for(const value of values){channels++;if(half&&(value&0x7c00)===0x7c00)invalid++;}
      }
      pixels.push({name,channels,invalid});
    }
    const extension=gl.getExtension('WEBGL_debug_renderer_info');
    return{faction:s.faction,variant:s.variant,view:g.view,quality:g.quality,lighting:g.light,paused:s.paused,
      renderer:gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL??gl.RENDERER),contextLost:gl.isContextLost(),glError:gl.getError(),
      cameraFinite:[...g.camera.position.toArray(),...g.camera.quaternion.toArray(),...g.camera.projectionMatrix.elements,...g.camera.matrixWorldInverse.elements].every(Number.isFinite),
      invalidMatrices,invalidGeometry,matrixValues,geometryValues,pixels,
      shaderFailures:(r.info.programs??[]).filter(program=>program.diagnostics?.runnable===false).map(program=>({name:program.name,diagnostics:program.diagnostics})),
      surface:g.surfaceDiagnostics(),environmentReady:g.environmentReady,environmentError:g.environmentError,
      render:{...r.info.render},canvas:[gl.drawingBufferWidth,gl.drawingBufferHeight],hudVisible:!document.getElementById('hud').classList.contains('hidden')};
  },{geometry,radiance});
}
function validate(state,label){
  assert.equal(state.contextLost,false,label+': context lost');assert.equal(state.glError,0,label+': WebGL error');
  assert.match(state.renderer,/Direct3D11|D3D11/i,label+': requested ANGLE D3D11 was not observed');
  assert.doesNotMatch(state.renderer,/SwiftShader|llvmpipe/i,label+': unexpected software renderer');
  assert.equal(state.cameraFinite,true,label+': invalid camera');assert.equal(state.invalidMatrices,0,label+': invalid matrix');assert.equal(state.invalidGeometry,0,label+': invalid geometry');
  assert.deepEqual(state.shaderFailures,[],label+': failed shader program');assert.equal(state.surface.pending,0,label+': pending surface assets');assert.deepEqual(state.surface.failures,[],label+': missing surface asset');
  assert.equal(state.environmentReady,true,label+': incomplete lighting environment');assert.equal(state.environmentError,null,label+': environment load error');
  assert.equal(state.hudVisible,true,label+': HUD hidden');assert.equal(state.paused,false,label+': gameplay paused');
  assert.ok(state.render.triangles>0&&state.render.calls>0,label+': no submitted geometry');assert.ok(state.canvas.every(value=>value>0),label+': empty canvas');
  for(const pixels of state.pixels)assert.equal(pixels.invalid,0,label+': non-finite sampled '+pixels.name);
}
async function worldPoint(page,ground=false){
  return page.evaluate(async ground=>{
    const T=await import('/vendor/three.module.js'),{scene,state}=window.__colossus,canvas=scene.canvas,rect=canvas.getBoundingClientRect();
    scene.scene.updateMatrixWorld(true);scene.camera.updateMatrixWorld(true);
    const slots=scene.city.slots.filter(hit=>!hit.userData.locked&&(scene.city.inspectedFloor===undefined||scene.city.slotPositions[hit.userData.slot].tier<=scene.city.inspectedFloor));
    const objects=[...slots,...scene.enemyCities.filter(city=>city.root.visible).map(city=>city.enemyProxy),...scene.pickables,scene.ground];
    const ray=new T.Raycaster(),pointer=new T.Vector2(),candidates=[];
    if(!ground)for(const slot of slots.filter(slot=>!!state.buildings[slot.userData.slot])){
      const bounds=new T.Box3().setFromObject(slot),centre=bounds.getCenter(new T.Vector3());
      const projected=centre.clone().project(scene.camera),x=rect.left+(projected.x*.5+.5)*rect.width,y=rect.top+(-projected.y*.5+.5)*rect.height;
      if(projected.z<-1||projected.z>1)continue;
      for(const[dx,dy]of [[0,0],[-8,0],[8,0],[0,-8],[0,8],[-18,0],[18,0],[0,-18],[0,18]])candidates.push([x+dx,y+dy]);
    }
    // A bounded screen search supplements projected district centres, and finds
    // actual open ground through the current HUD without clicking through it.
    for(let y=rect.top+rect.height*.42;y<rect.bottom-60;y+=30)for(let x=rect.left+rect.width*.28;x<rect.right-30;x+=30)candidates.push([x,y]);
    let tested=0;
    for(const[x,y]of candidates){
      if(document.elementFromPoint(x,y)!==canvas)continue;
      pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,scene.camera);tested++;
      const hit=ray.intersectObjects(objects,true).find(hit=>['ground','slot','node','enemy'].some(key=>hit.object.userData[key]!==undefined));
      if(!hit)continue;
      const data=hit.object.userData;
      if(ground?data.ground&&Math.abs(hit.point.x)<165&&Math.abs(hit.point.z)<165&&Math.hypot(hit.point.x-state.x,hit.point.z-state.z)>12:data.slot!==undefined&&!!state.buildings[data.slot])return{x,y,hit:hit.point.toArray(),slot:data.slot??null,tested,view:scene.view};
    }
    return null;
  },ground);
}

try{
  browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--mute-audio','--use-gl=angle','--use-angle=d3d11']});
  report.browser=browser.version();
  for(const[faction,variant]of variants){
    const {context,page,choice}=await openVariant(faction,variant);
    const entry={faction,variant,titleChoice:choice,checks:[]};report.variants.push(entry);
    try{
      page.__carrierPhase='render-matrix';
      for(const quality of ['high','balanced','performance']){
        await cycle(page,'quality','quality',quality);
        for(const lighting of ['day','dusk','night']){
          await cycle(page,'lighting','light',lighting);
          const callbacks=await pump(page,8),state=await snapshot(page,{geometry:quality==='high'&&lighting==='day',radiance:true});
          const label=[variant,quality,lighting,'city'].join('-');validate(state,label);
          assert.deepEqual([state.faction,state.variant,state.view,state.quality,state.lighting],[faction,variant,'city',quality,lighting]);
          report.matrix.push({label,productionCallbacks:callbacks.frames,...state});
          if(quality==='high'&&lighting==='day'){
            await pump(page,18);const filename=variant+'-high-day-city-hud.png';
            await page.screenshot({path:path.join(out,filename)});report.screenshots.push(filename);
          }
        }
      }
      entry.checks.push('All nine existing detail/light combinations render in normal City with the HUD.');
      await cycle(page,'lighting','light','day');await pump(page,12);
      page.__carrierPhase='pointer-selection';
      const district=await worldPoint(page);assert.ok(district,variant+': no unobstructed occupied-district pointer target');
      const targetBefore=await page.evaluate(()=>window.__colossus.state.target);
      await page.mouse.click(district.x,district.y);
      assert.match(await page.locator('#selection .eyebrow').textContent(),new RegExp('^DISTRICT '+(district.slot+1)+'(?:\\s|$)'),variant+': pointer did not select expected district');
      assert.deepEqual(await page.evaluate(()=>window.__colossus.state.target),targetBefore,'District click issued travel');
      await pump(page,2);assert.equal(await page.evaluate(()=>window.__colossus.scene.selection.visible),true,'District selection ring missing');
      entry.districtPointer=district;entry.checks.push('An actual mouse canvas click selects the raycast district and shows its selection ring without travel.');
      let ground=await worldPoint(page,true);
      if(!ground){await page.locator('[data-view="world"]').click();await pump(page,18);ground=await worldPoint(page,true);}
      assert.ok(ground,variant+': no unobstructed ground pointer target');
      await page.mouse.click(ground.x,ground.y);
      const target=await page.evaluate(()=>window.__colossus.state.target);assert.ok(target,'Ground click did not set a target');
      assert.ok(Math.hypot(target.x-ground.hit[0],target.z-ground.hit[2])<.05,'Ground target differs from actual raycast point');
      assert.equal((await page.locator('#selection').textContent()).trim(),'','Ground travel did not clear district context');
      entry.groundPointer={...ground,target};entry.checks.push('An actual mouse canvas ground click orders travel to the hit point and clears district context.');
      await page.locator('#save').click();
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('colossus-wake-save-v1')));
      assert.deepEqual(saved,await page.evaluate(()=>window.__colossus.snapshot()),'Save button did not persist the current expedition');
      page.__carrierPhase='before-reload';await page.waitForLoadState('networkidle',{timeout:30000});
      page.__carrierPhase='reload';await page.reload({waitUntil:'domcontentloaded',timeout:90000});
      await page.waitForFunction(()=>!!window.__colossus&&window.__colossus.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0,null,{timeout:90000,polling:100});
      assert.equal(await page.locator('#continue').isVisible(),true,'Saved expedition Continue button missing');
      page.__carrierPhase='resume';await page.locator('#continue').click();
      assert.deepEqual(await page.evaluate(()=>window.__colossus.snapshot()),saved,'Continue changed saved expedition identity/state');
      await page.waitForFunction(()=>window.__colossus.scene.surfaceDiagnostics().pending===0,null,{polling:100});
      await pump(page,8);entry.resumed=await snapshot(page);validate(entry.resumed,variant+' resumed');
      assert.deepEqual([entry.resumed.faction,entry.resumed.variant],[faction,variant]);
      entry.checks.push('Save/reload/Continue preserves the complete expedition, chosen carrier and pointer-created destination before active frames resume.');
      page.__carrierPhase='before-close';await page.waitForLoadState('networkidle',{timeout:30000});
      console.log('Carrier regression complete: '+variant);
    }catch(error){
      entry.failure=error.stack;
      entry.failureState=await page.evaluate(()=>({url:location.href,readyState:document.readyState,hasApi:!!window.__colossus,
        environmentReady:window.__colossus?.scene?.environmentReady,environmentError:window.__colossus?.scene?.environmentError,
        surface:window.__colossus?.scene?.surfaceDiagnostics(),errorText:document.getElementById('error')?.textContent,
        titleVisible:document.getElementById('intro')?.checkVisibility(),continueVisible:document.getElementById('continue')?.checkVisibility()})).catch(failure=>({unavailable:failure.message}));
      await page.screenshot({path:path.join(out,variant+'-failure-hud.png'),timeout:10000}).catch(()=>{});
      throw error;
    }finally{page.__carrierPhase='context-close';await context.close();activePage=null;}
  }
  assert.equal(report.variants.length,6);assert.equal(report.matrix.length,54);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.shaderErrors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.failedRequests,[]);
  report.checks.push('All six actual UI carrier choices, 54 normal City render combinations, district/ground pointer selections and six save resumes passed.');report.passed=true;
}catch(error){
  report.passed=false;report.failure=error.stack;process.exitCode=1;
  if(activePage&&!activePage.isClosed())await activePage.screenshot({path:path.join(out,'failure-hud.png'),timeout:10000}).catch(()=>{});
}finally{
  clearTimeout(watchdog);if(browser)await browser.close();report.sourceFinish=await sourceRecord();
  if(JSON.stringify(report.sourceStart)!==JSON.stringify(report.sourceFinish)){report.passed=false;report.sourceChangedDuringRun=true;process.exitCode=1;}
  report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({passed:report.passed,variants:report.variants.length,cases:report.matrix.length,failure:report.failure,report:path.join(out,'report.json')},null,2));
