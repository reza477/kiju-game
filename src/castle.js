import * as T from '../vendor/three.module.js';
import { getMaterial, box, cylinder, cone, beam } from './materials.js';
import { KAIJU_DECK_Y, KAIJU_CENTER, RING_SLOTS, kaijuRingRadius } from './city-layout.js';
export { kaijuSlotPosition } from './city-layout.js';

const TAU = Math.PI * 2;
const material = (kind, color) => getMaterial(kind, color);

function mesh(group, geometry, mat, x = 0, y = 0, z = 0) {
  const object = new T.Mesh(geometry, mat);
  object.position.set(x, y, z);
  object.castShadow = object.receiveShadow = true;
  group.add(object);
  return object;
}

function annularWall(group, inner, outer, height, y, mat, segments = 72) {
  const positions = [], normals = [], uvs = [];
  const triangle = (a, b, c, normal) => {
    for (const point of [a, b, c]) { positions.push(...point); normals.push(...normal); uvs.push(point[0] * .13, point[1] * .4 + point[2] * .13); }
  };
  for (let i = 0; i < segments; i++) {
    const a = i / segments * TAU, b = (i + 1) / segments * TAU, midpoint = (a + b) / 2;
    const point = (r, angle, yy) => [Math.sin(angle) * r, yy, Math.cos(angle) * r];
    const o0 = point(outer, a, 0), o1 = point(outer, b, 0), o2 = point(outer, a, height), o3 = point(outer, b, height);
    const i0 = point(inner, a, 0), i1 = point(inner, b, 0), i2 = point(inner, a, height), i3 = point(inner, b, height);
    const outward = [Math.sin(midpoint), 0, Math.cos(midpoint)], inward = outward.map(v => -v);
    triangle(o0, o1, o2, outward); triangle(o1, o3, o2, outward);
    triangle(i1, i0, i2, inward); triangle(i3, i1, i2, inward);
    triangle(o2, o3, i2, [0, 1, 0]); triangle(o3, i3, i2, [0, 1, 0]);
    triangle(o1, o0, i0, [0, -1, 0]); triangle(i1, o1, i0, [0, -1, 0]);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  return mesh(group, geometry, mat, KAIJU_CENTER.x, y, KAIJU_CENTER.z);
}

function pathRing(group, inner, outer, y, mat) {
  const ring = mesh(group, new T.RingGeometry(inner, outer, 96), mat, KAIJU_CENTER.x, y, KAIJU_CENTER.z);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

function lancet(group, x, y, z, rotation, width, height, p, lit) {
  const local = new T.Group(); local.position.set(x, y, z); local.rotation.y = rotation;
  for (const [w, h, offset, mat] of [
    [width + .13, height + .14, 0, p.trim],
    [width, height, .045, material(lit ? 'window' : 'glass', lit ? 0xc1c9bb : 0x6f929f)],
  ]) {
    const shape = new T.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(-w / 2, h * .64);
    shape.quadraticCurveTo(-w * .47, h * .83, 0, h);
    shape.quadraticCurveTo(w * .47, h * .83, w / 2, h * .64);
    shape.lineTo(w / 2, 0); shape.closePath();
    mesh(local, new T.ExtrudeGeometry(shape, { depth: .035, bevelEnabled: false, curveSegments: 5 }), mat, 0, 0, offset);
  }
  box(local, .035, height * .8, .035, p.metal, 0, height * .4, .097);
  box(local, width + .21, .065, .13, p.trim, 0, -.025, .065);
  group.add(local);
}

function peripheralPinnacle(group, angle, radius, deckY, p, index) {
  const x = Math.sin(angle) * radius, z = KAIJU_CENTER.z + Math.cos(angle) * radius;
  const r = .3, height = 1.6 + index % 2 * .3;
  cylinder(group, r, r * 1.18, height, p.wall, x, deckY + height / 2, z, 12);
  cylinder(group, r * 1.22, r * 1.22, .13, p.trim, x, deckY + height, z, 12);
  cone(group, r * 1.47, 1.65, p.roof, x, deckY + height + .9, z, 10);
  cylinder(group, .02, .035, .48, p.metal, x, deckY + height + 1.93, z, 6);
  lancet(group, x + Math.sin(angle) * r, deckY + .48, z + Math.cos(angle) * r, angle, .15, .7, p, index % 2 === 0);
}

/** One level circular backpack. Ring purchases enlarge its radius, never height. */
export function createCastleBackpack(deckY = KAIJU_DECK_Y, enemy = false, rings = 1) {
  const ringCount = Math.max(0, Math.min(2, Math.floor(rings))), radius = kaijuRingRadius(ringCount);
  const group = new T.Group(); group.name = 'Circular Gothic backpack foundation';
  const p = {
    wall: material('stone', enemy ? 0x626773 : 0x747d81),
    trim: material('stone', 0xb2b5ae),
    roof: material('roof', 0x2f4555),
    metal: material('metal', 0x53616a),
    dark: material('metal', 0x35434c),
    paving: material('pavement', 0x959a91),
  };

  // A compact vaulted drum is the load-bearing backpack. Every playable square
  // above it lies on the same plane, including rings added later in the game.
  cylinder(group, radius - .16, radius - .16, 2.85, p.wall, 0, deckY - 1.69, KAIJU_CENTER.z, 72);
  cylinder(group, radius - .15, radius - .3, .18, p.trim, 0, deckY - 3.13, KAIJU_CENTER.z, 72);
  cylinder(group, radius + .035, radius - .03, .22, p.trim, 0, deckY - .2, KAIJU_CENTER.z, 96);
  cylinder(group, radius, radius, .13, p.paving, 0, deckY - .025, KAIJU_CENTER.z, 96);
  cylinder(group, Math.min(2.42, radius - .5), Math.min(2.42, radius - .5), .028, material('pavement', 0xa3a89c), 0, deckY + .055, KAIJU_CENTER.z, 64);

  // Circular cloister walks divide the centre from its concentric boroughs.
  pathRing(group, radius - .51, radius - .27, deckY + .049, material('pavement', 0x777e7d));
  pathRing(group, 2.48, Math.min(2.73, radius - .27), deckY + .063, material('stone', 0xb9b8ab));
  if (ringCount > 0) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI + (i + .5) / 6 * TAU;
      const radial = box(group, .16, .024, radius - 3.05, material('pavement', 0x757e7c), Math.sin(angle) * (radius + 2.65) / 2, deckY + .065, KAIJU_CENTER.z + Math.cos(angle) * (radius + 2.65) / 2);
      radial.rotation.y = angle;
    }
  }
  if (ringCount > 1) pathRing(group, 6.53, 6.83, deckY + .067, material('stone', 0xaaa99d));

  // The low outer wall sits beyond each rotated plot. Small spires occupy
  // gaps between plots, leaving the central keep as the only castle heart.
  annularWall(group, radius - .19, radius + .03, .46, deckY + .065, p.wall);
  annularWall(group, radius - .24, radius + .075, .075, deckY + .52, p.trim);
  const merlons = ringCount === 0 ? 14 : ringCount === 1 ? 28 : 44;
  for (let i = 0; i < merlons; i++) {
    const angle = i / merlons * TAU, x = Math.sin(angle) * (radius - .07), z = KAIJU_CENTER.z + Math.cos(angle) * (radius - .07);
    const block = box(group, .27, .3, .3, p.wall, x, deckY + .74, z); block.rotation.y = angle;
    const cap = box(group, .32, .065, .34, p.trim, x, deckY + .915, z); cap.rotation.y = angle;
  }
  const pinnacleAngles = ringCount === 0 ? [Math.PI / 2, Math.PI * 1.5]
    : ringCount === 1 ? [0, 2, 4].map(i => Math.PI + (i + .5) / 6 * TAU)
      : [1, 4, 7, 10].map(i => Math.PI + (i + .5) / 13 * TAU);
  pinnacleAngles.forEach((angle, i) => peripheralPinnacle(group, angle, radius - .055, deckY, p, i));

  const windows = ringCount === 0 ? 10 : ringCount === 1 ? 18 : 28;
  for (let i = 0; i < windows; i++) {
    const angle = i / windows * TAU, r = radius - .145;
    lancet(group, Math.sin(angle) * r, deckY - 2.68, KAIJU_CENTER.z + Math.cos(angle) * r, angle, .35, 1.65, p, i % 4 === 1);
    if (i % 2 === 0) {
      const bracket = box(group, .15, 2.54, .16, p.trim, Math.sin(angle) * (r + .08), deckY - 1.67, KAIJU_CENTER.z + Math.cos(angle) * (r + .08));
      bracket.rotation.y = angle;
    }
  }
  for (let i = 0; i < (ringCount === 0 ? 6 : 12); i++) {
    const angle = i / (ringCount === 0 ? 6 : 12) * TAU;
    beam(group, [Math.sin(angle) * 1.4, deckY - 3.43, KAIJU_CENTER.z + Math.cos(angle) * 1.4], [Math.sin(angle) * (radius - .35), deckY - .62, KAIJU_CENTER.z + Math.cos(angle) * (radius - .35)], .12, p.dark);
  }
  for (const side of [-1, 1]) {
    const banner = box(group, .72, 1.8, .045, material('fabric', enemy ? 0x96534b : 0x773e4e), side * Math.min(2.1, radius * .39), deckY - 1.7, KAIJU_CENTER.z - radius + .2);
    banner.rotation.y = side * .09;
    box(group, .05, 1.14, .055, material('metal', 0xac9f7e), banner.position.x, deckY - 1.55, banner.position.z - .035);
  }

  group.userData.rings = ringCount;
  group.userData.radius = radius;
  group.userData.deckY = deckY;
  group.userData.buildableSlots = RING_SLOTS.slice(0, ringCount + 1).flat().length;
  group.userData.surfaceLevels = [deckY];
  return group;
}
