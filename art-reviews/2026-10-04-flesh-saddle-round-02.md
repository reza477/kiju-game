# Independent art review — flesh saddle city — round 02

**FAIL — overall 7.4/10.** The two worst distractions from round 1 are corrected: the base guns now sit on short shoulder mounts, and the detached gold fittings were not reproduced. The remaining tall, mostly empty rear support cage still fails the requested close-fitting horse-saddle silhouette. This is a meaningful improvement, but not a passing result.

## Reviewed identity and changes

- Dirty candidate above baseline `ef5a6b5a68b5646a04e54ca55a4593570189292a`, checkout `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`, branch `codex/flesh-saddle-city-20261004`.
- Build independently visible on intro and save-transfer panel: `8c5ca0d76ad1f181f5ac`.
- Frozen source fingerprint read from `artifacts/flesh-saddle/executions/build-round2.json`: `75b070faf1d91abb3e77b81364d6af3ebfca24e564c3143dc6760d2ebec977b1`.
- Builder-submitted changes since round 1: lowered visual base-gun mounts and compact brackets; removed obsolete gold pieces; replaced the tall solid apron with shorter drapes; narrowed/repositioned rear belts for resident clearance; clamped the selected ward. Builder states gameplay values and district firing geometry are unchanged. That claim requires the separate engineering evidence; it is not proved by this visual review.
- I wrote no implementation, assets, tests, or capture scripts. Round-1 report and originals remain unchanged. I used native UI actions and individual native Chrome DevTools screenshot commands in independent tab `418187958`, disposable origin `http://127.0.0.1:4238/`. The owner origins were untouched.

## Ranked findings

1. **Remaining concrete defect: the tall empty rear cage does not fit the posed torso.** Normal starter `01`, moving side `03`, and dense `06` show a large rectangular iron frame with an open vertical gap above the sloping rear body. Removing the brown slab exposes rather than resolves that gap. The citadel and top rails look propped on scaffolding well above the back, and the long rear hanging loop reinforces the shipping-rack reading. The requested result is padded tack carrying low quarters around the torso/waist. Fit the supporting structure to the actual posed body, including movement, without changing the creature's pose, scale or gameplay geometry.
2. **Round-1 gun crane defect corrected.** In `01`/`02` and moving views, the two original guns sit close to the mane/shoulders, below the highest room. Their supports no longer create huge outriggers above the city. Close Streets `04` is substantially clearer because the oversized diagonal crane beams no longer cross the room and residents. I did not verify firing behavior or grant any permission to change district weapon solutions.
3. **Round-1 floating gold defect not reproduced.** The isolated gold blocks seen in the prior `07` are absent in fresh normal/front/close views. Remaining buckles visible in `04` align with straps or frame junctions.
4. **Round-1 blank apron corrected, but the overall support problem remains.** The broad solid brown wall is gone and the body is more exposed. The open rear frame in finding 1 is now the limiting silhouette defect. Do not count the disappearance of the wall as full success for the whole saddle attachment.

## Positive observations and scoped polish

- Three-ward and twenty-ward layouts remain low rooms on top and both flanks. Neither recreates the former vertical castle. The short base mounts better match the owner's nimble-carrier direction.
- Starter Citadel Streets `04` shows natural-sized residents, railings and doors without the old crane occlusion. Dense Ward 20 `08` shows an occupied garden platform and adjacent rear wards with an ordinary selection ring; no new clear deck/body penetration or detached room was established from these views.
- Both imported fixture expeditions traveled to The Sunken Grove through normal UI destinations. Starter portrait `05` and dense landscape `09` show gathering after arrival. Moving views `03` and `07` show different gait phases; no new gross rig collapse, missing model or explosion was observed. This is bounded observation, not an exhaustive all-frame clearance proof.
- Ordinary polish after the support repair: repeated identical small stone cabins still resemble shelf units, and the thick black structural members compete with the rooms. Refine the hierarchy within this saddle task; no world rewrite or change to the closed environment pass is requested.
- Existing phone HUD congestion persists in `05` and `09`. These retain the ordinary panels, selected ward, tray and open destinations. It remains a global presentation limitation, not a demonstrated regression caused by the lowered mounts.

## Fixed-standard scores

| Area | Score / 10 |
| --- | ---: |
| Requested compact saddle silhouette | 7.1 |
| Attachment and structural coherence | 6.8 |
| Small district and resident presentation | 7.6 |
| Observed movement with the load | 7.8 |
| Overall design readability and aesthetics | **7.4** |

The overall is an art-direction judgment, not an arithmetic average. The fixed standard is unchanged: 7 is good indie, above 8.5 is AAA, and pass requires at least 8.5 plus zero identified visual/runtime errors. The remaining support-fit defect prevents a pass. The previous rig/ground score and closed material work are not rescored or reopened.

## Evidence and limitations

- **9 original PNGs**, 9 unique SHA-256 hashes, **10,262,660 bytes**, saved under `artifacts/critic-round-02/flesh-saddle/`. Native CDP captured PNG directly; none was converted from JPEG, retouched, cropped or upscaled. File hashes, dimensions, byte counts and timestamps are recorded in `screenshot-metadata.json`.
- Capture interval **19:34:17–19:37:50 UTC, 4 October 2026**. Desktop **1278 × 1014**. Portrait **390 × 844** and landscape **844 × 390** are Windows Chrome viewport emulation, not physical Apple or Safari testing.
- High detail, daylight, steady camera, 1×. Same supplied starter/dense save fixtures as round 1, loaded through normal save-transfer confirmation. The critic did not construct twenty wards manually or change capacity/balance.
- Screenshots `04` and `08` were taken on the final approach, not falsely labelled settled arrivals; `05` and `09` establish arrival separately. These are not exact camera/time-matched before/after pairs or performance samples.
- One UI action during page loading and the first default-timeout PNG capture timed out; the settled page state was re-observed, and the explicit 15-second screenshot timeout succeeded. No game crash was observed, and the browser warning/error log contains **0 entries**. The tool timeouts are not evidence of measured FPS.
- Builder reported 14/14 focused checks and successful build before submission. I did not run code/tests or claim validation of saves, collision, functional weapons, all poses, thermal behavior, or release readiness.
- At completion the viewport was reset and the review tab navigated to `about:blank`; the root was informed the rendering slot was free before this report was written.

**Round 2 of 4 maximum. No release or publication exception.**
