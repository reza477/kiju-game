import {kaijuSlotPosition,KAIJU_SCALE} from './city-layout.js';

export const normalizeAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const batteryArc=faction=>faction==='airship'?Math.PI*4/3:Math.PI*5/6;
export function batteryPosition(faction,slot){
  const p=faction==='kaiju'?kaijuSlotPosition(slot):{x:(slot%5-2)*3.05,z:(Math.floor(slot/5)-1.5)*3.7};
  const scale=faction==='kaiju'?KAIJU_SCALE:1;
  return {x:p.x*scale,z:p.z*scale};
}
export function defaultFacing(faction,slot){
  if(faction==='kaiju')return normalizeAngle(kaijuSlotPosition(slot).rotation);
  const p=batteryPosition(faction,slot);return normalizeAngle(Math.atan2(p.x,p.z));
}
export const facingOf=(faction,slot,b)=>Number.isFinite(b?.facing)?b.facing:defaultFacing(faction,slot);
export function batterySolution(state,slot,attacker,target,range){
  const building=state.buildings[slot],p=batteryPosition(state.faction,slot),a=attacker.angle;
  const world={x:attacker.x+Math.cos(a)*p.x+Math.sin(a)*p.z,z:attacker.z-Math.sin(a)*p.x+Math.cos(a)*p.z};
  const dx=target.x-world.x,dz=target.z-world.z,d=Math.hypot(dx,dz);
  const bearing=normalizeAngle(Math.atan2(dx,dz)-a),facing=facingOf(state.faction,slot,building);
  const inArc=Math.abs(normalizeAngle(bearing-facing))<=batteryArc(state.faction)/2;
  const localDirection={x:Math.sin(bearing),z:Math.cos(bearing)};
  const scale=state.faction==='kaiju'?KAIJU_SCALE:1;
  let blocker=null;
  if(state.faction!=='airship')for(let i=0;i<state.buildings.length;i++){
    const other=state.buildings[i];if(i===slot||!other||other.remaining>0||!['keep','housing','foundry','sawmill'].includes(other.type))continue;
    const q=batteryPosition(state.faction,i),vx=q.x-p.x,vz=q.z-p.z;
    const along=vx*localDirection.x+vz*localDirection.z,across=Math.abs(vx*localDirection.z-vz*localDirection.x);
    if(along>.75*scale&&along<d&&across<1.1*scale){blocker=i;break;}
  }
  return {slot,level:building.level,facing,bearing,inArc,inRange:d<=range,blocker,active:building.remaining<=0&&inArc&&d<=range&&blocker===null,position:world};
}
