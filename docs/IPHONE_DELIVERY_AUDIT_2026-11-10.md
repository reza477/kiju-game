# iPhone delivery audit — 10 November 2026

The owner requested a mobile game they can install and test on an iPhone, including away from home. The existing protected HTTPS Home Screen web-app route fits that request. A local Wi-Fi server alone would not satisfy it, and a runtime ZIP must not be described as an iPhone installer.

## Current verified facts

- The current source already contains touch controls, phone panels, offline preparation and integrity checking, save export/import/recovery, update handling, and locally downloadable feedback/frame samples.
- The GitHub connector read `reza477/kiju-game` as **public**, default branch `main`, with the current account retaining administration rights. No visibility setting was changed.
- `gh api repos/reza477/kiju-game/actions/variables/PLAYTEST_ORIGIN --jq .value` returned `https://colossus-wake-playtest.vercel.app`, exit 0.
- The existing `handoff-playtest.mjs` and `vercel-delivery.mjs` still require a private repository. The public-source decision and those guards remain unreconciled. This audit does not weaken either guard.
- Vercel connector reads for the recorded project and deployment history returned **403**: the connection lacks authorization for the existing `rezarhnm-6590s-projects` team. This is blocked/unknown coverage, not an empty project or a failed game deployment. No share URL, protection bypass, upload, promotion, token rotation, billing change or account mutation was performed.
- Fresh anonymous HTTP GETs at **16:10:35–16:10:36 UTC** to the permanent origin's `/`, `/release.json` and `/src/main.js` each returned **302** to `https://vercel.com/sso-api`. Redirects were not followed and no credentials or bypass were used. This confirms a current authentication challenge on those three paths; it does not verify the protected game contents or matching hosted build. The local receipt is `artifacts/nov10-improvements/iphone/anonymous-host-probe-01.json`.
- The September setup report recorded a scoped CI token expiry of **27 October 2026**. That historical token would now be expired; current credential validity or a later replacement was not verified. Do not claim the currently configured secret is definitely expired.
- The installed Playwright package expects WebKit 26.5, revision 2336. Its executable was absent during the initial probe. The CLI's `install --dry-run webkit` read installation metadata; an HTTP HEAD request to the official archive returned 200 and a compressed size of 62,478,226 bytes. The pinned runtime was then installed through the existing local Playwright CLI, exit 0, from `08:01:30.264` to `08:01:34.678 UTC`. Installation evidence is in `artifacts/nov10-improvements/iphone/webkit-install-01/`; installation is not a game compatibility pass. Playwright WebKit is patched testing software, not branded Safari. [Official Playwright browser documentation](https://playwright.dev/docs/browsers).

## Current local browser evidence

### Final independent review finding — still blocked

November round 4 scored **8.1/10 FAIL**. Its additional flesh-only Windows WebKit visit passed its programmatic assertions, but the critic and root inspected the original first portrait PNG and found a cyborg castle while the report identifies flesh, native actor ready, preview false and render frame 46. Four subsequent landscape images show the correct beast. The original is `artifacts/critic-round-04/nov10-improvements/phone-webkit-flesh/flesh-portrait-city.png`, captured `2026-11-10T18:03:48.986Z`, SHA-256 `6c3ec214983f45eac4edfda225114930d664472f459bb3f1d270788ce9424164`.

This bounded presented-frame mismatch is **N04-E3, open**. Its cause, duration and physical-iPhone relevance are unknown. It does not establish recurrence of the repaired harness contour exception. No browser console/network error accompanied it. The exact source remained `18bc3001...`. The earlier frozen WebKit 06 and offline 03 results below remain valid bounded history, but the final candidate must not be presented as a complete mobile visual compatibility pass. See `art-reviews/NOVEMBER_IMPROVEMENTS_ROUND_04.md`. The four-round limit and owner's wrap-up deadline ended this update without another repair/review attempt.

### Candidate 2 — frozen runtime and offline verification

The latest prepared mobile candidate is build **`f8dd2b581ff00a3c6c87`**, generated from game checkpoint **`3e1ca457413f00946bfabc0d48c6ac52ccef018b`** with runtime fingerprint **`18bc3001c928824e99b564df4c41793ea0de8bea453374cf0b61dbe8c40451a1`**. The later **`c29479b7b21d695fdc804f10c2132bb94fc0fa46`** commit changes test code only; it does not change this game's runtime or the frozen mobile build. The complete release/art gate remains separate and blocked.

- **Build:** `mobile-build-02/report.json` records exit 0, unchanged checked inputs and no write to source/build-info. The frozen output has 161 files: 159 precached runtime files plus the worker and release descriptor.
- **WebKit:** `webkit-check-06/report.json` records exit 0 from **17:41:37.163 to 17:43:48.143 UTC**, with unchanged inputs. `webkit-06/report.json` and ten original PNGs cover flesh and the standard crawler in isolated Playwright 1.65 / Windows WebKit 27.2: native district upgrade, route/stop controls, actual movement, portrait/landscape rendering, native view taps, save and reload. Representative original portrait, landscape and post-reload images were visually inspected.
- **Offline:** `offline-check-03/report.json` records exit 0 from **17:46:09.546 to 17:47:36.751 UTC**, using the committed runner at `c29479b7...`, with unchanged inputs. `offline-03/results.json` records complete-cache preparation, actual loopback-server shutdown with browser networking offline, reopening the saved flesh expedition, rendered touch movement, independent recovery when the cached boot module was removed, and explicit full-cache repair preserving the save. The current native GLB and six rig/saddle modules matched their manifest hashes in complete caches at installation, offline reopen and repair. The actual scene owned the ready native 27-joint actor in every phase. No browser runtime errors or third-party requests were recorded.

The offline run used desktop Chrome 157 with touch emulation and the Windows D3D11 backend. The WebKit run used a patched desktop browser. Neither is physical iPhone/Safari, Home Screen installation, hosted authentication or a sustained-performance measurement; CPU checks ran concurrently and no benchmark claim is made.

The retained `offline-check-02/` failure was a test scenario mismatch: the game's normal title starts cyborg, while the added native-beast check required flesh. Its complete cache already contained the expected native asset. The committed runner now selects flesh through the real title variant button before Begin when that optional scenario is requested. It preserves the game's default and all existing checks. This failure and all earlier WebKit attempts remain unchanged.

### Candidate 2 hosting archive

`artifacts/nov10-improvements/iphone/Colossus-Wake-iPhone-Hosting-f8dd2b581ff00a3c6c87.zip` contains exactly the 161 frozen runtime files, totaling **121,163,539 bytes** uncompressed. Archive size: **99,263,009 bytes**. SHA-256: **`9ccf39efb837bfc76654ba8d7f7ccf1a1f4ed890bcfa0a7b947751917dd0e409`**. Every ZIP entry was reopened and independently checked against the frozen source bytes/hash; after the browser checks, all frozen files and the ZIP still matched. Receipts are `mobile-hosting-archive-02.json` and `mobile-final-integrity-02.json`. The latter retains a packaging-only verification helper's initial import-path error before the corrected integrity pass.

The adjacent `README-iPhone-f8dd2b581ff00a3c6c87.txt` identifies this as **candidate 2, a hosting package—not an iPhone installer or an approved release**. It has not been uploaded. The protected host's matching game contents remain unverified; account/setup and release blockers below still apply. If the active asset later changes, this remains an honest preserved candidate and the affected final evidence must be regenerated.

### Earlier phone-emulation investigations

`tests/iphone-webkit-playtest.mjs` completed against the held source candidate from **16:08:19.280 to 16:10:43.763 UTC**. Its completed report records pass/exit code 0 for flesh and the standard crawler: renderer startup, native district upgrade, resource-route tap, movement and stop, portrait/landscape DOM dimensions, native save and reload. There were no captured page/console errors, failed requests or remote requests. Four original PNGs and the full report are under `artifacts/nov10-improvements/iphone/webkit-02/`.

Inspection of those original screenshots showed the game in portrait, but both immediate landscape captures showed the HUD over a solid dark-green canvas after rotation. Positive triangle counts and an intact WebGL context did not prove visible landscape rendering. That run's programmatic pass must not be represented as a complete mobile compatibility pass. The follow-up below preserves and explains this failure.

The exact runtime source fingerprint was unchanged before/after: `11e3fe99b58728bfee5db7128af0f0e0245115d5df2df263ac71566e983d7053`. Served runtime responses, including the new rigged beast, matched their source hashes. This is **Windows Playwright WebKit phone emulation**, not physical iPhone/Safari or a performance measurement. Service workers were deliberately blocked in this rendering/control check; a final frozen release still needs the independent complete-cache/offline check. Later source changes require final-candidate validation.

The first attempt, `webkit-01`, was interrupted when its execution context disappeared. Its original unfinished report and portrait image remain unchanged, with a separate `webkit-01-interruption.json` recording the incomplete status. No exit code or pass was invented for that attempt.

### Initial rotation diagnosis

`webkit-03` exited 1 because its diagnostic image decoder attempted a `data:` image, which the game's existing CSP correctly rejected. The test was corrected to decode original PNGs in Node using the installed Playwright PNG utility. The game and its CSP were not changed.

`webkit-04` reproduced the blank landscape in pinned Playwright 1.62.1 / Windows WebKit 26.5, exit 1, **16:20:10.612–16:21:33.084 UTC**. Native renderer frames advanced from 156 to 178 to 208 through delay and real World→City taps, but the original landscape screenshots' sampled central pixels stayed one solid color. A normal save/reload restored visible rendering. This matches the confirmed Windows WebKit display-buffer resize defect documented in [Playwright issue 42885](https://github.com/microsoft/playwright/issues/42885), whose fix was merged upstream; it is not evidence of an iPhone-specific failure.

An isolated Playwright **1.65.0** installation under ignored artifacts then ran the same game/test. `webkit-05` passed with **WebKit 27.2, revision 2388**, exit 0, **16:24:54.142–16:26:12.665 UTC**. Its original portrait, immediate landscape, delayed landscape, landscape after native view taps and landscape after save/reload all contain rendered game imagery; the delayed landscape was also visually inspected. The same test retained native district upgrade, resource route, movement/stop and save/reload checks. No production source, project package/lock, renderer behavior or CSP workaround was used to obtain this result.

Both differential runs used the identical runtime fingerprint `79c38aa4b00af199fe94b5c8689008aa987480fdd0d660546498f7dc1177c3f4`. During `webkit-05`, the root agent recorded that already-frozen source in checkpoint `cc296e315351cbd8270108c6205052f78fe1f449`; the runtime hashes did not change. The earlier crawler check is in `webkit-02`; the final differential covered flesh only. This remains patched desktop WebKit phone emulation, not physical Safari, Home Screen installation, thermal testing or a sustained-performance result.

### Preserved candidate 1 hosting file

The isolated candidate build is **`ed64ab342954ec0a16cd`**, generated from checkpoint `cc296e315351cbd8270108c6205052f78fe1f449`. Build exit code 0 and unchanged source/build-info are recorded in `artifacts/nov10-improvements/iphone/mobile-build-01.json`. It contains 161 runtime files, including the 159-file precache manifest; total emitted runtime size is 121,157,033 bytes.

`artifacts/nov10-improvements/iphone/Colossus-Wake-iPhone-Hosting-ed64ab342954ec0a16cd.zip` contains exactly those 161 files at the hosting root. Every entry was reopened and checked against its source bytes/hash. Archive size: **99,260,856 bytes**. SHA-256: `13693f227255f907e30738a1ecb6ab2cde7e982de4ae2c333c86b19572998396`. The raw archive receipt and corrected byte-total summary are retained beside it. This is **candidate 1**, a hosting file rather than a phone installer; the current game has not been published. Further visual revisions are planned after the first November review, so full offline installation/reopen/repair validation is deferred until the final candidate is frozen. Candidate 1 and its original evidence remain unchanged.

## Required delivery work

Prepare and validate an isolated mobile runtime from the actual final candidate, retaining the build ID and file hashes. Keep the bundle local while `delivery/readiness.json` is false. The failed visual/geometry gate is not waived by the request for an iPhone file.

Before real phone delivery, reconcile the repository guard with the owner's latest visibility decision; establish current authorized access to the existing Vercel team; verify current scoped CI access and included-only usage; and run the designated branch's checks and protected-host validation for the exact candidate. The Vercel tool offers `authorize_team_access({teamId})`, which creates a single-use consent link valid for ten minutes. It does not grant access itself: the owner opens the link and approves the connection's existing permissions. That tool was discovered but not invoked here.

Only after the playable release is verified should the owner receive the existing permanent link as a game installation link. Installation is Safari → Share → Add to Home Screen, with Open as Web App enabled if shown. Complete the offline download before testing away from home. [Apple iPhone Home Screen guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

Storage eviction and quota failures must remain handled; an installed web app is not immune to operating-system storage cleanup. [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/). The iPhone model and iOS version are still unspecified. No physical iPhone, mobile Safari, Home Screen installation, hosted sign-in, battery/thermal or long-session result is established by this audit.

**Status: Configured but blocked.** The owner-facing instructions are in [MOBILE_PLAYTEST.md](../MOBILE_PLAYTEST.md). This report is local preparation, not publication or an art-only exception.
