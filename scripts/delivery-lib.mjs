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
