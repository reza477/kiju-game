import {KAIJU_DECK_Y,KAIJU_FLOOR_SPACING,kaijuSlotPosition,kaijuFloorCount,kaijuTowerTop} from './city-layout.js';
import {verticalCastleSolids} from './vertical-castle.js';

export const CANNON_MOUNT=Object.freeze({districtY:.18,turretY:.64,scaleX:1.08,scaleY:1.18,scaleZ:1.15,barrelY:.55,muzzleZ:2.13,doubleX:.34,barrelRadius:.34});
export function cannonMountProfile(layout){
 const scale=layout?.weaponScale??1,districtY=layout?.districtOffset??CANNON_MOUNT.districtY;
 return {scale,districtY,muzzleY:districtY+scale*(CANNON_MOUNT.turretY+CANNON_MOUNT.barrelY*CANNON_MOUNT.scaleY),barrelRadius:CANNON_MOUNT.barrelRadius*scale};
}
const cache=new Map(),norm=a=>Math.atan2(Math.sin(a),Math.cos(a));

export function lancetOutline(w,h){const p=[[-w/2,0],[-w/2,h*.63]];for(let i=1;i<=4;i++){const t=i/4,u=1-t;p.push([u*u*-w/2+2*u*t*-w*.43,u*u*h*.63+2*u*t*h*.82+t*t*h]);}for(let i=1;i<=4;i++){const t=i/4,u=1-t;p.push([2*u*t*w*.43+t*t*w/2,u*u*h+2*u*t*h*.82+t*t*h*.63]);}p.push([w/2,0]);return p;}
export const lancetDetails=(w,h)=>[{x:0,y:h*.4,z:.089,w:.045,h:h*.8,d:.045,material:'dark'},{x:0,y:h*.39,z:.087,w:w*.88,h:.04,d:.04,material:'dark'},{x:0,y:-.01,z:.05,w:w+.28,h:.08,d:.22,material:'trim'}];
export function towerWindows(x,z,r,bottom,top){const h=top-bottom,out=[];if(h<=2.2)return out;for(let row=0;row<Math.floor(h/3.4);row++)for(let face=0;face<4;face++){const rotation=face*Math.PI/2;out.push({x:x+Math.sin(rotation)*r*.94,y:bottom+.9+row*3.4,z:z+Math.cos(rotation)*r*.94,rotation,w:r*.4,h:Math.min(2,h-1.1),row,face});}return out;}
export function towerCornerStrips(x,z,r,bottom,top){return Array.from({length:4},(_,i)=>{const a=i*Math.PI/2+Math.PI/4;return{x:x+Math.sin(a)*r*.9,y:(bottom+top)/2,z:z+Math.cos(a)*r*.9,w:.11,h:top-bottom+.1,d:.11};});}
export function castleFloorDetails(y){const out=[],add=(material,x,y,z,w,h,d)=>out.push({material,x,y,z,w,h,d});for(const side of[-1,1]){add('walk',side*5,y+.098,-12,.72,.022,10.32);add('walk',0,y+.098,-12+side*4.8,10.32,.022,.72);add('trim',side*5.36,y+.78,-12,.12,.13,10.7);for(let z=-4.8;z<=4.8;z+=1.2){add('wall',side*5.36,y+.39,-12+z,.16,.66,.16);add('trim',side*5.36,y+.8,-12+z,.22,.08,.22);}add('trim',0,y+.78,-12+side*5.36,10.7,.13,.12);for(let x=-4.8;x<=4.8;x+=1.2)add('wall',x,y+.4,-12+side*5.36,.14,.67,.16);}return out;}
export function steepRoofShape({w,d,h}){
 const vertices=[],faces=[];
 // Swept slate hips pull inward above flared eaves. Their intermediate ridges
 // give the big roofs a deliberate silhouette rather than six flat triangles.
 for(const[t,width,depth]of[[0,.5,.5],[.30,.29,.385],[.68,.12,.275]])for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]])vertices.push([sx*w*width,h*t,sz*d*depth]);
 vertices.push([0,h,-d*.2],[0,h,d*.2]);
 for(let ring=0;ring<2;ring++)for(let i=0;i<4;i++){const a=ring*4+i,b=ring*4+(i+1)%4,c=b+4,e=a+4;faces.push([a,e,b],[b,e,c]);}
 faces.push([8,12,9],[9,12,13],[9,13,10],[10,13,11],[11,13,12],[11,12,8]);
 return {vertices,faces};
}
export function steepRoofSeams({x,y,z,w,d,h}){const out=[],{vertices:v}=steepRoofShape({w,d,h}),world=p=>[p[0]+x,p[1]+y,p[2]+z];for(let i=0;i<4;i++){const ids=[i,i+4,i+8,i<2?12:13];for(let j=1;j<ids.length;j++)out.push({a:world(v[ids[j-1]]),b:world(v[ids[j]]),r:.033});}out.push({a:world(v[12]),b:world(v[13]),r:.06});return out;}
export function spireSeams(x,y,z,r,h){return Array.from({length:4},(_,i)=>{const a=i*Math.PI/2+Math.PI/4;return{a:[x+Math.sin(a)*r*.79,y+.12,z+Math.cos(a)*r*.79],b:[x,y+h+.14,z],r:.025};});}
export function castleWallWindows(wall,tier,count,deckY=KAIJU_DECK_Y){
 const{x,z,w,d,bottom,top,gunLane,front,seed}=wall,lo=Math.max(bottom,tier?deckY+tier*KAIJU_FLOOR_SPACING:bottom),hi=Math.min(top,tier===count-1?top:deckY+(tier+1)*KAIJU_FLOOR_SPACING),out=[];
 // Tall choir lights, paired gallery lights and narrow arrow loops have distinct
 // architectural jobs. Their cadence continues across inspection boundaries.
 const choir=wall.id?.includes('choir')||wall.id?.includes('belfry'),spacing=choir?5.9:3.25,windowH=choir?3.65:2.3,start=bottom+1.25;
 if(hi<=lo)return out;
 for(let y=start+Math.max(0,Math.ceil((lo-start)/spacing))*spacing;y+windowH+.12<hi+.01;y+=spacing){
  if(front){for(const xx of(w>3?[-w*.27,w*.27]:[0])){if(gunLane!=null&&Math.abs(x+xx-gunLane)<1.18)continue;for(const side of[-1,1])out.push({x:x+xx,y,z:z+side*(d*.5+.025),rotation:side<0?Math.PI:0,w:choir?Math.min(.96,w*.48):w>3?.60:Math.min(.64,w*.42),h:windowH,lit:(seed+Math.round(y/spacing)+Math.round(xx*4))%7===0,recess:.23});}if(d>2.2)for(const side of[-1,1])out.push({x:x+side*(w*.5+.025),y,z,rotation:side*Math.PI/2,w:choir?.80:.60,h:windowH,lit:(seed+Math.round(y/spacing)+side)%7===0,recess:.23});}
  else for(const dz of(d>5?[-d*.28,d*.28]:[0]))out.push({x:x+Math.sign(x)*(w*.5+.025),y,z:z+dz,rotation:Math.sign(x)*Math.PI/2,w:choir?.88:.64,h:windowH,lit:(seed+Math.round(y/spacing))%7===0,recess:.23});
 }
 for(const p of out){p.x-=Math.sin(p.rotation)*p.recess;p.z-=Math.cos(p.rotation)*p.recess;}
 return out;
}

/** Shared major geometry: renderer and physics use identical port-bearing masses. */
export function castleMassing(rings=2,deckY=KAIJU_DECK_Y){
 const stage=Math.max(0,Math.min(2,Math.floor(rings))),count=kaijuFloorCount(stage),highest=deckY+(count-1)*KAIJU_FLOOR_SPACING,totalTop=kaijuTowerTop(stage)+deckY-KAIJU_DECK_Y,mainCrown=totalTop-10.8;
 const leftCrown=highest+(count>2?-5.6:2.4),rearCrown=highest+2.4,leftWingTop=highest+(count>2?-1.5:5),rightWingTop=highest+2.5,rearTop=Math.max(highest+3,mainCrown-4);
 const walls=[
  {id:'main-keep',x:.8,z:-18.76,w:6.30,d:2.76,bottom:deckY-4.1,top:mainCrown,seed:2,front:true,gunLane:3.1},
  {id:'gate-tower',x:-4.7,z:-18.54,w:2.18,d:2.96,bottom:deckY-6.7,top:leftCrown-7.8,seed:4,front:true},
  {id:'gate-belfry',x:-4.7,z:-19.70,w:3.72,d:4.12,bottom:leftCrown-7.8,top:leftCrown,seed:8,front:true},
  {id:'left-wing',x:-5.86,z:-11.98,w:.65,d:8.3,bottom:deckY-.3,top:leftWingTop,seed:7,front:false},
  {id:'right-wing',x:5.82,z:-9.48,w:.65,d:6.3,bottom:deckY-2.5,top:rightWingTop,seed:3,front:false},
  {id:'rear-spine',x:0,z:-6.1,w:3.5,d:1.15,bottom:deckY-2.5,top:rearTop,seed:1,front:true}
 ];
 const roofs=[{x:.8,y:mainCrown,z:-18.76,w:6.78,d:3.54,h:9.28},{x:-4.7,y:leftCrown,z:-19.70,w:4.34,d:4.66,h:8.4},{x:-5.86,y:leftWingTop,z:-11.98,w:.96,d:8.45,h:4},{x:5.82,y:rightWingTop,z:-9.48,w:.94,d:6.46,h:3.1},{x:0,y:rearTop,z:-6.1,w:3.7,d:1.85,h:5}];
 // The grown keep rises from a broad lower hall into an offset, narrower crown.
 // Its west wing ends in a roofed shoulder halfway up, exposing the upper keep
 // as a separate mass without moving a single supported ward or promenade.
 if(count>2){
  const setback=deckY+2*KAIJU_FLOOR_SPACING,main=walls[0],west=walls.find(w=>w.id==='left-wing');
  walls.push({...main,id:'upper-keep',x:1.5,w:4.9,z:-18.55,d:2.34,bottom:setback,top:mainCrown-6.5});main.top=setback;
  walls.push({...main,id:'keep-crown',x:1.18,w:5.74,z:-18.85,d:2.94,bottom:mainCrown-6.5,top:mainCrown,seed:5});
  walls.push({...west,id:'upper-west-wing',z:-13.68,d:4.9,bottom:setback});west.top=setback;
  Object.assign(roofs[0],{x:1.18,w:6.16,z:-18.85,d:3.64});Object.assign(roofs[2],{z:-13.68,d:5.05});
  roofs.push({x:-1.65,y:setback,z:-18.1,w:1.42,d:1.4,h:3.15},{x:-5.86,y:setback,z:-9.73,w:.96,d:3.44,h:3.9});
 }
 // A projected choir and a lower roofed side hall make the fortress an assembly
 // of inhabited volumes. They sit wholly beyond the four district footprints.
 const choirTop=count>2?deckY+2*KAIJU_FLOOR_SPACING+4.6:mainCrown-3.1;
 walls.push({id:'projected-choir',x:-.85,z:-20.32,w:3.16,d:4.3,bottom:deckY-2.5,top:choirTop,seed:3,front:true});
 roofs.push({x:-.85,y:choirTop,z:-20.32,w:3.64,d:4.74,h:count>2?7.2:5.5});
 // A deep lateral gallery replaces the uninterrupted broad flank. Its upper
 // roof is deliberately below the narrow spine, producing a clear shoulder.
 const galleryTop=count>2?deckY+KAIJU_FLOOR_SPACING+6.0:deckY+5.2;
 walls.push({id:'western-gallery',x:-6.98,z:-10.65,w:2.52,d:6.25,bottom:deckY-1.8,top:galleryTop,seed:6,front:false});
 roofs.push({x:-6.98,y:galleryTop,z:-10.65,w:3.06,d:6.74,h:6.7});
 // A roofed passage actually spans the gate and keep, supported by a large
 // pointed compression arch. The upper chamber overhangs its narrower shaft.
 const passageY=deckY+(count>2?2*KAIJU_FLOOR_SPACING:3.2);
 walls.push({id:'gate-passage',x:-3.30,z:-20.05,w:3.7,d:2.46,bottom:passageY,top:passageY+3.35,seed:9,front:true});
 roofs.push({x:-3.30,y:passageY+3.35,z:-20.05,w:4.1,d:2.84,h:4.0});
 if(count>2){
  walls.push({id:'west-lantern',x:-6.56,z:-13.25,w:2.16,d:3.2,bottom:highest-6.6,top:leftWingTop,seed:12,front:false});
  roofs.push({x:-6.56,y:leftWingTop,z:-13.25,w:2.66,d:3.72,h:5.8});
 }
 const shafts=[{x:5.45,z:-17.98,r:.69,bottom:Math.max(deckY-6.2,highest-11.6),top:highest+5.3,h:5.8},{x:-5.65,z:-6.35,r:.53,bottom:deckY-6.2,top:rearCrown,h:4.3}];
 return {stage,count,highest,totalTop,mainCrown,leftCrown,rearCrown,leftWingTop,rightWingTop,rearTop,walls,roofs,shafts};
}

/** Load-bearing profiles are authored once for the render and firing model. */
export function castleStructuralDetails(m,deckY=KAIJU_DECK_Y){
 const details=[],tierAt=y=>Math.max(0,Math.min(m.count-1,Math.floor((y-deckY)/KAIJU_FLOOR_SPACING))),faces=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
 const addBox=(id,material,x,y,z,w,h,d)=>details.push({id,material,tier:tierAt(y),box:{x,y,z,w,h,d}});
 function pier(id,x,z,width,d0,d1,bottom,top,side=false,topX=x){
  for(let tier=0;tier<m.count;tier++){
   const lo=Math.max(bottom,tier?deckY+tier*KAIJU_FLOOR_SPACING:bottom),hi=Math.min(top,tier===m.count-1?top:deckY+(tier+1)*KAIJU_FLOOR_SPACING);if(hi<=lo)continue;
   const vertex=(u,y,v)=>{const px=x+(topX-x)*(y-bottom)/(top-bottom);return side?[px-v,y,z+u]:[px+u,y,z-v];},vertices=[];
   for(const y of[lo,hi]){const depth=d0+(d1-d0)*(y-bottom)/(top-bottom);for(const[u,v]of[[-width/2,0],[width/2,0],[width/2,depth],[-width/2,depth]])vertices.push(vertex(u,y,v));}
   details.push({id:`${id}:${tier}`,material:'edge',tier,vertices,faces});
  }
  addBox(`${id}:capital`,'trim',side?topX-d1*.5:topX,top+.08,side?z:z-d1*.5,side?d1+.22:width+.20,.18,side?width+.20:d1+.22);
 }
 const choir=m.walls.find(w=>w.id==='projected-choir');
 for(const[x,topX]of[[-3.32,-2.35],[1.5,.65]])pier(`choir-buttress:${x}`,x,-22.28,.42,1.26,.26,deckY-5.2,choir.top-.15,false,topX);
 // Recessed flank wall rises behind a pair of buttresses with strongly sloping
 // feet. Their differing terminations preserve the hierarchy of roof masses.
 const gallery=m.walls.find(w=>w.id==='western-gallery');
 for(const z of[-13.52,-7.78])pier(`flank-buttress:${z}`,-8.05,z,.56,.90,.18,deckY-4.1,gallery.top-.1,true);
 if(m.count>2)pier('lantern-support',-7.36,-14.46,.48,1.28,.22,deckY-4.1,m.highest-6.65,true);
 // Substantial tapered brackets carry the projected halls back to the harness.
 // The lower footprint narrows toward the torso; it is not another city level.
 for(const[id,bottom,top,lower,upper]of[
  ['choir-foundation',deckY-7.1,choir.bottom,[-.85,-17.8,1.8,1.8],[-.85,-20.32,3.16,4.3]],
  ['gallery-foundation',deckY-6.0,gallery.bottom,[-5.45,-10.65,.80,4.9],[-6.98,-10.65,2.52,6.25]]
 ]){
  const vertices=[];
  for(const[y,rect]of[[bottom,lower],[top,upper]]){const[x,z,w,d]=rect;for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]])vertices.push([x+sx*w/2,y,z+sz*d/2]);}
  details.push({id,material:'edge',tier:0,vertices,faces});
 }
 // Deep entrance surround under the inhabited choir creates a recognisable
 // base, rather than ending every vertical shaft in the same flat box.
 for(const x of[-1.91,.21])addBox('choir-entry-jamb','trim',x,deckY+.70,-22.60,.29,4.75,.40);
 addBox('choir-entry-step','edge',-.85,deckY-1.7,-22.60,3.5,.32,1.04);
 // Corbel courses deliberately gather below the enlarged bell chamber only.
 const bell=m.walls.find(w=>w.id==='gate-belfry');
 for(const side of[-1,1])for(const back of[-1,1]){
  const x=bell.x+side*1.44,z=bell.z+back*1.62;
  addBox('belfry-corbel-lower','edge',x-side*.22,bell.bottom-1.12,z-back*.20,.48,1.72,.52);
  addBox('belfry-corbel-middle','edge',x,bell.bottom-.48,z,.68,.40,.76);
  addBox('belfry-corbel-upper','trim',x,bell.bottom-.16,z,.90,.24,.98);
 }
 const crown=m.walls.find(w=>w.id==='keep-crown');
 if(crown)for(const x of[-1.1,.4,1.9,3.75]){
  addBox('keep-crown-corbel','edge',x,crown.bottom-.40,-20.15,.36,.82,.64);
  addBox('keep-crown-capital','trim',x,crown.bottom-.05,-20.23,.56,.18,.82);
 }
 // Pointed flying arches cross between separate supporting masses. A curved
 // compression rib reads clearly in silhouette and shares exact physics rays.
 const arch=(id,a,b,r)=>{let prior=a;for(let i=1;i<=12;i++){const t=i/12,q=a.map((v,k)=>v+(b[k]-v)*t+(k===1?Math.sin(Math.PI*t)*1.5:0));details.push({id:`${id}:${i}`,tier:tierAt(Math.max(prior[1],q[1])),material:'trim',beam:{a:prior,b:q,r}});prior=q;}};
 const passage=m.walls.find(w=>w.id==='gate-passage'),supportY=passage.bottom;
 arch('great-gate-arch',[-5.55,supportY-4.4,-21.04],[-1.55,supportY-.25,-21.04],.39);
 arch('gallery-flying-arch',[-8.35,deckY+3.2,-12.7],[-5.82,deckY+10.8,-14.15],.32);
 // Low-to-high braces tie the broad gallery roof into its thin upper lantern.
 // They deliberately have air below them rather than disguising a huge box.
 if(m.count>2)for(const z of[-14.5,-11.9])arch('lantern-brace',[-8.14,deckY+15.2,z],[-6.12,m.highest-5.8,z],.25);
 return details;
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
 // Cut a shallow rectangular niche behind each pointed window. This produces
 // real reveal shadows; the back of the niche remains solid load-bearing wall.
 let carved=boxes;
 for(const p of castleWallWindows(wall,tier,count,deckY)){
  const c=Math.cos(p.rotation),s=Math.sin(p.rotation),width=p.w+.26,height=p.h+.20,depth=.285;
  const cut={x:p.x+s*.135,y:p.y+height/2-.025,z:p.z+c*.135,w:Math.abs(c)*width+Math.abs(s)*depth,h:height,d:Math.abs(s)*width+Math.abs(c)*depth};
  carved=carved.flatMap(b=>{
   const a=[b.x-b.w/2,b.y-b.h/2,b.z-b.d/2],A=[b.x+b.w/2,b.y+b.h/2,b.z+b.d/2],q=[cut.x-cut.w/2,cut.y-cut.h/2,cut.z-cut.d/2],Q=[cut.x+cut.w/2,cut.y+cut.h/2,cut.z+cut.d/2],l=a.map((v,i)=>Math.max(v,q[i])),h=A.map((v,i)=>Math.min(v,Q[i]));
   if(l.some((v,i)=>v>=h[i]))return[b];const out=[];
   const part=(min,max)=>{if(max.every((v,i)=>v-min[i]>1e-8))out.push({x:(min[0]+max[0])/2,y:(min[1]+max[1])/2,z:(min[2]+max[2])/2,w:max[0]-min[0],h:max[1]-min[1],d:max[2]-min[2],trim:b.trim});};
   part(a,[l[0],A[1],A[2]]);part([h[0],a[1],a[2]],A);part([l[0],a[1],a[2]],[h[0],l[1],A[2]]);part([l[0],h[1],a[2]],[h[0],A[1],A[2]]);part([l[0],l[1],a[2]],[h[0],h[1],l[2]]);part([l[0],l[1],h[2]],[h[0],h[1],A[2]]);return out;
  });
 }
 for(const side of[-1,1])carved.push({x:x+side*(w*.5-.13),y:(lo+hi)/2,z,w:.22,h:hi-lo,d:d+.24,trim:'edge'});
 return carved;
}

function addBox(solids,id,x,y,z,w,h,d){solids.push({id,min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]});}
function addCapsule(solids,id,{a,b,r}){solids.push({id,min:a.map((v,i)=>Math.min(v,b[i])-r),max:a.map((v,i)=>Math.max(v,b[i])+r),capsule:{a,b,r}});}
function addWindow(solids,id,p){const c=Math.cos(p.rotation),s=Math.sin(p.rotation),world=(x,y,z)=>[p.x+c*x+s*z,p.y+y,p.z-s*x+c*z];for(const b of lancetDetails(p.w,p.h)){const v=world(b.x,b.y,b.z);addBox(solids,id,...v,Math.abs(c)*b.w+Math.abs(s)*b.d,b.h,Math.abs(s)*b.w+Math.abs(c)*b.d);}for(const[outline,y,z,depth]of[[lancetOutline(p.w+.16,p.h+.12),0,0,.045],[lancetOutline(p.w,p.h),.035,.046,.02]]){const n=outline.length,v=[...outline.map(q=>world(q[0],q[1]+y,z)),...outline.map(q=>world(q[0],q[1]+y,z+depth))],f=[];for(let i=0;i<n;i++){const j=(i+1)%n;f.push([i,j,n+j],[i,n+j,n+i]);if(i>0&&i<n-1)f.push([0,i+1,i],[n,n+i,n+i+1]);}addMesh(solids,id,v,f);}}
function addMesh(solids,id,vertices,faces){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const v of vertices)for(let i=0;i<3;i++){min[i]=Math.min(min[i],v[i]);max[i]=Math.max(max[i],v[i]);}solids.push({id,min,max,triangles:faces.map(f=>f.map(i=>vertices[i]))});}
function cornice(solids,id,x,y,z,w,d){addBox(solids,id,x,y,z,w+.15,.15,d+.15);addBox(solids,id,x,y+.12,z,w+.27,.07,d+.27);}
function frustum(solids,id,x,z,r0,r1,bottom,top,n=8){const v=[];for(const[y,r]of[[bottom,r0],[top,r1]])for(let i=0;i<n;i++){const a=i*Math.PI*2/n;v.push([x+Math.sin(a)*r,y,z+Math.cos(a)*r]);}const f=[];for(let i=0;i<n;i++){const j=(i+1)%n;f.push([i,j,n+j],[i,n+j,n+i]);if(i>0&&i<n-1)f.push([0,i+1,i],[n,n+i,n+i+1]);}addMesh(solids,id,v,f);}
function towerTrim(solids,id,x,z,r,bottom,top){cornice(solids,id,x,bottom+.14,z,r*1.9,r*1.9);for(const b of towerCornerStrips(x,z,r,bottom,top))addBox(solids,id,b.x,b.y,b.z,b.w,b.h,b.d);}
function spireTrim(solids,id,x,y,z,r,h){frustum(solids,id,x,z,r*1.04,r*.91,y-.11,y+.11);frustum(solids,id,x,z,.075,.025,y+h+.065,y+h+1.215,7);frustum(solids,id,x,z,.10,0,y+h+1.11,y+h+1.73,6);for(const seam of spireSeams(x,y,z,r,h))addCapsule(solids,id,seam);}
function steep(solids,id,r){const{x,y,z,w,d}=r,{vertices,faces}=steepRoofShape(r),v=vertices.map(p=>[p[0]+x,p[1]+y,p[2]+z]);addMesh(solids,id,v,[...faces,[0,1,2],[0,2,3]]);cornice(solids,id,x,y,z,w,d);for(const seam of steepRoofSeams(r))addCapsule(solids,`${id}:seam`,seam);}

export function castleSolids(rings=2,layout){
 if(layout)return verticalCastleSolids(layout);
 const stage=Math.max(0,Math.min(2,Math.floor(rings)));if(cache.has(stage))return cache.get(stage);
 const m=castleMassing(stage),solids=[];
 for(const wall of m.walls){for(let tier=0;tier<m.count;tier++){for(const[b,box]of castleWallBoxes(wall,tier,m.count).entries())addBox(solids,`${wall.id}:${tier}:${b}`,box.x,box.y,box.z,box.w,box.h,box.d);for(const p of castleWallWindows(wall,tier,m.count))addWindow(solids,`${wall.id}:window:${tier}`,p);}cornice(solids,wall.id,wall.x,wall.top,wall.z,wall.w+.1,wall.d+.08);}
 m.roofs.forEach((r,i)=>{steep(solids,`roof:${i}`,r);for(const side of[-1,1]){const z=r.z+side*r.d*.2;frustum(solids,`roof:${i}:finial`,r.x,z,.065,.026,r.y+r.h-.02,r.y+r.h+1.02,7);frustum(solids,`roof:${i}:finial`,r.x,z,.085,0,r.y+r.h+.895,r.y+r.h+1.345,6);}});
 for(const f of castleStructuralDetails(m)){if(f.box){const b=f.box;addBox(solids,f.id,b.x,b.y,b.z,b.w,b.h,b.d);}else if(f.beam)addCapsule(solids,f.id,f.beam);else addMesh(solids,f.id,f.vertices,f.faces);}
 for(let tier=0;tier<m.count;tier++){
  const y=KAIJU_DECK_Y+tier*KAIJU_FLOOR_SPACING,hi=tier===m.count-1?m.highest+2.4:y+KAIJU_FLOOR_SPACING;
  addBox(solids,`core:${tier}`,0,(y+hi)/2,-12,2.7,hi-y,3);for(const side of[-1,1])addBox(solids,`core-pier:${tier}`,side*1.28,(y+hi)/2,-13.5,.14,hi-y,.2);
  addBox(solids,`floor:${tier}`,0,y-.31,-12,10.8,.52,10.8);addBox(solids,`paving:${tier}`,0,y+.045,-12,10.8,.09,10.8);cornice(solids,`floor-rim:${tier}`,0,y-.46,-12,10.7,10.7);
  for(const b of castleFloorDetails(y))addBox(solids,`floor-detail:${tier}`,b.x,b.y,b.z,b.w,b.h,b.d);
  for(const side of[-1,1])addWindow(solids,`core-window:${tier}`,{x:side*.65,y:y+1,z:-13.53,rotation:Math.PI,w:.37,h:2.15});
  for(const x of[-3.65,-2.55,2.55,3.65])addWindow(solids,`floor-window:${tier}`,{x,y:y-1.36,z:-17.08,rotation:Math.PI,w:.23,h:.70});
 }
 for(const[i,t]of m.shafts.entries()){
  const{x,z,r,top,h}=t;for(let tier=0;tier<m.count;tier++){const bottom=Math.max(t.bottom,tier?KAIJU_DECK_Y+tier*KAIJU_FLOOR_SPACING:t.bottom),end=Math.min(top,tier===m.count-1?top:KAIJU_DECK_Y+(tier+1)*KAIJU_FLOOR_SPACING);if(end>bottom){frustum(solids,`shaft:${i}:${tier}`,x,z,r*1.07,r,bottom,end);towerTrim(solids,`shaft-trim:${i}:${tier}`,x,z,r,bottom,end);for(const p of towerWindows(x,z,r,bottom,end))addWindow(solids,`shaft-window:${i}:${tier}`,p);}}frustum(solids,`spire:${i}`,x,z,r*1.2*1.09,0,top+.11,top+h+.11);spireTrim(solids,`spire-trim:${i}`,x,top,z,r*1.2,h);
 }
 addBox(solids,'upper-needle-support',4.7,m.shafts[0].bottom-.20,-17.98,1.6,.4,.42);
 const annexY=m.highest+(m.count>2?-8.4:-2.5);frustum(solids,'annex',-5.7,-6.4,.6*1.07,.6,annexY-4.1,annexY+1.8);towerTrim(solids,'annex-trim',-5.7,-6.4,.6,annexY-4.1,annexY+1.8);frustum(solids,'annex-roof',-5.7,-6.4,.78*1.09,0,annexY+1.91,annexY+5.41);for(const p of towerWindows(-5.7,-6.4,.6,annexY-4.1,annexY+1.8))addWindow(solids,'annex-window',p);spireTrim(solids,'annex-roof-trim',-5.7,annexY+1.8,-6.4,.78,3.5);
 cache.set(stage,solids);return solids;
}

function span(a,b,min,max,pad=0){let lo=0,hi=1;for(let i=0;i<3;i++){const d=b[i]-a[i];if(Math.abs(d)<1e-10){if(a[i]<min[i]-pad||a[i]>max[i]+pad)return null;continue;}let x=(min[i]-pad-a[i])/d,y=(max[i]+pad-a[i])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return null;}return [lo,hi];}
function triangleHit(a,b,t){const d=b.map((v,i)=>v-a[i]),e=t[1].map((v,i)=>v-t[0][i]),f=t[2].map((v,i)=>v-t[0][i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],p=cross(d,f),det=dot(e,p);if(Math.abs(det)<1e-10)return null;const q=a.map((v,i)=>v-t[0][i]),u=dot(q,p)/det;if(u<0||u>1)return null;const r=cross(q,e),v=dot(d,r)/det;if(v<0||u+v>1)return null;const h=dot(f,r)/det;return h>=0&&h<=1?h:null;}
function capsuleHit(a,b,cap,pad){const d=b.map((v,i)=>v-a[i]),e=cap.b.map((v,i)=>v-cap.a[i]),r=a.map((v,i)=>v-cap.a[i]),dot=(x,y)=>x[0]*y[0]+x[1]*y[1]+x[2]*y[2],A=dot(d,d),E=dot(e,e),B=dot(d,e),C=dot(d,r),F=dot(e,r),clamp=x=>Math.max(0,Math.min(1,x));let s=A*E-B*B>1e-12?clamp((B*F-C*E)/(A*E-B*B)):0,t=E>1e-12?(B*s+F)/E:0;if(t<0){t=0;s=clamp(-C/A);}else if(t>1){t=1;s=clamp((B-C)/A);}const q=r.map((v,i)=>v+d[i]*s-e[i]*t);return dot(q,q)<=(cap.r+pad)**2?s:null;}
function segmentHit(solids,a,b,pad=0){let best=null;for(const s of solids){const interval=span(a,b,s.min,s.max,pad);if(!interval)continue;let t=interval[0];if(s.capsule){t=capsuleHit(a,b,s.capsule,pad);if(t===null)continue;}else if(s.triangles){let closest=null;for(const tri of s.triangles){const h=triangleHit(a,b,tri);if(h!==null&&(closest===null||h<closest))closest=h;}if(closest===null)continue;t=closest;}if(!best||t<best.t)best={id:s.id,t,point:a.map((v,i)=>v+(b[i]-v)*t)};}return best;}

export function cannonMuzzleLocal(slot,level,yaw,barrel=0,layout){const p=layout?.positions[slot]??kaijuSlotPosition(slot),m=CANNON_MOUNT,profile=cannonMountProfile(layout),x=level>1?(barrel===0?-1:1)*m.doubleX*m.scaleX*profile.scale:0,z=m.muzzleZ*m.scaleZ*profile.scale,y=KAIJU_DECK_Y+p.y+profile.muzzleY,c=Math.cos(yaw),s=Math.sin(yaw);return {breech:{x:p.x+c*x,y,z:p.z-s*x},muzzle:{x:p.x+c*x+s*z,y,z:p.z-s*x+c*z}};}
const xyz=p=>[p.x,p.y,p.z];
export function castleBarrelClearance({rings=2,layout,slot,level=1,yaw}){const solids=castleSolids(rings,layout),radius=cannonMountProfile(layout).barrelRadius;for(let i=0;i<(level>1?2:1);i++){const p=cannonMuzzleLocal(slot,level,yaw,i,layout),hit=segmentHit(solids,xyz(p.breech),xyz(p.muzzle),radius);if(hit)return{clear:false,blocker:`castle:${hit.id}`,hit,barrel:i};}return{clear:true,blocker:null};}
export function castleShotClearance({rings=2,layout,slot,level=1,yaw,target,arcHeight=3/.55}){
 const barrel=castleBarrelClearance({rings,layout,slot,level,yaw});if(!barrel.clear)return{clear:false,blocker:barrel.blocker,barrelClear:false,barrelHit:barrel.hit,hit:null};
 const solids=castleSolids(rings,layout),end=xyz(target);
 for(let i=0;i<(level>1?2:1);i++){
  // Derive the broad-phase envelope from authoritative solids so projected
  // choirs, deep roof eaves and flying buttresses cannot escape trajectory tests.
  const min=[Infinity,-1e5,Infinity],max=[-Infinity,1e5,-Infinity];for(const solid of solids)for(const axis of[0,2]){min[axis]=Math.min(min[axis],solid.min[axis]);max[axis]=Math.max(max[axis],solid.max[axis]);}
  const a=xyz(cannonMuzzleLocal(slot,level,yaw,i,layout).muzzle),interval=span(a,end,min,max);if(!interval)continue;
  const start=interval[0],stop=interval[1],distance=Math.hypot(...end.map((v,j)=>v-a[j]))*(stop-start),steps=Math.max(4,Math.min(24,Math.ceil(distance/.75)));
  let previous=a.map((v,j)=>v+(end[j]-v)*start+(j===1?Math.sin(start*Math.PI)*arcHeight:0));
  for(let step=1;step<=steps;step++){const t=start+(stop-start)*step/steps,next=a.map((v,j)=>v+(end[j]-v)*t+(j===1?Math.sin(t*Math.PI)*arcHeight:0)),hit=segmentHit(solids,previous,next);if(hit)return{clear:false,blocker:`castle:${hit.id}`,barrelClear:true,barrelHit:null,hit,barrel:i};previous=next;}
 }
 return{clear:true,blocker:null,barrelClear:true,barrelHit:null,hit:null};
}
export function nearestCastleYaw({rings=2,layout,slot,level=1,yaw,reference}){if(castleBarrelClearance({rings,layout,slot,level,yaw}).clear)return yaw;const outward=layout?.positions[slot].rotation??kaijuSlotPosition(slot).rotation;let safe=Number.isFinite(reference)?reference:outward;if(!castleBarrelClearance({rings,layout,slot,level,yaw:safe}).clear)safe=outward;let low=0,high=1,delta=norm(yaw-safe);for(let i=0;i<12;i++){const middle=(low+high)/2;if(castleBarrelClearance({rings,layout,slot,level,yaw:safe+delta*middle}).clear)low=middle;else high=middle;}return safe+delta*low;}
