# iPhone presentation pass — independent art review 04, final

Reviewed 2026-09-24 local time. This is the fourth and final review allowed for this visual update. The separate critic wrote no game implementation, assets, tests, or capture scripts.

## Reviewed release

- Frozen packaged runtime served at `http://127.0.0.1:4193/?test=1`, a new isolated origin.
- **Build `8f73de81f12f4aad019b`**, independently confirmed in the visible Playtest UI and captured in `03-portrait-shortcuts-raw.png`.
- Source lineage: branch `codex/iphone-presentation-pass1-20260924`, base commit `75503a50b5787d1c7b5103a493c73f108aba3ecc`, local uncommitted implementation changes. This build ID identifies the packaged candidate; the old base commit alone does not identify the changed runtime.
- Changes since round 3: explicit mobile battle-toast geometry clears the inherited top/bottom conflict; landscape toast uses the reserved left lane above the movement pad; portrait toast sits below opponent information; landscape panels account for the left safe-area inset; Playtest shortcuts use an equal three-column row.

## Fresh independent evidence

Eight valid full-resolution game screenshots and `browser-observations.json` are in `artifacts/critic-round-iphone-04/`. There is also a clearly named `00-tool-scaled-capture-not-review.png`: the generic browser screenshot wrapper incorrectly returned a tiny scaled image despite the DOM confirming 390×844. It is a tool artifact, not game-quality evidence. Valid images were captured through the supported browser CDP screenshot capability and retain the actual HUD.

Runtime: interactive desktop Chrome, 390×844 and 844×390 CSS pixels, DPR 1, coarse-pointer/CDP touch emulation, Performance detail, cinematic-camera preference. Not physical iPhone, iOS Safari, or desktop WebKit. The page's reported viewport and visual viewport were checked at 390×844/scale 1.

I began a fresh cyborg expedition on the new isolated origin, verified the build/menu/preset, used the Play sample shortcut and scrolled dialog, inspected portrait Titan view, selected a rival and entered battle, triggered an out-of-range ability warning, withdrew/re-entered, inspected landscape Titan views at different angles/zoom, and held/released the actual touch movement control. Battle used one disclosed position-only fixture at x=-92, z=-48, 32 metres from Saffron Voyager; no statistics, simulation time, or speed were changed. Combat damage and withdrawals then changed the test state's hull/resources normally.

An attempted capture of the longer landscape entry notice timed out, so there is no image 07 and no claim of an independent live capture of that exact combination. The **portrait entry notice** and **landscape ability notice** were both captured while visible. Builder regression results for additional notification states are separate evidence, not substituted for my own inspection. Browser error/warning logs returned an empty array. This was not a performance benchmark or a full test-suite rerun.

## Scores and final gate

| Category | Score |
|---|---:|
| Overall game design and aesthetics, fixed AAA comparison | **6.9 / 10** |
| Scoped mobile HUD presentation and interaction | **8.4 / 10** |

**FINAL GATE: FAIL after four rounds.** The overall result remains below the fixed ≥8.5 threshold. No new concrete scoped visual or runtime error was identified in this final sample; that observation is not an exhaustive zero-error certification. Do not call this an AAA pass, and do not begin a fifth revision or expand into world/character art to pursue the score.

The scoped interface is now a strong, coherent mobile presentation. It retains the project's identity and actions; resource totals/population are readable; panels are dismissible; existing settings remain reachable; combat states are understandable; playtest navigation is purposeful. The 8.4 scoped score is supplementary and does not replace the required overall score.

## Final findings

1. **Round-3 notification defect is resolved in the independently inspected states.** `05-portrait-battle-entry-toast.png` shows the complete two-line entry message inside its correctly sized background below the opponent card, clear of the movement pad and battle actions. `06-landscape-ability-toast.png` shows the warning in the 148-pixel left lane, at x=8/y=74 with height about 80.8 pixels. Its text fits; it does not overlap the opponent strip, action buttons or pad. The prior 26-pixel collapsed landscape background is gone.
2. **Shortcut grouping is resolved.** `03` shows three balanced, readable adjacent buttons. Play sample reaches the intended section (`02`) without sacrificing the persistent close toolbar.
3. **Prior refinements remain intact.** Enemy health is visually grouped beneath the enemy column; the selected battle tactic uses a legible brass/dark-text state. Ordinary closed-panel landscape play, touch movement and normal camera orbit/zoom remain usable in `08`–`10`.

## Remaining polish and limitations

No remaining concrete in-scope defect was found that justifies another implementation round in this pass. Future refinement should be driven by physical-phone feedback: thumb comfort, perceived information density, notification noticeability, and preset comparisons. A 148-pixel landscape notification lane necessarily wraps longer text; the sampled warning remains readable. The safe-area CSS change cannot be certified against a physical notch from zero-inset Chromium emulation.

The overall art limitations remain those documented in round 1: broad simple carrier surfaces, repetitive castle geometry, visibly card-based foliage, low-information terrain/mountain areas, limited grounding in Performance mode and some portrait battle framing/cropping. They are outside this task's authorized scope. Do not force a heavier preset or change cameras/gameplay to disguise them. Physical iPhone/Safari behavior, hardware safe areas, sustained performance and real offline use still require device testing.

The review browser was closed and temporary touch/viewport overrides reset. The GPU slot was explicitly released to the builder for remaining release QA, matched captures and packaging.
