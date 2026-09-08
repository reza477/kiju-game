# Prototype 0.4 and visual-review verification — September 7, 2026

The playable local URL is **http://127.0.0.1:4178/**, served from the Kiju Game workspace. `Play.cmd` opens this game in the default browser. Source is backed up to the existing private `reza477/kiju-game` GitHub repository; no public website is deployed.

## Circular backpack and carrier scale

- The kaiju is scaled to 0.55 of the previous model: about 30 world units tall. The crawler and airship have maximum dimensions of about 39 units; all three now have comparable overall scale while retaining different proportions.
- All twenty kaiju district positions share the same foundation elevation. The central keep and six inner plots are available initially. Thirteen outer plots stay locked until the ring is paid for (90 wood / 65 iron) and its twelve seconds of construction complete.
- The browser audit used the actual expansion control and disabled/enabled plot controls. Geometry checks covered all twenty occupied, rotated building envelopes against the foundation and harness.
- Existing saves with occupied outer plots automatically receive the outer ring without changing their building IDs, levels, resources, or construction progress. Pending expansion also survives save/load.

## People, weapons, and living world

- Each faction has eight wardrobes and sixteen instanced batches, articulated movement, and consistent 0.760–0.832 world-unit human height. The small kaiju ring displays sixteen residents; other starting cities display twenty-four. Expanded cities support up to forty-eight. These display caps do not change simulated population.
- Actual Streets controls show Gothic, Victorian British, and Eastern-inspired clothing. Screenshots were visually inspected for all three factions.
- The same level-one cannon, set through the actual direction buttons, dealt 15 total damage facing backward and 24 facing forward. The displayed active count changed from 0/1 to 1/1. Its projectile started within 0.001 world units of the authored muzzle marker.
- Unit checks cover firing arcs, rotated/scaled mount coordinates, tall-building obstruction, lofted airship missiles, mounted range beyond the base guns, unfinished batteries, and melee separation. Twenty-four additional CPU integration cases checked turret transforms and survival through static batching.
- Actual movement across an unprotected tree produced three crushed objects and twelve ground marks for the kaiju, sixteen crushed objects and twenty-six tread marks for the crawler, and no crushing or ground marks for the airship in the audit route.
- A crushed tree remained a visible stump after manual save, browser reload, and Continue. Resource amounts and site meshes survived rural movement; travel to the protected grove still gathered wood.
- The world includes fifty-seven ambient life actors. Ground marks are capped at 400 and saved damage IDs at 512 per world mode. Standalone checks covered stationary actors, tiny position jitter, fast travel, reset, mode isolation, bounded storage, and resource protection.
- Terrain height and surface normals are shared by cities, scenery, selection markers, travel paths, and ground marks. Resource buildings sit on level clearings. Crawlers tilt with the surface; the kaiju stays upright.
- A final terrain pass added broad interior ridges, gullies, and exposed rock coloring. The sampled playable terrain spans -1.2 to 31.1 units, with a 23.4-degree 95th-percentile slope and a 31.8-degree maximum. Normal and low-angle game screenshots in `artifacts/terrain-relief/` confirm visible relief, with no browser errors or remote requests.

## Regression results

- **35 Node tests pass** (`npm test`): economy, buildings, upgrades, movement, gathering, combat, complete expeditions, save validation, ring expansion/migration, physical melee reach, firing geometry, and terrain invariants.
- **13 browser smoke checks pass**: title previews, UI construction, travel/gathering, save, world view, rival selection, battle movement/ability, withdrawal, reload/resume, pause, and narrow layout.
- The integrated living-world browser audit passed with twenty-six screenshots. It reported **zero browser errors, remote requests, WebGL context losses, or horizontal overflow at 390px**.
- Targeted follow-up screenshots verified the airship hull stays below its plaza, and both complete carriers remain visible at the actual 104-metre battle entry and 40/100-metre fixtures. The camera chooses its initial angle relative to the two combatants. These captures hide only the transient toast/pause overlays and retain the normal controls.
- Browser tests run in isolated Chrome contexts, so they do not change the player's normal browser save. They use the explicit local `?test=1` development interface and no GPU instrumentation.

Evidence is local and excluded from Git: `artifacts/living-world-final/living-world-results.json`, its screenshots, and `artifacts/browser-results.json`. The old `backpack-audit.mjs` command now forwards to the current living-world audit; the obsolete four-terrace assertions were removed.

## Independent visual review cycle

The fixed owner gate requires at least 8.5/10 and zero observed visual or runtime errors. Functional tests do not establish an aesthetic pass. Each completed attempt is reviewed by a separate critic who writes no implementation code and initiates fresh captures. Scores, reviewed revisions and ranked findings are recorded in [ART_REVIEW.md](ART_REVIEW.md).

Through the third builder attempt, changes include a solid backpack support frame, articulated knees/ankles with whole-sole terrain fitting, load-bearing body motion, clothing silhouettes and idle gestures, quieter plot surfaces, stable shadow filtering, a denser playable terrain grid with continuous ground materials, and camera framing above the build tray. All 1,450 existing scenery records and six resource sites survive the material change. The terrain stays at 180,000 triangles; the landscape stays at 37 meshes.

Round 3 passed all 34 Node tests and the integrated gameplay browser audit. Its 27-view tour, 30-frame level/slope stride fixture, and 16-frame firing/contact/recovery fixture had no browser errors or remote requests. Evidence is under `artifacts/builder-round-03/`; terrain-specific preservation and raycast evidence is under `artifacts/builder-round-03-terrain/`. These are builder checks; independent captures and judgments are separate.

The final builder attempt adds targeted arm motion, a supported crouch/step, closed fists, and one simulation clock for animation and impact. Melee reach is 18 metres against broad hulls and 12 against another kaiju. Both projectile and melee effects anchor to actual rendered surfaces; targets that turn during wind-up are reacquired from the near side. Tree crowns vary while saved scenery positions stay fixed, ruins have composed collapse debris, and the three slate anchors form a fractured outcrop. The landscape remains 37 meshes, with 240 additional triangles.

The final gameplay audit and 13 browser smoke checks pass with no browser errors, remote requests, lost contexts or narrow-screen horizontal overflow. The six-case contact audit covers three target types at both speed settings, checks a real knuckle against the animated target mesh, and confirms no travelling projectile precedes a punch. Separate six-case runs cover slopes and slow frames up to 0.16 game-seconds per rendered frame. A moving-airship recovery check caught and corrected pinned feet during pursuit; the final sequence retains walking support and clears residual forearm rotation. A 362-pose level/slope stride sweep retains at least 1.5 mm sole clearance, with a maximum terrain-curvature gap of 3.15 cm. Final evidence is under `artifacts/builder-round-04/`, `artifacts/combat-contact/` and `artifacts/builder-round-04-environment/`.

## Boundaries

This release was checked in Chrome on this Windows PC. These checks do not establish physical iPhone/Safari support, native packaging, stable GPU allocation, or a calibrated frame-rate guarantee. Citizens remain visual agents, plots are fixed, only two kaiju rings and three building levels are available, and combat does not yet simulate terrain occlusion or individual building damage. See README.md for controls and scope.
