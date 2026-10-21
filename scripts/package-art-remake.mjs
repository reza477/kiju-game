// Reporting only. This script never starts the game, browser, tests, benchmark,
// critic, deployment or account action. It only reads existing evidence and Git.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';

const root=fileURLToPath(new URL('..',import.meta.url));
const help=`Usage: node scripts/package-art-remake.mjs --after DIR --final COMMIT --output NEW_DIR [--metadata FILE] [--before DIR] [--baseline COMMIT]

Defaults: --before artifacts/art-remake/before; --baseline 96ab478
Both capture folders must contain report.json in art-remake-v1 capture format,
with five verified crawler views. --metadata may override beforeReport/afterReport.
All paths are project-relative unless absolute. Output must not already exist.

Optional metadata JSON:
{
  "summary": "Actual implementation and gate outcome, without inferred passes.",
  "changeReport": "docs/ART_REMAKE_REPORT.md",
  "results": ["artifacts/art-remake/unit-test-results.txt"],
  "performance": ["artifacts/art-remake/performance-summary.txt"],
  "reviews": ["art-reviews/art-remake-round-01.md"],
  "extraTools": ["artifacts/art-remake/before/capture-tool.mjs"],
  "missingEvidence": ["Physical phone verification was not performed."],
  "verification": "artifacts/art-remake/package-verification.json"
}
Evidence selections accept a path string or {"path":"...","commit":"..."}.
A commit selection reads that exact Git version; otherwise the existing file is
read. Review contents are reproduced verbatim. No absent result implies a pass.
Capture source hashes must match selected commits, with explicit LF/CRLF-only
reconciliation allowed for text. Every other mismatch blocks packaging. Pairing
requires the same fixture, profile, lighting, HUD and camera controls. Missing
screenshots cannot produce a compliant 20-file package and block output.
`;
const args={};
for(let i=2;i<process.argv.length;i++){
  const key=process.argv[i];if(key==='--help'){console.log(help);process.exit(0);}
  assert.ok(['--after','--final','--output','--metadata','--before','--baseline'].includes(key),'Unknown argument: '+key);
  assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),'Missing value for '+key);
  assert.equal(args[key],undefined,'Duplicate argument: '+key);args[key]=process.argv[++i];
}
for(const key of['--after','--final','--output'])assert.ok(args[key],help);
const resolve=file=>path.isAbsolute(file)?path.normalize(file):path.resolve(root,file);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const pretty=value=>JSON.stringify(value,null,2);
const git=(...values)=>execFileSync('git',values,{cwd:root,maxBuffer:256*1024*1024});
const commitOf=value=>git('rev-parse','--verify',value+'^{commit}').toString().trim();
const baseline=commitOf(args['--baseline']||'96ab478'),final=commitOf(args['--final']);
assert.notEqual(baseline,final,'Baseline and final must be different commits.');
const before=resolve(args['--before']||'artifacts/art-remake/before'),after=resolve(args['--after']),output=resolve(args['--output']);
let config={},configRecord=null;
if(args['--metadata']){const file=resolve(args['--metadata']),bytes=await fs.readFile(file);config=JSON.parse(bytes);configRecord={path:file,bytes:bytes.length,sha256:sha(bytes)};}
const files=new Map(),missing=[...(config.missingEvidence||[])],evidence=[],sourceReconciliations=[];
const runtimeRoots=['src','assets','vendor','index.html','package.json','package-lock.json'];
const textPath=file=>/\.(?:js|mjs|cjs|css|html|json|py|md|txt|yml|yaml|webmanifest|cmd|ps1|toml)$/.test(file)||file.endsWith('/LICENSE');
const isRuntime=file=>/^(?:src|assets|vendor|pwa)\//.test(file)||['index.html','server.mjs','package.json','package-lock.json'].includes(file);
const isTool=file=>/^(?:tests|scripts)\//.test(file);
function inventory(commit){
  const hashes={},buffers=new Map();
  const names=git('ls-tree','-r','--name-only','-z',commit,'--',...runtimeRoots).toString().split('\0').filter(Boolean).sort();
  for(const file of names){const bytes=git('show',commit+':'+file);hashes[file]=sha(bytes);buffers.set(file,bytes);}
  return{commit,hashes,buffers,fingerprint:sha(JSON.stringify(hashes))};
}
const sources={BEFORE:inventory(baseline),AFTER:inventory(final)};
function matchesCommitted(hash,file,source,where){
  assert.ok(source.buffers.has(file),where+': file is not in selected committed inventory: '+file);
  if(hash===source.hashes[file])return;
  const bytes=source.buffers.get(file);
  if(textPath(file)&&!bytes.includes(0)){
    const lf=bytes.toString('utf8').replace(/\r\n/g,'\n'),variants=[Buffer.from(lf),Buffer.from(lf.replace(/\n/g,'\r\n'))];
    if(variants.some(bytes=>sha(bytes)===hash)){
      sourceReconciliations.push({where,file,recordedSha256:hash,committedSha256:source.hashes[file],difference:'LF/CRLF line endings only'});return;
    }
  }
  throw new Error(where+': content does not match selected commit: '+file);
}
function validateSnapshot(snapshot,label,where){
  const expected=sources[label];assert.ok(snapshot?.hashes&&snapshot?.fingerprint,where+': missing full source identity');
  assert.equal(sha(JSON.stringify(snapshot.hashes)),snapshot.fingerprint,where+': internally inconsistent source fingerprint');
  assert.deepEqual(Object.keys(snapshot.hashes).sort(),Object.keys(expected.hashes).sort(),where+': inventory differs from commit');
  for(const[file,hash]of Object.entries(snapshot.hashes))matchesCommitted(hash,file,expected,where);
  return{recordedCommit:snapshot.commit??'NOT RECORDED',selectedCommit:expected.commit,recordedFingerprint:snapshot.fingerprint,committedFingerprint:expected.fingerprint,status:snapshot.status??'NOT RECORDED'};
}
// Packaging/instruction changes outside the capture's runtime inventory are
// disclosed below. Runtime edits after the selected final commit are rejected.
for(const[file]of sources.AFTER.buffers)matchesCommitted(sha(await fs.readFile(path.join(root,file))),file,sources.AFTER,'Current working runtime');
assert.equal(git('ls-files','--others','--exclude-standard','--','src','assets','vendor').toString().trim(),'','Uncommitted runtime additions must be resolved before packaging.');

async function readSelection(selection,{required=false}={}){
  const row=typeof selection==='string'?{path:selection}:selection;
  assert.ok(row?.path,'Evidence selection needs a path.');
  let bytes,origin;
  try{
    if(row.commit){const commit=commitOf(row.commit);bytes=git('show',commit+':'+row.path);origin={path:row.path,commit};}
    else{const file=resolve(row.path);bytes=await fs.readFile(file);origin={path:file};}
  }catch(error){if(required||row.commit||error.code!=='ENOENT')throw error;missing.push(row.path+': NOT RECORDED');return null;}
  assert.ok(!bytes.includes(0),'Binary content cannot be included as text: '+row.path);
  const record={...origin,bytes:bytes.length,sha256:sha(bytes)};evidence.push(record);
  const text=bytes.toString('utf8');assert.ok(!/data:(?:image|audio|video)\/[^;]+;base64,[A-Za-z0-9+/]{64}/.test(text),'Embedded media is prohibited: '+row.path);
  let value;try{value=JSON.parse(text);}catch{}
  return{record,bytes,text,value};
}
const complete=(name,bytes,origin)=>`===== BEGIN ${name} =====\n${origin}\nBytes: ${bytes.length}\nSHA-256: ${sha(bytes)}\n----- COMPLETE CONTENTS -----\n${bytes.toString('utf8')}\n===== END ${name} =====\n\n`;
const write=(name,text)=>{assert.ok(!files.has(name));files.set(name,Buffer.from(text,'utf8'));};

const crcTable=Uint32Array.from({length:256},(_,value)=>{for(let i=0;i<8;i++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
function inspectPng(bytes){
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Expected original PNG');
  let offset=8,ihdr,end=false;const idat=[];
  while(offset<bytes.length){
    assert.ok(offset+12<=bytes.length);const n=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),stop=offset+12+n;assert.ok(stop<=bytes.length);
    let crc=0xffffffff;for(const byte of bytes.subarray(offset+4,offset+8+n))crc=crcTable[(crc^byte)&255]^(crc>>>8);
    assert.equal((crc^0xffffffff)>>>0,bytes.readUInt32BE(offset+8+n),'PNG CRC mismatch');
    const chunk=bytes.subarray(offset+8,offset+8+n);if(type==='IHDR')ihdr=chunk;if(type==='IDAT')idat.push(chunk);
    if(type==='IEND'){end=true;assert.equal(stop,bytes.length);}offset=stop;
  }
  assert.ok(ihdr&&end&&idat.length);assert.equal(ihdr.length,13);
  const width=ihdr.readUInt32BE(0),height=ihdr.readUInt32BE(4),channels={2:3,6:4}[ihdr[9]];
  assert.ok(width&&height&&width<=16384&&height<=16384&&channels);assert.equal(ihdr[8],8);assert.equal(ihdr[12],0);
  const stride=width*channels,packed=inflateSync(Buffer.concat(idat),{maxOutputLength:(stride+1)*height});assert.equal(packed.length,(stride+1)*height);
  const pixels=Buffer.alloc(stride*height),paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=packed[y*(stride+1)];assert.ok(filter<=4);
    for(let x=0;x<stride;x++){
      const at=y*stride+x,a=x>=channels?pixels[at-channels]:0,b=y?pixels[at-stride]:0,c=y&&x>=channels?pixels[at-stride-channels]:0;
      const prediction=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      pixels[at]=(packed[y*(stride+1)+1+x]+prediction)&255;
    }
  }
  return{width,height,channels,pixelSha256:sha(pixels)};
}
const views=[['desktop-normal-city','DESKTOP_NORMAL_CITY'],['desktop-reverse','DESKTOP_REVERSE'],['desktop-close','DESKTOP_CLOSE'],['phone-portrait-city','PHONE_PORTRAIT_EMULATION'],['phone-landscape-city','PHONE_LANDSCAPE_EMULATION']];
const reports={};
for(const[label,folder]of[['BEFORE',before],['AFTER',after]]){
  const item=await readSelection(config[label==='BEFORE'?'beforeReport':'afterReport']||path.join(folder,'report.json'),{required:true}),r=item.value;
  assert.ok(r,'Capture report must be JSON');assert.equal(r.protocol,'art-remake-v1');assert.equal(r.mode,'capture');assert.equal(r.passed,true);
  assert.equal(r.visits.length,5,'Need exactly the five matched views, not intermediate captures');
  const start=validateSnapshot(r.sourceStart,label,label+' capture start'),finish=validateSnapshot(r.sourceFinish,label,label+' capture finish');
  assert.equal(start.recordedFingerprint,finish.recordedFingerprint,'Source changed during captures');
  reports[label]={...item,folder,identity:start};
}
const photos=[],pairs=[];
for(const[name,title]of views){const pair=[];
  for(const label of['BEFORE','AFTER']){
    const report=reports[label],visit=report.value.visits.find(v=>v.name===name);assert.ok(visit,label+' missing view: '+name);assert.equal(visit.passed,true);
    assert.equal(visit.faction,'crawler');assert.equal(visit.variant,'standard');
    for(const key of['errors','failedRequests','remoteRequests'])assert.deepEqual(visit[key],[],label+' '+name+' '+key);
    const s=visit.capture;assert.ok(s);assert.equal(s.hud,true);assert.equal(s.paused,false);assert.equal(s.speed,1);assert.equal(s.mode,'expedition');assert.equal(s.dialog,false);assert.equal(s.overflow,false);assert.equal(s.contextLost,false);assert.deepEqual(s.shaderFailures,[]);
    const image=visit.image;assert.equal(image?.original,true);assert.equal(image.phoneEmulation,name.startsWith('phone-'));
    const original=path.resolve(image.path);assert.equal(path.dirname(original),report.folder,'Selected originals must remain inside their explicitly selected capture folder');
    const bytes=await fs.readFile(original),png=inspectPng(bytes);assert.equal(bytes.length,image.bytes);assert.equal(sha(bytes),image.sha256);assert.equal(png.width,image.width);assert.equal(png.height,image.height);
    const filename=String(files.size+1).padStart(2,'0')+'_'+title+'_'+label+'.png';files.set(filename,bytes);
    const photo={filename,label,view:name,original,bytes:bytes.length,sha256:sha(bytes),...png,capturedAt:image.capturedAt??'NOT RECORDED',phoneEmulation:image.phoneEmulation,source:report.identity,report:report.record,execution:{command:report.value.command??'NOT RECORDED',startedAt:report.value.startedAt??'NOT RECORDED',finishedAt:report.value.finishedAt??'NOT RECORDED',exitCode:report.value.exitCode??'NOT RECORDED'},visit};photos.push(photo);pair.push(photo);
  }
  const[a,b]=pair;assert.equal(a.width,b.width);assert.equal(a.height,b.height);assert.deepEqual(a.visit.profileSettings,b.visit.profileSettings);assert.equal(a.visit.fixture.sha256,b.visit.fixture.sha256);
  const x=a.visit.capture,y=b.visit.capture;for(const key of['faction','variant','x','z','angle','worldDamage','buildings','towerOrder','quality','light'])assert.deepEqual(x[key],y[key],name+': unmatched '+key);
  for(const key of['view','mode'])assert.equal(x.camera[key],y.camera[key]);const cameraDelta={};
  for(const key of['yaw','pitch','zoom']){cameraDelta[key]=y.camera[key]-x.camera[key];assert.ok(Math.abs(cameraDelta[key])<.025,name+': camera '+key+' mismatch');}
  pairs.push({view:name,matched:true,cameraDelta,nativeElapsedTimeDelta:y.time-x.time,beforeDrawingBuffer:[x.render.canvasWidth,x.render.canvasHeight],afterDrawingBuffer:[y.render.canvasWidth,y.render.canvasHeight],note:'Original screenshot dimensions, fixture, viewport/profile, HUD, quality, light and native camera frame match. Drawing-buffer differences are disclosed separately; elapsed time and animation pose are not fabricated.'});
}
assert.equal(new Set(photos.map(p=>p.original)).size,10);assert.equal(new Set(photos.map(p=>p.sha256)).size,10);assert.equal(new Set(photos.map(p=>p.pixelSha256)).size,10,'Ten visually distinct originals required');
const changes=git('diff','--no-renames','--name-status','-z',baseline,final,'--').toString().split('\0').filter(Boolean),changed=[];
for(let i=0;i<changes.length;i+=2)changed.push({status:changes[i],file:changes[i+1]});
const header=`COLOSSUS WAKE — ART REMAKE REVIEW\n\nBaseline commit: ${baseline}\nFinal implementation/reporting commit: ${final}\nBaseline committed runtime/assets/dependencies SHA-256: ${sources.BEFORE.fingerprint}\nFinal committed runtime/assets/dependencies SHA-256: ${sources.AFTER.fingerprint}\nBEFORE tested raw-file fingerprint: ${reports.BEFORE.identity.recordedFingerprint}\nAFTER tested raw-file fingerprint: ${reports.AFTER.identity.recordedFingerprint}\nEvidence selection: ${configRecord?pretty(configRecord):'No metadata file supplied.'}\nRecorded capture commits can precede final packaging; full file hashes, not a branch label, determine equivalence. Newline-only differences are itemized in screenshot metadata. Packaging runs no game, test, benchmark or art review.\n\n`;
function sourceContents(rows){return rows.map(row=>{
  const commit=row.status==='D'?baseline:final,bytes=git('show',commit+':'+row.file),origin=`Committed ${row.status}; ${commit}${row.status==='D'?'; deleted file shown from baseline':''}`;
  return textPath(row.file)?complete(row.file,bytes,origin):`BINARY ASSET INVENTORY ONLY: ${row.file}\n${origin}\nBytes: ${bytes.length}\nSHA-256: ${sha(bytes)}\nOriginal source asset retained locally; no binary/base64 media embedded in upload texts.\n\n`;
}).join('');}
write('13_COMMITTED_IMPLEMENTATION_DIFF.txt',header+git('diff','--no-ext-diff','--no-textconv','--no-renames',baseline,final,'--').toString());
write('14_COMPLETE_CHANGED_RUNTIME.txt',header+sourceContents(changed.filter(row=>isRuntime(row.file))));
let toolText=header+sourceContents(changed.filter(row=>isTool(row.file)));
for(const selected of config.extraTools||[]){const item=await readSelection(selected);if(item)toolText+=complete(item.record.path,item.bytes,'Existing evidence tool; '+pretty(item.record));}
write('15_COMPLETE_CHANGED_TESTS_AND_TOOLS.txt',toolText);
let changeText=header;
if(config.changeReport){const item=await readSelection(config.changeReport);if(item)changeText+=complete(item.record.path,item.bytes,'Selected change report; '+pretty(item.record));}
else missing.push('Authored change report: NOT RECORDED. The committed change inventory follows.');
changeText+='\nCOMPLETE COMMITTED CHANGE INVENTORY\n'+changed.map(row=>row.status+' '+row.file).join('\n')+'\n\nPOST-COMMIT WORKTREE STATUS AT PACKAGING\n'+(git('status','--short').toString()||'Clean\n')+'\nPackaging/instruction/evidence changes are not silently attributed to the tested runtime.\n';
write('12_CHANGE_REPORT.txt',changeText);
const statuses=[];
async function evidenceText(selection,kind){
  let result='';if(!selection?.length){missing.push(kind+': NOT RECORDED / no evidence selected.');return kind+': NOT RECORDED / no evidence selected.\n';}
  for(const selected of selection){const item=await readSelection(selected);if(!item){result+=(typeof selected==='string'?selected:selected.path)+': NOT RECORDED\n';continue;}
    const v=item.value||{},startField=['startedAt','startTime','started','startedUtc'].find(key=>v[key]!==undefined&&v[key]!==null),finishField=['finishedAt','endedAt','endTime','finished','finishedUtc'].find(key=>v[key]!==undefined&&v[key]!==null);
    const status={kind,...item.record,command:v.command??'NOT RECORDED',startedAt:startField?v[startField]:'NOT RECORDED',finishedAt:finishField?v[finishField]:'NOT RECORDED',exitCode:v.exitCode??'NOT RECORDED',passed:v.passed??'NOT RECORDED'};
    if(startField)status.startedAtSourceField=startField;
    if(finishField)status.finishedAtSourceField=finishField;
    if(v.recorderExitCode!==undefined)status.recorderExitCode=v.recorderExitCode;
    // Preserve explicit test-source evidence. Do not infer which revision an
    // ordinary text log tested when its execution wrapper did not record it.
    if(v.sourceStart&&v.sourceFinish){status.recordedSourceStart=v.sourceStart.fingerprint??'NOT RECORDED';status.recordedSourceFinish=v.sourceFinish.fingerprint??'NOT RECORDED';}
    statuses.push(status);result+=pretty(status)+'\n'+complete(item.record.path,item.bytes,'Existing recorded evidence; contents reproduced without truncation.');
  }return result;
}
write('16_EXISTING_TEST_RESULTS.txt',header+'No tests were rerun for this package. Missing execution metadata is NOT RECORDED. Historical failed results stay failed.\n\n'+await evidenceText(config.results,'Test results'));
write('17_PERFORMANCE_RESULTS.txt',header+'A bounded native requestAnimationFrame observation is not a benchmark, GPU time, sustained performance, thermal result or before/after speedup. Phone browser emulation is not a physical device. Missing comparative measurements stay unverified.\n\n'+await evidenceText(config.performance,'Performance evidence'));
write('18_VERBATIM_INDEPENDENT_ART_REVIEWS.txt',header+'Independent reviews below are verbatim. Scores and findings are never rewritten by this packager. A passing capture harness is not an art or release pass.\n\n'+await evidenceText(config.reviews,'Independent art reviews'));
write('19_SCREENSHOT_METADATA.txt',header+'Original PNG bytes retained unchanged. No cropping, resizing, retouching, replacement or re-encoding. Phone views are EMULATION.\n\n'+pretty({pairs,sourceReconciliations,photos,evidence,packagingTool:{path:fileURLToPath(import.meta.url),sha256:sha(await fs.readFile(fileURLToPath(import.meta.url)))}})+'\n');
write('11_READ_ME.txt',header+(config.summary||'Review the selected change report and independent art review for the actual result.')+'\n\nCONTENTS\n01–10: five matched BEFORE/AFTER gameplay pairs (normal City, reverse, close, phone portrait EMULATION, phone landscape EMULATION).\n11 read-me; 12 change report; 13 committed diff; 14 complete changed runtime text and binary asset inventory; 15 complete changed test/tool source; 16 existing test results; 17 performance; 18 verbatim independent reviews; 19 screenshot provenance; 20 manifest.\n\nRECORDED EXECUTION METADATA\n'+pretty(statuses)+'\n\nMISSING EVIDENCE / LIMITATIONS\n'+(missing.length?missing.map(v=>'- '+v).join('\n'):'No explicitly selected evidence file is missing. Presence does not imply a pass.')+'\nPhysical phone/Safari, offline update, thermal/battery, sustained performance and deployment are unverified unless an explicitly selected report provides that evidence.\n\n20 files total: 10 screenshots + 10 text files.\nOpen the folder, select its contents and drag the 20 files into ChatGPT.\n');
assert.equal(files.size,19);const entries=[...files].sort(([a],[b])=>a.localeCompare(b)).map(([name,bytes])=>({name,bytes:bytes.length,sha256:sha(bytes)}));
const payload=entries.reduce((sum,row)=>sum+row.bytes,0);let total=payload,manifest='',converged=false;
for(let i=0;i<20;i++){
  manifest=`COLOSSUS WAKE — ART REMAKE FILE MANIFEST\n\n20 files total: 10 screenshots + 10 text files.\nTotal folder size INCLUDING this manifest: ${total} bytes.\nManifest excluded from hashing; the other 19 files follow.\nBaseline: ${baseline}\nFinal: ${final}\nFinal committed runtime fingerprint: ${sources.AFTER.fingerprint}\nAFTER tested raw fingerprint: ${reports.AFTER.identity.recordedFingerprint}\n\nFILENAME | BYTES | SHA-256\n${entries.map(row=>`${row.name} | ${row.bytes} | ${row.sha256}`).join('\n')}\n`;
  const next=payload+Buffer.byteLength(manifest);if(next===total){converged=true;break;}total=next;
}
assert.ok(converged,'Manifest self-size did not converge');write('20_FILE_MANIFEST.txt',manifest);assert.equal([...files.values()].reduce((sum,b)=>sum+b.length,0),total);
// A fresh directory and exclusive writes preserve every earlier raw or packaged
// evidence set. This reporter never removes or overwrites evidence.
await fs.mkdir(output);for(const[name,bytes]of files)await fs.writeFile(path.join(output,name),bytes,{flag:'wx'});
const written=await fs.readdir(output,{withFileTypes:true});assert.equal(written.length,20);assert.ok(written.every(entry=>entry.isFile()));assert.equal(written.filter(v=>v.name.endsWith('.png')).length,10);assert.equal(written.filter(v=>v.name.endsWith('.txt')).length,10);
for(const[name,bytes]of files)assert.deepEqual(await fs.readFile(path.join(output,name)),bytes,'Copied output differs: '+name);
const verification={verifiedAt:new Date().toISOString(),output,totalBytes:total,files:20,screenshots:10,textFiles:10,baseline,final,committedFingerprints:{before:sources.BEFORE.fingerprint,after:sources.AFTER.fingerprint},testedFingerprints:{before:reports.BEFORE.identity.recordedFingerprint,after:reports.AFTER.identity.recordedFingerprint},uniqueImageHashes:10,uniqueDecodedPixelHashes:10,originalDimensionsAndBytesPreserved:true,manifestVerified:true,sourceReconciliations,missingEvidence:missing,gameTestBenchmarkReviewReruns:false};
const verificationPath=config.verification?resolve(config.verification):output+'-verification.json';assert.notEqual(path.dirname(verificationPath),output,'Verification JSON must remain outside the flat upload folder.');await fs.writeFile(verificationPath,pretty(verification)+'\n',{flag:'wx'});
console.log(pretty({...verification,verificationPath}));
