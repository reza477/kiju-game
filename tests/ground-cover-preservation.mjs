// Independent paired CPU construction. No renderer, real profile, or gameplay
// loop is created. GPU motion/quality/performance evidence is a separate task.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const baselineRevision=git('rev-parse',process.env.BASELINE_REV||'3193014c0ac7fd6c3ebc8cbe970938918974c8d2');
const origin=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4219/');
assert.ok(['localhost','127.0.0.1'].includes(origin.hostname),'Only local source is allowed.');
const output=path.resolve(process.env.OUTPUT_DIR||path.join(root,'artifacts/ground-cover/preservation'));
await fs.mkdir(output,{recursive:true});
await assert.rejects(fs.access(path.join(output,'report.json')),'Do not overwrite existing evidence.');
const scopes=['src','assets','vendor','index.html','package.json','package-lock.json'];
const baselineFiles=git('ls-tree','-r','--name-only',baselineRevision,'--',...scopes).split('\n').filter(Boolean).sort();
const baselineBytes=new Map(baselineFiles.map(file=>[file,execFileSync('git',['show',baselineRevision+':'+file],{cwd:root,maxBuffer:64*1024*1024})]));
const baselineHashes=Object.fromEntries([...baselineBytes].map(([file,bytes])=>[file,digest(bytes)]));
async function fingerprint(){
  const files=new Set([...git('ls-files',...scopes).split('\n'),...git('ls-files','--others','--exclude-standard',...scopes).split('\n')]);
  const hashes={};for(const file of [...files].filter(Boolean).sort())hashes[file]=digest(await fs.readFile(path.join(root,file)));
  return{commit:git('rev-parse','HEAD'),hashes,fingerprint:digest(JSON.stringify(hashes))};
}
const report={protocol:'ground-cover-preservation-v1',startedAt:new Date().toISOString(),baselineRevision,
  command:{executable:process.execPath,args:process.argv.slice(1),cwd:root,environment:{BASELINE_REV:baselineRevision,GAME_TEST_URL:origin.href,OUTPUT_DIR:output}},
  sourceStart:await fingerprint(),baselineSource:{hashes:baselineHashes,fingerprint:digest(JSON.stringify(baselineHashes))},
  method:'Two fresh isolated browser contexts construct the full production landscape and all six resource sites. Baseline modules come from the recorded Git revision; candidate modules come from the current checkout. Both preload the same existing Meshy assets and ground patch. No WebGLRenderer, requestAnimationFrame loop, user profile, or real save is used. Only meshes explicitly tagged groundCoverVolume may differ.',
  limitations:['CPU construction does not establish shader compilation, visual acceptance, animation quality, or frame rate. Those require separate final-build gameplay evidence.','The additive layer is noninteractive decoration, not new scenery records or saved destruction owners. It remains during existing scenery destruction.','This checks original scene data, resource selection proxies, simulation/save fixtures, and production scenery interactions. It does not exercise UI controls, physical Apple devices, installation or offline updates.'],
  loadedSources:{baseline:[],candidate:[]},errors:[],externalRequests:[],failedRequests:[],checks:[],passed:false};
const snapshots={};let browser;
try{
  const allowed=new Set(['src/landscape.js','src/ground-cover-volume.js','src/build-info.js']);
  const changed=[...new Set([...baselineFiles,...Object.keys(report.sourceStart.hashes)])].filter(file=>baselineHashes[file]!==report.sourceStart.hashes[file]);
  assert.ok(changed.every(file=>allowed.has(file)),'Unexpected runtime/asset changes: '+changed.filter(file=>!allowed.has(file)).join(', '));
  assert.ok(changed.includes('src/ground-cover-volume.js'),'The new decorative module is absent.');
  report.changedRuntime=changed;report.checks.push('Only landscape integration, the new ground-cover module and build metadata differ from baseline; all other runtime, assets and dependencies are byte-identical.');
  browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-gpu','--mute-audio']});report.browser=browser.version();
  for(const mode of ['baseline','candidate']){
    const context=await browser.newContext({serviceWorkers:'block'});
    try{
      const page=await context.newPage();page.setDefaultTimeout(240000);const seen=new Set();
      page.on('pageerror',error=>report.errors.push(mode+': '+error.message));
      page.on('console',message=>{if(message.type()==='error')report.errors.push(mode+': '+message.text());});
      page.on('requestfailed',request=>report.failedRequests.push({mode,url:request.url(),error:request.failure()?.errorText}));
      page.on('response',response=>{if(response.status()>=400)report.errors.push(mode+': HTTP '+response.status()+' '+response.url());});
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());if(['data:','blob:'].includes(url.protocol))return route.continue();
        if(url.origin!==origin.origin){report.externalRequests.push(url.href);return route.abort();}
        if(url.pathname==='/__ground_cover_preservation')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Ground cover CPU preservation fixture</title>'});
        if(url.pathname.startsWith('/src/')){
          const file=url.pathname.slice(1),bytes=mode==='baseline'?baselineBytes.get(file):await fs.readFile(path.join(root,file));
          assert.notEqual(bytes,undefined,'Missing '+mode+' module '+file);
          if(!seen.has(file)){seen.add(file);report.loadedSources[mode].push({file,sha256:digest(bytes)});}
          return route.fulfill({contentType:'application/javascript',body:bytes});
        }
        return route.continue();
      });
      await page.goto(new URL('/__ground_cover_preservation',origin).href);
      snapshots[mode]=await page.evaluate(async mode=>{
        const T=await import('/vendor/three.module.js');
        const {createLandscape,createResourceSite}=await import('/src/landscape.js');
        const sim=await import('/src/simulation.js'),terrain=await import('/src/terrain.js');
        const pilot=await import('/src/meshy-pilot.js'),patch=await import('/src/ground-patch.js');
        await pilot.loadMeshyPilot();await patch.loadGroundPatch();
        const ensure=(condition,message)=>{if(!condition)throw Error(message);};
        const same=(a,b,message)=>ensure(JSON.stringify(a)===JSON.stringify(b),message);
        const hash=async array=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(array.buffer,array.byteOffset,array.byteLength))),n=>n.toString(16).padStart(2,'0')).join('');
        const finite=(array,name)=>{for(const value of array)ensure(Number.isFinite(value),'Nonfinite '+name);};
        const attribute=async attr=>attr?{type:attr.array.constructor.name,itemSize:attr.itemSize,count:attr.count,normalized:attr.normalized,sha256:await hash(attr.array)}:null;
        const plain=value=>{
          if(value===null||['string','boolean','number'].includes(typeof value))return value;
          if(Array.isArray(value))return value.map(plain);
          if(ArrayBuffer.isView(value))return Array.from(value);
          if(value?.isVector2||value?.isVector3||value?.isVector4||value?.isColor||value?.isQuaternion||value?.isMatrix3||value?.isMatrix4)return value.toArray();
          return undefined;
        };
        ensure(pilot.meshyPilotStatus().state==='ready','Existing Meshy assets failed to load.');
        ensure(patch.groundPatchStatus().state==='ready','Existing ground patch failed to load.');
        const landscape=createLandscape(),sites=sim.WORLD_NODES.map(node=>({node,group:createResourceSite(node)}));
        const {surfaceDiagnostics}=await import('/src/surface-library.js');const start=performance.now();
        while(surfaceDiagnostics().pending){ensure(performance.now()-start<30000,'Existing surface decoding did not settle.');await new Promise(resolve=>setTimeout(resolve,25));}
        ensure(surfaceDiagnostics().failures.length===0,'An existing image failed decoding.');
        const groups=[{name:'landscape',group:landscape.group},...sites.map(({node,group})=>({name:'resource:'+node.id,group}))];
        const original=[],added=[],names=new Map(),inventory={meshes:0,instances:0,triangles:0};
        for(const {name:owner,group}of groups){group.updateMatrixWorld(true);group.traverse(mesh=>{
          if(!mesh.isMesh)return;
          for(const attr of [...Object.values(mesh.geometry.attributes),mesh.geometry.index,mesh.instanceMatrix,mesh.instanceColor].filter(Boolean))finite(attr.array,owner+'/'+mesh.name);
          if(mesh.geometry.index)for(const index of mesh.geometry.index.array)ensure(index>=0&&index<mesh.geometry.attributes.position.count,'Geometry index out of range.');
          finite(mesh.matrixWorld.elements,'world transform');inventory.meshes++;inventory.instances+=mesh.isInstancedMesh?mesh.count:1;
          inventory.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
          if(mesh.userData.groundCoverVolume){ensure(owner==='landscape','Cover changed a resource site.');added.push(mesh);return;}
          const label=owner+'/'+mesh.name,occurrence=names.get(label)||0;names.set(label,occurrence+1);original.push({key:label+'#'+occurrence,mesh});
        });}
        const textureCache=new WeakMap(),materialCache=new WeakMap();
        async function texture(tex){
          if(textureCache.has(tex))return textureCache.get(tex);
          const result={type:tex.constructor.name,name:tex.name,properties:{},image:null};textureCache.set(tex,result);
          for(const key of ['mapping','channel','wrapS','wrapT','magFilter','minFilter','anisotropy','format','internalFormat','type','offset','repeat','center','rotation','matrixAutoUpdate','matrix','generateMipmaps','premultiplyAlpha','flipY','unpackAlignment','colorSpace'])result.properties[key]=plain(tex[key]);
          const img=tex.image;if(img){result.image={width:img.width,height:img.height};if(img.data)result.image.sha256=await hash(img.data);else if(img.getContext){const context=img.getContext('2d');if(context)result.image.sha256=await hash(context.getImageData(0,0,img.width,img.height).data);}else if(img.currentSrc||img.src)result.image.src=img.currentSrc||img.src;}
          return result;
        }
        async function material(mat){
          if(!mat)return null;if(Array.isArray(mat))return Promise.all(mat.map(material));if(materialCache.has(mat))return materialCache.get(mat);
          const result={type:mat.type,name:mat.name,properties:{},textures:{},hook:mat.onBeforeCompile.toString(),cacheKey:mat.customProgramCacheKey()};materialCache.set(mat,result);
          for(const [key,value]of Object.entries(mat)){
            if(['id','uuid','version','name','type','userData'].includes(key))continue;
            if(value?.isTexture)result.textures[key]=await texture(value);else {const item=plain(value);if(item!==undefined)result.properties[key]=item;}
          }
          return result;
        }
        async function describe({key,mesh}){
          const attributes={};for(const [name,attr]of Object.entries(mesh.geometry.attributes))attributes[name]=await attribute(attr);
          const tags={};for(const [name,value]of Object.entries(mesh.userData)){const item=plain(value);if(item!==undefined)tags[name]=item;}
          return{key,transform:mesh.matrixWorld.elements.slice(),visible:mesh.visible,count:mesh.count,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,frustumCulled:mesh.frustumCulled,renderOrder:mesh.renderOrder,layers:mesh.layers.mask,attributes,index:await attribute(mesh.geometry.index),matrix:await attribute(mesh.instanceMatrix),color:await attribute(mesh.instanceColor),groups:mesh.geometry.groups,drawRange:mesh.geometry.drawRange,tags,raycast:mesh.raycast.toString(),material:await material(mesh.material),depth:await material(mesh.customDepthMaterial),distance:await material(mesh.customDistanceMaterial)};
        }
        const originalDescription=[];for(const entry of original)originalDescription.push(await describe(entry));
        const anchors=landscape.crushables;ensure(new Set(anchors.map(row=>row.id)).size===anchors.length,'Duplicate scenery IDs.');
        const cover=landscape.stats.groundCoverVolume??null;
        if(mode==='baseline')ensure(added.length===0&&cover===null,'Baseline unexpectedly includes the new cover.');
        if(mode==='candidate')ensure(added.length>0&&cover,'Expected new cover is absent.');
        const ray=new T.Raycaster(),addedNames=new Set(),addedDescription=[];
        for(const mesh of added){
          ensure(mesh.isInstancedMesh,'New cover must use instancing.');
          ensure(mesh.name&&!addedNames.has(mesh.name),'New cover drawable names must be unique.');addedNames.add(mesh.name);
          ensure(mesh.userData.noBatch===true,'Cover can be incorrectly merged into a picking batch.');
          for(const tag of ['node','ground','slot','enemy'])ensure(mesh.userData[tag]===undefined,'Cover created picking tag '+tag);
          ensure(!mesh.castShadow,'Tiny cover unexpectedly adds shadow draws.');
          ensure(mesh.count>=0&&mesh.count<=mesh.instanceMatrix.count,'Cover count exceeds capacity.');
          const matrix=new T.Matrix4(),position=new T.Vector3(),hits=[];
          for(const index of new Set([0,Math.max(0,Math.floor(mesh.count/2)),Math.max(0,mesh.count-1)])){
            mesh.getMatrixAt(index,matrix);position.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld);ray.set(position.clone().add(new T.Vector3(0,100,0)),new T.Vector3(0,-1,0));
            mesh.raycast(ray,hits);ensure(hits.length===0,'Decorative cover intercepted a ray.');
          }
          addedDescription.push(await describe({key:mesh.name,mesh}));
        }
        async function state(entries=original){
          const rows=[];for(const {key,mesh}of entries)rows.push({key,count:mesh.count,visible:mesh.visible,transform:mesh.matrixWorld.elements.slice(),matrix:mesh.instanceMatrix?await hash(mesh.instanceMatrix.array):null});return rows;
        }
        const addedEntries=added.map(mesh=>({key:mesh.name,mesh})),initial=await state(),coverInitial=await state(addedEntries),damage=[];
        // Restore every old saved ID, not merely those near the normal camera.
        // Groups are below the production 512-slot debris capacity.
        for(const interactionMode of ['expedition','battle'])for(let offset=0;offset<anchors.length;offset+=192){
          const ids=anchors.slice(offset,offset+192).map(row=>row.id),saved=ids.slice();
          landscape.resetInteractions({mode:interactionMode,damage:saved});same(saved,ids,'Old saved scenery IDs changed during restoration.');
          ensure(landscape.stats.destroyedCount===ids.length,'An old scenery ID failed restoration.');
          same(await state(addedEntries),coverInitial,'Independent cover acquired an existing destruction identity.');
          damage.push({mode:interactionMode,ids,original:await state(),pool:{...landscape.stats.poolDraw}});
        }
        landscape.resetInteractions();same(await state(),initial,'Reset changed original display matrices/counts.');same(await state(addedEntries),coverInitial,'Reset changed independent cover.');
        const productionContact=[];
        for(const kind of ['tree','rock']){
          const record=anchors.find(row=>row.kind===kind&&Math.abs(row.x)<160&&Math.abs(row.z)<160&&!terrain.protectedResource(row.x,row.z));ensure(record,'No representative '+kind+' record found.');
          for(const faction of ['crawler','kaiju']){
            landscape.resetInteractions();const saved=[],actor={id:'preservation-fixture',faction,variant:faction==='crawler'?'standard':'flesh',x:record.x,z:record.z-2,angle:0,moving:true,scale:1};
            landscape.interact([actor],1/60,{mode:'expedition',damage:saved});actor.z=record.z+2;landscape.interact([actor],1/60,{mode:'expedition',damage:saved});
            ensure(saved.includes(record.id),'Production '+faction+' contact did not destroy representative '+record.id);
            same(await state(addedEntries),coverInitial,'Production contact changed independent cover.');
            productionContact.push({faction,kind,target:record.id,saved,stats:{destroyedCount:landscape.stats.destroyedCount,trackCount:landscape.stats.trackCount,pool:{...landscape.stats.poolDraw}},original:await state()});
          }
        }
        landscape.resetInteractions();same(await state(),initial,'Production contact reset changed original scene.');
        ensure(landscape.stats.destroyedCount===0&&landscape.stats.poolDraw.submittedInstances===0,'Reset left destruction/pool work.');
        const picking=[];for(const {node,group}of sites){const proxy=group.getObjectByName('Resource selection');ensure(proxy?.userData.node===node.id,'Missing original resource picking proxy.');const position=proxy.getWorldPosition(new T.Vector3());ray.set(position.clone().add(new T.Vector3(0,100,0)),new T.Vector3(0,-1,0));const hits=ray.intersectObject(proxy,false);ensure(hits.length>0,'Existing resource proxy no longer ray-picks.');picking.push({node:node.id,proxy:proxy.name,hits:hits.map(hit=>({distance:hit.distance,point:hit.point.toArray(),faceIndex:hit.faceIndex}))});}
        const quality=[];for(const setting of ['high','balanced','medium','performance','low','retro','high']){landscape.setQuality(setting);quality.push({setting,original:await state(),cover:added.map(mesh=>({name:mesh.name,visible:mesh.visible,count:mesh.count}))});}
        const originalMotion=[];for(const [time,delta]of [[0,0],[.5,.1],[1,.1],[1,0],[2,.1]]){landscape.update(time,delta);landscape.group.updateMatrixWorld(true);originalMotion.push({time,delta,original:await state()});}
        const terrainSamples=[];
        for(let z=-600;z<=600;z+=10)for(let x=-600;x<=600;x+=10){const a=terrain.terrainNormal(x,z),b=terrain.scenerySelectionNormal(x,z);terrainSamples.push(x,z,terrain.terrainHeight(x,z),terrain.renderedTerrainHeight(x,z),terrain.scenerySelectionHeight(x,z),terrain.historicalRenderedTerrainHeight(x,z),a.x,a.y,a.z,b.x,b.y,b.z,terrain.riverX(z),terrain.riverWidth(z),terrain.shoreDistance(x,z),terrain.bankWidth(x,z),terrain.roadZ(x),Number(terrain.protectedResource(x,z)));}
        finite(terrainSamples,'terrain samples');
        const games=[];for(const [faction,variant]of [['kaiju','flesh'],['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']]){
          const game=sim.createGame(faction,variant);game.worldDamage.expedition=anchors.slice(0,40).map(row=>row.id);same(sim.deserialize(sim.serialize(game)),game,'Initial save roundtrip changed state.');
          const initialSave=sim.serialize(game);sim.travel(game,-65,-15);for(let i=0;i<480;i++)sim.tick(game,.125);
          for(let i=0;i<80;i++)sim.tick(game,.1,{x:i<40?1:0,z:i<40?0:1});
          same(sim.deserialize(sim.serialize(game)),game,'Progressed save roundtrip changed state.');games.push({faction,variant,initial:initialSave,progressed:sim.serialize(game)});
        }
        return{anchors,original:originalDescription,originalDressing:landscape.stats.groundDressing,terrain:{samples:terrainSamples.length/18,sha256:await hash(new Float64Array(terrainSamples))},games,damage,productionContact,picking,quality,originalMotion,cover,coverMeshes:addedDescription,inventory,surfaces:surfaceDiagnostics(),meshAssets:pilot.meshyPilotStatus(),groundPatch:patch.groundPatchStatus()};
      },mode);
    }finally{await context.close();}
  }
  for(const key of ['anchors','original','originalDressing','terrain','games','damage','productionContact','picking','originalMotion']){
    assert.deepEqual(snapshots.candidate[key],snapshots.baseline[key],key+' changed outside the additive cover.');report.checks.push(key+' exactly preserved.');
  }
  const originalQuality=value=>value.quality.map(({cover,...row})=>row);
  assert.deepEqual(originalQuality(snapshots.candidate),originalQuality(snapshots.baseline),'Original visibility/counts changed with quality settings.');
  report.checks.push('All original quality visibility/counts are exact; new instances have no picking tags, produce no ray hits and remain outside existing saved destruction identities.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.failedRequests,[]);
  report.checks.push('Finite original/new buffers and valid indices; identical local preloads; no external requests or browser errors.');report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{
  await browser?.close();report.finishedAt=new Date().toISOString();report.sourceFinish=await fingerprint();report.sourceStable=report.sourceStart.fingerprint===report.sourceFinish.fingerprint;
  if(!report.sourceStable){report.passed=false;report.sourceFailure='Runtime/assets changed during this evidence run.';process.exitCode=1;}
  for(const mode of ['baseline','candidate'])if(snapshots[mode]){
    const value=snapshots[mode];
    report[mode]={anchors:value.anchors.length,originalMeshes:value.original.length,originalSha256:digest(JSON.stringify(value.original)),oldDressingSha256:digest(JSON.stringify(value.originalDressing)),terrain:value.terrain,inventory:value.inventory,
      destructionRounds:value.damage.map(({mode,ids,pool})=>({mode,ids,pool})),contact:value.productionContact.map(({original,...row})=>row),picking:value.picking,simulationSha256:digest(JSON.stringify(value.games)),quality:value.quality.map(({setting,cover})=>({setting,cover})),cover:value.cover,coverMeshes:value.coverMeshes,meshAssets:value.meshAssets,groundPatch:value.groundPatch,surfaces:value.surfaces};
  }
  report.exitCode=process.exitCode||0;await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,exitCode:report.exitCode,checks:report.checks,failure:report.failure,report:path.join(output,'report.json')},null,2));
