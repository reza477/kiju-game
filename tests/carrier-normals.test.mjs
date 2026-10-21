import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {softenCarrierNormals} from '../src/carrier-normals.js';

test('organic seam normals join while topology, UVs, skin weights and positions stay exact', () => {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([0,0,0, 0,0,0, 1,1,0], 3));
  g.setAttribute('normal', new T.Float32BufferAttribute([1,0,0, 0,1,0, 0,0,1], 3));
  g.setAttribute('uv', new T.Float32BufferAttribute([0,0, 1,1, 0,1], 2));
  g.setAttribute('skinIndex', new T.Uint16BufferAttribute([0,0,0,0, 0,0,0,0, 1,0,0,0], 4));
  g.setAttribute('skinWeight', new T.Float32BufferAttribute([1,0,0,0, 1,0,0,0, 1,0,0,0], 4));
  g.setIndex([0,1,2]);
  const original = {...g.attributes}, index = g.index;
  assert.equal(softenCarrierNormals(g), 2);
  for (const key of ['position','uv','skinIndex','skinWeight']) assert.equal(g.attributes[key], original[key]);
  assert.equal(g.index, index);
  for (const i of [0,1]) {
    assert.ok(Math.abs(g.attributes.normal.getX(i) - Math.SQRT1_2) < 1e-6);
    assert.ok(Math.abs(g.attributes.normal.getY(i) - Math.SQRT1_2) < 1e-6);
  }
  assert.equal(g.attributes.normal.getZ(2), 1);
});

test('mechanical creases and differently skinned coincident surfaces remain separate', () => {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([0,0,0, 0,0,0], 3));
  g.setAttribute('normal', new T.Float32BufferAttribute([1,0,0, 0,1,0], 3));
  assert.equal(softenCarrierNormals(g, 38), 0);
  g.setAttribute('skinIndex', new T.Uint16BufferAttribute([0,0,0,0, 1,0,0,0], 4));
  g.setAttribute('skinWeight', new T.Float32BufferAttribute([1,0,0,0, 1,0,0,0], 4));
  assert.equal(softenCarrierNormals(g), 0);
  assert.deepEqual([...g.attributes.normal.array], [1,0,0,0,1,0]);
});
