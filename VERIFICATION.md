# Prototype 0.3 verification — September 7, 2026

## Humanoid and castle backpack

- The local game URL `http://127.0.0.1:4178/` returns Colossus Wake from the Kiju Game workspace. The default-browser launcher opens that game URL.
- The upright humanoid and castle together occupy approximately 21.3 m in width and 66.6 m in height. The castle sits behind the torso, with a visible shoulder/waist harness and four ascending terraces. Local geometry checks found finite positions/normals and clear static build envelopes at all twenty plots.
- The backpack browser audit covers twenty stable plot IDs, four heights with five plots each, actual canvas selection on every terrace, construction on all four tiers, upgrades, and a version 1 save/reload with unchanged buildings and plot coordinates.
- Actual City/Titan camera buttons and keys 1/3 work; Titan controls are hidden for crawler and airship cities. Front, side, rear, starting, and developed-city screenshots are under `artifacts/backpack-final/`.
- The other two factions retain their flat deck layout and construction controls. The 390px layout has no horizontal overflow. The audit reported zero browser errors, remote requests, or WebGL context loss.
- Cameras, enemy selection bounds, district selection rings, citizen paths, and combat effect heights account for the taller carrier and elevated plots. City and Titan framing was checked against the on-screen controls.

The simulation and save schema are unchanged. Citizens remain visual agents, moving along the terrace promenades; the staircases are scenery. The new art has been verified on this PC in Chrome, without a new calibrated performance benchmark or physical iPhone test.

## Version 0.2 graphics audit (earlier baseline)

- All three factions rendered in title, starting city, world, developed city, and close district views at 1440×960 and 1920×1080. The developed-city fixture contains twelve districts across all seven building types and three upgrade levels.
- The actual Detail button cycled high → balanced → performance → high; the Light button cycled day → dusk → night → day. No WebGL context loss, browser errors, or remote network requests occurred.
- The 390×844 title and city layouts have no horizontal document overflow, and construction controls remain visible. This is a desktop viewport check, not a physical phone performance test.
- Forty-eight canvas clicks across the three factions selected the expected districts during the integration audit.
- The disposal regression check covered nine carriers and eighteen resource sites across three cycles: all 132 instanced meshes emitted their GPU cleanup event, while shared materials remained intact. Browser GPU allocation stability was not measured.
- Final screenshots cover textured architecture, articulated carriers, smoother foliage, terrain, day/dusk/night lighting, selective illuminated windows, and graphics presets. Evidence is in `artifacts/graphics-final/`; baseline images are in `artifacts/graphics-before/`. Both directories are local and excluded from Git.
- Shared geometry/material caches and merged static meshes reduce submission overhead. The final 1440×960 kaiju world observation submitted 833 draws / 3,535,636 triangles across scene and shadow passes, compared with 1,696 draws / 58,986 triangles in the original prototype. The final developed kaiju scene submitted 436 draws / 3,034,750 triangles on high and 236 draws / 1,598,048 triangles on performance.

Frame observations used headless Chrome 152 on this Windows PC (Core i7-14700F, 32 GB RAM, RTX 4070 Ti SUPER). In 2.5-second samples, the final kaiju world had a 10.1 ms median / 30.1 ms p95 animation-frame interval; the developed city had 10.1 / 30.0 ms on high and 10.0 / 19.9 ms on performance. These are uncalibrated browser scheduling observations, not guaranteed gameplay frame rates or mobile results. High detail adds substantial GPU work; performance mode is available for slower systems.

## Gameplay and local runtime

- 16 simulation tests: faction differences, construction transactions and timing, invalid orders, upgrades, hull improvements, travel/arrival, finite gathering, resource production, food/population economy, pause, movement speed, engagement distance, retreat, weapon range/reload, special abilities, enemy tactics, victory/defeat, repairs, and save validation.
- All three playable factions completed a simulated three-rival expedition with one affordable gun battery and one bulwark, their appropriate combat tactics, special abilities, and paid repairs between battles.
- 13 browser checks in installed Chrome via Playwright: three title previews, building through the UI, resource travel and gathering, manual save, world camera, rival selection and battle transition, battle movement and special ability, withdrawal, reload/resume, pause, 390px layout overflow, and browser/network errors.
- Zero browser JavaScript/console errors and zero remote game network requests during the browser session.
- Local server: JavaScript and PowerShell syntax checks plus 14 health/access checks, including GET/HEAD, rejected unsupported methods, private root paths, traversal attempts, malformed encoding, dotfiles, and invalid Host headers.
- Screenshots inspected for the title screen, city models, management view, battle, and narrow layout. Resource destinations stop the city within gathering range alongside the resource scenery.

Browser evidence and screenshots are under `artifacts/`. The browser test uses an isolated temporary browser context, so test progress does not alter the player's normal browser save.

## Remaining boundaries

No physical iPhone, Safari, native iOS package, native Windows installer, multiplayer, or production performance benchmark was tested. The current release is a local browser prototype for PC playtesting. See README.md for current simplifications and controls.
