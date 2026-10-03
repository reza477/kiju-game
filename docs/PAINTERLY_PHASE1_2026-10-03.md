# Painterly dark-fantasy migration, phase 1

Work in progress; local implementation only. Starting checkpoint is the clean
`8320a432b0ce27fbe73eccd32a0b88120cd091ab` on the retained residual-stutter worktree.
An isolated managed worktree and `codex/painterly-phase1-20261003` branch preserve
that revision, other worktrees, and their uncommitted instruction/report edits.
The baseline runtime/dependency fingerprint is
`1800758d8fb1c1a50b84ebf8f6f06c8b3f0876a97d49c7f37644b442448c8e49`.

## Migration map and provisional adoption budgets

- Retain terrain and water vertices, world generation/random sequence, anchors,
  destruction IDs, simulation, proxies, carriers, lighting presets, controls,
  mobile presentation, save schema, offline delivery and bounded preparation.
- Replace foliage spray shapes and cutouts with deterministic sculpted volumes
  and grouped blades. Consumers: near/distant landscape, resource groves, ruin
  growth, shrubs, debris; retain shared wind/depth/distance paths and ownership.
- Replace photographic ground compositing with broad habitat color masses and
  restrained local grain. Remove the obsolete ground scan requests/compositor;
  retain scans used by carriers, bark, masonry and other live consumers.
- Adapt water palette/current shading and damp bank/rock contacts using the
  actual terrain channel data. Retain its physical surface and traversability.
- Adapt geological surfaces and existing ruin materials; retain footprint,
  structural geometry, resource association and metal preparation representative.
- Defer carrier restyling, whole-world bespoke composition, new resources,
  game design and hosting. Historical material/foliage 7.6 FAILED reviews remain
  closed; this task has a separate four-round independent review limit.

Before adoption: aim for no more than +20% whole-scene submitted triangles,
+5% draw calls, +8 MiB estimated texture residency, +2 MiB runtime download,
+10% initial loading, and +10% warmed callback/GPU p95 in matched profiles.
These are investigation thresholds, not fabricated guarantees or permission to
lower the existing detail/resolution. Repeated new candidate-only >50ms movement
callbacks and unbounded resource growth require investigation. Retain every run.

Blender was absent from PATH, its standard installation folder, uninstall
registry entries and common application directories. No installation requested
or performed. Alternate local editable geometry authoring and repeatable glTF
export/validation avoid an asynchronous runtime loader and added dependencies.
Runtime uses the same pinned Three 0.185.1 instance and synchronous shared kit.

Functional tests preserve terrain, anchors, simulation, proxies, save/damage and
mapping. Only explicitly authorized environmental appearance goldens may change.
Final source must be frozen before complete QA, matched native benchmarks,
packaged update/offline/rollback checks and the final review captures.
