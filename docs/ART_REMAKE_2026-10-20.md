# Painterly art remake — working record

Owner request: remake the game's visual presentation using the direction from
**Build kaiju city builder prototype**, retaining the existing game design and
systems. The exact October 3 brief specifies painterly dark-fantasy 3D: sculpted,
readable forms, restrained detail, weathered Gothic/industrial character and a
rich moving city against a calm world. DREDGE is a principles reference.

On October 20 the owner explicitly reconfirmed the later **low saddle city for
flesh, vertical half-height castle for cyborg**. This resolves the older generic
vertical-both instruction. The four-balloon and crawler variants remain.

## Source and preservation

Baseline: `96ab478480625923c4d3bc3f42781b0093e3194f`, the clean latest playable
checkpoint. This is a descendant of the older main workspace playtest branch.
Work is isolated on `codex/kaiju-art-remake-20261020`. The original checkout,
source assets, saves and history remain available. Browser testing uses fresh
isolated contexts on ports 4223/4224, never the owner's saved browser profile.

The simulation, costs, progression, district IDs/order, weapons, terrain heights,
resource positions, destructive scenery identities, controls and save schema are
retained. This is a visual rebuild within the existing Three.js engine, not a new
game-rules implementation. Original animation rigs and contact vertices are
retained; their source GLBs remain intact. Round 3 replaces the broad visible
creature and robot bodies, standing tree masters, architecture, hull forms, field
botany and rocks. This is not falsely described as a completely new asset library.

## Replacement map

- New generated local paint textures replace architectural stone/brick, roof,
  plaster and iron finishes. Shared textures retain metric surface scale.
- New flesh anatomy and broad vertex paint replace the fragmented original
  visible body. Rounded robot castings, bearings and clean terminal hulls replace
  the visible robot body. Both retain original rigs and exact source contact pools;
  pose adapters limit contact sampling to those pools. No attack timing or target
  calculation changes are intended.
- Ground and river shaders replace the separate pilot and global material
  paths with one consistent habitat family. Terrain geometry is retained.
- Foliage, rocks, ruins, sky and all lighting modes use coordinated palettes.
- Crawler podiums, undercroft arches and swept prows are reauthored, with hipped
  mansards, bow windows and a new civic clocktower. Protected attachment and
  picking coordinates remain exact in all six carrier variants.
- Branching shrubs with curved solid leaves replace crown blobs and diamond
  bushes. Chipped sedimentary rock geometry replaces the old faceted master.
- Highway and markings conform to rendered terrain; decorative road pieces on
  extreme cliffs are omitted while preserving the original random sequence.
- A complete interface stylesheet reworks the title screen, HUD, districts,
  map, battle controls and dialogs while retaining all action IDs.
- Performance mode no longer uses a sub-CSS-pixel .85 renderer scale. On DPR2
  phones it now uses 1.25; Balanced caps at1.5. High is unchanged. This deliberate
  quality increase must be disclosed in timing comparisons, not normalized away.

## Assets

Four new 1254×1254 PNG albedo artworks were generated with the built-in image_gen
tool, inspected and copied unmodified into `assets/art-remake/`. Original generated
files remain retained. Prompts are in `asset-sources/remake-paint.json` and
`asset-sources/hide-paint.json`. Natural
rock/bark/wood scans and original Meshy source masters remain preserved. New
artwork is not a replacement of every mesh or every source asset.

## Verification and release

Work in progress. Append final tested source identity and actual results here.
Prior failed art gates remain historical and are not changed by this remake.
The new visual update has its own maximum four independent rounds. Delivery is
ineligible until its required checks and an actual 8.5/zero-error review pass.

Round 1 reviewed commit `33654f2bcb8532c868d917c55074d4746804037a`, raw runtime
fingerprint `01fa0467f3dbbdd11f043d4c30a5721e4c92c53b366b534fd55899c5fca3d9f6`.
The independent result was **6.2/10, FAIL**. The immutable review is
`art-reviews/ART_REMAKE_ROUND_01.md`. Its floating masonry observation was later
raycast to distant highway slabs, not the ruined resource-site buildings.
The exact diagnostic is retained in `artifacts/art-remake/ruin-diagnosis-round02`.
The first candidate passed 336 unit checks and all six bounded native-control
smokes, but these functional results do not establish visual quality.

Round 2 reviewed `d297f7cc735f07946a95e5bf2fa5a6acc102ef7f`, raw runtime
fingerprint `b4d116645d93480c09c2f1ab938fce24873ed5c861dff3678187cf4d77fe0351`.
The independent result was **6.7/10, FAIL**. See the immutable
`art-reviews/ART_REMAKE_ROUND_02.md`. Highway slabs, shrubs and rocks improved;
fragmented flesh anatomy, weak city massing and bland terrain remained. All
350 unit checks and six 5-second native movement/build/save smokes passed.
The initial browser launch failure and its successful retry are both retained.

Round 3 builder work adds new anatomical flesh, rounded robot armor, convex
terminal hulls, connected tree crowns, terrain habitat paint and crawler
terraces/machinery. The packed flesh asset was reproduced byte-for-byte with the
tracked offline tools. Original meshes, weights, animation and inverse-bind
matrices remain available. New anatomy has new topology and authored weights;
its original contact pool is stored but mostly not drawn. Walking, turning,
stopping, combat and visible contact checks are required separately. New source
geometry does not establish a passing art score.

Round 3 reviewed `3432867ea3e40341f2b747c800398ff7aed2acdc`, raw runtime
fingerprint `6a91bf08e12d400787d5f6080bfe1fbc2ad2fd46cccc08db603c672588b22864`.
Its independent result was **7.2/10, FAIL**. The critic found the shredded flesh
resolved but the face and articulation still too toy-like, plus detached robot
wrists and weak saddle construction. Supplemental geometry inspection identified
103 rock-attached shrubs floating over the terrain. The 365-test suite and all
six native movement/build/save/reload smokes passed; they did not clear the art
gate. The old unit recorder omitted a runtime fingerprint and preceded generated
build metadata, so it is not described as an exact recorded capture identity.

Round 4 refines facial planes, recessed eyes, horns and limb transitions; repairs
the articulated robot wrist assemblies; roots the 524 rock-attached shrubs using
their actual basal vertices; and adds quiet woodland floor variation without
changing terrain geometry or scenery identities. Authored metal and hide now
retain their intended material response instead of receiving the legacy imported
mesh roughness/metalness remap a second time.

A full-city check caught five new flesh/deck intersections before final review.
The authored anatomy was narrowed around the unchanged mount positions. Exact
visible-triangle clipping now checks all 20 occupied deck slabs with 0.066 world
units of clearance at 31 poses spanning standing, walking, turning and stopping.
The corrected asset was reproduced byte-for-byte twice; the original rig,
inverse binds, contact pool and combat target region remain preserved.

The older belly girdles still disappear into the flesh body. A closed replacement
was attempted with skin anchors and exact face/skin intersection tests. It still
crossed a swinging forelimb, so the implementation and its failed tests were
archived outside the runtime and rejected. The restored runtime is byte-identical
to fingerprint `d932c2814b11d323b8fe368e5e50fa940450276419545e82f3c2d588cdfcbcf1`,
which passed all 370 tests after build `69feb5cf51fe3d04acb4`. Every test-source
hash also matches that recorded run. Only the reporting packager changed later.
The original strap limitation remains visible and must not be described as fixed.

Known inherited limitation: flesh saddle district cannon artwork uses saddle
mounts while numerical firing geometry still follows the historical vertical
layout. This remake does not silently rebalance or change that system.

Evidence inventory was inspected before captures. This is group3 since the last
cleanup; no older evidence is due for removal yet.
