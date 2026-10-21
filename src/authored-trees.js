import * as T from '../vendor/three.module.js';

// Project-authored standing trees. Branches carry individual curved leaf fans,
// rather than closed balls of foliage. One opaque mesh/material per species
// shares the existing rooted instances, wind passes and destruction ownership.
const TAU=Math.PI*2,UP=new T.Vector3(0,1,0);
const vector=(x,y,z)=>new T.Vector3(x,y,z);
const palettes={
  broadleaf:[0x4d6858,0x647e61,0x819065,0x58735b,0x738460],
  pine:[0x426456,0x557565,0x72907a,0x537262,0x65826b]
};

function workshop(kind,distant){
  const positions=[],normals=[],colours=[],uvs=[],colour=new T.Color();
  const branches=[],leafRoots=[];let leafCount=0;
  function triangle(a,b,c,tint,shade=1,vertexNormals){
    const normal=new T.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize();
    colour.setHex(tint).multiplyScalar(shade);
    for(const [i,p]of[a,b,c].entries()){
      const n=vertexNormals?.[i]??normal;
      positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);
      colours.push(colour.r,colour.g,colour.b);uvs.push(p.x+.5,p.y);
    }
  }
  function limb(points,radii,major=false){
    const sides=major?(distant?6:8):(distant?4:5);
    const rings=points.map((p,row)=>{
      const direction=points[Math.min(row+1,points.length-1)].clone().sub(points[Math.max(0,row-1)]).normalize();
      const side=new T.Vector3().crossVectors(direction,Math.abs(direction.y)>.94?vector(1,0,0):UP).normalize();
      const front=new T.Vector3().crossVectors(direction,side).normalize();
      return Array.from({length:sides},(_,i)=>{
        const a=i/sides*TAU,normal=side.clone().multiplyScalar(Math.cos(a)).addScaledVector(front,Math.sin(a));
        return{point:p.clone().addScaledVector(normal,radii[row]*(major?1+.055*Math.sin(i*2.7+row*.8):1)),normal};
      });
    });
    for(let row=0;row<rings.length-1;row++)for(let i=0;i<sides;i++){
      const a=rings[row][i],b=rings[row][(i+1)%sides],c=rings[row+1][i],d=rings[row+1][(i+1)%sides];
      const bark=kind==='pine'?0x625448:0x6e604d,shade=.87+row*.045+(i%3)*.025;
      triangle(a.point,b.point,c.point,bark,shade,[a.normal,b.normal,c.normal]);
      triangle(b.point,d.point,c.point,bark,shade,[b.normal,d.normal,c.normal]);
    }
    for(let i=1;i<sides-1;i++){
      triangle(rings[0][0].point,rings[0][i+1].point,rings[0][i].point,0x514a3e);
      const end=rings.at(-1);triangle(end[0].point,end[i].point,end[i+1].point,0x8b7b5c);
    }
    branches.push(points.map(p=>p.toArray()));
  }
  function leaf(base,tip,width,roll,tint){
    const along=tip.clone().sub(base),axis=along.clone().normalize();
    const side=vector(-axis.z,.015,axis.x).normalize().applyAxisAngle(axis,roll);
    const normal=new T.Vector3().crossVectors(axis,side).normalize();if(normal.y<0)normal.negate();
    const point=(t,w,h)=>base.clone().addScaledVector(along,t).addScaledVector(side,w*width).addScaledVector(normal,h*width);
    // Six curved edge points and a central vein produce a leaf with a real
    // underside and a readable scalloped silhouette, without transparent cards.
    const rim=[point(0,0,0),point(.25,.88,.19),point(.64,.74,-.19),point(1,0,-.57),point(.70,-.68,-.25),point(.23,-.81,.10)];
    const top=point(.47,0,.64),under=point(.47,0,.31);
    for(let i=0;i<6;i++){
      const a=rim[i],b=rim[(i+1)%6],cross=new T.Vector3().crossVectors(b.clone().sub(a),top.clone().sub(a));
      const corners=cross.dot(normal)>0?[a,b]:[b,a];
      triangle(corners[0],corners[1],top,tint,i<3?1.05:.94);
      triangle(corners[1],corners[0],under,tint,.69);
    }
    leafRoots.push(base.toArray());leafCount++;
  }
  function fan(base,direction,length,ordinal,pine=false){
    const along=direction.clone().normalize(),side=vector(-along.z,0,along.x).normalize();
    const middle=base.clone().addScaledVector(along,length*.58).addScaledVector(UP,length*.09686),end=base.clone().addScaledVector(along,length);
    const point=t=>t<=.58?base.clone().lerp(middle,t/.58):middle.clone().lerp(end,(t-.58)/.42);
    limb([point(0),point(.58),point(1)],[.0026,.0016,.00065]);
    const pairs=distant?1:(pine?3:2);
    for(let pair=0;pair<pairs;pair++)for(const sign of[-1,1]){
      const t=.19+pair*(pine?.235:.31)+(sign>0?.035:0),root=point(t);
      const reach=length*(pine?.68:.74)*(1-pair*.10),spread=pine?.57:.76;
      const tip=root.clone().addScaledVector(along,reach*.65).addScaledVector(side,sign*reach*spread).addScaledVector(UP,reach*(.13-pair*.05));
      const tint=palettes[kind][(ordinal+pair)%palettes[kind].length];
      leaf(root,tip,reach*(pine?.36:.42),sign*(.35+.24*Math.sin(ordinal*1.7+pair)),tint);
    }
    leaf(point(.86),point(1.19),length*(pine?.043:.071),.15,palettes[kind][(ordinal+2)%5]);
  }
  function finish(bounds){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    geometry.setIndex(Array.from({length:positions.length/3},(_,i)=>i));geometry.computeBoundingBox();
    const box=geometry.boundingBox,sx=Math.min(bounds.min.x/box.min.x,bounds.max.x/box.max.x),sz=Math.min(bounds.min.z/box.min.z,bounds.max.z/box.max.z),sy=bounds.max.y/box.max.y;
    // Preserve the true trunk root, never recenter an asymmetric crown. The
    // display fits inside the original normalized box used by both adapters.
    geometry.scale(sx,sy,sz);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    geometry.name=`Authored ${kind} leaf-fan tree ${distant?'far':'near'}`;
    geometry.userData={shared:true,authoredTree:kind,meshyTreeLod:distant?'far':'near',assetSource:'src/authored-trees.js',leafCount,limbCount:branches.length,
      root:[0,0,0],leafRoots,branches,displayScale:[sx,sy,sz],opaqueLeafVolumes:true};
    return geometry;
  }
  return{limb,fan,finish};
}

function broadleaf(kit){
  const trunk=[vector(0,0,0),vector(0,.16,0),vector(.009,.31,-.007),vector(.018,.46,-.013)];
  kit.limb(trunk,[.043,.031,.023,.012],true);
  for(let root=0;root<5;root++){
    const a=root*TAU/5+.18,d=vector(Math.cos(a),0,Math.sin(a));
    kit.limb([d.clone().multiplyScalar(.11).setY(.006),d.clone().multiplyScalar(.057).setY(.025),vector(0,.09,0)],[.005,.019,.026]);
  }
  // Three unequal overlapping crowns, rather than an evenly leafed ladder.
  // Every fan is supported by a secondary bough. Open forks beneath the crowns
  // and the offset between their shoulders provide deliberate negative space.
  const centres=[vector(-.16,.70,.095),vector(.155,.76,.075),vector(-.018,.87,-.135)];
  for(let crown=0;crown<centres.length;crown++){
    const base=vector(.006,.29+crown*.046,-.005),end=centres[crown];
    const middle=base.clone().lerp(end,.55).addScaledVector(UP,-.055);
    const primary=t=>base.clone().multiplyScalar((1-t)**2).addScaledVector(middle,2*t*(1-t)).addScaledVector(end,t*t);
    kit.limb([primary(0),primary(.32),primary(.66),primary(1)],[.022,.017,.010,.004],true);
    for(let bough=0;bough<6;bough++){
      const a=bough*2.399963+crown*.83,out=vector(Math.cos(a),0,Math.sin(a)),side=vector(-out.z,0,out.x);
      const root=primary(.66+(bough%3)*.095),tip=end.clone().addScaledVector(out,.092+(bough%3)*.017);
      tip.y+=(bough%3-1)*.034;
      const middle=root.clone().lerp(tip,.57).addScaledVector(UP,.023);
      const secondary=t=>t<=.57?root.clone().lerp(middle,t/.57):middle.clone().lerp(tip,(t-.57)/.43);
      kit.limb([root,middle,tip],[.007,.0045,.0019]);
      for(let spray=0;spray<3;spray++){
        const leafRoot=secondary(.40+spray*.29),ordinal=crown*18+bough*3+spray;
        const direction=out.clone().multiplyScalar(.78).addScaledVector(side,Math.sin(ordinal*1.7)*.40).addScaledVector(UP,.22+(spray%2)*.39);
        kit.fan(leafRoot,direction,.137+(spray%2)*.017,ordinal);
      }
    }
  }

}

function pine(kit){
  const point=t=>vector(t<=.23?0:Math.sin((t-.23)*3.4)*.012,t,t<=.23?0:Math.sin((t-.23)*4.1)*.008);
  kit.limb([point(0),point(.23),point(.46),point(.70),point(.87),point(1)],[.029,.022,.016,.011,.006,.0018],true);
  for(let root=0;root<4;root++){
    const a=root*TAU/4+.4,d=vector(Math.cos(a),0,Math.sin(a));
    kit.limb([d.clone().multiplyScalar(.075).setY(.005),d.clone().multiplyScalar(.035).setY(.025),point(.075)],[.004,.014,.020]);
  }
  for(let tier=0;tier<6;tier++)for(let side=0;side<3;side++){
    const ordinal=tier*3+side,height=[.35,.405,.58,.635,.79,.845][tier]+(side-1)*.015,a=ordinal*2.399963+tier*.29;
    const out=vector(Math.cos(a),0,Math.sin(a)),across=vector(-out.z,0,out.x),reach=[.24,.20,.18,.15,.11,.075][tier]*(1+.08*Math.sin(ordinal*1.7));
    const base=point(height),end=base.clone().addScaledVector(out,reach).addScaledVector(UP,-reach*.18);
    const middle=base.clone().lerp(end,.55).addScaledVector(UP,.013);
    kit.limb([base,middle,end],[.009-tier*.0009,.005-tier*.0005,.0014]);
    for(let fan=0;fan<2;fan++){
      const t=.49+fan*.43,root=base.clone().lerp(end,t).addScaledVector(UP,Math.sin(t*Math.PI)*.012);
      const direction=out.clone().addScaledVector(across,(fan?1:-1)*.38).addScaledVector(UP,.045);
      kit.fan(root,direction,[.23,.21,.19,.17,.14,.11][tier]*(fan?.92:1),ordinal*2+fan,true);
    }
  }
  for(let tip=0;tip<3;tip++){
    const a=tip*2.399963;kit.fan(point(.84+tip*.042),vector(Math.cos(a)*.25,.92,Math.sin(a)*.25),.10-tip*.014,40+tip,true);
  }
}

export function authoredTreeGeometry(kind,bounds,distant=false){
  if(!palettes[kind]||!bounds?.isBox3||bounds.min.y!==0||bounds.max.y<=0)throw new Error('Authored tree requires a rooted species envelope');
  const kit=workshop(kind,distant);if(kind==='pine')pine(kit);else broadleaf(kit);return kit.finish(bounds);
}

export function createAuthoredTreeDisplay(kind,bounds){
  const near=authoredTreeGeometry(kind,bounds),far=authoredTreeGeometry(kind,bounds,true);
  const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,metalness:0,side:T.FrontSide});
  material.name=`Authored ${kind} bark and leaf paint`;material.envMapIntensity=.65;
  material.userData={shared:true,meshyPilot:kind,authoredTree:true};
  return{geometry:near,lods:{near,far},material,source:'src/authored-trees.js'};
}
