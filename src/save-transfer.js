import {deserialize, serialize, SAVE_KEY, FACTIONS, BUILDINGS, WORLD_NODES} from './simulation.js';
import {CARRIER_VARIANTS} from './variants.js';

export const IMPORT_BACKUP_KEY = `${SAVE_KEY}-before-import`;
export const MAX_SAVE_BYTES = 1024 * 1024;

const own = (object, key) => Object.hasOwn(object, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const number = value => Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
const nonnegative = value => number(value) && value >= 0;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const text = (value, limit = 256) => typeof value === 'string' && value.length > 0 && value.length <= limit;
const enumKey = (value, choices) => typeof value === 'string' && own(choices, value);
const slot = value => Number.isInteger(value) && value >= 0 && value < 20;
const nodeIds = new Set(WORLD_NODES.map(node => node.id));
const invalid = () => { throw new Error('This file is not a valid Colossus Wake expedition.'); };
function requireValue(condition) { if (!condition) invalid(); }
function requireRecord(value, keys = []) {
  requireValue(record(value) && keys.every(key => own(value, key)));
  requireValue(!['__proto__', 'constructor', 'prototype'].some(key => own(value, key)));
}
function optional(object, key, check) { if (own(object, key)) requireValue(check(object[key])); }
function position(value, angle = false) {
  requireRecord(value, angle ? ['x', 'z', 'angle'] : ['x', 'z']);
  requireValue(number(value.x) && number(value.z) && Math.abs(value.x) <= 1000 && Math.abs(value.z) <= 1000);
  if (angle) requireValue(number(value.angle)); else optional(value, 'angle', number);
}
function uniqueSlots(value) { return Array.isArray(value) && value.length <= 20 && value.every(slot) && new Set(value).size === value.length; }

// External files cross a separate trust boundary. Keep local-save migrations in
// deserialize unchanged, but validate every field consumed by the UI/simulation
// before passing imported data to that historical, deliberately tolerant loader.
function validateExternal(game) {
  requireRecord(game, ['version', 'faction', 'time', 'day', 'resources', 'population', 'hp', 'x', 'z', 'angle', 'mode', 'buildings', 'nodes', 'enemies', 'log', 'stats']);
  requireValue(game.version === 1 && enumKey(game.faction, FACTIONS));
  optional(game, 'variant', value => enumKey(value, CARRIER_VARIANTS) && CARRIER_VARIANTS[value].faction === game.faction);
  position(game, true);
  requireValue(nonnegative(game.time) && integer(game.day) && game.day >= 1 && nonnegative(game.population) && nonnegative(game.hp));
  requireValue(['expedition', 'battle'].includes(game.mode));
  for (const key of ['paused', 'moving', 'starving']) optional(game, key, value => typeof value === 'boolean');
  optional(game, 'speed', value => value === 1 || value === 2);
  optional(game, 'target', value => { if (value === null) return true; position(value); return true; });
  optional(game, 'gathering', value => value === null || nodeIds.has(value));
  requireRecord(game.resources, ['wood', 'iron', 'food']);
  requireValue(Object.keys(game.resources).length === 3 && Object.values(game.resources).every(nonnegative));
  requireRecord(game.stats, ['gathered', 'built', 'victories']);
  requireValue(nonnegative(game.stats.gathered) && integer(game.stats.built) && integer(game.stats.victories));
  requireValue(Array.isArray(game.log) && game.log.length <= 25);
  for (const entry of game.log) { requireRecord(entry, ['text', 'time']); requireValue(text(entry.text, 2000) && nonnegative(entry.time)); }

  requireValue(Array.isArray(game.buildings) && game.buildings.length === 20);
  for (const building of game.buildings) {
    if (building === null) continue;
    requireRecord(building, ['type', 'level', 'remaining']);
    requireValue(enumKey(building.type, BUILDINGS) && Number.isInteger(building.level) && building.level >= 1 && building.level <= 3 && nonnegative(building.remaining));
    optional(building, 'facing', number);
    optional(building, 'upgrading', value => typeof value === 'boolean' && (!value || building.level < 3));
  }
  optional(game, 'towerOrder', uniqueSlots);
  optional(game, 'rings', value => Number.isInteger(value) && value >= 0 && value <= 2);
  optional(game, 'ringConstruction', value => {
    if (value === null) return true;
    requireRecord(value, ['remaining', 'target']);
    return game.faction === 'kaiju' && nonnegative(value.remaining) && value.remaining <= 12 && value.target === 2;
  });
  optional(game, 'worldDamage', value => {
    requireRecord(value, ['expedition', 'battle']);
    return ['expedition', 'battle'].every(key => Array.isArray(value[key]) && value[key].length <= 512 && value[key].every(id => text(id, 80)));
  });

  requireValue(Array.isArray(game.nodes) && game.nodes.length === WORLD_NODES.length);
  const seenNodes = new Set();
  for (const node of game.nodes) {
    requireRecord(node, ['id', 'name', 'kind', 'amount']); position(node);
    const canonical = WORLD_NODES.find(item => item.id === node.id);
    requireValue(canonical && !seenNodes.has(node.id) && node.kind === canonical.kind && text(node.name) && nonnegative(node.amount));
    seenNodes.add(node.id);
  }
  requireValue(Array.isArray(game.enemies) && [3, 5].includes(game.enemies.length));
  const seenEnemies = new Set();
  for (const enemy of game.enemies) {
    requireRecord(enemy, ['id', 'name', 'faction', 'defeated']); position(enemy);
    requireValue(typeof enemy.id === 'string' && /^rival[1-5]$/.test(enemy.id) && !seenEnemies.has(enemy.id)
      && text(enemy.name) && enumKey(enemy.faction, FACTIONS) && typeof enemy.defeated === 'boolean');
    optional(enemy, 'variant', value => enumKey(value, CARRIER_VARIANTS) && CARRIER_VARIANTS[value].faction === enemy.faction);
    seenEnemies.add(enemy.id);
  }
  if (game.mode !== 'battle') { requireValue(game.battle == null); return; }
  const battle = game.battle;
  requireRecord(battle, ['enemyId', 'enemyFaction', 'enemyName', 'enemyHp', 'enemyMaxHp', 'player', 'enemy', 'time', 'reload', 'enemyReload', 'abilityCooldown', 'command', 'autoFire', 'events', 'seq', 'result', 'damage']);
  const rival = game.enemies.find(enemy => enemy.id === battle.enemyId);
  requireValue(rival && enumKey(battle.enemyFaction, FACTIONS) && battle.enemyFaction === rival.faction && text(battle.enemyName));
  optional(battle, 'enemyVariant', value => enumKey(value, CARRIER_VARIANTS) && CARRIER_VARIANTS[value].faction === rival.faction && (!rival.variant || value === rival.variant));
  position(battle.player, true); position(battle.enemy, true);
  requireValue(['enemyHp', 'enemyMaxHp', 'time', 'reload', 'enemyReload', 'abilityCooldown', 'damage'].every(key => nonnegative(battle[key])));
  requireValue(battle.enemyMaxHp > 0 && integer(battle.seq) && ['approach', 'hold', 'retreat'].includes(battle.command)
    && typeof battle.autoFire === 'boolean' && [null, 'victory', 'defeat'].includes(battle.result));
  optional(battle, 'finishedAt', value => nonnegative(value) && value <= game.time);
  requireValue(Array.isArray(battle.events) && battle.events.length <= 30);
  const eventIds = new Set();
  for (const event of battle.events) {
    requireRecord(event, ['id', 'kind', 'from', 'to', 'damage', 'time']); position(event.from); position(event.to);
    requireValue(integer(event.id) && event.id > 0 && event.id <= battle.seq && !eventIds.has(event.id)
      && ['impact', 'shot', 'salvo', 'enemyShot'].includes(event.kind) && nonnegative(event.damage) && event.damage <= 10000
      && nonnegative(event.time) && event.time <= battle.time);
    eventIds.add(event.id);
    optional(event, 'impactAt', value => nonnegative(value) && value <= battle.time + .71);
    optional(event, 'source', value => ['player', 'enemy'].includes(value));
    optional(event, 'mounts', uniqueSlots);
    optional(event, 'base', value => typeof value === 'boolean');
  }
  optional(battle, 'pendingHits', value => {
    requireValue(Array.isArray(value) && value.length <= 64);
    const ids = new Set();
    for (const hit of value) {
      requireRecord(hit, ['eventId', 'source', 'damage', 'impactAt']);
      requireValue(integer(hit.eventId) && hit.eventId > 0 && hit.eventId <= battle.seq && !ids.has(hit.eventId)
        && ['player', 'enemy'].includes(hit.source) && nonnegative(hit.damage) && hit.damage <= 10000
        && nonnegative(hit.impactAt) && hit.impactAt <= battle.time + .71);
      ids.add(hit.eventId);
    }
    return true;
  });
}

function importedExpedition(data) {
  validateExternal(data);
  const game = deserialize(JSON.stringify(data));
  if (!game) invalid();
  return game;
}

export function readTransfer(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_SAVE_BYTES) {
    throw new Error('Choose a game save smaller than 1 MB.');
  }
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not a readable game save.'); }
  if (data?.format === 'colossus-wake-save') {
    if (data.transferVersion !== 1) throw new Error('This save file needs a newer game build.');
    data = data.expedition;
  }
  return importedExpedition(data);
}

export function writeTransfer(game, buildId) {
  return JSON.stringify({format: 'colossus-wake-save', transferVersion: 1, buildId,
    expedition: JSON.parse(serialize(game))}, null, 2);
}

// Write the recovery copy first. If storage is full, the current save stays intact.
export function storeTransferredSave(storage, game, currentRaw) {
  const valid = importedExpedition(game);
  if (currentRaw && deserialize(currentRaw)) storage.setItem(IMPORT_BACKUP_KEY, currentRaw);
  storage.setItem(SAVE_KEY, serialize(valid));
  return valid;
}
