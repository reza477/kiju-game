// Local packaging verification only; no server, browser, update or publication.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildMobileRelease,canonicalRuntimeBytes} from '../scripts/build-mobile-release.mjs';
import {verifyRuntime} from '../scripts/delivery-lib.mjs';
const toolRoot=fileURLToPath(new URL('..',import.meta.url)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/carrier-assets/release-final-4');
assert.ok(process.env.CANDIDATE_RELEASE_ROOT,'Explicit clean detached release checkout required.');
assert.match(process.env.CANDIDATE_COMMIT??'',/^[0-9a-f]{40}$/,'Explicit committed candidate SHA required.');
assert.match(process.env.EXPECTED_SOURCE_FINGERPRINT??'',/^[0-9a-f]{64}$/,'Explicit tested source fingerprint required.');
const root=await fs.realpath(process.env.CANDIDATE_RELEASE_ROOT);
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0,'Do not overwrite prior release evidence.');
async function source(){const hashes={};for(const file of git(root,'ls-files','src','assets','vendor','index.html','package.json','package-lock.json').split('\n').filter(Boolean).sort())hashes[file]=hash(await fs.readFile(path.join(root,file)));return{root,commit:git(root,'rev-parse','HEAD'),hashes,fingerprint:hash(JSON.stringify(hashes))};}
const report={startedAt:new Date().toISOString(),command:{executable:process.execPath,args:process.argv.slice(1),environment:{CANDIDATE_RELEASE_ROOT:root,CANDIDATE_COMMIT:process.env.CANDIDATE_COMMIT,EXPECTED_SOURCE_FINGERPRINT:process.env.EXPECTED_SOURCE_FINGERPRINT,OUTPUT_DIR:out}},checks:[],passed:false};
try{
 assert.notEqual(await fs.realpath(toolRoot),root,'Use the isolated release checkout, not the working candidate.');
 assert.equal(git(root,'status','--porcelain'),'','Release checkout must be clean.');assert.equal(git(root,'branch','--show-current'),'','Release checkout must be detached.');
 report.sourceStart=await source();assert.equal(report.sourceStart.commit,process.env.CANDIDATE_COMMIT);assert.equal(report.sourceStart.fingerprint,process.env.EXPECTED_SOURCE_FINGERPRINT);
 report.tools={};for(const file of ['scripts/build-mobile-release.mjs','scripts/delivery-lib.mjs']){const bytes=await fs.readFile(path.join(toolRoot,file));assert.deepEqual(bytes,await fs.readFile(path.join(root,file)),'Current verification tool differs from frozen checkout: '+file);report.tools[file]=hash(bytes);}
 report.build=await buildMobileRelease({root,outputRoot:path.join(out,'runtime'),writeSourceBuildInfo:false,gitCommit:report.sourceStart.commit});
 const verified=await verifyRuntime(report.build.output);report.artifactSha256=verified.artifactSha256;report.descriptor=verified.release;report.files=verified.records;
 assert.equal(report.build.sourceBuildInfoWritten,false);assert.equal(verified.release.gitCommit,report.sourceStart.commit);
 for(const file of verified.records)assert.ok(!/^\/(?:tests|scripts|artifacts|docs|art-reviews)\//.test(file.path)&&!/[.](?:blend|fbx|obj|py|mjs|md|txt)$/.test(file.path),'Authoring/evidence file leaked into runtime: '+file.path);
 assert.deepEqual(verified.records.filter(file=>/three(?:\.module|\.core)?(?:\.min)?\.js$/.test(file.path)).map(file=>file.path).sort(),['/vendor/three.core.js','/vendor/three.module.js']);
 report.carrierInventory=[];
 for(const url of ['/assets/carriers/meshy/cyborg.glb','/assets/carriers/meshy/flesh.glb','/src/impact-anchor.js','/src/meshy-carriers.js','/src/meshy-cyborg.js','/src/meshy-monster.js','/src/meshy-monster-city.js','/vendor/GLTFLoader.js','/vendor/SkeletonUtils.js']){
  const file=verified.release.files.find(file=>file.url===url);assert.ok(file,'Missing carrier runtime dependency: '+url);
  const bytes=canonicalRuntimeBytes(url.slice(1),await fs.readFile(path.join(root,url.slice(1))));assert.equal(file.sha256,hash(bytes));assert.equal(file.bytes,bytes.length);if(url.endsWith('.glb'))assert.equal(file.type,'model/gltf-binary');report.carrierInventory.push(file);
 }
 report.checks.push('Clean detached exact commit and tested source fingerprint; isolated builder left source build-info unchanged.','Complete runtime passed existing verifyRuntime byte/hash/unlisted-file checks, with one pinned Three module pair and no authoring/evidence payloads.','Both exact GLBs and required local carrier/loader modules are included with matching canonical source hashes, bytes and GLB MIME.');
 assert.equal(git(root,'status','--porcelain'),'','Isolated release build changed its source checkout.');report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{report.sourceFinish=await source();report.sourceStable=report.sourceStart?.fingerprint===report.sourceFinish.fingerprint;if(!report.sourceStable){report.passed=false;process.exitCode=1;}report.finishedAt=new Date().toISOString();report.exitCode=process.exitCode||0;await fs.writeFile(path.join(out,'build-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,sourceStable:report.sourceStable,exitCode:report.exitCode,build:report.build,artifactSha256:report.artifactSha256,report:path.join(out,'build-report.json'),failure:report.failure},null,2));}
