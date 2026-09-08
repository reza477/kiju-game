/** Local v0.4 integration evidence. Isolated profile, real UI controls, no GPU instrumentation.
 * Run after integration: node tests/living-world-audit.mjs
 * OUTPUT_DIR defaults to artifacts/living-world-final; GAME_BASE_URL defaults to localhost:4178.
 */
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const output=path.resolve(process.env.OUTPUT_DIR||'artifacts/living-world-final');
const base=new URL(process.env.GAME_BASE_URL||'http://127.0.0.1:4178/');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname));
await fs.mkdir(output,{recursive:true});
const report={capturedAt:new Date().toISOString(),url:base.href,checks:[],screenshots:[],factions:[],destruction:[],weapons:[],errors:[],remote:[]};
const browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
report.browser=browser.version();let context,page;
const cleanStyle='#hud,#markers,#toast,#paused-banner,.vignette{visibility:hidden!important}';
const settle=()=>page.waitForTimeout(1100);
async function capture(name,clean=false){const file=name+'.png';await page.screenshot({path:path.join(output,file),...(clean?{style:cleanStyle}:{})});report.screenshots.push(file);}
async function open(faction='kaiju',begin=true){
 if(context)await context.close();context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();report.remote.push(url.href);return route.abort('blockedbyclient');});
 page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(new URL('?test=1',base).href,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__colossus?.scene?.city?.people?.wardrobeNames&&window.__colossus.scene.landscape.interact,{},{timeout:20000});
 if(faction!=='kaiju')await page.locator(`[data-faction="${faction}"]`).click();
 if(begin)await page.locator('#begin').click();await settle();
}
async function updateFixture(fn,arg){await page.evaluate(fn,arg);await page.evaluate(()=>window.__colossus.advance(0));await settle();}
async function inspectFaction(faction){
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{terrainHeight}=await import('/src/terrain.js');const {state,scene}=window.__colossus,c=scene.city,p=c.people;
  scene.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(c.root),size=bounds.getSize(new T.Vector3());
  const treadContact=faction=>faction==='crawler'?[-9,9].flatMap(x=>[-9,0,9].map(z=>{const p=c.root.localToWorld(new T.Vector3(x,.5,z));return p.y-terrainHeight(p.x,p.z);})):[];
  return {faction:state.faction,layout:c.layout,scale:c.scale,size:size.toArray(),slots:c.slotPositions.map(p=>({...p})),ring:state.rings,buildingIds:state.buildings.map((b,i)=>b?i:null).filter(i=>i!==null),wardrobes:p.wardrobeNames,styleCounts:p.styleCounts,skinTones:[...new Set(p.data.map(d=>d.skinTone))],hairTones:[...new Set(p.data.map(d=>d.hairTone))],worldHeightRange:p.worldHeightRange,visiblePeople:p.populationCount,instanceBatches:Object.keys(p.instances).length,life:scene.landscape.stats.lifeCount,terrainY:terrainHeight(state.x,state.z),rootY:c.root.position.y,treadContact:treadContact(state.faction),contextLost:scene.renderer.getContext().isContextLost()};
 });
 assert.equal(result.faction,faction);assert.equal(result.slots.length,20);assert.ok(result.slots.every(p=>p.y===0),'Districts occupy a flat city deck.');
 assert.equal(result.wardrobes.length,8);assert.equal(new Set(result.wardrobes).size,8);assert.equal(Object.keys(result.styleCounts).length,8);
 assert.ok(result.skinTones.length>=4&&result.hairTones.length>=4);assert.ok(result.worldHeightRange[0]>=.72&&result.worldHeightRange[1]<=.86);
 assert.ok(result.visiblePeople>0&&result.visiblePeople<=48);assert.ok(result.instanceBatches<=25);
 assert.equal(result.life,57);assert.equal(result.contextLost,false);
 if(faction==='crawler')assert.ok(Math.abs(result.treadContact.reduce((a,b)=>a+b,0)/6)<.6,'Treads follow their terrain footprint without a mean hovering gap.');
 else assert.ok(Math.abs(result.rootY-result.terrainY)<.01,'Carrier follows terrain height.');
 if(faction==='kaiju'){assert.equal(result.layout,'circular');assert.equal(result.scale,.55);}else assert.equal(result.layout,'deck');
 report.factions.push(result);return result;
}
async function streets(faction){
 await page.locator('[data-view="people"]').click();await settle();assert.equal(await page.evaluate(()=>window.__colossus.scene.view),'people');
 await capture(`streets-${faction}`);await capture(`wardrobe-${faction}`,true);
 const before=await page.evaluate(()=>Array.from(window.__colossus.scene.city.people.instances.limbs.instanceMatrix.array.slice(0,16)));
 await page.waitForTimeout(350);const after=await page.evaluate(()=>Array.from(window.__colossus.scene.city.people.instances.limbs.instanceMatrix.array.slice(0,16)));
 assert.notDeepEqual(after,before,`${faction}: human limb transforms animate.`);
 await page.locator('[data-view="city"]').click();await page.keyboard.press('4');assert.equal(await page.evaluate(()=>window.__colossus.scene.view),'people');
 await page.locator('[data-view="city"]').click();await settle();
}
async function selectSlot(slot){
 for(const yaw of [Math.PI,.7,0,Math.PI/2,-Math.PI/2]){
  await page.evaluate(yaw=>{const scene=window.__colossus.scene;scene.setView('city');scene.yaw=yaw;scene.pitch=.66;},yaw);await settle();
  const point=await page.evaluate(slot=>{
   const scene=window.__colossus.scene,proxy=scene.city.slots[slot];scene.scene.updateMatrixWorld(true);
   for(const h of [.45,.15,-.1]){
    const p=proxy.getWorldPosition(scene.camera.position.clone());const scale=scene.city.scale??1;p.y+=proxy.scale.y*h*scale;
    const q=scene.project(p.x,p.y,p.z);if(!q.visible||document.elementFromPoint(q.x,q.y)?.id!=='world')continue;
    scene.pointer.set(q.x/innerWidth*2-1,-q.y/innerHeight*2+1);scene.ray.setFromCamera(scene.pointer,scene.camera);
    if(scene.ray.intersectObjects([scene.city.hitGroup],true)[0]?.object.userData.slot===slot)return q;
   }return null;
  },slot);
  if(point){await page.mouse.click(point.x,point.y);await page.waitForTimeout(100);if(await page.locator('[data-facing]').count())return;}
 }
 throw new Error(`Could not select cannon plot ${slot} through the canvas.`);
}
async function setFacing(angle){
 const index=await page.locator('[data-facing]').evaluateAll((nodes,angle)=>nodes.findIndex(n=>Math.abs(Math.atan2(Math.sin(Number(n.dataset.facing)-angle),Math.cos(Number(n.dataset.facing)-angle)))<.0001),angle);
 assert.ok(index>=0,`A direction button exists for ${angle}.`);await page.locator('[data-facing]').nth(index).click();await settle();
}
async function treeAtSafeLocation(){
 return page.evaluate(async()=>{const {protectedResource,shoreDistance}=await import('/src/terrain.js');return window.__colossus.scene.landscape.crushables.find(r=>r.kind==='tree'&&Math.abs(r.x)<140&&Math.abs(r.z)<160&&!protectedResource(r.x,r.z,25)&&shoreDistance(r.x-18,r.z)>18&&shoreDistance(r.x+18,r.z)>18);});
}
async function hasStump(record){
 return page.evaluate(async record=>{const T=await import('/vendor/three.module.js');const mesh=window.__colossus.scene.landscape.group.getObjectByName('Crushed tree stumps');if(!mesh)return false;const matrix=new T.Matrix4(),position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.decompose(position,quaternion,scale);if(scale.y>.01&&Math.hypot(position.x-record.x,position.z-record.z)<.2)return true;}return false;},record);
}
async function driveOverTree(faction){
 const record=await treeAtSafeLocation();assert.ok(record,'An unprotected tree is available outside the river valley.');
 const beforeNodes=await page.evaluate(()=>window.__colossus.state.nodes.map(n=>({id:n.id,amount:n.amount})));
 const beforeSites=await page.evaluate(()=>window.__colossus.scene.labels.map(g=>{let meshes=0;g.traverse(o=>{if(o.isMesh&&o.visible)meshes++;});return meshes;}));
 await updateFixture(record=>{const {state}=window.__colossus;state.x=record.x-18;state.z=record.z;state.angle=Math.PI/2;state.target=null;state.moving=false;state.paused=false;},record);
 await page.locator('[data-view="world"]').click();await settle();await capture(`${faction}-rural-before`);
 await page.evaluate(record=>{const s=window.__colossus.state;s.target={x:record.x+18,z:record.z};},record);
 await page.waitForFunction(()=>window.__colossus.state.target===null,{},{timeout:12000});await settle();
 const result=await page.evaluate(()=>({faction:window.__colossus.state.faction,stats:{...window.__colossus.scene.landscape.stats},damage:[...window.__colossus.state.worldDamage.expedition],nodes:window.__colossus.state.nodes.map(n=>({id:n.id,amount:n.amount})),sites:window.__colossus.scene.labels.map(g=>{let meshes=0;g.traverse(o=>{if(o.isMesh&&o.visible)meshes++;});return meshes;})}));
 assert.deepEqual(result.nodes,beforeNodes,'Rural movement leaves resource deposits unchanged.');assert.deepEqual(result.sites,beforeSites,'Protected resource-site geometry remains intact.');
 if(faction==='airship'){assert.equal(result.damage.includes(record.id),false);assert.equal(result.stats.destroyedCount,0);assert.equal(result.stats.trackCount,0);assert.equal(await hasStump(record),false);}
 else{assert.ok(result.damage.includes(record.id),'Actual moving ground city destroys the crossed tree.');assert.ok(result.stats.trackCount>0,'Actual movement leaves tracks.');assert.ok(result.damage.length<=512);assert.equal(await hasStump(record),true,'Destroyed tree leaves visible stump geometry.');}
 result.record=record;report.destruction.push(result);await capture(`${faction}-rural-after`);
 if(faction==='kaiju'){
  await page.locator('#save').click();await page.reload();await page.waitForFunction(()=>window.__colossus?.scene?.city?.layout==='circular');await page.locator('#continue').click();await settle();
  assert.ok(await page.evaluate(id=>window.__colossus.state.worldDamage.expedition.includes(id),record.id));assert.equal(await hasStump(record),true,'Destroyed tree remains a stump after save/reload.');await capture('kaiju-destruction-restored');
 }
 return record;
}
async function gatherProtectedResource(){
 const node=await page.evaluate(()=>({...window.__colossus.state.nodes[0]}));
 await updateFixture(node=>{const s=window.__colossus.state;s.x=node.x+30;s.z=node.z;s.target=null;s.moving=false;},node);
 await page.locator('[data-view="city"]').click();await page.locator('#destinations-toggle').click();await page.locator('#destinations button').first().click();
 await page.waitForFunction(id=>window.__colossus.state.gathering===id,node.id,{timeout:6000});await page.waitForTimeout(400);
 assert.ok(await page.evaluate(node=>window.__colossus.state.nodes.find(n=>n.id===node.id).amount<node.amount,node));
 assert.equal(await page.evaluate(async()=>{const {protectedResource}=await import('/src/terrain.js');const {state,scene}=window.__colossus;return state.worldDamage.expedition.some(id=>{const r=scene.landscape.crushables.find(r=>r.id===id);return r&&protectedResource(r.x,r.z);});}),false);
 await capture('protected-grove-gathering');report.checks.push('Resource destinations still gather while their protected scenery survives ground-city movement.');
}
async function engageFixture(){
 const rival=await page.evaluate(()=>({...window.__colossus.state.enemies[0]}));
 await updateFixture(r=>{const s=window.__colossus.state;s.x=r.x;s.z=r.z-32;s.target=null;s.moving=false;s.paused=false;},rival);
 const map=await page.locator('#minimap').boundingBox();await page.mouse.click(map.x+(rival.x+180)/360*map.width,map.y+(rival.z+180)/360*map.height);
 await page.locator(`[data-engage="${rival.id}"]`).click();
 await updateFixture(()=>{const s=window.__colossus.state,b=s.battle;b.player={x:0,z:0,angle:0};b.enemy={x:0,z:40,angle:Math.PI};b.enemyHp=b.enemyMaxHp=1000;b.autoFire=false;b.command='hold';b.reload=0;b.enemyReload=999;s.paused=false;});
}
async function shotTrial(label,slot){
 await engageFixture();await page.waitForFunction(()=>!document.querySelector('#fire').disabled);
 const statusText=await page.locator('#battery-status').innerText();const hp=await page.evaluate(()=>window.__colossus.state.battle.enemyHp);
 await page.locator('#fire').click();
 await page.waitForFunction(()=>window.__colossus.state.battle.events.some(e=>e.source==='player'&&e.kind==='shot'));
 await page.waitForFunction(()=>window.__colossus.scene.fx.some(fx=>!fx.flash&&fx.start&&fx.end),{},{timeout:1500});
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{state,scene}=window.__colossus;scene.scene.updateMatrixWorld(true);
  return {remainingHp:state.battle.enemyHp,event:state.battle.events.filter(e=>e.source==='player').at(-1),traces:scene.fx.filter(fx=>!fx.flash&&fx.start&&fx.end).map(fx=>({start:fx.start?.toArray?.(),end:fx.end?.toArray?.(),slot:fx.slot,source:fx.source})),muzzles:scene.city.batteries.flatMap(b=>(b.muzzles||b.weapon?.muzzles||[]).map(m=>({slot:b.slot,position:m.getWorldPosition(new T.Vector3()).toArray()})))};
 });
 result.label=label;result.damage=hp-result.remainingHp;result.statusText=statusText;report.weapons.push(result);await capture(`combat-${label}`);
 if(label==='front'){
  assert.ok(result.event.mounts.includes(slot),'Facing cannon contributes to the shot.');
  const muzzles=result.muzzles.filter(m=>m.slot===slot);assert.ok(muzzles.length>0,'Cannon has authored muzzle markers.');
  assert.ok(result.traces.some(trace=>trace.slot===slot&&trace.start&&muzzles.some(m=>Math.hypot(...m.position.map((x,i)=>x-trace.start[i]))<.45)),'A cannon projectile starts at an authored muzzle.');
 }else assert.equal(result.event.mounts.includes(slot),false,'Backward cannon does not contribute.');
 await page.locator('#withdraw').click();await settle();return result;
}

try{
 await open('kaiju');await page.waitForFunction(()=>!!document.querySelector('#expand-ring'));
 assert.equal(await page.evaluate(()=>window.__colossus.state.rings),1);await capture('kaiju-ring-before');
 await page.locator('[data-building="cannon"]').click();assert.equal(await page.locator('[data-slot="4"]').isDisabled(),true,'Outer plot is locked before expansion.');await page.keyboard.press('Escape');
 const costBefore=await page.evaluate(()=>({...window.__colossus.state.resources}));await page.locator('#expand-ring').click();await page.locator('#pause').click();
 const expanding=await page.evaluate(()=>({rings:window.__colossus.state.rings,construction:window.__colossus.state.ringConstruction,resources:{...window.__colossus.state.resources}}));
 assert.equal(expanding.rings,1);assert.equal(expanding.construction.target,2);assert.ok(expanding.construction.remaining>0&&expanding.construction.remaining<=12);
 assert.equal(costBefore.wood-expanding.resources.wood,90);assert.equal(costBefore.iron-expanding.resources.iron,65);
 await page.locator('[data-building="cannon"]').click();assert.equal(await page.locator('[data-slot="4"]').isDisabled(),true);await capture('kaiju-ring-building');await page.keyboard.press('Escape');
 await page.locator('#pause').click();await page.evaluate(()=>window.__colossus.advance(13));await settle();assert.equal(await page.evaluate(()=>window.__colossus.state.rings),2);assert.equal(await page.evaluate(()=>window.__colossus.state.ringConstruction),null);
 await page.locator('[data-building="cannon"]').click();assert.equal(await page.locator('[data-slot="4"]').isEnabled(),true);await page.keyboard.press('Escape');await capture('kaiju-ring-after');
 report.checks.push('Outer ring costs 90 wood / 65 iron, stays locked while building, and unlocks only after construction completes.');
 console.log('Verified ring construction and plot gates.');
 const kaiju=await inspectFaction('kaiju');await streets('kaiju');await driveOverTree('kaiju');await gatherProtectedResource();
 console.log('Verified kaiju people, terrain damage persistence, and protected gathering.');
 const cannonSlot=await page.evaluate(()=>window.__colossus.scene.city.slotPositions.map((p,i)=>({...p,i})).filter(p=>p.ring===2).sort((a,b)=>b.z-a.z)[0].i);
 await page.locator('[data-building="cannon"]').click();await page.locator(`[data-slot="${cannonSlot}"]`).click();await page.evaluate(()=>window.__colossus.advance(10));await settle();
 await setFacing(Math.PI);await capture('battery-facing-back');const back=await shotTrial('back',cannonSlot);
 await selectSlot(cannonSlot);await setFacing(0);await capture('battery-facing-front');const front=await shotTrial('front',cannonSlot);
 assert.equal(front.damage-back.damage,9,'The same level 1 cannon adds damage only when facing the target.');report.checks.push('Real facing controls change actual ranged damage, and cannon projectiles originate at visible muzzle markers.');
 await open('kaiju',false);
 await page.evaluate(async()=>{const {createGame}=await import('/src/simulation.js');const legacy=createGame('kaiju');delete legacy.rings;delete legacy.ringConstruction;delete legacy.worldDamage;legacy.buildings[4]={type:'housing',level:2,remaining:0};localStorage.setItem('colossus-wake-save-v1',JSON.stringify(legacy));});
 await page.reload();await page.waitForFunction(()=>window.__colossus?.scene?.city?.layout==='circular');await page.locator('#continue').click();await settle();
 assert.equal(await page.evaluate(()=>window.__colossus.state.rings),2);assert.equal(await page.evaluate(()=>window.__colossus.state.buildings[4].level),2);assert.equal(await page.evaluate(()=>window.__colossus.state.buildings[7].type),'keep');await capture('legacy-outer-plot-restored');report.checks.push('Legacy saves with occupied outer plots migrate to the expanded ring without moving slot IDs.');
 await page.setViewportSize({width:390,height:844});await settle();await capture('mobile-kaiju-ring');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Kaiju four-view mobile layout has no horizontal overflow.');
 for(const faction of ['crawler','airship']){await open(faction);await inspectFaction(faction);await capture(`city-size-${faction}`);await streets(faction);await driveOverTree(faction);console.log(`Verified ${faction} people, sizing and terrain interaction.`);}
 const airship=report.factions.find(f=>f.faction==='airship');assert.ok(Math.max(...kaiju.size)<Math.max(...airship.size)*1.35,'Kaiju is comparable in world size to the other carriers.');
 await page.setViewportSize({width:390,height:844});await settle();await capture('mobile-living-world');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#buildings').isVisible(),true);
 report.checks.push('All factions have distinct animated wardrobes at consistent human scale; ground carriers crush scenery and leave tracks, while airships do neither.');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);report.checks.push('No browser errors, remote requests, lost WebGL contexts, or 390px horizontal overflow.');
 await fs.unlink(path.join(output,'failure.png')).catch(()=>{});
}catch(error){report.failure=error.message;process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}
finally{await fs.writeFile(path.join(output,'living-world-results.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({output,screenshots:report.screenshots.length,checks:report.checks,errors:report.errors,remote:report.remote,failure:report.failure||null},null,2));
