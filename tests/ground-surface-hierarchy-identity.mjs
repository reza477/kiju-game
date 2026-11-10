// Paired production construction, not a shader-string or mocked-material test.
// Rendering and shader execution are checked by the ordinary gameplay runners.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const baselineRevision=git('rev-parse',process.env.BASELINE_REV||'16a1f53c5d0b8b21f6c2a8fbf7d5a8da94dbcfc7');
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4230/');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/nov10-improvements/ground-material/identity-01');
assert.ok(['127.0.0.1','localhost'].includes(base.hostname));
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0,'Fresh evidence directory required.');
const scopes=['src','assets','vendor','index.html','package.json','package-lock.json'];
async function source(){
  const names=[...new Set([...git('ls-files',...scopes).split('\n'),...git('ls-files','--others','--exclude-standard',...scopes).split('\n')])].filter(Boolean).sort();
  const hashes={};for(const name of names)hashes[name]=sha(await fs.readFile(path.join(root,name)));
  return{commit:git('rev-parse','HEAD'),hashes,fingerprint:sha(JSON.stringify(hashes))};
}
const changed=git('diff','--name-only',baselineRevision,'--',...scopes).split('\n').filter(Boolean);
const allowed=['src/painterly-surfaces.js'];
assert.ok(changed.length&&changed.every(name=>allowed.includes(name)),'Unexpected runtime changes: '+changed.join(', '));
assert.equal(git('ls-files','--others','--exclude-standard',...scopes),'','Unrecorded runtime file.');
const baselineShader=execFileSync('git',['show',baselineRevision+':src/painterly-surfaces.js'],{cwd:root});
const report={protocol:'ground-surface-hierarchy-identity-v1',startedAt:new Date().toISOString(),baselineRevision,sourceStart:await source(),changedRuntime:changed,toolSha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),
  method:'Two isolated Chrome contexts construct the production landscape and all six resource sites, loading the same actual local assets. The sole changed module is routed from baseline Git bytes or frozen candidate bytes. No renderer, game loop, real save or camera is created. Every mesh buffer, instance transform, picking tag and non-ground material is compared, including the river. Ground material settings and input textures stay exact; only its shader and additional shared-map handle are authorized. All existing saved scenery IDs are restored in expedition and battle. Resource counts are CPU reachable-object accounting, not GPU VRAM or frame-rate claims.',
  limitations:['Separate ordinary desktop and WebKit gameplay runs must establish actual shader compilation and visible result.','CPU constructed drawables are not GPU draw calls.','No physical iPhone, remote delivery, native-body repair or art-gate claim.'],
  command:{executable:process.execPath,args:process.argv.slice(1),environment:{GAME_TEST_URL:base.href,OUTPUT_DIR:out,BASELINE_REV:baselineRevision}},errors:[],failedRequests:[],externalRequests:[],requests:{baseline:[],candidate:[]},checks:[],passed:false};
const candidateModules=new Map();for(const name of Object.keys(report.sourceStart.hashes).filter(name=>name.startsWith('src/')))candidateModules.set('/'+name,await fs.readFile(path.join(root,name)));
const snapshots={};let browser;
try{
  const health=await(await fetch(new URL('/health',base))).json();assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,sha((await fs.realpath(root)).replaceAll('\\','/').toLowerCase()));report.server=health;
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu','--mute-audio']});report.browser=browser.version();
  for(const mode of ['baseline','candidate']){
    const context=await browser.newContext({serviceWorkers:'block'});
    try{
      const page=await context.newPage();page.setDefaultTimeout(180000);
      page.on('pageerror',error=>report.errors.push(mode+': '+error.message));
      page.on('console',message=>{if(message.type()==='error')report.errors.push(mode+': '+message.text());});
      page.on('requestfailed',request=>report.failedRequests.push({mode,url:request.url(),error:request.failure()?.errorText}));
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());if(['data:','blob:'].includes(url.protocol))return route.continue();
        if(url.origin!==base.origin){report.externalRequests.push(url.href);return route.abort();}
        if(!report.requests[mode].includes(url.pathname))report.requests[mode].push(url.pathname);
        if(url.pathname==='/__ground_surface_identity')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Ground surface construction identity</title>'});
        if(candidateModules.has(url.pathname))return route.fulfill({contentType:'application/javascript',body:mode==='baseline'&&url.pathname==='/src/painterly-surfaces.js'?baselineShader:candidateModules.get(url.pathname)});
        return route.continue();
      });
      await page.goto(new URL('/__ground_surface_identity',base).href);
      snapshots[mode]=await page.evaluate(async()=>{
        const T=await import('/vendor/three.module.js'),{createLandscape,createResourceSite}=await import('/src/landscape.js');
        const sim=await import('/src/simulation.js'),terrain=await import('/src/terrain.js');
        const pilot=await import('/src/meshy-pilot.js'),patch=await import('/src/ground-patch.js');
        await pilot.loadMeshyPilot();await patch.loadGroundPatch();
        const ensure=(value,message)=>{if(!value)throw Error(message);};
        const same=(a,b,message)=>ensure(JSON.stringify(a)===JSON.stringify(b),message);
        ensure(pilot.meshyPilotStatus().state==='ready'&&patch.groundPatchStatus().state==='ready','Production assets unavailable.');
        const hash=async array=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(array.buffer,array.byteOffset,array.byteLength))),n=>n.toString(16).padStart(2,'0')).join('');
        const jsonHash=value=>hash(new TextEncoder().encode(JSON.stringify(value)));
        const attribute=async attr=>attr?{type:attr.array.constructor.name,itemSize:attr.itemSize,count:attr.count,normalized:attr.normalized,sha256:await hash(attr.array)}:null;
        const plain=value=>{
          if(value===null||['string','boolean','number'].includes(typeof value))return value;
          if(Array.isArray(value))return value.map(plain);if(ArrayBuffer.isView(value))return Array.from(value);
          if(value?.isVector2||value?.isVector3||value?.isVector4||value?.isColor||value?.isQuaternion||value?.isMatrix3||value?.isMatrix4)return value.toArray();
        };
        const landscape=createLandscape(),sites=sim.WORLD_NODES.map(node=>({node,group:createResourceSite(node)}));
        const {surfaceDiagnostics}=await import('/src/surface-library.js');const started=performance.now();
        while(surfaceDiagnostics().pending){ensure(performance.now()-started<30000,'Surface decoding timeout.');await new Promise(resolve=>setTimeout(resolve,25));}
        ensure(surfaceDiagnostics().failures.length===0,'Surface decoding failed.');
        const entries=[],names=new Map(),geometries=new Set(),materials=new Set(),textures=new Map(),buffers=new Set();
        const inventory={meshes:0,instances:0,triangles:0,geometryBytes:0};
        const addBuffer=attr=>{const a=attr?.array;if(a&&!buffers.has(a.buffer)){buffers.add(a.buffer);inventory.geometryBytes+=a.buffer.byteLength;}};
        for(const {name:owner,group}of [{name:'landscape',group:landscape.group},...sites.map(({node,group})=>({name:'resource:'+node.id,group}))]){
          group.updateMatrixWorld(true);group.traverse(mesh=>{
            if(!mesh.isMesh)return;
            const label=owner+'/'+mesh.name,n=names.get(label)||0;names.set(label,n+1);entries.push({key:label+'#'+n,mesh});
            geometries.add(mesh.geometry);inventory.meshes++;inventory.instances+=mesh.isInstancedMesh?mesh.count:1;
            inventory.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
            for(const attr of [...Object.values(mesh.geometry.attributes),mesh.geometry.index,mesh.instanceMatrix,mesh.instanceColor].filter(Boolean)){
              for(const value of attr.array)ensure(Number.isFinite(value),'Nonfinite attribute '+label);addBuffer(attr);
            }
            for(const mat of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial].flat().filter(Boolean)){
              materials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.set(value,null);
            }
            for(const tex of mesh.userData.surfaceTextures||[])textures.set(tex,null);
          });
        }
        const textureCache=new WeakMap(),materialCache=new WeakMap();
        async function texture(tex){
          if(textureCache.has(tex))return textureCache.get(tex);
          const result={type:tex.constructor.name,name:tex.name,properties:{},image:null};textureCache.set(tex,result);
          for(const key of ['mapping','channel','wrapS','wrapT','magFilter','minFilter','anisotropy','format','internalFormat','type','offset','repeat','center','rotation','matrixAutoUpdate','matrix','generateMipmaps','premultiplyAlpha','flipY','unpackAlignment','colorSpace'])result.properties[key]=plain(tex[key]);
          const img=tex.image;if(img){result.image={width:img.width,height:img.height};if(img.data)result.image.sha256=await hash(img.data);else if(img.getContext){const ctx=img.getContext('2d');if(ctx)result.image.sha256=await hash(ctx.getImageData(0,0,img.width,img.height).data);}else if(img.currentSrc||img.src)result.image.src=new URL(img.currentSrc||img.src).pathname;}
          return result;
        }
        async function material(mat){
          if(!mat)return null;if(Array.isArray(mat))return Promise.all(mat.map(material));if(materialCache.has(mat))return materialCache.get(mat);
          // Git stores LF while this Windows checkout uses CRLF. Normalize
          // only function-source line endings; every numeric/buffer comparison
          // remains byte-exact, including the untouched river inputs.
          const ground=mat===landscape.ground.material,result={type:mat.type,name:mat.name,properties:{},textures:{},hook:ground?'AUTHORIZED GROUND SHADER':mat.onBeforeCompile.toString().replaceAll('\r\n','\n'),cacheKey:ground?'AUTHORIZED GROUND SHADER':mat.customProgramCacheKey()};materialCache.set(mat,result);
          for(const [key,value]of Object.entries(mat)){
            if(['id','uuid','version','name','type','userData'].includes(key)||ground&&key==='groundMineralMap')continue;
            if(value?.isTexture)result.textures[key]=await texture(value);else{const item=plain(value);if(item!==undefined)result.properties[key]=item;}
          }return result;
        }
        const meshes=[];
        for(const {key,mesh}of entries){
          const attributes={};for(const [name,attr]of Object.entries(mesh.geometry.attributes))attributes[name]=await attribute(attr);
          const tags={};for(const [name,value]of Object.entries(mesh.userData)){const item=plain(value);if(item!==undefined)tags[name]=item;}
          meshes.push({key,transform:mesh.matrixWorld.elements.slice(),visible:mesh.visible,count:mesh.count,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,frustumCulled:mesh.frustumCulled,renderOrder:mesh.renderOrder,layers:mesh.layers.mask,attributes,index:await attribute(mesh.geometry.index),matrix:await attribute(mesh.instanceMatrix),color:await attribute(mesh.instanceColor),groups:mesh.geometry.groups,drawRange:mesh.geometry.drawRange,tags,raycast:mesh.raycast.toString(),material:await material(mesh.material),depth:await material(mesh.customDepthMaterial),distance:await material(mesh.customDistanceMaterial)});
        }
        const resourceTextures=[];for(const tex of textures.keys())resourceTextures.push(await texture(tex));resourceTextures.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
        Object.assign(inventory,{geometries:geometries.size,materials:materials.size,textureObjects:textures.size,imageSources:new Set([...textures.keys()].map(tex=>tex.source)).size});
        const anchors=landscape.crushables;ensure(anchors.length===1665&&new Set(anchors.map(a=>a.id)).size===1665,'Existing scenery count or identity changed.');
        async function state(){const rows=[];for(const {key,mesh}of entries)rows.push({key,count:mesh.count,visible:mesh.visible,matrix:await attribute(mesh.instanceMatrix)});return jsonHash(rows);}
        const initial=await state(),damage=[];
        for(const mode of ['expedition','battle'])for(let offset=0;offset<anchors.length;offset+=192){
          const ids=anchors.slice(offset,offset+192).map(a=>a.id),saved=ids.slice();landscape.resetInteractions({mode,damage:saved});same(saved,ids,'Saved IDs mutated.');ensure(landscape.stats.destroyedCount===ids.length,'Saved scenery restoration failed.');
          damage.push({mode,ids,geometry:await state(),pool:{...landscape.stats.poolDraw}});
        }
        landscape.resetInteractions();same(await state(),initial,'Scene reset changed instance matrices.');
        const ray=new T.Raycaster(),picking=[];for(const {node,group}of sites){const proxy=group.getObjectByName('Resource selection');ensure(proxy?.userData.node===node.id,'Selection identity changed.');const p=proxy.getWorldPosition(new T.Vector3());ray.set(p.clone().add(new T.Vector3(0,100,0)),new T.Vector3(0,-1,0));const hits=ray.intersectObject(proxy,false);ensure(hits.length>0,'Selection no longer ray-picks.');picking.push({id:node.id,hits:hits.map(hit=>({distance:hit.distance,point:hit.point.toArray(),face:hit.faceIndex}))});}
        const terrainSamples=[];for(let z=-600;z<=600;z+=10)for(let x=-600;x<=600;x+=10){const n=terrain.terrainNormal(x,z);terrainSamples.push(x,z,terrain.terrainHeight(x,z),terrain.renderedTerrainHeight(x,z),terrain.scenerySelectionHeight(x,z),n.x,n.y,n.z,terrain.riverX(z),terrain.riverWidth(z),terrain.shoreDistance(x,z),terrain.roadZ(x));}
        const games=[];for(const [faction,variant]of [['kaiju','flesh'],['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']]){
          const game=sim.createGame(faction,variant);game.worldDamage.expedition=anchors.slice(0,40).map(a=>a.id);const initial=sim.serialize(game);sim.travel(game,-65,-15);for(let i=0;i<480;i++)sim.tick(game,.125);same(sim.deserialize(sim.serialize(game)),game,'Save roundtrip changed.');games.push({faction,variant,initial,progressed:sim.serialize(game)});
        }
        return{meshes,anchors,damage,picking,terrain:{samples:terrainSamples.length/12,sha256:await hash(new Float64Array(terrainSamples))},games,inventory,resourceTextures,surfaces:surfaceDiagnostics(),groundShader:landscape.ground.material.customProgramCacheKey()};
      });
      console.log(mode+' complete: '+snapshots[mode].anchors.length+' scenery, '+snapshots[mode].inventory.meshes+' meshes');
    }finally{await context.close();}
  }
  for(const key of ['meshes','anchors','damage','picking','terrain','games','inventory','resourceTextures','surfaces']){
    assert.equal(sha(JSON.stringify(snapshots.candidate[key])),sha(JSON.stringify(snapshots.baseline[key])),key+' changed outside the ground material.');report.checks.push(key+' exactly preserved.');
  }
  assert.deepEqual([...report.requests.candidate].sort(),[...report.requests.baseline].sort(),'New resource request.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);assert.deepEqual(report.externalRequests,[]);report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{
  await browser?.close();report.finishedAt=new Date().toISOString();report.sourceFinish=await source();report.sourceStable=report.sourceStart.fingerprint===report.sourceFinish.fingerprint;if(!report.sourceStable){report.passed=false;process.exitCode=1;}
  for(const [mode,value]of Object.entries(snapshots)){await fs.writeFile(path.join(out,mode+'.json'),JSON.stringify(value)+'\n');report[mode]={sha256:sha(JSON.stringify(value)),inventory:value.inventory,terrain:value.terrain,groundShader:value.groundShader};}
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,sourceStable:report.sourceStable,failure:report.failure??null,report:path.join(out,'report.json')}));
}
