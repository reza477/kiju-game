# Installation and update repair — 27 September 2026

**Configured but blocked. The local combined delivery gate passes. No hosted game address or published build exists.**

## Preserved checkout and scope

Started at clean `fbfda913aa3b5aa6ecef5b5580e1426127caef72` on `codex/playtest`, retaining the completed iPhone presentation checkpoint `2a77d13` and reconciliation `ba8d457`. Created `codex/delivery-repair-20260927` from that checkpoint. No old archive was restored. No changes to gameplay, graphics, engine, controls, save schema/key, manifest identity or worker protocol were needed. No Website files were touched.

The implementation checkpoint is `e33125e3b11d0d942bd23c817ce24b1812a48067`. Later test/error-classification and documentation commits do not change the game runtime. All setup/repair commits use `[skip actions]` while included GitHub usage is unverified. A private source push is not a deployment.

## Demonstrated cause

The original Windows headless launch selected **ANGLE SwiftShader** despite the PC having an NVIDIA RTX 4070 Ti SUPER. A fresh backend probe confirms that renderer. The unmodified frozen game, A `1f34a447888f6f64e784`, reproduced long tasks lasting roughly 4.5–10.2 seconds and only seven game frames by 50.8 seconds. Plain synchronous page evaluations also missed their three-second diagnostic bounds.

The new fetch/body instrumentation shows the actual failure boundary:

| Event | Seconds after diagnostic start |
|---|---:|
| Metadata fetch begins | 17.644 |
| Response becomes available; JSON body read begins | 24.006–24.007 |
| Browser reports response loading finished | 34.244 |
| JSON read rejects because its request was aborted | 39.761 |

The existing eight-second metadata deadline expired while software rendering starved browser scheduling. `install()` was never reached, so no `register()` request was made. This is evidence for the reproduced Windows headless scheduling failure, not a general service-worker API defect. Earlier two-client blank-page tests did not reproduce it because they did not render the game.

Changing only the launch backend to D3D11, using the same pinned Chromium and frozen runtime, let metadata parsing finish, called `register()` at 19.053 seconds, and produced a controlled, offline-ready game by the 35-second sample. The complete hardware-backed gate then exercised the previously failing B-worker update scenarios. Actual test reports identify the NVIDIA/D3D11 renderer.

The first full hardware-backed run completed all 11 original behavior groups, then failed its final console assertion on two deliberately offline `/release.json` requests. Those are expected network failures; they did not represent missing cached game files. The repaired assertion permits only the exact metadata URL and `ERR_INTERNET_DISCONNECTED` during deliberate offline fixtures. Injected-fault exceptions also require the injected resource URL and an expected failed-resource message. Other console errors and every page error remain fatal.

## Small repair

- Shared browser launch settings request D3D11 on Windows and record the actual renderer in delivery, offline and hosted-smoke reports. Other platforms retain their previous automatic selection. `PLAYTEST_GRAPHICS_BACKEND=auto` or `swiftshader` permits explicit diagnostics; reports identify them.
- Browser condition waits now have a Node-side deadline even when `page.evaluate()` never settles. They await a resolved Boolean, retry navigation interruptions only, and propagate actual errors. Failure-state capture is also bounded.
- The save-failure case waits for the actual refusal message before restoring storage writes. A new case reopens and plays A offline after interrupted B download.
- Production timeout limits, game rendering and updater behavior are unchanged. Software rendering remains extremely slow on this Windows setup; Linux CI and weak-device performance are not established by the GPU-backed pass.

## Frozen artifact and evidence

Built once from clean source `e33125e3b11d0d942bd23c817ce24b1812a48067`:

- A: `04512324b45c897250db`.
- B: `de8a22986685ceb4bde0`, a separate metadata-only synthetic fixture; never published.
- A SHA-256: `72b1e86c0084f6dcab86cd8ccc4d8d49e7c635f3cb087c45b0ff292b380d6e81`.
- 110 packaged runtime files. Tests use those frozen bytes and isolated browser/save storage; no browser check rebuilds the release.

An independent preservation audit found no added or removed runtime files. Compared with the prior frozen package, only generated `release.json`, `src/build-info.js` and the descriptor embedded in `sw.js` differ. Worker implementation, game source and assets are identical.

| Check | Actual result | Boundary |
|---|---|---|
| Unit suite | 184/184 passed | Includes five new asynchronous-wait regressions and existing save/worker/quota/security coverage. |
| Pinned Chromium 151.0.7922.34 | 12/12 passed | Windows, touch emulation, NVIDIA/D3D11; zero page errors, unexpected console errors or external requests. |
| Installed Chrome 154.0.8037.57 | 12/12 passed | Same frozen A/B, Windows, touch emulation, NVIDIA/D3D11; final strict fault classifier. |
| Separate Chrome offline/repair regression | 8/8 passed | Same frozen A; manual/automatic preparation, server-off Continue/touch, network-only health check and missing-module repair preserving the save. |
| Frozen inventory | 110 files verified | Complete artifact checksum retained. |
| Synthetic credential isolation | Passed | Exact host accepted the synthetic header; foreign redirect received neither request nor credential. Not real hosting authentication. |
| Readiness and deliberate-failure gates | Both rejected, exit 1 | Local proof only; neither check publishes anything. |
| Linux Actions / hosted A→B / real protection | Not run | Account, usage and eligibility prerequisites remain blocked. |
| Safari/WebKit / physical iPhone or iPad | Not run | No Home Screen, device storage, physical background/resume or phone-performance claim. |

The twelve groups prove initial automatic offline installation, touch movement, save/Continue, rejection of unauthorized/HTML metadata and missing/HTML/interrupted assets, actual offline A reopening after failed B, complete B download during play, failed-save refusal, exact saved-position restoration after applying B, a second A session retaining A files and combat controls, automatic cold-title B application, missing-boot-module recovery to B preserving the save, and B reopening/Continue/touch with its server stopped.

The pinned run preceded the final tightening of the injected-error classifier. Its four recorded expected console messages were independently checked: one deliberate metadata 401 and three deliberate offline metadata failures; all meet the final classifier. Chrome ran that final classifier directly. All expected errors remain visible in the reports.

Local evidence under ignored `artifacts/delivery/`:

- `scheduling-normal.json`, `scheduling-hardware.json`, `default-backend.json`, `startup-profile.json`, `startup.cpuprofile`: reproduction and causal comparison.
- `scheduling-software.json`: explicit software rendering remains slow; not a passing gate.
- `repair-pinned-baseline/results.json`: all original behaviors passed, final expected-offline-error assertion failed.
- `repair-pinned/results.json`, `repair-chrome/results.json`: full passing combined gates and actual renderer identities.
- `repair-offline-regression/results.json`: independent eight-check offline/repair pass.
- `repair-unit.log`, `build.json`, `build-pre-repair.json`, `integrity.json`, `credential-scope.json`.
- `repair-readiness-block.log`, `repair-intentional-failure.log`: expected publication refusals.
- Each passing browser directory contains `interrupted-update-offline-A.png`, `updated-B.png` and `offline-B.png`, captured from the actual game with its HUD.

## Private delivery remains gated

Live inspection confirms private `reza477/kiju-game`, authenticated GitHub user/admin access, default branch `main`, and Actions enabled. There are no delivery secrets, repository variables, playtest workflow runs or deployment records. Included runner/storage usage and no-overage limits are unverified; the billing API requires additional access that was not requested.

Vercel's connector returns no teams. Local CLI credentials were initially present but could not authenticate; there is no verified account/project, project link, protected permanent origin or included-usage confirmation. No hosting project, protection setting, secret, alias or billing setting was changed. No playable assets were uploaded to hosting.

### Repository visibility changed during this task

The initial audit reported private. A fresh pre-push check later returned `visibility: public`; a second GitHub API request confirmed it. The push was stopped. Under the owner's standing instruction to keep this repository private, its visibility was restored to private and verified twice. Anonymous requests to both the repository API and GitHub page then returned 404. GitHub reported zero forks at discovery; that does not establish that nobody downloaded or viewed the earlier public contents. The cause and duration of that visibility change are unknown. No repair commits were pushed while it was observed public. Repository protection is separate from the still-unconfigured hosted game's protection.

`delivery/readiness.json` stays false because the existing four-round art gate remains failed (overall 6.9/10, HUD 8.4/10). This repair did not start an art task or waive that requirement. Passing Windows tests also does not establish passing Linux CI or hosted access.

Use the consolidated setup checklist, phone installation steps and rollback procedure in [PRIVATE_DELIVERY.md](PRIVATE_DELIVERY.md). After authenticated account/usage setup and release eligibility are resolved, the remaining proof is a real passing Actions run, protected staging, exact-artifact promotion, hosted A→B at one permanent origin and the physical-device checklist. There is no current hosted release to roll back to; the local starting checkpoint remains recoverable without rewriting Git history.
