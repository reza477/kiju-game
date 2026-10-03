// Functional lifetime regression, not a benchmark. All transitions use normal
// UI, native frames and an isolated browser context. Only forced context loss
// uses a renderer API; no fixture injection, simulation advance or precompile.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=await fs.realpath(fileURLToPath(new URL('..',import.meta.url)));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/first-use/lifecycle');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4201/');
assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'Local game required.');
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
async function source(){
  const paths=new Set([...git('ls-files','src','assets','vendor','index.html','package.json','package-lock.json').split('\n'),...git('ls-files','--others','--exclude-standard','src').split('\n')]);
  const hashes={};for(const file of [...paths].filter(Boolean).sort())hashes[file]=hash(await fs.readFile(path.join(root,file)));
  return{commit:git('rev-parse','HEAD'),hashes,fingerprint:hash(JSON.stringify(hashes))};
}
await fs.mkdir(out,{recursive:true});
await assert.rejects(fs.access(path.join(out,'report.json')),'Do not overwrite prior lifecycle evidence.');
const report={startedAt:new Date().toISOString(),sourceStart:await source(),command:{executable:process.execPath,args:process.argv.slice(1),environment:{GAME_TEST_URL:base.href,OUTPUT_DIR:out,HEADLESS:process.env.HEADLESS??'1'}},
  method:'Fresh isolated Chrome storage. Real Begin, movement/destruction, save, title/Continue, quality and carrier UI transitions. Native production frames remain active. Pause through UI for immutable-state assertions. A forced WebGL context loss/restore is functional recovery testing, not ordinary-user timing.',
  limitations:'One desktop Chrome/Windows run. No performance, physical Apple, Safari or installation/update certification. Renderer properties are read for diagnostics only; they are not used by production. Shader source inspection occurs outside timing.',
  snapshots:[],checks:[],errors:[],warnings:[],remote:[],failedRequests:[],passed:false};
let browser,page,context;
try{
  const health=await(await fetch(new URL('/health',base))).json();
  assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,hash(root.replaceAll('\\','/').toLowerCase()));report.server={url:base.href,health};
  const headless=process.env.HEADLESS!=='0';
  browser=await chromium.launch({channel:'chrome',headless,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});
  report.browser={version:browser.version(),channel:'chrome',headless};
  context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();report.remote.push(url.href);return route.abort();});
  await context.addInitScript(()=>{
    localStorage.setItem('colossus-quality-v1','high');
    const observer=window.__lifecycle={frames:0,continueSnapshots:[],saveSnapshots:[],contextEvents:[],worldDisposals:[]};
    const raf=requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>raf(now=>{callback(now);if(callback.name==='frame')observer.frames++;});
    // This listener runs after the application's button handler, before the
    // next frame. It records the true Continue result without freezing RAF.
    window.addEventListener('click',event=>{
      const target=event.target.closest('button');if(!window.__colossus)return;
      if(target?.id==='continue')observer.continueSnapshots.push(window.__colossus.snapshot());
      if(target?.id==='save'||target?.dataset.dialogAction==='save')observer.saveSnapshots.push({state:window.__colossus.snapshot(),raw:localStorage.getItem('colossus-wake-save-v1')});
    });
  });
  page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(['warn','warning'].includes(m.type()))report.warnings.push(m.text());});
  page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()?.errorText}));
  await page.goto(new URL('?test=1',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0&&window.__colossus.scene.movementPreparation?.status.attempts>0);
  await page.evaluate(()=>{
    const g=window.__colossus.scene,seen=new Set();
    g.world.traverse(o=>{for(const m of [o.material,o.customDepthMaterial,o.customDistanceMaterial].flat())if(m&&!seen.has(m)){seen.add(m);m.addEventListener('dispose',()=>window.__lifecycle.worldDisposals.push({id:m.uuid,name:m.name,frame:window.__lifecycle.frames}));}});
    for(const event of ['webglcontextlost','webglcontextrestored'])g.canvas.addEventListener(event,()=>window.__lifecycle.contextEvents.push({event,frame:window.__lifecycle.frames,at:performance.now()}));
  });
  async function frames(count=8){const start=await page.evaluate(()=>window.__lifecycle.frames);await page.waitForFunction(({start,count})=>window.__lifecycle.frames>=start+count,{start,count},{polling:'raf'});}
  async function pause(){if(!await page.evaluate(()=>window.__colossus.state.paused))await page.locator('#pause').click();assert.equal(await page.evaluate(()=>window.__colossus.state.paused),true);}
  async function snap(label){
    const value=await page.evaluate(label=>{
      const g=window.__colossus.scene,r=g.renderer,gl=r.getContext(),materials=new Map(),geometries=new Set();
      const describe=m=>({uuid:m.uuid,name:m.name,type:m.type,shared:!!m.userData.shared,map:m.map?.uuid??null,alphaTest:m.alphaTest,side:m.side,
        cacheKey:m.customProgramCacheKey(),shaderHook:m.onBeforeCompile.toString()});
      g.world.traverse(o=>{if(o.geometry)geometries.add(o.geometry.uuid);for(const m of [o.material,o.customDepthMaterial,o.customDistanceMaterial].flat())if(m)materials.set(m.uuid,describe(m));});
      const program=p=>({id:p.id,name:p.name,usedTimes:p.usedTimes,cacheKey:p.cacheKey,
        vertexSource:p.vertexShader?gl.getShaderSource(p.vertexShader):null,fragmentSource:p.fragmentShader?gl.getShaderSource(p.fragmentShader):null});
      const prepared=g.landscape.movementMaterials.map(mesh=>({mesh:mesh.uuid,name:mesh.name,geometry:mesh.geometry.uuid,material:describe(mesh.material),count:mesh.count,visible:mesh.visible,
        programs:r.properties.has(mesh.material)?[...(r.properties.get(mesh.material).programs?.values()??[])].map(program):[]}));
      return{label,frame:window.__lifecycle.frames,world:g.world.uuid,worldGeometry:[...geometries].sort(),worldMaterials:[...materials.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid)),prepared,
        preparation:{...g.movementPreparation.status},render:{...r.info.render},memory:{...r.info.memory},programs:(r.info.programs??[]).map(program),
        quality:g.quality,light:g.light,buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],renderDpr:r.getPixelRatio(),shadowEnabled:r.shadowMap.enabled,
        sourceState:window.__colossus.snapshot(),savedRaw:localStorage.getItem('colossus-wake-save-v1'),worldDisposals:[...window.__lifecycle.worldDisposals],contextLost:gl.isContextLost(),contextEvents:[...window.__lifecycle.contextEvents],
        surfaces:g.surfaceDiagnostics(),city:{id:g.city.root.uuid,faction:g.city.faction,variant:g.city.variant},sites:g.labels.map(x=>({id:x.uuid,name:x.name}))};
    },label);
    // Hash shader text once outside browser rendering; retain identities/counts
    // rather than embedding duplicate large GLSL copies in the report.
    const program=p=>{for(const key of ['vertexSource','fragmentSource']){p[key+'Sha256']=p[key]===null?null:hash(p[key]);delete p[key];}return p;};
    for(const m of value.worldMaterials){m.shaderHookSha256=hash(m.shaderHook);delete m.shaderHook;}
    for(const m of value.prepared){m.material.shaderHookSha256=hash(m.material.shaderHook);delete m.material.shaderHook;m.programs.forEach(program);}
    value.programs.forEach(program);report.snapshots.push(value);
    assert.equal(value.contextLost,false,label);assert.equal(value.preparation.error,null,label);assert.equal(value.prepared.length,2);
    assert.deepEqual(value.prepared.map(m=>m.name),['Crushed tree stumps','Crushed fallen boughs']);
    assert.ok(value.prepared.every(m=>m.programs.length>0),label+': both traced pool materials need prepared programs');
    assert.deepEqual(value.surfaces.failures,[]);assert.ok(value.render.calls>0,label+': no ordinary rendering');
    return value;
  }
  const initial=await snap('title-initial');
  const stablePools=s=>s.prepared.map(m=>({mesh:m.mesh,geometry:m.geometry,material:m.material.uuid}));
  function preservedWorld(s){
    assert.equal(s.world,initial.world);assert.deepEqual(s.worldGeometry,initial.worldGeometry);assert.deepEqual(s.worldMaterials,initial.worldMaterials);
    assert.deepEqual(stablePools(s),stablePools(initial));assert.deepEqual(s.worldDisposals,[],'setGame disposed a material still owned by the persistent world');
  }
  async function selectAndBegin(faction,variant){
    await page.locator(`[data-faction="${faction}"]`).click();await page.locator(`[data-variant="${variant}"]`).click();await page.locator('#begin').click();
    if(await page.locator('[data-dialog-action="restart"]').isVisible())await page.locator('[data-dialog-action="restart"]').click();
    await pause();await frames();const s=await snap('begin-'+variant);preservedWorld(s);assert.deepEqual([s.city.faction,s.city.variant],[faction,variant]);return s;
  }
  await selectAndBegin('crawler','standard');
  // Establish real destruction through normal movement; do not inject saved IDs.
  const origin=await page.evaluate(()=>({x:window.__colossus.state.x,z:window.__colossus.state.z}));
  await page.locator('#pause').click();
  try{await page.keyboard.down('a');await page.waitForFunction(origin=>{const s=window.__colossus.state;return Math.hypot(s.x-origin.x,s.z-origin.z)>=60&&s.worldDamage.expedition.length>0;},origin,{polling:'raf',timeout:45000});}
  finally{await page.keyboard.up('a');}
  await pause();await frames();const damaged=await snap('real-movement-damage');preservedWorld(damaged);
  assert.ok(damaged.sourceState.worldDamage.expedition.length>0);report.checks.push('Real native movement created saved destruction; preparation retained the two original pool meshes/materials.');
  await page.locator('#save').click();
  const saveEvent=await page.evaluate(()=>window.__lifecycle.saveSnapshots.at(-1));assert.deepEqual(JSON.parse(saveEvent.raw),saveEvent.state);
  const unchanged=await page.evaluate(()=>window.__colossus.snapshot());
  // Each actual button click may pass through an intermediate preset. Record
  // each transition and require precisely one preparation per changed key.
  for(const target of ['performance','balanced','high']){
    for(let i=0;i<3&&await page.evaluate(()=>window.__colossus.scene.quality)!==target;i++){
      const before=await snap('quality-before-'+target);await page.locator('#quality').click();await frames();const after=await snap('quality-after-'+target);
      preservedWorld(after);assert.equal(after.preparation.attempts,before.preparation.attempts+1);assert.deepEqual(after.sourceState,unchanged);
      const dpr=after.quality==='high'?1.25:after.quality==='balanced'?1:.85;
      assert.equal(after.renderDpr,dpr);assert.deepEqual(after.buffer,[Math.floor(1440*dpr),Math.floor(960*dpr)]);assert.equal(after.shadowEnabled,after.quality!=='performance');
    }
    assert.equal(await page.evaluate(()=>window.__colossus.scene.quality),target);
  }
  report.checks.push('Actual quality UI transitions invalidate preparation once per changed configuration and preserve paused state, pixels per buffer, and world ownership.');
  async function title(){await page.locator('#menu').click();await page.locator('[data-dialog-action="title"]').click();await page.locator('#continue').waitFor({state:'visible'});await frames();}
  const steadyPoolPrograms=s=>s.prepared.map(m=>m.programs.map(p=>({id:p.id,key:p.cacheKey})).sort((a,b)=>a.id-b.id));
  const stable=await snap('same-configuration-start');
  for(let i=1;i<=3;i++){
    await title();const atTitle=await snap('title-cycle-'+i);preservedWorld(atTitle);
    const saved=JSON.parse(atTitle.savedRaw);await page.locator('#continue').click();
    const resumed=await page.evaluate(()=>window.__lifecycle.continueSnapshots.at(-1));
    // These are the established deserialize/Begin rules, not normalization to
    // excuse a new difference: deserialize sets paused=false and speed=1.
    assert.deepEqual(resumed,{...saved,paused:false,speed:1},'Continue changed saved progress beyond established pause/speed normalization');
    assert.deepEqual(resumed.worldDamage,saved.worldDamage);await pause();await frames();const after=await snap('continue-cycle-'+i);preservedWorld(after);
    assert.equal(after.preparation.attempts,stable.preparation.attempts);assert.deepEqual(steadyPoolPrograms(after),steadyPoolPrograms(stable));
    report.checks.push(`Title/Continue ${i}: exact resumed save at click boundary; world materials and prepared program identities remain owned and stable.`);
  }
  for(const [faction,variant]of [['kaiju','cyborg'],['crawler','drill']]){
    await title();const before=await snap('before-carrier-'+variant);const after=await selectAndBegin(faction,variant);
    assert.equal(after.preparation.attempts,before.preparation.attempts);assert.deepEqual(steadyPoolPrograms(after),steadyPoolPrograms(stable));
  }
  report.checks.push('Actual cyborg/drill title choices rebuild only owned carrier resources; the two persistent movement pools remain bounded and compatible.');
  await page.locator('#save').click();await frames();const beforeLoss=await snap('before-context-loss');
  await page.evaluate(()=>window.__colossus.scene.renderer.forceContextLoss());
  await page.waitForFunction(()=>window.__colossus.scene.renderer.getContext().isContextLost()&&window.__lifecycle.contextEvents.some(e=>e.event==='webglcontextlost'));
  const lostState=await page.evaluate(()=>({state:window.__colossus.snapshot(),savedRaw:localStorage.getItem('colossus-wake-save-v1'),attempts:window.__colossus.scene.movementPreparation.status.attempts}));
  assert.deepEqual(lostState.state,beforeLoss.sourceState);assert.equal(lostState.savedRaw,beforeLoss.savedRaw);assert.equal(lostState.attempts,beforeLoss.preparation.attempts);
  await page.evaluate(()=>window.__colossus.scene.renderer.forceContextRestore());
  await page.waitForFunction(attempts=>!window.__colossus.scene.renderer.getContext().isContextLost()&&window.__lifecycle.contextEvents.some(e=>e.event==='webglcontextrestored')&&window.__colossus.scene.movementPreparation.status.attempts===attempts+1,beforeLoss.preparation.attempts);
  await frames();const restored=await snap('after-context-restore');preservedWorld(restored);
  assert.deepEqual(restored.sourceState,beforeLoss.sourceState);assert.equal(restored.savedRaw,beforeLoss.savedRaw);assert.equal(restored.preparation.attempts,beforeLoss.preparation.attempts+1);
  const oldPrograms=new Set(beforeLoss.programs.map(p=>p.id));assert.ok(restored.programs.length>0);assert.ok(restored.programs.every(p=>!oldPrograms.has(p.id)),'Restored renderer retained stale program identities');
  assert.ok(restored.prepared.every(m=>m.programs.every(p=>!oldPrograms.has(p.id))));
  report.checks.push('Forced context loss/restore preserves paused state and saved bytes, rebuilds GPU programs, keeps CPU resource identity, and triggers exactly one preparation retry.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.failedRequests,[]);report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{
  if(context)await context.close();if(browser)await browser.close();
  report.sourceFinish=await source();report.sourceStable=report.sourceStart.fingerprint===report.sourceFinish.fingerprint;
  if(!report.sourceStable){report.passed=false;process.exitCode=1;}
  report.finishedAt=new Date().toISOString();report.exitCode=process.exitCode||0;
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,exitCode:report.exitCode,report:path.join(out,'report.json'),failure:report.failure},null,2));
}
