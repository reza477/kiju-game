# Cyborg castle height adjustment — 0.8.1

The owner clarified that only the cyborg's castle backpack should become half-height. The robot, its body weapons and the castle footprint remain unchanged. Flesh castles retain their original height. Every district still builds directly above the preceding one.

The cyborg profile maps castle vertices with `Y = deckY + 0.5 * (Y - deckY)`. The rendered architecture and collision use the same vertices. Actual floor positions, support surfaces, the crown and camera metadata use that profile. Construction order, capacity, costs, upgrades and saved progress remain intact; the profile is derived from the carrier variant and requires no destructive migration.

Compact rooms retain natural-sized people and work tables, with lowered support pads. Castle cannons scale uniformly to 80 percent to fit the shorter floors; the robot's body guns retain their original size. Both visible muzzle positions and ballistic checks use the same mount profile. Lanterns fit below the ceiling. Combat damage and range are unchanged; physical castle obstructions still determine which shots can fire.

## Builder validation

- 67 Node checks pass, including exact half-height vertex comparisons at 3, 7 and 20 storeys, unchanged X/Z coordinates, level-three districts and preserved save/upgrade behavior.
- 28 public-HUD captures across cyborg and flesh pass real additions, lower upgrades, paid capacity reinforcement, save/reload, movement, 20-storey inspection and 390px layout. No browser errors or external requests. Evidence: `artifacts/compact-castle-builder-01/integration`.
- 1,296 actual rendered-mesh weapon cases pass: 210 allowed, 1,086 blocked, zero allowed barrel penetration or projectile collision. Six actual GameScene muzzle markers match within 1.43e-14 metres. Robot root scale remains 0.55; body guns remain 1.22. Evidence: `artifacts/compact-castle-builder-01/weapons/report.json`.
- 1,137 compact resident/interior checks pass with zero browser errors or external requests. Minimum measured head/hat/body ceiling clearance is 0.1114 carrier-local metres, hand error at most 7.16e-15 world metres and sole/pad gap at most 1.302e-7 world metres. Natural work-surface dimensions match between variants. The prior 80 resident checks also pass. Evidence: `artifacts/compact-castle-builder/residents`.

The builder inspected normal City, reverse, 20-storey and close workshop views. An independent critic takes fresh screenshots of the frozen revision; functional checks are not an AAA art-quality claim. The earlier four-round vertical-construction cycle remains closed at 7.7/10 and its reports are unchanged.
