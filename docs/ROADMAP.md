# Roadmap

This is a planning outline for the Alpha 1 prototype and its protected playtest. The owner authorized public GitHub source; hosted authentication remains required. There are no release dates or commitments to every possible feature. The owner sets each game update's scope.

## Current baseline

Six carrier variants, district construction and upgrades, resource travel/gathering, a five-rival campaign, local save/transfer, original audio, touch layouts and a locally built offline package are implemented. See [playing and scope](PLAYING.md), [Alpha 1 verification](../ALPHA1_VERIFICATION.md), and [development history](../CHANGELOG.md).

GitHub source maintenance keeps documentation, checks and backups aligned with completed development. It does not by itself publish a playable mobile build. See [repository maintenance](REPOSITORY_MAINTENANCE.md).

The latest completed environment and foliage source is backed up on `codex/github-stewardship-20260927`; `codex/playtest` retains the earlier installer repair and `main` retains Alpha 1. The main development chat determines completed work and verification outcomes. Status remains **Configured but blocked**: both newer visual passes failed at 7.6/10 after four rounds, and [readiness remains false](../delivery/readiness.json). The complete Linux/Windows installation gate passed for the earlier `d556448` source, not a newly packaged graphics build. The permanent protected origin serves only a setup page. See [current evidence](PRIVATE_DELIVERY.md).

## Next validation priorities

- **Preserve the repaired functional gate ([#5](https://github.com/reza477/kiju-game/issues/5)):** frozen source `d556448`, build `af7991973d3ec6fc31ad`, passes 12/12 game groups on Linux and Windows, alongside 226 units, 8 transport and 3 startup regressions and exact-runtime integrity checks. Retain this coverage for future runtime changes; it is not a physical-device performance benchmark.
- **Real Apple-device playtesting ([#1](https://github.com/reza477/kiju-game/issues/1)):** confirm iPad/iPhone models and OS versions; test Safari/WebGL, touch latency, Home Screen installation, memory pressure and thermal behavior. Desktop emulation does not establish these results.
- **Long-session stability ([#2](https://github.com/reza477/kiju-game/issues/2)):** measure representative play beyond the recorded 30-second warmed motion run. That run kept geometry/texture/program counts stable but did not establish heap stability or long-session performance.
- **Protected game delivery ([#6](https://github.com/reza477/kiju-game/issues/6)):** dedicated hosting, protected placeholders, repository configuration and included-only usage setup are verified records. After legitimate visual eligibility, exercise actual scoped CI publishing, exact playable bytes, hosted game A→B and the phone workflow on the single `PLAYTEST_ORIGIN`. The existing placeholder is not gameplay. Preserve protection and included-only limits; older usage snapshots are not current balances. Follow [the remaining release checklist](PRIVATE_DELIVERY.md#remaining-release-checklist).
- **Public-source policy compatibility:** update and test the source-only private-repository assertion in `scripts/vercel-delivery.mjs` in a separate implementation task. Keep exact repository/branch checks, All Deployments authentication, Vercel deployment-source restrictions, access probes and release eligibility. Do not make the source private to pass an obsolete guard.
- **Ongoing save compatibility:** preserve older expeditions, construction order, district IDs and scenery damage through future updates; exercise save export/import and recovery alongside runtime changes.

## Visual improvement priorities

The [environment pass](ENVIRONMENT_POLISH_PASS1_2026-10-02.md) and distinct [foliage pass](FOLIAGE_ASSETS_2026-10-02.md) are complete, each with a closed four-round **7.6/10 failed** review. The following historical priorities are not authorization to reopen either pass. The latest remaining foliage limitations are repeated grass silhouettes and exposed pine branch structure; preserve the original [environment](../art-reviews/environment-pass1-round-04.md) and [foliage](../art-reviews/foliage-assets-round-04.md) findings without rewriting scores. Any further visual task needs its own owner-defined scope.

The latest [iPhone presentation review](../art-reviews/iphone-pass1-04.md) scored **6.9/10 overall and 8.4/10 HUD**, below the 8.5 overall threshold after four rounds. Its sampled HUD defects were resolved; physical-phone feedback remains needed. An actual passing review or explicit art-only owner exception can address this remaining art blocker. Neither waives functional regression checks, protected hosting or included-only usage requirements.

The earlier Alpha 1 environment review separately scored 7.5/10. Its four-round cycle is also closed. Preserve its [ranked polish](../art-reviews/alpha1-04.md), tracked in [issue #3](https://github.com/reza477/kiju-game/issues/3):

1. Distinguish meadow, woodland litter, bare soil and damp bank at normal gameplay distance.
2. Improve close tree crowns, openings and branch rhythms.
3. Give geological strata, weathering, shoulders and slope deposits more distinct material treatment.
4. Vary river-bank deposits, reeds, stones and shallows according to each reach.

These are polish opportunities, not newly confirmed defects. Any future visual update follows the independent review loop in [AGENTS.md](../AGENTS.md). Preserve Gothic vertical growth, compact cyborg proportions and the six faction variants throughout.

## Possible later design work

Citizen travel between storeys and fuller navigation, more differentiated carrier-variant statistics, additional encounters/regions and deeper progression could extend the existing loop. None is implemented or promised by this roadmap. Multiplayer, diplomacy, a tech tree, procedural campaigns, automatic cloud save sync and native App Store distribution remain outside the current build.
