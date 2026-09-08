import * as T from '../vendor/three.module.js';
import { getMaterial as material, box, cylinder, sphere, beam, batchStatic } from './materials.js';

const UP = new T.Vector3(0, 1, 0);

function addMesh(group, geometry, mat, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(geometry, mat);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
}

function muscle(group, a, b, width, depth, mat) {
  const start = new T.Vector3(...a), direction = new T.Vector3(...b).sub(start);
  const centre = start.addScaledVector(direction, .5);
  const mesh = sphere(group, 1, mat, centre.x, centre.y, centre.z, width, direction.length() * .56, depth);
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
  return plate(group, outline.map(([px, py]) => [px * side, py]), depth, mat, x, y, z, bevel);
}

function joint(group, x, y, z, radius, mat, trim) {
  sphere(group, 1, mat, x, y, z, radius, radius * .83, radius * .92);
  for (const side of [-1, 1]) {
    const disc = cylinder(group, radius * .62, radius * .62, .22, trim, x + side * radius * .94, y, z, 20);
    disc.rotation.z = Math.PI / 2;
    cylinder(group, radius * .24, radius * .24, .27, mat, x + side * radius * 1.03, y, z, 16).rotation.z = Math.PI / 2;
  }
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
  batchStatic(leg); limbs.push({ obj: leg, phase: side > 0 ? 0 : Math.PI, leg: true });
}

function createHand(arm, side, m) {
  const palm = new T.Group(); palm.position.set(side * 2.13, -22.05, 2.6); arm.add(palm);
  // Each open hand has a palm, four three-jointed fingers and an opposed thumb.
  muscle(palm, [0, .55, 0], [side * .02, -1.2, .13], 1.12, .54, m.dark);
  mirroredPlate(palm, side, [[-.95, .75], [.86, .7], [1.07, -.35], [.72, -1.22], [-.79, -1.2], [-1.01, -.55]], .35, m.armour, 0, -.05, .48, .09);
  for (let finger = 0; finger < 4; finger++) {
    const fx = (finger - 1.5) * .51, length = finger === 0 || finger === 3 ? .87 : 1.05;
    const y = -1.04 + Math.abs(finger - 1.5) * .09;
    const points = [[fx, y, .07], [fx + side * .06, y - length, .25], [fx + side * .05, y - length * 1.70, .60], [fx - side * .03, y - length * 2.19, .95]];
    for (let segment = 0; segment < 3; segment++) {
      const r = .235 - segment * .027;
      muscle(palm, points[segment], points[segment + 1], r, r * .83, segment === 1 ? m.dark : m.armour);
      sphere(palm, .25 - segment * .025, m.joint, ...points[segment], 1, .85, 1);
      if (segment === 0) box(palm, .25, .25, .14, m.edge, points[segment][0], points[segment][1], .34);
    }
    sphere(palm, .17, m.edge, ...points[3], 1, 1.22, .8);
  }
  const thumb = [[-side * .94, -.22, .15], [-side * 1.5, -1.02, .45], [-side * 1.48, -1.68, 1.03], [-side * 1.07, -1.84, 1.35]];
  for (let i = 0; i < 3; i++) {
    muscle(palm, thumb[i], thumb[i + 1], .29 - i * .035, .24 - i * .025, i === 1 ? m.dark : m.armour);
    sphere(palm, .27 - i * .028, m.joint, ...thumb[i]);
  }
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
  createHand(arm, side, m);
  batchStatic(arm); limbs.push({ obj: arm, phase: side > 0 ? Math.PI : 0, leg: false });
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
    sphere(frame, 1, m.armour, side * 5.93, 44.15, .1, 2.26, 1.85, 2.38);
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
  muscle(frame, [0, 44.9, .5], [0, 48.7, 1.3], 1.44, 1.23, m.dark);
  for (let i = 0; i < 5; i++) {
    const collar = cylinder(frame, 1.23, 1.3, .18, m.joint, 0, 46.1 + i * .42, .78 + i * .1, 24); collar.scale.z = .87;
  }
  for (const side of [-1, 1]) cable(frame, [[side * .68, 44.8, 1.65], [side * 1.1, 46.1, 1.85], [side * .73, 48.2, 1.83]], .12, m.edge);
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
  for (const side of [-1, 1]) {
    const points = [[side * 4.2, 42.3, -5.5], [side * 4.35, 45.9, -3.1], [side * 4.28, 46.6, .3], [side * 3.97, 44.0, 4.19], [side * 3.6, 39.5, 4.31], [side * 3.1, 33.6, 3.5], [side * 2.85, 27, 2.15]];
    shoulderStrap(frame, points, .95, .28, strap);
    for (const offset of [-.36, .36]) cable(frame, points.map(([x, y, z]) => [x + offset, y + .07, z + .035]), .035, buckle);
    const clasp = box(frame, 1.16, 1.55, .24, buckle, side * 3.75, 41.65, 4.58); clasp.rotation.z = side * .04;
    box(frame, .66, 1.03, .12, strap, side * 3.75, 41.65, 4.74);
    for (const y of [40.2, 43.2]) cylinder(frame, .11, .11, .12, buckle, side * 3.82, y, 4.63, 12).rotation.x = Math.PI / 2;
    // Steel packing-frame rails and diagonal braces transfer the castle's load to
    // shoulders and hips. They terminate behind the body, beneath the terraces.
    beam(frame, [side * 4.5, 22, -6.5], [side * 4.5, 44.2, -6.5], .42, strap);
    beam(frame, [side * 2.9, 26, -2.0], [side * 4.5, 24, -6.5], .54, strap);
    beam(frame, [side * 4.05, 43.2, -2.65], [side * 4.5, 43, -6.5], .45, strap);
    for (const y of [22, 29, 36, 43]) {
      beam(frame, [side * 4.5, y + 2.1, -6.5], [side * 7.4, y - .55, -10.5], .28, strap);
      beam(frame, [side * 4.5, y - .35, -6.5], [side * 7.4, y - .55, -10.5], .31, buckle);
      box(frame, 1.25, .37, 1.4, strap, side * 7.4, y - .47, -10.5);
      cylinder(frame, .28, .28, .52, buckle, side * 4.5, y, -6.34, 16).rotation.x = Math.PI / 2;
    }
    cable(frame, [[side * 2.8, 25.9, -1.9], [side * 4.5, 25.6, -5.9], [side * 5.9, 29.1, -8.3], [side * 7.1, 29.3, -10.5]], .14, m.cable);
  }
  waistBelt(frame, strap, buckle);
  for (const y of [22.2, 29.2, 36.2, 43.2]) beam(frame, [-4.5, y, -6.5], [4.5, y, -6.5], .29, strap);
  beam(frame, [-4.5, 23, -6.5], [4.5, 35.6, -6.5], .21, buckle);
  beam(frame, [4.5, 23, -6.5], [-4.5, 35.6, -6.5], .21, buckle);
}

/** Original, upright biomechanical carrier; the caller adds the castle behind it. */
export function createHumanoidKaiju(frame, rig, limbs) {
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
