import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {captureImpactAnchor, resolveImpactAnchor} from '../src/impact-anchor.js';

test('static impact attachment retains its original local point through actor movement', () => {
  const mesh = new T.Mesh(new T.BoxGeometry(), new T.MeshBasicMaterial());
  mesh.position.set(3, 4, 5); mesh.updateMatrixWorld(true);
  const point = new T.Vector3(.5, .1, -.2), hit = mesh.localToWorld(point.clone());
  const anchor = captureImpactAnchor({object: mesh, point: hit});
  mesh.position.x += 6; mesh.rotation.y = .7; mesh.updateMatrixWorld(true);
  assert.ok(resolveImpactAnchor(anchor).distanceTo(mesh.localToWorld(point.clone())) < 1e-12);
  assert.ok(anchor.point.distanceTo(hit) < 1e-12);
});

test('skin impact follows the struck triangle under bone animation and world movement', () => {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 2, 0, 0, 0, 2, 0], 3));
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(new Uint16Array(12), 4));
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  const mesh = new T.SkinnedMesh(geometry, new T.MeshBasicMaterial()), bone = new T.Bone();
  mesh.add(bone); mesh.bind(new T.Skeleton([bone])); mesh.updateMatrixWorld(true);
  const anchor = captureImpactAnchor({object: mesh, point: new T.Vector3(.6, 1, 0), face: {a: 0, b: 1, c: 2}});
  assert.ok(anchor.surface.weights.distanceTo(new T.Vector3(.2, .3, .5)) < 1e-12);
  bone.position.z = 2; bone.rotation.z = Math.PI / 2; mesh.position.set(5, 6, 7); mesh.updateMatrixWorld(true);
  const resolved = resolveImpactAnchor(anchor);
  assert.ok(resolved.distanceTo(new T.Vector3(4, 6.6, 9)) < 1e-6);
  assert.ok(anchor.local.distanceTo(new T.Vector3(.6, 1, 0)) < 1e-12);
});

test('an impact on a deforming saddle panel follows its struck surface after bending', () => {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 2, 0, 0, 0, 2, 0], 3));
  const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial());
  mesh.userData.deformingImpactSurface = true;
  mesh.updateMatrixWorld(true);
  const anchor = captureImpactAnchor({object: mesh, point: new T.Vector3(.6, 1, 0), face: {a: 0, b: 1, c: 2}});
  geometry.attributes.position.setXYZ(1, 2, 0, 2);
  geometry.attributes.position.setXYZ(2, 0, 2, -1);
  mesh.rotation.y = Math.PI / 2;
  mesh.position.set(4, 5, 6);
  mesh.updateMatrixWorld(true);
  // Original barycentric weights .2/.3/.5 put the now-bent surface at z=.1.
  const expected = mesh.localToWorld(new T.Vector3(.6, 1, .1));
  assert.ok(resolveImpactAnchor(anchor).distanceTo(expected) < 1e-6,
    'impact must remain on the deformed triangle, not the old local point');
});
