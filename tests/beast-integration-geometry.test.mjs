import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {triangleDistanceSq,triangleBoxIntersection,closedGirdleTopology,posedVisibleSurface,assertClosedSurfacesDisjoint} from './beast-integration-geometry.mjs';
const points=values=>values.map(p=>new T.Vector3(...p));
test('band clearance catches a face crossing even when every vertex is separated from the opposite face',()=>{
 const a=points([[-2,0,-2],[2,0,-2],[0,0,2]]),b=points([[0,-1,-1],[0,1,-1],[0,0,3]]);
 assert.equal(triangleDistanceSq(a,b),0);assert.ok(Math.abs(triangleDistanceSq(a,points(a.map(p=>[p.x,p.y+.2,p.z])))-.04)<1e-12);
 assert.ok(triangleBoxIntersection(a,{x:0,z:0,absoluteY:0},[.25,.25],-.1,.1));
});
test('closed ribbon topology rejects a missing triangle rather than trusting sampled anchors',()=>{
 const geometry=new T.TorusGeometry(2,.2,4,16),positions=geometry.attributes.position,unique=new Map(),remap=[];
 for(let i=0;i<positions.count;i++){const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*1e5)||0).join(',');if(!unique.has(key))unique.set(key,unique.size);remap.push(unique.get(key));}
 const index=Array.from(geometry.index.array,id=>remap[id]);geometry.setIndex(index);assert.equal(closedGirdleTopology(geometry).vertices,64);
 geometry.setIndex(index.slice(3));assert.throws(()=>closedGirdleTopology(geometry),/incident faces/);geometry.dispose();
});

test('mutual component checks detect crossing faces when neither mesh has a vertex inside the other',()=>{
 const rig=new T.Group(),a=new T.Mesh(new T.BoxGeometry(4,.2,.2)),b=new T.Mesh(new T.BoxGeometry(.2,4,.2));rig.add(a,b);rig.rotation.set(.13,.37,-.24);rig.updateMatrixWorld(true);
 const first=posedVisibleSurface(a,rig),second=posedVisibleSurface(b,rig),firstBox=new T.Box3().setFromPoints(first.vertices),secondBox=new T.Box3().setFromPoints(second.vertices);
 assert.ok(first.vertices.every(point=>!secondBox.containsPoint(point)));assert.ok(second.vertices.every(point=>!firstBox.containsPoint(point)));
 assert.throws(()=>assertClosedSurfacesDisjoint(first,second,'crossing buckle bars'),/intersecting faces/);a.geometry.dispose();b.geometry.dispose();
});

test('mutual component checks catch complete containment in both argument orders',()=>{
 const rig=new T.Group(),outer=new T.Mesh(new T.BoxGeometry(4,4,4)),inner=new T.Mesh(new T.BoxGeometry(.4,.4,.4));rig.add(outer,inner);rig.updateMatrixWorld(true);
 const a=posedVisibleSurface(outer,rig),b=posedVisibleSurface(inner,rig);
 assert.throws(()=>assertClosedSurfacesDisjoint(a,b,'buried buckle'),/contained/);assert.throws(()=>assertClosedSurfacesDisjoint(b,a,'reversed buried buckle'),/contained/);outer.geometry.dispose();inner.geometry.dispose();
});

test('mutual checks distinguish a torus hole and permit small genuine gaps without imposing the skin margin',()=>{
 const rig=new T.Group(),ring=new T.Mesh(new T.TorusGeometry(2,.2,8,32)),hole=new T.Mesh(new T.BoxGeometry(.2,.2,.2)),a=new T.Mesh(new T.BoxGeometry(1,1,1)),b=new T.Mesh(new T.BoxGeometry(1,1,1));rig.add(ring,hole,a,b);a.position.x=5;b.position.x=6.01;rig.updateMatrixWorld(true);
 assert.doesNotThrow(()=>assertClosedSurfacesDisjoint(posedVisibleSurface(ring,rig),posedVisibleSurface(hole,rig),'empty hole'));
 assert.doesNotThrow(()=>assertClosedSurfacesDisjoint(posedVisibleSurface(a,rig),posedVisibleSurface(b,rig),'real0.01 gap'));
 for(const mesh of[ring,hole,a,b])mesh.geometry.dispose();
});
