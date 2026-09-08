// Shared simulation/rendering layout. Historical slot IDs and expansion fields
// remain stable while the playable districts occupy floors of one fortress.
export const KAIJU_SCALE = .55;
export const KAIJU_DECK_Y = 34;
export const KAIJU_CENTER = Object.freeze({x:0,z:-12});
export const KAIJU_FLOOR_SPACING = 8.2;
export const KAIJU_RING_RADII = Object.freeze([7.5,7.5,7.5]);
export const RING_SLOTS = Object.freeze([
  Object.freeze([7]),
  Object.freeze([11,13,0,1,2,3]),
  Object.freeze([4,5,6,8,9,10,12,14,15,16,17,18,19]),
]);
export const KAIJU_FLOOR_SLOTS = Object.freeze([
  Object.freeze([7,11,13,0]),Object.freeze([1,2,3,4]),
  Object.freeze([5,6,8,9]),Object.freeze([10,12,14,15]),
  Object.freeze([16,17,18,19]),
]);
const positions=new Map();
KAIJU_FLOOR_SLOTS.forEach((slots,tier)=>slots.forEach((id,sector)=>{
  positions.set(id,Object.freeze({x:sector%2?3.1:-3.1,y:tier*KAIJU_FLOOR_SPACING,z:KAIJU_CENTER.z+(sector<2?-2.4:2.4),rotation:sector<2?Math.PI:0,ring:RING_SLOTS.findIndex(list=>list.includes(id)),sector:sector+1,tier,level:tier+1}));
}));
export function kaijuSlotPosition(i){const p=positions.get(i);if(!p)throw new RangeError(`Unknown kaiju plot: ${i}`);return{...p};}
export function kaijuRingRadius(){return 7.5;}
export function kaijuFloorCount(rings=1){return rings>=2?5:rings>=1?2:1;}
export function kaijuTowerTop(rings=1){return KAIJU_DECK_Y+(kaijuFloorCount(rings)-1)*KAIJU_FLOOR_SPACING+(rings>=2?13.2:21.2);}

/** Pedestrian loops lie on the same authored slabs as their building districts. */
export function kaijuWalkFloors(rings=1){
  const stage=Math.max(0,Math.min(2,Math.floor(rings))),count=kaijuFloorCount(stage);
  return KAIJU_FLOOR_SLOTS.slice(0,count).map((ids,tier)=>({
    tier,level:tier+1,y:tier*KAIJU_FLOOR_SPACING,
    slots:ids.filter(id=>positions.get(id).ring<=stage),
    path:[{x:-5,z:KAIJU_CENTER.z-4.8},{x:5,z:KAIJU_CENTER.z-4.8},{x:5,z:KAIJU_CENTER.z+4.8},{x:-5,z:KAIJU_CENTER.z+4.8}],
    width:.72,surfaceOffset:.109,
  }));
}
