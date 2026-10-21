import * as T from '../../vendor/three.module.js';
import {SADDLE_MOUNTS} from '../../src/saddle-layout.js';

function clip(poly, axis, value, sign) {
  const output=[];
  for(let j=0;j<poly.length;j++) {
    const a=poly[j],b=poly[(j+1)%poly.length],da=sign*(a[axis]-value),db=sign*(b[axis]-value);
    if(da<=0)output.push(a);
    if((da<0)!==(db<0)){const t=da/(da-db);output.push(a.map((v,k)=>v+(b[k]-v)*t));}
  }
  return output;
}
export function intersectsSaddleSlab(triangle, deck, half, low, high) {
  let poly=triangle.map(p=>[deck.co*(p[0]-deck.x)-deck.si*(p[2]-deck.z),p[1]-deck.absoluteY,deck.si*(p[0]-deck.x)+deck.co*(p[2]-deck.z)]);
  for(const [axis,value,sign] of [[0,half[0],1],[0,-half[0],-1],[1,high,1],[1,low,-1],[2,half[1],1],[2,-half[1],-1]]) {
    poly=clip(poly,axis,value,sign);if(!poly.length)return false;
  }
  if(poly.length<3)return false;
  const a=new T.Vector3(...poly[0]),b=new T.Vector3(),c=new T.Vector3();let area=0;
  for(let i=1;i<poly.length-1;i++)area+=b.set(...poly[i]).sub(a).cross(c.set(...poly[i+1]).sub(a)).length();
  return area>1e-8;
}
export function saddleSlabCollisions(vertices, indices, margin=0) {
  // Exact unchanged walking slabs: iron3.46 x.14 x3.8 at y-.05 and
  // paving3.42 x.10 x3.76 at y+.04, transformed by each production mount.
  const decks=SADDLE_MOUNTS.map((d,tier)=>({...d,tier,co:Math.cos(d.rotation),si:Math.sin(d.rotation)})),counts=Array(20).fill(0);
  for(let i=0;i<indices.length;i+=3) {
    const p=[vertices[indices[i]],vertices[indices[i+1]],vertices[indices[i+2]]],min=[0,1,2].map(k=>Math.min(p[0][k],p[1][k],p[2][k])),max=[0,1,2].map(k=>Math.max(p[0][k],p[1][k],p[2][k]));
    for(const d of decks) {
      const hx=Math.abs(d.co)*(1.73+margin)+Math.abs(d.si)*(1.9+margin),hz=Math.abs(d.si)*(1.73+margin)+Math.abs(d.co)*(1.9+margin);
      // Broad-phase rejection only; actual triangle/polyhedron clipping also
      // detects edge crossings without a vertex inside the slab.
      if(min[0]>d.x+hx||max[0]<d.x-hx||min[2]>d.z+hz||max[2]<d.z-hz||min[1]>d.absoluteY+.09+margin||max[1]<d.absoluteY-.12-margin)continue;
      if(intersectsSaddleSlab(p,d,[1.73+margin,1.9+margin],-.12-margin,.02+margin)||intersectsSaddleSlab(p,d,[1.71+margin,1.88+margin],-.01-margin,.09+margin))counts[d.tier]++;
    }
  }
  return counts;
}
export function visibleSkinVerticesInRig(mesh,rig) {
  const inverse=rig.matrixWorld.clone().invert(),point=new T.Vector3(),vertices=Array(mesh.geometry.attributes.position.count);
  for(const id of new Set(mesh.geometry.index.array)){
    mesh.getVertexPosition(id,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);vertices[id]=point.toArray();
  }
  return vertices;
}
