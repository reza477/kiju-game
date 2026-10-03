import * as T from '../vendor/three.module.js';

/**
 * Sculpted volumes and grouped blades use physical geometry for their silhouette.
 * No alpha cards, cutout textures, mip-coverage correction or texture cache remain.
 * Geometry colour stores subtle painted planes; instance colour supplies species
 * and ecological variation. Each caller owns its material, including wind clones.
 */
export function createVegetationMaterial(kind) {
  if (!['broadleaf', 'pine', 'grass'].includes(kind)) throw new RangeError(`Unknown vegetation kind: ${kind}`);
  const material = new T.MeshStandardMaterial({
    name: `Painterly ${kind} volume`, color: 0xffffff,
    vertexColors: true, side: kind === 'grass' ? T.DoubleSide : T.FrontSide,
    roughness: .97, metalness: 0, transparent: false, depthWrite: true
  });
  // Actual crown normals carry volume lighting. Only two-sided narrow blades
  // need a stable upward response rather than alternating black backfaces.
  material.userData.rootedBladeNormals = kind === 'grass';
  material.userData.vegetationKind = kind;
  return material;
}
