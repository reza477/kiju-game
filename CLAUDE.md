# Colossus Wake — working game

Instructions for Claude in this folder. Written 13 November 2026. Statuses are a snapshot; check the files before relying on them.

## Who owns what

On 13 November 2026 Alex said the game is no longer developed on the Windows PC with Codex. **This Mac checkout is the live game, and Claude develops it**: fix bugs, change game code, run tests. Alex's stated goal is to get the game to an alpha.

This supersedes the older note in `../../CLAUDE.md`, which says the runtime stays with Codex. [`../START WITH CLAUDE.md`](<../START WITH CLAUDE.md>) is Codex's handoff and still describes the project layout accurately, except for its Windows paths.

## Start here

1. [`README.md`](README.md), then [`AGENTS.md`](AGENTS.md) for Reza's design rules. Latest design wins: low saddle city on the flesh beast, half-height vertical castle on the cyborg.
2. [`docs/IMPROVEMENTS_2026-11-13.md`](docs/IMPROVEMENTS_2026-11-13.md) for the current state and what is still open.
3. [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for commands and the source map.

## Running it on this Mac

- Play: double-click `Play.command`, or `node server.mjs` and open `http://127.0.0.1:4178`.
- Tests: `npm test` (about 15 minutes; the Mac has 16 GB, so `node --test --test-concurrency=4 tests/*.test.mjs` is kinder). Only Node 22 from Homebrew works here; the Homebrew Node 24 install is broken.
- Browser playthrough: `node tests/browser-smoke.mjs` against a server on another port, using the installed Google Chrome.
- `node_modules` came from Windows. The pure-JavaScript packages work; run `npm ci` only if a package with native code is needed.

## Rules

- Work in this folder. `../Source snapshot` is an older reference copy.
- **Ask Alex before pushing to GitHub, deploying, publishing or spending anything.** `delivery/readiness.json` is `eligible: false`; do not flip it without a passing review or Alex's explicit decision.
- Never delete or overwrite original art: `assets/`, `asset-sources/`, Meshy originals. Save a new version beside the original.
- Commit finished work locally on the current branch with a clear message. Do not rewrite history.
- Local analysis scripts and evidence go under `artifacts/` (ignored by Git). `artifacts/` and `../History` are 20 GB of Codex evidence; search them, do not read them end to end.
- The strict beast self-crossing test is tracked, not gating, by Alex's decision of 13 November 2026 (see the top of `AGENTS.md`). It reports as TODO. Its ceiling test is the gate: never raise a recorded count, and lower one when a repair earns it.
- Do not weaken a test to make it pass. If a check is wrong for this machine, say why in the test and keep the original contract where it still applies (see `tests/helpers/platform-digest.mjs`).
- Alex is new to Claude and is not a programmer. Report in plain language: what changed for a player, what was verified, what is still open.
