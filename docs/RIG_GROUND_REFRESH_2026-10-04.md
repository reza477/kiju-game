# New Meshy rigs, ground cover and broken roads — 4 October 2026

## Scope and checkpoint

The owner requested their newer remeshed humanoid and monster, a repair for visibly distorted walking legs, efficient additional code-generated ground cover, and fragmented remnants of old human roads. This is a local visual/technical task. It does not authorize new gameplay, resource rules, combat timing, construction, collision or navigation changes.

The actual checkout is `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`, branch `codex/rig-ground-refresh-20261004`. Baseline `32e7d003645bdb8aece23745b434d1c5025033a7` is preserved by `codex/checkpoint-before-rig-ground-refresh-20261004` and an attached immutable baseline checkout. Its runtime/assets/dependencies fingerprint is `2d2e456035833fe3f5e3e1001e682e48bdbd1ca4a9aa6dd57f26f548e0d6dd0f`; build `815932f35b311a4002ab`. Existing useful visual work, technical repairs and recorded failed gates remain preserved. The Website project and player storage on origin 4214 are outside the test fixtures.

## Demonstrated old-rig problem

The original robot has 2,566 triangles, but polygon count alone does not explain the damaged-looking legs. Exact source-data comparison shows that texture compaction preserved every non-image buffer and normalized model metadata. Default bind-pose displacement is only floating-point noise. The robot's left boot averages 88.36% shin influence and 9.35% foot influence; its right boot averages 33.81% shin and 56.29% foot influence. The source rig therefore reacts asymmetrically to ankle corrections.

Across the recorded old-asset samples, at most 2 of 1,095 leg triangles shrink below 20% of their bind-pose area in the source clip, compared with 11 after the production foot correction. This demonstrates that the correction can aggravate source deformation. It does not prove that every bad pixel in the owner's exact screenshot has one isolated cause. The old monster was already denser (42,998 triangles), with a separate 66-joint static Smart Rig.

Original evidence is under `artifacts/rig-ground-refresh/diagnosis/`. The old source and diagnostic outputs are retained unchanged.

## Meshy workflow

The owner's two newest remesh jobs were allowed to finish. The first monster remesh download had no skeleton or clips. Meshy Smart Rig produced a new 54-joint monster; that export has no animation clips. Its four-legged motion is the local skeletal gait, not a claimed Meshy walking animation.

The new robot was rigged through Meshy's Humanoid flow with landmarks aligned to its visible joints, then exported with the Casual Walk animation. Export settings were GLB, Mixamo skeleton, Rigged Character on, All Added animations and Single file on. Its export contains 28 joints and Running, Walking and Casual_Walk clips. The game continues to use Casual_Walk.

The robot contains 57,620 triangles and the monster 57,692. New source downloads and settings/proof screenshots are preserved under `artifacts/rig-ground-refresh/originals/`. Texture-only production derivatives preserve geometry, skin weights, skeletons, inverse binds and animation data. No Blender, external asset service beyond the authorized Meshy account, or additional software was installed.

The verified Meshy account was `rezarhnm`; the visible balance remained 1,091 credits through included rigging and export. No purchase, billing change, project upload or asset publication occurred. Standing permission for existing Meshy credits remains in force.

## Ground attempt 1

The decorative cover layer uses deterministic placements, shared geometry and three opaque instanced draws. It increases the High-quality population from a maximum of 4,400 to 6,400 while revising blades, fern notches and branching bush silhouettes. Existing quality/distance reduction and GPU wind remain in use. The actual full production-record layout has 4,814 grass, 1,172 fern and 414 shrub instances: 95,580 triangles on High; 1,129 instances and 16,688 triangles on Performance.

Thirty-two irregular asphalt remnants and faded marking fragments use two merged static draws and 1,580 triangles. They conform to terrain, avoid protected resource areas, water, city clearings and old scenery, and do not create paths or interaction targets. The existing highway is unchanged. These decorative plants and roads are not new saved destruction owners.

The first paired CPU preservation run passes with all 1,665 existing scenery IDs, 633 original meshes/materials/transforms, 14,641 terrain/river samples, six resource proxies, saved destruction and all six faction simulation/save fixtures unchanged. This is CPU evidence only; final rendering, performance and independent visual acceptance are recorded below when completed. A preliminary scope-guard failure is retained separately and is not relabelled a pass.

## First frozen attempt

Build `a03f35de873979bac391`, fingerprint `e62a63ab39481a0fcb52b3b2de0b088dcb0dfc93320d2aac976561e27444e072`, passed 322/322 Node tests, 50 actual old/new carrier identity checks, all 42 baseline saves, and the production landscape-preservation checks. All six carrier variants also completed native four-direction movement in separate desktop browser contexts with stable source and no runtime/network failures. Ten Python texture-compaction checks passed. These are different kinds of evidence and do not imply a performance or art pass.

The independent first art review scored **7.1/10, FAILED**, with 16 original captures and an empty browser warning/error log. It found a clustered/tilted robot stance, an upward-curled quadruped front paw, and road fragments that read as clean rectangular tiles. Phone City HUD occlusion was recorded as a whole-game limitation, without attributing it to this asset pass or authorizing a HUD redesign. The unmodified review is `art-reviews/2026-10-04-rig-ground-refresh-round-01.md`.

The initial new-rig numeric deformation diagnostic remained unresolved: 27 of 23,954 leg triangles in the raw new clip versus 131 after the first adapter attempt fell below 20% of bind-pose area in the sampled cycle. This includes very small triangles and is not a visual score. It does not justify claiming that importing a denser mesh fixed the animation. The second attempt responds to the critic's visible pose findings.

## Second frozen attempt

Build `4470f6931eb1b992343a`, fingerprint `f007c30136f36006ecb82279aa21be9da1e1b04ef76e2bc7a2214d659ac0ce36`, passes **325/325 Node checks**, with no skips. The robot now blends its lower body to the inspected bind stance at rest, uses a consistent forward knee plane, and aligns the sole in model coordinates under the unchanged nonuniform body fit. The quadruped's support solver now ends at the wrist/hock, retaining the toe's source articulation. Tests inspect the complete weighted soles/paws, native travel and arrival turns at 15/30/60 Hz, the fixed resting footprint, and all six original combat contact targets.

The robot also avoids two redundant complete-boot scans after a pure world-Y support translation. Independent static inspection found no opposite-leg influence in either boot selection. A regression test records that asset assumption; a separate full-skin rescan verifies the resulting minimum-ground-gap metric across motion and stops. This is a reduction in repeated work, not a measured frame-rate claim.

Road remnants now have unequal broken ends, inward edge chips, missing asphalt wedges and sparse independent paint damage. The original route plan and protected-area exclusions remain unchanged. All geometry stays inside the previous safe footprints, and there are still two opaque static draws. The empty-layout geometry fixture decreases from 2,000 to 1,614 triangles and from 18.18 to 1.49 square metres of surviving paint; those fixture numbers are not the final production layout count. Eight road checks pass after a real winding error was corrected; the earlier failed output remains available.

The independent second review scored **7.8/10, FAILED**. Its 17 fresh original images and live travel/arrival inspection found the specific robot stance, quadruped paw and clean road-tile defects corrected. No new definite in-scope rig or road error was identified. Repeated ground-cover shapes, carrier surface hierarchy, road tonal variation and the previously documented City/phone framing limit still hold the result below the fixed art gate. The reviewer observed slow advancement and explicitly did not infer a frame rate or cause. Its unmodified report is `art-reviews/2026-10-04-rig-ground-refresh-round-02.md`.

## Third attempt rationale

A static count identified 16,560 skinned boot samples and approximately 37,481 repeated bone-world/inverse-bind matrix products in each robot pose update. These counts include the existing full-sole guarantees and are not measured frame cost. The next bounded optimization refreshes a double-precision bone palette for every sampler call, retaining the same vertices, skin weights, transform order, solver iterations and terrain sampling. It does not use the renderer's lower-precision bone palette or cache across changed poses. Independent numerical parity and actual A/B native routes must support any claimed benefit.

Grass changes from a radial star to five uneven upright blades with slightly separated roots and a subdued olive palette. It retains ten triangles per tuft, the same placements and quality subsets, three opaque instanced draws and the existing wind. Its shape contracts within the already protected placement footprint. This responds to the critic's remaining cheap ground-variation opportunity without adding a new scene system.

Frozen build `4018c8ac1ec3c1b7934a`, fingerprint `bab597fd6641368cb0be37f7c5fe04e64c4d51b861b67f0dba0905e371df1e06`, passes **328/328 Node checks**, 50 identity checks and 42 saved-game comparisons. The final production road layout in this attempt is **32 fragments, 1,271 triangles and two draws**. Ground population is **6,400**, in three draws, with 7,128 bytes of unique master geometry and 486,400 bytes of instance matrices/colours. These are the layer's buffer inventories, not measured total graphics memory. The protected 27 m starting clearing is unchanged; the 27–55 m ring has 319 added-layer plants versus the baseline's 322, while the 55–90 m ring increases from 418 to 547. The additional population is distributed through the eligible valley, not a claim that every immediate starting patch is denser.

Sampler parity passes **3/3** against the actual unmodified GLB and standard CPU skin path, including exact terrain sample coordinates after pose changes, nonuniform transforms and vertical support corrections. Across six alternating warm paired trials, the equivalent sampler loop median decreases from **3.89710 to 1.38085 ms (64.57%)**. The earlier R2 solver remains byte-identical outside the sampler/cache block. This is a CPU-kernel measurement, not a whole-frame, GPU, FPS, first-use or Apple-device performance result. The raw paired benchmark is `artifacts/rig-ground-refresh/sampler-attempt-03/report.json`.

The immutable baseline completed all **36 native timing windows** from 18:16:11 to 18:26:29 UTC, exit 0: two carrier variants, three viewport/quality profiles, three varied closed routes, each first traversal plus warmed repeat. No other intentional game renderer or CPU test suite was run during those windows. Light source/report editing continued in the separate candidate checkout. OS/driver caches and user/background machine activity remain uncontrolled. The candidate must complete the same conditions before a comparison is claimed.

The third independent review scored **7.9/10, FAILED**, with ten fresh original PNGs, no new concrete in-scope rig/road/grass error and no captured browser warnings/errors. It found the grass change visible at normal gameplay zoom and scored ground integration 8.0, while retaining the broader finish and existing framing limits. It did not reproduce the earlier slow capture/advancement observation and did not infer an FPS result. The original review is `art-reviews/2026-10-04-rig-ground-refresh-round-03.md`.

## Fourth and final visual attempt

Build `e5324a4555ec51f91c93`, final runtime fingerprint `fb242bf56124b45f6f5f9f2bd8d5a6f9e306ab01bb5928860042b6551ec62955`, adds only subtle dust and darker weathering in asphalt vertex colours after attempt 3. Road plans, geometry, normals, statistics and paint colours compare exactly; no new texture, draw or per-frame calculation is introduced. The whole game retains **328/328 Node passes**, the 50 carrier identity checks, 42 saved-game comparisons and full landscape preservation after this last runtime edit. The source remained stable in each execution. The final art review and browser results follow below when recorded; this paragraph is not a release claim.

The final independent round scored **7.9/10, FAILED**. Ten fresh originals and live native play found no new concrete in-scope rig, road or grass fault, and no browser warning/error entries. The road tonal change is modest and mainly visible close up. Broader surface hierarchy, landscape finish and the existing City/phone framing prevent an 8.5 result. The four-review limit is reached: no additional visual revision is authorized by this work group's loop, and no prior review or score has been rewritten. See `art-reviews/2026-10-04-rig-ground-refresh-round-04.md` for the independent findings and limits.

## Final browser and delivery evidence

Final native timing completed all 36 windows from 18:42:34 through 18:53:06 UTC, exit 0, on the unchanged final fingerprint. The paired baseline also completed 36 windows. Both used native RAF, ordinary City HUD, matched saved fixtures, the same three closed routes and first/warmed traversals on Windows Chrome with the NVIDIA RTX 4070 Ti SUPER / D3D11 backend. The desktop profile is 1440 by 960, High; portrait 390 by 844 and landscape 844 by 390 are touch/Performance emulation. There were no recorded frame intervals over 50 ms in either paired movement set. This excludes loading and initial expedition entry, which have separately recorded delays.

The final capture run passed all ten views (both carriers across five camera/profile views), with unchanged source. The selected handoff uses five matching before/after pairs, retaining original pixels, dimensions, fixture, profile and normal gameplay HUD. Independently captured critic images supplement these locally; they do not substitute for matched captures.

The final touch browser check passed all 13 groups with no captured runtime errors or remote requests. It exercised native touch movement and pinch, save export/import, previous-save recovery, rejection of damaged imports, rollback after a simulated renderer initialization failure, feedback export, portrait and landscape building controls, and resource travel. Its short motion sample is functional evidence, not the controlled A/B performance comparison. The construction checks use a documented accelerated test step; the separate performance routes use native time.

### Measured cost of the combined update

| Carrier / viewport | RAF interval p95 before / after (ms) | 1000 / mean RAF interval before / after (FPS) | Game callback p95 before / after (ms) |
| --- | --- | --- | --- |
| Robot / desktop High | 21.50 / 21.70 | 76.17 / 70.10 | 13.70 / 14.80 |
| Robot / portrait emulation | 20.70 / 21.30 | 87.73 / 80.73 | 11.90 / 12.80 |
| Robot / landscape emulation | 20.10 / 21.40 | 90.14 / 80.42 | 11.40 / 12.90 |
| Monster / desktop High | 21.60 / 21.80 | 74.75 / 68.15 | 13.80 / 15.10 |
| Monster / portrait emulation | 20.60 / 21.40 | 89.35 / 79.07 | 11.50 / 13.10 |
| Monster / landscape emulation | 21.10 / 21.50 | 84.97 / 76.95 | 12.10 / 13.30 |

Every measured combination is slower overall. The larger actual carrier meshes and additional dressing have a measurable cost despite the faster equivalent boot-sampling kernel. This is not an overall optimization or performance-acceptance claim. Frame p95 increases by 0.2 to 1.3 ms, and callback p95 by 0.9 to 1.6 ms. GPU timers, missing-query accounting, each first/warmed route, input-to-moving-frame latency and startup delays remain in `performance-final.json/.txt`; callback wall time includes driver blocking and is not pure CPU time. One sequential paired run is descriptive, not statistical significance. No other intentional renderer or heavy CPU test ran during the timing windows; OS/driver caches and unrelated background machine activity were uncontrolled.

Recorded route targets and initial fixtures match, but naturally sampled trajectories and poses are not identical: the maximum paired boundary-position difference is 2.997 m and the largest native elapsed-time difference is 6.762 s. Several boundary headings differ by pi because the directional correction finished on different last axes. These measurements do not isolate each component's contribution. The six visits per side each record the same two inherited `THREE.WebGLProgram` informational warnings containing D3D X4122 numerical-precision text: 12 warning entries on each side, not a warning-free run. There are no recorded shader failures, GL errors, invalid matrices or context losses. Valid GPU queries cover 38,289 of 39,296 baseline frames and 35,614 of 36,417 candidate frames; the 1,007 and 803 missing queries correspond exactly to pending-query skips, with no disjoint, expired-drain or busy discards. The independent evidence interpretation is retained as `performance-independent-summary.txt`.

The root's additional native exploratory session used disposable origin 4236. The new quadruped reached Amber Lowlands and Mourning Pines through normal resource buttons, gathered both resources, and was viewed from opposing angles. Normal construction added a fourth Dwellings storey directly above the previous three, completed without accelerated time, and increased capacity from 30 to 42. Save, page reload and Continue retained the flesh carrier, destination, four storeys and capacity. Four original PNGs, timestamped observations and an empty captured warning/error list remain under `exploratory-final/`. This short session does not claim exhaustive combat or long-session coverage. Player origins 4214 and 4178 were untouched.

Implementation is committed locally as `16397221305ed3450e701e3c5012abcdd0615fdb`. A clean detached checkout of that exact commit passed local package verification: **132 files, 130 precached files, 58,905,153 bytes**, package build `0958fdfa4c20b301b866`, artifact SHA-256 `32afbf5bb4f78ccccc59de42a28e547932f4714c47a4060f4a648c2b055f9e8b`. Both carrier GLBs and all required local modules match the tested source. The package has its own commit-bearing build metadata; it does not overwrite local PC build `e5324a4555ec51f91c93`. Source remained clean and unchanged. This is local packaging, not installation on Apple hardware or deployment.

The final packaged offline check passed **14 groups**, exit 0 with unchanged source. It verified complete offline preparation, both exact imported rigs and Meshy tree assets in the cache, native touch movement and saved-expedition reopening after the server was stopped and the browser network disabled. Deliberately removing a boot module opened the independent repair screen; explicit full-cache repair restored the game without deleting its save. There were no captured browser runtime errors or third-party requests. This is local Windows Chrome offline/cache-repair evidence, not an A-to-B update, unrestricted multiple-session test, hosted installation, physical Apple test or deployment.

No physical iPhone/iPad, Safari, thermal/battery, hosted deployment, A-to-B update or unrestricted multiple-active-game save guarantee is established by this task. Existing `delivery/readiness.json` remains false; the private delivery lane remains **Configured but blocked**. No push, deployment, publication or billing change occurred.

The existing owner PC origin `http://127.0.0.1:4214/`, stable launcher origin `http://127.0.0.1:4178/`, and isolated test origin 4219 all independently serve Colossus Wake build `e5324a4555ec51f91c93` from the correct actual checkout. The recorded root identity is `84b968458dd7ce77e9638e16f39a1b0633f618c009ee4c83add79eefa28d4dae`. These are local running servers, not a hosted deployment. Player storage on 4214 and 4178 has not been reset or used for test fixtures.

## Reporting identity and handoff

The subsequent reporting commit changes only this report and the evidence-retention ledger. Runtime/assets/dependencies remain byte-identical to implementation commit `16397221305ed3450e701e3c5012abcdd0615fdb` and the final tested fingerprint. The immutable local package was built from that implementation commit. The flat-folder manifest records both the full baseline and final reporting commit; pre-commit tests retain their actual earlier HEAD and tested file hashes rather than being relabelled as runs made after the commit.

The handoff is reporting-only: exactly ten original gameplay PNGs in five matched pairs and ten text files, including full changed source, committed diff, original results, verbatim independent reviews and hash manifest. No evidence image is retouched, cropped, upscaled or replaced with an intermediate attempt. Phone screenshots are labelled emulation. Raw masters, videos and additional diagnostic/review/exploratory images remain local outside that folder. This is the first evidence-producing request after the last cleanup; no earlier work group is deleted in this task.
