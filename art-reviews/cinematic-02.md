# Independent cinematic review — round 2 of 4

**FAIL — 6.9 / 10 overall.** Battle-entry clipping is fixed in the independently captured normal flow. Local night lighting, environmental motion and lethal-hit presentation improve. No remaining concrete visual or runtime defect was confirmed in this review, but the aesthetic score remains below the fixed 8.5 requirement.

Reviewed frozen revision: `22efd80d779ec7969129fc5639b9ea41f6728ed1`, independently verified before capture. All current evidence was freshly captured by the critic at `http://127.0.0.1:4178/`. The critic wrote only this report, without changing implementation, assets, tests or capture scripts. Previous reports remain unchanged.

## Fixed global rubric

Above 8.5 is AAA quality, 7 is good indie and 5 is programmer art. A pass requires overall at least 8.5 **and** zero identified errors. Resolving the errors does not lower the aesthetic threshold.

| Category | Weight | Cinematic round 1 | Round 2 |
|---|---:|---:|---:|
| Default composition and readable game presentation | 20% | 7.3 | 7.6 |
| Terrain, environment assets, atmosphere | 20% | 6.5 | 6.7 |
| Kaiju construction, animation and physical weight | 20% | 6.5 | 6.5 |
| Citizens, clothing and life | 15% | 6.5 | 6.5 |
| City and carrier asset design | 15% | 6.8 | 6.9 |
| Combat and weapon visual communication | 10% | 7.1 | 7.3 |

Weighted result: **6.9**. This approaches the good-indie benchmark. It is clearer and more functional than the previous submission, but the restrained presentation still falls short of the requested epic lighting and camera finish. The weights are global and unchanged; existing character limitations have not been silently removed from the score.

## Independent captures and checks

Existing neutral runners were executed unchanged in isolated profiles, with the normal HUD retained. The deterministic runners advance the real simulation, scene and UI; they hide only transient pause/toast overlays.

| Critic-owned directory | Fresh screenshots |
|---|---:|
| `artifacts/critic-cinematic-02/tour/` | 34: all factions day/dusk/night, Streets/World/performance, river motion and pause, camera phases, melee and lethal phases, manual/Steady, reduced-motion default and 390px layout |
| `artifacts/critic-cinematic-02/entry-kaiju/` | 6: actual UI Approach and Engage from World |
| `artifacts/critic-cinematic-02/entry-crawler/` | 6: actual UI Approach and Engage from World |
| `artifacts/critic-cinematic-02/entry-airship/` | 6: actual UI Approach and Engage from World |
| `artifacts/critic-cinematic-02/entry-kaiju-city/` | 6: additional actual UI entry from the close City view |

**Total: 58 fresh screenshots across five completed runs.** Every run reported zero console/page errors and zero remote requests. The four entry runs reported no clipped carrier bounds. The tour reported no WebGL context loss and passed its clock, damage timing, camera comfort, lethal-dialog and mobile layout assertions. The builder's separate checks and screenshots are not counted here.

The entry sequences capture the approached state and 0.05, 0.10, 0.30, 0.75 and 2.15 seconds after actual Engage. They do not teleport an unsettled camera into the test. These bounded observations do not establish universal absence of bugs or long-session flicker.

## Changes since the previous review

**Battle-entry framing defect resolved.** In all three faction sequences, both carriers are already in a usable arena composition at the early samples. `entry-kaiju/entry-010.png` no longer cuts off the player or backpack; the close-view transition in `entry-kaiju-city/entry-005.png` also opens with both carriers visible. The previous pan through stale world framing is absent from these captures.

**Local light now affects nearby surfaces.** `tour/kaiju-city-night.png` and `kaiju-streets-dusk.png` show warm light on paving, facades and some people, with an uplight revealing back panels. Crawler and airship night views have a stronger warm focal point at the central occupied buildings. This is a visible improvement over luminous windows without surrounding illumination.

**Lethal contact gets time on screen.** `tour/lethal-windup.png` retains one enemy hit point and no dialog. `lethal-contact.png` shows zero health while the scene remains visible; `lethal-result.png` shows the result afterward. The shared timing and delayed dialog assertions pass. The sequence is functionally more legible even though the visual impact remains understated.

**Atmosphere and comfort behavior remain stable in the checked sequences.** River motion and mist advance between the temporal pair, freeze on pause and remain clear of the managed city. Steady mode, manual priority and the reduced-motion default continue to pass. Settled close views remain usable.

## Errors versus polish

**Confirmed remaining visual defects: 0 in the inspected evidence. Runtime errors: 0 in these runs.** The previous confirmed entry defect is closed. No new hovering, intersection, light leak or shadow mismatch is asserted from an ambiguous projection.

The soft repeating light bands on the river, isolated bright lighting patches, dark outer carrier forms and understated camera events are aesthetic limitations described below. They are not automatically labeled renderer errors. The fixed score threshold alone is sufficient for this review to fail the gate.

## Ranked corrections within camera, atmosphere and lighting

### 1. Integrate the local lights into a broader form-lighting design

**Evidence:** `tour/kaiju-city-night.png`, `crawler-city-night.png`, `airship-city-night.png`, and `kaiju-streets-dusk.png`.

The added pools are useful, but the image now alternates between small bright patches and large dark areas. The kaiju's back receives a noticeable warm spot while arms and broad body transitions remain poorly separated. The crawler's central buildings are lit, while much of the deck and chassis still reads as a flat dark mass. The sources need to work together as a composition.

**Correction:** balance a restrained broad key/fill with the warm local sources. Spread visual emphasis through the occupied lanes and important forms, rather than increasing the number or brightness of isolated hotspots. Let the subject separate from the background while preserving night and material color.

**Acceptance:** close and normal night views retain readable large forms, with smooth transitions from lit to shaded surfaces. The brightest areas identify the scene's focal structure or action. Pale walls/envelopes retain shading; the hero does not require a bright patch on one panel to become visible. Keep transitions stable over time.

### 2. Make atmosphere read as depth and moving air

**Evidence:** `tour/river-wind-a.png`, `river-wind-b.png`, `kaiju-world-dusk.png`, and the entry wide shots.

Mist is more localized, but the primary landscape is still dominated by a similarly green field with repeated prop silhouettes. Soft pale bands repeat across the river at noticeable intervals, and the distant view has limited separation between terrain layers. The result feels softly filtered more than atmospheric.

**Correction:** refine the existing mist's scale, spacing and depth relationship so drift is legible around bank/depression forms rather than mainly as repeated surface bands. Give foreground, middle distance and far terrain different contrast and light relationships. Keep the player's city unobscured and avoid blanket density increases.

**Acceptance:** a low river view and a normal World view communicate distinct depth layers with a clear focal feature. Mist reads as irregular moving air instead of repeating stripes. Temporal samples preserve soft boundaries and believable position; the high/performance comparison retains the same basic color relationships.

### 3. Give a key combat event a deliberate shot and visible aftermath

**Evidence:** `tour/melee-windup.png`, `melee-contact.png`, `melee-recovery.png`, `lethal-contact.png` and `lethal-result.png`.

The camera is now stable and the timing is correct. It nevertheless presents much of the event from a similar distant overview. The extra time before the result dialog is welcome, but a subtle hit against an already illuminated city is still easy to miss. Correct sequencing is only the foundation for an epic moment.

**Correction:** use a short, modest framing change to emphasize the actual contact surface and carried scale, then return to tactical reading. Make the surface response and brief aftermath visually distinct from permanent lamps. Preserve the current entry safety, stable recovery, manual priority and reduced-motion behavior.

**Acceptance:** at normal play zoom, start, contact peak and recovery have an obvious visual purpose; the decisive hit can be understood without watching the health number. Both carriers and controls remain readable. Repeated attacks do not cause camera drift or persistent offsets, and Steady mode still conveys impact through the scene itself.

### 4. Refine the visible relationship between wind, water and material response

**Evidence:** the river temporal pair, faction Streets dusk views, and World/performance captures.

Secondary motion is active, but the material response still gives water, foliage and some carrier surfaces a simple, similarly muted finish. The river's broad smooth bands are much more obvious than small directional ripples or a changing reflected-light pattern. Tree crowns retain a rigid-clump impression in the wide view.

**Correction:** concentrate on existing surfaces and secondary motion: varied, restrained foliage response; a coherent flow direction and highlight scale on water; and consistent movement/shadow relationships. This is a rendering and motion pass, not a request to add scenery or replace the architecture.

**Acceptance:** close and wide temporal sequences show a believable scale difference between large stable forms and small moving detail. Water reads as a surface responding to light and flow; foliage motion avoids synchronized wobble. Pause and quality changes retain the verified clock behavior and stable composition.

## Existing limitations outside the ranked scope

The kaiju's primitive joint/form transitions, limited carried weight, generic citizen activity and repeated environmental forms remain broader constraints on the global score. They are not newly introduced defects, and the ranked corrections above stay within the user's camera/weather/lighting update. Surface lighting improves the existing city assets without changing their faction identities.

## Decision

**Return to the builder for cinematic round 3.** The observed error condition is clean, but **6.9 is below 8.5**. Preserve the verified entry, timing and comfort improvements while working on the ranked visual finish. Two review rounds remain in this cycle.
