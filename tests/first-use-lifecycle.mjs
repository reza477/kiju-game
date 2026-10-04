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
  const paths=new Set([...git('ls-files','src','assets','vendor','index.html','package.json','package-lock.json').split('\n'),...git('ls-files','--others','--exclude-standard','src','assets','vendor').split('\n')]);
  const hashes={};for(const file of [...paths].filter(Boolean).sort())hashes[file]=hash(await fs.readFile(path.join(root,file)));
  return{commit:git('rev-parse','HEAD'),hashes,fingerprint:hash(JSON.stringify(hashes))};
}
await fs.mkdir(out,{recursive:true});
await assert.rejects(fs.access(path.join(out,'report.json')),'Do not overwrite prior lifecycle evidence.');
const report={startedAt:new Date().toISOString(),sourceStart:await source(),command:{executable:process.execPath,args:process.argv.slice(1),environment:{GAME_TEST_URL:base.href,OUTPUT_DIR:out,HEADLESS:process.env.HEADLESS??'1'}},
  method:'Fresh isolated Chrome storage. Real Begin, movement/destruction, save, title/Continue, quality and carrier UI transitions. Native production frames remain active. Pause through UI for immutable-state assertions. A forced WebGL context loss/restore is functional recovery testing, not ordinary-user timing. A separate touch/DPR2 session exercises portrait-to-landscape-to-portrait through real viewport resize events, retaining its existing Performance preference. Resize and first-touch callback/RAF windows are diagnostic observations, separate from the final paired benchmark.',
  limitations:'Windows Chrome only; phone viewport/touch emulation is not physical Apple or Safari evidence. No installation/update certification. Renderer properties and shader source are inspected outside diagnostic timing. Targeted GL link-status checks run only after restored-context validation or completed touch windows, with query wall cost recorded; none run ahead of the first post-resize touch window. Callback wall duration and native RAF gaps are not pure CPU or display/photon latency. Resize observations include 24 paused native frames for lifecycle validation; subsequent first-touch routes do not represent immediate input during an orientation event or ordinary cold startup. Driver/OS caches and preceding lifecycle work are uncontrolled.',
  snapshots:[],resizeDiagnostics:[],checks:[],errors:[],warnings:[],remote:[],failedRequests:[],passed:false};
let browser,page,context;
function installObserver({quality}){
  localStorage.setItem('colossus-quality-v1',quality);
  const observer=window.__lifecycle={frames:0,continueSnapshots:[],saveSnapshots:[],contextEvents:[],worldDisposals:[],siteDisposals:[],siteMaterialDisposals:[],watchedSiteObjects:new WeakSet(),resizeEvents:[],resizeCalls:[],measurement:null,lastFrame:null};
  const objectIds=new WeakMap();let nextObjectId=1;
  observer.objectIdentity=object=>{if(!objectIds.has(object))objectIds.set(object,nextObjectId++);return objectIds.get(object);};
  const raf=requestAnimationFrame.bind(window);
  const summary=values=>{const v=[...values].filter(Number.isFinite).sort((a,b)=>a-b);return{samples:v.length,median:v[Math.floor(v.length*.5)]??null,p95:v[Math.floor(v.length*.95)]??null,max:v.at(-1)??null,above50:v.filter(x=>x>50).length,above100:v.filter(x=>x>100).length};};
  observer.startWindow=(label,direction=null)=>{
    if(observer.measurement)throw Error('A lifecycle diagnostic window is already active.');
    observer.measurement={label,direction,startedAt:performance.now(),priorFrame:observer.lastFrame,frames:[],resizeEventStart:observer.resizeEvents.length,resizeCallStart:observer.resizeCalls.length,focusLost:false};
  };
  observer.endWindow=()=>{
    const m=observer.measurement;if(!m)throw Error('No active lifecycle diagnostic window.');observer.measurement=null;
    return{label:m.label,direction:m.direction,startedAt:m.startedAt,finishedAt:performance.now(),inputAt:m.inputAt??null,inputObservationMs:m.inputObservationMs??null,
      firstRenderedMovementMs:m.firstResponse??null,responseMeaning:'Real touch pointerdown capture to completion of first native main callback with changed position, not physical display latency.',
      inputState:m.inputState??null,endState:m.endState??null,targetProjectedDistance:m.direction?60:null,projectedDistance:m.projectedDistance??null,reached:m.reached??null,
      mainCallbackMs:summary(m.frames.map(f=>f.callbackMs)),frameIntervalMs:summary(m.frames.map(f=>f.intervalMs)),frames:m.frames,
      resizeEvents:observer.resizeEvents.slice(m.resizeEventStart),resizeCalls:observer.resizeCalls.slice(m.resizeCallStart),focusLost:m.focusLost};
  };
  // CPU-side state only at the input boundary. GL metadata/shader queries belong
  // to snap() after the measured window, never in this listener or RAF wrapper.
  window.addEventListener('pointerdown',event=>{
    const m=observer.measurement,direction=event.target.closest('[data-move]')?.dataset.move;
    if(!m?.direction||m.inputAt!==undefined||direction!==m.direction)return;
    const at=performance.now(),g=window.__colossus.scene,s=window.__colossus.state,sign=direction==='left'?-1:1;
    m.inputAt=at;m.inputState={x:s.x,z:s.z,time:s.time,angle:s.angle,paused:s.paused};m.vector={x:Math.cos(g.yaw)*sign,z:-Math.sin(g.yaw)*sign};m.priorFrame=observer.lastFrame;
    m.inputObservationMs=performance.now()-at;
  },true);
  window.addEventListener('resize',()=>observer.resizeEvents.push({at:performance.now(),viewport:[innerWidth,innerHeight]}),true);
  window.addEventListener('blur',()=>{if(observer.measurement)observer.measurement.focusLost=true;});
  document.addEventListener('visibilitychange',()=>{if(observer.measurement&&document.hidden)observer.measurement.focusLost=true;});
  window.requestAnimationFrame=callback=>raf(now=>{
    if(callback.name!=='frame'){callback(now);return;}
    const m=observer.measurement,active=m&&!m.reached&&(!m.direction||m.inputAt!==undefined),startedAt=active?performance.now():null;
    try{callback(now);}finally{
      const endedAt=active?performance.now():null;observer.frames++;observer.lastFrame=now;
      if(active){
        const g=window.__colossus.scene,s=window.__colossus.state;
        m.frames.push({rafTimestamp:now,startedAt,endedAt,callbackMs:endedAt-startedAt,intervalMs:m.priorFrame===null?null:now-m.priorFrame,programCount:g.renderer.info.programs.length});m.priorFrame=now;
        if(m.direction){
          m.endState={x:s.x,z:s.z,time:s.time,angle:s.angle,paused:s.paused};const dx=s.x-m.inputState.x,dz=s.z-m.inputState.z;
          if(Math.hypot(dx,dz)>1e-6&&m.firstResponse===undefined)m.firstResponse=endedAt-m.inputAt;
          m.projectedDistance=dx*m.vector.x+dz*m.vector.z;if(m.projectedDistance>=60)m.reached=true;
        }
      }
    }
  });
  // Runs after the application's handler, before the next frame; no RAF freeze.
  window.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!window.__colossus)return;
    if(target?.id==='continue')observer.continueSnapshots.push(window.__colossus.snapshot());
    if(target?.id==='save'||target?.dataset.dialogAction==='save')observer.saveSnapshots.push({state:window.__colossus.snapshot(),raw:localStorage.getItem('colossus-wake-save-v1')});
  });
}
try{
  const health=await(await fetch(new URL('/health',base))).json();
  assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,hash(root.replaceAll('\\','/').toLowerCase()));report.server={url:base.href,health};
  const headless=process.env.HEADLESS!=='0';
  browser=await chromium.launch({channel:'chrome',headless,args:['--mute-audio','--enable-gpu','--use-angle=d3d11']});
  report.browser={version:browser.version(),channel:'chrome',headless};
  context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();report.remote.push(url.href);return route.abort();});
  await context.addInitScript(installObserver,{quality:'high'});
  page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(['warn','warning'].includes(m.type()))report.warnings.push(m.text());});
  page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()?.errorText}));
  await page.goto(new URL('?test=1',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0&&window.__colossus.scene.movementPreparation?.status.attempts>0);
  async function observeWorld(){await page.evaluate(()=>{
    const g=window.__colossus.scene,seen=new Set();
    g.world.traverse(o=>{for(const m of [o.material,o.customDepthMaterial,o.customDistanceMaterial].flat())if(m&&!seen.has(m)){seen.add(m);m.addEventListener('dispose',()=>window.__lifecycle.worldDisposals.push({id:m.uuid,name:m.name,frame:window.__lifecycle.frames}));}});
    for(const event of ['webglcontextlost','webglcontextrestored'])g.canvas.addEventListener(event,()=>window.__lifecycle.contextEvents.push({event,frame:window.__lifecycle.frames,at:performance.now()}));
    const resize=g.resize;g.resize=function(...args){const at=performance.now();try{return resize.apply(this,args);}finally{window.__lifecycle.resizeCalls.push({at,endedAt:performance.now(),wallMs:performance.now()-at,viewport:[innerWidth,innerHeight]});}};
  });}
  await observeWorld();
  async function frames(count=8){const start=await page.evaluate(()=>window.__lifecycle.frames);await page.waitForFunction(({start,count})=>window.__lifecycle.frames>=start+count,{start,count},{polling:'raf'});}
  async function pause(){if(!await page.evaluate(()=>window.__colossus.state.paused))await page.locator('#pause').click();assert.equal(await page.evaluate(()=>window.__colossus.state.paused),true);}
  async function snap(label,{verifyLinks=false}={}){
    const value=await page.evaluate(({label,verifyLinks})=>{
      const g=window.__colossus.scene,r=g.renderer,gl=r.getContext(),materials=new Map(),geometries=new Set(),invalidMatrices=[];
      const describe=m=>({uuid:m.uuid,name:m.name,type:m.type,shared:!!m.userData.shared,map:m.map?.uuid??null,alphaTest:m.alphaTest,side:m.side,
        cacheKey:m.customProgramCacheKey(),shaderHook:m.onBeforeCompile.toString()});
      g.world.traverse(o=>{if(o.geometry)geometries.add(o.geometry.uuid);for(const m of [o.material,o.customDepthMaterial,o.customDistanceMaterial].flat())if(m)materials.set(m.uuid,describe(m));});
      g.scene.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))invalidMatrices.push(o.uuid);});
      const program=(p,queryLink=false)=>{
        let linkStatus=null,linkQueryWallMs=null;
        if(queryLink){const at=performance.now();linkStatus=gl.getProgramParameter(p.program,gl.LINK_STATUS);linkQueryWallMs=performance.now()-at;}
        return{id:p.id,name:p.name,usedTimes:p.usedTimes,cacheKey:p.cacheKey,runnable:p.diagnostics?.runnable??null,linkStatus,linkQueryWallMs,
          vertexSource:p.vertexShader?gl.getShaderSource(p.vertexShader):null,fragmentSource:p.fragmentShader?gl.getShaderSource(p.fragmentShader):null};
      };
      const persistentCount=g.landscape.movementMaterials.length;
      const prepared=g.movementMaterials.map((mesh,index)=>{
        const owner=index<persistentCount?null:g.labels.find(site=>site.getObjectByProperty('uuid',mesh.uuid)===mesh);
        if(owner)for(const [object,kind]of [[mesh,'mesh'],[mesh.geometry,'geometry'],[mesh.material,'material']])if(!window.__lifecycle.watchedSiteObjects.has(object)){
          window.__lifecycle.watchedSiteObjects.add(object);const id=object.uuid,ownerId=owner.uuid;
          object.addEventListener('dispose',()=>window.__lifecycle[kind==='material'?'siteMaterialDisposals':'siteDisposals'].push({kind,id,owner:ownerId,frame:window.__lifecycle.frames,
            borrowedAtDisposal:g.movementMaterials.slice(persistentCount).map(m=>m.uuid)}));
        }
        return{mesh:mesh.uuid,name:mesh.name,geometry:mesh.geometry.uuid,material:describe(mesh.material),count:mesh.count,capacity:mesh.instanceMatrix?.count??null,visible:mesh.visible,
          owner:owner?.uuid??null,inScene:g.scene.getObjectByProperty('uuid',mesh.uuid)===mesh,isInstancedMesh:!!mesh.isInstancedMesh,
          shaderShape:{attributes:Object.keys(mesh.geometry.attributes).sort(),morphAttributes:Object.keys(mesh.geometry.morphAttributes).sort(),instancingColor:!!mesh.instanceColor},
          programs:r.properties.has(mesh.material)?[...(r.properties.get(mesh.material).programs?.values()??[])].map(p=>program(p,verifyLinks)):[]};
      });
      const siteMetals=[];
      for(const site of g.labels){
        const metal=site.getObjectByName('Resource site metal');if(!metal)continue;
        const node=site.getObjectByName('Resource selection')?.userData.node;
        for(const [object,kind]of [[metal,'mesh'],[metal.geometry,'geometry'],[metal.material,'material']])if(!window.__lifecycle.watchedSiteObjects.has(object)){
          window.__lifecycle.watchedSiteObjects.add(object);const id=object.uuid,owner=site.uuid;
          object.addEventListener('dispose',()=>window.__lifecycle[kind==='material'?'siteMaterialDisposals':'siteDisposals'].push({kind,id,owner,frame:window.__lifecycle.frames}));
        }
        siteMetals.push({site:site.uuid,node,mesh:metal.uuid,geometry:metal.geometry.uuid,material:describe(metal.material),
          isInstancedMesh:metal.isInstancedMesh===true,inScene:g.scene.getObjectByProperty('uuid',metal.uuid)===metal,
          shaderShape:{attributes:Object.keys(metal.geometry.attributes).sort(),morphAttributes:Object.keys(metal.geometry.morphAttributes).sort(),instancingColor:!!metal.instanceColor},
          sameMaterialAsRepresentative:metal.material===g.movementMaterials[persistentCount]?.material});
      }
      return{label,frame:window.__lifecycle.frames,world:g.world.uuid,worldGeometry:[...geometries].sort(),worldMaterials:[...materials.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid)),prepared,
        persistentWorldMeshes:g.landscape.movementMaterials.map(mesh=>({mesh:mesh.uuid,name:mesh.name})),preparationArray:window.__lifecycle.objectIdentity(g.movementMaterials),
        siteMetals,siteDisposals:[...window.__lifecycle.siteDisposals],siteMaterialDisposals:[...window.__lifecycle.siteMaterialDisposals],verifyLinks,
        preparation:{...g.movementPreparation.status},render:{...r.info.render},memory:{...r.info.memory},programs:(r.info.programs??[]).map(p=>program(p)),
        quality:g.quality,qualityPreference:localStorage.getItem('colossus-quality-v1'),light:g.light,buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],renderDpr:r.getPixelRatio(),shadowEnabled:r.shadowMap.enabled,
        viewport:[innerWidth,innerHeight],deviceDpr:devicePixelRatio,cameraProjection:{aspect:g.camera.aspect,matrix:g.camera.projectionMatrix.toArray()},
        preparationConfiguration:{quality:g.quality,light:g.light,environment:g.scene.environment?.uuid??null,materialKey:g.movementMaterialKey,siteMetalMaterial:g.movementMaterials[persistentCount]?.material.uuid??null,presentationEnabled:g.presentation.enabled,target:g.presentation.enabled?window.__lifecycle.objectIdentity(g.presentation.target):null},
        presentationTarget:{id:window.__lifecycle.objectIdentity(g.presentation.target),width:g.presentation.target.width,height:g.presentation.target.height,texture:g.presentation.target.texture.uuid,depthTexture:g.presentation.target.depthTexture?.uuid??null},invalidMatrices,
        sourceState:window.__colossus.snapshot(),savedRaw:localStorage.getItem('colossus-wake-save-v1'),worldDisposals:[...window.__lifecycle.worldDisposals],contextLost:gl.isContextLost(),contextEvents:[...window.__lifecycle.contextEvents],
        surfaces:g.surfaceDiagnostics(),city:{id:g.city.root.uuid,faction:g.city.faction,variant:g.city.variant},sites:g.labels.map(x=>({id:x.uuid,name:x.name}))};
    },{label,verifyLinks});
    // Hash shader text once outside browser rendering; retain identities/counts
    // rather than embedding duplicate large GLSL copies in the report.
    const program=p=>{for(const key of ['vertexSource','fragmentSource']){p[key+'Sha256']=p[key]===null?null:hash(p[key]);delete p[key];}return p;};
    for(const m of value.worldMaterials){m.shaderHookSha256=hash(m.shaderHook);delete m.shaderHook;}
    for(const m of value.prepared){m.material.shaderHookSha256=hash(m.material.shaderHook);delete m.material.shaderHook;m.programs.forEach(program);}
    for(const m of value.siteMetals){m.material.shaderHookSha256=hash(m.material.shaderHook);delete m.material.shaderHook;}
    value.programs.forEach(program);report.snapshots.push(value);
    assert.equal(value.contextLost,false,label);assert.equal(value.preparation.error,null,label);
    const persistentCount=value.persistentWorldMeshes.length,borrowed=value.prepared.slice(persistentCount);
    assert.equal(persistentCount,5,'Exactly two original pools and three imported pilot representatives');
    assert.deepEqual(value.persistentWorldMeshes.slice(0,2).map(m=>m.name),['Crushed tree stumps','Crushed fallen boughs']);
    assert.deepEqual(value.persistentWorldMeshes.slice(2).map(m=>m.name).sort(),['Meshy pilot Broadleaf canopies','Meshy pilot Pine boughs','Meshy pilot riverbank rocks'].sort());
    assert.equal(value.prepared.length,10);assert.equal(borrowed.length,5);assert.equal(borrowed[0].name,'Resource site metal');
    assert.deepEqual(borrowed.map(m=>m.material.name),['metal ffffff','rock ffffff painterly ruin','brick ffffff painterly ruin','stone bbb9a4 painterly ruin','pavement 90917e painterly ruin']);
    assert.deepEqual(borrowed.map(m=>m.isInstancedMesh),[true,true,true,false,false]);
    assert.deepEqual(borrowed.slice(1).map(m=>m.material.cacheKey),['painterly-ruin-stone-v3:world-metric-scenery-v3:painterly-bank-rock-v2','painterly-ruin-stone-v3:world-metric-scenery-v3','painterly-ruin-stone-v3','painterly-ruin-stone-v3']);
    assert.ok(borrowed.every(m=>m.owner&&m.inScene&&m.material.shared),label+': every borrowed mesh must have a current owner and shared material');
    assert.ok(value.prepared.slice(2,persistentCount).every(m=>!m.owner&&m.inScene&&m.material.shared&&m.isInstancedMesh),label+': imported representatives must remain owned by the persistent world');
    assert.equal(value.preparationConfiguration.materialKey,value.prepared.map(m=>m.material.uuid).join(':'));
    assert.deepEqual(value.prepared.slice(0,persistentCount).map(m=>({mesh:m.mesh,name:m.name})),value.persistentWorldMeshes,'Preparation must use every exact persistent landscape representative');
    assert.equal(new Set(value.prepared.map(m=>m.mesh)).size,10,label+': duplicate preparation resource');
    assert.ok(value.prepared.every(m=>m.programs.length>0),label+': every targeted material needs prepared programs');
    assert.ok(value.prepared.every(m=>m.capacity===null||m.count>=0&&m.count<=m.capacity),label+': invalid prepared instance count');
    const ironNodes=value.sourceState.nodes.filter(n=>n.kind==='iron').map(n=>n.id).sort();assert.deepEqual(value.siteMetals.map(m=>m.node).sort(),ironNodes,label+': missing or extra metal-bearing resource sites');
    assert.ok(value.siteMetals.length>0);assert.equal(borrowed[0].mesh,value.siteMetals[0].mesh,'Preparation must borrow the first currently owned Resource site metal mesh');
    assert.equal(borrowed[0].geometry,value.siteMetals[0].geometry);assert.deepEqual(borrowed[0].material,value.siteMetals[0].material);
    for(const metal of value.siteMetals){assert.equal(metal.isInstancedMesh,true);assert.equal(metal.inScene,true,'Stale site mesh in preparation');assert.equal(metal.sameMaterialAsRepresentative,true);assert.equal(metal.material.shared,true);assert.deepEqual(metal.material,borrowed[0].material);assert.deepEqual(metal.shaderShape,value.siteMetals[0].shaderShape,'Metal sites require different program configurations');}
    assert.deepEqual(value.siteMaterialDisposals,[],'Replacing a site disposed the shared material used by current sites/preparation');
    assert.ok(value.programs.every(p=>p.runnable!==false),label+': invalid shader program');assert.deepEqual(value.invalidMatrices,[]);
    if(verifyLinks)assert.ok(value.prepared.every(m=>m.programs.every(p=>p.linkStatus===true)),label+': targeted program is not linked; queried outside diagnostic timing');
    assert.deepEqual(value.surfaces.failures,[]);assert.ok(value.render.calls>0,label+': no ordinary rendering');
    return value;
  }
  const initial=await snap('title-initial');
  const stablePools=s=>s.prepared.slice(0,s.persistentWorldMeshes.length).map(m=>({mesh:m.mesh,geometry:m.geometry,material:m.material.uuid}));
  function preservedWorld(s,reference=initial){
    assert.equal(s.world,reference.world);assert.deepEqual(s.worldGeometry,reference.worldGeometry);assert.deepEqual(s.worldMaterials,reference.worldMaterials);
    assert.deepEqual(stablePools(s),stablePools(reference));assert.deepEqual(s.worldDisposals,[],'setGame disposed a material still owned by the persistent world');
    assert.equal(s.preparationArray,reference.preparationArray,'Preparation replaced its bounded current-resource list');
    assert.deepEqual(s.prepared.slice(s.persistentWorldMeshes.length).map(m=>m.material),reference.prepared.slice(reference.persistentWorldMeshes.length).map(m=>m.material),'Unchanged borrowed site materials were recreated or mutated');
    assert.deepEqual(s.prepared.slice(s.persistentWorldMeshes.length).map(m=>m.shaderShape),reference.prepared.slice(reference.persistentWorldMeshes.length).map(m=>m.shaderShape),'Rebuilt site representative shader shapes changed');
  }
  function replacedSite(before,after){
    assert.equal(before.persistentWorldMeshes.length,after.persistentWorldMeshes.length);
    for(let i=before.persistentWorldMeshes.length;i<before.prepared.length;i++){
      const old=before.prepared[i],current=after.prepared[i];
      assert.notEqual(current.mesh,old.mesh,'setGame retained a previous site mesh');assert.notEqual(current.geometry,old.geometry,'setGame retained disposed site geometry');
      assert.deepEqual(current.material,old.material,'Rebuilt sites lost shared material compatibility');
      for(const [kind,id]of [['geometry',old.geometry],...(old.isInstancedMesh?[['mesh',old.mesh]]:[])]){
        const events=after.siteDisposals.filter(e=>e.kind===kind&&e.id===id);assert.equal(events.length,1,'Previous site-owned '+kind+' was not disposed exactly once');
        assert.deepEqual(events[0].borrowedAtDisposal,[],'Borrowed references must be dropped before any owner disposes a targeted resource');
      }
      assert.ok(after.prepared.slice(after.persistentWorldMeshes.length).every(m=>m.mesh!==old.mesh&&m.geometry!==old.geometry),'Current preparation list retained old owned references');
    }
    assert.ok(after.siteMetals.every(m=>m.mesh!==before.prepared[before.persistentWorldMeshes.length].mesh&&m.geometry!==before.prepared[before.persistentWorldMeshes.length].geometry),'Current site list retained old owned references');
  }
  async function selectAndBegin(faction,variant,previous){
    await page.locator(`[data-faction="${faction}"]`).click();await page.locator(`[data-variant="${variant}"]`).click();await page.locator('#begin').click();
    if(await page.locator('[data-dialog-action="restart"]').isVisible())await page.locator('[data-dialog-action="restart"]').click();
    await pause();await frames();const s=await snap('begin-'+variant);preservedWorld(s);replacedSite(previous,s);assert.deepEqual([s.city.faction,s.city.variant],[faction,variant]);return s;
  }
  await selectAndBegin('crawler','standard',initial);
  // Establish real destruction through normal movement; do not inject saved IDs.
  const origin=await page.evaluate(()=>({x:window.__colossus.state.x,z:window.__colossus.state.z}));
  await page.locator('#pause').click();
  try{await page.keyboard.down('a');await page.waitForFunction(origin=>{const s=window.__colossus.state;return Math.hypot(s.x-origin.x,s.z-origin.z)>=60&&s.worldDamage.expedition.length>0;},origin,{polling:'raf',timeout:45000});}
  finally{await page.keyboard.up('a');}
  await pause();await frames();const damaged=await snap('real-movement-damage');preservedWorld(damaged);
  assert.ok(damaged.sourceState.worldDamage.expedition.length>0);report.checks.push('Real native movement created saved destruction; preparation retained every targeted pool identity, including the two original traced pools.');
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
  let previous=stable;
  for(let i=1;i<=3;i++){
    await title();const atTitle=await snap('title-cycle-'+i);preservedWorld(atTitle);replacedSite(previous,atTitle);
    const saved=JSON.parse(atTitle.savedRaw);await page.locator('#continue').click();
    const resumed=await page.evaluate(()=>window.__lifecycle.continueSnapshots.at(-1));
    // These are the established deserialize/Begin rules, not normalization to
    // excuse a new difference: deserialize sets paused=false and speed=1.
    assert.deepEqual(resumed,{...saved,paused:false,speed:1},'Continue changed saved progress beyond established pause/speed normalization');
    assert.deepEqual(resumed.worldDamage,saved.worldDamage);await pause();await frames();const after=await snap('continue-cycle-'+i);preservedWorld(after);replacedSite(atTitle,after);
    assert.equal(after.preparation.attempts,stable.preparation.attempts);assert.deepEqual(steadyPoolPrograms(after),steadyPoolPrograms(stable));
    previous=after;report.checks.push(`Title/Continue ${i}: exact resumed save at click boundary; two world-pool and three imported-mesh identities and all ten compatible material/program identities remain stable; all five borrowed site meshes/geometries are dropped before disposal, released once and rebound to their current owners.`);
  }
  for(const [faction,variant]of [['kaiju','cyborg'],['crawler','drill']]){
    await title();const before=await snap('before-carrier-'+variant);replacedSite(previous,before);const after=await selectAndBegin(faction,variant,before);
    assert.equal(after.preparation.attempts,before.preparation.attempts);assert.deepEqual(steadyPoolPrograms(after),steadyPoolPrograms(stable));
    previous=after;
  }
  report.checks.push('Actual cyborg/drill title choices preserve the exact two world pools and all ten shared material/program identities; the five borrowed meshes belong to rebuilt current sites, all old references are dropped before disposal and old owned geometries are disposed once.');
  await page.locator('#save').click();await frames();const beforeLoss=await snap('before-context-loss');
  await page.evaluate(()=>window.__colossus.scene.renderer.forceContextLoss());
  await page.waitForFunction(()=>window.__colossus.scene.renderer.getContext().isContextLost()&&window.__lifecycle.contextEvents.some(e=>e.event==='webglcontextlost'));
  const lostState=await page.evaluate(()=>({state:window.__colossus.snapshot(),savedRaw:localStorage.getItem('colossus-wake-save-v1'),attempts:window.__colossus.scene.movementPreparation.status.attempts}));
  assert.deepEqual(lostState.state,beforeLoss.sourceState);assert.equal(lostState.savedRaw,beforeLoss.savedRaw);assert.equal(lostState.attempts,beforeLoss.preparation.attempts);
  await page.evaluate(()=>window.__colossus.scene.renderer.forceContextRestore());
  await page.waitForFunction(attempts=>!window.__colossus.scene.renderer.getContext().isContextLost()&&window.__lifecycle.contextEvents.some(e=>e.event==='webglcontextrestored')&&window.__colossus.scene.movementPreparation.status.attempts===attempts+1,beforeLoss.preparation.attempts);
  await frames();const restored=await snap('after-context-restore',{verifyLinks:true});preservedWorld(restored);
  assert.deepEqual(restored.sourceState,beforeLoss.sourceState);assert.equal(restored.savedRaw,beforeLoss.savedRaw);assert.equal(restored.preparation.attempts,beforeLoss.preparation.attempts+1);
  const oldPrograms=new Set(beforeLoss.programs.map(p=>p.id));assert.ok(restored.programs.length>0);assert.ok(restored.programs.every(p=>!oldPrograms.has(p.id)),'Restored renderer retained stale program identities');
  assert.ok(restored.prepared.every(m=>m.programs.every(p=>!oldPrograms.has(p.id))));
  report.checks.push('Forced context loss/restore preserves paused state and saved bytes, rebuilds GPU programs, keeps CPU resource identity, and triggers exactly one preparation retry.');

  // A separate isolated phone session preserves real touch media queries and
  // device DPR while viewport changes exercise the production resize listener.
  // Do not substitute setQuality/setGame/resize calls or inject orientation events.
  await context.close();context=null;
  context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();report.remote.push(url.href);return route.abort();});
  await context.addInitScript(installObserver,{quality:'performance'});
  page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(['warn','warning'].includes(m.type()))report.warnings.push(m.text());});
  page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()?.errorText}));
  await page.goto(new URL('?test=1',base).href,{waitUntil:'domcontentloaded'});await page.bringToFront();
  await page.waitForFunction(()=>window.__colossus?.scene.environmentReady&&window.__colossus.scene.surfaceDiagnostics().pending===0&&window.__colossus.scene.movementPreparation?.status.attempts>0);
  await observeWorld();
  await page.locator('[data-faction="crawler"]').click();await page.locator('[data-variant="standard"]').click();await page.locator('#begin').click();await pause();await frames();
  async function phoneSave(){
    await page.locator('#mobile-menu').click();await page.locator('[data-dialog-action="save"]').click();await page.locator('[data-dialog-action="close"]').click();
    const event=await page.evaluate(()=>window.__lifecycle.saveSnapshots.at(-1));assert.deepEqual(JSON.parse(event.raw),event.state,'Phone UI save differs from state at its real save event');
  }
  await phoneSave();
  const phoneInitial=await snap('phone-portrait-initial');assert.equal(phoneInitial.quality,'performance');assert.equal(phoneInitial.qualityPreference,'performance');
  assert.deepEqual(phoneInitial.viewport,[390,844]);assert.deepEqual(phoneInitial.buffer,[331,717]);assert.equal(phoneInitial.deviceDpr,2);
  const contact=await context.newCDPSession(page);
  for(const transition of [{label:'portrait-to-landscape',viewport:{width:844,height:390},direction:'left'},{label:'landscape-to-portrait',viewport:{width:390,height:844},direction:'right'}]){
    await pause();const before=await snap('resize-before-'+transition.label);preservedWorld(before,phoneInitial);
    await page.evaluate(label=>window.__lifecycle.startWindow(label),transition.label);
    let resizeWindow;
    try{await page.setViewportSize(transition.viewport);await frames(24);}
    finally{resizeWindow=await page.evaluate(()=>window.__lifecycle.endWindow());report.resizeDiagnostics.push(resizeWindow);}
    const after=await snap('resize-after-'+transition.label);preservedWorld(after,phoneInitial);
    assert.ok(resizeWindow.resizeEvents.length>0,transition.label+': real resize event missing');assert.ok(resizeWindow.resizeCalls.length>0,transition.label+': production resize handler was not called');
    assert.ok(resizeWindow.frames.length>=24,transition.label+': missing measured resize frames');assert.equal(resizeWindow.focusLost,false,transition.label+': focus lost');
    assert.deepEqual(after.sourceState,before.sourceState,transition.label+': paused resize changed saved progress');assert.equal(after.savedRaw,before.savedRaw,transition.label+': resize changed saved bytes');
    assert.equal(after.quality,before.quality);assert.equal(after.qualityPreference,before.qualityPreference,'Resize changed the existing detail preference');assert.equal(after.renderDpr,before.renderDpr);assert.equal(after.deviceDpr,2);
    assert.deepEqual(after.viewport,[transition.viewport.width,transition.viewport.height]);
    const buffer=[Math.floor(transition.viewport.width*after.renderDpr),Math.floor(transition.viewport.height*after.renderDpr)];assert.deepEqual(after.buffer,buffer);assert.deepEqual([after.presentationTarget.width,after.presentationTarget.height],buffer);
    assert.equal(after.cameraProjection.aspect,transition.viewport.width/transition.viewport.height);assert.ok(after.cameraProjection.matrix.every(Number.isFinite));
    assert.equal(after.presentationTarget.id,before.presentationTarget.id);assert.equal(after.presentationTarget.texture,before.presentationTarget.texture);assert.equal(after.presentationTarget.depthTexture,before.presentationTarget.depthTexture);
    assert.deepEqual(after.preparationConfiguration,before.preparationConfiguration,'A viewport-only resize changed shader preparation configuration');
    assert.equal(after.preparation.attempts,before.preparation.attempts,'Viewport-only resize redundantly prepared an unchanged material/program configuration');
    assert.deepEqual(steadyPoolPrograms(after),steadyPoolPrograms(before),'Viewport-only resize retained stale or replaced compatible prepared programs');

    // First touch movement after each resize, 60 m projected along the actual
    // camera-relative control direction. The second route is a return over
    // visited ground, not a new cold-start or a matched first-use benchmark.
    const button=page.locator(`[data-move="${transition.direction}"]`);await button.waitFor({state:'visible'});const bounds=await button.boundingBox();assert.ok(bounds,'Real touch movement button missing after resize');
    await page.locator('#pause').click();
    await page.evaluate(({label,direction})=>window.__lifecycle.startWindow(label,direction),{label:'first-touch-after-'+transition.label,direction:transition.direction});
    let touchWindow;
    try{
      await contact.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2,id:1}]});
      await page.waitForFunction(()=>window.__lifecycle.measurement?.reached===true,null,{polling:'raf',timeout:45000});
    }finally{
      await contact.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      touchWindow=await page.evaluate(()=>window.__lifecycle.endWindow());report.resizeDiagnostics.push(touchWindow);
    }
    assert.ok(touchWindow.inputAt!==null,'No real touch pointer event reached the control');assert.equal(touchWindow.inputState.paused,false);assert.equal(touchWindow.reached,true);
    assert.ok(touchWindow.projectedDistance>=60&&touchWindow.projectedDistance<61.5,'Touch route exceeded one normal movement-step tolerance');assert.ok(touchWindow.firstRenderedMovementMs!==null);
    assert.equal(touchWindow.focusLost,false);assert.ok(touchWindow.frames.length>0);await pause();
    const moved=await snap('touch-after-'+transition.label,{verifyLinks:true});preservedWorld(moved,phoneInitial);
    assert.equal(moved.quality,before.quality);assert.equal(moved.qualityPreference,before.qualityPreference);assert.deepEqual(moved.buffer,buffer);assert.deepEqual(moved.preparationConfiguration,after.preparationConfiguration);
    assert.equal(moved.preparation.attempts,after.preparation.attempts,'Ordinary post-resize motion repeated unchanged preparation');
    assert.deepEqual(steadyPoolPrograms(moved),steadyPoolPrograms(after),'A prepared resource acquired a missing/incompatible program on first post-resize use');
    await phoneSave();
    report.checks.push(`${transition.label}: real resize retained paused state, save bytes, world/pool identities, quality preference and valid buffer/projection/targets; first native touch route recorded separately with unchanged preparation/program identities. Callback/RAF outliers remain in resizeDiagnostics and are not silently treated as passing performance.`);
  }
  await contact.detach();
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
