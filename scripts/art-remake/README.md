# Authored flesh body

These offline tools build a new anatomical body around the existing 54-joint
Meshy rig. The ribcage, shoulders, haunches, limbs, tail, skull, brows, muzzle,
ears, cranial crest and horns are smooth unions of authored shapes. The eyes and nostrils are
separate forms in the same primitive. Broad vertex paint supplies the colour.
This is a local derivative, not a new Meshy generation or an atlas projection.

The original GLB is read only. All 85,568 original positions, UVs, joint indices
and weights remain an unchanged contact pool in the result. Only 261 of these
vertices are drawn, as 506 new convex paw-hull triangles. Their positions and
weights are exact; their normals are recomputed for the clean hull surfaces.
The new body adds 80,578 vertices. The original rig, hierarchy and inverse bind
matrices remain unchanged. The packed output contains one skinned primitive.

## Rebuild

Run from the repository root with Node and Python 3.12.14. Choose fresh output
and dependency directories; the generators reject existing output files. The
tools accept explicit repository, input, inventory, output and dependency paths
and do not depend on the old experiment directory. Dependencies stay outside
the game's package manifest and do not become runtime requirements.

```powershell
$repoPath = (Get-Location).Path
$outputDir = Join-Path $repoPath 'artifacts/flesh-body-rebuild'
$depsDir = Join-Path $repoPath 'artifacts/flesh-body-deps'
$sourceGlb = Join-Path $repoPath 'assets/carriers/meshy/flesh.glb'

python -m pip install --target $depsDir -r scripts/art-remake/requirements.txt
node scripts/art-remake/inventory-carrier.mjs --repo $repoPath --input $sourceGlb --output "$outputDir/inventory.json"
python scripts/art-remake/author-flesh-body.py --repo $repoPath --input $sourceGlb --inventory "$outputDir/inventory.json" --deps $depsDir --output-dir $outputDir
node scripts/art-remake/pack-authored-flesh.mjs --input "$outputDir/authored-flesh-v4-prototype.glb" --output "$outputDir/flesh-sculpt.glb" --report "$outputDir/packing.json"
Get-FileHash -Algorithm SHA256 "$outputDir/flesh-sculpt.glb"
```

The author also emits three CPU previews, a PLY and an authoring report. These
are diagnostics, not gameplay screenshots. Packing removes unreachable old
texture and geometry payload from the new file. It does not modify the source.

The tracked scripts were actually rerun on Windows with the package versions
in `requirements.txt`, Node v24.18.0 and the repository's Three.js 0.185.1. The
rebuilt packed GLB was byte identical to the integrated candidate:

* Source: `assets/carriers/meshy/flesh.glb`, 10,440,784 bytes,
  SHA-256 `b9dcc002b95c6495522a8b2a7ec8a27fb88de7add8a2e0265a34177b3a9c872f`.
* Result: `assets/art-remake/flesh-sculpt.glb`, 12,591,528 bytes,
  SHA-256 `7033228cb23c75c75391885f08598cc9125fd787dcc25dfec3a24fb62179ff09`.

See `asset-sources/authored-flesh.json` for the actual runtime versions, script
hashes and preserved evidence locations. Cross-platform byte identity is not
asserted. Compare the result before deliberately integrating a new generation;
these tools never overwrite the runtime asset themselves.

## Regression and integration

```powershell
node --test tests/authored-flesh.test.mjs
```

The tests read the actual integrated asset and check its hash, original contact
attributes and complete rig against the source. A head-height ray verifies that
the upper skull remains a visible target below the original height bound. The
contact test then runs the real pose
adapter for 360 CPU frames: start, walk, turn and stop over sloped, curved ground
with nonuniform body fitting and body pitch. It checks solver equality, visible
paw minima, and skinned face centres and edge midpoints against the terrain.
This catches a floating or penetrating replacement paw even if the hidden
contact pool still passes. It does not certify browser animation or art quality.

Runtime integration must preserve vertex colours and the `authoredFlesh` and
`sourceContactVertices` metadata, and skip the old shredded-mesh smoothing path.
New body weights are explicitly authored; blends retain their largest four
influences. The recorded maximum discarded mixture mass applies only to new
vertices, never the retained source skin. Real gameplay captures and independent
art review remain separate requirements.

Version 4 restores the original upper-skull target region with a blended cranial
crest following Bone_053 and Bone_029. The unchanged combat regression also
passes for all six carrier targets (`node --test tests/meshy-monster-combat.test.mjs`).
No attack range, marker, ray height or solver tolerance was adjusted.
