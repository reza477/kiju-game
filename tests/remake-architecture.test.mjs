import test from 'node:test';
import assert from 'node:assert/strict';

// Geometry/attachment checks run without WebGL or a personal browser profile.
const canvasContext=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),measureText:t=>({width:String(t).length*8})},{get:(o,k)=>k in o?o[k]:()=>{}});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>canvasContext}),createElementNS:()=>({addEventListener(){},removeEventListener(){},setAttribute(){}})};
const T=await import('../vendor/three.module.js');
const craft=await import('../src/carrier-craft.js');
const architecture=await import('../src/architecture.js');
const {makeCity}=await import('../src/carriers.js');

function integrity(root,{strict=true}={}){
  let triangles=0;const v=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  root.traverse(o=>{
    if(!o.isMesh)return;
    const g=o.geometry,p=g.attributes.position,n=g.attributes.normal;
    assert.ok(p&&n,`${o.name}: position and normal attributes required`);
    for(const attr of Object.values(g.attributes))for(const value of attr.array)assert.ok(Number.isFinite(value),`${o.name}: nonfinite geometry`);
    for(let i=0;i<n.count;i++)assert.ok(v.fromBufferAttribute(n,i).lengthSq()>.5,`${o.name}: zero normal`);
    if(strict)for(let i=0;i<(g.index?.count??p.count);i+=3){const at=j=>g.index?g.index.getX(j):j;a.fromBufferAttribute(p,at(i));b.fromBufferAttribute(p,at(i+1));c.fromBufferAttribute(p,at(i+2));assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>1e-13,`${o.name}: degenerate triangle`);triangles++;}
  });return triangles;
}

test('authored crawler structure stays in its former footprint, above terrain contact and below the deck',()=>{
  const podium=new T.Group();craft.createCrawlerPodium(podium);assert.ok(integrity(podium)>100);
  const bounds=new T.Box3().setFromObject(podium);
  assert.ok(bounds.min.x>=-10.051&&bounds.max.x<=10.051);
  assert.ok(bounds.min.z>=-11.551&&bounds.max.z<=11.551);
  assert.ok(bounds.min.y>=7.774&&bounds.max.y<=9.65);
  const deck=new T.Group();craft.createCrawlerCityPlatform(deck,10);integrity(deck);
  const b=new T.Box3().setFromObject(deck);assert.ok(b.min.y>=9.124&&b.max.y<=10.061);assert.ok(b.max.x<=8.751&&b.max.z<=9.151);
  // Top cap normals must face up; reversed winding creates a dark/invisible deck.
  deck.traverse(o=>{if(o.name!=='Dressed city deck rim')return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;let up=0;for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-10.06)<.001&&n.getY(i)>.99)up++;assert.ok(up>=18);});
});

test('swept plough retains the old prow reach and has complete finite surface normals',()=>{
  const prow=new T.Group();craft.createCrawlerProw(prow);integrity(prow);
  const b=new T.Box3().setFromObject(prow);assert.ok(b.min.x>=-6.51&&b.max.x<=6.51);assert.ok(b.max.z<=14.71);assert.ok(b.min.y>=1.55);
});

test('vaulted undercroft geometry has real open surrounds and remains inside the city podium envelope',()=>{
  const root=new T.Group();craft.dressCrawlerUndercroft(root);integrity(root);
  const surrounds=[];root.traverse(o=>{if(o.name==='Continuous vaulted arcade surround')surrounds.push(o);});assert.equal(surrounds.length,20);
  const b=new T.Box3().setFromObject(root);assert.ok(b.max.x<9.51&&b.min.x>-9.51);assert.ok(b.max.z<10.71&&b.min.z>-10.71);assert.ok(b.max.y<9.60);
});

test('mansards and bow fronts have finite authored normals across starter and upgraded districts',()=>{
  let roofs=0,bows=0;
  for(const level of[1,3,5])for(const type of['keep','housing']){
    const district=architecture.createDistrict(type,level,'crawler');
    const authored=new T.Group();district.traverse(o=>{if(['Hipped mansard slate roof','Folded mansard eaves','Splayed timber oriel','Oriel carved sill','Oriel swept lintel','Chamfered civic clock tower','Clock tower carved crown'].includes(o.name)){const clone=o.clone();clone.geometry=o.geometry;authored.add(clone);if(o.name==='Hipped mansard slate roof')roofs++;if(o.name==='Splayed timber oriel')bows++;}});
    integrity(authored);const bounds=new T.Box3().setFromObject(district);assert.ok(bounds.min.x>=-1.41&&bounds.max.x<=1.41);assert.ok(bounds.min.z>=-1.71&&bounds.max.z<=1.71);
  }
  assert.equal(roofs,15);assert.equal(bows,9);
});

test('crawler variants retain all 20 selection boxes, original support samples and animated axle anchors',()=>{
  for(const variant of['standard','drill']){
    const city=makeCity('crawler',false,1,variant);assert.equal(city.deckY,10);assert.equal(city.layout,'deck');assert.equal(city.slots.length,20);
    for(let i=0;i<20;i++){const slot=city.slots[i];assert.equal(slot.userData.slot,i);assert.deepEqual(slot.position.toArray(),[(i%5-2)*3.05,.5,(Math.floor(i/5)-1.5)*3.7]);assert.deepEqual([slot.geometry.parameters.width,slot.geometry.parameters.height,slot.geometry.parameters.depth],[2.8,1,3.4]);}
    const wheels=city.spinners.filter(s=>!s.drill);assert.equal(wheels.length,14);assert.ok(wheels.every(s=>s.axis==='x'&&s.speed===1.8&&s.obj.position.y===2.55&&Math.abs(s.obj.position.x)===9));
    assert.equal(city.groundSupports.length,552);assert.ok(city.groundSupports.every(p=>p.y<2.4));
  }
});
