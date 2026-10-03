// Reproducible original asset workshop, not a runtime loader. Runtime and these
// inspectable glTF 2.0 exports consume the SAME editable local mesh definitions.
// The pinned official loader is used only here to validate the exported bytes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { REVISION } from 'three';
import { branchSprayGeometry, grassTuftGeometry, fracturedRockGeometry } from '../src/environment-geometry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'artifacts', 'painterly-assets');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = ['src/painterly-vegetation.js', 'src/environment-geometry.js', 'src/vegetation-materials.js', 'scripts/export-painterly-asset-kit.mjs'];
await fs.mkdir(output, { recursive: true });

function encodeGlb(geometry, name, doubleSided = false) {
  const document = {
    asset: { version: '2.0', generator: 'Colossus Wake local painterly workshop v1' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name, mesh: 0 }],
    meshes: [], materials: [{ name: 'Matte vertex-colour authoring material',
      pbrMetallicRoughness: { baseColorFactor: [1,1,1,1], metallicFactor: 0, roughnessFactor: .97 }, doubleSided }],
    accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }]
  };
  const chunks = [], attributes = {}, primitive = { attributes, material: 0, mode: 4 };
  let length = 0;
  function append(attribute, target, semantic) {
    const bytes = Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength);
    const padding = (4 - length % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); length += padding; }
    const view = document.bufferViews.length;
    document.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, target });
    chunks.push(bytes); length += bytes.length;
    const accessor = { bufferView: view, componentType: attribute.array instanceof Float32Array ? 5126 : attribute.array instanceof Uint16Array ? 5123 : 5125,
      count: attribute.count, type: ['SCALAR', 'VEC2', 'VEC3', 'VEC4'][attribute.itemSize - 1] };
    if (semantic === 'POSITION') {
      geometry.computeBoundingBox(); accessor.min = geometry.boundingBox.min.toArray(); accessor.max = geometry.boundingBox.max.toArray();
    }
    document.accessors.push(accessor); return document.accessors.length - 1;
  }
  for (const [attribute, semantic] of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0'],['color','COLOR_0']])
    if (geometry.attributes[attribute]) attributes[semantic] = append(geometry.attributes[attribute], 34962, semantic);
  if (geometry.index) primitive.indices = append(geometry.index, 34963);
  document.meshes.push({ name, primitives: [primitive] });
  const tail = (4 - length % 4) % 4; if (tail) { chunks.push(Buffer.alloc(tail)); length += tail; }
  document.buffers[0].byteLength = length;
  const json = Buffer.from(JSON.stringify(document)), jsonLength = Math.ceil(json.length / 4) * 4;
  const result = Buffer.alloc(12 + 8 + jsonLength + 8 + length, 0x20);
  result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(jsonLength, 12); result.writeUInt32LE(0x4e4f534a, 16); json.copy(result, 20);
  result.writeUInt32LE(length, 20 + jsonLength); result.writeUInt32LE(0x004e4942, 24 + jsonLength);
  Buffer.concat(chunks).copy(result, 28 + jsonLength);
  return result;
}

async function exportAndValidate(name, create, doubleSided = false) {
  const geometry = create(), bytes = encodeGlb(geometry, name, doubleSided);
  const loaded = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const mesh = loaded.scene.children[0];
  if (loaded.cameras.length || !mesh?.isMesh || mesh.position.length() || mesh.scale.toArray().some(x => x !== 1))
    throw new Error(`${name}: unexpected scene transforms or cameras`);
  for (const [attribute, expected] of Object.entries(geometry.attributes)) {
    const actual = mesh.geometry.attributes[attribute];
    if (!actual || hash(Buffer.from(actual.array.buffer)) !== hash(Buffer.from(expected.array.buffer)))
      throw new Error(`${name}: ${attribute} changed in the glTF round trip`);
  }
  if (geometry.index && hash(Buffer.from(mesh.geometry.index.array.buffer)) !== hash(Buffer.from(geometry.index.array.buffer)))
    throw new Error(`${name}: indices changed in the glTF round trip`);
  if (mesh.material.roughness !== .97 || mesh.material.metalness !== 0 || mesh.material.transparent)
    throw new Error(`${name}: unsupported material round trip`);
  geometry.computeBoundingBox();
  const relative = `artifacts/painterly-assets/${name}.glb`;
  await fs.writeFile(path.join(root, relative), bytes);
  const record = { name, path: relative, bytes: bytes.length, sha256: hash(bytes),
    triangles: (geometry.index?.count ?? geometry.attributes.position.count) / 3,
    bounds: { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() },
    validated: ['glTF2 official pinned loader', 'exact positions normals UVs vertex colours indices', 'metres +Y up identity transforms', 'no cameras lights textures or external requests', 'opaque matte material'] };
  geometry.dispose(); mesh.geometry.dispose(); mesh.material.dispose();
  return record;
}

// Stop immediately on representative export failure before building the kit.
const representative = await exportAndValidate('pine-near', () => branchSprayGeometry(true));
console.log(`Representative validated: ${representative.name}, ${representative.triangles} triangles, ${representative.bytes} bytes.`);
const assets = [representative];
for (const [name, create, doubleSided] of [
  ['pine-distant', () => branchSprayGeometry(true,true)], ['broadleaf-near', () => branchSprayGeometry()],
  ['broadleaf-distant', () => branchSprayGeometry(false,true)], ['meadow-blades', grassTuftGeometry, true], ['bedded-river-stone', fracturedRockGeometry]
]) assets.push(await exportAndValidate(name, create, doubleSided));
const sources = await Promise.all(sourcePaths.map(async source => {
  const bytes = await fs.readFile(path.join(root, source)); return { path: source, bytes: bytes.length, sha256: hash(bytes) };
}));
const inventory = { generatedAt: new Date().toISOString(), tool: { node: process.version, three: `0.${REVISION}.1`, source: 'package-lock.json pinned dependency' },
  authoring: 'Original deterministic local sculpted mesh definitions. No external assets or services. Project-owned source.',
  runtime: 'Synchronous direct BufferGeometry from the same source. GLB files are workshop outputs, not runtime downloads. No duplicate runtime Three module or new loader.',
  validationScope: 'Official glTF loader exact geometry/material round trip; in-game lighting, shadows and wind must be verified in the running game separately.',
  sources, assets };
await fs.writeFile(path.join(output, 'asset-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
console.log(JSON.stringify({ output, assets: assets.length, totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0), allValidated: true }));
