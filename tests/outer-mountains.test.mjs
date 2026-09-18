import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  RESOURCE_CENTRES, TERRAIN_SEGMENTS, terrainGridCoordinate,
  scenerySelectionHeight, terrainHeight, terrainNormal, outerMountainDelta,
  renderedTerrainHeight
} from '../src/terrain.js';

const hash = values => createHash('sha256').update(new Float64Array(values)).digest('hex');

test('outer mountains preserve historical scenery selection and all inner terrain', () => {
  // Reference surfaces sampled from checkpoint aef1f02 before this landform
  // change. Exact selection values protect deterministic accept/reject draws.
  const selection = [], inner = [];
  for (let z = -600; z <= 600; z += 13) for (let x = -600; x <= 600; x += 13) selection.push(scenerySelectionHeight(x, z));
  assert.equal(hash(selection), 'c0cb9cf2a07e8303b4014fa6eb42e954c33ff01eb3f84cc23acc796fc9288b37');
  for (let z = -178; z <= 178; z += 7) for (let x = -178; x <= 178; x += 7) {
    assert.equal(outerMountainDelta(x, z), 0);
    inner.push(terrainHeight(x, z));
  }
  assert.equal(hash(inner), 'f2af63af8d429ccd5bb0a98bca73b4d30b2f7c6c4f957de3ba98a199311b3c27');
  for (const [cx, cz] of RESOURCE_CENTRES) for (let radius = 0; radius <= 40; radius += 4) for (let angle = 0; angle < Math.PI * 2; angle += .17) {
    const x = cx + Math.cos(angle) * radius, z = cz + Math.sin(angle) * radius;
    assert.equal(outerMountainDelta(x, z), 0);
    assert.equal(terrainHeight(x, z), scenerySelectionHeight(x, z));
  }
});

test('outer ridge elevations and slopes remain finite and blend continuously', () => {
  let altered = 0, maxSlope = 0, summit = 0;
  for (let z = -390; z <= 390; z += 6) for (let x = -390; x <= 390; x += 6) {
    if (Math.max(Math.abs(x), Math.abs(z)) <= 190) continue;
    const height = terrainHeight(x, z), normal = terrainNormal(x, z), delta = outerMountainDelta(x, z);
    assert.ok(Number.isFinite(height) && Number.isFinite(delta));
    assert.ok(height >= -1.50001 && height < 145);
    assert.ok(Math.abs(Math.hypot(normal.x, normal.y, normal.z) - 1) < 1e-12);
    maxSlope = Math.max(maxSlope, Math.hypot(normal.x, normal.z) / normal.y);
    summit = Math.max(summit, height);
    altered += Math.abs(delta) > 1;
  }
  assert.ok(maxSlope < 5.3, 'Outer slopes must avoid near-vertical ramp discontinuities');
  assert.ok(summit > 100 && altered > 10000, 'Ridge revision must materially change the outer silhouette');
  for (let along = -189; along <= 189; along += 7) for (const [x, z] of [[190, along], [-190, along], [along, 190], [along, -190]]) {
    assert.equal(outerMountainDelta(x, z), 0);
    const beyondX = Math.abs(x) === 190 ? x + Math.sign(x) * .001 : x;
    const beyondZ = Math.abs(z) === 190 ? z + Math.sign(z) * .001 : z;
    assert.ok(Math.abs(outerMountainDelta(beyondX, beyondZ)) < 1e-6, 'New relief must ease into the unchanged surface');
  }
});

test('outer ridges use the unchanged terrain grid and its exact rendered vertex heights', () => {
  assert.equal(TERRAIN_SEGMENTS, 400);
  for (let z = 0; z <= TERRAIN_SEGMENTS; z += 11) for (let x = 0; x <= TERRAIN_SEGMENTS; x += 13) {
    const px = terrainGridCoordinate(x), pz = terrainGridCoordinate(z);
    assert.equal(renderedTerrainHeight(px, pz), Math.fround(terrainHeight(px, pz)));
  }
});
