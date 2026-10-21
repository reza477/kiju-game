import * as T from '../vendor/three.module.js';
import {CYBORG_CONTACT_HULLS} from './cyborg-contact-hulls.js';

// Reauthor the visible machine around the inspected bind skeleton. The sole
// and terminal hand surfaces retain their exact original positions and weights
// because the existing locomotion and strike solvers sample those surfaces.
export function buildFoundryCyborg(mesh) {
  const source = mesh.geometry, bones = mesh.skeleton.bones;
  const names = new Map(bones.map((b, i) => [b.name, i]));
  const joint = name => {
    const index = names.get('mixamorig' + name);
    if (index === undefined) throw new Error('Foundry body lacks inspected joint ' + name);
    return index;
  };
  for (const name of ['Hips','Spine','Spine1','Spine2','Neck','Head','LeftArm','RightArm','LeftLeg','RightLeg']) joint(name);
  mesh.updateWorldMatrix(true, false);
  const toMesh = mesh.matrixWorld.clone().invert();
  const at = name => bones[joint(name)].getWorldPosition(new T.Vector3()).applyMatrix4(toMesh);
  let position = [], normal = [], color = [], uv = [], skinIndex = [], skinWeight = [];
  const parts=[];
  const palette = Object.fromEntries(Object.entries({armor:0x586d62, ivory:0xb3b39a, iron:0x34494b, dark:0x243033, brass:0x9d8053, amber:0xe8bd65}).map(([k,v])=>[k,new T.Color(v)]));
  const add = (geometry, centre, rotation, boneName, paint, secondBone = null, role = null) => {
    if (rotation) geometry.applyQuaternion(rotation);
    geometry.translate(centre.x, centre.y, centre.z);
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    const p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
    let volume=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i).sub(centre);b.fromBufferAttribute(p,i+1).sub(centre);c.fromBufferAttribute(p,i+2).sub(centre);volume+=a.dot(b.cross(c))/6;}
    parts.push({bone:boneName,firstVertex:position.length/3,vertices:p.count,volume,role});
    const boneIndex = joint(boneName), other = secondBone ? joint(secondBone) : boneIndex;
    for (let i=0;i<p.count;i++) {
      position.push(p.getX(i),p.getY(i),p.getZ(i));
      normal.push(n.getX(i),n.getY(i),n.getZ(i));
      // Broad bevel highlights are geometrical, with a restrained upper-face
      // paint variation. There is no unrelated imported albedo on new plates.
      const value = .91 + Math.max(0,n.getY(i))*.12;
      const c = palette[paint]; color.push(c.r*value,c.g*value,c.b*value);
      uv.push(t?.getX(i)??0,t?.getY(i)??0);
      const blend = secondBone ? T.MathUtils.clamp(t?.getX(i)??0,0,1) : 0;
      skinIndex.push(boneIndex,other,0,0);skinWeight.push(1-blend,blend,0,0);
    }
    if (g!==geometry) g.dispose(); geometry.dispose();
  };
  const plate = (name, centre, w,h,d,paint='armor', rotation=null) => {
    const bevel=Math.min(w,h,d)*.12, x=w/2-bevel, y=h/2-bevel;
    const shape = new T.Shape([[-x+bevel,-y],[x-bevel,-y],[x,-y+bevel],[x,y-bevel],[x-bevel,y],[-x+bevel,y],[-x,y-bevel],[-x,-y+bevel]].map(p=>new T.Vector2(...p)));
    const g=new T.ExtrudeGeometry(shape,{depth:d-bevel*2,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:1});
    g.translate(0,0,-(d-bevel*2)/2); add(g,centre,rotation,name,paint);
  };
  const ball=(name,centre,r,paint='dark',role=null)=>add(new T.SphereGeometry(r,16,10),centre,null,name,paint,null,role);
  const casing=(name,centre,w,h,d,paint='armor',rotation=null,role=null)=>{
    // Rounded, tapered castings have a waist, broad shoulder and rolled ends.
    // The cross-section is a squarish oval; it is not a dressed-up box face.
    const rings=[[-.5,.62],[-.45,.91],[-.27,1], [.22,1.04],[.43,.91],[.5,.64]],segments=24,p=[],indices=[];
    for(const[y,r]of rings)for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      p.push(Math.sign(c)*Math.abs(c)**.72*w*.5*r,y*h,Math.sign(s)*Math.abs(s)**.72*d*.5*r);
    }
    for(let row=0;row<rings.length-1;row++)for(let i=0;i<segments;i++){
      const a=row*segments+i,b=row*segments+(i+1)%segments;indices.push(a,a+segments,b,b,a+segments,b+segments);
    }
    for(let i=1;i<segments-1;i++){indices.push(0,i,i+1);const e=(rings.length-1)*segments;indices.push(e,e+i+1,e+i);}
    const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(p,3)).setIndex(indices);g.computeVertexNormals();
    add(g,centre,rotation,name,paint,null,role);
  };
  const cylinder=(name,a,b,r,paint='iron',r2=r,role=null)=>{
    const delta=b.clone().sub(a), q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
    add(new T.CylinderGeometry(r2,r,delta.length(),16,1),a.clone().lerp(b,.5),q,name,paint,null,role);
  };
  const bearing=(name,centre,r)=>{
    ball(name,centre,r*.77,'dark');
    add(new T.TorusGeometry(r*.76,r*.14,6,20),centre,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2),name,'brass');
  };
  const limb=(name,end,w,d,paint,role=null)=>{
    const a=at(name),b=at(end),delta=b.clone().sub(a);
    casing(name,a.clone().lerp(b,.49),w,delta.length()*.77,d,paint,new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),delta.normalize()),role);
  };
  const offset=(v,x,y,z)=>v.clone().add(new T.Vector3(x,y,z));
  const torso=at('Spine1'),hip=at('Hips'),head=at('Head');
  casing('Hips',offset(hip,0,-.02,0),.34,.19,.23,'iron');
  plate('Hips',offset(hip,0,-.047,.126),.19,.12,.035,'ivory');
  for(let i=0;i<3;i++){
    const centre=at('Spine').lerp(torso,i/2);
    cylinder(i===2?'Spine1':'Spine',offset(centre,0,-.018,0),offset(centre,0,.018,0),.109,'dark');
    plate(i===2?'Spine1':'Spine',offset(centre,0,0,.105),.205,.022,.028,'brass');
  }
  casing('Spine1',offset(torso,0,.046,-.008),.425,.29,.30,'armor');
  plate('Spine2',offset(at('Spine2'),0,.014,.144),.35,.086,.035,'ivory');
  plate('Spine1',offset(torso,0,.005,.148),.28,.105,.03,'iron');
  for(const side of[-1,1]){
    plate('Spine1',offset(torso,side*.108,.047,.173),.135,.023,.024,'brass',new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),side*.26));
    for(let i=0;i<4;i++)plate('Spine1',offset(torso,side*(.055+i*.021),-.02,.166),.008,.052,.013,'dark');
  }
  cylinder('Neck',at('Neck'),offset(head,0,.024,0),.06,'brass');
  casing('Head',offset(head,0,.076,.015),.195,.208,.226,'ivory');
  plate('Head',offset(head,0,.093,.137),.152,.036,.025,'dark');
  for(const side of[-1,1]){
    plate('Head',offset(head,side*.043,.095,.153),.039,.01,.01,'amber');
    cylinder('Head',offset(head,side*.104,.01,-.017),offset(head,side*.104,.10,-.017),.024,'iron');
  }
  plate('Head',offset(head,0,.012,.129),.112,.054,.029,'iron');
  for(let i=0;i<3;i++)plate('Head',offset(head,(i-1)*.045,.165-i*.003,-.006),.014,.024,.172,'brass');
  // A recessed rear radiator gives the broad helmet a readable working side.
  // Four rolled louvers share one frame, within the existing body envelope.
  plate('Head',offset(head,0,.078,-.106),.128,.092,.012,'iron');
  for(let i=0;i<4;i++)plate('Head',offset(head,0,.052+i*.018,-.116),.106,.006,.021,'ivory',
    new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.28));
  for(const side of['Left','Right']){
    const sign=side==='Left'?1:-1;
    bearing(side+'Shoulder',at(side+'Arm'),.111);
    // Cast shells stay inside the original walking-width envelope; the rig,
    // terminal contacts and body fitting retain their original dimensions.
    casing(side+'Shoulder',offset(at(side+'Arm'),sign*.024,.035,-.012),.235,.18,.276,'ivory');
    casing(side+'Shoulder',offset(at(side+'Arm'),sign*.024,.092,-.012),.227,.025,.25,'brass');
    limb(side+'Arm',side+'ForeArm',.14,.16,'iron');
    bearing(side+'ForeArm',at(side+'ForeArm'),.077);
    limb(side+'ForeArm',side+'Hand',.17,.173,'armor',side+' forearm casting');
    const a=at(side+'ForeArm'),b=at(side+'Hand');
    // The forearm shell ends before the hand pivot. A fixed forearm sleeve
    // overlaps that shell and ends at the shared wrist centre; the hand-owned
    // ball turns inside it. Both centres remain coincident under wrist IK.
    const wristAxis=b.clone().sub(a).normalize();
    cylinder(side+'ForeArm',a.clone().lerp(b,.78),b,.051,'iron',.055,side+' wrist sleeve');
    cylinder(side+'ForeArm',a.clone().lerp(b,.80),a.clone().lerp(b,.91),.064,'armor');
    ball(side+'Hand',b,.056,'dark',side+' wrist bearing');
    add(new T.TorusGeometry(.055,.006,6,20),b.clone().addScaledVector(wristAxis,-.014),
      new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),wristAxis),side+'ForeArm','brass');
    cylinder(side+'ForeArm',offset(a,-sign*.044,-.025,.065),offset(b,-sign*.044,.045,.065),.017,'brass');
    bearing(side+'UpLeg',at(side+'UpLeg'),.094);
    limb(side+'UpLeg',side+'Leg',.172,.205,'armor');
    bearing(side+'Leg',at(side+'Leg'),.089);
    plate(side+'Leg',offset(at(side+'Leg'),0,.004,.08),.17,.13,.065,'ivory');
    limb(side+'Leg',side+'Foot',.15,.177,'iron');
    const shin=at(side+'Leg').lerp(at(side+'Foot'),.37);
    plate(side+'Leg',offset(shin,0,0,.086),.124,.208,.052,'armor',new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),at(side+'Foot').sub(at(side+'Leg')).normalize()));
  }
  const authoredVertices=position.length/3;
  const p=source.attributes.position,n=source.attributes.normal,s=source.attributes.skinIndex,w=source.attributes.skinWeight,t=source.attributes.uv;
  source.computeBoundingBox();
  const copy=a=>Array.from({length:p.count*a.itemSize},(_,i)=>a.getComponent(Math.floor(i/a.itemSize),i%a.itemSize));
  // Original skin is an unrendered contact pool. The visible hulls use exact
  // original vertices, while new armor never changes solver sampling.
  position=copy(p).concat(position);normal=copy(n).concat(normal);
  skinIndex=copy(s).concat(skinIndex);skinWeight=copy(w).concat(skinWeight);
  uv=(t?copy(t):Array(p.count*2).fill(0)).concat(uv);
  const iron=palette.iron;
  color=Array.from({length:p.count*3},(_,i)=>[iron.r,iron.g,iron.b][i%3]).concat(color);
  const indices=Array.from({length:authoredVertices},(_,i)=>p.count+i);
  let retainedTriangles=0;
  for(const [name,hull]of Object.entries(CYBORG_CONTACT_HULLS)){
    const offset=position.length/3,local=new Map(hull.vertexIndices.map((id,i)=>[id,i]));
    const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(hull.positions.flat(),3)).setIndex(hull.triangleIndices.map(id=>local.get(id)));g.computeVertexNormals();
    for(const [v,id]of hull.vertexIndices.entries()){
      for(let axis=0;axis<3;axis++)if(p.getComponent(id,axis)!==hull.positions[v][axis])throw new Error('Cyborg contact hull does not match inspected source');
      position.push(p.getX(id),p.getY(id),p.getZ(id));normal.push(g.attributes.normal.getX(v),g.attributes.normal.getY(v),g.attributes.normal.getZ(v));
      const c=palette[name.includes('Boot')?'armor':'iron'];color.push(c.r,c.g,c.b);uv.push(t?.getX(id)??0,t?.getY(id)??0);
      for(let k=0;k<4;k++){skinIndex.push(s.getComponent(id,k));skinWeight.push(w.getComponent(id,k));}
    }
    indices.push(...hull.triangleIndices.map(id=>offset+local.get(id)));retainedTriangles+=hull.triangleIndices.length/3;g.dispose();
  }
  const geometry=new T.BufferGeometry();
  for(const [name,data,size]of[['position',position,3],['normal',normal,3],['color',color,3],['uv',uv,2],['skinWeight',skinWeight,4]])geometry.setAttribute(name,new T.Float32BufferAttribute(data,size));
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData.sourceContactVertices=p.count;
  geometry.userData.sourceContactBounds={min:source.boundingBox.min.toArray(),max:source.boundingBox.max.toArray()};
  geometry.userData.foundryCyborg={authoredVertices,retainedTriangles,sourceTriangles:(source.index?.count??p.count)/3,parts:parts.map(part=>({...part,firstVertex:part.firstVertex+p.count}))};
  return geometry;
}
