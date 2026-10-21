import * as T from '../vendor/three.module.js';
import {getMaterial} from './materials.js';
import {fallenWoodGeometry,rosetteGeometry} from './ground-dressing.js';
import {bankWidth,protectedResource,renderedTerrainHeight,roadZ,shoreDistance,terrainNormal} from './terrain.js';

// A handful of readable places, not a second random scatter. All display pieces
// belong to old scenery owners; no new obstacle, resource, save ID or tick.
export const RECLAIMED_PLACES=Object.freeze([
  [-68,43,'workyard'],[-79,-57,'field'],[-29,-83,'waymark'],[61,1,'workyard'],
  [96,35,'field'],[126,-69,'workyard'],[123,2,'waymark'],[61,111,'field'],
  [-74,102,'waymark'],[-140,61,'field'],[-154,-13,'workyard'],[144,110,'field'],
  [-48,-133,'field'],[48,-134,'waymark'],[-139,-151,'workyard'],[151,-136,'field'],
  [-54,7,'field'],[-75,69,'workyard'],[89,-26,'field'],[116,81,'waymark'],
].map(([x,z,kind])=>Object.freeze({x,z,kind})));
export const RECLAIMED_LIMITS=Object.freeze({extent:178,ownerReach:21,placeSeparation:17,startRadius:28,roadMargin:10,resourceMargin:3,minimumNormalY:.94,maxInstances:1400,maxTriangles:180000,maxDraws:5});
const TAU=Math.PI*2;
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);

export function reclaimedLocationAllowed(x,z,radius=0){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<0)return false;
  if(Math.max(Math.abs(x),Math.abs(z))+radius>RECLAIMED_LIMITS.extent||protectedResource(x,z,radius+RECLAIMED_LIMITS.resourceMargin)||Math.hypot(x+30,z-40)<RECLAIMED_LIMITS.startRadius+radius)return false;
  for(const[dx,dz]of[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
    const px=x+dx,pz=z+dz;
    if(shoreDistance(px,pz)<bankWidth(px,pz)+3||Math.abs(pz-roadZ(px))<RECLAIMED_LIMITS.roadMargin||terrainNormal(px,pz).y<RECLAIMED_LIMITS.minimumNormalY)return false;
  }
  return renderedTerrainHeight(x,z)>.05;
}

// Chipped limestone courses, with shallow bevels and uneven broken crowns. Both
// masters are closed; quiet vertex shading gives the same painted stone map
// large planes to describe at ordinary City camera distance.
export function reclaimedStoneGeometry(marker=false){
  const p=[],uv=[],colors=[],rand=random(marker?4617:917),tone=new T.Color();
  function block(x,y,z,w,h,d,seed){
    const b=Math.min(w,d)*.105,ring=[[-w/2+b,-d/2],[w/2-b,-d/2],[w/2,-d/2+b],[w/2,d/2-b],[w/2-b,d/2],[-w/2+b,d/2],[-w/2,d/2-b],[-w/2,-d/2+b]];
    const low=ring.map(([a,b])=>[a,0,b]),rim=ring.map(([a,b],i)=>[a*.93,h-.05-(Math.sin(seed+i*2.3)+1)*.035,b*.93]);
    function tri(a,b,c,shade){
      tone.setHex(0xd4cfba).multiplyScalar(shade);
      for(const q of[a,b,c]){p.push(x+q[0],y+q[1],z+q[2]);uv.push((x+q[0]+z+q[2])*.45,(y+q[1])*.45);colors.push(tone.r,tone.g,tone.b);}
    }
    for(let i=0;i<8;i++){const j=(i+1)%8,shade=.79+(i%3)*.055;tri(low[i],rim[i],low[j],shade);tri(low[j],rim[i],rim[j],shade);tri([0,h-.04,0],rim[j],rim[i],.98);tri([0,0,0],low[i],low[j],.68);}
  }
  if(marker){
    block(0,0,0,1.42,.35,1.23,1);
    for(let i=0;i<4;i++)block(Math.sin(i*1.7)*.045,.29+i*.53,0,.98-i*.055,.60,.84-i*.03,i+2);
    block(-.05,2.39,-.015,1.25,.32,1.03,9);
    // Unequal surviving capstones form a broken pointed silhouette, not a box.
    block(-.20,2.65,-.01,.69,.42,.71,10);block(.25,2.65,.03,.37,.23,.62,13);
  }else block(0,0,0,1.28,.53,.76,rand()*9);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.name=marker?'Broken route pier':'Chipped field-boundary stone';return g;
}

export function reclaimedStakeGeometry(){
  const g=new T.CylinderGeometry(.11,.15,1.8,7,1,false),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i);p.setY(i,y+.9+(y>.85?.16*Math.sin(Math.atan2(p.getZ(i),p.getX(i))*3):0));}
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.name='Weathered split workyard stake';return g;
}

export function createReclaimedMasters(){return{stone:reclaimedStoneGeometry(),marker:reclaimedStoneGeometry(true),wood:fallenWoodGeometry(),stake:reclaimedStakeGeometry(),leaves:rosetteGeometry()};}

// Test the actual authored base vertices against the rendered surface. The
// narrow contact band is slightly buried; a piece that would disappear into a
// slope is rejected rather than floating on a centre-height approximation.
export function groundedReclaimedItem(geometry,item,{rejectBurial=true}={}){
  const {x,z,sx,sy,sz,yaw}=item,co=Math.cos(yaw),si=Math.sin(yaw),p=geometry.attributes.position,b=geometry.boundingBox;
  const base=b.min.y+(b.max.y-b.min.y)*.035;let low=Infinity,high=-Infinity;
  for(let i=0;i<p.count;i++)if(p.getY(i)<=base){
    const a=p.getX(i)*sx,c=p.getZ(i)*sz,wx=x+a*co+c*si,wz=z-a*si+c*co,value=renderedTerrainHeight(wx,wz)-p.getY(i)*sy;
    low=Math.min(low,value);high=Math.max(high,value);
  }
  if(!Number.isFinite(low)||(rejectBurial&&high-low>Math.max(.20,(b.max.y-b.min.y)*sy*.42)))return null;
  return{...item,y:low-.025};
}

export function planReclaimedPlaces(records,masters){
  const candidates=records.filter(r=>['tree','rock'].includes(r.kind)&&reclaimedLocationAllowed(r.x,r.z,2)).slice().sort((a,b)=>a.id.localeCompare(b.id)),used=new Set(),places=[],items=[];
  const extents=Object.fromEntries(Object.entries(masters).map(([kind,g])=>{const b=g.boundingBox;return[kind,[Math.max(Math.abs(b.min.x),Math.abs(b.max.x)),Math.max(Math.abs(b.min.z),Math.abs(b.max.z))]];}));
  for(const anchor of RECLAIMED_PLACES){
    const owner=candidates.filter(r=>!used.has(r.id)&&Math.hypot(r.x-anchor.x,r.z-anchor.z)<RECLAIMED_LIMITS.ownerReach&&!places.some(p=>Math.hypot(p.x-r.x,p.z-r.z)<RECLAIMED_LIMITS.placeSeparation)).sort((a,b)=>Math.hypot(a.x-anchor.x,a.z-anchor.z)-Math.hypot(b.x-anchor.x,b.z-anchor.z)||a.id.localeCompare(b.id))[0];
    if(!owner)continue;
    const rand=random(hash(owner.id+':'+anchor.kind)),axis=rand()*TAU,co=Math.cos(axis),si=Math.sin(axis),first=items.length;
    const point=(along,across)=>[owner.x+co*along-si*across,owner.z+si*along+co*across];
    function place(kind,along,across,sx=1,sy=1,sz=1,turn=axis,tint=0xffffff){
      const [x,z]=point(along,across),radius=Math.hypot(extents[kind][0]*sx,extents[kind][1]*sz);
      if(items.length>=RECLAIMED_LIMITS.maxInstances||!reclaimedLocationAllowed(x,z,radius))return;
      // Keep the substantial structures out of neighbouring trunks/boulders.
      if(kind!=='leaves'&&records.some(r=>r.id!==owner.id&&Math.hypot(r.x-x,r.z-z)<Math.min(2.2,r.size||1)+radius*.55))return;
      const item=groundedReclaimedItem(masters[kind],{kind,ownerId:owner.id,x,z,sx,sy,sz,yaw:turn,tint,radius});if(item)items.push(item);
    }
    if(anchor.kind==='workyard'){
      // A broken entrance, a short open fence and a fan of felled timbers.
      // The gaps remain larger than the surviving wall segments.
      place('marker',-2.7,2.6,.88,.90,.88,axis+.12);
      place('marker',2.7,2.6,.79,.43,.79,axis-.18);
      for(let i=0;i<4;i++)place('wood',-.7+i*.65,-2.4+(i%2)*.42,.95-i*.055,.88,.85,axis+.16+i*.085,0xb7a78b);
      for(const a of[-4.9,-3.1,3.2,4.9])place('stake',a,2.75,.95,.88+rand()*.22,.95,axis,0xada18a);
      for(let i=0;i<5;i++)place('stone',-4.8+i*1.05,3.7,.83+rand()*.18,.85,.85,axis+(rand()-.5)*.16);
    }else if(anchor.kind==='field'){
      // Two unequal low walls imply former plots, but never close a paddock.
      for(const line of[-1,1])for(let i=0;i<8;i++){
        if((line<0&&i>4)||(line>0&&i===3))continue;
        const a=-4.2+i*1.19,b=line*2.9+Math.sin(i*.7)*.23;
        place('stone',a,b,.87+rand()*.22,.64+rand()*.39,.88,axis+(rand()-.5)*.15,0xe0dac6);
      }
      place('marker',-4.8,-2.9,.72,.51,.72,axis+.24);
      place('wood',3.7,3.8,.86,.83,.79,axis+.4,0xa99d83);
    }else{
      place('marker',2.9,1.0,1.0,1.08,1.0,axis+.2);
      for(let i=0;i<7;i++)place('stone',2.7+Math.cos(i*.63)*2.1,1.0+Math.sin(i*.63)*1.55,.69+rand()*.33,.57+rand()*.45,.8,axis+i*.43);
      place('wood',-2.3,-1.6,1.13,.84,.86,axis+.43,0xb3a087);
    }
    const substantial=items.length-first;
    if(!substantial)continue;
    // Plants inhabit the broken edges and timber piles, not a uniform carpet.
    for(let i=0;i<44;i++){
      const lobe=i%3,a=rand()*TAU,r=Math.sqrt(rand())*(lobe===0?2.6:1.8),along=[-3.8,3.6,0][lobe]+Math.cos(a)*r,across=[3.2,-2.1,4.8][lobe]+Math.sin(a)*r*.58;
      const size=.85+rand()*.82;place('leaves',along,across,size,size*(.8+rand()*.3),size*(.8+rand()*.2),rand()*TAU,[0xa9ae83,0xc0bc91,0x899b7e][lobe]);
    }
    places.push({ownerId:owner.id,kind:anchor.kind,x:owner.x,z:owner.z,first,count:items.length-first,structuralInstances:substantial});used.add(owner.id);
  }
  return{places,items};
}

// Only the new display pieces respond here. Their old owner's saved destruction
// remains authoritative; no collider, damage entry or resource is introduced.
// A touched marker settles into shallow stone rubble; stakes and logs flatten
// to timber at their own sampled terrain contact, never at the owner's height.
export function createReclaimedBreakaway(structures){
  const previous=new Map(),broken=new Set(),changed=new Set(),current=new T.Matrix4(),dummy=new T.Object3D();let activeMode=null;
  const factors={marker:.075,stone:.29,wood:.28,stake:.09};
  const stats={active:0,totalTransitions:0,matrixUploads:0};
  for(const entry of structures){
    const {item,batch,index}=entry;entry.original=new T.Matrix4();batch.mesh.getMatrixAt(index,entry.original);
    const settled=groundedReclaimedItem(batch.geometry,{...item,sy:item.sy*factors[item.kind]},{rejectBurial:false});
    dummy.position.set(settled.x,settled.y,settled.z);dummy.rotation.set(0,settled.yaw,0);dummy.scale.set(settled.sx,settled.sy,settled.sz);dummy.updateMatrix();
    // GPU instance storage is float32. Keep the comparison in that same format
    // so an already flattened piece does not upload again due to rounding.
    entry.flattened=new T.Matrix4().fromArray(Float32Array.from(dummy.matrix.elements));
  }
  const same=(a,b)=>a.elements.every((v,i)=>v===b.elements[i]);
  function write(entry,matrix){
    const mesh=entry.batch.mesh;mesh.getMatrixAt(entry.index,current);
    // A saved/physical owner crush must never be revived by cosmetic state.
    if(current.elements[13]<-4000||same(current,matrix))return;
    mesh.setMatrixAt(entry.index,matrix);changed.add(mesh);stats.matrixUploads++;
  }
  function flush(){for(const mesh of changed)mesh.instanceMatrix.needsUpdate=true;changed.clear();stats.active=broken.size;}
  function reset(options=null){
    for(const entry of broken)write(entry,entry.original);
    broken.clear();previous.clear();activeMode=options?.mode??null;flush();
  }
  return{stats,reset,interact(actors,delta,options={}){
    const mode=options?.mode??'expedition';if(mode!==activeMode){reset({mode});}
    for(const actor of actors){
      if(![actor.x,actor.z].every(Number.isFinite))continue;
      const key=actor.id||actor.faction,old=previous.get(key)||actor,dx=actor.x-old.x,dz=actor.z-old.z,distance=Math.hypot(dx,dz),tank=actor.faction==='crawler';
      if(actor.moving&&(actor.faction==='kaiju'||tank)&&delta>0&&distance>.005&&distance<70){
        const scale=Math.max(.1,actor.scale||1),fp=actor.footprintScale??{x:1,z:1},angle=actor.angle||0,sin=Math.sin(angle),cos=Math.cos(angle),length2=distance*distance;
        for(const entry of structures){
          if(broken.has(entry))continue;
          const item=entry.item,t=T.MathUtils.clamp(((item.x-old.x)*dx+(item.z-old.z)*dz)/length2,0,1),rx=item.x-old.x-dx*t,rz=item.z-old.z-dz*t;
          const lateral=rx*cos-rz*sin,forward=rx*sin+rz*cos,radius=item.radius;
          const underHull=Math.abs(lateral)<(tank?10.6*fp.x:5.1)*scale+radius&&Math.abs(forward)<(tank?12.1*fp.z:4.2)*scale+radius;
          const underDrill=tank&&actor.variant==='drill'&&forward>15*scale&&forward<33.8*scale+radius&&Math.abs(lateral)<Math.max(.2,(33.8-forward/scale)/18.8*4.3)*scale+radius;
          if(underHull||underDrill){broken.add(entry);write(entry,entry.flattened);stats.totalTransitions++;}
        }
      }
      previous.set(key,{x:actor.x,z:actor.z});
    }
    // Owner restoration can happen during save/mode synchronization or bounded
    // debris recycling. Reapply only an actually changed visible matrix.
    for(const entry of broken)write(entry,entry.flattened);
    flush();
  }};
}

export function bindReclaimedPlaces({group,Instances,records}){
  const masters=createReclaimedMasters(),plan=planReclaimedPlaces(records,masters),batches={
    stone:new Instances(group,masters.stone,getMaterial('stone',0xb1b5a0,{vertexColors:true,roughness:1}),true),
    marker:new Instances(group,masters.marker,getMaterial('stone',0xb1b5a0,{vertexColors:true,roughness:1}),true),
    wood:new Instances(group,masters.wood,getMaterial('bark',0x8e8770,{roughness:1}),true),
    stake:new Instances(group,masters.stake,getMaterial('bark',0x8e8770,{roughness:1}),true),
    // This bounded set is cheaper as one draw than thirteen sparse cells.
    // Existing large forest/meadow batches keep their usual spatial partition.
    leaves:new Instances(group,masters.leaves,getMaterial('foliage',0xffffff,{vertexColors:true,side:T.DoubleSide,roughness:.96}),false,'grass',{partition:false}),
  },byId=new Map(records.map(r=>[r.id,r])),owners=[],structures=[];
  for(const place of plan.places){
    const starts=Object.fromEntries(Object.entries(batches).map(([k,b])=>[k,b.items.length])),owner=byId.get(place.ownerId),refs=[];
    for(const item of plan.items.slice(place.first,place.first+place.count)){
      const batch=batches[item.kind],i=batch.add(item.x,item.y,item.z,item.sx,item.sy,item.sz,item.tint,item.yaw);
      if(item.kind!=='leaves')structures.push({item,batch,index:i});
      if(item.kind==='leaves'){batch.items[i].windRoot=[item.x,item.y+.07*item.sy,item.z,.45*item.sy];batch.items[i].windFlex=[.035,.004];batch.items[i].windMotion=[.62,1.25];}
    }
    for(const[kind,batch]of Object.entries(batches)){const first=starts[kind],count=batch.items.length-first;if(count){owner.parts.push({batch,first,count});refs.push({kind,first,count});}}
    owners.push({...place,batches:refs});
  }
  const meshes=[];let triangles=0,geometryBytes=0,instanceBytes=0;
  for(const[kind,batch]of Object.entries(batches)){
    const mesh=batch.finish('Reclaimed places '+kind);if(!mesh){masters[kind].dispose();continue;}
    for(const part of mesh.spatialChunks??[mesh]){part.userData.reclaimedPlaces=kind;part.raycast=()=>false;}
    mesh.userData.reclaimedPlaces=kind;meshes.push(mesh);
    triangles+=mesh.count*(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
    geometryBytes+=Object.values(masters[kind].attributes).reduce((n,a)=>n+a.array.byteLength,0)+(masters[kind].index?.array.byteLength??0);
    instanceBytes+=mesh.instanceMatrix.array.byteLength+(mesh.instanceColor?.array.byteLength??0);
  }
  const draws=meshes.reduce((n,m)=>n+(m.spatialChunks?.length??1),0);
  const small=meshes.find(m=>m.userData.reclaimedPlaces==='leaves'),smallTriangles=small?small.count*(small.geometry.index?.count??small.geometry.attributes.position.count)/3:0;
  const byKind=Object.fromEntries(meshes.map(m=>[m.userData.reclaimedPlaces,{instances:m.count,triangles:m.count*(m.geometry.index?.count??m.geometry.attributes.position.count)/3}]));
  const breakaway=createReclaimedBreakaway(structures);
  const stats={places:owners,instances:plan.items.length,triangles,draws,geometryBytes,instanceBytes,byKind,breakaway:breakaway.stats,quality:'high',activeTriangles:triangles,activeDraws:draws};
  return{meshes,stats,interact:breakaway.interact,reset:breakaway.reset,setQuality(quality){
    stats.quality=quality;const low=['low','retro','performance'].includes(quality);
    for(const mesh of meshes){const small=mesh.userData.reclaimedPlaces==='leaves';mesh.castShadow=!low&&!small;mesh.visible=!low||!small;}
    stats.activeTriangles=triangles-(low?smallTriangles:0);stats.activeDraws=draws-(low&&small?1:0);
  }};
}
