import {createHash} from 'node:crypto';
import * as T from '../../vendor/three.module.js';
import {createSaddleLayout,SADDLE_DECK_Y} from '../../src/saddle-layout.js';
import {batchStatic} from '../../src/materials.js';
import * as sim from '../../src/simulation.js';

export const districtTypes=Object.keys(sim.BUILDINGS).filter(type=>type!=='cannon');
const sha=value=>createHash('sha256').update(value).digest('hex');
const digest=value=>sha(JSON.stringify(value));
const attribute=value=>value?{type:value.array.constructor.name,itemSize:value.itemSize,count:value.count,sha256:sha(Buffer.from(value.array.buffer,value.array.byteOffset,value.array.byteLength))}:null;
export function snapshot(group){
 group.updateMatrixWorld(true);
 const geometry=[],uv=[],materials=[],triangles=[],textures=new Set(),uniqueMaterials=new Set(),uniqueGeometries=new Set();let vertices=0,indexCount=0;
 group.traverse(object=>{
  geometry.push({type:object.type,name:object.name,position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),userData:object.userData});
  if(!object.isMesh)return;
  const g=object.geometry,m=object.material,p=g.attributes.position,n=g.attributes.normal;
  geometry.push({position:attribute(p),normal:attribute(n),index:attribute(g.index),groups:g.groups});uv.push(attribute(g.attributes.uv));materials.push(m.name);
  uniqueMaterials.add(m);uniqueGeometries.add(g);vertices+=p.count;indexCount+=g.index?.count??p.count;
  for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  const local=g.index?g.toNonIndexed():g.clone();local.applyMatrix4(object.matrixWorld);
  const a=local.attributes;for(let i=0;i<a.position.count;i+=3){const triangle=[];for(let j=0;j<3;j++)for(const key of['position','normal'])for(let axis=0;axis<3;axis++)triangle.push(a[key].array[(i+j)*3+axis]);triangles.push(JSON.stringify(triangle));}local.dispose();
 });
 const box=new T.Box3().setFromObject(group);
 return {geometry:digest(geometry),uv:digest(uv),materials:digest(materials),triangles:digest(triangles.sort()),bounds:{min:box.min.toArray(),max:box.max.toArray()},meshes:materials.length,vertices,indexCount,materialCount:uniqueMaterials.size,textureCount:textures.size,geometryCount:uniqueGeometries.size,attributeBytes:[...uniqueGeometries].reduce((sum,g)=>sum+Object.values(g.attributes).reduce((s,a)=>s+a.array.byteLength,0)+(g.index?.array.byteLength??0),0)};
}
export function fixture(full){
 const state=sim.createGame('kaiju','flesh');
 if(full){state.resources={wood:9000,iron:9000,food:9000};sim.expandRing(state);for(let i=0;i<48;i++)sim.tick(state,.25);for(let slot=0;slot<20;slot++){if(!state.buildings[slot]){sim.build(state,slot%4===0?'farm':'housing',slot);for(let i=0;i<120&&state.buildings[slot].remaining>0;i++)sim.tick(state,.25);}if(slot%3===0)for(let level=state.buildings[slot].level;level<3;level++){sim.upgrade(state,slot);for(let i=0;i<40;i++)sim.tick(state,.25);}}}
 return state;
}
export function citySnapshot(createDistrict,state){
 const group=new T.Group(),layout=createSaddleLayout(state.buildings,state.towerOrder);
 for(const floor of layout.floors){const p=layout.positions[floor.slot],district=createDistrict(floor.type,floor.renderLevel,{zone:p.zone});district.position.set(p.x,SADDLE_DECK_Y+p.y+layout.districtOffset,p.z);district.rotation.y=p.rotation;group.add(district);}
 const before=snapshot(group);batchStatic(group);return {before,batched:snapshot(group),layoutHash:digest(layout),saveHash:sha(sim.serialize(state))};
}
export function observations(createDistrict){
 const cases={};for(const geometryOnly of[false,true])for(const enemy of[false,true])for(const type of districtTypes)for(const level of[1,2,3])cases[[geometryOnly?'collision':'rendered',enemy?'enemy':'player',type,level].join('/')]=snapshot(createDistrict(type,level,{geometryOnly,enemy}));
 return {cases,starter:citySnapshot(createDistrict,fixture(false)),full20:citySnapshot(createDistrict,fixture(true))};
}
