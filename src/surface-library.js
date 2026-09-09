import * as T from '../vendor/three.module.js';

// Fixed, bundled CC0 scans. All requests stay on the local game server.
const loaded=new Map(),skinLoaded=new Map(),pending=new Set(),failures=[];
const skinRegions=new Set(['torso','head','jaw','arm','leg']);
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
// Project-authored anatomical maps, baked from the original procedural canvases.
export function skinSurfaceSet(region){
 if(skinLoaded.has(region))return skinLoaded.get(region);
 if(!skinRegions.has(region))throw new Error(`Unknown skin region: ${region}`);
 const result={};
 for(const [role,field] of [['color','map'],['roughness','roughnessMap'],['bump','bumpMap']]){
  const url=new URL(`../assets/characters/skin-${region}-${role}.png`,import.meta.url).href;
  pending.add(url);
  const texture=loader.load(url,()=>pending.delete(url),undefined,()=>{pending.delete(url);failures.push(url);});
  texture.name=`Anatomical skin: ${region} ${role}`;
  texture.colorSpace=role==='color'?T.SRGBColorSpace:T.NoColorSpace;
  texture.wrapS=T.RepeatWrapping;texture.wrapT=T.ClampToEdgeWrapping;texture.anisotropy=8;
  texture.userData.shared=true;result[field]=texture;
 }
 skinLoaded.set(region,result);return result;
}
export function surfaceDiagnostics(){return {sets:loaded.size,skinSets:skinLoaded.size,pending:pending.size,failures:[...failures]};}
