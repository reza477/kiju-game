import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, build, upgrade, tick, startBattle, fire, ability, serialize, deserialize, SAVE_KEY} from '../src/simulation.js';
import {CARRIER_VARIANTS} from '../src/variants.js';
import {readTransfer, writeTransfer, storeTransferredSave, IMPORT_BACKUP_KEY} from '../src/save-transfer.js';

test('portable and legacy saves retain variant, district identity and vertical construction order', () => {
  const game = createGame('kaiju', 'cyborg');
  assert.ok(build(game, 'sawmill', 1).ok); assert.ok(build(game, 'farm', 0).ok);
  for (const file of [writeTransfer(game, 'release-test'), serialize(game)]) {
    const read = readTransfer(file);
    assert.equal(read.variant, game.variant); assert.deepEqual(read.towerOrder, game.towerOrder);
    assert.deepEqual(read.buildings, game.buildings); assert.deepEqual(read.resources, game.resources);
  }
});

test('every variant imports ordinary travel, construction, upgrades and battle impacts intact', () => {
  for (const [variant, definition] of Object.entries(CARRIER_VARIANTS)) {
    const game = createGame(definition.faction, variant); game.resources = {wood:1000, iron:1000, food:1000};
    assert.ok(build(game, 'cannon', 0).ok); assert.ok(upgrade(game, 7).ok);
    game.target = {x:40,z:50}; tick(game, .25);
    assert.deepEqual(readTransfer(writeTransfer(game, 'all-variants')), deserialize(serialize(game)));
    game.x = game.enemies[0].x; game.z = game.enemies[0].z;
    assert.ok(startBattle(game, game.enemies[0].id));
    game.battle.player.x=0; game.battle.enemy.x=30; game.battle.autoFire=false;
    assert.ok(fire(game)); assert.ok(ability(game).ok); tick(game, .25);
    assert.ok(game.battle.events.length > 0); assert.ok(game.battle.pendingHits.length > 0);
    assert.deepEqual(readTransfer(writeTransfer(game, 'all-variants')), deserialize(serialize(game)));
  }
});

test('legacy omissions migrate without changing saved IDs, construction order or battle history', () => {
  const game=createGame('kaiju','cyborg'); assert.ok(build(game,'sawmill',0).ok);
  game.enemies=game.enemies.slice(0,3); game.x=game.enemies[0].x;game.z=game.enemies[0].z;
  assert.ok(startBattle(game,game.enemies[0].id));game.battle.player.x=0;game.battle.enemy.x=40;
  assert.ok(fire(game));
  for(const key of ['variant','towerOrder','rings','ringConstruction','worldDamage','moving'])delete game[key];
  for(const enemy of game.enemies)delete enemy.variant;
  delete game.battle.enemyVariant;delete game.battle.pendingHits;
  for(const event of game.battle.events)for(const key of ['impactAt','source','mounts','base'])delete event[key];
  const raw=serialize(game),local=deserialize(raw),imported=readTransfer(raw);
  assert.ok(local);assert.deepEqual(imported,local);
  assert.deepEqual(imported.buildings,game.buildings);assert.deepEqual(imported.enemies.map(e=>e.id),game.enemies.map(e=>e.id));
  assert.deepEqual(imported.battle.events,game.battle.events);assert.deepEqual(imported.battle.pendingHits,[]);
});

function rejectBeforeStorage(game,label){
  assert.throws(()=>readTransfer(serialize(game)),/valid Colossus Wake expedition/,label);
  const writes=[];
  assert.throws(()=>storeTransferredSave({setItem:(...args)=>writes.push(args)},game,serialize(createGame('airship'))),undefined,label);
  assert.deepEqual(writes,[],`${label}: no main or recovery save write`);
}

test('external imports reject malformed runtime shapes before replacing either save', () => {
  const corrupt = [
    ['missing time',s=>delete s.time], ['null stats',s=>s.stats=null], ['missing stats counter',s=>delete s.stats.built],
    ['string stats counter',s=>s.stats.gathered='100'], ['negative victories',s=>s.stats.victories=-1],
    ['null log record',s=>s.log=[null]], ['missing log text',s=>s.log=[{time:0}]], ['object log text',s=>s.log[0].text={}],
    ['unbounded log',s=>s.log=Array(26).fill(s.log[0])], ['missing day',s=>delete s.day], ['invalid day',s=>s.day=0],
    ['nonfinite coordinate',s=>s.x=Infinity], ['overflowing coordinate',s=>s.target={x:1e300,z:0}],
    ['incomplete target',s=>s.target={x:5}], ['array target',s=>s.target=[]], ['unknown gathering site',s=>s.gathering='elsewhere'],
    ['null resources',s=>s.resources=null], ['missing resource',s=>delete s.resources.food], ['extra resource',s=>s.resources.constructor=1],
    ['invalid boolean',s=>s.starving='false'], ['invalid speed',s=>s.speed=3], ['null building',s=>s.buildings[0]=false],
    ['malformed building',s=>s.buildings[0]={type:'housing',level:1}], ['invalid upgrade',s=>s.buildings[7].upgrading={}],
    ['null world damage',s=>s.worldDamage=null], ['invalid world damage record',s=>s.worldDamage.expedition=[{}]],
    ['null tower order',s=>s.towerOrder=null], ['duplicate district IDs',s=>s.towerOrder=[7,7]],
    ['invalid construction',s=>s.ringConstruction={remaining:5,target:[] }],
    ['null node',s=>s.nodes[0]=null], ['duplicate node IDs',s=>s.nodes[1]={...s.nodes[0]}],
    ['mismatched resource kind',s=>s.nodes[0].kind='iron'], ['null node name',s=>s.nodes[0].name=null],
    ['null enemy',s=>s.enemies[0]=null], ['duplicate rival IDs',s=>s.enemies[1].id=s.enemies[0].id],
    ['missing enemy status',s=>delete s.enemies[0].defeated], ['wrong rival variant',s=>s.enemies[0].variant='cyborg'],
    ['expedition with dangling battle',s=>s.battle={events:[]}],
  ];
  for(const [label,mutate]of corrupt){const game=createGame('kaiju');mutate(game);rejectBeforeStorage(game,label);}
  const local=createGame();local.log=[null];assert.ok(deserialize(serialize(local)),'Historical local-save loader behavior is unchanged');
});

test('inherited enum names, markup IDs and prototype keys cannot enter imported runtime data', () => {
  for(const value of ['constructor','__proto__','toString']){
    for(const [label,mutate]of [
      ['faction',s=>s.faction=value],['variant',s=>s.variant=value],
      ['building type',s=>s.buildings[7].type=value],['enemy faction',s=>s.enemies[0].faction=value],
      ['enemy variant',s=>s.enemies[0].variant=value],
    ]){const game=createGame();mutate(game);rejectBeforeStorage(game,`${label}: ${value}`);}
  }
  for(const id of ['x"><span id="save">injected</span>','rival1" autofocus="true','constructor',null]){
    const game=createGame();game.enemies[0].id=id;rejectBeforeStorage(game,`rival ID: ${id}`);
  }
  const game=createGame();game.resources=JSON.parse('{"wood":1,"iron":1,"food":1,"__proto__":{"polluted":true}}');
  rejectBeforeStorage(game,'prototype object');assert.equal({}.polluted,undefined);
  const safe=createGame();safe.log[0].text='Keep <b>these words</b> & "quotes" as plain text';safe.enemies[0].name='A <small>city</small>';
  const restored=readTransfer(serialize(safe));assert.equal(restored.log[0].text,safe.log[0].text);assert.equal(restored.enemies[0].name,safe.enemies[0].name);
});

test('battle imports reject broken references and malformed events used by rendering and audio', () => {
  const corrupt = [
    ['missing battle',s=>s.battle=null], ['missing events',s=>delete s.battle.events], ['null event',s=>s.battle.events=[null]],
    ['unknown rival',s=>s.battle.enemyId='missing'], ['wrong enemy faction',s=>s.battle.enemyFaction='kaiju'],
    ['invalid command',s=>s.battle.command='constructor'], ['invalid auto-fire',s=>s.battle.autoFire={}],
    ['invalid result',s=>s.battle.result='won'], ['missing damage',s=>delete s.battle.damage],
    ['invalid player position',s=>s.battle.player.x=null], ['missing player heading',s=>delete s.battle.player.angle],
    ['zero max health',s=>s.battle.enemyMaxHp=0], ['bad event source',s=>s.battle.events[0].source='other'],
    ['event has null from',s=>s.battle.events[0].from=null], ['event has null to',s=>s.battle.events[0].to=null],
    ['event has invalid mounts',s=>s.battle.events[0].mounts={}], ['event has duplicate mounts',s=>s.battle.events[0].mounts=[7,7]],
    ['event has invalid kind',s=>s.battle.events[0].kind='constructor'], ['event has future time',s=>s.battle.events[0].time=99],
    ['null pending hit',s=>s.battle.pendingHits=[null]], ['pending hit has unknown sequence',s=>s.battle.pendingHits[0].eventId=900],
    ['pending hit has invalid damage',s=>s.battle.pendingHits[0].damage=-1], ['pending hit too far ahead',s=>s.battle.pendingHits[0].impactAt=100],
  ];
  for(const [label,mutate]of corrupt){
    const game=createGame();game.x=game.enemies[0].x;game.z=game.enemies[0].z;assert.ok(startBattle(game,game.enemies[0].id));
    game.battle.player.x=0;game.battle.enemy.x=40;assert.ok(fire(game));mutate(game);rejectBeforeStorage(game,label);
  }
});

test('failure writing imported main save keeps the original stored save and its recovery copy', () => {
  const original=serialize(createGame('crawler')),data=new Map([[SAVE_KEY,original]]);
  const storage={setItem(key,value){if(key===SAVE_KEY)throw new Error('QuotaExceededError');data.set(key,value);}};
  assert.throws(()=>storeTransferredSave(storage,createGame('airship'),original),/QuotaExceededError/);
  assert.equal(data.get(SAVE_KEY),original);assert.equal(data.get(IMPORT_BACKUP_KEY),original);
});
test('invalid, wrong-format, future and oversized transfers are rejected', () => {
  for (const raw of ['oops', '{}', JSON.stringify({format:'colossus-wake-save',transferVersion:2}), ' '.repeat(1048577)]) assert.throws(() => readTransfer(raw));
});
test('import keeps recovery copy and storage failure leaves current save untouched', () => {
  const original = serialize(createGame('crawler')), imported = createGame('airship');
  const data = new Map([[SAVE_KEY, original]]);
  const storage = {setItem(k,v) { data.set(k,v); }};
  storeTransferredSave(storage, imported, original);
  assert.equal(data.get(IMPORT_BACKUP_KEY), original);
  assert.equal(readTransfer(data.get(SAVE_KEY)).faction, 'airship');
  data.set(SAVE_KEY, original);
  assert.throws(() => storeTransferredSave({setItem(){throw new Error('QuotaExceededError');}}, imported, original));
  assert.equal(data.get(SAVE_KEY), original);
});
