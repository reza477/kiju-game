import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const PLAYTEST_BRANCH = 'codex/playtest';
export const REPOSITORY = 'reza477/kiju-game';
export function requireValue(value, message) { if (!value) throw new Error(message); return value; }
export function safeOrigin(value) {
  const url = new URL(value);
  requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Use one HTTPS root origin without credentials, path or query.');
  return url.origin;
}
function deploymentOrigin(value) {
  requireValue(typeof value === 'string' && /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+vercel\.app\/?$/.test(value), 'Deployment output must contain a plain HTTPS vercel.app origin.');
  return safeOrigin(value);
}
export function parseDeploymentOutput(output) {
  requireValue(typeof output === 'string', 'Deployment output is unavailable.');
  const text = output.trim();
  // Legacy CLI output is accepted only when the entire stdout is one URL.
  if (text.startsWith('https://')) return { url: deploymentOrigin(text) };
  let result;
  try { result = JSON.parse(text); }
  catch { throw new Error('Deployment output is not valid structured JSON or a standalone URL.'); }
  const deployment = result?.deployment;
  requireValue(result?.status === 'ok' && !result.error && deployment && !deployment.error
    && deployment.readyState === 'READY' && deployment.target === 'production'
    && typeof deployment.id === 'string' && /^dpl_[a-zA-Z0-9]+$/.test(deployment.id), 'Deployment output did not report a ready production deployment.');
  // Help/next-command URLs are not deployment identity.
  return { id: deployment.id, url: deploymentOrigin(deployment.url) };
}
export function assertStagedDeployment(deployment, parsed, projectId) {
  requireValue(deployment?.projectId === projectId && deployment.readyState === 'READY' && deployment.target === 'production', 'Staged deployment is not the ready production-target artifact.');
  requireValue(typeof deployment.id === 'string' && /^dpl_[a-zA-Z0-9]+$/.test(deployment.id)
    && (!parsed.id || deployment.id === parsed.id)
    && typeof deployment.url === 'string' && deploymentOrigin(`https://${deployment.url}`) === parsed.url,
  'Provider deployment identity differs from CLI output.');
  return { url: parsed.url, id: deployment.id };
}
export function assertProtection(project, projectId, orgId) {
  requireValue(project.id === projectId && project.accountId === orgId, 'Hosting project/account mismatch.');
  requireValue(project.ssoProtection?.deploymentType === 'all', 'Vercel Authentication must protect ALL deployments, including production.');
  requireValue(project.publicSource !== true, 'Public source access must be disabled.');
  requireValue(!project.link, 'Disconnect native Git deployment for this dedicated Actions-managed project first.');
  requireValue(!project.rollingRelease, 'Rolling releases are not supported by this serialized static playtest lane.');
}
export function assertNoPendingPromotion(project) {
  const request = project.lastAliasRequest;
  if (request === undefined || request === null) return;
  requireValue(typeof request === 'object' && !Array.isArray(request)
    && ['promote', 'rollback'].includes(request.type)
    && typeof request.toDeploymentId === 'string' && request.toDeploymentId.length > 0
    && Number.isFinite(request.requestedAt) && request.requestedAt > 0
    && ['succeeded', 'failed', 'skipped'].includes(request.jobStatus),
  'An earlier remote promotion is unresolved or malformed. Reconcile it before another promotion; age does not make it safe.');
}
export function assertCurrentRevision(actual, expected) {
  requireValue(/^[a-f0-9]{40}$/.test(expected) && actual === expected, 'The checked revision is stale or unknown; permanent address was not changed.');
}
function promotionInventory(inventory, projectId, origin) {
  requireValue(Array.isArray(inventory?.domains) && inventory.domains.length > 0
    && Array.isArray(inventory.aliases) && inventory.aliases.length > 0, 'Complete production domain and alias inventories are required.');
  const hostname = value => {
    requireValue(typeof value === 'string' && new URL(safeOrigin(`https://${value}`)).hostname === value, 'Malformed production hostname.');
    return value;
  };
  const domains = inventory.domains.map(domain => {
    requireValue(domain.verified === true && domain.redirect == null && domain.gitBranch == null && domain.customEnvironmentId == null, 'Production domain is unverified, redirected, or environment-specific.');
    return hostname(domain.name);
  }).sort();
  const aliases = inventory.aliases.map(alias => {
    requireValue(alias.projectId === projectId && alias.redirect == null, 'Production alias belongs to another project or redirects.');
    const deploymentId = alias.deploymentId ?? alias.deployment?.id;
    requireValue(typeof deploymentId === 'string' && /^dpl_[a-zA-Z0-9]+$/.test(deploymentId)
      && (!alias.deployment?.id || alias.deployment.id === deploymentId), 'Production alias has an unknown or conflicting deployment.');
    return { hostname: hostname(alias.alias), deploymentId };
  }).sort((a,b) => a.hostname.localeCompare(b.hostname));
  requireValue(new Set(domains).size === domains.length && new Set(aliases.map(alias => alias.hostname)).size === aliases.length, 'Duplicate production inventory entries are ambiguous.');
  requireValue(domains.includes(new URL(safeOrigin(origin)).hostname)
    && domains.every(domain => aliases.some(alias => alias.hostname === domain)), 'Permanent or configured production domain is missing an alias mapping.');
  return { signature: digest(JSON.stringify({ domains, aliases: aliases.map(alias => alias.hostname) })), domains, aliases };
}
export function recordPromotionInventory(inventory, projectId, origin) {
  const validated = promotionInventory(inventory, projectId, origin);
  // Provider alias objects may contain protection-bypass credentials and user
  // metadata. Persist only the validated names, production flags and mappings.
  return { domains: validated.domains.map(name => ({ name, verified: true, redirect: null, gitBranch: null, customEnvironmentId: null })),
    aliases: validated.aliases.map(alias => ({ alias: alias.hostname, projectId, deploymentId: alias.deploymentId, redirect: null })) };
}
export function assertPromotionBaseline({ inventory, projectId, origin, previousDeploymentId, deploymentId }) {
  requireValue(typeof previousDeploymentId === 'string' && /^dpl_[a-zA-Z0-9]+$/.test(previousDeploymentId)
    && typeof deploymentId === 'string' && /^dpl_[a-zA-Z0-9]+$/.test(deploymentId)
    && previousDeploymentId !== deploymentId, 'Promotion requires a distinct known previous deployment.');
  const baseline = promotionInventory(inventory, projectId, origin);
  // --prod --skip-domain can move generated project aliases to the staged
  // deployment. Registered production domains must still serve the prior one.
  requireValue(baseline.aliases.every(alias => baseline.domains.includes(alias.hostname)
    ? alias.deploymentId === previousDeploymentId
    : [previousDeploymentId, deploymentId].includes(alias.deploymentId)),
  'Registered production domains must retain the prior deployment; extra aliases must map only to the prior or exact staged deployment.');
  return baseline;
}
export function inspectObservedPromotion({ responseStatus, project, deployment, inventory, baselineInventory, expected, currentHead, intent }) {
  requireValue(responseStatus === 201, 'Observed promotion requires the captured HTTP 201 response.');
  requireValue(/^[a-f0-9]{20}$/.test(expected.buildId) && /^[a-f0-9]{64}$/.test(expected.artifactSha256), 'Observed promotion requires exact build and artifact identities.');
  requireValue(intent?.id && intent.state === 'in_progress' && intent.sha === expected.gitCommit
    && intent.payload?.projectId === expected.projectId && intent.payload.targetDeploymentId === expected.deploymentId
    && intent.payload.previousDeploymentId === expected.previousDeploymentId
    && intent.payload.origin === expected.origin && intent.payload.buildId === expected.buildId
    && intent.payload.artifactSha256 === expected.artifactSha256, 'Observed promotion requires its matching durable in-progress intent.');
  requireValue(JSON.stringify(recordPromotionInventory(intent.payload.baselineInventory, expected.projectId, expected.origin))
    === JSON.stringify(recordPromotionInventory(baselineInventory, expected.projectId, expected.origin)),
  'Durable promotion intent does not preserve the original complete inventory.');
  assertCurrentRevision(currentHead, expected.gitCommit);
  assertProtection(project, expected.projectId, expected.orgId);
  // Only the explicitly observed null provider response has this fallback.
  // Missing, pending, mismatched or terminal request objects cannot use it.
  requireValue(project.lastAliasRequest === null, 'Observed promotion requires an explicit null provider request.');
  assertStagedDeployment(deployment, { id: expected.deploymentId, url: expected.deploymentUrl }, expected.projectId);
  const target = project.targets?.production;
  for (const value of [deployment, target]) {
    const pendingAssignment = value === deployment && value.readySubstate === 'STAGED' && value.aliasAssigned === false;
    requireValue(value && (value.projectId == null || value.projectId === expected.projectId)
      && value.readyState === 'READY' && value.target === 'production'
      && (pendingAssignment || value.aliasAssigned === true || (Number.isFinite(value.aliasAssigned) && value.aliasAssigned > 0))
      && value.aliasError === null && !value.error && !value.errorCode
      && typeof value.url === 'string', 'Promotion transition has missing state or alias errors.');
    deploymentOrigin(`https://${value.url}`);
  }
  requireValue(['STAGED','PROMOTED'].includes(deployment.readySubstate), 'Deployment is outside the accepted promotion transition.');
  requireValue([expected.previousDeploymentId,expected.deploymentId].includes(target.id)
    && target.readySubstate === 'PROMOTED'
    && (target.id !== expected.deploymentId || deploymentOrigin(`https://${target.url}`) === expected.deploymentUrl),
  'Current production target is outside the accepted prior-to-staged transition.');
  const baseline = assertPromotionBaseline({ inventory: baselineInventory, ...expected });
  const observed = promotionInventory(inventory, expected.projectId, expected.origin);
  requireValue(observed.signature === baseline.signature, 'Production domain or alias inventory changed during promotion.');
  requireValue(observed.aliases.every(alias => [expected.previousDeploymentId,expected.deploymentId].includes(alias.deploymentId)), 'A production alias moved outside the accepted prior-to-staged transition.');
  const complete = deployment.readySubstate === 'PROMOTED' && target.id === expected.deploymentId
    && observed.aliases.every(alias => alias.deploymentId === expected.deploymentId);
  return { complete, observation: { mode: 'observed-promotion', projectId: expected.projectId, deploymentId: expected.deploymentId,
    gitCommit: expected.gitCommit, buildId: expected.buildId, artifactSha256: expected.artifactSha256,
    inventorySignature: observed.signature, hosts: observed.aliases.map(alias => `https://${alias.hostname}`) } };
}
export function assertObservedPromotion(value) {
  const result = inspectObservedPromotion(value);
  requireValue(result.complete, 'Current production target, deployment and all aliases have not completed promotion.');
  return result.observation;
}
export async function confirmObservedPromotion({ responseStatus, baselineInventory, expected, intent, readSnapshot, verifyHosted,
  timeoutMs = 60000, pollingMs = 2000, now = () => Date.now(), wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  requireValue(Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 60000
    && Number.isFinite(pollingMs) && pollingMs > 0, 'Invalid bounded promotion wait.');
  const deadline = now() + timeoutMs;
  let firstSnapshot, transitionSnapshots = 0;
  while (true) {
    firstSnapshot = await readSnapshot(); transitionSnapshots++;
    // Only a fully validated, known incomplete transition is retried. Errors,
    // stale heads, changed inventories and explicit request states propagate.
    const transition = inspectObservedPromotion({ ...firstSnapshot, responseStatus, baselineInventory, expected, intent });
    if (transition.complete) break;
    requireValue(now() < deadline, 'Promotion transition timed out; durable intent remains unresolved.');
    await wait(Math.min(pollingMs, deadline - now()));
  }
  const observations = [], hostedChecks = [];
  for (let index = 0; index < 2; index++) {
    if (index) await wait(pollingMs);
    const snapshot = index ? await readSnapshot() : firstSnapshot;
    const observation = assertObservedPromotion({ ...snapshot, responseStatus, baselineInventory, expected, intent });
    if (index) requireValue(JSON.stringify(observation) === JSON.stringify(observations[0]), 'Fresh promotion observations disagree.');
    observations.push(observation);
    // The callback must verify denied anonymous access plus exact protected
    // runtime hashes. A target pointer alone never establishes success.
    for (const host of observation.hosts) {
      const check = await verifyHosted(host);
      requireValue(check?.origin === host && check.protected === true && check.authorized === true
        && check.buildId === expected.buildId && check.gitCommit === expected.gitCommit, 'Exact protected hosted verification did not confirm this build.');
      hostedChecks.push(check);
    }
  }
  // Hash checks can take time. Re-read provider state and the branch afterwards
  // so a concurrent change during the last verification cannot be accepted.
  const finalSnapshot = await readSnapshot();
  const finalObservation = assertObservedPromotion({ ...finalSnapshot, responseStatus, baselineInventory, expected, intent });
  requireValue(JSON.stringify(finalObservation) === JSON.stringify(observations[0]), 'Promotion changed during the final hosted verification.');
  observations.push(finalObservation);
  return { mode: 'observed-promotion', transitionSnapshots, observations, hostedChecks };
}
export async function verifyRuntime(directory) {
  const descriptorBytes = await readFile(path.join(directory, 'release.json'));
  const release = JSON.parse(descriptorBytes);
  requireValue(release.app === 'colossus-wake' && release.schemaVersion === 1 && /^[a-f0-9]{20}$/.test(release.buildId), 'Invalid runtime descriptor.');
  requireValue(Array.isArray(release.files) && release.files.length > 0, 'Empty runtime.');
  const expected = new Set(['/release.json', '/sw.js']);
  const records = [];
  for (const file of release.files) {
    requireValue(/^\/[\w./-]+$/.test(file.url) && !file.url.includes('..') && !expected.has(file.url), 'Unsafe or duplicate runtime file.');
    expected.add(file.url);
    const bytes = await readFile(path.join(directory, file.url.slice(1)));
    requireValue(bytes.length === file.bytes && digest(bytes) === file.sha256, `Runtime integrity failed: ${file.url}`);
  }
  async function walk(root, prefix = '') {
    for (const item of await readdir(root, { withFileTypes: true })) {
      requireValue(!item.isSymbolicLink(), 'Runtime symlinks are forbidden.');
      const relative = `${prefix}/${item.name}`;
      if (item.isDirectory()) await walk(path.join(root, item.name), relative);
      else {
        requireValue(expected.delete(relative), `Unexpected runtime file: ${relative}`);
        const bytes = await readFile(path.join(root, item.name));
        records.push({ path: relative, bytes: bytes.length, sha256: digest(bytes) });
      }
    }
  }
  await walk(directory);
  requireValue(expected.size === 0, 'Runtime files are missing.');
  records.sort((a, b) => a.path.localeCompare(b.path));
  return { release, records, artifactSha256: digest(JSON.stringify(records)) };
}
export function outputConfiguration(release) {
  return { version: 3, routes: [
    { src: '/(.*)', headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' }, continue: true },
    ...release.files.map(file => ({ src: `^${file.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, headers: { 'Content-Type': file.type }, continue: true })),
    { src: '^/sw\\.js$', headers: { 'Service-Worker-Allowed': '/', 'Content-Type': 'text/javascript; charset=utf-8' }, continue: true },
    { src: '^/release\\.json$', headers: { 'Content-Type': 'application/json; charset=utf-8' }, continue: true },
    { handle: 'filesystem' },
  ] };
}
