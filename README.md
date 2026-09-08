# Colossus Wake — PC prototype 0.2

A single-player 3D city-builder set on a ruined future Earth. Build a mobile city, gather resources, and fight rival cities. Working title; all models and game content are original procedural work.

The source is backed up in the private GitHub repository [reza477/kiju-game](https://github.com/reza477/kiju-game). This is the game project; it is independent of the Vancouver Curiosity Club website. GitHub stores the code. Play locally using the launcher below.

## Play on this PC

Double-click **Play.cmd** in this folder. It starts a server bound to `127.0.0.1:4178` and opens your default browser. Chrome or Edge with WebGL hardware acceleration is recommended. No installation, login, or internet connection is needed to play; the renderer is included in `vendor/`.

If launching manually: run `node server.mjs`, then open `http://127.0.0.1:4178`.

## First expedition

1. Choose Thornbound (kaiju), Commonwealth (crawler), or Saffron Courts (airship).
2. Build a **Timber guild**: choose it in the bottom bar, then choose an empty deck plot or a numbered district in the left panel.
3. Open **Resource destinations**, choose **The Sunken Grove**, and wait for arrival. Crews gather wood automatically while stopped near the deposit.
4. Add **Hanging gardens** for food, an **Ironworks** for faster iron collection near ruins, and **Dwellings** for population growth. Select a built district to upgrade it (maximum level 3).
5. Build **Gun batteries** and **Bulwarks** before battle. Move near a rival via the minimap, select it, approach, then engage. Rivals only attack after you choose to engage.
6. Repair between battles. Defeat all three rivals to secure the region. You can continue building afterward.

## Controls

| Control | Action |
|---|---|
| WASD / Arrow keys | Move the city relative to the camera |
| Click ground | Set a travel destination |
| Click minimap marker | Select resource or rival |
| Drag | Orbit camera |
| Mouse wheel | Zoom |
| 1 / 2 | City view / world map |
| P | Pause / resume |
| Space | Fire in battle |
| E | Special ability |
| Escape | Cancel a building selection / close a dialog |

Battle buttons provide **Approach**, **Hold position**, and **Keep distance**. Weapons auto-fire in range by default; this can be switched off. Kaiju fists are strongest within 26 metres; Titan rush closes a gap of up to 70 metres. Crawlers have more hull and mid-range cannons. Airships fire farther and use Missile storm while keeping away. Touch layouts include movement buttons, tap targets, drag orbit, and a minimap.

## Graphics update

Version 0.2 replaces the simple block models with a more detailed, stylized city-builder presentation. Districts have textured masonry, layered roofs, windows, balconies, chimneys, gardens, and street furniture. Carriers have articulated limbs, mechanical details, or stitched horizontal lift envelopes. The landscape includes varied forests, planted fields, industrial ruins, a river, and distant terrain. Citizens, propellers, smoke, and water are animated.

Use **Detail** in the lower-right corner to cycle **high**, **balanced**, and **performance**. High uses sharper shadows, contact shading, subtle bloom, and higher resolution; performance reduces resolution and disables dynamic shadows and postprocessing. Use **Light** to preview **day**, **dusk**, and **night**, including illuminated windows. Lighting is a visual setting; it does not alter resource production or combat.

Existing version 0.1 saves remain compatible and receive the new graphics when loaded. The title screen shows a developed city as a preview; a new expedition still starts with three districts.

## What is implemented

- Three playable city types with original procedural 3D models: Gothic city on a kaiju backpack, terraced industrial city on tracks, domed floating city between horizontal lift envelopes.
- Animated creatures, tracks/propellers, and miniature citizens walking city streets.
- Third-person orbit camera, close city view, strategic world camera and minimap.
- Twenty buildable district plots, timed construction, three upgrade levels, local food economy and population growth/starvation.
- Wood, iron and food deposits; city travel, automatic gathering, finite deposit amounts.
- Separate tactical battle state, three enemy cities, faction-specific AI, projectiles, ranged/melee weapons, special abilities, retreat, victory/defeat, and salvage rewards.
- Local save/resume, optional synthesized audio, pause/speed controls, three graphics presets, three lighting moods, basic touchscreen layout.

## Scope of this version

This is a playable browser-based PC prototype, not a finished commercial game or native executable. Citizens are animated visual agents; they do not yet have individual jobs, inventories, or pathfinding. Building placement uses fixed plots. Battles use simplified horizontal movement and range checks; airship altitude is visual. There is one region and three encounter opponents, with no multiplayer, diplomacy, tech tree, procedural campaigns, or offline time progression. The art is stylized procedural geometry and locally generated textures; it does not yet match the breadth or polish of a finished commercial city-builder.

Phone input and responsive UI are included as a starting point. Actual iPhone performance, Safari/WebGL behavior, packaging, touch camera refinements, and App Store distribution remain future work. A native iOS build will require macOS/Xcode and device testing.

## Privacy and saves

The game makes no remote network requests. It contains no analytics, accounts, advertising, cloud services, or AI calls. The local server permits same-origin requests only. Saves live in your browser's localStorage under `colossus-wake-save-v1`; switching browsers changes the save location, and clearing site data deletes the save. There is one save slot. Saves occur every 30 seconds and when the game is hidden/closed, with a manual Save button. Returning to the title preserves the save; starting a new expedition replaces it after the next save.

This game-local behavior does not change the privacy or training settings of the Codex conversation used to build it. The owner authorized backing up the source to the private GitHub repository. No public game website is deployed.

## Development

The game uses plain JavaScript modules and a vendored copy of Three.js 0.185.1 (MIT; see `vendor/LICENSE`). The dependency was downloaded during development; no CDN is used at runtime.

- `src/simulation.js`: game state, economy, building, travel, combat, saving.
- `src/scene.js`: scene integration, camera, picking, shadows, combat effects.
- `src/architecture.js`, `src/carriers.js`: districts, city carriers, citizens, animation.
- `src/landscape.js`: terrain, foliage, water, resource sites.
- `src/materials.js`, `src/presentation.js`: local procedural textures, geometry batching, lighting, postprocessing, atmosphere.
- `src/main.js`: input, user interface, persistence, local audio.
- `src/style.css`: desktop and touch layouts.
- `node --test tests/simulation.test.mjs`: simulation checks.
- `node tests/browser-smoke.mjs`: build, gather, battle, save, and responsive browser checks.
- `node tests/graphics-audit.mjs`: all factions, desktop views, graphics and lighting controls, screenshots, and uncalibrated renderer observations. Requires a running local server and Playwright with Chrome; outputs to `artifacts/graphics-after/` by default. Set `OUTPUT_DIR` to change the evidence directory.
- `server.mjs`, `Play.ps1`, `Play.cmd`: local server and launcher.

The `?test=1` URL enables `window.__colossus` for local browser verification, exposing state, renderer, and time advancement. This is a development-only opt-in URL. It contacts no services.
