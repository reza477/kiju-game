import fs from 'node:fs';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';

// CPU-only decode of the untouched local GLB. Strip only material image
// references from a temporary in-memory JSON chunk; all geometry/skin bytes stay.
export async function fleshSculptFixture() {
  const input=fs.readFileSync(new URL('../../assets/carriers/meshy/flesh.glb',import.meta.url)),length=input.readUInt32LE(12),document=JSON.parse(input.subarray(20,20+length));
  for(const material of document.materials||[]){delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture;}
  const encoded=Buffer.from(JSON.stringify(document)),json=Buffer.alloc((encoded.length+3)&~3,32);encoded.copy(json);
  const binary=input.subarray(20+length),output=Buffer.alloc(20+json.length+binary.length);input.copy(output,0,0,20);output.writeUInt32LE(output.length,8);output.writeUInt32LE(json.length,12);json.copy(output,20);binary.copy(output,20+json.length);
  const gltf=await new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength),'');
  let mesh;gltf.scene.traverse(object=>{if(object.isSkinnedMesh)mesh=object;});
  return{gltf,mesh,input};
}
