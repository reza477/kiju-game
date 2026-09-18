import * as T from '../vendor/three.module.js';

// Original botanical meshes. Canopies and grasses use bowed cutout cards;
// fern pinnae keep their small folded-leaf meshes. All assets are local.
const TAU = Math.PI * 2;
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

function cardBuilder() {
  const positions = [], normals = [], uvs = [], colours = [], indices = [];
  return {
    card(centre, right, up, width, height, bow, tint, rooted = false) {
      const face = new T.Vector3().crossVectors(right, up).normalize();
      const first = positions.length / 3, columns = rooted ? 1 : 2;
      for (let row = 0; row <= 2; row++) for (let column = 0; column <= columns; column++) {
        const u = column / columns, v = row / 2, x = (u - .5) * width;
        const y = (v - (rooted ? 0 : .5)) * height;
        const curve = rooted ? v * v * bow : (1 - 4 * (u - .5) ** 2) * bow + Math.sin(v * Math.PI) * bow * .45;
        const position = centre.clone().addScaledVector(right, x).addScaledVector(up, y).addScaledVector(face, curve);
        // Soft normals follow the bowed leaf volume, avoiding shiny flat planes.
        const normal = face.clone().addScaledVector(right, (u - .5) * .82).addScaledVector(up, rooted ? .42 : (v - .5) * .68).normalize();
        positions.push(position.x, position.y, position.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(u, v);
        const light = tint * (rooted ? .73 + .27 * v : .91 + .09 * v);
        colours.push(light, light, light);
        if (row < 2 && column < columns) {
          const a = first + row * (columns + 1) + column, b = a + columns + 1;
          indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    },
    finish() {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
      geometry.setAttribute('color', new T.Float32BufferAttribute(colours, 3));
      geometry.setIndex(indices);
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      return geometry;
    }
  };
}

export function branchSprayGeometry(needles = false, distant = false) {
  const b = cardBuilder(), rand = random(needles ? 78521 : 81521), count = distant ? 3 : needles ? 5 : 6;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996 + rand() * .28;
    const right = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
    // Crossing inclined surfaces retain leaf silhouettes above, below and at
    // ground level. The final inclined card closes each crown's top view.
    const tilt = i === count - 1 ? (needles ? .91 : 1.28) : (i % 2 ? -.59 : .46) + rand() * .23;
    const up = new T.Vector3(0, 1, 0).applyAxisAngle(right, tilt);
    const centre = new T.Vector3((rand() - .5) * .29, (rand() - .5) * .22, (rand() - .5) * .29);
    if (needles) centre.y += Math.sin(i * 1.67) * .19 - .08;
    const width = (needles ? 2.38 : 2.24) * (.89 + rand() * .15);
    const height = (needles ? 1.78 : 1.79) * (.89 + rand() * .17);
    b.card(centre, right, up, width, height, .15 + rand() * .10, .90 + rand() * .10);
  }
  return b.finish();
}

export function grassTuftGeometry() {
  const b = cardBuilder(), rand = random(81951);
  for (let i = 0; i < 3; i++) {
    const angle = i * 2.39996, right = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const centre = new T.Vector3(Math.sin(angle) * .035, 0, Math.cos(angle) * .035);
    b.card(centre, right, new T.Vector3(0, 1, 0), 1.04 + rand() * .13, .79 + rand() * .18, .13 + rand() * .09, .93 + rand() * .07, true);
  }
  return b.finish();
}

export function fernGeometry() {
  const b=builder();
  for(let f=0;f<4;f++) {
    const a=f*2.39996, dir=new T.Vector3(Math.cos(a),0,Math.sin(a));
    for(let i=1;i<6;i++) {
      const t=i/6, c=dir.clone().multiplyScalar(t*.91); c.y=Math.sin(t*2.2)*.65;
      const span=Math.sin(t*Math.PI)*.25;
      for(const side of [-1,1]) {
        const end=c.clone().add(new T.Vector3(-dir.z*side*span+dir.x*.10,.035,dir.x*side*span+dir.z*.10));
        b.leaf(c,end,span*.22,side*.15,.73+t*.24);
      }
    }
  }
  return b.finish();
}

export function fracturedRockGeometry() {
  const g=new T.IcosahedronGeometry(1,1), p=g.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const bed=Math.round(y*3.4)/3.4, fracture=.91+.12*Math.sin(x*8+z*5);
    p.setXYZ(i,x*fracture+y*.22, y*.78+bed*.16, z*fracture-x*.14);
  }
  g.computeVertexNormals(); return g;
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

export function botanicalTree(batch, x,y,z,h,scale,pine) {
  const seed=(Math.abs(x*92821+z*68917)*100)>>>0, rand=random(seed), profile=seed%4;
  const angle=rand()*TAU, leanX=Math.cos(angle)*h*.065, leanZ=Math.sin(angle)*h*.065;
  let grove=0;
  for(const[cx,cz,r]of[[-102,38,29],[123,61,32],[95,137,31],[-145,-38,34]])grove=Math.max(grove,Math.exp(-(((x-cx)/r)**2+((z-cz)/r)**2)));
  // Four genuine growth habits: spreading oak, upright aspen, open silver birch
  // and a wind-pruned beech. Uneven crown lobes retain a visible branch hierarchy.
  const upright=!pine&&profile===1;
  const width=(pine?[1.18,.73,.93,1.09][profile]:[1.48,.56,1.04,1.29][profile])*(1+grove*.22), crownHeight=[.86,1.23,1.06,.96][profile];
  const trunkColour=[0x615c47,0xa29d83,0x9a9b83,0x766957][profile];
  const point=t=>[x+leanX*t*t,y+h*t,z+leanZ*t*t];
  for(let j=0;j<5;j++) batch.wood.link(point(j*.18),point((j+1)*.18),scale*(.29-j*.045),trunkColour);
  for(let j=0;j<4;j++) {
    const a=angle+j*TAU/4;
    batch.wood.link([x+Math.cos(a)*scale*.78,y-.07,z+Math.sin(a)*scale*.78],point(.11),scale*.12,trunkColour);
  }
  const count=batch.distant?(pine?9:9):pine?15:14;
  for(let j=0;j<count;j++) {
    const level=pine?j/count:upright?.36+j*.64/count:(j<count-4?.52+(j%4)*.095:.84+(j-count+4)*.025);
    const a=angle+j*2.39996+(rand()-.5)*.45;
    const reach=pine?(2.5-level*1.96)*scale*width:(upright?1.35+Math.sin(level*Math.PI)*.45:j<9?1.95+rand()*.92:.81+rand()*.60)*scale*width;
    const endY=y+h*(pine?.18+level*.81:level)*crownHeight+Math.sin(j*1.71+angle)*scale*.24;
    const end=[x+leanX+Math.cos(a)*reach,endY,z+leanZ+Math.sin(a)*reach];
    const origin=point(pine?.20+level*.65:upright?level*.75:j<9?.25+(j%4)*.065:.66);
    const fork=[origin[0]+(end[0]-origin[0])*.52,origin[1]+(end[1]-origin[1])*.69,origin[2]+(end[2]-origin[2])*.52];
    batch.wood.link(origin,fork,scale*(pine?.075:.105),trunkColour);
    batch.wood.link(fork,end,scale*(pine?.034:.053),trunkColour);
    const lateral=[end[0]+Math.sin(a)*scale*.48,end[1]+scale*.30,end[2]-Math.cos(a)*scale*.48];
    batch.wood.link(fork,lateral,scale*.025,trunkColour);
    const radius=(pine?1.21-level*.54:(upright?.92:1.25)+rand()*.30)*scale*(1+grove*.16);
    const colour=new T.Color(pine?[0x496e51,0x567750,0x657e55,0x476b54][profile]:[0x536f35,0x889549,0x718644,0x446638][profile]).multiplyScalar(.89+rand()*.22).getHex();
    const crowns=pine?batch.needles:batch.leaves;
    crowns.add(end[0],end[1],end[2],radius*(pine?1.08:upright?.83:1.14),radius*(pine?.69:upright?1.28:.92),radius,colour,a);
    // The spray's many individual folded leaves make light-bearing gaps between
    // real forks. More canopy variation comes from species, not new save anchors.
  }
}
