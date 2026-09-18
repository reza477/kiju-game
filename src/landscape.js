import * as T from '../vendor/three.module.js';
import { getMaterial, box, cylinder, cone } from './materials.js';
import { terrainHeight as heightAt, terrainNormal, scenerySelectionHeight, scenerySelectionNormal, westernTerraceDelta, WESTERN_TERRACE, terrainGridCoordinate, TERRAIN_SEGMENTS, renderedTerrainHeight, historicalRenderedTerrainHeight, protectedResource, riverX, riverWidth, shoreDistance, bankWidth, roadZ, terrainNoise as noise, smoothstep as smooth, RESOURCE_CENTRES } from './terrain.js';
import { createWorldLife } from './world-life.js';
import { windAt, WIND_GLSL } from './weather.js';
import { branchSprayGeometry, grassTuftGeometry, fernGeometry, fracturedRockGeometry, ridgeBedGeometry, botanicalTree } from './environment-geometry.js';
import { valleyWoodland, valleyGroundCover, valleyDrainageDiagnostics, composeAuthoredValley } from './authored-valley.js';
import { createBridgeAbutments } from './bridge-study.js';
import { partitionStaticInstances } from './spatial-instances.js';
import { createVegetationMaterial } from './vegetation-materials.js';

// All scenery is generated locally. Instancing keeps the many small details cheap.
const TAU = Math.PI * 2;
const UP = new T.Vector3(0, 1, 0);
const RESOURCE_CLEARINGS = RESOURCE_CENTRES;
const TEMP = new T.Object3D();
// Coarser far-field triangles can differ from the analytic ridge by metres.
// Root scenery on that visible surface; the playable physics field stays intact.
const sceneryHeight=(x,z)=>Math.max(Math.abs(x),Math.abs(z))>178?renderedTerrainHeight(x,z):heightAt(x,z);
// The edited shelf lies entirely inside178m. Far scenery therefore retains the
// exact historical rendered-grid sampler, including its former selection gates.
const selectionSceneryHeight=(x,z)=>Math.max(Math.abs(x),Math.abs(z))>178?historicalRenderedTerrainHeight(x,z):scenerySelectionHeight(x,z);
const LEAF_COLOURS = [0x536e3b, 0x678747, 0x77994f, 0x819951, 0x486745, 0x95a65c];
const PINE_COLOURS = [0x3f654e, 0x4c7558, 0x557e58, 0x64865f];
const ROCK_COLOURS = [0x898d80, 0x9b9b8d, 0x747d72, 0xb4af9b];
const vegetationTime = { value: 0 }, windMaterials = new Map();
const metricInstanceMaterials=new Map();
function metricInstanceMaterial(source){
  if(!source.userData.surfaceScale)return source;
  if(metricInstanceMaterials.has(source.uuid))return metricInstanceMaterials.get(source.uuid);
  const m=source.clone(),prior=source.onBeforeCompile,priorKey=source.customProgramCacheKey();
  m.userData.shared=false;
  m.onBeforeCompile=shader=>{
    prior.call(source,shader);
    shader.uniforms.uScenerySurfaceScale={value:source.userData.surfaceScale};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uScenerySurfaceScale;').replace('#include <uv_vertex>',`#include <uv_vertex>
      #ifdef USE_INSTANCING
        vec3 surfaceWorld=(modelMatrix*instanceMatrix*vec4(position,1.0)).xyz;
        mat3 basis=mat3(instanceMatrix);
        vec3 surfaceNormal=normalize(mat3(modelMatrix)*basis*(normal/vec3(dot(basis[0],basis[0]),dot(basis[1],basis[1]),dot(basis[2],basis[2]))));
        vec3 face=abs(surfaceNormal);
        vec2 metricUv=(face.y>face.x&&face.y>face.z)?surfaceWorld.xz:face.x>face.z?surfaceWorld.zy:surfaceWorld.xy;
        metricUv/=uScenerySurfaceScale;
        #ifdef USE_MAP
          vMapUv=metricUv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv=metricUv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv=metricUv;
        #endif
      #endif
    `);
  };
  m.customProgramCacheKey=()=>priorKey+':world-metric-scenery-v1';
  metricInstanceMaterials.set(source.uuid,m);return m;
}
const VEGETATION_GLSL = `
  uniform float uVegetationTime;
  attribute vec4 windRoot;
  attribute vec2 windFlex;
  attribute vec2 windMotion;
  attribute float groundCoverLod;
  mat3 vegetationGradient;
  ${WIND_GLSL}
  vec3 rootedWindOffset(vec3 p) {
    vec2 anchor = (modelMatrix * vec4(windRoot.xyz, 1.0)).xz;
    vec3 breeze = worldWind(uVegetationTime, anchor);
    float height = max(windRoot.w, .1);
    float rawTip = (p.y - windRoot.y) / height;
    float tip = clamp(rawTip, 0.0, 1.2);
    float phase = anchor.x * .021 + anchor.y * .013;
    float pulse = .58 + .42 * sin(uVegetationTime * windMotion.x + phase);
    float bendGain = windFlex.x * (.22 + breeze.z * .78) * pulse;
    float freeBend = bendGain * pow(tip, 1.65);
    float bend = min(.70, freeBend);
    float flutterPhase = uVegetationTime * windMotion.y + phase + p.x * .57 + p.z * .33;
    float flutter = windFlex.y * tip * tip * sin(flutterPhase);
    // Analytic derivatives of the same offset drive the lighting normal. This
    // avoids extra wind samples and keeps visible/depth vertex positions equal.
    float tipSlope = rawTip > 0.0 && rawTip < 1.2 ? 1.0 / height : 0.0;
    float bendSlope = freeBend < .70 ? bendGain * 1.65 * pow(tip, .65) * tipSlope : 0.0;
    float flutterSlope = windFlex.y * 2.0 * tip * tipSlope * sin(flutterPhase);
    vec3 flutterDirection = vec3(-breeze.y, 0.0, breeze.x);
    vec3 acrossSlope = flutterDirection * (windFlex.y * tip * tip * cos(flutterPhase));
    vec3 upSlope = vec3(breeze.x * bendSlope, -(bendSlope * tip + bend * tipSlope) * .018, breeze.y * bendSlope) + flutterDirection * flutterSlope;
    vegetationGradient = mat3(acrossSlope * .57, upSlope, acrossSlope * .33);
    return vec3(breeze.x * bend - breeze.y * flutter, -abs(bend) * tip * .018, breeze.y * bend + breeze.x * flutter);
  }
`;
const VEGETATION_NORMAL = `
  #ifdef USE_INSTANCING
    vec3 vegetationNormalPoint = (instanceMatrix * vec4(position, 1.0)).xyz;
    vec3 vegetationNormalOffset = rootedWindOffset(vegetationNormalPoint);
    mat3 vegetationInstance = mat3(instanceMatrix);
    vec3 vegetationBaseNormal = normalize(vegetationInstance * (objectNormal / vec3(
      dot(vegetationInstance[0], vegetationInstance[0]),
      dot(vegetationInstance[1], vegetationInstance[1]),
      dot(vegetationInstance[2], vegetationInstance[2]))));
    mat3 deformation = mat3(1.0) + vegetationGradient;
    vec3 bentNormal = normalize(
      cross(deformation[1], deformation[2]) * vegetationBaseNormal.x +
      cross(deformation[2], deformation[0]) * vegetationBaseNormal.y +
      cross(deformation[0], deformation[1]) * vegetationBaseNormal.z);
    vec3 normalChange = bentNormal - vegetationBaseNormal;
    // Keep small foliage details responsive without rolling entire crown lights.
    bentNormal = normalize(vegetationBaseNormal + normalChange * min(1.0, .28 / max(length(normalChange), .00001)));
    objectNormal = vec3(dot(vegetationInstance[0], bentNormal), dot(vegetationInstance[1], bentNormal), dot(vegetationInstance[2], bentNormal));
  #endif
  #include <defaultnormal_vertex>
`;
const VEGETATION_TRANSFORM = `
  #include <begin_vertex>
  #ifdef USE_INSTANCING
    // Near-field grasses settle into their matching soil colour at distance.
    // Opaque geometry shrinks at the root, avoiding alpha shimmer and a hard pop.
    float coverScale = 1.0;
    if (groundCoverLod > .5) {
      vec3 rootWorld = (modelMatrix * vec4(windRoot.xyz, 1.0)).xyz;
      coverScale = 1.0 - smoothstep(155.0, 250.0, distance(cameraPosition, rootWorld));
      transformed *= coverScale;
    }
    vec3 vegetationPoint = (instanceMatrix * vec4(transformed, 1.0)).xyz;
    // Re-evaluate wind at the shrunken position for grass in both passes. At
    // zero scale its root stays still, including the shadow silhouette.
    #ifdef STANDARD
      vec3 vegetationOffset = vegetationNormalOffset;
      if (groundCoverLod > .5) vegetationOffset = rootedWindOffset(vegetationPoint) * coverScale;
    #else
      vec3 vegetationOffset = rootedWindOffset(vegetationPoint) * coverScale;
    #endif
    // Inverse of an orthogonal rotation/scale, without a per-vertex matrix inverse.
    transformed += vec3(
      dot(instanceMatrix[0].xyz, vegetationOffset) / max(dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz), .0000001),
      dot(instanceMatrix[1].xyz, vegetationOffset) / max(dot(instanceMatrix[1].xyz, instanceMatrix[1].xyz), .0000001),
      dot(instanceMatrix[2].xyz, vegetationOffset) / max(dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz), .0000001)
    );
  #endif
`;
function vegetationShader(shader) {
  shader.uniforms.uVegetationTime = vegetationTime;
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + VEGETATION_GLSL).replace('#include <defaultnormal_vertex>', VEGETATION_NORMAL).replace('#include <begin_vertex>', VEGETATION_TRANSFORM);
}
function animateVegetation(mesh, items, kind) {
  const roots = new Float32Array(items.length * 4), flex = new Float32Array(items.length * 2), motion = new Float32Array(items.length * 2);
  items.forEach((item, i) => {
    const root = item.windRoot || [item.x, item.y - (kind === 'grass' ? 0 : item.sy), item.z, Math.max(.2, item.sy * (kind === 'grass' ? .85 : 2))];
    roots.set(root, i * 4);
    flex.set(item.windFlex || (item.windRoot ? [.66, kind === 'wood' ? .004 : .055] : [kind === 'grass' ? Math.min(.40, item.sy * .24) : .14, kind === 'wood' ? 0 : .025]), i * 2);
    motion.set(item.windMotion || (kind === 'grass' && !item.windRoot ? [1.03, 2.8] : [.73, 2.4]), i * 2);
    if (kind === 'wood' && !item.windRoot) flex.set([0, 0], i * 2); // Felled logs stay still.
  });
  mesh.geometry.setAttribute('windRoot', new T.InstancedBufferAttribute(roots, 4));
  mesh.geometry.setAttribute('windFlex', new T.InstancedBufferAttribute(flex, 2));
  mesh.geometry.setAttribute('windMotion', new T.InstancedBufferAttribute(motion, 2));
  mesh.geometry.setAttribute('groundCoverLod', new T.InstancedBufferAttribute(new Float32Array(items.length).fill(kind==='grass'?1:0),1));
  const key = mesh.material.uuid;
  if (!windMaterials.has(key)) {
    const material = mesh.material.clone(); material.onBeforeCompile = vegetationShader; material.customProgramCacheKey = () => 'rooted-cutout-distance-v5';
    const silhouette={side:material.side,map:material.map,alphaTest:material.alphaTest};
    const depth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, ...silhouette });
    const distance = new T.MeshDistanceMaterial(silhouette);
    for (const pass of [depth, distance]) { pass.onBeforeCompile = vegetationShader; pass.customProgramCacheKey = () => 'rooted-gust-distance-depth-v4'; }
    windMaterials.set(key, { material, depth, distance });
  }
  const passes = windMaterials.get(key); mesh.material = passes.material; mesh.customDepthMaterial = passes.depth; mesh.customDistanceMaterial = passes.distance;
  mesh.userData.windAnimated = true; mesh.userData.noBatch = true; mesh.boundingSphere.radius += 1;
}

function regionAt(x, z) {
  const patch = (cx, cz, rx, rz) => Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
  return {
    ash: Math.max(patch(40, -45, 38, 43), patch(-110, 90, 43, 39)),
    slate: Math.max(patch(124, -86, 81, 83), patch(-151, -42, 43, 72)),
    meadow: Math.max(patch(55, 65, 45, 42), patch(-115, -110, 39, 37))
  };
}
// These named ecotones share one field between the ground and the vegetation.
// They frame the initial journeys without filling the route itself with props.
function ecologyAt(x,z) {
  if(Math.max(Math.abs(x),Math.abs(z))>225)return {woods:0,wet:0,broken:0,open:0};
  const lobe=(cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
  let route=Infinity;
  for(const [cx,cz]of RESOURCE_CLEARINGS){
    const dx=cx+30,dz=cz-40,t=Math.max(0,Math.min(1,((x+30)*dx+(z-40)*dz)/(dx*dx+dz*dz)));
    route=Math.min(route,Math.hypot(x+30-dx*t,z-40-dz*t));
  }
  const open=smooth(10,18,route)*(protectedResource(x,z,2)?0:1)*(1-smooth(195,225,Math.max(Math.abs(x),Math.abs(z))));
  const edge=noise(x*.066+31,z*.057-8),d=shoreDistance(x,z),beach=bankWidth(x,z);
  const west=Math.max(lobe(-93,38,43,29),lobe(-75,80,31,24),lobe(-137,-29,37,40));
  const east=lobe(108,58,40,35);
  const woods=Math.max(Math.max(west,east)*smooth(.27,.66,edge),valleyWoodland(x,z)*smooth(.18,.58,edge))*smooth(beach+7,beach+18,d)*open;
  const bend=Math.max(lobe(riverX(24)-riverWidth(24)-9,24,20,32),lobe(riverX(93)+riverWidth(93)+9,93,20,28));
  const wet=bend*smooth(-1,2,d)*(1-smooth(beach+7,beach+16,d))*open;
  const broken=Math.max(lobe(-95,-1,25,29),lobe(76,8,30,25))*smooth(.30,.68,noise(x*.041-3,z*.049+9))*open;
  return {woods,wet,broken,open};
}
function groundTexture(data, size, colour = false, repeat = false) {
  const texture = new T.DataTexture(data, size, size, T.RGBAFormat);
  texture.colorSpace = colour ? T.SRGBColorSpace : T.NoColorSpace;
  texture.wrapS = texture.wrapT = repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping;
  texture.generateMipmaps = true; texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter; texture.anisotropy = 4; texture.needsUpdate = true;
  return texture;
}
function groundDetail(kind) {
  const size = 256, data = new Uint8Array(size * size * 4);
  const periodic = (u, v, cells) => {
    const x = u * cells, z = v * cells, ix = Math.floor(x), iz = Math.floor(z), tx = smooth(0, 1, x - ix), tz = smooth(0, 1, z - iz);
    const hash = (a, b) => { const value = Math.sin(((a + cells) % cells) * 127.1 + ((b + cells) % cells) * 311.7) * 43758.5453; return value - Math.floor(value); };
    return (hash(ix, iz) * (1 - tx) + hash(ix + 1, iz) * tx) * (1 - tz) + (hash(ix, iz + 1) * (1 - tx) + hash(ix + 1, iz + 1) * tx) * tz;
  };
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const u = x / size, v = z / size;
    // Wrapped lattice noise is seamless without an obvious repeated wave or
    // checker pattern. Each surface has a different grain size and contrast.
    const grain = periodic(u, v, 97) - .5, middle = periodic(u, v, 31) - .5, broad = periodic(u, v, 7) - .5;
    let value;
    if (kind === 'grass') {
      value = .55 + grain * .32 + middle * .19 + broad * .055;
    } else if (kind === 'slate') {
      const flakes = smooth(.53, .66, periodic(u, v, 19));
      value = .59 + broad * .14 + grain * .21 + middle * .27 - flakes * .13;
    } else value = .53 + broad * .13 + middle * .30 + grain * .27;
    const c = Math.round(Math.max(0, Math.min(1, value)) * 255), i = (z * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = c; data[i + 3] = 255;
  }
  return groundTexture(data, size, false, true);
}
function ruinFootprint(x, z) {
  let footprint = 0;
  for (const [cx, cz] of [[40, -45], [-110, 90]]) {
    const dx = Math.abs(x - cx), dz = Math.abs(z - cz);
    const apron = (1 - smooth(13, 28, dx)) * (1 - smooth(14, 29, dz));
    const approach = cx < 0 ? (1 - smooth(2, 6, Math.abs(x - cx + (z - cz) * .10))) * smooth(-5, 4, z - cz) * (1 - smooth(27, 40, z - cz)) :
      (1 - smooth(2, 6, Math.abs(z - cz - (x - cx) * .20))) * smooth(-5, 3, cx - x) * (1 - smooth(17, 30, cx - x));
    footprint = Math.max(footprint, apron, approach);
  }
  return footprint;
}
function groundAlbedo() {
  const size = 1024, colourData = new Uint8Array(size * size * 4), weightData = new Uint8Array(size * size * 4), heights = new Float32Array(size * size), relief = new Float32Array(size * size);
  const spacing = 1200 / (size - 1), c = new T.Color();
  const palette = Object.fromEntries(Object.entries({ grass: 0x627344, dry: 0x8a8156, meadow: 0x869451, soil: 0x79654b, litter:0x464335, moss:0x50633d, ash: 0x777269, slate: 0x687078, wet: 0x394d35, gravel: 0xaaa18a, riverbed: 0x405c54, drainage:0x6b6755, silt:0x95876b, sedge:0x525e39 }).map(([key, value]) => [key, new T.Color(value)]));
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) heights[row * size + col] = renderedTerrainHeight(col * spacing - 600, 600 - row * spacing);
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const x = col * spacing - 600, z = 600 - row * spacing, i = row * size + col, y = heights[i];
    const dx = (heights[row * size + Math.min(size - 1, col + 1)] - heights[row * size + Math.max(0, col - 1)]) / (spacing * 2);
    const dz = (heights[Math.min(size - 1, row + 1) * size + col] - heights[Math.max(0, row - 1) * size + col]) / (spacing * 2);
    const slope = Math.hypot(dx, dz), region = regionAt(x, z), d = shoreDistance(x, z), eco=ecologyAt(x,z);
    const reach=5,physicalReach=reach*spacing;
    const curvature=(heights[row*size+Math.max(0,col-reach)]+heights[row*size+Math.min(size-1,col+reach)]+heights[Math.max(0,row-reach)*size+col]+heights[Math.min(size-1,row+reach)*size+col]-4*y)/(physicalReach*physicalReach);
    const cover=valleyGroundCover(x,z,slope,curvature);
    const broad = noise(x * .012 + 14, z * .012 - 8), veins = noise(x * .026 - 2, z * .026 + 9);
    const ruin = ruinFootprint(x, z), ash = region.ash * .65 + ruin * .35;
    const terrace=westernTerraceDelta(x,z),terraceFace=smooth(.35,1.8,terrace)*smooth(.20,.43,slope);
    const mineral = smooth(.17, .49, slope) * smooth(8, 27, y);
    const outcrop = Math.exp(-(((x - 148) / 18) ** 2 + ((z + 10) / 23) ** 2));
    const crest=smooth(24,58,y)*smooth(165,255,Math.max(Math.abs(x),Math.abs(z)))*smooth(.27,.65,veins);
    const talus=region.slate*smooth(9,25,y)*smooth(.43,.62,noise(x*.054+11,z*.039-2));
    const washedStone=cover.channel*smooth(.04,.20,slope)*(1-cover.fan*.6);
    const stone = Math.min(.98, mineral * (.76 + region.slate * .24) + region.slate * smooth(17, 30, y) * .36 + outcrop * .72 + crest*.83+talus*.62+eco.broken*.70+washedStone*.58+terraceFace*.46);
    const beach=bankWidth(x,z),waterline=-3+(beach+3)*.61;
    const bank = smooth(waterline-.7,waterline+1.2,d)*(1-smooth(beach+3,beach+8,d));
    const soil = Math.max(ruin * .91, region.meadow * .19, bank,cover.bare*.76,cover.channel*.91,cover.fan*.74,terraceFace*.78, smooth(0, 2, Math.abs(z - roadZ(x))) * (1 - smooth(3, 7, Math.abs(z - roadZ(x)))) * .65);
    c.copy(palette.grass).lerp(palette.dry,cover.dry*.56+smooth(.46,.78,broad)*.13).lerp(palette.meadow,region.meadow*.28);
    c.lerp(palette.soil,cover.bare*.64).lerp(palette.wet,cover.wet*.45).lerp(palette.moss,cover.hollow*cover.cover*.37);
    let forest=smooth(.49,.72,noise(x*.015+20,z*.015+12))*.64;
    for(const[cx,cz]of[[-102,38],[123,61],[95,137],[-145,-38]])forest=Math.max(forest,Math.exp(-(((x-cx)/26)**2+((z-cz)/26)**2))*.85);
    let clearingDistance=Math.hypot(x+30,z-40);for(const [cx,cz]of RESOURCE_CLEARINGS)clearingDistance=Math.min(clearingDistance,Math.hypot(x-cx,z-cz));
    forest*=smooth(7,20,d)*(1-region.meadow*.8)*smooth(16,37,clearingDistance);
    forest=Math.max(forest,eco.woods*.98);
    // Smaller clearings and tongues of woodland litter connect actual canopy
    // edges to the floor; their contour is not another broad painted circle.
    forest=smooth(.12,.86,forest+(cover.patch-.48)*.28);
    c.lerp(palette.litter,forest*(.59+cover.bare*.28)).lerp(palette.moss,forest*cover.cover*.28);
    c.lerp(palette.ash, ash * .82).lerp(palette.soil, soil * (1 - bank) * .78);
    c.lerp(palette.slate, stone).lerp(palette.wet, (1 - smooth(beach+4,beach+18,d)) * (1 - bank) * .55);
    const bankPatch=smooth(.27,.67,noise(x*.13+17,z*.075-8));
    c.lerp(palette.gravel, bank * (.37+bankPatch*.59)).lerp(palette.wet,bank*(1-bankPatch)*.36);
    c.lerp(palette.riverbed, 1 - smooth(waterline-1.4+(bankPatch-.5)*2.2,waterline+.6+(bankPatch-.5)*1.8,d));
    c.lerp(palette.litter,eco.woods*.55).lerp(palette.moss,eco.wet*.60).lerp(palette.wet,eco.wet*(1-smooth(beach,beach+8,d))*.66);
    const channelEdge=Math.max(0,cover.bank-cover.channel*.75);
    c.lerp(palette.sedge,channelEdge*.63).lerp(palette.drainage,cover.channel*(.58+washedStone*.22)).lerp(palette.silt,cover.fan*.65);
    // Geological striations are broad and follow the ridge, without vertex-sized
    // colour noise. The close detail comes from material-specific tiled textures.
    c.multiplyScalar(.84+cover.patch*.18+cover.fine*.08+veins*.045);
    const hex = c.getHex(), offset = i * 4;
    colourData[offset] = hex >> 16; colourData[offset + 1] = (hex >> 8) & 255; colourData[offset + 2] = hex & 255; colourData[offset + 3] = 255;
    const rockWeight = Math.min(1, stone + bank * .4), soilWeight = Math.min(1 - rockWeight, Math.max(soil, ash * .8,forest*.9,eco.wet*.94,cover.hollow*.47));
    weightData[offset] = Math.round((1 - rockWeight - soilWeight) * 255); weightData[offset + 1] = Math.round(rockWeight * 255); relief[i]=cover.relief;
  }
  // Store the static relief gradient once. Blue/alpha no longer require four
  // neighbouring texture fetches for every ground fragment in every frame.
  for(let row=0;row<size;row++)for(let col=0;col<size;col++){
    const i=row*size+col,dx=relief[row*size+Math.min(size-1,col+1)]-relief[row*size+Math.max(0,col-1)],dz=relief[Math.min(size-1,row+1)*size+col]-relief[Math.max(0,row-1)*size+col];
    weightData[i*4+2]=Math.round((dx*.5+.5)*255);weightData[i*4+3]=Math.round((dz*.5+.5)*255);
  }
  return { colour: groundTexture(colourData, size, true), weights: groundTexture(weightData, size) };
}

function random(seed) { let n = seed >>> 0; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; }
function isClearing(x, z, margin = 0) {
  return Math.hypot(x + 30, z - 40) < 24 + margin ||
    RESOURCE_CLEARINGS.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 19 + margin);
}

class Instances {
  constructor(group, geometry, material, castShadow = true, wind = null) { this.group = group; this.geometry = geometry; this.material = material; this.castShadow = castShadow; this.wind = wind; this.items = []; }
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
    const mesh = new T.InstancedMesh(this.geometry, this.wind?this.material:metricInstanceMaterial(this.material), this.items.length);
    const colour = new T.Color(); mesh.name = name;
    this.items.forEach((item, i) => {
      TEMP.position.set(item.x, item.y, item.z); TEMP.scale.set(item.sx, item.sy, item.sz);
      if (item.rotation) TEMP.quaternion.copy(item.rotation); else TEMP.rotation.set(0, item.yaw, 0);
      TEMP.updateMatrix(); mesh.setMatrixAt(i, TEMP.matrix); mesh.setColorAt(i, colour.setHex(item.colour));
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = this.castShadow; mesh.receiveShadow = true;
    mesh.computeBoundingSphere(); if (this.wind) animateVegetation(mesh, this.items, this.wind);
    // Keep stable original indices for saved destruction; partition only the
    // render storage so off-screen vegetation and its shadow work can be culled.
    this.group.add(this.wind && this.items.length >= 256 ? partitionStaticInstances(mesh,this.items) : mesh);
    this.mesh = mesh; return mesh;
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
    const lobes = 1 + .065 * Math.sin(x * 6 + z * 3) * Math.sin(y * 5 - z * 4) + .025 * Math.cos(z * 11 + x * 7);
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
function treeBatches(group,distant=false) {
  const foliage = createVegetationMaterial('broadleaf'), needles=createVegetationMaterial('pine');
  return {
    distant,
    wood: new Instances(group, new T.CylinderGeometry(.75, 1, 1, 6, 1, true), getMaterial('bark', 0xffffff), true, 'wood'),
    leaves: new Instances(group, branchSprayGeometry(false,distant), foliage, !distant, 'foliage'),
    needles: new Instances(group, branchSprayGeometry(true,distant), needles, !distant, 'foliage'),
    finish() { const prefix=distant?'Distant ':'';return [this.wood.finish(prefix+'Tree trunks and branches'), this.leaves.finish(prefix+'Broadleaf canopies'), this.needles.finish(prefix+'Pine boughs')].filter(Boolean); }
  };
}
function shapeTreeCrown(batch, starts, x, y, z, h, pine) {
  // Shape the existing pieces after all random draws. Thus saved tree anchors and
  // every later scenery ID retain their original deterministic generation order.
  const seed = Math.abs(Math.sin(x * 17.71 + z * 43.13) * 941.73) % 1;
  const profile = Math.floor(seed * 3), angle = seed * TAU;
  const width = pine ? [1.16, .73, 1.01][profile] : [1.32, .66, 1.40][profile];
  const depth = pine ? [.91, .85, 1.08][profile] : [1.05, .78, .86][profile];
  const height = pine ? [.91, 1.24, 1.08][profile] : [.92, 1.30, .86][profile];
  const lean = profile === 2 ? .17 : .035, ca = Math.cos(angle), sa = Math.sin(angle);
  const transform = point => {
    const dx = point.x - x, dz = point.z - z, dy = point.y - y;
    const u = (dx * ca + dz * sa) * width + dy * lean, v = (-dx * sa + dz * ca) * depth;
    return new T.Vector3(x + u * ca - v * sa, y + dy * height, z + u * sa + v * ca);
  };
  for (let i = starts[0]; i < batch.wood.items.length; i++) {
    const item = batch.wood.items[i], centre = new T.Vector3(item.x, item.y, item.z);
    const direction = UP.clone().applyQuaternion(item.rotation || new T.Quaternion()).multiplyScalar(item.sy * .5);
    const a = transform(centre.clone().sub(direction)), b = transform(centre.clone().add(direction)), delta = b.clone().sub(a);
    const p = a.add(b).multiplyScalar(.5); item.x = p.x; item.y = p.y; item.z = p.z;
    item.sy = delta.length(); item.rotation = new T.Quaternion().setFromUnitVectors(UP, delta.normalize());
    item.sx *= Math.sqrt(width * depth); item.sz *= Math.sqrt(width * depth);
  }
  const crowns = pine ? batch.needles : batch.leaves, first = pine ? starts[2] : starts[1];
  for (let i = first; i < crowns.items.length; i++) {
    const item = crowns.items[i], j = i - first, p = transform(new T.Vector3(item.x, item.y, item.z));
    item.x = p.x; item.y = p.y; item.z = p.z; item.sx *= width; item.sz *= depth;
    item.sy *= height * (pine ? .80 + (j % 3) * .14 : profile === 1 ? 1.14 : .73);
    if (pine && j < 12) {
      // Uneven sprays give an open, branching outline rather than repeated tiers.
      const spread = .83 + .29 * Math.sin(j * 2.37 + angle);
      item.x = x + (item.x - x) * spread; item.z = z + (item.z - z) * spread;
      item.y += Math.sin(j * 1.79 + angle) * h * .026;
    }
    item.yaw += angle;
  }
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
  // Consume the established generation sequence above before rebuilding a tree.
  // Every following prop's random draws and permanent save anchor stay identical.
  batch.wood.items.length=starts[0]; batch.leaves.items.length=starts[1]; batch.needles.items.length=starts[2];
  botanicalTree(batch,x,y,z,h,scale,pine);
  for (const [index, part] of [batch.wood, batch.leaves, batch.needles].entries()) for (let i = starts[index]; i < part.items.length; i++) part.items[i].windRoot = [x, y, z, h];
  return [batch.wood, batch.leaves, batch.needles].map((part, i) => ({ batch: part, first: starts[i], count: part.items.length - starts[i] })).filter(part => part.count);
}

function createGround() {
  const geometry = new T.PlaneGeometry(1200, 1200, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS); geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const columns=TERRAIN_SEGMENTS+1,x=terrainGridCoordinate(i%columns),z=terrainGridCoordinate(Math.floor(i/columns));
    pos.setXYZ(i, x, renderedTerrainHeight(x, z), z);
    uv.setXY(i, (x + 600) / 1200, (600 - z) / 1200);
  }
  // Area-weighted normals follow the exact visible triangles. Reuse the cached
  // grid for the colour field instead of re-evaluating geology a million times.
  geometry.computeVertexNormals();
  const surface = groundAlbedo(), grass = groundDetail('grass'), soil = groundDetail('soil'), slate = groundDetail('slate');
  const neutralNormal=groundTexture(new Uint8Array([128,128,255,255]),1),neutralRoughness=groundTexture(new Uint8Array([248,248,248,255]),1);
  const surfaceUniforms={
    uGroundWeights:{value:surface.weights},
    uSurfaceGrass:{value:grass},uSurfaceSlate:{value:slate},uSurfaceSoil:{value:soil},uSurfaceFlags:{value:new T.Vector3()},uSurfaceScale:{value:new T.Vector3(8,8,8)},
    uNormalGrass:{value:neutralNormal},uNormalSlate:{value:neutralNormal},uNormalSoil:{value:neutralNormal},
    uRoughGrass:{value:neutralRoughness},uRoughSlate:{value:neutralRoughness},uRoughSoil:{value:neutralRoughness}
  };
  const material = new T.MeshStandardMaterial({ color: 0xffffff, map: surface.colour, roughness: .98 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms,surfaceUniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vGroundXZ;varying vec3 vGroundPosition;varying vec3 vGroundNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundXZ = position.xz;vGroundPosition=position;vGroundNormal=normal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vGroundXZ;
      varying vec3 vGroundPosition,vGroundNormal;
      uniform sampler2D uGroundWeights;
      uniform sampler2D uSurfaceGrass,uSurfaceSlate,uSurfaceSoil;
      uniform sampler2D uNormalGrass,uNormalSlate,uNormalSoil;
      uniform sampler2D uRoughGrass,uRoughSlate,uRoughSoil;
      uniform vec3 uSurfaceFlags,uSurfaceScale;
    `).replace('#include <map_fragment>', `#include <map_fragment>
      vec2 groundUV = vec2(vGroundXZ.x + 600.0, 600.0 - vGroundXZ.y) / 1200.0;
      vec4 terrainField = texture2D(uGroundWeights, groundUV);
      vec3 weights = vec3(terrainField.rg,max(0.0,1.0-terrainField.r-terrainField.g));
      weights/=max(.001,dot(weights,vec3(1.0)));
      vec3 surfaceWeights=weights*uSurfaceFlags;
      float escarpment=smoothstep(.20,.63,1.0-abs(normalize(vGroundNormal).y));
      // World-space projection must keep a fixed scale across changing slopes.
      // Varying the UV divisor by the normal produces contour-like distortion.
      float mineralScale=uSurfaceScale.y;
      vec2 uvGrass=vGroundXZ/uSurfaceScale.x,uvSlate=vGroundXZ/mineralScale,uvSoil=vGroundXZ/uSurfaceScale.z;
      // Project exposed rock on all three axes. The real cliff faces keep their
      // mineral grain instead of stretching a top-down photograph vertically.
      vec3 rockFaces=pow(abs(normalize(vGroundNormal)),vec3(4.0));rockFaces/=max(.001,rockFaces.x+rockFaces.y+rockFaces.z);
      vec2 uvRockX=vGroundPosition.zy/mineralScale,uvRockZ=vGroundPosition.xy/mineralScale;
      vec3 rockAlbedo=texture2D(uSurfaceSlate,uvRockX).rgb*rockFaces.x+texture2D(uSurfaceSlate,uvSlate).rgb*rockFaces.y+texture2D(uSurfaceSlate,uvRockZ).rgb*rockFaces.z;
      // Metre-scale beds and joints read at the City camera. They follow a common
      // tilted bedding plane, with erosion breaks instead of random colour dots.
      float erosionPhase=(texture2D(uSurfaceSoil,vGroundXZ*.005).r-.4)*7.0;
      float bedding=(vGroundPosition.y+vGroundPosition.x*.17+vGroundPosition.z*.07+erosionPhase)/11.0;
      float bedEdge=min(fract(bedding),1.0-fract(bedding));
      float joint=1.0-smoothstep(.008,.040,bedEdge);
      float bedColour=texture2D(uSurfaceSoil,vec2(floor(bedding)*.079+.3,.27)).r;
      vec3 strataTint=mix(vec3(.74,.80,.86),vec3(.98,.93,.82),smoothstep(.16,.42,bedColour));
      rockAlbedo*=mix(vec3(.92,.95,.98),strataTint*(1.0-joint*.26),escarpment);
      vec3 grassFirst=texture2D(uSurfaceGrass,uvGrass).rgb;
      vec3 soilFirst=texture2D(uSurfaceSoil,uvSoil).rgb;
      vec3 realAlbedo=grassFirst*surfaceWeights.x+rockAlbedo*surfaceWeights.y+soilFirst*surfaceWeights.z;
      float realBlend=dot(surfaceWeights,vec3(1.0));
      // Two incommensurate local samples break photographic tiling while the
      // metre-scale field retains coherent meadows, litter and wet banks.
      vec3 grassSecond=texture2D(uSurfaceGrass,(vGroundXZ.yx+vec2(13.7,27.1))/(uSurfaceScale.x*1.71)).rgb;
      vec3 grassGrain=mix(grassFirst,grassSecond,.22);
      float grassLuma=dot(grassGrain,vec3(.2126,.7152,.0722));
      float grassReflectance=clamp(.24+grassLuma*4.3,.38,1.62);
      vec3 grassChroma=clamp(grassGrain/max(.018,grassLuma),vec3(.58),vec3(1.48));
      // The scan supplies physical grain; it must not replace green meadow and
      // forest-litter colours with a uniform photograph of dry yellow pasture.
      realAlbedo+=surfaceWeights.x*(diffuseColor.rgb*grassReflectance*mix(vec3(1.0),grassChroma,.68)-grassFirst);
      diffuseColor.rgb=mix(diffuseColor.rgb,realAlbedo*.83+diffuseColor.rgb*.17,realBlend*mix(.81,.88,weights.x));
    `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float rockRoughness=texture2D(uRoughSlate,uvRockX).r*rockFaces.x+texture2D(uRoughSlate,uvSlate).r*rockFaces.y+texture2D(uRoughSlate,uvRockZ).r*rockFaces.z;
      float surfaceRoughness=texture2D(uRoughGrass,uvGrass).r*weights.x+rockRoughness*weights.y+texture2D(uRoughSoil,uvSoil).r*weights.z;
      roughnessFactor=clamp(mix(roughnessFactor,surfaceRoughness,realBlend*.68)+escarpment*joint*.06,.68,1.0);
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec2 surfaceNormal=(texture2D(uNormalGrass,uvGrass).xy-.5)*surfaceWeights.x+(texture2D(uNormalSoil,uvSoil).xy-.5)*surfaceWeights.z;
      vec2 rockNx=texture2D(uNormalSlate,uvRockX).xy-.5,rockNy=texture2D(uNormalSlate,uvSlate).xy-.5,rockNz=texture2D(uNormalSlate,uvRockZ).xy-.5;
      vec3 rockNormal=vec3(0.0,rockNx.y,rockNx.x)*rockFaces.x+vec3(rockNy.x,0.0,rockNy.y)*rockFaces.y+vec3(rockNz.x,rockNz.y,0.0)*rockFaces.z;
      normal=normalize(normal-mat3(viewMatrix)*(vec3(surfaceNormal.x,0.0,surfaceNormal.y)*1.08+rockNormal*surfaceWeights.y*mix(.85,1.35,escarpment)));
      // Rooted tussock/deposition relief remains legible between individual
      // grass blades and whole hills. It changes shading, never carrier footing.
      float mesoX=terrainField.b*2.0-1.0;
      float mesoZ=terrainField.a*2.0-1.0;
      normal=normalize(normal-mat3(viewMatrix)*vec3(mesoX,0.0,-mesoZ)*(.50-escarpment*.29));
    `);
  };
  material.customProgramCacheKey = () => 'alpha-mineral-ground-v7';
  const ground = new T.Mesh(geometry, material); ground.name = 'Continuous sculpted terrain'; ground.receiveShadow = true; ground.userData.ground = true; ground.userData.noBatch = true;
  ground.userData.surfaceTextures = [surface.weights, grass, soil, slate,neutralNormal,neutralRoughness];
  ground.userData.setGroundTextures = textures => {
    for(const[kind,key,axis]of[['grass','Grass','x'],['slate','Slate','y'],['soil','Soil','z']]) {
      const entry=textures?.[kind]; if(!entry?.map)continue;
      surfaceUniforms['uSurface'+key].value=entry.map;surfaceUniforms['uNormal'+key].value=entry.normalMap||neutralNormal;surfaceUniforms['uRough'+key].value=entry.roughnessMap||neutralRoughness;
      surfaceUniforms.uSurfaceFlags.value[axis]=1;surfaceUniforms.uSurfaceScale.value[axis]=kind==='slate'?22:Math.max(.5,entry.scale||8);
    }
  };
  return ground;
}
function createWater() {
  const positions = [], uvs = [], indices = [], colours = [], riverFields=[], length = 1180, segments = 320, across = 6;
  for (let i = 0; i <= segments; i++) {
    const z = -length / 2 + i / segments * length, centre = riverX(z), width = riverWidth(z) + 9;
    for (let j = 0; j <= across; j++) {
      const x=centre+(j/across*2-1)*width,acrossRiver=x-centre,beach=bankWidth(x,z);
      positions.push(x, -.57, z); uvs.push(j / across, i / segments * 75);
      riverFields.push(acrossRiver,riverWidth(z)-3+(beach+3)*.61,.198*Math.cos(z*.009)+.14*Math.cos(z*.020),Math.max(-1,Math.min(1,(-.001782*Math.sin(z*.009)-.0028*Math.sin(z*.020))/.0038)));
      const edge = Math.abs(j / across * 2 - 1), colour = new T.Color(0x174b4b).lerp(new T.Color(0x6f9184), edge ** 2.4);
      colour.multiplyScalar(.92 + .08 * Math.sin(z * .026 + .7)); colours.push(colour.r, colour.g, colour.b);
      if (i < segments && j < across) { const a = i * (across + 1) + j, b = a + across + 1; indices.push(a, b, a + 1, b, b + 1, a + 1); }
    }
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.setAttribute('riverField',new T.Float32BufferAttribute(riverFields,4));
  const material = new T.MeshPhysicalMaterial({ color: 0xffffff, vertexColors:true, roughness: .24, metalness: 0, clearcoat: .32, clearcoatRoughness: .20, side: T.DoubleSide });
  const time = { value: 0 }, rippleTexture = groundDetail('soil');
  material.onBeforeCompile = shader => {
    shader.uniforms.uRiverTime = time;
    shader.uniforms.uRiverRippleTexture = { value: rippleTexture };
    const common = '\nuniform float uRiverTime;\nvarying vec3 vRiverPosition,vRiverWind;\nvarying vec4 vRiverField;\n';
    // Channel geometry and gusts change over metres; interpolate them from the
    // existing river strip instead of re-running trigonometry for every pixel.
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>' + common + WIND_GLSL+'\nattribute vec4 riverField;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 currentWind = worldWind(uRiverTime, position.xz);
        vRiverWind=currentWind;vRiverField=riverField;
        transformed.y += sin(position.z * .24 - uRiverTime * .72) * (.023 + currentWind.z * .022) + cos(position.x * .44 + position.z * .13 - uRiverTime * .43) * .019;
        vRiverPosition = transformed;
      `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>' + common + '\nuniform sampler2D uRiverRippleTexture;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 riverWind = vRiverWind;
        // Stream coordinates follow the existing channel, instead of drawing
        // intersecting wave lines across its world-aligned surface.
        float alongRiver = vRiverPosition.z;
        float acrossRiver = vRiverField.x;
        float channelWidth = vRiverField.y;
        float channelSlope = vRiverField.z;
        vec2 streamTangent = normalize(vec2(channelSlope, 1.0));
        vec2 streamAcross = vec2(streamTangent.y, -streamTangent.x);
        float bankNoise = texture2D(uRiverRippleTexture, vec2(acrossRiver * .014, alongRiver * .007)).r - .53;
        float edgeDistance = abs(acrossRiver) / channelWidth;
        // The deeper channel follows the outside of each meander. Deposits sit
        // on its inside bends, breaking the former symmetrical colour ribbon.
        float bend = vRiverField.w;
        float crossChannel = acrossRiver / channelWidth;
        float deepAxis = crossChannel + bend * .36;
        float bedNoise = texture2D(uRiverRippleTexture, vec2(acrossRiver * .004 + .21, alongRiver * .0016 + .34)).r;
        float reachNoise = texture2D(uRiverRippleTexture, vec2(alongRiver * .0019 + .61, acrossRiver * .004 + .17)).r;
        float innerBank = sign(bend) * .61;
        float barShape = exp(-pow((crossChannel - innerBank) / .27, 2.0));
        float mineralBar = barShape * smoothstep(.12, .65, abs(bend)) * smoothstep(.42, .59, bedNoise);
        float pool = smoothstep(.43, .63, reachNoise) * (1.0 - smoothstep(.25, .90, abs(deepAxis)));
        float depth = clamp((1.0 - pow(abs(deepAxis), 1.65)) * (.50 + (bedNoise - .35) * 1.8) + pool * .28 - mineralBar * .78, 0.0, 1.0);
        float shallows = pow(1.0 - depth, 1.5);
        vec3 deepColour = mix(vec3(.008, .038, .035), vec3(.005, .021, .034), pool * .83);
        vec3 shallowColour = mix(vec3(.078, .128, .081), vec3(.158, .139, .080), mineralBar * .81);
        diffuseColor.rgb = mix(deepColour, shallowColour, shallows);
        diffuseColor.rgb *= .95 + (reachNoise - .53) * .20;
        float wetEdge = smoothstep(.72 + bankNoise * .32, 1.03, edgeDistance);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.031,.061,.037),wetEdge*(.38+bankNoise*.37));
        // Long broken current seams curl around the inside bank, with sparse
        // aeration at the gravel spits. Foam stays confined to physical shallows.
        vec2 foamUV=vec2(acrossRiver*.074+sin(alongRiver*.033-uRiverTime*.16)*.12,alongRiver*.028-uRiverTime*.018);
        float foamNoise=texture2D(uRiverRippleTexture,foamUV).r;
        float foamGrain=texture2D(uRiverRippleTexture,foamUV*vec2(4.9,2.3)+vec2(.31,.73)).r;
        float foam=smoothstep(.60,.70,foamNoise)*smoothstep(.44,.63,foamGrain)*smoothstep(.64,.83,edgeDistance)*(1.0-smoothstep(.92,1.01,edgeDistance));
        foam*=clamp(.10+smoothstep(.43,.61,reachNoise)*smoothstep(.08,.55,abs(bend))*1.3+mineralBar*.55,.10,1.0);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.40,.45,.40),foam*.48);
        float refractedLight=pow(max(0.0,sin(acrossRiver*1.7+sin(alongRiver*.62-uRiverTime*.31))*sin(alongRiver*.93-uRiverTime*.42)),8.0);
        diffuseColor.rgb+=vec3(.036,.044,.021)*refractedLight*mineralBar;
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        // Sheltered shallows have a broader reflection; gusts break the centre
        // reflection gently, without changing exposure or adding bright lines.
        roughnessFactor = clamp(roughnessFactor * mix(.78, 1.29, shallows) + mineralBar * .025 + (riverWind.z - .5) * .032, .18, .37);
      `)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // Constant downstream advection cannot accelerate as game time grows;
        // crosswind only adds a small, bounded lateral perturbation.
        float crosswind = dot(riverWind.xy, streamAcross);
        vec2 rippleUV = vec2(acrossRiver * .25, alongRiver * .085 - uRiverTime * .068);
        rippleUV.x -= crosswind * .025 + sin(uRiverTime * .21 + alongRiver * .007) * .012;
        float rippleStrength = (.11 + riverWind.z * .07) * (1.0 + shallows * .36);
        float crossSlope = (texture2D(uRiverRippleTexture, rippleUV).r - .53) * rippleStrength;
        float streamSlope = (texture2D(uRiverRippleTexture, rippleUV * vec2(.83, 1.17) + vec2(.37, .61)).r - .53) * rippleStrength * .7;
        vec2 broadUV = vec2(acrossRiver * .018, alongRiver * .009 - uRiverTime * .0072);
        broadUV.x -= crosswind * .003;
        float broadStrength = (.15 + riverWind.z * .06) * (1.0 - shallows * .65);
        float broadAcross = (texture2D(uRiverRippleTexture, broadUV).r - .53) * broadStrength;
        float broadAlong = (texture2D(uRiverRippleTexture, broadUV + vec2(.29, .47)).r - .53) * broadStrength * .65;
        vec2 surfaceSlope = streamAcross * (crossSlope + broadAcross) + streamTangent * (streamSlope + broadAlong);
        normal = normalize(mat3(viewMatrix) * vec3(-surfaceSlope.x, 1.0, -surfaceSlope.y));
      `)
      .replace('#include <clearcoat_normal_fragment_maps>', '#include <clearcoat_normal_fragment_maps>\n#ifdef USE_CLEARCOAT\nclearcoatNormal = normal;\n#endif');
  };
  material.customProgramCacheKey = () => 'alpha-channel-river-v6';
  const water = new T.Mesh(geometry, material); water.name = 'Flowing river'; water.receiveShadow = true; water.userData.noBatch = true;
  water.userData.surfaceTextures = [rippleTexture];
  return { water, time };
}

function createRoad(group) {
  const rand = random(5567), road = new Instances(group, new T.BoxGeometry(1, 1, 1), getMaterial('pavement', 0xffffff));
  const paint = new Instances(group, new T.BoxGeometry(1, 1, 1), getMaterial('stone', 0xffffff), false);
  const posts = new Instances(group, new T.CylinderGeometry(1, 1, 1, 6), getMaterial('wood', 0xffffff));
  for (let x = -450; x < 450; x += 6) {
    const z = roadZ(x), nextZ = roadZ(x + 6), yaw = -Math.atan2(nextZ - z, 6), y = sceneryHeight(x, z);
    if (Math.abs(shoreDistance(x, z)) < 7 || shoreDistance(x, z) < 0 || rand() < .05) continue;
    const normal = terrainNormal(x, z), slope = new T.Quaternion().setFromUnitVectors(UP, new T.Vector3(normal.x, normal.y, normal.z));
    slope.multiply(new T.Quaternion().setFromAxisAngle(UP, yaw));
    road.add(x, y + .05, z, 6.15, .12, 7.9, 0xa3a48f, yaw, slope);
    road.add(x, y + .14, z, 6.05, .10, 5.8, rand() > .13 ? 0x656e68 : 0x7a7f70, yaw, slope);
    if (rand() > .2) paint.add(x, y + .20, z, 2.5, .013, .1, 0xd9cba0, yaw, slope);
    if (rand() > .7) paint.add(x, sceneryHeight(x, z - 2.62) + .20, z - 2.62, 3.5, .012, .06, 0xcacbb0, yaw, slope);
  }
  for (let x = -245; x <= 250; x += 33) {
    const z = roadZ(x) + 6, y = sceneryHeight(x, z);
    if (shoreDistance(x, z) < 12) continue;
    posts.add(x, y + 4.2, z, .13, 8.4, .13, 0x625e4d);
    posts.link([x - 1.6, y + 7.9, z], [x + 1.6, y + 7.9, z], .07, 0x5d6257);
  }
  road.finish('Abandoned old-world highway'); paint.finish('Weathered road markings'); posts.finish('Old telegraph poles');
  createBridgeAbutments(group);
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

export function createWorldInteractions(group, records) {
  const debrisCapacity = 512, trackCapacity = 400, cells = new Map(), byId = new Map();
  const identity = new T.Quaternion();
  const hidden = new T.Matrix4().compose(new T.Vector3(0, -5000, 0), identity, new T.Vector3(.0001, .0001, .0001));
  const changed = new Set(), previousActors = new Map(), destroyed = new Map();
  const poolStates=new Map();let poolsDirty=false;
  let activeDamage = null, activeMode = null, trackCursor = 0, trackCount = 0, fallbackDamage = [];
  const stats = { destroyedCount: 0, trackCount: 0, lifeCount: 0, destructibleCount: records.length, lastDestroyed: null,poolDraw:{activeInstances:0,submittedInstances:0,visibleMeshes:0} };
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
    // Storage stays fixed for stable saved/recycled slots. Only the submitted
    // prefix changes; a fresh world sends no dormant pool geometry to the GPU.
    poolStates.set(mesh,{active:new Uint8Array(count),count:0,highest:-1});mesh.count=0;mesh.visible=false;
    mesh.instanceMatrix.needsUpdate = true; group.add(mesh); return mesh;
  }
  const stumps = dynamic(new T.CylinderGeometry(.8, 1, 1, 10), getMaterial('bark', 0x89704d), debrisCapacity, 'Crushed tree stumps');
  const cuts = dynamic(new T.CircleGeometry(1, 10).rotateX(-Math.PI / 2), getMaterial('wood', 0xc2ac7f), debrisCapacity, 'Broken trunk cores', false);
  const brokenLog=new T.CylinderGeometry(.65,1,1,9,3),lp=brokenLog.attributes.position;
  for(let i=0;i<lp.count;i++){
    const x=lp.getX(i),y=lp.getY(i),z=lp.getZ(i),edge=Math.abs(y)>.49;
    if(Math.hypot(x,z)>.1)lp.setXYZ(i,x*(1+.035*Math.sin(y*15+z*4)),y+(edge?.024*Math.sin(Math.atan2(z,x)*5.0):0),z*(1+.045*Math.cos(y*14+x*3)));
  }
  brokenLog.computeVertexNormals();
  const logs = dynamic(brokenLog, getMaterial('bark', 0xb5a58b), debrisCapacity * 3, 'Fallen trunks and branches');
  const fallenFoliage=createVegetationMaterial('broadleaf');fallenFoliage.color.setHex(0x70834a);
  const brush = dynamic(branchSprayGeometry(false,true), fallenFoliage, debrisCapacity * 3, 'Crushed fallen boughs');
  const rubble = dynamic(irregularOrb(0), getMaterial('rock', 0x96977e), debrisCapacity * 3, 'Fresh crushed rock fragments');
  const stampGeometry = new T.PlaneGeometry(1, 1, 2, 4); stampGeometry.rotateX(-Math.PI / 2);
  const stamps = [false, true].map(tank => dynamic(stampGeometry, new T.MeshBasicMaterial({ color: tank ? 0x35402c : 0x3e4230, alphaMap: trackTexture(tank), transparent: true, opacity: tank ? .43 : .38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), trackCapacity, tank ? 'Persistent crawler tread impressions' : 'Titan footprints', false));
  stamps.forEach(mesh => { mesh.renderOrder = 1; });
  const debrisMeshes = [stumps, cuts, logs, brush, rubble];
  function place(mesh, index, x, y, z, sx, sy, sz, quaternion = identity) {
    TEMP.position.set(x, y, z); TEMP.scale.set(sx, sy, sz); TEMP.quaternion.copy(quaternion); TEMP.updateMatrix(); mesh.setMatrixAt(index, TEMP.matrix); changed.add(mesh);
    const pool=poolStates.get(mesh);if(!pool.active[index]){pool.active[index]=1;pool.count++;}pool.highest=Math.max(pool.highest,index);poolsDirty=true;
  }
  function hideInstance(mesh,index){
    const pool=poolStates.get(mesh);if(!pool.active[index])return;
    pool.active[index]=0;pool.count--;mesh.setMatrixAt(index,hidden);changed.add(mesh);
    if(index===pool.highest)while(pool.highest>=0&&!pool.active[pool.highest])pool.highest--;
    poolsDirty=true;
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
    for (const mesh of [stumps, cuts])hideInstance(mesh,slot);
    for (const mesh of [logs, brush, rubble]) for (let i = 0; i < 3; i++)hideInstance(mesh,slot*3+i);
  }
  function showDebris(record, slot, angle) {
    const size = record.size, normal = terrainNormal(record.x, record.z), slope = new T.Quaternion().setFromUnitVectors(UP, new T.Vector3(normal.x, normal.y, normal.z));
    const x = record.x, z = record.z, y = sceneryHeight(x, z);
    if (record.kind === 'tree') {
      place(stumps, slot, x, y + size * .34, z, size * .35, size * .68, size * .35, slope);
      place(cuts, slot, x, y + size * .69, z, size * .279, 1, size * .279, slope);
      const length = size * 5.8, dx = Math.sin(angle), dz = Math.cos(angle);
      for (let branch = 0; branch < 3; branch++) {
        const a = angle + (branch - 1) * .37, start = branch ? length * .51 : .5;
        const sx = x + dx * start, sz = z + dz * start, endLength = branch ? length * .34 : length;
        const ex = sx + Math.sin(a) * endLength, ez = sz + Math.cos(a) * endLength;
        const sy = sceneryHeight(sx, sz) + .22 * size, ey = sceneryHeight(ex, ez) + .18 * size;
        const direction = new T.Vector3(ex - sx, ey - sy, ez - sz), rotation = new T.Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
        place(logs, slot * 3 + branch, (sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2, size * (branch ? .12 : .27), direction.length(), size * (branch ? .12 : .27), rotation);
        const boughTurn=slope.clone().multiply(new T.Quaternion().setFromAxisAngle(UP,a+branch*.73));
        place(brush, slot * 3 + branch, ex, sceneryHeight(ex, ez) + size * .37, ez, size * (branch?1.02:1.35), size * .47, size * .90, boughTurn);
      }
    } else {
      for (let part = 0; part < 3; part++) {
        const a = angle + part * 2.2, px = x + Math.sin(a) * size * .6, pz = z + Math.cos(a) * size * .6;
        place(rubble, slot * 3 + part, px, sceneryHeight(px, pz) + size * .16, pz, size * .55, size * .24, size * .41, slope);
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
    for (const mesh of stamps)for(let i=0;i<trackCapacity;i++)hideInstance(mesh,i);
    trackCursor = trackCount = 0; stats.trackCount = 0;
  }
  function stamp(tank, x, z, angle, scale) {
    if (protectedResource(x, z) || shoreDistance(x, z) < .8) return;
    const normal = terrainNormal(x, z), slope = new T.Quaternion().setFromUnitVectors(UP, new T.Vector3(normal.x, normal.y, normal.z));
    slope.multiply(new T.Quaternion().setFromAxisAngle(UP, angle));
    const index = trackCursor++ % trackCapacity;
    hideInstance(stamps[tank?0:1],index);
    place(stamps[tank ? 1 : 0], index, x, sceneryHeight(x, z) + .085, z, (tank ? 2.9 : 2.65) * scale, 1, (tank ? 4.2 : 4.3) * scale, slope);
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
  function flush() {
    if(poolsDirty){
      const draws=stats.poolDraw;draws.activeInstances=draws.submittedInstances=draws.visibleMeshes=0;
      for(const[mesh,pool]of poolStates){mesh.count=pool.highest+1;mesh.visible=pool.count>0;draws.activeInstances+=pool.count;draws.submittedInstances+=mesh.count;if(mesh.visible)draws.visibleMeshes++;}
      poolsDirty=false;
    }
    for (const mesh of changed) mesh.instanceMatrix.needsUpdate = true; changed.clear();
  }
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
        const footprint=actor.footprintScale??{x:1,z:1},drill=actor.variant==='drill';
        if (actor.moving && canCrush && delta > 0 && distance > .005 && distance < 70) {
          const radius = (drill?34:tank?16*Math.max(footprint.x,footprint.z):8) * scale, minX = Math.floor((Math.min(previous.x, actor.x) - radius) / 24), maxX = Math.floor((Math.max(previous.x, actor.x) + radius) / 24);
          const minZ = Math.floor((Math.min(previous.z, actor.z) - radius) / 24), maxZ = Math.floor((Math.max(previous.z, actor.z) + radius) / 24), angle = actor.angle || 0;
          const sin = Math.sin(angle), cos = Math.cos(angle), dx = actor.x - previous.x, dz = actor.z - previous.z, length2 = dx * dx + dz * dz;
          for (let cx = minX; cx <= maxX; cx++) for (let cz = minZ; cz <= maxZ; cz++) for (const record of cells.get(`${cx},${cz}`) || []) {
            if (destroyed.has(record.id)) continue;
            const t = length2 ? T.MathUtils.clamp(((record.x - previous.x) * dx + (record.z - previous.z) * dz) / length2, 0, 1) : 1;
            const rx = record.x - previous.x - dx * t, rz = record.z - previous.z - dz * t;
            const lateral = rx * cos - rz * sin, forward = rx * sin + rz * cos;
            const underHull=Math.abs(lateral)<(tank?10.6*footprint.x:5.1)*scale+record.size*.3&&Math.abs(forward)<(tank?12.1*footprint.z:4.2)*scale+record.size*.3;
            const underDrill=drill&&forward>15*scale&&forward<33.8*scale&&Math.abs(lateral)<Math.max(.2,(33.8-forward/scale)/18.8*4.3)*scale+record.size*.3;
            if(underHull||underDrill)crush(record,angle+Math.sin(record.x)*.35,true);
          }
          const trailDistance = Math.hypot(actor.x - previous.stampX, actor.z - previous.stampZ), interval = (tank ? 2.7 : 5.3) * scale;
          const steps = Math.min(32, Math.floor(trailDistance / interval));
          if (steps) {
            const vx = (actor.x - previous.stampX) / trailDistance, vz = (actor.z - previous.stampZ) / trailDistance;
            for (let i = 1; i <= steps; i++) {
              const x = previous.stampX + vx * interval * i, z = previous.stampZ + vz * interval * i;
              if (tank) for (const side of [-1, 1]) stamp(true, x + cos * side * 8.6 * scale*footprint.x, z - sin * side * 8.6 * scale*footprint.x, angle, scale*footprint.x);
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

function composeRegions(trees, shrubs, grass) {
  for (const batch of [trees.leaves, trees.needles, shrubs]) for (const item of batch.items) {
    const region = regionAt(item.x,item.z), wet = 1-smooth(9,30,shoreDistance(item.x,item.z)), c = new T.Color(item.colour);
    c.lerp(new T.Color(0x405f4e),wet*.44); c.lerp(new T.Color(0x697765),region.slate*.42); c.lerp(new T.Color(0x777548),region.ash*.30);
    item.colour=c.getHex();
  }
  for(const item of grass.items){
    const region=regionAt(item.x,item.z),bank=shoreDistance(item.x,item.z)<9;
    if(!bank){
      const patch=smooth(.34,.66,noise(item.x*.037+17,item.z*.037-3));
      const sparse=(.12+patch*1.16)*(1-region.ash*.65)*(1-ruinFootprint(item.x,item.z)*.92);
      item.sx*=sparse;item.sy*=sparse;item.sz*=sparse;
    }
    if (!item.windMotion) {
      // The same broad density field places groves and shelters their undergrowth.
      // This metadata changes the response only, never the saved prop positions.
      const exposure = 1 - smooth(.43, .68, noise(item.x * .015 + 20, item.z * .015 + 12));
      item.windFlex = [Math.min(.36, item.sy * .22) * (.52 + exposure * .48), .015 + exposure * .013];
      item.windMotion = [.86 + exposure * .20, 2.5 + exposure * .5];
    }
    const c=new T.Color(item.colour);c.lerp(new T.Color(0x768768),region.slate*.6);c.lerp(new T.Color(0xaa9a69),region.meadow*.6);item.colour=c.getHex();
  }
}
function createSlateLandmark(group, records) {
  const positions=[],indices=[],colours=[],uvs=[];
  const outline=[[-.88,-.42],[-.36,-.72],[.67,-.48],[.87,.30],[.13,.64],[-.73,.43]];
  const beds=[[-.4,1,-.10],[-.31,.92,-.05],[-.24,.94,.01],[-.06,.72,.15],[.01,.77,.12],[.08,.65,.18],[.26,.53,.25],[.29,.56,.27],[.52,.25,.34]];
  for(let j=0;j<beds.length;j++)for(let k=0;k<6;k++){
    const [y,width,shear]=beds[j],[x,z]=outline[k],edge=.082*Math.sin(k*2.7+j*.53),fracture=1+.085*Math.sin(k*3.1+j*1.67);
    positions.push(x*width*fracture+shear,y+edge,z*(.45+width*.55)*fracture+x*.11);
    const shade=.87+.10*Math.sin(k*1.3+j*.71);colours.push(shade,shade,shade);uvs.push(x*2+shear,y*3+z);
    if(j<beds.length-1){const a=j*6+k,b=j*6+(k+1)%6,c=b+6,d=a+6;indices.push(a,d,b,b,d,c);}
  }
  for(let k=1;k<5;k++)indices.push(0,k,k+1,48,48+k+1,48+k);
  const indexed=new T.BufferGeometry();indexed.setAttribute('position',new T.Float32BufferAttribute(positions,3));indexed.setAttribute('color',new T.Float32BufferAttribute(colours,3));indexed.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));indexed.setIndex(indices);
  const geometry=indexed.toNonIndexed();geometry.computeVertexNormals();indexed.dispose();
  const stone=new Instances(group,geometry,getMaterial('rock',0xffffff,{roughness:1,vertexColors:true}));
  // Buried, overlapping bases and inclined fracture beds join the same three
  // persistent anchors into one outcrop. Crushing still removes each whole slab.
  for(const [i,x,z,w,h,d,yaw]of [[0,143,-15,5.5,7.5,9,.22],[1,148,-10,5,12,8,.15],[2,153,-6,4.5,9.1,7,.10]]){
    const height=h*.72,first=stone.add(x,sceneryHeight(x,z)+height*.36,z,w,height,d,[0x87938e,0xa3aca1,0x82918a][i],yaw);
    records.push({id:`landmark:slate:${i}`,kind:'rock',x,z,size:w,parts:[{batch:stone,first,count:1}]});
  }
  stone.finish('The Three Sisters slate outcrop');
}

function composeEcotones(group,records,shrubs,ferns,grass,looseGrassCount) {
  const shelves=new Instances(group,fracturedRockGeometry(),getMaterial('rock',0xffffff));
  const candidates=records.filter(record=>{
    if(Math.max(Math.abs(record.x),Math.abs(record.z))>185)return false;
    const e=ecologyAt(record.x,record.z);
    return Math.max(e.woods,e.wet,e.broken)>.10;
  }).sort((a,b)=>Math.hypot(a.x+30,a.z-40)-Math.hypot(b.x+30,b.z-40));
  let bushes=0,fernCount=0,ledges=0,relocated=0;
  const safe=(x,z)=>!protectedResource(x,z,2)&&ecologyAt(x,z).open>.28&&scenerySelectionNormal(x,z).y>.88&&selectionSceneryHeight(x,z)>-.45;
  for(let i=looseGrassCount;i<grass.items.length;i++){
    const item=grass.items[i];if(item.windMotion?.[0]!==.44)continue;
    const e=ecologyAt(item.x,item.z),rand=random(i*881+7251),side=Math.sign(item.x-riverX(item.z));
    const z=item.z+(rand()-.5)*6.5,beach=bankWidth(item.x,z),waterline=-3+(beach+3)*.61;
    const x=riverX(z)+side*(riverWidth(z)+waterline+1.2+rand()*4.0);
    if(protectedResource(x,z,2))continue;
    const y=sceneryHeight(x,z);if(selectionSceneryHeight(x,z)<-.53)continue;
    const patch=smooth(.33,.63,noise(x*.058+13,z*.083));
    const scale=.42+patch*(.76+e.wet*.92);
    Object.assign(item,{x,y,z,sx:.8*scale,sy:1.65*scale,sz:.8*scale,windRoot:[x,y,z,1.65*scale],colour:e.wet>.15?0x75904c:0x949763});
  }
  for(const record of candidates){
    const e=ecologyAt(record.x,record.z),rand=random(Math.abs(record.x*73511+record.z*29663)*100);
    const first=shrubs.items.length,fernFirst=ferns.items.length;
    const wet=e.wet>Math.max(e.woods,e.broken),power=Math.max(e.woods,e.wet,e.broken);
    // A few substantial, overlapping masses form a ragged skirt around trees
    // and rock toes. Their low outer branches meet fern/grass, then open route.
    for(let j=0;j<3&&bushes<120;j++){
      const angle=rand()*TAU,radius=(1.6+rand()*2.4)*record.size;
      const x=record.x+Math.cos(angle)*radius,z=record.z+Math.sin(angle)*radius;
      if(!safe(x,z))continue;
      const s=1.35+rand()*.68+power*.38,y=sceneryHeight(x,z),height=s*(wet?.52:.66);
      const index=shrubs.add(x,y+height*.72,z,s,height,s*.83,wet?0x537f56:record.kind==='rock'?0x7d8050:0x3c632e,angle);
      shrubs.items[index].windRoot=[x,y,z,height*2.2];bushes++;
    }
    for(let j=0;j<2&&fernCount<96;j++){
      const angle=rand()*TAU,radius=(2.3+rand()*2.8)*record.size;
      const x=record.x+Math.cos(angle)*radius,z=record.z+Math.sin(angle)*radius;
      if(!safe(x,z))continue;
      const s=1.5+rand()*.7;ferns.add(x,sceneryHeight(x,z)+.035,z,s,s*.80,s,wet?0x5e834d:0x64813b,angle);fernCount++;
    }
    if(shrubs.items.length>first)record.parts.push({batch:shrubs,first,count:shrubs.items.length-first});
    if(ferns.items.length>fernFirst)record.parts.push({batch:ferns,first:fernFirst,count:ferns.items.length-fernFirst});
    if(wet&&record.kind==='rock'&&ledges<28){
      const first=shelves.items.length,side=Math.sign(record.x-riverX(record.z));
      for(let j=0;j<3&&ledges<28;j++){
        const x=record.x+side*(1.7+j*.68),z=record.z+(j-1)*1.53+(rand()-.5)*1.4;
        if(!safe(x,z))continue;
        const y=sceneryHeight(x,z),sx=1.8+rand()*1.5,sz=2.5+rand()*1.8,sy=.65+rand()*.8;
        shelves.add(x,y-sy*.25,z,sx,sy,sz,[0x6c8290,0x7b9396,0x93a5a4][j],side*.25+(rand()-.5)*1.6);ledges++;
      }
      if(shelves.items.length>first)record.parts.push({batch:shelves,first,count:shelves.items.length-first});
    }
  }
  // Reuse the old loose grass inventory: move a minority into the ecological
  // patches, rather than adding an expensive carpet over the whole map.
  for(let i=0;i<looseGrassCount;i++){
    if(i%3!==0||!candidates.length)continue;
    const record=candidates[(i*73)%candidates.length],rand=random(12771+i*173);
    for(let attempt=0;attempt<8;attempt++){
      const angle=rand()*TAU,radius=(1.0+rand()*5.2)*Math.min(1.45,record.size);
      const x=record.x+Math.cos(angle)*radius,z=record.z+Math.sin(angle)*radius,e=ecologyAt(x,z);
      if(!safe(x,z)||Math.max(e.woods,e.wet,e.broken)<.09)continue;
      const h=(e.wet>.15?1.65:1.08)+rand()*.78,y=sceneryHeight(x,z),item=grass.items[i];
      Object.assign(item,{x,y:y+.025,z,sx:1.8+rand()*1.4,sy:h,sz:1.8+rand()*1.4,yaw:angle,
        colour:e.wet>.15?0x82964f:e.broken>.2?0x9e995e:0x708b43,
        windRoot:[x,y,z,h],windFlex:[e.wet>.15?.39:.26,.016],windMotion:[e.wet>.15?.48:.82,2.1]});
      record.parts.push({batch:grass,first:i,count:1});relocated++;break;
    }
  }
  const mesh=shelves.finish('Exposed wet-bank bedding shelves');
  return {bushes,ferns:fernCount,ledges,relocatedGrass:relocated,patchAnchors:candidates.length,mesh};
}

function composeGroundTransitions(grass,records,looseGrassCount){
  const attached=new Uint8Array(grass.items.length);for(const r of records)for(const ref of r.parts)if(ref.batch===grass)attached.fill(1,ref.first,ref.first+ref.count);
  const tint=new T.Color(),dry=new T.Color(0x989262),green=new T.Color(0x77824f),wet=new T.Color(0x596e43);
  const sample=(x,z,selection=false)=>{
    const height=selection?selectionSceneryHeight:sceneryHeight,n=(selection?scenerySelectionNormal:terrainNormal)(x,z),y=height(x,z),reach=5;
    const curvature=(height(x-reach,z)+height(x+reach,z)+height(x,z-reach)+height(x,z+reach)-4*y)/(reach*reach);
    return valleyGroundCover(x,z,Math.hypot(n.x,n.z)/n.y,curvature,selection);
  };
  let relocated=0,shaped=0;
  for(let i=0;i<grass.items.length;i++){
    const item=grass.items[i];if(Math.max(Math.abs(item.x),Math.abs(item.z))>185||shoreDistance(item.x,item.z)<bankWidth(item.x,item.z)+2)continue;
    let cover=sample(item.x,item.z);
    if(i<looseGrassCount&&!attached[i]&&!protectedResource(item.x,item.z)){
      const selected=sample(item.x,item.z,true);
      let best=selected.cover+selected.wet*.45-selected.bank*.10-selected.channel*.60-selected.bare*.65,bx=item.x,bz=item.z;
      // Move existing free tufts only a few metres toward natural drainage and
      // scrub margins. Destructible tree/rock undergrowth keeps its saved anchor.
      for(const[dx,dz]of[[3.4,0],[-3.4,0],[0,3.4],[0,-3.4],[2.4,2.4],[-2.4,-2.4]]){
        const x=item.x+dx,z=item.z+dz;
        if(protectedResource(x,z)||shoreDistance(x,z)<bankWidth(x,z)+3||Math.abs(z-roadZ(x))<5)continue;
        const c=sample(x,z,true),score=c.cover+c.wet*.45-c.bank*.10-c.channel*.60-c.bare*.65;
        if(score>best+.035){best=score;bx=x;bz=z;}
      }
      if(bx!==item.x||bz!==item.z){item.x=bx;item.z=bz;item.y=sceneryHeight(bx,bz)+.025;relocated++;}
      cover=sample(item.x,item.z);
    }
    const gain=(.58+cover.cover*.57+cover.wet*.19)*(1-cover.channel*.55);item.sx*=gain;item.sy*=gain;item.sz*=gain;
    item.windRoot=[item.x,item.y,item.z,Math.max(.3,item.sy)];
    tint.copy(green).lerp(dry,cover.dry*.74+cover.bare*.33).lerp(wet,cover.wet*.63);item.colour=tint.getHex();shaped++;
  }
  return{relocated,shaped,addedInstances:0};
}

// A separate immutable detail layer leaves every saved scenery address intact.
// Low grass fills meadow patches between the existing taller tufts and scrub.
// It uses the same 12-triangle cutout and bounded root wind, with no shadows.
function createMeadowDetail(group){
  const detail=new Instances(group,grassTuftGeometry(),createVegetationMaterial('grass'),false,'grass'),rand=random(812671),tint=new T.Color();
  const green=new T.Color(0x72854b),dry=new T.Color(0x96925a),shade=new T.Color(0x52663d);
  for(let z=-170;z<=170;z+=2.35)for(let x=-170;x<=170;x+=2.35){
    const px=x+(rand()-.5)*2.1,pz=z+(rand()-.5)*2.1;
    if(protectedResource(px,pz,1)||shoreDistance(px,pz)<bankWidth(px,pz)+2||Math.abs(pz-roadZ(px))<5||Math.hypot(px+30,pz-40)<13)continue;
    const y=renderedTerrainHeight(px,pz),dx=(renderedTerrainHeight(px+1,pz)-renderedTerrainHeight(px-1,pz))*.5,dz=(renderedTerrainHeight(px,pz+1)-renderedTerrainHeight(px,pz-1))*.5;
    const slope=Math.hypot(dx,dz),patch=noise(px*.071+15,pz*.082-7);
    if(slope>.43||patch<.34||rand()>.80)continue;
    const wet=1-smooth(15,42,shoreDistance(px,pz)),density=smooth(.34,.68,patch),h=.30+rand()*.34+density*.18;
    tint.copy(green).lerp(dry,smooth(.52,.80,noise(px*.018,pz*.021))*.7).lerp(shade,wet*.52);
    const i=detail.add(px,y+.018,pz,1.6+density*.55,h,1.6+density*.55,tint.getHex(),rand()*TAU);
    detail.items[i].windRoot=[px,y,pz,h];detail.items[i].windFlex=[h*.17,.010];detail.items[i].windMotion=[.76,2.2];
  }
  return detail.finish('Low meadow grass');
}

export function createLandscape() {
  const group = new T.Group(); group.name = 'The reclaimed lowlands';
  const ground = createGround(); group.add(ground);
  const { water, time: waterTime } = createWater(); group.add(water);
  createRoad(group);
  const rand = random(196733), trees = treeBatches(group), distantTrees=treeBatches(group,true), records = [];
  const register = (id, kind, x, z, size, parts) => { if (!protectedResource(x, z)) records.push({ id, kind, x, z, size, parts }); };
  const rocks = new Instances(group, fracturedRockGeometry(), getMaterial('rock', 0xffffff));
  const shrubMat=getMaterial('foliage',0xffffff,{side:T.DoubleSide,vertexColors:true,roughness:.94});
  const shrubs = new Instances(group, branchSprayGeometry(), createVegetationMaterial('broadleaf'), true, 'foliage');
  const ferns = new Instances(group, fernGeometry(), shrubMat, false, 'grass');
  const grassMat = createVegetationMaterial('grass');
  const grass = new Instances(group, grassTuftGeometry(), grassMat, false, 'grass');
  const flowers = new Instances(group, new T.IcosahedronGeometry(1, 0), getMaterial('foliage', 0xffffff), false, 'grass');
  // Clusters follow valleys and meadows rather than a uniform scatter.
  for (let i = 0; i < 1200; i++) {
    const x = (rand() - .5) * 900, z = (rand() - .5) * 900;
    if (isClearing(x, z, 5) || shoreDistance(x, z) < 7 || Math.abs(z - roadZ(x)) < 11) continue;
    const density = noise(x * .015 + 20, z * .015 + 12);
    if (density < .43 || (Math.abs(x) < 165 && Math.abs(z) < 165 && rand() < .35)) continue;
    const scale = .8 + rand() * .9;
    const parts = addTree(Math.max(Math.abs(x),Math.abs(z))>190?distantTrees:trees, rand, x, sceneryHeight(x, z), z, scale, z < -130 || rand() < .32);
    register(`tree:${i}`, 'tree', x, z, scale, parts);
  }
  // Dense foothill groves alternate with broad, open travel corridors.
  const groves = [[-102, 38], [123, 61], [95, 137], [-145, -38]];
  groves.forEach(([cx, cz], cluster) => {
    for (let i = 0; i < 33; i++) {
      const a = rand() * TAU, r = Math.sqrt(rand()) * (23 + cluster * 2), x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      if (isClearing(x, z, 8) || shoreDistance(x, z) < 9 || Math.abs(z - roadZ(x)) < 9) continue;
      const scale = .8 + rand() * .55, parts = addTree(trees, rand, x, sceneryHeight(x, z), z, scale, cluster === 3 || rand() < .21);
      register(`grove:${cluster}:${i}`, 'tree', x, z, scale, parts);
    }
  });
  for (let i = 0; i < 450; i++) {
    const x = (rand() - .5) * 660, z = (rand() - .5) * 660;
    if (isClearing(x, z, 1) || shoreDistance(x, z) < 1 || Math.abs(z - roadZ(x)) < 5) continue;
    const r = .35 + rand() * 1.35;
    const first = rocks.add(x, sceneryHeight(x, z) + r * .25, z, r, r * (.45 + rand() * .5), r * .85, ROCK_COLOURS[i % ROCK_COLOURS.length], rand() * TAU);
    const shrubStart = shrubs.items.length;
    if (rand() > .36) for (let j = 0; j < 3; j++) shrubs.add(x + rand() * 2, sceneryHeight(x, z) + .5, z + rand() * 2, .75, .6, .8, LEAF_COLOURS[(i + j) % LEAF_COLOURS.length]);
    register(`rock:${i}`, 'rock', x, z, r, [{ batch: rocks, first, count: 1 }, { batch: shrubs, first: shrubStart, count: shrubs.items.length - shrubStart }]);
  }
  for (let i = 0; i < 44; i++) {
    const ridge = i % 2, a = rand() * TAU, r = Math.sqrt(rand()) * 22, x = (ridge ? 148 : -143) + Math.sin(a) * r, z = (ridge ? -12 : -54) + Math.cos(a) * r;
    if (protectedResource(x, z, 3)) continue;
    const size = 1.1 + rand() * 2.2, first = rocks.add(x, sceneryHeight(x, z) + size * .31, z, size, size * .69, size * .88, ROCK_COLOURS[i % 4], rand() * TAU);
    register(`ridge:${i}`, 'rock', x, z, size, [{ batch: rocks, first, count: 1 }]);
  }
  for (let i = 0; i < 4700; i++) {
    const x = (rand() - .5) * 650, z = (rand() - .5) * 650;
    if (shoreDistance(x, z) < 3 || Math.abs(z - roadZ(x)) < 4 || isClearing(x, z, -10)) continue;
    const h = .65 + rand() * .9, y = sceneryHeight(x, z);
    grass.add(x, y + .02, z, h, h, h, [0x99a46b, 0x7f9855, 0xb0ae72, 0x7c9056][i % 4], rand() * TAU);
    if (i % 4 === 0) flowers.add(x, y + h * .5, z, .09, .06, .09, i % 3 ? 0xe7d8a7 : 0xb4acb7);
  }
  const looseGrassCount=grass.items.length;
  // Pebbles and reeds emphasize the waterline without a hard painted border.
  for (let z = -380; z <= 380; z += 4) for (const side of [-1, 1]) {
    const x = riverX(z) + side * (riverWidth(z) + 3.5 + rand() * 2.5), y = sceneryHeight(x, z);
    if (rand() > .35) {
      const size = .35 + rand() * .6, first = rocks.add(x, y + .12, z, size, .22, .4, 0xa9a995, rand() * TAU);
      register(`shore:${z}:${side}`, 'rock', x, z, size, [{ batch: rocks, first, count: 1 }]);
    }
    for (let j = 0; j < 4; j++) {
      const reed = grass.add(x + side * rand() * 1.5, y, z + rand() * 2, .8, 1.65, .8, 0x8d9d62, rand() * TAU);
      grass.items[reed].windFlex = [.43, .012];
      grass.items[reed].windMotion = [.44, 1.35];
    }
  }
  // Forest ecotones grow around persistent trees/rocks, leaving travelling
  // clearings and protected resource sites open. These clumps share their parent
  // record, so a crushed grove never leaves an immortal decorative understorey.
  for(const record of records) {
    if(Math.abs(record.x)>215||Math.abs(record.z)>215)continue;
    const r=random(Math.abs(record.x*17791+record.z*32563)*100), first=ferns.items.length, grassFirst=grass.items.length;
    const count=record.kind==='tree'?5:2;
    for(let j=0;j<count;j++) {
      const a=r()*TAU, radius=(.9+r()*2.7)*record.size, x=record.x+Math.cos(a)*radius,z=record.z+Math.sin(a)*radius;
      if(protectedResource(x,z,1)||shoreDistance(x,z)<3||Math.abs(z-roadZ(x))<5)continue;
      const normal=scenerySelectionNormal(x,z); if(normal.y<.88)continue;
      const s=.65+r()*.76,y=sceneryHeight(x,z)+.035;
      ferns.add(x,y,z,s,s,s,record.kind==='tree'?0x577244:0x7d884b,a);
      for(let k=0;k<3;k++) {
        const gx=x+(r()-.5)*2.2,gz=z+(r()-.5)*2.2,gs=.76+r()*.75;
        if(!protectedResource(gx,gz))grass.add(gx,sceneryHeight(gx,gz)+.025,gz,gs,gs,gs,0x7a8d55,r()*TAU);
      }
    }
    if(ferns.items.length>first)record.parts.push({batch:ferns,first,count:ferns.items.length-first});
    if(grass.items.length>grassFirst)record.parts.push({batch:grass,first:grassFirst,count:grass.items.length-grassFirst});
  }
  // Upland geology now belongs to the connected height field. The former
  // detached repeated ridge-bed instances are removed; save anchors stay put.
  composeRegions(trees,shrubs,grass);composeRegions(distantTrees,{items:[]},{items:[]});createSlateLandmark(group,records);
  const ecotones=composeEcotones(group,records,shrubs,ferns,grass,looseGrassCount);
  const authored=composeAuthoredValley({group,Instances,trees,shrubs,ferns,grass,rocks,records,addTree,heightAt:sceneryHeight,selectionHeightAt:selectionSceneryHeight,ecologyAt,isClearing});
  const groundTransitions=composeGroundTransitions(grass,records,looseGrassCount);
  const canopyMeshes = trees.finish(),distantCanopyMeshes=distantTrees.finish(); rocks.finish('Valley boulders and river pebbles'); shrubs.finish('Meadow shrubs');
  const grasses = grass.finish('Meadow grass and river reeds'), flowerMesh = flowers.finish('Small wildflowers');
  const fernMesh=ferns.finish('Forest-edge ferns and saxifrage');
  const meadowDetail=createMeadowDetail(group);
  const life = createWorldLife(); group.add(life.group); life.update(0, 0);
  const interactions = createWorldInteractions(group, records), stats = interactions.stats;
  stats.ecotones={bushes:ecotones.bushes,ferns:ecotones.ferns,ledges:ecotones.ledges,relocatedGrass:ecotones.relocatedGrass,patchAnchors:ecotones.patchAnchors};
  stats.authoredValley=authored.stats;
  stats.groundTransitions=groundTransitions;
  stats.drainage=valleyDrainageDiagnostics();
  stats.landform={...WESTERN_TERRACE};
  stats.lifeCount = life.stats.lifeCount; stats.wind = windAt(0); stats.windTime = 0; stats.animatedVegetationInstances = 0;
  group.traverse(mesh => { if (mesh.userData.windAnimated) stats.animatedVegetationInstances += mesh.count; });
  let actors = [];
  return {
    group, ground, water, heightAt, surfaceHeightAt: renderedTerrainHeight, stats, crushables: interactions.crushables,
    setGroundTextures: textures => ground.userData.setGroundTextures(textures),
    update(time, delta = 0) { waterTime.value = time; vegetationTime.value = time; stats.windTime = time; windAt(time, 0, 0, stats.wind); life.update(time, delta, actors); },
    interact(nextActors, delta, options) { actors = nextActors || []; return interactions.interact(actors, delta, options); },
    resetInteractions: options => interactions.resetInteractions(options),
    setQuality(quality) {
      const low = quality === 'retro' || quality === 'low';
      if (grasses) grasses.visible = !low;
      if (flowerMesh) flowerMesh.visible = !low;
      if (fernMesh) fernMesh.visible = !low;
      if (meadowDetail) meadowDetail.visible = !low;
      canopyMeshes.forEach(mesh => { mesh.castShadow = !low; });
      distantCanopyMeshes.forEach(mesh=>{mesh.castShadow=false;});
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
    rubble: new Instances(group, irregularOrb(1), getMaterial('rock', 0xffffff)),
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
export function brokenRuinWallGeometry({width,height,depth=.72,seed=0,windows=true}){
  const shape=new T.Shape(),left=-width*.5,right=width*.5;
  shape.moveTo(left,0);shape.lineTo(right,0);shape.lineTo(right,height*(seed%2?.53:.92));
  // A connected wall survives around a directional breach. Thick returns and
  // actual openings cast deep shadows instead of outlining an empty wire frame.
  const profile=seed%2?[.94,.97,.76,.79,.64,.67,.48]:[.56,.62,.59,.79,.76,.98,.92];
  for(let k=profile.length-1;k>=0;k--)shape.lineTo(left+width*k/(profile.length-1),height*profile[k]);
  shape.lineTo(left,0);shape.closePath();
  if(windows&&height>3){
    for(const px of[-width*.23,width*.23]){
      const base=.95,top=Math.min(height*.48,3.2),half=Math.min(.68,width*.12),opening=new T.Path();
      opening.moveTo(px-half,base);opening.lineTo(px-half,top-.35);opening.quadraticCurveTo(px,top+.32,px+half,top-.35);opening.lineTo(px+half,base);opening.closePath();shape.holes.push(opening);
    }
  }
  const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.08,bevelThickness:.06,bevelSegments:1,curveSegments:5,steps:1});
  geometry.translate(0,0,-depth*.5);
  // Collinear cap vertices can leave zero-area triangles in the extrusion.
  // Their zero normals become NaN during vertex normalization, and a grazing
  // MSAA sample can contaminate the HDR image. Keep every solid face and its
  // original attributes exactly; only omit triangles with no surface area.
  const position=geometry.attributes.position,indices=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(let i=0;i<position.count;i+=3){
    a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
    if(b.sub(a).cross(c.sub(a)).lengthSq()>0)indices.push(i,i+1,i+2);
  }
  if(indices.length<position.count)geometry.setIndex(indices);
  return geometry;
}
function addBrokenRuinWall(group,{x,z,width,height,depth=.72,yaw=0,seed=0,brick=false,windows=true}){
  const geometry=brokenRuinWallGeometry({width,height,depth,seed,windows});
  // Extrusion UVs retain metre scale; scanned masonry does not stretch to fit a wall.
  const mesh=new T.Mesh(geometry,getMaterial(brick?'brick':'stone',brick?0x91715b:0x90988a));
  mesh.name='Fractured load-bearing ruin wall';mesh.position.set(x,.30,z);mesh.rotation.y=yaw;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
}

function addIronRuins(group, node, rand) {
  const d = siteDetails(group), oldTown = node.id === 'ruins2';
  box(group, 24, .13, 22, getMaterial('pavement', 0x90917e), 0, .02, 0);
  // Empty window frames and fractured slabs reveal the age of the old cities.
  const buildings = oldTown ? [[-7, -6, 7, 5, 6], [3, -7, 5, 6, 8.5], [-7, 5, 5.5, 5, 4], [5, 5, 6, 5, 6.8]] : [[-6, -4, 8, 7, 5.4], [5, -7, 5, 5, 8], [-5, 7, 7, 4, 3.7]];
  for (let i = 0; i < buildings.length; i++) {
    const [x, z, w, depth, h] = buildings[i], mat = i % 2 ? d.brick : d.stone, colour = i % 2 ? 0x99765d : 0x8c9487;
    mat.add(x, .3, z, w + .7, .6, depth + .7, 0xa2a491);
    addBrokenRuinWall(group,{x,z:z-depth*.5,width:w,height:h,seed:i,brick:!!(i%2)});
    addBrokenRuinWall(group,{x:x-w*.5,z,width:depth,height:h*.69,yaw:Math.PI*.5,seed:i+1,brick:!!(i%2),windows:false});
    for (const side of [-1, 1]) {
      mat.add(x + side * (w / 2 - .24), h*.40, z - depth / 2, .64, h*.80, .76, colour);
      mat.add(x + side * (w / 2 - .24), h * .43, z + depth / 2, .48, h * .86, .55, colour);
      for (let level = 1; level < h; level += 2.1) {
        if(side>0)mat.add(x, level, z + side * depth / 2, w, .57, .56, colour);
        for (let xx = -w / 2 + 1.1; xx < w / 2; xx += 1.55) {const survives=rand()>.12;if(survives&&side>0)mat.add(x + xx, level + .8, z + side * depth / 2, .36, 1.25, .56, colour);}
      }
      if(side>0)mat.add(x + side * w / 2, h * .25, z, .72, h * .50, depth*.82, colour);
    }
    // The surviving floor hugs the wall; a fallen slab forms a readable collapse
    // at its foot, within the same resource footprint and harvesting protection.
    d.stone.add(x-w*.19, h * .58, z-depth*.17, w * .47, .34, depth * .56, 0xa3a495, .08);
    const slab=d.stone.add(x+w*.10,.55,z+depth*.12,w*.54,.36,depth*.63,0x9a9d8e,-.22);
    d.stone.items[slab].rotation=new T.Quaternion().setFromEuler(new T.Euler(.12,-.22,.13));
    d.metal.add(x + w * .23, h * .65 + .8, z, .12, 1.6, .12, 0x625d50, .1);
    d.metal.add(x - w * .23, h * .65 + 1.1, z - depth * .3, .12, 2.2, .12, 0x625d50);
    if (oldTown) {
      d.stone.add(x, h + .25, z - depth / 2, w + .25, .35, .85, 0xb2ad95);
      for (let xx = -w / 2 + .5; xx < w / 2; xx += 1.25) d.stone.add(x + xx, h + .58, z - depth / 2, .42, .6, .52, 0xa6a691);
    }
  }
  if (!oldTown) {
    cylinder(group, 1.1, 1.8, 17, getMaterial('brick', 0x997050), -10, 8.5, -9, 12);
    cylinder(group, 1.32, 1.32, .45, getMaterial('stone', 0xb3ad95), -10, 17, -9, 12);
    cylinder(group, 1.02, 1.02, .04, getMaterial('metal', 0x394744), -10, 17.25, -9, 12);
    for(const x of [-8,7])d.pipe.link([x,0,3],[x,12.3,3],.21,0x7f6850);
    for(const y of [11.6,13.1])d.pipe.link([-8,y,3],[7,y,3],.19,0x8e7456);
    for(let i=0;i<5;i++)d.pipe.link([-8+i*3,11.6,3],[-5+i*3,13.1,3],.10,0x746d57);
    cylinder(group, 2.1, 2.1, 4, getMaterial('metal', 0x82968c), 8.5, 6.1, 6, 16);
    cone(group, 2.3, .7, getMaterial('metal', 0xa5afa0), 8.5, 8.45, 6, 16);
    for (const dx of [-1.4, 1.4]) for (const dz of [-1.4, 1.4]) d.metal.add(8.5 + dx, 2.3, 6 + dz, .19, 4.6, .19, 0x657568);
    for (const z of [4.6, 7.4]) d.pipe.link([7.1, .3, z], [9.9, 4.4, z], .06, 0x6e7768);
    for (let i = 0; i < 3; i++) {
      d.pipe.add(4.5 + i * 1.2, .5, 10, .5, .95, .5, i % 2 ? 0x9e7352 : 0x628a83);
      d.pipe.link([5 + i * 1.5, 1.2, -1], [5 + i * 1.5, 1.2, 3.6], .25, 0x8b7c64);
    }
  } else {
    // A fractured aqueduct is the old town's strong silhouette and orientation cue.
    const stone=getMaterial('stone',0xa6a99b);
    for(const x of [-7,0,7]){
      const shape=new T.Shape();
      if(x===7){
        // The last span has fallen forwards. Its ragged springing remains attached
        // to the intact arches; the missing mass is the rubble fan below.
        shape.moveTo(-3.4,0);shape.lineTo(-2.35,0);shape.lineTo(-2.35,5.25);
        shape.quadraticCurveTo(-2.30,6.8,-1.05,7.35);shape.lineTo(.05,7.7);shape.lineTo(.42,8.35);
        shape.lineTo(-.64,8.58);shape.lineTo(-1.22,9.30);shape.lineTo(-2.1,9.05);shape.lineTo(-3.4,9.65);shape.closePath();
      }else{
        shape.moveTo(-3.4,0);shape.lineTo(3.4,0);shape.lineTo(3.4,10);shape.lineTo(-3.4,10);shape.closePath();
        const arch=new T.Path();arch.moveTo(-2.35,0);arch.lineTo(-2.35,5.25);arch.absarc(0,5.25,2.35,Math.PI,0,true);arch.lineTo(2.35,0);arch.closePath();shape.holes.push(arch);
      }
      const geometry=new T.ExtrudeGeometry(shape,{depth:1.7,bevelEnabled:true,bevelSize:.10,bevelThickness:.1,bevelSegments:1,steps:1,curveSegments:10});
      const wall=new T.Mesh(geometry,stone);wall.position.set(x,0,-12.8);wall.castShadow=wall.receiveShadow=true;group.add(wall);
      const cap=box(group,6.9,.6,2.1,getMaterial('stone',0xbbb9a4),x,x===7?.65:10.15,x===7?-6.6:-11.95);
      if(x===7){cap.rotation.y=.51;cap.rotation.z=-.09;}
    }
  }
  const rubbleFirst=d.rubble.items.length,metalFirst=d.metal.items.length;
  for (let i = 0; i < 70; i++) {
    const x = (rand() - .5) * 24, z = (rand() - .5) * 23, r = .18 + rand() * .65;
    d.rubble.add(x, .16, z, r * 1.5, r * .7, r, ROCK_COLOURS[i % 4], rand() * TAU);
    if (i % 7 === 0) d.metal.add(x, .35, z, 2 + rand() * 3, .2, .22, 0x796e5c, rand() * TAU);
  }
  for(let i=rubbleFirst;i<d.rubble.items.length;i++){
    const item=d.rubble.items[i],j=i-rubbleFirst,u=item.x/24+.5,v=item.z/23+.5;
    if(oldTown&&j<44){
      const radius=1+Math.sqrt(v)*9,angle=(u-.5)*1.9;
      item.x=6.9+Math.sin(angle)*radius;item.z=-11.8+Math.cos(angle)*radius;
      item.y=.18+(1-radius/11)*.72;item.sx*=j<18?2.5:1.7;item.sy*=1.5;item.sz*=j<18?2.0:1.25;item.yaw=angle+.35;
    }else if(oldTown){item.x=-12+u*18;item.z=-12.1+v*3.2;item.y=.20;item.sx*=1.5;item.sz*=1.25;}
    else{
      const centres=[[-10,-9],[-6,-4],[5,-7],[-5,7]],[cx,cz]=centres[j%4],angle=u*TAU,radius=1.2+v*3.5;
      item.x=cx+Math.cos(angle)*radius;item.z=cz+Math.sin(angle)*radius;item.y=.2+(1-v)*.35;
      item.sx*=1.6;item.sy*=1.25;item.sz*=1.3;
    }
    item.colour=oldTown?[0xa9ac9b,0x969e92,0xb3b29e][j%3]:[0x918d78,0x827b68,0xa18f75][j%3];
  }
  for(let i=metalFirst;i<d.metal.items.length;i++){
    const item=d.metal.items[i],near=d.rubble.items[rubbleFirst+((i-metalFirst)*7)%70];
    item.x=near.x;item.y=near.y+.35;item.z=near.z;item.yaw=near.yaw+.23;
  }
  const growth = treeBatches(group);
  for (const [x, z] of [[-11, 6], [10, -10], [2, 1]]) addTree(growth, rand, x, 0, z, .63, false);
  for (let i = 0; i < 24; i++) {
    const x=(rand()-.5)*23,z=(rand()-.5)*23,edge=i%2===0;
    growth.leaves.add(edge?x:Math.sign(x)*11.2,.28,edge?Math.sign(z)*10.5:z,1.1,.4,.85,LEAF_COLOURS[i%6]);
  }
  growth.finish(); d.finish();
}
function addFarmland(group, node, rand) {
  const d = siteDetails(group), stalks = new Instances(group, grassGeometry(), getMaterial('grass', 0xffffff, { side: T.DoubleSide }), false, 'grass');
  const grain = new Instances(group, new T.IcosahedronGeometry(1, 0), getMaterial('foliage', 0xffffff), false, 'grass');
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
      for(const item of [stalks.items.at(-1),grain.items.at(-1)]){item.windRoot=[rx,.11,rz,h*1.45*.85];item.windFlex=[Math.min(.4,h*1.45*.24),.025];}
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
  const group = new T.Group(); group.name = node.name || `${node.kind} resource site`; group.position.set(node.x, sceneryHeight(node.x, node.z), node.z);
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
