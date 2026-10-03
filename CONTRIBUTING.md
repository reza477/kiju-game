# Contributing

Colossus Wake is an owner-directed game project with public source and protected playtest hosting. Coordinate work through repository issues and pull requests, and read [AGENTS.md](AGENTS.md) before changing the game. See [development setup](docs/DEVELOPMENT.md) for commands and [repository maintenance](docs/REPOSITORY_MAINTENANCE.md) for backup and synchronization rules.

## Make a focused change

1. Check the current game task and working tree before editing. Use an isolated worktree when development is active, so repository maintenance cannot overwrite in-progress game work.
2. Keep a change focused on one problem or improvement. Use a descriptive branch, normally under `codex/` for agent-authored work.
3. Preserve existing saves, district identities, scenery identities, local play and offline behavior. Review migrations explicitly if state formats change.
4. Run `npm test` and the checks relevant to the affected behavior. For the protected playtest lane, use `npm run build:playtest`, test those frozen bytes and run `npm run verify:playtest`; preserve their actual source/build identity. Follow [the delivery guide](docs/PRIVATE_DELIVERY.md) for all required release gates.
5. Describe the resulting behavior, validation performed and remaining limitations in the pull request. Documentation-only changes need link/content checks, not a fresh visual review or a claim that gameplay was retested.

## Protect the game's design

Gothic districts append one storey at a time above the previous top. Upgrades raise their storey and all higher storeys. Reinforcement buys capacity without creating floors. The cyborg castle alone uses half-height storeys and crown; keep its footprint, robot, body weapons and residents at their established scale. Flesh castles retain full height. Crawler and airship cities build horizontally.

Preserve both variants of each faction, including the elongated drill crawler and exactly four upright balloons. British industrial and Eastern domed architecture remain faction-specific. Historical circular towns and multiple-district prebuilt Gothic floors are superseded designs, not alternatives to restore. The full owner instructions in [AGENTS.md](AGENTS.md) govern implementation.

## Review visual work independently

After a concrete builder attempt and relevant checks, a separate critic takes fresh screenshots at multiple viewpoints and zooms, observes animation, and reviews ordinary gameplay with its HUD. The critic writes no implementation or capture code. Diagnostic views may supplement gameplay captures.

Record the actual game design and aesthetics score against the fixed scale: 5 is programmer art, 7 is good indie, and the pass threshold is 8.5. Passing also requires zero identified visual or runtime errors. Keep ranked polish opportunities separate from concrete defects. Repeat builder/critic revisions when needed, stopping after four rounds per visual update and reporting an unmet gate honestly.

Independent reports belong in `art-reviews/`, identifying the revision and changes since the previous review. Screenshots and detailed browser output belong under ignored `artifacts/critic-round-XX/` directories. Builders must not rewrite critic scores or findings. The latest Alpha 1 environment result is [7.5/10, failed gate](art-reviews/alpha1-04.md).

## Report a reproducible issue

Include the game version or build ID, carrier variant, view, graphics setting, browser/device, steps, expected result and actual result. Attach a screenshot when useful. Explain whether the problem survives save/reload and whether it affects an existing or new expedition. Use the game's feedback export to collect environment details; review files before attaching personal data or saves.

Unit checks, desktop browser checks and real-device results are different evidence. Label touch emulation as emulation. Do not infer Safari performance, long-session stability or aesthetic approval from an automated pass.

## Protect sensitive data and preserve provenance

Do not commit credentials, `.env` files, logs, user save exports, personal feedback or full ignored capture directories. Preserve existing third-party credits and licenses. New dependencies or assets need identifiable provenance and redistribution terms; do not add an open-source license for the original game without the owner's decision. The owner authorized public source access on 27 September 2026. Keep repository source public while preserving the separate protected-game delivery gates; Actions logs and uploaded evidence are not private storage.
