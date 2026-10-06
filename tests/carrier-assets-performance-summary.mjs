// Reporting only: consumes recorded native runs, never launches a game/browser.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function summarize(values){
  const a=values.filter(Number.isFinite).sort((a,b)=>a-b),sum=a.reduce((s,v)=>s+v,0);
  return{samples:a.length,p50:a[Math.floor(a.length*.5)]??null,p95:a[Math.floor(a.length*.95)]??null,p99:a[Math.floor(a.length*.99)]??null,mean:a.length?sum/a.length:null,max:a.at(-1)??null,above50:a.filter(n=>n>50).length,above100:a.filter(n=>n>100).length};
}
export function summarizeVisit(visit){
  const routes=visit.routes.map(r=>({label:r.label,warmth:r.warmth,wallMs:r.wallDurationMs,firstRenderedMovementMs:r.firstRenderedMovementMs,
    frame:summarize(r.frames.map(f=>f.interval)),callback:summarize(r.frames.map(f=>f.callback)),gpu:summarize(r.gpuSamplesMs||[]),gpuExtension:r.gpuExtension,queries:r.queryAccounting,
    calls:summarize(r.frames.map(f=>f.calls)),triangles:summarize(r.frames.map(f=>f.triangles)),fps:r.fps,focusLost:r.focusLost,contextLost:r.contextLost,
    movementMetres:Math.hypot(r.end.state.x-r.start.state.x,r.end.state.z-r.start.state.z),waypoints:r.waypoints.map(w=>({target:w.target,reached:[w.reached.x,w.reached.z],errorMetres:w.errorMetres})),
    driver:r.driverMetadataAfterRoute,diagnostic:r.diagnostic}));
  return{name:visit.name,variant:visit.variant,profile:visit.profile,closed:visit.closed,navigationToRendererReadyMs:visit.navigationToRendererReadyMs,startups:visit.startups,
    frame:summarize(visit.routes.flatMap(r=>r.frames.map(f=>f.interval))),callback:summarize(visit.routes.flatMap(r=>r.frames.map(f=>f.callback))),gpu:summarize(visit.routes.flatMap(r=>r.gpuSamplesMs||[])),
    calls:summarize(visit.routes.flatMap(r=>r.frames.map(f=>f.calls))),triangles:summarize(visit.routes.flatMap(r=>r.frames.map(f=>f.triangles))),routes,
    errors:visit.errors,failedRequests:visit.failedRequests,warnings:visit.warnings,initial:visit.initial,final:visit.capture,diagnostic:visit.finalDiagnostic};
}
export function compareRuns(before,after){
  assert.equal(before.passed,true,'Baseline run must pass');assert.equal(after.passed,true,'Candidate run must pass');
  assert.equal(before.mode,'timing');assert.equal(after.mode,'timing');assert.equal(before.label,'baseline');assert.equal(after.label,'candidate');
  assert.equal(before.planSha256,after.planSha256);assert.equal(before.routePlanSha256,after.routePlanSha256);
  assert.equal(before.cleanup?.ownedBrowserClosed,true);assert.equal(after.cleanup?.ownedBrowserClosed,true);
  const comparisons=[];
  for(let i=0;i<before.visits.length;i++){
    const a=before.visits[i],b=after.visits[i];assert.equal(a.name,b.name);assert.deepEqual(a.browser,b.browser);assert.equal(a.fixture.sha256,b.fixture.sha256);assert.deepEqual(a.profile,b.profile);assert.equal(a.closed,true);assert.equal(b.closed,true);
    assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);assert.deepEqual(a.remoteRequests,[]);assert.deepEqual(b.remoteRequests,[]);assert.deepEqual(a.failedRequests,[]);assert.deepEqual(b.failedRequests,[]);
    assert.deepEqual(a.cameraInput.target,b.cameraInput.target);assert.equal(a.routes.length,6);assert.equal(b.routes.length,6);
    for(let j=0;j<a.routes.length;j++){assert.equal(a.routes[j].label,b.routes[j].label);assert.deepEqual(a.routes[j].driverMetadataAfterRoute,b.routes[j].driverMetadataAfterRoute);for(const v of [a.routes[j],b.routes[j]]){assert.equal(v.focusLost,false);assert.equal(v.contextLost,false);assert.equal(v.gpuTimingRequested,true);}}
    const x=summarizeVisit(a),y=summarizeVisit(b),percent=(old,next)=>old>0?(next-old)/old*100:null;
    comparisons.push({name:a.name,before:x,after:y,delta:{frameP95Ms:y.frame.p95-x.frame.p95,frameP95Percent:percent(x.frame.p95,y.frame.p95),callbackP95Ms:y.callback.p95-x.callback.p95,gpuP95Ms:x.gpu.p95===null||y.gpu.p95===null?null:y.gpu.p95-x.gpu.p95,callsP50:y.calls.p50-x.calls.p50,trianglesP50:y.triangles.p50-x.triangles.p50,above50:y.frame.above50-x.frame.above50,above100:y.frame.above100-x.frame.above100}});
  }
  return{baseline:{commit:before.sourceStart.commit,runtime:before.productionSourceStart?.fingerprint??before.sourceStart.fingerprint,sourceFinish:before.sourceFinish.fingerprint,startedAt:before.startedAt,finishedAt:before.finishedAt},
    candidate:{commit:after.sourceStart.commit,runtime:after.sourceStart.fingerprint,sourceFinish:after.sourceFinish.fingerprint,startedAt:after.startedAt,finishedAt:after.finishedAt},
    method:`Matched initial saves, native City camera/HUD, three closed routes with first traversal and warmed repeat. One sequential A/B set, ${before.visits.length} carrier/profile visits per build. Pooled frame distributions below are descriptive; per-route first/warm observations remain separate. No median-of-three or statistical-significance claim.`,
    limitations:after.limitations,comparisons,matchedNativeStateDeltas:after.pairs,passed:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [beforePath,afterPath,output]=process.argv.slice(2);assert.ok(beforePath&&afterPath&&output,'Arguments: baseline/report.json candidate/report.json output-stem');
  await assert.rejects(fs.access(output+'.json'),'Use a new output stem.');await assert.rejects(fs.access(output+'.txt'),'Use a new output stem.');
  const a=await fs.readFile(beforePath),b=await fs.readFile(afterPath),r=compareRuns(JSON.parse(a),JSON.parse(b));
  r.inputReports=[{path:path.resolve(beforePath),sha256:sha(a)},{path:path.resolve(afterPath),sha256:sha(b)}];r.createdAt=new Date().toISOString();
  const n=v=>v===null?'UNAVAILABLE':Number(v).toFixed(2);
  const lines=['CARRIER ASSET NATIVE MOVEMENT / PERFORMANCE COMPARISON',r.method,'',`Baseline runtime fingerprint: ${r.baseline.runtime}`,`Candidate runtime fingerprint: ${r.candidate.runtime}`,'','Every A/B observation uses native RAF. Frame interval is not CPU time. Callback is wall time, including driver waits. GPU queries are separately accounted for.'];
  for(const c of r.comparisons){lines.push('',c.name);for(const [label,v]of [['BEFORE',c.before],['AFTER',c.after]]){lines.push(`${label}: frame interval p50/p95/p99 ${n(v.frame.p50)}/${n(v.frame.p95)}/${n(v.frame.p99)} ms; mean reciprocal ${n(1000/v.frame.mean)} FPS; frames ${v.frame.samples}; stalls >50/>100ms ${v.frame.above50}/${v.frame.above100}.`,`  callback p50/p95/p99 ${n(v.callback.p50)}/${n(v.callback.p95)}/${n(v.callback.p99)} ms; GPU p50/p95/p99 ${n(v.gpu.p50)}/${n(v.gpu.p95)}/${n(v.gpu.p99)} ms (${v.gpu.samples} valid queries).`,`  median submitted draw calls ${n(v.calls.p50)}; triangles ${n(v.triangles.p50)}. Renderer-ready navigation ${n(v.navigationToRendererReadyMs)} ms; startup ${JSON.stringify(v.startups)}.`);for(const route of v.routes)lines.push(`  ${route.label}: frame p50/p95/p99 ${n(route.frame.p50)}/${n(route.frame.p95)}/${n(route.frame.p99)}, callback p95 ${n(route.callback.p95)}, GPU p95 ${n(route.gpu.p95)} ms; native input→first completed moving frame ${n(route.firstRenderedMovementMs)} ms; queries ${JSON.stringify(route.queries)}.`);}lines.push(`Delta: frame p95 ${n(c.delta.frameP95Ms)} ms (${n(c.delta.frameP95Percent)}%); median calls ${n(c.delta.callsP50)}; median triangles ${n(c.delta.trianglesP50)}.`);}
  lines.push('','LIMITATIONS',...r.limitations.map(v=>'- '+v),'','No art, performance, release, deployment or device gate is implicitly cleared by a passing recording harness.');
  await fs.writeFile(output+'.json',JSON.stringify(r,null,2)+'\n');await fs.writeFile(output+'.txt',lines.join('\n')+'\n');console.log(JSON.stringify({passed:r.passed,comparisons:r.comparisons.length,output}));
}
