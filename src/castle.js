import * as T from '../vendor/three.module.js';
import {getMaterial,box,cylinder,cone,beam,batchStatic} from './materials.js';
import {KAIJU_DECK_Y,KAIJU_CENTER,KAIJU_FLOOR_SPACING,KAIJU_FLOOR_SLOTS,kaijuFloorCount,kaijuTowerTop,kaijuWalkFloors,RING_SLOTS} from './city-layout.js';
import {castleMassing,castleWallBoxes,castleWallWindows,castleStructuralDetails,lancetOutline,lancetDetails,towerWindows,towerCornerStrips,castleFloorDetails,steepRoofShape,steepRoofSeams,spireSeams} from './castle-collision.js';
export {kaijuSlotPosition} from './city-layout.js';
const M=(kind,color)=>getMaterial(kind,color);
function mesh(group,geometry,material,x=0,y=0,z=0){const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
function pointedShape(w,h){const s=new T.Shape(),points=lancetOutline(w,h);s.moveTo(...points[0]);for(const q of points.slice(1))s.lineTo(...q);s.closePath();return s;}
function lancet(group,x,y,z,rotation,w,h,p,lit=false){
 const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;group.add(g);
 mesh(g,new T.ExtrudeGeometry(pointedShape(w+.16,h+.12),{depth:.045,bevelEnabled:false,curveSegments:4}),p.trim);
 const pane=mesh(g,new T.ExtrudeGeometry(pointedShape(w,h),{depth:.02,bevelEnabled:false,curveSegments:4}),lit?p.light:p.glass,0,.035,.046);pane.castShadow=false;
 for(const b of lancetDetails(w,h))box(g,b.w,b.h,b.d,p[b.material],b.x,b.y,b.z);
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
 for(const seam of spireSeams(x,y,z,r,h))beam(group,seam.a,seam.b,seam.r,p.metal);
 cylinder(group,.025,.075,1.15,p.metal,x,y+h+.64,z,7);cone(group,.10,.62,p.metal,x,y+h+1.42,z,6);
}
function towerSegment(group,x,z,r,bottom,top,p,seed,windows=true){
 const h=top-bottom;cylinder(group,r,r*1.07,h,p.wall,x,bottom+h/2,z,8);
 cornice(group,x,bottom+.14,z,r*1.9,r*1.9,p);
 for(const b of towerCornerStrips(x,z,r,bottom,top))box(group,b.w,b.h,b.d,p.trim,b.x,b.y,b.z);
 if(windows)for(const q of towerWindows(x,z,r,bottom,top))lancet(group,q.x,q.y,q.z,q.rotation,q.w,q.h,p,(seed+q.row*3+q.face)%7===1);
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
 for(const b of castleFloorDetails(y))box(group,b.w,b.h,b.d,p[b.material],b.x,b.y,b.z);
 // The structural ribs are below the floors, outside all district interiors.
 for(const side of[-1,1])for(const zz of[-3.4,3.4]){
  beam(group,[side*5.28,y-.65,z+zz],[side*4.84,y-2.0,z+zz],.14,p.wall);
  beam(group,[side*4.84,y-2.0,z+zz],[side*5.18,y-2.0,z+zz],.11,p.trim);
 }
 // Face of each thick inhabited cornice: small sparse warm lancets.
 for(const x of[-3.65,-2.55,2.55,3.65])lancet(group,x,y-1.36,z-5.08,Math.PI,.23,.70,p,(tier+Math.round(x*4))%5===0);
}

function steepRoof(group,x,y,z,w,d,h,p){
 const {vertices:v,faces}=steepRoofShape({w,d,h}),pos=[],uv=[];
 for(const f of faces)for(const i of f){pos.push(...v[i]);uv.push(v[i][0]/w+.5,v[i][1]/h);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();mesh(group,geometry,p.roof,x,y,z);
 cornice(group,x,y,z,w,d,p);
 for(const seam of steepRoofSeams({x,y,z,w,d,h}))beam(group,seam.a,seam.b,seam.r,p.metal);
 for(const side of[-1,1]){cylinder(group,.026,.065,1.04,p.metal,x,y+h+.50,z+side*d*.2,7);cone(group,.085,.45,p.metal,x,y+h+1.12,z+side*d*.2,6);}
}

/** The playable wards remain stacked inside unequal exterior castle volumes. */
export function createCastleBackpack(deckY=KAIJU_DECK_Y,enemy=false,rings=1){
 const massing=castleMassing(rings,deckY),{stage,count,highest,totalTop,mainCrown,leftCrown,rearCrown,leftWingTop,rightWingTop,rearTop}=massing;
 const group=new T.Group();group.name='Clustered Gothic castle backpack';
 const p={wall:M('stone',enemy?0x737984:0x848b8e),trim:M('plaster',0xb7ad9c),edge:M('stone',0x9b9d9d),roof:M('roof',0x945442),metal:M('metal',0x706967),dark:M('metal',0x343641),paving:M('pavement',0x868781),walk:M('pavement',0xaaa391),light:M('window',0xc1c9bb),glass:M('glass',0x68828e)};
 const floors=[],shells=[];
 for(let tier=0;tier<count;tier++){
  const g=new T.Group();g.name=`Castle floor ${tier+1}`;Object.assign(g.userData,{towerTier:tier,tier,noBatch:true});group.add(g);floors.push(g);floor(g,tier,deckY,p);
  const shell=new T.Group();shell.name=`Exterior shell ${tier+1}`;Object.assign(shell.userData,{inspectionShell:true,towerTier:tier,noBatch:true});g.add(shell);shells.push(shell);
 }
 // Every exterior piece is clipped at floor boundaries for reversible inspection.
 const shellAt=y=>shells[Math.max(0,Math.min(count-1,Math.floor((y-deckY)/KAIJU_FLOOR_SPACING)))];
 function wallVolume(x,z,w,d,bottom,top,seed,front=true,gunLane=null,id='wall'){
  for(let tier=0;tier<count;tier++){
   const lo=Math.max(bottom,tier?deckY+tier*KAIJU_FLOOR_SPACING:bottom),hi=Math.min(top,tier===count-1?top:deckY+(tier+1)*KAIJU_FLOOR_SPACING);if(hi<=lo)continue;
   const shell=shells[tier],h=hi-lo;
   const descriptor={id,x,z,w,d,bottom,top,gunLane,front,seed};
   for(const b of castleWallBoxes(descriptor,tier,count,deckY))box(shell,b.w,b.h,b.d,b.trim==='edge'?p.edge:b.trim?p.trim:p.wall,b.x,b.y,b.z);
   for(const q of castleWallWindows(descriptor,tier,count,deckY))lancet(shell,q.x,q.y,q.z,q.rotation,q.w,q.h,p,q.lit);
  }
  cornice(shellAt(top),x,top,z,w+.10,d+.08,p);
 }
 // Main outward keep: a broad, offset solid mass with the dominant steep roof.
 for(const w of massing.walls)wallVolume(w.x,w.z,w.w,w.d,w.bottom,w.top,w.seed,w.front,w.gunLane??null,w.id);
 for(const r of massing.roofs)steepRoof(shellAt(r.y+r.h+1.4),r.x,r.y,r.z,r.w,r.d,r.h,p);
 for(const f of castleStructuralDetails(massing,deckY)){
  const s=shells[f.tier],material=p[f.material];
  if(f.box){const b=f.box;box(s,b.w,b.h,b.d,material,b.x,b.y,b.z);}
  else if(f.beam)beam(s,f.beam.a,f.beam.b,f.beam.r,material);
  else {const position=[],uv=[];for(const face of f.faces)for(const i of face){const v=f.vertices[i];position.push(...v);uv.push(v[0],v[1]);}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();mesh(s,geometry,material);}
 }
 // A shorter square gate tower and a narrow rear needle establish hierarchy.
 // The two side wings end at different levels and are offset in plan.
 // Body-facing spine is solid but kept wholly behind the resident promenade.
 // Central support remains outside all four district footprints on every floor.
 for(let tier=0;tier<count;tier++){
  const y=deckY+tier*KAIJU_FLOOR_SPACING,hi=tier===count-1?highest+2.4:y+KAIJU_FLOOR_SPACING,s=shells[tier];
  box(s,2.7,hi-y,3,p.wall,0,(y+hi)/2,KAIJU_CENTER.z);
  for(const side of[-1,1]){box(s,.14,hi-y,.20,p.trim,side*1.28,(y+hi)/2,KAIJU_CENTER.z-1.5);lancet(s,side*.65,y+1,KAIJU_CENTER.z-1.53,Math.PI,.37,2.15,p,tier%4===1);}
 }
 // Two deliberately unequal outboard needle shafts, not four repeated columns.
 for(const [i,t]of massing.shafts.entries()){
  const {x,z,r,top,h}=t;
  for(let tier=0;tier<count;tier++){
   const bottom=Math.max(t.bottom,tier?deckY+tier*KAIJU_FLOOR_SPACING:t.bottom),end=Math.min(top,tier===count-1?top:deckY+(tier+1)*KAIJU_FLOOR_SPACING);
   if(end>bottom)towerSegment(shells[tier],x,z,r,bottom,end,p,i+tier);
  }
  roof(shellAt(top),x,top,z,r*1.2,h,p);
 }
 const needleBase=massing.shafts[0].bottom;
 box(shellAt(needleBase),1.6,.4,.42,p.wall,4.7,needleBase-.2,-17.98);
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
