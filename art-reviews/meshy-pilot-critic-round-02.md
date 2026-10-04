# Meshy pilot — independent art review, round 2

**Bounded pilot: 7.1/10 — FAILED.** The fixed gate remains at least 8.5/10 and zero identified visual/runtime errors. Whole-game observed presentation is approximately **6.8/10**, contextual only; no game-design change is recommended. The first pilot review and the four closed broad-painterly reviews remain unchanged.

## Provenance and scope

Independent reviewer: `painterly_art_critic`. I wrote no implementation, assets, tests, or capture scripts. I used a new CUA-controlled Chrome game tab, ordinary UI/input, and read-only diagnostics. I saved six fresh original full-viewport PNGs under `artifacts/critic-round-02/meshy-pilot/`. No earlier screenshots were substituted.

Reviewed source: **`7afb2f2c6076e4fcf638d94df4a0a5e7e06b7af7`**, Git tree **`4cb382e223a08c254573a02d7d741d45a28bf345`**, in `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`. The checkout was clean at inspection. Parent held runtime edits until my game tab closed at approximately **2026-10-04 01:47:08 UTC**. Later water corrections are not covered here.

Changes since round 1: softer pine normal/highlight response and tint; warmer/less violet rock response; bounded middle-scale meadow/earth patches, tree-root litter/contact beds, damp shoulder/toe and revised shallows. Source also requires successfully decoded albedo and normal images and releases failed bitmap object URLs. Those fault-injection repairs were reported tested by the builder, not independently executed by this critic.

The live game verified the new settings: pine roughness 0.96, normal scale 0.12, RGB multiplier (0.86,0.92,0.74); rock normal scale 0.22 and RGB multiplier (0.98,1.05,0.90). All three live master materials had decoded albedo and normal images. The batches contained three pines, three broadleaf trees and 48 rocks. This establishes that the new materials were actually loaded, rather than reviewing stale screenshots.

## What improved

The pine's contrast is quieter and less metallic-looking, while the broadleaf retains its connected trunk and substantial crown. The rocks are closer to a neutral natural stone colour. Ground now has visible earth/meadow shapes at a useful middle scale, and the dark beds under the trees improve visual grounding. At angles away from the bright river reflection, the kit is more coherent than round 1.

The result still looks like a small prototype kit with uneven art quality. The pine retains a dense pattern of repeated rounded lobes, and several river stones remain shallow cracked plates. The material correction improves their presentation without changing those downloaded forms. The new earth patches also tend toward flat camouflage-like islands when viewed from above or at Performance resolution. These limitations prevent an AAA-quality impression.

## Concrete defects, ranked

1. **Broad pale striped river highlight inside the pilot.** At High/day, normal City zoom 76, yaw approximately 2.76 and pitch 0.72, the foreground channel becomes a broad pale/white band with parallel, evenly spaced stripes. This competes with the carrier and loses the intended readable water depth and restrained ripple treatment. `01-native-approach.png` shows the stronger case. `03-channel-highlight-angle.png`, yaw 2.76 / pitch 0.92 / zoom 76, shows the same issue from a higher angle. Orbiting away restores a darker, more convincing channel in `02` and `04`. This is angle-dependent and can be missed by a single chosen camera.

   The bright region is not solely unchanged water outside the pilot. For `03`, I performed a read-only camera-ray check at pixels (880,820), (1030,960), and (870,720). Intersections with an approximate horizontal water plane at y=-0.4 gave respectively world points (-20.081,-120.112), (-26.288,-131.618), and (-21.891,-112.722), well inside x[-65,32], z[-140,-90]. The actual mesh's first vertex height was approximately -0.57, with small animated displacement; these are approximate location checks, not exact surface picking or a physics test. See `channel-highlight-ray-check.json`. I have not proved that this defect was newly introduced by round 2 rather than inherited; the current pilot must nevertheless be judged with it visible. A bounded water-material correction should retain the existing geometry and motion timing.

2. **Pine form still reads as repeated knobs rather than articulated branches.** Lowering highlight/normal strength has helped, but it has not removed the repeated lobe pattern. The issue is visible in ordinary City framing and close view, not merely an extreme zoom. Material changes can reduce its prominence; they cannot truthfully be described as a new crown silhouette. No extra Meshy generation is authorized.

3. **Low bank-rock profiles still look compressed in several instances.** The more neutral tint helps, but the shallow, densely fissured plate forms persist in `02` and `04`, alongside larger pale legacy boulders. This is a shape/scale-reading limitation of the bounded replacement, not evidence that physical geometry should be changed. Do not alter support, placement or collision to chase the score.

No definite normal-load runtime error, disappearing imported texture, detached replacement, or broken control was observed during this second inspection. Captured warning/error messages were empty. The round-1 decode-failure defect is not repeated here as an observed current failure: source and live normal-load materials reflect the repair, while its injected-error verification remains the builder's evidence.

## Separate polish opportunities

- Make the existing middle-scale earth patches feel like transitions within soil and grass rather than flat coloured islands. Retain the calmer detail level; do not add blanket fine noise.
- Refine the local damp shoulder/shallow connection once the broad highlight is controlled. It should help the rock/ground/water relationship at normal view, not become a continuous outline.
- Keep evaluating the same kit at actual Performance buffers. Small crowns and bank stones become tiny in landscape, so a detail-only improvement is not enough.

These are material/art priorities only. Existing gameplay, controls, geometry, placements, carrier construction and balance are outside this review's change authority.

## Actual inspection and evidence

I continued the isolated 4215 save, used the normal menus to begin a fresh crawler in disposable test storage, and traveled through the minimap to approximately **(-8.372093,-99.113549)**. The scene was not teleported. I inspected native travel/trails, several yaw and pitch angles, normal and closer zoom, and both phone orientations. Real emulated touch input moved the crawler to approximately **(-7.101216,-98.631718)**. I saved that isolated review position. This was a focused follow-up visual review, not a second claim to the full 9m54s independent scenario suite documented in round 1.

All views used the game's ordinary HUD without a pause box. Daylight and cinematic camera were retained. Desktop was High at **1278 x 1168 CSS pixels**. For phones I used the normal quality control to select **Performance**, then the supported persistent viewport and touch emulation: portrait **390 x 844**, actual buffer **331 x 717**; landscape **844 x 390**, actual buffer **717 x 331**. Both had actual DPR **1** and `maxTouchPoints=1`. These are desktop Chrome emulations, not physical iPhone/iPad or Safari results.

| Original PNG | Dimensions | File-write UTC, 2026-10-04 | Content |
| --- | --- | --- | --- |
| 01-native-approach.png | 1278 x 1168 | 01:42:14.936 | Native arrival; strong pale channel highlight |
| 02-normal-kit-orbit.png | 1278 x 1168 | 01:42:34.181 | Second orbit; kit and middle-scale ground |
| 03-channel-highlight-angle.png | 1278 x 1168 | 01:43:54.859 | Reproduced highlight at higher pitch |
| 04-bank-tree-close.png | 1278 x 1168 | 01:44:54.902 | Pine and shallow rock forms, nearer gameplay zoom |
| 05-portrait-kit.png | 390 x 844 | 01:45:49.677 | Performance portrait with normal touch HUD |
| 06-landscape-motion.png | 844 x 390 | 01:46:30.472 | Performance landscape after touch movement/rotation |

`04-bank-tree-close-state.json` records x=-8.372093, z=-99.113549, yaw=4.35, pitch=0.668, zoom=64, game time=74.4218 immediately after that capture. `portrait-state.json` records yaw=4.35, pitch=0.6, zoom=76 and the actual live material/buffer values. `landscape-state.json` and `browser-messages.json` retain the final read-only state and empty captured warning/error list. File-write times are artifact timestamps, not an assertion of exact simulation-frame timestamps. These independent review images are not the final matched before/after handoff pairs.

The game's motion was inspected through real inputs and successive live views, not through an injected animation clock. I did not produce a high-frame-rate recording or quantify small wind movement, temporal shimmer, draw counts or frame timings. None of this review substitutes for final performance, all-carrier, fault-injection, offline/update or physical-device QA.

One interaction deserves documentation without an unsolicited repair: after **Save on this device** in the menu and **Resume expedition**, the final accessibility tree exposed **Resume game** in the toolbar, suggesting the game remained paused. I closed the tab without reproducing that behavior a second time. It is therefore an unconfirmed menu/save observation, not a proven Meshy regression or authorization to change pause semantics. The isolated save may require the normal pause button to resume on a later inspection.

I closed the owned tab and reset viewport/touch emulation before releasing the GPU. I did not touch Meshy, spend credits, edit runtime, or publish anything.

**Round 2 remains FAILED at 7.1/10.** The next bounded visual priority is the documented river highlight. The pine and rock shape limits must remain explicit even if that material defect is repaired.
