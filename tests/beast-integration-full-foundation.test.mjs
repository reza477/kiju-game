import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
import {surface} from './helpers/frame-clearance.mjs';
import {captureFoundation,compareFoundation,inspectFoundation,hasFoundationFailure} from './helpers/full-foundation-clearance.mjs';
import {SADDLE_MOUNTS,SADDLE_SLOT_ORDER,SADDLE_DECK_Y,SADDLE_DISTRICT_SIZE,createSaddleLayout} from '../src/saddle-layout.js';

const sequence=(first,last)=>Array.from({length:last-first+1},(_,i)=>first+i);
// Replay every update. Inspect consecutive poses around the observed frame234
// penetration and the stop/settle transition, plus broad gait extremes.
const gaitChecks=new Set([0,12,13,60,120,180,...sequence(228,240),270,...sequence(299,306),312,324,...sequence(328,336),359,360,384,420]);
const strikeChecks=new Set([0,12,13,14,15,24,42,64,77,78,79,80,90,120,150]);

test('native saddle fit preserves historical slots, capacity, mount Y/Z and circulation dimensions',()=>{
  const savedOrder=[7,11,13,0,1,2,3,4,5,6,8,9,10,12,14,15,16,17,18,19];
  assert.deepEqual(SADDLE_SLOT_ORDER,savedOrder);
  assert.equal(SADDLE_DECK_Y,34);
  assert.deepEqual(SADDLE_DISTRICT_SIZE,{width:3.45,depth:3.8});
  // These Y/Z/rotation/zone/side/row records predate the visual X-only fitting.
  const historical=[
    [29,-9.7,Math.PI,'crown',-1,0],[26,-9.7,-Math.PI/2,'upper-pannier',-1,1],
    [26,-9.7,Math.PI/2,'upper-pannier',1,1],[29,-9.7,Math.PI,'crown',1,0],
    [26.5,-6,-Math.PI/2,'upper-pannier',-1,0],[26.5,-6,Math.PI/2,'upper-pannier',1,0],
    [24.3,-14.8,Math.PI,'crown',-1,1],[24.3,-14.8,Math.PI,'crown',1,1],
    [23.6,-13.4,-Math.PI/2,'upper-pannier',-1,2],[23.6,-13.4,Math.PI/2,'upper-pannier',1,2],
    [21,-17.1,-Math.PI/2,'upper-pannier',-1,3],[21,-17.1,Math.PI/2,'upper-pannier',1,3],
    [22.2,-9.7,-Math.PI/2,'lower-pannier',-1,1],[22.2,-9.7,Math.PI/2,'lower-pannier',1,1],
    [22.5,-6,-Math.PI/2,'lower-pannier',-1,0],[22.5,-6,Math.PI/2,'lower-pannier',1,0],
    [19.6,-13.4,-Math.PI/2,'lower-pannier',-1,2],[19.6,-13.4,Math.PI/2,'lower-pannier',1,2],
    [17.2,-17.1,-Math.PI/2,'lower-pannier',-1,3],[17.2,-17.1,Math.PI/2,'lower-pannier',1,3]
  ];
  assert.equal(SADDLE_MOUNTS.length,20);
  SADDLE_MOUNTS.forEach((m,tier)=>assert.deepEqual([m.absoluteY,m.z,m.rotation,m.zone,m.side,m.row],historical[tier]));
  const x=[-1.83,-6.65,6.65,1.83,-6.9,6.9,-1.83,1.83,-6.65,6.65,-6.65,6.65,-8.4,8.4,-8.4,8.4,-10.5,10.5,-9.6,9.6];
  assert.deepEqual(SADDLE_MOUNTS.map(m=>m.x),x);
  const width=2*Math.max(...SADDLE_MOUNTS.map(m=>Math.abs(m.x)+Math.abs(Math.cos(m.rotation))*1.73+Math.abs(Math.sin(m.rotation))*1.9));
  assert.ok(Math.abs(width-24.8)<1e-12);
  for(const order of[savedOrder,[...savedOrder].reverse()])for(const level of[1,2,3])for(let count=0;count<=20;count++){
    const buildings=Array(20).fill(null);
    for(const slot of order.slice(0,count))buildings[slot]={type:'housing',level,remaining:slot%2?2:0,upgrading:slot%3===0};
    const input=JSON.stringify({buildings,order}),layout=createSaddleLayout(buildings,order);
    assert.equal(JSON.stringify({buildings,order}),input,'Layout must not mutate save-authoritative data');
    assert.deepEqual(layout.order,order.slice(0,count));
    assert.equal(layout.positions.length,20);assert.equal(layout.floors.length,count);
    assert.equal(layout.footprint.width,width);assert.equal(layout.footprint.depth,14.55);
    assert.equal(layout.nextSlot,count===20?null:savedOrder.find(id=>!buildings[id]));
    for(const [tier,floor]of layout.floors.entries()){
      const mount=SADDLE_MOUNTS[tier],p=layout.positions[floor.slot];
      assert.equal(floor.slot,order[tier]);assert.equal(floor.tier,tier);
      assert.equal(p.x,mount.x);assert.equal(p.z,mount.z);assert.equal(p.y+SADDLE_DECK_Y,mount.absoluteY);
      assert.equal(p.width,3.45);assert.equal(p.depth,3.8);
      assert.equal(floor.level,Math.min(3,level+(buildings[floor.slot].upgrading?1:0)));
      assert.equal(floor.underConstruction,buildings[floor.slot].remaining>0);
      assert.equal(floor.width,.62);assert.equal(floor.surfaceOffset,.109);
      const local=floor.path.map(point=>{const dx=point.x-mount.x,dz=point.z-mount.z;return[dx*Math.cos(mount.rotation)-dz*Math.sin(mount.rotation),dx*Math.sin(mount.rotation)+dz*Math.cos(mount.rotation)];});
      for(const corner of local){assert.ok(Math.abs(Math.abs(corner[0])-1.36)<1e-12);assert.ok(Math.abs(Math.abs(corner[1])-1.49)<1e-12);}
    }
  }
});

test('complete saddle foundation clears skin through known gait failures, settling and representative flight',async t=>{
  const restore=installCPUCarrierEnvironment(),failures=[],samples=[],created=[];
  let assets;
  try{
    assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers();
    const {makeCity,animateCity,setCityRings}=await import('../src/carriers.js');
    const {placeCity,GameScene}=await import('../src/scene.js');
    const {resolveImpactAnchor}=await import('../src/impact-anchor.js');
    const sim=await import('../src/simulation.js');
    const make=(faction='kaiju',enemy=false,variant='flesh')=>{const c=makeCity(faction,enemy,2,variant);created.push(c);return c;};
    const dispose=c=>{if(c.meshyCarrier){c.meshyCarrier.controller?.dispose();assets.disposeMeshyCarrier(c.meshyCarrier.instance);}created.splice(created.indexOf(c),1);};
    const populate=city=>{
      const state=sim.createGame('kaiju','flesh'),added=state.buildings.flatMap((b,i)=>b?[]:[i]);
      for(const id of added)state.buildings[id]={type:'housing',level:1,remaining:0};
      state.towerOrder.push(...added);state.rings=2;
      setCityRings(city,2,state.buildings,state.towerOrder);
      assert.equal(city.saddleLayout.floors.length,20);
      return state;
    };
    const check=(city,captured,label)=>{
      const result=inspectFoundation(city,captured,label);
      samples.push({label,triangles:result.triangles});
      if(hasFoundationFailure(result))failures.push(result);
    };
    let city=make();populate(city);let captured=captureFoundation(city);
    const kinds=new Set(captured.faces.map(f=>f.kind));
    for(const kind of['tapered-wood-bottom','underdeck-U-strap','occupied-joist'])assert.ok(kinds.has(kind),'Missing real foundation surface: '+kind);
    // Probe real foundation faces outside the formerly checked joist group.
    // The tiny synthetic skin triangles overlap each selected rendered face;
    // neither the loaded skin nor any runtime geometry is changed.
    for(const kind of['tapered-wood-bottom','underdeck-U-strap','occupied-joist']){
      const face=captured.faces.findIndex(f=>f.kind===kind),points=[0,1,2].map(k=>captured.vertices[captured.indices[face*3+k]]),centre=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);
      const probeGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>centre.clone().lerp(p,.2).toArray()),3));
      const probe=new T.Mesh(probeGeometry);probe.updateMatrixWorld(true);
      const probeSurface=surface([probe]),result=compareFoundation(captured,probeSurface,null);
      assert.ok(Object.values(result.categories).some(category=>category.kind===kind&&category.actualPairs+category.marginOnlyPairs>0),'Clearance probe omitted '+kind);
      probeGeometry.dispose();probe.material.dispose();
    }
    let x=0,z=0;
    for(let frame=0;frame<=420;frame++){
      const moving=frame>12&&frame<300,heading=frame<120?0:.35*Math.sin((frame-120)/60);
      if(moving){x+=Math.sin(heading)*.12;z+=Math.cos(heading)*.12;}
      placeCity(city,x,z,heading);animateCity(city,frame/60,moving,0);
      if(gaitChecks.has(frame))check(city,captured,'gait-'+frame);
    }
    assert.ok(samples.some(s=>s.label==='gait-234'));
    dispose(city);
    const cases=[
      {variant:'standard',faction:'crawler',x:-60,z:30,heading:0,flight:false},
      {variant:'horizontal',faction:'airship',x:-50,z:-50,heading:-Math.PI/2,flight:true},
      {variant:'drill',faction:'crawler',x:85,z:-70,heading:-Math.PI/2,flight:true}
    ];
    for(const options of cases){
      city=make();const state=populate(city),enemy=make(options.faction,true,options.variant),range=sim.meleeReach('kaiju',options.faction,'flesh',options.variant);
      enemy.id='full-foundation-regression-'+options.variant;
      const ex=options.x+Math.sin(options.heading)*range,ez=options.z+Math.cos(options.heading)*range;
      placeCity(city,options.x,options.z,options.heading);placeCity(enemy,ex,ez,options.heading+Math.PI);
      animateCity(city,0,false,0);animateCity(enemy,0,false,0);
      state.time=1;state.battle={time:0,command:'hold',enemyId:enemy.id,player:{x:options.x,z:options.z},enemy:{x:ex,z:ez}};
      const saved=sim.serialize(state),context={city,enemyCities:[enemy],state,scene:new T.Scene(),fx:[],cinematic:{mode:'steady',impulse(){}}};
      GameScene.prototype.createEffect.call(context,{kind:'impact',source:'player',time:0,from:state.battle.player,to:state.battle.enemy,mounts:[]});
      const impact=context.fx.find(f=>f.kind==='impact');assert.ok(impact?.anchor);
      captured=captureFoundation(city);let wasAirborne=false,airborneFrames=0,landings=0;
      for(let frame=0;frame<=150;frame++){
        const time=1+frame/60;
        resolveImpactAnchor(impact.anchor,impact.end);city.strikeTarget.copy(impact.end);
        animateCity(enemy,time,true,0);
        resolveImpactAnchor(impact.anchor,impact.end);city.strikeTarget.copy(impact.end);
        animateCity(city,time,false,0);
        const status=city.meshyCarrier.controller.status(),airborne=Boolean(status.airborne);
        if(airborne){airborneFrames++;assert.ok(status.legs.every(leg=>!leg.planted&&leg.plantWorld===null),'Do not retain planted feet in flight');}
        if(wasAirborne&&!airborne){landings++;assert.ok(status.legs.filter(leg=>leg.planted).length>=3,'Landing must regain support');}
        if(strikeChecks.has(frame)||airborne!==wasAirborne)check(city,captured,options.variant+'-strike-'+frame);
        wasAirborne=airborne;
      }
      assert.equal(sim.serialize(state),saved);
      if(options.flight){assert.ok(airborneFrames>0);assert.ok(landings>0);}
      assert.equal(city.meshyCarrier.controller.status().airborne,false);
      dispose(city);dispose(enemy);
    }
    t.diagnostic(JSON.stringify({skinMarginRig:.04,slabMarginRig:.12,gaitFrames:[...gaitChecks],strikeFrames:[...strikeChecks],samples,failures}));
    assert.deepEqual(failures,[],'All complete rendered foundation surfaces and all20 slabs must clear the actual posed skin');
  }finally{
    for(const city of created)if(city.meshyCarrier){city.meshyCarrier.controller?.dispose();assets.disposeMeshyCarrier(city.meshyCarrier.instance);}
    restore();
  }
});
