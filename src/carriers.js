import * as T from '../vendor/three.module.js';
import {getMaterial as m,box,cylinder as cyl,cone,sphere,beam,batchStatic,disposeGroup} from './materials.js';
import {createPerimeterQuarter,createStreetDetails} from './architecture.js';
import {createHumanoidKaiju,animateFleshAnatomy} from './kaiju.js';
import {createCastleBackpack,kaijuSlotPosition} from './castle.js';
import {createVerticalLayout} from './vertical-city.js';
import {createVerticalCastle} from './vertical-castle.js';
import {KAIJU_SCALE,KAIJU_DECK_Y} from './city-layout.js';
import {createCitizens,animateCitizens} from './citizens.js';
import {addCarrierWeapons} from './armaments.js';
import {terrainHeight,terrainNormal,renderedTerrainHeight} from './terrain.js';
import {normalizeVariant,variantFootprint} from './variants.js';
import {createCrawlerDrill,createVerticalEnvelopes} from './carrier-variants.js';
import {createCrawlerBody,dressCrawlerUndercroft,createAirshipHull,dressEnvelopeCradle,createPropellerBlades} from './carrier-craft.js';

export const slotPosition=(i,faction)=>faction==='kaiju'?kaijuSlotPosition(i):({x:(i%5-2)*3.05,y:0,z:(Math.floor(i/5)-1.5)*3.7});

function ring(group,r,tube,material,x,y,z,rotation=0){const o=new T.Mesh(new T.TorusGeometry(r,tube,8,32),material);o.position.set(x,y,z);o.rotation.y=rotation;o.castShadow=true;group.add(o);return o;}
function crawler(frame,rig,spinners,variant){
  const armour=m('metal',0x42565f),steel=m('metal',0x778587),dark=m('metal',0x283e47),brass=m('gold',0xad8c52);
  createCrawlerBody(frame);
  for(let side of [-1,1]){
    box(frame,3.3,3.8,22.8,dark,side*8.95,2.75,0);
    for(let z=-9;z<=9;z+=3){
      const wheel=new T.Group();wheel.position.set(side*9,2.55,z);rig.add(wheel);
      cyl(wheel,1.68,1.68,3.45,dark,0,0,0,36).rotation.z=Math.PI/2;
      cyl(wheel,1.33,1.33,.16,steel,side*1.77,0,0,32).rotation.z=Math.PI/2;
      cyl(wheel,.55,.55,.26,brass,side*1.88,0,0,24).rotation.z=Math.PI/2;
      for(let a=0;a<8;a++){const angle=a*Math.PI/4;const spoke=box(wheel,.12,1.2,.16,armour,side*1.88,Math.cos(angle)*.83,Math.sin(angle)*.83);spoke.rotation.x=-angle;}
      batchStatic(wheel);spinners.push({obj:wheel,axis:'x',speed:1.8});
    }
    for(let i=0;i<58;i++){
      const angle=i/58*Math.PI*2;
      const z=Math.sin(angle)*10.4,y=2.6+Math.cos(angle)*2;
      const tread=box(frame,3.6,.2,1.05,steel,side*9,y,z);tread.rotation.x=Math.atan2(Math.sin(angle)*2,Math.cos(angle)*10.4);
      box(frame,.32,.14,.72,brass,side*10.72,y+.12,z);
    }
    for(const z of [-7.7,-4]){
      cyl(frame,.54,.67,10.6,m('metal',0x555350),side*7.6,11.35,z,24);
      for(const y of [8,11,14,16.4])cyl(frame,.71,.71,.23,brass,side*7.6,y,z,24);
      const stack=new T.Object3D();stack.position.set(side*7.6,16.7,z);stack.userData.smokestack=true;frame.add(stack);
    }
  }
  box(frame,20.1,.45,23.1,m('stone',0xa8aaa0),0,8,0);
  box(frame,18.3,1.35,20.7,m('brick',0x8f6151),0,8.85,0);
  dressCrawlerUndercroft(frame);
  for(let x=-7.5;x<=7.5;x+=1.5){box(frame,.62,.67,.07,m('window'),x,8.9,10.4);box(frame,.8,.1,.18,m('stone',0xc0b4a0),x,8.46,10.43);}
  if(variant!=='drill'){
    const prow=box(frame,13,2.3,2.1,steel,0,3.2,12.1);prow.rotation.x=-.27;
    for(let x=-6;x<=6;x+=1.4){cone(frame,.54,2.2,dark,x,2.1,13.6,4).rotation.x=Math.PI/2;box(frame,.08,2.2,2.2,brass,x,3.8,12.2);}
  }
  for(const side of [-1,1]){
    const lamp=sphere(frame,.3,m('window',0xffda91),side*7,5.9,11.65,1,1,.4);
    ring(frame,.37,.065,brass,side*7,5.9,11.7);
  }
  return variant==='drill'?createCrawlerDrill(frame,rig,spinners):{};
}

function airship(frame,rig,spinners,variant){
  const brass=m('gold',0xc09d61),wood=m('wood',0x725445),cloth=m('fabric',0xe2d4b1),teal=m('copper',0x538f8e);
  createAirshipHull(frame);box(frame,17,.5,18.5,brass,0,17.3,0);
  const envelopes=variant==='vertical'?createVerticalEnvelopes(frame):[];
  if(variant!=='vertical')for(const side of [-1,1])for(const z of [-6.8,6.6]){
    const envelope=sphere(frame,1,cloth,side*13.2,19.4,z,3.2,3.1,7.5);envelope.name=`Horizontal airship envelope ${envelopes.length+1}`;envelope.userData.carrierEnvelope='horizontal';envelope.userData.noBatch=true;envelopes.push(envelope);
    for(let t=-2;t<=2;t++){
      const off=t*2.4,rad=3.15*Math.sqrt(1-off*off/56.25);const band=ring(frame,rad,.065,brass,side*13.2,19.4,z+off);band.scale.y=.98;
    }
    for(const a of [-1,0,1]){
      const points=[];for(let k=0;k<=24;k++){const dz=-7.4+k/24*14.8;const rad=3.18*Math.sqrt(Math.max(0,1-dz*dz/56.25));points.push(new T.Vector3(side*13.2+Math.sin(a*Math.PI/3)*rad,19.4+Math.cos(a*Math.PI/3)*rad,z+dz));}
      const tube=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.032,5,false),brass);frame.add(tube);
    }
    for(const dz of [-3.5,3.5]){beam(frame,[side*7.4,16.8,z+dz],[side*12.8,17.7,z+dz],.14,brass);beam(frame,[side*7.8,18,z+dz],[side*11.2,20,z+dz],.055,brass);}
    dressEnvelopeCradle(frame,side*13.2,19.4,z);
    const fin=box(frame,5.1,.12,2.2,teal,side*13.2,19.35,z-6.7);fin.rotation.z=side*.09;
    box(frame,.13,3.2,2.3,teal,side*13.2,19.7,z-6.75);
  }
  for(const side of [-1,1]){
    for(const z of [-9,9]){
      const prop=new T.Group();prop.position.set(side*9.6,15.75,z);rig.add(prop);
      cyl(prop,.48,.63,1.5,brass,0,0,0,20).rotation.x=Math.PI/2;
      createPropellerBlades(prop,wood);
      ring(prop,2.3,.065,brass,0,0,-.83);batchStatic(prop);spinners.push({obj:prop,axis:'z',speed:9});
    }
    for(let z=-7;z<=7;z+=2.5){sphere(frame,.4,m('window',0xffd58c),side*8.3,15.8,z,.6,.85,.6);beam(frame,[side*8.3,17,z],[side*8.3,16,z],.045,brass);}
  }
  for(let z=-7;z<=7;z+=3.5)beam(frame,[-8,16.8,z],[8,16.8,z],.14,brass);
  return{envelopes};
}

export function setCityRings(city,rings,buildings,order){
  if(city.faction!=='kaiju')return;
  const layout=buildings?createVerticalLayout(buildings,order,city.variant):null;
  if(city.rings===rings&&city.verticalLayout?.signature===layout?.signature)return;
  if(city.foundation){city.foundation.removeFromParent();disposeGroup(city.foundation);}
  city.verticalLayout=layout;
  if(layout)city.slotPositions=layout.positions;
  city.foundation=layout?createVerticalCastle(city.deckY,city.enemy,layout):createCastleBackpack(city.deckY,city.enemy,rings);batchStatic(city.foundation);city.rig.add(city.foundation);city.rings=rings;
}

export function makeCity(faction,enemy=false,rings=1,variant){
  variant=normalizeVariant(faction,variant);
  const root=new T.Group(),rig=new T.Group(),frame=new T.Group();root.add(rig);rig.add(frame);
  const deckY=faction==='airship'?18:faction==='crawler'?10:KAIJU_DECK_Y,limbs=[],spinners=[],scale=faction==='kaiju'?KAIJU_SCALE:1,footprintScale=variantFootprint(faction,variant);
  root.scale.setScalar(scale);rig.scale.set(footprintScale.x,1,footprintScale.z);let variantParts={};
  if(faction==='kaiju'){
    createHumanoidKaiju(frame,rig,limbs,variant);
  }else{
    variantParts=faction==='crawler'?crawler(frame,rig,spinners,variant):airship(frame,rig,spinners,variant);
    const edge=m('stone',faction==='airship'?0xcdbb93:0x9eaaa3),metal=m('metal',0x45595c);
    box(frame,17.3,.75,18.1,metal,0,deckY-.5,0);box(frame,17.5,.2,18.3,edge,0,deckY-.04,0);
    box(frame,16.5,.09,17.2,m('pavement',0x7f918c),0,deckY+.1,0);
    frame.add(createPerimeterQuarter(faction,deckY),createStreetDetails(faction,deckY));
    for(const side of [-1,1]){
      box(frame,.17,.72,18.2,edge,side*8.65,deckY+.42,0);box(frame,17.4,.72,.17,edge,0,deckY+.42,side*9.05);
      for(let z=-8.6;z<9;z+=.95){box(frame,.3,1,.31,edge,side*8.65,deckY+.6,z);box(frame,.43,.13,.44,m('metal',0x526564),side*8.65,deckY+1.12,z);}
    }
    if(faction==='airship')for(const x of [-8.5,8.5])for(const z of [-8.8,8.8]){
      cyl(frame,.33,.5,4,edge,x,deckY+2,z,20);cyl(frame,.66,.66,.17,m('gold'),x,deckY+3.5,z,24);sphere(frame,.66,m('copper'),x,deckY+4.2,z,1,1.05,1);cone(frame,.06,.85,m('gold'),x,deckY+5.2,z,10);
    }
    // Hull balconies and support braces give the city an inhabited vertical silhouette.
    for(const x of [-5.4,5.4]){box(frame,1.1,2.1,.05,m('fabric',enemy?0xa65246:0x417a85),x,deckY-.65,9.22);box(frame,.09,1.4,.06,m('gold'),x,deckY-.55,9.27);box(frame,.55,.1,.06,m('gold'),x,deckY-.3,9.27);}
    for(const side of [-1,1])for(let z=-6;z<=6;z+=4)beam(frame,[side*5.6,deckY-3,z],[side*8.5,deckY-.5,z],.18,metal);
  }
  const stacks=[];frame.traverse(o=>{if(o.userData.smokestack)stacks.push(o);});batchStatic(frame);
  const districts=new T.Group();districts.position.y=deckY;rig.add(districts);
  const plots=new T.Group();plots.position.y=deckY;rig.add(plots);
  const hitGroup=new T.Group();hitGroup.position.y=deckY;rig.add(hitGroup);
  const slots=[],slotPositions=Array.from({length:20},(_,i)=>slotPosition(i,faction)),hitMaterial=new T.MeshBasicMaterial({visible:false});
  for(let i=0;i<20;i++){const p=slotPositions[i];const hit=new T.Mesh(new T.BoxGeometry(2.8,1,3.4),hitMaterial);hit.position.set(p.x,p.y+.5,p.z);hit.userData.slot=i;hit.userData.noBatch=true;hitGroup.add(hit);slots.push(hit);}
  const layout=faction==='kaiju'?'tower':'deck';
  const city={root,rig,frame,deckY,scale,heading:0,limbs,spinners,districts,plots,hitGroup,slots,slotPositions,layout,faction,variant,footprintScale,drill:variantParts.drill??null,drillTip:variantParts.tip??null,drillHinge:variantParts.hinge??null,drillShaft:variantParts.shaft??null,drillPistons:variantParts.pistons??[],envelopes:variantParts.envelopes??[],enemy,stacks,districtStacks:[],batteries:[],signature:'',rings:null,people:createCitizens(rig,deckY,faction,{scale,slotPositions,layout,rings})};
  city.strikeHand=limbs.find(l=>!l.leg&&l.side>0)?.hand?.marker??null;city.strikeContactTime=.7;city.strikeDuration=1.3;city.strikePhase='idle';city.strikeContactError=Infinity;
  setCityRings(city,rings);addCarrierWeapons(city);return city;
}

export function animateCity(city,time,moving,populationCount=28){
  if(city.faction==='kaiju'){animateTitan(city,time,moving);animateFleshAnatomy(city,time,moving);}
  else{city.rig.position.y=city.faction==='airship'?Math.sin(time*.85)*.18:0;city.rig.rotation.x=hitReaction(city,time)*(city.faction==='airship'?.025:.008);}
  const dt=Math.max(0,Math.min(.1,time-(city.animationTime??time)));city.animationTime=time;
  for(const spinner of city.spinners){
    if(spinner.drill){
      const strikeAge=time-city.strikeTime,attacking=(strikeAge>=0&&strikeAge<1.3)||[...(city.baseWeapons??[]),...(city.batteries??[])].some(weapon=>time-weapon.firedAt>=0&&time-weapon.firedAt<.75);
      spinner.angle+=dt*(attacking?13.0:moving?spinner.speed:0);spinner.obj.rotation[spinner.axis]=spinner.angle;
      city.drillPhase=attacking?'attack':moving?'boring':'idle';
    }else if(city.faction==='airship'||moving)spinner.obj.rotation[spinner.axis]=time*spinner.speed;
  }
  if(city.drillHinge)animateDrillContact(city,time);
  animateCitizens(city.people,time,moving,populationCount,{rings:city.rings??2,slotPositions:city.slotPositions,layout:city.layout,verticalLayout:city.verticalLayout,visibleFloor:city.inspectedFloor,activityStations:city.activityStations??[]});
}

function hitReaction(city,time){const age=time-city.hitAt;return age>=0&&age<.5?Math.sin(age/.5*Math.PI)*Math.exp(-age*4):0;}
function ease(a,b,value){const t=T.MathUtils.clamp((value-a)/(b-a),0,1);return t*t*(3-2*t);}

function animateDrillContact(city,time){
  const age=time-city.strikeTime,contact=city.strikeContactTime??.7,end=city.strikeDuration??1.3;
  const active=age>=0&&age<end&&city.strikeTarget?.isVector3,hinge=city.drillHinge;
  let yaw=0,pitch=0,extension=0;
  if(active){
    city.root.updateMatrixWorld(true);
    // Solve in rig coordinates so the elongated chassis and terrain tilt are
    // included. The metal cutting cone stays rigid; only its powered mount moves.
    const target=city.rig.worldToLocal(city.strikeTarget.clone()).sub(hinge.position);
    yaw=T.MathUtils.clamp(Math.atan2(target.x,target.z),-.32,.32);
    pitch=T.MathUtils.clamp(Math.atan2(target.y,Math.hypot(target.x,target.z)),-.50,.50);
    extension=T.MathUtils.clamp(target.length()-12.55,-1.4,5.0);
    const weight=ease(.12,contact,age)*(1-ease(contact+.22,end,age));
    yaw*=weight;pitch*=weight;extension*=weight;
  }
  hinge.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)));
  city.drill.position.z=extension;
  for(const shaft of [city.drillShaft,...city.drillPistons]){shaft.scale.y=Math.max(.12,extension+1.2);shaft.position.z=(extension-1.2)/2;}
  city.root.updateMatrixWorld(true);
  city.drillContact={yaw,pitch,extension,error:active?city.drillTip.getWorldPosition(new T.Vector3()).distanceTo(city.strikeTarget):null};
}

function strikeMotion(city,time){
  const age=time-city.strikeTime,contact=city.strikeContactTime??.7,end=city.strikeDuration??1.3;
  const active=age>=0&&age<end&&city.strikeTarget?.isVector3;
  city.strikePhase=!active?'idle':age<.22?'windup':age<contact?'reach':age<contact+.22?'contact':'recovery';
  if(!active){city.strikeContactError=Infinity;return null;}
  if(city.strikePose?.time!==city.strikeTime){
    city.root.updateMatrixWorld(true);
    const arm=city.limbs.find(l=>!l.leg&&l.side>0),shoulder=arm.obj.getWorldPosition(new T.Vector3()),target=city.strikeTarget;
    const groundStrike=target.y<city.root.position.y+6.5;
    const drop=T.MathUtils.clamp(shoulder.y-target.y-8.2,.5,groundStrike?8.5:4.5),reach=(arm.lower.position.length()+arm.handVector.length())*city.scale;
    const horizontal=Math.hypot(target.x-shoulder.x,target.z-shoulder.z),vertical=Math.max(0,shoulder.y-target.y-drop);
    const advance=T.MathUtils.clamp(horizontal-Math.sqrt(Math.max(1,reach*reach-vertical*vertical))+.6,.75,2.7);
    const forward=new T.Vector3(Math.sin(city.heading),0,Math.cos(city.heading));
    city.strikePose={time:city.strikeTime,arm,startHand:city.strikeHand.getWorldPosition(new T.Vector3()),advance,drop,forward,heading:city.heading,
      feet:city.limbs.filter(l=>l.leg).map(l=>({side:l.side,centre:l.foot.localToWorld(l.soleCentre.clone())}))};
  }
  const release=ease(contact+.22,end,age),drive=ease(.22,contact,age),weight=ease(.14,.55,age)*(1-release);
  return {...city.strikePose,age,contact,end,drive,release,weight};
}

function animateTitan(city,time,moving){
  const strike=strikeMotion(city,time);
  const position=city.root.position,previous=city.gaitPrevious;
  const travelled=previous?Math.hypot(position.x-previous.x,position.z-previous.z):0;
  // A pursuing strike rides the normal distance-driven stride. Pinning both
  // feet to their fire-time positions while the carrier advances would drag
  // the hips down and teleport the soles when recovery ends.
  if(strike&&travelled>.00001)city.strikePose.moving=true;
  const walking=moving&&(!strike||city.strikePose.moving);
  if(walking&&travelled<8)city.gaitDistance=(city.gaitDistance??0)+travelled/city.scale;
  city.gaitPrevious={x:position.x,z:position.z};
  const cycle=(city.gaitDistance??0)/16,phase=cycle*Math.PI*2;
  const sway=walking?Math.sin(phase):Math.sin(time*.65)*.12;
  const living=city.variant==='flesh';
  const supportedLoad=living?(.024+Math.sin(time*.93)*.004)*(1-(strike?.weight??0)):0;
  const reaction=hitReaction(city,time),lean=(walking?.063:.042)+supportedLoad-reaction*.052+(strike?.weight??0)*.135,roll=sway*(living?.030:.020)+reaction*.012-(strike?.weight??0)*.018;
  // The chest leans into the load around the hips. Hip transfer and upper-body
  // counter-roll share that pivot, rather than tilting the creature at its feet.
  city.rig.position.set(sway*(living?.65:.50)+Math.sin(roll)*25.5,(walking?-1.75-Math.abs(Math.sin(phase))*.24:-1.35)+25.5*(1-Math.cos(lean)*Math.cos(roll))-(strike?strike.drop*strike.weight/city.scale:0),-Math.sin(lean)*Math.cos(roll)*25.5+(strike?strike.advance*strike.weight/city.scale:0));
  city.rig.rotation.set(lean,0,roll);
  city.root.updateMatrixWorld(true);
  const feet=[];
  for(const limb of city.limbs){
    if(!limb.leg){
      const stride=Math.sin(phase+limb.phase);
      limb.obj.rotation.set((walking?stride*(living?.25:.20):Math.sin(time*.65+limb.phase)*.018)+reaction*.16,-sway*.025,limb.side*(.035+(walking?Math.abs(stride)*.020:0)+reaction*.07));
      limb.lower.rotation.set(-.22-(walking?(1-stride)*.07:0),0,0);
      const clenched=!!strike&&limb.side>0&&strike.age>.09&&strike.release<.85;
      limb.hand.digits.visible=!clenched;limb.hand.fist.visible=clenched;
      continue;
    }
    const t=((cycle+(limb.side<0?.5:0))%1+1)%1,stance=t<.62;
    let z=-.45,lift=0;
    if(walking){
      if(stance)z=4.96-t*16;
      else{const swing=(t-.62)/.38,ease=swing*swing*(3-2*swing);z=-4.96+ease*9.92;lift=Math.sin(swing*Math.PI)*2.3;}
    }
    const ground=new T.Vector3(limb.side*3.02+limb.soleCentre.x,0,z+limb.soleCentre.z);
    city.root.localToWorld(ground);let facing=city.heading;
    if(walking&&stance){
      limb.swing=null;
      if(limb.plant&&travelled<8){ground.x=limb.plant.x;ground.z=limb.plant.z;facing=limb.plant.facing;}
      else limb.plant={x:ground.x,z:ground.z,facing};
    }else if(walking){
      // Lift from the sole's actual last plant, including a strike's shorter
      // stance. A fixed local backswing point would snap a planted foot away.
      if(!limb.swing||travelled>=8)limb.swing=limb.plant?{...limb.plant}:{x:ground.x,z:ground.z,facing};
      limb.plant=null;
      const phase=(t-.62)/.38,blend=phase*phase*(3-2*phase);
      const landing=new T.Vector3(limb.side*3.02+limb.soleCentre.x,0,4.96+limb.soleCentre.z);city.root.localToWorld(landing);
      ground.x=T.MathUtils.lerp(limb.swing.x,landing.x,blend);ground.z=T.MathUtils.lerp(limb.swing.z,landing.z,blend);
    }else{limb.plant=null;limb.swing=null;}
    if(strike&&!walking){
      const planted=strike.feet.find(f=>f.side===limb.side);ground.x=planted.centre.x;ground.z=planted.centre.z;facing=strike.heading;
      if(limb.side>0){const inStep=ease(.15,.51,strike.age),outStep=ease(strike.contact+.24,strike.end,strike.age),step=inStep*(1-outStep);
        const stepLength=Math.min(1.25,strike.advance*.58);ground.addScaledVector(strike.forward,stepLength*step);
        lift=(strike.age<.51?Math.sin(inStep*Math.PI):Math.sin(outStep*Math.PI))*.7/city.scale;
      }else lift=0;
      if(lift<.01)limb.plant={x:ground.x,z:ground.z,facing};
    }
    const fitted=fitSole(limb,ground,facing,city.scale);
    fitted.position.y+=lift*city.scale;
    limb.contact=strike&&!walking?lift<.01:stance||!walking;limb.contactTarget=fitted.position;
    feet.push({limb,...fitted});
  }
  // The downhill leg sets the maximum hip height. Both leg targets are known
  // before solving either chain, so idle poses retain the same reach guarantee.
  let lowerBy=0;
  for(const {limb,position:target} of feet){
    const hip=limb.obj.getWorldPosition(new T.Vector3()),upper=new T.Vector3(...limb.knee),lower=new T.Vector3(...limb.ankle).sub(upper);
    const reach=(upper.length()+lower.length()-.32)*city.scale,horizontal=(hip.x-target.x)**2+(hip.z-target.z)**2;
    lowerBy=Math.max(lowerBy,hip.y-target.y-Math.sqrt(Math.max(.2,reach*reach-horizontal)));
  }
  city.rig.position.y-=lowerBy/city.scale;city.root.updateMatrixWorld(true);
  if(strike){
    // Low battlements require a deeper supported crouch. Adjust before the leg
    // solve; do not lengthen an arm or leave a hand floating short of the hull.
    const shoulder=strike.arm.obj.getWorldPosition(new T.Vector3()),target=city.strikeTarget;
    const reach=(strike.arm.lower.position.length()+strike.arm.handVector.length()-.20)*city.scale;
    const horizontal=(shoulder.x-target.x)**2+(shoulder.z-target.z)**2;
    const extra=Math.max(0,shoulder.y-target.y-Math.sqrt(Math.max(1,reach*reach-horizontal)));
    city.rig.position.y-=Math.min(2.5,extra)*strike.weight/city.scale;city.root.updateMatrixWorld(true);
  }
  for(const {limb,position:ground,rotation:soleRotation} of feet){
    const target=city.rig.worldToLocal(ground.clone()).sub(limb.obj.position);
    const upper=new T.Vector3(...limb.knee),lower=new T.Vector3(...limb.ankle).sub(upper);
    const l1=upper.length(),l2=lower.length(),distance=Math.min(l1+l2-.015,Math.max(1,target.length()));
    const axis=target.clone().normalize(),along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    const bend=new T.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
    const knee=axis.multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
    limb.obj.quaternion.setFromUnitVectors(upper.clone().normalize(),knee.clone().normalize());
    const shin=target.clone().sub(knee).applyQuaternion(limb.obj.quaternion.clone().invert());
    limb.lower.quaternion.setFromUnitVectors(lower.clone().normalize(),shin.normalize());
    city.root.updateMatrixWorld(true);
    const parentRotation=limb.lower.getWorldQuaternion(new T.Quaternion());
    limb.foot.quaternion.copy(parentRotation.invert()).multiply(soleRotation);
  }
  if(strike){
    city.root.updateMatrixWorld(true);
    const rest=city.strikeHand.getWorldPosition(new T.Vector3());
    const windup=strike.startHand.clone().add(new T.Vector3(0,2.4,0)).addScaledVector(strike.forward,-1.25);
    let goal=strike.age<.22?strike.startHand.clone().lerp(windup,ease(0,.22,strike.age)):windup.clone().lerp(city.strikeTarget,strike.drive);
    if(strike.release>0)goal=city.strikeTarget.clone().lerp(rest,strike.release);
    aimArm(city,strike.arm,goal);city.root.updateMatrixWorld(true);
    city.strikeContactError=city.strikeHand.getWorldPosition(new T.Vector3()).distanceTo(city.strikeTarget);
  }
}

function aimArm(city,arm,worldTarget){
  const target=city.rig.worldToLocal(worldTarget.clone()).sub(arm.obj.position),upper=arm.lower.position.clone(),lower=arm.handVector;
  const l1=upper.length(),l2=lower.length(),distance=T.MathUtils.clamp(target.length(),Math.abs(l1-l2)+.01,l1+l2-.005);
  const axis=target.clone().normalize(),along=(l1*l1-l2*l2+distance*distance)/(2*distance);
  const hint=new T.Vector3(arm.side,.1,-.3),bend=hint.addScaledVector(axis,-hint.dot(axis)).normalize();
  const elbow=axis.clone().multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
  arm.obj.quaternion.setFromUnitVectors(upper.normalize(),elbow.clone().normalize());
  const forearm=target.clone().sub(elbow).applyQuaternion(arm.obj.quaternion.clone().invert());
  arm.lower.quaternion.setFromUnitVectors(lower.clone().normalize(),forearm.normalize());
}

function supportingPlane(points){
  let best=null;
  // A rigid sole rests on a supporting triangle whose footprint contains its
  // centre. Include the centre sample so a low bump cannot pass through the sole.
  for(let i=0;i<points.length-2;i++)for(let j=i+1;j<points.length-1;j++)for(let k=j+1;k<points.length;k++){
    const p=points[i],q=points[j],r=points[k],det=(q.x-p.x)*(r.z-p.z)-(r.x-p.x)*(q.z-p.z);
    if(Math.abs(det)<1e-5)continue;
    const w0=(q.x*r.z-r.x*q.z)/det,w1=(r.x*p.z-p.x*r.z)/det,w2=(p.x*q.z-q.x*p.z)/det;
    if(Math.min(w0,w1,w2)<-1e-4)continue;
    const a=((q.y-p.y)*(r.z-p.z)-(r.y-p.y)*(q.z-p.z))/det,b=((q.x-p.x)*(r.y-p.y)-(r.x-p.x)*(q.y-p.y))/det,c=p.y-a*p.x-b*p.z;
    if(a*a+b*b>1.5||points.some(v=>a*v.x+b*v.z+c<v.y-.00005))continue;
    if(!best||c<best.c)best={a,b,c};
  }
  if(best)return best;
  return {a:0,b:0,c:Math.max(...points.map(p=>p.y))};
}

function fitSole(limb,anchor,facing,scale){
  const n=terrainNormal(anchor.x,anchor.z),yaw=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),facing);
  const rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(n.x,n.y,n.z)).multiply(yaw);
  let centreY=renderedTerrainHeight(anchor.x,anchor.z),samples;
  for(let iteration=0;iteration<3;iteration++){
    samples=limb.solePoints.map(p=>{const offset=p.clone().sub(limb.soleCentre).multiplyScalar(scale).applyQuaternion(rotation);return {x:offset.x,z:offset.z,y:renderedTerrainHeight(anchor.x+offset.x,anchor.z+offset.z)};});
    const fit=supportingPlane(samples),normal=new T.Vector3(-fit.a,1,-fit.b).normalize();
    rotation.setFromUnitVectors(new T.Vector3(0,1,0),normal).multiply(yaw);centreY=fit.c;
  }
  // Final clearance uses the final rotated footprint, not the previous iterate.
  let adjustment=-Infinity;
  for(const p of limb.solePoints){const offset=p.clone().sub(limb.soleCentre).multiplyScalar(scale).applyQuaternion(rotation);adjustment=Math.max(adjustment,renderedTerrainHeight(anchor.x+offset.x,anchor.z+offset.z)-centreY-offset.y);}
  const position=new T.Vector3(anchor.x,centreY+adjustment+.0015,anchor.z).sub(limb.soleCentre.clone().multiplyScalar(scale).applyQuaternion(rotation));
  return {position,rotation};
}
