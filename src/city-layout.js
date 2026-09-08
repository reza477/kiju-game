// Shared simulation/rendering layout. Slot IDs stay stable for existing saves.
// Building local +Z points away from the circular city's centre.
export const KAIJU_SCALE = .55;
export const KAIJU_DECK_Y = 34;
export const KAIJU_CENTER = Object.freeze({ x: 0, z: -14.25 });
export const KAIJU_RING_RADII = Object.freeze([3, 6.8, 10.65]);
export const RING_SLOTS = Object.freeze([
  Object.freeze([7]),
  Object.freeze([11, 13, 0, 1, 2, 3]),
  Object.freeze([4, 5, 6, 8, 9, 10, 12, 14, 15, 16, 17, 18, 19]),
]);

const positions = new Map();
positions.set(7, Object.freeze({ x: KAIJU_CENTER.x, y: 0, z: KAIJU_CENTER.z, rotation: Math.PI, ring: 0, sector: 0 }));
for (const ring of [1, 2]) {
  const slots = RING_SLOTS[ring], radius = ring === 1 ? 4.6 : 8.6;
  slots.forEach((id, index) => {
    const rotation = Math.PI + index / slots.length * Math.PI * 2;
    positions.set(id, Object.freeze({
      x: Math.sin(rotation) * radius,
      y: 0,
      z: KAIJU_CENTER.z + Math.cos(rotation) * radius,
      rotation,
      ring,
      sector: index + 1,
    }));
  });
}

export function kaijuSlotPosition(i) {
  const position = positions.get(i);
  if (!position) throw new RangeError(`Unknown kaiju plot: ${i}`);
  return { ...position };
}

export function kaijuRingRadius(rings = 1) {
  return KAIJU_RING_RADII[Math.max(0, Math.min(2, Math.floor(rings)))];
}
