# Meshy asset pilot — work in progress

Owner task: `C:/Users/user/Downloads/Kiju_Codex_Meshy_Computer_Use_Pilot.txt`.
Starting source: `fad5bb2d0d4a3a07dbfdf2bdb681fd510abfb137`, runtime
`cd2e582e844870fa1515990a88d8d5a22d4b020d`. The broad revamp is paused;
see `MESHY_PILOT_CHECKPOINT_2026-10-03.md`. Pilot branch:
`codex/meshy-pilot-20261003`. No reset, push, merge, deployment or purchase.

## Account, license and cost preflight

Actual Chrome browser connection opened the authorized `rezarhnm` account.
Pro, 1,100 credits, Private license selected. A permitted example GLB download
proved browser-to-local delivery; that example is not a game asset.

Read on 2026-10-04 UTC / October 3 locally:
- https://www.meshy.ai/pricing — Pro unlimited downloads, private customer-owned assets.
- https://www.meshy.ai/terms-of-use section 3.2 — paid customers own outputs to
  the extent permitted by law; private option; processing license for service.
- https://help.meshy.ai/en/articles/10000507-how-many-credits-does-each-generation-task-cost
  — web Meshy 6 model 20, 2K texture 10, Pro download no credits.

UI confirmed Meshy 6 High Detail text-to-3D, quantity 1, split off, pose none,
Private; model 20 credits. Actual remesh panel showed 0 credits, Triangle and
3K/10K/30K/100K/custom targets. No generation submitted during inspection.
Estimate reported before submission: 90 credits for three complete masters,
120 including at most one defective-candidate replacement. Recheck every
submission's displayed cost. Use no free-retry loop beyond the owner's limit.

## Original prompts and job ledger

Rock geometry prompt:
> Single reusable weathered riverbank boulder for a painterly dark fantasy game. Squat asymmetric mass, broad angular slate planes, two or three strong fractured ledges, gently worn corners, a few deep natural fissures. Clear bold silhouette from every side. Matte cool grey stone with restrained muted olive lichen patches. Sculpted hand-painted forms and subtle surface detail. Solid closed underside that can sit in soil. One isolated rock only, no surrounding ground, no base or pedestal, no plants, no scene, no lettering. No shiny material, no tiny noisy melted bumps, no baked lighting or shadows. Real-time game prop.

Rock completed: geometry `01a10450-0d52-7344-9096-cf622b5b9a08` (20),
3K Triangle remesh `01a10452-ebcd-706d-9de0-ce4d5fd652ef` (0),
2K PBR Meshy 7 Flagship texture `01a10454-e000-71cc-a8fc-0d67d1408aec` (10).
Texture prompt: Hand-painted matte river stone for a dark-fantasy woodland. Broad cool slate-grey color planes, quiet charcoal fissures, warm grey worn edges, sparse muted olive lichen. Restrained brush-like transitions and very subtle fine grain. Low contrast albedo, no directional lighting, no cast shadows, no glossy or metallic patches, no bright white veins. Preserve large sculpted planes; avoid noisy photo detail.

Original GLB: 10,698,544 bytes, SHA256
`0a021b9c6248eacb5a954d70676d39f3bb209b5fbe8837ffae1dece309196c47`.
Runtime `assets/scenery/meshy-pilot/rock.glb`: 2,144,436 bytes, SHA256
`f649f73c223c1980ac7112be7aaeab7b1646bda7502955886956d0c5a8939540`.
Actual 3,132 triangles, 2,794 vertices, one opaque material. Three embedded 2K
images reduced to 1K with existing Pillow; geometry bytes unchanged. No external
URI or extension. Meshy's internal exporter metadata mentions Blender; no local
Blender was used or installed. Original preserved under ignored pilot originals.

Rock was rendered in the actual game BEFORE spending on trees. A crawler reached
(-46.03,-93.95) through ordinary travel; native save/reload/Continue retained it.
Normal and reverse HUD views inspected: 48 instances on 22 original logical IDs,
albedo/normal loaded, no browser errors. One observed local load was 50.3ms;
this is diagnostic evidence, not a controlled performance comparison.

First pine prompt: One mature windswept Scots pine tree, isolated reusable game scenery. Painterly dark fantasy, sculpted substantial forms. Leaning tapered trunk with connected asymmetric branches. A continuous dense irregular conifer crown with overlapping masses of needles, a ragged natural silhouette and a clear pointed top. Branches grow into the canopy; no exposed pole with disconnected horizontal pads, no stacked geometric cones. Muted deep blue-green needles, warm dark bark. Strong readable silhouette, compact clustered foliage rather than thousands of individual needle meshes. Root flare at ground level, no ground disc, no pedestal, no stones, no scene, no hanging props. Matte hand-painted surfaces, restrained detail, no baked light or shadow.
Geometry `01a10461-3112-72f9-997e-9ae27ff65272` (20); 10K Triangle
remesh `01a10469-4138-76eb-aaf2-b948ec26a60c` (0), actual 10,246 triangles.
REJECTED: front and reverse inspection showed a ladder of sparse canopy shelves
around an exposed trunk; the reduction sharpened tiny foliage clumps. No texture
credits spent and this candidate is not imported. Screenshot retained.

Sole permitted replacement pine submitted (20). Prompt: One isolated dense evergreen pine tree for a painterly dark fantasy game. A substantial continuous dark green crown shaped like an irregular tapered flame, broad near its base and pointed at the top. Thick overlapping needle foliage fills the crown from the trunk to the outer silhouette on every side, hiding most interior branches. Dense sculpted foliage masses, asymmetrical natural boughs and a softly ragged outline. Short exposed brown trunk below the crown with modest root flare. Hand-painted matte surfaces, muted blue-green needles, restrained bark detail. One connected tree only, no ground disc or pedestal, no accessories or surrounding scene. Solid foliage volumes, no tiny individual needles, no bare pole or ladder of separate horizontal pads. No baked lighting or cast shadows.

Ledger to this point: 70 credits charged, plus two automatic 50-credit onboarding
rewards, visible balance 1,130. No purchase or account-plan change by this task.
Expected completed batch is now 110 credits; the replacement allowance is used.
Replacement pine completed: geometry `01a1046a-930c-76a6-869b-5372f93e5ec8`
(20), 10K Triangle remesh `01a1046c-9e11-7547-ad0d-6ee3095849a1` (0),
2K PBR Meshy 7 texture `01a1046d-88eb-7647-9e24-a5bc995e5391` (10).
Texture prompt: Painterly matte evergreen pine. Needle foliage is muted deep blue-green with broad olive-green midtones and quiet cool recesses. Short trunk is weathered warm umber bark with restrained vertical fissures. Dense brush-like needle strokes follow the sculpted boughs, not bright spots or separate ornamental scales. Large calm color shapes, subtle fine detail. Low contrast albedo, no baked directional lighting or cast shadows, no shine, no metallic parts, no snow, no ornaments. Cohesive dark-fantasy woodland palette.
Front, side and above inspected in Meshy. A connected stylized crown replaces
the rejected sparse shelves; actual game inspection remains required.
Original 13,249,420 bytes, SHA256
`0442faf98ee9c670704dad2567bddda7d9a7bfc85232b47a9ea6a6da00cb3ecc`.
Runtime `assets/scenery/meshy-pilot/pine.glb`: 3,226,944 bytes, SHA256
`6be367bc8e674b4a8b54a60a064bdbc1e265047479a435d8c3403c1f25efdef5`.
Actual 10,334 triangles, 10,145 vertices, one opaque double-sided material.
Three embedded images reduced 2K to 1K, geometry unchanged, no external URI.

Broadleaf prompt (single geometry submission, 20): One isolated old broadleaf oak tree, a reusable painterly dark-fantasy game prop. A sturdy crooked trunk forks naturally into connected limbs supporting one dense asymmetrical leafy crown. Broad overlapping foliage masses form an uneven rounded canopy with a few open pockets and a ragged leafy silhouette. Dark muted olive-green leaves and warm umber bark, substantial hand-sculpted planes, restrained hand-painted detail. Thick clustered foliage volumes rather than thousands of separate leaf meshes. Roots flare modestly at the trunk base. Readable from every side and above. No ground slab, no display pedestal, no props, no forest scene, no flowers or fruit. Matte natural surfaces, low contrast color, no baked directional lighting or cast shadows.
100 credits charged through broadleaf geometry submission; balance 1,100.
Broadleaf completed: geometry `01a10470-2216-707a-a7db-3f919ca1a550` (20),
10K Triangle remesh `01a10472-6849-7063-af73-bb48977d9d11` (0),
2K PBR Meshy 7 texture `01a10474-1a0e-764d-bb77-ca197c989d72` (10).
Texture prompt: Painterly matte oak tree in a dark-fantasy woodland. Broadleaf crown has muted olive-green midtones, cool deep green recesses, and restrained warm sage variation. Broad calm brush-painted color masses with subtle leafy strokes, no speckled noise. Crooked trunk and connected limbs are warm dark umber bark with weathered grey ridges. Low contrast albedo without directional light or baked cast shadows. Entire asset is nonmetallic and rough, no glossy wet leaves, no glowing accents, no fruit, no snow. Match a quiet natural slate and evergreen palette.
Front, side and above inspected. Actual 10,302 triangles, 15,599 vertices,
one opaque double-sided material. Original 11,440,616 bytes, SHA256
`7611d75949cabb0d11576ba170bde65d234d5312a8005d9433f6111b013efc28`.

## Final local import bytes and credit ledger

The imported matte materials do not use the generated ORM image. The reproducible
`compact-meshy-glb.py ... 1024 --matte` pass removes that unbound image and remaps
texture/image/bufferView indices, avoiding both download and bitmap decode waste.
It asserts byte-for-byte SHA256 equality of every geometry accessor bufferView.
Each runtime GLB now contains only 1K normal + albedo images. The earlier 3-image
sizes above are intermediate records; the following are the final shipped bytes:

| Master | Bytes | SHA256 |
| --- | ---: | --- |
| rock.glb | 1,998,924 | 4f623b99853081115b567527ddd353b52c413b547a8f0bebd8aa4e866be62506 |
| pine.glb | 3,043,212 | 14c8322cd81d0e4a062a423364869f92ec9643da2082ec08ba2bf6f5575aeabe |
| broadleaf.glb | 3,190,424 | c495e01589b865b20ab3fc675a887890dc127fbcdd9f5ba5fe89fa9448a0bd6b |

Total 8,232,560 bytes, versus 35,388,580 original export bytes. Geometry unchanged.
All original exports remain under `artifacts/meshy-pilot/originals/`; raw validation,
repack, preview and account evidence are outside the review folder.

Final UI ledger verified October 3, 2026: 110 credits charged (four model jobs at
20, three texture jobs at 10), all remesh/download steps 0. Two automatic onboarding
rewards added 100. Starting 1,100, final 1,090. The 5:02PM Plan change entry preceded
this task's account actions; this task did not change or purchase a plan. Exactly
one rejected-candidate replacement was used. No further generations permitted.
Private creation remained selected; nothing published to Community or elsewhere.

## Scope and evidence status

One bounded existing riverbank/woodland area; rock must render inside the actual
game before either tree is generated. Gameplay, IDs, destruction, physics,
simulation RNG, controls, saves and carrier construction remain unchanged.
Old diagonal route is only a regression. Three new ordinary-play routes and
independent 5–10 minute Computer Use session are required. All final evidence
remains pending. Prior failed art and multi-writer save gates remain unchanged.
