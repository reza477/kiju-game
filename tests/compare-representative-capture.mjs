import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const dir=new URL('../artifacts/representative-crawler/',import.meta.url);
const read=async name=>JSON.parse(await fs.readFile(new URL(name,dir),'utf8'));
const before=await read('before/report.json'),after=await read('after/report.json');
assert.ok(!before.failure&&!after.failure,'Both real-game runs must finish');
assert.deepEqual(before.environment,after.environment,'Machine, renderer, camera or quality conditions differ');
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<.000001,`${label}: ${a} != ${b}`);
for(const old of before.shots){
  const now=after.shots.find(s=>s.name===old.name);assert.ok(now);
  for(const key of['x','z','time','angle'])close(old[key],now[key],old.name+'/'+key);
  for(const key of['camera','aim'])old[key].forEach((v,i)=>close(v,now[key][i],old.name+'/'+key+i));
  assert.equal(old.moving,now.moving);
}
assert.equal(before.runs.length,3);assert.equal(after.runs.length,3);
for(let i=0;i<3;i++)for(const key of['x','z','time'])close(before.runs[i].end[key],after.runs[i].end[key],`run${i}/${key}`);
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const summary={conditions:before.environment,matchingGameplayViews:before.shots.map(s=>s.name),motionFramesPerBuild:720,metrics:{}};
for(const metric of['frameIntervalMs','mainCpuMs','gpuMs']){
  const entry=summary.metrics[metric]={};
  entry.available=[...before.runs,...after.runs].every(r=>r[metric]?.samples>0&&Number.isFinite(r[metric].median)&&Number.isFinite(r[metric].p95)&&(metric!=='gpuMs'||r.disjoint===0));
  if(!entry.available){entry.reason='Timing is unavailable, incomplete or GPU-disjoint; no numeric comparison is valid.';continue;}
  for(const phase of['before','after']){
    const source=phase==='before'?before:after,values=source.runs.map(r=>r[metric].median);
    entry[phase]={median:median(values),runMedians:values,medianP95:median(source.runs.map(r=>r[metric].p95))};
  }
  entry.changePercent=(entry.after.median/entry.before.median-1)*100;
}
summary.limitations='Headless Chrome on this one PC. Fixed simulation time through the real main loop with real keyboard movement, scheduled by native RAF. CPU, GPU and frame interval are separate measurements; this is not a foreground FPS guarantee. Fresh isolated profiles; no original user save modified. No mobile hardware test.';
await fs.writeFile(new URL('comparison.json',dir),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
