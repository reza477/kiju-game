import * as T from '../vendor/three.module.js';
import { getMaterial, box, cylinder, sphere, beam } from './materials.js';

// Architectural scale is deliberately exaggerated: roof silhouettes, deep cornices
// and inset glazing remain legible while the whole city is moving.
const palettes = {
  kaiju: { wall: 0x899084, light: 0xc7c8ab, roof: 0x365c58, trim: 0xb4b99a, dark: 0x334647, accent: 0x914451, window: 0xe5ad67 },
  crawler: { wall: 0xad7252, light: 0xddc29a, roof: 0x405e65, trim: 0xc3a783, dark: 0x37474c, accent: 0x2f7276, window: 0xffc578 },
  airship: { wall: 0xe2d0a5, light: 0xf4e0b6, roof: 0x3e9b9b, trim: 0xcfad60, dark: 0x526868, accent: 0x3f8193, window: 0xf4ca80 },
};
const M = (kind, color) => getMaterial(kind, color);
const wallMaterial = (faction, color) => M(faction === 'crawler' ? 'brick' : faction === 'airship' ? 'plaster' : 'stone', color);

function glazingMaterial(x, y, z, seed = 0) {
  // Most rooms reflect the sky. Only a few addresses illuminate at dusk, avoiding
  // a uniformly yellow facade while making occupied rooms visible after dark.
  const variation = Math.floor(Math.abs(Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 39.3)) * 43758.5453) % 11;
  if (variation < 3) return M('window', variation === 0 ? 0xc1c9bb : 0xbbc6c3);
  return M('glass', [0x7a9ea9, 0x89a9b1, 0x638d9a, 0x6c919d][variation % 4]);
}

function addMesh(group, geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function roof(group, w, h, d, material, x, y, z, style = 'gable') {
  // A ridged prism and a slate mansard retain actual roof planes and eaves.
  const shape = new T.Shape();
  if (style === 'mansard') {
    shape.moveTo(-w / 2, 0);
    shape.lineTo(-w * .28, h);
    shape.lineTo(w * .28, h);
    shape.lineTo(w / 2, 0);
  } else {
    shape.moveTo(-w / 2, 0);
    shape.lineTo(0, h);
    shape.lineTo(w / 2, 0);
  }
  shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.translate(0, 0, -d / 2);
  addMesh(group, geometry, material, x, y, z);
  if (style !== 'mansard') box(group, .08, .065, d + .03, M('metal', 0x81998e), x, y + h, z);
}

function archShape(width, height, pointed = false) {
  const s = new T.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(-width / 2, height * .61);
  if (pointed) {
    s.quadraticCurveTo(-width * .45, height * .84, 0, height);
    s.quadraticCurveTo(width * .45, height * .84, width / 2, height * .61);
  } else s.absarc(0, height - width / 2, width / 2, Math.PI, 0, true);
  s.lineTo(width / 2, 0);
  s.closePath();
  return s;
}

function archedPanel(group, width, height, x, y, z, material, pointed = false) {
  return addMesh(group, new T.ExtrudeGeometry(archShape(width, height, pointed), { depth: .032, bevelEnabled: false, curveSegments: 6 }), material, x, y, z);
}

function window(group, x, y, z, w, h, p, ornate = false, pointed = false) {
  const pane = glazingMaterial(x, y, z);
  if (ornate) {
    archedPanel(group, w + .13, h + .13, x, y - .07, z, M('stone', p.trim), pointed);
    archedPanel(group, w, h, x, y, z + .035, pane, pointed);
  } else {
    box(group, w + .1, h + .1, .065, M('stone', p.trim), x, y + h / 2, z);
    box(group, w, h, .033, pane, x, y + h / 2, z + .049);
  }
  if (w > .25) box(group, .035, h * .8, .035, M('wood', p.dark), x, y + h * .42, z + .071);
}

function facade(group, w, h, d, y, p, faction, columns = 3, floors = 3, rear = false) {
  const faces = rear ? [0, Math.PI / 2, -Math.PI / 2, Math.PI] : [0, Math.PI / 2];
  for (const rotation of faces) {
    const side = new T.Group();
    side.rotation.y = rotation;
    const faceWidth = Math.abs(Math.sin(rotation)) > .5 ? d : w;
    const faceDepth = Math.abs(Math.sin(rotation)) > .5 ? w : d;
    const faceColumns = faceWidth < 1.3 ? 2 : columns;
    for (let row = 0; row < floors; row++) for (let col = 0; col < faceColumns; col++) {
      const xx = ((col + .5) / faceColumns - .5) * faceWidth * .81;
      const yy = y - h / 2 + .4 + row * (h - .45) / floors;
      const ww = Math.min(.36, faceWidth * .51 / faceColumns);
      window(side, xx, yy, faceDepth / 2 + .02, ww, Math.min(.52, h / floors * .57), p, faction === 'kaiju' && row === floors - 1, faction === 'kaiju');
    }
    group.add(side);
  }
}

function cornice(group, w, d, y, p, x = 0, z = 0) {
  box(group, w + .13, .085, d + .13, M('stone', p.trim), x, y, z);
  box(group, w + .21, .065, d + .2, M('stone', p.light), x, y + .08, z);
}

function steps(group, x, z, width = .75, y = .16, p = palettes.crawler) {
  for (let i = 0; i < 3; i++) box(group, width, .08 * (i + 1), .18, M('stone', p.trim), x, y + .04 * (i + 1), z - i * .15);
}

function chimney(group, x, y, z, height, p, width = .22) {
  box(group, width, height, width, M('brick', p.wall), x, y + height / 2, z);
  box(group, width + .1, .095, width + .1, M('stone', p.trim), x, y + height, z);
  box(group, width * .6, .025, width * .6, M('metal', 0x263638), x, y + height + .052, z);
  if (width >= .2) for (const side of [-1, 1]) {
    cylinder(group, width * .13, width * .18, .19, M('brick', 0x9c775b), x + side * width * .26, y + height + .16, z, 8);
  }
  const marker = new T.Object3D();
  marker.position.set(x, y + height + (width >= .2 ? .29 : .08), z);
  marker.userData.smokestack = true;
  group.add(marker);
}

function dome(group, radius, x, y, z, p, heightScale = 1) {
  const points = [new T.Vector2(0, 0), new T.Vector2(radius, 0), new T.Vector2(radius * 1.02, radius * .18), new T.Vector2(radius * .92, radius * .46), new T.Vector2(radius * .64, radius * .79), new T.Vector2(radius * .22, radius * 1.02), new T.Vector2(0, radius * 1.25)];
  const geometry = new T.LatheGeometry(points, 20);
  geometry.scale(1, heightScale, 1);
  addMesh(group, geometry, M('copper', p.roof), x, y, z);
  cylinder(group, radius * 1.02, radius * 1.02, .09, M('gold', p.trim), x, y, z, 20);
  cylinder(group, .021, .04, .4, M('gold', p.trim), x, y + radius * 1.25 * heightScale + .12, z, 8);
  sphere(group, .065, M('gold', p.trim), x, y + radius * 1.25 * heightScale + .29, z);
}

function turret(group, x, z, height, p, faction, radius = .28) {
  cylinder(group, radius, radius * 1.14, height, wallMaterial(faction, p.wall), x, height / 2 + .18, z, faction === 'kaiju' ? 8 : 12);
  cylinder(group, radius * 1.32, radius * 1.3, .14, M('stone', p.light), x, height - .15, z, 12);
  cylinder(group, radius * 1.08, radius * 1.15, .09, M('gold', p.trim), x, height + .23, z, 12);
  if (faction === 'airship') dome(group, radius * 1.35, x, height + .3, z, p);
  else {
    cylinder(group, 0, radius * 1.45, radius * 3.7, M('roof', p.roof), x, height + .2 + radius * 1.85, z, 8);
    cylinder(group, .016, .03, .38, M('gold', p.trim), x, height + radius * 3.7 + .32, z, 6);
  }
}

function planter(group, x, z, p, size = .35) {
  box(group, size, .18, size, M('stone', p.trim), x, .26, z);
  sphere(group, size * .59, M('foliage', 0x5d8b50), x, .48, z, 1, .88, 1);
}

function entrance(group, x, z, y, p, faction, width = .48, height = .95) {
  archedPanel(group, width + .22, height + .18, x, y, z, M('stone', p.light), faction === 'kaiju');
  archedPanel(group, width, height, x, y + .04, z + .045, M('wood', p.dark), faction === 'kaiju');
  box(group, .018, height * .62, .015, M('gold', p.trim), x, y + height * .36, z + .086);
}

function capital(group, level, faction, p) {
  const h = 2.65 + Math.min(level - 1, 4) * .3;
  box(group, 2.35, h, 2.2, wallMaterial(faction, p.wall), 0, h / 2 + .19, -.18);
  cornice(group, 2.35, 2.2, h + .12, p, 0, -.18);
  const glazing = new T.Group();
  glazing.position.z = -.18;
  facade(glazing, 2.35, h, 2.2, h / 2 + .19, p, faction, 3, 2, true);
  group.add(glazing);
  entrance(group, 0, 1, .28, p, faction, .55, 1.08);
  steps(group, 0, 1.43, .95, .12, p);
  for (const x of [-1.13, 1.13]) box(group, .13, h + .12, .18, M('stone', p.trim), x, h / 2 + .2, .96);
  if (faction === 'kaiju') {
    roof(group, 2.55, 1.65, 2.4, M('roof', p.roof), 0, h + .24, -.18);
    for (const x of [-.94, .94]) {
      turret(group, x, .57, h + 1.2, p, faction, .25);
      for (const z of [-.92, -.4]) {
        box(group, .16, h - .2, .18, M('stone', p.trim), x * 1.23, h / 2 + .15, z);
        beam(group, [x * 1.28, .9, z], [x * .8, h + .65, z], .052, M('stone', p.light));
      }
    }
    // A wheel rose window with stone spokes reads as a cathedral from afar.
    const ring = addMesh(group, new T.TorusGeometry(.32, .049, 5, 20), M('stone', p.light), 0, h + .54, 1.055);
    const stained = cylinder(group, .286, .286, .03, M('glass', 0x819fae), 0, h + .54, 1.055, 20);
    stained.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const spoke = box(group, .024, .6, .034, M('stone', p.trim), 0, h + .54, 1.084);
      spoke.rotation.z = i * Math.PI / 6;
    }
    ring.userData.architecturalDetail = true;
    for (const x of [-.66, .66]) box(group, .26, .75, .045, M('fabric', p.accent), x, 1.8, 1.026);
    turret(group, 0, -.8, h + 2.1, p, faction, .32);
  } else if (faction === 'crawler') {
    roof(group, 2.55, .86, 2.38, M('roof', p.roof), 0, h + .22, -.18, 'mansard');
    const th = h + 3.35;
    box(group, .93, 3.6, .95, wallMaterial(faction, p.wall), 0, th - 1.55, -.15);
    for (const x of [-.43, .43]) box(group, .1, 3.64, .09, M('stone', p.light), x, th - 1.55, .34);
    cornice(group, .98, 1.02, th, p, 0, -.15);
    box(group, 1.18, .2, 1.2, M('stone', p.light), 0, th + .23, -.15);
    roof(group, 1.24, .98, 1.27, M('roof', p.roof), 0, th + .34, -.15);
    for (const angle of [0, Math.PI / 2, Math.PI]) {
      const clock = new T.Group();
      clock.position.set(0, th - .52, -.15);
      clock.rotation.y = angle;
      const face = cylinder(clock, .3, .3, .04, M('plaster', 0xf8e6b3), 0, 0, .515, 24);
      face.rotation.x = Math.PI / 2;
      addMesh(clock, new T.TorusGeometry(.32, .033, 4, 24), M('metal', p.dark), 0, 0, .54);
      box(clock, .025, .23, .03, M('metal', p.dark), 0, .08, .551);
      const hand = box(clock, .18, .025, .03, M('metal', p.dark), .07, -.005, .558);
      hand.rotation.z = -.2;
      group.add(clock);
    }
    for (const x of [-.8, .8]) chimney(group, x, h + .6, -.8, .65, p, .19);
  } else {
    box(group, 1.55, .45, 1.55, wallMaterial(faction, p.light), 0, h + .5, -.15);
    dome(group, .95, 0, h + .74, -.15, p);
    for (const x of [-1.06, 1.06]) turret(group, x, -.88, h + 1.9, p, faction, .18);
    for (const x of [-.86, -.43, .43, .86]) {
      cylinder(group, .055, .075, 1.13, M('stone', p.light), x, .86, 1.13, 10);
    }
    box(group, 2.2, .17, .44, M('stone', p.trim), 0, 1.51, 1.08);
    for (const x of [-.64, 0, .64]) archedPanel(group, .43, .58, x, 1.62, 1.01, glazingMaterial(x, 1.62, 1.01));
    for (const x of [-1, 1]) planter(group, x, 1.25, p, .27);
  }
}

function housing(group, level, faction, p) {
  // Three narrow addresses make each slot feel like an inhabited urban block.
  const count = faction === 'airship' ? 2 : 3;
  for (let i = 0; i < count; i++) {
    const w = faction === 'airship' ? 1.05 : .77;
    const x = (i - (count - 1) / 2) * (w + .025);
    const h = 2.13 + i % 2 * .44 + Math.min(level - 1, 4) * .4;
    const d = 1.82 + (i === 1 ? .2 : 0);
    const local = new T.Group();
    local.position.set(x, 0, -.26);
    const tint = new T.Color(p.wall).offsetHSL((i - 1) * .012, 0, (i - 1) * .035).getHex();
    box(local, w, h, d, wallMaterial(faction, tint), 0, h / 2 + .18, 0);
    cornice(local, w, d, h + .12, p);
    for (let floor = 0; floor < 3; floor++) {
      const yy = .52 + floor * (h - .4) / 3;
      window(local, -.19, yy, d / 2 + .012, .2, .4, p, faction === 'kaiju', faction === 'kaiju');
      window(local, .19, yy, d / 2 + .012, .2, .4, p, faction === 'kaiju', faction === 'kaiju');
    }
    // Side and rear streets stay inhabited when the player rotates the camera.
    const rear = new T.Group();
    rear.rotation.y = Math.PI;
    for (let floor = 0; floor < 2; floor++) for (const xx of [-.19, .19]) {
      window(rear, xx, .65 + floor * (h - .4) / 2, d / 2 + .018, .18, .36, p);
    }
    local.add(rear);
    if (i === 0 || i === count - 1) {
      const side = new T.Group();
      side.rotation.y = i === 0 ? -Math.PI / 2 : Math.PI / 2;
      for (let floor = 0; floor < 3; floor++) for (const xx of [-.5, .5]) {
        window(side, xx, .59 + floor * (h - .4) / 3, w / 2 + .018, .22, .38, p, faction === 'kaiju', faction === 'kaiju');
      }
      local.add(side);
    }
    box(local, w + .035, .058, d + .02, M('stone', p.trim), 0, 1.15, 0);
    if (faction === 'airship') {
      dome(local, w * .48, 0, h + .25, -.08, p);
      box(local, w + .05, .12, .36, M('gold', p.trim), 0, 1.23, d / 2 + .1);
    } else {
      roof(local, w + .14, faction === 'kaiju' ? 1.12 : .66, d + .15, M('roof', p.roof), 0, h + .23, 0, faction === 'crawler' ? 'mansard' : 'gable');
      if (i !== 1) chimney(local, -.19, h + .36, -.44, .73, p, .16);
      if (faction === 'crawler') {
        box(local, .3, .38, .19, wallMaterial(faction, p.light), 0, h + .55, d / 2 + .025);
        window(local, 0, h + .39, d / 2 + .14, .16, .22, p);
        roof(local, .39, .14, .31, M('roof', p.roof), 0, h + .75, d / 2 + .025);
      }
    }
    entrance(local, 0, d / 2 + .075, .23, p, faction, .23, .62);
    const awning = box(local, w * .84, .055, .38, M('fabric', i % 2 ? p.accent : 0xd2b77a), 0, .99, d / 2 + .23);
    awning.rotation.x = -.14;
    if (i !== 1) {
      box(local, w * .65, .12, .19, M('wood', p.dark), 0, 1.39, d / 2 + .13);
      box(local, w * .58, .095, .17, M('foliage', 0x617e4a), 0, 1.48, d / 2 + .13);
    }
    if (faction === 'airship') {
      const balconyZ = d / 2 + .21;
      box(local, w + .07, .1, .37, M('stone', p.light), 0, 1.45, balconyZ);
      box(local, w, .045, .045, M('gold', p.trim), 0, 1.79, balconyZ + .17);
      for (const side of [-1, 0, 1]) box(local, .035, .31, .035, M('gold', p.trim), side * w * .44, 1.62, balconyZ + .17);
    }
    group.add(local);
  }
  for (const x of [-.96, .96]) planter(group, x, 1.23, p, .27);
  box(group, .58, .045, .14, M('wood', 0x8d6948), 0, .42, 1.31);
  for (const x of [-.22, .22]) box(group, .05, .22, .13, M('metal', p.dark), x, .3, 1.31);
}

function farm(group, level, faction, p) {
  const soil = M('soil', 0x694b32);
  const crop = M('foliage', 0x91aa4d);
  for (let x = -.86; x <= .9; x += .58) {
    box(group, .48, .2, 1.6, M('wood', 0x9b8054), x, .3, .31);
    box(group, .39, .035, 1.5, soil, x, .419, .31);
    for (let z = -.31; z <= .94; z += .3) {
      const crown = sphere(group, .17, crop, x, .57, z, 1, .85, 1);
      crown.rotation.y = z * 2;
    }
  }
  const greenhouse = new T.Group();
  greenhouse.position.set(-.42, 0, -.91);
  box(greenhouse, 1.48, .17, .88, M('stone', p.trim), 0, .31, 0);
  box(greenhouse, 1.32, .72, .78, M('glass', 0x84bbc0), 0, .71, 0);
  roof(greenhouse, 1.47, .47, .91, M('glass', 0xa8d4d0), 0, 1.06, 0);
  for (const x of [-.69, -.23, .23, .69]) {
    box(greenhouse, .035, .85, .89, M('metal', p.light), x, .7, 0);
    beam(greenhouse, [x, 1.08, -.45], [x, 1.08, .45], .021, M('metal', p.light));
  }
  for (const z of [-.45, .45]) {
    beam(greenhouse, [-.735, 1.06, z], [0, 1.53, z], .027, M('metal', p.light));
    beam(greenhouse, [0, 1.53, z], [.735, 1.06, z], .027, M('metal', p.light));
  }
  group.add(greenhouse);
  cylinder(group, .29, .31, .75, M('metal', p.roof), .85, .64, -.88, 16);
  cylinder(group, .33, .33, .065, M('metal', p.trim), .85, 1.04, -.88, 16);
  beam(group, [.84, .72, -.52], [.84, .5, .5], .034, M('metal', p.dark));
  box(group, 2.4, .05, .12, M('stone', p.trim), 0, .22, 1.29);
  if (level > 1) for (const x of [-1.12, 1.12]) {
    box(group, .07, 1.1, .07, M('wood', 0x92744b), x, .75, .48);
    beam(group, [x, 1.24, -.16], [x, 1.24, 1.1], .04, M('wood', 0x92744b));
  }
}

function workshop(group, level, faction, p, foundry = false) {
  const h = 1.55 + Math.min(level - 1, 3) * .28;
  box(group, 1.73, h, 1.68, wallMaterial(faction, p.wall), -.32, h / 2 + .18, -.42);
  cornice(group, 1.73, 1.68, h + .13, p, -.32, -.42);
  roof(group, 1.93, .7, 1.84, M('roof', p.roof), -.32, h + .22, -.42);
  for (const x of [-.86, -.27, .33]) window(group, x, .88, .445, .29, .55, p);
  entrance(group, -.57, .487, .2, p, faction, .5, .67);
  box(group, 2.25, .08, .83, M('pavement', 0x7d8379), 0, .26, .96);
  if (foundry) {
    for (const [x, z, height] of [[.87, -.62, 3.6], [.85, .1, 2.8]]) {
      cylinder(group, .14, .23, height, M('brick', 0x815c43), x, .18 + height / 2, z, 12);
      for (let y = .58; y < height; y += .66) cylinder(group, .205 - y * .011, .205 - y * .011, .06, M('metal', p.dark), x, y, z, 12);
      cylinder(group, .23, .25, .14, M('stone', p.trim), x, height + .18, z, 12);
      cylinder(group, .13, .13, .02, M('metal', 0x232e2d), x, height + .258, z, 12);
      const marker = new T.Object3D();
      marker.position.set(x, height + .3, z);
      marker.userData.smokestack = true;
      group.add(marker);
    }
    cylinder(group, .3, .4, .8, M('metal', 0x6a7879), .68, .69, .91, 12);
    cylinder(group, .43, .42, .07, M('metal', p.dark), .68, 1.11, .91, 12);
    box(group, .43, .42, .045, M('window', 0xff7734), .15, .67, .47);
    box(group, .07, .5, .1, M('metal', p.dark), .15, .65, .53);
    for (let i = 0; i < 5; i++) box(group, .3, .12, .32, M('metal', i % 2 ? 0x9da4a0 : 0x727d7a), -.75 + i % 3 * .32, .38 + Math.floor(i / 3) * .14, .98);
    beam(group, [.88, 1.34, .15], [.4, 1.34, .15], .075, M('copper', 0x956e48));
    beam(group, [.4, 1.34, .15], [.4, .64, .15], .075, M('copper', 0x956e48));
    chimney(group, -.74, h + .4, -.99, .45, p, .21);
  } else {
    const wheel = addMesh(group, new T.TorusGeometry(.58, .09, 5, 16), M('wood', 0x89603a), .73, .9, -.53);
    wheel.rotation.y = Math.PI / 2;
    const side = new T.Group();
    side.position.set(.745, .9, -.53);
    side.rotation.y = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const spoke = box(side, .06, 1.15, .12, M('wood', 0xb28b56));
      spoke.rotation.z = i * Math.PI / 8;
    }
    cylinder(side, .12, .12, .24, M('metal', p.dark), 0, 0, 0, 10).rotation.x = Math.PI / 2;
    group.add(side);
    for (let i = 0; i < 7; i++) {
      const x = -.69 + i % 4 * .38, y = .42 + Math.floor(i / 4) * .29;
      const log = cylinder(group, .15, .17, .97, M('wood', 0x82603b), x, y, 1, 10);
      log.rotation.x = Math.PI / 2;
      cylinder(group, .12, .12, .018, M('wood', 0xcbab6c), x, y, 1.49, 10).rotation.x = Math.PI / 2;
    }
    box(group, .09, .7, .07, M('wood', 0x9a794d), -1.05, .7, 1.1);
    box(group, .09, .7, .07, M('wood', 0x9a794d), .6, .7, 1.1);
    chimney(group, -.84, h + .5, -.8, .75, p, .21);
  }
}

function artillery(group, level, faction, p) {
  cylinder(group, 1.04, 1.21, .31, M('stone', p.wall), 0, .4, -.05, 16);
  cylinder(group, .81, .91, .15, M('metal', p.dark), 0, .64, -.07, 16);
  box(group, 1.45, .62, 1.31, M('metal', p.roof), 0, 1.03, -.12);
  box(group, 1.57, .14, 1.45, M('metal', p.trim), 0, 1.38, -.12);
  const guns = level > 1 ? [-.34, .34] : [0];
  for (const x of guns) {
    const barrel = new T.Group();
    barrel.position.set(x, 1.17, .24);
    barrel.rotation.x = Math.PI / 2 - .14;
    cylinder(barrel, .15, .22, 1.6, M('metal', 0x566a6c), 0, .45, 0, 16);
    cylinder(barrel, .19, .19, .2, M('metal', p.dark), 0, 1.18, 0, 16);
    cylinder(barrel, .103, .103, .012, M('metal', 0x162929), 0, 1.287, 0, 16);
    for (const yy of [0, .35, .7]) cylinder(barrel, .19, .19, .065, M('metal', p.trim), 0, yy, 0, 16);
    group.add(barrel);
  }
  for (const side of [-1, 1]) {
    cylinder(group, .19, .19, .14, M('metal', p.trim), side * .82, 1.11, .03, 12).rotation.z = Math.PI / 2;
    box(group, .27, .45, .74, M('wood', 0x83734e), side * .9, .47, -.84);
    for (const z of [-1.04, -.81, -.58]) cylinder(group, .07, .07, .47, M('gold', 0xb59754), side * .9, .94, z, 8);
    for (const z of [-.8, -.1]) box(group, .055, .39, .055, M('metal', p.dark), side * 1.09, .72, z);
    box(group, .055, .055, .85, M('metal', p.trim), side * 1.09, .94, -.44);
  }
  box(group, .47, .14, .38, M('metal', p.dark), 0, 1.51, -.34);
  box(group, .07, .7, .07, M('metal', p.dark), -.56, 1.83, -.5);
  box(group, .47, .23, .04, M('fabric', p.accent), -.35, 2.06, -.5);
  steps(group, 0, 1.23, .7, .1, p);
}

function armory(group, level, faction, p) {
  const h = 1.9 + Math.min(level - 1, 4) * .3;
  box(group, 2.19, h, 2.17, wallMaterial(faction, p.wall), 0, h / 2 + .2, -.08);
  cornice(group, 2.2, 2.17, h + .17, p, 0, -.08);
  box(group, 2.2, .11, 2.16, M('roof', p.roof), 0, h + .3, -.08);
  for (const side of [-1, 1]) {
    box(group, .2, h + .22, 2.3, M('stone', p.trim), side * 1.04, h / 2 + .2, -.08);
    for (let z = -.97; z <= 1; z += .42) box(group, .26, .4, .21, M('stone', p.light), side * 1.06, h + .55, z);
  }
  for (const x of [-.82, -.42, 0, .42, .82]) box(group, .22, .4, .23, M('stone', p.light), x, h + .55, -1.04);
  entrance(group, 0, 1.04, .2, p, faction, .81, 1.32);
  for (const x of [-.78, .78]) {
    window(group, x, .79, 1.04, .14, .74, p, faction === 'kaiju', faction === 'kaiju');
    box(group, .3, .08, .32, M('stone', p.light), x, .58, 1.09);
  }
  if (faction === 'airship') {
    dome(group, .57, 0, h + .38, -.19, p);
    for (const x of [-.8, .8]) turret(group, x, -.8, h + .37, p, faction, .13);
  } else {
    box(group, 1.14, .57, 1.04, M('metal', p.roof), 0, h + .6, -.27);
    roof(group, 1.31, .56, 1.2, M('roof', p.roof), 0, h + .89, -.27);
  }
  for (const x of [-.72, .72]) {
    box(group, .32, .32, .38, M('wood', 0x8d784c), x, .39, 1.26);
    box(group, .035, .35, .41, M('metal', p.trim), x, .39, 1.26);
  }
  steps(group, 0, 1.46, .82, .1, p);
}

export function createDistrict(type, level = 1, faction = 'kaiju') {
  const group = new T.Group();
  const p = palettes[faction] || palettes.kaiju;
  group.name = `${faction}-${type}-district`;
  box(group, 2.62, .18, 2.98, M('pavement', faction === 'airship' ? 0xc2b894 : 0xaaa796), 0, .09, 0);
  box(group, 2.67, .045, 3.02, M('stone', p.light), 0, .185, 0);
  if (type === 'keep') capital(group, level, faction, p);
  else if (type === 'housing') housing(group, level, faction, p);
  else if (type === 'farm') farm(group, level, faction, p);
  else if (type === 'sawmill') workshop(group, level, faction, p, false);
  else if (type === 'foundry') workshop(group, level, faction, p, true);
  else if (type === 'cannon') artillery(group, level, faction, p);
  else if (type === 'armor') armory(group, level, faction, p);
  else housing(group, level, faction, p);
  return group;
}

export function createPerimeterQuarter(faction = 'kaiju', deckY = 0) {
  const group = new T.Group();
  const p = palettes[faction] || palettes.kaiju;
  group.name = 'outer-borough';
  group.position.y = deckY;
  const addresses = [];
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) addresses.push({ x: side * 8.88, z: -6.5 + i * 2.5, angle: side * Math.PI / 2, i: i + (side + 1) * 3 });
  for (let i = 0; i < 4; i++) addresses.push({ x: -5.7 + i * 3.8, z: -9.07, angle: Math.PI, i: i + 12 });
  for (const { x, z, angle, i } of addresses) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    g.rotation.y = angle;
    const h = 1.55 + i % 3 * .25;
    const wall = new T.Color(p.wall).offsetHSL(0, 0, (i % 3 - 1) * .055).getHex();
    box(g, 1.65, .18, 1.46, M('stone', p.trim), 0, .02, 0);
    box(g, 1.43, h, 1.13, wallMaterial(faction, wall), 0, h / 2 + .12, -.08);
    box(g, 1.58, .12, 1.3, M('stone', p.light), 0, h + .13, -.08);
    if (faction === 'airship') dome(g, .43, 0, h + .18, -.08, p, .8);
    else roof(g, 1.63, faction === 'kaiju' ? .8 : .43, 1.35, M('roof', p.roof), 0, h + .2, -.08, faction === 'crawler' ? 'mansard' : 'gable');
    for (const xx of [-.46, 0, .46]) {
      box(g, .22, .35, .035, glazingMaterial(xx, h - .29, .509, i), xx, h - .29, .509);
      box(g, .26, .05, .07, M('stone', p.trim), xx, h - .49, .52);
    }
    box(g, .25, .66, .045, M('wood', p.dark), 0, .49, .51);
    box(g, 1.08, .075, .4, M('fabric', i % 2 ? p.accent : 0xb99965), 0, 1.0, .68).rotation.x = -.13;
    if (faction !== 'airship' && i % 3 === 0) chimney(g, -.4, h + .23, -.3, .55, p, .17);
    group.add(g);
  }
  return group;
}

export function createVacantPlot(faction = 'kaiju', index = 0) {
  const group = new T.Group();
  const p = palettes[faction] || palettes.kaiju;
  group.name = 'buildable-plaza';
  box(group, 2.64, .055, 3.05, M('pavement', faction === 'airship' ? 0xb8b299 : 0x868b79), 0, .035, 0);
  box(group, 2.38, .028, 2.78, M('grass', index % 3 === 0 ? 0x8a9078 : 0x8f947d), 0, .077, 0);
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    box(group, .35, .035, .04, M('stone', p.light), side * 1.1, .112, end * 1.39);
    box(group, .04, .035, .34, M('stone', p.light), side * 1.27, .112, end * 1.24);
  }
  box(group, .33, .023, .035, M('stone', p.trim), 0, .099, 0);
  box(group, .035, .023, .33, M('stone', p.trim), 0, .099, 0);
  return group;
}

export function createStreetDetails(faction = 'kaiju', deckY = 0) {
  const group = new T.Group();
  const p = palettes[faction] || palettes.kaiju;
  group.name = 'streets-and-furniture';
  group.position.y = deckY;
  const paving = M('pavement', faction === 'airship' ? 0xb1ad99 : 0x777f76);
  const curb = M('stone', faction === 'airship' ? 0xd6c6a1 : 0xb8b7a5);
  for (const x of [-7.625, -4.575, -1.525, 1.525, 4.575, 7.625]) {
    box(group, .39, .025, 15.5, paving, x, .043, 0);
    for (const s of [-1, 1]) box(group, .045, .058, 15.5, curb, x + s * .21, .057, 0);
  }
  for (const z of [-7.4, -3.7, 0, 3.7, 7.4]) {
    box(group, 15.7, .025, .56, paving, 0, .064, z);
    for (const s of [-1, 1]) box(group, 15.7, .038, .04, curb, 0, .077, z + s * .3);
  }
  for (const x of [-7.62, 7.62]) for (const z of [-7.4, -3.7, 0, 3.7, 7.4]) {
    cylinder(group, .038, .059, 1.22, M('metal', p.dark), x, .67, z, 8);
    cylinder(group, .11, .14, .1, M('metal', p.dark), x, .11, z, 8);
    box(group, .2, .24, .2, M('window', 0xffd690), x, 1.4, z);
    roof(group, .3, .13, .3, M('metal', p.dark), x, 1.54, z);
  }
  // Tiny benches, planters and municipal service boxes around the promenades.
  for (const x of [-6.1, 0, 6.1]) for (const z of [-7.85, 7.85]) {
    box(group, .65, .07, .24, M('wood', 0x9b7c53), x, .33, z);
    box(group, .65, .2, .04, M('wood', 0x9b7c53), x, .48, z - .12);
    for (const s of [-1, 1]) box(group, .06, .26, .24, M('metal', p.dark), x + s * .25, .2, z);
    planter(group, x + .7, z, p, .33);
  }
  for (const z of [-5.5, 5.5]) box(group, .25, .4, .25, M('metal', p.roof), -7.91, .25, z);
  return group;
}
