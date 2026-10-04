import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {packValleyDetail} from '../src/valley-ground-detail.js';

test('packed valley material preserves its caller and every historical grain byte',()=>{
  const size=256,source=new Uint8Array(size*size*4);
  for(let i=0;i<size*size;i++){const value=110+(i*13%51);source.set([value,value,value,255],i*4);}
  const before=source.slice(),first=packValleyDetail(source,size),second=packValleyDetail(source,size);
  assert.notEqual(first.buffer,source.buffer);assert.equal(first.byteLength,source.byteLength);
  assert.deepEqual(source,before,'The input can safely remain in use by a different surface.');assert.deepEqual(first,second);
  let strokes=0,crevices=0,slopes=0;
  for(let i=0;i<size*size;i++){
    const at=i*4;assert.equal(first[at],before[at]);assert.ok(first[at+1]>=96&&first[at+1]<=159);assert.ok(first[at+2]>=96&&first[at+2]<=159);
    if(first[at+3]>160)strokes++;if(first[at+3]<115)crevices++;if(Math.abs(first[at+1]-128)>5||Math.abs(first[at+2]-128)>5)slopes++;
  }
  assert.ok(strokes>1200&&strokes<9000,'Visible grass strokes must be sparse rather than fill the tile.');
  assert.ok(crevices>1000&&crevices<12000,'Soil must retain negative space.');assert.ok(slopes>1500&&slopes<size*size*.65);
});
test('packing rejects malformed arrays before producing a material',()=>{
  assert.throws(()=>packValleyDetail(new Uint8Array(16),256),/Invalid valley/);
  assert.throws(()=>packValleyDetail(new Uint8Array(4*8*8),8),/Invalid valley/);
});
test('production uses packed detail only for ground and leaves the river detail call unchanged',async()=>{
  const source=await readFile(new URL('../src/landscape.js',import.meta.url),'utf8');
  assert.match(source,/const surface=groundAlbedo\(\), detail=groundDetail\(true\)/);
  assert.match(source,/const time=\{value:0\},rippleTexture=groundDetail\(\)/);
  assert.match(source,/groundTexture\(valley\?packValleyDetail\(data,size\):data,size,false,true\)/);
});
