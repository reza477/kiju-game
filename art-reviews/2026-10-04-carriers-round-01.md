# Independent carrier art review — round 1

Reviewer: independent art-director agent `/root/carrier_art_critic`. The reviewer wrote no implementation code, assets, tests, or capture scripts. Screenshots were taken directly through the browser interface by this reviewer.

## Verdict

**6.8 / 10 — FAILED.** The imported bodies are more specific and recognisable than generic primitive carriers, but their surface treatment and attachment design do not yet read as a polished, coherent game asset set. The fixed standard is 5 = programmer art, 7 = good indie, above 8.5 = AAA quality; passing requires at least 8.5 and zero identified visual/runtime errors. This is below the quality threshold independently of whether the remaining contact concern proves to be a defect.

No gameplay-design change is recommended or authorised by this review. The earlier environment pass and its recorded 7.7 result remain closed; the environment is only the context in which these carriers were judged.

## Reviewed source and conditions

- Actual worktree: `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`.
- HEAD verified read-only: `383fb6277041e49e2d71b1918ab1ee5e1e50ba14`, plus the frozen carrier working-tree implementation.
- Build visible in the actual title screen: `1c3433b10d45cd468514`.
- Frozen full runtime/assets fingerprint supplied by the parent from its completed parity verification: `b52740e429f376f0152b6a156cb6251ffd8d153c1c5da9e66172b20f15af8404`. This reviewer did not independently recompute that fingerprint.
- URL: `http://127.0.0.1:4215/`, expressly isolated critic save storage. Native Chrome, 1278 × 1080 screenshot viewport, High detail, Day light, Cinematic camera enabled, normal 1× game speed.
- Fresh native gameplay was started for each kaiju variant. City view, a native Titan view, manual orbit, and wheel zoom were used with the ordinary HUD visible. No hidden diagnostic camera, clean-view substitution, source-state injection, or framerate override was used.
- Robot travel: initial position → The Sunken Grove → Old Earth Foundry, including arrival/idle and upper-storey inspection.
- Monster travel: initial position → Mourning Pines, then native approach, engagement, Approach and Titan rush against Sky Lantern Court. The battle proceeded from 280 rival hull through 223 to 12 in observed states; that establishes live gameplay presentation, not exact claw-contact timing.
- Browser warning/error inspection returned an empty list. The critic tab was closed after inspection to release the GPU.
- This is the first carrier attempt. There is no prior carrier review to compare against. These are fresh after-state observations, not an independently matched before/after benchmark.

## Ranked polish issues

1. **The monster's castle reads as a rear-mounted crane frame rather than a worn, load-bearing backpack.** The tall exposed gap between the beast's back and the masonry, thin straight legs, and long forward cannon cantilevers dominate its side silhouette. The carrier looks like three assembled parts rather than one designed object. See `12-flesh-side.jpg`, `15-flesh-close.jpg`, `17-flesh-battle-travel.jpg`. Keep the castle deck and all functional gun anchors fixed. Improve the visual load path using coherent contact pads, broader braces, tied straps and body-only fitting within the existing envelope; do not solve this by moving the gameplay anchors or shortening the city.

2. **The cyborg has a crumpled, uniformly busy metallic surface.** Sharp light/dark patches cover nearly every plate; specular contrast and small detail compete with the silhouette instead of explaining major plates, joints and softer gaps. It clashes with the quieter masonry and painterly landscape. See `01-cyborg-normal.jpg`, `02-cyborg-side.jpg`, `03-cyborg-walking.jpg`, `07-cyborg-riverbank-low.jpg`. Preserve the owner's purple/green identity and imported silhouette while calming roughness/normal response and establishing broad readable material zones. More resolution or geometry is not the primary need.

3. **The monster's anatomy collapses into dark stringy texture at normal distance.** Shoulder, rib mass, forelimb and hindquarter distinctions are difficult to read because the same dense, near-black detail runs across them. There is useful menace and an identifiable head/tail, but the surface does not clearly communicate skin, exposed tissue and harder ridges. See `10-flesh-normal.jpg`, `12-flesh-side.jpg`, `14-flesh-walking-2.jpg`. Improve large-form value/material separation without recolouring it into a different creature or adding indiscriminate glow.

4. **The default City framing conceals much of the new quadruped below the build tray.** On first normal entry, the castle receives most of the frame while the four-legged stance is largely below/behind the HUD. Wider native zoom reveals the creature but makes its material problem clearer. See `10-flesh-normal.jpg` versus `12-flesh-side.jpg`. This is a presentation/framing opportunity, not permission to change controls, HUD functions or gameplay geometry.

5. **The load has limited visual weight during movement.** The four-legged poses update and the city stays connected, but the long rigid frame and the weak surface hierarchy keep the travel impression mechanical and assembled. The robot's casual gait is visibly a walking sequence; its stopped stance is less convincing as a stable heavy carrier. Improve apparent support and subtle body motion only after contact is proven. Do not alter travel speed, collision envelope, game event timing or owner construction rules.

## Concrete defects and uncertain findings

- **No confirmed runtime error, exploded skin or detached castle was observed** in this inspection. This is bounded evidence from the inspected routes and views, not a claim of zero possible defects.
- **Possible cyborg support-contact issue, not confirmed by this review:** after stopping at Old Earth Foundry, the robot holds a bent leg and an extended toe-down boot. In the Titan view it appears suspended, while other views suggest narrow toe contact. The screenshots alone cannot establish whether its weighted sole actually clears the terrain. Evidence: `06-cyborg-titan-view.jpg`, `07-cyborg-riverbank-low.jpg`, `08-cyborg-riverbank-level.jpg`. The parent was asked for a read-only pose measurement. Do not silently promote this suspicion to a proven error or dismiss it as fixed.
- The initial screenshot immediately following the flesh new-expedition confirmation caught the preceding dialog frame even though the accessibility state had advanced. It is retained as `09-flesh-transition-stale-frame.jpg` and is **not** flesh gameplay evidence. The settled fresh capture is `10-flesh-normal.jpg`.

## Strengths worth preserving

- The cyborg is immediately legible as a tall angular humanoid with an individual purple/green identity. Its silhouette is not interchangeable with either crawler or airship.
- The flesh asset creates a materially different creature identity, with a clear head, hunched mass, tail, and four support limbs. The source has enough form detail; simply adding polygons would not address the current weaknesses.
- The castle remains a vertically stacked masonry structure. The cyborg castle is visibly more compact than the flesh castle. Neither needs a return to horizontal city construction.
- Native travel, gathering, camera changes and battle remained usable during inspection. Both imported bodies rendered in the actual game rather than only in an external asset viewer.

## Evidence and limits

Original unretouched browser screenshots and detailed final browser state are under `artifacts/critic-round-carrier-01/`. Browser screenshots are original JPEGs at 1278 × 1080; they are not the final matched PNG review package. Files `01`–`08` cover the cyborg; `10`–`19` cover the monster, with `09` explicitly excluded as a transition frame. `browser-output.txt` records the final state and captured warning/error list.

Motion inspection used successive live gameplay poses and native actions. It does not certify exact impact-frame alignment, complete gait-cycle ground error, numerical frame times, or a long-session performance result. No physical iPhone/iPad, Safari, touch-device handling, offline update, or delivery test was performed by this critic. The parent’s technical results are separate evidence and have not been converted into art points.

The builder should address the ranked carrier issues within the existing asset scope, then submit a new frozen revision for fresh independent review. Do not change this score or reinterpret the review as passing.
