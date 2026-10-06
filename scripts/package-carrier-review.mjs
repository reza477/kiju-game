// Reporting only: reads committed source and recorded evidence. Never runs the
// game, a browser, tests, benchmarks, a review, deployment or an account action.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';

const root=fileURLToPath(new URL('..',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:128*1024*1024});
assert.ok(process.env.HANDOFF_CONFIG,'Supply an explicit evidence selection JSON through HANDOFF_CONFIG.');
const configPath=path.resolve(process.env.HANDOFF_CONFIG),configBytes=await fs.readFile(configPath),config=JSON.parse(configBytes);
const resolve=file=>path.isAbsolute(file)?file:path.resolve(root,file);
const baseline=git('rev-parse',config.baseline+'^{commit}').toString().trim(),final=git('rev-parse',config.final+'^{commit}').toString().trim();
const implementationBaseline=config.implementationBaseline?git('rev-parse',config.implementationBaseline+'^{commit}').toString().trim():baseline;
assert.notEqual(baseline,final);const output=resolve(config.output),files=new Map(),missing=[...(config.missingEvidence||[])],provenance=[];
const pretty=value=>JSON.stringify(value,null,2);
const write=(name,text)=>files.set(name,Buffer.from(text,'utf8'));
function inventory(commit){const hashes={};for(const file of git('ls-tree','-r','--name-only',commit,'--','src','assets','vendor','index.html','package.json','package-lock.json').toString().trim().split('\n').filter(Boolean).sort())hashes[file]=sha(git('show',commit+':'+file));return{commit,hashes,fingerprint:sha(JSON.stringify(hashes))};}
const sources={A:inventory(baseline),B:inventory(final)};
const implementationSource=implementationBaseline===baseline?sources.A:inventory(implementationBaseline);
for(const [file,hash]of Object.entries(sources.B.hashes))assert.equal(sha(await fs.readFile(path.join(root,file))),hash,'Working runtime differs from selected final commit: '+file);
assert.equal(git('ls-files','--others','--exclude-standard','src','assets','vendor').toString().trim(),'','New runtime must be committed before packaging.');
const reviewTitle=config.title||'COLOSSUS WAKE — MESHY CARRIER ASSET PASS';
const header=`${reviewTitle}\n\nScreenshot comparison baseline commit: ${baseline}\nCumulative implementation/diff baseline commit: ${implementationBaseline}\nFinal local reporting/implementation commit: ${final}\nScreenshot baseline runtime/assets/dependencies fingerprint: ${sources.A.fingerprint}\nCumulative baseline runtime/assets/dependencies fingerprint: ${implementationSource.fingerprint}\nFinal runtime/assets/dependencies fingerprint: ${sources.B.fingerprint}\nEvidence selection: ${configPath}\nEvidence selection SHA-256: ${sha(configBytes)}\nPackaging performs no game/test/review runs.\n\n`;
const complete=(name,bytes,origin)=>`===== BEGIN ${name} =====\n${origin}\nBytes: ${bytes.length}\nSHA-256: ${sha(bytes)}\n----- COMPLETE CONTENTS -----\n${bytes.toString('utf8')}\n===== END ${name} =====\n\n`;
async function existing(file,{required=false,json=false}={}){
  const absolute=resolve(file);
  try{const bytes=await fs.readFile(absolute);provenance.push({path:absolute,bytes:bytes.length,sha256:sha(bytes)});return{file:absolute,bytes,text:bytes.toString('utf8'),value:json?JSON.parse(bytes):null};}
  catch(error){if(error.code!=='ENOENT'||required)throw error;missing.push(absolute+': NOT RECORDED');return{file:absolute,missing:true,text:'NOT RECORDED\n'};}
}
function sourceMatch(actual,label,where){assert.ok(actual?.fingerprint,where+': source fingerprint is missing.');assert.equal(actual.fingerprint,sources[label].fingerprint,where+': wrong source.');}
const crcTable=Uint32Array.from({length:256},(_,value)=>{for(let i=0;i<8;i++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
function pngDimensions(bytes){
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');let offset=8,ihdr,end=false;const idat=[];
  while(offset<bytes.length){const n=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),stop=offset+12+n;assert.ok(stop<=bytes.length);let crc=0xffffffff;for(const byte of bytes.subarray(offset+4,offset+8+n))crc=crcTable[(crc^byte)&255]^(crc>>>8);assert.equal((crc^0xffffffff)>>>0,bytes.readUInt32BE(offset+8+n),'PNG CRC mismatch');const chunk=bytes.subarray(offset+8,offset+8+n);if(type==='IHDR')ihdr=chunk;if(type==='IDAT')idat.push(chunk);if(type==='IEND'){end=true;assert.equal(stop,bytes.length);}offset=stop;}
  assert.ok(ihdr&&end&&idat.length);const width=ihdr.readUInt32BE(0),height=ihdr.readUInt32BE(4),channels={2:3,6:4}[ihdr[9]];assert.ok(width&&height&&channels);assert.equal(ihdr[8],8);assert.equal(ihdr[12],0);const pixels=inflateSync(Buffer.concat(idat)),row=1+width*channels;assert.equal(pixels.length,row*height);for(let i=0;i<height;i++)assert.ok(pixels[i*row]<=4);return[width,height];
}
const captureReports={};
for(const label of ['A','B']){
  const report=await existing(config.captures[label],{required:true,json:true});assert.equal(report.value.mode,'capture');assert.equal(report.value.passed,true);assert.ok(report.value.visits.length>=5);
  sourceMatch(label==="A"?(report.value.productionSourceStart??report.value.sourceStart):report.value.sourceStart,label,'Capture '+label+' start');sourceMatch(label==="A"?(report.value.productionSourceFinish??report.value.sourceFinish):report.value.sourceFinish,label,'Capture '+label+' finish');captureReports[label]=report;
}
assert.equal(captureReports.A.value.protocol,captureReports.B.value.protocol);assert.equal(captureReports.A.value.protocol,config.protocol||"carrier-assets-native-v1");assert.ok(config.variantsByView,"Explicit carrier identity per matched view is required.");
const mappings=[['DESKTOP_NORMAL','desktop-normal'],['DESKTOP_REVERSE','desktop-reverse'],['DESKTOP_CLOSE','desktop-close'],['PHONE_PORTRAIT_EMULATION','phone-portrait'],['PHONE_LANDSCAPE_EMULATION','phone-landscape']],photos=[],matches=[];
for(const [title,name]of mappings){const pair=[];
  for(const label of ['A','B']){
    const source=captureReports[label],visit=source.value.visits.find(visit=>visit.name===config.variantsByView[name]+"-"+name);assert.ok(visit&&visit.capture&&visit.image);assert.equal(visit.closed,true);assert.deepEqual(visit.errors,[]);assert.deepEqual(visit.failedRequests,[]);assert.deepEqual(visit.remoteRequests,[]);
    assert.equal(visit.capture.hud.visible,true);for(const key of ['dialogOpen','pauseOverlay','horizontalOverflow'])assert.equal(visit.capture.hud[key],false);assert.equal(visit.capture.state.paused,false);assert.equal(visit.capture.state.speed,1);
    const original=path.resolve(visit.image.path);const bytes=await fs.readFile(original),dimensions=pngDimensions(bytes);assert.equal(sha(bytes),visit.image.sha256);assert.equal(bytes.length,visit.image.bytes);assert.deepEqual(dimensions,visit.image.dimensions);
    const filename=String(files.size+1).padStart(2,'0')+'_'+title+'_'+(label==='A'?'BEFORE':'AFTER')+'.png';files.set(filename,bytes);
    const productionSource=label==='A'?(source.value.productionSourceStart??source.value.sourceStart):source.value.sourceStart;
    const photo={filename,label,original,report:source.file,reportSha256:sha(source.bytes),reportExecution:{command:source.value.command??'NOT RECORDED',startedAt:source.value.startedAt??'NOT RECORDED',finishedAt:source.value.finishedAt??'NOT RECORDED',exitCode:source.value.exitCode??'NOT RECORDED'},bytes:bytes.length,sha256:sha(bytes),dimensions,sourceCommit:productionSource.commit,sourceFingerprint:productionSource.fingerprint,
      captureReportWorktree:{commit:source.value.sourceStart.commit,fingerprint:source.value.sourceStart.fingerprint,unreferencedAdditions:source.value.unreferencedAdditions??[],note:'Full inventory when this capture report began. Reused originals retain their earlier report/path provenance in visit.reusedOriginal; the production fingerprint above identifies the verified loaded source for this capture.'},visit};photos.push(photo);pair.push(photo);
  }
  const[a,b]=pair;assert.deepEqual(a.dimensions,b.dimensions);assert.deepEqual(a.visit.fixture,b.visit.fixture);assert.deepEqual(a.visit.profile,b.visit.profile);assert.deepEqual(a.visit.browser,b.visit.browser);
  for(const key of ['viewport','deviceDpr','rendererDpr','drawingBuffer','quality','light'])assert.deepEqual(a.visit.capture.environment[key],b.visit.capture.environment[key],name+' '+key);
  for(const key of ['x','z','angle','paused','worldDamage'])assert.deepEqual(a.visit.capture.state[key],b.visit.capture.state[key],name+' state '+key);
  for(const key of ['view','mode'])assert.equal(a.visit.capture.environment.camera[key],b.visit.capture.environment.camera[key]);
  const cameraDelta={};for(const key of ['yaw','pitch','zoom','fov']){cameraDelta[key]=b.visit.capture.environment.camera[key]-a.visit.capture.environment.camera[key];assert.ok(Math.abs(cameraDelta[key])<.012,'Camera mismatch: '+key);}
  matches.push({name,cameraDelta,cameraAimDelta:b.visit.capture.environment.camera.aim.map((n,i)=>n-a.visit.capture.environment.camera.aim[i]),nativeTimeDelta:b.visit.capture.state.time-a.visit.capture.state.time,nativePopulationDelta:b.visit.capture.state.population-a.visit.capture.state.population,note:config.cameraNote??'Identical original fixture and normal camera controls. Native time/population and settled camera pose are observed, never replaced.'});
}
assert.equal(new Set(photos.map(photo=>photo.original)).size,10);assert.equal(new Set(photos.map(photo=>photo.sha256)).size,10,'Ten distinct original images required.');
const changed=git('diff','--no-renames','--name-status',implementationBaseline,final).toString().trim().split('\n').filter(Boolean).map(line=>{const[status,file]=line.split('\t');return{status,file};});
const textPath=file=>/\.(?:js|mjs|cjs|css|html|json|py|md|txt|svg|yml|yaml|webmanifest|cmd)$/.test(file)||file.endsWith('/LICENSE');
function sourceText(rows){let result='';for(const row of rows){const commit=row.status==='D'?implementationBaseline:final,bytes=git('show',commit+':'+row.file),origin=`Committed ${row.status}; source ${commit}${row.status==='D'?'; deleted file uses cumulative baseline contents':''}`;result+=textPath(row.file)?complete(row.file,bytes,origin):`BINARY INVENTORY ONLY: ${row.file}\n${origin}\nBytes: ${bytes.length}\nSHA-256: ${sha(bytes)}\nNo binary/base64 payload included.\n\n`;}return result;}
const runtime=changed.filter(row=>/^(?:src|assets|vendor|pwa)\//.test(row.file)||['index.html','server.mjs','package.json','package-lock.json'].includes(row.file));
const tools=changed.filter(row=>/^(?:tests|scripts)\//.test(row.file));
write('13_COMMITTED_IMPLEMENTATION_DIFF.txt',header+git('diff','--no-ext-diff','--no-renames',implementationBaseline,final,'--').toString());
write('14_COMPLETE_CHANGED_RUNTIME.txt',header+sourceText(runtime));
let toolText=header+sourceText(tools);for(const file of config.extraTools||[]){const item=await existing(file);toolText+=item.missing?item.file+': NOT RECORDED\n':complete(item.file,item.bytes,'Evidence tool; exact local source when packaging.');}write('15_COMPLETE_CHANGED_TESTS_AND_TOOLS.txt',toolText);
assert.ok(config.changeReport,'A committed change report is required.');let changeText=header+complete(config.changeReport,git('show',final+':'+config.changeReport),'Exact final committed report.');
for(const row of config.extraReports||[]){const file=typeof row==='string'?row:row.path,commit=typeof row==='string'?final:row.commit||final;changeText+=complete(file,git('show',commit+':'+file),'Verbatim historical report from '+commit+'; its tests describe its own recorded revision, not necessarily the current runtime.');}
write('12_CHANGE_REPORT.txt',changeText);
let testsText=header+'Recorded evidence only. Missing commands, timestamps and exit codes are explicitly NOT RECORDED; no inferred pass or invented execution metadata.\n\n';
const evidenceStatuses=[];
for(const selected of config.results||[]){
  const item=await existing(selected.path,{json:selected.json!==false});if(item.missing){testsText+=item.file+': NOT RECORDED\n\n';continue;}
  if(selected.source==='B'){sourceMatch(item.value.sourceStart,'B',item.file+' start');sourceMatch(item.value.sourceFinish,'B',item.file+' finish');}
  if(selected.identity){for(const [label,key]of [['A','baseline'],['B','current']])for(const row of item.value.source?.[key]||[])assert.equal(row.sha256,sources[label].hashes[row.file.replace(/^\//,'')],item.file+': wrong paired source '+row.file);}
  const value=item.value||{},metadata={path:item.file,startedAt:value.startedAt??'NOT RECORDED',finishedAt:value.finishedAt??'NOT RECORDED',command:value.command??'NOT RECORDED',exitCode:value.exitCode??'NOT RECORDED',passed:value.passed??'NOT RECORDED',selectedSourceRule:selected.source??'See report source/command metadata',sha256:sha(item.bytes)};
  evidenceStatuses.push(metadata);testsText+=pretty(metadata)+'\n'+complete(item.file,item.bytes,'Original recorded report/log.');
}
write('16_EXISTING_TEST_RESULTS.txt',testsText);
let performanceText=header+'RAF intervals, main-callback wall time and GPU query time are distinct. Desktop phone emulation is not physical-device evidence; estimates are not measured driver memory. The geometry-byte inventory traverses scene-reachable buffers; it excludes retained off-scene canonical instanced storage and authoring/placement items and is not total CPU memory. Original raw timing files remain outside this flat folder.\n\n';
for(const file of config.performance||[]){const item=await existing(file);performanceText+=item.missing?item.file+': NOT RECORDED\n':complete(item.file,item.bytes,'Original recorded performance summary/report.');}write('17_PERFORMANCE_RESULTS.txt',performanceText);
let reviews=header+'Independent reviews are reproduced verbatim. Historical gates remain preserved and are not reset by this new visual pass.\n\n';
assert.ok(config.reviews?.length,'Explicit independent review selection is required.');
for(const row of config.reviews){const file=typeof row==='string'?row:row.path,commit=typeof row==='string'?final:row.commit||final;reviews+=complete(file,git('show',commit+':'+file),'Verbatim independent review from '+commit+'.');}write('18_VERBATIM_ART_REVIEWS.txt',reviews);
write('19_SCREENSHOT_METADATA.txt',header+'Ten original PNGs, byte-for-byte copies. No edits, resizing, cropping, retouching or substitutions. Phone portrait and landscape are Windows browser EMULATION. Per-image exact timestamps are NOT RECORDED unless present in original capture data; use recorded visit bounds.\n\n'+pretty({matchingChecks:matches,photos}));
write('11_READ_ME.txt',header+`${config.summary||'Read the change report and independent review for the actual outcome.'}\n\nCONTENTS\n01–10: five matched BEFORE/AFTER views: desktop normal City, reverse, close; phone portrait EMULATION and landscape EMULATION.\n11 read-me; 12 change report; 13 committed implementation diff; 14 complete changed runtime; 15 complete changed tests/tools; 16 existing test results; 17 performance results; 18 verbatim independent reviews; 19 screenshot metadata; 20 manifest.\n\nEVIDENCED STATUS\n${pretty(evidenceStatuses)}\n\nMISSING EVIDENCE / LIMITATIONS\n${missing.length?missing.join('\n'):'All explicitly selected evidence files exist. Presence does not imply a passing result.'}\nGeometry-byte inventory covers scene-reachable buffers only; retained off-scene canonical instanced storage and authoring/placement items are excluded. It is not total CPU memory.\nPhysical iPhone/iPad, Safari, thermal/battery and long-session behavior remain unverified by these Windows tests. Existing unrestricted multiple-active-game save safety and failed art/release gates remain unresolved unless an actual separate recorded repair/review says otherwise. Local source and a local URL are not deployment.\n\n20 files total: 10 screenshots + 10 text files.\nOpen the folder, select its contents and drag the 20 files into ChatGPT.\n`);
assert.equal(files.size,19);const entries=[...files].sort(([a],[b])=>a.localeCompare(b)).map(([name,bytes])=>({name,bytes:bytes.length,sha256:sha(bytes)}));const payload=entries.reduce((sum,row)=>sum+row.bytes,0);let total=payload,manifest='';
for(let i=0;i<12;i++){manifest=`${reviewTitle} — REVIEW MANIFEST\n\n20 files total: 10 screenshots + 10 text files.\nTotal folder size INCLUDING this manifest: ${total} bytes.\nManifest excluded from hashing to avoid self-reference; the other 19 files follow.\nScreenshot baseline: ${baseline}\nCumulative implementation baseline: ${implementationBaseline}\nFinal: ${final}\nFinal runtime/assets/dependencies fingerprint: ${sources.B.fingerprint}\n\nFILENAME | BYTES | SHA-256\n${entries.map(row=>`${row.name} | ${row.bytes} | ${row.sha256}`).join('\n')}\n`;const next=payload+Buffer.byteLength(manifest);if(next===total)break;total=next;}
write('20_FILE_MANIFEST.txt',manifest);assert.equal([...files.values()].reduce((sum,bytes)=>sum+bytes.length,0),total);
await fs.mkdir(output);for(const[name,bytes]of files)await fs.writeFile(path.join(output,name),bytes,{flag:'wx'});
const written=await fs.readdir(output,{withFileTypes:true});assert.equal(written.length,20);assert.ok(written.every(file=>file.isFile()));assert.equal(written.filter(file=>file.name.endsWith('.png')).length,10);assert.equal(written.filter(file=>file.name.endsWith('.txt')).length,10);
for(const[name,bytes]of files)assert.deepEqual(await fs.readFile(path.join(output,name)),bytes,'Written file differs: '+name);
const verification={verifiedAt:new Date().toISOString(),output,files:20,screenshots:10,textFiles:10,totalBytes:total,baseline,implementationBaseline,final,fingerprints:{A:sources.A.fingerprint,B:sources.B.fingerprint},originalPixelsUnchanged:true,uniqueImageHashes:10,manifestVerified:true,missingEvidence:missing,selectedEvidence:provenance,sourceCheck:'Every current runtime file equals the selected final commit; capture A/B source fingerprints match their selected commits.',gameOrTestReruns:false};
await fs.writeFile(resolve(config.verification||'artifacts/carrier-assets/review-flat-verification.json'),pretty(verification)+'\n',{flag:'wx'});console.log(pretty(verification));
