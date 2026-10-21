import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import * as api from '../src/weapon-layout.js';
import * as sim from '../src/simulation.js';
import {VERTICAL_SLOT_ORDER} from '../src/vertical-city.js';
import {createSaddleLayout} from '../src/saddle-layout.js';
import {createSaddleFoundation,createSaddleDistrict} from '../src/saddle-city.js';
import {createBattery,animateWeapons} from '../src/armaments.js';
import {cannonMuzzleLocal,cannonMountProfile,castleShotClearance,castleBarrelClearance} from '../src/castle-collision.js';
import {disposeGroup} from '../src/materials.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {FLESH_BODY_ENVELOPE_INFO,FLESH_BODY_ENVELOPE} from '../src/flesh-body-envelope.js';
const hash=v=>createHash('sha256').update(v).digest('hex');
const expected={"cyborg":{"count":5472,"sha256":"deecc55b1a3c98fa5c49335856805f2ab8318827a266c78e03e30814f1e302c2"},"standard":{"count":5472,"sha256":"ee1f71d598e3884398098e43aa79de9ea7a6fd1c478bb19535ebc7173d395ac4"},"drill":{"count":5472,"sha256":"f740f563d4f15ecd7a86c9ec28ee58c9d2f9ca64c9ae472f7dd4a8e6ba4acc40"},"horizontal":{"count":5472,"sha256":"9749cda2989b351f05456b0a856e85ea3c51a58b25742409a167df1fc21cc779"},"vertical":{"count":5472,"sha256":"9749cda2989b351f05456b0a856e85ea3c51a58b25742409a167df1fc21cc779"}};
function variantTrace(faction,variant){
 const out=[];
 for(const count of[3,7,20])for(const level of[1,3]){
  const state=sim.createGame(faction,variant);state.rings=2;state.buildings.fill(null);state.towerOrder=VERTICAL_SLOT_ORDER.slice(0,count);
  for(const [i,id]of state.towerOrder.entries())state.buildings[id]={type:i===0?'keep':i%3?'cannon':'housing',level,remaining:0,facing:i%2?Math.PI:0};
  for(const angle of[0,.7])for(const degrees of[0,45,90,135,180,225,270,315])for(const distance of[10,50,100])for(const enemyFaction of['kaiju','crawler','airship']){
   state.battle={enemyFaction};const yaw=degrees*Math.PI/180,target={x:5+Math.sin(yaw)*distance,z:8+Math.cos(yaw)*distance};
   for(const [slot,b]of state.buildings.entries())if(b?.type==='cannon')out.push(api.batterySolution(state,slot,{x:5,z:8,angle},target,54));
  }
 }
 return {count:out.length,sha256:hash(JSON.stringify(out))};
}
test('all five other variants retain exact weapon solutions over the recorded baseline matrix',()=>{
 for(const[faction,variant]of[['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']])assert.deepEqual(variantTrace(faction,variant),expected[variant],variant);
});

const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,`${message}: ${a} versus ${b}`);
function stateFor(count=20,mixed=false){
 const s=sim.createGame('kaiju','flesh');s.rings=2;s.buildings.fill(null);s.towerOrder=VERTICAL_SLOT_ORDER.slice(0,count);
 for(const[tier,id]of s.towerOrder.entries())s.buildings[id]={type:tier===0?'keep':!mixed||[1,3,7,16].includes(tier)?'cannon':['housing','farm','foundry','sawmill','armor'][tier%5],level:1+tier%3,remaining:0,facing:0};
 return s;
}
function architecture(layout){
 const root=new T.Group();root.add(createSaddleFoundation(undefined,false,layout));
 for(const f of layout.floors){if(f.type==='cannon'||f.underConstruction)continue;const p=layout.positions[f.slot],g=createSaddleDistrict(f.type,f.renderLevel,{zone:p.zone});g.position.set(p.x,34+p.y+layout.districtOffset,p.z);g.rotation.y=p.rotation;root.add(g);}
 root.updateMatrixWorld(true);return root;
}
function trace(root,a,b){const d=b.clone().sub(a),ray=new T.Raycaster(a,d.clone().normalize(),1e-7,d.length());return ray.intersectObject(root,true)[0]??null;}

test('legal saddle saves use twenty distinct actual mount centres and exact rendered muzzle transforms',()=>{
 const restore=installCPUCarrierEnvironment();
 try{for(const count of[3,7,20]){
  const state=stateFor(count),saved=sim.serialize(state),layout=createSaddleLayout(state.buildings,state.towerOrder),rig=new T.Group();rig.scale.setScalar(.55);
  assert.equal(sim.serialize(sim.deserialize(saved)),saved);const centres=new Set();
  for(const slot of state.towerOrder){const p=layout.positions[slot],position=api.batteryPosition('kaiju',slot,'flesh',layout);centres.add([position.x,position.y,position.z].join(':'));
   for(const level of[1,3])for(const yaw of[0,.6,Math.PI,4.1]){
    const battery=createBattery('kaiju',level,yaw,slot);battery.position.set(p.x,34+p.y+layout.districtOffset,p.z);rig.add(battery);rig.updateMatrixWorld(true);
    const actual=battery.getWorldPosition(new T.Vector3());near(actual.x,position.x,'mount X');near(actual.z,position.z,'mount Z');near(actual.y-layout.districtOffset*.55,position.y,'mount deck Y');
    for(const[index,marker]of battery.weapon.muzzles.entries()){const point=cannonMuzzleLocal(slot,level,yaw,index,layout).muzzle,expected=rig.localToWorld(new T.Vector3(point.x,point.y,point.z));assert.ok(marker.getWorldPosition(new T.Vector3()).distanceTo(expected)<1e-8,'Actual rendered muzzle must equal mechanical muzzle');}
    battery.removeFromParent();disposeGroup(battery);
   }
  }
  assert.equal(centres.size,count);assert.equal(sim.serialize(state),saved,'Geometry queries cannot mutate saves');
 }}finally{restore();}
});

test('a legal forward battle emits precisely the clear saddle batteries with original damage and timing',()=>{
 const s=stateFor(20);s.towerOrder=[7,...Array.from({length:20},(_,i)=>i).filter(i=>i!==7)];for(const b of s.buildings)if(b){b.level=1;b.facing=0;}
 const enemy=s.enemies.find(e=>e.variant==='cyborg');s.x=enemy.x;s.z=enemy.z;assert.ok(sim.startBattle(s,enemy.id));
 s.battle.player={x:-60,z:30,angle:0};s.battle.enemy={x:-60,z:70,angle:Math.PI};s.battle.command='hold';s.battle.enemyReload=999;s.battle.autoFire=false;
 const before=sim.serialize(s),status=sim.weaponStatus(s);assert.equal(sim.serialize(s),before,'Aiming cannot mutate saves');
 assert.equal(status.total,19);assert.equal(new Set(status.batteries.map(b=>JSON.stringify(b.position))).size,19);assert.equal(status.active,9);
 assert.ok(sim.fire(s));const event=s.battle.events.at(-1),hp=s.battle.enemyHp;
 assert.deepEqual(event.mounts,status.batteries.filter(b=>b.active).map(b=>b.slot));assert.equal(event.damage,sim.FACTIONS.kaiju.damage+status.active*9);assert.equal(s.battle.reload,sim.FACTIONS.kaiju.reload);assert.equal(event.impactAt-event.time,.55);
 s.paused=true;const paused=sim.serialize(s);sim.tick(s,.25);assert.equal(sim.serialize(s),paused);s.paused=false;
 sim.tick(s,.25);sim.tick(s,.25);assert.equal(s.battle.enemyHp,hp);sim.tick(s,.05);assert.equal(s.battle.enemyHp,hp-event.damage);assert.equal(s.battle.pendingHits.length,0);
});

test('forward rail blocks include the actual barrel collar width, not only centreline rays',()=>{
 const restore=installCPUCarrierEnvironment();
 try{
  const state=stateFor(20);state.towerOrder=[7,...Array.from({length:20},(_,i)=>i).filter(i=>i!==7)];for(const b of state.buildings)if(b){b.level=1;b.facing=0;}state.battle={enemyFaction:'kaiju'};
  const layout=createSaddleLayout(state.buildings,state.towerOrder),rendered=architecture(layout);rendered.traverse(o=>{if(o.isMesh)for(const material of[o.material].flat())material.side=T.DoubleSide;});
  for(const slot of[0,1]){
   const p=layout.positions[slot],status=api.batterySolution(state,slot,{x:-60,z:30,angle:0},{x:-60,z:70},54),battery=createBattery('kaiju',1,status.bearing,slot);battery.position.set(p.x,34+p.y+layout.districtOffset,p.z);battery.updateMatrixWorld(true);
   let intersections=0;battery.traverse(mesh=>{
    if(!mesh.isMesh||mesh.parent!==battery.weapon.recoil||mesh.position.z!==1.8)return;
    const geometry=mesh.geometry,index=geometry.index,positions=geometry.attributes.position;
    for(let i=0;i<(index?.count??positions.count);i+=3){const corners=[];for(let j=0;j<3;j++)corners.push(new T.Vector3().fromBufferAttribute(positions,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));for(let j=0;j<3;j++)if(trace(rendered,corners[j],corners[(j+1)%3]))intersections++;}
   });
   assert.ok(intersections>0,`Slot ${slot} needs an actual rendered collar/rail witness`);assert.equal(status.active,false);assert.equal(status.blocker,'castle:saddle:foundation');disposeGroup(battery);
  }
  disposeGroup(rendered);
 }finally{restore();}
});

test('saddle shots expose useful outward lanes and block actual occupied architecture',()=>{
 const restore=installCPUCarrierEnvironment();let clear=0,blocked=0,physicalHits=0;
 try{for(const count of[7,20])for(const mixed of[false,true]){
  const state=stateFor(count,mixed),layout=createSaddleLayout(state.buildings,state.towerOrder),rendered=architecture(layout);
  // Double-sided observation catches starts inside a real room, too.
  rendered.traverse(o=>{if(o.isMesh){const materials=[o.material].flat();for(const m of materials)m.side=T.DoubleSide;}});
  for(const slot of state.towerOrder){const building=state.buildings[slot];if(building.type!=='cannon')continue;const p=layout.positions[slot];
   for(const offset of[-90,-60,-30,0,30,60,90,120,150,180,210,240])for(const targetY of[10,18]){
    const yaw=p.rotation+offset*Math.PI/180;building.facing=yaw;state.battle={enemyFaction:targetY===18?'airship':'crawler'};
    const target={x:p.x*.55+Math.sin(yaw)*45,y:targetY,z:p.z*.55+Math.cos(yaw)*45},solution=api.batterySolution(state,slot,{x:0,z:0,angle:0},target,54);
    const end=new T.Vector3(target.x/.55,target.y/.55,target.z/.55),profile=cannonMountProfile(layout);
    const clearance=castleShotClearance({layout,slot,level:building.level,yaw,target:{x:end.x,y:end.y,z:end.z}});
    assert.equal(solution.active,clearance.clear);assert.ok(solution.inArc&&solution.inRange);
    if(solution.active)clear++;else blocked++;
    let hit=null;
    for(let barrel=0;barrel<(building.level>1?2:1);barrel++){
     const points=cannonMuzzleLocal(slot,building.level,yaw,barrel,layout),a=new T.Vector3(points.breech.x,points.breech.y,points.breech.z),b=new T.Vector3(points.muzzle.x,points.muzzle.y,points.muzzle.z);hit=trace(rendered,a,b);
     let previous=b.clone();for(let step=1;!hit&&step<=160;step++){const t=step/160,next=b.clone().lerp(end,t);next.y+=Math.sin(t*Math.PI)*3/.55;hit=trace(rendered,previous,next);previous=next;}
     if(hit)break;
    }
    if(hit){physicalHits++;assert.equal(solution.active,false,'A legal shot cannot pass through an actual rendered foundation, roof or room');}
   }
  }
  disposeGroup(rendered);
 }
 assert.ok(clear>30,`Useful clear sectors: ${clear}`);assert.ok(blocked>30,`Blocked sectors: ${blocked}`);assert.ok(physicalHits>5,`Independent real geometry witnesses: ${physicalHits}`);
 assert.equal(FLESH_BODY_ENVELOPE_INFO.gridWorld,.275);
 console.log(JSON.stringify({saddleWeaponGeometry:{clear,blocked,physicalHits,canonicalBodyGridWorld:.275}}));
 }finally{restore();}
});

test('saddle animation uses the same barrel clearance without clamping any other variant differently',()=>{
 const restore=installCPUCarrierEnvironment();
 try{const state=stateFor(20,true),layout=createSaddleLayout(state.buildings,state.towerOrder),rig=new T.Group();rig.scale.setScalar(.55);
  const city={faction:'kaiju',layout:'saddle',rig,rings:2,saddleLayout:layout,baseWeapons:[],batteries:[]};
  for(const slot of state.towerOrder){const b=state.buildings[slot];if(b.type!=='cannon')continue;const p=layout.positions[slot],g=createBattery('kaiju',b.level,p.rotation,slot);g.position.set(p.x,34+p.y+layout.districtOffset,p.z);rig.add(g);city.batteries.push(g.weapon);}
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8){rig.updateMatrixWorld(true);animateWeapons(city,{x:Math.sin(angle)*50,z:Math.cos(angle)*50},1);rig.updateMatrixWorld(true);
   for(const weapon of city.batteries)assert.ok(castleBarrelClearance({layout,slot:weapon.slot,level:weapon.level,yaw:weapon.turret.rotation.y}).clear,'Physical animated barrel should stop before its own architecture/body envelope');
  }
  disposeGroup(rig);
 }finally{restore();}
});

test('the conservative canonical carrier envelope contains the actual native surface and blocks inward barrels',async()=>{
 const restore=installCPUCarrierEnvironment();
 try{
  const {loadMeshyCarriers}=await import('../src/meshy-carriers.js');await loadMeshyCarriers();
  const {makeCity,animateCity}=await import('../src/carriers.js'),{placeCity}=await import('../src/scene.js');
  const city=makeCity('kaiju',false,1,'flesh');placeCity(city,-60,30,0);for(let frame=0;frame<=420;frame++)animateCity(city,frame/60,false,0);
  city.root.updateMatrixWorld(true);const inverse=city.rig.matrixWorld.clone().invert(),point=new T.Vector3(),cells=new Set(),step=FLESH_BODY_ENVELOPE_INFO.gridRig;
  for(const box of FLESH_BODY_ENVELOPE)for(let x=box[0]/step;x<box[3]/step;x++)for(let y=box[1]/step;y<box[4]/step;y++)for(let z=box[2]/step;z<box[5]/step;z++)cells.add([x,y,z].join(':'));
  const surface=new T.Group();let vertices=0;
  for(const mesh of city.meshyCarrier.renderMeshes){mesh.skeleton.update();const positions=new Float32Array(mesh.geometry.attributes.position.count*3);
   for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);assert.ok(cells.has(point.toArray().map(v=>Math.floor(v/step)).join(':')),`Actual canonical skin vertex ${i} escaped the declared body envelope`);positions.set(point.toArray(),i*3);vertices++;}
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setIndex(mesh.geometry.index.clone());surface.add(new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide})));
  }
  surface.updateMatrixWorld(true);assert.equal(vertices,FLESH_BODY_ENVELOPE_INFO.vertices);
  const state=stateFor(20),layout=createSaddleLayout(state.buildings,state.towerOrder);let actualBodyHits=0,clearOutward=0;
  for(const slot of state.towerOrder){if(state.buildings[slot].type!=='cannon')continue;const p=layout.positions[slot];
   for(const yaw of[p.rotation,p.rotation+Math.PI]){
    const pair=cannonMuzzleLocal(slot,1,yaw,0,layout),a=new T.Vector3(pair.breech.x,pair.breech.y,pair.breech.z),b=new T.Vector3(pair.muzzle.x,pair.muzzle.y,pair.muzzle.z),hit=trace(surface,a,b),clearance=castleBarrelClearance({layout,slot,level:1,yaw});
    if(hit){actualBodyHits++;assert.equal(clearance.clear,false,'A physical barrel may not enter the canonical rendered skin');}
    if(yaw===p.rotation&&clearance.clear)clearOutward++;
   }
  }
  for(const slot of state.towerOrder){const p=layout.positions[slot];if(p.zone!=='lower-pannier')continue;
   const yaw=Math.atan2(-p.x,-8-p.z),pair=cannonMuzzleLocal(slot,1,yaw,0,layout),start=new T.Vector3(pair.muzzle.x,pair.muzzle.y,pair.muzzle.z),end=new T.Vector3(p.x+Math.sin(yaw)*45/.55,10/.55,p.z+Math.cos(yaw)*45/.55);
   let previous=start.clone(),hit=null;for(let step=1;!hit&&step<=64;step++){const fraction=step/64,next=start.clone().lerp(end,fraction);next.y+=Math.sin(fraction*Math.PI)*3/.55;hit=trace(surface,previous,next);previous=next;}
   if(hit){actualBodyHits++;assert.equal(castleShotClearance({layout,slot,level:1,yaw,target:{x:end.x,y:end.y,z:end.z}}).clear,false,'A canonical rendered body intersection must occlude the shot');}
  }
  assert.ok(actualBodyHits>0,'The audit must include a real body-occluded projectile');assert.ok(clearOutward>=15,'The canonical envelope must leave the visible outward mounts useful');
  console.log(JSON.stringify({canonicalBody:{vertices,actualBodyHits,clearOutward}}));disposeGroup(surface);
 }finally{restore();}
});
