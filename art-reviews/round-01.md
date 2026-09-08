# Independent art review — round 1 of 4

**FAIL — 5.3 / 10 overall.** The current game is a functional visual prototype, closer to programmer art than finished indie art. It does not meet the requested 8.5 threshold. The three carrier concepts are distinguishable and the buildings have useful detail, but that detail does not compensate for weak character construction, weight, landscape composition, and default framing.

Reviewed source commit: `b5cdf006aad0252af905f5f2b19a1c71ac0781f0` (v0.4). The builder subsequently added a neutral capture runner; no implementation edits were made by this critic. Review date: 2026-09-07.

## Standard and scores

The standard stays fixed across rounds: above 8.5 is AAA quality, 7 is good indie, 5 is programmer art. A pass requires overall at least 8.5 **and zero observed errors**. Intentional low polygon styling can meet the standard; visible primitive assembly and weak presentation cannot be excused as styling.

| Category | Weight | Score | Judgment |
|---|---:|---:|---|
| Default composition and readable game presentation | 20% | 6.0 | Coherent typography and palette, but too much opaque interface and poorly matched carrier framing. |
| Terrain, environment assets, atmosphere | 20% | 4.8 | Height exists, yet uniform green noise, repeated rounded foliage, sparse scatter and heavy haze dominate. |
| Kaiju construction, animation and physical weight | 20% | 4.8 | Humanoid silhouette reads; mannequin posture, exposed primitive joints and thin suspended support loops remain conspicuous. |
| Citizens, clothing and life | 15% | 5.0 | Movement and clothing variants exist. People still read as thin generic dolls with color changes, especially outside the close view. |
| City and carrier asset design | 15% | 6.5 | The strongest area: distinct architecture and the circular plot work. Repeated forms and weak large-to-small hierarchy prevent professional finish. |
| Combat and weapon visual communication | 10% | 5.0 | Mechanical facing works, but guns, shots and firing feedback have weak visual priority at the actual battle camera. |

Weighted score: 5.345, reported as **5.3**. This is an art judgment, not a unit-test result.

## Independent evidence

I launched the existing `tests/living-world-audit.mjs` unchanged into `artifacts/critic-round-01`: **26 fresh screenshots**, isolated Chrome profile. I then launched the builder-provided neutral `tests/art-review-capture.mjs` unchanged into `artifacts/critic-round-01/tour`: **27 fresh screenshots**, including all three factions, normal HUD, close and wide cameras, low terrain, battle entry, kaiju front/rear/side, developed rings, and temporally separated walking and citizen views. These were critic-initiated captures of the running game, not reused builder images.

I also independently opened local Chrome and orbited the title kaiju through front, side and rear views. Those additional screenshots are in the review tool transcript. The existing saved expedition was preserved. The in-app browser resolved localhost to an unrelated app, so it was closed and excluded from the game's evaluation.

Primary evidence directory: `artifacts/critic-round-01/tour/`. Additional evidence directory: `artifacts/critic-round-01/`.

| Evidence | What was inspected |
|---|---|
| `tour/kaiju-default-city.png` | Real initial composition and tiny starter backpack relative to HUD. |
| `tour/kaiju-front.png`, `tour/kaiju-rear.png`, `tour/kaiju-side.png` | Hero silhouette, material forms, joint construction, load attachment. |
| `tour/kaiju-developed-ring.png` | Full circular plot, roof hierarchy, congestion and support intrusion. |
| `tour/kaiju-walk-a.png`, `tour/kaiju-walk-b.png` | Temporal locomotion poses, torso posture, readable mass. |
| `tour/kaiju-streets-a.png`, `tour/kaiju-streets-b.png` | Temporal citizen changes and starter crowd bunching. |
| `wardrobe-kaiju.png`, `wardrobe-crawler.png`, `wardrobe-airship.png` | Clothing and human silhouettes without HUD obstruction. |
| `tour/crawler-default-city.png`, `tour/airship-default-city.png` | Normal carrier framing and city readability. |
| `tour/crawler-terrain-low.png`, `tour/kaiju-world.png` | Landscape, depth, repeated scatter, ground relationship. |
| `tour/crawler-battle-entry.png`, `tour/airship-battle-entry.png` | Usable battle composition and distinction of opposing units. |
| `combat-front.png`, `combat-back.png`, `battery-facing-front.png` | Fired-shot visibility, battery positioning and bearing feedback. |
| `kaiju-rural-after.png`, `crawler-rural-after.png` | Movement traces and scenery destruction as actually presented. |

## Ranked builder issues

### 1. Give the carriers convincing ground contact and the humanoid convincing construction and weight

**Evidence:** `tour/kaiju-side.png`, `tour/kaiju-front.png`, `tour/kaiju-walk-a.png`, `tour/kaiju-walk-b.png`, `tour/crawler-terrain-low.png`, `tour/crawler-battle-entry.png`.

The hero reads as an upright articulated display model. The neck is an exposed oval, spherical and cylindrical joints remain obvious, the body has a large repeated pebble pattern, and the back attachment is mostly thin loops spanning a large gap. The suspended plot looks like a tray on wires. The crawler has a visibly detached ground relationship on uneven terrain; illuminated ground and the shadow separate beneath portions of its treads. Moving poses have little readable transfer of mass through the torso and hips. The two walking samples demonstrate movement, but do not establish convincing planted-foot locomotion or impact weight.

**Correction:** refine the existing hero's silhouette and joint transitions, replace the conspicuous body pattern with restrained surface variation, give the load-bearing attachment a clear frame, and make stance, step, hip shift and torso counter-motion agree. Correct terrain contact under the treads and feet; use contact shadows and small contact-timed disturbance to reinforce it. Preserve the smaller overall carrier scale and single circular plot.

**Next acceptance check:** front, rear and side at the same three distances; a full stride on level ground and a slope; a stationary crawler on the same slope. No visibly floating load/joint pieces, tread gap, foot penetration, or skating. The motion must read as a heavy living carrier rather than a standing model translating.

### 2. Replace the uniform green backdrop with a deliberately composed landscape

**Evidence:** `tour/crawler-terrain-low.png`, `tour/kaiju-world.png`, `tour/kaiju-front.png`, `kaiju-rural-after.png`.

There are hills, but most of the view is the same green speckle. Trees repeat the same rounded cluster logic, rocks and grass are scattered with little environmental relationship, the river is a flat cyan ribbon, and blanket haze erases distant shape. The world has more objects than a blank plane but little distinct place or visual story. Footprints and crushed scenery are hard to read at the normal world view.

**Correction:** establish a small number of readable terrain regions within the existing map: clear slope/rock/soil/grass transitions, grouped vegetation around water and clearings, exposed banks and broken ground near ruins, with controlled sparse spaces. Give water and shoreline a better value transition. Keep atmospheric depth but restore a readable middle distance. Place a few strong ruin or geological compositions instead of increasing random scatter density.

**Next acceptance check:** three different ground locations must be recognizable without their resource labels, at normal world zoom and low angle. Terrain height, shoreline, trees and trails should read through lighting and value structure; no uniform fog wash across the whole playable scene.

### 3. Make the humans' faction identity visible through silhouette and behavior

**Evidence:** `wardrobe-kaiju.png`, `wardrobe-crawler.png`, `wardrobe-airship.png`, `tour/kaiju-streets-a.png`, `tour/kaiju-streets-b.png`.

The fashion direction is present, but the people are still stick-limbed dolls with minimally formed heads and largely straight torsos. Gothic dress and robes are mostly colored vertical shapes; the British look is not immediately legible without context. The starter kaiju citizens repeatedly bunch into a small cluster beside the keep, reducing their readability. Temporal captures confirm animation, not professional animation quality.

**Correction:** improve a limited set of clear outfit silhouettes: Gothic coat/cape and skirt contours, recognizable British coat/waistcoat/headwear proportions, and distinct robe/sash/headwear shapes for the airship. Strengthen hands, feet, hair and shoulder proportions enough for the intended camera. Vary idle stance and purposeful stops, spread citizens around the accessible paths, and prevent body overlap and crowd piles. More color variations alone will not solve this.

**Next acceptance check:** at the default Streets camera, identify each faction from three citizens with the buildings hidden or cropped; observe walk, stop and idle. People remain separate, feet meet the walkway, garments do not intersect severely, and at least three different readable silhouettes are visible per faction.

### 4. Fix normal gameplay framing before adding more building detail

**Evidence:** `tour/kaiju-default-city.png`, `tour/airship-default-city.png`, `tour/crawler-default-city.png`, `tour/kaiju-streets-a.png`, `tour/airship-streets-a.png`.

The initial kaiju city occupies only a small part of the view while the resource bar, left cards, right cards and construction tray occupy a large proportion of the image. The game advertises city management while initially showing mostly empty landscape and the creature. The other carriers receive much larger city presentation. Streets view often gives foreground carrier parts more space than the people it is meant to show. The typography is coherent, but good website panels are not sufficient game camera direction.

**Correction:** frame the managed city, selected district or citizens to the usable central viewport rather than the entire canvas. Use closer context-appropriate defaults and reduce the persistent footprint of low-priority log/quest information. Retain clear controls and full carrier inspection as a separate view. Do not solve this by enlarging the kaiju again.

**Next acceptance check:** fresh expedition, all three factions, at 1440×960 with normal HUD. The starter buildings and people should be readily inspectable without a manual search or orbit, the important city should not be covered, and changing City/Streets/Titan should produce distinct useful compositions.

### 5. Make the weapons and impact exchange read at the battle camera

**Evidence:** `combat-front.png`, `combat-back.png`, `battery-facing-front.png`, `tour/crawler-battle-entry.png`.

Facing controls and damage are functional, but the visual battle still reads as two quiet models in a field with large status panels. The cannons are tiny and low contrast against busy architecture; the captured shot is a small dot. It is difficult to see which battery is active, why one is blocked, and where an attack landed without reading numbers. The thin floor arc and status text are supporting tools, not enough primary combat communication.

**Correction:** strengthen the existing weapon silhouettes and facing cues, give firing a concise readable muzzle/recoil/tracer sequence, and give hits a visible point of contact with a short material-appropriate response. Frame both combatants and distinguish active/blocked batteries at usable zoom. Give melee wind-up/contact/recovery enough silhouette change to read as an attack rather than locomotion.

**Next acceptance check:** capture ready, fire, contact and recovery at normal battle zoom, plus one blocked battery. A viewer should be able to identify shooter, active mount, target and hit location from the image sequence without the combat text. No projectile beginning inside buildings or effects covering essential controls.

## Errors and limits

**Runtime errors observed: 0.** Both critic-initiated runners completed successfully, reported no browser errors, no remote requests and no lost WebGL contexts. The integration runner also passed ring costs/gates, protected gathering, save migration, weapon-facing damage and muzzle-origin checks, faction wardrobes, destruction persistence and mobile overflow checks. See `living-world-results.json` and `tour/capture-report.json`.

**Observed visual defects blocking the zero-error gate:** poor terrain contact under the crawler on uneven ground; crowd bunching/overlapping silhouettes on the small kaiju ring; carrier/support forms that visibly read as disconnected or suspended primitive pieces; default framing that makes the managed starter kaiju city unnecessarily difficult to inspect. These are not JavaScript exceptions.

Animation was inspected through fresh temporal screenshots and live title orbit observations, not through a recorded full combat animation clip. I do not claim a measured frame rate or that no hidden rendering bugs exist. The current evidence is already sufficient to fail the aesthetic threshold, independently of the clean runtime results.

**Return to builder.** Address the ranked list, then submit a completed attempt for round 2 under the same standard. Do not declare AAA quality on the strength of passing functional tests.
