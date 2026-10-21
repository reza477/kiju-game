"""Bounded C2 upper-back correction; preserve all rig, contacts, UVs and PBR bytes."""
from pathlib import Path
import argparse
import copy
import datetime
import hashlib
import json
import struct
import sys

parser = argparse.ArgumentParser(description=__doc__)
for key in ('input', 'pose', 'config', 'output', 'report'):
    parser.add_argument('--' + key, type=Path, required=True)
parser.add_argument('--diagnosis', type=Path, action='append', required=True)
parser.add_argument('--deps', type=Path)
args = parser.parse_args()
if args.deps:
    sys.path.insert(0, str(args.deps.resolve()))
import numpy as np

started = datetime.datetime.now(datetime.timezone.utc).isoformat()
sha = lambda value: hashlib.sha256(value).hexdigest()
for path in (args.output, args.report):
    if path.exists():
        raise FileExistsError(path)
    path.parent.mkdir(parents=True, exist_ok=True)

def load(path):
    raw = path.read_bytes()
    assert struct.unpack_from('<III', raw) == (0x46546c67, 2, len(raw))
    size, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4e4f534a
    binary_size, binary_kind = struct.unpack_from('<II', raw, 20 + size)
    assert binary_kind == 0x004e4942 and binary_size == len(raw) - 28 - size
    return raw, json.loads(raw[20:20 + size]), raw[28 + size:]

def accessor(doc, binary, index):
    entry = doc['accessors'][index]
    view = doc['bufferViews'][entry['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[entry['type']]
    dtype = np.dtype({5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[entry['componentType']])
    return np.ndarray((entry['count'], width), dtype, binary,
                      offset=view.get('byteOffset', 0) + entry.get('byteOffset', 0),
                      strides=(view.get('byteStride', width * dtype.itemsize), dtype.itemsize))

def quintic(value, bounds):
    lo, hi = bounds
    assert hi > lo
    t = np.clip((value - lo) / (hi - lo), 0, 1)
    weight = t ** 3 * (10 + t * (-15 + 6 * t))
    derivative = 30 * t ** 2 * (1 - t) ** 2 / (hi - lo)
    return weight, derivative

raw, original, binary = load(args.input)
doc = copy.deepcopy(original)
config_raw = args.config.read_bytes()
config = json.loads(config_raw)
assert config['version'] == 1
assert 0 < config['maximumLowering'] <= 0.03
primitive = doc['meshes'][0]['primitives'][0]
attributes = primitive['attributes']
extra = doc['meshes'][0]['extras']
assert extra['sourceContactVertices'] == 85568
assert len(doc['skins'][0]['joints']) == 66
assert extra['pawUVProjection']['version'] == 1
positions = accessor(doc, binary, attributes['POSITION']).astype(float)
normals = accessor(doc, binary, attributes['NORMAL']).astype(float)
joints = accessor(doc, binary, attributes['JOINTS_0'])
weights = accessor(doc, binary, attributes['WEIGHTS_0'])
indices = accessor(doc, binary, primitive['indices']).reshape(-1, 3)
visible = np.zeros(len(positions), dtype=bool)
visible[np.unique(indices)] = True
protected = np.arange(len(positions)) < 85568
protected[extra['interiorContactCopies']['visibleVertexIds']] = True
for hull in extra['visibleContactHulls'].values():
    protected[hull['visibleVertexIds']] = True

def field(points):
    x0, dx0 = quintic(points[:, 0], config['xRise'])
    x1, dx1 = quintic(points[:, 0], config['xFall'])
    fy, dy = quintic(points[:, 1], config['yRise'])
    z0, dz0 = quintic(points[:, 2], config['zRise'])
    z1, dz1 = quintic(points[:, 2], config['zFall'])
    fx, fz = x0 * (1 - x1), z0 * (1 - z1)
    dx = dx0 * (1 - x1) - x0 * dx1
    dz = dz0 * (1 - z1) - z0 * dz1
    amount = config['maximumLowering']
    lowering = amount * fx * fy * fz
    gradient = amount * np.stack((dx * fy * fz, fx * dy * fz, fx * fy * dz), axis=1)
    return lowering, gradient

lowering, gradient = field(positions)
eligible = visible & ~protected
lowering[~eligible] = 0
gradient[~eligible] = 0
changed = lowering > 1e-12
assert changed.any()
names = [doc['nodes'][node]['name'] for node in doc['skins'][0]['joints']]
used_bones = sorted({names[int(j)] for row_j, row_w in zip(joints[changed], weights[changed])
                     for j, w in zip(row_j, row_w) if w > 1e-6})
assert set(used_bones) <= {'Bone_001', 'Bone_009', 'Bone_008'}, used_bones

# F(x,y,z) = (x, y-d(x,y,z), z); det(J) = 1-d_y.
# Transform the existing smooth normals by J^-T, retaining the original
# authored smoothing and source UV seams rather than recomputing face normals.
jacobian = np.repeat(np.eye(3)[None], int(changed.sum()), axis=0)
jacobian[:, 1, :] -= gradient[changed]
determinants = np.linalg.det(jacobian)
assert determinants.min() > 0.3
result_positions = positions.copy()
result_positions[:, 1] -= lowering
result_normals = normals.copy()
result_normals[changed] = np.linalg.solve(jacobian.transpose(0, 2, 1), normals[changed, :, None])[:, :, 0]
result_normals[changed] /= np.linalg.norm(result_normals[changed], axis=1)[:, None]
assert np.isfinite(result_positions).all() and np.isfinite(result_normals).all()

# Verify the analytic derivative independently with central differences.
sample = positions[changed][::max(1, int(changed.sum()) // 100)]
finite_gradient = np.empty_like(sample)
for axis in range(3):
    delta = np.zeros_like(sample)
    delta[:, axis] = 1e-6
    finite_gradient[:, axis] = (field(sample + delta)[0] - field(sample - delta)[0]) / 2e-6
gradient_error = float(np.max(np.abs(finite_gradient - field(sample)[1])))
assert gradient_error < 1e-7
normal_roundtrip = np.einsum('nij,nj->ni', jacobian.transpose(0, 2, 1), result_normals[changed])
normal_roundtrip /= np.linalg.norm(normal_roundtrip, axis=1)[:, None]
old_unit = normals[changed] / np.linalg.norm(normals[changed], axis=1)[:, None]
assert np.max(np.abs(normal_roundtrip - old_unit)) < 1e-12

pose_raw = args.pose.read_bytes()
pose = json.loads(pose_raw.decode('utf-8-sig'))
pose_by_name = {bone['name']: np.array(bone['skinMatrix']).reshape(4, 4).T for bone in pose['joints']}
neutral_matrices = np.array([pose_by_name.get(name, np.eye(4)) for name in names])
neutral = (neutral_matrices[joints[changed]] * weights[changed, :, None, None]).sum(1)
neutral_delta = np.einsum('nij,nj->ni', neutral[:, :3, :3], result_positions[changed] - positions[changed])
# On this torso patch the original neutral skin transforms are translation-only
# within floating-point tolerance; bind-space normal Jacobians therefore also
# describe the authored neutral surface, without the inverse-rig distortion
# encountered on the display limbs.
rotation_deviation = float(np.max(np.abs(neutral[:, :3, :3] - np.eye(3))))
assert rotation_deviation < 1e-5

constraints = []
for path in args.diagnosis:
    evidence_raw = path.read_bytes()
    evidence = json.loads(evidence_raw)
    samples = [v for case in evidence['cases'] for v in case['lowering']['vertices']]
    deficits = [float(v['requiredLocalYLowering'] - lowering[v['id']]) for v in samples]
    for vertex in samples:
        assert np.max(np.abs(positions[vertex['id']] - vertex['bind'])) < 1e-12
    assert max(deficits, default=0) <= 0
    constraints.append({'path': str(path), 'sha256': sha(evidence_raw), 'sampledVertexConstraints': len(samples),
                        'maximumUnmetLowering': max(deficits, default=0),
                        'maximumRequiredLowering': max((v['requiredLocalYLowering'] for v in samples), default=0)})

updated = bytearray(binary)
allowed = np.zeros(len(binary), dtype=bool)
for name, values in [('POSITION', result_positions), ('NORMAL', result_normals)]:
    entry = doc['accessors'][attributes[name]]
    view = doc['bufferViews'][entry['bufferView']]
    offset = view.get('byteOffset', 0) + entry.get('byteOffset', 0)
    stride = view.get('byteStride', 12)
    for index in np.flatnonzero(changed):
        at = offset + int(index) * stride
        struct.pack_into('<fff', updated, at, *values[index])
        allowed[at:at + 12] = True
    entry['min'] = accessor(doc, updated, attributes[name]).min(axis=0).astype(float).tolist()
    entry['max'] = accessor(doc, updated, attributes[name]).max(axis=0).astype(float).tolist()
assert np.array_equal(np.frombuffer(binary, 'u1')[~allowed], np.frombuffer(updated, 'u1')[~allowed])

metadata = {'version': 1, 'method': 'C2 quintic upper-back lowering with inverse-transpose Jacobian normals',
            'inputSha256': sha(raw), 'config': config, 'configSha256': sha(config_raw),
            'referenceNeutralPoseSha256': sha(pose_raw), 'changedVertices': int(changed.sum()),
            'maximumBindLowering': float(lowering.max()),
            'changedOriginalBounds': [positions[changed].min(0).tolist(), positions[changed].max(0).tolist()],
            'positionsChangedOnlyOnAppendedTorso': True, 'weightsRigContactsUVsPBRUnchanged': True}
extra['backContourCorrection'] = metadata
encoded = json.dumps(doc, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
output = (struct.pack('<III', 0x46546c67, 2, 28 + len(encoded) + len(updated))
          + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
          + struct.pack('<II', len(updated), 0x004e4942) + updated)
args.output.write_bytes(output)

report = {'startedAt': started, 'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'command': sys.argv, 'generatorSha256': sha(Path(__file__).read_bytes()),
          'input': str(args.input), 'inputSha256': sha(raw), 'output': str(args.output),
          'outputSha256': sha(output), 'outputBytes': len(output), 'correction': metadata,
          'usedBones': used_bones, 'maximumNeutralDisplacement': float(np.linalg.norm(neutral_delta, axis=1).max()),
          'minimumJacobianDeterminant': float(determinants.min()), 'analyticGradientMaximumError': gradient_error,
          'neutralLinearTransformMaximumDeviationFromIdentity': rotation_deviation,
          'diagnosticConstraints': constraints,
          'limitations': ['The input already contains the pending V11b paw UV projection.',
                         'Stored per-vertex lowering constraints are checked; all actual animated triangles, harness surfaces and native appearance still require integration checks.',
                         'This artifact is not a promoted asset or accepted visual release.']}
args.report.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({key: report[key] for key in ('output', 'outputSha256', 'outputBytes', 'maximumNeutralDisplacement',
                                            'minimumJacobianDeterminant', 'analyticGradientMaximumError', 'usedBones')}))
