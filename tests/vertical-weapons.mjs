// Real rendered mesh and muzzle audit for occupied-per-storey Gothic cities.
// This intentionally samples the rendered triangles independently of the
// shared collision implementation, including curved trajectories after exit.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/vertical-builder-01/weapons');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:960}}),report={errors:[],remote:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
try{
 await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>window.__colossus);
 report.geometry=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{createVerticalCastle}=await import('/src/vertical-castle.js'),{createBattery}=await import('/src/armaments.js');
  const {KAIJU_SCALE,KAIJU_DECK_Y}=await import('/src/city-layout.js'),{createGame}=await import('/src/simulation.js');
  const {createVerticalLayout,VERTICAL_SLOT_ORDER}=await import('/src/vertical-city.js'),{batterySolution,batteryPosition}=await import('/src/weapon-layout.js');
  const {cannonMuzzleLocal,cannonMountProfile}=await import('/src/castle-collision.js'),{disposeGroup}=await import('/src/materials.js');
  const samples=[],ray=new T.Raycaster();let maxMuzzleError=0,maxAllowedBarrelHit=0;
  const trace=(castle,a,b)=>{const delta=b.clone().sub(a),distance=delta.length();ray.set(a,delta.normalize());ray.far=distance;const hit=ray.intersectObject(castle,true)[0];return hit?{point:hit.point.toArray(),distance:hit.distance,mesh:hit.object.name}:null;};
  for(const variant of ['cyborg','flesh'])for(const count of [3,7,12,20])for(const tier of [...new Set([0,Math.floor(count/2),count-1])])for(const level of [1,3]){
   const state=createGame('kaiju',variant);state.rings=count>7?2:1;state.buildings.fill(null);state.towerOrder=VERTICAL_SLOT_ORDER.slice(0,count);
   for(const slot of state.towerOrder)state.buildings[slot]={type:'farm',level:1,remaining:0};
   const slot=state.towerOrder[tier];state.buildings[slot]={type:'cannon',level,remaining:0};
   const layout=createVerticalLayout(state.buildings,state.towerOrder,state.variant),p=layout.positions[slot],position=batteryPosition('kaiju',slot,state.variant,layout),profile=cannonMountProfile(layout);
   const rig=new T.Group(),castle=createVerticalCastle(KAIJU_DECK_Y,false,layout),battery=createBattery('kaiju',level,p.rotation,slot);
   rig.scale.setScalar(KAIJU_SCALE);rig.add(castle);battery.scale.setScalar(profile.scale);battery.position.set(p.x,KAIJU_DECK_Y+p.y+profile.districtY,p.z);rig.add(battery);
   for(const degrees of [-70,-45,-30,-20,0,20,30,45,70])for(const enemyFaction of ['crawler','airship']){
    const yaw=p.rotation+degrees*Math.PI/180,target=new T.Vector3(position.x+Math.sin(yaw)*50,enemyFaction==='crawler'?10:18,position.z+Math.cos(yaw)*50);
    battery.weapon.turret.rotation.y=yaw;rig.updateMatrixWorld(true);state.battle={enemyFaction};
    const status=batterySolution(state,slot,{x:0,z:0,angle:0},target,54);
    for(const [barrel,marker] of battery.weapon.muzzles.entries()){
     const start=marker.getWorldPosition(new T.Vector3()),local=cannonMuzzleLocal(slot,level,yaw,barrel,layout);
     const expected=rig.localToWorld(new T.Vector3(local.muzzle.x,local.muzzle.y,local.muzzle.z));maxMuzzleError=Math.max(maxMuzzleError,start.distanceTo(expected));
     let hit=null,barrelHit=null;
     if(status.active){
      const breech=rig.localToWorld(new T.Vector3(local.breech.x,local.breech.y,local.breech.z));barrelHit=trace(castle,breech,start);if(barrelHit)maxAllowedBarrelHit++;
      let previous=start.clone();
      for(let step=1;step<=160;step++){
       const t=step/160,next=new T.Vector3().lerpVectors(start,target,t);next.y+=Math.sin(t*Math.PI)*3;
       hit=trace(castle,previous,next);if(hit)break;previous=next;
      }
     }
     samples.push({variant,count,tier,slot,level,degrees,enemyFaction,barrel,active:status.active,blocker:status.blocker,barrelHit,hit});
    }
   }
   disposeGroup(rig);
  }
  return {samples,allowed:samples.filter(s=>s.active).length,blocked:samples.filter(s=>!s.active).length,maxMuzzleError,maxAllowedBarrelHit,collisions:samples.filter(s=>s.hit)};
 });
 // Also inspect the real GameScene integration, not just isolated factories:
 // scene parenting, scale and offsets must use the same profile as physics.
 report.liveMounts=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{createGame}=await import('/src/simulation.js'),{VERTICAL_SLOT_ORDER}=await import('/src/vertical-city.js');
  const {cannonMuzzleLocal,cannonMountProfile}=await import('/src/castle-collision.js'),api=window.__colossus,rows=[];
  for(const variant of ['cyborg','flesh']){
   Object.assign(api.state,createGame('kaiju',variant));const s=api.state;s.rings=2;s.towerOrder=[...VERTICAL_SLOT_ORDER];
   for(const slot of s.towerOrder)s.buildings[slot]={type:'farm',level:1,remaining:0};
   for(const [slot,level] of [[11,3],[19,1]])s.buildings[slot]={type:'cannon',level,remaining:0,facing:Math.PI};
   api.scene.setGame(s);api.scene.update(s,0,null);api.scene.scene.updateMatrixWorld(true);
   const city=api.scene.city,profile=cannonMountProfile(city.verticalLayout);
   for(const weapon of city.batteries)for(const [barrel,marker] of weapon.muzzles.entries()){
    const p=cannonMuzzleLocal(weapon.slot,weapon.level,weapon.turret.rotation.y,barrel,city.verticalLayout).muzzle;
    const expected=city.rig.localToWorld(new T.Vector3(p.x,p.y,p.z));
    rows.push({variant,slot:weapon.slot,barrel,scale:weapon.group.scale.toArray(),expectedScale:profile.scale,error:marker.getWorldPosition(new T.Vector3()).distanceTo(expected),rootScale:city.root.scale.toArray(),baseScales:city.baseWeapons.map(w=>w.group.scale.toArray())});
   }
  }
  return rows;
 });
 assert.equal(report.geometry.samples.length,1296);
 for(const variant of ['cyborg','flesh']){
  const samples=report.geometry.samples.filter(s=>s.variant===variant);assert.equal(samples.length,648);
  assert.ok(samples.filter(s=>s.active).length>80,`${variant}: the dynamic city must retain a useful spread of real firing lanes`);
  assert.ok(samples.filter(s=>!s.active).length>80,`${variant}: the audit must exercise genuine blocked as well as clear lanes`);
 }
 assert.ok(report.geometry.maxMuzzleError<1e-10,'Rendered cannon muzzle and simulation muzzle disagree');
 assert.equal(report.geometry.maxAllowedBarrelHit,0,'An allowed cannon barrel penetrates actual rendered masonry');
 assert.deepEqual(report.geometry.collisions,[],'An allowed curved shot intersects actual rendered castle geometry');
 assert.equal(report.liveMounts.length,6);
 for(const mount of report.liveMounts){
  assert.ok(mount.error<1e-10,'Actual GameScene cannon parenting disagrees with its simulation muzzle');
  assert.deepEqual(mount.scale,[mount.expectedScale,mount.expectedScale,mount.expectedScale],'District cannon keeps its proportions with a uniform scale');
  assert.deepEqual(mount.rootScale,[.55,.55,.55],'Castle compression must not resize the robot');
  for(const scale of mount.baseScales)assert.deepEqual(scale,[1.22,1.22,1.22],'Castle compression must not resize body-mounted guns');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output:out,samples:report.geometry?.samples.length,allowed:report.geometry?.allowed,blocked:report.geometry?.blocked,maxMuzzleError:report.geometry?.maxMuzzleError,liveMounts:report.liveMounts,barrelCollisions:report.geometry?.maxAllowedBarrelHit,collisions:report.geometry?.collisions,errors:report.errors,remote:report.remote,failure:report.failure}));
