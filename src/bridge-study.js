import * as T from '../vendor/three.module.js';
import {getMaterial, batchStatic} from './materials.js';
import {riverX, riverWidth, roadZ, renderedTerrainHeight} from './terrain.js';

// A local replacement for the two existing highway abutments. No world random
// stream, terrain, navigation, destruction registry or resource sites change.
export function bridgePrismGeometry(outline, lower, upper, project=(u,v)=>[u,v]) {
  const contour=outline.map(([u,v])=>new T.Vector2(u,v));
  if(T.ShapeUtils.isClockWise(contour))contour.reverse();
  const ring=contour.map(p=>{const[x,z]=project(p.x,p.y);return{x,z,lo:lower(x,z),hi:upper(p.x,p.y)};});
  const positions=[];
  const point=(i,top)=>{const p=ring[i];return[p.x,top?p.hi:p.lo,p.z];};
  const triangle=(a,b,c)=>positions.push(...a,...b,...c);
  for(const[a,b,c]of T.ShapeUtils.triangulateShape(contour,[])){
    triangle(point(c,true),point(b,true),point(a,true));
    triangle(point(a,false),point(b,false),point(c,false));
  }
  for(let a=0;a<ring.length;a++){
    const b=(a+1)%ring.length;
    triangle(point(a,false),point(a,true),point(b,true));
    triangle(point(a,false),point(b,true),point(b,false));
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  geometry.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));
  return geometry;
}

export function createBridgeAbutments(parent) {
  const group=new T.Group();group.name='Fractured highway bridge abutments';parent.add(group);
  const body=getMaterial('stone',0x979887,{roughness:1});
  const cap=getMaterial('stone',0xb3ad96,{roughness:.94});
  const seams=getMaterial('stone',0x727669,{roughness:1});
  const z=roadZ(riverX(140)),centre=riverX(z);
  for(const side of[-1,1]){
    const x=centre+side*(riverWidth(z)+4);
    // Local u points from the approach toward the broken river edge. Mirroring
    // only the coordinates would invert normals, so use a proper rotation.
    const project=(u,v)=>[x-side*u,z-side*v];
    const add=(name,outline,lower,upper,material)=>{
      const mesh=new T.Mesh(bridgePrismGeometry(outline,lower,upper,project),material);
      mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
    };
    const foundation=[[-2.92,-4.78],[-2.52,-5.04],[1.45,-5.04],[2.48,-4.18],[1.70,-2.75],[2.7,-1.22],[1.9,.48],[2.55,1.85],[1.35,3.1],[2.12,4.65],[-2.5,5.02],[-2.92,4.58]];
    add('Grounded broken masonry foundation',foundation,(wx,wz)=>renderedTerrainHeight(wx,wz)-.10,()=>.43,body);
    add('Recessed mortar below coping',foundation,()=>.43,()=>.51,seams);
    // Separate heavy slabs produce readable fracture gaps, not a noise decal.
    const slabs=[
      [[-3,-5.14],[1.50,-5.14],[2.52,-4.18],[1.75,-2.75],[2.15,-1.80],[-3,-1.88]],
      [[-3,-1.81],[2.19,-1.73],[2.73,-1.2],[1.94,.48],[2.43,1.65],[-3,1.57]],
      [[-3,1.64],[2.45,1.73],[2.61,1.85],[1.4,3.1],[2.16,4.68],[-2.52,5.14],[-3,4.64]]
    ];
    slabs.forEach((outline,i)=>add('Split approach coping',outline,()=>.51,()=>.84-i*.018,cap));
    for(const v of[-4.65,4.65]){
      const lengths=[[-2.8,-1.44,1.76],[-1.38,-.05,1.73],[.01,1.02,1.51],[1.08,1.65,1.17]];
      for(const[a,b,top]of lengths){
        const w=.25;
        add('Broken parapet ashlar',[[a,v-w],[b-.09,v-w],[b,v+w-.07],[b-.13,v+w],[a,v+w]],()=>v<0?.84:.804,()=>top,body);
        if(top>1.4)add('Worn parapet coping',[[a-.02,v-w-.04],[b-.08,v-w-.04],[b+.01,v+w-.08],[b-.12,v+w+.04],[a-.02,v+w+.04]],()=>top,()=>top+.04,cap);
      }
    }
    // Two fallen coping fragments lie on supported approach slabs, entirely
    // inside the former bridge footprint and outside the open river channel.
    add('Fallen coping fragment',[[-2.2,-3.8],[-.9,-3.67],[-.7,-3.08],[-1.05,-2.8],[-2.3,-3.0]],()=>.84,(u,v)=>1.14+(u+2)*.07,cap);
    add('Broken parapet fragment',[[-1.2,2.9],[-.24,3.04],[-.11,3.61],[-.81,3.72],[-1.39,3.4]],()=>.804,(u,v)=>1.06+(v-3)*.12,body);
  }
  // Three material draws replace the old eight boxes. The hard planes catch
  // the existing sunlight and cast real shadows without another effect pass.
  batchStatic(group);
  return group;
}
