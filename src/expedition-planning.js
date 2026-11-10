import {FACTIONS, BUILDINGS, GATHERING_RADIUS, distance, gatheringRate, income, stopTravel, travel} from './simulation.js';
import {verticalOrder} from './vertical-city.js';

// Times and rates use game seconds (the same clock as construction), at 1×.
export function resourceDestination(state, id) {
  const node = state.nodes.find(item => item.id === id);
  if (!node) return null;
  const metres = distance(state, node), nearby = metres < GATHERING_RADIUS;
  const travelDistance = nearby ? 0 : Math.max(0, metres - (GATHERING_RADIUS - 1));
  return {id, name: node.name, kind: node.kind, remaining: Math.max(0, node.amount),
    available: node.amount > 0, nearby, distance: metres, travelDistance,
    travelSeconds: travelDistance / FACTIONS[state.faction].speed,
    rate: gatheringRate(state, node), canOrder: state.mode === 'expedition' && node.amount > 0,
    gathering: state.gathering === id && !state.moving && !state.target && nearby && node.amount > 0,
    enRoute: !!state.target && distance(state.target, node) < GATHERING_RADIUS};
}

export function setResourceCourse(state, id) {
  const destination = resourceDestination(state, id);
  if (state.mode !== 'expedition') return {ok: false, message: 'Set a resource course between battles.'};
  if (!destination) return {ok: false, message: 'This resource destination is no longer available.'};
  if (!destination.available) return {ok: false, message: `${destination.name} is depleted. Choose another deposit.`};
  if (destination.nearby) {
    stopTravel(state);
    return {ok: true, nearby: true, message: state.paused
      ? 'Already in gathering range. Crews will work when you resume.'
      : 'Already in gathering range. Your city will stay here while crews work.'};
  }
  const node = state.nodes.find(item => item.id === id), d = destination.distance;
  const radius = GATHERING_RADIUS - 1;
  travel(state, node.x + (state.x - node.x) / d * radius, node.z + (state.z - node.z) / d * radius);
  return {ok: true, nearby: false, message: state.paused
    ? `Course plotted for ${node.name}. Resume to travel.`
    : `Course set for ${node.name}. Gathering starts on arrival.`};
}

export function foodFlow(state) {
  if (state.mode === 'battle') return {rate: 0, collection: 0, status: 'battle', explanation: 'Food production and consumption stop during battle.'};
  if (state.paused) return {rate: 0, collection: 0, status: 'paused', explanation: 'Food production, gathering and consumption are paused.'};
  const node = state.nodes.find(item => item.id === state.gathering);
  const active = node && resourceDestination(state, node.id).gathering;
  const collection = active && node.kind === 'food' ? gatheringRate(state, node) : 0;
  return {rate: income(state).food + collection, collection, status: 'active',
    explanation: `Net food per game second at 1×: gardens${collection ? ' + field gathering' : ''} − citizens. Gathering stops when the deposit is empty.`};
}

export function routeEstimate(state) {
  if (state.mode !== 'expedition' || !state.target) return null;
  const metres = distance(state, state.target);
  return {distance: metres, seconds: metres / FACTIONS[state.faction].speed, paused: state.paused};
}

export function districtOverview(state) {
  const slots = state.faction === 'kaiju' ? verticalOrder(state.buildings, state.towerOrder)
    : state.buildings.flatMap((building, slot) => building ? [slot] : []);
  return slots.map((slot, tier) => {
    const building = state.buildings[slot], pending = building.remaining > 0;
    return {slot, tier, name: BUILDINGS[building.type].name, level: building.level,
      remaining: pending ? building.remaining : 0, upgrading: pending && building.upgrading === true,
      location: state.variant === 'flesh' ? `Ward ${tier + 1}` : state.faction === 'kaiju'
        ? `Storey ${tier + 1}` : `Plot ${slot + 1}`};
  });
}

export function durationLabel(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return whole < 60 ? `${whole}s` : `${Math.floor(whole / 60)}m${whole % 60 ? ` ${whole % 60}s` : ''}`;
}

function text(element, value) { if (element.textContent !== value) element.textContent = value; }
function orderedRows(container, records, items, keyOf, create, update) {
  const wanted = new Set(items.map(keyOf));
  for (const [key, record] of records) if (!wanted.has(key)) { record.element.remove(); records.delete(key); }
  items.forEach((item, index) => {
    const key = keyOf(item);
    if (!records.has(key)) records.set(key, create(item));
    const record = records.get(key);
    if (container.children[index] !== record.element) container.insertBefore(record.element, container.children[index] ?? null);
    update(record, item);
  });
}

// Retain button/option nodes and keyboard focus while quantities and timers tick.
export function createPlanningPanels({destinations, districts, districtCount, towerSelect, onTravel, onInspect}) {
  const document = destinations.ownerDocument, resourceRows = new Map(), districtRows = new Map(), options = new Map();
  towerSelect.replaceChildren();
  const row = () => {
    const element = document.createElement('button'), name = document.createElement('strong');
    const detail = document.createElement('span'), status = document.createElement('small');
    element.type = 'button'; element.append(name, detail, status);
    return {element, name, detail, status};
  };
  return {
    update(state, selectedSlot, towerTier = 0) {
      const plans = state.nodes.map(node => resourceDestination(state, node.id));
      orderedRows(destinations, resourceRows, plans, item => item.id, item => {
        const record = row(); record.element.dataset.resourceId = item.id;
        record.element.addEventListener('click', () => onTravel(item.id));
        return record;
      }, (record, item) => {
        text(record.name, item.name);
        text(record.detail, `${Math.ceil(item.remaining)} ${item.kind} · ${Math.ceil(item.distance)} m`);
        const status = !item.available ? 'Depleted' : item.nearby
          ? `${item.gathering && !state.paused ? 'Gathering' : 'In gathering range'} · ${item.rate.toFixed(1)}/s`
          : `~${durationLabel(item.travelSeconds)} travel · ${item.rate.toFixed(1)}/s gathering`;
        text(record.status, status);
        record.element.disabled = !item.canOrder;
        record.element.classList.toggle('active', item.available && (item.enRoute || item.gathering));
        record.element.title = 'Travel estimates and gathering rates use game time at 1×. Tap to set a course or stay at a nearby deposit.';
        record.element.setAttribute('aria-label', `${item.name}, ${record.detail.textContent}, ${status}${state.paused ? ', paused' : ''}`);
      });
      const overview = districtOverview(state);
      text(districtCount, `${overview.length} / 20`);
      orderedRows(districts, districtRows, overview, item => item.slot, item => {
        const record = row(); record.element.dataset.districtSlot = String(item.slot);
        record.element.addEventListener('click', () => onInspect(item.slot));
        return record;
      }, (record, item) => {
        text(record.name, item.name); text(record.detail, `${item.location} · Level ${item.level}`);
        const status = item.remaining > 0 ? `${item.upgrading ? `Upgrading to ${item.level + 1}` : 'Building'} · ${durationLabel(item.remaining)}${state.paused ? ' · Paused' : state.mode === 'battle' ? ' · On hold' : ''}` : 'Ready to inspect';
        text(record.status, status); record.element.disabled = state.mode !== 'expedition';
        record.element.setAttribute('aria-pressed', String(item.slot === selectedSlot));
        record.element.setAttribute('aria-label', `${item.name}, ${record.detail.textContent}, ${status}`);
      });
      if (state.faction === 'kaiju') {
        orderedRows(towerSelect, options, overview, item => item.slot, () => ({element: document.createElement('option')}), (record, item) => {
          record.element.value = String(item.tier);
          text(record.element, `${item.location} · ${item.name} · Lv ${item.level}${item.remaining > 0 ? ` · ${item.upgrading ? 'Upgrading' : 'Building'} ${durationLabel(item.remaining)}` : ''}`);
        });
        if (document.activeElement !== towerSelect) towerSelect.value = String(towerTier);
      }
    }
  };
}
