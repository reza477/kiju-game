# 13 November 2026: first work on the Mac

On 13 November 2026 Alex moved development of Colossus Wake from Codex on the Windows PC to Claude on an Apple M2 Mac, and asked for the open problems to be fixed and the game brought towards an alpha. This is the record of that first session. It follows [the 10 November record](IMPROVEMENTS_2026-11-10.md), which lists what Codex left open.

The starting checkout is `fae4252d38361fa1d3d049ad36028eb01405cbcd` on `codex/kaiju-art-remake-20261020`. Nothing was pushed or deployed. `delivery/readiness.json` remains `eligible: false`.

## What changed for a player

**The beast's strike no longer crumples its own leg.** The striking foreleg used to fold into a knot against the chest on the way to the target and again on the way back, with the paw pushed through the forearm. The leg now swings forward from the shoulder in its natural shape and presses its pads against the target. All six enemy types are still hit at the same point at the same moment.

**The game no longer shows its controls over the title screen's carrier.** Begin and Continue used to show the new game's panels immediately, before the 3D view had drawn the new game. A capture taken in that gap showed the panels over the title screen's cyborg while the game being loaded was the beast. The panels now appear in the frame that first draws the new game.

**The game opens on a Mac by double-clicking `Play.command`.** See [launcher details](../DESKTOP_APP.md#on-a-mac).

**The game runs about twice as fast on a laptop,** and lowers its own detail level when the machine cannot keep up. See [Frame rate on the MacBook Air](#frame-rate-on-the-macbook-air).

## The strike

The census in `artifacts/claude-2026-11-13/` grouped every crossing pair in the 25 test poses by the bones that drive each face. Of 19,635 pair occurrences, 17,699 were in the 18 strike poses, and most of those joined different parts of the striking foreleg: paw through forearm (5,646), forearm through upper arm (2,964).

Two things in the pose caused it. Both were pose choices, not mesh defects.

1. The claw travelled on a straight line from wind-up to target and back. A straight line between two points at arm's length passes close to the shoulder, so the limb had to fold to elbow angles of 19 to 45 degrees mid-swing.
2. The solve pointed the paw's toes along the attack and reached the same claw point by flexing the wrist, to 43 degrees in the worst pose.

`src/monster-quadruped-pose.js` now keeps the whole limb in its bind shape, aims it from the shoulder with the smallest rotation, and hinges only the elbow to fit the distance. The wrist opens, and only towards straight, when a far target needs the last of the reach. The claw is carried around the shoulder at the nearer endpoint's radius in both the controller blend and the marker path in `src/quadruped-city-pose.js`.

That left one fold. Reaching a target at full stretch turns the upper arm about 130 degrees from rest and folds the skin at the shoulder. The beast already bounded forward when a target was beyond its reach. It now bounds in whenever the target is beyond 78 percent of the limb's length, so that contact is made with the elbow still bent. Against the drill crawler this adds a short bound where the limb used to lock straight; against the cyborg and airships the existing bound carries a little further.

| Poses | Crossing pairs before | Bind-shape strike | With the closer bound |
| --- | ---: | ---: | ---: |
| 18 strike poses | 17,699 | 4,348 | 3,610 |
| 7 gait poses | 1,936 | 1,936 | 1,936 |
| All 25 | 19,635 | 6,284 | 5,546 |

The claw witness, target, attack timing, damage, support paws and saddle are unchanged. The combat, harness, frame, foundation, saddle-refit and scene-regression suites pass unchanged. Headless Chrome captures of the same strike before and after are in `artifacts/claude-2026-11-13/strike-before/` and `strike-after/`.

## What is still wrong with the beast's mesh

The strict test, *native connected body avoids self-crossing*, still finds crossings. It requires zero crossing triangle pairs among 100,400 faces in each of 25 poses. The 5,546 that remain are of three kinds.

- **Defects in the source model, about 170 in every pose (roughly 4,300 of the total).** The standing pose has 172. They sit inside single body parts: head 38, chest 33, hips 23, left foreleg 22 and others. They come from the Meshy export and do not move with the animation. Codex's four sculpting attempts on 10 November addressed these.
- **Folds behind the hind knees while walking, up to 324 extra in one pose.** The knee flexes from about 150 degrees in stance to 87 in swing because the body sinks to keep the stance legs in reach, and the crease behind the knee collapses.
- **A smaller fold at the shoulder on raised and distant targets, about 220 across four contact poses.** Hitting the drill crawler, the cyborg and the two airships still lifts the upper arm further than the skin weights carry cleanly.

None of these was reported as visible by the four independent reviews, which found "no new definite skin hole". They are still real geometry defects.

A second test in the same file, *native self-crossing never exceeds its recorded count in any of the 25 poses*, now fails if any pose gets worse than the figures above. It shares the strict test's scan. The strict test and its detector are untouched.

### Decision: tracked, not a gate

At the end of the session Alex was asked whether these remaining crossings should stop blocking the alpha and be tracked instead, and answered yes. The strict test is now marked TODO. It still runs in every suite with the same detector, epsilon and poses, still requires zero, and still prints its counts; while it fails, the suite reports it as TODO and passes. The ceiling test is the gate. The decision is recorded at the top of [AGENTS.md](../AGENTS.md).

It does not waive the visual review gate, the 8.5 score or the phone checks, and `delivery/readiness.json` is unchanged at `eligible: false`.

## The interface and the first frame

The 10 November review recorded N04-E3: a WebKit capture showing the cyborg under the beast's panels, with the game state and scene both reporting the beast. `beginGame` revealed the HUD in the same task that replaced the scene's actors, before any frame of the new game existed. The capture was taken in that gap. A browser that follows the standard presents the canvas and the panels together, so a player on such a browser would not have seen it; the fix removes the gap for captures and for any browser that presents WebGL a frame late. A restart or save import from inside a running game keeps its visible panels, because stepped browser audits act on them without advancing a frame.

`GameScene` now counts frames drawn since `setGame`, and `main.js` swaps the title for the HUD in the frame that first draws the new game. This was verified in Chrome: immediately after Begin the HUD is hidden with zero frames drawn, and it appears once a frame has been drawn. It has not been verified in WebKit or on an iPhone; this Mac has no WebKit build that Playwright can drive.

## The Mac test baseline

The first full run on the Mac passed 444 of 451. Six of the seven failures were the machine, not the game.

- Five tests hash raw doubles recorded on x64. V8's arm64 build rounds a small share of `Math.sin`, `Math.exp` and `Math.pow` results one unit in the last place differently. Node 22.22.3 and 24.22.1 give identical arm64 values, so it is the architecture and not the Node version. Record counts, IDs, order and every Float32 mesh digest match. These tests keep their exact x64 digests and compare six-decimal digests on arm64 (`tests/helpers/platform-digest.mjs`).
- One test compares PNG bytes from the ground-texture generator. Every pixel is identical; Homebrew Node links a different zlib and compresses them differently. The check now requires identical pixels.

**Not verified:** the arm64 six-decimal digests have not been compared with an x64 run of the same rounded values, because no x64 Node is installed here. If terrain or weapon results ever differed between an Intel PC and an Apple or phone processor by more than last-digit rounding, these tests would not show it. A world built on a PC and one built on an iPhone are therefore not proven identical to the last digit, and are known to differ in it. Scenery count, IDs and order match.

## Checks run

All on the Mac, Node 22.22.3, arm64. Evidence is under `artifacts/claude-2026-11-13/`.

| Run | Result |
| --- | --- |
| `checks/mac-baseline-01`: unchanged `fae4252` | 444 of 451. Fails: strict self-crossing, and the six machine differences above. |
| `checks/suite-02-strike-reveal`: bind-shape strike and interface change | 449 of 451. Fails: strict self-crossing, and one scenery digest test that ran before its fix was saved; it passes alone. |
| `checks/suite-03-final`: final strike, with the closer bound and the new ceiling test | 451 of 452. Fails: strict self-crossing only. |
| `checks/suite-04-final`: the committed code at `b7de446` | 451 of 452. Fails: strict self-crossing only. |
| `checks/suite-05-tracked`: the same game code, with the strict test tracked | Passes, exit 0: 451 pass, 0 fail, 1 TODO (the strict self-crossing test, still counting 5,546). |
| `checks/suite-06-performance`: with the frame-rate work below | **Passes, exit 0:** 458 pass, 0 fail, 1 TODO. The self-crossing count is still exactly 5,546 in the same 25 poses. |
| `tests/browser-smoke.mjs`, headless Chrome | 13 of 13: title, all three factions, build, travel and gather, save, world map, battle, special ability, withdraw, reload and resume, pause, 390 px layout, no remote requests or errors. |
| `tests/alpha-ui-browser.mjs`, headless Chrome | 6 of 6: failed-save recovery, save and resume, focused selector keys, canvas movement keys, victory and defeat dialogs, restart. |
| `tests/mobile-playtest.mjs`, headless Chrome with touch emulation | 17 of 17, including save export, import and a simulated renderer failure during import. |
| `tests/first-frame-interface-browser.mjs`, new | 2 of 2: Begin and Continue keep the title until the new game is drawn. |

The browser rows were run on the same final code as `suite-04-final`, and all four were run again and pass on the frame-rate work, together with the new `tests/rival-pose-browser.mjs` (3 of 3).

Two of those browser scripts needed repairs that are about the scripts, not the game. `alpha-ui-browser.mjs` waited for the game with Playwright's default polling, which runs on `requestAnimationFrame`; the script replaces that function, so the wait hung whenever loading took longer than the first check. It now polls on a timer. The same script expected the arrow key to change a focused dropdown, which Windows does and macOS does not.

## Frame rate on the MacBook Air

Later the same day Alex played the game for the first time on this machine, a MacBook Air M2 on battery, and it lagged badly. The game had only ever been tuned on a desktop graphics card.

### What was measured

`tests/frame-time-benchmark.mjs` runs the game in headless Chrome on the Mac's own graphics chip, 1024 by 768 at Retina scale, and reports frames per second and the milliseconds the game's own code takes each frame. Before and after were run back to back on a quiet machine.

| Game | Detail | Frames per second before | After |
| --- | --- | ---: | ---: |
| Beast, standing | High | 16.5 | 26.4 |
| | Balanced | 23.6 | 44.3 |
| | Performance | 28.1 | 57.0 |
| Beast, walking | High | 15.7 | 29.9 |
| | Balanced | 21.5 | 42.8 |
| | Performance | 29.3 | 53.5 |
| Crawler, standing | High | 16.4 | 29.0 |
| | Balanced | 24.6 | 47.9 |
| | Performance | 30.1 | 60.0 |
| Cyborg, standing | High | not measured | 30.0 |
| | Balanced | not measured | 42.6 |
| | Performance | not measured | 53.0 |

The game's own code took 31 to 45 ms per frame before, for every carrier. It now takes 6 to 10 ms in a crawler game, 9 to 12 in a cyborg game and 17 to 24 in a beast game. A fresh install on this Mac used to open at High detail and run at about 16 frames a second; it now settles on Balanced within six seconds and runs at about 43.

### Causes and fixes

1. **Every rival titan was fully re-posed every frame.** A new expedition has five rivals, one of them the beast. The scene animated all five each frame whether or not they were on screen, and posing the beast costs about 20 ms: its skin correction, planted paws and harness all run on the CPU. So every game, whatever the player's carrier, paid for a beast breathing somewhere across the valley. `GameScene.rivalNeedsPose` now leaves a standing rival titan in its last pose unless it is within 170 m of the camera and inside the view. Every rival is posed once first, and rival crawlers and airships, which are cheap, still move at any distance. `tests/rival-pose-browser.mjs` checks all three cases.
2. **The game always started at High detail.** High draws seven million triangles at Retina resolution with a 4096-pixel shadow map, and the graphics chip, not the game's code, then limits the frame rate to under 30. `src/adaptive-quality.js` watches real frame times and steps the detail down when the average over three seconds is below about 38 frames a second on High or 33 on Balanced. It never steps up, ignores stalls and hidden tabs, remembers its level for the next launch, and switches off for good once the player presses the Detail button. It is off under `?test`, so audits keep the level they set.
3. **The beast's skin correction was slow.** It read every value through attribute getters and small per-vertex arrays. `src/native-skin-corrective.js` now runs the same arithmetic in the same order over flat typed arrays, and stores the 345,405 moment terms as Float32, which is what the asset holds. In Node the correction fell from 12.2 to about 5.5 ms a frame; in Chrome from about 10 to 5.9.
4. **Paw clearance re-multiplied bone matrices for every vertex.** Each frame the pose solve skins about 11,000 paw vertices on the CPU through `SkinnedMesh.getVertexPosition`, which multiplies each influencing bone's two matrices again per vertex. `src/skin-sampler.js` forms those products once per batch.

Items 3 and 4 change no output. `artifacts/claude-2026-11-13/corrective-digest.mjs` hashes the beast's corrected positions and normals and the correction's status values over 152 sampled frames of walking, turning and two strikes; the hashes before and after are identical. `tests/skin-sampler.test.mjs` compares the sampler with three.js value for value on more than 10,000 positions. Item 1 changes only rivals that are far away or out of view, and item 2 changes only which detail level is in use.

### What is still slow

- **High detail on this laptop is about 26 to 30 frames a second and is limited by the graphics chip.** Nothing here reduced what High draws.
- **A beast game still spends 17 to 24 ms a frame in the game's own code,** about a third of it in the skin correction's 345,405 moment terms. It reaches 57 frames a second only on Performance. Going further means moving that correction to the graphics chip or running it less often than every frame.
- **Safari was not measured.** No tool here can drive it, and it is the engine an iPhone uses.
- **The benchmark is headless Chrome.** A visible window was not timed.
- **A display that refreshes 30 times a second looks slow to the governor,** which will step such a device down to Performance. Pressing Detail sets any level and stops it.

## Open

1. The self-crossing count, now tracked. Reaching zero needs the source mesh's fold-overs repaired and correctives at the hind knees and the striking shoulder. The rig test requires the game's mesh to equal the Meshy original vertex for vertex, so a source repair has to be a declared overlay like the existing skin corrective, not an edit to the model. See above.
2. An independent visual review. The 10 November cycle used its four rounds at 8.1/10 against an 8.5 gate. No new review was run.
3. Physical iPhone and Safari. Nothing here was tested on WebKit or a phone.
4. Hosting. Private delivery is still **Configured but blocked**.
5. The x64 cross-check of the arm64 digests.
