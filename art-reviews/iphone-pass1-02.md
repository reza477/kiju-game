# iPhone presentation pass — independent art review 02

Reviewed 2026-09-24 local time by the same separate critic. The critic wrote no game implementation, assets, tests, or capture scripts.

## Reviewed identity

- Branch `codex/iphone-presentation-pass1-20260924`, base `75503a50b5787d1c7b5103a493c73f108aba3ecc`, uncommitted working-tree presentation changes.
- Embedded working-copy build `cb00d8cec12f2c169cf4` still identifies the baseline build rather than the changed tree.
- SHA256 of LF-joined `git diff --no-ext-diff -- src index.html` text: `ad1f9db740eac9b65d47efb558bbede54001cadbb1e931d47b6012db7316cb34`. As in round 1, this is a tracked-diff fingerprint, not a hash including new untracked helpers.
- `src/mobile.css`: `946021e035627496c622e3a3384150a8fffdc3f473883859477cfada601f5da2`.
- `src/main.js`: `fdd5e946cc050b1ec01d8683a7ab137a7e3fd325596ebf2371f9af7573f5a6c7`.
- `src/playtest.js`: `4a06f5d74e87af89abfbb6590c3d7c62def03d0c26f2e298ebf434fb159c5693`.

Changes since round 1: a full-width sticky dialog toolbar and reserved scrolling lane; reset/scroll-padding corrections; Offline/Save/Play sample shortcuts; rival Approach/Engage promoted before description; compact landscape battle information and command framing; mobile keyboard-hint removal.

## Independent evidence and actions

Nine own fresh screenshots plus `browser-observations.json` are under `artifacts/critic-round-iphone-02/`. Interactive desktop Chrome at the isolated origin `http://127.0.0.1:4192/?test=1`, 390×844 and 844×390, DPR 1, coarse-pointer/CDP touch emulation, Performance detail, retained cinematic-camera preference. Not physical iPhone, iOS Safari, or desktop WebKit.

I continued the critic's isolated round-1 cyborg save, including its legally constructed fourth-storey Timber guild and prior position-only encounter arrangement. No new state fixture or time/speed alteration was used in this round. I opened the menu, manually compared existing preset choices before returning to Performance for matching review, used Play sample, scrolled portrait/landscape dialogs, closed them, selected the rival marker, immediately engaged, used Approach, observed the player's hull fall during actual combat, withdrew, then inspected wide and close normal Titan views with drag/zoom and held/released touch movement. Browser error/warning log was empty. No frame-rate claim is made.

## Score and gate

| Category | Score |
|---|---:|
| Overall game design and aesthetics, fixed AAA comparison | **6.9 / 10** |
| Scoped mobile HUD presentation and interaction | **8.2 / 10** |

**FAIL against the fixed ≥8.5 overall gate.** No new concrete scoped visual or runtime error was identified in this review sample. The absence of a discovered defect is not an exhaustive zero-error certification. The overall world/character art limitations recorded in round 1 remain outside the authorized pass.

## Resolution of prior findings

1. **Fixed: scrolled Close-button text occlusion.** The opaque full-width toolbar now reserves a clear lane. Portrait sample and arbitrary scroll positions (`02`, `03`) and landscape (`04`) no longer lose paragraph line endings underneath a floating close control. Ordinary scrolling can clip a line at the content boundary, as expected, but the button does not intrude into that line.
2. **Improved: battlefield readability.** The information strip is 73 pixels high rather than 144, and the action panel is approximately 139.6 pixels rather than 151.6 at 844×390. Both carriers are visible in the central strip in `06-landscape-compact-battle.png`. All sampled critical action labels remain 14 pixels; Withdraw and Titan rush are 44 pixels high. This is a practical improvement without changing the camera or battle rules.
3. **Fixed hierarchy issue: rival CTA.** `05-landscape-rival-initial-sheet.png` shows Engage immediately below the rival name, at the initial scroll position. I successfully used it without first scrolling past descriptive text.
4. **Improved: reaching the sampler.** The Play sample shortcut scrolls directly to the sample section with the toolbar retained. The long page is now navigable rather than requiring the same scroll each visit.

## Remaining feasible polish — not concrete errors

1. **Clarify which hull the horizontal bar represents.** The landscape enemy health bar currently stretches below both the enemy column and the adjacent Your hull column (`06`). The numbers are labeled, so this is not misinformation, but the spanning bar weakens the grouping. Keep the enemy bar visually within its enemy information group; retain the explicit own-hull value and readable range.
2. **Strengthen the selected battle-tactic state.** Its muted green active fill is less immediate than the clear brass active camera/panel treatment. A consistent restrained brass accent, visible selected state, and sufficient text contrast would improve rapid recognition without changing actions or timing.
3. **Optional secondary polish:** the three Playtest shortcut buttons wrap as two-plus-one in portrait. A deliberately balanced layout would feel more finished, provided labels remain readable and each target stays at least 44×44. Do not prioritize this over the first two items or expand into a new interface system.

The next review should be another small HUD refinement. Do not attempt to obtain an overall 8.5 by changing the world, forcing High detail, altering the established camera, or relabeling this score as a pass. Physical-device ergonomics, hardware safe areas, iOS behavior, and sustained mobile performance still require the owner's device.
