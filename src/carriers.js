import * as T from '../vendor/three.module.js';
import {getMaterial as m,box,cylinder as cyl,cone,sphere,beam,batchStatic,disposeGroup} from './materials.js';
import {createPerimeterQuarter,createStreetDetails} from './architecture.js';
import {createHumanoidKaiju} from './kaiju.js';
import {createCastleBackpack,kaijuSlotPosition} from './castle.js';
import {KAIJU_SCALE,KAIJU_DECK_Y} from './city-layout.js';
import {createCitizens,animateCitizens} from './citizens.js';
import {addCarrierWeapons} from './armaments.js';

export const slotPosition=(i,faction)=>faction==='kaiju'?kaijuSlotPosition(i):({x:(i%5-2)*3.05,y:0,z:(Math.floor(i/5)-1.5)*3.7});

function ring(group,r,tube,material,x,y,z,rotation=0){const o=new T.Mesh(new T.TorusGeometry(r,tube,8,32),material);o.position.set(x,y,z);o.rotation.y=rotation;o.castShadow=true;group.add(o);return o;}
function crawler(frame,rig,spinners){
  const armour=m('metal',0x42565f),steel=m('metal',0x778587),dark=m('metal',0x283e47),brass=m('gold',0xad8c52);
  box(frame,18,3.2,23,armour,0,4.5,0);box(frame,16.5,1.7,21,steel,0,6.6,-.2);
  for(let side of [-1,1]){
    box(frame,3.3,3.8,22.8,dark,side*8.95,2.75,0);
    for(let z=-9;z<=9;z+=3){
      const wheel=new T.Group();wheel.position.set(side*9,2.55,z);rig.add(wheel);
      cyl(wheel,1.68,1.68,3.45,dark,0,0,0,36).rotation.z=Math.PI/2;
      cyl(wheel,1.33,1.33,.16,steel,side*1.77,0,0,32).rotation.z=Math.PI/2;
      cyl(wheel,.55,.55,.26,brass,side*1.88,0,0,24).rotation.z=Math.PI/2;
      for(let a=0;a<8;a++){const angle=a*Math.PI/4;const spoke=box(wheel,.12,1.2,.16,armour,side*1.88,Math.cos(angle)*.83,Math.sin(angle)*.83);spoke.rotation.x=-angle;}
      batchStatic(wheel);spinners.push({obj:wheel,axis:'x',speed:1.8});
    }
    for(let i=0;i<58;i++){
      const angle=i/58*Math.PI*2;
      const z=Math.sin(angle)*10.4,y=2.6+Math.cos(angle)*2;
      const tread=box(frame,3.6,.2,1.05,steel,side*9,y,z);tread.rotation.x=-Math.atan2(Math.cos(angle)*10.4,-Math.sin(angle)*2);
      box(frame,.32,.14,.72,brass,side*10.72,y+.12,z);
    }
    for(const z of [-7.7,-4]){
      cyl(frame,.54,.67,10.6,m('metal',0x555350),side*7.6,11.35,z,24);
      for(const y of [8,11,14,16.4])cyl(frame,.71,.71,.23,brass,side*7.6,y,z,24);
      const stack=new T.Object3D();stack.position.set(side*7.6,16.7,z);stack.userData.smokestack=true;frame.add(stack);
    }
  }
  box(frame,20.1,.45,23.1,m('stone',0xa8aaa0),0,8,0);
  box(frame,18.3,1.35,20.7,m('brick',0x8f6151),0,8.85,0);
  for(const side of [-1,1])for(let z=-8;z<=8;z+=1.45){box(frame,.06,.67,.62,m('window'),side*9.2,8.9,z);box(frame,.15,.09,.8,brass,side*9.2,8.46,z);}
  for(let x=-7.5;x<=7.5;x+=1.5){box(frame,.62,.67,.07,m('window'),x,8.9,10.4);box(frame,.8,.1,.18,m('stone',0xc0b4a0),x,8.46,10.43);}
  const prow=box(frame,13,2.3,2.1,steel,0,3.2,12.1);prow.rotation.x=-.27;
  for(let x=-6;x<=6;x+=1.4){cone(frame,.54,2.2,dark,x,2.1,13.6,4).rotation.x=Math.PI/2;box(frame,.08,2.2,2.2,brass,x,3.8,12.2);}
  for(const side of [-1,1]){
    const lamp=sphere(frame,.3,m('window',0xffda91),side*7,5.9,11.65,1,1,.4);
    ring(frame,.37,.065,brass,side*7,5.9,11.7);
  }
}

function airship(frame,rig,spinners){
  const brass=m('gold',0xc09d61),wood=m('wood',0x725445),cloth=m('fabric',0xe2d4b1),teal=m('copper',0x538f8e);
  sphere(frame,1,wood,0,15.2,0,9,2.4,11);box(frame,17,.5,18.5,brass,0,17.3,0);
  for(const side of [-1,1])for(const z of [-6.8,6.6]){
    sphere(frame,1,cloth,side*13.2,19.4,z,3.2,3.1,7.5);
    for(let t=-2;t<=2;t++){
      const off=t*2.4,rad=3.15*Math.sqrt(1-off*off/56.25);const band=ring(frame,rad,.065,brass,side*13.2,19.4,z+off);band.scale.y=.98;
    }
    for(const a of [-1,0,1]){
      const points=[];for(let k=0;k<=24;k++){const dz=-7.4+k/24*14.8;const rad=3.18*Math.sqrt(Math.max(0,1-dz*dz/56.25));points.push(new T.Vector3(side*13.2+Math.sin(a*Math.PI/3)*rad,19.4+Math.cos(a*Math.PI/3)*rad,z+dz));}
      const tube=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.032,5,false),brass);frame.add(tube);
    }
    for(const dz of [-3.5,3.5]){beam(frame,[side*7.4,16.8,z+dz],[side*12.8,17.7,z+dz],.14,brass);beam(frame,[side*7.8,18,z+dz],[side*11.2,20,z+dz],.055,brass);}
    cyl(frame,.27,.27,5,wood,side*13.2,15.7,z,16).rotation.x=Math.PI/2;
    const fin=box(frame,5.1,.12,2.2,teal,side*13.2,19.35,z-6.7);fin.rotation.z=side*.09;
    box(frame,.13,3.2,2.3,teal,side*13.2,19.7,z-6.75);
  }
  for(const side of [-1,1]){
    for(const z of [-9,9]){
      const prop=new T.Group();prop.position.set(side*9.6,15.75,z);rig.add(prop);
      cyl(prop,.48,.63,1.5,brass,0,0,0,20).rotation.x=Math.PI/2;
      for(let i=0;i<4;i++){const blade=box(prop,.46,4,.13,wood,0,0,-.8);blade.rotation.z=i*Math.PI/4;}
      ring(prop,2.3,.065,brass,0,0,-.83);batchStatic(prop);spinners.push({obj:prop,axis:'z',speed:9});
    }
    for(let z=-7;z<=7;z+=2.5){sphere(frame,.4,m('window',0xffd58c),side*8.3,15.8,z,.6,.85,.6);beam(frame,[side*8.3,17,z],[side*8.3,16,z],.045,brass);}
  }
  for(let z=-7;z<=7;z+=3.5)beam(frame,[-8,16.8,z],[8,16.8,z],.14,brass);
}

export function setCityRings(city,rings){
  if(city.faction!=='kaiju'||city.rings===rings)return;
  if(city.foundation){city.foundation.removeFromParent();disposeGroup(city.foundation);}
  city.foundation=createCastleBackpack(city.deckY,city.enemy,rings);batchStatic(city.foundation);city.rig.add(city.foundation);city.rings=rings;
}

export function makeCity(faction,enemy=false,rings=1){
  const root=new T.Group(),rig=new T.Group(),frame=new T.Group();root.add(rig);rig.add(frame);
  const deckY=faction==='airship'?18:faction==='crawler'?10:KAIJU_DECK_Y,limbs=[],spinners=[],scale=faction==='kaiju'?KAIJU_SCALE:1;
  root.scale.setScalar(scale);
  if(faction==='kaiju'){
    createHumanoidKaiju(frame,rig,limbs);
  }else{
    if(faction==='crawler')crawler(frame,rig,spinners);else airship(frame,rig,spinners);
    const edge=m('stone',faction==='airship'?0xcdbb93:0x9eaaa3),metal=m('metal',0x45595c);
    box(frame,17.3,.75,18.1,metal,0,deckY-.5,0);box(frame,17.5,.2,18.3,edge,0,deckY-.04,0);
    box(frame,16.5,.09,17.2,m('pavement',0x7f918c),0,deckY+.1,0);
    frame.add(createPerimeterQuarter(faction,deckY),createStreetDetails(faction,deckY));
    for(const side of [-1,1]){
      box(frame,.17,.72,18.2,edge,side*8.65,deckY+.42,0);box(frame,17.4,.72,.17,edge,0,deckY+.42,side*9.05);
      for(let z=-8.6;z<9;z+=.95){box(frame,.3,1,.31,edge,side*8.65,deckY+.6,z);box(frame,.43,.13,.44,m('metal',0x526564),side*8.65,deckY+1.12,z);}
    }
    if(faction==='airship')for(const x of [-8.5,8.5])for(const z of [-8.8,8.8]){
      cyl(frame,.33,.5,4,edge,x,deckY+2,z,20);cyl(frame,.66,.66,.17,m('gold'),x,deckY+3.5,z,24);sphere(frame,.66,m('copper'),x,deckY+4.2,z,1,1.05,1);cone(frame,.06,.85,m('gold'),x,deckY+5.2,z,10);
    }
    // Hull balconies and support braces give the city an inhabited vertical silhouette.
    for(const x of [-5.4,5.4]){box(frame,1.1,2.1,.05,m('fabric',enemy?0xa65246:0x417a85),x,deckY-.65,9.22);box(frame,.09,1.4,.06,m('gold'),x,deckY-.55,9.27);box(frame,.55,.1,.06,m('gold'),x,deckY-.3,9.27);}
    for(const side of [-1,1])for(let z=-6;z<=6;z+=4)beam(frame,[side*5.6,deckY-3,z],[side*8.5,deckY-.5,z],.18,metal);
  }
  const stacks=[];frame.traverse(o=>{if(o.userData.smokestack)stacks.push(o);});batchStatic(frame);
  const districts=new T.Group();districts.position.y=deckY;rig.add(districts);
  const plots=new T.Group();plots.position.y=deckY;rig.add(plots);
  const hitGroup=new T.Group();hitGroup.position.y=deckY;rig.add(hitGroup);
  const slots=[],slotPositions=Array.from({length:20},(_,i)=>slotPosition(i,faction)),hitMaterial=new T.MeshBasicMaterial({visible:false});
  for(let i=0;i<20;i++){const p=slotPositions[i];const hit=new T.Mesh(new T.BoxGeometry(2.8,1,3.4),hitMaterial);hit.position.set(p.x,p.y+.5,p.z);hit.userData.slot=i;hit.userData.noBatch=true;hitGroup.add(hit);slots.push(hit);}
  const layout=faction==='kaiju'?'circular':'deck';
  const city={root,rig,frame,deckY,scale,heading:0,limbs,spinners,districts,plots,hitGroup,slots,slotPositions,layout,faction,enemy,stacks,districtStacks:[],batteries:[],signature:'',rings:null,people:createCitizens(rig,deckY,faction,{scale,slotPositions,layout,rings})};
  setCityRings(city,rings);addCarrierWeapons(city);return city;
}

export function animateCity(city,time,moving,populationCount=28){
  const walk=moving?Math.sin(time*3.1):Math.sin(time)*.08;
  city.rig.position.y=city.faction==='airship'?Math.sin(time*.85)*.18:Math.abs(walk)*.11;
  for(const limb of city.limbs){if(limb.tail){limb.obj.rotation.y=Math.sin(time*1.2)*.06;continue;}limb.obj.rotation.x=Math.sin(time*3.1+limb.phase)*(moving?.15:.015)*(limb.leg?1:1.35);if(!limb.leg&&time-city.strikeTime<.5)limb.obj.rotation.x-=Math.sin((time-city.strikeTime)/.5*Math.PI)*1.15;}
  for(const spinner of city.spinners)if(city.faction==='airship'||moving)spinner.obj.rotation[spinner.axis]=time*spinner.speed;
  animateCitizens(city.people,time,moving,populationCount,{rings:city.rings??2,slotPositions:city.slotPositions,layout:city.layout});
}
