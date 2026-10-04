// Freeze actual A/B revisions in separate release checkouts before running.
// This tool never publishes, mutates build-info, or invents a synthetic B.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildMobileRelease} from '../scripts/build-mobile-release.mjs';
import {verifyRuntime} from '../scripts/delivery-lib.mjs';
import {stripOnlyGroundBootPreload} from './helpers/ground-release-main.mjs';

const output = path.resolve(process.env.OUTPUT_DIR || 'artifacts/ground-dressing/release-final');
const git = (root, ...args) => execFileSync('git', args, {cwd:root, encoding:'utf8', maxBuffer:32*1024*1024}).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const meshyPilot=true;
const report = {startedAt:new Date().toISOString(), command:{executable:process.execPath,args:process.argv.slice(1),environment:{}}, releases:{}, checks:[], passed:false};
for(const key of ['MESHY_PILOT','BASELINE_COMMIT','CANDIDATE_COMMIT','OUTPUT_DIR'])if(process.env[key]!==undefined)report.command.environment[key]=process.env[key];
await fs.mkdir(output,{recursive:true});
await assert.rejects(fs.access(path.join(output,'build-report.json')),'Do not overwrite existing release evidence.');
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
    if(label==='A')assert.equal(commit,process.env.BASELINE_COMMIT||'7c1496f8dc63522a55384d27e7c22e230bc5ded3');
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
    if(meshyPilot&&label==='B'){
      const modules=['/src/meshy-pilot.js','/vendor/GLTFLoader.js','/vendor/BufferGeometryUtils.js','/vendor/SkeletonUtils.js'];
      for(const url of modules){const file=verified.release.files.find(record=>record.url===url);assert.ok(file,'Local pilot dependency missing: '+url);assert.equal(file.sha256,source.hashes[url.slice(1)],'Shipped pilot dependency differs from exact source: '+url);}
      const models=[];
      for(const kind of ['rock','pine','broadleaf']){
        const url='/assets/scenery/meshy-pilot/'+kind+'.glb',file=verified.release.files.find(record=>record.url===url);assert.ok(file,'Required local pilot model missing: '+url);assert.equal(file.type,'model/gltf-binary');assert.ok(file.bytes>28);assert.equal(file.sha256,source.hashes[url.slice(1)],'Packaged GLB differs from frozen source: '+url);models.push(file);
      }
      report.pilotInventory={modules,models,modelBytes:models.reduce((sum,file)=>sum+file.bytes,0)};
      report.checks.push('B: all three exact frozen pilot GLBs, glTF MIME, local loader dependencies and original pinned Three pair are in the offline inventory.');
      const groundFiles=[];
      for(const url of ['/src/ground-patch.js','/src/ground-dressing.js','/src/valley-ground-detail.js','/assets/materials/westbank-ground-colour.png','/assets/materials/westbank-ground-relief.png']){
        const file=verified.release.files.find(record=>record.url===url);
        assert.ok(file,'Required new ground dependency missing: '+url);
        assert.equal(file.sha256,source.hashes[url.slice(1)],'Packaged ground dependency differs from frozen source: '+url);
        if(url.endsWith('.png')){
          assert.equal(file.type,'image/png');const bytes=await fs.readFile(path.join(root,url.slice(1)));
          assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),1024);assert.equal(bytes.readUInt32BE(20),512);
        }
        groundFiles.push(file);
      }
      report.groundInventory={files:groundFiles,totalBytes:groundFiles.reduce((sum,file)=>sum+file.bytes,0)};
      report.checks.push('B: both new local ground PNG maps and all three ground runtime modules have exact source hashes and correct PNG dimensions/MIME in the offline inventory.');
    }
    report.checks.push(label+': isolated clean detached checkout; exact inventory hashes; generated build-info confined to output; authoring excluded; single pinned renderer module pair.');
  }
  assert.notEqual(roots.A,roots.B,'A and B must have distinct isolated checkouts.');
  assert.notEqual(report.releases.A.buildId,report.releases.B.buildId,'Actual A and B releases must differ.');
  const a=report.releases.A.source.hashes,b=report.releases.B.source.hashes;
  const protectedFiles=['src/simulation.js','src/terrain.js','src/city-layout.js','src/vertical-city.js','src/variants.js','src/weapon-layout.js','src/main.js','src/offline.js','src/release-fetch-worker.js','src/save-transfer.js'];
  for(const file of protectedFiles){
    assert.ok(a[file]&&b[file],'Missing protected module '+file);
    if(meshyPilot&&file==='src/main.js'){
      const before=await fs.readFile(path.join(roots.A,file)),after=await fs.readFile(path.join(roots.B,file)),stripped=stripOnlyGroundBootPreload(after);
      assert.deepEqual(stripped,before,'Protected main.js changed beyond the exact import and immediate boot preload.');
      report.protectedMain={baselineSha256:hash(before),candidateSha256:hash(after),candidateAfterExactGroundRemovalSha256:hash(stripped),byteIdenticalAfterExactRemovals:true,exception:"Only the new loadGroundPatch import and replacing the previous Meshy await with Promise.all of Meshy and ground before GameScene. No normalization or other exemptions."};
    }else assert.equal(a[file],b[file],file+' changed during visual-only migration.');
  }
  for(const file of ['pwa/service-worker.js','pwa/manifest.webmanifest'])assert.equal(hash(await fs.readFile(path.join(roots.A,file))),hash(await fs.readFile(path.join(roots.B,file))),file+' changed during visual migration.');
  report.checks.push('Simulation, terrain, construction/layout, variant/weapon rules, saves, updater, worker and app manifest bytes are preserved. '+(meshyPilot?'Main controls/save/boot bytes match after exactly the ground import/preload change is reversed, preserving the previous Meshy preload.':'Main controls and boot bytes are preserved.'));
  report.changedRuntime=report.releases.B.descriptor.files.filter(file=>report.releases.A.descriptor.files.find(old=>old.url===file.url)?.sha256!==file.sha256).map(file=>({url:file.url,bytes:file.bytes,sha256:file.sha256}));
  report.byteDelta=report.releases.B.totalBytes-report.releases.A.totalBytes;
  report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(output,'build-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,releases:Object.fromEntries(Object.entries(report.releases).map(([k,v])=>[k,{buildId:v.buildId,commit:v.source.commit,output:v.output,artifactSha256:v.artifactSha256,totalBytes:v.totalBytes}])),failure:report.failure,report:path.join(output,'build-report.json')},null,2));
