// Project-authored painterly surfaces. Linear-light shader colors; no external
// assets, mutable material cache, added passes or simulated terrain displacement.
import {getMaterial} from './materials.js';

// A bounded page-lifetime family: immutable variants of existing shared maps.
// The source cache owns maps; resource scenes borrow these shared materials.
const ruinMaterials=new Map();
export function getRuinMaterial(kind, color) {
  if(!['stone','brick','pavement','rock'].includes(kind))return getMaterial(kind,color);
  const key=kind+':'+color;
  if(ruinMaterials.has(key))return ruinMaterials.get(key);
  const source=getMaterial(kind,color),material=source.clone();
  material.userData={...source.userData,shared:true};
  material.normalScale.setScalar(.19);material.roughness=.95;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRuinPoint;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 ruinPoint=vec4(position,1.0);
        #ifdef USE_INSTANCING
          ruinPoint=instanceMatrix*ruinPoint;
        #endif
        vRuinPoint=ruinPoint.xyz;
      `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRuinPoint;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec4 masonry=texture2D(map,vMapUv);
      float tone=dot(masonry.rgb,vec3(.2126,.7152,.0722));
      // Large stone planes carry light; photographed flecks stay subordinate.
      float plane=mix(.31,.72,smoothstep(.045,.35,tone));
      float foot=1.0-smoothstep(.12,3.4,vRuinPoint.y);
      float rain=.5+.5*sin(vRuinPoint.x*1.13+sin(vRuinPoint.z*.61)*1.7);
      float stain=smoothstep(.62,.81,rain)*(.19+foot*.38);
      // Broad aged masonry faces, selective vertical deposits and worn mortar.
      // The original map retains the actual stone/brick joints; no fake openings.
      float deposit=smoothstep(.73,.87,rain)*(1.0-foot)*.14;
      diffuseColor.rgb*=mix(vec3(.84,.91,.92),vec3(.34,.46,.35),stain+foot*.38)*plane;
      diffuseColor.rgb+=vec3(.12,.105,.075)*deposit;
      diffuseColor.a*=masonry.a;
    #endif`);
  };
  material.customProgramCacheKey=()=> 'painterly-ruin-stone-v3';
  material.name=source.name+' painterly ruin';ruinMaterials.set(key,material);
  return material;
}
export function paintGround(material, {weights, detail}) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uHabitat = {value:weights};
    shader.uniforms.uBrushGrain = {value:detail};
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaintPoint;attribute float groundMoisture;varying float vPaintWet;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintPoint=position;vPaintWet=groundMoisture;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vPaintPoint;varying float vPaintWet;
      uniform sampler2D uHabitat,uBrushGrain;
    `).replace('#include <map_fragment>', `#include <map_fragment>
      float cavity=clamp(diffuseColor.a,.52,1.0);diffuseColor.a=opacity;
      vec4 habitat=texture2D(uHabitat,vec2(vPaintPoint.x+600.0,600.0-vPaintPoint.z)/1200.0);
      // Fine grain supports the broad authored habitat masses.
      // No photographic grass, artificial pebble relief or fine repeated stamps.
      float grain=texture2D(uBrushGrain,vPaintPoint.xz*.37+vec2(.31,.72)).r;
      float bedding=vPaintPoint.y*.24+vPaintPoint.x*.037+vPaintPoint.z*.018;
      float strata=mix(.93,1.05,smoothstep(.13,.83,fract(bedding)));
      // Habitat edges and bank patches are authored into the world albedo.
      // Leave open ground quiet rather than stamping high-contrast noise over it.
      diffuseColor.rgb*=.977+(grain-.5)*.025;
      diffuseColor.rgb*=mix(1.0,strata,habitat.g*.45);
      diffuseColor.rgb*=mix(1.0,.78,vPaintWet);
    `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor=mix(.94,.67,vPaintWet);
    `).replace('#include <aomap_fragment>', `#include <aomap_fragment>
      reflectedLight.indirectDiffuse*=mix(1.0,cavity,.65);
    `);
  };
  material.customProgramCacheKey=()=> 'painterly-habitat-v3';
}

export function paintRiver(material, time, ripple, windGLSL) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uRiverTime=time;shader.uniforms.uRiverBrush={value:ripple};
    const common='\nuniform float uRiverTime;varying vec3 vRiverPosition,vRiverWind;varying vec4 vRiverField;\n';
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>'+common+windGLSL+'\nattribute vec4 riverField;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vec3 currentWind=worldWind(uRiverTime,position.xz);
        vRiverWind=currentWind;vRiverField=riverField;
        // Retain the existing small surface motion and its native timing.
        transformed.y+=sin(position.z*.24-uRiverTime*.72)*(.023+currentWind.z*.022)+cos(position.x*.44+position.z*.13-uRiverTime*.43)*.019;
        vRiverPosition=transformed;
      `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>'+common+'\nuniform sampler2D uRiverBrush;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        float acrossRiver=vRiverField.x,alongRiver=vRiverPosition.z;
        float edgeDistance=abs(acrossRiver)/vRiverField.y;
        float bend=vRiverField.w;
        vec2 tangent=normalize(vec2(vRiverField.z,1.0));
        vec2 across=vec2(tangent.y,-tangent.x);
        // The bank distances are supplied by terrain.js, the same field that
        // supports the world. Local inside-bend shallows occupy a narrow band.
        float brush=texture2D(uRiverBrush,vec2(alongRiver*.009,acrossRiver*.025)).r;
        float insideBend=smoothstep(-.12,.55,sign(bend)*acrossRiver/vRiverField.y)*abs(bend);
        float shallows=smoothstep(.69,.97,edgeDistance)*(.40+insideBend*.60);
        vec3 deep=vec3(.012,.062,.071),shallow=vec3(.062,.139,.117);
        diffuseColor.rgb=mix(deep,shallow,shallows*.84);
        diffuseColor.rgb*=.97+(brush-.5)*.075;
        float contact=smoothstep(.965,1.05,edgeDistance);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.035,.073,.062),contact*.72);
        // Sparse elongated current marks; calm negative space carries the water.
        vec2 flowUV=vec2(acrossRiver*.21,alongRiver*.032-uRiverTime*.022);
        float flow=texture2D(uRiverBrush,flowUV).r;
        float broken=texture2D(uRiverBrush,flowUV*vec2(.37,2.8)+vec2(.43,.17)).r;
        float streak=smoothstep(.625,.685,flow)*smoothstep(.55,.67,broken);
        diffuseColor.rgb+=vec3(.080,.105,.095)*streak*(1.0-contact)*.36;
      `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(.43+shallows*.10+(vRiverWind.z-.5)*.018,.40,.56);
      `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float crosswind=dot(vRiverWind.xy,across);
        vec2 flowNormal=vec2(acrossRiver*.22-crosswind*.025,alongRiver*.071-uRiverTime*.057);
        float ripple=texture2D(uRiverBrush,flowNormal).r-.53;
        float longRipple=texture2D(uRiverBrush,flowNormal*vec2(.63,1.13)+vec2(.31,.69)).r-.53;
        vec2 slope=across*ripple*(.048+vRiverWind.z*.021)+tangent*longRipple*.030;
        normal=normalize(mat3(viewMatrix)*vec3(-slope.x,1.0,-slope.y));
      `);
  };
  material.customProgramCacheKey=()=> 'painterly-channel-v1';
}
