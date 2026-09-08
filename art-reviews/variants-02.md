# Independent variant review — prototype 0.6, round 2 of 4

**FAIL — 7.0 / 10 overall.** The castle floor-inspection defect is resolved in the fresh captures. Castle massing, flesh continuity and the drill flight all improve. No new concrete visual or runtime error was confirmed, but the global aesthetic score remains below 8.5.

Reviewed frozen revision: `c47a1ea39d42685a97e10e24464cf3caff12d592`, independently verified. Product source stayed unchanged during review. The critic wrote only this report, with no implementation, asset, test or capture-script changes. Prior reports remain intact. The latest tall vertical Gothic backpack design and supplied castle reference remain the design basis; the superseded circular town is not an acceptance requirement.

## Fixed global rubric

Above 8.5 is AAA, 7 is good indie, 5 is programmer art. Pass requires overall at least 8.5 **and** zero identified visual/runtime errors. The weights remain global, including established limitations outside the three changed variants.

| Category | Weight | Round 1 | Round 2 |
|---|---:|---:|---:|
| Default composition and readable game presentation | 20% | 6.9 | 7.6 |
| Terrain, environment assets, atmosphere | 20% | 7.0 | 7.0 |
| Kaiju construction, animation and physical weight | 20% | 6.0 | 6.3 |
| Citizens, clothing and life | 15% | 6.4 | 6.5 |
| City and carrier asset design | 15% | 6.5 | 7.0 |
| Combat and weapon visual communication | 10% | 7.5 | 7.6 |

Weighted result: **6.965, displayed as 7.0**. The largest gain is usable district inspection. This reaches the good-indie benchmark; a smoother model and additional roof variation do not by themselves establish AAA anatomy or architecture.

## Own fresh evidence

Existing neutral runners were executed unchanged in isolated Chrome profiles at `http://127.0.0.1:4178/?test=1`.

| Critic-owned directory | Coverage |
|---|---|
| `artifacts/critic-variants-02/` | 28 screenshots of cyborg, flesh and drill: normal HUD, body and close body, movement pairs, City, expanded castle front/reverse and inspected levels 1/3/5 |
| `artifacts/critic-variants-02/contact/` | 14 contact screenshots; 16 ground contact cases and 12 aircraft ranged actions |

**42 fresh screenshots total.** Both runs completed with zero browser errors and zero remote requests. Contact assertions passed with the unchanged 0.35 m limit; maximum reported ground-contact error remains approximately 0.2455 m. Ranged actions use the hull gun against aircraft and preserve the tested arrival/damage timing. These are critic-reproduced results, not reused builder evidence.

The tour retains normal HUD geometry; upper-ward shots use its labeled populated late-game fixture after paid expansion. Aircraft contact screenshots retain the runner's pause overlay. Previous critic captures provide context for the unchanged armored crawler and two airship variants; they are not counted as fresh views here. This bounded review does not establish all-angle castle gun clearance or a full locomotion-cycle/performance certification. In particular, arbitrary oblique paths through the new castle shell were not independently audited.

## Changes and defect disposition

**V1 resolved: selected castle districts are now visible.** `cyborg-streets.png`, `cyborg-level3-streets.png` and `cyborg-level5-streets.png`, plus the matching flesh shots, expose the chosen floor's people, occupied plots and central walking space. The enclosing shell/higher floors are removed for inspection and the camera looks down from a useful direction. The previous wall-and-slit view is gone. Exterior City views still show the castle.

**Castle hierarchy improves.** `cyborg-city.png` has a clear taller keep, unequal towers and larger red roof masses. The expanded front/reverse views retain the tall backpack and are less like identical open shelves. They are closer to the reference's architectural language, though the expanded body still forms a very straight, repetitive tower block.

**Flesh surfaces are more continuous.** `flesh-body-close.png` and the moving pair show fewer exposed round joint breaks and a joined torso/limb treatment. This is a meaningful improvement over the first mannequin. The surface still reads as smooth molded material, with weak anatomical landmarks and limited sense of muscular load. The walking samples change poses and the contact samples preserve the measured reach.

**The spiral drill is now a readable primary feature.** `drill-city.png`, `drill-body.png` and the moving pair show a deeper continuous flight and stronger bright lip. The spiral is more evident than the old shallow ring-like ridges. This substantially addresses round 1's drill-readability request. The longer hull and forward contact remain intact.

**Confirmed remaining visual defects: 0 in inspected evidence. Runtime errors: 0 in these runs.** No new light leak, penetration or gun obstruction is asserted without evidence. Unverified oblique clearance is a stated coverage limit, not a confirmed defect. The score threshold alone fails the gate.

## Ranked remaining art corrections

### 1. Give the flesh titan believable anatomical structure and surface response

**Evidence:** `flesh-body-close.png`, `flesh-moving-a.png`, `flesh-moving-b.png`, `contact/player-drill-to-flesh-speed-1-contact.png`.

The body is smoother, but long tapering limbs and a largely uninterrupted torso still look tube-like. Hands, wrists, neck and shoulder transitions do not yet form a convincing unified creature. The pale, uniformly smooth shading emphasizes that simplicity. It reads as an improved model blockout rather than finished flesh.

**Correction:** refine the ribcage-to-pelvis relationship, shoulder/clavicle transitions and elbow/knee/ankle landmarks; add restrained anatomical material variation that supports those forms. Preserve continuity through bent poses and the existing contact rig. Do not return to disconnected muscle spheres or substitute dense surface noise for structure.

**Acceptance:** front, three-quarter and moving views communicate skeletal support and muscle mass at ordinary gameplay distance. The bent leg/arm still looks anatomical, the harness appears to carry weight, and close views retain coherent transitions into hands and feet.

### 2. Break the expanded castle's remaining rectangular repetition

**Evidence:** `cyborg-expanded-city.png`, `cyborg-expanded-reverse.png`, `cyborg-city.png`, compared with the supplied reference already recorded in `variants-01.md`.

The roof group is better, but most of the expanded silhouette remains parallel vertical walls with similar window rhythm and a narrow stack of openings. The reference's identity depends on changes in tower mass, roof direction and connecting volumes, not only unequal roof heights.

**Correction:** give the dominant keep and subordinate sections distinct width/depth and interruptions, with a small number of purposeful bridges, offsets or roofed connections. Concentrate on major masses before small trim. Keep growth vertical and wearable, and preserve the successful inspection cutaway and usable gun openings.

**Acceptance:** the developed castle has recognizable architectural hierarchy from front, side and reverse, beyond its roof tips. Its outline changes meaningfully as it grows rather than merely extending straight walls upward. Levels 1/3/5 remain inspectable after the exterior changes.

### 3. Improve material distinction on the new large forms

**Evidence:** `cyborg-expanded-reverse.png`, `flesh-body-close.png`, `drill-body.png`.

Large masonry faces, smooth flesh and the drill core still have limited local variation and scale cues. The brighter spiral solves identification, but the major surfaces remain plain beside the tiny repeated detail of windows and teeth.

**Correction:** refine broad material/light relationships—stone joints and age, organic roughness/color transitions, and the drill's worked cutting edge versus its core—without adding clutter. Use variation at the scale visible in the normal body/City view.

**Acceptance:** stone, flesh and machined metal remain visibly distinct under both neutral and dusk lighting, with readable large forms and restrained detail. The image should gain physical credibility rather than simply becoming busier.

The inherited broad green terrain and repeated citizens still limit the global score. They are unchanged context; the next pass should prioritize the new anatomy and castle architecture above unrelated world expansion.

**Gate: FAIL — 7.0 < 8.5, with V1 resolved and no new confirmed errors. Two review rounds remain in this variant cycle.**
