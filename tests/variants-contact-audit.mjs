import {createRequire} from 'node:module';
import path from 'node:path';
import {homedir} from 'node:os';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/six-carrier-builder-01/contact');
await fs.mkdir(out,{recursive:true});
const report={cases:[],rangedCases:[],errors:[],remote:[],failures:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const cases=[
 ...['cyborg','flesh'].flatMap(variant=>['standard','drill'].map(targetVariant=>({faction:'kaiju',variant,targetFaction:'crawler',targetVariant,source:'player'}))),
 ...['cyborg','flesh'].map(targetVariant=>({faction:'crawler',variant:'drill',targetFaction:'kaiju',targetVariant,source:'player'})),
 {faction:'crawler',variant:'drill',targetFaction:'crawler',targetVariant:'standard',source:'player'},
 {faction:'kaiju',variant:'flesh',targetFaction:'crawler',targetVariant:'drill',source:'enemy'}
];
try{
 const context=await browser.newContext({viewport:{width:1440,height:960}});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:4178'||['blob:','data:'].includes(url.protocol))return route.continue();report.remote.push(url.href);return route.abort();});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 // Advance the unchanged simulation and scene explicitly so capture cost cannot
 // advance the animation between the contact measurement and its screenshot.
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
 await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>window.__colossus);
 await page.locator('#begin').click();
 for(const scenario of cases)for(const speed of [1,2]){
  const label=`${scenario.source}-${scenario.source==='enemy'?scenario.targetVariant:scenario.variant}-to-${scenario.source==='enemy'?scenario.variant:scenario.targetVariant}-speed-${speed}`;
  try{
   const setup=await page.evaluate(async({scenario,speed})=>{
    const sim=await import('/src/simulation.js'),T=await import('/vendor/three.module.js');
    const {scene,state}=window.__colossus;
    Object.assign(state,sim.createGame(scenario.faction,scenario.variant));
    const rival=state.enemies.find(e=>e.faction===scenario.targetFaction&&e.variant===scenario.targetVariant);
    if(!rival)throw Error('The actual new-game rival roster is missing the requested carrier variant.');
    scene.setGame(state);state.x=rival.x;state.z=rival.z;
    if(!sim.startBattle(state,rival.id))throw Error('Could not start battle.');
    const b=state.battle,enemySource=scenario.source==='enemy';
    const reach=enemySource?sim.meleeReach(scenario.targetFaction,scenario.faction,scenario.targetVariant,scenario.variant):sim.meleeReach(scenario.faction,scenario.targetFaction,scenario.variant,scenario.targetVariant);
    b.player={x:-20,z:0,angle:Math.PI/2};b.enemy={x:-20+reach-.5,z:0,angle:-Math.PI/2};
    b.enemyReload=enemySource?0:999;b.autoFire=false;state.speed=speed;
    scene.setCameraMode('steady');scene.update(state,.01,null);
    if(enemySource)sim.tick(state,.025);else if(!sim.fire(state))throw Error('Actual fire command was rejected.');
    scene.update(state,0,null);
    const fx=scene.fx.find(f=>f.kind==='impact'&&f.source===scenario.source);
    if(!fx)throw Error('No physical impact effect created by the real combat event.');
    const actor=fx.actor,target=fx.target,marker=actor.drillTip||actor.strikeHand;
    if(!marker)throw Error('Carrier has no physical contact marker.');
    let invalidGeometry=0,vertices=0;
    for(const city of [actor,target])city.root.traverse(o=>{const p=o.geometry?.attributes?.position;if(p){vertices+=p.count;for(const n of p.array)if(!Number.isFinite(n))invalidGeometry++;}});
    window.__contactAudit={sim,T,fx,actor,target,marker,samples:[],invalidMatrices:0};
    window.__colossus.advance(0);
    return {actorVariant:actor.variant,targetVariant:target.variant,reach,vertices,invalidGeometry,hiddenBeforeContact:!fx.ball.visible&&!fx.trail.visible,muzzleError:fx.start.distanceTo(marker.getWorldPosition(new T.Vector3())),kind:fx.kind};
   },{scenario,speed});
   const advance=async until=>page.evaluate(until=>{
    const {sim,T,fx,actor,target,marker,samples}=window.__contactAudit,{scene,state}=window.__colossus;
    while(fx.age+1e-8<until){sim.tick(state,.025);scene.update(state,.025,null);
     for(const city of [actor,target])city.root.traverse(o=>{if(o.matrixWorld.elements.some(n=>!Number.isFinite(n)))window.__contactAudit.invalidMatrices++;});
     if(fx.age>=.7-1e-8&&fx.age<=.92){const point=marker.getWorldPosition(new T.Vector3()),surface=fx.anchor.object.localToWorld(fx.anchor.local.clone());
      samples.push({age:fx.age,point:point.toArray(),surface:surface.toArray(),error:point.distanceTo(surface),endError:fx.end.distanceTo(surface),phase:actor.drill?actor.drillPhase:actor.strikePhase,reported:actor.drill?null:actor.strikeContactError,damageArrived:fx.arrived,drillAngle:actor.drill?.rotation.z??null,drillContact:actor.drillContact?{...actor.drillContact}:null});
     }
    }
    window.__colossus.advance(0);
    return {age:fx.age,samples,invalidMatrices:window.__contactAudit.invalidMatrices,finalRange:Math.hypot(state.battle.enemy.x-state.battle.player.x,state.battle.enemy.z-state.battle.player.z)};
   },until);
   await advance(.7);
   if(speed===1)await page.screenshot({path:path.join(out,`${label}-contact.png`)});
   const measured=await advance(.9);
   const pause=await page.evaluate(()=>{
    const {sim,T,marker,actor}=window.__contactAudit,{state,scene}=window.__colossus;state.paused=true;
    const before=marker.getWorldPosition(new T.Vector3()),angle=actor.drill?.rotation.z,time=state.time;
    sim.tick(state,.2);scene.update(state,.2,null);
    return {markerError:before.distanceTo(marker.getWorldPosition(new T.Vector3())),timeError:state.time-time,angleError:actor.drill?Math.abs(actor.drill.rotation.z-angle):0};
   });
   const result={label,...scenario,speed,...setup,...measured,pause};
   result.maxContactError=Math.max(...result.samples.map(s=>s.error));result.maxAnchorError=Math.max(...result.samples.map(s=>s.endError));
   report.cases.push(result);
   const check=(ok,message)=>{if(!ok)report.failures.push(`${label}: ${message}`);};
   check(result.hiddenBeforeContact,'Melee flash was visible before physical contact.');
   check(result.invalidGeometry===0&&result.invalidMatrices===0,'Non-finite carrier geometry or world matrix.');
   check(result.samples.length>0,'No samples in the contact window.');
   check(result.samples.every(s=>s.error<.35),`Physical marker misses the target surface by up to ${result.maxContactError.toFixed(4)}m (limit 0.35m).`);
   check(result.samples.every(s=>s.endError<.001),'Impact detached from the animated target surface.');
   check(result.samples.every(s=>s.damageArrived),'Contact window preceded damage arrival.');
   if(result.actorVariant==='drill')check(result.muzzleError<.001,'Drill attack does not originate at its physical tip.');
   check(pause.timeError===0&&pause.markerError<.001&&pause.angleError<.001,'Paused physical animation changed.');
   console.log(JSON.stringify({label,maxContactError:result.maxContactError,maxAnchorError:result.maxAnchorError,muzzleError:result.muzzleError,invalidGeometry:result.invalidGeometry,pause}));
  }catch(e){report.failures.push(`${label}: ${e.message}`);console.log(JSON.stringify({label,error:e.message}));}
 }
 // The auger attacks ground carriers. Against aircraft the real hull cannons
 // fire instead, including the special ability and the enemy AI path.
 for(const variant of ['horizontal','vertical'])for(const speed of [1,2]){
  const result={variant,speed,actions:[]};
  for(const action of ['fire','ability','enemy']){
   const label=`ranged-drill-to-${variant}-${action}-speed-${speed}`;
   try{
    const measured=await page.evaluate(async({variant,speed,action})=>{
     const sim=await import('/src/simulation.js'),T=await import('/vendor/three.module.js'),{state,scene}=window.__colossus;
     const enemySource=action==='enemy';Object.assign(state,sim.createGame(enemySource?'airship':'crawler',enemySource?variant:'drill'));
     const rival=state.enemies.find(e=>e.variant===(enemySource?'drill':variant));if(!rival)throw Error('Real rival missing.');
     scene.setGame(state);state.x=rival.x;state.z=rival.z;sim.startBattle(state,rival.id);
     const b=state.battle;b.player={x:-20,z:0,angle:Math.PI/2};b.enemy={x:45,z:0,angle:-Math.PI/2};b.autoFire=false;b.enemyReload=enemySource?0:999;state.speed=speed;
     scene.setCameraMode('steady');scene.update(state,.01,null);
     const position={...b.player};let accepted;
     if(enemySource){sim.tick(state,.025);accepted=true;}else accepted=action==='ability'?sim.ability(state).ok:sim.fire(state);
     if(!accepted)throw Error('Ranged combat command rejected.');
     scene.update(state,0,null);
     const source=enemySource?'enemy':'player',event=b.events.find(e=>e.source===source),effects=scene.fx.filter(f=>f.source===source&&!f.flash);
     if(!event||!effects.length)throw Error('No real gun event/effect.');
     const actor=effects[0].actor,muzzles=actor.baseWeapons.flatMap(w=>w.muzzles.map(m=>m.getWorldPosition(new T.Vector3())));
     const muzzleError=Math.max(...effects.map(f=>Math.min(...muzzles.map(p=>p.distanceTo(f.start)))));
     const muzzleToAuger=Math.min(...effects.map(f=>f.start.distanceTo(actor.drillTip.getWorldPosition(new T.Vector3()))));
     const health=()=>enemySource?state.hp:b.enemyHp,atFire=health();
     const advanceTo=until=>{while(effects[0].age+1e-8<until){sim.tick(state,.025);scene.update(state,.025,null);}};
     advanceTo(.5);const beforeImpact=health();advanceTo(.55);const afterImpact=health();
     let invalidGeometry=0,invalidMatrices=0;
     for(const city of [actor,effects[0].target])city.root.traverse(o=>{if(o.matrixWorld.elements.some(n=>!Number.isFinite(n)))invalidMatrices++;const p=o.geometry?.attributes?.position;if(p)for(const n of p.array)if(!Number.isFinite(n))invalidGeometry++;});
     state.paused=true;window.__colossus.advance(0);
     return {action,eventKind:event.kind,expectedKind:enemySource?'enemyShot':'shot',damage:event.damage,muzzleError,muzzleToAuger,noAugerImpact:effects.every(f=>f.kind!=='impact'),extension:actor.drillContact.extension,pitch:actor.drillContact.pitch,health:{atFire,beforeImpact,afterImpact},impactAge:effects[0].age,anchorError:Math.max(...effects.map(f=>f.end.distanceTo(f.anchor.object.localToWorld(f.anchor.local.clone())))),abilityMovement:action==='ability'?Math.hypot(position.x-b.player.x,position.z-b.player.z):null,invalidGeometry,invalidMatrices};
    },{variant,speed,action});
    result.actions.push(measured);if(speed===1)await page.screenshot({path:path.join(out,`${label}.png`)});
    const check=(ok,message)=>{if(!ok)report.failures.push(`${label}: ${message}`);};
    check(measured.eventKind===measured.expectedKind&&measured.noAugerImpact,'Aircraft was attacked with an auger melee event.');
    check(measured.muzzleError<.001&&measured.muzzleToAuger>1,'Projectile did not originate at a real hull gun muzzle.');
    check(Math.abs(measured.extension)<.001&&Math.abs(measured.pitch)<.001,'Auger extended toward an airborne target.');
    check(measured.health.beforeImpact===measured.health.atFire,'Gun damage preceded the .55s arrival.');
    check(Math.abs(measured.health.atFire-measured.health.afterImpact-measured.damage)<1e-7,'Gun impact damage did not resolve at .55s.');
    check(measured.anchorError<.001,'Gun impact detached from aircraft surface.');
    check(measured.invalidGeometry===0&&measured.invalidMatrices===0,'Non-finite geometry in ranged combat.');
    if(action==='ability')check(measured.abilityMovement<.001&&measured.damage===60,'Siege burst moved the hull or dealt the wrong damage.');
    console.log(JSON.stringify({label,...measured}));
   }catch(e){report.failures.push(`${label}: ${e.message}`);console.log(JSON.stringify({label,error:e.message}));}
  }
  report.rangedCases.push(result);
 }
 assert.equal(report.cases.length,cases.length*2,'Every requested contact scenario completed.');
 assert.equal(report.rangedCases.length,4);assert.ok(report.rangedCases.every(c=>c.actions.length===3),'Both aircraft variants were checked at both speeds through fire, ability and enemy AI.');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.failures,[]);
}catch(e){report.failure=e.message;process.exitCode=1;}
finally{await browser.close();await fs.writeFile(path.join(out,'contact-report.json'),JSON.stringify(report,null,2));}
