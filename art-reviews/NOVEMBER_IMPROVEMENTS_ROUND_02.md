# November improvements — independent review 02

**8.2/10 overall — FAIL. Round 2 of a maximum of 4 for the November owner update.** The reproduced flesh reload failure is resolved, and the gun supports and keep fit the saddle more coherently. The remaining native-body self-crossing blocker is still open. The environment and repeated district modules also remain below the fixed 8.5 visual standard.

## Revision and independence

Reviewed checkpoint: `16a1f53c5d0b8b21f6c2a8fbf7d5a8da94dbcfc7`, worktree `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`, actual source server `http://127.0.0.1:4230/`. Runtime fingerprint: `f41007ad0d75812c35a28e7d49766c0d1106d25ca4a53d5eac28f545b1c0381e`. Every completed browser visit below recorded this unchanged source before and after the run. Loaded motion visits also verified actual served response identity, without response substitution.

Round 1 reviewed `cc296e315351cbd8270108c6205052f78fe1f449`, runtime `79c38aa4b00af199fe94b5c8689008aa987480fdd0d660546498f7dc1177c3f4`, and scored 8.0/10 overall. Its score and findings remain unchanged. November's baseline is `3e060c2a83e5b9db80c0fb5c1581d4b9c5598d36`, runtime `db30d10d30472fd3a0b68f309fd3ad1aefbc7dfaeb425f78893f87e1f2123e0a`. The earlier beast cycle ended at round 4 and remains closed and failed; this report does not reset it.

Changes since round 1: a Hips-bound interior witness for first harness fitting, projected only within each existing slice plane; rounded timber gun ribs; clipped gun trays; and a distinct low stone keep crown. The witness change retains the strict closed-contour requirement, plane positions and widths. Native GLB, game rules, district IDs, capacity, weapon envelopes and deck collision dimensions were not changed by this round. The latest owner design remains a low flesh saddle and half-height vertical cyborg castle, with all six carrier variants retained.

I am a separate critic. I wrote no implementation, assets, tests or capture scripts. I ran existing capture/regression tools and inspected my own fresh original screenshots and temporal samples. November remains a current retained evidence group; no evidence cleanup was due or performed. GPU access was coordinated with the mobile agent. I released it and the source hold after browser captures completed.

## Fresh review evidence

All folders in this table are under `artifacts/critic-round-02/nov10-improvements/`. Times are 10 November 2026 UTC. Each original report retains the exact command/environment and source identity.

| Visit | Start–finish | Exit | Result |
| --- | --- | --- | --- |
| `capture` — five matched AFTER views | 16:56:25.572–16:58:46.099 | 0 | Five passed |
| `exact-reload-check` wrapping `exact-reload` | 16:59:01.821–17:00:12.362 | 0 | Saved clock and time-zero regressions passed |
| `smoke-flesh` — native new game through save/reload | 17:00:23.486–17:01:15.871 | 0 | Passed |
| `populated-day` — 20 districts, walk, turn, recovery | 17:01:39.939–17:02:34.079 | 0 | Passed |
| `populated-night` — same loaded motion at night | 17:02:34.360–17:03:31.488 | 0 | Passed |
| `combat-drill` — full city, melee and recovery | 17:03:31.772–17:04:09.334 | 0 | Passed |
| `combat-cyborg` — full city, melee and recovery | 17:04:09.607–17:04:48.164 | 0 | Passed |

Five-view and smoke command: `node tests/art-remake-playtest.mjs`, SHA-256 `35a3acb127391e48809975b43f7a9501ee32765449a6da71e6fccd12d69dc6ce`. Both used active worktree `SOURCE_ROOT` and `FIXTURE_ROOT`, the URL above, `HEADLESS=1`, `RUN_LABEL=AFTER`, `RECORD_VIDEO=1`, and distinct output folders. Five-view capture used `MODE=capture`, `CAPTURE_VARIANT=flesh`, `OBSERVE_FRAMES=90`; smoke used `MODE=smoke`, `VARIANT=flesh`.

The matched fixture SHA remains `6db0c30c4a62c6a8dce0b01eaa8b16a4aec98bd6ba9d66460491a5397aa7a5ec`. Normal and phone City framing is yaw 2.35, pitch 0.28, zoom 40; reverse adds PI and close uses zoom 30. This matches November BEFORE and round 1 framing. Elapsed simulation time and animation phase are not claimed identical. I inspected all five original PNGs: `AFTER-desktop-normal-city.png`, `AFTER-desktop-reverse.png`, `AFTER-desktop-close.png`, `AFTER-phone-portrait-city.png`, `AFTER-phone-landscape-city.png`. Desktop originals are 1440 × 960; phone originals are 780 × 1688 and 1688 × 780. No retouching, cropping or upscaling was used. Phone views are Chrome emulation, **not physical iPhone or Safari evidence**.

Exact reload command: `node scripts/record-development-check.mjs artifacts/critic-round-02/nov10-improvements/exact-reload-check tests/flesh-harness-reload-browser.mjs artifacts/critic-round-02/nov10-improvements/exact-reload`, with the URL above. Existing test SHA-256 is `69174629ff319a581afa2736e21b15c3cff44e8327f0cede176de2ca9b535bc3`. The wrapper records exact source and `changedInputs: []`; the browser report records the actual actor checks. I inspected both original post-reload PNGs and the ordinary flesh smoke PNG.

Loaded motion command: `node tests/native-beast-motion-playtest.mjs`, unchanged tool SHA-256 `e400e642e5f8c7704c2708434dce3540d4b21e03d76c6eb779e7f131cdf59338`. All four visits used the URL above, `HEADLESS=1`, `EXPECTED_RUNTIME_SHA=f41007ad0d75812c35a28e7d49766c0d1106d25ca4a53d5eac28f545b1c0381e`, and distinct output folders. Populated visits used `SCENARIO=populated` and `LIGHT=day` or `night`. Combat used `SCENARIO=combat`, `FULL_CITY=1`, `LIGHT=day`, and `COMBAT_TARGET=drill` or `cyborg`. Valid isolated fixtures were prepared through production APIs before startup; movement, lighting, camera and combat then used native controls. This does not claim all 20 districts were constructed through UI during these runs.

I inspected the original full-saddle front, side, City, walking and turning PNGs in both lighting visits, and original melee-ready, impact-window and recovery PNGs in both combats. All visits used the ordinary HUD. Chrome was Windows 157.0.8103.40, headless, D3D11 on RTX 4070 Ti SUPER. All completed visits recorded zero page/console errors and failed requests; loaded visits also recorded zero remote requests, context loss, shader failures or served-identity errors. Precision warnings are retained in the reports and were not described as shader failures.

For temporal inspection, I decoded full frames from the original WebMs using `C:\Users\user\AppData\Local\ms-playwright\ffmpeg-1011\ffmpeg-win64.exe`. Command pattern: `-hide_banner -loglevel error -sseof NEGATIVE_SECONDS -i ORIGINAL_WEBM -r RATE -frames:v COUNT -n decoded-CASE/frame-%03d.png`. Populated visits used the last 17 seconds, rate 2, count 34; combats used the last 7 seconds, rate 5, count 35. The four commands exited 0 at these UTC intervals: day 17:05:53.0102515–17:05:53.6665238; night 17:05:53.6803889–17:05:54.4247455; drill 17:05:54.4294839–17:05:54.8802501; cyborg 17:05:54.8840120–17:05:55.2003227. Original WebMs remain in each visit's `motion` folder. I inspected day frames 009, 013, 017, 021, 025; night 011, 017, 023, 029; drill and cyborg 009, 017, 021, 029. These lossy-video frames supplement motion review; they do not replace original gameplay PNG evidence.

## Findings

The low saddle fit remains the strongest improvement in this update. The starter city stays close to the back in ordinary, reverse, close and both phone views. At capacity, the load remains wrapped around the torso and flanks rather than returning to tall unsupported poles. The revised timber-coloured curved ribs and clipped tray edges blend with the cradle more naturally than the prior thin right-angle pipe silhouette. The low stone keep crown is distinguishable from the housing roofs. These changes are visible but modest at ordinary gameplay scale.

The moving city follows the creature through the inspected walk, turn, recovery and combat samples. Straps remain close in those bounded views; I did not see a newly detached district, giant strap loop or new obvious skin hole. Alternating feet, changing heading and body motion are visible in the temporal samples. Selected attractive poses do not certify every deformation or overrule the native-body test failure below.

Both full-city combat sequences remain readable. The drill sequence shows forelimb movement toward the forward drill region, impact feedback, and recovery; enemy hull changes from 469 to 427. The cyborg sequence shows raised forelimbs, lower-body impact feedback, and recovery; enemy hull changes from 378 to 336. The cargo stays with the actor in the inspected sequence. These are bounded strikes, not a complete combat balance review.

The normal HUD remains legible, and the native flesh smoke now reaches post-reload gameplay with the correct beast visibly present. District inspection, capacity and food-rate labels survive. The other five carrier smoke passes from round 1 are retained evidence for that prior source, **not represented as freshly rerun round 2 checks**. This round's focused source changes did not justify repeating them. I did not complete a campaign, test every planning route, certify long-session performance or test a physical phone.

## Concrete defect status

### N01-E1 — native connected-body self-crossing: OPEN

The required native-skin failure remains a release blocker. Round 1's final full suite at `artifacts/nov10-improvements/checks/full-suite-final-01/report.json` and `output.txt` ran `node --test --test-concurrency=2 tests/*.test.mjs` at 16:25:13.277–16:31:32.175 UTC, exit 1: 448 tests, 447 pass, 1 fail. The failed test was `native connected body avoids self-crossing through representative gait and six-target strike/recovery poses` in `tests/beast-integration-native-self.test.mjs`. Diagnostic examples include 496 intersections at gait-60 and 1361 at cyborg-strike-31; these include source-related pairs and are not counts of separately visible holes.

That full suite was on round 1 source, not this checkpoint, and I did not rerun it. The active native GLB remains SHA-256 `85cb7024f72e23737a1a64981d763dfbc9204f0c6a5dc65fa413df55455035a3`; this round supplies no anatomical repair or passing replacement evidence for the failed requirement. Harness first-fit and saddle appearance improvements do not clear it. A later full-suite result must be reported under its own source identity.

### N01-E2 — flesh first-fit exception and wrong actor after reload: RESOLVED FOR REPRODUCED CASES

Round 1 recorded `Expected one closed origin-containing contour, found 0; invalidComponents=0` after a native flesh save/reload; the HUD described flesh while the visible actor was the cyborg. The separate baseline audit established that the first-fit contour failure was inherited, not introduced by the November saddle lowering. I independently read the audit receipt, exact script and raw output before this review; its attribution was appended to round 1 without changing that score or defect finding.

The preserved audit is `artifacts/nov10-improvements/diagnostics/harness-baseline-inheritance-receipt.json`, with `harness-baseline-inheritance.mjs` and `harness-baseline-inheritance-output.txt`. The retained rerun exited 0 at 16:46:30.1933761–16:46:34.0894833 UTC. All 78 frozen baseline module hashes matched the manifest and Git `3e060c2a83e5b9db80c0fb5c1581d4b9c5598d36` after CRLF normalization; reused assets stayed stable. The exact saved location failed first fit at both saved clock and zero clock while the starter succeeded. That CPU evidence proves inherited first-fit failure, not a baseline browser screenshot of the wrong cyborg.

My fresh round 2 regression uses the original failing location x −33.13126537296777, z 43.09271052218807, heading −0.7915926535897931, with four districts and times 8.530299999999984 and 0. In each isolated case it continues, pauses, saves, reloads, continues again and observes native animation. Six snapshots verify flesh state, rendered variant and native body; loaded-state/active-actor agreement; no faction-preview actor; fitted harness; correct position; preserved districts/order; intact context and HUD. Both post-reload originals visibly show the correct flesh beast and city. No exception or failed request occurred.

The separate ordinary native flesh smoke also passes new-game selection, W movement, sawmill construction, pause, save, reload and Continue, with the correct four-district beast visible. Together these observations close the reproduced N01-E2 cases. They are not a claim that every possible save location has been exhaustively covered.

## Ranked visual quality work

These are craft deficits and polish opportunities, not additional proven runtime defects.

1. **Environment consistency remains the largest visible quality deficit.** Broad smooth ground colour patches and grey mineral slopes lack the material structure present on the creature. Thin repeated tree canopies make the contrast more obvious in wide and side views. The river, bank stones, ruins, logs and ground cover add context, but the overall material/scale consistency is below AAA. Ground and steep-slope material refinement is a relevant next attempt; adding more unrelated props would not by itself solve this.
2. **At 20 districts the city still reads as repeated little buildings on shelves.** The low keep crown adds hierarchy, but the many similar dark roof shapes, rectangular platform cells and repeated rail/canopy edges dominate normal City view. Further district-specific silhouette/material variation within the established clearances could improve settlement identity. This is not a request to restore the superseded tall flesh castle or change capacity/layout rules.
3. **The gun support revision is better; remaining silhouette refinement is lower priority.** The ribs are now warmer and rounder and the square trays less abrupt. Small-scale joining and material hierarchy could be more convincing, but I do not identify an unsupported or detached gun from these images.
4. **Ordinary polish:** selective district accent colour, less uniform roof values and stronger local focal hierarchy would help residents and functional buildings read at normal zoom. Retain the readable warm night windows and restrained HUD. None of these preferences waive N01-E1.

## Scores and gate

Fixed standard: 5 is programmer art, 7 is good indie, and at least 8.5 is AAA-level quality for the required gate. Scores are independent judgments, not an average manufactured to meet a target.

| Area | Score | Reason |
| --- | --- | --- |
| Carrier and saddle presentation | 8.4 | Convincing low fit and detailed beast; improved supports, but repeated district craft remains evident |
| Environment | 7.7 | Populated and readable, with broad smooth surfaces and repeated canopy forms |
| HUD and normal gameplay legibility | 8.0 | Coherent, readable desktop and emulated phone views; physical device behavior unverified here |
| Game design as observed | 8.1 | Preserved construction/management/combat loop; reproduced reload failure fixed, broader campaign not exhausted |
| Aesthetics overall | 8.3 | A modest coherent improvement, still uneven beside the hero asset |
| **Overall** | **8.2** | **Below 8.5 and N01-E1 remains open** |

The five 90-frame recorded RAF windows had means 27.8889, 28.5556, 25.5556, 25.6678 and 26.2222 ms; p95 values 30.2, 30.1, 30.1, 30.1 and 39.9 ms. These are descriptive capture observations. They are not controlled before/after benchmarks, GPU timing, or iPhone performance evidence. Round 1 overlapped a CPU suite, recording adds overhead, and no comparative speedup is claimed.

Builder receipts read separately: `artifacts/nov10-improvements/saddle/round2-builder-receipt.json`, targeted final 29/29 (16:50:29.960–16:53:01.279, exit 0), harness-frame final 2/2 (16:53:42.162–16:54:14.680, exit 0), and the builder's own focused reload/close receipts. Those support strict fit and geometry preservation; they are not substituted for my fresh browser and image evidence.

**Release remains blocked.** Round 2 does not reach 8.5 and the concrete inherited native-body requirement still fails without a passing repair. Two rounds remain in this November cycle. Neither more attractive screenshots nor a later packaging/delivery step can convert this report into a pass.
