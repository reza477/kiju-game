import test from 'node:test';
import assert from 'node:assert/strict';
import {stripOnlyGroundBootPreload} from './helpers/ground-release-main.mjs';

const baseline="import {loadMeshyPilot} from './meshy-pilot.js';\nconst save=()=>preserveProgress();\ntry{await loadMeshyPilot();scene=new GameScene($('world'),select);existingStartup();}\n";
const candidate=baseline.replace('const save=',"import {loadGroundPatch} from './ground-patch.js';\nconst save=").replace('try{await loadMeshyPilot();','try{await Promise.all([loadMeshyPilot(),loadGroundPatch()]);');
test('ground boot exception retains the prior Meshy preload and all other bytes',()=>assert.deepEqual(stripOnlyGroundBootPreload(Buffer.from(candidate)),Buffer.from(baseline)));
test('ground boot exception leaves a changed save handler detectably different',()=>assert.notDeepEqual(stripOnlyGroundBootPreload(Buffer.from(candidate.replace('preserveProgress()','changeProgress()'))),Buffer.from(baseline)));
test('extra calls, misplaced startup, and line ending edits fail the narrow ground exception',()=>{
  assert.throws(()=>stripOnlyGroundBootPreload(Buffer.from(candidate+'loadGroundPatch();')));
  assert.throws(()=>stripOnlyGroundBootPreload(Buffer.from(candidate.replace('try{await Promise.all([loadMeshyPilot(),loadGroundPatch()]);','await Promise.all([loadMeshyPilot(),loadGroundPatch()]);try{'))));
  assert.throws(()=>stripOnlyGroundBootPreload(Buffer.from(candidate.replaceAll('\n','\r\n'))));
});
