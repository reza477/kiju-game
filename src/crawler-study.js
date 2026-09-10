import * as T from '../vendor/three.module.js';
import {getMaterial, cylinder} from './materials.js';

// A bounded study of the original Commonwealth crawler's running gear. These
// authored forms sit inside its former casing and bearing envelope; the track
// links, terrain support samples and upper city remain owned by carriers.js.
const geometries=new Map();
function cached(key,create){
  if(!geometries.has(key)){const geometry=create();geometry.userData.shared=true;geometries.set(key,geometry);}
  return geometries.get(key);
}
function cast(geometry,material,parent,name){
  const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function extrude(shape,depth,bevel=.035){
  const geometry=new T.ExtrudeGeometry(shape,{depth:depth-bevel*2,steps:1,curveSegments:12,bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel});
  geometry.translate(0,0,-(depth-bevel*2)/2);
  // Ear-clipped curved caps can contain collinear triangles. Remove them before
  // their zero normals reach the HDR material's lighting calculations.
  const source=geometry.attributes,positions=[],normals=[],uvs=[];
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3();
  for(let i=0;i<source.position.count;i+=3){
    a.fromBufferAttribute(source.position,i);b.fromBufferAttribute(source.position,i+1);c.fromBufferAttribute(source.position,i+2);
    normal.subVectors(b,a).cross(c.sub(a));if(normal.lengthSq()<1e-14)continue;normal.normalize();
    for(let j=0;j<3;j++){
      const v=i+j;positions.push(source.position.getX(v),source.position.getY(v),source.position.getZ(v));
      const nx=source.normal.getX(v),ny=source.normal.getY(v),nz=source.normal.getZ(v);
      normals.push(...(nx*nx+ny*ny+nz*nz>1e-10?[nx,ny,nz]:normal.toArray()));uvs.push(source.uv.getX(v),source.uv.getY(v));
    }
  }
  const clean=new T.BufferGeometry();clean.setAttribute('position',new T.Float32BufferAttribute(positions,3));clean.setAttribute('normal',new T.Float32BufferAttribute(normals,3));clean.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.dispose();return clean;
}
function runningGearMaterials(){
  return {
    iron:getMaterial('metal',0x2c3e43,{roughness:.91,metalness:.25,clearcoat:0}),
    paint:getMaterial('metal',0x52676b,{roughness:.78,metalness:.34,clearcoat:.10}),
    steel:getMaterial('metal',0x84938d,{roughness:.65,metalness:.70,clearcoat:0}),
    brass:getMaterial('gold',0xa68d57,{roughness:.67,metalness:.65})
  };
}

export function createStandardCrawlerChassis(frame,side){
  const {iron}=runningGearMaterials();
  const geometry=cached('inset-capsule-chassis',()=>{
    // Longitudinal cast shoulders turn into rounded end housings instead of
    // extending square blocks beyond the moving sprockets. The lowest point is
    // above the original .85 m casing base, so it cannot add a contact surface.
    const shape=new T.Shape();shape.moveTo(-8.75,4.43);shape.lineTo(8.75,4.43);
    shape.bezierCurveTo(9.72,4.43,10.49,3.75,10.49,2.77);
    shape.bezierCurveTo(10.49,1.79,9.72,1.12,8.75,1.12);
    shape.lineTo(-8.75,1.12);shape.bezierCurveTo(-9.72,1.12,-10.49,1.79,-10.49,2.77);
    shape.bezierCurveTo(-10.49,3.75,-9.72,4.43,-8.75,4.43);
    return extrude(shape,2.60,.075);
  });
  const chassis=cast(geometry,iron,frame,'Recessed cast track chassis');
  chassis.rotation.y=Math.PI/2;chassis.position.x=side*8.95;
}

export function createStandardCrawlerWheel(wheel,side,z){
  const {iron,paint,steel,brass}=runningGearMaterials();
  // The bearing cylinder retains its original dimensions, centre and axle.
  // Only its visible face is recast: dark openings between substantial spokes,
  // an exposed steel running rim and a small bronze journal cap.
  cylinder(wheel,1.68,1.68,3.45,iron,0,0,0,36).rotation.z=Math.PI/2;
  cylinder(wheel,1.15,1.15,.055,iron,side*1.742,0,0,28).rotation.z=Math.PI/2;
  const rim=cached('machined-wheel-rim',()=>{
    const shape=new T.Shape();shape.absarc(0,0,1.30,0,Math.PI*2,false);
    const hole=new T.Path();hole.absarc(0,0,1.08,0,Math.PI*2,true);shape.holes.push(hole);
    return extrude(shape,.16,.025);
  });
  const ring=cast(rim,steel,wheel,'Machined running wheel rim');ring.rotation.y=Math.PI/2;ring.position.x=side*1.77;
  const spoke=cached('cast-wheel-spoke',()=>{
    const shape=new T.Shape([[.25,-.13],[.78,-.21],[1.10,-.12],[1.15,.08],[.88,.17],[.30,.15]].map(p=>new T.Vector2(...p)));
    return extrude(shape,.13,.025);
  });
  for(let i=0;i<6;i++){
    const mesh=cast(spoke,paint,wheel,'Broad cast wheel spoke');
    mesh.rotation.set(0,Math.PI/2,0);mesh.rotateZ(i*Math.PI/3);mesh.position.x=side*1.785;
  }
  // End wheels have a lobed drive flange, contained well inside the unchanged
  // tyre. Their outline reads as powered sprockets at normal gameplay zoom.
  if(Math.abs(z)===9){
    const gear=cached('drive-sprocket-flange',()=>{
      const shape=new T.Shape();
      for(let i=0;i<48;i++){
        const a=i/48*Math.PI*2,r=i%4===0||i%4===3?1.32:1.48;
        const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
      }
      shape.closePath();const hole=new T.Path();hole.absarc(0,0,1.31,0,Math.PI*2,true);shape.holes.push(hole);
      return extrude(shape,.10,.008);
    });
    const drive=cast(gear,paint,wheel,'Twelve-tooth drive flange');drive.rotation.y=Math.PI/2;drive.position.x=side*1.75;
  }
  cylinder(wheel,.49,.49,.10,paint,side*1.84,0,0,20).rotation.z=Math.PI/2;
  cylinder(wheel,.30,.39,.20,brass,side*1.91,0,0,16).rotation.z=side*Math.PI/2;
}
