# Colossus Wake — PC prototype 0.8

A single-player 3D city-builder set on a ruined future Earth. Build a mobile city, gather resources, and fight rival cities. Working title; models and sound design are original procedural work, with bundled CC0 surface scans and HDR lighting. See [asset credits](ASSET_CREDITS.md).

The source is backed up in the private GitHub repository [reza477/kiju-game](https://github.com/reza477/kiju-game). This is the game project; it is independent of the Vancouver Curiosity Club website. GitHub stores the code. Play locally using the launcher below.

## Play on this PC

Double-click **Play.cmd** in this folder. It starts a server bound to `127.0.0.1:4178` and opens your default browser. Chrome or Edge with WebGL hardware acceleration is recommended. No installation, login, or internet connection is needed to play; the renderer is included in `vendor/`.

If launching manually: run `node server.mjs`, then open `http://127.0.0.1:4178`.

## First expedition

1. Choose Thornbound (kaiju), Commonwealth (crawler), or Saffron Courts (airship), then choose one of its two carrier versions.
2. Build a **Timber guild**: choose it in the bottom bar. Gothic cities use **Add above castle**; tank and flying cities use an empty deck plot or numbered district.
3. Open **Resource destinations**, choose **The Sunken Grove**, and wait for arrival. Crews gather wood automatically while stopped near the deposit.
4. Add **Hanging gardens** for food, an **Ironworks** for faster iron collection near ruins, and **Dwellings** for population growth. Select a built district to upgrade it (maximum level 3).
5. Every Gothic district becomes a new storey directly above the previous top. Upgrades raise that storey and lift everything above it. **Reinforce castle harness** increases capacity from seven to twenty storeys (90 wood, 65 iron, 12 seconds) without creating empty floors. Use **Inspect castle storey** to visit and upgrade a district in Streets view.
6. Build **Gun batteries** and **Bulwarks** before battle. Select each battery to choose its facing. Perimeter plots offer clearer firing lines; tall buildings can block a cannon. Move near a rival via the minimap, select it, approach, then engage. Rivals only attack after you choose to engage.
7. Repair between battles. Defeat all five rivals to secure the region. New expeditions include all six carrier versions: yours and five opponents. Existing saves retain their original opponents.

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

Battle buttons provide **Approach**, **Hold position**, and **Keep distance**. Weapons auto-fire in range by default; this can be switched off. Melee spacing follows the target hull, including the drill crawler's longer nose. A punch starts pursuit; Hold position remains available. Titan rush closes a gap of up to 70 metres into physical striking range. Crawlers have more hull and mid-range cannons. Airships fire farther and use Missile storm while keeping away. Touch layouts include movement buttons, tap targets, drag orbit, and a minimap.

## Graphics update

Version 0.7 rebuilds the tree crowns with forked branches and individual folded leaves and needles, adds rooted undergrowth, eroded cliffs and geological beds, and blends scanned grass, forest soil and exposed rock surfaces. Masonry, roof slates, wood, bark and metal use local color, normal and roughness maps. Baked material coordinates keep masonry scale consistent while cities move. An HDR sky environment supplies reflected light; surface-oriented contact shading works in both Streets and City views. Painted armor, bare steel and dark mechanical recesses retain distinct surface responses.

The flesh titan has a sculpted skull and jaw, a broader neck/shoulder connection, regional hide color/roughness and continuous weighted limb surfaces. Its supported walk shifts under the castle's weight, with breathing and chest recovery layered onto the movement. Citizens have layered clothing, defined faces, planted soles and carrying, repair, reading and conversation poses. Completed districts include growing beds, ledgers and workshop benches where residents' hands meet the actual work surfaces. The Gothic backpack gains a projecting choir, overhanging bell chamber, connected roofed galleries and distinct foundation/chamber stonework; district windows have recessed glazing and sills. The six carriers, castle floors, weapon clearance rules and saves are retained. [Verification and review history](BEAUTY_VERIFICATION.md) records the independent art scores separately from functional checks.

## Sound

Sound starts when you press **Begin expedition** or **Continue**. Each carrier has its own engine, servo, breathing or propeller bed; footsteps, drill movement, construction, cannon and missile fire, delayed impacts, wind, water and wildlife accompany the game. A restrained original ambient score sits behind the effects. **Sound** toggles mute; **Audio mix** sets overall, music, ambience and effects levels, saved on this PC. Pausing or hiding the game silences the world; a short result cue may finish over the paused victory/defeat dialog. No audio files or services are streamed from the internet.

## Earlier visual updates

Version 0.6 replaces the circular kaiju town with a compact vertical Gothic fortress: stacked wards, narrow masonry towers, pointed roofs, bridges and a load-bearing backpack. Both the cyborg titan and a separate flesh titan carry it. The initial castle occupies two floors; upper-ward construction opens five floors without widening the plan. District IDs, resources and upgrades survive migration.

The standard armored crawler is joined by an elongated rectangular drill crawler with a rotating spiral cutting cone. The horizontal-envelope airship is joined by a city suspended from exactly four upright rounded balloons. Each version is selectable, saved locally and represented among the rivals in new games. The drill's mounts, terrain footprint, tread marks and scenery crushing follow its elongated chassis.

Version 0.5 adds cinematic battle-entry sweeps, recoil and impact movement, travel look-ahead, a brief push toward each strike and manual battle zoom. Surface flashes illuminate the armor that takes a hit, then fade; finishing blows remain visible before the result screen opens. **Camera: steady** disables the added motion; system reduced-motion preferences select it initially, and your choice saves locally. Mouse orbit takes precedence. Close building and Streets views stay steady.

Coherent wind bends trees and grass from their roots, stirs water and smoke, and carries subtle bird and butterfly motion. Drifting clouds and localized river/gully mist add depth. Day, dusk and night blend smoothly with a shared sun direction, warmer dusk light, cool reflected fill, readable night windows and warm light pools on the city decks. High, Balanced and Performance use the same output brightness, with bounded atmosphere detail. Environmental movement freezes when paused. Attack damage now lands with the visible fist or projectile, including lethal hits and saved attacks in flight. See [CINEMATIC_VERIFICATION.md](CINEMATIC_VERIFICATION.md) for the new checks and review cycle.

Version 0.4 established comparable carrier scale and the earlier circular backpack. Version 0.6 supersedes that layout with the owner's requested vertical castle.

Citizens now have eight clothing variations per faction: Gothic coats, capes and dark dresses; Victorian British coats, waistcoats and hats; and Eastern-inspired robes, wraps and headwear. **Streets view** brings the camera close enough to inspect them. People walk, pause on errands, and animate their arms and legs.

Weapon placement affects combat. Completed batteries add damage only when a target is inside their range and firing arc. Cannons sweep 150 degrees and can be blocked by tall districts, castle masonry or the titan's body; airship missiles sweep 240 degrees and arc over buildings. Castle guns use real open ports and stop their barrels before the surrounding walls. Select a battery between battles to choose a direction. Installed weapons track targets, recoil, and launch their projectiles from actual muzzle positions. Built-in weapons and melee attacks remain available.

The terrain has playable hills, ridges, valleys, and level resource clearings. Crawlers follow the slope. Ground carriers leave footprints or tread impressions and crush ambient trees and rocks into stumps and rubble. Resource sites are protected. Scenery damage is saved separately for expedition and battle areas; ground marks are temporary and capped at 400. Birds, butterflies, deer, swaying grass, and flowing water add movement to the world.

The visual-review passes add a stronger backpack frame, planted soles on slopes, weight transfer, an aimed punch with a closed fist, and moving-surface impact effects. Contact shadows use a stable filter. Regional grass, soil and slate materials, varied tree crowns, collapsed ruins and a fractured rock formation give the world more variation. City framing clears the construction tray; Titan view clears that tray for full-body inspection. These changes remain subject to the independent art scores below.

Version 0.2 replaces the simple block models with a more detailed, stylized city-builder presentation. Districts have textured masonry, layered roofs, windows, balconies, chimneys, gardens, and street furniture. Carriers have articulated limbs, mechanical details, or stitched horizontal lift envelopes. The landscape includes varied forests, planted fields, industrial ruins, a river, and distant terrain. Citizens, propellers, smoke, and water are animated.

Use **Detail** in the lower-right corner to cycle **high**, **balanced**, and **performance**. High uses sharper shadows, contact shading, subtle bloom, and higher resolution; performance reduces resolution and disables dynamic shadows and postprocessing. Use **Light** to preview **day**, **dusk**, and **night**, including illuminated windows. Lighting is a visual setting; it does not alter resource production or combat.

Version 0.8 replaces the older four-plots-per-floor layout with actual cumulative vertical construction: one Gothic district per storey, a fixed backpack footprint, and a crown that moves upward with each addition. A lower district upgrade raises all higher floors, residents, lamps and weapon mounts. New building order persists across saves; legacy saves migrate in their historical floor order without changing district IDs, levels, resources or timers. Harness capacity is retained for older expanded saves. Tank and flying cities still build horizontally. The title screen shows a developed city as a preview; a new expedition starts with three districts.

## What is implemented

- Six playable carrier versions across three factions: flesh/cyborg titans with vertical Gothic castles, armored/drill crawlers, and horizontal/four-upright-balloon air cities.
- Animated creatures, tracks/propellers, and citizens in distinct faction clothing.
- Third-person orbit camera, close city view, strategic world camera and minimap.
- Twenty district slots: cumulative vertical Gothic storeys and horizontal tank/airship plots, timed construction, three upgrade levels, local food economy and population growth/starvation.
- Wood, iron and food deposits; city travel, automatic gathering, finite deposit amounts.
- Separate tactical battle state, five enemy cities in new games, faction-specific AI, projectiles, ranged/melee weapons, special abilities, retreat, victory/defeat, and salvage rewards.
- Configurable battery facing, firing arcs, cannon obstruction, rotating turrets, recoil, and muzzle-origin projectiles.
- Height-aware landscape, roaming wildlife, temporary ground marks, saved scenery destruction, protected resource sites.
- Local save/resume, original local music and soundscape with a persisted mixer, pause/speed controls, three graphics presets, three lighting moods, basic touchscreen layout.

## Scope of this version

This is a playable browser-based PC prototype. Citizens are animated visual agents; they do not yet have individual inventories or navigation around every building. Gothic cities stack up to twenty occupied storeys, with three upgrade levels per district; other factions use fixed horizontal plots. Citizens circulate and work on supported floors but do not yet travel between floors. Battles use simplified horizontal movement; hills do not block shots and airship altitude is visual. Destruction affects ambient scenery, not resource deposits or individual city buildings. There is one region and five encounter opponents in new games, with no multiplayer, diplomacy, tech tree, procedural campaigns, or offline time progression. Carrier variants currently share their faction's economy and base combat statistics. The art uses procedural geometry with original and scanned materials; its quality is judged separately in the independent reviews below.

Phone input and responsive UI are included as a starting point. Actual iPhone performance, Safari/WebGL behavior, packaging, touch camera refinements, and App Store distribution remain future work. A native iOS build will require macOS/Xcode and device testing.

## Privacy and saves

The game makes no remote network requests. It contains no analytics, accounts, advertising, cloud services, or AI calls. The local server permits same-origin requests only. Saves live in your browser's localStorage under `colossus-wake-save-v1`; switching browsers changes the save location, and clearing site data deletes the save. There is one save slot. Saves occur every 30 seconds and when the game is hidden/closed, with a manual Save button. Returning to the title preserves the save; starting a new expedition replaces it after the next save.

This game-local behavior does not change the privacy or training settings of the Codex conversation used to build it. The owner authorized backing up the source to the private GitHub repository. No public game website is deployed.

## Development

Visual work follows an independent art review gate: a separate critic takes fresh multi-angle screenshots after each builder attempt, scores against the owner's fixed standard, and returns ranked corrections. Passing requires at least 8.5/10 and zero observed errors, with at most four rounds per visual update. See [ART_REVIEW.md](ART_REVIEW.md) for the current results and [AGENTS.md](AGENTS.md) for the workflow. Passing functional tests does not establish AAA art quality.

The 0.6 vertical-castle/six-version cycle completed all four rounds at **7.1/10**, with no remaining concrete visual or runtime errors identified in the final 69-view independent review. The 8.5 aesthetic gate remains unmet. All known floor-inspection and castle-trim firing defects are resolved in the reviewed coverage. Remaining art work concerns flesh anatomy and weight, castle architecture/materials, and citizen/environment detail. The final build passes 50 Node tests and the browser, contact and cannon checks documented in [VARIANTS_VERIFICATION.md](VARIANTS_VERIFICATION.md). See the [final variant review](art-reviews/variants-04.md).

The 0.5 camera/atmosphere cycle completed all four rounds at **7.1/10**, with no confirmed visual or runtime errors in the final 56-view independent review. The 8.5 aesthetic threshold remains unmet. The new camera, wind, mist and lighting work is playable; broader character and environment art still needs development. See the [final independent report](art-reviews/cinematic-04.md).

The first four-round cycle ended at **6.7/10: failed gate** (5.3 → 6.1 → 6.4 → 6.7). Its final review observed no runtime errors and one visual defect: target health dropped at attack launch before visible impact. Version 0.5 addresses that timing defect and starts a separate camera, atmosphere and lighting review cycle; previous scores and reports remain unchanged.

The game uses plain JavaScript modules and a vendored copy of Three.js 0.185.1 (MIT; see `vendor/LICENSE`). The dependency was downloaded during development; no CDN is used at runtime.

- `src/simulation.js`: game state, economy, building, travel, combat, saving.
- `src/scene.js`: scene integration, camera, picking, shadows, combat effects.
- `src/architecture.js`, `src/carriers.js`: districts, city carriers, animation.
- `src/kaiju.js`, `src/castle.js`, `src/city-layout.js`: flesh/cyborg titans, vertical Gothic backpack, shared floor geometry and scale.
- `src/variants.js`, `src/carrier-variants.js`: selectable variant identities, spiral drill and upright lift balloons.
- `src/citizens.js`: faction wardrobes, routes, and instanced human animation.
- `src/armaments.js`, `src/weapon-layout.js`: weapon models, muzzle markers, firing directions and obstruction.
- `src/landscape.js`, `src/terrain.js`, `src/world-life.js`: terrain height, foliage, water, protected sites, damage, ground marks, and wildlife.
- `src/materials.js`, `src/presentation.js`: local procedural textures, geometry batching, lighting, postprocessing, atmosphere.
- `src/cinematic-camera.js`, `src/lighting.js`, `src/weather.js`: bounded cinematic camera offsets, shared light presets and coherent wind.
- `src/main.js`: input, user interface, persistence, local audio.
- `src/style.css`: desktop and touch layouts.
- `npm test`: simulation, vertical expansion, six variants, save migration, weapon geometry, and terrain checks.
- `node tests/browser-smoke.mjs`: build, gather, battle, save, and responsive browser checks.
- `node tests/living-world-audit.mjs`: vertical expansion, humans, carrier scale, destruction persistence, tracks, protected gathering, weapon facing and muzzle origins, save migration, and mobile layout. `backpack-audit.mjs` forwards to this audit.
- `node tests/variants-art-capture.mjs`: fresh normal-HUD multi-angle and motion captures of all six variants, populated upper wards, floor inspection and mobile layout.
- `node tests/variants-contact-audit.mjs`: physical fist/drill contact against actual rival variants at both speeds, attached impacts and paused animation.
- `node tests/graphics-audit.mjs`: all factions, desktop views, graphics and lighting controls, screenshots, and uncalibrated renderer observations. Requires a running local server and Playwright with Chrome; outputs to `artifacts/graphics-after/` by default. Set `OUTPUT_DIR` to change the evidence directory.
- `node tests/art-review-capture.mjs`: normal gameplay views for an independent reviewer; `motion-art-capture.mjs` adds clear level/slope stride diagnostics and `combat-art-capture.mjs` adds ready, firing, contact and recovery captures. The reviewer runs these independently and inspects the images.
- `node tests/combat-contact-audit.mjs`: live fist-to-surface contact for all three target types at both simulation speeds, including moving targets and no pre-contact melee projectile.
- `node tests/cinematic-art-capture.mjs`: day/dusk/night, atmosphere temporal pairs, cinematic events, Steady/manual controls, reduced-motion defaults and narrow-screen captures using real game/render code and a deterministic clock.
- `server.mjs`, `Play.ps1`, `Play.cmd`: local server and launcher.

The `?test=1` URL enables `window.__colossus` for local browser verification, exposing state, renderer, and time advancement. This is a development-only opt-in URL. It contacts no services.
