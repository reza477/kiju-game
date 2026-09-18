// Read-only local serving/privacy checks; never contacts a public host.
import http from 'node:http';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:4188');assert.equal(base.hostname,'127.0.0.1');
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/alpha1/server');await fs.mkdir(out,{recursive:true});
const request=(url,method='GET',host=base.host)=>new Promise((resolve,reject)=>{const r=http.request({hostname:base.hostname,port:base.port,path:url,method,headers:{Host:host}},response=>{let body='';response.on('data',chunk=>body+=chunk);response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body}));});r.on('error',reject);r.end();});
const report={checks:[],errors:[]};
try{
 const root=await request('/');assert.equal(root.status,200);assert.match(root.body,/COLOSSUS/);assert.match(root.headers['content-security-policy'],/connect-src 'self'/);assert.equal(root.headers['cache-control'],'no-store');assert.equal(root.headers['x-content-type-options'],'nosniff');report.checks.push('Correct local game and private serving headers.');
 const health=await request('/health');assert.equal(JSON.parse(health.body).app,'colossus-wake-local');assert.match(JSON.parse(health.body).rootId,/^[a-f0-9]{64}$/);assert.equal(Object.keys(JSON.parse(health.body)).length,3);report.checks.push('Launcher health identifies this game without disclosing its local path.');
 const head=await request('/src/main.js','HEAD');assert.equal(head.status,200);assert.equal(head.body,'');assert.ok(Number(head.headers['content-length'])>0);report.checks.push('HEAD serves metadata without a body.');
 assert.equal((await request('/src/main.js','POST')).status,405);assert.equal((await request('/','GET','unrelated.example')).status,403);report.checks.push('Unsupported writes and unrelated Host headers are rejected.');
 for(const url of ['/AGENTS.md','/README.md','/package.json','/server.mjs','/tests/simulation.test.mjs','/art-reviews/round-01.md','/artifacts/alpha1/qa-audit.md','/.git/config','/src/../../README.md','/src/%2e%2e/%2e%2e/README.md','/src/%252e%252e/README.md','/src/main.js:secret','/src/main.js%00','/src/%5c..%5cREADME.md','/src/main.js.','/src/main.js%20','/src/']){
  const r=await request(url);assert.ok([400,403,404].includes(r.status),url);assert.ok(!r.body.includes('PRIVATE KEY'));report.checks.push(`Private or invalid path rejected: ${url}`);
 }
 assert.equal((await request('/%zz')).status,400);report.checks.push('Malformed URI rejected without a server error.');
}catch(error){report.errors.push(error.stack);process.exitCode=1;}
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
