import test from 'node:test';
import assert from 'node:assert/strict';
import { assertProtection, assertNoPendingPromotion, assertCurrentRevision, safeOrigin, outputConfiguration, digest } from '../scripts/delivery-lib.mjs';
import { hostedSmoke, installHostAuthorization } from '../scripts/hosted-smoke.mjs';
import { canonicalRuntimeBytes } from '../scripts/build-mobile-release.mjs';

test('release text is identical across Windows and Linux checkouts without altering binary assets', () => {
  assert.deepEqual(canonicalRuntimeBytes('src/main.js', Buffer.from('one\r\ntwo\r\n')), Buffer.from('one\ntwo\n'));
  for (const file of ['assets/map.webp', 'assets/sky.hdr', 'assets/wind.ogg']) {
    const bytes = Buffer.from([0, 13, 10, 255]);
    assert.equal(canonicalRuntimeBytes(file, bytes), bytes);
  }
});

const project = { id: 'prj_test', accountId: 'team_test', ssoProtection: { deploymentType: 'all' }, publicSource: false };
test('Standard Protection and wrong project cannot upload game assets', () => {
  assert.doesNotThrow(() => assertProtection(project, 'prj_test', 'team_test'));
  for (const change of [{ssoProtection:{deploymentType:'prod_deployment_urls_and_all_previews'}},{publicSource:true},{link:{type:'github'}},{rollingRelease:{enabled:true}},{id:'other'}]) {
    assert.throws(() => assertProtection({...project,...change}, 'prj_test','team_test'));
  }
});
test('unresolved remote promotion blocks even when arbitrarily old', () => {
  const request = {type:'promote',toDeploymentId:'dpl_test',requestedAt:1};
  for (const jobStatus of ['pending','in-progress']) assert.throws(() => assertNoPendingPromotion({lastAliasRequest:{...request,jobStatus}}));
  for (const jobStatus of ['succeeded','failed','skipped']) assert.doesNotThrow(() => assertNoPendingPromotion({lastAliasRequest:{...request,jobStatus}}));
  assert.doesNotThrow(() => assertNoPendingPromotion({}));
});
test('unknown or malformed remote promotion status fails closed', () => {
  const request = {type:'promote',toDeploymentId:'dpl_test',requestedAt:1,jobStatus:'succeeded'};
  for (const value of [false, '', [], {}, {...request,jobStatus:'queued'}, {...request,jobStatus:undefined},
    {...request,type:'new-operation'}, {...request,toDeploymentId:''}, {...request,requestedAt:0},
    {...request,requestedAt:'1'}, {...request,requestedAt:Infinity}]) {
    assert.throws(() => assertNoPendingPromotion({lastAliasRequest:value}));
  }
});
test('stale or unverified revision cannot move permanent address', () => {
  assert.doesNotThrow(() => assertCurrentRevision('a'.repeat(40),'a'.repeat(40)));
  assert.throws(() => assertCurrentRevision('b'.repeat(40),'a'.repeat(40)));
  assert.throws(() => assertCurrentRevision(undefined,'a'.repeat(40)));
});
test('credentials and subpaths cannot be embedded in permanent phone address', () => {
  assert.equal(safeOrigin('https://game.example/'),'https://game.example');
  for (const url of ['http://game.example','https://secret@game.example','https://game.example/path','https://game.example/?token=secret']) assert.throws(() => safeOrigin(url));
});
test('unversioned runtime files and update metadata revalidate rather than cache immutably', () => {
  const output = outputConfiguration({files:[{url:'/index.html',type:'text/html'}]});
  assert.equal(output.version,3);
  assert.equal(output.routes[0].headers['Cache-Control'],'no-store');
  assert.ok(output.routes.some(route=>route.headers?.['Service-Worker-Allowed']==='/'));
  assert.ok(output.routes.some(route=>route.src==='^/index\\.html$'));
});

test('browser bypass authorization never follows or fulfills a cross-origin redirect', async () => {
  let handler;
  const authorization = await installHostAuthorization({route:async (_, callback) => {handler=callback;}}, 'https://game.example', 'synthetic-test-value');
  let aborted=0, fetched=0, fulfilled=0;
  const route = {
    request:() => ({url:() => 'https://game.example/start',headers:() => ({accept:'text/html'})}),
    fetch:async options => {
      fetched++; assert.equal(options.maxRedirects,0);
      assert.equal(options.headers['x-vercel-protection-bypass'],'synthetic-test-value');
      return {status:() => 302,headers:() => ({location:'https://other.example/collect'})};
    },
    abort:async () => {aborted++;},fulfill:async () => {fulfilled++;},
  };
  await handler(route);
  assert.equal(fetched,1); assert.equal(aborted,1); assert.equal(fulfilled,0);
  assert.equal(authorization.getStatistics().blockedRedirects,1);
  await handler({...route,request:() => ({url:() => 'https://other.example/asset',headers:() => ({})})});
  assert.equal(fetched,1); assert.equal(aborted,2);
});

test('same-origin authorization fulfills responses but suppresses header-bearing errors', async () => {
  let handler;
  const authorization = await installHostAuthorization({route:async (_, callback) => {handler=callback;}}, 'https://game.example', 'synthetic-test-value');
  let fulfilled=0,aborted=0;
  const response = {status:() => 302,headers:() => ({location:'/signed-in'})};
  const route = {request:() => ({url:() => 'https://game.example/',headers:() => ({})}),
    fetch:async () => response,fulfill:async value => {assert.equal(value.response,response);fulfilled++;},abort:async () => {aborted++;}};
  await handler(route); assert.equal(fulfilled,1);
  await assert.doesNotReject(handler({...route,fetch:async () => {throw Error('Headers contain synthetic-test-value');}}));
  assert.equal(aborted,1); assert.equal(authorization.getStatistics().failedRequests,1);
});

test('insecure authorization is restricted to an explicit 127.0.0.1 test origin', async () => {
  const context = {route:async () => {}};
  await assert.rejects(installHostAuthorization(context,'http://127.0.0.1:8181','synthetic-test-value'));
  await assert.doesNotReject(installHostAuthorization(context,'http://127.0.0.1:8181','synthetic-test-value',{allowLoopbackForTest:true}));
  for (const origin of ['http://localhost:8181','http://other.example','http://127.0.0.1:8181/path']) {
    await assert.rejects(installHostAuthorization(context,origin,'synthetic-test-value',{allowLoopbackForTest:true}));
  }
});

test('hosted integrity includes raw descriptor and worker bytes, not just their build identity', async t => {
  const buildId='a'.repeat(20), index=Buffer.from('<!doctype html><title>Test fixture</title>');
  const descriptor={app:'colossus-wake',schemaVersion:1,buildId,gitCommit:'b'.repeat(40),files:[{url:'/index.html',type:'text/html; charset=utf-8',bytes:index.length,sha256:digest(index)}]};
  const files=new Map([['/index.html',index],['/release.json',Buffer.from(JSON.stringify(descriptor)+'\n')],['/sw.js',Buffer.from(`/* ${buildId} */\n`)]]);
  const records=[...files].map(([path,bytes]) => ({path,bytes:bytes.length,sha256:digest(bytes)}));
  let tampered=null;
  t.mock.method(globalThis,'fetch',async (url, options) => {
    assert.equal(options.redirect,'manual');
    if (!options.headers['x-vercel-protection-bypass']) return new Response('Unauthorized',{status:401});
    const pathname=new URL(url).pathname;
    const bytes=files.get(pathname);
    const headers={'Content-Type':pathname==='/release.json'?'application/json':pathname==='/sw.js'?'text/javascript':'text/html','Cache-Control':'no-store'};
    return new Response(tampered===pathname?Buffer.concat([bytes,Buffer.from('\n')]):bytes,{status:200,headers});
  });
  const result=await hostedSmoke('https://game.example',descriptor,'synthetic-test-value',{records});
  assert.equal(result.verifiedFiles,3);
  for (tampered of ['/release.json','/sw.js']) {
    await assert.rejects(hostedSmoke('https://game.example',descriptor,'synthetic-test-value',{records}), /Hosted artifact mismatch/);
  }
  await assert.rejects(hostedSmoke('https://game.example',descriptor,'synthetic-test-value'), /artifact records/);
});
