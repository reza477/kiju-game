// Classify before opening contextual UI. This keeps ordinary terrain travel
// independent of city sheets without changing the existing selection priority.
export function selectionIntent(hit, {started = true, dialogOpen = false, mode, placingBuilding = false} = {}) {
  if (!started || dialogOpen || mode === 'battle' || !hit) return {kind: 'ignore', opensContext: false};
  if (hit.slot !== undefined) return {kind: 'slot', opensContext: true};
  if (hit.node) return {kind: 'node', opensContext: true};
  if (hit.enemy) return {kind: 'enemy', opensContext: true};
  if (hit.ground) return placingBuilding
    ? {kind: 'placement-hint', opensContext: true}
    : {kind: 'travel', opensContext: false};
  return {kind: 'ignore', opensContext: false};
}
