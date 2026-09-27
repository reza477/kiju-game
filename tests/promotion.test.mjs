import test from 'node:test';
import assert from 'node:assert/strict';
import { recordPromotionInventory, assertPromotionBaseline, inspectObservedPromotion, assertObservedPromotion, confirmObservedPromotion } from '../scripts/delivery-lib.mjs';

function fixture() {
  const expected = { projectId:'prj_test', orgId:'team_test', deploymentId:'dpl_next',
    previousDeploymentId:'dpl_prior',
    deploymentUrl:'https://game-next.vercel.app', origin:'https://game.vercel.app',
    gitCommit:'a'.repeat(40), buildId:'b'.repeat(20), artifactSha256:'c'.repeat(64) };
  const deployment = { id:expected.deploymentId, projectId:expected.projectId, url:'game-next.vercel.app',
    readyState:'READY', readySubstate:'PROMOTED', target:'production', aliasAssigned:true, aliasError:null };
  const project = { id:expected.projectId, accountId:expected.orgId, ssoProtection:{deploymentType:'all'},
    publicSource:false, lastAliasRequest:null, targets:{production:{...deployment,projectId:undefined,aliasAssigned:123}} };
  const inventory = { domains:[{name:'game.vercel.app',verified:true}],
    aliases:['game.vercel.app','game-team.vercel.app'].map(alias => ({alias,projectId:expected.projectId,deploymentId:expected.deploymentId})) };
  const baselineInventory = structuredClone(inventory);
  for (const alias of baselineInventory.aliases) alias.deploymentId = 'dpl_prior';
  return { responseStatus:201, project, deployment, inventory, baselineInventory, expected, currentHead:expected.gitCommit,
    intent:{id:123,sha:expected.gitCommit,state:'in_progress',payload:{projectId:expected.projectId,
      targetDeploymentId:expected.deploymentId,previousDeploymentId:expected.previousDeploymentId,baselineInventory:structuredClone(baselineInventory),
      origin:expected.origin,buildId:expected.buildId,artifactSha256:expected.artifactSha256}} };
}
const hosted = (host, expected) => ({origin:host,protected:true,authorized:true,buildId:expected.buildId,gitCommit:expected.gitCommit});
function incompleteTransition(value) {
  value.project.targets.production.id=value.expected.previousDeploymentId;
  value.project.targets.production.url='game-prior.vercel.app';
  value.deployment.readySubstate='STAGED';
  value.inventory.aliases[0].deploymentId=value.expected.previousDeploymentId;
  return value;
}

test('durable inventory whitelist excludes provider credentials and unrelated personal metadata', () => {
  const value=fixture();
  value.baselineInventory.domains[0].verification=[{value:'synthetic-verification-secret'}];
  Object.assign(value.baselineInventory.aliases[0], {protectionBypass:{'synthetic-bypass-secret':{scope:'automation'}},
    creator:{email:'synthetic-person@example.invalid'},deployment:{id:'dpl_prior',meta:{private:'synthetic-meta-secret'}}});
  const result=recordPromotionInventory(value.baselineInventory,value.expected.projectId,value.expected.origin);
  const text=JSON.stringify(result);
  for(const secret of ['synthetic-verification-secret','synthetic-bypass-secret','synthetic-person','synthetic-meta-secret','protectionBypass']) assert.ok(!text.includes(secret));
  assert.deepEqual(Object.keys(result.aliases[0]).sort(),['alias','deploymentId','projectId','redirect']);
  assert.deepEqual(Object.keys(result.domains[0]).sort(),['customEnvironmentId','gitBranch','name','redirect','verified']);
  value.baselineInventory.aliases[0].deployment.id='dpl_other';
  assert.throws(()=>recordPromotionInventory(value.baselineInventory,value.expected.projectId,value.expected.origin));
});

test('a known incomplete accepted transition waits, then completes the unchanged full proof', async () => {
  const value=fixture(); let reads=0,elapsed=0,checks=0;
  assert.equal(inspectObservedPromotion(incompleteTransition(structuredClone(value))).complete,false);
  const result=await confirmObservedPromotion({...value,timeoutMs:20,pollingMs:2,now:()=>elapsed,
    wait:async ms=>{elapsed+=ms;},readSnapshot:async()=>{reads++;return reads===1?incompleteTransition(structuredClone(value)):structuredClone(value);},
    verifyHosted:async host=>{checks++;return hosted(host,value.expected);} });
  assert.equal(result.transitionSnapshots,2); assert.equal(reads,4); assert.equal(checks,4);
  assert.equal(result.observations.length,3);
});

test('explicit false assignment can only wait on a READY STAGED candidate, never confirm promotion', async () => {
  const value=fixture(), pending=incompleteTransition(structuredClone(value));
  pending.deployment.aliasAssigned=false;
  assert.equal(inspectObservedPromotion(pending).complete,false);
  assert.throws(()=>assertObservedPromotion(pending));
  let reads=0,elapsed=0;
  const result=await confirmObservedPromotion({...value,timeoutMs:20,pollingMs:2,now:()=>elapsed,
    wait:async ms=>{elapsed+=ms;},readSnapshot:async()=>++reads===1?structuredClone(pending):structuredClone(value),
    verifyHosted:async host=>hosted(host,value.expected)});
  assert.equal(result.transitionSnapshots,2);
  for(const assigned of [undefined,null,0,-1,'false',NaN]) {
    const invalid=structuredClone(pending); invalid.deployment.aliasAssigned=assigned;
    assert.throws(()=>inspectObservedPromotion(invalid));
  }
  pending.deployment.readySubstate='PROMOTED';
  assert.throws(()=>inspectObservedPromotion(pending));
});

test('an accepted transition has a bounded timeout and never reports hosted success while incomplete', async () => {
  const value=fixture(); let reads=0,elapsed=0,checks=0;
  await assert.rejects(confirmObservedPromotion({...value,timeoutMs:4,pollingMs:2,now:()=>elapsed,
    wait:async ms=>{elapsed+=ms;},readSnapshot:async()=>{reads++;return incompleteTransition(structuredClone(value));},
    verifyHosted:async host=>{checks++;return hosted(host,value.expected);} }),/timed out/);
  assert.equal(elapsed,4); assert.equal(reads,3); assert.equal(checks,0);
  assert.equal(value.intent.state,'in_progress');
});

test('harmful or unknown transition states fail immediately without being retried', async () => {
  const changes=[v=>v.currentHead='d'.repeat(40),v=>v.project.lastAliasRequest={jobStatus:'pending'},
    v=>v.project.targets.production.id='dpl_third',v=>v.deployment.readySubstate='ROLLING',
    v=>v.deployment.aliasError={code:'failure'},v=>v.inventory.aliases[0].deploymentId='dpl_third',
    v=>v.inventory.aliases.pop(),v=>delete v.intent.payload.baselineInventory];
  for(const change of changes) {
    const value=incompleteTransition(fixture()); change(value); let reads=0,waits=0,checks=0;
    await assert.rejects(confirmObservedPromotion({...value,timeoutMs:20,pollingMs:2,wait:async()=>{waits++;},
      readSnapshot:async()=>{reads++;return structuredClone(value);},
      verifyHosted:async host=>{checks++;return hosted(host,value.expected);} }));
    assert.equal(reads,1); assert.equal(waits,0); assert.equal(checks,0);
  }
});

test('explicit-null promotion needs complete independent current-target and alias evidence', () => {
  const value = fixture();
  const result = assertObservedPromotion(value);
  assert.equal(result.mode,'observed-promotion');
  assert.equal(result.deploymentId,'dpl_next');
  assert.deepEqual(result.hosts,['https://game-team.vercel.app','https://game.vercel.app']);
  value.inventory.aliases.reverse();
  assert.deepEqual(assertObservedPromotion(value),result);
});

test('observed promotion rejects missing, pending, failed and mismatched provider evidence', () => {
  const cases = {
    'HTTP 202':v=>v.responseStatus=202,
    'missing response':v=>delete v.responseStatus,
    'missing request':v=>delete v.project.lastAliasRequest,
    'pending request':v=>v.project.lastAliasRequest={toDeploymentId:'dpl_next',jobStatus:'pending'},
    'failed request':v=>v.project.lastAliasRequest={toDeploymentId:'dpl_next',jobStatus:'failed'},
    'different succeeded request':v=>v.project.lastAliasRequest={toDeploymentId:'dpl_other',jobStatus:'succeeded'},
    'stale branch':v=>v.currentHead='d'.repeat(40),
    'missing branch':v=>delete v.currentHead,
    'wrong account':v=>v.project.accountId='team_other',
    'wrong project':v=>v.project.id='prj_other',
    'unprotected project':v=>v.project.ssoProtection.deploymentType='standard',
    'public source':v=>v.project.publicSource=true,
    'wrong deployment':v=>v.deployment.id='dpl_other',
    'wrong deployment project':v=>v.deployment.projectId='prj_other',
    'wrong deployment URL':v=>v.deployment.url='other.vercel.app',
    'wrong current target':v=>v.project.targets.production.id='dpl_other',
    'wrong current project':v=>v.project.targets.production.projectId='prj_other',
    'wrong current URL':v=>v.project.targets.production.url='other.vercel.app',
    'missing current target':v=>delete v.project.targets.production,
    'staged deployment':v=>v.deployment.readySubstate='STAGED',
    'rolling target':v=>v.project.targets.production.readySubstate='ROLLING',
    'nonready deployment':v=>v.deployment.readyState='BUILDING',
    'preview target':v=>v.project.targets.production.target='preview',
    'alias error':v=>v.deployment.aliasError={code:'failed'},
    'missing alias error evidence':v=>delete v.project.targets.production.aliasError,
    'missing alias assigned':v=>delete v.deployment.aliasAssigned,
    'false alias assigned':v=>v.project.targets.production.aliasAssigned=false,
    'invalid alias timestamp':v=>v.project.targets.production.aliasAssigned=Infinity,
    'zero alias timestamp':v=>v.project.targets.production.aliasAssigned=0,
    'deployment error':v=>v.deployment.errorCode='failed',
    'missing intent':v=>delete v.intent,
    'unconfirmed intent':v=>v.intent.state='queued',
    'different intent SHA':v=>v.intent.sha='d'.repeat(40),
    'different intent target':v=>v.intent.payload.targetDeploymentId='dpl_other',
    'missing rollback intent':v=>delete v.intent.payload.previousDeploymentId,
    'missing baseline intent':v=>delete v.intent.payload.baselineInventory,
    'altered baseline intent':v=>v.intent.payload.baselineInventory.aliases[0].deploymentId='dpl_other',
    'different intent artifact':v=>v.intent.payload.artifactSha256='d'.repeat(64),
    'missing artifact identity':v=>{delete v.expected.artifactSha256;delete v.intent.payload.artifactSha256;},
  };
  for (const [name,mutate] of Object.entries(cases)) {
    const value=fixture(); mutate(value); assert.throws(()=>assertObservedPromotion(value),undefined,name);
  }
});

test('observed promotion rejects changed, incomplete or inconsistent inventories', () => {
  const cases = {
    'missing domains':v=>delete v.inventory.domains,
    'empty domains':v=>v.inventory.domains=[],
    'missing aliases':v=>delete v.inventory.aliases,
    'empty aliases':v=>v.inventory.aliases=[],
    'missing alias':v=>v.inventory.aliases.pop(),
    'extra alias':v=>v.inventory.aliases.push({...v.inventory.aliases[0],alias:'extra.vercel.app'}),
    'duplicate alias':v=>v.inventory.aliases.push(v.inventory.aliases[0]),
    'extra domain':v=>v.inventory.domains.push({name:'game-team.vercel.app',verified:true}),
    'duplicate domain':v=>v.inventory.domains.push(v.inventory.domains[0]),
    'unverified domain':v=>v.inventory.domains[0].verified=false,
    'domain redirect':v=>v.inventory.domains[0].redirect='other.example',
    'branch-specific domain':v=>v.inventory.domains[0].gitBranch='other',
    'environment-specific domain':v=>v.inventory.domains[0].customEnvironmentId='env_test',
    'stale alias':v=>v.inventory.aliases[0].deploymentId='dpl_prior',
    'foreign project alias':v=>v.inventory.aliases[0].projectId='prj_other',
    'missing alias project':v=>delete v.inventory.aliases[0].projectId,
    'redirected alias':v=>v.inventory.aliases[0].redirect='other.example',
    'conflicting alias mapping':v=>v.inventory.aliases[0].deployment={id:'dpl_other'},
    'missing baseline':v=>delete v.baselineInventory,
    'baseline changed':v=>v.baselineInventory.aliases.pop(),
    'split baseline':v=>v.baselineInventory.aliases[0].deploymentId='dpl_other',
    'identical prior and target':v=>v.expected.previousDeploymentId='dpl_next',
  };
  for (const [name,mutate] of Object.entries(cases)) {
    const value=fixture(); mutate(value); assert.throws(()=>assertObservedPromotion(value),undefined,name);
  }
});

test('observed confirmation checks every host twice and rechecks fresh state after final hashes', async () => {
  const value=fixture(); let snapshots=0,waits=0; const checked=[];
  const result=await confirmObservedPromotion({...value,
    readSnapshot:async()=>{snapshots++;return structuredClone(value);},wait:async()=>{waits++;},
    verifyHosted:async host=>{checked.push(host);return hosted(host,value.expected);} });
  assert.equal(result.mode,'observed-promotion'); assert.equal(snapshots,3); assert.equal(waits,1);
  assert.equal(result.observations.length,3); assert.equal(result.hostedChecks.length,4);
  assert.deepEqual(checked,[...result.observations[0].hosts,...result.observations[0].hosts]);
});

test('a changed second snapshot or failed hosted check leaves observation unconfirmed', async () => {
  for (const failure of ['stale-head','changed-alias','pending-request','hash-error','unprotected','wrong-build','head-during-final-hash','target-during-final-hash']) {
    const value=fixture(); let reads=0;
    await assert.rejects(confirmObservedPromotion({...value,wait:async()=>{},readSnapshot:async()=>{
      const snapshot=structuredClone(value); reads++;
      if(reads===2 && failure==='stale-head') snapshot.currentHead='d'.repeat(40);
      if(reads===2 && failure==='changed-alias') snapshot.inventory.aliases.pop();
      if(reads===2 && failure==='pending-request') snapshot.project.lastAliasRequest={jobStatus:'pending'};
      if(reads===3 && failure==='head-during-final-hash') snapshot.currentHead='d'.repeat(40);
      if(reads===3 && failure==='target-during-final-hash') snapshot.project.targets.production.id='dpl_other';
      return snapshot;
    },verifyHosted:async host=>{
      if(failure==='hash-error') throw Error('Hosted artifact mismatch');
      const result=hosted(host,value.expected);
      if(failure==='unprotected') result.protected=false;
      if(failure==='wrong-build') result.buildId='d'.repeat(20);
      return result;
    }}),undefined,failure);
  }
});

test('registered production domains retain prior bytes while generated aliases may map to the exact staged deployment', () => {
  const value=fixture();
  value.baselineInventory.aliases[1].deploymentId=value.expected.deploymentId;
  value.intent.payload.baselineInventory=structuredClone(value.baselineInventory);
  assert.doesNotThrow(()=>assertPromotionBaseline({inventory:value.baselineInventory,...value.expected}));
  assert.doesNotThrow(()=>assertObservedPromotion(value));
  value.baselineInventory.domains.push({name:'game-team.vercel.app',verified:true});
  assert.throws(()=>assertPromotionBaseline({inventory:value.baselineInventory,...value.expected}));
  value.baselineInventory.domains.pop();
  value.baselineInventory.aliases[0].deploymentId=value.expected.deploymentId;
  assert.throws(()=>assertPromotionBaseline({inventory:value.baselineInventory,...value.expected}));
});

test('an unknown or shifted registered-domain baseline is rejected before promotion can be sent', () => {
  const value=fixture();
  assert.doesNotThrow(()=>assertPromotionBaseline({inventory:value.baselineInventory,...value.expected}));
  value.baselineInventory.aliases[0].deploymentId='dpl_other';
  assert.throws(()=>assertPromotionBaseline({inventory:value.baselineInventory,...value.expected}));
  assert.throws(()=>assertPromotionBaseline({inventory:fixture().baselineInventory,...value.expected,previousDeploymentId:undefined}));
  assert.throws(()=>assertPromotionBaseline({inventory:fixture().baselineInventory,...value.expected,deploymentId:undefined}));
  const unknownExtra=fixture();
  unknownExtra.baselineInventory.aliases[1].deploymentId='dpl_third';
  assert.throws(()=>assertPromotionBaseline({inventory:unknownExtra.baselineInventory,...unknownExtra.expected}));
});
