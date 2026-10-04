import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';

// A bounded local kit. Add a tree only after its permitted Meshy export has been
// downloaded, inspected, and recorded. There is no Meshy/CDN request at runtime.
const files = Object.freeze({rock: '../assets/scenery/meshy-pilot/rock.glb', pine: '../assets/scenery/meshy-pilot/pine.glb', broadleaf: '../assets/scenery/meshy-pilot/broadleaf.glb'});
const treeLodFiles = Object.freeze({pine: '../assets/scenery/meshy-pilot/pine-lods.glb', broadleaf: '../assets/scenery/meshy-pilot/broadleaf-lods.glb'});
export const MESHY_PILOT_AREA = Object.freeze({minX: -65, maxX: 32, minZ: -140, maxZ: -90});
const masters = new Map();
let loading;
const status = {state: 'idle', milliseconds: 0, bytes: 0, treeLodBytes: 0, assets: [], error: null};

export function meshyPilotStatus() {
  return {...status, assets: status.assets.map(asset => ({...asset, bounds: {...asset.bounds}, textures: asset.textures.map(texture => ({...texture}))}))};
}

function readBinaryDocument(bytes) {
  const view = new DataView(bytes);
  if (view.byteLength < 28 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength) throw new Error('Invalid local pilot GLB header');
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || length > bytes.byteLength - 20) throw new Error('Invalid local pilot GLB JSON chunk');
  const document = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length)));
  if (document.asset?.version !== '2.0') throw new Error('Pilot assets must be glTF 2.0');
  if ([...(document.buffers || []), ...(document.images || [])].some(resource => resource.uri !== undefined)) throw new Error('Pilot assets must embed every buffer and image');
  const unsupported = (document.extensionsRequired || []).filter(name => !['KHR_materials_unlit', 'KHR_mesh_quantization', 'KHR_texture_transform'].includes(name));
  if (unsupported.length) throw new Error('Pilot asset requires unsupported processing: ' + unsupported.join(', '));
  return document;
}

function releaseResources(scene, retainedTextures = new Set()) {
  const geometry = new Set(), materials = new Set(), textures = new Set();
  scene.traverse(object => {
    if (object.geometry) geometry.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture && !retainedTextures.has(value)) textures.add(value);
    }
  });
  for (const resource of geometry) resource.dispose();
  for (const material of materials) material.dispose();
  releaseTextures(textures, new Set([...retainedTextures].map(texture => texture.image)));
}

function releaseTextures(textures, retainedImages = new Set()) {
  const closedImages = new Set();
  for (const texture of textures) {
    texture.dispose();
    const image = texture.image;
    if (image && !retainedImages.has(image) && !closedImages.has(image)) {closedImages.add(image); image.close?.();}
  }
}

function paintImportedRock(material) {
  // Preserve Meshy's atlas UVs. Only the existing shore field and absolute
  // water-contact height affect this one imported material family.
  material.roughnessMap = null; material.metalnessMap = null;
  material.roughness = .90; material.metalness = 0;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float sceneryWet; varying float vMeshyRockWet;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 pilotRockPoint=vec4(position,1.0);
        #ifdef USE_INSTANCING
          pilotRockPoint=instanceMatrix*pilotRockPoint;
        #endif
        float pilotRockHeight=(modelMatrix*pilotRockPoint).y;
        vMeshyRockWet=sceneryWet*(1.0-smoothstep(-.64,.16,pilotRockHeight));
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vMeshyRockWet;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb*=mix(vec3(1.0),vec3(.76,.83,.79),vMeshyRockWet);
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor=mix(.90,.58,vMeshyRockWet);
      `);
  };
  material.customProgramCacheKey = () => 'meshy-pilot-bank-rock-v1';
}

function normalizeMaster(gltf, kind, bytes) {
  const pieces = [], materials = new Set(), released = new Set();
  const releaseGeometry = value => {if (value && !released.has(value)) {released.add(value); value.dispose();}};
  let geometry, material;
  try {
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(object => {
    if (!object.isMesh) return;
    if (object.isSkinnedMesh || object.morphTargetInfluences?.length) throw new Error('Pilot scenery must be static, without skins or morph targets');
    for (const material of [object.material].flat()) materials.add(material);
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    pieces.push(geometry);
    for (const name of ['position', 'normal', 'uv']) if (!geometry.attributes[name]) throw new Error(kind + ' is missing ' + name);
    for (const attribute of Object.values(geometry.attributes)) for (const value of attribute.array) if (!Number.isFinite(value)) throw new Error(kind + ' has a non-finite vertex attribute');
    // A single opaque atlas and mesh are the approved small pilot, with no
    // character animation or mesh-material graph added to the runtime.
  });
  if (!pieces.length || materials.size !== 1 || gltf.animations.length) throw new Error(kind + ' must have one static material and no animation');
  try {geometry = pieces.length === 1 ? pieces[0] : mergeGeometries(pieces, false);}
  finally {if (pieces.length > 1) for (const piece of pieces) releaseGeometry(piece);}
  if (!geometry) throw new Error(kind + ' mesh attributes cannot be merged');
  const source = [...materials][0]; material = source.clone();
  if (!material.isMeshStandardMaterial || material.transparent || material.opacity < 1) throw new Error(kind + ' requires an opaque PBR material');
  for (const key of ['map', 'normalMap']) {
    const image = material[key]?.image;
    if (!image || ![image.width, image.height].every(value => Number.isFinite(value) && value > 0)) throw new Error(kind + ' requires decoded base and normal maps');
  }
  material.name = 'Meshy pilot ' + kind;
  material.metalness = 0; material.roughness = Math.max(.88, material.roughness);
  material.normalScale.setScalar(.34);
  material.userData = {...material.userData, shared: true, meshyPilot: kind};
  if (kind === 'rock') {
    paintImportedRock(material);
    material.normalScale.setScalar(.22);
    material.color.multiply(new T.Color().setRGB(.98, 1.05, .90));
  }
  else {
    // The delivered pine ORM has a median roughness of .639. Multiplying it
    // by the scalar would still produce glossy bark/crowns. Keep the painted
    // atlas and restrained normal detail, with a genuinely matte surface.
    material.roughnessMap = null; material.metalnessMap = null;
    material.roughness = .92;
    if (kind === 'pine') {
      // The first gameplay review found the imported pine too granular and
      // reflective beside the broadleaf. Quiet only this imported material.
      material.normalScale.setScalar(.12); material.roughness = .96;
      material.envMapIntensity = .5;
      material.color.multiply(new T.Color().setRGB(.86, .92, .74));
    }
  }
  geometry.computeBoundingBox();
  const originalBounds = geometry.boundingBox.clone(), size = originalBounds.getSize(new T.Vector3());
  if (![size.x, size.y, size.z].every(value => Number.isFinite(value) && value > .00001)) throw new Error(kind + ' has invalid dimensions');
  const centre = originalBounds.getCenter(new T.Vector3());
  if (kind === 'rock') {
    geometry.translate(-centre.x, -centre.y, -centre.z);
    geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
  } else {
    // The lower trunk, rather than the asymmetric crown, defines the root pivot.
    const position = geometry.attributes.position;
    let rootX = 0, rootZ = 0, count = 0;
    for (let i = 0; i < position.count; i++) if (position.getY(i) <= originalBounds.min.y + size.y * .035) {rootX += position.getX(i); rootZ += position.getZ(i); count++;}
    geometry.translate(-rootX / count, -originalBounds.min.y, -rootZ / count);
    geometry.scale(1 / size.y, 1 / size.y, 1 / size.y);
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.name = 'Imported Meshy ' + kind; geometry.userData = {shared: true, meshyPilot: kind};
  const textures = new Set(Object.values(material).filter(value => value?.isTexture));
  for (const texture of textures) {texture.userData.shared = true; texture.anisotropy = 4;}
  const inventory = {kind, bytes, triangles: (geometry.index?.count ?? geometry.attributes.position.count) / 3, vertices: geometry.attributes.position.count, materials: 1,
    bounds: {min: originalBounds.min.toArray(), max: originalBounds.max.toArray()},
    textures: [...textures].map(texture => ({width: texture.image?.width ?? null, height: texture.image?.height ?? null, colorSpace: texture.colorSpace, channel: texture.channel})),
    alphaMode: material.alphaTest > 0 ? 'MASK' : 'OPAQUE'};
  releaseResources(gltf.scene, textures);
  return {geometry, material, inventory};
  } catch (error) {
    for (const piece of new Set([...pieces, geometry].filter(Boolean))) releaseGeometry(piece);
    material?.dispose(); releaseResources(gltf.scene); throw error;
  }
}

export function loadMeshyPilot() {
  if (loading) return loading;
  status.state = 'loading'; const start = performance.now();
  loading = (async () => {
    try {
      const loader = new GLTFLoader();
      for (const [kind, relative] of Object.entries(files)) {
        const response = await fetch(new URL(relative, import.meta.url));
        if (!response.ok) throw new Error('Local ' + kind + ' asset returned HTTP ' + response.status);
        const bytes = await response.arrayBuffer(); readBinaryDocument(bytes);
        const gltf = await loader.parseAsync(bytes, '');
        const master = normalizeMaster(gltf, kind, bytes.byteLength);
        masters.set(kind, master); status.bytes += bytes.byteLength; status.assets.push(master.inventory);
      }
      // These local geometry-only files are reproducible reductions of the same
      // Meshy meshes. Every tree continues to share its original painted atlas.
      for (const [kind, relative] of Object.entries(treeLodFiles)) {
        const response = await fetch(new URL(relative, import.meta.url));
        if (!response.ok) throw new Error('Local ' + kind + ' LOD returned HTTP ' + response.status);
        const bytes = await response.arrayBuffer(); readBinaryDocument(bytes);
        const gltf = await loader.parseAsync(bytes, ''), master = masters.get(kind), lods = {};
        try {
          for (const level of ['near', 'far']) {
            const mesh = gltf.scene.getObjectByName(kind + '-' + level);
            if (!mesh?.isMesh || mesh.isSkinnedMesh || gltf.animations.length) throw new Error('Missing static ' + kind + ' ' + level + ' LOD');
            const geometry = mesh.geometry.clone();
            lods[level] = geometry;
            for (const name of ['position', 'normal', 'uv']) {
              const attribute = geometry.attributes[name];
              if (!attribute) throw new Error('Tree LOD missing ' + name);
              for (const value of attribute.array) if (!Number.isFinite(value)) throw new Error('Non-finite tree LOD attribute');
            }
            const count = geometry.attributes.position.count;
            if (!geometry.index || geometry.index.count % 3 || geometry.index.count > 21000) throw new Error('Tree LOD exceeds its bounded triangle budget');
            for (const index of geometry.index.array) if (index >= count) throw new Error('Invalid tree LOD index');
            geometry.computeBoundingBox(); geometry.computeBoundingSphere();
            for (const edge of ['min', 'max']) if (geometry.boundingBox[edge].distanceTo(master.geometry.boundingBox[edge]) > .0001) throw new Error('Tree LOD changed the original root/extent');
            geometry.name = 'Meshy ' + kind + ' ' + level + ' master';
            geometry.userData = {shared: true, meshyPilot: kind, meshyTreeLod: level};
          }
          master.lods = lods; master.inventory.lods = Object.fromEntries(Object.entries(lods).map(([level, geometry]) => [level, {triangles: geometry.index.count / 3, vertices: geometry.attributes.position.count}]));
          status.bytes += bytes.byteLength; status.treeLodBytes += bytes.byteLength;
        } catch (error) {for (const geometry of Object.values(lods)) geometry.dispose(); throw error;}
        finally {releaseResources(gltf.scene);}
      }
      status.state = 'ready';
      status.milliseconds = performance.now() - start;
      return meshyPilotStatus();
    } catch (error) {
      status.state = 'failed'; status.error = String(error?.message || error);
      for (const master of masters.values()) {
        master.geometry.dispose(); master.material.dispose();
        for (const geometry of Object.values(master.lods || {})) geometry.dispose();
        releaseTextures(new Set(Object.values(master.material).filter(value => value?.isTexture)));
      }
      masters.clear(); throw error;
    } finally {status.milliseconds = performance.now() - start;}
  })();
  return loading;
}

// Convert only standing addTree roots. Rootless shrubs, cut logs and attached
// ground dressing retain their exact shapes, matrices and logical ownership.
export function bindMeshyTreeCoverage({group, Instances, trees, records = [], assets = masters}) {
  const stats = {state: 'not-loaded', roots: [], count: 0, triangles: 0, level: trees.distant ? 'far' : 'near'};
  // CPU-only construction fixtures may deliberately omit asset preloading.
  // Ordinary game boot awaits the mandatory complete library above.
  if (!assets.has('pine') || !assets.has('broadleaf')) return {meshes: [], stats};
  const roots = new Map(), removals = new Map(), object = new T.Object3D(), sourceRoots = new Map();
  for (const batch of [trees.wood, trees.leaves, trees.needles]) {
    batch.geometry.computeBoundingBox(); const indices = new Map(); sourceRoots.set(batch, indices);
    for (let index = 0; index < batch.items.length; index++) {
      const item = batch.items[index], root = item.windRoot;
      if (!root) continue;
      const key = root.join(',');
      if (!roots.has(key)) roots.set(key, {root, kind: 'broadleaf', bounds: new T.Box3(), owners: new Set()});
      const tree = roots.get(key); if (batch === trees.needles) tree.kind = 'pine';
      tree.bounds.union(batch.geometry.boundingBox.clone().applyMatrix4(itemMatrix(item, object)));
      if (!removals.has(batch)) removals.set(batch, new Set()); removals.get(batch).add(index); indices.set(index, tree);
    }
  }
  for (const record of records) for (const ref of record.parts) {
    const indices = sourceRoots.get(ref.batch); if (!indices) continue;
    for (let index = ref.first; index < ref.first + ref.count; index++) indices.get(index)?.owners.add(record);
  }
  const batches = new Map(), replacements = [];
  for (const {root, kind, bounds, owners} of roots.values()) {
    const master = assets.get(kind), level = stats.level, source = master.lods?.[level];
    if (!source) throw new Error('Meshy ' + kind + ' ' + level + ' LOD is not loaded');
    if (!batches.has(kind)) {
      const geometry = source.clone(); geometry.userData.shared = false;
      batches.set(kind, new Instances(group, geometry, master.material, !trees.distant, 'foliage'));
    }
    const batch = batches.get(kind), box = master.geometry.boundingBox, first = batch.items.length;
    const halfX = Math.max(Math.abs(bounds.min.x - root[0]), Math.abs(bounds.max.x - root[0]));
    const halfZ = Math.max(Math.abs(bounds.min.z - root[2]), Math.abs(bounds.max.z - root[2]));
    const fitX = halfX / Math.max(Math.abs(box.min.x), Math.abs(box.max.x)), fitZ = halfZ / Math.max(Math.abs(box.min.z), Math.abs(box.max.z));
    const narrow = Math.min(fitX, fitZ);
    // Vary the source crown's orientation without consuming world randomness
    // or moving a root. Fit the rotated display inside the same root-centred
    // maximum envelope; never stretch a rounded crown into a long ribbon.
    const seed = Math.imul(Math.round(root[0] * 1000), 73856093) ^ Math.imul(Math.round(root[2] * 1000), 19349663);
    const yaw = (seed >>> 0) / 4294967296 * Math.PI * 2;
    let sx = Math.min(fitX, narrow * 1.35), sz = Math.min(fitZ, narrow * 1.35);
    const rotated = box.clone().applyMatrix4(new T.Matrix4().makeRotationY(yaw).scale(new T.Vector3(sx, 1, sz)));
    const shrink = Math.min(1, halfX / Math.max(Math.abs(rotated.min.x), Math.abs(rotated.max.x)), halfZ / Math.max(Math.abs(rotated.min.z), Math.abs(rotated.max.z)));
    sx *= shrink; sz *= shrink;
    batch.items.push({x: root[0], y: root[1], z: root[2], sx, sy: Math.min(bounds.max.y - root[1], Math.min(sx, sz) * 2.25), sz, colour: 0xffffff, yaw,
      windRoot: root.slice(), windFlex: [.66, .008], windMotion: [.73, 2.4]});
    for (const record of owners) replacements.push({record, part: {batch, first, count: 1}});
    stats.roots.push({kind, root: root.slice(), owners: [...owners].map(record => record.id)});
    stats.count++; stats.triangles += source.index.count / 3;
  }
  compactBatches(records, removals);
  for (const {record, part} of replacements) record.parts.push(part);
  const meshes = [];
  for (const [kind, batch] of batches) {
    const mesh = batch.finish('Meshy ' + stats.level + (kind === 'pine' ? ' Pine boughs' : ' Broadleaf canopies'));
    // Instances.finish can spatially partition large batches. Tag both the
    // canonical source and its chunks without changing saved-instance indices.
    for (const part of [mesh, ...(mesh.spatialChunks || [])]) {
      part.userData.meshyTreeCoverage = kind; part.userData.meshyPilot = kind;
    }
    meshes.push(mesh);
  }
  stats.state = 'ready'; return {meshes, stats};
}

function inPilot(record) {return record.x >= MESHY_PILOT_AREA.minX && record.x <= MESHY_PILOT_AREA.maxX && record.z >= MESHY_PILOT_AREA.minZ && record.z <= MESHY_PILOT_AREA.maxZ;}
function itemMatrix(item, target) {
  target.position.set(item.x, item.y, item.z); target.scale.set(item.sx, item.sy, item.sz);
  if (item.rotation) target.quaternion.copy(item.rotation); else target.rotation.set(0, item.yaw, 0);
  target.updateMatrix(); return target.matrix;
}
function ownedGeometry(master) {const geometry = master.geometry.clone(); geometry.userData.shared = false; return geometry;}

// Compact only removed display parts and repair every logical owner's range.
// Never consume randomness, move anchors, touch collision rules, or remap IDs.
function compactBatches(records, removals) {
  for (const [batch, removed] of removals) {
    const prefix = new Uint32Array(batch.items.length + 1), kept = [];
    batch.items.forEach((item, index) => {if (!removed.has(index)) kept.push(item); prefix[index + 1] = kept.length;});
    for (const record of records) record.parts = record.parts.flatMap(ref => {
      if (ref.batch !== batch) return [ref];
      const first = prefix[ref.first], count = prefix[ref.first + ref.count] - first;
      return count ? [{batch, first, count}] : [];
    });
    batch.items = kept;
  }
}

export function bindMeshyPilot({group, Instances, records, trees, rocks, assets = masters}) {
  const batches = new Map(), removals = new Map(), replacements = [], object = new T.Object3D();
  const recordChanges = [], getBatch = kind => {
    if (!batches.has(kind)) {
      const master = assets.get(kind), geometry = ownedGeometry(master);
      if (kind === 'rock') {
        rocks.geometry.computeBoundingBox(); const size = rocks.geometry.boundingBox.getSize(new T.Vector3()), centre = rocks.geometry.boundingBox.getCenter(new T.Vector3());
        geometry.scale(size.x, size.y, size.z); geometry.translate(centre.x, centre.y, centre.z);
        geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      }
      batches.set(kind, new Instances(group, geometry, master.material, true, kind === 'rock' ? null : 'foliage'));
    }
    return batches.get(kind);
  };
  const remove = (batch, index) => {if (!removals.has(batch)) removals.set(batch, new Set()); removals.get(batch).add(index);};
  for (const record of records) {
    if (!inPilot(record)) continue;
    if (record.kind === 'rock' && assets.has('rock')) {
      const batch = getBatch('rock'), first = batch.items.length;
      for (const ref of record.parts.filter(ref => ref.batch === rocks)) for (let index = ref.first; index < ref.first + ref.count; index++) {
        batch.items.push({...rocks.items[index], colour: 0xffffff}); remove(rocks, index);
      }
      const count = batch.items.length - first;
      if (count) {replacements.push({record, part: {batch, first, count}}); recordChanges.push({id: record.id, kind: 'rock', count});}
    } else if (record.kind === 'tree') {
      const pine = record.parts.some(ref => ref.batch === trees.needles), kind = pine ? 'pine' : 'broadleaf';
      if (!assets.has(kind)) continue;
      const refs = record.parts.filter(ref => [trees.wood, trees.leaves, trees.needles].includes(ref.batch)), bounds = new T.Box3();
      let root;
      for (const ref of refs) for (let index = ref.first; index < ref.first + ref.count; index++) {
        const item = ref.batch.items[index];
        if (!item.windRoot || item.windRoot[0] !== record.x || item.windRoot[2] !== record.z) continue;
        root ??= item.windRoot;
        ref.batch.geometry.computeBoundingBox(); bounds.union(ref.batch.geometry.boundingBox.clone().applyMatrix4(itemMatrix(item, object)));
        remove(ref.batch, index);
      }
      if (!root || bounds.isEmpty()) throw new Error('Imported tree lost its original root: ' + record.id);
      const master = assets.get(kind), box = master.geometry.boundingBox, batch = getBatch(kind), first = batch.items.length;
      const halfX = Math.max(Math.abs(bounds.min.x - root[0]), Math.abs(bounds.max.x - root[0]));
      const halfZ = Math.max(Math.abs(bounds.min.z - root[2]), Math.abs(bounds.max.z - root[2]));
      batch.items.push({x: root[0], y: root[1], z: root[2], sx: halfX / Math.max(Math.abs(box.min.x), Math.abs(box.max.x)), sy: bounds.max.y - root[1], sz: halfZ / Math.max(Math.abs(box.min.z), Math.abs(box.max.z)), colour: 0xffffff, yaw: 0,
        windRoot: root.slice(), windFlex: [.66, .008], windMotion: [.73, 2.4]});
      replacements.push({record, part: {batch, first, count: 1}}); recordChanges.push({id: record.id, kind, count: 1});
    }
  }
  compactBatches(records, removals);
  for (const {record, part} of replacements) record.parts.push(part);
  const meshes = [], treeMeshes = [];
  for (const [kind, batch] of batches) {
    if (!batch.items.length) {batch.geometry.dispose(); continue;}
    const name = kind === 'pine' ? 'Meshy pilot Pine boughs' : kind === 'broadleaf' ? 'Meshy pilot Broadleaf canopies' : 'Meshy pilot riverbank rocks';
    const mesh = batch.finish(name); mesh.userData.meshyPilot = kind; meshes.push(mesh);
    if (kind !== 'rock') treeMeshes.push(mesh);
  }
  return {meshes, treeMeshes, stats: {area: MESHY_PILOT_AREA, records: recordChanges, instances: recordChanges.reduce((sum, record) => sum + record.count, 0), masters: [...batches.keys()]}};
}
