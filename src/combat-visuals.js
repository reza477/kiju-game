import * as T from '../vendor/three.module.js';

const textures=new Map();
export function combatTexture(kind){
  if(textures.has(kind))return textures.get(kind);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const context=canvas.getContext('2d'),pixels=context.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const u=(x-63.5)/63.5,v=(y-63.5)/63.5,r=Math.hypot(u,v),a=Math.atan2(v,u);
    const cloud=.75+.13*Math.sin(u*16+Math.sin(v*11)*2)+.08*Math.sin(v*29-u*13)+.04*Math.sin(v*63+u*48);
    const alpha=kind==='smoke'?Math.pow(Math.max(0,1-r),1.1)*cloud:Math.exp(-r*r*8)*(1-Math.min(1,r))*(.76+.24*Math.cos(a*7+r*9));
    const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(T.MathUtils.clamp(alpha,0,1)*255);
  }
  context.putImageData(pixels,0,0);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.NoColorSpace;texture.userData.shared=true;textures.set(kind,texture);return texture;
}

export function addImpactLayers(group){
  const flash=new T.Sprite(new T.SpriteMaterial({map:combatTexture('flash'),color:new T.Color(0xffc779).multiplyScalar(4),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));
  flash.visible=false;group.add(flash);
  const smoke=Array.from({length:5},(_,i)=>{
    const sprite=new T.Sprite(new T.SpriteMaterial({map:combatTexture('smoke'),color:0x6e6c67,transparent:true,depthWrite:false,opacity:0,rotation:i*1.731}));sprite.visible=false;group.add(sprite);return sprite;
  });
  return {flash,smoke};
}

export function updateImpactLayers(layers,age,missile,melee){
  const energy=missile?1.2:melee?.85:1;
  layers.flash.visible=age<.32;layers.flash.scale.setScalar((3.0+age*19)*energy);layers.flash.material.opacity=Math.exp(-age*12)*.94;
  for(let i=0;i<layers.smoke.length;i++){
    const sprite=layers.smoke[i],angle=i*2.399963;
    sprite.visible=age>.04;sprite.position.set(Math.sin(angle)*age*2.1,.18+age*(1.8+i*.15),Math.cos(angle)*age*1.3);
    sprite.scale.setScalar((1.2+age*3.7)*energy*(.8+i*.12));sprite.material.opacity=Math.min(1,age*7)*Math.max(0,1-age/1.2)*.31;
  }
}
