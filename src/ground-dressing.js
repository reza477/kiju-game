import * as T from '../vendor/three.module.js';
import { getMaterial } from './materials.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { partitionStaticInstances } from './spatial-instances.js';
import { renderedTerrainHeight, terrainNormal, protectedResource, shoreDistance, bankWidth, roadZ } from './terrain.js';

// Small visual assemblies belong to old scenery records. They add no resource,
// picking proxy, collision, save ID, simulation tick or random-stream consumer.
export const DRESSING_AREA=Object.freeze({minX:-180,maxX:180,minZ:-180,maxZ:180});
const TAU=Math.PI*2;
const inArea=(x,z)=>x>=DRESSING_AREA.minX&&x<=DRESSING_AREA.maxX&&z>=DRESSING_AREA.minZ&&z<=DRESSING_AREA.maxZ;
const inPilot=(x,z)=>x>=-65&&x<=32&&z>=-140&&z<=-90;
const seedFor=text=>{let seed=2166136261;for(const ch of text)seed=Math.imul(seed^ch.charCodeAt(0),16777619);return seed>>>0;};
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const up=new T.Vector3(0,1,0);
function surfaceRotation(x,z,yaw){
  const dx=(renderedTerrainHeight(x+.4,z)-renderedTerrainHeight(x-.4,z))/.8;
  const dz=(renderedTerrainHeight(x,z+.4)-renderedTerrainHeight(x,z-.4))/.8;
  return new T.Quaternion().setFromUnitVectors(up,new T.Vector3(-dx,1,-dz).normalize()).multiply(new T.Quaternion().setFromAxisAngle(up,yaw));
}

function finish(positions,uvs,colours,name){
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.name=name;
  return geometry;
}

// Curled lanceolate leaves, deliberately unequal and clustered at one rooted
// rosette. Their central ridge catches broad light without transparent cards.
export function rosetteGeometry(){
  const p=[],uv=[],c=[];
  for(let leaf=0;leaf<9;leaf++){
    const a=leaf*2.399963+.3,reach=.43+(leaf%4)*.11,h=.17+(leaf%3)*.055,w=.082+(leaf%3)*.018;
    const dx=Math.cos(a),dz=Math.sin(a),sx=-dz,sz=dx;
    const rows=[[0,.018,0],[.36,h*.78,w],[.76,h,w*.67],[1,h*.58,0]];
    const points=rows.map(([t,y,width])=>[-1,0,1].map(side=>[dx*reach*t+sx*width*side,y+(side===0?.026:0)*Math.sin(t*Math.PI),dz*reach*t+sz*width*side]));
    const emit=(row,side)=>{p.push(...points[row][side]);uv.push(side*.5,row/3);const shade=.59+row*.075+(leaf%3)*.025;c.push(shade*.77,shade,shade*.59);};
    for(let row=0;row<3;row++)for(let side=0;side<2;side++){
      // The root and tip collapse to points. Emit only their real triangles.
      if(row>0)for(const[r,s]of[[row,side],[row,side+1],[row+1,side]])emit(r,s);
      if(row<2)for(const[r,s]of[[row,side+1],[row+1,side+1],[row+1,side]])emit(r,s);
    }
  }
  return finish(p,uv,c,'Rooted woodland sorrel leaves');
}

export function shingleGeometry(){
  const p=[],uv=[],c=[],rim=[[-.46,-.32],[-.1,-.43],[.39,-.26],[.49,.12],[.12,.36],[-.36,.28]];
  const top=rim.map(([x,z],i)=>[x,.16+(i%3)*.018,z]),bottom=rim.map(([x,z])=>[x*.91,-.08,z*.91]);
  function tri(points,shade){for(const point of points){p.push(...point);uv.push(point[0],point[2]);c.push(shade,shade,shade*.94);}}
  for(let i=0;i<6;i++){const j=(i+1)%6;tri([[.04,.25,-.035],top[j],top[i]],.83+(i%3)*.055);tri([top[i],top[j],bottom[i]],.75);tri([top[j],bottom[j],bottom[i]],.76);tri([[0,-.08,0],bottom[i],bottom[j]],.68);}
  return finish(p,uv,c,'Angular buried river shingle');
}

// Broken wood is modeled, not a smooth cylinder with a brown tint. The branch
// scars, unequal splintered ends and flattened soil contact use a shared mesh.
export function fallenWoodGeometry(){
  const parts=[],body=new T.CylinderGeometry(.21,.32,3.1,11,6,false),p=body.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),r=1+.12*Math.sin(a*5+.5)+.045*Math.cos(y*7+a*3);
    p.setXYZ(i,x*r,y+(Math.abs(y)>1.54?.15*Math.sin(a*4+.3)+.10*Math.cos(a*7):0),z*r);
  }
  body.rotateZ(Math.PI/2);body.translate(0,.24,0);body.computeVertexNormals();parts.push(body);
  for(const [x,a,length]of[[-.7,.65,.78],[.53,-.95,.63],[.9,2.15,.47]]){
    const twig=new T.CylinderGeometry(.035,.13,length,7,2),q=new T.Quaternion().setFromUnitVectors(up,new T.Vector3(.42,Math.cos(a),Math.sin(a)).normalize());
    twig.applyQuaternion(q);twig.translate(x,.32+Math.max(0,Math.cos(a))*length*.25,Math.sin(a)*length*.27);parts.push(twig);
  }
  // All pieces have position/normal/uv only; the parent instance colour provides
  // the subtle variation, and existing local bark maps provide the surface.
  const pieces=parts.map(g=>g.toNonIndexed()),geometry=mergeGeometries(pieces,false);for(const g of [...parts,...pieces])g.dispose();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.name='Splintered fallen woodland limb';return geometry;
}

// The remains of a low masonry pier: unequal courses, chipped bevels and a few
// fallen blocks. This is one small visual assembly, never a building or cover.
export function masonryRemnantGeometry(){
  const p=[],uv=[],c=[];
  function block(x,y,z,w,h,d,turn,seed){
    const rand=random(seed),bevel=Math.min(w,d)*.12;
    const rim=[[-w/2+bevel,-d/2],[w/2-bevel,-d/2],[w/2,-d/2+bevel],[w/2,d/2-bevel],[w/2-bevel,d/2],[-w/2+bevel,d/2],[-w/2,d/2-bevel],[-w/2,-d/2+bevel]];
    const cs=Math.cos(turn),sn=Math.sin(turn),top=rim.map(([a,b])=>[a*.9,h-.045-rand()*.08,b*.9]);
    const low=rim.map(([a,b])=>[a,0,b]),shoulder=rim.map(([a,b],i)=>[a,top[i][1]-.06,b]);
    function tri(a,b,d,shade){for(const v of[a,d,b]){const wx=x+v[0]*cs-v[2]*sn,wz=z+v[0]*sn+v[2]*cs,wy=y+v[1];p.push(wx,wy,wz);uv.push((v[0]+v[2])*.52,wy*.52);const moss=Math.max(0,1-wy/.65)*.23;c.push(shade*(1-moss*.9),shade*(1-moss*.35),shade*(.94-moss));}}
    for(let i=0;i<8;i++){
      const j=(i+1)%8,shade=.77+(i%3)*.037;
      tri(low[i],low[j],shoulder[i],shade);tri(low[j],shoulder[j],shoulder[i],shade);
      tri(shoulder[i],shoulder[j],top[i],shade+.045);tri(shoulder[j],top[j],top[i],shade+.045);
      tri([0,h-.1,0],top[i],top[j],.86);tri([0,0,0],low[j],low[i],.64);
    }
  }
  block(-.47,0,-.10,1.23,.53,.92,.08,921);
  block(-.50,.48,-.12,1.02,.57,.76,-.035,1921);
  block(-.39,.99,-.13,.80,.46,.65,.055,2921);
  block(.60,-.04,.12,.89,.41,.75,.40,3921);
  block(.12,-.055,.69,.57,.28,.47,-.61,4921);
  return finish(p,uv,c,'Chipped mossy masonry remnant');
}

export function bindGroundDressing({group,Instances,records}){
  const leaves=new Instances(group,rosetteGeometry(),getMaterial('foliage',0xffffff,{vertexColors:true,side:T.DoubleSide,roughness:.96}),false,'grass');
  const chips=new Instances(group,shingleGeometry(),getMaterial('rock',0xa1a293,{vertexColors:true,roughness:1}),false);
  const wood=new Instances(group,fallenWoodGeometry(),getMaterial('bark',0x8e8770,{roughness:1}),true);
  const masonry=new Instances(group,masonryRemnantGeometry(),getMaterial('stone',0xb1b5a0,{vertexColors:true,roughness:1}),true);
  const batches=[['woodland-leaves',leaves],['bank-shingle',chips],['fallen-wood',wood],['masonry-remnant',masonry]],owners=[];
  const acceptable=(x,z)=>inArea(x,z)&&!protectedResource(x,z,2)&&Math.abs(z-roadZ(x))>7&&Math.hypot(x+30,z-40)>24&&renderedTerrainHeight(x,z)>-.35&&terrainNormal(x,z).y>.90;
  const cells=new Map(),selected=new Set();
  // One tree and one rock owner per 48-m cell, with a fixed total ceiling.
  // Ranking has its own hash and never consumes world-generation randomness.
  // Existing pilot assemblies stay selected; the added distribution reaches
  // ordinary new-game views and the rest of the playable valley.
  for(const record of records){
    if(!inArea(record.x,record.z)||!['tree','rock'].includes(record.kind))continue;
    if(inPilot(record.x,record.z)){selected.add(record);continue;}
    if(!acceptable(record.x,record.z))continue;
    const key=Math.floor(record.x/48)+','+Math.floor(record.z/48)+':'+record.kind;
    const prior=cells.get(key);if(!prior||seedFor(record.id)<seedFor(prior.id))cells.set(key,record);
  }
  const ranked=[...cells.values()].sort((a,b)=>{
    const near=r=>Math.hypot(r.x+30,r.z-40)<80?0:1;
    return near(a)-near(b)||seedFor(a.id)-seedFor(b.id);
  });
  for(const record of ranked.slice(0,56))selected.add(record);
  // Sparse old-world fragments are subordinate to the established rocks. Keep
  // their own silhouette distinct; do not replace or move the original rock.
  const remnants=new Set([...selected].filter(r=>r.kind==='rock'&&acceptable(r.x,r.z)).sort((a,b)=>{
    const near=r=>Math.hypot(r.x+30,r.z-40)<95?0:1;
    return near(a)-near(b)||seedFor(a.id+':stone')-seedFor(b.id+':stone');
  }).slice(0,13));
  for(const record of records){
    if(!selected.has(record))continue;
    const rand=random(seedFor(record.id)),starts=batches.map(([,batch])=>batch.items.length),tree=record.kind==='tree';
    const wet=shoreDistance(record.x,record.z)<bankWidth(record.x,record.z)+5;
    // Patches are anchored to existing canopies/rock toes. Their unequal, biased
    // distribution leaves readable ground between them, not a uniform carpet.
    const count=inPilot(record.x,record.z)?(tree?22:wet?10:5):(tree?14:wet?9:6),axis=rand()*TAU;
    for(let i=0;i<count;i++){
      const a=axis+(rand()-.5)*3.7,radius=(tree?1.0:0.4)+Math.sqrt(rand())*(tree?3.2:1.45);
      const x=record.x+Math.cos(a)*radius,z=record.z+Math.sin(a)*radius;
      if(!acceptable(x,z))continue;
      const y=renderedTerrainHeight(x,z),s=.65+rand()*.85;
      if(tree||!wet||i%3===0){
        const first=leaves.add(x,y+.014,z,s,s*(.78+rand()*.3),s*(.76+rand()*.3),[0x99aa78,0x849764,0xa8af7e][i%3],a);
        leaves.items[first].windRoot=[x,y,z,.38*s];leaves.items[first].windFlex=[.034,.004];leaves.items[first].windMotion=[.62,1.25];
      }
      if(wet||i%5===0){
        const h=.5+rand()*.45;
        const yaw=rand()*TAU;
        chips.add(x,y-.035,z,.55+s*.55,h,.42+s*.47,[0x8e9584,0x9ca193,0xacae99][i%3],yaw,surfaceRotation(x,z,yaw));
      }
    }
    if(tree){
      const a=axis+.8,x=record.x+Math.cos(a)*2.5,z=record.z+Math.sin(a)*2.5;
      if(acceptable(x,z))wood.add(x,renderedTerrainHeight(x,z)-.065,z,.78+rand()*.42,.82,.85,0xffffff,a+.6,surfaceRotation(x,z,a+.6));
    }
    if(remnants.has(record)){
      const x=record.x+Math.cos(axis)*1.55,z=record.z+Math.sin(axis)*1.55;
      if(acceptable(x,z)){
        const size=.85+(seedFor(record.id+':scale')%31)/100;
        masonry.add(x,renderedTerrainHeight(x,z)-.09,z,size,size*(.86+(seedFor(record.id)%25)/100),size,0xffffff,axis+.4,surfaceRotation(x,z,axis+.4));
      }
    }
    const refs=[];
    batches.forEach(([kind,batch],i)=>{const first=starts[i],count=batch.items.length-first;if(count){const ref={batch,first,count};record.parts.push(ref);refs.push({kind,name:'Ground dressing '+kind,first,count});}});
    if(refs.length)owners.push({id:record.id,kind:record.kind,x:record.x,z:record.z,batches:refs});
  }
  const meshes=[],renderMeshes=[];
  for(const [kind,batch]of batches){
    const mesh=batch.finish('Ground dressing '+kind);
    if(!mesh){batch.geometry.dispose();continue;}
    mesh.userData.groundDressing=kind;mesh.userData.noBatch=true;
    // Wind batches may already be partitioned by Instances.finish. Static
    // objects need the same off-screen culling, while keeping saved addresses.
    if(!mesh.spatialChunks){mesh.removeFromParent();group.add(partitionStaticInstances(mesh,batch.items,{cellSize:64,padding:1}));}
    for(const chunk of mesh.spatialChunks){
      chunk.userData.groundDressing=kind;chunk.userData.noBatch=true;
      chunk.name=mesh.name+' cell '+chunk.userData.spatialCell;renderMeshes.push(chunk);
    }
    meshes.push(mesh);
  }
  // Report actual drawable ranges, not canonical storage that is off-scene.
  // The production record.parts keep their original per-batch indices.
  for(const owner of owners){
    owner.batches=owner.batches.flatMap(ref=>{
      const source=batches.find(([kind])=>kind===ref.kind)[1].mesh,ranges=[];
      for(let i=ref.first;i<ref.first+ref.count;i++){
        const slot=source.spatialSlots[i],last=ranges.at(-1);
        if(last?.name===slot.mesh.name&&last.first+last.count===slot.index)last.count++;
        else ranges.push({kind:ref.kind,name:slot.mesh.name,first:slot.index,count:1});
      }
      return ranges;
    });
  }
  return {meshes,stats:{area:DRESSING_AREA,extraOwnerCap:56,owners,instances:meshes.reduce((n,m)=>n+m.count,0),batches:renderMeshes.map(m=>({name:m.name,kind:m.userData.groundDressing,instances:m.count,trianglesPerInstance:(m.geometry.index?.count??m.geometry.attributes.position.count)/3}))}};
}
