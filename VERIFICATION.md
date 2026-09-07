# Prototype verification — September 7, 2026

## Passed

- 16 simulation tests: faction differences, construction transactions and timing, invalid orders, upgrades, hull improvements, travel/arrival, finite gathering, resource production, food/population economy, pause, movement speed, engagement distance, retreat, weapon range/reload, special abilities, enemy tactics, victory/defeat, repairs, and save validation.
- All three playable factions completed a simulated three-rival expedition with one affordable gun battery and one bulwark, their appropriate combat tactics, special abilities, and paid repairs between battles.
- 13 browser checks in installed Chrome via Playwright: three title previews, building through the UI, resource travel and gathering, manual save, world camera, rival selection and battle transition, battle movement and special ability, withdrawal, reload/resume, pause, 390px layout overflow, and browser/network errors.
- Zero browser JavaScript/console errors and zero remote game network requests during the browser session.
- Local server: JavaScript and PowerShell syntax checks plus 14 health/access checks, including GET/HEAD, rejected unsupported methods, private root paths, traversal attempts, malformed encoding, dotfiles, and invalid Host headers.
- Screenshots inspected for the title screen, city models, management view, battle, and narrow layout. Visual refinements included Gothic corner towers/banners, crawler lower terraces, horizontal airship lift envelopes, reduced battle effects, and hiding the journal on narrow screens.

Browser evidence and screenshots are under `artifacts/`. The browser test uses an isolated temporary browser context, so test progress does not alter the player's normal browser save.

## Remaining boundaries

No physical iPhone, Safari, native iOS package, native Windows installer, multiplayer, or production performance benchmark was tested. The current release is a local browser prototype for PC playtesting. See README.md for current simplifications and controls.
