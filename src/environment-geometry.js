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
    card(centre, right, up, width, height, bow, tint, rooted = false, shape = null) {
      const face = new T.Vector3().crossVectors(right, up).normalize();
      const first = positions.length / 3, columns = rooted ? 1 : 2;
      for (let row = 0; row <= 2; row++) for (let column = 0; column <= columns; column++) {
        const u = column / columns, v = row / 2, x = (u - .5) * width;
        const y = (v - (rooted ? 0 : .5)) * height;
        const curve = rooted ? v * v * bow : (1 - 4 * (u - .5) ** 2) * bow + Math.sin(v * Math.PI) * bow * .45;
        const position = centre.clone().addScaledVector(right, x).addScaledVector(up, y).addScaledVector(face, curve);
        if (shape) shape(position, u, v, right, up, face);
        // Crown cards share a rounded spray volume instead of lighting each
        // crossing plane separately. Rooted blades use an upward foliage
        // normal so crossing cards do not become dark asterisks in the meadow.
        // The foliage material keeps these normals on either card face.
        const normal = rooted
          ? face.clone().addScaledVector(right, (u - .5) * .82).addScaledVector(up, 1.15).normalize()
          : new T.Vector3(position.x, position.y * .82 + .38, position.z).normalize();
        positions.push(position.x, position.y, position.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(u, v);
        const outer = Math.min(1, Math.hypot(position.x, position.z) / (width * .54));
        const top = Math.max(0, Math.min(1, position.y / height + .5));
        // Gentle interior occlusion binds the sprays without dark card seams.
        const light = tint * (rooted ? .73 + .27 * v : .87 + outer * .08 + top * .05);
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

// These are the authored 56670b3 support envelopes, not gameplay bounds.
// Keep reshaped local assets inside them without changing any world instance,
// root, interaction surface or branch construction sequence.
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

function pineSprayGeometry(distant) {
  const b = cardBuilder(), rand = random(78521);
  // Three long, uneven boughs carry the volume at both detail levels. The two
  // near-only fans sit inside that outline rather than changing its perimeter.
  const fans = [
    [.13, .14, -.10, .02, 2.72, 2.28],
    [2.21, -.28, .11, -.08, 2.58, 2.12],
    [4.36, .48, -.03, .11, 2.63, 2.21],
    [.47, -.63, .14, -.18, 1.54, 1.76],
    [2.50, .68, -.11, -.10, 1.48, 1.71]
  ];
  for (let i = 0; i < (distant ? 3 : 5); i++) {
    const [angle, tilt, x, y, width, height] = fans[i];
    const right = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const up = new T.Vector3(0, 1, 0).applyAxisAngle(right, tilt);
    const centre = new T.Vector3(x, y, (rand() - .5) * .18);
    b.card(centre, right, up, width, height, .26 + rand() * .07, .90 + rand() * .10, false,
      (position, u, v, across, rise, face) => {
        // Sweep and cup the branch across its length. Unequal hanging ends
        // break the flat pad silhouette while the fork stays connected.
        position.addScaledVector(across, Math.sin(v * Math.PI) * (.15 + i * .025));
        position.addScaledVector(across, (u - .5) * width * (-.42 * v * v));
        position.addScaledVector(rise, -Math.pow(Math.abs(u - .42) * 2, 2) * .34);
        position.addScaledVector(face, Math.sin(v * Math.PI) * (u - .35) * .29);
      });
  }
  return insideEnvelope(b.finish(),
    distant ? [-1.1541745663, -1.0405642986, -1.3508864641] : [-1.3845872879, -1.1098904610, -1.2291122675],
    distant ? [1.3268905878, 1.0763062239, 1.3072884083] : [1.4107578993, 1.0763062239, 1.3691959381]);
}

export function branchSprayGeometry(needles = false, distant = false) {
  if (needles) return pineSprayGeometry(distant);
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
  const corners = [.27, 2.26, 4.43], heights = [.88, .77, .84];
  for (let i = 0; i < 3; i++) {
    const next = (i + 1) % 3;
    const right = new T.Vector3(Math.cos(corners[next]) - Math.cos(corners[i]), 0, Math.sin(corners[next]) - Math.sin(corners[i])).normalize();
    b.card(new T.Vector3(), right, new T.Vector3(0, 1, 0), 1, .88, 0, .93 + rand() * .07, true,
      (position, u, v) => {
        // Reuse the same three four-triangle strips around an irregular root
        // cluster. Crossing through its centre made three strong radial prongs;
        // bowed perimeter strips instead overlap as a volume from either side.
        const corner = u < .5 ? i : next, angle = corners[corner] + Math.sin(v * Math.PI) * .09;
        const radius = v === 0 ? .20 : v === .5 ? [.55, .53, .52][corner] : [.28, .23, .26][corner];
        position.set(Math.cos(angle) * radius + .19 * v * v,
          heights[corner] * v, Math.sin(angle) * radius + .12 * v * v);
      });
  }
  const geometry = b.finish(), position = geometry.attributes.position, normal = geometry.attributes.normal;
  // Retain the upward grass-volume normal used by the completed material pass;
  // the support wraps the tuft, so its horizontal component follows that wrap.
  for (let i = 0; i < normal.count; i++) {
    const v = geometry.attributes.uv.getY(i);
    const direction = new T.Vector3(position.getX(i) - .19 * v * v, 1.15, position.getZ(i) - .12 * v * v).normalize();
    normal.setXYZ(i, direction.x, direction.y, direction.z);
  }
  return insideEnvelope(geometry, [-.5847644806, 0, -.5323136449], [.5847644806, .8877926469, .5473169684]);
}

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
    const colour=new T.Color(pine?[0x576e52,0x627951,0x6b7d58,0x506f58][profile]:[0x67794c,0x818851,0x788355,0x58714b][profile]).multiplyScalar(.89+rand()*.22).getHex();
    const crowns=pine?batch.needles:batch.leaves;
    crowns.add(end[0],end[1],end[2],radius*(pine?1.08:upright?.83:1.14),radius*(pine?.69:upright?1.28:.92),radius,colour,a);
    // The spray's many individual folded leaves make light-bearing gaps between
    // real forks. More canopy variation comes from species, not new save anchors.
  }
}
