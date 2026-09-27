# Repository maintenance

The private repository [reza477/kiju-game](https://github.com/reza477/kiju-game) is the source backup and development home for **Colossus Wake**. The owner authorized recurring GitHub maintenance on 24 September 2026. The scheduled check returns to the GitHub maintenance task every three days.

**Current delivery state: Configured but blocked.** The owner subsequently authorized a private lane on `codex/playtest` to the single protected origin in `PLAYTEST_ORIGIN`. [PRIVATE_DELIVERY.md](PRIVATE_DELIVERY.md) and the latest [AGENTS.md](../AGENTS.md) supersede earlier hosting proposals. The failed functional and visual gates, false readiness, and unverified account/usage setup prevent publication. Do not change the default branch.

## Sources of truth

- The owner's latest instructions and the main development task, **Build kaiju city builder prototype**.
- The original local game checkout and its Git branches, plus completed work in other game worktrees.
- [AGENTS.md](../AGENTS.md), [private delivery instructions](PRIVATE_DELIVERY.md), [release readiness](../delivery/readiness.json), current game files, version/build identity, verification reports, and independent reviews.
- Live GitHub branch tips, checks, issues, pull requests, and release records.

Read the main task for changed requirements before summarizing a build. Do not copy private conversation transcripts into GitHub. Never treat a historical test result or art score as a new validation run.

## Every three days

1. Confirm the checkout belongs to this game and the remote is exactly `https://github.com/reza477/kiju-game.git`. Confirm the GitHub repository remains private and the authenticated account has access.
2. Fetch remote refs without changing the active checkout. Compare source commits, stable working changes, release tags, documentation, and relevant task updates with the last successful checkpoint.
3. If nothing material changed, stop quietly. If development is active or files are changing, back up completed commits without disturbing the developer's working tree; defer unfinished files.
4. Inspect the actual outgoing paths for credentials, personal saves, logs, unrelated projects, and accidental generated files. Select explicit paths; never blindly add everything or force-push.
5. For stable uncommitted game work when development is idle, capture a reviewed snapshot in an isolated worktree or temporary index, preserving the original working files, index, and branch. Commit it to a descriptive `codex/` branch. Do not silently label a work-in-progress snapshot as a finished release.
6. Prepare integration in an isolated checkout and preserve both source and maintenance history. Completed eligible implementation follows `codex/playtest`; reconcile divergence explicitly without force-pushing. Run relevant local checks and use the isolated `build:playtest`/delivery verification path described in [PRIVATE_DELIVERY.md](PRIVATE_DELIVERY.md). Never stamp a later documentation commit onto earlier tested bytes.
7. Update README, changelog, roadmap and draft release notes only where supported by the diff and evidence. Maintain existing issues and pull requests instead of creating duplicates. A blocked candidate may be documented in a draft PR to `main`, but must not be merged or deployed. Keep the original Alpha 1 tag and draft milestone's scope intact.
8. Preserve incomplete development as explicitly labelled source backup, not a finished release. Read-only reviews, unfinished tasks, failed required checks and false readiness do not publish. Only an actual passing review or explicit art-only owner exception addresses the visual gate; neither waives functional checks. Keep blockers visible and never rewrite critic findings.
9. Verify pushed commit IDs, repository visibility, check outcomes and any changed release/issue metadata using live GitHub state. Save the checkpoint only after those checks. Report meaningful updates, failures or decisions needed; avoid repeated unchanged status messages.

**Actions usage gate:** no workflow execution until remaining included Actions minutes/storage, disabled paid overages and Vercel included usage are verified as specified in the delivery setup. Until then, use `[skip actions]` for authorized backup/documentation commits and verify that no run was triggered; do not dispatch manually. A skipped or absent run is not a passing check. Do not spend money or broaden billing/API scopes to bypass this blocker.

## Branches, versions, and releases

- `main` remains the default branch and maintained Alpha 1 baseline. Do not change the default branch or integrate the currently blocked visual/runtime candidate.
- `codex/playtest` is the authorized private delivery branch. After finished work, passing required gates and verified setup, `npm run handoff:playtest` assists clean-tree fast-forward integration, ordinary push and verification. A divergence requires explicit reconciliation. Later no-push/no-deploy instructions override this default.
- `codex/*` branches preserve individual development efforts. The initial prototype branch remains a historical checkpoint.
- `alpha-1` identifies the existing local Alpha 1 source revision; never move a published tag.
- Draft prereleases can organize an existing milestone's scope, evidence and known limits. A draft is not a public launch or a certification of device readiness.
- Hosting authorization covers only the dedicated protected playtest lane and its verified permanent `PLAYTEST_ORIGIN`. Verify the matching Actions run and actual hosted build before reporting its permanent link/build. No public deployment, Pages, paid upgrade, billing change, credential logging or other-project change is authorized. Repository visibility changes, licensing grants, collaborator invitations, repository deletion and account-wide changes require separate direction.

## Validation boundaries

Historical Alpha 1 main CI passed its portable tests/package checks. The candidate workflow adds frozen packaging, a required browser-delivery gate, protected staging and exact-build promotion; that Linux delivery workflow has not run. Its final local gate failed at 3/11 groups in Chrome 154 and 0/11 in pinned Chromium 151, despite 179 unit tests and 110 frozen runtime checks passing. The latest iPhone visual gate is also failed at 6.9/10 overall, 8.4/10 HUD. Neither zero console errors nor a separate offline pass clears these blockers.

No hosted A→B, real protection, desktop WebKit or physical Apple-device validation exists. Local touch emulation does not establish Safari, Home Screen, touch latency, thermal or long-session behavior. Use [current evidence](PRIVATE_DELIVERY.md) and [the roadmap](ROADMAP.md); retain historical [Alpha 1 verification](../ALPHA1_VERIFICATION.md) in its original scope. GitHub source backup does not make a game live.

## Local checkpoint

Store automation state in ignored `artifacts/github-maintenance/state.json` in the original game folder. Record the last checked time, original branch/commit, integrated GitHub commit, backed-up refs, relevant source fingerprints, check results and open blockers. A checkpoint is evidence of a successful operation, not a substitute for checking live state. Keep the scheduled prompt's local paths and task IDs up to date if the project is moved.
