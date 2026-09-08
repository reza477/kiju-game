// Development-only acquisition of a fixed selection of CC0 texture assets.
// No game data is sent. The shipped game reads the downloaded local files only.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
const selection={grass:'leafy_grass',soil:'forest_ground_04',slate:'rock_ground_02',rock:'rock_face_03',bark:'bark_brown_02',stone:'castle_brick_01',brick:'church_bricks_02',roof:'roof_slates_02',metal:'metal_plate',wood:'oak_wood_planks',plaster:'grey_plaster'};
const headers={'User-Agent':'LocalMaterialStudy/1.0'},out=path.resolve('assets/materials');await fs.mkdir(out,{recursive:true});
let catalog;try{catalog=JSON.parse(await fs.readFile('artifacts/material-study/catalog.json','utf8'));}catch{const response=await fetch('https://api.polyhaven.com/assets',{headers});if(!response.ok)throw Error(`Catalog: ${response.status}`);catalog=await response.json();}
const manifest={provider:'Poly Haven',license:'CC0-1.0',licenseUrl:'https://polyhaven.com/license',apiCredit:'Powered by Poly Haven',downloaded:'2026-09-08',assets:{}};
for(const [name,id] of Object.entries(selection)){
 const response=await fetch(`https://api.polyhaven.com/files/${id}`,{headers});if(!response.ok)throw Error(`${id}: ${response.status}`);const files=await response.json();
 const entry={id,name:catalog[id].name,source:`https://polyhaven.com/a/${id}`,authors:catalog[id].authors,dimensions:catalog[id].dimensions,files:{}};
 for(const [role,keys] of Object.entries({color:['Diffuse','diff','diff_png'],normal:['nor_gl'],roughness:['Rough','rough']})){
  const variants=keys.map(k=>files[k]?.['1k']).filter(Boolean),format=variants.some(v=>v.jpg)?'jpg':'png';
  const choice=variants.map(v=>v[format]).find(Boolean);if(!choice)throw Error(`Missing ${id} ${role}; available ${Object.keys(files)}`);
  const filename=`${name}-${role}.${format}`,dest=path.join(out,filename);let buffer;
  try{buffer=await fs.readFile(dest);if(crypto.createHash('md5').update(buffer).digest('hex')!==choice.md5)buffer=null;}catch{}
  if(!buffer){const file=await fetch(choice.url,{headers});if(!file.ok)throw Error(`${choice.url}: ${file.status}`);buffer=Buffer.from(await file.arrayBuffer());if(crypto.createHash('md5').update(buffer).digest('hex')!==choice.md5)throw Error(`Integrity mismatch: ${filename}`);await fs.writeFile(dest,buffer);}
  entry.files[role]={path:filename,url:choice.url,bytes:buffer.length,md5:choice.md5};
 }
 manifest.assets[name]=entry;console.log(`${name}: ${Object.values(entry.files).reduce((n,f)=>n+f.bytes,0)} bytes`);
}
const hdrId='kloppenheim_06_puresky',hdrResponse=await fetch(`https://api.polyhaven.com/files/${hdrId}`,{headers});
if(!hdrResponse.ok)throw Error(`HDR manifest: ${hdrResponse.status}`);
const hdr=(await hdrResponse.json()).hdri['1k'].hdr,hdrPath=path.join(out,'daylight.hdr');let hdrData;
try{hdrData=await fs.readFile(hdrPath);if(crypto.createHash('md5').update(hdrData).digest('hex')!==hdr.md5)hdrData=null;}catch{}
if(!hdrData){const response=await fetch(hdr.url,{headers});if(!response.ok)throw Error(`HDR: ${response.status}`);hdrData=Buffer.from(await response.arrayBuffer());if(crypto.createHash('md5').update(hdrData).digest('hex')!==hdr.md5)throw Error('HDR integrity mismatch');await fs.writeFile(hdrPath,hdrData);}
manifest.environment={id:hdrId,name:catalog[hdrId].name,authors:catalog[hdrId].authors,source:`https://polyhaven.com/a/${hdrId}`,path:'daylight.hdr',bytes:hdrData.length,md5:hdr.md5,url:hdr.url};
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Stored verified local materials and source manifest.');
