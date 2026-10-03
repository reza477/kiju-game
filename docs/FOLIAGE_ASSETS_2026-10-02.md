# Foliage asset quality — local implementation and evidence

This is the separately authorized pine and ground-cover asset task. The preceding environment material pass remains closed at its recorded **7.6/10 failed** result. This task does not approve that work or clear any delivery gate.

## Preserved starting point

The actual latest material-pass checkout was clean at `56670b3dfd8ff25eec191a27d632108f61d77eb5` on `codex/environment-polish-pass1-20261002`. There were no changed or new untracked source files to discard. Its ignored evidence and completed ZIP were retained in place. The new managed worktree and branch `codex/foliage-assets-20261002` start from that exact commit; local checkpoint `codex/checkpoint-foliage-assets-20261002` retains it. Neither the older `8230ce1` nor `75503a5` archive replaces the completed work.

The starting landscape, geometry and foliage-material file hashes match the preserved worktree byte for byte. Nine new baseline screenshots were captured before any foliage runtime edit. Local server health identities distinguish the baseline on port 4197 from this candidate on port 4199.

## Authorized asset changes

Only two runtime source files change: `src/environment-geometry.js` and `src/vegetation-materials.js`. Their differences are cosmetic asset output. The existing Three.js renderer, instancing, materials, shadows, wind, distance-detail and procedural-texture paths are reused. No dependency, installed software or external asset service is added.

- Pine sprays: swept and cupped branch-card geometry, irregular connected needle artwork and transparent gaps, within each original near/distant local envelope.
- Grass: three bowed perimeter strips wrap an irregular root cluster, with a common lean and overlapping tapered blades. This replaces the three intersecting radial arms without increasing the 18 vertices or 12 triangles.
- Ferns: unequal swept fronds and staggered pinnae inside their original local support envelope.

Per-asset triangle budgets remain 40 for near pine sprays, 24 for distant pine sprays, 12 for grass clumps and 240 for fern geometry. No patch, tree, branch-instance transform or scatter density is added or moved. Cosmetic generation uses private fixed seeds; world-generation randomness and construction order are unchanged. Broadleaf geometry and texture-mip hashes are protected by exact baseline assertions.

The rendered foliage is not part of the scene's explicit picking target list. Resource picking retains its separate proxy geometry, and movement retains its numeric simulation path. Canonical instance matrices, colors, roots, wind-flex/motion attributes, ground-cover LOD flags, destruction membership, hidden/restored slots, resource positions and save identities are compared against production construction from the preserved Git revision. Visible/depth/distance materials must share their cutout map, alpha settings and side. Intentional local vertex/normal/UV/texture differences are permitted only in the authorized foliage asset outputs; interaction and persistence assertions remain strict.

## Evidence conditions

The matched fixture is the original armored crawler at x=-14, z=82, time=12, angle=0, population 24; day lighting and ordinary City/cinematic camera. Normal view uses yaw 0.92, pitch 0.55, zoom 80, fov 42. Reverse adds pi to yaw; close uses zoom 52 and pitch 0.42. Native camera smoothing must converge before capture. Ordinary HUD and paused banner remain visible in stills.

| Profile | Viewport | Device DPR | Render DPR | Actual buffer | Preset |
| --- | --- | ---: | ---: | --- | --- |
| Desktop | 1440 x 960 | 1 | 1.25 | 1800 x 1200 | High |
| Phone portrait emulation | 390 x 844 | 2 | 0.85 | 331 x 717 | Performance |
| Phone landscape emulation | 844 x 390 | 2 | 0.85 | 717 x 331 | Performance |

Timing uses the existing native keyboard/touch-driven route from x=-14 to the first frame crossing x=-44, with a bounded native-step endpoint tolerance. Sequential A1/B1/A2/B2/A3/B3 visits close each browser before the next opens. Two moving warmups and current-scene precompilation precede each steady measured route. Initialization wall time and first moving-use observations are kept separate from warmed timings. The first moving route follows ordinary initialization/paused settling; it is not a controlled cold-cache page-load measurement. No video or screenshots run during timings.

## Final verification and review

The fourth runtime attempt was frozen before final validation. Runtime/assets fingerprint: `8c6c9117dbea97850677c81718ee0d63e6aeac1853fd5c16702f4393d9f6b852`. Geometry SHA-256: `504cd2c4e56b94af738a58bbe640210b8f156f17fa753bff0b66ef0e11b2838f`; vegetation-material SHA-256: `a33404edde55313df1913c34416243c62eaa4938a706b88ff033c7b1388655e9`. The complete file hash inventory and freeze time are retained in the evidence bundle's final-source record.

Raw capture reports identify the candidate as uncommitted changes on `56670b3` because evidence was collected before the final local commit. The fingerprint and per-file hashes identify the tested runtime, and the bundle includes the complete patch against `56670b3`. Committing this same source locally after verification does not substitute a different runtime for the tested candidate.

The near/distant pine, grass and fern triangle counts remain 40/24/12/240. Final 256-pixel alpha-test occupancy is 33.597% for pine (baseline 36.200%) and 26.047% for grass (baseline 22.215%). All mip-level occupancy and bounds are recorded from the actual baseline and final generators. These values describe texture occupancy, not screen-space overdraw, density changes or measured GPU speed. The higher grass occupancy is included in the rendering-cost assessment.

After that freeze, all of the required final-source checks passed:

- **227/227 unit tests**, including the new asset-envelope and exact broadleaf-output coverage. No failed, canceled or skipped tests.
- **Paired production identity comparison passed:** 1,665 destruction anchors, 913 tree roots, 77 canonical instance batches, 14,641 terrain samples, exact ground/water and resource-proxy buffers, canonical instance matrices/colors/wind attributes/LOD flags and initial save identities. Forty saved destruction records hide the same 1,534 canonical instances in expedition and battle, then restore them exactly. No JavaScript, failed-request or remote-request errors.
- **54/54 six-carrier render combinations passed** after the last runtime edit, including 12 actual district/ground canvas selections and six exact save/reload/Continue checks. The matrix started at 01:58:16 UTC on October 3, after the 01:58:14 source freeze, and finished at 02:01:46. Its complete source-start and source-finish inventories match the final freeze. Zero JavaScript, shader, failed-request or remote-request errors.
- **13/13 existing interaction/save smoke checks passed** on the same final files: title variants, construction, travel/gathering, saving, world view, rival selection, battle/ability/withdrawal, reload/resume, pause and 390-pixel Build layout. Zero browser errors or remote requests. Functional simulation advances in this harness are not presented as motion/performance measurements.

The final-source inventory was rehashed after those checks and still matched. `final-qa.json` records the exact boundary; no earlier matrix is substituted for this final run. The older full terrain-pool and installation/update browser audits were not repeated or presented as fresh checks.

The only tracked test-tool changes are focused extensions to the existing capture harness (configurable baseline, sequential interleaving and query accounting), identity harness (canonical wind/LOD/color and shadow parity), and vegetation asset tests (bounds, fern and broadleaf goldens). No testing framework or dependency is added.

Complete tracked change list:

- `src/environment-geometry.js`: authorized pine, grass and fern local render geometry and envelope fitting.
- `src/vegetation-materials.js`: locally reproducible pine and grass cutout artwork; inherited shading settings stay intact.
- `tests/vegetation-assets.test.mjs`: targeted asset budgets, bounds and exact broadleaf preservation.
- `tests/environment-polish-identity.mjs`: stronger canonical instance and cutout-shadow preservation assertions.
- `tests/environment-polish-capture.mjs`: matched captures and sequential timing protocol using the existing harness.
- `art-reviews/foliage-assets-round-01.md` through `foliage-assets-round-04.md`: the critic's independent findings, unchanged by the builder.
- This report: implementation, evidence and limitations. Reproducible evidence helpers and media are local ignored artifacts in the complete ZIP.

The separate visual reviewer completed four rounds: **7.5 -> 7.5 -> 7.5 -> 7.6/10**. The final inspection found zero concrete visual/runtime errors in its bounded normal-HUD views, wind samples and actual travel. It recognized a small improvement from flat forks to upright grass tufts, while repeated cup/fan clumps and sparse pine branch rails remain visible. The fixed **8.5/10 plus zero errors** gate is still failed. There is no fifth asset revision.

The reviewer took its own fresh screenshots and controlled travel/orbit/zoom independently from the asset builder. Reviewer provenance is disclosed in every review: the existing safety-audit agent was reused after the tool refused a new agent thread. Earlier it had extended preservation tests; it authored none of the visual implementation, and wrote no implementation, assets, tests or capture scripts while acting as critic. It is not represented as a newly spawned critic. Reports and findings remain unmodified by the builder.

Remaining pine continuity is limited by the retained branch-tip instance transforms and original local support envelopes. No branch or tree instance was repositioned to conceal that limitation. Unchanged terrain, broadleaf and carrier presentation also affects the overall review; those areas were not reopened to chase the score.

## Measured rendering cost

All 18 sequential visits completed without retry, failed assertion, browser error, GPU disjoint event or shader-program growth during a warmed measured route. All nine A/B pairs passed complete endpoint settings/camera parity. The machine used Windows Chrome 154 with an NVIDIA RTX 4070 Ti SUPER through ANGLE D3D11, headless with hardware acceleration. These are native browser-route measurements, not a display refresh-rate or device certification.

The following are medians of the three individual run medians; the p95 column is the median of three run p95s, **not a pooled percentile**. Before -> after:

| Profile | Frame median / p95, ms | Main callback median, ms | GPU median / p95, ms | Draw median | Triangle median |
| --- | --- | --- | --- | --- | --- |
| Desktop High | 10 / 20 -> 10 / 20 | 11.0 -> 11.0 | 5.159 / 6.132 -> 5.075 / 6.112 | 1,060 -> 1,062 | 4,639,274 -> 4,638,790 |
| Portrait Performance emulation | 10 / 10.1 -> 10 / 10.1 | 8.2 -> 8.3 | 2.305 / 4.030 -> 2.530 / 4.845 | 317 -> 318 | 1,408,124 -> 1,408,124 |
| Landscape Performance emulation | 10 / 10.1 -> 10 / 10.1 | 9.5 -> 9.4 | 2.643 / 4.987 -> 2.753 / 5.174 | 782 -> 782 | 2,366,706 -> 2,366,706 |

Frame pacing is broadly similar in these runs. The phone-emulation GPU medians increased by **0.225 ms portrait** and **0.110 ms landscape**. This is a measured cost, not an optimization win. Run ranges overlap: portrait A 2.244–2.650 versus B 2.307–2.967 ms; landscape A 2.380–2.737 versus B 2.579–3.249 ms. Desktop A 5.037–5.169 versus B 5.025–5.230 ms also overlaps. No reliable causal speedup is established.

No geometry, scatter or instance-count increase explains those differences: per-asset triangles and the complete canonical scene inventory are unchanged. The altered cutout coverage and local shapes can change fragment work and render bounds/culling; higher grass alpha occupancy is a plausible contributor to GPU cost. That contribution was not isolated from run-to-run GPU clocks, driver/OS caches and unrelated machine activity. The small observed draw/triangle differences are retained rather than rounded away; submitted visible subsets and native frame sampling differ along the route despite exact canonical placement and matched endpoints. Renderer draw/triangle counts include rendering passes and are distinct from the static asset inventory. Main/scene callback timings are wall durations and can include driver waits; they are not isolated CPU instruction costs.

Individual warmed runs, in actual execution order within each profile:

| Profile | Run | Frame median / p95 ms | Main ms | GPU median ms | Draws | Triangles | Missing GPU samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop | A1 | 10 / 20.0 | 11.0 | 5.169 | 1060 | 4639274 | 0 |
| Desktop | B1 | 10 / 20.0 | 11.0 | 5.230 | 1062 | 4638790 | 0 |
| Desktop | A2 | 10 / 20.0 | 10.8 | 5.159 | 1062 | 4639586 | 0 |
| Desktop | B2 | 10 / 20.0 | 11.1 | 5.025 | 1064 | 4639150 | 0 |
| Desktop | A3 | 10 / 20.0 | 11.1 | 5.037 | 1057 | 4639274 | 0 |
| Desktop | B3 | 10 / 20.0 | 11.0 | 5.075 | 1062 | 4638790 | 0 |
| Portrait | A1 | 10 / 10.1 | 8.6 | 2.244 | 317 | 1408124 | 2 |
| Portrait | B1 | 10 / 10.1 | 8.3 | 2.967 | 318 | 1408124 | 2 |
| Portrait | A2 | 10 / 10.1 | 8.2 | 2.650 | 317 | 1408124 | 2 |
| Portrait | B2 | 10 / 10.1 | 8.3 | 2.530 | 318 | 1408124 | 2 |
| Portrait | A3 | 10 / 10.1 | 8.1 | 2.305 | 317 | 1408124 | 2 |
| Portrait | B3 | 10 / 10.1 | 8.2 | 2.307 | 318 | 1408124 | 2 |
| Landscape | A1 | 10 / 10.1 | 9.4 | 2.643 | 782 | 2366706 | 1 |
| Landscape | B1 | 10 / 10.1 | 9.4 | 3.249 | 782 | 2366706 | 1 |
| Landscape | A2 | 10 / 10.1 | 9.5 | 2.380 | 782 | 2366706 | 2 |
| Landscape | B2 | 10 / 10.1 | 9.4 | 2.579 | 782 | 2366706 | 1 |
| Landscape | A3 | 10 / 19.9 | 9.7 | 2.737 | 782 | 2366628 | 1 |
| Landscape | B3 | 10 / 10.1 | 9.9 | 2.753 | 782 | 2366658 | 1 |

There were **9,939 valid GPU measurements for 9,958 warmed frames**, with 19 missing samples from pending-query queue limits. Missing samples stay missing, not zero. No disjoint or failed query was silently retried. The baseline landscape A3 p95 spike to 19.9 ms is retained; the three-run aggregate does not hide its individual record. Raw per-run frame/CPU/GPU medians, p95, maxima, counts and query accounting are included in the ZIP.

First-use measurements were separate. Each first moving route compiled two additional shader programs on desktop/landscape and three on portrait in both A and B. Maximum main-callback stalls across those first routes were A/B **166.0/164.4 ms desktop**, **236.2/235.5 ms portrait**, and **153.8/152.8 ms landscape**. Context/navigation/environment/fixture/120-frame settling wall-time ranges were A/B 24.635–25.240/24.376–25.756 seconds desktop; 22.442–22.984/21.991–22.384 portrait; 24.213–24.369/24.361–24.401 landscape. They are observations from this harness, not controlled cold-cache startup benchmarks. Two native moving warmups followed before every warmed measurement.

## Evidence package

All **nine final before/after still pairs passed** exact fixture state, viewport/DPR/render buffer, preset, lighting/environment, population, camera controls and normal-HUD checks. Maximum settled camera coordinate difference was 3.97e-7, below the 1e-4 tolerance. The root inspected all nine final gameplay views. Phone Performance views retain the original lower detail and resolution, making fine ground-cover changes much less visible than in the desktop High views; no phone quality increase was forced for presentation.

The separately recorded active clip is **6.000 seconds, 1440 x 960, 25 fps**, with the original HUD and no pause overlay in inspected frames. Its eight-second native input interval moved the crawler 67.49 world units; that distance describes the full input interval, not the shorter internal clip. Start/middle/end frames at 0.1/3.0/5.85 seconds show changing position/heading, foliage and track marks. The raw recording, trim metadata, source hashes and extracted frames are retained. Compressed and sampled video inspection does not establish exhaustive shimmer or LOD stability.

The portable `index.html` viewer passed all nine image-pair selectors and actual six-second video playback in a local-file browser check, with no page errors, remote requests or 390-pixel horizontal overflow. Desktop and mobile viewer screenshots were inspected. Every packaged HTML/Markdown relative evidence link resolved, and every payload matched its recorded size and SHA-256. The package retains raw first-use and warmed records, all four unchanged critic reports, media, targeted source files and the complete patch against the preserved material-pass commit. Its SHA-256 manifest excludes itself. The final compressed archive is checked by streaming its entries against that manifest; the local `archive-verification.json` records that final check.

One evidence-helper issue was corrected before delivery: the first packaging invocation checked a newly added manifest link before writing the manifest. Only the package helper's write/check order changed. The regenerated viewer passed; `packaging-notes.txt` retains this correction. No runtime edit or art-review restart followed final QA. Known X4122 shader-precision warning text/source matched in A and B; no new game error was hidden by those warnings.

## Limits and release boundary

Windows Chrome/ANGLE observations and phone viewport/touch emulation do not establish physical iPhone/iPad, Safari/WebKit, thermal, battery or long-session performance. The full frozen installation/update browser gate is separate from this foliage task and is not newly certified by visual or save tests.

No push, merge, upload, deployment, account, billing or hosting change is made. `delivery/readiness.json` remains false. The private delivery setup remains **Configured but blocked**. The completed material review is not reopened, and this task stops after its bounded foliage review loop.
