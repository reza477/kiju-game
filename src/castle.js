import * as T from '../vendor/three.module.js';
import { getMaterial, box, cylinder, sphere, cone, beam } from './materials.js';

const m = (kind, color) => getMaterial(kind, color);

// The outermost borough sits lowest. Each higher terrace climbs toward the
// creature's spine, keeping every building address from the original game.
export function kaijuSlotPosition(i) {
  const row = Math.floor(i / 5);
  return { x: (i % 5 - 2) * 3.05, y: row * 7, z: -15 + row * 2.5 };
}

function mesh(g, geometry, material, x = 0, y = 0, z = 0) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  g.add(object);
  return object;
}

function lancetShape(w, h) {
  const shape = new T.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(-w / 2, h * .65);
  shape.quadraticCurveTo(-w * .47, h * .84, 0, h);
  shape.quadraticCurveTo(w * .47, h * .84, w / 2, h * .65);
  shape.lineTo(w / 2, 0);
  shape.closePath();
  return shape;
}

function lancet(g, x, y, z, w, h, palette, lit = false) {
  const local = new T.Group();
  local.position.set(x, y, z);
  // Cathedral windows face the outside of the backpack, toward negative Z.
  local.rotation.y = Math.PI;
  for (const [width, height, offset, material] of [
    [w + .18, h + .16, 0, palette.trim],
    [w, h, .049, lit ? m('window', 0xc1c9bb) : m('glass', 0x698c9b)],
  ]) {
    const geometry = new T.ExtrudeGeometry(lancetShape(width, height), { depth: .045, bevelEnabled: false, curveSegments: 6 });
    mesh(local, geometry, material, 0, 0, offset);
  }
  box(local, .042, h * .84, .04, palette.dark, 0, h * .42, .11);
  box(local, w + .24, .07, .18, palette.trim, 0, -.04, .045);
  g.add(local);
}

function gothicRoof(g, width, height, depth, x, y, z, palette) {
  const shape = new T.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(0, height); shape.lineTo(width / 2, 0); shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  geometry.translate(0, 0, -depth / 2);
  mesh(g, geometry, palette.roof, x, y, z);
  box(g, .1, .1, depth + .14, palette.metal, x, y + height, z);
  for (const side of [-1, 1]) beam(g, [x + side * width / 2, y, z - depth / 2 - .04], [x, y + height, z - depth / 2 - .04], .062, palette.trim);
}

function cornice(g, width, depth, x, y, z, palette) {
  box(g, width + .15, .17, depth + .15, palette.trim, x, y, z);
  box(g, width + .29, .085, depth + .27, palette.light, x, y + .13, z);
}

function parapet(g, x1, x2, y, z, palette, crenellations = true) {
  const length = x2 - x1;
  box(g, length, .49, .17, palette.wall, (x1 + x2) / 2, y + .26, z);
  box(g, length + .05, .09, .25, palette.trim, (x1 + x2) / 2, y + .54, z);
  const count = Math.floor(length / .74);
  if (crenellations) for (let i = 0; i <= count; i++) {
    const x = x1 + .13 + (length - .26) * i / Math.max(1, count);
    box(g, .28, .32, .27, palette.wall, x, y + .73, z);
    box(g, .32, .075, .32, palette.trim, x, y + .92, z);
  }
}

function pinnacle(g, x, baseY, z, wallHeight, radius, roofHeight, palette) {
  cylinder(g, radius * .88, radius * 1.17, wallHeight, palette.wall, x, baseY + wallHeight / 2, z, 12);
  for (const height of [.12, wallHeight * .36, wallHeight * .68, wallHeight - .12]) cylinder(g, radius * 1.04, radius * 1.09, .17, palette.trim, x, baseY + height, z, 12);
  const crownY = baseY + wallHeight;
  cylinder(g, radius * 1.22, radius * 1.12, .23, palette.light, x, crownY, z, 12);
  cone(g, radius * 1.32, roofHeight, palette.roof, x, crownY + .1 + roofHeight / 2, z, 12);
  cylinder(g, .022, .055, .8, palette.metal, x, crownY + roofHeight + .41, z, 8);
  sphere(g, .075, palette.metal, x, crownY + roofHeight + .78, z);
  for (let floor = 0; floor < Math.floor(wallHeight / 4); floor++) {
    lancet(g, x, baseY + 1.1 + floor * 3.6, z - radius * .91, radius * .56, 1.37, palette, floor % 3 === 0);
  }
}

function flight(g, a, b, width, palette) {
  const start = new T.Vector3(...a), finish = new T.Vector3(...b);
  const direction = finish.clone().sub(start), run = Math.hypot(direction.x, direction.z);
  const yaw = Math.atan2(direction.x, direction.z), count = 16;
  for (let i = 0; i < count; i++) {
    const t = (i + .5) / count;
    const position = start.clone().lerp(finish, t);
    const step = box(g, width, .13, run / count + .055, palette.trim, position.x, position.y - .07, position.z);
    step.rotation.y = yaw;
  }
  const normal = new T.Vector3(direction.z / run, 0, -direction.x / run);
  for (const side of [-1, 1]) {
    const lower = start.clone().addScaledVector(normal, side * width / 2), upper = finish.clone().addScaledVector(normal, side * width / 2);
    beam(g, lower.toArray(), upper.toArray(), .065, palette.dark);
    lower.y += .7; upper.y += .7;
    beam(g, lower.toArray(), upper.toArray(), .036, palette.metal);
    for (let i = 0; i <= 4; i++) {
      const post = start.clone().lerp(finish, i / 4).addScaledVector(normal, side * width / 2);
      box(g, .045, .7, .045, palette.dark, post.x, post.y + .35, post.z);
    }
  }
}

function sideStairs(g, deckY, side, palette) {
  for (let tier = 0; tier < 3; tier++) {
    const z = -15 + tier * 2.5, y = deckY + tier * 7;
    const start = [side * 8.05, y + .08, z + .72];
    const landing = [side * 10.15, y + 3.5, z + 1.46];
    const end = [side * 8.05, y + 7.08, z + 2.5 + .72];
    flight(g, start, landing, .65, palette);
    flight(g, landing, end, .65, palette);
    box(g, .99, .14, .93, palette.wall, landing[0], landing[1] - .09, landing[2]);
    box(g, .045, .65, .92, palette.dark, side * 10.58, landing[1] + .29, landing[2]);
    beam(g, [side * 7.8, y - 1, z + 1.46], [landing[0], landing[1] - .2, landing[2]], .09, palette.dark);
  }
}

function flyingButtress(g, side, lowerY, upperY, z, palette) {
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(side * 9.27, lowerY, z),
    new T.Vector3(side * 8.7, lowerY + (upperY - lowerY) * .44, z),
    new T.Vector3(side * 7.82, upperY - .65, z),
    new T.Vector3(side * 7.76, upperY, z),
  ]);
  mesh(g, new T.TubeGeometry(curve, 14, .17, 6, false), palette.trim);
  const secondary = curve.clone();
  secondary.points.forEach(p => { p.z += .34; });
  mesh(g, new T.TubeGeometry(secondary, 14, .075, 6, false), palette.metal);
}

function roseWindow(g, x, y, z, radius, palette) {
  const disc = cylinder(g, radius * .88, radius * .88, .06, m('glass', 0x718ba5), x, y, z, 32);
  disc.rotation.x = Math.PI / 2;
  mesh(g, new T.TorusGeometry(radius, .093, 8, 36), palette.light, x, y, z - .06);
  mesh(g, new T.TorusGeometry(radius * .73, .032, 5, 30), palette.trim, x, y, z - .11);
  for (let i = 0; i < 8; i++) {
    const spoke = box(g, .055, radius * 1.9, .08, palette.trim, x, y, z - .135);
    spoke.rotation.z = i * Math.PI / 8;
  }
  sphere(g, .13, palette.metal, x, y, z - .16, 1, 1, .36);
}

function innerCathedral(g, deckY, palette, enemy) {
  // This high, narrow spine sits nearest the creature rather than forming a
  // curtain across the outside/back view of the playable terraces.
  const z = -4.35, base = deckY + 5.5, wallHeight = 26;
  box(g, 3.72, wallHeight, 1.7, palette.wall, 0, base + wallHeight / 2, z);
  for (let floor = 0; floor < 6; floor++) {
    const y = base + .9 + floor * 4.1;
    for (const x of [-1.12, 0, 1.12]) lancet(g, x, y, z - .89, .46, 2.25, palette, floor % 3 === 1 && x === 0);
    cornice(g, 3.72, 1.7, 0, y - .35, z, palette);
  }
  for (const x of [-1.8, 1.8]) {
    box(g, .19, wallHeight + .15, .22, palette.trim, x, base + wallHeight / 2, z - .95);
    cone(g, .22, 1.8, palette.roof, x, base + wallHeight + 1, z - .94, 6);
  }
  cornice(g, 3.75, 1.7, 0, base + wallHeight, z, palette);
  gothicRoof(g, 4.2, 7.4, 2.06, 0, base + wallHeight + .23, z, palette);
  roseWindow(g, 0, base + wallHeight + 2.17, z - 1.065, .7, palette);
  pinnacle(g, 0, deckY + 36.7, z + .2, 1.4, .46, 5.65, palette);
  for (const side of [-1, 1]) {
    const x = side * 5.3, wingBase = deckY + 13.5, wingZ = -4.72;
    box(g, 1.55, 17.3, 1.55, palette.wall, x, wingBase + 8.65, wingZ);
    for (let floor = 0; floor < 4; floor++) {
      lancet(g, x, wingBase + .8 + floor * 3.85, wingZ - .8, .47, 2.2, palette, floor === 1);
      cornice(g, 1.58, 1.57, x, wingBase + floor * 3.85, wingZ, palette);
    }
    gothicRoof(g, 1.97, 5.8, 1.92, x, wingBase + 17.45, wingZ, palette);
    pinnacle(g, side * 8.75, deckY + 14, -5.05, 18.2, .54, 6.5, palette);
    flyingButtress(g, side, deckY + 18, deckY + 30, -4.68, palette);
    const banner = box(g, .62, 3.45, .055, m('fabric', enemy ? 0x9a514e : 0x74384d), x, deckY + 27.6, wingZ - .85);
    banner.rotation.z = side * .024;
    box(g, .06, 2.25, .068, palette.metal, x, deckY + 27.8, wingZ - .9);
    box(g, .35, .07, .068, palette.metal, x, deckY + 28.17, wingZ - .91);
  }
}

export function createCastleBackpack(deckY = 22, enemy = false) {
  const g = new T.Group();
  g.name = 'Thornbound terraced cathedral backpack';
  const palette = {
    wall: m('stone', enemy ? 0x646877 : 0x717a80),
    trim: m('stone', 0xa6a9aa), light: m('stone', 0xc0bcb0),
    roof: m('roof', 0x273c52), dark: m('metal', 0x35414c),
    metal: m('metal', 0x93918a), pavement: m('pavement', 0x92978e),
  };

  // The underslung citadel and metal back rails read as a carried fortress,
  // ending well above the hips rather than forming a platform over the head.
  box(g, 14.8, 4.8, 2.65, palette.wall, 0, deckY - 2.5, -14.65);
  cornice(g, 14.8, 2.65, 0, deckY - 4.9, -14.65, palette);
  for (const x of [-6.1, -3.05, 0, 3.05, 6.1]) {
    lancet(g, x, deckY - 4.34, -16.01, .62, 2.8, palette, x === 0);
    box(g, .18, 4.75, .29, palette.trim, x + 1.3, deckY - 2.55, -16.11);
  }
  for (const side of [-1, 1]) {
    box(g, .4, 29.5, .43, palette.dark, side * 6.6, deckY + 9.8, -4.53);
    for (const height of [-3.8, 6, 15, 23.8]) {
      box(g, .73, .65, .65, palette.metal, side * 6.6, deckY + height, -4.53);
      sphere(g, .16, m('gold', 0xa69366), side * 6.6, deckY + height, -4.92, 1, 1, .45);
    }
    beam(g, [side * 6.6, deckY - 4.9, -4.53], [side * 7.68, deckY - 1.1, -15.6], .28, palette.dark);
  }

  for (let row = 0; row < 4; row++) {
    const y = deckY + row * 7, z = -15 + row * 2.5;
    // A thin, genuinely open deck leaves the lower terrace's roofs unobstructed.
    box(g, 16.25, .4, 3.92, palette.wall, 0, y - .25, z);
    box(g, 16.38, .14, 4.03, palette.trim, 0, y - .02, z);
    box(g, 15.72, .055, 3.72, palette.pavement, 0, y + .074, z);
    // Deep masonry is restricted to the inner half of the underside. Its outer
    // face is forward of the preceding row's plot bounds, never through a plot.
    if (row > 0) {
      box(g, 15.45, 5.72, 1.2, palette.wall, 0, y - 3.24, z + .9);
      for (const x of [-6.1, -3.05, 0, 3.05, 6.1]) {
        lancet(g, x, y - 5.63, z + .27, .55, 3.36, palette, (row + Math.round(x)) % 3 === 0);
      }
      box(g, 15.64, .17, 1.33, palette.trim, 0, y - 5.96, z + .9);
    }
    // Visible outside parapets and narrow side walks preserve all twenty plots.
    parapet(g, -7.78, 7.78, y + .1, z - 2.04, palette, row === 0 || row === 3);
    for (const side of [-1, 1]) {
      box(g, .44, .08, 3.88, palette.light, side * 7.79, y + .14, z);
      box(g, .13, .5, 3.97, palette.wall, side * 8.13, y + .4, z);
      box(g, .24, .1, 4.04, palette.trim, side * 8.13, y + .71, z);
      for (const dz of [-1.78, -.69, .69, 1.78]) box(g, .24, .3, .27, palette.wall, side * 8.13, y + .91, z + dz);
      // Ledge brackets stay outside the 2.8 m plot footprints.
      beam(g, [side * 8.02, y - 2.05, z + 1.55], [side * 8.02, y - .22, z - 1.5], .14, palette.trim);
      if (row < 3) flyingButtress(g, side, y - 1.8, y + 5.65, z + 1.94, palette);
      const lantern = new T.Group();
      lantern.position.set(side * 7.81, y + .17, z - 1.69);
      box(lantern, .046, 1.08, .046, palette.dark, 0, .54, 0);
      box(lantern, .19, .27, .18, m('window', 0xc1c9bb), 0, 1.18, 0);
      cone(lantern, .17, .24, palette.roof, 0, 1.43, 0, 4).rotation.y = Math.PI / 4;
      g.add(lantern);
    }
    for (const x of [-4.575, -1.525, 1.525, 4.575]) {
      box(g, .23, .024, 3.5, m('pavement', 0x69777b), x, y + .12, z);
    }
  }

  for (const side of [-1, 1]) {
    sideStairs(g, deckY, side, palette);
    // Low outside bastions frame the first terrace without walling off the view.
    pinnacle(g, side * 8.83, deckY - 4.8, -16.35, 10.1, .58, 4.75, palette);
    pinnacle(g, side * 9.2, deckY + 9.8, -9.3, 9.8, .42, 4.8, palette);
  }
  innerCathedral(g, deckY, palette, enemy);
  g.userData.terraceCount = 4;
  g.userData.buildableSlots = 20;
  g.userData.deckY = deckY;
  return g;
}
