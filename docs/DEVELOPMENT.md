# Development guide

[Project overview](../README.md) · [Contribution workflow](../CONTRIBUTING.md) · [Repository maintenance](REPOSITORY_MAINTENANCE.md)

## Local setup

The game uses plain JavaScript ES modules with a vendored Three.js 0.185.1 renderer. Node.js serves files and runs tests; Chrome or Edge with WebGL2 renders the game. CI uses Node.js **24.18.0** for reproducible checks and packaging. There is no application bundling step for normal local play.

```sh
npm ci
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

Browser scripts expect Playwright and installed Chrome. They try a locally available Playwright package, then the existing Codex bundled-runtime path. That fallback is machine-specific; a fresh contributor checkout needs an available Playwright environment. Browser checks are not included in `npm test`. Run GPU/browser suites serially to avoid contention and misleading timeouts or timings.

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

The [Tests and package workflow](../.github/workflows/ci.yml) provides automated repository checks. CI does not substitute for GPU, art-review or physical-device evidence. Read the workflow for its current scope.

The mobile build contains playable runtime files, assets, icons, manifest and offline worker. It excludes Git history, desktop launchers, credentials, tests and captures. The build ID covers runtime bytes and worker behavior; runtime changes require rebuilding, while documentation-only changes do not. Packaging writes the same ID into PC source after completion. Output expects the root of one stable HTTPS origin and does not configure or publish hosting. See [mobile preparation](../MOBILE_PLAYTEST.md).

### Historical and canonical package IDs

The historical local Alpha 1 package is `cb00d8cec12f2c169cf4`. Canonical line endings in the maintained checkout produce `b5d9adf4c4e48af6e780`: 107 total files, 105 precached files and 33,639,991 precached bytes. Nine packaged files differ only in line endings, which change the byte-based identity without changing gameplay. Two canonical builds matched across all 107 file hashes. The original playable checkout, Alpha 1 source tag, screenshots and historical QA remain unchanged. See [the dated repository note](../ALPHA1_VERIFICATION.md).

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

The latest environment review ended at 7.5/10, below the 8.5 threshold. Historical scores reflect their own scope and remain in [the changelog](../CHANGELOG.md) and original reports. Follow [AGENTS.md](../AGENTS.md) for independent critics, fresh HUD captures, scoring and the four-round limit. Functional success is not aesthetic approval.

For performance comparisons, retain the same hardware, viewport, quality, camera, movement route and timing method. Warm the full route before measuring lazy scenery uploads. Separate CPU callback time, GPU elapsed time, frame intervals and startup samples. Stable GPU resource counts do not prove heap or long-session stability, and desktop touch emulation does not verify physical iPad/iPhone behavior.
