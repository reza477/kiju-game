# Representative crawler and bridge pass — independent review 01

**Verdict: useful visible improvement; overall 7.0/10; the 8.5 AAA gate fails. Stop here for the owner's judgment.**

This is the single representative review requested for the polished PS3-era artistic direction. It does not authorize another revision, additional factions, a renderer replacement, or a wider environment pass. The owner's latest one-pass stop instruction takes precedence over the usual four-round loop.

## Revision and scope

- Reviewed product revision: `2cc681645b72cb7688c62224a9dace28ba69bc89` on `codex/representative-crawler-20260909-215457`.
- Comparison checkpoint: `75a5056d86e0d0fc8cb820694bbcc29e87be6e92`.
- First review of this representative attempt. Changes are recessed rounded chassis casings, six broad spokes, recessed dark wheel faces, steel rims, smaller bronze caps, end-wheel drive flanges, and fractured masonry for the two existing collapsed highway abutments.
- Source inspection confirms the standard crawler branch owns the running-gear changes. Existing track placement and motion, upper city, attachment/support data, other variants, renderer, lighting and gameplay remain outside the product diff. The bridge changes replace the existing pair at the same crossing.
- The builder reported later runner/report safeguards. These do not change the reviewed product or the already-running critic capture.

I wrote no implementation, asset, test or capture code. I executed the existing `tests/representative-crawler-capture.mjs` after the builder released the GPU and independently inspected every resulting image. Builder before images were used only to compare the visual change; they are not this review's fresh evidence.

## Independent evidence

All fresh captures and detailed results are in `artifacts/critic-round-01/representative-crawler/`:

| Evidence | What I inspected |
| --- | --- |
| `normal-city.png` | Default City camera, zoom 76, pitch 0.6, full gameplay HUD |
| `reverse-city.png` | Opposite orbit at the same zoom; wheel faces and both bridge approaches |
| `moving-a.png`, `moving-b.png` | Real keyboard travel through the production main loop, normal camera and HUD |
| `close-city.png` | Player-accessible close orbit, zoom 55, pitch 0.42 |
| `close-motion-1.png` through `close-motion-6.png` | Six successive motion samples at 0.25 simulated-second intervals; turning, translating body, changing spoke orientations, static tread arrangement and foreground foliage occlusion |
| `wide-city.png` | Zoom 112; readability at a broader tactical distance |
| `report.json` | Three 240-frame motion measurements, image positions/times, browser errors, network checks, isolated save and reload |

The production main loop ran with fixed 1/60-second simulation timestamps scheduled through native RAF and actual keyboard inputs. Animation judgment is from the successive captured frames and source inspection, not a continuous real-time video. The resource bar, city status, minimap, view selector and build controls remain visible; the harness hides only the pause banner and transient toast for screenshots.

## Scores and artistic judgment

The fixed scale is unchanged: 5 = programmer art, 7 = good indie, above 8.5 = AAA. A PS3-era target describes the desired art, not a lower pass threshold.

| Assessment | Score |
| --- | ---: |
| Scoped asset craft and integration | 7.3/10 |
| Aesthetics in the observed gameplay scene | 7.0/10 |
| Game design/readability in the inspected flow | 7.0/10 |
| Overall observed presentation | **7.0/10** |

The new wheel faces have a clearer mechanical hierarchy. The smaller caps and dark recesses make the spokes read as substantial cast parts. The rounded lower housing removes the conspicuous rectangular ends visible in the checkpoint. These gains survive the reverse normal camera and the wide view; they are strongest in the close motion sequence.

The bridge is a successful small environmental improvement. The broken lip, incomplete parapets and split coping communicate a collapsed crossing at normal distance. Its grounded mass fits the existing stone palette and existing sunlight. The two sides remain legible as one crossing.

The scoped result is a credible move toward authored PS3-era strategy-game assets. It is still short of a polished centerpiece. The running gear retains an evenly repeated, freshly manufactured appearance, with little material storytelling at the bearings, rims or contact band. The fracture contours are readable, but the masonry surfaces and similarly shaped halves make the failure feel assembled. The unchanged surrounding city and terrain also limit the overall impression; this narrow pass does not establish whole-game PS3 or AAA quality.

## Concrete defects, ranked

**No newly introduced scoped geometry defect was identified in these views. Two inherited defects remain visible in the actual gameplay presentation:**

1. **P2 — The tread belt does not circulate while the wheels turn.** In `close-motion-1.png` through `close-motion-6.png`, spoke orientations change as the vehicle travels, while the distinctive tread grouping at the ends remains fixed to the chassis. `src/carriers.js:38` creates the links on the static frame; `src/carriers.js:153` animates the wheel spinners. This unchanged animation breaks the mechanical motion of a tracked vehicle. It is inherited from the checkpoint and was outside this pass's authorized animation changes.
2. **P2 — Keyboard movement leaves the HUD saying “At anchor · Awaiting your orders.”** The text remains visible in both normal moving captures and all six close motion captures despite changing world position and `moving: true`. `src/main.js:65` chooses the travel message from `s.target`, with no keyboard-movement branch. That file is unchanged from the checkpoint. This is an existing gameplay-feedback error, not a runtime exception caused by the art pass.

These findings are reported for the owner's judgment. They are not requests to expand or continue implementation now.

## Ranked polish opportunities, separate from defects

1. Give the scoped running gear a stronger hierarchy of wear and material response: cast body, machined contact surfaces, and recessed grease/dirt should be distinguishable at the normal orbit. The present uniform grey rings remain somewhat decorative.
2. Give the two abutments more distinct failure patterns and structural wear within their existing footprints. The broken silhouette is effective; finer evidence of how each side failed is less convincing.
3. Improve the presentation of the scoped detail from the usual play camera if a later pass is authorized. At default high pitch the hull hides most of the wheels; at the reverse close orbit a foreground tree obscures several wheels. The wider view preserves the design but compresses much of the new craft into a small band.

## Runtime evidence and limits

The independent harness completed 12 captures and all three 240-frame travel runs. There were **zero captured page/console errors, zero remote requests, zero disjoint timing samples and zero context losses**. The actual Save/Continue flow restored the sampled position, variant and building data in an isolated browser profile. The user's existing browser save was not touched.

Observed run medians were 11.1–13.5 ms for the main-loop CPU measurement and 5.12–5.60 ms for GPU time; main-loop p95 was 17.9–22.8 ms. These are headless Chrome 152 measurements on an RTX 4070 Ti SUPER at a 1440×960 viewport and 1800×1200 drawing buffer. They are not foreground FPS, minimum-hardware or PS3-hardware guarantees. The builder's separate matched comparison is supplementary evidence, not my art score.

This review covers the selected crawler, crossing, day lighting, three zoom levels, sampled keyboard movement and save/reload. It does not certify battle, progression balance, other factions, all terrain, night lighting, audio, mobile or long-session stability. No holes, detached new parts, inverted visible faces or obvious new contact penetration were identified in the inspected sample; that is a bounded observation.

**Final gate result: FAIL — 7.0/10 overall, with two inherited concrete presentation defects. The representative attempt is complete and should remain stopped for the owner to accept, reject or redirect.**
