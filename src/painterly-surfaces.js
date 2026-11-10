// Painted material families share the existing world-space habitat, bank and
// wind fields. These shaders never displace terrain or define gameplay data.
import {getMaterial} from './materials.js';
import {surfaceSet} from './surface-library.js';

const ruinMaterials=new Map();
export function getRuinMaterial(kind, color) {
  if(!['stone','brick','pavement','rock'].includes(kind))return getMaterial(kind,color);
  const key=kind+':'+color;
  if(ruinMaterials.has(key))return ruinMaterials.get(key);
  const source=getMaterial(kind,color),material=source.clone();
  material.userData={...source.userData,shared:true};
  material.normalScale.setScalar(.12);material.roughness=.94;
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
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      // Weathering belongs to the masonry's foot and sheltered seams. Keep
      // lit stone faces broad and legible instead of multiplying them to black.
      float foot=1.0-smoothstep(.10,3.0,vRuinPoint.y);
      float rain=.5+.5*sin(vRuinPoint.x*.73+sin(vRuinPoint.z*.37)*1.4);
      float stain=smoothstep(.72,.91,rain)*(.07+foot*.13);
      diffuseColor.rgb*=mix(vec3(1.04,1.01,.94),vec3(.59,.65,.60),stain+foot*.24);
    `);
  };
  material.customProgramCacheKey=()=> 'painted-ruin-masonry-v4';
  material.name=source.name+' painted ruin';ruinMaterials.set(key,material);
  return material;
}

export function paintGround(material, {weights, detail, earth=surfaceSet('earth'), rock=surfaceSet('rock')}) {
  // Maps stay owned by the shared library. Retain discoverable handles for the
  // existing renderer inventory and resource disposal accounting.
  if(earth?.map)material.groundColourMap=earth.map;
  if(rock?.map)material.groundMineralMap=rock.map;
  material.onBeforeCompile = shader => {
    shader.uniforms.uHabitat={value:weights};
    shader.uniforms.uBrushGrain={value:detail};
    shader.uniforms.uEarthPaint={value:earth?.map??detail};
    shader.uniforms.uEarthPaintReady={value:earth?.map?1:0};
    shader.uniforms.uGroundMineral={value:rock?.map??detail};
    shader.uniforms.uGroundMineralReady={value:rock?.map?1:0};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vPaintPoint,vPaintNormal;attribute float groundMoisture;varying float vPaintWet;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintPoint=position;vPaintNormal=normal;vPaintWet=groundMoisture;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vPaintPoint,vPaintNormal;varying float vPaintWet;
      uniform sampler2D uHabitat,uBrushGrain,uEarthPaint,uGroundMineral;
      uniform float uEarthPaintReady,uGroundMineralReady;
    `).replace('#include <map_fragment>',`#include <map_fragment>
      float cavity=clamp(diffuseColor.a,.52,1.0);diffuseColor.a=opacity;
      vec4 habitat=texture2D(uHabitat,vec2(vPaintPoint.x+600.0,600.0-vPaintPoint.z)/1200.0);
      float meadow=habitat.r,mineral=habitat.g,woodland=habitat.b;
      float wetToe=smoothstep(.12,.88,vPaintWet);
      // The metre-scale painting is detail within the authored habitat masses;
      // it does not replace them with scattered decals or independent biomes.
      float cameraDistance=distance(cameraPosition,vPaintPoint);
      float finePresence=1.0-smoothstep(24.0,90.0,cameraDistance);
      vec2 paintUV=vPaintPoint.xz*.1;
      vec3 earthPaint=texture2D(uEarthPaint,paintUV).rgb;
      float paintTone=dot(earthPaint,vec3(.2126,.7152,.0722));
      // Quiet pigment masses carry City views; grit resolves only near the
      // ground. A coarser mip removes the scratch pattern from the broad sample.
      vec3 middlePaint=texture2D(uEarthPaint,vPaintPoint.xz*.037+vec2(.27,.61),2.0).rgb;
      float middleTone=dot(middlePaint,vec3(.2126,.7152,.0722));
      float paintedFacet=clamp(1.0+(paintTone-.095)*1.4*finePresence+(middleTone-.095)*2.1,.78,1.24);
      float closePaint=1.0-smoothstep(95.0,230.0,cameraDistance);
      float paintVisibility=1.0-smoothstep(300.0,620.0,cameraDistance);
      vec3 earthTint=mix(vec3(.88,.94,1.03),vec3(1.09,1.04,.91),smoothstep(.60,1.38,paintedFacet))*paintedFacet;
      float paintWeight=(.17+woodland*.15+habitat.a*.43)*(1.0-wetToe*.52)*(1.0-mineral*.44)*paintVisibility*uEarthPaintReady;
      diffuseColor.rgb*=mix(vec3(1.0),earthTint,paintWeight);
      // One packed normal sample supports close inspection. Its frequency and
      // contrast fade with distance so wide views remain composed and quiet.
      vec4 brush=texture2D(uBrushGrain,vPaintPoint.xz*.0625+vec2(.31,.72));
      // The packed alpha already contains unequal turf colonies and embedded
      // soil clods. Give them a quiet tonal presence between the large habitat
      // masses and physical plants, without another sample or a tiled decal.
      float turfTone=clamp(1.0+(brush.a-118.0/255.0)*.72,.90,1.16);
      float turfPresence=(.28+meadow*.48+habitat.a*.22)*(1.0-mineral*.82)*(1.0-wetToe*.78)*closePaint;
      diffuseColor.rgb*=mix(1.0,turfTone,turfPresence);
      float relief=closePaint*(1.0-wetToe*.84)*(1.0-mineral*.64);
      vec2 groundSlope=(brush.gb*2.0-1.0)*relief*.12;
      // Steep mineral faces use the same rock source as nearby outcrops. Blend
      // the two upright projections smoothly across the authored terrain
      // normals, instead of stretching the horizontal earth painting up cliffs.
      vec3 slopeNormal=abs(normalize(vPaintNormal));
      vec2 rockAxes=pow(slopeNormal.xz,vec2(4.0));
      rockAxes/=max(rockAxes.x+rockAxes.y,.0001);
      vec3 rockX=texture2D(uGroundMineral,vPaintPoint.zy/4.8).rgb;
      vec3 rockZ=texture2D(uGroundMineral,vPaintPoint.xy/4.8+vec2(.37,.19)).rgb;
      float rockTone=dot(rockX*rockAxes.x+rockZ*rockAxes.y,vec3(.2126,.7152,.0722));
      float rockPigment=mix(.88,1.10,smoothstep(.04,.48,rockTone));
      float rockPresence=mineral*smoothstep(.12,.52,1.0-slopeNormal.y)*(1.0-smoothstep(140.0,360.0,cameraDistance))*(1.0-wetToe*.72)*uGroundMineralReady;
      diffuseColor.rgb*=mix(1.0,rockPigment,rockPresence);
      // Broad mineral bedding follows the existing slope, with no fake ledges.
      float bedding=vPaintPoint.y*.29+vPaintPoint.x*.021+vPaintPoint.z*.013;
      diffuseColor.rgb*=mix(1.0,mix(.94,1.045,smoothstep(.16,.82,fract(bedding))),mineral*.58);
      diffuseColor.rgb*=mix(1.0,.79,wetToe);
    `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(.96,.70,wetToe);
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      normal=normalize(normal+mat3(viewMatrix)*vec3(-groundSlope.x,0.0,-groundSlope.y));
    `).replace('#include <aomap_fragment>',`#include <aomap_fragment>
      reflectedLight.indirectDiffuse*=mix(1.0,cavity,.57);
    `);
  };
  material.customProgramCacheKey=()=> 'painted-world-habitat-v15-turf-and-mineral';
}

export function paintRiver(material,time,ripple,windGLSL) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.uRiverTime=time;shader.uniforms.uRiverBrush={value:ripple};
    const common='\nuniform float uRiverTime;varying vec3 vRiverPosition,vRiverWind;varying vec4 vRiverField;\n';
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>'+common+windGLSL+'\nattribute vec4 riverField;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vec3 currentWind=worldWind(uRiverTime,position.xz);
        vRiverWind=currentWind;vRiverField=riverField;
        transformed.y+=sin(position.z*.24-uRiverTime*.72)*(.023+currentWind.z*.022)+cos(position.x*.44+position.z*.13-uRiverTime*.43)*.019;
        vRiverPosition=transformed;
      `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>'+common+'\nuniform sampler2D uRiverBrush;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        float acrossRiver=vRiverField.x,alongRiver=vRiverPosition.z;
        float edgeDistance=abs(acrossRiver)/vRiverField.y;
        vec2 tangent=normalize(vec2(vRiverField.z,1.0));
        vec2 across=vec2(tangent.y,-tangent.x);
        float brush=texture2D(uRiverBrush,vec2(alongRiver*.009,acrossRiver*.025)).r;
        float insideBend=smoothstep(-.12,.55,sign(vRiverField.w)*acrossRiver/vRiverField.y)*abs(vRiverField.w);
        // The existing physical channel controls every contact and shallows.
        // One continuous dark teal body replaces the pilot's separate treatment.
        float bankMetres=max(0.0,(1.0-edgeDistance)*vRiverField.y);
        float shallowReach=1.25+insideBend*2.9+(brush-.53)*1.7;
        float shallows=1.0-smoothstep(.18,shallowReach,bankMetres);
        vec3 deep=vec3(.021,.069,.084),bed=vec3(.094,.139,.116);
        diffuseColor.rgb=mix(deep,bed,shallows*.78);
        float contact=1.0-smoothstep(.06,.52,bankMetres);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.034,.057,.053),contact*.58);
        // Broken strokes follow flow, while the intervening channel stays calm.
        vec2 flowUV=vec2(acrossRiver*.037,alongRiver*.021-uRiverTime*.027);
        float flowA=texture2D(uRiverBrush,flowUV).r;
        float flowB=texture2D(uRiverBrush,flowUV*vec2(.73,1.37)+vec2(.31+uRiverTime*.003,.69-uRiverTime*.009)).r;
        float phaseBend=sin(alongRiver*.18+acrossRiver*.31-uRiverTime*.45)*2.4
          +sin(alongRiver*.09-acrossRiver*.41-uRiverTime*.19)*1.6;
        float currentPhase=alongRiver*1.12+acrossRiver*.39+phaseBend+flowA*8.0-uRiverTime*1.55;
        float secondaryPhase=alongRiver*1.57-acrossRiver*.72-phaseBend*.61+flowB*9.0-uRiverTime*2.15;
        float crossPhase=alongRiver*.56+acrossRiver*1.12-phaseBend*.36+(flowA+flowB)*5.0-uRiverTime*1.13;
        vec3 waveVisibility=1.0-smoothstep(vec3(.8),vec3(2.5),vec3(fwidth(currentPhase),fwidth(secondaryPhase),fwidth(crossPhase)));
        float bankDamping=1.0-smoothstep(.78,1.02,edgeDistance)*.68;
        float currentMark=smoothstep(.89,.998,sin(secondaryPhase))*smoothstep(.54,.66,flowA)*waveVisibility.y;
        diffuseColor.rgb+=vec3(.071,.103,.105)*currentMark*bankDamping*.12;
      `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(.31+shallows*.13+(flowB-.53)*.07,.28,.46);
      `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec2 slope=tangent*(cos(currentPhase)*.081*waveVisibility.x+cos(secondaryPhase)*.031*waveVisibility.y)
          +across*cos(crossPhase)*.063*waveVisibility.z;
        slope*=bankDamping*(.82+vRiverWind.z*.26)*(.78+.22*sin(alongRiver*.17-acrossRiver*.28-uRiverTime*.21));
        normal=normalize(mat3(viewMatrix)*vec3(-slope.x,1.0,-slope.y));
      `).replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
        material.specularColor=vec3(.0204);
        material.specularColorBlended=material.specularColor;
      `).replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        reflectedLight.directSpecular*=.61;
        reflectedLight.indirectSpecular*=.80;
      `);
  };
  material.customProgramCacheKey=()=> 'painted-river-v8-slate-current';
}
