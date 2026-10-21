import test from 'node:test';
import {cpuImageBitmap} from './beast-integration-cpu.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three.module.js';
import * as sim from '../src/simulation.js';
import {createVerticalLayout,VERTICAL_SLOT_ORDER} from '../src/vertical-city.js';
import {createSaddleLayout,SADDLE_DECK_Y} from '../src/saddle-layout.js';

// Recorded from ef5a6b5a68b5646a04e54ca55a4593570189292a before integration.
// The simulation and its pure layout/weapon dependencies were first compared
// byte-for-byte with that Git revision. These are baseline observations, not
// expectations generated from the implementation under test. Only human log
// wording is excluded from state traces because flesh no longer has storeys.
const BASELINE={
  economy:'cfd535617fd7736efc851ed4c0b9f924acb832be1241b759d840d389b9146f68',
  flesh:'b7e301ebbf140b472967ca3ef84a0b764928918f48a7217a15dc25b507973967',
  cyborg:'eb92948c5378f35f1527a556afad34c8cfa2d3d46ee028b719abac9df604c6f7',
  cyborgLayouts:'525c080eaa11eba04f9c4ea153c297a7e46c145022ff18f38aa0670e07f41c19',
};
const hash=value=>createHash('sha256').update(value).digest('hex');
const advance=(state,seconds)=>{for(let i=0;i<seconds*4;i++)sim.tick(state,.25);};
const rich=variant=>{const s=sim.createGame('kaiju',variant);s.resources={wood:9000,iron:9000,food:9000};return s;};
const layout=state=>createSaddleLayout(state.buildings,state.towerOrder);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

function constructionTrace(variant){
  const state=sim.createGame('kaiju',variant),states=[];
  const snap=label=>{
    const saved=sim.serialize(state),restored=sim.deserialize(saved);
    assert.ok(restored,`${label}: valid save`);
    assert.equal(sim.serialize(restored),saved,`${label}: save round trip`);
    const copy=JSON.parse(saved);delete copy.log;states.push([label,copy]);
  };
  snap('new');state.resources={wood:9000,iron:9000,food:9000};
  assert.ok(sim.build(state,'cannon',0).ok);snap('cannon-start');advance(state,10);snap('cannon-done');
  assert.ok(sim.build(state,'foundry',3).ok);snap('foundry-start');advance(state,10);
  assert.ok(sim.upgrade(state,11).ok);snap('upgrade-start');advance(state,8);snap('upgrade-done');
  assert.ok(sim.expandRing(state).ok);snap('harness-start');advance(state,12);snap('harness-done');
  for(const slot of VERTICAL_SLOT_ORDER)if(!state.buildings[slot])assert.ok(sim.build(state,slot%2?'housing':'farm',slot).ok);
  snap('twenty-building');advance(state,10);snap('twenty-complete');
  return hash(JSON.stringify(states));
}

test('flesh saddle keeps faction/building stats, costs, construction timing and saved state traces',()=>{
  assert.equal(hash(JSON.stringify([sim.FACTIONS,sim.BUILDINGS,sim.ringCost])),BASELINE.economy);
  for(const variant of ['flesh','cyborg'])assert.equal(constructionTrace(variant),BASELINE[variant],`${variant}: economy/progression/save trace`);
});

test('saddle preserves all historical IDs and nonsequential construction order without moving existing districts',()=>{
  const state=rich('flesh');let prior=layout(state);
  assert.deepEqual(prior.order,[7,11,13]);assert.equal(prior.positions.length,20);
  for(const slot of [3,0,2,1]){
    assert.ok(sim.build(state,'housing',slot).ok);
    const next=layout(state);assert.deepEqual(next.order,[...prior.order,slot]);
    assert.deepEqual(next.floors.map(f=>f.slot),state.towerOrder);
    for(const id of prior.order)assert.deepEqual(next.positions[id],prior.positions[id],`Adding ${slot} moved old district ${id}`);
    assert.equal(new Set(next.floors.map(f=>f.slot)).size,next.floors.length);
    assert.equal(sim.serialize(sim.deserialize(sim.serialize(state))),sim.serialize(state));
    advance(state,7);prior=layout(state);
  }
  assert.deepEqual(state.towerOrder,[7,11,13,3,0,2,1]);
  assert.deepEqual(layout(sim.deserialize(sim.serialize(state))),layout(state));
});

test('reinforcement still unlocks seven to twenty existing slots, without adding empty districts',()=>{
  const state=rich('flesh');
  assert.equal(Array.from({length:20},(_,i)=>sim.slotUnlocked(state,i)).filter(Boolean).length,7);
  const before=layout(state),order=state.towerOrder.slice();assert.ok(sim.expandRing(state).ok);
  assert.equal(before.rearLoaded,false,'Starter wards must not create empty rear framing');
  assert.equal(state.ringConstruction.remaining,12);advance(state,12);
  assert.equal(state.rings,2);assert.deepEqual(state.towerOrder,order);
  assert.deepEqual(layout(state),before,'Unused harness capacity must not manufacture districts');
  assert.equal(layout(state).rearLoaded,false,'Reinforcement alone must not create rear framing');
  assert.equal(Array.from({length:20},(_,i)=>sim.slotUnlocked(state,i)).filter(Boolean).length,20);
  for(const slot of VERTICAL_SLOT_ORDER)if(!state.buildings[slot])assert.ok(sim.build(state,'housing',slot).ok);
  const complete=layout(state);assert.equal(complete.floors.length,20);
  assert.deepEqual([...complete.order].sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i));
  assert.equal(sim.build(state,'housing',20).ok,false);assert.equal(sim.build(state,'housing',7).ok,false);
});

test('flesh saddle growth stays low and upgrades only their own district',()=>{
  for(const count of [3,7,20]){
    const state=rich('flesh');state.rings=2;
    state.buildings.fill(null);state.towerOrder=VERTICAL_SLOT_ORDER.slice(0,count);
    for(const [i,id]of state.towerOrder.entries())state.buildings[id]={type:i===0?'keep':'housing',level:1,remaining:0};
    const before=layout(state),serialized=sim.serialize(state);
    assert.equal(before.floors.length,count);assert.equal(SADDLE_DECK_Y,34);
    assert.ok(Number.isFinite(before.maxY)&&before.maxY<=38,'Twenty districts must not recreate a tall castle');
    assert.equal(new Set(before.order.map(id=>{const p=before.positions[id];return `${p.x}:${p.y}:${p.z}`;})).size,count,'Occupied districts require distinct supported positions');
    for(const id of before.order){const p=before.positions[id];assert.ok([p.x,p.y,p.z,p.height,p.rotation].every(Number.isFinite));assert.ok(p.height>0);assert.ok(p.y+SADDLE_DECK_Y+p.height<=before.maxY+1e-9);}
    assert.equal(sim.serialize(state),serialized,'Layout derivation must not mutate saved state');
    assert.ok(sim.upgrade(state,7).ok);const pending=layout(state);
    assert.notEqual(pending.signature,before.signature);assert.ok(pending.positions[7].height>before.positions[7].height);
    for(const id of before.order){for(const axis of ['x','y','z'])near(pending.positions[id][axis],before.positions[id][axis]);if(id!==7)assert.deepEqual(pending.positions[id],before.positions[id],`Upgrade moved district ${id}`);}
    advance(state,8);const after=layout(state);assert.equal(state.buildings[7].level,2);
    near(after.positions[7].height,pending.positions[7].height);assert.deepEqual(after.order,before.order);
    assert.ok(after.maxY<=38);assert.deepEqual(after.footprint,before.footprint);
  }
});

test('cyborg compact vertical layout remains exactly equal to the frozen baseline',()=>{
  const layouts=[];
  for(const count of [3,7,20])for(const level of [1,3]){
    const buildings=Array(20).fill(null),order=VERTICAL_SLOT_ORDER.slice(0,count);
    for(const [i,id]of order.entries())buildings[id]={type:['keep','housing','farm','cannon','foundry','sawmill'][i%6],level,remaining:0};
    layouts.push(createVerticalLayout(buildings,order,'cyborg'));
  }
  assert.equal(hash(JSON.stringify(layouts)),BASELINE.cyborgLayouts);
});

test('visual remake preserves both original skinned source assets unchanged',async()=>{
  // Authored shells retain original vertices as an invisible contact pool.
  // Pose adapters restrict sampling to it; dedicated real-asset motion and
  // contact tests check behavior instead of freezing their entire source files.
  const files={
    'assets/carriers/meshy/flesh.glb':'b9dcc002b95c6495522a8b2a7ec8a27fb88de7add8a2e0265a34177b3a9c872f',
    'assets/carriers/meshy/cyborg.glb':'790b50caabb5b0d33635281e62a9c5b9a050ffb1870171e8f8c111675bd92f45',
  };
  for(const [file,expected]of Object.entries(files))assert.equal(hash(await readFile(new URL('../'+file,import.meta.url))),expected,file);
});

async function sceneDistrictFixture(){
  const file=new URL('../src/scene.js',import.meta.url),source=await readFile(file,'utf8');
  assert.equal((source.match(/function updateDistricts\(/g)||[]).length,1);
  assert.ok(!source.includes('__saddleDistrictFixture'));
  // Observe the actual private construction function in memory only. Runtime
  // source and its ordinary relative dependencies remain untouched on disk.
  const transformed=source.replace(/from '([^']+)'/g,(_,relative)=>`from ${JSON.stringify(new URL(relative,file).href)}`)+'\nexport {updateDistricts as __saddleDistrictFixture};\n';
  const module=await import('data:text/javascript,'+encodeURIComponent(transformed));
  return {update:module.__saddleDistrictFixture,Scene:module.GameScene,file,source};
}

test('actual saddle decks support resident loops and keep occupied picking IDs and ward inspection aligned',async()=>{
  const savedDocument=globalThis.document,gradient={addColorStop(){}},context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>target[key]??(()=>{})});
  // Only CPU geometry/instanced poses are inspected. Canvas drawing is inert;
  // this does not claim rendered texture, shader or browser/UI validation.
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){}})};
  const {createCitizens,animateCitizens}=await import('../src/citizens.js');
  const {disposeGroup}=await import('../src/materials.js');
  const fixture=await sceneDistrictFixture();
  try{
    for(const count of [3,7,20])for(const level of [1,3]){
      const state=rich('flesh');state.rings=count>7?2:1;state.buildings.fill(null);state.towerOrder=VERTICAL_SLOT_ORDER.slice(0,count);
      for(const [i,id]of state.towerOrder.entries())state.buildings[id]={type:['keep','housing','farm','foundry','sawmill','armor','cannon'][i%7],level,remaining:0};
      const rig=new T.Group();rig.scale.setScalar(.55);
      const city={rig,faction:'kaiju',variant:'flesh',layout:'saddle',deckY:34,enemy:false,signature:'',rings:null,slots:[],districts:new T.Group(),plots:new T.Group(),hitGroup:new T.Group()};
      for(const group of [city.districts,city.plots,city.hitGroup]){group.position.y=34;rig.add(group);}
      const hitMaterial=new T.MeshBasicMaterial({visible:false});
      for(let id=0;id<20;id++){const hit=new T.Mesh(new T.BoxGeometry(2.8,1,3.4),hitMaterial);hit.userData.slot=id;hit.userData.noBatch=true;city.hitGroup.add(hit);city.slots.push(hit);}
      try{
        fixture.update(city,state.buildings,state.rings,state.towerOrder);rig.updateMatrixWorld(true);
        assert.equal(city.verticalLayout,null);assert.deepEqual(city.saddleLayout.order,state.towerOrder);
        // Static material batching deliberately replaces ward groups with
        // render meshes, so draw-child count is not the district count.
        assert.ok(city.districts.children.length>0);
        assert.equal(city.foundation.userData.buildableSlots,count);
        assert.deepEqual(city.slots.filter(h=>!h.userData.locked).map(h=>h.userData.slot).sort((a,b)=>a-b),state.towerOrder.slice().sort((a,b)=>a-b));
        const controls={city,cinematic:{manual(){}},cameraShot:null,towerTier:0};
        for(const [tier,id]of state.towerOrder.entries()){
          const p=city.slotPositions[id],hit=city.slots[id];near(hit.position.x,p.x);near(hit.position.z,p.z);
          const centre=hit.getWorldPosition(new T.Vector3()),outward=new T.Vector3(Math.sin(p.rotation),0,Math.cos(p.rotation)),ray=new T.Raycaster(centre.clone().addScaledVector(outward,5),outward.clone().negate());
          assert.equal(ray.intersectObject(hit,false)[0]?.object.userData.slot,id,`Actual ward proxy ${id} is not ray-pickable`);
          fixture.Scene.prototype.setTowerFloor.call(controls,tier);assert.equal(controls.towerTier,tier);assert.equal(city.saddleLayout.floors[controls.towerTier].slot,id);
        }
        const people=createCitizens(rig,34,'kaiju',{scale:.55,layout:'saddle',slotPositions:city.slotPositions,rings:state.rings});
        for(const time of [0,1,7]){
          animateCitizens(people,time,true,24,{layout:'saddle',rings:state.rings,slotPositions:city.slotPositions,verticalLayout:city.saddleLayout,activityStations:city.activityStations});rig.updateMatrixWorld(true);
          assert.equal(people.routes.length,24);
          for(const route of people.routes){
            const floor=city.saddleLayout.floors.find(f=>f.tier===route.tier);assert.ok(floor,`Resident on nonexistent ward ${route.tier}`);near(route.y,floor.y);
            const expected=rig.localToWorld(new T.Vector3(route.x,34+route.y+floor.surfaceOffset,route.z));
            const ray=new T.Raycaster(expected.clone().add(new T.Vector3(0,.02,0)),new T.Vector3(0,-1,0),0,.05),hit=ray.intersectObject(city.foundation,true)[0];
            assert.ok(hit,`Resident route lacks a real supporting saddle deck: ${floor.slot}`);
            const soleGap=expected.y-hit.point.y;assert.ok(soleGap>=-.00001&&soleGap<.013,`Resident sole/deck gap ${soleGap}; count=${count} level=${level} time=${time} resident=${route.id} slot=${floor.slot} route=${JSON.stringify({x:route.x,y:route.y,z:route.z})} hit=${hit.point.toArray()} mesh=${hit.object.name}`);
          }
        }
        const pendingId=state.towerOrder.at(-1);state.buildings[pendingId].remaining=1;fixture.update(city,state.buildings,state.rings,state.towerOrder);
        animateCitizens(people,8,false,24,{layout:'saddle',rings:state.rings,slotPositions:city.slotPositions,verticalLayout:city.saddleLayout});
        assert.ok(people.routes.every(r=>city.saddleLayout.floors[r.tier].slot!==pendingId),'Residents entered a ward still under construction');
      }finally{disposeGroup(rig);rig.clear();}
    }
    assert.equal(await readFile(fixture.file,'utf8'),fixture.source,'Observation export changed production source');
  }finally{if(savedDocument===undefined)delete globalThis.document;else globalThis.document=savedDocument;}
});

test('saddle anchors initialize on the first placed terrain pose and remain attached to their original skin triangles',async()=>{
  const keys=['document','self','fetch','createImageBitmap'],originals=new Map(keys.map(key=>[key,globalThis[key]]));
  const gradient={addColorStop(){}},context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),measureText:text=>({width:String(text).length*8})},{get:(target,key)=>target[key]??(()=>{})});
  globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){},setAttribute(){}})};
  globalThis.self=globalThis;
  globalThis.fetch=async(value,options)=>{const url=new URL(value);if(url.protocol==='file:')return new Response(readFileSync(fileURLToPath(url)),{headers:{'content-type':'model/gltf-binary'}});if(url.protocol==='blob:')return originals.get('fetch')(value,options);throw Error('CPU fixture blocks nonlocal fetch: '+url.protocol);};
  globalThis.createImageBitmap=cpuImageBitmap;
  try{
    const {loadMeshyCarriers}=await import('../src/meshy-carriers.js');await loadMeshyCarriers();
    const {makeCity,animateCity,setCityRings}=await import('../src/carriers.js'),{placeCity}=await import('../src/scene.js'),{resolveImpactAnchor}=await import('../src/impact-anchor.js');
    for(const [x,z,heading]of [[64,-37,1.15],[-95,72,-2.05]]){
      const city=makeCity('kaiju',false,2,'flesh'),adapter=city.meshyCarrier;
      try{
        assert.equal(adapter?.kind,'flesh');assert.ok(!adapter.saddleFitted,'Creation must not consume the first real placed pose');
        const bindAnchors=adapter.saddle.supports.map(s=>s.anchor);placeCity(city,x,z,heading);
        const rootBefore=[city.root.position.toArray(),city.root.quaternion.toArray(),city.root.scale.toArray()];
        animateCity(city,0,false,0);city.root.updateMatrixWorld(true);
        assert.deepEqual([city.root.position.toArray(),city.root.quaternion.toArray(),city.root.scale.toArray()],rootBefore,'Saddle initialization moved the gameplay actor');
        assert.equal(adapter.saddleFitted,true);
        for(const leg of adapter.controller.status().legs){assert.ok(Number.isFinite(leg.sampledSkinClearance));assert.ok(Math.hypot(leg.target[0]-x,leg.target[2]-z)<25,'First planted paw was cached at the construction origin');}
        const anchors=adapter.saddle.supports.map((support,i)=>{
          assert.notEqual(support.anchor,bindAnchors[i],'Initial bind-pose anchor was not replaced');assert.ok(support.anchor.surface,'Actual imported skin needs barycentric attachment');
          const sampleX=support.sampleX,sampleZ=support.sampleZ;
          assert.ok(Number.isFinite(sampleX)&&Number.isFinite(sampleZ),'Native anatomical support declares actual finite sample coordinates');
          const origin=city.rig.localToWorld(new T.Vector3(sampleX,40,sampleZ)),down=new T.Vector3(0,-1,0).transformDirection(city.rig.matrixWorld),hit=new T.Raycaster(origin,down).intersectObjects(adapter.renderMeshes,false)[0];
          assert.ok(hit);assert.ok(resolveImpactAnchor(support.anchor).distanceTo(hit.point)<1e-6,'Anchor does not match the actual first posed skin surface');
          const pad=adapter.saddle.group.worldToLocal(resolveImpactAnchor(support.anchor));pad.y+=.18;assert.ok(pad.distanceTo(support.pad.position)<1e-6);
          return support.anchor;
        });
        placeCity(city,x+.2*Math.sin(heading),z+.2*Math.cos(heading),heading);animateCity(city,1/60,true,0);city.root.updateMatrixWorld(true);
        for(const [i,support]of adapter.saddle.supports.entries()){
          assert.equal(support.anchor,anchors[i],'A later motion frame replaced the attached triangle');
          const pad=adapter.saddle.group.worldToLocal(resolveImpactAnchor(support.anchor));pad.y+=.18;assert.ok(pad.distanceTo(support.pad.position)<1e-6,'Moving skin detached from its pad');
        }
        const state=rich('flesh'),syncLoad=()=>setCityRings(city,state.rings,state.buildings,state.towerOrder);
        syncLoad();assert.equal(city.saddleLayout.rearLoaded,false);assert.equal(adapter.saddle.rearFrame.visible,false,'Starter city shows unsupported empty rear framing');
        assert.ok(sim.expandRing(state).ok);advance(state,12);syncLoad();
        assert.equal(city.saddleLayout.rearLoaded,false);assert.equal(adapter.saddle.rearFrame.visible,false,'Capacity reinforcement alone shows empty rear framing');
        while(state.towerOrder.length<7){
          const id=VERTICAL_SLOT_ORDER.find(slot=>!state.buildings[slot]);assert.ok(sim.build(state,'housing',id).ok);syncLoad();
          const hasRearWard=state.towerOrder.length===7;
          assert.equal(city.saddleLayout.rearLoaded,hasRearWard);assert.equal(adapter.saddle.rearFrame.visible,hasRearWard,'Rear framing must appear with its first occupied rear ward');
        }
      }finally{adapter?.controller?.dispose();}
    }
  }finally{for(const [key,value]of originals){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
