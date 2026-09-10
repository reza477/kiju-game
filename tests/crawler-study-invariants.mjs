// CPU-only comparison of real carrier geometry against the approved checkpoint.
// Canvas/image stand-ins permit construction without a browser, GPU or network;
// texture pixels are deliberately outside this geometry and attachment audit.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const checkpoint='75a5056d86e0d0fc8cb820694bbcc29e87be6e92';
const context=new Proxy({
  createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),
  measureText:text=>({width:String(text).length*8})
},{get:(target,key)=>key in target?target[key]:()=>{}});
globalThis.document={
  createElement:()=>({width:512,height:512,getContext:()=>context}),
  createElementNS:()=>({addEventListener(){},removeEventListener(){},setAttribute(){}})
};

const T=await import('../vendor/three.module.js');
const current=await import('../src/carriers.js');
const source=execFileSync('git',['show',`${checkpoint}:src/carriers.js`],{encoding:'utf8'})
  .replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g,(_,quote,relative)=>`from ${quote}${new URL(relative,new URL('../src/carriers.js',import.meta.url)).href}${quote}`);
const baseline=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function digest(root){
  const hash=createHash('sha256');
  root.updateWorldMatrix(true,true);
  root.traverse(object=>{
    hash.update(JSON.stringify([object.type,object.name,object.visible,object.position.toArray(),object.quaternion.toArray(),object.scale.toArray()]));
    if(!object.isMesh)return;
    const geometry=object.geometry;
    for(const name of Object.keys(geometry.attributes).sort()){
      const attribute=geometry.attributes[name];hash.update(name);hash.update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));
    }
    if(geometry.index)hash.update(Buffer.from(geometry.index.array.buffer));
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials)hash.update(JSON.stringify([material.name,material.color?.getHex(),material.roughness,material.metalness]));
  });
  return hash.digest('hex');
}
function anchors(city){
  return {
    deckY:city.deckY,scale:city.scale,footprint:city.footprintScale,
    supports:city.groundSupports?.map(p=>p.toArray()),slots:city.slotPositions,
    weapons:city.baseWeapons.map(w=>({position:w.group.position.toArray(),muzzles:w.muzzles.map(p=>p.position.toArray())})),
    spinners:city.spinners.map(s=>({position:s.obj.position.toArray(),axis:s.axis,speed:s.speed})),
    plots:digest(city.plots),hitGroup:digest(city.hitGroup),districts:digest(city.districts)
  };
}
function stats(root){let meshes=0,vertices=0;root.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;}});return{meshes,vertices};}
if(process.argv.includes('--snapshot')){
  // Each side starts with fresh module caches. The existing flesh authoring
  // mutates shared UVs across repeated builds, unrelated to this crawler study.
  const builder=process.argv.at(-1)==='baseline'?baseline:current,result=[];
  for(const [faction,variant]of [['kaiju','cyborg'],['kaiju','flesh'],['crawler','drill'],['airship','horizontal'],['airship','vertical'],['crawler','standard']]){
    const city=builder.makeCity(faction,false,1,variant),entry={variant,anchors:anchors(city),digest:digest(city.root),stats:stats(city.root),poses:[]};
    if(variant==='standard')for(const moving of[false,true])for(const time of[0,.25,1,3]){
      builder.animateCity(city,time,moving,0);
      entry.poses.push({position:city.rig.position.toArray(),quaternion:city.rig.quaternion.toArray(),wheels:city.spinners.map(s=>s.obj.quaternion.toArray())});
    }
    result.push(entry);
  }
  console.log(JSON.stringify(result));process.exit(0);
}
const report={checkpoint,fixture:'Node only; no browser, renderer, network, or texture pixel validation',variants:[]};
const snapshots=['baseline','current'].map(mode=>JSON.parse(execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--snapshot',mode],{encoding:'utf8',maxBuffer:16*1024*1024})));
for(let i=0;i<snapshots[0].length;i++){
  const before=snapshots[0][i],after=snapshots[1][i],variant=after.variant;
  assert.deepEqual(after.anchors,before.anchors,`${variant}: attachment, support or motion parameters changed`);
  const same=after.digest===before.digest;
  if(variant!=='standard')assert.ok(same,`${variant}: geometry or materials changed outside scope`);
  else{
    assert.equal(same,false,'The standard crawler must contain the visual change');
    assert.equal(after.anchors.spinners.length,14);assert.deepEqual(after.poses,before.poses,'Idle and moving wheel/chassis poses changed');
  }
  report.variants.push({variant,unchangedGeometry:same,supportSamples:after.anchors.supports?.length??0,before:before.stats,after:after.stats});
}
// Inspect actual new vertices before batching, including bevels, in the former
// casing/rotor envelopes. This catches an authored form reaching below support.
const study=await import('../src/crawler-study.js');
let checkedTriangles=0,checkedNormals=0;
function meshIntegrity(root){root.traverse(object=>{
  if(!object.isMesh)return;const g=object.geometry,p=g.attributes.position,n=g.attributes.normal,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(let i=0;i<(g.index?.count??p.count);i+=3){
    const index=j=>g.index?g.index.getX(j):j;a.fromBufferAttribute(p,index(i));b.fromBufferAttribute(p,index(i+1));c.fromBufferAttribute(p,index(i+2));
    assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>1e-14,`${object.name}: degenerate triangle`);checkedTriangles++;
  }
  for(let i=0;i<n.count;i++){const length=a.fromBufferAttribute(n,i).lengthSq();assert.ok(Number.isFinite(length)&&length>1e-10,`${object.name}: invalid normal`);checkedNormals++;}
});}
for(const side of[-1,1]){
  const chassis=new T.Group();study.createStandardCrawlerChassis(chassis,side);
  meshIntegrity(chassis);
  const bounds=new T.Box3().setFromObject(chassis);
  assert.ok(bounds.min.y>=.85&&bounds.max.y<=4.65,'New chassis escaped the old height bounds');
  assert.ok(bounds.min.z>=-11.4&&bounds.max.z<=11.4,'New chassis escaped the old length bounds');
  assert.ok(bounds.min.x>=side*8.95-1.65&&bounds.max.x<=side*8.95+1.65,'New chassis escaped the old width bounds');
  for(const z of[-9,0,9]){
    const wheel=new T.Group();study.createStandardCrawlerWheel(wheel,side,z);
    meshIntegrity(wheel);
    wheel.traverse(object=>{if(!object.isMesh)return;const p=object.geometry.attributes.position,v=new T.Vector3();object.updateMatrix();
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(object.matrix);assert.ok(Math.hypot(v.y,v.z)<=1.680001,'New wheel escaped its original radius');assert.ok(Math.abs(v.x)<=2.010001,'New wheel escaped its original axle envelope');}
    });
  }
}
report.integrity={checkedTriangles,checkedNormals,allNewGeometryInsideOriginalEnvelope:true};
await fs.mkdir(new URL('../artifacts/representative-crawler/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../artifacts/representative-crawler/crawler-invariants.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
