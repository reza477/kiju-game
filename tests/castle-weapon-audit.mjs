// Rendered cannon clearance regression. Uses real castle/cannon factories and
// ordinary battle events; no replacement geometry or screenshot-only materials.
import {createRequire} from 'node:module';
import path from 'node:path';
import {homedir} from 'node:os';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/castle-weapon-builder');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),report={errors:[],remote:[],screenshots:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
try{
 await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>window.__colossus);await page.locator('#begin').click();
 report.geometry=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{createCastleBackpack}=await import('/src/castle.js'),{createBattery,animateWeapons}=await import('/src/armaments.js');
  const {kaijuSlotPosition,KAIJU_SCALE}=await import('/src/city-layout.js'),{cannonMuzzleLocal}=await import('/src/castle-collision.js'),{disposeGroup}=await import('/src/materials.js');
  const samples=[],ray=new T.Raycaster();
  for(const rings of [0,1,2]){
   const rig=new T.Group(),castle=createCastleBackpack(34,false,rings);rig.scale.setScalar(KAIJU_SCALE);rig.add(castle);
   for(let slot=0;slot<20;slot++){
    const p=kaijuSlotPosition(slot);if(p.ring>rings||slot===7)continue;
    for(const level of [1,3]){
     const group=createBattery('kaiju',level,p.rotation,slot);group.position.set(p.x,34+p.y+.18,p.z);rig.add(group);
     const city={rig,rings,faction:'kaiju',baseWeapons:[],batteries:[group.weapon]};
     for(const degrees of [-70,-30,0,15,30,60,70]){
      const desired=p.rotation+degrees*Math.PI/180;rig.updateMatrixWorld(true);
      const target={x:p.x*KAIJU_SCALE+Math.sin(desired)*45,z:p.z*KAIJU_SCALE+Math.cos(desired)*45};
      animateWeapons(city,target,1);rig.updateMatrixWorld(true);
      for(const [index,marker] of group.weapon.muzzles.entries()){
       const muzzle=marker.getWorldPosition(new T.Vector3()),breech=new T.Vector3(marker.position.x,marker.position.y,0);group.weapon.recoil.localToWorld(breech);
       const direction=muzzle.clone().sub(breech);ray.set(breech,direction.clone().normalize());ray.far=direction.length();const hit=ray.intersectObject(castle,true)[0];
       const expected=cannonMuzzleLocal(slot,level,group.weapon.turret.rotation.y,index).muzzle;
       samples.push({rings,slot,level,degrees,barrel:index,desired,physical:group.weapon.turret.rotation.y,hit:hit?{point:hit.point.toArray(),distance:hit.distance}:null,muzzleError:muzzle.distanceTo(new T.Vector3(expected.x,expected.y,expected.z).multiplyScalar(KAIJU_SCALE))});
      }
     }
     group.removeFromParent();disposeGroup(group);
    }
   }
   disposeGroup(rig);
  }
  return {samples,maxMuzzleError:Math.max(...samples.map(s=>s.muzzleError)),barrelHits:samples.filter(s=>s.hit)};
 });
 report.battles=[];
 for(const variant of ['cyborg','flesh'])for(const degrees of [0,30]){
  const result=await page.evaluate(async({variant,degrees})=>{
   const sim=await import('/src/simulation.js'),{batteryPosition}=await import('/src/weapon-layout.js'),{state:s,scene:g}=window.__colossus;
   Object.assign(s,sim.createGame('kaiju',variant));s.rings=2;s.buildings[11]={type:'cannon',level:3,remaining:0};
   const rival=s.enemies.find(e=>e.variant==='standard');s.x=rival.x;s.z=rival.z;sim.startBattle(s,rival.id);
   const b=s.battle,p=batteryPosition('kaiju',11),yaw=Math.PI+degrees*Math.PI/180;
   b.player={x:0,z:0,angle:0};b.enemy={x:p.x+Math.sin(yaw)*45,z:p.z+Math.cos(yaw)*45,angle:Math.PI};b.autoFire=false;b.enemyReload=999;
   g.setGame(s);g.setCameraMode('steady');for(let i=0;i<20;i++)g.update(s,.1,null);window.__colossus.advance(0);window.__colossus.refreshMarkers();
   const status=sim.weaponStatus(s).batteries.find(w=>w.slot===11),accepted=sim.fire(s),event=b.events.at(-1);g.update(s,0,null);window.__colossus.advance(0);window.__colossus.refreshMarkers();
   return {variant,degrees,accepted,active:status.active,blocker:status.blocker,eventMounts:event.mounts,damage:event.damage,renderedSlots:g.fx.filter(f=>f.source==='player').map(f=>f.slot)};
  },{variant,degrees});
  const name=`${variant}-${degrees===0?'clear-port':'blocked-oblique'}.png`;await page.screenshot({path:path.join(out,name)});report.screenshots.push(name);report.battles.push(result);
 }
 assert.equal(report.geometry.barrelHits.length,0,'A clamped barrel still intersects actual castle geometry');assert.ok(report.geometry.maxMuzzleError<1e-6);
 for(const b of report.battles){assert.ok(b.accepted);assert.equal(b.active,b.degrees===0);assert.equal(b.eventMounts.includes(11),b.degrees===0);assert.equal(b.renderedSlots.includes(11),b.degrees===0);}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output:out,samples:report.geometry?.samples.length,barrelHits:report.geometry?.barrelHits.length,maxMuzzleError:report.geometry?.maxMuzzleError,battles:report.battles,errors:report.errors,remote:report.remote,failure:report.failure}));
