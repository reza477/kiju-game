import test from 'node:test';
import assert from 'node:assert/strict';
import {stripOnlyMeshyBootPreload} from './helpers/meshy-release-main.mjs';

const baseline="import {GameScene} from './scene.js';\nconst save=()=>preserveProgress();\ntry{scene=new GameScene($('world'),select);existingStartup();}\n";
const candidate=baseline.replace('const save=',"import {loadMeshyPilot} from './meshy-pilot.js';\nconst save=").replace('try{scene=', 'try{await loadMeshyPilot();scene=');
test('protected main allowance removes exactly the two approved boot additions',()=>{
  assert.deepEqual(stripOnlyMeshyBootPreload(Buffer.from(candidate)),Buffer.from(baseline));
});
test('save logic changes remain observable after the narrow boot allowance',()=>{
  assert.notDeepEqual(stripOnlyMeshyBootPreload(Buffer.from(candidate.replace('preserveProgress()','changeProgress()'))),Buffer.from(baseline));
});
test('duplicate/moved calls and line ending changes do not pass the exact allowance',()=>{
  assert.throws(()=>stripOnlyMeshyBootPreload(Buffer.from(candidate+'loadMeshyPilot();')));
  assert.throws(()=>stripOnlyMeshyBootPreload(Buffer.from(candidate.replace('try{await loadMeshyPilot();','await loadMeshyPilot();try{'))));
  assert.throws(()=>stripOnlyMeshyBootPreload(Buffer.from(candidate.replaceAll('\n','\r\n'))));
});
