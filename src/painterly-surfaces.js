// Project-authored painterly surfaces. Linear-light shader colors; no external
// assets, mutable material cache, added passes or simulated terrain displacement.
import {getMaterial} from './materials.js';
import {groundPatchMaps} from './ground-patch.js';

// A soft, metre-space boundary keeps this material pilot inside the selected
// riverbank/woodland rectangle. Outside it the established surfaces are exact.
const pilotMaskGLSL=`
  float pilotSurfaceMask(vec2 point) {
    vec2 enter=smoothstep(vec2(-65.0,-140.0),vec2(-57.0,-133.0),point);
    vec2 leave=1.0-smoothstep(vec2(24.0,-97.0),vec2(32.0,-90.0),point);
    return enter.x*enter.y*leave.x*leave.y;
  }
`;

// Static litter beds follow the six pre-existing pilot trees, not new scatter
// or simulated shadows. Their root positions come from the unchanged seeded
// landscape records. Forest floor remains after a tree is crushed.
const pilotWoodlandGLSL=`
  float pilotRootDistance(vec2 point,vec2 root,vec2 inverseSpread,float lean) {
    vec2 offset=point-root;offset.x+=offset.y*lean;
    offset*=inverseSpread;return dot(offset,offset);
  }
  float pilotWoodlandDistance(vec2 point) {
    // tree:49 / tree:146 share an existing small east-bank canopy group.
    float floorDistance=pilotRootDistance(point,vec2(2.3642589105293155,-119.47577563114464),vec2(.167,.208),.16);
    floorDistance=min(floorDistance,pilotRootDistance(point,vec2(3.730055456981063,-116.97929303627461),vec2(.172,.192),-.19));
    // tree:1124, tree:477, tree:791 and tree:200 retain their original roots.
    floorDistance=min(floorDistance,pilotRootDistance(point,vec2(24.627368431538343,-117.10031807888299),vec2(.137,.169),.12));
    floorDistance=min(floorDistance,pilotRootDistance(point,vec2(-51.35322615969926,-116.31229785270989),vec2(.185,.208),-.22));
    floorDistance=min(floorDistance,pilotRootDistance(point,vec2(-42.17492421157658,-103.26209894847125),vec2(.152,.196),.24));
    return min(floorDistance,pilotRootDistance(point,vec2(-62.42828615941107,-130.5583181558177),vec2(.208,.244),-.16));
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
  const patch=groundPatchMaps();
  // Enumerable texture handles keep the shared atlas visible to the existing
  // resource inventory. Scene/material disposal never owns these page maps.
  if(patch){material.groundColourMap=patch.colour;material.groundReliefMap=patch.relief;}
  material.onBeforeCompile = shader => {
    shader.uniforms.uHabitat = {value:weights};
    shader.uniforms.uBrushGrain = {value:detail};
    shader.uniforms.uGroundColour = {value:patch?.colour??null};
    shader.uniforms.uGroundRelief = {value:patch?.relief??null};
    shader.uniforms.uGroundPatchReady = {value:patch?1:0};
    shader.uniforms.uValleyDetailReady = {value:detail.userData.valleyDetail?1:0};
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaintPoint;attribute float groundMoisture;varying float vPaintWet;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintPoint=position;vPaintWet=groundMoisture;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vPaintPoint;varying float vPaintWet;
      uniform sampler2D uHabitat,uBrushGrain;
      uniform sampler2D uGroundColour,uGroundRelief;uniform float uGroundPatchReady,uValleyDetailReady;
      ${pilotMaskGLSL}
      ${pilotWoodlandGLSL}
    `).replace('#include <map_fragment>', `#include <map_fragment>
      float cavity=clamp(diffuseColor.a,.52,1.0);diffuseColor.a=opacity;
      vec4 habitat=texture2D(uHabitat,vec2(vPaintPoint.x+600.0,600.0-vPaintPoint.z)/1200.0);
      vec3 authoredGround=diffuseColor.rgb;
      float pilotGround=pilotSurfaceMask(vPaintPoint.xz);
      float pilotWetToe=smoothstep(.12,.90,vPaintWet);
      vec2 groundSlope=vec2(0.0);float groundCavity=1.0,groundRoughness=mix(.95,.72,pilotWetToe);
      // Reuse this existing sample for the packed valley detail; no extra fetch.
      float valleyRadius=max(abs(vPaintPoint.x),abs(vPaintPoint.z));
      float valleyRegion=1.0-smoothstep(170.0,185.0,valleyRadius);
      // Fade the added relief before continuously returning to the historical
      // grain frequency. Outside205 m both old coordinates and R bytes match.
      float valleyFrequency=(1.0-smoothstep(185.0,205.0,valleyRadius))*uValleyDetailReady;
      vec4 valleyBrush=texture2D(uBrushGrain,vPaintPoint.xz*mix(.37,.0625,valleyFrequency)+vec2(.31,.72));
      float grain=valleyBrush.r;
      float valleyDetail=valleyRegion*(1.0-pilotGround)*(1.0-vPaintWet*.90)*(1.0-habitat.g*.70)*uValleyDetailReady;
      float bedding=vPaintPoint.y*.24+vPaintPoint.x*.037+vPaintPoint.z*.018;
      float strata=mix(.93,1.05,smoothstep(.13,.83,fract(bedding)));
      // Habitat edges and bank patches are authored into the world albedo.
      // Leave open ground quiet rather than stamping high-contrast noise over it.
      diffuseColor.rgb*=.977+(grain-.5)*.025;
      diffuseColor.rgb*=mix(1.0,strata,habitat.g*.45);
      diffuseColor.rgb*=mix(1.0,.78,vPaintWet);
      // Habitat colours still locate meadow, litter, mineral and wet ground.
      // Only the small turf blades and soil aggregates vary within those masses.
      float turfStroke=smoothstep(.49,.70,valleyBrush.a),soilCrease=1.0-smoothstep(.37,.47,valleyBrush.a);
      vec3 strokeTint=mix(vec3(1.14,1.12,1.035),vec3(1.17,1.22,1.07),habitat.r);
      diffuseColor.rgb*=mix(vec3(1.0),mix(vec3(1.0-soilCrease*.18),strokeTint,turfStroke),valleyDetail);
      groundSlope=(valleyBrush.gb*2.0-1.0)*valleyDetail;
      if(pilotGround>0.0) {
        // Replace the weak broad pilot tint with metre-scale meadow/earth
        // boundaries and litter attached to actual canopies. One existing
        // seamless sample shapes their edges; there is no stacked noise field.
        float earth=clamp(1.0-habitat.r-habitat.g,0.0,1.0);
        float middle=texture2D(uBrushGrain,vPaintPoint.xz*.011+vec2(.17,.51)).r;
        // Broader, closer-toned transitions avoid the flat camouflage islands
        // identified in the gameplay review without adding another noise layer.
        float brokenEarth=smoothstep(.490,.650,middle)*(.18+earth*.42);
        vec3 meadow=vec3(.103,.138,.067),earthColour=vec3(.115,.105,.064);
        vec3 openGround=mix(meadow,earthColour,clamp(earth*.68+brokenEarth,0.0,1.0));
        openGround=mix(openGround,vec3(.133,.139,.113),habitat.g*.78);
        vec3 pilotColour=mix(authoredGround,openGround,.66);
        float floorDistance=pilotWoodlandDistance(vPaintPoint.xz);
        float litter=1.0-smoothstep(.33,.94,floorDistance+(middle-.53)*1.25);
        float rootContact=1.0-smoothstep(.010,.075,floorDistance);
        vec3 forestFloor=mix(vec3(.049,.047,.030),vec3(.074,.061,.037),smoothstep(.47,.58,middle));
        pilotColour=mix(pilotColour,forestFloor,litter*.82);
        pilotColour*=1.0-rootContact*.20;
        // The existing physical moisture field locates the bank. This soft,
        // broken silt shoulder meets a darker wet toe without a painted outline.
        pilotWetToe=smoothstep(.12,.78,vPaintWet+(middle-.53)*.36);
        float dampShoulder=smoothstep(.025,.38,vPaintWet)*(1.0-pilotWetToe);
        pilotColour=mix(pilotColour,vec3(.094,.091,.058),dampShoulder*.47);
        pilotColour=mix(pilotColour,vec3(.032,.047,.034),pilotWetToe*.78);
        pilotColour*=.998+(grain-.53)*.010;
        diffuseColor.rgb=mix(diffuseColor.rgb,pilotColour,pilotGround);
        if(uGroundPatchReady>0.5){
          // One authored, non-repeating material covers this limited reach.
          // The physical terrain and bank field remain the source of geometry.
          vec2 patchUV=(vPaintPoint.xz-vec2(-65.0,-140.0))/vec2(97.0,50.0);
          vec4 patchColour=texture2D(uGroundColour,patchUV);
          vec3 patchRelief=texture2D(uGroundRelief,patchUV).rgb;
          diffuseColor.rgb=mix(diffuseColor.rgb,patchColour.rgb,pilotGround);
          groundRoughness=patchColour.a;groundSlope+=(patchRelief.rg*2.0-1.0)*pilotGround;
          groundCavity=mix(1.0,patchRelief.b,pilotGround);
        }
      }
    `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor=mix(.94,.67,vPaintWet);
      roughnessFactor=mix(roughnessFactor,uGroundPatchReady>0.5?groundRoughness:mix(.95,.72,pilotWetToe),pilotGround);
    `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      // Add a small world-oriented optical slope to the real mesh normal.
      // No displaced silhouette, parallax or extra geometry is introduced.
      if(valleyDetail>0.0||(pilotGround>0.0&&uGroundPatchReady>0.5))normal=normalize(normal+mat3(viewMatrix)*vec3(-groundSlope.x,0.0,-groundSlope.y)*.68);
    `).replace('#include <aomap_fragment>', `#include <aomap_fragment>
      reflectedLight.indirectDiffuse*=mix(1.0,cavity,.65)*groundCavity;
    `);
  };
  material.customProgramCacheKey=()=> 'painterly-habitat-v9-colony-valley-ground';
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
        // Metre-space bank reach distinguishes a narrow outer bank from the
        // broader inside-bend silt shelf. Existing brush data breaks its edge;
        // this changes colour/roughness only, never the channel's actual extent.
        float bankMetres=max(0.0,(1.0-edgeDistance)*vRiverField.y);
        float shelfPatch=smoothstep(.47,.59,brush);
        float shallowReach=1.65+insideBend*2.80+(brush-.53)*2.2;
        float pilotShallows=1.0-smoothstep(.22,shallowReach,bankMetres);
        vec3 bedColour=mix(vec3(.039,.079,.069),vec3(.077,.103,.061),insideBend*.62+shelfPatch*.38);
        vec3 channelColour=mix(vec3(.012,.049,.058),bedColour,pilotShallows);
        float wetContact=(1.0-smoothstep(.04,.57,bankMetres))*(.43+shelfPatch*.57);
        channelColour=mix(channelColour,vec3(.021,.041,.029),wetContact*.62);
        diffuseColor.rgb=mix(diffuseColor.rgb,channelColour,pilotWater);
      `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(.43+shallows*.10+(vRiverWind.z-.5)*.018,.40,.56);
        roughnessFactor=mix(roughnessFactor,.56+pilotShallows*.09,pilotWater);
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
          // The existing bank brush breaks the coherent bands seen looking
          // toward the sun. Keep both ordinary ripple clocks unchanged.
          float currentPhase=alongRiver*.92+acrossRiver*.18+brush*3.4-uRiverTime*.72;
          float crossPhase=alongRiver*1.87-acrossRiver*.29+brush*4.1-uRiverTime*1.03;
          float shoreDamping=1.0-pilotShallows*.44;
          vec2 currentSlope=tangent*cos(currentPhase)*(.020+vRiverWind.z*.006)
            +across*cos(crossPhase)*.010;
          slope=mix(slope,currentSlope*shoreDamping,pilotWater);
        }
        normal=normalize(mat3(viewMatrix)*vec3(-slope.x,1.0,-slope.y));
      `).replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        // Both direct sunlight and the sky contributed to the white striped
        // channel at the reviewed sun-facing angle. Limit only this reach's
        // specular contribution; ordinary diffuse light and shadows remain.
        reflectedLight.directSpecular*=1.0-pilotWater*.60;
        reflectedLight.indirectSpecular*=1.0-pilotWater*.60;
      `);
  };
  material.customProgramCacheKey=()=> 'painterly-channel-v4-meshy-pilot';
}
