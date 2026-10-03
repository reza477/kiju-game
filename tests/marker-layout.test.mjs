import test from 'node:test';
import assert from 'node:assert/strict';
import {placeMarker, createLayoutCache, createMarkerLayoutCache} from '../src/marker-layout.js';

const rect = (left, top, right, bottom) => ({left, top, right, bottom});
const marker = (x, y, width = 150, height = 44) => ({x, y, width, height, visible: true});
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const phone = {viewport: rect(6, 6, 384, 838), occlusions: [rect(10, 10, 380, 120), rect(10, 750, 155, 830)]};
const assertClear = (placed, layout) => {
  assert.ok(placed);
  assert.ok(placed.rect.left >= layout.viewport.left && placed.rect.right <= layout.viewport.right);
  assert.ok(placed.rect.top >= layout.viewport.top && placed.rect.bottom <= layout.viewport.bottom);
  assert.ok(!layout.occlusions.some(block => overlaps(block, placed.rect)));
};

test('closed portrait panels allow useful labels across the viewport instead of a 60px anchor strip', () => {
  for (const x of [85, 160, 300]) assertClear(placeMarker(marker(x, 400), phone), phone);
  const edge = placeMarker(marker(8, 500), phone); assertClear(edge, phone); assert.equal(edge.rect.left, 6);
});
test('open panels remove only their actual footprint and never cover a control', () => {
  const open = {...phone, occlusions: [...phone.occlusions, rect(10, 240, 250, 570)]};
  assert.equal(placeMarker(marker(120, 400), open), null, 'A deeply occluded anchor cannot jump away from its object');
  assertClear(placeMarker(marker(300, 620), open), open);
  const nearHeader = placeMarker(marker(210, 128), phone); assertClear(nearHeader, phone);
  assert.ok(nearHeader.rect.top >= 126, 'Labels include clearance around HUD bounds');
});
test('orientation changes use new measured rectangles rather than fixed desktop vertical margins', () => {
  const landscape = {viewport: rect(44, 6, 800, 369), occlusions: [rect(44, 6, 800, 90), rect(50, 265, 195, 365)]};
  for (const position of [[370, 125], [550, 230], [690, 330]]) assertClear(placeMarker(marker(...position), landscape), landscape);
  const open = {...landscape, occlusions: [...landscape.occlusions, rect(530, 102, 800, 364)]};
  assert.equal(placeMarker(marker(690, 230), open), null);
  assertClear(placeMarker(marker(370, 230), open), open);
});
test('desktop respects individual HUD bounds while retaining its smaller existing label size', () => {
  const desktop = {viewport: rect(6, 6, 1434, 954), occlusions: [rect(20, 20, 1420, 90), rect(20, 108, 269, 600), rect(1188, 108, 1420, 420), rect(425, 740, 1015, 900)]};
  for (const position of [[400, 220], [700, 550], [1260, 660]]) assertClear(placeMarker(marker(...position, 138, 26), desktop), desktop);
  assert.equal(placeMarker(marker(140, 300, 138, 26), desktop), null);
});
test('offscreen/behind-camera/invalid anchors stay hidden and cannot create offscreen buttons', () => {
  for (const value of [marker(-1, 400), marker(200, -5), marker(200, 900), marker(500, 400), {...marker(200, 400), visible: false}, marker(NaN, 400), marker(200, 400, 500)]) assert.equal(placeMarker(value, phone), null);
});
test('nearby labels receive distinct non-overlapping pointer targets or are hidden', () => {
  const occupied = [];
  for (let i = 0; i < 8; i++) {
    const placed = placeMarker(marker(200, 400), phone, occupied);
    if (!placed) continue;
    assertClear(placed, phone); assert.ok(!occupied.some(other => overlaps(other, placed.rect))); occupied.push(placed.rect);
  }
  assert.ok(occupied.length >= 2 && occupied.length <= 3);
});
test('cache measures once across animation frames and only refreshes on an explicit layout invalidation', () => {
  const calls = []; const cache = createLayoutCache(args => {calls.push(args);return {version: calls.length};});
  const first = cache.read(); for (let i = 0; i < 1000; i++) assert.equal(cache.read(), first);
  assert.equal(calls.length, 1); assert.equal(calls[0].markersDirty, true);
  cache.invalidate(); const second = cache.read(); assert.equal(second.version, 2); assert.equal(calls[1].markersDirty, false);
  cache.invalidate({markers: true}); cache.invalidate(); cache.read(); assert.equal(calls[2].markersDirty, true);
  assert.equal(calls[2].previous, second);
});

function fakeDOM() {
  let measurements = 0;
  const target = () => ({listeners: new Map(), addEventListener(type, fn) {if (!this.listeners.has(type)) this.listeners.set(type, new Set());this.listeners.get(type).add(fn);}, removeEventListener(type, fn) {this.listeners.get(type)?.delete(fn);}, emit(type, event = {}) {for (const fn of this.listeners.get(type) || []) fn(event);}});
  const element = (bounds = rect(0, 0, 390, 844), styles = {}) => ({
    ...target(), bounds, styles, style: {}, children: [], isConnected: true, parentElement: null, hidden: false,
    setAttribute() {}, removeAttribute() {},
    append(child) {if (child.fragment) {for (const nested of child.children) this.append(nested);} else {child.parentElement = this;this.children.push(child);}},
    remove() {this.isConnected = false;if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);this.parentElement = null;},
    contains(child) {for (let item = child; item; item = item.parentElement) if (item === this) return true;return false;},
    getClientRects() {measurements++;return this.hidden ? [] : [this.bounds];},
    getBoundingClientRect() {measurements++;return {...this.bounds, width: this.bounds.right - this.bounds.left, height: this.bounds.bottom - this.bounds.top};},
    cloneNode() {return element({...this.bounds}, {...this.styles});},
  });
  const body = element(), root = element(); root.append(body);
  const observers = {resize: [], mutation: []};
  const observer = kind => class {
    constructor(callback) {this.callback = callback;this.observed = new Set();observers[kind].push(this);}
    observe(node) {this.observed.add(node);}
    disconnect() {this.observed.clear();}
  };
  const doc = {...target(), body, documentElement: root, fonts: target(), createElement: () => element(rect(0, 0, 0, 0)), createDocumentFragment: () => ({fragment: true, children: [], append(child) {this.children.push(child);}})};
  const win = {...target(), innerWidth: 390, innerHeight: 844, visualViewport: {...target(), offsetLeft: 0, offsetTop: 0, width: 390, height: 844}, ResizeObserver: observer('resize'), MutationObserver: observer('mutation'),
    getComputedStyle(node) {return {display: 'block', visibility: 'visible', opacity: '1', overflowX: 'visible', overflowY: 'visible', paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', ...node.styles};},
  };
  return {doc, win, element, observers, get measurements() {return measurements;}};
}

test('DOM cache uses actual visible and clipped HUD rectangles, then reads no layout during marker motion', () => {
  const fake = fakeDOM(), {doc, win, element, observers} = fake;
  const scrollPanel = element(rect(10, 220, 300, 620), {overflowY: 'auto'}); doc.body.append(scrollPanel);
  const panel = element(rect(10, 190, 300, 750)); scrollPanel.append(panel);
  const label = element(rect(0, 0, 150, 44)); doc.body.append(label);
  const cache = createMarkerLayoutCache({markers: () => [label], occluders: () => [panel], win, doc});
  const initial = cache.read(); assert.deepEqual(initial.occlusions, [rect(10, 220, 300, 620)]);
  assert.deepEqual(initial.sizes.get(label), {width: 150, height: 44});
  const measured = fake.measurements;
  for (let i = 0; i < 100; i++) {
    observers.mutation[0].callback([{target: label, attributeName: 'style'}]);
    assert.equal(cache.read(), initial);
  }
  assert.equal(fake.measurements, measured, 'Per-marker position/display writes do not trigger measurement');
  panel.hidden = true;
  observers.mutation[0].callback([{target: doc.body, attributeName: 'data-mobile-panel'}]);
  assert.deepEqual(cache.read().occlusions, [], 'Closed panel reserves no rectangle');
  panel.hidden = false;
  observers.resize[0].callback([]); assert.equal(cache.read().occlusions.length, 1);
  cache.dispose(); assert.equal(observers.resize[0].observed.size, 0);assert.equal(observers.mutation[0].observed.size, 0);
});

test('DOM cache invalidates marker sizes and usable visual viewport on orientation and browser viewport changes', () => {
  const fake = fakeDOM(), {doc, win, element} = fake, label = element(rect(0, 0, 150, 44));doc.body.append(label);
  const cache = createMarkerLayoutCache({markers: () => [label], occluders: () => [], win, doc});
  assert.deepEqual(cache.read().viewport, rect(6, 6, 384, 838));
  win.innerWidth = 844;win.innerHeight = 390;Object.assign(win.visualViewport, {width: 844, height: 390});
  label.bounds = rect(0, 0, 170, 44);win.emit('orientationchange');
  assert.deepEqual(cache.read().viewport, rect(6, 6, 838, 384));assert.equal(cache.read().sizes.get(label).width, 170);
  Object.assign(win.visualViewport, {offsetLeft: 40, offsetTop: 20, width: 500, height: 300});win.visualViewport.emit('resize');
  assert.deepEqual(cache.read().viewport, rect(46, 26, 534, 314));
  cache.dispose();
});
