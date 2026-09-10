# Representative crawler visual pass

One local pass, September 9, 2026. [Play the existing game](http://127.0.0.1:4178/). The changed carrier is **Commonwealth → Armored crawler**.

The original project was inspected before editing: it renders real 3D geometry with a vendored Three.js 0.185.1 WebGL renderer and perspective gameplay camera. Carrier models are generated in code. Existing local PBR surface maps, HDR environment lighting, shadows and presentation effects already support this direction. Simulation, controls and browser saves live separately in `simulation.js` and `main.js`. This pass uses that existing technology and those existing assets.

## Before and after

These are the same City gameplay camera and the same three-district crawler beside the existing river crossing. The reverse view is a normal player-accessible orbit, with the HUD present. Only the pause banner and transient toast were hidden during screenshots. Click an image to inspect it at full size.

| Before | After |
| --- | --- |
| ![Before: reverse City view](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/before/reverse-city.png>) | ![After: reverse City view](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/after/reverse-city.png>) |

| Matching camera | Before | After |
| --- | --- | --- |
| Default City view | [Original](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/before/normal-city.png>) | [Updated](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/after/normal-city.png>) |
| Moving, first position | [Original](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/before/moving-a.png>) | [Updated](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/after/moving-a.png>) |
| Moving, second position | [Original](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/before/moving-b.png>) | [Updated](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/after/moving-b.png>) |

The crawler has rounded, recessed track housings in place of the square end blocks; broad cast wheel spokes, recessed webs, machined rims, smaller bronze bearings and visible end sprockets. Painted armor, rough cast iron and exposed metal use distinct material responses. Existing sunlight and shadows reveal the shaped parts. The upper city, weapons, tread links and contact geometry retain their previous dimensions.

The two existing bridge abutments now have split slabs, broken parapets, fractured ends and supported fallen masonry within their previous footprint. Three material draws replace eight separate box draws. Terrain and the rest of the environment are unchanged. No new lighting, bloom, fog, renderer or external assets were added.

## Motion and performance

Both builds used Headless Chrome 152 on this PC's **RTX 4070 Ti SUPER**, a 1440 × 960 viewport, 1800 × 1200 drawing buffer, High detail, day lighting, cinematic camera mode, City zoom 76, pitch 0.6 and yaw 0.72. Three 240-frame keyboard-travel samples per build followed 120 warm-up frames each. Screenshots were taken outside timed samples. All 720 GPU measurements per build were valid, with zero disjoint events or context loss.

| Measurement | Before | After |
| --- | ---: | ---: |
| Median frame interval | 10.00 ms | 10.00 ms |
| Median CPU work in the actual main loop | 10.80 ms | 10.80 ms |
| Median GPU time | 5.25 ms | 4.96 ms |
| Median of each run's 95th-percentile frame interval | 20.00 ms | 20.00 ms |

Values above are medians across the three run medians. CPU run medians were 10.5 / 10.8 / 11.0 ms before and 12.5 / 10.7 / 10.8 ms after. GPU run medians were 4.92 / 5.42 / 5.25 ms before and 5.11 / 4.96 / 4.90 ms after. The small GPU difference overlaps run variation; it is not a demonstrated speedup. No median frame-scheduling slowdown was observed.

The controlled benchmark dispatched the **actual game main loop**, simulation, rendering and real keyboard controls through native animation frames, with fixed 1/60-second simulation timestamps so both builds traversed the same 34-metre path. This is an actual moving-game comparison, not a compilation check or a foreground FPS guarantee. A separate normal-clock browser test exercised real gameplay without that timestamp control. No physical iPhone, other GPU, long-session soak, or foreground-browser FPS test was performed; the mobile check was a 390-pixel browser layout check only.

[Full comparison data](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/comparison.json>) · [Before run](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/before/report.json>) · [After run](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/representative-crawler/after/report.json>)

## Preservation checks

- All 71 existing automated tests passed. The normal-clock browser smoke test passed 13 checks, including construction, travel/gathering, battle, withdrawal, pause, save/reload and mobile-width layout.
- The matching-view check confirmed identical camera positions, aim points, carrier positions, headings and simulation times within 0.000001 for all four before/after views and all three motion paths.
- Geometry comparison against the checkpoint confirmed that the other five carrier variants remain unchanged. All 552 crawler support samples, deck/plot/weapon anchors and 14 wheel movement parameters remain unchanged. New running gear stays inside the previous envelope; all 9,384 inspected new triangles and 24,648 normals are valid.
- Environment comparison retained all 1,665 destruction IDs, six resource locations, 16,641 sampled terrain heights, 913 saved tree roots and 68 vegetation/scenery placement batches. New bridge geometry has valid faces and normals and stays within the original envelope.
- Browser checks recorded no page/console exceptions, remote requests or lost graphics contexts. Save/reload tests used fresh isolated browser profiles; the user's existing browser save was not edited.

## Independent visual review

The separate critic inspected 12 of its own fresh HUD captures at three zoom levels, including successive motion frames. It scored the observed presentation **7.0/10**, with **7.3/10 for the scoped asset craft**. The fixed 8.5 AAA gate failed; the review describes progress toward the PS3-era target, with further polish still needed. See [the independent review](</C:/Users/user/Documents/ChatGPT/Kiju Game/art-reviews/representative-crawler-01.md>) for its unchanged findings and evidence.

No newly introduced scoped geometry defect was identified. Two inherited defects remain: the tread belt stays fixed while the wheels rotate, and keyboard travel incorrectly leaves the HUD saying “At anchor.” The critic separately ranked stronger material/wear hierarchy, more distinct bridge failure patterns and normal-camera visibility as polish opportunities. These are recorded rather than expanded into another implementation round. This update stops here for the owner's judgment.

## Local checkpoint and scope

Before changing source, the clean original revision `75a5056d86e0d0fc8cb820694bbcc29e87be6e92` was preserved as tag `checkpoint/representative-20260909-215457` and a verified complete Git bundle at [the local checkpoint](</C:/Users/user/Documents/ChatGPT/Kiju Game/artifacts/checkpoints/20260909-215457-before-representative.bundle>).

The product pass is local commit `2cc681645b72cb7688c62224a9dace28ba69bc89`, on `codex/representative-crawler-20260909-215457`. Later documentation and runner safeguards do not change the game. To revisit the preserved original on a clean working tree, use `git switch --detach checkpoint/representative-20260909-215457`; return with `git switch codex/representative-crawler-20260909-215457`. Both versions remain local, and switching source does not erase browser saves.

Only four product files changed: `src/carriers.js`, `src/crawler-study.js`, `src/landscape.js` and `src/bridge-study.js`. No software was installed, external asset service used, project published or pushed, engine/editor migration performed, or Website workspace modified. Gothic vertical construction and the cyborg's half-height castle backpack are preserved.
