# November improvements — independent review 01

**8.0/10 overall — FAIL. Round 1 of a maximum of 4 for the November owner update.** The saddle refit is visibly better, but a freshly observed flesh save/reload exception leaves the wrong carrier on screen. The known native-body self-crossing failure also remains open. Neither the new work nor this review clears an older release blocker.

## Revision and scope

Reviewed implementation: `cc296e315351cbd8270108c6205052f78fe1f449` in `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`, served directly at `http://127.0.0.1:4230/`. Raw runtime fingerprint: `79c38aa4b00af199fe94b5c8689008aa987480fdd0d660546498f7dc1177c3f4`. The completed capture and motion reports verify the same fingerprint before and after their visits. No alternate source responses or retouched images were used.

November baseline: `3e060c2a83e5b9db80c0fb5c1581d4b9c5598d36`, raw runtime `db30d10d30472fd3a0b68f309fd3ad1aefbc7dfaeb425f78893f87e1f2123e0a`. The previous beast review ended at 8.1/10, round 4 of 4; it remains unchanged. This is the first independent review of the newer owner-approved low-saddle refit and gameplay improvements.

Changes reviewed include the body-following low cargo attachment, lower district mounts and short cradle supports, repositioned gun brackets, roof variation, resource planning and district overview, and the food-harvest ordering correction. The latest design remains a low flesh saddle and half-height vertical cyborg castle. The six carrier variants, saves and district identities must be preserved. A passing art score is not permission to alter those systems.

I am a separate critic. I wrote no implementation, assets, tests or capture scripts. I checked the retention inventory before producing evidence; November is one of the current four retained groups. No cleanup was due or performed by this critic.

## Fresh evidence

All paths below are beneath `artifacts/critic-round-01/nov10-improvements/`. Each folder contains its original report and captures. Dates are 10 November 2026 UTC.

| Visit | Start–finish | Exit | Result |
| --- | --- | --- | --- |
| `capture` — five matched desktop/phone views | 16:26:25.123–16:29:27.553 | 0 | Five passed |
| `populated-day` — 20 districts, walk, turn, recovery | 16:29:41.883–16:30:58.141 | 0 | Passed |
| `populated-night` — same loaded motion | 16:31:10.619–16:32:12.276 | 0 | Passed |
| `combat-drill` — loaded melee and recovery | 16:32:45.195–16:33:22.828 | 0 | Passed |
| `combat-cyborg` — loaded melee and recovery | 16:33:49.383–16:34:27.602 | 0 | Passed |
| `six-carrier-smoke` | 16:34:57.563–16:36:24.175 | 1 | Cyborg passed; flesh failed; remaining variants not reached |
| `smoke-standard` | 16:37:15.487–16:38:06.697 | 0 | Passed |
| `smoke-drill` | 16:38:06.922–16:38:57.722 | 0 | Passed |
| `smoke-horizontal` | 16:38:57.950–16:39:48.142 | 0 | Passed |
| `smoke-vertical` | 16:39:48.362–16:40:38.720 | 0 | Passed |

I used the existing `node tests/art-remake-playtest.mjs` with `SOURCE_ROOT` and `FIXTURE_ROOT` set to the active worktree, `GAME_TEST_URL=http://127.0.0.1:4230/`, `HEADLESS=1`, `RUN_LABEL=AFTER`, `RECORD_VIDEO=1`, and a distinct `OUTPUT_DIR` for every run. The five-view run used `MODE=capture`, `CAPTURE_VARIANT=flesh`, and `OBSERVE_FRAMES=90`. The smoke runs used `MODE=smoke`; the four follow-ups set `VARIANT` to the named unvisited carrier. Tool SHA-256: `35a3acb127391e48809975b43f7a9501ee32765449a6da71e6fccd12d69dc6ce`.

The matched fixture SHA is `6db0c30c4a62c6a8dce0b01eaa8b16a4aec98bd6ba9d66460491a5397aa7a5ec`, matching the November BEFORE report in `artifacts/nov10-improvements/baseline/report.json`. Normal and phone City framing is yaw 2.35, pitch 0.28, zoom 40; reverse adds PI to yaw and close uses zoom 30. Animation phase and elapsed simulation time are not claimed identical. I inspected all five original AFTER PNGs and the preserved BEFORE normal City original. These are ordinary HUD views, including the actual default City framing, not beauty shots substituted for gameplay.

For loaded motion I ran the unchanged `node tests/native-beast-motion-playtest.mjs`, SHA-256 `e400e642e5f8c7704c2708434dce3540d4b21e03d76c6eb779e7f131cdf59338`, with the exact `EXPECTED_RUNTIME_SHA`, URL above, `HEADLESS=1`, and separate output folders. Populated visits used `SCENARIO=populated` and `LIGHT=day` or `night`; combat used `SCENARIO=combat`, `FULL_CITY=1`, `LIGHT=day`, and the named `COMBAT_TARGET`. Valid isolated saves were prepared through the production APIs before entry. Movement and attack then used native controls. This does not claim that all 20 districts were built through the UI during these visits.

The browser was Windows Chrome 157.0.8103.40 with D3D11 on the RTX 4070 Ti SUPER. Phone images are Chrome viewport/touch emulation, **not physical iPhone or Safari verification**. All completed motion visits had zero recorded page errors, failed requests, remote requests, context loss or shader failures and verified actual served runtime bytes. Precision warnings remain in the reports. The flesh smoke exception is explicitly excluded from those passing statements.

I inspected the original day/night front, side, moving, turning and normal City PNGs and the ready/impact/recovery PNGs for both combats. For temporal inspection I decoded full frames from the original WebMs using the installed Playwright `ffmpeg-1011/ffmpeg-win64.exe`: last 17 seconds at `-r 2 -frames:v 34` for day/night, last 7 seconds at `-r 5 -frames:v 35` for both combats. The common command was `-hide_banner -loglevel error -sseof NEGATIVE_SECONDS -i ORIGINAL_WEBM -r RATE -frames:v COUNT -n decoded-DESCRIPTION/frame-%03d.png`. All four successful decode commands exited 0. These are lossy-video inspection frames, not original PNG substitutes. Inspected day frames: 005,009,013,017,021,025; night: 005,011,017,023,029; drill and cyborg: 009,017,021,029. Original recordings remain alongside the reports. Initial attempts with FFmpeg 1013 failed on the unavailable `fps` filter, then the unavailable VP8 decoder, both exit 1; no failed decode was represented as evidence. Exact decode start/finish timestamps were not recorded.

## Findings

**The main low-saddle proportion problem is substantially improved.** The BEFORE normal City image has three starter districts and guns perched high on thin uprights. The fresh AFTER normal/reverse/close images put the same small city close to the shoulders and back with a visible cradle. The large air gap is gone. This remains evident in portrait and landscape. The update has not merely moved the camera to conceal the old supports.

At 20 districts, the load stays low around the torso and flanks. Day and night walk/turn sequences show the city remaining with the body through motion and recovery. The day visit observed 54/30 native W/D frames and night 91/51. These controller observations supplement the image inspection; they do not replace actual-surface collision checks.

**The frame and districts remain less convincing than the creature.** The front guns sit on visually thin right-angle/dogleg brackets with square tray bases. Their exposed pipe-like silhouette is especially apparent in the three starter-district views. At capacity, repeated roof, platform and railing modules dominate the city. The smaller roof variations help, and residents add scale, but the load still reads as many similar little prefabs on shelves rather than a thoroughly designed settlement. I can see supporting structure; this is a craft/proportion criticism, not an unsupported assertion that the platforms are floating.

**The native beast remains a strong focal asset.** Horns, face, shoulder mass, toes and hide read well in the front/side originals. Walk and turn samples show alternating feet and body movement; selected recovery samples do not show a newly detached limb or giant strap loop. I did not identify a new definite skin hole from these bounded views. That does not clear the strict self-crossing failure below or certify every moving pose.

**Loaded combat remains readable.** Drill contact shows a forward bound/forelimb action at the drill's leading region and recovery; enemy hull changes 469 to 427. Cyborg contact shows the forelimbs rising to its lower body and returning, with enemy hull 378 to 336. The recordings retain 47 drill and 52 cyborg native strike observations. The lowered cargo remains with the actor in the inspected sequences.

**The environment still has uneven craft.** Ruins, logs, fences, crops, riverbanks and ground cover give the world context. Broad smooth terrain/cliff colour transitions, repeated thin canopies and simple shelf edges remain conspicuous beside the detailed beast. These views do not support an AAA environment score. Warm night windows are useful focal cues without making the overall scene unreadable.

The normal HUD is readable in the matched desktop and emulated phone views. District counts and net-food wording are present. The bounded smoke sequences exercise native selection, movement, construction, pause, save and reload. Five carrier variants completed that sequence. The sixth produced the concrete error below. I did not independently complete the campaign, test every resource route or certify long-session mobile performance.

## Concrete defects

### N01-E1 — native connected-body self-crossing remains open

I read the final candidate receipt and output at `artifacts/nov10-improvements/checks/full-suite-final-01/report.json` and `output.txt`. `node --test --test-concurrency=2 tests/*.test.mjs` ran **16:25:13.277–16:31:32.175 UTC**, exit **1**, **448 tests: 447 pass, 1 fail**. Inputs were unchanged and its runtime fingerprint matches this review.

The failed test is `native connected body avoids self-crossing through representative gait and six-target strike/recovery poses` in `tests/beast-integration-native-self.test.mjs`. Diagnostic samples include 496 intersections at gait-60 and 1361 at cyborg-strike-31. Counts include source-related pairs; they are not counts of separately visible holes. The active native GLB remains unchanged. Successful saddle-clearance checks and attractive selected poses do not waive this required failure.

### N01-E2 — flesh save/reload can leave a cyborg image under flesh HUD

This was freshly observed in my native six-carrier smoke, not inferred from a builder claim. `six-carrier-smoke/report.json` records the browser error:

`Expected one closed origin-containing contour, found0; invalidComponents=0`

The original `six-carrier-smoke/AFTER-smoke-flesh.png` shows **FLESH TITAN**, four districts and the flesh saddle build wording, but the rendered actor is a **cyborg with a vertical castle**. Saved/restored state still identifies flesh. This is a visible incorrect result plus a runtime exception, not an ordinary precision warning.

The existing runner uses native faction/variant selection, Begin/Restart, W movement, sawmill construction, P, Save, page reload and Continue. For this visit movement ended at x=-33.13126537296777, z=43.09271052218807, angle=-0.7915926535897931. Sawmill slot 0 completed; order was [7,11,13,0]. The recorded restored time was 8.530299999999984. Saved JSON SHA-256: `b997e2df7ad60aa73525f8514ba7608942ab1d83eba84f146547f86ec79c1d53`. The final wrong-carrier PNG SHA-256 is `7ec1b6c3a20a71d3f76c4120993dabc42be9dbd3cd4138e9a24e8e36ad570e61`.

The run aborted at the final no-errors assertion, after saving its image and state observations. Its report therefore lacks a sourceFinish snapshot; do not fabricate one. It records the reviewed sourceStart, and the subsequent separately completed four carrier visits verify the same runtime. The report stores the exception text, not a browser-side stack identifying its throw site. At capture time, the exact cause and whether this was a newly introduced regression or an exposed latent defect were unproven. Do not declare the saved data corrupted merely because rendering failed, and do not catch-and-hide the exception as a repair.

**Attribution addendum, following the baseline audit:** I subsequently read `artifacts/nov10-improvements/diagnostics/harness-baseline-inheritance-receipt.json`, the exact `harness-baseline-inheritance.mjs` command source and `harness-baseline-inheritance-output.txt`. I independently checked the script/output hashes against the receipt: `78805ab9b35c03292c5fbc2a7ad92447fdc3d5313b0b7270d02495a0aba5c997` and `0d272ee273f7125ab2bcbb93a040131578cda567ef0ccfd97e52edbc55c18727`. The recorded command was `node artifacts/nov10-improvements/diagnostics/harness-baseline-inheritance.mjs`, **16:46:30.1933761–16:46:34.0894833 UTC**, observed exit **0**. It uses 78 frozen baseline modules from `3e060c2a83e5b9db80c0fb5c1581d4b9c5598d36`; all match their manifest hashes and Git blobs after CRLF normalization. Both reused GLBs and every frozen module remained unchanged. The original native beast hash is `85cb7024f72e23737a1a64981d763dfbc9204f0c6a5dc65fa413df55455035a3`.

That audit reproduces the same strict contour exception on first fit at this exact saved location/heading and clock, and again there at time zero; the starter location succeeds. The CPU stack points through baseline `harness-envelope.js`/`saddle-harness.js` first fitting. This is sufficient evidence that the **first-fit contour defect is inherited**, rather than introduced by this November refit. It is not a baseline browser replay and does not independently establish the wrong cyborg image in the older build. My current-candidate browser finding, both release blockers and the 8.0 score remain unchanged. The audit's exit 0 means successful reproduction/identity checks, not a passing game.

## Scores and required next work

| Area | Score | Reason |
| --- | --- | --- |
| Game-design presentation | 7.8 | Useful management information and distinct carriers, with a broken flesh restoration sequence in real play. |
| Interface presentation | 8.0 | Clear restrained HUD across the inspected layouts. |
| Environment art | 7.7 | Richer context, but repetition and broad terrain finish remain obvious. |
| Carrier/city art | 8.3 | Strong beast and substantially better low fit; gun supports and repeated wards still lag. |
| Overall aesthetics | 8.2 | Visible improvement without uniform AAA craft. |
| **Overall** | **8.0** | **FAIL: below 8.5, with N01-E1 and N01-E2 open.** |

The fixed standard remains 5 programmer art, 7 good indie, and 8.5 the required AAA-quality threshold. Overall is holistic, not an arithmetic average or a reward for effort. Before the smoke defect, the provisional impression was 8.2; the actual wrong-carrier gameplay result materially lowers this candidate's overall judgment.

Ranked required work:

1. **Concrete runtime defect N01-E2:** diagnose and repair flesh initialization/restoration, then repeat the native failing sequence and verify both state and rendered carrier. Retain this failed evidence.
2. **Concrete geometry defect N01-E1:** repair the actual native deformation/topology while preserving contacts and mechanics. Do not relax the detector or treat a lower count as a pass.
3. **Major craft deficit:** make the forward gun support silhouette and load path read like part of the saddle construction, within the owner's protected layout and actual clearance.
4. **Major craft deficit:** improve district identity and construction detail across both the three-district starter load and full20 load; preserve the low design, capacities and district IDs.
5. **Remaining quality limitation:** environment repetition and inconsistent terrain/canopy finish. Do not imply the current mobile cadence or physical-device performance has been solved.

Ordinary polish, separate from defects: restrained fastener/joinery detail, material roughness and edge treatment, selected window variation, and small local vegetation/ground colour refinements. Those alone would not clear either concrete blocker.

## Timing and limits

The five 90-interval stationary RAF samples recorded mean/p95 milliseconds of 35.78/40.1, 53.00/69.9, 46.56/60.0, 42.11/60.0 and 39.11/59.9 for normal, reverse, close, portrait and landscape respectively. The root CPU suite overlapped these recorded captures, and recording itself adds work. These numbers are descriptive diagnostics, not a controlled comparison, sustained GPU measurement or real-phone result. No speedup claim follows from them.

All critic-owned browser sessions closed by 16:40:38.720 UTC and the GPU/source capture hold was released. This report changes no readiness state and authorizes no deployment. **Round 1 disposition: 8.0/10 FAIL.**
