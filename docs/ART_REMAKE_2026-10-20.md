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
game-rules implementation. Imported carrier assets and animation rigs are reused;
their source GLBs remain intact. New procedural architecture, hull forms, field
botany and rocks replace substantial visible geometry. This is not falsely
described as a completely new asset library.

## Replacement map

- New generated local paint textures replace architectural stone/brick, roof,
  plaster and iron finishes. Shared textures retain metric surface scale.
- Imported character albedo is interpreted as a sculptural pigment mask, with
  ivory/oxide metal and warmer organic colours. Matching surface normals are
  softened across UV seams without welding UVs or changing the rig.
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

Three new 1254×1254 PNG albedo artworks were generated with the built-in image_gen
tool, inspected and copied unmodified into `assets/art-remake/`. Original generated
files remain retained. Prompts are in `asset-sources/remake-paint.json`. Natural
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

Known inherited limitation: flesh saddle district cannon artwork uses saddle
mounts while numerical firing geometry still follows the historical vertical
layout. This remake does not silently rebalance or change that system.

Evidence inventory was inspected before captures. This is group3 since the last
cleanup; no older evidence is due for removal yet.
