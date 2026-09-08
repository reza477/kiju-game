# Independent art review — prototype 0.8, round 1 of 4

**FAIL — 7.5 / 10 overall. Zero confirmed concrete visual or runtime errors in reviewed coverage.** The owner's construction rule now works: a district is a new storey above the current top, and a lower-storey upgrade raises the storeys above it. The resulting castle needs a stronger Gothic architectural identity. At full capacity, its repeated square window modules read as a thin apartment tower rather than the reference's dramatic castle.

Reviewed frozen revision: **`b4bd9e9e8b77f1b1a6eaaa364606fa67a7da4740`**. The critic verified HEAD and the clean product/test tree before capture and after inspection. Only this report was written by the critic. No implementation, assets, tests or capture scripts were changed.

## Fixed global rubric

Above 8.5 is AAA quality, 7 is good indie, and 5 is programmer art. Pass requires at least 8.5 overall and zero identified visual/runtime errors. The whole-game weights from the previous cycle are retained; this is round 1 of a new vertical-growth update, not a reopening of the closed 0.7 cycle.

| Category | Weight | Round 1 |
|---|---:|---:|
| Default composition and readable game presentation | 20% | 7.6 |
| Terrain, environment assets, atmosphere | 20% | 7.7 |
| Kaiju construction, animation and physical weight | 20% | 7.3 |
| Citizens, clothing and life | 15% | 7.5 |
| City and carrier asset design | 15% | 7.3 |
| Combat and weapon visual communication | 10% | 7.8 |

Weighted result: **7.520, displayed as 7.5**. Correcting the game-design rule deserves clear credit, but does not automatically increase the art score. The simplified new shell loses some of the previous castle's architectural variety. Unchanged landscape and character limitations continue to affect the whole-game score; they are not demands for unrelated environment or character rebuilding in this update. Combat presentation is retained from prior reviewed coverage; the current capture runner did not perform a new battle sequence. Subjective audio was not reviewed.

## Own fresh evidence

The critic independently ran the existing `tests/vertical-growth-browser.mjs` unchanged against the local game, with output directed to **`artifacts/critic-vertical-01/`**. It produced **36 fresh normal-HUD screenshots**, seven passing checks, zero browser errors and zero remote requests. `report.json` records the observations. Every captured observation reports a valid camera, no lost WebGL context, 10 loaded surface sets, zero pending surfaces and no material failures.

The critic inspected both kaijus from front and reverse, initial and completed additions, construction and lower upgrades, whole-carrier and close Streets views, both travel pairs, a 20-storey castle from several views, dusk, a 390 px layout, and all four non-kaiju additions. These are the critic's own captures, not builder images. The runner uses the actual product tick/render under a deterministic clock and public build controls; it hides only transient pause/toast overlays. Its explicitly labeled 20-storey fixture grants resources and then pays actual harness and building orders.

Observed construction evidence:

- Both kaijus begin with three storeys, district IDs `7, 11, 13`, occupying an **8.8 by 10.4** footprint and **11.4** stack height. A paid Timber guild becomes district `0`, directly above them, increasing stack height to **15.2** without changing footprint.
- Upgrading the lower Dwelling increases its storey height from **3.8 to 4.6** and lifts every higher storey by **0.8**. Save/reload preserves construction order. The actual numbers support what is visible in the initial/addition/upgrade sequence.
- Paid harness reinforcement changes capacity without adding height. Twenty actual completed districts retain the same footprint and remain selectable, including Storey 20 in Streets view.
- Standard and drill crawlers, horizontal envelopes and exactly four upright balloons retain horizontal district placement. Their faction silhouettes remain distinct.

Movement pairs show different supported poses while the backpack remains attached; no new detached limb, torn skin or obvious contact failure was identified. Streets exposes the selected district and its residents without the enclosing shell blocking the task. One flesh top-workshop capture caught a transient tab-label/highlight presentation while entering Streets; the following floor capture is correct, so this is not classified as a confirmed persistent UI defect. The narrow mobile frame fits without horizontal overflow, though its large HUD leaves little room for the creature. These are bounded observations, not proof of every pose, save or screen size.

The builder separately reports 62 passing Node tests, 13 gameplay smoke checks, 80 citizen checks and 648 actual-mesh weapon cases with no errors. Those are builder evidence and were not independently reproduced by this critic in this round.

## Ranked improvements for the next builder attempt

These are **aesthetic and presentation shortcomings, not confirmed concrete defects**. Preserve the successful one-district-per-new-top-storey mechanic, stable IDs, upgrade lifting and fixed backpack footprint throughout refinement.

1. **Give the growing tower Gothic structural and silhouette hierarchy.** In `cyborg-twenty-storeys-city.png`, its reverse and whole-carrier views, the same square module repeats almost uninterrupted from base to roof. The initial mixed-use three-storey castles also have nearly identical external tiers. The large plain hipped cap and small corner points do not establish the reference's spires, chambers and connected Gothic forms. Introduce a coherent buttressed vertical spine, more considered grouping of window bays, and a more distinctive crown, with architectural variation attached to actual occupied storeys. Keep all growth above the preceding top and within the same footprint. Do not solve repetition by reinstating side-by-side districts or empty prebuilt floors.

2. **Make construction readable on the exterior in ordinary City view.** `cyborg-fourth-under-construction.png` and `cyborg-four-storeys.png` show essentially the same finished outer shell and roof. The timer communicates the difference more than the building does. The existing scaffolding visible in the lower-upgrade Streets view is useful, but it is concealed by the complete outer shell in City view. Show a restrained, clearly unfinished upper stage and visible work or lifting structure while it is building, followed by a clear finished state. Maintain legal weapon clearance and the same final storey dimensions.

3. **Let a storey's use remain legible without opening the inspector.** The Timber guild's saw and the Dwelling ledger work well in close cutaways, but the castle exterior wraps housing, gardens and industry in the same window pattern. Give actual district types a small number of deliberate architectural cues—garden foliage or tracery, workshop vents or timber framing, fortified gun bays—integrated into the same vertical tower. The top Streets view should continue to show the existing working citizens clearly.

The current update is mechanically faithful and playable, but does not meet the fixed AAA art gate. **Round 1 result: 7.5 / 10, zero confirmed concrete errors in reviewed coverage; submit a scoped revised builder attempt for round 2.**
