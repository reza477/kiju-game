import {KAIJU_DECK_Y,KAIJU_CENTER,RING_SLOTS} from './city-layout.js';

// Stable historical IDs are retained for saves; their construction order, not
// their old horizontal coordinates, determines height in a Gothic city.
export const VERTICAL_SLOT_ORDER=Object.freeze([7,11,13,0,1,2,3,4,5,6,8,9,10,12,14,15,16,17,18,19]);
// The room and gun origins stay centered on the backpack. Only the derived
// public circulation and outer shell step inward at major architectural stages.
// Profiles depend on the storey index, so building above never moves an old path.
export function verticalStoreyProfile(tier,type){
 if(type==='cannon')return {kind:'battery',pathX:3.4,pathFront:3.45,pathBack:3.4,halfWidth:4.4,front:5.2,back:5.2};
 const upper=tier>=13,cloister=tier>=4&&tier<8;
 return upper?{kind:'lantern',pathX:2.25,pathFront:3.45,pathBack:2.25,halfWidth:3.18,front:4.50,back:3.20}
  :cloister?{kind:'cloister',pathX:2.40,pathFront:3.45,pathBack:2.60,halfWidth:3.40,front:4.50,back:3.60}
  :{kind:tier>=8?'great-hall':'keep',pathX:3,pathFront:3.7,pathBack:3.7,halfWidth:4.4,front:5.2,back:5.2};
}
export function verticalProfilePoint(profile,x,z){
 const remap=(value,path,edge,targetPath,targetEdge,protectedExtent)=>{
  const a=Math.abs(value),sign=Math.sign(value);
  if(a<=protectedExtent)return value;
  return sign*(a<=path?protectedExtent+(a-protectedExtent)*(targetPath-protectedExtent)/(path-protectedExtent):targetPath+(a-path)*(targetEdge-targetPath)/(edge-path));
 };
 const offset=z-KAIJU_CENTER.z;
 return [remap(x,3,4.4,profile.pathX,profile.halfWidth,2.1),KAIJU_CENTER.z+remap(offset,3.7,5.2,offset<0?profile.pathFront:profile.pathBack,offset<0?profile.front:profile.back,1.8)];
}
export function verticalOrder(buildings,order=[]){
 const result=[],seen=new Set();
 for(const id of [...order,...VERTICAL_SLOT_ORDER])if(Number.isInteger(id)&&id>=0&&id<20&&buildings[id]&&!seen.has(id)){seen.add(id);result.push(id);}
 return result;
}
export function nextVerticalSlot(buildings,rings=1){return VERTICAL_SLOT_ORDER.find(i=>!buildings[i]&&RING_SLOTS.findIndex(ids=>ids.includes(i))<=rings)??null;}
export function createVerticalLayout(buildings,order=[],variant){
 const heightScale=variant==='cyborg'?.5:1;
 const ids=verticalOrder(buildings,order),floors=[],positions=Array(20);let y=0;
 for(const [tier,slot]of ids.entries()){
  const b=buildings[slot],level=Math.min(3,b.level+(b.upgrading?1:0)),height=(3.8+.8*(level-1))*heightScale;
  const profile=verticalStoreyProfile(tier,b.type),path=[{x:-profile.pathX,z:KAIJU_CENTER.z-profile.pathFront},{x:profile.pathX,z:KAIJU_CENTER.z-profile.pathFront},{x:profile.pathX,z:KAIJU_CENTER.z+profile.pathBack},{x:-profile.pathX,z:KAIJU_CENTER.z+profile.pathBack}];
  floors.push({slot,tier,level,type:b.type,y,height,underConstruction:b.remaining>0,upgrading:!!b.upgrading,path,profile,slots:[slot],width:.72,surfaceOffset:.109*heightScale});
  positions[slot]={x:0,z:KAIJU_CENTER.z,y,tier,level:tier+1,rotation:Math.PI,ring:RING_SLOTS.findIndex(list=>list.includes(slot)),height};y+=height;
 }
 for(const slot of VERTICAL_SLOT_ORDER)if(!positions[slot])positions[slot]={x:0,z:KAIJU_CENTER.z,y,tier:ids.length,level:ids.length+1,rotation:Math.PI,ring:RING_SLOTS.findIndex(list=>list.includes(slot)),height:3.8*heightScale,vacant:true};
 const signature=JSON.stringify([heightScale,ids.map(i=>[i,buildings[i].type,buildings[i].level,!!buildings[i].upgrading,buildings[i].remaining>0])]);
 return {signature,order:ids,floors,positions,height:y,heightScale,weaponScale:heightScale<1?.8:1,districtOffset:.18*heightScale,towerTop:KAIJU_DECK_Y+y+9*heightScale,footprint:{width:8.8,depth:10.4},nextSlot:nextVerticalSlot(buildings,2)};
}
