import * as T from '../vendor/three.module.js';

// Original local botanical assets. Closed sculpted crowns and real grouped
// blades live in the editable painterly kit; fern pinnae retain folded leaves.
const TAU = Math.PI * 2, UP=new T.Vector3(0,1,0);
function random(seed) { let n = seed >>> 0; return () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296); }
function builder() {
  const p = [], uv = [], colour = [], index = [];
  return {
    leaf(base, tip, width, roll, tint = 1) {
      const dir = tip.clone().sub(base), side = new T.Vector3(-dir.z, .12, dir.x).normalize().multiplyScalar(width);
      side.applyAxisAngle(dir.clone().normalize(), roll);
      const mid = base.clone().lerp(tip, .48), ridge = mid.clone().add(new T.Vector3(0, width * .18, 0));
      const lower=base.clone().lerp(tip,.25), upper=base.clone().lerp(tip,.72);
      const points = [base, lower.clone().addScaledVector(side,.78), upper.clone().addScaledVector(side,.71), tip, upper.clone().addScaledVector(side,-.71), lower.clone().addScaledVector(side,-.78), ridge], first = p.length / 3;
      points.forEach((v, i) => { p.push(v.x, v.y, v.z); uv.push([.5,.11,.14,.5,.86,.89,.5][i], [0,.25,.72,1,.72,.25,.48][i]); const c = tint * (i === 6 ? 1.055 : 1); colour.push(c, c, c); });
      for(let j=0;j<6;j++)index.push(first+j,first+(j+1)%6,first+6);
    },
    finish() { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p,3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv,2)); g.setAttribute('color', new T.Float32BufferAttribute(colour,3)); g.setIndex(index); g.computeVertexNormals(); return g; }
  };
}

function insideEnvelope(geometry, min, max) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox, position = geometry.attributes.position;
  const scale = new T.Vector3(1, 1, 1), offset = new T.Vector3();
  for (const [axis, key] of ['x', 'y', 'z'].entries()) {
    if (box.min[key] < min[axis] || box.max[key] > max[axis]) {
      scale[key] = (max[axis] - min[axis]) / (box.max[key] - box.min[key]);
      offset[key] = min[axis] - box.min[key] * scale[key];
    }
  }
  const normal = geometry.attributes.normal, point = new T.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).multiply(scale).add(offset);
    position.setXYZ(i, point.x, point.y, point.z);
    point.fromBufferAttribute(normal, i).divide(scale).normalize();
    normal.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

export { sculptedCrownGeometry as branchSprayGeometry, sculptedGrassGeometry as grassTuftGeometry } from './painterly-vegetation.js';

export function fernGeometry() {
  const b=builder();
  for(let f=0;f<4;f++) {
    const a=f*2.39996+[.08,-.17,.14,-.09][f], dir=new T.Vector3(Math.cos(a),0,Math.sin(a));
    const sideward=new T.Vector3(-dir.z,0,dir.x),length=[.97,.76,.90,.83][f],sweep=[.19,-.23,.12,-.18][f];
    for(let i=1;i<6;i++) {
      const t=i/6, c=dir.clone().multiplyScalar(t*length).addScaledVector(sideward,Math.sin(t*Math.PI)*sweep);
      c.y=.015+Math.sin(t*(2.3+f*.14))*(.64-f*.023);
      const span=Math.sin(t*Math.PI)*(.25-f*.013);
      for(const side of [-1,1]) {
        const reach=span*(side===1?1: .79+.07*f);
        const end=c.clone().addScaledVector(sideward,side*reach).addScaledVector(dir,.14-t*.10);
        end.y+=(.045-t*.13)*(1+f*.10);
        b.leaf(c,end,span*.24,side*(.20+t*.40),.73+t*.24);
      }
    }
  }
  return insideEnvelope(b.finish(),[-.7173429728,.2265449613,-.8659747243],[.8583333492,.6911794543,.7572247386]);
}

export function fracturedRockGeometry() {
  // An asymmetric sedimentary body: wide bedding faces, a shallow fracture
  // recess and rounded chipped shoulders. No regular geodesic gem facets.
  const outline=[[-.90,-.28],[-.65,-.69],[-.16,-.82],[.46,-.74],[.87,-.39],[.93,.16],[.62,.60],[.10,.80],[-.59,.60],[-.91,.18]];
  const beds=[[-.83,.62,-.07],[-.72,.87,-.04],[-.43,.96,0],[-.32,1,.018],[-.26,.93,.035],[.32,.88,.09],[.56,.77,.14],[.74,.56,.18]];
  const p=[],uv=[],indices=[],colours=[];
  for(let row=0;row<beds.length;row++)for(let side=0;side<outline.length;side++){
    const[x,z]=outline[side],[y,w,shear]=beds[row];
    const chip=(side===2&&row>=5)?.88:(side===6&&row===3)?.93:1;
    p.push(x*w*chip+shear,y+x*.12+z*.035,z*w*chip-x*.045);uv.push(x*.5+.5,z*.5+.5);
    const shade=row===4?.70:.89+row*.017;colours.push(shade,shade*.99,shade*.94);
    if(row<beds.length-1){const a=row*10+side,b=row*10+(side+1)%10;indices.push(a,a+10,b,b,a+10,b+10);}
  }
  for(let side=1;side<9;side++)indices.push(0,side,side+1,70,70+side+1,70+side);
  const source=new T.BufferGeometry();source.setAttribute('position',new T.Float32BufferAttribute(p,3));source.setAttribute('uv',new T.Float32BufferAttribute(uv,2));source.setAttribute('color',new T.Float32BufferAttribute(colours,3));source.setIndex(indices);
  const geometry=source.toNonIndexed();source.dispose();geometry.computeVertexNormals();
  insideEnvelope(geometry,[-.930,-.9064,-.8368],[.9742,.8861,.8304]);
  geometry.name='Chipped sedimentary river stone';geometry.userData.assetSource='src/environment-geometry.js';return geometry;
}

// Decorative highway surface only. Original item placement/randomness is
// retained by the caller; each vertex samples the actual rendered terrain.
export function roadRibbonGeometry(items,heightAt,baseHeightAt=heightAt){
  const positions=[],uvs=[],colours=[],indices=[],point=new T.Vector3(),colour=new T.Color();
  let omittedCliffPieces=0;
  for(const item of items){
    const rotation=item.rotation??new T.Quaternion().setFromAxisAngle(UP,item.yaw||0);
    const nx=Math.max(1,Math.ceil(item.sx/.70)),nz=Math.max(1,Math.ceil(item.sz/.70));
    const corners=[[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5],[0,0]].map(([u,v])=>{
      point.set(u*item.sx,0,v*item.sz).applyQuaternion(rotation);const x=item.x+point.x,z=item.z+point.z;
      return{x,z,y:heightAt(x,z)};
    });
    // A weathered road cannot hang on a cliff. Omitting only its decorative
    // surface here does not remove a route, collider, resource or scenery ID.
    const steep=corners.some(({x,z})=>Math.hypot(heightAt(x+.4,z)-heightAt(x-.4,z),heightAt(x,z+.4)-heightAt(x,z-.4))/.8>1.35);
    if(steep){omittedCliffPieces++;continue;}
    const lift=item.y-baseHeightAt(item.x,item.z)+item.sy*.5,first=positions.length/3;colour.setHex(item.colour);
    for(let row=0;row<=nz;row++)for(let col=0;col<=nx;col++){
      point.set((col/nx-.5)*item.sx,0,(row/nz-.5)*item.sz).applyQuaternion(rotation);
      const x=item.x+point.x,z=item.z+point.z;positions.push(x,heightAt(x,z)+lift,z);uvs.push(x/4,z/4);colours.push(colour.r,colour.g,colour.b);
      if(row<nz&&col<nx){const a=first+row*(nx+1)+col,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
    }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={terrainConforming:true,sourcePieces:items.length,omittedCliffPieces};return geometry;
}

export function ridgeBedGeometry() {
  const outline=[[-1,-.41],[-.31,-.67],[.79,-.50],[.96,.32],[.17,.62],[-.85,.38]];
  const beds=[[-.5,1,0],[-.28,.95,.02],[-.23,1.06,-.04],[.02,.89,.11],[.08,.96,.08],[.38,.78,.21],[.5,.69,.25]],p=[],uv=[],indices=[];
  for(let j=0;j<beds.length;j++)for(let k=0;k<6;k++){
    const[y,w,shear]=beds[j],[x,z]=outline[k];p.push(x*w+shear,y+Math.sin(k*2.31)*.045,z*(.7+w*.3));uv.push(x*1.5+shear,y+z*.35);
    if(j<beds.length-1){const a=j*6+k,b=j*6+(k+1)%6;indices.push(a,a+6,b,b,a+6,b+6);}
  }
  for(let k=1;k<5;k++)indices.push(0,k,k+1,36,36+k+1,36+k);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);
  const flat=g.toNonIndexed();flat.computeVertexNormals();g.dispose();return flat;
}

export function botanicalTree(batch, x, y, z, h, scale, pine) {
  // Independent cosmetic seed: never consume the world's established stream.
  const seed = (Math.abs(x * 92821 + z * 68917) * 100) >>> 0, rand = random(seed), profile = seed % 4;
  const angle = rand() * TAU, leanX = Math.cos(angle) * h * .065, leanZ = Math.sin(angle) * h * .065;
  let grove = 0;
  for (const [cx, cz, r] of [[-102,38,29],[123,61,32],[95,137,31],[-145,-38,34]])
    grove = Math.max(grove, Math.exp(-(((x-cx)/r)**2 + ((z-cz)/r)**2)));
  const upright = !pine && profile === 1;
  const width = (pine ? [1.18,.73,.93,1.09][profile] : [1.48,.56,1.04,1.29][profile]) * (1 + grove * .22);
  const crownHeight = [.86,1.23,1.06,.96][profile];
  const trunkColour = [0x615b48,0x8d8870,0x818471,0x70614f][profile];
  const point = t => [x + leanX*t*t, y + h*t, z + leanZ*t*t];
  // Tapered bent stem and short rooted buttresses; branches end inside their
  // crowns, so the tree reads as a connected living mass rather than a pole.
  for (let j = 0; j < 5; j++) batch.wood.link(point(j*.17), point((j+1)*.17), scale*(.29-j*.046), trunkColour);
  for (let j = 0; j < 3; j++) {
    const a = angle+j*TAU/3;
    batch.wood.link([x+Math.cos(a)*scale*.66,y-.035,z+Math.sin(a)*scale*.66], point(.10), scale*.11, trunkColour);
  }
  // Near and distant instances have the SAME authored growth, roots and lobes.
  // Only crown mesh tessellation changes. There is no species/shape swap.
  const crowns = pine ? batch.needles : batch.leaves, count = pine ? 1 : 4;
  for (let j = 0; j < count; j++) {
    const a = angle + j * 2.399963 + (rand()-.5)*.23;
    let level, reach, sx, sy, sz;
    if (pine) {
      // The mesh itself carries the entire ascending branch hierarchy. Its
      // irregular envelope joins the trunk without a giant featureless core.
      level = .635; reach = .05*scale*width;
      sx = 2.18*scale*width; sz = 2.08*scale;
      sy = h*.405*crownHeight;
    } else {
      const cap = j === 3;
      level = upright ? [.45,.63,.80,.96][j] : [.66,.74,.80,.94][j];
      reach = (upright ? .44 : cap ? .58 : 1.43) * scale * width;
      const radius = (upright ? 1.23 : [1.62,1.56,1.51,1.37][j]) * scale;
      sx = radius*width; sz = radius*(upright ? .81 : 1.02);
      sy = radius*(upright ? 1.24 : .98)*crownHeight;
    }
    const centre = [x+leanX*level+Math.cos(a)*reach, y+h*level*crownHeight, z+leanZ*level+Math.sin(a)*reach];
    if (!pine) {
      const root = point(pine ? Math.max(.16,level*.75) : upright ? level*.68 : .31+(j%3)*.08);
      const fork = root.map((v,k)=>v+(centre[k]-v)*.64);
      batch.wood.link(root, fork, scale*(pine?.075:.105), trunkColour);
      batch.wood.link(fork, centre, scale*(pine?.033:.047), trunkColour);
    }
    const colour = new T.Color(pine ? [0x506a58,0x587058,0x627758,0x49675a][profile] : [0x687e55,0x89905b,0x758459,0x60764f][profile]);
    colour.multiplyScalar(.95+rand()*.09+(j/count)*.035);
    crowns.add(...centre, sx, sy, sz, colour.getHex(), a);
  }
}
