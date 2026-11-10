import {applyFleshSaddleFinish} from './flesh-saddle-finish.js';
import * as T from '../vendor/three.module.js';
import {getMaterial,box,cylinder,beam,batchStatic} from './materials.js';
import {SADDLE_DECK_Y,SADDLE_DISTRICT_SIZE,saddleDistrictHeight} from './saddle-layout.js';
export {createSaddleLayout} from './saddle-layout.js';

// Collision collects these same primitive factories without loading textures or
// requiring a DOM. Material kinds retain the renderer's bevel decisions.
let geometryMaterials;
function geometryPalette(){
 if(!geometryMaterials){geometryMaterials={};for(const [name,kind]of Object.entries({wall:'stone',brick:'brick',trim:'plaster',roof:'roof',dark:'metal',iron:'metal',wood:'wood',leather:'fabric',cloth:'fabric',glass:'glass',light:'window',brass:'gold',paving:'pavement',soil:'soil',leaves:'foliage'})){const material=new T.MeshBasicMaterial();material.name=kind+' geometry-only';material.userData.shared=true;geometryMaterials[name]=material;}}
 return geometryMaterials;
}
function palette(enemy=false){return {wall:getMaterial('stone',0x9ca699),brick:getMaterial('brick',0x8c7060),trim:getMaterial('plaster',0xc1bda4),roof:getMaterial('roof',0x454e58),dark:getMaterial('metal',0x303a3b),iron:getMaterial('metal',0x586363),wood:getMaterial('wood',0x77614c),leather:getMaterial('fabric',0x645443,{sheen:.08,roughness:.88,metalness:0}),cloth:getMaterial('fabric',enemy?0x74404a:0x513549),glass:getMaterial('glass',0x6c8588),light:getMaterial('window',0xc5c0a1),brass:getMaterial('gold',0x9d8960),paving:getMaterial('pavement',0xa8a899),soil:getMaterial('soil',0x4e4437),leaves:getMaterial('foliage',0x60794b)};}
function prism(group,points,depth,material,x=0,y=0,z=0){
 const shape=new T.Shape(points.map(p=>new T.Vector2(...p))),geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geometry.translate(0,0,-depth/2);
 // Extruded gables and pannier boards use the same metres-per-tile scale as
 // boxes, so a small roof does not stretch an entire sheet of slate over it.
 const scale=material.userData.surfaceScale;
 if(scale){const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv[i*2]=(ny>nx&&ny>nz?p.getX(i):nx>nz?p.getZ(i):p.getX(i))/scale;uv[i*2+1]=(ny>nx&&ny>nz?-p.getZ(i):p.getY(i))/scale;}geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.userData.metricUV=true;}
 const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function roof(group,w,d,h,material,y,z=0){return prism(group,[[-w/2,0],[-w*.34,h*.43],[0,h],[w*.34,h*.43],[w/2,0]],d,material,0,y,z);}
function districtRoof(room,type,wallH,p,housing){
 const y=wallH+.02,z=-.12;
 if(type==='keep'){
  // A low stone chapter-house lantern gives the keep its own silhouette.
  // The shoulders and broken parapet remain within the prior mansard roof.
  prism(room,[[-1.15,0],[-.89,.48],[-.50,.60],[.50,.60],[.89,.48],[1.15,0]],1.93,p.roof,0,y,z);
  box(room,.92,.63,1.28,p.wall,0,y+.53,z);
  box(room,.96,.075,1.34,p.trim,0,y+.80,z);
  for(const x of[-.38,0,.38])for(const end of[-1,1])box(room,.16,.13,.16,p.trim,x,y+.87,z+end*.57);
  for(const end of[-1,1]){const face=new T.Group();face.position.set(0,y+.31,z+end*.648);face.rotation.y=end<0?Math.PI:0;pointed(face,.31,.37,p.dark,0,0,0);pointed(face,.20,.27,p.glass,0,.045,.03);room.add(face);}
 }else if(type==='sawmill'){
  prism(room,[[-1.15,0],[-1.15,.24],[-.4,.73],[-.4,.24],[.35,.73],[.35,.24],[1.15,.73],[1.15,0]],1.93,p.roof,0,y,z);
  for(const x of[-.4,.35,1.15])box(room,.055,.49,1.90,p.iron,x,y+.485,z);
 }else if(type==='foundry'){
  const arch=[[-1.15,0],[-1.06,.22],[-.72,.46],[0,.61],[.72,.46],[1.06,.22],[1.15,0]];
  prism(room,arch,1.93,p.dark,0,y,z);
  for(const ribZ of[-.78,.55])for(let i=1;i<arch.length;i++)beam(room,[arch[i-1][0],y+arch[i-1][1]+.025,ribZ],[arch[i][0],y+arch[i][1]+.025,ribZ],.022,p.iron);
 }else{
  const rise=type==='housing'?.83:.73;roof(room,2.30,1.93,rise,housing?.roof??p.roof,y,z);box(room,.08,.08,1.94,housing?(housing.roof===p.wood?p.wood:p.trim):p.iron,0,y+rise,z);
  if(type==='housing')for(const side of[-1,1]){
   const dormer=new T.Group();dormer.position.set(side*.57,y+.16,.73);room.add(dormer);
   prism(dormer,[[-.26,0],[-.26,.25],[0,.46],[.26,.25],[.26,0]],.27,housing.wall);
   pointed(dormer,.25,.28,p.glass,0,.06,.16);roof(dormer,.60,.37,.24,housing.roof,.25);
  }
 }
}
function pointed(group,w,h,material,x,y,z){return prism(group,[[-w/2,0],[-w/2,h*.64],[0,h],[w/2,h*.64],[w/2,0]],.055,material,x,y,z);}
function window(group,x,y,z,p,lit=false){
 pointed(group,.47,.91,p.trim,x,y-.04,z);pointed(group,.34,.75,lit?p.light:p.glass,x,y+.045,z+.04);
 box(group,.035,.69,.04,p.dark,x,y+.38,z+.084);box(group,.37,.045,.04,p.dark,x,y+.33,z+.084);
}
function strap(group,points,material,r=.09){for(let i=1;i<points.length;i++)beam(group,points[i-1],points[i],r,material);}

function pannierFrame(layout,deckY,material,geometryOnly=false){
 const group=new T.Group();group.name='Occupied pannier load frame';group.userData.noBatch=true;
 const links=[];
 // Forged ties join occupied deck rims within their existing envelope.
 // Steep upper gaps remain open for lower cannons and resident circulation.
 const station=(mount,end=0)=>[mount.x+mount.side*(mount.zone==='lower-pannier'?1.86:1.78),deckY+mount.y-.26,mount.z+end*1.69];
 const link=(a,b,kind,slots,width=.20)=>{
  const direction=new T.Vector3(...b).sub(new T.Vector3(...a)),length=direction.length(),w=width,d=.06,c=.015;
  const shape=new T.Shape([[-w/2+c,-d/2],[w/2-c,-d/2],[w/2,-d/2+c],[w/2,d/2-c],[w/2-c,d/2],[-w/2+c,d/2],[-w/2,d/2-c],[-w/2,-d/2+c]].map(p=>new T.Vector2(...p)));
  const geometry=new T.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,steps:1});geometry.translate(0,0,-length/2);geometry.rotateX(-Math.PI/2);
  const mesh=new T.Mesh(geometry,material);mesh.position.set(...a).addScaledVector(direction,.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  links.push({kind,slots:[...slots],a:[...a],b:[...b],width:w,depth:d});
 };
 const occupied=new Map((layout?.floors??[]).map(f=>{const m=layout.positions[f.slot];return[`${m.side}:${m.zone}:${m.row}`,{slot:f.slot,mount:m}];}));
 for(const side of[-1,1]){
  for(const zone of['upper-pannier','lower-pannier'])for(let row=0;row<3;row++){
   if(zone==='upper-pannier'&&row>0)continue;
   const front=occupied.get(`${side}:${zone}:${row}`),rear=occupied.get(`${side}:${zone}:${row+1}`);
   if(front&&rear){
    const a=station(front.mount,-1),b=station(rear.mount,1),slots=[front.slot,rear.slot],width=zone==='lower-pannier'?.06:.20;
    // A steep diagonal would cross the next lower gun's yaw sweep. Carry its
    // load along the upper deck underside, then down outside the lower rim.
    // Both original bearing points and the approved outer width are retained.
    if(zone==='lower-pannier'&&a[1]-b[1]>1){
     const upper=[b[0],a[1],b[2]+.16],lower=[b[0],b[1],upper[2]];
     link(a,upper,'underdeck-joist',slots,width);link(upper,lower,'underdeck-joist',slots,width);link(lower,b,'underdeck-joist',slots,width);
    }else link(a,b,'underdeck-joist',slots,width);
   }
  }
 }
 group.userData.pannierLinks=links;if(!geometryOnly)applyFleshSaddleFinish(group);return geometryOnly?group:batchStatic(group);
}

export function createSaddleFoundation(deckY=SADDLE_DECK_Y,enemy=false,layout,{geometryOnly=false}={}){
 const group=new T.Group();group.name='Flesh colossus saddle and flank pannier decks';const p=geometryOnly?geometryPalette():palette(enemy);
 // The carrier owns the continuous skin-following girdles. Foundation rebuilds
 // only recreate occupied cargo decks, never a second static belt in the torso.
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
 const frame=pannierFrame(layout,deckY,p.iron,geometryOnly);if(frame.userData.pannierLinks.length)group.add(frame);
 group.userData.saddleCity=true;group.userData.layoutSignature=layout?.signature;group.userData.buildableSlots=layout?.floors.length??0;group.userData.surfaceLevels=(layout?.floors??[]).map(f=>deckY+f.y+f.surfaceOffset);
 if(!geometryOnly)applyFleshSaddleFinish(group);return geometryOnly?group:batchStatic(group);
}

export function createSaddleDistrict(type,level=1,{enemy=false,zone='crown',geometryOnly=false}={}){
 const g=new T.Group(),p=geometryOnly?geometryPalette():palette(enemy);g.name=`Gothic saddle ${type}`;level=Math.max(1,Math.min(3,level));const height=saddleDistrictHeight(level),wallH=1.72+.18*(level-1),front=.71;
 // Construction upgrades replace timber with stone and slate on the same
 // faces. All three material families use the original unbevelled box shape;
 // the factory retains its shared metric-UV variants without mutating them.
 const housing=type==='housing'?{wall:level<3?p.trim:p.wall,frame:level===1?p.wood:p.wall,roof:level===1?p.wood:p.roof}:null;
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
  const wall=housing?.wall??(type==='foundry'?p.brick:type==='sawmill'?p.trim:p.wall);
  box(room,2.05,wallH,1.62,wall,0,wallH/2,-.12);box(room,2.18,.14,1.78,housing?.frame??p.trim,0,.10,-.12);box(room,2.16,.12,1.74,housing?.frame??p.trim,0,wallH-.02,-.12);
  districtRoof(room,type,wallH,p,housing);
  pointed(room,.69,1.64,p.trim,0,.06,front+.015);pointed(room,.52,1.51,p.wood,0,.075,front+.066);box(room,.06,.78,.027,p.brass,.13,.65,front+.11);
  for(const side of[-1,1]){
   const frontLit=side<0&&(type==='keep'||type==='sawmill')||side>0&&type==='housing';
   window(room,side*.76,.53,front+.025,p,frontLit);
   for(const z of[-.84,.68]){box(room,.16,wallH+.12,.18,housing?.frame??p.trim,side*.99,(wallH+.12)/2,z);}
   const sideLit=side<0&&type==='housing'||side>0&&type==='foundry';
   const face=new T.Group();face.position.set(side*1.04,0,-.12);face.rotation.y=side*Math.PI/2;window(face,0,.57,0,p,sideLit);room.add(face);
  }
  if(type==='keep'){
   const flag=prism(room,[[-.22,0],[-.22,-.54],[0,-.70],[.22,-.54],[.22,0]],.025,p.cloth,0,wallH+.07,front+.14);flag.name='Saddle chapter pennant';
   for(const side of[-1,1])cylinder(room,0,.12,.32,p.iron,side*.95,wallH+.31,-.83,4);
  }
  if(type==='sawmill'||type==='foundry'){
   const forge=type==='foundry';box(room,.43,.55,.38,forge?p.iron:p.wood,.73,.38,1.0);
   for(let i=0;i<3;i++){const stock=cylinder(room,.09,.09,.64,forge?p.iron:p.wood,-.73,.18+i*.15,1.03,6);stock.rotation.z=Math.PI/2;}
   if(forge){box(room,.32,.68,.33,p.brick,.60,wallH+.49,-.46);box(room,.38,.10,.39,p.iron,.60,wallH+.80,-.46);const smoke=new T.Object3D();smoke.position.set(.6,wallH+.87,-.46);smoke.userData.smokestack=true;room.add(smoke);}
   else for(const side of[-1,1]){box(room,.10,wallH,.075,p.wood,side*.47,wallH/2,front+.045);beam(room,[side*.50,.28,front+.08],[side*.91,wallH-.18,front+.08],.035,p.wood);}
  }
  if(type==='armor')for(const side of[-1,1]){prism(room,[[-.20,.30],[-.17,-.18],[0,-.34],[.17,-.18],[.20,.30]],.05,p.iron,side*.7,.99,front+.14);beam(room,[side*.7-.15,.55,front+.20],[side*.7+.15,1.48,front+.20],.025,p.brass);}
 }
 if(level>1)for(const side of[-1,1])box(room,.09,.09,1.79,p.brass,side*1.10,wallH-.10,-.12);
 if(level>2)for(const side of[-1,1]){const awning=box(room,.53,.055,.52,p.cloth,side*.76,1.62,1.0);awning.rotation.x=.16;beam(room,[side*.95,1.52,front],[side*.95,1.55,1.2],.025,p.iron);}
 Object.assign(g.userData,{saddleDistrict:{type,level,zone,height},naturalDoorHeight:1.51,footprint:{...SADDLE_DISTRICT_SIZE}});
 if(!geometryOnly)applyFleshSaddleFinish(g);return g;
}
