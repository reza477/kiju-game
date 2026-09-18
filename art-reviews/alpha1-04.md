# Alpha1 environment — independent art review 04 (final)

Reviewed revision: `b9fab3ed9875575d0d263a4576fe1bbfdc88d29f` (2026-09-17). Previous review: [round 03](alpha1-03.md), revision `bb9f8b3067cbfe285b4cf5d65fb3893d99a5cf18`. This is the fourth and final round permitted for this visual update. Critic output is this Markdown report only; no implementation, assets, tests, or capture scripts were written.

**Overall: 7.5/10. Final gate: FAIL.** No concrete visual or runtime defect is identified in this bounded final review. The terrain remains opaque, grass appears rooted, and the earlier felling mismatch remains fixed. The softer ground palette and clearer geological cavities are useful refinements, but the overall image remains good indie quality below the fixed 8.5 AAA threshold. The four-round review loop ends here with that outcome; this is not a conditional pass.

## Changes and visual result since round 03

The candidate softens turf/soil transitions, reduces the yellow cast of the ground, and uses terrain-curvature information to darken geological cavities while retaining an opaque terrain material. I reviewed the actual result through fresh images at the same seven fixtures as prior rounds.

The meadow's mottling is less conspicuous and the palette sits more comfortably with the trees. The low mountain-silhouette view shows clearer dark recesses between buttresses. Those changes improve the existing forms. They do not substantially change the remaining repeated grass distribution, coarse near-tree crowns, broad common mineral treatment, or uniform river reaches. The overall score therefore remains 7.5 rather than increasing simply because another iteration was completed.

## Fresh evidence and conditions

I invoked the existing `tests/alpha-environment-capture.mjs` twice and inspected 15 fresh normal-HUD screenshots, including two four-frame motion sequences. All requests remained local to `http://127.0.0.1:4188`; no installation or upload occurred. The GPU slot was released after both browser sessions had closed.

Conditions: desktop Chrome, RTX 4070 Ti SUPER via ANGLE/D3D11, 1440×960 viewport, high quality, day lighting, normal City view and full HUD, camera zoom 48–142 and pitch 0.18–0.57. No spatial-cell override was used. As in the prior reviews, the existing harness sets a steady camera internally while the footer retains its default cinematic label, and the captures use actual unpaused game state.

Comparative views:

- [Close woodland and ground](../artifacts/critic-round-04/alpha1/grass-woodland-near.png)
- [Near ground around crawler](../artifacts/critic-round-04/alpha1/river-near-bank.png)
- [Low panorama](../artifacts/critic-round-04/alpha1/ridge-low-panorama.png)
- [Wide valley and river](../artifacts/critic-round-04/alpha1/valley-hud-wide.png)
- [Reverse woodland](../artifacts/critic-round-04/alpha1/woodland-reverse.png)
- [River-bank detail](../artifacts/critic-round-04/alpha1/river-detail/river-bank-detail.png)
- [Low mountain silhouette](../artifacts/critic-round-04/alpha1/river-detail/ridge-silhouette.png)

Fresh felling sequence: [frame 0](../artifacts/critic-round-04/alpha1/review-motion-0.png), [frame 1](../artifacts/critic-round-04/alpha1/review-motion-1.png), [frame 2](../artifacts/critic-round-04/alpha1/review-motion-2.png), [frame 3](../artifacts/critic-round-04/alpha1/review-motion-3.png). The crawler moves through woodland and exposes fallen logs and cutout leafy branches. Neither the original opaque green oval crowns nor an obvious new felling mismatch appears. Grass roots remain visually seated through the sampled motion. Standing foliage changes pose without a visible detached crown/root anomaly in these samples.

Fresh river motion: [frame 0](../artifacts/critic-round-04/alpha1/river-detail/review-motion-0.png) and [frame 3](../artifacts/critic-round-04/alpha1/river-detail/review-motion-3.png). Carrier position and water detail change with simulation progress. The sampled frames show no newly missing water region, transparent ground patch, or vegetation cutout rectangle. They do not establish the absence of every subframe wind, aliasing, or sorting issue.

The [main browser report](../artifacts/critic-round-04/alpha1/report.json) and [river/horizon report](../artifacts/critic-round-04/alpha1/river-detail/report.json) both identify the reviewed commit, zero page/console errors, and zero remote requests. Asset-ready startup was 7175 ms and 7178 ms. Capture-only mode produced no timing runs. This review does not certify mobile, all faction variants, save migration, long-session resource behavior, or performance; separate technical QA should report its own evidence.

## Scores

| Category | Round 03 | Round 04 | Final assessment |
| --- | ---: | ---: | --- |
| Environment design and gameplay readability | 8.0 | 8.0 | Carrier, resource locations, river, and normal HUD remain clear. |
| Ground and grass | 7.0 | 7.1 | Gentler color/transition treatment; broad repeated turf and isolated similarly sized clumps remain apparent. |
| Standing trees and vegetation | 7.6 | 7.6 | Recognizable species and full silhouettes, but coarse leaf scale and regular evergreen branch shelves limit close views. |
| Water and bank integration | 7.4 | 7.4 | Coherent channel and stable motion; the shallow band and bank dressing remain too similar across reaches. |
| Mountains and distant terrain | 7.1 | 7.3 | Cavity shading clarifies buttresses; distinct rock faces, weathered shoulders, and accumulated debris remain underdeveloped. |
| Lighting and overall composition | 7.7 | 7.7 | Readable daylight and useful shadows; the palette refinement is modest at full-frame scale. |
| Motion and environmental integration | 7.9 | 7.9 | Prior felling correction holds; no sampled opacity, wind-root, or material continuity regression. |

Overall **7.5/10** is a holistic art-direction assessment. The fixed reference remains 5 = programmer art, 7 = good indie, and >=8.5 required to pass this gate.

## Concrete defect status

- **Round-01 D1 remains resolved.** Fresh actual felling captures retain cutout foliage and branch structure rather than the old opaque oval crowns.
- **New concrete visual defects: none established.** The ground appears opaque from all reviewed angles. No hard meadow texture seam, floating root line, obvious wind detachment, or broken foliage transparency was found in the samples.
- **Runtime errors: zero captured** in the two independent final browser runs.

These are bounded observations, not a blanket claim that no defect exists anywhere in the game.

## Ranked remaining polish — not concrete bugs

1. **Ground/grass regional hierarchy.** Differentiate meadow masses, sheltered woodland litter, exposed bare soil, and damp bank at normal gameplay scale. Similar isolated sprigs and broad softly mottled ground still dominate several views. More fine noise or more copies of the same tuft would not address the main limitation.
2. **Near-tree crown and branch quality.** Reduce similarly sized angular leaf pieces and stacked evergreen platforms. More varied crown openings and less regular branch rhythms would improve the close woodland more than further palette adjustments alone.
3. **Geological material specificity.** The new cavity depth helps, but much of the mountain wall uses the same pale surface language. Make exposed strata, recessed weathering, shoulders, and foot-of-slope deposits visibly distinct while preserving traversal and location anchors.
4. **River reach variation.** Vary bank deposits, stone/reed clusters, shallow widths, and concentrated surface disturbance according to bends and obstructions. The channel still reads as a relatively uniform ribbon at the normal bank view.

## Final disposition

Four independent rounds are complete: **7.1 → 7.4 → 7.5 → 7.5**. The concrete felling defect was corrected and the environment improved, but **the requested >=8.5 visual gate was not achieved**. Stop this visual review loop under the owner's four-round rule. Preserve the failed result and ranked remaining polish in the handoff; do not describe this build as AAA-approved or art-gate-passed. Final technical QA and packaging can report their own outcomes separately from this aesthetic decision.
