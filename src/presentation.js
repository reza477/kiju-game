import * as T from '../vendor/three.module.js';

// r185's five-sample PCF rotates its kernel per screen pixel. Without temporal
// accumulation that becomes a visible screen-door halo at the Streets camera.
// Use a fixed, weighted 3x3 hardware-PCF kernel for stable soft contact instead.
const pcfStart=T.ShaderChunk.shadowmap_pars_fragment.indexOf('float phi = interleavedGradientNoise');
const pcfEnd=T.ShaderChunk.shadowmap_pars_fragment.indexOf(') * 0.2;',pcfStart)+8;
if(pcfStart>=0&&pcfEnd>pcfStart){
  const taps=[];for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)taps.push(`texture(shadowMap,vec3(shadowCoord.xy+vec2(${x}.0,${y}.0)*radius,shadowCoord.z))*${(x===0?2:1)*(y===0?2:1)}.0`);
  T.ShaderChunk.shadowmap_pars_fragment=T.ShaderChunk.shadowmap_pars_fragment.slice(0,pcfStart)+`shadow=(${taps.join('+')})/16.0;`+T.ShaderChunk.shadowmap_pars_fragment.slice(pcfEnd);
}

// Local rendering only: depth-based contact shading, subtle highlight bloom, and colour grading.
export class Presentation {
  constructor(renderer,camera){
    this.renderer=renderer;this.camera=camera;
    this.target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:4});
    this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
    this.material=new T.ShaderMaterial({
      uniforms:{tColor:{value:this.target.texture},tDepth:{value:this.target.depthTexture},resolution:{value:new T.Vector2(1,1)},near:{value:camera.near},far:{value:camera.far},aoStrength:{value:.6},bloomStrength:{value:.14},exposure:{value:1.05}},
      vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`
        uniform sampler2D tColor,tDepth;
        uniform vec2 resolution;
        uniform float near,far,aoStrength,bloomStrength,exposure;
        varying vec2 vUv;
        float linearDepth(float d){return near*far/(far-(far-near)*d);}
        vec3 tone(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
        void main(){
          vec3 colour=texture2D(tColor,vUv).rgb;
          float raw=texture2D(tDepth,vUv).r;
          float depth=linearDepth(raw);
          float shade=0.;
          vec2 px=1./resolution;
          float radius=clamp(430./max(depth,1.),1.5,13.);
          for(int i=0;i<12;i++){
            float a=float(i)*2.399963;float r=(.35+float(i%3)*.325)*radius;
            vec2 uv=vUv+vec2(cos(a),sin(a))*px*r;
            float other=linearDepth(texture2D(tDepth,uv).r);
            float gap=depth-other;
            shade+=smoothstep(.06,.3,gap)*(1.-smoothstep(.45,2.4,gap));
          }
          float ao=raw<.99999?1.-aoStrength*shade/12.:1.;
          colour*=ao;
          vec3 bloom=vec3(0.);
          for(int i=0;i<8;i++){
            float a=float(i)*.785398;vec2 offset=vec2(cos(a),sin(a))*px*5.;
            bloom+=max(texture2D(tColor,vUv+offset).rgb-vec3(1.2),vec3(0.));
          }
          colour+=bloom*(bloomStrength/8.);
          colour=tone(colour*exposure);
          float vignette=1.-.16*pow(length((vUv-.5)*vec2(1.,.85)),1.8);
          colour*=vignette;
          colour=mix(vec3(dot(colour,vec3(.2126,.7152,.0722))),colour,1.07);
          gl_FragColor=vec4(colour,1.);
          #include <colorspace_fragment>
        }`,depthWrite:false,depthTest:false});
    this.scene=new T.Scene();this.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.material));this.camera2d=new T.Camera();this.enabled=true;
  }
  resize(w,h){this.target.setSize(w,h);this.material.uniforms.resolution.value.set(w,h);}
  setQuality(quality){this.enabled=quality!=='performance';this.material.uniforms.aoStrength.value=quality==='high'?.64:.36;const samples=quality==='high'?4:2;if(this.target.samples!==samples){this.target.samples=samples;this.target.dispose();}}
  render(scene){const r=this.renderer;r.info.reset();if(!this.enabled){r.setRenderTarget(null);r.render(scene,this.camera);return;}r.setRenderTarget(this.target);r.render(scene,this.camera);r.setRenderTarget(null);r.render(this.scene,this.camera2d);}
}

export function createSky(){
  const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    uniforms:{top:{value:new T.Color(0x649bc2)},bottom:{value:new T.Color(0xdbe7de)}},
    vertexShader:`varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 top,bottom;varying vec3 vPosition;void main(){float h=normalize(vPosition).y;gl_FragColor=vec4(mix(bottom,top,pow(max(h,0.),.45)),1.);}`});
  const sky=new T.Mesh(new T.SphereGeometry(900,32,16),material);sky.frustumCulled=false;sky.renderOrder=-10;return sky;
}

function softParticleTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,0.55)');gradient.addColorStop(.45,'rgba(255,255,255,0.28)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return new T.CanvasTexture(canvas);
}

export class Atmosphere {
  constructor(scene){this.scene=scene;this.puffs=[];this.texture=softParticleTexture();this.clock=0;this.nextSmoke=0;
    this.smokeMaterial=new T.SpriteMaterial({map:this.texture,color:0x777d81,transparent:true,opacity:.2,depthWrite:false});
    this.cloudMaterial=new T.SpriteMaterial({map:this.texture,color:0xffffff,transparent:true,opacity:.2,depthWrite:false});
    this.clouds=[];
    for(let i=0;i<20;i++){const cloud=new T.Sprite(this.cloudMaterial);cloud.position.set(Math.sin(i*5.3)*300,95+i%4*8,Math.cos(i*3.1)*300);cloud.scale.set(70+i%4*25,18+i%3*8,1);scene.add(cloud);this.clouds.push(cloud);}
  }
  emit(position,kind='smoke'){
    if(this.puffs.length>=70)return;
    const material=(kind==='smoke'?this.smokeMaterial:this.cloudMaterial).clone();
    const sprite=new T.Sprite(material);sprite.position.copy(position);sprite.scale.setScalar(kind==='smoke'?.8:1.5);this.scene.add(sprite);this.puffs.push({sprite,age:0,kind});
  }
  update(time,dt,stacks,movingPosition){
    this.clock+=dt;
    if(this.clock>this.nextSmoke){this.nextSmoke=this.clock+.3;for(const stack of stacks.slice(0,14))this.emit(stack);if(movingPosition)this.emit(movingPosition,'dust');}
    for(let i=this.puffs.length-1;i>=0;i--){const p=this.puffs[i],life=p.kind==='smoke'?3:4;p.age+=dt;p.sprite.position.y+=dt*(p.kind==='smoke'?1.6:.35);p.sprite.position.x+=dt*.45;p.sprite.scale.setScalar((p.kind==='smoke'?.5:1.5)+p.age*(p.kind==='smoke'?.75:1.3));p.sprite.material.opacity=Math.max(0,(p.kind==='smoke'?.16:.12)*(1-p.age/life));if(p.age>=life){p.sprite.removeFromParent();p.sprite.material.dispose();this.puffs.splice(i,1);}}
    for(let i=0;i<this.clouds.length;i++){const cloud=this.clouds[i];cloud.position.x+=dt*.7;if(cloud.position.x>380)cloud.position.x=-380;}
  }
}
