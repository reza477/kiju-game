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
const baselineRevision=git('rev-parse',process.env.BASELINE_REV||'8972f9ed72b91dc45ec9712d0271c5688a8aa42b');
const origin=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4219/');
assert.ok(['localhost','127.0.0.1'].includes(origin.hostname),'Only local source is allowed.');
const output=path.resolve(process.env.OUTPUT_DIR||path.join(root,'artifacts/meshy-tree-coverage/preservation'));
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
const report={protocol:'meshy-tree-coverage-preservation-v1',toolSha256:digest(await fs.readFile(fileURLToPath(import.meta.url))),startedAt:new Date().toISOString(),baselineRevision,
  command:{executable:process.execPath,args:process.argv.slice(1),cwd:root,environment:{BASELINE_REV:baselineRevision,GAME_TEST_URL:origin.href,OUTPUT_DIR:output}},
  sourceStart:await fingerprint(),baselineSource:{hashes:baselineHashes,fingerprint:digest(JSON.stringify(baselineHashes))},
  method:'Two fresh isolated browser contexts construct the full production landscape and all six resource sites. Baseline modules come from the recorded Git revision; candidate modules come from the current checkout. Both preload the same existing Meshy assets and ground patch. No WebGLRenderer, requestAnimationFrame loop, user profile, or real save is used. Only standing generated tree parts may be replaced. A single recorded observation hook exposes original Instances storage; it observes references after finish and changes neither scene data nor randomness. The motion/performance driver uses unmodified production source.',
  limitations:['CPU construction does not establish shader compilation, visual acceptance, animation quality, or frame rate. Those require separate final-build gameplay evidence.','Replacement standing trees retain existing world roots and saved IDs. Ownerless resource trees are checked separately and must remain ownerless. This does not assert unchanged tree silhouettes, which are the intended visual change.','This checks original scene data, resource selection proxies, simulation/save fixtures, and production scenery interactions. It does not exercise UI controls, physical Apple devices, installation or offline updates.'],
  loadedSources:{baseline:[],candidate:[]},errors:[],externalRequests:[],failedRequests:[],checks:[],passed:false};
const observationHook={original:'this.mesh = mesh; return mesh;',replacement:'this.mesh = mesh; globalThis.__treeCoverageCpuBatches?.push({batch:this,mesh,name}); return mesh;'};
report.observationHook={...observationHook,modules:{}};
const snapshots={};let browser;
try{
  const allowed=new Set(['src/landscape.js','src/meshy-pilot.js','src/build-info.js','assets/scenery/meshy-pilot/pine-lods.glb','assets/scenery/meshy-pilot/broadleaf-lods.glb']);
  const changed=[...new Set([...baselineFiles,...Object.keys(report.sourceStart.hashes)])].filter(file=>baselineHashes[file]!==report.sourceStart.hashes[file]);
  assert.ok(changed.every(file=>allowed.has(file)),'Unexpected runtime/asset changes: '+changed.filter(file=>!allowed.has(file)).join(', '));
  for(const file of ['src/landscape.js','src/meshy-pilot.js','assets/scenery/meshy-pilot/pine-lods.glb','assets/scenery/meshy-pilot/broadleaf-lods.glb'])assert.ok(changed.includes(file),'Expected tree-coverage change absent: '+file);
  report.changedRuntime=changed;report.checks.push('Only landscape/tree-loader integration, two local geometry-only GLBs and build metadata differ from baseline; all other runtime, assets and dependencies are byte-identical.');
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
        if(url.pathname==='/__meshy_tree_coverage_preservation')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Meshy tree CPU preservation fixture</title>'});
        if(url.pathname.startsWith('/src/')){
          const file=url.pathname.slice(1),bytes=mode==='baseline'?baselineBytes.get(file):await fs.readFile(path.join(root,file));
          assert.notEqual(bytes,undefined,'Missing '+mode+' module '+file);
          if(!seen.has(file)){seen.add(file);report.loadedSources[mode].push({file,sha256:digest(bytes)});}
          let body=bytes;
          if(file==='src/landscape.js'){
            const source=bytes.toString('utf8');assert.equal(source.split(observationHook.original).length-1,1,'Expected exactly one nonmutating observation hook.');
            body=Buffer.from(source.replace(observationHook.original,observationHook.replacement));
            report.observationHook.modules[mode]={originalSha256:digest(bytes),transformedSha256:digest(body),occurrences:1};
          }
          return route.fulfill({contentType:'application/javascript',body});
        }
        return route.continue();
      });
      await page.goto(new URL('/__meshy_tree_coverage_preservation',origin).href);
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
        globalThis.__treeCoverageCpuBatches=[];
        const landscape=createLandscape(),sites=sim.WORLD_NODES.map(node=>({node,group:createResourceSite(node)}));
        const {surfaceDiagnostics}=await import('/src/surface-library.js');const start=performance.now();
        while(surfaceDiagnostics().pending){ensure(performance.now()-start<30000,'Existing surface decoding did not settle.');await new Promise(resolve=>setTimeout(resolve,25));}
        ensure(surfaceDiagnostics().failures.length===0,'An existing image failed decoding.');
        const groups=[{name:'landscape',group:landscape.group},...sites.map(({node,group})=>({name:'resource:'+node.id,group}))];
        const proceduralName=/^(Distant )?(Tree trunks and branches|Broadleaf canopies|Pine boughs)$/;
        const original=[],added=[],names=new Map(),inventory={meshes:0,instances:0,triangles:0};
        for(const {name:owner,group}of groups){group.updateMatrixWorld(true);group.traverse(mesh=>{
          if(!mesh.isMesh)return;
          for(const attr of [...Object.values(mesh.geometry.attributes),mesh.geometry.index,mesh.instanceMatrix,mesh.instanceColor].filter(Boolean))finite(attr.array,owner+'/'+mesh.name);
          if(mesh.geometry.index)for(const index of mesh.geometry.index.array)ensure(index>=0&&index<mesh.geometry.attributes.position.count,'Geometry index out of range.');
          finite(mesh.matrixWorld.elements,'world transform');inventory.meshes++;inventory.instances+=mesh.isInstancedMesh?mesh.count:1;
          inventory.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
          if(mesh.userData.meshyTreeCoverage){added.push({owner,mesh});return;}
          if(proceduralName.test(mesh.name))return;
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
        ensure(cover,'The completed ground-cover layer is absent.');
        const coverage=landscape.stats.meshyTreeCoverage??null;
        if(mode==='baseline')ensure(added.length===0&&coverage===null,'Baseline unexpectedly includes tree replacement.');
        if(mode==='candidate')ensure(added.length>0&&coverage?.near?.state==='ready'&&coverage?.distant?.state==='ready','Candidate tree coverage is absent.');
        const ray=new T.Raycaster(),addedDescription=[];
        for(const {owner,mesh}of added){
          ensure(mesh.isInstancedMesh,'New trees must use instancing.');
          ensure(['pine','broadleaf'].includes(mesh.userData.meshyTreeCoverage),'Unknown imported tree species.');
          ensure(mesh.userData.meshyPilot===mesh.userData.meshyTreeCoverage,'Tree lost imported asset identity.');
          ensure(mesh.userData.noBatch===true,'Tree can be incorrectly merged into a picking batch.');
          for(const tag of ['node','ground','slot','enemy'])ensure(mesh.userData[tag]===undefined,'Tree created picking tag '+tag);
          ensure(mesh.count>=0&&mesh.count<=mesh.instanceMatrix.count,'Tree count exceeds capacity.');
          addedDescription.push(await describe({key:owner+'/'+mesh.name+'/'+(mesh.userData.spatialCell??'single'),mesh}));
        }
        // Canonical storage is deliberately outside the rendered scene when it
        // has spatial chunks. Observe it rather than guessing ownership from
        // generated windRoot attributes, which also exist for rootless shrubs.
        const batches=globalThis.__treeCoverageCpuBatches.map(entry=>{
          const match=groups.find(({group})=>group===entry.batch.group);ensure(match,'Unrecognized batch owner.');
          return{...entry,owner:match.name,key:match.name+'/'+entry.name};
        });
        ensure(batches.length>0,'Observation hook did not execute.');
        const rootless=batches.filter(entry=>proceduralName.test(entry.name)&&entry.batch.items.some(item=>!item.windRoot));
        const imported=batches.filter(entry=>entry.mesh.userData.meshyTreeCoverage);
        const sourceTrees=batches.filter(entry=>mode==='baseline'?proceduralName.test(entry.name):entry.mesh.userData.meshyTreeCoverage);
        const rootMap=new Map();
        for(const {owner,name,batch}of sourceTrees)for(const item of batch.items){
          if(!item.windRoot)continue;
          const level=name.startsWith('Distant ')||name.startsWith('Meshy far ')?'far':'near',key=owner+'/'+level+'/'+item.windRoot.join(',');
          const kind=name.endsWith('Pine boughs')?'pine':'broadleaf';
          if(!rootMap.has(key))rootMap.set(key,{key,owner,level,root:item.windRoot.slice(),kind});
          if(kind==='pine')rootMap.get(key).kind=kind;
        }
        const roots=[...rootMap.values()].sort((a,b)=>a.key.localeCompare(b.key));
        const anchorByRoot=new Map(anchors.filter(row=>row.kind==='tree').map(row=>[[row.x,row.z].join(','),row.id]));
        for(const row of roots)row.owners=row.owner==='landscape'&&anchorByRoot.has([row.root[0],row.root[2]].join(','))?[anchorByRoot.get([row.root[0],row.root[2]].join(','))]:[];
        const pilotRecords=landscape.stats.meshyPilot.records.filter(row=>row.kind==='pine'||row.kind==='broadleaf');
        ensure(pilotRecords.length===6,'The six previously accepted pilot trees changed count.');
        ensure(roots.filter(row=>row.owner==='landscape'&&row.owners.length).length+pilotRecords.length===anchors.filter(row=>row.kind==='tree').length,'Standing tree root ownership did not cover every existing tree anchor.');
        if(mode==='candidate'){
          ensure(batches.filter(entry=>proceduralName.test(entry.name)).every(entry=>entry.batch.items.every(item=>!item.windRoot)),'A standing procedural tree remains.');
          const actual=roots.filter(row=>row.owner==='landscape').map(({level,root,kind,owners})=>({level,root,kind,owners})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
          const stated=Object.values(coverage).flatMap(part=>{ensure(part.count===part.roots.length,'Coverage count does not equal roots.');return part.roots.map(row=>({...row,level:part.level}));}).map(({level,root,kind,owners})=>({level,root,kind,owners})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
          same(actual,stated,'World coverage owner metadata differs from actual production roots.');
        }
        const canonicalAttributes=async mesh=>{
          const attributes={};for(const[name,attr]of Object.entries(mesh.geometry.attributes))if(!attr.isInstancedBufferAttribute)attributes[name]=await attribute(attr);
          return{attributes,index:await attribute(mesh.geometry.index),groups:mesh.geometry.groups,drawRange:mesh.geometry.drawRange};
        };
        const rootlessDescription=[];
        for(const entry of rootless)rootlessDescription.push({key:entry.key,geometry:await canonicalAttributes(entry.mesh),material:await material(entry.mesh.material),depth:await material(entry.mesh.customDepthMaterial),distance:await material(entry.mesh.customDistanceMaterial)});
        rootlessDescription.sort((a,b)=>a.key.localeCompare(b.key));
        function oneInstance(entry,index){
          const {mesh}=entry,attributes={};
          for(const[name,attr]of Object.entries(mesh.geometry.attributes))if(attr.isInstancedBufferAttribute)attributes[name]=Array.from(attr.array.subarray(index*attr.itemSize,(index+1)*attr.itemSize));
          const matrix=Array.from(mesh.instanceMatrix.array.subarray(index*16,(index+1)*16)),color=mesh.instanceColor?Array.from(mesh.instanceColor.array.subarray(index*3,(index+1)*3)):null;
          const slot=mesh.spatialSlots?.[index];
          if(slot){
            same(Array.from(slot.mesh.instanceMatrix.array.subarray(slot.index*16,(slot.index+1)*16)),matrix,'Spatial chunk matrix no longer follows canonical storage.');
            if(color)same(Array.from(slot.mesh.instanceColor.array.subarray(slot.index*3,(slot.index+1)*3)),color,'Spatial chunk color no longer follows canonical storage.');
            for(const[name,values]of Object.entries(attributes)){const attr=slot.mesh.geometry.attributes[name];same(Array.from(attr.array.subarray(slot.index*attr.itemSize,(slot.index+1)*attr.itemSize)),values,'Spatial per-instance attribute differs: '+name);}
          }
          return{matrix,color,attributes};
        }
        function rootlessState(){
          return rootless.map(entry=>({key:entry.key,visible:entry.mesh.visible,castShadow:entry.mesh.castShadow,receiveShadow:entry.mesh.receiveShadow,instances:entry.batch.items.flatMap((item,index)=>item.windRoot?[]:[oneInstance(entry,index)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))})).sort((a,b)=>a.key.localeCompare(b.key));
        }
        const newReferences=imported.flatMap(entry=>entry.batch.items.map((item,index)=>{
          const level=entry.name.startsWith('Meshy far ')?'far':'near',key=entry.owner+'/'+level+'/'+item.windRoot.join(',');
          const row=rootMap.get(key);ensure(row,'Imported slot lacks a rooted identity.');
          return{entry,index,key,owners:row.owners,initial:oneInstance(entry,index)};
        }));
        if(mode==='candidate')ensure(newReferences.length===roots.length&&new Set(newReferences.map(row=>row.key)).size===newReferences.length,'Each standing source root must have exactly one imported instance.');
        const hiddenMatrix=Array.from(new Float32Array(new T.Matrix4().compose(new T.Vector3(0,-5000,0),new T.Quaternion(),new T.Vector3(.0001,.0001,.0001)).elements));
        let checkedOwnershipSlots=0;
        function checkReplacementState(ids=[]){
          const damaged=new Set(ids);let hidden=0;
          for(const ref of newReferences){const actual=oneInstance(ref.entry,ref.index),expectedHidden=ref.owners.some(id=>damaged.has(id));
            same(actual.matrix,expectedHidden?hiddenMatrix:ref.initial.matrix,'Imported saved destruction mismatch at '+ref.key);
            same(actual.color,ref.initial.color,'Destruction changed imported color.');same(actual.attributes,ref.initial.attributes,'Destruction changed imported wind root.');
            if(expectedHidden)hidden++;checkedOwnershipSlots++;
          }
          return{slots:newReferences.length,hidden,ownerless:newReferences.filter(row=>!row.owners.length).length};
        }
        checkReplacementState();
        async function state(entries=original){
          const rows=[];for(const {key,mesh}of entries)rows.push({key,count:mesh.count,visible:mesh.visible,transform:mesh.matrixWorld.elements.slice(),castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,matrix:mesh.instanceMatrix?await hash(mesh.instanceMatrix.array):null});return rows;
        }
        const initial=await state(),rootlessInitial=rootlessState(),damage=[],destructionProof=[];
        // Restore every old saved ID, not merely those near the normal camera.
        // Groups are below the production 512-slot debris capacity.
        for(const interactionMode of ['expedition','battle'])for(let offset=0;offset<anchors.length;offset+=192){
          const ids=anchors.slice(offset,offset+192).map(row=>row.id),saved=ids.slice();
          landscape.resetInteractions({mode:interactionMode,damage:saved});same(saved,ids,'Old saved scenery IDs changed during restoration.');
          ensure(landscape.stats.destroyedCount===ids.length,'An old scenery ID failed restoration.');
          destructionProof.push({mode:interactionMode,ids,proof:checkReplacementState(ids)});
          damage.push({mode:interactionMode,ids,original:await state(),rootless:rootlessState(),pool:{...landscape.stats.poolDraw}});
        }
        landscape.resetInteractions();same(await state(),initial,'Reset changed original display matrices/counts.');same(rootlessState(),rootlessInitial,'Reset changed rootless logs/shrubs.');checkReplacementState();
        const productionContact=[];
        for(const kind of ['tree','rock']){
          const record=anchors.find(row=>row.kind===kind&&Math.abs(row.x)<160&&Math.abs(row.z)<160&&!terrain.protectedResource(row.x,row.z));ensure(record,'No representative '+kind+' record found.');
          for(const faction of ['crawler','kaiju']){
            landscape.resetInteractions();const saved=[],actor={id:'preservation-fixture',faction,variant:faction==='crawler'?'standard':'flesh',x:record.x,z:record.z-2,angle:0,moving:true,scale:1};
            landscape.interact([actor],1/60,{mode:'expedition',damage:saved});actor.z=record.z+2;landscape.interact([actor],1/60,{mode:'expedition',damage:saved});
            ensure(saved.includes(record.id),'Production '+faction+' contact did not destroy representative '+record.id);
            checkReplacementState(saved);
            productionContact.push({faction,kind,target:record.id,saved,stats:{destroyedCount:landscape.stats.destroyedCount,trackCount:landscape.stats.trackCount,pool:{...landscape.stats.poolDraw}},original:await state(),rootless:rootlessState()});
          }
        }
        landscape.resetInteractions();same(await state(),initial,'Production contact reset changed original scene.');same(rootlessState(),rootlessInitial,'Production contact reset changed rootless members.');checkReplacementState();
        ensure(landscape.stats.destroyedCount===0&&landscape.stats.poolDraw.submittedInstances===0,'Reset left destruction/pool work.');
        const picking=[];for(const {node,group}of sites){const proxy=group.getObjectByName('Resource selection');ensure(proxy?.userData.node===node.id,'Missing original resource picking proxy.');const position=proxy.getWorldPosition(new T.Vector3());ray.set(position.clone().add(new T.Vector3(0,100,0)),new T.Vector3(0,-1,0));const hits=ray.intersectObject(proxy,false);ensure(hits.length>0,'Existing resource proxy no longer ray-picks.');picking.push({node:node.id,proxy:proxy.name,hits:hits.map(hit=>({distance:hit.distance,point:hit.point.toArray(),faceIndex:hit.faceIndex}))});}
        const quality=[];for(const setting of ['high','balanced','medium','performance','low','retro','high']){landscape.setQuality(setting);quality.push({setting,original:await state(),rootless:rootlessState(),coverage:added.map(({owner,mesh})=>({owner,name:mesh.name,visible:mesh.visible,count:mesh.count,castShadow:mesh.castShadow}))});checkReplacementState();}
        const originalMotion=[];for(const [time,delta]of [[0,0],[.5,.1],[1,.1],[1,0],[2,.1]]){landscape.update(time,delta);landscape.group.updateMatrixWorld(true);originalMotion.push({time,delta,original:await state(),rootless:rootlessState()});}
        const terrainSamples=[];
        for(let z=-600;z<=600;z+=10)for(let x=-600;x<=600;x+=10){const a=terrain.terrainNormal(x,z),b=terrain.scenerySelectionNormal(x,z);terrainSamples.push(x,z,terrain.terrainHeight(x,z),terrain.renderedTerrainHeight(x,z),terrain.scenerySelectionHeight(x,z),terrain.historicalRenderedTerrainHeight(x,z),a.x,a.y,a.z,b.x,b.y,b.z,terrain.riverX(z),terrain.riverWidth(z),terrain.shoreDistance(x,z),terrain.bankWidth(x,z),terrain.roadZ(x),Number(terrain.protectedResource(x,z)));}
        finite(terrainSamples,'terrain samples');
        const games=[];for(const [faction,variant]of [['kaiju','flesh'],['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']]){
          const game=sim.createGame(faction,variant);game.worldDamage.expedition=anchors.slice(0,40).map(row=>row.id);same(sim.deserialize(sim.serialize(game)),game,'Initial save roundtrip changed state.');
          const initialSave=sim.serialize(game);sim.travel(game,-65,-15);for(let i=0;i<480;i++)sim.tick(game,.125);
          for(let i=0;i<80;i++)sim.tick(game,.1,{x:i<40?1:0,z:i<40?0:1});
          same(sim.deserialize(sim.serialize(game)),game,'Progressed save roundtrip changed state.');games.push({faction,variant,initial:initialSave,progressed:sim.serialize(game)});
        }
        return{anchors,original:originalDescription,rootlessDescription,rootlessInitial,roots,pilotRecords,destructionProof,checkedOwnershipSlots,coverage,addedDescription,originalDressing:landscape.stats.groundDressing,terrain:{samples:terrainSamples.length/18,sha256:await hash(new Float64Array(terrainSamples))},games,damage,productionContact,picking,quality,originalMotion,cover,inventory,surfaces:surfaceDiagnostics(),meshAssets:pilot.meshyPilotStatus(),groundPatch:patch.groundPatchStatus()};
      },mode);
    }finally{await context.close();}
  }
  for(const key of ['anchors','original','rootlessDescription','rootlessInitial','roots','pilotRecords','originalDressing','terrain','games','damage','productionContact','picking','originalMotion','cover']){
    assert.deepEqual(snapshots.candidate[key],snapshots.baseline[key],key+' changed outside standing tree visuals.');report.checks.push(key+' exactly preserved.');
  }
  const originalQuality=value=>value.quality.map(({coverage,...row})=>row);
  assert.deepEqual(originalQuality(snapshots.candidate),originalQuality(snapshots.baseline),'Original visibility/counts changed with quality settings.');
  report.checks.push('All non-tree quality visibility/counts and rootless instance values are exact. Replacement trees create no picking tags, cover every standing source root, and hide/restore through existing saved destruction IDs including actual spatial draw slots. Six accepted pilot trees remain byte-exact.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.failedRequests,[]);
  report.checks.push('Finite original/new buffers and valid indices; identical local preloads; no external requests or browser errors.');report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{
  await browser?.close();report.closed=true;report.finishedAt=new Date().toISOString();report.sourceFinish=await fingerprint();report.sourceStable=report.sourceStart.fingerprint===report.sourceFinish.fingerprint;
  if(!report.sourceStable){report.passed=false;report.sourceFailure='Runtime/assets changed during this evidence run.';process.exitCode=1;}
  for(const mode of ['baseline','candidate'])if(snapshots[mode]){
    const value=snapshots[mode];
    report[mode]={anchors:value.anchors.length,originalMeshes:value.original.length,originalSha256:digest(JSON.stringify(value.original)),oldDressingSha256:digest(JSON.stringify(value.originalDressing)),terrain:value.terrain,inventory:value.inventory,
      destructionRounds:value.damage.map(({mode,ids,pool})=>({mode,ids,pool})),contact:value.productionContact.map(({original,...row})=>row),picking:value.picking,simulationSha256:digest(JSON.stringify(value.games)),quality:value.quality.map(({setting,coverage})=>({setting,coverage})),cover:value.cover,coverage:value.coverage,roots:value.roots,pilotRecords:value.pilotRecords,rootlessBatches:value.rootlessDescription,rootlessInstances:value.rootlessInitial.reduce((sum,row)=>sum+row.instances.length,0),rootlessSha256:digest(JSON.stringify(value.rootlessInitial)),destructionProof:value.destructionProof,checkedOwnershipSlots:value.checkedOwnershipSlots,newTreeMeshes:value.addedDescription,meshAssets:value.meshAssets,groundPatch:value.groundPatch,surfaces:value.surfaces};
  }
  report.exitCode=process.exitCode||0;await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,exitCode:report.exitCode,checks:report.checks,failure:report.failure,report:path.join(output,'report.json')},null,2));
