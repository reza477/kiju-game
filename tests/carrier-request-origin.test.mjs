import assert from 'node:assert/strict';
import test from 'node:test';
import {classifyCarrierRequest} from './carrier-request-origin.mjs';

test('offline observer recognizes same-origin network and embedded blob requests', () => {
  const base = 'http://127.0.0.1:64443';
  assert.equal(classifyCarrierRequest(base + '/src/main.js', base), 'same-origin-network');
  assert.equal(classifyCarrierRequest('blob:' + base + '/a4cc3443-f47c-4119-8287-d89cb6069f47', base), 'same-origin-blob');
  assert.equal(classifyCarrierRequest('https://example.test/model.glb', 'https://example.test/'), 'same-origin-network');
});

test('offline observer rejects external origins, deceptive prefixes and unknown URLs', () => {
  const base = 'http://127.0.0.1:64443';
  for (const url of [
    'http://127.0.0.1:64444/image.png', 'https://127.0.0.1:64443/image.png',
    'http://127.0.0.1:64443@external.test/image.png',
    'http://external.test/image.png', 'blob:http://external.test/image-id',
    'blob:http://127.0.0.1:64444/image-id', 'blob:null/image-id',
    'data:image/png;base64,AAAA', 'file:///image.png', 'not a URL'
  ]) assert.equal(classifyCarrierRequest(url, base), 'external', url);
});
