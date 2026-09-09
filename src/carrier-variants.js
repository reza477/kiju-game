import * as T from '../vendor/three.module.js';
import {getMaterial as m,box,cylinder,cone,sphere,beam,batchStatic} from './materials.js';

const TAU=Math.PI*2;
let augerSurfaces;
function augerMaterials(){
  if(augerSurfaces)return augerSurfaces;
  // Axial abrasion belongs to the tool, instead of the city sheet-metal texture.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#acb0a6');gradient.addColorStop(.62,'#b4b7ad');gradient.addColorStop(1,'#636d66');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
  for(let i=0;i<76;i++){const x=(i*67.31)%256;ctx.strokeStyle=i%3?'#263d3325':'#f0e4c92b';ctx.lineWidth=i%5===0?2.1:.6;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+1.2,256);ctx.stroke();}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;
  const core=new T.MeshStandardMaterial({color:0x5b6b68,map,bumpMap:map,bumpScale:.018,metalness:.62,roughness:.72});core.userData.shared=true;
  augerSurfaces={core,cutting:m('metal',0xc4cabd,{roughness:.29,metalness:.76,bumpScale:.003})};return augerSurfaces;
}
function torus(group,radius,tube,material,x,y,z,horizontal=false){const mesh=new T.Mesh(new T.TorusGeometry(radius,tube,8,48),material);mesh.position.set(x,y,z);if(horizontal)mesh.rotation.x=Math.PI/2;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
function tube(group,points,radius,material){const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(24,points.length*3),radius,6,false),material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}

/** The auger is built instead of the standard crawler's ram, then rotates as one assembly. */
export function createCrawlerDrill(frame,rig,spinners){
  const surfaces=augerMaterials(),steel=m('metal',0x829394,{roughness:.34}),dark=m('metal',0x293c45),iron=m('metal',0x53676c),brass=m('gold',0xb89456),cutting=surfaces.cutting;
  for(const side of [-1,1]){
    box(frame,2.5,3.0,5.0,iron,side*6.6,4.1,10.8);
    beam(frame,[side*7.1,5.6,8.8],[side*4.4,5.4,13.3],.48,steel);
    beam(frame,[side*7.1,2.5,8.8],[side*4.4,4.0,13.3],.32,dark);
    cylinder(frame,.52,.52,4.0,brass,side*5.9,5.0,10.6,18).rotation.x=Math.PI/2;
    // Protected ram tubes and their supply lines explain the gimbal's force
    // path; the existing animated piston and contact tip remain authoritative.
    for(const z of[9.2,11.9])cylinder(frame,.62,.62,.20,dark,side*5.9,5.0,z,18).rotation.x=Math.PI/2;
    tube(frame,[new T.Vector3(side*7.2,5.8,8.8),new T.Vector3(side*6.45,6.18,10.0),new T.Vector3(side*5.88,5.55,11.15)],.11,dark);
    box(frame,1.14,.20,2.3,steel,side*6.6,5.65,10.5);
  }
  const hinge=new T.Group();hinge.name='Powered drill gimbal';hinge.position.set(0,5.45,13);hinge.userData.noBatch=true;rig.add(hinge);
  for(const side of [-1,1]){sphere(frame,.75,dark,side*5.4,5.45,12.5);cylinder(hinge,.72,.72,.68,brass,side*5.45,0,-.5,20).rotation.z=Math.PI/2;}
  const bearing=cylinder(hinge,5.5,5.5,1.2,dark,0,0,-.85,48);bearing.rotation.x=Math.PI/2;
  torus(hinge,5.05,.32,brass,0,0,-.2);
  torus(hinge,4.58,.13,steel,0,0,.03);
  for(let i=0;i<12;i++){const a=i/12*TAU;const bolt=cylinder(hinge,.18,.18,.18,cutting,Math.cos(a)*5.05,Math.sin(a)*5.05,.08,10);bolt.rotation.x=Math.PI/2;}
  const pistons=[];
  for(let i=0;i<3;i++){const a=i/3*TAU,r=3.7,rod=cylinder(hinge,.24,.24,1,cutting,Math.cos(a)*r,Math.sin(a)*r,-.6,16);rod.rotation.x=Math.PI/2;rod.userData.noBatch=true;pistons.push(rod);}
  const shaft=cylinder(hinge,2.95,2.95,1,steel,0,0,-.6,32);shaft.rotation.x=Math.PI/2;shaft.userData.noBatch=true;
  const drill=new T.Group();drill.name='Rotating spiral excavation drill';drill.userData.noBatch=true;hinge.add(drill);
  const core=cone(drill,3.45,10.8,surfaces.core,0,0,5.4,48);core.rotation.x=Math.PI/2;
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
    // Broad gores are fabric panels, not tiny painted noise. Their seams follow
    // the rounded envelope from tied neck to apex without changing its outline.
    for(let gore=0;gore<4;gore++){
      const a=gore/4*TAU+index*.22,positions=[],uv=[],indices=[];
      for(const[step,[radius,y]]of profile.slice(1,-1).entries())for(let edge=0;edge<=4;edge++){
        // Four angular spans follow the curved envelope. A single broad chord
        // would sink through its faceted surface and make the fabric look torn.
        const angle=a+(edge/4-.5)*.25,r=radius+.035;positions.push(x+Math.cos(angle)*r,neckY+y,z+Math.sin(angle)*r);uv.push(edge/4,y*.13);
        if(step&&edge){const p=step*5+edge;indices.push(p-6,p-1,p-5,p-5,p-1,p);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
      const panel=new T.Mesh(g,m('fabric',index%2?0xd2bd92:0x527e79,{side:T.DoubleSide}));panel.name='Sewn envelope gore';panel.castShadow=panel.receiveShadow=true;frame.add(panel);
    }
    const knot=cone(frame,.48,.68,collar,x,neckY-.22,z,16);knot.rotation.x=Math.PI;
    torus(frame,.42,.075,brass,x,neckY+.24,z,true);
    cylinder(frame,.48,.54,.38,collar,x,neckY-.57,z,20);
    torus(frame,.59,.08,brass,x,neckY-.79,z,true);
    for(let port=0;port<4;port++){const a=port/4*TAU;beam(frame,[x+Math.cos(a)*.42,neckY-.8,z+Math.sin(a)*.42],[x+Math.cos(a)*.94,neckY-1.57,z+Math.sin(a)*.94],.06,brass);}
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
