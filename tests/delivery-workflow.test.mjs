import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
const workflow = YAML.parse(await readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8'), { uniqueKeys: true });

test('one valid workflow keeps promotion serialized and tools/actions pinned', () => {
  assert.ok(workflow.on.push.branches.includes('codex/**'));
  assert.equal(workflow.concurrency['cancel-in-progress'],false);
  assert.ok(workflow.concurrency.group.includes('colossus-private-promotion'));
  assert.equal(workflow.permissions.contents,'read');
  const job = workflow.jobs.validate;
  assert.equal(job['runs-on'],'ubuntu-24.04');
  assert.equal(job.permissions.deployments,'write');
  assert.ok(job['timeout-minutes'] <= 40);
  for (const step of job.steps.filter(step=>step.uses)) assert.match(step.uses,/@[a-f0-9]{40}$/);
  assert.ok(job.steps.some(step=>step.with?.['node-version']==='24.18.0'));
});
test('required tests and readiness precede the only deployment step', () => {
  const steps = workflow.jobs.validate.steps;
  const position = fragment => steps.findIndex(step => step.run?.includes(fragment));
  const install = position('npm ci'), units = position('npm test'), build = position('build:playtest'), browser = position('test:delivery'), integrity = position('verify:playtest'), eligibility = position('check-release-readiness'), deploy = position('deliver:playtest');
  assert.ok(install >= 0 && install < units && units < build && build < browser && browser < integrity && integrity < eligibility && eligibility < deploy);
  assert.equal(steps.filter(step=>step.run?.includes('deliver:playtest')).length,1);
  assert.equal(steps[deploy].if,"github.ref == 'refs/heads/codex/playtest'");
  assert.ok(!steps[deploy]['continue-on-error']);
});
