import {kaijuSlotPosition} from './city-layout.js';
import {batterySolution,defaultFacing,normalizeAngle} from './weapon-layout.js';
export const SAVE_KEY = 'colossus-wake-save-v1';
export const FACTIONS = {
  kaiju: {name:'The Thornbound', city:'Vesper Bastion', type:'Kaiju city', subtitle:'A cathedral on a living titan.', description:'Gothic spires, stone battlements, and a bond older than memory. Close the distance. Let the creature do the talking.', hp:540, speed:11, range:54, damage:15, melee:42, reload:3.3, ability:'Titan rush', abilityHint:'Surge forward. Deal 85 damage in reach.', color:'#b8c989', tag:'MELEE / LIVING CITY'},
  crawler: {name:'The Iron Commonwealth', city:'Crown of Cinders', type:'Crawler city', subtitle:'The old world, still moving.', description:'Terraced brick districts and smokestacks ride an immense tracked hull. Take the punishment. Answer with iron.', hp:670, speed:8.5, range:72, damage:29, melee:23, reload:3.1, ability:'Siege ram', abilityHint:'Drive forward. Deal 60 damage in reach.', color:'#e3b87f', tag:'BALANCED / ARMOURED CITY'},
  airship: {name:'The Saffron Courts', city:'Qamar Reach', type:'Airship city', subtitle:'An empire carried by the wind.', description:'Gilded domes and slender minarets float between horizontal lift envelopes. Keep your distance. Rain down missiles.', hp:400, speed:14, range:112, damage:23, melee:6, reload:2.7, ability:'Missile storm', abilityHint:'Fire a 70-damage salvo within missile range.', color:'#93cbd4', tag:'RANGED / FLYING CITY'}
};
export const BUILDINGS = {
  keep:{name:'Citadel',cost:{wood:0,iron:0},time:0,icon:'♜',description:'The heart of your city. Upgrade for more hull and weapon damage.'},
  housing:{name:'Dwellings',cost:{wood:35,iron:10},time:6,icon:'⌂',description:'+12 population capacity; newcomers join over time.'},
  farm:{name:'Hanging gardens',cost:{wood:30,iron:15},time:7,icon:'❧',description:'+0.8 food per second. Keeps your citizens fed.'},
  sawmill:{name:'Timber guild',cost:{wood:25,iron:20},time:7,icon:'⚒',description:'Doubles timber gathering near woodland per level.'},
  foundry:{name:'Ironworks',cost:{wood:35,iron:25},time:8,icon:'⬡',description:'Doubles iron gathering near ruins per level.'},
  cannon:{name:'Gun battery',cost:{wood:25,iron:45},time:9,icon:'✣',description:'+9 ranged damage per level when its firing arc reaches the target. Buildings can block cannon fire; outer positions have clearer lines.'},
  armor:{name:'Bulwark',cost:{wood:30,iron:50},time:8,icon:'◇',description:'+120 maximum hull and repairs that much on completion.'}
};
export const WORLD_NODES = [
 {id:'forest',name:'The Sunken Grove',kind:'wood',x:-65,z:-15,amount:750},
 {id:'ruins',name:'Old Earth Foundry',kind:'iron',x:40,z:-45,amount:700},
 {id:'fields',name:'Amber Lowlands',kind:'food',x:55,z:65,amount:800},
 {id:'forest2',name:'Mourning Pines',kind:'wood',x:90,z:-105,amount:900},
 {id:'ruins2',name:'The Broken Meridian',kind:'iron',x:-110,z:90,amount:800},
 {id:'fields2',name:'Pilgrim’s Rest',kind:'food',x:-115,z:-110,amount:700}
];
const clone = x => JSON.parse(JSON.stringify(x));
export const distance = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
export const levelOf = (s,type)=>s.buildings.filter(b=>b?.type===type && b.remaining<=0).reduce((n,b)=>n+b.level,0);
export const maxHull = s=>FACTIONS[s.faction].hp+levelOf(s,'armor')*120+(levelOf(s,'keep')-1)*80;
export const capacity = s=>18+levelOf(s,'housing')*12;
export const income = s=>({food:levelOf(s,'farm')*0.8 - s.population*0.018});
export function note(s,text){s.log.unshift({text,time:s.time});s.log=s.log.slice(0,25);}
export function createGame(faction='kaiju') {
 if(!FACTIONS[faction])throw new Error('Unknown city type');
 const s={version:1,faction,time:0,day:1,resources:{wood:160,iron:135,food:160},population:24,hp:FACTIONS[faction].hp,
 x:-30,z:40,angle:0,target:null,mode:'expedition',buildings:Array(20).fill(null),nodes:clone(WORLD_NODES),
 enemies:[{id:'rival1',name:'The Ash Collector',faction:faction==='crawler'?'kaiju':'crawler',x:105,z:8,defeated:false},
 {id:'rival2',name:'The Pale Armada',faction:faction==='airship'?'crawler':'airship',x:-92,z:-80,defeated:false},
 {id:'rival3',name:'The Last Sovereign',faction:faction==='kaiju'?'airship':'kaiju',x:75,z:-145,defeated:false}],
 battle:null,log:[],stats:{gathered:0,built:0,victories:0},paused:false,speed:1,gathering:null,starving:false,rings:faction==='kaiju'?1:2,ringConstruction:null,worldDamage:{expedition:[],battle:[]}};
 s.buildings[7]={type:'keep',level:1,remaining:0};s.buildings[11]={type:'housing',level:1,remaining:0};s.buildings[13]={type:'farm',level:1,remaining:0};
 note(s,'Your city wakes. Set a course for the Sunken Grove.'); return s;
}
function pay(s,cost){if(Object.entries(cost).some(([k,v])=>s.resources[k]<v))return false;for(const [k,v]of Object.entries(cost))s.resources[k]-=v;return true;}
export const ringCost={wood:90,iron:65};
export const slotUnlocked=(s,i)=>s.faction!=='kaiju'||kaijuSlotPosition(i).ring<=(s.rings??1);
export function expandRing(s){
 if(s.mode!=='expedition'||s.faction!=='kaiju'||s.rings>=2||s.ringConstruction)return {ok:false,message:'The outer ward cannot be added right now.'};
 if(!pay(s,ringCost))return {ok:false,message:'An outer ring needs 90 wood and 65 iron.'};
 s.ringConstruction={remaining:12,target:2};note(s,'Building the outer ward around the inner castle.');return {ok:true};
}
export function setBatteryFacing(s,slot,angle){
 const b=s.buildings[slot];if(s.mode!=='expedition'||b?.type!=='cannon'||!Number.isFinite(angle))return {ok:false,message:'Select a battery between battles to change its direction.'};
 b.facing=normalizeAngle(angle);return {ok:true};
}
export function build(s,type,slot) {
 const b=BUILDINGS[type];if(s.mode!=='expedition'||!b||type==='keep'||!Number.isInteger(slot)||slot<0||slot>=20||s.buildings[slot])return {ok:false,message:'Choose an empty district on the city deck.'};
 if(!slotUnlocked(s,slot))return {ok:false,message:'Build the outer ring before placing a district here.'};
 if(!pay(s,b.cost))return {ok:false,message:'More wood or iron is needed.'};
 s.buildings[slot]={type,level:1,remaining:b.time,...(type==='cannon'?{facing:defaultFacing(s.faction,slot)}:{})};note(s,`${b.name} construction started.`);return {ok:true};
}
export function upgradeCost(b){return {wood:30*b.level,iron:35*b.level};}
export function upgrade(s,slot){const b=s.buildings[slot];if(s.mode!=='expedition'||!b||b.remaining>0||b.level>=3)return {ok:false,message:'This district cannot be upgraded yet.'};
 if(!pay(s,upgradeCost(b)))return {ok:false,message:'More wood or iron is needed.'};
 b.remaining=8;b.upgrading=true;note(s,`Upgrading ${BUILDINGS[b.type].name}.`);return {ok:true};}
export function repair(s){if(s.mode!=='expedition')return {ok:false,message:'Repairs are available between battles.'};if(s.hp>=maxHull(s))return {ok:false,message:'Your hull is already sound.'};if(!pay(s,{wood:15,iron:20}))return {ok:false,message:'Repair needs 15 wood and 20 iron.'};s.hp=Math.min(maxHull(s),s.hp+150);note(s,'Repair crews restored 150 hull.');return {ok:true};}
export function travel(s,x,z){if(s.mode!=='expedition')return;s.target={x:clamp(x,-175,175),z:clamp(z,-175,175)};s.gathering=null;}
function move(entity,target,speed,dt,limit=175){const d=distance(entity,target);if(d<0.15)return true;const step=Math.min(d,speed*dt);const dx=(target.x-entity.x)/d,dz=(target.z-entity.z)/d;entity.x=clamp(entity.x+dx*step,-limit,limit);entity.z=clamp(entity.z+dz*step,-limit,limit);entity.angle=Math.atan2(dx,dz);return d<=step+.15;}
export function startBattle(s,id){const rival=s.enemies.find(e=>e.id===id);if(s.mode!=='expedition'||!rival||rival.defeated)return false;
 if(distance(s,rival)>42){note(s,'Move closer to the rival city before engaging.');return false;}
 const hp=FACTIONS[rival.faction].hp*.70+(s.stats.victories*50);
 s.battle={enemyId:id,enemyFaction:rival.faction,enemyName:rival.name,enemyMaxHp:hp,enemyHp:hp,player:{x:-52,z:0,angle:Math.PI/2},enemy:{x:52,z:0,angle:-Math.PI/2},reload:0,enemyReload:2.4,abilityCooldown:0,command:'hold',autoFire:true,time:0,events:[],pendingHits:[],seq:0,result:null,damage:0};
 s.target=null;s.mode='battle';s.paused=false;note(s,`${rival.name} prepares for battle.`);return true;
}
export const attackDelay=kind=>kind==='impact'?.7:.55;
function event(b,kind,from,to,damage,details={}){const hit={id:++b.seq,kind,from:{...from},to:{...to},damage,time:b.time,impactAt:b.time+attackDelay(kind),...details};b.events.push(hit);b.events=b.events.slice(-30);(b.pendingHits??=[]).push({eventId:hit.id,source:details.source,damage,impactAt:hit.impactAt});}
function resolveHits(s){const b=s.battle,remaining=[];for(const hit of b.pendingHits??[]){if(hit.impactAt>b.time+1e-8){remaining.push(hit);continue;}if(hit.source==='enemy')s.hp-=hit.damage;else{b.enemyHp-=hit.damage;b.damage+=hit.damage;}}b.pendingHits=remaining;outcome(s);if(b.result)b.pendingHits=[];}
function outcome(s){const b=s.battle;if(!b||b.result)return;
 if(s.hp<=0){s.hp=0;b.result='defeat';b.finishedAt=s.time;note(s,'The city has fallen. Your people need a new beginning.');}
 else if(b.enemyHp<=0){b.enemyHp=0;b.result='victory';b.finishedAt=s.time;s.enemies.find(e=>e.id===b.enemyId).defeated=true;s.stats.victories++;s.resources.wood+=95;s.resources.iron+=100;s.resources.food+=65;note(s,'Victory. Salvaged 95 wood, 100 iron, and 65 food.');}}
// Centre spacing follows the different hull widths and the titan's arm reach.
export function meleeReach(attacker,target){return attacker==='kaiju'?(target==='kaiju'?12:18):attacker==='crawler'?(target==='kaiju'?16:24):target==='kaiju'?14:22;}
export function weaponStatus(s){
 const b=s.battle;if(!b)return {batteries:[],active:0,total:0,baseInRange:false,canFire:false};
 const batteries=s.buildings.flatMap((building,slot)=>building?.type==='cannon'?[batterySolution(s,slot,b.player,b.enemy,FACTIONS[s.faction].range)]:[]);
 const active=batteries.filter(m=>m.active).length,baseInRange=distance(b.player,b.enemy)<=FACTIONS[s.faction].range;
 return {batteries,active,total:batteries.length,baseInRange,canFire:baseInRange||active>0,melee:distance(b.player,b.enemy)<=meleeReach(s.faction,b.enemyFaction)};
}
export function fire(s){const b=s.battle;if(s.mode!=='battle'||!b||b.result||b.reload>0||s.paused)return false;const f=FACTIONS[s.faction],d=distance(b.player,b.enemy),status=weaponStatus(s);if(!status.canFire)return false;
 const melee=status.melee,mounts=melee?[]:status.batteries.filter(m=>m.active).map(m=>m.slot);if(melee){b.player.angle=Math.atan2(b.enemy.x-b.player.x,b.enemy.z-b.player.z);if(s.faction==='kaiju')b.command='approach';}
 const damage=(status.baseInRange?(melee?f.melee:f.damage)+(levelOf(s,'keep')-1)*5:0)+mounts.reduce((sum,slot)=>sum+s.buildings[slot].level*9,0);b.reload=f.reload;event(b,melee?'impact':'shot',b.player,b.enemy,damage,{source:'player',mounts,base:status.baseInRange});return true;}
export function ability(s){const b=s.battle;if(s.mode!=='battle'||!b||b.result||b.abilityCooldown>0||s.paused)return {ok:false,message:'Ability is not ready.'};const f=s.faction;let d=distance(b.player,b.enemy);
 if(f==='airship'){if(d>FACTIONS[f].range)return {ok:false,message:'Move within missile range first.'};event(b,'salvo',b.player,b.enemy,70,{source:'player',mounts:weaponStatus(s).batteries.filter(m=>m.active).map(m=>m.slot)});}
 else {if(d>70)return {ok:false,message:'Close to within 70 metres before rushing.'};move(b.player,b.enemy,Math.max(0,d-meleeReach(f,b.enemyFaction)+.5),1,100);event(b,'impact',b.player,b.enemy,f==='kaiju'?85:60,{source:'player'});}
 b.abilityCooldown=13;return {ok:true};}
export function leaveBattle(s,retreat=false){const b=s.battle;if(!b)return false;if(b.result==='defeat')return false;if(!b.result&&!retreat)return false;
 if(retreat&&!b.result){s.resources.food=Math.max(0,s.resources.food-20);note(s,'Withdrew from battle. The evacuation used 20 food.');}
 s.mode='expedition';s.battle=null;return true;}
function tickBattle(s,dt,input){const b=s.battle;if(b.result)return;b.time+=dt;resolveHits(s);if(b.result)return;b.reload=Math.max(0,b.reload-dt);b.enemyReload=Math.max(0,b.enemyReload-dt);b.abilityCooldown=Math.max(0,b.abilityCooldown-dt);
 const f=FACTIONS[s.faction],enemy=FACTIONS[b.enemyFaction];const d=distance(b.player,b.enemy);
 if(input.x||input.z){const m=Math.max(1,Math.hypot(input.x,input.z));move(b.player,{x:b.player.x+input.x/m*100,z:b.player.z+input.z/m*100},f.speed,dt,100);b.command='hold';}
 else if(b.command==='approach'&&d>(s.faction==='kaiju'?meleeReach(s.faction,b.enemyFaction)-.5:f.range*.68))move(b.player,b.enemy,f.speed,dt,100);
 else if(b.command==='retreat'&&d<140)move(b.player,{x:b.player.x+(b.player.x-b.enemy.x),z:b.player.z+(b.player.z-b.enemy.z)},f.speed,dt,100);
 if(b.enemyFaction==='airship'){if(d<80)move(b.enemy,{x:b.enemy.x+(b.enemy.x-b.player.x),z:b.enemy.z+(b.enemy.z-b.player.z)},enemy.speed*.72,dt,100);else if(d>103)move(b.enemy,b.player,enemy.speed*.65,dt,100);}
 else if(d>(b.enemyFaction==='kaiju'?meleeReach(b.enemyFaction,s.faction)-.5:50))move(b.enemy,b.player,enemy.speed*.70,dt,100);
 if(b.autoFire)fire(s);if(b.result)return;
 const now=distance(b.player,b.enemy);if(b.enemyReload<=0&&now<=enemy.range){const melee=now<=meleeReach(b.enemyFaction,s.faction);if(melee)b.enemy.angle=Math.atan2(b.player.x-b.enemy.x,b.player.z-b.enemy.z);const damage=(melee?enemy.melee:enemy.damage)*.75;b.enemyReload=enemy.reload+0.65;event(b,melee?'impact':'enemyShot',b.enemy,b.player,damage,{source:'enemy'});}
}
export function tick(s,dt,input={x:0,z:0}){
 if(s.paused)return;dt=clamp(dt,0,.25)*s.speed;s.time+=dt;s.day=1+Math.floor(s.time/90);
 if(s.mode==='battle'){tickBattle(s,dt,input);return;}
 if(s.ringConstruction){s.ringConstruction.remaining=Math.max(0,s.ringConstruction.remaining-dt);if(s.ringConstruction.remaining===0){s.rings=s.ringConstruction.target;s.ringConstruction=null;s.stats.built++;note(s,'The outer ring is ready. Thirteen new district plots are available.');}}
 for(const b of s.buildings){if(!b||b.remaining<=0)continue;b.remaining=Math.max(0,b.remaining-dt);if(b.remaining===0){if(b.upgrading){b.level++;delete b.upgrading;}s.stats.built++;if(b.type==='armor')s.hp=Math.min(maxHull(s),s.hp+120);if(b.type==='keep')s.hp=Math.min(maxHull(s),s.hp+80);note(s,`${BUILDINGS[b.type].name} is ready.`);}}
 s.resources.food=Math.max(0,s.resources.food+income(s).food*dt);s.starving=s.resources.food<=0;
 if(s.starving)s.population=Math.max(8,s.population-.08*dt);else if(s.population<capacity(s))s.population=Math.min(capacity(s),s.population+.055*dt);
 let moving=false;if(input.x||input.z){const m=Math.max(1,Math.hypot(input.x,input.z));move(s,{x:s.x+input.x/m*100,z:s.z+input.z/m*100},FACTIONS[s.faction].speed,dt);s.target=null;moving=true;}
 else if(s.target){moving=true;if(move(s,s.target,FACTIONS[s.faction].speed,dt)){s.target=null;moving=false;}}
 s.moving=moving;s.gathering=null;
 if(!moving){const node=s.nodes.find(n=>n.amount>0&&distance(s,n)<23);if(node){const rate=node.kind==='wood'?2.5*(1+levelOf(s,'sawmill')):node.kind==='iron'?2.2*(1+levelOf(s,'foundry')):3.8;const n=Math.min(node.amount,rate*dt);node.amount-=n;s.resources[node.kind]+=n;s.stats.gathered+=n;s.gathering=node.id;}}
 for(const k of Object.keys(s.resources))s.resources[k]=clamp(s.resources[k],0,9999);
}
export function serialize(s){return JSON.stringify(s);}
export function deserialize(raw){
 try{const s=JSON.parse(raw);if(s.version!==1||!FACTIONS[s.faction]||!Array.isArray(s.buildings)||s.buildings.length!==20||!Array.isArray(s.nodes)||s.nodes.length!==6||!Array.isArray(s.enemies)||s.enemies.length!==3||!s.stats||!Array.isArray(s.log))return null;
 for(const k of ['wood','iron','food'])if(!Number.isFinite(s.resources?.[k])||s.resources[k]<0)return null;
 for(const k of ['x','z','angle','time','hp','population'])if(!Number.isFinite(s[k]))return null;
 if(!['expedition','battle'].includes(s.mode))return null;
 if(s.buildings.some(b=>b&&(!BUILDINGS[b.type]||!Number.isInteger(b.level)||b.level<1||b.level>3||!Number.isFinite(b.remaining)||b.remaining<0)))return null;
 if(s.buildings.some(b=>b?.facing!==undefined&&!Number.isFinite(b.facing)))return null;
 const requiredRing=s.faction==='kaiju'?Math.max(1,...s.buildings.flatMap((b,i)=>b?[kaijuSlotPosition(i).ring]:[])):2;
 if(s.rings!==undefined&&(!Number.isInteger(s.rings)||s.rings<0||s.rings>2))return null;
 s.rings=Math.max(s.rings??requiredRing,requiredRing);
 if(s.ringConstruction!=null&&(s.faction!=='kaiju'||s.rings>=2||!Number.isFinite(s.ringConstruction.remaining)||s.ringConstruction.remaining<0||s.ringConstruction.remaining>12||s.ringConstruction.target!==2))return null;
 s.ringConstruction??=null;s.worldDamage??={expedition:[],battle:[]};
 if(!s.worldDamage||['expedition','battle'].some(mode=>!Array.isArray(s.worldDamage[mode])||s.worldDamage[mode].length>512||s.worldDamage[mode].some(id=>typeof id!=='string'||id.length>80)))return null;
 if(s.nodes.some(n=>!WORLD_NODES.some(w=>w.id===n.id)||!['wood','iron','food'].includes(n.kind)||![n.x,n.z,n.amount].every(Number.isFinite)||n.amount<0))return null;
 if(s.enemies.some(e=>!FACTIONS[e.faction]||![e.x,e.z].every(Number.isFinite)))return null;
 if(s.mode==='battle'&&(!s.battle||!FACTIONS[s.battle.enemyFaction]||!s.enemies.some(e=>e.id===s.battle.enemyId)||!['player','enemy'].every(k=>[s.battle[k]?.x,s.battle[k]?.z,s.battle[k]?.angle].every(Number.isFinite))||!['enemyHp','enemyMaxHp','time','reload','enemyReload','abilityCooldown'].every(k=>Number.isFinite(s.battle[k]))))return null;
 if(s.mode==='battle'){s.battle.pendingHits??=[];if(!Array.isArray(s.battle.pendingHits)||s.battle.pendingHits.length>64||s.battle.pendingHits.some(h=>!['player','enemy'].includes(h.source)||!Number.isInteger(h.eventId)||!Number.isFinite(h.damage)||h.damage<0||h.damage>10000||!Number.isFinite(h.impactAt)||h.impactAt<0||h.impactAt>s.battle.time+.71))return null;}
 if(s.mode==='battle'&&s.battle.finishedAt!==undefined&&(!Number.isFinite(s.battle.finishedAt)||s.battle.finishedAt<0||s.battle.finishedAt>s.time))return null;
 s.paused=false;s.speed=1;return s;
 }catch{return null;}
}
