import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

// Header-only dimensions for CPU geometry fixtures. This deliberately does not
// claim pixel decoding, GPU loading, material rendering or browser validation.
export function embeddedImageDimensions(bytes){
 if(bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a')return{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
 assert.equal(bytes.readUInt16BE(0),0xffd8,'CPU carrier texture must be PNG or JPEG');
 let at=2;while(at<bytes.length){
  while(bytes[at]===255)at++;const marker=bytes[at++];if(marker===217||marker===218)break;
  if(marker===1||(marker>=208&&marker<=215))continue;
  const size=bytes.readUInt16BE(at);assert.ok(size>=2&&at+size<=bytes.length,'JPEG segment bounds');
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return{width:bytes.readUInt16BE(at+5),height:bytes.readUInt16BE(at+3)};
  at+=size;
 }
 throw new Error('JPEG dimensions absent');
}
export async function cpuImageBitmap(blob){const dimensions=embeddedImageDimensions(Buffer.from(await blob.arrayBuffer()));assert.ok(dimensions.width>0&&dimensions.height>0);return{...dimensions,close(){}};}
export function installCPUCarrierEnvironment(){
 const keys=['document','self','fetch','createImageBitmap'],originals=new Map(keys.map(key=>[key,globalThis[key]]));
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createImageData:(width,height)=>({data:new Uint8ClampedArray(width*height*4),width,height}),measureText:text=>({width:String(text).length*8})},{get:(target,key)=>key in target?target[key]:()=>{}});
 globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){},setAttribute(){}})};
 globalThis.self=globalThis;globalThis.createImageBitmap=cpuImageBitmap;
 globalThis.fetch=async(value,options)=>{const url=new URL(value);if(url.protocol==='file:')return new Response(fs.readFileSync(fileURLToPath(url)),{headers:{'content-type':'model/gltf-binary'}});if(url.protocol==='blob:')return originals.get('fetch')(value,options);throw Error('CPU fixture blocks nonlocal request: '+url.protocol);};
 return()=>{for(const [key,value]of originals){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}};
}
