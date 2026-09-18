export const GRAPHICS_QUALITY_KEY = 'colossus-quality-v1';
export const isGraphicsQuality = value => ['high', 'balanced', 'performance'].includes(value);

export function initialGraphicsQuality(preference, coarsePointer) {
  return isGraphicsQuality(preference) ? preference : coarsePointer ? 'performance' : 'high';
}

// One contact sequence stays ineligible for picking after a pinch or a cancel,
// even when one finger remains. Positions are rebased when the contact set changes.
export class CameraGesture {
  constructor() { this.points = new Map(); }

  down(id, x, y) {
    if (this.points.has(id)) return;
    this.points.set(id, { x, y, startX: x, startY: y, moved: false, blocked: false });
    if (this.points.size > 1) for (const point of this.points.values()) point.blocked = true;
  }

  move(id, x, y) {
    const point = this.points.get(id);
    if (!point) return null;
    const pair = [...this.points.values()].slice(0, 2);
    const before = pair.length === 2 ? Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) : 0;
    const dx = x - point.x, dy = y - point.y;
    point.x = x; point.y = y;
    if (pair.length === 2) {
      if (!pair.includes(point)) return null;
      const after = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
      // Ignore collapsed/crossing contacts instead of producing infinite zoom.
      return before >= 4 && after >= 4 && before !== after ? { kind: 'zoom', scale: before / after } : null;
    }
    point.moved ||= Math.hypot(x - point.startX, y - point.startY) > 6;
    return point.moved && (dx || dy) ? { kind: 'orbit', dx, dy } : null;
  }

  up(id, x, y, cancelled = false) {
    const point = this.points.get(id);
    if (!point) return null;
    const pick = !cancelled && !point.blocked && !point.moved
      && Math.hypot(x - point.startX, y - point.startY) <= 6 ? { x, y } : null;
    this.points.delete(id);
    for (const remaining of this.points.values()) {
      remaining.blocked = true; remaining.moved = true;
      remaining.startX = remaining.x; remaining.startY = remaining.y;
    }
    return pick;
  }

  cancel(id) { this.up(id, 0, 0, true); }
  reset() { const ids = [...this.points.keys()]; this.points.clear(); return ids; }
}
