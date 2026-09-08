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

## Third builder attempt

Attack composition follows the real weapon clock: a short push toward the moving contact point, a hold through impact, and a smooth return to the unchanged tactical anchor. Distant attacks have a smaller focus shift to retain both carriers. Manual orbit/zoom and Steady clear the active shot; close management views remain steady. A new behavioral test checks anticipation, contact, recovery, pause and comfort controls. The simulation and camera suite now contains 41 tests.

This attempt also softens local light hotspots, redirects the shared night key, redistributes mist into eight river and sixteen valley/landmark pockets, and adds world-space billow variation. Vegetation lighting normals follow the existing deformation; river normals combine broad and fine flow with modest roughness variation. Geometry and scenery IDs remain unchanged.

The final 34-view tour and 18 actual-entry views passed with zero browser errors, remote requests or clipped entry bounds. Sixteen real-time weapon phase captures cover all factions and kaiju melee; the action remains framed and the camera recovers. Evidence is under `artifacts/cinematic-builder-03/`. Additional lighting evidence is under `artifacts/atmosphere-attempt-03/`: 13 targeted views and exact matching High/Performance tone values, with pause and fixed atmosphere/light pools preserved.

## Fourth and final builder attempt

Two fixed, non-shadow-casting impact lights add a brief warm spill to the struck surface and nearby armor. The impact core has sufficient radiance for a restrained bloom. Light begins at the same numerical contact threshold as damage, then decays to zero within 0.32 simulation seconds. The cinematic capture suite verifies no light in wind-up, positive illumination at contact and zero residual light in recovery. The six city fixture lights are unchanged; the two impact lights are the only added pool.

The final lighting adjustment increases the directional night key and rim while reducing flat fill; exposure, lamp fixtures, moon direction and mist stay fixed. The river's deeper channel follows outer bends, with irregular shallow deposits and pools reflected in its roughness. These changes preserve terrain geometry, resource sites and saved scenery identities.

Final builder checks: 41 Node tests, 13 browser smoke checks, six physical-contact cases across targets/speeds, and the final 34-view cinematic tour all passed. The tour confirms impact light onset and complete decay as well as camera recovery, Steady/manual priority, lethal result timing, pause and narrow layout. Browser errors, remote requests and context losses were zero. Eight targeted lighting views and day/dusk water temporal comparisons passed separately. All 1,450 saved scenery records, static geometry hashes and instance matrices match the third attempt. Evidence is under `artifacts/cinematic-builder-04/` and `artifacts/atmosphere-attempt-04/`.

## Independent outcome

The four rounds scored 6.8, 6.9, 7.0 and 7.1 against the unchanged global rubric. The final critic reviewed source revision `8d793b7` using 56 fresh captures, confirmed the camera/contact/lighting improvements and observed no concrete visual or runtime errors. The required 8.5 aesthetic score was not reached. This cycle is closed with a failed art gate; no fifth revision was made. See `art-reviews/cinematic-04.md` for the independent findings and remaining art limitations. Review reports are backed up with the private source; screenshot evidence remains local and ignored by Git.
