# Actual vertical Gothic construction — prototype 0.8

The owner's clarification requires every new Gothic district to be built above the previous top. The former four plots per prebuilt floor were incompatible with that rule. Both kaiju variants now share an ordered, cumulative stack; other carriers retain their horizontal deck layout. This rule is also recorded in AGENTS.md.

## Builder attempt 1

- One district per storey at x=0, z=-12. Every addition appends on top, even when historical slot IDs are nonsequential. Upgrades increase their own storey height and lift all higher storeys. The titan itself retains its scale and rig.
- Shared layout drives architecture, district inserts, support slabs, citizens, activity markers, lamps, cannon mounts and collision. The fixed structural footprint is 8.8 by 10.4 carrier-local metres. The Gothic crown follows cumulative height.
- New construction order persists; legacy saves migrate deterministically while preserving district IDs, levels, costs, resources, timers and opponents. The existing harness expansion costs and duration now buy capacity only, without generating empty floors.
- The HUD offers Add above castle and names each occupied storey by its district. Storey inspection selects that building for upgrades. Camera framing follows cumulative height.

Validation: 62 Node tests pass. The integrated public-HUD browser run passes all six variants with 36 fresh builder screenshots, no browser errors or external requests: real fourth-storey placement, lower-storey upgrade, reload/resume, paid capacity increase and a labelled late-game 20-storey fixture. All four non-kaiju variants retain their unchanged deck positions. The 390px interface has no horizontal overflow. Evidence: `artifacts/vertical-builder-01/integration`.

The rendered weapon audit checks 648 barrel/curved-shot cases across 3, 7, 12 and 20 storeys: 103 allowed and 545 blocked, no barrel penetration or allowed-path masonry collision, maximum muzzle discrepancy 7.17e-15 metres. High-mounted cannons can clear the creature while still being obstructed by their real castle portals on steep downward shots. Evidence: `artifacts/vertical-builder-01/weapons`.

The citizen/room audit passes 80 checks: compact rooms fit their ceilings; paths and lamps follow actual storey heights; construction floors have no residents; 48 residents remain bounded to 19 batches; pause and floor cutaways hold. Workstation hand contact error is at most 7.16e-15 metres. Evidence: `artifacts/vertical-builder-01/citizens`. Independent art scoring follows a frozen revision; builder checks are not aesthetic approval.
