# Independent art review — rig and ground refresh — round 03

**Result: FAIL. Overall 7.9/10.** The revised grass is a visible improvement at normal City scale. The round-2 support fixes still read correctly in the fresh robot and monster poses inspected, and I found no new concrete scoped rig, grass, or road defect. The presentation remains below the fixed 8.5 gate. Absence of a newly identified geometry fault is not an AAA-quality pass.

## Reviewed identity and independence

- Build independently visible on the intro: `4018c8ac1ec3c1b7934a`.
- Frozen runtime fingerprint supplied by the builder: `bab597fd6641368cb0be37f7c5fe04e64c4d51b861b67f0dba0905e371df1e06`.
- Independently read HEAD: `32e7d003645bdb8aece23745b434d1c5025033a7`; this review concerns the frozen dirty candidate on that baseline. Builder-supplied branch: `codex/rig-ground-refresh-20261004`.
- Checkout: `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`.
- Changes since round 2 supplied for review: upright, narrower, uneven grass blades, slightly offset roots, and subdued olive colour; unchanged 10 triangles per tuft, 6,400 population and 3 draws. Robot sole sampling now caches two bone palettes per call, with builder-reported exact pose/indices/terrain-coordinate parity. No additional rig-pose or road edits were submitted for this round.
- I wrote no implementation, assets, tests, or capture scripts. Native controls and individual native browser screenshot/file APIs were used in my own Chrome tab `418187945` at `http://127.0.0.1:4215/`. Neither owner origin 4214 nor 4178 was touched.
- Both variants used fresh native expeditions in the explicitly disposable 4215 review save. Detail high, daylight, steady camera, displayed speed 1×. I did not construct or upgrade districts.
- Originals: `artifacts/critic-round-03/rig-ground-refresh/`. Capture interval: **2026-10-04 18:30:00 through 18:34:06 UTC**. Closed earlier reviews and evidence remain unchanged.

## Findings

1. **Grass correction is successful as polish.** In the normal City images (`01`, `06`) and wider reverse views (`02`, `07`), the fine shoots are quieter, narrower, and less recognizably star-shaped. They produce a more plausible broken ground texture around the trees and riverbank. Close foreground blades in `03`, `08`, and `09` have an upright silhouette instead of the earlier broad radial pinwheel. Repetition has been reduced, not magically eliminated: larger flat-leaf clusters and the broad terrain colour remain conspicuous. Those other shapes are not evidence that the submitted grass change failed.
2. **Robot support fixes remain visually intact.** The reverse moving frame (`02`), settled close view (`03`), and close turn/restart (`04`) retain coherent knee-to-foot shapes. The idle supports are separated, and the previous persistent inward bunching is not reproduced. The lifted heel/toe-down shapes during movement are motion poses, not sufficient evidence of a new skinning defect. Foreground foliage partially obscures one foot in the close arrival image; the report does not claim every sole is completely visible in that image.
3. **Monster support fixes remain visually intact.** The normal City pose (`06`), reverse start/turn (`07`), settled close arrival (`08`), and close restart (`09`) maintain readable limb volume. The close arrival shows downward claws and extended front paws rather than the former upward-curled knuckle shape. The rear view during restart is a different phase with lifted supports; it does not establish a persistent contact fault.
4. **Roads retain the corrected remnant shapes.** Broken pieces visible in the normal and reverse images remain interrupted and irregular, with unequal surviving paint. No obvious z-fighting appeared in these sampled views. Their fairly uniform grey-green fills still read as flat patches from above. Tonal integration is a legitimate lower-ranked polish target, not a newly discovered runtime or geometry defect. This round did not include an isolated road close-up because the road implementation was unchanged and the focused review emphasized the new grass and pose stability.

## Concrete limits, separate from scoped polish

- **No new concrete scoped visual or runtime error was identified in this round.** This is a bounded observation from fresh native views, not certification of every possible pose, terrain point, or animation frame.
- **Existing normal City/phone framing limitation persists.** The City build tray can hide the lower body. At portrait 390 × 844 (`05`) the side panels leave a narrow body window; at landscape 844 × 390 (`10`) the tray and side panels dominate the frame and the monster body is mostly below/behind them. These are the same presentation limits identified earlier, not a demonstrated regression introduced by the grass or palette cache. They remain relevant to the full-game score but do not authorize broadening this request into a HUD redesign.
- **The unusual slow response of round 2 was not reproduced during these controls/captures.** Native action/state/capture sequences returned promptly, and both carriers completed the short Grove trip between captures. Robot `02` at 18:32:21.762 UTC shows 41 m remaining, food 205, Day 02; `03` at 18:32:36.269 shows gathering, food 209. Monster `07` at 18:33:37.487 shows 41 m remaining, food 163, Day 01; `08` at 18:33:44.955 shows gathering, food 165. These differing capture intervals are not matched timed routes or FPS data. No performance pass or quantitative speedup is inferred.
- Browser warning/error inspection returned **0 entries**. No crash, missing model, or exploding geometry was seen. Source test and performance results below remain builder evidence, not independent critic measurements.

## Ranked remaining polish

1. **Carrier surface hierarchy.** The robot still has competing dark plates and bright purple/green accents; the monster's mane, ribs, and limb details compress into a busy near-black mass. More polygons preserve silhouette detail, but do not by themselves create a controlled material hierarchy. Preserve the selected identities and proportions; this is not a request for another regeneration.
2. **Ground and terrain integration.** The narrow grass is now a better component. The broader scene still shifts between sparse, flat ground and conspicuous repeated larger leaf shapes. Further gains would require carefully judged variation and material grouping within the authorized cheap geometry/placement boundaries. This round's improvement is real but localized.
3. **Road tonal integration.** Modest irregular value variation could reduce the remaining patch-like look while preserving the successful chipped silhouettes, fragment footprints, routes, and unequal paint. This is an appropriate bounded final polish option; it should not be presented as likely to solve the entire global quality gap.
4. **Motion weight.** The poses function and the identified deformation defects remain corrected. The overall movement can still look mechanical. There is no fresh concrete defect here that justifies speculative rig changes or risking the restored supports.

## Fixed-standard scores

| Area | Score / 10 | Reason |
| --- | ---: | --- |
| Game-design readability in normal gameplay | 7.2 | Moving-city identity remains clear; existing normal City and phone limits persist. |
| Character form and surface treatment | 7.4 | Detailed identities, with dark, busy material hierarchy unchanged. |
| Rig pose, weight, and animation presentation | 8.0 | Prior support corrections retained in the sampled fresh starts, turns, arrivals, and rest poses. |
| Ground detail integration | 8.0 | Narrower irregular grass improves the read at both normal and close scales. |
| Broken-road treatment | 7.8 | Corrected irregular remnants retained; tonal integration remains polish. |
| Overall aesthetics and presentation | **7.9** | A small but visible improvement from round 2's 7.8; still below 8.5. |

The overall score is an art-direction judgment, not an arithmetic average. Even putting the older HUD/phone limitation aside, the current material, shape, and environmental finish does not meet 8.5. The fixed quality standard remains unchanged.

## Coverage and evidence boundaries

- **10 original PNGs**, with 10 unique SHA-256 hashes, totalling **14,479,370 bytes**. `screenshot-metadata.json` records dimensions, creation timestamps, sizes, and hashes. Images were not retouched, cropped, or upscaled.
- Desktop default viewport: **1278 × 1214**. Round 2 used 1278 × 1304; these are fresh review evidence, not falsely claimed pixel-matched before/after pairs.
- Phone **portrait 390 × 844 on the robot** and **landscape 844 × 390 on the monster** are viewport emulation only. This focused round did not repeat both orientations on both carriers; round 2 contains that broader coverage. No physical phone was used.
- Both carriers: native normal City view, reverse/orbit zoom-out, close native Titan view, route start/turn, arrival/rest, and another turn/restart. Images `03` and `08` are explicitly named arrival because the short trip had finished by capture time. The review did not repeat the long round-2 route or make a high-frame-rate recording; selected frames cannot prove all intermediate deformation behavior.
- The robot's compact castle and the flesh carrier's taller castle remain visually distinct. Native storey selection lists Citadel, Dwellings, and Hanging gardens, and the City tray states that each new district adds a storey above. Construction, collision, picking, save migration, and event timing were not independently retested by the critic.
- Builder-reported verification: **328/328 full Node tests passed; 50 carrier identity and 42 save checks plus ground preservation passed; palette-cache parity 3/3 passed**. Builder-reported kernel timing was 3.90 → 1.38 ms, explicitly not FPS. The critic did not rerun these checks or treat them as visual evidence.
- The viewport override was reset and the reviewer tab navigated to `about:blank`. The root was informed that capture work had finished and the GPU slot was free **before this report was written**. No source edits, asset edits, test edits, publication, or deployment were performed.

This is **round 3 of 4 maximum** for the same visual update. Preserve the failed global gate, the absence of a new scoped fault, and the distinction between required defect fixes and ordinary polish.
