// Full city.foundation coverage, extracted from the recorded foundation audit.
// Categories describe witnesses only: every actual mesh and triangle is tested.
import assert from 'node:assert/strict';
import * as T from '../../vendor/three.module.js';
import {SADDLE_MOUNTS} from '../../src/saddle-layout.js';
import {posedVisibleSurface,triangleDistanceSq} from '../beast-integration-geometry.mjs';
import {surface,meshes,componentSeeds} from './frame-clearance.mjs';
import {saddleSlabCollisions} from './saddle-slab-clearance.mjs';

function category(point,material,inFrame=false){if(inFrame)return{kind:'occupied-joist',nearestTier:null};let nearest,best=Infinity,local;
 for(const[d,tier]of SADDLE_MOUNTS.map((d,i)=>[d,i])){const co=Math.cos(d.rotation),si=Math.sin(d.rotation),x=co*(point.x-d.x)-si*(point.z-d.z),y=point.y-d.absoluteY,z=si*(point.x-d.x)+co*(point.z-d.z),score=(x/1.8)**2+(y/2)**2+(z/2)**2;if(score<best){best=score;nearest=tier;local={x,y,z};}}
 let kind=material.startsWith('wood ')?'tapered-wood-bottom':material.startsWith('pavement ')?'walking-paving':material.startsWith('fabric ')?'cloth-or-leather-detail':material.startsWith('gold ')?'brass-detail':'iron-deck-rail-detail';
 if(material.startsWith('metal ')&&local.y<-.25&&Math.abs(Math.abs(local.x)-1.1)<.09)kind='underdeck-U-strap';
 return{kind,nearestTier:nearest,centroidInNearestMount:local};
}
export function captureFoundation(c){c.root.updateMatrixWorld(true);const list=meshes(c.foundation);for(const e of list){e.name=e.object.material.name;let p=e.object.parent,inFrame=false;while(p&&p!==c.foundation){inFrame||=p.name==='Occupied pannier load frame';p=p.parent;}e.meta={inFrame};}
 const actual=surface(list,c.rig.matrixWorld);for(let i=0;i<actual.faces.length;i++){const p=[0,1,2].map(k=>actual.vertices[actual.indices[i*3+k]]),centroid=p[0].clone().add(p[1]).add(p[2]).multiplyScalar(1/3);Object.assign(actual.faces[i],category(centroid,actual.faces[i].name,actual.faces[i].inFrame));}
 actual.seeds=componentSeeds(actual);actual.relativeMatrix=c.rig.matrixWorld.clone().invert().multiply(c.foundation.matrixWorld);actual.box=new T.Box3().setFromPoints(actual.vertices);return actual;
}
function bodyWeight(mesh,offset){if(!mesh)return{};const sum={};for(let k=0;k<3;k++){const id=mesh.geometry.index.array[offset+k];for(let j=0;j<4;j++){const w=mesh.geometry.attributes.skinWeight.array[id*4+j];if(w>0){const name=mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.array[id*4+j]].name;sum[name]=(sum[name]??0)+w/3;}}}return sum;}
export function compareFoundation(actual,skin,mesh){const epsilon=.04,limitSq=epsilon*epsilon,result={actualPairs:0,marginOnlyPairs:0,nearTriangleComparisons:0,categories:{},examples:[]},skinMin=[Infinity,Infinity,Infinity],skinMax=[-Infinity,-Infinity,-Infinity];for(const b of skin.bounds)for(let k=0;k<3;k++){skinMin[k]=Math.min(skinMin[k],b.min[k]);skinMax[k]=Math.max(skinMax[k],b.max[k]);}
 const categoriesRecorded=new Set();
 for(let offset=0;offset<actual.indices.length;offset+=3){const bounds=actual.bounds[offset/3];if([0,1,2].some(k=>bounds.min[k]>skinMax[k]+epsilon||bounds.max[k]<skinMin[k]-epsilon))continue;const near=new Set();for(let x=Math.floor(bounds.min[0]-epsilon);x<=Math.floor(bounds.max[0]+epsilon);x++)for(let y=Math.floor(bounds.min[1]-epsilon);y<=Math.floor(bounds.max[1]+epsilon);y++)for(let z=Math.floor(bounds.min[2]-epsilon);z<=Math.floor(bounds.max[2]+epsilon);z++)for(const id of skin.grid.get(x+','+y+','+z)||[])near.add(id);
  const p=[0,1,2].map(k=>actual.vertices[actual.indices[offset+k]]),meta=actual.faces[offset/3];for(const other of near){const b=skin.bounds[other/3];let separation=0;for(let k=0;k<3;k++)separation+=Math.max(0,b.min[k]-bounds.max[k],bounds.min[k]-b.max[k])**2;if(separation>limitSq)continue;const q=[0,1,2].map(k=>skin.vertices[skin.indices[other+k]]),sq=triangleDistanceSq(p,q);result.nearTriangleComparisons++;if(sq>limitSq)continue;
   const isActual=sq<=1e-14,key=meta.kind+':'+meta.nearestTier;result[isActual?'actualPairs':'marginOnlyPairs']++;result.categories[key]??={kind:meta.kind,nearestTier:meta.nearestTier,actualPairs:0,marginOnlyPairs:0};result.categories[key][isActual?'actualPairs':'marginOnlyPairs']++;
   const categoryKey=key+':'+isActual;if(result.examples.length<12||!categoriesRecorded.has(categoryKey)){result.examples.push({actualContact:isActual,distanceRig:Math.sqrt(sq),foundationFace:offset/3,foundationMeta:meta,skinFace:other/3,foundationTriangleRig:p.map(v=>v.toArray()),skinTriangleRig:q.map(v=>v.toArray()),skinMeanWeights:bodyWeight(mesh,other)});categoriesRecorded.add(categoryKey);}
  }
 }
 result.containedComponentSeeds=[];const ray=new T.Ray(),point=new T.Vector3();for(const[index,vertex]of actual.seeds.entries()){const seed=vertex.clone().add(new T.Vector3(0,1.234e-5,7.891e-6));if([0,1,2].some(k=>seed.getComponent(k)<skinMin[k]||seed.getComponent(k)>skinMax[k]))continue;const near=new Set();for(let x=Math.floor(seed.x);x<=Math.ceil(skinMax[0]);x++)for(const id of skin.grid.get(x+','+Math.floor(seed.y)+','+Math.floor(seed.z))||[])near.add(id);ray.set(seed,new T.Vector3(1,0,0));const hits=[];for(const offset of near){const tri=[0,1,2].map(k=>skin.vertices[skin.indices[offset+k]]);if(ray.intersectTriangle(...tri,false,point))hits.push(point.x);}hits.sort((a,b)=>a-b);const unique=hits.filter((v,i)=>i===0||Math.abs(v-hits[i-1])>1e-6);if(unique.length%2)result.containedComponentSeeds.push({component:index,seedRig:seed.toArray(),rayUniqueCrossings:unique.length});}
 return result;
}
export function inspectFoundation(city,captured,label){
  city.root.updateMatrixWorld(true);
  const relative=city.rig.matrixWorld.clone().invert().multiply(city.foundation.matrixWorld);
  assert.ok(Math.max(...relative.elements.map((v,i)=>Math.abs(v-captured.relativeMatrix.elements[i])))<1e-10,'Foundation moved relative to rig');
  // Rebuild the rendered surface at each selected pose. A child moving or a
  // geometry replacement must not evade this check through a cached snapshot.
  const actual=captureFoundation(city),mesh=city.meshyCarrier.renderMeshes[0];
  const skin=posedVisibleSurface(mesh,city.rig),contacts=compareFoundation(actual,skin,mesh);
  const slab=saddleSlabCollisions(skin.vertices.map(v=>v?.toArray()),skin.indices,.12);
  return {label,triangles:actual.indices.length/3,
    slabMarginContacts:slab.flatMap((n,tier)=>n?[{tier,triangles:n}]:[]),...contacts};
}

export function hasFoundationFailure(result){
  return result.slabMarginContacts.length>0||result.actualPairs>0||result.marginOnlyPairs>0||result.containedComponentSeeds.length>0;
}
