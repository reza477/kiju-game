import assert from 'node:assert/strict';
import http from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installHostAuthorization } from '../scripts/hosted-smoke.mjs';

// A synthetic credential only. No hosting account/token is used in this test.
const fakeSecret = 'synthetic-regression-value';
let sameOriginAuthorized = false, foreignRequests = 0, foreignCredential = false;
const foreign = http.createServer((request, response) => {
  foreignRequests++; foreignCredential ||= !!request.headers['x-vercel-protection-bypass'];
  response.writeHead(200, {'Content-Type':'text/html'}).end('<title>Foreign fixture</title>');
});
await new Promise(resolve => foreign.listen(0,'127.0.0.1',resolve));
const foreignOrigin = `http://127.0.0.1:${foreign.address().port}`;
const home = http.createServer((request,response) => {
  sameOriginAuthorized ||= request.headers['x-vercel-protection-bypass'] === fakeSecret;
  if (request.url === '/redirect') response.writeHead(302,{Location:`${foreignOrigin}/`}).end();
  else response.writeHead(200,{'Content-Type':'text/html'}).end('<title>Host fixture</title>');
});
await new Promise(resolve => home.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${home.address().port}`;
const browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
try {
  const context = await browser.newContext();
  await installHostAuthorization(context,origin,fakeSecret,{allowLoopbackForTest:true});
  const page = await context.newPage();
  await page.goto(origin);
  assert.equal(await page.title(),'Host fixture');
  await page.goto(`${origin}/redirect`).catch(()=>{});
  assert.equal(sameOriginAuthorized,true);
  assert.equal(foreignRequests,0,'Foreign redirect must be blocked before any request');
  assert.equal(foreignCredential,false);
  await mkdir('artifacts/delivery',{recursive:true});
  const report = {syntheticCredentialOnly:true,sameOriginAuthorized,foreignRequests,foreignCredential,passed:true};
  await writeFile('artifacts/delivery/credential-scope.json',JSON.stringify(report,null,2));
  console.log('PASS authentication header is sent only to exact host; foreign redirect blocked.');
} finally {
  await browser.close(); home.closeAllConnections(); foreign.closeAllConnections();
  await Promise.all([new Promise(resolve=>home.close(resolve)),new Promise(resolve=>foreign.close(resolve))]);
}
