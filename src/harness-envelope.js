const requireGeometry=(condition,message='Invalid harness contour')=>{if(!condition)throw new Error(message);};
const requireEqual=(actual,expected,message='Unexpected harness contour topology')=>requireGeometry(actual===expected,message);
import * as T from '../vendor/three.module.js';

const weldTolerance=1e-5, planeTolerance=1e-10;
function welder(){
 const nodes=[],grid=new Map(),cell=p=>[Math.floor(p.x/weldTolerance),Math.floor(p.y/weldTolerance),Math.floor(p.z/weldTolerance)];let maxMergedDistance=0;
 function add(anchor){const p=anchor.point,[x,y,z]=cell(p);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)for(const id of grid.get(`${x+dx},${y+dy},${z+dz}`)??[]){const distance=nodes[id].point.distanceTo(p);if(distance<=weldTolerance){maxMergedDistance=Math.max(maxMergedDistance,distance);return id;}}
  const id=nodes.length,key=`${x},${y},${z}`;nodes.push(anchor);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(id);return id;
 }
 return{nodes,add,get maxMergedDistance(){return maxMergedDistance;}};
}
const blend=(a,b,t)=>({point:a.point.clone().lerp(b.point,t),face:a.face,indices:a.indices,barycentric:a.barycentric.map((w,i)=>w+(b.barycentric[i]-w)*t)});
function area(points,u,v){let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a.dot(u)*b.dot(v)-b.dot(u)*a.dot(v);}return sum*.5;}
function containsOrigin(points,origin,u,v){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i].clone().sub(origin),b=points[j].clone().sub(origin),ax=a.dot(u),ay=a.dot(v),bx=b.dot(u),by=b.dot(v);if((ay>0)!==(by>0)&&0<(bx-ax)*(-ay)/(by-ay)+ax)inside=!inside;}return inside;}

export function traceContour(skin,{origin,u,v,w},width){
 const weld=welder(),segments=[],edges=new Set(),adjacent=new Map(),indices=skin.indices,points=skin.vertices;
 let tangencies=0,coplanar=0;
 for(let face=0;face<indices.length/3;face++){
  const ids=[indices[face*3],indices[face*3+1],indices[face*3+2]],vertices=ids.map((id,k)=>({point:points[id],face,indices:ids,barycentric:[Number(k===0),Number(k===1),Number(k===2)]})),d=vertices.map(a=>a.point.clone().sub(origin).dot(w)-width);
  if(Math.min(...d)>planeTolerance||Math.max(...d)<-planeTolerance)continue;
  if(d.every(value=>Math.abs(value)<=planeTolerance)){coplanar++;continue;}
  const hits=[];for(let k=0;k<3;k++){const next=(k+1)%3;if(Math.abs(d[k])<=planeTolerance)hits.push(vertices[k]);if(d[k]*d[next]<0)hits.push(blend(vertices[k],vertices[next],d[k]/(d[k]-d[next])));}
  const unique=[];for(const anchor of hits)if(!unique.some(other=>other.point.distanceToSquared(anchor.point)<1e-18))unique.push(anchor);
  if(unique.length<2){tangencies++;continue;}requireEqual(unique.length,2,'Triangle has ambiguous plane intersection');
  const a=weld.add(unique[0]),b=weld.add(unique[1]);if(a===b){tangencies++;continue;}const key=a<b?`${a},${b}`:`${b},${a}`;if(edges.has(key))continue;edges.add(key);segments.push({a,b,face});
  if(!adjacent.has(a))adjacent.set(a,new Set());if(!adjacent.has(b))adjacent.set(b,new Set());adjacent.get(a).add(b);adjacent.get(b).add(a);
 }
 requireEqual(coplanar,0,'Coplanar surface needs an explicit contour policy');
 const seen=new Set(),loops=[],invalidComponents=[];
 for(const start of adjacent.keys()){
  if(seen.has(start))continue;const component=[],pending=[start];while(pending.length){const id=pending.pop();if(seen.has(id))continue;seen.add(id);component.push(id);pending.push(...adjacent.get(id));}
  const bad=component.filter(id=>adjacent.get(id).size!==2);if(bad.length){invalidComponents.push({nodes:component.length,degrees:bad.map(id=>({id,degree:adjacent.get(id).size,point:weld.nodes[id].point.toArray()}))});continue;}
  const ordered=[start];let previous=-1,current=start;
  do{const next=[...adjacent.get(current)].find(id=>id!==previous);previous=current;current=next;if(current!==start)ordered.push(current);requireGeometry(ordered.length<=component.length,'Contour repeats before closing');}while(current!==start);
  requireEqual(ordered.length,component.length);let anchors=ordered.map(id=>weld.nodes[id]);const signedArea=area(anchors.map(a=>a.point),u,v);if(signedArea<0)anchors=anchors.reverse();
  loops.push({anchors,area:Math.abs(signedArea),containsOrigin:containsOrigin(anchors.map(a=>a.point),origin,u,v)});
 }
 const containing=loops.filter(loop=>loop.containsOrigin);requireEqual(containing.length,1,`Expected one closed origin-containing contour, found${containing.length}; invalidComponents=${invalidComponents.length}`);
 return{anchors:containing[0].anchors,metadata:{width,nodes:weld.nodes.length,segments:segments.length,loops:loops.map(loop=>({anchors:loop.anchors.length,area:loop.area,containsOrigin:loop.containsOrigin})),invalidComponents,tangencies,weldTolerance,maxMergedDistance:weld.maxMergedDistance}};
}

// Gather every exact clipped-skin polygon in the connected strip bounded by
// the two outer contours. This includes unsampled vertices between tracks.
export function connectedStrip(skin,plane,contours,{halfWidth=.24}={}){
 requireGeometry(Number.isFinite(halfWidth)&&halfWidth>=.24);
 const {origin,w}=plane,weld=welder(),polygons=[],parents=[],nodeOwner=new Map(),faceToPolygon=new Map();
 const find=i=>parents[i]===i?i:(parents[i]=find(parents[i]));
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parents[b]=a;};
 function clip(polygon,width,sign){const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=sign*(a.point.clone().sub(origin).dot(w)-width),db=sign*(b.point.clone().sub(origin).dot(w)-width);if(da<=0)out.push(a);if((da<0)!==(db<0))out.push(blend(a,b,da/(da-db)));}return out;}
 for(let face=0;face<skin.indices.length/3;face++){
  const ids=[skin.indices[face*3],skin.indices[face*3+1],skin.indices[face*3+2]],d=ids.map(id=>skin.vertices[id].clone().sub(origin).dot(w));if(Math.min(...d)>halfWidth||Math.max(...d)<-halfWidth)continue;
  let polygon=ids.map((id,k)=>({point:skin.vertices[id],face,indices:ids,barycentric:[Number(k===0),Number(k===1),Number(k===2)]}));polygon=clip(clip(polygon,halfWidth,1),-halfWidth,-1);if(polygon.length<3)continue;
  let totalArea=0;for(let i=1;i<polygon.length-1;i++)totalArea+=new T.Triangle(polygon[0].point,polygon[i].point,polygon[i+1].point).getArea();if(totalArea<1e-12)continue;
  const id=polygons.length,nodes=polygon.map(a=>weld.add(a));parents.push(id);polygons.push({face,nodes});faceToPolygon.set(face,id);for(const node of nodes){if(nodeOwner.has(node))join(id,nodeOwner.get(node));else nodeOwner.set(node,id);}
 }
 const selected=new Set();for(const contour of contours)for(const anchor of contour.anchors){const polygon=faceToPolygon.get(anchor.face);if(polygon!==undefined)selected.add(find(polygon));}
 requireEqual(selected.size,1,'Three selected contour tracks do not belong to one connected skin strip');const selectedRoot=[...selected][0],selectedPolygons=polygons.filter((_,i)=>find(i)===selectedRoot),ids=[...new Set(selectedPolygons.flatMap(p=>p.nodes))];requireGeometry(ids.length>=3);
 return{anchors:ids.map(id=>weld.nodes[id]),metadata:{halfWidth,polygons:polygons.length,components:new Set(polygons.map((_,i)=>find(i))).size,selectedPolygons:selectedPolygons.length,selectedAnchors:ids.length,weldTolerance,maxMergedDistance:weld.maxMergedDistance}};
}

// Each polygon edge is a support line of the complete skin strip. Its corners
// are line intersections, so joining them cannot cut an unsampled hull corner.
// Reuse the same supports for both physical layers of the leather.
export function createSupportingRing(count){
 requireGeometry(Number.isSafeInteger(count)&&count>=3,'A support ring needs at least three sections');
 const nx=new Float64Array(count),ny=new Float64Array(count),support=new Float64Array(count),determinant=new Float64Array(count),normals=[];
 for(let i=0;i<count;i++){const angle=(i-.5)/count*Math.PI*2;nx[i]=Math.cos(angle);ny[i]=Math.sin(angle);}
 for(let i=0;i<count;i++){const next=(i+1)%count;determinant[i]=nx[i]*ny[next]-ny[i]*nx[next];requireGeometry(determinant[i]>0);normals.push(new T.Vector3(nx[i]+nx[next],ny[i]+ny[next],0).normalize());}
 let ready=false;
 return{
  fit(points){
   requireGeometry(points.length>=3,'A support ring needs a complete skin outline');
   for(const p of points)requireGeometry(Number.isFinite(p.x)&&Number.isFinite(p.y),'Non-finite support point');
   for(let i=0;i<count;i++){let extent=-Infinity;for(const p of points)extent=Math.max(extent,p.x*nx[i]+p.y*ny[i]);support[i]=extent;}
   ready=true;
  },
  write(padding,outputPoints,outputNormals){
   requireGeometry(ready&&Number.isFinite(padding)&&padding>0,'Invalid support-ring padding or unfitted outline');
   requireGeometry(outputPoints.length===count&&outputNormals.length===count,'Support-ring output count changed');
   for(let i=0;i<count;i++){
    const next=(i+1)%count,a=support[i]+padding,b=support[next]+padding;
    const x=(a*ny[next]-ny[i]*b)/determinant[i],y=(nx[i]*b-a*nx[next])/determinant[i];
    requireGeometry(Number.isFinite(x)&&Number.isFinite(y),'Non-finite support intersection');
    for(let line=0;line<count;line++)requireGeometry(x*nx[line]+y*ny[line]<=support[line]+padding+1e-7,'Support intersection violates another support half-plane');
    outputPoints[i].set(x,y,0);outputNormals[i].copy(normals[i]);
   }
  }
 };
}

// Only transverse depth is interpolated on each full contour. All width tracks
// share the support polygon's XY coordinates. The lookup origin follows the
// posed hull, remaining inside it during a strike or a large torso bend.
export function createContourDepth(){
 const sorted=[],unique=[],hull=[];let centerX=0,centerY=0;
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 return{
  update(points){
   sorted.length=0;unique.length=0;hull.length=0;
   for(const p of points){requireGeometry(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z),'Non-finite contour point');sorted.push(p);}
   sorted.sort((a,b)=>a.x-b.x||a.y-b.y);
   for(const p of sorted)if(!unique.length||p.x!==unique.at(-1).x||p.y!==unique.at(-1).y)unique.push(p);
   for(const p of unique){while(hull.length>=2&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p);}
   const lower=hull.length;
   for(let i=unique.length-2;i>=0;i--){const p=unique[i];while(hull.length>lower&&cross(hull.at(-2),hull.at(-1),p)<=0)hull.pop();hull.push(p);}
   hull.pop();requireGeometry(hull.length>=3,'The posed contour has no enclosed area');
   centerX=hull.reduce((sum,p)=>sum+p.x,0)/hull.length;centerY=hull.reduce((sum,p)=>sum+p.y,0)/hull.length;
  },
  sample(point){
   const dx=point.x-centerX,dy=point.y-centerY;let radius=Infinity,result;
   for(let i=0;i<hull.length;i++){
    const a=hull[i],b=hull[(i+1)%hull.length],ax=a.x-centerX,ay=a.y-centerY,ex=b.x-a.x,ey=b.y-a.y,den=dx*ey-dy*ex;
    if(Math.abs(den)<1e-12)continue;
    const r=(ax*ey-ay*ex)/den,t=(ax*dy-ay*dx)/den;
    if(r>0&&t>=-1e-8&&t<=1+1e-8&&r<radius){radius=r;result=a.z+(b.z-a.z)*t;}
   }
   requireGeometry(Number.isFinite(result),'No positive boundary point on contour depth ray');return result;
  }
 };
}

