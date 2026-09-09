# Independent art review

## Full graphics upgrade — prototype 0.9

This new cycle covers rendering, lighting, landscape, characters and citizens, carrier architecture, combat and presentation. All prior cycles below remain closed. The same fixed global rubric, independent screenshots, zero-error requirement and maximum of four rounds apply. The first builder attempt is verified in [graphics upgrade verification](GRAPHICS_UPGRADE_VERIFICATION.md); independent scoring is pending.

## Cyborg castle height adjustment — prototype 0.8.1

The owner clarified that only the cyborg castle backpack should be half-height. The robot, body weapons, castle footprint and flesh castle retain their dimensions. This bounded adjustment preserves vertical construction and saved progress; previous visual cycles remain closed.

| Round | Builder revision | Independent review | Result |
|---|---|---|---|
| 1 | `f050917` | [Independent review](art-reviews/compact-castle-01.md) | **FAIL — 7.7/10** (weighted 7.650), zero confirmed concrete errors in 28 fresh HUD views |
| 2 | `9e4b72d` | [Final independent review](art-reviews/compact-castle-02.md) | **AAA FAIL — 7.7/10** (weighted 7.650), zero confirmed concrete errors in 28 fresh HUD views; scoped correction resolved |

Round 1 verifies the requested height, unchanged robot and flesh control, upward additions and preserved saves. Round 2 resolves the small saw and entrance proportions while keeping natural-sized people and work tables. The critic identifies no further actionable height-adjustment issue, concluding this bounded change after two reviews within the four-round maximum. The whole-game AAA gate remains unmet because of inherited architecture, terrain and character limitations; see [functional verification](COMPACT_CASTLE_VERIFICATION.md).

## Actual vertical Gothic construction — prototype 0.8

This cycle addresses the owner's clarification that every Gothic building must add a storey directly above the last. The global rubric and four-round maximum are unchanged; earlier cycles remain closed. New work is scoped to construction, Gothic architecture and its presentation.

| Round | Builder revision | Independent review | Result |
|---|---|---|---|
| 1 | `b4bd9e9` | [Independent review](art-reviews/vertical-growth-01.md) | **FAIL — 7.5/10**, zero confirmed concrete errors in 36 fresh HUD views |
| 2 | `364b2dd` | [Independent review](art-reviews/vertical-growth-02.md) | **FAIL — 7.6/10**, zero confirmed concrete errors in 28 fresh HUD views |
| 3 | `08312dc` | [Independent review](art-reviews/vertical-growth-03.md) | **FAIL — 7.6/10** (weighted 7.635), zero confirmed concrete errors in 28 fresh HUD views |
| 4 | `cb62556` | [Final independent review](art-reviews/vertical-growth-04.md) | **FINAL FAIL — 7.7/10** (weighted 7.650), zero confirmed concrete errors in 28 fresh HUD views |

**Prototype 0.8 cycle closed after four rounds. The 8.5 AAA gate remains unmet.** The final review verifies upward additions, lower upgrades lifting the stack, capacity-only harness work and retained saves. Garden foliage now identifies growing storeys, and longer supports improve the chapter connections. Repeated architectural massing and the broader environment, character and citizen limitations remain. Zero confirmed errors applies to the reviewed states, not every possible game state. No fifth attempt is part of this update.

Round 1 independently verifies real 3-to-4-storey growth, lower upgrades lifting upper floors, fixed footprint and capacity-only harness work. The critic ranks Gothic architectural hierarchy, visible unfinished construction and district-specific façade cues as the next improvements. See [verification](VERTICAL_GROWTH_VERIFICATION.md) for functional evidence.

## Maximum visual quality and sound — prototype 0.7

This new cycle follows the owner's request to push graphics further and add sound. The global rubric and four-round maximum are unchanged. Previous cycles below remain closed.

| Round | Builder revision | Independent review | Result |
|---|---|---|---|
| 1 | `af2a350` | [Independent review](art-reviews/beauty-01.md) | **FAIL — 7.2/10**, zero concrete visual/runtime errors in 63 fresh views |
| 2 | `66632ee` | [Independent review](art-reviews/beauty-02.md) | **FAIL — 7.4/10**, zero concrete visual/runtime errors in 74 fresh views |
| 3 | `fd4f9a1` | [Independent review](art-reviews/beauty-03.md) | **FAIL — 7.5/10**, zero concrete visual/runtime errors in 70 fresh views |
| 4 | `7254925` | [Final independent review](art-reviews/beauty-04.md) | **FINAL FAIL — 7.6/10**, zero concrete visual/runtime errors identified in 67 fresh views |

**Prototype 0.7 cycle closed after four rounds. The 8.5 AAA gate remains unmet.** The final review credits real citizen workstations, clearer castle materials and ecological patches. Landscape composition, flesh anatomy and weight, Gothic architectural massing and close human detail remain the principal aesthetic limitations. No fifth attempt is part of this update. The zero-error finding applies to reviewed coverage, not every possible game state; subjective audio quality was not scored.

The first attempt introduced local PBR scans and HDR reflected lighting, surface-oriented contact shading, branching vegetation, improved flesh/citizens/districts, and an original local soundscape with a persisted mixer. The critic ranked readable metal surfaces, landscape composition, connected flesh anatomy, castle massing and citizen activity as the next priorities. Audio passed technical and UI checks; the critic did not perform subjective listening and did not assign an audio-quality score.

The owner requires an independent critic after each completed character, asset, or environment attempt. The gate and responsibilities are in [AGENTS.md](AGENTS.md).

The first cycle evaluated the completed 0.4 build as round 1, followed by three revised builds. Every review uses fresh screenshots taken by the critic. A failed fourth review ends the cycle without an approval claim.

| Round | Builder revision | Independent review | Result |
|---|---|---|---|
| 1 | `b5cdf00` / prototype 0.4 | [Critic report](art-reviews/round-01.md) | **FAIL — 5.3/10**, 0 runtime errors; visual defects remain |
| 2 | `67338ca` | [Critic report](art-reviews/round-02.md) | **FAIL — 6.1/10**, 0 runtime errors; 2 confirmed visual defects |
| 3 | `db86f1d` | [Critic report](art-reviews/round-03.md) | **FAIL — 6.4/10**, 0 runtime errors; melee contact defect |
| 4 | `022020d` | [Final critic report](art-reviews/round-04.md) | **FAIL — 6.7/10**, 0 runtime errors; damage precedes visible impact |

Round 2 addressed the first ranked list: articulated carrier motion and contact, stronger supports, distinct terrain regions and water, improved clothing and crowd spacing, more useful city/Streets framing, compact controls, and clearer firing effects. The builder's integrated browser audit and smoke checks passed; these are functional checks, not aesthetic approval.

Round 3 replaces stochastic shadow filtering, concentrates terrain geometry in the playable area, adds continuous regional ground materials, fits kaiju soles to rendered terrain, strengthens weight transfer and hit reactions, keeps City framing above the build tray, and adds impact aftermath. The builder passed 34 Node tests and the integrated gameplay audit; fresh tours, complete stride fixtures and phase-based combat captures reported no browser errors. Independent scoring follows the completed revision.

Round 4 adds aimed fist contact, supported crouching and stepping, walking recovery during pursuit, and impacts attached to moving target surfaces. It also changes the battle camera angle, quiets smoke, tightens castle framing, varies tree crowns and groups ruins and rock formations. The builder passed 35 Node tests, the integrated gameplay audit, 13 browser smoke checks, and targeted contact and stride checks. This is the fourth and final submission in this cycle; its score determines the recorded result without further retries.

**Final gate: failed. Four rounds completed; no fifth attempt.** The final critic independently captured 73 screenshots and reran six contact cases. Spatial fist contact and travelling impact placement are resolved in the observed sequences, but health decreases during wind-up/flight before the visible hit. The score also remains below 8.5 on art quality alone. The final report ranks the remaining environment composition, hero form and weight, citizen activity, material and effect work for a later update.

The private repository contains the review reports. Screenshots remain on this PC under `artifacts/` and are excluded from source backup.

## Camera, atmosphere and lighting — prototype 0.5

The owner's next update starts a separate cycle, retaining the same global rubric and four-round maximum. The prior reports remain unchanged. The new scope is cinematic camera effects, coherent environmental movement and stronger lighting; version 0.5 also addresses the previous damage/contact timing defect.

| Round | Builder revision | Independent review | Result |
|---|---|---|---|
| 1 | `324191e` | [Independent review](art-reviews/cinematic-01.md) | **FAIL — 6.8/10**, 0 runtime errors; brief player clipping on battle entry |
| 2 | `22efd80` | [Independent review](art-reviews/cinematic-02.md) | **FAIL — 6.9/10**, no confirmed visual or runtime errors; aesthetic threshold not met |
| 3 | `4364c43` | [Independent review](art-reviews/cinematic-03.md) | **FAIL — 7.0/10**, no confirmed visual or runtime errors; aesthetic threshold not met |
| 4 | `8d793b7` | [Final independent review](art-reviews/cinematic-04.md) | **FAIL — 7.1/10**, no confirmed visual or runtime errors; aesthetic threshold not met |

The first builder attempt passed 40 Node tests, 13 browser smoke checks, the integrated 26-view living-world audit, a revised 31-view cinematic capture suite and six physical contact cases. Preserved scenery identities, rooted wind/shadow deformation, quality-mode brightness and bounded atmosphere allocation were checked separately. Independent evidence goes under `artifacts/critic-cinematic-XX/`; reports go under `art-reviews/cinematic-XX.md`.

**Prototype 0.5 final gate: failed. All four rounds are complete; no fifth attempt.** The final critic independently captured 56 views and scored 7.1/10 (weighted 7.055), with no confirmed visual or runtime errors. Battle framing, contact timing, camera comfort, local impact light and river depth improved. Remaining art limitations include dark outer carrier forms, broad landscape uniformity, simple anatomy and repeated citizens. The original 8.5 threshold remains unchanged. Final builder checks passed 41 Node tests, 13 browser smoke checks, six physical-contact cases and a 34-view cinematic tour; these do not establish AAA art quality.

## Vertical castles and six carrier versions — prototype 0.6

The owner's new reference and six-version request starts a separate cycle with the same fixed global rubric and four-round limit. The latest vertical fortress supersedes the previous circular town. Prior reviews remain unchanged.

The first builder attempt includes the vertical castle with inspectable floors, flesh/cyborg bodies, an elongated drill crawler and the four-upright-balloon city. The new neutral runner captures all six variants, movement pairs, normal HUD, populated upper wards and Streets floors. The critic must take its own fresh captures from the frozen revision. Evidence belongs under `artifacts/critic-variants-XX/`; reports under `art-reviews/variants-XX.md`.

| Round | Builder revision | Independent review | Result |
|---|---|---|---|
| 1 | `fd3e5a4` | [Independent review](art-reviews/variants-01.md) | **FAIL — 6.7/10**, 0 runtime errors; enclosing castle walls obscure floor inspection |
| 2 | `c47a1ea` | [Independent review](art-reviews/variants-02.md) | **FAIL — 7.0/10**, floor inspection fixed; no new confirmed errors in the critic's evidence, aesthetic threshold not met |
| 3 | `7d67b0a` | [Independent review](art-reviews/variants-03.md) | **FAIL — 7.0/10**, main cannon obstruction fixed; three known curved-shot collisions with projecting trim remain |
| 4 | `c7ca390` | [Final independent review](art-reviews/variants-04.md) | **FAIL — 7.1/10**, all known defects resolved in reviewed coverage; aesthetic threshold not met |

Round 2 replaces open shelving with larger keep and roof masses, exposes the selected floor's residents and plots, joins the flesh body into continuous anatomical surfaces, and deepens the drill's helical cutting flight. The critic independently captured 42 views. A separate builder geometry diagnostic subsequently confirmed that some allowed oblique cannon paths cross the castle shell; this is being addressed in round 3, without changing the critic's bounded findings.

Round 3 shares principal castle solids between rendering and weapon obstruction, preserves real gun ports and stops barrels before walls. It also refines flesh landmarks, regional skin response and supported stance, and adds axial wear to the drill core. The critic independently captured 46 views and reproduced 525 barrel samples, clear/blocked combat, and the variant contact suite. A broader builder diagnostic identified three remaining curved paths through a sill, roof seam and railing post. The final round addresses that trim coverage along with the ranked anatomy and castle hierarchy work.

**Prototype 0.6 final gate: failed. All four rounds are complete; no fifth attempt.** The final critic scored **7.1/10** (weighted 7.055) from 69 fresh captures covering all six versions and the contact/cannon checks. Floor inspection and all three known trim-projectile defects are resolved in that evidence. No remaining concrete visual or runtime error was identified; the aesthetic threshold alone remains unmet. The independent projectile check reproduced 1,254 samples, 313 allowed curved trajectories and zero intersections in that grid; 525 barrel samples, 16 ground contact cases and 12 aircraft ranged actions also passed. Final builder validation includes 50 Node tests, 13 browser smoke checks and a 48-view six-version tour.

The final art priorities are more convincing flesh anatomy and load, stronger castle architecture and material scale, and richer citizen/environment detail. These remain future work outside this closed cycle. The requested vertical Gothic backpacks, flesh/cyborg bodies, standard/drill crawlers and horizontal/four-upright-balloon cities are playable locally and backed up in the private repository.
