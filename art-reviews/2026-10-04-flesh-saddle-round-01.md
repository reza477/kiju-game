# Independent art review — flesh saddle city — round 01

**FAIL — overall 6.8/10.** The new low rooms on the top and flanks move toward the owner's saddle-city request, but the submitted assembly is not yet coherent. Two oversized gun cranes, detached gold fittings, and a tall blank central apron undermine the compact mobile-load silhouette. This is round 1 of the maximum four for this new work group. The preceding rig/ground review remains closed and failed; this report does not reopen that work or authorize unrelated changes.

## Identity and independent method

- Checkout: `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`.
- HEAD independently read: `ef5a6b5a68b5646a04e54ca55a4593570189292a`; submitted dirty candidate on `codex/flesh-saddle-city-20261004`.
- Build independently visible in the intro and save-transfer panel: `3288cd46eb0c4ef1709a`.
- Runtime fingerprint from the supplied build record, independently read: `184fade0dc63d38f0a56132c1d588bf49ffc49bf22c52a810629eb65404f26b0`.
- I wrote no implementation, assets, tests, or capture scripts. I used individual native browser actions and screenshot/file APIs in my own Chrome tab `418187958`, exclusively at disposable `http://127.0.0.1:4238/`. Owner save origins 4214 and 4178 were not touched.
- I imported the builder-prepared starter and 20-occupied-district saves through the normal save-transfer UI. These are supplied review fixtures, not evidence of personally constructing every ward. Native menus confirmed three and twenty district entries respectively. Detail high, daylight, steady camera, displayed speed 1×.
- Fresh original captures: `artifacts/critic-round-01/flesh-saddle/`, **19:24:18–19:28:40 UTC on 4 October 2026**. Both loads were moved to The Sunken Grove using ordinary destination controls and inspected en route and after the HUD showed gathering.

## Ranked concrete presentation defects

1. **The two tall gun cranes defeat the low saddle silhouette.** In normal City, front/reverse, and full-body Titan views (`01`–`05`, `10`–`12`), the paired triangulated beams rise far above the tiny new rooms. The first visual read is a mobile crane carrying cannons, not a compact torso saddle. In Streets (`07`), large diagonal beams cross the view of the occupied citadel deck. The builder identified these as retained base-gun supports. Correct their presentation only within proven gameplay-preserving bounds; this finding does not authorize changes to district-cannon firing geometry or combat rules.
2. **Gold fittings float in empty air.** Close Streets capture `07` shows two detached gold rectangular fittings to the left of the deck, separated from visible straps or supports. The same issue remains apparent in `11`. This is a concrete attachment defect, not a subjective request for more detail.
3. **The broad central apron still reads as an upright rigid wall.** Normal rear-side `01`/`10`, moving side `05`, and close `07` show a large blank brown slab beneath the top deck. It dominates the starter city even though only three small rooms are present. It does not convey padded tack wrapping closely around the torso/waist as requested. The apron/support transition needs a visibly connected, body-following treatment without changing the creature or its motion. This is failure to meet the requested silhouette; it is not a claim that the old body animation itself is broken.

## What already works

- Twenty occupied wards remain a collection of low rooms and platforms around the sides and on top; they do not rebuild the former Gothic tower. Dense views `10`–`14` establish that direction. The lower torso and legs remain readable in the wider Titan views.
- Gothic stone walls, pointed windows, dark roofs and residents' established clothing retain faction identity. Residents appear naturally sized relative to doors and deck railings in `07`, `13`, and `14`.
- Both starter and dense loads moved, turned, and arrived at the grove. I did not observe a new gross gait collapse, exploding geometry, disappearing room, or crash during these bounded routes. The recorded warning/error log has **zero entries**. This is not exhaustive animation or performance verification.
- Native district selection includes Ward 20; selecting it produces an ordinary selected-ring and upgrade description. I did not perform upgrades or combat and therefore do not claim their functional correctness.

## Ordinary polish, separate from defects

1. Repeated small stone boxes can look like a rack of identical shelf ornaments at maximum capacity. Within the approved district footprint and identity, clearer roof/prop grouping would make the dense load read as inhabited saddle quarters.
2. The abrupt material contrast between matte brown apron, thick shiny black beams and small stone rooms lacks a consistent construction hierarchy. This should be considered through the attachment repair before adding decorative complexity.
3. Existing phone HUD congestion remains severe: portrait `08`/`15` exposes a narrow body window, and landscape `09`/`16` is mostly panels and tray. These screenshots retained the ordinary HUD and open resource destinations. This known global presentation limit is not demonstrated to be caused by the new saddle work and does not authorize a HUD redesign.

## Fixed-standard scores

| Area | Score / 10 |
| --- | ---: |
| Faithfulness and readability of the requested compact saddle silhouette | 6.3 |
| Attachment, structure and material coherence | 6.0 |
| Small district and resident presentation | 7.5 |
| Observed movement with the new load | 7.8 |
| Overall design readability and aesthetics | **6.8** |

The overall is a fixed-standard art-direction judgment, not an arithmetic average. Seven is good indie; above 8.5 is AAA. Pass requires at least 8.5 and zero identified visual/runtime errors. The current scoped defects independently prevent a pass. This score does not replace or revise the preceding 7.9 rig/ground result.

## Evidence limitations and cleanup

- **16 original JPEG screenshots**, 16 unique SHA-256 hashes, **2,150,090 bytes**, recorded in `screenshot-metadata.json`. The native `getScreenshot()` API returned JPEG bytes; initial `.png` suffixes were corrected to `.jpg` after signature inspection. Pixels were not recompressed, converted, retouched, cropped or upscaled. These originals are supplementary critic evidence, not substitutions for the handoff's required matched original PNG pairs.
- Desktop native viewport **1278 × 1014**; phone portrait **390 × 844**, landscape **844 × 390**, on Windows Chrome. Phone views are emulation, not a physical iPhone/iPad or Safari test.
- Capture `06` was named `streets-arrival` prematurely: its visible screenshot is the preceding Titan camera transition while still moving. It is not used as proof of settled Streets or arrival. `07` is the settled Streets camera with gathering visible. `13` likewise shows the final approach before the subsequent state reported gathering; `14` is the settled arrival. Files are retained unchanged and these timing distinctions are explicit.
- Other captures taken immediately after camera changes may include ordinary camera interpolation. None is labelled as a pixel-matched before/after pair or a frame-time measurement.
- Builder reported 334/334 tests and build success; I did not rerun these checks. Save, progression, collision, picking, weapon solution and performance preservation require the builder's separate evidence.
- After capture I reset the viewport, saved the empty warning/error log and navigated the tab to `about:blank`. The root was notified that the rendering slot was free before this report was written.

No publication or release exception is granted.
