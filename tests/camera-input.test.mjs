import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraGesture,GRAPHICS_QUALITY_KEY,initialGraphicsQuality} from '../src/camera-input.js';
import {GameScene} from '../src/scene.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('a tap picks; orbit, a distant release, and cancelled contacts never pick',()=>{
  const g=new CameraGesture();g.down(1,10,10);
  assert.equal(g.move(1,12,12),null);assert.deepEqual(g.up(1,12,12),{x:12,y:12});
  g.down(1,10,10);assert.deepEqual(g.move(1,20,15),{kind:'orbit',dx:10,dy:5});
  assert.equal(g.up(1,10,10),null,'Returning to the start does not turn a drag into a tap');
  g.down(1,0,0);assert.equal(g.up(1,100,100),null,'No move event is needed to reject a distant release');
  g.down(1,0,0);g.cancel(1);assert.equal(g.up(1,0,0),null);
});

test('pinch uses finger separation and transitions back to orbit without a pick or jump',()=>{
  const g=new CameraGesture();g.down(1,0,0);g.down(2,100,0);
  assert.deepEqual(g.move(2,200,0),{kind:'zoom',scale:.5});
  assert.deepEqual(g.move(1,100,0),{kind:'zoom',scale:2});
  assert.equal(g.up(2,200,0),null);
  assert.deepEqual(g.move(1,103,2),{kind:'orbit',dx:3,dy:2});
  assert.equal(g.up(1,103,2),null);
  g.down(7,50,60);assert.deepEqual(g.up(7,50,60),{x:50,y:60},'Next independent tap works');
});

test('third contacts, crossing fingers, lost capture, and pointer replacement remain finite',()=>{
  const g=new CameraGesture();g.down(1,0,0);g.down(2,100,0);g.down(3,300,0);
  assert.equal(g.move(3,350,0),null,'Third finger does not drive the current pinch');
  assert.equal(g.up(1,0,0),null);
  assert.deepEqual(g.move(3,600,0),{kind:'zoom',scale:.5},'New pair starts at current positions');
  assert.equal(g.move(2,600,0),null);assert.equal(g.move(2,500,0),null,'Collapsed pair rebases safely');
  assert.deepEqual(g.move(2,400,0),{kind:'zoom',scale:.5});
  g.cancel(3);assert.deepEqual(g.move(2,405,0),{kind:'orbit',dx:5,dy:0});
  assert.equal(g.up(2,405,0),null);
  g.down(4,0,0);assert.deepEqual(g.reset(),[4]);assert.equal(g.move(4,100,0),null);
});

function fakeSurface(){
  const listeners=new Map(),captured=new Set();
  return {
    addEventListener(type,callback){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(callback);},
    emit(type,detail={}){const event={pointerId:1,clientX:0,clientY:0,preventDefault(){this.prevented=true;},...detail};for(const fn of listeners.get(type)??[])fn(event);return event;},
    focus(){},setPointerCapture(id){captured.add(id);},hasPointerCapture(id){return captured.has(id);},
    releasePointerCapture(id){captured.delete(id);this.emit('lostpointercapture',{pointerId:id});},
  };
}

test('scene input wiring preserves mouse/wheel controls, captures fingers, and clamps both zoom modes',t=>{
  const previousWindow=globalThis.window,previousDocument=globalThis.document;globalThis.window=fakeSurface();globalThis.document=fakeSurface();
  t.after(()=>{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});
  const canvas=fakeSurface(),picks=[],scene={canvas,yaw:1,pitch:.5,zoom:80,state:{mode:'expedition'},cinematic:{manual(){}},pick:(x,y)=>picks.push([x,y])};
  GameScene.prototype.addPointer.call(scene);
  canvas.emit('pointerdown',{clientX:20,clientY:30});assert.ok(canvas.hasPointerCapture(1));
  canvas.emit('pointerup',{clientX:20,clientY:30});assert.deepEqual(picks,[[20,30]]);assert.ok(!canvas.hasPointerCapture(1));
  canvas.emit('pointerdown');canvas.emit('pointermove',{clientX:20,clientY:10});canvas.emit('pointerup',{clientX:20,clientY:10});
  near(scene.yaw,.88);near(scene.pitch,.54);assert.equal(picks.length,1);
  assert.ok(canvas.emit('wheel',{deltaY:100}).prevented);near(scene.zoom,86);
  canvas.emit('pointerdown');canvas.emit('pointerdown',{pointerId:2,clientX:100});
  canvas.emit('pointermove',{pointerId:2,clientX:200});near(scene.zoom,43);
  canvas.emit('pointermove',{pointerId:2,clientX:2000});assert.equal(scene.zoom,10);
  canvas.emit('pointermove',{pointerId:2,clientX:4});assert.equal(scene.zoom,330);
  scene.state.mode='battle';canvas.emit('pointermove',{pointerId:2,clientX:100});assert.equal(scene.battleZoomFactor,.9);
  canvas.emit('pointermove',{pointerId:2,clientX:4});assert.equal(scene.battleZoomFactor,2.4);
  canvas.emit('pointercancel',{pointerId:2});canvas.emit('pointerup');assert.equal(picks.length,1);
  canvas.emit('pointerdown');globalThis.window.emit('blur');assert.ok(!canvas.hasPointerCapture(1));
  const yaw=scene.yaw;canvas.emit('pointermove',{clientX:200});canvas.emit('pointerup');assert.equal(scene.yaw,yaw);assert.equal(picks.length,1);
  for(const boundary of ['hidden','pagehide','dialog']){
    canvas.emit('pointerdown',{clientX:20,clientY:30});
    if(boundary==='hidden'){globalThis.document.hidden=true;globalThis.document.emit('visibilitychange');}
    else if(boundary==='pagehide')globalThis.window.emit('pagehide');
    else scene.clearPointerInput();
    assert.ok(!canvas.hasPointerCapture(1),boundary+' releases capture');
    canvas.emit('pointerup',{clientX:20,clientY:30});assert.equal(picks.length,1,boundary+' cannot become a terrain tap');
  }
});

test('quality defaults are conservative for touch and restore only recognized explicit preferences',()=>{
  assert.equal(initialGraphicsQuality(null,true),'performance');assert.equal(initialGraphicsQuality(null,false),'high');
  for(const preference of ['high','balanced','performance'])for(const coarse of [true,false])assert.equal(initialGraphicsQuality(preference,coarse),preference);
  for(const invalid of [undefined,'retro','HIGH','null','{"quality":"high"}',{},0])assert.equal(initialGraphicsQuality(invalid,true),'performance');
});

test('quality changes persist independently of saves; startup defaults and invalid choices do not write',t=>{
  const oldStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),oldDpr=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
  const saved=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(key,value)=>saved.set(key,value)}});
  Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:2});
  t.after(()=>{for(const [key,descriptor]of [['localStorage',oldStorage],['devicePixelRatio',oldDpr]]){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  let dpr,postQuality,landscapeQuality;
  const scene={renderer:{setPixelRatio:value=>dpr=value,shadowMap:{}},sun:{shadow:{mapSize:{x:4096,set(x){this.x=x;}}}},presentation:{setQuality:value=>postQuality=value},atmosphere:{setQuality(){}},landscape:{setQuality:value=>landscapeQuality=value},resize(){}};
  assert.equal(GameScene.prototype.setQuality.call(scene,'performance',{persist:false}),true);
  assert.equal(saved.size,0);assert.equal(dpr,.85);assert.equal(scene.renderer.shadowMap.enabled,false);assert.equal(postQuality,'performance');assert.equal(landscapeQuality,'retro');
  GameScene.prototype.setQuality.call(scene,'balanced');assert.equal(saved.get(GRAPHICS_QUALITY_KEY),'balanced');assert.equal(dpr,1.2);assert.equal(scene.renderer.shadowMap.enabled,true);
  assert.equal(GameScene.prototype.setQuality.call(scene,'invalid'),false);assert.equal(scene.quality,'balanced');assert.equal(saved.size,1);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('storage unavailable');}});
  assert.doesNotThrow(()=>GameScene.prototype.setQuality.call(scene,'high'));assert.equal(scene.quality,'high');
});
