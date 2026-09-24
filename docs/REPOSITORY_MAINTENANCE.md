# Repository maintenance

The private repository [reza477/kiju-game](https://github.com/reza477/kiju-game) is the source backup and development home for **Colossus Wake**. The owner authorized recurring GitHub maintenance on 24 September 2026. The scheduled check returns to the GitHub maintenance task every three days.

## Sources of truth

- The owner's latest instructions and the main development task, **Build kaiju city builder prototype**.
- The original local game checkout and its Git branches, plus completed work in other game worktrees.
- [AGENTS.md](../AGENTS.md), current game files, version/build identity, verification reports, and independent reviews.
- Live GitHub branch tips, checks, issues, pull requests, and release records.

Read the main task for changed requirements before summarizing a build. Do not copy private conversation transcripts into GitHub. Never treat a historical test result or art score as a new validation run.

## Every three days

1. Confirm the checkout belongs to this game and the remote is exactly `https://github.com/reza477/kiju-game.git`. Confirm the GitHub repository remains private and the authenticated account has access.
2. Fetch remote refs without changing the active checkout. Compare source commits, stable working changes, release tags, documentation, and relevant task updates with the last successful checkpoint.
3. If nothing material changed, stop quietly. If development is active or files are changing, back up completed commits without disturbing the developer's working tree; defer unfinished files.
4. Inspect the actual outgoing paths for credentials, personal saves, logs, unrelated projects, and accidental generated files. Select explicit paths; never blindly add everything or force-push.
5. For stable uncommitted game work when development is idle, capture a reviewed snapshot in an isolated worktree or temporary index, preserving the original working files, index, and branch. Commit it to a descriptive `codex/` branch. Do not silently label a work-in-progress snapshot as a finished release.
6. Integrate completed work with the current remote `main` in an isolated checkout. Preserve GitHub documentation/CI and the source branch history. Run `npm ci --ignore-scripts`, `npm test`, and `npm run build:mobile` when source or build inputs change. The generated `src/build-info.js` must match the committed runtime.
7. Update the README, changelog, roadmap and draft release notes only where supported by the actual diff and evidence. Maintain existing issues and pull requests instead of creating duplicates. Use a pull request for ongoing integration and verify GitHub checks before merging an eligible update into `main`.
8. Source backups may include clearly labelled incomplete development. A visual update must satisfy the owner's independent review gate before it is described as visually approved. Do not rewrite a critic's report, silently waive an unresolved gate, or merge an unreviewed visual update as ready for release. A blocked candidate stays on its backup branch or draft pull request.
9. Verify pushed commit IDs, repository visibility, check outcomes and any changed release/issue metadata using live GitHub state. Save the checkpoint only after those checks. Report meaningful updates, failures or decisions needed; avoid repeated unchanged status messages.

## Branches, versions, and releases

- `main` is the maintained integration branch. The initial September 2026 setup records Alpha 1 as a development baseline with its existing failed art gate explicitly disclosed.
- `codex/*` branches preserve individual development efforts. The initial prototype branch remains a historical checkpoint.
- `alpha-1` identifies the existing local Alpha 1 source revision; never move a published tag.
- Draft prereleases can organize an existing milestone's scope, evidence and known limits. A draft is not a public launch or a certification of device readiness.
- Publish or change the visibility of the game, enable Pages, deploy a hosted build, grant an open-source license, spend money, invite collaborators, delete repositories, or change account-wide settings only when separately requested. Routine private commits, pushes, documentation, issue maintenance, checks, and eligible integration are within this maintenance role.

## Validation boundaries

GitHub Actions runs the portable Node tests and builds the offline package. It does not certify WebGL screenshots, physical iPad/iPhone performance, Safari, touch latency, thermal behavior or long-session stability. Consult [Alpha 1 verification](../ALPHA1_VERIFICATION.md) and [the roadmap](ROADMAP.md) for those limits.

The game remains locally playable. GitHub source backup is separate from mobile hosting and runtime services. [Mobile playtest instructions](../MOBILE_PLAYTEST.md) describe the separate hosting decision.

## Local checkpoint

Store automation state in ignored `artifacts/github-maintenance/state.json` in the original game folder. Record the last checked time, original branch/commit, integrated GitHub commit, backed-up refs, relevant source fingerprints, check results and open blockers. A checkpoint is evidence of a successful operation, not a substitute for checking live state. Keep the scheduled prompt's local paths and task IDs up to date if the project is moved.
