import assert from 'node:assert/strict';

// Preserve the completed Meshy startup exactly. This permits only the new
// ground import and parallel awaiting of the two existing/new asset families.
export function stripOnlyGroundBootPreload(bytes) {
  const source=bytes.toString('utf8');
  const importLine="import {loadGroundPatch} from './ground-patch.js';\n";
  const boot="try{await Promise.all([loadMeshyPilot(),loadGroundPatch()]);scene=new GameScene($('world'),select);";
  const original="try{await loadMeshyPilot();scene=new GameScene($('world'),select);";
  assert.equal(source.split(importLine).length-1,1,'Exactly one ground import line is allowed.');
  assert.equal(source.split(boot).length-1,1,'Ground preload must immediately precede the original GameScene startup.');
  assert.equal(source.split('loadGroundPatch').length-1,2,'No extra ground calls/references are allowed in protected main.js.');
  return Buffer.from(source.replace(importLine,'').replace(boot,original));
}
