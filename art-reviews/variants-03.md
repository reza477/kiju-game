# Independent variant review — prototype 0.6, round 3 of 4

**FAIL — 7.0 / 10 overall.** Anatomy and castle detailing improve modestly. Floor inspection remains usable, and the independently tested main-wall cannon cases now behave correctly. Three known curved projectile paths still intersect projecting castle trim. The build therefore fails both the aesthetic threshold and the zero-error condition. One final builder/review round remains in this cycle.

Reviewed frozen revision: **`7d67b0a6adf07710ed89d2d9272497aba883c7b6`**, independently verified. Source remained unchanged during review. The critic wrote only this report; no implementation, asset, test or capture-script changes. Prior reports are preserved. The current vertical Gothic backpack design and supplied castle reference remain the basis, superseding the earlier circular town.

## Fixed global rubric

Above 8.5 is AAA, 7 is good indie, 5 is programmer art. Pass requires an overall score of at least 8.5 and zero identified visual/runtime errors. Weights remain global, including unchanged assets outside this update.

| Category | Weight | Round 2 | Round 3 |
|---|---:|---:|---:|
| Default composition and readable game presentation | 20% | 7.6 | 7.6 |
| Terrain, environment assets, atmosphere | 20% | 7.0 | 7.0 |
| Kaiju construction, animation and physical weight | 20% | 6.3 | 6.4 |
| Citizens, clothing and life | 15% | 6.5 | 6.5 |
| City and carrier asset design | 15% | 7.0 | 7.1 |
| Combat and weapon visual communication | 10% | 7.6 | 7.6 |

Weighted result: **7.000**. Small gains do not move the displayed score beyond 7.0. Functional correctness and extra geometry alone do not establish AAA anatomy, materials or architecture.

## Own fresh evidence

Executed the existing neutral runners unchanged, in isolated Chrome profiles at `http://127.0.0.1:4178/?test=1`.

| Critic-owned directory | Coverage |
|---|---|
| `artifacts/critic-variants-03/` | 28 screenshots: cyborg, flesh and drill, normal HUD, City/body/close body, movement pairs, expanded castle front/reverse, inspected levels 1/3/5 |
| `artifacts/critic-variants-03/contact/` | 14 screenshots; 16 ground contact cases and four aircraft cases containing 12 ranged actions |
| `artifacts/critic-variants-03/cannons/` | Four normal-HUD clear/blocked battle screenshots; 525 actual barrel samples |

**46 fresh screenshots total.** All three runners completed with zero browser errors and zero remote requests. Ground contact passed the unchanged 0.35 m threshold; maximum measured error was approximately **0.2455 m**. The cannon audit found zero barrel intersections in its 525 samples and maximum muzzle-transform disagreement of approximately `7.34e-15` m.

The four real cannon battle fixtures distinguish clear ports from obstructed oblique shots for both kaiju variants. Clear cases report a bearing battery and its emitted event; blocked cases report `0 / 1 batteries bearing on target · 1 blocked by city structures` and omit that battery event. Intrinsic weapons still contribute damage in the blocked fixture. These results do not certify every curved projectile path around projecting decoration.

Normal HUD geometry is retained. Populated upper-floor screenshots are the runner's labeled expanded fixture; contact imagery includes its existing pause-overlay behavior where applicable. Movement pairs show temporally separated actual poses and drill rotation, supplemented by contact phases. This is bounded motion evidence, not a new full-cycle locomotion or performance certification. Prior critic-owned coverage supplies context for the unchanged armored crawler and two airship variants; those images are not counted as fresh here.

## Improvements and concrete errors

**V1 remains resolved.** The six current cyborg/flesh `streets`, `level3-streets` and `level5-streets` screenshots expose occupied plots, residents and central circulation. Exterior City views preserve the complete castle. The new weapon solids have not visibly regressed the inspection cutaway.

**Main cannon obstruction cases improve.** Own `cannons/cyborg-clear-port.png` and `cyborg-blocked-oblique.png`, with corresponding flesh captures and audit data, support the corrected clear/blocked behavior. The supported narrower tower and physical openings fit the castle better than arbitrary shots through walls.

**V2 remains: allowed shots can intersect projecting castle trim.** This is a **builder-confirmed geometry defect**, not a defect independently reproduced in the critic's screenshots. I read `artifacts/shell-trim-round3/round4-plan.md`; its linked report records three residuals among 298 currently allowed actual curved-path samples, with the other 295 clear:

| Mount / ward / weapon level / relative aim | Intersected geometry | Distance along shot |
|---|---|---:|
| Slot 13 / ward 1 / level 1 / −30° | Rear tower window sill | 0.734 m |
| Slot 16 / ward 5 / level 1 / +30° | Gate-roof metal seam | 0.628 m |
| Slot 17 / ward 5 / level 1 / +70° | Perimeter railing post | 3.355 m |

These are curved-path intersections with authored render geometry, not the larger straight-ray candidate counts. The diagnostic reports no active barrel-centerline crossing. Missing projecting trim from the obstruction model is the shared cause. This known evidence prevents a global zero-error claim even though the critic's narrower cannon audit passes.

**Runtime errors in own runs: 0. Additional concrete errors independently confirmed in current screenshots: 0. Known remaining concrete error class: V2, with three documented instances.** Ordinary art limitations below are separate from these defects.

## Ranked corrections for the final attempt

### 1. Close the remaining projecting-trim obstruction gaps — concrete defect

**Evidence:** attributed builder diagnostic above; own clear/blocked cannon captures establish behavior that must remain intact.

**Correction:** make the actual sill, roof seam and railing-post volumes participate in obstruction decisions without filling useful openings or hiding the decoration. Keep barrel aim, battery status, emitted shot and damage contribution consistent.

**Acceptance:** the three listed paths are blocked or physically clear; no battery event or battery damage is produced through an obstruction. Recheck the actual curved paths, preserve cardinal clear ports, and retain zero barrel intersections and usable floor cutaways. A passing straight ray alone is insufficient.

### 2. Finish the flesh titan's anatomical transitions and load — polish

**Evidence:** own `flesh-body-close.png`, `flesh-moving-a.png`, `flesh-moving-b.png` and `contact/player-flesh-to-drill-speed-1-contact.png`.

Chest relief, regional tone and supported lean add some structure, but the silhouette still has long smooth tube-like limbs, simplified elbow/knee transitions and a largely molded-looking torso. The neck, jaw and shoulder relationships remain visibly less resolved than the mechanical variant. The contact pose reaches correctly but still reads as a posed model more than a heavy living creature.

**Correction:** concentrate on coherent shoulder-to-chest, ribcage-to-pelvis and bent-joint forms, then support those forms with restrained material variation. Improve the sense that the body supports the harness. Avoid disconnected muscle balls or extra noise as substitutes for anatomy.

**Acceptance:** normal gameplay and close views communicate structural support through straight and bent poses, with believable transitions into hands and feet. Refinement should remain visible at ordinary play distance and preserve existing contact accuracy.

### 3. Give the developed castle stronger major architectural variation — polish

**Evidence:** own `cyborg-city.png`, `cyborg-expanded-city.png`, `cyborg-expanded-reverse.png` and matching flesh exterior views; supplied reference recorded in round 1.

The dominant keep, subordinate tower and red roofs are readable. Most of the expanded body nevertheless remains a parallel-sided vertical block with regular masonry/window rhythm. The new detailing does not yet supply the reference's changes in width, depth, connecting volumes and roof direction. Large stone surfaces remain repetitive. The drill's axial wear is a smaller useful material improvement; its spiral stays clearly readable in the moving pair and is not the priority now.

**Correction:** use a small number of purposeful changes to major castle masses and their connections, preserving the tall wearable footprint. Give exposed stone, roof and metal different scale and wear logic before adding more trim.

**Acceptance:** expanded front/side/reverse silhouettes have clear hierarchy beyond roof-tip heights; levels 1/3/5 remain visible in Streets, physical gun openings remain usable, and decorative additions do not recreate V2.

The unchanged citizen simplicity and broad terrain/material limitations continue to constrain the global score as documented in prior reviews. This third review is final; the fourth attempt must be reported honestly and closes this visual update regardless of its result.
