# Full graphics upgrade — prototype 0.9

This visual cycle follows the owner's request to improve every aspect of the graphics as far as possible. The fixed independent whole-game art rubric and four-round limit remain in force. Previous cycles and their scores are unchanged.

## Design constraints

- Gothic districts still form one upward stack. Upgrades lift higher districts; harness work adds capacity only.
- The cyborg castle remains half-height relative to its flesh counterpart. The robot, body weapons and backpack footprint retain their established dimensions.
- All six carrier identities, faction architecture and clothing, existing saves and local play remain supported.
- Game assets and rendering stay local; the existing private GitHub repository stores the source.

## First builder attempt

The renderer adds a scene-linear four-scale highlight bloom, clearer indirect lighting, layered cloud shading, inward metal bevels, and physical cloth/glass/paint response. High mode renders at least 1.25 times display resolution; balanced and performance controls remain available. Combat receives textured muzzle flashes, local muzzle lighting, sparks, fragments, impact smoke and missile exhaust. Presentation uses a quieter HUD frame and stronger title-selection contrast.

Environment work adds distinct oak/aspen/pine habits, coherent forest belts and understory, exposed slate, gravel spits and a broken railway viaduct. Ground colour now follows woodland/biome structure with metre-scale stone UVs and wet bank transitions. The river has deeper channels, shallow bands and restrained current detail. Deer, birds and butterflies gain clearer forms. Existing terrain heights, saved scenery identities, resource protection and the 57-animal population remain intact.

City work adds chamfered crawler hulls, vaulted industrial undercrofts, a swept airship keel/navigation bay, more convincing propellers and balloon panels, and stronger Gothic chapter/crown forms. Castle rendering and obstruction still use the same solids. Character work adds continuous anatomical shaping and muscle flex, an articulated breathing jaw, gaze/blinks and independent fingers to the flesh titan; cyborg plate seams and fasteners; and resident fingers, expressions, faction ornaments and independently deforming cloth.

Visual quality is judged from the actual game, not from passing tests or implementation size.

## Evidence

- 67 Node tests pass, including exact castle/collision geometry, half-height cyborg comparison, cumulative construction and save semantics.
- The environment builder captured five normal-HUD views with zero errors/remotes/nonfinite instance matrices and no scenery anchors in protected resource areas. All ten surface sets loaded. Far-tree detail reduction lowered landscape geometry from 7.91M to 5.82M triangles. A river world-view frame counted 17.71M triangles and 2,815 calls across all visible geometry/shadows/postprocessing; this is not an identical comparison with earlier City-view counters. Evidence: `artifacts/graphics-09-builder-01/environment`.
- The city builder captured 13 HUD views across five variants with zero errors/remotes. A discovered upright balloon stripe intersection was corrected by matching the envelope tessellation and is included in the root's subsequent integrated capture. Evidence: `artifacts/beauty-09-builder/carriers`.
- The character builder passed 1,179 compact-resident checks (minimum overall ceiling clearance 0.1074 local units), 438,750 actual skinned-vertex samples and 3,641,760 deformed cloth samples across all three factions. No nonfinite deformations, shader errors or remote requests occurred. Garment height is unchanged by morphing; minimum measured garment clearance is 0.388 local units. Seven close views were inspected after a jaw seam correction. Evidence: `artifacts/beauty-09-builder-01/characters` and `artifacts/beauty-09-builder-01/residents`.

Root integration passes the complete 13-check browser smoke flow: build, gather, combat, retreat, save/reload, pause and 390px layout, with zero browser errors or remote requests. A further eight-view upright-airship integration confirms the corrected balloon panels, actual movement, inspection, saving, world view and narrow layout. Evidence: `artifacts/browser-results.json` and `artifacts/graphics-09-builder-01/vertical`.

The rendered castle weapon audit passes 1,296 samples: 210 allowed, 1,086 blocked, zero barrel penetration or curved-projectile collisions. Six real game muzzle markers agree within 1.43e-14 world units; body gun and robot scales are retained. The six-carrier contact audit passes 16 ground/melee cases and 12 aircraft ranged actions across four groups, including physical contact, moving impact anchors, pause and damage timing. Evidence: `artifacts/graphics-09-builder-01/weapons` and `artifacts/graphics-09-builder-01/contact`.

The first real-time lighting runner exposed a 30-second startup timeout. A separate diagnostic confirmed successful loading at 36.97 seconds with no missing assets or runtime errors. Moving the exact procedural anatomical maps into 15 local PNGs reduced the next cold diagnostic to 21.35 seconds. All exported and decoded RGBA pixels match the original canvases by SHA-256. The four discarded intermediate loft maps no longer load; the five visible map sets retain their original material settings. `scripts/bake-character-skins.mjs` preserves the local generator. Evidence: `artifacts/beauty-09-builder-01/skin-bake/report.json`. These observations are from this machine and are not a guaranteed loading time or frame rate.

The repeated real-time lighting audit passes all 19 normal-HUD views across four carriers, day/dusk/night and all three detail modes, with no shader/runtime errors, failed surface loads, remote requests or lost WebGL contexts. Observed median animation-frame intervals range from 10.1 to 30 ms and p95 from 20.1 to 40.1 ms in this uncalibrated headless run; these are not guaranteed player frame rates. Evidence: `artifacts/graphics-09-builder-01/lighting/render-report.json`. All 67 Node tests pass again after texture integration.

The first independent art review follows this frozen builder work.
