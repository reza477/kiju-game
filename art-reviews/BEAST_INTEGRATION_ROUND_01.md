# Beast integration — independent critic round 01

**Result: FAIL. Overall 7.6/10.** Passing requires at least 8.5/10 and zero identified visual/runtime errors. The replacement has a substantially stronger face, horn silhouette and organic material identity. The saddle girdles still fail as an attachment: they follow the leg region and deform into long angular loops or sheets between the legs. The head is also more finished than the paws, limb transitions and saddle structure. Do not release this candidate.

Reviewer: separate critic agent acting as a demanding AAA art director. I wrote no implementation, assets, tests or capture scripts. I ran the existing capture tools myself, inspected my own fresh original gameplay PNGs and samples decoded from my own native recordings, and wrote this report. This is the first review in the newly authorized beast-integration cycle, with at most four rounds. The earlier remake scores of 6.2, 6.7, 7.2 and 7.4 remain unchanged and failed.

## Reviewed identity and design

- Worktree: `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`.
- Server: `http://127.0.0.1:4224/`; the capture tools verified its source root.
- HEAD: `6c7ee9b2ec3bb44aaefbc2ec3ea9bd86e9d60f5c`, **plus the uncommitted V10c implementation**. The HEAD alone does not contain the reviewed changes.
- Exact reviewed runtime fingerprint: **`d6162e4da0516b0ed13adb07d77bc1fd2f71b9dd91cd826acf6d121e41d864f9`**. All four capture processes recorded that fingerprint before and after execution.
- Local generated build ID: `b4b465fc38d6b73ea472`; generated `COMMIT_ID` is `local`. This is not a hosted-build verification.
- Active derivative: `assets/beast-integration/titanhorn-rigged.glb`, SHA-256 `ea3f0dff1a2cef1d6061a3a06492eb157892897d953315ed658c72da477494ea`.
- Previous independently reviewed presentation: `70cf5e0d280eadcd36bfd56f7f6c4e3edd26512f`, runtime `d932c2814b11d323b8fe368e5e50fa940450276419545e82f3c2d588cdfcbcf1`, 7.4/10 FAIL.

The latest design controls: flesh is a quadruped with a low saddle city and 20 existing mounts; cyborg retains its half-height vertical castle. The original six variants, district identities/order, systems and saves are to be preserved. The older tall-flesh-castle text does not override that clarification.

Since the previous reviewed build, the flesh body has been replaced with the private Titanhorn derivative and its original 2K Meshy texture payloads. Four presentation limb chains have been added alongside the original 54-joint contact rig. The saddle now uses closed, skin-following girdles and buckles. The current environment, architecture and HUD remain the earlier remake presentation. I also inspected the preserved `artifacts/beast-integration/baseline/BEFORE-desktop-reverse.png` for comparison; it is baseline evidence, not a fresh acceptance capture.

## Own fresh evidence

All paths below are under `artifacts/critic-round-01/`. Original PNGs and WebMs remain unchanged. Each `report.json` records the executable, arguments, environment, timestamps, exit code, source/tool hashes, camera state, image dimensions/hashes and bounded checks.

| Folder | Fresh coverage | UTC start–finish | Exit |
| --- | --- | --- | ---: |
| `beast-integration` | Five matched flesh views: desktop normal City, reverse, close; phone portrait and landscape City; native idle recordings and 90 RAF intervals per view | 2026-10-21 09:23:15.994–09:25:58.219 | 0 |
| `beast-integration-populated-day` | All 20 mounts occupied; front and side Titan views; native W movement, D turn, stop/recovery and City view; daylight | 2026-10-21 09:26:24.700–09:27:17.892 | 0 |
| `beast-integration-populated-night` | Same full-city front/side/movement/stop coverage; night selected through the ordinary lighting button | 2026-10-21 09:27:51.867–09:28:47.838 | 0 |
| `beast-integration-combat` | Saved battle entrance, native Approach, Hold and Melee strike; wind-up, impact window and recovery | 2026-10-21 09:29:17.256–09:30:01.768 | 0 |

These four processes produced **28 original gameplay PNGs across eight visits**, with normal HUD and native recordings. The tools were `tests/art-remake-playtest.mjs` (SHA-256 `35a3acb127391e48809975b43f7a9501ee32765449a6da71e6fccd12d69dc6ce`) and `tests/beast-motion-playtest.mjs` (`dae6a9324edc463751cc946d63ba417709eeb6ff07a1b0fb20e5e9b141b020a0`). The matched run used `CAPTURE_VARIANT=flesh`, `RUN_LABEL=AFTER`, `HEADLESS=1`, `RECORD_VIDEO=1` and `OBSERVE_FRAMES=90`. The supplemental runs used `SCENARIO=populated` with `LIGHT=day` and `night`, then `SCENARIO=combat` with `LIGHT=day`, all with `HEADLESS=1`. Exact output paths and full commands are retained in the reports.

All visits passed their bounded runtime checks. There were **zero browser errors, zero failed requests and zero remote requests**. Eight repeated D3D shader precision warnings were retained across the four processes; they are not counted as page failures or silently omitted. No context loss or non-runnable shader was reported.

Desktop original PNGs are 1440×960; the matched High-mode canvas is 1800×1200. Phone PNGs are 780×1688 and 1688×780, while their Performance-mode canvases are 487×1055 and 1055×487. Phone evidence is **Windows Chrome emulation**, not physical-phone or Safari verification. PNG dimensions are not the same as native 3D render resolution.

### Native motion and combat

Daylight W held for 3250.33ms and travelled 35.4211m; D held for 1852.52ms and travelled 20.0211m. Night W held for 3252.98ms and travelled 35.3111m; D held for 1863.18ms and travelled 20.0200m. Original `02a-walking.png` and `03a-turning.png` were captured while the respective keys were held. Read-only native display-solver observation covered 317 daylight and 311 night frames with zero reported endpoint/length failures. This supports target tracking; it does not prove that all visible skin or straps deform attractively.

The actual player melee event dealt 42 damage, reducing crawler HP from approximately 469 to 427. Its event time was 7.8802 and impact time 8.5802, preserving the 0.7-second event interval in this run. `04-strike-impact-window.png` was requested from a pre-capture state at battle time 8.4602; screenshot acquisition and animation are not atomic. It must not be labelled an exact impact-frame measurement.

I decoded unchanged day and combat recordings for inspection, retaining the command logs and metadata in `beast-integration/decoded-motion-r1/`. Inspected samples include day frames 012, 016, 020 and 024, and combat frames 014, 018, 020 and 024. The body and city remain present through the sampled gait and raised-arm/recovery poses; I did not observe an explosive body deformation or detached limb. The girdle distortion is conspicuous in successive poses. The video frames are compressed recording samples, not replacements for original PNG screenshots. Initial decoding attempts failed because the bundled ffmpeg lacks the null muxer and requested fps filter; those logs remain in `decoded-motion/`. The output-rate retry exited 0 for both recordings, without resizing or retouching.

The populated city was prepared as a valid isolated save using production construction/upgrade functions. This run does not claim all 20 districts were built through native UI. The battle likewise begins from a valid prepared save. I did not run a new all-six-variant gameplay, save-roundtrip, long-session, offline/update or physical-device certification. No hosting or delivery gate was exercised.

### Bounded performance observation

CPU/GPU measurement hold was coordinated for the matched five-view process. On the reported NVIDIA RTX 4070 Ti SUPER through ANGLE D3D11, the 90-interval median/p95 values were 20.0/20.1ms desktop normal, 19.9/20.1ms reverse, 10.1/20.1ms close, 10.1/20.1ms portrait and 10.0/20.1ms landscape. These are short stationary native callback observations, not GPU timings, sustained performance, phone benchmarks or a before/after speedup claim. No additional performance measurements were taken during supplemental motion.

## Supplemental builder checks

I read `artifacts/beast-integration/systems/focused-attempt07-v10c.json`: **19 of 20 tests passed, exit 1**, from 09:17:14.648 to 09:17:59.642 UTC. Its source remained stable at `a2e2cbb952b0e7eb1ac10661238ef8285dc3fe3c1fc3580f1160df7bb07db263`. Comparing its recorded runtime hashes with my capture hashes shows **only `src/build-info.js` differs**. The subsequent recorded mobile-build command exited 0 at 09:22:23.659 UTC and produced the reviewed fingerprint. These are builder executions, not tests I independently reran.

The focused run passed original rig/contact/texture preservation, all 20 occupied saddle slabs across the stated pose set, visible terrain clearance over 360 walking/turning/stopping poses and all six original combat-target tests. The remaining test failed on the front continuous belly girdle at gait frame 0, where face 876 violated the unchanged 0.04 rig-unit skin clearance against body face 7027. A passing build and the other 19 tests do not excuse this failure. No complete newly passing technical gate is claimed.

## Scores

| Dimension | Score | Reason |
| --- | ---: | --- |
| Game design/readability | 7.6 | The travelling low saddle city, 20-mount load and combat flow remain readable. This is not a balance review. |
| Interface presentation | 8.0 | Consistent restrained typography and colours; the normal desktop and emulated phone HUD remains legible. |
| Environment art | 7.4 | Calm palette and coherent habitat support the subject, while broad terrain transitions, repeated canopy forms and distant surfaces remain less authored. |
| Carrier and city art | 7.5 | Stronger head, horns and hide; uneven limbs/paws and the defective girdles weaken the complete creature and its load-bearing structure. |
| Overall aesthetics | 7.6 | A meaningful visual improvement, but assembly and deformation quality remain visibly uneven. |
| **Overall** | **7.6** | Above the good-indie reference, below the required 8.5 threshold, with a confirmed visual defect. |

The overall score is a holistic judgment, not an average inflated by functional test results. The fixed standard remains 5 = programmer art, 7 = good indie and 8.5 = the required AAA-quality threshold.

## Concrete defect, ranked

1. **The girdles bind to the moving leg region and distort into low loops or sheets instead of fastening around the torso.** In my original daylight `01c-full-saddle-side.png`, the near straps descend alongside the hind/forelimb region well below the belly. In `03a-turning.png`, they form a conspicuous long angular loop close to the paws, spanning the open space between the legs. The same failure is visible across the native day recording; decoded frame 012 shows a broad dark triangular sheet between the legs. The night side/motion evidence corroborates the incorrect route. The matched reverse/close views also show the attachment following the limb rather than reading as a coherent belly fastening. This is an observable attachment/deformation error, supported independently by the failed whole-face clearance check. Correct the route and animation attachment around the torso, then verify the whole visible girdle and buckle surfaces through walking, turning, stopping and striking. Do not conceal it with the HUD, reduced lighting or selected poses.

I did not identify an additional definite runtime failure or missing/detached body part in the stated evidence. That bounded observation is not a declaration that every pose or game situation is error-free.

## Ranked quality corrections before resubmission

These are art-quality deficits, separate from the concrete girdle error.

1. **Bring the limbs and paws up to the head's standard.** The face has convincing planes, expression and horn material. The paws remain coarse angular brown caps with abrupt transitions from the furred legs, especially in `AFTER-phone-portrait-city.png` and the full-city side view. The close rear view shows long smeared surface direction and sharp transitions around the haunch; the raised foreleg shows a strongly pinched angular elbow/underarm transition. Improve the anatomical and material continuity in the actual posed mesh while retaining the original gameplay contacts and strike timing. More texture pixels alone will not repair these joins.
2. **Make the city load feel structurally attached.** At full capacity the low saddle layout remains readable, but repeated little platforms still look applied to the hide. Once the defective girdles are corrected, give the supports, buckles, pads and frame connections a convincing material and weight relationship. Preserve the approved mount layout, capacity, district order and low silhouette.
3. **Unify the level of finish.** The detailed organic face and hide now make the plain frame bars, repeated roof silhouettes and coarse paw surfaces more conspicuous. Use deliberate form and material hierarchy across the whole carrier rather than treating the replacement head as the entire visual upgrade. The unchanged world remains a supporting good-indie environment rather than evidence of AAA completion.

## Ordinary polish opportunities

1. Concentrate warmer night accents around occupied saddle buildings; the full city is readable but most inhabited modules remain similarly dark.
2. Improve complementary viewing angles that expose the new face and foot contacts. Keep the established matched evidence framing intact when comparing revisions.
3. Add restrained variation to roof/inhabited-window groups and load hardware after the attachment and limb work.

## Gate decision

**FAIL — 7.6/10, one confirmed concrete visual defect, and a failed required harness check.** This is round 1 of at most 4 in the newly authorized integration cycle. Revise the ranked issues, complete the relevant checks and submit a freshly identified candidate for another independent review. This report does not clear readiness or authorize publication. Preserve this score, findings and original evidence unchanged. GPU capture is released.
