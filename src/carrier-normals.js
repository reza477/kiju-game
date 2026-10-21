// Imported UV seams split a single organic surface into many vertices. Average
// their lighting normals without welding topology, UVs, or skinning weights.
// Coincident surfaces driven by different bones remain separate.
export function softenCarrierNormals(geometry, creaseAngle = 100) {
  const {position, normal, skinIndex, skinWeight} = geometry.attributes;
  if (!position || !normal || position.count !== normal.count) return 0;
  const groups = new Map(), cutoff = Math.cos(creaseAngle * Math.PI / 180);
  for (let i = 0; i < position.count; i++) {
    const skin = [];
    if (skinIndex && skinWeight) for (let c = 0; c < skinWeight.itemSize; c++) {
      const weight = skinWeight.getComponent(i, c);
      if (weight > 1e-6) skin.push([skinIndex.getComponent(i, c), weight.toFixed(5)]);
    }
    skin.sort((a, b) => a[0] - b[0]);
    const key = [position.getX(i).toFixed(5), position.getY(i).toFixed(5), position.getZ(i).toFixed(5), JSON.stringify(skin)].join('/');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  const softened = normal.clone();
  let changed = 0;
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    for (const i of ids) {
      const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i);
      let x = 0, y = 0, z = 0;
      const seen = new Set();
      for (const j of ids) {
        const jx = normal.getX(j), jy = normal.getY(j), jz = normal.getZ(j);
        if (nx * jx + ny * jy + nz * jz < cutoff) continue;
        const key = [jx, jy, jz].map(v => v.toFixed(5)).join('/');
        if (seen.has(key)) continue;
        seen.add(key); x += jx; y += jy; z += jz;
      }
      const length = Math.hypot(x, y, z);
      if (length < 1e-8) continue;
      x /= length; y /= length; z /= length;
      if (Math.abs(x - nx) + Math.abs(y - ny) + Math.abs(z - nz) > 1e-5) changed++;
      softened.setXYZ(i, x, y, z);
    }
  }
  geometry.setAttribute('normal', softened);
  return changed;
}
