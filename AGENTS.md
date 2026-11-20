# GitHub is the shared home for the Mac and the PC

Recorded on 20 November 2026 from that day's development session on the Mac. The decision was given in that session and is not recorded in Reza's own words; if Reza decides otherwise, his later instruction governs.

**Development is shared.** Claude on the Mac and Codex on the Windows PC both develop the game, each building on the other's commits. This replaces "the game is no longer developed with Codex on the Windows PC" in the 13 November record below. The rest of that record stands.

**The meeting point is one branch:** `codex/kaiju-art-remake-20261020` at `https://github.com/reza477/kiju-game`. Pushing finished commits to that branch is expected and needs no further permission.

**The repository is public.** The session was offered three choices: make the repository private first, use a second private repository, or push to it as it is. The answer was to push as it is, knowing that this publishes the remake's source, its finished art and the raw art masters under `asset-sources/`. Text below and in older documents that calls the repository private, or says the Meshy originals must stay private, describes the arrangement before this decision. Do not change the repository's visibility unless asked.

The routine, for either tool:

1. **Before starting,** run `git fetch origin` and `git status`. If the branch is behind, bring it up to date with `git merge --ff-only origin/codex/kaiju-art-remake-20261020`. Then read `git log` back to your own last commit: the other tool's commit messages and `CHANGELOG.md` are the handoff.
2. **If both machines have new commits,** merge with `git merge origin/codex/kaiju-art-remake-20261020`. Resolve conflicts so that both changes survive, run the checks the merged files call for, and say in the merge commit what was reconciled. Never rebase or amend a commit that has been pushed, and never force-push.
3. **After finishing a piece of work,** run its relevant checks, commit with a message that says what changed and what was verified, and run `git push origin codex/kaiju-art-remake-20261020`. If the push is refused because the other machine pushed first, repeat steps 1 and 2 and push again.
4. **Leave the checkout clean,** or say what is uncommitted and why. Uncommitted edits are invisible to the other machine and can block its next merge.

Everything pushed is visible to anyone, so no credentials, `.env` files, save exports, logs, personal details or conversation transcripts go in a commit. `artifacts/` stays ignored and local.

**What this does not change.** `delivery/readiness.json` stays false. "Do not push or deploy" there and in the delivery rules below now means: do not merge into or push `main` or `codex/playtest`, and do not deploy. Those still need a passing review or an explicit decision. A push to the working branch starts the Actions run in `.github/workflows/ci.yml`, which tests and builds on every `codex/` branch and deploys only from `codex/playtest`. Report its result, and treat a failure as a finding to fix, not as a reason to stop sharing work.

**The two machines differ.** The Mac is Apple silicon with Node 22; the PC is x64 Windows. Tests that hash raw doubles keep exact digests on x64 and six-decimal digests on arm64 (`tests/helpers/platform-digest.mjs`). If a check fails on one machine only, record which one, and do not re-record a digest for the other architecture without running it there.

# Development on the Mac, and the self-crossing check

Recorded on 13 November 2026 from that day's development session. Alex, who directs development with Reza, gave two decisions. They are not Reza's own words; if Reza decides otherwise, his later instruction governs.

**Development moved.** The game is no longer developed with Codex on the Windows PC. The Mac checkout is the working game and Claude develops it. `CLAUDE.md` in this folder holds the working rules. Windows paths, the Codex stewardship schedule and the Codex runtime named below and in older documents describe the previous arrangement.

**The strict self-crossing test is tracked, not a gate.** `tests/beast-integration-native-self.test.mjs` still requires zero crossing triangle pairs across 25 poses, with the same detector and epsilon, and still runs in every suite. While it fails it reports as TODO; it does not fail the suite and does not by itself block an alpha. This replaces the reviews' treatment of that test failure alone (B04-E1, N01-E1) as a blocker. A reviewer who can see a fold, hole or clipping in captures should still record it as a visual error.

The decision changes nothing else here. The visual review gate below, its 8.5 score, the four-round limit and the instruction not to release until a review passes all stand, and `delivery/readiness.json` stays false until they are met or explicitly waived. The count must not rise: the ceiling test in the same file fails if any pose exceeds its recorded figure. Do not weaken the detector, exempt pairs or raise a recorded figure. Lowering the count remains wanted work; `docs/IMPROVEMENTS_2026-11-13.md` lists what is left.

# Design source of truth

Owner clarification, 20 October 2026: always use the most recent version of the game as the design baseline. Verify the latest actual implementation and subsequent owner instructions before making design decisions. Older prototype chats, briefs and rules must not restore a superseded design. At this clarification, flesh uses the low saddle city and cyborg uses the half-height vertical castle. Preserve the latest systems and saves while changing presentation unless the owner requests a design change. This precedence rule does not reset review-round limits or release blockers.

# Standing Meshy permission and evidence retention

Owner update, 4 October 2026: Reza authorizes using the available Meshy account credits for this project's authorized asset work without asking for permission again. This standing permission supersedes earlier per-use credit approval requirements. It does not authorize buying credits, paid upgrades, billing changes, publishing assets, or expanding the approved task. Use Meshy directly when it suits the authorized asset work; preserve private generation/export settings.

Keep detailed evidence for the latest four evidence-producing owner work requests. Count a request and its follow-up corrections/review rounds as one work group, not one group per tool call, retry, packaging step or instruction-only message. After every four new work requests, delete evidence belonging to older groups; the owner has already authorized that cleanup. Check the retention inventory before producing another large evidence set. The initial cleanup retains Meshy tree coverage, ground-cover volume, water polish and Meshy carrier assets.

This retention limit supersedes the instruction below to preserve raw evidence indefinitely. It covers screenshots, recordings, diagnostic/test outputs and duplicate review packages, including old copies in this game's registered worktrees. Preserve the current four groups' original evidence unchanged. Never delete game source, working assets, Meshy originals, saves, source checkpoints, Git history, operational delivery/maintenance state, unfinished work, or another project. Keep small tracked review conclusions and release blockers: evidence cleanup does not turn a failed review into a pass. Before removal, verify every resolved path is strictly beneath a named Kiju Game artifacts root, reject reparse points, and record the removed paths, counts and bytes in a small cleanup ledger. If ownership is uncertain, retain the item until classified. No game tests or art review are needed for evidence-only cleanup.

# Visual development review gate

Owner authorization, 20 October 2026: rig and integrate the new private Titanhorn beast, fix the saddle straps, and start another independent review cycle. Preserve the latest game design and systems. This explicitly authorizes a new cycle of up to four rounds for that integration; previous reviews remain unchanged and do not count as a pass. Do not release until the required checks and an actual passing review are complete.

## Gothic construction rule

Owner revision, 4 October 2026: the flesh quadruped is now a compact saddle city, with districts around its torso, waist and flanks and a low top load. It must not build a tall vertical tower. This supersedes the flesh-specific vertical rule below. Keep district IDs, construction order, saved progress, capacity, costs, upgrade benefits and movement/combat statistics. The cyborg still follows the half-height vertical castle rule. Treat any combat firing-geometry change separately from this presentation revision unless explicitly authorized.

For both flesh and cyborg kaijus, **every newly constructed district is a new storey directly above the previous top**, on the same backpack footprint. District upgrades increase their storey's height and lift all storeys above it. Never return to several districts placed side by side on prebuilt castle floors. Tank and airship cities continue to build horizontally. Preserve construction order and district IDs across saves. Harness reinforcement only increases supported capacity; it does not create empty floors. This is the owner's explicit clarification of vertical growth.

The owner subsequently requested **half-height for the cyborg's castle backpack only**. Keep the robot, its body weapons and the castle's horizontal footprint unchanged. The cyborg castle uses half-height storeys and crown relative to its attachment deck; the flesh castle retains full height. Continue to add every new district above the preceding one, including in existing saves. Fit the compact interiors and castle cannon mounts to their actual clearance, while retaining natural-sized residents.

Follow the owner's visual review loop for character animation, assets, and environment work.

1. Complete a concrete builder attempt and run the checks relevant to the changes.
2. Hand the build to a separate critic agent acting as a demanding AAA art director. The critic writes no implementation code, assets, tests, or capture scripts.
3. The critic takes its own fresh screenshots from several viewpoints and zoom levels, inspects animation, and reviews normal gameplay with its HUD. Diagnostic clean views can supplement those captures.
4. The critic scores game design and aesthetics from 0–10 against a fixed standard: above 8.5 is AAA quality, 7 is good indie, and 5 is programmer art. Record the actual score; do not inflate it to satisfy the gate.
5. Pass requires an overall score of at least 8.5 and zero identified visual or runtime errors. Keep ordinary ranked polish opportunities separate from concrete defects.
6. If the build fails, send the critic's ranked issue list to the builder, revise, and submit again. Stop after four review rounds per visual update if the gate still fails, and report the remaining issues and failed gate honestly.

Write each independent review under `art-reviews/`; put local screenshots and detailed browser output under ignored `artifacts/critic-round-XX/` directories. Identify the reviewed revision and changes since the previous review. Builders must not rewrite the critic's scores or findings.

Preserve the owner's latest design: tall stacked Gothic castle backpacks inspired by the supplied castle reference, growing vertically instead of a circular town. There are two variants per faction: flesh and cyborg humanoid kaijus; the original armored crawler and an elongated rectangular crawler with a giant forward spiral drill; the original horizontal airship envelopes and exactly four upright rounded balloons. British industrial and Eastern domed city architecture remain faction-specific. The September 2026 vertical-city request supersedes the earlier circular-ring design. Preserve local play, private source backup, and existing saves. This folder is independent of the Website workspace.

## Private playtest delivery

The owner authorized a private delivery lane for `reza477/kiju-game`, using `codex/playtest` and the single protected origin recorded in repository variable `PLAYTEST_ORIGIN`. For completed implementation tasks: run relevant checks, commit only relevant finished work, integrate without rewriting history, push this branch, verify the matching Actions run AND hosted build, then report the permanent link/build. `npm run handoff:playtest` assists with clean-tree fast-forward integration, ordinary push, and verification. Reconcile divergence explicitly; never force-push or change the default branch.

Read-only reviews, unfinished tasks, failed required checks and a false `delivery/readiness.json` must not publish. The preceding visual gate remains failed; only an actual passing review or explicit owner exception can clear that blocker. Later explicit no-push/no-deploy instructions override this default. Consult `docs/PRIVATE_DELIVERY.md` for initial account setup, included-only usage, unresolved promotion reconciliation, rollback and physical-phone evidence. Until that setup is verified, report **Configured but blocked**, never live. No public deployment, paid upgrade, billing change, credential logging, or changes to another project are authorized.


## Default review handoff format

The default review handoff is one flat folder containing exactly 20 files: 10 original gameplay PNG screenshots and 10 readable plain-text .txt files, including the manifest. This supersedes earlier ZIP-based review-handoff requirements. Use five matched before/after pairs: desktop normal City, desktop reverse, desktop close, phone portrait normal City, and phone landscape normal City. Label BEFORE/AFTER clearly and label phone views as emulation unless physically verified. Copy existing verified captures at their original dimensions; never retouch, upscale, crop away problems or substitute unmatched/intermediate evidence.

The ten text files are a read-me, change report, committed implementation diff, complete changed runtime source, complete changed test/tool source, existing test results, performance results, verbatim independent art reviews, screenshot metadata, and a file manifest. Identify full baseline/final commits and tested source fingerprints; distinguish later packaging or instruction edits. Record only evidenced commands, timestamps and exit codes, explicitly marking missing values. The manifest lists the other 19 files with byte sizes and SHA-256 hashes and gives the total count and folder size including itself; exclude the manifest from hashing.

Do not include subfolders, archives, videos, HTML, PDFs, thumbnails, binary assets other than the ten screenshots, embedded/base64 media, or additional files in the upload folder. Preserve original videos and full raw evidence locally outside it. Verify exact counts, image uniqueness, copied-image hashes/dimensions and source identities. Report missing evidence instead of fabricating or silently substituting it. For reporting-only work, do not rerun the game, benchmarks, tests or art-review loop merely to repackage results. Return the exact Windows folder path, total size, missing-evidence disclosure and the statement “20 files total: 10 screenshots + 10 text files.” Tell the owner to open the folder, select its contents and drag the 20 files into ChatGPT. This reporting format does not alter technical-only scope, game-design ownership, preservation, safety, testing, art-review or release requirements.
