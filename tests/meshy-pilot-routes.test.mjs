import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {pilotConfig,validatePilotConfig,nextNativeSegment} from './helpers/meshy-pilot-config.mjs';
import {installMeshyObserver} from './helpers/meshy-native-observer.mjs';

test('pilot routes remain distinct, bounded and return to their common origin',()=>{
  validatePilotConfig(pilotConfig);
  for(const route of pilotConfig.routes)assert.deepEqual((route.returnWaypoints||route.waypoints).at(-1),[-45,-93]);
  assert.equal(new Set(pilotConfig.routes.map(r=>JSON.stringify(r.waypoints))).size,3);
  assert.equal(pilotConfig.captures.filter(c=>c.profile==='desktop').length,3);
});
test('native navigation reaches every fixed waypoint across camera headings',()=>{
  for(const yaw of [0,.72,2.4,-1.1])for(const route of pilotConfig.routes){
    let p={...pilotConfig.initial};
    for(const target of [...route.waypoints,...route.returnWaypoints||[]]){
      let steps=0,s;while((s=nextNativeSegment(p,target,yaw,pilotConfig.tolerance))&&steps++<30){
        const vector={right:[Math.cos(yaw),-Math.sin(yaw)],left:[-Math.cos(yaw),Math.sin(yaw)],up:[-Math.sin(yaw),-Math.cos(yaw)],down:[Math.sin(yaw),Math.cos(yaw)]}[s.direction];
        // Include a small observed-input release latency; this tests convergence,
        // not the production simulation or movement speed.
        p={x:p.x+vector[0]*(s.distance+.12),z:p.z+vector[1]*(s.distance+.12)};
      }
      assert.ok(Math.hypot(p.x-target[0],p.z-target[1])<=pilotConfig.tolerance,JSON.stringify({yaw,target,p,steps}));
    }
  }
});
test('invalid route coordinates or capture layouts fail before a browser launches',()=>{
  const config=structuredClone(pilotConfig);config.routes[0].waypoints[0]=[NaN,0];assert.throws(()=>validatePilotConfig(config));
  assert.throws(()=>validatePilotConfig({...pilotConfig,captures:[]}));
});

test('the isolated route fixture is installed once and cannot erase a real save on reload',()=>{
  const values=new Map(),localStorage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,value)};
  const install=()=>{
    const window={addEventListener(){}},document={addEventListener(){}};
    runInNewContext('('+installMeshyObserver.toString()+')({quality:"high",fixture:"initial isolated fixture",gpuTiming:false})',{window,document,localStorage,requestAnimationFrame(){},performance:{now:()=>0}});
  };
  install();assert.equal(values.get('colossus-wake-save-v1'),'initial isolated fixture');
  const nativeSave=JSON.stringify({worldDamage:{expedition:['tree:477','river-spit:1'],battle:[]},x:-51,z:-116});
  localStorage.setItem('colossus-wake-save-v1',nativeSave);install();
  assert.equal(values.get('colossus-wake-save-v1'),nativeSave,'A page reload must load the saved destruction instead of recreating intact trees');
});
