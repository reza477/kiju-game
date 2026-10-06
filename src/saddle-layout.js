import {RING_SLOTS,KAIJU_DECK_Y} from './city-layout.js';
import {VERTICAL_SLOT_ORDER,verticalOrder,nextVerticalSlot} from './vertical-city.js';

// The flesh carrier carries one draped load, not a stack of castle storeys.
// Historical slot IDs and construction order remain the save authority. Only
// their presentation is mapped to the fixed crown and two flank panniers.
export const SADDLE_SLOT_ORDER=VERTICAL_SLOT_ORDER;
export const SADDLE_DECK_Y=KAIJU_DECK_Y;
export const SADDLE_DISTRICT_SIZE=Object.freeze({width:3.45,depth:3.8});
const along=[-6,-9.7,-13.4,-17.1];
const crown=(side,row)=>({x:side*1.83,absoluteY:row?24.3:29,z:row?-14.8:along[1],rotation:Math.PI,zone:'crown',side,row});
const flank=(side,row,low=false)=>({x:side*(low?8.4:row===0?6.9:6.65),absoluteY:(low?[22.5,22.2,19.6,17.2]:[26.5,26,23.6,21])[row],z:along[row],rotation:side*Math.PI/2,zone:low?'lower-pannier':'upper-pannier',side,row});
const mounts=[crown(-1,0),flank(-1,1),flank(1,1),crown(1,0),flank(-1,0),flank(1,0),crown(-1,1),crown(1,1),flank(-1,2),flank(1,2),flank(-1,3),flank(1,3),flank(-1,1,true),flank(1,1,true),flank(-1,0,true),flank(1,0,true),flank(-1,2,true),flank(1,2,true),flank(-1,3,true),flank(1,3,true)].map(Object.freeze);
export const SADDLE_MOUNTS=Object.freeze(mounts);

function worldPath(mount){
 const co=Math.cos(mount.rotation),si=Math.sin(mount.rotation);
 return [[-1.36,-1.49],[1.36,-1.49],[1.36,1.49],[-1.36,1.49]].map(([x,z])=>({x:mount.x+x*co+z*si,z:mount.z-x*si+z*co}));
}
export function saddleDistrictHeight(level=1){return 2.72+.18*(Math.max(1,Math.min(3,level))-1);}

export function createSaddleLayout(buildings,order=[]){
 const ids=verticalOrder(buildings,order),allocation=[...ids,...SADDLE_SLOT_ORDER.filter(slot=>!ids.includes(slot))],positions=Array(20),floors=[];
 for(const [tier,slot]of allocation.entries()){
  const m=mounts[tier],b=buildings[slot],level=b?Math.max(1,Math.min(3,b.level+(b.upgrading?1:0))):1,height=saddleDistrictHeight(level);
  const p={...m,y:m.absoluteY-SADDLE_DECK_Y,tier,level:tier+1,ring:RING_SLOTS.findIndex(list=>list.includes(slot)),height,width:SADDLE_DISTRICT_SIZE.width,depth:SADDLE_DISTRICT_SIZE.depth,vacant:!b};
  positions[slot]=p;
  if(b)floors.push({slot,tier,level,type:b.type,y:p.y,height,underConstruction:b.remaining>0,upgrading:!!b.upgrading,path:worldPath(m),width:.62,surfaceOffset:.109,slots:[slot],zone:m.zone,side:m.side,row:m.row});
 }
 const top=floors.length?Math.max(...floors.map(f=>SADDLE_DECK_Y+f.y+f.height+.14)):30.8;
 const bottom=floors.length?Math.min(...floors.map(f=>SADDLE_DECK_Y+f.y-.5)):29.8;
 return {kind:'saddle',baseY:SADDLE_DECK_Y,rearLoaded:floors.some(f=>f.row>=2||(f.zone==='crown'&&f.row===1)),signature:JSON.stringify(['saddle-v1',ids.map(i=>[i,buildings[i].type,buildings[i].level,!!buildings[i].upgrading,buildings[i].remaining>0])]),order:ids,floors,positions,districtOffset:.14,height:top-SADDLE_DECK_Y,topY:top,minY:bottom,maxY:top,towerTop:top,footprint:{width:20.6,depth:14.55},nextSlot:nextVerticalSlot(buildings,2)};
}
