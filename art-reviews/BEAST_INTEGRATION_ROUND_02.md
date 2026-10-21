# Beast integration — independent critic round 02

**Result: FAIL. Overall 8.0/10.** Passing requires at least 8.5/10 and zero identified visual/runtime errors. The former long girdle loops and sheets are resolved in this round's fresh day/night and full-city drill-combat evidence. The replacement now holds together much better, and the coherent paw colour is an improvement. The complete carrier still has uneven anatomical, material and construction finish. No new definite visual/runtime error was identified within the stated coverage, but the visual quality remains below the fixed threshold. Do not release this candidate.

Reviewer: separate critic agent acting as a demanding AAA art director. I wrote no implementation, assets, tests or capture scripts. I ran the existing capture tools myself and inspected my own fresh original gameplay PNGs and samples decoded from my own native recordings. This is **round 2 of at most 4** in the newly authorized beast-integration cycle. Round 1 remains 7.6/10 FAIL. The earlier remake scores of 6.2, 6.7, 7.2 and 7.4 remain unchanged and failed.

## Reviewed identity and design

- Worktree: `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`.
- Server: `http://127.0.0.1:4224/`; the tools verified its source root.
- Clean committed candidate: **`4832146fc0b4e1d7de459f9474fa7a53c1f239f2`**. The capture source snapshots record this commit and a clean tree.
- Exact reviewed runtime fingerprint: **`e0e770dc6632c03e7c66b2312475bea6cd669a7d03141d58702a42a80ef9ca6e`**. All four fresh capture processes recorded the same fingerprint before and after execution.
- Local generated build ID: `7220a6a5891358c2afd5`; generated `COMMIT_ID` is `local`. This is not a hosted-build verification.
- Active V13 derivative: `assets/beast-integration/titanhorn-rigged.glb`, SHA-256 **`b61609b1cb0756759fe968e612ac15a70480d39998dd14a83e560357c4a3d762`**.
- Prior integration review: HEAD `6c7ee9b2ec3bb44aaefbc2ec3ea9bd86e9d60f5c` plus the uncommitted V10c implementation, runtime `d6162e4da0516b0ed13adb07d77bc1fd2f71b9dd91cd826acf6d121e41d864f9`, 7.6/10 FAIL. That HEAD alone did not contain the reviewed V10c changes.

The latest design remains authoritative: flesh uses the quadruped and low saddle city with 20 existing mounts; cyborg uses its half-height vertical castle. Preserve all six variants, current systems, district identities/order and saves. The stale tall-flesh-castle instructions do not override the owner's subsequent clarification.

Since round 1, the builder replaced the leg-following girdles with connected oblique torso-contour bands, a continuous width strip and circumscribed support geometry. The candidate also has a lower right strike elbow and phased left support bend, coherent paw UV charts with a 42-entry tonal correction, and smooth upper-back clearance relief. V14/V15 paw experiments were rejected and are not active. This change description comes from the candidate's source/provenance and builder documents; the visual findings below come from my fresh evidence.

## Own fresh evidence

All folders below are under `artifacts/critic-round-02/`. Original PNGs and WebMs remain unchanged. Each `report.json` contains the executable, arguments, environment, timestamps, exit code, source/tool hashes, camera state, image dimensions/hashes and bounded checks.

| Folder | Fresh coverage | UTC start–finish | Exit |
| --- | --- | --- | ---: |
| `beast-integration` | Five matched flesh views: desktop normal City, reverse, close; phone portrait and landscape City; native idle recordings and 90 RAF intervals per view | 2026-10-21 11:03:08.984–11:05:13.449 | 0 |
| `beast-integration-populated-day` | All 20 mounts occupied; front and side Titan views; native W movement, D turn, stop/recovery and City view; daylight | 2026-10-21 11:06:11.683–11:06:57.363 | 0 |
| `beast-integration-populated-night` | Full-city front/side/movement/stop coverage; night selected using the ordinary lighting button | 2026-10-21 11:07:22.740–11:08:10.932 | 0 |
| `beast-integration-combat-drill` | All 20 mounts occupied; actual drill-crawler battle, native Approach, Hold and Melee strike; wind-up, impact window and recovery | 2026-10-21 11:09:16.425–11:09:50.134 | 0 |

The four processes produced **28 original gameplay PNGs across eight visits**, with normal HUD and native recordings. The tools were:

- `tests/art-remake-playtest.mjs`, SHA-256 `35a3acb127391e48809975b43f7a9501ee32765449a6da71e6fccd12d69dc6ce`.
- `tests/beast-motion-playtest.mjs`, SHA-256 `4504060caa6d57ffd2cdda0b1e66a78e3dc24fe5b285e431c744b3784f188de0`.

The matched command ran `node tests/art-remake-playtest.mjs` with `GAME_TEST_URL=http://127.0.0.1:4224/`, `CAPTURE_VARIANT=flesh`, `RUN_LABEL=AFTER`, `HEADLESS=1`, `RECORD_VIDEO=1`, `OBSERVE_FRAMES=90` and the fresh matched output directory. The motion commands ran `node tests/beast-motion-playtest.mjs` with the same server and `HEADLESS=1`, first `SCENARIO=populated LIGHT=day`, then `SCENARIO=populated LIGHT=night`, then `SCENARIO=combat FULL_CITY=1 COMBAT_TARGET=drill LIGHT=day`. Each had its own fresh output folder. Exact executable/arguments/environment are retained in the reports.

All visits passed their bounded runtime checks. There were **zero browser errors, zero failed requests and zero remote requests**. Eight repeated D3D shader precision warnings were retained across the four processes. They are not hidden or counted as page failures. No context loss or non-runnable shader was reported.

Desktop original PNGs are 1440×960; the matched High-mode canvas is 1800×1200. Phone original PNGs are 780×1688 and 1688×780, while their Performance-mode canvases are 487×1055 and 1055×487. The phone views are **Windows Chrome emulation**, not physical-phone or Safari verification. PNG dimensions do not imply the same native 3D render resolution. The matched tools retained the established flesh camera targets rather than concealing problem areas with a new comparison framing. Front/side and motion views supplement the partly occluded normal City framing.

### Native motion and loaded drill combat

Daylight W held for 3262.74ms and travelled 35.4288m; D held for 1865.45ms and travelled 20.0310m. Night W held for 3252.56ms and travelled 35.4772m; D held for 1857.99ms and travelled 19.9023m. Original `02a-walking.png` and `03a-turning.png` were captured while the respective keys were held. Read-only native display-solver observation covered 308 daylight and 315 night frames with zero reported endpoint/length failures across the four display chains. This supports bounded target tracking, not attractive skinning at every possible instant.

The combat report confirms `rival5`, faction `crawler`, variant `drill`, production melee reach 43.23, and all 20 occupied mounts. A real player melee event dealt 42 damage, reducing enemy HP from approximately 469 to 427. Its event time was 5.5540 and impact time 6.2540, preserving the 0.7-second event interval in this run. `04-strike-impact-window.png` was requested from pre-capture battle time 6.1643. Screenshot acquisition and animation are not atomic; this image is not an exact impact-frame measurement.

I inspected original full-city front/side, active walking/turning and stop/recovery images in daylight and night, and the loaded drill melee-ready, strike and recovery images. I also decoded the unchanged day and drill recordings with the existing bundled ffmpeg, without resize, crop or retouch. Both commands exited 0 at 11:11:24 UTC. `beast-integration/decoded-motion/decoding.json` and its logs record exact commands and timestamps. There are 28 day samples and 63 drill samples; inspected examples include `day-012.png`, `day-020.png`, `drill-040.png`, `drill-044.png`, `drill-048.png` and `drill-052.png`. These compressed recording samples supplement the original PNGs and do not replace them.

In the sampled movement and strike sequence, the body, limbs and loaded city remain attached. The torso bands stay near the body instead of forming the previous long angular sheets between the legs. I did not identify an explosive deformation, detached body part or definite city/limb penetration in this evidence. A finite set of views and frames cannot certify every hidden surface or continuous-time pose.

The populated city was prepared as a valid isolated save using production construction/upgrade functions; this does not claim that all 20 districts were built through native UI. The battle likewise begins from a valid prepared save. No new all-six-variant gameplay, long-session, offline/update, physical-device or hosted-delivery certification was performed by this critic.

### Bounded performance observation

CPU/GPU measurement hold was coordinated during the five-view process. On the reported NVIDIA RTX 4070 Ti SUPER through ANGLE D3D11, the 90-interval median/p95 values were:

| View | Median / p95 native RAF interval |
| --- | --- |
| Desktop normal City | 11.2 / 21.6ms |
| Desktop reverse | 20.7 / 21.6ms |
| Desktop close | 11.1 / 21.6ms |
| Phone portrait emulation | 10.9 / 21.2ms |
| Phone landscape emulation | 10.9 / 21.2ms |

These are short stationary native callback observations, not GPU timings, sustained performance, physical-phone benchmarks or a before/after speedup claim. No additional performance benchmark was run during supplemental motion. The measurement hold was released after the matched views.

## Supplemental builder checks and provenance

I read the retained builder execution evidence; I did not independently rerun the full technical suite. `artifacts/beast-integration/checks/full-v13-round02.json` and its `.txt` output record `node --test tests/*.test.mjs`, **388/388 passed, zero failed/skipped/cancelled, exit 0**, from 10:52:14.847 to 10:52:41.942 UTC. Its runtime fingerprint was `b5152ee6a4813c5ffd323d0b3ea85d4e7a791217a22e59a681c0ab75fdacecb5`. The retained test/tool fingerprint is `39818dd7a0667316f0cbd6b306addffc14c146b9f1d8ccb8c6bac64c7ee08cd4`.

The reviewed documents `docs/BEAST_INTEGRATION_2026-10-20.md` and `docs/BEAST_SADDLE_HARNESS_2026-10-21.md` identify successful dense body and harness checks at runtime `331a3c320d98812932de314a6924b4fc2b148aa00f2a112c407c8c5fbacb62a3`: six production combat targets × 79 sampled frames, including the drill support-arm/recovery route. The retained body run spans 10:48:42.345–10:49:52.354 UTC; harness runs span 10:48:54.523–10:51:02.290 UTC. These checks cover the stated complete slab/skin/strap surfaces and unchanged clearance guards at those samples, rather than proving continuous-time clearance. Earlier failed attempts remain retained; rejected paw derivatives are not substituted into this review.

The full-suite source and final reviewed source are not byte-identical. `artifacts/beast-integration/envelope/hygiene-provenance-v13-round02-certified.json` records 146 runtime files: 143 byte-identical, exact terminal-LF removal in `src/harness-envelope.js` and `src/saddle-harness.js`, and the generated build-ID update in `src/build-info.js`. It records the older certificate commit `d6676fa8cc19ffb4e98f8096cf10940fbc677e7d` and the same final runtime fingerprint as this review. **I independently compared all 146 certificate current hashes with my fresh capture source hashes: zero differences.** This bridges the documented formatting/build-metadata changes without claiming that the complete test suite executed after them.

`artifacts/beast-integration/checks/build-v13-round02-whitespace.json` records `node scripts/build-mobile-release.mjs`, exit 0, from 10:55:33.783 to 10:55:34.907 UTC, ending at the exact reviewed runtime fingerprint. Passing technical checks and build provenance support the candidate's technical status; they do not determine its art score or clear the release gate.

## Scores

| Dimension | Score | Reason |
| --- | ---: | --- |
| Game design/readability | 7.8 | The travelling low city, 20-mount load and battle flow remain readable, and the corrected attachment improves the intended relationship. This is not a balance review. |
| Interface presentation | 8.0 | Restrained typography and colours remain coherent, with legible normal desktop and emulated phone HUD. |
| Environment art | 7.4 | The palette supports the beast, but broad terrain colour transitions and repeated thin tree/canopy forms still lack the authored finish of the focal asset. |
| Carrier and city art | 8.1 | Strong face, horns and hide, corrected torso bands and improved paw colour; paws, limb joins and platform/frame finish remain uneven. |
| Overall aesthetics | 8.0 | A convincing improvement over round 1, but the complete scene does not sustain the head's level of finish. |
| **Overall** | **8.0** | Below the fixed 8.5 threshold despite resolving the previous concrete attachment error. |

The overall score is a holistic judgment, not an average inflated by functional test results. The standard remains 5 = programmer art, 7 = good indie, and 8.5 = the required AAA-quality threshold. The unchanged environment's score is based on its appearance in these fresh flesh views, not a new exhaustive world or other-faction audit.

## Concrete errors and previous defect disposition

**No new definite visual or runtime error identified within this round's bounded evidence.** This is not a claim that every pose, save or game situation is error-free.

The round-1 girdle defect is **resolved in the reviewed coverage**. Compare the fresh full-city `01c-full-saddle-side.png` and `03a-turning.png` in both lighting folders, the fresh matched reverse/close images and the decoded movement/strike samples: the long down-leg loops and broad sheets are absent. The straps now follow the torso. The previously failed whole-face harness checks also have passing replacement evidence. I am not retaining the old defect as if it were still observed, nor declaring technical checks alone sufficient for visual acceptance.

## Ranked quality corrections before resubmission

These are art-quality deficits, separate from the concrete-error count. They explain the failed score and are not all merely optional polish.

1. **Finish the paws and anatomical transitions to the head's standard.** The V13 charts have reduced the obvious patchwork and inconsistent tones. The actual paw silhouettes still read as soft brown caps with little convincing toe/pad structure, and the join from furred limb to paw is abrupt. The close rear view retains a narrow, sharp haunch crease and stretched surface direction; the near forelimb in the full-city turning view has an abrupt light/dark transition. See `beast-integration/AFTER-desktop-close.png`, `AFTER-phone-portrait-city.png`, and `beast-integration-populated-day/01c-full-saddle-side.png` and `03a-turning.png`. I am not asserting a proved open mesh hole or detached limb from these images. The observed form and surface continuity themselves remain weaker than the face. Improve them in the actual loaded/posed mesh while preserving original contacts and combat timing; additional resolution alone will not fix the form.
2. **Give the corrected saddle attachment a convincing finished construction.** The route is now coherent, but simple dark frame bars, similar small shelves and sparse visible coupling detail still make the districts look applied to the hide. In the full-city front/side views, the beast has a sculpted organic identity while the support system reads as an assembly of plain parts. Refine pads, strap edges, buckles, support joints and their material/weight relationship. Preserve the low silhouette, approved 20 mount coordinates, capacity and district order. This is a finish deficit, not a claim that the retained finite clearance tests failed.
3. **Unify the scene's level of finish.** The detailed creature makes repeated little roof forms, the plain support structure and broad soft terrain transitions more conspicuous. The fresh normal City, full-city side and combat views do not yet share one equally considered material/form hierarchy. Bring selective surrounding city and ground details to the focal asset's level without changing the game's systems or replacing the approved low saddle layout. Clearing a deformation bug is necessary progress, but does not by itself make the whole presentation AAA quality.

## Ordinary polish opportunities

1. Concentrate warm night accents around occupied saddle districts; most modules remain similarly dark in the fresh full-city night views.
2. Improve complementary viewing angles that reveal the face and foot contacts, while preserving the established matched framing for comparisons.
3. Add restrained roof/window and hardware variation after the anatomical and structural finish work.

## Gate decision

**FAIL — 8.0/10; no new definite concrete error identified within the bounded coverage, but the overall score is below 8.5.** This is round 2 of at most 4 in the new integration cycle; **two rounds remain**. Revise the ranked quality issues, complete relevant checks and submit a newly identified frozen candidate for independent review. This report does not clear readiness or authorize publication. Preserve the score, findings and original evidence unchanged. GPU and source capture holds are released.
