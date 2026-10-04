import * as T from '../vendor/three.module.js';
import {bankWidth,protectedResource,renderedTerrainHeight,roadZ,shoreDistance,terrainNormal,terrainNoise} from './terrain.js';

// Remnants only: no path graph, scenery owner, interaction proxy or save data.
// These alignments never replace the original highway or consume its RNG.
export const DECORATIVE_ROAD_LIMITS=Object.freeze({extent:181,maxFragments:150,maxTriangles:11000,sampleStep:1.4,maximumWidth:4.9,minimumNormalY:.94});
const CITY_CLEARINGS=Object.freeze([[-30,40,27],[105,8,23],[-92,-80,23],[75,-145,23],[-145,125,23],[135,125,23]].map(Object.freeze));
const routes=Object.freeze([
  {name:'western fragments',from:-176,to:176,point:t=>[-69+Math.sin(t*.013+.4)*11,t]},
  {name:'eastern fragments',from:-176,to:176,point:t=>[110+Math.sin(t*.015-.6)*14,t]},
  {name:'cross-valley fragments',from:-176,to:176,point:t=>[t,9+Math.sin(t*.010+.6)*20]},
]);
function random(seed){let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}

export function decorativeRoadLocationAllowed(x,z,radius=0){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<0)return false;
  if(Math.max(Math.abs(x),Math.abs(z))+radius>DECORATIVE_ROAD_LIMITS.extent||protectedResource(x,z,radius+3))return false;
  if(CITY_CLEARINGS.some(([cx,cz,r])=>Math.hypot(x-cx,z-cz)<r+radius))return false;
  for(const[dx,dz]of[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
    const px=x+dx,pz=z+dz;
    if(shoreDistance(px,pz)<bankWidth(px,pz)+3.5||Math.abs(pz-roadZ(px))<12||terrainNormal(px,pz).y<DECORATIVE_ROAD_LIMITS.minimumNormalY)return false;
  }
  return true;
}

function sceneryBlocked(records){
  const cells=new Map(),size=16;
  for(const record of records){
    if(!['tree','rock'].includes(record.kind)||!Number.isFinite(record.x)||!Number.isFinite(record.z))continue;
    const key=Math.floor(record.x/size)+','+Math.floor(record.z/size);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push({x:record.x,z:record.z,r:Math.min(8,Math.max(.8,(record.size||1)*(record.kind==='rock'?1.25:.75)))});
  }
  return(x,z,r)=>{
    const cx=Math.floor(x/size),cz=Math.floor(z/size);
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)for(const q of cells.get((cx+i)+','+(cz+j))||[])
      if(Math.hypot(x-q.x,z-q.z)<r+q.r)return true;
    return false;
  };
}

export function createDecorativeRoadPlan(existingRecords=[]){
  const rand=random(0x573a96e1),blocked=sceneryBlocked(existingRecords),fragments=[];
  for(const route of routes){
    let cursor=route.from+rand()*8,fragmentIndex=0;
    while(cursor<route.to&&fragments.length<DECORATIVE_ROAD_LIMITS.maxFragments){
      // Unequal surviving lengths and soil gaps make a readable - -- --- -
      // history, without a traversable or visually continuous new road.
      const length=3.8+rand()*8.4,gap=3.5+rand()*8.5,width=3.25+rand()*1.25;
      const steps=Math.max(3,Math.ceil(length/DECORATIVE_ROAD_LIMITS.sampleStep)),stations=[];
      for(let i=0;i<=steps;i++){
        const t=cursor+length*i/steps,[x,z]=route.point(t),[nx,nz]=route.point(t+.1),angle=Math.atan2(nz-z,nx-x);
        const half=width*.5*(.84+rand()*.14),edgeL=half*(.86+rand()*.13),edgeR=half*(.86+rand()*.13);
        stations.push({x,z,tx:Math.cos(angle),tz:Math.sin(angle),left:edgeL,right:edgeR,t});
      }
      // Split at protected scenery instead of moving any old record. Each
      // retained strip is checked at sub-two-metre terrain samples, not only
      // its centre, so bends never bridge the river or a resource footprint.
      let run=[];
      const finish=()=>{if(run.length>=3)fragments.push({route:route.name,index:fragmentIndex++,stations:run,tone:.88+rand()*.17});run=[];};
      for(const station of stations){
        const r=Math.max(station.left,station.right)+.2;
        if(decorativeRoadLocationAllowed(station.x,station.z,r)&&!blocked(station.x,station.z,r))run.push(station);
        else finish();
      }
      finish();cursor+=length+gap;
    }
  }
  return fragments;
}

export function createDecorativeRoadRemnants({existingRecords=[]}={}){
  const group=new T.Group();group.name='Broken old-world road remnants';group.userData.noBatch=true;group.raycast=()=>false;
  const fragments=createDecorativeRoadPlan(existingRecords),asphalt={positions:[],colours:[]},paint={positions:[],colours:[]};
  const base=new T.Color(0x535c51),edge=new T.Color(0x777766),line=new T.Color(0xa8a185),colour=new T.Color();
  const soil=new T.Color(0x716c50),surfaceColour=new T.Color();
  const emit=(target,a,b,c,tint)=>{for(const p of[a,b,c]){
    target.positions.push(...p);surfaceColour.copy(tint);
    if(target===asphalt){
      // World-continuous dust and darker weathering break up each slab without
      // another texture, draw, random-stream change or per-frame calculation.
      const dust=terrainNoise(p[0]*.19+27,p[2]*.19-11),weather=terrainNoise(p[0]*.63-7,p[2]*.63+13);
      surfaceColour.lerp(soil,.06+Math.max(0,dust-.25)*.42).multiplyScalar(.83+weather*.24);
    }
    target.colours.push(surfaceColour.r,surfaceColour.g,surfaceColour.b);
  }};
  const quad=(target,a,b,c,d,tint)=>{emit(target,a,b,c,tint);emit(target,b,d,c,tint);};
  for(const fragment of fragments){
    const stations=fragment.stations,last=stations.length-1;
    // Fragment-local randomness changes only the surviving surface inside the
    // already clipped road footprint, never routes or the scenery RNG.
    const rand=random(Math.imul(Math.round(stations[0].x*100),374761393)^Math.imul(Math.round(stations[0].z*100),668265263));
    const sample=(at,across,lift=.032)=>{
      const i=Math.min(last-1,Math.floor(at)),f=at-i,a=stations[i],b=stations[i+1];
      const aa=across<0?across*a.left:across*a.right,bb=across<0?across*b.left:across*b.right;
      const ax=a.x-a.tz*aa,az=a.z+a.tx*aa,bx=b.x-b.tz*bb,bz=b.z+b.tx*bb;
      const x=ax+(bx-ax)*f,z=az+(bz-az)*f;
      return[x,renderedTerrainHeight(x,z)+lift,z];
    };
    const rows=stations.map((station,i)=>{
      // Deep, unequal inward bites give the outside silhouette real soil
      // intrusions. Every point is a subset of the original safe quad.
      const end=i===0||i===last,left=(end?.49:.64)+rand()*(end?.3:.36),right=(end?.49:.64)+rand()*(end?.3:.36);
      return[-left,-left*.68,0,right*.68,right].map(across=>{
        // Each lateral vertex loses a different length at a broken end;
        // there is no common square cap or repeating complete tile outline.
        const at=i===0?.12+rand()*.69:i===last?last-.12-rand()*.69:i;
        return sample(at,across);
      });
    });
    for(let i=0;i<last;i++){
      const a=stations[i],noise=terrainNoise(a.x*.35+9,a.z*.35-3),innerBreak=i>0&&i<last-1&&rand()<.12?1+Math.floor(rand()*2):-1;
      for(let lane=0;lane<4;lane++){
        const rim=lane===0||lane===3,chip=rim&&rand()<.36||lane===innerBreak;
        colour.copy(base).lerp(edge,rim?.10+rand()*.16:.035).multiplyScalar(fragment.tone*(.92+noise*.09));
        const p=rows[i],q=rows[i+1],a=p[lane],b=p[lane+1],c=q[lane],d=q[lane+1];
        const up=([a,b,c])=>(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])>1e-7;
        let triangles=[[a,b,c],[b,d,c]];
        // Unequal caps can make a concave quad. Use its valid diagonal,
        // rather than folding one triangle over the other at the broken edge.
        if(!triangles.every(up))triangles=[[a,b,d],[a,d,c]];
        triangles=triangles.filter(up);
        // Omitted wedges expose real ground, rather than adding a crack decal.
        if(chip&&triangles.length>1)triangles=[triangles[Math.floor(rand()*triangles.length)]];
        for(const triangle of triangles)emit(asphalt,...triangle,colour);
      }
      // Paint wears independently on each side. Short unequal flecks retain
      // road history without stamping a pair of intact lines on every remnant.
      if(i>0&&i<last-1&&innerBreak<0)for(const side of[-1,1]){
        if(rand()>.38)continue;
        const start=i+.08+rand()*.22,end=Math.min(i+.91,start+.14+rand()*.40),offset=side*(.085+rand()*.02),wear=.010+rand()*.014;
        colour.copy(line).multiplyScalar(.68+rand()*.18);
        quad(paint,sample(start,offset-wear,.044),sample(start+.035,offset+wear,.044),sample(end,offset-wear*.45,.044),sample(end-.035,offset+wear*.72,.044),colour);
      }
    }
  }
  const material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});material.name='Matte old-road fragments';material.userData.noBatch=true;
  const meshes=[];
  for(const [kind,data]of Object.entries({asphalt,markings:paint})){
    if(!data.positions.length)continue;
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(data.colours,3));
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new T.Mesh(geometry,material);mesh.name='Broken road '+kind;mesh.userData={noBatch:true,decorativeRoad:kind};mesh.castShadow=false;mesh.receiveShadow=true;mesh.raycast=()=>false;group.add(mesh);meshes.push(mesh);
  }
  const stats={fragments:fragments.length,byRoute:Object.fromEntries(routes.map(r=>[r.name,fragments.filter(f=>f.route===r.name).length])),triangles:meshes.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0),draws:meshes.length,geometryBytes:meshes.reduce((n,m)=>n+Object.values(m.geometry.attributes).reduce((sum,a)=>sum+a.array.byteLength,0),0),quality:'high',disposed:false};
  return{group,stats,setQuality(quality){if(stats.disposed)return;stats.quality=quality;},dispose(){if(stats.disposed)return;stats.disposed=true;group.removeFromParent();for(const mesh of meshes)mesh.geometry.dispose();material.dispose();group.clear();}};
}
