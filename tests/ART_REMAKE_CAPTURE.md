# Art remake evidence tool

`art-remake-playtest.mjs` creates fresh browser contexts and saves. It rejects the owner's normal ports 4178 and 4214 and verifies `/health` against `SOURCE_ROOT`. Start each run in an empty, new output folder. Preserve failed reports and original PNGs.

The five matched views use the unchanged baseline `createGame('crawler','standard')` fixture at (-30,40): desktop normal City, reverse, close, phone portrait City, phone landscape City. Phone views are Chrome emulation. Desktop is 1440×960 at DPR1/High; portrait is 390×844 at DPR2/Performance; landscape is 844×390 at DPR2/Performance. The screenshot PNG dimensions reflect DPR. Native animation time is recorded rather than fabricated as identical.

Start a server in a separate terminal from the intended checkout:

```powershell
$env:PORT='4224'
node server.mjs
```

Capture a candidate from the new worktree (do not alter runtime during a run):

```powershell
$env:SOURCE_ROOT='C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game'
$env:FIXTURE_ROOT='C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game'
$env:GAME_TEST_URL='http://127.0.0.1:4224/'
$env:OUTPUT_DIR='artifacts/art-remake/after-round-01'
$env:RUN_LABEL='AFTER'
$env:MODE='capture'
node tests/art-remake-playtest.mjs
```

For six-carrier functional checks, use `MODE='smoke'` and a distinct output folder. The tool uses ordinary faction/variant/begin controls, moves through keyboard input, builds a Timber guild using the HUD, waits for actual construction, saves, reloads and verifies retained progress. `VARIANT` optionally limits smoke to one of cyborg, flesh, standard, drill, horizontal, vertical.

For an independent critic, run the same capture tool yourself into `artifacts/critic-round-XX/` (a fresh directory) with `RECORD_VIDEO='1'`. This records five seconds of native animation after each view. `VIEW` optionally limits a capture to one exact view name from the script. Review actual PNGs/video and normal gameplay; successful tool checks do not constitute an art pass.

For extra critic samples, set `CAPTURE_VARIANT` to cyborg, flesh, standard, drill, horizontal or vertical; its faction is inferred. Use `VIEW='desktop-normal-city'` for a single normal view. Nonstandard carriers retain their own native City yaw/pitch/zoom; reverse and close views apply the same relative reverse/zoom adjustments. Default standard-crawler captures keep the exact paired framing above. Set `LIGHT` to day, dusk or night; the tool clicks the normal lighting button (or its mobile menu equivalent), then lets the transition settle. Use a separate empty output folder per variant/light sample. Do not substitute these additional views for the five matched handoff pairs.

`OBSERVE_FRAMES='90'` optionally records 90 native RAF intervals plus renderer workload and adapter identity. This is a short stationary-view observation, not GPU time, sustained frame rate or a before/after speedup claim. Changed canvas DPR makes direct before/after comparisons invalid unless explicitly controlled.

The report records exact executable/arguments/environment, UTC start/finish, exit code, source commit, per-file hashes, source fingerprint before and after, errors, warnings, fixtures, actual camera state and original PNG sizes/hashes/dimensions. It excludes personal saves. It does not verify offline updates, hosted delivery, sustained performance, physical devices, art quality or complete gameplay coverage.

Baseline evidence is `artifacts/art-remake/before/`. `baseline-attempt01/` preserves a failed diagnostic attempt that incorrectly read a native dialog's visibility; its original report and tool are unchanged. The accepted baseline folder also retains its exact capture tool, since later smoke-only improvements changed the working tool.
