import * as T from '../vendor/three.module.js';
import {getMaterial} from './materials.js';
import {KAIJU_CENTER,kaijuWalkFloors} from './city-layout.js';

const MAX_PEOPLE=48;
const TAU=Math.PI*2;
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
function capeGeometry(){
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute([-.34,.5,0,0,.56,-.08,.34,.5,0,-.43,0,-.17,0,0,-.31,.43,0,-.17,-.5,-.48,-.24,0,-.56,-.39,.5,-.48,-.24],3));
 g.setAttribute('uv',new T.Float32BufferAttribute([0,1,.5,1,1,1,0,.5,.5,.5,1,.5,0,0,.5,0,1,0],2));g.setIndex([0,3,1,1,3,4,1,4,2,2,4,5,3,6,4,4,6,7,4,7,5,5,7,8]);g.computeVertexNormals();return g;
}
function torsoGeometry(){
 const g=new T.CylinderGeometry(.5,.5,1,8,4),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),width=y>.25?1:y>-.05?.96:y>-.3?.76:.88;p.setXYZ(i,p.getX(i)*width,y,p.getZ(i));}
 g.computeVertexNormals();return g;
}
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
 const sphere=geometry('citizen-sphere',()=>new T.SphereGeometry(1,12,8));
 const cylinder=geometry('citizen-cylinder',()=>new T.CylinderGeometry(.5,.5,1,10));
 const cube=geometry('citizen-box',()=>new T.BoxGeometry(1,1,1));
 const specs={
  torso:[geometry('citizen-tailored-torso',torsoGeometry),cloth,1],shoulders:[sphere,cloth,2],
  vest:[cube,cloth,1],limbs:[cylinder,cloth,8],skin:[sphere,solid,7],
  shoes:[geometry('citizen-shoe',()=>new T.SphereGeometry(1,10,6)),solid,2],hair:[sphere,solid,3],
  skirt:[geometry('citizen-skirt',()=>new T.CylinderGeometry(.30,.5,1,12)),cloth,1],
  tails:[geometry('citizen-coattails',()=>new T.CylinderGeometry(.31,.5,1,12,1,true,Math.PI/3,Math.PI*4/3)),cloth,1],
  cape:[geometry('citizen-cape',capeGeometry),cloth,1],collar:[cylinder,cloth,1],
  headwear:[cylinder,cloth,3],brim:[cylinder,cloth,1],
  details:[geometry('citizen-detail',()=>new T.SphereGeometry(1,8,4)),solid,8],trim:[cube,cloth,18],bags:[cube,cloth,1]
 };
 const buckets={},instances={};
 for(const [name,[shape,material,perPerson]]of Object.entries(specs)){
  const capacity=MAX_PEOPLE*perPerson,mesh=new T.InstancedMesh(shape,material,capacity);
  mesh.name=`citizens-${name}`;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.noBatch=true;
  // Preallocate instance colors once. Their values are only resent when a slot changes.
  mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(capacity*3),3);mesh.instanceColor.setUsage(T.DynamicDrawUsage);
  group.add(mesh);instances[name]=mesh;buckets[name]={mesh,capacity,count:0,colors:new Int32Array(capacity).fill(-1),colorsChanged:false};
 }
 const data=Array.from({length:MAX_PEOPLE},(_,i)=>wardrobe(faction,i));
 const citizens={group,instances,buckets,data,wardrobeNames:[...WARDROBES[faction].names],faction,layout,rings,slotPositions,carrierScale:scale,humanScale:1/scale,worldHumanHeight:.8,maxPeople:MAX_PEOPLE,populationCount:0,requestedPopulation:0,styleCounts:{},routes:[],
  scratch:{root:new T.Object3D(),part:new T.Object3D(),matrix:new T.Matrix4(),direction:new T.Vector3(),up:new T.Vector3(0,1,0),color:new T.Color()}};
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
function towerCirculate(citizens,time,count,rings){
 const signature=`${count}:${rings}`,old=citizens.towerCirculation;
 if(!old||old.signature!==signature||time<old.time){
  const lanes=kaijuWalkFloors(rings).map(f=>({...f,ids:[],length:0,segments:[]}));
  for(const lane of lanes){
   lane.path.forEach((a,i)=>{const b=lane.path[(i+1)%lane.path.length],length=Math.hypot(b.x-a.x,b.z-a.z);lane.segments.push({a,b,start:lane.length,length,yaw:Math.atan2(b.x-a.x,b.z-a.z)});lane.length+=length;});
  }
  for(let i=0;i<count;i++)lanes[i%lanes.length].ids.push(i);
  for(const lane of lanes){lane.positions=lane.ids.map((id,i)=>i*lane.length/lane.ids.length);lane.walking=lane.ids.map(()=>true);}
  citizens.towerCirculation={signature,time,lanes};
 }
 const traffic=citizens.towerCirculation,dt=Math.min(.25,Math.max(0,time-traffic.time)),routes=[];traffic.time=time;
 for(const lane of traffic.lanes){
  if(!lane.ids.length)continue;
  const requested=lane.ids.map((id,i)=>{const phase=((time+id*2.37)%24+24)%24;return lane.positions[i]+(phase>22.75?0:dt*.235/citizens.carrierScale);});
  const gap=Math.min(.44/citizens.carrierScale,lane.length/lane.ids.length*.97);
  for(let pass=0;pass<lane.ids.length;pass++)for(let i=lane.ids.length-1;i>=0;i--){const leader=i===lane.ids.length-1?requested[0]+lane.length:requested[i+1];requested[i]=Math.min(requested[i],leader-gap);}
  lane.ids.forEach((id,i)=>{
   const distance=requested[i],along=((distance%lane.length)+lane.length)%lane.length,segment=lane.segments.find(s=>along<s.start+s.length)??lane.segments.at(-1),t=(along-segment.start)/segment.length;
   const walking=dt>0?distance-lane.positions[i]>1e-5:lane.walking[i];
   routes[id]={x:segment.a.x+(segment.b.x-segment.a.x)*t,y:lane.y,z:segment.a.z+(segment.b.z-segment.a.z)*t,yaw:segment.yaw+(walking?0:Math.sin(time*.6+id)*.15),walking,errand:!walking,distance,route:'castle-cloister',tier:lane.tier,level:lane.level};lane.walking[i]=walking;
  });
  lane.positions=requested;
 }
 citizens.group.userData.minimumPedestrianSpacing=.44;citizens.group.userData.occupiedFloors=traffic.lanes.filter(l=>l.ids.length).map(l=>l.tier);return routes;
}

/** Animate articulated people on authored pedestrian routes, with short stops for local errands. */
export function animateCitizens(citizens,time,moving,populationCount,{rings=citizens.rings,slotPositions=citizens.slotPositions,layout=citizens.layout,visibleFloor}={}){
 const circular=['circular','circle','rings'].includes(layout),limit=circular&&rings<2?16:MAX_PEOPLE;
 const requested=Number.isFinite(populationCount)?Math.max(0,Math.floor(populationCount)):24;
 const count=Math.min(limit,requested);
 citizens.requestedPopulation=requested;citizens.populationCount=count;citizens.layout=layout;citizens.rings=rings;citizens.slotPositions=slotPositions;citizens.styleCounts={};citizens.routes.length=0;
 const ringRoutes=layout==='tower'?towerCirculate(citizens,time,count,rings):circular?circulate(citizens,time,count,rings):null;
 const {root,part,matrix,direction,up,color}=citizens.scratch;
 for(const bucket of Object.values(citizens.buckets)){bucket.count=0;bucket.colorsChanged=false;}
 function put(name,x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0,quaternion=null){
  const bucket=citizens.buckets[name],n=bucket.count++;
  if(n>=bucket.capacity)throw new Error(`Citizen instance capacity exceeded: ${name}`);
  part.position.set(x,y,z);part.scale.set(sx,sy,sz);
  if(quaternion)part.quaternion.copy(quaternion);else part.rotation.set(rx,ry,rz);
  part.updateMatrix();matrix.multiplyMatrices(root.matrix,part.matrix);bucket.mesh.setMatrixAt(n,matrix);
  if(bucket.colors[n]!==tint){color.setHex(tint);bucket.mesh.setColorAt(n,color);bucket.colors[n]=tint;bucket.colorsChanged=true;}
 }
 function segment(ax,ay,az,bx,by,bz,width,tint){
  direction.set(bx-ax,by-ay,bz-az);const length=direction.length();part.quaternion.setFromUnitVectors(up,direction.normalize());
  put('limbs',(ax+bx)/2,(ay+by)/2,(az+bz)/2,width,length,width,tint,0,0,0,part.quaternion);
 }
 for(let i=0;i<count;i++){
  const p=citizens.data[i],route=ringRoutes?.[i]??routeFor(citizens,p,time,moving,{rings,slotPositions,layout});citizens.routes.push({id:i,...route});
  citizens.styleCounts[p.wardrobe]=(citizens.styleCounts[p.wardrobe]??0)+1;
  if(layout==='tower'&&Number.isFinite(visibleFloor)&&route.tier>visibleFloor)continue;
  const unit=citizens.humanScale,gait=route.walking?Math.sin(time*7.2+p.phase):0,idle=route.walking?0:Math.sin(time*1.15+p.phase);
  const bob=route.walking?Math.abs(gait)*.006:Math.sin(time*1.8+p.phase)*.002;
  root.position.set(route.x,route.y+bob*unit,route.z);root.rotation.set(route.walking?.015:0,route.yaw,route.walking?gait*.018:idle*.025);root.scale.set(unit*p.widthFactor,unit*p.heightFactor,unit*p.depthFactor);root.updateMatrix();
  const trouser=citizens.faction==='airship'?p.accent:citizens.faction==='kaiju'?0x292a35:0x343d46;
  const sleeve=p.primary,shoe=citizens.faction==='airship'?0x68513f:0x292b31;
  put('torso',0,.52,0,p.skirt?.188:.207,.245,.138,p.primary);
  if(p.vest)put('vest',0,.532,.070,.119,.172,.019,p.accent);
  put('skin',0,.660,0,.033,.036,.031,p.skinTone);
  put('skin',0,.731,.006,.061,.071,.058,p.skinTone);
  put('skin',0,.718,.064,.014,.018,.017,p.skinTone);
  for(const side of [-1,1]){
   put('skin',side*.057,.734,.004,.011,.022,.012,p.skinTone);
   put('details',side*.022,.744,.057,.007,.008,.005,0x252528);
  }
  put('details',0,.706,.059,.015,.0025,.003,0x855e52);
  put('hair',0,.775,-.015,.064,.034,.066,p.hairTone);
  if(p.hairStyle===1)put('hair',0,.749,-.078,.034,.036,.031,p.hairTone);
  else if(p.hairStyle===2||p.hairStyle===4)put('hair',0,.722,-.040,.065,p.hairStyle===4?.090:.055,.053,p.hairTone);
  if(p.hat==='hood')put('hair',0,.738,-.044,.084,.092,.081,p.primary);
  for(let side=-1;side<=1;side+=2){
   const swing=gait*side,hip=side*.051,shoulder=side*.105;
   const kneeZ=swing*.046,ankleZ=swing*.089,lift=Math.max(0,swing)*.024;
   segment(hip,.414,0,hip,.232,kneeZ,p.skirt?.064:citizens.faction==='airship'?.093:.074,trouser);
   segment(hip,.232,kneeZ,hip,.079+lift,ankleZ,.061,trouser);
   put('shoes',hip,.034+lift,ankleZ+.030,.042,.030,.076,shoe);
   const activity=p.id%4,gesture=route.errand&&(side===1||activity===2),armSwing=-swing;
   const elbowZ=.014+armSwing*.044+(gesture?.045:0);
   const handZ=.026+armSwing*.071+(gesture?(activity===0?.1:activity===1?.055:activity===2?.09:.035):0);
   const handY=gesture?(activity===0?.51:activity===1?.63+idle*.018:activity===2?.465:.42):.381;
   put('shoulders',shoulder,.605,0,.034,.042,.045,sleeve);
   segment(shoulder,.603,0,side*.114,.498,elbowZ,.063,sleeve);
   segment(side*.114,.498,elbowZ,side*.118,handY+.023,handZ,.049,p.style===1&&citizens.faction==='crawler'?p.skinTone:sleeve);
   put('skin',side*.118,handY,handZ,.024,.030,.025,p.skinTone);
   put('trim',side*.116,handY+.030,handZ,.053,.018,.050,p.accent);
  }
  if(p.skirt)put('skirt',0,p.robe?.286:.284,0,p.robe?.255:.287,p.robe?.362:.345,.241,p.robe?p.primary:p.accent);
  if(p.tails)put('tails',0,citizens.faction==='crawler'&&p.style===4?.318:.278,-.012,.276,citizens.faction==='crawler'&&p.style===4?.244:.345,.246,p.primary,.015+gait*.018);
  if(p.cape)put('cape',0,p.style===7?.521:.416,-.076,.295,p.style===7?.22:.468,.32,p.style===4?p.accent:p.primary,.04+gait*.055);
  if(p.collar)put('collar',0,.658,-.007,.112,.076,.105,p.primary);
  put('trim',0,.411,.005,.174,.022,.123,p.trim);
  if(p.vest){
   for(const side of [-1,1])put('trim',side*.047,.574,.085,citizens.faction==='crawler'?.029:.014,.114,.010,citizens.faction==='crawler'?p.primary:p.trim,0,0,-side*.27);
   for(let n=0;n<3;n++)put('details',0,.492+n*.032,.074,.004,.004,.004,p.trim);
  }
  if(citizens.faction==='crawler'){put('trim',0,.626,.075,.077,.024,.012,0xd2c5aa);put('trim',0,.604,.086,.023,.047,.012,p.accent,0,0,.13);}
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
  if(bucket.colorsChanged)bucket.mesh.instanceColor.needsUpdate=true;
 }
 citizens.group.userData.populationCount=count;
 citizens.group.userData.styleCounts=citizens.styleCounts;
 citizens.worldHeightRange=count?[Math.min(...citizens.data.slice(0,count).map(p=>.8*p.heightFactor)),Math.max(...citizens.data.slice(0,count).map(p=>.8*p.heightFactor))]:[0,0];
 return citizens;
}
