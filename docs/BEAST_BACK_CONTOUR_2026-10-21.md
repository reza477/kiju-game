# Titanhorn loaded-strike back correction — 21 October 2026

V12b combines the pending V11b paw UV projection with a small, smooth upper-back volume correction. It is the viable candidate for integration checks; V12 was rejected by the independent triangle audit. Root authorized promotion of the exact V12b artifact for actual game tests and native comparison. No visual pass or release follows from these authoring results.

## Reason and scope

The expanded loaded-strike checks found that the new torso reached the two unchanged rear crown slabs, tiers 6 and 7. This was already present in V9. At contact frame 42, the worst tier-7 point reached rig Y=24.516605470; the existing 0.12 rig-unit clearance requires Y≤24.06. The measured local-Y gain was approximately 21, giving a required lowering of 0.021743116 model units. Tier 6 required 0.009341884. The affected visible vertices use original spine bones 001/009, with a small 008 influence. The original contact prefix and source body did not have this new volume defect.

The correction is a C2-continuous product of quintic falloffs in bind-space X, Y and Z. It lowers only the local upper back and transforms the existing smooth normals with the analytic inverse-transpose Jacobian. It changes no weights, pose solver, bones, mounts, contacts or gameplay values. The canonical accepted candidate configuration is **`scripts/beast-integration/back-contour-v2.json`**. The older v1 configuration remains only to reproduce the rejected V12 artifact.

V12b's maximum actual neutral displacement is 0.0254351197 model units; serialized bind-position lowering is at most 0.0254350901. The configured field has a 0.03 maximum, but the existing vertices do not reach its full Y plateau. The field's minimum Jacobian determinant is 0.388587782, with finite-difference gradient error below 3.17e-10. All 849 retained per-vertex constraints from the two phase diagnostics are satisfied; the minimum additional lowering reserve is 0.003692002 model units for tier 7. These conservative stored constraints do not replace checks of all actual animated triangles.

## Preservation and geometry audit

The serialized candidate changes 905 positions and 914 normals, all appended upper-back vertices weighted only to Bone_001, Bone_008 and Bone_009. The difference between these counts comes from float32 rounding of extremely small position changes. Head, tail, display limbs, visible exact contact copies, the original 85,568 attribute prefixes, all weights, indices, all 66 joint nodes and inverse binds are unchanged from the input. V11b's UVs, material definitions and all original PBR image payloads are exact. Every binary byte outside the permitted position/normal entries is exact. Other JSON changes are limited to the truthful correction metadata and accessor bounds.

All 1,670 affected triangles retain their winding and remain nondegenerate. The minimum old/new face-normal cosine is 0.224298075; minimum area ratio is 0.392397566. No winding or contact tolerance was relaxed. The independent audit is `artifacts/beast-integration/authoring/back-contour-v12b-verification.json`, produced by `scripts/beast-integration/verify-back-contour.py` with exit 0. It also confirms that the active asset was still exact V10c at audit time; the later integration promotion is a separate action.

## Reproduction and identities

The candidate is `artifacts/beast-integration/authoring/titanhorn-rigged-v12b.glb`, 16,466,140 bytes, SHA-256 `526f96ce96552638cd45e80698388833fdfa32d76d5f26c43a7ebc6ff7533a80`.

Its input is the unchanged V11b UV candidate, SHA-256 `66caf8f1dfea697825b8e14659399b3f7b6ecb6560294b47ebd30664e9a9175f`. The canonical `scripts/beast-integration/project-paw-uvs.py` is a byte-exact copy of the preserved V11b artifact generator, SHA-256 `d5047d81ea256cafc79383ad8a208e0b890e8326cd90bbd094a540afbc0effa4`. See [the UV record](BEAST_PAW_UV_2026-10-21.md) for its source/input hashes, generation command and preservation audit. The original Meshy images remain untouched.

The contour generator SHA-256 is `73a6e7c5316851a0791a80da3af9d18b74623d55607a30a46129d52f252ba68e`; its v2 configuration SHA-256 is `3ffee8952e3165aa42bc51f95ccdac3ebdebb2abb28de10bf73d6a3c3b83aa3e`. The independent verifier SHA-256 is `9d520a86b6dc41d1c3b19f5e9849384e9e643291f9eaace79c522e41f2c4c517`. Full input identities and exact arguments are recorded in `back-contour-v12b.json` and `back-contour-v12b-verification.json` beside the asset.

Working directory: `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`. `python` below abbreviates the actual executable `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`. For a fresh reproduction, choose new output/report paths because existing evidence is protected. A second clean reproduction has not been run.

```powershell
python scripts/beast-integration/refine-back-contour.py --input artifacts/beast-integration/authoring/titanhorn-paw-uv-v11b.glb --pose scripts/beast-integration/reference-neutral-pose.json --config scripts/beast-integration/back-contour-v2.json --diagnosis artifacts/beast-integration/systems/loaded-strike-torso-phases-v10c.json --diagnosis artifacts/beast-integration/systems/loaded-strike-torso-tier6-phases-v10c.json --output artifacts/beast-integration/authoring/titanhorn-rigged-v12b.glb --report artifacts/beast-integration/authoring/back-contour-v12b.json --deps artifacts/art-remake/mesh-experiments/python

python scripts/beast-integration/verify-back-contour.py --input artifacts/beast-integration/authoring/titanhorn-paw-uv-v11b.glb --candidate artifacts/beast-integration/authoring/titanhorn-rigged-v12b.glb --active assets/beast-integration/titanhorn-rigged.glb --report artifacts/beast-integration/authoring/back-contour-v12b-verification.json --deps artifacts/art-remake/mesh-experiments/python
```

Generation ran at 10:00:17.549256–10:00:17.722020 UTC, exit 0, with tool wall duration 0.3957725 seconds. Verification ran at 10:00:18.093043–10:00:18.199917 UTC, exit 0, tool wall duration 0.3077276 seconds. The verifier's active-V10c assertion is an explicit pre-promotion preservation guard; it is not intended to be silently relabelled after promotion.

## Retained attempts and remaining checks

The first mask was rejected before producing an asset because it included tail-base and hind-leg influences. Its exact script/config are preserved as `refine-back-contour-attempt01.py` and `back-contour-mask-attempt01.json` under authoring artifacts. V12 then passed byte/locality checks but failed one thin triangle's winding comparison, cosine −0.003109841. Its asset, generation report and failed verification remain unchanged. V12b softens the Y transition and passes the same unchanged independent winding check. The detailed record is `back-contour-attempt-ledger.json` in that directory.

The actual loaded-strike sequence across all six target types, all occupied deck slabs, harness and native PBR appearance remain integration responsibilities. Root's separate display-pole adjustment fixes a forearm route; it is not part of this asset correction. The pending paw UV candidate still needs a matched native comparison. Authoring data checks do not establish art acceptance, physical-device coverage or release readiness.
