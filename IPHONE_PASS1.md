# iPhone presentation and offline playtest — Pass 1

Implemented locally on 24 September 2026. This is a focused phone-interface, input and playtest pass on the existing JavaScript/Three.js game. Gameplay, saves and world/character art are preserved. The independent four-round visual gate **did not pass**: final overall **6.9/10**, mobile HUD **8.4/10**, with no remaining concrete scoped defect identified in that final review.

## Identity, checkpoint and scope

- Base/unchanged HEAD: `75503a50b5787d1c7b5103a493c73f108aba3ecc`.
- Original branch/build: `codex/alpha1-environment-20260917` / `cb00d8cec12f2c169cf4`.
- Isolated local branch: `codex/iphone-presentation-pass1-20260924`. Implementation is **uncommitted**, including new helpers/tests/reports. No push, deployment, account creation, installation or access-permission change was performed.
- Frozen runtime and PC source build identity: **`8f73de81f12f4aad019b`**. The isolated builder first produced the complete release without altering source. After the packaged browser checks passed, its generated `src/build-info.js` was deliberately copied into the PC checkout to synchronize identity. Tests did not unexpectedly stamp working source or access normal user saves.
- Full runtime: **110 files**, 108 integrity-described/precache files; **33,725,768 total bytes**, including 33,674,934 descriptor-listed bytes. [Integrity inspection](artifacts/iphone-pass1/release-integrity.json) recomputed the content identity, generated worker/index/icons and every listed file hash. Its "candidate" label records when it ran; subsequent tests use these same frozen bytes.
- Reversible checkpoint: all **226** tracked baseline files are copied in `artifacts/iphone-pass1/baseline-runtime/`, with [original hashes](artifacts/iphone-pass1/checkpoint.json). [Final preservation check](artifacts/iphone-pass1/final-preservation.json): all checkpoint copies match, 212 original files remain byte-identical, and 14 scoped tracked files differ, including the deliberate build stamp. New files are listed in the source archive manifest. [Independent files-only audit](artifacts/iphone-pass1/source-preservation-audit.md).

All six carriers and identities remain. Both Gothic variants still add one district directly above the previous storey, preserve order/IDs across saves, and lift upper storeys on upgrades. Only the cyborg castle has half-height storeys/crown. Crawlers and airships still build horizontally; four upright balloons, economy/costs, gathering formulas, upgrading-cannon behavior, combat/clearance, world damage and save schema are unchanged. The 51 asset files, four vendor files and three PWA source files match the checkpoint. Three.js is still **0.185.1**; lockfile unchanged. The Website workspace was not used.

## Changes and relevant files

- `src/main.js`, new `src/selection-intent.js`: classify a picked object before opening a contextual sheet. Ordinary empty-ground travel sets the destination without opening City; deliberate resource/rival/district selections and placement/cancellation keep their existing purpose.
- New `src/marker-layout.js`: labels respect the usable visual viewport, safe-area insets, actual visible HUD rectangles, label bounds and other labels. Geometry is cached and invalidated on relevant layout/panel/viewport changes. No new per-marker animation-frame layout reads were added; the pre-existing renderer projection behavior was not broadly refactored.
- `index.html`, `src/mobile.css`, `src/main.js`: compact green/brass phone HUD; visible population/capacity; one-tap City hull/food-rate details; dismissible scrolling City/Build/Map panels; clear world space; infrequent settings in Menu. Resource and rival actions are prominent. A dedicated sticky dialog toolbar, balanced Playtest shortcuts, compact landscape battle information, clear selected tactics and bounded battle notifications improve readability. Existing menu pause semantics remain.
- `src/main.js`, `src/scene.js`: clear held keyboard, movement-pad and camera pointers on cancellation/background/lifecycle boundaries. No model, animation, lighting, camera math or renderer overhaul.
- `src/playtest.js`, new `src/playtest-sample.js`: opt-in Start/Stop/Reset sample, bounded to 120 accepted active seconds and 36,000 stored intervals. Feedback includes loaded build, preset, viewport, render buffer, DPR, browser-reported user agent, browser/standalone mode, duration/count, median, nearest-rank p95, strict >50/>100/>250 ms counts and exclusions. Sampling returns immediately while off, excludes hidden/paused gameplay and rebases on resume. It never changes simulation time, speed or saved preset. Nothing is sent automatically.
- `scripts/build-mobile-release.mjs`: optional isolated output/source-root settings. Existing worker, complete-cache validation, repair, safe update and save-transfer logic are reused. Minimal browser-harness changes support consistent URLs/output directories and the actual menu controls. No stack upgrade or new dependency.

## Text, targets and layout

Primary touch targets are at least **44×44 CSS pixels** in the tested phone flows; critical totals, names, costs, progress and combat actions are at least **14px**. Textareas use 16px. Tests inspect real `elementFromPoint` targets and actual touch gestures, not just helper arithmetic. CSS accounts for safe-area insets, dynamic viewport height, panel scrolling and orientation changes.

Intentional secondary-label exceptions are resource captions (10–11px), decorative brand/section/faction captions (10–12px), map legend text (12px) and enemy category text (12px). Critical adjacent values/actions stay larger. Desktop typography is not globally enlarged. Physical notch, browser-chrome and keyboard behavior still need a real Apple device.

## Checks actually run

All browser runs used isolated saves and serial graphics workloads. Loopback addresses below were local test infrastructure, not a commuting solution. `GAME_TEST_URL` and `OUTPUT_DIR` select each test's origin/evidence directory.

| Command/check | Result and tested scope | Evidence |
|---|---|---|
| `npm test` | **148 passed, 0 failed**, final working source; includes simulation, six-variant, construction/save, input, marker-cache, sampling and offline units | [Final log](artifacts/iphone-pass1/unit-final.log) |
| Targeted selection/marker/sampler/camera units | 27 passed, an earlier subset of the 148, not 27 additional distinct tests | [Targeted log](artifacts/iphone-pass1/targeted-unit.log) |
| `node tests/browser-smoke.mjs` | **13 passed**, source at 4192 before later cosmetic/dialog refinements; build, gather, battle, save/reload, pause and keyboard/mouse layout | [Desktop report](artifacts/iphone-pass1/desktop-smoke/browser-results.json) |
| `node tests/alpha-ui-browser.mjs` | **6 passed**, source at 4192; failed save/retry, focused controls, victory/defeat actions | [UI report](artifacts/iphone-pass1/alpha-ui/results.json) |
| `node tests/mobile-playtest.mjs` | **13 passed**, source at 4192; touch, construction, export/import, rejected import, initialization rollback and feedback | [Touch report](artifacts/iphone-pass1/mobile-existing/results.json) |
| `node tests/iphone-presentation-browser.mjs` | **15 passed**, exact release at 4193; pointer targets, ground travel, markers/panels/orientation, scrolling, cancellation, no UI-induced travel, preset/pause retention, sample copy/download/reset, desktop input and real battle-toast bounds; 21 screenshots | [Final browser report](artifacts/iphone-pass1/browser-final/results.json) |
| `node tests/vertical-growth-browser.mjs` | **All six variants, 7 grouped checks passed**, exact release at 4193; stacking/upgrades/saved order, capacity-only harness, four horizontal layouts; 36 screenshots | [Construction/save report](artifacts/iphone-pass1/six-carrier-final/report.json) |
| `node tests/local-server-qa.mjs` | **22 passed**, unchanged PC server at 4192; identity, read-only methods, private/path rejection and headers | [Server report](artifacts/iphone-pass1/server/report.json) |
| `node tests/mobile-offline-browser.mjs` with `GAME_RELEASE_DIR` set to the frozen release | **8 passed**, exact release; complete cache, stopped-server/offline reopening, touch movement, deliberately missing boot module and full repair with saved progress preserved | [Offline report](artifacts/iphone-pass1/offline-final/results.json) |
| Matched stills and normal-speed touch recording | **21 pairs verified**, matching camera/scene/viewport/preset; **38.16-second video** decoded, sought and played at 1×; viewer loads all 21 pairs with no errors or remote requests | [Evidence viewer](artifacts/iphone-pass1/evidence.html) |
| Runtime/source ZIP round-trip verification | **Passed**, every archive entry reopened and SHA-256 compared with its source; runtime descriptor hashes/sizes and allowed file inventory verified | [Archive verification](artifacts/iphone-pass1/packages/package-verification.json) |

All completed browser suites above report no unexpected browser errors or third-party requests. Chrome **154.0.8037.57**, Playwright **1.62.1**, Node **24.18.0** were used. New phone checks use 390×844 and 844×390 with coarse-pointer/touch emulation, DPR 1 and controlled Performance detail; the desktop regression uses 1440×960. Existing tablet-emulation checks also use 1366×1024/DPR 2. Matched desktop art stills use High. Preset choices are test fixtures, not new runtime forcing behavior.

The final copied sample actually recorded **2.800 active seconds / 90 RAF intervals**, median **30.00 ms**, p95 **40.00 ms**, >50 ms: **2**, >100/>250 ms: **0**, with **3,259 ms paused time excluded**. [Exact feedback](artifacts/iphone-pass1/browser-final/sample-feedback.txt). The existing touch run separately observed 120 intervals, mean 17.8608 ms/p95 30 ms. These short, different runs are **browser frame-scheduling observations**, not GPU timings, native presented FPS, a before/after performance comparison or sustained-phone performance evidence. The full 120-second limit is covered by deterministic boundary tests; no physical 120-second/thermal run was performed.

### Failures encountered and corrected

- The first critic found Close obscuring scrolled Playtest text. A reserved opaque toolbar fixes it. Expanded testing then exposed reopening at the old scroll position; resetting after `showModal()` fixes both orientations.
- The third critic caught inherited `body.in-battle #toast` top positioning conflicting with mobile bottom positioning. This stretched/collapsed notification backgrounds. Final actual touch tests contain every live text line inside its background and keep notices separate from HUD/commands/movement. Landscape entry notice measured x=8–156, y=74–174.38; portrait ability notice y=260–305.59.
- Test-only setup corrections included a Node document mock for the new visibility listener, a longer cold-start wait, Windows clipboard line-ending normalization and waiting for the native queued dialog close event before asserting pause restoration. Failed runs remain under the earlier `browser-regression*` directories and are superseded by `browser-final`; they are not presented as successful game runs.

## Evidence and independent art review

[Open all 21 before/after pairs and the video](artifacts/iphone-pass1/evidence.html). Raw [before metadata](artifacts/iphone-pass1/before/capture-report.json), [after metadata](artifacts/iphone-pass1/after/capture-report.json), [match verification](artifacts/iphone-pass1/matched-evidence-verification.json) and [recording timeline](artifacts/iphone-pass1/touch-recording/recording-report.json) identify the actual build/preset/runtime.

Stills show the full production HUD at **390×844**, **844×390** and **1440×960**, covering ordinary play/population, resource destination, construction, upgrade, settings, Playtest and battle. Before is unchanged baseline `cb00…`; final after is `8f73…`. Both use the same drill carrier, daylight, steady normal City camera, matching viewport/DPR/preset, original resources and a normally purchased Timber guild. Simulation waiting and camera settlement are stepped for repeatable stills; battle uses the actual battle camera and a declared near-rival position fixture. These are not performance runs. Intermediate after-round1/after-round3 images are preserved but are not the final comparisons.

The silent touch-workflow video uses native RAF, wall-clock waits and normal game speed. One position-only jump near a rival omits travel downtime and is recorded in the timeline; no resources, hull or combat statistics are granted. It is **38.16 seconds**, including loading/title screens, at **844×390**, Performance preset and DPR 1. The timeline records 11 events, including movement, orbit/pinch, construction, upgrade, sampling and battle. [Playback verification](artifacts/iphone-pass1/viewer-check/report.json) confirms decoding, seeking and advancement at 1×. The recording has no audio.

The separate critic wrote no implementation or capture scripts and took its own screenshots, varied cameras/zoom and watched motion with the HUD. It recorded these actual scores:

| Review | Overall | Mobile HUD | Outcome |
|---|---:|---:|---|
| [Round 1](art-reviews/iphone-pass1-01.md) | 6.8 | 7.8 | Failed; Close text occlusion |
| [Round 2](art-reviews/iphone-pass1-02.md) | 6.9 | 8.2 | Failed overall threshold; no new scoped defect observed |
| [Round 3](art-reviews/iphone-pass1-03.md) | 6.9 | 8.1 | Failed; battle-notification overflow found |
| [Round 4](art-reviews/iphone-pass1-04.md) | **6.9** | **8.4** | **Failed overall threshold**; no new scoped visual/runtime defect observed |

Stop at four rounds. World/character material detail, repeated castle structure, foliage/terrain treatment and existing battle framing still limit the overall image. This pass does not claim AAA quality or an exhaustive zero-error certification. Critic capture-tool scaling/timeouts are distinguished from game defects in its reports, and invalid/tool-scaled images are not used as matched evidence.

## Unrun and limited checks

- **Physical iPhone/iPad and iOS Safari:** not run. Real touch latency, notch/keyboard/browser chrome, battery/thermal load, long sessions, storage eviction and Home Screen cold launching remain unverified.
- **Desktop WebKit:** not run; its expected executable/cache is absent. No tooling was installed. The generic WebGL renderer string “WebKit WebGL” in Chrome is not Safari/WebKit-browser evidence.
- **Real backgrounding:** headless Chrome stayed visible when another tab was focused. The browser regression labels its synthetic `pagehide` fallback; hidden-time sampling and rebasing also have unit coverage. Phone locking/app switching still need the real-device checklist.
- **Hosting/access/session expiry:** not run; no approved host or account configuration was created. The offline check uses local Chromium with a stopped server and disabled network, not an Apple Home Screen installation or protected login.
- No renderer optimization/performance win, long-session stability or native FPS claim is made from this interface pass.

## Deliverables and phone workflow

- [Full runtime ZIP](artifacts/iphone-pass1/packages/ColossusWake-iPhonePass1-8f73de81f12f4aad019b-runtime.zip): complete code/assets/vendor/icons/worker/manifest, with `index.html`, `sw.js` and `release.json` at ZIP root. No enclosing build-ID folder or personal saves.
- [Updated source-review ZIP](artifacts/iphone-pass1/packages/ColossusWake-iPhonePass1-8f73de81f12f4aad019b-source-review.zip): current source, new modules/tests/reports and a per-file SHA-256 manifest. It omits large assets/vendor and the compiled launcher; use the separate runtime ZIP to play/host. [Source manifest](artifacts/iphone-pass1/packages/source-review-manifest.json).
- [Phone installation, offline and save guide](IPHONE_PLAYTEST_GUIDE.md).

Rebuild reproducibly from this full checkout using `node scripts/build-mobile-release.mjs --isolated --output-root artifacts/iphone-pass1/release`. The builder does not install dependencies or publish anything. The archive verification JSON contains exact archive hashes/sizes and entry-by-entry round-trip results.

After approved hosting: Safari → game link → sign in → Share → Add to Home Screen (Open as Web App if shown). Open the icon, choose **Play on your devices & saves** on the title screen or **Menu → Playtest, offline & save transfer** during play, and finish **Prepare offline play**. Save, close every game page and reopen. Test Airplane Mode with Wi-Fi and the PC off before relying on it away from home.

Short physical-phone checklist: **launch/continue; touch travel, orbit, pinch and construction/combat in both orientations; compare the existing presets with separate reset samples; lock/background/resume and check input clears; export to Files and verify import/recovery; reopen offline.** Each device/origin has its own save; exported backups protect against storage loss. There is no automatic cloud sync.

## Proposed hosting and exact approval

Use one dedicated **Cloudflare Pages Direct Upload** root origin, proposed `https://cw-playtest.pages.dev/` (**name availability unverified**), protected by **Cloudflare Access email allowlist + email one-time PIN** on production **and all preview/alias hosts**. Its root scope matches the manifest/worker paths. No existing deployment configuration was found in this game checkout; a private repository does not secure a hosted game.

Before any hosting action, approve **which Cloudflare account, creation of the separate Pages project and Access application/policies, exact allowed email addresses, and uploading this runtime**. Establish and verify protection with a harmless placeholder first. No purchase, plan entitlement, account creation or deployment is assumed. An authorized offline copy cannot be remotely erased by removing network access. The [guide](IPHONE_PLAYTEST_GUIDE.md) links the official documentation and describes authentication/storage limits.

This implementation pass ends here. Further world/character art or systems work should be a separate pass informed by actual phone feedback.
