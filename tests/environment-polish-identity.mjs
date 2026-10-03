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
const revision=git('rev-parse',process.env.BASELINE_REV||'8230ce17a4ae26f3374e8ef9594db1095d5cb77f').trim();
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
      snapshots[mode]=await page.evaluate(async()=>{
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
        const landscape=createLandscape();
        const sites=sim.WORLD_NODES.map(node=>({node,group:createResourceSite(node)}));
        const groups=[{name:'landscape',group:landscape.group},...sites.map(({node,group})=>({name:'resource:'+node.id,group}))];
        const inventory={meshes:0,instances:0,triangles:0,attributeValues:0,matrixValues:0,textureValues:0,spatialMeshes:0};
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
        // partitioning; every allocated original matrix/root must survive.
        function canonical(group){
          group.updateMatrixWorld(true);
          const batches=new Map();
          group.traverse(mesh=>{
            if(!mesh.isInstancedMesh)return;
            const name=mesh.userData.spatialBatch??mesh.name,indices=mesh.userData.spatialIndices;
            if(!indices)ensure(!batches.has(name),'Ambiguous ordinary batch name: '+name);
            if(!batches.has(name))batches.set(name,{name,rows:[],roots:[],hasRoots:!!mesh.geometry.attributes.windRoot,world:mesh.matrixWorld.elements.slice(),active:0});
            const batch=batches.get(name),root=mesh.geometry.attributes.windRoot,capacity=mesh.instanceMatrix.array.length/16;
            equal(mesh.matrixWorld.elements,batch.world,'Cell transform changed inside '+name);
            ensure(batch.hasRoots===!!root,'Mixed rooted/unrooted cells in '+name);
            if(indices){ensure(Object.isFrozen(indices),'Spatial addressing must be immutable');ensure(indices.length===capacity,'Spatial indices/capacity mismatch');}
            if(root)ensure(root.count===capacity,'Wind-root capacity mismatch in '+name);
            for(let local=0;local<capacity;local++){
              const index=indices?indices[local]:local;
              ensure(Number.isInteger(index)&&index>=0&&batch.rows[index]===undefined,'Duplicate/invalid canonical slot in '+name);
              batch.rows[index]=Array.from(mesh.instanceMatrix.array.subarray(local*16,local*16+16));
              if(root)batch.roots[index]=Array.from(root.array.subarray(local*root.itemSize,(local+1)*root.itemSize));
            }
            batch.active+=mesh.count;
          });
          for(const batch of batches.values())for(let i=0;i<batch.rows.length;i++)ensure(batch.rows[i]!==undefined,'Lost canonical slot '+batch.name+':'+i);
          return [...batches.values()].sort((a,b)=>a.name.localeCompare(b.name));
        }
        async function summaries(batches){
          const result=[];
          for(const batch of batches)result.push({name:batch.name,capacity:batch.rows.length,active:batch.active,world:batch.world,
            matrices:await hash(new Float32Array(batch.rows.flat())),roots:batch.hasRoots?await hash(new Float32Array(batch.roots.flat())):null});
          return result;
        }
        const initial=canonical(landscape.group),canonicalGroups=[];
        for(const {name,group}of groups)canonicalGroups.push({name,batches:await summaries(name==='landscape'?initial:canonical(group))});
        const roots=new Map();
        for(const batch of initial.filter(b=>['Broadleaf canopies','Pine boughs','Distant Broadleaf canopies','Distant Pine boughs'].includes(b.name)))for(const root of batch.roots){
          const key=root[0]+','+root[2];if(roots.has(key))equal(root,roots.get(key),'Inconsistent tree root');roots.set(key,root);
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
            treeRoots.push({id:anchor.id,root});
          }
        }
        const damage=[...new Set(Array.from({length:40},(_,i)=>anchors[Math.floor(i*(anchors.length-1)/39)].id))];
        ensure(damage.length===40,'Damage fixture must select forty distinct records');
        // Include each kind even if a future distribution moves the even samples.
        for(const kind of new Set(anchors.map(a=>a.kind)))if(!damage.some(id=>anchors.find(a=>a.id===id).kind===kind))damage[damage.length-1]=anchors.find(a=>a.kind===kind).id;
        ensure(damage.length===40&&new Set(damage).size===40,'Kind coverage must keep forty distinct records');
        const originalByName=new Map(initial.map(batch=>[batch.name,batch]));
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
              if(after[13]===-5000&&before[13]!==-5000)hidden.push([batch.name,i]);
              else equal(after,before,'Damage changed an unrelated original matrix: '+batch.name+':'+i);
            }
          }
          ensure(hidden.length>=40,'Damage did not hide original scenery');
          damageRounds.push({mode,hidden,batches:await summaries(damaged)});
          landscape.resetInteractions();ensure(landscape.stats.destroyedCount===0&&landscape.stats.poolDraw.submittedInstances===0,'Reset left destruction or dormant pool submissions');
          equal(await summaries(canonical(landscape.group)),canonicalGroups[0].batches,'Reset failed exact original matrix/root/count restoration');
        }
        const surfaces=[];
        for(const [name,mesh]of [['ground',landscape.ground],['water',landscape.water]])surfaces.push({name,transform:mesh.matrixWorld.elements.slice(),positions:await typed(mesh.geometry.attributes.position),indices:await typed(mesh.geometry.index),ground:!!mesh.userData.ground});
        const samples=[];
        for(let z=-600;z<=600;z+=10)for(let x=-600;x<=600;x+=10){
          const n=terrain.terrainNormal(x,z),sn=terrain.scenerySelectionNormal(x,z);
          const values=[x,z,terrain.terrainHeight(x,z),terrain.renderedTerrainHeight(x,z),terrain.scenerySelectionHeight(x,z),terrain.historicalRenderedTerrainHeight(x,z),n.x,n.y,n.z,sn.x,sn.y,sn.z,terrain.riverX(z),terrain.riverWidth(z),terrain.shoreDistance(x,z),terrain.bankWidth(x,z),terrain.roadZ(x),Number(terrain.protectedResource(x,z))];
          finite(values,'terrain samples');ensure(Math.abs(Math.hypot(n.x,n.y,n.z)-1)<1e-10,'Non-unit terrain normal');samples.push(...values);
        }
        const resources=[];
        for(const {node,group}of sites){
          const proxy=group.getObjectByName('Resource selection'),ring=group.getObjectByName('Resource boundary');
          ensure(proxy?.userData.node===node.id&&ring,'Resource lost selection proxy/boundary');
          resources.push({node,transform:group.matrixWorld.elements.slice(),proxy:{node:proxy.userData.node,transform:proxy.matrixWorld.elements.slice(),positions:await typed(proxy.geometry.attributes.position),indices:await typed(proxy.geometry.index)},boundary:{transform:ring.matrixWorld.elements.slice(),positions:await typed(ring.geometry.attributes.position),indices:await typed(ring.geometry.index)}});
        }
        const games=[];
        for(const [faction,variant]of [['kaiju','flesh'],['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']]){
          const state=sim.createGame(faction,variant);state.worldDamage.expedition=damage.slice();state.worldDamage.battle=damage.slice();
          equal(sim.deserialize(sim.serialize(state)),state,'Save roundtrip changed identity');games.push(state);
        }
        const start=performance.now();while(surfaceDiagnostics().pending){ensure(performance.now()-start<30000,'Local surface textures did not settle');await new Promise(resolve=>setTimeout(resolve,25));}
        const assets=surfaceDiagnostics();ensure(assets.failures.length===0,'Local surface image failed');
        return{anchors,canonicalGroups,treeRoots,surfaces,terrain:{count:samples.length/18,sha256:await hash(new Float64Array(samples))},resources,games,damage,damageRounds,inventory,assets};
      });
    }finally{await context.close();}
  }
  for(const field of ['anchors','canonicalGroups','treeRoots','surfaces','terrain','resources','games','damage','damageRounds']){
    assert.deepEqual(snapshots.current[field],snapshots.baseline[field],field+' changed from baseline');report.checks.push(field+' is exactly preserved');
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.failedRequests,[]);
  report.checks.push('All inspected geometry, matrices, material scalars and procedural texture pixels are finite; local image assets loaded without errors.');
  report.checks.push('Forty saved destruction records hide identical canonical slots in expedition and battle and restore every original matrix/root/count; dormant pools return to zero.');
  report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;}
finally{
  if(browser)await browser.close();
  for(const mode of ['baseline','current'])if(snapshots[mode]){
    const {anchors,treeRoots,canonicalGroups,terrain,inventory,assets,damageRounds}=snapshots[mode];
    report[mode]={anchors:anchors.length,rootedTrees:treeRoots.length,canonicalGroups,terrain,inventory,assets,damage:damageRounds.map(({mode,hidden})=>({mode,hiddenInstances:hidden.length}))};
  }
  report.source.baseline.sort((a,b)=>a.file.localeCompare(b.file));report.source.current.sort((a,b)=>a.file.localeCompare(b.file));
  await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({passed:report.passed,baselineRevision:revision,checks:report.checks,failure:report.failure,report:path.join(out,'report.json')},null,2));
