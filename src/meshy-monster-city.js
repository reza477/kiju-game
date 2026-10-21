import * as T from '../vendor/three.module.js';
import {instantiateMeshyCarrier,meshyCarriersStatus} from './meshy-carriers.js';
import {createMeshyMonsterPose} from './meshy-monster.js';
import {getMaterial,box,beam,batchStatic} from './materials.js';
import {renderedTerrainHeight} from './terrain.js';
import {captureImpactAnchor,resolveImpactAnchor} from './impact-anchor.js';
import {createFleshHarness} from './saddle-harness.js';

export const meshyMonsterReady=()=>meshyCarriersStatus().assets.find(asset=>asset.kind==='flesh')?.state==='ready';
export const MONSTER_BODY_FIT=Object.freeze({x:-.325,y:-1.8,z:-12,scaleX:16,scaleY:21,scaleZ:16,strikeAdvance:3.3});
const ease=(a,b,value)=>{const t=T.MathUtils.clamp((value-a)/(b-a),0,1);return t*t*(3-2*t);};

// A closed compressed bolster replaces each box, inside precisely the same
// 2.5 x .60 x 3.1 envelope. The shallow inset seam is part of the mesh, not a
// floating trim strip; pad anchors and their contact depth remain unchanged.
function bolsterGeometry(){
  const profiles=[[-.30,.20,.75],[-.23,0,.83],[.12,0,.94],[.19,.035,.62],[.22,.025,.90],[.30,.22,1]],positions=[],uv=[],colors=[],indices=[],arcSegments=4,radius=.27;
  for(const [y,inset,shade]of profiles)for(let corner=0;corner<4;corner++)for(let step=0;step<=arcSegments;step++){
    const angle=(corner+step/arcSegments)*Math.PI/2,rx=1.25-inset,rz=1.55-inset,r=Math.min(radius,rx,rz),sx=corner===0||corner===3?1:-1,sz=corner<2?1:-1;
    const x=sx*(rx-r)+Math.cos(angle)*r,z=sz*(rz-r)+Math.sin(angle)*r;
    positions.push(x,y,z);uv.push(x/2.5+.5,z/3.1+.5);colors.push(shade,shade,shade);
  }
  const ring=4*(arcSegments+1);
  for(let layer=0;layer<profiles.length-1;layer++)for(let i=0;i<ring;i++){
    const a=layer*ring+i,b=layer*ring+(i+1)%ring,c=a+ring,d=b+ring;indices.push(a,c,b,b,c,d);
  }
  for(const [layer,top]of[[0,false],[profiles.length-1,true]]){
    const centre=positions.length/3,[y,,shade]=profiles[layer];positions.push(0,y,0);uv.push(.5,.5);colors.push(shade,shade,shade);
    for(let i=0;i<ring;i++){const a=layer*ring+i,b=layer*ring+(i+1)%ring;indices.push(...(top?[centre,b,a]:[centre,a,b]));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

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
  const group=new T.Group();group.name='Monster low saddle load cradle';
  const rearFrame=new T.Group();rearFrame.name='Supports for occupied rear wards';rearFrame.userData.noBatch=true;group.add(rearFrame);let rearLoaded=true;
  const iron=getMaterial('metal',0x454849),brass=getMaterial('gold',0x8c8060),leather=getMaterial('fabric',0x453c36,{vertexColors:true,sheen:.08,roughness:.88,metalness:0});
  rig.add(group);let hierarchy=rig;while(hierarchy.parent)hierarchy=hierarchy.parent;hierarchy.updateMatrixWorld(true);
  const paddedLeather=getMaterial('fabric',0x594a3c,{vertexColors:true,sheen:.08,roughness:.88,metalness:0});
  const supports=[],aprons=[],ray=new T.Raycaster(),origin=new T.Vector3(),down=new T.Vector3(0,-1,0);
  // Pads are anchored to inspected skin triangles, so crouching and breathing
  // cannot leave the castle's load-bearing feet suspended above the back.
  const saddleHeight=z=>28.7+(z+8.5)/7*5.2;
  for(const side of [-1,1]){
    beam(group,[side*3.9,saddleHeight(-6.8),-6.8],[side*3.9,saddleHeight(-10.7),-10.7],.15,iron);
    beam(rearFrame,[side*3.9,saddleHeight(-10.7),-10.7],[side*3.9,saddleHeight(-17.1),-17.1],.15,iron);
    const sideSupports=[];
    for(const z of [-8.5,-15.5]){
      origin.set(side*2,40,z<-12?-16:-12);rig.localToWorld(origin);down.set(0,-1,0).transformDirection(rig.matrixWorld);ray.set(origin,down);
      const hit=ray.intersectObjects(meshes,false)[0];
      if(!hit)throw new Error('Monster saddle has no supporting skin surface');
      const parent=z<-12?rearFrame:group;
      const pad=new T.Mesh(bolsterGeometry(),leather);pad.name='Compressed saddle bolster';pad.castShadow=pad.receiveShadow=true;parent.add(pad);
      const brace=box(parent,.35,1,.40,iron),diagonal=box(parent,.24,1,.24,iron);
      for(const part of [pad,brace,diagonal])part.userData.noBatch=true;
      const crossZ=z<-12?-10.7:-6.8,support={side,z,sampleX:side<0?(z<-12?-.85:-1.70):2,sampleZ:side<0?(z<-12?-14.9:-8.6):z,anchor:captureImpactAnchor(hit),pad,brace,diagonal,top:new T.Vector3(side*3.9,saddleHeight(z),z),cross:new T.Vector3(side*3.9,saddleHeight(crossZ)-.1,crossZ)};
      supports.push(support);sideSupports.push(support);
      box(parent,.50,.27,.46,brass,side*3.9,saddleHeight(z)-.05,z);
    }
    // A broad padded load cradle visually joins the fixed foundation to its
    // four skin-supported feet. It is harness, with no windows/empty storeys.
    const {geometry,parameters}=cradleGeometry(side);
    const apron=new T.Mesh(geometry,paddedLeather);apron.name='Padded saddle load cradle';apron.userData.noBatch=true;apron.userData.deformingImpactSurface=true;apron.castShadow=true;apron.receiveShadow=true;apron.frustumCulled=false;group.add(apron);
    aprons.push({mesh:apron,parameters,side,supports:sideSupports});
    // Low forward brackets carry the rendered base guns beside the neck.
    // Their simulation still fires from the unchanged actor-centre event.
    const spar=(a,b,width,depth)=>{const p=box(group,width,1,depth,iron),v=new T.Vector3(...b).sub(new T.Vector3(...a));p.position.set(...a).addScaledVector(v,.5);p.scale.y=v.length();p.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return p;};
    spar([side*3.9,saddleHeight(-6.8),-6.8],[side*6.1,29.25,-2.4],.42,.50);
    spar([side*3.9,saddleHeight(-8.5)-1.6,-8.5],[side*6.1,29.25,-2.4],.28,.34);
    box(group,3.15,.55,3.15,iron,side*6.1,29.30,-2.4);
  }
  for(const z of [-8.5,-15.5])beam(z<-12?rearFrame:group,[-3.9,saddleHeight(z)+.1,z],[3.9,saddleHeight(z)+.1,z],.15,iron);
  batchStatic(rearFrame);batchStatic(group);
  const point=new T.Vector3(),top=new T.Vector3(),bottom=new T.Vector3(),direction=new T.Vector3(),up=new T.Vector3(0,1,0);
  const fit=(beam,a,b)=>{direction.subVectors(b,a);beam.position.copy(a).addScaledVector(direction,.5);beam.scale.y=direction.length();beam.quaternion.setFromUnitVectors(up,direction.normalize());};
  return {group,supports,rearFrame,setLoad(layout){rearLoaded=!!layout?.rearLoaded;rearFrame.visible=rearLoaded;},fitToPose(){
    // Sample after the first real pose/terrain update, not in the imported bind
    // pose. Starting the controller early would cache feet at the wrong origin.
    rig.updateWorldMatrix(true,true);
    for(const support of supports){
      origin.set(support.sampleX,40,support.sampleZ);rig.localToWorld(origin);down.set(0,-1,0).transformDirection(rig.matrixWorld);ray.set(origin,down);
      const hit=ray.intersectObjects(meshes,false)[0];
      if(!hit)throw new Error('Posed monster saddle has no supporting skin surface');
      support.anchor=captureImpactAnchor(hit);
    }
  },update(){
    for(const support of supports){group.worldToLocal(resolveImpactAnchor(support.anchor,point));point.y+=.18;support.pad.position.copy(point);fit(support.brace,point,support.top);fit(support.diagonal,point,support.cross);}
    for(const apron of aprons){
      const geometry=apron.mesh.geometry,position=geometry.attributes.position;
      for(let i=0;i<apron.parameters.length;i++){
        const {u,v,depth}=apron.parameters[i],s=apron.supports,span=rearLoaded?u:u*.25;
        // A short draped pad follows the animal, independently of the fixed
        // cargo rails. The old full-height wall concealed its waist.
        top.lerpVectors(s[0].pad.position,s[1].pad.position,span);top.x+=apron.side*.6;top.y+=.6;
        bottom.lerpVectors(s[0].pad.position,s[1].pad.position,span);bottom.x+=apron.side*2;bottom.y-=.55;
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
  const saddle=createSaddle(rig,renderMeshes),harness=createFleshHarness(rig,renderMeshes),setSaddleLoad=saddle.setLoad.bind(saddle);saddle.update();
  saddle.setLoad=layout=>{setSaddleLoad(layout);harness.setLoad(layout);};
  saddle.harness=harness;
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
  if(!adapter.saddleFitted){adapter.saddle.fitToPose();adapter.saddle.harness.fitToPose();adapter.saddleFitted=true;}
  adapter.saddle.update();
  adapter.saddle.harness.update();
}
