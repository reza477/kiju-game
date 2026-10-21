# Titanhorn paw UV candidate — 21 October 2026

V11b is an artifact-only UV candidate, awaiting a native before/after comparison. It has not replaced the active V10c asset and is not an accepted art release. This is a bounded material-projection change; it does not address the coarse paw silhouette, torso anatomy, saddle harness or newly identified loaded-strike deck clearance failures.

## Evidence and design

The V10c audit found no duplicate-position normal discontinuities on the appended paw hulls: all corresponding normals were identical, and there were no distinct source positions within 1e-5 model units. A normals-only seam repair was therefore unwarranted. It did find UV jumps larger than one 2048-atlas texel on 747 of 759 shared hull edges. The old per-triangle transfer sampled unrelated pieces of the original foot atlas.

V11b replaces that transfer with six directional charts per paw: top, sole and four sides. Each chart projects a continuous neutral-pose coordinate frame into a padded rectangle contained entirely in the corresponding original Meshy foot texture region. Adjacent triangles inside a chart now share exact UV coordinates; seams remain at the justified directional chart boundaries. The 24 selected patches have sides from 38 to 146 pixels in the unchanged 2048-pixel atlases. This reuses authentic foot material, but does not reconstruct the source model's detailed toe illustration on the different contact-hull topology.

The first internal V11 projection selected very small dorsal patches, 10–18 pixels on some axes. It was retained as an unpromoted prototype and superseded by V11b, which includes rounded source faces with a positive directional normal component. Target chart boundaries remain deterministic. Neither candidate changed the active asset.

## Exact identities and preservation

| Item | SHA-256 | Bytes |
| --- | --- | ---: |
| Active V10c / candidate input | `ea3f0dff1a2cef1d6061a3a06492eb157892897d953315ed658c72da477494ea` | 16,452,044 |
| Pending V11b | `66caf8f1dfea697825b8e14659399b3f7b6ecb6560294b47ebd30664e9a9175f` | 16,465,124 |
| V11b generator | `d5047d81ea256cafc79383ad8a208e0b890e8326cd90bbd094a540afbc0effa4` | See retained file |

The candidate is `artifacts/beast-integration/authoring/titanhorn-paw-uv-v11b.glb`; its generator is `project-paw-uvs-v2.py` in the same directory. Only the UVs of 1,518 appended paw corners and truthful projection metadata differ from V10c. The verification proves exact preservation of all positions, normals, joint indices, weights, triangle indices, all original 85,568 attribute prefixes including UVs, all 66 joint nodes and inverse binds, material/texture/sampler definitions and all embedded PBR image payloads. Every binary byte outside the permitted appended UV entries is identical. All other GLB JSON is identical after excluding the new projection metadata and its updated UV-strategy description. No tangent attribute was introduced.

The candidate has zero UV-area degeneracies. All 604 internal chart edges are exactly continuous; the remaining 155 of 759 edges are directional chart seams. The original 747 discontinuities are thus reduced to 155 without any geometric, skinning or numerical-contact change. These are data-preservation and continuity results, not a visual quality score.

## Reproduction and retained audit

The working directory was `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`. The Python executable was `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe` (abbreviated below). The generation report records the exact arguments, input hashes, generator hash and output hash. Use new output/report names for a reproduction: the generator refuses to overwrite retained outputs. A second clean reproduction of V11b has not been run.

```powershell
python artifacts/beast-integration/authoring/project-paw-uvs-v2.py --input artifacts/beast-integration/authoring/titanhorn-rigged-v10c.glb --source artifacts/beast-integration/authoring/titanhorn-simplified-v1.glb --neutral artifacts/beast-integration/authoring/titanhorn-neutral-v10c.glb --output artifacts/beast-integration/authoring/titanhorn-paw-uv-v11b.glb --report artifacts/beast-integration/authoring/paw-uv-v11b.json --deps artifacts/art-remake/mesh-experiments/python
```

Generation completed at 09:45:14.963622–09:45:15.961784 UTC. The successful verification ran at 09:46:39.378492–09:46:39.460862 UTC, exit 0. Its checker is `verify-paw-uv-v11b.py`; `paw-uv-v11b-verification.json` contains every preservation assertion, chart counts and original PBR hashes. The check emitted a NumPy two-dimensional-cross-product deprecation warning; it did not fail. The preliminary shading audit is `v10c-paw-shading-audit.json` and its script is `audit-v10c-paw-shading.py`. All these paths are beneath `artifacts/beast-integration/authoring/` and remain unchanged.

The source Meshy export, simplified input and original rig provenance are documented in [the asset authoring record](BEAST_ASSET_AUTHORING_2026-10-21.md). No new Meshy generation, image editing, original asset modification or publication occurred in this UV pass.

## CPU previews and limits

`make-v11b-posed-previews.py` copied the candidate's UVs onto the already preserved V10c neutral and strike-frame-42 CPU exports. It did not evaluate the game controller again. `paw-uv-v11b-preview-provenance.json` records their source/output hashes and exact posed-position equality. That operation completed at 09:48:01.132077–09:48:01.400535 UTC, exit 0.

The following preview commands completed with exit 0, with tool wall durations 1.3805564 and 1.3857205 seconds respectively. Their exact start/end timestamps were not recorded.

```powershell
python scripts/beast-integration/preview-asset.py --input artifacts/beast-integration/authoring/titanhorn-neutral-paw-uv-v11b.glb --output-dir artifacts/beast-integration/authoring/preview-neutral-paw-uv-v11b
python scripts/beast-integration/preview-asset.py --input artifacts/beast-integration/authoring/titanhorn-strike42-paw-uv-v11b.glb --output-dir artifacts/beast-integration/authoring/preview-strike42-paw-uv-v11b
```

Inspection of both three-quarter previews shows unchanged anatomy and paw silhouette, as expected. The paw material is less randomly sampled, but the simple renderer still shows large flat triangles and dark caps; it samples face-centroid albedo and omits native PBR normal-map lighting. These images do not establish that the improvement is visually sufficient. Native matched views, including the raised striking paw, are required before promotion. Geometry, harness, loaded-strike clearance and independent art acceptance remain separate checks owned by the integration work.
