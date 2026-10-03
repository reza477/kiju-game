import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import { branchSprayGeometry, grassTuftGeometry, botanicalTree, fracturedRockGeometry } from '../src/environment-geometry.js';
import { createVegetationMaterial } from '../src/vegetation-materials.js';

test('sculpted crowns are closed volumes with outward winding and bounded near/far sampling', () => {
  for (const pine of [false,true]) {
    const near = branchSprayGeometry(pine), distant = branchSprayGeometry(pine,true);
    for (const geometry of [near,distant]) {
      const edges = new Map(), p = geometry.attributes.position, triangleVolumes=[], parents=[];
      const find=i=>parents[i]===i?i:(parents[i]=find(parents[i]));
      let volume = 0;
      for (let i=0;i<geometry.index.count;i+=3) {
        const ids=[0,1,2].map(j=>geometry.index.getX(i+j));
        const points=ids.map(id=>new T.Vector3().fromBufferAttribute(p,id));
        const [a,b,c]=points;
        assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length()>1e-5);
        const triangle=i/3, signedVolume=a.dot(b.clone().cross(c))/6;
        parents.push(triangle);triangleVolumes.push(signedVolume);volume += signedVolume;
        for(let j=0;j<3;j++) {
          // Authored per-face normals duplicate corners. Weld by exact position
          // only for this topology audit, preserving runtime shading seams.
          const from=points[j].toArray().join(','),to=points[(j+1)%3].toArray().join(','),key=[from,to].sort().join(':');
          const entry=edges.get(key)||{count:0,direction:0,triangle};
          if(entry.count)parents[find(triangle)]=find(entry.triangle);
          entry.count++;entry.direction+=from<to?1:-1;edges.set(key,entry);
        }
      }
      assert.ok(volume>(pine?.30:1.5), 'Closed foliage has positive physical volume');
      for(const edge of edges.values()){assert.equal(edge.count,2);assert.equal(edge.direction,0);}
      const shellVolumes=new Map();
      triangleVolumes.forEach((value,triangle)=>{const shell=find(triangle);shellVolumes.set(shell,(shellVolumes.get(shell)||0)+value);});
      for(const value of shellVolumes.values())assert.ok(value>1e-5,'Every attached closed shell has outward winding, including the concealed core');
      assert.ok(geometry.boundingSphere.radius<1.5);
    }
    const a=near.boundingBox,b=distant.boundingBox;
    assert.ok(a.min.distanceTo(b.min)<.18&&a.max.distanceTo(b.max)<.18, 'LOD keeps the same authored crown envelope');
    near.dispose();distant.dispose();
  }
});

function batch(distant){
  const channel=()=>({items:[],add(...item){this.items.push(['crown',...item]);},link(...item){this.items.push(['wood',...item]);}});
  return {distant,wood:channel(),leaves:channel(),needles:channel()};
}
test('near and distant growth uses identical root-relative topology and an isolated reproducible seed',()=>{
  for(const pine of [false,true])for(const [x,z]of[[18,41],[-102,38],[123,61],[-145,-38]]){
    const near=batch(false),far=batch(true),repeat=batch(false);
    botanicalTree(near,x,3,z,9,1.15,pine);botanicalTree(far,x,3,z,9,1.15,pine);botanicalTree(repeat,x,3,z,9,1.15,pine);
    for(const role of ['wood','leaves','needles']){assert.deepEqual(near[role].items,far[role].items);assert.deepEqual(near[role].items,repeat[role].items);}
    assert.deepEqual(near.wood.items[0][1],[x,3,z]);
    assert.equal(near[pine?'needles':'leaves'].items.length,pine?1:4);
    assert.ok(near.wood.items.length<=22,'Detail reallocated from many bare twigs to connected crown masses');
  }
});

test('new vegetation consumes no cutout texture and retains explicit independent ownership',()=>{
  for(const kind of ['pine','broadleaf','grass']){
    const first=createVegetationMaterial(kind),second=createVegetationMaterial(kind);
    assert.equal(first.map,null);assert.equal(first.alphaMap,null);assert.equal(first.alphaTest,0);
    assert.equal(first.userData.vegetationKind,kind);assert.equal(first.transparent,false);
    assert.notEqual(first,second);assert.equal(first.side,kind==='grass'?T.DoubleSide:T.FrontSide);
    first.dispose();second.dispose();
  }
});

test('grouped blades root at ground level, and sculpted stone stays at the inherited metre scale',()=>{
  const grass=grassTuftGeometry(),rock=fracturedRockGeometry();
  assert.equal(grass.boundingBox.min.y,0);assert.ok(grass.boundingBox.max.y<=.9);
  assert.equal(grass.index.count/3,24);assert.ok(rock.attributes.position.count/3<=80);
  const rockSize=rock.boundingBox.getSize(new T.Vector3());
  assert.ok(rockSize.x<2.3&&rockSize.y<2&&rockSize.z<2.3);
  grass.dispose();rock.dispose();
});
