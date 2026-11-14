import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three.module.js';
import {createGroundPatchCache,GROUND_PATCH} from '../src/ground-patch.js';

function mockTexture(width=GROUND_PATCH.width,height=GROUND_PATCH.height){
  const texture=new T.Texture({width,height});texture.disposeCalls=0;texture.addEventListener('dispose',()=>texture.disposeCalls++);return texture;
}
test('ground preload is one shared decoded family, with no repeated request on scene reuse',async()=>{
  const requested=[],textures=[],cache=createGroundPatchCache(async url=>{requested.push(url);const texture=mockTexture();textures.push(texture);return texture;});
  const first=cache.load(),second=cache.load();assert.equal(first,second);const maps=await first;
  assert.equal(cache.maps,maps);assert.equal(await cache.load(),maps);assert.equal(requested.length,2);assert.equal(cache.status().state,'ready');
  assert.ok(requested.every(url=>url.protocol==='file:'&&url.pathname.includes('/assets/materials/westbank-ground-')));
  assert.equal(maps.colour.colorSpace,T.SRGBColorSpace);assert.equal(maps.relief.colorSpace,T.NoColorSpace);
  for(const texture of textures){assert.equal(texture.userData.shared,true);assert.equal(texture.flipY,false);assert.equal(texture.generateMipmaps,true);assert.equal(texture.anisotropy,4);assert.equal(texture.wrapS,T.ClampToEdgeWrapping);assert.equal(texture.minFilter,T.LinearMipmapLinearFilter);assert.equal(texture.disposeCalls,0);}
});
test('ground preload disposes incomplete maps once and retains a failed request without retry',async()=>{
  let calls=0;const good=mockTexture(),bad=mockTexture(1,1),cache=createGroundPatchCache(async()=>++calls===1?good:bad);
  const first=cache.load();await assert.rejects(first,/invalid decoded dimensions/);assert.equal(cache.maps,null);assert.equal(cache.status().state,'failed');
  assert.equal(cache.load(),first);await assert.rejects(cache.load());assert.equal(calls,2);assert.equal(good.disposeCalls,1);assert.equal(bad.disposeCalls,1);
});
test('ground preload releases a decoded first map if the second local fetch fails',async()=>{
  let calls=0;const texture=mockTexture(),cache=createGroundPatchCache(async()=>{if(++calls===2)throw new Error('network unavailable');return texture;});
  await assert.rejects(cache.load(),/network unavailable/);assert.equal(texture.disposeCalls,1);assert.equal(cache.maps,null);
});
test('bundled atlas is complete RGBA with roughness and bounded optical slopes',async()=>{
  for(const kind of['colour','relief']){
    const bytes=await readFile(new URL('../assets/materials/westbank-ground-'+kind+'.png',import.meta.url));
    assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(bytes.readUInt32BE(16),1024);assert.equal(bytes.readUInt32BE(20),512);assert.equal(bytes[24],8);assert.equal(bytes[25],6);
    const idat=[];for(let offset=8;offset<bytes.length;){const size=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(type==='IDAT')idat.push(bytes.subarray(offset+8,offset+8+size));offset+=size+12;}
    const rows=inflateSync(Buffer.concat(idat));assert.equal(rows.length,(1024*4+1)*512);
    for(let row=0;row<512;row++){const start=row*(1024*4+1);assert.equal(rows[start],1);for(let c=4;c<1024*4;c++)rows[start+1+c]=(rows[start+1+c]+rows[start+1+c-4])&255;}
    let rangeMin=255,rangeMax=0;
    for(let row=0;row<512;row++){const start=row*(1024*4+1);for(let col=0;col<1024;col++){
      const i=start+1+col*4,value=rows[i+(kind==='colour'?3:0)];rangeMin=Math.min(rangeMin,value);rangeMax=Math.max(rangeMax,value);
      if(kind==='relief'){assert.equal(rows[i+3],255);assert.ok(rows[i+2]>=219);}
    }}
    if(kind==='colour'){assert.ok(rangeMin>=186&&rangeMax<=240);assert.ok(rangeMax-rangeMin>25);}else{assert.ok(rangeMin>=57&&rangeMax<=198);assert.ok(rangeMax-rangeMin>25);}
  }
});
// Every pixel must match. The PNG bytes also match where the running Node
// build compresses like the one that wrote the files; Homebrew Node on macOS
// links another zlib, and the generator then reports which files differ.
test('bundled ground maps reproduce pixel-for-pixel from the checked-in local generator',t=>{
  const output=execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/generate-ground-patch.mjs',import.meta.url)),'--check'],{encoding:'utf8'});
  const report=JSON.parse(output);assert.equal(report.verifiedOnly,true);assert.equal(report.textures.length,2);assert.equal(report.losslessPngRoundTrip,true);assert.equal(report.physicalGeometryChanged,false);assert.equal(report.pixelsIdentical,true);
  t.diagnostic(JSON.stringify({compressedBytesDifferOnThisNodeBuild:report.compressedBytesDifferOnThisNodeBuild??[]}));
});
