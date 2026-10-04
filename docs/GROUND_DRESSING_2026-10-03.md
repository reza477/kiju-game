# Ground surface and scenery dressing

New owner request: improve boring, empty ground and create fitting scenery.
This is a separate visual update after the closed Meshy pilot. It does not
reopen, relabel or waive that pilot's four reviews (final 7.4/10, failed).

## Preservation and scope

The latest actual source was the clean implementation worktree
`C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`, commit
`7c1496f8dc63522a55384d27e7c22e230bc5ded3`. The older primary folder on
`codex/playtest` was not substituted for it; its uncommitted AGENTS.md was left
alone. No Website file was changed.

Before runtime edits, local branch
`codex/checkpoint-before-ground-dressing-20261003` retained that exact commit.
Implementation uses `codex/ground-dressing-20261003`. A detached managed baseline
checkout at `C:\Users\user\.codex\worktrees\ground-dressing-baseline\Kiju Game`
serves the same recorded revision at loopback port 4216. Candidate port 4214 and
isolated critic port 4215 serve the actual implementation worktree.

The authored material atlas remains in the established southern riverbank area,
x [-65,32], z [-140,-90]. Following the new request and round-1 criticism, a
second, lightweight packed turf treatment reaches the central playable valley,
and additional scenery attaches to a capped selection of old anchors within
x/z [-180,180]. This is not a rewrite of the 1,200 m terrain or distant backdrop.
The previous pilot's carrier, imported tree/rock assets and water treatment
remain in place. Physical terrain, travel rules, controls, picking proxies, resources,
collision sizes, world IDs, save format and construction behavior are unchanged.
The new decorative assemblies attach to existing tree/rock destruction records.

## Meshy finding and asset provenance

Meshy's official pages disagree about seamless material generation. The help
article at https://help.meshy.ai/en/articles/16102795-how-to-create-seamless-pbr-textures-with-meshy
describes prompts for tileable materials, while its tutorial at
https://www.meshy.ai/tutorials/pbr-texturing-with-meshy explicitly says model
texturing is baked to model UVs rather than infinitely repeating terrain tiles.
Neither statement proves a particular generated tile will have matching edges.
The current ground therefore uses reproducible, locally authored material data.

The account was accessible through the ordinary Meshy browser UI. A separate
temporary workspace tab was read and closed without a generation or account
change. A user-owned Meshy agent tab was left alone. Credit values observed on
those pages changed while the user's separate job ran; those changes are not
charges for this task. No new Meshy job, purchase, subscription change, model
upload or publication was performed by this pass.

The earlier optional request to use up to 60 existing credits was not exercised.
This completed ground pass uses local code-authored scenery and the preserved
existing private Meshy models. The later oil-field/mineral-hill request is a
separate asset task; no result or permission from that task is claimed here,
and it does not reopen this pass's four-round art gate.

## Implementation

Two deterministic, non-repeating 1024 by 512 PNG maps provide soil, worn grass,
tree-root litter, bank shingle, optical slopes, roughness and small cavities.
`scripts/generate-ground-patch.mjs` regenerates them using Node's built-in
libraries only; `--check` checks exact encoded bytes. PNG Sub filtering is
lossless and the generator verifies decoded bytes against its source arrays.
The two maps total 1,354,485 bytes; RGBA mip storage is approximately 5.33 MiB,
an estimate rather than a measured GPU allocation. Startup preloads the two
maps concurrently with the existing Meshy preload. A shared page cache owns
them. No terrain displacement, additional ground draw or per-frame CPU work.

The first local scenery kit adds modeled curled woodland leaves, angular
partly buried shingle and splintered fallen limbs. The third builder attempt
also adds a small chipped masonry assembly with unequal courses, fallen blocks
and moss at its base. These are decorative remains, with no building, cover or
resource behavior. Geometry is instanced, with
existing local materials and the established wind system for rooted leaves.
The instances are additive render parts of old scenery records; no new save or
destruction identity is introduced. Stones and limbs align to the unchanged
visible ground. No transparent ground overlay or new full-screen effect.

The wider ground detail packs curled blade strokes, compact soil clods and
optical slopes into unused channels of the existing 256-square ground texture.
It preserves the historical red grain channel and does not alter the separate
river texture or shader. Ten unequal turf colonies provide visible groups and
negative space. Added relief fades across 170–185 m; the existing sample's grain
frequency then blends continuously back to the original coordinates across
185–205 m. No additional GPU texture storage, draw, geometry or fragment sample
is required for this wider treatment. Construction makes a temporary 256 KiB
copy. The local atlas still has its separately stated two-map cost.

Added scenery uses deterministic owner-specific hashes rather than consuming
the old world-generation random stream. Road/resource/start clearances remain
open. Up to 56 additional owners supplement the pilot. Wind batches use the
existing spatial partitioner; static parts use 64 m cells, so off-screen parts
can be culled while canonical saved instance addresses remain unchanged.

Final CPU inventory: 79 owners, 654 leaf rosettes, 390 shingle pieces, 30 fallen
limbs and 11 masonry remnants (1,085 instances, 72 render cells, 67,488 additional
world triangles before camera/shadow culling). These are constructed-world
counts, not the measured screen cost. Scene-traversal memory counts exclude
retained off-scene canonical instance arrays and JavaScript placement records.

## Final source and visual evidence

Final runtime commit: `f1c2541e7e430e1f6fdfbe00fbd2bf7245bf36a0`.
Runtime/assets/dependency fingerprint:
`dee57c47ba1f50d5f9c4c217b7802fd788721ff9b36aa259aecde4752654a760`.
Baseline fingerprint:
`117f26eb80ccc913e88522553fd907ff62949be12fb4c89b350dda3832b14fca`.
Later test/report commits do not change those runtime bytes.

All new evidence is under `artifacts/ground-dressing/`; the completed pilot's
captures, performance results and 20-file handoff remain untouched.
Five fresh BEFORE screenshots completed against the frozen baseline, ordinary
gameplay HUD visible. They include desktop normal/reverse/close and both phone
orientations (Windows Chrome emulation, not physical devices).

The first candidate capture attempt failed because the candidate server was
not running (fetch failed). No game loaded and no successful render was
claimed. After starting the correct server, all three desktop views completed.
That intermediate material had overly regular pale flecks; the builder refined
their density, shape and palette before independent round 1.

Scoped initial ground tests passed 8/8. The initial complete unit invocation passed
265/266; the existing local outage/policy test encountered ECONNRESET. Its
separate repeat passed 2/2. A subsequent serial complete run passed 266/266 on
the first builder's source. These original failures and repeats are retained.

The final exact comparison preserved all 1,665 scenery anchors, 647 original
render meshes, 14,641 terrain sample locations and six faction/variant save
roundtrips. It exercised every old destruction ID in both expedition and battle,
checked all new parts against their declared owners, and restored their exact
matrices on reset. Browser contexts loaded local assets but deliberately created
no GPU renderer for this identity check. It is not a visual/performance claim.
All IDs were exercised in 36 bounded groups, not as 1,665 independent single-ID
destruction tests. Group comparisons cannot by themselves rule out an ownership
swap within one group. Read-only source review found no such swap: new contiguous
render ranges attach directly to each existing record and are remapped through
the established spatial slots.
Five final GPU gameplay captures passed separately on the final runtime.
`builder-round4/report.json` and `identity-final/report.json` both
started before the final runtime was committed (HEAD was e2a9a2a); their recorded
start/end runtime fingerprints exactly match f1c2541. They are not relabelled as
having run at a later commit. The final five original screenshots are reused
without another game/capture run merely for packaging.

Independent review history for this new update: round 1 at
4b56c1135f002c3ce1665f4a544535d580ce8d2b scored 7.3; round 2 at
92c677a2e1decdde8c185a6c5199d6398c451658 scored 7.5. Both failed the fixed 8.5
gate. Their ranked issues drove wider coverage, medium-scale grouping and the
small masonry kit. Round 3 at e2a9a2aae7a5351f94ddf8aedbefeb12af6e7bfc scored
7.6; round 4 at f1c2541e7e430e1f6fdfbe00fbd2bf7245bf36a0 scored 7.7.
All four reviews FAILED. No fifth round or further runtime edit was made.
The critic owns its scores and reports. Final shortcomings are soft broad
ground materials, small scenery losing definition at normal/mobile zoom, and
uneven overall finish. No confirmed new visual/rendering defect was identified;
that does not make the aesthetic gate pass.

Round 4 includes 12 independently captured HUD screenshots and 415.265 seconds
of varied wall-clock exploration with 414.575 seconds of native simulation,
including actual forest and Foundry gathering. Earlier browser timing/input
problems and a timeout are retained in that review. Normal timing resumed after
the critic brought its own tab to the foreground; this observation alone is not
proof of the cause. A later stationary interval is excluded from exploration.
Both phone layouts were emulated, with no physical Apple-device claim.

## Technical verification

The first final serial suite passed 270/271 and reproduced ECONNRESET in the
existing header-policy outage test. A transport trace demonstrated reuse of an
old Node fetch socket after close/resume, before its close event was processed;
the resumed server received no request. Test-only commit
`d7ff877df535542d23d626bbb0cf8d2f143655aa` requests Connection: close in that
header-policy test. No retry, sleep, server-helper or game behavior was changed.
The repaired diagnostic passed eight outage cycles with 24 distinct sockets;
the focused existing policy/server tests passed 5/5. Original failures remain
in the evidence. The complete final serial suite then passed 271/271, exit 0,
at d7ff877 with the unchanged final runtime fingerprint. Lifecycle verification
passed 9 groups, exit 0: native movement/destruction, quality changes, three
Save/Continue cycles, cyborg/drill choices, forced renderer context restoration,
and both portrait/landscape transitions. It preserved saved bytes and persistent
resource identities. Resize timing outliers remain recorded; functional success
is not a claim of stutter-free performance.
Ordinary-control functional checks then passed on desktop, phone portrait and
phone landscape emulation (three profiles, exit 0), with native controls and
unchanged simulation time. Their exact individual checks remain in
`functional-verified/report.json`.
The matched varied-route collection passed all 36 windows on the final source:
three profiles, baseline/candidate, three distinct routes and first/repeat
traversals. Collection success verifies the protocol and retained conditions;
it is not an optimization, physical-phone or release acceptance. Our automated
GPU jobs were serialized. Driver/OS caches and unrelated machine activity were
not controlled, and native simulation time/positions can differ slightly.

The full six-stage sequence completed at d7ff877 with exit 0 and stable final
runtime fingerprints, in 2,235.294 seconds. The original diagonal regression
completed one A/B pair per profile (six visits, 24 windows); it is not three-pair
statistical evidence. Resource inventory completed all six A/B/profile visits.

## Measured performance and cost

Windows Chrome 154.0.8037.95 used the actual RTX 4070 Ti SUPER through D3D11.
Desktop used 1440x960, High, renderer pixel ratio 1.25. Phone views used 390x844
and 844x390, Performance, renderer ratio 0.85. These are desktop emulations.
The three varied routes are woodland west/east, the rocky shoreline bend, and
the Foundry approach; each was traversed first and then repeated in-session.

- All 36 varied-route windows recorded RAF median 10 ms and p95 about 10.1 ms.
  Both desktop builds retained three first-traversal intervals above 100 ms,
  including a roughly 240 ms Foundry hitch. Neither desktop warmed aggregate
  had an interval above 50 ms. No phone-emulated varied-route interval exceeded
  50 ms on this PC. This is not proof of equivalent physical-phone performance.
- The separate old-diagonal desktop Continue-first window had p95 19.9 ms in B
  versus 10.1 ms in A. That slower observation is retained, not treated as a
  performance pass. One paired visit cannot establish statistical significance.
  Other old-diagonal windows had p95 about 10.1 ms. First-response, callback,
  GPU query, maximum and missing-sample results remain separate in the summary.
- New-minus-old median draw counts across varied route windows range from
  +7 to +22. GPU p95 changed in both directions; missing phone query samples
  are explicitly counted. Candidate portrait/landscape omitted 450/472 frame
  samples because earlier queries remained pending; every issued query
  completed, with no disjoint, focus-loss or context-loss event. No general
  claim of faster rendering is justified.
- First-traversal main-callback p95 changed from 10.9 to 11.1 ms on desktop,
  8.7 to 8.6 ms in portrait and 9.2 to 9.4 ms in landscape. Main-callback wall
  time is distinct from pure CPU work and GPU query time. Both builds recorded
  two shader precision warnings per route visit; their error lists were empty.
  These warnings are preserved rather than described as a warning-free run.
- Each profile added 181,412 bytes (about 177 KiB) of scene-reachable geometry
  buffers and 5,592,408 bytes (about 5.33 MiB) of estimated texture storage.
  The geometry inventory excludes retained off-scene canonical arrays and
  placement objects; neither number is measured total CPU/driver memory.
- Single ordinary-Begin snapshots added 35 desktop draws and 40,536 triangles,
  13 portrait draws and 19,472 triangles, and 34 landscape draws and 39,912
  triangles. These camera-dependent observations differ from the full-world
  construction totals and the moving-route ranges above.
- Encoded response bodies increased by 1,376,927 bytes with five additional
  local requests. One inventory observation per profile reached its playing
  environment about 0.80, 0.98 and 0.98 seconds later for desktop, portrait and
  landscape respectively. This includes browser orchestration and ordinary
  title/Begin work, not an isolated or repeated loading benchmark.

`performance-final-summary.txt` and its JSON retain exact measurements,
conditions, command/exit evidence, native-state differences and raw-report
hashes. No previous pilot measurements substitute for this pass's results.

Frozen A and B build/integrity verification passed. A build
`cd1c1f28b6100151c11b` contains 35,855,558 bytes; B build
`8615ac6b527989f7defa` contains 37,232,485 bytes, an increase of 1,376,927 bytes.
These are local release artifacts, not deployment. The first browser invocation
stopped before checks because the bundled headless browser was absent. No
software was installed. The explicit installed-Chrome attempt passed the first
three checks: complete A installation and pinned-file inventory, a rich cyborg
save, and A reload/Continue plus the old title-only peer. It then failed check 4
because the intended ground-relief interruption was never exercised. The sole
B request was `/release.json`; no B service worker or visual asset was fetched.

Evidence-only test commit `88c1ac5dc132684c0f4510d98cef48250ad85aae` recorded the
returned update status, its timestamped transitions, registration/controller
states and phase-local requests before the unchanged fault assertion. It added
no retry, delay, longer timeout, cache deletion, worker unregister or runtime
change. The fresh diagnostic attempt failed at the same check. Metadata
succeeded, the status changed to `installing` at 155.6 ms, and the unchanged
`reg.update()` operation hit its existing 90-second limit. The returned message
was “The update check timed out.” Node wall elapsed time was 90,189 ms; only
B `/release.json` reached the server. A's worker/controller remained activated,
with no waiting/installing worker before or after. Its returned status still
reported A available offline and no applicable update. Actual offline
reopening after this failure was not reached and is not inferred from status.

This narrows the failure to the inherited native worker-update stage before B
runtime loaded; it does not establish the underlying Chromium stall's cause.
The frozen A/B offline module and metadata-worker bytes are identical, and the
service-worker template/server helper are unchanged. The update failure remains
open. No inherited delivery behavior was repaired or waived in this visual
pass. The intended interrupted-texture, complete B update, B offline reopening
and rollback checks are **unverified**, not passed. Historical pilot results
cannot replace those missing current-build results.

| Recorded attempt | UTC start–finish, 2026-10-04 | Exit / result |
| --- | --- | --- |
| `final-qa-verified` | 05:22:10.348–05:59:25.642 | All six child stages exit 0; orchestration report passed |
| `release-build-final` | 04:55:31.907–04:55:36.954 | 0; local frozen A/B integrity passed |
| `release-browser-final` | 05:17:56.842–05:17:57.497 | 1; browser executable absent before checks |
| `release-browser-chrome-diagnostic` | 06:00:02.530–06:02:30.922 | 1; three checks completed, update timeout before intended fault |

The first installed-Chrome failure is retained separately in
`release-browser-chrome-final/results.json` and its execution wrapper. Exact
commands, environments, timestamps, exit codes, source fingerprints, warnings
and previous failed unit/diagnostic attempts are retained in the selected raw
reports and logs. The before-capture report has no saved process exit field;
the handoff labels that field **NOT RECORDED** instead of inferring it from a
successful image capture. Packaging only copies existing final-source images
and source/evidence; it does not rerun the game or reinterpret failed gates.

No push or deployment. Readiness, the final 7.7/10 failed art gate, the current
update failure and prior unrestricted multiple-active-session save blockers
remain in force. Physical Apple devices, Safari, thermals, battery use,
long-session stability and the private hosted origin were not tested here.
