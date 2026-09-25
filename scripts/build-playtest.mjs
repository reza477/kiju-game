import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildMobileRelease } from './build-mobile-release.mjs';
import { verifyRuntime, digest } from './delivery-lib.mjs';
const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceDirty = !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (process.env.GITHUB_SHA && (sourceDirty || process.env.GITHUB_SHA !== baseCommit)) throw new Error('CI must build a clean checkout of its exact Git commit.');
const gitCommit = sourceDirty ? 'local' : baseCommit;
const root = path.resolve('artifacts/delivery');
await mkdir(root, { recursive: true });
const result = await buildMobileRelease({ outputRoot: path.join(root, 'runtime'), writeSourceBuildInfo: false, gitCommit });
const verified = await verifyRuntime(result.output);
// A separate local test fixture changes only commit metadata. It is NEVER deployed.
const fixtureCommit = digest(`${gitCommit}:local-update-test-only`).slice(0, 40);
const next = await buildMobileRelease({ outputRoot: path.join(root, 'fixtures'), writeSourceBuildInfo: false, gitCommit: fixtureCommit });
const record = { gitCommit, baseCommit, sourceDirty, buildId: result.buildId, runtime: result.output, artifactSha256: verified.artifactSha256,
  fixture: { runtime: next.output, buildId: next.buildId, gitCommit: fixtureCommit, purpose: 'Local A-to-B update test only; synthetic commit, never published.' } };
await writeFile(path.join(root, 'build.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
