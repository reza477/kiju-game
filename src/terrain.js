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
const ramp=(a,b,v)=>Math.max(0,Math.min(1,(v-a)/(b-a)));
export function riverX(z) { return 5 + Math.sin(z * .009) * 22 + Math.sin(z * .020) * 7; }
export function riverWidth(z) { return 8 + 1.8 * Math.sin(z * .015 + 1.5); }
export function shoreDistance(x, z) { return Math.abs(x - riverX(z)) - riverWidth(z); }
// Bank shape is deliberately separate from the historical channel-distance
// helper: scenery generation keeps its exact old accept/reject sequence.
export function bankWidth(x,z) {
  const side=Math.sign(x-riverX(z))||1;
  const bend=Math.max(-1,Math.min(1,(-.001782*Math.sin(z*.009)-.0028*Math.sin(z*.020))/.0038));
  return 4.6+(1+side*bend)*2.7+Math.sin(z*.051+side)*.8+Math.sin(z*.109+.4)*.35;
}
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
  // Four continuous fault systems replace the former inflated noise mounds.
  // An escarpment has a sharp inward face, talus apron and a long outer dip slope.
  // Lateral erosion cuts the same bed across many metres instead of scattering
  // freestanding blocks on top of otherwise featureless terrain.
  const fault=(d,along,seed,amplitude)=>{
    const notch=terrainNoise(along*.035+seed,d*.011+seed)*13+terrainNoise(along*.081+seed,seed)*4;
    const segments=.28+.72*smoothstep(.18,.76,terrainNoise(along*.014+seed,seed));
    const crest=amplitude*(.76+terrainNoise(along*.009+seed,seed)*.39)*segments-notch;
    const face=d>=0 ? (1-ramp(2,14,d))*.42+(1-ramp(22,29,d))*.24+(1-ramp(36,94,d))*.34 : Math.exp(d/112);
    const warp=terrainNoise(along*.018+seed,seed)*2.9;
    const channel=Math.max(0,terrainNoise(along*.076+warp+seed,d*.006+seed)-.39);
    const erosion=channel*channel*68;
    const planes=(terrainNoise(along*.07+seed,d*.05+seed)-.5)*3.6;
    const exposed=(smoothstep(-9,-2,d)*(1-smoothstep(43,57,d)));
    const drainage=(terrainNoise(along*.055+seed,d*.025)-.5)*5.5;
    return Math.max(0,crest*face+(drainage-erosion+planes*exposed)*smoothstep(.08,.62,face));
  };
  const westAxis=-244+Math.sin(z*.012)*22+Math.sin(z*.031)*8;
  const eastAxis=249+Math.sin(z*.010+1.4)*25+Math.sin(z*.028)*8;
  const northAxis=-254+Math.sin(x*.012+.8)*27+Math.sin(x*.034)*7;
  const southAxis=276+Math.sin(x*.014)*24;
  const mountainMask=smoothstep(178,218,edge);
  const mountains=mountainMask*Math.max(fault(x-westAxis,z,3,72),fault(eastAxis-x,z,13,91),fault(z-northAxis,x,27,99),fault(southAxis-z,x,41,64))+
    smoothstep(330,560,edge)*(13+terrainNoise(x*.017+7,z*.017)*21);
  const shoulder=(terrainNoise(x*.041+3,z*.041+5)-.5)*2.2*smoothstep(12,28,ridges)*smoothstep(24,65,shoreDistance(x,z));
  const shore = shoreDistance(x, z);
  const beach=bankWidth(x,z);
  const valley = Math.max(2.0, rolling + ridges - gullies + mountains+shoulder) * smoothstep(beach+1, 58, shore);
  return valley - 1.5 * (1 - smoothstep(-3, beach, shore));
}
const clearingHeights = RESOURCE_CENTRES.map(([x, z]) => baseHeight(x, z));

// Stable selection surface: existing deterministic scenery must consume the
// same random sequence and retain every saved anchor after landform revisions.
// This is the original height calculation, shared rather than duplicated.
export function scenerySelectionHeight(x, z) {
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
export const WESTERN_TERRACE=Object.freeze({name:'The Westbank Shelf',zMin:30,zMax:124,shoreMin:8,shoreMax:54,resourceClearance:40,roadClearance:12});

export function westernTerraceDelta(x,z){
  if(z<=30||z>=124)return 0;
  const shore=riverX(z)-riverWidth(z)-x;
  if(shore<=8||shore>=54)return 0;
  let protection=smoothstep(12,20,Math.abs(z-roadZ(x)));
  for(const[cx,cz]of RESOURCE_CENTRES)protection*=smoothstep(40,48,Math.hypot(x-cx,z-cz));
  if(protection===0)return 0;
  const ends=smoothstep(30,52,z)*(1-smoothstep(102,124,z));
  // A riverward scarp rises to a broad bench, then eases into the historical
  // shoulder. One oblique eroded runnel cuts the lip; no repeating ridge waves.
  const shelf=2.65*smoothstep(8,24,shore)*(1-smoothstep(29,54,shore));
  const notchAxis=74+(shore-23)*.36+Math.sin(shore*.13)*1.6;
  const notch=1.20*Math.exp(-(((z-notchAxis)/9)**2))*smoothstep(12,22,shore)*(1-smoothstep(34,54,shore));
  return(shelf-notch)*ends*protection;
}

export function terrainHeight(x,z){return scenerySelectionHeight(x,z)+westernTerraceDelta(x,z);}

function normalAt(height,x,z){
  const epsilon = .6;
  const dx = (height(x + epsilon, z) - height(x - epsilon, z)) / (epsilon * 2);
  const dz = (height(x, z + epsilon) - height(x, z - epsilon)) / (epsilon * 2);
  const length = Math.hypot(dx, 1, dz);
  return { x: -dx / length, y: 1 / length, z: -dz / length };
}
export function terrainNormal(x,z){return normalAt(terrainHeight,x,z);}
export function scenerySelectionNormal(x,z){return normalAt(scenerySelectionHeight,x,z);}

// Keep the precise 2 m walking surface, and allocate more vertices to the outer
// cliff faces where their physical fractures affect the visible silhouette.
export const TERRAIN_SEGMENTS=400;
export function terrainGridCoordinate(index) {
  const distance = Math.abs(index - 200);
  const coordinate=distance<=90?distance*2:distance<=150?180+(distance-90)*3:360+(distance-150)*4.8;
  return Math.fround(Math.sign(index - 200) * coordinate);
}
const groundGrid = Array.from({ length: TERRAIN_SEGMENTS+1 }, (_, i) => terrainGridCoordinate(i));
const groundVertexHeights=new Float32Array((TERRAIN_SEGMENTS+1)**2),groundVertexReady=new Uint8Array(groundVertexHeights.length);
function groundVertexHeight(ix,iz){
  const index=iz*(TERRAIN_SEGMENTS+1)+ix;
  if(!groundVertexReady[index]){
    groundVertexHeights[index]=Math.fround(terrainHeight(groundGrid[ix],groundGrid[iz]));
    groundVertexReady[index]=1;
  }
  return groundVertexHeights[index];
}
function groundInterval(value) {
  let low = 0, high = TERRAIN_SEGMENTS;
  while (high - low > 1) { const mid = (low + high) >> 1; if (value < groundGrid[mid]) high = mid; else low = mid; }
  return Math.min(TERRAIN_SEGMENTS-1, low);
}
export function renderedTerrainHeight(x, z) {
  if (Math.abs(x) > 600 || Math.abs(z) > 600) return terrainHeight(x, z);
  const ix = groundInterval(x), iz = groundInterval(z);
  const ax = groundGrid[ix], bx = groundGrid[ix + 1], az = groundGrid[iz], bz = groundGrid[iz + 1];
  const u = (x - ax) / (bx - ax), v = (z - az) / (bz - az);
  const a = groundVertexHeight(ix,iz), b = groundVertexHeight(ix+1,iz);
  const c = groundVertexHeight(ix,iz+1), d = groundVertexHeight(ix+1,iz+1);
  return u + v <= 1 ? a * (1 - u - v) + b * u + c * v : d * (u + v - 1) + b * (1 - v) + c * (1 - u);
}
