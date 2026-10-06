import * as T from '../vendor/three.module.js';
import {getMaterial,box,cylinder,beam,batchStatic} from './materials.js';
import {SADDLE_DECK_Y,SADDLE_DISTRICT_SIZE,saddleDistrictHeight} from './saddle-layout.js';
export {createSaddleLayout} from './saddle-layout.js';

function palette(enemy=false){return {wall:getMaterial('stone',0x9ca699),trim:getMaterial('plaster',0xc1bda4),roof:getMaterial('roof',0x454e58),dark:getMaterial('metal',0x303a3b),iron:getMaterial('metal',0x586363),wood:getMaterial('wood',0x77614c),leather:getMaterial('fabric',0x645443),cloth:getMaterial('fabric',enemy?0x74404a:0x513549),glass:getMaterial('glass',0x6c8588),light:getMaterial('window',0xc5c0a1),brass:getMaterial('gold',0x9d8960),paving:getMaterial('pavement',0xa8a899),soil:getMaterial('soil',0x4e4437),leaves:getMaterial('foliage',0x60794b)};}
function prism(group,points,depth,material,x=0,y=0,z=0){
 const shape=new T.Shape(points.map(p=>new T.Vector2(...p))),geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geometry.translate(0,0,-depth/2);
 const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function roof(group,w,d,h,material,y,z=0){return prism(group,[[-w/2,0],[-w*.34,h*.43],[0,h],[w*.34,h*.43],[w/2,0]],d,material,0,y,z);}
function pointed(group,w,h,material,x,y,z){return prism(group,[[-w/2,0],[-w/2,h*.64],[0,h],[w/2,h*.64],[w/2,0]],.055,material,x,y,z);}
function window(group,x,y,z,p,lit=false){
 pointed(group,.47,.91,p.trim,x,y-.04,z);pointed(group,.34,.75,lit?p.light:p.glass,x,y+.045,z+.04);
 box(group,.035,.69,.04,p.dark,x,y+.38,z+.084);box(group,.37,.045,.04,p.dark,x,y+.33,z+.084);
}
function strap(group,points,material,r=.09){for(let i=1;i<points.length;i++)beam(group,points[i-1],points[i],r,material);}

export function createSaddleFoundation(deckY=SADDLE_DECK_Y,enemy=false,layout){
 const group=new T.Group();group.name='Flesh colossus saddle and flank pannier decks';const p=palette(enemy);
 // Two broad girdles descend from the spine, down the panniers and beneath
 // the belly. They visually bind the separate loads into a riding saddle.
 for(const z of[-7.85,-15.25]){
  if(z<-10&&!layout?.rearLoaded)continue;
  const rear=z<-10,top=rear?24.3:29,ys=rear?[22.8,20.6,17.2,15.9,14.6]:[27.5,23.9,20.2,17.8,16.4];
  const outline=[[-3.45,top-.43,z],[-5.45,ys[0],z],[-6.52,ys[1],z],[-7.17,ys[2],z],[-5.22,ys[3],z],[0,ys[4],z],[5.22,ys[3],z],[7.17,ys[2],z],[6.52,ys[1],z],[5.45,ys[0],z],[3.45,top-.43,z]];
  for(let i=1;i<outline.length;i++){
   const a=new T.Vector3(...outline[i-1]),b=new T.Vector3(...outline[i]),v=b.clone().sub(a),belt=box(group,.27,v.length(),.36,p.leather);
   belt.position.copy(a).addScaledVector(v,.5);belt.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());
  }
  for(const side of[-1,1]){const y=rear?18.9:22.1;box(group,.17,.98,.4,p.brass,side*6.85,y,z);box(group,.19,.63,.26,p.dark,side*6.86,y,z);box(group,.21,.09,.32,p.brass,side*6.98,y,z);}
 }
 for(const f of layout?.floors??[]){
  const mount=layout.positions[f.slot],g=new T.Group();g.name=`Saddle deck for district ${f.slot}`;g.position.set(mount.x,deckY+mount.y,mount.z);g.rotation.y=mount.rotation;
  Object.assign(g.userData,{saddleDistrict:true,slot:f.slot,tier:f.tier});group.add(g);
  // A tapered wooden pannier, metal corners and a fabric roll replace the
  // thick castle slab. Every visible walking deck belongs to an occupied ID.
  prism(g,[[-1.57,-.40],[-1.73,-.07],[1.73,-.07],[1.57,-.40]],3.8,p.wood);
  box(g,3.46,.14,3.8,p.iron,0,-.05,0);box(g,3.42,.10,3.76,p.paving,0,.04,0);
  for(const side of[-1,1]){
   for(const z of[-1.65,1.65]){box(g,.13,.66,.13,p.iron,side*1.65,.34,z);cylinder(g,.095,.095,.065,p.brass,side*1.65,.705,z,6);}
   beam(g,[side*1.65,.65,-1.65],[side*1.65,.65,1.65],.034,p.iron);
   for(const z of[-1.37,1.37])box(g,.09,.38,.16,p.brass,side*1.7,-.12,z);
  }
  beam(g,[-1.65,.65,-1.65],[1.65,.65,-1.65],.034,p.iron);
  for(const side of[-1,1])beam(g,[side*1.65,.65,1.65],[side*.55,.65,1.65],.034,p.iron);
  if(mount.zone!=='crown'){
   const roll=cylinder(g,.21,.21,2.8,p.cloth,0,-.31,1.65,8);roll.rotation.z=Math.PI/2;
   for(const x of[-.98,.98])box(g,.15,.46,.44,p.leather,x,-.31,1.65);
   strap(g,[[-1.1,-.31,-1.63],[-1.1,-1.18,-.2],[-1.1,-.31,1.55]],p.iron,.065);
   strap(g,[[1.1,-.31,-1.63],[1.1,-1.18,-.2],[1.1,-.31,1.55]],p.iron,.065);
  }
 }
 group.userData.saddleCity=true;group.userData.layoutSignature=layout?.signature;group.userData.buildableSlots=layout?.floors.length??0;group.userData.surfaceLevels=(layout?.floors??[]).map(f=>deckY+f.y+f.surfaceOffset);
 return batchStatic(group);
}

export function createSaddleDistrict(type,level=1,{enemy=false,zone='crown'}={}){
 const g=new T.Group(),p=palette(enemy);g.name=`Gothic saddle ${type}`;level=Math.max(1,Math.min(3,level));const height=saddleDistrictHeight(level),wallH=1.72+.18*(level-1),front=.71;
 // Human doors and circulation remain full sized; upgrades enrich their own
 // small chamber rather than increasing the entire city's height or width.
 const room=new T.Group();room.name='Compact occupied Gothic chamber';g.add(room);
 if(type==='farm'){
  for(const side of[-1,1]){
   box(room,.60,.42,1.60,p.wood,side*.57,.27,-.07);box(room,.52,.035,1.51,p.soil,side*.57,.50,-.07);
   for(let i=0;i<4;i++){const z=-.67+i*.4;for(const a of[-.7,.7]){const leaf=prism(room,[[-.13,0],[0,.51],[.13,.16]],.025,p.leaves,side*.57,.53,z);leaf.rotation.z=a;}}
  }
  for(const side of[-1,1])for(const z of[-.9,.82])box(room,.075,wallH,.075,p.iron,side*1.05,wallH/2,z);
  for(const z of[-.9,.82]){beam(room,[-1.05,wallH,z],[0,wallH+.60,z],.048,p.iron);beam(room,[0,wallH+.60,z],[1.05,wallH,z],.048,p.iron);}
  for(const side of[-1,1]){const shade=box(room,1.23,.045,1.76,p.glass,side*.525,wallH+.29,-.04);shade.rotation.z=-side*.52;}
 }else{
  box(room,2.05,wallH,1.62,p.wall,0,wallH/2,-.12);box(room,2.18,.14,1.78,p.trim,0,.10,-.12);box(room,2.16,.12,1.74,p.trim,0,wallH-.02,-.12);
  const roofRise=type==='keep'?.90:type==='housing'?.83:.73;
  roof(room,2.30,1.93,roofRise,p.roof,wallH+.02,-.12);box(room,.08,.08,1.94,p.iron,0,wallH+roofRise+.02,-.12);
  pointed(room,.69,1.64,p.trim,0,.06,front+.015);pointed(room,.52,1.51,p.wood,0,.075,front+.066);box(room,.06,.78,.027,p.brass,.13,.65,front+.11);
  for(const side of[-1,1]){
   window(room,side*.76,.53,front+.025,p,side<0&&type==='keep');
   for(const z of[-.84,.68]){box(room,.16,wallH+.12,.18,p.trim,side*.99,(wallH+.12)/2,z);}
   const face=new T.Group();face.position.set(side*1.04,0,-.12);face.rotation.y=side*Math.PI/2;window(face,0,.57,0,p,false);room.add(face);
  }
  if(type==='keep'){
   const flag=prism(room,[[-.22,0],[-.22,-.54],[0,-.70],[.22,-.54],[.22,0]],.025,p.cloth,0,wallH+.07,front+.14);flag.name='Saddle chapter pennant';
   for(const side of[-1,1])cylinder(room,0,.12,.32,p.iron,side*.95,wallH+.31,-.83,4);
  }
  if(type==='sawmill'||type==='foundry'){
   const forge=type==='foundry';box(room,.43,.55,.38,forge?p.iron:p.wood,.73,.38,1.0);
   for(let i=0;i<3;i++){const stock=cylinder(room,.09,.09,.64,forge?p.iron:p.wood,-.73,.18+i*.15,1.03,6);stock.rotation.z=Math.PI/2;}
   if(forge){box(room,.32,.52,.33,p.dark,.60,wallH+.57,-.46);const smoke=new T.Object3D();smoke.position.set(.6,wallH+.87,-.46);smoke.userData.smokestack=true;room.add(smoke);}
  }
  if(type==='armor')for(const side of[-1,1]){prism(room,[[-.20,.30],[-.17,-.18],[0,-.34],[.17,-.18],[.20,.30]],.05,p.iron,side*.7,.99,front+.14);beam(room,[side*.7-.15,.55,front+.20],[side*.7+.15,1.48,front+.20],.025,p.brass);}
 }
 if(level>1)for(const side of[-1,1])box(room,.09,.09,1.79,p.brass,side*1.10,wallH-.10,-.12);
 if(level>2)for(const side of[-1,1]){const awning=box(room,.53,.055,.52,p.cloth,side*.76,1.62,1.0);awning.rotation.x=.16;beam(room,[side*.95,1.52,front],[side*.95,1.55,1.2],.025,p.iron);}
 Object.assign(g.userData,{saddleDistrict:{type,level,zone,height},naturalDoorHeight:1.51,footprint:{...SADDLE_DISTRICT_SIZE}});
 return g;
}
