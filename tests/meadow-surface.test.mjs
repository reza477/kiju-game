import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import { createMeadowSurface } from '../src/meadow-surface.js';

test('meadow surface supplies a local packed tile with useful coverage and bounded normals', () => {
  const texture = createMeadowSurface(), { width, height, data } = texture.image;
  assert.ok(texture.isDataTexture);
  assert.equal(width, 512); assert.equal(height, 512);
  assert.ok(data instanceof Uint8Array); assert.equal(data.length, width * height * 4);
  assert.equal(texture.colorSpace, T.NoColorSpace);
  assert.equal(texture.wrapS, T.RepeatWrapping); assert.equal(texture.wrapT, T.RepeatWrapping);
  assert.equal(texture.minFilter, T.LinearMipmapLinearFilter); assert.equal(texture.generateMipmaps, true);
  assert.equal(texture.userData.tileMetres, 9);
  assert.equal(createMeadowSurface(), texture, 'Reuse the original asset across landscape batches');
  const stats = Array.from({ length: 4 }, () => ({ low: 255, high: 0, sum: 0 }));
  let soil = 0, turf = 0, transition = 0;
  for (let index = 0; index < data.length; index += 4) {
    for (let channel = 0; channel < 4; channel++) {
      const value = data[index + channel], s = stats[channel];
      assert.ok(Number.isFinite(value)); s.low = Math.min(s.low, value); s.high = Math.max(s.high, value); s.sum += value;
    }
    soil += data[index] < 64; turf += data[index] > 191;
    transition += data[index] >= 64 && data[index] <= 191;
  }
  const pixels = width * height;
  assert.ok(soil / pixels > .10 && turf / pixels > .10 && transition / pixels > .20, 'Tile must contain turf, soil and ragged intermediate cover');
  assert.ok(stats[1].high - stats[1].low > 90, 'Blades/litter must produce readable albedo detail');
  for (const s of stats.slice(2)) {
    assert.ok(Math.abs(s.sum / pixels - 127.5) < .25, 'Normals must have no directional tilt bias');
    assert.ok(s.low >= 57 && s.high <= 198 && s.high - s.low > 35, 'Micro-normal slopes must be useful and bounded');
  }
});

test('all packed channels wrap without an artificial boundary discontinuity', () => {
  const { data, width, height } = createMeadowSurface().image;
  for (let channel = 0; channel < 4; channel++) {
    let edgeX = 0, edgeY = 0, interiorX = 0, interiorY = 0;
    const at = (x, y) => data[(y * width + x) * 4 + channel];
    for (let y = 0; y < height; y++) {
      edgeX += Math.abs(at(0, y) - at(width - 1, y));
      for (let x = 0; x < width - 1; x++) interiorX += Math.abs(at(x + 1, y) - at(x, y));
    }
    for (let x = 0; x < width; x++) {
      edgeY += Math.abs(at(x, 0) - at(x, height - 1));
      for (let y = 0; y < height - 1; y++) interiorY += Math.abs(at(x, y + 1) - at(x, y));
    }
    // Adjacent samples across the repeat seam should behave like interior
    // neighbours; first/last texels need not be identical pixel-centre samples.
    assert.ok(edgeX / height < interiorX / (height * (width - 1)) * 1.5);
    assert.ok(edgeY / width < interiorY / (width * (height - 1)) * 1.5);
  }
});

test('independent CPU generation reproduces every packed texel exactly', async () => {
  const independent = await import('../src/meadow-surface.js?independent-cpu-test');
  assert.deepEqual(independent.createMeadowSurface().image.data, createMeadowSurface().image.data);
});
