import * as T from '../vendor/three.module.js';

// Fixed, bundled CC0 scans. All requests stay on the local game server.
const loaded=new Map(),pending=new Set(),failures=[];
const tileSize={grass:5.2,soil:5.6,slate:6,rock:4,bark:2.2,stone:3.4,brick:3.2,roof:3.4,metal:4,wood:3.2,plaster:3.6};
const loader=new T.TextureLoader();
export function surfaceSet(name){
 if(loaded.has(name))return loaded.get(name);
 if(!Object.hasOwn(tileSize,name))return null;
 const result={scale:tileSize[name]};
 for(const [role,field] of [['color','map'],['normal','normalMap'],['roughness','roughnessMap']]){
  const extension='jpg';
  const url=new URL(`../assets/materials/${name}-${role}.${extension}`,import.meta.url).href;
  pending.add(url);
  const texture=loader.load(url,()=>pending.delete(url),undefined,()=>{pending.delete(url);failures.push(url);});
  texture.name=`${name} ${role} · Poly Haven CC0`;
  texture.colorSpace=role==='color'?T.SRGBColorSpace:T.NoColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;
  texture.userData.shared=true;result[field]=texture;
 }
 loaded.set(name,result);return result;
}
export function surfaceDiagnostics(){return {sets:loaded.size,pending:pending.size,failures:[...failures]};}
