import * as T from '../vendor/three.module.js';

// World positions of skinned vertices on the CPU, value for value what
// `mesh.getVertexPosition(id, v).applyMatrix4(mesh.matrixWorld)` returns.
// SkinnedMesh multiplies each influencing bone's world matrix by its inverse
// bind matrix again for every vertex. A paw's ground samples are about
// 11,000 vertices a frame, so those products are formed once per batch here
// and the same arithmetic then runs on flat arrays, in the same order.
// Call sync() after the bones last moved and before sampling.
export function createSkinSampler(mesh) {
  const skeleton = mesh.skeleton, bones = skeleton.bones.length, table = new Float64Array(bones * 16), product = new T.Matrix4();
  let positions, weights, indices, bind, inverse, world;
  function sync() {
    const geometry = mesh.geometry, position = geometry.attributes.position, skinWeight = geometry.attributes.skinWeight, skinIndex = geometry.attributes.skinIndex;
    for (const [attribute, size] of [[position, 3], [skinWeight, 4], [skinIndex, 4]]) {
      if (!attribute?.isBufferAttribute || attribute.isInterleavedBufferAttribute || attribute.normalized || attribute.itemSize !== size) throw new Error('Unsupported skinned vertex layout');
    }
    if (geometry.morphAttributes.position && mesh.morphTargetInfluences) throw new Error('Skin sampling does not cover morph targets');
    positions = position.array; weights = skinWeight.array; indices = skinIndex.array;
    for (let bone = 0; bone < bones; bone++) table.set(product.multiplyMatrices(skeleton.bones[bone].matrixWorld, skeleton.boneInverses[bone]).elements, bone * 16);
    bind = mesh.bindMatrix.elements; inverse = mesh.bindMatrixInverse.elements; world = mesh.matrixWorld.elements;
  }
  function worldPosition(id, target) {
    const x = positions[id * 3], y = positions[id * 3 + 1], z = positions[id * 3 + 2];
    // Vector4(x, y, z, 1).applyMatrix4(bindMatrix)
    const bx = bind[0] * x + bind[4] * y + bind[8] * z + bind[12], by = bind[1] * x + bind[5] * y + bind[9] * z + bind[13];
    const bz = bind[2] * x + bind[6] * y + bind[10] * z + bind[14], bw = bind[3] * x + bind[7] * y + bind[11] * z + bind[15];
    let tx = 0, ty = 0, tz = 0;
    for (let lane = 0; lane < 4; lane++) {
      const weight = weights[id * 4 + lane];
      if (weight !== 0) {
        const m = indices[id * 4 + lane] * 16;
        tx += (table[m] * bx + table[m + 4] * by + table[m + 8] * bz + table[m + 12] * bw) * weight;
        ty += (table[m + 1] * bx + table[m + 5] * by + table[m + 9] * bz + table[m + 13] * bw) * weight;
        tz += (table[m + 2] * bx + table[m + 6] * by + table[m + 10] * bz + table[m + 14] * bw) * weight;
      }
    }
    // Vector3.applyMatrix4(bindMatrixInverse), then .applyMatrix4(matrixWorld)
    let w = 1 / (inverse[3] * tx + inverse[7] * ty + inverse[11] * tz + inverse[15]);
    const lx = (inverse[0] * tx + inverse[4] * ty + inverse[8] * tz + inverse[12]) * w;
    const ly = (inverse[1] * tx + inverse[5] * ty + inverse[9] * tz + inverse[13]) * w;
    const lz = (inverse[2] * tx + inverse[6] * ty + inverse[10] * tz + inverse[14]) * w;
    w = 1 / (world[3] * lx + world[7] * ly + world[11] * lz + world[15]);
    target.x = (world[0] * lx + world[4] * ly + world[8] * lz + world[12]) * w;
    target.y = (world[1] * lx + world[5] * ly + world[9] * lz + world[13]) * w;
    target.z = (world[2] * lx + world[6] * ly + world[10] * lz + world[14]) * w;
    return target;
  }
  return {sync, worldPosition};
}
