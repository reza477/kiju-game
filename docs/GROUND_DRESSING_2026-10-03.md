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

The material and new visual assemblies are bounded to the established southern
riverbank area, x [-65,32], z [-140,-90]. This is not a whole-map rollout. The
previous pilot's carrier, imported tree/rock assets and water treatment remain
in place. Physical terrain, travel rules, controls, picking proxies, resources,
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
upload or publication has been performed by this pass at this checkpoint.

The optional request to use up to 60 existing credits for two further models
requires the owner's answer. Local ground work and code-authored scenery do not
depend on that answer. Existing downloaded private Meshy models remain intact.

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
partly buried shingle and splintered fallen limbs. Geometry is instanced, with
existing local materials and the established wind system for rooted leaves.
The instances are additive render parts of old scenery records; no new save or
destruction identity is introduced. Stones and limbs align to the unchanged
visible ground. No transparent ground overlay or new full-screen effect.

## Evidence in progress

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

Scoped ground tests passed 8/8. The initial complete unit invocation passed
265/266; the existing local outage/policy test encountered ECONNRESET. Its
separate repeat passed 2/2. These original results are retained; further final
checks and the independent review results will be added after they occur.

No push or deployment. Readiness and previous visual/multiple-active-session
save blockers remain in force. Physical Apple devices, Safari, thermals and
the private hosted origin have not been tested by this pass.
