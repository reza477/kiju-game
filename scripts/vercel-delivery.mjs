import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { verifyRuntime, outputConfiguration, requireValue, safeOrigin, parseDeploymentOutput, assertStagedDeployment, assertProtection, assertNoPendingPromotion, assertCurrentRevision, PLAYTEST_BRANCH, REPOSITORY } from './delivery-lib.mjs';
import { hostedSmoke, hostedBrowserSmoke, privateFetch, assertDenied } from './hosted-smoke.mjs';

const env = process.env;
const token = requireValue(env.VERCEL_TOKEN, 'Configure the scoped VERCEL_TOKEN repository secret.');
const bypass = requireValue(env.VERCEL_PROTECTION_BYPASS, 'Configure the project automation bypass repository secret.');
const projectId = requireValue(env.VERCEL_PROJECT_ID, 'Configure VERCEL_PROJECT_ID.');
const orgId = requireValue(env.VERCEL_ORG_ID, 'Configure VERCEL_ORG_ID.');
const origin = safeOrigin(requireValue(env.PLAYTEST_ORIGIN, 'Configure the permanent PLAYTEST_ORIGIN.'));
const ghToken = requireValue(env.GITHUB_TOKEN, 'GitHub deployment-ledger access is required.');
requireValue(env.PLAYTEST_INCLUDED_USAGE_CONFIRMED === 'true', 'Included allowances and no paid overages must be confirmed before delivery.');
requireValue(env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_REF === `refs/heads/${PLAYTEST_BRANCH}`, 'Deployment is restricted to the designated private repository and playtest branch.');
await import('./check-release-readiness.mjs');
const record = JSON.parse(await readFile('artifacts/delivery/build.json', 'utf8'));
const verified = await verifyRuntime(record.runtime);
requireValue(record.artifactSha256 === verified.artifactSha256 && record.gitCommit === env.GITHUB_SHA, 'Deploy only exact tested bytes from this commit.');
const params = `?teamId=${encodeURIComponent(orgId)}`;
async function api(base, resource, auth, method = 'GET', body) {
  const response = await fetch(base + resource, { method, redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json', ...(base.includes('github') ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  // Never include response bodies: hosting settings may contain bypass secrets.
  requireValue(response.ok, `Provider API ${method} failed (${response.status}); no response body logged.`);
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}
const vercel = (resource, method, body) => api('https://api.vercel.com', resource, token, method, body);
const github = (resource, method, body) => api('https://api.github.com', `/repos/${REPOSITORY}${resource}`, ghToken, method, body);
async function getProject() {
  const { data } = await vercel(`/v9/projects/${projectId}${params}`);
  assertProtection(data, projectId, orgId); return data;
}
async function freshHead() { const { data } = await github(`/git/ref/heads/${PLAYTEST_BRANCH}`); assertCurrentRevision(data.object?.sha, record.gitCommit); }
const { data: repository } = await github('');
requireValue(repository.private === true, 'Repository must remain private.');
let project = await getProject(); assertNoPendingPromotion(project);
// Persisted GitHub deployment intents prevent an abandoned runner from hiding
// a remote promotion. No age cutoff, and no automatic clearing of ambiguity.
for (let page = 1; ; page++) {
  const { data: deployments } = await github(`/deployments?environment=private-playtest&task=colossus-promote&per_page=100&page=${page}`);
  for (const deployment of deployments) {
    const { data: statuses } = await github(`/deployments/${deployment.id}/statuses?per_page=1`);
    requireValue(statuses[0] && ['success','failure','error','inactive'].includes(statuses[0].state), 'A prior promotion intent is unresolved. Verify its remote outcome before another release.');
  }
  if (deployments.length < 100) break;
}
const domains = [];
let domainCursor;
do {
  const page = (await vercel(`/v9/projects/${projectId}/domains${params}${domainCursor ? `&until=${domainCursor}` : ''}`)).data;
  requireValue(Array.isArray(page.domains), 'Project domain inventory is unavailable.');
  domains.push(...page.domains); domainCursor = page.pagination?.next;
} while (domainCursor);
requireValue(domains?.some(domain => domain.name === new URL(origin).hostname && domain.verified), 'Permanent address is not a verified domain of this dedicated project.');
const protectedHosts = new Set(domains.map(domain => domain.name));
let aliasCursor;
do {
  const page = (await vercel(`/v4/aliases${params}&projectId=${encodeURIComponent(projectId)}${aliasCursor ? `&until=${aliasCursor}` : ''}`)).data;
  requireValue(Array.isArray(page.aliases), 'Project alias inventory is unavailable.');
  for (const alias of page.aliases) {
    requireValue(typeof alias.alias === 'string' && alias.alias.length > 0, 'Malformed hosting alias.');
    protectedHosts.add(alias.alias);
  }
  aliasCursor = page.pagination?.next;
} while (aliasCursor);
// Bootstrap must first place harmless protected content on this permanent URL.
// A setting alone is insufficient; public exceptions/redirects fail this check.
for (const hostname of protectedHosts) {
  const host = safeOrigin(`https://${hostname}`);
  for (const pathname of ['/', '/release.json', '/src/main.js']) await assertDenied(host, pathname);
}
const authorizedPermanent = await privateFetch(origin, '/', bypass);
requireValue(authorizedPermanent.status === 200 && authorizedPermanent.headers.get('content-type')?.includes('text/html'), 'Authorized permanent-origin placeholder/game access failed before upload.');
await freshHead();

async function outputRoot(name, runtime) {
  const directory = path.resolve('artifacts/delivery', name);
  await mkdir(path.join(directory, '.vercel/output/static'), { recursive: true });
  await writeFile(path.join(directory, '.vercel/project.json'), JSON.stringify({ projectId, orgId }));
  await writeFile(path.join(directory, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
  if (runtime) {
    await cp(runtime, path.join(directory, '.vercel/output/static'), { recursive: true, errorOnExist: true, force: false });
    await writeFile(path.join(directory, '.vercel/output/config.json'), JSON.stringify(outputConfiguration(verified.release)));
    const copied = await verifyRuntime(path.join(directory, '.vercel/output/static'));
    requireValue(copied.artifactSha256 === record.artifactSha256, 'Prebuilt output differs from tested runtime.');
  } else {
    await writeFile(path.join(directory, '.vercel/output/config.json'), JSON.stringify({ version: 3 }));
    await writeFile(path.join(directory, '.vercel/output/static/index.html'), '<!doctype html><title>Private access probe</title>Private access probe');
  }
  return directory;
}
async function stage(directory) {
  const cli = path.resolve('node_modules/vercel/dist/vc.js');
  const output = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'deploy', '--prebuilt', '--prod', '--skip-domain', '--yes', '--cwd', directory, '--scope', orgId], { env: { ...env, VERCEL_TOKEN: token }, stdio: ['ignore','pipe','pipe'] });
    let stdout = ''; child.stdout.on('data', bytes => { stdout += bytes; });
    child.stderr.on('data', () => {}); // No token-bearing diagnostics or traces.
    const timer = setTimeout(() => { child.kill(); reject(new Error('Staging timed out; permanent address was not moved.')); }, 8 * 60 * 1000);
    child.on('error', reject); child.on('exit', code => { clearTimeout(timer); code === 0 ? resolve(stdout) : reject(new Error(`Vercel staging exited ${code}; output withheld to protect credentials.`)); });
  });
  const parsed = parseDeploymentOutput(output);
  const deployment = (await vercel(`/v13/deployments/${new URL(parsed.url).hostname}${params}`)).data;
  return assertStagedDeployment(deployment, parsed, projectId);
}

// Empty probe first; not a playable asset and never assigned to the app origin.
const probe = await stage(await outputRoot(`probe-${env.GITHUB_RUN_ID || randomUUID()}`));
await assertDenied(probe.url, '/');
const authorizedProbe = await privateFetch(probe.url, '/', bypass);
requireValue(authorizedProbe.status === 200 && (await authorizedProbe.text()).includes('Private access probe'), 'Authorized empty probe failed.');
await getProject(); // Actual ALL setting is still required before game upload.
const staged = await stage(await outputRoot(`prebuilt-${env.GITHUB_RUN_ID || randomUUID()}`, record.runtime));
const stagedCheck = await hostedSmoke(staged.url, verified.release, bypass, { records: verified.records });
const browserCheck = await hostedBrowserSmoke(staged.url, bypass, record.buildId);
// Recheck inside this non-cancelling serialized workflow, immediately before intent.
project = await getProject(); assertNoPendingPromotion(project); await freshHead();
const { data: intent } = await github('/deployments', 'POST', { ref: record.gitCommit, auto_merge: false, required_contexts: [], task: 'colossus-promote', environment: 'private-playtest', transient_environment: false, production_environment: false,
  description: 'Serialized promotion intent; unresolved state blocks later releases.', payload: { projectId, targetDeploymentId: staged.id, buildId: record.buildId, artifactSha256: record.artifactSha256, origin, runId: env.GITHUB_RUN_ID, attemptId: randomUUID(), priorRequest: project.lastAliasRequest || null } });
const confirmIntent = (await github(`/deployments/${intent.id}`)).data;
requireValue(confirmIntent.payload?.targetDeploymentId === staged.id, 'Could not persist promotion intent.');
await github(`/deployments/${intent.id}/statuses`, 'POST', { state: 'in_progress', description: 'Remote promotion pending; never infer cancellation from age.', auto_inactive: false });
try { await freshHead(); }
catch (error) {
  // No Vercel promotion request has been sent yet, so this outcome is known.
  await github(`/deployments/${intent.id}/statuses`, 'POST', { state: 'failure', description: 'Revision became stale before any promotion request was sent.', auto_inactive: false });
  throw error;
}
// Intentionally do not mark an unknown result failed: that would let later runs
// race an accepted but still-running request after network loss/cancellation.
const promotion = await vercel(`/v10/projects/${projectId}/promote/${staged.id}${params}`, 'POST', {});
requireValue(promotion.status === 201, 'Promotion was queued or ambiguous; durable intent remains blocked for reconciliation.');
const deadline = Date.now() + 5 * 60 * 1000;
let promoted = false;
while (Date.now() < deadline) {
  project = await getProject();
  const request = project.lastAliasRequest;
  if (request?.toDeploymentId === staged.id && request.jobStatus === 'succeeded') { promoted = true; break; }
  if (request?.toDeploymentId === staged.id && ['failed','skipped'].includes(request.jobStatus)) {
    await github(`/deployments/${intent.id}/statuses`, 'POST', { state: 'failure', description: 'Provider confirmed terminal unsuccessful promotion.', auto_inactive: false });
    throw new Error('Provider confirmed promotion failure; review prior permanent release.');
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
}
requireValue(promoted, 'Promotion remains unresolved. Future releases will stop until reconciled.');
const alias = (await vercel(`/v4/aliases/${new URL(origin).hostname}${params}`)).data;
requireValue(alias.deploymentId === staged.id || alias.deployment?.id === staged.id, 'Permanent alias does not point to the exact staged deployment.');
const permanent = await hostedSmoke(origin, verified.release, bypass, { records: verified.records });
await github(`/deployments/${intent.id}/statuses`, 'POST', { state: 'success', description: `Verified ${record.buildId} at the permanent protected origin.`, environment_url: origin, auto_inactive: false });
await writeFile('artifacts/delivery/published.json', JSON.stringify({ ...record, probe, staged, stagedCheck, browserCheck, permanent, intentId: intent.id, previousDeploymentId: project.lastAliasRequest.fromDeploymentId, verifiedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ origin, buildId: record.buildId, commit: record.gitCommit, deployment: staged.id, protected: true, verified: true }));
