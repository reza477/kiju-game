import * as T from '../vendor/three.module.js';
import {getMaterial} from './materials.js';
import {KAIJU_CENTER,kaijuWalkFloors} from './city-layout.js';
import {updateCitizenBounds} from './citizen-visibility.js';

const MAX_PEOPLE=48;
const TAU=Math.PI*2;
const bell=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
const SKIN=[0x694432,0x87583f,0xaf7857,0xc99470,0xdfb78f,0xf0d1ac];
const HAIR=[0x242325,0x49362c,0x76513a,0xa88254,0x6c3b30,0xb1aaa0];
const WARDROBES={
 airship:{names:['Embroidered waistcoat and loose trousers','Long robe with woven sash','Layered tunic and headwrap','Split robe and round cap','Draped coat and full skirt','Short vest and wide trousers','Long tunic with shoulder scarf','Patterned coat and cloth cap'],colors:[0x307f80,0xd2b489,0xe0d1b2,0xa5694d,0x526c83,0x956578],accents:[0xe5d5aa,0x528e90,0xaf744c,0xd0a45f],trim:0xd7b16d},
 crawler:{names:['Tailored frock coat','Waistcoat and rolled sleeves','Walking skirt and fitted jacket','Long overcoat and flat cap','Tailcoat and top hat','Work shirt and suspenders','High collar and day dress','Short coat and bowler cap'],colors:[0x304457,0x715342,0x43544f,0x605269,0x827058,0x433b33],accents:[0xc0ac8a,0x936e55,0x829197,0xb4ab95],trim:0xb9a57d},
 kaiju:{names:['High-collared longcoat','Cape and fitted waistcoat','Long skirt and structured bodice','Hooded travelling coat','Layered dark tunic','Burgundy coat with silver trim','Long cape and high collar','Pleated skirt and short mantle'],colors:[0x45374e,0x6b4865,0x793d51,0x292d39,0x565569,0x3d3a50],accents:[0x98749b,0x884f65,0x665775,0xaaa2a7],trim:0xbfc0c9}
};
const geometryCache=new Map();
function geometry(name,create){if(!geometryCache.has(name)){const value=create();value.userData.shared=true;geometryCache.set(name,value);}return geometryCache.get(name);}
let plainMaterial;
function plain(){if(!plainMaterial){plainMaterial=new T.MeshStandardMaterial({color:0xffffff,roughness:.86,metalness:0});plainMaterial.userData.shared=true;}return plainMaterial;}
let faceSurface;
function faceMaterial(){if(!faceSurface){faceSurface=new T.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.66,specularIntensity:.32,sheen:.12,sheenColor:0xd88b73,sheenRoughness:.85});faceSurface.userData.shared=true;}return faceSurface;}
function thickCloth(g,thickness){
 const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,positions=[],uv=[],indices=Array.from(g.index.array),edges=new Map(),count=p.count;
 for(let side=0;side<2;side++)for(let i=0;i<count;i++){positions.push(p.getX(i)-side*n.getX(i)*thickness,p.getY(i)-side*n.getY(i)*thickness,p.getZ(i)-side*n.getZ(i)*thickness);uv.push(u.getX(i),u.getY(i));}
 for(let i=0;i<g.index.count;i+=3){const a=g.index.getX(i),b=g.index.getX(i+1),c=g.index.getX(i+2);indices.push(c+count,b+count,a+count);for(const[x,y]of[[a,b],[b,c],[c,a]]){const key=Math.min(x,y)+':'+Math.max(x,y);if(edges.has(key))edges.delete(key);else edges.set(key,[x,y]);}}
 for(const[a,b]of edges.values())indices.push(a,b+count,b,a,a+count,b+count);
 g.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.setAttribute('uv',new T.Float32BufferAttribute(uv,2));result.setIndex(indices);result.computeVertexNormals();return result;
}
function capeGeometry(){
 const g=new T.BufferGeometry(),positions=[],uv=[],indices=[],columns=18,rows=14;
 for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){const u=x/columns,v=y/rows,a=u*2-1,w=.32+.19*v;positions.push(a*w,.55-v*(1.04+.045*Math.cos(a*Math.PI)),-.055-.28*v-.09*(1-a*a)+.035*Math.cos(a*Math.PI*5)*(v*.7+.3));uv.push(u,v);if(x<columns&&y<rows){const i=y*(columns+1)+x;indices.push(i,i+columns+1,i+1,i+1,i+columns+1,i+columns+2);}}
 g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return thickCloth(g,.035);
}
function torsoGeometry(){
 const g=new T.CylinderGeometry(.5,.5,1,24,12),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getX(i),p.getZ(i)),waist=bell(y,-.25,.20),width=.99-.20*waist-.10*bell(y,.50,.10),fold=.015*Math.sin(a*9+y*12)*(.45+.55*waist);p.setXYZ(i,p.getX(i)*width+Math.sin(a)*fold,y,p.getZ(i)+Math.cos(a)*fold);}
 g.computeVertexNormals();return g;
}
function headContour(x,y,z){const front=Math.max(0,z),jaw=1-.19*bell(y,-.58,.32),eye=bell(Math.abs(x),.38,.20)*bell(y,.10,.19);let zz=z;
 if(z>0){zz+=.21*bell(y,-.48,.19)*bell(x,0,.49);zz-=.18*eye;zz+=.13*bell(y,.35,.12);zz+=.16*bell(Math.abs(x),.53,.20)*bell(y,-.14,.19);zz+=.31*bell(x,0,.14)*bell(y,-.02,.36);zz-=.10*bell(Math.abs(x),.25,.08)*bell(y,-.32,.16);}
 return[x*jaw,y,zz];}
function citizenHead(){const g=new T.SphereGeometry(1,32,26),p=g.attributes.position,colors=[];for(let i=0;i<p.count;i++){
 const x=p.getX(i),y=p.getY(i),z=p.getZ(i),front=Math.max(0,z),eye=bell(Math.abs(x),.38,.20)*bell(y,.10,.19);
 p.setXYZ(i,...headContour(x,y,z));const shade=1-.16*eye*front-.07*bell(y,-.65,.13)*front,cheek=bell(Math.abs(x),.50,.26)*bell(y,-.18,.22)*front;colors.push(shade,shade-.065*cheek,shade-.09*cheek);
 }g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
function hairGeometry(){const g=new T.SphereGeometry(1,24,14),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z),lock=.025*Math.cos(a*13+y*8);p.setXYZ(i,x*(1+lock),y+(z>0?.12*Math.sin(x*2):0),z*(1+lock));}g.computeVertexNormals();return g;}
function scalpGeometry(hood=false){
 const positions=[],uv=[],indices=[],edges=40,rows=18;
 for(let row=0;row<=rows;row++)for(let j=0;j<=edges;j++){
  const a=j===edges?0:j/edges*TAU,front=Math.max(0,Math.cos(a)),v=row/rows,line=hood?-.62+.94*front**3:-.44+.88*front**3,theta=v*Math.acos(line),x=Math.sin(a)*Math.sin(theta),y=Math.cos(theta),z=Math.cos(a)*Math.sin(theta),p=headContour(x,y,z),volume=hood?1.22:1.035;
  const lock=hood?.009*Math.cos(a*6+v*3):.010*Math.sin(a*9+v*2)*Math.sin(theta);positions.push(p[0]*(volume+lock),p[1]*volume,p[2]*(volume+lock));uv.push(j/edges,v);
  if(row<rows&&j<edges){const i=row*(edges+1)+j;indices.push(i,i+edges+1,i+1,i+1,i+edges+1,i+edges+2);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return thickCloth(g,hood?.055:.025);
}
function garmentGeometry(tails=false){const g=new T.CylinderGeometry(.30,.5,1,32,16,true,Math.PI/3,tails?Math.PI*4/3:TAU),p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getX(i),p.getZ(i)),pleat=.014*Math.cos(a*9)*(1.15-y),bias=.008*Math.sin(a*4+y*5),hem=.011*bell(y,-.48,.045);p.setXYZ(i,p.getX(i)+Math.sin(a)*(pleat+bias+hem),y,p.getZ(i)+Math.cos(a)*(pleat+bias+hem));}g.computeVertexNormals();return thickCloth(g,.037);}
function lapelGeometry(){const s=new T.Shape();s.moveTo(-.25,.5);s.quadraticCurveTo(.16,.36,.32,.22);s.lineTo(.12,.10);s.quadraticCurveTo(-.02,-.17,-.20,-.43);s.quadraticCurveTo(-.18,-.10,-.25,.5);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.07,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:2,curveSegments:5,steps:1});g.translate(0,0,-.02);return g;}
function cuffGeometry(){return new T.LatheGeometry([[.38,-.5],[.5,-.5],[.51,-.35],[.50,.42],[.47,.5],[.37,.5],[.38,-.5]].map(p=>new T.Vector2(...p)),20);}
function shoeGeometry(){const g=new T.SphereGeometry(1,18,12),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,x*(z>0?1: .80),Math.max(-.70,y),z);}g.computeVertexNormals();return g;}
function waistcoatGeometry(){const positions=[],uv=[],indices=[],cols=16,rows=14;for(let row=0;row<=rows;row++)for(let j=0;j<=cols;j++){
 const u=j/cols*2-1,v=row/rows,top=.5-.30*(1-Math.abs(u))**2,bottom=-.5+.11*Math.abs(u),y=top+(bottom-top)*v,width=.49-.10*bell(y,-.28,.22),x=u*width,z=.40-1.18*u*u+.045*Math.sin(y*12+u*3)*bell(y,-.22,.24);positions.push(x,y,z);uv.push(j/cols,v);if(row<rows&&j<cols){const i=row*(cols+1)+j;indices.push(i,i+cols+1,i+1,i+1,i+cols+1,i+cols+2);}
 }const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return thickCloth(g,.16);}
function sleeveGeometry(){const g=new T.CylinderGeometry(.40,.46,1,16,10),p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getX(i),p.getZ(i)),fold=.015*Math.sin(y*12+a*2)*bell(Math.abs(y),.33,.18),taper=1-.10*bell(y,-.40,.14);p.setXYZ(i,p.getX(i)*taper+Math.sin(a)*fold,y,p.getZ(i)*taper+Math.cos(a)*fold);}g.computeVertexNormals();return g;}
function palmGeometry(){const g=new T.SphereGeometry(1,18,14),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),width=.83+.15*bell(y,-.18,.57);p.setXYZ(i,x*width,y,z*(.77+.12*bell(x,-.38,.36))+.06*bell(y,.02,.6)*Math.cos(x*9));}g.computeVertexNormals();return g;}
function movingCloth(g,cape=false){
 // Native morph targets work in the lit, shadow and distance passes alike.
 // Every authored vertex retains its exact height, including the fixed collar
 // and hem, so compact-castle headroom and the natural human scale are stable.
 const p=g.attributes.position,poses=[],normals=[];
 for(const sign of[-1,1]){
  const result=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),loose=T.MathUtils.clamp((.5-y)/.98,0,1),weight=loose*loose;
   const angle=sign*weight*(cape?.24:.17),c=Math.cos(angle),s=Math.sin(angle),fold=1-weight*.035*(1+Math.cos(x*19+y*9));
   result[i*3]=(x*c-z*s)*fold;result[i*3+1]=y;result[i*3+2]=(x*s+z*c)*fold;
  }
  const pose=new T.Float32BufferAttribute(result,3),shape=new T.BufferGeometry();shape.setAttribute('position',pose);shape.setIndex(g.index);shape.computeVertexNormals();poses.push(pose);normals.push(shape.attributes.normal);
 }
 g.morphAttributes.position=poses;g.morphAttributes.normal=normals;g.userData.movingCloth=true;return g;
}
function braidGeometry(){const points=[];for(let i=0;i<=24;i++){const t=i/24;points.push(new T.Vector3((t-.5)*1,.13*Math.sin(t*Math.PI)-.07,.035*Math.sin(t*Math.PI*10)));}return new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.035,6,false);}
function wardrobe(faction,index){
 const set=WARDROBES[faction],style=index%8;
 const skinTone=SKIN[(index*5+Math.floor(index/6))%SKIN.length];
 const primary=set.colors[(index*7+Math.floor(index/8))%set.colors.length];
 const accent=set.accents[(index*3+Math.floor(index/5))%set.accents.length];
 let skirt=false,tails=false,cape=false,hat='none',collar=false,vest=true,robe=false;
 if(faction==='airship'){
  skirt=[1,4,6].includes(style);robe=[1,2,3,6].includes(style);tails=[2,3,7].includes(style);cape=style===4;
  hat=style===2?'wrap':[3,7].includes(style)?'cap':'none';collar=style===7;
 }else if(faction==='crawler'){
  skirt=[2,6].includes(style);tails=[0,3,4].includes(style);hat=style===3?'flat':style===4?'top':style===7?'bowler':'none';collar=[0,4,6].includes(style);vest=style!==6;
 }else{
  skirt=[2,7].includes(style);tails=[0,3,5].includes(style);cape=[1,6,7].includes(style);hat=style===3?'hood':'none';collar=[0,1,5,6].includes(style);
 }
 return {id:index,style,wardrobe:set.names[style],primary,accent,trim:set.trim,skinTone,hairTone:HAIR[(index*3+Math.floor(index/4))%HAIR.length],hairStyle:(index+Math.floor(index/8))%5,heightFactor:.95+(index*7%11)*.009,widthFactor:.92+(index*11%9)*.025,depthFactor:.96+(index%4)*.025,skirt,tails,cape,hat,collar,vest,robe,bag:index%6===1,phase:index*1.793,direction:index%3===0?-1:1};
}

/** Create citizens without rescaling routes or the deck itself. `scale` is the carrier's world scale. */
export function createCitizens(parent,deckY,faction,{scale=1,slotPositions=[],layout='deck',rings=1}={}){
 if(!WARDROBES[faction])throw new Error(`Unknown citizen faction: ${faction}`);
 if(!Number.isFinite(scale)||scale<=0)throw new Error('Citizen carrier scale must be positive.');
 const group=new T.Group();group.name=`${faction}-citizens`;group.position.y=deckY+(layout==='tower'?.109:['circular','circle','rings'].includes(layout)?.067:.15);group.userData.noBatch=true;parent.add(group);
 const cloth=getMaterial('fabric',0xffffff,{side:T.DoubleSide}),solid=plain();
 const sphere=geometry('citizen-sphere',()=>new T.SphereGeometry(1,16,12));
 const cylinder=geometry('citizen-cylinder',()=>new T.CylinderGeometry(.5,.5,1,10));
 const cube=geometry('citizen-box',()=>new T.BoxGeometry(1,1,1));
 const specs={
  torso:[geometry('citizen-tailored-torso',torsoGeometry),cloth,1],shoulders:[sphere,cloth,2],
  vest:[geometry('citizen-waistcoat',waistcoatGeometry),cloth,1],limbs:[geometry('citizen-sleeves',sleeveGeometry),cloth,8],skin:[sphere,solid,18],hands:[geometry('citizen-palm',palmGeometry),solid,2],heads:[geometry('citizen-head',citizenHead),faceMaterial(),1],
  shoes:[geometry('citizen-shoe',shoeGeometry),solid,2],hair:[geometry('citizen-hair',hairGeometry),solid,6],
  scalp:[geometry('citizen-fitted-scalp',()=>scalpGeometry()),solid,1],hoods:[geometry('citizen-fitted-hood',()=>scalpGeometry(true)),cloth,1],
  skirt:[geometry('citizen-skirt',()=>movingCloth(garmentGeometry())),cloth,1],
  tails:[geometry('citizen-coattails',()=>movingCloth(garmentGeometry(true))),cloth,1],
  cape:[geometry('citizen-cape',()=>movingCloth(capeGeometry(),true)),cloth,1],collar:[cylinder,cloth,2],
  headwear:[cylinder,cloth,3],brim:[cylinder,cloth,1],
  details:[geometry('citizen-detail',()=>new T.SphereGeometry(1,10,8)),solid,40],trim:[cube,cloth,36],bags:[cube,cloth,4],lapels:[geometry('citizen-folded-lapel',lapelGeometry),cloth,2],cuffs:[geometry('citizen-lined-cuff',cuffGeometry),cloth,2],braid:[geometry('citizen-braided-trim',braidGeometry),getMaterial('fabric',0xffffff,{roughness:.71}),4]
 };
 const buckets={},instances={};
 for(const [name,[shape,material,perPerson]]of Object.entries(specs)){
  const capacity=MAX_PEOPLE*perPerson,mesh=new T.InstancedMesh(shape,material,capacity);
  if(shape.userData.movingCloth)mesh.setMorphAt(0,{morphTargetInfluences:[0,0]});
  mesh.name=`citizens-${name}`;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=true;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.noBatch=true;
  // Preallocate instance colors once. Their values are only resent when a slot changes.
  mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(capacity*3),3);mesh.instanceColor.setUsage(T.DynamicDrawUsage);
  group.add(mesh);instances[name]=mesh;buckets[name]={mesh,capacity,count:0,colors:new Int32Array(capacity).fill(-1),colorsChanged:false};
 }
 const data=Array.from({length:MAX_PEOPLE},(_,i)=>wardrobe(faction,i));
 const citizens={group,instances,buckets,data,wardrobeNames:[...WARDROBES[faction].names],faction,layout,rings,slotPositions,deckY,carrierScale:scale,humanScale:1/scale,worldHumanHeight:.8,maxPeople:MAX_PEOPLE,populationCount:0,requestedPopulation:0,styleCounts:{},routes:[],
  scratch:{root:new T.Object3D(),part:new T.Object3D(),matrix:new T.Matrix4(),direction:new T.Vector3(),handPosition:new T.Vector3(),up:new T.Vector3(0,1,0),color:new T.Color(),body:new T.Quaternion(),head:new T.Quaternion(),wrist:new T.Quaternion(),angles:new T.Euler(),groupInverse:new T.Matrix4(),stationMatrix:new T.Matrix4(),rootInverse:new T.Matrix4(),bodyInverse:new T.Quaternion(),leftTarget:new T.Vector3(),rightTarget:new T.Vector3(),stationPoint:new T.Vector3()}};
 group.userData.wardrobeNames=citizens.wardrobeNames;
 group.userData.worldHumanHeight=.8;
 animateCitizens(citizens,0,false,24,{rings,slotPositions,layout});
 return citizens;
}

function routeFor(citizens,person,time,moving,options){
 const layout=options.layout??citizens.layout,rings=Math.max(1,options.rings??citizens.rings??1);
 const cycle=19+(person.id%4),active=cycle-2.4,elapsed=time+person.id*2.371;
 const phase=((elapsed%cycle)+cycle)%cycle;
 const walked=Math.floor(elapsed/cycle)*active+Math.min(phase,active);
 const walking=phase<active,speed=(.27+person.id%5*.016)/citizens.carrierScale;
 const distance=walked*speed,errand=!walking;
 let x,z,y=0,yaw;
 if(layout==='circular'||layout==='circle'||layout==='rings'){
  const outer=rings>1&&person.id%3!==0,radius=outer?6.65:2.55;
  const a=person.phase+person.direction*distance/radius;
  x=KAIJU_CENTER.x+Math.sin(a)*radius;z=KAIJU_CENTER.z+Math.cos(a)*radius;
  yaw=a+(person.direction>0?Math.PI/2:-Math.PI/2);
  if(errand)yaw+=person.direction*.65;
 }else if(layout==='backpack'){
  // Compatibility for legacy vertical saves while carriers migrate to circular decks.
  const slots=options.slotPositions??citizens.slotPositions,tier=person.id%4,p=slots[tier*5]??{y:0,z:0};
  const progress=(distance+person.id*.91)%28.4,forward=progress<14.2;
  x=forward?progress-7.1:21.3-progress;z=p.z-1.76;y=p.y;yaw=forward?Math.PI/2:-Math.PI/2;
 }else if(person.id%3===0){
  // Perimeter pavement outside the 20 district footprints, still inside the walls.
  const halfX=7.82,halfZ=7.70,w=halfX*2,d=halfZ*2,total=(w+d)*2;
  let p=((person.direction*distance+person.id*2.37)%total+total)%total;
  if(p<w){x=-halfX+p;z=-halfZ;yaw=Math.PI/2;}
  else if((p-=w)<d){x=halfX;z=-halfZ+p;yaw=0;}
  else if((p-=d)<w){x=halfX-p;z=halfZ;yaw=-Math.PI/2;}
  else{x=-halfX;z=halfZ-(p-w);yaw=Math.PI;}
  if(person.direction<0)yaw+=Math.PI;
 }else{
  // Horizontal street centerlines lie in the .30 m gaps between building rows.
  const p=(distance+person.id*1.19)%30,forward=p<15;
  x=forward?p-7.5:22.5-p;z=[-3.7,0,3.7][Math.floor(person.id/3)%3];yaw=forward?Math.PI/2:-Math.PI/2;
  if(errand)yaw+=person.id%2?.65:-.65;
 }
 return {x,y,z,yaw,walking,errand,distance,moving,route:layout==='circular'||layout==='circle'||layout==='rings'?(rings>1&&person.id%3!==0?'outer-ring':'inner-ring'):layout==='backpack'?'terrace':person.id%3===0?'perimeter':'street'};
}

// Single-file circulation keeps the small ward legible. Residents can stop for
// errands; the following walkers yield without passing through their bodies.
function circulate(citizens,time,count,rings){
 const signature=`${count}:${rings}`,old=citizens.circulation;
 if(!old||old.signature!==signature||time<old.time){
  const lanes=[{radius:2.55,ids:[]},{radius:6.65,ids:[]}];
  for(let i=0;i<count;i++)lanes[rings>1&&i%3!==0?1:0].ids.push(i);
  for(const lane of lanes){lane.length=TAU*lane.radius;lane.positions=lane.ids.map((id,i)=>i*lane.length/lane.ids.length+.18*lane.radius);lane.walking=lane.ids.map(()=>true);}
  citizens.circulation={signature,time,lanes};
 }
 const traffic=citizens.circulation,dt=Math.min(.25,Math.max(0,time-traffic.time)),routes=[];
 traffic.time=time;
 for(const lane of traffic.lanes){
  if(!lane.ids.length)continue;
  const requested=lane.ids.map((id,i)=>{
   const cycle=24,phase=((time+id*2.37)%cycle+cycle)%cycle,stop=phase>cycle-1.25;
   return lane.positions[i]+(stop?0:dt*.235/citizens.carrierScale);
  });
  const gap=Math.min(.40/citizens.carrierScale,lane.length/lane.ids.length*.97);
  for(let pass=0;pass<lane.ids.length;pass++)for(let i=lane.ids.length-1;i>=0;i--){const leader=i===lane.ids.length-1?requested[0]+lane.length:requested[i+1];requested[i]=Math.min(requested[i],leader-gap);}
  lane.ids.forEach((id,i)=>{
   const walking=dt>0?requested[i]-lane.positions[i]>1e-5:lane.walking[i],a=requested[i]/lane.radius;
   routes[id]={x:KAIJU_CENTER.x+Math.sin(a)*lane.radius,y:0,z:KAIJU_CENTER.z+Math.cos(a)*lane.radius,yaw:a+Math.PI/2+(walking?0:Math.sin(time*.6+id)*.22),walking,errand:!walking,distance:requested[i],route:lane.radius>3?'outer-ring':'inner-ring'};
   lane.walking[i]=walking;
  });
  lane.positions=requested;
 }
 citizens.group.userData.minimumPedestrianSpacing=.40;
 return routes;
}

// Each resident belongs to a supported cloister floor. Independent traffic
// loops avoid inventing flying shortcuts between the vertically stacked wards.
function towerCirculate(citizens,time,count,rings,verticalLayout){
 const floors=verticalLayout?verticalLayout.floors.filter(f=>!f.underConstruction):kaijuWalkFloors(rings);
 const signature=`${count}:${rings}:${verticalLayout?.signature??''}:${verticalLayout?JSON.stringify(floors.map(f=>[f.slot,f.tier,f.y,f.height,f.path])):''}`,old=citizens.towerCirculation;
 if(!old||old.signature!==signature||time<old.time){
  const lanes=floors.map(f=>({...f,ids:[],length:0,segments:[]}));
  for(const lane of lanes){
   lane.path.forEach((a,i)=>{const b=lane.path[(i+1)%lane.path.length],length=Math.hypot(b.x-a.x,b.z-a.z);lane.segments.push({a,b,start:lane.length,length,yaw:Math.atan2(b.x-a.x,b.z-a.z)});lane.length+=length;});
  }
  for(let i=0;i<count;i++)lanes[i%lanes.length].ids.push(i);
  for(const lane of lanes){lane.positions=lane.ids.map((id,i)=>i===1?Math.min(.85/citizens.carrierScale,lane.length/lane.ids.length):i*lane.length/lane.ids.length);lane.walking=lane.ids.map(()=>true);}
  citizens.towerCirculation={signature,time,lanes};
 }
 const traffic=citizens.towerCirculation,dt=Math.min(.25,Math.max(0,time-traffic.time)),routes=[];traffic.time=time;
 for(const lane of traffic.lanes){
  if(!lane.ids.length)continue;
  const requested=lane.ids.map((id,i)=>{const phase=((time+(i<2?lane.tier*3.1:id*2.37))%29+29)%29;return lane.positions[i]+(phase>25?0:dt*.235/citizens.carrierScale);});
  const gap=Math.min(.44/citizens.carrierScale,lane.length/lane.ids.length*.97);
  for(let pass=0;pass<lane.ids.length;pass++)for(let i=lane.ids.length-1;i>=0;i--){const leader=i===lane.ids.length-1?requested[0]+lane.length:requested[i+1];requested[i]=Math.min(requested[i],leader-gap);}
  lane.ids.forEach((id,i)=>{
   const distance=requested[i],along=((distance%lane.length)+lane.length)%lane.length,segment=lane.segments.find(s=>along<s.start+s.length)??lane.segments.at(-1),t=(along-segment.start)/segment.length;
   const walking=dt>0?distance-lane.positions[i]>1e-5:lane.walking[i];
   routes[id]={x:segment.a.x+(segment.b.x-segment.a.x)*t,y:lane.y,z:segment.a.z+(segment.b.z-segment.a.z)*t,yaw:segment.yaw+(walking?0:Math.sin(time*.6+id)*.15),walking,errand:!walking,social:i<2&&!walking,distance,route:'castle-cloister',tier:lane.tier,level:lane.level};lane.walking[i]=walking;
  });
  lane.positions=requested;
 }
 citizens.group.userData.minimumPedestrianSpacing=.44;citizens.group.userData.occupiedFloors=traffic.lanes.filter(l=>l.ids.length).map(l=>l.tier);return routes;
}

/** Animate articulated people on authored pedestrian routes, with short stops for local errands. */
export function animateCitizens(citizens,time,moving,populationCount,{rings=citizens.rings,slotPositions=citizens.slotPositions,layout=citizens.layout,visibleFloor,activityStations=[],verticalLayout}={}){
 const circular=['circular','circle','rings'].includes(layout),limit=circular&&rings<2?16:MAX_PEOPLE;
 if(layout==='tower'&&verticalLayout)citizens.group.position.y=citizens.deckY+(verticalLayout.floors[0]?.surfaceOffset??.109*(verticalLayout.heightScale??1));
 const requested=Number.isFinite(populationCount)?Math.max(0,Math.floor(populationCount)):24;
 const occupiedFloors=verticalLayout?.floors.filter(f=>!f.underConstruction);
 const count=layout==='tower'&&occupiedFloors?.length===0?0:Math.min(limit,requested);
 citizens.requestedPopulation=requested;citizens.populationCount=count;citizens.layout=layout;citizens.rings=rings;citizens.slotPositions=slotPositions;citizens.styleCounts={};citizens.routes.length=0;
 const ringRoutes=layout==='tower'?towerCirculate(citizens,time,count,rings,verticalLayout):circular?circulate(citizens,time,count,rings):null;
 const {root,part,matrix,direction,handPosition,up,color,body,head,wrist,angles,groupInverse,stationMatrix,rootInverse,bodyInverse,leftTarget,rightTarget,stationPoint}=citizens.scratch;
 const routes=Array.from({length:count},(_,i)=>ringRoutes?.[i]??routeFor(citizens,citizens.data[i],time,moving,{rings,slotPositions,layout}));
 const stations=activityStations.filter(s=>s.foot?.parent&&(!occupiedFloors||occupiedFloors.some(f=>f.slot===s.slot))&&(!Number.isFinite(visibleFloor)||s.tier===visibleFloor)).slice(0,Math.min(3,count));
 citizens.group.updateWorldMatrix(true,false);groupInverse.copy(citizens.group.matrixWorld).invert();
 for(let i=0;i<stations.length;i++){const s=stations[i];s.foot.updateWorldMatrix(true,false);stationMatrix.multiplyMatrices(groupInverse,s.foot.matrixWorld);stationPoint.setFromMatrixPosition(stationMatrix);direction.set(0,0,1).transformDirection(stationMatrix);routes[i]={x:stationPoint.x,y:stationPoint.y,z:stationPoint.z,yaw:Math.atan2(direction.x,direction.z),walking:false,errand:true,distance:0,route:'building-workplace',tier:s.tier,level:s.tier+1,station:s};}
 const activities={walking:0,carrying:0,reading:0,working:0,gardening:0,conversation:0,resting:0};citizens.stationContacts=[];
 const clothPose={morphTargetInfluences:[0,0]};
 for(const bucket of Object.values(citizens.buckets)){bucket.count=0;bucket.colorsChanged=false;}
 function put(name,x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0,quaternion=null){
  const bucket=citizens.buckets[name],n=bucket.count++;
  if(n>=bucket.capacity)throw new Error(`Citizen instance capacity exceeded: ${name}`);
  part.position.set(x,y,z);part.scale.set(sx,sy,sz);
  if(quaternion)part.quaternion.copy(quaternion);else part.rotation.set(rx,ry,rz);
  // Turn the face and shoulders toward a task while leaving pelvis, legs and
  // planted shoe matrices on the authored route. Tools follow the same pose.
  if(y>.675&&(Math.abs(x)<.07||name==='headwear'||name==='brim'||name==='hair')){
   part.position.y-=.674;part.position.applyQuaternion(head);part.position.y+=.674;part.quaternion.premultiply(head);
  }
  if(y>.42||name==='cape'||(Math.abs(x)>.08&&y>.35&&(name==='skin'||name==='hands'||name==='limbs'))){
   part.position.y-=.415;part.position.applyQuaternion(body);part.position.y+=.415;part.quaternion.premultiply(body);
  }
  part.updateMatrix();matrix.multiplyMatrices(root.matrix,part.matrix);bucket.mesh.setMatrixAt(n,matrix);
  if(bucket.mesh.geometry.userData.movingCloth)bucket.mesh.setMorphAt(n,clothPose);
  if(bucket.colors[n]!==tint){color.setHex(tint);bucket.mesh.setColorAt(n,color);bucket.colors[n]=tint;bucket.colorsChanged=true;}
 }
 function segment(ax,ay,az,bx,by,bz,width,tint){
  direction.set(bx-ax,by-ay,bz-az);const length=direction.length();part.quaternion.setFromUnitVectors(up,direction.normalize());
  put('limbs',(ax+bx)/2,(ay+by)/2,(az+bz)/2,width,length,width,tint,0,0,0,part.quaternion);
 }
 for(let i=0;i<count;i++){
  const p=citizens.data[i],route=routes[i];citizens.routes.push({id:i,...route,station:undefined,stationSlot:route.station?.slot});
  citizens.styleCounts[p.wardrobe]=(citizens.styleCounts[p.wardrobe]??0)+1;
  if(layout==='tower'&&Number.isFinite(visibleFloor)&&route.tier>visibleFloor)continue;
  const unit=citizens.humanScale,stridePhase=route.distance*citizens.carrierScale/.34*TAU+p.phase,gait=route.walking?Math.sin(stridePhase):0,idle=route.walking?0:Math.sin(time*1.15+p.phase);
  const bob=route.walking?Math.abs(gait)*.003:Math.sin(time*1.8+p.phase)*.001;
  const station=route.station,carrying=!station&&i%12===2,working=station?['forge','carpentry'].includes(station.kind):route.errand&&i%12===7&&!route.social,reading=station?station.kind==='ledger':route.errand&&i%4===0&&!carrying&&!route.social,gardening=station?.kind==='garden';
  let partner=-1,nearest=1.36/citizens.carrierScale;
  if(!station&&route.errand&&!carrying&&!working&&!reading)for(let j=0;j<count;j++){
   const r=routes[j];if(j===i||r.station||!r.errand||Math.abs(r.y-route.y)>.01||j%12===2||(!r.social&&(j%12===7||j%4===0)))continue;
   const distance=Math.hypot(r.x-route.x,r.z-route.z);if(distance<nearest){nearest=distance;partner=j;}
  }
  let turn=0;if(partner>=0){const r=routes[partner];turn=Math.atan2(r.x-route.x,r.z-route.z)-route.yaw;turn=Math.atan2(Math.sin(turn),Math.cos(turn));}
  else if(working&&!station){
   // A repair stop looks toward the closest district on this same floor.
   // Feet remain on the pavement; only the carried work and upper body turn.
   let closest=null,best=Infinity;for(const p of slotPositions){if(Math.abs((p.y??0)-route.y)>.1)continue;const d=(p.x-route.x)**2+(p.z-route.z)**2;if(d<best){best=d;closest=p;}}
   if(closest){turn=Math.atan2(closest.x-route.x,closest.z-route.z)-route.yaw;turn=Math.atan2(Math.sin(turn),Math.cos(turn));}
  }
  const torsoTurn=T.MathUtils.clamp(turn*.64,-1.35,1.35),headTurn=T.MathUtils.clamp(turn-torsoTurn,-1.15,1.15);
  body.setFromEuler(angles.set(station?.19:working?.11:reading?.055:carrying?.035:route.walking?.025:0,torsoTurn-(route.walking?gait*.075:0),working&&!station?Math.sin(time*6.1+p.phase)*.016:route.walking?gait*.019:0));
  head.setFromEuler(angles.set(working?.20:reading?.22:route.walking?.015+.015*Math.cos(stridePhase*2):.015,headTurn+(route.walking?gait*.055:Math.sin(time*.61+p.phase)*.035),partner>=0?Math.sin(time*1.2+p.phase)*.045:0));
  const breeze=Math.sin(time*1.65+p.phase)*.38+Math.sin(time*2.7+p.phase*.73)*.16+(route.walking?Math.sin(stridePhase-.75)*.43:0);
  clothPose.morphTargetInfluences[0]=Math.max(0,-breeze);clothPose.morphTargetInfluences[1]=Math.max(0,breeze);
  const activityName=gardening?'gardening':carrying?'carrying':working?'working':reading?'reading':partner>=0?'conversation':route.walking?'walking':'resting';activities[activityName]++;citizens.routes.at(-1).activity=activityName;
  root.position.set(route.x,route.y,route.z);root.rotation.set(0,route.yaw,0);root.scale.set(unit*p.widthFactor,unit*p.heightFactor,unit*p.depthFactor);root.updateMatrix();
  if(station){
   rootInverse.copy(root.matrix).invert();bodyInverse.copy(body).invert();
   for(const [marker,target]of[[station.left,leftTarget],[working?station.contact:station.right,rightTarget]]){marker.getWorldPosition(target);target.applyMatrix4(groupInverse).applyMatrix4(rootInverse);target.y-=.415;target.applyQuaternion(bodyInverse);target.y+=.415;}
   if(working)rightTarget.y+=.118+(.5+.5*Math.sin(time*5.1+p.phase))*.06;
   else if(gardening){rightTarget.y+=.012+.030*(.5+.5*Math.sin(time*2.1+p.phase));rightTarget.x+=Math.sin(time*1.4+p.phase)*.020;}
   else rightTarget.x+=Math.sin(time*.8+p.phase)*.012;
  }
  const trouser=citizens.faction==='airship'?p.accent:citizens.faction==='kaiju'?0x292a35:0x343d46;
  const sleeve=p.primary,shoe=citizens.faction==='airship'?0x68513f:0x292b31;
  put('torso',0,.52+bob,0,p.skirt?.188:.207,.245,.138,p.primary,route.walking?.018:0,0,gait*.012);
  if(p.vest)put('vest',0,.532+bob,.070,.129,.172,.014,p.accent);
  put('skin',0,.660,0,.033,.036,.031,p.skinTone);
  put('heads',0,.731+bob,.006,.060,.074,.057,p.skinTone);
  put('skin',0,.724+bob,.067,.0065,.016,.0075,p.skinTone);
  put('skin',0,.715+bob,.074,.009,.008,.009,p.skinTone);
  const blinkPhase=((time+p.phase*.61)%(4.1+i%5*.37)),blink=blinkPhase<.17?Math.sin(blinkPhase/.17*Math.PI)**2:0;
  const gaze=partner>=0?Math.sin(time*.71+p.phase)*.0017:reading||working?.0003:Math.sin(time*.44+p.phase)*.0011;
  const speech=partner>=0?Math.max(0,Math.sin(time*8.7+p.phase))*.0017:0;
  for(const side of [-1,1]){
   put('skin',side*.057,.734,.004,.011,.022,.012,p.skinTone);
   put('details',side*.022,.739+bob,.059,.010,.0055*(1-blink*.96),.0038,0xdbd3b8);
   put('details',side*.022+gaze,.739+bob,.062,.0048,.005*(1-blink*.96),.0028,i%3===0?0x4c6570:0x543a25);
   put('details',side*.022+gaze,.739+bob,.064,.0024,.004*(1-blink*.96),.0017,0x202228);
   put('details',side*.024,.751+bob,.059,.014,.0025,.003,p.hairTone,0,0,side*(.10+(working?.15:partner>=0?Math.sin(time*.8+p.phase)*.13:0)));
   put('details',side*.022,.744+bob-blink*.0047,.061,.012,.0033,.0035,p.skinTone,0,0,side*.10);
   put('details',side*.022,.734+bob,.061,.0105,.0022,.0034,p.skinTone,0,0,-side*.06);
   put('details',side*.007,.709+bob,.079,.0035,.002,.002,0x715043);
  }
  put('details',0,.699+bob+speech*.3,.063,.014,.0027,.0035,0x855e52);
  put('details',0,.695+bob-speech,.063,.012,.0028,.004,0xbf8e78);
  put('details',0,.697+bob,.063,.010,.0008+speech*.7,.003,0x503c37);
  put('scalp',0,.731+bob,.006,.060,.074,.057,p.hairTone);
  if(p.hairStyle===1)put('hair',0,.745,-.060,.028,.029,.023,p.hairTone);
  else if(p.hairStyle===2||p.hairStyle===4)put('hair',0,.718,-.052,.043,p.hairStyle===4?.072:.049,.025,p.hairTone);
  if(i%7===3)put('hair',0,.687,.037,.030,.016,.025,p.hairTone);
  if(p.hat==='hood')put('hoods',0,.731+bob,.003,.060,.074,.057,p.primary);
  for(let side=-1;side<=1;side+=2){
   const swing=gait*side,hip=side*(station?.061:.051),shoulder=side*.105;
   // Stance feet move backward at exactly the route speed. Only the returning
   // foot lifts; sole height stays on the authored floor at the planted phase.
   const phase=((stridePhase/TAU+(side<0?.5:0))%1+1)%1,stance=phase<.60,u=stance?phase/.60:(phase-.60)/.40;
   const ankleZ=station?(side<0?-.036:.033):(stance?.102-.204*u:-.102+.204*u)/p.depthFactor,lift=route.walking&&!stance?Math.sin(u*Math.PI)*.040:0;
   const kneeZ=ankleZ*.45+(route.walking&&!stance?.025*Math.sin(u*Math.PI):.013);
   segment(hip,.414+bob,0,hip,.232+lift*.42,kneeZ,p.skirt?.069:citizens.faction==='airship'?.101:.080,trouser);
   segment(hip,.232+lift*.42,kneeZ,hip,.071+lift,ankleZ,.065,trouser);
   put('shoes',hip,.021+lift,ankleZ+.030,.042,.030,.076,shoe);
   put('trim',hip,.043+lift,ankleZ+.065,.034,.009,.016,p.trim);
   const activity=p.id%4,gesture=route.errand&&(side===1||activity===0||activity===2),armSwing=-swing;
   const target=side<0?leftTarget:rightTarget,handX=station?target.x:side*(carrying||reading||working?.096:.118);
   const elbowZ=station?target.z*.52:carrying?.073:.014+armSwing*.044+(gesture?.045:0);
   const handZ=station?target.z:carrying?.137:reading?.147:working?.165:partner>=0?.104:.026+armSwing*.071+(gesture?(activity===1?.055:activity===2?.09:.035):0);
   const hammerStroke=.5+.5*Math.sin(time*6.1+p.phase);
   const handY=station?target.y:carrying?.465:working?(side===1?.555+hammerStroke*.11:.459):partner>=0?(side===1?.555+.045*Math.sin(time*2.3+p.phase):.448):gesture?(activity===0?.51:activity===1?.63+idle*.018:activity===2?.465:.42):.381;
   put('shoulders',shoulder,.602,0,.031,.036,.039,sleeve);
   segment(shoulder,.603,0,side*.114,.498,elbowZ,.063,sleeve);
   wrist.setFromUnitVectors(up,direction.set(side*.114-handX,.498-handY,elbowZ-handZ).normalize());
   handPosition.set(0,.030,0).applyQuaternion(wrist);segment(side*.114,.498,elbowZ,handX+handPosition.x,handY+handPosition.y,handZ+handPosition.z,.049,p.style===1&&citizens.faction==='crawler'?p.skinTone:sleeve);
   put('hands',handX,handY,handZ,.023,.029,.022,p.skinTone,0,0,0,wrist);
   if(station){stationPoint.setFromMatrixPosition(matrix).applyMatrix4(citizens.group.matrixWorld);citizens.stationContacts.push({id:i,slot:station.slot,kind:station.kind,side,hand:stationPoint.toArray()});}
   handPosition.set(-side*.019,.005,.010).applyQuaternion(wrist);put('skin',handX+handPosition.x,handY+handPosition.y,handZ+handPosition.z,.009,.018,.010,p.skinTone,0,0,0,wrist);
   for(let finger=0;finger<4;finger++){
    const length=finger===0||finger===3?.0135:.0165,curl=station||carrying||reading?.008:partner>=0?.002+.003*Math.sin(time*2.3+p.phase+finger):.004;
    handPosition.set(side*(finger-1.5)*.008,-.025,curl).applyQuaternion(wrist);put('skin',handX+handPosition.x,handY+handPosition.y,handZ+handPosition.z,.0047,length,.008,p.skinTone,0,0,0,wrist);
    handPosition.set(side*(finger-1.5)*.008,-.025-length*.52,curl+.007).applyQuaternion(wrist);put('details',handX+handPosition.x,handY+handPosition.y,handZ+handPosition.z,.0032,.004,.0018,0xcfa78c,0,0,0,wrist);
   }
   handPosition.set(0,.036,0).applyQuaternion(wrist);put('cuffs',handX+handPosition.x,handY+handPosition.y,handZ+handPosition.z,.053,.024,.053,p.accent,0,0,0,wrist);
   if(working&&side===1){put('trim',handX,handY-.044,handZ,.012,.112,.014,0x8b6950);put('bags',handX,handY-.104,handZ,.068,.028,.033,0x59646a);if(station){stationPoint.set(0,-.5,0).applyMatrix4(matrix).applyMatrix4(citizens.group.matrixWorld);citizens.stationContacts.push({id:i,slot:station.slot,kind:station.kind,side:'tool',hand:stationPoint.toArray()});}}
  }
  if(p.skirt)put('skirt',0,p.robe?.286:.284,0,p.robe?.255:.287,p.robe?.362:.345,.241,p.robe?p.primary:p.accent);
  if(p.tails)put('tails',0,citizens.faction==='crawler'&&p.style===4?.318:.278,-.012,.276,citizens.faction==='crawler'&&p.style===4?.244:.345,.246,p.primary,.015+gait*.018);
  if(p.cape)put('cape',0,p.style===7?.521:.416,-.076,.295,p.style===7?.22:.468,.32,p.style===4?p.accent:p.primary,.04+gait*.055);
  if(p.collar)put('collar',0,.651,-.008,.098,.057,.091,p.primary);
  put('collar',0,.411,.003,.177,.021,.122,p.primary);
  put('trim',0,.411,.067,.028,.025,.010,p.trim);
  if(p.vest){
   for(const side of [-1,1])put('lapels',side*.038,.588,.076,.053,.107,.040,citizens.faction==='crawler'?p.primary:p.accent,0,side<0?Math.PI:0,-side*.12);
   for(let n=0;n<3;n++)put('details',0,.492+n*.032,.074,.004,.004,.004,p.trim);
  }
  // Seams, pocket flaps and the folded shirt collar describe garments at a
  // close street camera without adding a separate draw call for each person.
  for(const side of[-1,1]){put('trim',side*.053,.479,.069,.034,.006,.007,p.primary,0,0,side*.06);put('trim',side*.022,.635,.030,.031,.023,.010,p.accent,0,0,side*.30);}
  if(working&&!station){
   put('bags',0,.443,.163,.202,.025,.109,0xa48a65);put('trim',-.06,.461,.167,.055,.006,.060,0x70757a);
  }else if(reading&&!station){
   put('bags',0,.508,.144,.163,.012,.109,0x53453c,.32);put('bags',0,.518,.143,.149,.009,.099,0xd9c9a6,.32);
   put('trim',0,.523,.146,.006,.005,.091,0x88714e,.32);
  }else if(carrying){
   put('bags',0,.431,.134,.174,.10,.125,0xa28761);put('trim',0,.432,.199,.011,.107,.009,0x5d5144);put('trim',0,.486,.139,.174,.008,.011,0x5d5144);
   for(let row=0;row<3;row++)put('trim',0,.401+row*.028,.198,.170,.006,.008,0x6d5944);
  }
  if(citizens.faction==='crawler'){put('trim',0,.626,.075,.077,.024,.012,0xd2c5aa);put('trim',0,.604,.086,.023,.047,.012,p.accent,0,0,.13);}
  if(citizens.faction==='crawler'&&p.vest){put('braid',.043,.521,.081,.061,.075,.018,p.trim,0,0,.11);put('details',.071,.514,.080,.007,.009,.003,p.trim);}
  if(citizens.faction==='kaiju'){
   put('braid',0,.628,.053,.106,.070,.013,p.trim);
   put('details',0,.627,.064,.008,.011,.005,p.style%2?0x79454c:0x758fa5);
   if(p.collar)for(const side of[-1,1])put('trim',side*.035,.643,.044,.012,.036,.007,p.accent,0,0,side*.20);
  }
  if(citizens.faction==='airship')for(let n=0;n<3;n++)put('braid',0,.572-n*.038,.077,.088-n*.008,.060,.018,p.trim);
  if(citizens.faction==='airship'){
   put('trim',0,.447,.068,.127,.038,.012,p.accent,0,0,-.12);
   if(p.robe)put('trim',.065,.346,.089,.037,.203,.018,p.accent,0,0,.11);
   if(p.robe)put('trim',0,.176,.099,.143,.018,.009,p.trim);
  }
  if(p.hat==='wrap'){
   for(let n=0;n<3;n++)put('headwear',0,.793+n*.019,-.002,.158-n*.008,.032,.146-n*.006,n===1?p.accent:p.primary,0,0,(n-1)*.075);
  }else if(['cap','flat','top','bowler'].includes(p.hat)){
   const top=p.hat==='top',flat=p.hat==='flat';
   put('headwear',0,top?.840:.799,flat?.008:-.002,top?.136:.153,top?.103:p.hat==='bowler'?.049:.028,top?.134:.143,p.primary,flat?.08:0);
   put('brim',0,.791,flat?.022:.005,flat?.182:top?.202:.179,.012,flat?.182:top?.194:.167,p.primary);
   put('trim',0,top?.805:.795,.073,.103,.013,.009,p.accent);
  }
  if(p.bag){
   put('bags',.108,.409,.006,.058,.112,.074,citizens.faction==='kaiju'?0x54434f:0x8c6950);
   put('trim',.065,.535,.078,.012,.251,.012,p.trim,0,0,-.39);
  }
 }
 for(const bucket of Object.values(citizens.buckets)){
  bucket.mesh.count=bucket.count;bucket.mesh.visible=bucket.count>0;bucket.mesh.instanceMatrix.needsUpdate=true;
  if(bucket.mesh.morphTexture)bucket.mesh.morphTexture.needsUpdate=true;
  if(bucket.colorsChanged)bucket.mesh.instanceColor.needsUpdate=true;
 }
 citizens.group.userData.populationCount=count;
 citizens.group.userData.activityCounts=activities;
 citizens.group.userData.styleCounts=citizens.styleCounts;
 citizens.worldHeightRange=count?[Math.min(...citizens.data.slice(0,count).map(p=>.8*p.heightFactor)),Math.max(...citizens.data.slice(0,count).map(p=>.8*p.heightFactor))]:[0,0];
 updateCitizenBounds(citizens);
 return citizens;
}
