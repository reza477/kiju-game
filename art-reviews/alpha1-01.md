# Alpha1 environment — independent art review 01

Reviewed revision: `7a16564829f4114ac523b20bc598390e12cc2d7b` (2026-09-17). Baseline: `aef1f02`. This is round 01 of a maximum of four, and the first independent review of this update. Reviewer acted only as critic: no implementation, assets, tests, or capture scripts were written.

**Overall: 7.1/10. Gate: FAIL.** This is good indie environment work under the fixed standard (7 = good indie, 5 = programmer art, >=8.5 required here). The standing foliage is fuller, the river reads, the scene is navigable, and the normal HUD remains clear. The broad ground treatment, mountainous backdrop, and vegetation lifecycle do not reach the required AAA finish. One concrete visual integration defect is identified below; no runtime errors were recorded in this review.

## Scope and changes assessed

Environment only: grass/ground, water/banks, mountains, trees, and their appearance during ordinary crawler movement with the full HUD. Relative to `aef1f02`, the candidate includes botanical vegetation/material changes, terrain/landscape changes, and spatial instance/LOD optimization. Supplementary baseline screenshots show that the candidate has substantially fuller and more solid leaf masses. That helps foliage legibility but does not by itself resolve the larger material and terrain-form limitations.

The Gothic vertical district rule, cyborg castle-only half height, and faction variants remain constraints, not requests for a city redesign. This review does not certify all six variants, save migration, combat balance, mobile performance, or the full progression loop.

## Fresh evidence and method

I chose and executed seven independent camera fixtures using the existing `tests/alpha-environment-capture.mjs`; I did not author or modify a capture script. Two invocations produced 15 fresh screenshots, including two four-frame motion sequences. The existing harness restricted requests to `http://127.0.0.1:4188`, waited for the local environment/assets, and used normal City view and its full HUD. `ACTIVE_VIEWS=1` removed pause through actual game state. Both browsers closed after capture.

Conditions: desktop Chrome, 1440×960 viewport, high quality, day lighting, renderer on an NVIDIA GeForce RTX 4070 Ti SUPER via ANGLE/D3D11. Camera zooms span 48–142 and pitches span 0.18–0.57. The harness sets a steady camera internally; the footer still reads “Camera: cinematic,” so the screenshots are evidence of the captured camera behavior, not proof that this text reflects the harness override.

Fresh principal views:

- [Close woodland and ground, zoom 48](../artifacts/critic-round-01/alpha1/grass-woodland-near.png)
- [Near ground around crawler, zoom 57](../artifacts/critic-round-01/alpha1/river-near-bank.png) — the filename reflects the intended fixture; the river is out of frame, so the supplemental bank view supplies that evidence.
- [Low panorama with river and ridges, zoom 106](../artifacts/critic-round-01/alpha1/ridge-low-panorama.png)
- [Wide valley and river, zoom 138](../artifacts/critic-round-01/alpha1/valley-hud-wide.png)
- [Reverse woodland, zoom 73](../artifacts/critic-round-01/alpha1/woodland-reverse.png)
- [River-bank detail, zoom 89](../artifacts/critic-round-01/alpha1/river-detail/river-bank-detail.png)
- [Low mountain silhouette, zoom 142](../artifacts/critic-round-01/alpha1/river-detail/ridge-silhouette.png)

Motion evidence: [woodland frame 0](../artifacts/critic-round-01/alpha1/review-motion-0.png), [1](../artifacts/critic-round-01/alpha1/review-motion-1.png), [2](../artifacts/critic-round-01/alpha1/review-motion-2.png), [3](../artifacts/critic-round-01/alpha1/review-motion-3.png); [river frame 0](../artifacts/critic-round-01/alpha1/river-detail/review-motion-0.png) and [3](../artifacts/critic-round-01/alpha1/river-detail/review-motion-3.png). The woodland sequence advances simulation time from 12 to 14 seconds and the carrier from (-84,22) to approximately (-67.72,26.89). Trees are visibly felled and wildlife moves during the sequence. The river sequence shows changing water detail and carrier movement along the bank. These sampled sequences establish live motion and expose the foliage lifecycle issue; they are not a temporal antialiasing or sustained FPS certification.

Detailed browser evidence: [first run report](../artifacts/critic-round-01/alpha1/report.json) and [river/horizon report](../artifacts/critic-round-01/alpha1/river-detail/report.json). Each reports zero captured page/console errors and zero remote requests. Startup to loaded assets was 6911 ms and 6915 ms respectively. Capture-only mode intentionally produced no performance timing runs.

## Scores

| Category | Score | Assessment |
| --- | ---: | --- |
| Environment design and gameplay readability | 8.0 | River, resources, routes, and carrier remain distinct in the normal HUD; the city is easy to track. This is a visual readability assessment, not a complete game-design evaluation. |
| Ground and grass | 6.4 | A muted, coherent palette, but large soft green/tan patches dominate. Close grass is sparse and does not establish a convincing continuous ground layer. |
| Standing trees and vegetation | 7.5 | Full silhouettes and useful species/color variation. Near crowns still expose oversized repetitive leaf clusters; fir branches read as stacked flat shelves. |
| Water and bank integration | 7.3 | Direction and channel depth read well. Broad uniform shallow bands, evenly distributed edge foam, and repeated bank dressing limit natural variation. |
| Mountains and distant terrain | 6.3 | A readable valley boundary, but long smooth, steep triangular slopes carry most of the backdrop with little convincing ridge hierarchy, erosion, or talus transition. |
| Lighting and overall composition | 7.5 | Stable, clear daytime view and useful foliage shadows. Pale ground and pale cliffs compress separation and weaken environmental drama. |
| Motion and environmental integration | 6.8 | Live movement works in the samples, but the felled-tree replacement breaks continuity with the new standing foliage. |

The overall 7.1 is a holistic art-direction judgment, not a rounded threshold target.

## Concrete defects — ranked

1. **D1 — standing-to-felled tree asset discontinuity (P2).** In woodland motion frames 1–3, beside and behind the moving crawler, detailed standing trees become straight dark cylindrical logs with two or three oversized, opaque green oval masses. Branch structure, foliage silhouette, and leaf scale are not preserved. These objects remain obvious in ordinary gameplay at the reviewed close camera. This is an incomplete integration of the new vegetation treatment across its gameplay lifecycle, not a request for unrelated city polish. Fix the felled representation so it belongs to the same species/material/branch family as its standing counterpart, and independently recapture actual tree felling. Do not merely hide all fallen vegetation in the review fixture.

No other concrete rendering/runtime error is established from this bounded review. In particular, I am not labeling broad aesthetic shortcomings as bugs, and I am not inferring subframe flicker or performance failures from still images.

## Ranked polish opportunities — separate from defects

1. **Ground material hierarchy and grass distribution.** The valley and near-ground views read as a smooth beige surface with broad blurry green islands. Strengthen visible distinctions between short meadow cover, exposed soil, trampled route, and wet bank; introduce coherent intermediate-scale breakup and transitions that survive the normal zoom. More scattered individual tufts alone will not resolve this.
2. **Mountain form and geology.** The low panorama and silhouette views expose a wall of smooth triangular slopes, with isolated trees dotted high onto the same surface. Add readable primary/secondary ridge structure, gullies, broken rock bands, and accumulated material at feet. Preserve traversal and existing location anchors; a convincing backdrop does not require changing game routes.
3. **Vegetation scale and hierarchy.** Keep the improved fullness, but vary crown breakup and branch rhythms. Reduce the visible flat-shelf repetition in firs and the coarse, similarly sized foliage pieces in close deciduous crowns. The three main leaf-color families should also meet through more natural local variation.
4. **River reach variation.** The bank-detail view is coherent but strongly ribbon-like: a relatively constant opaque pale fringe, broad central blue band, and recurrent tiny edge highlights. Vary shallow width, exposed sediment, foam concentration, and rock/reed groupings in relation to bends and obstacles. Keep the channel and gameplay crossing locations intact.
5. **Lighting/material separation.** Preserve HUD readability and improve separation of dry ground, living vegetation, and mineral cliffs. The current global pale cast reduces the return from added detail.

## Required next review

Address D1 first, then select the highest-impact ground/mountain improvements within scope. Submit the changed revision for a fresh independent review with the normal HUD and another real felling sequence. Do not reinterpret this review as acceptance because runtime logs are clean. Pass still requires >=8.5 overall and zero concrete visual/runtime errors; round 01 has achieved neither condition together.
