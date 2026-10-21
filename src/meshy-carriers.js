import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {clone as cloneSkeleton} from '../vendor/SkeletonUtils.js';
import {softenCarrierNormals} from './carrier-normals.js';
import {sculptFleshGeometry, fleshContactBoneIndices} from './carrier-sculpt.js';
import {buildFoundryCyborg} from './cyborg-foundry.js';
import {surfaceSet} from './surface-library.js';

// This loader owns bodies only. City decks, picking, weapons, locomotion and
// combat stay with the existing carrier. No remote request or rig-name guess.
const files = Object.freeze({cyborg: '../assets/carriers/meshy/cyborg.glb', flesh: '../assets/beast-integration/titanhorn-rigged.glb'});
const instances = new WeakMap();
const cloneData = value => JSON.parse(JSON.stringify(value));
const MAX_BYTES = 64 * 1024 * 1024;
const allowedExtensions = new Set(['KHR_materials_unlit', 'KHR_mesh_quantization', 'KHR_texture_transform', 'KHR_materials_specular']);

export function inspectCarrierDocument(bytes) {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength < 28 || bytes.byteLength > MAX_BYTES) throw new Error('Invalid or oversized local carrier GLB');
  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength) throw new Error('Invalid local carrier GLB header');
  let document, binaryLength = 0, chunks = 0;
  for (let offset = 12; offset < bytes.byteLength;) {
    if (offset + 8 > bytes.byteLength) throw new Error('Truncated carrier GLB chunk');
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
    offset += 8;
    if (length % 4 || length > bytes.byteLength - offset) throw new Error('Invalid carrier GLB chunk length');
    if (chunks === 0 && type === 0x4e4f534a) document = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, offset, length)));
    else if (chunks === 1 && type === 0x004e4942) binaryLength = length;
    else throw new Error('Carrier GLB must contain JSON followed by one embedded binary chunk');
    offset += length; chunks++;
  }
  if (document?.asset?.version !== '2.0' || chunks !== 2) throw new Error('Carrier requires an embedded glTF 2.0 GLB');
  if ([...(document.buffers || []), ...(document.images || [])].some(resource => resource.uri !== undefined)) throw new Error('Carrier buffers and images must be embedded');
  if (document.buffers?.length !== 1 || !Number.isInteger(document.buffers[0].byteLength) || document.buffers[0].byteLength <= 0 || binaryLength - document.buffers[0].byteLength < 0 || binaryLength - document.buffers[0].byteLength > 3) throw new Error('Invalid carrier binary buffer length');
  for (const view of document.bufferViews || []) {
    if ((view.buffer ?? 0) !== 0 || !Number.isInteger(view.byteOffset ?? 0) || (view.byteOffset ?? 0) < 0 || !Number.isInteger(view.byteLength) || view.byteLength <= 0 || (view.byteOffset ?? 0) + view.byteLength > document.buffers[0].byteLength) throw new Error('Invalid carrier buffer view');
    if (view.extensions?.EXT_meshopt_compression) throw new Error('Carrier meshopt compression requires an unavailable decoder');
  }
  for (const image of document.images || []) {
    if (!Number.isInteger(image.bufferView) || !document.bufferViews?.[image.bufferView] || !['image/png', 'image/jpeg'].includes(image.mimeType)) throw new Error('Carrier images require embedded PNG or JPEG data');
  }
  for (const mesh of document.meshes || []) for (const primitive of mesh.primitives || []) {
    if (primitive.extensions?.KHR_draco_mesh_compression) throw new Error('Carrier Draco compression requires an unavailable decoder');
  }
  for (const texture of document.textures || []) if (texture.extensions?.KHR_texture_basisu) throw new Error('Carrier KTX2 compression requires an unavailable decoder');
  const unsupported = (document.extensionsRequired || []).filter(name => !allowedExtensions.has(name));
  if (unsupported.length) throw new Error('Unsupported required carrier extensions: ' + unsupported.join(', '));
  return document;
}

// Record decoded dependencies, including those finishing after another parse
// dependency failed. Releasing a failed load never disposes a different master.
function resourceOwner() {
  const resources = new Set(), images = new Set(), released = new Set(), closed = new Set();
  let failed = false;
  const flush = () => {
    for (const resource of resources) if (!released.has(resource)) {released.add(resource); resource.dispose();}
    for (const image of images) if (!closed.has(image)) {closed.add(image); image.close?.();}
  };
  const collect = value => {
    if (!value) return;
    if (Array.isArray(value)) {value.forEach(collect); return;}
    if (value.isObject3D) {
      value.traverse(object => {collect(object.geometry); collect(object.material); collect(object.skeleton);});
    } else if (value.isMaterial) {
      resources.add(value);
      for (const entry of Object.values(value)) if (entry?.isTexture) collect(entry);
    } else if (value.isTexture) {resources.add(value); if (value.image) images.add(value.image);}
    else if (value.isBufferGeometry || value.bones && value.boneInverses && typeof value.dispose === 'function') resources.add(value);
    if (failed) flush();
  };
  return {collect, release() {failed = true; flush();}};
}

async function parseLocal(bytes, collect) {
  const loader = new GLTFLoader();
  loader.register(parser => {
    // GLTFLoader has no parse cancellation/disposal hook. Track its pinned
    // dependency promises without changing their result or rejection semantics.
    for (const name of ['getDependency', 'loadGeometries']) {
      const original = parser[name].bind(parser);
      parser[name] = (...args) => original(...args).then(value => {collect(value); return value;});
    }
    return {name: 'LOCAL_carrier_resource_ownership'};
  });
  return loader.parseAsync(bytes, '');
}

function positionTrackInfo(track) {
  const parsed = T.PropertyBinding.parseTrackName(track.name);
  if (parsed.propertyName !== 'position' || parsed.propertyIndex !== undefined || parsed.objectName !== undefined) return null;
  const cubic = Boolean(track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline), stride = cubic ? 9 : 3, offset = cubic ? 3 : 0;
  if (track.getValueSize() !== stride) throw new Error('Unsupported position-track layout: ' + track.name);
  const end = (track.times.length - 1) * stride + offset;
  return {node: parsed.nodeName, stride, offset, cubic, displacement: [0, 1, 2].map(axis => track.values[end + axis] - track.values[offset + axis])};
}

function prepareMaster(gltf, kind, bytes) {
  if (!gltf.scene?.isObject3D) throw new Error(kind + ' has no decoded scene');
  const objects = new Set(), bones = new Set(), geometries = new Set(), materials = new Set(), textures = new Set();
  let meshes = 0, skinnedMeshes = 0, triangles = 0;
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(object => objects.add(object));
  gltf.scene.traverse(object => {
    object.userData = {...object.userData, noBatch: true};
    if (object.isBone) bones.add(object);
    if (!object.isMesh) return;
    meshes++;
    const geometry = object.geometry;
    if (!geometry?.attributes.position || !geometry.attributes.normal) throw new Error(kind + ' lacks mesh positions/normals');
    for (const attribute of Object.values(geometry.attributes)) for (const value of attribute.array) if (!Number.isFinite(value)) throw new Error(kind + ' has non-finite geometry');
    if (object.isSkinnedMesh) {
      skinnedMeshes++;
      if (!object.skeleton?.bones.length || !geometry.attributes.skinIndex || !geometry.attributes.skinWeight || object.skeleton.bones.some(bone => !objects.has(bone))) throw new Error(kind + ' has an incomplete or external skeleton');
      // Bind-pose spheres are insufficient once limbs move. These few bounded
      // character meshes remain visible until an animation envelope is measured.
      object.frustumCulled = false;
    }
    if (!geometries.has(geometry)) {
      if(kind==='flesh'&&object.userData.authoredFlesh){
        geometry.userData.authoredFlesh=true;
        geometry.userData.sourceContactVertices=object.userData.sourceContactVertices;
        geometry.userData.riggedBeast=Boolean(object.userData.riggedBeast);
      }
      if (kind === 'cyborg' && object.isSkinnedMesh && geometry.attributes.position.count > 512 && object.skeleton.bones.some(b=>b.name==='mixamorigHips')) {
        const authored=buildFoundryCyborg(object);
        for(const name of Object.keys(geometry.attributes))geometry.deleteAttribute(name);
        for(const [name,attribute]of Object.entries(authored.attributes))geometry.setAttribute(name,attribute);
        geometry.setIndex(authored.index);geometry.clearGroups();Object.assign(geometry.userData,authored.userData);
        geometry.computeBoundingBox();geometry.computeBoundingSphere();authored.dispose();
      }
      // Dense imported anatomy benefits from a bounded sculpt. Coarse authored
      // meshes retain their intentional silhouettes. The original GLB, joints,
      // indices, UVs and skin weights stay intact; all contact paws are fixed.
      if (kind === 'flesh' && !geometry.userData.authoredFlesh && object.isSkinnedMesh && geometry.attributes.position.count > 512) {
        const derived = sculptFleshGeometry(geometry, {protectedBoneIndices: fleshContactBoneIndices(object.skeleton.bones)});
        geometry.setAttribute('position', derived.geometry.attributes.position);
        geometry.setAttribute('normal', derived.geometry.attributes.normal);
        geometry.userData.fleshSculpt = derived.stats;
        geometry.computeBoundingBox(); geometry.computeBoundingSphere();
        derived.geometry.dispose();
      }
      // Authored flesh already supplies smooth skin normals and deliberate
      // hard horn planes. The imported seam pass would erase that distinction.
      if (kind !== 'flesh' || !geometry.userData.authoredFlesh) softenCarrierNormals(geometry, kind === 'flesh' ? 100 : 38);
    }
    geometries.add(geometry); triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3;
    object.castShadow = true; object.receiveShadow = true;
    for (const material of [object.material].flat()) {
      if (!material?.isMeshStandardMaterial && !material?.isMeshBasicMaterial) throw new Error(kind + ' has an unsupported material');
      if (!materials.has(material) && material.isMeshStandardMaterial) {
        const foundry=Boolean(geometry.userData.foundryCyborg);
        const authoredFlesh=Boolean(geometry.userData.authoredFlesh),riggedBeast=Boolean(geometry.userData.riggedBeast),authored=foundry||authoredFlesh;
        if(authored&&!riggedBeast){
          material.vertexColors=true;material.color.set(0xffffff);
          material.map=material.normalMap=material.roughnessMap=material.metalnessMap=material.aoMap=null;
          material.metalness=foundry?.3:0;material.roughness=foundry?.56:.82;
        }
        // Preserve the authored anatomy, rig and UV wear masks. Paint their
        // reflectance as one restrained material family instead of retaining
        // the imported near-black / sharp metallic response.
        material.normalScale.multiplyScalar(riggedBeast?.55:kind === 'cyborg' ? .24 : .16);
        if(riggedBeast){material.vertexColors=false;material.color.set(0xffffff);material.metalness=0;material.roughness=.92;}
        // The new paint families already define their physical response. The
        // legacy imported-map correction must not flatten that response twice.
        if(!authored)material.metalness *= kind === 'cyborg' ? .34 : .04;
        material.envMapIntensity = kind === 'cyborg' ? .42 : .32;
        const floor = riggedBeast ? '.52' : authored ? '0.0' : kind === 'cyborg' ? '.64' : '.84';
        material.onBeforeCompile = shader => {
          if(authored&&!riggedBeast){
            // The existing shared paint library owns this texture. Bind-space
            // projection follows the animated metal instead of swimming over it.
            shader.uniforms.foundryPaint={value:surfaceSet(foundry?'metal':'hide').map};
            shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 foundryPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nfoundryPoint=position;');
            shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D foundryPaint;\nvarying vec3 foundryPoint;').replace('#include <map_fragment>',`#include <map_fragment>
              vec3 pigment=texture2D(foundryPaint,foundryPoint.xy*${foundry?'5.0':'2.5'},${foundry?'0.0':'1.0'}).rgb*.65+texture2D(foundryPaint,foundryPoint.zy*${foundry?'5.0':'2.5'},${foundry?'0.0':'1.0'}).rgb*.35;
              float wear=clamp(dot(pigment,vec3(.2126,.7152,.0722))*2.2,0.0,1.0);
              ${foundry?'diffuseColor.rgb*=mix(.70,1.12,wear);':'float hideMask=1.0-smoothstep(.50,.65,vColor.r); diffuseColor.rgb*=mix(1.0,mix(.44,1.38,wear),hideMask);'}
            `);
          }
          if(!authored)shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
            float pigmentLuma = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
            float pigmentValue = pow(clamp(pigmentLuma*1.5,0.0,1.0),.65);
            ${kind === 'cyborg' ? `
            vec3 paintedBody = mix(vec3(.065,.095,.105),vec3(.52,.49,.38),pigmentValue);
            float copperMask = smoothstep(.025,.15,diffuseColor.r-diffuseColor.b);
            paintedBody = mix(paintedBody,vec3(.34,.18,.075),copperMask*.55);
            ` : `
            vec3 paintedBody = mix(vec3(.080,.068,.045),vec3(.46,.39,.28),pigmentValue);
            float warmFissure = smoothstep(.025,.16,diffuseColor.r-max(diffuseColor.g,diffuseColor.b));
            paintedBody = mix(paintedBody,vec3(.24,.105,.065),warmFissure*.45);
            `}
            diffuseColor.rgb = paintedBody;
          `);
          shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
            '#include <roughnessmap_fragment>\nroughnessFactor = ' + floor + ' + (1.0 - ' + floor + ') * roughnessFactor;');
        };
        material.customProgramCacheKey = () => 'remake-carrier-painted-v10c-' + kind + (riggedBeast?'-titanhorn':authored?'-authored':'');
      }
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) {
        const image = value.image;
        if (!image || ![image.width, image.height].every(n => Number.isFinite(n) && n > 0 && n <= 4096)) throw new Error(kind + ' has an invalid decoded image');
        textures.add(value);
      }
    }
  });
  if (!meshes || triangles > 200000 || bones.size > 256 || meshes > 64) throw new Error(kind + ' exceeds the bounded carrier mesh/rig budget');
  const bounds = new T.Box3().setFromObject(gltf.scene), size = bounds.getSize(new T.Vector3());
  if (![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite) || Math.min(size.x, size.y, size.z) <= 0) throw new Error(kind + ' has invalid body bounds');
  const animations = (gltf.animations || []).map(clip => {
    if (!Number.isFinite(clip.duration) || clip.duration <= 0 || !clip.tracks.length) throw new Error(kind + ' has an empty or invalid animation');
    const translations = [];
    for (const track of clip.tracks) {
      if (!track.times.length) throw new Error(kind + ' has invalid animation keys');
      for (const values of [track.times, track.values]) for (const value of values) if (!Number.isFinite(value)) throw new Error(kind + ' has invalid animation keys');
      for (let i = 1; i < track.times.length; i++) if (track.times[i] < track.times[i - 1]) throw new Error(kind + ' has unordered animation keys');
      const info = positionTrackInfo(track);
      if (info) translations.push({track: track.name, node: info.node, displacement: info.displacement});
    }
    return {name: clip.name, duration: clip.duration, tracks: clip.tracks.length, translations};
  });
  for (const resource of [...geometries, ...materials, ...textures]) resource.userData = {...resource.userData, shared: true, meshyCarrier: kind};
  for (const texture of textures) texture.anisotropy = Math.min(4, Math.max(1, texture.anisotropy));
  return {scene: gltf.scene, clips: gltf.animations || [], inventory: {kind, bytes, meshes, skinnedMeshes, triangles, bones: [...bones].map(bone => bone.name), materials: materials.size,
    bounds: {min: bounds.min.toArray(), max: bounds.max.toArray()}, animations,
    textures: [...textures].map(texture => ({width: texture.image.width, height: texture.image.height, colorSpace: texture.colorSpace}))}};
}

function inPlaceClip(source, rootMotionNode, axes) {
  const clip = source.clone();
  if (rootMotionNode === undefined || rootMotionNode === null) return clip;
  if (typeof rootMotionNode !== 'string' || !rootMotionNode) throw new Error('Root motion requires an inspected node name');
  if (!Array.isArray(axes) || !axes.length || new Set(axes).size !== axes.length || axes.some(axis => !['x', 'y', 'z'].includes(axis))) throw new Error('Invalid root-motion axes');
  let matched = false;
  for (const track of clip.tracks) {
    const info = positionTrackInfo(track);
    if (!info || info.node !== rootMotionNode) continue;
    matched = true;
    const start = track.times[0], duration = track.times[track.times.length - 1] - start;
    if (duration <= 0) continue;
    for (const axis of axes) {
      const component = ['x', 'y', 'z'].indexOf(axis), travel = info.displacement[component];
      for (let i = 0; i < track.times.length; i++) {
        track.values[i * info.stride + info.offset + component] -= travel * (track.times[i] - start) / duration;
        if (info.cubic) {
          track.values[i * info.stride + component] -= travel / duration;
          track.values[i * info.stride + 6 + component] -= travel / duration;
        }
      }
    }
  }
  if (!matched) throw new Error('No position track for inspected root-motion node: ' + rootMotionNode);
  return clip;
}

export function createMeshyCarrierCache({fetchAsset = url => fetch(url, {credentials: 'same-origin'}), parse = parseLocal} = {}) {
  const records = new Map(Object.keys(files).map(kind => [kind, {kind, state: 'idle', bytes: 0, milliseconds: 0, error: null, promise: null, master: null, owner: null}]));
  const active = new Set();
  let closed = false;
  const recordFor = kind => {if (!records.has(kind)) throw new Error('Unknown local carrier kind: ' + kind); return records.get(kind);};
  const status = () => {
    const assets = [...records.values()].map(({kind, state, bytes, milliseconds, error, master}) => ({kind, state, bytes, milliseconds, error, capabilities: master ? cloneData(master.inventory) : null}));
    return {state: closed ? 'disposed' : assets.some(a => a.state === 'loading') ? 'loading' : assets.some(a => a.state === 'failed') ? 'failed' : assets.some(a => a.state === 'ready') ? 'ready' : 'idle', activeInstances: active.size, bytes: assets.reduce((sum, a) => sum + a.bytes, 0), assets};
  };
  const load = kind => {
    if (closed) throw new Error('Carrier cache is disposed');
    const record = recordFor(kind);
    if (record.promise) return record.promise;
    const started = performance.now(), owner = resourceOwner(); record.owner = owner; record.state = 'loading';
    record.promise = (async () => {
      try {
        const response = await fetchAsset(new URL(files[kind], import.meta.url));
        if (!response.ok) throw new Error('Local ' + kind + ' carrier returned HTTP ' + response.status);
        const length = Number(response.headers?.get('content-length'));
        if (length > MAX_BYTES) throw new Error('Oversized local carrier response');
        const bytes = await response.arrayBuffer(); inspectCarrierDocument(bytes);
        const gltf = await parse(bytes, owner.collect); owner.collect(gltf.scenes || gltf.scene);
        record.master = prepareMaster(gltf, kind, bytes.byteLength); record.bytes = bytes.byteLength; record.state = 'ready';
        return cloneData(record.master.inventory);
      } catch (error) {
        owner.release(); record.master = null; record.state = 'failed'; record.error = String(error?.message || error); throw error;
      } finally {record.milliseconds = performance.now() - started;}
    })();
    return record.promise;
  };
  const instantiate = (kind, {clipName, rootMotionNode, rootMotionAxes = ['x', 'z'], strideDistance, initialPhase = 0} = {}) => {
    if (closed) throw new Error('Carrier cache is disposed');
    const master = recordFor(kind).master;
    if (!master) throw new Error('Carrier must finish its explicit preload before instantiation: ' + kind);
    let clip = null;
    if (clipName !== undefined) {
      const matches = master.clips.filter(clip => clip.name === clipName);
      if (matches.length !== 1) throw new Error('Carrier clip must match one inspected animation: ' + clipName);
      if (!Number.isFinite(strideDistance) || strideDistance <= 0) throw new Error('Animated carrier requires a positive world-space strideDistance');
      clip = inPlaceClip(matches[0], rootMotionNode, rootMotionAxes);
    }
    if (!Number.isFinite(initialPhase)) throw new Error('Invalid carrier initial phase');
    const root = new T.Group(); root.name = 'Meshy ' + kind + ' body'; root.userData = {noBatch: true, meshyCarrier: kind};
    const body = cloneSkeleton(master.scene); root.add(body);
    // SkeletonUtils remaps bones correctly but Three's Skeleton.clone shares
    // inverse matrices. Keep even those mutable rig matrices actor-owned.
    body.traverse(object => {if (object.isSkinnedMesh) object.skeleton.boneInverses = object.skeleton.boneInverses.map(matrix => matrix.clone());});
    const mixer = new T.AnimationMixer(body), action = clip ? mixer.clipAction(clip).setLoop(T.LoopRepeat, Infinity).play() : null;
    const instance = {kind, root, body, mixer, action, clip, capabilities: cloneData(master.inventory)};
    const state = {phase: ((initialPhase % 1) + 1) % 1, time: null, strideDistance, disposed: false, owner: active, poseRevision: 0};
    instances.set(instance, state); active.add(instance);
    body.traverse(object => {
      if (!object.isSkinnedMesh) return;
      let boundedRevision = -1;
      object.raycast = function (raycaster, intersections) {
        // Picking may query many rays/heights. Refresh the CPU skin envelope
        // only on the first query after a pose, never for every rendered frame.
        if (boundedRevision !== state.poseRevision) {
          this.computeBoundingBox();
          // The exact skin box already contains every deformed vertex. Its
          // enclosing sphere is conservative and avoids a second full skin
          // scan; the unchanged triangle test still decides the actual hit.
          this.boundingBox.getBoundingSphere(this.boundingSphere ??= new T.Sphere());
          boundedRevision = state.poseRevision;
        }
        return T.SkinnedMesh.prototype.raycast.call(this, raycaster, intersections);
      };
    });
    if (clip) mixer.setTime(state.phase * clip.duration);
    root.updateMatrixWorld(true);
    return instance;
  };
  return {load, status, instantiate,
    preload(kinds = Object.keys(files)) {return Promise.all([...new Set(kinds)].map(load)).then(() => status());},
    dispose() {
      if (active.size) throw new Error('Dispose carrier instances before releasing their shared masters');
      if ([...records.values()].some(record => record.state === 'loading')) throw new Error('Cannot dispose a loading carrier cache');
      if (closed) return;
      closed = true;
      for (const record of records.values()) {record.owner?.release(); record.master = null; record.promise = null;}
    }
  };
}

// time is simulation time, never wall-clock time. Prefer measured distanceDelta
// in world metres; speed is an explicit world-metres/second fallback for preview.
// No transform outside the imported body is touched, and no attack is scheduled.
export function updateMeshyCarrier(instance, {time, moving, distanceDelta, speed = 0} = {}) {
  const state = instances.get(instance);
  if (!state || state.disposed) return null;
  if (!Number.isFinite(time) || distanceDelta !== undefined && (!Number.isFinite(distanceDelta) || distanceDelta < 0) || !Number.isFinite(speed) || speed < 0) throw new Error('Invalid carrier animation time or travel');
  const delta = state.time === null ? 0 : Math.max(0, time - state.time); state.time = time;
  if (!instance.clip || !moving || delta === 0) return state.phase;
  const distance = distanceDelta ?? speed * delta;
  if (distance === 0) return state.phase;
  state.phase = (state.phase + distance / state.strideDistance) % 1;
  instance.mixer.setTime(state.phase * instance.clip.duration);
  instance.root.updateMatrixWorld(true);
  markMeshyCarrierPose(instance);
  return state.phase;
}

// Call after all adapter IK/tail/strike corrections, with current world matrices.
export function markMeshyCarrierPose(instance) {
  const state = instances.get(instance);
  if (state && !state.disposed) state.poseRevision++;
}

export function disposeMeshyCarrier(instance) {
  const state = instances.get(instance);
  if (!state || state.disposed) return;
  state.disposed = true; state.owner.delete(instance);
  instance.mixer.stopAllAction(); instance.mixer.uncacheRoot(instance.body);
  const skeletons = new Set(); instance.body.traverse(object => {if (object.isSkinnedMesh) skeletons.add(object.skeleton);});
  for (const skeleton of skeletons) skeleton.dispose();
  instance.root.removeFromParent(); instance.root.clear();
}

const cache = createMeshyCarrierCache();
export const loadMeshyCarriers = kinds => cache.preload(kinds);
export const meshyCarriersStatus = () => cache.status();
export const instantiateMeshyCarrier = (kind, options) => cache.instantiate(kind, options);
