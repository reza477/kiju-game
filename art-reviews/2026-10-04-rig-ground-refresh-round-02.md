# Independent art review — rig and ground refresh — round 02

**Result: FAIL. Overall 7.8/10.** The specific round-1 rig-stance and road-tile defects are visually corrected in the views inspected. I found no definite remaining in-scope rig or road error. The build remains below the fixed 8.5 quality gate because its material/shape finish, ground repetition, and normal-gameplay presentation are still good indie rather than AAA. This is not a request to invent further rig defects or silently broaden the task into a HUD redesign.

## Reviewed identity and independence

- Build independently visible on the intro: `4470f6931eb1b992343a`.
- Frozen runtime fingerprint supplied by the builder: `f007c30136f36006ecb82279aa21be9da1e1b04ef76e2bc7a2214d659ac0ce36`.
- Independently read HEAD: `32e7d003645bdb8aece23745b434d1c5025033a7`; the candidate remains an uncommitted working tree on this baseline, on the builder-supplied branch `codex/rig-ground-refresh-20261004`.
- Checkout: `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`.
- Changes since round 1 supplied for review: robot lower-body bind stance and forward knee/sole alignment; monster wrist/hock, weighted paw, and claw contact changes; chipped road edges/caps and unequal surviving paint fragments. Ground-cover content otherwise retained for this round.
- I read the unchanged round-1 report before reviewing and wrote no implementation, assets, tests, or capture scripts. All game actions used native controls in my own fresh Chrome tab `418187943` at `http://127.0.0.1:4215/`. The prior blank tab had been automatically removed. Neither owner origin 4214 nor 4178 was touched.
- Both carriers used fresh native expeditions. The root's authorization for the disposable 4215 review save remained in effect. The camera was switched from cinematic to steady through the native control. Detail remained high, daylight, and displayed speed 1×.
- Originals: `artifacts/critic-round-02/rig-ground-refresh/`. Capture interval: **2026-10-04 18:08:06 through 18:15:27 UTC**. Earlier reports and evidence remain unchanged.

## Round-1 defect disposition

1. **Robot support/stance: corrected in the inspected poses.** `02-robot-front-idle.png` shows two separated supports, with a readable knee-to-foot chain and broad contact silhouettes. `03` and `04` show a pronounced toe-down swing, but the robot returns to the separated, flat-looking supports in `05-robot-side-arrival.png`. I did not see the previous persistently bunched idle feet. A high toe-down swing by itself is not evidence of broken skinning, and I am not labelling it a new defect. Subtler mechanical gait weight remains a polish opportunity.
2. **Quadruped upward-curled paw: corrected in the inspected poses.** `10-monster-front-idle.png` clearly shows the front claws pointing down with naturally extended paws. The same orientation is maintained through the start/turn (`12`), stride (`13`), late stride (`14`), and settled arrival (`15-monster-close-arrival.png`). The old paw that visibly curled upward into a knuckle shape is not reproduced. Body and limb volumes remain coherent in these views.
3. **Clean repeated road tiles: corrected as a concrete defect.** `11-monster-reverse-city-roads.png`, `13`, and `15` show interrupted polygonal silhouettes and less uniform paint. The isolated pieces now read as broken remnants rather than a run of identical clean rectangles. Their flat material can still be refined, but that is ordinary polish. I did not observe z-fighting, and do not convert the earlier clearance risk into an observed error.

## Remaining concrete limits and runtime observation

- **Existing City/phone presentation limitation, outside this request's rig/ground scope.** Normal City framing still favors the castle and can put the feet under the build tray or beyond the viewport (`01`, `09`). At 390 × 844 and 844 × 390, the map, carrier panel, and build tray leave little usable view of the body (`07`, `08`, `16`, `17`). This reproduces the earlier limitation; it is not evidence of a regression caused by this round. Do not redesign the HUD or change the owner's construction/camera scope merely to increase this review's score.
- **Unusually slow observed advancement; cause and performance impact not established by this art review.** The game remained interactive, but scene advancement and capture response were markedly slow. One native PNG capture exceeded its 3-second tool timeout and succeeded on a 10-second timeout. At displayed 1×, the robot capture at 18:09:15.679 UTC showed 30 m remaining, food 164, Day 01; at 18:09:40.903 it showed 6 m, food 165; at 18:10:01.470 it was gathering with food 165. The monster capture at 18:13:30.731 showed 43 m and food 163; at 18:13:47.261, 26 m and food 163; at 18:14:09.850, 4 m and food 164; at 18:14:53.548, gathering and food 165. These are screenshot/HUD observations, not frame-time measurements or an equivalent-route benchmark. The root was informed immediately and planned a timed baseline/candidate comparison after the GPU slot was released. Do not claim a performance pass from this review.
- Runtime warning/error log inspection returned an empty list. No crash, missing model, or visible exploding geometry was observed. An empty log does not resolve the slow-advancement concern or certify unobserved animation frames.

## Ranked polish opportunities

1. **Ground-cover silhouette repetition.** Several bright clusters still repeat the same short, open, star-shaped arrangement of pointed leaves. Close foreground pieces also read as sharply folded flat planes. The distribution is fuller and generally readable, but differences in leaf width, height, lean, cluster fullness, and subdued colour grouping would improve natural variation. This is the strongest permitted cheap polish target; retain original object placement/collision/picking boundaries and the lightweight approach.
2. **Carrier surface hierarchy.** The robot's many dark plates and bright green/purple spots compete at similar visual emphasis; the quadruped's dark mane and exposed flank details compress into a busy near-black mass. Both have more detail than round 1's practical presentation showed, but detail is not the same as controlled material/readability finish. Preserve the chosen asset identities and proportions. This is not a request for another wholesale regeneration.
3. **Road material integration.** The chipped shapes and uneven paint solve the repeated-tile issue. The remaining grey-green fills have relatively uniform values and can still look like flat patches from above. Modest tonal breakup would improve integration; it is lower priority than the ground-clump repetition.
4. **Gait weight, within the existing animation design.** The robot's swing poses are emphatic and the quadruped still has a somewhat mechanical stride. No discrete deformation fault was established in this review. Any further tuning should have concrete evidence and avoid undoing the new stable support poses.

## Scores against the same fixed standard

| Area | Score / 10 | Reason |
| --- | ---: | --- |
| Game-design readability in normal gameplay | 7.2 | Moving-city identity remains clear; normal City and phone framing limitations persist. |
| Character form and surface treatment | 7.4 | Strong identity and detail, but dark, busy materials and uneven hierarchy remain. |
| Rig pose, weight, and animation presentation | 8.0 | The specific support defects are corrected; the motion has not yet acquired exceptional weight or refinement. |
| Ground detail integration | 7.7 | Added density works, with repeated leaf/clump shapes still visible. |
| Broken-road treatment | 7.8 | Broken silhouettes and varied paint now satisfy the concrete remnant direction; surface integration remains polish. |
| Overall aesthetics and presentation | **7.8** | Clearly improved, still below the unchanged 8.5 gate. |

The overall score is an art-direction judgment, not an arithmetic average or a technical-test score. Even setting the old phone/HUD limitation aside does not make the current carrier/material/ground finish 8.5 quality. No passing claim should be inferred from the absence of a newly identified scoped geometry error.

## Coverage and evidence

- 17 original PNGs, all unique SHA-256 hashes, totalling **25,101,262 bytes**. Dimensions, original creation timestamps, sizes, and hashes are recorded in `screenshot-metadata.json`.
- Desktop viewport was the browser's current default **1278 × 1304**, which differs from round 1's 1278 × 1214. These are fresh review evidence, not falsely claimed pixel-matched before/after captures.
- Phone portrait **390 × 844** and landscape **844 × 390** were viewport emulation only, for both carriers. No physical phone was used. The viewport override was reset.
- Both variants were inspected in normal City HUD views, reverse/orbit views, closer native Titan views, and live native route starts, turns, strides, arrivals, and subsequent idle. Screenshots capture selected actual frames; this was not a high-frame-rate recording or an exhaustive deformation audit.
- The robot's compact castle and the flesh carrier's taller castle stayed visually distinct. The native storey selector continued to list Citadel, Dwellings, and Hanging gardens, and the City tray continued to state that each new district adds a storey above. Construction upgrades, event timing, and save migration were not independently retested in this art review.
- Builder-reported verification: **325/325 Node tests, exit 0**, on the supplied fingerprint. Those tests were not rerun by the critic.
- No publication, deployment, source edit, test edit, asset edit, or older review rewrite was performed. At completion the review tab was navigated to `about:blank`, and the root was told the GPU slot was free before writing this report.

This is **round 2 of 4 maximum** for the same work request. Preserve the actual failed gate and distinguish the resolved rig/road defects from the remaining polish and existing presentation limits. Further work should be evidence-led; there is no critic instruction to make speculative additional rig changes.
