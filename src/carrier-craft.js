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
 loft(frame,[section(-10.7,7.1,7.45,5.75),section(-8.6,8.25,7.45,5.75),section(7.8,8.25,7.45,5.75),section(10.4,7.3,7.15,5.75)],steel,'Raised armored city saddle');
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
  // Heavy exposed suspension and a long steam main connect hull and bogies.
  for(const z of[-7.5,-1.5,4.5]){
   beam(frame,[side*8.9,5.1,z-.9],[side*10.2,3.55,z+.7],.17,dark);
   beam(frame,[side*9.3,4.72,z-.62],[side*10.05,3.79,z+.47],.084,steel);
  }
  tube(frame,[[side*8.68,6.55,-9.2],[side*9.07,6.55,-8.2],[side*9.07,6.55,7.7],[side*8.60,5.82,9.1]],.14,brass,'Main steam manifold');
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

export function dressCrawlerUndercroft(frame){
 const brick=m('brick',0x845d4c),stone=m('stone',0xc0b298),dark=m('metal',0x31434b),glass=m('glass',0x73929a),trim=m('gold',0x9e8658);
 for(const side of[-1,1])for(const z of[-7.2,-3.6,0,3.6,7.2]){
  const bay=new T.Group();bay.rotation.y=side*Math.PI/2;bay.position.set(side*9.21,8.21,z);frame.add(bay);
  // Projecting brick pilasters, arched reveals, a deep sill and iron transom.
  for(const x of[-1.52,1.52]){box(bay,.26,1.32,.26,brick,x,.66,0);box(bay,.35,.13,.31,stone,x,1.24,.01);}
  const archPoints=[[-1.13,0],[-1.13,.58],[-.92,.91],[-.53,1.12],[0,1.20],[.53,1.12],[.92,.91],[1.13,.58],[1.13,0]];
  const backing=plate(bay,archPoints,.075,dark,'Recessed industrial arcade');backing.position.z=.018;
  const pane=plate(bay,archPoints.map(([x,y])=>[x*.91,y*.88]),.032,glass,'Undercroft iron glazing');pane.position.set(0,.045,.066);
  for(const x of[-.70,0,.70])box(bay,.055,.86,.10,dark,x,.48,.10);
  box(bay,2.12,.055,.12,dark,0,.58,.10);box(bay,2.46,.12,.35,stone,0,.025,.10);
  for(let i=0;i<8;i++){const a=i/7*Math.PI;const voussoir=box(bay,.25,.19,.19,stone,Math.cos(a)*1.20,.58+Math.sin(a)*.72,.11);voussoir.rotation.z=a-Math.PI/2;}
 }
 for(const side of[-1,1])box(frame,.17,.12,20.7,trim,side*9.28,9.61,0);
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
