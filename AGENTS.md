# Visual development review gate

Follow the owner's visual review loop for character animation, assets, and environment work.

1. Complete a concrete builder attempt and run the checks relevant to the changes.
2. Hand the build to a separate critic agent acting as a demanding AAA art director. The critic writes no implementation code, assets, tests, or capture scripts.
3. The critic takes its own fresh screenshots from several viewpoints and zoom levels, inspects animation, and reviews normal gameplay with its HUD. Diagnostic clean views can supplement those captures.
4. The critic scores game design and aesthetics from 0–10 against a fixed standard: above 8.5 is AAA quality, 7 is good indie, and 5 is programmer art. Record the actual score; do not inflate it to satisfy the gate.
5. Pass requires an overall score of at least 8.5 and zero identified visual or runtime errors. Keep ordinary ranked polish opportunities separate from concrete defects.
6. If the build fails, send the critic's ranked issue list to the builder, revise, and submit again. Stop after four review rounds per visual update if the gate still fails, and report the remaining issues and failed gate honestly.

Write each independent review under `art-reviews/`; put local screenshots and detailed browser output under ignored `artifacts/critic-round-XX/` directories. Identify the reviewed revision and changes since the previous review. Builders must not rewrite the critic's scores or findings.

Preserve the owner's design: comparable carrier sizes; a humanoid kaiju wearing a single circular Gothic castle backpack with inside-out ring growth; a British industrial crawler city; and an Eastern-inspired domed city held by horizontal airship envelopes. Preserve local play, private source backup, and existing saves. This folder is independent of the Website workspace.
