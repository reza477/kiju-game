# Residual portrait stutter and first-input response

Completed technical implementation follow-up, 2026-10-03. Local only. The source remains frozen at the recorded fingerprint.

## Source and scope

- Baseline: `e3a0c1536acf18ac8989255e4c27d2810333631b`, the actual completed first-use repair, in the unchanged `first-use-rendering` worktree. Earlier archives and pre-e3 performance numbers are not this comparison's A build.
- Candidate: isolated managed `residual-stutter` worktree, branch `codex/residual-stutter-20261003`. The final local commit is identified by the handoff's identity header and committed diff.
- Frozen runtime/assets/dependency fingerprint: `1800758d8fb1c1a50b84ebf8f6f06c8b3f0876a97d49c7f37644b442448c8e49`; baseline: `967a7f548a97118eddf2db49c01363e1e71bb4dfa1c8d56450a8799aec685e6f`.
- Preserve existing environment/foliage work, previous repair, other worktrees' uncommitted instructions/reports, and the separate Website workspace. Test storage is fresh and isolated; no personal save is read.
- No gameplay, models, textures, shaders, lighting, preset, input, simulation, camera or saved-data change. No renderer/dependency upgrade, install, account action, push, merge, deployment or readiness override.

## Portrait cause and narrow repair

A fresh ordinary foreground baseline reproduction retained a 231.9 ms main callback on the first held-left 60-metre route. The actual profile is 390x844 CSS, device DPR 2, real touch-control input, Performance preset, and 331x717 drawing buffer.

The separate detailed baseline trace identifies frame 685 at x=-71.5392, z=76.4327. Its callback spans 28275.8–28511.1 ms (235.3 ms). The `Resource site metal` draw spans 28284.0–28509.8 ms (225.8 ms); nested `getProgramInfoLog` spans 28284.8–28509.2 ms (224.4 ms). These nested intervals must not be added together.

The stack is `getProgramInfoLog → onFirstUse → WebGLProgram.getUniforms → setProgram → renderBufferDirect → renderObject/renderObjects/renderScene → renderer.render → Presentation.render → GameScene.update → main.frame`. The CPU trace places 148 of 156 aligned samples in that chain; the browser task/RAF timeline corroborates the same long frame.

This is the eighteen-instance metal batch in The Broken Meridian. It contributes 216 triangles. Its material already retained program 29/GL88 for the earlier environment map's CubeUV height 512; its late portrait visibility first requires program 81/GL244 for the final environment's height 1024. The shader key remains `neutral-plate-reflectance-v1:world-metric-scenery-v3`. Performance shadows are off. This is a different owner from the prior stump/bough stall, and the GPU timer's low interval does not exclude this synchronous driver wait.

`src/scene.js` now borrows one existing instanced metal mesh from the current resource sites into the existing bounded preparation list. Both iron sites share the exact physical material and shader-relevant attributes; instance count and transforms remain their own data. The list holds the original two persistent debris pools plus one current metal batch. It creates no mesh, clone, draw, hidden movement, wait or texture upload. The existing helper submits against the actual camera, lights and output target after an ordinary frame and final environment readiness. A material identity suffix handles an absent-to-present configuration without redoing ordinary Continue preparation.

Before `setGame` disposes resource-site owners, it drops the borrowed site reference. It then borrows the new current representative into the same bounded array. The prior e3 shared-material ownership and disposal repair remains unchanged. Context restoration and quality changes use the current live objects; no history of old scenes is cached. `src/movement-preparation.js` has a descriptive comment change only.

In the matched candidate diagnostic, the same first-visible metal draw's driver check is 0.4 ms and direct draw 0.8 ms. The final-environment program is already retained. Diagnostic preparation submission is 3.9 ms versus 2.7 ms baseline, one attempt each; program submission is not itself a readiness guarantee. The low-overhead candidate reproduction peaks at 17.7 ms on the first route, and none of its four routes has a callback above 50 ms. Final paired results below supersede these single-visit measurements for benefit claims.

## Desktop first-input investigation

The GPU-query-disabled low-overhead baseline reproduces a 96.1 ms response proxy and 110 ms RAF gap despite a 16.1 ms maximum game callback. Thus timer queries do not explain this event.

In the separate light diagnostic, the key arrives at 23359.2 ms; the production `main.js:123` handler runs 23359.3–23359.4 ms (0.1 ms). The next main callback runs 23440.6–23454.0 ms (13.4 ms), giving a 94.8 ms event-to-changed-state-completion proxy. No recorded page callback occupies the 81.2 ms handler-to-RAF gap, all 54 aligned CPU samples are idle, and renderer-thread tasks are individually below 0.2 ms. GPU-process tasks overlap the gap, including a 24.717 ms task ending immediately before RAF resumes. These are browser-process wall spans, not measured hardware GPU execution and not proof of a specific shader/resource owner.

The direct-CDP control sends the pinned Playwright implementation's exact printable-key payload (`keyDown`, not `rawKeyDown`) without its keyboard wrapper. It reproduces a 105.9 ms response: input at 23077.5 ms, production handler 23077.7–23077.8, next main callback 23169.7–23183.4. Its 91.9 ms handler-to-frame gap has no page callbacks; 60 CPU samples are idle and two are program samples. The browser GPU scheduler's `RunNextTask` spans 23139.448–23169.428 ms; compositor acknowledgement is at 23169.484, `ScheduledActionSendBeginMainFrame` at 23169.487, `BeginMainFrame` at 23169.509, then RAF. Frame dispatch to the renderer therefore takes only about 0.021 ms once the compositor sends it.

This establishes the observed owner boundary as browser/compositor frame scheduling before main-frame delivery, with queued GPU-process work and acknowledgement, rather than the production key handler or Playwright's keyboard wrapper. The specific GL resource or driver cause behind that queued work remains unproven. The delay remains unresolved; no production input change or claimed harness speedup is justified. No input semantics or final timing harness was changed. Physical input-to-photon latency is not measured.

## Verification and final measurements

All final checks use the frozen runtime after the last runtime edit:

| Check | Result |
|---|---|
| Complete unit suite | 236/236, exit 0; includes nine ownership/preparation tests, two new in this task |
| Carrier matrix | 54/54 across all six carriers and existing qualities/lights; exit 0 |
| Interaction/save smoke | 13/13 including construction, travel, battle, save/reload/Continue, pause and mobile layout; exit 0 |
| Production comparison against e3a0c15 | Exact preserved anchors, canonical geometry/materials, terrain, resources, game snapshots, saved destruction, wind, LOD and instance colours; exit 0 |
| Ownership/preparation lifecycle | Nine check groups, 35 snapshots; repeated Continue, quality/carrier changes, context loss/restoration, and real viewport rotation; exit 0 |

The lifecycle test keeps the exact two persistent pools and a bounded third current resource-site mesh. Old site meshes/geometries are released exactly once; the shared material is not disposed or mutated. Continue retains compatible program identities without additional preparation. Forced context restoration preserves paused state and saved bytes, rebuilds program identities and triggers one preparation retry. Link-status queries occur only after functional recovery or completed motion windows, with their query costs recorded; they are not ordinary timing evidence.

Real phone-emulated viewport resize goes 390x844 → 844x390 → 390x844 at device DPR 2, preserving Performance preference, render DPR 0.85, buffers 331x717 / 717x331, target identities, finite projection, saved bytes and paused state. It adds no preparation attempt. Resize-handler wall times are 1.5 and 1.4 ms. Paused resize callback maxima are 12.5 and 9.3 ms; first post-resize touch-route maxima are 13.3 and 11.5 ms, with RAF maxima 20.0 and 10.2 ms and response proxies 10.6 and 10.7 ms. None of these windows contains a callback or RAF gap above 50 ms. These are separate lifecycle diagnostics after 24 paused native frames, not immediate input during rotation or the final cold-start benchmark.

No new browser error, failed request or remote request occurred in those checks. Existing D3D X4122 precision warnings remain recorded and unsuppressed. The smoke suite's established simulation-advance/fixture checks are functional evidence only; ordinary motion timings below use unchanged native production frames and actual held controls.

### Final ordinary-path performance

All eighteen visits completed, exit 0: three sequential A/B pairs per profile, four routes per visit, 72 routes total. A is e3a0c15; B matches the frozen fingerprint throughout. Each fresh foreground Chrome process uses ordinary crawler/standard selection and Begin, a native held-left 60-metre route, an opposite warmed return, actual Save/reload/Continue and both routes again. No fixture reset, extra precompile, hidden travel, startup wait, changed RAF timestamp or simulation advance enters this benchmark. The timing harness itself is unchanged from e3a0c15. Native positions/time and each visit's Continue save are allowed to differ and their deltas remain in the evidence.

Hardware/browser: Windows Chrome 154.0.8037.95, NVIDIA RTX 4070 Ti SUPER, ANGLE D3D11, pinned Three 0.185.1 and Playwright 1.62.1. Desktop is 1440x960 CSS, device DPR 1, High preset, renderer DPR 1.25 and 1800x1200 buffer. Portrait is 390x844 CSS and landscape 844x390, both device DPR 2, Performance, renderer DPR 0.85 and buffers 331x717 / 717x331. All nine pairs verify matching browser/backend, controls, lighting, quality and actual buffers. Phone measurements are emulation on this Windows GPU.

First Begin route, three visit maxima in pair order (milliseconds):

| Profile | A callback maxima | B callback maxima | A native RAF maxima | B native RAF maxima |
|---|---|---|---|---|
| Desktop | 17.0 / 20.5 / 17.1 | 17.5 / 18.0 / 16.7 | 90.1 / 120.0 / 110.0 | 99.9 / 100.0 / 109.9 |
| Portrait | 229.5 / 224.9 / 232.8 | 19.0 / 18.5 / 17.4 | 220.0 / 220.0 / 230.0 | 10.1 / 10.1 / 10.2 |
| Landscape | 17.5 / 16.9 / 17.4 | 18.8 / 17.7 / 18.0 | 10.2 / 10.2 / 10.2 | 10.2 / 10.2 / 10.2 |

The portrait first-use stall disappears on all three candidate visits under these conditions. A has one callback and one RAF interval above both 50 and 100 ms in every portrait first route; B has none. First-route callback median/p95 remain about 8.1–8.2 / 9.0–9.2 ms for B versus 8.1–8.3 / 8.9–9.2 ms for A: this is removal of a first-use outlier, not a general FPS improvement. Its first-route available GPU median/p95/max range is B 1.729–3.118 / 9.801–9.875 / 12.799–13.839 ms versus A 2.374–2.652 / 9.851–9.899 / 11.087–18.052 ms. GPU intervals are not synchronous driver-wait duration.

The candidate's remaining route callback-maximum ranges are:

| Profile | Begin warmed return | Continue first | Continue warmed return |
|---|---|---|---|
| Desktop | 12.1–13.2 | 11.9–24.5 | 12.7–23.8 |
| Portrait | 11.1–11.8 | 20.7–21.3 | 9.8–10.2 |
| Landscape | 11.4–12.3 | 10.6–16.4 | 10.1–11.4 |

No candidate route has a callback above 50 ms or 100 ms. All candidate phone RAF intervals remain at or below 20.1 ms; desktop's three first-input gaps remain, with one above 100 ms and all three above 50 ms. Desktop warmed/Continue RAF maxima reach 30.0 ms. Desktop B2/B3 retain the less favorable 24.5/23.8 ms callback peaks rather than being retried or omitted. Every per-visit callback, RAF and available GPU median/p95/max, sample count and >50/>100 count appears in `17_PERFORMANCE.txt`, along with all startup and route metadata.

Desktop first-input response is A 84.7 / 104.3 / 98.5 ms and B 87.5 / 89.8 / 97.6 ms. These small mixed differences do not establish a repair; the separate compositor-delivery delay remains. Portrait response is A 9.4–10.1 ms, B 9.5–9.9 ms; landscape A 9.3–10.1, B 9.4–10.4. Input observer cost is 0–0.3 ms across all 72 routes. Response means event capture to first changed-state callback completion, not physical display latency. Scene callback sampling is disabled in the low-overhead harness; its missing values are labelled, with detailed scene/render attribution kept in separate diagnostic traces.

Available GPU query accounting across the twelve routes per build/profile: desktop A 7857/7857 frame samples, B 7921/7921; portrait A 8419 completed plus 28 missing, B 8439 plus 30 missing; landscape A 8426 plus 44 missing, B 8425 plus 43 missing. All missing samples were skipped while the existing pending-query limit was reached. No queries were discarded for disjoint status or after draining, and none were skipped because another query was busy. The separate disjoint-event count was not exported by the unchanged harness; a disjoint observation with no pending query therefore cannot be ruled out. Missing frames are not assigned zero time. Available GPU maxima across all routes are desktop A/B 10.951/11.506 ms, portrait 18.052/14.020, landscape 20.122/19.770. This incomplete GPU sample set does not certify every frame or exclude driver waits.

### Preparation and loading guardrail

The program cost is submitted earlier through the existing production preparation point; it is not free work. On portrait first Begin routes, preparation submission is A 3.0 / 2.7 / 4.2 ms and B 3.8 / 5.8 / 3.5 ms. After reload/Continue it is A 3.2 / 2.2 / 2.2 and B 3.2 / 3.2 / 3.8 ms. Each renderer records one preparation attempt, unchanged across its two ordinary routes. No candidate preparation error occurred. Startup shader/program and geometry/texture counts before and after every route remain in the handoff; the repair allocates no extra asset/instance buffers. This does not imply that all existing game memory or later shader combinations have been optimized.

Navigation and reload-to-UI-ready remain slow. Ranges over three visits, milliseconds:

| Profile | Navigation A → B | Reload A → B | Begin click to first gameplay frame A → B | Continue click to first gameplay frame A → B |
|---|---|---|---|---|
| Desktop | 19504–19984 → 19552–19989 | 7149–7430 → 7138–7283 | 919.6–933.9 → 925.3–934.0 | 923.1–973.1 → 924.7–987.7 |
| Portrait | 16710–17453 → 16786–17813 | 6811–6912 → 6851–7780 | 915.8–925.9 → 910.1–927.9 | 914.1–923.2 → 903.0–921.7 |
| Landscape | 19202–19606 → 19554–19683 | 7075–7527 → 7086–7124 | 904.6–921.9 → 912.1–927.6 | 951.7–961.0 → 946.6–972.4 |

Unfavorable examples are retained: portrait B3 navigation is 1096 ms slower than A3, and B2 reload is 890 ms slower than A2. Landscape navigation is 77–352 ms slower in all three B visits. Desktop and other stages have mixed differences. Three pairs with uncontrolled driver/OS caches and machine activity cannot isolate those loading differences to this small change; no loading improvement is claimed and their causes remain unestablished. Initial loading and Begin/Continue work still contain substantial stalls. This task removes the demonstrated portrait movement wait without hiding those earlier costs or starting a loading rewrite.

All eighteen reports retain zero page/runtime errors, remote requests and failed requests, and two existing X4122 precision-warning entries each. Every final run is retained; none was retried. Detailed CPU/GL/timeline diagnostics, the GPU-disabled desktop control and the direct-CDP control are separate from these timing samples. Sampling counts are not exclusive CPU durations, and cross-protocol timestamp alignment has a small unbounded marker-read offset. No causal claim rests on adding nested spans or comparing unrelated maxima.

## Visual and release boundaries

Five fresh before/after pairs use this task's actual A and B source, the same paused normal gameplay cameras and HUD, original dimensions, and the existing fixture/capture tool. They demonstrate visual preservation, not animation timing or an art improvement. Exact metadata and all pixel differences are disclosed in the flat handoff.

Full RGB comparison, without alignment/cropping/tolerance filtering, finds 264 changed pixels in desktop City, 418 reverse, 290 close, 59 portrait and 640 landscape. The largest changed fraction is 0.048609% (landscape). Maximum channel changes are respectively 1, 19, 20, 1 and 20. The cause of these sparse differences is not established. The independent reviewer inspected all ten original images and found no discernible visual regression in the selected views. All ten files have distinct original byte hashes. Desktop PNGs are 1440x960; portrait/landscape PNGs are 780x1688 / 1688x780, separately distinguished from their CSS viewports and actual render buffers. Paused overlays obscure portions of the carrier; no all-frame or all-view visual guarantee follows.

Both closed material and foliage reviews remain **7.6/10 FAILED**. No new art score or review loop is opened. Private delivery remains **Configured but blocked**. Physical iPhone/iPad, Safari/WebKit, installation/update certification, thermal/battery behavior and long-session smoothness remain untested by this Windows rendering task.

The final handoff contains exactly ten PNGs and ten readable TXT files, including the manifest. Full raw traces, frames and diagnostic evidence remain outside it under `artifacts/residual/`. No ZIP or upload is produced.
