import * as T from '../vendor/three.module.js';

// A skinned or explicitly deforming surface moves within its mesh object. Store the hit triangle's
// barycentric coordinates so an existing impact follows that same surface.
// This is presentation only: it neither schedules nor applies damage.
export function captureImpactAnchor(hit) {
  const object = hit.object, local = object.worldToLocal(hit.point.clone());
  const anchor = {object, local, point: hit.point.clone()};
  if ((object.isSkinnedMesh || object.userData.deformingImpactSurface) && hit.face) {
    const indices = [hit.face.a, hit.face.b, hit.face.c];
    const vertices = indices.map(index => object.getVertexPosition(index, new T.Vector3()));
    const weights = T.Triangle.getBarycoord(local, ...vertices, new T.Vector3());
    if (weights && weights.toArray().every(Number.isFinite)) anchor.surface = {indices, weights};
  }
  return anchor;
}

const vertex = new T.Vector3();
export function resolveImpactAnchor(anchor, target = new T.Vector3()) {
  const {object, local, surface} = anchor;
  if (surface) {
    target.set(0, 0, 0);
    for (let index = 0; index < 3; index++) {
      object.getVertexPosition(surface.indices[index], vertex);
      target.addScaledVector(vertex, surface.weights.getComponent(index));
    }
  } else target.copy(local);
  return object.localToWorld(target);
}
