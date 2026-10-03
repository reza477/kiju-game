import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as T from '../vendor/three.module.js';
import { branchSprayGeometry, grassTuftGeometry, fernGeometry } from '../src/environment-geometry.js';
import { createVegetationMaterial } from '../src/vegetation-materials.js';

const cases = [
  ['broadleaf near', () => branchSprayGeometry(), 208],
  ['broadleaf distant', () => branchSprayGeometry(false, true), 152],
  ['pine near', () => branchSprayGeometry(true), 848],
  ['pine distant', () => branchSprayGeometry(true, true), 572],
  ['grass', grassTuftGeometry, 30],
  ['fern', fernGeometry, 240]
];

// Painterly Phase 1 explicitly replaces crown/grass topology and old spray
// envelopes. Keep the still-unmodified fern envelope, finite geometry, honest
// scale and deterministic authoring checks. Functional world/tree roots and
// destruction membership remain strict in environment-polish-identity.mjs.
// Final round reallocates detail into four broadleaf masses / one branched pine
// instead of repeated lobes. Whole-tree near cost is below the preserved build;
// far broadleaf cost is higher and remains subject to whole-scene measurements.
const envelopes = {
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
    const minimumWidth=name==='grass'?.4:.8;
    assert.ok(size.x > minimumWidth && size.z > minimumWidth && size.y > (name === 'fern' ? .35 : .7), `${name} collapses to a flat silhouette`);
    assert.ok(size.x < 3 && size.y < 2.2 && size.z < 3, `${name} exceeds conservative unit-asset scale`);
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
    assert.equal(hashArrays(['position','normal','uv','color'].map(key=>second.attributes[key].array).concat([second.index.array])),hashArrays(['position','normal','uv','color'].map(key=>geometry.attributes[key].array).concat([geometry.index.array])), `${name} must reproduce all exported attributes exactly`);
    geometry.dispose(); second.dispose();
  }
});

test('near and distant sculpted crowns keep the same physical profile and lower distant tessellation', () => {
  for(const pine of [false,true]){
    const near=branchSprayGeometry(pine,false),far=branchSprayGeometry(pine,true);
    near.computeBoundingBox();far.computeBoundingBox();
    assert.ok(far.index.count<near.index.count);
    for(const edge of ['min','max'])for(const axis of ['x','y','z'])assert.ok(Math.abs(near.boundingBox[edge][axis]-far.boundingBox[edge][axis])<.18,`Crown profile changes at distance: ${pine?'pine':'broadleaf'} ${edge}.${axis}`);
    near.dispose();far.dispose();
  }
});

test('sculpted silhouettes do not retain obsolete alpha-card texture dependencies', () => {
  for(const kind of ['broadleaf','pine','grass']){
    const material=createVegetationMaterial(kind);
    assert.equal(material.map,null);assert.equal(material.alphaMap,null);assert.equal(material.alphaTest,0);
    assert.equal(material.opacity,1);assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);
    assert.equal(material.userData.vegetationKind,kind);
    material.dispose();
  }
});

test('vegetation material remains opaque, matte, instanced and independently configurable', () => {
  for (const kind of ['broadleaf', 'pine', 'grass']) {
    const first = createVegetationMaterial(kind), second = createVegetationMaterial(kind);
    assert.ok(first.isMeshStandardMaterial);
    assert.equal(first.vertexColors, true); assert.equal(first.side, kind==='grass'?T.DoubleSide:T.FrontSide);
    assert.equal(first.transparent, false); assert.equal(first.depthWrite, true);
    assert.equal(first.alphaTest,0);
    assert.ok(first.roughness >= .9); assert.equal(first.metalness, 0);
    assert.equal(first.map,null);assert.equal(second.map,null);
    assert.notEqual(first, second, 'Wind setup can configure its own material');
    first.dispose(); second.dispose();
  }
  assert.throws(() => createVegetationMaterial('unknown'), RangeError);
});
