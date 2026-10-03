import * as T from '../vendor/three.module.js';

// Original, reproducible cutout artwork. These CPU rasterizers require neither
// Canvas nor an image download, so the same assets work offline and in Node.
const SIZE = 256, CUTOUT = .38, textures = new Map();
function random(seed) { let n = seed >>> 0; return () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

function raster() {
  const data = new Uint8Array(SIZE * SIZE * 4);
  // Dilated neutral RGB in transparent texels avoids dark interpolation fringes.
  for (let i = 0; i < data.length; i += 4) { data[i] = 228; data[i + 1] = 239; data[i + 2] = 218; }
  function blend(x, y, alpha, colour, light = 1) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const index = (y * SIZE + x) * 4, previous = data[index + 3] / 255;
    const coverage = alpha + previous * (1 - alpha);
    if (coverage <= 0) return;
    for (let c = 0; c < 3; c++) data[index + c] = Math.round(clamp((colour[c] * light * alpha + data[index + c] * previous * (1 - alpha)) / coverage, 0, 255));
    data[index + 3] = Math.round(coverage * 255);
  }
  function stroke(ax, ay, bx, by, width, colour) {
    const dx = bx - ax, dy = by - ay, length2 = dx * dx + dy * dy;
    const xmin = Math.max(0, Math.floor((Math.min(ax, bx) - width) * SIZE - 1));
    const xmax = Math.min(SIZE - 1, Math.ceil((Math.max(ax, bx) + width) * SIZE + 1));
    const ymin = Math.max(0, Math.floor((Math.min(ay, by) - width) * SIZE - 1));
    const ymax = Math.min(SIZE - 1, Math.ceil((Math.max(ay, by) + width) * SIZE + 1));
    for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) {
      const px = (x + .5) / SIZE, py = (y + .5) / SIZE;
      const t = clamp(((px - ax) * dx + (py - ay) * dy) / Math.max(length2, .000001));
      const distance = Math.hypot(px - ax - dx * t, py - ay - dy * t);
      blend(x, y, clamp((width - distance) * SIZE + .5), colour);
    }
  }
  function leaf(ax, ay, bx, by, width, colour, needle = false) {
    const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy), ux = dx / length, uy = dy / length;
    const xmin = Math.max(0, Math.floor((Math.min(ax, bx) - width) * SIZE - 1));
    const xmax = Math.min(SIZE - 1, Math.ceil((Math.max(ax, bx) + width) * SIZE + 1));
    const ymin = Math.max(0, Math.floor((Math.min(ay, by) - width) * SIZE - 1));
    const ymax = Math.min(SIZE - 1, Math.ceil((Math.max(ay, by) + width) * SIZE + 1));
    for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) {
      const px = (x + .5) / SIZE - ax, py = (y + .5) / SIZE - ay;
      const t = (px * ux + py * uy) / length;
      if (t <= 0 || t >= 1) continue;
      const across = -px * uy + py * ux;
      const silhouette = width * (needle ? Math.pow(Math.sin(Math.PI * t), .55) : Math.pow(Math.sin(Math.PI * t), .78));
      const alpha = clamp((silhouette - Math.abs(across)) * SIZE + .5);
      // Slight lamina/vein relief is baked colour, never specular plastic.
      const light = .87 + .10 * t + .055 * (across > 0 ? 1 : 0) + .025 * Math.exp(-Math.abs(across) * 450);
      blend(x, y, alpha, colour, light);
    }
  }
  function blade(root, tip, bend, width, colour) {
    let previous = root;
    const steps = 22;
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const point = [root[0] + (tip[0] - root[0]) * t + Math.sin(t * Math.PI) * bend, root[1] + (tip[1] - root[1]) * t];
      stroke(previous[0], previous[1], point[0], point[1], width * Math.pow(1 - t, .72) + .00015, colour);
      previous = point;
    }
  }
  return { data, stroke, leaf, blade };
}

function broadleaf(r) {
  const rand = random(90703), endpoints = [[.20,.46],[.23,.69],[.36,.84],[.49,.91],[.66,.84],[.80,.69],[.82,.45],[.64,.30],[.47,.58]];
  for (let branch = 0; branch < endpoints.length; branch++) {
    const [ex, ey] = endpoints[branch], rx = .46 + (rand() - .5) * .17, ry = .23 + rand() * .19;
    r.stroke(rx, ry, ex, ey, .0042, [176, 179, 150]);
    const angle = Math.atan2(ey - ry, ex - rx);
    for (let j = 0; j < 8; j++) {
      const t = .22 + j * .103, x = rx + (ex - rx) * t, y = ry + (ey - ry) * t;
      for (const side of [-1, 1]) {
        const a = angle + side * (.54 + rand() * .68), length = .074 + rand() * .060;
        const tx = clamp(x + Math.cos(a) * length, .045, .955), ty = clamp(y + Math.sin(a) * length, .055, .955);
        const shade = .91 + rand() * .09;
        r.leaf(x, y, tx, ty, .025 + rand() * .014, [249 * shade, 255 * shade, 224 * shade]);
      }
    }
  }
}

function pine(r) {
  // Connected, oblique branch axes carry unequal needle clusters. Transparent
  // windows between forks expose real branches without outlining an oval pad.
  const rand = random(54617), ends = [[.12,.48],[.31,.82],[.24,.24],[.51,.91],[.73,.54],[.88,.80],[.86,.35],[.64,.11],[.74,.89]];
  const spine = t => [.18 + t * .58, .17 + t * .62 + Math.sin(t * Math.PI) * .035];
  for (let i = 0; i < 9; i++) r.stroke(...spine(i / 9), ...spine((i + 1) / 9), .004, [191, 198, 176]);
  for (let branch = 0; branch < ends.length; branch++) {
    const [ex, ey] = ends[branch], root = spine(.09 + branch * .092);
    r.stroke(...root, ex, ey, .0036, [191, 198, 176]);
    const axis = Math.atan2(ey - root[1], ex - root[0]);
    for (let j = 0; j < 10; j++) {
      const t = .14 + j * .091, nx = root[0] + (ex - root[0]) * t, ny = root[1] + (ey - root[1]) * t;
      for (const side of [-1, 1]) for (let layer = 0; layer < 3; layer++) {
        const a = axis + side * (.34 + layer * .30 + rand() * .19), length = (.095 + rand() * .090) * (1.38 - t * 1.02), shade = .87 + rand() * .13;
        r.leaf(nx, ny, clamp(nx + Math.cos(a) * length, .035, .955), clamp(ny + Math.sin(a) * length - t * t * .061 - layer * .009, .035, .955), (.0051 + rand() * .0024) * (1.16 - t * .40), [238 * shade, 254 * shade, 226 * shade], true);
      }
    }
  }
}

function grass(r) {
  const rand = random(43769);
  for (let i = 0; i < 58; i++) {
    const root = [.22 + rand() * .53, .018 + rand() * .016];
    const height = .37 + rand() * .52 - Math.abs(root[0] - .48) * .30;
    const tip = [clamp(root[0] + .075 + (rand() - .5) * .13, .045, .955), height];
    const colour = i % 8 === 0 ? [237, 228, 182] : [232 + rand() * 21, 248 + rand() * 7, 206 + rand() * 28];
    r.blade(root, tip, .055 + rand() * .060, .0077 + rand() * .0037, colour);
  }
}

function coverageMipmaps(data) {
  const levels = [{ data, width: SIZE, height: SIZE }];
  let covered = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] / 255 >= CUTOUT) covered++;
  const target = covered / (SIZE * SIZE);
  for (let size = SIZE / 2; size >= 1; size /= 2) {
    const parent = levels.at(-1), next = new Uint8Array(size * size * 4), alphaValues = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dest = (y * size + x) * 4, rgb = [0, 0, 0];
      let alpha = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const source = ((y * 2 + dy) * parent.width + x * 2 + dx) * 4, weight = parent.data[source + 3];
        alpha += weight;
        for (let c = 0; c < 3; c++) rgb[c] += parent.data[source + c] * weight;
      }
      for (let c = 0; c < 3; c++) next[dest + c] = alpha ? Math.round(rgb[c] / alpha) : 232;
      next[dest + 3] = Math.round(alpha / 4);
      alphaValues.push(next[dest + 3]);
    }
    // Preserve the occupied silhouette through useful mip levels. Uncorrected
    // box averages erase thin grass/needles well before their geometric LOD.
    if (size >= 4) {
      alphaValues.sort((a, b) => b - a);
      const boundary = alphaValues[Math.max(0, Math.ceil(size * size * target) - 1)];
      const gain = boundary ? clamp((CUTOUT * 255 + .5) / boundary, .5, 4) : 1;
      for (let i = 3; i < next.length; i += 4) next[i] = Math.min(255, Math.round(next[i] * gain));
    }
    levels.push({ data: next, width: size, height: size });
  }
  return levels;
}

function texture(kind) {
  if (textures.has(kind)) return textures.get(kind);
  const artwork = raster();
  ({ broadleaf, pine, grass })[kind](artwork);
  const map = new T.DataTexture(artwork.data, SIZE, SIZE, T.RGBAFormat);
  map.name = `Local ${kind} cutout`;
  map.colorSpace = T.SRGBColorSpace;
  map.mipmaps = coverageMipmaps(artwork.data);
  map.generateMipmaps = false;
  map.minFilter = T.LinearMipmapLinearFilter;
  map.magFilter = T.LinearFilter;
  map.anisotropy = 4;
  map.needsUpdate = true;
  textures.set(kind, map);
  return map;
}

/**
 * Pair broadleaf/pine with branchSprayGeometry(false/true), grass with
 * grassTuftGeometry(). Broadleaf also serves shrub sprays. Wind integration may
 * clone this material; custom shadow passes must copy map, alphaTest and side.
 */
export function createVegetationMaterial(kind) {
  if (!['broadleaf', 'pine', 'grass'].includes(kind)) throw new RangeError(`Unknown vegetation kind: ${kind}`);
  const material = new T.MeshStandardMaterial({
    name: `Matte ${kind} cutout`, color: 0xffffff, map: texture(kind),
    vertexColors: true, side: T.DoubleSide, roughness: .96, metalness: 0,
    alphaTest: CUTOUT, transparent: false, depthWrite: true
  });
  // Wind's visible shader preserves the spray-volume normal on both faces.
  // Shadow passes still use the identical card geometry and alpha cutout.
  material.userData.crownVolumeNormals = kind === 'broadleaf' || kind === 'pine';
  material.userData.rootedBladeNormals = kind === 'grass';
  return material;
}
