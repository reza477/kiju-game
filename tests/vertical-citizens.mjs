import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=path.resolve(process.env.OUTPUT_DIR||'artifacts/vertical-builder-01/citizens');
await fs.mkdir(out,{recursive:true});
const report={errors:[],remote:[],checks:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1080}});
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/vertical-citizens-fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#24343e"><script>window.fixture=true</script></body></html>'});
    if(url.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(url.protocol))return route.continue();
    report.remote.push(url.href);return route.abort();
  });
  await page.goto('http://127.0.0.1:4178/vertical-citizens-fixture');
  Object.assign(report,await page.evaluate(async()=>{
    const T=await import('/vendor/three.module.js');
    const {createVerticalDistrict}=await import('/src/architecture.js');
    const {createCitizens,animateCitizens}=await import('/src/citizens.js');
    const {CityLighting}=await import('/src/city-lighting.js');
    const checks=[],measurements=[];
    const expect=(condition,message)=>{if(!condition)throw Error(message);checks.push(message);};
    const scene=new T.Scene();scene.background=new T.Color(0x24343e);
    scene.add(new T.HemisphereLight(0xccdef5,0x73795c,2.0));
    const sun=new T.DirectionalLight(0xffebcc,3.0);sun.position.set(-15,55,20);scene.add(sun);
    const root=new T.Group();root.scale.setScalar(.55);scene.add(root);
    const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1440,1080);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.appendChild(renderer.domElement);
    const camera=new T.PerspectiveCamera(43,1440/1080,.1,500);
    const types=['keep','housing','farm','foundry','sawmill','armor'];
    for(const type of types)for(const level of[1,2,3]){
      const height=3.8+.8*(level-1),district=createVerticalDistrict(type,level,height),bounds=new T.Box3().setFromObject(district);
      expect(bounds.max.y<=height-.18,`${type} ${level} stays under next storey`);
      expect(district.scale.equals(new T.Vector3(1,1,1)),`${type} ${level} has natural scale`);
      expect(bounds.min.x>=-2&&bounds.max.x<=2&&bounds.min.z>=-2&&bounds.max.z<=2.4,`${type} ${level} fits central room`);
      measurements.push({type,level,height,top:bounds.max.y});
    }
    const order=[7,11,13,0,1,2,3,4,5,6,8,9,10,12,14,15,16,17,18,19];
    function layoutFor(count,upgrade=false,pending=false){
      let y=0;const floors=order.slice(0,count).map((slot,tier)=>{
        const level=upgrade&&tier===0?3:1,height=3.8+.8*(level-1);
        const floor={slot,tier,level,type:types[tier%types.length],height,y,underConstruction:pending&&tier===count-1,path:[{x:-3,z:-15.7},{x:3,z:-15.7},{x:3,z:-8.3},{x:-3,z:-8.3}],slots:[slot],surfaceOffset:.109};y+=height;return floor;
      });
      return {signature:`fixture-${count}-${upgrade}-${pending}`,floors,height:y,towerTop:34+y,positions:Array.from({length:20},(_,slot)=>{const f=floors.find(f=>f.slot===slot);return{x:0,z:-12,y:f?.y??y,tier:f?.tier??count,rotation:Math.PI};})};
    }
    const people=createCitizens(root,34,'kaiju',{scale:.55,layout:'tower',rings:2});
    const snapshots=()=>Object.fromEntries(Object.entries(people.buckets).map(([name,b])=>[name,Array.from(b.mesh.instanceMatrix.array.slice(0,b.count*16))]));
    function animate(layout,time,extra={}){animateCitizens(people,time,false,48,{layout:'tower',rings:2,slotPositions:layout.positions,verticalLayout:layout,...extra});}
    for(const count of[3,4,20]){
      const layout=layoutFor(count);animate(layout,0);animate(layout,1);
      expect(people.routes.every(r=>layout.floors.some(f=>f.tier===r.tier&&Math.abs(f.y-r.y)<1e-8)),`${count} storeys have exact supported routes`);
      expect(people.routes.every(r=>r.x>=-3&&r.x<=3&&r.z>=-15.7&&r.z<=-8.3),`${count} storeys stay inside compact paths`);
      expect(people.routes.length===48&&Object.keys(people.buckets).length===19,`${count} storeys keep 48 residents in 19 batches`);
      const a=snapshots();animate(layout,1);expect(JSON.stringify(a)===JSON.stringify(snapshots()),`${count} storeys pause without pose drift`);
      const pending=layoutFor(count,false,true);animate(pending,2);
      expect(people.routes.every(r=>r.tier!==count-1),`${count} storeys exclude residents from construction floor`);
      const raised=layoutFor(count,true);animate(raised,3);
      expect(people.routes.every(r=>Math.abs(r.y-raised.floors[r.tier].y)<1e-8),`${count} storeys refresh all heights after lower upgrade`);
      animate(raised,3,{visibleFloor:1});
      const visibleCount=people.buckets.torso.count;
      expect(visibleCount===people.routes.filter(r=>r.tier<=1).length,`${count} storeys cutaway hides residents above selected floor`);
    }
    const pending=layoutFor(3);pending.floors.forEach(f=>f.underConstruction=true);pending.signature+='-all-pending';animate(pending,4);
    expect(people.populationCount===0&&Object.values(people.buckets).every(b=>b.count===0),'all pending floors render no unsupported residents');
    const layout=layoutFor(4,true),stations=[];
    for(const f of layout.floors){
      const district=createVerticalDistrict(f.type,f.level,f.height);district.position.set(0,34+f.y+.18,-12);district.rotation.y=Math.PI;root.add(district);
      if(district.userData.activityStation)stations.push({...district.userData.activityStation,slot:f.slot,tier:f.tier});
      const slab=new T.Mesh(new T.BoxGeometry(6.8,.16,8.1),new T.MeshStandardMaterial({color:0x686b63,roughness:.9}));slab.position.set(0,34+f.y+.02,-12);root.add(slab);
    }
    animate(layout,5,{activityStations:stations,visibleFloor:2});
    expect(people.routes.filter(r=>r.route==='building-workplace').every(r=>r.tier===2),'selected storey assigns work only to its completed station');
    let maxHand=0;
    for(let tick=0;tick<48;tick++){
      animate(layout,5+tick/24,{activityStations:stations});
      for(const contact of people.stationContacts.filter(c=>c.side===-1)){
        const station=stations.find(s=>s.slot===contact.slot),target=station.left.getWorldPosition(new T.Vector3());
        maxHand=Math.max(maxHand,new T.Vector3().fromArray(contact.hand).distanceTo(target));
      }
    }
    expect(maxHand<1e-6,'natural-size workstation hand contacts remain attached');
    const city={rig:root,deckY:34,scale:.55,faction:'kaiju',layout:'tower',rings:2,slotPositions:layout.positions,verticalLayout:layout};
    const lights=new CityLighting(scene);lights.assign(lights.slots[0],city);
    const before=lights.slots[0].lamps[1].group.position.y;
    const raised=layoutFor(4,true);raised.floors[0].height+=.8;raised.floors.slice(1).forEach(f=>f.y+=.8);raised.signature+='-extra-upgrade';city.verticalLayout=raised;lights.assign(lights.slots[0],city);
    expect(Math.abs(lights.slots[0].lamps[1].group.position.y-before-.8)<1e-8,'lamp support moves with lower-storey upgrade');
    expect(Math.abs(lights.slots[0].lamps[1].group.position.x)===3,'promenade lamp remains on compact floor path');
    city.verticalLayout=layout;lights.assign(lights.slots[0],city);lights.update(city,null,'day');
    camera.position.set(15,38,-25);camera.lookAt(0,25,-6.6);renderer.render(scene,camera);
    window.verticalFixture={scene,root,renderer,camera,people,animate,layout,stations};
    return {checks,measurements,maxHand};
  }));
  await page.waitForFunction(async()=>{const {surfaceDiagnostics}=await import('/src/surface-library.js');return surfaceDiagnostics().pending===0;});
  report.surfaces=await page.evaluate(async()=>{const {surfaceDiagnostics}=await import('/src/surface-library.js');const f=window.verticalFixture;f.renderer.render(f.scene,f.camera);return surfaceDiagnostics();});
  await page.screenshot({path:path.join(out,'four-supported-storeys.png')});
  await fs.writeFile(path.join(out,'vertical-citizens-report.json'),JSON.stringify(report,null,2));
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.surfaces.failures,[]);
  console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,remote:report.remote,maxHand:report.maxHand,output:out}));
}finally{await browser.close();}
