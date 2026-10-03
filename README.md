# Colossus Wake

**Build a city. Carry it into battle.**

A single-player 3D city-builder on a ruined future Earth. Raise a Gothic castle on a walking titan, command an industrial crawler, or sail a domed city above the valley. Gather resources, support your citizens, and defeat five rival cities in one playable region.

![Alpha 1 gameplay: an industrial city carried by an armored crawler](docs/media/alpha1-crawler.png)

*Actual Alpha 1 desktop gameplay. [Screenshot provenance and cyborg view](docs/media/README.md).*

Colossus Wake is a working title. This source repository contains the **Alpha 1 PC prototype**, version `0.10.0-alpha.1`, and subsequent development candidates. The owner has authorized public source; the hosted playtest remains protected. **[Latest completed source](https://github.com/reza477/kiju-game/tree/codex/github-stewardship-20260927)** includes the environment and foliage work completed in the main development chat. The default `main` branch retains Alpha 1, and `codex/playtest` retains the earlier installer-repair checkpoint.

[Playing & controls](docs/PLAYING.md) · [Development](docs/DEVELOPMENT.md) · [Roadmap](docs/ROADMAP.md) · [Changelog](CHANGELOG.md)

**Private playtest: Configured but blocked.** The completed environment pass (`56670b3`) and foliage pass (`b30d21d`) each finished at **7.6/10 after four review rounds**, below the required 8.5. Both results and closed review loops are preserved. The [permanent protected address](https://colossus-wake-playtest.vercel.app) serves only an empty setup page, **not a playable game**. Readiness remains false, and private-source script guards still need reconciliation. See [current delivery status](docs/PRIVATE_DELIVERY.md) and [readiness](delivery/readiness.json).

The [foliage pass](docs/FOLIAGE_ASSETS_2026-10-02.md) improves pine sprays, grass tufts and ferns while preserving placements, interactions and saves. Its final-source checks recorded **227 unit tests, 54 carrier cases, 13 interaction/save checks and preservation comparisons** passing. Short desktop/phone-emulation measurements do not establish a speedup or physical-device performance. The preceding [environment pass](docs/ENVIRONMENT_POLISH_PASS1_2026-10-02.md) preserves its own verification limits, including a carrier matrix run before its final partition rollback. Complete screenshots/video bundles remain local; the committed reports and review findings are available here.

The earlier full Linux/Windows installation gate passed on `d556448`, build `af7991973d3ec6fc31ad`; [its Actions run](https://github.com/reza477/kiju-game/actions/runs/36382922486) then stopped at art eligibility. That full gate has not been rerun for the later graphics source. GitHub synchronization preserves the main development chat's work and does not approve a release.

## Three factions, six carriers

| Faction | Carrier variants | City identity |
| --- | --- | --- |
| Thornbound | Flesh titan and cyborg titan | Gothic castle that grows one storey per district |
| Commonwealth | Armored crawler and elongated spiral-drill crawler | British industrial city on a horizontal deck |
| Saffron Courts | Horizontal-envelope airship and four-upright-balloon airship | Eastern-inspired domed city on a horizontal deck |

Build and upgrade districts, manage wood, iron, food and housing, then travel between finite resource deposits. Battle with aimed batteries, melee attacks and faction abilities. Weapon placement, firing arcs and castle clearance affect which shots can fire.

Both titan castles grow vertically on a fixed footprint. The cyborg's castle has half-height storeys; its robot and body weapons retain their scale. Construction order and district identities persist in saves.

## Play locally

On the owner's Windows PC, open **Colossus Wake - Kaiju Game** from the desktop. From this game folder, **Colossus Wake.exe** opens a local game window; **Play.cmd** is the fallback. See [Windows launcher details](DESKTOP_APP.md).

For a checkout with Node.js available:

```sh
node server.mjs
```

Open [127.0.0.1:4178](http://127.0.0.1:4178) in Chrome or Edge with WebGL2 and hardware acceleration. Runtime libraries and assets are bundled; local play needs no login or internet connection. See the [first-expedition guide](docs/PLAYING.md#first-expedition).

## Historical Alpha 1 baseline

The September 17, 2026 verification record includes **127 passing unit tests**, 180 rendering combinations, 1,296 Gothic weapon-clearance cases, and desktop, touch-emulation and offline-package checks. These are recorded results for the documented Alpha 1 revision; ongoing automated checks cover a narrower scope. See [Alpha 1 verification](ALPHA1_VERIFICATION.md) and [Tests and package](https://github.com/reza477/kiju-game/actions/workflows/ci.yml).

The final independent environment review scored **7.5/10**. The **8.5 visual quality gate remains unmet** after four rounds; its final bounded review identified no concrete visual or runtime defect. [Read the critic's findings](art-reviews/alpha1-04.md).

These results belong to the original Alpha 1 milestone, whose `alpha-1` tag remains unchanged. The earlier installer-repair candidate separately records **226 unit tests, 12 game groups, 8 metadata-transport regressions, 3 startup regressions and 111 runtime-file integrity checks** passing. That frozen evidence uses source `d556448`, not the subsequent report commit `8230ce1` or later graphics source. See [the installer repair report](docs/INSTALLER_THREAD_REPAIR_2026-09-27.md).

Physical iPad/iPhone testing, Safari on Apple hardware, sustained mobile performance and long-session memory stability remain pending. See [the current phone and delivery guide](docs/PRIVATE_DELIVERY.md#phone-installation-and-updates).

## Saves and privacy

Progress saves in the browser on your device, with manual export/import and recovery support. Keep an exported backup before clearing browser data or moving between devices. Saves do not synchronize automatically.

The local game has no analytics, advertising, accounts, cloud saves or external runtime services. Public source access and protected game hosting are separate: the hosting service requires authentication, while saves remain on the device. The source visibility change grants no new license to original game code or assets. See [repository maintenance](docs/REPOSITORY_MAINTENANCE.md).

## Working on the project

```sh
npm ci
npm test
```

Start with the [development guide](docs/DEVELOPMENT.md), [contribution workflow](CONTRIBUTING.md), and [owner's design and review rules](AGENTS.md). The game uses plain JavaScript modules and bundled Three.js. This repository is independent of the Vancouver Curiosity Club website.

Models, procedural geometry and sound design are original project work. Bundled surface scans and HDR lighting come from Poly Haven under CC0; Three.js is MIT-licensed. See [asset credits](ASSET_CREDITS.md) and [the dependency license](vendor/LICENSE). Those third-party terms do not grant a license to the original game source or assets.
