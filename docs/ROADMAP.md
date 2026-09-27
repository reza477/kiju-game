# Roadmap

This is a planning outline for the private Alpha 1 prototype. It records current gaps and candidate priorities, without release dates or a commitment to every possible feature. The owner sets the scope of each game update.

## Current baseline

Six carrier variants, district construction and upgrades, resource travel/gathering, a five-rival campaign, local save/transfer, original audio, touch layouts and a locally built offline package are implemented. See [playing and scope](PLAYING.md), [Alpha 1 verification](../ALPHA1_VERIFICATION.md), and [development history](../CHANGELOG.md).

Private GitHub source maintenance keeps documentation, checks and backups aligned with completed development. It does not by itself publish a playable mobile build. See [repository maintenance](REPOSITORY_MAINTENANCE.md).

The newer iPhone/private-delivery candidate is backed up on `codex/playtest`, while `main` retains Alpha 1. Its status is **Configured but blocked**: [readiness is false](../delivery/readiness.json), the required browser-delivery gate failed, and the latest visual review remains below threshold. [Current status and evidence](PRIVATE_DELIVERY.md) supersede the earlier Cloudflare hosting proposal.

## Next validation priorities

- **Resolve the required delivery-browser failure ([#5](https://github.com/reza477/kiju-game/issues/5)):** final source `11af190`, build `1f34a447888f6f64e784`, completed only 3/11 groups in Chrome 154 and 0/11 in pinned Chromium 151. Establish the full-game stall's cause and pass the unchanged required gate; unit and separate offline passes do not replace it.
- **Real Apple-device playtesting ([#1](https://github.com/reza477/kiju-game/issues/1)):** confirm iPad/iPhone models and OS versions; test Safari/WebGL, touch latency, Home Screen installation, memory pressure and thermal behavior. Desktop emulation does not establish these results.
- **Long-session stability ([#2](https://github.com/reza477/kiju-game/issues/2)):** measure representative play beyond the recorded 30-second warmed motion run. That run kept geometry/texture/program counts stable but did not establish heap stability or long-session performance.
- **Private mobile delivery setup ([#6](https://github.com/reza477/kiju-game/issues/6)):** the owner authorized `codex/playtest` and the single protected Vercel origin recorded in `PLAYTEST_ORIGIN`. Verify the dedicated account/project, All Deployments authentication, secrets, permanent alias, included allowances and disabled paid overages. Do not run Actions until usage is confirmed, or upload while readiness is false. After both release gates pass, verify protected placeholder access, exact hosted bytes, two successive builds and the real phone workflow. Follow [the consolidated checklist](PRIVATE_DELIVERY.md#one-consolidated-setup-checklist).
- **Ongoing save compatibility:** preserve older expeditions, construction order, district IDs and scenery damage through future updates; exercise save export/import and recovery alongside runtime changes.

## Visual improvement priorities

The latest [iPhone presentation review](../art-reviews/iphone-pass1-04.md) scored **6.9/10 overall and 8.4/10 HUD**, below the 8.5 overall threshold after four rounds. Its sampled HUD defects were resolved; physical-phone feedback remains needed. An actual passing review or explicit art-only owner exception can address this visual blocker, but cannot clear failed functional delivery checks.

The earlier Alpha 1 environment review separately scored 7.5/10. Its four-round cycle is also closed. Preserve its [ranked polish](../art-reviews/alpha1-04.md), tracked in [issue #3](https://github.com/reza477/kiju-game/issues/3):

1. Distinguish meadow, woodland litter, bare soil and damp bank at normal gameplay distance.
2. Improve close tree crowns, openings and branch rhythms.
3. Give geological strata, weathering, shoulders and slope deposits more distinct material treatment.
4. Vary river-bank deposits, reeds, stones and shallows according to each reach.

These are polish opportunities, not newly confirmed defects. Any future visual update follows the independent review loop in [AGENTS.md](../AGENTS.md). Preserve Gothic vertical growth, compact cyborg proportions and the six faction variants throughout.

## Possible later design work

Citizen travel between storeys and fuller navigation, more differentiated carrier-variant statistics, additional encounters/regions and deeper progression could extend the existing loop. None is implemented or promised by this roadmap. Multiplayer, diplomacy, a tech tree, procedural campaigns, automatic cloud save sync and native App Store distribution remain outside the current build.
