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
  cannon:{name:'Gun battery',cost:{wood:25,iron:45},time:9,icon:'✣',description:'+9 ranged damage per level in city battles.'},
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
 battle:null,log:[],stats:{gathered:0,built:0,victories:0},paused:false,speed:1,gathering:null,starving:false};
 s.buildings[7]={type:'keep',level:1,remaining:0};s.buildings[11]={type:'housing',level:1,remaining:0};s.buildings[13]={type:'farm',level:1,remaining:0};
 note(s,'Your city wakes. Set a course for the Sunken Grove.'); return s;
}
function pay(s,cost){if(Object.entries(cost).some(([k,v])=>s.resources[k]<v))return false;for(const [k,v]of Object.entries(cost))s.resources[k]-=v;return true;}
export function build(s,type,slot) {
 const b=BUILDINGS[type];if(s.mode!=='expedition'||!b||type==='keep'||!Number.isInteger(slot)||slot<0||slot>=20||s.buildings[slot])return {ok:false,message:'Choose an empty district on the city deck.'};
 if(!pay(s,b.cost))return {ok:false,message:'More wood or iron is needed.'};
 s.buildings[slot]={type,level:1,remaining:b.time};note(s,`${b.name} construction started.`);return {ok:true};
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
 s.battle={enemyId:id,enemyFaction:rival.faction,enemyName:rival.name,enemyMaxHp:hp,enemyHp:hp,player:{x:-52,z:0,angle:Math.PI/2},enemy:{x:52,z:0,angle:-Math.PI/2},reload:0,enemyReload:2.4,abilityCooldown:0,command:'hold',autoFire:true,time:0,events:[],seq:0,result:null,damage:0};
 s.target=null;s.mode='battle';s.paused=false;note(s,`${rival.name} prepares for battle.`);return true;
}
function event(b,kind,from,to,damage){b.events.push({id:++b.seq,kind,from:{...from},to:{...to},damage,time:b.time});b.events=b.events.slice(-30);}
function outcome(s){const b=s.battle;if(!b||b.result)return;
 if(s.hp<=0){s.hp=0;b.result='defeat';note(s,'The city has fallen. Your people need a new beginning.');}
 else if(b.enemyHp<=0){b.enemyHp=0;b.result='victory';s.enemies.find(e=>e.id===b.enemyId).defeated=true;s.stats.victories++;s.resources.wood+=95;s.resources.iron+=100;s.resources.food+=65;note(s,'Victory. Salvaged 95 wood, 100 iron, and 65 food.');}}
export function fire(s){const b=s.battle;if(s.mode!=='battle'||!b||b.result||b.reload>0||s.paused)return false;const f=FACTIONS[s.faction],d=distance(b.player,b.enemy);if(d>f.range)return false;
 const melee=d<26;const damage=(melee?f.melee:f.damage)+levelOf(s,'cannon')*9+(levelOf(s,'keep')-1)*5;b.enemyHp-=damage;b.damage+=damage;b.reload=f.reload;event(b,melee?'impact':'shot',b.player,b.enemy,damage);outcome(s);return true;}
export function ability(s){const b=s.battle;if(s.mode!=='battle'||!b||b.result||b.abilityCooldown>0||s.paused)return {ok:false,message:'Ability is not ready.'};const f=s.faction;let d=distance(b.player,b.enemy);
 if(f==='airship'){if(d>FACTIONS[f].range)return {ok:false,message:'Move within missile range first.'};b.enemyHp-=70;event(b,'salvo',b.player,b.enemy,70);}
 else {if(d>70)return {ok:false,message:'Close to within 70 metres before rushing.'};move(b.player,b.enemy,Math.max(0,d-22),1,100);b.enemyHp-=f==='kaiju'?85:60;event(b,'impact',b.player,b.enemy,f==='kaiju'?85:60);}
 b.abilityCooldown=13;outcome(s);return {ok:true};}
export function leaveBattle(s,retreat=false){const b=s.battle;if(!b)return false;if(b.result==='defeat')return false;if(!b.result&&!retreat)return false;
 if(retreat&&!b.result){s.resources.food=Math.max(0,s.resources.food-20);note(s,'Withdrew from battle. The evacuation used 20 food.');}
 s.mode='expedition';s.battle=null;return true;}
function tickBattle(s,dt,input){const b=s.battle;if(b.result)return;b.time+=dt;b.reload=Math.max(0,b.reload-dt);b.enemyReload=Math.max(0,b.enemyReload-dt);b.abilityCooldown=Math.max(0,b.abilityCooldown-dt);
 const f=FACTIONS[s.faction],enemy=FACTIONS[b.enemyFaction];const d=distance(b.player,b.enemy);
 if(input.x||input.z){const m=Math.max(1,Math.hypot(input.x,input.z));move(b.player,{x:b.player.x+input.x/m*100,z:b.player.z+input.z/m*100},f.speed,dt,100);b.command='hold';}
 else if(b.command==='approach'&&d>(s.faction==='kaiju'?20:f.range*.68))move(b.player,b.enemy,f.speed,dt,100);
 else if(b.command==='retreat'&&d<140)move(b.player,{x:b.player.x+(b.player.x-b.enemy.x),z:b.player.z+(b.player.z-b.enemy.z)},f.speed,dt,100);
 if(b.enemyFaction==='airship'){if(d<80)move(b.enemy,{x:b.enemy.x+(b.enemy.x-b.player.x),z:b.enemy.z+(b.enemy.z-b.player.z)},enemy.speed*.72,dt,100);else if(d>103)move(b.enemy,b.player,enemy.speed*.65,dt,100);}
 else if(d>(b.enemyFaction==='kaiju'?22:50))move(b.enemy,b.player,enemy.speed*.70,dt,100);
 if(b.autoFire)fire(s);if(b.result)return;
 const now=distance(b.player,b.enemy);if(b.enemyReload<=0&&now<=enemy.range){const damage=(now<26?enemy.melee:enemy.damage)*.75;s.hp-=damage;b.enemyReload=enemy.reload+0.65;event(b,now<26?'impact':'enemyShot',b.enemy,b.player,damage);outcome(s);}
}
export function tick(s,dt,input={x:0,z:0}){
 if(s.paused)return;dt=clamp(dt,0,.25)*s.speed;s.time+=dt;s.day=1+Math.floor(s.time/90);
 if(s.mode==='battle'){tickBattle(s,dt,input);return;}
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
 if(s.nodes.some(n=>!WORLD_NODES.some(w=>w.id===n.id)||!['wood','iron','food'].includes(n.kind)||![n.x,n.z,n.amount].every(Number.isFinite)||n.amount<0))return null;
 if(s.enemies.some(e=>!FACTIONS[e.faction]||![e.x,e.z].every(Number.isFinite)))return null;
 if(s.mode==='battle'&&(!s.battle||!FACTIONS[s.battle.enemyFaction]||!s.enemies.some(e=>e.id===s.battle.enemyId)||!['player','enemy'].every(k=>[s.battle[k]?.x,s.battle[k]?.z].every(Number.isFinite))||!['enemyHp','enemyMaxHp','time','reload','enemyReload','abilityCooldown'].every(k=>Number.isFinite(s.battle[k]))))return null;
 s.paused=false;s.speed=1;return s;
 }catch{return null;}
}
