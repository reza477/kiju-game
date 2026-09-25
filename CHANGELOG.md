# Changelog

This history describes prototype milestones. A version entry records development work, not a public release or art-quality approval. Verification reports retain the evidence and review outcome for their particular revision.

## Repository setup — September 24, 2026

Established a maintained private GitHub default branch, organized project documentation, added automated tests/package checks, and prepared a draft Alpha 1 prerelease. Playable hosting remains separate and unconfigured.

Canonical line endings in fresh source checkouts produce package ID `b5d9adf4c4e48af6e780`. The historical locally verified Alpha 1 package remains `cb00d8cec12f2c169cf4`. Nine packaged files differ only in line endings; the content-addressed ID therefore differs without a gameplay or visual change. The original playable checkout, source tag and historical QA remain intact. See the dated repository note in [Alpha 1 verification](ALPHA1_VERIFICATION.md).

## 0.10.0-alpha.1 — Alpha 1, September 17, 2026

- Rebuilt tree crowns with locally generated cutout foliage, bowed cards, coherent wind and matching cutout shadows; retained species-specific fallen foliage.
- Added spatial vegetation culling, lighter foliage meshes and cached terrain sampling while preserving saved scenery identities. Submitted triangles fell about 59% in matched desktop samples; CPU/frame intervals remained broadly similar and Performance-mode GPU results were mixed.
- Refined meadow, soil, rock, river flow and outer mountain ridges. Added original seamless meadow detail, baked relief/cavity shading and opaque terrain color matching the displayed grid.
- Fixed save-failure recovery, battle-result dismissal, keyboard focus and district benefits during upgrades.
- Prepared one shared local PC/mobile build with touch layouts, pinch input, portable save export/import and rollback, feedback export, complete offline caching and repair preserving saves. No hosted mobile link was created.
- Recorded 127 unit tests, 180 rendering combinations, 1,296 weapon-clearance cases and broader checks in [Alpha 1 verification](ALPHA1_VERIFICATION.md).

The final independent environment score is **7.5/10**, below the 8.5 gate after four rounds: 7.1 → 7.4 → 7.5 → 7.5. The final bounded review established no remaining concrete visual/runtime defect. Regional ground cover, close tree crowns, geology and river-bank variety remain ranked polish work. Physical Apple devices and long-session stability remain unverified. See [the final review](art-reviews/alpha1-04.md).

## 0.9 — Graphics and environment

Expanded the renderer, landscape, six carriers, citizens and combat with scene-linear bloom, indirect lighting and clearer material response; denser forests and ruined-world landmarks; layered carrier construction; expressive residents, garments and impact particles. Added a raised western riverbank terrace and erosion notch with crawler track-support alignment. Gothic castles gained recessed gallery chapters and a steep cathedral crown; flesh anatomy and walking motion respond to completed castle load. Existing scenery identities and saved construction remain supported.

The four-round review ended at **8.0/10** (weighted 7.995), below the 8.5 gate, with zero confirmed concrete visual/runtime errors in 92 fresh critic captures. Recorded checks include 71 core tests and a 13-check gameplay flow. See [verification](GRAPHICS_UPGRADE_VERIFICATION.md) and [review](art-reviews/graphics-09-04.md). Its scope and rubric differ from the later Alpha 1 environment review; the scores are separate assessments.

## 0.8.1 — Compact cyborg castle

Halved the cyborg castle's storeys and crown relative to its attachment deck while preserving the horizontal footprint, robot, body weapons and natural-sized residents. Compact interiors, work surfaces and cannon mounts fit actual clearance. The flesh castle retains full height, and both still grow one district per storey.

The bounded adjustment concluded after two independent reviews at **7.7/10** overall. The scoped interior proportion correction was resolved, with zero confirmed concrete errors in the final 28 views. The whole-game gate remains unmet. See [verification](COMPACT_CASTLE_VERIFICATION.md) and [review](art-reviews/compact-castle-02.md).

## 0.8 — Cumulative vertical construction

Replaced multiple districts on prebuilt Gothic floors with **one district per storey**, appended above the existing top on a fixed footprint. Lower-storey upgrades raise every storey, resident, lamp and weapon mount above them. The crown follows cumulative height. Construction order persists; legacy saves retain district IDs, levels, resources, costs, timers, opponents and harness capacity through deterministic migration. Reinforcement increases capacity without adding empty floors. Tank and airship decks remain horizontal.

Added visible unfinished construction, staged Gothic chapters, material hierarchy, connected supports and garden cues. Public controls support adding above the castle, selecting occupied storeys and inspecting upper floors. New expeditions begin with three districts; title previews show a developed city.

The four-round cycle ended at **7.7/10** (weighted 7.650), below the gate, with zero confirmed concrete errors in 28 final critic views. Recorded checks include 65 Node tests, 5,376 resident-clearance probes, 648 weapon cases, construction/upgrades/saves and horizontal-carrier controls. See [verification](VERTICAL_GROWTH_VERIFICATION.md) and [review](art-reviews/vertical-growth-04.md).

## 0.7 — Materials, characters and living detail

Added scanned grass, forest soil, rock, masonry, roof, wood, bark and metal surfaces with local color, normal and roughness maps, baked material coordinates and an HDR lighting environment. Painted armor, bare steel and dark recesses retain distinct surface responses. Trees gained forked branches and individual folded leaves/needles, supported by rooted undergrowth, eroded cliffs and geological beds. Alpha 1 later replaced much of the foliage geometry with cutout crowns.

Refined the flesh titan's skull, jaw, neck, shoulders, regional skin and weighted continuous limbs; layered breathing and recovery over a supported walk. Citizens gained faces, layered clothing, planted soles and carrying, repair, reading and conversation poses. District work surfaces align with activity contacts. Gothic architecture gained a projecting choir, bell chamber, roofed galleries, varied stonework and recessed windows. See [beauty verification and review history](BEAUTY_VERIFICATION.md).

## 0.6 — Six carrier variants and the first vertical castle

Introduced flesh and cyborg Gothic titans, the elongated spiral-drill crawler beside the armored crawler, and exactly four upright rounded balloons beside the horizontal-envelope airship. Each variant can be selected and saved; new games represent all six among player and rivals. The drill's mounts, terrain footprint, tread marks and scenery crushing follow its longer chassis.

**Superseded design:** this milestone replaced the circular kaiju town with an initially two-floor fortress expandable to five prebuilt floors, each holding multiple districts. Version 0.8 supersedes that arrangement entirely with cumulative one-district storeys; it must not be restored. District IDs, resources and upgrades survive migration.

The four-round cycle ended at **7.1/10**, below the gate, with no remaining confirmed concrete visual/runtime error in the final 69-view review. Floor inspection and castle-trim firing defects were resolved in the reviewed coverage. Recorded checks include 50 Node tests plus browser, contact and cannon audits. See [verification](VARIANTS_VERIFICATION.md) and [review](art-reviews/variants-04.md).

## 0.5 — Cinematic camera, atmosphere and impact timing

Added battle-entry sweeps, travel look-ahead, recoil/impact movement, brief strike pushes and manual battle zoom. Steady mode disables added motion and initially follows reduced-motion preferences; manual orbit takes precedence and close views remain steady. Surface flashes track hit armor, and finishing blows remain visible before results open.

Added coherent wind through vegetation, water and smoke, wildlife motion, drifting clouds and localized mist. Day, dusk and night share a sun direction, reflected fill and warm city lights. Presets retain consistent output brightness with bounded atmosphere detail; pause freezes environmental movement. Damage lands with visible fists/projectiles, including lethal hits and saved attacks in flight.

The four-round cycle ended at **7.1/10**, below the gate, with no confirmed concrete visual/runtime errors in 56 final critic views. See [verification](CINEMATIC_VERIFICATION.md) and [review](art-reviews/cinematic-04.md).

## 0.4 and earlier — Foundation

Version 0.4 established comparable carrier scale and an earlier circular kaiju backpack. **The circular layout is superseded by versions 0.6 and 0.8.**

Early living-world work introduced eight citizen clothing variations per faction, walk/errand animation, Streets view, weapon facing and firing arcs, cannon ports, rotating turrets and muzzle-origin projectiles. Terrain gained hills, valleys, protected resource clearings, crawler slope support, ground marks, saved ambient scenery destruction, birds, butterflies, deer, grass and water motion.

Early reviews improved backpack structure, planted soles, slope contact, weight transfer, aimed punches, moving-surface impacts, contact shadows, ground materials, trees, ruins and camera framing. The first four-round review ended at **6.7/10** (5.3 → 6.1 → 6.4 → 6.7), with one confirmed defect: damage preceded visible contact. Version 0.5 addressed that defect. Historical findings remain in [art reviews](art-reviews/).

Version 0.2 replaced initial block models with textured districts, layered roofs, windows, balconies, chimneys, gardens and street furniture; articulated carriers and stitched lift envelopes; forests, fields, industrial ruins, rivers and distant terrain. Citizens, propellers, smoke and water became animated.

## Windows desktop launcher — September 12, 2026

Added a reproducible Windows GUI launcher, desktop/Start-menu shortcuts and local app window using existing Edge/Chrome and the normal save origin. It verifies this folder's health identity and refuses unrelated services without stopping them. Seven recorded launcher checks include the actual executable. See [desktop app details](DESKTOP_APP.md).
