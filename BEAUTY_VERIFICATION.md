# Prototype 0.7: visual quality and sound

This is a new four-round cycle for the owner's request to push visual quality as far as possible and add sound. The earlier reviews remain unchanged. The global 8.5/10 and zero-error gate still applies; functional checks do not establish art quality.

## Builder attempt 1

- Original branch/leaf/needle meshes, undergrowth and fractured ridge beds; local PBR ground, bark, rock and architecture scans; HDR reflected lighting and view-space hemisphere contact shading.
- Sculpted flesh anatomy and face, regional skin maps, layered citizen clothing, supported walking soles, recessed glazing and roof edges.
- Original local WebAudio score, ambience, six carrier identities, action and combat effects. Four persisted volume buses, explicit mute, gesture unlock, pause/visibility suspension, bounded sources and attack-impact timing.
- No economy, district IDs, castle firing geometry, save format or resource-protection changes. Surface assets are CC0, recorded with hashes in the asset manifest. Runtime requests stay local.

Validation: 52 Node tests and 13 complete browser smoke checks pass. The smoke test covers construction, travel/gathering, save/reload, battle/withdraw, pause and 390px layout. Initial missing HDR MIME support was fixed in the game server, and the complete smoke run then passed with zero browser errors or remote requests.

Audio DSP/browser checks render a finite, non-silent stereo mix (peak 0.20845, RMS 0.03270) and exact silence while muted, with at most 24 simultaneous sources and 83 tracked live nodes. Tests cover event and saved-battle deduplication, delayed impacts, gesture gating and pause/hidden suspension. These measurements are technical checks, not a subjective listening score.

Fresh builder images and detailed results are stored under ignored `artifacts/beauty-builder-01`, `artifacts/beauty-render-builder-01`, `artifacts/prototype07-builder-01` and `artifacts/quality-builder-01`. The independent review will identify the frozen source revision and use its own fresh screenshots.

Attempt 1 also passes 28 physical contact/ranged-action cases, 525 actual barrel traces and 1,254 curved cannon trajectories (313 permitted paths, zero castle collisions). The independent review of `af2a350` scored **7.2/10**, with no identified concrete errors in 63 fresh views. The global aesthetic gate remains unmet.

## Builder attempt 2

The metal scan now describes local wear without multiplying already-dark armor paint by dark photographed oxide. Mid-value paint, bare steel and dark recesses remain distinct; painted panels receive a restrained clear coating. Nineteen additional normal-HUD lighting/detail images, including cyborg day/dusk/night, pass without shader, asset or runtime errors. Creature, terrain and castle revisions follow the critic's ranked list and receive fresh integration checks before review.

The second castle pass adds a projected choir, deep roofed shoulders, enlarged belfry, carved window niches and tapered supports, all shared with the firing model. Its final checks pass 525 barrel traces and 1,254 trajectories (302 permitted paths; zero rendered-geometry collisions). New solid forms correctly close some previously open paths without changing plot IDs or floor routes.

Connected eroded ridges, talus terraces, asymmetric river shelves and triplanar cliff surfaces replace detached mountain blocks. The environment retains all 1,450 saved IDs/xz anchors/sizes, protected clearings and destruction behavior, with 20 fresh HUD views and no browser errors. Twenty-eight integrated ground-contact/ranged-action cases pass after the new terrain and skinned limbs; maximum measured contact error is 0.01158 metres, with finite geometry and preserved pause/impact timing.

Four weighted skin meshes span the flesh limbs, using fourteen bones driven by the existing rig. A motion audit sampled 842,400 deformed vertices without invalid positions; weight sums differ from one by at most 2.98e-8. Citizens retain 17 instanced batches and supported, pause-stable feet while adding parcel, reading, tool and conversation gestures. All three faction routes, floor cutaways and capacity checks pass. The complete 13-check browser playthrough and 52 Node tests also pass before submission.

The independent second review of `66632ee` scored **7.4/10**, with zero identified concrete errors in 74 fresh views. The critic independently reproduced both weapon audits and identified landscape structure, castle silhouette, flesh finish and citizens as the next priorities. Metal readability and connected joints improved; the global aesthetic gate remains unmet.

## Builder attempt 3

The castle now has a wider projecting choir, an overhanging bell chamber, roofed side hall and connecting gallery, with curved roof hips and windows on exposed faces. Shared collision descriptors include the revised solid architecture. The flesh hero receives a broader neck/shoulder connection, stronger facial planes and blended extremity skin. Flesh-only hip transfer, counter-roll and arm swing increase while retaining the existing sole and strike solves. Citizens gain thicker garments, facial planes and hands that rotate with their task poses.

Exposed terrain uses the bundled fractured-rock scan rather than loose gravel, with larger triplanar projection, geological beds and erosion cuts. A 400-segment terrain grid retains the 2-metre playable walking surface while allocating more vertices to visible outer cliffs.

All 52 Node tests and 13 UI playthrough checks pass. The full 28-case combat audit passes, with maximum observed contact disagreement 0.01173 metres and preserved delayed damage, muzzle origins and pause behavior. Castle audits pass 525 barrel traces and 1,254 curved paths (294 permitted; zero actual castle collisions). The enlarged belfry legitimately opens the previous slot-16 +30-degree regression path; 768 rendered ray segments confirm it is clear. The new +10-degree path hits the actual roof seam. Only those two regression-fixture angles were updated; obstruction, damage and rendered-projectile assertions remain unchanged.

The flesh motion audit again samples 842,400 finite deformed vertices. All three faction citizen support, pause, capacity and selected-floor checks pass at 19 bounded instanced batches. Fresh builder coverage includes 23 faction HUD views, four body/ward motion views and eleven castle views, with zero browser errors or remote requests. Evidence is stored under `artifacts/beauty-builder-03` and `artifacts/quality-builder-03`.

Fourteen final terrain/wind HUD captures and the environment invariants pass: all 1,450 saved scenery records match the round-2 baseline, the six resource clearings remain level and protected, and wind/depth/shadow/pause/destruction behavior is retained. Forty-one actual ground raycasts agree with the shared rendered height within 8.53e-14 metres. The landscape has 38 meshes and 3,447,040 worst-case triangles, including preallocated instance capacity; this is not a per-frame performance claim.

Nineteen day/dusk/night and quality views pass without browser errors or remote requests. The independent third review of `fd4f9a1` scored **7.5/10**, with zero identified concrete errors in 70 fresh views. The critic reproduced the 1,254-path audit and ranked ecological composition, living character weight, building-linked human activity and integration of the castle volumes for the final attempt.

## Builder attempt 4 — final submission

Nearby forest skirts, wet river bends, litter and broken ground now share material and vegetation placement masks. New shrubs, ferns and buried bank rocks attach to existing scenery records; grass and reeds are grouped more deliberately. All 1,450 save records, protected sites, movement routes and terrain heights remain intact. Environment checks and twenty fresh HUD images pass; 39 meshes and 3,483,840 worst-case triangles keep the added detail close to the previous budget.

Castle foundations, secondary wings, dressed chambers and the primary keep receive distinct material responses and coherent weathering. The previously blank spine has recessed windows. All 525 barrel traces and 1,254 curved paths pass (294 permitted, no actual intersections), and all three obstruction battle fixtures pass unchanged. Eleven final castle HUD views retain readable floor cutaways.

The flesh torso uses two soft-tissue morphs for breathing and recovery, with restrained head counter-motion. The harness, shoulders, soles and strike pivots retain their existing transforms. All 28 physical contact/ranged-action cases pass, with maximum measured contact disagreement 0.01173 metres. All 52 Node tests, 13 complete UI playthrough checks and 19 lighting/quality captures pass with zero browser errors or external requests.

Completed housing, farms, sawmills and foundries expose real platform and hand-contact markers. Up to three existing residents work at those stations, including planted seedlings, fixed ledgers and clamped workpieces. Stations are collected from current completed district meshes after placement and scaling; construction, rebuilding and floor selection govern which stations are usable. The animation receives these live marker transforms rather than aiming at empty plot coordinates.

The live station audit verifies bracing-hand error at most 1.74e-14 metres, actual platform-plane sole clearance at most 2.46e-7 metres, and a hammer strike within 5.93e-6 metres followed by visible lift. An initial world-Y comparison was replaced with the actual tilted support plane; it was a measurement error rather than a floating sole. Construction and empty plots exclude stations, upgrades replace their marker objects, and selected-floor counts remain correct. A six-variant affine audit also passes, including the drill's nonuniform deck scale and compressed kaiju districts. The final body check samples 842,400 finite skinned vertices; an additional 48,530 torso morph samples and unchanged-time pause checks pass. Builder evidence is under `artifacts/quality-builder-04`.

## Final independent result

The fourth and final review evaluated frozen product revision `7254925e7732f0e13af4efb25368808ee38b618e` using 67 fresh critic screenshots. Both independent capture runners completed with zero browser errors and zero remote requests; all 12 lighting observations loaded HDR and 10 surface sets without faults. The critic identified zero concrete visual/runtime errors in reviewed coverage and scored the game **7.6/10** (weighted 7.615). The full report is [beauty-04.md](art-reviews/beauty-04.md).

**The four-round cycle is closed and the 8.5 AAA gate was not achieved.** The remaining aesthetic gaps are landscape composition, flesh-kaiju anatomy and physical weight, Gothic architectural massing and close human detail. Technical audio checks passed as recorded above; the critic did not subjectively listen to the soundscape and assigned no audio-quality score. These results describe tested coverage, not a guarantee of every game state or PC/phone performance.
