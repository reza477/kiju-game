"""Independent byte preservation and geometric locality audit for a staged back correction."""
from pathlib import Path
import argparse
import copy
import datetime
import hashlib
import json
import struct
import sys

p = argparse.ArgumentParser(description=__doc__)
for key in ('input', 'candidate', 'active', 'report'):
    p.add_argument('--' + key, type=Path, required=True)
p.add_argument('--deps', type=Path)
a = p.parse_args()
if a.deps:
    sys.path.insert(0, str(a.deps.resolve()))
import numpy as np
start = datetime.datetime.now(datetime.timezone.utc).isoformat()
assert not a.report.exists()
sha = lambda value: hashlib.sha256(value).hexdigest()

def load(path):
    raw = path.read_bytes()
    size = struct.unpack_from('<I', raw, 12)[0]
    return raw, json.loads(raw[20:20 + size]), raw[28 + size:]

def accessor(d, b, i):
    e = d['accessors'][i]
    v = d['bufferViews'][e['bufferView']]
    w = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[e['type']]
    dt = np.dtype({5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[e['componentType']])
    return np.ndarray((e['count'], w), dt, b, offset=v.get('byteOffset', 0) + e.get('byteOffset', 0),
                      strides=(v.get('byteStride', w * dt.itemsize), dt.itemsize))

old, od, ob = load(a.input)
new, nd, nb = load(a.candidate)
active = a.active.read_bytes()
op = od['meshes'][0]['primitives'][0]
np0 = nd['meshes'][0]['primitives'][0]
oa = {k: accessor(od, ob, i) for k, i in op['attributes'].items()}
na = {k: accessor(nd, nb, i) for k, i in np0['attributes'].items()}
meta = nd['meshes'][0]['extras']['backContourCorrection']
assert meta['inputSha256'] == sha(old)
checks = {k + 'Exact': bool(np.array_equal(oa[k], na[k])) for k in oa if k not in ('POSITION', 'NORMAL')}
checks.update({k + 'Original85568PrefixExact': bool(np.array_equal(oa[k][:85568], na[k][:85568])) for k in oa})
indices = accessor(od, ob, op['indices']).reshape(-1, 3)
checks['allIndicesExact'] = bool(np.array_equal(indices, accessor(nd, nb, np0['indices']).reshape(-1, 3)))
checks['all66NodesExact'] = od['nodes'] == nd['nodes']
checks['skinsMetadataExact'] = od['skins'] == nd['skins']
checks['all66InverseBindsExact'] = bool(np.array_equal(accessor(od, ob, od['skins'][0]['inverseBindMatrices']), accessor(nd, nb, nd['skins'][0]['inverseBindMatrices'])))
changed = np.any(oa['POSITION'] != na['POSITION'], axis=1)
normal_changed = np.any(oa['NORMAL'] != na['NORMAL'], axis=1)
delta = na['POSITION'].astype(float) - oa['POSITION'].astype(float)
checks['onlyYPositionsChanged'] = bool(np.all(delta[:, [0, 2]] == 0))
checks['loweringBoundedAndNonpositive'] = bool(delta[:, 1].max() == 0 and delta[:, 1].min() >= -0.0280001)
config = meta['config']
pos = oa['POSITION']
support = ((pos[:, 0] > config['xRise'][0]) & (pos[:, 0] < config['xFall'][1])
           & (pos[:, 1] > config['yRise'][0]) & (pos[:, 2] > config['zRise'][0]) & (pos[:, 2] < config['zFall'][1]))
checks['allChangesInsideDeclaredSupport'] = bool(np.all(support[changed | normal_changed]))
extra = od['meshes'][0]['extras']
contact_ids = np.array(extra['interiorContactCopies']['visibleVertexIds'] + [v for hull in extra['visibleContactHulls'].values() for v in hull['visibleVertexIds']])
checks['allVisibleContactAttributesExact'] = all(np.array_equal(oa[k][contact_ids], na[k][contact_ids]) for k in oa)
names = [nd['nodes'][i]['name'] for i in nd['skins'][0]['joints']]
allowed_joints = [i for i, name in enumerate(names) if name in ('Bone_001', 'Bone_008', 'Bone_009')]
torso = np.all(np.isin(oa['JOINTS_0'], allowed_joints) | (oa['WEIGHTS_0'] <= 1e-6), axis=1)
checks['onlySpineWeightedVerticesChanged'] = bool(np.all(torso[changed | normal_changed]))
checks['allOtherAnatomyAttributesExact'] = all(np.array_equal(oa[k][~torso], na[k][~torso]) for k in oa)
checks['changedNormalsFiniteUnitLength'] = bool(np.isfinite(na['NORMAL']).all() and np.max(np.abs(np.linalg.norm(na['NORMAL'][normal_changed], axis=1) - 1)) < 2e-7)

affected_faces = np.any(changed[indices], axis=1)
tri = indices[affected_faces]
old_cross = np.cross(pos[tri[:, 1]].astype(float) - pos[tri[:, 0]], pos[tri[:, 2]].astype(float) - pos[tri[:, 0]])
newpos = na['POSITION']
new_cross = np.cross(newpos[tri[:, 1]].astype(float) - newpos[tri[:, 0]], newpos[tri[:, 2]].astype(float) - newpos[tri[:, 0]])
old_area = np.linalg.norm(old_cross, axis=1)
new_area = np.linalg.norm(new_cross, axis=1)
cosine = np.einsum('ij,ij->i', old_cross, new_cross) / np.maximum(old_area * new_area, 1e-30)
checks['affectedTrianglesKeepWinding'] = bool(np.all(cosine > 0))
checks['affectedTrianglesNondegenerate'] = bool(np.all(new_area > 1e-12))

allowed_bytes = np.zeros(len(ob), dtype=bool)
for name in ('POSITION', 'NORMAL'):
    entry = od['accessors'][op['attributes'][name]]
    view = od['bufferViews'][entry['bufferView']]
    at = view.get('byteOffset', 0) + entry.get('byteOffset', 0)
    for index in np.flatnonzero(changed | normal_changed):
        offset = at + int(index) * view.get('byteStride', 12)
        allowed_bytes[offset:offset + 12] = True
checks['allOtherBinaryBytesExact'] = bool(len(ob) == len(nb) and np.array_equal(np.frombuffer(ob, 'u1')[~allowed_bytes], np.frombuffer(nb, 'u1')[~allowed_bytes]))
comparable = copy.deepcopy(nd)
del comparable['meshes'][0]['extras']['backContourCorrection']
for name in ('POSITION', 'NORMAL'):
    index = np0['attributes'][name]
    for key in ('min', 'max'):
        if key in od['accessors'][index]:
            comparable['accessors'][index][key] = od['accessors'][index][key]
        else:
            comparable['accessors'][index].pop(key, None)
checks['allOtherJSONExact'] = comparable == od
image_hashes = []
for image in od['images']:
    view = od['bufferViews'][image['bufferView']]
    offset = view.get('byteOffset', 0)
    image_hashes.append(sha(ob[offset:offset + view['byteLength']]))
checks['activeStillExactV10c'] = sha(active) == 'ea3f0dff1a2cef1d6061a3a06492eb157892897d953315ed658c72da477494ea'
report = {'startedAt': start, 'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'command': sys.argv, 'verifierSha256': sha(Path(__file__).read_bytes()),
          'inputSha256': sha(old), 'candidateSha256': sha(new), 'candidateBytes': len(new),
          'activeSha256': sha(active), 'checks': checks, 'changedPositionVertices': int(changed.sum()),
          'changedNormalVertices': int(normal_changed.sum()), 'maximumActualBindLowering': float(-delta[:, 1].min()),
          'affectedTriangles': int(affected_faces.sum()), 'minimumAffectedTriangleAreaRatio': float((new_area / old_area).min()),
          'minimumAffectedTriangleNormalCosine': float(cosine.min()), 'PBRImageHashes': image_hashes,
          'limitations': ['Actual loaded-strike triangle clearance, harness fit and native PBR appearance are not evaluated by this preservation audit.']}
a.report.write_text(json.dumps(report, indent=2) + '\n')
assert all(checks.values()), [key for key, value in checks.items() if not value]
print(json.dumps({key: report[key] for key in ('candidateSha256', 'changedPositionVertices', 'changedNormalVertices', 'maximumActualBindLowering', 'affectedTriangles', 'minimumAffectedTriangleAreaRatio', 'minimumAffectedTriangleNormalCosine')}))
