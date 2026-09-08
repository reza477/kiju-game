# Independent art review — round 4 of 4, final

**FAIL — 6.7 / 10 overall.** Spatial combat contact is substantially improved, the castle is framed more clearly, and the landscape has more varied silhouettes. The result is still below the fixed 8.5 threshold. One confirmed visual timing defect remains: health decreases before the visible attack arrives. This concludes the four-round review cycle; it does not authorize or request a fifth builder attempt.

Reviewed product revision: `022020dc9f31f3e85bca85a56564f68f03d7562b`, independently verified before capture. Fresh tour started September 8, 2026 UTC (September 7 local). All current evidence was captured independently by the critic against this frozen revision. The critic wrote only this Markdown report, no implementation, assets, tests or capture scripts.

## Fixed rubric and scores

The standard and weights are unchanged: above 8.5 is AAA quality, 7 is good indie, and 5 is programmer art. Pass requires an overall score of at least 8.5 **and** zero identified visual or runtime errors. Technical test success does not substitute for the art score.

| Category | Weight | Round 1 | Round 2 | Round 3 | Round 4 |
|---|---:|---:|---:|---:|---:|
| Default composition and readable game presentation | 20% | 6.0 | 6.8 | 7.2 | 7.4 |
| Terrain, environment assets, atmosphere | 20% | 4.8 | 5.5 | 5.8 | 6.2 |
| Kaiju construction, animation and physical weight | 20% | 4.8 | 5.7 | 6.2 | 6.5 |
| Citizens, clothing and life | 15% | 5.0 | 6.2 | 6.5 | 6.5 |
| City and carrier asset design | 15% | 6.5 | 6.5 | 6.8 | 6.8 |
| Combat and weapon visual communication | 10% | 5.0 | 5.8 | 5.6 | 6.6 |

Weighted result: **6.675, reported as 6.7**. This is a clearer and more coherent prototype approaching the good-indie benchmark, with uneven finish across categories. It is not AAA approval. The score would remain below the gate even without the timing defect.

## Independent evidence

Existing capture runners were executed unchanged in isolated browser profiles. Normal gameplay retains its HUD; the motion diagnostic is explicitly distinguished from the environment review.

| Critic-owned output directory | Fresh evidence |
|---|---|
| `artifacts/critic-round-04/tour/` | 27 views: all three factions, default City, Streets temporal pairs, wide World, low terrain, battle entry, kaiju front/side/rear, developed circular castle and walking pair |
| `artifacts/critic-round-04/motion/` | 30 frames: five phases across a full stride, front/side/back on level ground and a slope; real terrain and animation, with other carriers/scenery suppressed only to expose the body |
| `artifacts/critic-round-04/fx/` | 16 ready/firing/contact/recovery frames: all three ranged sequences and kaiju melee; captures freeze actual visible effect phases |
| `artifacts/critic-round-04/contact/` | Independently rerun existing contact audit: six cases, three target factions at 1× and 2× speed |

**Total: 73 fresh screenshots plus six contact cases.** The three screenshot runs reported zero console/page errors, zero remote requests and no failure. The contact audit passed all six cases with zero reported runtime errors. Tour view records reported no lost WebGL context. These are bounded observations, not a claim that the whole game is free of bugs.

The contact audit checks the real knuckle against an animated target surface and verifies the effect endpoint remains attached. All sampled cases passed its tolerances. This is independently reproduced functional evidence, not a replacement for judging the visible pose or impact. The builder's separate 18-case and 362-pose results were not counted as critic-owned tests or screenshots.

## What improved since round 3

- **Spatial melee contact is resolved in the observed sequence.** `fx/kaiju-melee-contact.png` now shows the body crouching and the arm reaching the crawler's near hull at the hit effect. The old high air punch and pre-contact projectile substitute are absent. The six-case contact audit supports this observation.
- **Ranged hits visually meet the target.** `fx/crawler-contact.png` shows the flash on the approaching kaiju's torso; `fx/airship-contact.png` shows the effect on the crawler structure. This is consistent with the moving endpoint fix. The old builder-reported 5.44 m separation is not reproduced as a current defect.
- **Kaiju presentation is more useful.** `tour/kaiju-default-city.png` foregrounds the managed circular castle; smoke no longer washes across it. `tour/kaiju-front.png` and the side/rear views gain space from the hidden Titan construction tray.
- **Foliage silhouettes have real variation.** The low world and front/side views now mix broad, narrow and layered crowns. Ruin grouping reads more clearly. Continuous terrain coloration and clean shadows remain intact.
- **Previously fixed defects remain fixed.** Crawler prow/treads clear the tray in `tour/crawler-default-city.png`; the Streets views retain clean contact shadows without the earlier stipple pattern.

The single circular Gothic backpack, inside-out ring development, British industrial crawler and horizontally supported domed airship identities remain recognizable. These gains come from clearer construction and presentation, not from changing the owner's concept.

## Confirmed remaining defect

**Attack damage is presented before the visible contact.** This is directly observable with the normal HUD:

- `fx/kaiju-melee-ready.png`: enemy health **5000/5000**. `fx/kaiju-melee-firing.png`: **4958/5000**, while the arm is still in its wind-up, above the later contact point. `fx/kaiju-melee-contact.png` reaches the hull with the same **4958/5000**.
- `fx/crawler-firing.png`: target health is already **4953/5000** while the projectile is near the firing carrier. `fx/crawler-contact.png` shows the later torso impact at the same health.
- `fx/airship-firing.png` likewise shows **4959/5000** with missiles still in flight; the later crawler impact retains that value.

The fixture deliberately provides a 5000-point enemy and disables its return fire; the number itself is not a defect. The mismatch is the order of visible events: damage precedes the attack that should cause it. This fails round 3's stated acceptance that contact, reaction and damage timing agree. It is distinct from the now-resolved spatial contact problem.

**Runtime errors identified in these review runs: 0. Confirmed remaining visual defect class: 1, attack damage/contact timing.** No new foot penetration, citizen intersection or carrier hovering defect is asserted from ambiguous perspective. The following lower art scores reflect polish and design finish rather than additional invented errors.

## Ranked remaining work, retained for a future user-directed update

### 1. Synchronize damage presentation with the attack — concrete defect

**Evidence:** the ready/firing/contact HUD sequences above.

Health feedback and the target's visible response need to coincide with the fist or projectile reaching its surface. Preserve the successful surface tracking and physical reach.

**Acceptance:** in normal gameplay, health remains unchanged through wind-up/flight and changes at visible contact. Check melee, cannon and missile against moving targets at both speeds, including a lethal hit so the target does not disappear before the attack arrives.

### 2. Develop stronger environmental composition — polish

**Evidence:** `tour/crawler-terrain-low.png`, `tour/kaiju-world.png`, `tour/kaiju-front.png`.

Tree variation is an improvement, but most of the world still reads as a soft green lawn with scattered props. Crown clusters remain conspicuously simple, shorelines are uniformly smooth, and the terrain surface does little to explain the placement of rock, ruins or vegetation. More props alone will not close this gap.

**Acceptance:** three existing locations should be distinguishable without their labels through landform, ground treatment and a clear arrangement of existing features. Their foreground, middle distance and horizon should support a deliberate focal point instead of similar scatter everywhere.

### 3. Give the hero a stronger body and more convincing weight — polish

**Evidence:** `tour/kaiju-front.png`, `tour/kaiju-side.png`, `motion/level-side-0.png` through `level-side-2.png`, `motion/slope-back-3.png`, melee phase sequence.

The stride has visibly different phases, alternating support and terrain-aware foot placement. The torso nevertheless stays very upright, the stride is shallow, and long rigid segments with simple joints still read like an articulated toy. The punch now connects but lacks a strong anticipation/contact/recovery silhouette and convincing transfer of mass.

**Acceptance:** clear support changes and a believable burden from the backpack throughout a full cycle; the attack should read from body silhouette at normal battle zoom before its effects or HUD are noticed. Preserve comparable carrier size and the circular backpack design.

### 4. Make citizens communicate purposeful activity — polish

**Evidence:** all three `tour/*-streets-a.png` and `*-streets-b.png` views.

The Gothic, British and Eastern clothing palettes and garments are identifiable. Faces, hands and garment contours remain generic, and the streets primarily communicate people circulating around plots. The kaiju crowd especially reads like a queue near the central building. Temporal changes confirm movement, but movement alone does not convey a functioning city.

**Acceptance:** from the normal Streets view, a few citizens should clearly read as walking, waiting/socializing or attending a building task through pose and placement. Outfit silhouettes should distinguish a small set of deliberate archetypes without depending on color swaps.

### 5. Bring materials, street composition and combat effects to a consistent finish — polish

**Evidence:** `tour/airship-streets-a.png`, `tour/crawler-streets-a.png`, `tour/kaiju-developed-ring.png`, `fx/crawler-contact.png`.

The architecture is ahead of the characters and environment in surface treatment. Broad plain carrier parts, repeated building motifs, large empty plots and small flashes still compete with the intended sense of inhabited moving cities and heavy weapons. The clear HUD is a strength; the scene beneath it needs the same hierarchy.

**Acceptance:** material families read consistently across buildings, carrier and ground at close and normal zoom. Streets have a visible human focal point even in a starter city. Cannon, missile and fist impacts are distinct and legible at normal battle distance, with restrained surface response rather than a detached or purely decorative glow.

## Final gate decision

**Four rounds completed. Final result: FAIL, 6.7/10, with one confirmed visual timing defect and zero runtime errors observed in this review.** The fixed 8.5-plus-zero-errors gate has not passed. Stop the current builder/critic loop here and report this result honestly. Preserve the improvements and ranked remaining work; any later visual update is a separate owner-directed cycle.
