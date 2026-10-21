import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {improperTriangleIntersection} from './helpers/native-self-intersection.mjs';
const tri=values=>values.map(value=>new T.Vector3(...value));

test('native self-check permits shared edges but catches a folded adjacent face',()=>{
 const a=tri([[0,0,0],[2,0,0],[0,0,2]]),beside=tri([[2,0,0],[0,0,0],[0,0,-2]]),folded=tri([[2,0,0],[0,0,0],[1,0,1]]);
 assert.equal(improperTriangleIntersection(a,beside,[a[0],a[1]]),false);
 assert.equal(improperTriangleIntersection(a,folded,[a[0],a[1]]),true,'Adjacency cannot hide coplanar folded overlap');
 const bent=tri([[2,0,0],[0,0,0],[0,1,-1]]);assert.equal(improperTriangleIntersection(a,bent,[a[0],a[1]]),false);
});

test('native self-check catches a shin crossing a toe despite no inside vertex',()=>{
 const a=tri([[-2,0,-2],[2,0,-2],[0,0,2]]),b=tri([[0,-1,-1],[0,1,-1],[0,0,3]]);
 assert.equal(improperTriangleIntersection(a,b),true);assert.equal(improperTriangleIntersection(b,a),true);
 const separated=b.map(p=>p.clone().add(new T.Vector3(5,0,0)));assert.equal(improperTriangleIntersection(a,separated),false);
});

test('native self-check tests beyond a shared vertex and handles duplicate coplanar faces',()=>{
 const a=tri([[0,0,0],[2,0,0],[0,0,2]]),b=tri([[0,0,0],[1,-1,1],[1,1,1]]);
 assert.equal(improperTriangleIntersection(a,b,[a[0]]),true);
 assert.equal(improperTriangleIntersection(a,a,[...a]),true);
 const touch=tri([[0,0,0],[-1,0,0],[0,1,0]]);assert.equal(improperTriangleIntersection(a,touch,[a[0]]),false);
});
