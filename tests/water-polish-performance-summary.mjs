// Reporting only. Reads completed before/after water runs; never opens a browser.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [beforePath,afterPath,output]=process.argv.slice(2);assert.ok(beforePath&&afterPath&&output,'baseline/report.json candidate/report.json new-output-stem');
await assert.rejects(fs.access(output+'.json'));await assert.rejects(fs.access(output+'.txt'));
const bytes=await Promise.all([beforePath,afterPath].map(p=>fs.readFile(p))),[a,b]=bytes.map(v=>JSON.parse(v));
const sha=v=>createHash('sha256').update(v).digest('hex');
for(const r of [a,b]){assert.equal(r.passed,true);assert.equal(r.protocol,'water-polish-native-v1');assert.equal(r.mode,'timing');assert.equal(r.sourceStable,true);assert.equal(r.cleanup.ownedBrowserClosed,true);assert.equal(r.visits.length,3);}
assert.equal(a.label,'baseline');assert.equal(b.label,'candidate');assert.equal(a.planSha256,b.planSha256);assert.deepEqual(a.selectedCases,b.selectedCases);assert.deepEqual(a.toolHashes,b.toolHashes,'Compared timing drivers must be identical');
const result={createdAt:new Date().toISOString(),inputReports:[beforePath,afterPath].map((p,i)=>({path:path.resolve(p),bytes:bytes[i].length,sha256:sha(bytes[i])})),
  source:{before:{commit:a.sourceStart.commit,fingerprint:a.sourceStart.fingerprint},after:{commit:b.sourceStart.commit,fingerprint:b.sourceStart.fingerprint}},
  method:'One sequential A/B set. Three profiles; each has two fifteen-second stationary water windows and two short native routes with first/warm traversal. These are whole-game timings at a water-facing City camera. Screenshots and video are excluded from timed windows. No synthetic time, geometry changes or per-window scene mutation.',
  limitations:b.limitations,comparisons:[],passed:true};
const num=v=>v==null?'UNAVAILABLE':Number(v).toFixed(2),lines=['WATER POLISH — RECORDED NATIVE PERFORMANCE',result.method,'',`BEFORE ${result.source.before.commit} / ${result.source.before.fingerprint}`,`AFTER ${result.source.after.commit} / ${result.source.after.fingerprint}`];
for(let i=0;i<a.visits.length;i++){
  const x=a.visits[i],y=b.visits[i];assert.equal(x.name,y.name);assert.equal(x.closed,true);assert.equal(y.closed,true);assert.deepEqual(x.fixture,y.fixture);assert.deepEqual(x.browser,y.browser);assert.deepEqual(x.profile,y.profile);assert.deepEqual(x.cameraInput.target,y.cameraInput.target);assert.deepEqual(x.waterStart.geometry,y.waterStart.geometry);
  for(const r of [x,y]){assert.deepEqual(r.errors,[]);assert.deepEqual(r.failedRequests,[]);assert.deepEqual(r.remoteRequests,[]);assert.equal(r.windows.length,6);}
  const row={name:x.name,profile:x.profile,browser:x.browser,waterGeometryIdentical:true,waterBefore:x.waterStart,waterAfter:y.waterStart,resourceBefore:{render:x.initial.render,memory:x.initial.memory,programs:x.initial.programCount},resourceAfter:{render:y.initial.render,memory:y.initial.memory,programs:y.initial.programCount},warningsBefore:x.warnings,warningsAfter:y.warnings,startupsBefore:x.startups,startupsAfter:y.startups,windows:[]};
  lines.push('',x.name);
  for(let j=0;j<x.windows.length;j++){
    const p=x.windows[j],q=y.windows[j];assert.equal(p.label,q.label);assert.equal(p.kind,q.kind);assert.deepEqual(p.driverMetadataAfterRoute,q.driverMetadataAfterRoute);
    for(const w of [p,q]){assert.equal(w.focusLost,false);assert.equal(w.contextLost,false);assert.equal(w.gpuTimingRequested,true);}
    const summarize=w=>({label:w.label,kind:w.kind,warmth:w.warmth,wallDurationMs:w.wallDurationMs,reciprocalMeanFps:w.reciprocalMeanFps,frameIntervalMs:w.frameIntervalMs,callbackWallMs:w.mainCallbackMs,gpuMs:w.gpuMs,renderCalls:w.renderCalls,renderTriangles:w.renderTriangles,queryAccounting:w.queryAccounting,gpuExtension:w.gpuExtension,inputToFirstCompletedMovingFrameMs:w.firstRenderedMovementMs,start:w.start,end:w.end,waypoints:w.waypoints??null});
    const paired={label:p.label,before:summarize(p),after:summarize(q),delta:{frameP95Ms:q.frameIntervalMs.p95-p.frameIntervalMs.p95,callbackP95Ms:q.mainCallbackMs.p95-p.mainCallbackMs.p95,gpuP95Ms:p.gpuMs.p95==null||q.gpuMs.p95==null?null:q.gpuMs.p95-p.gpuMs.p95},nativeStartDelta:Object.fromEntries(['x','z','angle','time','population'].map(k=>[k,q.start.state[k]-p.start.state[k]]))};row.windows.push(paired);
    lines.push(p.label);for(const [name,w]of [['BEFORE',p],['AFTER',q]])lines.push(`  ${name}: reciprocal mean ${num(w.reciprocalMeanFps)} FPS; RAF p50/p95/p99 ${num(w.frameIntervalMs.median)}/${num(w.frameIntervalMs.p95)}/${num(w.frameIntervalMs.p99)} ms; >50/>100 ${w.frameIntervalMs.above50}/${w.frameIntervalMs.above100}; ${w.frameIntervalMs.samples} frames.`,`    Callback p50/p95/p99 ${num(w.mainCallbackMs.median)}/${num(w.mainCallbackMs.p95)}/${num(w.mainCallbackMs.p99)} ms; GPU ${num(w.gpuMs.median)}/${num(w.gpuMs.p95)}/${num(w.gpuMs.p99)} ms; queries ${JSON.stringify(w.queryAccounting)}.`,`    Draw median ${num(w.renderCalls.median)}; triangle median ${num(w.renderTriangles.median)}; input to first completed moving frame ${num(w.firstRenderedMovementMs)} ms.`);
  }
  result.comparisons.push(row);
}
lines.push('','LIMITATIONS',...result.limitations.map(v=>'- '+v),'- Renderer.info memory gives counts, not measured GPU/CPU byte totals.','- No art, performance or release acceptance is inferred from successful collection.');
await fs.writeFile(output+'.json',JSON.stringify(result,null,2)+'\n');await fs.writeFile(output+'.txt',lines.join('\n')+'\n');console.log(JSON.stringify({passed:true,profiles:result.comparisons.length,windowsPerBuild:result.comparisons.reduce((n,c)=>n+c.windows.length,0),output}));
