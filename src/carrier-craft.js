import * as T from '../vendor/three.module.js';
import {getMaterial as m,box,cylinder,beam} from './materials.js';

// Authored load-bearing forms are kept below the existing city deck. They do
// not move plots, carrier hardpoints, animated bearings or contact markers.
function mesh(group,geometry,material,name){
 const o=new T.Mesh(geometry,material);o.name=name;o.castShadow=o.receiveShadow=true;group.add(o);return o;
}
function tube(group,points,radius,material,name='Forged structural rib'){
 return mesh(group,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,radius,6,false),material,name);
}
function plate(group,points,depth,material,name){
 const shape=new T.Shape(points.map(p=>new T.Vector2(...p))),geometry=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false});
 geometry.translate(0,0,-depth/2);return mesh(group,geometry,material,name);
}
function ring(group,r,t,material,x,y,z,rotation=0){
 const o=mesh(group,new T.TorusGeometry(r,t,8,32),material,'Machined bearing');o.position.set(x,y,z);o.rotation.y=rotation;return o;
}

// A longitudinal loft gives the hull true sloped shoulders and a clipped prow,
// rather than outlining a rectangular primitive with extra small parts.
function loft(group,sections,material,name,smooth=false){
 const positions=[],indices=[],uv=[];
 for(const s of sections)for(let i=0;i<s.points.length;i++){positions.push(s.points[i][0],s.points[i][1],s.z);uv.push(s.points[i][0]*.18,s.z*.18);}
 const n=sections[0].points.length;
 for(let s=0;s<sections.length-1;s++)for(let i=0;i<n;i++){const a=s*n+i,b=s*n+(i+1)%n;indices.push(a,a+n,b,b,a+n,b+n);}
 for(let i=1;i<n-1;i++){indices.push(0,i,i+1);const end=(sections.length-1)*n;indices.push(end,end+i+1,end+i);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 if(smooth)return mesh(group,geometry,material,name);
 const planar=geometry.toNonIndexed();planar.computeVertexNormals();geometry.dispose();return mesh(group,planar,material,name);
}

export function createCrawlerBody(frame){
 const armour=m('metal',0x3e525a),steel=m('metal',0x788283),dark=m('metal',0x283a41),brass=m('gold',0xa38a57);
 const section=(z,w,top,bottom)=>({z,points:[[-w+.8,bottom],[-w,bottom+.65],[-w,top-.65],[-w+.85,top],[w-.85,top],[w,top-.65],[w,bottom+.65],[w-.8,bottom]]});
 loft(frame,[section(-11.5,7.55,5.70,3.18),section(-8.8,9,6.10,2.9),section(8.5,9,6.10,2.9),section(11.5,7.9,5.80,3.45)],armour,'Chamfered crawler citadel hull');
 // The narrowed central spine leaves the engine shoulders legible. The old
 // full-width blank upper casing is replaced, not hidden beneath this kit.
 loft(frame,[section(-10.7,6.8,7.45,5.75),section(-8.6,7.15,7.45,5.75),section(7.8,7.15,7.45,5.75),section(10.4,6.8,7.15,5.75)],dark,'Recessed load-bearing engine spine');
 createCrawlerEngineBays(frame);
 for(const side of[-1,1]){
  // One strong articulated wheel guard, with service bays between its struts.
  box(frame,.34,.31,21.8,armour,side*10.62,5.20,0);
  box(frame,1.55,.19,22.2,dark,side*10.0,5.06,0);
  for(const z of[-8.3,-3.2,2.2,7.5]){
   const cover=plate(frame,[[-1.65,0],[-1.86,.8],[-1.55,1.5],[1.55,1.5],[1.84,.9],[1.5,0]],.20,armour,'Tapered wheel guard');
   cover.rotation.y=side*Math.PI/2;cover.position.set(side*10.80,4.45,z);
   beam(frame,[side*10.91,4.88,z-1.25],[side*10.91,5.54,z+1.28],.047,brass);
   for(const dz of[-1.40,1.40])cylinder(frame,.11,.11,.09,brass,side*10.94,5.35,z+dz,8).rotation.z=Math.PI/2;
  }
  // Heavy exposed suspension connects the engine shoulders and bogies.
  for(const z of[-7.5,-1.5,4.5]){
   beam(frame,[side*8.9,5.1,z-.9],[side*10.2,3.55,z+.7],.17,dark);
   beam(frame,[side*9.3,4.72,z-.62],[side*10.05,3.79,z+.47],.084,steel);
  }
  for(const z of[-7.6,-4.0]){
   // Flared furnace bases make the tall chimneys rooted in the machinery.
   cylinder(frame,.85,1.16,1.48,dark,side*7.6,7.77,z,16);
   cylinder(frame,.92,.92,.16,brass,side*7.6,8.42,z,20);
   for(const lift of[9.2,12.3,15.3])beam(frame,[side*7.6,lift,z-.60],[side*7.6,lift,z+.60],.032,steel);
  }
 }
 // Stern ventilation is a single large industrial composition, not repeated
 // bright windows all over the machine's armor.
 box(frame,8.8,1.7,.18,dark,0,4.6,-11.47);
 for(let x=-3.9;x<=4;x+=.56)box(frame,.20,1.44,.13,steel,x,4.6,-11.60).rotation.x=.13;
 for(const x of[-5.7,5.7]){ring(frame,.57,.12,brass,x,3.63,-10.94);box(frame,.45,.5,.75,dark,x,3.9,-10.93);}
}

export function createCrawlerEngineBays(frame){
 const paint=m('metal',0x536b6c),dark=m('metal',0x293f45),steel=m('metal',0x85938b),brass=m('gold',0xa28b59);
 for(const side of[-1,1])for(const z of[-7.1,-2.1,2.9]){
  const bay=new T.Group();bay.position.set(side*8.72,6.58,z);frame.add(bay);
  const shell=new T.Shape();shell.moveTo(-.82,-.84);shell.lineTo(.82,-.84);shell.lineTo(.99,-.38);
  shell.bezierCurveTo(1.06,.11,.97,.63,.60,.86);shell.bezierCurveTo(.28,1.03,-.28,1.03,-.60,.86);
  shell.bezierCurveTo(-.97,.63,-1.06,.11,-.99,-.38);shell.closePath();
  const g=new T.ExtrudeGeometry(shell,{depth:3.82,steps:1,bevelEnabled:false,curveSegments:8});g.translate(0,0,-1.91);
  mesh(bay,g,paint,'Cast steam-engine shoulder');
  // Broad cradle bands and recessed end mechanisms are large, readable masses.
  for(const end of[-1,1]){
   const cap=cylinder(bay,.72,.77,.18,dark,0,.03,end*1.94,24);cap.rotation.x=Math.PI/2;
   const piston=cylinder(bay,.39,.46,.21,steel,0,.03,end*2.03,20);piston.rotation.x=Math.PI/2;
   const hub=cylinder(bay,.17,.23,.24,brass,0,.03,end*2.15,16);hub.rotation.x=Math.PI/2;
   const band=tube(bay,[[-.96,-.42,end*1.46],[-.88,.48,end*1.46],[-.48,.91,end*1.46],[.48,.91,end*1.46],[.88,.48,end*1.46],[.96,-.42,end*1.46]],.065,dark,'Steam-chamber cast cradle');
   band.userData.architecturalDetail=true;
  }
  const corbel=plate(bay,[[-.38,-.67],[-.58,.27],[-.41,1.15],[.42,1.15],[.58,.27],[.38,-.67]],.34,steel,'Engine-to-citadel bracket');
  corbel.rotation.y=side*Math.PI/2;corbel.position.set(side*.91,0,0);
  tube(bay,[[side*.57,.72,-.91],[side*.58,1.02,-.91],[side*.25,1.08,-.91],[0,1.08,-.91]],.095,brass,'Short engine steam feed');
 }
}

// A perimeter loft supplies real stone chamfers and outward-facing cornices.
// Its vertical coordinates are authored inside the former podium slabs.
function podiumRing(w,d,c){return[[-w/2+c,-d/2],[w/2-c,-d/2],[w/2,-d/2+c],[w/2,d/2-c],[w/2-c,d/2],[-w/2+c,d/2],[-w/2,d/2-c],[-w/2,-d/2+c]];}
function podiumLoft(frame,levels,material,name){
 const pos=[],uv=[],idx=[],n=8;
 for(const {y,w,d,c} of levels)for(const[x,z]of podiumRing(w,d,c)){pos.push(x,y,z);uv.push(x*.23,z*.23+y*.13);}
 for(let l=0;l<levels.length-1;l++)for(let i=0;i<n;i++){const a=l*n+i,b=l*n+(i+1)%n;idx.push(a,a+n,b,b,a+n,b+n);}
 for(let i=1;i<n-1;i++){idx.push(0,i,i+1);const end=(levels.length-1)*n;idx.push(end,end+i+1,end+i);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
 const flat=g.toNonIndexed();flat.computeVertexNormals();g.dispose();return mesh(frame,flat,material,name);
}

export function createCrawlerPodium(frame){
 const stone=m('stone',0xaeb2a4),brick=m('brick',0x90634e),dark=m('metal',0x354c50),trim=m('stone',0xc3b899);
 // Strong receding planes replace the flat concrete shelf beneath the city.
 podiumLoft(frame,[{y:7.775,w:18.8,d:21.8,c:1.35},{y:8.02,w:20.1,d:23.1,c:1.55},{y:8.225,w:20.1,d:23.1,c:1.55}],stone,'Splayed eight-sided city plinth');
 podiumLoft(frame,[{y:8.175,w:18.3,d:20.7,c:1.18},{y:9.525,w:18.3,d:20.7,c:1.18}],brick,'Chamfered masonry citadel');
 podiumLoft(frame,[{y:9.40,w:18.45,d:20.85,c:1.24},{y:9.52,w:18.76,d:21.10,c:1.32},{y:9.64,w:18.76,d:21.10,c:1.32}],trim,'Continuous undercroft cornice');
 // Four diagonal buttress returns anchor the architecture into the iron hull.
 for(const sx of[-1,1])for(const sz of[-1,1]){
  const brace=plate(frame,[[-.49,0],[-.39,1.27],[.37,1.27],[.58,.12]],.48,dark,'Cast corner corbel');
  brace.position.set(sx*8.42,7.98,sz*9.60);brace.rotation.y=-sx*sz*Math.PI/4;
  cylinder(frame,.19,.22,.13,trim,sx*8.42,9.43,sz*9.60,8);
 }
}

export function createCrawlerCityPlatform(frame,deckY){
 const dark=m('metal',0x45595c),stone=m('stone',0xa7b2a3);
 podiumLoft(frame,[{y:deckY-.875,w:16.72,d:17.52,c:.68},{y:deckY-.25,w:17.3,d:18.1,c:.78},{y:deckY-.125,w:17.3,d:18.1,c:.78}],dark,'Cast city deck shoulders');
 podiumLoft(frame,[{y:deckY-.14,w:17.5,d:18.3,c:.80},{y:deckY+.06,w:17.5,d:18.3,c:.80}],stone,'Dressed city deck rim');
}

export function createCrawlerProw(frame){
 const steel=m('metal',0x6f8081),dark=m('metal',0x304950),brass=m('gold',0xac955c);
 // Three separately swept cast plates curl forward and rise toward their outer
 // wings. The central ridge breaks the formerly broad rectangular shovel read.
 for(const panel of[-1,0,1]){
  const n=8,row=n+1,vertices=[],uv=[],indices=[];
  const surface=(u,v)=>{
   const centre=panel===0,side=panel,xx=centre?(u-.5)*4.10:side*(2.17+u*4.20-v*u*.47);
   const rear=centre?11.14:11.14-u*.24,front=centre?14.27+Math.sin(u*Math.PI)*.35:14.24-u*.95;
   const zz=rear+(front-rear)*(v*.68+v*v*.32),top=centre?4.34+Math.sin(u*Math.PI)*.16:4.34-u*.15;
   const bottom=centre?1.72:1.75+u*.23,yy=top+(bottom-top)*v+.48*Math.sin(v*Math.PI);
   return[xx,yy,zz];
  };
  for(let skin=0;skin<2;skin++)for(let v=0;v<=n;v++)for(let u=0;u<=n;u++){
   const p=surface(u/n,v/n);vertices.push(p[0],p[1]-skin*.12,p[2]);uv.push(u/n,v/n);
  }
  const layer=row*row,quad=(a,b,c,d,reverse=false)=>indices.push(...(reverse?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
  for(let v=0;v<n;v++)for(let u=0;u<n;u++){
   const a=v*row+u;
   // Mirrored wing parameterization needs the opposite winding.
   quad(a,a+row,a+1,a+row+1,panel<0);quad(a+layer,a+layer+1,a+layer+row,a+layer+row+1,panel<0);
  }
  const edge=[];for(let u=0;u<n;u++)edge.push(u);for(let v=0;v<n;v++)edge.push(v*row+n);for(let u=n;u>0;u--)edge.push(n*row+u);for(let v=n;v>0;v--)edge.push(v*row);
  for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];quad(a,b,a+layer,b+layer,panel<0);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  mesh(frame,g,panel===0?steel:m('metal',0x5c7475),panel===0?'Ridge-cast central plough':'Swept outer plough wing');
  const edgePoints=Array.from({length:9},(_,i)=>surface(i/8,1));tube(frame,edgePoints,.047,dark,'Curved replaceable cutting edge');
 }
 for(const x of[-4.8,4.8]){
  beam(frame,[x,4.22,11.20],[x,5.10,10.54],.16,dark);
  cylinder(frame,.28,.28,.28,brass,x,4.31,11.24,16).rotation.x=Math.PI/2;
 }
}

export function dressCrawlerUndercroft(frame){
 const stone=m('stone',0xc0b298),dark=m('metal',0x283f47),glass=m('glass',0x668b92);
 const positions=[];
 for(const side of[-1,1])for(const z of[-7.2,-3.6,0,3.6,7.2])positions.push({x:side*9.17,z,angle:side*Math.PI/2});
 for(const end of[-1,1])for(const x of[-6.6,-3.3,0,3.3,6.6])positions.push({x,z:end*10.37,angle:end<0?Math.PI:0});
 for(const {x,z,angle}of positions){
  const bay=new T.Group();bay.rotation.y=angle;bay.position.set(x,8.20,z);frame.add(bay);
  const outer=new T.Shape();outer.moveTo(-1.40,0);outer.lineTo(-1.40,.47);outer.absellipse(0,.47,1.40,.80,Math.PI,0,true);outer.lineTo(1.40,0);outer.closePath();
  const inner=new T.Path();inner.moveTo(-1.13,.02);inner.lineTo(1.13,.02);inner.lineTo(1.13,.47);inner.absellipse(0,.47,1.13,.57,0,Math.PI,false);inner.lineTo(-1.13,.02);inner.closePath();outer.holes.push(inner);
  const surround=new T.ExtrudeGeometry(outer,{depth:.21,bevelEnabled:true,bevelSize:.022,bevelThickness:.022,bevelSegments:1,curveSegments:10});
  mesh(bay,surround,stone,'Continuous vaulted arcade surround');
  const opening=new T.Shape();opening.moveTo(-1.15,0);opening.lineTo(-1.15,.48);opening.absellipse(0,.48,1.15,.60,Math.PI,0,true);opening.lineTo(1.15,0);opening.closePath();
  const pane=new T.ExtrudeGeometry(opening,{depth:.025,bevelEnabled:false,curveSegments:10});mesh(bay,pane,glass,'Recessed vaulted iron glazing').position.z=.015;
  for(const dx of[-.69,0,.69])box(bay,.065,.73,.08,dark,dx,.39,.09);
  box(bay,2.28,.065,.09,dark,0,.48,.09);box(bay,2.89,.14,.34,stone,0,-.005,.10);
  const keystone=plate(bay,[[-.18,0],[-.13,.31],[.13,.31],[.18,0]],.26,stone,'Arcade keystone');keystone.position.set(0,1.01,.10);
 }
}

export function createAirshipHull(frame){
 const wood=m('wood',0x66534a),copper=m('copper',0x477c77),brass=m('gold',0xac915a),dark=m('metal',0x30474d),glass=m('glass',0x789da1);
 const sections=[];
 for(const[z,w,top,bottom]of[[-10.85,.55,16.65,15.9],[-8.75,5.4,17.03,14.22],[-5.5,8.15,17.23,13.05],[0,8.85,17.25,12.79],[5.7,7.9,17.2,13.35],[9.4,4.0,16.9,14.72],[11.0,.32,16.46,16.04]]){
  const points=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI;points.push([-Math.cos(a)*w,top-Math.sin(a)*(top-bottom)]);}sections.push({z,points:points.reverse()});
 }
 loft(frame,sections,wood,'Swept Eastern flying hull',true);
 // Ribs wrap the actual belly and converge into the keel, with a copper wale.
 for(const z of[-8.3,-5.3,-1.8,2.0,5.5,8.2]){
  const w=8.92*Math.sqrt(Math.max(.05,1-z*z/119)),bottom=12.72+Math.abs(z)*.18;
  tube(frame,[[-w,17.13,z],[-w*.81,14.92,z],[-w*.38,bottom+.3,z],[0,bottom,z],[w*.38,bottom+.3,z],[w*.81,14.92,z],[w,17.13,z]],.11,copper,'Continuous hull frame');
 }
 for(const side of[-1,1]){
  tube(frame,[[side*.55,16.75,-10.7],[side*5.45,17.19,-8.5],[side*8.4,17.46,-4.8],[side*9,17.46,0],[side*8.2,17.40,5.4],[side*4.2,17.17,9.3],[side*.36,16.65,11.02]],.16,copper,'Swept copper gunwale');
  for(const z of[-5.8,-2.8,.2,3.2,6.1]){
   const x=side*(8.70*Math.sqrt(1-z*z/124)),y=15.57;
   const g=new T.Group();g.position.set(x,y,z);g.rotation.y=side*Math.PI/2;frame.add(g);
   cylinder(g,.40,.40,.045,dark,0,0,0,20).rotation.x=Math.PI/2;
   cylinder(g,.32,.32,.045,glass,0,0,.035,20).rotation.x=Math.PI/2;
   ring(g,.39,.043,brass,0,0,.055);box(g,.027,.64,.03,brass,0,0,.078);box(g,.63,.026,.03,brass,0,0,.078);
  }
 }
 // A deep suspended navigation bay has its own bowed silhouette. It stays
 // beneath the city streets and inside the envelope/propeller hardpoints.
 const cabin=new T.Group();cabin.position.set(0,13.75,6.3);frame.add(cabin);
 const floor=cylinder(cabin,2.35,1.73,.33,copper,0,-.27,0,12);floor.scale.z=.71;
 const roof=cylinder(cabin,2.19,2.53,.22,brass,0,1.20,0,12);roof.scale.z=.73;
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2,x=Math.cos(a)*2.13,z=Math.sin(a)*1.50;
  beam(cabin,[x,-.14,z],[x,1.20,z],.063,brass);
  if(i<6){const pane=box(cabin,1.0,.98,.06,glass,x*.98,.52,z*.99);pane.rotation.y=Math.PI/2-a;}
 }
 tube(frame,[[0,12.85,-4],[0,12.65,0],[0,13.6,7.7],[0,15.6,10.5],[0,18.35,11.7]],.15,brass,'Rising crescent prow');
 // Crescent-shaped bow ornament connects to the keel instead of floating.
 const crescent=plate(frame,[[0,0],[-.55,.35],[-.70,1.02],[-.37,1.66],[.18,1.84],[-.03,1.41],[-.12,.89],[.17,.47],[.52,.29]],.12,copper,'Crescent prow crest');crescent.position.set(0,17.92,11.7);
}

export function dressEnvelopeCradle(frame,x,y,z){
 const brass=m('gold',0xaf925b),dark=m('metal',0x354b4f),copper=m('copper',0x477e79);
 // A vented engine pod and two curved saddles explain how lift is transferred.
 cylinder(frame,.44,.57,3.7,dark,x,y-3.72,z,20).rotation.x=Math.PI/2;
 for(const off of[-1.54,1.48])cylinder(frame,.61,.61,.14,brass,x,y-3.72,z+off,20).rotation.x=Math.PI/2;
 for(const off of[-3.45,3.45]){
  tube(frame,[[x-2.0,y-2.31,z+off],[x-1.1,y-3.0,z+off],[x,y-3.14,z+off],[x+1.1,y-3.0,z+off],[x+2.0,y-2.31,z+off]],.13,copper,'Envelope suspension saddle');
  beam(frame,[x,y-3.2,z+off],[x,y-3.72,z+Math.sign(off)*1.4],.08,brass);
 }
 for(let off=-1.15;off<=1.2;off+=.38)box(frame,.51,.31,.09,copper,x,y-3.70,z+off);
}

/** A swept, pitched blade replaces the former crossed rectangular paddles. */
export function createPropellerBlades(prop,material){
 for(let i=0;i<4;i++){
  const blade=plate(prop,[[.08,.34],[-.11,.82],[-.36,1.73],[-.30,2.14],[-.09,2.18],[.18,1.77],[.34,.84],[.24,.36]],.07,material,'Pitched propeller blade');
  blade.position.z=-.81;blade.rotation.z=i*Math.PI/2;blade.rotation.y=.16;
 }
}
