// Paired production construction in blank browser documents: no renderer,
// animation loop, screenshots or GPU benchmark. Every baseline /src module is
// served from the recorded Git revision, never mixed with candidate modules.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
const revision=git('rev-parse',process.env.BASELINE_REV||'fad5bb2d0d4a3a07dbfdf2bdb681fd510abfb137').trim();
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4197');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'Use a local game server.');
const out=path.resolve(process.env.OUTPUT_DIR||path.join(root,'artifacts/environment-polish/identity'));
const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const sourceFiles=git('ls-tree','-r','--name-only',revision,'--','src').trim().split('\n').filter(Boolean);
const baseline=new Map(sourceFiles.map(file=>['/'+file,git('show',revision+':'+file)]));
const digest=text=>createHash('sha256').update(text).digest('hex');
const report={baselineRevision:revision,candidateRevision:git('rev-parse','HEAD').trim(),
  fixture:'CPU-only production landscape/resource construction in separate blank browser contexts. All baseline /src files come from Git; vendor and image assets use the local server. No WebGLRenderer, gameplay loop or screenshots.',
  approvedVisualExceptions:{
    provenance:'Meshy bounded pilot compares against the preserved interrupted-revamp checkpoint. New whole-tree/rock art is authorized only in x [-65,32], z [-140,-90]; all other scenery presentation is compared exactly.',
    treeParts:'Only pilot standing trees become whole-tree meshes. Their original root, height, species, saved ID and destruction ownership remain exact. Whole-tree flutter .008 replaces branch/card flutter; rooted bend .66, motion [.73,2.4] and time source remain explicit. Outside-pilot geometry, transforms, colours, wind and materials remain exact.',
    colours:'Imported rock/tree atlas colour and geometry may replace only selected pilot displays. Every other original batch colour, geometry and material is compared; rock instance transforms and bank fields remain exact after visual-slot compaction.',
    groundCoverMass:'The preserved checkpoint already contains static groundCoverMass for the named meadow/reed batches. Its values, like all other existing ground-cover attributes, remain exact in this pilot.',
    debris:'Pine and broadleaf debris may change their visible geometry/materials. Both existing fixed-capacity pools, stumps, logs, rocks, tracks, damage IDs, destruction rules and reset behavior remain strict.',
    surfaces:'Ground/water shading and textures may change. Ground/water positions, index topology, transforms, terrain samples, resource proxies and simulation state remain exact.'
  },
  checks:[],errors:[],remote:[],failedRequests:[],source:{baseline:[],current:[]}};
const snapshots={};
let browser;
try{
  browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--disable-gpu','--mute-audio']});
  report.browser=browser.version();
  for(const mode of ['baseline','current']){
    const context=await browser.newContext({serviceWorkers:'block'});
    try{
      const page=await context.newPage();page.setDefaultTimeout(180000);
      page.on('pageerror',error=>report.errors.push(mode+': '+error.message));
      page.on('console',message=>{if(message.type()==='error')report.errors.push(mode+': '+message.text());});
      page.on('requestfailed',request=>report.failedRequests.push({mode,url:request.url(),failure:request.failure()?.errorText}));
      page.on('response',response=>{if(response.status()>=400)report.errors.push(mode+': HTTP '+response.status()+' '+response.url());});
      const seenSources=new Set();
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(['data:','blob:'].includes(url.protocol))return route.continue();
        if(url.origin!==base.origin){report.remote.push({mode,url:url.href});return route.abort();}
        if(url.pathname==='/__environment_polish_identity')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Environment identity fixture</title><body>CPU construction only</body>'});
        if(url.pathname.startsWith('/src/')){
          let source;
          if(mode==='baseline'){
            source=baseline.get(url.pathname);
            if(source===undefined){report.errors.push('Missing baseline module: '+url.pathname);return route.fulfill({status:404,body:'No baseline module'});}
          }else{
            const filename=path.resolve(root,'.'+url.pathname);
            assert.ok(filename.startsWith(path.resolve(root,'src')+path.sep),'Source path escaped src.');
            source=await fs.readFile(filename,'utf8');
          }
          if(!seenSources.has(url.pathname)){seenSources.add(url.pathname);report.source[mode].push({file:url.pathname,sha256:digest(source)});}
          return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'application/javascript',body:source});
        }
        return route.continue();
      });
      await page.goto(new URL('/__environment_polish_identity',base).href);
      snapshots[mode]=await page.evaluate(async(mode)=>{
        const T=await import('/vendor/three.module.js');
        const {createLandscape,createResourceSite}=await import('/src/landscape.js');
        const sim=await import('/src/simulation.js');
        const terrain=await import('/src/terrain.js');
        const {surfaceDiagnostics}=await import('/src/surface-library.js');
        const ensure=(value,message)=>{if(!value)throw Error(message);};
        const equal=(a,b,message)=>ensure(JSON.stringify(a)===JSON.stringify(b),message);
        const finite=(array,label)=>{for(const n of array)ensure(Number.isFinite(n),'Non-finite '+label);};
        const hash=async array=>{
          const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
          return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
        };
        const typed=async attribute=>attribute?{type:attribute.array.constructor.name,itemSize:attribute.itemSize,count:attribute.count,sha256:await hash(attribute.array)}:null;
        const area={minX:-65,maxX:32,minZ:-140,maxZ:-90};
        const inPilot=(x,z)=>x>=area.minX&&x<=area.maxX&&z>=area.minZ&&z<=area.maxZ;
        let pilotAssets=null;
        if(mode==='current'){
          const pilot=await import('/src/meshy-pilot.js');equal(pilot.MESHY_PILOT_AREA,area,'Pilot expanded its authorized bounds');
          await pilot.loadMeshyPilot();pilotAssets=pilot.meshyPilotStatus();
          ensure(pilotAssets.state==='ready'&&!pilotAssets.error,'Pilot asset load failed');
          equal(pilotAssets.assets.map(asset=>asset.kind).sort(),['broadleaf','pine','rock'],'Final pilot must load exactly the three permitted masters');
        }
        const landscape=createLandscape();
        const sites=sim.WORLD_NODES.map(node=>({node,group:createResourceSite(node)}));
        const groups=[{name:'landscape',group:landscape.group},...sites.map(({node,group})=>({name:'resource:'+node.id,group}))];
        const inventory={meshes:0,instances:0,triangles:0,attributeValues:0,matrixValues:0,textureValues:0,spatialMeshes:0,windShadowPairs:0};
        const checkedAttributes=new Set(),checkedTextures=new Set();
        for(const {name,group}of groups){
          group.updateMatrixWorld(true);
          group.traverse(mesh=>{
            finite(mesh.matrixWorld.elements,name+' object transform');
            if(!mesh.isMesh)return;
            inventory.meshes++;
            const geometry=mesh.geometry,position=geometry.attributes.position;
            ensure(position?.count>0,name+' missing positions');
            for(const attribute of [...Object.values(geometry.attributes),geometry.index].filter(Boolean)){
              if(checkedAttributes.has(attribute))continue;checkedAttributes.add(attribute);
              finite(attribute.array,name+' / '+mesh.name+' geometry');inventory.attributeValues+=attribute.array.length;
            }
            if(geometry.index)for(const index of geometry.index.array)ensure(Number.isInteger(index)&&index>=0&&index<position.count,'Out-of-range geometry index');
            if(mesh.isInstancedMesh){finite(mesh.instanceMatrix.array,name+' / '+mesh.name+' matrices');inventory.matrixValues+=mesh.instanceMatrix.array.length;inventory.instances+=mesh.count;}
            inventory.triangles+=(geometry.index?.count??position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
            if(mesh.userData.spatialIndices)inventory.spatialMeshes++;
            if(mesh.userData.windAnimated){
              ensure(!Array.isArray(mesh.material),'Wind material must be a single visible pass');
              for(const pass of [mesh.customDepthMaterial,mesh.customDistanceMaterial]){
                ensure(pass,'Wind mesh lost its custom shadow silhouette: '+mesh.name);
                for(const property of ['map','alphaMap','alphaTest','side'])ensure(pass[property]===mesh.material[property],mesh.name+' shadow '+property+' differs from visible cutout');
                inventory.windShadowPairs++;
              }
            }
            for(const material of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial].flat().filter(Boolean)){
              for(const property of ['opacity','roughness','metalness','alphaTest'])if(material[property]!==undefined)ensure(Number.isFinite(material[property]),'Non-finite material '+property);
              if(material.color)finite(material.color.toArray(),'material colour');
              for(const value of Object.values(material))if(value?.isTexture&&!checkedTextures.has(value)){
                checkedTextures.add(value);
                for(const image of [value.image,...(value.mipmaps||[])])if(image?.data){finite(image.data,'texture pixels');inventory.textureValues+=image.data.length;}
              }
            }
          });
        }
        // Normalize both ordinary batches and render cells to their immutable
        // original indices. Counts/cell traversal order may differ after culling
        // partitioning; every allocated original matrix/root, wind parameter,
        // LOD flag and instance colour must survive.
        function canonical(group){
          group.updateMatrixWorld(true);
          const batches=new Map();
          group.traverse(mesh=>{
            if(!mesh.isInstancedMesh)return;
            const name=mesh.userData.spatialBatch??mesh.name,indices=mesh.userData.spatialIndices;
            if(!indices)ensure(!batches.has(name),'Ambiguous ordinary batch name: '+name);
            const attributes=Object.fromEntries([
              ...['windFlex','windMotion','groundCoverLod','groundCoverMass','sceneryWet'].map(key=>[key,mesh.geometry.attributes[key]]),
              ['instanceColor',mesh.instanceColor]
            ].filter(([,attribute])=>attribute));
            const format=attribute=>({type:attribute.array.constructor.name,itemSize:attribute.itemSize,normalized:attribute.normalized,meshPerAttribute:attribute.meshPerAttribute});
            if(!batches.has(name))batches.set(name,{name,rows:[],roots:[],hasRoots:!!mesh.geometry.attributes.windRoot,attributes:Object.fromEntries(Object.entries(attributes).map(([key,attribute])=>[key,{format:format(attribute),rows:[]}])),world:mesh.matrixWorld.elements.slice(),active:0});
            const batch=batches.get(name);batch.geometry??=mesh.geometry;batch.material??=mesh.material;batch.depthMaterial??=mesh.customDepthMaterial;batch.distanceMaterial??=mesh.customDistanceMaterial;const root=mesh.geometry.attributes.windRoot,capacity=mesh.instanceMatrix.array.length/16;
            const mass=mesh.geometry.attributes.groundCoverMass;
            if(mass){
              ensure(mass.isInstancedBufferAttribute&&mass.itemSize===1&&mass.count===capacity,'Invalid cosmetic growth-mass capacity in '+name);
              const approved=['Low meadow grass','Meadow grass and river reeds'].includes(name);
              for(const value of mass.array)ensure(approved?value>=.30-1e-7&&value<=1:value===1,'Cosmetic growth scale escapes its approved meadow role: '+name);
            }
            equal(mesh.matrixWorld.elements,batch.world,'Cell transform changed inside '+name);
            ensure(batch.hasRoots===!!root,'Mixed rooted/unrooted cells in '+name);
            if(indices){ensure(Object.isFrozen(indices),'Spatial addressing must be immutable');ensure(indices.length===capacity,'Spatial indices/capacity mismatch');}
            if(root)ensure(root.count===capacity,'Wind-root capacity mismatch in '+name);
            equal(Object.keys(attributes),Object.keys(batch.attributes),'Mixed per-instance attributes in '+name);
            for(const [key,attribute]of Object.entries(attributes)){
              ensure(attribute.isInstancedBufferAttribute&&attribute.count===capacity,'Invalid '+key+' capacity in '+name);
              equal(format(attribute),batch.attributes[key].format,'Mixed '+key+' format in '+name);
            }
            for(let local=0;local<capacity;local++){
              const index=indices?indices[local]:local;
              ensure(Number.isInteger(index)&&index>=0&&batch.rows[index]===undefined,'Duplicate/invalid canonical slot in '+name);
              batch.rows[index]=Array.from(mesh.instanceMatrix.array.subarray(local*16,local*16+16));
              if(root)batch.roots[index]=Array.from(root.array.subarray(local*root.itemSize,(local+1)*root.itemSize));
              for(const [key,attribute]of Object.entries(attributes))batch.attributes[key].rows[index]=Array.from(attribute.array.subarray(local*attribute.itemSize,(local+1)*attribute.itemSize));
            }
            batch.active+=mesh.count;
          });
          for(const batch of batches.values())for(let i=0;i<batch.rows.length;i++)ensure(batch.rows[i]!==undefined,'Lost canonical slot '+batch.name+':'+i);
          return [...batches.values()].sort((a,b)=>a.name.localeCompare(b.name));
        }
        async function summaries(batches){
          const result=[];
          for(const batch of batches){
            const attributes={};
            for(const [key,attribute]of Object.entries(batch.attributes))attributes[key]={...attribute.format,sha256:await hash(new globalThis[attribute.format.type](attribute.rows.flat()))};
            result.push({name:batch.name,capacity:batch.rows.length,active:batch.active,world:batch.world,
              matrices:await hash(new Float32Array(batch.rows.flat())),roots:batch.hasRoots?await hash(new Float32Array(batch.roots.flat())):null,attributes});
          }
          return result;
        }
        const botanicalName=name=>/^(Distant |Meshy pilot )?(Tree trunks and branches|Broadleaf canopies|Pine boughs)$/.test(name);
        const rockName=name=>['Valley boulders and river pebbles','Meshy pilot riverbank rocks'].includes(name);
        const standingTreePart=(batch,index)=>botanicalName(batch.name)&&batch.attributes.windFlex.rows[index][0]!==0;
        const hiddenIdentity=(batch,index)=>rockName(batch.name)?['Valley boulders and river pebbles',{matrix:batch.rows[index]}]:botanicalName(batch.name)?[batch.name,{root:batch.roots[index],matrix:batch.rows[index]}]:[batch.name,index];
        const sortedHidden=hidden=>hidden.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
        const rootKey=root=>JSON.stringify(root);
        function botanicalIdentity(batch){
          ensure(batch.hasRoots,'Botanical part lost its functional tree root: '+batch.name);
          const roots=new Map();
          for(let i=0;i<batch.rows.length;i++){
            const root=batch.roots[i];if(standingTreePart(batch,i)&&inPilot(root[0],root[2]))continue;const key=rootKey(root);
            const wind=Object.fromEntries(['windFlex','windMotion','groundCoverLod'].map(name=>{
              ensure(batch.attributes[name],'Botanical part lost '+name+': '+batch.name);
              return[name,batch.attributes[name].rows[i]];
            }));
            if(roots.has(key))equal(wind,roots.get(key).wind,'Parts of a tree have inconsistent wind behavior: '+batch.name+':'+key);
            else roots.set(key,{root,wind});
          }
          return{name:batch.name,world:batch.world,trees:[...roots.values()].sort((a,b)=>rootKey(a.root).localeCompare(rootKey(b.root)))};
        }
        // Rocks retain their actual matrices and per-instance shore values.
        // New display slots can be compacted, so compare the combined family by
        // exact original transform instead of treating a display index as a save ID.
        function combinedRocks(batches){
          const family=batches.filter(batch=>rockName(batch.name));if(!family.length)return[];
          const template=family[0],entries=family.flatMap(batch=>batch.rows.map((matrix,index)=>({matrix,attributes:Object.fromEntries(Object.entries(batch.attributes).filter(([name])=>name!=='instanceColor').map(([name,attribute])=>[name,attribute.rows[index]]))}))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
          const attributes={};for(const[name,attribute]of Object.entries(template.attributes))if(name!=='instanceColor')attributes[name]={format:attribute.format,rows:entries.map(entry=>entry.attributes[name])};
          return[{...template,name:'Valley boulders and river pebbles',rows:entries.map(entry=>entry.matrix),attributes,roots:[],hasRoots:false,active:family.reduce((sum,batch)=>sum+batch.active,0)}];
        }
        async function functionalBatches(batches){
          const ordinary=await summaries([...batches.filter(batch=>!botanicalName(batch.name)&&!rockName(batch.name)),...combinedRocks(batches)].sort((a,b)=>a.name.localeCompare(b.name)));
          for(const batch of ordinary)delete batch.attributes.instanceColor;
          return{ordinary,botanical:batches.filter(batch=>botanicalName(batch.name)&&!batch.name.startsWith('Meshy pilot ')).map(botanicalIdentity)};
        }
        const subset=(batch,indices)=>({...batch,rows:indices.map(index=>batch.rows[index]),roots:batch.hasRoots?indices.map(index=>batch.roots[index]):[],active:indices.length,attributes:Object.fromEntries(Object.entries(batch.attributes).map(([name,attribute])=>[name,{format:attribute.format,rows:indices.map(index=>attribute.rows[index])}]))});
        const materialDescription=material=>material?{
          type:material.type,name:material.name,color:material.color?.toArray(),opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite,side:material.side,alphaTest:material.alphaTest,roughness:material.roughness,metalness:material.metalness,normalScale:material.normalScale?.toArray(),vertexColors:material.vertexColors,defines:material.defines,cacheKey:material.customProgramCacheKey(),hook:material.onBeforeCompile.toString(),
          textures:Object.fromEntries(Object.entries(material).filter(([,value])=>value?.isTexture).map(([name,texture])=>[name,{name:texture.name,source:typeof texture.image?.src==='string'?new URL(texture.image.src).pathname:null,colorSpace:texture.colorSpace,wrapS:texture.wrapS,wrapT:texture.wrapT,repeat:texture.repeat.toArray(),offset:texture.offset.toArray(),channel:texture.channel,anisotropy:texture.anisotropy}]))
        }:null;
        async function outsideVisual(batches){
          const result=[];
          for(const batch of batches){
            if(batch.name.startsWith('Meshy pilot '))continue;
            const indices=batch.rows.map((row,index)=>index).filter(index=>{
              if(standingTreePart(batch,index)){const root=batch.roots[index];return !inPilot(root[0],root[2]);}
              if(rockName(batch.name)){const row=batch.rows[index];return !inPilot(row[12],row[14]);}
              return true;
            });
            if(!indices.length)continue;
            const geometry={};for(const[name,attribute]of Object.entries(batch.geometry.attributes))if(!attribute.isInstancedBufferAttribute)geometry[name]=await typed(attribute);
            geometry.index=await typed(batch.geometry.index);
            result.push({...(await summaries([subset(batch,indices)]))[0],geometry,material:materialDescription(batch.material),depth:materialDescription(batch.depthMaterial),distance:materialDescription(batch.distanceMaterial)});
          }
          return result;
        }
        const initial=canonical(landscape.group),canonicalGroups=[];
        for(const {name,group}of groups)canonicalGroups.push({name,batches:await summaries(name==='landscape'?initial:canonical(group))});
        const functionalGroups=[];
        for(const {name,group}of groups)functionalGroups.push({name,batches:await functionalBatches(name==='landscape'?initial:canonical(group))});
        const roots=new Map(),species=new Map();
        for(const batch of initial.filter(b=>botanicalName(b.name)&&!b.name.endsWith('Tree trunks and branches')))for(const root of batch.roots){
          const key=root[0]+','+root[2],kind=batch.name.endsWith('Pine boughs')?'pine':'broadleaf';if(roots.has(key)){equal(root,roots.get(key),'Inconsistent tree root');equal(kind,species.get(key),'Tree species changed between parts');}roots.set(key,root);species.set(key,kind);
        }
        const anchors=landscape.crushables;
        ensure(anchors.length>=40,'Insufficient destruction fixture');
        ensure(new Set(anchors.map(a=>a.id)).size===anchors.length,'Duplicate scenery ID');
        const treeRoots=[];
        for(const anchor of anchors){
          ensure(!terrain.protectedResource(anchor.x,anchor.z),'Destruction anchor entered protected resource');
          finite([anchor.x,anchor.z,anchor.size],'destruction anchor');
          if(anchor.kind==='tree'){
            const root=roots.get(Math.fround(anchor.x)+','+Math.fround(anchor.z));ensure(root,'Saved tree lost its root: '+anchor.id);
            const sampler=Math.max(Math.abs(anchor.x),Math.abs(anchor.z))>178?terrain.renderedTerrainHeight:terrain.terrainHeight;
            ensure(root[1]===Math.fround(sampler(anchor.x,anchor.z)),'Saved tree is not rooted on receiving surface');
            treeRoots.push({id:anchor.id,root,species:species.get(root[0]+','+root[2])});
          }
        }
        const pilotRecords=anchors.filter(anchor=>inPilot(anchor.x,anchor.z));
        if(mode==='current'){
          equal(landscape.stats.meshyPilot.records.map(record=>record.id).sort(),pilotRecords.map(record=>record.id).sort(),'Missing or extra pilot record replacement');
          for(const batch of initial.filter(batch=>batch.name.startsWith('Meshy pilot '))){
            for(let i=0;i<batch.rows.length;i++){
              const row=batch.rows[i],root=batch.hasRoots?batch.roots[i]:[row[12],row[13],row[14]];
              ensure(inPilot(root[0],root[2]),'Imported display escaped authorized pilot area');
              if(batch.hasRoots){equal(batch.attributes.windFlex.rows[i],[Math.fround(.66),Math.fround(.008)],'Whole-tree bend/flutter changed');equal(batch.attributes.windMotion.rows[i],[Math.fround(.73),Math.fround(2.4)],'Whole-tree wind timing changed');equal(batch.attributes.groundCoverLod.rows[i],[0],'Whole-tree asset was assigned grass distance shrink');}
            }
          }
          for(const batch of initial.filter(batch=>botanicalName(batch.name)&&!batch.name.startsWith('Meshy pilot ')))for(let i=0;i<batch.rows.length;i++)if(standingTreePart(batch,i))ensure(!inPilot(batch.roots[i][0],batch.roots[i][2]),'Old standing-tree mesh remains underneath imported tree');
        }
        const visualOutsidePilot=await outsideVisual(initial);
        const damage=[...new Set(Array.from({length:40},(_,i)=>anchors[Math.floor(i*(anchors.length-1)/39)].id))];
        ensure(damage.length===40,'Damage fixture must select forty distinct records');
        // Include each kind even if a future distribution moves the even samples.
        for(const kind of new Set(anchors.map(a=>a.kind)))if(!damage.some(id=>anchors.find(a=>a.id===id).kind===kind))damage[damage.length-1]=anchors.find(a=>a.kind===kind).id;
        ensure(damage.length===40&&new Set(damage).size===40,'Kind coverage must keep forty distinct records');
        const originalByName=new Map(initial.map(batch=>[batch.name,batch]));
        function verifyTreeMapping(batches,ids){
          const destroyedRoots=new Set(anchors.filter(anchor=>anchor.kind==='tree'&&ids.includes(anchor.id)).map(anchor=>Math.fround(anchor.x)+','+Math.fround(anchor.z)));
          let hiddenParts=0;
          for(const batch of batches.filter(batch=>botanicalName(batch.name))){
            const original=originalByName.get(batch.name);
            for(let i=0;i<batch.rows.length;i++){
              // Authored-valley also places static fallen logs in its wood
              // batch. Their zero-flex roots are not standing-tree anchors;
              // preserve their original transform/root ownership separately.
              if(!standingTreePart(batch,i))continue;
              const root=batch.roots[i],expected=destroyedRoots.has(root[0]+','+root[2]),hidden=batch.rows[i][13]===-5000;
              ensure(hidden===expected,'Saved tree ownership mismatch: '+batch.name+':'+i+' root '+rootKey(root));
              if(hidden)hiddenParts++;else equal(batch.rows[i],original.rows[i],'Unrelated tree changed during destruction');
            }
          }
          return hiddenParts;
        }
        const damageRounds=[];
        for(const mode of ['expedition','battle']){
          const saved=JSON.parse(JSON.stringify(damage));landscape.resetInteractions({mode,damage:saved});
          ensure(landscape.stats.destroyedCount===40,'Saved damage did not restore forty records');equal(saved,damage,'Saved damage IDs were changed');
          const damaged=canonical(landscape.group),hidden=[];
          for(const batch of damaged){
            const original=originalByName.get(batch.name);ensure(original,'Destruction created an unknown batch');
            ensure(batch.rows.length===original.rows.length,'Destruction resized canonical storage');
            if(original.active===0)continue; // Fixed-capacity debris pools become active.
            for(let i=0;i<batch.rows.length;i++){
              const before=original.rows[i],after=batch.rows[i];
              if(after[13]===-5000&&before[13]!==-5000){if(!standingTreePart(original,i))hidden.push(hiddenIdentity(original,i));}
              else equal(after,before,'Damage changed an unrelated original matrix: '+batch.name+':'+i);
            }
          }
          const hiddenTreeParts=verifyTreeMapping(damaged,damage);
          ensure(hidden.length+hiddenTreeParts>=40,'Damage did not hide original scenery');
          damageRounds.push({mode,hidden:sortedHidden(hidden),batches:await functionalBatches(damaged),hiddenTreeParts});
          landscape.resetInteractions();ensure(landscape.stats.destroyedCount===0&&landscape.stats.poolDraw.submittedInstances===0,'Reset left destruction or dormant pool submissions');
          equal(await summaries(canonical(landscape.group)),canonicalGroups[0].batches,'Reset failed exact original matrix/root/count restoration');
        }
        // Exhaustive save-ID mapping is required when cosmetic instance counts
        // change. Exercise every anchor in bounded groups (under the unchanged
        // 512-record debris capacity); compare non-tree ownership with baseline.
        const ownershipRounds=[];
        for(let offset=0;offset<anchors.length;offset+=96){
          const ids=anchors.slice(offset,offset+96).map(anchor=>anchor.id);
          landscape.resetInteractions({mode:'expedition',damage:ids.slice()});
          ensure(landscape.stats.destroyedCount===ids.length,'Saved anchor was not restored');
          const damaged=canonical(landscape.group),hidden=[];
          const hiddenTreeParts=verifyTreeMapping(damaged,ids);
          for(const batch of damaged){
            const original=originalByName.get(batch.name);
            if(original.active===0)continue;
            for(let i=0;i<batch.rows.length;i++){
              if(standingTreePart(original,i))continue;
              if(batch.rows[i][13]===-5000&&original.rows[i][13]!==-5000)hidden.push(hiddenIdentity(original,i));
              else equal(batch.rows[i],original.rows[i],'Non-tree ownership changed unrelated scenery');
            }
          }
          ownershipRounds.push({ids,hidden:sortedHidden(hidden),hiddenTreeParts});
        }
        landscape.resetInteractions();
        equal(await summaries(canonical(landscape.group)),canonicalGroups[0].batches,'Exhaustive saved-damage check did not restore every original instance');
        const surfaces=[];
        for(const [name,mesh]of [['ground',landscape.ground],['water',landscape.water]])surfaces.push({name,transform:mesh.matrixWorld.elements.slice(),positions:await typed(mesh.geometry.attributes.position),indices:await typed(mesh.geometry.index),ground:!!mesh.userData.ground});
        const samples=[];
        for(let z=-600;z<=600;z+=10)for(let x=-600;x<=600;x+=10){
          const n=terrain.terrainNormal(x,z),sn=terrain.scenerySelectionNormal(x,z);
          const values=[x,z,terrain.terrainHeight(x,z),terrain.renderedTerrainHeight(x,z),terrain.scenerySelectionHeight(x,z),terrain.historicalRenderedTerrainHeight(x,z),n.x,n.y,n.z,sn.x,sn.y,sn.z,terrain.riverX(z),terrain.riverWidth(z),terrain.shoreDistance(x,z),terrain.bankWidth(x,z),terrain.roadZ(x),Number(terrain.protectedResource(x,z))];
          finite(values,'terrain samples');ensure(Math.abs(Math.hypot(n.x,n.y,n.z)-1)<1e-10,'Non-unit terrain normal');samples.push(...values);
        }
        const resources=[];
        const structuralResources=[];
        for(const {node,group}of sites){
          const proxy=group.getObjectByName('Resource selection'),ring=group.getObjectByName('Resource boundary');
          ensure(proxy?.userData.node===node.id&&ring,'Resource lost selection proxy/boundary');
          resources.push({node,transform:group.matrixWorld.elements.slice(),proxy:{node:proxy.userData.node,transform:proxy.matrixWorld.elements.slice(),positions:await typed(proxy.geometry.attributes.position),indices:await typed(proxy.geometry.index)},boundary:{transform:ring.matrixWorld.elements.slice(),positions:await typed(ring.geometry.attributes.position),indices:await typed(ring.geometry.index)}});
          // Ruin art is material-only in this pass. Preserve actual structural
          // meshes too, not only the invisible picking proxy. Botanical meshes
          // carry explicit wind tags and their root/ownership proof is above.
          const structural=[];group.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.windAnimated)structural.push(mesh);});
          const meshes=[];
          for(const mesh of structural)meshes.push({name:mesh.name,transform:mesh.matrixWorld.elements.slice(),positions:await typed(mesh.geometry.attributes.position),indices:await typed(mesh.geometry.index)});
          structuralResources.push({id:node.id,meshes});
        }
        const games=[];
        for(const [faction,variant]of [['kaiju','flesh'],['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']]){
          const state=sim.createGame(faction,variant);state.worldDamage.expedition=damage.slice();state.worldDamage.battle=damage.slice();
          equal(sim.deserialize(sim.serialize(state)),state,'Save roundtrip changed identity');games.push(state);
        }
        const start=performance.now();while(surfaceDiagnostics().pending){ensure(performance.now()-start<30000,'Local surface textures did not settle');await new Promise(resolve=>setTimeout(resolve,25));}
        const assets=surfaceDiagnostics();ensure(assets.failures.length===0,'Local surface image failed');
        return{anchors,canonicalGroups,functionalGroups,visualOutsidePilot,pilotAssets,pilotRecords,treeRoots,surfaces,terrain:{count:samples.length/18,sha256:await hash(new Float64Array(samples))},resources,structuralResources,games,damage,damageRounds,ownershipRounds,inventory,assets};
      },mode);
    }finally{await context.close();}
  }
  for(const field of ['anchors','functionalGroups','visualOutsidePilot','treeRoots','surfaces','terrain','resources','structuralResources','games','damage']){
    assert.deepEqual(snapshots.current[field],snapshots.baseline[field],field+' changed from baseline');report.checks.push(field+' is exactly preserved');
  }
  const withoutPartCounts=rounds=>rounds.map(({hiddenTreeParts,...round})=>round);
  for(const field of ['damageRounds','ownershipRounds']){
    assert.deepEqual(withoutPartCounts(snapshots.current[field]),withoutPartCounts(snapshots.baseline[field]),field+' functional ownership changed');
    report.checks.push(field+' preserves IDs, non-tree membership and all current tree-part ownership; cosmetic tree-part counts may differ.');
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.failedRequests,[]);
  report.checks.push('All inspected geometry, matrices, material scalars and procedural texture pixels are finite; local image assets loaded without errors.');
  report.checks.push('Original root heights and species are exact; outside-pilot display geometry/materials/colours/transforms/wind remain exact. Imported whole-tree wind uses explicit rooted bend/flutter/motion parameters; combined rock transforms and bank fields remain exact. Every wind mesh shares its visible map/alpha/side with shadow passes.');
  report.checks.push('Forty saved destruction records preserve non-tree canonical slots in expedition and battle. Every saved anchor is additionally exercised in bounded groups; all tree parts hide with their parent, no unrelated tree hides, and reset restores all current matrices/roots/counts.');
  report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;}
finally{
  if(browser)await browser.close();
  for(const mode of ['baseline','current'])if(snapshots[mode]){
    const {anchors,treeRoots,canonicalGroups,terrain,inventory,assets,pilotAssets,pilotRecords,visualOutsidePilot,damageRounds,ownershipRounds}=snapshots[mode];
    report[mode]={anchors:anchors.length,rootedTrees:treeRoots.length,canonicalGroups,terrain,inventory,assets,pilotAssets,pilotRecordIds:pilotRecords.map(record=>record.id),outsideVisualSha256:digest(JSON.stringify(visualOutsidePilot)),damage:damageRounds.map(({mode,hidden,hiddenTreeParts})=>({mode,hiddenUnchangedInstances:hidden.length,hiddenTreeParts})),ownership:ownershipRounds.map(({ids,hidden,hiddenTreeParts})=>({ids,hiddenUnchangedInstances:hidden.length,hiddenTreeParts}))};
  }
  report.source.baseline.sort((a,b)=>a.file.localeCompare(b.file));report.source.current.sort((a,b)=>a.file.localeCompare(b.file));
  await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({passed:report.passed,baselineRevision:revision,checks:report.checks,failure:report.failure,report:path.join(out,'report.json')},null,2));
