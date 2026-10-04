// Freeze actual A/B revisions in separate release checkouts before running.
// This tool never publishes, mutates build-info, or invents a synthetic B.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildMobileRelease} from '../scripts/build-mobile-release.mjs';
import {verifyRuntime} from '../scripts/delivery-lib.mjs';

const output = path.resolve(process.env.OUTPUT_DIR || 'artifacts/painterly/release-final');
const git = (root, ...args) => execFileSync('git', args, {cwd:root, encoding:'utf8', maxBuffer:32*1024*1024}).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {startedAt:new Date().toISOString(), command:{executable:process.execPath,args:process.argv.slice(1),environment:{}}, releases:{}, checks:[], passed:false};
await fs.mkdir(output,{recursive:true});
try {
  const roots = {};
  for (const [label, key] of [['A','BASELINE_RELEASE_ROOT'],['B','CANDIDATE_RELEASE_ROOT']]) {
    assert.ok(process.env[key], key+' must name its isolated release checkout.');
    report.command.environment[key]=process.env[key];
    const root=await fs.realpath(process.env[key]); roots[label]=root;
    assert.equal(git(root,'status','--porcelain'),'',label+': release checkout must be clean.');
    const commit=git(root,'rev-parse','HEAD');
    assert.match(commit,/^[a-f0-9]{40}$/);
    assert.equal(git(root,'branch','--show-current'),'','Release checkouts must be detached from the implementation branch.');
    if(label==='A')assert.equal(commit,process.env.BASELINE_COMMIT||'8320a432b0ce27fbe73eccd32a0b88120cd091ab');
    if(label==='B'&&process.env.CANDIDATE_COMMIT){assert.equal(commit,process.env.CANDIDATE_COMMIT,'Candidate checkout must contain the explicitly requested final commit.');report.command.environment.CANDIDATE_COMMIT=process.env.CANDIDATE_COMMIT;}
    const hashes={};
    for(const file of git(root,'ls-files','src','index.html','assets','vendor','package.json','package-lock.json').split('\n').filter(Boolean).sort())hashes[file]=hash(await fs.readFile(path.join(root,file)));
    const source={root,commit,hashes,fingerprint:hash(JSON.stringify(hashes))};
    const build=await buildMobileRelease({root,outputRoot:path.join(output,label),writeSourceBuildInfo:false,gitCommit:commit});
    const verified=await verifyRuntime(build.output);
    assert.equal(git(root,'status','--porcelain'),'','Release build changed source checkout.');
    assert.equal(build.sourceBuildInfoWritten,false);
    const shipped=verified.records.map(record=>record.path);
    assert.ok(!shipped.some(file=>/\.(blend|fbx|obj|py|mjs|md|txt)$/.test(file)||/^\/(?:tests|scripts|artifacts|docs|art-reviews)\//.test(file)),'Authoring/evidence files leaked into game runtime.');
    const rendererModules=shipped.filter(file=>/three(?:\.module|\.core)?(?:\.min)?\.js$/.test(file));
    assert.deepEqual(rendererModules.sort(),['/vendor/three.core.js','/vendor/three.module.js']);
    report.releases[label]={...build,source,artifactSha256:verified.artifactSha256,files:verified.records,descriptor:verified.release};
    report.checks.push(label+': isolated clean detached checkout; exact inventory hashes; generated build-info confined to output; authoring excluded; single pinned renderer module pair.');
  }
  assert.notEqual(roots.A,roots.B,'A and B must have distinct isolated checkouts.');
  assert.notEqual(report.releases.A.buildId,report.releases.B.buildId,'Actual A and B releases must differ.');
  const a=report.releases.A.source.hashes,b=report.releases.B.source.hashes;
  const protectedFiles=['src/simulation.js','src/terrain.js','src/city-layout.js','src/vertical-city.js','src/variants.js','src/weapon-layout.js','src/main.js','src/offline.js','src/release-fetch-worker.js','src/save-transfer.js'];
  for(const file of protectedFiles){assert.ok(a[file]&&b[file],'Missing protected module '+file);assert.equal(a[file],b[file],file+' changed during visual-only migration.');}
  for(const file of ['pwa/service-worker.js','pwa/manifest.webmanifest'])assert.equal(hash(await fs.readFile(path.join(roots.A,file))),hash(await fs.readFile(path.join(roots.B,file))),file+' changed during visual migration.');
  report.checks.push('Simulation, terrain, construction/layout, variant/weapon rules, controls, saves, updater, worker and app manifest bytes are preserved.');
  report.changedRuntime=report.releases.B.descriptor.files.filter(file=>report.releases.A.descriptor.files.find(old=>old.url===file.url)?.sha256!==file.sha256).map(file=>({url:file.url,bytes:file.bytes,sha256:file.sha256}));
  report.byteDelta=report.releases.B.totalBytes-report.releases.A.totalBytes;
  report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(output,'build-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,releases:Object.fromEntries(Object.entries(report.releases).map(([k,v])=>[k,{buildId:v.buildId,commit:v.source.commit,output:v.output,artifactSha256:v.artifactSha256,totalBytes:v.totalBytes}])),failure:report.failure,report:path.join(output,'build-report.json')},null,2));
