// Bounded CPU-kernel timing only. Never interpreted as native game FPS.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {samplerFixture, referenceSole, sha256} from './helpers/cyborg-sampler-fixture.mjs';
import {renderedTerrainHeight} from '../src/terrain.js';

const out = path.resolve(process.env.OUTPUT_DIR || 'artifacts/rig-ground-refresh/sampler-attempt-03');
await fs.mkdir(out, {recursive: true}); assert.equal((await fs.readdir(out)).length, 0, 'Use a fresh evidence directory');
const referenceFile = 'artifacts/rig-ground-refresh/diagnosis/attempt2-cyborg-before-palette.js';
const prior = (await fs.readFile(referenceFile, 'utf8')).replaceAll('\r\n', '\n');
const priorFunction = prior.match(/function sampleSole\([^]*?\n  return gap;\n\}/)?.[0];
assert.equal(referenceSole.toString().replace('referenceSole', 'sampleSole'), priorFunction, 'Timed reference must be the exact preserved R2 sampler');
const report = {protocol: 'rig-ground-cpu-sampler-v1', startedAt: new Date().toISOString(), command: {executable: process.execPath, args: process.argv.slice(1), cwd: process.cwd()},
  commit: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), machine: {node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model},
  method: 'Six paired alternating-order trials after two warmup pairs; 12 equivalent support-loop repetitions per timed arm. Actual source skin, identical frozen pose in each pair, five sparse plus three complete scans per foot, same terrain queries. Only sampler calls are timed; pose changes and evidence collection are outside each interval.',
  reference: {file: referenceFile, sourceSha256: sha256(prior), functionSha256: sha256(priorFunction)}, trials: [], passed: false,
  limitations: ['CPU skin/terrain kernel only; no renderer, GPU, native clock, physics or real player session. These milliseconds are not frame times or FPS.', 'Timed repetitions reuse a pose; production IK changes it between sampler calls. The palette is still refreshed on every sampler call in both paths.', 'Warm JIT/terrain/cache and alternating sequential measurements do not model first-use costs, physical Apple devices, thermals or concurrent gameplay.']};
let fixture;
const median = values => {const sorted = values.slice().sort((a, b) => a - b); return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2;};
try {
  fixture = await samplerFixture(); report.fixture = fixture.metadata;
  const schedule = fixture.feet.flatMap(foot => [...Array(5).fill(foot.indices), ...Array(3).fill(foot.fullIndices)]);
  report.workPerEquivalentLoop = {samplerCalls: schedule.length, sampledVertices: schedule.reduce((sum, indices) => sum + indices.length, 0), paletteBoneProducts: schedule.length * fixture.mesh.skeleton.bones.length};
  const run = (sample, repetitions) => {
    let checksum = 0; const start = process.hrtime.bigint();
    for (let i = 0; i < repetitions; i++) for (const indices of schedule) checksum += sample(fixture.mesh, indices, renderedTerrainHeight, .13, -.09);
    return {milliseconds: Number(process.hrtime.bigint() - start) / 1e6, checksum, repetitions};
  };
  for (let warm = 0; warm < 2; warm++) {fixture.pose(warm); const a = run(referenceSole, 2), b = run(fixture.sample, 2); assert.equal(a.checksum, b.checksum);}
  for (let trial = 0; trial < 6; trial++) {
    fixture.pose(trial + 2);
    const order = trial % 2 ? ['after', 'before'] : ['before', 'after'], row = {trial, pose: trial + 2, order};
    for (const mode of order) row[mode] = run(mode === 'before' ? referenceSole : fixture.sample, 12);
    assert.equal(row.before.checksum, row.after.checksum, 'Timed workloads must return exactly equal sums');
    row.deltaPercent = (row.after.milliseconds / row.before.milliseconds - 1) * 100; report.trials.push(row);
  }
  const before = report.trials.map(row => row.before.milliseconds / row.before.repetitions), after = report.trials.map(row => row.after.milliseconds / row.after.repetitions);
  report.summary = {beforeMedianMillisecondsPerEquivalentLoop: median(before), afterMedianMillisecondsPerEquivalentLoop: median(after),
    medianDeltaPercent: (median(after) / median(before) - 1) * 100, beforeRange: [Math.min(...before), Math.max(...before)], afterRange: [Math.min(...after), Math.max(...after)]};
  report.passed = true; report.exitCode = 0;
} catch (error) {report.failure = error.stack; report.exitCode = 1; process.exitCode = 1;}
finally {
  fixture?.dispose(); report.finishedAt = new Date().toISOString(); report.sourceFinishSha256 = sha256(await fs.readFile('src/meshy-cyborg.js'));
  report.sourceStable = report.fixture?.sourceSha256 === report.sourceFinishSha256;
  if (!report.sourceStable) {report.passed = false; report.exitCode = 1; process.exitCode = 1;}
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
}
console.log(JSON.stringify({passed: report.passed, sourceStable: report.sourceStable, summary: report.summary, failure: report.failure, report: path.join(out, 'report.json')}, null, 2));
