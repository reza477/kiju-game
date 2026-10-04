# Meshy pilot — independent art review, round 1

**Result: 7.0/10 for the bounded pilot. FAILED.** The required gate is at least 8.5/10 with zero identified visual or runtime errors. This is a promising local import, not AAA art approval. The whole game's observed presentation is approximately **6.7/10**; this is contextual judgment, not a request to expand the task. Game mechanics/design were exercised, not rescored or redesigned.

## Reviewer and source

- Reviewer: independent `painterly_art_critic` subagent acting as a demanding art director. I wrote this review and saved screenshots; I wrote no implementation, asset, test, or capture-script code.
- Reviewed implementation: `fa1cd3f61986124e72164ededd925715f018beb6`, Git tree `b125cc1509003b9e53edaca7711130ff4f28ff37`. The checkout was clean at the pre-review inspection and still at that commit in my first post-session inspection. Later builder edits are not covered by this review.
- Worktree: `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`.
- Fresh isolated origin: `http://127.0.0.1:4215/?test=1`. I created one game tab in the authorized reza Chrome session. The browser provider ID had changed from the handoff's 4 to 2; I verified the current inventory. I did not use Meshy or any unrelated tab.
- This is the first review of the new bounded Meshy pilot. The interrupted broad painterly pass and its four closed reviews remain unchanged; none of their old screenshots substitutes for this inspection.
- Changes under review: three local imported masters replacing selected tree/rock visuals, their in-game material treatment, and the current ground/water material changes. Six tree instances plus 48 rock instances were reported by the live read-only pilot diagnostics. The actual game showed the imported pine, broadleaf, and bank rocks together.

## Judgment at ordinary gameplay distance

The broadleaf is the clearest improvement. Its trunk joins a substantial crown, and the root/trunk silhouette reads as an object with weight. The crown is more convincing than the surrounding older separated foliage pads. The imported pine is connected and recognizable, but its highly repetitive sculpted lobes, bright blue-green tips, and dense surface contrast make it resemble a decorated cone. More detail has not produced equally good material readability.

The rocks have local weathered structure, but many bank instances flatten that structure into dark violet-grey cracked slabs. Along the same bank, the pale legacy boulders and the new dark stones appear to come from different material sets. In normal City view the ground remains mostly large soft green/brown gradients with fine scattered specks. The river is legible and its fine surface markings move, but the uniform smooth edge and weak local contact do not yet tie the new kit to convincing damp soil. The scene remains easy to read, with restrained effects and useful daylight, but it does not reach the fixed 8.5 standard.

## Concrete defects, ranked

1. **Pine material/form reading — visible at normal zoom.** Repeated small rounded protrusions receive conspicuous bright highlights against deep blue-green recesses. The result competes with the carrier and reads more like a pine-cone ornament than a matte, naturally branching crown. See `03`, `05`, `06`, and `08`. A bounded material revision can reduce normal/highlight contrast. It cannot remove the downloaded model's repeated lobe topology. A genuinely different crown silhouette is not promised by this pilot's remaining material work; no further generation is authorized.
2. **Bank rock treatment lacks cohesion.** In `04` and `05`, several new low-profile dark cracked pieces sit beside much lighter rounded legacy pieces. The abrupt change in value/hue and compressed-looking surface detail is visible from ordinary gameplay, rather than being a close-up-only concern. Harmonize the existing kit's material response and preserve the required support/placement geometry. Changing the rock model's major sculpted forms is beyond a simple tint or normal adjustment; do not claim those forms have changed after material-only work.
3. **Known runtime failure path, reported by the technical audit rather than reproduced by me.** During this review the parent reported that an injected image-decode failure can produce an untextured `ready` result and leaked blob URLs. My normal-load paths showed textured models and no captured warning/error messages. The defect still prevents any zero-error claim for this revision. My review is not evidence that a later repair passed its fault-injection tests.

No additional definite runtime malfunction, disconnected replacement root, floating imported object, or suddenly missing texture was observed in the successful paths I exercised. This is bounded observation, not an exhaustive assertion of absence.

## Ordinary polish opportunities, separate from defects

1. Give the existing ground material a clearer middle scale: small areas of woodland litter, mineral earth and damp bank should be distinguishable without a blanket of fine noise. The broad gradients currently dominate.
2. Strengthen localized river/stone/soil contact and restrained shallow/deep organization using the current river data. Avoid a continuous outline or another cloudy ribbon.
3. Retain the broadleaf's connected silhouette while matching its crown contrast to the pine and surrounding ground. Do not broaden this pilot into replacement of all surrounding trees.
4. Inspect the existing kit at Performance resolution when choosing detail strength. In landscape phone emulation, small imported assets are often only a few tens of pixels high; extra fine detail cannot substitute for major forms.

These are visual-material priorities only. There is no recommendation here to change collision, placement, resource content, controls, construction, combat, balance, or progression.

## Independent ordinary Computer Use session

The session began **2026-10-04 01:15:21.420 UTC** and ended **01:25:15.138 UTC**, a wall duration of **9 minutes 53.718 seconds**. It used visible UI and normal input, adapting to the current screen. No scripted route replay, teleport, time advance, injected game-state write, or test-only prewarming was used. Read-only diagnostics supplemented the UI. CUA tool round trips, menu pauses and loading are included in that wall time; it is not ten minutes of uninterrupted simulation or a performance benchmark.

Completed:

- Began the armored crawler at a fresh origin. Selected Dwellings, chose District 1 using the normal placement controls, saw its construction countdown, and observed completion: capacity rose from 30 to 42. Selected-district details showed the built Dwellings and Upgrade action.
- Selected The Sunken Grove in the real destination menu and observed native travel. Then used the visible minimap to choose the pilot approach near `(-8,-98)`, following an ordinary world-space route rather than restoring a camera fixture.
- Paused with the normal pause button, observed the PAUSED banner, and resumed. The completed placement was retained.
- Used Streets, World and City modes, normal/near views, and several drag orbits and pitches. Streets showed moving citizens and the crawler's construction details. The near zoom was an actual scroll action; normal framing was restored through City view.
- Read native route positions as `(-34.963,32.201)`, `(-42.693,-8.235)`, `(-27.927,-47.334)`, `(-10.558,-93.325)`, ending at `(-8.372093,-99.113549)`. These are sampled reached points, not a complete route trace. Saw crawler trails and existing scenery destruction on the route.
- Saved through Save, reloaded the real page, and clicked Continue saved expedition. Pre/post diagnostics show exactly matching location, buildings (including completed District 1), and eleven expedition destruction IDs; ordinary simulation advanced by 0.05 seconds after continuation. Both diagnostic JSON files are retained. This includes destroyed pilot shore/spit identities, but not a destroyed imported tree.
- Re-entered the saved expedition under phone-sized presentation, then verified portrait and landscape. Opened/closed Build and Map panels, selected a rival on the minimap, and used the existing touch movement buttons through actual emulated touchStart/touchEnd input. The crawler moved from `(-8.372093,-99.113549)` to `(-9.268856,-100.136005)`. Rotation retained the session and loaded art.
- Approached Saffron Voyager from the pilot area, observed distance reduce from 86 m to 33 m, selected Engage, entered battle, chose Approach, observed hull damage from 670 to 653, and used Withdraw. Returned to expedition with the damaged hull and 20-food withdrawal cost visible. This verifies battle entry and withdrawal, not a complete victory or defeat.
- Used Save & return to title, selected the cyborg kaiju, and accepted the normal new-expedition confirmation in this disposable isolated origin. Inspected that second carrier and moved it with touch input. This is a second-carrier spot check, not the six-carrier matrix.
- Queried the review tab's captured warning/error log during the session and at the end: empty arrays. Saved `browser-messages.json`. This does not cover deliberate fault injection or every browser event.

I closed my only game tab, disabled the temporary touch override and reset the viewport before handing the GPU back.

## Fresh screenshots and conditions

Evidence folder: `artifacts/critic-round-01/meshy-pilot/`. All ten PNGs are original full-viewport captures from my own tab via the supported CDP screenshot command, with gameplay HUD. No crops, retouching, upscaling, old builder screenshots or replacement imagery. Screenshot file-write UTC times below establish artifact provenance; they are not exact simulation-frame timestamps.

| File | Dimensions | UTC file-write time | Subject |
| --- | --- | --- | --- |
| 01-desktop-route-start.png | 1278 x 1168 | 01:17:18.094 | Native route and building selection |
| 02-streets-motion.png | 1278 x 1168 | 01:17:48.698 | Actual Streets view, citizens and city detail |
| 03-desktop-reverse-route.png | 1278 x 1168 | 01:18:16.304 | Reverse approach toward imported kit |
| 04-pilot-near-approach.png | 1278 x 1168 | 01:18:47.648 | Near city/bank material view |
| 05-pilot-normal-city.png | 1278 x 1168 | 01:18:57.374 | Normal City composition showing kit on both banks |
| 06-phone-portrait.png | 390 x 844 | 01:21:36.691 | Performance portrait gameplay |
| 07-phone-landscape.png | 844 x 390 | 01:22:11.329 | Performance landscape after rotation |
| 08-landscape-westward-motion.png | 844 x 390 | 01:23:06.873 | Westward native approach, new orbit |
| 09-battle-landscape.png | 844 x 390 | 01:24:04.644 | Existing battle HUD and approach |
| 10-second-carrier-motion.png | 844 x 390 | 01:25:15.137 | Cyborg second-carrier touch motion |

Desktop used High, daylight, cinematic camera. For `05`, there was no camera input between that capture and the saved diagnostic: yaw `7.471293771866262`, pitch `0.9600000000000003`, zoom `76`; anchored position `x=-8.372093023255815`, `z=-99.11354909489852`. The diagnostic time `44.7614` is later than the screenshot and is not asserted as its exact frame time. `04` had a read-only diagnostic immediately after capture: yaw `6.3912937718662635`, pitch `0.72`, zoom `10`, position approximately `(-10.558,-93.325)` while still moving.

Phone views are **desktop Chrome emulation**, not physical iPhone/iPad or Safari tests. Verified portrait: CSS 390 x 844, DPR 1, maxTouchPoints 1, Performance buffer 331 x 717. Verified landscape: CSS 844 x 390, DPR 1, maxTouchPoints 1, Performance buffer 717 x 331. An initial CDP mobile/DPR-2 override did not persist through the browser provider's reload/viewport handling; I detected that by reading actual dimensions, then used the supported persistent viewport override and touch emulation. I report the actual DPR-1 captures, not the unsuccessful intended DPR-2 configuration. Quality remained Performance, not forced High.

Tool limitations/failures are retained in the conversation: the first screenshot command hit its default 3-second timeout and succeeded on the supported longer timeout; an exact `Continue` locator did not match the actual longer button label; a stale native Engage index failed after a UI rerender and succeeded with the visible semantic control; an exact Withdraw label failed and the observed Withdraw control succeeded. None of these is evidence of a game-runtime failure.

## Explicit limits

- These ten independent review images are not the five matched before/after delivery pairs. The parent must capture/match and identify the final approved source separately. Do not use this round's images to represent a later material repair.
- Native motion was inspected through ordinary CUA interactions and successive live captures, not a high-frame-rate recorded analysis. Fine wind amplitude and sub-frame shimmer/pop cannot be certified from this session. I did not isolate and quantitatively verify wind on each imported tree.
- Several distinct camera angles were inspected, but an exact complete 360-degree orbit was not measured. Near/far views, all four directional inputs, two-entry woodland/crush coverage, and all three prescribed benchmark routes remain the separate engineering route suite's responsibility; I do not claim this independent session completed them all.
- I did not destroy an imported tree during this session or prove its saved disappearance independently. The saved destruction comparison covers the actual eleven IDs encountered on my route.
- Phone panels opened/closed and rotation preserved play; the landscape battle HUD leaves a narrow view strip, an existing presentation limitation outside this asset pilot. No redesign is proposed here.
- No frame median/p95/max, first-use cost, download footprint, packaged offline behavior, physical device behavior, long-session stability, or failed-image recovery was measured by this critic. Those require the builder's final-source test evidence.
- New grants/credits/generations are not requested. Material work can reduce the current pine's sparkling/beaded reading, but no honest material-only result can erase the sculpted repeated-lobe shape. If that shape remains unacceptable after the bounded refinement, report the limit and retain the failed art gate.

**Round 1 remains FAILED at 7.0/10.** A later repair requires its own relevant technical checks and fresh independent inspection; it must not silently revise this score or these findings.
