// Local integration checks for the Windows launcher. Conflict fixtures own only
// ephemeral test ports; no existing service or browser is stopped or modified.
import assert from 'node:assert/strict';
import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const execute=promisify(execFile),root=fileURLToPath(new URL('..',import.meta.url));
const launcher=path.join(root,'Play.ps1'),checks=[];
for(const[name,status,body,headers]of[
 ['unrelated app',200,'<html><title>Two Year Forge fixture</title></html>',{}],
 ['old game copy',200,JSON.stringify({app:'colossus-wake-local',version:1,rootId:'different-checkout'}),{}],
 ['legacy ambiguous health',200,JSON.stringify({app:'colossus-wake-local',version:1}),{}],
 ['other app without health endpoint',404,'Not found',{}],
 ['other app server error',500,'Server error',{}],
 ['redirect to another app',302,'',{Location:'/unrelated-app'}]
]){
 const requests=[];
 const server=http.createServer((req,res)=>{requests.push(req.url);res.writeHead(status,{'Content-Type':'text/html',...headers});res.end(body);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 try{
  let error;
  try{await execute('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',launcher,'-AppWindow'],{cwd:path.dirname(root),env:{...process.env,PORT:String(port),COLOSSUS_LAUNCH_DEBUG:'1'},timeout:20000});}catch(e){error=e;}
  assert.ok(error,`${name} unexpectedly opened`);assert.equal(error.code,1);
  assert.match(error.stdout,/another app or an older game copy/);
  assert.deepEqual(requests,['/health'],'Only the identity endpoint may be consulted before rejecting a conflict');
  assert.ok(server.listening,'Existing unrelated listener was stopped');
  checks.push(`${name}: rejected without opening or stopping it`);
 }finally{await new Promise(resolve=>server.close(resolve));}
}
const exe=await fs.readFile(path.join(root,'Colossus Wake.exe'));
const pe=exe.readUInt32LE(0x3c);assert.equal(exe.readUInt32LE(pe),0x4550);
assert.equal(exe.readUInt16LE(pe+24+68),2,'Executable must use GUI subsystem, not create a console');
checks.push('compiled executable uses the Windows GUI subsystem');
await fs.mkdir(path.join(root,'artifacts/desktop-launcher'),{recursive:true});
await fs.writeFile(path.join(root,'artifacts/desktop-launcher/guard-checks.json'),JSON.stringify({checks},null,2));
console.log(JSON.stringify({checks},null,2));
