import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as T from '../vendor/three.module.js';
import { branchSprayGeometry, grassTuftGeometry, fernGeometry } from '../src/environment-geometry.js';
import { createVegetationMaterial } from '../src/vegetation-materials.js';

const cases = [
  ['broadleaf near', () => branchSprayGeometry(), 48],
  ['broadleaf distant', () => branchSprayGeometry(false, true), 24],
  ['pine near', () => branchSprayGeometry(true), 40],
  ['pine distant', () => branchSprayGeometry(true, true), 24],
  ['grass', grassTuftGeometry, 12],
  ['fern', fernGeometry, 240]
];

// Recorded directly from 56670b3dfd8ff25eec191a27d632108f61d77eb5. Asset
// refinement may change topology inside these envelopes, never its placement.
const envelopes = {
  'pine near': [[-1.384587287902832,-1.1098904609680176,-1.2291122674942017],[1.4107578992843628,1.0763062238693237,1.3691959381103516]],
  'pine distant': [[-1.154174566268921,-1.0405642986297607,-1.3508864641189575],[1.3268905878067017,1.0763062238693237,1.307288408279419]],
  grass: [[-0.5847644805908203,0,-0.5323136448860168],[0.5847644805908203,0.8877926468849182,0.5473169684410095]],
  fern: [[-0.7173429727554321,0.22654496133327484,-0.8659747242927551],[0.8583333492279053,0.6911794543266296,0.7572247385978699]]
};
const hashArrays = arrays => {
  const hash = createHash('sha256');
  for (const array of arrays) hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
  return hash.digest('hex');
};

test('vegetation keeps a finite three-dimensional silhouette within its triangle budget', () => {
  for (const [name, create, budget] of cases) {
    const geometry = create(), { position, normal, uv, color } = geometry.attributes;
    assert.ok(geometry.index.count / 3 <= budget, `${name} exceeds triangle budget`);
    for (const attribute of [position, normal, uv, color]) {
      assert.equal(attribute.count, position.count);
      assert.ok(attribute.array.every(Number.isFinite), `${name} has non-finite attributes`);
    }
    assert.ok(uv.array.every(value => value >= 0 && value <= 1));
    assert.ok(color.array.every(value => value >= 0 && value <= 1));
    for (let i = 0; i < normal.count; i++) assert.ok(Math.abs(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) - 1) < 1e-6);
    for (let i = 0; i < geometry.index.count; i += 3) {
      const vertices = [0, 1, 2].map(j => {
        const index = geometry.index.getX(i + j);
        assert.ok(index >= 0 && index < position.count);
        return new T.Vector3().fromBufferAttribute(position, index);
      });
      const cross = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
      assert.ok(cross.length() > 1e-5, `${name} contains a degenerate triangle`);
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const size = geometry.boundingBox.getSize(new T.Vector3());
    assert.ok(size.x > .8 && size.z > .8 && size.y > (name === 'fern' ? .35 : .7), `${name} collapses to a flat silhouette`);
    assert.ok(size.x < 3 && size.y < 2.2 && size.z < 3, `${name} escapes established crown bounds`);
    if (envelopes[name]) {
      const [min, max] = envelopes[name], actualMin = geometry.boundingBox.min.toArray(), actualMax = geometry.boundingBox.max.toArray();
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(actualMin[axis] >= min[axis] - 1e-6 && actualMax[axis] <= max[axis] + 1e-6, `${name} escapes its baseline envelope on axis ${axis}`);
      }
    }
    if (name === 'grass') {
      assert.equal(geometry.boundingBox.min.y, 0);
      assert.ok(geometry.boundingBox.max.y < 1);
    }
    const second = create();
    assert.deepEqual(second.attributes.position.array, position.array, `${name} must reproduce exactly`);
    geometry.dispose(); second.dispose();
  }
});

test('pine and ground-cover refinement leaves broadleaf geometry and artwork unchanged', () => {
  for (const [distant, expected] of [[false, '166df1389d97ebdae634109be04e4b4f9bc1ac70a481ae10ef104aa556c4b836'], [true, '64821d93592569f67563d4a1fcd8bdfedaaf34da8a6c3c5c34905ef8350c01f7']]) {
    const geometry = branchSprayGeometry(false, distant);
    assert.equal(hashArrays(['position', 'normal', 'uv', 'color'].map(name => geometry.attributes[name].array).concat([geometry.index.array])), expected);
    geometry.dispose();
  }
  const material = createVegetationMaterial('broadleaf');
  assert.equal(hashArrays(material.map.mipmaps.map(mip => mip.data)), 'd6b53d06546455f4000f0cdbb088fac9d4ac4bba578c2e8004754deb25dc237f');
  material.dispose();
});

test('local cutout textures retain silhouette coverage across useful mip levels', () => {
  for (const kind of ['broadleaf', 'pine', 'grass']) {
    const material = createVegetationMaterial(kind), map = material.map, { data, width, height } = map.image;
    assert.equal(width, 256); assert.equal(height, 256); assert.equal(data.length, width * height * 4);
    assert.equal(map.mipmaps.length, 9);
    let covered = 0, clear = 0;
    for (let i = 3; i < data.length; i += 4) {
      covered += data[i] / 255 >= material.alphaTest;
      clear += data[i] === 0;
      // Green foliage texels cannot wrap over 255 into magenta highlights.
      if (data[i] > 128) assert.ok(data[i - 2] >= data[i - 3] * .85 && data[i - 2] >= data[i - 1] * .85);
    }
    const coverage = covered / (width * height);
    assert.ok(coverage > .08 && coverage < .6, `${kind} is empty or a solid card`);
    assert.ok(clear / (width * height) > .3);
    // Empty perimeter prevents the rectangular support geometry from appearing.
    for (let i = 0; i < width; i++) {
      assert.equal(data[i * 4 + 3], 0);
      assert.equal(data[((height - 1) * width + i) * 4 + 3], 0);
      assert.equal(data[(i * width) * 4 + 3], 0);
      assert.equal(data[(i * width + width - 1) * 4 + 3], 0);
    }
    for (const mip of map.mipmaps.filter(mip => mip.width >= 8)) {
      let count = 0;
      for (let i = 3; i < mip.data.length; i += 4) count += mip.data[i] / 255 >= material.alphaTest;
      assert.ok(Math.abs(count / (mip.width * mip.height) - coverage) < .055, `${kind} loses its silhouette at mip ${mip.width}`);
    }
    material.dispose();
  }
});

test('vegetation material remains opaque, matte, instanced and independently configurable', () => {
  for (const kind of ['broadleaf', 'pine', 'grass']) {
    const first = createVegetationMaterial(kind), second = createVegetationMaterial(kind);
    assert.ok(first.isMeshStandardMaterial);
    assert.equal(first.vertexColors, true); assert.equal(first.side, T.DoubleSide);
    assert.equal(first.transparent, false); assert.equal(first.depthWrite, true);
    assert.ok(first.alphaTest > 0 && first.alphaTest < .5);
    assert.ok(first.roughness >= .9); assert.equal(first.metalness, 0);
    assert.ok(first.map.isDataTexture); assert.equal(first.map.colorSpace, T.SRGBColorSpace);
    assert.equal(first.map, second.map, 'Identical local texture is shared across clones/batches');
    assert.notEqual(first, second, 'Wind setup can configure its own material');
    first.dispose(); second.dispose();
  }
  assert.throws(() => createVegetationMaterial('unknown'), RangeError);
});
