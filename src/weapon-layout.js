import {kaijuSlotPosition,KAIJU_SCALE,KAIJU_DECK_Y} from './city-layout.js';
import {variantFootprint} from './variants.js';
import {castleShotClearance} from './castle-collision.js';

export const normalizeAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const batteryArc=faction=>faction==='airship'?Math.PI*4/3:Math.PI*5/6;
export function batteryPosition(faction,slot,variant){
  const p=faction==='kaiju'?kaijuSlotPosition(slot):{x:(slot%5-2)*3.05,z:(Math.floor(slot/5)-1.5)*3.7};
  const scale=faction==='kaiju'?KAIJU_SCALE:1;
  const footprint=variantFootprint(faction,variant);
  return {x:p.x*scale*footprint.x,y:faction==='kaiju'?(KAIJU_DECK_Y+(p.y??0))*scale:faction==='airship'?18:10,z:p.z*scale*footprint.z};
}
export function defaultFacing(faction,slot){
  if(faction==='kaiju')return normalizeAngle(kaijuSlotPosition(slot).rotation);
  const p=batteryPosition(faction,slot);return normalizeAngle(Math.atan2(p.x,p.z));
}
export const facingOf=(faction,slot,b)=>Number.isFinite(b?.facing)?b.facing:defaultFacing(faction,slot);
function crossesCarrier(start,end,min,max){
  let near=0,far=1;
  for(const axis of ['x','y','z']){const delta=end[axis]-start[axis];if(Math.abs(delta)<1e-8){if(start[axis]<min[axis]||start[axis]>max[axis])return false;continue;}
    let a=(min[axis]-start[axis])/delta,b=(max[axis]-start[axis])/delta;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false;}
  return far>.01&&near<1;
}
export function batterySolution(state,slot,attacker,target,range){
  const building=state.buildings[slot],p=batteryPosition(state.faction,slot,state.variant),a=attacker.angle;
  const world={x:attacker.x+Math.cos(a)*p.x+Math.sin(a)*p.z,z:attacker.z-Math.sin(a)*p.x+Math.cos(a)*p.z};
  const dx=target.x-world.x,dz=target.z-world.z,d=Math.hypot(dx,dz);
  const worldBearing=normalizeAngle(Math.atan2(dx,dz)-a),footprint=variantFootprint(state.faction,state.variant);
  const bearing=Math.atan2(Math.sin(worldBearing)/footprint.x,Math.cos(worldBearing)/footprint.z),facing=facingOf(state.faction,slot,building);
  const inArc=Math.abs(normalizeAngle(bearing-facing))<=batteryArc(state.faction)/2;
  const localDirection={x:Math.sin(worldBearing),z:Math.cos(worldBearing)};
  const scale=state.faction==='kaiju'?KAIJU_SCALE:1;
  let blocker=null;
  const targetHeight=state.battle?.enemyFaction==='kaiju'?17.5:state.battle?.enemyFaction==='airship'?18:10;
  if(state.faction==='kaiju'&&crossesCarrier({x:p.x,y:p.y+1.8*scale,z:p.z},{x:p.x+localDirection.x*d,y:targetHeight,z:p.z+localDirection.z*d},{x:-5*scale,y:24*scale,z:-3.7*scale},{x:5*scale,y:51*scale,z:3.2*scale}))blocker='carrier';
  if(state.faction!=='airship')for(let i=0;i<state.buildings.length;i++){
    const other=state.buildings[i];if(i===slot||!other||other.remaining>0||!['keep','housing','foundry','sawmill'].includes(other.type))continue;
    const q=batteryPosition(state.faction,i,state.variant),vx=q.x-p.x,vz=q.z-p.z;
    const along=vx*localDirection.x+vz*localDirection.z,across=Math.abs(vx*localDirection.z-vz*localDirection.x);
    const shotHeight=p.y+1.8*scale+(targetHeight-p.y-1.8*scale)*along/Math.max(1,d);
    const top=q.y+Math.min(state.faction==='kaiju'?7.2:20,3.8+other.level*1.6)*scale;
    if(along>.75*scale&&along<d&&across<1.1*scale&&shotHeight>q.y&&shotHeight<top){blocker=i;break;}
  }
  if(state.faction==='kaiju'&&blocker===null&&building.remaining<=0&&inArc&&d<=range){
    const clearance=castleShotClearance({rings:state.rings??1,slot,level:building.level,yaw:bearing,target:{x:(p.x+localDirection.x*d)/scale,y:targetHeight/scale,z:(p.z+localDirection.z*d)/scale}});
    if(!clearance.clear)blocker=clearance.blocker;
  }
  return {slot,level:building.level,facing,bearing,inArc,inRange:d<=range,blocker,active:building.remaining<=0&&inArc&&d<=range&&blocker===null,position:world};
}
