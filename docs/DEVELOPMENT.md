# Development guide

[Project overview](../README.md) · [Contribution workflow](../CONTRIBUTING.md) · [Repository maintenance](REPOSITORY_MAINTENANCE.md)

## Local setup

For the latest completed development source, use `codex/github-stewardship-20260927`, which preserves the main development chat's environment commit `56670b3` and foliage commit `b30d21d`. The owner made that chat authoritative for implementation, verification and release decisions. `main` remains the historical Alpha 1 baseline and `codex/playtest` remains the earlier delivery checkpoint; maintenance changes neither active developer checkout.

The game uses plain JavaScript ES modules with a vendored Three.js 0.185.1 renderer. Node.js serves files and runs tests; Chrome or Edge with WebGL2 renders the game. CI uses Node.js **24.18.0** for reproducible checks and packaging. There is no application bundling step for normal local play.

```sh
npm ci --ignore-scripts
npm test
npm start
```

Open [127.0.0.1:4178](http://127.0.0.1:4178). Runtime libraries, textures and audio generation are local; development dependencies are not fetched during play. The server binds to loopback, allows GET/HEAD for public files and exposes no file-writing endpoint. See [HTTP and launcher boundaries](../SERVER-NOTES.md).

For browser testing, use a separate loopback port and a fresh profile. In PowerShell, start the test server in one terminal:

```powershell
$env:PORT = '4188'
node server.mjs
```

Then run relevant checks from a second terminal:

```powershell
$env:GAME_TEST_URL = 'http://127.0.0.1:4188'
node tests/alpha-ui-browser.mjs
node tests/local-server-qa.mjs
```

The playtest candidate pins Playwright **1.62.1** and Vercel CLI **60.0.1** in its lockfile. Older browser scripts use installed Chrome and may fall back to the Codex bundled runtime; the delivery gate uses project-pinned Chromium. Browser checks are separate from `npm test`. Run GPU/browser suites serially to avoid contention and misleading timeouts or timings. Included usage was confirmed during September 27 setup; the workflow checks `PLAYTEST_INCLUDED_USAGE_CONFIRMED` before allocating a hosted runner. Preserve included-only/no-overage limits and do not treat setup-time balances as current; see [hosting evidence](PRIVATE_HOSTING_SETUP_2026-09-27.md).

The opt-in `?test=1` URL exposes `window.__colossus` for state, renderer and time-advance inspection. Keep tests isolated from the owner's normal browser save. A worktree has a different folder identity; the launcher intentionally refuses to reuse a server for another checkout.

## Checks and packaging

| Command | Scope |
| --- | --- |
| `npm test` | Node tests for simulation, variants, audio, vertical/compact castles, camera, saves, offline lifecycle/packaging and environment rules |
| `npm run build:mobile` | Deterministic runtime package under ignored `artifacts/mobile-release/<build-id>/`; updates `src/build-info.js` |
| `node tests/alpha-ui-browser.mjs` | Save/menu/focus/upgrade regressions in a fresh profile |
| `node tests/local-server-qa.mjs` | Local identity, headers, method/Host restrictions and private-path rejection |
| `node tests/alpha-render-qa.mjs` | Carrier/camera/lighting/quality matrix and warmed motion/resource observations |
| `npm run test:mobile` | Tablet/phone workflows in desktop Chromium; port 4186 unless `GAME_TEST_URL` is set |
| `npm run test:offline-browser` | Package installation, offline reopen, save resume and repair on a temporary loopback server |
| `npm run test:iphone` | Focused phone presentation/input checks in desktop browser emulation |
| `npm run build:playtest` | One isolated frozen runtime plus a metadata-only B test fixture; leaves source build-info untouched |
| `npm run test:delivery` | Required serial full-game startup, touch, save, offline, A→B and credential-confinement checks against the frozen outputs |
| `npm run verify:playtest` | Rechecks the frozen runtime inventory and hashes |

The [Tests and private playtest delivery workflow](../.github/workflows/ci.yml) checks the candidate and permits protected staging/promotion only from `codex/playtest`. Other branches and pull requests cannot deploy. [Run 36382922486](https://github.com/reza477/kiju-game/actions/runs/36382922486) passed its full Linux functional and integrity steps, then failed at art eligibility; publishing was skipped. This overall failure is not a functional regression or a hosted release. CI does not substitute for independent art review or physical-device evidence.

The mobile build contains playable runtime files, assets, icons, manifest and offline worker. It excludes Git history, desktop launchers, credentials, tests and captures. Default `build:mobile` writes its generated ID into PC source. For the delivery lane, use `build:playtest`: it keeps working-source identity untouched and records exact commit/build/hash provenance under ignored `artifacts/delivery/`. Commit metadata contributes to current package identity, so do not relabel an older tested artifact with a later documentation commit. Building alone does not publish; [PRIVATE_DELIVERY.md](PRIVATE_DELIVERY.md) governs hosting and handoff.

### Historical and canonical package IDs

The historical local Alpha 1 package is `cb00d8cec12f2c169cf4`. Canonical line endings in the September 24 Alpha 1 baseline produced `b5d9adf4c4e48af6e780`: 107 total files, 105 precached files and 33,639,991 precached bytes. Nine packaged files differed only in line endings. Two baseline builds matched across all 107 hashes. These are historical Alpha 1 identities, not the newer playtest candidate. The original `alpha-1` tag and historical QA remain unchanged. See [the dated repository note](../ALPHA1_VERIFICATION.md).

### Blocked candidate evidence

The newest graphics source, `b30d21d`, records 227 unit tests, 54 carrier cases, 13 interaction/save smoke checks and preservation comparisons after its last runtime edit. Maintenance's exact-source copy also passed 227 units after locked dependency setup. Both environment and foliage art loops ended at 7.6/10 after four rounds and remain closed. See [environment evidence](ENVIRONMENT_POLISH_PASS1_2026-10-02.md) and [foliage evidence](FOLIAGE_ASSETS_2026-10-02.md), including the environment matrix timing boundary and the foliage critic's disclosed prior technical role. No new full frozen installation/update gate, physical-device or hosted game validation is implied by this source backup.

The earlier passing full installation evidence belongs to frozen source `d55644881550aa3d4aaa2dd5873492f13435754f`, A `af7991973d3ec6fc31ad`, synthetic B `34efede859e8c5f3ca8b`, artifact SHA-256 `16d344548def9f0743708e3e0763edb02ae8af554aea09956b7e922b69aa4546`. Linux passed 226/226 units, 12/12 game groups, 8/8 metadata-transport and 3/3 startup regressions, synthetic credential confinement and 111 runtime integrity checks. Windows passed the same 12 game groups with identical A/B IDs and primary hash. Production repair source is `bf24be2`; later `8230ce1` records results, not a new tested runtime. See [the installer report](INSTALLER_THREAD_REPAIR_2026-09-27.md). Earlier `11af190` failures remain historical evidence; none was relabelled as a pass.

The historical iPhone visual result was 6.9/10 overall and 8.4/10 HUD; the two later graphics tasks each scored 7.6 overall. None passed 8.5, so [readiness](../delivery/readiness.json) stays false and its development-owned contents are preserved. Generic protected hosting is verified at the permanent origin, but playable upload, actual CI publishing, hosted game A→B and Apple-device checks remain outstanding. `npm run handoff:playtest` is for finished eligible implementation, not read-only reviews or this blocked candidate. A successful source push is insufficient: verify the matching Actions run and exact playable build at the permanent protected origin before reporting it live.

### Public source compatibility blocker

The owner now authorizes public GitHub source. `scripts/vercel-delivery.mjs` still asserts `repository.private === true`, so it would reject the authorized public repository after eligibility clears. Reconcile this source-only guard in a separate tested implementation; this documentation update does not alter runtime or deployment code. Preserve repository identity, `codex/playtest`, readiness and all hosted-access checks. The Vercel `project.publicSource` restriction is a different setting for deployment-source exposure and remains in force. Do not turn the repository private or weaken protected hosting to satisfy the stale assertion.

## Source map

| Files | Responsibility |
| --- | --- |
| `src/simulation.js` | State, economy, building, travel, combat and saving |
| `src/main.js`, `src/style.css`, `src/mobile.css` | Input, HUD, persistence and responsive layouts |
| `src/scene.js` | Scene integration, cameras, picking, shadows and combat effects |
| `src/architecture.js`, `src/carriers.js` | Districts, city carriers and animation |
| `src/vertical-city.js`, `src/vertical-castle.js` | Ordered storeys, cumulative heights, Gothic architecture and shared collision surfaces |
| `src/kaiju.js`, `src/city-layout.js`, `src/castle.js` | Titan bodies, carrier scale, historical slot identities and legacy castle geometry fixtures |
| `src/variants.js`, `src/carrier-variants.js` | Variant identity, spiral drill and upright balloons |
| `src/citizens.js`, `src/citizen-visibility.js` | Wardrobes, routes, human animation and visibility |
| `src/armaments.js`, `src/weapon-layout.js`, `src/castle-collision.js` | Weapon models, muzzle anchors, firing directions and obstruction |
| `src/landscape.js`, `src/terrain.js`, `src/world-life.js` | Terrain, foliage, water, protected sites, scenery damage, marks and wildlife |
| `src/materials.js`, `src/presentation.js`, `src/radiance-bloom.js` | Local materials, geometry batching and postprocessing |
| `src/cinematic-camera.js`, `src/lighting.js`, `src/weather.js` | Bounded camera motion, lighting presets and wind |
| `src/audio.js` | Locally synthesized music, ambience and effects |
| `src/save-transfer.js`, `src/offline.js`, `src/playtest.js` | Portable saves, offline client and playtest interface |
| `pwa/`, `scripts/build-mobile-release.mjs`, `src/build-info.js` | Worker, manifest, deterministic packaging and generated identity |
| `server.mjs`, `Play.ps1`, `Play.cmd`, `desktop/` | Loopback server and Windows launcher |

## Targeted browser and geometry audits

Choose checks for affected behavior. Each script defines its environment variables and output path; retain reports with their tested revision.

| Script in `tests/` | Coverage |
| --- | --- |
| `browser-smoke.mjs` | Build, gather, battle, save and responsive gameplay |
| `vertical-growth-browser.mjs` | Public construction, upgrades, save/resume, 20-storey inspection and horizontal carriers; `MIXED_DISTRICTS=1` varies paid late-game orders |
| `vertical-citizens.mjs` | Floor support, compact rooms, activity contact, lamps, upgrades and pause |
| `compact-castle-residents.mjs` | Natural-sized residents/workstations, ceiling clearance and support in compact cyborg and flesh rooms |
| `vertical-weapons.mjs` | Rendered barrel and curved-shot clearance against actual masonry at several stack heights |
| `living-world-audit.mjs` | Expansion, citizens, carrier scale, destruction, tracks, protected sites, weapon damage/muzzles, save migration and mobile layout; `backpack-audit.mjs` forwards here |
| `variants-art-capture.mjs` | Normal-HUD angles/motion for all six variants, upper storeys, inspection and mobile layout |
| `variants-contact-audit.mjs` | Fist/drill contact against actual variants at both speeds, attached impacts and pause |
| `combat-contact-audit.mjs` | Moving-target fist contact at both speeds and no pre-contact melee projectile |
| `graphics-audit.mjs` | Factions, views, graphics/lighting, screenshots and uncalibrated observations; default `artifacts/graphics-after/`, configurable with `OUTPUT_DIR` |
| `art-review-capture.mjs` | Normal gameplay views for independent review |
| `motion-art-capture.mjs`, `combat-art-capture.mjs` | Level/slope strides and ready/fire/contact/recovery diagnostics |
| `cinematic-art-capture.mjs` | Lighting/atmosphere temporal pairs, events, Steady/manual/reduced-motion controls and narrow layouts with deterministic time |

## Evidence and visual review

[Alpha 1 verification](../ALPHA1_VERIFICATION.md) records September 17, 2026 scope, revision, package identity, desktop measurements and limitations. Detailed local outputs remain under ignored `artifacts/`; historical links into those directories will not resolve from GitHub. Committed verification summaries and independent `art-reviews/` reports remain the portable record.

The historical Alpha 1 environment review ended at 7.5/10. The later iPhone presentation review ended at 6.9/10 overall and 8.4/10 HUD. Both failed the 8.5 overall threshold; their scopes differ and original findings remain in [the changelog](../CHANGELOG.md) and reports. Follow [AGENTS.md](../AGENTS.md) for independent critics, fresh HUD captures, scoring and the four-round limit. Functional success is not aesthetic approval.

For performance comparisons, retain the same hardware, viewport, quality, camera, movement route and timing method. Warm the full route before measuring lazy scenery uploads. Separate CPU callback time, GPU elapsed time, frame intervals and startup samples. Stable GPU resource counts do not prove heap or long-session stability, and desktop touch emulation does not verify physical iPad/iPhone behavior.
