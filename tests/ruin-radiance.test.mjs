import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {brokenRuinWallGeometry} from '../src/landscape.js';

test('the Broken Meridian cap excludes zero-area faces without changing surviving attributes',()=>{
  const geometry=brokenRuinWallGeometry({width:7,height:6,seed:0});
  assert.ok(geometry.index,'The failing ruin extrusion requires a filtered triangle index.');
  const position=geometry.attributes.position,normal=geometry.attributes.normal;
  const selected=new Set(geometry.index.array),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  let omitted=0;
  for(let i=0;i<position.count;i+=3){
    a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
    const area=b.sub(a).cross(c.sub(a)).lengthSq();
    for(let k=0;k<3;k++)assert.equal(selected.has(i+k),area>0,'Keep every real face and reject only zero-area triangles.');
    if(area===0)omitted++;
  }
  assert.equal(omitted,2,'The known failing cap has exactly two collinear triangles.');
  const flattened=geometry.toNonIndexed();
  for(const[name,attribute]of Object.entries(geometry.attributes)){
    const actual=flattened.attributes[name];
    geometry.index.array.forEach((original,i)=>{for(let k=0;k<attribute.itemSize;k++)assert.equal(actual.array[i*attribute.itemSize+k],attribute.array[original*attribute.itemSize+k]);});
  }
  for(const i of selected)assert.ok(new T.Vector3().fromBufferAttribute(normal,i).lengthSq()>0);
});

test('all foundry and town ruin walls submit finite positions and nonzero normals',()=>{
  const sites=[[[8,7,5.4],[5,5,8],[7,4,3.7]],[[7,5,6],[5,6,8.5],[5.5,5,4],[6,5,6.8]]];
  for(const buildings of sites)for(const[i,[width,depth,height]]of buildings.entries()){
    for(const params of[{width,height,seed:i},{width:depth,height:height*.69,seed:i+1,windows:false}]){
      const geometry=brokenRuinWallGeometry(params),position=geometry.attributes.position,normal=geometry.attributes.normal;
      const indices=geometry.index?.array??Array.from({length:position.count},(_,i)=>i);
      for(const index of indices){
        const p=new T.Vector3().fromBufferAttribute(position,index),n=new T.Vector3().fromBufferAttribute(normal,index);
        assert.ok([...p,...n].every(Number.isFinite),JSON.stringify(params));
        assert.ok(n.lengthSq()>0,`A submitted zero normal would poison HDR radiance: ${JSON.stringify(params)}`);
      }
      const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
      for(let j=0;j<indices.length;j+=3){
        a.fromBufferAttribute(position,indices[j]);b.fromBufferAttribute(position,indices[j+1]);c.fromBufferAttribute(position,indices[j+2]);
        assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>0,JSON.stringify(params));
      }
    }
  }
});
