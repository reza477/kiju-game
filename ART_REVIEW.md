# Independent art review

The owner requires an independent critic after each completed character, asset, or environment attempt. The gate and responsibilities are in [AGENTS.md](AGENTS.md).

The current cycle evaluates the completed 0.4 build as round 1, followed by up to three revised builds. Every review uses fresh screenshots taken by the critic. A failed fourth review ends the cycle without an approval claim.

| Round | Builder revision | Independent review | Result |
|---|---|---|---|
| 1 | `b5cdf00` / prototype 0.4 | [Critic report](art-reviews/round-01.md) | **FAIL — 5.3/10**, 0 runtime errors; visual defects remain |
| 2 | `67338ca` | [Critic report](art-reviews/round-02.md) | **FAIL — 6.1/10**, 0 runtime errors; 2 confirmed visual defects |
| 3 | `db86f1d` | [Critic report](art-reviews/round-03.md) | **FAIL — 6.4/10**, 0 runtime errors; melee contact defect |
| 4 | `022020d` | [Final critic report](art-reviews/round-04.md) | **FAIL — 6.7/10**, 0 runtime errors; damage precedes visible impact |

Round 2 addressed the first ranked list: articulated carrier motion and contact, stronger supports, distinct terrain regions and water, improved clothing and crowd spacing, more useful city/Streets framing, compact controls, and clearer firing effects. The builder's integrated browser audit and smoke checks passed; these are functional checks, not aesthetic approval.

Round 3 replaces stochastic shadow filtering, concentrates terrain geometry in the playable area, adds continuous regional ground materials, fits kaiju soles to rendered terrain, strengthens weight transfer and hit reactions, keeps City framing above the build tray, and adds impact aftermath. The builder passed 34 Node tests and the integrated gameplay audit; fresh tours, complete stride fixtures and phase-based combat captures reported no browser errors. Independent scoring follows the completed revision.

Round 4 adds aimed fist contact, supported crouching and stepping, walking recovery during pursuit, and impacts attached to moving target surfaces. It also changes the battle camera angle, quiets smoke, tightens castle framing, varies tree crowns and groups ruins and rock formations. The builder passed 35 Node tests, the integrated gameplay audit, 13 browser smoke checks, and targeted contact and stride checks. This is the fourth and final submission in this cycle; its score determines the recorded result without further retries.

**Final gate: failed. Four rounds completed; no fifth attempt.** The final critic independently captured 73 screenshots and reran six contact cases. Spatial fist contact and travelling impact placement are resolved in the observed sequences, but health decreases during wind-up/flight before the visible hit. The score also remains below 8.5 on art quality alone. The final report ranks the remaining environment composition, hero form and weight, citizen activity, material and effect work for a later update.

The private repository contains the review reports. Screenshots remain on this PC under `artifacts/` and are excluded from source backup.
