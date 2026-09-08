# Independent art review — round 3 of 4

**FAIL — 6.4 / 10 overall.** The game is cleaner and more readable than round 2, but remains below the fixed 8.5 gate. Both previously confirmed rendering/UI defects are resolved. Combat contact now supplies a concrete remaining defect; the larger remaining art gap is professional form, material and environmental composition rather than a lack of object count.

Reviewed product revision: `db86f1dd2e04902f559e1e76d3ef323e2c641914`. Initial fresh capture: `2026-09-08T05:05:40.965Z` (September 7 local). The critic wrote only this report, no implementation, assets, tests or capture scripts.

## Changes since round 2

Independently observed: the screen-door contact shadows are gone in Streets; the crawler's prow and treads clear the construction tray; large triangular ground color patches are much less conspicuous; empty plots have quieter surfaces; shadows and citizen feet read more cleanly; the heavier backpack frame remains intact. The circular Gothic plot and three faction silhouettes are preserved.

The terrain still resembles a broad lawn with repeated scattered trees and isolated scenery. The humanoid remains visibly assembled from rigid primitive shapes; the citizens still look like generic dolls despite improved faction outfits. The default kaiju City view is dominated by a cropped torso and drifting pale smoke rather than a strong composition of the managed castle. These are ranked polish issues, not invented runtime defects.

## Fixed scores

The rubric is unchanged: above 8.5 is AAA, 7 is good indie, 5 is programmer art. A pass requires overall at least 8.5 and zero identified visual/runtime errors.

| Category | Weight | Round 1 | Round 2 | Round 3 |
|---|---:|---:|---:|---:|
| Default composition and readable game presentation | 20% | 6.0 | 6.8 | 7.2 |
| Terrain, environment assets, atmosphere | 20% | 4.8 | 5.5 | 5.8 |
| Kaiju construction, animation and physical weight | 20% | 4.8 | 5.7 | 6.2 |
| Citizens, clothing and life | 15% | 5.0 | 6.2 | 6.5 |
| City and carrier asset design | 15% | 6.5 | 6.5 | 6.8 |
| Combat and weapon visual communication | 10% | 5.0 | 5.8 | 5.6 |

Weighted result: **6.395, reported as 6.4**. Combat is slightly lower because the more useful melee sequence exposes a contact mismatch. This is new evidence, not an assumption that every new implementation is an improvement.

## Independent captures and animation evidence

All captures were independently initiated by the critic against the frozen product, using existing runners unchanged:

- `artifacts/critic-round-03/tour/`: 27 normal-HUD views from `tests/art-review-capture.mjs`: all three factions, City/Streets/World, low terrain, battle entry, kaiju front/rear/side, developed castle and temporal citizen/walking pairs.
- `artifacts/critic-round-03/motion/`: 30 initial stride diagnostic frames from `tests/motion-art-capture.mjs`. Several level-side views are obscured by a resource grove and a foreground airship. These obstructed frames are not treated as proof of good or bad foot contact.
- `artifacts/critic-round-03/fx/`: 16 actual-effect-phase captures from `tests/combat-art-capture.mjs`, covering ready/firing/contact/recovery for all factions plus kaiju melee.
- `artifacts/critic-round-03/motion-clear/`: 30 further critic-initiated diagnostic frames using the builder's revised neutral motion runner. Other carriers and scenery are suppressed only in the isolated diagnostic so the body can be assessed. The real animation and terrain remain; the normal tour, not this diagnostic, is used to judge the environment.

There are 103 fresh captures in total, including the 30 initial diagnostic frames with visibility limitations; the tour, FX and clear-motion sets supply 73 primary review frames. The motion diagnostic is explicitly separate from normal gameplay presentation. Its intermediate phases visibly differ, with alternating support and bent knees; recorded level-cycle phases progress through 0.4375, 0.6875, 0.9375, 0.1875 and back to 0.4375. Level side frames 1 and 2 and slope side frame 2 show improved foot placement, but the shallow stride and almost vertical upper body still feel light for the carried load. No additional foot-contact defect is confirmed from this sequence. Full source/output reports are retained beside each capture set. Builder-provided screenshots were not used as current visual evidence.

## Errors and resolved defects

**Resolved by fresh observation:**

- Stippled contact/edge halos from round 2: resolved in `tour/kaiju-streets-a.png`, `tour/crawler-streets-a.png`, and `tour/airship-streets-a.png`.
- Crawler prow obscured by the construction tray: resolved in `tour/crawler-default-city.png`.

**Confirmed visual defect — melee animation and contact effect disagree.** In `fx/kaiju-melee-contact.png`, the raised attacking arm gestures across the upper body while the hit glow appears much lower beside the crawler deck. The visible fist does not make the indicated contact. `fx/kaiju-melee-firing.png` also shows a small projectile/tracer-like cue crossing the gap during the barehand attack. The ready/firing/contact/recovery sequence reads as a remote damage gesture, not a giant physically striking the opposing city. This breaks the core kaiju combat fantasy and fails the zero-error requirement.

**Builder-provided diagnostic, distinguished from critic observation:** the builder reported a ranged projectile endpoint remaining at its fire-time position while an approaching enemy moved, producing about 5.44 m of separation at impact in a numerical test. My independent `fx/crawler-contact.png` is too distant/subtle to validate that exact distance visually. I do not present the numerical measurement as my own. It is a concrete issue for the builder to resolve and demonstrate in the final submission; the directly visible melee mismatch already blocks the gate.

**Runtime errors across all four completed critic capture runs: 0.** All reported no console/page errors or remote requests. The tour reported no lost WebGL context. This is evidence from those runs, not a claim of universal absence of bugs.

No new citizen intersection, foot penetration or crawler hovering defect is asserted solely from an ambiguous projection. Low detail, repetitive scenery, weak poses and composition remain polish categories rather than being mislabeled as exceptions or geometry errors.

## Ranked issues for the final builder attempt

### 1. Make melee, ranged contact and target reaction physically agree

**Evidence:** `fx/kaiju-melee-ready.png`, `fx/kaiju-melee-firing.png`, `fx/kaiju-melee-contact.png`, `fx/kaiju-melee-recovery.png`; the ranged contact sequences; the separately attributed builder diagnostic above.

Give the kaiju a readable wind-up, fist-to-hull contact and recovery at the actual target height and distance. The torso and stance must support the punch; the fist and effect should meet the same visible surface. Remove any projectile-like substitute for a barehand hit. Keep ranged impact attached to the moving target and give it a short, visible material response rather than a detached flash.

**Acceptance:** actual gameplay melee against a crawler at level ground and a slope, plus cannon/missile fire against an approaching target. Capture wind-up, physical contact, impact peak and recovery with HUD. Fist or projectile meets the current target surface; target reaction and damage timing agree; no air punch, remote burst, floating impact or leftover tracer in melee.

### 2. Give the existing landscape a composed identity

**Evidence:** `tour/crawler-terrain-low.png`, `tour/kaiju-world.png`, `tour/kaiju-side.png`, `tour/airship-default-city.png`.

Continuous ground albedo is an improvement, but large expanses still read as one soft lawn. The same rounded foliage clusters and tiny grass motifs repeat; isolated arches, ruined frames and rock props do not yet form memorable places. The middle distance is clearer without becoming more distinctive.

**Correction:** refine existing tree silhouettes into a few deliberately different crown profiles; compose existing rubble and arches into a believable collapsed structure; connect existing rock elements into a geological formation. Reinforce soil/rock/grass transitions around those places. Work on grouping, shape and scale hierarchy rather than indiscriminate density.

**Acceptance:** three locations recognizable from silhouette and ground treatment without labels, each with a clear focal feature and surrounding support. No repeated lollipop-tree spacing or uniformly soft surface should dominate the primary view.

### 3. Improve character form and the sense of carried weight

**Evidence:** `tour/kaiju-front.png`, `tour/kaiju-side.png`, motion diagnostics, `tour/kaiju-streets-a.png`, `tour/crawler-streets-a.png`, `tour/airship-streets-a.png`.

Better contact and cleaner rendering expose the remaining shape limitations. Long straight limb pieces, simple joint transitions and a very upright torso keep the kaiju close to an articulated toy. Citizen clothes identify factions, but head/hand shapes and stiff garment contours lack a deliberate finished character style. This is polish, not a request for photorealism.

**Correction:** refine the largest silhouette transitions and weight distribution first. Give a few citizen archetypes stronger differentiated coat/cape/robe contours and readable activity poses. Prefer a small number of clear, well-shaped variants over additional colors or accessories. Keep scale and the single circular backpack unchanged.

**Acceptance:** readable support/weight transfer throughout an unobstructed full stride; recognizable silhouette at front, side and back. Three citizens per faction can be identified from clothing alone, with visible differences between walking, working/attending an errand and idle behavior.

### 4. Make close views tell a city story

**Evidence:** `tour/kaiju-default-city.png`, `tour/kaiju-developed-ring.png`, `tour/crawler-streets-a.png`, `tour/airship-streets-a.png`.

The technical framing defect is fixed. The next step is composition: City should prioritize the castle/managed deck, while Streets should foreground people doing something legible. Large areas of empty marked plots, building backs and cropped torso still dominate some views. Pale smoke washes across the kaiju spine and castle rather than contributing a controlled atmosphere.

**Correction:** refine the default kaiju city yaw/target and use a purposeful citizen/street focal point. Keep construction markings subordinate outside placement mode. Make smoke quieter and spatially readable. Do not add more building ornament to compensate for weak framing.

**Acceptance:** all three fresh expeditions have intentional City and Streets compositions without manual orbit. People and important structures occupy the unobstructed focal area, smoke does not veil the subject, and existing controls remain accessible.

### 5. Unify the final material and lighting finish

**Evidence:** `tour/kaiju-front.png`, `tour/kaiju-streets-a.png`, `tour/airship-streets-a.png`, `tour/crawler-default-city.png`.

Architecture has more convincing surface treatment than the nearly featureless hero and some carrier parts. The visual mix still oscillates between patterned miniature buildings and simple plastic objects. Shadows are clean now; preserve that gain while bringing surfaces into one deliberate stylized world.

**Correction:** use restrained edge, roughness and color variation consistent with each material family; maintain readable form in shadow; reduce any single repeated texture motif that draws attention away from shape. Match the apparent texture scale across city, carrier and environment.

**Acceptance:** compare close and normal views under the same light. Material families remain recognizable, no one asset looks unfinished beside the others, and the hero does not disappear into black or require extreme contrast to read.

## Decision

**Return to the builder for round 4, the final round in this cycle.** The score is below 8.5 and the visible melee/contact defect remains. Preserve the resolved technical defects and improved clarity. If round 4 still misses the threshold, report the actual score and remaining issues; do not reinterpret a cleaner prototype as AAA approval.
