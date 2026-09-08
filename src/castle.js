import * as T from '../vendor/three.module.js';
import {getMaterial,box,cylinder,cone,beam,batchStatic} from './materials.js';
import {KAIJU_DECK_Y,KAIJU_CENTER,KAIJU_FLOOR_SPACING,KAIJU_FLOOR_SLOTS,kaijuFloorCount,kaijuTowerTop,kaijuWalkFloors,RING_SLOTS} from './city-layout.js';
export {kaijuSlotPosition} from './city-layout.js';
const M=(kind,color)=>getMaterial(kind,color);
function mesh(group,geometry,material,x=0,y=0,z=0){const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
function pointedShape(w,h){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h*.63);s.quadraticCurveTo(-w*.43,h*.82,0,h);s.quadraticCurveTo(w*.43,h*.82,w/2,h*.63);s.lineTo(w/2,0);s.closePath();return s;}
function lancet(group,x,y,z,rotation,w,h,p,lit=false){
 const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;group.add(g);
 mesh(g,new T.ExtrudeGeometry(pointedShape(w+.16,h+.12),{depth:.045,bevelEnabled:false,curveSegments:4}),p.trim);
 const pane=mesh(g,new T.ExtrudeGeometry(pointedShape(w,h),{depth:.02,bevelEnabled:false,curveSegments:4}),lit?p.light:p.glass,0,.035,.046);pane.castShadow=false;
 box(g,.045,h*.8,.045,p.dark,0,h*.4,.089);box(g,w*.88,.04,.04,p.dark,0,h*.39,.087);box(g,w+.28,.08,.22,p.trim,0,-.01,.05);
}
function pointedArch(group,a,b,y,rise,p,width=.12){
 const middle=[(a[0]+b[0])/2,y+rise,(a[1]+b[1])/2];
 let previous=[a[0],y,a[1]];
 for(let i=1;i<=8;i++){const t=i/8,half=t<=.5?t*2:(1-t)*2;const next=[a[0]+(b[0]-a[0])*t,y+rise*Math.sin(half*Math.PI/2),a[1]+(b[1]-a[1])*t];beam(group,previous,next,width,p.trim);previous=next;}
 return middle;
}
function cornice(group,x,y,z,w,d,p){box(group,w+.15,.15,d+.15,p.trim,x,y,z);box(group,w+.27,.07,d+.27,p.edge,x,y+.12,z);}
function roof(group,x,y,z,r,h,p){
 cylinder(group,r*.91,r*1.04,.22,p.trim,x,y,z,8);
 cone(group,r*1.09,h,p.roof,x,y+h*.5+.11,z,8);
 for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;beam(group,[x+Math.sin(a)*r*.79,y+.12,z+Math.cos(a)*r*.79],[x,y+h+.14,z],.025,p.metal);}
 cylinder(group,.025,.075,1.15,p.metal,x,y+h+.64,z,7);cone(group,.10,.62,p.metal,x,y+h+1.42,z,6);
}
function towerSegment(group,x,z,r,bottom,top,p,seed,windows=true){
 const h=top-bottom;cylinder(group,r,r*1.07,h,p.wall,x,bottom+h/2,z,8);
 cornice(group,x,bottom+.14,z,r*1.9,r*1.9,p);
 for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;box(group,.11,h+.1,.11,p.trim,x+Math.sin(a)*r*.9,bottom+h/2,z+Math.cos(a)*r*.9);}
 if(windows&&h>2.2){
  for(let row=0;row<Math.floor(h/3.4);row++)for(let face=0;face<4;face++){
   const a=face*Math.PI/2,yy=bottom+.9+row*3.4;
   lancet(group,x+Math.sin(a)*r*.94,yy,z+Math.cos(a)*r*.94,a,r*.40,Math.min(2.0,h-1.1),p,(seed+row*3+face)%7===1);
  }
 }
}
function balcony(group,x,y,z,w,d,p,front=true){
 box(group,w,.34,d,p.wall,x,y-.22,z);box(group,w+.08,.09,d+.08,p.paving,x,y+.045,z);
 if(front){
  const zz=z-d/2;box(group,w,.16,.16,p.trim,x,y+.31,zz);
  for(let xx=-w/2+.25;xx<w/2;xx+=.68){box(group,.16,.64,.17,p.wall,x+xx,y+.40,zz);box(group,.23,.075,.24,p.trim,x+xx,y+.76,zz);}
 }
}
function bridge(group,x1,x2,z,y,p){
 const w=x2-x1;box(group,w,.28,.82,p.wall,(x1+x2)/2,y-.15,z);box(group,w,.09,.83,p.paving,(x1+x2)/2,y+.045,z);
 for(const side of[-1,1]){box(group,w,.12,.10,p.trim,(x1+x2)/2,y+.74,z+side*.38);for(let x=x1+.2;x<x2;x+=.65)box(group,.09,.63,.1,p.wall,x,y+.4,z+side*.38);}
 pointedArch(group,[x1,z],[x2,z],y-2.5,2.23,p,.15);
}
function floor(group,tier,deckY,p){
 const y=deckY+tier*KAIJU_FLOOR_SPACING,z=KAIJU_CENTER.z;
 // Each floor has exactly the same plan: a keep and four supported wards.
 box(group,10.8,.52,10.8,p.wall,0,y-.31,z);box(group,10.8,.09,10.8,p.paving,0,y+.045,z);
 cornice(group,0,y-.46,z,10.7,10.7,p);
 for(const side of[-1,1]){
  box(group,.72,.022,10.32,p.walk,side*5,y+.098,z);
  box(group,10.32,.022,.72,p.walk,0,y+.098,z+side*4.8);
  // Low open tracery keeps the occupied floor visible from the outer camera.
  box(group,.12,.13,10.7,p.trim,side*5.36,y+.78,z);
  for(let zz=-4.8;zz<=4.8;zz+=1.2){box(group,.16,.66,.16,p.wall,side*5.36,y+.39,z+zz);box(group,.22,.08,.22,p.trim,side*5.36,y+.80,z+zz);}
  box(group,10.7,.13,.12,p.trim,0,y+.78,z+side*5.36);
  for(let xx=-4.8;xx<=4.8;xx+=1.2)box(group,.14,.67,.16,p.wall,xx,y+.4,z+side*5.36);
 }
 // The structural ribs are below the floors, outside all district interiors.
 for(const side of[-1,1])for(const zz of[-3.4,3.4]){
  beam(group,[side*5.28,y-.65,z+zz],[side*4.84,y-2.0,z+zz],.14,p.wall);
  beam(group,[side*4.84,y-2.0,z+zz],[side*5.18,y-2.0,z+zz],.11,p.trim);
 }
 // Face of each thick inhabited cornice: small sparse warm lancets.
 for(const x of[-3.65,-2.55,2.55,3.65])lancet(group,x,y-1.36,z-5.08,Math.PI,.23,.70,p,(tier+Math.round(x*4))%5===0);
}

function steepRoof(group,x,y,z,w,d,h,p){
 const v=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[0,h,-d*.20],[0,h,d*.20]],faces=[[0,4,1],[1,4,5],[1,5,2],[2,5,3],[3,5,4],[3,4,0]],pos=[],uv=[];
 for(const f of faces)for(const i of f){pos.push(...v[i]);uv.push(v[i][0]/w+.5,v[i][1]/h);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();mesh(group,geometry,p.roof,x,y,z);
 cornice(group,x,y,z,w,d,p);
 for(const i of[0,1,2,3])beam(group,[x+v[i][0],y,z+v[i][2]],[x,y+h,z+(i<2?-d*.2:d*.2)],.033,p.metal);
 beam(group,[x,y+h,z-d*.2],[x,y+h,z+d*.2],.06,p.metal);
 for(const side of[-1,1]){cylinder(group,.026,.065,1.04,p.metal,x,y+h+.50,z+side*d*.2,7);cone(group,.085,.45,p.metal,x,y+h+1.12,z+side*d*.2,6);}
}

/** The playable wards remain stacked inside unequal exterior castle volumes. */
export function createCastleBackpack(deckY=KAIJU_DECK_Y,enemy=false,rings=1){
 const stage=Math.max(0,Math.min(2,Math.floor(rings))),count=kaijuFloorCount(stage),highest=deckY+(count-1)*KAIJU_FLOOR_SPACING;
 const totalTop=kaijuTowerTop(stage)+(deckY-KAIJU_DECK_Y),mainCrown=totalTop-10.8;
 const group=new T.Group();group.name='Clustered Gothic castle backpack';
 const p={wall:M('stone',enemy?0x666873:0x747779),trim:M('stone',0xada79a),edge:M('stone',0x827e76),roof:M('roof',0x74483d),metal:M('metal',0x706967),dark:M('metal',0x343641),paving:M('pavement',0x868781),walk:M('pavement',0xaaa391),light:M('window',0xc1c9bb),glass:M('glass',0x68828e)};
 const floors=[],shells=[];
 for(let tier=0;tier<count;tier++){
  const g=new T.Group();g.name=`Castle floor ${tier+1}`;Object.assign(g.userData,{towerTier:tier,tier,noBatch:true});group.add(g);floors.push(g);floor(g,tier,deckY,p);
  const shell=new T.Group();shell.name=`Exterior shell ${tier+1}`;Object.assign(shell.userData,{inspectionShell:true,towerTier:tier,noBatch:true});g.add(shell);shells.push(shell);
 }
 // Every exterior piece is clipped at floor boundaries for reversible inspection.
 const shellAt=y=>shells[Math.max(0,Math.min(count-1,Math.floor((y-deckY)/KAIJU_FLOOR_SPACING)))];
 function wallVolume(x,z,w,d,bottom,top,seed,front=true,gunLane=null){
  for(let tier=0;tier<count;tier++){
   const lo=Math.max(bottom,tier?deckY+tier*KAIJU_FLOOR_SPACING:bottom),hi=Math.min(top,tier===count-1?top:deckY+(tier+1)*KAIJU_FLOOR_SPACING);if(hi<=lo)continue;
   const shell=shells[tier],h=hi-lo;
   if(gunLane===null)box(shell,w,h,d,p.wall,x,(lo+hi)/2,z);
   else{
    const floorY=deckY+tier*KAIJU_FLOOR_SPACING,left=gunLane-.84,right=gunLane+.84,low=floorY+.55,high=floorY+3.60;
    for(const [a,b]of[[x-w/2,left],[right,x+w/2]])if(b>a)box(shell,b-a,h,d,p.wall,(a+b)/2,(lo+hi)/2,z);
    for(const [a,b]of[[lo,Math.min(hi,low)],[Math.max(lo,high),hi]])if(b>a)box(shell,1.68,b-a,d,p.wall,gunLane,(a+b)/2,z);
    // Real open gun port: no glass pane or hidden wall across the firing lane.
    for(const side of[-1,1])box(shell,.13,3.12,d+.12,p.trim,gunLane+side*.91,floorY+2.075,z);
    box(shell,1.94,.16,d+.2,p.trim,gunLane,floorY+3.70,z);
   }
   // Long uninterrupted piers visually join floors into a single inhabited keep.
   for(const side of[-1,1])box(shell,.22,h,d+.24,p.edge,x+side*(w*.5-.13),(lo+hi)/2,z);
   const spacing=3.25,start=bottom+1.25;
   for(let y=start+Math.max(0,Math.ceil((lo-start)/spacing))*spacing;y+2.15<hi+.01;y+=spacing){
    if(front)for(const xx of(w>3?[-w*.27,w*.27]:[0])){if(gunLane!==null&&Math.abs(x+xx-gunLane)<1.18)continue;lancet(shell,x+xx,y,z-d*.5-.025,Math.PI,w>3?.55:Math.min(.6,w*.42),2.30,p,(seed+Math.round(y/spacing)+Math.round(xx*4))%7===0);}
    else for(const dz of[-d*.28,d*.28])lancet(shell,x+Math.sign(x)*(w*.5+.025),y,z+dz,Math.sign(x)*Math.PI/2,.54,2.3,p,(seed+Math.round(y/spacing))%7===0);
   }
  }
  cornice(shellAt(top),x,top,z,w+.10,d+.08,p);
 }
 // Main outward keep: a broad, offset solid mass with the dominant steep roof.
 wallVolume(.80,-17.94,6.30,1.12,deckY-4.1,mainCrown,2,true,3.1);
 steepRoof(shellAt(mainCrown),.8,mainCrown,-17.94,6.48,2.13,9.28,p);
 // A shorter square gate tower and a narrow rear needle establish hierarchy.
 const leftCrown=highest+(count>2?-4.3:3.2),rearCrown=highest+2.4;
 wallVolume(-4.70,-18.04,1.98,1.7,deckY-6.7,leftCrown,4);
 steepRoof(shellAt(leftCrown+7.9),-4.70,leftCrown,-18.04,2.32,2.13,6.5,p);
 // The two side wings end at different levels and are offset in plan.
 const leftWingTop=highest+(count>2?-1.5:5.0),rightWingTop=highest+2.5;
 wallVolume(-5.86,-11.98,.65,8.30,deckY-.3,leftWingTop,7,false);
 steepRoof(shellAt(leftWingTop+5.4),-5.86,leftWingTop,-11.98,.96,8.45,4.0,p);
 wallVolume(5.82,-9.48,.65,6.3,deckY-2.5,rightWingTop,3,false);
 steepRoof(shellAt(rightWingTop),5.82,rightWingTop,-9.48,.94,6.46,3.1,p);
 // Body-facing spine is solid but kept wholly behind the resident promenade.
 const rearTop=Math.max(highest+3,mainCrown-4);
 wallVolume(0,-6.10,3.50,1.15,deckY-2.5,rearTop,1,false);
 steepRoof(shellAt(rearTop),0,rearTop,-6.10,3.70,1.85,5.0,p);
 // Central support remains outside all four district footprints on every floor.
 for(let tier=0;tier<count;tier++){
  const y=deckY+tier*KAIJU_FLOOR_SPACING,hi=tier===count-1?highest+2.4:y+KAIJU_FLOOR_SPACING,s=shells[tier];
  box(s,2.7,hi-y,3,p.wall,0,(y+hi)/2,KAIJU_CENTER.z);
  for(const side of[-1,1]){box(s,.14,hi-y,.20,p.trim,side*1.28,(y+hi)/2,KAIJU_CENTER.z-1.5);lancet(s,side*.65,y+1,KAIJU_CENTER.z-1.53,Math.PI,.37,2.15,p,tier%4===1);}
 }
 // Two deliberately unequal outboard needle shafts, not four repeated columns.
 for(const [i,t]of [[5.45,-17.98,.69,highest+5.3,5.8],[-5.65,-6.35,.53,rearCrown,4.3]].entries()){
  const [x,z,r,top,h]=t;
  for(let tier=0;tier<count;tier++){
   const bottom=tier?deckY+tier*KAIJU_FLOOR_SPACING:deckY-6.2,end=Math.min(top,tier===count-1?top:deckY+(tier+1)*KAIJU_FLOOR_SPACING);
   if(end>bottom)towerSegment(shells[tier],x,z,r,bottom,end,p,i+tier);
  }
  roof(shellAt(top),x,top,z,r*1.2,h,p);
 }
 // Only two gallery crossings mark important levels in the grown fortress.
 const bridges=count>2?[1,3]:[0];
 for(const tier of bridges){const y=deckY+tier*KAIJU_FLOOR_SPACING,s=shells[tier];bridge(s,-4.7,-2.25,-18.04,y,p);pointedArch(s,[-4.7,-18.04],[-2.25,-18.04],y-4.2,3.7,p,.19);}
 // A hanging turret on the short wing echoes the reference's supported annex.
 const annexY=highest+(count>2?-8.4:-2.5),annex=shellAt(annexY+7.1);
 towerSegment(annex,-5.70,-6.4,.60,annexY-4.1,annexY+1.8,p,4);roof(annex,-5.70,annexY+1.8,-6.4,.78,3.5,p);
 pointedArch(annex,[-5.70,-6.4],[-1.8,-6.4],annexY-1.4,2.3,p,.18);
 const base=floors[0];
 box(base,8.9,3.3,8.9,p.wall,0,deckY-2.16,KAIJU_CENTER.z);box(base,7.4,1.7,7.8,p.wall,0,deckY-4.62,KAIJU_CENTER.z);
 for(const x of[-3.6,3.6]){
  box(base,.48,5.5,8.7,p.edge,x,deckY-3.6,KAIJU_CENTER.z);beam(base,[x,deckY-5.9,-8],[x,deckY-.6,-6.75],.22,p.metal);
  for(const z of[-16.2,-7.8])cone(base,.46,3.5,p.roof,x,deckY-7.1,z,8).rotation.z=Math.PI;
 }
 for(const x of[-2.8,0,2.8])lancet(base,x,deckY-3.3,-16.49,Math.PI,.52,2.3,p,x===0);
 // Long banners accent the larger masonry masses, without marking every floor.
 for(const tier of new Set([count>2?1:0,count-1])){
  const s=shells[tier],y=deckY+tier*KAIJU_FLOOR_SPACING+1.4;
  box(s,.72,3.8,.06,M('fabric',enemy?0x814846:0x5d3043),.8,y+1.9,-18.56);box(s,.92,.085,.18,p.metal,.8,y+3.85,-18.56);
 }
 for(const shell of shells)batchStatic(shell);for(const g of floors)batchStatic(g);
 Object.assign(group.userData,{rings:stage,deckY,floorCount:count,surfaceLevels:kaijuWalkFloors(stage).map(f=>deckY+f.y+f.surfaceOffset),buildableSlots:RING_SLOTS.slice(0,stage+1).flat().length,towerTop:totalTop,footprint:{width:13.02,depth:15.12}});
 return group;
}
