import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {rosetteGeometry,shingleGeometry,fallenWoodGeometry,masonryRemnantGeometry} from '../src/ground-dressing.js';

test('decorative masters have finite UVs, unit normals and no collapsed triangles',()=>{
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(const create of [rosetteGeometry,shingleGeometry,fallenWoodGeometry,masonryRemnantGeometry]){
    const geometry=create();
    try{
      const p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index;
      for(const attribute of Object.values(geometry.attributes))for(const value of attribute.array)assert.ok(Number.isFinite(value));
      for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5,create.name+' zero or invalid normal');
      const count=index?.count??p.count;let signedVolume=0;
      for(let i=0;i<count;i+=3){
        a.fromBufferAttribute(p,index?index.getX(i):i);b.fromBufferAttribute(p,index?index.getX(i+1):i+1);c.fromBufferAttribute(p,index?index.getX(i+2):i+2);
        signedVolume+=a.dot(b.clone().cross(c))/6;
        assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>1e-12,create.name+' collapsed triangle '+i/3);
      }
      if(create!==rosetteGeometry)assert.ok(signedVolume>0,'Solid props must face outward, not expose culled inner faces');
      assert.ok(geometry.boundingSphere.radius>0&&geometry.boundingSphere.radius<3,'Master exceeds its small ground-prop envelope');
    }finally{geometry.dispose();}
  }
});
