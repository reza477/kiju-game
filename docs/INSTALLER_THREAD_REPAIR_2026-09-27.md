# Installer scheduling repair — 27 September 2026

Scope: repair the remaining installation/update failure on the latest checkout. Preserve the iPhone presentation, engine, art, gameplay, controls, save schema/key and client-pinning protocol. Local checkpoint `codex/checkpoint-install-repair-20260927` retains the clean starting revision `900815e`.

## Reproduced root cause

Diagnostic-only source `b702fc7d703ef1b0cc06a4e9b6c02ffb29175088`, [Actions run 36376718271](https://github.com/reza477/kiju-game/actions/runs/36376718271), ran the unchanged production runtime with native timing and llvmpipe rendering. It again failed the initial offline-install condition at 150 seconds. The added test observers return native promises unchanged and do not read response bodies, change rendering quality or alter clocks/deadlines.

| Event | Milliseconds after document navigation |
|---|---:|
| Metadata fetch starts | 39,780.2 |
| HTTP 200 headers reach JavaScript | 65,904.1 |
| JSON body read starts | 65,904.2 |
| Existing timeout aborts its signal | 65,904.6 |
| Body rejects with `AbortError` | 65,904.7 |
| Updater publishes its error | 65,904.8 |
| Test refresh later reports `not-installed` | 67,936.6 |

Network timing reports response completion in **2.555 ms**. Main-thread long tasks of **9,603 ms** and **16,340 ms** delayed processing. The eight-second timer remained armed across response-body consumption; after the long tasks, it aborted the body before installation/registration could start. No `/sw.js` request appeared. This is direct evidence of the deadline/scheduling coupling, not a slow server or a failed service-worker registration. Repeated test refreshes subsequently obscured the earlier error; the nonmutating status observer preserves it.

The earlier Windows-only renderer adjustment allowed GPU-backed checks to pass but did not repair this production coupling. This pass addresses it in the metadata transport itself.

## Narrow runtime change

Implementation source `72910bf311f7f4444a37bda93eb1fa6af79eb9d7` moves only `/release.json` fetching, complete body parsing and the unchanged **8,000 ms** transport deadline to a self-contained same-origin classic worker. A completed response no longer retains a main-thread timer that can invalidate it while delivery waits behind rendering. The worker keeps `cache: no-store`, `credentials: same-origin` and `redirect: error`; authentication HTML, redirects, malformed JSON and invalid descriptors fail closed. Main-thread descriptor validation remains independent.

The first repair used a separate **30,000 ms main-thread startup handshake**. Its cloud retest exposed a second scheduling boundary: the parent could not observe worker readiness within that wall-clock interval under the initial rendering load. This intermediate revision is not a complete fix.

At source `72910bf`, check startup was at **40,084.1 ms**; the worker script returned HTTP 200, but the startup watchdog fired at **70,357.8 ms** before the parent processed readiness. Main-thread tasks took **10,067 ms** and **17,725 ms** during this interval. No metadata or service-worker request followed. The evidence does not establish whether readiness was already queued or worker initialization itself was delayed. A separate real-browser regression reproduced failure against the frozen revision with a **31.5-second main-thread stall before readiness**, which the previous transport-only test did not exercise.

The follow-up repair queues the metadata command immediately; native worker messaging retains it until the worker can handle it. Startup now has a **30-second observation budget**, charged at most 250 ms per 250 ms heartbeat so a long rendering task cannot consume the entire opportunity to observe readiness. A **90-second wall-clock backstop** bounds an unresponsive startup at the next available event-loop turn. This deliberately changes the new startup policy, not the existing worker-owned eight-second network deadline. Readiness clears the bootstrap watchdog; there is no main-thread response deadline.

Result, error, malformed message, load failure and startup timeout terminate the worker. A retry creates a fresh one. The worker has no imports or save/cache writes; the normal package manifest includes and hashes its single local source file. Existing update installation, safe activation and save safeguards are unchanged.

[The HTML worker standard](https://html.spec.whatwg.org/multipage/workers.html) describes the separate execution context. No external asset service, new dependency, engine change or installation was needed for this repair.

## Evidence and release identity

- Full local unit suite after the startup follow-up: **218/218 passed**, zero skipped.
- Independent review: **47 focused tests passed**, including metadata transport, updater/save safeguards, service-worker client pinning, retained caches and packaging.
- Provisional real Chromium transport regression: **8/8 passed**. The fast response actually completed during a **10.5-second main-thread block** and remained usable; genuinely stalled headers/body failed at approximately eight seconds. Same-origin cookie inclusion and refusal to contact a foreign redirect target were verified with synthetic local fixtures. These are transport checks, not full gameplay or physical-device evidence.
- Frozen committed A: `6372f979f9eb6bf61f43`, source `72910bf311f7f4444a37bda93eb1fa6af79eb9d7`, artifact SHA-256 `6114911919f0ed62c1f1711257dccc1ac746732b36b9a455c253c3c2747ee724`; **111 exact runtime files verified**.
- Synthetic B: `ee989ace7bb9983534f1`; local update fixture only, never publish it.
- Frozen `72910bf` Windows game gate: **12/12 passed**, exit zero, Chromium 151.0.7922.34, NVIDIA RTX 4070 Ti SUPER/D3D11. Zero page errors, unexpected console errors or remote requests. The run covered failed/incomplete downloads, preservation of saves, two open A clients while B downloads, failed-save refusal, safe update, old-client pinning, title update, missing-module recovery and offline reopening with the server stopped. Its eight transport regressions also passed.
- Matching intermediate cloud run [36377103085](https://github.com/reza477/kiju-game/actions/runs/36377103085): **216/216 units and 8/8 transport checks passed; 0/12 game groups completed** because the new startup watchdog failed as described above. llvmpipe WebGL2 rendering was verified. This remains a failed functional gate, not a passing deployment.
- The focused native-browser startup regression fails against frozen `72910bf`. The follow-up provisional package passes **3/3**: one 31.5-second stall, two 16-second stalls with delayed worker-source delivery, and a never-ready worker that fails cleanly after 31.19 seconds on a responsive page. All native workers are terminated. These tests use the actual packaged `offline.js` and stop intentionally at its registration boundary; they are not a replacement for the complete game gate. Unit tests additionally verify the 90-second ceiling even if a late ready message reaches JavaScript before its overdue timer.
- Follow-up frozen release identity and full cloud outcome: pending verification.

Ignored evidence: `artifacts/delivery/linux-ci-b702fc7/`, `linux-ci-72910bf/`, `metadata-worker-unit.log`, `metadata-worker-transport-provisional/release-transport.json`, `metadata-worker-pinned/`, `startup-regression-before/`, and `build-pre-metadata-thread-repair.json`. The previous frozen Windows artifact and failure reports remain intact. The provisional transport package has source identity `local` and must not be relabeled as the committed release.

Publication remains disabled while required functional checks or the existing visual gate fail. The permanent protected address still contains only the setup placeholder. Hosted game A-to-B, actual scoped CI publishing, desktop WebKit and physical iPhone/iPad checks are not established by the tests above.
