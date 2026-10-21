import * as T from '../../vendor/three.module.js';
import {triangleDistanceSq} from '../beast-integration-geometry.mjs';
export function surface(meshes,relative=new T.Matrix4()){
 const vertices=[],indices=[],faces=[],bounds=[],grid=new Map(),relativeInverse=relative.clone().invert();
 for(const entry of meshes){const object=entry.object??entry,matrix=entry.matrix??object.matrixWorld,transform=new T.Matrix4().multiplyMatrices(relativeInverse,matrix),base=vertices.length,p=object.geometry.attributes.position,index=object.geometry.index?.array??Array.from({length:p.count},(_,i)=>i);
  for(let i=0;i<p.count;i++)vertices.push(object.getVertexPosition(i,new T.Vector3()).applyMatrix4(transform));
  for(let i=0;i<index.length;i+=3){const ids=[base+index[i],base+index[i+1],base+index[i+2]],offset=indices.length;indices.push(...ids);faces.push({name:entry.name??object.name,sourceFace:i/3,...entry.meta});
   const points=ids.map(id=>vertices[id]),min=[0,1,2].map(k=>Math.min(...points.map(v=>v.getComponent(k)))),max=[0,1,2].map(k=>Math.max(...points.map(v=>v.getComponent(k))));bounds.push({min,max});
   for(let x=Math.floor(min[0]);x<=Math.floor(max[0]);x++)for(let y=Math.floor(min[1]);y<=Math.floor(max[1]);y++)for(let z=Math.floor(min[2]);z<=Math.floor(max[2]);z++){const key=x+','+y+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(offset);}
  }
 }
 return{vertices,indices,faces,bounds,grid};
}
export function meshes(group,meta={}){const list=[];group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)list.push({object:o,meta});});return list;}
export function contacts(one,two,margin=0,limit=8){
 const epsilon=margin||1e-7,limitSq=epsilon*epsilon;let comparisons=0,count=0,minSq=Infinity;const examples=[];
 for(let offset=0;offset<one.indices.length;offset+=3){const bounds=one.bounds[offset/3],near=new Set();
  for(let x=Math.floor(bounds.min[0]-epsilon);x<=Math.floor(bounds.max[0]+epsilon);x++)for(let y=Math.floor(bounds.min[1]-epsilon);y<=Math.floor(bounds.max[1]+epsilon);y++)for(let z=Math.floor(bounds.min[2]-epsilon);z<=Math.floor(bounds.max[2]+epsilon);z++)for(const id of two.grid.get(x+','+y+','+z)||[])near.add(id);
  const p=[0,1,2].map(i=>one.vertices[one.indices[offset+i]]);
  for(const other of near){const b=two.bounds[other/3];let separation=0;for(let k=0;k<3;k++)separation+=Math.max(0,b.min[k]-bounds.max[k],bounds.min[k]-b.max[k])**2;if(separation>limitSq)continue;
   const q=[0,1,2].map(i=>two.vertices[two.indices[other+i]]),sq=triangleDistanceSq(p,q);comparisons++;minSq=Math.min(minSq,sq);
   if(sq<=limitSq){count++;if(examples.length<limit)examples.push({first:one.faces[offset/3],second:two.faces[other/3],distance:Math.sqrt(sq),firstTriangle:p.map(v=>v.toArray()),secondTriangle:q.map(v=>v.toArray())});}
  }
 }
 return{margin,comparisons,count,minimumAmongNearCandidates:Number.isFinite(minSq)?Math.sqrt(minSq):null,examples};
}

// Weld only coincident rendered frame corners. This finds independent members
// without relying on the builder's triangle count or metadata ordering.
export function componentSeeds(actual){
 const parents=Array.from({length:actual.indices.length/3},(_,i)=>i),owners=new Map();
 const root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
 for(let face=0;face<parents.length;face++)for(let k=0;k<3;k++){
  const p=actual.vertices[actual.indices[face*3+k]],key=p.toArray().map(v=>v.toFixed(6)).join(',');
  if(owners.has(key))parents[root(face)]=root(owners.get(key));else owners.set(key,face);
 }
 const result=new Map();for(let face=0;face<parents.length;face++)result.set(root(face),actual.vertices[actual.indices[face*3]]);
 return [...result.values()];
}

function clipY(poly,value,sign){
 const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=sign*(a.y-value),db=sign*(b.y-value);if(da<=0)out.push(a);if((da<0)!==(db<0))out.push(a.clone().lerp(b,da/(da-db)));}return out;
}
function projectedRadius(poly,x,z){
 let best=Infinity,area=0,pos=true,neg=true;
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ax=a.x-x,az=a.z-z,bx=b.x-x,bz=b.z-z,dx=bx-ax,dz=bz-az,den=dx*dx+dz*dz,t=den?Math.max(0,Math.min(1,-(ax*dx+az*dz)/den)):0;best=Math.min(best,Math.hypot(ax+t*dx,az+t*dz));const cross=ax*bz-az*bx;area+=cross;pos&&=cross>=-1e-12;neg&&=cross<=1e-12;}
 return Math.abs(area)>1e-10&&(pos||neg)?0:best;
}
// The maximum vertex radius bounds every point of a triangle by convexity.
// Each occupied height slice therefore contains the complete continuous yaw
// sweep, including all intermediate headings, rather than sampled poses only.
export function cannonSweep(actual,sliceHeight=.05){
 const slices=new Map();
 for(let offset=0;offset<actual.indices.length;offset+=3){const p=[0,1,2].map(k=>actual.vertices[actual.indices[offset+k]]),low=Math.min(...p.map(v=>v.y)),high=Math.max(...p.map(v=>v.y)),radius=Math.max(...p.map(v=>Math.hypot(v.x,v.z)));for(let bin=Math.floor(low/sliceHeight);bin<=Math.floor(high/sliceHeight);bin++)slices.set(bin,Math.max(slices.get(bin)??0,radius));}
 return [...slices].map(([bin,radius])=>({low:bin*sliceHeight,high:(bin+1)*sliceHeight,radius}));
}
export function cannonSweepGap(actual,profile,mount){
 let minimum=Infinity,witness;
 for(let offset=0;offset<actual.indices.length;offset+=3){const p=[0,1,2].map(k=>actual.vertices[actual.indices[offset+k]]);
  for(const slice of profile){const low=mount.absoluteY+slice.low,high=mount.absoluteY+slice.high;if(p.every(v=>v.y<low)||p.every(v=>v.y>high))continue;const clipped=clipY(clipY(p,low,-1),high,1);if(!clipped.length)continue;const gap=projectedRadius(clipped,mount.x,mount.z)-slice.radius;if(gap<minimum){minimum=gap;witness={face:offset/3,slice,clipped:clipped.map(v=>v.toArray())};}}
 }
 return{minimum,witness};
}
