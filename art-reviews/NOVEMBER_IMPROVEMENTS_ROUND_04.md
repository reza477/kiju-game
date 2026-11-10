# November improvements — independent review 04

**8.1/10 overall — FAIL. Final round 4 of 4; this November visual cycle stops here.** Housing materials are modestly better, but the overall presentation remains below 8.5. The inherited native-body self-crossing remains open. A fresh Windows WebKit visit also exposed an initial presented-image mismatch despite passing logical-state assertions. No release is approved.

## Source and independence

Reviewed HEAD: `c29479b7b21d695fdc804f10c2132bb94fc0fa46`. Runtime implementation checkpoint: `3e1ca457413f00946bfabc0d48c6ac52ccef018b`. Raw runtime fingerprint: `18bc3001c928824e99b564df4c41793ea0de8bea453374cf0b61dbe8c40451a1`. Worktree: `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`; source server: `http://127.0.0.1:4230/`.

Compared with round 3 (`d05c003b3b68b5be76c5dcf7240a336e0cb7b17e`, raw `ddb29aae6bb29f86b5c19034b009d6a7935a3e1311c82a8945b8a071b4db9bd0`), the only changed runtime file is `src/saddle-city.js`: housing uses timber/plaster at level 1, stone framing/plaster at level 2, and masonry at level 3, with board or slate roofs. File SHA-256: `274ebbdcee12cf388e4e99e3bf0391211621b3f1322354c8bd15279c2c24aadd`. Later checkpoint changes are tests, not runtime. Existing dirty documentation was outside the runtime identity. Latest low flesh saddle, half-height cyborg castle, six carriers and systems remain the baseline.

I am the separate critic. I wrote no implementation, assets, tests or capture scripts. I used existing runners, took my own fresh captures and inspected original PNGs and temporal samples. Evidence belongs to the retained November work group. GPU and source hold were released after the last browser visit; no further visual round is authorized by this review.

## Own fresh evidence

All paths below are under `artifacts/critic-round-04/nov10-improvements/`. Times are 10 November 2026 UTC. Each report records the same starting/finishing runtime fingerprint and checkpoint above; motion and WebKit also check served response bytes.

| Run | Start–finish | Exit | Actual result |
| --- | --- | --- | --- |
| `capture` | 17:58:21.340–18:00:40.722 | 0 | Five matched AFTER views pass automated checks |
| `populated-day` | 18:01:02.047–18:02:02.906 | 0 | Full 20-district movement passes |
| `populated-night` | 18:02:03.220–18:03:01.599 | 0 | Full 20-district movement passes |
| `phone-webkit-flesh` | 18:03:20.445–18:04:26.219 | 0 | Assertions pass; first original PNG fails visual identity inspection, N04-E3 below |

Five-view command: `node tests/art-remake-playtest.mjs`, SHA-256 `35a3acb127391e48809975b43f7a9501ee32765449a6da71e6fccd12d69dc6ce`. Environment: active worktree `SOURCE_ROOT` and `FIXTURE_ROOT`, URL above, `OUTPUT_DIR=artifacts/critic-round-04/nov10-improvements/capture`, `MODE=capture`, `RUN_LABEL=AFTER`, `CAPTURE_VARIANT=flesh`, `HEADLESS=1`, `RECORD_VIDEO=1`, `OBSERVE_FRAMES=90`.

I inspected all five original files: `AFTER-desktop-normal-city.png`, `AFTER-desktop-reverse.png`, `AFTER-desktop-close.png` (1440×960), `AFTER-phone-portrait-city.png` (780×1688), and `AFTER-phone-landscape-city.png` (1688×780). Original hashes and exact camera records are retained in `capture/report.json`. Fixture SHA is `6db0c30c4a62c6a8dce0b01eaa8b16a4aec98bd6ba9d66460491a5397aa7a5ec`. Actual resolved camera yaw/pitch/zoom are 2.35/.28/40 for normal/phone, reverse yaw about 5.49159253, close zoom about 30. Older top-level generic camera presets in the report are not the actual capture camera. Framing matches prior rounds; simulation time and pose are not claimed identical.

Loaded-motion command: `node tests/native-beast-motion-playtest.mjs`, SHA-256 `e400e642e5f8c7704c2708434dce3540d4b21e03d76c6eb779e7f131cdf59338`. Environment: same URL, `HEADLESS=1`, `SCENARIO=populated`, `EXPECTED_RUNTIME_SHA=18bc3001c928824e99b564df4c41793ea0de8bea453374cf0b61dbe8c40451a1`, `LIGHT=day` or `night`, distinct corresponding output directory. Production APIs prepare an isolated valid 20-district save; subsequent movement uses native W/D inputs and live simulation. This does not claim all 20 districts were constructed through UI during these visits.

I inspected original front, side, walking, turning and normal City PNGs for both light states and directly compared round 3 and round 4 full-city originals. Day W/D samples: 100/57 frames; night: 92/39, with zero reported bad solver frames. Reports retain zero page errors, failed/remote requests and served-identity errors. These observations do not certify every skin pose.

Temporal supplements were decoded with `C:\Users\user\AppData\Local\ms-playwright\ffmpeg-1011\ffmpeg-win64.exe`, flags `-hide_banner -loglevel error -sseof -17 -i ORIGINAL_WEBM -r 2 -frames:v 34 -n decoded-populated-LIGHT/frame-%03d.png`. Day original: `populated-day/motion/page@5d597142eeb85f9f1df8ce65a70f515c.webm`, decode 18:02:37.9978332–18:02:38.7801205, exit 0. Night: `populated-night/motion/page@690263f7c71b0d40f9fb750c961ff2ed.webm`, 18:03:30.0631043–18:03:30.7503692, exit 0. Inspected day frames 009/013/017/021/025 and night 011/017/023/029. These full-frame lossy supplements show changing heading, gait and scenery; they do not replace originals or exclude every brief artifact.

Phone idle samples 001/005 were inspected from `capture/motion/page@0c6ec680b59683c2b6fe332e608087f6.webm`, decoded with the same executable and `-sseof -5 -r 1 -frames:v 5 -n decoded-phone-portrait/frame-%03d.png`; 18:04:27.0041256–18:04:27.0879154, exit 0. This is idle animation, not a walking-phone recording.

Fresh phone command: `node tests/iphone-webkit-playtest.mjs`, SHA-256 `684111bb43abc73d26f251dfd877ea4933122f4fb406c6b50ea92cc0d0697b37`; same source URL, `OUTPUT_DIR=artifacts/critic-round-04/nov10-improvements/phone-webkit-flesh`, `WEBKIT_FLESH_ONLY=1`, `PLAYWRIGHT_PACKAGE_ROOT=<worktree>\artifacts\nov10-improvements\iphone\webkit-toolchain-1.65.0\node_modules\playwright`. Windows Playwright 1.65.0/WebKit 27.2. Native district upgrade, route/stop, viewport rotation and save/reload completed. Position changed from (-30,40) to (-37.42928306096892,28.32541233276308). I inspected all five original phone PNGs. There is no continuous WebKit recording from this runner; its movement evidence is native action/state records plus subsequent original views. Browser/console/network arrays are empty. See the important pixel-level failure below.

All phone evidence is Windows browser emulation, not physical iPhone, branded Safari, Home Screen, sustained performance or hosted delivery validation. The existing legacy rig-ground runner was read but not run: its baseline fixture constraints are not appropriate for this changed implementation. No new capture script or substitute geometry was introduced.

## Visual findings

The material ladder adds useful warm timber roofs and pale infill alongside darker upgraded roofs and masonry. It helps distinguish construction stages in the populated city. The same small house silhouettes, railings and regularly spaced trays still dominate, so this is a modest material improvement rather than a transformation of district identity. Low saddle fitting, readable residents, gun ribs and the compact keep remain strengths. Night windows remain useful focal points.

The largest aesthetic gap remains the environment: broad green/ochre masses, banded cliff surfaces and thin repeated tree forms look simpler than the detailed beast. Riverbanks, ruins and ground cover give the world context, but material/form consistency remains below the fixed AAA standard.

**Phone grounding is weak visually.** Both fresh Chrome phone views, idle samples and the correct-flesh WebKit landscape views lack a readable ground/contact shadow. Raised or foreshortened feet therefore appear to float against the flat ground tones. `src/scene.js` lines 183/323 explicitly disable shadow maps in Performance quality; `src/presentation.js` line 79 disables its presentation path there. That source fact supports a shading explanation, but these images do not prove the cause of every perceived gap. I have not established a new sole/terrain penetration, collision failure or persistent vertical offset. Classify weak grounding as a ranked presentation deficit, not a newly measured geometric defect. Actual physical-device behavior remains unknown.

## Concrete defects and technical evidence

**N01-E1 — native connected-body self-crossing: OPEN.** Current-source full-suite evidence is `artifacts/nov10-improvements/checks/full-suite-final-03/report.json` and `output.txt`: `node --test --test-concurrency=2 tests/*.test.mjs`, 17:45:46.427–17:50:41.475 UTC, exit 1, **451 tests / 450 pass / 1 fail**, unchanged inputs. The sole failure remains `native connected body avoids self-crossing through representative gait and six-target strike/recovery poses`. This is builder/root execution, not a fresh critic suite. Passing saddle/room/frame/weapon/save checks and selected attractive frames cannot clear that requirement.

Active native GLB remains `85cb7024f72e23737a1a64981d763dfbc9204f0c6a5dc65fa413df55455035a3`. I read the final rejected asset-only repair outcome, `artifacts/nov10-improvements/deformation/union-04/OUTCOME.md` and conclusion receipt. The finite attempt still has 17,660 crossing occurrences / 10,598 distinct pairs after 1,351 scale attempts and 51 accepted local steps. It was not integrated and did not advance to actual-controller/terrain/contact acceptance. Its exact replay/finite/protected-position checks are not proof of a repaired game. Missing proposal-script version hashes and the earlier serialization failure remain disclosed in that receipt. No further repair experiment belongs to this review.

**N04-E3 — initial WebKit presented-image/loaded-state mismatch: OPEN, bounded observation.** `phone-webkit-flesh/flesh-portrait-city.png`, captured 18:03:48.986 UTC, SHA-256 `6c3ec214983f45eac4edfda225114930d664472f459bb3f1d270788ce9424164`, visibly shows the cyborg and its vertical castle. Yet the immediate report snapshot says `variant=flesh`, `renderedVariant=flesh`, `bodyKind=flesh`, active scene association true, preview false, time 0 and renderFrame 46. All four subsequent landscape PNGs show the correct flesh beast, including after reload. The runner exits 0 because logical state and raster diversity checks do not establish the identity of the first presented image. That exit must not be described as a complete visual pass.

This establishes one incorrect initial image in this Windows WebKit visit. A transient stale presentation frame is plausible, but the cause, duration, repeatability and physical-iPhone relevance are unproven. There was no contour exception, missing native-body state or persistent wrong actor in later views. Do not infer that the inherited N01-E2 first-fit error recurred. No additional visits were made after the final round/deadline boundary.

**N01-E2 — inherited first-fit reload exception:** remains closed for the exact independently reproduced round 2 cases. Those saved-clock/time-zero and ordinary flesh smoke results are predecessor evidence, not newly rerun exact-case claims. The final fresh WebKit reload renders flesh correctly. Round 2 combat results and the other five carriers' earlier smoke passes remain predecessor evidence; this round is not a complete six-carrier/campaign certification.

Builder receipt `artifacts/nov10-improvements/saddle/round4-builder-receipt.json` records 72 construction parity cases, exact retained geometry/transforms/bounds/layout and unchanged non-housing assignments. Batched resource counts remain stable; unbatched UV variants add 3,360/5,880 attribute bytes for starter/full city. Its targeted passes and retained initial failed baseline capture are builder evidence, not critic-authored checks. The current complete suite above is the final technical result.

## Ranked quality work and score

Quality opportunities are separate from N01-E1 and N04-E3:

1. Improve environment material/form consistency at normal gameplay distances.
2. Restore a convincing sense of weight and contact in phone Performance presentation without presuming a collision failure.
3. Differentiate district silhouettes and functional character within the established low-saddle clearances; material variation alone leaves a repeated shelf impression.

Fixed scale: 5 programmer art, 7 good indie, at least 8.5 AAA-quality gate. No automatic score increase for another implementation attempt.

| Area | Final score |
| --- | --- |
| Carrier and saddle presentation | 8.4 |
| Environment | 7.8 |
| HUD and normal gameplay legibility | 8.0 |
| Game design/behavior as observed | 8.0 |
| Aesthetics overall | 8.3 |
| **Overall** | **8.1 — FAIL** |

The material improvement is real but small. The initial-image mismatch lowers confidence in the observed gameplay presentation; the final score supersedes the provisional 8.2 sent before inspecting that phone original. Prior rounds' scores/findings are unchanged.

The five 90-frame RAF windows have means 27.5189, 26.7867, 27.8167, 24.7778 and 24.3089 ms, with p95 32.6/32.5/42.5/32.5/32.5 ms. Chrome is Windows 157.0.8103.40 on RTX 4070 Ti SUPER/D3D11. These are descriptive recorded-browser observations, not controlled comparative benchmarks, GPU timings or iPhone performance. No performance improvement is claimed.

**Four rounds are exhausted. The November cycle is closed failed; release remains blocked.** Do not start a fifth round by renaming this update, publish the failed build, or clear either open finding from successful packaging or automated exit codes. Physical phone and hosting acceptance remain separate unverified requirements.
