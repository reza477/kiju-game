import * as T from '../vendor/three.module.js';
import { getMaterial } from './materials.js';
import { terrainNoise, terrainHeight, renderedTerrainHeight, smoothstep, terrainNormal, protectedResource, shoreDistance, riverX, riverWidth, bankWidth, roadZ } from './terrain.js';
import { fracturedRockGeometry, ridgeBedGeometry } from './environment-geometry.js';

const TAU=Math.PI*2, UP=new T.Vector3(0,1,0);
function random(seed){let n=seed>>>0;return()=>((n=(n*1664525+1013904223)>>>0)/4294967296);}

let drainageField;
// A once-built runoff network follows the unchanged physical height field.
// Each sample drains to a strictly lower neighbour; topological accumulation
// joins tributaries without introducing a second terrain or altering scenery IDs.
function buildDrainageField(){
  const size=257,step=2,total=size*size,height=new Float32Array(total),next=new Int32Array(total),incoming=new Uint8Array(total),area=new Float32Array(total),queue=new Int32Array(total);
  const channels=new Float32Array(total),banks=new Float32Array(total),fans=new Float32Array(total);
  const at=(i,j)=>j*size+i;next.fill(-1);area.fill(1);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++)height[at(i,j)]=terrainHeight(i*step-256,j*step-256);
  for(let j=1;j<size-1;j++)for(let i=1;i<size-1;i++){
    const index=at(i,j);let drop=0,dest=-1;
    for(let v=-1;v<=1;v++)for(let u=-1;u<=1;u++){
      if(!u&&!v)continue;const target=at(i+u,j+v),slope=(height[index]-height[target])/(u&&v?Math.SQRT2:1);
      if(slope>drop+.00001){drop=slope;dest=target;}
    }
    if(dest>=0){next[index]=dest;incoming[dest]++;}
  }
  let head=0,tail=0;for(let i=0;i<total;i++)if(!incoming[i])queue[tail++]=i;
  while(head<tail){const i=queue[head++],dest=next[i];if(dest>=0){area[dest]+=area[i];if(--incoming[dest]===0)queue[tail++]=dest;}}
  let connectedSamples=0;
  for(let j=1;j<size-1;j++)for(let i=1;i<size-1;i++){
    const index=at(i,j),dest=next[index],x=i*step-256,z=j*step-256;
    if(area[index]<22||dest<0||height[index]<-.25||protectedResource(x,z,3)||Math.abs(z-roadZ(x))<5)continue;
    const n=terrainNormal(x,z),slope=Math.hypot(n.x,n.z)/n.y;
    // Sparse tributaries become wider depositional fans as slopes relax.
    const strength=smoothstep(22,100,area[index])*(1-smoothstep(.44,.75,slope));
    if(strength<.02)continue;
    const radius=1.1+Math.min(2.1,Math.log2(area[index]/22)*.32),fringe=radius+2.6,reach=Math.ceil(fringe/step);
    const fan=smoothstep(65,260,area[index])*(1-smoothstep(.035,.13,slope));
    connectedSamples++;
    for(let v=-reach;v<=reach;v++)for(let u=-reach;u<=reach;u++){
      const a=i+u,b=j+v;if(a<0||a>=size||b<0||b>=size)continue;
      const distance=Math.hypot(u,v)*step,t=at(a,b);
      channels[t]=Math.max(channels[t],strength*(1-smoothstep(radius*.20,radius+1.05,distance)));
      banks[t]=Math.max(banks[t],strength*(1-smoothstep(radius*.75,fringe,distance)));
      fans[t]=Math.max(fans[t],fan*(1-smoothstep(radius,fringe+1.3,distance)));
    }
  }
  return{size,channels,banks,fans,next,area,connectedSamples,processedSamples:tail,totalSamples:total};
}

export function valleyDrainage(x,z){
  if(Math.max(Math.abs(x),Math.abs(z))>254)return{channel:0,bank:0,fan:0};
  drainageField||=buildDrainageField();const{size,channels,banks,fans}=drainageField;
  const gx=(x+256)*.5,gz=(z+256)*.5,i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j,a=j*size+i;
  const sample=data=>(data[a]*(1-u)+data[a+1]*u)*(1-v)+(data[a+size]*(1-u)+data[a+size+1]*u)*v;
  const mask=protectedResource(x,z,1)?0:smoothstep(0,4,Math.abs(z-roadZ(x)))*(1-smoothstep(220,254,Math.max(Math.abs(x),Math.abs(z))));
  return{channel:sample(channels)*mask,bank:sample(banks)*mask,fan:sample(fans)*mask};
}

export function valleyDrainageDiagnostics(){drainageField||=buildDrainageField();const{connectedSamples,processedSamples,totalSamples}=drainageField;return{connectedSamples,processedSamples,totalSamples};}

function createDrainageMinerals(group){
  drainageField||=buildDrainageField();const{size,next,area}=drainageField,p=[],uv=[],colours=[];
  const point=i=>{const b=next[i]<0?i:next[i],c=next[b]<0?b:next[b];return[((i%size)+(b%size)*2+c%size)*.5-256,(Math.floor(i/size)+Math.floor(b/size)*2+Math.floor(c/size))*.5-256];};
  const colour=new T.Color();let sections=0,fragments=0,maxSurfaceOffset=0;
  for(let i=0;i<next.length;i++){
    const dest=next[i];if(dest<0||area[i]<110||area[i]>1200)continue;
    const[x,z]=point(i),[ex,ez]=point(dest),length=Math.hypot(ex-x,ez-z);
    if(length<.1||Math.max(Math.abs(x),Math.abs(z),Math.abs(ex),Math.abs(ez))>178||protectedResource(x,z,5)||protectedResource(ex,ez,5)||shoreDistance(x,z)<bankWidth(x,z)+2||Math.abs(z-roadZ(x))<6)continue;
    const n=terrainNormal(x,z);if(n.y<.94)continue;
    const width=.28+Math.min(.66,Math.log2(area[i]/110)*.16),dx=(ez-z)/length,dz=-(ex-x)/length;
    // Disconnected low gravel facets interrupt the runoff core. A solid narrow
    // ribbon reads like a road at the World camera, regardless of its texture.
    for(let k=0;k<3;k++){
      const seed=i*3+k,r=random(seed+104731),t=.12+k*.31+(r()-.5)*.11;
      if(r()<.26)continue;
      const shift=(r()-.5)*width*1.7,cx=x+(ex-x)*t+dx*shift,cz=z+(ez-z)*t+dz*shift,radius=.12+r()*.24;
      const lift=.018+r()*.012,centre=[cx,renderedTerrainHeight(cx,cz)+lift,cz],rim=[];maxSurfaceOffset=Math.max(maxSurfaceOffset,lift);
      colour.setHex([0xb9b29e,0xc0b9a4,0xa4ab99][seed%3]);
      for(let v=0;v<5;v++){const angle=v*TAU/5+r()*.17,gx=cx+Math.cos(angle)*radius*(.72+r()*.35),gz=cz+Math.sin(angle)*radius*(.71+r()*.37);rim.push([gx,renderedTerrainHeight(gx,gz)+.005,gz]);}
      for(let v=0;v<5;v++)for(const q of[centre,rim[(v+1)%5],rim[v]]){p.push(...q);uv.push(q[0]*.72,q[2]*.72);colours.push(colour.r,colour.g,colour.b);}
      fragments++;
    }
    sections++;
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,getMaterial('rock',0xffffff,{roughness:1,vertexColors:true,side:T.DoubleSide}));mesh.name='Runoff mineral deposition';mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.noBatch=true;group.add(mesh);
  return{mesh,sections,fragments,triangles:p.length/9,maxSurfaceOffset};
}

// Long, asymmetric forest belts follow the valley shoulders. The same field
// colours their soil and places the trees: no circular forest stamps or scenery
// draped over an unrelated ground texture. Clearings are applied by the caller.
export function valleyWoodland(x,z){
  const westAxis=-108+Math.sin(z*.017+.6)*24, eastAxis=118+Math.sin(z*.021-1)*21;
  const west=Math.exp(-(((x-westAxis)/(19+8*Math.sin(z*.014+1)))**2))*smoothstep(-150,-105,z)*(1-smoothstep(105,157,z));
  const east=Math.exp(-(((x-eastAxis)/25)**2))*smoothstep(-115,-71,z)*(1-smoothstep(122,167,z));
  return Math.max(west,east);
}

// Intermediate-scale cover follows the actual landform. Concave feet of slopes
// retain moisture and litter; convex/exposed ground breaks into drier soil. The
// warped 3–14 m patches describe connected tussocks rather than 60 m paint blobs.
export function valleyGroundCover(x,z,slope,curvature=0){
  const warpX=terrainNoise(x*.026+7,z*.029-3)-.5,warpZ=terrainNoise(x*.023-11,z*.027+13)-.5;
  const patch=terrainNoise((x+warpX*13)*.115+31,(z+warpZ*11)*.139-7);
  const fine=terrainNoise(x*.31+19,z*.27-8), mid=terrainNoise(x*.052+17,z*.066+9);
  const bank=bankWidth(x,z),shore=shoreDistance(x,z),drainage=valleyDrainage(x,z);
  const hollow=smoothstep(.0008,.018,curvature)*smoothstep(.012,.11,slope);
  const wet=Math.min(1,hollow*.52+(1-smoothstep(bank+4,bank+25,shore))*.45+drainage.bank*.62);
  const exposed=smoothstep(.045,.27,slope)*(1-hollow*.76);
  const dry=Math.min(1,exposed*.52+smoothstep(.46,.75,mid)*.47);
  const bare=Math.min(1,(1-smoothstep(.23,.75,patch))*(.32+dry*.44+exposed*.16)*(1-wet*.44)+drainage.channel*.64+drainage.fan*.24);
  const cover=Math.max(0,Math.min(1,.44+patch*.48+wet*.25-exposed*.23-dry*.14-drainage.channel*.69));
  const relief=Math.max(0,Math.min(1,patch*.47+fine*.22+(1-bare)*.15-hollow*.12-drainage.channel*.29+drainage.bank*.18));
  return {patch,fine,wet,hollow,exposed,dry,bare,cover,relief,...drainage};
}

/** Adds only deterministic new anchors; the historical scenery sequence is untouched. */
export function composeAuthoredValley({group,Instances,trees,shrubs,ferns,grass,rocks,records,addTree,heightAt,ecologyAt,isClearing}){
  const stats={forestTrees:0,groundcover:0,forestEdgeShrubs:0,slateBeds:0,viaductSpans:0,pointBarStones:0};
  const register=(id,kind,x,z,size,parts)=>{if(!protectedResource(x,z))records.push({id,kind,x,z,size,parts});};
  const safe=(x,z,margin=2)=>!protectedResource(x,z,margin)&&!isClearing(x,z,3)&&shoreDistance(x,z)>bankWidth(x,z)+2&&Math.abs(z-roadZ(x))>7;
  const rand=random(740235);
  const stone=new Instances(group,ridgeBedGeometry(),getMaterial('rock',0xffffff,{roughness:.98}));
  const masonry=new Instances(group,new T.BoxGeometry(1,1,1),getMaterial('stone',0xffffff));
  const metal=new Instances(group,new T.BoxGeometry(1,1,1),getMaterial('metal',0xffffff,{roughness:.88,metalness:.25}));
  const broken=new Instances(group,fracturedRockGeometry(),getMaterial('rock',0xffffff));
  const detailMeshes=[];
  const mineralRunoff=createDrainageMinerals(group);detailMeshes.push(mineralRunoff.mesh);stats.mineralRunoff={sections:mineralRunoff.sections,fragments:mineralRunoff.fragments,triangles:mineralRunoff.triangles,maxSurfaceOffset:mineralRunoff.maxSurfaceOffset};

  // Saplings fringe mixed-height stands, with actual gaps between their crowns.
  // Each fern, shrub and fallen branch belongs to its tree's destruction record.
  for(let i=0;i<1100&&stats.forestTrees<156;i++){
    const side=i%2?1:-1, z=-132+rand()*290;
    const axis=side<0?-108+Math.sin(z*.017+.6)*24:118+Math.sin(z*.021-1)*21;
    const x=axis+(rand()-.5)*66, field=valleyWoodland(x,z), eco=ecologyAt(x,z);
    if(field<.23||rand()>field*.84||!safe(x,z)||eco.open<.3||terrainNormal(x,z).y<.84)continue;
    if(records.some(r=>r.kind==='tree'&&Math.abs(r.x-x)<3.3&&Math.abs(r.z-z)<3.3))continue;
    const y=heightAt(x,z), size=.64+field*.55+rand()*.67;
    const parts=addTree(trees,rand,x,y,z,size,z<-60?rand()<.72:rand()<.16);
    const shrubFirst=shrubs.items.length, fernFirst=ferns.items.length, grassFirst=grass.items.length;
    for(let j=0;j<4;j++){
      const a=rand()*TAU,r=2.4+rand()*3.5,gx=x+Math.cos(a)*r,gz=z+Math.sin(a)*r;
      if(!safe(gx,gz)||terrainNormal(gx,gz).y<.86)continue;
      const gy=heightAt(gx,gz),s=.65+rand()*1.13;
      if(j<2){shrubs.add(gx,gy+s*.47,gz,s*1.25,s*.65,s,0x4b6b35,a);stats.forestEdgeShrubs++;}
      ferns.add(gx+.6,gy+.035,gz,s,s*.85,s,0x607b3b,a);
      for(let k=0;k<7;k++){
        const tx=gx+(rand()-.5)*4,tz=gz+(rand()-.5)*4;
        if(!safe(tx,tz))continue;
        const h=.5+rand()*.72;
        grass.add(tx,heightAt(tx,tz)+.025,tz,h*1.45,h,h*1.45,rand()<.35?0x9a9e65:0x71863e,rand()*TAU);stats.groundcover++;
      }
    }
    for(const [batch,first]of[[shrubs,shrubFirst],[ferns,fernFirst],[grass,grassFirst]])if(batch.items.length>first)parts.push({batch,first,count:batch.items.length-first});
    if(i%6===0){
      const first=trees.wood.items.length,a=rand()*TAU, ex=x+Math.cos(a)*3.7*size,ez=z+Math.sin(a)*3.7*size;
      trees.wood.link([x,y+.18,z],[ex,heightAt(ex,ez)+.15,ez],.19*size,0x645d45);
      parts.push({batch:trees.wood,first,count:1});
    }
    register(`valley-forest:${i}`,'tree',x,z,size,parts);stats.forestTrees++;
  }

  // Connected, inclined beds give the playable foothills a geological structure.
  // Their wide bases are buried below the terrain and their broken ends overlap.
  for(const side of[-1,1])for(let j=0;j<24;j++){
    const z=-120+j*10.7, x=side<0?-159+Math.sin(z*.025)*12:151+Math.sin(z*.023+.8)*15;
    if(!safe(x,z,3)||terrainNoise(z*.044+side*7,side*3)<.28)continue;
    const first=stone.items.length, rubbleFirst=broken.items.length, angle=side*.28+Math.sin(z*.025)*.22;
    for(let k=0;k<3;k++){
      const px=x+side*k*2.0,pz=z+k*2.1, sy=1.4+k*.45+rand()*1.2;
      stone.add(px,heightAt(px,pz)+sy*.12,pz,3.7+rand()*2.8,sy,6.2+rand()*3.0,[0x73827d,0x8f9786,0x626f69][k],angle+(rand()-.5)*.47);
      stats.slateBeds++;
    }
    for(let k=0;k<5;k++){
      const px=x-side*(3+rand()*5),pz=z+(rand()-.5)*13, s=.45+rand()*1.4;
      if(!safe(px,pz))continue;
      broken.add(px,heightAt(px,pz)+s*.12,pz,s*1.2,s*.46,s,0x89927e,rand()*TAU);
    }
    register(`valley-slate:${side}:${j}`,'rock',x,z,5.2,[{batch:stone,first,count:stone.items.length-first},{batch:broken,first:rubbleFirst,count:broken.items.length-rubbleFirst}]);
  }

  // The Old Meridian: a collapsed railway viaduct. Its surviving masonry arches,
  // missing span, leaning steelwork and overgrowth make a specific world landmark.
  const origin=new T.Vector2(79,9), along=new T.Vector2(.88,-.475).normalize(), across=new T.Vector2(-along.y,along.x);
  const point=(u,v=0)=>[origin.x+along.x*u+across.x*v,origin.y+along.y*u+across.y*v];
  const yaw=-Math.atan2(along.y,along.x), turn=new T.Quaternion().setFromAxisAngle(UP,yaw);
  const top=Math.max(...Array.from({length:7},(_,i)=>{const[x,z]=point(i*12);return heightAt(x,z);}))+8.2;
  for(let span=0;span<6;span++){
    const [x,z]=point(span*12),first=masonry.items.length,metalFirst=metal.items.length,rubbleFirst=broken.items.length,shrubFirst=shrubs.items.length;
    if(!safe(x,z,4))continue;
    const base=heightAt(x,z), pier=Math.max(3,top-base-1.3);
    masonry.add(x,base+pier*.5-.1,z,2.7,pier,5.0,0x7e8476,yaw);
    masonry.add(x,base+.42,z,3.6,.8,5.8,0x7e8170,yaw);
    masonry.add(x,top-1.03,z,3.4,.54,5.7,0x9da48d,yaw);
    if(span!==2&&span!==5){
      const [cx,cz]=point(span*12+6), radius=4.7, spring=top-6.1;
      for(let k=0;k<11;k++){
        const a=(k+.5)/11*Math.PI;
        const [ax,az]=point(span*12+6+Math.cos(a)*radius);
        const q=turn.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),a-Math.PI/2));
        masonry.add(ax,spring+Math.sin(a)*radius,az,1.43,1.05,5.25,k%3?0x989c88:0x797f70,0,q);
      }
      // The spandrel carries the road above the arch. Its solid mass contrasts
      // with the missing spans, instead of a thin ring supporting an empty deck.
      for(let k=0;k<8;k++){
        const u=-4.6+(k+.5)*1.15,archTop=spring+Math.sqrt(Math.max(0,radius*radius-u*u))+.52;
        const [sx,sz]=point(span*12+6+u),h=Math.max(.10,top-.46-archTop);
        masonry.add(sx,archTop+h*.5,sz,1.17,h,5.18,k%3?0x89917d:0x787f6e,yaw);
      }
      masonry.add(cx,top,cz,12.1,.88,5.7,0x929783,yaw);
      for(const side of[-1,1]){
        const [rx,rz]=point(span*12+6,side*1.20);metal.add(rx,top+.54,rz,12.1,.13,.12,0x695544,yaw);
        if(span!==4){const [px,pz]=point(span*12+6,side*2.62);masonry.add(px,top+.83,pz,11.8,.80,.38,0x777f70,yaw);}
      }
      for(let k=0;k<7;k++){const [tx,tz]=point(span*12+k*1.6+.8);metal.add(tx,top+.48,tz,.22,.12,3.4,0x74634e,yaw);}
      stats.viaductSpans++;
    }else{
      for(let k=0;k<7;k++){
        const [rx,rz]=point(span*12+3+rand()*9,(rand()-.5)*10),s=1+rand()*2.4;
        const turnAngle=rand()*TAU,run=1.5+k*1.22,[bx,bz]=point(span*12+run,Math.sin(k*2.1)*Math.min(3.6,run*.45));
        broken.add(bx,heightAt(bx,bz)+s*(k<3?.40:.20),bz,s*(k<3?1.55:1.22),s*(k<3?1.05:.63),s,0x878b78,yaw+(turnAngle-TAU*.5)*.18);
      }
      const[startX,startZ]=point(span*12+.7),[endX,endZ]=point(span*12+10.5,1.3);
      const start=new T.Vector3(startX,top-.40,startZ),end=new T.Vector3(endX,heightAt(endX,endZ)+.55,endZ),centre=start.clone().lerp(end,.5);
      const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(1,0,0),end.clone().sub(start).normalize());
      metal.add(centre.x,centre.y,centre.z,start.distanceTo(end),.32,.47,0x665346,0,q);
      // Jagged springing remains visibly attached to the surviving pier.
      for(let k=0;k<3;k++){
        const a=.17+k*.19,[sx,sz]=point(span*12+1.25+k*.88);
        const q=turn.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),a));
        masonry.add(sx,top-2.4+k*.65,sz,1.55,.95,5.0,0x8c937e,0,q);
      }
    }
    for(let j=0;j<4;j++){
      const [gx,gz]=point(span*12+(rand()-.5)*7,(rand()>.5?1:-1)*(3+rand()*3)),s=1+rand()*1.5;
      if(safe(gx,gz))shrubs.add(gx,heightAt(gx,gz)+s*.50,gz,s*1.3,s*.8,s,0x496739,rand()*TAU);
    }
    register(`old-meridian:${span}`,'rock',x,z,6.5,[{batch:masonry,first,count:masonry.items.length-first},{batch:metal,first:metalFirst,count:metal.items.length-metalFirst},{batch:broken,first:rubbleFirst,count:broken.items.length-rubbleFirst},{batch:shrubs,first:shrubFirst,count:shrubs.items.length-shrubFirst}]);
  }

  // Irregular gravel spits alternate sides with river curvature. Submerged rocks
  // and reed tongues interrupt the long, formerly regular waterline at play zoom.
  for(let bar=0;bar<13;bar++){
    const z=-153+bar*26+Math.sin(bar*2.3)*9;
    const bend=-.001782*Math.sin(z*.009)-.0028*Math.sin(z*.020),side=Math.sign(bend)||1;
    const x=riverX(z)+side*(riverWidth(z)+bankWidth(riverX(z)+side*18,z)*.70);
    if(protectedResource(x,z,6))continue;
    const first=rocks.items.length,grassFirst=grass.items.length;
    for(let k=0;k<14;k++){
      const longitudinal=(rand()-.5)*15,px=x+side*(rand()*3.3-Math.cos(longitudinal/8)*1.2),pz=z+longitudinal;
      if(protectedResource(px,pz,2))continue;
      const y=heightAt(px,pz),s=.42+rand()*1.18;
      rocks.add(px,y+.07,pz,s*1.33,s*.34,s*.82,[0x8c9b90,0xb1b7a1,0x718982][k%3],rand()*TAU);stats.pointBarStones++;
      if(y>-.5&&k%2){const h=1+rand()*1.1;grass.add(px+side*1.4,heightAt(px+side*1.4,pz),pz,h*.45,h,h*.45,0x77894d,rand()*TAU);}
    }
    register(`river-spit:${bar}`,'rock',x,z,2,[{batch:rocks,first,count:rocks.items.length-first},{batch:grass,first:grassFirst,count:grass.items.length-grassFirst}]);
  }
  for(const[batch,name]of[[stone,'Valley escarpment beds'],[masonry,'The Old Meridian viaduct'],[metal,'Weathered railway iron'],[broken,'Collapsed masonry and talus']]){
    const mesh=batch.finish(name);if(mesh)detailMeshes.push(mesh);
  }
  return {stats,detailMeshes};
}
