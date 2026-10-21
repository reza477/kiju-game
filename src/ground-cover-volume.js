import * as T from '../vendor/three.module.js';
import {fieldShrubGeometry} from './field-botany.js';
import {bankWidth, protectedResource, renderedTerrainHeight, roadZ, shoreDistance, terrainNoise, terrainNormal} from './terrain.js';

// This layer is visual-only: it has its own deterministic sampler and never
// registers scenery IDs, consumes landscape randomness or changes saved records.
export const GROUND_COVER_LIMITS=Object.freeze({instances:6400,patches:760,extent:184,cellSize:96,maxRadius:1.6,minimumNormalY:.935,startRadius:27});
const TAU=Math.PI*2,UP=new T.Vector3(0,1,0);
const QUALITIES=Object.freeze({high:[1,135,195],balanced:[.72,115,170],medium:[.72,115,170],low:[.38,85,135],performance:[.18,65,105],retro:[.18,65,105]});
const COLOURS={grass:[0x5b6046,0x838a60,0xa6a273],fern:[0x3e5b52,0x657e65,0x939e79],shrub:[0x485d50,0x748365,0x9b9c71]};
function random(seed){let value=seed>>>0;return()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/4294967296);}

function sceneryExclusion(records){
  const cells=new Map(),size=16;
  for(const record of records){
    if(!Number.isFinite(record.x)||!Number.isFinite(record.z)||!['tree','rock'].includes(record.kind))continue;
    const key=Math.floor(record.x/size)+','+Math.floor(record.z/size);
    if(!cells.has(key))cells.set(key,[]);
    // Read only primitive values; keep no owner/record reference in this layer.
    cells.get(key).push({x:record.x,z:record.z,radius:Math.min(7,Math.max(.7,(record.size||1)*(record.kind==='rock'?1.2:.65)))});
  }
  return(x,z,radius)=>{
    const cx=Math.floor(x/size),cz=Math.floor(z/size);
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)for(const record of cells.get((cx+i)+','+(cz+j))||[])
      if(Math.hypot(x-record.x,z-record.z)<record.radius+radius)return true;
    return false;
  };
}

// A shared, conservative footprint test keeps full plants out of protected
// spaces. Sampling the four compass edges accounts for curving river/road fields.
export function groundCoverLocationAllowed(x,z,radius=GROUND_COVER_LIMITS.maxRadius){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<0)return false;
  if(Math.max(Math.abs(x),Math.abs(z))+radius>GROUND_COVER_LIMITS.extent||protectedResource(x,z,radius+2)||Math.hypot(x+30,z-40)<GROUND_COVER_LIMITS.startRadius+radius)return false;
  for(const [dx,dz]of[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
    const px=x+dx,pz=z+dz;
    if(shoreDistance(px,pz)<bankWidth(px,pz)+2.5||Math.abs(pz-roadZ(px))<10)return false;
  }
  return true;
}

export function createGroundCoverPlacements(existingRecords=[]){
  const rand=random(0x6c74b923),placements=[],occupied=new Map(),blocked=sceneryExclusion(existingRecords),separation=.73,anchors=[];
  const coreBudget=Math.floor(GROUND_COVER_LIMITS.instances*.55);
  let patchCount=0,attempts=0;
  function place(x,z,kind,patch,zone,edge=0){
    attempts++;
    const fringe=zone==='fringe',sx=fringe?.59+(1-edge)*.28+rand()*.16:.70+rand()*.52;
    const sy=fringe?.49+(1-edge)*.18+rand()*.10:kind==='grass'?.62+rand()*.44:kind==='fern'?.78+rand()*.43:.59+rand()*.43;
    const sz=sx*(.82+rand()*.22),footprint=(kind==='grass'?1.03:kind==='fern'?1.12:1.02)*Math.max(sx,sz),yaw=rand()*TAU;
    // Neighbouring plants share a quiet olive value, while large isolated
    // silhouettes no longer receive the brightest independent random tint.
    const patchTone=terrainNoise(x*.025+31,z*.024-7),tint=(fringe?.88:.82)+patchTone*.10+rand()*.025;
    if(!groundCoverLocationAllowed(x,z,footprint)||blocked(x,z,footprint*.58))return;
    if(!fringe&&terrainNoise(x*.13+6,z*.15-11)<.18)return;
    const cellX=Math.floor(x/separation),cellZ=Math.floor(z/separation);
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)for(const point of occupied.get((cellX+i)+','+(cellZ+j))||[])
      if(Math.hypot(x-point.x,z-point.z)<separation)return;
    const normal=terrainNormal(x,z);
    if(normal.y<GROUND_COVER_LIMITS.minimumNormalY)return;
    const y=renderedTerrainHeight(x,z)-.035;
    if(!Number.isFinite(y)||y<.1)return;
    const item={x,y,z,kind,sx,sy,sz,yaw,tint,patch,zone,normal:[normal.x,normal.y,normal.z],radius:footprint};
    placements.push(item);
    const key=cellX+','+cellZ;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push(item);
  }
  for(let patch=0;patch<GROUND_COVER_LIMITS.patches&&placements.length<coreBudget;patch++){
    const cx=(rand()-.5)*352,cz=(rand()-.5)*352,axis=rand()*TAU,radius=8+rand()*12;
    // Wide habitat belts and a second smaller patch field leave open soil
    // between colonies. No regular placement grid is visible in the result.
    const habitat=terrainNoise(cx*.023+17,cz*.019-9);
    if(habitat<.30||!groundCoverLocationAllowed(cx,cz,.2))continue;
    // Nearby colonies have a local dominant shape rather than every patch
    // repeating the same grass/fern/shrub mixture. No new models or instances.
    const composition=terrainNoise(cx*.077-14,cz*.069+23);
    const grassShare=composition<.38?.74:composition>.66?.37:.56;
    const shrubShare=composition>.66?.21:.10;
    const lobeCount=2+Math.floor(rand()*3),count=26+Math.floor(rand()*33),start=placements.length;
    const lobes=Array.from({length:lobeCount},(_,lobe)=>({
      angle:axis+lobe*TAU/lobeCount+Math.sin((patch+3)*(lobe+1)*1.79)*.62,
      width:.54+terrainNoise(cx*.071+lobe*8.3,cz*.083-lobe*5.2)*.65,
    }));
    for(let member=0;member<count&&placements.length<coreBudget;member++){
      const {angle,width}=lobes[member%lobeCount],offset=radius*(.10+rand()*.47);
      const spread=radius*(.15+rand()*.31),a=rand()*TAU,r=Math.sqrt(rand())*spread;
      // Unequal, overlapping ellipses leave broken outlines instead of tidy
      // circular stamps. The conservative placement checks still own all edges.
      const along=offset+Math.cos(a)*r,across=Math.sin(a)*r*width;
      const x=cx+Math.cos(angle)*along-Math.sin(angle)*across,z=cz+Math.sin(angle)*along+Math.cos(angle)*across;
      const pick=rand(),moist=1-Math.min(1,Math.max(0,shoreDistance(x,z)-20)/95);
      const kind=pick<grassShare?'grass':pick<Math.min(.94,1-shrubShare+moist*.045)?'fern':'shrub';
      place(x,z,kind,patch,'core');
    }
    if(placements.length>start){patchCount++;anchors.push({cx,cz,radius});}
  }
  const coreInstances=placements.length;
  // Reallocate the remaining budget to low grass, rather than adding more
  // dense fern/shrub stamps. Half follows soft patch outskirts; the rest makes
  // small loose colonies in eligible middle-valley gaps, with every original
  // resource, road, bank and starting-footprint exclusion applied unchanged.
  for(let fringe=0;fringe<GROUND_COVER_LIMITS.patches&&placements.length<GROUND_COVER_LIMITS.instances;fringe++){
    const edgePatch=anchors.length&&rand()<.56,anchor=edgePatch?anchors[Math.floor(rand()*anchors.length)]:null;
    const angle=rand()*TAU,offset=anchor?anchor.radius*(.35+rand()*.94):0;
    const cx=anchor?anchor.cx+Math.cos(angle)*offset:(rand()-.5)*352;
    const cz=anchor?anchor.cz+Math.sin(angle)*offset:(rand()-.5)*352;
    const spread=5.5+rand()*6.5,width=.52+terrainNoise(cx*.071-19,cz*.083+7)*.50,start=placements.length;
    if(!groundCoverLocationAllowed(cx,cz,.2))continue;
    for(let member=0;member<23&&placements.length<GROUND_COVER_LIMITS.instances;member++){
      const a=rand()*TAU,edge=Math.sqrt(rand()),r=edge*spread;
      // Probability and size taper together, leaving scattered rooted plants
      // between the full clumps and open soil rather than a hard patch edge.
      if(rand()>.94-edge*.47)continue;
      const along=Math.cos(a)*r,across=Math.sin(a)*r*width;
      place(cx+Math.cos(angle)*along-Math.sin(angle)*across,cz+Math.sin(angle)*along+Math.cos(angle)*across,'grass',GROUND_COVER_LIMITS.patches+fringe,'fringe',edge);
    }
    if(placements.length>start)patchCount++;
  }
  return {placements,patchCount,attempts,coreInstances,fringeInstances:placements.length-coreInstances};
}

// Broad folded leaves are visible from above. Three small opaque masters avoid
// alpha-card overdraw, per-leaf models and texture mip/startup costs.
export function createGroundCoverGeometry(kind){
  if(!COLOURS[kind])throw new RangeError('Unknown ground-cover shape '+kind);
  const positions=[],colours=[],palette=COLOURS[kind].map(hex=>new T.Color(hex)),colour=new T.Color();
  const emit=(a,b,c)=>{for(const point of[a,b,c]){positions.push(...point);const h=Math.max(0,Math.min(1,point[1]));colour.copy(palette[0]).lerp(palette[1],Math.min(1,h*2.6)).lerp(palette[2],Math.max(0,h-.25)*.70);colours.push(colour.r,colour.g,colour.b);}};
  if(kind==='shrub'){
    const geometry=fieldShrubGeometry(true);geometry.deleteAttribute('uv');return geometry;
  }else if(kind==='fern'){
    // Four bowed fronds, each with two opposing pairs of folded leaflets.
    // Notches between the leaflets supply the fern silhouette from City view.
    for(let frond=0;frond<4;frond++){
      const a=frond*2.399963+.26,dx=Math.cos(a),dz=Math.sin(a),reach=.97+(frond%3)*.045,height=.62+(frond%3)*.055;
      const point=(t,y,side)=>[dx*reach*t-dz*side,y,dz*reach*t+dx*side];
      for(let tier=0;tier<2;tier++){
        const start=tier? .46:0,end=tier?1:.58,centre=tier?.72:.31,width=tier?.18:.27;
        const root=point(start,tier?height*.84:0,0),tip=point(end,tier?height*.72:height*.94,0),ridge=point(centre,height*(tier?1:.73),0);
        for(const side of[-1,1]){
          const leaf=point(centre-.065,height*(tier?.72:.47),side*width);
          if(side<0){emit(root,leaf,ridge);emit(leaf,tip,ridge);}else{emit(root,ridge,leaf);emit(leaf,ridge,tip);}
        }
      }
    }
  }else{
    // Unequal upright blades share a loose windward lean. Offset roots and
    // shortened outer blades avoid the repeated five-pointed star silhouette.
    // The envelope contracts inside the already checked placement footprint.
    const blades=[[-.14,.06,.98,.52,.085,.10],[.10,-.07,.79,.67,.075,.62],[-.02,.14,.56,.44,.080,2.1],[.17,.10,.66,.56,.068,-.38],[-.18,-.09,.43,.38,.072,2.7]];
    for(const [rx,rz,height,reach,width,a]of blades){
      const dx=Math.cos(a),dz=Math.sin(a);
      const point=(t,h,side)=>[rx+dx*reach*t-dz*width*side,h,rz+dz*reach*t+dx*width*side];
      const root=[rx,0,rz],left=point(.38,height*.52,1),right=point(.38,height*.52,-1);
      const peak=point(1,height,0);
      emit(root,left,peak);emit(root,peak,right);
    }
  }
  const geometry=new T.BufferGeometry();geometry.name='Ground cover '+kind+' master';
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

function createMaterial(timeUniform,range){
  const material=new T.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide});
  material.name='Opaque botanical ground cover';material.userData.noBatch=true;
  material.onBeforeCompile=shader=>{
    shader.uniforms.uGroundCoverTime=timeUniform;shader.uniforms.uCoverRange=range;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform float uGroundCoverTime;uniform vec2 uCoverRange;
    `).replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 coverAnchor=(modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
        float coverDistance=length(cameraPosition-coverAnchor);
        float coverScale=1.0-smoothstep(uCoverRange.x,uCoverRange.y,coverDistance);
        // Only upper leaves bend; the common root never slides over the soil.
        float coverTip=clamp(position.y,0.0,1.0);
        float coverPhase=coverAnchor.x*.087+coverAnchor.z*.053;
        float coverBreeze=sin(uGroundCoverTime*.91+coverPhase)*.041;
        transformed.xz+=vec2(coverBreeze,coverBreeze*.43)*coverTip*coverTip;
        // Opaque geometry shrinks into its own root at distance. No alpha test,
        // transparent pass, per-frame matrix upload or fragment discard.
        transformed*=coverScale;
      #endif
    `);
  };
  material.customProgramCacheKey=()=> 'ground-cover-volume-v1';return material;
}

export function createGroundCoverVolume({timeUniform={value:0},existingRecords=[]}={}){
  if(!timeUniform||!Number.isFinite(timeUniform.value))throw new TypeError('Ground cover requires a finite existing time uniform');
  const group=new T.Group();group.name='Low-poly ground cover';group.userData.noBatch=true;
  // Pinned Three's false raycast return also skips this decorative subtree.
  group.raycast=()=>false;
  const {placements,patchCount,attempts,coreInstances,fringeInstances}=createGroundCoverPlacements(existingRecords),range={value:new T.Vector2(135,195)};
  const material=createMaterial(timeUniform,range),geometries=Object.fromEntries(['grass','fern','shrub'].map(kind=>[kind,createGroundCoverGeometry(kind)]));
  const cells=new Map(),dummy=new T.Object3D(),tilt=new T.Quaternion(),turn=new T.Quaternion(),normal=new T.Vector3(),colour=new T.Color(),meshes=[];
  for(const item of placements){
    const cell=Math.floor(item.x/GROUND_COVER_LIMITS.cellSize)+','+Math.floor(item.z/GROUND_COVER_LIMITS.cellSize),key=item.kind+':'+cell;
    if(!cells.has(key))cells.set(key,{kind:item.kind,cell,items:[]});cells.get(key).items.push(item);
  }
  const masterTriangles=Object.fromEntries(Object.entries(geometries).map(([kind,g])=>[kind,g.attributes.position.count/3]));
  const buckets=Object.fromEntries(Object.keys(geometries).map(kind=>[kind,[]]));
  const qualityCounts=Object.fromEntries(Object.keys(QUALITIES).map(quality=>[quality,{grass:0,fern:0,shrub:0}]));
  for(const {kind,items}of cells.values()){
    // Preserve the reviewed cell-level quality selection exactly, but pack its
    // nested subsets into three global draws. No per-frame compaction/upload.
    items.sort((a,b)=>(Math.sin(a.x*4.1+a.z*7.3)-Math.sin(b.x*4.1+b.z*7.3)));
    const ends=[.18,.38,.72,1].map(fraction=>Math.floor(items.length*fraction));
    for(let i=0;i<items.length;i++)buckets[kind].push({item:items[i],tier:ends.findIndex(end=>i<end)});
    for(const [quality,[fraction]]of Object.entries(QUALITIES))qualityCounts[quality][kind]+=Math.floor(items.length*fraction);
  }
  for(const [kind,entries]of Object.entries(buckets)){
    entries.sort((a,b)=>a.tier-b.tier);const items=entries.map(entry=>entry.item);
    const mesh=new T.InstancedMesh(geometries[kind],material,items.length);mesh.name='Low-poly '+kind+' valley batch';
    mesh.userData={noBatch:true,groundCoverVolume:kind,spatialCell:'valley'};mesh.castShadow=false;mesh.receiveShadow=false;mesh.raycast=()=>false;
    for(let i=0;i<items.length;i++){
      const item=items[i];normal.fromArray(item.normal);tilt.setFromUnitVectors(UP,normal);turn.setFromAxisAngle(UP,item.yaw);
      dummy.position.set(item.x,item.y,item.z);dummy.quaternion.copy(tilt).multiply(turn);dummy.scale.set(item.sx,item.sy,item.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      colour.setRGB(item.tint,item.tint,.96*item.tint);mesh.setColorAt(i,colour);
    }
    mesh.instanceMatrix.setUsage(T.StaticDrawUsage);mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.setUsage(T.StaticDrawUsage);mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingBox();mesh.boundingBox.expandByScalar(.085);mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.085;
    meshes.push(mesh);group.add(mesh);
  }
  const byKind={grass:0,fern:0,shrub:0};for(const item of placements)byKind[item.kind]++;
  const chunks=meshes.map(mesh=>({name:mesh.name,kind:mesh.userData.groundCoverVolume,cell:mesh.userData.spatialCell,instances:mesh.count,trianglesPerInstance:masterTriangles[mesh.userData.groundCoverVolume]}));
  const qualityBudgets=Object.fromEntries(Object.entries(QUALITIES).map(([quality,[,near,far]])=>[quality,{instances:chunks.reduce((n,c)=>n+qualityCounts[quality][c.kind],0),triangles:chunks.reduce((n,c)=>n+qualityCounts[quality][c.kind]*c.trianglesPerInstance,0),maxDraws:chunks.filter(c=>qualityCounts[quality][c.kind]>0).length,fadeStart:near,fadeEnd:far}]));
  const stats={instances:placements.length,maxInstanceBudget:GROUND_COVER_LIMITS.instances,byKind,masterTriangles,totalTriangles:chunks.reduce((n,c)=>n+c.instances*c.trianglesPerInstance,0),
    uniqueGeometryBytes:Object.values(geometries).reduce((n,g)=>n+Object.values(g.attributes).reduce((sum,a)=>sum+a.array.byteLength,0),0),instanceBytes:meshes.reduce((n,m)=>n+m.instanceMatrix.array.byteLength+m.instanceColor.array.byteLength,0),
    chunks,qualityBudgets,placementSummary:{extent:GROUND_COVER_LIMITS.extent,patches:patchCount,attempts,coreInstances,fringeInstances,minimumNormalY:GROUND_COVER_LIMITS.minimumNormalY,resourceMargin:2,startRadius:GROUND_COVER_LIMITS.startRadius},quality:'high',activeInstances:placements.length,activeTriangles:qualityBudgets.high.triangles,disposed:false};
  return{group,stats,setQuality(quality){
    if(stats.disposed)return;
    const selected=QUALITIES[quality]?quality:'high',[,near,far]=QUALITIES[selected];
    meshes.forEach((mesh,i)=>{mesh.count=qualityCounts[selected][chunks[i].kind];mesh.visible=mesh.count>0;});
    range.value.set(near,far);stats.quality=selected;stats.activeInstances=qualityBudgets[selected].instances;stats.activeTriangles=qualityBudgets[selected].triangles;
  },dispose(){
    if(stats.disposed)return;stats.disposed=true;group.removeFromParent();
    for(const mesh of meshes)mesh.dispose();for(const geometry of Object.values(geometries))geometry.dispose();material.dispose();group.clear();
    stats.activeInstances=stats.activeTriangles=0;
  }};
}
