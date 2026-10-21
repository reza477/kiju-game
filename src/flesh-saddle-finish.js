// Flesh saddle finish only. Apply after mesh construction, before batching.
// This keeps the existing bevels, metric UVs, geometry and gameplay anchors.
// Existing shared source materials are never mutated.
const finished=new WeakMap();
const structure={
  'metal 454849':{color:0x4f5b52,roughness:.80,metalness:.34,bumpScale:.012},
  'metal 586363':{color:0x626d62,roughness:.74,metalness:.38,bumpScale:.012},
  'metal 303a3b':{color:0x354139,roughness:.79,metalness:.32,bumpScale:.008},
  'gold 8c8060':{color:0x9a8660,roughness:.70,metalness:.48},
  'gold 9d8960':{color:0x9a8660,roughness:.70,metalness:.48}
};
const battery={
  'metal 665075':{color:0x52635b,roughness:.76,metalness:.32,bumpScale:.012},
  'metal 202f37':{color:0x293830,roughness:.49,metalness:.58,bumpScale:.005},
  'gold d3ad68':{color:0x8e7856,roughness:.64,metalness:.55},
  'gold f3d396':{color:0xb79e6d,roughness:.61,metalness:.50}
};

function finish(source,role){
  if(!source||source.userData.fleshSaddleFinish)return source;
  const profile=(role==='battery'?battery:structure)[source.name];
  if(!profile)return source;
  let roles=finished.get(source);if(!roles){roles=new Map();finished.set(source,roles);}
  if(roles.has(role))return roles.get(role);
  const material=source.clone();
  // Material.clone does not preserve these callbacks. Keep the existing
  // neutral painted-iron reflectance shader and its exact cache identity.
  material.onBeforeCompile=source.onBeforeCompile;
  material.customProgramCacheKey=source.customProgramCacheKey;
  material.color.setHex(profile.color);
  material.roughness=profile.roughness;material.metalness=profile.metalness;
  if(profile.bumpScale!==undefined&&source.map){
    // The existing authored iron map supplies shallow oxide relief. Reuse
    // its GPU texture; do not add checker-plate patterns to curved castings.
    material.bumpMap=source.map;material.bumpScale=profile.bumpScale;
    material.clearcoat=.04;material.clearcoatRoughness=.84;
  }
  material.name=source.name+' flesh-saddle finish v1';
  material.userData={...source.userData,shared:true,fleshSaddleFinish:{version:1,role,source:source.name}};
  roles.set(role,material);return material;
}

export function applyFleshSaddleFinish(group,role='structure'){
  group.traverse(object=>{
    if(!object.isMesh)return;
    if(Array.isArray(object.material))object.material=object.material.map(material=>finish(material,role));
    else object.material=finish(object.material,role);
  });
  return group;
}
