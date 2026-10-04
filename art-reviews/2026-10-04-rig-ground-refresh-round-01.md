# Independent art review — rig and ground refresh — round 01

**Result: FAIL. Overall 7.1/10.** The added surface detail and ground population improve the scene, but neither carrier has a consistently convincing weight-bearing foot pose, and the new road pieces do not yet read as irregular, eroded remnants. The fixed pass requirement is at least 8.5/10 with zero concrete visual or runtime errors. This review does not clear any release blocker.

## Reviewed identity and independence

- Review date: 2026-10-04; fresh captures from 17:41:17 through 17:47:09 UTC.
- Checkout: `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`.
- Branch supplied by builder: `codex/rig-ground-refresh-20261004`.
- Independently read Git HEAD: `32e7d003645bdb8aece23745b434d1c5025033a7`. The reviewed implementation is an uncommitted working-tree candidate on this baseline, not a new final commit.
- Build displayed by the game: `a03f35de873979bac391`.
- Builder-supplied frozen runtime fingerprint: `e62a63ab39481a0fcb52b3b2de0b088dcb0dfc93320d2aac976561e27444e072`.
- Changes since the baseline, supplied for review: replacement higher-polygon Meshy robot and quadruped rigs, contact/pose adaptation, denser code-generated ground details, and 32 decorative road fragments. This is the first review of this request, not a continuation of an older closed review.
- I wrote no implementation code, assets, tests, or capture scripts. All gameplay actions were native controls in my own Chrome review tab at `http://127.0.0.1:4215/`. The owner origins at 4214 and 4178 were not opened.
- The builder confirmed that the 4215 test save was disposable. I first inspected its existing crawler expedition, then used the ordinary menu and new-expedition controls to review a fresh robot and a fresh flesh carrier.
- Evidence retention was cleared by the root before capture. Originals are under `artifacts/critic-round-01/rig-ground-refresh/`; no older review or screenshot was overwritten.

## Ranked concrete defects

1. **High — the new rigs still fail a convincing plant/stance check.** The robot's frontal stopped view has feet clustered close together and angled onto narrow edges, with an unconvincing transition from the lower leg into the foot; in the late walking pose the lower legs bunch inward. The quadruped's visible forward paw bends sharply upward into a curled, knuckle-like silhouette in the stopped side view and after arrival. Its shoulder/body volume is readable, but this paw posture makes the creature look suspended from its legs rather than bearing the castle's weight. The visible defect is the resulting pose and foot silhouette; I am not claiming a particular numerical skinning, penetration, or IK cause from these screenshots. Evidence: `02-robot-city-normal-idle.png`, `05-robot-city-walk-rear.png`, `06-robot-titan-front-idle.png`, `13-monster-city-stride-second.png`, and especially `16-monster-close-titan-idle.png`. Re-review should show separated, stable robot support and natural quadruped paw orientation through start, stride, turn, stop, and sustained idle, from a low side and front view.

2. **Medium — road fragments look placed, not convincingly eroded.** The separation and slightly varying lengths are visible, but the repeated flat rectangular silhouettes and short intact paired center lines make the pieces read as road tiles laid onto the grass. This is clearest where several pieces align in the open field. The edges need much more visual interruption and the surviving paint should not repeat the same complete motif on nearly every small piece. Keep the requested dash-remnant idea and existing gameplay boundaries. Evidence: `01-existing-crawler-ground-normal.png`, `04-robot-reverse-city.png`, `10-monster-reverse-city.png`, and `12-monster-city-walk.png`. I did **not** confirm road z-fighting in this inspection; the builder's small-clearance diagnostic is a risk, not an observed visual error here.

3. **Medium — normal phone City HUD obscures the subject.** At 390 × 844, the left carrier card and right map consume most of the upper play area; the build tray covers much of the legs. At 844 × 390, the central build tray occupies much of the remaining scene and the carrier is cut off at the bottom. This is a visible whole-game limitation, not a proven regression from this asset change. Evidence: `07`, `08`, `14`, and `15`. These are browser viewport emulations, not physical-phone validation. Do not silently expand the rig/ground implementation scope to redesign the HUD; preserve this limitation in the delivery assessment.

## Ranked polish opportunities, separate from defects

1. Ground population is richer around woods, the foundry, and the river, while still leaving navigable-looking clearings. The distribution is better than empty terrain, but repeated bright star-shaped clumps and broad low-detail bare slopes remain visible. More grouping by local terrain and modest silhouette/colour variation would improve the natural read without blanket density.
2. The robot's high-frequency dark plates and bright green/purple accents compete with the subdued environmental palette. The asset has detail, but much of it becomes busy dark texture at ordinary zoom. This is an art-direction cohesion opportunity, not permission to replace the owner's selected identity.
3. The monster's upper body is dense and expressive, but its very dark mane and flank detail merge into one mass in shadow. Better value separation would help its quadruped anatomy read without changing the body proportions.
4. City view tends to prioritize the castle and leave feet behind the build tray or beyond the bottom edge. The alternate Titan view was useful for inspecting feet. This presentation issue is distinct from the visible paw and foot poses.

## Scores against the fixed standard

| Area | Score / 10 | Reason |
| --- | ---: | --- |
| Game-design readability in normal gameplay | 7.2 | The moving-city premise and native travel controls remain legible; City framing and phone occlusion reduce clarity. |
| Character form and surface treatment | 7.4 | Substantial readable detail and distinctive silhouettes, with uneven scene cohesion and dark detail compression. |
| Rig pose, weight, and animation presentation | 6.5 | Gross body collapse was not seen, but the foot/paw support silhouettes are not resolved convincingly. |
| Ground detail integration | 7.7 | Added density is visible and generally supports the environment; repetition remains noticeable. |
| Broken-road treatment | 6.3 | Interrupted roads exist, but their regular tile silhouettes and repeated paint do not meet the requested ruined-remnant finish. |
| Overall aesthetics and presentation | **7.1** | Good indie direction, below the 8.5 gate. Detail count alone does not establish AAA finish. |

## What was actually inspected

- Normal City gameplay with HUD for both new carriers, orbit/reverse views, closer views, and the native Titan camera as a supplement.
- Robot travel to The Sunken Grove and Old Earth Foundry, including its change of heading, running poses, and arrival/idle states. Quadruped turn and travel to Mourning Pines, with multiple stride and arrival observations. These were live native-gameplay observations and individual screenshots, not replayed builder images or a recorded high-frame-rate animation audit.
- Desktop viewport: 1278 × 1214. Phone emulation: 390 × 844 and 844 × 390. The viewport override was reset afterwards.
- Ground/roads from the existing crawler fixture and from both fresh carrier expeditions. Trees, riverbanks, foundry surrounds, open clearings, and distant slopes were visible.
- The fresh carrier UI listed Citadel, Dwellings, and Hanging gardens as successive storeys and continued to state that new districts add a storey above. The robot's compact castle presentation and the flesh carrier's taller presentation remained visibly distinct. I did not independently exercise construction upgrades or save migration in this art review.
- No browser warning or error entries were returned by the tab's runtime log inspection. The game continued to render and travel. This does not substitute for the builder's broader runtime tests.
- Builder-reported checks were 322/322 Node tests, 50 carrier identity checks, 42 save checks, and ground preservation checks passing. I did not rerun or independently certify those results.

## Evidence interpretation and limits

There are 16 original PNG captures plus raw browser observations in this round's evidence folder. The descriptive filename of `03-robot-city-walk-side.png` is imperfect: its HUD shows gathering at The Sunken Grove, so it is arrival/stopped evidence, not a mid-stride frame. `05-robot-city-walk-rear.png` shows 2 m remaining and is late-stride evidence. `12-monster-city-walk.png` shows 86 m remaining and is walking evidence. `13-monster-city-stride-second.png` shows gathering at Mourning Pines and is arrival evidence. The originals are retained unchanged; their actual visible HUD state takes precedence over the filename.

The review did not compare simultaneous matched baseline views, quantify frame rate, prove physical-device behavior, or inspect every animation frame. I am not attributing the phone-layout limitation to this revision. Existing saves and construction preservation rely on separate technical evidence beyond this review's visual scope. No publication or deployment was performed.

At review completion, the dedicated tab was navigated to `about:blank` and the root was told the GPU slot was free. This is round 1 of the maximum 4 for this work request. The next builder attempt should address the ranked in-scope rig and road issues, then receive a fresh independent review; this score must remain unchanged.
