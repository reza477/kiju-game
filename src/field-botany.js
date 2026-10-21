import * as T from '../vendor/three.module.js';

// Reusable, project-authored opaque field botany. Stems and thin leaf volumes
// describe actual silhouettes; no sprite, alpha card, sphere or crown blob.
// The kit owns no placement/random stream and cannot create scenery records.
const UP=new T.Vector3(0,1,0),TAU=Math.PI*2;
const palettes={leaf:[0x586650,0x7c8963,0x9a9d73],wood:[0x544c3e,0x7c6c51]};
function builder(){
  const positions=[],colours=[],uvs=[];
  const colour=new T.Color();
  function triangle(a,b,c,tint,light=1){
    colour.setHex(tint).multiplyScalar(light);
    for(const[v,uv]of[[a,[0,0]],[b,[1,0]],[c,[.5,1]]]){positions.push(v.x,v.y,v.z);colours.push(colour.r,colour.g,colour.b);uvs.push(...uv);}
  }
  function stem(points,radii){
    const rings=points.map((point,row)=>{
      const direction=points[Math.min(row+1,points.length-1)].clone().sub(points[Math.max(0,row-1)]).normalize();
      const side=new T.Vector3().crossVectors(direction,Math.abs(direction.y)>.92?new T.Vector3(1,0,0):UP).normalize(),forward=new T.Vector3().crossVectors(direction,side).normalize();
      return Array.from({length:5},(_,i)=>point.clone().addScaledVector(side,Math.cos(i*TAU/5)*radii[row]).addScaledVector(forward,Math.sin(i*TAU/5)*radii[row]));
    });
    for(let row=0;row<rings.length-1;row++)for(let side=0;side<5;side++){
      const next=(side+1)%5;triangle(rings[row][side],rings[row][next],rings[row+1][side],palettes.wood[row?1:0]);triangle(rings[row][next],rings[row+1][next],rings[row+1][side],palettes.wood[row?1:0]);
    }
    for(let side=1;side<4;side++){triangle(rings[0][0],rings[0][side+1],rings[0][side],palettes.wood[0]);const last=rings.at(-1);triangle(last[0],last[side],last[side+1],palettes.wood[1]);}
  }
  function leaf(base,tip,width,roll,tint){
    const along=tip.clone().sub(base),axis=along.clone().normalize();
    const side=new T.Vector3(-axis.z,.05,axis.x).normalize().applyAxisAngle(axis,roll);
    const normal=new T.Vector3().crossVectors(axis,side).normalize();if(normal.y<0)normal.negate();
    const point=(t,across,lift)=>base.clone().addScaledVector(along,t).addScaledVector(side,across*width).addScaledVector(normal,lift*width);
    // Unequal rounded shoulders, a curved central vein and a tapering tip.
    // The underside closes the leaf rather than exposing missing back faces.
    const rim=[point(0,0,0),point(.27,.83,.06),point(.67,.69,-.05),point(1,0,-.18),point(.70,-.58,-.09),point(.24,-.72,.03)];
    const ridge=point(.48,0,.21),under=point(.48,0,.155);
    for(let i=0;i<6;i++){
      const a=rim[i],b=rim[(i+1)%6],cross=new T.Vector3().crossVectors(b.clone().sub(a),ridge.clone().sub(a));
      if(cross.dot(normal)>0){triangle(a,b,ridge,tint,i<3?1.04:.94);triangle(b,a,under,tint,.75);}
      else{triangle(b,a,ridge,tint,i<3?1.04:.94);triangle(a,b,under,tint,.75);}
    }
  }
  function finish(name,bounds,metadata){
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new T.Vector3()),centre=geometry.boundingBox.getCenter(new T.Vector3());
    const sx=Math.min(1,(bounds[1][0]-bounds[0][0])/size.x),sy=(bounds[1][1]-bounds[0][1])/size.y,sz=Math.min(1,(bounds[1][2]-bounds[0][2])/size.z);
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setXYZ(i,(p.getX(i)-centre.x)*sx,(p.getY(i)-geometry.boundingBox.min.y)*sy+bounds[0][1],(p.getZ(i)-centre.z)*sz);
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.name=name;geometry.userData={assetSource:'src/field-botany.js',...metadata};return geometry;
  }
  return{stem,leaf,finish};
}

export function fieldShrubGeometry(compact=false){
  const kit=builder(),shoots=compact?3:6;let leaves=0;
  const heights=compact?[.94,.72,.61]:[1.46,1.13,1.29,.95,1.17,1.02];
  for(let shoot=0;shoot<shoots;shoot++){
    const angle=shoot*2.399963+[.2,-.17,.14][shoot%3],radial=new T.Vector3(Math.cos(angle),0,Math.sin(angle)),lateral=new T.Vector3(-radial.z,0,radial.x),height=heights[shoot];
    const reach=compact?.38+shoot*.035:.46+(shoot%3)*.13;
    const point=t=>radial.clone().multiplyScalar(reach*t*t).addScaledVector(lateral,Math.sin(t*Math.PI)*(.08+(shoot%2)*.06)).add(new T.Vector3(0,height*Math.sin(t*1.33),0));
    kit.stem([point(0),point(.36),point(.70),point(1)],[compact?.021:.029,compact?.015:.022,.012,.006]);
    const tiers=compact?2:3;
    for(let tier=0;tier<tiers;tier++)for(const side of[-1,1]){
      const t=(compact?.46:.37)+tier*(compact?.30:.245)+(side>0?.025:0),base=point(t);
      const length=(compact?.31:.40)*(1-tier*.12)*(side>0?.92:1);
      const tip=base.clone().addScaledVector(radial,length*(.42+t*.24)).addScaledVector(lateral,side*length*(.70-tier*.08));tip.y+=length*(.21-tier*.11);
      kit.leaf(base,tip,length*(compact?.32:.37),side*(.14+shoot*.07),palettes.leaf[(shoot+tier)%3]);leaves++;
    }
    const base=point(.93),tip=point(1).addScaledVector(radial,compact?.14:.19);tip.y+=compact?.07:.10;
    kit.leaf(base,tip,compact?.065:.085,-.12,palettes.leaf[2]);leaves++;
  }
  const bounds=compact?[[-.83,0,-.70],[.83,.96,.75]]:[[-1.10,-.80,-.93],[1.10,.91,.88]];
  return kit.finish(compact?'Rooted compound-leaf field shrub':'Arched woodland shrub with compound sprigs',bounds,{botanicalStems:shoots,botanicalLeaves:leaves,opaqueLeafVolumes:true});
}
