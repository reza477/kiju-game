import * as T from '../vendor/three.module.js';

// Original local procedural meadow artwork, not a photograph or material scan.
const SIZE = 512, METRES = 9, TAU = Math.PI * 2;
let cached;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const wrap = value => ((value % SIZE) + SIZE) % SIZE;
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
function random(seed) { let n = seed >>> 0; return () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hash(x, y, seed) {
  let n = Math.imul(x + seed, 374761393) + Math.imul(y - seed, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function noise(u, v, cells, seed) {
  const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y);
  const tx = ease(x - ix), ty = ease(y - iy), cell = i => ((i % cells) + cells) % cells;
  const a = hash(cell(ix), cell(iy), seed), b = hash(cell(ix + 1), cell(iy), seed);
  const c = hash(cell(ix), cell(iy + 1), seed), d = hash(cell(ix + 1), cell(iy + 1), seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

function generate() {
  const turf = new Float32Array(SIZE * SIZE), relief = new Float32Array(turf.length), height = new Float32Array(turf.length);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const u = (x + .5) / SIZE, v = (y + .5) / SIZE, index = y * SIZE + x;
    const wu = u + (noise(u, v, 5, 37) - .5) * .085, wv = v + (noise(u, v, 5, 83) - .5) * .085;
    // Connected ragged patches, mostly 0.3–1.5 m across, bridge the very broad
    // biome paint and the individual blades instead of stamping isolated weeds.
    const field = noise(wu, wv, 7, 11) * .48 + noise(wu, wv, 17, 23) * .29 + noise(wu, wv, 37, 43) * .18 + noise(u, v, 83, 59) * .05;
    const grain = noise(u, v, 191, 71), cover = ease((field - .365) / .265);
    turf[index] = clamp(cover + (grain - .5) * .065);
    relief[index] = .53 - cover * .065 + (grain - .5) * .11;
    height[index] = grain * .0018;
  }

  function blade(x, y, angle, length, width, bend, value, litter = false) {
    const ca = Math.cos(angle), sa = Math.sin(angle), radius = Math.ceil(length + Math.abs(bend) + width + 1);
    const loX = Math.floor(x - radius), hiX = Math.ceil(x + radius), loY = Math.floor(y - radius), hiY = Math.ceil(y + radius);
    for (let py = loY; py <= hiY; py++) for (let px = loX; px <= hiX; px++) {
      const dx = px + .5 - x, dy = py + .5 - y, t = (dx * ca + dy * sa) / length;
      if (t <= 0 || t >= 1) continue;
      const across = -dx * sa + dy * ca - Math.sin(t * Math.PI) * bend;
      const halfWidth = width * (litter ? Math.pow(Math.sin(t * Math.PI), .72) : Math.pow(1 - t, .68));
      const alpha = clamp(halfWidth - Math.abs(across) + .5);
      if (!alpha) continue;
      const index = wrap(py) * SIZE + wrap(px), light = value * (.82 + .18 * t);
      turf[index] += ((litter ? .15 : .92) - turf[index]) * alpha * (litter ? .60 : .65);
      relief[index] += (light - relief[index]) * alpha;
      height[index] = Math.max(height[index], alpha * Math.sin(t * Math.PI) * (litter ? .0055 : .011));
    }
  }
  function rootShade(x, y, radius, strength) {
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.hypot(dx, dy) / radius;
      if (distance >= 1) continue;
      const index = wrap(Math.floor(y + dy)) * SIZE + wrap(Math.floor(x + dx));
      relief[index] = Math.max(.24, relief[index] - (1 - distance) ** 2 * strength);
    }
  }

  const rand = random(794391);
  for (let clump = 0; clump < 230; clump++) {
    const cx = rand() * SIZE, cy = rand() * SIZE, density = turf[Math.floor(cy) * SIZE + Math.floor(cx)];
    const radius = 9 + rand() * 29, heading = rand() * TAU, count = Math.floor(12 + density * (27 + rand() * 26));
    for (let i = 0; i < count; i++) {
      const angle = rand() * TAU, spread = Math.sqrt(rand()) * radius;
      const x = cx + Math.cos(angle) * spread, y = cy + Math.sin(angle) * spread * (.50 + rand() * .5);
      rootShade(x, y, 2, .065);
      blade(x, y, heading + (rand() - .5) * 4.7, 3 + rand() * 12, .38 + rand() * .49, (rand() - .5) * 4, .59 + rand() * .25);
    }
  }
  // Small fallen leaves and dry culms cross both turf and exposed earth.
  for (let leaf = 0; leaf < 510; leaf++) blade(rand() * SIZE, rand() * SIZE, rand() * TAU, 3 + rand() * 8, .6 + rand() * 1.3, (rand() - .5) * 1.9, .57 + rand() * .24, true);
  for (let straw = 0; straw < 340; straw++) blade(rand() * SIZE, rand() * SIZE, rand() * TAU, 7 + rand() * 14, .25 + rand() * .30, (rand() - .5) * 3, .68, true);

  const data = new Uint8Array(SIZE * SIZE * 4), pixelMetres = METRES / SIZE;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const index = y * SIZE + x, pixel = index * 4;
    const dx = (height[y * SIZE + wrap(x + 1)] - height[y * SIZE + wrap(x - 1)]) / (2 * pixelMetres);
    const dz = (height[wrap(y + 1) * SIZE + x] - height[wrap(y - 1) * SIZE + x]) / (2 * pixelMetres);
    data[pixel] = Math.round(clamp(turf[index]) * 255);
    data[pixel + 1] = Math.round(clamp(relief[index]) * 255);
    data[pixel + 2] = Math.round((.5 - clamp(dx, -.55, .55) * .5) * 255);
    data[pixel + 3] = Math.round((.5 - clamp(dz, -.55, .55) * .5) * 255);
  }
  return data;
}

/**
 * Original seamless 9 m meadow tile; one cached 512px RGBA DataTexture.
 * R: turf mask (0 exposed soil, 1 dense grass).
 * G: albedo/root/litter relief, neutral .5; e.g. multiplier 1+(G-.5)*.65.
 * BA: micro-normal X/Z slopes, decoded with sample.ba*2-1. A normal is
 * normalize(vec3(slopes.x,1,slopes.y)); scale slopes for subtle integration.
 * Packed data is linear/NoColorSpace. Apply the caller's existing turf/soil
 * palette and ecological mask; no authored biome colours are baked here.
 */
export function createMeadowSurface() {
  if (cached) return cached;
  const texture = new T.DataTexture(generate(), SIZE, SIZE, T.RGBAFormat);
  texture.name = 'Original local meadow turf, litter and micro-relief';
  texture.colorSpace = T.NoColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.anisotropy = 4;
  texture.userData = { tileMetres: METRES, channels: 'R turf; G albedo relief; BA signed normal X/Z' };
  texture.needsUpdate = true;
  cached = texture;
  return texture;
}
