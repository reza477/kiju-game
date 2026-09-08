# Independent variant review — prototype 0.6, round 1 of 4

**FAIL — 6.7 / 10 overall.** All six variants are recognizable and the new vertical growth direction is present. The castle floor-inspection view has a concrete visibility defect. The castle massing, flesh anatomy and drill silhouette remain materially below the supplied reference and the fixed AAA threshold.

Reviewed frozen revision: `fd3e5a4bb239d21dfb8ebd32730391d72972c740`, independently verified before and after capture. Product source remained unchanged. This begins a new four-round cycle; the completed cinematic cycle and its 7.1 result remain intact. The critic wrote only this report and did not edit implementation, assets, tests or capture scripts.

## Design and fixed rubric

I read the current `AGENTS.md` and inspected the supplied castle image at `C:/Users/user/AppData/Local/Temp/codex-clipboard-7e80b450-a4c2-4ee8-b9ea-f8950bd8f1d6.png`. The latest vertical Gothic castle request supersedes the earlier circular town. I have not penalized the build for abandoning circular rings. The reference's relevant qualities are narrow vertical proportions, uneven tower heights, steep roof masses, bridges and a layered, asymmetric silhouette; its painted background is not a requirement to copy.

The global standard is unchanged: above 8.5 is AAA, 7 is good indie, 5 is programmer art. Pass requires overall at least 8.5 **and** zero identified visual/runtime errors.

| Category | Weight | Score |
|---|---:|---:|
| Default composition and readable game presentation | 20% | 6.9 |
| Terrain, environment assets, atmosphere | 20% | 7.0 |
| Kaiju construction, animation and physical weight | 20% | 6.0 |
| Citizens, clothing and life | 15% | 6.4 |
| City and carrier asset design | 15% | 6.5 |
| Combat and weapon visual communication | 10% | 7.5 |

Weighted result: **6.665, displayed as 6.7**. New unfinished assets and the castle inspection issue lower the current global result relative to 0.5. Functionality and variant count are not substitutes for art quality.

## Independent evidence

The critic executed the existing neutral runners unchanged against `http://127.0.0.1:4178/?test=1` in isolated Chrome profiles.

| Own evidence directory | Coverage |
|---|---|
| `artifacts/critic-variants-01/` | 46 fresh screenshots: six title/City/body views, temporal movement pairs, Streets, expanded kaiju castle front/reverse, selected levels 3/5, world and mobile |
| `artifacts/critic-variants-01/contact/` | 14 fresh contact screenshots; 16 ground contact cases and 12 aircraft ranged actions |

**60 fresh screenshots total.** Both reports contain zero browser errors and zero remote requests; the contact report contains no failed assertions. The maximum reported ground-contact error is approximately 0.2455 m against the existing 0.35 m threshold. Ranged actions resolve damage at the tested arrival time and originate at hull gun muzzles; the drill does not extend toward airborne targets. These are independently reproduced functional results, not the builder's results or aesthetic proof.

The normal HUD is retained. Expanded castle shots use the runner's explicitly labeled populated upper-ward fixture after paid expansion; they are not represented as organically played progression. The contact runner's aircraft screenshots retain its pause overlay. Selected upper-floor records show populated floors 0–4, so the visibility issue below is not explained by an empty population fixture. Temporal samples show changed walking poses, changing drill orientation and moving aircraft; this is not a full locomotion-cycle or sustained frame-rate audit.

## What works

The cyborg and flesh carriers can be identified without the labels. Both wear a tall Gothic structure with actual vertical additions. `cyborg-expanded-city.png` and `cyborg-expanded-reverse.png` show that the tower remains attached as the view changes.

`standard-city.png` preserves the British armored crawler. `drill-city.png` clearly adds a longer hull and a dominant forward weapon. The drill rotates between `drill-moving-a.png` and `drill-moving-b.png`; recorded rotation changes from 3.84 to 6.72 radians. The selected contact images show the drill or fist meeting the opposing surface with localized illumination.

`horizontal-city.png` preserves the original envelopes. `vertical-city.png` and the movement pair visibly show four upright rounded balloons, also confirmed by the recorded envelope count. The Eastern domes remain recognizable and Streets stays usable in `vertical-streets.png`. The new upright form is a deliberate design change, not a violation of the older request for only horizontal envelopes.

The existing landscape lighting, mist, river and functional HUD remain broadly consistent. All six variants were selected through the UI, rendered, moved, inspected and saved by the neutral tour.

## Confirmed defect

**V1 — Castle Streets/floor inspection is substantially occluded by its enclosing architecture.** This occurs in the initial `cyborg-streets.png`, the corresponding flesh view, and `cyborg-level3-streets.png` / `flesh-level3-streets.png`. The camera presents a large wall and narrow facade opening; most of the selected occupied floor and circulation space cannot be seen. `cyborg-level5-streets.png` likewise foregrounds parapets and towers rather than clearly presenting the selected district. The record identifies the requested floor correctly, but the view fails to expose it usefully.

This is a visible gameplay-presentation defect, not merely a preference for a different hero angle. No additional geometry intersection, contact displacement or renderer error is asserted from an ambiguous projection.

**Confirmed visual defects: 1. Runtime errors: 0 in these runs.** The other concerns below are art/design polish, kept separate from V1.

## Ranked builder corrections

### 1. Expose the selected castle district in Streets — concrete defect V1

**Evidence:** `cyborg-streets.png`, `cyborg-level3-streets.png`, `flesh-level3-streets.png`, `cyborg-level5-streets.png`.

**Correction:** make the normal floor-inspection camera and visible architecture work together. Frame the selected floor's walking/building area from a useful angle; use an intentional, reversible inspection cutaway or visibility treatment if the enclosing structure otherwise prevents this. Exterior hero views should retain the complete castle.

**Next acceptance:** selecting levels 1, 3 and 5 on either kaiju immediately exposes people, their walking space and the occupied plots with the HUD present. The user should not need to hunt through a slit or manually orbit away from a wall to inspect the selected floor. Selecting another floor must visibly identify that floor.

### 2. Rework the castle's major masses to match the reference's design language — polish

**Evidence:** supplied reference, `cyborg-city.png`, `cyborg-expanded-city.png`, `cyborg-expanded-reverse.png`, `flesh-title.png`.

The current structure reads as a narrow rectangular shelving unit: nearly identical open floors, long straight corner columns and a group of conical roofs at the top. Miniature freestanding houses inside the openings reinforce the feeling of a display cabinet. Added height alone does not capture the reference's castle composition.

**Correction:** compose a dominant keep with subordinate tower heights, meaningful steep roof masses, offset vertical sections and a limited number of connecting arches/bridges. Integrate occupied districts into that architecture. Preserve tall vertical growth and a wearable backpack; do not return to a circular town or conceal the problem with added tiny trim.

**Next acceptance:** starter and expanded silhouettes read as a Gothic castle in front, side and reverse views without relying on window texture. Expansion creates an intentional architectural hierarchy rather than repeating another identical rectangular bay. Inspection and weapon clearance must remain usable.

### 3. Make the flesh titan read as an organic body — polish

**Evidence:** `flesh-body.png`, `flesh-moving-a.png`, `flesh-moving-b.png`, `contact/player-drill-to-flesh-speed-1-contact.png`.

The flesh variant is visibly different from the cyborg, but its capsule limbs, round joint breaks, simple pelvis and uniformly brown surface read as a wooden posing mannequin with horns. Separate chest/abdominal bulges do not create continuous anatomy. Walking exposes the mechanical segmentation rather than suggesting muscle and load.

**Correction:** refine connected torso/pelvis/limb masses, recognizable elbow/knee/ankle transitions, and coherent organic surface variation. Give the stance and movement a convincing relationship to the tall load. Preserve humanoid proportions and the current measured contact behavior; avoid replacing the issue with surface noise or additional disconnected muscle balls.

**Next acceptance:** at normal body-view distance and closer, the silhouette and shading read as flesh through both planted and bent poses. Joints feel anatomical, transitions remain continuous, and backpack support remains evident. The cyborg should retain its distinct constructed form.

### 4. Make the drill's spiral cutting form unmistakable — polish

**Evidence:** `drill-city.png`, `drill-body.png`, `drill-moving-a.png`, `drill-moving-b.png`.

The large cone has presence, but its shallow cutting ridge and repeated teeth primarily read as rings around a smooth cone. The requested giant spiral is visually weaker than the mounting collar and broad core.

**Correction:** refine the existing helical cutting edge's projection, pitch and material contrast so the spiral is the primary form. Keep the longer rectangular crawler and actual forward contact behavior. Increasing overall drill size is unnecessary.

**Next acceptance:** the spiral is obvious from normal City and side/body views at multiple rotation phases, not just inferred from motion or the variant label. Its outline and shading remain readable against the hull and ground, and the existing ground/aircraft contact checks continue to pass.

The established broad green terrain, repeated citizen figures and modular crawler/airship decks still limit the global score. They are lower-priority context for this variant update, not new defects or a reason to divert work from the ranked items above.

**Gate: FAIL — 6.7 < 8.5, plus V1. Submit the revised build to the same independent rubric. Three review rounds remain in this 0.6 variant cycle.**
