import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {createLandscape, createResourceSite} from '../src/landscape.js';
import {batchStatic,disposeGroup} from '../src/materials.js';
import {createMovementPreparation} from '../src/movement-preparation.js';
import {GameScene} from '../src/scene.js';
import {WORLD_NODES,createGame} from '../src/simulation.js';

// CPU ownership tests only. These inert DOM surfaces are the same approach as
// environment-optimization.test.mjs: no image download, WebGL, or timing claim.
const gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]??(()=>{})});
const documentStub={createElement:()=>({width:0,height:0,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};
let originalDocument,landscape;
before(()=>{originalDocument=globalThis.document;globalThis.document=documentStub;landscape=createLandscape();});
after(()=>{disposeGroup(landscape.group);if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});

function materialsIn(group){
  const materials=new Set();
  group.traverse(object=>{for(const material of [object.material,object.customDepthMaterial,object.customDistanceMaterial].flat().filter(Boolean))materials.add(material);});
  return materials;
}
function watchDisposal(resources){
  const counts=new Map([...resources].map(resource=>[resource,0])),listeners=new Map();
  for(const resource of resources){const listener=()=>counts.set(resource,counts.get(resource)+1);listeners.set(resource,listener);resource.addEventListener('dispose',listener);}
  return {counts,stop(){for(const [resource,listener]of listeners)resource.removeEventListener('dispose',listener);}};
}
const typedHash=array=>createHash('sha256').update(new Uint8Array(array.buffer,array.byteOffset,array.byteLength)).digest('hex');
function siteIdentity(group){
  group.updateMatrixWorld(true);const meshes=[];
  group.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const material=mesh.material;
    meshes.push({name:mesh.name,transform:mesh.matrixWorld.elements.slice(),node:mesh.userData.node,
      geometry:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name,attribute])=>[name,{itemSize:attribute.itemSize,normalized:attribute.normalized,hash:typedHash(attribute.array)}])),
      index:mesh.geometry.index?typedHash(mesh.geometry.index.array):null,
      instances:mesh.instanceMatrix?typedHash(mesh.instanceMatrix.array):null,colors:mesh.instanceColor?typedHash(mesh.instanceColor.array):null,
      castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,
      material:{name:material.name,color:material.color?.getHex(),side:material.side,roughness:material.roughness,metalness:material.metalness,alphaTest:material.alphaTest,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite,vertexColors:material.vertexColors,defines:material.defines,cacheKey:material.customProgramCacheKey(),map:material.map?.uuid,alphaMap:material.alphaMap?.uuid,normalMap:material.normalMap?.uuid,roughnessMap:material.roughnessMap?.uuid}
    });
  });
  return meshes;
}

test('disposing resource sites preserves the exact materials still attached to persistent scenery',()=>{
  const worldMaterials=materialsIn(landscape.group),sites=WORLD_NODES.map(node=>createResourceSite(node));
  const sharedWithSites=new Set(sites.flatMap(site=>[...materialsIn(site)].filter(material=>worldMaterials.has(material))));
  const metric=[...sharedWithSites].filter(material=>material.customProgramCacheKey().includes('world-metric-scenery'));
  assert.ok(metric.length>=3,'Exercise real metric scenery materials shared by the persistent landscape and sites.');
  // Ruins now have an explicitly separate painted masonry family. They must
  // reuse their own cached instances, rather than the former world-rock family.
  const ironIndex=WORLD_NODES.findIndex(node=>node.kind==='iron');
  const ironMetric=[...materialsIn(sites[ironIndex])].filter(material=>material.userData.shared&&material.customProgramCacheKey().includes('world-metric-scenery'));
  assert.ok(ironMetric.length>=3,'Exercise real cached iron-site surfaces.');
  const watched=watchDisposal(sharedWithSites),identities=new Map([...sharedWithSites].map(material=>[material,material.uuid]));
  try{
    for(const site of sites)disposeGroup(site);
    for(const material of sharedWithSites){
      assert.equal(watched.counts.get(material),0,`Still-owned ${material.name} (${material.uuid}) was disposed by a resource site.`);
      assert.ok(materialsIn(landscape.group).has(material),'Persistent scenery must retain the same material object.');
      assert.equal(material.uuid,identities.get(material));
    }
    const replacement=createResourceSite(WORLD_NODES.find(node=>node.kind==='iron'));
    try{
      const replacementMaterials=materialsIn(replacement);
      assert.ok(ironMetric.every(material=>replacementMaterials.has(material)),'Reconstruction must reuse every existing compatible iron-site metric material object.');
    }finally{disposeGroup(replacement);}
    for(const material of sharedWithSites)assert.equal(watched.counts.get(material),0);
  }finally{watched.stop();}
});

test('repeated woodland replacement disposes owned visible and shadow passes while retaining shared textures',()=>{
  const node=WORLD_NODES.find(node=>node.id==='forest2'),input=JSON.stringify(node),oldOwned=new Set(),persistent=materialsIn(landscape.group);
  let reference,textureReferences;
  for(let cycle=0;cycle<4;cycle++){
    const site=createResourceSite(node),all=materialsIn(site),owned=[...all].filter(material=>!material.userData.shared&&!persistent.has(material)),wind=[];
    site.traverse(mesh=>{if(mesh.userData.windAnimated)wind.push(mesh);});
    assert.ok(wind.some(mesh=>mesh.material.userData.vegetationKind==='pine'));
    const ownedPasses=new Set(wind.filter(mesh=>!mesh.material.userData.shared&&!persistent.has(mesh.material)).flatMap(mesh=>[mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial]));
    assert.ok(ownedPasses.size>=6,'Exercise both leaf and pine visible/depth/distance ownership.');
    for(const material of owned){assert.ok(!oldOwned.has(material),'A disposed owned material must not be returned from a cache.');oldOwned.add(material);}
    const identity=siteIdentity(site);
    if(reference)assert.deepEqual(identity,reference,'Rebuilding resources must preserve geometry, instances, picking identities, and material configuration.');
    else reference=identity;
    const textures=new Set(wind.map(mesh=>mesh.material.map).filter(Boolean));
    if(textureReferences)assert.deepEqual(textures,textureReferences,'Unchanged cutout textures must retain their object identity.');else textureReferences=textures;
    const textureHashes=new Map([...textures].map(texture=>[texture,texture.mipmaps?.map(mip=>typedHash(mip.data))]));
    const watched=watchDisposal(ownedPasses),textureDisposals=watchDisposal(textures);
    try{
      disposeGroup(site);
      for(const material of ownedPasses)assert.equal(watched.counts.get(material),1,`${material.type} ${material.name} (${material.uuid}) must be released once with its owner.`);
      for(const texture of textures){assert.equal(textureDisposals.counts.get(texture),0,'Shared cutout artwork belongs to its existing texture cache.');assert.deepEqual(texture.mipmaps?.map(mip=>typedHash(mip.data)),textureHashes.get(texture));}
    }finally{watched.stop();textureDisposals.stop();}
    assert.equal(JSON.stringify(node),input,'Render-resource construction and disposal must not mutate node input.');
  }
});

test('live resource sites keep independent mutable foliage state and instance buffers',()=>{
  const node=WORLD_NODES.find(node=>node.kind==='wood'),first=createResourceSite(node),second=createResourceSite(node);
  try{
    const a=first.getObjectByName('Broadleaf canopies'),b=second.getObjectByName('Broadleaf canopies');
    assert.ok(a?.isInstancedMesh&&b?.isInstancedMesh);
    assert.notEqual(a.material,b.material);assert.notEqual(a.customDepthMaterial,b.customDepthMaterial);assert.notEqual(a.customDistanceMaterial,b.customDistanceMaterial);
    assert.equal(a.material.map,b.material.map,'Read-only artwork may be shared.');
    assert.notEqual(a.instanceMatrix,b.instanceMatrix);assert.notEqual(a.instanceColor,b.instanceColor);
    for(const name of ['windRoot','windFlex','windMotion','groundCoverLod'])assert.notEqual(a.geometry.attributes[name],b.geometry.attributes[name]);
    const color=b.material.color.clone(),alpha=b.material.alphaTest,normal=b.material.normalScale.clone(),matrix=b.instanceMatrix.array.slice();
    a.material.color.setHex(0x123456);a.material.alphaTest=.25;a.material.normalScale.set(.23,.71);a.instanceMatrix.array[12]+=3;
    assert.ok(b.material.color.equals(color));assert.equal(b.material.alphaTest,alpha);assert.ok(b.material.normalScale.equals(normal));assert.deepEqual(b.instanceMatrix.array,matrix);
    const watched=watchDisposal(materialsIn(second));
    try{disposeGroup(first);for(const [material,count]of watched.counts)assert.equal(count,0,`Disposing the other live site invalidated ${material.uuid}.`);}finally{watched.stop();}
  }finally{disposeGroup(second);}
});

function preparationRenderer(initialTarget={name:'Previous presentation target'}){
  let target=initialTarget,lost=false;
  const calls=[],targets=[],renderer={
    getContext:()=>({isContextLost:()=>lost}),getRenderTarget:()=>target,
    setRenderTarget(value){targets.push(value);target=value;},
    compile(object,camera,scene){calls.push({object,camera,scene,target});},
    render(){assert.fail('Preparation must not render an extra frame.');},
    compileAsync(){assert.fail('Preparation must not start asynchronous polling.');},
    initTexture(){assert.fail('This focused program preparation must not add a texture warmup.');}
  };
  return {renderer,calls,targets,initialTarget,setLost(value){lost=value;}};
}

test('movement preparation submits only the two real effect objects under the actual lights and render target',()=>{
  const {renderer,calls,targets,initialTarget}=preparationRenderer(),scene=new T.Scene(),camera=new T.PerspectiveCamera(),target={name:'Actual HDR scene target'};
  const meshes=landscape.movementMaterials;
  assert.deepEqual(meshes.map(mesh=>mesh.name),['Crushed tree stumps','Crushed fallen boughs']);
  assert.ok(meshes.every(mesh=>mesh.isInstancedMesh&&mesh.count===0&&!mesh.visible));
  scene.add(new T.DirectionalLight(0xffffff,3.4),new T.HemisphereLight(),landscape.group);
  const before=siteIdentity(landscape.group),stats=JSON.stringify(landscape.stats),cameraBefore=camera.toJSON(),children=scene.children.slice(),parents=meshes.map(mesh=>mesh.parent);
  const preparation=createMovementPreparation(renderer,meshes);
  try{
    assert.equal(preparation.prepare(scene,camera,target,'high:day:environment-a'),true);
    assert.deepEqual(calls.map(call=>call.object),meshes,'Do not compile every world or carrier combination.');
    for(const call of calls){assert.equal(call.camera,camera);assert.equal(call.scene,scene,'Use the real scene lighting, not a temporary unlit scene.');assert.equal(call.target,target);}
    assert.deepEqual(targets,[target,initialTarget]);assert.equal(renderer.getRenderTarget(),initialTarget);
    assert.deepEqual(siteIdentity(landscape.group),before,'Preparation must preserve geometry, attributes, transforms, material configuration, and texture identity.');
    assert.deepEqual(camera.toJSON(),cameraBefore);assert.deepEqual(scene.children,children);assert.deepEqual(meshes.map(mesh=>mesh.parent),parents);
    assert.ok(meshes.every(mesh=>mesh.count===0&&!mesh.visible),'Dormant pools must remain dormant.');
    assert.equal(JSON.stringify(landscape.stats),stats,'Preparation must not replay interaction state or advance simulation-facing counters.');
    assert.equal(preparation.status.attempts,1);assert.equal(preparation.status.error,null);assert.ok(Number.isFinite(preparation.status.submissionMs)&&preparation.status.submissionMs>=0);
  }finally{scene.remove(landscape.group);}
});

test('movement preparation reuses the current configuration and refreshes quality, light, and environment changes',()=>{
  const {renderer,calls}=preparationRenderer(),scene=new T.Scene(),camera=new T.PerspectiveCamera(),target={name:'HDR target'};
  const preparation=createMovementPreparation(renderer,landscape.movementMaterials);
  for(const [index,key]of ['high:day:environment-a','performance:day:environment-a','performance:dusk:environment-a','performance:dusk:environment-b','high:day:environment-a'].entries()){
    const actualTarget=key.startsWith('performance')?null:target;
    assert.equal(preparation.prepare(scene,camera,actualTarget,key),true);
    assert.equal(preparation.status.attempts,index+1);assert.equal(calls.length,(index+1)*2);
    assert.equal(calls.at(-1).target,actualTarget,'Direct Performance rendering must compile with the screen target.');
    for(let repeat=0;repeat<5;repeat++)assert.equal(preparation.prepare(scene,camera,actualTarget,key),false);
    assert.equal(calls.length,(index+1)*2,'Ordinary frames and scene transitions with the same configuration must not resubmit.');
  }
});

test('lost contexts skip preparation and the restored-context invalidation permits the same configuration again',()=>{
  const {renderer,calls,targets,setLost}=preparationRenderer(),preparation=createMovementPreparation(renderer,landscape.movementMaterials),scene=new T.Scene(),camera=new T.PerspectiveCamera();
  setLost(true);assert.equal(preparation.prepare(scene,camera,null,'performance:day:environment-a'),false);
  assert.equal(calls.length,0);assert.equal(targets.length,0);assert.equal(preparation.status.attempts,0);
  setLost(false);assert.equal(preparation.prepare(scene,camera,null,'performance:day:environment-a'),true);assert.equal(calls.length,2);
  setLost(true);preparation.invalidate();assert.equal(preparation.prepare(scene,camera,null,'performance:day:environment-a'),false);
  assert.equal(calls.length,2);assert.equal(preparation.status.attempts,1);
  setLost(false);assert.equal(preparation.prepare(scene,camera,null,'performance:day:environment-a'),true);
  assert.equal(calls.length,4);assert.equal(preparation.status.attempts,2);assert.equal(preparation.prepare(scene,camera,null,'performance:day:environment-a'),false);
});

test('a preparation error remains visible, restores the target, and retries only after a configuration change',t=>{
  const {renderer,calls,initialTarget}=preparationRenderer(),scene=new T.Scene(),camera=new T.PerspectiveCamera(),target={name:'HDR target'},failure=new Error('Simulated renderer preparation failure'),errors=[];
  const normalCompile=renderer.compile;
  let failing=true;
  renderer.compile=function(...args){normalCompile.apply(this,args);if(failing&&calls.length===2)throw failure;};
  t.mock.method(console,'error',(...args)=>errors.push(args));
  const preparation=createMovementPreparation(renderer,landscape.movementMaterials);
  assert.equal(preparation.prepare(scene,camera,target,'high:day:environment-a'),true,'A preparation failure must not reject ordinary Begin/Continue.');
  assert.equal(renderer.getRenderTarget(),initialTarget);assert.equal(preparation.status.error,failure.message);assert.equal(preparation.status.attempts,1);
  assert.equal(errors.length,1);assert.equal(errors[0][1],failure,'Retain the original error for diagnosis.');
  for(let repeat=0;repeat<5;repeat++)assert.equal(preparation.prepare(scene,camera,target,'high:day:environment-a'),false);
  assert.equal(calls.length,2);assert.equal(errors.length,1);assert.equal(preparation.status.error,failure.message);
  failing=false;assert.equal(preparation.prepare(scene,camera,null,'performance:day:environment-a'),true);
  assert.equal(renderer.getRenderTarget(),initialTarget);assert.equal(preparation.status.error,null);assert.equal(preparation.status.attempts,2);assert.equal(calls.length,4);assert.equal(errors.length,1);
});

test('both real iron sites use the same compatible metric metal program without borrowing changing either asset',()=>{
  const nodes=WORLD_NODES.filter(node=>node.kind==='iron'),input=JSON.stringify(nodes),sites=nodes.map(node=>batchStatic(createResourceSite(node)));
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(),{renderer,calls}=preparationRenderer();
  scene.add(...sites);
  try{
    const meshes=sites.map(site=>site.getObjectByName('Resource site metal')),[foundry,meridian]=meshes;
    assert.deepEqual(meshes.map(mesh=>mesh.count),[20,18],'The traced Meridian draw is the real eighteen-box, 216-triangle batch.');
    assert.equal(meridian.geometry.index.count/3*meridian.count,216);
    assert.equal(foundry.material,meridian.material,'Both sites must borrow the exact shared metric material, not merely equal clones.');
    assert.ok(foundry.material.isMeshPhysicalMaterial&&foundry.material.userData.shared);
    assert.equal(foundry.material.customProgramCacheKey(),'neutral-plate-reflectance-v1:world-metric-scenery-v3');
    for(const mesh of meshes){
      assert.ok(mesh.isInstancedMesh&&mesh.instanceColor);
      assert.equal(mesh.instanceColor.itemSize,3);assert.equal(mesh.instanceColor.normalized,false);
      assert.equal(mesh.morphTexture,null);assert.deepEqual(mesh.geometry.morphAttributes,{});
      assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);
    }
    assert.deepEqual(Object.keys(foundry.geometry.attributes),Object.keys(meridian.geometry.attributes));
    for(const name of Object.keys(foundry.geometry.attributes)){
      const a=foundry.geometry.attributes[name],b=meridian.geometry.attributes[name];
      assert.equal(a.itemSize,b.itemSize);assert.equal(a.normalized,b.normalized);assert.equal(typedHash(a.array),typedHash(b.array));
    }
    assert.equal(typedHash(foundry.geometry.index.array),typedHash(meridian.geometry.index.array));
    const borrowed=[...landscape.movementMaterials,foundry],before=sites.map(siteIdentity),parents=meshes.map(mesh=>mesh.parent),geometry=foundry.geometry,material=foundry.material;
    const compileHook=material.onBeforeCompile,cacheHook=material.customProgramCacheKey,children=scene.children.slice();
    const preparation=createMovementPreparation(renderer,borrowed);
    assert.equal(preparation.prepare(scene,camera,null,'performance:day:final-environment:'+material.uuid),true);
    assert.equal(calls.length,3);assert.equal(calls.at(-1).object,foundry,'Compile the existing batch instead of constructing a representative clone.');
    assert.ok(calls.every(call=>call.scene===scene&&call.camera===camera&&call.target===null));
    assert.deepEqual(sites.map(siteIdentity),before,'Borrowing must preserve shapes, transforms, picking, instance colours, and material settings.');
    assert.deepEqual(meshes.map(mesh=>mesh.parent),parents);assert.deepEqual(scene.children,children);
    assert.equal(foundry.geometry,geometry);assert.equal(foundry.material,material);
    assert.equal(material.onBeforeCompile,compileHook);assert.equal(material.customProgramCacheKey,cacheHook,'Preparation must preserve shader cache identity.');
    assert.equal(JSON.stringify(nodes),input);
  }finally{for(const site of sites){scene.remove(site);disposeGroup(site);}}
});

test('production site replacement keeps five bounded current borrowed shaders and reuses preparation across Continue',()=>{
  // Exercise the production setGame method without a GPU. Only construction of
  // the renderer and unrelated lighting/camera services is replaced; real sites,
  // city construction, resource disposal, and the selection loop still run.
  const {renderer,calls,setLost}=preparationRenderer(),scene=Object.create(GameScene.prototype);
  Object.assign(scene,{scene:new T.Scene(),cityLighting:{reset(){}},impactLights:[],landscape,
    movementMaterials:[...landscape.movementMaterials],enemyCities:[],labels:[],pickables:[],fx:[],
    cinematic:{reset(){}},cameraPrevious:new T.Vector3(),focus:new T.Vector3(),light:'day',setLighting(){}});
  const borrowed=scene.movementMaterials,preparation=createMovementPreparation(renderer,borrowed),camera=new T.PerspectiveCamera();
  const state=()=>{const value=createGame('crawler','standard');value.enemies=[];return value;};
  const key=()=>`performance:day:final-environment:${scene.movementMaterialKey}`;
  const expectedNames=['metal ffffff','rock ffffff painterly ruin','brick ffffff painterly ruin','stone bbb9a4 painterly ruin','pavement 90917e painterly ruin'];
  const expectedKeys=['neutral-plate-reflectance-v1:world-metric-scenery-v3','painterly-ruin-stone-v3:world-metric-scenery-v3:painterly-bank-rock-v2','painterly-ruin-stone-v3:world-metric-scenery-v3','painterly-ruin-stone-v3','painterly-ruin-stone-v3'];
  const owner=mesh=>scene.labels.find(site=>site.getObjectByProperty('uuid',mesh.uuid)===mesh);
  const clean=()=>{for(const owner of [scene.city?.root,...scene.enemyCities.map(city=>city.root),...scene.labels]){owner?.removeFromParent();if(owner)disposeGroup(owner);}};
  try{
    scene.setGame(state());
    assert.equal(scene.movementMaterials,borrowed,'The preparation helper must retain the same bounded array.');
    assert.equal(borrowed.length,7);assert.deepEqual(borrowed.slice(0,2),landscape.movementMaterials);
    const first=borrowed.slice(2),materials=first.map(mesh=>mesh.material),initialKey=key();
    assert.equal(new Set(borrowed).size,7,'Borrow one mesh per traced shape, not every matching site or material.');
    assert.deepEqual(materials.map(m=>m.name),expectedNames);assert.deepEqual(materials.map(m=>m.customProgramCacheKey()),expectedKeys);
    assert.deepEqual(first.map(m=>!!m.isInstancedMesh),[true,true,true,false,false],'Real shader shapes must match all four first-use traces.');
    assert.ok(first.every(mesh=>owner(mesh)&&mesh.parent===owner(mesh)),'Every representative remains owned by its real batched site.');
    assert.equal(first[0],scene.labels.map(site=>site.getObjectByName('Resource site metal')).find(Boolean),'The original metal representative remains at index 2.');
    assert.ok(materials.every(m=>m.userData.shared));
    const before=scene.labels.map(siteIdentity),parents=first.map(m=>m.parent),hooks=materials.map(m=>[m.onBeforeCompile,m.customProgramCacheKey]);
    assert.equal(preparation.prepare(scene.scene,camera,null,initialKey),true);assert.equal(calls.length,7);assert.deepEqual(calls.map(c=>c.object),borrowed);
    assert.deepEqual(scene.labels.map(siteIdentity),before,'Preparation must preserve every shape, transform, picking field, instance colour and material setting.');
    assert.deepEqual(first.map(m=>m.parent),parents);assert.deepEqual(materials.map(m=>[m.onBeforeCompile,m.customProgramCacheKey]),hooks);
    const watched=[];let sharedMaterialDisposals=0;
    const materialCheck=()=>sharedMaterialDisposals++;
    for(const material of materials)material.addEventListener('dispose',materialCheck);
    for(const mesh of first){
      const counts={mesh:0,geometry:0};
      const dropCheck=kind=>()=>{counts[kind]++;assert.equal(borrowed.length,2,'Drop all five borrowed meshes before any owner releases resources.');assert.ok(first.every(old=>!borrowed.includes(old)));};
      const meshCheck=dropCheck('mesh'),geometryCheck=dropCheck('geometry');
      mesh.addEventListener('dispose',meshCheck);mesh.geometry.addEventListener('dispose',geometryCheck);watched.push({mesh,counts,meshCheck,geometryCheck});
    }
    try{
      scene.setGame(state());
      const current=borrowed.slice(2);
      assert.equal(scene.movementMaterials,borrowed);assert.equal(borrowed.length,7);assert.deepEqual(borrowed.slice(0,2),landscape.movementMaterials);
      assert.ok(current.every((mesh,i)=>mesh!==first[i]&&mesh.geometry!==first[i].geometry&&mesh.material===materials[i]));
      assert.ok(first.every(mesh=>!borrowed.includes(mesh)));assert.ok(current.every(mesh=>owner(mesh)&&mesh.parent===owner(mesh)));
      for(const {mesh,counts}of watched){assert.equal(counts.mesh,mesh.isInstancedMesh?1:0);assert.equal(counts.geometry,1);}
      assert.equal(sharedMaterialDisposals,0);
      assert.equal(key(),initialKey,'A new site UUID must not cause unnecessary same-program preparation.');
      assert.equal(preparation.prepare(scene.scene,camera,null,key()),false);assert.equal(calls.length,7);
      const target={name:'High-quality presentation target'},qualityKey=key().replace('performance:','high:');
      assert.equal(preparation.prepare(scene.scene,camera,target,qualityKey),true);assert.equal(calls.length,14);
      assert.deepEqual(calls.slice(-5).map(c=>c.object),current);assert.ok(calls.slice(-7).every(c=>c.target===target));
      setLost(true);preparation.invalidate();assert.equal(preparation.prepare(scene.scene,camera,target,qualityKey),false);assert.equal(calls.length,14);
      setLost(false);assert.equal(preparation.prepare(scene.scene,camera,target,qualityKey),true);assert.equal(calls.length,21);
      assert.deepEqual(calls.slice(-5).map(c=>c.object),current,'Restoration must prepare all current live site meshes rather than disposed batches.');
      assert.ok(calls.slice(7).every(call=>!first.includes(call.object)));
      assert.equal(preparation.prepare(scene.scene,camera,target,qualityKey),false);assert.equal(calls.length,21);
    }finally{
      for(const {mesh,meshCheck,geometryCheck}of watched){mesh.removeEventListener('dispose',meshCheck);mesh.geometry.removeEventListener('dispose',geometryCheck);}
      for(const material of materials)material.removeEventListener('dispose',materialCheck);
    }
  }finally{clean();}
});
