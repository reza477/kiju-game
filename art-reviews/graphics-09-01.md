# Independent art review — full graphics update 0.9, round 1 of 4

**FAIL — 7.8 / 10 overall. One confirmed visual defect; zero browser runtime errors in the four capture runs.** This is a richer indie prototype, particularly in vegetation, clothing, reflective surfaces and combat sparks. It is not yet AAA quality: larger environmental and anatomical forms still look procedural, and a detached-looking lantern survives the Gothic Streets cutaway. Both the 8.5 score threshold and the zero-error requirement are unmet.

Reviewed frozen revision: **`74e97a57bfe996227e8a21f6a6bc91173f3aa44c`**. HEAD and the clean product/test tree were verified before capture and after inspection. The critic ran existing capture runners unchanged, used a bounded read-only live mesh inspection to identify a visible defect, and wrote only this report. No implementation, assets, tests or capture scripts were changed. This is a new full-graphics cycle; earlier reports and closed cycles remain unchanged.

## Fixed whole-game rubric

The fixed standard remains above 8.5 for AAA, 7 for good indie and 5 for programmer art. Pass requires at least 8.5 plus zero identified concrete visual/runtime errors. Scores reflect the actual game, not the amount of implementation or the number of passing tests.

| Category | Weight | Round 1 |
|---|---:|---:|
| Default composition and readable game presentation | 20% | 7.9 |
| Terrain, environment assets, atmosphere | 20% | 7.8 |
| Kaiju construction, animation and physical weight | 20% | 7.4 |
| Citizens, clothing and life | 15% | 7.7 |
| City and carrier asset design | 15% | 8.0 |
| Combat and weapon visual communication | 10% | 8.0 |

Weighted result: **7.775, displayed as 7.8**. The improvements are real but modest at whole-game scale. The new fine detail does not overcome the weak larger forms. The confirmed defect is recorded separately below; the aesthetic score would still fail without it.

## Own fresh evidence and limits

The critic completed all four runners sequentially, with no simultaneous capture browsers:

| Existing runner | Fresh normal-HUD views | Evidence directory |
|---|---:|---|
| `tests/variants-art-capture.mjs` | 48 | `artifacts/critic-round-01/graphics-09/variants` |
| `tests/environment-art-capture.mjs` | 5 | `artifacts/critic-round-01/graphics-09/environment` |
| `tests/beauty-render-audit.mjs` | 19 | `artifacts/critic-round-01/graphics-09/lighting` |
| `tests/combat-art-capture.mjs` | 16 | `artifacts/critic-round-01/graphics-09/combat` |

**Total: 88 fresh captures, zero reported browser errors, zero remote requests and no runner failures.** The variant observations retain valid cameras and WebGL contexts. Environment/lighting diagnostics show all ten surface sets and five active skin sets ready, with no pending or failed loads. The first two completed capture sets were safely relocated into the required ignored review directory; their screenshots were not altered or recaptured merely for the rename.

I inspected representative front/reverse and close views, all six movement pairs, both Gothic street interiors, populated upper-storey views, all five landscape views, day/dusk/night scenes, all three detail modes, and firing/contact/recovery frames across the combat sequences. These are my own screenshots, not builder evidence.

The variant runner uses a deterministic product clock and a labeled twenty-storey building fixture after paid harness reinforcement. Those filled late-game districts are a fixture, not a fresh test of every paid construction order. The environment runner relocates the player/camera to existing landmarks; incidental overlaps in such relocated compositions do not establish a normal-navigation collision defect. Combat uses isolated default-faction ranged sequences and cyborg melee, with controlled enemy health/reload. It does not cover every variant or battle arrangement. Only transient pause/toast overlays are hidden.

The compact cyborg backpack, full-height flesh backpack, standard and elongated drill crawlers, horizontal airship envelopes and exactly four upright balloons remain distinguishable. Natural-sized residents remain visible in compact rooms. Upper occupied Gothic storeys remain inspectable. The builder's 67 core checks, 1,296 weapon samples, 16 ground cases, 12 aircraft actions and resident/deformation audits are separate functional evidence; I did not independently rerun those audits here. Subjective audio is unreviewed.

## Confirmed defect — fix before further polish

**D1: The backpack shoulder lantern appears to float after Gothic masonry is cut away.** It is plainly visible above the room in my `variants/cyborg-streets.png`, `variants/flesh-streets.png`, and both corresponding `lighting/*-night-streets.png` views. The small brown/dark housing remains suspended without its supporting wall, breaking the spatial logic of the inspected district.

A bounded read-only lookup through normal flesh Streets UI identifies the object as the unnamed **CylinderGeometry inside `Backpack shoulder lantern` → `Local city lamps`**. Its parameters are radiusTop 0.23, radiusBottom 0.28 and height 0.36; it projects to approximately **(719.97, 160.46)** in the 1440 by 960 viewport, matching the floating object. The lens is a CircleGeometry in the same group. My initial visual guess that it might be a belfry bell was incorrect; it is neither that bell nor citizen headwear. Make the lantern and its support obey the same inspection visibility, or provide a visibly supported inspection presentation without changing the intended castle height.

No other concrete visual error was confirmed in this coverage. In particular, movement pairs keep loads attached, the drill and propellers change phase, and melee contact/recovery frames do not show a new missed-contact or detached-impact problem. This does not guarantee error-free behavior in every state.

## What visibly improved

Forest belts are denser and more varied than the previous sparse repeated trees. Oak-like crowns, narrow conifers, understory, exposed stone and the broken railway structure give the landscape stronger local features. The river has a darker channel, pale shallow edges and more surface variation. Dusk separates warm windows from cooler outdoor surfaces without overwhelming the HUD.

The drill's metal edges and the airships' envelope panels and lower hulls read more deliberately. Their silhouettes remain clear in moving views. Clothing now has more useful folds, lapels and faction ornaments; the citizens look less like undifferentiated markers. Skin and metal respond differently to light. These improvements are most visible at Streets or carrier distance, rather than in the whole-world view.

Combat flashes illuminate their local source, and the crawler/airship contact frames show readable sparks at the struck surface. The cyborg melee sequence bends into a visible hull contact and returns to a supported pose. Effects generally preserve the view of both opponents. The small body-gun hit is still restrained, which is acceptable, but does little to sell a gigantic battle on its own.

## Ranked aesthetic priorities

These are polish priorities, separate from D1.

1. **Unify the terrain at an intermediate scale.** The wide bright-green swaths still read like painted lawn patches, especially in `environment/city.png`, `world.png` and `river.png`. Dense tree belts sit beside very broad smooth ground; the transition lacks convincing soil, scrub and drainage structure. Break up those boundaries with coherent material/value changes and vegetation tied to landform. The new detail is strongest in isolated clusters, not yet across the entire scene.

2. **Make the flesh hero's major forms convincing.** `variants/flesh-body-close.png` and its movement pair still show smooth tubular limbs, soft joint transitions and a simplified horned face. More surface detail and fingers help at close range, but do not establish shoulder, elbow, knee and torso structure or the burden of the city. Improve those larger planes and the visible transfer of weight while preserving the humanoid identity and existing dimensions.

3. **Give the Gothic tower a stronger architectural hierarchy.** Both expanded front/reverse views remain dominated by repeated narrow window bands along a shaft. The crown and supports are better, yet still too small and repetitive to achieve the reference's distinctive castle composition. Develop clearer relationships among the main keep, recessed sections, supports and crown within the established footprint. Preserve upward district order and the exact half-height cyborg profile.

4. **Bring close people and streets to the same finish as the carriers.** Clothing detail has improved more than faces, hands and close material scale. Their repeated upright silhouettes and simple facial finish still read as small toy inhabitants. Stronger face/hand shapes, softer cloth response where appropriate, and more varied visible activity would make inspection more rewarding. Preserve natural size, supported routes and work contacts.

## Performance observation requiring follow-up

My unchanged lighting runner reported **median animation-frame intervals of 20.0–79.9 ms, with p95 up to 100.1 ms**, on an RTX 4070 Ti SUPER through ANGLE/D3D11. That is materially slower than the builder's documented 10.1–30 ms medians. These short headless observations are uncalibrated and do not establish guaranteed player frame rates or a confirmed runtime defect. They do mean that this evidence cannot support a claim of consistently smooth high-mode play. Validate sustained foreground performance and identify the expensive views before spending more geometry or postprocessing budget.

**Round 1 complete: 7.8 / 10, one confirmed lantern/cutaway defect, zero browser errors in the four capture runs, AAA gate failed.** Fix D1 and address the ranked larger-form priorities before round 2; at most four review rounds apply to this update.
