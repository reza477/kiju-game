import * as T from '../vendor/three.module.js';
import {getLightingPreset} from './lighting.js';
import {terrainHeight,riverX} from './terrain.js';
import {windAt,WIND_GLSL} from './weather.js';
import {RadianceBloom} from './radiance-bloom.js';

// Keep the stable contact filter: randomized PCF without temporal accumulation
// produced visible screen-door halos in the close street camera.
const pcfStart=T.ShaderChunk.shadowmap_pars_fragment.indexOf('float phi = interleavedGradientNoise');
const pcfEnd=T.ShaderChunk.shadowmap_pars_fragment.indexOf(') * 0.2;',pcfStart)+8;
if(pcfStart>=0&&pcfEnd>pcfStart){
  const taps=[];for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)taps.push(`texture(shadowMap,vec3(shadowCoord.xy+vec2(${x}.0,${y}.0)*radius,shadowCoord.z))*${(x===0?2:1)*(y===0?2:1)}.0`);
  T.ShaderChunk.shadowmap_pars_fragment=T.ShaderChunk.shadowmap_pars_fragment.slice(0,pcfStart)+`shadow=(${taps.join('+')})/16.0;`+T.ShaderChunk.shadowmap_pars_fragment.slice(pcfEnd);
}
const settingsFor=value=>typeof value==='string'||!value?getLightingPreset(value):value;

export class Presentation {
  constructor(renderer,camera){
    this.renderer=renderer;this.camera=camera;
    this.hdrSupported=renderer.extensions.has('EXT_color_buffer_float');
    this.target=new T.WebGLRenderTarget(1,1,{type:this.hdrSupported?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,samples:Math.min(4,renderer.capabilities.maxSamples)});
    this.target.texture.colorSpace=T.LinearSRGBColorSpace;
    this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
    this.bloom=new RadianceBloom(this.hdrSupported?T.HalfFloatType:T.UnsignedByteType);
    this.material=new T.ShaderMaterial({
      name:'Linear HDR atmosphere composite',
      uniforms:{tColor:{value:this.target.texture},tDepth:{value:this.target.depthTexture},tBloom0:{value:this.bloom.targets[0].texture},tBloom1:{value:this.bloom.targets[1].texture},tBloom2:{value:this.bloom.targets[2].texture},tBloom3:{value:this.bloom.targets[3].texture},resolution:{value:new T.Vector2(1,1)},inverseProjection:{value:camera.projectionMatrixInverse.clone()},projectionScale:{value:1},near:{value:camera.near},far:{value:camera.far},aoStrength:{value:.8},bloomStrength:{value:.18},exposure:{value:1},bloomSamples:{value:12}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`
        uniform sampler2D tColor,tDepth,tBloom0,tBloom1,tBloom2,tBloom3;
        uniform vec2 resolution;
        uniform mat4 inverseProjection;
        uniform float projectionScale;
        uniform float near,far,aoStrength,bloomStrength,bloomSamples;
        varying vec2 vUv;
        float linearDepth(float d){return near*far/(far-(far-near)*d);}
        vec3 viewPosition(vec2 uv){float d=texture2D(tDepth,uv).r;vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
        vec3 bright(vec3 colour){float luma=dot(colour,vec3(.2126,.7152,.0722));float knee=clamp((luma-.95)/.8,0.,1.);return colour*(max(luma-1.35,0.)+knee*knee*.12)/max(luma,.001);}
        void main(){
          vec3 colour=texture2D(tColor,vUv).rgb;
          float raw=texture2D(tDepth,vUv).r,depth=linearDepth(raw),shade=0.;
          vec2 px=1./resolution;
          float worldRadius=clamp(1.1+depth*.006,1.1,2.8);
          float radius=clamp(projectionScale*worldRadius/max(depth,1.),2.,32.);
          if(raw<.99999){
            vec3 center=viewPosition(vUv);
            vec3 left=center-viewPosition(vUv-vec2(px.x,0.)),right=viewPosition(vUv+vec2(px.x,0.))-center;
            vec3 down=center-viewPosition(vUv-vec2(0.,px.y)),up=viewPosition(vUv+vec2(0.,px.y))-center;
            vec3 normal=normalize(cross(abs(left.z)<abs(right.z)?left:right,abs(down.z)<abs(up.z)?down:up));
            if(dot(normal,-center)<0.)normal=-normal;
            for(int i=0;i<12;i++){
              float a=float(i)*2.399963,r=(.24+float(i%4)*.25)*radius;
              vec2 sampleUv=clamp(vUv+vec2(cos(a),sin(a))*px*r,px,1.-px);
              vec3 delta=viewPosition(sampleUv)-center;float distance=length(delta);
              float hemisphere=max(dot(normal,delta)/max(distance,.001)-.09,0.);
              shade+=hemisphere*(1.-smoothstep(worldRadius*.25,worldRadius*1.65,distance));
            }
            // View-space hemisphere obscurance respects surface orientation,
            // preserving flat terrain while grounding feet, buttresses and eaves.
            colour*=1.-aoStrength*(1.-smoothstep(180.,370.,depth))*shade/6.;
          }
          // Four spatial scales keep emissive cores crisp and give distant
          // lamps, hot metal and the sun a soft photographic shoulder.
          vec3 bloom=texture2D(tBloom0,vUv).rgb*.34+texture2D(tBloom1,vUv).rgb*.29+texture2D(tBloom2,vUv).rgb*.23+texture2D(tBloom3,vUv).rgb*.14;
          colour+=bloom*bloomStrength;
          float vignette=1.-.055*pow(length((vUv-.5)*vec2(1.,.85)),1.8);
          gl_FragColor=vec4(max(colour*vignette,vec3(0.)),1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,depthWrite:false,depthTest:false,toneMapped:true});
    this.scene=new T.Scene();this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.scene.add(this.quad);this.camera2d=new T.Camera();this.enabled=this.hdrSupported;
    this.setLighting('day');
  }
  resize(w,h){this.target.setSize(Math.max(1,w),Math.max(1,h));this.bloom.resize(Math.max(1,w),Math.max(1,h));this.material.uniforms.resolution.value.set(Math.max(1,w),Math.max(1,h));}
  setQuality(quality){
    this.enabled=quality!=='performance'&&this.hdrSupported;
    this.material.uniforms.aoStrength.value=quality==='high'?.8:.48;
    this.material.uniforms.bloomSamples.value=quality==='high'?12:6;
    const samples=Math.min(quality==='high'?4:2,this.renderer.capabilities.maxSamples);
    if(this.target.samples!==samples){this.target.samples=samples;this.target.dispose();}
  }
  setLighting(mode){const p=settingsFor(mode);this.material.uniforms.exposure.value=p.exposure;this.material.uniforms.bloomStrength.value=p.bloom;}
  render(scene){
    const r=this.renderer;r.info.reset();
    r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=this.material.uniforms.exposure.value;
    this.material.uniforms.near.value=this.camera.near;this.material.uniforms.far.value=this.camera.far;
    this.material.uniforms.inverseProjection.value.copy(this.camera.projectionMatrixInverse);this.material.uniforms.projectionScale.value=this.camera.projectionMatrix.elements[5]*this.target.height*.5;
    // Three r185 disables material tone mapping when rendering to a normal
    // render target (WebGLPrograms/getParameters). The final screen pass uses
    // the same built-in ACES transform as the direct performance path, once.
    if(!this.enabled){r.setRenderTarget(null);r.render(scene,this.camera);return;}
    r.setRenderTarget(this.target);r.render(scene,this.camera);this.bloom.render(r,this.target.texture);r.setRenderTarget(null);r.render(this.scene,this.camera2d);
  }
  dispose(){this.target.dispose();this.bloom.dispose();this.material.dispose();this.quad.geometry.dispose();}
}

const NOISE_GLSL=`
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);}
float cloudNoise(vec2 p){return noise21(p)*.57+noise21(p*2.03+17.3)*.28+noise21(p*4.11-8.4)*.15;}
`;

export function createSky(){
  const material=new T.ShaderMaterial({name:'Sun-oriented atmospheric sky',side:T.BackSide,depthWrite:false,
    uniforms:{top:{value:new T.Color()},bottom:{value:new T.Color()},sunDirection:{value:new T.Vector3()},sunColor:{value:new T.Color()},sunDisc:{value:7},scattering:{value:.24},cloudColor:{value:new T.Color()},cloudShade:{value:new T.Color()},cloudOpacity:{value:.32},time:{value:0},wind:{value:new T.Vector2(.5,.3)}},
    vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      uniform vec3 top,bottom,sunDirection,sunColor,cloudColor,cloudShade;
      uniform vec2 wind;uniform float sunDisc,scattering,cloudOpacity,time;
      varying vec3 vDirection;
      ${NOISE_GLSL}
      void main(){
        vec3 direction=normalize(vDirection);float h=max(direction.y,0.),mu=dot(direction,sunDirection);
        float horizon=exp(-h*5.5),rayleigh=.75*(1.+mu*mu);
        vec3 sky=mix(top*(.85+rayleigh*.12),bottom,pow(horizon,.63));
        // Forward Mie lobe is warmer near the actual directional light; the
        // opposing sky retains cool Rayleigh fill instead of a uniform band.
        float mie=.395/pow(max(.04,1.64-1.6*mu),1.5);
        sky+=sunColor*scattering*mie*(.25+.75*horizon);
        sky+=sunColor*sunDisc*smoothstep(.99990,.999965,mu);
        float upper=smoothstep(.035,.16,direction.y);
        vec2 plane=direction.xz/max(.11,direction.y+.11)*2.4-wind*time*.00085;
        float mass=cloudNoise(plane)+cloudNoise(plane*.43+6.1)*.15;
        float coverage=smoothstep(.48,.74,mass)*upper*cloudOpacity;
        vec2 lightStep=sunDirection.xz/max(.22,sunDirection.y)*.10;
        float ahead=cloudNoise(plane+lightStep)+cloudNoise((plane+lightStep)*.43+6.1)*.15;
        float thickness=max(0.,mass-ahead)*3.7+max(0.,mass-.59)*.9;
        float edge=clamp((ahead-mass)*6.+.5,0.,1.);
        vec3 cloud=mix(cloudShade*.76,cloudColor,exp(-thickness*2.)*(.3+edge*.65));
        cloud+=sunColor*pow(max(mu,0.),12.)*edge*(1.-coverage)*.22;
        sky=mix(sky,cloud,coverage);
        float cirrus=pow(cloudNoise(plane*vec2(.7,4.5)+wind*time*.0002),5.)*upper*.13;
        sky=mix(sky,cloudColor,cirrus*(1.-coverage));
        vec2 starCell=floor(direction.xz/max(.13,direction.y)*420.);
        float star=smoothstep(.997,.9995,hash21(starCell))*pow(max(0.,1.-length(fract(direction.xz/max(.13,direction.y)*420.)-.5)*2.),8.);
        sky+=vec3(.60,.74,1.)*star*(1.-smoothstep(1.5,3.,sunDisc))*upper*(1.-coverage);
        gl_FragColor=vec4(max(sky,vec3(0.)),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const sky=new T.Mesh(new T.SphereGeometry(900,32,16),material);sky.frustumCulled=false;sky.renderOrder=-10;sky.userData.atmosphericSky=true;setSkyLighting(sky,'day');return sky;
}

export function setSkyLighting(sky,mode){
  const p=settingsFor(mode),u=sky.material.uniforms;
  u.top.value.set(p.top);u.bottom.value.set(p.bottom);u.sunDirection.value.fromArray(p.sunPosition).normalize();u.sunColor.value.set(p.sun);
  u.sunDisc.value=p.sunDisc;u.scattering.value=p.scattering;u.cloudColor.value.set(p.cloud);u.cloudShade.value.set(p.cloudShade);u.cloudOpacity.value=p.cloudOpacity;
}

function softParticleTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(255,255,255,0.65)');gradient.addColorStop(.42,'rgba(255,255,255,0.3)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.NoColorSpace;return texture;
}

function createLowMist(texture){
  const geometry=new T.PlaneGeometry(1,1),seeds=new Float32Array(24),densities=new Float32Array(24),floors=new Float32Array(24);
  const material=new T.ShaderMaterial({name:'Localized wind-driven valley mist',transparent:true,depthWrite:false,fog:true,
    uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),map:{value:texture},time:{value:0},tint:{value:new T.Color()},opacity:{value:.23},sunDirection:{value:new T.Vector3()},sunColor:{value:new T.Color()},sunStrength:{value:0}},
    vertexShader:`
      attribute float mistSeed,mistDensity,mistFloor;uniform float time;varying vec2 vUv;varying float vSeed,vDensity,vFloor;varying vec3 vWorldPosition;
      #include <fog_pars_vertex>
      ${WIND_GLSL}
      void main(){
        vUv=uv;vSeed=mistSeed;vDensity=mistDensity;vFloor=mistFloor;
        vec4 centre=instanceMatrix*vec4(0.,0.,0.,1.);
        vec3 breeze=worldWind(time,centre.xz);
        centre.xz+=breeze.xy*sin(time*.075+mistSeed)*6.;
        vec2 billboard=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
        vec3 cameraRight=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
        vec3 cameraUp=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
        vWorldPosition=(modelMatrix*centre).xyz+cameraRight*billboard.x+cameraUp*billboard.y;
        vec4 mvPosition=modelViewMatrix*centre;
        mvPosition.xy+=billboard;
        gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader:`
      uniform sampler2D map;uniform float time,opacity,sunStrength;uniform vec3 tint,sunDirection,sunColor;varying vec2 vUv;varying float vSeed,vDensity,vFloor;varying vec3 vWorldPosition;
      #include <fog_pars_fragment>
      ${NOISE_GLSL}
      void main(){
        float edge=texture2D(map,vUv).a;
        // World-space billows break up repeated camera-facing ribbon shapes.
        // Fixed advection rates stay bounded in speed over a long expedition.
        vec2 airCoordinate=vec2(vWorldPosition.x*.105+vWorldPosition.y*.19,vWorldPosition.z*.10-vWorldPosition.y*.11);
        float billow=cloudNoise(airCoordinate-vec2(time*.026,time*.018)+vSeed*.7);
        vec3 viewRay=normalize(vWorldPosition-cameraPosition);
        float forward=pow(max(dot(viewRay,sunDirection),0.),8.);
        float distanceFade=smoothstep(3.,13.,length(vWorldPosition-cameraPosition));
        float density=smoothstep(.20,.70,billow)*vDensity*(.86+.14*sin(time*.04+vSeed));
        // Fade in world height before the billboard meets its receiving
        // surface; depth clipping alone made hard horizontal stripes on water.
        float surfaceFade=smoothstep(vFloor,vFloor+1.45,vWorldPosition.y);
        float alpha=min(.17,edge*density*opacity*(1.+forward*.6))*distanceFade*surfaceFade;
        // Cool air remains subdued away from the sun. Looking through a low
        // pocket toward the real key light reveals warmer forward scattering.
        vec3 radiance=tint*(.72+billow*.28)+sunColor*sunStrength*forward*.65;
        gl_FragColor=vec4(radiance,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`});
  const mist=new T.InstancedMesh(geometry,material,24),matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion();
  // Six principal pockets survive Performance mode. Smaller companions give
  // existing valleys depth without laying equal-width strips over the river.
  const river=z=>({x:riverX(z),z,river:true});
  const anchors=[{x:-135,z:-75},{x:-73,z:83},{x:123,z:19},{x:113,z:91}];
  const pockets=[river(29),anchors[0],river(94),anchors[1],anchors[2],anchors[3],river(-88),river(-8),river(170),river(-135),river(-69),river(52)];
  for(let j=0;j<anchors.length;j++)for(let k=0;k<3;k++){
    const a=anchors[j],angle=1.1+j*.81+k*2.25,radius=j===1?7:9+k*1.7;
    pockets.push({x:a.x+Math.sin(angle)*radius,z:a.z+Math.cos(angle)*radius,companion:true});
  }
  for(let i=0;i<24;i++){
    const p=pockets[i],x=p.x+(p.river?Math.sin(i*2.1)*3:0),z=p.z;
    const floor=Math.max(terrainHeight(x,z),p.river?-.50:-Infinity)+.08,height=4.3+(i*7%5)*.72;
    const width=p.river?12+(i*7%4)*2.7:p.companion?12+(i*3%5)*1.5:22;
    position.set(x,floor+height*.39,z);scale.set(width,height,1);matrix.compose(position,rotation,scale);mist.setMatrixAt(i,matrix);
    seeds[i]=i*1.731;densities[i]=p.river?.46:p.companion?.70:1.1;floors[i]=floor;
  }
  geometry.setAttribute('mistSeed',new T.InstancedBufferAttribute(seeds,1));geometry.setAttribute('mistDensity',new T.InstancedBufferAttribute(densities,1));geometry.setAttribute('mistFloor',new T.InstancedBufferAttribute(floors,1));mist.name='Low mist over river and western gully';mist.frustumCulled=false;mist.userData.noBatch=true;return mist;
}

export class Atmosphere {
  constructor(scene){
    this.scene=scene;this.texture=softParticleTexture();this.clock=0;this.nextSmoke=.35;this.stackCursor=0;this.emitCursor=0;this.maxPuffs=48;this.wind={x:.5,z:.3,gust:.5};
    this.sky=scene.children.find(o=>o.userData.atmosphericSky);this.smokeColor=new T.Color(0x727c81);this.dustColor=new T.Color(0xa69d7f);
    this.mist=createLowMist(this.texture);scene.add(this.mist);this.puffs=[];
    // Fixed pool: emitting and retiring smoke allocates no Sprite, material,
    // Vector or texture and never grows with the duration of an expedition.
    for(let i=0;i<48;i++){
      const material=new T.SpriteMaterial({map:this.texture,color:this.smokeColor,transparent:true,opacity:0,depthWrite:false});
      const sprite=new T.Sprite(material);sprite.visible=false;scene.add(sprite);this.puffs.push({sprite,origin:new T.Vector3(),age:0,kind:'smoke',active:false,vx:0,vz:0});
    }
    this.setLighting('day');
  }
  setQuality(quality){
    this.maxPuffs=quality==='high'?48:quality==='balanced'?28:12;this.mist.count=quality==='high'?24:quality==='balanced'?16:6;
    for(let i=this.maxPuffs;i<this.puffs.length;i++){this.puffs[i].active=false;this.puffs[i].sprite.visible=false;}
  }
  setLighting(mode){
    const p=settingsFor(mode),u=this.mist.material.uniforms;u.tint.value.set(p.mist);u.opacity.value=p.mistOpacity;u.sunDirection.value.fromArray(p.sunPosition).normalize();u.sunColor.value.set(p.sun);u.sunStrength.value=p.intensity*.22;
    this.smokeColor.set(p.cloudShade);this.dustColor.set(p.groundLight);
    for(const puff of this.puffs)puff.sprite.material.color.copy(puff.kind==='smoke'?this.smokeColor:this.dustColor);
  }
  emit(position,kind='smoke'){
    for(let n=0;n<this.maxPuffs;n++){
      const i=(this.emitCursor+n)%this.maxPuffs,p=this.puffs[i];if(p.active)continue;
      p.active=true;p.age=0;p.kind=kind;p.origin.copy(position);p.vx=this.wind.x*(kind==='smoke'?1.4:.8);p.vz=this.wind.z*(kind==='smoke'?1.4:.8);
      p.sprite.visible=true;p.sprite.position.copy(position);p.sprite.scale.setScalar(kind==='smoke'?.6:1.2);p.sprite.material.opacity=0;p.sprite.material.color.copy(kind==='smoke'?this.smokeColor:this.dustColor);this.emitCursor=(i+1)%this.maxPuffs;return true;
    }
    return false;
  }
  update(time,dt,stacks,movingPosition){
    if(!(dt>0))return;
    if(time<this.clock){this.nextSmoke=time+.35;for(const p of this.puffs){p.active=false;p.sprite.visible=false;}}
    this.clock=time;windAt(time,0,0,this.wind);
    this.mist.material.uniforms.time.value=time;
    if(this.sky){this.sky.material.uniforms.time.value=time;this.sky.material.uniforms.wind.value.set(this.wind.x,this.wind.z);}
    if(Math.abs(this.clock-this.nextSmoke)>1.5)this.nextSmoke=this.clock;
    let catchup=0;
    while(this.clock>=this.nextSmoke&&catchup++<2){
      this.nextSmoke+=.42;const count=Math.min(stacks.length,this.maxPuffs>28?5:this.maxPuffs>12?3:1);
      for(let n=0;n<count;n++){this.emit(stacks[this.stackCursor%stacks.length]);this.stackCursor++;}
      if(movingPosition)this.emit(movingPosition,'dust');
    }
    for(let i=0;i<this.maxPuffs;i++){
      const p=this.puffs[i];if(!p.active)continue;const smoke=p.kind==='smoke',life=smoke?2.65:3.0;p.age+=dt;
      if(p.age>=life){p.active=false;p.sprite.visible=false;continue;}
      p.sprite.position.set(p.origin.x+p.vx*p.age,p.origin.y+p.age*(smoke?1.35:.22),p.origin.z+p.vz*p.age);
      p.sprite.scale.setScalar((smoke?.6:1.2)+p.age*(smoke?.55:1.1));
      p.sprite.material.opacity=(smoke?.115:.105)*Math.min(1,p.age/.25)*(1-p.age/life);
    }
  }
  dispose(){for(const p of this.puffs){p.sprite.removeFromParent();p.sprite.material.dispose();}this.mist.removeFromParent();this.mist.dispose();this.mist.geometry.dispose();this.mist.material.dispose();this.texture.dispose();}
}
