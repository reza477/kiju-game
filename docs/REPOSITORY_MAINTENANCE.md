# Repository maintenance

The repository [reza477/kiju-game](https://github.com/reza477/kiju-game) is the source backup and development home for **Colossus Wake**. The owner's latest explicit instruction requires public source; this supersedes earlier private-repository instructions. The scheduled maintenance check returns every three days.

On 3 October 2026, the owner explicitly requested uploading and synchronizing completed work, with **Build kaiju city builder prototype** taking priority over this maintenance task for what was implemented and verified. Maintenance mirrors that chat's completed source, reports and actual review results; it does not change gameplay, reopen closed visual passes, reinterpret scores or make release decisions. This request authorizes source backup of the completed environment and foliage commits while their release gates remain failed. A source backup is not permission to promote a playable build.

**Current delivery state: Configured but blocked.** The earlier `codex/playtest` repair passed its recorded Linux/Windows functional gate. Newer environment and foliage work is backed up on `codex/github-stewardship-20260927`; its full frozen installation/update gate has not been rerun. Both visual tasks ended at 7.6/10 after four rounds, and readiness remains false. The legacy source-only private-repository assertion must be reconciled separately. The single protected `PLAYTEST_ORIGIN` serves a generic setup page, not gameplay. [PRIVATE_DELIVERY.md](PRIVATE_DELIVERY.md) and [AGENTS.md](../AGENTS.md) govern delivery; public source does not weaken hosted authentication. Do not change the default branch.

## Sources of truth

- The owner's latest instructions and the main development task, **Build kaiju city builder prototype**, which is authoritative over maintenance interpretations of implementation, completed work, verification and review outcomes.
- The original local game checkout and its Git branches, plus completed work in other game worktrees.
- [AGENTS.md](../AGENTS.md), [private delivery instructions](PRIVATE_DELIVERY.md), [release readiness](../delivery/readiness.json), current game files, version/build identity, verification reports, and independent reviews.
- Live GitHub branch tips, checks, issues, pull requests, and release records.

Read the main task for changed requirements before summarizing a build. Do not copy private conversation transcripts into GitHub. Never treat a historical test result or art score as a new validation run.

## Every three days

1. Confirm the checkout belongs to this game and the remote is exactly `https://github.com/reza477/kiju-game.git`. Verify public GitHub visibility and anonymous source access, alongside authenticated maintenance access. Honor the latest public-source instruction; never restore private visibility merely because an older report or code assertion expects it.
2. Fetch remote refs without changing the active checkout. Compare source commits, stable working changes, release tags, documentation, and relevant task updates with the last successful checkpoint.
3. If nothing material changed, stop quietly. If development is active or files are changing, back up completed commits without disturbing the developer's working tree; defer unfinished files.
4. Inspect the actual outgoing paths for credentials, personal saves, logs, unrelated projects, and accidental generated files. Select explicit paths; never blindly add everything or force-push.
5. For stable uncommitted game work when development is idle, capture a reviewed snapshot in an isolated worktree or temporary index, preserving the original working files, index, and branch. Commit it to a descriptive `codex/` branch. Do not silently label a work-in-progress snapshot as a finished release.
6. Prepare integration in an isolated checkout and preserve both source and maintenance history. Completed eligible implementation follows `codex/playtest`; reconcile divergence explicitly without force-pushing. Run relevant local checks and use the isolated `build:playtest`/delivery verification path described in [PRIVATE_DELIVERY.md](PRIVATE_DELIVERY.md). Never stamp a later documentation commit onto earlier tested bytes.
7. Update README, changelog, roadmap and draft release notes only where supported by the diff and evidence. Maintain existing issues and pull requests instead of creating duplicates. A blocked candidate may be documented in a draft PR to `main`, but must not be merged or deployed. Keep the original Alpha 1 tag and draft milestone's scope intact.
8. Preserve incomplete development as explicitly labelled source backup, not a finished release. Read-only reviews, unfinished tasks, failed required checks and false readiness do not publish. Only an actual passing review or explicit art-only owner exception addresses the visual gate; neither waives functional checks. Keep blockers visible and never rewrite critic findings.
9. Verify pushed commit IDs, repository visibility, check outcomes and any changed release/issue metadata using live GitHub state. Save the checkpoint only after those checks. Report meaningful updates, failures or decisions needed; avoid repeated unchanged status messages.

**Actions usage gate:** September 27 setup verified included-only usage and an existing $0 Actions budget with Stop usage enabled. The workflow requires `PLAYTEST_INCLUDED_USAGE_CONFIRMED=true` before allocating a runner. Preserve those restrictions; historical allowance snapshots are not current balances. Reconfirm included runner/storage/hosting allowances and no paid overages before triggering new cloud checks or delivery. Documentation-only maintenance uses `[skip actions]` and verifies no unnecessary run was triggered. Skipped checks are not passes. Do not dispatch deployment to work around false readiness, spend money or broaden billing/API scopes.

## Branches, versions, and releases

- `main` remains the default branch and maintained Alpha 1 baseline. Do not change the default branch or integrate the currently blocked visual/runtime candidate.
- `codex/github-stewardship-20260927` contains the current source backup, including unchanged development commits `56670b3` (environment materials) and `b30d21d` (foliage assets). Its additional commits reconcile source history and repository documentation only. Share this branch when the owner asks for the newest code; do not represent the older default branch or delivery branch as the latest implementation.
- `codex/playtest` is the authorized private delivery branch. After finished work, passing required gates and verified setup, `npm run handoff:playtest` assists clean-tree fast-forward integration, ordinary push and verification. A divergence requires explicit reconciliation. Later no-push/no-deploy instructions override this default.
- `codex/*` branches preserve individual development efforts. The initial prototype branch remains a historical checkpoint.
- `alpha-1` identifies the existing local Alpha 1 source revision; never move a published tag.
- Draft prereleases can organize an existing milestone's scope, evidence and known limits. A draft is not a public launch or a certification of device readiness.
- Hosting authorization covers only the dedicated protected playtest lane and its verified permanent `PLAYTEST_ORIGIN`. Verify the matching Actions run and actual hosted playable build before reporting it live. The owner's public-source instruction authorizes GitHub visibility, not public deployment, Pages, Vercel deployment-source exposure, paid upgrades, billing changes or credential logging. Licensing grants, collaborator invitations, repository deletion and account-wide changes require separate direction.

## Validation boundaries

Historical Alpha 1 main CI passed its portable tests/package checks. The newer [run 36382922486](https://github.com/reza477/kiju-game/actions/runs/36382922486), source `d556448` and build `af7991973d3ec6fc31ad`, passed 226 units, 12 game groups, 8 transport and 3 startup regressions, synthetic credential confinement and 111 runtime-file checks. Matching Windows game checks passed with the same artifact identity. Its overall conclusion is failure specifically at eligibility; publication was skipped because art remains 6.9/10 overall, 8.4/10 HUD. Subsequent `8230ce1` records evidence and must not replace the tested source identity.

The subsequent [environment report](ENVIRONMENT_POLISH_PASS1_2026-10-02.md) and [foliage report](FOLIAGE_ASSETS_2026-10-02.md) retain their own evidence and limitations. The foliage source records 227 unit tests, 54 carrier cases, 13 interaction/save checks and preservation comparisons after the last runtime edit. Its failed 7.6/10 review is separate from the preceding environment pass's failed 7.6/10 result and the historical iPhone score. The foliage critic's prior technical role is disclosed in the original review. No source-backup merge, later documentation commit or skipped cloud check creates new runtime, art or installation evidence.

Protected placeholder access and generic promotion now have [setup evidence](PRIVATE_HOSTING_SETUP_2026-09-27.md). Actual scoped CI publishing, hosted game A→B, desktop WebKit and physical Apple-device validation remain unexercised. Local touch emulation does not establish Safari, Home Screen, touch latency, thermal or long-session behavior. Keep historical failed reports and [Alpha 1 verification](../ALPHA1_VERIFICATION.md) in their original scope. GitHub source visibility and a protected placeholder do not make the game live.

The delivery and handoff implementations still require private source visibility in `scripts/vercel-delivery.mjs` and `scripts/handoff-playtest.mjs`. Track their conflict with public-source policy as a separate implementation blocker. Do not edit around them during read-only maintenance, bypass readiness, or confuse them with the Vercel deployment-source/access protections that must remain enabled. Actions logs and artifacts are public evidence; the workflow's historical "private verification evidence" label does not confer privacy.

## Local checkpoint

Store automation state in ignored `artifacts/github-maintenance/state.json` in the original game folder. Record the last checked time, original branch/commit, integrated GitHub commit, backed-up refs, relevant source fingerprints, check results and open blockers. A checkpoint is evidence of a successful operation, not a substitute for checking live state. Keep the scheduled prompt's local paths and task IDs up to date if the project is moved.
