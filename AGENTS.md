# Visual development review gate

## Gothic construction rule

For both flesh and cyborg kaijus, **every newly constructed district is a new storey directly above the previous top**, on the same backpack footprint. District upgrades increase their storey's height and lift all storeys above it. Never return to several districts placed side by side on prebuilt castle floors. Tank and airship cities continue to build horizontally. Preserve construction order and district IDs across saves. Harness reinforcement only increases supported capacity; it does not create empty floors. This is the owner's explicit clarification of vertical growth.

Follow the owner's visual review loop for character animation, assets, and environment work.

1. Complete a concrete builder attempt and run the checks relevant to the changes.
2. Hand the build to a separate critic agent acting as a demanding AAA art director. The critic writes no implementation code, assets, tests, or capture scripts.
3. The critic takes its own fresh screenshots from several viewpoints and zoom levels, inspects animation, and reviews normal gameplay with its HUD. Diagnostic clean views can supplement those captures.
4. The critic scores game design and aesthetics from 0–10 against a fixed standard: above 8.5 is AAA quality, 7 is good indie, and 5 is programmer art. Record the actual score; do not inflate it to satisfy the gate.
5. Pass requires an overall score of at least 8.5 and zero identified visual or runtime errors. Keep ordinary ranked polish opportunities separate from concrete defects.
6. If the build fails, send the critic's ranked issue list to the builder, revise, and submit again. Stop after four review rounds per visual update if the gate still fails, and report the remaining issues and failed gate honestly.

Write each independent review under `art-reviews/`; put local screenshots and detailed browser output under ignored `artifacts/critic-round-XX/` directories. Identify the reviewed revision and changes since the previous review. Builders must not rewrite the critic's scores or findings.

Preserve the owner's latest design: tall stacked Gothic castle backpacks inspired by the supplied castle reference, growing vertically instead of a circular town. There are two variants per faction: flesh and cyborg humanoid kaijus; the original armored crawler and an elongated rectangular crawler with a giant forward spiral drill; the original horizontal airship envelopes and exactly four upright rounded balloons. British industrial and Eastern domed city architecture remain faction-specific. The September 2026 vertical-city request supersedes the earlier circular-ring design. Preserve local play, private source backup, and existing saves. This folder is independent of the Website workspace.
