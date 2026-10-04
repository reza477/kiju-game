// Paired CPU construction and exhaustive saved-ID ownership. This intentionally
// creates no WebGLRenderer, gameplay loop, screenshots or performance samples.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const baselineRevision=git('rev-parse',process.env.BASELINE_REV||'7c1496f8dc63522a55384d27e7c22e230bc5ded3');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4214/');
assert.ok(['localhost','127.0.0.1'].includes(base.hostname),'Only local source is allowed.');
const out=path.resolve(process.env.OUTPUT_DIR||path.join(root,'artifacts/ground-dressing/identity'));
await fs.mkdir(out,{recursive:true});
await assert.rejects(fs.access(path.join(out,'report.json')),'Do not overwrite existing test evidence.');
const files=git('ls-tree','-r','--name-only',baselineRevision,'--','src').split('\n').filter(Boolean);
const baseline=new Map(files.map(file=>['/'+file,execFileSync('git',['show',baselineRevision+':'+file],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024})]));
async function fingerprint(){
  const files=new Set([...git('ls-files','src','assets','vendor','index.html','package.json','package-lock.json').split('\n'),...git('ls-files','--others','--exclude-standard','src','assets','vendor').split('\n')]);
  const hashes={};for(const file of [...files].filter(Boolean).sort())hashes[file]=sha(await fs.readFile(path.join(root,file)));
  return{commit:git('rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
const report={startedAt:new Date().toISOString(),baselineRevision,sourceStart:await fingerprint(),command:{executable:process.execPath,args:process.argv.slice(1),environment:{BASELINE_REV:baselineRevision,GAME_TEST_URL:base.href,OUTPUT_DIR:out}},
  method:'Separate blank browser contexts construct production landscapes with every baseline src module served from the full recorded Git revision. Existing Meshy masters preload in BOTH versions. No renderer is created. All original display data is exact; only the ground material and explicitly tagged additive dressing are visual exceptions. Every original saved destruction ID is exercised in bounded groups in both modes.',
  limitations:['CPU construction is not visual acceptance, shader compilation, actual ray-picking, or performance evidence. Native functional and motion checks remain separate.','Ground material differences are allowed; unchanged ground geometry, terrain samplers, resource selection proxies and simulation/save bytes are compared exactly.','Added decorations use existing saved owners. These checks do not create new collisions, resources, progression or gameplay identities.'],
  source:{baseline:[],current:[]},checks:[],errors:[],remote:[],failedRequests:[],passed:false};
const snapshots={};let browser;
try{
  browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-gpu','--mute-audio']});report.browser=browser.version();
  for(const mode of ['baseline','current']){
    const context=await browser.newContext({serviceWorkers:'block'});
    try{
      const page=await context.newPage();page.setDefaultTimeout(180000);const seen=new Set();
      page.on('pageerror',error=>report.errors.push(mode+': '+error.message));
      page.on('console',message=>{if(message.type()==='error')report.errors.push(mode+': '+message.text());});
      page.on('requestfailed',request=>report.failedRequests.push({mode,url:request.url(),error:request.failure()?.errorText}));
      page.on('response',response=>{if(response.status()>=400)report.errors.push(mode+': HTTP '+response.status()+' '+response.url());});
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());if(['data:','blob:'].includes(url.protocol))return route.continue();
        if(url.origin!==base.origin){report.remote.push(url.href);return route.abort();}
        if(url.pathname==='/__ground_dressing_identity')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Ground dressing CPU identity fixture</title>'});
        if(url.pathname.startsWith('/src/')){
          const source=mode==='baseline'?baseline.get(url.pathname):await fs.readFile(path.join(root,url.pathname.slice(1)),'utf8');
          assert.notEqual(source,undefined,'Missing baseline module '+url.pathname);
          if(!seen.has(url.pathname)){seen.add(url.pathname);report.source[mode].push({file:url.pathname,sha256:sha(source)});}
          return route.fulfill({contentType:'application/javascript',body:source});
        }
        return route.continue();
      });
      await page.goto(new URL('/__ground_dressing_identity',base).href);
      snapshots[mode]=await page.evaluate(async mode=>{
        const T=await import('/vendor/three.module.js');
        const {createLandscape,createResourceSite}=await import('/src/landscape.js');
        const sim=await import('/src/simulation.js'),terrain=await import('/src/terrain.js');
        const pilot=await import('/src/meshy-pilot.js');await pilot.loadMeshyPilot();
        let groundPatch=null;
        if(mode==='current'){const patch=await import('/src/ground-patch.js');await patch.loadGroundPatch();groundPatch=patch.groundPatchStatus();}
        const ensure=(value,message)=>{if(!value)throw Error(message);};
        const equal=(a,b,message)=>ensure(JSON.stringify(a)===JSON.stringify(b),message);
        const hash=async array=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(array.buffer,array.byteOffset,array.byteLength))),n=>n.toString(16).padStart(2,'0')).join('');
        const typed=async attribute=>attribute?{type:attribute.array.constructor.name,itemSize:attribute.itemSize,count:attribute.count,normalized:attribute.normalized,sha256:await hash(attribute.array)}:null;
        const finite=(array,name)=>{for(const value of array)ensure(Number.isFinite(value),'Nonfinite '+name);};
        ensure(pilot.meshyPilotStatus().state==='ready','Existing Meshy assets must load in both versions.');
        const landscape=createLandscape(),sites=sim.WORLD_NODES.map(node=>({node,group:createResourceSite(node)}));
        const {surfaceDiagnostics}=await import('/src/surface-library.js');const started=performance.now();
        while(surfaceDiagnostics().pending){ensure(performance.now()-started<30000,'Surface decoding did not settle.');await new Promise(resolve=>setTimeout(resolve,25));}
        ensure(surfaceDiagnostics().failures.length===0,'A local image failed decoding.');
        const groups=[{name:'landscape',group:landscape.group},...sites.map(({node,group})=>({name:'resource:'+node.id,group}))];
        const old=[],added=[],names=new Map(),inventory={meshes:0,instances:0,triangles:0};
        for(const {name:owner,group}of groups){group.updateMatrixWorld(true);group.traverse(mesh=>{
          if(!mesh.isMesh)return;inventory.meshes++;
          for(const attribute of [...Object.values(mesh.geometry.attributes),mesh.geometry.index,mesh.instanceMatrix,mesh.instanceColor].filter(Boolean))finite(attribute.array,owner+'/'+mesh.name);
          if(mesh.geometry.index)for(const index of mesh.geometry.index.array)ensure(index>=0&&index<mesh.geometry.attributes.position.count,'Geometry index out of range.');
          finite(mesh.matrixWorld.elements,'world transform');
          inventory.instances+=mesh.isInstancedMesh?mesh.count:1;
          inventory.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
          if(mesh.userData.groundDressing){ensure(owner==='landscape','Dressing modified a resource site.');added.push(mesh);return;}
          const label=owner+'/'+mesh.name,occurrence=names.get(label)||0;names.set(label,occurrence+1);old.push({key:label+'#'+occurrence,mesh});
        });}
        const material=mat=>mat?{name:mat.name,type:mat.type,color:mat.color?.toArray(),roughness:mat.roughness,metalness:mat.metalness,opacity:mat.opacity,transparent:mat.transparent,alphaTest:mat.alphaTest,depthWrite:mat.depthWrite,side:mat.side,vertexColors:mat.vertexColors,normalScale:mat.normalScale?.toArray(),cacheKey:mat.customProgramCacheKey(),hook:mat.onBeforeCompile.toString(),textures:Object.fromEntries(Object.entries(mat).filter(([,v])=>v?.isTexture).map(([key,v])=>[key,{name:v.name,colorSpace:v.colorSpace,wrapS:v.wrapS,wrapT:v.wrapT,repeat:v.repeat.toArray(),offset:v.offset.toArray(),channel:v.channel,width:v.image?.width,height:v.image?.height}]))}:null;
        async function describe({key,mesh}){
          const attributes={};for(const [name,attribute]of Object.entries(mesh.geometry.attributes))attributes[name]=await typed(attribute);
          return{key,transform:mesh.matrixWorld.elements.slice(),visible:mesh.visible,count:mesh.count,attributes,index:await typed(mesh.geometry.index),matrix:await typed(mesh.instanceMatrix),color:await typed(mesh.instanceColor),tags:Object.fromEntries(['node','ground','slot','enemy','spatialBatch','spatialIndices','windAnimated'].filter(key=>mesh.userData[key]!==undefined).map(key=>[key,mesh.userData[key]])),material:mesh===landscape.ground?'AUTHORIZED GROUND MATERIAL CHANGE':material(mesh.material),depth:material(mesh.customDepthMaterial),distance:material(mesh.customDistanceMaterial)};
        }
        const original=[];for(const entry of old)original.push(await describe(entry));
        const anchors=landscape.crushables;ensure(new Set(anchors.map(record=>record.id)).size===anchors.length,'Duplicate scenery IDs.');
        const byId=new Map(anchors.map(record=>[record.id,record]));
        const dressing=landscape.stats.groundDressing??null;
        if(mode==='baseline')ensure(added.length===0&&dressing===null,'Baseline unexpectedly contains new dressing.');
        if(mode==='current')ensure(added.length>0&&dressing,'Expected added dressing is absent.');
        const owners=new Map();
        for(const mesh of added){
          ensure(mesh.isInstancedMesh,'Dressing must use explicit instanced ownership.');
          ensure(!mesh.userData.node&&!mesh.userData.ground&&mesh.userData.slot===undefined&&!mesh.userData.enemy,'Dressing added a picking identity.');
          ensure(mesh.name&&!owners.has(mesh.name),'Dressing names must be unique for ownership evidence.');
          ensure(mesh.count===mesh.instanceMatrix.count,'Dressing must start with its recorded complete capacity.');
          owners.set(mesh.name,{mesh,ids:new Array(mesh.count),original:new Float32Array(mesh.instanceMatrix.array)});
        }
        // This metadata is descriptive only. Each claimed link is proved below
        // by destroying its actual saved owner through production interactions.
        for(const record of dressing?.owners||[]){
          ensure(byId.has(record.id),'Decoration invented a new saved owner: '+record.id);
          for(const range of record.batches){
            const owned=owners.get(range.name);ensure(owned,'Unknown decorative batch '+range.name);
            ensure(Number.isInteger(range.first)&&Number.isInteger(range.count)&&range.first>=0&&range.count>0&&range.first+range.count<=owned.ids.length,'Invalid decorative owner range.');
            for(let i=range.first;i<range.first+range.count;i++){ensure(owned.ids[i]===undefined,'Decoration has two owners.');owned.ids[i]=record.id;}
          }
        }
        for(const [name,owner]of owners)ensure(owner.ids.every(Boolean)&&Array.from({length:owner.ids.length},(_,i)=>owner.ids[i]).every(Boolean),'Unowned decorative slot: '+name);
        const dressingMatrices=async()=>{const result=[];for(const [name,{mesh,ids}]of owners)result.push({name,kind:mesh.userData.groundDressing,count:mesh.count,owners:ids,matrix:await typed(mesh.instanceMatrix)});return result;};
        const addedInitial=await dressingMatrices(),damage=[];
        async function state(){const rows=[];for(const {key,mesh}of old)if(mesh.isInstancedMesh)rows.push({key,count:mesh.count,visible:mesh.visible,matrix:await hash(mesh.instanceMatrix.array)});return rows;}
        const initialState=await state();
        for(const interactionMode of ['expedition','battle'])for(let offset=0;offset<anchors.length;offset+=96){
          const ids=anchors.slice(offset,offset+96).map(record=>record.id),saved=ids.slice(),selected=new Set(ids);
          landscape.resetInteractions({mode:interactionMode,damage:saved});equal(saved,ids,'Saved IDs were mutated.');
          ensure(landscape.stats.destroyedCount===ids.length,'A saved owner failed restoration.');
          let hiddenAdded=0;
          for(const [name,{mesh,ids:owned,original}]of owners)for(let i=0;i<owned.length;i++){
            const row=mesh.instanceMatrix.array.subarray(i*16,i*16+16),hidden=row[13]===-5000;
            ensure(hidden===selected.has(owned[i]),'Decorative ownership mismatch: '+name+':'+i+' owner '+owned[i]);
            if(hidden)hiddenAdded++;else equal(Array.from(row),Array.from(original.subarray(i*16,i*16+16)),'Unrelated decoration moved.');
          }
          damage.push({mode:interactionMode,ids,original:await state(),hiddenAdded});
        }
        landscape.resetInteractions();equal(await state(),initialState,'Original display reset changed matrices/counts.');equal(await dressingMatrices(),addedInitial,'Decoration reset changed matrices/ownership.');
        ensure(landscape.stats.destroyedCount===0&&landscape.stats.poolDraw.submittedInstances===0,'Reset left destruction/pool work.');
        const terrainSamples=[];
        for(let z=-600;z<=600;z+=10)for(let x=-600;x<=600;x+=10){const a=terrain.terrainNormal(x,z),b=terrain.scenerySelectionNormal(x,z);terrainSamples.push(x,z,terrain.terrainHeight(x,z),terrain.renderedTerrainHeight(x,z),terrain.scenerySelectionHeight(x,z),terrain.historicalRenderedTerrainHeight(x,z),a.x,a.y,a.z,b.x,b.y,b.z,terrain.riverX(z),terrain.riverWidth(z),terrain.shoreDistance(x,z),terrain.bankWidth(x,z),terrain.roadZ(x),Number(terrain.protectedResource(x,z)));}
        finite(terrainSamples,'terrain samples');
        const games=[];for(const [faction,variant]of [['kaiju','flesh'],['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']]){const value=sim.createGame(faction,variant);value.worldDamage.expedition=anchors.slice(0,40).map(a=>a.id);equal(sim.deserialize(sim.serialize(value)),value,'Save roundtrip changed state.');games.push(value);}
        return{anchors,original,terrain:{samples:terrainSamples.length/18,sha256:await hash(new Float64Array(terrainSamples))},games,damage,addedInitial,dressing,inventory,groundPatch,surfaces:surfaceDiagnostics(),meshAssets:pilot.meshyPilotStatus()};
      },mode);
    }finally{await context.close();}
  }
  for(const key of ['anchors','original','terrain','games']){assert.deepEqual(snapshots.current[key],snapshots.baseline[key],key+' changed outside the authorized visual additions.');report.checks.push(key+' exactly preserved.');}
  const oldDamage=snapshot=>snapshot.damage.map(({hiddenAdded,...row})=>row);
  assert.deepEqual(oldDamage(snapshots.current),oldDamage(snapshots.baseline),'Existing saved destruction behavior changed.');
  report.checks.push('Every original scenery ID preserves its exact existing hidden geometry/debris results in expedition and battle.');
  report.checks.push('Each new decorative instance hides only with its declared existing owner; reset restores its exact original matrix. No new picking tags or saved IDs.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.failedRequests,[]);
  report.checks.push('All inspected buffers/transforms are finite; both versions loaded existing local assets; no external requests or browser errors.');report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{
  await browser?.close();report.finishedAt=new Date().toISOString();report.sourceFinish=await fingerprint();
  report.sourceStable=report.sourceStart.fingerprint===report.sourceFinish.fingerprint;
  if(!report.sourceStable){report.passed=false;report.sourceFailure='Runtime/assets changed during the evidence run.';process.exitCode=1;}
  for(const mode of ['baseline','current'])if(snapshots[mode]){const value=snapshots[mode];report[mode]={anchors:value.anchors.length,originalMeshes:value.original.length,originalSha256:sha(JSON.stringify(value.original)),terrain:value.terrain,inventory:value.inventory,damageRounds:value.damage.map(({mode,ids,hiddenAdded})=>({mode,ids,hiddenAdded})),dressing:value.dressing,addedInitial:value.addedInitial,groundPatch:value.groundPatch,surfaces:value.surfaces,meshAssets:value.meshAssets};}
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,checks:report.checks,failure:report.failure,report:path.join(out,'report.json')},null,2));
