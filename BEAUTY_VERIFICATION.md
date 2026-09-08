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
