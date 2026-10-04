import assert from 'node:assert/strict';

// No whitespace, line-ending or surrounding-code normalization is permitted.
// This exception allows precisely the imported asset preload at ordinary boot.
export function stripOnlyMeshyBootPreload(bytes) {
  const source=bytes.toString('utf8');
  const importLine="import {loadMeshyPilot} from './meshy-pilot.js';\n";
  const boot="try{await loadMeshyPilot();scene=new GameScene($('world'),select);";
  assert.equal(source.split(importLine).length-1,1,'Exactly one approved Meshy import line is required.');
  assert.equal(source.split(boot).length-1,1,'Meshy preload must immediately precede the existing GameScene boot.');
  assert.equal(source.split('loadMeshyPilot').length-1,2,'No additional pilot calls or references are permitted in protected main.js.');
  return Buffer.from(source.replace(importLine,'').replace(boot,"try{scene=new GameScene($('world'),select);"));
}
