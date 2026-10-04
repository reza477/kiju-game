import * as T from '../vendor/three.module.js';

// Project-authored, non-repeating material atlas. It follows the existing
// ground in world metres; it never supplies height or gameplay information.
export const GROUND_PATCH = Object.freeze({minX:-65,maxX:32,minZ:-140,maxZ:-90,width:1024,height:512});
const files = Object.freeze({colour:'../assets/materials/westbank-ground-colour.png',relief:'../assets/materials/westbank-ground-relief.png'});

// One immutable family per page, like the existing shared surface library.
// A failed preload stays failed; changing scene/detail does not retry requests.
export function createGroundPatchCache(loadTexture = url => new T.TextureLoader().loadAsync(url)) {
  let promise, maps=null;
  const status={state:'idle',milliseconds:0,error:null};
  return {
    get maps(){return maps;},
    status:()=>({...status}),
    load(){
      if(promise)return promise;
      const started=performance.now(),owned=[];status.state='loading';
      promise=(async()=>{
        try{
          const result={};
          for(const[kind,relative]of Object.entries(files)){
            const texture=await loadTexture(new URL(relative,import.meta.url));owned.push(texture);
            if(texture.image?.width!==GROUND_PATCH.width||texture.image?.height!==GROUND_PATCH.height)throw new Error('Local ground '+kind+' map has invalid decoded dimensions');
            texture.name='Westbank authored ground '+kind;
            texture.colorSpace=kind==='colour'?T.SRGBColorSpace:T.NoColorSpace;
            texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;
            texture.flipY=false;
            texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=4;
            texture.userData={...texture.userData,shared:true,groundPatch:kind};texture.needsUpdate=true;
            result[kind]=texture;
          }
          maps=Object.freeze(result);status.state='ready';return maps;
        }catch(error){
          for(const texture of new Set(owned)){texture.dispose();texture.image?.close?.();}
          status.state='failed';status.error=String(error?.message||error);throw error;
        }finally{status.milliseconds=performance.now()-started;}
      })();
      return promise;
    }
  };
}
const cache=createGroundPatchCache();
export const loadGroundPatch=()=>cache.load();
export const groundPatchStatus=()=>cache.status();
export const groundPatchMaps=()=>cache.maps;
