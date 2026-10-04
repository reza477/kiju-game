# Ground texture and scenery dressing — independent round 2

**7.5/10 — FAILED.** More of the normal playable valley now benefits from the work, but the ground still lacks a convincing hierarchy of material shapes and environmental detail at normal camera distance. The fixed acceptance threshold remains at least 8.5/10 with zero identified visual/runtime errors. This is round 2 of the current update, following 7.3 in round 1. It does not reopen the closed Meshy pilot or any preceding material/foliage review.

## Independence and source

Reviewer: `ground_art_critic`. I wrote no implementation code, assets, tests or capture scripts. I inspected the running game myself, used ordinary UI controls, and took eight fresh original PNGs. Read-only source and state inspection support provenance; the builder's captures were not substituted for my evidence.

Reviewed commit, independently verified before and after play: **`92c677a2e1decdde8c185a6c5199d6398c451658`**. Worktree: `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`, branch `codex/ground-dressing-20261003`. The parent supplied runtime/assets fingerprint `187cec22f28510ac70b40ebe7576f35d7b00c1a2b65f3b7b66779a14f9a01174`; I did not independently recompute that broader fingerprint. Git listed only untracked QA/packaging tools and no uncommitted runtime changes during this review.

Since round 1, the builder added packed turf/soil detail using the existing ground detail texture, extended the decorative kit to a limited selection of old tree/rock owners across the central valley, spatially partitioned those instances, and removed collapsed triangles from the rosette mesh without changing its intended visible shape. The original local atlas and water treatment remain. The builder reported 1,074 decorative instances on 79 existing owners, original identity preservation, nine scoped tests, and five successful GPU capture views; these numerical tests are builder evidence, not tests run by this critic.

## What improved

Low leaf clusters, fallen limbs and stone chips are now visible around ordinary-route anchors near the start. The new game no longer needs to reach the southern material pilot to see every part of the addition. The ground also has shallow optical structure beyond the pilot. This resolves a meaningful part of round 1's coverage complaint.

The additions remain restrained and belong to the existing palette. In the pilot, the litter and low plants help join the tree bases to the soil; the bank still reads as a bank, and the marker/HUD presentation remains readable. I did not see a new hard texture seam, conspicuous floating assembly or depth-fighting patch in the inspected views. The render kit does not appear to have turned the terrain into a dense obstacle carpet.

## Remaining ranked visual issues

1. **A middle scale is still missing.** Both spawn and the native approach remain dominated by broad smooth brown/green fields. The added turf strokes are fine and low contrast, and the added objects are mostly small leaves/chips. There is still too little variation between these tiny details and the existing trees/large rocks. This is clearest in `01`, `02`, `03`, `07` and `08`. A few coherent low weathered fragment assemblies at suitable existing anchors could help more than another uniform layer of scatter. Such work must remain visual, without new gameplay identities, resources, collision obstacles or landmarks that imply new rules.
2. **Material shapes are weak at normal distance.** Much of the packed detail reads as faint marks on an otherwise smooth field. Compact earth, litter and stony ground still need more distinct visual organization through shape, grouping and scale. Do not solve this by raising contrast everywhere: that would turn a restrained but plain ground into noisy ground. The pilot's richer texture is still the stronger example, but also retains broad smooth transitions.
3. **Phone readability exposes the same weakness more strongly.** At Performance resolution, individual small additions largely merge into colour variation. The normal landscape image is still dominated by soft material bands and empty-looking fields. Prefer a few legible grouped silhouettes and material masses over accumulating details that are only visible in a close desktop view. Preserve existing visibility and selection rules.
4. **The richer pilot and the general valley remain visually distinct.** The added valley detail reduces the contrast in finish, but the transition is not yet a fully coherent environment treatment. This is a polish observation, not a request to redesign the river or alter physical terrain.

These are art-quality deficiencies and ranked opportunities, not confirmed program faults. The round fails on quality below 8.5. I did not identify a new concrete normal-load rendering/runtime defect in the observed route. The repeated pine crown form and compressed rock masters remain inherited limitations from the closed pilot, not new demands to regenerate those assets.

## Fresh evidence

Folder: **`artifacts/critic-round-02/ground-dressing/`**. All eight PNGs are full viewport with ordinary gameplay HUD. No crop, retouch, upscale, clean-view substitution or borrowed builder image. Read-only state records and `browser-messages.json` accompany them. Times are file-write UTC on 2026-10-04, not exact simulation-frame timestamps.

| File | Dimensions | UTC time | View |
| --- | --- | --- | --- |
| 01-spawn-normal.png | 1278 x 1179 | 04:34:47.250 | Real start (-30,40), City zoom 76, High |
| 02-spawn-reverse.png | 1278 x 1179 | 04:35:10.184 | Reverse orbit at start, High |
| 03-spawn-close.png | 1278 x 1179 | 04:35:38.202 | Closer ordinary City view, High |
| 04-native-approach.png | 1278 x 1179 | 04:35:38.817 | Native travel from start, High |
| 05-pilot-normal.png | 1278 x 1179 | 04:36:48.118 | Pilot bank, ordinary City, High |
| 06-pilot-close.png | 1278 x 1179 | 04:37:21.556 | Other bank/orbit, closer City, High |
| 07-phone-portrait.png | 390 x 844 | 04:38:00.255 | Portrait emulation, zoom 76, Performance |
| 08-phone-landscape.png | 844 x 390 | 04:38:29.171 | Landscape emulation, zoom 76, Performance |

The in-app browser was unavailable at the start of round 2. I therefore created one new Chrome tab on the isolated review origin `http://127.0.0.1:4215/?test=1`; I did not interact with the user's Meshy or other tabs. The native Chrome viewport differed from round 1. Desktop images are 1278 x 1179 at DPR 1 and renderer buffer 1597 x 1473. They are independent review views, not falsely labelled matched comparisons to the earlier 1280 x 720 IAB images.

Phone emulation used the supported viewport capability, touch emulation with one touch point, and the game's normal Performance control. Verified render buffers were 331 x 717 for portrait and 717 x 331 for landscape, both DPR 1. These are desktop Chrome emulation, not physical iPhone/iPad or Safari tests. After resetting the viewport override, Chrome's then-current desktop viewport was 1278 x 1123; that later native-window size is recorded in `final-state.json`, not substituted for the screenshot dimensions above.

## Native play and limits

Chrome had an earlier isolated 4215 test save. Before starting the requested real-spawn review, I preserved its local-storage data locally in `pre-review-isolated-storage.json`, then used the ordinary Begin and confirmation controls. The owner's 4214 save was not accessed. No fixture injection, teleport, simulation-time advance, prewarming or programmatic game-state modification was used.

The fresh armored crawler began at (-30,40). I inspected normal, reverse and closer City views, then used the real minimap to travel to approximately (-43.95,-114.28), observing the ordinary approach and new clusters. I traveled across the pilot to (14.64,-111.75), inspected another orbit/zoom, and checked both phone orientations before restoring High detail.

The `04` sample records **moving=true** at time 35.1591 seconds, near (-30.30,36.70), targeting (-43.95,-114.28). The live UI subsequently showed 111 m remaining and later arrival. The second cross-bank movement was likewise observed live. Final simulation time was **168.5531 seconds**, unpaused, at (14.64458,-111.75234), zoom 76. This is approximately 2 minutes 49 seconds of additional native running gameplay, not a repeat claim of round 1's 5m21s session.

I inspected carrier turns, tracks, citizens and nearby vegetation during the route. This supports a practical in-motion art check, not measured frame pacing, a continuous video record, quantified wind amplitude, every spatial-chunk culling boundary, thermal stability or long-session certification. Parent performance/regression tests remain necessary.

The captured warning/error log was empty. The parent also flagged a possible small material-sampling discontinuity at the outer 205 m valley boundary during source review. My route did **not** directly inspect that boundary. I neither certify it clear nor invent a visible defect from the mathematical possibility; it remains unverified by this art review.

The normal Save control confirmed "Expedition saved on this device." I restored High detail, reset viewport and touch emulation, and closed only my owned review tab. The GPU was released before this report was written. No Meshy generation, upload, purchase, publication or delivery action occurred.

**Round 2: 7.5/10, FAILED.** Return the ranked issues to the builder. Two rounds remain in this visual update. All existing release and physical-device gates stay in force.
