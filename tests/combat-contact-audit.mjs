import {createRequire} from 'node:module';import path from 'node:path';import {homedir} from 'node:os';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/combat-contact');await fs.mkdir(out,{recursive:true});const report={cases:[],errors:[]},browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>window.__colossus);await page.locator('#begin').click();
 for(const target of ['crawler','airship','kaiju'])for(const speed of [1,2]){
  const result=await page.evaluate(async({target,speed})=>{
   const {createGame,startBattle,fire,tick,meleeReach}=await import('/src/simulation.js');const {scene,state}=window.__colossus;Object.assign(state,createGame('kaiju'));state.enemies[0].faction=target;scene.setGame(state);state.x=state.enemies[0].x;state.z=state.enemies[0].z;startBattle(state,state.enemies[0].id);const b=state.battle;b.player={x:-20,z:0,angle:Math.PI/2};b.enemy={x:-20+meleeReach('kaiju',target)-.5,z:0,angle:-Math.PI/2};b.enemyReload=999;b.autoFire=false;b.enemyHp=b.enemyMaxHp=5000;state.speed=speed;scene.update(state,.01,null);fire(state);scene.update(state,0,null);const f=scene.fx.find(f=>f.kind==='impact');const hiddenBeforeContact=!f.ball.visible&&!f.trail.visible;const samples=[];
   for(let i=0;i<Math.ceil(1.3/(.025*speed));i++){tick(state,.025);scene.update(state,.025,null);if(f.age>=.7&&f.age<=.92){const hand=scene.city.strikeHand.getWorldPosition(scene.camera.position.clone());const surface=f.anchor.object.localToWorld(f.anchor.local.clone());samples.push({age:f.age,hand:hand.toArray(),surface:surface.toArray(),error:hand.distanceTo(surface),reported:scene.city.strikeContactError,phase:scene.city.strikePhase,endError:f.end.distanceTo(surface)});}}
   state.paused=true;return{target,speed,hiddenBeforeContact,samples,finalRange:Math.hypot(b.enemy.x-b.player.x,b.enemy.z-b.player.z)};
  },{target,speed});report.cases.push(result);console.log(JSON.stringify({target,speed,first:result.samples[0],finalRange:result.finalRange}));
 }
 for(const result of report.cases){assert.ok(result.hiddenBeforeContact);assert.ok(result.samples.length>0);assert.ok(result.samples.every(s=>s.error<.35),'The real knuckle meets the moving target surface.');assert.ok(result.samples.every(s=>s.endError<.001),'Impact remains attached to the animated target mesh.');}
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=e.message;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'contact-report.json'),JSON.stringify(report,null,2));}
