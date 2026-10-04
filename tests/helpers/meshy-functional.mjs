// Functional scenarios for the existing Meshy harness. No renderer creation,
// simulation advance, position mutation, shader compilation or timing samples.
import assert from 'node:assert/strict';

export async function runMeshyFunctional({page,visit,cdp,tap,snapshot,nativeCamera,navigate,captureReady,until,resourceDestination,record}){
  const result={method:'Native controls in a fresh isolated session; separate from route timing and handoff captures.',steps:[],limitations:['Advancing wind uniforms and matching shadow bindings prove the rendering path, not perceptible motion or attractive shadows; the independent visual review remains required.','Texture allocation bytes are RGBA8 estimates, not a measured driver allocation. CPU buffer bytes describe visible pilot storage, excluding loader master copies and other world resources.']};
  visit.functional=result;
  const frames=count=>page.evaluate(count=>new Promise(resolve=>{let n=0;const next=()=>++n>=count?resolve():requestAnimationFrame(next);requestAnimationFrame(next);}),count);
  const note=async(label,data)=>{result.steps.push({label,...data});await record();};
  const inspect=()=>page.evaluate(async()=>{
    const T=await import('/vendor/three.module.js'),pilot=await import('/src/meshy-pilot.js'),g=window.__colossus.scene,renderer=g.renderer,status=pilot.meshyPilotStatus();
    const stats=g.landscape.stats.meshyPilot,damage=new Set(window.__colossus.state.worldDamage.expedition),textures=new Set(),materials=new Set(),buffers=new Set();
    const check=(ok,message)=>{if(!ok)throw Error(message);},meshes=[];
    g.landscape.group.traverse(mesh=>{if(mesh.userData.meshyPilot)meshes.push(mesh);});
    check(status.state==='ready'&&status.assets.length===3,'Exactly three prepared masters required');
    check(meshes.length===3&&stats.records.length===28&&stats.instances===54,'Pilot batch/record/instance footprint changed');
    const originalRock=g.landscape.group.getObjectByName('Valley boulders and river pebbles');
    const result=[];
    for(const mesh of meshes){
      const kind=mesh.userData.meshyPilot,geometry=mesh.geometry,owned=stats.records.filter(record=>record.kind===kind),root=geometry.attributes.windRoot;
      check(mesh.count===(kind==='rock'?48:3),kind+' instance footprint changed');
      materials.add(mesh.material);
      for(const material of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial].filter(Boolean))for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
      for(const attribute of [...Object.values(geometry.attributes),geometry.index,mesh.instanceMatrix,mesh.instanceColor].filter(Boolean)){
        buffers.add(attribute.array.buffer);for(const value of attribute.array)check(Number.isFinite(value),'Non-finite pilot buffer');
      }
      check(mesh.boundingSphere&&Number.isFinite(mesh.boundingSphere.radius)&&mesh.boundingSphere.radius>0,'Missing honest pilot bounds');
      let slot=0;const records=[];
      for(const owner of owned){
        const anchor=g.landscape.crushables.find(record=>record.id===owner.id);check(anchor,'Pilot lost original logical root');
        let hidden=0;
        for(let i=0;i<owner.count;i++,slot++){
          const matrix=new T.Matrix4();mesh.getMatrixAt(slot,matrix);const isHidden=matrix.elements[13]===-5000;
          check(isHidden===damage.has(owner.id),'Imported saved-destruction mismatch: '+owner.id);hidden+=Number(isHidden);
          if(root){check(root.getX(slot)===Math.fround(anchor.x)&&root.getZ(slot)===Math.fround(anchor.z),'Imported wind root moved');check(root.getW(slot)>0,'Invalid wind height');}
          if(!isHidden){const sphere=geometry.boundingSphere.clone().applyMatrix4(matrix),pad=root?.81:0;
            check(mesh.boundingSphere.center.distanceTo(sphere.center)+sphere.radius+pad<=mesh.boundingSphere.radius+.0001,'Pilot frustum bounds omit geometry/wind');}
        }
        records.push({id:owner.id,kind,count:owner.count,hidden,root:{x:anchor.x,z:anchor.z}});
      }
      check(slot===mesh.count,'Unowned pilot display slot');
      if(kind==='rock')for(const bound of ['min','max'])for(const axis of ['x','y','z'])check(Math.abs(geometry.boundingBox[bound][axis]-originalRock.geometry.boundingBox[bound][axis])<.00001,'Rock normalization changed original local physical bounds');
      let wind=null;
      if(root){
        const passes=[mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial];check(passes.every(Boolean),'Missing imported shadow deformation pass');
        for(const pass of passes.slice(1))for(const key of ['map','alphaTest','side'])check(pass[key]===mesh.material[key],'Visible/shadow silhouette mismatch');
        const uniforms=passes.map(material=>renderer.properties.has(material)?renderer.properties.get(material).uniforms?.uVegetationTime:null);
        check(uniforms[0]&&Number.isFinite(uniforms[0].value),'Visible imported wind was not prepared');
        for(const uniform of uniforms.filter(Boolean))check(uniform===uniforms[0],'Active visible/shadow wind clocks differ');
        wind={time:uniforms[0].value,depthPrepared:!!uniforms[1],distancePrepared:!!uniforms[2],castShadow:mesh.castShadow,shadowRenderingEnabled:renderer.shadowMap.enabled};
        check(mesh.castShadow===renderer.shadowMap.enabled,'Imported tree shadow quality does not match this profile');
      }
      result.push({kind,name:mesh.name,instances:mesh.count,triangles:geometry.index.count/3,geometry:geometry.uuid,material:mesh.material.uuid,frustumCulled:mesh.frustumCulled,wind,records});
    }
    check(textures.size===6&&materials.size===3,'Pilot duplicated or lost immutable materials/textures');
    const maps=[...textures].map(texture=>{const image=texture.image;check(image.width===1024&&image.height===1024,'Pilot texture dimensions changed');let pixels=0,w=image.width,h=image.height;do{pixels+=w*h;if(!texture.generateMipmaps||w===1&&h===1)break;w=Math.max(1,Math.floor(w/2));h=Math.max(1,Math.floor(h/2));}while(true);return{uuid:texture.uuid,width:image.width,height:image.height,mipmaps:texture.generateMipmaps,rgba8AllocationEstimate:pixels*4};});
    return{status,area:stats.area,records:stats.records,meshes:result,textureCount:textures.size,materialCount:materials.size,maps,visibleGeometryAndInstanceBytes:[...buffers].reduce((sum,buffer)=>sum+buffer.byteLength,0),gpuTextureRGBA8Estimate:maps.reduce((sum,map)=>sum+map.rgba8AllocationEstimate,0),rendererMemory:{...renderer.info.memory},shadowRenderingEnabled:renderer.shadowMap.enabled,damage:[...damage]};
  });
  await captureReady();const initial=await snapshot(),camera={yaw:initial.environment.camera.yaw,pitch:initial.environment.camera.pitch,zoom:initial.environment.camera.zoom};
  const before=await inspect();await frames(60);const after=await inspect();
  for(const tree of after.meshes.filter(mesh=>mesh.wind)){const prior=before.meshes.find(mesh=>mesh.kind===tree.kind);assert.ok(tree.wind.time>prior.wind.time,'Production wind time did not advance');}
  await note('imported-footprint-wind-shadow-bounds',{before,after,visualPerceptibility:'Requires independent motion review; not inferred from uniform changes.'});
  const orbit=[];
  for(let quarter=1;quarter<=4;quarter++){
    await nativeCamera({...camera,yaw:camera.yaw+Math.PI*.5*quarter},visit,{allowPinch:true});await frames(60);
    const view=await snapshot(),c=view.environment.camera,actualYaw=Math.atan2(c.position[0]-c.aim[0],c.position[2]-c.aim[2]);
    assert.ok(Math.abs(Math.atan2(Math.sin(actualYaw-c.yaw),Math.cos(actualYaw-c.yaw)))<.025,'Rendered camera did not complete its quarter orbit');
    orbit.push({quarter,input:visit.cameraInput,observed:view,actualYaw});
  }
  assert.ok(orbit.reduce((sum,row)=>sum+row.input.strokes.filter(stroke=>!stroke.pinch).length,0)>=12,'Full orbit requires separate real drag strokes');
  assert.ok(Math.abs(orbit.at(-1).observed.environment.camera.yaw-camera.yaw-Math.PI*2)<.012);
  await note('full-360-native-orbit',{orbit});
  const ranges=[];
  for(const [label,pitch,zoom]of [['low-near',.27,48],['high-far',1.08,135],['normal',camera.pitch,camera.zoom]]){
    await nativeCamera({yaw:camera.yaw+Math.PI*2,pitch,zoom},visit,{allowPinch:true});await frames(60);ranges.push({label,input:visit.cameraInput,observed:await snapshot()});
  }
  await note('native-pitch-near-normal-far',{ranges});
  const views=[];
  for(const view of ['world','people','city']){await tap(`[data-view="${view}"]`);await frames(36);const observed=await snapshot();assert.equal(observed.environment.camera.view,view);assert.equal(observed.hud.visible,true);assert.equal(observed.hud.horizontalOverflow,false);views.push(observed);}
  await nativeCamera(camera,visit,{allowPinch:true});await frames(60);await note('City-World-Streets-City',{views});
  const ground=await page.evaluate(async()=>{
    const T=await import('/vendor/three.module.js'),g=window.__colossus.scene,s=window.__colossus.state,c=g.renderer.domElement,r=c.getBoundingClientRect(),ray=new T.Raycaster();
    const list=[...g.city.slots.filter(h=>!h.userData.locked&&(g.city.inspectedFloor===undefined||g.city.slotPositions[h.userData.slot].tier<=g.city.inspectedFloor)),...g.enemyCities.filter(city=>city.root.visible).map(city=>city.enemyProxy),...g.pickables,g.ground];
    for(const fy of [.58,.68,.48,.78,.38])for(const fx of [.25,.75,.15,.85,.35,.65]){
      const x=r.left+r.width*fx,y=r.top+r.height*fy;if(document.elementFromPoint(x,y)!==c)continue;
      ray.setFromCamera(new T.Vector2(fx*2-1,-fy*2+1),g.camera);const hit=ray.intersectObjects(list,true)[0];
      if(!hit?.object.userData.ground)continue;const distance=Math.hypot(hit.point.x-s.x,hit.point.z-s.z);
      if(distance>16&&distance<55&&hit.point.z>s.z+8&&Math.abs(hit.point.x)<170&&Math.abs(hit.point.z)<170)return{x,y,expected:{x:hit.point.x,z:hit.point.z},origin:{x:s.x,z:s.z}};
    }
    throw Error('No visible unoccluded ground point found for the native pick scenario');
  });
  if(visit.profile.mobile)await page.touchscreen.tap(ground.x,ground.y);else await page.mouse.click(ground.x,ground.y);
  const selected=await page.evaluate(()=>window.__colossus.state.target);assert.ok(selected,'Native ground pick did not set a target');
  assert.ok(Math.hypot(selected.x-ground.expected.x,selected.z-ground.expected.z)<.6,'Ground pick hit an unexpected location');
  await until(()=>window.__colossus.state.target===null,undefined,45000);const arrived=await snapshot();assert.ok(Math.hypot(arrived.state.x-selected.x,arrived.state.z-selected.z)<.3);
  await note('native-ground-pick-and-arrival',{ground,selected,arrived});
  const pine=before.meshes.find(mesh=>mesh.kind==='pine').records.find(record=>record.id==='tree:477');assert.ok(pine,'The chosen actual pilot pine root is unavailable');
  const route=await navigate([pine.root.x,pine.root.z],visit);await frames(6);const crushed=await inspect();assert.ok(crushed.damage.includes(pine.id),'Native traversal did not crush the selected imported pine');
  await note('native-imported-pine-crush',{pine,route,crushed});
  if(!(await snapshot()).state.paused)await tap('#pause');
  if(visit.profile.mobile){await tap('#mobile-menu');await tap('[data-dialog-action="save"]');await tap('[data-dialog-action="close"]');}else await tap('#save');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('colossus-wake-save-v1')));assert.ok(saved.worldDamage.expedition.includes(pine.id));
  await page.reload({waitUntil:'domcontentloaded'});await until(()=>!!window.__colossus);await captureReady();await tap('#continue');await frames(6);
  const resumed=await inspect();assert.deepEqual(resumed.damage,saved.worldDamage.expedition);await note('native-save-reload-Continue-imported-damage',{savedDamage:saved.worldDamage,after:resumed});
  result.resource=await resourceDestination('ruins',visit);await note('native-resource-destination',{resource:result.resource});
  result.final=await inspect();result.finalSnapshot=await snapshot();result.passed=true;await record();return result;
}
