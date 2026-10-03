// Observe resource cost after ordinary Begin. This is deliberately separate
// from timed travel routes: reflection, hashing and GL metadata can be costly.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/painterly/resource-inventory');
const profiles=[
  {name:'desktop',viewport:{width:1440,height:960},deviceScaleFactor:1,mobile:false,quality:'high'},
  {name:'phone-portrait',viewport:{width:390,height:844},deviceScaleFactor:2,mobile:true,quality:'performance'},
  {name:'phone-landscape',viewport:{width:844,height:390},deviceScaleFactor:2,mobile:true,quality:'performance'}
].filter(profile=>!process.env.PROFILE||profile.name===process.env.PROFILE);
assert.ok(profiles.length,'Unknown PROFILE');
for(const key of['BASELINE_ROOT','CANDIDATE_ROOT','BASELINE_URL','CANDIDATE_URL'])assert.ok(process.env[key],key+' required');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
async function sourceEvidence(sourceRoot){
  const names=new Set([...git(sourceRoot,'ls-files','src','assets','vendor','index.html','package.json','package-lock.json').split('\n'),...git(sourceRoot,'ls-files','--others','--exclude-standard','src','assets','vendor').split('\n')]);
  const hashes={},deleted=[];
  for(const file of[...names].filter(Boolean).sort()){
    try{hashes[file]=hash(await fs.readFile(path.join(sourceRoot,file)));}catch(error){if(error.code!=='ENOENT')throw error;deleted.push(file);}
  }
  return{root:sourceRoot,commit:git(sourceRoot,'rev-parse','HEAD'),branch:git(sourceRoot,'branch','--show-current'),hashes,deleted,fingerprint:hash(JSON.stringify(hashes))};
}

async function inventory(){
  const T=await import('/vendor/three.module.js'),g=window.__colossus.scene,r=g.renderer,s=window.__colossus.state;
  const geometries=new Set(),materials=new Set(),textures=new Map(),buffers=new Set(),targets=new Map();
  let arrayBufferBytes=0,instancedMeshes=0,instanceCapacity=0,activeInstances=0,constructedTriangles=0;
  const addBuffer=array=>{if(array?.buffer&&!buffers.has(array.buffer)){buffers.add(array.buffer);arrayBufferBytes+=array.buffer.byteLength;}};
  const addAttribute=attribute=>addBuffer(attribute?.isInterleavedBufferAttribute?attribute.data.array:attribute?.array);
  function addTexture(texture,role){if(!texture?.isTexture)return;if(!textures.has(texture))textures.set(texture,new Set());textures.get(texture).add(role);}
  function uniformTextures(value,role,depth=0){
    if(!value||depth>4)return;
    if(value.isTexture){addTexture(value,role);return;}
    if(Array.isArray(value)){value.forEach((entry,i)=>uniformTextures(entry,role+'['+i+']',depth+1));return;}
    if(Object.getPrototypeOf(value)===Object.prototype)for(const[key,entry]of Object.entries(value))uniformTextures(entry,role+'.'+key,depth+1);
  }
  function addMaterial(material){
    if(!material||materials.has(material))return;materials.add(material);
    for(const[key,value]of Object.entries(material))if(value?.isTexture)addTexture(value,(material.name||material.type)+'.'+key);
    uniformTextures(material.uniforms,(material.name||material.type)+'.uniforms');
  }
  function walk(scene){scene?.traverse(object=>{
    const geometry=object.geometry;
    if(geometry&&!geometries.has(geometry)){
      geometries.add(geometry);for(const attribute of Object.values(geometry.attributes))addAttribute(attribute);addAttribute(geometry.index);
      for(const attributes of Object.values(geometry.morphAttributes))for(const attribute of attributes)addAttribute(attribute);
    }
    addAttribute(object.instanceMatrix);addAttribute(object.instanceColor);addTexture(object.morphTexture,'morphTexture');
    if(object.isInstancedMesh){instancedMeshes++;instanceCapacity+=object.instanceMatrix.count;activeInstances+=object.count;}
    if(object.isMesh)constructedTriangles+=(geometry.index?.count??geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);
    for(const material of[object.material,object.customDepthMaterial,object.customDistanceMaterial].flat())addMaterial(material);
    for(const texture of object.userData.surfaceTextures||[])addTexture(texture,(object.name||object.type)+'.surfaceTextures');
    if(object.shadow){addTarget(object.shadow.map,'shadow.map');addTarget(object.shadow.mapPass,'shadow.mapPass');}
  });}
  function addTarget(target,role){
    if(!target||targets.has(target))return;targets.set(target,role);
    for(const texture of target.textures||[target.texture])addTexture(texture,role+'.color');addTexture(target.depthTexture,role+'.depth');
  }
  walk(g.scene);walk(g.presentation?.scene);walk(g.presentation?.bloom?.scene);
  addTexture(g.scene.environment,'scene.environment');addTexture(g.scene.background,'scene.background');
  addTarget(g.environmentTarget,'environmentTarget');addTarget(g.presentation?.target,'presentation.target');
  for(const[targetIndex,target]of(g.presentation?.bloom?.targets||[]).entries())addTarget(target,'bloom.'+targetIndex);
  const constants=Object.fromEntries(Object.entries(T).filter(([name,value])=>typeof value==='number'&&/(Format|Type)$/.test(name)).map(([name,value])=>[value,name]));
  const channelCounts=new Map([[T.AlphaFormat,1],[T.RedFormat,1],[T.RedIntegerFormat,1],[T.RGFormat,2],[T.RGIntegerFormat,2],[T.RGBFormat,3],[T.RGBIntegerFormat,3],[T.RGBAFormat,4],[T.RGBAIntegerFormat,4],[T.DepthFormat,1],[T.DepthStencilFormat,1]]);
  const componentBytes=new Map([[T.UnsignedByteType,1],[T.ByteType,1],[T.ShortType,2],[T.UnsignedShortType,2],[T.HalfFloatType,2],[T.IntType,4],[T.UnsignedIntType,4],[T.FloatType,4]]);
  const packedBytes=new Map([[T.UnsignedShort4444Type,2],[T.UnsignedShort5551Type,2],[T.UnsignedInt248Type,4],[T.UnsignedInt5999Type,4],[T.Float32UnsignedInt248RevType,8]]);
  const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  const rows=[];
  for(const[texture,roles]of textures){
    const faces=Array.isArray(texture.image)?texture.image:[texture.image];
    const dimensions=faces.map(face=>({width:face?.width??0,height:face?.height??0,depth:face?.depth??1}));
    const bytesPerPixel=packedBytes.get(texture.type)??((componentBytes.get(texture.type)??0)*(channelCounts.get(texture.format)??0));
    let texelBytes=0,mipLevels=1,estimateAvailable=bytesPerPixel>0&&dimensions.every(d=>d.width>0&&d.height>0);
    const compressed=!!(texture.isCompressedTexture||texture.isCompressedArrayTexture);
    if(compressed){
      texelBytes=texture.mipmaps.reduce((sum,mip)=>sum+(mip.data?.byteLength??0),0);mipLevels=texture.mipmaps.length;estimateAvailable=texelBytes>0;
    }else if(texture.mipmaps.length){
      mipLevels=texture.mipmaps.length;texelBytes=texture.mipmaps.reduce((sum,mip)=>sum+(mip.width||0)*(mip.height||0)*(mip.depth||1)*bytesPerPixel,0)*faces.length;
    }else for(const image of dimensions){
      let{width,height,depth}=image,levels=0;
      const generated=texture.generateMipmaps&&![T.NearestFilter,T.LinearFilter].includes(texture.minFilter);
      do{texelBytes+=width*height*depth*bytesPerPixel;levels++;if(!generated||width===1&&height===1)break;width=Math.max(1,Math.floor(width/2));height=Math.max(1,Math.floor(height/2));}while(levels<32);
      mipLevels=Math.max(mipLevels,levels);
    }
    const dataHashes=[];const dataBuffers=new Set();let sourceArrayBytes=0;
    for(const image of[...faces,...texture.mipmaps])if(image?.data?.buffer&&!dataBuffers.has(image.data.buffer)){
      dataBuffers.add(image.data.buffer);sourceArrayBytes+=image.data.buffer.byteLength;
      dataHashes.push(await sha(new Uint8Array(image.data.buffer,image.data.byteOffset,image.data.byteLength)));
    }
    const urls=faces.map(image=>image?.currentSrc||image?.src||null).filter(Boolean).map(value=>{try{return new URL(value,location.href).pathname;}catch{return value;}});
    const publicAllocation=r.properties.has(texture)?r.properties.get(texture).__webglTexture!==undefined:false;
    const row={name:texture.name||'(unnamed)',type:texture.type,typeName:constants[texture.type]||null,format:texture.format,formatName:constants[texture.format]||null,colorSpace:texture.colorSpace,dimensions,mipLevels,estimatedTexelBytes:estimateAvailable?texelBytes:null,sourceArrayBytes,sourceDataSha256:dataHashes,urls,roles:[...roles].sort(),isRenderTargetTexture:!!texture.isRenderTargetTexture,rendererAllocationObserved:publicAllocation};
    row.signatureSha256=await sha(new TextEncoder().encode(JSON.stringify(row)));rows.push(row);
  }
  rows.sort((a,b)=>a.name.localeCompare(b.name)||a.signatureSha256.localeCompare(b.signatureSha256));
  const targetRows=[...targets].map(([target,role])=>({role,width:target.width,height:target.height,depth:target.depth,samples:target.samples,depthBuffer:target.depthBuffer,stencilBuffer:target.stencilBuffer,depthTexture:!!target.depthTexture,colorTextures:(target.textures||[target.texture]).length,allocationObserved:r.properties.has(target)&&!!r.properties.get(target).__webglFramebuffer}));
  const gl=r.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const timing=entry=>({path:new URL(entry.name,location.href).pathname,initiatorType:entry.initiatorType||'navigation',durationMs:entry.duration,transferSize:entry.transferSize,encodedBodySize:entry.encodedBodySize,decodedBodySize:entry.decodedBodySize,deliveryType:entry.deliveryType||null,responseStatus:entry.responseStatus??null});
  const requests=[...performance.getEntriesByType('navigation'),...performance.getEntriesByType('resource')].map(timing);
  return{at:new Date().toISOString(),environment:{viewport:[innerWidth,innerHeight],deviceDpr:devicePixelRatio,rendererDpr:r.getPixelRatio(),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],quality:g.quality,light:g.light,gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webgl:gl.getParameter(gl.VERSION),focused:document.hasFocus(),visibility:document.visibilityState},state:{x:s.x,z:s.z,time:s.time,angle:s.angle,paused:s.paused,moving:s.moving,faction:s.faction,variant:s.variant,mode:s.mode},camera:{view:g.view,yaw:g.yaw,pitch:g.pitch,zoom:g.zoom,position:g.camera.position.toArray(),aim:g.cameraAim.toArray()},render:{...r.info.render},rendererMemory:{...r.info.memory},programs:r.info.programs.length,surfaces:g.surfaceDiagnostics(),cpuGeometry:{geometryObjects:geometries.size,uniqueArrayBuffers:buffers.size,uniqueArrayBufferBytes:arrayBufferBytes,instancedMeshes,instanceCapacity,activeInstances,constructedTriangles},textureEstimate:{uniqueTextureObjects:rows.length,uniqueImageSources:new Set([...textures.keys()].map(t=>t.source)).size,knownObjectTexelBytes:rows.reduce((sum,row)=>sum+(row.estimatedTexelBytes||0),0),observedAllocatedObjectTexelBytes:rows.filter(row=>row.rendererAllocationObserved).reduce((sum,row)=>sum+(row.estimatedTexelBytes||0),0),unknownEstimates:rows.filter(row=>row.estimatedTexelBytes===null).length,rows},knownRenderTargets:targetRows,network:{requestCount:requests.length,encodedBodyBytes:requests.reduce((sum,row)=>sum+row.encodedBodySize,0),decodedBodyBytes:requests.reduce((sum,row)=>sum+row.decodedBodySize,0),transferBytes:requests.reduce((sum,row)=>sum+row.transferSize,0),zeroEncodedBodyEntries:requests.filter(row=>row.encodedBodySize===0).length,requests}};
}

await fs.mkdir(out,{recursive:true});await assert.rejects(fs.access(path.join(out,'report.json')),'Refuse to overwrite inventory evidence');
const report={protocol:'painterly-resource-inventory-v1',startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),environment:Object.fromEntries(['BASELINE_ROOT','CANDIDATE_ROOT','BASELINE_URL','CANDIDATE_URL','OUTPUT_DIR','PROFILE','HEADLESS'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]))},method:'One sequential baseline/candidate visit per profile. Fresh isolated storage; ordinary crawler/standard selection and Begin; native environment/texture readiness plus 12 native frames. No simulation/camera injection, travel, hidden warmup or timed-route instrumentation. Measurements are taken after play has begun.',limitations:['Windows Chrome; phone profiles are viewport/touch emulation, not physical Apple devices.','Texture bytes are format/dimension/mip estimates per unique reachable texture object, not measured GPU VRAM. Driver alignment, compression, aliasing between cloned texture sources, hidden renderer caches, renderbuffers and MSAA allocations are not included. Known render-target metadata is reported separately without claiming complete allocation accounting.','Geometry bytes count unique backing ArrayBuffers of currently reachable geometry and instance attributes, avoiding shared spatial-buffer double counting. They exclude JavaScript objects, detached/disposed resources and hidden caches.','Resource Timing encoded/decoded/transfer bytes are browser observations of this local development visit, not installation package size. Routing and fresh isolated contexts disable ordinary cache reuse; zero byte entries and delivery types are retained. OS/driver caches are uncontrolled.','Load times include browser orchestration, game title work and final environment readiness. They are one observation per profile and are not the three-pair first-use benchmark.','Hashing and renderer/GL reflection occur outside performance benchmarks. Ordinary time differences and camera pose are recorded.'],visits:[],pairs:[],assetWorkshopFiles:[],passed:false};
try{
  for(const profile of profiles)for(const label of['baseline','candidate']){
    const prefix=label.toUpperCase(),sourceRoot=await fs.realpath(process.env[prefix+'_ROOT']),base=new URL(process.env[prefix+'_URL']);
    assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'Only local game server permitted');
    const row={label,profile,startedAt:new Date().toISOString(),sourceStart:await sourceEvidence(sourceRoot),errors:[],warnings:[],remote:[],failedRequests:[]};report.visits.push(row);
    let browser,context;
    try{
      const health=await(await fetch(new URL('/health',base))).json();assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,hash(sourceRoot.replaceAll('\\','/').toLowerCase()));row.server={url:base.href,health};
      const headless=process.env.HEADLESS==='1',args=['--mute-audio','--enable-gpu','--use-angle=d3d11'];browser=await chromium.launch({channel:'chrome',headless,args});row.browser={version:browser.version(),channel:'chrome',headless,args};
      context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.deviceScaleFactor,isMobile:profile.mobile,hasTouch:profile.mobile,serviceWorkers:'block'});
      await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();row.remote.push(url.href);return route.abort();});
      await context.addInitScript(({quality})=>{localStorage.setItem('colossus-quality-v1',quality);performance.setResourceTimingBufferSize(4096);},{quality:profile.quality});
      const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',error=>row.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')row.errors.push(message.text());if(message.type()==='warning'||message.type()==='warn')row.warnings.push(message.text());});page.on('requestfailed',request=>row.failedRequests.push({url:request.url(),failure:request.failure()?.errorText}));page.on('response',response=>{if(response.status()>=400)row.errors.push('HTTP '+response.status()+' '+new URL(response.url()).pathname);});
      const started=performance.now();await page.goto(new URL('?test=1',base).href,{waitUntil:'domcontentloaded'});await page.bringToFront();await page.locator('#begin').waitFor({state:'visible'});await page.waitForFunction(()=>!!window.__colossus);row.navigationToUiReadyMs=performance.now()-started;
      await page.locator('[data-faction="crawler"]').click();await page.locator('[data-variant="standard"]').click();const begin=performance.now();await page.locator('#begin').click();row.beginClickCompletionMs=performance.now()-begin;
      await page.waitForFunction(()=>{const g=window.__colossus?.scene;return g&&!g.preview&&g.environmentReady&&g.surfaceDiagnostics().pending===0&&g.movementPreparation.status.attempts>0;});row.navigationToPlayingEnvironmentReadyMs=performance.now()-started;
      await page.evaluate(()=>new Promise(resolve=>{let remaining=12;const step=()=>--remaining?requestAnimationFrame(step):resolve();requestAnimationFrame(step);}));row.snapshot=await page.evaluate(inventory);
      assert.equal(row.snapshot.state.paused,false);assert.equal(row.snapshot.environment.quality,profile.quality);assert.deepEqual(row.snapshot.environment.viewport,[profile.viewport.width,profile.viewport.height]);assert.equal(row.snapshot.environment.deviceDpr,profile.deviceScaleFactor);assert.equal(row.snapshot.environment.visibility,'visible');
      assert.deepEqual(row.errors,[]);assert.deepEqual(row.failedRequests,[]);assert.deepEqual(row.remote,[]);assert.deepEqual(row.snapshot.surfaces.failures,[]);
      row.retiredGroundScanRequests=row.snapshot.network.requests.filter(request=>/\/assets\/materials\/(grass|soil)-(color|normal|roughness)\.jpg$/.test(request.path));
      if(label==='candidate')assert.deepEqual(row.retiredGroundScanRequests,[],'Candidate still fetches retired photographic ground scans');
      row.passed=true;
    }catch(error){row.failure=error.stack;throw error;}finally{if(context)await context.close();if(browser)await browser.close();row.sourceFinish=await sourceEvidence(sourceRoot);row.sourceStable=row.sourceStart.fingerprint===row.sourceFinish.fingerprint;row.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
    assert.equal(row.sourceStable,true,'Source changed while collecting inventory');
    if(label==='candidate'){
      const before=report.visits.at(-2).snapshot,after=row.snapshot;
      for(const key of['viewport','deviceDpr','rendererDpr','drawingBuffer','quality','light','gpu','webgl'])assert.deepEqual(before.environment[key],after.environment[key],'Paired '+key);
      for(const key of['x','z','angle','faction','variant','mode'])assert.deepEqual(before.state[key],after.state[key],'Paired starting state '+key);
      for(const key of['view','yaw','pitch','zoom'])assert.deepEqual(before.camera[key],after.camera[key],'Paired camera '+key);
      report.pairs.push({profile:profile.name,configurationMatched:true,nativeTimeDelta:after.state.time-before.state.time,geometryArrayBufferBytesDelta:after.cpuGeometry.uniqueArrayBufferBytes-before.cpuGeometry.uniqueArrayBufferBytes,estimatedTextureObjectBytesDelta:after.textureEstimate.knownObjectTexelBytes-before.textureEstimate.knownObjectTexelBytes,encodedResponseBodyBytesDelta:after.network.encodedBodyBytes-before.network.encodedBodyBytes});
    }
    console.log(JSON.stringify({event:'inventory-visit',profile:profile.name,label,passed:row.passed,source:row.sourceStart.fingerprint,geometryBytes:row.snapshot.cpuGeometry.uniqueArrayBufferBytes,textureEstimateBytes:row.snapshot.textureEstimate.knownObjectTexelBytes,encodedBodyBytes:row.snapshot.network.encodedBodyBytes}));
  }
  const workshop=path.join(process.env.CANDIDATE_ROOT,'artifacts','painterly-assets');
  for(const entry of await fs.readdir(workshop,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return[];throw error;}))if(entry.isFile()&&entry.name.endsWith('.glb')){
    const file=path.join(workshop,entry.name),bytes=await fs.readFile(file);report.assetWorkshopFiles.push({path:file,bytes:bytes.length,sha256:hash(bytes),runtimeTransfer:false,note:'Local editable-workshop GLB validation output; current runtime generates the same asset family from JavaScript and does not request this GLB.'});
  }
  report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();report.exitCode=process.exitCode||0;await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({passed:report.passed,report:path.join(out,'report.json'),failure:report.failure}));
