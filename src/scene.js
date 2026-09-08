import * as T from '../vendor/three.module.js';
import {distance,FACTIONS,weaponStatus,attackDelay} from './simulation.js';
import {getMaterial,box,beam,batchStatic,disposeGroup,createEnvironment,setWindowLighting} from './materials.js';
import {makeCity,animateCity,slotPosition,setCityRings} from './carriers.js';
import {createDistrict,createVacantPlot} from './architecture.js';
import {createLandscape,createResourceSite} from './landscape.js';
import {Presentation,Atmosphere,createSky,setSkyLighting} from './presentation.js';
import {getLightingPreset} from './lighting.js';
import {CityLighting} from './city-lighting.js';
import {KAIJU_CENTER,kaijuRingRadius,kaijuFloorCount,kaijuWalkFloors,kaijuTowerTop} from './city-layout.js';
import {terrainHeight,terrainNormal} from './terrain.js';
import {createBattery,animateWeapons,weaponMuzzles,arcGeometry} from './armaments.js';
import {facingOf,batteryArc} from './weapon-layout.js';
import {CinematicCamera} from './cinematic-camera.js';
export {makeCity,slotPosition};

const previewBuildings=()=>{
  const plots=Array(20).fill(null);
  for(const [i,type,level] of [[0,'housing',2],[1,'foundry',1],[3,'housing',2],[4,'armor',1],[5,'sawmill',1],[6,'housing',1],[7,'keep',2],[8,'housing',2],[9,'cannon',1],[10,'farm',1],[11,'housing',2],[12,'housing',1],[13,'farm',2],[14,'housing',1],[16,'housing',2],[18,'cannon',1]])plots[i]={type,level,remaining:0};
  return plots;
};

function updateDistricts(city,buildings,rings=2){
  setCityRings(city,rings);
  const signature=JSON.stringify([rings,buildings.map(b=>b?[b.type,b.level,b.remaining>0,b.facing]:null)]);
  if(signature===city.signature)return;city.signature=signature;
  disposeGroup(city.districts);disposeGroup(city.plots);city.districts.clear();city.plots.clear();city.districtStacks=[];city.batteries=[];
  buildings.forEach((b,i)=>{
    const p=city.slotPositions[i],hit=city.slots[i];
    hit.userData.locked=city.faction==='kaiju'&&p.ring>rings;hit.rotation.y=p.rotation??0;
    if(hit.userData.locked)return;
    if(!b){const vacant=createVacantPlot(city.faction,i);vacant.position.set(p.x,p.y+.13,p.z);vacant.rotation.y=p.rotation??0;if(city.layout==='tower'){vacant.userData.noBatch=true;vacant.userData.towerTier=p.tier;batchStatic(vacant);}city.plots.add(vacant);hit.scale.y=.24;hit.position.y=p.y+.12;return;}
    const district=b.type==='cannon'?createBattery(city.faction,b.level,facingOf(city.faction,i,b),i):createDistrict(b.type,b.level,city.faction);
    if(b.type==='cannon')city.batteries.push(district.weapon);else district.rotation.y=p.rotation??0;
    const bounds=new T.Box3().setFromObject(district);let h=Math.max(1,bounds.max.y);
    if(city.layout==='tower'&&p.tier<kaijuFloorCount(rings)-1&&h>7.1){district.scale.y*=7.1/h;h=7.1;}
    district.position.set(p.x,p.y+.18,p.z);hit.scale.y=h+.18;hit.position.y=p.y+(h+.18)/2;
    district.traverse(o=>{if(o.userData.smokestack)city.districtStacks.push(o);});
    if(b.remaining>0){
      district.scale.y*=.5;
      const wood=getMaterial('wood',0xb79765),metal=getMaterial('metal',0x727d7b);
      for(const x of [-1.35,1.35])for(const z of [-1.58,1.58])beam(district,[x,0,z],[x,h*2,z],.045,metal);
      for(let y=1.5;y<h*2;y+=1.6){box(district,2.9,.08,.3,wood,0,y,1.53);box(district,.3,.08,3.25,wood,1.35,y,0);beam(district,[-1.35,y,1.58],[1.35,y+1.6,1.58],.027,metal);}
    }
    if(city.layout==='tower'){district.userData.noBatch=true;district.userData.towerTier=p.tier;batchStatic(district);}
    city.districts.add(district);
  });
  batchStatic(city.districts);batchStatic(city.plots);
}

function placeCity(city,x,z,angle){
  city.heading=angle;city.root.position.set(x,terrainHeight(x,z),z);
  if(city.faction==='crawler'){
    const sin=Math.sin(angle),cos=Math.cos(angle);let height=0,dx=0,dz=0;
    // Fit the chassis to its tread footprint instead of the terrain at one point.
    const fp=city.footprintScale??{x:1,z:1};
    for(const rawSide of [-9,9])for(const rawAlong of [-9,0,9]){const side=rawSide*fp.x,along=rawAlong*fp.z,h=terrainHeight(x+cos*side+sin*along,z-sin*side+cos*along);height+=h;dx+=side*h;dz+=along*h;}
    dx/=486*fp.x*fp.x;dz/=324*fp.z*fp.z;const up=new T.Vector3(-cos*dx-sin*dz,1,sin*dx-cos*dz).normalize(),forward=new T.Vector3(sin,0,cos);
    city.root.position.y=height/6-.5*up.y;
    const right=new T.Vector3().crossVectors(up,forward).normalize();forward.crossVectors(right,up).normalize();
    city.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
  }else city.root.rotation.set(0,angle,0);
  city.root.updateMatrixWorld(true);
}

function impactAnchor(source,target,start,melee){
  target.root.updateMatrixWorld(true);
  if(melee&&(target.drillTip||source.drillTip)){
    const ray=new T.Raycaster(),aims=[];
    if(target.drillTip){const tip=target.drillTip.getWorldPosition(new T.Vector3()),mount=target.drill.getWorldPosition(new T.Vector3());aims.push(tip.clone().lerp(mount,.09),tip.clone().lerp(mount,.2));}
    else if(target.faction==='kaiju')for(const x of[-3,3])for(const y of[6,10,15])aims.push(target.rig.localToWorld(new T.Vector3(x,y,1)));
    else for(const y of[4,6,8])aims.push(target.rig.localToWorld(new T.Vector3(0,y,0)));
    let nearest=null;
    for(const aim of aims){ray.set(start,aim.clone().sub(start).normalize());const hit=ray.intersectObject(target.root,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}const m=h.object.material;return m&&!Array.isArray(m)&&m.visible&&!(m.transparent&&m.opacity<.2)&&!h.object.userData.enemy&&h.object.userData.slot===undefined;});if(hit&&(!nearest||hit.distance<nearest.distance))nearest=hit;}
    if(nearest)return {object:nearest.object,local:nearest.object.worldToLocal(nearest.point.clone()),point:nearest.point};
  }
  const origin=start.clone(),centre=target.root.getWorldPosition(new T.Vector3()),heading=centre.clone().sub(source.root.position);heading.y=0;heading.normalize();
  const right=new T.Vector3(heading.z,0,-heading.x),width=target.faction==='kaiju'?1.4:6;
  const lateral=T.MathUtils.clamp(start.clone().sub(source.root.position).dot(right),-width,width);
  const heights=target.variant==='drill'&&melee?[5.45,6.5,8.5]:target.faction==='kaiju'?[32,35,28]:melee?[target.deckY+1.5,target.deckY+.65,target.deckY+3,target.deckY-.5,target.deckY-1]:[target.deckY-1,target.deckY-2,target.deckY+.5];
  const ray=new T.Raycaster();let closest=null;
  for(const height of heights){
    const aim=target.root.localToWorld(new T.Vector3(0,height,0));if(melee){aim.addScaledVector(right,lateral);origin.y=aim.y;}
    ray.set(origin,aim.clone().sub(origin).normalize());
    const hit=ray.intersectObject(target.root,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}const m=h.object.material;return m&&!Array.isArray(m)&&m.visible&&!(m.transparent&&m.opacity<.2)&&!h.object.userData.enemy&&h.object.userData.slot===undefined;});
    if(hit&&(!closest||hit.point.distanceToSquared(start)<closest.point.distanceToSquared(start)))closest={object:hit.object,local:hit.object.worldToLocal(hit.point.clone()),point:hit.point};
  }
  return closest;
}

function refreshImpactAnchor(fx){
  // A kiting hull can turn around during wind-up. Reacquire its near surface
  // before contact instead of chasing an anchor that rotated to the far side.
  if(!fx.arrived&&Math.abs(Math.atan2(Math.sin(fx.target.heading-fx.anchorHeading),Math.cos(fx.target.heading-fx.anchorHeading)))>.1){const next=impactAnchor(fx.actor,fx.target,fx.start,fx.kind==='impact');if(next){fx.anchor=next;fx.anchorHeading=fx.target.heading;}}
  fx.end.copy(fx.anchor.object.localToWorld(fx.anchor.local.clone()));
}

export class GameScene {
  constructor(canvas,onSelect){
    this.canvas=canvas;this.onSelect=onSelect;this.scene=new T.Scene();
    this.camera=new T.PerspectiveCamera(42,1,.25,1500);
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.info.autoReset=false;
    this.environmentTarget=createEnvironment(this.renderer);this.scene.environment=this.environmentTarget.texture;this.scene.environmentIntensity=.55;
    this.sky=createSky();this.scene.add(this.sky);
    this.ambient=new T.HemisphereLight(0xd8edff,0x7b8561,1.45);this.scene.add(this.ambient);
    this.sun=new T.DirectionalLight(0xffdfb8,3.4);this.sun.position.set(-65,95,65);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(4096,4096);this.sun.shadow.camera.left=-65;this.sun.shadow.camera.right=65;this.sun.shadow.camera.top=65;this.sun.shadow.camera.bottom=-65;this.sun.shadow.camera.near=.5;this.sun.shadow.camera.far=270;this.sun.shadow.bias=-.00012;this.sun.shadow.normalBias=.025;this.sun.shadow.radius=1.4;
    this.scene.add(this.sun,this.sun.target);
    this.rim=new T.DirectionalLight(0x9eb9cf,.8);this.rim.position.set(70,35,-55);this.scene.add(this.rim,this.rim.target);this.sunOffset=new T.Vector3();
    this.landscape=createLandscape();this.world=this.landscape.group;this.ground=this.landscape.ground;this.scene.add(this.world);
    this.presentation=new Presentation(this.renderer,this.camera);this.atmosphere=new Atmosphere(this.scene);
    this.cityLighting=new CityLighting(this.scene);
    this.impactLights=[new T.PointLight(0xffc58b,0,13,2),new T.PointLight(0xffab73,0,13,2)];
    for(const light of this.impactLights){light.name='Brief surface impact light';light.castShadow=false;this.scene.add(light);}this.impactDirection=new T.Vector3();
    this.pickables=[];this.labels=[];this.enemyCities=[];this.fx=[];this.lastEvent=0;this.preview=false;
    this.view='city';this.yaw=.72;this.pitch=.55;this.zoom=80;this.focus=new T.Vector3();this.ray=new T.Raycaster();this.pointer=new T.Vector2();this.light='day';this.quality='high';this.routeTarget=null;
    this.cinematic=new CinematicCamera(matchMedia('(prefers-reduced-motion: reduce)').matches?'steady':'cinematic');this.cameraBasePosition=new T.Vector3();this.cameraAim=new T.Vector3();this.cameraDesired=new T.Vector3();this.cameraPrevious=new T.Vector3();this.cameraVelocity=new T.Vector3();
    this.createSelection();this.setLighting('day');this.setQuality('high');this.addPointer();
    window.addEventListener('resize',()=>this.resize());
  }

  createSelection(){
    const material=new T.MeshBasicMaterial({color:0xf3d392,side:T.DoubleSide,transparent:true,opacity:.86,depthTest:false});
    this.selection=new T.Mesh(new T.RingGeometry(1.75,1.82,64),material);this.selection.rotation.x=-Math.PI/2;this.selection.renderOrder=5;this.selection.visible=false;this.scene.add(this.selection);
    this.routeLine=new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length:49},()=>new T.Vector3())),new T.LineDashedMaterial({color:0xffe3a8,dashSize:2,gapSize:1,transparent:true,opacity:.9}));this.scene.add(this.routeLine);
    this.destination=new T.Mesh(new T.RingGeometry(2.45,2.65,64),new T.MeshBasicMaterial({color:0xffdf99,side:T.DoubleSide,transparent:true,opacity:.9}));this.destination.rotation.x=-Math.PI/2;this.destination.visible=false;this.scene.add(this.destination);
    this.coverage=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xffd18b,transparent:true,opacity:.46,depthTest:false}));this.coverage.visible=false;this.coverage.renderOrder=4;this.scene.add(this.coverage);this.coverageKey='';
  }

  setGame(s,options={}){
    this.cityLighting.reset();
    for(const light of this.impactLights)light.intensity=0;
    if(this.city){this.city.root.removeFromParent();disposeGroup(this.city.root);}
    for(const city of this.enemyCities){city.root.removeFromParent();disposeGroup(city.root);}
    for(const site of this.labels){site.removeFromParent();disposeGroup(site);}
    for(const fx of this.fx){fx.object.removeFromParent();disposeGroup(fx.object);}this.fx=[];
    this.city=makeCity(s.faction,false,s.rings??1,s.variant);this.scene.add(this.city.root);this.state=s;this.preview=!!options.preview;this.previewDistricts=previewBuildings();
    this.cinematic.reset();this.cameraShot=null;this.towerTier=0;this.cameraPrevious.set(s.x,0,s.z);this.lastFootfall=null;
    updateDistricts(this.city,this.preview?this.previewDistricts:s.buildings,this.preview?2:s.rings??1);
    s.worldDamage??={expedition:[],battle:[]};this.landscape.resetInteractions?.();
    const ghost=new T.Mesh(new T.BoxGeometry(12.6,24.6,11),new T.MeshBasicMaterial({color:0xc7c88d,transparent:true,opacity:.15,wireframe:true}));ghost.position.set(KAIJU_CENTER.x,this.city.deckY+24.6,KAIJU_CENTER.z);ghost.visible=false;this.city.rig.add(ghost);this.city.expansionGhost=ghost;
    this.enemyCities=[];this.labels=[];this.pickables=[];
    for(const n of s.nodes){const site=createResourceSite(n);site.traverse(o=>{if(o.userData.node)this.pickables.push(o);});batchStatic(site);this.scene.add(site);this.labels.push(site);}
    for(const e of s.enemies){
      const city=makeCity(e.faction,true,2,e.variant);const sample=previewBuildings();sample[2]={type:'cannon',level:1,remaining:0};
      updateDistricts(city,sample,2);city.id=e.id;placeCity(city,e.x,e.z,-.8);
      const proxy=new T.Mesh(new T.BoxGeometry(e.faction==='airship'?34:24,e.faction==='kaiju'?82:e.variant==='vertical'?45:34,e.faction==='kaiju'?34:e.variant==='drill'?52:32),new T.MeshBasicMaterial({visible:false}));proxy.position.set(0,e.faction==='kaiju'?40:20,e.faction==='kaiju'?-8:0);proxy.userData.enemy=e.id;proxy.userData.noBatch=true;city.root.add(proxy);city.enemyProxy=proxy;
      this.scene.add(city.root);this.enemyCities.push(city);
    }
    this.lastMode=null;this.lastEvent=0;this.yaw=s.faction==='kaiju'?s.angle+(this.preview?1.1:2.35):.72;this.focus.set(s.x,terrainHeight(s.x,s.z)+this.city.deckY*this.city.scale,s.z);
    this.setLighting(this.light);
  }

  setView(view){
    const prior=this.view,backpack=this.city?.layout==='tower';this.view=view;
    if(prior!==view)this.cinematic.transition(view);
    this.zoom=view==='world'?250:view==='people'?11:backpack?(view==='carrier'?100:this.preview?112:this.city.rings>1?66:52):this.preview?105:this.city.variant==='vertical'?108:this.city.variant==='drill'?98:76;
    const backpackPitch=(view==='carrier'||this.preview)?.24:.28;
    this.pitch=view==='world'?.88:view==='people'?(backpack?.18:.38):backpack?backpackPitch:.6;
    if(backpack&&view==='carrier')this.yaw=this.state.angle+.75;
    else if(backpack&&view==='people')this.yaw=this.state.angle+2.35;
    else if(!backpack&&view==='people')this.yaw=this.state.angle+Math.PI/2;
    else if(backpack&&view==='city'&&prior!==view&&!this.preview)this.yaw=this.state.angle+2.35;
  }

  setTowerFloor(tier){this.towerTier=T.MathUtils.clamp(tier,0,kaijuFloorCount(this.city.rings??1)-1);this.cinematic.manual();this.cameraShot=null;}

  setCameraMode(mode){this.cinematic.setMode(mode);this.cameraShot=null;}

  updateCamera(s,dt,desiredZoom,battle){
    const current=this.city.root.position,delta=this.cameraVelocity.set(current.x-this.cameraPrevious.x,0,current.z-this.cameraPrevious.z);
    this.cameraPrevious.set(current.x,0,current.z);const travelling=delta.lengthSq()>.00001&&delta.lengthSq()<64;
    const cycle=Math.floor((this.city.gaitDistance??0)/8);
    if(s.faction==='kaiju'&&travelling&&this.lastFootfall!==null&&cycle!==this.lastFootfall&&!s.paused)this.cinematic.impulse(.16,cycle%2?1:-1);this.lastFootfall=cycle;
    const shot=this.cameraShot,shotAge=shot?s.time-shot.born:-1,impactDelay=shot?attackDelay(shot.kind):.55;
    if(shot&&(!battle||shotAge>impactDelay+1.05))this.cameraShot=null;
    const effects=this.cinematic.update({dt,time:s.time,paused:s.paused,speed:s.speed,view:this.view,battle,moving:travelling,preview:this.preview,shotAge:this.cameraShot?shotAge:-1,impactDelay});
    const wide=this.camera.aspect<1.2?1.4:1,yaw=this.yaw+effects.yaw,zoom=desiredZoom*wide*(1+effects.dolly),horizontal=Math.cos(this.pitch)*zoom;
    this.cameraDesired.set(this.focus.x+Math.sin(yaw)*horizontal,this.focus.y+Math.sin(this.pitch)*zoom,this.focus.z+Math.cos(yaw)*horizontal);
    this.cameraDesired.y=Math.max(this.cameraDesired.y,terrainHeight(this.cameraDesired.x,this.cameraDesired.z)+(this.view==='people'?1.2:3));
    if(this.snapCamera){this.cameraBasePosition.copy(this.cameraDesired);this.snapCamera=false;}else this.cameraBasePosition.lerp(this.cameraDesired,1-Math.exp(-dt*6));this.camera.position.copy(this.cameraBasePosition);
    const scale=Math.min(1,desiredZoom*.006);this.camera.position.x+=Math.cos(yaw)*effects.right*scale;this.camera.position.z-=Math.sin(yaw)*effects.right*scale;this.camera.position.y+=effects.up*scale;
    this.cameraAim.copy(this.focus);if(travelling&&dt>0&&!battle){delta.multiplyScalar(1/dt).clampLength(0,14);this.cameraAim.addScaledVector(delta,effects.lead);}
    if(this.cameraShot&&effects.focus>0){const separation=distance(s.battle.player,s.battle.enemy),weight=effects.focus*Math.min(1,60/Math.max(1,separation));this.cameraAim.lerp(this.cameraShot.end,weight);}
    const fov=42+effects.fov;if(Math.abs(this.camera.fov-fov)>.0001){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
    const viewOffset=!battle&&!this.preview&&this.view==='city'?.055:0;
    if(this.viewOffset!==viewOffset||this.viewWidth!==this.canvas.clientWidth||this.viewHeight!==this.canvas.clientHeight){this.viewOffset=viewOffset;this.viewWidth=this.canvas.clientWidth;this.viewHeight=this.canvas.clientHeight;if(viewOffset)this.camera.setViewOffset(this.viewWidth,this.viewHeight,0,this.viewHeight*viewOffset,this.viewWidth,this.viewHeight);else this.camera.clearViewOffset();}
    this.camera.lookAt(this.cameraAim);this.sky.position.copy(this.camera.position);
  }

  setQuality(quality){
    if(quality==='retro')quality='performance';this.quality=quality;
    const dpr=quality==='high'?Math.min(devicePixelRatio,1.75):quality==='balanced'?Math.min(devicePixelRatio,1.2):.85;
    this.renderer.setPixelRatio(dpr);this.renderer.shadowMap.enabled=quality!=='performance';
    const shadowSize=quality==='high'?4096:2048;
    if(this.sun.shadow.mapSize.x!==shadowSize){this.sun.shadow.mapSize.set(shadowSize,shadowSize);if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null;}}
    this.presentation.setQuality(quality);this.atmosphere.setQuality(quality);this.landscape.setQuality(quality==='performance'?'retro':quality);this.resize();
  }

  setLighting(mode){
    this.light=mode;
    this.lightingTarget=getLightingPreset(mode);
    if(!this.lightingCurrent){this.lightingCurrent={};this.lightingColors=new Set(['top','bottom','fog','sun','skyLight','groundLight','rim','cloud','cloudShade','mist']);for(const [key,value]of Object.entries(this.lightingTarget))this.lightingCurrent[key]=this.lightingColors.has(key)?new T.Color(value):Array.isArray(value)?[...value]:value;this.scene.fog=new T.FogExp2(this.lightingCurrent.fog,this.lightingCurrent.fogDensity);this.applyLighting(1);}
  }

  applyLighting(blend){
    const p=this.lightingCurrent,target=this.lightingTarget;
    for(const [key,value]of Object.entries(target)){if(this.lightingColors.has(key)){this.lightColour??=new T.Color();p[key].lerp(this.lightColour.set(value),blend);}else if(Array.isArray(value)){for(let i=0;i<value.length;i++)p[key][i]+=(value[i]-p[key][i])*blend;}else p[key]+=(value-p[key])*blend;}
    this.scene.fog.color.copy(p.fog);this.scene.fog.density=p.fogDensity;this.sun.color.copy(p.sun);this.sun.intensity=p.intensity;this.sunOffset.fromArray(p.sunPosition);
    this.ambient.color.copy(p.skyLight);this.ambient.groundColor.copy(p.groundLight);this.ambient.intensity=p.ambient;this.rim.color.copy(p.rim);this.rim.intensity=p.rimIntensity;this.scene.environmentIntensity=p.environment;
    setSkyLighting(this.sky,p);this.presentation.setLighting(p);this.atmosphere.setLighting(p);setWindowLighting(p.windows);
  }

  resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();const size=this.renderer.getDrawingBufferSize(new T.Vector2());this.presentation.resize(size.x,size.y);}

  addPointer(){
    let down=null;this.canvas.tabIndex=0;this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.canvas.addEventListener('pointerdown',e=>{this.canvas.focus({preventScroll:true});down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down.moved=true;if(down.moved){this.cinematic.manual();this.cameraShot=null;this.yaw-=dx*.006;this.pitch=Math.max(.16,Math.min(1.3,this.pitch+dy*.004));}down.lastX=e.clientX;down.lastY=e.clientY;});
    this.canvas.addEventListener('pointerup',e=>{if(down&&!down.moved)this.pick(e.clientX,e.clientY);down=null;});this.canvas.addEventListener('pointercancel',()=>down=null);
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.cinematic.manual();this.cameraShot=null;if(this.state.mode==='battle')this.battleZoomFactor=T.MathUtils.clamp((this.battleZoomFactor??1)+e.deltaY*.0006,.9,2.4);else this.zoom=Math.max(10,Math.min(330,this.zoom+e.deltaY*.06));},{passive:false});
  }

  pick(x,y){
    const r=this.canvas.getBoundingClientRect();this.pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);
    const list=this.state.mode==='battle'?[this.ground]:[...this.city.slots.filter(h=>!h.userData.locked&&(this.city.inspectedFloor===undefined||this.city.slotPositions[h.userData.slot].tier<=this.city.inspectedFloor)),...this.enemyCities.filter(c=>c.root.visible).map(c=>c.enemyProxy),...this.pickables,this.ground];
    for(const hit of this.ray.intersectObjects(list,true)){const d=hit.object.userData;if(d.slot!==undefined){this.onSelect({slot:d.slot});return;}if(d.enemy){this.onSelect({enemy:d.enemy});return;}if(d.node){this.onSelect({node:d.node});return;}if(d.ground){this.onSelect({ground:{x:hit.point.x,z:hit.point.z}});return;}}
  }

  project(x,y,z){const p=new T.Vector3(x,y,z).project(this.camera);return {x:(p.x*.5+.5)*this.canvas.clientWidth,y:(-p.y*.5+.5)*this.canvas.clientHeight,visible:p.z<1};}

  createEffect(event){
    const opponent=this.enemyCities.find(c=>c.id===this.state.battle?.enemyId);
    const battle=this.state.battle,fromEnemy=event.source==='enemy'||!event.source&&(event.kind==='enemyShot'||battle&&distance(event.from,battle.enemy)<distance(event.from,battle.player));
    const source=fromEnemy?opponent:this.city,target=fromEnemy?this.city:opponent;
    if(!source||!target)return;
    const born=this.state.time-Math.max(0,battle.time-event.time);
    if(event.kind!=='impact')this.cinematic.impulse(event.kind==='salvo'?.5:.26,fromEnemy?-1:1);
    for(const shot of weaponMuzzles(source,event.mounts||[],born,event.kind==='impact',event.base!==false)){
      const melee=event.kind==='impact',anchor=impactAnchor(source,target,shot.point,melee);if(!anchor)continue;const end=anchor.point;
      if(melee){source.strikeTarget=end.clone();source.strikeContactTime=attackDelay(event.kind);source.strikeDuration=1.3;}
      const start=shot.point,group=new T.Group(),material=new T.MeshBasicMaterial({color:fromEnemy?0xff8750:0xffd789,transparent:true,opacity:1});
      const object=new T.Mesh(shot.missile?new T.ConeGeometry(.27,1.15,10):new T.SphereGeometry(event.kind==='impact'?.45:.25,10,8),material);if(shot.missile)object.rotation.x=Math.PI/2;group.add(object);
      const trail=new T.Mesh(new T.ConeGeometry(.18,shot.missile?5:3.4,8),new T.MeshBasicMaterial({color:0xffd0a1,transparent:true,opacity:.8}));trail.rotation.x=Math.PI/2;trail.position.z=-1.3;group.add(trail);
      const burst=new T.Group();burst.visible=false;group.add(burst);
      for(let i=0;i<14;i++){const debris=i>8,spark=new T.Mesh(new T.TetrahedronGeometry(debris?.36:.22),new T.MeshBasicMaterial({color:debris?0x847e70:i%2?0xffc179:0xffeec2,transparent:true}));const a=i*2.399963;spark.userData.debris=debris;spark.userData.velocity=new T.Vector3(Math.sin(a)*(3+i%3),Math.cos(a)*(3+i%2),Math.sin(i*1.71)*4);burst.add(spark);}
      if(melee){object.visible=false;trail.visible=false;}
      const effect={object:group,ball:object,trail,burst,start,end:end.clone(),anchor,anchorHeading:target.heading,age:0,born,kind:event.kind,missile:shot.missile,slot:shot.weapon?.slot??null,source:fromEnemy?'enemy':'player',target,actor:source};
      this.scene.add(group);this.fx.push(effect);
      if((effect.slot===null||event.base===false)&&this.cinematic.mode==='cinematic'&&this.cinematic.manualTime===0&&(!fromEnemy||!this.cameraShot||this.state.time-this.cameraShot.born>1.75))this.cameraShot=effect;
      if(event.kind!=='impact'){
        const flash=new T.Mesh(new T.SphereGeometry(.85,10,8),new T.MeshBasicMaterial({color:0xffedb2,transparent:true,opacity:1}));flash.position.copy(start);this.scene.add(flash);
        this.fx.push({object:flash,flash:true,start,age:0,born});
      }
    }
  }

  update(s,dt,selectedSlot){
    const priorFloors=this.city.rings;this.state=s;updateDistricts(this.city,this.preview?this.previewDistricts:s.buildings,this.preview?2:s.rings??1);
    if(!this.preview&&this.city.layout==='tower'&&this.city.rings>priorFloors&&this.view==='city')this.zoom=Math.max(this.zoom,66);
    this.city.expansionGhost.visible=!this.preview&&s.faction==='kaiju'&&!!s.ringConstruction;
    const battle=s.mode==='battle';let focus,desiredZoom=this.zoom;
    const cutaway=this.city.layout==='tower'&&this.view==='people'&&!battle&&!this.preview;
    this.city.inspectedFloor=cutaway?this.towerTier:undefined;
    this.city.rig.traverse(o=>{if(Number.isInteger(o.userData.towerTier))o.visible=!cutaway||o.userData.towerTier<=this.towerTier;});
    const actors=[];
    if(battle){
      const b=s.battle;placeCity(this.city,b.player.x,b.player.z,b.player.angle);
      const enemy=this.enemyCities.find(c=>c.id===b.enemyId);for(const city of this.enemyCities)city.root.visible=city===enemy;
      placeCity(enemy,b.enemy.x,b.enemy.z,b.enemy.angle);
      for(const fx of this.fx)if(fx.kind==='impact'&&fx.anchor){refreshImpactAnchor(fx);fx.actor.strikeTarget?.copy(fx.end);}
      animateCity(enemy,s.time,!b.result);
      animateWeapons(this.city,b.enemy,s.time);animateWeapons(enemy,b.player,s.time);this.city.root.updateMatrixWorld(true);enemy.root.updateMatrixWorld(true);
      for(const status of weaponStatus(s).batteries){const weapon=this.city.batteries.find(w=>w.slot===status.slot);weapon?.indicator.material.color.setHex(status.active?0xc9ff97:status.blocker!==null?0xff6852:0x638793);}
      const cx=(b.player.x+b.enemy.x)/2,cz=(b.player.z+b.enemy.z)/2;
      if(this.lastMode!=='battle')this.battleZoomFactor=1;
      focus=new T.Vector3(cx,(this.city.root.position.y+enemy.root.position.y)/2+14,cz);desiredZoom=Math.max(112,distance(b.player,b.enemy)*1.02+66)*(this.battleZoomFactor??1);
      if(this.lastMode!=='battle'){this.savedYaw=this.yaw;this.savedPitch=this.pitch;this.yaw=Math.atan2(b.enemy.x-b.player.x,b.enemy.z-b.player.z)+2.1;this.pitch=.4;this.lastEvent=0;this.focus.copy(focus);this.snapCamera=true;this.cinematic.transition('battle');}
      for(const event of b.events){if(event.id<=this.lastEvent)continue;this.lastEvent=event.id;if(b.time-event.time<1.1)this.createEffect(event);}
      actors.push({id:'player',faction:s.faction,...b.player,moving:!b.result,scale:this.city.scale,footprintScale:this.city.footprintScale,variant:this.city.variant},{id:enemy.id,faction:enemy.faction,...b.enemy,moving:!b.result,scale:enemy.scale,footprintScale:enemy.footprintScale,variant:enemy.variant});
    }else{
      placeCity(this.city,s.x,s.z,s.angle);
      const tower=this.city.layout==='tower',offset=tower&&this.view!=='world'?(this.view==='carrier'?-2:KAIJU_CENTER.z*this.city.scale):0;
      const towerTop=kaijuTowerTop(this.city.rings??1),towerMiddle=(this.city.deckY+towerTop)*.5;
      const focusY=this.view==='world'?1:this.view==='carrier'||this.preview?(tower?towerTop*this.city.scale*.5:18):tower?towerMiddle*this.city.scale:this.city.deckY+1.2;
      focus=new T.Vector3(s.x+Math.sin(s.angle)*offset,terrainHeight(s.x,s.z)+focusY,s.z+Math.cos(s.angle)*offset);
      if(tower&&!this.preview&&this.view==='city')focus=this.city.rig.localToWorld(new T.Vector3(0,towerMiddle,KAIJU_CENTER.z));
      if(this.view==='people'){
        const floor=kaijuWalkFloors(this.city.rings??1)[Math.min(this.towerTier??0,kaijuFloorCount(this.city.rings??1)-1)];
        focus=this.city.rig.localToWorld(new T.Vector3(tower?-3.3:1.525,this.city.deckY+(tower?floor.y:0)+.7,tower?KAIJU_CENTER.z-4.8:3.55));
      }
      for(const city of this.enemyCities){const enemy=s.enemies.find(e=>e.id===city.id);city.root.visible=!enemy.defeated;placeCity(city,enemy.x,enemy.z,-.8);animateCity(city,s.time,false);animateWeapons(city,null,s.time);}
      animateWeapons(this.city,null,s.time);
      if(this.lastMode==='battle'){this.yaw=this.savedYaw??.72;this.pitch=this.savedPitch??.55;this.focus.copy(focus);this.snapCamera=true;this.cinematic.reset();}
      actors.push({id:'player',faction:s.faction,x:s.x,z:s.z,angle:s.angle,moving:s.moving&&!this.preview,scale:this.city.scale,footprintScale:this.city.footprintScale,variant:this.city.variant});
    }
    this.lastMode=s.mode;this.labels.forEach(g=>g.visible=!battle);
    this.routeLine.visible=!battle&&!!s.target;this.destination.visible=this.routeLine.visible;
    if(s.target&&!battle){const p=this.routeLine.geometry.attributes.position;for(let i=0;i<p.count;i++){const t=i/(p.count-1),x=s.x+(s.target.x-s.x)*t,z=s.z+(s.target.z-s.z)*t;p.setXYZ(i,x,Math.max(.3,terrainHeight(x,z)+.4),z);}p.needsUpdate=true;this.routeLine.geometry.computeBoundingSphere();this.routeLine.computeLineDistances();this.destination.position.set(s.target.x,Math.max(.3,terrainHeight(s.target.x,s.target.z)+.4),s.target.z);}
    this.selection.visible=!battle&&selectedSlot!==null;
    if(this.selection.visible){const p=this.city.slotPositions[selectedSlot],v=new T.Vector3(p.x,this.city.deckY+p.y+.35,p.z);this.city.rig.updateMatrixWorld();this.city.rig.localToWorld(v);this.selection.position.copy(v);this.selection.scale.setScalar(this.city.scale);this.selection.quaternion.copy(this.city.rig.getWorldQuaternion(new T.Quaternion())).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2));}
    if(this.destination.visible){const normal=terrainNormal(s.target.x,s.target.z);this.destination.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(normal.x,normal.y,normal.z)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2));}
    const selectedBattery=selectedSlot!==null&&s.buildings[selectedSlot]?.type==='cannon';this.coverage.visible=!battle&&!!selectedBattery;
    if(this.coverage.visible){const key=s.faction+':'+selectedSlot+':'+s.buildings[selectedSlot].facing;if(this.coverageKey!==key){this.coverage.geometry.dispose();this.coverage.geometry=arcGeometry(batteryArc(s.faction));this.coverageKey=key;}const p=this.city.slotPositions[selectedSlot];this.coverage.position.copy(this.city.rig.localToWorld(new T.Vector3(p.x,this.city.deckY+p.y+1.8,p.z)));this.coverage.rotation.y=s.angle+facingOf(s.faction,selectedSlot,s.buildings[selectedSlot]);this.coverage.scale.setScalar(FACTIONS[s.faction].range/7);}
    for(const fx of this.fx)if(fx.kind==='impact'&&fx.anchor){refreshImpactAnchor(fx);fx.actor.strikeTarget?.copy(fx.end);}
    animateCity(this.city,s.time,battle?!s.battle.result&&s.battle.command!=='hold':s.moving,this.preview?40:s.population);
    this.focus.lerp(focus,1-Math.exp(-dt*5));
    this.applyLighting(1-Math.exp(-dt*4));this.sun.position.copy(this.focus).add(this.sunOffset);this.sun.target.position.copy(this.focus);this.rim.position.set(this.focus.x+70,this.focus.y+35,this.focus.z-55);this.rim.target.position.copy(this.focus);
    this.cityLighting.update(this.city,battle?this.enemyCities.find(c=>c.id===s.battle.enemyId):null,this.lightingCurrent);
    // A tight shadow frustum follows the city; the world view covers a wider area.
    const shadowExtent=this.view==='world'&&!battle?160:battle?120:this.view==='people'?20:62;
    if(this.sun.shadow.camera.right!==shadowExtent){Object.assign(this.sun.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent});this.sun.shadow.camera.updateProjectionMatrix();}
    const worldDt=s.paused||this.preview?0:dt;
    this.landscape.interact?.(actors,worldDt,{mode:battle?'battle':'expedition',damage:s.worldDamage[battle?'battle':'expedition']});
    const environmentDt=s.paused?0:dt*s.speed;this.landscape.update(s.time,environmentDt);
    const stacks=[];for(const city of [this.city,...this.enemyCities])if(city.root.visible){city.root.updateMatrixWorld(true);for(const point of [...city.stacks,...city.districtStacks])stacks.push(point.getWorldPosition(new T.Vector3()));}
    const current=this.city.root.position,mode=battle?'battle':'expedition';
    const movingOnGround=this.dustPrevious?.mode===mode&&distance(this.dustPrevious,current)>.015&&s.faction!=='airship'&&!this.preview;
    this.atmosphere.update(s.time,environmentDt,stacks,movingOnGround?new T.Vector3(current.x,current.y+.4,current.z):null);this.dustPrevious={x:current.x,z:current.z,mode};
    for(const light of this.impactLights)light.intensity=0;
    for(let i=this.fx.length-1;i>=0;i--){
      const fx=this.fx[i];fx.age=Math.max(0,s.time-fx.born);
      if(fx.flash){fx.object.material.opacity=Math.max(0,1-fx.age/.12);if(fx.age>.12){fx.object.removeFromParent();disposeGroup(fx.object);this.fx.splice(i,1);}continue;}
      refreshImpactAnchor(fx);
      const melee=fx.kind==='impact',flight=attackDelay(fx.kind),t=fx.age+1e-8>=flight?1:fx.age/flight;
      if(melee)fx.object.position.copy(fx.end);else{fx.object.position.lerpVectors(fx.start,fx.end,t);fx.object.position.y+=Math.sin(t*Math.PI)*(fx.missile?12:3);fx.object.lookAt(fx.end);}
      if(t>=1){const hitAge=Math.max(0,fx.age-flight);
        // A short, surface-local flash lights the struck armour and nearby
        // masonry. Two fixed lights cover simultaneous opposing attacks.
        if(hitAge<.32){
          const light=this.impactLights[fx.source==='enemy'?1:0],power=(melee?135:fx.missile?190:160)*Math.exp(-hitAge*13)*Math.max(0,1-hitAge/.32);
          if(power>light.intensity){this.impactDirection.copy(fx.start).sub(fx.end).normalize();light.position.copy(fx.end).addScaledVector(this.impactDirection,.75);light.intensity=power;}
        }
        if(!fx.arrived){fx.arrived=true;fx.ball.material.color.set(0xffcd8c).multiplyScalar(3.2);fx.target.hitAt=s.time;this.atmosphere.emit(fx.end,'dust');if(fx.slot===null)this.cinematic.impulse(melee?1:fx.missile?.62:.72,fx.source==='enemy'?-1:1);}fx.trail.visible=false;fx.burst.visible=true;fx.ball.visible=true;for(const spark of fx.burst.children){spark.position.copy(spark.userData.velocity).multiplyScalar(hitAge*2);spark.position.y-=hitAge*hitAge*3;spark.material.opacity=Math.max(0,1-hitAge*(spark.userData.debris?.85:2));spark.rotation.x=hitAge*6;}fx.ball.scale.setScalar(1+hitAge*11);fx.ball.material.opacity=Math.max(0,1-hitAge*3);if(hitAge>1.2){fx.object.removeFromParent();disposeGroup(fx.object);this.fx.splice(i,1);}}
    }
    this.updateCamera(s,dt,desiredZoom,battle);
    this.presentation.render(this.scene);
  }
}
