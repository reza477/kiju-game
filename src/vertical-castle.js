import * as T from '../vendor/three.module.js';
import {getMaterial,batchStatic} from './materials.js';

// A single architectural plan is used by the renderer and ballistic model.
// Vertices are in carrier-local space. Nothing in this module changes plot IDs.
const CENTRE_Z=-12, WIDTH=8.8, DEPTH=10.4;
const BOX_FACES=[[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,5,1],[0,4,5],[1,6,2],[1,5,6],[2,7,3],[2,6,7],[3,4,0],[3,7,4]];
const materialCache=new Map(),descriptorCache=new Map(),solidCache=new Map();
const layoutKey=(layout,deckY)=>`${deckY}:${layout.signature??JSON.stringify(layout.floors)}`;
function cachePut(cache,key,value){if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,value);return value;}

function palette(enemy){
 const stone=(color,role)=>{
  const key=`${color}:${role}`;if(materialCache.has(key))return materialCache.get(key);
  const m=getMaterial('stone',color).clone();m.name=`Vertical castle ${role}`;m.userData.shared=true;m.normalScale.setScalar(role==='foundation'?.40:.25);
  m.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCastlePosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCastlePosition=position;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCastlePosition;').replace('#include <map_fragment>',`
    #ifdef USE_MAP
     vec4 stone=texture2D(map,vMapUv);
     float wear=dot(stone.rgb,vec3(.2126,.7152,.0722));
     diffuseColor.rgb*=mix(stone.rgb,vec3(wear),.78)*1.55+vec3(.035);
     diffuseColor.a*=stone.a;
    #endif
    float rain=pow(.5+.5*sin((vCastlePosition.x+vCastlePosition.z*.43)*3.1+sin(vCastlePosition.x*.81-vCastlePosition.z*.37)*2.1),8.);
    diffuseColor.rgb*=1.-rain*(.5+.5*sin(vCastlePosition.y*.19+sin(vCastlePosition.x*.43+vCastlePosition.z*.61)*2.3))*.17;
    diffuseColor.rgb*=mix(vec3(1.),vec3(.79,.87,.88),(1.-smoothstep(27.,43.,vCastlePosition.y))*.5);
   `);
  };m.customProgramCacheKey=()=> 'vertical-fortress-weather-v1';materialCache.set(key,m);return m;
 };
 return {wall:stone(enemy?0x87928e:0x92978f,'nave'),foundation:stone(0x677577,'foundation'),edge:stone(0x82918e,'buttresses'),trim:getMaterial('plaster',0xb0ad9f),roof:getMaterial('roof',0x75463f),dark:getMaterial('metal',0x303c41),metal:getMaterial('metal',0x6f736f),paving:getMaterial('pavement',0x85877f),walk:getMaterial('pavement',0xa29e8d),glass:getMaterial('glass',0x617781),light:getMaterial('window',0xb0bfae),banner:getMaterial('fabric',enemy?0x7f4446:0x552c40)};
}

function bounds(vertices){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const p of vertices)for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
 return {min,max};
}
function rectVertices(x,z,w,d,bottom,top,lowerWidth=w,lowerDepth=d){
 const v=[];for(const[y,ww,dd]of[[bottom,lowerWidth,lowerDepth],[top,w,d]])for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]])v.push([x+sx*ww/2,y,z+sz*dd/2]);return v;
}
function prism(points,depth,origin=[0,0,0],angle=0){
 if(points.reduce((a,p,i)=>a+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0)<0)points=[...points].reverse();
 const co=Math.cos(angle),si=Math.sin(angle),vertices=[];
 for(const z of[-depth/2,depth/2])for(const[x,y]of points)vertices.push([origin[0]+x*co+z*si,origin[1]+y,origin[2]-x*si+z*co]);
 const n=points.length,faces=[],cap=T.ShapeUtils.triangulateShape(points.map(p=>new T.Vector2(...p)),[]);
 for(const f of cap){faces.push([...f].reverse(),f.map(i=>i+n));}
 for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,j+n],[i,j+n,i+n]);}
 return {vertices,faces};
}
function archOutline(w,h){
 const points=[[-w/2,0],[-w/2,h*.57]];
 for(let i=1;i<=7;i++){const t=i/7,u=1-t;points.push([u*u*-w/2+2*u*t*-w*.40,u*u*h*.57+2*u*t*h*.84+t*t*h]);}
 for(let i=1;i<=7;i++){const t=i/7,u=1-t;points.push([2*u*t*w*.40+t*t*w/2,u*u*h+2*u*t*h*.84+t*t*h*.57]);}
 points.push([w/2,0]);return points;
}

/** Every structural and decorative opaque mesh has one identical solid here. */
export function verticalCastleDescriptors(layout,deckY=34){
 if(!layout?.floors?.length)return [];
 const key=layoutKey(layout,deckY);if(descriptorCache.has(key))return descriptorCache.get(key);
 const out=[],floors=layout.floors,count=floors.length,topTier=count-1,roofY=deckY+layout.height;
 const add=(id,tier,material,shape,shell=true)=>out.push({id:`vertical:${id}`,tier,material,shell,...shape});
 const block=(id,tier,material,x,y,z,w,h,d,shell=true)=>add(id,tier,material,{vertices:rectVertices(x,z,w,d,y-h/2,y+h/2),faces:BOX_FACES},shell);
 const column=(id,tier,material,x,z,r0,r1,bottom,top,segments=8,shell=true)=>{
  const vertices=[],faces=[];for(const[y,r]of[[bottom,r0],...(r1>0?[[top,r1]]:[])])for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2+Math.PI/8;vertices.push([x+Math.cos(a)*r,y,z+Math.sin(a)*r]);}
  if(r1===0)vertices.push([x,top,z]);
  for(let i=0;i<segments;i++){const j=(i+1)%segments;faces.push(r1===0?[i,segments,j]:[i,j+segments,j]);if(r1>0)faces.push([i,i+segments,j+segments]);}
  for(let i=1;i<segments-1;i++){faces.push([0,i,i+1]);if(r1>0)faces.push([segments,segments+i+1,segments+i]);}add(id,tier,material,{vertices,faces},shell);
 };
 const arch=(id,tier,material,x,y,z,w,h,thickness,depth,angle=0)=>{
  const inner=archOutline(w,h),outer=archOutline(w+2*thickness,h+thickness);
  for(let i=0;i<inner.length-1;i++)add(`${id}:${i}`,tier,material,prism([inner[i],inner[i+1],outer[i+1],outer[i]],depth,[x,y,z],angle));
 };
 const pane=(id,tier,x,y,z,w,h,angle,lit)=>{
  add(`${id}:pane`,tier,lit?'light':'glass',prism(archOutline(w,h),.045,[x,y,z],angle));
  const rotate=(xx,yy,zz)=>[x+xx*Math.cos(angle)+zz*Math.sin(angle),y+yy,z-xx*Math.sin(angle)+zz*Math.cos(angle)];
  // Leaded mullions are a solid part of the same render/collision description.
  for(const [n,xx,yy,ww,hh]of[['shaft',0,h*.42,.045,h*.84],['cross',0,h*.36,w*.9,.045]]){const p=rotate(xx,yy,.04);block(`${id}:${n}`,tier,'dark',...p,Math.abs(Math.cos(angle))>.5?ww:.055,hh,Math.abs(Math.cos(angle))>.5?.055:ww);}
 };
 const roof=(id,tier,x,y,z,w,d,h)=>{
  const vertices=[];for(const[t,ww,dd]of[[0,.5,.5],[.28,.32,.405],[.68,.13,.29]])for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]])vertices.push([x+sx*w*ww,y+h*t,z+sz*d*dd]);
  vertices.push([x,y+h,z-d*.19],[x,y+h,z+d*.19]);const faces=[];
  for(let ring=0;ring<2;ring++)for(let i=0;i<4;i++){const a=ring*4+i,b=ring*4+(i+1)%4;faces.push([a,b,a+4],[b,b+4,a+4]);}
  faces.push([8,9,12],[9,13,12],[9,10,13],[10,11,13],[11,12,13],[11,8,12],[0,2,1],[0,3,2]);add(id,tier,'roof',{vertices,faces:faces.map(f=>[...f].reverse())});
  block(`${id}:eaves`,tier,'trim',x,y-.05,z,w+.14,.16,d+.14);
  block(`${id}:ridge`,tier,'metal',x,y+h+.025,z,.11,.10,d*.4);
 };

 // A tapered, ribbed foundation transfers the entire fixed plan to the harness.
 add('hanging-foundation',0,'foundation',{vertices:rectVertices(0,CENTRE_Z,8.5,10.1,deckY-5.0,deckY-.36,4.1,5.3),faces:BOX_FACES},false);
 block('foundation-belt',0,'edge',0,deckY-1.25,CENTRE_Z,8.18,.23,9.68,false);
 for(const side of[-1,1])for(const dz of[-3.8,3.8])column(`foundation-rib:${side}:${dz}`,0,'edge',side*3.36,CENTRE_Z+dz,.29,.23,deckY-3.0,deckY-.38,8,false);

 for(const[floorIndex,f]of floors.entries()){
  const tier=f.tier??floorIndex,y=deckY+f.y,h=f.height;
  block(`floor:${tier}`,tier,'wall',0,y-.23,CENTRE_Z,WIDTH,.46,DEPTH,false);
  block(`surface:${tier}`,tier,'paving',0,y+.045,CENTRE_Z,WIDTH,.09,DEPTH,false);
  // The lit stone promenade follows the exact supported citizen path.
  for(const side of[-1,1]){
   block(`walk-long:${tier}:${side}`,tier,'walk',side*3,y+.099,CENTRE_Z,.67,.020,8.12,false);
   block(`walk-cross:${tier}:${side}`,tier,'walk',0,y+.099,CENTRE_Z+side*3.7,6.65,.020,.67,false);
   block(`cornice-long:${tier}:${side}`,tier,'edge',side*4.18,y-.31,CENTRE_Z,.36,.17,DEPTH);
   block(`cornice-front:${tier}:${side}`,tier,'edge',0,y-.31,CENTRE_Z+side*5.0,WIDTH,.17,.36);
  }
  // Four continuous corner shafts and external ribs visually tie all storeys.
  for(const sx of[-1,1])for(const sz of[-1,1]){
   column(`corner:${tier}:${sx}:${sz}`,tier,'edge',sx*3.9,CENTRE_Z+sz*4.65,.36,.32,y+.09,y+h-.18);
   column(`capital:${tier}:${sx}:${sz}`,tier,'trim',sx*3.9,CENTRE_Z+sz*4.65,.44,.44,y+h-.42,y+h-.22);
  }
  for(const side of[-1,1]){
   // Buttressed nave flanks: real recessed windows, never texture-only holes.
   const x=side*4.10,rotation=side*Math.PI/2;
   block(`side-sill:${tier}:${side}`,tier,'wall',x,y+.45,CENTRE_Z,.36,.72,9.45);
   block(`side-head:${tier}:${side}`,tier,'wall',x,y+h-.43,CENTRE_Z,.36,.70,9.45);
   for(const dz of[-4.32,-1.48,1.48,4.32]){
    block(`side-pier:${tier}:${side}:${dz}`,tier,'wall',x,y+h/2,CENTRE_Z+dz,.36,h-.18,.54);
    block(`side-rib:${tier}:${side}:${dz}`,tier,'edge',side*4.27,y+h/2,CENTRE_Z+dz,.24,h-.23,.24);
   }
   const windowH=Math.max(1.40,h-1.53);
   for(const[bay,dz]of[-2.93,0,2.93].entries()){
    arch(`side-arch:${tier}:${side}:${bay}`,tier,'trim',x,y+.86,CENTRE_Z+dz,1.86,windowH,.12,.43,rotation);
    pane(`side-light:${tier}:${side}:${bay}`,tier,x-side*.055,y+.87,CENTRE_Z+dz,1.82,windowH-.06,rotation,(tier*3+bay+(side+1))%7===1);
   }
  }
  // Broad central pointed portal keeps every outward battery's firing lane open.
  const front=CENTRE_Z-4.88,back=CENTRE_Z+4.88,portalH=Math.max(2.96,h-.45);
  for(const side of[-1,1]){
   block(`front-cheek:${tier}:${side}`,tier,'wall',side*2.99,y+h*.5,front,1.86,h-.18,.43);
   block(`front-jamb:${tier}:${side}`,tier,'trim',side*2.04,y+1.53,front-.055,.19,2.90,.53);
   const windowH=Math.min(2.12,h-1.3);
   // Paired narrow lights have a dark surround and distinct dressed jambs.
   arch(`front-light-surround:${tier}:${side}`,tier,'trim',side*3.02,y+.90,front-.24,.72,windowH,.105,.11);
   pane(`front-light:${tier}:${side}`,tier,side*3.02,y+.91,front-.29,.69,windowH-.05,0,(tier+(side+1))%5===2);
  }
  arch(`gun-portal:${tier}`,tier,'trim',0,y+.14,front,3.84,portalH,.19,.50);
  block(`portal-head:${tier}`,tier,'wall',0,y+h-.23,front,4.30,.32,.43);
  block(`portal-threshold:${tier}`,tier,'edge',0,y+.19,front,3.90,.20,.47);
  // Rear apse wall and its thin windowed spine carry the moving crown.
  block(`apse-lower:${tier}`,tier,'wall',0,y+.42,back,7.55,.66,.43);
  block(`apse-head:${tier}`,tier,'wall',0,y+h-.33,back,7.55,.49,.43);
  for(const x of[-3.38,-1.1,1.1,3.38])block(`apse-pier:${tier}:${x}`,tier,'wall',x,y+h/2,back,.54,h-.18,.43);
  for(const x of[-2.23,0,2.23]){
   const wh=Math.max(1.4,h-1.45);arch(`apse-arch:${tier}:${x}`,tier,'trim',x,y+.83,back,1.36,wh,.13,.45);
   pane(`apse-light:${tier}:${x}`,tier,x,y+.84,back-.04,1.32,wh-.05,0,(tier+Math.round(x*3))%6===0);
  }
  // Sparse banners establish occupied chapters without obscuring the portal.
  if(tier%3===1){block(`banner:${tier}`,tier,'banner',-3.55,y+h*.45,front-.28,.48,Math.min(2.6,h-1.1),.045);block(`banner-rod:${tier}`,tier,'metal',-3.55,y+h*.45+Math.min(2.6,h-1.1)/2+.04,front-.27,.67,.055,.09);}
 }
 // This roof moves up once for every added storey; it never seals a lower one.
 block('roof-slab',topTier,'edge',0,roofY-.08,CENTRE_Z,WIDTH,.32,DEPTH);
 block('crown-chamber',topTier,'wall',.35,roofY+1.18,CENTRE_Z+.2,5.1,2.40,6.5);
 for(const side of[-1,1])for(const x of[-1.07,1.78]){
  arch(`crown-window:${side}:${x}`,topTier,'trim',x,roofY+.27,CENTRE_Z+.2+side*3.30,.80,1.72,.11,.12);
  pane(`crown-pane:${side}:${x}`,topTier,x,roofY+.28,CENTRE_Z+.2+side*3.31,.77,1.67,0,side===-1&&x<0);
 }
 roof('cathedral-crown',topTier,.35,roofY+2.44,CENTRE_Z+.2,5.80,7.3,5.75);
 for(const[i,x,z,base,high]of[[0,-3.28,CENTRE_Z-3.75,.1,5.50],[1,3.3,CENTRE_Z+3.77,.1,4.15]]){
  column(`crown-turret:${i}`,topTier,'wall',x,z,.60,.56,roofY+base,roofY+2.10,8);
  column(`crown-turret-collar:${i}`,topTier,'trim',x,z,.71,.71,roofY+1.89,roofY+2.12,8);
  column(`crown-turret-spire:${i}`,topTier,'roof',x,z,.76,0,roofY+2.13,roofY+high,8);
  column(`crown-turret-finial:${i}`,topTier,'metal',x,z,.045,.015,roofY+high-.04,roofY+high+.54,6);
 }
 column('dominant-finial',topTier,'metal',.35,CENTRE_Z+.2,.065,.02,roofY+8.15,roofY+8.97,6);
 return cachePut(descriptorCache,key,out);
}

/** Tight shared triangle solids, compatible with the existing castle tracing API. */
export function verticalCastleSolids(layout,deckY=34){
 if(!layout?.floors?.length)return [];
 const key=layoutKey(layout,deckY);if(solidCache.has(key))return solidCache.get(key);
 return cachePut(solidCache,key,verticalCastleDescriptors(layout,deckY).map(d=>({id:d.id,...bounds(d.vertices),triangles:d.faces.map(f=>f.map(i=>d.vertices[i]))})));
}

export function createVerticalCastle(deckY=34,enemy=false,layout){
 const group=new T.Group();group.name='Vertically growing Gothic castle';
 if(!layout?.floors?.length)return group;
 const p=palette(enemy),floors=[],shells=[];
 for(const[index,f]of layout.floors.entries()){
  const tier=f.tier??index,g=new T.Group(),shell=new T.Group();g.name=`Gothic storey ${tier+1}`;shell.name=`Gothic exterior ${tier+1}`;
  Object.assign(g.userData,{towerTier:tier,tier,noBatch:true,slot:f.slot,verticalStorey:true});Object.assign(shell.userData,{towerTier:tier,tier,noBatch:true,inspectionShell:true});
  g.add(shell);group.add(g);floors[tier]=g;shells[tier]=shell;
 }
 const descriptors=verticalCastleDescriptors(layout,deckY);
 for(const d of descriptors){
  const positions=[];for(const f of d.faces)for(const i of f)positions.push(...d.vertices[i]);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  // batchStatic bakes metric UVs for scanned surfaces. Give the unscanned
  // windows and paving a consistent metre projection as well.
  const pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=[];
  for(let i=0;i<pos.count;i++){if(Math.abs(normal.getY(i))>.6)uv.push(pos.getX(i),-pos.getZ(i));else if(Math.abs(normal.getX(i))>.6)uv.push(pos.getZ(i),pos.getY(i));else uv.push(pos.getX(i),pos.getY(i));}
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));const mesh=new T.Mesh(geometry,p[d.material]);mesh.name=d.id;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.castleSolid=d.id;
  (d.shell?shells[d.tier]:floors[d.tier]).add(mesh);
 }
 for(const shell of shells)batchStatic(shell);for(const floor of floors)batchStatic(floor);
 Object.assign(group.userData,{deckY,verticalCity:true,layoutSignature:layout.signature,floorCount:layout.floors.length,surfaceLevels:layout.floors.map(f=>deckY+f.y+(f.surfaceOffset??.109)),buildableSlots:layout.floors.length,towerTop:deckY+layout.height+9,footprint:{width:WIDTH,depth:DEPTH},structuralSolidCount:descriptors.length});
 return group;
}
