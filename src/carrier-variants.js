import * as T from '../vendor/three.module.js';
import {getMaterial as m,box,cylinder,cone,sphere,beam,batchStatic} from './materials.js';

const TAU=Math.PI*2;
function torus(group,radius,tube,material,x,y,z,horizontal=false){const mesh=new T.Mesh(new T.TorusGeometry(radius,tube,8,48),material);mesh.position.set(x,y,z);if(horizontal)mesh.rotation.x=Math.PI/2;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
function tube(group,points,radius,material){const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(24,points.length*3),radius,6,false),material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}

/** The auger is built instead of the standard crawler's ram, then rotates as one assembly. */
export function createCrawlerDrill(frame,rig,spinners){
  const steel=m('metal',0x829394,{roughness:.34}),dark=m('metal',0x293c45),iron=m('metal',0x53676c),brass=m('gold',0xb89456),cutting=m('metal',0xbac3bd,{roughness:.28});
  for(const side of [-1,1]){
    box(frame,2.5,3.0,5.0,iron,side*6.6,4.1,10.8);
    beam(frame,[side*7.1,5.6,8.8],[side*4.4,5.4,13.3],.48,steel);
    beam(frame,[side*7.1,2.5,8.8],[side*4.4,4.0,13.3],.32,dark);
    cylinder(frame,.52,.52,4.0,brass,side*5.9,5.0,10.6,18).rotation.x=Math.PI/2;
  }
  const hinge=new T.Group();hinge.name='Powered drill gimbal';hinge.position.set(0,5.45,13);hinge.userData.noBatch=true;rig.add(hinge);
  for(const side of [-1,1]){sphere(frame,.75,dark,side*5.4,5.45,12.5);cylinder(hinge,.72,.72,.68,brass,side*5.45,0,-.5,20).rotation.z=Math.PI/2;}
  const bearing=cylinder(hinge,5.5,5.5,1.2,dark,0,0,-.85,48);bearing.rotation.x=Math.PI/2;
  torus(hinge,5.05,.32,brass,0,0,-.2);
  for(let i=0;i<12;i++){const a=i/12*TAU;const bolt=cylinder(hinge,.18,.18,.18,cutting,Math.cos(a)*5.05,Math.sin(a)*5.05,.08,10);bolt.rotation.x=Math.PI/2;}
  const pistons=[];
  for(let i=0;i<3;i++){const a=i/3*TAU,r=3.7,rod=cylinder(hinge,.24,.24,1,cutting,Math.cos(a)*r,Math.sin(a)*r,-.6,16);rod.rotation.x=Math.PI/2;rod.userData.noBatch=true;pistons.push(rod);}
  const shaft=cylinder(hinge,2.95,2.95,1,steel,0,0,-.6,32);shaft.rotation.x=Math.PI/2;shaft.userData.noBatch=true;
  const drill=new T.Group();drill.name='Rotating spiral excavation drill';drill.userData.noBatch=true;hinge.add(drill);
  const core=cone(drill,3.45,10.8,dark,0,0,5.4,48);core.rotation.x=Math.PI/2;
  const positions=[],uvs=[],indices=[],segments=196;
  for(let i=0;i<=segments;i++){
    const t=i/segments,a=t*TAU*2.15,outer=5.08*(1-t)+.25,inner=3.40*(1-t)+.10,z=.20+t*10.8;
    for(const [radius,dz]of [[inner,-.16],[outer,-.16],[outer,.16],[inner,.16]]){positions.push(Math.cos(a)*radius,Math.sin(a)*radius,z+dz);uvs.push(t*12,radius===outer?1:0);}
    if(i<segments)for(let edge=0;edge<4;edge++){const a=i*4+edge,b=i*4+(edge+1)%4,c=a+4,d=b+4;indices.push(a,b,c,b,d,c);}
  }
  indices.push(0,2,1,0,3,2);const end=segments*4;indices.push(end,end+1,end+2,end,end+2,end+3);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const flight=new T.Mesh(geometry,m('metal',0xb7beb1,{roughness:.65,metalness:.2}));flight.name='Continuous helical cutting flight';flight.castShadow=flight.receiveShadow=true;drill.add(flight);
  const edge=Array.from({length:97},(_,i)=>{const t=i/96,a=t*TAU*2.15,r=5.08*(1-t)+.25;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,.20+t*10.8);});
  tube(drill,edge,.065,m('metal',0xd0c7a4,{roughness:.55,metalness:.25}));
  // Replaceable carbide teeth follow the actual helix, making its direction legible.
  for(let i=0;i<26;i++){
    const t=.025+i/26*.94,a=t*TAU*2.15,r=5.08*(1-t)+.30,z=.20+t*10.8;
    const tooth=box(drill,.48,.28,.53,cutting,Math.cos(a)*r,Math.sin(a)*r,z+.14);tooth.rotation.z=a;tooth.rotation.y=.28;
  }
  const nose=cone(drill,.61,1.9,cutting,0,0,11.6,20);nose.rotation.x=Math.PI/2;
  const tip=new T.Object3D();tip.name='Drill physical contact tip';tip.position.set(0,0,12.55);drill.add(tip);
  batchStatic(drill);batchStatic(hinge);spinners.push({obj:drill,axis:'z',speed:4.8,drill:true,angle:0});
  return{drill,tip,hinge,shaft,pistons};
}

/** Exactly four upright, rounded envelopes with narrow necks and suspension lines. */
export function createVerticalEnvelopes(frame){
  const brass=m('gold',0xba9a60),rope=m('wood',0x8b7657),collar=m('copper',0x4b8280);
  const profile=[[.18,0],[.39,.38],[.73,1.0],[1.8,2.1],[2.9,3.7],[3.75,5.8],[4.05,7.4],...Array.from({length:10},(_,i)=>{const a=(i+1)/10*Math.PI/2;return[4.05*Math.cos(a),7.4+6*Math.sin(a)];})];
  const palette=[0xe2c8a0,0x7ea8a3,0xc88d71,0xd8b772],envelopes=[];
  for(const [index,side,z]of [[0,-1,-8.6],[1,1,-8.6],[2,-1,8.6],[3,1,8.6]]){
    const x=side*12.65,neckY=24.1,geometry=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),48);
    const colours=[];for(let i=0;i<geometry.attributes.position.count;i++){const p=geometry.attributes.position,angle=Math.atan2(p.getZ(i),p.getX(i)),shade=.91+.075*Math.cos(angle*8);colours.push(shade,shade,shade);}
    geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));
    const envelope=new T.Mesh(geometry,m('fabric',palette[index],{roughness:.65,vertexColors:true}));envelope.name=`Upright balloon envelope ${index+1}`;envelope.position.set(x,neckY,z);envelope.castShadow=envelope.receiveShadow=true;envelope.userData.noBatch=true;envelope.userData.carrierEnvelope='vertical';frame.add(envelope);envelopes.push(envelope);
    // Fine longitudinal gores and a tied neck preserve the familiar balloon outline.
    for(let seam=0;seam<8;seam++){
      const a=seam/8*TAU,points=profile.slice(1,-1).map(([r,y])=>new T.Vector3(x+Math.cos(a)*(r+.025),neckY+y,z+Math.sin(a)*(r+.025)));
      tube(frame,points,.027,brass);
    }
    const knot=cone(frame,.48,.68,collar,x,neckY-.22,z,16);knot.rotation.x=Math.PI;
    torus(frame,.42,.075,brass,x,neckY+.24,z,true);
    torus(frame,3.92,.065,brass,x,neckY+8.7,z,true);
    for(const dx of [-1,1])for(const dz of [-1,1]){
      const deck=[side*8.0+dx*.7,17.8,z*.80+dz*.65],neck=[x+dx*.42,neckY+.65,z+dz*.42];
      beam(frame,deck,neck,.065,rope);
      tube(frame,[new T.Vector3(...neck),new T.Vector3(x+dx*1.3,neckY+2.5,z+dz*1.3),new T.Vector3(x+dx*2.7,neckY+6.8,z+dz*2.7)],.040,brass);
    }
    for(const dz of [-.5,.5])beam(frame,[side*8.2,17.5,z*.82+dz],[x,21.2,z+dz],.11,collar);
  }
  return envelopes;
}
