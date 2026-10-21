import * as T from '../vendor/three.module.js';
import {createSaddleFoundation,createSaddleDistrict} from './saddle-city.js';
import {disposeGroup} from './materials.js';
import {SADDLE_DECK_Y} from './saddle-layout.js';
import {FLESH_BODY_ENVELOPE} from './flesh-body-envelope.js';

const cache=new Map();
function bounds(items){return {min:[0,1,2].map(k=>Math.min(...items.map(v=>v.min[k]))),max:[0,1,2].map(k=>Math.max(...items.map(v=>v.max[k])))};}
function tree(items){
 const limits=bounds(items);if(items.length<=8)return {...limits,children:items};
 const axis=[0,1,2].sort((a,b)=>(limits.max[b]-limits.min[b])-(limits.max[a]-limits.min[a]))[0];
 items.sort((a,b)=>a.min[axis]+a.max[axis]-b.min[axis]-b.max[axis]);const middle=Math.floor(items.length/2);
 return {...limits,children:[tree(items.slice(0,middle)),tree(items.slice(middle))]};
}
const body=tree(FLESH_BODY_ENVELOPE.map(box=>({id:'flesh-body:canonical',min:box.slice(0,3),max:box.slice(3)})));

function geometrySolids(group,id){
 group.updateMatrixWorld(true);const solids=[],a=new T.Vector3();
 group.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const g=mesh.geometry,positions=g.attributes.position,index=g.index,triangles=[];
  for(let i=0;i<(index?.count??positions.count);i+=3){const tri=[];for(let j=0;j<3;j++){a.fromBufferAttribute(positions,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);tri.push(a.toArray());}triangles.push(tri);}
  if(!triangles.length)return;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const tri of triangles)for(const p of tri)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}
  solids.push({id,min,max,triangles,paddedTriangles:true});
 });
 disposeGroup(group);return solids;
}

// Barrel tubes have width. A padded broad phase alone would still let the
// edge of a cylinder clip a roof or railing when its centreline misses it.
export function saddleTrianglePaddingHit(a,b,points,pad){
 const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),length2=delta.lengthSq();
 const vertices=points.map(p=>new T.Vector3(...p)),triangle=new T.Triangle(...vertices),closest=new T.Vector3();
 let distance=Infinity,along=0;
 for(const[t,p]of [[0,start],[1,end]]){triangle.closestPointToPoint(p,closest);const d=p.distanceToSquared(closest);if(d<distance){distance=d;along=t;}}
 for(let i=0;i<3;i++){
  const p=vertices[i],edge=vertices[(i+1)%3].clone().sub(p),relative=start.clone().sub(p),edge2=edge.lengthSq(),dot=delta.dot(edge),c=delta.dot(relative),f=edge.dot(relative),denominator=length2*edge2-dot*dot;
  let s=denominator>1e-12?T.MathUtils.clamp((dot*f-c*edge2)/denominator,0,1):0,t=edge2>1e-12?(dot*s+f)/edge2:0;
  if(t<0){t=0;s=length2>1e-12?T.MathUtils.clamp(-c/length2,0,1):0;}else if(t>1){t=1;s=length2>1e-12?T.MathUtils.clamp((dot-c)/length2,0,1):0;}
  const d=relative.addScaledVector(delta,s).addScaledVector(edge,-t).lengthSq();if(d<distance){distance=d;along=s;}
 }
 return distance<=pad*pad?along:null;
}

// Same primitive dimensions, transforms, roofs, rails and pannier framing as
// the rendered city. Geometry is created once per bounded layout cache entry,
// without textures/DOM, then only compact triangles and their BVH are retained.
export function saddleCitySolids(layout){
 const key=layout.signature;if(cache.has(key))return cache.get(key);
 const solids=geometrySolids(createSaddleFoundation(SADDLE_DECK_Y,false,layout,{geometryOnly:true}),'saddle:foundation');
 for(const floor of layout.floors){
  // Preserve the existing rule that unfinished districts grant no occlusion.
  if(floor.type==='cannon'||floor.underConstruction)continue;
  const p=layout.positions[floor.slot],group=createSaddleDistrict(floor.type,floor.renderLevel??floor.level,{zone:p.zone,geometryOnly:true});
  group.position.set(p.x,SADDLE_DECK_Y+p.y+layout.districtOffset,p.z);group.rotation.y=p.rotation;
  solids.push(...geometrySolids(group,'saddle:district:'+floor.slot));
 }
 const result=[body,...(solids.length?[tree(solids)]:[])];
 if(cache.size>=12)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
}
