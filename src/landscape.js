import * as T from '../vendor/three.module.js';
import { getMaterial, box, cylinder, cone } from './materials.js';
import { terrainHeight as heightAt, terrainNormal, protectedResource, riverX, riverWidth, shoreDistance, roadZ, terrainNoise as noise, smoothstep as smooth, RESOURCE_CENTRES } from './terrain.js';
import { createWorldLife } from './world-life.js';

// All scenery is generated locally. Instancing keeps the many small details cheap.
const TAU = Math.PI * 2;
const UP = new T.Vector3(0, 1, 0);
const RESOURCE_CLEARINGS = RESOURCE_CENTRES;
const TEMP = new T.Object3D();
const LEAF_COLOURS = [0x536e3b, 0x678747, 0x77994f, 0x819951, 0x486745, 0x95a65c];
const PINE_COLOURS = [0x3f654e, 0x4c7558, 0x557e58, 0x64865f];
const ROCK_COLOURS = [0x898d80, 0x9b9b8d, 0x747d72, 0xb4af9b];

function random(seed) { let n = seed >>> 0; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; }
function isClearing(x, z, margin = 0) {
  return Math.hypot(x + 30, z - 40) < 24 + margin ||
    RESOURCE_CLEARINGS.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 19 + margin);
}

class Instances {
  constructor(group, geometry, material, castShadow = true) { this.group = group; this.geometry = geometry; this.material = material; this.castShadow = castShadow; this.items = []; }
  add(x, y, z, sx = 1, sy = 1, sz = 1, colour = 0xffffff, yaw = 0, rotation = null) {
    this.items.push({ x, y, z, sx, sy, sz, colour, yaw, rotation }); return this.items.length - 1;
  }
  link(a, b, radius, colour) {
    const start = new T.Vector3(...a), finish = new T.Vector3(...b), dir = finish.clone().sub(start);
    const centre = start.addScaledVector(dir, .5);
    this.add(centre.x, centre.y, centre.z, radius, dir.length(), radius, colour, 0,
      new T.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  }
  finish(name = '') {
    if (!this.items.length) return null;
    const mesh = new T.InstancedMesh(this.geometry, this.material, this.items.length);
    const colour = new T.Color(); mesh.name = name;
    this.items.forEach((item, i) => {
      TEMP.position.set(item.x, item.y, item.z); TEMP.scale.set(item.sx, item.sy, item.sz);
      if (item.rotation) TEMP.quaternion.copy(item.rotation); else TEMP.rotation.set(0, item.yaw, 0);
      TEMP.updateMatrix(); mesh.setMatrixAt(i, TEMP.matrix); mesh.setColorAt(i, colour.setHex(item.colour));
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = this.castShadow; mesh.receiveShadow = true;
    mesh.computeBoundingSphere(); this.group.add(mesh); this.mesh = mesh; return mesh;
  }
}

function irregularOrb(detail = 1) {
  const geometry = new T.IcosahedronGeometry(1, detail), p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const scale = .96 + .11 * Math.sin(x * 13 + y * 4) * Math.cos(z * 11 - y * 7);
    p.setXYZ(i, x * scale, y * scale, z * scale);
  }
  geometry.computeVertexNormals(); return geometry;
}
function canopyGeometry(needles = false) {
  // Indexed topology shares normals across faces, giving foliage a soft leaf mass
  // instead of the individually lit polygon faces used for rocks.
  const geometry = new T.SphereGeometry(1, needles ? 8 : 12, needles ? 6 : 8);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const lobes = 1 + .10 * Math.sin(x * 6 + z * 3) * Math.sin(y * 5 - z * 4) + .045 * Math.cos(z * 11 + x * 7);
    positions.setXYZ(i, x * lobes, y * lobes + .05 * Math.sin(x * 5) * (1 - y * y), z * lobes);
  }
  geometry.computeVertexNormals();
  // Join the UV seam normals, preserving continuity in the repeated leaf texture.
  const n = geometry.attributes.normal, columns = (needles ? 8 : 12) + 1, rows = (needles ? 6 : 8) + 1;
  for (let row = 0; row < rows; row++) {
    const a = row * columns, b = a + columns - 1;
    const normal = new T.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
    n.setXYZ(a, normal.x, normal.y, normal.z); n.setXYZ(b, normal.x, normal.y, normal.z);
  }
  return geometry;
}
function grassGeometry() {
  const positions = [], normals = [], uvs = [];
  for (let i = 0; i < 4; i++) {
    const a = i * 2.13, x = Math.cos(a) * .2, z = Math.sin(a) * .2, dx = Math.cos(a + .6) * .18, dz = Math.sin(a + .6) * .18;
    const h = .55 + (i % 3) * .16;
    positions.push(x - dx, 0, z - dz, x + dx, 0, z + dz, x + .16, h, z + .1);
    for (let k = 0; k < 3; k++) { normals.push(0, 1, 0); uvs.push(k === 1 ? 1 : 0, k === 2 ? 1 : 0); }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  return geometry;
}
function treeBatches(group) {
  return {
    wood: new Instances(group, new T.CylinderGeometry(.75, 1, 1, 7), getMaterial('wood', 0xffffff)),
    leaves: new Instances(group, canopyGeometry(), getMaterial('foliage', 0xffffff)),
    needles: new Instances(group, canopyGeometry(true), getMaterial('foliage', 0xffffff)),
    finish() { return [this.wood.finish('Tree trunks and branches'), this.leaves.finish('Broadleaf canopies'), this.needles.finish('Pine boughs')].filter(Boolean); }
  };
}
function addTree(batch, rand, x, y, z, scale = 1, pine = false) {
  const starts = [batch.wood.items.length, batch.leaves.items.length, batch.needles.items.length];
  const h = (pine ? 8 : 6) * scale * (.85 + rand() * .35);
  const leanX = (rand() - .5) * .55 * scale, leanZ = (rand() - .5) * .55 * scale;
  batch.wood.link([x, y, z], [x + leanX, y + h * .86, z + leanZ], .19 * scale, 0x79634a);
  if (pine) {
    const startAngle = rand() * TAU, baseColour = new T.Color(PINE_COLOURS[Math.floor(rand() * PINE_COLOURS.length)]);
    // Narrow, overlapping needle sprays follow uneven radial branches. The gaps
    // between sprays break the silhouette without regular, stacked cone tiers.
    for (let level = 0; level < 4; level++) {
      const crownY = y + h * (.35 + level * .155), reach = (1.65 - level * .37) * scale;
      for (let branch = 0; branch < 3; branch++) {
        const a = startAngle + level * 1.27 + branch * TAU / 3 + (rand() - .5) * .4;
        const bx = x + leanX + Math.cos(a) * reach, bz = z + leanZ + Math.sin(a) * reach;
        const by = crownY + (rand() - .5) * scale * .65;
        const spread = (1.30 - level * .21) * scale * (.9 + rand() * .2);
        if (branch === 0) batch.wood.link([x + leanX, crownY + .3 * scale, z + leanZ], [bx, by - .15 * scale, bz], .055 * scale, 0x786a50);
        batch.needles.add(bx, by, bz, spread, (.85 - level * .08) * scale, spread * .76,
          baseColour.clone().multiplyScalar(.88 + rand() * .21 + level * .025).getHex(), -a);
      }
    }
    batch.needles.add(x + leanX, y + h * .96, z + leanZ, .60 * scale, 1.15 * scale, .58 * scale, baseColour.clone().multiplyScalar(1.12).getHex(), startAngle);
  } else {
    const startAngle = rand() * TAU, baseColour = new T.Color(LEAF_COLOURS[Math.floor(rand() * LEAF_COLOURS.length)]);
    const crownWidth = .82 + rand() * .35;
    for (let j = 0; j < 9; j++) {
      const top = j >= 6, a = startAngle + j * 2.39, r = (top ? .5 : 1.45) * scale * crownWidth;
      const crownY = y + h * (top ? .96 + rand() * .08 : .68 + (j % 3) * .10);
      const bx = x + leanX + Math.cos(a) * r, bz = z + leanZ + Math.sin(a) * r;
      if (j < 4) batch.wood.link([x, y + h * (.36 + j * .06), z], [bx, crownY - .25 * scale, bz], .10 * scale, 0x78634b);
      const radius = (top ? 1.10 + rand() * .35 : 1.25 + rand() * .4) * scale;
      batch.leaves.add(bx, crownY, bz, radius * crownWidth, radius * (.70 + rand() * .28), radius,
        baseColour.clone().multiplyScalar(.83 + rand() * .25 + (top ? .1 : 0)).getHex(), rand() * TAU);
    }
  }
  return [batch.wood, batch.leaves, batch.needles].map((part, i) => ({ batch: part, first: starts[i], count: part.items.length - starts[i] })).filter(part => part.count);
}

function createGround() {
  const geometry = new T.PlaneGeometry(1200, 1200, 300, 300); geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position, colours = [], lush = new T.Color(0x709658), dry = new T.Color(0x99a878), sand = new T.Color(0xc0b599), rock = new T.Color(0x909786);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = heightAt(x, z), d = shoreDistance(x, z);
    pos.setY(i, y);
    const variation = noise(x * .014, z * .014) * .78 + noise(x * .042, z * .042) * .16 + noise(x * .11, z * .11) * .06;
    const c = lush.clone().lerp(dry, smooth(.40, .78, variation));
    c.lerp(sand, (1 - smooth(1, 8, d)) * .9);
    // Pale weathered ridgelines and darker sheltered meadows make elevation read
    // from the normal city camera, rather than relying only on cast shadows.
    const exposedRidge = smooth(15, 31, y) * (.58 + noise(x * .034 + 17, z * .034) * .42);
    c.lerp(rock, exposedRidge * .84);
    if (y > 38) c.lerp(new T.Color(0xb4b5a3), smooth(38, 78, y) * .65);
    c.multiplyScalar(.90 + noise(x * .12, z * .12) * .17); colours.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colours, 3)); geometry.computeVertexNormals();
  const material = getMaterial('terrain', 0xffffff, { vertexColors: true, roughness: 1 }).clone();
  material.map = material.map.clone(); material.map.repeat.set(75, 75); material.bumpMap = material.map; material.bumpScale = .018;
  const ground = new T.Mesh(geometry, material); ground.name = 'Continuous sculpted terrain'; ground.receiveShadow = true; ground.userData.ground = true; ground.userData.noBatch = true;
  return ground;
}
function createWater() {
  const positions = [], uvs = [], indices = [], length = 1180, segments = 320, across = 6;
  for (let i = 0; i <= segments; i++) {
    const z = -length / 2 + i / segments * length, centre = riverX(z), width = riverWidth(z) + 1.7;
    for (let j = 0; j <= across; j++) {
      positions.push(centre + (j / across * 2 - 1) * width, -.57, z); uvs.push(j / across, i / segments * 75);
      if (i < segments && j < across) { const a = i * (across + 1) + j, b = a + across + 1; indices.push(a, b, a + 1, b, b + 1, a + 1); }
    }
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = new T.MeshPhysicalMaterial({ color: 0x318d8c, roughness: .22, metalness: .27, clearcoat: .75, clearcoatRoughness: .2, side: T.DoubleSide });
  const time = { value: 0 };
  material.onBeforeCompile = shader => {
    shader.uniforms.uRiverTime = time;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uRiverTime;\nvarying vec3 vRiverPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(position.z * 1.2 + uRiverTime * 1.4) * 0.027 + cos(position.x * 2.1 + position.z * .35 - uRiverTime) * .025;\nvRiverPosition = transformed;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRiverTime;\nvarying vec3 vRiverPosition;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float wave = sin(vRiverPosition.z * 2.4 + sin(vRiverPosition.x * 1.3) * 2.0 - uRiverTime * 1.6);
        float ripple = pow(max(0.0, wave), 24.0) * (0.06 + 0.05 * sin(vRiverPosition.x * 1.8 + vRiverPosition.z * .15));
        float depthTint = .05 * sin(vRiverPosition.x * .09 + vRiverPosition.z * .07);
        diffuseColor.rgb += vec3(.45, .6, .56) * ripple + vec3(depthTint * .3, depthTint, depthTint);
      `);
  };
  const water = new T.Mesh(geometry, material); water.name = 'Flowing river'; water.receiveShadow = true; water.userData.noBatch = true;
  return { water, time };
}

function createRoad(group) {
  const rand = random(5567), road = new Instances(group, new T.BoxGeometry(1, 1, 1), getMaterial('pavement', 0xffffff));
  const paint = new Instances(group, new T.BoxGeometry(1, 1, 1), getMaterial('stone', 0xffffff), false);
  const posts = new Instances(group, new T.CylinderGeometry(1, 1, 1, 6), getMaterial('wood', 0xffffff));
  for (let x = -450; x < 450; x += 6) {
    const z = roadZ(x), nextZ = roadZ(x + 6), yaw = -Math.atan2(nextZ - z, 6), y = heightAt(x, z);
    if (Math.abs(shoreDistance(x, z)) < 7 || shoreDistance(x, z) < 0 || rand() < .05) continue;
    const normal = terrainNormal(x, z), slope = new T.Quaternion().setFromUnitVectors(UP, new T.Vector3(normal.x, normal.y, normal.z));
    slope.multiply(new T.Quaternion().setFromAxisAngle(UP, yaw));
    road.add(x, y + .05, z, 6.15, .12, 7.9, 0xa3a48f, yaw, slope);
    road.add(x, y + .14, z, 6.05, .10, 5.8, rand() > .13 ? 0x656e68 : 0x7a7f70, yaw, slope);
    if (rand() > .2) paint.add(x, y + .20, z, 2.5, .013, .1, 0xd9cba0, yaw, slope);
    if (rand() > .7) paint.add(x, heightAt(x, z - 2.62) + .20, z - 2.62, 3.5, .012, .06, 0xcacbb0, yaw, slope);
  }
  for (let x = -245; x <= 250; x += 33) {
    const z = roadZ(x) + 6, y = heightAt(x, z);
    if (shoreDistance(x, z) < 12) continue;
    posts.add(x, y + 4.2, z, .13, 8.4, .13, 0x625e4d);
    posts.link([x - 1.6, y + 7.9, z], [x + 1.6, y + 7.9, z], .07, 0x5d6257);
  }
  road.finish('Abandoned old-world highway'); paint.finish('Weathered road markings'); posts.finish('Old telegraph poles');
  // The highway bridge collapsed; its stone abutments remain on the riverbanks.
  const bridgeZ = roadZ(riverX(140)), centre = riverX(bridgeZ);
  for (const side of [-1, 1]) {
    const x = centre + side * (riverWidth(bridgeZ) + 4);
    box(group, 5, 1.5, 10, getMaterial('stone', 0x9b9c88), x, -.2, bridgeZ);
    box(group, 6, .4, 10.4, getMaterial('stone', 0xb8b399), x, .7, bridgeZ);
    for (const dz of [-4.5, 4.5]) box(group, 6, 1.2, .45, getMaterial('stone', 0x858e7e), x, 1.2, bridgeZ + dz);
  }
}

function trackTexture(tank) {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const x = (column + .5) / size - .5, z = (row + .5) / size - .5;
    let ink = 0;
    if (tank) {
      const rowPattern = ((z + .5) * 9) % 1;
      if (Math.abs(x) < .43 && Math.abs(z) < .485) ink = Math.abs(x) > .33 ? .60 : rowPattern > .20 && rowPattern < .85 ? 1 : .1;
    } else {
      const heel = (x / .31) ** 2 + ((z + .21) / .23) ** 2 < 1;
      const sole = Math.abs(x) < .33 - Math.abs(z) * .08 && z > -.16 && z < .28;
      const toes = [-.235, 0, .235].some(tx => ((x - tx) / .105) ** 2 + ((z - .31) / .15) ** 2 < 1);
      if (heel || sole || toes) ink = .8;
      if (z > .09 && z < .13) ink *= .6;
    }
    ink *= .78 + noise(column * .35, row * .35) * .22;
    const i = (row * size + column) * 4, value = Math.round(ink * 255);
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
  }
  const texture = new T.DataTexture(data, size, size, T.RGBAFormat); texture.needsUpdate = true;
  texture.magFilter = T.LinearFilter; texture.minFilter = T.LinearFilter; return texture;
}

function createWorldInteractions(group, records) {
  const debrisCapacity = 512, trackCapacity = 400, cells = new Map(), byId = new Map();
  const identity = new T.Quaternion();
  const hidden = new T.Matrix4().compose(new T.Vector3(0, -5000, 0), identity, new T.Vector3(.0001, .0001, .0001));
  const changed = new Set(), previousActors = new Map(), destroyed = new Map();
  let activeDamage = null, activeMode = null, trackCursor = 0, trackCount = 0, fallbackDamage = [];
  const stats = { destroyedCount: 0, trackCount: 0, lifeCount: 0, destructibleCount: records.length, lastDestroyed: null };
  for (const record of records) {
    if (protectedResource(record.x, record.z)) continue;
    byId.set(record.id, record);
    const key = `${Math.floor(record.x / 24)},${Math.floor(record.z / 24)}`;
    if (!cells.has(key)) cells.set(key, []); cells.get(key).push(record);
  }
  function dynamic(geometry, material, count, name, shadow = true) {
    const mesh = new T.InstancedMesh(geometry, material, count); mesh.name = name; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.castShadow = shadow; mesh.receiveShadow = true; mesh.userData.noBatch = true;
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, hidden);
    mesh.instanceMatrix.needsUpdate = true; group.add(mesh); return mesh;
  }
  const stumps = dynamic(new T.CylinderGeometry(.8, 1, 1, 10), getMaterial('wood', 0x89704d), debrisCapacity, 'Crushed tree stumps');
  const cuts = dynamic(new T.CircleGeometry(1, 10).rotateX(-Math.PI / 2), getMaterial('wood', 0xc2ac7f), debrisCapacity, 'Broken trunk cores', false);
  const logs = dynamic(new T.CylinderGeometry(.73, 1, 1, 9), getMaterial('wood', 0x75634b), debrisCapacity * 3, 'Fallen trunks and branches');
  const brush = dynamic(canopyGeometry(true), getMaterial('foliage', 0x7d8958), debrisCapacity * 3, 'Crushed fallen boughs');
  const rubble = dynamic(irregularOrb(0), getMaterial('stone', 0x96977e), debrisCapacity * 3, 'Fresh crushed rock fragments');
  const stampGeometry = new T.PlaneGeometry(1, 1, 2, 4); stampGeometry.rotateX(-Math.PI / 2);
  const stamps = [false, true].map(tank => dynamic(stampGeometry, new T.MeshBasicMaterial({ color: tank ? 0x35402c : 0x3e4230, alphaMap: trackTexture(tank), transparent: true, opacity: tank ? .43 : .38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), trackCapacity, tank ? 'Persistent crawler tread impressions' : 'Titan footprints', false));
  stamps.forEach(mesh => { mesh.renderOrder = 1; });
  const debrisMeshes = [stumps, cuts, logs, brush, rubble];
  function place(mesh, index, x, y, z, sx, sy, sz, quaternion = identity) {
    TEMP.position.set(x, y, z); TEMP.scale.set(sx, sy, sz); TEMP.quaternion.copy(quaternion); TEMP.updateMatrix(); mesh.setMatrixAt(index, TEMP.matrix); changed.add(mesh);
  }
  function setOriginal(record, visible) {
    for (const ref of record.parts) {
      const mesh = ref.batch.mesh;
      if (!mesh) continue;
      for (let i = ref.first; i < ref.first + ref.count; i++) {
        if (!visible) mesh.setMatrixAt(i, hidden);
        else {
          const item = ref.batch.items[i]; TEMP.position.set(item.x, item.y, item.z); TEMP.scale.set(item.sx, item.sy, item.sz);
          if (item.rotation) TEMP.quaternion.copy(item.rotation); else TEMP.rotation.set(0, item.yaw, 0);
          TEMP.updateMatrix(); mesh.setMatrixAt(i, TEMP.matrix);
        }
      }
      changed.add(mesh);
    }
  }
  function clearDebris(slot) {
    for (const mesh of [stumps, cuts]) { mesh.setMatrixAt(slot, hidden); changed.add(mesh); }
    for (const mesh of [logs, brush, rubble]) for (let i = 0; i < 3; i++) { mesh.setMatrixAt(slot * 3 + i, hidden); changed.add(mesh); }
  }
  function showDebris(record, slot, angle) {
    const size = record.size, normal = terrainNormal(record.x, record.z), slope = new T.Quaternion().setFromUnitVectors(UP, new T.Vector3(normal.x, normal.y, normal.z));
    const x = record.x, z = record.z, y = heightAt(x, z);
    if (record.kind === 'tree') {
      place(stumps, slot, x, y + size * .34, z, size * .35, size * .68, size * .35, slope);
      place(cuts, slot, x, y + size * .69, z, size * .279, 1, size * .279, slope);
      const length = size * 5.8, dx = Math.sin(angle), dz = Math.cos(angle);
      for (let branch = 0; branch < 3; branch++) {
        const a = angle + (branch - 1) * .37, start = branch ? length * .51 : .5;
        const sx = x + dx * start, sz = z + dz * start, endLength = branch ? length * .34 : length;
        const ex = sx + Math.sin(a) * endLength, ez = sz + Math.cos(a) * endLength;
        const sy = heightAt(sx, sz) + .22 * size, ey = heightAt(ex, ez) + .18 * size;
        const direction = new T.Vector3(ex - sx, ey - sy, ez - sz), rotation = new T.Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
        place(logs, slot * 3 + branch, (sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2, size * (branch ? .12 : .27), direction.length(), size * (branch ? .12 : .27), rotation);
        place(brush, slot * 3 + branch, ex, heightAt(ex, ez) + size * .33, ez, size * 1.28, size * .40, size * .85, slope);
      }
    } else {
      for (let part = 0; part < 3; part++) {
        const a = angle + part * 2.2, px = x + Math.sin(a) * size * .6, pz = z + Math.cos(a) * size * .6;
        place(rubble, slot * 3 + part, px, heightAt(px, pz) + size * .16, pz, size * .55, size * .24, size * .41, slope);
      }
    }
  }
  function restore(id) {
    const current = destroyed.get(id); if (!current) return;
    setOriginal(current.record, true); clearDebris(current.slot); destroyed.delete(id);
  }
  function crush(record, angle, persist) {
    if (destroyed.has(record.id) || protectedResource(record.x, record.z)) return;
    if (destroyed.size >= debrisCapacity) restore(destroyed.keys().next().value);
    const used = new Set([...destroyed.values()].map(item => item.slot)); let slot = 0; while (used.has(slot)) slot++;
    setOriginal(record, false); showDebris(record, slot, angle); destroyed.set(record.id, { record, slot });
    if (persist && !activeDamage.includes(record.id)) {
      if (activeDamage.length >= debrisCapacity) activeDamage.splice(0, activeDamage.length - debrisCapacity + 1);
      activeDamage.push(record.id);
    }
    stats.lastDestroyed = record.id; stats.destroyedCount = destroyed.size;
  }
  function clearTracks() {
    for (const mesh of stamps) { for (let i = 0; i < trackCapacity; i++) mesh.setMatrixAt(i, hidden); changed.add(mesh); }
    trackCursor = trackCount = 0; stats.trackCount = 0;
  }
  function stamp(tank, x, z, angle, scale) {
    if (protectedResource(x, z) || shoreDistance(x, z) < .8) return;
    const normal = terrainNormal(x, z), slope = new T.Quaternion().setFromUnitVectors(UP, new T.Vector3(normal.x, normal.y, normal.z));
    slope.multiply(new T.Quaternion().setFromAxisAngle(UP, angle));
    const index = trackCursor++ % trackCapacity;
    stamps[tank ? 0 : 1].setMatrixAt(index, hidden); changed.add(stamps[tank ? 0 : 1]);
    place(stamps[tank ? 1 : 0], index, x, heightAt(x, z) + .085, z, (tank ? 2.9 : 2.65) * scale, 1, (tank ? 4.2 : 4.3) * scale, slope);
    trackCount = Math.min(trackCapacity, trackCount + 1); stats.trackCount = trackCount;
  }
  function sync(mode, damage) {
    if (activeMode === mode && activeDamage === damage) return;
    for (const id of [...destroyed.keys()]) restore(id);
    const validIds = [...new Set(damage.filter(id => typeof id === 'string' && byId.has(id)))].slice(-debrisCapacity);
    damage.splice(0, damage.length, ...validIds); stats.lastDestroyed = null;
    activeMode = mode; activeDamage = damage; previousActors.clear(); clearTracks();
    for (const id of damage.slice(-debrisCapacity)) {
      const record = byId.get(id); if (record) crush(record, (record.x * 1.73 + record.z * .39) % TAU, false);
    }
    stats.destroyedCount = destroyed.size;
  }
  function flush() { for (const mesh of changed) mesh.instanceMatrix.needsUpdate = true; changed.clear(); }
  return {
    stats,
    interact(actors, delta, options = {}) {
      const mode = options.mode || 'expedition';
      const damage = Array.isArray(options.damage) ? options.damage : options.damage?.[mode] || fallbackDamage;
      sync(mode, damage);
      for (const actor of actors || []) {
        if (![actor.x, actor.z].every(Number.isFinite)) continue;
        const key = actor.id || actor.faction, previous = previousActors.get(key) || { x: actor.x, z: actor.z, stampX: actor.x, stampZ: actor.z, foot: 0 };
        const distance = Math.hypot(actor.x - previous.x, actor.z - previous.z), scale = Math.max(.1, actor.scale || 1);
        const tank = actor.faction === 'crawler', canCrush = actor.faction === 'kaiju' || tank;
        if (actor.moving && canCrush && delta > 0 && distance > .005 && distance < 70) {
          const radius = (tank ? 16 : 8) * scale, minX = Math.floor((Math.min(previous.x, actor.x) - radius) / 24), maxX = Math.floor((Math.max(previous.x, actor.x) + radius) / 24);
          const minZ = Math.floor((Math.min(previous.z, actor.z) - radius) / 24), maxZ = Math.floor((Math.max(previous.z, actor.z) + radius) / 24), angle = actor.angle || 0;
          const sin = Math.sin(angle), cos = Math.cos(angle), dx = actor.x - previous.x, dz = actor.z - previous.z, length2 = dx * dx + dz * dz;
          for (let cx = minX; cx <= maxX; cx++) for (let cz = minZ; cz <= maxZ; cz++) for (const record of cells.get(`${cx},${cz}`) || []) {
            if (destroyed.has(record.id)) continue;
            const t = length2 ? T.MathUtils.clamp(((record.x - previous.x) * dx + (record.z - previous.z) * dz) / length2, 0, 1) : 1;
            const rx = record.x - previous.x - dx * t, rz = record.z - previous.z - dz * t;
            const lateral = rx * cos - rz * sin, forward = rx * sin + rz * cos;
            if (Math.abs(lateral) < (tank ? 10.6 : 5.1) * scale + record.size * .3 && Math.abs(forward) < (tank ? 12.1 : 4.2) * scale + record.size * .3) crush(record, angle + Math.sin(record.x) * .35, true);
          }
          const trailDistance = Math.hypot(actor.x - previous.stampX, actor.z - previous.stampZ), interval = (tank ? 2.7 : 5.3) * scale;
          const steps = Math.min(32, Math.floor(trailDistance / interval));
          if (steps) {
            const vx = (actor.x - previous.stampX) / trailDistance, vz = (actor.z - previous.stampZ) / trailDistance;
            for (let i = 1; i <= steps; i++) {
              const x = previous.stampX + vx * interval * i, z = previous.stampZ + vz * interval * i;
              if (tank) for (const side of [-1, 1]) stamp(true, x + cos * side * 8.6 * scale, z - sin * side * 8.6 * scale, angle, scale);
              else { const side = previous.foot++ % 2 ? 1 : -1; stamp(false, x + cos * side * 2.8 * scale, z - sin * side * 2.8 * scale, angle, scale); }
            }
            previous.stampX += vx * interval * steps; previous.stampZ += vz * interval * steps;
          }
        } else if (distance >= 70 || !actor.moving || !canCrush) { previous.stampX = actor.x; previous.stampZ = actor.z; }
        previous.x = actor.x; previous.z = actor.z; previousActors.set(key, previous);
      }
      flush(); return stats;
    },
    resetInteractions(options = null) {
      for (const id of [...destroyed.keys()]) restore(id);
      stats.destroyedCount = 0; stats.lastDestroyed = null;
      activeDamage = null; activeMode = null; previousActors.clear(); clearTracks();
      if (options) {
        const mode = options.mode || 'expedition', damage = Array.isArray(options) ? options : options.damage || [];
        sync(mode, damage);
      }
      flush();
    },
    // Read-only inventory is useful for verification; it contains no simulation state.
    crushables: records.map(({ id, kind, x, z, size }) => ({ id, kind, x, z, size }))
  };
}

export function createLandscape() {
  const group = new T.Group(); group.name = 'The reclaimed lowlands';
  const ground = createGround(); group.add(ground);
  const { water, time: waterTime } = createWater(); group.add(water);
  createRoad(group);
  const rand = random(196733), trees = treeBatches(group), records = [];
  const register = (id, kind, x, z, size, parts) => { if (!protectedResource(x, z)) records.push({ id, kind, x, z, size, parts }); };
  const rocks = new Instances(group, irregularOrb(1), getMaterial('stone', 0xffffff));
  const shrubs = new Instances(group, canopyGeometry(), getMaterial('foliage', 0xffffff));
  const grassMat = getMaterial('grass', 0xffffff, { side: T.DoubleSide }).clone(), windTime = { value: 0 };
  grassMat.onBeforeCompile = shader => {
    shader.uniforms.uMeadowTime = windTime;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uMeadowTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 meadowOrigin = instanceMatrix[3].xyz;
          float breeze = sin(meadowOrigin.x * .063 + meadowOrigin.z * .041 + uMeadowTime * 1.7);
          transformed.x += breeze * pow(max(position.y, 0.0), 2.0) * .23;
          transformed.z += cos(meadowOrigin.z * .09 + uMeadowTime * 1.1) * position.y * .05;
        #endif
      `);
  };
  const grass = new Instances(group, grassGeometry(), grassMat, false);
  const flowers = new Instances(group, new T.IcosahedronGeometry(1, 0), getMaterial('foliage', 0xffffff), false);
  // Clusters follow valleys and meadows rather than a uniform scatter.
  for (let i = 0; i < 1200; i++) {
    const x = (rand() - .5) * 900, z = (rand() - .5) * 900;
    if (isClearing(x, z, 5) || shoreDistance(x, z) < 7 || Math.abs(z - roadZ(x)) < 11) continue;
    const density = noise(x * .015 + 20, z * .015 + 12);
    if (density < .43 || (Math.abs(x) < 165 && Math.abs(z) < 165 && rand() < .35)) continue;
    const scale = .8 + rand() * .9;
    const parts = addTree(trees, rand, x, heightAt(x, z), z, scale, z < -130 || rand() < .32);
    register(`tree:${i}`, 'tree', x, z, scale, parts);
  }
  // Dense foothill groves alternate with broad, open travel corridors.
  const groves = [[-102, 38], [123, 61], [95, 137], [-145, -38]];
  groves.forEach(([cx, cz], cluster) => {
    for (let i = 0; i < 33; i++) {
      const a = rand() * TAU, r = Math.sqrt(rand()) * (23 + cluster * 2), x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      if (isClearing(x, z, 8) || shoreDistance(x, z) < 9 || Math.abs(z - roadZ(x)) < 9) continue;
      const scale = .8 + rand() * .55, parts = addTree(trees, rand, x, heightAt(x, z), z, scale, cluster === 3 || rand() < .21);
      register(`grove:${cluster}:${i}`, 'tree', x, z, scale, parts);
    }
  });
  for (let i = 0; i < 450; i++) {
    const x = (rand() - .5) * 660, z = (rand() - .5) * 660;
    if (isClearing(x, z, 1) || shoreDistance(x, z) < 1 || Math.abs(z - roadZ(x)) < 5) continue;
    const r = .35 + rand() * 1.35;
    const first = rocks.add(x, heightAt(x, z) + r * .25, z, r, r * (.45 + rand() * .5), r * .85, ROCK_COLOURS[i % ROCK_COLOURS.length], rand() * TAU);
    const shrubStart = shrubs.items.length;
    if (rand() > .36) for (let j = 0; j < 3; j++) shrubs.add(x + rand() * 2, heightAt(x, z) + .5, z + rand() * 2, .75, .6, .8, LEAF_COLOURS[(i + j) % LEAF_COLOURS.length]);
    register(`rock:${i}`, 'rock', x, z, r, [{ batch: rocks, first, count: 1 }, { batch: shrubs, first: shrubStart, count: shrubs.items.length - shrubStart }]);
  }
  for (let i = 0; i < 44; i++) {
    const ridge = i % 2, a = rand() * TAU, r = Math.sqrt(rand()) * 22, x = (ridge ? 148 : -143) + Math.sin(a) * r, z = (ridge ? -12 : -54) + Math.cos(a) * r;
    if (protectedResource(x, z, 3)) continue;
    const size = 1.1 + rand() * 2.2, first = rocks.add(x, heightAt(x, z) + size * .31, z, size, size * .69, size * .88, ROCK_COLOURS[i % 4], rand() * TAU);
    register(`ridge:${i}`, 'rock', x, z, size, [{ batch: rocks, first, count: 1 }]);
  }
  for (let i = 0; i < 4700; i++) {
    const x = (rand() - .5) * 650, z = (rand() - .5) * 650;
    if (shoreDistance(x, z) < 3 || Math.abs(z - roadZ(x)) < 4 || isClearing(x, z, -10)) continue;
    const h = .65 + rand() * .9, y = heightAt(x, z);
    grass.add(x, y + .02, z, h, h, h, [0x99a46b, 0x7f9855, 0xb0ae72, 0x7c9056][i % 4], rand() * TAU);
    if (i % 4 === 0) flowers.add(x, y + h * .5, z, .09, .06, .09, i % 3 ? 0xe7d8a7 : 0xb4acb7);
  }
  // Pebbles and reeds emphasize the waterline without a hard painted border.
  for (let z = -380; z <= 380; z += 4) for (const side of [-1, 1]) {
    const x = riverX(z) + side * (riverWidth(z) + 3.5 + rand() * 2.5), y = heightAt(x, z);
    if (rand() > .35) {
      const size = .35 + rand() * .6, first = rocks.add(x, y + .12, z, size, .22, .4, 0xa9a995, rand() * TAU);
      register(`shore:${z}:${side}`, 'rock', x, z, size, [{ batch: rocks, first, count: 1 }]);
    }
    for (let j = 0; j < 4; j++) grass.add(x + side * rand() * 1.5, y, z + rand() * 2, .8, 1.65, .8, 0x8d9d62, rand() * TAU);
  }
  const canopyMeshes = trees.finish(); rocks.finish('Valley boulders and river pebbles'); shrubs.finish('Meadow shrubs');
  const grasses = grass.finish('Meadow grass and river reeds'), flowerMesh = flowers.finish('Small wildflowers');
  const life = createWorldLife(); group.add(life.group); life.update(0, 0);
  const interactions = createWorldInteractions(group, records), stats = interactions.stats;
  stats.lifeCount = life.stats.lifeCount; let actors = [];
  return {
    group, ground, water, heightAt, stats, crushables: interactions.crushables,
    update(time, delta = 0) { waterTime.value = time; windTime.value = time; life.update(time, delta, actors); },
    interact(nextActors, delta, options) { actors = nextActors || []; return interactions.interact(actors, delta, options); },
    resetInteractions: options => interactions.resetInteractions(options),
    setQuality(quality) {
      const low = quality === 'retro' || quality === 'low';
      if (grasses) grasses.visible = !low;
      if (flowerMesh) flowerMesh.visible = !low;
      canopyMeshes.forEach(mesh => { mesh.castShadow = !low; });
      life.setQuality(quality);
    }
  };
}

function siteDetails(group) {
  return {
    stone: new Instances(group, new T.BoxGeometry(1, 1, 1), getMaterial('stone', 0xffffff)),
    brick: new Instances(group, new T.BoxGeometry(1, 1, 1), getMaterial('brick', 0xffffff)),
    metal: new Instances(group, new T.BoxGeometry(1, 1, 1), getMaterial('metal', 0xffffff)),
    wood: new Instances(group, new T.BoxGeometry(1, 1, 1), getMaterial('wood', 0xffffff)),
    pipe: new Instances(group, new T.CylinderGeometry(1, 1, 1, 9), getMaterial('metal', 0xffffff)),
    rubble: new Instances(group, irregularOrb(1), getMaterial('stone', 0xffffff)),
    finish() { for (const key of ['stone', 'brick', 'metal', 'wood', 'pipe', 'rubble']) this[key].finish(`Resource site ${key}`); }
  };
}
function addWoodland(group, node, rand) {
  const trees = treeBatches(group), details = siteDetails(group), pine = node.id === 'forest2';
  for (let i = 0; i < 43; i++) {
    const a = i * 2.4, r = Math.sqrt((i + .5) / 43) * 13.5;
    const x = Math.cos(a) * r + (rand() - .5), z = Math.sin(a) * r + (rand() - .5);
    if (Math.abs(x - Math.sin(z * .2) * 2) < 1.3) continue;
    addTree(trees, rand, x, 0, z, .75 + rand() * .65, pine ? rand() > .15 : rand() < .13);
  }
  for (let i = 0; i < 23; i++) {
    const a = rand() * TAU, r = rand() * 13, x = Math.cos(a) * r, z = Math.sin(a) * r;
    details.rubble.add(x, .2, z, .45 + rand() * .6, .35, .5, ROCK_COLOURS[i % 4]);
    if (i % 2) for (let j = 0; j < 3; j++) trees.leaves.add(x + (rand() - .5) * 1.4, .6, z + (rand() - .5) * 1.4, .75, .65, .75, LEAF_COLOURS[i % 6]);
  }
  for (let i = 0; i < 6; i++) {
    const x = 5.4 + (i % 3) * .65, y = .35 + Math.floor(i / 3) * .5;
    trees.wood.link([x, y, 8], [x, y, 12], .31, 0x877055);
  }
  // The winding footpath gives the forest a readable entrance.
  for (let z = -14; z <= 13; z += 2) details.stone.add(Math.sin(z * .2) * 2, .014, z, 1.4, .035, 2.1, 0xb4af8b, -.15 * Math.cos(z * .2));
  const stump = cylinder(group, .7, .85, .7, getMaterial('wood', 0x857151), 8, .35, 7, 10);
  cylinder(group, .66, .66, .025, getMaterial('wood', 0xc1a981), stump.position.x, .713, stump.position.z, 10);
  trees.finish(); details.finish();
}
function addIronRuins(group, node, rand) {
  const d = siteDetails(group), oldTown = node.id === 'ruins2';
  box(group, 24, .13, 22, getMaterial('pavement', 0x90917e), 0, .02, 0);
  // Empty window frames and fractured slabs reveal the age of the old cities.
  const buildings = oldTown ? [[-7, -6, 7, 5, 6], [3, -7, 5, 6, 8.5], [-7, 5, 5.5, 5, 4], [5, 5, 6, 5, 6.8]] : [[-6, -4, 8, 7, 5.4], [5, -7, 5, 5, 8], [-5, 7, 7, 4, 3.7]];
  for (let i = 0; i < buildings.length; i++) {
    const [x, z, w, depth, h] = buildings[i], mat = i % 2 ? d.brick : d.stone, colour = i % 2 ? 0x99765d : 0x8c9487;
    mat.add(x, .3, z, w + .7, .6, depth + .7, 0xa2a491);
    for (const side of [-1, 1]) {
      mat.add(x + side * (w / 2 - .24), h / 2, z - depth / 2, .48, h, .55, colour);
      mat.add(x + side * (w / 2 - .24), h * .43, z + depth / 2, .48, h * .86, .55, colour);
      for (let level = 1; level < h; level += 2.1) {
        mat.add(x, level, z + side * depth / 2, w, .57, .46, colour);
        for (let xx = -w / 2 + 1.1; xx < w / 2; xx += 1.55) if (rand() > .12) mat.add(x + xx, level + .8, z + side * depth / 2, .26, 1.25, .46, colour);
      }
      mat.add(x + side * w / 2, h * .28, z, .5, h * .56, depth, colour);
    }
    d.stone.add(x, h * .62, z, w * .87, .24, depth * .67, 0xa3a495, .08);
    d.metal.add(x + w * .23, h * .65 + .8, z, .12, 1.6, .12, 0x625d50, .1);
    d.metal.add(x - w * .23, h * .65 + 1.1, z - depth * .3, .12, 2.2, .12, 0x625d50);
    if (oldTown) {
      d.stone.add(x, h + .25, z - depth / 2, w + .25, .35, .85, 0xb2ad95);
      for (let xx = -w / 2 + .5; xx < w / 2; xx += 1.25) d.stone.add(x + xx, h + .58, z - depth / 2, .42, .6, .52, 0xa6a691);
    }
  }
  if (!oldTown) {
    cylinder(group, 1.15, 1.8, 10, getMaterial('brick', 0x9c785f), -10, 5, -9, 12);
    cylinder(group, 1.37, 1.37, .45, getMaterial('stone', 0xb3ad95), -10, 10, -9, 12);
    cylinder(group, 1.05, 1.05, .04, getMaterial('metal', 0x394744), -10, 10.25, -9, 12);
    cylinder(group, 2.1, 2.1, 4, getMaterial('metal', 0x82968c), 8.5, 6.1, 6, 16);
    cone(group, 2.3, .7, getMaterial('metal', 0xa5afa0), 8.5, 8.45, 6, 16);
    for (const dx of [-1.4, 1.4]) for (const dz of [-1.4, 1.4]) d.metal.add(8.5 + dx, 2.3, 6 + dz, .19, 4.6, .19, 0x657568);
    for (const z of [4.6, 7.4]) d.pipe.link([7.1, .3, z], [9.9, 4.4, z], .06, 0x6e7768);
    for (let i = 0; i < 3; i++) {
      d.pipe.add(4.5 + i * 1.2, .5, 10, .5, .95, .5, i % 2 ? 0x9e7352 : 0x628a83);
      d.pipe.link([5 + i * 1.5, 1.2, -1], [5 + i * 1.5, 1.2, 3.6], .25, 0x8b7c64);
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = (rand() - .5) * 24, z = (rand() - .5) * 23, r = .18 + rand() * .65;
    d.rubble.add(x, .16, z, r * 1.5, r * .7, r, ROCK_COLOURS[i % 4], rand() * TAU);
    if (i % 7 === 0) d.metal.add(x, .35, z, 2 + rand() * 3, .2, .22, 0x796e5c, rand() * TAU);
  }
  const growth = treeBatches(group);
  for (const [x, z] of [[-11, 6], [10, -10], [2, 1]]) addTree(growth, rand, x, 0, z, .63, false);
  for (let i = 0; i < 24; i++) growth.leaves.add((rand() - .5) * 23, .3, (rand() - .5) * 23, .9, .4, .9, LEAF_COLOURS[i % 6]);
  growth.finish(); d.finish();
}
function addFarmland(group, node, rand) {
  const d = siteDetails(group), stalks = new Instances(group, grassGeometry(), getMaterial('grass', 0xffffff, { side: T.DoubleSide }), false);
  const grain = new Instances(group, new T.IcosahedronGeometry(1, 0), getMaterial('foliage', 0xffffff), false);
  const crops = new T.Group(); crops.rotation.y = .12; group.add(crops);
  for (let row = 0; row < 9; row++) {
    const z = -9 + row * 2.05;
    box(crops, 17, .12, 1.35, getMaterial('soil', row % 2 ? 0x8c7450 : 0x9c8158), -1, .05, z);
    for (let i = 0; i < 52; i++) {
      const x = -9.2 + i / 51 * 16.3, zz = z + (rand() - .5) * .85, h = .65 + rand() * .25;
      // Rotate the planting positions into the same gently diagonal field layout.
      const rx = x * Math.cos(.12) + zz * Math.sin(.12), rz = -x * Math.sin(.12) + zz * Math.cos(.12);
      stalks.add(rx, .11, rz, .62, h * 1.45, .62, [0xbeb367, 0xc9ba72, 0xa2ab61, 0xd0ba73][row % 4], rand() * TAU);
      grain.add(rx, h + .15, rz, .075, .21, .075, 0xe0c48a, .2);
    }
  }
  for (let x = -12; x <= 10; x += 3.2) {
    d.wood.add(x, .8, 11, .13, 1.6, .13, 0xa18a61);
    if (x < 9) { d.wood.add(x + 1.6, 1.15, 11, 3.15, .12, .12, 0xb29b6e); d.wood.add(x + 1.6, .6, 11, 3.15, .12, .12, 0xa18b61); }
  }
  // A small farmstead and stored hay give the fields a lived-in scale.
  box(group, 4, 2.8, 4, getMaterial('plaster', 0xc4b191), 10, 1.4, -7);
  const leftRoof = box(group, 2.7, .22, 4.65, getMaterial('roof', 0x8b644d), 8.9, 3.35, -7); leftRoof.rotation.z = .45;
  const rightRoof = box(group, 2.7, .22, 4.65, getMaterial('roof', 0x8b644d), 11.1, 3.35, -7); rightRoof.rotation.z = -.45;
  box(group, 1.3, 2, .09, getMaterial('wood', 0x73664a), 10, 1, -4.93);
  for (const x of [8.85, 11.15]) box(group, .48, .7, .08, getMaterial('glass', 0x526d65), x, 1.65, -4.93);
  for (let i = 0; i < 4; i++) {
    const bale = cylinder(group, .7, .7, 1.2, getMaterial('fabric', 0xc5ae72), 9.5 + i % 2 * 1.6, .7, -1 + Math.floor(i / 2) * 1.5, 12); bale.rotation.z = Math.PI / 2;
    d.wood.add(9.5 + i % 2 * 1.6, .7, -1 + Math.floor(i / 2) * 1.5, .06, 1.4, 1.4, 0x958d60);
  }
  const trees = treeBatches(group);
  for (const [x, z] of [[11, 5], [8, 9], [-12, -10]]) addTree(trees, rand, x, 0, z, .62, false);
  for (let i = 0; i < 17; i++) { const a = rand() * TAU; d.rubble.add(Math.cos(a) * 13.5, .14, Math.sin(a) * 13.5, .4, .2, .3, 0xafa78c); }
  trees.finish(); stalks.finish('Golden grain'); grain.finish('Ripe seed heads'); d.finish();
}

export function createResourceSite(node) {
  const group = new T.Group(); group.name = node.name || `${node.kind} resource site`; group.position.set(node.x, heightAt(node.x, node.z), node.z);
  const rand = random(Math.abs(node.x * 1723 + node.z * 919) + 31255);
  if (node.kind === 'wood') addWoodland(group, node, rand);
  else if (node.kind === 'iron') addIronRuins(group, node, rand);
  else addFarmland(group, node, rand);
  const ring = new T.Mesh(new T.RingGeometry(16.5, 16.62, 72), new T.MeshBasicMaterial({ color: node.kind === 'wood' ? 0xb1c48d : node.kind === 'iron' ? 0xc9b394 : 0xddc18a, side: T.DoubleSide, transparent: true, opacity: .38, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .1; ring.name = 'Resource boundary'; group.add(ring);
  const hit = new T.Mesh(new T.CylinderGeometry(17, 17, 1, 24), new T.MeshBasicMaterial({ visible: false }));
  hit.userData.node = node.id; hit.name = 'Resource selection'; group.add(hit);
  return group;
}
