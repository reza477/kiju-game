import assert from 'node:assert/strict';
import * as T from '../../vendor/three.module.js';

// These measurements use indexed render triangles, not controller distances,
// invisible vertices, old source signatures or an abstract foot centre.
export function nativeVisibleTopology(mesh) {
  assert.ok(mesh?.isSkinnedMesh, 'Native contact belongs to a real SkinnedMesh');
  const geometry=mesh.geometry,index=geometry.index,position=geometry.attributes.position;
  assert.ok(index&&index.count>0&&index.count%3===0, 'Indexed native surface');
  const used=[...new Set(index.array)],bounds=new T.Box3(),point=new T.Vector3();
  for(const id of used){assert.ok(Number.isInteger(id)&&id>=0&&id<position.count);bounds.expandByPoint(point.fromBufferAttribute(position,id));}
  // UV seams may duplicate a position. Weld only at a numerical precision much
  // smaller than the 1mm physical test; this does not move any render vertex.
  const diagonal=bounds.getSize(new T.Vector3()).length(),weldTolerance=diagonal*1e-8;
  assert.ok(weldTolerance>0&&Number.isFinite(weldTolerance));
  const welded=new Map(),ids=new Map(),seams=new Map();
  for(const id of used){point.fromBufferAttribute(position,id);const key=point.toArray().map(v=>Math.round(v/weldTolerance)).join(',');let group=welded.get(key);if(group===undefined){group=welded.size;welded.set(key,group);seams.set(group,[]);}ids.set(id,group);seams.get(group).push(id);}
  const faces=index.count/3,parent=Int32Array.from({length:faces},(_,i)=>i),areas=new Float64Array(faces),edges=new Map(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
  const join=(x,y)=>{x=find(x);y=find(y);if(x!==y)parent[y]=x;};
  for(let face=0;face<faces;face++){
    const source=[0,1,2].map(k=>index.getX(face*3+k)),vertices=source.map(id=>ids.get(id));
    a.fromBufferAttribute(position,source[0]);b.fromBufferAttribute(position,source[1]);c.fromBufferAttribute(position,source[2]);areas[face]=new T.Triangle(a,b,c).getArea();
    assert.ok(Number.isFinite(areas[face])&&areas[face]>0,'Native triangle is nondegenerate: '+face);
    for(let k=0;k<3;k++){const x=vertices[k],y=vertices[(k+1)%3];assert.notEqual(x,y,'Native edge is nondegenerate: '+face);const key=x<y?x+','+y:y+','+x;if(edges.has(key))join(face,edges.get(key));else edges.set(key,face);}
  }
  const componentAreas=new Map();for(let face=0;face<faces;face++){const component=find(face);componentAreas.set(component,(componentAreas.get(component)||0)+areas[face]);}
  const mainComponent=[...componentAreas].sort((a,b)=>b[1]-a[1])[0][0];
  return {mesh,index,used,faces,weldTolerance,components:componentAreas.size,mainComponent,componentOf:find,seams:[...seams.values()].filter(ids=>ids.length>1)};
}

export function indexedSurfacePoint(mesh,surface,topology) {
  assert.ok(surface&&Number.isInteger(surface.triangle)&&surface.triangle>=0&&surface.triangle<mesh.geometry.index.count/3,'Contact names an existing indexed triangle');
  const weights=surface.barycentric;
  assert.ok(Array.isArray(weights)&&weights.length===3&&weights.every(v=>Number.isFinite(v)&&v>=-1e-8&&v<=1+1e-8),'Surface barycentrics lie on the actual face');
  assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-8,'Surface barycentrics sum to one');
  if(topology){assert.equal(topology.mesh,mesh);assert.equal(topology.componentOf(surface.triangle),topology.mainComponent,'Contact surface must be edge-connected to the main visible body, not an isolated witness');}
  for(let object=mesh;object;object=object.parent)assert.notEqual(object.visible,false,'Contact object is visible');
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const groups=mesh.geometry.groups.filter(group=>surface.triangle*3>=group.start&&surface.triangle*3+2<group.start+group.count);
  const relevant=groups.length?groups.map(group=>materials[group.materialIndex]):materials;
  assert.ok(relevant.length&&relevant.every(material=>material&&material.visible!==false&&material.opacity>0),'Contact triangle has a visible material');
  const point=new T.Vector3(),corner=new T.Vector3();
  for(let lane=0;lane<3;lane++){const id=mesh.geometry.index.getX(surface.triangle*3+lane);mesh.getVertexPosition(id,corner);point.addScaledVector(corner,weights[lane]);}
  return point.applyMatrix4(mesh.matrixWorld);
}

export function assertConnectedPawRegion(topology,faceIds,surfaces,label) {
  assert.ok(Array.isArray(faceIds)&&faceIds.length>1,label+' declares a surface region, not a solitary witness triangle');
  const unique=new Set(faceIds);assert.equal(unique.size,faceIds.length,label+' face IDs are unique');
  for(const face of faceIds){assert.ok(Number.isInteger(face)&&face>=0&&face<topology.faces,label+' region face exists');assert.equal(topology.componentOf(face),topology.mainComponent,label+' region connects to the main visible body');}
  for(const surface of surfaces)assert.ok(unique.has(surface.triangle),label+' contact lies in the declared paw surface');
}

export function createSurfacePlantVerifier(mesh,groundHeight,{contactTolerance=.001,slipTolerance=.001}={}) {
  const topology=nativeVisibleTopology(mesh),latched=new Map(),metrics={samples:0,plantedSamples:0,maxContactErrorMetres:0,maxWorldSlipMetres:0,stanceEntries:{},swingSamples:{}};
  return {topology,metrics,check(legs,label){
    assert.equal(legs.length,4,'Four native feet are observed');assert.equal(new Set(legs.map(leg=>leg.name)).size,4,'Native foot names are unique');
    for(const leg of legs){
      assert.equal(typeof leg.planted,'boolean',leg.name+' has an explicit stance state');
      const actual=indexedSurfacePoint(mesh,leg.contactSurface,topology),signature=JSON.stringify(leg.contactSurface);
      if(!leg.planted){latched.delete(leg.name);metrics.swingSamples[leg.name]=(metrics.swingSamples[leg.name]||0)+1;continue;}
      if(!latched.has(leg.name)){latched.set(leg.name,{point:actual.clone(),signature});metrics.stanceEntries[leg.name]=(metrics.stanceEntries[leg.name]||0)+1;}
      const plant=latched.get(leg.name);assert.equal(signature,plant.signature,leg.name+' changes its material surface witness within one locked stance at '+label);
      const slip=actual.distanceTo(plant.point),contact=Math.abs(actual.y-groundHeight(actual.x,actual.z));
      metrics.maxWorldSlipMetres=Math.max(metrics.maxWorldSlipMetres,slip);metrics.maxContactErrorMetres=Math.max(metrics.maxContactErrorMetres,contact);metrics.plantedSamples++;
      assert.ok(slip<=slipTolerance,leg.name+' visible stance witness slides '+slip+'m at '+label);
      assert.ok(contact<=contactTolerance,leg.name+' visible stance witness misses terrain by '+contact+'m at '+label);
      if(leg.target){assert.ok(Array.isArray(leg.target)&&leg.target.length===3&&leg.target.every(Number.isFinite));assert.ok(actual.distanceTo(new T.Vector3(...leg.target))<=contactTolerance,leg.name+' reported target is not the actual surface point at '+label);}
    }
    metrics.samples++;return {...metrics};
  }};
}

// Exact minimum of clearance along a triangle edge for the independent
// slope/wave terrain used by the native gait regression. At each fixed Z,
// clearance is affine in X/Y, so a triangle minimum lies on its boundary.
export const nativeTestGround=(x,z)=>.045*x+.025*z+.15*Math.sin(z*.15);
export function nativeGroundEdgeClearance(a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,clear=t=>{const x=a.x+t*dx,z=a.z+t*dz;return a.y+t*dy-nativeTestGround(x,z);};
  let minimum=Math.min(clear(0),clear(1));if(Math.abs(dz)<1e-12)return minimum;
  const ratio=(dy-.045*dx-.025*dz)/(.0225*dz);if(Math.abs(ratio)>1)return minimum;
  const angle=Math.acos(ratio),low=.15*Math.min(a.z,b.z),high=.15*Math.max(a.z,b.z);
  for(const sign of [-1,1])for(let cycle=Math.floor((low-sign*angle)/(2*Math.PI));cycle<=Math.ceil((high-sign*angle)/(2*Math.PI));cycle++){
    const t=(sign*angle+cycle*2*Math.PI-.15*a.z)/(.15*dz);if(t>0&&t<1)minimum=Math.min(minimum,clear(t));
  }
  return minimum;
}
