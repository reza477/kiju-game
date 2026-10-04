"""CPU-only synthetic coverage for the carrier asset inspector; no game/assets modified."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest

import numpy as np
from PIL import Image

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('carrier_glb', Path(__file__).parents[1] / 'scripts/carrier-glb.py')
carrier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(carrier)


def fixture():
    data, views, accessors = bytearray(), [], []

    def access(values, dtype, kind, component):
        while len(data) % 4:
            data.append(0)
        array = np.array(values, dtype=dtype)
        views.append({'buffer': 0, 'byteOffset': len(data), 'byteLength': array.nbytes})
        data.extend(array.tobytes())
        accessors.append({'bufferView': len(views)-1, 'componentType': component, 'count': len(array), 'type': kind})
        return len(accessors)-1

    position = access([[0, 0, 0], [1, 0, 0], [0, 1, 0]], '<f4', 'VEC3', 5126)
    joint = access([[0, 0, 0, 0]]*3, 'u1', 'VEC4', 5121)
    weight = access([[1, 0, 0, 0]]*3, '<f4', 'VEC4', 5126)
    bind = access([np.eye(4).flatten(order='F')], '<f4', 'MAT4', 5126)
    time = access([[0], [1]], '<f4', 'SCALAR', 5126)
    translation = access([[0, 0, 0], [2, 0, 0]], '<f4', 'VEC3', 5126)
    image = io.BytesIO()
    Image.new('RGB', (8, 8), 'red').save(image, format='PNG')
    while len(data) % 4:
        data.append(0)
    views.append({'buffer': 0, 'byteOffset': len(data), 'byteLength': len(image.getvalue())})
    data.extend(image.getvalue())
    j = {'asset': {'version': '2.0'}, 'buffers': [{'byteLength': len(data)}], 'bufferViews': views, 'accessors': accessors,
         'nodes': [{'name': 'hips'}, {'name': 'mesh', 'mesh': 0, 'skin': 0}], 'scenes': [{'nodes': [0, 1]}], 'scene': 0,
         'meshes': [{'primitives': [{'attributes': {'POSITION': position, 'JOINTS_0': joint, 'WEIGHTS_0': weight}}]}],
         'skins': [{'joints': [0], 'inverseBindMatrices': bind}], 'images': [{'bufferView': len(views)-1, 'mimeType': 'image/png'}],
         'animations': [{'name': 'move', 'samplers': [{'input': time, 'output': translation}],
                         'channels': [{'sampler': 0, 'target': {'node': 0, 'path': 'translation'}}]}]}
    return j, data


def write(path, j, data):
    encoded = json.dumps(j).encode()
    encoded += b' '*(-len(encoded) % 4)
    data = bytes(data) + b'\0'*(-len(data) % 4)
    path.write_bytes(struct.pack('<III', 0x46546C67, 2, 28+len(encoded)+len(data)) +
                     struct.pack('<II', len(encoded), 0x4E4F534A) + encoded +
                     struct.pack('<II', len(data), 0x004E4942) + data)


class CarrierTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'test.glb'
        self.j, self.data = fixture()
        write(self.path, self.j, self.data)

    def tearDown(self):
        self.temp.cleanup()

    def test_world_skin_envelope_root_motion_and_compensated_seam(self):
        report = carrier.inspect(carrier.Glb(self.path), rate=4)
        clip = report['animations'][0]
        self.assertEqual(clip['sampledSkinnedBounds']['min'], [0, 0, 0])
        self.assertEqual(clip['sampledSkinnedBounds']['max'], [3, 1, 0])
        self.assertEqual(clip['rootMotion'][0]['netTranslation'], [2, 0, 0])
        self.assertEqual(clip['loopSeam']['rawVertexMaxDistance'], 2)
        self.assertEqual(clip['loopSeam']['rootTranslationCompensatedMaxDistance'], 0)
        self.assertEqual(report['images'][0]['width'], 8)

    def test_accessor_cannot_read_into_next_view(self):
        self.j['accessors'][0]['count'] += 1
        write(self.path, self.j, self.data)
        with self.assertRaisesRegex(ValueError, 'own bufferView'):
            carrier.Glb(self.path)

    def test_scalar_specular_metadata_is_preserved_but_new_texture_extensions_reject(self):
        self.j['extensionsUsed'] = ['KHR_materials_specular']
        self.j['materials'] = [{'extensions': {'KHR_materials_specular': {'specularFactor': 0}}}]
        write(self.path, self.j, self.data)
        before = carrier.Glb(self.path)
        self.assertTrue(carrier.verify_texture_only(before, carrier.Glb(self.path))['normalizedMetadataIdentical'])
        self.j['materials'][0]['extensions']['KHR_materials_specular']['specularTexture'] = {'index': 0}
        write(self.path, self.j, self.data)
        with self.assertRaisesRegex(ValueError, 'Specular texture'):
            carrier.Glb(self.path)

    def test_hierarchy_cycle_is_rejected(self):
        self.j['nodes'][0]['children'] = [1]
        self.j['nodes'][1]['children'] = [0]
        write(self.path, self.j, self.data)
        with self.assertRaisesRegex(ValueError, 'Cyclic'):
            carrier.Glb(self.path)

    def test_invalid_skin_joint_is_rejected(self):
        offset = self.j['bufferViews'][1]['byteOffset']
        self.data[offset] = 2
        write(self.path, self.j, self.data)
        with self.assertRaisesRegex(ValueError, 'outside palette'):
            carrier.inspect(carrier.Glb(self.path))

    def test_texture_only_preservation_rejects_animation_metadata_and_binary_changes(self):
        before = carrier.Glb(self.path)
        changed = Path(self.temp.name) / 'changed.glb'
        j = copy.deepcopy(self.j)
        j['animations'][0]['name'] = 'renamed'
        write(changed, j, self.data)
        with self.assertRaisesRegex(ValueError, 'metadata changed'):
            carrier.verify_texture_only(before, carrier.Glb(changed))
        data = self.data.copy()
        offset = self.j['bufferViews'][5]['byteOffset']
        struct.pack_into('<f', data, offset, .125)
        write(changed, self.j, data)
        with self.assertRaisesRegex(ValueError, 'Nonimage bufferView'):
            carrier.verify_texture_only(before, carrier.Glb(changed))

    def test_identical_poses_with_opposite_quaternion_signs(self):
        a, b = np.array([0, 0, 0, 1.]), np.array([0, 0, 0, -1.])
        value = carrier.sample_sampler(np.array([0, 1]), np.array([a, b]), .5, 'rotation', 'LINEAR')
        np.testing.assert_allclose(value, a)
        self.assertEqual(carrier.quaternion_angle(a, b), 0)

    def test_parent_transform_and_inverse_bind_are_applied(self):
        # Root +10 and inverse bind -10 cancel at rest; keyed translation remains.
        self.j['nodes'].append({'name': 'rig-parent', 'translation': [10, 0, 0], 'children': [0]})
        self.j['scenes'][0]['nodes'] = [2, 1]
        offset = self.j['bufferViews'][3]['byteOffset']
        matrix = np.eye(4)
        matrix[0, 3] = -10
        self.data[offset:offset+64] = matrix.astype('<f4').flatten(order='F').tobytes()
        write(self.path, self.j, self.data)
        report = carrier.inspect(carrier.Glb(self.path), rate=2)
        self.assertEqual(report['defaultPoseSkinnedBounds']['max'], [1, 1, 0])
        self.assertEqual(report['animations'][0]['sampledSkinnedBounds']['max'], [3, 1, 0])

    def test_step_sampler_keeps_left_key_until_exact_boundary(self):
        times = np.array([0, 1, 2])
        values = np.array([[0, 0, 0], [3, 0, 0], [9, 0, 0]])
        np.testing.assert_equal(carrier.sample_sampler(times, values, .999, 'translation', 'STEP'), [0, 0, 0])
        np.testing.assert_equal(carrier.sample_sampler(times, values, 1, 'translation', 'STEP'), [3, 0, 0])

    def test_unsupported_interpolation_is_not_silently_approximated(self):
        self.j['animations'][0]['samplers'][0]['interpolation'] = 'CUBICSPLINE'
        write(self.path, self.j, self.data)
        with self.assertRaisesRegex(ValueError, 'Unsupported interpolation'):
            carrier.inspect(carrier.Glb(self.path))


if __name__ == '__main__':
    unittest.main(verbosity=2)
