# Visual development review gate

## Gothic construction rule

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

Preserve the owner's latest design: tall stacked Gothic castle backpacks inspired by the supplied castle reference, growing vertically instead of a circular town. There are two variants per faction: flesh and cyborg humanoid kaijus; the original armored crawler and an elongated rectangular crawler with a giant forward spiral drill; the original horizontal airship envelopes and exactly four upright rounded balloons. British industrial and Eastern domed city architecture remain faction-specific. The September 2026 vertical-city request supersedes the earlier circular-ring design. Preserve local play, source backup under the visibility policy below, and existing saves. This folder is independent of the Website workspace.

## Public source and protected hosting

The owner's latest explicit instruction authorizes public source for `reza477/kiju-game`. This supersedes earlier private-repository requirements. Keep the GitHub source public and readable; do not restore private visibility based on historical reports or older task instructions. This does not grant an open-source license, authorize exposing credentials or personal files, or waive any release gate.

The hosted playtest remains protected at the single origin in `PLAYTEST_ORIGIN`. Public GitHub source does not authorize public hosting, Vercel deployment-source exposure, or bypassing authentication. The current private-repository checks in `scripts/handoff-playtest.mjs` and `scripts/vercel-delivery.mjs` conflict with this source instruction and need a separate reviewed implementation change; do not work around them by making GitHub private or weakening hosted protection. Until corrected and verified, preserve that blocker alongside release readiness.

## Private playtest delivery

The owner authorized a private delivery lane for `reza477/kiju-game`, using `codex/playtest` and the single protected origin recorded in repository variable `PLAYTEST_ORIGIN`. For completed implementation tasks: run relevant checks, commit only relevant finished work, integrate without rewriting history, push this branch, verify the matching Actions run AND hosted build, then report the permanent link/build. `npm run handoff:playtest` assists with clean-tree fast-forward integration, ordinary push, and verification. Reconcile divergence explicitly; never force-push or change the default branch.

Read-only reviews, unfinished tasks, failed required checks and a false `delivery/readiness.json` must not publish. The preceding visual gate remains failed; only an actual passing review or explicit owner exception can clear that blocker. Later explicit no-push/no-deploy instructions override this default. Consult `docs/PRIVATE_DELIVERY.md` for initial account setup, included-only usage, unresolved promotion reconciliation, rollback and physical-phone evidence. Until that setup is verified, report **Configured but blocked**, never live. No public deployment, paid upgrade, billing change, credential logging, or changes to another project are authorized.
