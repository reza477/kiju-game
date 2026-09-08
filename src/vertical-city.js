import {KAIJU_DECK_Y,KAIJU_CENTER,RING_SLOTS} from './city-layout.js';

// Stable historical IDs are retained for saves; their construction order, not
// their old horizontal coordinates, determines height in a Gothic city.
export const VERTICAL_SLOT_ORDER=Object.freeze([7,11,13,0,1,2,3,4,5,6,8,9,10,12,14,15,16,17,18,19]);
export function verticalOrder(buildings,order=[]){
 const result=[],seen=new Set();
 for(const id of [...order,...VERTICAL_SLOT_ORDER])if(Number.isInteger(id)&&id>=0&&id<20&&buildings[id]&&!seen.has(id)){seen.add(id);result.push(id);}
 return result;
}
export function nextVerticalSlot(buildings,rings=1){return VERTICAL_SLOT_ORDER.find(i=>!buildings[i]&&RING_SLOTS.findIndex(ids=>ids.includes(i))<=rings)??null;}
export function createVerticalLayout(buildings,order=[]){
 const ids=verticalOrder(buildings,order),floors=[],positions=Array(20);let y=0;
 for(const [tier,slot]of ids.entries()){
  const b=buildings[slot],level=Math.min(3,b.level+(b.upgrading?1:0)),height=3.8+.8*(level-1);
  const path=[{x:-3,z:KAIJU_CENTER.z-3.7},{x:3,z:KAIJU_CENTER.z-3.7},{x:3,z:KAIJU_CENTER.z+3.7},{x:-3,z:KAIJU_CENTER.z+3.7}];
  floors.push({slot,tier,level,type:b.type,y,height,underConstruction:b.remaining>0,path,slots:[slot],width:.72,surfaceOffset:.109});
  positions[slot]={x:0,z:KAIJU_CENTER.z,y,tier,level:tier+1,rotation:Math.PI,ring:RING_SLOTS.findIndex(list=>list.includes(slot)),height};y+=height;
 }
 for(const slot of VERTICAL_SLOT_ORDER)if(!positions[slot])positions[slot]={x:0,z:KAIJU_CENTER.z,y,tier:ids.length,level:ids.length+1,rotation:Math.PI,ring:RING_SLOTS.findIndex(list=>list.includes(slot)),height:3.8,vacant:true};
 const signature=JSON.stringify(ids.map(i=>[i,buildings[i].type,buildings[i].level,!!buildings[i].upgrading,buildings[i].remaining>0]));
 return {signature,order:ids,floors,positions,height:y,towerTop:KAIJU_DECK_Y+y+9,footprint:{width:8.8,depth:10.4},nextSlot:nextVerticalSlot(buildings,2)};
}
