# iPhone presentation pass — independent art review 03

Reviewed 2026-09-24 local time. Independent critic; no game implementation, assets, tests, or capture scripts authored.

## Revision and changes

Branch `codex/iphone-presentation-pass1-20260924`, base `75503a50b5787d1c7b5103a493c73f108aba3ecc`, uncommitted presentation work. Embedded source build remains baseline `cb00d8cec12f2c169cf4`, not the identity of the changed tree.

Before browsing, SHA256 of the LF-joined tracked `git diff --no-ext-diff -- src index.html` text was `4d28ff84c9cf15f5d94921812f93a5806aa87bf0eb47ae58263a23a40e075dd0`; `src/mobile.css` SHA256 was `49167ca3346c27871904e5cde827e5c4f7ccae0e1256581f5e306a2fc8a8c2d6`. This identifies the reviewed CSS before the builder's fourth attempt. New untracked helper files are not included in the tracked-diff fingerprint.

Only two scoped refinements since round 2: the landscape enemy health bar stays under the enemy column, and the active touch battle tactic uses brass fill with dark text, like selected navigation.

## Fresh independent evidence

Ten own PNGs and detailed provenance are in `artifacts/critic-round-iphone-03/`. Interactive Chrome at isolated origin `http://127.0.0.1:4192/?test=1`, 844×390 and 390×844, DPR 1, coarse-pointer/CDP touch emulation, Performance detail and saved cinematic camera. Not physical iPhone, iOS Safari, or WebKit.

I continued my prior isolated critic save. No new state fixture or time/speed alteration was used. I selected Titan view, captured wide and closer orbit views, held/released actual touch-pad movement, selected a rival marker, entered battle, changed Hold to Approach, observed motion and combat damage, withdrew/re-entered for notification inspection, and opened Playtest in portrait. Errors/warnings returned by the browser log were empty. No performance measurement is claimed.

## Score and gate

| Category | Score |
|---|---:|
| Overall game design and aesthetics, fixed AAA comparison | **6.9 / 10** |
| Scoped mobile HUD presentation and interaction | **8.1 / 10** |

**FAIL:** below the fixed overall 8.5 target and one concrete visual defect was identified. The scoped score reflects the newly observed notification defect, despite the two refinements working well. Its discovery is not evidence that those refinements introduced it.

## Concrete defect — highest priority for the last allowed round

**Mobile battle notifications inherit incompatible vertical constraints and can overflow their background/cover controls.** The live battle-start notice in `04-landscape-battle-hold.png` has a background about 26 pixels high, while its two text lines extend below it over the control area. The normal action labels remain present, but this is a visible presentation error.

Read-only inspection found `body.in-battle #toast { top:285px }` in the inherited stylesheet. It has greater specificity than the mobile `#toast { top:auto; bottom:... }` rule. At 844×390 the toast retains top=285 and bottom=128, leaving only a padding-height box. The measured width was 380 pixels, height 26, padding 12×16, font 14, overflow visible. The measurement happened after the notification expired; the live screenshot independently establishes the visual failure.

At 390×844, the same hidden-toast geometry measured 383 pixels high with top=285 and bottom=176, showing the opposite unwanted stretch. I did not obtain a clean active portrait-toast screenshot before it expired: files 07 and 09 show expired notification states; file 08 caught the preceding City-sheet transition. Do not present those three as visual proof of an active portrait notification. Correct the rule explicitly for both mobile orientations, keep notifications within the viewport, and verify that live text/background and primary command/pad rectangles remain separate. This fix must not alter combat or timing.

## Confirmed improvements

- `04` and `05` show the enemy bar ending beneath the enemy group rather than spanning Your hull. The association is clear.
- Hold and Approach visibly change to brass/dark-text selected states. The affordance is coherent with the rest of the HUD and remains legible in portrait (`06`).
- Existing gameplay camera, green/brass identity, resources/population, real movement, rival action, and dismissible panels remain available in this sample.

## Remaining ranked polish

1. Fix the concrete battle-notification defect before any cosmetic work.
2. Optional: balance the three Playtest shortcuts at portrait width. `10-portrait-playtest-shortcuts.png` still has a two-plus-one arrangement. A deliberate layout with readable labels and ≥44-pixel targets would finish this small area; it is not a blocker by itself.

No additional world or character work is authorized. Their previously documented material, silhouette, terrain, foliage and camera-composition limitations still prevent an overall AAA score. Round 4 is the last review in this visual update; report any remaining failed gate honestly rather than expanding the art scope.
