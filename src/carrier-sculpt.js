// A bounded derived sculpt for the imported flesh mesh. No source GLB, rig,
// topology, UV or skin data is rewritten. Lighting-normal finishing is separate.
const PAW_ROOTS = Object.freeze(['Bone_033', 'Bone_038', 'Bone_026', 'Bone_020']);
const component = (attribute, index, axis) => attribute.getComponent(index, axis);

export function fleshContactBoneIndices(bones) {
  const protectedBones = new Set(), byName = new Map(bones.map(bone => [bone.name, bone]));
  for (const name of PAW_ROOTS) {
    const root = byName.get(name);
    if (!root) throw new Error('Flesh sculpt requires the inspected paw joint ' + name);
    const visit = bone => { if (bone.isBone) protectedBones.add(bone); for (const child of bone.children || []) visit(child); };
    visit(root);
  }
  return bones.flatMap((bone, index) => protectedBones.has(bone) ? [index] : []);
}

export function sculptFleshGeometry(source, {
  iterations = 3, lambda = .5, mu = -.53, maxDisplacementRatio = .012,
  protectedBoneIndices = [], protectedWeight = .05, soleFraction = .035,
  maxVolumeProxyChange = .005,
} = {}) {
  const position = source?.attributes?.position, skinIndex = source?.attributes?.skinIndex, skinWeight = source?.attributes?.skinWeight;
  if (!position || position.itemSize !== 3 || position.count < 3) throw new Error('Flesh sculpt requires triangle positions');
  if (Object.keys(source.morphAttributes || {}).length) throw new Error('Flesh sculpt does not support morph targets');
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 3 || !(lambda > 0 && lambda <= .6) || !(mu < -lambda && mu >= -.65)) throw new Error('Flesh sculpt requires 1–3 bounded Taubin passes');
  if (!(maxDisplacementRatio > 0 && maxDisplacementRatio <= .02) || !(soleFraction >= 0 && soleFraction <= .15) || !(protectedWeight > 0 && protectedWeight <= 1) || !(maxVolumeProxyChange > 0 && maxVolumeProxyChange <= .02)) throw new Error('Flesh sculpt limits are outside their safe bounds');
  if (!!skinIndex !== !!skinWeight || skinWeight && (skinIndex.count !== position.count || skinWeight.count !== position.count || !protectedBoneIndices.length)) throw new Error('Skinned flesh sculpt requires explicit protected paw bones');
  const count = position.count, original = new Float64Array(count * 3), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) for (let axis = 0; axis < 3; axis++) {
    const value = component(position, i, axis); if (!Number.isFinite(value)) throw new Error('Flesh sculpt found a non-finite position');
    original[i * 3 + axis] = value; min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
  }
  const height = max[1] - min[1], extent = Math.max(...max.map((value, axis) => value - min[axis]));
  if (!(extent > 0)) throw new Error('Flesh sculpt requires a nonzero body extent');
  const limit = (height || extent) * maxDisplacementRatio, epsilon = Math.max(1e-9, extent * 1e-7), protectedBones = new Set(protectedBoneIndices);
  const groups = [], byIdentity = new Map(), byPoint = new Map(), vertexGroup = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const coordinates = [...original.subarray(i * 3, i * 3 + 3)], pointKey = coordinates.map(value => value.toFixed(6)).join('/'), influences = [];
    let pawWeight = 0;
    if (skinWeight) for (let axis = 0; axis < skinWeight.itemSize; axis++) {
      const weight = component(skinWeight, i, axis), bone = component(skinIndex, i, axis);
      if (weight > 1e-6) influences.push([bone, weight.toFixed(5)]);
      if (protectedBones.has(bone)) pawWeight += weight;
    }
    influences.sort((a, b) => a[0] - b[0]);
    const identity = pointKey + '/' + JSON.stringify(influences);
    let group = byIdentity.get(identity);
    if (!group) {
      group = {id:groups.length, point:coordinates, vertices:[], neighbors:new Set(), locked:false, reasons:new Set()};
      groups.push(group); byIdentity.set(identity, group);
      if (!byPoint.has(pointKey)) byPoint.set(pointKey, []); byPoint.get(pointKey).push(group);
    }
    group.vertices.push(i); vertexGroup[i] = group.id;
    if (coordinates.some((value, axis) => value <= min[axis] + epsilon || value >= max[axis] - epsilon)) group.reasons.add('extrema');
    if (coordinates[1] <= min[1] + height * soleFraction + epsilon) group.reasons.add('sole-band');
    if (pawWeight >= protectedWeight) group.reasons.add('paw-skin');
  }
  // Coincident points with different skinning cannot be joined safely. Leaving
  // both fixed also avoids introducing a new rest-pose crack at that seam.
  let conflictingSkinPoints = 0;
  for (const samePoint of byPoint.values()) if (samePoint.length > 1) { conflictingSkinPoints++; for (const group of samePoint) group.reasons.add('conflicting-skin'); }
  const triangleCount = (source.index?.count ?? count) / 3;
  if (!Number.isInteger(triangleCount)) throw new Error('Flesh sculpt requires complete triangles');
  const indices = new Uint32Array(triangleCount * 3), edges = new Map();
  for (let i = 0; i < indices.length; i++) { const index = source.index ? source.index.getX(i) : i; if (!Number.isInteger(index) || index < 0 || index >= count) throw new Error('Flesh sculpt found an invalid triangle index'); indices[i] = index; }
  for (let i = 0; i < indices.length; i += 3) for (let side = 0; side < 3; side++) {
    const a = vertexGroup[indices[i + side]], b = vertexGroup[indices[i + (side + 1) % 3]]; if (a === b) continue;
    groups[a].neighbors.add(b); groups[b].neighbors.add(a);
    const key = a < b ? `${a}/${b}` : `${b}/${a}`;
    if (edges.has(key)) edges.get(key).count++; else edges.set(key, {a,b,count:1});
  }
  let boundaryEdges = 0, nonManifoldEdges = 0;
  for (const edge of edges.values()) if (edge.count !== 2) {
    const reason = edge.count === 1 ? 'open-boundary' : 'non-manifold'; if (edge.count === 1) boundaryEdges++; else nonManifoldEdges++;
    groups[edge.a].reasons.add(reason); groups[edge.b].reasons.add(reason);
  }
  for (const group of groups) { if (group.neighbors.size < 3) group.reasons.add('low-valence'); group.locked = group.reasons.size > 0; group.neighbors = [...group.neighbors]; }
  const initial = new Float64Array(groups.length * 3); for (const group of groups) initial.set(group.point, group.id * 3);
  let current = initial.slice();
  const pass = strength => {
    const next = current.slice();
    for (const group of groups) {
      if (group.locked) continue;
      const at = group.id * 3;
      for (let axis = 0; axis < 3; axis++) {
        let sum = 0; for (const neighbor of group.neighbors) sum += current[neighbor * 3 + axis];
        next[at + axis] = Math.max(min[axis], Math.min(max[axis], current[at + axis] + strength * (sum / group.neighbors.length - current[at + axis])));
      }
      const dx = next[at] - initial[at], dy = next[at + 1] - initial[at + 1], dz = next[at + 2] - initial[at + 2], displacement = Math.hypot(dx,dy,dz);
      if (displacement > limit) { const scale = limit / displacement; next[at] = initial[at] + dx * scale; next[at + 1] = initial[at + 1] + dy * scale; next[at + 2] = initial[at + 2] + dz * scale; }
    }
    current = next;
  };
  for (let i = 0; i < iterations; i++) { pass(lambda); pass(mu); }
  const candidate = strength => {
    const values = new Float32Array(original.length);
    for (let i = 0; i < count; i++) for (let axis = 0; axis < 3; axis++) {
      const group = vertexGroup[i] * 3, delta = strength * (current[group + axis] - initial[group + axis]);
      // Copy locked coordinates directly, preserving even IEEE signed zero.
      values[i * 3 + axis] = delta === 0 ? original[i * 3 + axis] : Math.max(min[axis], Math.min(max[axis], original[i * 3 + axis] + delta));
    }
    return values;
  };
  const metrics = values => {
    let signedVolume = 0, flippedTriangles = 0, collapsedTriangles = 0; const unsafeGroups = new Set();
    for (let i = 0; i < indices.length; i += 3) {
      const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
      const cross = array => { const ux=array[b]-array[a],uy=array[b+1]-array[a+1],uz=array[b+2]-array[a+2],vx=array[c]-array[a],vy=array[c+1]-array[a+1],vz=array[c+2]-array[a+2]; return [uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx]; };
      const old=cross(original),next=cross(values),oldArea=Math.hypot(...old),newArea=Math.hypot(...next);
      const flipped = oldArea > 1e-12 && old[0]*next[0]+old[1]*next[1]+old[2]*next[2] <= 0, collapsed = oldArea > 1e-12 && newArea < oldArea * .1;
      if (flipped) flippedTriangles++; if (collapsed) collapsedTriangles++;
      if (flipped || collapsed) for (let corner=0;corner<3;corner++) unsafeGroups.add(vertexGroup[indices[i+corner]]);
      signedVolume += values[a]*(values[b+1]*values[c+2]-values[b+2]*values[c+1])+values[a+1]*(values[b+2]*values[c]-values[b]*values[c+2])+values[a+2]*(values[b]*values[c+1]-values[b+1]*values[c]);
    }
    return {signedVolume:signedVolume/6,flippedTriangles,collapsedTriangles,unsafeGroups};
  };
  const before = metrics(original), rejectedGroups = new Set(), watertight = boundaryEdges===0&&nonManifoldEdges===0; let strength = 1, values = candidate(strength), after = metrics(values);
  // A few source sliver triangles are nearly degenerate already. Freeze the
  // vertices of unsafe faces locally rather than weakening the entire body.
  for (let attempt=0;attempt<10&&after.unsafeGroups.size;attempt++) {
    for (const id of after.unsafeGroups) { rejectedGroups.add(id); current.set(initial.subarray(id*3,id*3+3),id*3); }
    values=candidate(strength); after=metrics(values);
  }
  // Signed volume is only a proxy on the actual open/non-manifold source. Do
  // not impose enclosed-volume correction where no enclosed volume exists.
  const acceptable = result => !result.flippedTriangles && !result.collapsedTriangles && (!watertight || Math.abs(before.signedVolume) < 1e-10 || Math.abs(result.signedVolume / before.signedVolume - 1) <= maxVolumeProxyChange);
  for (let attempt = 0; attempt < 10 && !acceptable(after); attempt++) { strength *= .5; values = candidate(strength); after = metrics(values); }
  if (!acceptable(after)) { strength = 0; values = candidate(0); after = metrics(values); }
  const geometry = source.clone(), derivedPosition = geometry.attributes.position;
  let movedVertices = 0, maxDisplacement = 0, sumDisplacement = 0;
  for (let i = 0; i < count; i++) {
    derivedPosition.setXYZ(i,values[i*3],values[i*3+1],values[i*3+2]);
    const delta = Math.hypot(values[i*3]-original[i*3],values[i*3+1]-original[i*3+1],values[i*3+2]-original[i*3+2]);
    if (delta > 1e-9) movedVertices++; maxDisplacement = Math.max(maxDisplacement,delta); sumDisplacement += delta;
  }
  derivedPosition.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const reasons = {}; for (const group of groups) for (const reason of group.reasons) reasons[reason] = (reasons[reason] || 0) + group.vertices.length;
  const stats = {algorithm:'seam-aware bounded Taubin',iterations,lambda,mu,sourceVertices:count,triangles:triangleCount,logicalVertices:groups.length,boundaryEdges,nonManifoldEdges,conflictingSkinPoints,lockedVertices:groups.filter(group=>group.locked).reduce((sum,group)=>sum+group.vertices.length,0),lockReasons:reasons,safetyRejectedGroups:rejectedGroups.size,safetyRejectedVertices:[...rejectedGroups].reduce((sum,id)=>sum+groups[id].vertices.length,0),movedVertices,displacementLimit:limit,maxDisplacement,meanDisplacement:sumDisplacement/count,appliedStrength:strength,originalBounds:{min,max},derivedBounds:{min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()},signedVolumeProxyBefore:before.signedVolume,signedVolumeProxyAfter:after.signedVolume,signedVolumeProxyRelativeChange:Math.abs(before.signedVolume)>1e-10?after.signedVolume/before.signedVolume-1:null,watertight,flippedTriangles:after.flippedTriangles,collapsedTriangles:after.collapsedTriangles};
  geometry.userData = {...geometry.userData, fleshSculpt:stats};
  return {geometry,stats};
}
