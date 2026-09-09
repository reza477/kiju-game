import * as T from '../vendor/three.module.js';

// A small scene-linear radiance pyramid spreads only highlights. Its largest
// buffers are half-resolution; changing quality never changes scene exposure.
export class RadianceBloom {
  constructor(type) {
    this.targets=Array.from({length:4},()=>new T.WebGLRenderTarget(1,1,{type,depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter}));
    for(const target of this.targets)target.texture.colorSpace=T.LinearSRGBColorSpace;
    this.material=new T.ShaderMaterial({name:'Scene-linear highlight pyramid',depthTest:false,depthWrite:false,toneMapped:false,
      uniforms:{source:{value:null},texel:{value:new T.Vector2()},extract:{value:1}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`uniform sampler2D source;uniform vec2 texel;uniform float extract;varying vec2 vUv;
        vec3 sampleLight(vec2 uv){vec3 c=texture2D(source,clamp(uv,texel*.5,1.-texel*.5)).rgb;
          float l=dot(c,vec3(.2126,.7152,.0722)),soft=clamp(l-.72,0.,1.2);soft=soft*soft/4.8;
          return mix(c,c*max(l-1.32,soft)/max(l,.0001),extract);}
        void main(){vec3 c=sampleLight(vUv)*4.;
          c+=(sampleLight(vUv+texel*vec2(1.,0.))+sampleLight(vUv-texel*vec2(1.,0.))+sampleLight(vUv+texel*vec2(0.,1.))+sampleLight(vUv-texel*vec2(0.,1.)))*2.;
          c+=sampleLight(vUv+texel)+sampleLight(vUv-texel)+sampleLight(vUv+texel*vec2(1.,-1.))+sampleLight(vUv+texel*vec2(-1.,1.));
          gl_FragColor=vec4(c/16.,1.);}`});
    this.scene=new T.Scene();this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.scene.add(this.quad);this.camera=new T.Camera();
  }
  resize(width,height){this.width=width;this.height=height;this.targets.forEach((target,i)=>target.setSize(Math.max(1,Math.ceil(width/2**(i+1))),Math.max(1,Math.ceil(height/2**(i+1)))));}
  render(renderer,source){let w=this.width,h=this.height;for(let i=0;i<this.targets.length;i++){
    this.material.uniforms.source.value=source;this.material.uniforms.texel.value.set(1/w,1/h);this.material.uniforms.extract.value=i===0?1:0;
    renderer.setRenderTarget(this.targets[i]);renderer.render(this.scene,this.camera);source=this.targets[i].texture;w=this.targets[i].width;h=this.targets[i].height;
  }}
  dispose(){this.targets.forEach(target=>target.dispose());this.material.dispose();this.quad.geometry.dispose();}
}
