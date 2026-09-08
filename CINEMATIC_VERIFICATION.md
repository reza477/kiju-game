# Prototype 0.5 — camera, atmosphere and lighting

Playable locally at http://127.0.0.1:4178/. This update preserves the three carriers, circular backpack, buildings, resources, scenery destruction and existing browser saves.

## Implemented behavior

- Additive camera offsets provide brief entry sweeps, firing recoil, impact movement, distant footfall response and travel look-ahead. They do not feed back into the player orbit. Close management/Streets views are steady; manual orbit suppresses effects. Manual battle zoom works, with closer default framing at melee distance.
- The Camera control switches between Cinematic and Steady, persists locally and honors the system reduced-motion preference by default.
- A shared wind field drives rooted tree/grass movement and matching shadow deformation, water ripples, smoke and ambient wildlife motion. Existing instance transforms and saved scenery identities stay stable.
- The sky sun, directional shadows, fog, reflected light, windows and mist use one interpolated lighting preset. Day/dusk/night changes blend smoothly. Rendering uses one ACES transform with matching brightness across quality modes.
- Low mist is localized to the river and gully. One instanced draw and a fixed smoke pool bound atmosphere allocations. High/Balanced/Performance use 24/16/6 mist patches and at most 48/28/12 puffs.
- Damage resolves at the same simulation time as visible impact: 0.7 seconds for melee, 0.55 seconds for ranged fire. Pending hits survive pause and saves, apply once, and delay lethal outcomes until contact. Old saves do not replay already-applied hits.

## Builder checks

The first builder attempt passes 40 Node tests, the 13-check browser smoke suite and the integrated living-world audit with 26 screenshots. Checks cover economy, full campaigns, saved ring expansion/destruction, protected gathering, weapon facing and muzzle origins, delayed damage/save migration, bounded camera offsets, manual/Steady suppression and 390px layout.

The cinematic capture runner uses an isolated browser with the real simulation, UI and renderer stepped in 0.05-second intervals. Its first 31 views cover all lighting moods/factions, temporal atmosphere, battle entry/contact/recovery, Steady, manual orbit, narrow layout and reduced-motion defaults. Only transient pause/toast overlays are hidden in the revised runner; all game controls and scene geometry remain. Reported browser errors, remote requests and context losses: zero. Final reviewed revisions and independent evidence are recorded separately in ART_REVIEW.md.

Renderer-specific checks compare scene-linear grayscale cards between High and Performance: radiance 0.18/1/4 produced identical displayed values 127/226/250. A 3,000-update atmosphere lifecycle check kept its 50 objects and 48 puff materials fixed; pause froze all particle/sky/mist clocks and disposal was checked. These are bounded local tests, not an FPS or iPhone performance guarantee.

Evidence is local under `artifacts/cinematic-builder-01/` and `artifacts/atmosphere-attempt-01/`, excluded from Git. The independent critic takes its own fresh captures and writes no implementation code. This is a new cycle with a maximum of four rounds, using the same 8.5/10-plus-zero-errors gate; no passing art score is implied by functional checks.

The final round-one capture suite is `artifacts/cinematic-builder-01/final-tour/`: all 31 views passed, with actual Light/Detail controls and no browser errors or remote requests. The six-target/speed physical-contact audit in `contact/` remains within numerical precision after the shared attack-clock change. Environment checks cover 23,497 wind-enabled instances across 24 world/resource batches, matching visible and shadow deformation, unchanged base matrices and all 1,450 saved scenery records. Landscape geometry remains 37 meshes and 1,742,148 triangles.

## Second builder attempt

Battle entry now establishes its arena camera position before the short cinematic sweep; returning to the expedition also restores the camera in the destination coordinates. A capture runner follows the actual minimap selection, Approach travel and Engage controls, then checks both cities' projected geometry at 0.05, 0.10, 0.30, 0.75 and 2.15 seconds. Finishing blows keep their impact visible for 0.65 simulation seconds before the result dialog opens.

Fixed pools of local deck lights and kaiju uplights add warm spill at dusk/night. River mist responds to the sun direction, reeds sway more slowly than meadow plants, and river ripples follow the curved channel. The terrain geometry, resource sites and saved scenery identities remain unchanged. The revised cinematic tour adds lethal wind-up/contact/result captures for 34 views in total. Builder evidence is under `artifacts/cinematic-builder-02/` and `artifacts/atmosphere-attempt-02/`.

The completed second attempt passes the 34-view tour, all 18 actual-entry captures across the three factions (World and City starting views), and 13 browser smoke checks with zero browser errors or remote requests. The entry geometry stays inside the camera bounds. Mist fades above its receiving surface to prevent intersection cut lines. Screen-space contact shading retains full strength through 20 metres and fades out by 45 metres to avoid distant river depth bands. Forty Node tests pass, including the shared attack timing behavior.
