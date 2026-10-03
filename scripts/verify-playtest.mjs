import { readFile, writeFile } from 'node:fs/promises';
import { verifyRuntime, requireValue } from './delivery-lib.mjs';
const record = JSON.parse(await readFile('artifacts/delivery/build.json', 'utf8'));
const verified = await verifyRuntime(record.runtime);
requireValue(record.buildId === verified.release.buildId && record.gitCommit === verified.release.gitCommit && record.artifactSha256 === verified.artifactSha256, 'Frozen artifact differs from tested build.');
await writeFile('artifacts/delivery/integrity.json', JSON.stringify({ ...record, files: verified.records.length, verified: true }, null, 2) + '\n');
console.log(`Verified ${verified.records.length} exact runtime files; ${record.buildId}`);
