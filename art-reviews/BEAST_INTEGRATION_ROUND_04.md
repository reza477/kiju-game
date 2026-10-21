# Beast integration — independent critic round 04

**Result: FAIL. Overall 8.1/10.** The muted iron and aged brass are more cohesive, particularly on the cannons. This is a modest finish improvement. The starting saddle still reads as an elevated scaffold, the city and environment remain less developed than the beast, and the strict animated-body self-crossing check still fails. The candidate does not meet either the required 8.5 score or the zero-error condition.

This is **round 4 of 4**, the final review in the owner-authorized beast-integration cycle. The cycle is exhausted and must stop with this failed result. Round 1 remains 7.6 FAIL, round 2 remains 8.0 FAIL and round 3 remains 8.1 FAIL. The earlier remake reviews also remain unchanged. No passing review or release authorization is established here.

Reviewer: separate critic agent acting as a demanding AAA art director. I wrote no implementation, assets, tests or capture scripts. I invoked the existing capture tools myself and inspected my own fresh original normal-HUD screenshots and temporal samples decoded from my native gameplay recordings. Successful capture processes are evidence collection, not art acceptance.

## Reviewed identity and changes

- Active committed implementation: **`844cef276125957a7542d8c89d6c7889b511554d`**.
- Exact runtime fingerprint: **`db30d10d30472fd3a0b68f309fd3ad1aefbc7dfaeb425f78893f87e1f2123e0a`**.
- Local isolated build ID: **`3f85aa240e9dc7887e67`**. This is not hosted-build verification.
- Active asset: `assets/beast-integration/titanhorn-rigged.glb`, SHA-256 **`85cb7024f72e23737a1a64981d763dfbc9204f0c6a5dc65fa413df55455035a3`**.
- Worktree: `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`; local source server: `http://127.0.0.1:4224/`.
- Previous reviewed runtime implementation: `a192105ebcafe18c431a399f75fb8139b6ebc099`, runtime `bef17724ac55de669f80379c77ea7a74d524473ac920b81f7b9513c8d9cc9b7f`. Its later native-capture-tool checkpoint was `dfd569e44f31c7419bbabe94393e182a0ee3df61`.

The only submitted runtime changes since round 3 are the flesh saddle/cannon material finish and an allocation optimization in the native skin corrective. The source asset, harness geometry, mount coordinates, gameplay and other five carrier variants are unchanged. The finish uses the existing material map. The builder's exact-shape verifier reports 843 comparisons with identical position/normal buffers, bone matrices and non-timing diagnostics; that establishes preservation of the sampled shape, not a repair of its existing geometry defects.

The latest owner design remains authoritative: flesh is a low quadruped saddle city with 20 mounts and the approved wider lower rows; cyborg retains its half-height vertical Gothic castle. Preserve district identities/order, capacity, saves and the latest mechanics. No upper mount-height refit is part of this candidate. My criticism of its proportions does not authorize an unapproved layout change, restore older flesh-castle rules or reset the round count.

## Own fresh evidence and identity checks

The following folders are beneath `artifacts/critic-round-04/`. Original PNGs and WebMs remain unchanged. Each report retains the commands, source identity, image metadata and error lists.

| Folder | Fresh coverage | UTC start–finish, 2026-10-21 | Exit |
| --- | --- | --- | --- |
| `beast-integration` | Five matched flesh AFTER views, recordings and 90 native RAF intervals per view | 17:17:31.233–17:19:52.450 | 0 |
| `beast-integration-populated-day` | Full 20-district load: front, side, native W walk, D turn, stop/recovery, City view | 17:20:29.419–17:21:23.145 | 0 |
| `beast-integration-populated-night` | Same full-load viewing and movement coverage at night | 17:22:00.366–17:22:56.911 | 0 |
| `beast-integration-combat-drill` | Full-load native approach, hold, melee impact and recovery against the drill crawler | 17:23:21.438–17:23:59.588 | 0 |
| `beast-integration-combat-cyborg` | Full-load native approach, hold, melee impact and recovery against cyborg | 17:24:31.294–17:25:09.853 | 0 |

All five processes retained the exact reviewed runtime. Each native process also retained the same commit and verified **121 actual served-response hashes**, including the large GLB. All four native reports have `servedIdentityVerified=true`, no identity errors, no page errors, no failed requests and no remote requests. The five matched visits likewise report no page errors. Nonfatal shader warnings remain in the reports; they are not hidden or converted into page errors. There were no failed or substituted round-4 capture attempts.

The five original matched images are `AFTER-desktop-normal-city.png`, `AFTER-desktop-reverse.png`, `AFTER-desktop-close.png` at 1440×960; `AFTER-phone-portrait-city.png` at 780×1688; and `AFTER-phone-landscape-city.png` at 1688×780. Phone views are **desktop browser emulation**, not physical-phone evidence. The four native processes produced nine, nine, five and five original 1440×960 PNGs respectively. These are ordinary gameplay views with HUD; no beauty-only replacement was used.

The matched fixture SHA is **`6db0c30c4a62c6a8dce0b01eaa8b16a4aec98bd6ba9d66460491a5397aa7a5ec`**, matching the corresponding baseline views in `artifacts/beast-integration/baseline/report.json`. Baseline commit: `6c7ee9b2ec3bb44aaefbc2ec3ea9bd86e9d60f5c`; baseline runtime: `d932c2814b11d323b8fe368e5e50fa940450276419545e82f3c2d588cdfcbcf1`. Normal/phone settings are yaw 2.35, pitch 0.28, zoom 40; reverse yaw is approximately 5.4915925 and close zoom approximately 30. Elapsed simulation time and animation phase are not claimed to be identical.

I ran `node tests/art-remake-playtest.mjs` with `SOURCE_ROOT` and `FIXTURE_ROOT` set to the active worktree, the URL above, `OUTPUT_DIR=artifacts/critic-round-04/beast-integration`, `RUN_LABEL=AFTER`, `MODE=capture`, `CAPTURE_VARIANT=flesh`, `HEADLESS=1`, `RECORD_VIDEO=1` and `OBSERVE_FRAMES=90`. Unmodified tool SHA-256: **`35a3acb127391e48809975b43f7a9501ee32765449a6da71e6fccd12d69dc6ce`**.

I ran `node tests/native-beast-motion-playtest.mjs` with the full reviewed `EXPECTED_RUNTIME_SHA`, the same URL, `HEADLESS=1` and the distinct output folders above. Populated runs used `SCENARIO=populated` with `LIGHT=day` or `night`. Combat runs used `SCENARIO=combat`, `FULL_CITY=1`, `LIGHT=day` and `COMBAT_TARGET=drill` or `cyborg`. Unmodified tool SHA-256: **`e400e642e5f8c7704c2708434dce3540d4b21e03d76c6eb779e7f131cdf59338`**.

The full-city fixture is a valid isolated production-generated save with 20 mixed-level districts. It tests loaded presentation and native movement; I did not construct all 20 districts through the UI in these visits. Combat starts from valid saved battle entrances and then uses native controls. W and D are held for 3200 and 1800 ms respectively. I did not advance simulation manually or hide problems behind an alternate render.

## Actual visual and motion findings

I inspected all five matched originals, the full-city day front/side/City views, night front/side/turn/City views, and the ready/impact/recovery originals for both combats. The original videos preserve the full sequences. Supplemental full-frame decoded samples are retained in `beast-integration-decoded-day`, `beast-integration-decoded-night`, `beast-integration-decoded-drill` and `beast-integration-decoded-cyborg`.

Using the installed Playwright FFmpeg executable, I decoded day seconds 42–50 and night seconds 45–53 at 3 frames/second, and both combat recordings at seconds 32–38 at 5 frames/second. Inspected day/night frames include 004, 008, 013, 018, 021 and 024; inspected drill/cyborg frames include 002, 007, 012, 017, 022 and 027. These are temporal inspection samples from lossy recordings, not substitutes for original PNGs and not an exhaustive triangle audit.

**The finish is more cohesive, but the visual hierarchy barely changes.** Dark muted cannon bodies and restrained brass accents sit more comfortably with the existing frame, dark roofs and warm hide. The previous conspicuous purple/gold contrast is reduced. This improvement is visible in the normal, close and full-load views. It does not change the large shapes that dominate those views, so the overall score remains 8.1 at one-decimal precision.

**The starting saddle remains the main composition weakness.** Three small districts and two cannons sit high on slender uprights, leaving a large open gap above the back. Normal, reverse, close and portrait views expose this clearly. With all 20 districts occupied, lower rows fill more of the gap and improve the relationship to the body. The remaining repeated platforms and sparse top supports still resemble an applied rack. I can see the connecting frame; this is a proportion and construction-quality criticism, not an allegation that the buildings are literally detached or floating.

**The creature remains the strongest asset.** The face, horn roots, shoulders, paw outlines, toes and hide read coherently in fresh front and side views. Walk samples show alternating foot movement, body motion, turning and settling while carrying the loaded city. The native material change did not visibly damage the anatomy. I did not identify a new detached limb, gross skin hole or giant girdle sheet in these bounded samples. Sharp haunch/knee folds remain; I am not labelling every crease a separately proved hole.

**Both attacks remain readable.** Drill contact shows a short forward bound and forelimb action at the drill's leading region, then recovery; damage changes 469→427 HP. Cyborg contact shows the forelimbs rising toward its lower body and returning; damage changes 378→336 HP. The loaded platforms remain with the beast during these actions. The four native reports observe 105/62 W/D frames by day, 104/60 at night, 59 drill-strike frames and 58 cyborg-strike frames. These limited contact/controller observations do not test all skin triangles and cannot clear the independent self-crossing failure.

**The harness is not certified fixed in every pose.** The visible bands generally remain near the torso in these walk/turn/strike samples, and I did not rediscover the early cycle's large down-leg loops. The harness geometry is unchanged from round 3. Its plain narrow strips and changing underside presentation still look less finished than the creature. The builder's remaining longitudinal-warp concern cannot be declared eliminated from these selected angles.

**The environment and city retain uneven detail.** Reclaimed ruins, fences, timber and cultivated patches provide useful context, and night windows remain readable. Broad terrain/cliff colour transitions, thin repeated canopy forms, repeated roofs and simple shelf/frame construction remain obvious beside the detailed creature. The cyborg and drill are visible in actual combat, but this round did not independently play all other carrier forms or tour every reclaimed-world location. It also did not certify every vegetation-breakaway interaction.

The normal HUD remains readable in the inspected desktop and emulated phone images. The City camera sometimes conceals the face or crops feet; the fresh native Titan front/side views supply the needed anatomy coverage. No physical-phone or long-session performance claim follows from these captures.

## Concrete defect and required-check status

**B04-E1 — animated connected-body self-crossing remains a confirmed geometry blocker, carried forward from B03-E1.** The exact-runtime candidate suite in `artifacts/beast-integration/native27-cpu-round04-v1/checks/full-suite-01.json` and `.txt` still fails `native connected body avoids self-crossing through representative gait and six-target strike/recovery poses` in `tests/beast-integration-native-self.test.mjs`. This is not an ordinary polish request.

That suite ran `node --test --test-concurrency=2 tests/*.test.mjs` in the materialized candidate, **17:06:54.438–17:11:05.926 UTC**, exit **1**: **433 tests, 432 passed, 1 failed**. The report identifies the same `db30d10d…` runtime and unchanged candidate files. Its diagnostics report intersections across gait and strike samples, including 496 at `gait-60` and 1361 at `cyborg-strike-31`. Those counts include source-related pairs and must not be described as that many separately visible holes. The prior detailed source audit already established that the failure is not wholly explained by unchanged source-bind intersections. This candidate does not repair that geometry.

The allocation optimization's 843 bit-exact comparisons preserve the sampled old shape. They do not turn a previously failed shape into a passing one. Provenance is in `asset-sources/native-quadruped-final-finish-2026-10-21.json` and `artifacts/beast-integration/authoring/native-corrective-performance-v1/verification-01.json`.

The active-source isolated build did pass: `artifacts/beast-integration/build-native-active-round04-01/report.json`, `node scripts/build-mobile-release.mjs --isolated --output-root artifacts/beast-integration/build-native-active-round04-01/output`, **17:13:34.923–17:13:36.279 UTC**, exit **0**, exact reviewed runtime unchanged. Build success, zero browser page errors and attractive selected poses do not supersede the failed geometry check.

I identify no additional definite new visual/runtime defect from this bounded fresh coverage. This is not a zero-error certification: B04-E1 remains open, and unobserved poses and areas remain outside my direct coverage.

## Measured cadence and its limits

These are my own 90-RAF-interval stationary samples from the matched-view tool, with recordings enabled, on Windows Chrome using the NVIDIA GeForce RTX 4070 Ti SUPER. The phone rows are emulation on that machine.

| View | Round-3 mean interval | Round-4 mean / p95 | Round-4 callbacks/s |
| --- | --- | --- | --- |
| Desktop normal City | 28.66 ms | 28.92 / 32.9 ms | 34.58 |
| Desktop reverse | 29.88 ms | 29.00 / 32.8 ms | 34.49 |
| Desktop close | 27.59 ms | 26.35 / 32.7 ms | 37.95 |
| Phone portrait emulation | 29.27 ms | 25.30 / 32.2 ms | 39.53 |
| Phone landscape emulation | 25.72 ms | 24.27 / 32.5 ms | 41.21 |

The change is modest and mixed; normal City is essentially unchanged. These short measurements do not establish whole-game causation or physical-mobile performance. All five means remain materially slower than the round-2 means of 15.66, 17.05, 15.22, 14.33 and 13.26 ms respectively. The CPU-only optimization result must not be presented as proof that mobile performance is solved. This limitation is recorded separately from the concrete geometry failure and does not invent a new universal frame-rate requirement.

## Fixed-standard score

| Area | Score | Judgment |
| --- | --- | --- |
| Game-design presentation | 7.8 | The mobile-city idea and distinct factions remain readable; this is not a new balance evaluation. |
| Interface presentation | 8.0 | Coherent restrained palette and typography with readable normal desktop and emulated phone HUD. |
| Environment art | 7.7 | Useful reclaimed-world context; broad colour transitions and repetitive vegetation still limit the finish. |
| Carrier and city art | 8.2 | Strong creature and improved metal colour; sparse tall starting supports and repeated small districts remain weaker. |
| Overall aesthetics | 8.1 | A modest finish improvement within the same uneven overall level of craft. |
| **Overall** | **8.1** | **FAIL: below 8.5 and with B04-E1 unresolved.** |

The standard is unchanged: 5 = programmer art, 7 = good indie, 8.5 = the required AAA-quality threshold. The overall score is holistic, not an arithmetic average or a reward for asset resolution, elapsed effort or successful tooling.

## Ranked remaining issues and ordinary polish

The following remain open at the end of the exhausted cycle; this list is not a request to start another automatic round.

1. **Concrete defect:** the animated-body self-crossing failure, B04-E1. Resolve genuine deformation defects while preserving contacts and native strike behavior; distinguish inherited source intersections explicitly. A failed required check cannot be removed by a nicer material, a screenshot selection or a score adjustment.
2. **Major quality deficit:** the starting saddle's large air gap and thin elevated structure. It needs a convincing relationship to the body at the ordinary three-district state as well as full capacity. Any future refit must remain within the owner's authorized latest layout and preserve the 20 district identities and mechanics.
3. **Major quality deficit:** the districts, platforms and frame have less construction detail and authored variation than the beast. The new palette helps, but repeated small roofs, straight bars and plain shelf edges still look like a simpler asset set attached to a stronger character.
4. **Quality and validation limitation:** the remaining environment repetition and the measured native-rig cadence cost. These need honest treatment; physical-phone performance is not established here.

Ordinary polish opportunities, separate from defects and major deficits: refine edge wear and material roughness on exposed fittings; vary warm window brightness and resident activity for clearer focal emphasis; improve small fastener/pad details without moving protected mounts; tune local vegetation and ground colour relationships around existing landmarks. None of these polish items alone would clear the failed gate.

**Final disposition: 8.1/10 FAIL, round 4 of 4 exhausted.** Preserve this report and all prior findings unchanged. Do not release this candidate under the existing gate. All critic-owned browser sessions have closed and the GPU has been released. Evidence retention was checked against the current work group before capture; no cleanup was due or performed. No implementation, test, asset, capture-tool or readiness file was changed by this critic.
