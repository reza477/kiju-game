import * as T from '../vendor/three.module.js';
import { getMaterial as material, box, cylinder, sphere, beam, batchStatic } from './materials.js';
import { KAIJU_CENTER } from './city-layout.js';
import { skinSurfaceSet } from './surface-library.js';

const UP = new T.Vector3(0, 1, 0);

function addMesh(group, geometry, mat, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(geometry, mat);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
}

function muscle(group, a, b, width, depth, mat) {
  const start = new T.Vector3(...a), direction = new T.Vector3(...b).sub(start);
  const centre = start.addScaledVector(direction, .5);
  // Broad attachment, asymmetric belly and tapered tendon: continuous volume
  // rather than the repeated rugby-ball primitive of the first creature pass.
  const profile=[[.23,-.55],[.65,-.47],[.96,-.29],[1,-.12],[.84,.17],[.49,.43],[.18,.56]];
  const geometry=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),18);
  const mesh=addMesh(group,geometry,mat,centre.x,centre.y,centre.z);
  mesh.scale.set(width,direction.length(),depth);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize()); return mesh;
}

function plate(group, outline, depth, mat, x = 0, y = 0, z = 0, bevel = .12) {
  const shape = new T.Shape(); shape.moveTo(...outline[0]);
  for (const point of outline.slice(1)) shape.lineTo(...point);
  shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1, curveSegments: 3 });
  geometry.translate(0, 0, -depth / 2);
  return addMesh(group, geometry, mat, x, y, z);
}

function mirroredPlate(group, side, outline, depth, mat, x, y, z, bevel = .12) {
  const mesh=plate(group, outline.map(([px, py]) => [px * side, py]), depth, mat, x, y, z, bevel);
  const positions=mesh.geometry.attributes.position;
  mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox;
  const centreX=(bounds.min.x+bounds.max.x)*.5,halfWidth=Math.max(.1,(bounds.max.x-bounds.min.x)*.5);
  const crown=Math.min(.42,halfWidth*.20);
  for(let i=0;i<positions.count;i++){const across=(positions.getX(i)-centreX)/halfWidth;positions.setZ(i,positions.getZ(i)+crown*(1-across*across));}
  mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
  if(depth>=.5&&bounds.max.y-bounds.min.y>2.5){
    // Recessed seams and captive fasteners follow the curved plate itself.
    // They sit within its bevel envelope and inherit its actual articulation.
    const dark=material('metal',0x272e35,{roughness:.70,metalness:.48}),steel=material('metal',0x9a9990,{roughness:.38,metalness:.72});
    const cy=(bounds.min.y+bounds.max.y)*.5,points=outline.map(([px,py])=>{const x=centreX+(px*side-centreX)*.84,y=cy+(py-cy)*.90,a=(x-centreX)/halfWidth;return[x,y,depth*.5+crown*(1-a*a)+.016];});
    cable(mesh,[...points,points[0]],.023,dark);
    for(let i=0;i<points.length;i+=2){const [x,y,z]=points[i],washer=cylinder(mesh,.082,.082,.020,dark,x,y,z+.006,12);washer.rotation.x=Math.PI/2;
      cylinder(mesh,.054,.054,.025,steel,x,y,z+.018,6).rotation.x=Math.PI/2;
      box(mesh,.045,.010,.005,dark,x,y,z+.033);
    }
  }
  return mesh;
}

function joint(group, x, y, z, radius, mat, trim) {
  // Recessed joint capsules are overlapped by the neighbouring armour cuffs.
  // Large bright side discs made every articulation read as a toy hinge.
  sphere(group, 1, mat, x, y, z, radius * .95, radius, radius * .91);
  for (const side of [-1, 1])
    muscle(group,[x+side*radius*.66,y+radius*.6,z-.14],[x+side*radius*.76,y-radius*.62,z+.1],radius*.24,radius*.37,mat);
}

function articulatedSection(parent, children, pivot, name) {
  const section = new T.Group(); section.name = name; section.position.set(...pivot);
  for (const child of children) { child.position.sub(section.position); section.add(child); }
  parent.add(section); batchStatic(section); section.userData.noBatch = true; return section;
}

function cable(group, points, radius, mat) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
  return addMesh(group, new T.TubeGeometry(curve, Math.max(12, points.length * 5), radius, 8, false), mat);
}

function shoulderStrap(group, points, width, thickness, mat) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), sections = 32;
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= sections; i++) {
    const t = i / sections, p = curve.getPoint(t), tangent = curve.getTangent(t);
    const normal = new T.Vector3(0, tangent.z, -tangent.y).normalize();
    for (const [sx, sn] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      positions.push(p.x + sx * width / 2, p.y + normal.y * sn * thickness / 2, p.z + normal.z * sn * thickness / 2);
      uvs.push(sx > 0 ? 1 : 0, t * 4);
    }
    if (i < sections) for (let j = 0; j < 4; j++) {
      const a = i * 4 + j, b = i * 4 + (j + 1) % 4, c = a + 4, d = b + 4;
      indices.push(a, c, b, b, c, d);
    }
  }
  indices.push(0, 1, 2, 0, 2, 3);
  const last = sections * 4; indices.push(last, last + 2, last + 1, last, last + 3, last + 2);
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return addMesh(group, geometry, mat);
}

function waistBelt(group, mat, trim) {
  const shape = new T.Shape(), outer = new T.EllipseCurve(0, 0, 3.6, 2.55, 0, Math.PI * 2, false, 0);
  shape.setFromPoints(outer.getPoints(48));
  const hole = new T.Path(), inner = new T.EllipseCurve(0, 0, 3.31, 2.26, 0, Math.PI * 2, true, 0);
  hole.setFromPoints(inner.getPoints(48)); shape.holes.push(hole);
  const geometry = new T.ExtrudeGeometry(shape, { depth: 1.15, bevelEnabled: true, bevelSize: .06, bevelThickness: .07, bevelSegments: 1, steps: 1 });
  const belt = addMesh(group, geometry, mat, 0, 26.9, .2); belt.rotation.x = Math.PI / 2;
  box(group, 2.2, 1.35, .3, trim, 0, 26.3, 2.85);
  box(group, 1.5, .72, .12, mat, 0, 26.3, 3.05);
  for (const x of [-.86, .86]) cylinder(group, .1, .1, .13, trim, x, 26.3, 3.08, 12).rotation.x = Math.PI / 2;
}

function createLeg(rig, limbs, side, m) {
  const leg = new T.Group(); leg.name = side < 0 ? 'Left articulated titan leg' : 'Right articulated titan leg';
  leg.position.set(side * 2.8, 25.5, .1); rig.add(leg);
  const knee = [side * .45, -11.2, .8], ankle = [side * .18, -23.2, -.7];
  joint(leg, 0, -.4, 0, 1.65, m.joint, m.edge);
  muscle(leg, [0, -1.5, 0], knee, 1.57, 1.6, m.flesh);
  muscle(leg, [side * .38, -2, -.75], [side * .57, -9.6, -.45], 1.08, .93, m.dark);
  const thigh = mirroredPlate(leg, side, [[-1.25, 0], [1.25, .1], [1.55, -2.3], [.85, -8.8], [-.8, -9.2], [-1.2, -6]], .83, m.armour, side * .1, -1.2, 1.4, .18);
  thigh.rotation.x = -.018;
  mirroredPlate(leg, side, [[-.92, 0], [.94, .1], [.83, -2.1], [.25, -6.9], [-.5, -7.1]], .24, m.light, side * .14, -1.8, 1.97, .1);
  mirroredPlate(leg, side, [[.85, 0], [1.09, -.1], [.88, -4.7], [.6, -5.2]], .12, m.trim, side * .1, -2.3, 2.12, .03);
  // A dark rear hamstring and recessed tendons keep the leg anatomical.
  cable(leg, [[-side * .9, -2.4, -.8], [-side * 1.25, -6, -1.05], [-side * .65, -10.4, -.1]], .11, m.cable);
  cable(leg, [[side * .85, -2, -.5], [side * 1.4, -7, -.8], [side * .75, -10.8, .3]], .12, m.cable);
  const lowerStart = leg.children.length;
  joint(leg, ...knee, 1.22, m.joint, m.edge);
  mirroredPlate(leg, side, [[-1.2, .8], [1.2, .8], [1.4, -.15], [.65, -1.35], [0, -1.7], [-.8, -1.1]], .78, m.armour, knee[0], knee[1], 1.79, .13);
  mirroredPlate(leg, side, [[-.8, .5], [.8, .5], [.62, -.25], [0, -.82], [-.62, -.25]], .16, m.trim, knee[0], knee[1], 2.29, .05);
  muscle(leg, [knee[0], knee[1] - .55, .42], [ankle[0], ankle[1] + .6, -.7], 1.03, 1.21, m.flesh);
  muscle(leg, [side * .42, -13.5, -.5], [side * .2, -19.7, -1.3], .87, 1.05, m.dark);
  const shin = mirroredPlate(leg, side, [[-1.15, 0], [1.15, 0], [1.05, -4.2], [.53, -9.2], [-.5, -9.4], [-.96, -6.3]], .73, m.armour, side * .35, -12.6, 1.35, .15);
  shin.rotation.x = .075;
  mirroredPlate(leg, side, [[-.62, 0], [.62, .2], [.48, -7.5], [0, -8.5], [-.35, -7.4]], .26, m.light, side * .35, -13.15, 1.84, .09).rotation.x = .075;
  mirroredPlate(leg, side, [[-.18, 0], [.18, 0], [.15, -5.8], [0, -6.7]], .1, m.trim, side * .35, -14.5, 2.00, .025).rotation.x = .075;
  for (let i = 0; i < 5; i++) {
    const cuff = cylinder(leg, .84 - i * .03, .88 - i * .03, .22, m.joint, side * .18, -21.65 - i * .32, -.65, 20);
    cuff.scale.z = 1.16;
  }
  // Broad plated feet have a distinct heel, instep, separated toes and a flat sole.
  const footStart = leg.children.length;
  joint(leg, ...ankle, .83, m.joint, m.edge);
  const footOutline = [[-1.2, -1.75], [.95, -1.75], [1.35, -.9], [1.28, 2.3], [.8, 3.1], [-.85, 3.1], [-1.25, 2.25]];
  const foot = plate(leg, footOutline, 1.32, m.armour, side * .18, -24.63, .4, .12); foot.rotation.x = Math.PI / 2;
  // Rotation maps the outline's y to z; its front is therefore positive z.
  const sole = plate(leg, footOutline, .24, m.joint, side * .18, -25.23, .4, .06); sole.rotation.x = Math.PI / 2;
  muscle(leg, [side * .18, -23.9, -.25], [side * .18, -24.45, 1.65], .94, 1.25, m.light);
  for (let toe = 0; toe < 3; toe++) {
    const tx = side * .18 + (toe - 1) * .72;
    box(leg, .56, .15, .8, m.edge, tx, -24.24, 2.75);
    box(leg, .075, .3, 1.25, m.joint, tx + .33, -24.16, 2.58);
  }
  for (const a of [-1, 1]) box(leg, .11, .13, 1.8, m.trim, side * .18 + a * 1.27, -24.44, .75);
  const footJoint = articulatedSection(leg,leg.children.slice(footStart),ankle,'Titan ankle and planted sole');
  const lower = articulatedSection(leg,leg.children.slice(lowerStart),knee,'Titan knee and shin');
  const soleVertices=[];let soleY=Infinity;
  footJoint.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);soleVertices.push(v);soleY=Math.min(soleY,v.y);}});
  const unique=new Map();for(const v of soleVertices)if(v.y<soleY+.004)unique.set(v.x.toFixed(5)+':'+v.z.toFixed(5),v);
  const solePoints=[...unique.values()],soleCentre=solePoints.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(1/solePoints.length);
  solePoints.push(soleCentre.clone());
  batchStatic(leg); leg.userData.noBatch = true;
  limbs.push({ obj:leg, lower, foot:footJoint, knee, ankle, solePoints, soleCentre, side, phase:side>0?0:Math.PI, leg:true });
}

function createHand(arm, side, m) {
  const palm = new T.Group(); palm.position.set(side * 2.13, -22.05, 2.6); arm.add(palm);
  // Each open hand has a palm, four three-jointed fingers and an opposed thumb.
  muscle(palm, [0, .55, 0], [side * .02, -1.2, .13], 1.12, .54, m.dark);
  mirroredPlate(palm, side, [[-.95, .75], [.86, .7], [1.07, -.35], [.72, -1.22], [-.79, -1.2], [-1.01, -.55]], .35, m.armour, 0, -.05, .48, .09);
  const digits=new T.Group(),fist=new T.Group();digits.name='Open titan fingers';fist.name='Closed striking fist';palm.add(digits,fist);
  for (let finger = 0; finger < 4; finger++) {
    const fx = (finger - 1.5) * .51, length = finger === 0 || finger === 3 ? .87 : 1.05;
    const y = -1.04 + Math.abs(finger - 1.5) * .09;
    const points = [[fx, y, .07], [fx + side * .06, y - length, .25], [fx + side * .05, y - length * 1.70, .60], [fx - side * .03, y - length * 2.19, .95]];
    for (let segment = 0; segment < 3; segment++) {
      const r = .235 - segment * .027;
      muscle(digits, points[segment], points[segment + 1], r, r * .83, segment === 1 ? m.dark : m.armour);
      sphere(digits, .25 - segment * .025, m.joint, ...points[segment], 1, .85, 1);
      if (segment === 0) box(digits, .25, .25, .14, m.edge, points[segment][0], points[segment][1], .34);
    }
    sphere(digits, .17, m.edge, ...points[3], 1, 1.22, .8);
    muscle(fist,[fx,-.76,.08],[fx,-1.12,.58],.27,.28,m.armour);
    muscle(fist,[fx,-1.12,.58],[fx,-.63,.89],.25,.24,m.dark);
    sphere(fist,.27,m.armour,fx,-1.08,.27,1,1,1.3);
  }
  const thumb = [[-side * .94, -.22, .15], [-side * 1.5, -1.02, .45], [-side * 1.48, -1.68, 1.03], [-side * 1.07, -1.84, 1.35]];
  for (let i = 0; i < 3; i++) {
    muscle(digits, thumb[i], thumb[i + 1], .29 - i * .035, .24 - i * .025, i === 1 ? m.dark : m.armour);
    sphere(digits, .27 - i * .028, m.joint, ...thumb[i]);
  }
  muscle(fist,[-side*.94,-.22,.35],[-side*.62,-.74,.94],.31,.28,m.armour);
  box(fist,1.64,.30,.67,m.armour,0,-1.17,.29);
  const marker=new T.Object3D();marker.name='Physical striking knuckle';marker.position.set(0,-1.33,.29);palm.add(marker);
  batchStatic(digits);digits.userData.noBatch=true;batchStatic(fist);fist.userData.noBatch=true;fist.visible=false;
  batchStatic(palm);palm.userData.noBatch=true;return {palm,digits,fist,marker};
}

function createArm(rig, limbs, side, m) {
  const arm = new T.Group(); arm.name = side < 0 ? 'Left articulated titan arm' : 'Right articulated titan arm';
  arm.position.set(side * 6.05, 43.7, .45); rig.add(arm);
  const elbow = [side * 2.2, -10.8, .5], wrist = [side * 2.13, -20.95, 2.45];
  joint(arm, side * .1, -.25, 0, 1.55, m.joint, m.edge);
  muscle(arm, [side * .3, -1, .03], [side * 1.98, -9.2, .4], 1.44, 1.53, m.flesh);
  muscle(arm, [side * .75, -2.6, .6], [side * 1.81, -7.8, .92], 1.26, 1.03, m.dark);
  mirroredPlate(arm, side, [[-.95, .2], [.93, .55], [1.46, -1.3], [2.02, -6.7], [1.47, -8], [.11, -6.7]], .9, m.armour, side * .05, -1.1, 1.25, .14);
  mirroredPlate(arm, side, [[-.36, 0], [.3, .1], [1.33, -5.4], [.8, -6.4], [.32, -5.6]], .16, m.light, side * .15, -2.15, 1.84, .07);
  for (const offset of [-.33, .33]) cable(arm, [[side * .5, -1.7, -.95 + offset], [side * 2.4, -6.9, -.9 + offset], [side * 2.3, -10, .08 + offset]], .105, m.cable);
  const forearmStart = arm.children.length;
  joint(arm, ...elbow, 1.12, m.joint, m.edge);
  mirroredPlate(arm, side, [[-.82, .75], [.8, .8], [1.22, -.2], [.25, -1.75], [-.6, -.7]], .63, m.armour, elbow[0], elbow[1], 1.32, .1);
  muscle(arm, [elbow[0], elbow[1] - .4, .5], [wrist[0], wrist[1] + .45, 2.32], 1.14, 1.22, m.dark);
  const forearm = mirroredPlate(arm, side, [[-1.25, .3], [1.24, .35], [1.68, -1.7], [1.12, -5.8], [.72, -8.25], [-.72, -8.3], [-1.18, -5.4]], .82, m.armour, side * 2.17, -12.05, 1.99, .16);
  forearm.rotation.x = -.15;
  mirroredPlate(arm, side, [[-.54, 0], [.65, .18], [1.02, -1.1], [.48, -6.3], [0, -7.2], [-.42, -6]], .23, m.light, side * 2.17, -12.55, 2.53, .08).rotation.x = -.15;
  mirroredPlate(arm, side, [[-.16, 0], [.18, 0], [.14, -4.55], [0, -5.3]], .10, m.trim, side * 2.17, -13.1, 2.74, .025).rotation.x = -.15;
  // Back-of-elbow fins and the open wrists expose the underlying creature.
  mirroredPlate(arm, side, [[-.48, 0], [.55, .1], [.42, -2.1], [0, -3.8], [-.35, -2]], .38, m.edge, side * 2.15, -11.2, -.95, .06);
  for (let i = 0; i < 4; i++) cylinder(arm, .76 - i * .03, .79 - i * .03, .22, m.joint, wrist[0], -20.3 - i * .3, 2.38, 18).scale.z = .92;
  const hand=createHand(arm, side, m);
  const lower = articulatedSection(arm,arm.children.slice(forearmStart),elbow,'Titan articulated elbow');
  batchStatic(arm); arm.userData.noBatch = true;
  limbs.push({ obj:arm, lower, hand, handVector:hand.palm.position.clone().add(hand.marker.position), side, phase:side>0?Math.PI:0, leg:false });
}

function torso(frame, m) {
  // Long abdominal column, narrow pelvis and a deep but high, athletic rib cage.
  sphere(frame, 1, m.dark, 0, 26.7, .05, 3.42, 2.62, 2.38);
  muscle(frame, [0, 27, 0], [0, 35.3, .1], 2.48, 2.0, m.dark);
  sphere(frame, 1, m.flesh, 0, 38.7, .05, 4.63, 6.25, 3.12);
  sphere(frame, 1, m.dark, 0, 42.8, .1, 4.83, 2.1, 3.13);
  for (const side of [-1, 1]) {
    muscle(frame, [side * 2.4, 34, .05], [side * 4.35, 41.6, -.25], 1.25, 2.0, m.dark);
    muscle(frame, [side * 3.45, 44.5, .1], [side * 6.1, 43.6, .3], 1.85, 2.15, m.flesh);
    mirroredPlate(frame, side, [[.15, 1.1], [3.72, 1.9], [4.72, .35], [3.32, -3.7], [1.2, -4.5], [.27, -2.35]], 1.05, m.armour, 0, 41.9, 2.94, .22);
    mirroredPlate(frame, side, [[.65, .6], [3.52, 1.27], [3.88, .45], [2.45, -1.96], [1.25, -2.78], [.68, -1.86]], .28, m.light, 0, 41.9, 3.65, .13);
    mirroredPlate(frame, side, [[.65, .72], [3.48, 1.38], [3.62, 1.10], [.89, .35]], .1, m.trim, 0, 41.9, 3.92, .04);
    mirroredPlate(frame, side, [[.6, .65], [2.48, .85], [3.36, -.15], [2.02, -2.9], [.57, -2.55]], .67, m.armour, 0, 27.25, 1.9, .14);
    // Sloped rib lamellae follow the taper, leaving charcoal gaps between plates.
    for (let i = 0; i < 5; i++) {
      const y = 37.9 - i * 1.6, width = 2.7 - i * .17, z = 2.65 - i * .16;
      mirroredPlate(frame, side, [[.35, .4], [width, .68], [width + .28, .05], [1.0, -.82], [.28, -.56]], .37, i % 2 ? m.dark : m.armour, 0, y, z, .1);
      beam(frame, [side * (width + .09), y + .27, 2], [side * (width + .58), y + .61, .5], .13, m.cable);
    }
    // The shoulder cap sits above the animated arm, with a taller independent pylon.
    muscle(frame,[side*4.75,45.0,.05],[side*6.35,42.7,.12],2.1,2.36,m.armour);
    mirroredPlate(frame, side, [[-1.42, -2.1], [1.42, -2.1], [1.68, -.15], [1.06, 3.9], [.32, 5.6], [-.89, 4.82], [-1.39, 1.0]], 2.25, m.armour, side * 6.1, 45.8, -.55, .2);
    mirroredPlate(frame, side, [[-.65, -.6], [.77, -.45], [.99, 3.63], [.25, 4.78], [-.59, 4.15]], .26, m.light, side * 6.1, 45.8, .79, .11);
    mirroredPlate(frame, side, [[-.55, 3.57], [.88, 3.19], [.88, 3.77], [.24, 4.64], [-.49, 4.15]], .12, m.trim, side * 6.1, 45.8, .99, .04);
    for (let i = 0; i < 4; i++) {
      const vent = box(frame, .83, .15, .13, m.joint, side * 6.11, 45.65 + i * .51, 1.01); vent.rotation.z = -side * .09;
    }
    cylinder(frame, .47, .47, .12, m.edge, side * 6.15, 43.95, 2.4, 20).rotation.x = Math.PI / 2;
  }
  // Sternum insert and neck are exposed between the shaped breastplates.
  plate(frame, [[-.32, 1.4], [.32, 1.4], [.56, -.65], [0, -2.35], [-.56, -.65]], .4, m.edge, 0, 40.25, 3.76, .08);
  plate(frame, [[-.15, .9], [.15, .9], [.23, -.51], [0, -1.18], [-.23, -.51]], .12, m.trim, 0, 40.45, 4.02, .04);
  muscle(frame, [0, 44.3, .25], [0, 49.1, 1.05], 1.56, 1.36, m.dark);
  for (const side of [-1, 1]) {
    muscle(frame,[side*3.8,43.4,-.7],[side*.8,48.4,.8],1.16,1.25,m.flesh);
    mirroredPlate(frame,side,[[.3,-.4],[2.34,-.5],[2.0,1.9],[1.03,3.6],[.49,2.8]],.56,m.armour,0,44.65,1.69,.13);
    mirroredPlate(frame,side,[[.56,1.0],[1.55,.2],[1.49,1.8],[.87,2.66]],.18,m.light,0,44.65,2.06,.07);
  }
  // Dorsal vertebrae are visible through the open space below the backpack.
  for (let i = 0; i < 7; i++) {
    const y = 29 + i * 2.05, z = -2.1 - Math.sin(i / 6 * Math.PI) * 1.1;
    sphere(frame, 1, m.joint, 0, y, z, .74, .57, .48);
    plate(frame, [[-.9, .44], [.9, .44], [1.1, -.18], [0, -.64], [-1.1, -.18]], .4, m.armour, 0, y, z - .26, .09);
  }
}

function head(frame, m) {
  const head = new T.Group(); head.name = 'Angular titan helmet'; head.position.set(0, 50.6, 1.5); frame.add(head);
  sphere(head, 1, m.dark, 0, .5, .15, 1.65, 2.33, 1.83);
  sphere(head, 1, m.armour, 0, 1.0, -.32, 1.89, 2.17, 1.76);
  for (const side of [-1, 1]) {
    mirroredPlate(head, side, [[.13, 2.9], [1.28, 2.23], [1.91, .58], [1.38, -.52], [.63, -.86], [.14, .1]], .65, m.armour, 0, 0, 1.25, .12);
    mirroredPlate(head, side, [[.68, .1], [1.68, .62], [1.91, -.56], [.86, -2.3], [.2, -2.85], [.17, -1.3]], .53, m.light, 0, 0, 1.45, .12);
    mirroredPlate(head, side, [[.27, .88], [1.62, 1.38], [1.38, .64], [.58, .4]], .13, m.joint, 0, 0, 1.94, .04);
    mirroredPlate(head, side, [[.45, .85], [1.43, 1.2], [1.24, .83], [.59, .66]], .12, m.eye, 0, 0, 2.04, .035);
    // Temple blades carry the angular silhouette backward without copying a crest.
    mirroredPlate(head, side, [[-.3, -1.7], [.65, -.8], [.7, 1.8], [.07, 3.35], [-.32, 1.2]], 1.2, m.armour, side * 1.64, .05, -.25, .1);
    mirroredPlate(head, side, [[-.1, -.7], [.19, -.5], [.2, 1.63], [-.07, 2.22]], .15, m.trim, side * 1.91, .07, .48, .025);
    sphere(head, .46, m.joint, side * 1.73, -.29, .33, .52, 1, 1);
    cylinder(head, .25, .25, .22, m.edge, side * 1.95, -.3, .34, 16).rotation.z = Math.PI / 2;
  }
  plate(head, [[0, 3.84], [.44, 2.14], [.34, .38], [0, -.4], [-.33, .38], [-.43, 2.14]], .61, m.armour, 0, 0, .74, .09);
  plate(head, [[-.19, 1.4], [.19, 1.4], [.31, -.48], [0, -1.45], [-.31, -.48]], .49, m.edge, 0, 0, 2.10, .06);
  plate(head, [[-.66, -.62], [.66, -.62], [.59, -1.58], [0, -2.31], [-.59, -1.58]], .43, m.joint, 0, 0, 1.97, .08);
  // A narrow, segmented mouth grille makes the face expressive at closer zooms.
  for (let i = -3; i <= 3; i++) {
    const y = -1.21 + Math.abs(i) * .034;
    box(head, .13, .23, .075, m.edge, i * .15, y, 2.28);
  }
  plate(head, [[-.47, -.27], [.47, -.27], [.36, -.66], [0, -1.31], [-.36, -.66]], .49, m.armour, 0, -1.24, 1.90, .09);
}

function backpackHarness(frame, m) {
  const strap = material('metal', 0x404247, { roughness: .68, metalness: .4 });
  const buckle = material('gold', 0x948969, { roughness: .65, metalness: .48 });
  const mountZ = KAIJU_CENTER.z + 4, wallZ = KAIJU_CENTER.z + 5.8;
  for (const side of [-1, 1]) {
    const points = [[side * 4.2, 42.3, wallZ], [side * 4.35, 45.9, -3.1], [side * 4.28, 46.6, .3], [side * 3.97, 44.0, 4.19], [side * 3.6, 39.5, 4.31], [side * 3.1, 33.6, 3.5], [side * 2.85, 27, 2.15]];
    shoulderStrap(frame, points, .95, .28, strap);
    for (const offset of [-.36, .36]) cable(frame, points.map(([x, y, z]) => [x + offset, y + .07, z + .035]), .035, buckle);
    const clasp = box(frame, 1.16, 1.55, .24, buckle, side * 3.75, 41.65, 4.58); clasp.rotation.z = side * .04;
    box(frame, .66, 1.03, .12, strap, side * 3.75, 41.65, 4.74);
    for (const y of [40.2, 43.2]) cylinder(frame, .11, .11, .12, buckle, side * 3.82, y, 4.63, 12).rotation.x = Math.PI / 2;
    // Narrow tower cradle: two feet support the foundation at y32, while
    // vertical backing rails restrain its forward wall up to shoulder height.
    beam(frame,[side*4.2,42.3,wallZ],[side*2.3,43.0,-2.9],.5,strap);
    box(frame,.55,14.3,.48,strap,side*4.2,40.65,wallZ+.18);
    beam(frame,[side*4.2,46.2,-3.5],[side*4.2,47.8,wallZ],.35,strap);
    for(const y of [34.0,42.3,47.4])box(frame,1.15,.76,.24,buckle,side*4.2,y,wallZ+.43);
    box(frame,1.18,12.8,.82,strap,side*2.3,36.7,-2.8);
    beam(frame,[side*2.3,31.7,-3.1],[side*3.6,31.7,mountZ],.58,strap);
    beam(frame,[side*2.8,26.1,-2.0],[side*3.6,31.5,mountZ],.46,strap);
    beam(frame,[side*3.1,28.7,wallZ+.3],[side*3.15,31.7,wallZ+.3],.27,buckle);
    box(frame,1.65,.66,2.2,strap,side*3.6,32.05,mountZ);
    beam(frame,[side*3.6,32.1,mountZ],[side*4.2,34,wallZ+.18],.32,strap);
    for(const [x,z] of [[2.3,-3.25],[3.15,wallZ+.3],[3.6,mountZ]])cylinder(frame,.18,.18,1.25,buckle,side*x,31.7,z,12).rotation.z=Math.PI/2;
  }
  waistBelt(frame, strap, buckle);
  beam(frame, [-4.3, 31.86, mountZ], [4.3, 31.86, mountZ], .39, strap);
}

// A tapered, curved organic outgrowth. Its changing cross-section distinguishes
// horns, tendons and claws from the cyborg's straight armour and metal cables.
function organicSweep(group, points, radii, mat, segments = 24) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
  const edges=24,geometry = new T.TubeGeometry(curve, segments, 1, edges, false);
  const position = geometry.attributes.position;
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments, centre = curve.getPointAt(t);
    const sample = t * (radii.length - 1), index = Math.min(radii.length - 2, Math.floor(sample));
    const radius = T.MathUtils.lerp(radii[index], radii[index + 1], sample - index);
    for (let edge = 0; edge <= edges; edge++) {
      const i = ring * (edges+1) + edge;
      position.setXYZ(i, centre.x + (position.getX(i) - centre.x) * radius,
        centre.y + (position.getY(i) - centre.y) * radius,
        centre.z + (position.getZ(i) - centre.z) * radius);
    }
  }
  geometry.computeVertexNormals();
  return addMesh(group, geometry, mat);
}

function organicMuscle(group, a, b, width, depth, mat) {
  const start = new T.Vector3(...a), direction = new T.Vector3(...b).sub(start);
  const centre = start.addScaledVector(direction, .5);
  // Rounded attachments overlap the articulated joints. The cyborg's narrow
  // tendon ends would expose ball hinges on an otherwise unarmoured creature.
  const profile = new T.SplineCurve([[0,-.63],[.43,-.57],[.73,-.45],
    [.96,-.23],[1,-.04],[.90,.23],[.68,.46],[.41,.57],[0,.63]].map(([r,y]) => new T.Vector2(r,y)));
  const mesh = addMesh(group, new T.LatheGeometry(profile.getPoints(20), 20), mat, centre.x, centre.y, centre.z);
  mesh.scale.set(width, direction.length(), depth);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize()); return mesh;
}

// These rounded section landmarks describe whole muscle compartments. The
// forward quadriceps plane, rear triceps mass and narrow tibial ridge differ
// from one another; they are not a common tube with more bumps attached.
const LIVING_SECTIONS={
  upperarm:{band:[-.8,-3,-5.5,-8],points:[[-.38,1],[.57,.96],[.94,.62],[1,-.32],[.45,-.94],[-.42,-1],[-.94,-.63],[-.94,.40]]},
  forearm:{band:[-13.6,-15.5,-18.4,-20.8],points:[[.20,1],[.78,.88],[1,.32],[.80,-.89],[-.48,-1],[-.88,-.61],[-.94,.17],[-.60,.86]]},
  thigh:{band:[-.8,-3,-5.8,-8.4],points:[[-.40,1],[.58,.97],[1,.47],[.92,-.56],[.20,-1],[-.70,-.94],[-.98,-.20],[-.88,.62]]},
  shin:{band:[-14,-16,-18.5,-21],points:[[-.15,1],[.48,.88],[.96,.35],[.88,-.70],[.18,-1],[-.74,-.90],[-1,-.10],[-.72,.59]]}
};
function sectionRadius(points,a){
  const x=Math.sin(a),z=Math.cos(a);let radius=Infinity;
  for(let i=0;i<points.length;i++){
    const p=points[i],q=points[(i+1)%points.length],ex=q[0]-p[0],ez=q[1]-p[1],den=x*ez-z*ex;
    if(Math.abs(den)<1e-8)continue;
    const t=(p[0]*ez-p[1]*ex)/den,u=(p[0]*z-p[1]*x)/den;
    if(t>0&&u>=-1e-8&&u<=1+1e-8)radius=Math.min(radius,t);
  }
  return radius;
}
function authoredLimbSections(positions,rows,edges,region,side){
  const section=LIVING_SECTIONS[region];if(!section)return;
  const [top,shoulder,bottom,end]=section.band,cols=edges+1;
  for(let row=0;row<rows.length;row++){
    const {c,r,exponent}=rows[row],weight=.76*T.MathUtils.smoothstep(-c.y,-top,-shoulder)*(1-T.MathUtils.smoothstep(-c.y,-bottom,-end));
    if(weight===0)continue;
    const start=row*cols*3;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(let j=0;j<cols;j++){const i=start+j*3;minX=Math.min(minX,positions[i]);maxX=Math.max(maxX,positions[i]);minZ=Math.min(minZ,positions[i+2]);maxZ=Math.max(maxZ,positions[i+2]);}
    for(let j=0;j<cols;j++){
      const i=start+j*3,a=j===edges?0:j/edges*Math.PI*2,sin=Math.sin(a),cos=Math.cos(a),mirrored=Math.atan2(sin*side,cos);
      // A short angular filter rounds the corners while leaving broad faces.
      const radius=(sectionRadius(section.points,mirrored-.075)+2*sectionRadius(section.points,mirrored)+sectionRadius(section.points,mirrored+.075))*.25;
      const oldX=c.x+Math.sign(sin)*Math.abs(sin)**exponent*r.x,oldZ=c.z+Math.sign(cos)*Math.abs(cos)**exponent*r.y;
      // Retain a restrained amount of the existing tissue relief. Its small
      // ridges no longer overwhelm the underlying anatomical cross-section.
      const targetX=T.MathUtils.clamp(c.x+sin*radius*r.x+(positions[i]-oldX)*.65,minX,maxX);
      const targetZ=T.MathUtils.clamp(c.z+cos*radius*r.y+(positions[i+2]-oldZ)*.65,minZ,maxZ);
      positions[i]=T.MathUtils.lerp(positions[i],targetX,weight);positions[i+2]=T.MathUtils.lerp(positions[i+2],targetZ,weight);
    }
  }
}

// Each loft remains one continuous skin envelope. Authored anatomical sections
// fade to zero before its original body, elbow/knee and wrist/ankle loops.
function organicLoft(group, sections, mat, relief, region='') {
  const centre=new T.CatmullRomCurve3(sections.map(p=>new T.Vector3(p[0],p[1],p[2])));
  const radii=new T.CatmullRomCurve3(sections.map(p=>new T.Vector3(p[3],p[4],0)));
  const rings=Math.max(48,sections.length*7),edges=48,positions=[],uv=[],indices=[],rows=[],upward=sections.at(-1)[1]>sections[0][1];
  for(let i=0;i<=rings;i++){
    const t=i/rings,c=centre.getPoint(t),r=radii.getPoint(t);
    const plane=region==='torso'?.31*formBell(t,.62,.27):region==='forearm'?.38*formBell(t,.61,.32):region==='shin'?.40*formBell(t,.51,.33):region==='thigh'?.27*formBell(t,.43,.34):region==='upperarm'?.28*formBell(t,.43,.34):.14*formBell(t,.43,.34),exponent=1-plane;
    rows.push({t,c,r,exponent});
    for(let j=0;j<=edges;j++){
      const a=j===edges?0:j/edges*Math.PI*2,sin=Math.sin(a),cos=Math.cos(a);
      // Rib cages, forearms and shins have broad planes around bone rather than
      // the circular cross-section of a hose. Rounded edges remain continuous.
      const sx=Math.sign(sin)*Math.abs(sin)**exponent,sz=Math.sign(cos)*Math.abs(cos)**exponent;
      const p=new T.Vector3(c.x+sx*Math.max(.025,r.x),c.y,c.z+sz*Math.max(.025,r.y));
      relief?.(p,a,t);positions.push(p.x,p.y,p.z);uv.push(j/edges,region?1-t:p.y*.105);
      if(i<rings&&j<edges){const v=i*(edges+1)+j,b=v+1,c=v+edges+1,d=c+1;indices.push(...(upward?[v,b,c,b,d,c]:[v,c,b,b,c,d]));}
    }
  }
  authoredLimbSections(positions,rows,edges,region,group.position.x<0?-1:1);
  for(const end of [0,rings]){
    const c=centre.getPoint(end/rings),v=positions.length/3;positions.push(c.x,c.y,c.z);uv.push(.5,c.y*.105);
    for(let j=0;j<edges;j++){const a=end*(edges+1)+j,b=a+1;indices.push(...((end===0)===upward?[v,b,a]:[v,a,b]));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  // Longitude has duplicate UV vertices; share its normal so a continuous chest
  // cannot acquire a hard lighting stripe down the otherwise smooth surface.
  const normals=geometry.attributes.normal;
  for(let ring=0;ring<=rings;ring++){const a=ring*(edges+1),b=a+edges,n=new T.Vector3().fromBufferAttribute(normals,a).add(new T.Vector3().fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);}
  geometry.userData.loft={rings,edges};
  // These temporary arm/leg lofts are joined into one skin below. Their
  // discarded materials need no texture requests; the final skin owns its map.
  const visibleSkin=region&&!['upperarm','forearm','thigh','shin'].includes(region);
  const mesh=addMesh(group,geometry,visibleSkin?anatomicalSkin(region):mat);mesh.name='Continuous anatomical skin';return mesh;
}

// Join two authored anatomical surfaces through one tangent-continuous band.
// The result has no elbow/knee end caps or intersecting cuffs to expose in a bend.
function joinedSkin(upper,lower,pivot,region='arm'){
  const a=upper.geometry.attributes.position,b=lower.geometry.attributes.position,edges=upper.geometry.userData.loft.edges,cols=edges+1;
  const closest=(p,rings,y)=>{let best=0,error=Infinity;for(let r=0;r<=rings;r++){const e=Math.abs(p.getY(r*cols)-y);if(e<error){error=e;best=r;}}return best;};
  const last=closest(a,upper.geometry.userData.loft.rings,pivot[1]+1.6),first=closest(b,lower.geometry.userData.loft.rings,pivot[1]-1.6),rows=[];
  const row=(p,r)=>Array.from({length:cols},(_,j)=>[p.getX(r*cols+j),p.getY(r*cols+j),p.getZ(r*cols+j)]);
  for(let r=0;r<=last;r++)rows.push(row(a,r));
  const p0=rows.at(-1),before=rows.at(-2),p1=row(b,first),after=row(b,first+1);
  for(let r=1;r<10;r++){const t=r/10,h00=2*t**3-3*t*t+1,h10=t**3-2*t*t+t,h01=-2*t**3+3*t*t,h11=t**3-t*t;
    rows.push(p0.map((p,j)=>p.map((v,k)=>{if(k===1)return v+(p1[j][k]-v)*t;const dy=p1[j][1]-p[1],m0=(v-before[j][k])*dy/(p[1]-before[j][1]),m1=(after[j][k]-p1[j][k])*dy/(after[j][1]-p1[j][1]);return h00*v+h10*m0+h01*p1[j][k]+h11*m1;})));
  }
  for(let r=first;r<=lower.geometry.userData.loft.rings;r++)rows.push(row(b,r));
  // Shape the connection itself, after the two lofts have been joined. This
  // keeps an elbow crease and the kneecap/condyles in the continuous skin.
  for(const row of rows){const cx=row.slice(0,edges).reduce((n,p)=>n+p[0]/edges,0),cz=row.slice(0,edges).reduce((n,p)=>n+p[2]/edges,0),depth=Math.max(.1,...row.map(p=>Math.abs(p[2]-cz)));
    for(const p of row){const joint=formBell(p[1],pivot[1],.95),front=Math.max(0,(p[2]-cz)/depth),back=Math.max(0,(cz-p[2])/depth),rx=p[0]-cx;
      if(region==='leg'){
        // A patella has a broad face, a narrow lower ligament and paired
        // condyles. Carve their transitions into one weighted skin, rather
        // than attaching a ball-shaped kneecap over the bend.
        const patella=formBell(p[1],pivot[1]+.12,.69),ligament=formBell(p[1],pivot[1]-1.12,.66);
        p[2]+=patella*(.27*front**3-.25*front*formBell(Math.abs(rx),.74,.20));
        p[2]+=ligament*(.15*front**7-.12*front*formBell(Math.abs(rx),.40,.15));
        p[2]-=.16*formBell(p[1],pivot[1]+.94,.22)*front;
        p[0]-=rx*.115*joint*front;
        p[0]+=Math.sign(rx)*.075*joint*formBell(Math.abs(rx),1.04,.25)*(1-front*.65);
      }
      else{p[2]-=joint*(.24*front+.12*back**4);p[0]-=rx*.12*joint*front;}
    }
  }
  const positions=[],uv=[],indices=[],top=rows[0][0][1],bottom=rows.at(-1)[0][1];
  for(let r=0;r<rows.length;r++)for(let j=0;j<cols;j++){const p=rows[r][j];positions.push(...p);uv.push(j/edges,(p[1]-bottom)/(top-bottom));if(r<rows.length-1&&j<edges){const i=r*cols+j;indices.push(i,i+cols,i+1,i+1,i+cols,i+cols+1);}}
  for(const r of[0,rows.length-1]){const centre=rows[r].slice(0,edges).reduce((c,p)=>c.map((v,k)=>v+p[k]/edges),[0,0,0]),index=positions.length/3;positions.push(...centre);uv.push(.5,r===0?1:0);for(let j=0;j<edges;j++)indices.push(...(r===0?[index,r*cols+j,r*cols+j+1]:[index,r*cols+j+1,r*cols+j]));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const normals=g.attributes.normal;for(let r=0;r<rows.length;r++){const i=r*cols,j=i+edges,n=new T.Vector3().fromBufferAttribute(normals,i).add(new T.Vector3().fromBufferAttribute(normals,j)).normalize();normals.setXYZ(i,n.x,n.y,n.z);normals.setXYZ(j,n.x,n.y,n.z);}
  upper.removeFromParent();lower.removeFromParent();upper.geometry.dispose();lower.geometry.dispose();return g;
}

function bindLivingSkin(parent,frame,lower,foot,geometry,mat,pivot,region){
  const bones=[frame,parent,lower,...(foot?[foot]:[])].map((owner,i)=>{const bone=new T.Bone();bone.name=`${region} skin anchor ${i}`;owner.add(bone);return bone;});
  const p=geometry.attributes.position,indices=[],weights=[],smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  for(let i=0;i<p.count;i++){
    const y=p.getY(i),body=smooth(-2.2,1.2,y),distal=1-smooth(pivot[1]-2.2,pivot[1]+2.2,y),ankle=foot?1-smooth(-23.4,-20.8,y):0;
    indices.push(0,1,2,foot?3:2);weights.push(body,(1-body)*(1-distal),(1-body)*distal*(1-ankle),(1-body)*distal*ankle);
  }
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  // Contractile tissue changes volume through a bend while the bones, planted
  // soles and striking marker retain their authored positions. The response
  // fades to zero at all attachments, rather than sliding a muscle over a joint.
  const flex=[],release=[],leg=region==='leg';
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),along=leg?-y/24:-y/22;
    const cx=leg?.3:(1.1+1.05*Math.tanh((-y-5)/4)),side=parent.position.x<0?-1:1,rx=x-side*cx;
    const upper=formBell(along,.24,.15),lowerForm=formBell(along,.65,.15),anchor=Math.min(1,Math.max(0,-y/2))*Math.min(1,Math.max(0,(y+(leg?21:19))/3));
    const contraction=anchor*(upper*.075+lowerForm*.052),tendon=anchor*formBell(along,.43,.075);
    flex.push(x+rx*contraction,y,z+(z>0?1:-.7)*contraction*2.1-tendon*.045);
    release.push(x-rx*anchor*.026*upper,y,z-anchor*.11*upper+anchor*.065*lowerForm);
  }
  geometry.morphAttributes.position=[new T.Float32BufferAttribute(flex,3),new T.Float32BufferAttribute(release,3)];sculptedMorphNormals(geometry);
  const mesh=new T.SkinnedMesh(geometry,anatomicalSkin(region));mesh.name=`Continuous weighted ${region} skin`;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.noBatch=true;mesh.userData.skinRegion=region;mesh.boundingSphere=new T.Sphere(new T.Vector3(),32);parent.add(mesh);
  mesh.updateMorphTargets();parent.updateWorldMatrix(true,true);frame.updateWorldMatrix(true,true);mesh.bind(new T.Skeleton(bones));return mesh;
}

const anatomicalMaterials=new Map();
const formBell=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
function sculptedMorphNormals(geometry){
  geometry.morphAttributes.normal=geometry.morphAttributes.position.map(position=>{const sculpt=new T.BufferGeometry();sculpt.setAttribute('position',position);sculpt.setIndex(geometry.index);sculpt.computeVertexNormals();return sculpt.attributes.normal;});
}
function anatomicalSkin(region){
  if(anatomicalMaterials.has(region))return anatomicalMaterials.get(region);
  const {map,roughnessMap,bumpMap}=skinSurfaceSet(region);
  const mat=new T.MeshPhysicalMaterial({color:0xffffff,map,roughnessMap,bumpMap,bumpScale:.095,roughness:.80,metalness:0,sheen:.18,sheenColor:0x935343,sheenRoughness:.85,specularIntensity:.35});mat.name='Anatomical skin: '+region;mat.userData.shared=true;anatomicalMaterials.set(region,mat);return mat;
}

let fleshTexture,fleshBump;
const fleshMaterials=new Map();
function fleshMaterial(colour,roughness=.8){
  const key=colour+':'+roughness;if(fleshMaterials.has(key))return fleshMaterials.get(key);
  if(!fleshTexture){
    const size=256,canvas=document.createElement('canvas'),bump=document.createElement('canvas');canvas.width=canvas.height=bump.width=bump.height=size;
    const c=canvas.getContext('2d'),b=bump.getContext('2d'),pixels=c.createImageData(size,size),pores=b.createImageData(size,size);
    const hash=(x,y,n)=>{const v=Math.sin(((x%n+n)%n)*127.1+((y%n+n)%n)*311.7)*43758.5453;return v-Math.floor(v);};
    const noise=(u,v,n)=>{const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy,n),hash(ix+1,iy,n),sx),T.MathUtils.lerp(hash(ix,iy+1,n),hash(ix+1,iy+1,n),sx),sy);};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x/size,v=y/size,i=(y*size+x)*4,large=noise(u,v,4),small=noise(u,v,16),tone=(large-.5)*46+(small-.5)*9,flush=Math.max(0,large-.52)*47;
      pixels.data.set([197+tone+flush,193+tone-flush*.32,186+tone-flush*.72,255],i);
      const crease=Math.sin(u*Math.PI*2*23+noise(u,v,8)*3)*1.8,grain=(noise(u,v,64)-.5)*8;
      pores.data.set([128+crease+grain,128+crease+grain,128+crease+grain,255],i);
    }
    c.putImageData(pixels,0,0);b.putImageData(pores,0,0);
    fleshTexture=new T.CanvasTexture(canvas);fleshTexture.colorSpace=T.SRGBColorSpace;fleshBump=new T.CanvasTexture(bump);
    for(const texture of [fleshTexture,fleshBump]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;}
  }
  const mat=material('skin',colour,{roughness,metalness:0}).clone();mat.name='Mottled living skin';mat.map=fleshTexture;mat.bumpMap=fleshBump;mat.bumpScale=.075;
  fleshMaterials.set(key,mat);return mat;
}

function organicTorso(frame, m) {
  const bell=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
  const torsoSkin=organicLoft(frame,[[0,24.15,.2,.28,.45],[0,25.5,-.50,3.03,2.31],[0,27.8,-.62,3.82,2.61],
    [0,29.5,-.44,3.24,2.33],[0,31.3,-.25,2.62,2.02],[0,34.2,-.45,3.32,2.45],
    [0,37.3,-.61,4.64,3.03],[0,40.7,-.58,5.56,3.09],[0,42.7,-.4,5.79,2.95],
    [0,44.0,-.15,5.62,2.62],[0,45.35,.02,4.36,2.36],[0,46.7,.48,3.08,1.97],
    [0,47.8,.95,2.09,1.60],[0,48.8,1.08,1.71,1.39]],m.skin,(p,a)=>{
      const front=Math.max(0,Math.cos(a)),back=Math.max(0,-Math.cos(a)),side=Math.abs(Math.sin(a));
      // Pectoral, abdominal and oblique changes are relief in the same mesh,
      // leaving smooth transitions instead of disconnected oval muscle pieces.
      p.z+=front*(1.04*bell(p.y,41.4,1.76)*bell(Math.abs(p.x),2.28,1.60)-.16*bell(p.x,0,.30)*bell(p.y,39.8,4.8));
      p.z+=front*.59*bell(p.y,42.1,3.35)*(.62+.38*side);
      p.z+=front*.70*bell(Math.abs(p.x),3.75,.82)*bell(p.y,42.5,2.85);
      p.z-=front*.34*bell(p.y,39.2+.16*Math.abs(p.x),.38)*bell(Math.abs(p.x),2.24,1.47);
      p.z+=front*.36*bell(p.y,44.16-.22*Math.abs(p.x),.35)*bell(Math.abs(p.x),2.2,1.9);
      for(let i=0;i<3;i++){p.z+=front*.43*bell(p.y,36.4-i*1.82,.70)*bell(Math.abs(p.x),.94,.73);p.z-=front*.11*bell(p.y,35.48-i*1.82,.22)*bell(Math.abs(p.x),1.12,.86);}
      p.z-=back*.38*bell(p.y,40.8,3.5)*side;
      p.x+=Math.sign(p.x)*.32*side*bell(p.y,36.8,3)*Math.sin((p.y-34)*2.1+side*.9);
      p.z+=front*.27*side*bell(p.y,28.9+Math.abs(p.x)*.23,.46);
      p.z-=front*.26*side*bell(p.y,30.0+Math.abs(p.x)*.15,.44);
      const neckLine=1.10+(49.25-p.y)*.37;
      p.z+=front*.42*bell(Math.abs(p.x),neckLine,.32)*bell(p.y,47.1,2.30);
      p.z-=front*.18*bell(Math.abs(p.x),.55,.40)*bell(p.y,47.4,1.80);
      // A fan-shaped chest inserts beneath the clavicle; the lower rib margin
      // narrows into obliques rather than continuing as a straight torso tube.
      p.z+=front*.44*bell(p.y,42.6-.28*Math.abs(p.x),.78)*bell(Math.abs(p.x),2.70,1.85);
      p.z-=front*.23*bell(p.y,38.65+.39*Math.abs(p.x),.27)*bell(Math.abs(p.x),3.42,.95);
      p.x+=Math.sign(p.x)*side*.43*bell(p.y,38.6,2.1);
      p.z-=back*.37*bell(Math.abs(p.x),2.8,1.1)*bell(p.y,42.8,2.3);
      p.z-=back*.38*bell(Math.abs(p.x),1.60,1.45)*bell(p.y,27.3,1.7);
      p.z+=front*.34*bell(Math.abs(p.x),2.15,.50)*bell(p.y,28.7,1.15);
      // The trapezius rises into the nape; the sternocleidomastoid inserts into
      // a broad clavicle. These are changes to the same envelope, not cuffs.
      p.z-=back*.66*bell(p.y,45.1,2.2)*bell(Math.abs(p.x),2.1,1.7);
      p.z+=front*.30*bell(p.y,44.7-Math.abs(p.x)*.19,.36)*bell(Math.abs(p.x),2.6,1.9);
      p.z-=front*.26*bell(p.y,45.2,.38)*bell(p.x,0,.55);
      p.z+=front*.27*bell(Math.abs(p.x),.78+(48.2-p.y)*.38,.23)*bell(p.y,46.6,1.7);
      // Interlocking serratus, external obliques and a weighted lower abdomen
      // give the torso planes at ordinary play distance, not only a texture.
      const ax=Math.abs(p.x),flank=bell(ax,2.75,1.05)*bell(p.y,36.9,3.6);
      p.z+=front*flank*(.20*Math.cos((p.y+ax*.58)*3.7)-.12);
      p.z-=front*.25*bell(ax,1.43+(37-p.y)*.13,.18)*bell(p.y,33.8,3.4);
      p.z+=front*.37*bell(p.y,30.25,1.35)*bell(ax,1.05,1.30);
      p.z-=front*.23*bell(p.x,0,.30)*bell(p.y,31.1,.30);
      p.z-=front*.17*bell(p.y,40.4+.61*p.x,.07)*bell(p.x,-1.75,1.1);
      p.z-=front*.11*bell(p.y,40.17+.61*p.x,.06)*bell(p.x,-1.75,1.1);
      p.z+=front*.13*bell(p.y,46.3,.25)*bell(ax,.42,.28);
      p.z-=back*.19*Math.cos(p.y*3.4)*bell(p.y,46.25,1.4)*bell(ax,0,1.8);
      p.z-=front*.32*bell(p.y,43.85-.25*ax,.22)*bell(ax,2.5,1.4);
      p.z-=front*.34*bell(ax,4.05,.40)*bell(p.y,40.5,1.55);
      p.x-=Math.sign(p.x)*side*.25*bell(p.y,33.6,1.1);
      p.z-=front*.30*bell(ax,1.82+.17*(36-p.y),.22)*bell(p.y,34.4,2.6);
    },'torso');
  const source=torsoSkin.geometry.attributes.position,breath=[],recovery=[];
  for(let i=0;i<source.count;i++){
    const x=source.getX(i),y=source.getY(i),z=source.getZ(i),chest=bell(y,40.7,4.3),upper=bell(y,40.8,5.0),attachment=1-bell(Math.abs(x),5.7,1.5),a=.083*upper*attachment;
    breath.push(x*(1+.030*chest*attachment),y+.09*chest,z+(z>0?.43:-.16)*chest*attachment);
    recovery.push(x*Math.cos(a)-z*Math.sin(a),y-.25*upper*Math.min(1,Math.abs(x)/5)*attachment,x*Math.sin(a)+z*Math.cos(a));
  }
  torsoSkin.geometry.morphAttributes.position=[new T.Float32BufferAttribute(breath,3),new T.Float32BufferAttribute(recovery,3)];sculptedMorphNormals(torsoSkin.geometry);torsoSkin.updateMorphTargets();torsoSkin.userData.noBatch=true;torsoSkin.name='Breathing flesh torso';
  frame.userData.fleshAnatomy={torso:torsoSkin};
  for (const side of [-1, 1]) {
    // Blunt shoulder osteoderms and swept bone horns create a living silhouette.
    for (let i = 0; i < 3; i++) {
      const x = side * (4.95 + i * .57), y = 44.9 - i * .28;
      organicSweep(frame, [[x, y, -.2], [x + side * .65, y + .9, -.35],
        [x + side * (1.3 - i * .12), y + 1.5 - i * .13, -.65]], [.52, .31, .015], m.bone, 15);
    }
  }
}

function organicHead(frame, m) {
  const skull = new T.Group(); skull.name = 'Living titan skull, jaw and swept horns';
  skull.position.set(0, 49.5, 1.5); frame.add(skull);
  skull.userData.noBatch=true;frame.userData.fleshAnatomy.head=skull;
  // Cheek, muzzle, chin and nape share one envelope. The jaw opens through a
  // local soft-tissue morph, so a circular cut can never separate the face.
  const face=organicLoft(skull,[[0,-2.43,.70,.96,.48],[0,-2.23,.80,1.45,.91],[0,-1.93,.73,1.81,1.24],
    [0,-1.47,.40,1.99,1.39],[0,-1.10,.30,1.88,1.48],[0,-.86,.20,1.90,1.62],[0,-.55,.16,1.98,1.72],[0,-.30,.08,2.05,1.79],
    [0,.37,-.04,2.14,1.90],[0,1.08,-.22,2.18,2.04],[0,1.85,-.43,2.02,1.85],
    [0,2.60,-.56,1.68,1.48],[0,3.12,-.64,.94,.88],[0,3.40,-.67,.03,.06]],m.skin,(p,a)=>{
      const front=Math.max(0,Math.cos(a)),x=Math.abs(p.x);
      p.z+=front*(.38*formBell(p.y,-.34,.40)*formBell(x,.36,.97)+.43*formBell(p.y,.62,.95)*formBell(x,0,.37));
      p.z-=front*.69*formBell(x,1.24,.45)*formBell(p.y,.47,.33);
      p.z+=front*.79*formBell(x,1.20,.63)*formBell(p.y,.72+.27*x,.26);
      p.z+=front*.36*formBell(x,1.56,.47)*formBell(p.y,-.05,.32);
      p.x+=Math.sign(p.x)*.16*formBell(p.y,.02,.40)*formBell(x,1.80,.37);
      p.z-=front*.18*formBell(x,1.29,.19)*formBell(p.y,-.42,.36);
      p.z+=front*.27*formBell(p.y,1.22,.21)*formBell(x,1.12,.86);
      p.z-=front*.19*formBell(p.y,1.9,.52)*formBell(x,0,.22);
      p.z+=front*.25*formBell(x,1.75,.34)*formBell(p.y,-.33,.52);
      p.z+=front*.46*formBell(p.y,-1.93,.52);
      p.z-=front*.15*formBell(p.x,0,.24)*formBell(p.y,-2.02,.26);
      p.z+=front*.20*formBell(x,1.51,.30)*formBell(p.y,-1.35,.40);
      p.z-=front*.40*formBell(p.y,-.94,.105)*formBell(x,0,1.0);
      p.z+=front*.11*formBell(p.y,-.75,.10)*formBell(x,0,.94);
      p.z+=front*.17*formBell(p.y,-1.13,.12)*formBell(x,0,.91);
      p.z-=front*.13*formBell(x,1.05,.16)*formBell(p.y,-.92,.26);
      p.z-=front*.21*formBell(x,1.70,.39)*formBell(p.y,.88,.29);
    },'head');
  const skin=face.geometry.attributes.position,opening=[];
  for(let i=0;i<skin.count;i++){const x=skin.getX(i),y=skin.getY(i),z=skin.getZ(i),jaw=T.MathUtils.smoothstep(-y,.78,1.42)*(1-.82*T.MathUtils.smoothstep(Math.abs(x),1.15,2.12)),a=.115*jaw;opening.push(x,-.82+(y+.82)*Math.cos(a)-(z-.30)*Math.sin(a),.30+(y+.82)*Math.sin(a)+(z-.30)*Math.cos(a));}
  face.geometry.morphAttributes.position=[new T.Float32BufferAttribute(opening,3)];sculptedMorphNormals(face.geometry);face.updateMorphTargets();face.userData.noBatch=true;face.name='Continuous cheek and jaw';frame.userData.fleshAnatomy.face=face;
  const mouth=sphere(skull,1,m.mouth,0,-.94,1.84,.85,.059,.12);mouth.userData.noBatch=true;frame.userData.fleshAnatomy.mouth=mouth;
  const eyes=[];frame.userData.fleshAnatomy.eyes=eyes;
  for (const side of [-1, 1]) {
    // A deep orbit supports a wet amber globe, with actual eyelid contours.
    sphere(skull,1,m.mouth,side*1.26,.48,1.46,.49,.31,.23);
    const globe=sphere(skull,1,m.eye,side*1.26,.49,1.60,.28,.105,.11),pupil=sphere(skull,1,m.pupil,side*1.26,.49,1.71,.055,.095,.024);
    const lid=organicSweep(skull,[[side*.88,.44,1.68],[side*1.18,.61,1.75],[side*1.57,.74,1.44]], [.14,.16,.055],m.ridge,18);
    for(const part of[globe,pupil,lid])part.userData.noBatch=true;eyes.push({globe,pupil,lid,side});
    organicSweep(skull,[[side*.89,.41,1.62],[side*1.22,.37,1.62],[side*1.56,.47,1.44]], [.075,.095,.035],m.skin,18);
    sphere(skull,1,m.mouth,side*.46,-.28,2.13,.14,.080,.027);
    // Fine orbital folds and a warm fleshy nostril rim have restrained thickness.
    for(let fold=0;fold<3;fold++)organicSweep(skull,[[side*1.43,.03-fold*.095,1.65-fold*.035],[side*1.70,.03-fold*.13,1.44-fold*.06],[side*1.84,-.08-fold*.13,1.08]], [.021,.036,.008],m.ridge,16);
    organicSweep(skull,[[side*.30,-.30,2.12],[side*.44,-.18,2.18],[side*.60,-.30,2.05]], [.042,.073,.014],m.warm,18);
    organicSweep(skull, [[side * 1.58, 2.06, -.65], [side * 2.4, 2.6, -1.0],
      [side * 3.0, 3.72, -1.75], [side * 2.75, 5.05, -2.65]], [.73, .61, .31, .012], m.bone, 30);
    organicSweep(skull, [[side * 1.95, -.15, -.2], [side * 2.53, .2, -.85],
      [side * 2.77, 1.12, -1.8]], [.43, .29, .012], m.ridge, 18);
    // Larger outer fangs frame shorter teeth; no metal mouth grille remains.
    for (let i = 0; i < 3; i++) {
      const x = side * (.30 + i * .29), fang = i === 2 ? .22 : .07,z=1.99-Math.abs(x)*.29;
      organicSweep(skull, [[x, -.77-i*.038, z], [x * .98, -.77-i*.038 - fang * .64, z+.035],
        [x * .95, -.77-i*.038 - fang, z]], [.07 + i * .012, .048, .004], m.tooth, 12);
    }
  }
  for (let i = 0; i < 3; i++) organicSweep(skull,
    [[0, 2.48 - i * .16, -.4 - i * .63], [0, 3.42 - i * .14, -.65 - i * .68],
      [0, 3.72 - i * .18, -1.2 - i * .72]], [.37, .23, .01], m.ridge, 14);
}

function organicHand(arm, side, m) {
  m={...m,skin:m.extremity,warm:m.extremityWarm,ridge:m.extremityRidge};
  const palm = new T.Group(); palm.position.set(side * 2.13, -22.05, 2.6); arm.add(palm);
  // The continuous forearm skin now forms the wrist and palm itself. The
  // opposed thumb pad inserts into it without a separate glove-shaped cuff.
  sphere(palm, 1, m.warm, -side * .56, -.58, .29, .48, .69, .29);
  const digits = new T.Group(), fist = new T.Group(),fingers=[];
  digits.name = 'Open titan fingers'; fist.name = 'Closed striking fist'; palm.add(digits, fist);
  for (let finger = 0; finger < 4; finger++) {
    const fx = (finger - 1.5) * .53, length = finger === 0 || finger === 3 ? .88 : 1.07;
    const digitStart=digits.children.length;
    const y = -1.02 + Math.abs(finger - 1.5) * .08;
    const points = [[fx, y, .10], [fx + side * .05, y - length, .31],
      [fx + side * .04, y - length * 1.65, .66], [fx - side * .02, y - length * 2.04, 1.00]];
    const fingerSkin=organicSweep(digits,points,[.255,.25,.22,.18],m.skin,30);
    // Flatten the dorsal plane and form each knuckle in the continuous
    // envelope. The tips and maximum finger radius retain their old extent.
    const digitCurve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),fp=fingerSkin.geometry.attributes.position;
    for(let ring=0;ring<=30;ring++){
      const t=ring/30,c=digitCurve.getPointAt(t),joint=1-.12*formBell(t,.16,.06)-.10*formBell(t,.55,.06);
      for(let edge=0;edge<=24;edge++){
        const index=ring*25+edge,dx=fp.getX(index)-c.x,dz=fp.getZ(index)-c.z;
        fp.setXYZ(index,c.x+dx*joint,fp.getY(index),c.z+dz*(dz<0?.78:.92)*joint);
      }
    }
    fingerSkin.geometry.computeVertexNormals();
    const tip = points[3];
    organicSweep(digits, [tip, [tip[0], tip[1] - .35, tip[2] + .26],
      [tip[0], tip[1] - .42, tip[2] + .72]], [.20, .13, .008], m.claw, 12);
    fingers.push(articulatedSection(digits,digits.children.slice(digitStart),points[0],`Living finger ${finger+1}`));
    organicMuscle(palm, [fx * .52, .22, -.27], [fx, -.98, -.24], .055, .045, m.ridge);
    organicMuscle(fist, [fx, -.69, .08], [fx, -1.11, .56], .31, .31, m.skin);
    organicMuscle(fist, [fx, -1.11, .56], [fx, -.53, .91], .28, .27, m.skin);
    sphere(fist, .29, m.ridge, fx, -1.10, .29, 1, 1, 1.24);
    organicSweep(fist, [[fx, -.48, .84], [fx, -.29, .55], [fx, -.49, .36]], [.14, .09, .006], m.claw, 10);
  }
  const thumb = [[-side * .97, -.17, .11], [-side * 1.57, -.94, .41],
    [-side * 1.55, -1.56, .92], [-side * 1.10, -1.78, 1.28]];
  for (let i = 0; i < 3; i++) organicMuscle(digits, thumb[i], thumb[i + 1], .33 - i * .04, .28 - i * .03, m.skin);
  organicSweep(digits, [thumb[3], [-side * .81, -1.85, 1.63], [-side * .51, -1.74, 1.81]], [.21, .12, .008], m.claw, 12);
  organicMuscle(fist, [-side * .96, -.2, .32], [-side * .57, -.78, .95], .34, .31, m.skin);
  const marker = new T.Object3D(); marker.name = 'Physical striking knuckle'; marker.position.set(0, -1.33, .29); palm.add(marker);
  const tissue=new Set([m.skin,m.warm,m.ridge]),surface=anatomicalSkin('arm'),v=new T.Vector3(),matrix=new T.Matrix4();palm.updateWorldMatrix(true,true);const inverse=palm.matrixWorld.clone().invert();
  palm.traverse(part=>{if(!part.isMesh||!tissue.has(part.material))return;part.material=surface;if(part.geometry.userData.shared){part.geometry=part.geometry.clone();part.geometry.userData.shared=false;}matrix.multiplyMatrices(inverse,part.matrixWorld);const p=part.geometry.attributes.position,uv=part.geometry.attributes.uv;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(matrix);uv.setXY(i,((Math.atan2(v.x,v.z)+Math.PI*2)%(Math.PI*2))/(Math.PI*2),0);}});
  batchStatic(digits); digits.userData.noBatch = true; batchStatic(fist); fist.userData.noBatch = true; fist.visible = false;
  batchStatic(palm); palm.userData.noBatch = true; return { palm, digits, fist, marker,fingers };
}

function organicArm(rig, limbs, side, m, frame) {
  const arm = new T.Group(); arm.name = side < 0 ? 'Left articulated titan arm' : 'Right articulated titan arm';
  arm.position.set(side * 6.05, 43.7, .45); rig.add(arm);
  const elbow = [side * 2.2, -10.8, .5], wrist = [side * 2.13, -20.95, 2.45];
  const upperSkin=organicLoft(arm,[[side*-2.05,1.24,-.12,.58,.95],[side*-.75,.56,-.12,1.67,1.91],[side*.08,.05,-.12,1.90,1.99],
    [side*.47,-2.25,-.1,2.03,1.95],[side*1.14,-5.2,.19,1.83,1.76],
    [side*1.82,-8.25,.44,1.36,1.38],[side*2.17,-10.4,.46,1.08,1.06],
    [side*2.2,-11.55,.5,.69,.78]],m.skin,(p,a,t)=>{
      const front=Math.max(0,Math.cos(a)),back=Math.max(0,-Math.cos(a)),outer=Math.max(0,Math.sin(a)*side);
      const deltoid=.32*formBell(t,.17,.15)-.34*formBell(t,.31+.06*outer,.050);
      p.x+=Math.sin(a)*deltoid;p.z+=Math.cos(a)*deltoid;
      p.z+=front*(.55*formBell(t,.47,.20)-.21*formBell(t,.70,.038));
      p.z-=back*.34*formBell(t,.39,.22);
      const biceps=.43*formBell(Math.sin(a),-.18*side,.42)*formBell(t,.48,.20);
      p.z+=front*biceps;
      p.z-=front*.17*formBell(Math.sin(a),.57*side,.17)*formBell(t,.49,.28);
      p.x+=side*.28*outer*formBell(t,.22,.16);
      p.z-=back*.31*formBell(Math.abs(Math.sin(a)),.46,.25)*formBell(t,.45,.22);
      p.z-=front*.30*formBell(Math.sin(a),side*.60,.18)*formBell(t,.47,.22);
      p.x-=side*.20*outer*formBell(t,.61,.13);
    },'upperarm');
  const forearmStart = arm.children.length;
  const lowerSkin=organicLoft(arm,[[side*2.2,-9.92,.39,.94,.93],[side*2.2,-10.85,.39,1.18,1.20],
    [side*2.43,-13.2,.82,1.58,1.67],[side*2.47,-15.7,1.47,1.31,1.36],
    [side*2.25,-18.7,2.12,.93,.97],[side*2.13,-20.9,2.43,.74,.78],
    [side*2.13,-21.8,2.50,.71,.65],[side*2.13,-22.45,2.64,.91,.55],
    [side*2.13,-23.20,2.73,.99,.39]],m.skin,(p,a,t)=>{
      const front=Math.max(0,Math.cos(a)),back=Math.max(0,-Math.cos(a));
      p.z-=back*.37*formBell(t,.10,.08);p.z-=front*.17*formBell(t,.12,.026);
      p.z+=.24*Math.cos(a*2)*Math.sin(t*Math.PI);
      p.x+=Math.sin(a)*(.18*formBell(t,.32,.18)+.11*formBell(t,.88,.07));
      const pronator=formBell(Math.sin(a),side*(.55-.76*t),.31)*formBell(t,.42,.28);
      p.z+=front*.32*pronator;
      p.z-=front*.12*formBell(Math.sin(a),-side*.42,.15)*formBell(t,.59,.26);
      p.x+=side*.15*formBell(t,.69,.23)*Math.sin(a*2);
      p.z-=front*.25*formBell(Math.sin(a),side*.49,.13)*formBell(t,.52,.27);
      // Paired wrist tendons enter a flatter, fan-shaped palm. These are
      // recessed channels and planes inside the existing hand envelope.
      const wristBand=formBell(t,.78,.105),palmBand=formBell(t,.925,.075),across=Math.sin(a);
      p.z-=back*(.20*wristBand+.13*palmBand);
      p.z-=front*.18*wristBand*(formBell(across,-.32,.13)+formBell(across,.34,.13));
      p.z-=back*.11*palmBand*(formBell(across,-.55,.13)+formBell(across,0,.13)+formBell(across,.55,.13));
      p.x-=Math.sin(a)*.095*wristBand;
    },'forearm');
  organicSweep(arm, [[side * 2.84, -12.1, -.07], [side * 3.80, -12.35, -.46],
    [side * 4.34, -13.05, -.65]], [.49, .29, .012], m.bone, 15);
  const hand = organicHand(arm, side, m);
  const lowerChildren=arm.children.slice(forearmStart).filter(o=>o!==lowerSkin),skinGeometry=joinedSkin(upperSkin,lowerSkin,elbow);
  const lower = articulatedSection(arm,lowerChildren,elbow,'Titan articulated elbow');
  const skin=bindLivingSkin(arm,frame,lower,null,skinGeometry,m.skin,elbow,'arm');
  batchStatic(arm); arm.userData.noBatch = true;
  limbs.push({ obj: arm, lower, hand, skin,handVector: hand.palm.position.clone().add(hand.marker.position), side, phase: side > 0 ? Math.PI : 0, leg: false });
}

function organicLeg(rig, limbs, side, m, frame) {
  const leg = new T.Group(); leg.name = side < 0 ? 'Left articulated titan leg' : 'Right articulated titan leg';
  leg.position.set(side * 2.8, 25.5, .1); rig.add(leg);
  const knee = [side * .45, -11.2, .8], ankle = [side * .18, -23.2, -.7];
  const upperSkin=organicLoft(leg,[[-side*.70,1.85,-.20,.90,1.11],[0,.35,-.18,1.76,1.96],[0,-.25,-.09,1.87,1.99],
    [-side*.08,-3.0,.14,2.17,2.16],[side*.14,-6.1,.49,1.88,1.9],
    [side*.4,-8.7,.70,1.47,1.43],[side*.45,-10.6,.8,1.20,1.13],
    [side*.45,-11.85,.8,.87,.82]],m.skin,(p,a,t)=>{
      const front=Math.max(0,Math.cos(a));
      p.z+=front*(.43*formBell(t,.40,.25)-.22*formBell(t,.74,.039));
      p.z-=Math.max(0,-Math.cos(a))*.22*formBell(t,.37,.24);
      p.x+=Math.sin(a)*(.27*formBell(t,.30,.24)+.18*formBell(t,.74,.10));
      p.z-=front*.11*formBell(Math.abs(Math.sin(a)),.55,.13)*formBell(t,.5,.24);
      p.z+=front*.56*formBell(Math.sin(a),0,.35)*formBell(t,.41,.25);
      p.z+=front*.38*formBell(Math.sin(a),-side*.56,.26)*formBell(t,.76,.13);
      p.x-=side*.23*front*formBell(t,.78,.10);
      p.z-=Math.max(0,-Math.cos(a))*.27*formBell(Math.abs(Math.sin(a)),.49,.24)*formBell(t,.40,.27);
      p.z-=front*.26*formBell(Math.sin(a),side*.44,.11)*formBell(t,.48,.25);
      p.x-=side*.20*Math.max(0,Math.sin(a)*side)*formBell(t,.57,.18);
    },'thigh');
  const lowerStart = leg.children.length;
  const lowerSkin=organicLoft(leg,[[side*.45,-10.32,.83,.98,1.02],[side*.45,-11.35,.74,1.26,1.18],
    [side*.49,-13.55,.1,1.46,1.42],[side*.39,-16.15,-.47,1.38,1.51],
    [side*.23,-19.2,-.77,.94,1.07],[side*.18,-22.45,-.70,.70,.80],
    [side*.18,-23.82,-.56,.64,.61]],m.skin,(p,a,t)=>{
      const front=Math.max(0,Math.cos(a)),back=Math.max(0,-Math.cos(a));
      p.z+=front*(.41*formBell(t,.105,.047)-.12*formBell(t,.172,.025));
      p.z+=.32*front**8*formBell(t,.58,.30);
      p.z-=back*.34*formBell(t,.40,.18);
      p.x+=Math.sin(a)*(.14*formBell(t,.46,.2)+.13*formBell(t,.88,.048));
      p.z-=back*.37*(formBell(Math.sin(a),side*.40,.30)*formBell(t,.36,.17)+.75*formBell(Math.sin(a),-side*.40,.30)*formBell(t,.40,.18));
      p.z+=front*.13*formBell(Math.sin(a),-side*.1,.15)*formBell(t,.49,.25);
      const shin=formBell(t,.51,.30),ankleBand=formBell(t,.86,.085);
      p.z-=front*.20*shin*formBell(Math.abs(Math.sin(a)),.34,.14);
      p.x-=Math.sin(a)*.12*ankleBand;
      p.z-=back*.16*ankleBand;
    },'shin');
  const footStart = leg.children.length;
  sphere(leg, 1, m.extremity, ...ankle, .90, 1.11, .96);
  // Plantigrade soft heel/instep with an actual planar underside. Its minimum
  // y matches the original plated sole, so the existing terrain IK is unchanged.
  const soleY = -25.41, geometry = new T.SphereGeometry(1, 28, 18);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(i, position.getX(i) * 1.43,
      Math.max(-.58, position.getY(i)) * 1.25,
      position.getZ(i) * 2.47);
  }
  geometry.computeVertexNormals();
  addMesh(leg, geometry, m.extremity, side * .18, soleY + .725, .69);
  organicMuscle(leg, [side * .18, -23.48, -.4], [side * .18, -24.30, 1.63], 1.04, 1.17, m.extremityWarm);
  for (let toe = 0; toe < 3; toe++) {
    const tx = side * .18 + (toe - 1) * .89, front = toe === 1 ? 3.28 : 2.99;
    organicMuscle(leg, [tx, -24.58, 1.39], [tx, -24.69, front], .43, .43, m.extremity);
    sphere(leg, .41, m.extremityRidge, tx, -24.58, front - .22, 1, .82, 1.10);
    organicSweep(leg, [[tx, -24.63, front], [tx, -24.66, front + .56],
      [tx, -24.98, front + 1.07]], [.32, .23, .009], m.claw, 16);
  }
  const footJoint = articulatedSection(leg, leg.children.slice(footStart), ankle, 'Titan ankle and planted sole');
  const lowerChildren=leg.children.slice(lowerStart).filter(o=>o!==lowerSkin),skinGeometry=joinedSkin(upperSkin,lowerSkin,knee,'leg');
  const lower = articulatedSection(leg,lowerChildren,knee,'Titan knee and shin');
  const vertices = []; let minimumY = Infinity;
  footJoint.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new T.Vector3().fromBufferAttribute(p, i); vertices.push(v); minimumY = Math.min(minimumY, v.y); }
  });
  const unique = new Map();
  for (const v of vertices) if (v.y < minimumY + .004) unique.set(v.x.toFixed(5) + ':' + v.z.toFixed(5), v);
  // Interior vertices of the flattened sphere are redundant terrain probes;
  // keep its exact convex footprint and centre instead of every concentric ring.
  const candidates = [...unique.values()].sort((a, b) => a.x - b.x || a.z - b.z);
  const cross = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  const hull = points => { const edge = []; for (const p of points) {
    while (edge.length > 1 && cross(edge[edge.length - 2], edge[edge.length - 1], p) <= 0) edge.pop();
    edge.push(p);
  } return edge.slice(0, -1); };
  const solePoints = [...hull(candidates), ...hull([...candidates].reverse())];
  const soleCentre = solePoints.reduce((v, p) => v.add(p), new T.Vector3()).multiplyScalar(1 / solePoints.length);
  solePoints.push(soleCentre.clone());
  const skin=bindLivingSkin(leg,frame,lower,footJoint,skinGeometry,m.skin,knee,'leg');
  batchStatic(leg); leg.userData.noBatch = true;
  limbs.push({ obj: leg, lower, foot: footJoint,skin,knee,ankle,solePoints,soleCentre,side,phase:side>0?0:Math.PI,leg:true });
}

function createFleshKaiju(frame, rig, limbs) {
  const m = {
    skin: fleshMaterial(0xa99782,.80),
    warm: fleshMaterial(0xb39b81,.82),
    ridge: fleshMaterial(0x776f62,.87),
    extremity:fleshMaterial(0x859383,.79),extremityWarm:fleshMaterial(0x9b9980,.80),extremityRidge:fleshMaterial(0x6e7969,.86),
    bone: material('bone', 0xb4a47e, { roughness: .77 }),
    tooth: material('bone', 0xd6c9a7, { roughness: .61 }),
    claw: material('bone', 0x343931, { roughness: .68 }),
    mouth: material('skin', 0x241e1b, { roughness: .93 }),
    eye: material('glass', 0xdca650, { emissive: 0x87501c, emissiveIntensity: .32, roughness: .26, metalness: 0 }),
    pupil: material('bone', 0x171c13, { roughness: .35 })
  };
  frame.userData.kaijuVariant = 'flesh';
  organicTorso(frame, m); organicHead(frame, m);
  for (const side of [-1, 1]) { organicLeg(rig, limbs, side, m,frame); organicArm(rig, limbs, side, m,frame); }
  backpackHarness(frame, m);
}

/** Two anatomical carriers share the movement rig and physical castle harness. */
export function createHumanoidKaiju(frame, rig, limbs, variant = 'cyborg') {
  if (variant === 'flesh') { createFleshKaiju(frame, rig, limbs); return; }
  const m = {
    armour: material('metal', 0x4f3b66, { roughness: .49, metalness: .43 }),
    light: material('metal', 0x766286, { roughness: .50, metalness: .36 }),
    flesh: material('skin', 0x454153, { roughness: .77, metalness: .03 }),
    dark: material('skin', 0x292e38, { roughness: .83 }),
    joint: material('metal', 0x242c34, { roughness: .65, metalness: .38 }),
    edge: material('metal', 0x8b9192, { roughness: .51, metalness: .51 }),
    trim: material('metal', 0xa8bd79, { roughness: .48, metalness: .30 }),
    eye: material('glass', 0xc9df97, { emissive: 0xb9d975, emissiveIntensity: .65, roughness: .22 }),
    cable: material('fabric', 0x37363c, { roughness: .84 })
  };
  torso(frame, m); head(frame, m);
  for (const side of [-1, 1]) { createLeg(rig, limbs, side, m); createArm(rig, limbs, side, m); }
  backpackHarness(frame, m);
}

/** Soft tissue recovery; the load frame and every contact pivot stay unchanged. */
export function animateFleshAnatomy(city,time,moving){
  const anatomy=city.frame?.userData.fleshAnatomy;if(!anatomy)return;
  const phase=(city.gaitDistance??0)/16*Math.PI*2,effort=moving?1:.35,breath=.5+.5*Math.sin(time*(moving?1.83:1.39)),strikeAge=time-city.strikeTime;
  const afterStrike=strikeAge>=.7&&strikeAge<2.6?Math.exp(-(strikeAge-.7)*2.7)*Math.sin((strikeAge-.7)*4.2):0;
  anatomy.torso.morphTargetInfluences[0]=.22+breath*(.52+effort*.26)+afterStrike*.16;
  anatomy.torso.morphTargetInfluences[1]=moving?Math.sin(phase-.40)*.90:Math.sin(time*.56)*.10;
  const strike=strikeAge>=0&&strikeAge<1.3?Math.sin(Math.min(1,strikeAge/.7)*Math.PI)*Math.max(0,1-(strikeAge-.7)/.6):0;
  anatomy.head.rotation.set(-.024-(moving?.047*Math.sin(phase*2-.8):breath*.018)+afterStrike*.055-strike*.095,moving?-.047*Math.sin(phase-.30):Math.sin(time*.31)*.035,-city.rig.rotation.z*.74);
  anatomy.head.position.y=49.5+.08*breath-(moving?.15*Math.abs(Math.sin(phase-.40)):0);
  anatomy.face.morphTargetInfluences[0]=.12+breath*.16+Math.max(0,strike)*.69;
  anatomy.mouth.scale.y=.059+breath*.015+Math.max(0,strike)*.095;
  const blinkPhase=((time+1.63)%6.7),blink=blinkPhase<.19?Math.sin(blinkPhase/.19*Math.PI)**2:0;
  for(const eye of anatomy.eyes){eye.globe.scale.y=.105*(1-blink*.94);eye.pupil.scale.y=.095*(1-blink*.94);eye.pupil.position.x=eye.side*1.26+Math.sin(time*.43)*.025;eye.lid.position.y=-blink*.105;}
  for(const limb of city.limbs){
    if(!limb.skin)continue;
    const bend=1-Math.min(1,Math.abs(limb.lower.quaternion.w)),load=limb.leg?(limb.contact?.68:.12):.18+Math.max(0,strike)*.60;
    limb.skin.morphTargetInfluences[0]=Math.min(1,load+bend*1.3);
    limb.skin.morphTargetInfluences[1]=moving?Math.max(0,Math.sin(phase+limb.phase))*.45:.08*breath;
    if(limb.hand?.fingers)for(let i=0;i<limb.hand.fingers.length;i++)limb.hand.fingers[i].rotation.x=-.035-.045*(.5+.5*Math.sin(time*.91+i*.67+limb.side));
  }
}
