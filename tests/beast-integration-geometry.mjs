import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';

const d1=new T.Vector3(),d2=new T.Vector3(),delta=new T.Vector3(),closestA=new T.Vector3(),closestB=new T.Vector3();
function edgeDistanceSq(p,q,r,s){
 d1.subVectors(q,p);d2.subVectors(s,r);delta.subVectors(p,r);
 const aa=d1.dot(d1),ee=d2.dot(d2),ff=d2.dot(delta),bb=d1.dot(d2),cc=d1.dot(delta),den=aa*ee-bb*bb;
 let u=0,v=0;
 if(aa<=1e-16&&ee<=1e-16)return p.distanceToSquared(r);
 if(aa<=1e-16)v=T.MathUtils.clamp(ff/ee,0,1);
 else if(ee<=1e-16)u=T.MathUtils.clamp(-cc/aa,0,1);
 else{u=den>1e-16?T.MathUtils.clamp((bb*ff-cc*ee)/den,0,1):0;v=(bb*u+ff)/ee;if(v<0){v=0;u=T.MathUtils.clamp(-cc/aa,0,1);}else if(v>1){v=1;u=T.MathUtils.clamp((bb-cc)/aa,0,1);}}
 closestA.copy(p).addScaledVector(d1,u);closestB.copy(r).addScaledVector(d2,v);return closestA.distanceToSquared(closestB);
}
const direction=new T.Vector3(),temp=new T.Vector3(),ray=new T.Ray(),triA=new T.Triangle(),triB=new T.Triangle();
export function triangleDistanceSq(a,b){
 let minimum=Infinity;
 for(const [one,two]of [[a,b],[b,a]])for(let i=0;i<3;i++){
  direction.subVectors(one[(i+1)%3],one[i]);const length=direction.length();if(length<=1e-12)continue;ray.set(one[i],direction.divideScalar(length));
  if(ray.intersectTriangle(...two,false,temp)&&temp.distanceToSquared(one[i])<=length*length+1e-10)return 0;
 }
 triA.set(...a);triB.set(...b);
 for(let i=0;i<3;i++){
  minimum=Math.min(minimum,triB.closestPointToPoint(a[i],temp).distanceToSquared(a[i]),triA.closestPointToPoint(b[i],temp).distanceToSquared(b[i]));
  for(let j=0;j<3;j++)minimum=Math.min(minimum,edgeDistanceSq(a[i],a[(i+1)%3],b[j],b[(j+1)%3]));
 }
 return minimum;
}
export function posedVisibleSurface(mesh,rig){
 const inverse=rig.matrixWorld.clone().invert(),point=new T.Vector3(),vertices=Array(mesh.geometry.attributes.position.count),indices=mesh.geometry.index.array,grid=new Map(),bounds=[];
 for(const id of new Set(indices)){mesh.getVertexPosition(id,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);vertices[id]=point.clone();}
 for(let i=0;i<indices.length;i+=3){
  const p=[vertices[indices[i]],vertices[indices[i+1]],vertices[indices[i+2]]],min=[0,1,2].map(k=>Math.min(...p.map(v=>v.getComponent(k)))),max=[0,1,2].map(k=>Math.max(...p.map(v=>v.getComponent(k))));bounds[i/3]={min,max};
  for(let x=Math.floor(min[0]);x<=Math.floor(max[0]);x++)for(let y=Math.floor(min[1]);y<=Math.floor(max[1]);y++)for(let z=Math.floor(min[2]);z<=Math.floor(max[2]);z++){const key=x+','+y+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);}
 }
 return{vertices,indices,grid,bounds};
}
export function closedGirdleTopology(geometry){
 const index=geometry.index.array,edges=new Map(),neighbors=new Map(),used=new Set();
 for(let i=0;i<index.length;i+=3)for(let k=0;k<3;k++){
  const a=index[i+k],b=index[i+(k+1)%3];assert.notEqual(a,b,'Nondegenerate topological edge');used.add(a);used.add(b);
  const key=a<b?a+','+b:b+','+a,value=edges.get(key)??{count:0,orientation:0};value.count++;value.orientation+=a<b?1:-1;edges.set(key,value);
  if(!neighbors.has(a))neighbors.set(a,new Set());neighbors.get(a).add(b);if(!neighbors.has(b))neighbors.set(b,new Set());neighbors.get(b).add(a);
 }
 assert.ok([...edges.values()].every(edge=>edge.count===2&&edge.orientation===0),'Each band edge has two oppositely oriented incident faces, including the seam');
 const visited=new Set(),pending=[used.values().next().value];while(pending.length){const id=pending.pop();if(visited.has(id))continue;visited.add(id);pending.push(...neighbors.get(id));}
 assert.equal(visited.size,used.size,'Band is a single connected surface');assert.equal(used.size-edges.size+index.length/3,0,'Closed ribbon has torus topology');
 return{vertices:used.size,edges:edges.size,faces:index.length/3};
}
export function assertSurfaceClearance(object,rig,skin,frame,margin=.04){
 const inverse=rig.matrixWorld.clone().invert(),position=object.geometry.attributes.position,indices=object.geometry.index.array,vertices=[];let comparisons=0;
 for(let i=0;i<position.count;i++){const point=new T.Vector3();object.getVertexPosition(i,point).applyMatrix4(object.matrixWorld).applyMatrix4(inverse);assert.ok(point.toArray().every(Number.isFinite));vertices.push(point);}
 for(let i=0;i<indices.length;i+=3){
  const p=[vertices[indices[i]],vertices[indices[i+1]],vertices[indices[i+2]]],min=[0,1,2].map(k=>Math.min(...p.map(v=>v.getComponent(k)))),max=[0,1,2].map(k=>Math.max(...p.map(v=>v.getComponent(k)))),near=new Set();
  for(let x=Math.floor(min[0]-margin);x<=Math.floor(max[0]+margin);x++)for(let y=Math.floor(min[1]-margin);y<=Math.floor(max[1]+margin);y++)for(let z=Math.floor(min[2]-margin);z<=Math.floor(max[2]+margin);z++)for(const id of skin.grid.get(x+','+y+','+z)||[])near.add(id);
  for(const offset of near){
   const bounds=skin.bounds[offset/3];let separation=0;for(let k=0;k<3;k++)separation+=Math.max(0,bounds.min[k]-max[k],min[k]-bounds.max[k])**2;if(separation>=margin*margin)continue;
   const q=[skin.vertices[skin.indices[offset]],skin.vertices[skin.indices[offset+1]],skin.vertices[skin.indices[offset+2]]];comparisons++;
   assert.ok(triangleDistanceSq(p,q)>=margin*margin,`${object.name} face ${i/3} violates ${margin} rig-unit skin clearance against face ${offset/3} at ${frame}; band ${JSON.stringify(p.map(v=>v.toArray()))}; skin ${JSON.stringify(q.map(v=>v.toArray()))}`);
  }
 }
 // No crossing plus an outside seed rejects a wholly buried closed component.
 const seed=vertices[0].clone().add(new T.Vector3(0,1.234e-5,7.891e-6)),hits=[];ray.set(seed,new T.Vector3(1,0,0));
 for(let i=0;i<skin.indices.length;i+=3){const bounds=skin.bounds[i/3];if(seed.y<bounds.min[1]||seed.y>bounds.max[1]||seed.z<bounds.min[2]||seed.z>bounds.max[2]||seed.x>bounds.max[0])continue;const q=[skin.vertices[skin.indices[i]],skin.vertices[skin.indices[i+1]],skin.vertices[skin.indices[i+2]]];if(ray.intersectTriangle(...q,false,temp))hits.push(temp.x);}
 hits.sort((a,b)=>a-b);assert.equal(hits.filter((x,i)=>i===0||Math.abs(x-hits[i-1])>1e-6).length%2,0,object.name+' is entirely inside visible skin at '+frame);
 return{vertices,indices,comparisons};
}
export function triangleBoxIntersection(triangle,deck,half,low,high){
 const co=Math.cos(deck.rotation??0),si=Math.sin(deck.rotation??0);let polygon=triangle.map(p=>[co*(p.x-deck.x)-si*(p.z-deck.z),p.y-deck.absoluteY,si*(p.x-deck.x)+co*(p.z-deck.z)]);
 for(const [axis,value,sign]of [[0,half[0],1],[0,-half[0],-1],[2,half[1],1],[2,-half[1],-1],[1,high,1],[1,low,-1]]){
  const output=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],da=sign*(a[axis]-value),db=sign*(b[axis]-value);if(da<=0)output.push(a);if((da<0)!==(db<0)){const t=da/(da-db);output.push(a.map((v,k)=>v+(b[k]-v)*t));}}polygon=output;if(polygon.length<3)return false;
 }
 const a=new T.Vector3(...polygon[0]),b=new T.Vector3(),c=new T.Vector3();let area=0;for(let i=1;i<polygon.length-1;i++)area+=b.set(...polygon[i]).sub(a).cross(c.set(...polygon[i+1]).sub(a)).length();return area>1e-8;
}

// For separate closed components only. Intentional contacts between pieces of
// the same buckle are excluded by the caller. This detects intersection and
// containment, without imposing the unrelated0.04 body-clearance requirement.
export function assertClosedSurfacesDisjoint(one,two,label){
 const epsilon=1e-7,boundsA=new T.Box3().setFromPoints(one.vertices.filter(Boolean)),boundsB=new T.Box3().setFromPoints(two.vertices.filter(Boolean));
 let comparisons=0,containmentChecks=0;
 if(!boundsA.clone().expandByScalar(epsilon).intersectsBox(boundsB))return{comparisons,containmentChecks};
 for(let offset=0;offset<one.indices.length;offset+=3){
  const p=[one.vertices[one.indices[offset]],one.vertices[one.indices[offset+1]],one.vertices[one.indices[offset+2]]],bounds=one.bounds[offset/3],near=new Set();
  for(let x=Math.floor(bounds.min[0]-epsilon);x<=Math.floor(bounds.max[0]+epsilon);x++)for(let y=Math.floor(bounds.min[1]-epsilon);y<=Math.floor(bounds.max[1]+epsilon);y++)for(let z=Math.floor(bounds.min[2]-epsilon);z<=Math.floor(bounds.max[2]+epsilon);z++)for(const id of two.grid.get(x+','+y+','+z)||[])near.add(id);
  for(const other of near){
   const target=two.bounds[other/3];let separation=0;for(let k=0;k<3;k++)separation+=Math.max(0,target.min[k]-bounds.max[k],bounds.min[k]-target.max[k])**2;
   if(separation>epsilon*epsilon)continue;
   const q=[two.vertices[two.indices[other]],two.vertices[two.indices[other+1]],two.vertices[two.indices[other+2]]];comparisons++;
   assert.ok(triangleDistanceSq(p,q)>epsilon*epsilon,`${label} has touching/intersecting faces ${offset/3}/${other/3}; first ${JSON.stringify(p.map(v=>v.toArray()))}; second ${JSON.stringify(q.map(v=>v.toArray()))}`);
  }
 }
 // With intersections excluded, a seed from either connected component also
 // detects full containment. Three non-axis rays avoid a single grazing edge
 // deciding parity; coincident triangle hits are counted once per surface.
 function contained(seed,surface){
  let inside=0;const hit=new T.Vector3(),probe=new T.Ray();
  for(const value of[[1,.173,.367],[-.271,1,.193],[.337,-.219,1]]){
   probe.set(seed,new T.Vector3(...value).normalize());const distances=[];
   for(let offset=0;offset<surface.indices.length;offset+=3){
    const triangle=[surface.vertices[surface.indices[offset]],surface.vertices[surface.indices[offset+1]],surface.vertices[surface.indices[offset+2]]];
    if(probe.intersectTriangle(...triangle,false,hit))distances.push(seed.distanceTo(hit));
   }
   distances.sort((a,b)=>a-b);if(distances.filter((distance,i)=>i===0||distance-distances[i-1]>epsilon).length%2)inside++;
  }
  return inside>=2;
 }
 containmentChecks++;assert.equal(contained(one.vertices[one.indices[0]],two),false,label+' first closed component is contained in the second');
 containmentChecks++;assert.equal(contained(two.vertices[two.indices[0]],one),false,label+' second closed component is contained in the first');
 return{comparisons,containmentChecks};
}
