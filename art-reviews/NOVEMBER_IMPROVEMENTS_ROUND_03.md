# November improvements — independent review 03

**8.2/10 overall — FAIL. Round 3 of a maximum of 4 for the November owner update.** Ground detail is modestly better, but the larger environment and district-craft deficits remain. No new concrete visual or browser error was identified in this bounded review. The inherited native-body self-crossing requirement remains open and independently prevents release.

## Reviewed source

Checkpoint: `d05c003b3b68b5be76c5dcf7240a336e0cb7b17e`. Raw runtime fingerprint: `ddb29aae6bb29f86b5c19034b009d6a7935a3e1311c82a8945b8a071b4db9bd0`. Worktree: `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`. Actual source server: `http://127.0.0.1:4230/`. All fresh browser runs recorded the same source before and after their visits; loaded motion also verified actual served response bytes without substitution.

Predecessor round 2: `16a1f53c5d0b8b21f6c2a8fbf7d5a8da94dbcfc7`, runtime `f41007ad0d75812c35a28e7d49766c0d1106d25ca4a53d5eac28f545b1c0381e`, 8.2/10 FAIL. November baseline remains `3e060c2a83e5b9db80c0fb5c1581d4b9c5598d36`, runtime `db30d10d30472fd3a0b68f309fd3ad1aefbc7dfaeb425f78893f87e1f2123e0a`. Earlier failed cycles are not reopened or erased.

I checked the committed runtime diff: only `src/painterly-surfaces.js` changed since round 2. Existing packed brush alpha contributes restrained turf/clod albedo; steep mineral faces receive smooth upright projections of the shared rock map. The runtime file is 11,928 bytes, SHA-256 `01d8c7b1efd89a856a7ab2dd8762bdd29cc9a8d39d9259a212f9ee6642fff0c9`. No new texture image source, scenery placement, terrain mesh, normal, river or gameplay change is in this round. The latest low flesh saddle, half-height vertical cyborg city and six-carrier systems remain the design baseline.

I am a separate critic and wrote no implementation, assets, tests or capture scripts. I used existing tools for my own fresh captures and inspected original images. The November work group remains within the current evidence-retention inventory. GPU access was coordinated and released, along with the frozen-source hold, after the browser runs completed. Only report work and local decoding followed.

## Own fresh evidence

Paths below are under `artifacts/critic-round-03/nov10-improvements/`. Times are 10 November 2026 UTC.

| Visit | Start–finish | Exit | Result |
| --- | --- | --- | --- |
| `capture` — five matched AFTER views | 17:19:37.786–17:21:56.879 | 0 | Five passed |
| `populated-day` — 20 districts, front/side/City, walking and turning | 17:22:12.514–17:23:05.816 | 0 | Passed |
| `populated-night` — same full-city movement in night lighting | 17:23:06.096–17:24:02.560 | 0 | Passed |

Five-view command: `node tests/art-remake-playtest.mjs`; tool SHA-256 `35a3acb127391e48809975b43f7a9501ee32765449a6da71e6fccd12d69dc6ce`. Environment: active worktree `SOURCE_ROOT` and `FIXTURE_ROOT`, `GAME_TEST_URL=http://127.0.0.1:4230/`, `OUTPUT_DIR=artifacts/critic-round-03/nov10-improvements/capture`, `MODE=capture`, `RUN_LABEL=AFTER`, `CAPTURE_VARIANT=flesh`, `HEADLESS=1`, `RECORD_VIDEO=1`, `OBSERVE_FRAMES=90`. The report retains exact command, browser, image hashes and source fingerprints.

I inspected every original matched image:

| Original PNG | Dimensions | SHA-256 |
| --- | --- | --- |
| `AFTER-desktop-normal-city.png` | 1440 × 960 | `798fae9e84a860fc04d46cdb462800e648a7cbb8c50590d9753b63a913b39a39` |
| `AFTER-desktop-reverse.png` | 1440 × 960 | `a474bbe4be33e2240c7e15601eb749b1a3c5a6c5f37db0af894e778e6f2ccae5` |
| `AFTER-desktop-close.png` | 1440 × 960 | `a5c00ab743771e7ef3aa6b642fb59eeadc4739cd2383565094dc38385f00078f` |
| `AFTER-phone-portrait-city.png` | 780 × 1688 | `5923b487e3925b7ec9fa6dc9b448a754eb69c5681bff13c7eb4d8718efeea837` |
| `AFTER-phone-landscape-city.png` | 1688 × 780 | `1f6b560bf5f9c2f6350c3da4fdfe6357e35d750d1e18738210d2290abf51288c` |

Fixture SHA remains `6db0c30c4a62c6a8dce0b01eaa8b16a4aec98bd6ba9d66460491a5397aa7a5ec`. The actual `cameraInput`/`capture.camera` records show normal and phone City yaw 2.35, pitch 0.28, zoom 40; reverse yaw about 5.49159253; close zoom about 30. These match the prior matched views. The report's top-level visit presets retain older generic camera defaults; the actual resolved native camera records establish the used framing. Elapsed simulation time and animation phase are not claimed identical. I directly compared my round 3 normal/reverse originals with my round 2 originals. No retouching, crop or upscale was performed. Phone screenshots are desktop Chrome emulation, **not a physical iPhone or Safari pass**.

Loaded motion command: `node tests/native-beast-motion-playtest.mjs`; unchanged tool SHA-256 `e400e642e5f8c7704c2708434dce3540d4b21e03d76c6eb779e7f131cdf59338`. Both visits used `SCENARIO=populated`, `HEADLESS=1`, the same URL, exact `EXPECTED_RUNTIME_SHA=ddb29aae6bb29f86b5c19034b009d6a7935a3e1311c82a8945b8a071b4db9bd0`, distinct output folders and `LIGHT=day` or `night`. The tool prepares a valid isolated 20-district fixture through production APIs before entry, then uses native lighting, orbit/wheel and W/D controls. It does not claim all 20 districts were built through UI during these visits.

I inspected original front, side, walking, turning and normal City PNGs from both lighting visits, including the ordinary HUD and visible environment. Native W/D observations recorded 108/60 frames by day and 109/60 at night. The reports verified source/commit unchanged and actual served bytes, zero page errors, failed requests, remote requests, context loss and shader failures. Precision warnings remain recorded. Browser: Windows Chrome 157.0.8103.40, headless D3D11 on RTX 4070 Ti SUPER.

I decoded full frames from each original WebM with `C:\Users\user\AppData\Local\ms-playwright\ffmpeg-1011\ffmpeg-win64.exe`, using `-hide_banner -loglevel error -sseof -17 -i ORIGINAL_WEBM -r 2 -frames:v 34 -n decoded-populated-LIGHT/frame-%03d.png`. Both commands exited 0. Day decode: 17:24:02.0324429–17:24:02.7222975 UTC, original `populated-day/motion/page@d8f05b5836b032250e17f917f2b5f3a9.webm`. Night decode: 17:24:39.3220129–17:24:40.0264095 UTC, original `populated-night/motion/page@4ff959d6b8a9087dc1a3ee0bf2a03e2f.webm`. I inspected day frames 009, 013, 017, 021, 025 and night frames 011, 017, 023, 029. The samples show changing pose, heading and ground framing through native motion. These are lossy-video temporal supplements, not substitutes for original PNGs; this sampling cannot exclude every brief temporal artifact.

## Visual assessment

**The material revision is a small improvement.** Unequal pale turf/clod marks now break up some of the previously smooth foreground colour, especially around the wide front and side views. The treatment is restrained enough that it does not distract from the beast or obscure ground cover and shore detail. I did not identify a new hard projection seam or distracting texture jump in the inspected views and temporal samples.

**It does not change the dominant environment impression.** Large green/ochre masses and broad grey banded mineral faces still read as simplified surfaces. The steep-face projection change is subtle at these normal gameplay distances; I cannot claim a substantial cliff transformation from these images. Thin repeated tree crowns and sparse, similarly shaped trunks still contrast strongly with the detailed beast. Ruins, riverbanks, scattered logs, stones and physical vegetation provide context, but added ground tone alone does not produce AAA material consistency.

**The full city retains its strengths and its repetition.** The low city and straps remain close to the torso in both light states and the inspected movement. The rounded timber gun ribs and low keep crown from round 2 remain improvements. At 20 districts, regular rows of similar dark-roof houses, platform cells, railings and canopy frames still make the settlement read as repeated prefabs on shelves. The new ground shader does not address this deficit, and it would be inappropriate to increase the carrier score for an unrelated change.

**Normal gameplay remains readable in the checked cases.** Day/night lighting preserves the beast outline and the warm city-window cues. The HUD stays readable in desktop and phone-emulated frames. I did not observe a new detached district, large stray strap loop, missing actor or newly obvious skin hole. These bounded observations do not certify all native skin poses or clear the known geometry failure.

## Defects and predecessor evidence

**N01-E1 — native connected-body self-crossing: OPEN.** Round 1's final full-suite receipt, `artifacts/nov10-improvements/checks/full-suite-final-01/report.json` and `output.txt`, records 448 tests, 447 pass and one fail, exit 1, at 16:25:13.277–16:31:32.175 UTC. The failure is `native connected body avoids self-crossing through representative gait and six-target strike/recovery poses` in `tests/beast-integration-native-self.test.mjs`. Examples include 496 crossing pairs at gait-60 and 1361 at cyborg-strike-31; these include source-related pairs and are not counts of separate visible holes.

That suite belongs to round 1 source and was not rerun by this critic for the shader-only round. The active native GLB remains SHA-256 `85cb7024f72e23737a1a64981d763dfbc9204f0c6a5dc65fa413df55455035a3`; the pose/controller and skin-corrective runtime have not changed since round 2. No repair or passing replacement evidence has been supplied for the required failure. A different ground material, successful movement capture or attractive selected pose cannot close it.

**N01-E2 — first-fit flesh reload exception/wrong visible actor: remains closed for the cases independently reproduced in round 2.** My round 2 exact saved-clock and time-zero checks verified the rendered flesh actor, loaded-state association, fitted harness, preserved four districts and post-reload native animation; the ordinary flesh new-game/build/save/reload smoke also passed. Those are predecessor evidence on `f41007ad...`, not freshly rerun round 3 results. The only changed runtime is ground shading, so unrelated reload and drill/cyborg combat cases were not repeated. Their original results and limitations remain in `NOVEMBER_IMPROVEMENTS_ROUND_02.md` and its evidence folders. No complete six-carrier or campaign pass is claimed for this round.

No additional concrete defect is identified by this bounded round. The following quality deficits are separate from the open native-body error.

## Ranked remaining quality work

1. **Environment material and form hierarchy.** The new foreground tone is useful but insufficient to reconcile broad banded cliff/ground masses, sparse repeated canopy forms and the highly detailed beast. Further work should improve coherent medium-scale material/form information without simply raising noise everywhere or changing terrain gameplay.
2. **Full-city district identity.** Stronger differentiation of functional buildings, roof profiles and local material values within established clearances would reduce the repeated shelf impression. Preserve low flesh fitting, resident scale, IDs, order, capacity and construction rules. This is not a request for the superseded tall flesh castle.
3. **Lower-priority polish.** Refine selected support joins, district accents and focal hierarchy at normal zoom. Preserve the improved timber ribs, readable night windows and restrained HUD. These cosmetic opportunities do not remove N01-E1.

## Scores, validation limits and gate

The fixed scale remains 5 for programmer art, 7 for good indie and at least 8.5 for the AAA-quality gate. An implementation attempt does not automatically earn a score increase.

| Area | Round 3 score | Assessment |
| --- | --- | --- |
| Carrier and saddle presentation | 8.4 | Unchanged low-fit strengths and repeated district limitation |
| Environment | 7.8 | Modest foreground tonal improvement; broader consistency gap persists |
| HUD and normal gameplay legibility | 8.0 | Readable checked views; physical-device behavior unverified here |
| Game design as observed | 8.1 | Preserved observed loop; no new gameplay change or campaign certification |
| Aesthetics overall | 8.3 | Small material improvement does not transform the whole scene |
| **Overall** | **8.2** | **Below 8.5, with N01-E1 still open** |

The five 90-frame RAF windows recorded means 27.6678, 27.1122, 25.4467, 26.4456 and 24.5556 ms; p95 was approximately 30.1 ms in each. These are descriptive recorded-browser observations, not controlled before/after performance tests, GPU timing or iPhone performance evidence. No speedup is claimed; the shader adds texture reads and has not been independently benchmarked here.

I read the builder receipt `artifacts/nov10-improvements/ground-material/round3-builder-receipt.json`, its preservation description and retained-failure disclosure. The receipt was created before the final checkpoint, so its `currentCommit` is the round 2 commit; its runtime fingerprint matches this review. It reports matching terrain/scenery/geometry/normals/river and 27 texture sources, 9 relevant unit passes, five Chrome views and two Windows WebKit gameplay cases. Its recorded checks all exited 0 with unchanged inputs: paired identity 17:12:46.448–17:13:03.317, units 17:13:17.198–17:13:22.933, Chrome wrapper 17:13:30.203–17:15:12.199, WebKit wrapper 17:15:21.340–17:17:12.250 UTC. The earlier identity attempt failed on LF/CRLF function-source comparison; that failure remains retained and the later normalization was confined to source-string line endings. These are builder checks, not critic-owned fresh runs or a physical iPhone/Safari result.

**Release remains blocked. One round remains in the current November cycle.** The material change is reviewable and modestly better, but neither the required overall score nor the zero-error gate is satisfied. Prior review scores, concrete blockers and round limits remain intact.
