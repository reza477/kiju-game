# Ground texture and scenery dressing — independent round 1

**7.3/10 — FAILED.** The fixed visual gate requires at least 8.5/10 and zero identified visual/runtime errors. This first attempt improves the selected riverbank, but its material definition and visible coverage are not yet sufficient for the owner's request. This is round 1 of a new visual update; the completed four-round Meshy pilot remains closed at its recorded 7.4 result. These scores concern different scopes and are not a claim that this addition makes the earlier pilot worse.

## Independence and reviewed source

Reviewer: `ground_art_critic`, acting as a demanding AAA art director. I wrote no implementation code, assets, tests or capture scripts. I used the browser's normal UI and supported screenshot facility, took my own fresh captures, and read source/state for provenance. No builder screenshots were substituted for my review.

Independently verified runtime commit: **`4b56c1135f002c3ce1665f4a544535d580ce8d2b`**, branch `codex/ground-dressing-20261003`, in `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`. It remained HEAD when the review ended. The only untracked files listed at preflight and completion were additional packaging/release/identity tools; there was no uncommitted runtime edit in the reviewed source. Baseline: `7c1496f8dc63522a55384d27e7c22e230bc5ded3`.

Changes reviewed: two authored ground maps; ground colour, roughness, optical relief and cavity treatment; modeled rooted leaf rosettes, buried stone chips and splintered fallen limbs attached to existing scenery owners. These changes occupy x [-65,32], z [-140,-90]. The carrier, physical terrain, river geometry, imported Meshy tree/rock masters and game rules were outside this attempt. I did not grade a promised full-map rollout as if it had happened.

The parent reported 266/266 unit checks and three error-free desktop capture runs before the review. Those are builder checks, not independently executed tests by this critic. I independently verified actual rendering and native play as described below.

## Visual judgment

The selected bank is less empty and less uniformly smooth. The green root bedding, exposed earth, small bank stones and fallen wood now give the tree bases a more credible connection to the ground. The low plants have actual bent leaves and work better than a purely coloured speckle. In the close and reverse views the soil has material structure rather than only a flat tint. This is worthwhile visible work.

It still reads primarily as broad soft brown and green fields with very small marks sprinkled over them. At ordinary City zoom, individual surface stories are weak: compacted earth, leaf litter and stony ground do not separate clearly enough through texture shape and scale. The decorative kit is mostly subordinate fine detail. On the phone landscape viewport, much of it collapses into indistinct colour variation. There is a useful increase in richness, but not the convincing surface hierarchy and deliberate environmental composition associated with the fixed 8.5 standard.

The approach from the normal new-game start is also revealing. Most of that route retains the same sparse, smooth land. The richer area appears only at the southern pilot reach. This is a limitation of this attempted scope, not a false claim that the two maps cover the whole world. It matters because the owner's latest request concerns a world that feels empty, including ordinary play before reaching a special review location.

## Ranked builder issues

These are ranked visual-quality/coverage deficiencies, not permission to add mechanics, resources, collisions or new navigation requirements.

1. **Ordinary play sees too little of the improvement.** The native journey from (-30,40) toward the pilot is mostly unchanged. A limited, deliberately composed reuse of the decoration kit around appropriate existing scenery anchors on ordinary routes would answer the owner's emptiness concern more effectively than additional polish confined to this one strip. Keep existing logical placements and identities; this does not require a whole-map terrain rewrite.
2. **Ground lacks a readable middle scale.** In `01`, `02`, `03` and `08`, broad smooth areas dominate while the new surface marks are fine and fairly similar in emphasis. Strengthen the material shapes at practical City zoom: coherent irregular litter beds near roots, exposed-earth breakup and short bank-shingle transitions. These should remain material/visual changes, with no terrain displacement or invented traversability cues.
3. **The dressing needs stronger grouping, not uniform extra density.** The rooted leaves and small chips help contact, but many disappear in the normal view. A few more legible arrangements of the existing low kit, balanced with quiet areas, would give the eye a purpose at normal and mobile zoom. Avoid turning every open patch into the same repeated rosette distribution. Do not obscure resource markers, controls or actionable objects.
4. **The new ground and the surrounding legacy scene are not yet fully joined.** The rich green/brown treatment fades into much smoother pale ground. There is no hard missing-texture seam in my views, but the density/material change remains noticeable. Improve the visual transition where practical; this observation does not reopen the closed water or imported-tree task.

## Concrete defects versus polish

I did **not** confirm a new missing texture, floating dressing assembly, visibly detached shadow, depth-fighting patch or normal-load runtime malfunction during this inspection. The normal game log query returned no warnings or errors. That is a bounded observation, not exhaustive proof of zero errors.

The repeated pine lobes and compressed legacy/imported bank-rock forms remain visible context from the closed Meshy pilot. I am not asking this builder to rewrite those masters or spend new generation credits to chase this ground review. The failed result here is principally the quality and coverage of the new ground/dressing work, not an invented new asset defect.

## Fresh screenshots and provenance

Eight original full-viewport PNGs are in **`artifacts/critic-round-01/ground-dressing/`**, with matching read-only state records and `browser-messages.json`. HUD remains visible. No retouching, cropping, upscaling, clean-view substitution or reused builder imagery. Times below are file-write UTC on 2026-10-04, not exact simulation-frame timestamps.

| Screenshot | Dimensions | UTC time | View |
| --- | --- | --- | --- |
| 01-normal-city.png | 1280 x 720 | 04:14:17.106 | First arrival, normal City, High |
| 02-reverse-bank.png | 1280 x 720 | 04:14:39.061 | Reverse orbit, normal zoom, High |
| 03-close-east-bank.png | 1280 x 720 | 04:15:24.945 | Closer City view, zoom 60.88, High |
| 04-native-travel.png | 1280 x 720 | 04:15:25.504 | Native movement, High |
| 05-southern-bank.png | 1280 x 720 | 04:15:52.799 | Southern angle, close City, High |
| 06-portrait-moving.png | 390 x 844 | 04:17:22.901 | Phone portrait emulation, moving, Performance |
| 07-landscape.png | 844 x 390 | 04:17:52.932 | Phone landscape emulation, Performance |
| 08-final-normal-city.png | 1280 x 720 | 04:18:41.403 | Final normal City, zoom 76, High |

Desktop was the actual IAB viewport 1280 x 720, DPR 1, renderer buffer 1600 x 900. Phone views used the supported browser viewport override, DPR 1 and touch emulation with one touch point. Verified buffers were 331 x 717 in portrait and 717 x 331 in landscape. These are Windows desktop browser emulation, **not physical Apple-device or Safari tests**.

An initial direct device-metrics command timed out while partially applying its viewport change. I cleared that override and used the supported viewport capability; the final phone PNGs and recorded dimensions above are from the corrected state. A read-only diagnostic initially queried a nonexistent `state.player` property and raised a tool evaluation error; I corrected it to the actual `state.x/z`. Neither event is presented as a game runtime defect or hidden as a successful test. No source or game state was changed to work around them.

## Native play and motion actually inspected

Origin: `http://127.0.0.1:4215/?test=1`, isolated from the owner's normal 4214 save. This browser had no existing saved expedition. I selected the ordinary armored crawler, clicked Begin, and used only normal map travel and camera controls. No fixture injection, teleport, simulation-time advance, prewarming or game-state mutation was used.

The native route ran from the real start (-30,40) to approximately (-46.04,-114.21), east across the reach to (4.11,-114.28), southwest to (-25.12,-131.97), northeast to (14.57,-96.66), then through the real phone Map panel to (-8.31,-118.40), and finally to (-8.37,-99.20). I orbited several directions, inspected close and ordinary zoom, and changed High through Balanced to Performance using the normal detail control, then restored High.

The `04` state records moving=true at time 128.9948, near (1.35,-115.95) with a real target at (-25.12,-131.97). The `06` portrait state records moving=true at time 242.7689 near (12.29,-98.83) en route to (-8.31,-118.40). These are actual native movement samples. The final sample records time **321.1217 seconds**, unpaused, at (-8.37147,-99.19919), zoom 76. Thus the inspected new expedition includes approximately **5 minutes 21 seconds of normal running gameplay**, with multiple native routes rather than a single stationary beauty view.

I observed carrier turns/tracks, traveling camera, citizens and the ground/vegetation across the movement sequence. I did not measure subtle wind amplitude or high-frequency shimmer from successive screenshots, and I do not claim a continuous video or frame-pacing benchmark. There was no gameplay redesign or unnecessary building/combat exercise in this ground review.

I clicked the real Save control; the HUD confirmed "Expedition saved on this device." The isolated review save remains near the pilot for local preview. Temporary touch and viewport overrides were cleared and my owned tab was closed, releasing the GPU. No user Meshy tab, account, asset generation, upload, publication or delivery action was touched.

## Disposition

**Round 1: 7.3/10, FAILED.** Return the ranked visual issues to the builder. Up to three further rounds remain for this new update. The former material, foliage, broad-painterly and Meshy reviews remain separate and unchanged. This review does not clear release readiness, physical-device validation, multiple-active-session save behavior, performance budgets or private hosting gates.
