// Reproducible, offline reduction of the existing Meshy tree geometry only.
// Uses the meshoptimizer already bundled with the pinned Three dependency.
// Atlas images, original GLBs and runtime source are never modified.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {constants as fsConstants} from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {MeshoptSimplifier} from '../node_modules/three/examples/jsm/libs/meshopt_simplifier.module.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const output=path.resolve(process.env.OUTPUT_DIR||path.join(root,'artifacts/meshy-tree-coverage/lod-experiments'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const nearTriangles=Number(process.env.NEAR_TRIANGLES??1600),nearError=Number(process.env.NEAR_ERROR??.035),uvWeight=Number(process.env.NEAR_UV_WEIGHT??.10);
assert.ok(Number.isInteger(nearTriangles)&&nearTriangles>=1000&&nearTriangles<=3000);
assert.ok(Number.isFinite(nearError)&&nearError>=.005&&nearError<=.06);
assert.ok(Number.isFinite(uvWeight)&&uvWeight>=.01&&uvWeight<=.5);
const tiers=[{name:'near',triangles:nearTriangles,error:nearError},{name:'distant',triangles:500,error:Number(process.env.DISTANT_ERROR??.08)}];
assert.ok(Number.isFinite(tiers[1].error)&&tiers[1].error>=.01&&tiers[1].error<=.2,'Distant error must be an explicit bounded local experiment.');
const weights=[.10,.10,.10,uvWeight,uvWeight],farNormalWeight=Number(process.env.DISTANT_NORMAL_WEIGHT??.10);
assert.ok(Number.isFinite(farNormalWeight)&&farNormalWeight>=.01&&farNormalWeight<=.10);
await fs.mkdir(output,{recursive:true});
await assert.rejects(fs.access(path.join(output,'report.json')),'Existing experiment evidence must not be overwritten.');
await MeshoptSimplifier.ready;

function documentFrom(bytes){
  assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  let model,binary;
  for(let offset=12;offset<bytes.length;){const length=bytes.readUInt32LE(offset),kind=bytes.readUInt32LE(offset+4),chunk=bytes.subarray(offset+8,offset+8+length);if(kind===0x4e4f534a)model=JSON.parse(chunk);if(kind===0x004e4942)binary=chunk;offset+=8+length;}
  assert.ok(model&&binary);assert.ok(!model.animations?.length&&!model.skins?.length);assert.ok(!model.extensionsRequired?.length);
  assert.ok(![...(model.buffers??[]),...(model.images??[])].some(value=>value.uri));
  return{model,binary};
}
function accessor(model,binary,index){
  const a=model.accessors[index],view=model.bufferViews[a.bufferView];assert.ok(!a.sparse&&!a.normalized);
  const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  const info={5123:[Uint16Array,2,'getUint16'],5125:[Uint32Array,4,'getUint32'],5126:[Float32Array,4,'getFloat32']}[a.componentType];assert.ok(info&&components);
  const [ArrayType,bytes,method]=info,values=new ArrayType(a.count*components),data=new DataView(binary.buffer,binary.byteOffset,binary.byteLength),stride=view.byteStride??components*bytes,start=(view.byteOffset??0)+(a.byteOffset??0);
  for(let i=0;i<a.count;i++)for(let j=0;j<components;j++)values[i*components+j]=data[method](start+i*stride+j*bytes,true);
  return new T.BufferAttribute(values,components);
}
function geometryFrom(model,binary){
  // Both inspected exports contain one static primitive. Fail closed if a
  // future export changes this contract instead of guessing at material/node use.
  const scene=model.scenes[model.scene??0];assert.equal(scene.nodes.length,1);
  const node=model.nodes[scene.nodes[0]];assert.ok(!node.children?.length);
  const primitive=model.meshes[node.mesh].primitives;assert.equal(primitive.length,1);const p=primitive[0];assert.ok(p.mode===undefined||p.mode===4);
  assert.equal(model.materials.length,1);assert.equal(model.materials[0].alphaMode??'OPAQUE','OPAQUE');
  const geometry=new T.BufferGeometry();
  for(const [name,key]of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0']])geometry.setAttribute(name,accessor(model,binary,p.attributes[key]));
  geometry.setIndex(accessor(model,binary,p.indices));
  const transform=new T.Matrix4();
  if(node.matrix)transform.fromArray(node.matrix);else transform.compose(new T.Vector3().fromArray(node.translation??[0,0,0]),new T.Quaternion().fromArray(node.rotation??[0,0,0,1]),new T.Vector3().fromArray(node.scale??[1,1,1]));
  geometry.applyMatrix4(transform);geometry.computeBoundingBox();
  const originalBounds=geometry.boundingBox.clone(),height=originalBounds.max.y-originalBounds.min.y,position=geometry.attributes.position;
  let x=0,z=0,count=0;for(let i=0;i<position.count;i++)if(position.getY(i)<=originalBounds.min.y+height*.035){x+=position.getX(i);z+=position.getZ(i);count++;}
  assert.ok(height>0&&count>0);geometry.translate(-x/count,-originalBounds.min.y,-z/count);geometry.scale(1/height,1/height,1/height);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return{geometry,normalization:{originalBounds:{min:originalBounds.min.toArray(),max:originalBounds.max.toArray()},pivot:[x/count,originalBounds.min.y,z/count],uniformScale:1/height}};
}
function indexedBounds(positions,indices){
  const bounds=new T.Box3(),point=new T.Vector3();for(const index of indices)bounds.expandByPoint(point.fromArray(positions,index*3));return{min:bounds.min.toArray(),max:bounds.max.toArray()};
}
function compact(source,indices){
  const remap=new Map(),attributes=Object.fromEntries(Object.keys(source.attributes).map(name=>[name,[]])),outIndices=new Uint16Array(indices.length);
  for(let i=0;i<indices.length;i++){
    const old=indices[i];if(!remap.has(old)){remap.set(old,remap.size);for(const[name,attribute]of Object.entries(source.attributes))for(let k=0;k<attribute.itemSize;k++)attributes[name].push(attribute.array[old*attribute.itemSize+k]);}
    outIndices[i]=remap.get(old);
  }
  assert.ok(remap.size<65536);return{indices:outIndices,attributes:Object.fromEntries(Object.entries(attributes).map(([name,values])=>[name,{array:new Float32Array(values),itemSize:source.attributes[name].itemSize}]))};
}
async function writeGeometry(kind,tier,data){
  const chunks=[],layout={};let offset=0;
  for(const[name,value]of Object.entries(data.attributes)){const bytes=Buffer.from(value.array.buffer);layout[name]={byteOffset:offset,count:value.array.length/value.itemSize,itemSize:value.itemSize,componentType:5126};chunks.push(bytes);offset+=bytes.length;}
  const indices=Buffer.from(data.indices.buffer);layout.index={byteOffset:offset,count:data.indices.length,itemSize:1,componentType:5123};chunks.push(indices);
  const bytes=Buffer.concat(chunks),file=`${kind}-${tier.name}.bin`;await fs.writeFile(path.join(output,file),bytes);
  return{file,bytes:bytes.length,sha256:digest(bytes),layout};
}
async function writeLodGlb(asset, geometries){
  const chunks=[],views=[],accessors=[];let offset=0;
  const add=(array,itemSize,target,bounds)=>{
    const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),padding=(4-bytes.length%4)%4,view=views.length;
    views.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target});chunks.push(bytes,Buffer.alloc(padding));offset+=bytes.length+padding;
    const accessor={bufferView:view,componentType:array instanceof Float32Array?5126:5123,count:array.length/itemSize,type:{1:'SCALAR',2:'VEC2',3:'VEC3'}[itemSize]};
    if(bounds){accessor.min=bounds.min;accessor.max=bounds.max;}accessors.push(accessor);return accessors.length-1;
  };
  const meshes=geometries.map(({tier,data})=>({name:`${asset.kind}-${tier.name==='distant'?'far':tier.name}`,primitives:[{mode:4,
    attributes:{POSITION:add(data.attributes.position.array,3,34962,asset.bounds),NORMAL:add(data.attributes.normal.array,3,34962),TEXCOORD_0:add(data.attributes.uv.array,2,34962)},
    indices:add(data.indices,1,34963)}]}));
  const model={asset:{version:'2.0',generator:'Colossus Wake local Meshy geometry reduction'},scene:0,scenes:[{nodes:[0,1]}],
    nodes:meshes.map((mesh,i)=>({mesh:i,name:mesh.name})),meshes,buffers:[{byteLength:offset}],bufferViews:views,accessors,
    extras:{schema:1,source:asset.source,sourceSha256:asset.sourceSha256,normalization:asset.normalization,bounds:asset.bounds,sphere:asset.sphere,
      method:report.method,toolSha256:report.sourceToolSha256,flags:report.flags,nearFlags:report.nearFlags,attributeWeights:report.attributeWeights,
      levels:asset.tiers.map(({name,actualTriangles,vertices,error})=>({name:name==='distant'?'far':name,triangles:actualTriangles,vertices,error}))}};
  const document=Buffer.from(JSON.stringify(model)),json=Buffer.concat([document,Buffer.alloc((4-document.length%4)%4,0x20)]),binary=Buffer.concat(chunks);
  const header=Buffer.alloc(12),jsonHeader=Buffer.alloc(8),binaryHeader=Buffer.alloc(8);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+binary.length,8);
  jsonHeader.writeUInt32LE(json.length);jsonHeader.writeUInt32LE(0x4e4f534a,4);binaryHeader.writeUInt32LE(binary.length);binaryHeader.writeUInt32LE(0x004e4942,4);
  const bytes=Buffer.concat([header,jsonHeader,json,binaryHeader,binary]),file=`${asset.kind}-lods.glb`;await fs.writeFile(path.join(output,file),bytes);
  const decoded=documentFrom(bytes);assert.ok(!decoded.model.images?.length&&!decoded.model.textures?.length);
  for(let i=0;i<geometries.length;i++){
    const p=decoded.model.meshes[i].primitives[0],data=geometries[i].data;
    for(const[name,key]of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0']])assert.deepEqual(accessor(decoded.model,decoded.binary,p.attributes[key]).array,data.attributes[name].array);
    assert.deepEqual(accessor(decoded.model,decoded.binary,p.indices).array,data.indices);
  }
  return{file,bytes:bytes.length,sha256:digest(bytes),nodes:meshes.map(mesh=>mesh.name)};
}
const report={schema:1,startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),cwd:process.cwd(),output},
  sourceTool:'node_modules/three/examples/jsm/libs/meshopt_simplifier.module.js',sourceToolSha256:digest(await fs.readFile(path.join(root,'node_modules/three/examples/jsm/libs/meshopt_simplifier.module.js'))),
  method:'MeshoptSimplifier.simplifyWithAttributes, exact original vertex positions/normals/UVs retained by indexed subset and remap; one-time offline generation. No textures or runtime simplification. Normalized with the same root-pivot calculation as meshy-pilot.js.',
  flags:process.env.ALLOW_FAR_SEAM_COLLAPSE==='1'?['Permissive']:[],nearFlags:process.env.ALLOW_NEAR_SEAM_COLLAPSE==='1'?['Permissive']:[],attributeWeights:{normal:weights.slice(0,3),uv:weights.slice(3),distantNormal:[farNormalWeight,farNormalWeight,farNormalWeight],distantUV:[.01,.01]},
  limitations:['Triangle budget may be limited by mesh topology and locked extrema.','Simplification can change silhouette between locked extrema and create atlas interpolation changes across newly connected triangles; this CPU report is not visual acceptance.','No GPU/browser/device or animation result is established.','Binary geometry borrows each original GLB material/atlas after decoding; it contains no duplicated image or executable code.'],assets:[]};
for(const kind of ['pine','broadleaf']){
  const relative=`assets/scenery/meshy-pilot/${kind}.glb`,bytes=await fs.readFile(path.join(root,relative)),{model,binary}=documentFrom(bytes),{geometry,normalization}=geometryFrom(model,binary);
  const pos=geometry.attributes.position.array,normal=geometry.attributes.normal.array,uv=geometry.attributes.uv.array,indices=Uint32Array.from(geometry.index.array),attributes=new Float32Array(geometry.attributes.position.count*5),locks=new Uint8Array(geometry.attributes.position.count);
  const bounds=indexedBounds(pos,indices);
  for(let i=0;i<locks.length;i++){
    attributes.set([normal[i*3],normal[i*3+1],normal[i*3+2],uv[i*2],uv[i*2+1]],i*5);
    for(let axis=0;axis<3;axis++)if(pos[i*3+axis]===bounds.min[axis]||pos[i*3+axis]===bounds.max[axis])locks[i]=1;
    // Preserve a small original root contact ring. No vertical translation or
    // invented cap is needed when tiers change at the exact same attachment.
    if(pos[i*3+1]<.008)locks[i]=1;
  }
  assert.deepEqual(bounds,{min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()});
  const asset={kind,source:relative,sourceBytes:bytes.length,sourceSha256:digest(bytes),sourceTriangles:indices.length/3,sourceVertices:pos.length/3,normalization,bounds,sphere:{center:geometry.boundingSphere.center.toArray(),radius:geometry.boundingSphere.radius},lockedVertices:locks.reduce((a,b)=>a+b,0),tiers:[]};
  const geometries=[];
  for(const tier of tiers){
    const tierWeights=tier.name==='distant'?[farNormalWeight,farNormalWeight,farNormalWeight,.01,.01]:weights;
    const start=performance.now();const [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(indices,pos,3,attributes,5,tierWeights,locks,tier.triangles*3,tier.error,tier.name==='near'?report.nearFlags:report.flags);
    const data=compact(geometry,reduced),actualBounds=indexedBounds(data.attributes.position.array,data.indices);assert.deepEqual(actualBounds,bounds,'Original extrema must remain exact.');
    for(const{name,array}of Object.entries(data.attributes).map(([name,a])=>({name,array:a.array})))for(const value of array)assert.ok(Number.isFinite(value),`${kind} ${tier.name} ${name}`);
    const stored=await writeGeometry(kind,tier,data);asset.tiers.push({...tier,actualTriangles:reduced.length/3,vertices:data.attributes.position.array.length/3,error,elapsedMs:performance.now()-start,bounds:actualBounds,...stored});
    geometries.push({tier,data});
  }
  asset.glb=await writeLodGlb(asset,geometries);
  if(process.argv.includes('--install')){
    const destination=path.join(root,'assets/scenery/meshy-pilot',asset.glb.file);
    await fs.copyFile(path.join(output,asset.glb.file),destination,fsConstants.COPYFILE_EXCL);asset.installed=path.relative(root,destination).replaceAll('\\','/');
  }
  geometry.dispose();report.assets.push(asset);
}
report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const manifest={schema:1,format:'little-endian contiguous attribute blocks; Float32 POSITION/NORMAL/TEXCOORD_0 and Uint16 index',
  generator:'scripts/build-meshy-tree-lods.mjs',sourceToolSha256:report.sourceToolSha256,flags:report.flags,nearFlags:report.nearFlags,attributeWeights:report.attributeWeights,
  assets:report.assets.map(({kind,source,sourceSha256,bounds,sphere,normalization,tiers})=>({kind,source,sourceSha256,bounds,sphere,normalization,
    tiers:tiers.map(({name,triangles,actualTriangles,vertices,error,file,bytes,sha256,layout})=>({name,targetTriangles:triangles,triangles:actualTriangles,vertices,error,file,bytes,sha256,layout}))}))};
await fs.writeFile(path.join(output,'tree-lods.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output,assets:report.assets.map(a=>({kind:a.kind,sourceTriangles:a.sourceTriangles,lockedVertices:a.lockedVertices,glb:a.glb,installed:a.installed,tiers:a.tiers.map(t=>({name:t.name,triangles:t.actualTriangles,vertices:t.vertices,error:t.error,bytes:t.bytes}))}))},null,2));
