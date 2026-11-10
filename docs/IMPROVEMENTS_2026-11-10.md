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

Implementation and validation are in progress. Private delivery remains **Configured but blocked**.
