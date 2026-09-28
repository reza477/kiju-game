# Private hosting setup — 27 September 2026

Status: **Configured but blocked**. Permanent address: https://colossus-wake-playtest.vercel.app. It contains a generic protected setup page, not the game. No playable assets, concept artwork or source reports were uploaded to Vercel.

## Verified account and usage boundaries

- GitHub: `reza477/kiju-game`, private, default `main`, delivery branch `codex/playtest`.
- Vercel owner: `rezarhnm-6590`; Hobby team `rezarhnm-6590s-projects`, ID `team_db0IJn7BZMtz8amtLBtCFbcO`.
- Dedicated project: `colossus-wake-playtest`, ID `prj_TjqjheUe2qpePzohpT11IXIUxpRM`. No native Git integration or rolling releases; `ssoProtection.deploymentType=all`; public source is not enabled (API represents the disabled value as null).
- GitHub setup-time snapshot: 879/2,000 included Actions minutes, 0/0.5 GB storage. Existing Actions budget is $0 with Stop usage=Yes. Billing read through the signed-in UI; CLI scopes were not broadened. Subsequent test runs consume included minutes; these figures are not a refreshed post-run balance.
- Vercel setup-time previous-30-days snapshot: 13.65 kB/100 GB fast transfer, 5.39 kB/10 GB origin transfer, 13/1M edge requests, 11.65 MB/10 GB deployment storage, 0/100 hours build time. Hobby remains active. No billing settings, subscriptions, paid add-ons or other projects changed.

Official references: [All Deployments free on every plan](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan), [Hobby limits](https://vercel.com/docs/plans/hobby), [account plans](https://vercel.com/docs/plans), [project-scoped access tokens](https://vercel.com/docs/accounts/access-tokens).

## Credentials and configuration

Repository variables: `PLAYTEST_ORIGIN`, `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`, `PLAYTEST_INCLUDED_USAGE_CONFIRMED=true`. Variable values were verified after setting them.

Repository secrets: `VERCEL_TOKEN`, `VERCEL_PROTECTION_BYPASS`, verified by name only. The token is restricted to this project and expires **27 October 2026**. The supported API attempt using the OAuth CLI session did not create a token; OAuth sessions cannot mint tokens. The authenticated dashboard's project-specific flow succeeded. Its value was transferred directly into the GitHub form in browser memory without printing it, copying it to clipboard, or storing it on disk. The project automation bypass was sent directly to GitHub secret stdin. Secret values are absent from source, reports, screenshots and phone URLs.

The CI token's actual API/deployment permissions remain to be exercised by the release workflow; dashboard creation and secret existence alone do not prove that path.

## Empty hosting proof

Only an isolated Build Output API directory with generic HTML was deployed, using `--prebuilt --prod --skip-domain`. The directory contains no game assets and no Git integration.

1. Placeholder A: `dpl_HsFVgmBKXNA3yPgXQUf5UnFfJ8Ao`, staged URL `https://colossus-wake-playtest-73lhyphee-rezarhnm-6590s-projects.vercel.app`.
2. Before assigning the permanent address, its staged URL denied anonymous `/`, `/release.json`, `/src/main.js` and allowed the authenticated placeholder.
3. After promotion, the permanent address and generated project alias `colossus-wake-playtest-rezarhnm-6590s-projects.vercel.app` passed the same checks. Signed-in desktop Chrome opened the permanent placeholder normally, without a bypass token in its URL.
4. Placeholder B: `dpl_8PzimTXezeK8k3n5BVZvtTSUyrt7`, staged URL `https://colossus-wake-playtest-nlc2df4hd-rezarhnm-6590s-projects.vercel.app`. Its content has a distinguishable B marker. Staging retained A at the permanent address; B passed denied/authorized checks before promotion.
5. Both promotions mapped the permanent alias to the exact requested deployment. The second also confirmed `targets.production.id` matching B. **Both returned `lastAliasRequest:null` on subsequent project reads.** The original release loop rejected that nullable state. CLI exit zero alone was not treated as proof of success.
6. Probe C (`dpl_E9FYEVCfV7JWqPZkzM7c2FbsErjC`) exposed another provider behavior: staging can move the generated project alias while leaving the registered permanent domain on its old deployment. It stopped before POST; its durable setup intent `6693823191` was marked failed with that evidence. C was never promoted.
7. Probe D (`dpl_FLGDyuag1gwf5mQnBLmJdsghA3jS`) returned captured HTTP 201, but an immediate strict state read preceded provider propagation. It was subsequently reconciled manually using fresh project/alias/source reads and two protected exact-byte checks. Intent `6693854448` is success. The original pre-POST inventory was not persisted, so this is explicitly **not** a passing automatic-helper result.
8. Probe E (`dpl_3KGak4kQ36jX9L9QTKyqnh9xa9z6`) passed the repaired shared helper end to end. Intent `6693941686` durably stored the sanitized complete alias inventory, exact source/build/hash and prior deployment before POST. Captured HTTP **201** was followed by three fresh successful provider/head snapshots and two complete protected exact-byte rounds on both mutable addresses. Confirmation mode is `observed-promotion`; the provider's request field remained explicitly null. E required one transition snapshot; bounded waiting is covered separately by regression tests. E is the current permanent placeholder.

E's generic build marker is `6b979cbc828b1061edcb`, source identity `c53734d914f1fdedd7bdb7c5acd77c201a8457c5`, HTML SHA-256 `11ae34daab110745e39bf44fa58ed41b14a79672295d13f30dfa668b7e86f1a7`. Its immutable URL is `https://colossus-wake-playtest-dvzr8vsbl-rezarhnm-6590s-projects.vercel.app`. These identify generic setup HTML, not a packaged game. Signed-in desktop Chrome was reloaded and visibly showed E at the permanent origin.

The nullable-state repair permits only validated old-to-new transitions within a 60-second convergence polling window. Individual bounded provider reads and subsequent hosted verification can extend the total wall-clock duration beyond that polling budget. Final success still requires READY/PROMOTED deployment and production target, positive alias assignment, unchanged complete host inventory, every alias mapped to the exact target, exact hosted bytes, private protection and unchanged source head. Missing fields, third deployment IDs, explicit provider failures, stale source or inventory changes block. Any explicit request observed must remain explicit and succeed; it cannot disappear into the null fallback. The persisted inventory is whitelisted because raw provider alias objects can contain bypass credentials. Tests verify those fields never enter the durable record. No age-based dismissal of pending requests was added.

These prove protected empty hosting and independent provider delivery only. They do not prove a hosted game update, service-worker installation on Vercel, saves across hosted A/B, or an iPhone installation.

## Local repairs and evidence

- Added an included-usage condition at the workflow job boundary, before runner allocation. A regression covers every hosted runner job.
- The live Vercel CLI emits structured JSON. Staging now parses only `deployment.id`/`deployment.url`, ignoring links in informational `next` commands, and confirms the identity against the API. Malformed/error JSON and unsafe origins fail closed. Exact legacy URL-only output remains supported.
- Added fail-closed nullable promotion reconciliation and durable sanitized pre-POST evidence, including the generated-alias staging distinction and bounded propagation checks above.
- Local suite before the final implementation: **206/206 passed**, zero skipped. The committed `5974356` and `026beb8` cloud suites each passed **207/207**, zero skipped. No game runtime, visuals, saves, engine or iPhone presentation changed.
- Startup failure capture retains the actual page before waiting for game readiness; browser-state and screenshot attempts each have a ten-second bound. Metadata/worker event timing is recorded without headers or bodies.
- The earlier Windows functional repair evidence remains in [DELIVERY_REPAIR_2026-09-27.md](DELIVERY_REPAIR_2026-09-27.md); its frozen artifact retains its original source identity. Hosting setup commits do not relabel that artifact.

Ignored local evidence: `artifacts/delivery/hosting-project.json`, `bootstrap-stage-check.json`, `bootstrap-permanent-check.json`, `bootstrap-b-promotion.json`, `bootstrap-d-manual-reconciliation.json`, `bootstrap-e-confirmed.json`, `exercise-empty-promotion-e.mjs`, `hosting-final-unit.log`, and screenshots `vercel-usage-20260927.png`, `github-included-budget-20260927.png`, `github-ci-secrets-20260927.png`, `protected-placeholder-final-20260927.png`.

## Actual Linux Actions evidence

This section preserves the hosting-setup experiments. Later installer diagnostics and runtime repairs are tracked in [INSTALLER_THREAD_REPAIR_2026-09-27.md](INSTALLER_THREAD_REPAIR_2026-09-27.md), including the actual body-abort root cause, the subsequent checker-startup failure, and the current frozen candidate. The earlier failures below remain failures.

| Source / matching run | Actual result |
|---|---|
| `309f511` / [36327554281](https://github.com/reza477/kiju-game/actions/runs/36327554281) | Units/build passed; game installation condition timed out at 150 seconds under SwiftShader. Zero combined behavior groups completed; no deployment step ran. |
| `c53734d` / [36328228826](https://github.com/reza477/kiju-game/actions/runs/36328228826) | Units/build passed; initial loaded condition timed out at 120 seconds under SwiftShader. Metadata response took 65.726 seconds; body-finished and worker requests were not observed. Browser-state and screenshot reads also exceeded their ten-second bounds. This establishes browser unresponsiveness, not its precise CPU/GPU scheduling mechanism. |
| `5974356` / [36328866670](https://github.com/reza477/kiju-game/actions/runs/36328866670) | 207 unit tests/build passed. Opt-in llvmpipe preflight confirmed Mesa in CDP, but Chromium reported WebGL unavailable and the real WebGL2 context was unavailable. It failed before loading the game; no gameplay checks or deployment ran. |
| `026beb8` / [36329193143](https://github.com/reza477/kiju-game/actions/runs/36329193143) | 207/207 unit tests passed, zero skipped; build passed. The real llvmpipe WebGL2 probe passed with pixel `[64,128,191,255]` and error 0. The game loaded, but offline installation timed out at 150 seconds; no combined behavior group completed. State capture and screenshot succeeded: `not-installed`, no installed build, no offline play. No deployment step ran. |

The differential experiment uses the runner's already installed Mesa 25.2.8/LLVM 20 and Xvfb. It installs no alternate graphics stack, uses CPU software rendering, and is not hardware or phone performance evidence. The real WebGL2 context, renderer identity and rendered pixel must all pass before game tests can run. Game quality, viewport, wall time and production deadlines remain unchanged. Downloaded evidence is under `artifacts/delivery/linux-ci-309f511`, `linux-ci-c53734d` and `linux-ci-5974356`.

The third failure matches Chromium's [Linux software-rendering blocklist entry 3](https://chromium.googlesource.com/chromium/src/+/main/gpu/config/software_rendering_list.json), which disables graphics features for llvmpipe. Commit `026beb8fe0e6df8fc58faca506bfef7797ba88ff` adds the documented `--ignore-gpu-blocklist` [test launch override](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/debugging_gpu_related_code.md) only for the explicitly selected isolated llvmpipe browser. It also records context-creation errors. All real rendering checks, normal Windows/default Linux settings, quality and deadlines remain unchanged. Focused browser/workflow tests: 9/9. The actual cloud probe then succeeded, so the blocklist issue is fixed; the required combined game test still failed.

The final failed candidate is source `026beb8fe0e6df8fc58faca506bfef7797ba88ff`, A `c261e64166dc5d5ab747`, synthetic B `32df51b75841ac67e8d9`, artifact SHA-256 `7bf080624f80a96fe14720d588fb21e3e9b139129eb6289b2bc087ebf5e6c346`. The metadata request was observed at 15:22:43.489 UTC, HTTP 200 response event at 15:23:00.871 and finish event at 15:23:02.287. Network timing reports only 3.904 ms through response end, but delivery of those browser events lagged by seconds. No `/sw.js` request was observed. This is consistent with software-rendering scheduling delay; unlike the earlier instrumented Windows reproduction, this run does not directly prove an eight-second body-abort mechanism. No page or unexpected console errors were recorded, which does not turn the installation timeout into a pass. The independent synthetic credential-confinement check passed after the failed game gate; the process still correctly exited 1. Complete evidence and the actual game screenshot are under `artifacts/delivery/linux-ci-026beb8`.

## Remaining gates

Readiness remains false because the previous visual review failed (6.9 overall; 8.4 HUD), and the Linux cloud functional gate has not passed. No art work or review was started and no exception was inferred from “Continue.” Nullable promotion reconciliation is now verified for protected generic HTML, but scoped CI deployment access, hosted game A/B and real Apple-device tests remain unproven. GitHub's deployment ledger contains explicitly setup-only intents, not playable release records. No phone-ready claim is made.
