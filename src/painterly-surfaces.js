// Project-authored painterly surfaces. Linear-light shader colors; no external
// assets, mutable material cache, added passes or simulated terrain displacement.
import {getMaterial} from './materials.js';

// A soft, metre-space boundary keeps this material pilot inside the selected
// riverbank/woodland rectangle. Outside it the established surfaces are exact.
const pilotMaskGLSL=`
  float pilotSurfaceMask(vec2 point) {
    vec2 enter=smoothstep(vec2(-65.0,-140.0),vec2(-57.0,-133.0),point);
    vec2 leave=1.0-smoothstep(vec2(24.0,-97.0),vec2(32.0,-90.0),point);
    return enter.x*enter.y*leave.x*leave.y;
  }
`;

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
      ${pilotMaskGLSL}
    `).replace('#include <map_fragment>', `#include <map_fragment>
      float cavity=clamp(diffuseColor.a,.52,1.0);diffuseColor.a=opacity;
      vec4 habitat=texture2D(uHabitat,vec2(vPaintPoint.x+600.0,600.0-vPaintPoint.z)/1200.0);
      vec3 authoredGround=diffuseColor.rgb;
      float pilotGround=pilotSurfaceMask(vPaintPoint.xz);
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
      if(pilotGround>0.0) {
        // Habitat already encodes grass/stone coverage; the remaining weight
        // is earth and woodland floor. Preserve those authored masses instead
        // of placing another high-contrast noise layer over their boundaries.
        float earth=clamp(1.0-habitat.r-habitat.g,0.0,1.0);
        float middle=texture2D(uBrushGrain,vPaintPoint.xz*.004+vec2(.17,.51)).r;
        float exposed=smoothstep(.42,.62,middle);
        vec3 meadow=mix(vec3(.108,.142,.075),vec3(.137,.149,.088),exposed*.28);
        vec3 woodland=mix(vec3(.067,.061,.043),vec3(.112,.085,.056),exposed);
        vec3 mineral=vec3(.139,.147,.124);
        vec3 habitatColour=meadow*habitat.r+mineral*habitat.g+woodland*earth;
        vec3 pilotColour=mix(authoredGround,habitatColour,.48);
        // Existing seamless detail provides only pigment grain. No extra maps,
        // relief, geological stripes, or geometry are introduced in the pilot.
        pilotColour*=.995+(grain-.53)*.030;
        float wetToe=smoothstep(.12,.90,vPaintWet);
        pilotColour=mix(pilotColour,vec3(.036,.051,.038),wetToe*.62);
        diffuseColor.rgb=mix(diffuseColor.rgb,pilotColour,pilotGround);
      }
    `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor=mix(.94,.67,vPaintWet);
      roughnessFactor=mix(roughnessFactor,mix(.95,.72,smoothstep(.12,.90,vPaintWet)),pilotGround);
    `).replace('#include <aomap_fragment>', `#include <aomap_fragment>
      reflectedLight.indirectDiffuse*=mix(1.0,cavity,.65);
    `);
  };
  material.customProgramCacheKey=()=> 'painterly-habitat-v4-meshy-pilot';
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
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>'+common+'\nuniform sampler2D uRiverBrush;'+pilotMaskGLSL)
      .replace('#include <color_fragment>',`#include <color_fragment>
        float acrossRiver=vRiverField.x,alongRiver=vRiverPosition.z;
        float edgeDistance=abs(acrossRiver)/vRiverField.y;
        float pilotWater=pilotSurfaceMask(vRiverPosition.xz);
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
        if(pilotWater<1.0) {
          vec2 flowUV=vec2(acrossRiver*.21,alongRiver*.032-uRiverTime*.022);
          float flow=texture2D(uRiverBrush,flowUV).r;
          float broken=texture2D(uRiverBrush,flowUV*vec2(.37,2.8)+vec2(.43,.17)).r;
          float streak=smoothstep(.625,.685,flow)*smoothstep(.55,.67,broken);
          diffuseColor.rgb+=vec3(.080,.105,.095)*streak*(1.0-contact)*.36;
        }
        // In this reach, depth carries the colour and moving normals carry
        // the current. Replace the painted cloudy streaks rather than adding
        // more opacity/reflection layers to them. The supplied physical bank
        // field controls every shallow/contact transition.
        float pilotShallows=(1.0-smoothstep(.04,.34,1.0-edgeDistance))*(.70+insideBend*.30);
        vec3 channelColour=mix(vec3(.012,.049,.058),vec3(.050,.096,.075),pilotShallows);
        float wetContact=smoothstep(.89,1.015,edgeDistance)*smoothstep(.47,.60,brush);
        channelColour=mix(channelColour,vec3(.023,.047,.035),wetContact*.45);
        diffuseColor.rgb=mix(diffuseColor.rgb,channelColour,pilotWater);
      `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(.43+shallows*.10+(vRiverWind.z-.5)*.018,.40,.56);
        roughnessFactor=mix(roughnessFactor,.38+pilotShallows*.18,pilotWater);
      `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec2 slope=vec2(0.0);
        if(pilotWater<1.0) {
          float crosswind=dot(vRiverWind.xy,across);
          vec2 flowNormal=vec2(acrossRiver*.22-crosswind*.025,alongRiver*.071-uRiverTime*.057);
          float ripple=texture2D(uRiverBrush,flowNormal).r-.53;
          float longRipple=texture2D(uRiverBrush,flowNormal*vec2(.63,1.13)+vec2(.31,.69)).r-.53;
          slope=across*ripple*(.048+vRiverWind.z*.021)+tangent*longRipple*.030;
        }
        // Restrained metre-scale ripples follow the actual channel tangent.
        // The existing clock and vertex motion remain untouched; there is no
        // additional animation loop or water simulation, and no new texture.
        if(pilotWater>0.0) {
          float currentPhase=alongRiver*.92+acrossRiver*.18-uRiverTime*.72;
          float crossPhase=alongRiver*1.87-acrossRiver*.29-uRiverTime*1.03;
          float shoreDamping=1.0-pilotShallows*.44;
          vec2 currentSlope=tangent*cos(currentPhase)*(.020+vRiverWind.z*.006)
            +across*cos(crossPhase)*.010;
          slope=mix(slope,currentSlope*shoreDamping,pilotWater);
        }
        normal=normalize(mat3(viewMatrix)*vec3(-slope.x,1.0,-slope.y));
      `).replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        // Keep a broad sky reflection from reading as a white painted ribbon.
        // Direct highlights still use the ordinary lights, normals and BRDF.
        reflectedLight.indirectSpecular*=1.0-pilotWater*.28;
      `);
  };
  material.customProgramCacheKey=()=> 'painterly-channel-v2-meshy-pilot';
}
