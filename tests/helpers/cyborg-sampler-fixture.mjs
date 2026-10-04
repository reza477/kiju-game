import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function referenceSole(mesh, indices, height = () => 0, dx = 0, dz = 0) {
  const p = new T.Vector3(); let gap = Infinity;
  for (const index of indices) {mesh.getVertexPosition(index, p); p.applyMatrix4(mesh.matrixWorld); gap = Math.min(gap, p.y - height(p.x + dx, p.z + dz));}
  return gap;
}

// Observation-only exports exist in this in-memory test module, never on disk
// or on the gameplay page. Resolve its three unchanged imports explicitly.
export async function samplerFixture() {
  const sourceUrl = new URL('../../src/meshy-cyborg.js', import.meta.url), original = await readFile(sourceUrl, 'utf8');
  assert.equal((original.match(/function sampleSole\(/g) || []).length, 1);
  assert.equal((original.match(/function soleIndices\(/g) || []).length, 1);
  assert.ok(!original.includes('__samplerFixture'));
  const imports = [];
  let transformed = original.replace(/from '([^']+)'/g, (statement, relative) => {
    assert.ok(relative.startsWith('.'), 'Only the existing local imports are permitted');
    const resolved = new URL(relative, sourceUrl).href; imports.push({relative, resolved});
    return 'from ' + JSON.stringify(resolved);
  });
  assert.deepEqual(imports.map(row => row.relative), ['../vendor/three.module.js', './meshy-carriers.js', './terrain.js']);
  const append = '\nexport {sampleSole as __samplerFixture, soleIndices as __soleFixture};\n';
  transformed += append;
  const module = await import('data:text/javascript,' + encodeURIComponent(transformed));
  const file = new URL('../../assets/carriers/meshy/cyborg.glb', import.meta.url), bytes = await readFile(file), jsonLength = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  assert.ok([...(document.buffers || []), ...(document.images || [])].every(value => value.uri === undefined), 'Fixture requires the actual fully embedded local GLB');
  const saved = {self: globalThis.self, createImageBitmap: globalThis.createImageBitmap};
  let gltf;
  try {
    globalThis.self = globalThis;
    // CPU parsing retains exact GLB bytes and rig data. Pixel decoding is not
    // claimed: only embedded PNG dimensions are supplied to the loader.
    globalThis.createImageBitmap = async blob => {
      const image = Buffer.from(await blob.arrayBuffer());
      assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      return {width: image.readUInt32BE(16), height: image.readUInt32BE(20), close() {}};
    };
    gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  } finally {
    for (const [key, value] of Object.entries(saved)) {if (value === undefined) delete globalThis[key]; else globalThis[key] = value;}
  }
  const meshes = []; gltf.scene.traverse(object => {if (object.isSkinnedMesh) meshes.push(object);});
  assert.equal(meshes.length, 1); const mesh = meshes[0];
  const parent = new T.Group(), fit = new T.Group(); parent.add(fit); fit.add(gltf.scene); fit.scale.set(24, 32, 22);
  parent.scale.setScalar(.55); parent.updateMatrixWorld(true);
  const feet = ['Left', 'Right'].map(side => ({side, ...module.__soleFixture(mesh, side)}));
  const clip = gltf.animations.find(clip => clip.name === 'Casual_Walk'); assert.ok(clip);
  const mixer = new T.AnimationMixer(gltf.scene); mixer.clipAction(clip).play();
  const metadata = {sourceFile: 'src/meshy-cyborg.js', sourceSha256: sha256(original), transformedSha256: sha256(transformed), imports, append,
    assetFile: 'assets/carriers/meshy/cyborg.glb', assetBytes: bytes.length, assetSha256: sha256(bytes),
    feet: feet.map(foot => ({side: foot.side, full: foot.fullIndices.length, sparse: foot.indices.length})),
    referenceSha256: sha256(referenceSole.toString()), method: 'Actual unchanged GLB bytes, standard GLTFLoader skin/animation; embedded image dimensions only; no renderer, game clock or player storage.'};
  return {mesh, parent, fit, mixer, feet, clip, sample: module.__samplerFixture, metadata,
    pose(index) {
      mixer.setTime((index * .137 % 1) * clip.duration);
      parent.position.set(-40 + index * .31, 3 + index * .09, -5 + index * .27);
      parent.rotation.set(.04 * Math.sin(index), index * .37, -.03 * Math.cos(index));
      parent.scale.set(.55 + .03 * Math.sin(index), .49 + .02 * Math.cos(index), .61);
      parent.updateMatrixWorld(true);
    },
    dispose() {
      mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene);
      const resources = new Set(); gltf.scene.traverse(object => {
        if (object.geometry) resources.add(object.geometry); if (object.skeleton) resources.add(object.skeleton);
        for (const material of [object.material].flat().filter(Boolean)) {resources.add(material); for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);}
      });
      for (const resource of resources) resource.dispose(); parent.clear();
    }
  };
}
