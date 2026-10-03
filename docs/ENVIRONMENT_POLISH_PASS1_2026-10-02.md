# Environment polish pass 1 — local implementation and evidence

This report covers one bounded pass on the existing crawler river/woodland scene. It is technical and visual work only. No gameplay, controls, carrier designs, city construction rules, terrain shape, navigation, resource positions, save format, updater or iPhone UI were changed.

## Source and reversibility

- Starting checkout: `codex/playtest`, clean at `8230ce17a4ae26f3374e8ef9594db1095d5cb77f`.
- Isolated implementation branch: `codex/environment-polish-pass1-20261002`.
- Local checkpoint: `codex/checkpoint-environment-pass1-20261002`, pointing to the original commit. The original checkout remains untouched.
- The managed worktree uses the existing local dependencies through a `node_modules` junction. No software, dependency upgrade, external asset service or engine migration was used.
- Candidate local server: `http://127.0.0.1:4197/`. Its `/health` root identity is checked by the capture harness. This is a PC loopback preview, not a phone-accessible deployment.

## Implementation

Only three runtime files changed:

- [`src/landscape.js`](../src/landscape.js): clearer meadow/earth/litter materials; moderated scan grain and normal intensity; organic material transitions; a static bank-moisture shading attribute; scenery-only rock texture scale, roughness and contact/weathering variation; foliage volume lighting; restrained channel-related water color variation. Terrain and river vertex positions remain exact. Lighting presets, resolution and global effects are unchanged.
- [`src/environment-geometry.js`](../src/environment-geometry.js): rounded crown normals, subtle crown interior color and upward grass normals. Geometry positions, indices, UVs, bounds, placements and random-call order remain unchanged.
- [`src/vegetation-materials.js`](../src/vegetation-materials.js): local reproducible pine cutout artwork and foliage-normal markers. Existing card geometry, alpha testing and coverage-preserving mip generation remain. Pine occupied texel coverage changes from 36.1359% to 36.2000%; broadleaf/grass textures are unchanged.

An experimental 64 m partition size for vegetation and new rock partitioning were measured and **removed**. They lowered submitted triangles but increased draw calls, with no dependable timing benefit and a portrait GPU-time regression. The final candidate retains the exact original wind-only partition expression and default 96 m cells. Canonical instance indices and destruction identities are preserved. No culling optimization is claimed.

## Capture and measurement method

The real pre-edit baseline remains in `artifacts/environment-pass1/before/`. It was captured before runtime editing, with source hashes checked at both ends. A fixed-frame exploratory timing run is retained there but is not the final performance comparison: native frame rates caused different route lengths.

Final performance uses native fixed-world routes on the actual untouched checkpoint server and actual candidate server. Each profile gets two unmeasured moving routes, then three measured routes with the original fixture restored and 120 native settled frames plus camera convergence before each run. The production scene-reset method rebuilds some materials, so each reset is followed by `renderer.compileAsync(scene,camera)` outside timing on both builds; byte-for-byte serialized simulation equality is asserted across that preparation. These are steady-state rendering measurements, not loading or first-use-stutter measurements. Rejected earlier runs that caught the reset-related metal shader compilation remain archived. Real keyboard/touch input moves from x=-14, z=82 to the first native frame crossing x=-44; endpoint overshoot is recorded and bounded below 0.5 world units. Native timestamps and simulation timing are retained. Program counts and identities are checked throughout measured routes. No recording or screenshots occur during timing.

Some original screenshots retained a small camera-smoothing residual (maximum pose-coordinate difference 0.03725 world units; 8/12 satisfy the strict tolerance). They are not discarded or all called strictly identical poses. The final comparison additionally recaptures the unchanged checkpoint with convergence-based waiting, then captures the candidate the same way. Those checkpoint images are post-implementation recaptures of the old source, not chronologically pre-edit photographs. **All 12 final pairs pass** exact fixture/preset/viewport/light/DPR/buffer/camera-control checks; maximum camera position/aim difference is **3.08e-7** world units, below the 1e-4 tolerance. See `artifacts/environment-pass1/matched-comparison.json`.

The raw original-checkout and pre-edit-worktree hashes differ because of CRLF/LF text checkout conventions. Normalizing text line endings reproduces the original pre-edit fingerprint exactly; `checkpoint-line-ending-provenance.json` retains that proof alongside raw hashes and actual server roots. No older archive supplied the baseline.

| Profile | Viewport | Device DPR | Actual renderer DPR | Render buffer | Preset |
| --- | --- | --- | --- | --- | --- |
| Desktop | 1440 × 960 | 1 | 1.25 | 1800 × 1200 | High |
| Phone portrait emulation | 390 × 844 | 2 | 0.85 | 331 × 717 | Performance |
| Phone landscape emulation | 844 × 390 | 2 | 0.85 | 717 × 331 | Performance |

Fixture: original armored crawler, x=-14, z=82, time=12, angle=0, day lighting, City/cinematic camera. Normal camera yaw=0.92, pitch=0.55, zoom=80, fov=42. Additional matched reverse, close and wide views retain the ordinary HUD. The game's native pause banner stays visible in frozen stills; no CSS hides it. A separate six-second active gameplay clip supplies motion evidence.

The machine is Windows Chrome 154 / WebGL2 / ANGLE D3D11 / NVIDIA RTX 4070 Ti SUPER. Phone results are viewport/touch emulation on that PC, not iPhone or iPad measurements. An initial software-rendered browser attempt was rejected and is not used for performance conclusions.

## Preservation and regression results

- `npm test`: **226/226 passed** again after removing the culling trial, including existing save, installation and construction unit regressions; final log at `artifacts/environment-pass1/final-material-only-unit-tests.txt`.
- New baseline/candidate identity harness: **passed**. It compares all baseline source modules from Git against the actual candidate in CPU-only production construction contexts. It checks 1,665 destruction anchors, 913 tree roots, 77 canonical instance groups, all instance matrix components, 14,641 terrain/river/normal samples, exact ground/water buffers, resource/proxy positions and six initial carrier/save identities. Forty saved damage records in expedition and battle hide the same 1,534 instance slots and restore every matrix/root/count.
- Existing terrain cache regression: **32,016 checks passed**. Existing world-interaction pool regression: **60,632 assertions passed**, including overflow/recycling and protected resources. Its diagnostic copy changes only the hardcoded server port; the invocation note is retained.
- Foliage checks: eight geometry variants and 160 species/distance/seed cases retain geometry/bounds and all branch/crown transforms; normals are finite unit vectors. Intentional normal/color/pine-art changes are documented in the foliage report.
- Six-carrier browser harness: **54/54 combinations passed** (six actual UI carrier choices × three quality presets × three lighting modes), with 12 actual district/ground canvas selections and six exact save/reload/Continue checks. Zero JavaScript, shader, failed-request or remote-request errors in the strict passing run. Six ordinary HUD screenshots are included. This matrix tested the final visual shaders/geometry with the culling trial still present; the subsequent sole runtime change restores the original partition expression. Final material-only identity and smoke checks are separately retained; the 54-case matrix was not rerun after that rollback.
- Existing unchanged `tests/browser-smoke.mjs`: **13/13 checks passed**, covering previews, construction, travel/gathering, saving, world view, rival selection, battle, ability, withdrawal, reload/resume, pause and mobile Build layout. Its simulation advances are functional test helpers, not motion/performance evidence.
- JavaScript syntax and `git diff --check` passed.

Two earlier carrier harness failures remain preserved. Attempt 1 used default RAF polling while the functional test intentionally controlled RAF; interval polling fixed that test-driver conflict. Attempt 2 finished all functional cases but caught one canceled HDR request without sufficient lifecycle evidence to prove its cause. The final strict run waits for network quiescence at intentional reload/teardown boundaries and records all 12 HDR loads finishing; it does not suppress failed requests. These were harness changes, not game runtime repairs.

## Final result

The final material-only candidate completed all nine measured routes with no runtime errors, GPU disjoints or shader-program changes. Renderer, resolution, preset, light and camera controls were asserted at both endpoints of every final candidate route. The baseline recorded these settings per profile, not per endpoint; no missing historical observations were synthesized. Source fingerprints remained stable during each capture run:

- Checkpoint runtime/assets: `d6eac251ac05f14f682a442f167e04d899713754e50321771e358eedd27a6fa3`.
- Final runtime/assets: `a71d3a0824ebe43229a71fa77f349edb3fecbce2c1ac693df65551c644b16eba`.

Each entry below is **before → after**, using the median of the three individual run medians. The p95 column is the median of the three run p95 values, not a pooled percentile.

| Profile | Frame median, ms | Frame p95, ms | Main CPU median, ms | GPU median, ms | Draw calls | Triangles |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop | 39.9 → 10.0 | 60.1 → 20.1 | 19.5 → 11.7 | 35.58 → 5.53 | 1,056 → 1,063 | 4,638,610 → 4,639,396 |
| Phone portrait emulation | 10.1 → 10.0 | 20.1 → 20.0 | 13.0 → 9.2 | 2.64 → 2.94 | 317 → 317 | 1,408,132 → 1,408,124 |
| Phone landscape emulation | 20.0 → 10.0 | 29.9 → 20.0 | 15.3 → 10.3 | 17.57 → 2.97 | 783 → 782 | 2,366,628 → 2,366,708 |

**Do not interpret the large desktop/landscape differences as a demonstrated causal speedup.** The checkpoint and trial runs showed substantial timing variation despite stable shader programs. The final sampled frame times did not regress, but this is one PC, with three repeats, sequential before/after batches and no control over external OS/GPU scheduling. Portrait GPU median rose by about 0.30 ms; its run ranges overlap (before 2.12–2.79 ms; after 1.99–3.01 ms). Two portrait runs missed two GPU queries each when the pending query queue was full; all frame/CPU observations remain, and GPU sample counts are reported. Submission counts are effectively unchanged; small route-summary differences reflect native frame sampling, not removed detail.

The source-grounded culling trial was rejected rather than marketed as an optimization: approximately 6–8% fewer submitted triangles came with approximately 5–8% more draw calls, and portrait GPU run ranges were worse. The original batching/culling is restored. This pass makes a visual improvement without claiming a reliable throughput optimization.

Two nonfatal X4122 shader precision warnings have the same exact text and vendor source location on the actual untouched checkpoint and the candidate. They are retained in the reports and not presented as new errors or as fixed.

Final identity and 13-check browser smoke also passed after the partition rollback, with zero errors or remote requests. Render mesh/spatial mesh counts match the baseline at 665/521. See `artifacts/environment-pass1/final-material-only-qa.json` for the precise boundary between the earlier 54-case matrix and these final checks.

The independent art director completed four rounds: **7.2 → 7.5 → 7.6 → 7.6/10**. The final review reports zero new concrete visual defects and zero errors in its own captured log, but remains below the fixed **8.5/10** acceptance threshold. Its own fresh normal-HUD default/reverse/close/wide views and active outbound/return travel are under `artifacts/critic-round-04/environment-pass1/`. The critic independently checked the 1800 × 1200 canvas. See [the untouched final review](../art-reviews/environment-pass1-round-04.md).

Remaining aesthetic limitations are repeated/segmented foliage silhouettes, simplified ground/rock/water transitions and broad soft depth-color patches. They are not demonstrated correctness defects or authorization for a further pass. Pre-existing carrier, starting-deck and resident detail also limits the overall impression; those remain outside this task. **Stop after this fourth review. The visual and release gates remain failed.**

The separate clip is **6.00 seconds, 1440 × 960, VP8 at 25 fps**. The eight-second source segment records native movement from x=-14/z=82 to approximately x=-54.89/z=135.70. Its internal six-second trim was verified by duration plus viewed start/middle/end frames: active gameplay and ordinary HUD, with no title/loading/toast/pause overlay. Stills, video and the final timing run share the same runtime fingerprint. No audio claim is made; the browser was muted for capture.

## Local evidence package

The portable viewer is `artifacts/environment-pass1/review-package/index.html`. Extract the entire accompanying archive before opening the HTML. It contains the 12 strict before/after pairs, original pre-edit captures, six-second clip, raw timing and QA results, rejected attempts, all four independent reviews with their own screenshots, a source patch, selected source/test files and a SHA-256 manifest. Its links use relative paths. It is an evidence bundle, not a standalone game installation.

Package verification passed: **181 payload-file hashes, 95 relative resource links, all 12 comparison selections and actual six-second video playback**, with zero browser errors or external requests. The viewer was inspected at desktop and 390 px width; an initial viewer-only select overflow was corrected and the failed attempt retained. This made no game change. Verification is recorded in `artifacts/environment-pass1/package-verification.json` and included with the package results. The game remains available separately at the local loopback preview. Source is kept on the isolated branch; no push, merge or deployment is performed through the failed gate.

## Boundaries

Physical iPhone/iPad, Safari/WebKit, thermal behavior, battery use and long-session performance are unverified. The complete frozen installation/update browser gate was not rerun for this graphics task; its prior repair evidence remains separate. Source inspection and current unit/save regressions do not constitute a new physical-device or hosted A→B update certification.

The release readiness file remains false. A failed art gate must not publish; protected-host setup is **Configured but blocked**, not a playable deployment. This pass makes no account, billing, visibility or hosting change.
