"""Bounded local texture repack. Keeps every geometry/accessor byte unchanged.

Requires the already available Pillow runtime; never installs software. Original
Meshy downloads remain separate. No Blender, remote service or geometry reduction.
"""
import io, json, struct, hashlib, sys
from pathlib import Path
from PIL import Image

source, destination = map(Path, sys.argv[1:3])
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
matte = len(sys.argv) > 4 and sys.argv[4] == '--matte'
assert 256 <= limit <= 2048
assert source.resolve() != destination.resolve()
raw = source.read_bytes()
assert raw[:4] == b'glTF' and struct.unpack_from('<II', raw, 4) == (2, len(raw))
offset = 12
while offset < len(raw):
    length, kind = struct.unpack_from('<II', raw, offset)
    part = raw[offset+8:offset+8+length]
    if kind == 0x4e4f534a:
        model = json.loads(part)
    elif kind == 0x004e4942:
        binary = part
    offset += 8 + length
assert not any(x.get('uri') for x in model['buffers'] + model.get('images', []))
def view_bytes(view):
    return binary[view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]
assert not model.get('extensionsUsed')
assert not any(a.get('sparse') for a in model['accessors'])
geometry_hashes = [hashlib.sha256(view_bytes(model['bufferViews'][a['bufferView']])).hexdigest()
                   for a in model['accessors']]
removed_images = []
if matte:
    # The importer uses constant roughness and metalness. Remove the unbound ORM
    # before shipping so GLTFLoader never transfers/decodes an unused image.
    references = []
    for material in model['materials']:
        pbr = material['pbrMetallicRoughness']
        pbr.pop('metallicRoughnessTexture', None)
        pbr['metallicFactor'], pbr['roughnessFactor'] = 0, .92
        for owner in (material, pbr):
            references.extend(value for key, value in owner.items()
                              if key.endswith('Texture') and isinstance(value, dict))
    texture_ids = sorted({value['index'] for value in references})
    texture_map = {old: new for new, old in enumerate(texture_ids)}
    for value in references:
        value['index'] = texture_map[value['index']]
    model['textures'] = [model['textures'][index] for index in texture_ids]
    image_ids = sorted({texture['source'] for texture in model['textures']})
    image_map = {old: new for new, old in enumerate(image_ids)}
    removed_images = [image for index, image in enumerate(model['images']) if index not in image_map]
    model['images'] = [model['images'][index] for index in image_ids]
    for texture in model['textures']:
        texture['source'] = image_map[texture['source']]
removed_views = {image['bufferView'] for image in removed_images}
assert not removed_views.intersection(a['bufferView'] for a in model['accessors'])
assert not removed_views.intersection(image['bufferView'] for image in model['images'])
replacements, inventory = {}, []
for image in model.get('images', []):
    view = model['bufferViews'][image['bufferView']]
    original = binary[view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]
    with Image.open(io.BytesIO(original)) as bitmap:
        size = bitmap.size
        bitmap.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        if image['mimeType'] == 'image/png':
            bitmap.save(output, format='PNG', optimize=True)
        else:
            assert image['mimeType'] == 'image/jpeg'
            bitmap.convert('RGB').save(output, format='JPEG', quality=90, subsampling=0, optimize=True)
        replacements[image['bufferView']] = output.getvalue()
        inventory.append({'beforeDimensions': size, 'afterDimensions': bitmap.size,
                          'beforeBytes': len(original), 'afterBytes': len(output.getvalue())})
packed = bytearray()
views, view_map = [], {}
for index, view in enumerate(model['bufferViews']):
    if index in removed_views:
        continue
    original = binary[view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]
    content = replacements.get(index, original)
    while len(packed) % 4:
        packed.append(0)
    view['byteOffset'], view['byteLength'] = len(packed), len(content)
    packed.extend(content)
    view_map[index] = len(views)
    views.append(view)
model['bufferViews'] = views
for reference in model['accessors'] + model['images']:
    reference['bufferView'] = view_map[reference['bufferView']]
assert geometry_hashes == [hashlib.sha256(packed[v['byteOffset']:v['byteOffset']+v['byteLength']]).hexdigest()
                          for a in model['accessors'] for v in [views[a['bufferView']]]]
while len(packed) % 4:
    packed.append(0)
model['buffers'][0]['byteLength'] = len(packed)
encoded = json.dumps(model, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
result = struct.pack('<III', 0x46546c67, 2, 28+len(encoded)+len(packed))
result += struct.pack('<II', len(encoded), 0x4e4f534a)+encoded
result += struct.pack('<II', len(packed), 0x004e4942)+packed
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_bytes(result)
print(json.dumps({'source': str(source), 'destination': str(destination),
                  'sourceSha256': hashlib.sha256(raw).hexdigest(),
                  'sha256': hashlib.sha256(result).hexdigest(),
                  'originalBytes': len(raw), 'bytes': len(result),
                  'geometryBytesUnchanged': True, 'geometryViewHashes': geometry_hashes,
                  'removedUnusedImages': len(removed_images), 'textures': inventory}, indent=2))
