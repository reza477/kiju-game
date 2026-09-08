import * as T from '../vendor/three.module.js';
import {getMaterial as m,box,cylinder as cyl,cone,sphere,beam,batchStatic,random} from './materials.js';
import {createPerimeterQuarter,createStreetDetails} from './architecture.js';

export const slotPosition=i=>({x:(i%5-2)*3.05,z:(Math.floor(i/5)-1.5)*3.7});

function ring(group,r,tube,material,x,y,z,rotation=0){const o=new T.Mesh(new T.TorusGeometry(r,tube,8,32),material);o.position.set(x,y,z);o.rotation.y=rotation;o.castShadow=true;group.add(o);return o;}
function sculpted(group,material,position,scale,seed=1){
  const geometry=new T.SphereGeometry(1,40,28),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=1+.025*Math.sin(x*13+seed)*Math.sin(y*9+2)*Math.cos(z*11);p.setXYZ(i,x*n,y*n,z*n);}
  geometry.computeVertexNormals();const object=new T.Mesh(geometry,material);object.position.set(...position);object.scale.set(...scale);object.castShadow=true;object.receiveShadow=true;group.add(object);return object;
}
function tooth(g,x,y,z,r=.16,h=.5){const o=cone(g,r,h,m('bone'),x,y,z,12);o.rotation.x=Math.PI;return o;}

function kaiju(frame,rig,limbs){
  const skin=m('skin',0x637568),dark=m('skin',0x44554c),belly=m('skin',0x9c9c78),bone=m('bone');
  sculpted(frame,skin,[0,8.7,-.4],[5.35,6.7,6.5]);
  sculpted(frame,belly,[0,7.4,4.3],[3.65,4.7,2.45]);
  for(const side of [-1,1]){
    sculpted(frame,skin,[side*3.7,11.2,2.15],[2.55,3.5,3.65],2);
    for(let i=0;i<5;i++){const plate=sphere(frame,1,m('skin',0x657365),side*(3.7+i*.25),12.1-i*.5,-2.8+i*.7,1.1,.38,1.8);plate.rotation.z=-side*.45;}
    const shoulder=new T.Group();shoulder.position.set(side*4.6,10.5,3.1);rig.add(shoulder);
    sculpted(shoulder,skin,[side*.6,-1.5,.8],[2.05,3.6,2.45],5);
    sculpted(shoulder,dark,[side*1.15,-4.1,2.45],[1.8,2.25,2.25],8);
    sculpted(shoulder,skin,[side*1.15,-5.4,3.65],[1.85,1.2,1.9]);
    for(let finger=0;finger<4;finger++){
      const x=side*1.15+(finger-1.5)*.65;
      sculpted(shoulder,dark,[x,-5.95,4.1],[.38,.68,1.1],finger);
      cone(shoulder,.19,.95,bone,x,-6.15,5.1,12).rotation.x=Math.PI/2;
      sphere(shoulder,.26,skin,x,-5.25,4.35,1,.7,1.2);
    }
    const cuff=cyl(shoulder,2.02,2.12,.6,m('metal',0x514d45),side*1.1,-3.95,2.35,28);cuff.rotation.x=-.22;
    for(let a=0;a<8;a++){const angle=a*Math.PI/4;sphere(shoulder,.14,m('gold'),side*1.1+Math.cos(angle)*2.05,-3.9,2.35+Math.sin(angle)*2.05);}
    limbs.push({obj:shoulder,phase:side>0?Math.PI:0,leg:false});batchStatic(shoulder);
    const leg=new T.Group();leg.position.set(side*3.25,5.5,-3.3);rig.add(leg);
    sculpted(leg,skin,[0,-1.2,0],[2.3,3.1,2.75],3);sculpted(leg,dark,[0,-3.3,.55],[1.8,2.1,2.1],7);
    sculpted(leg,skin,[0,-4.5,1.6],[2,1,2.9]);
    for(let i=0;i<3;i++){const x=(i-1)*1.05;sculpted(leg,dark,[x,-4.7,3.5],[.65,.5,1.2]);cone(leg,.28,1.3,bone,x,-4.68,4.55,12).rotation.x=Math.PI/2;}
    limbs.push({obj:leg,phase:side>0?0:Math.PI,leg:true});batchStatic(leg);
  }
  sculpted(frame,skin,[0,12.35,5.8],[3.45,2.9,3.4],12);
  sculpted(frame,dark,[0,11.8,8.45],[2.4,1.5,2.25],11);
  sculpted(frame,belly,[0,10.4,8.45],[2.55,.75,2.05],4);
  sphere(frame,1,m('skin',0x253830),0,11.02,9.82,2.05,.25,.55);
  for(let i=-4;i<=4;i++){tooth(frame,i*.41,11.23,10.08-Math.abs(i)*.06,.12,.38+(4-Math.abs(i))*.025);cone(frame,.11,.32,bone,i*.41,10.79,10.08-Math.abs(i)*.06,10);}
  for(const side of [-1,1]){
    sphere(frame,.67,dark,side*2.28,12.7,7.78,.5,.8,1.2);
    sphere(frame,.43,m('gold',0xd5a03e,{emissive:0xdf9e25,emissiveIntensity:.25}),side*2.48,12.65,8.0,.3,.65,1);
    sphere(frame,.33,m('metal',0x142a24),side*2.56,12.65,8.1,.15,.7,.28);
    beam(frame,[side*1.8,13.45,6.9],[side*2.75,13.13,8.45],.3,skin);
    cone(frame,.78,3.6,bone,side*2.7,15,5.1,20).rotation.z=-side*.32;
    cone(frame,.45,2.25,bone,side*3.05,13.5,4.05,16).rotation.z=-side*.9;
    sphere(frame,.28,dark,side*.87,12.15,10.15,1,.5,.4);
  }
  const tail=new T.Group();tail.position.set(0,4.5,-5.5);rig.add(tail);
  for(let i=0;i<8;i++){const z=-i*1.7;const r=2.25*(1-i/9);sculpted(tail,skin,[Math.sin(i*.3)*1.25,-i*.23,z],[r,r*.75,2.3],i);if(i<6)cone(tail,.6*(1-i/9),1.8*(1-i/10),bone,Math.sin(i*.3)*1.25,r*.65-i*.23,z,12).rotation.x=-.25;}
  batchStatic(tail);limbs.push({obj:tail,tail:true,phase:0});
  const harness=m('metal',0x414945),brass=m('gold',0xa6905c);
  for(const z of [-4.4,3.2]){
    const strap=ring(frame,5.3,.3,harness,0,9,z);strap.scale.y=1.08;
    for(const side of [-1,1]){
      beam(frame,[side*4,10,z],[side*8,14.5,z],.24,brass);
      for(let i=0;i<5;i++){const link=ring(frame,.23,.065,brass,side*(4.7+i*.5),11+i*.62,z);link.rotation.x=i%2*Math.PI/2;}
    }
  }
}

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
    cyl(frame,1.35,1.6,1.1,armour,side*5.2,6.3,9.5,24);
    const barrel=cyl(frame,.35,.49,5.5,dark,side*5.2,6.95,12,24);barrel.rotation.x=Math.PI/2;
    for(const z of [10.3,11.5,13.9]){const collar=cyl(frame,.48,.48,.25,brass,side*5.2,6.95,z,24);collar.rotation.x=Math.PI/2;}
    const lamp=sphere(frame,.3,m('window',0xffda91),side*7,5.9,11.65,1,1,.4);
    ring(frame,.37,.065,brass,side*7,5.9,11.7);
  }
}

function airship(frame,rig,spinners){
  const brass=m('gold',0xc09d61),wood=m('wood',0x725445),cloth=m('fabric',0xe2d4b1),teal=m('copper',0x538f8e);
  sphere(frame,1,wood,0,15.9,0,9,2.4,11);box(frame,17,.5,18.5,brass,0,17.3,0);
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

function population(rig,deckY,faction){
  const group=new T.Group();group.position.y=deckY+.16;rig.add(group);
  const bodyGeometry=new T.BoxGeometry(.19,.33,.15),headGeometry=new T.SphereGeometry(.105,10,8),limbGeometry=new T.BoxGeometry(.06,.22,.075);
  const material=m('fabric',0xffffff);const bodies=new T.InstancedMesh(bodyGeometry,material,40),heads=new T.InstancedMesh(headGeometry,m('plaster',0xd4ae83),40),legs=new T.InstancedMesh(limbGeometry,m('fabric',0x344b4e),80);
  const colors=faction==='airship'?[0xcda668,0x538b8d,0xebe0ca,0x9e716b]:[0x7b7665,0xc5a573,0x5c7890,0x8c655e];
  for(let i=0;i<40;i++)bodies.setColorAt(i,new T.Color(colors[i%4]));
  for(const o of [bodies,heads,legs]){o.castShadow=true;o.instanceMatrix.setUsage(T.DynamicDrawUsage);o.frustumCulled=false;group.add(o);}
  return {group,bodies,heads,legs,dummy:new T.Object3D()};
}

export function makeCity(faction,enemy=false){
  const root=new T.Group(),rig=new T.Group(),frame=new T.Group();root.add(rig);rig.add(frame);
  const deckY=faction==='airship'?18:faction==='crawler'?10:15,limbs=[],spinners=[];
  if(faction==='kaiju')kaiju(frame,rig,limbs);else if(faction==='crawler')crawler(frame,rig,spinners);else airship(frame,rig,spinners);
  const edge=m('stone',faction==='airship'?0xcdbb93:0x9eaaa3),metal=m('metal',0x45595c);
  box(frame,17.3,.75,18.1,metal,0,deckY-.5,0);box(frame,17.5,.2,18.3,edge,0,deckY-.04,0);
  box(frame,16.5,.09,17.2,m('pavement',0x7f918c),0,deckY+.1,0);
  frame.add(createPerimeterQuarter(faction,deckY),createStreetDetails(faction,deckY));
  for(const side of [-1,1]){
    box(frame,.17,.72,18.2,edge,side*8.65,deckY+.42,0);box(frame,17.4,.72,.17,edge,0,deckY+.42,side*9.05);
    for(let z=-8.6;z<9;z+=.95){box(frame,.3,1,.31,edge,side*8.65,deckY+.6,z);box(frame,.43,.13,.44,m('metal',0x526564),side*8.65,deckY+1.12,z);}
  }
  if(faction==='kaiju')for(const x of [-8.6,8.6])for(const z of [-9,9]){
    cyl(frame,.67,.85,2.9,edge,x,deckY+1.4,z,16);cyl(frame,.78,.78,.2,m('gold',0x9a895e),x,deckY+2.85,z,16);cone(frame,1,3.2,m('roof',0x344d62),x,deckY+4.5,z,12);cone(frame,.08,.8,m('gold'),x,deckY+6.5,z,8);
    for(const side of [-1,1])box(frame,.18,.8,.04,m('window'),x+side*.23,deckY+1.65,z+.68);
  }
  if(faction==='airship')for(const x of [-8.5,8.5])for(const z of [-8.8,8.8]){
    cyl(frame,.33,.5,4,edge,x,deckY+2,z,20);cyl(frame,.66,.66,.17,m('gold'),x,deckY+3.5,z,24);sphere(frame,.66,m('copper'),x,deckY+4.2,z,1,1.05,1);cone(frame,.06,.85,m('gold'),x,deckY+5.2,z,10);
  }
  // Hull balconies and support braces give the city an inhabited vertical silhouette.
  for(const x of [-5.4,5.4]){box(frame,1.1,2.1,.05,m('fabric',enemy?0xa65246:faction==='kaiju'?0x813e52:0x417a85),x,deckY-.65,9.22);box(frame,.09,1.4,.06,m('gold'),x,deckY-.55,9.27);box(frame,.55,.1,.06,m('gold'),x,deckY-.3,9.27);}
  for(const side of [-1,1])for(let z=-6;z<=6;z+=4)beam(frame,[side*5.6,deckY-3,z],[side*8.5,deckY-.5,z],.18,metal);
  const stacks=[];frame.traverse(o=>{if(o.userData.smokestack)stacks.push(o);});batchStatic(frame);
  const districts=new T.Group();districts.position.y=deckY;rig.add(districts);
  const plots=new T.Group();plots.position.y=deckY;rig.add(plots);
  const hitGroup=new T.Group();hitGroup.position.y=deckY;rig.add(hitGroup);
  const slots=[],hitMaterial=new T.MeshBasicMaterial({visible:false});
  for(let i=0;i<20;i++){const p=slotPosition(i);const hit=new T.Mesh(new T.BoxGeometry(2.8,1,3.4),hitMaterial);hit.position.set(p.x,.5,p.z);hit.userData.slot=i;hit.userData.noBatch=true;hitGroup.add(hit);slots.push(hit);}
  return {root,rig,frame,deckY,limbs,spinners,districts,plots,hitGroup,slots,faction,enemy,stacks,districtStacks:[],signature:'',people:population(rig,deckY,faction)};
}

export function animateCity(city,time,moving,populationCount=28){
  const walk=moving?Math.sin(time*3.1):Math.sin(time)*.08;
  city.rig.position.y=city.faction==='airship'?Math.sin(time*.85)*.18:Math.abs(walk)*.11;
  for(const limb of city.limbs){if(limb.tail){limb.obj.rotation.y=Math.sin(time*1.2)*.06;continue;}limb.obj.rotation.x=Math.sin(time*3.1+limb.phase)*(moving?.15:.015)*(limb.leg?1:1.35);}
  for(const spinner of city.spinners)if(city.faction==='airship'||moving)spinner.obj.rotation[spinner.axis]=time*spinner.speed;
  const people=city.people,count=Math.min(40,Math.max(12,Math.floor(populationCount))),dummy=people.dummy;people.bodies.count=count;people.heads.count=count;people.legs.count=count*2;
  for(let i=0;i<count;i++){
    const t=(time*(.055+i%4*.007)+i*.176)%1,along=t*14.1-7.05;let x,z,yaw;
    if(i%2===0){x=along;z=(i%4-1.5)*3.7+1.69;yaw=Math.PI/2;}else{x=(i%5-2)*3.05+1.4;z=along;yaw=0;}
    dummy.rotation.set(0,yaw,0);dummy.position.set(x,.37,z);dummy.updateMatrix();people.bodies.setMatrixAt(i,dummy.matrix);
    dummy.position.y=.635;dummy.updateMatrix();people.heads.setMatrixAt(i,dummy.matrix);
    for(let k=0;k<2;k++){dummy.position.set(x+(yaw===0?(k-.5)*.1:0),.135,z+(yaw!==0?(k-.5)*.1:0));dummy.rotation.set(Math.sin(time*8+i+k*Math.PI)*.35,yaw,0);dummy.updateMatrix();people.legs.setMatrixAt(i*2+k,dummy.matrix);}
  }
  people.bodies.instanceMatrix.needsUpdate=people.heads.instanceMatrix.needsUpdate=people.legs.instanceMatrix.needsUpdate=true;
}
