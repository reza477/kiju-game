# Beast integration — independent critic round 03

**Result: FAIL. Overall 8.1/10.** The native beast is a substantial improvement in face, horns, paws and hide. The complete presentation remains below the fixed 8.5 threshold: the starting city reads as a tall scaffold, and its plain supports and repeated buildings do not match the creature's finish. The strict animated-body self-crossing check also remains failed. Successful browser captures do not clear that defect or authorize release.

Reviewer: separate critic agent acting as a demanding AAA art director. I wrote no implementation, assets, tests or capture scripts. I invoked the existing tools myself, inspected my fresh original normal-HUD gameplay screenshots and inspected temporal samples decoded from my own native recordings. This is **round 3 of at most 4** in the owner-authorized beast-integration cycle. Round 1 remains 7.6/10 FAIL; round 2 remains 8.0/10 FAIL. The earlier four remake reviews remain unchanged. **One round remains.**

## Reviewed identity and design

- Worktree: `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`.
- Server: `http://127.0.0.1:4224/`, with the capture tools checking the source root.
- Committed runtime implementation: **`a192105ebcafe18c431a399f75fb8139b6ebc099`**. The matched five-view process and first native attempt used this clean checkpoint.
- Tool-only checkpoint for the four successful native motion processes: **`dfd569e44f31c7419bbabe94393e182a0ee3df61`**. It repairs response-byte capture, without changing the reviewed runtime. The first failed attempt is retained, not relabelled as passing.
- Exact runtime fingerprint throughout all these captures: **`bef17724ac55de669f80379c77ea7a74d524473ac920b81f7b9513c8d9cc9b7f`**. Each process records unchanged start/end runtime fingerprints; each native process also records unchanged commits within its own run.
- Active native asset: `assets/beast-integration/titanhorn-rigged.glb`, SHA-256 **`85cb7024f72e23737a1a64981d763dfbc9204f0c6a5dc65fa413df55455035a3`**.
- Local build ID: **`d433bbc1ac5692facda6`**. This is a local isolated build, not hosted-build verification.
- Previous reviewed integration: commit `4832146fc0b4e1d7de459f9474fa7a53c1f239f2`, runtime `e0e770dc6632c03e7c66b2312475bea6cd669a7d03141d58702a42a80ef9ca6e`, V13 asset SHA `b61609b1cb0756759fe968e612ac15a70480d39998dd14a83e560357c4a3d762`.

The latest owner design is authoritative: flesh uses a low quadruped saddle city with 20 mounts, including the approved wider lower rows; cyborg retains its half-height vertical Gothic castle. Preserve the six variants, mechanics, district identities/order, capacity and saves. Older tall-flesh-castle rules do not override the later owner clarification. This review does not authorize changes to protected upper mount positions. It identifies the appearance of the current frozen result; permission for any later refit does not retrospectively pass this candidate or reset the round count.

Since round 2, the candidate changes to the native 27-joint Meshy quadruped and its detailed material, a new controller and animated-surface correction, native paw contact and contextual melee motion, a rerouted saddle frame with physical weapons, and reclaimed-world scenery. The builder documents 17 places with vegetation and contact breakaway. Those implementation claims are distinguished below from what I actually observed.

## Own fresh evidence

All folders in this table are beneath `artifacts/critic-round-03/`. Each original PNG and WebM is retained unchanged. Reports preserve source snapshots, commands, tool hashes, timing, image hashes/dimensions, states and error lists.

| Folder | Coverage | UTC start–finish, 2026-10-21 | Exit |
| --- | --- | --- | --- |
| `beast-integration` | Five matched flesh AFTER views; native idle recordings and 90 RAF intervals per view | 16:39:45.339–16:42:06.810 | 0 |
| `beast-integration-populated-day` | First full-city day attempt; nine gameplay screenshots and native recording completed, but final served-asset identity verification failed | 16:42:39.565–16:43:33.888 | 1 |
| `beast-integration-populated-day-retry01` | Fresh full-city day retry: front, side, W walk, D turn, stop/recovery and City view | 16:48:45.266–16:49:38.734 | 0 |
| `beast-integration-populated-night` | Fresh full-city night: same native movement and viewing coverage | 16:49:53.616–16:50:50.171 | 0 |
| `beast-integration-combat-drill` | Full-city native Approach/Hold/Melee against drill crawler; start, impact window and recovery | 16:51:00.256–16:51:37.570 | 0 |
| `beast-integration-combat-cyborg` | Full-city native Approach/Hold/Melee against cyborg; start, impact window and recovery | 16:52:01.812–16:52:40.183 | 0 |

The matched original images are `AFTER-desktop-normal-city.png`, `AFTER-desktop-reverse.png`, `AFTER-desktop-close.png` at 1440×960; `AFTER-phone-portrait-city.png` at 780×1688; and `AFTER-phone-landscape-city.png` at 1688×780. Phone views are **desktop browser emulation**, not physical-phone evidence. All four successful native motion processes produced original 1440×960 screenshots: nine in each populated run and five in each combat run.

The five matched views use the same fixture SHA as every corresponding baseline view: **`6db0c30c4a62c6a8dce0b01eaa8b16a4aec98bd6ba9d66460491a5397aa7a5ec`**. The comparison baseline is `artifacts/beast-integration/baseline/report.json`, commit `6c7ee9b2ec3bb44aaefbc2ec3ea9bd86e9d60f5c`, runtime `d932c2814b11d323b8fe368e5e50fa940450276419545e82f3c2d588cdfcbcf1`. Normal/phone camera settings are yaw 2.35, pitch 0.28, zoom 40; reverse yaw is approximately 5.4915925; close zoom is approximately 30. Ordinary elapsed simulation time differs, so this is not a claim of identical animation phase.

The matched command was `node tests/art-remake-playtest.mjs`, with `SOURCE_ROOT` and `FIXTURE_ROOT` set to this worktree, `GAME_TEST_URL=http://127.0.0.1:4224/`, `OUTPUT_DIR=artifacts/critic-round-03/beast-integration`, `RUN_LABEL=AFTER`, `MODE=capture`, `CAPTURE_VARIANT=flesh`, `HEADLESS=1`, `RECORD_VIDEO=1` and `OBSERVE_FRAMES=90`. Tool SHA-256: `35a3acb127391e48809975b43f7a9501ee32765449a6da71e6fccd12d69dc6ce`.

The native commands were `node tests/native-beast-motion-playtest.mjs` with distinct `OUTPUT_DIR` values above, the same URL, `HEADLESS=1`, and the full `EXPECTED_RUNTIME_SHA=bef17724ac55de669f80379c77ea7a74d524473ac920b81f7b9513c8d9cc9b7f`. Populated runs used `SCENARIO=populated` and `LIGHT=day` or `night`; combat used `SCENARIO=combat`, `FULL_CITY=1`, `LIGHT=day` and `COMBAT_TARGET=drill` or `cyborg`. The failed tool SHA was `f8c7795347c857dc269a855bee487c1ab06731214d0874ce500752053cf968e2`; successful native runs used **`e400e642e5f8c7704c2708434dce3540d4b21e03d76c6eb779e7f131cdf59338`**. I did not edit either tool.

The first native attempt failed because Chrome evicted the large GLB's response body from its inspector cache. That run had no page errors or failed/remote requests, but could not establish the actual served asset hash. The builder then repaired capture-only CDP response buffering. Each of my four fresh retries records **120 actual served-response hashes**, including the asset, with `servedIdentityVerified=true`, no identity errors, no page errors, no failed requests and no remote requests. There was no response substitution. The earlier exit-1 report remains failed.

The populated fixture is a valid isolated production-generated save with all 20 districts at mixed levels. It proves loaded-city rendering/movement, not construction of all 20 districts through UI during these visits. The combat fixtures begin at valid saved battle entrances; subsequent approach, hold and attacks are ordinary native controls. W was held for 3200 ms and D for 1800 ms in each populated run. I did not manually advance simulation time or hide the HUD.

## Motion and visual observations

I inspected the original front/side and City views, the five matched desktop/phone views, the combat phases, and temporal samples from all four successful native recordings. Supplemental decoded frames are in `beast-integration-decoded-day`, `beast-integration-decoded-night`, `beast-integration-decoded-drill` and `beast-integration-decoded-cyborg`. They preserve full-frame 1440×960 content. They are lossy-video inspection samples, not replacements for original PNGs or an exhaustive per-frame mesh audit.

Using the installed Playwright FFmpeg executable, I decoded day seconds 42–50 and night seconds 45–53 at 3 frames/second; drill seconds 32–36 and cyborg seconds 34–38 at 6 frames/second. Day frames inspected include 004, 008, 013, 018, 021 and 024; night 005, 009, 013 and 017; drill 005, 009, 013 and 017; cyborg 001, 003, 007, 011, 015 and 021. The original videos retain the complete native sequences, including the preceding camera movements and approaches.

**The anatomy is materially stronger.** The front view has a coherent muzzle, horn roots, forehead, shoulders and readable toes/claws. The paws no longer read as the soft brown caps criticized in round 2. The body has a consistent hide treatment and an intelligible quadruped silhouette. Side and turn views still have sharp folds at the haunch and knee, but I am not labelling every natural-looking crease a proved visible hole. The geometric failure is addressed separately below.

**Movement and strikes remain readable in this bounded coverage.** The native recordings show alternating foot movement, body motion, turning and settling, with the loaded city carried through the motion. Drill contact shows a short bound/forelimb strike at the leading drill region, followed by recovery. Cyborg contact shows the forelimb rise toward its lower body and return. Both battles visibly register damage: drill 469→427 HP and cyborg 378→336 HP. I did not identify a new detached limb or giant girdle sheet in these samples. Short native screenshots do not necessarily coincide with the precise impact frame; the recordings supplement them.

The motion tool's read-only solver observations contain 104/59 W/D frames by day, 108/61 by night, 61 strike frames against drill and 58 against cyborg, with zero reported bad frames. The maximum sampled sole error across these runs is approximately 0.00000159, and minimum reported sampled skin clearance remains approximately 0.000499. These are limited controller/harness observations. They do **not** measure all animated skin triangles and do **not** supersede the failed self-crossing test.

**The saddle still lacks a convincing finished relationship to the body.** In the three-district matched normal, reverse, close and portrait views, long slender uprights lift the small buildings and two cannons far above the back. The gap is a major part of the silhouette. The resulting shape reads as an elevated rack or scaffold. In the 20-district front/side/City views, the lower occupied rows fill much of that gap and improve the relationship, but the top structure remains spare and the repeated little platforms read as separate applied shelves. I can see connecting supports; this is not an assertion of disconnected or literally floating buildings.

The bands generally remain close to the torso in the day/night walking and combat samples. I did not rediscover the old down-leg girdle loops from round 1. Their narrow, plain strips and changing oblique underside presentation still lack the finished material and construction detail of the creature. I have not certified absence of longitudinal warp in every pose. The builder's acknowledged remaining warp must not be described as eliminated on the strength of this review.

**The world has more context, but the overall finish remains uneven.** Fresh views contain broken stone pieces, fences, stored timber, small cultivated areas and denser plant relationships around the old structures and river. These details help the abandoned-world reading. Large terrain/cliff colour transitions, thin repeated canopy forms, repeated city roofs and the relatively simple frame/cannon forms remain conspicuous beside the detailed beast. The drill and cyborg battle views make that difference in finish particularly apparent. I did not tour all 17 added places or explicitly verify every breakaway contact, and this review does not certify them all. The other four carrier forms were not independently re-playtested in this round.

The normal HUD is retained and legible in the inspected desktop and emulated phone captures. The matched City composition favours the back-mounted city and sometimes crops feet or conceals the face; the native Titan front/side views provide the missing anatomical coverage. The night views retain readable silhouettes and warm occupied windows, although the many similar modules still compete weakly for a clear focal hierarchy.

## Technical evidence and concrete blocker

**B03-E1 — animated skin self-crossing remains a confirmed geometry/check failure.** The existing full-suite evidence is `artifacts/beast-integration/native27-cpu-combined-v2/checks/full-suite-01.json` and `.txt`. It runs `node --test --test-concurrency=2 tests/*.test.mjs`, starts at 16:20:25.241 UTC, ends at 16:24:44.249 UTC, and exits **1**: **433 tests, 432 pass, 1 fail**. Its recorded runtime matches the reviewed `bef17724…` fingerprint. The failed test is `native connected body avoids self-crossing through representative gait and six-target strike/recovery poses`, in `tests/beast-integration-native-self.test.mjs`.

The reported counts include 496 pairs at gait sample 60 and 1361 at cyborg strike sample 31; nonzero results occur across the representative gait/strike set. Counts alone are not projected visual severity. The supplemental independent geometry analysis in `artifacts/beast-integration/systems/native-self-audit-v8-01/FINDINGS.txt` distinguishes inherited source crossings from new motion crossings. It identifies 179 source-bind pairs, including 35 wholly single-bone pairs that remain unchanged, but also genuine new crossings at the right proximal haunch and left hind knee/haunch. For example, its gait-60 comparison finds 244 pairs newly appearing versus the prior same pose, 243 of which are absent from bind, touching 224 faces. These are not adequately dismissed as shared seams, floating-point epsilon or entirely inherited source noise.

That supplemental audit describes the underlying native corrective source and is not a fresh end-to-end visual proof for every combined-candidate combat pose. The exact combined-candidate full-suite failure is the primary required-check evidence. The fresh images do not let me attach a conspicuous pixel defect to every numerical crossing. Conversely, a subtle or occluded crossing does not make the required test pass. **This remains a concrete technical blocker, not ordinary polish.** Repair the moving-surface intersections and establish honest passing relevant evidence; do not reinterpret capture-tool success as acceptance or blanket-allowlist all inherited pairs to conceal new deformation failures.

No additional definite detached geometry, open mesh hole, giant girdle loop or runtime page failure was identified within my stated fresh visual coverage. Each successful native run records two nonfatal Three.js/ANGLE precision warnings (`X4122`); the first matched desktop view records the same warning class. They are retained as warnings, not silently suppressed or misreported as shader compilation failure. No shader failure or context loss was recorded.

The isolated active-source build, `artifacts/beast-integration/build-native-active-round03-01/report.json`, runs `node scripts/build-mobile-release.mjs --isolated --output-root artifacts/beast-integration/build-native-active-round03-01/output`, 16:38:28.524–16:38:29.895 UTC, exit 0, with the exact unchanged reviewed runtime. A successful build does not clear the failed geometry check or the art gate.

## Measured cadence limitation

The same existing matched-view tool observed 90 native requestAnimationFrame callbacks per view. These are short stationary Windows Chrome samples on an NVIDIA GeForce RTX 4070 Ti SUPER, with recordings enabled. They are not a physical-phone benchmark, exhaustive play-performance result or a declaration of a universal frame-rate requirement.

| Matched view | Round-2 mean interval | Round-3 mean / p95 | Round-3 callbacks/s |
| --- | --- | --- | --- |
| Desktop normal City | 15.66 ms | 28.66 / 32.8 ms | 34.89 |
| Desktop reverse | 17.05 ms | 29.88 / 33.3 ms | 33.47 |
| Desktop close | 15.22 ms | 27.59 / 32.8 ms | 36.24 |
| Phone portrait emulation | 14.33 ms | 29.27 / 41.9 ms | 34.16 |
| Phone landscape emulation | 13.26 ms | 25.72 / 32.5 ms | 38.88 |

The like-for-like raw evidence shows a substantial cadence cost. This deserves optimization and subsequent honest device validation; it cannot be described as proven smooth mobile performance. I have not inflated it into a measured physical-phone failure or treated these short samples as the sole basis of the art score.

## Scores

| Dimension | Score | Reason |
| --- | --- | --- |
| Game design/readability | 7.8 | The low carrier, 20 occupied mounts and native battle flow remain readable. Sparse-load presentation still weakens the saddle-city idea. This is not a balance review. |
| Interface presentation | 8.0 | Coherent restrained colours and typography, readable normal desktop and emulated phone HUD. |
| Environment art | 7.7 | Added reclaimed-world relationships help, but broad terrain transitions and repetitive foliage remain less authored than the focal creature. |
| Carrier and city art | 8.2 | Stronger native anatomy, toes and hide; thin elevated supports and repeated plain districts keep the combined carrier below the beast asset's strongest areas. |
| Overall aesthetics | 8.1 | Clear progress in the focal character, with an uneven level of finish across the complete scene and support structure. |
| **Overall** | **8.1** | Below the fixed 8.5 threshold; the known animated-skin check also remains failed. |

The overall score is a holistic judgment, not an arithmetic average or a reward for tool/test counts. The unchanged standard is 5 = programmer art, 7 = good indie, and 8.5 = the required AAA-quality threshold. Better asset resolution and a more convincing character do not alone bring the whole game to that threshold.

## Ranked corrections before the final available review

1. **Resolve the concrete moving-surface failure.** The strict test and the source audit require actual attention to the haunch/knee deformation. Preserve the demonstrated contacts and native strike behavior while correcting the failed body geometry. Distinguish source-bind defects from new motion defects explicitly; do not erase the recorded failure through scoring or claims based on attractive poses.
2. **Make the saddle structure convincing at both three and 20 districts.** The normal starting load exposes the long top supports and large air gap. A full load partially conceals it; that does not solve the starting composition. Improve the support mass, fitted pads, joints and load-bearing relationships within the owner's authorized layout constraints. Any separately approved mount refit belongs to the next candidate and must preserve the intended low quadruped city, 20 district identities/order and systems.
3. **Bring the districts and frame closer to the creature's finish.** The small repeated roofs, shelves, straight dark bars and sparse fittings read as a simpler asset set applied to a detailed body. Give the structure a considered material hierarchy and believable fastening details; use the existing ordinary City and front/side angles as the acceptance views. This is a quality deficit, not proof of disconnected geometry.
4. **Unify the surroundings and recover presentation cadence.** Retain the useful new ruined-world details, but improve the relationship between terrain/cliff masses, foliage and city materials. Address the observed runtime cost rather than relying on a static attractive image. The limited existing route does not certify all new place contacts or phone performance.

These quality corrections are separate from B03-E1 and are not all optional polish. The older soft-cap paw criticism is substantially improved by the native model; the old round-1 long-girdle defect is not being carried forward as if it were observed again.

## Ordinary ranked polish

1. Strengthen selective warm lighting around important occupied districts at night, without flooding every module equally.
2. Refine roof/window and hardware variation after the structural relationship is convincing.
3. Improve optional presentation angles that reveal the face, paws and saddle together; retain honest normal-HUD matched comparisons.

## Gate decision

**FAIL — 8.1/10, with the animated-body self-crossing check still failed.** Do not clear readiness or publish this candidate. One review round remains in this authorized integration cycle. The review, scores and original evidence must remain unchanged; later implementation requires fresh evidence and a separately identified final review. GPU and source capture holds were released after the four native processes finished. This report itself makes no runtime, test, asset, readiness or delivery changes.
