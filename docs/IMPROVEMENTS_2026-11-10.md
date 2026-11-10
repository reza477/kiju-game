# November game improvements

The owner requested further development of the art remake on 10 November 2026: improve its presentation, features and bugs, and bring across any implemented prototype features missing here. The latest design remains authoritative. The owner also explicitly approved refitting the flesh city into a genuinely low saddle city, keeping the same districts, capacity and progression.

## Baseline and scope

The starting checkout is `3e060c2a83e5b9db80c0fb5c1581d4b9c5598d36`, whose last runtime implementation is `844cef276125957a7542d8c89d6c7889b511554d`. The raw runtime fingerprint is `db30d10d30472fd3a0b68f309fd3ad1aefbc7dfaeb425f78893f87e1f2123e0a`. The original prototype at `96ab478480625923c4d3bc3f42781b0093e3194f` is an ancestor. Its implemented economy, campaign, six carriers, controls, audio, offline support and save features are already retained; planned roadmap ideas are not falsely reported as missing implemented features.

This update targets:

- A measured low saddle profile shared by visible structures, districts and weapon geometry; preserve identities, progression and the other five carriers.
- A real localized repair attempt for the native beast's folded/deforming skin. Preserve original assets, contact witnesses and failed evidence; do not weaken the intersection detector.
- Useful expedition planning: depletion-aware resource destinations, accurate gathering information and stopping travel.
- District inspection that works across all carriers, with readable construction/upgrade status.
- Correct documentation of the current flesh saddle and cyborg castle designs.
- iPhone playtesting, including use away from home, requested by the owner during this update. Prepare and check the existing installable web-app/offline route and an isolated runtime bundle. A hosting ZIP is not an iPhone installer; no native `.ipa`, physical-device pass or playable hosted build may be implied.

## Evidence and review

Five fresh matched BEFORE views were captured from the unchanged baseline at `2026-11-10T07:12:52.990Z`–`07:16:56.110Z`, exit 0. Report: `artifacts/nov10-improvements/baseline/report.json`. Start and finish raw fingerprints match. The existing capture tool used native controls, isolated saves and normal HUD; phone views are desktop Chrome emulation. Source/mesh analysis and retention work overlapped the capture, so its short RAF measurements are descriptive and are not a controlled performance baseline.

The prior art-remake and beast-integration cycles remain failed and closed. In particular, beast round 04 remains **8.1/10 FAIL**, with **432/433 tests passing** and animated-body self-crossing unresolved at this baseline. This new owner-requested improvement update has its own maximum of four independent visual review rounds; it does not erase past findings or clear release readiness. New reviews use separately named reports and evidence folders. The required score remains at least 8.5 with zero identified visual/runtime errors.

## Native skin repair attempts

Two localized mesh repair pilots were rejected. The second used transactional patch backtracking against the unchanged intersection detector and a frozen 3.37 MB dependency set. It reduced bind crossings from 179 to 32 without introducing a new bind pair, but its three selected moving poses introduced 5, 3 and 3 new crossing pairs. All 10,859 protected positions remained exact; finite normals and nondegenerate triangles alone did not make the candidate acceptable. The original active GLB remains unchanged at SHA-256 `85cb7024f72e23737a1a64981d763dfbc9204f0c6a5dc65fa413df55455035a3`.

Twelve remaining bind pairs have every vertex pinned by the existing front-left ground samples. Independent triangle-plane slicing confirms finite-length noncoplanar crossings, not permitted shared-edge contact or zero-area faces. These samples are distinct from the explicitly declared sole/strike witness triangles. A future repair must address the actual topology and motion while preserving verified contacts; changing a detector threshold or accepting a lower count would not fix this defect. Evidence: `artifacts/nov10-improvements/deformation/patch-backtrack-02/CONCLUSION.json` and `PINNED-CLASSIFICATION.json`. The first pilot and its invalidated provisional motion run remain preserved and are not acceptance evidence.

A third artifact-only pilot retained the original pose-space displacement field while applying the local rest sculpt. It preserved all 65,218 untouched posed vertices and all 10,859 protected positions exactly, avoiding the earlier global correction changes. It was still rejected: gait-60 changed 496 to 367 intersections but introduced two new pairs; gait-240 changed 310 to 184 with the same two; cyborg-strike-31 changed 1,361 to 1,235 without new pairs. The two new pairs involve five locally edited vertices with mixed chest/front-leg weights. The quick rejection stopped the pilot before a full 25-pose or terrain pass; no active asset, contact checks or detector changed. Evidence: `artifacts/nov10-improvements/deformation/fixed-reference-03/CONCLUSION.json`. A future union-of-poses optimization is plausible but unproven; reducing the count is not acceptance.

## Implemented candidate

Local implementation checkpoint: `cc296e315351cbd8270108c6205052f78fe1f449`; raw runtime fingerprint: `79c38aa4b00af199fe94b5c8689008aa987480fdd0d660546498f7dc1177c3f4`. The checkpoint is not a release or a passing art review.

The flesh city now uses a shared cargo frame that follows the native beast's dorsal height. Foundation, districts, residents, picking and guns move together; collision and firing calculations use the same offset. The offset is transient and never enters saved games. The front saddle stays close to the back, while individual rear seats clear the actual moving skin. District IDs, construction order, capacity, progression, residents' scale and the other five carrier layouts remain intact.

Resource destinations now show remaining supply, distance, travel time and gathering rate. Stale or depleted destinations cannot issue orders, nearby deposits gather in place, and Stop course cancels automatic travel. The district overview exposes construction and upgrade timers across all six carriers while preserving keyboard focus. Net food includes gathering; paused/battle labels reflect the actual simulation. Food harvested during a tick is credited before starvation is decided. Two industry descriptions now state their existing additive rates correctly.

The final foundation recording (`saddle/rear-foundation-attempt01/report.json`) passed all 88 poses at the unchanged 0.04 skin and 0.12 slab margins, exit 0, from 16:17:57.931 to 16:18:45.473 UTC. The targeted follow-up passed 30/31 tests; its sole failure was an obsolete exact flesh firing-lane fixture after two rear lanes became clear. The corrected explicit 11-lane fixture passed all 7 weapon tests at 16:23:25.129–16:23:50.784 UTC. All six historical systems traces, five other-carrier weapon matrices, economy/save preservation, resident/picking, cargo-pose and actual rendered collision checks passed. The original failed recordings remain retained. The complete suite then ran from 16:25:13.277 to 16:31:32.175 UTC, exit 1: 448 tests, 447 passed, one failed. Its sole failure is the unchanged native connected-body self-crossing check. Source and test inputs were unchanged throughout. The receipt and raw output are in `artifacts/nov10-improvements/checks/full-suite-final-01/`. The independent art review is pending.

Private delivery remains **Configured but blocked**. No source push or deployment has occurred.

## Independent review cycle

Round 1 reviewed checkpoint `cc296e315351cbd8270108c6205052f78fe1f449` at the exact `79c38aa4...` runtime and scored **8.0/10 FAIL**. The critic independently captured five matched views, four full-load day/night/motion/combat sequences, and all six carrier smoke cases. Five carrier smoke cases passed. The flesh movement/build/save/reload sequence exposed a harness contour exception and an incorrect cyborg image beneath the flesh HUD. The report is `art-reviews/NOVEMBER_IMPROVEMENTS_ROUND_01.md`; its score and findings are critic-owned.

An independent CPU reproduction using all 78 original frozen modules at baseline `3e060c2a83e5b9db80c0fb5c1581d4b9c5598d36` confirms the contour defect predates this update. The exact saved location fails at its recorded clock and at time zero; the original starter location passes. That establishes inherited first-pose fitting failure, not a baseline browser observation of the wrong actor. Receipt: `artifacts/nov10-improvements/diagnostics/harness-baseline-inheritance-receipt.json`.

The second builder attempt binds the native harness's interior selection witness to its declared torso root at the actual first terrain pose. Only in-plane coordinates move; slicing planes, widths, strict closed-contour checks and persistent indexed attachments remain intact. A focused regression checks the exact failing pose, alternative clocks/headings, continuing motion, saves and actual clearance. Browser evidence must also prove that the rendered carrier belongs to the loaded state. A separate independent code audit found no actionable defect in this fix. Combined validation and round 2 are pending.
