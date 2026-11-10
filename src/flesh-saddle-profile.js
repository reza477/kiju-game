// The native flesh carrier's fitted cargo coordinates. Layout, structure and
// weapon meshes share this profile; saved district IDs remain independent.
const along=[-6,-9.7,-13.4,-17.1];
const crown=(side,row)=>({x:side*1.83,absoluteY:row?24.3:25.5,z:row?-15.2:-11.2,rotation:Math.PI,zone:'crown',side,row});
// Rear seats clear the actual settled skin and the deep underdeck straps.
// Only those local seats move: the low front load and total width stay fixed.
const flank=(side,row,low=false)=>({x:side*(low?10.5:row===0?6.9:6.65),absoluteY:(low?[21.1,21,20.4,17.2]:[25,24.9,23.6,23.6])[row],z:along[row],rotation:side*Math.PI/2,zone:low?'lower-pannier':'upper-pannier',side,row});
const mounts=[crown(-1,0),flank(-1,1),flank(1,1),crown(1,0),flank(-1,0),flank(1,0),crown(-1,1),crown(1,1),flank(-1,2),flank(1,2),flank(-1,3),flank(1,3),flank(-1,1,true),flank(1,1,true),flank(-1,0,true),flank(1,0,true),flank(-1,2,true),flank(1,2,true),flank(-1,3,true),flank(1,3,true)].map(Object.freeze);
export const FLESH_SADDLE_PROFILE=Object.freeze({
  id:'native-low-cradle-v2',
  mounts:Object.freeze(mounts),
  railX:3.9,
  dorsalReferenceY:24.45,
  railNodes:Object.freeze([[-6.8,25.8],[-10.7,24.6],[-17.1,23.2]].map(Object.freeze)),
  baseGuns:Object.freeze([-1,1].map(side=>Object.freeze({x:side*9.1,y:22.2,z:-1.8}))),
  baseDeck:Object.freeze({width:3.15,depth:3.15,thickness:.55,weaponOffset:.4}),
});

export function fleshSaddleRailY(z){
  const nodes=FLESH_SADDLE_PROFILE.railNodes;
  for(let i=1;i<nodes.length;i++)if(z>=nodes[i][0]||i===nodes.length-1){
    const[a,b]=[nodes[i-1],nodes[i]],t=(z-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;
  }
  return nodes[0][1];
}
