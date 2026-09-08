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

/** A vertically stacked keep. Expansion adds upper floors, never circular land. */
export function createCastleBackpack(deckY=KAIJU_DECK_Y,enemy=false,rings=1){
 const stage=Math.max(0,Math.min(2,Math.floor(rings))),count=kaijuFloorCount(stage),highest=deckY+(count-1)*KAIJU_FLOOR_SPACING;
 const totalTop=kaijuTowerTop(stage)+(deckY-KAIJU_DECK_Y),coreTop=totalTop-11.3;
 const group=new T.Group();group.name='Vertical Gothic castle backpack';
 const p={wall:M('stone',enemy?0x666873:0x747779),trim:M('stone',0xada79a),edge:M('stone',0x827e76),roof:M('roof',0x503842),metal:M('metal',0x706967),dark:M('metal',0x343641),paving:M('pavement',0x868781),walk:M('pavement',0xaaa391),light:M('window',0xc1c9bb),glass:M('glass',0x68828e)};
 const floors=[];
 for(let tier=0;tier<count;tier++){
  const g=new T.Group();g.name=`Castle floor ${tier+1}`;g.userData.towerTier=tier;g.userData.tier=tier;g.userData.noBatch=true;group.add(g);floors.push(g);floor(g,tier,deckY,p);
  const bottom=deckY+tier*KAIJU_FLOOR_SPACING,top=tier===count-1?coreTop:bottom+KAIJU_FLOOR_SPACING;
  // A solid central spine and tall body-facing wall give the castle weight.
  box(g,2.7,top-bottom,3.0,p.wall,0,(bottom+top)/2,KAIJU_CENTER.z);
  box(g,3.5,top-bottom,1.15,p.wall,0,(bottom+top)/2,-6.10);
  for(const x of[-1.28,1.28])box(g,.15,top-bottom,.21,p.trim,x,(bottom+top)/2,KAIJU_CENTER.z-1.49);
  for(const x of[-1.65,1.65])box(g,.19,top-bottom,1.35,p.edge,x,(bottom+top)/2,-6.10);
  for(let y=bottom+1.1;y<top-2;y+=3.6){
   for(const x of[-.65,.65])lancet(g,x,y,KAIJU_CENTER.z-1.52,Math.PI,.38,2.1,p,(tier+Math.round(y)+Math.round(x*8))%7===0);
   for(const side of[-1,1])lancet(g,side*1.36,y,KAIJU_CENTER.z,side*Math.PI/2,.58,2.3,p,(tier+Math.round(y)+side)%6===1);
  }
  cornice(g,0,bottom+.24,KAIJU_CENTER.z,2.7,3,p);
  // Unequal inhabited side wings carry the stack as a clustered fortress.
  // Their inner faces stay beyond the outer pedestrian rail and district bays.
  for(const side of[-1,1]){
   const x=side*5.69,z=KAIJU_CENTER.z+(side<0?1.45:-1.15),d=side<0?5.9:6.6;
   const wingTop=highest+(side<0?6.0:3.2),end=Math.min(tier===count-1?wingTop:top,wingTop),h=end-bottom;
   if(h>0){
    box(g,.55,h,d,p.wall,x,bottom+h/2,z);cornice(g,x,bottom+.20,z,.57,d,p);
    for(const dz of[-d/2+.18,0,d/2-.18])box(g,.20,h,.27,p.edge,x+side*.33,bottom+h/2,z+dz);
    for(let yy=bottom+1.1;yy<end-1.9;yy+=3.5)for(const dz of[-d*.28,d*.28])lancet(g,x+side*.29,yy,z+dz,side*Math.PI/2,.52,2.2,p,(tier+side+Math.round(dz*3))%6===0);
    if(tier===count-1){
     cornice(g,x,end,z,.67,d+.1,p);
     // Narrow steep-roofed pinnacles interrupt the horizontal floor rhythm.
     for(const dz of[-d*.32,d*.32])roof(g,x,end,z+dz,.48,side<0?4.6:3.7,p);
    }
   }
  }
  // Partial outward masonry faces leave a wide central view into the wards.
  // They sit outside the walking loop; the gallery links the solid towers.
  for(const [side,w,h]of[[-1,1.9,6.0],[1,1.55,4.65]]){
   const x=side*2.88,z=KAIJU_CENTER.z-5.68,hh=Math.min(h,top-bottom-.45);
   if(hh<1.4)continue;
   box(g,w,hh,.42,p.wall,x,bottom+hh*.5,z);cornice(g,x,bottom+hh,z,w,.47,p);
   for(const xx of[-w*.43,w*.43])box(g,.15,hh,.58,p.edge,x+xx,bottom+hh*.5,z);
   lancet(g,x,bottom+.85,z-.22,Math.PI,.64,Math.min(2.7,hh-1.2),p,(tier+side)%4===0);
  }
  // Four asymmetrical towers grow with the same stack; their shafts remain
  // outside the balcony circulation, supporting bridges and steep crowns.
  for(const [i,t]of [[-4.7,-18.1,.77],[4.7,-18.1,.88],[-5.65,-6.35,.57],[5.65,-6.35,.64]].entries()){
   const towerTop=highest+(i===1?4.3:i===0?3.8:i===3?6.0:4.9);
   const a=tier===0?deckY-6.7:bottom,b=Math.min(top,towerTop);
   if(b>a)towerSegment(g,t[0],t[1],t[2],a,b,p,i+tier);
   if(tier===count-1){
    if(b<towerTop)towerSegment(g,t[0],t[1],t[2],b,towerTop,p,i+tier);
    roof(g,t[0],towerTop,t[1],t[2]*1.23,i===1?5.8:i===3?4.3:5.2,p);
   }
  }
  // Front bridge links read as a fortress gallery rather than stacked trays.
  if(tier===0||tier===count-1||tier===2){
   bridge(g,-4.7,4.7,-18.1,bottom,p);
   for(const x of[-4.7,4.7])box(g,.8,.32,1.4,p.wall,x,bottom-.13,-17.4);
  }
 }
 const base=floors[0],cap=floors.at(-1);
 // Tapered masonry below the lower ward and deep buttress roots carry its load.
 box(base,8.9,3.3,8.9,p.wall,0,deckY-2.16,KAIJU_CENTER.z);
 box(base,7.4,1.7,7.8,p.wall,0,deckY-4.62,KAIJU_CENTER.z);
 for(const x of[-3.6,3.6]){
  box(base,.48,5.5,8.7,p.edge,x,deckY-3.6,KAIJU_CENTER.z);
  beam(base,[x,deckY-5.9,-8],[x,deckY-.6,-6.75],.22,p.metal);
  for(const z of[-16.2,-7.8])cone(base,.46,3.5,p.roof,x,deckY-7.1,z,8).rotation.z=Math.PI;
 }
 for(const x of[-2.8,0,2.8])lancet(base,x,deckY-3.3,-16.49,Math.PI,.52,2.3,p,x===0);
 // The principal clustered keep has a much steeper, taller roof than a town.
 cornice(cap,0,coreTop,KAIJU_CENTER.z,2.9,3.15,p);
 roof(cap,0,coreTop,KAIJU_CENTER.z,1.35,9.55,p);
 const rearRoofY=Math.max(highest+3,Math.min(coreTop-3,highest+8.8));
 if(rearRoofY>coreTop)box(cap,3.5,rearRoofY-coreTop,1.15,p.wall,0,(rearRoofY+coreTop)/2,-6.1);
 roof(cap,0,rearRoofY,-6.1,1.78,5.6,p);
 for(const side of[-1,1]){
  const y=coreTop-3.7;
  towerSegment(cap,side*1.75,KAIJU_CENTER.z,.31,y-3.1,y+.2,p,side,false);roof(cap,side*1.75,y+.2,KAIJU_CENTER.z,.42,3.8,p);
  // Flying stone ribs stand behind the wards and tie the outboard turrets in.
  pointedArch(cap,[side*1.8,-6.1],[side*5.65,-6.35],highest+1.3,3.4,p,.17);
 }
 // Banners, dormer openings and ridge caps break up the large masonry planes.
 for(let tier=0;tier<count;tier++){
  const y=deckY+tier*KAIJU_FLOOR_SPACING,g=floors[tier];
  for(const side of[-1,1]){
   const banner=box(g,.46,2.7,.055,M('fabric',enemy?0x814846:0x5d3043),side*1.02,y+2.0,KAIJU_CENTER.z-1.61);
   box(g,.50,.065,.16,p.metal,banner.position.x,y+3.38,banner.position.z);
  }
 }
 for(const g of floors)batchStatic(g);
 group.userData.rings=stage;group.userData.deckY=deckY;group.userData.floorCount=count;group.userData.surfaceLevels=kaijuWalkFloors(stage).map(f=>deckY+f.y+f.surfaceOffset);group.userData.buildableSlots=RING_SLOTS.slice(0,stage+1).flat().length;group.userData.towerTop=totalTop;group.userData.footprint={width:13.02,depth:15.12};
 return group;
}
