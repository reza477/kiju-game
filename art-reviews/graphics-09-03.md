# Independent art review — graphics 0.9, round 3 of 4

**FAIL — 7.9 / 10 overall (weighted 7.940). Zero confirmed concrete visual errors and zero browser errors in the reviewed coverage.** Stronger ruins, narrowed castle chapters and additional anatomical planes produce a modest improvement. The smooth landscape, repeated late tower and toy-like close characters still prevent an AAA result. The fixed 8.5 threshold remains unmet.

Reviewed frozen revision: **`3aa57bed811e800b807ce07c63d2eb54b77f6d04`**. I verified the revision and clean working tree before capture and again after all runners and inspection. I ran existing neutral runners unchanged, sequentially, and wrote only this report. No implementation, assets, tests or capture scripts were changed. Earlier reviews remain unchanged.

## Fixed whole-game rubric

The fixed standard remains above 8.5 for AAA, 7 for good indie and 5 for programmer art. Pass requires at least 8.5 and zero identified concrete visual/runtime errors. Functional checks and implementation effort do not earn aesthetic points.

| Category | Weight | Round 3 |
|---|---:|---:|
| Default composition and readable game presentation | 20% | 8.0 |
| Terrain, environment assets, atmosphere | 20% | 8.0 |
| Kaiju construction, animation and physical weight | 20% | 7.7 |
| Citizens, clothing and life | 15% | 7.8 |
| City and carrier asset design | 15% | 8.2 |
| Combat and weapon visual communication | 10% | 8.0 |

Weighted result: **7.940, displayed as 7.9**, compared with round 2's 7.885. The small gains do not change the rounded score. This remains good independent-game work with visible limits, rather than AAA quality.

## Own fresh evidence

All evidence is under ignored `artifacts/critic-round-03/graphics-09/`.

| Existing runner and filter | Fresh normal-HUD views | Subdirectory |
|---|---:|---|
| `variants-art-capture.mjs`, `VARIANTS=cyborg,flesh,standard,horizontal` | 34 | `variants` |
| `environment-art-capture.mjs`, unchanged full tour | 5 | `environment` |
| `beauty-render-audit.mjs`, unchanged full tour | 19 | `lighting` |
| `combat-art-capture.mjs`, `SEQUENCES=kaiju-melee,crawler,airship` | 12 | `combat` |

**70 fresh screenshots; all four runners completed with zero browser errors, zero remote requests and no runner failure.** I inspected both Gothic close bodies, walking pairs, expanded front/reverse towers, occupied storeys 11 and 20, all three faction Streets, both horizontal-carrier movement pairs, all five landscapes, day/dusk/night and detail-mode comparisons, and all twelve combat phases. These are my own captures, not builder screenshots.

Environment and lighting diagnostics report ten surface sets and four active skin sets loaded, no pending/failed loads and valid contexts. The landscape report records zero invalid matrices and protected-anchor overlaps. It reports 1,665 destructible objects, 57 ambient-life objects and no active or submitted geometry in the empty effect pools. These observations establish only the captured states.

The neutral variant tour uses a deterministic product clock. Its twenty-storey fixture fills districts after paid harness reinforcement; it is not a fresh test of twenty paid construction orders. **The walking pairs precede that fixture and show the initial three-storey load. Twenty-storey walking is not independently captured here.** Expanded front/reverse poses and upper cutaways establish the late architecture, not the maximum-load walking animation. The builder's load/contact and geometry audits are separate functional evidence, not independently rerun in this review.

The cyborg's requested half-height castle remains visibly distinct from the full-height flesh castle, with natural-sized residents in occupied rooms. The landscape tour relocates player/camera to existing landmarks; incidental placement overlaps are not evidence of normal-navigation collisions. Drill and upright-balloon City/night Streets views are fresh, while their detailed movement/mobile/identity checks and the omitted kaiju body-gun ranged sequence are inherited from round 1. Combat uses controlled health/reload and initial positions. Subjective audio quality is unreviewed.

## Concrete defect result

**No new concrete visual error is confirmed.** Round 1 D1 remains resolved in both lowest Gothic day and night cutaways: the shoulder lantern no longer floats above the exposed room. City views retain supported illumination. The inspected residents, workstations and outward-facing cannon floors show no new obvious clipping.

Backpacks remain attached during the inspected initial-load walking pairs and melee bend/recovery. The melee contact frame shows the fist reaching the crawler and health falling at contact; the cannon and missile frames place effects on the struck carrier. Effects clear during recovery. Three sampled sequences do not establish correctness for every weapon arrangement or contact. The zero-error finding is bounded to this evidence, not all possible game states.

## Visible changes and remaining ranked polish

The upper castle chapters narrow more clearly, and unequal turrets help distinguish the crown. Wider cannon bands still read as deliberate occupied galleries. Stronger ruin wall returns and collapsed pieces improve local landmarks. New soil/runoff and mineral details connect some ground patches. Flesh knees, wrists and palms have clearer planes; residents show additional gestures and hand/head detail. These improvements are visible, but most are small at normal gameplay distance.

The following are aesthetic priorities, **not concrete defects**, for the one remaining builder attempt:

1. **Give the landscape actual landform and bank structure.** `environment/city.png`, `world.png` and `river.png` still show broad, airbrushed slopes between detailed object clusters. The new mineral marks sometimes read as fine dotted chains over a smooth surface. A deliberately composed terrace, eroded bank, gully or rock/soil transition with a visible profile would contribute more than additional flat scatter. Preserve the playable routes, resources and saved scenery identities. This is now the largest environment opportunity.

2. **Strengthen the castle's few major forms.** Both `variants/*-expanded-city.png` and `*-expanded-reverse.png` show the improved taper, but the twenty-storey silhouette still reads mainly as a thin repeated shaft. Give the keep, supporting spine and crown more distinct visual weight and connections within the existing footprint. Preserve the exact compact cyborg height, every upward addition, natural residents and tested weapon promenades. Do not narrow the cannon floors simply to remove their wider bands; those bands have a clearance purpose. More repeated trim alone will not resolve the massing.

3. **Make flesh anatomy and carried weight read at the normal camera.** `variants/flesh-body-close.png` has a more coherent head and added joint landmarks, but long smooth limbs still dominate the form. The initial-load walking pair communicates articulation more strongly than tremendous weight. Concentrate on a few larger joint/tendon planes and clear loaded shoulder/hip/foot relationships, preserving the body dimensions and contact system. Before final handoff, the builder should extend the neutral runner to include explicit twenty-storey walking pairs so the critic can assess the maximum occupied load directly.

4. **Give close inhabitants more natural silhouettes.** Faction clothing and work activity remain clear in the Streets views, but many faces, hands and resting poses still resemble upright dolls. The new gestures help locally without substantially changing that overall impression. More deliberate hand/head shapes and varied working/resting silhouettes are more useful than additional fine texture. Retain natural scale and the proven workstation, route and ceiling clearances.

## Independent timing observation

All twelve real-time lighting observations completed with loaded assets and valid contexts. Median animation-frame intervals were **10.0–10.1 ms**, with p95 approximately **20.1 ms**, on **RTX 4070 Ti SUPER through ANGLE/D3D11**. The earlier round-1 slow result was not reproduced. These are short, uncalibrated headless samples, not sustained foreground benchmarks or guaranteed frame rates. I did not repeat the builder's separate culling or geometry audits.

**Round 3 complete: 7.9 / 10, zero newly confirmed concrete errors, AAA gate failed on aesthetics. One final review round remains in this graphics update; no fifth round is permitted.** All capture browsers are closed, and the frozen build and GPU are released to the builder.
