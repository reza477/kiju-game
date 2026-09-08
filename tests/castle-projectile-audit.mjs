// Neutral regression for actual curved trajectories against rendered masonry
// and decoration. Target heights are controlled fixtures, not moving-hull hits.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/castle-projectile-builder');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:960}}),report={errors:[],remote:[],screenshots:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
try{
 await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>window.__colossus);await page.locator('#begin').click();
 report.geometry=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{createCastleBackpack}=await import('/src/castle.js'),{createBattery}=await import('/src/armaments.js');
  const {kaijuSlotPosition,KAIJU_SCALE}=await import('/src/city-layout.js'),{createGame}=await import('/src/simulation.js'),{batterySolution}=await import('/src/weapon-layout.js'),{disposeGroup}=await import('/src/materials.js');
  const rig=new T.Group(),castle=createCastleBackpack(34,false,2);rig.scale.setScalar(KAIJU_SCALE);rig.add(castle);rig.updateMatrixWorld(true);
  const s=createGame('kaiju');s.rings=2;s.buildings.fill(null);s.buildings[7]={type:'keep',level:1,remaining:0};const samples=[],ray=new T.Raycaster();
  for(let slot=0;slot<20;slot++){
   if(slot===7)continue;const p=kaijuSlotPosition(slot);
   for(const level of [1,3]){
    const group=createBattery('kaiju',level,p.rotation,slot);group.position.set(p.x,34+p.y+.18,p.z);rig.add(group);s.buildings[slot]={type:'cannon',level,remaining:0};
    for(const degrees of [-70,-60,-45,-30,-15,0,15,30,45,60,70])for(const enemyFaction of ['crawler','airship']){
     const yaw=p.rotation+degrees*Math.PI/180,target=new T.Vector3(p.x*KAIJU_SCALE+Math.sin(yaw)*50,enemyFaction==='crawler'?10:18,p.z*KAIJU_SCALE+Math.cos(yaw)*50);
     group.weapon.turret.rotation.y=yaw;rig.updateMatrixWorld(true);s.battle={enemyFaction};const status=batterySolution(s,slot,{x:0,z:0,angle:0},target,54);
     for(const [barrel,marker] of group.weapon.muzzles.entries()){
      let hit=null;
      if(status.active){
       const start=marker.getWorldPosition(new T.Vector3()),previous=start.clone(),next=new T.Vector3();let travelled=0;
       for(let step=1;step<=96;step++){
        const t=step/96;next.lerpVectors(start,target,t);next.y+=Math.sin(t*Math.PI)*3;const direction=next.clone().sub(previous),length=direction.length();ray.set(previous,direction.normalize());ray.far=length;
        const contact=ray.intersectObject(castle,true)[0];if(contact){hit={point:contact.point.toArray(),distance:travelled+contact.distance};break;}previous.copy(next);travelled+=length;
       }
      }
      samples.push({slot,level,degrees,enemyFaction,barrel,active:status.active,blocker:status.blocker,hit});
     }
    }
    group.removeFromParent();disposeGroup(group);s.buildings[slot]=null;
   }
  }
  disposeGroup(rig);return {samples,allowed:samples.filter(s=>s.active).length,collisions:samples.filter(s=>s.hit)};
 });
 report.battles=[];
 for(const scenario of [{slot:13,degrees:-30,variant:'flesh',targetVariant:'standard'},{slot:16,degrees:10,variant:'cyborg',targetVariant:'horizontal'},{slot:17,degrees:70,variant:'flesh',targetVariant:'vertical'}]){
  const result=await page.evaluate(async scenario=>{
   const sim=await import('/src/simulation.js'),{batteryPosition}=await import('/src/weapon-layout.js'),{kaijuSlotPosition}=await import('/src/city-layout.js'),{state:s,scene:g}=window.__colossus;
   Object.assign(s,sim.createGame('kaiju',scenario.variant));s.rings=2;s.buildings.fill(null);s.buildings[7]={type:'keep',level:1,remaining:0};s.buildings[scenario.slot]={type:'cannon',level:1,remaining:0};
   const rival=s.enemies.find(e=>e.variant===scenario.targetVariant);s.x=rival.x;s.z=rival.z;sim.startBattle(s,rival.id);const b=s.battle,p=batteryPosition('kaiju',scenario.slot),yaw=kaijuSlotPosition(scenario.slot).rotation+scenario.degrees*Math.PI/180;
   b.player={x:0,z:0,angle:0};b.enemy={x:p.x+Math.sin(yaw)*50,z:p.z+Math.cos(yaw)*50,angle:Math.PI};b.autoFire=false;b.enemyReload=999;g.setGame(s);g.setCameraMode('steady');for(let i=0;i<20;i++)g.update(s,.1,null);
   const status=sim.weaponStatus(s).batteries.find(w=>w.slot===scenario.slot),accepted=sim.fire(s),event=b.events.at(-1);g.update(s,0,null);window.__colossus.advance(0);window.__colossus.refreshMarkers();
   const plain=JSON.parse(JSON.stringify(s));plain.buildings[scenario.slot]=null;plain.battle.reload=0;plain.battle.events=[];const plainAccepted=sim.fire(plain),plainDamage=plain.battle.events.at(-1)?.damage??0;
   return {...scenario,active:status.active,blocker:status.blocker,accepted,plainAccepted,damage:event?.damage??0,plainDamage,eventMounts:event?.mounts??[],renderedSlots:g.fx.filter(f=>f.source==='player').map(f=>f.slot)};
  },scenario);
  const name=`slot-${scenario.slot}-trim-obstruction.png`;await page.screenshot({path:path.join(out,name)});report.screenshots.push(name);report.battles.push(result);
 }
 assert.equal(report.geometry.samples.length,1254);assert.ok(report.geometry.allowed>50,'Genuine firing openings must remain usable');assert.deepEqual(report.geometry.collisions,[],'An allowed curved shot intersects actual castle geometry');
 for(const b of report.battles){assert.equal(b.active,false);assert.ok(String(b.blocker).startsWith('castle:'));assert.equal(b.eventMounts.includes(b.slot),false);assert.equal(b.renderedSlots.includes(b.slot),false);assert.equal(b.accepted,b.plainAccepted);assert.equal(b.damage,b.plainDamage);}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output:out,samples:report.geometry?.samples.length,allowed:report.geometry?.allowed,collisions:report.geometry?.collisions,battles:report.battles,errors:report.errors,remote:report.remote,failure:report.failure}));
