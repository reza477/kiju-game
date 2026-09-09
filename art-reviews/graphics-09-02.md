# Independent art review — graphics 0.9, round 2 of 4

**FAIL — 7.9 / 10 overall. Zero confirmed concrete visual errors and zero browser errors in this review's coverage.** The unsupported lantern is corrected. Terrain color, flesh continuity, castle recesses and close clothing improve, but the larger shapes still fall short of AAA quality. The unchanged 8.5 aesthetic threshold remains unmet.

Reviewed frozen revision: **`45b0b9fb0bc5392c879847be57904e195ddaa138`**. I verified HEAD and a clean tree before capture and again after all four runners and inspection. I ran the existing neutral runners unchanged, sequentially, and wrote only this report. No implementation, assets, tests or capture scripts were changed. Previous reports remain unchanged.

## Fixed whole-game rubric

The fixed standard remains above 8.5 for AAA, 7 for good indie and 5 for programmer art. Pass requires at least 8.5 plus zero identified concrete visual/runtime errors. Functional checks and implementation effort do not earn aesthetic points.

| Category | Weight | Round 2 |
|---|---:|---:|
| Default composition and readable game presentation | 20% | 8.0 |
| Terrain, environment assets, atmosphere | 20% | 7.9 |
| Kaiju construction, animation and physical weight | 20% | 7.6 |
| Citizens, clothing and life | 15% | 7.8 |
| City and carrier asset design | 15% | 8.1 |
| Combat and weapon visual communication | 10% | 8.0 |

Weighted result: **7.885, displayed as 7.9**. This is a modest visual advance from round 1's 7.775. Clearing the defect and reducing rendering cost are useful outcomes; neither turns the remaining procedural forms into AAA art.

## Own fresh evidence

All evidence is under ignored `artifacts/critic-round-02/graphics-09/`.

| Existing runner and filter | Fresh normal-HUD views | Subdirectory |
|---|---:|---|
| `variants-art-capture.mjs`, `VARIANTS=cyborg,flesh,standard,horizontal` | 34 | `variants` |
| `environment-art-capture.mjs`, unchanged full tour | 5 | `environment` |
| `beauty-render-audit.mjs`, unchanged full tour | 19 | `lighting` |
| `combat-art-capture.mjs`, `SEQUENCES=kaiju-melee,crawler,airship` | 12 | `combat` |

**70 fresh screenshots; all four runners completed with zero browser errors, zero remote requests and no runner failure.** I inspected both Gothic close/body views and movement pairs, expanded front/reverse towers, occupied storeys 11 and 20, all three faction Streets, both horizontal-carrier movement pairs, all five landscapes, day/dusk/night and detail-mode comparisons, and all twelve combat phases. These are the critic's own captures, not builder screenshots. Camera/context observations remain valid. Environment and lighting diagnostics report ten surface sets and four active skin sets ready, zero pending/failed loads and no invalid landscape matrices or lost contexts.

The variant tour uses a deterministic product clock. Its twenty-storey fixture fills districts after paid harness reinforcement; this is not a new test of every paid construction order. Natural-sized residents remain visible in compact rooms, and both towers expose occupied upper storeys. The cyborg castle's requested half-height and the flesh castle's full height remain distinguishable. The landscape tour relocates player/camera to existing landmarks; incidental overlaps in those relocated views do not establish normal-navigation collisions.

Drill and upright-balloon City/night Streets views are fresh in the lighting tour. Their detailed movement/mobile/identity checks are inherited from round 1, rather than recaptured here. The omitted kaiju body-gun ranged sequence is likewise inherited. Combat uses controlled health/reload and initial placements; three phase sequences do not prove every battle arrangement. Builder geometry, contact, resident and culling audits are separate functional evidence, not independently rerun here. Subjective audio is unreviewed.

## Concrete defect result

**Round 1 D1 is resolved in the observed views.** The shoulder lantern housing no longer floats above either lowest Gothic cutaway in `variants/cyborg-streets.png`, `variants/flesh-streets.png` or their two `lighting/*-night-streets.png` counterparts. City views retain supported local lighting. The previous floating object was the shoulder lantern, not a belfry bell or citizen hat.

No new concrete visual error is confirmed. Backpacks stay attached through the inspected walking pairs and melee bend/recovery. Cannon and missile contact frames place sparks on the struck carrier; the melee sequence shows fist contact, a corresponding health decrease and supported recovery. No detached persistent aftermath is visible in these phase frames. This bounded finding is not a claim that all possible states are error-free.

## Visible changes and remaining ranked polish

The terrain's greens and soils are less saturated and more connected. The flesh face has a continuous cheek/chin outline, and the wrists and torso have clearer transitions. Castle chapters now recess more visibly and use larger openings; the lower full-height castle reads more convincingly than the twenty-storey version. Courtyard paving and fitted collars, hoods and clothing improve close inspection. Warm windows and local lamps remain readable at night. Combat effects remain clear without obscuring the opposing cities.

The following are aesthetic priorities, **not concrete defects**:

1. **Make the Gothic tower's large silhouette read as a castle.** Both `variants/*-expanded-city.png` and `*-expanded-reverse.png` still read primarily as a thin repeated shaft with a small cap. The new arches improve the facade more than the silhouette. Give the main keep, supporting spine, recessed chapters and crown more distinct visual weight within the existing footprint and protected routes. Stronger differences among these few major forms will help more than further repeated trim. Preserve every upward addition, exact cyborg half-height, body clearance and weapon portals.

2. **Give the broad ground more landform structure.** `environment/city.png`, `world.png` and `river.png` are calmer in color, but the transitions still resemble broad airbrushed patches between detailed clusters. More convincing soil/stone drainage bands, irregular forest-edge structure and transitions from hill bases to valley floor would connect the scene. Keep open navigable areas and protected resources; indiscriminately adding more scattered objects would not address this weakness.

3. **Strengthen the flesh hero's joints and weight.** The head is more coherent, but `variants/flesh-body-close.png` and the walking pair still show soft elongated limb forms and understated wrists, knees and hands. Improve the major bony/tendon planes and the visible load transfer through hips, shoulders and planted feet. Preserve the humanoid identity and dimensions. The current animation is functional; it does not yet convincingly sell a creature carrying a city.

4. **Make close inhabitants less uniform in pose and finish.** All three Streets views show useful faction clothing and real workstation activity. Faces, hands and many resting silhouettes still feel like small upright dolls. More deliberate head/hand shapes, cloth response and distinct resting/working poses would make the inhabited districts more rewarding to inspect. Retain natural size, route support, work contacts and compact-room clearance.

## Independent timing observation

The unchanged lighting runner measured **10.0–19.9 ms median animation-frame intervals, with p95 up to approximately 20.1 ms**, on the same RTX 4070 Ti SUPER through ANGLE/D3D11. These observations are materially better than my round 1's 20.0–79.9 ms medians and align with the builder's current range. All twelve timing observations completed with loaded assets and valid contexts.

These remain short, uncalibrated headless samples, not sustained foreground benchmarks or a guaranteed frame rate. The builder's separate exact paired-image culling audit addresses unchanged imagery and lower submission counts; I did not repeat that audit. The earlier slow capture result was not reproduced in this round.

**Round 2 complete: 7.9 / 10, D1 resolved in reviewed states, zero newly confirmed concrete errors, AAA gate failed on aesthetics.** Return the ranked polish list for the next attempt. This update permits at most four review rounds; two remain. All capture browsers are closed, and the frozen build is released to the builder.
