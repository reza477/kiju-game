# Painterly dark-fantasy phase 1 — independent review 3

Reviewer: `/root/painterly_art_critic`, the same independent critic as rounds 1–2. The reviewer wrote no implementation code, assets, tests, or capture scripts. Review completed 2026-10-03, approximately 16:02 PDT / 23:02 UTC.

**Overall reference-area art score: 6.7/10. Gate: FAILED.** The standing requirement remains at least 8.5/10 and zero identified visual/runtime errors. The slight reduction from round 2 reflects a visible ground-composition regression, despite some better foliage forms. A review score is not required to rise on every iteration. The whole game is not artistically accepted or fully migrated. No game-design changes are assessed or recommended.

## Revision and independently captured evidence

- Baseline/HEAD: `8320a432b0ce27fbe73eccd32a0b88120cd091ab`; uncommitted candidate on `codex/painterly-phase1-20261003`, worktree `C:\Users\user\.codex\worktrees\painterly-phase1\Kiju Game`.
- Capture inventory fingerprint: `4be58002bdef90591e30d127d71024fe31bd2c18b53182cb322bb79d30fc4896`. It stayed identical through both preview and motion runs. This is the existing capture helper's runtime/assets inventory scheme, not a claim that it is identical to the broader dependency-inclusive fingerprint.
- Independent preview run began `2026-10-03T22:57:13.206Z`; exited 0. Evidence is under `artifacts/critic-round-03/painterly/`: nine original PNGs, `capture.log`, `preview-report.json`, and instance observations.
- I ran the existing `tests/environment-polish-capture.mjs` with MODE=preview, PHASE=after, CHECKPOINT=full baseline above, SOURCE_ROOT=current candidate, CAPTURE_URL=`http://127.0.0.1:4204/`, OUTPUT_DIR=`artifacts/critic-round-03/painterly`, FIXTURE_PATH=`artifacts/painterly/fixture.json`, CAPTURE_VIEWS=city,reverse,close, VERIFY_SAVE=0, PLAYING_CAPTURE=1, CLOSE_ENVIRONMENT=1.
- Desktop 1440x960 High, phone portrait 390x844 Performance/DPR 2, and phone landscape 844x390 Performance/DPR 2. I inspected City, reverse, and close views across these profiles with the normal PLAYING HUD. Native simulation timing is not pixel-identical. The phone profiles are desktop Chrome emulation, not iPhone/iPad hardware or Safari.
- Close views continue to use the same real baseline destination-travel save, hash `78f9e58d0ba91a253d3f8660c8eeebd326f206e6f64f366ae70c239c052a63a4`, with saved destruction. The invalid round-1 teleport arrangement was not reused.
- Preview and recording each report zero page/console errors, zero remote requests and two retained nonfatal shader precision warnings. The harness verified the local server's source-root identity.

## Changes since round 2

The pine is now a connected branched crown rather than a single faceted spear with separate shoulders. Broadleaf trees have larger primary masses and small attached lumps/edge clusters with softer shading. Ground now carries much stronger middle-scale marks. Wet-bank areas and selected ruin/rock surfaces have additional variation. This review evaluates their appearance in the game, not their triangle count or the amount of implementation work.

## Motion evidence

I independently used the existing capture tool in MODE=record for all three profiles, retaining the same source, fixture and origin. Output: `artifacts/critic-round-03/painterly-motion/`. Installed FFmpeg: `C:\Users\user\AppData\Local\ms-playwright\ffmpeg-1011\ffmpeg-win64.exe`. No new capture script was made. The run began `2026-10-03T22:59:09.671Z` and exited 0. The existing tool records eight seconds of native keyboard/touch input, then retains a six-second internal slice along with the complete raw video and timing report.

All routes start x=-14,z=82,time=12. Recorded endpoints:

- Desktop: x=-55.300304919784665,z=136.23819122200888,time=20.02030000000007.
- Phone portrait: x=-53.600979380399906,z=134.0065286778063,time=19.690300000000263.
- Phone landscape: x=-55.248810206470125,z=136.17056508430517,time=20.01030000000023.

I extracted and inspected unchanged-size frames at 1, 3 and 5 seconds of each clip using the existing FFmpeg CLI (`-ss N -frames:v 1`). These nine additional local observations show changing position, turning, tracks, debris and the reference woodland/ruin in real native gameplay with its HUD. They are sampled recorded movement, not performance timings or continuous high-frame-rate visual analysis. I did not see a definite disconnected animation or frozen world in these samples. Very brief popping, wind/shadow shimmer and hitch absence remain unverified by this critic's sampled inspection. The in-app-browser availability limitation from round 2 means I used the isolated recorder for this round; I did not use Reza's personal Chrome profile or relabel older live observations as current evidence. All isolated recording contexts closed before releasing the GPU slot.

## What improved

1. The pine is more recognizably a conifer than the round-2 spear. Its taper is less mechanical and connected crown parts survive the phone view better.
2. Softer broadleaf shading reduces the rock-like facet reading seen in round 2. Foliage remains solid and readable instead of reverting to the old exposed pole/card arrangement.
3. The cooler, clearer river remains a substantial improvement over the starting build. Land/water separation is easy to read.

## Ranked final-round priorities

1. **The new ground pattern is too dominant and too uniformly present.** City, reverse, ruin and phone views all show conspicuous camouflage-like patches over almost every open surface. This replaces the calm background with repeated procedural marks and competes with the city. The fix is selective composition: retain the useful broad meadow/litter/earth regions, lower the marks' contrast and coverage, localize stronger marks to appropriate habitat/edge areas, and restore genuinely quiet open intervals. Do not change terrain or remove functional scenery.
2. **Broadleaf structure is still made of generic blobs with small knobs attached.** The smaller clusters often sit on the broad face of a large mass as surface bumps rather than making a convincing branching/foliage transition. The close foreground trees make this especially clear. Prioritize edge-connected secondary masses, uneven crown outlines and meaningful primary branch directions. Do not add uniformly distributed decorative bumps or restore fine all-over cutout noise.
3. **Pines still show thick folded skirts/pads as their main silhouette cue.** The spear problem is reduced, but the crown does not yet have a convincing hierarchy of directional branch wedges and tapered growth. Refine the existing crown with asymmetric negative spaces and less dominant broad horizontal lips. Keep its anchor, functional size, wind and destruction membership unchanged.
4. **Ruin and rock material identity remains underdeveloped.** Selected weathering is visible, but Broken Meridian still reads predominantly as clean light stone and brown modular walls; pale geological slabs remain regular. At normal City distance the existing recesses, damp bases and material differences need clearer selective value structure. This is surface/decorative work on the current silhouette, not a request for new architecture.
5. **The bank still needs a stronger local relation to the river.** Avoid expanding the entire bank into a uniform stripe. Build on the existing local wet changes and restrained water, preserving all actual channel data. The river should remain the calm element while contact areas explain the earth/stone transition.

## Concrete defects versus art-quality issues

No definite new production runtime defect was demonstrated in these independent captures or sampled native-motion frames. The repeating ground treatment and crown designs are visible art-quality problems, not proof of changed collision, simulation or save behavior. The shader precision warnings remain disclosed. Functional, lifecycle, release and performance certification must rely on the separate final test evidence.

The next attempt is the fourth and final round allowed for this new art task. Do not soften the threshold or reopen the older material/foliage tasks to manufacture a pass. Their original 7.6/10 FAILED reviews remain unchanged. This review does not authorize publication, broader world migration, carrier redesign, or gameplay changes.
