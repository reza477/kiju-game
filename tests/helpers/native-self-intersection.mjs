import * as T from '../../vendor/three.module.js';

// True overlap/crossing only. A shared topological edge or vertex is allowed;
// adjacency never exempts overlap elsewhere on either actual triangle.
export function improperTriangleIntersection(a,b,shared=[],epsilon=1e-7){
 const ta=new T.Triangle(...a),tb=new T.Triangle(...b),na=ta.getNormal(new T.Vector3()),nb=tb.getNormal(new T.Vector3());
 if(na.lengthSq()===0||nb.lengthSq()===0)throw Error('Degenerate posed native triangle');
 const allowed=point=>shared.length===1?point.distanceTo(shared[0])<=epsilon:shared.length===2?new T.Line3(...shared).closestPointToPoint(point,true,new T.Vector3()).distanceTo(point)<=epsilon:false;
 const parallel=new T.Vector3().crossVectors(na,nb).length()<1e-10;
 if(parallel){
  if(a.some(point=>Math.abs(nb.dot(point.clone().sub(b[0])))>epsilon))return false;
  const axis=na.toArray().map(Math.abs).indexOf(Math.max(...na.toArray().map(Math.abs))),keep=[0,1,2].filter(i=>i!==axis),project=p=>keep.map(i=>p.getComponent(i)),q=b.map(project);
  const cross=(p,r,s)=>(r[0]-p[0])*(s[1]-p[1])-(r[1]-p[1])*(s[0]-p[0]),sign=Math.sign(cross(...q));let polygon=a.map(project);
  for(let edge=0;edge<3;edge++){
   const start=q[edge],end=q[(edge+1)%3],next=[];
   for(let i=0;i<polygon.length;i++){const p=polygon[i],r=polygon[(i+1)%polygon.length],dp=sign*cross(start,end,p),dr=sign*cross(start,end,r);if(dp>=0)next.push(p);if((dp>0)!==(dr>0)){const t=dp/(dp-dr);next.push([p[0]+(r[0]-p[0])*t,p[1]+(r[1]-p[1])*t]);}}
   polygon=next;if(polygon.length<3)return false;
  }
  let twiceArea=0;for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length];twiceArea+=p[0]*q[1]-p[1]*q[0];}
  return Math.abs(twiceArea)>2*epsilon*epsilon;
 }
 const hits=[];
 function collect(one,two,triangle,normal){
  for(let edge=0;edge<3;edge++){
   const p=one[edge],q=one[(edge+1)%3],dp=normal.dot(p.clone().sub(two[0])),dq=normal.dot(q.clone().sub(two[0]));
   if((dp>epsilon&&dq>epsilon)||(dp< -epsilon&&dq< -epsilon))continue;
   if(Math.abs(dp-dq)>epsilon){
    const t=dp/(dp-dq);if(t<0||t>1)continue;const point=p.clone().lerp(q,t),closest=triangle.closestPointToPoint(point,new T.Vector3());if(point.distanceTo(closest)<=epsilon)hits.push(point);
   }else if(Math.abs(dp)<=epsilon&&Math.abs(dq)<=epsilon){
    const bp=triangle.getBarycoord(p,new T.Vector3()),bq=triangle.getBarycoord(q,new T.Vector3());let low=0,high=1;
    for(let lane=0;lane<3;lane++){const start=bp.getComponent(lane),delta=bq.getComponent(lane)-start;if(Math.abs(delta)<1e-14){if(start<0){high=-1;break;}}else{const at=-start/delta;if(delta>0)low=Math.max(low,at);else high=Math.min(high,at);}}
    if(low<=high){hits.push(p.clone().lerp(q,low),p.clone().lerp(q,high));}
   }
  }
 }
 collect(a,b,tb,nb);collect(b,a,ta,na);
 for(let i=0;i<hits.length;i++)for(let j=i+1;j<hits.length;j++)if(hits[i].distanceTo(hits[j])>epsilon&&(!allowed(hits[i])||!allowed(hits[j])))return true;
 return false;
}

export function nativeSelfIntersections(surface,topology,{faces=null,epsilon=1e-7,exampleLimit=12}={}){
 const canonical=new Map(topology.used.map(id=>[id,id]));for(const group of topology.seams)for(const id of group)canonical.set(id,group[0]);
 const selected=faces?new Set(faces):null,offsets=selected?[...selected].map(face=>face*3):Array.from({length:surface.indices.length/3},(_,i)=>i*3),examples=[];let comparisons=0,count=0;
 for(const offset of offsets){
  const bounds=surface.bounds[offset/3],near=new Set();
  for(let x=Math.floor(bounds.min[0]-epsilon);x<=Math.floor(bounds.max[0]+epsilon);x++)for(let y=Math.floor(bounds.min[1]-epsilon);y<=Math.floor(bounds.max[1]+epsilon);y++)for(let z=Math.floor(bounds.min[2]-epsilon);z<=Math.floor(bounds.max[2]+epsilon);z++)for(const other of surface.grid.get(x+','+y+','+z)||[])near.add(other);
  const ids=[0,1,2].map(k=>surface.indices[offset+k]),a=ids.map(id=>surface.vertices[id]);
  for(const other of near){
   if(other===offset||other<offset&&(!selected||selected.has(other/3)))continue;
   const target=surface.bounds[other/3];if(bounds.min.some((v,k)=>v>target.max[k]+epsilon)||target.min.some((v,k)=>v>bounds.max[k]+epsilon))continue;
   const otherIds=[0,1,2].map(k=>surface.indices[other+k]),b=otherIds.map(id=>surface.vertices[id]),shared=ids.filter(id=>otherIds.some(other=>canonical.get(id)===canonical.get(other))).map(id=>surface.vertices[id]);comparisons++;
   if(improperTriangleIntersection(a,b,shared,epsilon)){count++;if(examples.length<exampleLimit)examples.push({firstFace:offset/3,secondFace:other/3,sharedVertices:shared.length,first:a.map(p=>p.toArray()),second:b.map(p=>p.toArray())});}
  }
 }
 return{checkedSourceFaces:offsets.length,comparisons,intersections:count,examples,epsilonRigUnits:epsilon};
}
