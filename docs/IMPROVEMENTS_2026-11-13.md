# 13 November 2026: first work on the Mac

On 13 November 2026 Alex moved development of Colossus Wake from Codex on the Windows PC to Claude on an Apple M2 Mac, and asked for the open problems to be fixed and the game brought towards an alpha. This is the record of that first session. It follows [the 10 November record](IMPROVEMENTS_2026-11-10.md), which lists what Codex left open.

The starting checkout is `fae4252d38361fa1d3d049ad36028eb01405cbcd` on `codex/kaiju-art-remake-20261020`. Nothing was pushed or deployed. `delivery/readiness.json` remains `eligible: false`.

## What changed for a player

**The beast's strike no longer crumples its own leg.** The striking foreleg used to fold into a knot against the chest on the way to the target and again on the way back, with the paw pushed through the forearm. The leg now swings forward from the shoulder in its natural shape and presses its pads against the target. All six enemy types are still hit at the same point at the same moment.

**The game no longer shows its controls over the title screen's carrier.** Begin and Continue used to show the new game's panels immediately, before the 3D view had drawn the new game. A capture taken in that gap showed the panels over the title screen's cyborg while the game being loaded was the beast. The panels now appear in the frame that first draws the new game.

**The game opens on a Mac by double-clicking `Play.command`.** See [launcher details](../DESKTOP_APP.md#on-a-mac).

**The game runs about twice as fast on a laptop,** and lowers its own detail level when the machine cannot keep up. See [Frame rate on the MacBook Air](#frame-rate-on-the-macbook-air).

**A second pass made it faster again without changing the picture.** A crawler game runs 35 to 50% more frames a second at High and Balanced detail than after the first pass, and its own code takes a third less time. The beast game gains less. See [the optimisation pass](#the-optimisation-pass-14-to-20-november).

**The game starts without freezing on the title screen.** The first launch after an update used to stop twice while the graphics were prepared, the second time with the title already showing. It now prepares them once, and several at a time. See [Startup](#startup).

**The detail level comes back up.** The game used to lower its detail when the machine was slow and never raise it again. It now raises it, one step at a time, once the machine proves fast enough.

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

## The optimisation pass, 14 to 20 November

Alex then asked for the game to be made as fast as it can be without looking any worse. The rule for this pass was that a change either leaves what the game computes identical, checked by digest or by matrix, or leaves pictures that differ from the original code's only where the difference is named and cannot be seen. Nothing here lowers a detail level's resolution, shadows, shading or draw distance.

### The Mac was in Low Power Mode

Partway through, timings stopped making sense. On 14 and 15 November the Mac was on its charger at 100% with macOS Low Power Mode switched on (`pmset -g` reports `lowpowermode 1`). In that mode the same test loop takes about 250 ms instead of 87: the processor and the graphics chip both run about three times slower, and the system's shader compiler about sixty times slower. On 20 November it was off.

This matters more to how the game runs on this Mac than any change in this record. Claude cannot change system settings. Alex can, in System Settings, Battery, Low Power Mode.

Figures below say which state they were measured in. Each comparison was made by alternating the two builds, so that drift in the Mac's speed falls on both.

### What was measured

`tests/frame-time-benchmark.mjs` conditions: headless Chrome on the Mac's own graphics chip, 1024 by 768 at Retina scale, on battery, Low Power Mode off, 20 November. "Before" is commit `e368dbc`, the end of the first frame-rate work above; "after" is `efd5bff`. The two builds were run alternately, twice; both runs are shown, first then second. The Mac ran slower in the second round for both builds. Frames per second are capped at 60 by the display and move in steps, because a frame that misses one refresh waits for the next.

| Game | Detail | Frames per second before | After | Game's own code before, ms a frame | After |
| --- | --- | ---: | ---: | ---: | ---: |
| Crawler, standing | High | 27.5, 23.6 | 41.8, 32.2 | 10.6, 11.0 | 6.7, 7.5 |
|  | Balanced | 44.1, 33.4 | 60.0, 49.3 | 8.6, 9.0 | 5.2, 5.7 |
|  | Performance | 60.0, 55.8 | 60.0, 60.0 | 7.0, 6.4 | 4.0, 4.0 |
| Beast, standing | High | 25.0, 19.3 | 31.9, 25.9 | 19.5, 20.7 | 15.9, 17.2 |
|  | Balanced | 40.8, 27.4 | 40.4, 38.1 | 19.5, 20.0 | 17.0, 18.7 |
|  | Performance | 52.0, 42.6 | 58.8, 57.5 | 18.9, 20.6 | 15.9, 17.0 |
| Beast, walking | High | 28.0, 19.1 | 25.8, 25.9 | 25.4, 25.1 | 23.8, 25.4 |
|  | Balanced | 39.6, 33.7 | 41.8, 40.9 | 25.1, 29.0 | 23.5, 23.9 |
|  | Performance | 51.0, 45.1 | 55.3, 55.5 | 19.2, 21.8 | 17.7, 17.8 |

The crawler game's own code takes about a third less time at every level (about 11 ms to 7 at High, 6.7 to 4 at Performance), and High and Balanced each gained 35 to 50% in frames per second; Balanced reached the display's 60 in one round. The beast game gains less, because most of its script time is the beast's own skin and harness, which this pass could not make cheaper: its code fell from about 20 ms to 17 standing and from about 24 to 22 walking, and one of its twelve readings (walking at High, first round) was slower after than before, within the spread between rounds.

In Low Power Mode on 15 November the build at `0f214f1`, between the two, ran the crawler game at 12, 21 and 39 frames a second at High, Balanced and Performance and the beast game at 11, 15 and 19. No before-and-after pair was completed in that state.

### What changed

1. **Lamps that give no light are skipped** (`src/presentation.js`, two commits). The city lamps and impact flashes are a fixed pool of six point and two spot lights, dark all day. three.js ran its full surface response for each of them on every fragment, and once that was guarded it still worked out each lamp's direction, distance and falloff before finding that it gave nothing. A lamp is now tested by its own colour first, and a lit lamp only shades the fragments it reaches. The first change took about a third off a High-detail frame by day; the second took 6.5% off what remained (64.7 to 65.4 ms before, 60.6 to 61.1 ms after, low power). `tests/unlit-lights.test.mjs` fails if a three.js update changes the loop being patched.
2. **Rivals that are not drawn are left alone** (`src/scene.js`, `src/carriers.js`, two commits). Five rivals stand around the valley, usually behind the camera. Each was placed again every frame, had every one of its 500 to 1,200 matrices rebuilt up to three times, walked its thirty citizens, and was handed to the renderer to be culled mesh by mesh. A rival is now placed only when it moves, and one that the frame neither shows nor shadows is not animated, not walked and not drawn. A hull's animation is a function of the clock, so it resumes exactly where continuous animation would have had it. Two things are kept up for a rival nobody can see: the hover and flinch that carry its chimneys, because its smoke is part of the world, and the single-file traffic of a titan's citizens, which carry their places from one refresh to the next.
3. **The scene derives its own matrices** (`GameScene.deriveMatrices`). three.js re-derived the matrix of all 4,800 nodes in the scene on every render. The scene now does it and leaves out rivals that are not drawn or that nothing has moved, which are three quarters of the nodes.
4. **Citizens are composed from plain vectors** (`src/citizens.js`). Each of about 1,300 body parts a frame was composed by posing a scratch scene node, which also converted the part's rotation to Euler angles that nothing reads.
5. **The beast's harness is fitted with less overhead** (`src/harness-envelope.js`, `src/saddle-harness.js`): flat arrays for the support ring, one table of hull edges a frame instead of one per sample, and the exact skin sampler for its anchors.
6. **The detail governor can raise the detail again** (`src/adaptive-quality.js`). It used to step down only, and it remembers its level. One session in Low Power Mode therefore left the game on Performance, without shadows, for good. It now steps back up one level at a time once a level has run at the display's full rate for ten seconds, keeps a raised level only while it holds about 45 frames a second, and leaves a level that proved too slow alone for a day. A touch device is never raised above the Performance level it starts on.
7. **Shaders are compiled once at startup, and together** (`src/materials.js`, `src/presentation.js`). See the next section.

### Startup

A fresh browser took 988 seconds to show the title on 15 November, in Low Power Mode, where a second load of the same build took 12. The difference is the driver compiling shaders: macOS keeps compiled shaders between launches, and a launch that finds none (the first after any change to shader text, or after the system has dropped its cache) compiles about a hundred of them. That is not new, and the two lamp changes did not make it slower: the unpatched shaders took 964 seconds from cold in the same state. But it showed two faults in how the game starts.

- **Every lit shader was compiled twice.** The stand-in environment that lights the scene until the daylight photograph has loaded was drawn at 512 by 256, the photograph is 1024 by 512, and the size of an environment map is compiled into every lit shader. So the 43 lit shaders were compiled for the stand-in and again when the photograph arrived, by which time the title screen was showing and froze. The stand-in is now drawn at the photograph's size.
- **Shaders were compiled one at a time.** The renderer compiles a shader at the moment it first draws with it and waits for it. `Presentation.prepare` now hands every shader of the scene to the driver, without waiting, after a new game's actors are built and after a change of detail level, so they compile side by side.

With compilation forced cold by altering the text of every lit shader, out of Low Power Mode:

| | Before | After |
| --- | ---: | ---: |
| Shader waits in a cold start | 115, 15.5 s in all | 65, 2.1 s in all |
| First frame | 8.5 s | 3.9 s |
| Frame in which the daylight map arrives | 7.6 s | 0.02 s |
| Shader waits in a cached start | 115, 0.9 s in all | 65, 0.1 s in all |

A cold start in Low Power Mode was not timed after the change. `tests/startup-shaders-browser.mjs` fails on the code before it and passes after.

### How each was checked

- **Digest.** `tests/city-animation-digest.mjs` hashes everything a city's animation writes: every node's world matrix, every citizen instance matrix and colour, and every geometry attribute rewritten that frame (the beast's skin, the harness). Over 150 frames of walking and standing for all six carriers, 192 samples, the digest is identical before and after items 2, 4 and 5.
- **Matrices.** `tests/scene-matrices-browser.mjs` compares every matrix the renderer is about to use with the one three.js derives for the whole scene, on every frame of a title, an expedition standing and walking, a camera turned through a full circle, a pause, the world view, a battle and a withdrawal, for the drill crawler and for the beast. 4.3 million matrices over 1,150 frames on 15 November and 3.5 million over 1,027 on the final code, none different. The reference is computed and then put back, so the check cannot heal a stale matrix and miss it on a later frame.
- **Pictures.** `tests/visual-reference-capture.mjs` draws fixed moments with the clock, frame stepping and random numbers under its control, and `tests/visual-reference-compare.mjs` compares two sets. Against the original always-animate code, the title, the world map and the crawler's city at all three detail levels differ by one level of 255 in at most 24 of 2.3 million pixels. The beast's city differs in up to 122 pixels, where a far titan's citizens are refreshed 15 times a second instead of every frame. The second lamp change and the startup change were each compared with the commit before them, and every picture is pixel for pixel identical: by day at all three levels, at dusk, and at night with the lamps lit.
- **Pictures only compare within a session.** The same commit photographed on 15 and on 20 November differs by one level in up to 41 pixels; the browser or the power mode had changed in between. Take the before and the after pictures back to back.
- **Citizens.** 200,000 randomised body parts, including angles of negative zero, compose to the same matrix bit for bit by the old and the new route.
- **Rivals.** `tests/rival-pose-browser.mjs` checks that a hull is animated on every frame that draws it and on none that does not, that an airship hovers either way, that a propeller is where the clock puts it on the frame its hull is drawn again, and that a pause brings every drawn rival and its citizens to the paused instant.

### The full suite, and a mistake

Two of these commits were made on targeted tests alone, and each broke unit tests. `8878e2e` made `GameScene.deriveMatrices` look rivals up in a map that only `setGame` fills, and `efd5bff` made `setGame` and `setQuality` call a new method. Eleven tests call the scene's methods on hand-built stand-ins that have neither, and failed: one in `tests/camera-input.test.mjs` and ten in `tests/native-scene-regression.test.mjs`. A second session pushed the branch on 20 November before the suite had been run, so the Actions run for `6e6d238` failed with exactly those eleven (466 tests, 454 pass, 11 fail, 1 tracked), and so did the suite on the Mac. `5e648ac` repairs the scene code, not the tests: rivals are found from `enemyCities`, and the two methods set a flag that the next frame acts on. A change to `src/scene.js` needs the whole suite before it is committed.

On the final code on the Mac the suite is 466 tests, 465 pass, 0 fail and 1 tracked TODO, the strict self-crossing test (`artifacts/claude-2026-11-13/checks/suite-08-final/`). The browser checks pass on the same code: startup shaders, first frame, the playthrough (13 checks), rivals (7), interface, mobile, and the matrix comparison (18 stages).

That Actions run is also the first time the Mac's work ran on an x64 machine (Ubuntu, Node 24.18). Apart from the eleven, everything passed there, including every test that holds an exact digest recorded on the Windows PC. The rewritten skin correction, the skin sampler and the rest therefore still produce the PC's values bit for bit on x64.

### Tried and not adopted

- **A matrix pass that compares before it computes.** A version of item 3 that kept a record of every node's inputs and recomputed only on a change was no faster than three.js's plain pass in a benchmark of a game-sized scene (170 against 158 ns a node). The cost is memory traffic, not arithmetic. Leaving out whole rivals costs nothing per node, so that is what was kept.
- **Helper threads for the beast's skin correction.** Splitting the correction's loops across three worker threads gave bit-identical skin and made the correction itself 2.5 times faster, but the whole frame only 0 to 12% faster in Low Power Mode, because drawing and the harness fit slowed down while the helpers ran. That does not pay for worker threads, shared memory and two more server headers. The code, its two tests and the measurements are kept outside the game in `artifacts/claude-2026-11-13/threads-experiment/`. It was not measured out of Low Power Mode.
- **Lower antialiasing or fewer shading samples at High.** Measured, they are worth little: four samples to two saves 3% of a High frame, twelve occlusion samples to six saves 4%, a 2048 shadow map instead of 4096 saves 1%. Resolution is what costs: the same frame at 1.5 times instead of twice the screen's pixels is 27% cheaper. None of these was changed.

### Where a High-detail frame goes now

Crawler city by day at High detail, 2048 by 1536 pixels, low power, each row measured by switching one thing off and on again with the frame fully drawn before the clock is read. A whole frame was 61 ms. The rows overlap and do not add up to it.

| Switched off or changed | Frame gets cheaper by |
| --- | ---: |
| Drawing at one times the screen's pixels instead of two | 31 ms |
| Drawing at one and a half times instead of two | 18 ms |
| The terrain | 16 ms |
| All post-processing: the off-screen target, antialiasing, ambient occlusion, bloom | 16 ms |
| Shadows, cast and received | 9 ms |
| Light from the sky and surroundings | 7 ms |
| Antialiasing | 5.5 ms |
| Ambient occlusion | 5.4 ms |
| Trees | 4 ms |
| Grass, ferns and shrubs | 4 ms |
| Bloom | 2 ms |

The frame is spread evenly over what it draws. No one part is wasteful in the way the dark lamps and the unseen rivals were, and the number of pixels is what costs most. An earlier reading in this pass seemed to show shadows and post-processing costing three times more together than apart; alternating the configurations showed it was a faulty reading taken while shaders were still compiling, and the tools now time a frame only once it has been drawn.

### What is still slow

- **Low Power Mode.** With it on, High detail on this Mac is about 15 frames a second whatever the game does, the governor settles on Performance, and a cold start can sit on the loading screen for minutes.
- **High detail at Retina resolution is limited by the graphics chip.** What is left is the picture itself: resolution, shadows, shading and the landscape. Making High faster from here means drawing less, which this pass did not do.
- **A beast game still spends about half its script time on the beast's skin and harness.** The skin correction is 345,405 terms a frame and its output is pinned bit for bit by tests recorded on the Windows PC, so it can only be made faster by doing the same arithmetic on more cores (tried, see above) or by changing what it computes.
- **Each city is still some 250 separate draws a pass.** Merging them further would save script time on every frame but means rebuilding how carriers are assembled, with many tests tied to their present structure.
- **Safari and a physical iPhone were not measured,** as before.

## Open

1. Low Power Mode on the Mac. It was on, on the charger, on 14 and 15 November and off on 20 November. With it on the game runs about three times slower and a cold start can take minutes. It is Alex's setting to change.
2. The self-crossing count, now tracked. Reaching zero needs the source mesh's fold-overs repaired and correctives at the hind knees and the striking shoulder. The rig test requires the game's mesh to equal the Meshy original vertex for vertex, so a source repair has to be a declared overlay like the existing skin corrective, not an edit to the model. See above.
3. An independent visual review. The 10 November cycle used its four rounds at 8.1/10 against an 8.5 gate. No new review was run.
4. Physical iPhone and Safari. Nothing here was tested on WebKit or a phone.
5. Hosting. Private delivery is still **Configured but blocked**.
6. The arm64 digests. The Actions run of 20 November shows the Mac's work still produces every exact x64 digest. The six-decimal digests recorded on Apple silicon are, by design, only ever computed on Apple silicon.
