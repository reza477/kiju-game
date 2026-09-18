# Alpha1 environment — independent art review 02

Reviewed revision: `f357a25f6c40cdd53054f53d1d7336136eea6100` (2026-09-17). Previous review: [round 01](alpha1-01.md), revision `7a16564829f4114ac523b20bc598390e12cc2d7b`. Round 02 of at most four. The critic wrote only this review, and no implementation, assets, tests, or capture scripts.

**Overall: 7.4/10. Gate: FAIL.** The previous concrete felled-tree defect is resolved in the new gameplay captures, and no new concrete visual or runtime error is established. The environment improves modestly, especially in mountain shape and felling continuity. It remains good indie work below the fixed 8.5 AAA gate. Passing the defect condition does not compensate for failing the aesthetic threshold.

## Changes since round 01

The candidate changes felled-tree foliage to cutout leaf pieces with branch/log detail, adds short grass, revises ground shading, shapes mountain gullies and buttresses, changes pine branches, adjusts river edge treatment, and lowers daylight fill. I compared fresh captures at exactly the same seven viewpoints used in round 01.

Visible results: the opaque green oval fallen crowns are gone; the mountain wall has stronger secondary ridges and more broken contours; ground detail and shadow separation have increased. The added low grass is visible over much more of the frame, but its isolated, repeated clumps do not yet make a natural meadow layer. The river change is subtle at these normal camera distances.

## Fresh evidence and motion

I independently invoked the existing `tests/alpha-environment-capture.mjs` twice, with my round-01 fixtures, and inspected 15 newly generated screenshots. Requests were limited to the local game server `http://127.0.0.1:4188`; no installation or upload occurred. Both browser sessions closed before the GPU slot was released.

Conditions match round 01: desktop Chrome on the RTX 4070 Ti SUPER through ANGLE/D3D11, 1440×960, high quality, day lighting, normal City camera and full HUD; zoom 48–142 and pitch 0.18–0.57. The existing harness uses steady camera internally while the HUD footer retains its default cinematic label. Active captures use actual unpaused state.

Principal views:

- [Close woodland/ground](../artifacts/critic-round-02/alpha1/grass-woodland-near.png)
- [Near ground around crawler](../artifacts/critic-round-02/alpha1/river-near-bank.png)
- [Low panorama](../artifacts/critic-round-02/alpha1/ridge-low-panorama.png)
- [Wide valley/river](../artifacts/critic-round-02/alpha1/valley-hud-wide.png)
- [Reverse woodland](../artifacts/critic-round-02/alpha1/woodland-reverse.png)
- [River-bank detail](../artifacts/critic-round-02/alpha1/river-detail/river-bank-detail.png)
- [Low mountain silhouette](../artifacts/critic-round-02/alpha1/river-detail/ridge-silhouette.png)

Actual felling sequence: [frame 0](../artifacts/critic-round-02/alpha1/review-motion-0.png), [frame 1](../artifacts/critic-round-02/alpha1/review-motion-1.png), [frame 2](../artifacts/critic-round-02/alpha1/review-motion-2.png), [frame 3](../artifacts/critic-round-02/alpha1/review-motion-3.png). The simulation advances from time 12 to 14 seconds and the carrier from (-84,22) to approximately (-67.72,26.89), matching the first review. Trees become logs and cutout leafy branches beside and behind the carrier; the previously conspicuous opaque green ovals are absent. Wildlife also changes position.

River sequence: [frame 0](../artifacts/critic-round-02/alpha1/river-detail/review-motion-0.png), [frame 3](../artifacts/critic-round-02/alpha1/river-detail/review-motion-3.png). Water detail changes with advancing time and the carrier moves along the bank. Across the close woodland, near-ground, bank, and sampled motion images, the new grass appears seated on the terrain: no visible detached root line, floating horizontal sheet, or newly introduced gap was found. This is a visual sample, not a numerical guarantee about every grass instance or every animation frame.

The [main report](../artifacts/critic-round-02/alpha1/report.json) and [supplemental report](../artifacts/critic-round-02/alpha1/river-detail/report.json) both record the reviewed commit, zero page/console errors, and zero remote requests. Startup to loaded assets was 7038 ms and 7138 ms. Capture-only mode does not establish FPS or sustained memory behavior; builder performance/test claims are not substituted for independent visual evidence.

## Scores

| Category | Round 01 | Round 02 | Assessment |
| --- | ---: | ---: | --- |
| Environment design and gameplay readability | 8.0 | 8.0 | Carrier, resource labels, river, and HUD remain legible. |
| Ground and grass | 6.4 | 6.6 | Better coverage and visible relief, but the new dark sprigs read as repeated isolated stamps on broad smooth beige/green ground. |
| Standing trees and vegetation | 7.5 | 7.6 | Slightly less mechanical pine branching; near leaf shapes and branch shelves still repeat. |
| Water and bank integration | 7.3 | 7.4 | Coherent and stable, with restrained edge detail; channel bands remain uniform and weakly connected to bank features. |
| Mountains and distant terrain | 6.3 | 7.0 | More convincing buttresses and gullies; broad slope surfaces still have a single pale mineral treatment and sparse, evenly isolated trees. |
| Lighting and overall composition | 7.5 | 7.7 | Stronger separation and useful foliage shadows without harming HUD readability. |
| Motion and environmental integration | 6.8 | 7.8 | Felling no longer switches to the old green-oval visual style; sampled grass roots remain seated. |

The overall 7.4 is a holistic judgment against the same standard, not a score selected to progress toward a required number.

## Concrete defects

- **Round-01 D1: resolved in the reviewed motion sequence.** Fallen vegetation now shares the standing foliage's cutout leaf language and includes visible branches. The remaining simplicity of its branching can be polished, but the originally reported green-oval discontinuity is no longer present.
- **New concrete visual/runtime defects: none established in this bounded review.** No floating grass roots were seen in the sampled images. No page or console errors were captured. This does not certify unreviewed device classes, save migration, all six variants, or long-session behavior.

## Ranked polish opportunities

1. **Integrate the grass into the terrain's material hierarchy.** In the wide valley, river-bank, and low-horizon views, the short grass is a high-contrast field of similarly sized, widely separated sprigs. Much of the exposed ground between them still reads as a smooth painted surface. Build coherent meadow masses with varied density and softer edge transitions into bare soil, rather than increasing the count of the same isolated motif. Retain readable open/trampled routes and distinguish woodland litter, dry soil, and wet bank. This is the largest remaining image-quality opportunity.
2. **Finish the geological hierarchy.** The new mountain ridges are a real improvement, but the same pale surface spans crests, walls, and bases. Give sharp exposed faces, recessed gullies, weathered shoulders, and foot-of-slope debris visibly different structure at the normal low camera. The strongest improvement would come from meaningful geological regions, not more uniform high-frequency noise.
3. **Reduce near-tree repetition.** The close and reverse woodland views show similarly scaled leaf pieces, highly regular pine branch layers, and large solid masses with few internal openings. Vary crown breakup and local leaf/branch scale while retaining species recognition. Fallen branches can gain complexity after the higher-impact ground work; the concrete mismatch is already fixed.
4. **Make river variation correspond to its surroundings.** The bank still reads as a long continuous shallow band, with edge dressing too evenly distributed. Create visibly different reaches at bends, exposed stones, shallows, and vegetated banks while preserving the river and crossing positions. The current reflection/highlight treatment works but is not yet a defining quality feature.

## Gate and next round

The zero-identified-defect condition is met for this bounded review. The overall score condition is not: **7.4 < 8.5**. Submit further scoped improvements for round 03 if continuing; there are at most two rounds left under the owner's rule. Keep the same comparative views and real felling evidence. Do not relabel ordinary polish as a new bug, and do not call this gate passed on the strength of clean technical tests.
