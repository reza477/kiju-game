// Shared, deterministic world geometry. No rendering or browser dependencies.
export const RESOURCE_CENTRES = Object.freeze([
  [-65, -15], [40, -45], [55, 65], [90, -105], [-110, 90], [-115, -110]
].map(point => Object.freeze(point)));

export function smoothstep(a, b, value) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
export function terrainNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), tx = smoothstep(0, 1, x - ix), tz = smoothstep(0, 1, z - iz);
  const hash = (a, b) => { const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return value - Math.floor(value); };
  const mix = (a, b, t) => a + (b - a) * t;
  return mix(mix(hash(ix, iz), hash(ix + 1, iz), tx), mix(hash(ix, iz + 1), hash(ix + 1, iz + 1), tx), tz);
}
export function riverX(z) { return 5 + Math.sin(z * .009) * 22 + Math.sin(z * .020) * 7; }
export function riverWidth(z) { return 8 + 1.8 * Math.sin(z * .015 + 1.5); }
export function shoreDistance(x, z) { return Math.abs(x - riverX(z)) - riverWidth(z); }
export function roadZ(x) { return 134 + Math.sin(x * .011) * 15; }
export function protectedResource(x, z, margin = 0) {
  const radius = Math.max(0, 26 + margin);
  return RESOURCE_CENTRES.some(([cx, cz]) => Math.hypot(x - cx, z - cz) <= radius);
}

function baseHeight(x, z) {
  const edge = Math.max(Math.abs(x), Math.abs(z));
  const rolling = 3.2 + terrainNoise(x * .013 + 8, z * .013 + 2) * 5.6 + terrainNoise(x * .027 + 19, z * .027 + 5) * 1.6;
  // Broad, asymmetric ridgelines create an actual hill silhouette at city scale.
  // Their wavelengths are wider than a carrier's footprint, avoiding sharp steps.
  const westU = (x + 150) * .88 + (z + 20) * .47, westV = -(x + 150) * .47 + (z + 20) * .88;
  const eastU = (x - 163) * .96 - (z - 75) * .28, eastV = (x - 163) * .28 + (z - 75) * .96;
  const ridges = 22 * Math.exp(-(westU ** 2 / 3000 + westV ** 2 / 9700)) +
    24 * Math.exp(-(eastU ** 2 / 3300 + eastV ** 2 / 7600)) +
    17 * Math.exp(-((x - 124) ** 2 / 3800 + (z + 129) ** 2 / 4400)) +
    13 * Math.exp(-((x + 63) ** 2 / 4400 + (z + 141) ** 2 / 3000)) +
    12 * Math.exp(-((x + 41) ** 2 / 2600 + (z - 120) ** 2 / 3800));
  const westGully = z + 71 + Math.sin(x * .018) * 12;
  const eastGully = x - 91 - Math.sin(z * .017) * 11;
  const gullies = 5.5 * Math.exp(-(westGully ** 2 / 850 + (x + 103) ** 2 / 10500)) +
    4.7 * Math.exp(-(eastGully ** 2 / 950 + (z - 25) ** 2 / 13000));
  const mountains = smoothstep(180, 315, edge) * (17 + terrainNoise(x * .009 + 3, z * .009) * 65 + terrainNoise(x * .03, z * .03) * 13);
  const shore = shoreDistance(x, z);
  const valley = Math.max(2.0, rolling + ridges - gullies + mountains) * smoothstep(4, 58, shore);
  return valley - 1.2 * (1 - smoothstep(-3, 3.8, shore));
}
const clearingHeights = RESOURCE_CENTRES.map(([x, z]) => baseHeight(x, z));

export function terrainHeight(x, z) {
  let height = baseHeight(x, z);
  for (let i = 0; i < RESOURCE_CENTRES.length; i++) {
    const [cx, cz] = RESOURCE_CENTRES[i], distance = Math.hypot(x - cx, z - cz);
    if (distance < 40) {
      const keepRiverOpen = distance <= 15 ? 1 : smoothstep(-1, 7, shoreDistance(x, z));
      height += (clearingHeights[i] - height) * (1 - smoothstep(15, 40, distance)) * keepRiverOpen;
    }
  }
  return height;
}
export function terrainNormal(x, z) {
  const epsilon = .6;
  const dx = (terrainHeight(x + epsilon, z) - terrainHeight(x - epsilon, z)) / (epsilon * 2);
  const dz = (terrainHeight(x, z + epsilon) - terrainHeight(x, z - epsilon)) / (epsilon * 2);
  const length = Math.hypot(dx, 1, dz);
  return { x: -dx / length, y: 1 / length, z: -dz / length };
}
