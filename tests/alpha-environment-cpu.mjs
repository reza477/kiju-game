// Full production landscape construction and paired save identity, in Node.
// Inert procedural-texture surfaces only: no browser, network or WebGL renderer.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import * as T from '../vendor/three.module.js';
import * as terrain from '../src/terrain.js';
import {createLandscape,createResourceSite} from '../src/landscape.js';
import {WORLD_NODES} from '../src/simulation.js';
import {valleyGroundCover} from '../src/authored-valley.js';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),revision=process.env.BASELINE_REV||'aef1f02';
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/alpha1/cpu-identity');
const report={revision,candidateRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),fixture:'Actual baseline/current landscape construction in Node with inert material canvases/images; no network, renderer or GPU.',checks:[],errors:[]};
const gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]??(()=>{})});
const previousDocument=globalThis.document;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};
const gitFiles=new Set(['src/terrain.js','src/environment-geometry.js','src/authored-valley.js','src/landscape.js']),urls=new Map();
function historicalUrl(file){
  if(urls.has(file))return urls.get(file);
  let source=execFileSync('git',['show',revision+':'+file],{cwd:root,encoding:'utf8'});
  source=source.replace(/from\s+(['"])(\.[^'"]+)\1/g,(whole,quote,spec)=>{
    const relative=path.posix.normalize(path.posix.join(path.posix.dirname(file),spec));
    return 'from '+quote+(gitFiles.has(relative)?historicalUrl(relative):pathToFileURL(path.join(root,relative)).href)+quote;
  });
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');urls.set(file,url);return url;
}
function placements(group){
  const batches=new Map();
  group.traverse(mesh=>{
    if(!mesh.isInstancedMesh||!mesh.count)return;
    // Scene traversal order is unchanged for ordinary batches. Spatial children
    // retain their immutable original indices, independently of render cells.
    const key=mesh.userData.spatialBatch??mesh.name;
    if(!batches.has(key))batches.set(key,[]);
    const rows=batches.get(key),indices=mesh.userData.spatialIndices,roots=mesh.geometry.attributes.windRoot;
    for(let local=0;local<mesh.count;local++){
      const index=indices?indices[local]:rows.length;
      assert.equal(rows[index],undefined,'Duplicate canonical instance slot in '+key);
      rows[index]=[mesh.instanceMatrix.array[local*16+12],mesh.instanceMatrix.array[local*16+14],...(roots?[roots.getX(local),roots.getZ(local)]:[])];
    }
  });
  return [...batches].sort(([a],[b])=>a.localeCompare(b));
}
function inventory(group){
  let meshes=0,triangles=0,instances=0,wind=0,cutouts=0;const sharedAttributes=new Set();
  group.traverse(mesh=>{
    if(!mesh.isMesh)return;meshes++;
    for(const attribute of Object.values(mesh.geometry.attributes)){sharedAttributes.add(attribute);assert.ok(attribute.array.every(Number.isFinite),'Non-finite attribute in '+mesh.name);}
    const count=mesh.isInstancedMesh?mesh.count:1;
    triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*count;
    if(mesh.isInstancedMesh){instances+=count;assert.ok(mesh.instanceMatrix.array.every(Number.isFinite),'Non-finite matrix in '+mesh.name);}
    if(mesh.userData.windAnimated)wind+=count;
    if(mesh.material.alphaTest>0)cutouts++;
  });
  return{meshes,triangles,instances,wind,cutouts,uniqueAttributeBytes:[...sharedAttributes].reduce((sum,a)=>sum+a.array.byteLength,0)};
}
function rootsByAnchor(group){
  const roots=new Map();group.traverse(mesh=>{
    if(!['Broadleaf canopies','Pine boughs','Distant Broadleaf canopies','Distant Pine boughs'].includes(mesh.name))return;
    const a=mesh.geometry.attributes.windRoot;for(let i=0;i<a.count;i++)roots.set(a.getX(i)+','+a.getZ(i),a.getY(i));
  });return roots;
}
function shaderFor(material,type='standard'){
  const library=T.ShaderLib[type],shader={uniforms:{},vertexShader:library.vertexShader,fragmentShader:library.fragmentShader};material.onBeforeCompile(shader);return shader;
}
try{
  const historicalTerrain=await import(historicalUrl('src/terrain.js')),historical=await import(historicalUrl('src/landscape.js'));
  const baseline=historical.createLandscape();report.baseline=inventory(baseline.group);
  const current=createLandscape();report.current=inventory(current.group);
  assert.deepEqual(current.crushables,baseline.crushables,'Saved scenery IDs, order, kinds, sizes and x/z anchors changed.');
  const oldPlacements=placements(baseline.group),newPlacements=placements(current.group);
  const placementDifferences=[],oldBatches=new Map(oldPlacements),newBatches=new Map(newPlacements);
  const additions=[...newBatches.keys()].filter(name=>!oldBatches.has(name));
  assert.deepEqual(additions,['Low meadow grass'],'Only the explicitly added immutable detail batch may be new.');
  for(const [name,old]of oldBatches){
    const now=newBatches.get(name);
    if(old.length!==now?.length){placementDifferences.push({name,oldCount:old.length,newCount:now?.length});continue;}
    for(let i=0;i<old.length;i++)if(!isDeepStrictEqual(old[i],now[i]))placementDifferences.push({name,index:i,before:old[i],after:now[i]});
  }
  report.placementDifferences=placementDifferences;
  let meadowInstances=0,meadowTriangles=0,maxMeadowRootError=0;
  current.group.traverse(mesh=>{
    if(!mesh.isInstancedMesh||mesh.name!=='Low meadow grass')return;
    meadowInstances+=mesh.count;meadowTriangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count;
    assert.equal(mesh.castShadow,false,'Small meadow detail must not add shadow geometry.');
    const roots=mesh.geometry.attributes.windRoot;assert.ok(roots,'Every meadow tuft requires a wind root.');
    for(let i=0;i<mesh.count;i++){
      const x=roots.getX(i),y=roots.getY(i),z=roots.getZ(i),height=roots.getW(i),matrix=mesh.instanceMatrix.array;
      assert.ok([x,y,z,height].every(Number.isFinite)&&height>0,'Invalid meadow wind root.');
      assert.equal(terrain.protectedResource(x,z),false,'New meadow grass entered a protected resource clearing.');
      assert.equal(matrix[i*16+12],x);assert.equal(matrix[i*16+14],z);
      const error=Math.abs(y-terrain.renderedTerrainHeight(x,z));maxMeadowRootError=Math.max(maxMeadowRootError,error);
      assert.ok(error<.001,'New meadow grass root does not follow the visible terrain.');
      assert.ok(Math.abs(matrix[i*16+13]-y-.018)<.00001,'New meadow blade base left its intended tiny receiving-surface offset.');
    }
  });
  assert.ok(meadowInstances>0&&meadowTriangles<=150000,'The new meadow layer must remain within its explicit triangle budget.');
  assert.equal(newBatches.get('Low meadow grass').length,meadowInstances);
  assert.equal(report.current.instances,report.baseline.instances+meadowInstances,'Every original instance must survive independently of new meadow detail.');
  report.addedMeadow={instances:meadowInstances,triangles:meadowTriangles,maxRootError:maxMeadowRootError};
  report.checks.push('Only Low meadow grass is added; every new tuft is finite, rooted, outside resource clearings and within the 150k-triangle budget.');
  report.checks.push('Exact original scenery IDs/order/x/z/size survive.');
  report.anchors=current.crushables.length;report.batches=newPlacements.length;
  const currentRoots=rootsByAnchor(current.group),oldRoots=rootsByAnchor(baseline.group);let treeRoots=0,changedTreeRoots=0;
  for(const anchor of current.crushables.filter(r=>r.kind==='tree')){
    const key=Math.fround(anchor.x)+','+Math.fround(anchor.z),y=currentRoots.get(key);
    const sample=Math.max(Math.abs(anchor.x),Math.abs(anchor.z))>178?terrain.renderedTerrainHeight:terrain.terrainHeight;
    assert.equal(y,Math.fround(sample(anchor.x,anchor.z)),'Tree is not rooted on the actual receiving surface: '+anchor.id);
    assert.ok(oldRoots.has(key),'Tree lost its original anchor.');treeRoots++;changedTreeRoots+=y!==oldRoots.get(key);
  }
  report.treeRoots={checked:treeRoots,changed:changedTreeRoots};
  const resources=[];
  for(const node of WORLD_NODES){const old=historical.createResourceSite(node),now=createResourceSite(node);assert.deepEqual(now.position.toArray(),old.position.toArray());assert.deepEqual(placements(now),placements(old));resources.push({id:node.id,position:now.position.toArray()});}
  report.resources=resources;report.checks.push('All resource transforms/instance placements match; every saved tree root matches its actual visible surface.');
  let innerSamples=0,selectionSamples=0,mountainChanges=0;
  for(let z=-600;z<=600;z+=10)for(let x=-600;x<=600;x+=10){
    assert.equal(terrain.scenerySelectionHeight(x,z),historicalTerrain.scenerySelectionHeight(x,z),'Historical deterministic selection surface changed.');selectionSamples++;
    const value=terrain.terrainHeight(x,z),old=historicalTerrain.terrainHeight(x,z);assert.ok(Number.isFinite(value));
    if(Math.max(Math.abs(x),Math.abs(z))<=190){assert.equal(value,old,'Playable inner terrain moved.');innerSamples++;}else mountainChanges+=value!==old;
  }
  const geometry=current.ground.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index;
  for(let i=0;i<p.count;i++){assert.equal(p.getY(i),Math.fround(terrain.terrainHeight(p.getX(i),p.getZ(i))),'Ground vertex no longer matches the shared height field.');assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-6,'Invalid recomputed terrain normal.');}
  let meshSamples=0,maxMeshError=0;
  for(let i=0;i<index.count;i+=579){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);const x=p.getX(a)*.23+p.getX(b)*.38+p.getX(c)*.39,z=p.getZ(a)*.23+p.getZ(b)*.38+p.getZ(c)*.39,y=p.getY(a)*.23+p.getY(b)*.38+p.getY(c)*.39;const error=Math.abs(y-terrain.renderedTerrainHeight(x,z));assert.ok(error<2e-5,'Actual triangle and contact sampler diverge.');maxMeshError=Math.max(maxMeshError,error);meshSamples++;}
  report.terrain={selectionSamples,innerSamples,mountainChanges,vertices:p.count,triangleSamples:meshSamples,maxMeshError};
  report.checks.push('Historical selection and all inner terrain are exact; every mesh vertex and sampled rendered triangle agrees with shared contact sampling.');
  const weights=current.ground.userData.surfaceTextures[0],size=weights.image.width,data=weights.image.data,spacing=1200/(size-1),cache=new Map();
  const height=(col,row)=>Math.fround(terrain.renderedTerrainHeight(col*spacing-600,600-row*spacing));
  const relief=(col,row)=>{
    const key=row*size+col;if(cache.has(key))return cache.get(key);
    const y=height(col,row),dx=(height(Math.min(size-1,col+1),row)-height(Math.max(0,col-1),row))/(2*spacing),dz=(height(col,Math.min(size-1,row+1))-height(col,Math.max(0,row-1)))/(2*spacing),reach=5;
    const curvature=(height(Math.max(0,col-reach),row)+height(Math.min(size-1,col+reach),row)+height(col,Math.max(0,row-reach))+height(col,Math.min(size-1,row+reach))-4*y)/(reach*spacing)**2;
    const value=Math.fround(valleyGroundCover(col*spacing-600,600-row*spacing,Math.hypot(dx,dz),curvature).relief);cache.set(key,value);return value;
  };
  let gradientChecks=0,maxGradientError=0;
  for(let i=0;i<384;i++){
    const col=i<4?[0,0,size-1,size-1][i]:(i*317)%size,row=i<4?[0,size-1,0,size-1][i]:(i*641+23)%size,offset=(row*size+col)*4;
    const expected=[relief(Math.min(size-1,col+1),row)-relief(Math.max(0,col-1),row),relief(col,Math.min(size-1,row+1))-relief(col,Math.max(0,row-1))];
    for(let axis=0;axis<2;axis++){const decoded=data[offset+2+axis]/255*2-1,error=Math.abs(decoded-expected[axis]);assert.ok(error<=1/255+1e-10,'Packed gradient slope or sign differs from actual terrain relief.');maxGradientError=Math.max(maxGradientError,error);gradientChecks++;}
    const grass=data[offset]/255,rock=data[offset+1]/255,soil=Math.max(0,1-grass-rock);assert.ok(grass+rock<=1+1/255+1e-12);assert.ok(soil>=0);
  }
  const groundShader=shaderFor(current.ground.material);assert.equal((groundShader.fragmentShader.match(/texture2D\(uGroundWeights/g)||[]).length,1,'Packed gradients must use the existing field sample only.');
  report.groundGradients={checks:gradientChecks,maxGradientError,limit:1/255};report.checks.push('Packed relief gradients have correct axes/sign with at most one 8-bit signed step of error; ground uses one field lookup.');
  const groundMaterial=current.ground.material,colour=groundMaterial.map,colourData=colour.image.data;
  assert.equal(groundMaterial.opacity,1);assert.equal(groundMaterial.transparent,false);assert.equal(groundMaterial.depthWrite,true);assert.equal(groundMaterial.alphaTest,0);assert.equal(groundMaterial.alphaHash,false);
  assert.equal(colour.colorSpace,T.SRGBColorSpace,'Packing a linear cavity channel must preserve the albedo RGB encoding.');assert.equal(colour.premultiplyAlpha,false);assert.equal(weights.colorSpace,T.NoColorSpace);
  assert.equal(colour.image.width,size);assert.equal(colour.image.height,size);assert.equal(colourData.length,data.length);
  let cavityTexels=0,clearTexels=0,stoneFreeTexels=0,minCavity=1,maxCavity=0;
  for(let i=0;i<colourData.length;i+=4){
    const factor=colourData[i+3]/255,rock=data[i+1]/255;
    assert.ok(factor>=.52-1/255&&factor<=1,'Ground cavity channel left its bounded shading range.');
    assert.ok(1-factor<=.48*rock+1/255,'Cavity darkness extends beyond its encoded geological material.');
    if(rock===0){assert.equal(colourData[i+3],255,'Stone-free ground must retain a clear cavity channel.');stoneFreeTexels++;}
    if(colourData[i+3]<255)cavityTexels++;else clearTexels++;
    minCavity=Math.min(minCavity,factor);maxCavity=Math.max(maxCavity,factor);
  }
  assert.ok(cavityTexels>0&&clearTexels>0&&stoneFreeTexels>0,'Packed cavity fixture must include both geological detail and clear open ground.');
  let concaveSamples=0;
  for(let i=0;i<384;i++){
    const col=(i*317)%size,row=(i*641+23)%size;if(colourData[(row*size+col)*4+3]===255)continue;
    const y=height(col,row),reach=5,curvature=(height(Math.max(0,col-reach),row)+height(Math.min(size-1,col+reach),row)+height(col,Math.max(0,row-reach))+height(col,Math.min(size-1,row+reach))-4*y)/(reach*spacing)**2;
    assert.ok(y>12&&curvature>.007,'Geological cavity shading must belong to elevated concave receiving surfaces.');concaveSamples++;
  }
  assert.ok(concaveSamples>0);
  assert.match(groundShader.fragmentShader,/groundCavity=clamp\(diffuseColor\.a,\.52,1\.0\)/);
  const restoreOpacity=groundShader.fragmentShader.indexOf('diffuseColor.a=opacity;');
  assert.ok(restoreOpacity>groundShader.fragmentShader.indexOf('#include <map_fragment>')&&restoreOpacity<groundShader.fragmentShader.indexOf('#include <alphatest_fragment>'),'Packed ground alpha must be restored to opacity before alpha testing.');
  assert.match(groundShader.fragmentShader,/reflectedLight\.indirectDiffuse\*=groundCavity/);
  report.groundCavity={min:minCavity,max:maxCavity,cavityTexels,clearTexels,stoneFreeTexels,concaveSamples,opacity:groundMaterial.opacity,transparent:groundMaterial.transparent,rgbColorSpace:colour.colorSpace};
  report.checks.push('Ground cavity alpha stays bounded and stone-masked on elevated concave terrain; RGB stays sRGB and the shader restores fully opaque ground before alpha testing.');
  let windMeshes=0,alphaPasses=0;
  current.group.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.userData.windAnimated)return;windMeshes++;
    const visible=shaderFor(mesh.material),depth=shaderFor(mesh.customDepthMaterial,'depth'),distance=shaderFor(mesh.customDistanceMaterial,'distance');
    assert.equal(visible.uniforms.uVegetationTime,depth.uniforms.uVegetationTime);assert.equal(visible.uniforms.uVegetationTime,distance.uniforms.uVegetationTime);
    assert.match(visible.vertexShader,/rootedWindOffset\(vegetationPoint\) \* coverScale/);assert.match(depth.vertexShader,/rootedWindOffset\(vegetationPoint\) \* coverScale/);
    for(const pass of[mesh.customDepthMaterial,mesh.customDistanceMaterial]){assert.equal(pass.map,mesh.material.map);assert.equal(pass.alphaTest,mesh.material.alphaTest);assert.equal(pass.side,mesh.material.side);if(pass.alphaTest>0)alphaPasses++;}
    if(mesh.castShadow)assert.ok(mesh.geometry.attributes.groundCoverLod.array.every(value=>value===0),'Distance-faded grass cannot use the shadow-camera position as its LOD observer.');
    if(mesh.userData.spatialIndices)assert.ok(mesh.boundingSphere.radius>0&&Number.isFinite(mesh.boundingSphere.radius));
  });
  const waterShader=shaderFor(current.water.material,'physical');assert.ok(!waterShader.fragmentShader.includes('vec3 worldWind('),'Water must interpolate vertex wind.');
  const river=current.water.geometry.attributes.riverField;assert.ok(river.array.every(Number.isFinite));for(let i=0;i<river.count;i++)assert.ok(river.getY(i)>0,'River channel width cannot be zero or negative.');
  report.shaderSetup={windMeshes,alphaPasses,riverVertices:river.count};report.checks.push('Actual wind cells retain shared animation uniforms and matching alpha/depth/distance maps; river attributes are finite with positive channel width.');
  const originalMatrices=[];
  current.group.traverse(mesh=>{if(mesh.isInstancedMesh&&mesh.count)originalMatrices.push({mesh,count:mesh.count,array:mesh.instanceMatrix.array.slice(0,mesh.count*16)});});
  const damagedAnchors=Array.from({length:40},(_,i)=>current.crushables[Math.floor(i*(current.crushables.length-1)/39)]),damage=damagedAnchors.map(r=>r.id);
  assert.equal(new Set(damage).size,40,'Saved destruction fixture must address 40 distinct anchors.');
  assert.deepEqual([...new Set(damagedAnchors.map(r=>r.kind))].sort(),[...new Set(current.crushables.map(r=>r.kind))].sort(),'Saved destruction fixture must cover every scenery kind.');
  current.resetInteractions({mode:'expedition',damage:JSON.parse(JSON.stringify(damage))});assert.equal(current.stats.destroyedCount,40);current.resetInteractions();assert.equal(current.stats.poolDraw.submittedInstances,0);assert.deepEqual(placements(current.group),newPlacements,'Actual saved destruction reset failed to restore original cell placements.');
  for(const {mesh,count,array}of originalMatrices){assert.equal(mesh.count,count,'Saved destruction reset changed an original batch count.');assert.deepEqual(mesh.instanceMatrix.array.slice(0,count*16),array,'Saved destruction reset did not restore every matrix component for '+mesh.name);}
  report.saveRestoration={anchors:damage.length,kinds:[...new Set(damagedAnchors.map(r=>r.kind))].sort(),meshes:originalMatrices.length,matrices:originalMatrices.reduce((sum,row)=>sum+row.count,0)};
  report.checks.push('Actual 40-anchor saved destruction roundtrip covers every scenery kind, restores all 16 matrix elements on every original active instance, and resets dormant pools.');
  const pinePool=current.group.getObjectByName('Crushed fallen pine boughs'),broadleafPool=current.group.getObjectByName('Crushed fallen boughs');
  assert.notEqual(pinePool.material.map,broadleafPool.material.map,'Fallen pine and broadleaf silhouettes must remain distinct.');
  report.speciesDebris=[];
  for(const name of ['Pine boughs','Distant Pine boughs','Broadleaf canopies']){
    const roots=new Set();current.group.traverse(mesh=>{if(mesh.name===name&&mesh.isInstancedMesh){const attribute=mesh.geometry.attributes.windRoot;for(let i=0;i<mesh.count;i++)roots.add(attribute.getX(i)+','+attribute.getZ(i));}});
    const anchor=current.crushables.find(r=>r.kind==='tree'&&roots.has(Math.fround(r.x)+','+Math.fround(r.z)));assert.ok(anchor,'Missing actual saved tree for '+name);
    current.resetInteractions({mode:'expedition',damage:[anchor.id]});assert.equal(current.stats.destroyedCount,1);
    const expected=name.endsWith('Pine boughs')?pinePool:broadleafPool,other=expected===pinePool?broadleafPool:pinePool;
    assert.equal(expected.count,3,'Saved '+name+' damage selected the wrong foliage pool.');assert.equal(expected.visible,true);assert.equal(other.count,0);assert.equal(other.visible,false);
    current.resetInteractions();assert.equal(current.stats.poolDraw.submittedInstances,0);
    for(const {mesh,count,array}of originalMatrices){assert.equal(mesh.count,count);assert.deepEqual(mesh.instanceMatrix.array.slice(0,count*16),array,'Species-specific damage failed full matrix restoration for '+mesh.name);}
    report.speciesDebris.push({batch:name,anchor:anchor.id,pool:expected.name});
  }
  report.checks.push('Actual near pine, distant pine and broadleaf saved trees select their own foliage pool and restore every original matrix exactly.');
  assert.deepEqual(placementDifferences,[],'Scenery x/z placement or canonical instance index changed.');
  report.checks.push('All normalized instance/root x/z placements match the baseline exactly.');
}catch(error){report.errors.push(error.stack);process.exitCode=1;}
finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
