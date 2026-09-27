# Private hosting setup — 27 September 2026

Status: **Configured but blocked**. Permanent address: https://colossus-wake-playtest.vercel.app. It contains a generic protected setup page, not the game. No playable assets, concept artwork or source reports were uploaded to Vercel.

## Verified account and usage boundaries

- GitHub: `reza477/kiju-game`, private, default `main`, delivery branch `codex/playtest`.
- Vercel owner: `rezarhnm-6590`; Hobby team `rezarhnm-6590s-projects`, ID `team_db0IJn7BZMtz8amtLBtCFbcO`.
- Dedicated project: `colossus-wake-playtest`, ID `prj_TjqjheUe2qpePzohpT11IXIUxpRM`. No native Git integration or rolling releases; `ssoProtection.deploymentType=all`; public source is not enabled (API represents the disabled value as null).
- GitHub current period: 879/2,000 included Actions minutes, 0/0.5 GB storage. Existing Actions budget is $0 with Stop usage=Yes. Billing read through the signed-in UI; CLI scopes were not broadened.
- Vercel previous 30 days: 13.65 kB/100 GB fast transfer, 5.39 kB/10 GB origin transfer, 13/1M edge requests, 11.65 MB/10 GB deployment storage, 0/100 hours build time. Hobby remains active. No billing settings, subscriptions, paid add-ons or other projects changed.

Official references: [All Deployments free on every plan](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan), [Hobby limits](https://vercel.com/docs/plans/hobby), [account plans](https://vercel.com/docs/plans), [project-scoped access tokens](https://vercel.com/docs/accounts/access-tokens).

## Credentials and configuration

Repository variables: `PLAYTEST_ORIGIN`, `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`, `PLAYTEST_INCLUDED_USAGE_CONFIRMED=true`. Variable values were verified after setting them.

Repository secrets: `VERCEL_TOKEN`, `VERCEL_PROTECTION_BYPASS`, verified by name only. The token is restricted to this project and expires **27 October 2026**. The supported API attempt using the OAuth CLI session did not create a token; OAuth sessions cannot mint tokens. The authenticated dashboard's project-specific flow succeeded. Its value was transferred directly into the GitHub form in browser memory without printing it, copying it to clipboard, or storing it on disk. The project automation bypass was sent directly to GitHub secret stdin. Secret values are absent from source, reports, screenshots and phone URLs.

The CI token's actual API/deployment permissions remain to be exercised by the release workflow; dashboard creation and secret existence alone do not prove that path.

## Empty hosting proof

Only an isolated Build Output API directory with generic HTML was deployed, using `--prebuilt --prod --skip-domain`. The directory contains no game assets and no Git integration.

1. Placeholder A: `dpl_HsFVgmBKXNA3yPgXQUf5UnFfJ8Ao`, staged URL `https://colossus-wake-playtest-73lhyphee-rezarhnm-6590s-projects.vercel.app`.
2. Before assigning the permanent address, its staged URL denied anonymous `/`, `/release.json`, `/src/main.js` and allowed the authenticated placeholder.
3. After promotion, the permanent address and generated project alias `colossus-wake-playtest-rezarhnm-6590s-projects.vercel.app` passed the same checks. Signed-in desktop Chrome opened the permanent placeholder normally, without a bypass token in its URL.
4. Placeholder B: `dpl_8PzimTXezeK8k3n5BVZvtTSUyrt7`, staged URL `https://colossus-wake-playtest-nlc2df4hd-rezarhnm-6590s-projects.vercel.app`. Its content has a distinguishable B marker. Staging retained A at the permanent address; B passed denied/authorized checks before promotion.
5. Both promotions mapped the permanent alias to the exact requested deployment. The second also confirmed `targets.production.id` matching B. **Both returned `lastAliasRequest:null` on subsequent project reads.** CLI exit zero is not proof of the stronger production promotion contract. The unchanged release loop would fail closed on that nullable state; this remains a reconciliation issue until resolved with evidence.

These prove protected empty hosting and independent provider delivery only. They do not prove a hosted game update, service-worker installation on Vercel, saves across hosted A/B, or an iPhone installation.

## Local repairs and evidence

- Added an included-usage condition at the workflow job boundary, before runner allocation. A regression covers every hosted runner job.
- The live Vercel CLI emits structured JSON. Staging now parses only `deployment.id`/`deployment.url`, ignoring links in informational `next` commands, and confirms the identity against the API. Malformed/error JSON and unsafe origins fail closed. Exact legacy URL-only output remains supported.
- Focused delivery/workflow checks: **18/18 passed**. Full local unit suite: **189/189 passed**, zero skipped. No game runtime, visuals, saves, engine or iPhone presentation changed.
- The earlier Windows functional repair evidence remains in [DELIVERY_REPAIR_2026-09-27.md](DELIVERY_REPAIR_2026-09-27.md); its frozen artifact retains its original source identity. Hosting setup commits do not relabel that artifact.

Ignored local evidence: `artifacts/delivery/hosting-project.json`, `bootstrap-deployment-url.txt`, `bootstrap-stage-check.json`, `bootstrap-permanent-check.json`, `bootstrap-b-deployment.json`, `bootstrap-b-promotion.json`, and screenshots `vercel-usage-20260927.png`, `github-included-budget-20260927.png`, `github-ci-secrets-20260927.png`, `protected-placeholder-20260927.png`.

## Remaining gates

Readiness remains false because the previous visual review failed (6.9 overall; 8.4 HUD). No art work or review was started and no exception was inferred from “Continue.” Linux cloud test evidence, scoped CI deployment access, the nullable promotion-status reconciliation, hosted game A/B and real Apple-device tests are not yet established by this report. No passing playable release, GitHub deployment record or phone-ready claim is made.
