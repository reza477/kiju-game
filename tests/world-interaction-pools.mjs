// Production interaction-factory coverage in a blank local document. There is
// deliberately no WebGLRenderer, render loop, capture or GPU benchmark here.
import {createRequire} from 'node:module';import {homedir} from 'node:os';import path from 'node:path';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright');}catch{pw=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/graphics-09-builder-02/pools');await fs.mkdir(out,{recursive:true});
const report={checks:[],errors:[],remote:[],fixture:'Actual createWorldInteractions, fixed Three instance storage and532 controlled scenery anchors; no WebGLRenderer.'};
const browser=await pw.chromium.launch({headless:true,channel:'chrome',args:['--disable-gpu','--mute-audio']});
try{
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/__pool_fixture')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body>CPU interaction pool verification</body></html>'});if(u.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
 await page.goto('http://127.0.0.1:4178/__pool_fixture');
 Object.assign(report,await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{createWorldInteractions}=await import('/src/landscape.js'),{terrainHeight,protectedResource}=await import('/src/terrain.js');
  const group=new T.Group(),shape=new T.BoxGeometry(1,1,1),source=new T.InstancedMesh(shape,new T.MeshBasicMaterial(),532),item={items:[],mesh:source},records=[],m=new T.Matrix4(),checks=[];
  group.add(source);const expect=(ok,why)=>{if(!ok)throw Error(why);checks.push(why);};
  for(let i=0;i<532;i++){
    const x=i===531?-65:200+i%20*12,z=i===531?-15:-400+Math.floor(i/20)*12,y=terrainHeight(x,z);
    item.items.push({x,y,z,sx:1,sy:1,sz:1,yaw:0});source.setMatrixAt(i,m.makeTranslation(x,y,z));
    records.push({id:`pool-fixture:${i}`,kind:i===512?'rock':i===513?'tree':i%2?'rock':'tree',x,z,size:.55,parts:[{batch:item,first:i,count:1}]});
  }
  const api=createWorldInteractions(group,records),pools=group.children.filter(o=>o.isInstancedMesh&&o!==source),byName=Object.fromEntries(pools.map(o=>[o.name,o]));
  const treeNames=['Crushed tree stumps','Broken trunk cores','Fallen trunks and branches','Crushed fallen boughs'],rubble=byName['Fresh crushed rock fragments'],foot=byName['Titan footprints'],tank=byName['Persistent crawler tread impressions'];
  const storage=new Map(pools.map(o=>[o,o.instanceMatrix.array]));let assertions=0;
  const active=(mesh,i)=>mesh.instanceMatrix.array[i*16+13]>-4000;
  function scan(label){
    let activeCount=0,submitted=0,visible=0;
    for(const mesh of pools){
      let highest=-1,count=0;for(let i=0;i<mesh.instanceMatrix.count;i++)if(active(mesh,i)){highest=i;count++;}
      if(mesh.count!==highest+1||mesh.visible!==(count>0)||mesh.instanceMatrix.array!==storage.get(mesh))throw Error(label+': invalid prefix/visibility/storage '+mesh.name);
      activeCount+=count;submitted+=mesh.count;if(mesh.visible)visible++;assertions+=3;
    }
    if(JSON.stringify(api.stats.poolDraw)!==JSON.stringify({activeInstances:activeCount,submittedInstances:submitted,visibleMeshes:visible}))throw Error(label+': diagnostics disagree with real matrices');
    for(let i=0;i<400;i++){if(active(foot,i)&&active(tank,i))throw Error(label+': both trail styles occupy shared slot '+i);assertions++;}
    return {activeCount,submitted,visible};
  }
  expect(scan('fresh').submitted===0,'Fresh world submits zero dormant pool instances.');
  expect(api.stats.destroyedCount===0,'Fresh world has no destroyed scenery.');
  const damage=[records[0].id];api.resetInteractions({mode:'expedition',damage});
  expect(treeNames.every((name,i)=>byName[name].count===(i<2?1:3))&&rubble.count===0,'One crushed tree occupies one stump/cut and three log/bough slots; no rubble.');scan('one-tree');
  api.resetInteractions({mode:'expedition',damage:[records[1].id]});
  expect(treeNames.every(name=>byName[name].count===0)&&rubble.count===3,'One crushed rock submits rubble only.');scan('one-rock');
  const mixed=[records[0].id,records[1].id,records[2].id];api.resetInteractions({mode:'expedition',damage:mixed});
  expect(byName['Crushed tree stumps'].count===3&&!active(byName['Crushed tree stumps'],1)&&active(byName['Crushed tree stumps'],2),'Sparse tree slots retain stable addressing and an invisible internal hole.');scan('mixed');
  const snapshot=()=>pools.slice(0,5).map(o=>Array.from(o.instanceMatrix.array));
  const beforeSave=JSON.stringify(snapshot()),saved=JSON.parse(JSON.stringify(mixed));api.resetInteractions();expect(scan('reset').submitted===0,'Reset hides all pool meshes and trims all submitted prefixes to zero.');
  api.resetInteractions({mode:'expedition',damage:saved});expect(JSON.stringify(snapshot())===beforeSave,'JSON save reload restores identical deterministic debris matrices and stable slots.');scan('reload');
  const full=records.slice(0,512).map(r=>r.id);api.resetInteractions({mode:'expedition',damage:full});expect(api.stats.destroyedCount===512,'All512 debris slots can be populated.');scan('full');
  function cross(record){
    const actor={id:'overflow-titan',faction:'kaiju',variant:'cyborg',scale:.55,x:record.x-.2,z:record.z,angle:Math.PI/2,moving:false};
    api.interact([actor],.1,{mode:'expedition',damage:full});actor.x=record.x+.2;actor.moving=true;api.interact([actor],.1,{mode:'expedition',damage:full});
  }
  cross(records[512]);
  expect(api.stats.destroyedCount===512&&full.length===512&&!full.includes(records[0].id)&&full.includes(records[512].id),'The513th actual collision evicts the oldest entry while preserving the512 save limit.');
  expect(treeNames.every(name=>!active(byName[name],0))&&[0,1,2].every(i=>active(rubble,i)),'Tree-to-rock slot recycling clears old tree geometry and fills the same slot with rubble.');
  expect(active(source,0)&&!active(source,512),'Overflow restores the old original and hides the newly crushed original.');scan('overflow-rock');
  cross(records[513]);expect([3,4,5].every(i=>!active(rubble,i))&&treeNames.every((name,i)=>active(byName[name],i<2?1:3)),'Rock-to-tree recycling clears old rubble and restores the correct tree pool types.');scan('overflow-tree');
  const empty=[];api.resetInteractions({mode:'battle',damage:empty});expect(scan('mode-switch').submitted===0&&api.stats.destroyedCount===0,'Switching save mode clears debris and trail state.');
  let firstFull=null,afterFull=0,priorX,priorZ;
  for(let i=0;i<130;i++){
    const a=i*.18,x=-315+65*Math.cos(a),z=-280+65*Math.sin(a),crawler=i%2===0;
    const actor={id:'mixed-trails',faction:crawler?'crawler':'kaiju',variant:crawler?'standard':'cyborg',scale:.55,x,z,angle:i?Math.atan2(x-priorX,z-priorZ):0,moving:true};
    api.interact([actor],.1,{mode:'battle',damage:empty});scan('trail-'+i);priorX=x;priorZ=z;
    if(api.stats.trackCount===400){if(firstFull===null)firstFull=JSON.stringify([Array.from(foot.instanceMatrix.array),Array.from(tank.instanceMatrix.array)]);else afterFull++;}
  }
  const last=scan('wrapped');expect(api.stats.trackCount===400&&last.activeCount===400,'Mixed kaiju/tank trails share exactly400 active slots after repeated wrap.');
  expect(afterFull>40&&firstFull!==JSON.stringify([Array.from(foot.instanceMatrix.array),Array.from(tank.instanceMatrix.array)]),'More than40 further traversal updates replace old trail matrices after the400-slot buffer fills.');
  expect(foot.visible&&tank.visible,'Both footprint styles remain represented after mixed recycling.');
  api.resetInteractions({mode:'expedition',damage:[records[531].id]});expect(scan('protected-load').submitted===0,'A protected resource anchor in loaded damage produces no debris.');
  const protectedDamage=[];api.resetInteractions({mode:'expedition',damage:protectedDamage});
  api.interact([{id:'protected',faction:'crawler',scale:.55,x:-75,z:-15,angle:Math.PI/2,moving:true}],.1,{mode:'expedition',damage:protectedDamage});
  api.interact([{id:'protected',faction:'crawler',scale:.55,x:-55,z:-15,angle:Math.PI/2,moving:true}],.1,{mode:'expedition',damage:protectedDamage});
  expect(scan('protected-travel').submitted===0&&protectedDamage.length===0&&active(source,531),'Crossing a protected resource neither stamps the ground nor destroys its original.');
  expect(records.slice(0,531).every(r=>!protectedResource(r.x,r.z)),'Controlled overflow scenery lies outside resource protection.');
  return{checks,assertions,afterFullUpdates:afterFull,poolMeshes:pools.length,capacities:pools.map(o=>({name:o.name,capacity:o.instanceMatrix.count})),final:api.stats.poolDraw};
 }));
 await page.waitForFunction(async()=>{const {surfaceDiagnostics}=await import('/src/surface-library.js');return surfaceDiagnostics().pending===0;},{},{timeout:30000});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
