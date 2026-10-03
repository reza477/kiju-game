import * as T from '../vendor/three.module.js';

// Original editable asset workshop. Each crown is a closed sculpted volume,
// not intersecting cards. The same profiles drive both levels of detail; only
// their angular sampling changes. World positions and randomness live elsewhere.
const TAU = Math.PI * 2;
const clamp = (x, low = 0, high = 1) => Math.max(low, Math.min(high, x));

const BROADLEAF_PROFILE = [[-.78,.15],[-.57,.57],[-.30,.88],[.05,1.00],[.38,.91],[.68,.65],[.86,.22]];

function finishShell(positions, uvs, colours, indices, volumeWeight, name) {
  const source = new T.BufferGeometry();
  source.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  source.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  source.setAttribute('color', new T.Float32BufferAttribute(colours, 3));
  source.setIndex(indices);
  const geometry = source.toNonIndexed(); source.dispose(); geometry.computeVertexNormals();
  const normals = geometry.attributes.normal, points = geometry.attributes.position;
  const face = new T.Vector3(), volume = new T.Vector3();
  for (let i = 0; i < normals.count; i++) {
    volume.set(points.getX(i), points.getY(i) * .72 + .20, points.getZ(i)).normalize();
    face.fromBufferAttribute(normals, i).lerp(volume, volumeWeight).normalize();
    normals.setXYZ(i, face.x, face.y, face.z);
  }
  geometry.setIndex(Array.from({length: points.count}, (_, i) => i));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere(); geometry.name = name;
  geometry.userData.assetSource = 'src/painterly-vegetation.js';
  return geometry;
}

function pineCrownGeometry(distant) {
  // Separate closed boughs meet a concealed core. Outer tips are never joined
  // around the trunk, so an irregular conifer silhouette cannot become a skirt.
  const p=[],uv=[],colours=[],index=[];
  function shell(centres,radii,sides,side,up,tint){
    const first=p.length/3;
    for(let row=0;row<centres.length;row++)for(let edge=0;edge<sides;edge++){
      const angle=edge/sides*TAU,[width,thickness]=radii[row],centre=centres[row];
      const sideAmount=Math.cos(angle)*width,upAmount=Math.sin(angle)*thickness;
      p.push(centre[0]+side[0]*sideAmount+up[0]*upAmount,
        centre[1]+side[1]*sideAmount+up[1]*upAmount,
        centre[2]+side[2]*sideAmount+up[2]*upAmount);
      uv.push(edge/sides,row/(centres.length-1));
      const light=clamp(tint+.065*row/(centres.length-1)+.025*Math.sin(angle));
      colours.push(light*.96,light,light*.97);
      if(row<centres.length-1){
        const a=first+row*sides+edge,b=first+row*sides+(edge+1)%sides;
        index.push(a,a+sides,b,b,a+sides,b+sides);
      }
    }
    const bottom=p.length/3;p.push(...centres[0]);uv.push(.5,0);colours.push(tint*.94,tint,tint*.97);
    const top=p.length/3;p.push(...centres.at(-1));uv.push(.5,1);colours.push(tint*.98,tint+.02,tint);
    for(let edge=0;edge<sides;edge++){
      const next=(edge+1)%sides,last=first+(centres.length-1)*sides;
      index.push(bottom,first+edge,first+next,top,last+next,last+edge);
    }
  }
  // The small core sits inside the bough roots and ends in an unequal leader.
  shell([[0,-.80,0],[-.01,-.33,.01],[.022,.22,0],[.05,.69,.018],[.076,1.015,.041]],
    [[.12,.12],[.20,.20],[.15,.15],[.07,.07],[.012,.012]],distant?6:8,[1,0,0],[0,0,1],.77);
  for(let branch=0;branch<16;branch++){
    const t=branch/15,angle=branch*2.399963+.43+Math.sin(branch*1.37)*.13;
    const reach=(.93*Math.pow(1-t,.72)+.095)*(1+Math.sin(branch*1.71)*.075);
    const height=-.64+t*1.43+Math.sin(branch*2.13)*.029;
    const width=(.19+.105*(1-t))*(.88+.12*Math.cos(branch*1.71));
    const side=[-Math.sin(angle),0,Math.cos(angle)],dir=[Math.cos(angle),0,Math.sin(angle)];
    const centres=[.025,.31,.69,1].map(u=>[
      dir[0]*reach*u+side[0]*Math.sin(u*Math.PI)*reach*.10,
      height-reach*(u*u*.115)+Math.sin(u*Math.PI)*.035,
      dir[2]*reach*u+side[2]*Math.sin(u*Math.PI)*reach*.10]);
    shell(centres,[[width*.16,width*.12],[width*.82,width*.48],[width,width*.56],[width*.055,width*.025]],
      distant?4:6,side,[0,1,0],.77+t*.105+(branch%3)*.009);
  }
  return finishShell(p,uv,colours,index,.48,
    `Painterly branched pine crown ${distant?'distant':'near'}`);
}

function addBroadleafEdges(main) {
  const p=Array.from(main.attributes.position.array),n=Array.from(main.attributes.normal.array),uv=Array.from(main.attributes.uv.array),colours=Array.from(main.attributes.color.array);
  // Smaller attached masses interrupt only parts of the perimeter. They are
  // subordinate to the primary branch volume rather than an equal-size pile.
  // Their lowered, tapering shoulders overlap the side of the parent mass;
  // they do not sit as separate beads on its upper surface.
  for(const [cx,cy,cz,sx,sy,sz] of [[-.79,.13,.31,.43,.21,.36],[.62,.38,-.58,.37,.20,.43]]) {
    const shell=new T.IcosahedronGeometry(1,0),pos=shell.attributes.position;
    for(let i=0;i<pos.count;i++) {
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),r=1+.065*Math.sin(x*5+z*3-y);
      p.push(cx+x*sx*r,cy+y*sy*r*(1-.22*Math.abs(cx<0?x:z)),cz+z*sz*r);
      const normal=new T.Vector3(x/sx,y/sy,z/sz).normalize();n.push(normal.x,normal.y,normal.z);
      uv.push((x+1)*.5,(z+1)*.5);
      const light=.87+y*.055;colours.push(light*.96,light,light*.94);
    }
    shell.dispose();
  }
  const result=new T.BufferGeometry();
  result.setAttribute('position',new T.Float32BufferAttribute(p,3));result.setAttribute('normal',new T.Float32BufferAttribute(n,3));
  result.setAttribute('uv',new T.Float32BufferAttribute(uv,2));result.setAttribute('color',new T.Float32BufferAttribute(colours,3));
  result.setIndex(Array.from({length:p.length/3},(_,i)=>i));
  result.name=main.name;result.userData={...main.userData};main.dispose();
  result.computeBoundingBox();result.computeBoundingSphere();return result;
}

/** Unit crown centred on its branch attachment, metres; +Y up. */
export function sculptedCrownGeometry(pine = false, distant = false) {
  if(pine)return pineCrownGeometry(distant);
  const profile = BROADLEAF_PROFILE, sides = distant ? 8 : 12;
  const p = [], uv = [], colours = [], index = [];
  for (let row = 0; row < profile.length; row++) {
    const [height, radius] = profile[row];
    for (let side = 0; side < sides; side++) {
      const angle = side / sides * TAU;
      // Broad unequal lobes establish silhouette; tiny noise would only shimmer.
      const lobe = 1 + .12 * Math.sin(angle * 3 + .6) + .065 * Math.cos(angle * 5 - .9);
      const shelf = .12 * Math.sin(angle * 2 + .8) + .065 * Math.sin(angle * 3 + row * .71);
      const sweep = angle + Math.sin(row * .91) * .065;
      const x = Math.cos(sweep) * radius * lobe + height * .10;
      const z = Math.sin(sweep) * radius * lobe * .94 + height * height * .08;
      const y = height + shelf * radius;
      p.push(x, y, z); uv.push(side / sides, row / (profile.length - 1));
      const light = clamp(.78 + .17 * row / (profile.length - 1) + .04 * Math.sin(angle + .8));
      colours.push(light * .96, light, light * .94);
      if (row < profile.length - 1) {
        const a = row * sides + side, b = row * sides + (side + 1) % sides;
        index.push(a, a + sides, b, b, a + sides, b + sides);
      }
    }
  }
  const bottom = p.length / 3; p.push(-.07, -.83, .045); uv.push(.5, 0); colours.push(.70, .74, .70);
  const top = p.length / 3; p.push(.11, .925, .08); uv.push(.5, 1); colours.push(.93, .98, .93);
  for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides, last = (profile.length - 1) * sides;
    index.push(bottom, side, next, top, last + next, last + side);
  }
  return addBroadleafEdges(finishShell(p,uv,colours,index,.70,`Painterly broadleaf crown ${distant?'distant':'near'}`));
}

/** Unequal curved blades in two connected clumps; no alpha texture or cards. */
export function sculptedGrassGeometry() {
  const p = [], normals = [], uv = [], colours = [], index = [];
  const blades = [
    [-.27, -.13, .59, -.24, .12], [-.22, -.10, .84, -.05, .075],
    [-.17, -.04, .67, .21, .10], [-.22, .02, .44, -.16, .13],
    [-.08, -.01, .75, .19, .08], [.14, .16, .57, .25, .11],
    [.22, .15, .79, .14, .065], [.25, .08, .47, .31, .12]
  ];
  blades.forEach(([x, z, height, bend, width], blade) => {
    const angle = blade * 2.399963 + .28, dx = Math.cos(angle) * width, dz = Math.sin(angle) * width;
    const bx = Math.cos(angle + .8) * bend, bz = Math.sin(angle + .8) * bend;
    const points = [[x - dx, 0, z - dz], [x + dx, 0, z + dz],
      [x + bx * .30 - dx * .50, height * .58, z + bz * .30 - dz * .50],
      [x + bx * .30 + dx * .50, height * .58, z + bz * .30 + dz * .50],
      [x + bx, height, z + bz]];
    const first = p.length / 3;
    points.forEach((point, i) => {
      p.push(...point); uv.push(i % 2, [0, 0, .58, .58, 1][i]);
      const normal = new T.Vector3(Math.sin(angle) * .35, 1, -Math.cos(angle) * .35).normalize();
      normals.push(normal.x, normal.y, normal.z);
      const light = .65 + [0, 0, .18, .20, .30][i] - (blade % 3) * .025;
      colours.push(light * .96, light, light * .90);
    });
    index.push(first, first + 1, first + 2, first + 2, first + 1, first + 3, first + 2, first + 3, first + 4);
  });
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colours, 3));
  geometry.setIndex(index); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.name = 'Painterly grouped meadow blades';
  geometry.userData.assetSource = 'src/painterly-vegetation.js';
  return geometry;
}
