const finite = value => Number.isFinite(value);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const expand = (rect, gap) => ({left: rect.left - gap, right: rect.right + gap, top: rect.top - gap, bottom: rect.bottom + gap});
const plainRect = rect => ({left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom});

// Geometry-only: projection and placement can run every animation frame without
// querying the DOM. A label may move a short distance around nearby HUD edges;
// fully offscreen anchors and labels without an unobstructed position are hidden.
export function placeMarker(marker, layout, occupied = [], {gap = 6, maxShift = 80} = {}) {
  const {x, y, width, height, visible = true} = marker, viewport = layout.viewport;
  if (!visible || ![x, y, width, height].every(finite) || width <= 0 || height <= 0
      || x < viewport.left || x > viewport.right || y < viewport.top || y > viewport.bottom
      || width > viewport.right - viewport.left || height > viewport.bottom - viewport.top) return null;
  const halfW = width / 2, halfH = height / 2;
  const minX = viewport.left + halfW, maxX = viewport.right - halfW;
  const minY = viewport.top + halfH, maxY = viewport.bottom - halfH;
  const baseX = clamp(x, minX, maxX), baseY = clamp(y, minY, maxY);
  const obstacles = [...layout.occlusions, ...occupied].map(rect => expand(rect, gap));
  const xs = new Set([baseX]), ys = new Set([baseY]);
  for (const rect of obstacles) {
    if (rect.right < x - maxShift - halfW || rect.left > x + maxShift + halfW
        || rect.bottom < y - maxShift - halfH || rect.top > y + maxShift + halfH) continue;
    xs.add(clamp(rect.left - halfW, minX, maxX)); xs.add(clamp(rect.right + halfW, minX, maxX));
    ys.add(clamp(rect.top - halfH, minY, maxY)); ys.add(clamp(rect.bottom + halfH, minY, maxY));
  }
  let best = null, bestDistance = Infinity;
  for (const leftCenter of xs) for (const topCenter of ys) {
    const distance = (leftCenter - x) ** 2 + (topCenter - y) ** 2;
    if (distance > maxShift ** 2 || distance >= bestDistance) continue;
    const rect = {left: leftCenter - halfW, top: topCenter - halfH, right: leftCenter + halfW, bottom: topCenter + halfH};
    if (obstacles.some(obstacle => overlaps(rect, obstacle))) continue;
    best = {x: leftCenter, y: topCenter, rect}; bestDistance = distance;
  }
  return best;
}

// Injectable measurement keeps caching and invalidation independently testable.
// Marker positioning never dirties this cache: only changes in HUD/viewport or
// the marker set/style require another measurement.
export function createLayoutCache(measure) {
  let dirty = true, markersDirty = true, value;
  return {
    invalidate({markers = false} = {}) { dirty = true; markersDirty ||= markers; },
    read() {
      if (dirty) { value = measure({markersDirty, previous: value}); dirty = false; markersDirty = false; }
      return value;
    },
  };
}

export function createMarkerLayoutCache({markers, occluders, win = window, doc = document, edgeGap = 6} = {}) {
  const markerList = markers || (() => doc.querySelectorAll('.map-marker'));
  const occluderList = occluders || (() => doc.querySelectorAll('[data-marker-occlusion]'));
  const safeAreaProbe = doc.createElement('div');
  safeAreaProbe.setAttribute('aria-hidden', 'true');
  safeAreaProbe.style.cssText = 'position:fixed;pointer-events:none;visibility:hidden;width:0;height:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
  doc.body.append(safeAreaProbe);
  let observed = [], sizes = new Map(), disposed = false;
  const listeners = [];
  const listen = (target, event, handler, options) => {
    if (!target?.addEventListener) return;
    target.addEventListener(event, handler, options); listeners.push(() => target.removeEventListener(event, handler, options));
  };
  const rects = elements => {
    const styles = new Map(), boxes = new Map();
    const styleOf = element => {if (!styles.has(element)) styles.set(element, win.getComputedStyle(element));return styles.get(element);};
    const boxOf = element => {if (!boxes.has(element)) boxes.set(element, element.getBoundingClientRect());return boxes.get(element);};
    return elements.flatMap(element => {
      // Hidden ancestors make getClientRects empty. Scrollable panel children
      // can still have full boxes outside the visible panel, so clip those too.
      if (!element.isConnected || !element.getClientRects().length) return [];
      const style = styleOf(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) return [];
      const rect = plainRect(boxOf(element));
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const parentStyle = styleOf(parent);
        if (Number(parentStyle.opacity) === 0) return [];
        const clipsX = /^(auto|scroll|hidden|clip)$/.test(parentStyle.overflowX);
        const clipsY = /^(auto|scroll|hidden|clip)$/.test(parentStyle.overflowY);
        if (clipsX || clipsY) {
          const parentRect = boxOf(parent);
          if (clipsX) {rect.left = Math.max(rect.left, parentRect.left);rect.right = Math.min(rect.right, parentRect.right);}
          if (clipsY) {rect.top = Math.max(rect.top, parentRect.top);rect.bottom = Math.min(rect.bottom, parentRect.bottom);}
        }
      }
      return rect.right > rect.left && rect.bottom > rect.top ? [rect] : [];
    });
  };
  const resizeObserver = win.ResizeObserver ? new win.ResizeObserver(() => cache.invalidate()) : null;
  const cache = createLayoutCache(({markersDirty}) => {
    const next = [...occluderList()];
    if (next.length !== observed.length || next.some((element, i) => element !== observed[i])) {
      resizeObserver?.disconnect(); observed = next;
      for (const element of observed) resizeObserver?.observe(element);
    }
    const visual = win.visualViewport, safe = win.getComputedStyle(safeAreaProbe);
    const inset = side => Math.max(edgeGap, Number.parseFloat(safe[`padding${side}`]) || 0);
    const viewport = {
      left: (visual?.offsetLeft || 0) + inset('Left'), top: (visual?.offsetTop || 0) + inset('Top'),
      right: Math.min(win.innerWidth, (visual?.offsetLeft || 0) + (visual?.width || win.innerWidth)) - inset('Right'),
      bottom: Math.min(win.innerHeight, (visual?.offsetTop || 0) + (visual?.height || win.innerHeight)) - inset('Bottom'),
    };
    if (markersDirty) {
      // Batch all temporary writes, then all size reads, then cleanup. Clones
      // let display:none markers retain exact CSS sizes without a visible flash.
      // Keep marker sizing on .map-marker (not an ID-dependent ancestor rule).
      const pairs = [...markerList()].map(element => {
        const clone = element.cloneNode(true); clone.removeAttribute('id'); clone.tabIndex = -1;
        clone.setAttribute('aria-hidden', 'true');
        Object.assign(clone.style, {position: 'fixed', left: '-10000px', top: '-10000px', display: 'block', visibility: 'hidden', pointerEvents: 'none'});
        return [element, clone];
      });
      const fragment = doc.createDocumentFragment(); for (const [, clone] of pairs) fragment.append(clone); doc.body.append(fragment);
      sizes = new Map(pairs.map(([element, clone]) => {const rect = clone.getBoundingClientRect();return [element, {width: rect.width, height: rect.height}];}));
      for (const [, clone] of pairs) clone.remove();
    }
    return {viewport, occlusions: rects(observed), sizes};
  });
  const invalidate = () => cache.invalidate();
  const invalidateSizes = () => cache.invalidate({markers: true});
  listen(win, 'resize', invalidateSizes); listen(win, 'orientationchange', invalidateSizes);
  listen(win.visualViewport, 'resize', invalidateSizes); listen(win.visualViewport, 'scroll', invalidate);
  listen(doc, 'scroll', invalidate, true);
  listen(doc, 'transitionend', event => {if (observed.some(element => element === event.target || element.contains(event.target))) invalidate();}, true);
  listen(doc.fonts, 'loadingdone', invalidateSizes);
  const mutationObserver = win.MutationObserver ? new win.MutationObserver(records => {
    for (const record of records) {
      const target = record.target;
      if (sizes.has(target)) continue; // Per-frame marker position/display writes are not layout changes.
      if (target === doc.body || target === doc.documentElement || record.attributeName === 'open'
          || observed.some(element => target === element || target.contains(element))) { invalidate(); return; }
    }
  }) : null;
  mutationObserver?.observe(doc.body, {subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'data-mobile-panel']});
  return {
    read: () => cache.read(),
    invalidate: options => cache.invalidate(options),
    dispose() {
      if (disposed) return; disposed = true;
      resizeObserver?.disconnect(); mutationObserver?.disconnect(); for (const remove of listeners) remove(); safeAreaProbe.remove();
    },
  };
}
