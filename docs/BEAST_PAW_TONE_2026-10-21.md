# Titanhorn single-chart tonal correction — 21 October 2026

V13 is an artifact-only candidate, awaiting native comparison and root-controlled promotion. It keeps V12b's entire geometry and back correction. Exactly 42 UV entries on 14 front-left paw +Z faces change; all other UV entries and every other mesh attribute remain exact.

The native V12b front/side comparison showed that coherent UV charts removed V10c's alternating triangular colour patches. One front cap remained conspicuously pale. The colour came from genuine original toe/claw texels, but the chart projection expanded that small source marking across a broad cap on one foot. It was not a geometry gap or an unchanged natural marking. The source has individual pale toes on all feet; the retained contact hull has different topology. The authorized correction selects compatible dark foot material for this one chart.

## Exact source patch

Canonical configuration: `scripts/beast-integration/paw-tone-override-v1.json`. It targets only `frontLeft / side_2positive` and affinely remaps its existing UV chart. Face assignments, chart orientation, boundaries and topology remain unchanged.

The new UV rectangle is `[0.54736328125, 0.72998046875]` to `[0.57177734375, 0.75439453125]`, a 50×50-pixel span in the original 2048×2048 maps. Its full padded rectangle is verified inside original front-left foot faces with positive Z normal component above 0.15. Base-colour mean RGB is 77.6167/59.9097/45.1726, with channel-weighted sRGB luma percentiles 41.459/60.816/88.0928. The prior patch's median was about 103.7. These are encoded pixel measurements, not linear-light luminance or a perceptual score. No image pixels are changed.

Source: the retained simplified original Meshy mesh, SHA-256 `697b53d8e64e818ac407806ae347e200b9341c5eff9663fe62079671efa7ee04`. The base-colour payload remains `d930c5cec47009ab7ddad20268e17fa5feaa3353f95ae1c7662bb18e6c374c78`; the original normal and metallic/roughness payloads are also exact. The same UV change applies consistently to all original material maps.

## Candidate and audit

- Input V12b: `526f96ce96552638cd45e80698388833fdfa32d76d5f26c43a7ebc6ff7533a80`.
- Candidate: `artifacts/beast-integration/authoring/titanhorn-rigged-v13.glb`, 16,467,728 bytes, SHA-256 `b61609b1cb0756759fe968e612ac15a70480d39998dd14a83e560357c4a3d762`.
- Canonical generator: `scripts/beast-integration/override-paw-tone.py`, SHA-256 `bfed0223a7fb651db480fb8aebd972f4aed9547262912f0a8eb98f1b20b0fa55`.
- Configuration SHA-256: `2a1324ca38a9bab1704b3c281b3e62f14143efee73dc9e694a9be52bac5e903c`.
- Canonical verifier: `scripts/beast-integration/verify-paw-tone.py`, SHA-256 `33e48ed12bb21578a3bbe4d8b0df175757abb64780da871602f874d668b1813e`.

The independent audit proves exact positions, normals, weights, indices, all 66 joints/inverse binds, all original 85,568 attribute prefixes, visible contact geometry, back-contour metadata, material definitions and image payloads. Every binary byte outside the selected 42 UV pairs is identical. Other JSON changes are limited to the one chart's patch description and truthful override metadata. All 604 internal chart edges remain exactly continuous, the existing 155 chart-boundary seams remain, and no UV triangle is degenerate. The active asset was exact V12b at audit time.

## Executed commands and provenance

Working directory: `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`. `python` below abbreviates `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`. The canonical scripts/config were copied byte-for-byte from these executed artifact versions after verification. To reproduce, use their canonical equivalents with new output/report paths; existing evidence is never overwritten. A second generation has not been run.

```powershell
python artifacts/beast-integration/authoring/override-paw-tone-v1.py --input artifacts/beast-integration/authoring/titanhorn-rigged-v12b.glb --source artifacts/beast-integration/authoring/titanhorn-simplified-v1.glb --config artifacts/beast-integration/authoring/paw-tone-override-v1.json --output artifacts/beast-integration/authoring/titanhorn-rigged-v13.glb --report artifacts/beast-integration/authoring/paw-tone-v13.json --deps artifacts/art-remake/mesh-experiments/python

python artifacts/beast-integration/authoring/verify-paw-tone-v1.py --input artifacts/beast-integration/authoring/titanhorn-rigged-v12b.glb --candidate artifacts/beast-integration/authoring/titanhorn-rigged-v13.glb --active assets/beast-integration/titanhorn-rigged.glb --report artifacts/beast-integration/authoring/paw-tone-v13-verification.json --deps artifacts/art-remake/mesh-experiments/python
```

Generation ran at 10:13:43.965812–10:13:44.090569 UTC, exit 0, tool wall duration 0.6251615 seconds. Verification ran at 10:14:42.032284–10:14:42.110942 UTC, exit 0, tool wall duration 0.289174 seconds. The reports named above preserve exact commands and source hashes. `select-dark-paw-patch-v1.py` retains the read-only rectangle search; that search did not modify images or game assets.

No runtime, browser, benchmark or new art review was run for this authoring step. Numerical shape/contact behaviour is unchanged by this UV-only correction, but the actual native tonal result still needs comparison. The existing gameplay, harness, loaded-strike and independent review work remains separate; this record makes no release claim.
