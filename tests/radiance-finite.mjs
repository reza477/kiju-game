// GPU regression: guard valid half-float channels exactly and contain invalid
// source texels before the four-level bloom pyramid spreads them.
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:32,height:32}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/finite-radiance-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Finite radiance regression</title>'}));
  await page.goto('http://127.0.0.1:4178/finite-radiance-fixture');
  const result=await page.evaluate(async()=>{
    const T=await import('/vendor/three.module.js'),{RadianceBloom,FINITE_RADIANCE_GLSL}=await import('/src/radiance-bloom.js');
    const renderer=new T.WebGLRenderer(),scene=new T.Scene(),camera=new T.Camera();
    const target=new T.WebGLRenderTarget(16,16,{type:T.HalfFloatType,depthBuffer:false});
    const values=[0,.125,-.125,1,2,65504,-65504,NaN,Infinity,-Infinity];
    const source=new Uint16Array(16*16*4);
    for(let i=0;i<source.length;i+=4){for(let k=0;k<3;k++){const v=values[(i/4+k)%values.length];source[i+k]=Number.isNaN(v)?0x7e00:v===Infinity?0x7c00:v===-Infinity?0xfc00:T.DataUtils.toHalfFloat(v);}source[i+3]=0x3c00;}
    const texture=new T.DataTexture(source,16,16,T.RGBAFormat,T.HalfFloatType);texture.needsUpdate=true;
    const material=new T.ShaderMaterial({uniforms:{source:{value:texture}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D source;varying vec2 vUv;${FINITE_RADIANCE_GLSL}void main(){gl_FragColor=vec4(finiteRadiance(texture2D(source,vUv).rgb),1.);}`,depthTest:false,depthWrite:false});
    scene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));renderer.setRenderTarget(target);renderer.render(scene,camera);
    const output=new Uint16Array(source.length);renderer.readRenderTargetPixels(target,0,0,16,16,output);
    let finiteChanges=0,invalidNotZero=0;
    for(let i=0;i<source.length;i++){if((source[i]&0x7c00)===0x7c00){if(output[i]!==0)invalidNotZero++;}else if(output[i]!==source[i])finiteChanges++;}
    // A black source containing NaN and both infinities must emit no bloom.
    source.fill(0);for(let i=3;i<source.length;i+=4)source[i]=0x3c00;
    source[544]=0x7e00;source[545]=0x7c00;source[546]=0xfc00;texture.needsUpdate=true;texture.minFilter=texture.magFilter=T.LinearFilter;
    const bloom=new RadianceBloom(T.HalfFloatType);bloom.resize(16,16);bloom.render(renderer,texture);
    const levels=bloom.targets.map(level=>{const pixels=new Uint16Array(level.width*level.height*4);renderer.readRenderTargetPixels(level,0,0,level.width,level.height,pixels);let nonFinite=0,unexpectedLight=0;for(let i=0;i<pixels.length;i++)if(i%4<3){if((pixels[i]&0x7c00)===0x7c00)nonFinite++;if(pixels[i]!==0)unexpectedLight++;}return{width:level.width,height:level.height,nonFinite,unexpectedLight};});
    bloom.dispose();target.dispose();texture.dispose();material.dispose();scene.children[0].geometry.dispose();renderer.dispose();
    return {finiteChanges,invalidNotZero,levels};
  });
  assert.equal(result.finiteChanges,0);assert.equal(result.invalidNotZero,0);
  assert.equal(result.levels.length,4);for(const level of result.levels){assert.equal(level.nonFinite,0);assert.equal(level.unexpectedLight,0);}
  assert.deepEqual(errors,[]);console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
