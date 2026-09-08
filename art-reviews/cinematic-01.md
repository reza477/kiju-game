# Independent cinematic review — round 1 of 4

**FAIL — 6.8 / 10 overall.** Camera comfort controls, coordinated environmental motion and combat damage timing work in the fresh checks. The image remains too flat and weakly lit to meet the requested epic finish, and actual battle entry briefly clips the player's carrier. The fixed 8.5-plus-zero-errors gate has not passed.

Reviewed frozen revision: `324191eb3dbc8ebf13f0d2728c6ccf4b7cba0243`, product 0.5 at `http://127.0.0.1:4178/`. The critic independently verified the revision and initiated every current capture. Only this review was written by the critic; no implementation, assets, tests or capture scripts were written or changed.

This is a new review cycle for camera effects, environmental movement and lighting. The earlier four-round cycle remains closed. Existing character/asset limitations are recorded separately below; they are not a request to expand this update into a character rebuild.

## Fixed rubric

The same global weights and standard apply: above 8.5 is AAA quality, 7 is good indie, 5 is programmer art. Pass requires overall at least 8.5 and zero identified visual/runtime errors. Technical checks do not replace aesthetic judgment.

| Category | Weight | Prior cycle final | Current |
|---|---:|---:|---:|
| Default composition and readable game presentation | 20% | 7.4 | 7.3 |
| Terrain, environment assets, atmosphere | 20% | 6.2 | 6.5 |
| Kaiju construction, animation and physical weight | 20% | 6.5 | 6.5 |
| Citizens, clothing and life | 15% | 6.5 | 6.5 |
| City and carrier asset design | 15% | 6.8 | 6.8 |
| Combat and weapon visual communication | 10% | 6.6 | 7.1 |

Weighted result: **6.765, reported as 6.8**. Atmosphere and combat timing improve; the confirmed transition framing defect slightly reduces composition. The unchanged broader asset scores keep the global result honest. The score remains below 8.5 even if the entry defect is removed.

## Fresh independent evidence

| Output directory | Evidence |
|---|---|
| `artifacts/critic-cinematic-01/tour/` | 31 screenshots from the existing cinematic runner: all factions at day/dusk/night, Streets, World, performance mode, river temporal/pause sequence, camera-event phases, Steady/manual orbit, 390px layout and system reduced-motion default |
| `artifacts/critic-cinematic-01/fx/` | 16 real-time ready/firing/contact/recovery screenshots from the existing combat runner: all ranged factions plus kaiju melee |
| `artifacts/critic-cinematic-01/entry/` | Six screenshots from the existing entry runner, using actual minimap selection, Approach travel and Engage controls, with no setup teleport: before entry and 0.05/0.10/0.30/0.75/2.15 seconds after it |

**Total: 53 fresh screenshots. All three runs completed with zero console/page errors and zero remote requests.** No WebGL context loss was reported in the cinematic tour. Detailed capture reports remain beside the images. Builder-owned captures and tests were not counted as independent evidence.

The cinematic and entry runners hold the animation callback and step the real simulation, UI and scene using a deterministic clock. Only the transient pause/toast overlays are hidden; normal controls and product geometry remain. The combat runner supplies independent real-time phase evidence. The deterministic sequences establish bounded temporal behavior, not a blanket guarantee against every possible flicker or long-session issue.

## Verified improvements and preserved behavior

- **Prior health-before-impact defect resolved.** In fresh `fx/kaiju-melee-firing.png`, health remains 5000 during wind-up; `fx/kaiju-melee-contact.png` shows 4958 at the physical hit. The crawler firing view likewise retains 5000 while its projectile is in flight. The deterministic melee sequence independently checks the same order. Physical melee reach remains intact.
- **Environmental clocks cooperate.** `tour/river-wind-a.png` and `river-wind-b.png` advance the shared mist/sky clock from about 34 to 37 seconds; `river-paused.png` keeps it at 37. Motion is restrained rather than excessive.
- **Camera comfort controls work.** Steady and manual orbit produce zero cinematic offsets in their captured records; system reduced-motion preference defaults to Steady. Close management views remain stable. The 390px utility controls stay within the viewport, and the captured layout has no horizontal overflow.
- **Lighting direction is coherent.** The tour's sky/sun alignment checks pass across modes. Dusk produces warmer edges on the airship envelopes and longer directional shadows; night introduces luminous windows. Clean contact shadows and usable castle/crawler framing are preserved in settled views.

## Confirmed visual defect

**Battle entry briefly clips the player's kaiju/backpack after normal UI travel.** In `entry/approached-through-ui.png`, the player has approached the rival through the actual controls. After Engage, `entry/entry-010.png` pushes the player's upper body/backpack partly beyond the right edge. The captured projected right bound is **1.0927**, outside the visible normalized limit of 1. At 0.30 seconds the recorded bound is still slightly outside at **1.0173**. The shot recovers by 0.75 seconds.

The initial cinematic fixture showed a more severe entry view, including a missing enemy, but its immediate setup teleport could exaggerate the transition. That image is not used to claim the enemy disappears during the normal flow. The separate actual-travel capture confirms the narrower player-clipping defect without that ambiguity.

The builder's read-only diagnosis attributes this to carrying smoothed world camera/focus coordinates into the arena transition. That is separately attributed implementation context; the clipping itself is the critic's fresh visual evidence.

**Confirmed current visual defect class: 1, battle-entry framing. Runtime errors observed: 0.** Dim lighting, subdued effects and limited environmental depth below are polish concerns, not additional fabricated geometry or runtime errors.

## Ranked corrections within this update

### 1. Keep the carrier visible throughout battle entry — concrete defect

**Evidence:** `entry/entry-010.png`, `entry/entry-030.png`, and `entry/capture-report.json`.

Establish a valid arena composition before the cinematic sweep begins. Do not sweep from stale world coordinates through a shot that clips the player. A clean intentional transition is preferable to visible spatial correction after the scene changes.

**Acceptance:** approach and engage through the actual UI from different world positions and zooms. Sample the first frame, 0.05, 0.10, 0.30, 0.75 and 2 seconds for each faction. Both carriers stay inside the usable view with margin, and manual input/Steady mode remain authoritative. Re-check return from battle as the inverse transition.

### 2. Give dusk and night a readable lighting hierarchy — polish

**Evidence:** `tour/kaiju-city-night.png`, `crawler-city-night.png`, `airship-city-night.png`, `kaiju-streets-dusk.png`.

The kaiju's torso merges into near-black shapes at night; the crawler deck and landscape become broadly dim green. Bright windows contrast with their surroundings but contribute little visible spill to nearby surfaces. This reads more as reduced scene brightness than as a deliberate arrangement of light sources. The airship's warm dusk rim is a useful starting point.

**Correction:** balance directional key, soft fill and local warm illumination so form remains visible in darkness. Let selected street/window sources illuminate nearby walls, paving and citizens with restrained falloff. Preserve dark atmosphere while separating the hero, managed city and background. Avoid solving this with uniform ambient brightening or larger emissive rectangles.

**Acceptance:** at default City and Streets zoom, the kaiju's torso/limbs and citizens remain readable in all modes; windows, street lights and surrounding surfaces feel related; pale envelopes retain shading rather than clipping. Transitions should retain these relationships without exposure pulses, sudden shadow changes or color jumps.

### 3. Use mist and light to create spatial depth — polish

**Evidence:** `tour/river-wind-a.png`, `river-wind-b.png`, `kaiju-world-dusk.png`, and the wide battle views.

The new subtle atmosphere does not yet give the world a strong foreground, middle distance and horizon. Much of the scene remains a similarly green surface with long, crisp prop shadows. Mist is so restrained in the primary views that it rarely shapes a recognizable pocket of air or separates a landmark from its background.

**Correction:** compose localized, low mist along the existing river and valley depressions, with gradual light/contrast changes across distance. Keep the player's city clear. Give mist enough internal variation and slow motion to read as air, while avoiding obvious planes, hard cutoff edges or a uniform screen wash.

**Acceptance:** normal wide and low views show distinct depth layers and a readable existing focal feature. Temporal pairs demonstrate drift without the atmosphere engulfing the player, sliding through buildings as a visible sheet or popping at a lifetime boundary. Performance mode can simplify the effect while retaining its basic color and depth relationship.

### 4. Give cinematic events a stronger purpose — polish

**Evidence:** `tour/melee-windup.png`, `melee-contact.png`, `melee-recovery.png`, `battle-entry-settled.png`, and real-time FX views.

Once settled, the camera is usable but stays close to a general overview during the key action. The brief motion adds little emphasis to the kaiju's weight or the exact place a weapon strikes. The answer is not continuous shake: the scene needs a clear choice about what the camera is showing at each event.

**Correction:** use modest, bounded framing changes that establish the opposing carriers, emphasize the actual contact, then return cleanly to tactical reading. Preserve the correct shared impact timing and existing comfort controls. Keep management views still and cancel event motion promptly when the player takes control.

**Acceptance:** start/peak/recovery captures make the event's subject clear at normal play zoom, with the contact surface and both carriers readable. After repeated attacks the camera does not drift, accumulate offsets, fight orbit input or leave a control hidden.

### 5. Make small environmental motion support scale and lighting — polish

**Evidence:** the river temporal pair, Streets dusk views and high/performance world pairs.

Wind and environmental motion are technically active and appropriately subtle, but they have little visible role in making the scale feel alive. Existing tree crowns still tend to read as rigid clumps. Luminous architecture, foliage, water and mist do not yet feel strongly connected by a shared wind and light environment.

**Correction:** refine visible secondary motion on existing foliage/cloth/reeds and the water surface with varied phase and believable material response. Keep heavy forms steady and smaller details more responsive; preserve matching shadows where geometry moves. This is a motion and rendering pass, not a request for extra props or new systems.

**Acceptance:** close and wide temporal views show coherent, non-synchronized movement without rubbery trunks, drifting attachments or detached shadows. Pause and quality changes preserve the established clock behavior and stable composition.

## Broader limitations retained separately

The hero still has simple joint/form transitions and limited carried weight; citizens remain generic in shape and activity; the landscape still relies heavily on repeated scattered forms; and material finish varies between architecture and carriers. These explain the unchanged global category scores. They are not newly discovered defects and are not the ranked implementation scope for this camera/weather/lighting update.

## Decision

**Return to the builder for cinematic round 2.** The global score is 6.8 and actual battle-entry clipping fails the zero-error condition. Preserve the verified timing, comfort and clock fixes while addressing the ranked camera, lighting and atmosphere issues. At most three review rounds remain in this new cycle.
