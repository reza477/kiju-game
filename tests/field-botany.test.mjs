import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {fieldShrubGeometry} from '../src/field-botany.js';
import {fracturedRockGeometry,roadRibbonGeometry} from '../src/environment-geometry.js';
import {renderedTerrainHeight,roadZ,terrainNormal} from '../src/terrain.js';

function auditClosed(geometry){
  const p=geometry.attributes.position,edges=new Map();let volume=0,minimumArea=Infinity;
  for(let i=0;i<p.count;i+=3){
    const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j)),[a,b,c]=points;
    minimumArea=Math.min(minimumArea,b.clone().sub(a).cross(c.clone().sub(a)).length());volume+=a.dot(b.clone().cross(c))/6;
    for(let j=0;j<3;j++){
      const from=points[j].toArray().join(','),to=points[(j+1)%3].toArray().join(','),key=[from,to].sort().join(':');
      const entry=edges.get(key)||{count:0,direction:0};entry.count++;entry.direction+=from<to?1:-1;edges.set(key,entry);
    }
  }
  assert.ok(minimumArea>1e-6);assert.ok(volume>0,'Closed masters must face outward');
  for(const edge of edges.values()){assert.equal(edge.count,2,'Every thin leaf/stem closes');assert.equal(edge.direction,0);}
  for(const attribute of Object.values(geometry.attributes))for(const value of attribute.array)assert.ok(Number.isFinite(value));
  const n=geometry.attributes.normal,v=new T.Vector3();for(let i=0;i<n.count;i++)assert.ok(Math.abs(v.fromBufferAttribute(n,i).length()-1)<1e-5);
}

test('botanical masters use closed stems and leaf volumes within inherited envelopes independent of UUID randomness',()=>{
  const original=Math.random;
  try{for(const compact of[false,true]){
    // Three allocates UUIDs through Math.random; that must not shape the mesh.
    Math.random=()=>.125;const first=fieldShrubGeometry(compact);Math.random=()=>.875;const second=fieldShrubGeometry(compact);
    try{
      assert.deepEqual(first.attributes.position.array,second.attributes.position.array);assert.notEqual(first.attributes.position.array,second.attributes.position.array);
      auditClosed(first);assert.equal(first.userData.botanicalStems,compact?3:6);assert.equal(first.userData.botanicalLeaves,compact?15:42);
      assert.ok(first.attributes.position.count/3<=(compact?300:750));
      const b=first.boundingBox;assert.ok(b.min.x>=-1.1&&b.max.x<=1.1&&b.min.z>=-.93&&b.max.z<=.88);
      assert.ok(b.min.y>=(compact?0:-.800001)&&b.max.y<=(compact?.960001:.910001));
    }finally{first.dispose();second.dispose();}
  }}finally{Math.random=original;}
});

test('chipped stone remains closed and inside its original functional display envelope',()=>{
  const stone=fracturedRockGeometry();try{
    auditClosed(stone);assert.ok(stone.attributes.position.count/3<=180);
    const b=stone.boundingBox;assert.ok(b.min.x>=-.930001&&b.max.x<=.974201);assert.ok(b.min.y>=-.906401&&b.max.y<=.886101);assert.ok(b.min.z>=-.836801&&b.max.z<=.830401);
  }finally{stone.dispose();}
});

test('terrain ribbons sample every pavement and marking vertex while leaving original placement records untouched',()=>{
  const height=(x,z)=>Math.sin(x*.23)*.9+Math.cos(z*.17)*.7;
  const items=[{x:3,y:height(3,4)+.14,z:4,sx:6.05,sy:.1,sz:5.8,colour:0x656e68,yaw:.17},{x:7,y:height(7,6)+.20,z:6,sx:2.5,sy:.013,sz:.1,colour:0xd9cba0,yaw:.15}];
  const before=JSON.stringify(items),g=roadRibbonGeometry(items,height);try{
    assert.equal(JSON.stringify(items),before);assert.equal(g.userData.omittedCliffPieces,0);
    const p=g.attributes.position;for(let i=0;i<p.count;i++){
      const lift=p.getY(i)-height(p.getX(i),p.getZ(i));assert.ok(Math.min(Math.abs(lift-.19),Math.abs(lift-.2065))<.00001);
    }
    assert.ok(g.index.count>12,'Roads must follow interior samples rather than only end corners');
  }finally{g.dispose();}
});

test('diagnosed distant cliff fragments are removed from decorative pavement only',()=>{
  const items=[-210,-204,-198].map(x=>{const z=roadZ(x),n=terrainNormal(x,z),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(n.x,n.y,n.z));return{x,y:renderedTerrainHeight(x,z)+.14,z,sx:6.05,sy:.1,sz:5.8,colour:0x656e68,rotation};});
  const before=JSON.stringify(items),g=roadRibbonGeometry(items,renderedTerrainHeight);try{
    assert.equal(JSON.stringify(items),before);assert.ok(g.userData.omittedCliffPieces>=2);
    for(let i=0;i<g.attributes.position.count;i++){const p=g.attributes.position;assert.ok(Math.abs(p.getY(i)-renderedTerrainHeight(p.getX(i),p.getZ(i))-.19)<.00002);}
  }finally{g.dispose();}
});
