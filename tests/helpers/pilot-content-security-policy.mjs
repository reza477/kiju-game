import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Validate, do not manufacture or relax, the policy returned by the actual
// candidate game server. Only local embedded GLB image decoding needs blob:.
export function assertPilotContentSecurityPolicy(header){
  assert.ok(typeof header==='string'&&header.length>0&&!/[\r\n]/.test(header),'Candidate did not return one CSP header.');
  const entries=header.split(';').map(value=>value.trim()).filter(Boolean).map(value=>value.split(/\s+/));
  assert.equal(new Set(entries.map(([name])=>name)).size,entries.length,'Duplicate CSP directives are not allowed.');
  const actual=Object.fromEntries(entries.map(([name,...values])=>[name,values.slice().sort()]));
  const expected={
    'default-src':["'self'"],'script-src':["'self'"],
    'style-src':["'self'","'unsafe-inline'"],
    'img-src':["'self'",'blob:'],'font-src':["'self'"],
    'media-src':["'self'"],'connect-src':["'self'",'blob:'],
    'worker-src':["'self'"],'object-src':["'none'"],
    'base-uri':["'none'"],'form-action':["'none'"],'frame-ancestors':["'none'"],
  };
  assert.deepEqual(actual,expected,'Actual candidate CSP differs from the intended local/blob policy; do not invent a bypass.');
  return header;
}

export async function readPilotContentSecurityPolicy(gameURL,sourceRoot){
  assert.ok(gameURL,'MESHY_PILOT=1 requires GAME_TEST_URL for the actual candidate local server policy.');
  const base=new URL(gameURL);assert.ok(base.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(base.hostname),'Use the actual loopback game server, never a remote policy source.');
  assert.ok(!base.username&&!base.password,'No credentials belong in a local policy URL.');
  const get=async route=>{const response=await fetch(new URL(route,base),{redirect:'error',signal:AbortSignal.timeout(10000)});assert.equal(response.status,200,'Candidate server policy source did not return 200.');return response;};
  const health=await(await get('/health')).json(),hash=value=>createHash('sha256').update(value).digest('hex');
  assert.equal(health.app,'colossus-wake-local');assert.equal(health.rootId,hash(sourceRoot.replaceAll('\\','/').toLowerCase()),'Policy source is not this candidate source checkout.');
  const response=await get('/'),header=assertPilotContentSecurityPolicy(response.headers.get('Content-Security-Policy'));
  await response.arrayBuffer();
  return{sourceURL:new URL('/',base).href,observedAt:new Date().toISOString(),health,header,sha256:hash(header),method:'Exact actual local candidate server header, validated then reused unchanged for both frozen releases; not a hosted-origin or Safari claim.'};
}
