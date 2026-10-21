"""Remap one existing paw UV chart into compatible, unchanged original foot texels."""
from pathlib import Path
import argparse, copy, datetime, hashlib, io, json, struct, sys
p = argparse.ArgumentParser(description=__doc__)
for key in ('input', 'source', 'config', 'output', 'report'):
    p.add_argument('--' + key, type=Path, required=True)
p.add_argument('--deps', type=Path)
a = p.parse_args()
if a.deps:
    sys.path.insert(0, str(a.deps.resolve()))
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_erosion
start = datetime.datetime.now(datetime.timezone.utc).isoformat()
sha = lambda b: hashlib.sha256(b).hexdigest()
for path in (a.output, a.report):
    if path.exists():
        raise FileExistsError(path)
    path.parent.mkdir(parents=True, exist_ok=True)

def load(path):
    raw = path.read_bytes(); size = struct.unpack_from('<I', raw, 12)[0]
    return raw, json.loads(raw[20:20 + size]), raw[28 + size:]

def acc(d, b, i):
    e = d['accessors'][i]; v = d['bufferViews'][e['bufferView']]
    w = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[e['type']]
    dt = np.dtype({5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[e['componentType']])
    return np.ndarray((e['count'], w), dt, b, offset=v.get('byteOffset', 0) + e.get('byteOffset', 0),
                      strides=(v.get('byteStride', w * dt.itemsize), dt.itemsize))

raw, d, b = load(a.input); source_raw, sd, sb = load(a.source)
config_raw = a.config.read_bytes(); cfg = json.loads(config_raw)
assert sha(raw) == cfg['inputSha256'] and sha(source_raw) == cfg['sourceSha256']
assert cfg['paw'] == 'frontLeft' and cfg['chart'] == 'side_2positive'
primitive = d['meshes'][0]['primitives'][0]
extra = d['meshes'][0]['extras']; projection = extra['pawUVProjection']
chart = next(c for c in projection['charts'] if c['paw'] == cfg['paw'] and c['chart'] == cfg['chart'])
assert chart['uvBounds'] == cfg['previousUVBounds']
labels = next(c['faceCharts'] for c in projection['faceCharts'] if c['paw'] == cfg['paw'])
corners = np.array(extra['visibleContactHulls'][cfg['paw']]['visibleVertexIds']).reshape(-1, 3)
selected_faces = np.flatnonzero(np.array(labels) == cfg['chart'])
selected = corners[selected_faces].reshape(-1)
assert len(selected) and (selected >= 85568).all()
old_uv = acc(d, b, primitive['attributes']['TEXCOORD_0']); uv = old_uv.copy()
old_lo, old_hi = np.array(cfg['previousUVBounds']); new_lo, new_hi = np.array(cfg['replacementUVBounds'])
assert np.all(new_hi > new_lo) and np.all((new_hi - new_lo) * 2048 >= 32)
uv[selected] = (new_lo + (old_uv[selected].astype(float) - old_lo) / (old_hi - old_lo) * (new_hi - new_lo)).astype('<f4')

# Rebuild the exact matching original-foot mask, independent of the proposal.
sp = sd['meshes'][0]['primitives'][0]
pos = acc(sd, sb, sp['attributes']['POSITION']); suv = acc(sd, sb, sp['attributes']['TEXCOORD_0'])
faces = acc(sd, sb, sp['indices']).reshape(-1, 3)
norm = np.cross(pos[faces[:, 1]] - pos[faces[:, 0]], pos[faces[:, 2]] - pos[faces[:, 0]])
norm /= np.maximum(np.linalg.norm(norm, axis=1)[:, None], 1e-15)
foot = (pos[:, 1] < -.32) & (pos[:, 0] < -.13) & (pos[:, 2] > 0)
matching = np.flatnonzero(foot[faces].all(axis=1) & (norm[:, 2] > .15))
mask_image = Image.new('1', (1024, 1024), 0); draw = ImageDraw.Draw(mask_image)
for index in matching:
    draw.polygon([tuple(q * 1023) for q in suv[faces[index]]], fill=1)
mask = binary_erosion(np.array(mask_image, dtype=bool), iterations=2, border_value=0)
lo = np.floor(new_lo * 1024).astype(int); hi = np.ceil(new_hi * 1024).astype(int)
assert mask[lo[1]:hi[1] + 1, lo[0]:hi[0] + 1].all()
im = sd['images'][sd['textures'][sd['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
view = sd['bufferViews'][im['bufferView']]; at = view.get('byteOffset', 0)
image_bytes = sb[at:at + view['byteLength']]; assert sha(image_bytes) == cfg['sourceBaseColorSha256']
image = np.array(Image.open(io.BytesIO(image_bytes)).convert('RGB'))
low_px = (new_lo * 2048).astype(int); high_px = (new_hi * 2048).astype(int)
pixels = image[low_px[1]:high_px[1] + 1, low_px[0]:high_px[0] + 1].reshape(-1, 3)
mean = pixels.mean(axis=0); luma = pixels @ np.array([.2126, .7152, .0722])
assert np.max(np.abs(mean - cfg['sourcePatchQuality']['meanRGB'])) < 1e-9
assert np.percentile(luma, 95) < 95

updated = bytearray(b); entry = d['accessors'][primitive['attributes']['TEXCOORD_0']]
view = d['bufferViews'][entry['bufferView']]; offset = view.get('byteOffset', 0) + entry.get('byteOffset', 0)
stride = view.get('byteStride', 8)
for index in selected:
    struct.pack_into('<ff', updated, offset + int(index) * stride, *uv[index])
chart['uvBounds'] = cfg['replacementUVBounds']
chart['sourceAtlasPatchPixels2048'] = cfg['sourcePatchPixels2048']
chart['sourceFaceCount'] = len(matching)
projection['tonalOverride'] = {'version': 1, 'inputSha256': sha(raw), 'configSha256': sha(config_raw),
                             'config': cfg, 'selectedFaces': selected_faces.tolist(),
                             'selectedVertexIds': selected.tolist(), 'sourceFootMaskVerified': True}
encoded = json.dumps(d, separators=(',', ':')).encode(); encoded += b' ' * (-len(encoded) % 4)
output = (struct.pack('<III', 0x46546c67, 2, 28 + len(encoded) + len(updated))
          + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
          + struct.pack('<II', len(updated), 0x004e4942) + updated)
a.output.write_bytes(output)
report = {'startedAt': start, 'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'command': sys.argv, 'generatorSha256': sha(Path(__file__).read_bytes()),
          'inputSha256': sha(raw), 'sourceSha256': sha(source_raw), 'configSha256': sha(config_raw),
          'output': str(a.output), 'outputSha256': sha(output), 'outputBytes': len(output),
          'changedUVVertices': int(np.any(old_uv != uv, axis=1).sum()),
          'selectedFaces': len(selected_faces), 'sourceFootFaces': len(matching),
          'sourcePatchPixels2048': ((new_hi - new_lo) * 2048).tolist(),
          'sourcePatchMeanRGB': mean.tolist(), 'sourcePatchLuma5Median95': np.percentile(luma, [5, 50, 95]).tolist(),
          'sourcePatchInsideMatchingFootMask': True,
          'limitations': ['Only one existing UV chart is remapped. Geometry, back contour, original contact behavior and source image pixels are unchanged.',
                         'This staged asset needs exact preservation audit and a native comparison before promotion.']}
a.report.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ('output', 'outputSha256', 'outputBytes', 'changedUVVertices', 'selectedFaces', 'sourcePatchMeanRGB')}))
