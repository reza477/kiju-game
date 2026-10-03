import { readFile } from 'node:fs/promises';
const readiness = JSON.parse(await readFile('delivery/readiness.json', 'utf8'));
if (process.env.PLAYTEST_EXERCISE_FAILURE === 'true') throw new Error('Intentional nonpublishing gate exercise: deployment must not execute.');
if (readiness.eligible !== true) throw new Error(`Release blocked: ${readiness.reason}`);
if (!readiness.evidence) throw new Error('Release readiness needs review evidence.');
await readFile(readiness.evidence);
console.log(`Release eligibility evidence: ${readiness.evidence}`);
