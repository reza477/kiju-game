import * as T from '../vendor/three.module.js';
import { FACTIONS, distance } from './simulation.js';

const palette={stone:0x767d76,edge:0xb9ac90,roof:0x3c5453,wood:0x79624a,gold:0xd3ad68,red:0x974943,green:0x718257,blue:0x6a999d};
const materialCache=new Map();
function mat(color){if(!materialCache.has(color))materialCache.set(color,new T.MeshStandardMaterial({color,roughness:1,flatShading:true}));return materialCache.get(color);}
function mesh(g,geo,color,x=0,y=0,z=0){const o=new T.Mesh(geo,mat(color));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
const box=(g,w,h,d,c,x=0,y=0,z=0)=>mesh(g,new T.BoxGeometry(w,h,d),c,x,y,z);
const cyl=(g,r1,r2,h,c,x=0,y=0,z=0,n=8)=>mesh(g,new T.CylinderGeometry(r1,r2,h,n),c,x,y,z);
const orb=(g,r,c,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const o=mesh(g,new T.IcosahedronGeometry(r,1),c,x,y,z);o.scale.set(sx,sy,sz);return o;};
const cone=(g,r,h,c,x=0,y=0,z=0,n=6)=>cyl(g,0,r,h,c,x,y,z,n);
function beam(g,a,b,r,c){const dir=new T.Vector3(...b).sub(new T.Vector3(...a));const o=cyl(g,r,r,dir.length(),c,...a,6);o.position.addScaledVector(dir,.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;}
export function slotPosition(i){return {x:(i%5-2)*3.05,z:(Math.floor(i/5)-1.5)*3.7};}
function windows(g,w,h,d,y,c=0xe5bb70){for(let ix=-1;ix<=1;ix+=2)for(let iy=1;iy<=2;iy++)box(g,.28,.48,.05,c,ix*w*.29,y-h*.4+iy*h*.26,d/2+.025);}
function spire(g,x,z,h=5,r=.7){cyl(g,r,r*1.12,h,palette.stone,x,h/2,z,6);cone(g,r*1.35,h*.6,palette.roof,x,h*1.3,z);cyl(g,.045,.065,1,palette.gold,x,h*1.6+.4,z,5);}
function dome(g,r,c,x,y,z){const o=mesh(g,new T.SphereGeometry(r,12,6,0,Math.PI*2,0,Math.PI/2),c,x,y,z);return o;}
function building(type,level,faction){const g=new T.Group();const stone=faction==='crawler'?0x9e7862:faction==='airship'?0xc6b897:palette.stone;const roof=faction==='airship'?0x76a8a6:palette.roof;const h=1.9+(level-1)*.8;
 box(g,2.65,.25,2.9,palette.edge,0,.12,0);
 if(type==='keep'){
   box(g,2.6,4,2.7,stone,0,2,0);windows(g,2.6,4,2.7,2);box(g,2.85,.28,2.9,palette.edge,0,3.7,0);
   if(faction==='kaiju'){for(const x of [-1.2,1.2])spire(g,x,-.7,7+level,.47);cone(g,1.75,4,roof,0,6,0,4);box(g,.5,1.8,.15,0xc5b98d,0,3.1,1.4);}
   else if(faction==='crawler'){box(g,1.35,4.2,1.3,stone,0,5.6,0);box(g,1.65,.3,1.65,palette.edge,0,7.4,0);cone(g,1.15,2.5,roof,0,8.8,0,4);const clock=cyl(g,.43,.43,.08,0xf0dab0,0,6.55,.68,12);clock.rotation.x=Math.PI/2;box(g,.055,.37,.04,0x393e3a,0,6.62,.74);box(g,.30,.055,.04,0x393e3a,.13,6.55,.74);}
   else {cyl(g,1.4,1.4,.5,palette.gold,0,4.25,0,12);dome(g,1.65,roof,0,4.5,0);cyl(g,.045,.055,1.5,palette.gold,0,6.6,0);for(const x of [-1.35,1.35]){cyl(g,.28,.4,6,stone,x,3,-1);dome(g,.5,palette.gold,x,6,-1);}}
 }else if(type==='farm'){
   box(g,2.4,.4,2.6,0x65513d,0,.4,0);for(let z=-.85;z<=.9;z+=.55){box(g,2.2,.25,.27,0x70834d,0,.73,z);for(let x=-.8;x<=.9;x+=.55)cone(g,.15,.5,0xa5a76d,x,1.05,z,4);}for(let x of [-1.25,1.25])box(g,.13,1.2,.13,palette.wood,x,.85,1.25);
 }else if(type==='cannon'){
   cyl(g,1.13,1.23,.7,stone,0,.6,0);orb(g,.85,0x53645f,0,1.2,0,1,.7,1);const gun=cyl(g,.24,.34,2.7,0x394543,0,1.65,1.05);gun.rotation.x=Math.PI/2-.2;box(g,1.5,.15,.7,palette.gold,0,.99,-.9);
 }else if(type==='armor'){
   box(g,2.55,2.5,2.4,0x657471,0,1.35,0);for(let x=-.95;x<=1;x+=.65)box(g,.36,.7,2.6,palette.edge,x,2.9,0);box(g,1.2,1.2,.16,palette.gold,0,1.5,1.28);
 }else if(type==='sawmill'){
   box(g,2.25,h,2.4,stone,0,h/2+.2,0);const r=cone(g,1.9,1.2,roof,0,h+.8,0,4);r.rotation.y=Math.PI/4;for(let x=-.8;x<1;x+=.65){const log=cyl(g,.26,.26,2.6,palette.wood,x,.62,1.25);log.rotation.x=Math.PI/2;}const wheel=cyl(g,.8,.8,.15,palette.edge,1.2,1.65,.1,10);wheel.rotation.z=Math.PI/2;
 }else if(type==='foundry'){
   box(g,2.4,h,2.5,stone,0,h/2+.2,0);for(const x of [-.65,.65]){cyl(g,.28,.4,h+2.3,0x5b6661,x,(h+2.3)/2,.45);cyl(g,.42,.42,.3,palette.edge,x,h+2.3,.45);}box(g,1,1,.06,0xe69f59,0,.9,1.28);
 }else{
   box(g,2.25,h,2.45,stone,0,h/2+.2,0);windows(g,2.25,h,2.45,h/2+.2);
   if(faction==='airship'){dome(g,1.3,roof,0,h+.2,0);cyl(g,.045,.06,.7,palette.gold,0,h+1.75,0);}
   else{const r=cone(g,1.85,faction==='kaiju'?2:1.1,roof,0,h+(faction==='kaiju'?1.2:.75),0,4);r.rotation.y=Math.PI/4;if(faction==='kaiju')spire(g,1,-.7,h+1,.27);else box(g,.35,1.4,.4,stone,.65,h+1.3,-.5);}
 }return g;
}

export function makeCity(faction,enemy=false){const root=new T.Group();const rig=new T.Group();root.add(rig);const deckY=faction==='airship'?18:faction==='crawler'?10:15;const limbs=[],spinners=[];const dark=enemy?0x615c57:0x405c54;
 if(faction==='kaiju'){
   orb(rig,1,dark,0,8.4,0,5.5,7,6.8);orb(rig,1,0x68766c,0,11.1,5.1,3.8,3.9,4.2);orb(rig,1,dark,0,11.6,8,2.5,2.1,2.5);orb(rig,1,0x788273,0,10.6,9.5,2,1,1.3);
   for(const side of [-1,1]){
     orb(rig,1,0xdab77c,side*1.95,12.1,9.3,.33,.23,.22);cone(rig,.65,2.5,0xb7b7a0,side*2.5,14,6.5,5).rotation.z=-side*.4;
     const leg=new T.Group();leg.position.set(side*3,5.2,-2.4);rig.add(leg);orb(leg,1,dark,0,-1.5,0,2.35,3.5,2.65);orb(leg,1,0x485853,0,-4,1.7,2.35,1.25,3.3);for(let i=-1;i<=1;i++)cone(leg,.35,1.3,0xacaa8f,i*.8,-4.2,4.1,4).rotation.x=Math.PI/2;limbs.push({obj:leg,phase:side===1?0:Math.PI,leg:true});
     const arm=new T.Group();arm.position.set(side*5.1,10,3.4);rig.add(arm);orb(arm,1,dark,side*.8,-2,1.2,2,3.8,2.1);orb(arm,1,0x485853,side*1.3,-5,3.1,2.25,2.3,2.3);for(let i=0;i<3;i++)orb(arm,.8,0x788272,side*.2+i*.6,-5.65,4.7,.6,1,1);limbs.push({obj:arm,phase:side===1?Math.PI:0,leg:false});
     beam(rig,[side*4,9,-4],[side*7.3,15,-5],.26,palette.edge);beam(rig,[side*4,10,4],[side*7.3,15,5],.26,palette.edge);
   }
   const tail=cone(rig,2.6,13,dark,0,3.5,-10,7);tail.rotation.x=-1.15;for(let i=0;i<5;i++)cone(rig,.8,2.7,0x9aab9a,0,7-i*.55,-5-i*1.6,4).rotation.x=-.4;
   for(const z of [-5,4]){const strap=new T.Mesh(new T.TorusGeometry(5.4,.25,4,16,Math.PI*1.5),mat(0x3c4140));strap.position.set(0,9,z);rig.add(strap);}
 }else if(faction==='crawler'){
   box(rig,17,4,22,0x4b5958,0,4.1,0);box(rig,14,2,19,0x6b7370,0,6.6,-.5);box(rig,20,.55,23,palette.edge,0,6.4,0);
   // The lower borough is a terraced brick city built into the engine's hull.
   box(rig,18.3,1.5,20.5,0x8b6b55,0,7.4,0);box(rig,18.7,.25,21,palette.edge,0,8.2,0);
   for(const side of [-1,1])for(let z=-8;z<=8;z+=2.8){
     box(rig,1.4,2.5,2.3,0x9a725a,side*8.7,7.8,z);box(rig,1.7,.15,2.55,palette.edge,side*8.7,9.1,z);
     for(const zz of [-.6,.6])box(rig,.06,.6,.34,0xc4b080,side*9.43,8,z+zz);
   }
   for(let x=-6.5;x<=6.6;x+=2.2){box(rig,1.8,2.3,1.5,0x967058,x,7.65,9.5);box(rig,2,.15,1.8,palette.edge,x,8.9,9.5);for(const xx of [-.45,.45])box(rig,.32,.6,.07,0xcdba8a,x+xx,7.9,10.28);}
   for(const side of [-1,1]){box(rig,3,3.8,23,0x323b3b,side*8.3,2.6,0);for(let z=-9;z<=9;z+=3){const wheel=cyl(rig,1.65,1.65,3.15,0x6d7267,side*8.3,2.65,z,12);wheel.rotation.z=Math.PI/2;spinners.push(wheel);const hub=cyl(rig,.65,.65,.16,palette.gold,side*9.92,2.65,z,8);hub.rotation.z=Math.PI/2;}for(let z=-10;z<=10;z+=1.3)box(rig,3.3,.22,.6,0x829089,side*8.3,4.55,z);}
   for(const side of [-1,1]){const gun=cyl(rig,.5,.64,5,0x343e3e,side*5,6.1,12.6);gun.rotation.x=Math.PI/2;box(rig,1.4,1.4,2,palette.gold,side*5,6,10.3);}
   box(rig,13,1.5,2,0x757d71,0,2.7,12);for(let x=-6;x<=6;x+=1.5)cone(rig,.6,2.1,0x343d3c,x,2.7,13,4).rotation.x=Math.PI/2;
   for(const x of [-7.5,7.5])for(const z of [-7,-4]){cyl(rig,.45,.65,10,0x665a4d,x,11,z);cyl(rig,.7,.7,.5,palette.edge,x,15.9,z);}
 }else{
   orb(rig,1,0x665645,0,15,0,9,2.8,11);box(rig,16,.7,18,palette.gold,0,17,0);
   for(const side of [-1,1])for(const z of [-6,5]){
     // Long horizontal lift envelopes sit beside the deck, keeping the city visible.
     orb(rig,1,0xc5b98b,side*13,19,z,3.05,3.2,7.4);for(let k=-1;k<=1;k++){const ring=new T.Mesh(new T.TorusGeometry(3.04,.14,4,12),mat(palette.gold));ring.position.set(side*13,19,z+k*3.6);rig.add(ring);}
     beam(rig,[side*6.5,16,z],[side*12.8,17,z],.2,palette.gold);beam(rig,[side*7,18,z],[side*12,20,z],.13,palette.wood);
     const fin=box(rig,5,.16,2,0x6f9a97,side*13,19,z-6.8);fin.rotation.z=side*.05;
   }
   for(const side of [-1,1]){const prop=new T.Group();prop.position.set(side*9,15,-10);rig.add(prop);box(prop,.3,5,.2,0xa4966c);box(prop,5,.3,.2,0xa4966c);cyl(prop,.45,.45,.8,palette.gold).rotation.x=Math.PI/2;spinners.push(prop);}
   for(let z=-6;z<=6;z+=4)beam(rig,[-7,17,z],[7,17,z],.15,palette.gold);
 }
 box(rig,16.6,.85,17,palette.wood,0,deckY-.6,0);box(rig,16.9,.18,17.3,palette.edge,0,deckY-.08,0);
 // An uninterrupted cross street keeps the miniature town legible.
 box(rig,.45,.05,16.5,0xc9bd9f,0,deckY+.03,0);box(rig,16.5,.05,.42,0xc9bd9f,0,deckY+.03,0);
 for(const side of [-1,1]){box(rig,.25,.8,17,palette.edge,side*8.3,deckY+.45,0);box(rig,16.7,.8,.25,palette.edge,0,deckY+.45,side*8.5);for(let z=-8;z<9;z+=2)box(rig,.6,.5,.7,palette.edge,side*8.3,deckY+1,z);}
 if(faction==='kaiju'){
   for(const x of [-8.2,8.2])for(const z of [-8.3,8.3]){cyl(rig,.68,.85,2.8,palette.stone,x,deckY+1.3,z,6);cone(rig,1.05,3.7,palette.roof,x,deckY+4.5,z,6);cyl(rig,.045,.045,.8,palette.gold,x,deckY+6.75,z,5);}
   for(const x of [-5.4,5.4]){box(rig,1.5,2.9,.08,0x773f42,x,deckY-.75,8.7);box(rig,.17,1.6,.1,palette.gold,x,deckY-.6,8.76);box(rig,.75,.14,.1,palette.gold,x,deckY-.35,8.76);}
   for(const side of [-1,1])for(const z of [-6,-2,2,6]){beam(rig,[side*6,deckY-3,z],[side*8.3,deckY-.5,z],.15,palette.edge);}
 }else if(faction==='airship'){
   for(const x of [-7.9,7.9])for(const z of [-8,8]){cyl(rig,.35,.55,3.8,0xbeb596,x,deckY+1.9,z,8);cyl(rig,.6,.6,.2,palette.gold,x,deckY+3.4,z,10);dome(rig,.6,0x75a7a4,x,deckY+3.8,z);cyl(rig,.04,.04,.9,palette.gold,x,deckY+4.8,z,5);}
 }
 const districts=new T.Group();districts.position.y=deckY;rig.add(districts);
 const slots=[];for(let i=0;i<20;i++){const p=slotPosition(i);const slot=box(rig,2.68,.06,3.13,0x6d7164,p.x,deckY+.06,p.z);slot.userData.slot=i;slots.push(slot);}
 const people=new T.Group();people.position.y=deckY+.15;rig.add(people);const citizens=[];
 for(let i=0;i<20;i++){const p=new T.Group();box(p,.19,.43,.19,i%3===0?0xb99461:0x596b65,0,.32,0);orb(p,.13,0xc6ad89,0,.66,0);people.add(p);citizens.push(p);}
 return {root,rig,deckY,limbs,spinners,districts,slots,citizens,faction,signature:'',enemy};
}
function updateDistricts(city,buildings){const sig=JSON.stringify(buildings.map(b=>b?[b.type,b.level,b.remaining>0]:null));if(sig===city.signature)return;city.signature=sig;
 for(const child of [...city.districts.children])disposeGroup(child);city.districts.clear();
 buildings.forEach((b,i)=>{city.slots[i].visible=!b;if(!b)return;const p=slotPosition(i);const g=building(b.type,b.level,city.faction);g.position.set(p.x,0,p.z);g.userData.slot=i;g.traverse(o=>{if(o.isMesh)o.userData.slot=i;});if(b.remaining>0){g.scale.y=.35;for(const x of [-1.3,1.3])for(const z of [-1.35,1.35])box(g,.1,12,.1,0xd9b97b,x,6,z);for(let y=3;y<=9;y+=3){box(g,2.8,.12,.12,palette.wood,0,y,1.35);box(g,.12,.12,2.8,palette.wood,1.3,y,0);}}city.districts.add(g);});
}
function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
function animateCity(city,time,moving){const walk=moving?Math.sin(time*4):Math.sin(time)*.12;city.rig.position.y=city.faction==='airship'?Math.sin(time*1.3)*.35:Math.abs(walk)*.2;city.limbs.forEach(({obj,phase,leg})=>obj.rotation.x=Math.sin(time*4+phase)*(moving?.2:.025)*(leg?1:1.5));city.spinners.forEach(s=>{if(city.faction==='airship')s.rotation.z=time*8;else if(moving)s.rotateY(.07);});
 city.citizens.forEach((p,i)=>{const v=time*(.35+i%4*.055)+i*1.7;const along=((v%1+1)%1);if(i%2===0)p.position.set(-7+along*14,.02,((i%4)-1.5)*3.7+1.65);else p.position.set((i%5-2)*3.05+1.36,.02,-7+along*14);p.rotation.y=i%2===0?Math.PI/2:0;p.position.y+=Math.abs(Math.sin(time*7+i))*.06;});
}
function random(seed){let v=seed;return()=>{v=(v*1664525+1013904223)>>>0;return v/4294967296;};}

export class GameScene{
 constructor(canvas,onSelect){this.canvas=canvas;this.onSelect=onSelect;this.scene=new T.Scene();this.scene.background=new T.Color(0xabb9a9);this.scene.fog=new T.FogExp2(0xabb9a9,.004);this.camera=new T.PerspectiveCamera(43,1,.2,1200);this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.3));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0xabb9a9);this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
 this.scene.add(new T.HemisphereLight(0xf7ecd5,0x4b635f,1.8));this.sun=new T.DirectionalLight(0xffe1aa,2.8);this.sun.position.set(-80,130,65);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-150;this.sun.shadow.camera.right=150;this.sun.shadow.camera.top=150;this.sun.shadow.camera.bottom=-150;this.sun.shadow.camera.far=400;this.sun.shadow.bias=-.001;this.scene.add(this.sun);this.scene.add(this.sun.target);
 this.world=new T.Group();this.scene.add(this.world);this.ground=mesh(this.world,new T.PlaneGeometry(1500,1500),0x8d9578);this.ground.rotation.x=-Math.PI/2;this.ground.receiveShadow=true;this.ground.userData.ground=true;
 this.props=new T.Group();this.world.add(this.props);this.pickables=[];this.labels=[];this.enemyCities=[];this.fx=[];this.lastEvent=0;this.view='city';this.yaw=.7;this.pitch=.47;this.zoom=73;this.focus=new T.Vector3();this.ray=new T.Raycaster();this.pointer=new T.Vector2();this.quality='balanced';
 this.makeTerrain();this.createSelection();this.resize();window.addEventListener('resize',()=>this.resize());this.addPointer();
 }
 makeTerrain(){const rand=random(735);for(let i=0;i<170;i++){const x=(rand()-.5)*670,z=(rand()-.5)*670;if(Math.abs(x)<165&&Math.abs(z)<165)continue;const hill=cone(this.props,18+rand()*35,15+rand()*55,i%2?0x778575:0x6c7e74,x,0,z,5);hill.rotation.y=rand()*5;}
 const geo=new T.PlaneGeometry(500,500,32,32);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;const cols=[];for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,-.15+Math.sin(x*.033)*Math.cos(z*.04)*.12);const c=new T.Color(i%7===0?0x9da185:i%3===0?0x8e9476:0x92997d);cols.push(c.r,c.g,c.b);}geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.computeVertexNormals();const terrain=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));terrain.receiveShadow=true;this.props.add(terrain);
 // A dry river curls through the old world.
 for(let i=-12;i<13;i++){const z=i*20,x=Math.sin(i*.3)*45+15;const patch=orb(this.props,1,0x748a86,x,-.35,z,13,.16,16);patch.receiveShadow=true;}
 for(let i=0;i<160;i++){const x=(rand()-.5)*360,z=(rand()-.5)*360;const r=.4+rand()*1.1;orb(this.props,r,0x798375,x,.2,z,1,.6,.7);if(i%7===0){box(this.props,2+rand()*3,1+rand()*4,2,0x7b8174,x,1,z);}}
 }
 createSelection(){this.selection=new T.Mesh(new T.RingGeometry(1.9,2,40),new T.MeshBasicMaterial({color:0xead091,side:T.DoubleSide,transparent:true,opacity:.95,depthTest:false}));this.selection.rotation.x=-Math.PI/2;this.selection.renderOrder=5;this.selection.visible=false;this.scene.add(this.selection);this.routeLine=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:0xefe0b4,dashSize:2,gapSize:1}));this.scene.add(this.routeLine);this.destination=new T.Mesh(new T.RingGeometry(2.5,2.8,40),new T.MeshBasicMaterial({color:0xffe4a5,side:T.DoubleSide}));this.destination.rotation.x=-Math.PI/2;this.destination.visible=false;this.scene.add(this.destination);}
 setGame(s){if(this.city){this.scene.remove(this.city.root);disposeGroup(this.city.root);}this.city=makeCity(s.faction);this.scene.add(this.city.root);this.state=s;updateDistricts(this.city,s.buildings);for(const c of this.enemyCities){this.scene.remove(c.root);disposeGroup(c.root);}this.enemyCities=[];for(const old of this.labels){this.scene.remove(old);disposeGroup(old);}this.labels=[];this.pickables=[];
 for(const n of s.nodes){const g=new T.Group();g.position.set(n.x,0,n.z);const rand=random(n.x*n.x+99);const ring=new T.Mesh(new T.RingGeometry(15.8,16,50),new T.MeshBasicMaterial({color:n.kind==='wood'?0xb0c799:n.kind==='iron'?0xc7aa84:0xddca82,side:T.DoubleSide,transparent:true,opacity:.55}));ring.rotation.x=-Math.PI/2;ring.position.y=.15;g.add(ring);
 if(n.kind==='wood'){for(let i=0;i<22;i++){const a=rand()*Math.PI*2,r=rand()*13;const x=Math.cos(a)*r,z=Math.sin(a)*r;const h=4+rand()*6;cyl(g,.23,.42,h,0x6c6750,x,h/2,z,5);cone(g,h*.4,h*.95,i%2?0x576f60:0x647c60,x,h*.78,z,5);}}
 else if(n.kind==='iron'){for(let i=0;i<13;i++){const x=(rand()-.5)*23,z=(rand()-.5)*20,h=2+rand()*7;const b=box(g,2+rand()*2,h,2+rand()*3,0x6c7873,x,h/2,z);b.rotation.z=(rand()-.5)*.15;box(g,1,h*.55,.08,0x394b49,x,h*.45,z+1.6);}for(let i=0;i<9;i++)orb(g,1.5,0xaaa08a,(rand()-.5)*20,.7,(rand()-.5)*20,1,.5,.7);}
 else{for(let i=0;i<9;i++){const p=box(g,20,.15,1.6,i%2?0xb7a064:0xc2b16c,0,.12,-10+i*2.5);p.rotation.y=.2;}cone(g,3,5,0x887859,-9,2,7,5);}
 const hit=new T.Mesh(new T.CylinderGeometry(17,17,1,20),new T.MeshBasicMaterial({visible:false}));hit.userData.node=n.id;g.add(hit);this.pickables.push(hit);this.scene.add(g);this.labels.push(g);}
 for(const e of s.enemies){const c=makeCity(e.faction,true);const sample=Array(20).fill(null);sample[7]={type:'keep',level:1,remaining:0};for(const i of [1,3,5,11,13,17])sample[i]={type:i===5?'cannon':'housing',level:1,remaining:0};updateDistricts(c,sample);c.root.position.set(e.x,0,e.z);c.root.rotation.y=-.8;c.root.userData.enemy=e.id;c.root.traverse(o=>{if(o.isMesh)o.userData.enemy=e.id;});this.scene.add(c.root);c.id=e.id;this.enemyCities.push(c);}
 this.lastMode=null;this.lastEvent=0;this.focus.set(s.x,13,s.z);
 }
 setView(view){this.view=view;this.zoom=view==='world'?215:73;this.pitch=view==='world'?.84:.47;}
 setQuality(q){this.quality=q;this.renderer.setPixelRatio(q==='retro'?.75:Math.min(devicePixelRatio,1.3));this.renderer.shadowMap.enabled=q!=='retro';this.resize();}
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 addPointer(){let down=null;this.canvas.addEventListener('contextmenu',e=>e.preventDefault());this.canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button,moved:false};this.canvas.setPointerCapture(e.pointerId);});this.canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down.moved=true;if(down.moved){this.yaw-=dx*.006;this.pitch=Math.max(.18,Math.min(1.25,this.pitch+dy*.004));}down.lastX=e.clientX;down.lastY=e.clientY;});this.canvas.addEventListener('pointerup',e=>{if(down&&!down.moved)this.pick(e.clientX,e.clientY);down=null;});this.canvas.addEventListener('pointercancel',()=>down=null);this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(32,Math.min(320,this.zoom+e.deltaY*.065));},{passive:false});}
 pick(x,y){const r=this.canvas.getBoundingClientRect();this.pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const list=this.state.mode==='battle'?[this.ground]:[this.city.root,...this.enemyCities.filter(c=>c.root.visible).map(c=>c.root),...this.pickables,this.ground];const hits=this.ray.intersectObjects(list,true);for(const hit of hits){const d=hit.object.userData;if(d.slot!==undefined){this.onSelect({slot:d.slot});return;}if(d.enemy){this.onSelect({enemy:d.enemy});return;}if(d.node){this.onSelect({node:d.node});return;}if(d.ground){this.onSelect({ground:{x:hit.point.x,z:hit.point.z}});return;}}}
 project(x,y,z){const p=new T.Vector3(x,y,z).project(this.camera);return {x:(p.x*.5+.5)*this.canvas.clientWidth,y:(-p.y*.5+.5)*this.canvas.clientHeight,visible:p.z<1};}
 update(s,dt,selectedSlot){this.state=s;updateDistricts(this.city,s.buildings);let focus,desiredZoom=this.zoom;const battle=s.mode==='battle';
 if(battle){const b=s.battle;this.city.root.position.set(b.player.x,0,b.player.z);this.city.root.rotation.y=b.player.angle;const c=this.enemyCities.find(c=>c.id===b.enemyId);for(const other of this.enemyCities)other.root.visible=other===c;c.root.position.set(b.enemy.x,0,b.enemy.z);c.root.rotation.y=b.enemy.angle;animateCity(c,s.time,!b.result);focus=new T.Vector3((b.player.x+b.enemy.x)/2,12,(b.player.z+b.enemy.z)/2);desiredZoom=Math.max(95,distance(b.player,b.enemy)*1.04+50);if(this.lastMode!=='battle'){this.savedYaw=this.yaw;this.savedPitch=this.pitch;this.yaw=.12;this.pitch=.42;this.lastEvent=0;}
 for(const ev of b.events){if(ev.id<=this.lastEvent)continue;this.lastEvent=ev.id;if(b.time-ev.time>1.1)continue;const start=new T.Vector3(ev.from.x,22,ev.from.z),end=new T.Vector3(ev.to.x,15,ev.to.z);const ball=orb(this.scene,ev.kind==='impact'?.9:.48,ev.kind==='enemyShot'?0xe26b45:0xffd28c,...start.toArray());const trail=orb(this.scene,.22,0xffffff,...start.toArray());this.fx.push({obj:ball,trail,start,end,age:0,kind:ev.kind});}}
 else{this.city.root.position.set(s.x,0,s.z);this.city.root.rotation.y=s.angle;focus=new T.Vector3(s.x,this.view==='world'?0:this.city.deckY+1,s.z);for(const c of this.enemyCities){const e=s.enemies.find(e=>e.id===c.id);c.root.visible=!e.defeated;c.root.position.set(e.x,0,e.z);animateCity(c,s.time,false);}if(this.lastMode==='battle'){this.yaw=this.savedYaw??.7;this.pitch=this.savedPitch??.47;}}
 this.lastMode=s.mode;this.labels.forEach(g=>g.visible=!battle);this.routeLine.visible=!battle&&!!s.target;this.destination.visible=this.routeLine.visible;if(s.target&&!battle){const pts=[new T.Vector3(s.x,.6,s.z),new T.Vector3(s.target.x,.6,s.target.z)];this.routeLine.geometry.dispose();this.routeLine.geometry=new T.BufferGeometry().setFromPoints(pts);this.routeLine.computeLineDistances();this.destination.position.set(s.target.x,.5,s.target.z);}
 this.selection.visible=!battle&&selectedSlot!==null;if(this.selection.visible){const p=slotPosition(selectedSlot);const v=new T.Vector3(p.x,this.city.deckY+.3,p.z);this.city.root.updateMatrixWorld();this.city.root.localToWorld(v);this.selection.position.copy(v);}
 animateCity(this.city,s.time,battle?!s.battle.result&&(s.battle.command!=='hold'):s.moving);
 this.focus.lerp(focus,1-Math.exp(-dt*5));const wide=this.camera.aspect<1.2?1.4:1;const horiz=Math.cos(this.pitch)*desiredZoom*wide;const target=new T.Vector3(this.focus.x+Math.sin(this.yaw)*horiz,this.focus.y+Math.sin(this.pitch)*desiredZoom*wide,this.focus.z+Math.cos(this.yaw)*horiz);this.camera.position.lerp(target,1-Math.exp(-dt*5));this.camera.lookAt(this.focus);this.sun.position.set(this.focus.x-80,130,this.focus.z+65);this.sun.target.position.copy(this.focus);
 for(let i=this.fx.length-1;i>=0;i--){const fx=this.fx[i];fx.age+=dt;const t=Math.min(1,fx.age/.65);fx.obj.position.lerpVectors(fx.start,fx.end,t);fx.obj.position.y+=Math.sin(t*Math.PI)*(fx.kind==='salvo'?18:7);fx.trail.position.lerpVectors(fx.start,fx.obj.position,.93);if(t>=1){fx.obj.scale.setScalar(1+(fx.age-.65)*9);fx.obj.material=mat(0xf0b466);if(fx.age>1){this.scene.remove(fx.obj,fx.trail);disposeGroup(fx.obj);disposeGroup(fx.trail);this.fx.splice(i,1);}}}
 this.renderer.render(this.scene,this.camera);
 }
}
