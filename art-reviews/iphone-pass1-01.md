# iPhone presentation pass — independent art review 01

Reviewed 2026-09-24 local time by the separate critic agent. No game implementation, assets, tests, or capture scripts were written by this critic.

## Identity and scope

- Branch: `codex/iphone-presentation-pass1-20260924`.
- Base commit: `75503a50b5787d1c7b5103a493c73f108aba3ecc`, with the current uncommitted iPhone presentation changes.
- Embedded working-copy build: `cb00d8cec12f2c169cf4`; this is still the baseline identifier, not a claim that the modified working tree is identical to the baseline release.
- Review-time SHA256 of the LF-joined `git diff --no-ext-diff -- src index.html` text: `946fabd833a1a35076af752ae72f56d5fc45a3ab909b1fb4736e2aca249248f7`. This tracked-diff fingerprint excludes new untracked helpers; key file hashes below identify those separately.
- `src/mobile.css`: `244b816d11ae5fd1354b5efda2787b9f6564f40dab5259978733b5dcefdc062e`.
- `src/main.js`: `fe504e5cbf9d09cc5ea5f8c278b6b44e418fa8c3c4e63071c3728c605bbc99e1`.
- `src/marker-layout.js`: `da38cc241e85050205ad8b8e169557a950615ff371189fbe8b173abf6b58dc50`.
- `src/playtest.js`: `6905b9b9b25d8e04dd322b3c256103f44e01504555980f93794b668fc70c6821`.
- `src/playtest-sample.js`: `279090af3d7f5b91567ac6aa4eb8682c6d5c1628b1b90048670d5f5ca190a485`.

The authorized scope is mobile HUD, input, marker placement, playtest sampling, and offline release preparation. Character/world art and gameplay rules are explicitly outside this pass. The fixed overall art threshold is nevertheless unchanged.

## Independent observations

I used an interactive Chrome tab at the isolated test origin `http://127.0.0.1:4192/?test=1`, with my own fresh screenshots. Portrait was 390×844, landscape 844×390, DPR 1, coarse-pointer emulation, Performance detail. Desktop was 1440×960, DPR 1, High detail. This is desktop Chromium emulation, not physical iPhone, iOS Safari, or desktop WebKit evidence.

I began a fresh cyborg expedition, used City/Titan/World/Streets cameras, orbited and zoomed, inspected the city ledger, purchased a Timber guild with the original resources and added it as the fourth vertical storey through the actual UI, watched its progress, chose a resource marker and set a course, observed walking poses, scrolled and dismissed panels, inspected the menu and Playtest sample controls, and entered/withdrew from battle through the normal controls. For battle only, I relocated the isolated player from its normal approach route to x=-92, z=-48, 32 metres from Saffron Voyager. No combat statistics, resources, simulation time, or game speed were changed by that fixture.

Own evidence is in `artifacts/critic-round-iphone-01/`: 19 PNGs and `browser-observations.json`. Image 11 catches the City-camera transition before Titan settled; image 12 shows the settled Titan view. Camera identity is evident from the highlighted tab. All views retain the actual HUD. Browser warnings/errors returned an empty array. Intermittent browser-tool debugger timeouts temporarily cleared touch emulation and auto-paused the page; I restored the emulation and resumed through the UI. These tool interruptions are not classified as game runtime errors. This review makes no frame-rate claim.

## Scores and gate

| Category | Score |
|---|---:|
| Overall game design and aesthetics, fixed AAA comparison | **6.8 / 10** |
| Scoped mobile HUD presentation and interaction | **7.8 / 10** |

**FAIL.** Overall is below 8.5 and one concrete UI visual defect was observed. A clean test run does not establish an AAA visual result. I did not independently repeat the entire functional test suite.

The mobile HUD is now coherent and substantially more usable: green/brass identity survives; population remains visible; the ledger makes food rate and hull accessible; construction names/costs are legible; deliberate selections open dismissible sheets; closed-panel gameplay has generous camera space. The portrait construction sequence clearly communicates upward growth. Resource travel is prominent in the landscape sheet. The menu separates optional settings without losing them.

## Concrete defect — fix first

1. **Scrolled Playtest copy runs underneath the sticky Close button.** In `10-portrait-playtest-sample.png`, the 44-pixel close control obscures the end of the line explaining feedback upload/privacy above the sample section. The button has a background but no reserved header lane once the content scrolls. Give the close affordance an opaque dedicated sticky header or otherwise reserve a nonoverlapping content region, while keeping it visible and reachable throughout scrolling. Verify at both phone orientations, especially mid-paragraph positions. This is visual text occlusion, not a complaint that the panel is long.

No second concrete runtime or pointer-target defect was established in this sample. In particular, the suspected landscape battle-title/action overlap did **not** occur: title y=74..218; action panel y=230.4..382. The gap is about 12 pixels.

## Ranked polish opportunities within this pass

1. **Landscape battle information consumes too much of the composition.** In `16-landscape-battle.png`, the resource bar, 300×144 opponent card, and 668×152 command panel dominate the screen; the player's carrier is largely behind the right HUD. Compact the informational card/command framing where feasible, keeping all critical labels ≥14 pixels and primary targets ≥44 pixels. Preserve the camera and battle rules. This is composition/readability polish, not a claim of overlapping hit targets.
2. **Prioritize rival Approach/Engage as successfully as resource Set course.** In the 844×390 selection sheet, the rival explanation and distance precede its main action, requiring a scroll to act. Move that existing action into the initial visible portion without removing information or actions. The resource sheet already demonstrates a clearer hierarchy (`13-landscape-resource-sheet.png`).
3. **The Playtest page needs stronger scanning hierarchy.** It is readable but still a long uninterrupted explanation. Shorter visual groupings or compact disclosure treatment for secondary instructions would make reaching the opt-in sample easier. Retain all limitations and offline/save-backup instructions. This is optional polish, not justification for a new dashboard.

## Out-of-scope art limitations — do not fix during this pass

The overall image remains below polished PS3/AAA presentation. The cyborg has broad, smooth purple primitives with limited material breakup; repetitive straight castle bays read as a stacked open scaffold at close range; terrain has broad low-information areas and simple mountain silhouettes; foliage remains visibly card-based. The Performance preset also removes shadow grounding, which makes distant entities appear less attached to the terrain. Some normal battle framing clips carriers at the edge in portrait. Those are existing art/camera tradeoffs, not authorization to force High detail, change carriers, replace assets, or alter cameras in this mobile pass. The High desktop views have richer light and terrain grounding but still do not satisfy the absolute 8.5 gate.

## Next review

Submit a concrete HUD revision addressing the text occlusion and the highest-priority feasible composition/action-order issue. Keep world/character art untouched and maintain the same honest gate. Physical-phone ergonomics, safe-area hardware behavior, sustained performance, and iOS offline reliability remain outside this emulated art review.
