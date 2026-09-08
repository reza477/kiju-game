# Colossus Wake — PC prototype 0.5

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
5. As Thornbound, use **Add outer ring** to expand the circular backpack from seven to twenty plots (90 wood, 65 iron, 12 seconds). Buildings grow upward when upgraded; the foundation stays on one plane.
6. Build **Gun batteries** and **Bulwarks** before battle. Select each battery to choose its facing. Perimeter plots offer clearer firing lines; tall buildings can block a cannon. Move near a rival via the minimap, select it, approach, then engage. Rivals only attack after you choose to engage.
7. Repair between battles. Defeat all three rivals to secure the region. You can continue building afterward.

## Controls

| Control | Action |
|---|---|
| WASD / Arrow keys | Move the city relative to the camera |
| Click ground | Set a travel destination |
| Click minimap marker | Select resource or rival |
| Drag | Orbit camera |
| Mouse wheel | Zoom |
| 1 / 2 | City view / world map |
| 3 | Titan view (kaiju front) |
| 4 | Streets view (citizens close up) |
| P | Pause / resume |
| Space | Fire in battle |
| E | Special ability |
| Escape | Cancel a building selection / close a dialog |

Battle buttons provide **Approach**, **Hold position**, and **Keep distance**. Weapons auto-fire in range by default; this can be switched off. Kaiju fists engage within 18 metres of crawler/airship cities or 12 metres of another kaiju. A punch starts pursuit; Hold position remains available. Titan rush closes a gap of up to 70 metres into physical striking range. Crawlers have more hull and mid-range cannons. Airships fire farther and use Missile storm while keeping away. Touch layouts include movement buttons, tap targets, drag orbit, and a minimap.

## Graphics update

Version 0.5 adds cinematic battle-entry sweeps, recoil and impact movement, travel look-ahead, closer melee framing and manual battle zoom. **Camera: steady** disables the added motion; system reduced-motion preferences select it initially, and your choice saves locally. Mouse orbit takes precedence. Close building and Streets views stay steady.

Coherent wind bends trees and grass from their roots, stirs water and smoke, and carries subtle bird and butterfly motion. Drifting clouds and localized river/gully mist add depth. Day, dusk and night blend smoothly with a shared sun direction, warmer dusk light, cool reflected fill and readable night windows. High, Balanced and Performance use the same output brightness, with bounded atmosphere detail. Environmental movement freezes when paused. Attack damage now lands with the visible fist or projectile, including lethal hits and saved attacks in flight. See [CINEMATIC_VERIFICATION.md](CINEMATIC_VERIFICATION.md) for the new checks and review cycle.

Version 0.4 brings the humanoid kaiju down to a comparable overall size to the other carriers. Its Gothic backpack uses one circular foundation with a central keep, six inner plots, and thirteen outer plots unlocked through ring construction. The city grows outward in rings and upward through building upgrades. The four ascending terraces from version 0.3 have been replaced.

Citizens now have eight clothing variations per faction: Gothic coats, capes and dark dresses; Victorian British coats, waistcoats and hats; and Eastern-inspired robes, wraps and headwear. **Streets view** brings the camera close enough to inspect them. People walk, pause on errands, and animate their arms and legs.

Weapon placement affects combat. Completed batteries add damage only when a target is inside their range and firing arc. Cannons sweep 150 degrees and can be blocked by tall districts; airship missiles sweep 240 degrees and arc over buildings. Select a battery between battles to choose a direction. Installed weapons track targets, recoil, and launch their projectiles from actual muzzle positions. Built-in weapons and melee attacks remain available.

The terrain has playable hills, ridges, valleys, and level resource clearings. Crawlers follow the slope. Ground carriers leave footprints or tread impressions and crush ambient trees and rocks into stumps and rubble. Resource sites are protected. Scenery damage is saved separately for expedition and battle areas; ground marks are temporary and capped at 400. Birds, butterflies, deer, swaying grass, and flowing water add movement to the world.

The visual-review passes add a stronger backpack frame, planted soles on slopes, weight transfer, an aimed punch with a closed fist, and moving-surface impact effects. Contact shadows use a stable filter. Regional grass, soil and slate materials, varied tree crowns, collapsed ruins and a fractured rock formation give the world more variation. City framing clears the construction tray; Titan view clears that tray for full-body inspection. These changes remain subject to the independent art scores below.

Version 0.2 replaces the simple block models with a more detailed, stylized city-builder presentation. Districts have textured masonry, layered roofs, windows, balconies, chimneys, gardens, and street furniture. Carriers have articulated limbs, mechanical details, or stitched horizontal lift envelopes. The landscape includes varied forests, planted fields, industrial ruins, a river, and distant terrain. Citizens, propellers, smoke, and water are animated.

Use **Detail** in the lower-right corner to cycle **high**, **balanced**, and **performance**. High uses sharper shadows, contact shading, subtle bloom, and higher resolution; performance reduces resolution and disables dynamic shadows and postprocessing. Use **Light** to preview **day**, **dusk**, and **night**, including illuminated windows. Lighting is a visual setting; it does not alter resource production or combat.

Existing version 0.1–0.3 saves remain compatible. The same twenty kaiju district IDs map to circular plots without changing buildings, upgrades, or resources. Older saves with an occupied outer plot receive the outer ring automatically. The title screen shows a developed city as a preview; a new expedition starts with three districts and the inner ring.

## What is implemented

- Three playable city types with original procedural 3D models: a circular Gothic castle backpack worn by a humanoid kaiju, an industrial city on tracks, and a domed floating city between horizontal lift envelopes.
- Animated creatures, tracks/propellers, and citizens in distinct faction clothing.
- Third-person orbit camera, close city view, strategic world camera and minimap.
- Twenty district plots, kaiju ring expansion, timed construction, three upgrade levels, local food economy and population growth/starvation.
- Wood, iron and food deposits; city travel, automatic gathering, finite deposit amounts.
- Separate tactical battle state, three enemy cities, faction-specific AI, projectiles, ranged/melee weapons, special abilities, retreat, victory/defeat, and salvage rewards.
- Configurable battery facing, firing arcs, cannon obstruction, rotating turrets, recoil, and muzzle-origin projectiles.
- Height-aware landscape, roaming wildlife, temporary ground marks, saved scenery destruction, protected resource sites.
- Local save/resume, optional synthesized audio, pause/speed controls, three graphics presets, three lighting moods, basic touchscreen layout.

## Scope of this version

This is a playable browser-based PC prototype. Citizens are animated visual agents; they do not yet have individual jobs, inventories, or navigation around every building. Building placement uses fixed plots, with two buildable kaiju rings and three upgrade levels. Battles use simplified horizontal movement; hills do not block shots and airship altitude is visual. Destruction affects ambient scenery, not resource deposits or individual city buildings. There is one region and three encounter opponents, with no multiplayer, diplomacy, tech tree, procedural campaigns, or offline time progression. The art uses procedural geometry and locally generated textures; it does not yet match the breadth or polish of a finished commercial city-builder.

Phone input and responsive UI are included as a starting point. Actual iPhone performance, Safari/WebGL behavior, packaging, touch camera refinements, and App Store distribution remain future work. A native iOS build will require macOS/Xcode and device testing.

## Privacy and saves

The game makes no remote network requests. It contains no analytics, accounts, advertising, cloud services, or AI calls. The local server permits same-origin requests only. Saves live in your browser's localStorage under `colossus-wake-save-v1`; switching browsers changes the save location, and clearing site data deletes the save. There is one save slot. Saves occur every 30 seconds and when the game is hidden/closed, with a manual Save button. Returning to the title preserves the save; starting a new expedition replaces it after the next save.

This game-local behavior does not change the privacy or training settings of the Codex conversation used to build it. The owner authorized backing up the source to the private GitHub repository. No public game website is deployed.

## Development

Visual work follows an independent art review gate: a separate critic takes fresh multi-angle screenshots after each builder attempt, scores against the owner's fixed standard, and returns ranked corrections. Passing requires at least 8.5/10 and zero observed errors, with at most four rounds per visual update. See [ART_REVIEW.md](ART_REVIEW.md) for the current results and [AGENTS.md](AGENTS.md) for the workflow. Passing functional tests does not establish AAA art quality.

The first four-round cycle ended at **6.7/10: failed gate** (5.3 → 6.1 → 6.4 → 6.7). Its final review observed no runtime errors and one visual defect: target health dropped at attack launch before visible impact. Version 0.5 addresses that timing defect and starts a separate camera, atmosphere and lighting review cycle; previous scores and reports remain unchanged.

The game uses plain JavaScript modules and a vendored copy of Three.js 0.185.1 (MIT; see `vendor/LICENSE`). The dependency was downloaded during development; no CDN is used at runtime.

- `src/simulation.js`: game state, economy, building, travel, combat, saving.
- `src/scene.js`: scene integration, camera, picking, shadows, combat effects.
- `src/architecture.js`, `src/carriers.js`: districts, city carriers, animation.
- `src/kaiju.js`, `src/castle.js`, `src/city-layout.js`: humanoid titan, circular Gothic backpack, shared ring geometry and scale.
- `src/citizens.js`: faction wardrobes, routes, and instanced human animation.
- `src/armaments.js`, `src/weapon-layout.js`: weapon models, muzzle markers, firing directions and obstruction.
- `src/landscape.js`, `src/terrain.js`, `src/world-life.js`: terrain height, foliage, water, protected sites, damage, ground marks, and wildlife.
- `src/materials.js`, `src/presentation.js`: local procedural textures, geometry batching, lighting, postprocessing, atmosphere.
- `src/cinematic-camera.js`, `src/lighting.js`, `src/weather.js`: bounded cinematic camera offsets, shared light presets and coherent wind.
- `src/main.js`: input, user interface, persistence, local audio.
- `src/style.css`: desktop and touch layouts.
- `npm test`: simulation, ring, save migration, weapon geometry, and terrain checks.
- `node tests/browser-smoke.mjs`: build, gather, battle, save, and responsive browser checks.
- `node tests/living-world-audit.mjs`: circular expansion, humans, carrier scale, destruction persistence, tracks, protected gathering, weapon facing and muzzle origins, save migration, and mobile layout. `backpack-audit.mjs` forwards to this audit.
- `node tests/graphics-audit.mjs`: all factions, desktop views, graphics and lighting controls, screenshots, and uncalibrated renderer observations. Requires a running local server and Playwright with Chrome; outputs to `artifacts/graphics-after/` by default. Set `OUTPUT_DIR` to change the evidence directory.
- `node tests/art-review-capture.mjs`: normal gameplay views for an independent reviewer; `motion-art-capture.mjs` adds clear level/slope stride diagnostics and `combat-art-capture.mjs` adds ready, firing, contact and recovery captures. The reviewer runs these independently and inspects the images.
- `node tests/combat-contact-audit.mjs`: live fist-to-surface contact for all three target types at both simulation speeds, including moving targets and no pre-contact melee projectile.
- `node tests/cinematic-art-capture.mjs`: day/dusk/night, atmosphere temporal pairs, cinematic events, Steady/manual controls, reduced-motion defaults and narrow-screen captures using real game/render code and a deterministic clock.
- `server.mjs`, `Play.ps1`, `Play.cmd`: local server and launcher.

The `?test=1` URL enables `window.__colossus` for local browser verification, exposing state, renderer, and time advancement. This is a development-only opt-in URL. It contacts no services.
