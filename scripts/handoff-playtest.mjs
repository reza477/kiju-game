// Integrates an ALREADY committed, reviewed feature revision. No automatic add -A,
// no force push, no default-branch change, and no merging unrelated work.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { PLAYTEST_BRANCH, REPOSITORY, requireValue } from './delivery-lib.mjs';
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
const gh = args => execFileSync('gh', args, { encoding: 'utf8' }).trim();
requireValue(git(['status','--porcelain']) === '', 'Commit only the relevant finished files before delivery. Working tree must be clean.');
const repo = JSON.parse(gh(['repo','view',REPOSITORY,'--json','nameWithOwner,isPrivate']));
requireValue(repo.nameWithOwner === REPOSITORY && repo.isPrivate, 'Expected private repository not verified.');
requireValue(/^https:\/\/github\.com\/reza477\/kiju-game(?:\.git)?$/.test(git(['remote','get-url','origin'])), 'Unexpected push remote.');
const readiness = JSON.parse(await readFile('delivery/readiness.json','utf8'));
requireValue(readiness.eligible === true, `Release blocked: ${readiness.reason}`);
requireValue(gh(['variable','get','PLAYTEST_INCLUDED_USAGE_CONFIRMED','--repo',REPOSITORY]) === 'true', 'Included-only usage must be confirmed before triggering hosted runners.');
const candidate = git(['rev-parse','HEAD']);
git(['fetch','origin']);
const existing = git(['branch','--list',PLAYTEST_BRANCH]);
const remote = git(['branch','--remotes','--list',`origin/${PLAYTEST_BRANCH}`]);
if (!existing) git(remote ? ['switch','--track','-c',PLAYTEST_BRANCH,`origin/${PLAYTEST_BRANCH}`] : ['switch','-c',PLAYTEST_BRANCH,candidate]);
else git(['switch',PLAYTEST_BRANCH]);
if (remote) git(['merge','--ff-only',`origin/${PLAYTEST_BRANCH}`]);
git(['merge','--ff-only',candidate]);
git(['push','--set-upstream','origin',PLAYTEST_BRANCH]);
// Push success is not deployment success. Wait for the matching workflow and
// then require a successful deployment-ledger entry for that exact SHA.
let run;
for (let count = 0; count < 20 && !run; count++) {
  run = JSON.parse(gh(['run','list','--repo',REPOSITORY,'--branch',PLAYTEST_BRANCH,'--commit',candidate,'--workflow','ci.yml','--json','databaseId,status,conclusion,url']))[0];
  if (!run) await new Promise(resolve => setTimeout(resolve,3000));
}
requireValue(run, 'Push completed but no matching Actions run appeared. Check GitHub; do not claim live.');
console.log(`Checks and deployment: ${run.url}`);
execFileSync('gh',['run','watch',String(run.databaseId),'--repo',REPOSITORY,'--exit-status'],{stdio:'inherit'});
const deployments = JSON.parse(gh(['api',`repos/${REPOSITORY}/deployments?sha=${candidate}&environment=private-playtest&task=colossus-promote`]));
let live;
for (const deployment of deployments) {
  const status = JSON.parse(gh(['api',`repos/${REPOSITORY}/deployments/${deployment.id}/statuses?per_page=1`]))[0];
  if (status?.state === 'success') { live = { ...deployment.payload, url: status.environment_url, verifiedAt: status.created_at }; break; }
}
requireValue(live, 'Actions did not record a verified publication. Do not claim this build is live.');
console.log(JSON.stringify({ status: 'Verified by the matching Actions workflow', origin: live.url, commit: candidate, build: live.buildId, deployment: live.targetDeploymentId, verifiedAt: live.verifiedAt, limitation: 'This command reports workflow evidence. Recheck the permanent origin before claiming it still serves this revision.' }, null, 2));
