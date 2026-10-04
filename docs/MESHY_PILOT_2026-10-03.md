# Meshy asset pilot — implementation and evidence record

Owner task: `C:/Users/user/Downloads/Kiju_Codex_Meshy_Computer_Use_Pilot.txt`.
Starting source: `fad5bb2d0d4a3a07dbfdf2bdb681fd510abfb137`, runtime
`cd2e582e844870fa1515990a88d8d5a22d4b020d`. The broad revamp is paused;
see `MESHY_PILOT_CHECKPOINT_2026-10-03.md`. Pilot branch:
`codex/meshy-pilot-20261003`. No reset, push, merge, deployment or purchase.

Reporting status: frozen round 4 runtime `4ae03f4bac181fef7a819ca7ef0d6b54283f9aa8`;
258 final-runtime unit checks, the carrier/interaction/preservation/lifecycle
suites, three-profile native functional checks and all ten scoped local A/B
package-browser checks passed. The independent round 4 verdict is **7.4/10 FAILED**;
its formal review is recorded and the four-round visual loop is closed with no
fifth attempt. Final timing/resource collection is complete; its protocol pass
does not mean the candidate is faster. All five fresh matched capture pairs
completed and were visually inspected at the same frozen runtime.
This document records completed
work without treating earlier checks as final-source certification.
The existing failed art and unrestricted multi-session save gates remain closed
to release. No release-ready build, upload or deployment is claimed here.

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
sizes above are intermediate records; the following are the current local
candidate runtime bytes (not a deployment):

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

## Bounded implementation and preserved identities

The pilot changes the display of existing scenery only within world x
`[-65,32]`, z `[-140,-90]`. There are three imported pine instances, three
imported broadleaf instances and 48 rock instances on 28 original logical IDs.
The two river-spit records each own 14 rock instances; the other 20 rock records
each own one. This is three reusable masters, not 54 downloaded models.

| Original tree ID | Master | Unchanged root x | Unchanged root z |
| --- | --- | ---: | ---: |
| tree:49 | pine | 2.3642589105293155 | -119.47577563114464 |
| tree:146 | broadleaf | 3.730055456981063 | -116.97929303627461 |
| tree:200 | pine | -62.42828615941107 | -130.5583181558177 |
| tree:477 | pine | -51.35322615969926 | -116.31229785270989 |
| tree:791 | broadleaf | -42.17492421157658 | -103.26209894847125 |
| tree:1124 | broadleaf | 24.627368431538343 | -117.10031807888299 |

Exact replaced rock IDs:
`rock:189`, `rock:224`, `shore:-140:1`, `shore:-136:-1`, `shore:-136:1`,
`shore:-132:-1`, `shore:-132:1`, `shore:-124:-1`, `shore:-124:1`,
`shore:-120:1`, `shore:-112:-1`, `shore:-112:1`, `shore:-108:-1`,
`shore:-108:1`, `shore:-104:-1`, `shore:-104:1`, `shore:-100:-1`,
`shore:-96:-1`, `shore:-96:1`, `shore:-92:-1`, `river-spit:1`, `river-spit:2`.
The actual-game diagnostic record is
`artifacts/meshy-pilot/account/kit-actual-game-runtime.json`.

The existing ground and water materials retain one active path. Their pilot
treatment uses a soft mask, fully inside x `[-57,24]`, z `[-133,-97]`, falling
to zero outside the original pilot rectangle. Middle-scale meadow/earth shapes,
litter contacts at the six original roots and damp-bank/shallow transitions use
existing fields and textures. No terrain or water geometry, extra pass, global
light, clock or texture dependency was added by this material treatment.

The imported tree displays preserve roots, height, species, destruction owner,
saved ID and existing motion time source. Their whole-tree flutter differs from
the former branch/card display; this is a visual change, not a claim of identical
per-vertex animation. Rock transforms and existing bank support fields remain
unchanged. Original selected displays are replaced, not layered underneath.
Outside-pilot scenery and all existing functional anchors remain protected.

The import step first applies each glTF node's world transform to its geometry
in the loader's Y-up coordinate system. It verifies finite positions/normals/UVs,
one static opaque PBR material, decoded maps and nonzero bounds. Rock geometry is
centred on its measured bounding-box centre and normalized per axis to a unit
box, then uses the original rock instance transforms. Tree geometry uses the
mean x/z of vertices in the bottom 3.5% of its measured height as its root pivot,
translates the minimum y to zero and scales uniformly to unit height before
applying the original saved root and tree height. This changes visual mesh form
while leaving physical support, picking/collision and logical placement intact.
Atlas UVs and normals remain present; geometry/image inventories retain their
actual bounds, counts, image dimensions, material/alpha settings and source hashes.

`src/main.js` has precisely one asset-loader import and one awaited preload
immediately before its existing `GameScene` construction. The release assertion
removes only those two exact additions and byte-compares the remainder with the
baseline. It does not exempt the whole main file or normalize whitespace.
Simulation, terrain, city layout, vertical construction, variant and weapon rules,
save transfer, updater, service worker and app manifest retain their protected
byte assertions. Gameplay, resource rules, RNG, picking, controls and saved
progress are outside the change scope. Flesh/cyborg Gothic construction stays
vertical; the cyborg backpack alone retains half-height storeys. Tank and airship
construction and all six established carrier identities are unchanged.

## Asset and loading cost

| Master | Triangles | Vertices | Materials | Runtime embedded images | Local GLB bytes |
| --- | ---: | ---: | ---: | --- | ---: |
| Rock | 3,132 | 2,794 | 1 opaque | 1024 x 1024 base colour + normal | 1,998,924 |
| Pine | 10,334 | 10,145 | 1 opaque, double-sided | 1024 x 1024 base colour + normal | 3,043,212 |
| Broadleaf | 10,302 | 15,599 | 1 opaque, double-sided | 1024 x 1024 base colour + normal | 3,190,424 |
| Distinct master total | 23,768 | 28,538 | 3 | Six images | 8,232,560 |

These are distinct-master inventory counts, not actual visible frame triangles,
draw calls or measured GPU cost. The repack reduced file bytes by 27,156,020
(about 76.7%) without altering geometry accessor bytes. It removed unused ORM
data as well as reducing image dimensions. Original source exports remain local.

Six unique 1024-square RGBA8 texture allocations with full mip chains have a
**nominal estimated footprint of approximately 32 MiB** (33,554,424 bytes using
the complete mip sum). This is an estimate from dimensions and format, not
measured VRAM, PNG bytes or GLB download size. It excludes existing textures,
renderbuffers, PMREM, driver overhead and other resources. Maps shared by visible
and shadow materials must not be counted twice. The final resource inventory
below reports observed texture objects/formats and the baseline delta separately;
it confirms this estimate without measuring VRAM.

Three masters are loaded once through local vendored glTF dependencies and a
bounded shared cache before normal scene construction. Runtime GLBs have no
external asset URI or decoder dependency. Per-landscape geometry and instance
buffers have separate ownership; master texture reuse does not authorize their
disposal by each world. The preload adds a real 8.2 MB asset payload and image
decode work; it is not distance-based streaming. Final startup, allocation and
frame measurements below record the cost and the observed regressions.

## Image-decode failure and bounded repair

The initial loader could resolve a master as `ready` after a failed bitmap decode,
leaving zero or one of its required maps. The vendored loader's error path also
left failed embedded-image object URLs unreleased. The CPU diagnostic at
`artifacts/meshy-pilot/decode-failure-before.json` reproduced all-image and
individual-image failures against the actual three local GLBs: the all-failed
case reported `ready`, created six URLs and revoked none. A diagnostic command
exit of zero means that investigation ran; it does not make this behavior pass.

The repair requires decoded base and normal maps with positive finite image
dimensions before publishing a master. Failure rejects the bounded shared load
promise, clears acquired masters and releases successful sibling/prior image,
texture, material and geometry resources. It does not silently accept untextured
models or create a retry loop. A narrow vendored `GLTFLoader` error-path addition
revokes the failed embedded-image URL.

`decode-failure-after.json` records rejection, `failed` status, no published assets
and two created/two revoked URLs for the first-master injected cases. A successfully
decoded sibling was closed once. Additional unit cases cover later-master failure
and retained-cache cleanup. These diagnostics mocked bitmap decoding: they are
not physical-device decoding or GPU tests. Their original revision labels and
partial-source hashes are retained; the after record was made with uncommitted
repair bytes while HEAD still named the first attempt. Final-source unit and
real-browser loading evidence must identify their own tested hashes.

## Completed checks and independent reviews

| Evidence | Actual result | Source and limitation |
| --- | --- | --- |
| Initial unit suite | 254/254 passed | `fa1cd3f61986124e72164ededd925715f018beb6`; execution `unit-attempt-1` |
| Round 1 independent art review | **7.0/10 FAILED** | `fa1cd3f`; normal kit, multiple views, phone emulation and native session; known injected decode defect disclosed |
| Independent native Computer Use | 9m53.718s elapsed | 2026-10-04 01:15:21.420 to 01:25:15.138 UTC, source `fa1cd3f`; includes loading, menus and tool round trips, not continuous simulation or a benchmark |
| Round 2 unit suite | 255/255 passed; exit 0; stable source | 01:37:40.713 to 01:37:56.020 UTC; execution `unit-round-2` retained its precommit HEAD label `fa1cd3f`, with tested fingerprint below |
| Round 2 preservation | 15 checks passed; exit 0 | 01:40:36.739 to 01:40:58.478 UTC; candidate `7afb2f2c6076e4fcf638d94df4a0a5e7e06b7af7` versus `fad5bb2`; CPU production construction in blank browser contexts, no renderer or gameplay loop |
| Round 2 independent art review | **7.1/10 FAILED** | `7afb2f2`; softer pine/rock response and stronger ground detail improved, pale striped water highlight remained inside the pilot |
| Round 3 independent art review | **7.3/10 FAILED** | `7cb7717bece4862c054642bc203797d2b730f189`; pale water bands resolved in inspected views, pine and compressed-rock form limits remain |
| Round 4 independent art review | **7.4/10 FAILED**, loop closed | `4ae03f4bac181fef7a819ca7ef0d6b54283f9aa8`; formal original `art-reviews/meshy-pilot-critic-round-04.md`; no fifth attempt |
| Final-runtime complete unit suite | **258/258 passed**, exit 0, stable source | 01:57:35.694 to 01:57:50.577 UTC; execution `unit-round-4` retained precommit HEAD label `7cb7717`, but both source fingerprints match frozen `4ae03f4` |
| Final isolated A/B package build | **Passed**, exit 0, exact byte inventories | 02:01:29.538 to 02:01:33.987 UTC; baseline `fad5bb2`, candidate `4ae03f4`; local package construction only, not browser/offline or deployment proof |
| Optional local-CSP test helper | 5/5 relevant CPU tests passed | Existing delivery-server checks plus two new policy checks; this alone is not an offline GLB browser result |

The round 2 unit and preservation execution wrappers recorded stable
runtime/assets/dependency fingerprint
`1563a428e4e055ba1035c3dd976ae9125834c7ee9eacb2919d0451600bb16e3e`.
The original logs and source labels are not relabelled as final-runtime evidence.
Their paths are `artifacts/meshy-pilot/executions/unit-round-2.{json,log}`,
`executions/identity-round-2.{json,log}` and `identity-round-2/report.json`.

The independent native session exercised real building placement/completion,
resource-destination travel, pause/resume, City/World/Streets views, multiple
orbit/pitch/zoom views, save/reload/Continue, phone orientation/panels/touch,
battle approach/Engage/damage/Withdraw and a second cyborg carrier. The saved
comparison retained location, buildings and 11 destroyed IDs, with ordinary
time advancement. It did not crush an imported pilot tree or prove a full 360
orbit, all four movement directions, three new benchmark routes or quantified
wind motion. Final functional checks are recorded separately below; the route
benchmarks and visual motion judgment retain their own evidence. Phone captures were desktop
Chrome emulation at the recorded actual buffers, not physical Apple hardware.

Verbatim independent findings remain in
`art-reviews/meshy-pilot-critic-round-01.md` and
`art-reviews/meshy-pilot-critic-round-02.md`,
`art-reviews/meshy-pilot-critic-round-03.md` and
`art-reviews/meshy-pilot-critic-round-04.md`; their original screenshots stay
under `artifacts/critic-round-01/meshy-pilot/` and
`artifacts/critic-round-02/meshy-pilot/` and the path recorded in round 3. The round 2 review was a focused visual
follow-up, not another full 9m54s scenario suite. Its unconfirmed Save/Resume
pause observation is documented there without changing ambiguous game behavior.
Remaining shape limits include repeated pine lobes and compressed-looking low
bank rocks. A material correction cannot be reported as replacing their topology.

The failed first camera-driver attempt is retained at
`artifacts/meshy-pilot/capture-framing-baseline/report.json`: native pitch did not
reach the requested target, so it produced no approved capture. The corrected
desktop framing run and round 2 diagnostic images are intermediate evidence,
not substitutes for the five final matched pairs.

## Final-source verification

Final frozen runtime commit: `4ae03f4bac181fef7a819ca7ef0d6b54283f9aa8`.
Its runtime/assets/dependency fingerprint is
`117f26eb80ccc913e88522553fd907ff62949be12fb4c89b350dda3832b14fca`.
The baseline fingerprint is
`3e9b10953ecb9a7a4cd3045d4ab18109db8cde72c955a21a7c4f6e85050acd53`.
Later documentation/tool commits must be distinguished from these tested runtime
bytes. Every final result below needs its actual command, timestamps, exit code,
source fingerprint and raw report; a missing or failed check remains so.

| Final check | Evidence path under artifacts/meshy-pilot | Status / measured result |
| --- | --- | --- |
| Complete unit suite | executions/unit-round-4.json and .log | **258/258 PASS**, exit 0, both source fingerprints match frozen final runtime |
| All-carrier rendering matrix | carriers-final/report.json | **54 cases PASS**, exit 0, stable final-runtime fingerprint |
| Interaction/save regression | smoke-final/browser-results.json | **13 checks PASS**, execution exit 0; this older report has no separate passed field |
| Identity/placement/destruction preservation | identity-final/report.json | **15 checks PASS**, exit 0, exact baseline/final preservation comparisons |
| Ownership/preparation/lifecycle | lifecycle-final/report.json | **9 checks PASS**, 35 snapshots, exit 0, stable final-runtime fingerprint |
| New native functional scenarios | functional-final-r2/report.json | **3 profiles x 8 scenarios PASS**, exit 0; real 360 orbit, near/normal/far and pitch, views, phone touch pinch, ground picking, imported pine crush, save/reload and resource travel |
| Existing route performance regression | paired-final/interleaved-report.json | **Protocol PASS**, exit 0; 18 visits, nine pairs, all 72 route rows; costs and spikes below |
| Three varied native routes | routes-final/report.json | **Protocol PASS**, exit 0; six visits, all 36 windows; three profiles, baseline/candidate, first/warm separately and all four movement directions |
| Resource/loading inventory | resource-inventory-final/report.json | **6 visits PASS**, exit 0; matched buffers/presets/camera, stable source, observed buffers/textures/network/loading outside timed travel |
| Isolated A/B package integrity | release-final/build-report.json and executions/release-build-final.json/.log | **PASS**, exit 0; exact GLBs/MIME/dependencies, clean detached checkouts and protected-source comparisons |
| Packaged install/update/offline/rollback | release-browser-final/results.json | **10/10 scoped checks PASS**, exit 0; same origin, interrupted pine GLB request, saves/all eight pilot damage IDs and real stopped-server offline reopening/rollback under fetched local CSP |
| Five matched gameplay pairs | captures-final-r2/report.json | **PASS**, exit 0; ten original normal-HUD PNGs with matched fixture/settings/source; all ten visually inspected |
| Independent final art verdict | art-reviews/meshy-pilot-critic-round-04.md | **7.4/10 FAILED**; earlier scores 7.0, 7.1 and 7.3 remain failed; four-round limit reached |

The corresponding `executions/<label>.json` and `.log` records retain exact
commands, environment, timestamps, exit codes and start/end source inventories.
The completed functional/carrier/smoke/identity/lifecycle and package-browser
wrappers all recorded the frozen final fingerprint above at both ends. The
package-browser wrapper names later tooling commit
`fa7be8ed116a037ffd05b2c06fab8b2de2c52aa6`; its runtime fingerprint and exact
served B package still identify the frozen `4ae03f4` implementation.

| Completed final command label | UTC start, 2026-10-04 | UTC finish | Exit |
| --- | --- | --- | ---: |
| identity-final | 02:01:57.386 | 02:02:19.086 | 0 |
| functional-final (original failed driver) | 02:06:15.492 | 02:08:49.308 | 1 |
| functional-final-r2 | 02:09:09.716 | 02:12:37.850 | 0 |
| carriers-final | 02:12:56.702 | 02:15:12.151 | 0 |
| smoke-final | 02:15:30.343 | 02:16:14.883 | 0 |
| lifecycle-final | 02:16:27.525 | 02:18:04.325 | 0 |
| release-browser-final | 02:19:23.484 | 02:22:38.911 | 0 |
| routes-final | 02:23:44.262 | 02:46:50.937 | 0 |
| paired-final | 02:47:10.473 | 03:05:14.825 | 0 |
| resource-inventory-final | 03:05:26.035 | 03:07:45.538 | 0 |
| captures-final-r2 | 03:13:52.304 | 03:17:56.067 | 0 |

The selected screenshots are the complete fresh `captures-final-r2` set, using
`capture-config-final-r2.json`. The earlier successful `captures-final` set is
retained as auxiliary framing evidence: its close view put the carrier over
the important bank rocks. Only the close fixture/camera changed, to position
(-18.785939052261682, -104.14476213071836), yaw 4.38, pitch 0.64, zoom 61.6.
Both builds were recaptured for all five pairs. No runtime, asset, pause function,
quality preset or art-review score changed; this was not a fifth art round.
All ten selected original images were inspected by the builder. They retain the
ordinary playing HUD, with no pause overlay, retouch, crop or post-resizing.
Desktop originals are 1440 x 960. Phone originals are 780 x 1688 and 1688 x 780
at emulated device DPR 2; their CSS viewports remain 390 x 844 / 844 x 390 and
actual Performance drawing buffers remain 331 x 717 / 717 x 331. These distinct
sizes are recorded rather than describing the screenshot size as render resolution.
Initial baseline save bytes and camera controls match; real native time and
camera-pose differences remain in the metadata. The capture-only starting save
is a disclosed fixture, not a claimed native journey from the default spawn.
The final capture execution identifies tooling commit `fa7be8e`, with runtime
fingerprint `117f26...` unchanged at both ends. Later reporting commits do not
change the tested implementation.

The original `functional-final/report.json` remains a failure. Desktop completed
all eight scenarios; portrait completed seven, then the driver tried to tap the
hidden destinations button without first opening the normal Map panel. A narrow
test-driver correction opened that panel before using its button. No runtime
file changed. The complete rerun passed all eight scenarios in desktop, portrait
and landscape at the same `117f...` runtime fingerprint. Export must explicitly
select `FUNCTIONAL_REPORT=functional-final-r2/report.json` and retain the earlier
failure rather than overwrite or relabel it. Uniform motion/binding checks do
not by themselves prove perceptible or attractive wind; the independent motion
reviews remain separate evidence.

The local packaged test retained exact A bytes in both open clients while B
downloaded. The old peer stayed on its real title/preview and its automatic
reload at activation was recorded. Only one gameplay session wrote saves.
Its rich pre-update fixture was prepared with baseline production build/upgrade/
tick functions, accelerated fixture-only time and restored damage IDs; it is
explicitly a save-compatibility fixture, not native-input proof of that history.
The separate functional test supplies actual input-driven pilot-tree crushing.
Interruption targeted `/assets/scenery/meshy-pilot/pine.glb`; complete A reopened
with the real server stopped, B preserved the caller save and progressed it,
B reopened offline with its assets, and rollback to A retained B-created progress.
All six named tree IDs plus `rock:189` and `rock:224` remained saved damage.
The report recorded zero page/console errors and zero remote requests; owned
context, browser and loopback server cleanup succeeded.

These packaged responses used the exact current local server CSP fetched from
`http://127.0.0.1:4214/`, hash
`d8bd241058761fc766681f63768159f755ed00d5f5f2ce66ca5c8a8280be5eac`.
It permits only the intended local sources and local blob images/connects; no
policy bypass was added. Cache-header and exact-file checks included offline
responses. This establishes local packaged behavior under that policy, not a
hosted-CSP, physical-iPhone or Safari result.

## Measured performance and resource costs

The measurements do **not** support a blanket optimization claim. The pilot adds
8,420,275 packaged bytes, 1,046,428 reachable geometry/instance backing-buffer
bytes and six texture objects with 33,554,424 estimated texel bytes. In three of
six desktop varied-route windows, candidate RAF p95 rose to 19.9–20.0 ms from
10.1 ms in baseline. Both builds retained roughly 240 ms first resource-route
spikes. The phone emulations maintained 10.1 ms RAF p95 in these measured routes,
but they ran on a desktop RTX 4070 Ti SUPER; they do not predict an iPad's speed.

All runs used foreground Chrome `154.0.8037.95`, Windows, ANGLE Direct3D11/WebGL2,
daylight and the normal City camera: yaw 0.72, pitch 0.6, zoom 76. Varied routes
used the ordinary steady camera option; the original short regression used
cinematic. Each A/B comparison retained its camera/settings. No resolution was
reduced between A and B. The actual phone buffers reflect the game's Performance
preset, independently of emulated device DPR.

| Profile | CSS viewport | Device DPR | Preset / renderer DPR | Actual drawing buffer |
| --- | --- | ---: | --- | --- |
| Desktop | 1440 x 960 | 1 | High / 1.25 | 1800 x 1200 |
| Phone portrait emulation | 390 x 844 | 2 | Performance / 0.85 | 331 x 717 |
| Phone landscape emulation | 844 x 390 | 2 | Performance / 0.85 | 717 x 331 |

The original short regression interleaved A1/B1/A2/B2/A3/B3 per profile, with
fresh isolated sessions, normal Begin, first held movement, warmed opposite
return, Save/reload/Continue and corresponding first/warmed returns. Below, RAF
median is 10.0 ms in every window; p95 lists all three observations; maximum is
the worst of three. Input response is the median of three input-to-first-changed-
render completions. Threshold counts sum the three windows; these are not pooled
percentiles. All timings are milliseconds.

| Profile / regression window | RAF p95 A / B (three values) | RAF max A / B | >50 / >100 counts A ; B | Input median A / B |
| --- | --- | --- | --- | --- |
| Desktop Begin first | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 120.1 / 110.0 | 3/2 ; 3/3 | 97.1 / 95.4 |
| Desktop Begin warmed | 20.0,10.1,10.1 / 19.9,10.1,10.1 | 20.1 / 20.2 | 0/0 ; 0/0 | 10.8 / 10.3 |
| Desktop Continue first | 10.1,10.1,10.2 / 10.1,10.1,10.1 | 20.1 / 20.1 | 0/0 ; 0/0 | 12.1 / 13.3 |
| Desktop Continue warmed | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 20.1 / 20.1 | 0/0 ; 0/0 | 10.2 / 9.8 |
| Portrait Begin first | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 10.3 / 20.0 | 0/0 ; 0/0 | 10.3 / 9.6 |
| Portrait Begin warmed | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 10.2 / 10.2 | 0/0 ; 0/0 | 9.8 / 10.0 |
| Portrait Continue first | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 19.9 / 10.3 | 0/0 ; 0/0 | 10.2 / 9.8 |
| Portrait Continue warmed | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 10.2 / 10.2 | 0/0 ; 0/0 | 10.0 / 10.2 |
| Landscape Begin first | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 10.2 / 20.0 | 0/0 ; 0/0 | 9.9 / 9.0 |
| Landscape Begin warmed | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 10.9 / 11.0 | 0/0 ; 0/0 | 9.8 / 10.1 |
| Landscape Continue first | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 10.2 / 10.2 | 0/0 ; 0/0 | 9.8 / 9.9 |
| Landscape Continue warmed | 10.1,10.1,10.1 / 10.1,10.1,10.1 | 10.9 / 10.2 | 0/0 ; 0/0 | 9.8 / 9.7 |

First-use latency is not eliminated: desktop first Begin response reached
108.4 ms in A and 106.7 ms in B. The median of per-run main-callback p95s spans
10.5–11.1 ms A / 10.4–11.0 ms B on desktop, 8.5–9.1 / 8.4–9.0 portrait and
9.2–9.5 / 9.0–9.3 landscape. Main callback wall time includes waits and is not
pure CPU time. GPU timing has mixed and unfavorable observations: desktop
Continue-first GPU p95 median rose 5.774 to 10.122 ms; landscape rose 3.974 to
10.002 ms. These three-run summaries are descriptive, not statistical proof of
a causal GPU regression or an improvement elsewhere.

The varied routes begin from a disclosed baseline save fixture at (-45,-93),
then use ordinary Continue and native keyboard/touch arrows. There is no position
mutation or accelerated time during travel. Woodland visits west/east trees and
returns; shore follows the bend and rocks; the resource route approaches the
existing ruins/foundry sector through the normal destination UI, preserving its
22 m stand-off and gathering radius. Requested/reached waypoints, headings and
input events are recorded in all six child reports. Each visit exercised all four
directions. First traversal and warmed same-session repeat remain separate;
later route families can encounter already warm resources and destroyed scenery.

| Varied route / profile | First RAF p95 A / B | First max A / B | Warmed RAF p95 A / B | Warmed max A / B |
| --- | --- | --- | --- | --- |
| Woodland desktop | 10.1 / 19.9 | 110.0 / 109.9 | 10.1 / 10.1 | 20.2 / 20.1 |
| Shore desktop | 10.1 / 10.1 | 20.1 / 20.1 | 10.1 / 10.1 | 20.1 / 20.1 |
| Resource desktop | 10.1 / 19.9 | 240.0 / 240.1 | 10.1 / 20.0 | 20.1 / 20.2 |
| Woodland portrait | 10.1 / 10.1 | 20.0 / 10.2 | 10.1 / 10.1 | 20.0 / 10.4 |
| Shore portrait | 10.1 / 10.1 | 10.2 / 10.2 | 10.1 / 10.1 | 10.2 / 19.9 |
| Resource portrait | 10.1 / 10.1 | 20.0 / 10.2 | 10.1 / 10.1 | 10.3 / 10.2 |
| Woodland landscape | 10.1 / 10.1 | 20.1 / 20.0 | 10.1 / 10.1 | 10.3 / 10.6 |
| Shore landscape | 10.1 / 10.1 | 10.2 / 10.3 | 10.1 / 10.1 | 10.3 / 10.2 |
| Resource landscape | 10.1 / 10.1 | 19.9 / 20.0 | 10.1 / 10.1 | 20.1 / 10.2 |

All 36 varied-route RAF medians were 10.0 ms. Desktop first woodland had one
frame over 50 and 100 ms in each build; first resource had two in each. Every
other varied window had zero over 50 ms. Woodland first-input response was
102.2/103.9 ms A/B desktop, 11.9/11.0 portrait and 13.0/12.5 landscape. Across
the six windows, median draw calls ranged 930–1,018 A / 931–1,017 B desktop,
296–316 / 297–317 portrait, 360–391 / 361–388 landscape. Median submitted triangles
rose from 4,157,340–4,875,418 to 4,564,388–5,235,256 desktop,
1,345,042–1,510,396 to 1,552,634–1,718,436 portrait, and
2,208,340–2,384,190 to 2,410,346–2,595,964 landscape. These count the scene's
rendered passes, not just distinct master geometry.

GPU queries returned samples in every visit. These completed/missing sample
counts retain the phone gaps; missing is not zero GPU time. Discarded-disjoint
sample and drain-discard counts were zero. The varied reporter recorded zero
disjoint events; the older reporter does not serialize event counts, so those
are unavailable. Phone gaps were skipped pending queries. No final route
reported focus or context loss.

| Profile | Short regression completed / missing A ; B | Varied routes completed / missing A ; B |
| --- | --- | --- |
| Desktop | 8,240/0 ; 8,278/0 | 20,101/0 ; 19,667/0 |
| Portrait | 8,439/32 ; 8,442/29 | 20,251/450 ; 20,215/443 |
| Landscape | 8,434/38 ; 8,440/31 | 20,450/452 ; 20,221/457 |

The six-visit resource inventory used ordinary fresh Begin and readiness plus
12 native frames, outside timing routes. A/B settings and camera controls
matched; native time differences were recorded, not forced equal.

| Resource metric | Baseline | Candidate | Scope |
| --- | ---: | ---: | --- |
| Reachable geometry/instance backing-buffer bytes, all profiles | 151,362,578 | 152,409,006 | +1,046,428 bytes; CPU ArrayBuffers, not total process/GPU memory |
| Reachable texture objects, desktop / phone | 84 / 82 | 90 / 88 | Six additional objects; all estimates available |
| Estimated texel bytes, desktop | 368,413,940 | 401,968,364 | +33,554,424; not measured VRAM |
| Estimated texel bytes, each phone profile | 205,071,104 | 238,625,528 | Same +33,554,424 estimate |
| Observed resource response-body bytes, all profiles | 23,778,848 | 32,199,123 | +8,420,275; encoded = decoded on this local server |
| Observed transfer bytes, all profiles | 23,806,748 | 32,229,123 | Includes recorded per-response overhead |
| Request count, all profiles | 93 | 100 | Three GLBs and local modules; zero zero-byte entries |
| Complete packaged bytes / file count | 27,435,283 / 107 | 35,855,558 / 114 | +8,420,275; package inventory differs from a development-page request list |

Each candidate inventory visit requested each GLB once, HTTP 200, total model
bodies 8,232,560 bytes. Route-visit loader diagnostics recorded 93.6 ms desktop,
119.7 portrait and 97.3 landscape from local load start through fetch/parse/decode/
normalization. This is not isolated decoder or GPU upload time. The texture-object
estimate includes reachable textures whether or not the current frustum has
caused their renderer allocation. Snapshot renderer geometry/texture counts were
572/71 to 525/77 desktop, 482/66 to 443/64 portrait, 473/70 to 453/76 landscape.
Lower object counts in one view do not establish lower total memory. Driver,
renderbuffer/MSAA, aliasing and hidden-cache allocation are not measured.

| Profile | Initial UI-ready median A / B (three short visits) | Reload UI-ready median A / B | Playing environment ready A / B (one inventory visit) |
| --- | --- | --- | --- |
| Desktop | 20,698 / 6,435 ms | 7,049 / 7,248 ms | 23,296.6 / 23,434.4 ms |
| Portrait | 16,431 / 6,421 ms | 6,984 / 6,766 ms | 20,891.3 / 19,327.1 ms |
| Landscape | 20,279 / 6,391 ms | 6,946 / 7,023 ms | 22,843.1 / 23,438.8 ms |

Earlier UI readiness does not establish faster complete loading: environment
readiness still took about 19–23 seconds in the separate visits and was slightly
slower for candidate desktop/landscape. OS/driver caches, native simulation and
machine activity are uncontrolled. Candidate varied visits also retained two
nonfatal shader compiler warning entries each (`X4122`, numerical precision);
runtime error arrays were empty. No warning was erased or treated as a pass for
the failed art gate. The results are local observations, not physical phone,
touch-to-display, thermal, battery or hosted-network predictions.

The complete readable summary is `artifacts/meshy-pilot/performance-final-summary.txt`;
its companion JSON retains exact unrounded values, command/source records and
raw-report hashes. The summary and every individual first/warm row are included
in `17_PERFORMANCE.txt` at export. No unfavorable run was replaced.

Actual recorded commands were `node artifacts/meshy-pilot/run-logged.mjs routes-final
tests/meshy-pilot-playtest.mjs`, then `... paired-final tests/first-use-timing.mjs`,
then `... resource-inventory-final tests/painterly-resource-inventory.mjs`.
Shared environment: baseline root `C:/Users/user/.codex/worktrees/meshy-pilot-baseline/Kiju Game`,
candidate root `C:/Users/user/.codex/worktrees/painterly-phase1/Kiju Game`,
URLs `http://127.0.0.1:4213` / `http://127.0.0.1:4214`, `HEADLESS=0`.
Varied routes used `MODE=paired-timing`, `GPU_TIMING=1`, `PILOT_REQUIRE_ASSETS=1`;
the short regression used `MODE=interleave`, `GPU_TIMING=1`, `PAIRS=3`.
Each used its distinct recorded output directory. Complete environment/arguments
and timestamps remain in execution JSONs, including child commands. All three
wrappers and all visits retained the exact baseline/final runtime fingerprints.
Protocol completion does not clear the failed art or multi-session save gate.

The real isolated packages are preserved under `artifacts/meshy-pilot/release-final/`:

| Package | Exact source | Build ID | Artifact SHA-256 |
| --- | --- | --- | --- |
| A | fad5bb2d0d4a3a07dbfdf2bdb681fd510abfb137 | 26b1430a85051682b840 | 0c48d90f16c1a57e052f8caaad78cf438eb74c38cec614a34340eb6cdfeb353e |
| B | 4ae03f4bac181fef7a819ca7ef0d6b54283f9aa8 | 0eacd1f8219d7c45bc11 | c5c9bf86ac8a713fed8d25cc4d15defe94fd575ab0f6fa1bd5d0e1f8754b6368 |

Both builds kept generated build-info confined to package output. Both source
checkouts remained clean. All three GLBs exactly match the frozen source, with
`model/gltf-binary` MIME, the local loader modules and the original pinned Three
module pair present. Authoring files and raw evidence are excluded. The candidate
main file after the two exact preload removals has the same SHA-256 as baseline
main: `a6fc7d0459a62f41f93a602e3dd13d3cb53c9066fc56a780f25af09a5711b806`.
The build did not open a browser or prove an installation/update result.
The original execution wrapper omitted `MESHY_PILOT`, `BASELINE_COMMIT` and
`CANDIDATE_COMMIT` from its environment whitelist. Its JSON remains unchanged.
`release-final/build-command-supplement.json` records the actual invocation and
explicit environment afterward, anchored to the original wrapper and build
report hashes; it is not a rerun or a new measurement. The build report itself
already recorded those values. The ignored wrapper now records these variables
and the pilot fixture/fault-injection options for future runs.

The unrestricted multiple-active-game save gate was already reproduced as
failed in the paused broad task: another active session can replace shared save
bytes. That behavior is neither repaired nor waived by this asset pilot. A
completed single-writer package update/save/offline/rollback pass establishes
only that narrower scope. The old title client can automatically
reload on activation; it must not be described as a proven old active-game
session safely writing alongside the new build. Original failures and their
precise timing/direction remain in
`artifacts/painterly/release-multisession-limit.txt` and its cited raw reports.

Physical iPhone/iPad, Safari/WebKit, battery/thermal behavior, long-session use and
the hosted protected origin remain unverified by local Windows checks. The
private delivery state remains **Configured but blocked**. No push, deployment,
readiness override or additional generation is authorized by this report.
The selected handoff is one flat folder of ten original PNGs and ten text files:
`artifacts/meshy-pilot/review-flat`. Raw models, traces, supporting captures and
the original unsuccessful attempts remain outside it. After this report is
committed, the exporter verifies the exact final source and original-image
hashes, writes the twenty files, and records the resulting count, size and
manifest verification alongside the folder. No ZIP or extra media is included.
