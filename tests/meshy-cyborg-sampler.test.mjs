import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {renderedTerrainHeight} from '../src/terrain.js';
import {samplerFixture, referenceSole} from './helpers/cyborg-sampler-fixture.mjs';

test('cached double palette preserves every terrain sample and complete boot minimum through actual clip poses', async () => {
  const f = await samplerFixture();
  try {
    for (let pose = 0; pose < 8; pose++) {
      f.pose(pose);
      for (const foot of f.feet) for (const indices of [foot.indices, foot.fullIndices]) {
        const before = [], after = [], dx = pose % 2 ? .23 : 0, dz = pose % 3 ? -.17 : 0;
        const observedHeight = output => (x, z) => {output.push(x, z); return renderedTerrainHeight(x, z);};
        const expected = referenceSole(f.mesh, indices, observedHeight(before), dx, dz);
        const actual = f.sample(f.mesh, indices, observedHeight(after), dx, dz);
        assert.deepEqual(after, before, 'No terrain sample coordinate or iteration may change');
        assert.equal(actual, expected, 'Same ordered double-precision arithmetic must retain the exact gap');
        for (const index of indices.filter((_, i) => i % 101 === 0)) {
          assert.equal(f.sample(f.mesh, [index], () => 0), referenceSole(f.mesh, [index], () => 0), 'Sampled vertex world Y must remain exact');
        }
      }
    }
  } finally {f.dispose();}
});

test('palette refreshes after bone IK-like changes and nonuniform-parent world-Y support translation', async () => {
  const f = await samplerFixture();
  try {
    f.pose(3); const bone = f.mesh.skeleton.bones.find(bone => bone.name === 'mixamorigLeftLeg'); assert.ok(bone);
    for (const correction of [-1.2, .003, 1.2]) {
      f.sample(f.mesh, f.feet[0].fullIndices, renderedTerrainHeight);
      bone.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), .037));
      f.parent.updateMatrixWorld(true);
      const supported = f.fit.getWorldPosition(new T.Vector3()); supported.y += correction;
      f.fit.position.copy(f.fit.parent.worldToLocal(supported)); f.parent.updateMatrixWorld(true);
      const matrices = f.mesh.skeleton.bones.flatMap(bone => bone.matrixWorld.elements), inverse = f.mesh.skeleton.boneInverses.flatMap(matrix => matrix.elements);
      for (const foot of f.feet) assert.equal(f.sample(f.mesh, foot.fullIndices, renderedTerrainHeight), referenceSole(f.mesh, foot.fullIndices, renderedTerrainHeight));
      assert.deepEqual(f.mesh.skeleton.bones.flatMap(bone => bone.matrixWorld.elements), matrices);
      assert.deepEqual(f.mesh.skeleton.boneInverses.flatMap(matrix => matrix.elements), inverse);
    }
  } finally {f.dispose();}
});

test('sampler reuses one double matrix per bone per call instead of recomputing products per weighted vertex', async () => {
  const f = await samplerFixture(), original = T.Matrix4.prototype.multiplyMatrices; let count = 0;
  try {
    f.pose(4); const indices = f.feet[0].fullIndices;
    T.Matrix4.prototype.multiplyMatrices = function (...args) {count++; return original.apply(this, args);};
    const expected = referenceSole(f.mesh, indices, renderedTerrainHeight), referenceProducts = count; count = 0;
    const actual = f.sample(f.mesh, indices, renderedTerrainHeight), paletteProducts = count;
    assert.equal(actual, expected); assert.equal(paletteProducts, f.mesh.skeleton.bones.length);
    assert.ok(referenceProducts > paletteProducts * 100, 'Use the actual dense boot, not a trivial surrogate');
  } finally {T.Matrix4.prototype.multiplyMatrices = original; f.dispose();}
});
