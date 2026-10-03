# First-use rendering and resource reuse

Local technical task only. The reviewed foliage runtime remains the starting point; this pass changes no art, gameplay, controls, simulation timing, saved schema, construction, collision, terrain, placement, or picking rules. Nothing was pushed, merged, deployed, or published. Both closed material and foliage reviews remain **7.6/10 FAILED**. Private delivery remains **Configured but blocked**.

## Source and preservation boundary

- Reviewed runtime: `b30d21de531a81d5d1123cfc77cf99755f67594c`, `codex/foliage-assets-20261002`.
- Isolated checkpoint: `5e150092f902a97578b18f32fad50e9bab52f2c9`, `codex/first-use-baseline-20261003`. It snapshots the current uncommitted reporting instructions and foliage report, including their existing contents, without changing their original worktree. Its runtime is byte-identical to b30d21d.
- Implementation: `codex/first-use-rendering-20261003`, under `C:\Users\user\.codex\worktrees\first-use-rendering\Kiju Game`.
- Frozen runtime/assets/dependency inventory SHA-256: `967a7f548a97118eddf2db49c01363e1e71bb4dfa1c8d56450a8799aec685e6f`.
- Screenshot inventory excludes the two package files: candidate `0de0efc0a123fab3165aef8e810e470ae186b70a6359c013dced8d6ec6e6584a`; reviewed baseline `8c6c9117dbea97850677c81718ee0d63e6aeac1853fd5c16702f4393d9f6b852`. These different fingerprints represent explicitly different inventories, not different runtime revisions.
- Main and foliage worktrees' original instruction/report modifications, prior ZIPs and flat handoff, Website workspace, dependencies, delivery readiness, accounts and billing were preserved. All browsers used fresh test-owned storage; no personal save was read.

## Demonstrated cause

The old 164.4/235.5/152.8 ms figures are historical fixture-reset leads. `environment-polish-capture.mjs` calls `__polishReset()/setGame()`, settles native frames, and uses compile/moving warmups for steady measurements. Its labels now explicitly say **fixture-reset diagnostic B**. Those figures are not ordinary startup evidence.

New foreground production tracing followed actual crawler selection, Begin, held-left movement, title and Continue. It did not reset the scene or move the camera/simulation to warm a route. The first 30 metres did not encounter a long rendering callback. Continuing into the first tree at about x=-56.78,z=63.49 exposed two dormant, already allocated instanced pools. That continuation is **first use of new effects**, despite the early trace's `warmed-next-movement` phase label. It must not be confused with the final benchmark's opposite return over already visited ground.

In the key-preserving baseline trace, frame 439 took 305.8 ms. `WebGL2RenderingContext.getProgramInfoLog` accounted for 150.3 ms on Crushed tree stumps and 136.6 ms on Crushed fallen boughs; their encompassing renderBufferDirect calls took 151.6 and 137.8 ms. The CPU sampling trace also records getProgramInfoLog. This is synchronous shader-program first-use waiting/inspection, not evidence that every old stall was shader compilation. Texture and buffer work was recorded separately and was not the dominant cost in this event.

The identities were recorded, not inferred from counts:

| Resource | Mesh UUID | Material UUID | Geometry UUID | Traced GL program identity |
|---|---|---|---|---|
| Crushed tree stumps | 5485a58c-f7ce-44bf-ac76-ed08d74ae3bc | bed8d339-aaaa-4a22-9229-69c864dd71ff | 3caa060a-ffd5-4aeb-b299-66bc6df815d0 | 321 |
| Crushed fallen boughs | d73d6883-edae-4663-ab16-433c5c44baf1 | 315b31bc-cb9e-477a-9fd6-c03559b76711 | f3320c8b-9f4b-48f6-95ff-cee496e0cedb | 324 |

A second production ownership defect was demonstrated: four ordinary scene transitions dispatched 48 dispose events onto three metric material identities still referenced by persistent scenery. Each transition then repeated three onBeforeCompile calls on those identities. The metric cache marked its borrowed clones unshared. Separately, site-owned foliage depth/distance materials were not disposed, and a strong UUID-keyed wind cache retained obsolete material sets. CPU production tests reproduced all three ownership failures before repair.

Raw detailed evidence remains under `artifacts/first-use/trace-baseline-final/` and `trace-candidate-attempt1/`, including CPU profiles, GL/resource identities and ordinary foreground captures. Earlier exploratory traces are retained; the earliest wrapper changed default program keys and is excluded from causal/timing conclusions. Detailed tracing has overhead and is not the low-overhead benchmark.

## Focused repair

1. The existing metric material cache now uses weak source-object keys and explicitly shared ownership. Removing a site cannot invalidate materials still used by the world.
2. Wind pass caching uses weak source-object keys. Shared wood shadow passes retain shared ownership; owned foliage visible/depth/distance materials are released once per group, including shared spatial-cell references. Shared artwork textures remain in their existing cache. Owned mutable foliage materials and instance buffers remain independent.
3. After an ordinary rendered frame and final environment readiness (or its existing error fallback), submit only the **two traced existing pool materials** using Three 0.185.1's public `renderer.compile(object,camera,targetScene)`. Use the actual production render target, camera and lights, then restore the prior target. No draw, texture warmup, new meshes, hidden travel, camera movement, simulation advancement, Begin delay or arbitrary wait is added.
4. One current configuration key covers quality, light and environment identity. Context restoration invalidates it; lost contexts skip submission. Preparation failures are logged and do not prevent ordinary Begin/Continue; retries require a real configuration/context change. No asynchronous poll can outlive a lost context.

Submission completion does not mean completed driver compilation. The method submits synchronously and can itself block. First rendering still owns geometry/texture uploads, shadow variants and uniform inspection. This is not whole-world precompilation. Carrier and resource-site reconstruction CPU costs remain unchanged. WeakMap garbage collection is nondeterministic; ownership/disposal tests do not measure total process-memory reclamation.

The candidate trace's corresponding newly reached effects route peaked at 17.6 ms, versus 305.8 ms baseline. Its recorded first stump program inspection was 0.5 ms; a fallen-bough shadow pass still took 4.3 ms. Shared-world dispose events fell 48→0. Repeated foreground comparisons below determine the practical benefit beyond that diagnostic.

## Final-source verification

The last runtime edit preceded all listed checks. Exact executable arguments, environment, UTC start/end, exit codes, start/end file inventories and logs are in `artifacts/first-use/executions/` and the flat handoff's `16_TEST_RESULTS.txt`.

| Check | Result |
|---|---|
| Existing unit suite plus focused additions |234/234 passed, exit 0 |
| Existing carrier matrix |54/54 cases; six variants, qualities/lights, selections and save/reload/Continue; exit 0 |
| Existing interaction/save smoke |13/13 checks, exit 0 |
| Production preservation vs b30d21d |Exact anchors, canonical geometry/materials, terrain, resources, games, saved destruction, wind and LOD data; exit 0 |
| Focused ownership/preparation unit checks |7/7 passed, exit 0 |
| Focused browser lifecycle |7 groups, 28 snapshots; exit 0 |

The browser lifecycle test uses real movement to create destruction and actual UI saves/Continue. Three title/Continue cycles hold 130 total programs and two compatible programs per targeted pool material. Cyborg/drill changes retain pool identities. Quality changes preserve their existing rendering buffers and shadow settings. Forced context loss/restoration retains exact paused state and saved bytes, rebuilds GPU program identities and increments preparation attempts 7→8. No persistent-world material was disposed. No new browser errors or remote requests occurred in these functional checks. This is bounded Windows Chrome recovery testing, not a long-session or installation/update certification.

## Performance evidence

The final `paired-verified` batch completed **18 sequential foreground visits, nine A/B pairs, exit 0**: three baseline/candidate pairs for each profile. All visits passed route, focus, context, buffer and source-identity checks. All final timing and functional evidence matches the frozen runtime above. Detailed traces were not running during this batch.

The baseline and candidate use installed Chrome 154.0.8037.95, Playwright 1.62.1, pinned Three 0.185.1 and the same Windows/NVIDIA RTX 4070 Ti SUPER/ANGLE D3D11 machine. Desktop uses a 1440x960 CSS viewport, High preset, actual 1800x1200 drawing buffer at renderer DPR 1.25. Phone portrait uses 390x844 CSS and actual 331x717 buffer; landscape uses 844x390 CSS and actual 717x331 buffer. Both phone profiles use touch emulation, device DPR 2 and the unchanged Performance preset's renderer DPR 0.85. These are Windows observations, not iPhone performance.

Each visit uses fresh isolated browser storage and the ordinary crawler/standard selection and Begin interface. Native held-left input continues for 60 metres projected displacement. The opposite return over visited ground is warmed category C. The harness then saves through the UI, reloads, presses Continue and repeats first and warmed routes from that visit's actual saved state. There is no fixture reset, simulation advance, extra precompile, hidden movement, changed native RAF timestamp or pre-movement settling. State, camera, route overshoot and natural elapsed time are recorded, not forcibly equalized. Small endpoint differences remain; this is a matching route/protocol comparison, not exact replay.

The first-response proxy runs from the input event to completion of the first native main callback whose position changes. It does not measure physical display latency. Frame intervals are native RAF intervals; main callbacks are wall duration including waits, not pure CPU cost. GPU timer queries cover the instrumented render interval only, with query accounting retained. The >50 and >100 ms counts are diagnostic thresholds, not a release quality score.

### Ordinary Begin: first moving route

Numbers separated by slashes are pairs 1/2/3, in milliseconds. A is baseline; B is candidate.

| Profile | A maximum main callback | B maximum main callback | A callbacks >50 / >100 per visit | B callbacks >50 / >100 per visit |
|---|---|---|---|---|
| Desktop |302.6 / 303.7 / 302.7 |17.2 / 17.6 / 18.0 |1 / 1 each |0 / 0 each |
| Portrait emulation |287.8 / 288.2 / 286.6 |228.3 / 232.2 / 228.5 |2 / 2 each |1 / 1 each |
| Landscape emulation |291.7 / 286.1 / 289.4 |18.4 / 18.1 / 17.6 |1 / 1 each |0 / 0 each |

This demonstrates the targeted ordinary-path improvement on desktop and landscape, and a partial improvement in portrait. Portrait still has one roughly 230 ms callback per first route; its exact owner was not established in the desktop causal trace. Mobile stutter is not fixed.

| Profile | RAF median A → B | RAF p95 range A → B | RAF maximum range A → B | Main median range A → B | Main p95 range A → B | GPU maximum range A → B |
|---|---|---|---|---|---|---|
| Desktop |10 → 10 |10.1–20.0 → 19.9–20.0 |300.0 → 109.9–120.1 |10.0–10.7 → 10.1–10.6 |11.1–12.0 → 11.2–11.8 |289.21–297.00 → 7.93–8.76 |
| Portrait emulation |10 → 10 |10.1 → 10.1 |280.0–280.1 → 220.0–230.0 |8.5–8.6 → 8.4–8.6 |9.2–9.7 → 9.2–9.4 |221.14–280.28 → 10.18–10.95 |
| Landscape emulation |10 → 10 |10.1 → 10.1 |280.0–289.9 → 10.2–19.9 |8.9–9.0 → 8.9–9.1 |9.5–9.8 → 9.6–9.9 |10.84–141.50 → 10.90–19.89 |

Desktop first routes retain one RAF gap >100 ms in each candidate visit. Candidate input response is 107.4–109.8 ms versus baseline 95.6–107.6 ms. It is not improved, and its cause remains unresolved. Portrait initial response is 9.5–12.3 ms versus 9.7–10.0 ms; landscape is 9.6–11.2 ms versus 9.9–11.4 ms. Low GPU maxima do not refute the remaining portrait callback stall: the timer covers its submitted GPU interval, not all synchronous JavaScript/driver waiting or display presentation. Full per-visit medians, p95, maxima, sample counts and >50/>100 counts for RAF, callback and GPU measurements are preserved in `17_PERFORMANCE.txt`; none are replaced by these range summaries.

### Warmed movement and Continue

Neither build has any >50 ms main callback on warmed return routes or the first/warmed routes following the real Continue. All these routes also have zero RAF intervals above 50 ms. First warmed-return callback median-of-visit-medians is desktop 10.2→10.4 ms, portrait 8.5→8.4 ms and landscape 8.8→8.9 ms. First Continue-route callback median-of-medians is desktop 10.3→10.5 ms, portrait 8.5→8.4 ms and landscape 8.8→8.6 ms. These small mixed changes do not establish a general FPS improvement.

GPU results are also mixed. Landscape first Continue GPU median-of-medians rises 3.13→3.68 ms, and candidate pair 2 p95 is 10.93 ms versus baseline 4.34 ms. Its first Begin-route GPU p95 also rises 7.36→10.74 ms. Candidate portrait Continue response is 21.2–23.9 ms versus baseline 9.6–21.4 ms. These unfavorable values remain in the evidence. No new >50 ms warmed callback was measured, but three samples cannot prove the absence of every warmed regression.

### Loading and preparation cost

Navigation/reload values run from navigation initiation until the existing Begin/Continue control is visible and the read-only `__colossus` inspection hook is available. They include actual page construction, renderer startup and harness observation, not fixture setup or just network download; they are not an independent measurement of every control's readiness. Begin/Continue values below run from click capture to completion of the first gameplay frame. The synchronous click-handler wall durations are separately retained in the complete results.

| Profile | First navigation A → B, seconds | Reload A → B, seconds | Begin click-to-frame A → B, ms | Continue click-to-frame A → B, ms |
|---|---|---|---|---|
| Desktop |19.529–19.892 → 19.535–19.948 |7.117–7.243 → 7.113–7.338 |926.0–956.6 → 918.7–920.6 |948.2–965.9 → 929.2–1176.0 |
| Portrait emulation |16.770–17.704 → 16.647–17.777 |6.825–6.855 → 6.822–6.867 |919.3–929.6 → 917.2–926.9 |920.5–936.8 → 912.5–920.5 |
| Landscape emulation |19.425–19.608 → 19.618–19.728 |7.019–7.075 → 7.056–7.146 |915.6–949.5 → 905.6–949.8 |952.2–959.6 → 938.5–953.4 |

Candidate synchronous preparation submission takes 2.3–2.7 ms on desktop, 2.2–4.7 ms in portrait and 2.4–8.4 ms in landscape across initial/reloaded pages. It occurs in the normal preview rendering lifecycle; this intentionally moves the two specific shader submissions ahead of their first visible use. Those numbers are the submission call's wall time, **not total driver work or proof of free preparation**. Initial construction/loading remains expensive in both builds. Continue desktop B1 worsens to 1176.0 ms from its paired 965.9 ms; its click handler takes 907.6 ms versus 665.6 ms baseline. That outlier was retained. There is no claim of a faster startup or elimination of every stall.

### Retained protocol failures and limits

The initial `paired` batch exposed up to 88.9 ms inside its input metadata observer because it queried GL metadata at that boundary. It completed three desktop pairs and was then intentionally stopped during portrait A1; its exit-1 records, raw results and `PROTOCOL_ERROR.txt` remain. It is not the final low-overhead comparison.

The observer was corrected to collect only JavaScript/DOM data at input time and defer GL metadata until after route completion/input release. A second `paired-final` batch was stopped during desktop B2 to investigate the still-visible roughly 100 ms response. Its exit-1 records and `PROTOCOL_LIMITATION.txt` also remain. A candidate control with GPU queries disabled still measured 102.3 ms initial response with only 0.2 ms observer overhead. That result does **not** support blaming timer queries for the remaining delay; the limitation note includes that correction. No runtime source changed between these measurements and the complete final batch. All final visits are retained, including unfavorable results; no final pair was discarded or rerun for a better value.

The final observer costs at most 0.3 ms. GPU query coverage is 15,754/15,754 desktop frames, 16,813/16,867 portrait frames and 16,833/16,919 landscape frames. The 54 portrait and 86 landscape gaps are skipped-pending samples; there are no disjoint or late-discarded samples. Missing samples are not zero. GPU evidence contains route distributions, not raw per-frame query alignment, so it cannot identify the remaining portrait stall as CPU-only or exclude GPU-related waiting. Complete accounting remains in the evidence. Browser storage is isolated, but driver/OS caches and unrelated machine activity are not controlled. Three pairs are descriptive evidence, not statistical proof. There is no physical Apple-device, Safari, thermal or battery inference. Timing-run source fingerprints, foreground checks, viewport/buffer/preset metadata, route/state deltas, startup/preparation values and all four route distributions for all 18 visits appear in the flat handoff.

## Visual preservation

Ten new original screenshots form five before/after pairs: normal desktop City, reverse, close, phone portrait and phone landscape. They retain the normal HUD and original PNG dimensions. Fixed paused fixtures are used only for matched visual regression; they do not substitute for ordinary first-play timing. Camera pose, viewport, actual buffer, preset, lighting and state are checked independently.

Full RGB comparisons found 3 differing pixels in desktop City (maximum channel change 1), 190 reverse, 231 close, 13 portrait (maximum 1), and byte-identical landscape output. The largest changed fraction is 0.016710% in close view; maximum channel changes 31/30 in reverse/close remain disclosed. A separate agent inspected all ten originals and found no discernible visual regression. The cause of sparse differences was not established; do not relabel them as proven wildlife or numerical noise. Paused stills cannot certify all animation frames, and their unchanged pause/HUD overlays obscure part of the carrier.

Normal foreground movement and native rendering were exercised by the trace and timing runs. Screenshot batches are separately labelled headless Chrome and phone emulation. Numerical details, original hashes and the preservation inspection are included in 18/19 of the flat handoff. No new art score was awarded; both historical 7.6/10 FAILED reviews remain verbatim.

## Remaining limits and release status

No physical iPhone/iPad, Safari/WebKit, thermal/battery test, long soak, exhaustive effect combination, or full installation/update certification was performed. Initial page construction and Begin/Continue reconstruction can still be expensive. Only the demonstrated rendering/ownership costs were repaired. Existing gameplay intent was not changed. New local module files are picked up by the existing recursive runtime builder; delivery was not exercised.

No push, merge, deployment, account/billing change or readiness override occurred. The art/release gates remain closed. The result is a local implementation and one flat 20-file handoff, not a deployed build. Raw traces, recordings if any, per-frame data and working helpers remain outside the upload folder. No ZIP or external asset/service was used.
