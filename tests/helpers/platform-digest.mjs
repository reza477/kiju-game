import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Several preservation tests compare a SHA-256 of raw doubles with a digest
// recorded on an x64 PC. V8 compiles Math.sin, Math.exp and Math.pow from C++,
// and the arm64 build rounds a small share of results one unit in the last
// place differently. The terrain, scenery and weapon values then differ near
// the sixteenth significant digit, which changes a byte-exact digest without
// changing anything a player or a save file can observe.
//
// On x64 these tests keep their original exact digests. On arm64, the same
// values are rounded to six decimals (a micrometre at world scale) and
// compared with a digest recorded on Apple silicon. Structure, order,
// strings and integers remain exact in both. Other architectures have no
// record and fail with an explanation rather than passing unchecked.
// Node 22.22.3 and 24.22.1 produce identical arm64 digests.
export const EXACT_ARCHITECTURE = 'x64';
const sha = value => createHash('sha256').update(value).digest('hex');

export function roundedJSON(value, places = 6) {
  const scale = 10 ** places;
  return JSON.stringify(value, (key, item) => typeof item === 'number' && Number.isFinite(item) && !Number.isInteger(item)
    ? Math.round(item * scale) / scale : item);
}
export const roundedDigest = (value, places = 6) => sha(roundedJSON(value, places));

// `exact` is the digest this run produced the original way. `rounded` returns
// the value to round and digest; it is only evaluated off x64.
export function assertPlatformDigest({exact, expectedExact, rounded, expectedRounded, message = 'Recorded digest'}) {
  if (process.arch === EXACT_ARCHITECTURE) {assert.equal(exact, expectedExact, message); return;}
  const expected = expectedRounded?.[process.arch];
  assert.ok(expected, `${message}: no rounded digest is recorded for ${process.arch}. Record one in this test after confirming the exact digest on ${EXACT_ARCHITECTURE}.`);
  assert.equal(roundedDigest(rounded()), expected, `${message} (rounded to six decimals on ${process.arch})`);
}
