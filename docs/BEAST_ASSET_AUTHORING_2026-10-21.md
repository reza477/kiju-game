# Titanhorn asset authoring and reproduction

Status recorded on 21 October 2026: V9 is the integrated test candidate. V10c is an unpromoted, local elbow-fairing candidate. Neither is an accepted visual release. The owner authorized this new beast integration and a new independent review cycle; historical remake failures remain recorded separately.

## Immutable inputs and private origin

The original export is `asset-sources/meshy-beast-2026-10-20/Meshy_AI_Titanhorn_1021061157_texture.glb`, 21,414,880 bytes, SHA-256 `46bf950200c1740c10c9a868da13780bf6c6a7bd9790706c30a55688394c1750`. Its saved [provenance](../asset-sources/meshy-beast-2026-10-20/provenance.json) records Meshy 7.1 Flagship, High Detail, Ultra 2K, private generation and export with Resize disabled. This document relies on that preserved generation evidence; no new Meshy access, publication or license change occurred during rigging. The original stays untouched.

The existing contact rig is `assets/carriers/meshy/flesh.glb`, SHA-256 `b9dcc002b95c6495522a8b2a7ec8a27fb88de7add8a2e0265a34177b3a9c872f`. The authoring reference is `scripts/beast-integration/reference-neutral-pose.json`, SHA-256 `b266a9437f10bafad1716dcaecc7a6e14a58c1707bcdd391e892d479ea1d13c7`, captured using the actual original procedural controller. The four display-chain definitions are `scripts/beast-integration/display-limb-rig-v2.json`, SHA-256 `22fa37581bb687a6aa6b4f6108af6aaa768e6cac9605773c2734075e138ae185`; this is an exact copy of the authoring proposal used by V9.

The three embedded 2048×2048 JPEG payloads remain byte-exact in the derivatives:

| Map | SHA-256 |
| --- | --- |
| Base colour | `d930c5cec47009ab7ddad20268e17fa5feaa3353f95ae1c7662bb18e6c374c78` |
| Metallic/roughness | `175397d4cb625307a818b99fafc39e3409e2e71ff8ce980dd6dafeb8137cb12f` |
| Normal | `7e784437f20fa09200b68313cc2ba56f9620a5cdd520ed4055d13a8389f8eaab` |

## Output contract

Both candidates have one mesh/skin, 150,731 vertices, 100,506 indexed triangles, 66 joints and no animation clips. The source-derived body has 100,000 triangles; 506 visible closed paw-hull triangles preserve the original terminal contacts. The first 85,568 position, normal, UV, joint and weight entries remain the exact original contact pool. The original 54 joint nodes, order, hierarchy, rest transforms and inverse binds remain exact. Twelve declared display-only joints provide four stable anatomical two-link chains; their targets follow the original paws after the original solver has finished. They do not change simulation state or numerical attack contacts.

Mesh extras declare `authoredFlesh`, `riggedBeast`, `newMeshyBeast`, `sourceContactVertices`, exact visible-hull and interior-contact correspondences, and `displayLimbRig` version 1. The display root offsets and lengths are fixed by the V9 metadata. V9 includes 12,126 additional body vertices that copy exact original contact positions and weights. The original texture atlases and body UVs are retained; paw hull faces transfer nearby source-foot UV triangles. That transfer can stretch locally and is not a new texture painting.

## Executed authoring commands

Working directory for these commands was `C:\Users\user\.codex\worktrees\kaiju-art-remake\Kiju Game`. The Python executable was `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`; the abbreviated `python` below names that exact executable. Commands refuse existing output paths. These are historical commands, not instructions to overwrite their retained evidence.

```powershell
node scripts/beast-integration/simplify-source.mjs --input asset-sources/meshy-beast-2026-10-20/Meshy_AI_Titanhorn_1021061157_texture.glb --output artifacts/beast-integration/authoring/titanhorn-simplified-v1.glb --report artifacts/beast-integration/authoring/simplification-v1.json --triangles 100000

python scripts/beast-integration/rig-titanhorn.py --mesh artifacts/beast-integration/authoring/titanhorn-simplified-v1.glb --rig assets/carriers/meshy/flesh.glb --pose scripts/beast-integration/reference-neutral-pose.json --display-rig artifacts/beast-integration/authoring/display-limb-rig-v2-proposal.json --output artifacts/beast-integration/authoring/titanhorn-rigged-v9.glb --report artifacts/beast-integration/authoring/rigging-v9.json --deps artifacts/art-remake/mesh-experiments/python

python scripts/beast-integration/rig-titanhorn.py --mesh artifacts/beast-integration/authoring/titanhorn-simplified-v1.glb --rig assets/carriers/meshy/flesh.glb --pose scripts/beast-integration/reference-neutral-pose.json --display-rig scripts/beast-integration/display-limb-rig-v2.json --elbow-fairing --output artifacts/beast-integration/authoring/titanhorn-rigged-v10c.glb --report artifacts/beast-integration/authoring/rigging-v10c.json --deps artifacts/art-remake/mesh-experiments/python
```

Simplification ran at 06:54:58.205–06:54:58.631 UTC; V9 generation at 08:13:02.900854–08:13:04.643357 UTC; V10c at 08:28:53.730660–08:28:56.367081 UTC. The recorded tool executions exited 0. Full command strings and input/output hashes are preserved in the named JSON reports. The simplified input remains at the recorded artifact path: 10,447,844 bytes, SHA-256 `697b53d8e64e818ac407806ae347e200b9341c5eff9663fe62079671efa7ee04`.

The V9 generator SHA-256 was `db886dcb7b78a3d6aaab283e5cfd8eb50b5042cfaee4bd2da75ed6c132ac3c8b`; its exact source is preserved as `artifacts/beast-integration/authoring/rig-titanhorn-v9.py`. The V10c generator SHA-256 is `f57afdb366302d27235ba9b7b0356997d201c20620df777f015be439b3472837`. To reproduce a particular historical result, use its recorded generator version and unchanged inputs with new output/report names. V9 and V10c have not received a second clean reproduction run. An earlier V8 generator was reproduced byte-for-byte; that separate result is not proof of V9 or V10c reproduction.

Versions observed on the same installed runtime after authoring: Node v24.18.0, Three 0.185.1 (including its bundled Meshopt simplifier), Python 3.12.14, NumPy 2.3.5 and SciPy 1.18.1. The original command reports did not embed dependency versions; the later observation is explicitly recorded in `artifacts/beast-integration/authoring/authoring-runtime-versions-2026-10-21.json`. Python dependencies are available in the preserved isolated target `artifacts/art-remake/mesh-experiments/python`; they are not embedded in the game asset.

## Candidate identities and current evidence

| Candidate | SHA-256 | Status at this document's creation |
| --- | --- | --- |
| V9 | `9efd7ff1781a62d22ae645f20b20dc2fa08ba46322f22915fc652ff9bbb7ea9c` | Integrated at `assets/beast-integration/titanhorn-rigged.glb`; 16,452,044 bytes |
| V10c | `ea3f0dff1a2cef1d6061a3a06492eb157892897d953315ed658c72da477494ea` | Artifact only at `artifacts/beast-integration/authoring/titanhorn-rigged-v10c.glb`; 16,452,044 bytes |

`authoring/integration-v9.json` verifies original-prefix, original-bone, inverse-bind, PBR, visible-hull and interior-contact preservation. `systems/focused-attempt06-v9.json` records 12/13 focused checks passing: all 20 decks across 31 poses, all visible terrain vertices across 360 frames (23,458,680 vertex checks, minimum clearance +0.004011706 m), and all six actual combat targets pass. That run's harness crossing fails; later harness work has its own evidence and is not retroactively included here. Paths beginning `authoring/` or `systems/` in this paragraph are beneath `artifacts/beast-integration/`.

V10c smooths only the forelimb elbow profile and weight handoff after the completed V9 saddle fit. Its actual neutral maximum displacement is 0.022000104 model units, within the 0.022 cap plus float32 allowance. It retains all UVs, PBR payloads, indices, 66 nodes/inverse binds, mesh metadata, exact visible paw hulls and interior contacts. Upper torso above model Y=0.89 and hindquarters/tail below model Z=-0.16 are unchanged within 1e-6. See `authoring/v10c-locality-verification-clarified.json`, which preserves the raw audit measurements and corrects its threshold label and pose-count wording; the original audit remains unchanged.

V10c has successful standing and walk-frame-180 CPU exports using the actual runtime controller, recorded in `neutral-pose-v10c.json` and `walk180-pose-v10c.json`. It has no full clearance suite, strike export or native PBR comparison yet. Earlier V10 and V10b attempts were rejected before promotion because local-operation ordering caused a larger-than-intended displacement. A V10b strike export also failed during the then-current harness setup at station -13.6, section 27. The attempts, missing timing metadata and error are retained in `authoring/v10-authoring-attempt-ledger.json`; none changed the active asset.

The CPU preview tool shows a flat authoring render without the native PBR normal-map lighting. It cannot establish appearance acceptance. Native normal-HUD motion, full-capacity views, the completed harness checks and the independent art review remain required. No physical-device, sustained-performance, hosted-delivery or release claim follows from this authoring work.

## Promotion note — 21 October 2026

After the frozen V9 checks ended and root released the source, V10c was copied unchanged to `assets/beast-integration/titanhorn-rigged.glb`. The active asset is now 16,452,044 bytes, SHA-256 `ea3f0dff1a2cef1d6061a3a06492eb157892897d953315ed658c72da477494ea`. V9 remains preserved at its original authoring path and hash. `artifacts/beast-integration/authoring/integration-v10c.json` records the actual promotion timestamps, verified input hashes, identical embedded rig/contact metadata and supporting audit identities. Earlier status paragraphs above describe their recorded stage and have not been retroactively rewritten.

Before promotion, V10c's actual crawler-standard strike42 export succeeded after the harness setup was corrected. Its contact error was 0.000029681 m; all 66 posed bone matrices, original contact-prefix positions and visible paw positions were exactly equal to V9. Only authored elbow vertices changed. The largest local strike surface difference was 0.139939789 model units: the 0.022 cap applies to the neutral authored shape, not every animated pose. Exact original asset hashes, the original 54 bone records/inverse binds, original contact attributes and PBR payloads were independently checked again in `artifacts/beast-integration/authoring/v10c-strike-verification.json`; command timing and exit metadata are in `v10c-strike-followup.json` beside it.

This promotion establishes a new test candidate only. Full V10c geometry/harness checks, native appearance comparison and the independent visual gate remain pending; the earlier V9 passes are not relabelled as V10c results.
