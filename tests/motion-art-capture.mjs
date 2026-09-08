// Neutral complete-stride fixtures, captured at five phases from three angles.
// The reviewer runs this independently; it does not score or alter product code.
import {createRequire} from 'node:module';import path from 'node:path';import {homedir} from 'node:os';import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/motion-art');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:960}}),report={screenshots:[],errors:[],remote:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
try{
 await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>window.__colossus);await page.locator('#begin').click();await page.locator('[data-view="carrier"]').click();
 for(const [place,x,z] of [['level',-70,-15],['slope',-43,11]]){
  await page.evaluate(({x,z})=>{const {state,scene}=window.__colossus;state.x=x;state.z=z;state.angle=Math.PI/2;state.target=null;state.paused=true;state.moving=false;scene.update(state,.1,null);}, {x,z});
  for(let phase=0;phase<=4;phase++){
   await page.evaluate(({x,z,phase})=>{const {state,scene}=window.__colossus;for(let i=0;i<8;i++){state.x=x+phase*2.2+(i-7)*.275;state.z=z;state.time+=.025;state.moving=true;scene.update(state,.025,null);}}, {x,z,phase});
   for(const [angle,yaw] of [['front',Math.PI/2+.25],['side',Math.PI],['back',-Math.PI/2+.25]]){
    await page.evaluate(yaw=>{const s=window.__colossus.scene;s.yaw=yaw;s.pitch=.2;s.zoom=74;},yaw);await page.waitForTimeout(1000);
    const file=`${place}-${angle}-${phase}.png`;await page.screenshot({path:path.join(out,file),style:'#paused-banner,#toast{visibility:hidden!important}'});report.screenshots.push(file);
   }
  }
 }
}catch(e){report.failure=e.message;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'motion-capture-report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
