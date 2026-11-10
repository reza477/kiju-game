// Record a Node check against the actual checkout without generating source metadata.
// Source changes during the check invalidate the result, even when the child exits 0.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync, spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const [outputArg, ...args] = process.argv.slice(2);
assert.ok(outputArg && args.length, 'Usage: node scripts/record-development-check.mjs artifacts/NEW_OUTPUT_DIR NODE_ARGUMENTS...');
const output = path.resolve(root, outputArg);
const relative = path.relative(path.join(root, 'artifacts'), output);
assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Output must be strictly inside this checkout artifacts directory.');
assert.ok(!fs.existsSync(output), 'Preserve prior evidence; choose a new output directory.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...values) => execFileSync('git', values, {cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}).trim();
const runtimeRoots = ['src', 'assets', 'vendor', 'index.html', 'package.json', 'package-lock.json'];
const checkRoots = [...runtimeRoots, 'tests', 'scripts', 'server.mjs', 'pwa'];
function inventory(roots) {
  const names = [...new Set([
    ...git('ls-files', '--', ...roots).split('\n'),
    ...git('ls-files', '--others', '--exclude-standard', '--', ...roots).split('\n'),
  ])].filter(Boolean).sort();
  const hashes = {};
  for (const name of names) {
    const file = path.join(root, name);
    hashes[name] = fs.existsSync(file) ? sha(fs.readFileSync(file)) : 'DELETED';
  }
  return hashes;
}
function snapshot() {
  const hashes = inventory(runtimeRoots), inputs = inventory(checkRoots);
  return {commit: git('rev-parse', 'HEAD'), status: git('status', '--short'), hashes,
    fingerprint: sha(JSON.stringify(hashes)), inputs, inputFingerprint: sha(JSON.stringify(inputs))};
}
fs.mkdirSync(output, {recursive: true});
const reportPath = path.join(output, 'report.json'), log = path.join(output, 'output.txt');
const report = {startedAt: new Date().toISOString(), command: {executable: process.execPath, args, cwd: root},
  toolSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), passed: false};
const write = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
let descriptor;
try {
  report.sourceStart = snapshot();
  descriptor = fs.openSync(log, 'wx');
  write();
  const child = spawn(process.execPath, args, {cwd: root, stdio: ['ignore', descriptor, descriptor], windowsHide: true});
  const outcome = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({code, signal}));
  });
  fs.closeSync(descriptor); descriptor = undefined;
  report.processExitCode = outcome.code; report.signal = outcome.signal;
  report.sourceFinish = snapshot();
  report.changedInputs = [...new Set([...Object.keys(report.sourceStart.inputs), ...Object.keys(report.sourceFinish.inputs)])]
    .filter(name => report.sourceStart.inputs[name] !== report.sourceFinish.inputs[name]);
  assert.deepEqual(report.changedInputs, [], 'Source changed during the recorded check.');
  report.exitCode = outcome.code ?? 1;
  report.passed = outcome.code === 0;
} catch (error) {
  report.error = error.stack;
  report.exitCode = 1;
} finally {
  if (descriptor !== undefined) fs.closeSync(descriptor);
  report.finishedAt = new Date().toISOString();
  if (fs.existsSync(log)) report.output = {path: log, bytes: fs.statSync(log).size, sha256: sha(fs.readFileSync(log))};
  write();
}
console.log(JSON.stringify({report: reportPath, passed: report.passed, exitCode: report.exitCode,
  runtimeFingerprint: report.sourceStart?.fingerprint, changedInputs: report.changedInputs, error: report.error}));
if (!report.passed) process.exitCode = report.exitCode || 1;
