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
