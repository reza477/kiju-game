# Alpha 1 verification

Version: `0.10.0-alpha.1`. Local build branch: `codex/alpha1-environment-20260917`. Reversible source checkpoint: `checkpoint/before-alpha1-20260917` at `aef1f02`. Final visual/runtime candidate: `b9fab3e`. Packaged build ID: `cb00d8cec12f2c169cf4`. The final local source is tagged `alpha-1`. At the time of this verification, the update had not been uploaded or published.

Repository maintenance note (24 September 2026): source commit `75503a5`, the existing `alpha-1` tag, and the prior checkpoint tags are now backed up to the private GitHub repository. This does not publish or host the game, and does not change the historical test results or independent art score below.

## Changes

- Locally generated cutout foliage replaces many small leaf polygons. Bowed, intersecting cards retain a three-dimensional crown, wind and matching cutout shadows. Grass and pine silhouettes retain coverage through their mipmaps.
- Stable scenery batches render in spatial cells, retaining original indices for saved destruction. Off-camera cells can be culled independently.
- Meadow, woodland soil and exposed mineral surfaces have distinct colour and detail. An original seamless meadow texture supplies blade/litter detail and micro-normal variation. Static ground relief gradients and geological cavity shading are baked once. The colour field uses the exact displayed terrain grid; terrain stays opaque.
- River flow follows the channel. Shallow deposits, broken current highlights and wind-driven ripples use the existing mesh; slowly varying channel parameters move to vertex interpolation.
- Outer ridges gain asymmetric crests, continuous talus slopes and connected gullies. The playable interior, resource clearings and terrain grid resolution stay unchanged.
- Balanced quality executes six ambient-occlusion taps; High retains twelve. Frozen wildlife poses avoid repeated matrix uploads.
- Save failures preserve the active expedition. Battle results retain their Return/Restart actions. Keyboard focus stays with form controls. District upgrades retain their existing hull, housing and production benefits until completion.

The existing browser renderer, controls, save key and six city variants remain. Gothic districts continue to stack vertically; the cyborg castle retains half-height storeys without shrinking its carrier.

## Functional checks completed

All runs use isolated test profiles and local files. Actual evidence is under ignored `artifacts/alpha1/`.

| Area | Evidence |
| --- | --- |
| Core rules and saves | 127 unit tests passed, including upgrade, foliage, culling, meadow and mountain regressions |
| Long simulation | All six variants won five-rival campaigns: 30 victories; six one-hour simulated idle runs retained valid local and portable saves |
| Desktop launcher | Seven checks passed, including unrelated-listener preservation and the GUI executable |
| Save/menu/keyboard regressions | Six browser checks passed |
| PC gameplay | Thirteen browser checks passed: building, travel, gathering, combat, withdrawal, saves and pause |
| Touch workflow | Thirteen checks passed: tablet, phone portrait/landscape, pinch, movement, menus, save transfer/rollback and feedback |
| Offline package | Eight checks passed: verified complete cache, Continue and touch movement with the server stopped and network disabled, missing-boot-module recovery, and complete repair preserving the save |
| Audio | Engine and eight UI checks passed; finite audible synthesis, muted silence and bounded voice/node counts |
| Destruction and tracks | Nineteen pool checks / 60,632 assertions passed, including all eight pools and saved damage restoration |
| Local serving | 22 read-only checks passed: game identity, headers, method/Host restrictions and private-path rejection |
| Combat contact | Sixteen melee scenarios and twelve ranged actions passed: real contact/muzzle anchors, impact timing and airborne-target behavior |
| Gothic weapon clearance | All 1,296 geometric cases passed: 206 allowed / 1,090 blocked, zero allowed barrel or curved-shot collisions; six live mounts verified, including compact cyborg cannon clearance and unchanged body-weapon scale |
| Rendering matrix | Final stable build passed matrix/camera checks in all 180 carrier/camera/lighting/quality combinations; full geometry scans covered six carriers, HDR/bloom samples covered 36 combinations and the soak's final frame; 18 HUD captures and no shader, texture-load or browser errors |
| Sustained live motion | After warming the same full route, a 30.022-second native-animation-frame run completed 2,671 frames / 30.021 simulation seconds with zero growth in scene geometry, uploaded geometry, textures or shader programs |
| Save/scenery identity | All 1,665 saved anchors and 70,285 original instance placements retained; all six resource transforms unchanged; all 79,005 current instance matrices restored exactly after damage; terrain contact, cavity opacity and cutout-shadow audits passed |

Final CPU evidence is in `artifacts/alpha1/final-b9fab3e-cpu/`. All 43 runtime files stayed hash-identical during that verification. New meadow detail has a separate visual batch, preserving original scenery identities. Species-specific fallen foliage retains the existing destruction save format.

Final browser evidence is in `artifacts/alpha1/final-qa/`, including render, contact, vertical weapons, mobile and offline reports. All 47 source hashes in the browser audit remained unchanged through the render/combat/touch runs; the final packaging step changed only the generated `src/build-info.js` as expected. Final suites reported zero browser errors and zero external requests.

The render report includes start/end source hashes and empty runtime patches. The motion check uses five seconds of settling, a complete 30-second route warmup, then 30 measured seconds of actual keyboard movement. Raw JavaScript heap increased by about 75.8 MB between samples; garbage collection was not forced. Stable geometry/texture/program counts do not establish long-session heap stability. The earlier test's shorter warmup was insufficient to account for lazy scenery uploads; its failed report is retained separately and is not counted as a pass.

## Matched graphics measurements

Baseline: `aef1f02`. Chrome on NVIDIA GeForce RTX 4070 Ti SUPER, 1440×960 browser viewport, browser DPR 1. High renders at 1800×1200; Performance at 1224×816. Same crawler, position, City camera, day lighting and movement input. Two 180-frame moving runs after 90 warm-up frames; no screenshots during timing. Real native animation-frame scheduling with fixed 1/60 simulation steps. GPU timer-query samples and JavaScript callback cost are recorded separately. These are desktop measurements, not physical iPad performance.

| Measurement | Before High | Alpha 1 High | Before Performance | Alpha 1 Performance |
| --- | ---: | ---: | ---: | ---: |
| Submitted triangles/frame | 11.37 million | 4.67 million | 5.71 million | 2.31 million |
| Draw calls/frame | 944–957 | 1,071–1,084 | 536 | 581 |
| CPU callback median, two runs | 10.8–11.1 ms | 10.9–11.5 ms | 9.2–10.1 ms | 9.7–9.8 ms |
| GPU elapsed median, two runs | 5.68–5.72 ms | 5.14–5.63 ms | 2.28–2.54 ms | 2.15–3.35 ms |
| Native frame interval median | 10 ms | 10 ms | 10 ms | 10 ms |
| Cold page startup, one sample | 11.04 s | 7.37 s | 10.93 s | 7.46 s |

Triangle submission fell about 59% in both modes, while startup in these samples fell about 32–33%. High GPU time improved modestly; CPU cost and the median frame interval were broadly unchanged. Performance-mode GPU samples were mixed, with one slower run, so no consistent GPU-time or frame-rate improvement is claimed for that preset. Spatial culling increases draw calls, and alpha-tested foliage/material shading still costs GPU time. Reduced polygons do not translate directly into the same percentage of FPS improvement. GPU p95 was 7.88–8.20 → 5.79–7.74 ms in High and 4.09–4.44 → 4.20–4.21 ms in Performance. These short runs do not establish long-session, thermal or mobile performance.

Before/after images and full timing conditions: `artifacts/alpha1/before-high/`, `after-high/`, `before-performance/` and `after-performance/`. The four camera positions and aim points match exactly between each before/after pair. [Interactive local comparison](artifacts/alpha1/comparison.html). Capture command: `node tests/alpha-environment-capture.mjs`, with `PHASE`, `QUALITY` and `OUTPUT_DIR` selecting the run. Baseline source is served directly from Git in memory; the current checkout is never replaced. All four benchmark sessions reported zero errors, remote requests, GPU timer disjoints or context losses. Browser/GPU suites ran serially.

## Independent visual gate and release status

Four independent rounds are complete: **7.1 → 7.4 → 7.5 → 7.5 / 10**. **Final art gate: FAIL**, below the required 8.5. The critic took 15 fresh normal-HUD screenshots per round, across viewpoints and zooms, including motion/felling sequences. Round 01's obsolete felled-tree crowns were fixed; the final review identified no concrete visual or runtime defect. The remaining ranked polish is ground/grass regional variety, near-tree crowns, geological material specificity, then river-bank variation. No fifth visual iteration was made. Functional test success and the Alpha 1 label do not imply AAA approval. See [the independent final review](art-reviews/alpha1-04.md).

The local offline package is `artifacts/mobile-release/cb00d8cec12f2c169cf4/`: 107 files, 105 precached files and 33,640,548 precached bytes. The PC working copy reports the same build ID. The normal desktop shortcut and verified `http://127.0.0.1:4178/` serve this game from this folder. The release has not been hosted; there is no remote iPad link yet.

Physical iPad/iPhone, Safari/WebKit on Apple hardware, touch latency, thermal throttling and Home Screen installation cannot be validated on this Windows machine. A complete QA pass here means the documented scope, not proof that every possible game state is defect-free. This is the first local Alpha 1 playtest build; the failed art gate and the limitations above remain visible for the next iteration.
