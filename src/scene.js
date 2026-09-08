import * as T from '../vendor/three.module.js';
import {distance} from './simulation.js';
import {getMaterial,box,beam,batchStatic,disposeGroup,createEnvironment,setWindowLighting} from './materials.js';
import {makeCity,animateCity,slotPosition} from './carriers.js';
import {createDistrict,createVacantPlot} from './architecture.js';
import {createLandscape,createResourceSite} from './landscape.js';
import {Presentation,Atmosphere,createSky} from './presentation.js';
export {makeCity,slotPosition};

const previewBuildings=()=>{
  const plots=Array(20).fill(null);
  for(const [i,type,level] of [[0,'housing',2],[1,'foundry',1],[3,'housing',2],[4,'armor',1],[5,'sawmill',1],[6,'housing',1],[7,'keep',2],[8,'housing',2],[9,'cannon',1],[10,'farm',1],[11,'housing',2],[12,'housing',1],[13,'farm',2],[14,'housing',1],[16,'housing',2],[18,'cannon',1]])plots[i]={type,level,remaining:0};
  return plots;
};

function updateDistricts(city,buildings){
  const signature=JSON.stringify(buildings.map(b=>b?[b.type,b.level,b.remaining>0]:null));
  if(signature===city.signature)return;city.signature=signature;
  disposeGroup(city.districts);disposeGroup(city.plots);city.districts.clear();city.plots.clear();city.districtStacks=[];
  buildings.forEach((b,i)=>{
    const p=slotPosition(i),hit=city.slots[i];
    if(!b){const vacant=createVacantPlot(city.faction,i);vacant.position.set(p.x,.13,p.z);city.plots.add(vacant);hit.scale.y=.24;hit.position.y=.12;return;}
    const district=createDistrict(b.type,b.level,city.faction);district.position.set(p.x,.18,p.z);
    const bounds=new T.Box3().setFromObject(district);const h=Math.max(1,bounds.max.y);
    hit.scale.y=h;hit.position.y=h/2;
    district.traverse(o=>{if(o.userData.smokestack)city.districtStacks.push(o);});
    if(b.remaining>0){
      district.scale.y=.5;
      const wood=getMaterial('wood',0xb79765),metal=getMaterial('metal',0x727d7b);
      for(const x of [-1.35,1.35])for(const z of [-1.58,1.58])beam(district,[x,0,z],[x,h*2,z],.045,metal);
      for(let y=1.5;y<h*2;y+=1.6){box(district,2.9,.08,.3,wood,0,y,1.53);box(district,.3,.08,3.25,wood,1.35,y,0);beam(district,[-1.35,y,1.58],[1.35,y+1.6,1.58],.027,metal);}
    }
    city.districts.add(district);
  });
  batchStatic(city.districts);batchStatic(city.plots);
}

export class GameScene {
  constructor(canvas,onSelect){
    this.canvas=canvas;this.onSelect=onSelect;this.scene=new T.Scene();
    this.camera=new T.PerspectiveCamera(42,1,.25,1500);
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.info.autoReset=false;
    this.environmentTarget=createEnvironment(this.renderer);this.scene.environment=this.environmentTarget.texture;this.scene.environmentIntensity=.55;
    this.sky=createSky();this.scene.add(this.sky);
    this.ambient=new T.HemisphereLight(0xd8edff,0x7b8561,1.45);this.scene.add(this.ambient);
    this.sun=new T.DirectionalLight(0xffdfb8,3.4);this.sun.position.set(-65,95,65);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(4096,4096);this.sun.shadow.camera.left=-65;this.sun.shadow.camera.right=65;this.sun.shadow.camera.top=65;this.sun.shadow.camera.bottom=-65;this.sun.shadow.camera.near=.5;this.sun.shadow.camera.far=270;this.sun.shadow.bias=-.00025;this.sun.shadow.normalBias=.065;this.sun.shadow.radius=3;
    this.scene.add(this.sun,this.sun.target);
    this.rim=new T.DirectionalLight(0x8fb4cf,.45);this.rim.position.set(70,35,-55);this.scene.add(this.rim);
    this.landscape=createLandscape();this.world=this.landscape.group;this.ground=this.landscape.ground;this.scene.add(this.world);
    this.presentation=new Presentation(this.renderer,this.camera);this.atmosphere=new Atmosphere(this.scene);
    this.pickables=[];this.labels=[];this.enemyCities=[];this.fx=[];this.lastEvent=0;this.preview=false;
    this.view='city';this.yaw=.72;this.pitch=.55;this.zoom=80;this.focus=new T.Vector3();this.ray=new T.Raycaster();this.pointer=new T.Vector2();this.light='day';this.quality='high';this.routeTarget=null;
    this.createSelection();this.setLighting('day');this.setQuality('high');this.addPointer();
    window.addEventListener('resize',()=>this.resize());
  }

  createSelection(){
    const material=new T.MeshBasicMaterial({color:0xf3d392,side:T.DoubleSide,transparent:true,opacity:.86,depthTest:false});
    this.selection=new T.Mesh(new T.RingGeometry(1.75,1.82,64),material);this.selection.rotation.x=-Math.PI/2;this.selection.renderOrder=5;this.selection.visible=false;this.scene.add(this.selection);
    this.routeLine=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineDashedMaterial({color:0xffe3a8,dashSize:2,gapSize:1,transparent:true,opacity:.9}));this.scene.add(this.routeLine);
    this.destination=new T.Mesh(new T.RingGeometry(2.45,2.65,64),new T.MeshBasicMaterial({color:0xffdf99,side:T.DoubleSide,transparent:true,opacity:.9}));this.destination.rotation.x=-Math.PI/2;this.destination.visible=false;this.scene.add(this.destination);
  }

  setGame(s,options={}){
    if(this.city){this.city.root.removeFromParent();disposeGroup(this.city.root);}
    for(const city of this.enemyCities){city.root.removeFromParent();disposeGroup(city.root);}
    for(const site of this.labels){site.removeFromParent();disposeGroup(site);}
    for(const fx of this.fx){fx.object.removeFromParent();disposeGroup(fx.object);}this.fx=[];
    this.city=makeCity(s.faction);this.scene.add(this.city.root);this.state=s;this.preview=!!options.preview;this.previewDistricts=previewBuildings();
    updateDistricts(this.city,this.preview?this.previewDistricts:s.buildings);
    this.enemyCities=[];this.labels=[];this.pickables=[];
    for(const n of s.nodes){const site=createResourceSite(n);site.traverse(o=>{if(o.userData.node)this.pickables.push(o);});batchStatic(site);this.scene.add(site);this.labels.push(site);}
    for(const e of s.enemies){
      const city=makeCity(e.faction,true);const sample=previewBuildings();sample[2]={type:'cannon',level:1,remaining:0};
      updateDistricts(city,sample);city.id=e.id;city.root.position.set(e.x,0,e.z);city.root.rotation.y=-.8;
      const proxy=new T.Mesh(new T.BoxGeometry(e.faction==='airship'?34:24,34,26),new T.MeshBasicMaterial({visible:false}));proxy.position.y=15;proxy.userData.enemy=e.id;proxy.userData.noBatch=true;city.root.add(proxy);city.enemyProxy=proxy;
      this.scene.add(city.root);this.enemyCities.push(city);
    }
    this.lastMode=null;this.lastEvent=0;this.focus.set(s.x,this.city.deckY,s.z);
    this.setLighting(this.light);
  }

  setView(view){this.view=view;this.zoom=view==='world'?220:80;this.pitch=view==='world'?.88:.55;}

  setQuality(quality){
    if(quality==='retro')quality='performance';this.quality=quality;
    const dpr=quality==='high'?Math.min(devicePixelRatio,1.75):quality==='balanced'?Math.min(devicePixelRatio,1.2):.85;
    this.renderer.setPixelRatio(dpr);this.renderer.shadowMap.enabled=quality!=='performance';
    const shadowSize=quality==='high'?4096:2048;
    if(this.sun.shadow.mapSize.x!==shadowSize){this.sun.shadow.mapSize.set(shadowSize,shadowSize);if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null;}}
    this.presentation.setQuality(quality);this.landscape.setQuality(quality==='performance'?'retro':quality);this.resize();
  }

  setLighting(mode){
    this.light=mode;
    const settings={day:{fog:0xc3d4cf,top:0x6199c2,bottom:0xe0e8db,sun:0xffedd4,intensity:3.9,ambient:.85,windows:.12,exposure:1.02},dusk:{fog:0xa9b1b7,top:0x7887b5,bottom:0xedc9a6,sun:0xffb978,intensity:2.8,ambient:1.05,windows:.85,exposure:1.07},night:{fog:0x233d57,top:0x102d50,bottom:0x557387,sun:0xa6c7ff,intensity:.72,ambient:.68,windows:2.5,exposure:1.08}}[mode];
    this.scene.fog=new T.FogExp2(settings.fog,mode==='night'?.0028:.00225);
    this.sky.material.uniforms.top.value.set(settings.top);this.sky.material.uniforms.bottom.value.set(settings.bottom);this.sun.color.set(settings.sun);this.sun.intensity=settings.intensity;this.ambient.intensity=settings.ambient;
    this.scene.environmentIntensity=mode==='night'?.22:.45;this.presentation.material.uniforms.exposure.value=settings.exposure;setWindowLighting(settings.windows);
  }

  resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();const size=this.renderer.getDrawingBufferSize(new T.Vector2());this.presentation.resize(size.x,size.y);}

  addPointer(){
    let down=null;this.canvas.tabIndex=0;this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.canvas.addEventListener('pointerdown',e=>{this.canvas.focus({preventScroll:true});down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down.moved=true;if(down.moved){this.yaw-=dx*.006;this.pitch=Math.max(.16,Math.min(1.3,this.pitch+dy*.004));}down.lastX=e.clientX;down.lastY=e.clientY;});
    this.canvas.addEventListener('pointerup',e=>{if(down&&!down.moved)this.pick(e.clientX,e.clientY);down=null;});this.canvas.addEventListener('pointercancel',()=>down=null);
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(25,Math.min(330,this.zoom+e.deltaY*.06));},{passive:false});
  }

  pick(x,y){
    const r=this.canvas.getBoundingClientRect();this.pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);
    const list=this.state.mode==='battle'?[this.ground]:[this.city.hitGroup,...this.enemyCities.filter(c=>c.root.visible).map(c=>c.enemyProxy),...this.pickables,this.ground];
    for(const hit of this.ray.intersectObjects(list,true)){const d=hit.object.userData;if(d.slot!==undefined){this.onSelect({slot:d.slot});return;}if(d.enemy){this.onSelect({enemy:d.enemy});return;}if(d.node){this.onSelect({node:d.node});return;}if(d.ground){this.onSelect({ground:{x:hit.point.x,z:hit.point.z}});return;}}
  }

  project(x,y,z){const p=new T.Vector3(x,y,z).project(this.camera);return {x:(p.x*.5+.5)*this.canvas.clientWidth,y:(-p.y*.5+.5)*this.canvas.clientHeight,visible:p.z<1};}

  createEffect(event){
    const start=new T.Vector3(event.from.x,20,event.from.z),end=new T.Vector3(event.to.x,18,event.to.z);
    const group=new T.Group();
    const material=new T.MeshBasicMaterial({color:event.kind==='enemyShot'?0xff8750:0xffd789,transparent:true,opacity:1});
    const object=new T.Mesh(new T.SphereGeometry(event.kind==='impact'?.35:.18,12,8),material);group.add(object);
    const trail=new T.Mesh(new T.ConeGeometry(.12,1.7,8),new T.MeshBasicMaterial({color:0xffd0a1,transparent:true,opacity:.5}));trail.rotation.x=Math.PI/2;trail.position.z=-.7;group.add(trail);
    this.scene.add(group);this.fx.push({object:group,ball:object,trail,start,end,age:0,kind:event.kind});
  }

  update(s,dt,selectedSlot){
    this.state=s;updateDistricts(this.city,this.preview?this.previewDistricts:s.buildings);
    const battle=s.mode==='battle';let focus,desiredZoom=this.zoom;
    if(battle){
      const b=s.battle;this.city.root.position.set(b.player.x,0,b.player.z);this.city.root.rotation.y=b.player.angle;
      const enemy=this.enemyCities.find(c=>c.id===b.enemyId);for(const city of this.enemyCities)city.root.visible=city===enemy;
      enemy.root.position.set(b.enemy.x,0,b.enemy.z);enemy.root.rotation.y=b.enemy.angle;animateCity(enemy,s.time,!b.result);
      focus=new T.Vector3((b.player.x+b.enemy.x)/2,14,(b.player.z+b.enemy.z)/2);desiredZoom=Math.max(103,distance(b.player,b.enemy)*1.02+58);
      if(this.lastMode!=='battle'){this.savedYaw=this.yaw;this.savedPitch=this.pitch;this.yaw=.16;this.pitch=.48;this.lastEvent=0;}
      for(const event of b.events){if(event.id<=this.lastEvent)continue;this.lastEvent=event.id;if(b.time-event.time<1.1)this.createEffect(event);}
    }else{
      this.city.root.position.set(s.x,0,s.z);this.city.root.rotation.y=s.angle;
      focus=new T.Vector3(s.x,this.view==='world'?0:this.city.deckY+1.2,s.z);
      for(const city of this.enemyCities){const enemy=s.enemies.find(e=>e.id===city.id);city.root.visible=!enemy.defeated;city.root.position.set(enemy.x,0,enemy.z);city.root.rotation.y=-.8;animateCity(city,s.time,false);}
      if(this.lastMode==='battle'){this.yaw=this.savedYaw??.72;this.pitch=this.savedPitch??.55;}
    }
    this.lastMode=s.mode;this.labels.forEach(g=>g.visible=!battle);
    this.routeLine.visible=!battle&&!!s.target;this.destination.visible=this.routeLine.visible;
    if(s.target&&!battle){const p=this.routeLine.geometry.attributes.position;p.setXYZ(0,s.x,.45,s.z);p.setXYZ(1,s.target.x,.45,s.target.z);p.needsUpdate=true;this.routeLine.geometry.computeBoundingSphere();this.routeLine.computeLineDistances();this.destination.position.set(s.target.x,.4,s.target.z);}
    this.selection.visible=!battle&&selectedSlot!==null;
    if(this.selection.visible){const p=slotPosition(selectedSlot),v=new T.Vector3(p.x,this.city.deckY+.35,p.z);this.city.root.updateMatrixWorld();this.city.root.localToWorld(v);this.selection.position.copy(v);}
    animateCity(this.city,s.time,battle?!s.battle.result&&s.battle.command!=='hold':s.moving,this.preview?40:s.population);
    this.focus.lerp(focus,1-Math.exp(-dt*5));
    const wide=this.camera.aspect<1.2?1.4:1,horizontal=Math.cos(this.pitch)*desiredZoom*wide;
    const cameraTarget=new T.Vector3(this.focus.x+Math.sin(this.yaw)*horizontal,this.focus.y+Math.sin(this.pitch)*desiredZoom*wide,this.focus.z+Math.cos(this.yaw)*horizontal);
    this.camera.position.lerp(cameraTarget,1-Math.exp(-dt*6));this.camera.lookAt(this.focus);this.sky.position.copy(this.camera.position);
    const lightHeight=this.light==='dusk'?52:95;this.sun.position.set(this.focus.x-65,lightHeight,this.focus.z+65);this.sun.target.position.copy(this.focus);
    // A tight shadow frustum follows the city; the world view covers a wider area.
    const shadowExtent=this.view==='world'&&!battle?160:battle?120:62;
    if(this.sun.shadow.camera.right!==shadowExtent){Object.assign(this.sun.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent});this.sun.shadow.camera.updateProjectionMatrix();}
    this.landscape.update(s.time,dt);
    const stacks=[];for(const city of [this.city,...this.enemyCities])if(city.root.visible){city.root.updateMatrixWorld(true);for(const point of [...city.stacks,...city.districtStacks])stacks.push(point.getWorldPosition(new T.Vector3()));}
    this.atmosphere.update(s.time,s.paused?0:dt,stacks,s.moving&&s.faction!=='airship'?new T.Vector3(s.x,.4,s.z):null);
    for(let i=this.fx.length-1;i>=0;i--){
      const fx=this.fx[i];fx.age+=s.paused?0:dt;const t=Math.min(1,fx.age/.55);fx.object.position.lerpVectors(fx.start,fx.end,t);fx.object.position.y+=Math.sin(t*Math.PI)*(fx.kind==='salvo'?15:5);fx.object.lookAt(fx.end);
      if(t>=1){fx.trail.visible=false;fx.ball.scale.setScalar(1+(fx.age-.55)*8);fx.ball.material.opacity=Math.max(0,1-(fx.age-.55)*3);if(fx.age>1){fx.object.removeFromParent();disposeGroup(fx.object);this.fx.splice(i,1);}}
    }
    this.presentation.render(this.scene);
  }
}
