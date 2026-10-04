# Independent carrier art review — round 4, final

Reviewer: `/root/carrier_art_critic`. The critic wrote no implementation code, assets, tests or capture scripts. Reviews 1–3 remain unedited. This is the fourth and final review of this carrier update.

## Verdict

**7.2 / 10 — FAILED.** There is no new cosmetic improvement over round 3 to justify a higher score. The final repair addresses an impact-attachment defect; technical correctness does not itself raise the art score. A concrete stale-selection UI error was also observed during this review, so the zero-error requirement is not satisfied either.

Fixed standard: 5 = programmer art, 7 = good indie, above 8.5 = AAA. Pass requires at least 8.5 and zero identified visual/runtime errors. The existing ground/environment pass remains closed at its separately recorded result and is not reopened or rescored here.

## Reviewed revision and method

- Actual worktree: `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`.
- HEAD `383fb6277041e49e2d71b1918ab1ee5e1e50ba14` plus the frozen final carrier implementation.
- Title-screen build independently observed: `7c8ef006f1fbe3aa41ed`.
- Full runtime/assets fingerprint supplied by QA and the parent: `6ac806e4bff7b94951cdd36ab8dc14b09cbec7772cc3daa24960da1042d9fffd`. The critic did not independently recompute this fingerprint.
- Fresh isolated review tab at `http://127.0.0.1:4215/`, native Chrome, original 1278 × 1080 captures, High detail, Day light, Cinematic camera, 1× speed. The normal HUD remained visible.
- Ordinary City view, native orbit and wheel zoom, resource travel, stopping, native rival approach, and an actual flesh-carrier battle were inspected. No hidden game-state injection, diagnostic camera or artificial frame timing was used.
- Eleven new original unretouched JPEG screenshots and browser output are in `artifacts/critic-round-carrier-04/`. No previous screenshot was substituted. The final browser output was recorded at `2026-10-04T09:00:37.734Z`.
- The critic-owned browser tab was closed after capture and the GPU was released to the parent before writing this review.

## Changes since round 3 and actual motion inspection

The parent reports that the dynamically deforming apron is now explicitly tagged and resolves attached impacts against a triangle/barycentric point. The reported focused regression test changed from two passes/one failure to three passes. There were no decorative changes after round 3. That is an appropriate bounded repair, but its exact target was not isolated visually in this review: no claim is made that a specific projectile was observed hitting the apron or that its impact marker was tracked frame by frame.

The flesh carrier travelled toward Mourning Pines, was viewed from the side and a closer reverse angle, approached Sky Lantern Court, and entered battle through the ordinary UI. Battle captures cover approach, incoming damage, Titan rush, and close combat. The displayed separation fell from 101 m to 17 m; the captured player hull fell from 506 to 402, while the rival fell from 280 to 54. The next native result was a battle-won modal. This is actual gameplay inspection, not an animation preview. The changed limb/attack poses remained visibly connected to the castle support; no exploded skin or detached castle was observed in this sequence.

After returning to the title screen, a fresh cyborg expedition was started. The cyborg was inspected at normal City zoom, travelling toward Mourning Pines, and at arrival from another angle. Its imported body remains identifiable and animated, and the stopped pose looks more settled than the first attempt. This visual inspection does not replace the separate numerical foot-contact audit and does not establish exact full-cycle contact accuracy.

## Ranked remaining art limitations

1. **The monster's castle remains a high rear pedestal with long forward gun booms.** The padded apron, thickness, straps and fittings make its construction more deliberate, but the load still feels perched on a tall support rather than naturally worn. The full side view in `02-flesh-side.jpg` makes this especially clear. Protected deck and weapon anchors constrain a safe correction; the parent reports seventeen alternate body fits were rejected for contact, intersection or envelope problems. This review does not request moving those gameplay anchors or changing castle progression to obtain a better silhouette.

2. **The source textures do not establish a strong hierarchy of large forms and small detail.** The robot's scratches and diffuse patches compete across most plates; the monster's dense dark mane and red surface detail obscure anatomy. The earlier reduction in sheen helped, but additional blanket roughness or normal-map adjustments will not substitute for deliberate texture authoring. Meaningful improvement here needs a separately approved asset/retexturing decision that preserves the owner's chosen identities.

3. **The initial normal City framing hides much of the quadruped behind the build tray.** `01-flesh-normal.jpg` preserves that real presentation limitation. Wider or reverse screenshots show the asset more completely, but do not erase the ordinary first-view limitation. No controls or camera redesign is requested within this constrained carrier repair.

4. **The mount communicates attachment better than weight.** Travel and combat remain coherent, but the high rigid support dominates the animal's load-bearing impression. Additional decorative layers would offer diminishing returns. There is no strong justification for another cosmetic iteration using the same constraints and source assets.

The cyborg is the clearer of the two imported carrier presentations. Both are a meaningful step beyond their earlier placeholder bodies, but neither makes the whole presentation a polished AAA result. No score increase is awarded for test counts, asset complexity or effort.

## Concrete observed UI defect

**The previously defeated rival's selection panel survives into a new expedition.** The observed native sequence was:

1. Play the flesh carrier, approach and defeat Sky Lantern Court.
2. Return to the expedition, then choose Save & return to title.
3. Select the cyborg and confirm Begin new expedition.
4. Observe the fresh Day 01 expedition with starting hull and resources while the left selection panel still says `Sky Lantern Court`, `Distance 33 m`, and `This rival has been defeated.`

The stale panel is visible in `09-cyborg-normal-stale-selection.jpg`. It remains unchanged during new travel in `10-cyborg-travel.jpg` and at the new Mourning Pines arrival in `11-cyborg-reverse-arrival.jpg`. This is an incorrect visible UI state, not merely an art preference. Its presence does not by itself demonstrate corrupted simulation state or saved progress.

The parent inspected source and reports that the relevant `beginGame` / `renderSelection` routines are byte-identical to the baseline: clearing both selection and the UI signature can cause the empty replacement markup to be skipped, leaving the previous DOM in place. At this review's completion, baseline runtime reproduction had not been supplied. Therefore the defect is confirmed on the reviewed candidate, while its proposed pre-existing origin remains a separate source-based finding, not a critic-verified baseline runtime result. It is not attributed to the imported carrier code. The frozen candidate was not changed during review.

Captured warning/error console entries were empty (`[]`). That does not cancel this functional UI error or certify the game as error-free. The round-1 possible cyborg hover remains unproven; no new hover defect is asserted.

## Evidence map and limits

- `01-flesh-normal.jpg`: ordinary City view and HUD.
- `02-flesh-side.jpg`: wider side view showing the complete creature, support and gun-boom relationship.
- `03-flesh-travel-start.jpg`: actual Mourning Pines travel, 161 m remaining.
- `04-flesh-reverse-close.jpg`: closer reverse/arrival view.
- `05-flesh-battle-approach.jpg` through `08-flesh-close-combat.jpg`: successive actual battle stages and changing damage/pose.
- `09-cyborg-normal-stale-selection.jpg`: new cyborg expedition and confirmed stale rival panel.
- `10-cyborg-travel.jpg`: new cyborg travel, 161 m remaining, stale panel persists.
- `11-cyborg-reverse-arrival.jpg`: cyborg arrival from another angle; stale panel persists.
- `browser-output.txt`: final accessibility-state difference, source URL, visible build, timestamp, and captured warning/error log result. It is not a full interaction transcript.

The parent separately reports 304 Node tests, 50 identity checks including 42 saves, nine lifecycle cases, 54 light/detail cases, 13 smoke checks, sixteen matched captures, and a two-check actual candidate-save rollback result. Those are separate engineering evidence, not tests performed by this art critic. The earlier incorrect-address smoke failure remains part of the parent's record; it is not silently converted into a pass here.

This critic did not test physical iPhone/iPad, Safari, offline installation/updating, numerical frame performance, a long-session soak or exact impact-frame alignment. The screenshots are native desktop captures, not phone evidence. This review is neither a deployment verification nor release approval.

## Stop condition

The four-round limit is reached: **6.8 → 7.1 → 7.2 → 7.2**, all below the required threshold. Keep the useful implementation and technical repairs, preserve the failed gate honestly, and stop this art-review loop. Further scope or acceptance decisions belong to the owner. No fifth iteration or release-gate exception is implied.
