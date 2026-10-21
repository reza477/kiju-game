import * as T from '../vendor/three.module.js';
import {getMaterial,box} from './materials.js';


import {traceContour,connectedStrip,createSupportingRing,createContourDepth} from './harness-envelope.js';

// These are load-bearing belts on the animal, independent of district IDs.
// The surface is sampled only when fitted; each frame evaluates those same
// skinned triangles, so bending and breathing cannot leave a static girdle.
export const GIRDLE_SECTIONS=128;
export const GIRDLE_WIDTH_SAMPLES=3;
export const GIRDLE_WIDTH=.48;
export const GIRDLE_CLEARANCE=.19;
export const GIRDLE_THICKNESS=.16;
export const GIRDLE_STATIONS=Object.freeze([
  Object.freeze({intercept:29.2,slope:.4,z:-9,rear:false}),
  Object.freeze({intercept:35,slope:.8,z:-16,rear:true})
]);

function beltGeometry(){
  const count=GIRDLE_SECTIONS,tracks=GIRDLE_WIDTH_SAMPLES,stride=tracks*2,positions=new Float32Array(count*stride*3),uv=[],indices=[];
  for(let i=0;i<count;i++)for(let layer=0;layer<2;layer++)for(let edge=0;edge<tracks;edge++)uv.push(i/count*14,edge/(tracks-1));
  const quad=(a,b,c,d)=>indices.push(a,b,d,b,c,d);
  for(let i=0;i<count;i++){
    const a=i*stride,b=((i+1)%count)*stride;
    for(let edge=0;edge<tracks-1;edge++){
      quad(a+edge,a+edge+1,b+edge+1,b+edge);
      quad(a+tracks+edge,b+tracks+edge,b+tracks+edge+1,a+tracks+edge+1);
    }
    quad(a,b,b+tracks,a+tracks);
    quad(a+tracks-1,a+stride-1,b+stride-1,b+tracks-1);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  return geometry;
}

export function createFleshHarness(rig,meshes){
  const group=new T.Group();group.name='Skin-following saddle harness';group.userData.noBatch=true;rig.add(group);
  const leather=getMaterial('fabric',0x504134),edgeMaterial=getMaterial('gold',0x8d7856),iron=getMaterial('metal',0x454a45);
  const inverse=new T.Matrix4(),basis=new T.Matrix4(),relative=new T.Vector3();
  const point=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),normal=new T.Vector3(),tangent=new T.Vector3(),along=new T.Vector3();
  const center=new T.Vector3(),prior=new T.Vector3(),next=new T.Vector3(),expectedNormal=new T.Vector3();
  const vectors=count=>Array.from({length:count},()=>new T.Vector3());
  const vertexCaches=new Map();
  let fitted=false,rearLoaded=false;
  const bands=GIRDLE_STATIONS.map((station,index)=>{
    const mesh=new T.Mesh(beltGeometry(),leather);mesh.name=index?'Rear closed hip harness':'Front closed breast harness';
    Object.assign(mesh.userData,{noBatch:true,saddleGirdle:true,deformingImpactSurface:true,sections:GIRDLE_SECTIONS,widthSamples:GIRDLE_WIDTH_SAMPLES,width:GIRDLE_WIDTH,clearance:GIRDLE_CLEARANCE,thickness:GIRDLE_THICKNESS});
    mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;group.add(mesh);
    const buckles=[0,GIRDLE_SECTIONS/2].map(section=>{
      const buckle=new T.Group();buckle.name='Cast brass harness buckle';buckle.userData.noBatch=true;group.add(buckle);
      for(const side of[-1,1]){
        box(buckle,.12,.10,.69,edgeMaterial,.03,side*.38,0);
        box(buckle,.12,.76,.10,edgeMaterial,.03,0,side*.295);
      }
      box(buckle,.14,.58,.055,iron,.11,0,0);
      for(const side of[-1,1])box(buckle,.10,.08,.08,edgeMaterial,.10,side*.50,0);
      return{section,object:buckle};
    });
    return{...station,mesh,buckles,anchors:[],points:[],contours:[],strip:null,
      origin:new T.Vector3(0,station.intercept+station.slope*station.z,station.z),
      u:new T.Vector3(1,0,0),v:new T.Vector3(0,station.slope,1).normalize(),w:new T.Vector3(0,-1,station.slope).normalize(),
      envelope:createSupportingRing(GIRDLE_SECTIONS),depths:Array.from({length:GIRDLE_WIDTH_SAMPLES},()=>createContourDepth()),
      ringPoints:vectors(GIRDLE_SECTIONS),ringNormals:vectors(GIRDLE_SECTIONS),beltNormals:vectors(GIRDLE_SECTIONS*GIRDLE_WIDTH_SAMPLES)};
  });
  function fitToPose(){
    fitted=false;vertexCaches.clear();rig.updateWorldMatrix(true,true);inverse.copy(rig.matrixWorld).invert();
    // Preserve the whole indexed skin. Exact triangle-plane intersections,
    // welded across UV seams, choose the single closed torso loop containing
    // the proven interior origin; a remote horn or tail cannot replace it.
    const skin={vertices:[],indices:[]},sources=[];
    for(const object of meshes){
      if(!object.geometry.index)throw new Error('Harness fitting requires indexed skin triangles');
      const offset=skin.vertices.length,indices=object.geometry.index.array;
      skin.vertices.length+=object.geometry.attributes.position.count;
      for(const id of new Set(indices)){
        skin.vertices[offset+id]=object.getVertexPosition(id,new T.Vector3()).applyMatrix4(object.matrixWorld).applyMatrix4(inverse);
        sources[offset+id]={object,index:id};
      }
      for(const id of indices)skin.indices.push(offset+id);
    }
    const capture=source=>{
      const refs=source.indices.map(id=>sources[id]),object=refs[0].object;
      if(refs.some(ref=>ref.object!==object))throw new Error('Harness anchor crosses source meshes');
      let cache=vertexCaches.get(object);if(!cache){cache=new Map();vertexCaches.set(object,cache);}
      const vertices=refs.map(({index})=>{if(!cache.has(index))cache.set(index,new T.Vector3());return cache.get(index);});
      return{object,surface:{indices:refs.map(ref=>ref.index),weights:new T.Vector3(...source.barycentric)},vertices,point:new T.Vector3()};
    };
    for(const band of bands){
      const contours=Array.from({length:GIRDLE_WIDTH_SAMPLES},(_,track)=>traceContour(skin,band,(track/(GIRDLE_WIDTH_SAMPLES-1)*2-1)*GIRDLE_WIDTH/2));
      // Support includes the complete connected strip and the unchanged0.04
      // clearance neighborhood beyond each edge. Physical belt width is0.48.
      const strip=connectedStrip(skin,band,contours,{halfWidth:GIRDLE_WIDTH/2+.04});
      band.contours=contours.map(contour=>contour.anchors.map(capture));band.strip=strip.anchors.map(capture);
      band.anchors=[...band.contours.flat(),...band.strip];band.points=band.anchors.map(anchor=>anchor.point);
      band.contourPoints=band.contours.map(contour=>vectors(contour.length));band.supportPoints=vectors(band.strip.length);
      band.fitMetadata={contours:contours.map(contour=>contour.metadata),strip:strip.metadata};
    }
    fitted=true;update();
  }
  function project(anchors,output,band){
    for(let i=0;i<anchors.length;i++){
      relative.copy(anchors[i].point).sub(band.origin);
      output[i].set(relative.dot(band.u),relative.dot(band.v),relative.dot(band.w));
    }
  }
  function update(){
    if(!fitted)return;
    inverse.copy(rig.matrixWorld).invert();
    // A vertex shared by any contour or strip anchor is skinned and transformed
    // exactly once per frame, even when several source triangles reference it.
    for(const [object,cache]of vertexCaches)for(const [id,position]of cache)object.getVertexPosition(id,position).applyMatrix4(object.matrixWorld).applyMatrix4(inverse);
    for(const band of bands){
      band.mesh.visible=!band.rear||rearLoaded;
      for(const anchor of band.anchors){const weights=anchor.surface.weights;anchor.point.copy(anchor.vertices[0]).multiplyScalar(weights.x).addScaledVector(anchor.vertices[1],weights.y).addScaledVector(anchor.vertices[2],weights.z);}
      project(band.strip,band.supportPoints,band);band.envelope.fit(band.supportPoints);
      for(let track=0;track<GIRDLE_WIDTH_SAMPLES;track++){project(band.contours[track],band.contourPoints[track],band);band.depths[track].update(band.contourPoints[track]);}
      const positions=band.mesh.geometry.attributes.position;
      for(let layer=0;layer<2;layer++){
        band.envelope.write(GIRDLE_CLEARANCE+layer*GIRDLE_THICKNESS,band.ringPoints,band.ringNormals);
        for(let section=0;section<GIRDLE_SECTIONS;section++)for(let track=0;track<GIRDLE_WIDTH_SAMPLES;track++){
          const p=band.ringPoints[section],depth=band.depths[track].sample(p);
          point.copy(band.origin).addScaledVector(band.u,p.x).addScaledVector(band.v,p.y).addScaledVector(band.w,depth);
          positions.setXYZ((section*2+layer)*GIRDLE_WIDTH_SAMPLES+track,point.x,point.y,point.z);
          if(layer)band.beltNormals[section*GIRDLE_WIDTH_SAMPLES+track].copy(band.u).multiplyScalar(band.ringNormals[section].x).addScaledVector(band.v,band.ringNormals[section].y);
        }
      }
      positions.needsUpdate=true;band.mesh.geometry.computeVertexNormals();band.mesh.geometry.computeBoundingSphere();band.mesh.geometry.computeBoundingBox();
      const outerCenter=(section,target)=>target.fromBufferAttribute(positions,(section*2+1)*GIRDLE_WIDTH_SAMPLES).add(b.fromBufferAttribute(positions,(section*2+2)*GIRDLE_WIDTH_SAMPLES-1)).multiplyScalar(.5);
      for(const buckle of band.buckles){
        const section=buckle.section;
        a.fromBufferAttribute(positions,(section*2+1)*GIRDLE_WIDTH_SAMPLES);b.fromBufferAttribute(positions,(section*2+2)*GIRDLE_WIDTH_SAMPLES-1);
        center.copy(a).add(b).multiplyScalar(.5);along.subVectors(b,a);
        if(along.lengthSq()<=1e-12)throw new Error('Harness buckle has a collapsed width');along.normalize();
        outerCenter((section+GIRDLE_SECTIONS-1)%GIRDLE_SECTIONS,prior);outerCenter((section+1)%GIRDLE_SECTIONS,next);
        tangent.subVectors(next,prior);normal.crossVectors(tangent,along);
        if(normal.lengthSq()<=1e-12)throw new Error('Harness buckle has a collapsed tangent');normal.normalize();
        expectedNormal.copy(band.beltNormals[section*GIRDLE_WIDTH_SAMPLES]).add(band.beltNormals[section*GIRDLE_WIDTH_SAMPLES+GIRDLE_WIDTH_SAMPLES-1]);
        if(normal.dot(expectedNormal)<0)normal.negate();tangent.crossVectors(along,normal).normalize();normal.crossVectors(tangent,along).normalize();
        basis.makeBasis(normal,tangent,along);buckle.object.quaternion.setFromRotationMatrix(basis);buckle.object.position.copy(center).addScaledVector(normal,.025);buckle.object.visible=band.mesh.visible;
      }
    }
  }
  return{group,bands,fitToPose,update,setLoad(layout){rearLoaded=!!layout?.rearLoaded;},get fitted(){return fitted;}};
}
