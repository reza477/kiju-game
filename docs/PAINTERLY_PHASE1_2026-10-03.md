# Painterly dark-fantasy migration, phase 1

**PAUSED at the owner's change of approach to the Meshy pilot.** This working
report is preserved; it is not a completed final handoff. See
`MESHY_PILOT_CHECKPOINT_2026-10-03.md` for the exact completed checks, remaining
work and preserved source at the pause. The broad art revamp must not resume
automatically.

Local implementation only. Starting checkpoint is the clean
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

## Frozen implementation

Reviewed art implementation commit: `e00a68b1cab033851e229079ebd087b1bef5264d`.
Its pre-repair runtime/assets/dependency fingerprint:
`748537109ba517b50d82e22cca60acb9d3bbe6c230fcea3046636360c92393fb`.
Final technical runtime commit: `cd2e582e844870fa1515990a88d8d5a22d4b020d`.
Final runtime/assets/dependency fingerprint:
`3e9b10953ecb9a7a4cd3045d4ab18109db8cde72c955a21a7c4f6e85050acd53`.
Only `src/scene.js` changes runtime bytes after the reviewed art commit: the
bounded first-use preparation repair detailed below. Every artwork, geometry,
material, shader source, palette and lighting preset retains its e00 bytes.
Reversible baseline branch: `codex/checkpoint-painterly-phase1-8320`.
The implementation branch is `codex/painterly-phase1-20261003`; the original
checkout, other worktrees, instructions and personal browser saves are preserved.

The shared tree, grass, rock, ground and water families apply globally, including
resource-site greenery, near/distant render paths and existing destruction pools.
The focused composition and independent art review cover the starting crawler's
river/woodland and Broken Meridian approach. Other regions have not received a
bespoke composition pass. Carriers, UI, light presets and rendering resolutions
are unchanged.

- Water now uses a restrained teal palette, moving directional marks and local
  inside-bend shallows. Bank contact uses the actual terrain bank/channel data.
- Ground uses broad meadow, soil, litter and damp regions with quiet fine grain.
  The fourth round removed the third round's rejected camouflage-like overlay.
- Pine uses sixteen separate closed tapered boughs attached to a narrow core.
  Broadleaf uses four primary masses with smaller connected edge clusters.
  Ground cover uses physical curved blades and grouped visual prominence; roots,
  instance placements and functional/damage identities remain the originals.
- Rocks have bedded fractured shapes and restrained mineral/wet-contact shading.
  Ruins use weathered variants of existing shared masonry maps. Their structural
  silhouette and resource-metal preparation representative remain unchanged.

Final whole-tree triangles: pine 944 near / 668 distant; broadleaf 1,024 / 800.
The preserved build used 1,248 / 648 pine and 1,284 / 648 broadleaf. This exchanges
some distant cost for consistent near/far tree identity; whole-scene costs are
measured separately. Grass is 24 triangles per tuft. The six reproducible GLB
workshop outputs total 261,180 bytes and pass exact pinned-loader round trips.
They are not runtime downloads: the game directly uses the same synchronous
editable geometry source. No Blender installation or external service was used.
The final Node 24.18.0 workshop validator resolves the official pinned loader's
bare Three import to the runtime vendor module and verifies constructor identity;
this process-local hook adds no browser loader or extra renderer instance.

Removed runtime consumers are `src/meadow-surface.js`, its scene call and six
unused photographic grass/soil files. Source attribution is retained in
`asset-sources/retired-ground-scans.json`, Git and complete release A. All other
live scan families remain. No old scenery is rendered beneath the replacements.

The independent source audit found no concrete protected-behavior or ownership
regression. A maintenance caveat remains: ruin-rubble's masonry map hook takes
precedence over the general bank-rock albedo hook; its metric UV and roughness
logic still compose. This is recorded, not presented as a gameplay defect.

## Independent visual gate

This new task used four rounds: 6.6, 6.8, 6.7 and 7.0 out of 10. Final result:
**FAILED**, below the unchanged 8.5/zero-error requirement. No fifth art attempt.
Remaining issues include broadleaf mass quality, weak ground material identity,
and incomplete bank/geology/ruin integration. A 7.0 reference-area score is not
whole-game approval. Both historical 7.6 FAILED material/foliage reports remain
closed and unchanged; delivery eligibility remains false.

The critic captured its own normal-HUD views and native desktop/phone-emulated
travel recordings. The last round's first capture had an inventory race when a
local commit moved new source files from untracked to tracked; it is retained as
failed evidence. A fresh unchanged-commit capture in `painterly-verified` passed
source parity. Recorded-motion frame inspection cannot rule out every brief
shimmer or pop. Physical Apple hardware and Safari remain untested.

## Verification and measured costs

Before the narrow first-use correction below, 240/240 unit tests and all 14
strict preservation groups passed on the reviewed e00 art implementation.
Their pre-commit revision label is retained: the logged source fingerprint links
their exact bytes to the implementation commit rather than rewriting evidence.
All 54 carrier/quality/light combinations and 13 interaction/save groups passed.
All nine lifecycle groups passed across 35 snapshots: repeated Continue, quality
and carrier changes, borrowed resource ownership, context loss/recovery, and both
phone orientation changes. Errors were zero; two precision warnings were retained.
That revision prepared two persistent debris references and one borrowed
current resource-site metal mesh, released before site-owner disposal.

The first smoke invocation appended a slash to an already slash-terminated URL,
requesting `//?test=1` and receiving 404. That failed execution and screenshot are
retained. Correcting only the invocation URL produced the full 13-group pass;
no runtime or assertions were changed to make it pass.
Native paired timing and packaged-browser results are recorded separately below.

The unchanged native first-use harness alternates three A/B visits per profile,
four real-input 60 m routes per visit. It retains first-use and warmed Begin and
Continue routes, native state/time differences, all outliers and GPU availability.
No artificial settling, lower resolution, hidden travel or forced phone High
preset was substituted. Windows Chrome measurements are not Apple-device data.

The pre-repair desktop's three pairs stayed within the adopted aggregate cost thresholds.
For warmed Begin, median-of-three callback p95 was 12.1 -> 11.6 ms and GPU p95
5.890048 -> 5.709824 ms. Warmed Continue was 11.6 -> 11.9 ms callback and
6.107136 -> 5.972992 ms GPU. Submitted triangles increased about 6.3%, with
about 2% fewer draws. Navigation-to-UI-ready medians were 19,873 -> 20,456 ms
(+2.93%). One individual warmed GPU pair increased 10.08%; it is retained,
not discarded because the aggregate was below threshold. All 24 desktop routes
had no callback/GPU samples over 50 ms. Both builds retained their approximately
100-110 ms initial RAF gaps. Warmed shader counts were stable; candidate program
variety was higher (101-103 versus 94-95) but did not grow during warmed travel.

The complete pre-repair matrix is retained under `artifacts/painterly/paired`
(18 visits, 72 routes; protocol execution passed). Its portrait result exposed
a real performance regression: each of the three B Begin-first routes had four
161-166 ms callbacks, whereas all three A equivalents had none above 50 ms.
Each stall added one of the new ruin programs. A separate attribution trace
(`ruin-stutter-before-trace`) reproduced all four and directly timed
`getProgramInfoLog` in Three's first-use uniform setup at 153.8, 153.7, 152.7 and
152.1 ms for ruin rubble, instanced brick, ordinary cap stone and pavement.
The trace is diagnostic, not a low-overhead benefit benchmark. Original raw
records and the unfavorable matrix remain unchanged.

This requires a narrowly scoped technical correction to the migration's own
new cost: prepare those four exact current ruin material/mesh shapes through
the existing mechanism. No art/material/geometry change or fifth visual review
is authorized or intended. Final-source repeated measurements and renewed QA
are recorded below after the correction; the e00 results above are not silently
relabeled as final-source tests.

The correction is now frozen in `cd2e582`. It retains the original persistent
two debris references and borrowed site metal, then borrows four exact live
ruin representatives after real site batching: instanced rubble and brick,
ordinary cap stone and pavement. The maximum is seven total, with no clones,
extra draw, simulation advance, hidden travel or asynchronous readiness wait.
All five borrowed references are dropped before owner disposal and reacquired
from the rebuilt sites. A cached ordered material-identity key avoids redundant
same-configuration Continue preparation while retaining quality, light,
environment and context invalidation. The compile primitive is unchanged.

Independent source review found no concrete defect in this narrow repair.
Nine targeted resource-ownership tests passed. A first low-overhead portrait
benefit visit on the committed source had first-route maximum 17.7 ms and zero
callbacks above 50 ms across all four routes. This single benefit observation
is supplementary; the repeated final A/B matrix below establishes repeatability.
Full final-source unit and strict preservation suites passed again (240 tests
and 14 groups respectively).

Both isolated detached release checkouts built cleanly without writing generated
build information into source. A (`8320a43`) is `83321026fabf2f1df4ba`,
33,699,847 runtime bytes; B (`e00a68b`) is `26ab9ed530aebefbbb68`, 27,434,210
runtime bytes. The reduction is 6,265,637 bytes. Exact inventories and protected
simulation, terrain, layout, controls, saves, updater, worker and app manifest
bytes passed verification. A build is not an installation or deployment result.

## Save/update evidence boundary

The unrestricted multiple-active-game save-preservation gate failed. In the
first packaged run, both open games still ran baseline A when an interrupted B
download left the shared save equal to the second A session's slightly newer
snapshot (+0.3001 seconds). This run did not demonstrate lost progress. A second
run opened a temporary offline A Continue session; its later saved state was
then replaced by the original paused caller's older snapshot (-0.3201 seconds)
when that caller used the normal Save and update action. Both exact failures
are retained with the values and original report hashes.

Unchanged production save logic has separate in-memory sessions writing one
localStorage key, including periodic autosave while paused and page exit hooks.
This is a demonstrated existing competing-writer limitation, not evidence that
new art broke serialization. The intended conflict-resolution policy needs a
separate owner-authorized technical task; this art migration changes no save
behavior. No caches, workers, personal profiles or saves were cleared to pass.

A separate narrower harness uses one gameplay writer and a title/preview peer.
The first such attempt expected that title peer to remain on A after activation,
but the unchanged updater intentionally reloads a visible title page to B. That
failed expectation and command are preserved. A title page reloading to B is
not proof that an active A expedition retains A bytes after B activates. The
final controlled results below cannot clear the unrestricted multi-session
failure or establish that unperformed post-activation active-old-game check.

The final controlled run passed all ten groups, exit 0, from
2026-10-03T23:37:25.602Z to 23:40:45.622Z. It exercised actual packaged A install,
a rich cyborg save with vertical construction/upgrades, resources and saved
destruction, Continue, an interrupted B module download, offline A, complete A
file verification during B download, B activation with exact caller-save
preservation, B progress/save/reopen, B offline with the server actually stopped,
all 105 B precache files, and rollback to A with compatible saved progress.
The title peer's actual automatic reload to B is recorded. No active A gameplay
peer remained through B activation in this successful scoped run. Browser,
context and local server cleanup all completed. The final report is
`artifacts/painterly/release-browser-single-writer/results.json`, SHA-256
`5ce618d881b6829f80e1ce466ab28f00c3a926b35cfebccdeb0dd42b8d1e960e`.

Overall migration release verification remains **BLOCKED**, regardless of
scoped installation/offline/rollback results. Existing delivery eligibility is
unchanged; the independent art gate also remains failed.

No push, merge, hosted deployment, account/billing change, external upload or
release-gate override is authorized or performed. The task stops here for owner
judgment after the final evidence package; broader world/content work is deferred.
