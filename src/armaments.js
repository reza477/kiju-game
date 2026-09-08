import * as T from '../vendor/three.module.js';
import {getMaterial as m,box,cylinder,sphere,cone,beam,batchStatic} from './materials.js';
import {batteryArc,normalizeAngle} from './weapon-layout.js';

function muzzleMarker(parent,x,y,z){const point=new T.Object3D();point.position.set(x,y,z);parent.add(point);return point;}

export function createBattery(faction,level=1,facing=0,slot=null){
  const group=new T.Group(),turret=new T.Group(),recoil=new T.Group();group.name=faction==='airship'?'Missile battery':'Rotating cannon emplacement';
  const metal=m('metal',faction==='airship'?0x327d87:faction==='kaiju'?0x665075:0x486776),trim=m('gold',0xd3ad68),dark=m('metal',0x202f37),stone=m('stone',0x9a9f97);
  cylinder(group,1.19,1.31,.28,stone,0,.22,0,28);cylinder(group,.84,.97,.25,dark,0,.46,0,24);
  turret.position.y=.64;turret.rotation.y=facing;turret.scale.set(1.08,1.18,1.15);turret.userData.noBatch=true;group.add(turret);turret.add(recoil);
  const missile=faction==='airship',muzzles=[];
  if(missile){
    box(recoil,1.42,.34,1.6,metal,0,.32,0);
    for(const x of [-.42,.42])for(let i=0;i<(level>1?3:2);i++){
      const z=-.65+i*.55,y=.66;
      const tube=cylinder(recoil,.19,.23,1.23,dark,x,y,z,12);tube.rotation.x=Math.PI/2-.4;
      const nose=cone(recoil,.165,.48,trim,x,y+.29,z+.59,12);nose.rotation.x=Math.PI/2-.4;
      muzzles.push(muzzleMarker(recoil,x,y+.4,z+.8));
    }
    for(const x of [-.74,.74])box(turret,.08,.71,1.5,trim,x,.45,0);
  }else{
    box(recoil,1.45,.55,1.23,metal,0,.35,-.25);
    for(const x of level>1?[-.34,.34]:[0]){
      const barrel=cylinder(recoil,.235,.29,2.1,dark,x,.55,1.05,20);barrel.rotation.x=Math.PI/2;
      for(const z of [.25,.75,1.8]){const collar=cylinder(recoil,.3,.3,.14,trim,x,.55,z,20);collar.rotation.x=Math.PI/2;}
      const opening=cylinder(recoil,.18,.18,.015,m('metal',0x101b20),x,.55,2.11,18);opening.rotation.x=Math.PI/2;
      muzzles.push(muzzleMarker(recoil,x,.55,2.13));
    }
    for(const x of [-.77,.77])cylinder(turret,.26,.26,.12,trim,x,.45,-.16,16).rotation.z=Math.PI/2;
    if(level===3)box(recoil,.9,.26,.9,stone,0,.78,-.36);
  }
  // Visible shell lockers, guard rails and a direction arrow make the mount legible.
  for(const side of [-1,1]){
    box(group,.3,.43,.76,m('wood',0x8b7052),side*.95,.39,-.72);
    for(let i=0;i<3;i++)cylinder(group,.067,.067,.26,trim,side*.95,.73,-.95+i*.23,10);
    beam(group,[side*1.2,.2,-1],[side*1.2,.79,-1],.04,dark);beam(group,[side*1.2,.79,-1],[side*1.2,.79,.5],.04,dark);
  }
  const arrow=cone(turret,.23,.65,m('gold',0xf3d396),0,-.28,1.2,3);arrow.rotation.x=Math.PI/2;
  const indicator=new T.Mesh(new T.SphereGeometry(.13,10,8),new T.MeshBasicMaterial({color:0xbcc8bc}));indicator.position.set(0,.94,-.7);turret.add(indicator);
  const weapon={group,turret,recoil,muzzles,indicator,facing,slot,level,missile,base:false,firedAt:-100};
  group.weapon=weapon;return group;
}

export function addCarrierWeapons(city){
  const weapons=[];
  const coords=city.faction==='kaiju'?[[-5.1,42.8,1.9],[5.1,42.8,1.9]]:city.faction==='crawler'?[[-5.2,6.1,10.3],[5.2,6.1,10.3]]:[[-8.6,17.5,-5],[8.6,17.5,5]];
  for(const point of coords){
    const group=createBattery(city.faction,1,0);group.position.set(...point);if(city.faction==='kaiju')group.scale.setScalar(1.22);
    city.rig.add(group);group.weapon.base=true;batchStatic(group);weapons.push(group.weapon);
  }
  city.baseWeapons=weapons;return weapons;
}

export function animateWeapons(city,target,time){
  for(const weapon of [...(city.baseWeapons||[]),...(city.batteries||[])]){
    if(target){
      const location=weapon.group.getWorldPosition(new T.Vector3());
      const bearing=normalizeAngle(Math.atan2(target.x-location.x,target.z-location.z)-city.heading);
      const delta=normalizeAngle(bearing-weapon.facing),limit=weapon.base?Math.PI:batteryArc(city.faction)/2;
      weapon.turret.rotation.y=weapon.facing+T.MathUtils.clamp(delta,-limit,limit);
    }else weapon.turret.rotation.y=weapon.facing;
    const age=time-weapon.firedAt;weapon.recoil.position.z=age>=0&&age<.38?-Math.sin(age/.38*Math.PI)*.48:0;
  }
}

export function weaponMuzzles(city,slots,time,melee=false,base=true){
  if(melee){
    city.strikeTime=time;
    const p=new T.Vector3(city.faction==='kaiju'?5:0,city.faction==='kaiju'?27:5,city.faction==='kaiju'?4.5:13);
    city.root.localToWorld(p);return [{point:p,missile:false,weapon:null}];
  }
  const selected=[...(base?city.baseWeapons||[]:[]),...(city.batteries||[]).filter(w=>slots.includes(w.slot))];
  return selected.map((weapon,i)=>{weapon.firedAt=time;const marker=weapon.muzzles[i%weapon.muzzles.length];return {point:marker.getWorldPosition(new T.Vector3()),missile:weapon.missile,weapon};});
}

export function arcGeometry(angle){
  const points=[new T.Vector3(0,0,0)];
  for(let i=0;i<=40;i++){const a=-angle/2+i/40*angle;points.push(new T.Vector3(Math.sin(a)*7,0,Math.cos(a)*7));}
  points.push(new T.Vector3(0,0,0));return new T.BufferGeometry().setFromPoints(points);
}
