# Independent art review — graphics 0.9, round 4 of 4

**FAIL — 8.0 / 10 overall (weighted 7.995). Zero confirmed concrete visual errors and zero browser errors in this review's coverage.** The raised river shelf, broader flesh forms and stronger castle roof improve the scene. The final build still falls below the fixed 8.5 AAA threshold: late castles remain repeated narrow shafts, much of the terrain remains smoothly mottled, and characters do not yet convey convincing natural form and enormous weight. This is the fourth and final review of this graphics update. There is no fifth round.

Reviewed frozen revision: **`89026e1e9e7e8fc910afde3a5c8628e93533eb6c`**. I verified HEAD and a clean working tree before capture and again after all five runners and image inspection. I held exclusive GPU access, ran existing neutral runners unchanged and sequentially, and wrote only this report. No implementation code, assets, tests or capture scripts were changed. Earlier reviews remain unchanged.

## Fixed whole-game rubric

The fixed standard remains above 8.5 for AAA, 7 for good indie and 5 for programmer art. Pass requires at least 8.5 and zero identified concrete visual/runtime errors. Functional test counts, implementation effort and a clean runtime do not earn aesthetic points.

| Category | Weight | Round 3 | Final round 4 |
|---|---:|---:|---:|
| Default composition and readable game presentation | 20% | 8.0 | 8.0 |
| Terrain, environment assets, atmosphere | 20% | 8.0 | 8.1 |
| Kaiju construction, animation and physical weight | 20% | 7.7 | 7.8 |
| Citizens, clothing and life | 15% | 7.8 | 7.8 |
| City and carrier asset design | 15% | 8.2 | 8.3 |
| Combat and weapon visual communication | 10% | 8.0 | 8.0 |

Weighted result: **7.995, displayed as 8.0**, compared with round 3's 7.940. This is a modest improvement, not an AAA result. The zero-error requirement is met only within the bounded evidence below; the aesthetic requirement fails.

## Changes since round 3

The Westbank Shelf introduces an actual raised terrain profile, with crawler placement following ground support. The Gothic crown now has a broader main roof and steeper full-height flesh silhouette, while the cyborg retains its compact profile. Flesh chest, shoulder and limb volumes are broader without changing the joint arrangement. The review coverage now includes explicit walking with twenty occupied storeys and actual travel across and along the shelf with both crawlers.

The builder also removed invalid ruin-wall faces and added finite-radiance handling after finding a black rectangle in a full-load flesh view. The builder's diagnosis and same-frame HDR comparison are separate technical evidence. My independent verification is the fresh product capture of that exact named view and the rest of this tour, not a repetition of the builder's pixel comparison.

## Own fresh evidence

All screenshots and detailed runner output are under ignored `artifacts/critic-round-04/graphics-09/`.

| Existing runner and filter | Fresh normal-HUD views | Subdirectory |
|---|---:|---|
| `variants-art-capture.mjs`, `VARIANTS=cyborg,flesh,standard,horizontal` | 42 | `variants` |
| `environment-art-capture.mjs`, full tour | 7 | `environment` |
| `terrace-art-capture.mjs`, both crawler routes and variants | 12 | `terrace` |
| `beauty-render-audit.mjs`, full tour | 19 | `lighting` |
| `combat-art-capture.mjs`, `SEQUENCES=kaiju-melee,crawler,airship` | 12 | `combat` |

**92 fresh screenshots; all five runners completed with zero reported browser errors, zero remote requests and no runner failure.** These are the critic's own screenshots. I inspected both close kaiju bodies, initial-load walking pairs, expanded front/reverse castles, all eight twenty-storey walking frames, occupied storeys 11 and 20, all four selected variants' Streets, horizontal carrier movement, all seven landscape views, all twelve crawler route views, all nineteen lighting/detail images, and all twelve combat phases.

The new full-load observations report twenty occupied storeys in every loaded frame. Both variants advance gait distance from approximately 44 to 74 through the front and side sequence, with `moving=true` and valid cameras and contexts. The recorded castle layout heights are approximately **38 for cyborg and 76 for flesh**, retaining the exact half-height relationship in the occupied fixture. Natural-sized residents remain visible in compact rooms and upper storeys. The standard crawler, elongated spiral-drill crawler, horizontal airship envelopes and exactly four upright balloons remain visually distinguishable, with British industrial and Eastern domed city architecture preserved.

Environment and lighting diagnostics report ten surface sets and four active skin sets ready, with zero pending/failed loads and valid WebGL contexts. The landscape report records zero invalid matrices and protected-anchor overlaps, 1,665 destructible objects and 57 ambient-life objects. Its empty effect pools have zero active/submitted instances. These findings apply to the captured states.

## Concrete defect result

**No new concrete visual error is confirmed.** In particular:

- **The reported black rectangle is absent in my own `variants/flesh-loaded-side-b.png`.** Its preceding side frame and the two loaded front frames are also clean. The landscape and lighting images do not show a new rectangular corruption. I did not independently repeat the builder's invalid-face or HDR buffer audits.
- **Round 1's unsupported shoulder lantern remains resolved.** Neither lowest Gothic day/night cutaway shows that floating housing. Visible lamps retain their supports, and city views retain illumination.
- **Both twenty-storey backpacks remain attached during the sampled strides.** The side views show the harness and tower moving together. No new obvious body/castle separation or citizen clipping is visible in the inspected floors.
- **Both crawlers follow the sampled bank slopes.** Front, side and reverse travel views show their hulls pitching and rolling with the ground, with tracks behind them. The across-route reverse cameras are partly occluded by foreground terrain; that controlled low viewpoint is not evidence of a crawler sinking defect.
- **Combat contacts and recovery remain coherent.** The cyborg bends into a visible fist/hull contact and returns to a supported pose. Crawler cannon and airship missile effects appear on the struck opponent, health decreases at contact, and the effects clear during recovery. The normal HUD remains readable.

This zero-error result is bounded to the reviewed evidence, not a guarantee of every possible state.

## Ranked remaining aesthetic priorities

These are ordinary polish opportunities, **not confirmed defects**. They explain the failed aesthetic gate and remain for an owner-directed future update; they do not authorize a fifth round in this cycle.

1. **Resolve the late Gothic castle's major composition.** The broader roof gives the initial three-storey castle a better finish, especially in the flesh day/night City views. In both expanded and full-load walking sets, however, the roof still caps a long, repetitive shaft. The main keep, supporting spine and recessed chapters need more distinct visual weight and clearer connections. Improve those few large relationships within the existing footprint and required height. Preserve upward district order, natural residents, the exact cyborg half-height and the wider cannon galleries required for clearance. Further repeated trim alone will not solve this.

2. **Connect the terrain's larger material and landform transitions.** `environment/terrace-profile.png` and the crawler side views establish a real bank profile, which is better than flat scatter. The wider City/World/river views still contain broad smooth green-brown patches between detailed tree clusters. The new shelf remains visually gentle at normal distance. More deliberate soil, stone, drainage and forest-edge transitions should follow that structure and the surrounding valley, preserving navigable routes, resource clearances and saved scenery identities. Avoid using more scattered detail as the main answer.

3. **Make the flesh hero's anatomy and load feel convincing.** The broader chest, upper arms and thighs read more clearly in `variants/flesh-body-close.png`. Long smooth forms, simplified hands/face and soft anatomical transitions still dominate. The actual twenty-storey walk proves that the occupied load moves correctly, but its regular articulation sells the motion more strongly than the mass. More purposeful shoulder/hip/foot load transfer and a few better anatomical planes would improve the character while preserving the existing dimensions, joints and contact system.

4. **Give inhabitants more natural close silhouettes and finish.** Clothing, faction identity and workstation activity remain useful. Many faces, hands and resting poses still resemble upright dolls, and the repeated poses are easy to notice in Gothic Streets. More deliberate head/hand shapes, cloth response and varied working/resting silhouettes would make inspection more rewarding. Retain natural size and the established floor, route, ceiling and workstation clearances. This category did not materially improve in this final attempt.

## Coverage and performance limits

The variant tour uses a deterministic product clock. Its late-game fixture populates twenty districts after paid harness reinforcement; it is not an independent test of twenty paid construction orders or every save migration. The full-load walking frames do advance the real stride after populating the fixture. Four selected variants are saved by that runner, but the builder's broader compatibility and scenery-identity audits were not rerun by the critic.

The landscape tour relocates the player and camera to existing landmarks. Incidental overlaps in those controlled placements, including the viaduct composition, do not establish normal-navigation collision defects. The terrace runner uses controlled initial positions and cameras, then real travel/tick/placement/animation over two routes for each crawler. It does not cover all terrain or every hull orientation. The omitted kaiju body-gun ranged sequence, upright-balloon movement and mobile checks are inherited from earlier coverage rather than recaptured here. Combat uses controlled initial placements, enemy health and reload; three sequences do not prove every battle arrangement. Only transient toast/pause overlays are hidden. Subjective audio is unreviewed.

All twelve real-time lighting observations completed with loaded assets and valid contexts. Median animation-frame intervals were **10.0–10.1 ms**, with **p95 at most approximately 20.1 ms**, on **RTX 4070 Ti SUPER through ANGLE/D3D11**. Each observation contains 119–181 samples. This is consistent with round 3 and does not reproduce round 1's slower result. These are short, uncalibrated headless observations, not sustained foreground benchmarks or guaranteed frame rates. The twenty-storey and terrace tours use a deterministic clock and do not establish sustained maximum-load performance.

**Final round complete: 8.0 / 10 (weighted 7.995), zero confirmed concrete errors in the stated coverage, AAA gate failed on aesthetics. The four-round graphics 0.9 review cycle is closed.** All capture browsers are closed; the local server remains running. The frozen build and GPU are released to the builder.
