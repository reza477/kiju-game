"""Inspect rigged carrier GLBs and make strictly texture-only local derivatives.

Uses existing numpy/Pillow, never downloads or installs. The source is read-only.
Animation envelopes are CPU samples, not a claim of physical-device rendering.
"""
import argparse
import copy
import datetime
import hashlib
import io
import json
import math
from pathlib import Path
import struct
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image
import PIL


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class Glb:
    def __init__(self, path):
        self.path = Path(path).resolve()
        self.raw = self.path.read_bytes()
        require(len(self.raw) >= 28, 'Truncated GLB')
        require(struct.unpack_from('<III', self.raw) == (0x46546C67, 2, len(self.raw)), 'GLB header/length')
        chunks, offset = [], 12
        while offset < len(self.raw):
            require(offset + 8 <= len(self.raw), 'Truncated chunk header')
            length, kind = struct.unpack_from('<II', self.raw, offset)
            require(length % 4 == 0 and offset + 8 + length <= len(self.raw), 'Invalid chunk extent/alignment')
            chunks.append((kind, self.raw[offset + 8:offset + 8 + length]))
            offset += 8 + length
        require([c[0] for c in chunks] == [0x4E4F534A, 0x004E4942], 'Expected one JSON then one BIN chunk')
        self.j, self.bin = json.loads(chunks[0][1]), chunks[1][1]
        j = self.j
        require(j['asset']['version'] == '2.0' and len(j['buffers']) == 1, 'Unsupported glTF structure')
        require(not j.get('extensionsUsed') and not j.get('extensionsRequired'), 'Extensions require explicit support')
        require(not j['buffers'][0].get('uri'), 'External buffer not supported')
        require(0 <= len(self.bin) - j['buffers'][0]['byteLength'] <= 3, 'BIN declared length mismatch')
        self.cache = {}
        for v in j.get('bufferViews', []):
            require(v.get('buffer', 0) == 0 and v.get('byteOffset', 0) >= 0 and v['byteLength'] > 0, 'Invalid bufferView')
            require(v.get('byteOffset', 0) + v['byteLength'] <= j['buffers'][0]['byteLength'], 'bufferView outside buffer')
        for i in range(len(j.get('accessors', []))):
            self.access(i)
        self.parents = [None] * len(j.get('nodes', []))
        for i, n in enumerate(j.get('nodes', [])):
            require(not ('matrix' in n and any(k in n for k in ('translation', 'rotation', 'scale'))), 'Mixed matrix and TRS')
            for child in n.get('children', []):
                require(0 <= child < len(self.parents) and self.parents[child] is None, 'Invalid/multiple node parent')
                self.parents[child] = i
        self.worlds({})  # validates cycles and finite transforms

    def view(self, index):
        v = self.j['bufferViews'][index]
        start = v.get('byteOffset', 0)
        return self.bin[start:start + v['byteLength']]

    def access(self, index):
        if index in self.cache:
            return self.cache[index]
        require(isinstance(index, int) and 0 <= index < len(self.j['accessors']), 'Accessor index')
        a = self.j['accessors'][index]
        require(not a.get('sparse') and 'bufferView' in a, 'Sparse/implicit accessor requires explicit support')
        types = {5120: 'i1', 5121: 'u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}
        widths = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
        require(a['componentType'] in types and a['type'] in widths and a['count'] > 0, 'Accessor format/count')
        dtype, width = np.dtype(types[a['componentType']]), widths[a['type']]
        v = self.j['bufferViews'][a['bufferView']]
        local, size = a.get('byteOffset', 0), dtype.itemsize * width
        stride = v.get('byteStride', size)
        require(local >= 0 and local % dtype.itemsize == 0 and stride >= size and stride % dtype.itemsize == 0, 'Accessor alignment/stride')
        require(local + (a['count'] - 1) * stride + size <= v['byteLength'], 'Accessor exceeds its own bufferView')
        result = np.ndarray((a['count'], width), dtype=dtype, buffer=self.bin,
                            offset=v.get('byteOffset', 0) + local, strides=(stride, dtype.itemsize)).astype(np.float64)
        require(np.isfinite(result).all(), 'Nonfinite accessor values')
        if a.get('normalized'):
            require(a['componentType'] in (5120, 5121, 5122, 5123), 'Invalid normalized accessor')
            limits = np.iinfo(dtype)
            result = np.maximum(result / limits.max, -1) if limits.min < 0 else result / limits.max
        self.cache[index] = result
        return result

    def worlds(self, overrides):
        result, active = {}, set()

        def visit(index):
            if index in result:
                return result[index]
            require(index not in active, 'Cyclic node hierarchy')
            active.add(index)
            n = self.j['nodes'][index]
            if 'matrix' in n:
                require(not any(key[0] == index for key in overrides), 'Matrix node cannot have TRS animation')
                local = np.array(n['matrix'], dtype=float).reshape((4, 4), order='F')
            else:
                t = overrides.get((index, 'translation'), n.get('translation', [0, 0, 0]))
                r = overrides.get((index, 'rotation'), n.get('rotation', [0, 0, 0, 1]))
                s = overrides.get((index, 'scale'), n.get('scale', [1, 1, 1]))
                local = compose(t, r, s)
            require(np.isfinite(local).all(), 'Nonfinite node transform')
            p = self.parents[index]
            result[index] = visit(p) @ local if p is not None else local
            active.remove(index)
            return result[index]

        for i in range(len(self.parents)):
            visit(i)
        return result


def compose(t, q, s):
    q = np.asarray(q, dtype=float)
    require(abs(np.linalg.norm(q) - 1) < .002, 'Non-unit node/animation quaternion')
    x, y, z, w = q / np.linalg.norm(q)
    result = np.array([[1-2*y*y-2*z*z, 2*x*y-2*z*w, 2*x*z+2*y*w, 0],
                       [2*x*y+2*z*w, 1-2*x*x-2*z*z, 2*y*z-2*x*w, 0],
                       [2*x*z-2*y*w, 2*y*z+2*x*w, 1-2*x*x-2*y*y, 0], [0, 0, 0, 1]], dtype=float)
    result[:3, :3] *= np.asarray(s)[None, :]
    result[:3, 3] = t
    return result


def bounds(points):
    p = np.asarray(points)
    return {'min': p.min(axis=0).tolist(), 'max': p.max(axis=0).tolist(),
            'size': (p.max(axis=0) - p.min(axis=0)).tolist()}


def quaternion_angle(a, b):
    a, b = np.asarray(a), np.asarray(b)
    cosine = min(1, abs(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))))
    return math.degrees(2 * math.acos(cosine))


def sample_sampler(times, values, time, path, interpolation):
    if time <= times[0]:
        return values[0].copy()
    if time >= times[-1]:
        return values[-1].copy()
    right = int(np.searchsorted(times, time, side='right'))
    left = right - 1
    a, b = values[left], values[right]
    if interpolation == 'STEP':
        return a.copy()
    require(interpolation == 'LINEAR', 'Only explicit LINEAR/STEP animation evaluation is supported')
    alpha = (time - times[left]) / (times[right] - times[left])
    if path != 'rotation':
        return a * (1 - alpha) + b * alpha
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    dot = np.dot(a, b)
    if dot < 0:
        b, dot = -b, -dot
    if dot > .9995:
        q = a * (1 - alpha) + b * alpha
        return q / np.linalg.norm(q)
    theta = math.acos(min(1, dot))
    return (math.sin((1-alpha)*theta)*a + math.sin(alpha*theta)*b) / math.sin(theta)


def geometry(glb):
    parts, diagnostics = [], []
    for ni, node in enumerate(glb.j.get('nodes', [])):
        if 'mesh' not in node:
            continue
        for pi, primitive in enumerate(glb.j['meshes'][node['mesh']]['primitives']):
            require(primitive.get('mode', 4) == 4 and not primitive.get('targets'), 'Only triangle meshes without morph targets supported')
            attributes = primitive['attributes']
            require('POSITION' in attributes, 'Missing POSITION')
            p = glb.access(attributes['POSITION'])
            require(p.shape[1] == 3, 'POSITION must be VEC3')
            for ai in attributes.values():
                require(len(glb.access(ai)) == len(p), 'Mismatched attribute count')
            if 'indices' in primitive:
                indices = glb.access(primitive['indices'])
                require(indices.shape[1] == 1 and len(indices) % 3 == 0 and indices.min() >= 0 and indices.max() < len(p), 'Invalid triangle indices')
                require(glb.j['accessors'][primitive['indices']]['componentType'] in (5121, 5123, 5125), 'Indices must be unsigned integers')
                triangles = len(indices) // 3
            else:
                require(len(p) % 3 == 0, 'Invalid nonindexed triangles')
                triangles = len(p) // 3
            item = {'node': ni, 'primitive': pi, 'position': p, 'h': np.c_[p, np.ones(len(p))], 'skin': node.get('skin')}
            diag = {'node': ni, 'name': node.get('name'), 'primitive': pi, 'vertices': len(p), 'triangles': triangles,
                    'attributes': attributes, 'localBounds': bounds(p)}
            if 'skin' in node:
                skin = glb.j['skins'][node['skin']]
                require(len(set(skin['joints'])) == len(skin['joints']), 'Duplicate skin joint')
                require(all(0 <= k < len(glb.parents) for k in skin['joints']), 'Invalid skin joint node')
                require('JOINTS_0' in attributes and 'WEIGHTS_0' in attributes and 'JOINTS_1' not in attributes, 'Unsupported skin influence attributes')
                joints, weights = glb.access(attributes['JOINTS_0']), glb.access(attributes['WEIGHTS_0'])
                require(joints.shape == weights.shape == (len(p), 4), 'Skin must have four influences')
                require(np.equal(joints, np.floor(joints)).all() and joints.min() >= 0 and joints.max() < len(skin['joints']), 'Skin joint indices outside palette')
                totals = weights.sum(axis=1)
                require(weights.min() >= 0 and weights.max() <= 1 and totals.min() > 0, 'Invalid skin weights')
                require(np.max(np.abs(totals - 1)) < .002, 'Skin weights do not sum to one')
                if 'inverseBindMatrices' in skin:
                    matrices = glb.access(skin['inverseBindMatrices'])
                    require(matrices.shape == (len(skin['joints']), 16), 'Inverse-bind matrix count/shape')
                    ibm = np.array([m.reshape((4, 4), order='F') for m in matrices])
                    require(np.all(np.abs(np.linalg.det(ibm)) > 1e-12), 'Singular inverse bind')
                else:
                    ibm = np.repeat(np.eye(4)[None], len(skin['joints']), axis=0)
                item.update(joints=joints.astype(int), weights=weights / totals[:, None], ibm=ibm)
                diag.update(skin=node['skin'], joints=len(skin['joints']), weightSumMaxError=float(np.max(np.abs(totals-1))))
            parts.append(item)
            diagnostics.append(diag)
    require(parts, 'No mesh primitives')
    return parts, diagnostics


def deform(glb, parts, worlds):
    result = []
    for p in parts:
        if p['skin'] is None:
            result.append((p['h'] @ worlds[p['node']].T)[:, :3])
            continue
        skin = glb.j['skins'][p['skin']]
        matrices = np.array([worlds[node] @ p['ibm'][i] for i, node in enumerate(skin['joints'])])
        # glTF world-space skinning: meshWorld cancels inverse(meshWorld) in palette.
        value = np.zeros((len(p['position']), 4))
        for lane in range(4):
            value += np.einsum('nij,nj->ni', matrices[p['joints'][:, lane]], p['h']) * p['weights'][:, lane, None]
        require(np.isfinite(value).all(), 'Nonfinite skinned position')
        result.append(value[:, :3])
    return np.concatenate(result)


def inspect(glb, rate=60):
    parts, mesh_info = geometry(glb)
    images = []
    for i, im in enumerate(glb.j.get('images', [])):
        require('bufferView' in im and not im.get('uri'), 'External image unsupported')
        encoded = glb.view(im['bufferView'])
        with Image.open(io.BytesIO(encoded)) as bitmap:
            bitmap.load()  # real decode, not just header dimensions
            require(im['mimeType'] in ('image/png', 'image/jpeg') and bitmap.format in ('PNG', 'JPEG'), 'Unsupported image format')
            images.append({'index': i, 'name': im.get('name'), 'bufferView': im['bufferView'], 'mimeType': im['mimeType'],
                           'bytes': len(encoded), 'sha256': digest(encoded), 'width': bitmap.width, 'height': bitmap.height,
                           'mode': bitmap.mode, 'decodedRGBA8Bytes': bitmap.width*bitmap.height*4,
                           'estimatedRGBA8WithMipBytes': math.ceil(bitmap.width*bitmap.height*4*4/3)})
    base_worlds = glb.worlds({})
    skins = []
    for i, skin in enumerate(glb.j.get('skins', [])):
        skins.append({'index': i, 'name': skin.get('name'), 'inverseBindMatricesAccessor': skin.get('inverseBindMatrices'),
                      'joints': [{'node': n, 'name': glb.j['nodes'][n].get('name'), 'parent': glb.parents[n]} for n in skin['joints']]})
    roots = sorted({n for skin in glb.j.get('skins', []) for n in skin['joints'] if glb.parents[n] not in skin['joints']})
    animations = []
    for ai, animation in enumerate(glb.j.get('animations', [])):
        channels, tracks, seen = [], [], set()
        for channel in animation['channels']:
            target, sampler = channel['target'], animation['samplers'][channel['sampler']]
            node, path = target['node'], target['path']
            require(0 <= node < len(glb.parents) and path in ('rotation', 'translation', 'scale'), 'Unsupported animation target')
            require((node, path) not in seen, 'Duplicate animation node/path')
            seen.add((node, path))
            times, values = glb.access(sampler['input']), glb.access(sampler['output'])
            require(times.shape[1] == 1 and np.all(np.diff(times[:, 0]) > 0) and times.min() >= 0, 'Invalid animation time keys')
            require(glb.j['accessors'][sampler['input']]['componentType'] == 5126, 'Animation time must be float')
            interpolation = sampler.get('interpolation', 'LINEAR')
            require(interpolation in ('LINEAR', 'STEP'), 'Unsupported interpolation; do not silently approximate')
            require(values.shape == (len(times), 4 if path == 'rotation' else 3), 'Animation output shape')
            if path == 'rotation':
                require(np.max(np.abs(np.linalg.norm(values, axis=1)-1)) < .002, 'Non-unit animation quaternion')
            times = times[:, 0]
            channels.append((node, path, times, values, interpolation))
            track = {'node': node, 'joint': glb.j['nodes'][node].get('name'), 'path': path, 'interpolation': interpolation,
                     'keys': len(times), 'startSeconds': float(times[0]), 'endSeconds': float(times[-1]),
                     'inputAccessor': sampler['input'], 'outputAccessor': sampler['output']}
            if path == 'rotation':
                track['endpointAngleDegrees'] = quaternion_angle(values[0], values[-1])
            else:
                track['endpointDelta'] = (values[-1] - values[0]).tolist()
                track['endpointDistance'] = float(np.linalg.norm(values[-1] - values[0]))
            tracks.append(track)
        start, end = min(c[2][0] for c in channels), max(c[2][-1] for c in channels)
        sample_times = sorted(set(np.linspace(start, end, math.ceil((end-start)*rate)+1).tolist() + [float(t) for c in channels for t in c[2]]))
        lows, highs, joint_lows, joint_highs = [], [], [], []
        root_positions = {n: [] for n in roots}
        endpoints = []
        joint_nodes = sorted({n for skin in glb.j.get('skins', []) for n in skin['joints']})
        for ti, time in enumerate(sample_times):
            overrides = {(n, p): sample_sampler(t, v, time, p, mode) for n, p, t, v, mode in channels}
            worlds = glb.worlds(overrides)
            points = deform(glb, parts, worlds)
            lows.append(points.min(axis=0)); highs.append(points.max(axis=0))
            joint_points = np.array([worlds[n][:3, 3] for n in joint_nodes])
            if len(joint_nodes):
                joint_lows.append(joint_points); joint_highs.append(joint_points)
            for n in roots:
                root_positions[n].append(worlds[n][:3, 3].copy())
            if ti in (0, len(sample_times)-1):
                endpoints.append(points)
        seam = np.linalg.norm(endpoints[-1] - endpoints[0], axis=1)
        root_motion = []
        for n, values in root_positions.items():
            values = np.array(values)
            root_motion.append({'node': n, 'name': glb.j['nodes'][n].get('name'), 'start': values[0].tolist(), 'end': values[-1].tolist(),
                                'netTranslation': (values[-1]-values[0]).tolist(), 'netDistance': float(np.linalg.norm(values[-1]-values[0])),
                                'sampledPathLength': float(np.linalg.norm(np.diff(values, axis=0), axis=1).sum()), 'sampledBounds': bounds(values)})
        clip = {'index': ai, 'name': animation.get('name'), 'startSeconds': float(start), 'endSeconds': float(end), 'durationSeconds': float(end-start),
                'channels': len(channels), 'samplers': len(animation['samplers']), 'tracks': tracks, 'sampleCount': len(sample_times),
                'sampledSkinnedBounds': bounds(lows+highs), 'rootMotion': root_motion,
                'loopSeam': {'rawVertexMaxDistance': float(seam.max()), 'rawVertexRmsDistance': float(np.sqrt(np.mean(seam**2))),
                             'maxLocalRotationDegrees': max((t.get('endpointAngleDegrees', 0) for t in tracks), default=0),
                             'warning': 'Endpoint differences are measured, not repaired; no assumption that a clip is intended to loop.'}}
        if len(roots) == 1:
            offset = np.array(root_motion[0]['netTranslation'])
            compensated = np.linalg.norm(endpoints[-1] - offset - endpoints[0], axis=1)
            clip['loopSeam'].update(rootTranslationCompensatedMaxDistance=float(compensated.max()),
                                   rootTranslationCompensatedRmsDistance=float(np.sqrt(np.mean(compensated**2))))
        if joint_lows:
            jp = np.array(joint_lows)
            clip['sampledJointEnvelopes'] = [{'node': n, 'name': glb.j['nodes'][n].get('name'), **bounds(jp[:, i])} for i, n in enumerate(joint_nodes)]
        animations.append(clip)
    return {'path': str(glb.path), 'bytes': len(glb.raw), 'sha256': digest(glb.raw), 'asset': glb.j['asset'],
            'validation': 'All parsed buffers/accessors finite and bounded; images decoded; hierarchy, indices, skin and supported animations validated.',
            'nodeCount': len(glb.parents), 'accessorCount': len(glb.j.get('accessors', [])), 'materialCount': len(glb.j.get('materials', [])),
            'materials': glb.j.get('materials', []), 'meshes': mesh_info, 'triangles': sum(m['triangles'] for m in mesh_info),
            'defaultPoseSkinnedBounds': bounds(deform(glb, parts, base_worlds)), 'skins': skins, 'images': images, 'animations': animations,
            'sampling': {'nominalHz': rate, 'alsoSamplesEveryKey': True, 'coordinates': 'glTF world coordinates, model units, Y up',
                         'method': 'CPU glTF skinning with TRS composition, normalized four-lane weights and shortest-path quaternion SLERP.',
                         'limitation': 'Sampled envelopes are not mathematically continuous bounds, collision bounds, GPU verification or physical-device tests.'}}


def verify_texture_only(before, after):
    a, b = copy.deepcopy(before.j), copy.deepcopy(after.j)
    require(len(a['bufferViews']) == len(b['bufferViews']), 'bufferView count changed')
    image_views = {im['bufferView'] for im in a.get('images', [])}
    require(not image_views.intersection(x['bufferView'] for x in a.get('accessors', [])), 'Images overlap accessor views')
    preserved = []
    for i, (av, bv) in enumerate(zip(a['bufferViews'], b['bufferViews'])):
        if i not in image_views:
            require(before.view(i) == after.view(i), f'Nonimage bufferView {i} changed')
            preserved.append({'bufferView': i, 'bytes': len(before.view(i)), 'sha256': digest(before.view(i))})
        av.pop('byteOffset', None); bv.pop('byteOffset', None)
        if i in image_views:
            av.pop('byteLength', None); bv.pop('byteLength', None)
    for model in (a, b):
        model['buffers'][0].pop('byteLength')
    require(a == b, 'Non-texture glTF metadata changed')
    return {'allNonimageBufferViewsByteIdentical': True, 'normalizedMetadataIdentical': True,
            'preserved': 'Nodes, TRS, hierarchy, mesh attributes/indices, joints, weights, inverse binds, animations, timestamps, channels, materials and image references.',
            'permittedDifferences': 'Embedded image bytes; their byteLengths; all bufferView byteOffsets; buffer byteLength and GLB/JSON padding.',
            'nonimageBufferViews': preserved}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['inspect', 'repack'])
    parser.add_argument('source', type=Path)
    parser.add_argument('--destination', type=Path)
    parser.add_argument('--max-texture', type=int, choices=[512, 1024, 2048], default=2048)
    parser.add_argument('--sample-hz', type=int, default=60)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    require(1 <= args.sample_hz <= 240, 'Sampling rate must be 1..240')
    require(not args.report.exists(), 'Report already exists; choose a fresh evidence path')
    started = utc()
    before = Glb(args.source)
    report = {'startedUtc': started, 'command': [sys.executable, *sys.argv],
              'versions': {'python': sys.version, 'numpy': np.__version__, 'pillow': PIL.__version__},
              'source': inspect(before, args.sample_hz)}
    if args.mode == 'repack':
        require(args.destination is not None, 'Repack requires --destination')
        require(args.destination.resolve() != before.path and not args.destination.exists(), 'Destination must be new and distinct')
        args.destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='carrier-texture-repack-') as temp:
            candidate = Path(temp) / 'carrier.glb'
            command = [sys.executable, str(Path(__file__).with_name('compact-meshy-glb.py')), str(before.path), str(candidate), str(args.max_texture)]
            result = subprocess.run(command, check=True, capture_output=True, text=True)
            after = Glb(candidate)
            report['preservation'] = verify_texture_only(before, after)
            optimized = inspect(after, args.sample_hz)
            require(report['source']['animations'] == optimized['animations'], 'Animation diagnostics differ after texture repack')
            require(report['source']['defaultPoseSkinnedBounds'] == optimized['defaultPoseSkinnedBounds'], 'Default skinned bounds changed')
            # Exclusive creation avoids overwrite even if another process creates the path meanwhile.
            with args.destination.open('xb') as output:
                output.write(after.raw)
            optimized['path'] = str(args.destination.resolve())
            report.update(derivative=optimized, repack={'command': command, 'exitCode': result.returncode,
                          'maxTextureDimension': args.max_texture, 'removedImages': json.loads(result.stdout)['removedUnusedImages'],
                          'bytesSaved': len(before.raw)-len(after.raw), 'percentSmaller': 100*(1-len(after.raw)/len(before.raw))})
    require(digest(before.path.read_bytes()) == digest(before.raw), 'Source changed during inspection')
    report.update(finishedUtc=utc(), exitCode=0, sourceUnchanged=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    with args.report.open('x', encoding='utf-8') as output:
        json.dump(report, output, indent=2, allow_nan=False)
        output.write('\n')
    print(json.dumps({'report': str(args.report.resolve()), 'sourceSha256': report['source']['sha256'],
                      'derivativeSha256': report.get('derivative', {}).get('sha256'), 'exitCode': 0}))


if __name__ == '__main__':
    main()
