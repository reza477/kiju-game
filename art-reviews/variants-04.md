# Independent variant review — prototype 0.6, round 4 of 4

**FINAL FAIL — 7.1 / 10 overall.** The three known castle-trim projectile defects are resolved in independently reproduced checks. No remaining concrete visual or runtime error was identified in this final evidence. The aesthetic score remains below 8.5. **This four-round variant cycle is closed; no fifth attempt is requested.**

Reviewed frozen revision: **`c7ca390efd50deab5740ef45dc3fcc2b605d6eb8`**, independently verified. Source and tests remained unchanged throughout review. The critic wrote only this report and used existing capture/audit runners unchanged. Prior scores and reports remain intact. The current vertical Gothic castle backpack and supplied reference supersede the original circular-town design.

## Fixed global rubric

Above 8.5 is AAA, 7 is good indie, 5 is programmer art. Pass requires overall at least 8.5 **and** zero identified visual/runtime errors. All category weights remain unchanged; this is the whole game's presentation score, not a score restricted to the final fixes.

| Category | Weight | Round 3 | Final |
|---|---:|---:|---:|
| Default composition and readable game presentation | 20% | 7.6 | 7.6 |
| Terrain, environment assets, atmosphere | 20% | 7.0 | 7.0 |
| Kaiju construction, animation and physical weight | 20% | 6.4 | 6.5 |
| Citizens, clothing and life | 15% | 6.5 | 6.5 |
| City and carrier asset design | 15% | 7.1 | 7.2 |
| Combat and weapon visual communication | 10% | 7.6 | 7.8 |

Weighted result: **7.055, displayed as 7.1**. The build meets the good-indie benchmark. Stronger chest planes, a castle shoulder and correct obstruction handling are useful improvements, but they do not close the substantial asset-quality gap to AAA.

## Own fresh evidence

The critic executed all four neutral runners in isolated Chrome profiles against `http://127.0.0.1:4178/?test=1`. All current visual evidence below is freshly captured by this critic, not reused builder imagery.

| Evidence directory | Coverage |
|---|---|
| `artifacts/critic-variants-04/` | 48 normal-HUD screenshots: all six variants, title/City/body/movement/Streets, kaiju body close-ups, expanded castle front/reverse and levels 1/3/5, world view and 390 px mobile layout |
| `artifacts/critic-variants-04/contact/` | 14 screenshots, 16 ground-contact cases, 12 aircraft ranged actions |
| `artifacts/critic-variants-04/cannons/` | Four clear/blocked battle screenshots, 525 barrel samples |
| `artifacts/critic-variants-04/projectiles/` | Three original trim-regression battle screenshots, 1,254 projectile samples |

**69 fresh screenshots total. All four runs completed with zero browser errors and zero remote requests.** Inspected representative views across all six identities, close and wide scales, temporal movement pairs, selected castle floors and combat/contact fixtures. The supplied castle reference was reopened directly for comparison.

Ground contact preserved the unchanged 0.35 m limit: maximum measured error **0.2455 m**, zero failures. The cannon runner retained **525 samples, zero barrel intersections**, and approximately `7.34e-15` m maximum muzzle-transform disagreement. Clear-port battles emit the battery contribution; obstructed battles omit it while intrinsic weapons can still fire.

The projectile runner independently reproduced **1,254 samples, 313 allowed paths, zero actual curved-path intersections**. All three previous sill/seam/post cases now report specific castle blockers, with no corresponding battery event, rendered battery FX or additional battery damage. The slot-16 aircraft battle also lies outside basic firing range, so that battle's rejected action alone does not isolate obstruction; the geometric path check and blocker result supply the separate clearance evidence.

The upper-ward views use the existing labeled populated expansion fixture. HUD geometry is retained, with the runners' existing transient overlay handling. Temporal screenshots show actual kaiju pose changes, drill rotation and airship travel; contact samples add attack evidence. This does not certify every possible placement, heading, terrain condition, full locomotion cycle or device performance. A bounded clean audit is not proof that the entire game can never contain an error.

## Defect disposition and final art assessment

**V1 remains resolved — floor inspection.** `cyborg-streets.png`, `cyborg-level3-streets.png`, `cyborg-level5-streets.png` and `flesh-level5-streets.png` show accessible occupied plots, residents and circulation. New exterior shape and collision details have not restored the former enclosing-wall obstruction.

**V2 resolved in reproduced coverage — castle-trim projectile intersections.** The three `projectiles/slot-*-trim-obstruction.png` images show blocked battery status. Their accompanying report records the actual geometry and event/FX/damage checks. This is now critic-reproduced evidence, rather than only the builder attribution used in round 3.

**Remaining concrete visual defects identified: 0. Runtime errors in these runs: 0.** No earlier known defect is carried forward as unresolved. The failed gate is the aesthetic score, not a newly invented error.

**The six variants remain distinct.** `standard-body.png` and `drill-body.png` separate the armored prow from the long forward spiral. `horizontal-body.png` and `vertical-body.png` distinguish horizontal envelopes from exactly four upright balloons; Eastern domes remain visible between them. The cyborg and flesh body views preserve humanoid proportions and wearable Gothic backpacks. Crawler streets retain British industrial character, while the airship and kaiju streets retain their own dress and architecture.

**Castle growth has more shape, but the reference remains ahead.** `cyborg-expanded-city.png` and `cyborg-expanded-reverse.png` show the narrowed upper keep and roofed shoulder interrupting the formerly uniform wall. It is still a largely straight tower group with regular window and masonry rhythms. The reference's expressive connecting masses, changing tower widths and depth are only partially present.

**Flesh gains are visible but limited.** `flesh-body-close.png` and the moving pair show stronger chest/neck planes and less uniform coloration. Long limbs, simplified joint transitions, facial forms and smooth surfaces still give the creature a molded model appearance. The measured contact pose reaches its target; it has not acquired the convincing muscular load and physical weight of a finished hero creature.

**The surrounding world and people still constrain the whole image.** Fresh faction Streets views confirm distinct clothing silhouettes, but faces, hands, fabric and local activity remain simple. `six-variant-world.png` and the body/movement views retain attractive atmosphere but broad, relatively uniform ground, repeated vegetation forms and regular river edges. The mobile layout remains readable in the captured state, though its panels leave a small visual stage. These are polish limitations, not confirmed malfunctions.

## Ranked future art work — outside this closed cycle

1. **Finish the flesh hero's anatomy and sense of load.** Prioritize neck/shoulder/ribcage/pelvis relationships and continuous bent-joint forms, then skin response. Evidence: flesh close-up, movement pair and `contact/player-flesh-to-drill-speed-1-contact.png`. Acceptance: coherent anatomy and supported backpack weight at normal play distance and close range, preserving contact accuracy.

2. **Develop the castle's major architecture and material scale.** Give the dominant keep and secondary sections stronger changes in width, depth and roof connections; vary large stone surfaces purposefully. Evidence: expanded front/reverse images and the supplied reference. Acceptance: architectural hierarchy reads beyond roof tips, growth stays vertical, selected floors remain inspectable, and newly authored trim participates in physical weapon clearance.

3. **Bring citizens and environment up toward the strongest carrier assets.** Improve clothing construction, faces/hands and small purposeful activities; compose more distinct terrain and vegetation groupings instead of repeating the same forms across broad surfaces. Evidence: current faction Streets, world and body views. Acceptance: close views retain believable people and materials while wide views have memorable landscape structure and readable resources.

These are future opportunities, not another automatic revision request. The final result is **7.1, zero identified remaining errors in reviewed coverage, overall gate failed**. The owner's four-round limit has been reached.
