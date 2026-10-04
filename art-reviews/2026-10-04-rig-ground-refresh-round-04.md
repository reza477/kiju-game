# Independent art review — rig and ground refresh — round 04

**Final result: FAIL. Overall 7.9/10. Four-round limit reached.** The final road-colour pass is a modest, appropriate improvement. It preserves the corrected broken silhouettes and paint fragments, but does not materially change the overall presentation score. The previous rig-support fixes and improved grass remain intact in the inspected views. I identified no new concrete scoped visual/runtime fault. The fixed global gate of at least 8.5 with zero identified visual/runtime errors remains unmet; stop this visual-update loop and report the failure honestly.

## Reviewed identity and independence

- Build independently visible on the intro: `e5324a4555ec51f91c93`.
- Frozen runtime fingerprint supplied by the builder: `fb242bf56124b45f6f5f9f2bd8d5a6f9e306ab01bb5928860042b6551ec62955`.
- Independently read HEAD: `32e7d003645bdb8aece23745b434d1c5025033a7`. This review concerns the frozen dirty candidate above that baseline, on builder-supplied branch `codex/rig-ground-refresh-20261004`.
- Checkout: `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`.
- Only submitted runtime change since round 3: world-continuous dust/darker weathering through asphalt vertex colours, using existing terrain noise at construction. Builder reports exact parity of positions, normals, plan, statistics, and paint colours, without an extra surface, texture, draw, or per-frame work. Round-3 grass and palette-cache changes are retained; no body geometry, rig pose, or body-material change was submitted.
- My round-3 report was completed and left unchanged before this review began. I wrote no implementation, assets, tests, or capture scripts. All gameplay used native browser controls and individual native screenshot/file APIs in my own Chrome tab `418187945`, at dedicated `http://127.0.0.1:4215/`.
- Owner origins 4214 and 4178 were not touched. Both carriers used fresh native expeditions in the explicitly disposable review save. Detail high, daylight, steady camera, displayed speed 1×. No construction, district upgrade, battle, or harness change was made.
- Originals: `artifacts/critic-round-04/rig-ground-refresh/`. Capture interval: **2026-10-04 18:37:22 through 18:41:49 UTC**. Older reviews and evidence remain unchanged.

## Final scoped findings

1. **Road tonal pass: modest improvement, no new defect.** At normal and reverse scales (`01`, `02`, `05`, `06`) the colour variation is restrained. The road-adjacent close reverse view (`09`) shows different dusty and darker values across the remnant surfaces, with chipped outlines and interrupted paint retained. I used the native World map to travel to a visible remnant area, then inspected reverse and side views (`09`, `10`), rather than relying only on the builder's parity result. The roads still have a deliberately flat treatment and do not acquire rich material depth from this small change. No observed shimmer, holes, new raised surface, or overlap error establishes a regression. The pass slightly improves integration, but is not sufficient to change the overall 7.9 score.
2. **Robot correction retained.** Fresh normal City (`01`), reverse moving/turning (`02`), and close settled arrival (`03`) show coherent leg volumes and the restored separated supports. The former persistent inward-bunched idle stance was not reproduced. The close angle partially obscures one foot with foliage; it is not an exhaustive sole-contact image. The cyborg castle remains compact relative to the body.
3. **Monster correction retained.** The normal City (`05`), moving reverse view (`06`), Grove arrival (`07`), and later remnant-area arrival from two angles (`09`, `10`) retain coherent limb volumes and downward claw support. A rear angle can make an extended front paw look foreshortened; the side angle (`10`) resolves its downward claws. I did not reproduce the old persistently up-curled knuckle shape. The taller flesh castle remains visibly distinct from the compact cyborg castle.
4. **Grass correction retained.** The narrower irregular shoots remain quieter at normal scale and more plausible up close. `09` and `10` also show the remaining larger angular leaf clusters and fairly broad terrain-colour fields. Those are continuing polish limits, not a failure of the narrow-blade change or a new round-4 defect.

## Concrete limits and runtime observations

- **No new concrete in-scope visual or runtime error was identified.** This is a bounded independent visual conclusion, not proof that every possible terrain point, animation frame, or device configuration is error-free.
- **Existing City/phone framing limitation persists.** In the settled normal City view (`05`) the lower monster body falls behind/below the tray. The robot portrait emulation (`04`) leaves a narrow body window between the panels; the monster landscape emulation (`08`) gives most vertical space to the panels/tray while much of the body sits below them. This was present in earlier reviews and is not demonstrated to be a regression from the rig/ground refresh. It remains relevant to the global presentation result without authorizing a HUD/camera redesign in this request.
- Controls and captures remained responsive in this round. The unusual round-2 slow-response observation was not reproduced. Robot `02` at 18:38:01.190 UTC shows 41 m remaining, food 173, Day 01; `03` at 18:38:22.103 shows gathering, food 180. Monster `06` at 18:39:36.720 shows 42 m, food 168, Day 01; `07` at 18:39:46.882 shows gathering, food 172. The later native World-map trip reached an ordinary at-anchor state in `08`–`10`. These are capture/HUD bounds, not matched performance windows, FPS, or a speedup measurement.
- Browser warning/error inspection returned **0 entries**. No crash, missing model, or exploding geometry was observed. This does not substitute for the builder's final performance/offline/manual QA.

## Ranked polish still separating this from AAA

1. **Carrier surface hierarchy.** Dark plates and bright robot accents compete, while the monster's dark mane and exposed flank details read as a dense near-black mass. Asset detail has improved, but material grouping and readable form separation remain below an exceptional finish. Preserve identities and proportions; no wholesale regeneration or speculative rig edits are requested.
2. **Environmental cohesion.** Fine grass is improved, but large leaf clusters and broad flat terrain colour still create uneven density and shape emphasis. Further improvement is a separate considered art direction decision within preservation/budget constraints, not a reason to reopen this four-round loop.
3. **Road material depth.** The final variation is helpful and restrained. Remnants still read relatively flat at close range. This is ordinary polish, with the user's irregular broken-remnant direction now represented; it is not an uncorrected repeated-clean-tile defect.
4. **Motion weight.** The specific support faults remain resolved in the inspected poses. Both carriers can still feel mechanical in motion. No fresh discrete deformation fault was established that would justify risking those fixes.

## Fixed-standard scores

| Area | Score / 10 | Reason |
| --- | ---: | --- |
| Game-design readability in normal gameplay | 7.2 | Moving-city identity remains clear; existing normal City and phone framing limits persist. |
| Character form and surface treatment | 7.4 | Strong detailed identities, with busy/dark material hierarchy unchanged. |
| Rig pose, weight, and animation presentation | 8.0 | Prior support corrections remain coherent in fresh motion and arrival poses. |
| Ground detail integration | 8.0 | Narrower irregular grass improvement retained. |
| Broken-road treatment | 7.9 | A small tonal improvement over round 3's 7.8; shapes and paint remain correct. |
| Overall aesthetics and presentation | **7.9** | The subtle road pass does not materially move the global judgment. |

The overall score is an art-direction judgment, not an arithmetic average or a technical-test score. The standard is unchanged: 7 is good indie, above 8.5 is AAA, and pass requires at least 8.5 plus zero identified visual/runtime errors. Even setting the older HUD/phone limits aside, the current carrier/environment material finish remains below 8.5. Do not round the result up, equate no new scoped errors with a passing gate, or clear the release blocker on the basis of test parity.

## Coverage and evidence boundaries

- **10 original PNGs**, 10 unique SHA-256 hashes, **14,527,808 bytes**. `screenshot-metadata.json` records original dimensions, creation timestamps, byte sizes, and hashes. No image was cropped, retouched, or upscaled.
- Desktop default viewport: **1278 × 1214**. The initial robot City image (`01`) was taken shortly after expedition entry and before any orbit/zoom adjustment. Camera transition timing and naturally progressing resources differ between rounds; these originals are not falsely claimed pixel-matched before/after pairs.
- Phone portrait **390 × 844 on robot**, landscape **844 × 390 on monster**: viewport emulation only. This focused final round does not repeat both orientations on each carrier; round 2 contains that broader set. No physical-phone verification occurred.
- Both carriers: normal City HUD, reverse/orbit zoom-out, moving native route start/turn, close native Titan arrival/rest. Monster additionally used native World-map travel to a visible road-remnant area, followed by two close arrival angles. This is not a high-frame-rate recording, exhaustive gait audit, or repeat of the long round-2 route. Close captures `03` and `07` are arrivals, not falsely labelled strides.
- Native storey selectors continued to list Citadel, Dwellings, and Hanging gardens; the City tray continued to state that each new district adds a storey above. Construction order, collision, picking, saves, and event timing were not independently retested by the critic.
- Builder-reported final verification on the frozen fingerprint: **328/328 Node tests passed; 50 identity and 42 golden-save checks passed; full ground preservation and exact road geometry parity passed**. The critic did not rerun those checks. Final candidate performance/offline/manual QA was planned by the root after release of the GPU slot, and is not claimed as completed by this review.
- The viewport override was reset and the tab navigated to `about:blank`. The root was told that captures were complete and the GPU/CPU slot was free before this report was written. No implementation/asset/test edit, publication, or deployment was performed.

This is **round 4 of 4 maximum** for this work request. **Stop visual revisions for this loop. Preserve the failed global visual gate and report the remaining polish and existing presentation limits.** This report grants no publication exception.
