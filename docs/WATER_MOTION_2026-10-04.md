# Water surface motion — local visual pass, 4 October 2026

## Scope and checkpoint

The owner's request is to make the water visibly move and stop reading as flat blue ground. This is a new water-only presentation pass. The completed ground/material and carrier passes remain closed with their recorded failed art gates. No Meshy generation, purchase, project upload, gameplay expansion or delivery action is included.

The actual source is `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`, branch `codex/water-motion-20261004`. Reversible local checkpoint `codex/checkpoint-before-water-motion-20261004` preserves full baseline `a9311775bd909979055199d9a94bdd5fa78541bb`, runtime/assets/dependencies fingerprint `6ac806e4bff7b94951cdd36ab8dc14b09cbec7772cc3daa24960da1042d9fffd`, local build `7c8ef006f1fbe3aa41ed`. The existing detached `carrier-assets-release` worktree at `d6b1510568879d078e6dfe1b62145c5943f29c6c` has exactly the same 124 runtime files and is used only to serve the BEFORE evidence. No older archive or primary Documents checkout replaces the current source. The Website project is untouched.

## Demonstrated cause and approach

The simulation time already reaches the river shader through `landscape.update`. Animation was present but hard to read: small optical slopes, high pilot roughness and a 60-percent specular reduction suppressed moving reflections at the normal City camera. The river clock must still stop when the existing game is paused.

The change is confined to the river fragment hook in `src/painterly-surfaces.js`. Broader irregular waves use the same existing brush texture, bend tangent and shared time uniform. Screen derivatives fade unresolved distant crests. Optical normals and channel roughness carry the moving highlights; bank damping retains a quieter edge. The pinned Three renderer uses separate direct/indirect specular fields; both now receive water's 0.0204 dielectric reflectance. No new reflection/refraction render target, texture, mesh, scene pass or CPU animation resource is introduced. This is animated surface lighting, not screen-space reflection or refraction.

The earlier ground shader prefix and river vertex hook are byte-identical to baseline. The river retains 2,247 vertices and 3,840 triangles, its original vertex motion, bank footprint and world transform. Simulation, terrain, collision, navigation, picking, placements, saves, combat timing, construction and carrier sources are untouched. Actual typed-array geometry hashes and uploaded time uniforms are recorded by the browser evidence, not inferred from compilation.

## Evidence method and limits

The automated water driver uses a separate baseline-created crawler save at x=-8,z=-98 in isolated browser contexts. Those automated drivers never load or replace the user's browser save. A separate manual critic-origin mistake and recovery are disclosed below. The driver uses normal City HUD, native input, native frame timestamps and the game's Steady camera option. Five matched required views plus an extra sun-facing angle are captured. Motion videos are separate from performance windows. The original videos include startup; metadata records the selected eight-second observation interval.

Timing compares three Windows Chrome profiles: desktop 1440x960 and phone portrait/landscape emulation. Each has two fifteen-second stationary observations and first/warmed native shoreline-return and river-crossing-return routes: eighteen windows per build. Whole-game RAF interval, callback wall time and GPU query duration are separate measures. One sequential A/B set cannot control all operating-system, driver cache or unrelated machine activity. It does not isolate water-only GPU cost.

Physical iPhone/iPad, Safari, thermal/battery, installation/update and long-session behavior are not tested by this focused shader pass. These results cannot clear historical release gates. `delivery/readiness.json` remains false. Nothing is pushed, published or deployed.

## Final result

The selected playable result is the exact third reviewed attempt: build `c802f58a1960e51fe70e`, runtime/assets/dependencies fingerprint `8d429fdd36d07ca9f503951af43354352f7bc9598451c06a7dcc10a2450898a7`. After round 4 introduced a new contour artifact, the builder restored the saved round-3 source byte-for-byte. This is selection of an existing reviewed attempt, not a fifth visual revision. `selected-source-audit.json` independently verifies all 124 selected files match the original round-3b evidence; 122 match baseline, with only the river shader and generated build label changed.

All four independent reviews remain verbatim under `art-reviews/`. The critic took fresh normal-HUD screenshots and watched motion from different angles/zoom levels. Scores use the owner's fixed standard, without adjustment for task scope:

| Attempt | Overall | Water | Result |
| --- | --- | --- | --- |
| 1 | 7.1 | 6.6 | Failed: regular crest rows and broad white reflection carpet |
| 2 | 7.2 | 7.0 | Failed: better breakup; broad joined glare remains |
| 3, selected | 7.3 | 7.2 | Failed: improved normal-angle separation; close white patches and distant rhythm remain |
| 4, rejected | 7.2 | 7.0 | Failed: reduced glare but new nested contour/halo lines |

The critic explicitly prefers attempt 3. No attempt passes the required overall 8.5 and zero-error gate. Stop after these four rounds; no release eligibility is asserted. Files named `candidate-captures-final`, `node-final` and `final-source-audit` refer to rejected attempt 4 and remain historical evidence. The selected result uses the explicitly named `candidate-captures-selected`, `node-selected` and `selected-source-audit` evidence instead.

After that exact restoration, the full Node suite passes **306/306**, and all **six matched browser capture visits** pass on the selected source. Each visit records unchanged source, normal HUD, runtime/request errors, actual water geometry, shader time and resource identity. Motion recordings cover normal desktop, portrait, landscape and the extra sun-facing view. No shader/runtime/request error was recorded in those six selected visits. Browser warnings, if any, remain in raw reports and must not be equated with runtime errors.

The actual Pause/Resume browser check passes: uploaded river time advances from 0.1012 to 1.4227 seconds during play, stays exactly 1.5591 throughout a 1.2659-second paused observation, then reaches 2.8611 after Resume. Mesh/material/texture identities and original geometry hashes remain stable. No clock bypass or animation while paused was added.

The first sequential A/B timing set completes all 18 windows per build with matched tools, fixtures, profiles and camera input. It records no frame over 50 or 100 ms, but it does **not** establish unchanged performance. Representative reciprocal-mean FPS observations:

| Profile/window | Before | Selected after |
| --- | ---: | ---: |
| Desktop first stationary | 80.03 | 79.80 |
| Desktop first crossing | 77.88 | 67.10 |
| Desktop repeated crossing | 77.68 | 56.93 |
| Portrait emulation first stationary | 94.20 | 94.65 |
| Portrait emulation first crossing | 66.57 | 94.57 |
| Landscape emulation first stationary | 92.94 | 92.40 |
| Landscape emulation first crossing | 86.81 | 63.28 |
| Landscape emulation repeated crossing | 63.21 | 62.97 |

Desktop repeated-crossing callback p95 rises 13.5 to 18.2 ms, while its GPU p95 rises 5.72 to 6.22 ms. The opposing portrait/desktop shifts justified one additional desktop-only A/B repeat using the unchanged driver, with neither first-set evidence nor unfavorable windows discarded.

That targeted repeat **confirms the desktop crossing regression**: first crossing 78.67 to 65.50 FPS, repeated crossing 78.42 to 56.94 FPS (about 27.4 percent lower). Repeated-crossing callback p95 is 13.3 to 18.2 ms and GPU p95 is 5.76 to 6.37 ms; stationary FPS is 80.96 to 79.36 initially and 81.48 to 80.35 on repeat. No >50 ms frames appear in either desktop repeat. The clock, geometry, source-identity and collection checks pass, but **performance acceptance is not achieved**. These remain whole-game observations with uncontrolled machine activity; the timing does not isolate the causal cost of water alone. The repeated association must not be dismissed as noise or hidden behind an aggregate phone improvement.

Full first-set frame/callback/GPU distributions, input response and query accounting are retained in `performance-final.json/.txt`. Separate `before-timing-desktop-repeat1` and `after-timing-desktop-repeat1` raw reports and execution wrappers preserve the repeat. The three-profile summary tool was not weakened to accept a one-profile run; the repeat's read-only summary is separate. This is a local review candidate with both art and performance blockers, not an optimized/accepted/released result. No fifth visual revision was made after the four-round limit.

The full baseline/final commits and tested fingerprints are repeated in every packaged text header. Original captures, motion videos, execution logs, exact source inventories and independent critic output remain in ignored `artifacts/water-polish/` and `artifacts/critic-round-XX/water/`. The flat review folder contains the required five original matched PNG pairs and ten text files; it does not contain videos or all supplementary angles.

## Critic-origin save incident and recovery

The first independent reviewer used a fresh tab at `http://127.0.0.1:4219/` in the existing Reza Chrome profile. A fresh tab does not isolate origin storage. The reviewer confirmed replacement with a new cyborg and then crawler expedition without making a pre-review save backup. Round 2 briefly continued that crawler before the parent caught the error. The reviewer corrected the isolation claim in its own round-1 report and wrote a separate factual addendum. Those statements and scores are preserved verbatim. Subsequent review uses only the previously backed-up critic origin at port 4215.

The overwritten slot is traceable to the parent's earlier carrier playtest/preview at 4219. Its recorded final serialized state exists in `artifacts/carrier-assets/exploration-final-4/report.json` from before this water task. The parent validated and restored that checkpoint through the existing Import save UI, then paused and saved it. The ordinary import flow retained the reviewer's crawler as a recovery copy. No runtime save code changed. The separate port-4214 game origin was not changed by the reviewer or recovery.

`artifacts/water-polish/save-recovery/verification.json` confirms the recovered cyborg's variant, buildings, tower order, hull, position, nodes, enemies, log, stats, damage, wood and iron exactly match the recorded checkpoint. Time advanced normally by 4.6664 seconds between import and pause. **This is an earlier checkpoint recovery, not exact recovery of the later preview's idle time, population and food.** It must not be reported as complete save preservation of that preview slot. Full local provenance, before/after storage and recovery screenshot are retained outside the flat review folder. The automated A/B, timing and clock drivers use genuinely isolated Playwright contexts and did not have this origin mistake.
