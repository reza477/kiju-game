import {KAIJU_DECK_Y,KAIJU_FLOOR_SPACING,kaijuSlotPosition,kaijuFloorCount,kaijuTowerTop} from './city-layout.js';

export const CANNON_MOUNT=Object.freeze({districtY:.18,turretY:.64,scaleX:1.08,scaleY:1.18,scaleZ:1.15,barrelY:.55,muzzleZ:2.13,doubleX:.34,barrelRadius:.34});
const cache=new Map(),norm=a=>Math.atan2(Math.sin(a),Math.cos(a));

/** Shared major geometry: renderer and physics use identical port-bearing masses. */
export function castleMassing(rings=2,deckY=KAIJU_DECK_Y){
 const stage=Math.max(0,Math.min(2,Math.floor(rings))),count=kaijuFloorCount(stage),highest=deckY+(count-1)*KAIJU_FLOOR_SPACING,totalTop=kaijuTowerTop(stage)+deckY-KAIJU_DECK_Y,mainCrown=totalTop-10.8;
 const leftCrown=highest+(count>2?-4.3:3.2),rearCrown=highest+2.4,leftWingTop=highest+(count>2?-1.5:5),rightWingTop=highest+2.5,rearTop=Math.max(highest+3,mainCrown-4);
 const walls=[
  {id:'main-keep',x:.8,z:-17.94,w:6.30,d:1.12,bottom:deckY-4.1,top:mainCrown,seed:2,front:true,gunLane:3.1},
  {id:'gate-tower',x:-4.7,z:-18.04,w:1.98,d:1.7,bottom:deckY-6.7,top:leftCrown,seed:4,front:true},
  {id:'left-wing',x:-5.86,z:-11.98,w:.65,d:8.3,bottom:deckY-.3,top:leftWingTop,seed:7,front:false},
  {id:'right-wing',x:5.82,z:-9.48,w:.65,d:6.3,bottom:deckY-2.5,top:rightWingTop,seed:3,front:false},
  {id:'rear-spine',x:0,z:-6.1,w:3.5,d:1.15,bottom:deckY-2.5,top:rearTop,seed:1,front:false}
 ];
 const roofs=[{x:.8,y:mainCrown,z:-17.94,w:6.48,d:2.13,h:9.28},{x:-4.7,y:leftCrown,z:-18.04,w:2.32,d:2.13,h:6.5},{x:-5.86,y:leftWingTop,z:-11.98,w:.96,d:8.45,h:4},{x:5.82,y:rightWingTop,z:-9.48,w:.94,d:6.46,h:3.1},{x:0,y:rearTop,z:-6.1,w:3.7,d:1.85,h:5}];
 const shafts=[{x:5.45,z:-17.98,r:.69,bottom:Math.max(deckY-6.2,highest-11.6),top:highest+5.3,h:5.8},{x:-5.65,z:-6.35,r:.53,bottom:deckY-6.2,top:rearCrown,h:4.3}];
 return {stage,count,highest,totalTop,mainCrown,leftCrown,rearCrown,leftWingTop,rightWingTop,rearTop,walls,roofs,shafts};
}

export function castleWallBoxes(wall,tier,count,deckY=KAIJU_DECK_Y){
 const {x,z,w,d,bottom,top,gunLane}=wall,lo=Math.max(bottom,tier?deckY+tier*KAIJU_FLOOR_SPACING:bottom),hi=Math.min(top,tier===count-1?top:deckY+(tier+1)*KAIJU_FLOOR_SPACING),boxes=[];
 const add=(x,y,z,w,h,d,trim=false)=>{if(w>0&&h>0&&d>0)boxes.push({x,y,z,w,h,d,trim});};if(hi<=lo)return boxes;
 if(gunLane===undefined||gunLane===null)add(x,(lo+hi)/2,z,w,hi-lo,d);
 else{
  const floorY=deckY+tier*KAIJU_FLOOR_SPACING,left=gunLane-.84,right=gunLane+.84;
  for(const[a,b]of[[x-w/2,left],[right,x+w/2]])add((a+b)/2,(lo+hi)/2,z,b-a,hi-lo,d);
  for(const[a,b]of[[lo,Math.min(hi,floorY+.55)],[Math.max(lo,floorY+3.6),hi]])add(gunLane,(a+b)/2,z,1.68,b-a,d);
  for(const side of[-1,1])add(gunLane+side*.91,floorY+2.075,z,.13,3.12,d+.12,true);
  add(gunLane,floorY+3.7,z,1.94,.16,d+.2,true);
 }
 for(const side of[-1,1])add(x+side*(w*.5-.13),(lo+hi)/2,z,.22,hi-lo,d+.24,'edge');
 return boxes;
}

function addBox(solids,id,x,y,z,w,h,d){solids.push({id,min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]});}
function addMesh(solids,id,vertices,faces){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const v of vertices)for(let i=0;i<3;i++){min[i]=Math.min(min[i],v[i]);max[i]=Math.max(max[i],v[i]);}solids.push({id,min,max,triangles:faces.map(f=>f.map(i=>vertices[i]))});}
function cornice(solids,id,x,y,z,w,d){addBox(solids,id,x,y,z,w+.15,.15,d+.15);addBox(solids,id,x,y+.12,z,w+.27,.07,d+.27);}
function frustum(solids,id,x,z,r0,r1,bottom,top,n=8){const v=[];for(const[y,r]of[[bottom,r0],[top,r1]])for(let i=0;i<n;i++){const a=i*Math.PI*2/n;v.push([x+Math.sin(a)*r,y,z+Math.cos(a)*r]);}const f=[];for(let i=0;i<n;i++){const j=(i+1)%n;f.push([i,j,n+j],[i,n+j,n+i]);if(i>0&&i<n-1)f.push([0,i+1,i],[n,n+i,n+i+1]);}addMesh(solids,id,v,f);}
function steep(solids,id,r){const{x,y,z,w,d,h}=r,v=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[0,h,-d*.2],[0,h,d*.2]].map(p=>[p[0]+x,p[1]+y,p[2]+z]);addMesh(solids,id,v,[[0,4,1],[1,4,5],[1,5,2],[2,5,3],[3,5,4],[3,4,0],[0,1,2],[0,2,3]]);cornice(solids,id,x,y,z,w,d);}

export function castleSolids(rings=2){
 const stage=Math.max(0,Math.min(2,Math.floor(rings)));if(cache.has(stage))return cache.get(stage);
 const m=castleMassing(stage),solids=[];
 for(const wall of m.walls){for(let tier=0;tier<m.count;tier++)for(const[b,box]of castleWallBoxes(wall,tier,m.count).entries())addBox(solids,`${wall.id}:${tier}:${b}`,box.x,box.y,box.z,box.w,box.h,box.d);cornice(solids,wall.id,wall.x,wall.top,wall.z,wall.w+.1,wall.d+.08);}
 m.roofs.forEach((r,i)=>steep(solids,`roof:${i}`,r));
 for(let tier=0;tier<m.count;tier++){
  const y=KAIJU_DECK_Y+tier*KAIJU_FLOOR_SPACING,hi=tier===m.count-1?m.highest+2.4:y+KAIJU_FLOOR_SPACING;
  addBox(solids,`core:${tier}`,0,(y+hi)/2,-12,2.7,hi-y,3);for(const side of[-1,1])addBox(solids,`core-pier:${tier}`,side*1.28,(y+hi)/2,-13.5,.14,hi-y,.2);
  addBox(solids,`floor:${tier}`,0,y-.31,-12,10.8,.52,10.8);addBox(solids,`paving:${tier}`,0,y+.045,-12,10.8,.09,10.8);cornice(solids,`floor-rim:${tier}`,0,y-.46,-12,10.7,10.7);
  for(const side of[-1,1]){addBox(solids,`walk:${tier}`,side*5,y+.098,-12,.72,.022,10.32);addBox(solids,`walk:${tier}`,0,y+.098,-12+side*4.8,10.32,.022,.72);addBox(solids,`rail:${tier}`,side*5.36,y+.78,-12,.12,.13,10.7);addBox(solids,`rail:${tier}`,0,y+.78,-12+side*5.36,10.7,.13,.12);}
 }
 for(const[i,t]of m.shafts.entries()){
  const{x,z,r,top,h}=t;for(let tier=0;tier<m.count;tier++){const bottom=Math.max(t.bottom,tier?KAIJU_DECK_Y+tier*KAIJU_FLOOR_SPACING:t.bottom),end=Math.min(top,tier===m.count-1?top:KAIJU_DECK_Y+(tier+1)*KAIJU_FLOOR_SPACING);if(end>bottom){frustum(solids,`shaft:${i}:${tier}`,x,z,r*1.07,r,bottom,end);cornice(solids,`shaft-cornice:${i}:${tier}`,x,bottom+.14,z,r*1.9,r*1.9);}}frustum(solids,`spire:${i}`,x,z,r*1.2*1.09,0,top+.11,top+h+.11);
 }
 addBox(solids,'upper-needle-support',4.7,m.shafts[0].bottom-.20,-17.98,1.6,.4,.42);
 const annexY=m.highest+(m.count>2?-8.4:-2.5);frustum(solids,'annex',-5.7,-6.4,.6*1.07,.6,annexY-4.1,annexY+1.8);frustum(solids,'annex-roof',-5.7,-6.4,.78*1.09,0,annexY+1.91,annexY+5.41);
 cache.set(stage,solids);return solids;
}

function span(a,b,min,max,pad=0){let lo=0,hi=1;for(let i=0;i<3;i++){const d=b[i]-a[i];if(Math.abs(d)<1e-10){if(a[i]<min[i]-pad||a[i]>max[i]+pad)return null;continue;}let x=(min[i]-pad-a[i])/d,y=(max[i]+pad-a[i])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return null;}return [lo,hi];}
function triangleHit(a,b,t){const d=b.map((v,i)=>v-a[i]),e=t[1].map((v,i)=>v-t[0][i]),f=t[2].map((v,i)=>v-t[0][i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],p=cross(d,f),det=dot(e,p);if(Math.abs(det)<1e-10)return null;const q=a.map((v,i)=>v-t[0][i]),u=dot(q,p)/det;if(u<0||u>1)return null;const r=cross(q,e),v=dot(d,r)/det;if(v<0||u+v>1)return null;const h=dot(f,r)/det;return h>=0&&h<=1?h:null;}
function segmentHit(solids,a,b,pad=0){let best=null;for(const s of solids){const interval=span(a,b,s.min,s.max,pad);if(!interval)continue;let t=interval[0];if(s.triangles){let closest=null;for(const tri of s.triangles){const h=triangleHit(a,b,tri);if(h!==null&&(closest===null||h<closest))closest=h;}if(closest===null)continue;t=closest;}if(!best||t<best.t)best={id:s.id,t,point:a.map((v,i)=>v+(b[i]-v)*t)};}return best;}

export function cannonMuzzleLocal(slot,level,yaw,barrel=0){const p=kaijuSlotPosition(slot),m=CANNON_MOUNT,x=level>1?(barrel===0?-1:1)*m.doubleX*m.scaleX:0,z=m.muzzleZ*m.scaleZ,y=KAIJU_DECK_Y+p.y+m.districtY+m.turretY+m.barrelY*m.scaleY,c=Math.cos(yaw),s=Math.sin(yaw);return {breech:{x:p.x+c*x,y,z:p.z-s*x},muzzle:{x:p.x+c*x+s*z,y,z:p.z-s*x+c*z}};}
const xyz=p=>[p.x,p.y,p.z];
export function castleBarrelClearance({rings=2,slot,level=1,yaw}){const solids=castleSolids(rings);for(let i=0;i<(level>1?2:1);i++){const p=cannonMuzzleLocal(slot,level,yaw,i),hit=segmentHit(solids,xyz(p.breech),xyz(p.muzzle),CANNON_MOUNT.barrelRadius);if(hit)return{clear:false,blocker:`castle:${hit.id}`,hit,barrel:i};}return{clear:true,blocker:null};}
export function castleShotClearance({rings=2,slot,level=1,yaw,target,arcHeight=3/.55}){
 const barrel=castleBarrelClearance({rings,slot,level,yaw});if(!barrel.clear)return{clear:false,blocker:barrel.blocker,barrelClear:false,barrelHit:barrel.hit,hit:null};
 const solids=castleSolids(rings),end=xyz(target);
 for(let i=0;i<(level>1?2:1);i++){
  const a=xyz(cannonMuzzleLocal(slot,level,yaw,i).muzzle),interval=span(a,end,[-6.8,-1e5,-19.6],[6.8,1e5,-4.8]);if(!interval)continue;
  const start=interval[0],stop=interval[1],distance=Math.hypot(...end.map((v,j)=>v-a[j]))*(stop-start),steps=Math.max(4,Math.min(24,Math.ceil(distance/.75)));
  let previous=a.map((v,j)=>v+(end[j]-v)*start+(j===1?Math.sin(start*Math.PI)*arcHeight:0));
  for(let step=1;step<=steps;step++){const t=start+(stop-start)*step/steps,next=a.map((v,j)=>v+(end[j]-v)*t+(j===1?Math.sin(t*Math.PI)*arcHeight:0)),hit=segmentHit(solids,previous,next);if(hit)return{clear:false,blocker:`castle:${hit.id}`,barrelClear:true,barrelHit:null,hit,barrel:i};previous=next;}
 }
 return{clear:true,blocker:null,barrelClear:true,barrelHit:null,hit:null};
}
export function nearestCastleYaw({rings=2,slot,level=1,yaw,reference}){if(castleBarrelClearance({rings,slot,level,yaw}).clear)return yaw;let safe=Number.isFinite(reference)?reference:kaijuSlotPosition(slot).rotation;if(!castleBarrelClearance({rings,slot,level,yaw:safe}).clear)safe=kaijuSlotPosition(slot).rotation;let low=0,high=1,delta=norm(yaw-safe);for(let i=0;i<12;i++){const middle=(low+high)/2;if(castleBarrelClearance({rings,slot,level,yaw:safe+delta*middle}).clear)low=middle;else high=middle;}return safe+delta*low;}
