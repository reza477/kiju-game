# Independent art review — round 2 of 4

**FAIL — 6.1 / 10 overall.** This is a visible improvement over round 1's 5.3. It remains below good finished indie presentation, and well below the fixed AAA gate. The improvement is real; the threshold has not moved.

Reviewed revision: `67338caed4ee74d45616025c3da70e4162f286ce`. Initial independent capture time: `2026-09-08T04:41:46.618Z` (September 7 local). The critic wrote no implementation, assets, tests or capture scripts.

## Changes since round 1

Observed gains: a substantial backpack frame replaces the thin suspended loops; the conspicuous skin pattern is subdued; knees bend during the walking sequence; the river has a better color/depth transition; hills and the middle distance survive the reduced haze; the HUD is smaller with collapsed secondary panels; Streets shows stronger citizen silhouettes; barrels, shoulder flashes and tracers are more visible. The single circular plot, ring growth and three faction identities remain intact.

The default City camera is closer, but does not yet compose the important content consistently. The landscape has gained broad color regions while losing much of its ground surface character. It now exposes broad, smooth triangles and still depends heavily on repetitive scattered foliage. Citizens are clearer but remain simple dolls. Combat has gained visible firing cues; its contact and recovery still do not read strongly in the captured sequence.

## Fixed scores

The standard and category weights are unchanged: above 8.5 is AAA, 7 is good indie, 5 is programmer art. Pass requires overall at least 8.5 and zero identified visual or runtime errors. Ordinary polish issues are separated from concrete defects below.

| Category | Weight | Round 1 | Round 2 |
|---|---:|---:|---:|
| Default composition and readable game presentation | 20% | 6.0 | 6.8 |
| Terrain, environment assets, atmosphere | 20% | 4.8 | 5.5 |
| Kaiju construction, animation and physical weight | 20% | 4.8 | 5.7 |
| Citizens, clothing and life | 15% | 5.0 | 6.2 |
| City and carrier asset design | 15% | 6.5 | 6.5 |
| Combat and weapon visual communication | 10% | 5.0 | 5.8 |

Weighted result: **6.085, reported as 6.1**. Functional correctness does not add points to the visual score.

## Fresh independent evidence

I independently launched three existing runners unchanged. All screenshots are fresh captures of this revision, initiated by the critic:

- `artifacts/critic-round-02/tour/`: 27 captures from `tests/art-review-capture.mjs`, with all three factions, normal HUD, City/Streets/World, low terrain, battle entry, kaiju front/rear/side, expanded city and temporal walking/citizen pairs.
- `artifacts/critic-round-02/combat/`: 26 captures from `tests/living-world-audit.mjs`, including facing controls and actual fired shots, clean wardrobe supplements, resource and destruction behavior. This run was used because the neutral tour has battle entry but no firing sequence.
- `artifacts/critic-round-02/fx/`: 12 ready/firing/contact/recovery captures from the subsequently supplied `tests/combat-art-capture.mjs`, across all three factions.

**65 fresh screenshots total.** The normal HUD remains visible in the tour and FX sequences; the integration runner's clean wardrobe views are supplementary. No prior builder screenshots were used as current evidence.

## Concrete defects

1. **Stippled and striped contact/shadow halos in Streets views.** Dense screen-door patterns are conspicuous around people, beside building foundations and along some walkway edges. They break the appearance of contact with the deck. Strong evidence: `combat/wardrobe-kaiju.png`, especially the people and paving immediately in front of the central keep; `combat/wardrobe-crawler.png`, along the left walkway and at the farm foundation. This is a visible rendering defect, distinct from low-detail art styling.
2. **Default crawler camera places important carrier geometry behind the construction tray.** In `tour/crawler-default-city.png`, a significant portion of the front prow and lower carrier is obscured by the persistent build tray. In the kaiju default, much of the enlarged creature is cropped while the city remains off-center. The crawler occlusion is the concrete defect; kaiju composition is a polish issue. A normal view should fit its managed content to the usable area above the tray.

**Runtime errors observed: 0.** All three critic runs completed without page/console errors or remote requests; the tour and integration checks reported no lost context. The integration run passed its functional checks. Reports: `tour/capture-report.json`, `combat/living-world-results.json`, `fx/combat-capture-report.json`.

**Not established as defects:** a possible kaiju ground gap in `tour/kaiju-battle-entry.png` was flagged to the builder for a contact check, but the single projection does not prove a physics error. The later ready view has a substantially better apparent ground relationship. I do not count this unconfirmed suspicion against the zero-error gate. Similarly, no overlapping citizen body is conclusively established by the new crowd captures; bunching and weak behavior variety remain polish issues.

The FX runner's enemy HP above maximum is caused by its temporary test fixture and is excluded from game defects. Several contact captures miss any visible burst; this limits impact assessment and does not prove that an impact effect is absent in the game.

## Ranked builder list

### 1. Finish terrain materials and environmental composition

**Evidence:** `tour/kaiju-world.png`, `tour/crawler-terrain-low.png`, `tour/kaiju-side.png`, `fx/airship-ready.png`.

The reduced fog reveals broad, smooth triangulated terrain with weak surface definition. Most of the playable scene remains similarly sparse, with repeated rounded tree shapes and small grass clumps distributed across it. The new stone arch reads as an isolated wall added beside another ruin. More objects have not yet created a believable environmental composition.

**Correction:** make grass, exposed soil, ash and slate visibly distinct materials with controlled texture scale, natural transitions and a clear relationship to slope and water. Give the existing ruins a coherent footprint through rubble, damaged approaches and surrounding vegetation. Group foliage with deliberate open spaces and silhouette variation. Keep the improved middle-distance clarity; do not hide the scene in fog again.

**Acceptance:** three locations, normal World and low view, are recognizable without labels. No conspicuous large triangle color patches or repeated uniform scatter dominates. Shoreline, ruin footprint and vegetation groups create a clear foreground/middle/background hierarchy.

### 2. Remove rendering artifacts and finish close-view lighting

**Evidence:** `combat/wardrobe-kaiju.png`, `combat/wardrobe-crawler.png`, `tour/airship-streets-a.png`, `tour/kaiju-default-city.png`.

Resolve the identified stippled/striped halos. Materials also vary between patterned masonry and nearly featureless plastic; shadowed portions of the kaiju collapse into black with little form, while the paving exposes noisy edge bands. Bright translucent smoke sometimes reads as a pale sheet against the spine. That last appearance is a polish concern, not a proven particle-system error.

**Correction:** clean up contact shadows and transparency at the actual close camera, then balance ambient fill and surface contrast so forms separate without flattening the scene. Use restrained roughness and color variation across the existing material families.

**Acceptance:** repeat the same Streets and kaiju rear angles at 1440×960, including several animation times. No screen-door contact pattern, striped edge halo, or obvious particle sheet; figures and architecture retain legible form in shadow.

### 3. Refine hero and citizen shape language and motion

**Evidence:** `tour/kaiju-front.png`, `tour/kaiju-side.png`, `tour/kaiju-walk-a.png`, `tour/kaiju-walk-b.png`, `combat/wardrobe-kaiju.png`, `combat/wardrobe-crawler.png`, `combat/wardrobe-airship.png`.

The knee articulation and support frame improve function and appearance. The hero still looks assembled from long rigid sections and obvious joint primitives, with an extremely upright torso and little visible sense of carried weight. The citizens are sturdier and clothing is now readable, but their heads, limbs and stiff straight garments still read as generic dolls. The small ring's people cluster along one stretch rather than presenting varied city activity.

**Correction:** refine joint transitions and larger anatomical/armor shapes before adding surface details; strengthen weight shift, shoulder/hip counter-motion and supported stance. For citizens, refine a few signature coat, cape, robe, sleeve and headwear silhouettes and vary purposeful stop/idle gestures. Preserve the readable faction palette and human scale.

**Acceptance:** a complete level-ground stride and a slope stride with front/side/back frames; clear planted support and weight transfer. At default Streets, three outfit silhouettes per faction are recognizable without architecture, and a temporal sequence shows walking plus distinct idle/activity poses without bunching.

### 4. Compose City and Streets for their actual purpose

**Evidence:** `tour/crawler-default-city.png`, `tour/kaiju-default-city.png`, `tour/crawler-streets-a.png`, `tour/airship-streets-a.png`.

The compact UI is better. The crawler now collides visually with the build tray; the kaiju's large cropped body occupies much more space than its managed plot. Streets includes many empty marked plots, repetitive paving and backs of buildings, while relatively few citizens occupy the strongest part of the image. Closer alone is not better composition.

**Correction:** fit the relevant city content into the unobstructed viewport and choose a Streets focal point with readable people in front of useful architecture. Keep full carrier inspection separate. Use vacant-plot markings only as strongly as construction needs; they currently read like repeated green placeholders in the close presentation.

**Acceptance:** start all three factions and change City/Streets/Titan without manual orbit. No managed city or carrier front lies behind controls, and each preset presents its intended subject with deliberate framing and readable scale.

### 5. Make the attack sequence communicate contact, not merely firing

**Evidence:** `fx/kaiju-firing.png`, `fx/crawler-firing.png`, `fx/airship-firing.png`, corresponding `contact` and `recovery` images, plus `combat/combat-front.png`.

The larger barrels and brighter muzzle/tracer cues are improvements. The actual battle still feels distant, and the target looks essentially unchanged through the captured sequence. Firing is clearer than contact. The current timed contact samples may miss the short effect, so this is a readability/polish judgment rather than a claim that impact code does not run.

**Correction:** give the strike a readable contact point and short aftermath appropriate to the hit material, and time recoil, projectile arrival and target reaction coherently. Prioritize silhouette and temporal clarity over simply enlarging a flash. Next neutral capture should sample actual effect phases so the critic can inspect the impact peak and recovery; the critic must still initiate those captures independently.

**Acceptance:** an unambiguous ready/fire/impact/recovery sequence at the normal battle camera for cannon, missile and melee. The shooter, active mount, target and impact point are visually identifiable without reading damage numbers; no UI obstruction of the attack.

## Gate decision

**Return to builder for round 3.** The score is below 8.5 and two concrete visual defects remain. The clean runtime reports do not satisfy the art gate. Preserve the gains and spend the next attempt on material finish, clean contact rendering, motion, and composition rather than adding more building ornaments.
