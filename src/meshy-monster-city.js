import * as T from '../vendor/three.module.js';
import {instantiateMeshyCarrier,meshyCarriersStatus} from './meshy-carriers.js';
import {createMeshyMonsterPose} from './meshy-monster.js';
import {getMaterial,box,beam,batchStatic} from './materials.js';
import {renderedTerrainHeight} from './terrain.js';
import {captureImpactAnchor,resolveImpactAnchor} from './impact-anchor.js';

export const meshyMonsterReady=()=>meshyCarriersStatus().assets.find(asset=>asset.kind==='flesh')?.state==='ready';
export const MONSTER_BODY_FIT=Object.freeze({x:-.325,y:-1.8,z:-12,scaleX:16,scaleY:21,scaleZ:16,strikeAdvance:3.3});
const ease=(a,b,value)=>{const t=T.MathUtils.clamp((value-a)/(b-a),0,1);return t*t*(3-2*t);};

// Closed, bowed padding plus two raised leather bands, in one draw per side.
// Parameter coordinates are reused each frame; the lower edge follows the skin.
function cradleGeometry(side){
  const parameters=[],indices=[],uv=[],colors=[],segments=4;
  const vertex=(u,v,depth,shade)=>{const id=parameters.length;parameters.push({u,v,depth});uv.push(u*1.8,v*2.4);colors.push(shade,shade,shade);return id;};
  const triangle=(a,b,c,reverse=false)=>indices.push(...(reverse?[a,c,b]:[a,b,c]));
  for(let layer=0;layer<2;layer++)for(let v=0;v<=segments;v++)for(let u=0;u<=segments;u++)vertex(u/segments,v/segments,layer?-.18:.18,u===0||u===segments||v===0||v===segments?.7:1);
  const count=(segments+1)**2;
  for(let layer=0;layer<2;layer++)for(let v=0;v<segments;v++)for(let u=0;u<segments;u++){
    const a=layer*count+v*(segments+1)+u,b=a+1,c=a+segments+1,d=c+1,reverse=(side>0)!==Boolean(layer);
    triangle(a,b,c,reverse);triangle(b,d,c,reverse);
  }
  const edge=(a,b)=>{triangle(a,b,a+count,side<0);triangle(b,b+count,a+count,side<0);};
  for(let i=0;i<segments;i++){edge(i,i+1);edge(i*(segments+1)+segments,(i+1)*(segments+1)+segments);edge(count-1-i,count-2-i);edge((segments-i)*(segments+1),(segments-i-1)*(segments+1));}
  // Solid bands stand proud of the padding; this is shape, not painted stripes.
  for(const centre of [.23,.77]){
    const start=parameters.length;
    for(let layer=0;layer<2;layer++)for(let v=0;v<=segments;v++)for(const u of [centre-.045,centre+.045])vertex(u,v/segments,layer?.19:.34,.44);
    const n=(segments+1)*2;
    for(let layer=0;layer<2;layer++)for(let v=0;v<segments;v++){
      const a=start+layer*n+v*2,reverse=(side>0)!==Boolean(layer);triangle(a,a+1,a+2,reverse);triangle(a+1,a+3,a+2,reverse);
    }
    const rim=(a,b)=>{triangle(a,b,a+n,side<0);triangle(b,b+n,a+n,side<0);};
    rim(start,start+1);rim(start+n-1,start+n-2);
    for(let v=0;v<segments;v++){rim(start+v*2+1,start+(v+1)*2+1);rim(start+(v+1)*2,start+v*2);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(parameters.length*3),3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
  return {geometry,parameters};
}

function createSaddle(rig,meshes){
  const group=new T.Group();group.name='Monster castle load saddle';
  const iron=getMaterial('metal',0x454849),brass=getMaterial('gold',0x8c8060),leather=getMaterial('fabric',0x453c36);
  rig.add(group);let hierarchy=rig;while(hierarchy.parent)hierarchy=hierarchy.parent;hierarchy.updateMatrixWorld(true);
  const paddedLeather=getMaterial('fabric',0x594a3c,{vertexColors:true});
  const supports=[],aprons=[],ray=new T.Raycaster(),origin=new T.Vector3(),down=new T.Vector3(0,-1,0);
  // Pads are anchored to inspected skin triangles, so crouching and breathing
  // cannot leave the castle's load-bearing feet suspended above the back.
  for(const side of [-1,1]){
    box(group,.92,.78,11.4,iron,side*3.9,32.0,-12);
    const sideSupports=[];
    for(const z of [-8.5,-15.5]){
      origin.set(side*2,40,z<-12?-16:-12);rig.localToWorld(origin);down.set(0,-1,0).transformDirection(rig.matrixWorld);ray.set(origin,down);
      const hit=ray.intersectObjects(meshes,false)[0];
      if(!hit)throw new Error('Monster saddle has no supporting skin surface');
      const pad=box(group,2.5,.60,3.1,leather),brace=box(group,.76,1,.54,iron),diagonal=box(group,.46,1,.32,iron);
      for(const part of [pad,brace,diagonal])part.userData.noBatch=true;
      const support={anchor:captureImpactAnchor(hit),pad,brace,diagonal,top:new T.Vector3(side*3.9,32,z),cross:new T.Vector3(side*3.9,31.9,z+(z<-12?5:-5))};
      supports.push(support);sideSupports.push(support);
      box(group,1.1,.68,.65,brass,side*3.9,31.95,z);
    }
    // A broad padded load cradle visually joins the fixed foundation to its
    // four skin-supported feet. It is harness, with no windows/empty storeys.
    const {geometry,parameters}=cradleGeometry(side);
    const apron=new T.Mesh(geometry,paddedLeather);apron.name='Padded saddle load cradle';apron.userData.noBatch=true;apron.userData.deformingImpactSurface=true;apron.castShadow=true;apron.receiveShadow=true;apron.frustumCulled=false;group.add(apron);
    aprons.push({mesh:apron,parameters,side,supports:sideSupports});
    for(const u of [.23,.77]){const z=-8.5-7*u;for(const y of [30.95,31.65])box(group,.20,.16,.85,brass,side*4.45,y,z);for(const dz of [-.425,.425])box(group,.20,.70,.16,brass,side*4.45,31.3,z+dz);}
    for(const z of [-9.3,-11.1,-12.9,-14.7])box(group,.22,.23,.23,brass,side*4.42,32.02,z);
    // The original weapon positions remain authoritative. A cantilever from
    // the castle cradle gives those unchanged guns a visible physical mount.
    const spar=(a,b,width,depth)=>{const p=box(group,width,1,depth,iron),v=new T.Vector3(...b).sub(new T.Vector3(...a));p.position.set(...a).addScaledVector(v,.5);p.scale.y=v.length();p.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return p;};
    spar([side*3.9,32,-8.5],[side*5.1,42.35,1.9],.72,.92);
    spar([side*3.9,32,-15.5],[side*5.1,42.35,1.9],.38,.48);
    spar([side*3.9,38.2,-6.8],[side*5.1,42.35,1.9],.38,.48);
    box(group,3.15,.55,3.15,iron,side*5.1,42.40,1.9);
    box(group,1.05,1.05,.38,brass,side*3.9,34,-6.8);
  }
  for(const z of [-8.5,-15.5])beam(group,[-3.9,32.1,z],[3.9,32.1,z],.34,iron);
  batchStatic(group);
  const point=new T.Vector3(),top=new T.Vector3(),bottom=new T.Vector3(),direction=new T.Vector3(),up=new T.Vector3(0,1,0);
  const fit=(beam,a,b)=>{direction.subVectors(b,a);beam.position.copy(a).addScaledVector(direction,.5);beam.scale.y=direction.length();beam.quaternion.setFromUnitVectors(up,direction.normalize());};
  return {group,supports,update(){
    for(const support of supports){group.worldToLocal(resolveImpactAnchor(support.anchor,point));point.y+=.18;support.pad.position.copy(point);fit(support.brace,point,support.top);fit(support.diagonal,point,support.cross);}
    for(const apron of aprons){
      const geometry=apron.mesh.geometry,position=geometry.attributes.position;
      for(let i=0;i<apron.parameters.length;i++){
        const {u,v,depth}=apron.parameters[i],s=apron.supports;
        top.lerpVectors(s[0].top,s[1].top,u);top.x+=apron.side*.25;top.y-=.55;
        bottom.lerpVectors(s[0].pad.position,s[1].pad.position,u);bottom.x+=apron.side*1.12;bottom.y+=.35;
        point.lerpVectors(top,bottom,v);point.x+=apron.side*(depth+.42*Math.sin(Math.PI*u)*Math.sin(Math.PI*v));
        position.setXYZ(i,point.x,point.y,point.z);
      }
      position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    }
  }};
}

export function createMeshyMonsterCity(rig){
  const instance=instantiateMeshyCarrier('flesh');
  const fit=MONSTER_BODY_FIT;
  instance.root.scale.set(fit.scaleX,fit.scaleY,fit.scaleZ);instance.root.position.set(fit.x,fit.y,fit.z);rig.add(instance.root);
  const renderMeshes=[];instance.body.traverse(object=>{if(object.isSkinnedMesh)renderMeshes.push(object);});
  const controller=createMeshyMonsterPose(instance,{groundHeight:renderedTerrainHeight,strideDistance:8.8,supportCrouch:.12});
  const saddle=createSaddle(rig,renderMeshes);saddle.update();
  return {kind:'flesh',instance,controller,renderMeshes,saddle,previous:null,metrics:{animation:'Local four-legged gait on Meshy Smart Rig',visibleStrikeError:null}};
}

export function animateMeshyMonsterCity(city,time,moving){
  const adapter=city.meshyCarrier;if(adapter?.kind!=='flesh')return;
  const current=city.root.getWorldPosition(new T.Vector3()),previous=adapter.previous;
  const distance=previous?Math.hypot(current.x-previous.x,current.z-previous.z):0;adapter.previous=current;
  const age=time-city.strikeTime,contact=city.strikeContactTime??.7,end=city.strikeDuration??1.3;
  const active=age>=0&&age<end&&city.strikeTarget?.isVector3&&city.strikeHand;
  const weight=active?ease(.14,.55,age)*(1-ease(contact+.22,end,age)):0;
  // The new, unstretched source arm is 1.56 world metres short at the existing
  // monster contact. A bounded skin-only weight shift supplies that reach;
  // planted paws and the skin-anchored saddle follow through the normal solver.
  // The city rig, collision body, weapons, target marker and event stay fixed.
  adapter.instance.root.position.z=MONSTER_BODY_FIT.z+MONSTER_BODY_FIT.strikeAdvance*weight;
  const status=adapter.controller.update({time,moving,distanceDelta:distance,heading:city.heading,
    strikeHand:active?city.strikeHand.getWorldPosition(new T.Vector3()):null,strikeWeight:weight});
  adapter.metrics.visibleStrikeError=status?.strikeError??null;
  adapter.metrics.unreachableStrike=weight>.999&&status?.strikeError>.025;
  adapter.saddle.update();
}
