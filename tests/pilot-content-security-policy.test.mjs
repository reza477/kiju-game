import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeliveryServer} from './helpers/delivery-server.mjs';
import {assertPilotContentSecurityPolicy} from './helpers/pilot-content-security-policy.mjs';

const policy="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; font-src 'self'; media-src 'self'; connect-src 'self' blob:; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const releases=()=>Object.fromEntries(['A','B'].map(label=>[label,{files:new Map([['/index.html',{bytes:Buffer.from('<title>'+label+'</title>'),type:'text/html'}]])}]));
// A real outage destroys sockets, but Node's global fetch pool can still reuse
// one before observing its close event. This header-policy test needs fresh
// connections across the outage, not retries or a changed server lifecycle.
const request=url=>fetch(url,{headers:{Connection:'close'}});
test('pilot validates the exact local/blob policy without rewriting its bytes',()=>{
  assert.equal(assertPilotContentSecurityPolicy(policy),policy);
  for(const value of [null,policy.replace("script-src 'self'","script-src 'self' 'unsafe-eval'"),policy.replace('img-src',"script-src blob:; img-src"),policy.replace("connect-src 'self' blob:","connect-src *"),policy.replace("img-src 'self' blob:","img-src 'self' blob: https://assets.example"),policy+'; report-uri https://example.test/',policy+'\nX-Header: other'])assert.throws(()=>assertPilotContentSecurityPolicy(value));
});
test('optional frozen-server policy is exact across A/B/outage while the default remains unchanged',async()=>{
  const plain=await createDeliveryServer(releases());
  try{const response=await request(plain.origin);assert.equal(response.headers.get('Content-Security-Policy'),null);assert.equal(await response.text(),'<title>A</title>');}finally{await plain.close();}
  const host=await createDeliveryServer(releases(),{contentSecurityPolicy:policy});
  try{
    for(const label of ['A','B']){host.select(label);const response=await request(host.origin);assert.equal(response.headers.get('Content-Security-Policy'),policy);assert.equal(response.headers.get('Content-Type'),'text/html');assert.equal(await response.text(),'<title>'+label+'</title>');}
    await host.close();await host.resume();const response=await request(host.origin);assert.equal(response.headers.get('Content-Security-Policy'),policy);assert.equal(await response.text(),'<title>B</title>');
  }finally{await host.close();}
  await assert.rejects(createDeliveryServer(releases(),{contentSecurityPolicy:'one\nother'}));
});
