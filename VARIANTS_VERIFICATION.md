# Prototype 0.6 — vertical castles and six carrier versions

The owner's reference replaces the earlier circular kaiju plan. The implementation keeps the twenty saved plot IDs while arranging them on five vertically stacked castle floors. A fresh city opens seven plots across the lower two floors; paid upper-ward construction opens the remaining thirteen. The inspector selects a floor, hides higher geometry and residents, and keeps the full population and routes intact.

Each faction has two selectable versions. New expeditions contain the selected version and five rivals representing the other versions. Older three-rival saves remain three-rival campaigns. Invalid cross-faction variant data is rejected.

| Faction | Versions | Relevant integration |
|---|---|---|
| Kaiju | Cyborg / flesh | Shared articulated skeleton and grounded feet, distinct organic and mechanical geometry, vertical castle and supported resident routes |
| Crawler | Armored / drill | Elongated drill chassis, spiral cutting cone, actual contact marker, matching mount coordinates, terrain fit, tread marks and crushing footprint |
| Airship | Horizontal / upright | Existing horizontal envelopes retained; alternative has exactly four rounded upright envelopes with necks and suspension lines |

## Builder evidence

- `npm test`: 50 tests pass, including variant save/resume, roster completeness, legacy migration, vertical expansion, weapon coordinates, cannon and projecting-trim obstruction, economy and full campaigns.
- `node tests/browser-smoke.mjs`: 13 checks pass for real UI construction, gathering, travel, combat, withdrawal, saving, reload/resume, pause and 390px layout; zero browser errors or remote requests.
- `node tests/variants-art-capture.mjs`: neutral six-version capture runner, covering title selection, City, body/close views, movement pairs, Streets, paid castle expansion and floor inspection. Final builder run produced 48 screenshots with zero browser errors or remote requests. Independent runs are recorded separately in the critic reports.
- Castle geometry audit covers all three legacy expansion states, finite geometry/normals, building-volume clearance and 48 resident routes over 40 seconds. Routes remain supported and pause-stable. Cutaway hides upper instances while preserving all routes/population.
- Carrier studies confirm four upright envelopes, no duplicate horizontal envelopes in that version, finite models, a real rotating helical drill and an on-axis tip marker.
- `node tests/castle-weapon-audit.mjs`: 525 rendered barrel samples across castle stages, plots, single/double cannons and aim angles have no masonry intersections. Actual muzzle markers match the shared mount dimensions. Four ordinary battle captures verify that clear ports fire while blocked batteries add no projectile or damage.
- `node tests/castle-projectile-audit.mjs`: 1,254 plot/level/barrel/heading/target-height samples include 313 allowed curved trajectories, with zero intersections against the rendered castle in that grid. Three battle captures preserve the original sill, roof-seam and railing-post regressions: no blocked battery event, effect or damage contribution. Target heights are controlled fixtures; this is not certification of every moving-hull angle or terrain situation.
- Flesh-body verification preserves the rig, hands, soles and harness while changing the skin surface and supported stance. The variant contact audit passes 16 ground engagements and 12 ranged actions against both aircraft versions, including pause and impact timing.
- The drill engages ground hulls with a rigid auger on a limited gimbal and telescopic shaft. Against airborne targets, normal cannons and a 60-damage Siege burst replace auger contact; the airborne special does not drive the crawler toward the target. Damage still resolves at visible projectile impact.

The independent critic uses the unchanged 8.5/10 and zero-error gate, with at most four rounds. Functional checks do not constitute aesthetic approval. See [ART_REVIEW.md](ART_REVIEW.md) for the independent results.

**Final independent result: 7.1/10, gate failed after all four rounds.** The critic took 69 fresh screenshots and reproduced the contact, barrel and curved-projectile checks. All previously known defects are resolved within that coverage; no remaining concrete visual/runtime errors were identified. The overall art score remains below 8.5, with anatomy, castle material/massing and citizen/environment finish still needing work. No fifth pass was performed.

Castle walls and weapon logic share cached geometry with split gun ports, window frames and sills, roof seams and perimeter posts. Barrels stop at a clear physical angle; a desired shot obstructed by the castle remains blocked. These checks cover the castle and district/carrier obstacles, not terrain or complete building-by-building ballistic destruction.

## Practical limits

This remains a PC browser prototype with procedural art. Variants share their faction's economic and base combat statistics. Citizens circulate within a floor and do not navigate between floors. City structures are fixed plot assets; no interior simulation or building-by-building battle destruction is implemented. iPhone device performance and packaging are untested. The private repository backs up source; the playable build stays local at `http://127.0.0.1:4178/`.
