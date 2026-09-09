// Exact procedural skin art retained outside runtime. Regenerate locally with:
// node scripts/bake-character-skins.mjs
// --verify-runtime also compares the pre-bake product material canvases when
// that generator is still present. Only local sources are used.
import{createRequire}from'node:module';import fs from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';import os from'node:os';import assert from'node:assert/strict';
const workspace=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function proceduralSkin(region){
 const formBell=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
  const width=512,height=1024,canvas=document.createElement('canvas'),surface=document.createElement('canvas'),relief=document.createElement('canvas');canvas.width=surface.width=relief.width=width;canvas.height=surface.height=relief.height=height;
  const c=canvas.getContext('2d'),s=surface.getContext('2d'),b=relief.getContext('2d'),colour=c.createImageData(width,height),rough=s.createImageData(width,height),pores=b.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const t=y/(height-1),a=x/width*Math.PI*2,front=Math.max(0,Math.cos(a)),back=Math.max(0,-Math.cos(a)),side=Math.abs(Math.sin(a));
    const wave=Math.sin(a*3+Math.sin(t*8))*Math.sin(t*15+a)+.36*Math.sin(a*7-t*17);
    let form=0,flush=0;
    if(region==='torso'){
      form-=front*16*formBell(t,.545+.012*side,.018)*( .4+.6*side);
      form-=front*9*formBell(side,0,.12)*formBell(t,.48,.24);
      for(const h of [.343,.393,.446])form-=front*8*formBell(t,h,.010)*formBell(side,.20,.25);
      form-=front*13*formBell(t,.25+.06*side,.021)*side;
      form+=front*9*formBell(t,.615,.075)*formBell(side,.43,.28);
      form-=side*11*formBell(t,.52,.11);flush=front*8*formBell(t,.68,.13);
    }else if(region==='head'||region==='jaw'){
      form-=front*12*formBell(t,.39,.10)*formBell(side,.57,.17);
      form+=front*10*formBell(t,.63,.11);flush=front*10*formBell(t,.27,.12);
    }else if(region==='arm'||region==='leg'||region==='hand'){
      const joint=region==='arm'?.52:region==='leg'?.48:.65;
      flush=20*formBell(t,joint,.085)+6*formBell(t,.16,.12);
      form-=front*14*formBell(t,joint+.015,.020);
      form+=front*12*formBell(side,.26,.19)*formBell(t,.70,.23);
      form-=side*10*formBell(t,.29,.15);
    }else{
      const lower=region==='forearm'||region==='shin',joint=lower?.10:.87;
      flush=16*formBell(t,joint,.095)+7*formBell(t,.30,.12);
      form-=front*10*formBell(t,joint+.045,.021);
      if(region==='upperarm')form-=side*12*formBell(t,.29,.07);
      if(region==='thigh')form-=front*11*formBell(side,.50,.13)*formBell(t,.50,.3);
      if(lower)form+=front*9*formBell(side,.16,.09)*formBell(t,.67,.24);
    }
    const exposed=region==='torso'?.62+.38*formBell(t,.53,.34):region==='head'||region==='jaw'?.78:.60+.40*formBell(t,.48,.36);
    const ventral=((Math.cos(a)+1)*.5)**1.7*exposed,freckle=Math.sin(a*31+Math.sin(t*76)*1.8)*Math.sin(t*119+Math.sin(a*27)),variation=wave*5+form*.70+freckle*2.1,i=(y*width+x)*4;
    // Dark weathered outer hide and warmer protected skin establish a creature
    // identity at ordinary play distance, with gradual anatomical boundaries.
    const hide=(1-front)*(.60+.40*formBell(t,.58,.33)),mottle=Math.sin(a*5+Math.sin(t*19))*Math.sin(t*27+a*3),weather=hide*(13+9*mottle);
    colour.data.set([72+ventral*72+variation+flush*.55-weather,91+ventral*32+variation-flush*.11-weather*.45,83+ventral*22+variation-flush*.25-weather*.65,255],i);
    const r=241-ventral*56-wave*6-Math.max(0,form)*.48-8*formBell(t,.5,.12);rough.data.set([r,r,r,255],i);
    // Fine creases follow longitudinal skin tension, while broad anatomical
    // shadowing comes from geometry. This avoids repeating pebble-sized bumps.
    const grain=Math.sin(a*151+Math.sin(t*195)*1.3)*Math.sin(t*337+a*19),crease=Math.pow(Math.max(0,Math.sin(a*19+t*75+Math.sin(t*11)*2)),18);
    const joint=region==='arm'?.52:region==='leg'?.48:region==='torso'?.23:.3;
    const fold=formBell(t,joint,.075)*Math.pow(Math.max(0,Math.sin(t*267+Math.sin(a*7)*1.4)),12);
    const vein=Math.exp(-Math.pow((Math.sin(a*5-t*9)+.23*Math.sin(t*43))/.065,2))*formBell(t,.64,.26)*front;
    const reliefValue=132+grain*4.8+freckle*2-crease*10-fold*17+vein*5;pores.data.set([reliefValue,reliefValue,reliefValue,255],i);
  }
  c.putImageData(colour,0,0);s.putImageData(rough,0,0);b.putImageData(pores,0,0);

 return {color:canvas,roughness:surface,bump:relief};
}

const regions=['torso','head','jaw','upperarm','forearm','arm','thigh','shin','leg'];
const activeRegions=new Set(['torso','head','jaw','arm','leg']);
const verifyRuntime=process.argv.includes('--verify-runtime');
const require=createRequire(import.meta.url),{chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=path.join(workspace,'assets/characters'),reportDir=path.join(workspace,'artifacts/beauty-09-builder-01/skin-bake');
await fs.mkdir(output,{recursive:true});await fs.mkdir(reportDir,{recursive:true});
const source=await fs.readFile(path.join(workspace,'src/kaiju.js'),'utf8'),report={regions,activeRegions:[...activeRegions],files:[],errors:[],remote:[],runtimeCompared:verifyRuntime};
if(verifyRuntime)assert.ok(source.includes('const width=512,height=1024'),'The runtime generator has already been replaced; use the preserved procedural generator without --verify-runtime.');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/skin-bake-fixture')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'});if(verifyRuntime&&u.pathname==='/src/kaiju.js')return r.fulfill({contentType:'text/javascript',body:source+'\nexport function skinBakeMaterials(){return anatomicalMaterials;}'});if(u.origin==='http://127.0.0.1:4178'||['data:','blob:'].includes(u.protocol))return r.continue();report.remote.push(u.href);return r.abort();});
 await page.goto('http://127.0.0.1:4178/skin-bake-fixture');
 await page.addScriptTag({content:`window.proceduralSkin=${proceduralSkin.toString()};`});
 if(verifyRuntime)await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),k=await import('/src/kaiju.js'),rig=new T.Group(),frame=new T.Group();rig.add(frame);k.createHumanoidKaiju(frame,rig,[],'flesh');window.runtimeSkins=k.skinBakeMaterials();});
 for(const region of regions){
  const entries=await page.evaluate(async({region,verifyRuntime})=>{
   const canvases=window.proceduralSkin(region),entries=[],hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(n=>n.toString(16).padStart(2,'0')).join('');
   for(const[role,canvas]of Object.entries(canvases)){
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,pixelHash=await hash(pixels),data=canvas.toDataURL('image/png');
    const image=new Image();image.src=data;await image.decode();const check=document.createElement('canvas');check.width=image.width;check.height=image.height;check.getContext('2d').drawImage(image,0,0);const decodedHash=await hash(check.getContext('2d').getImageData(0,0,image.width,image.height).data);
    let runtimeHash=null;if(verifyRuntime){const field={color:'map',roughness:'roughnessMap',bump:'bumpMap'}[role],original=window.runtimeSkins.get(region)[field].image;runtimeHash=await hash(original.getContext('2d').getImageData(0,0,original.width,original.height).data);}
    entries.push({region,role,width:canvas.width,height:canvas.height,pixelHash,decodedHash,runtimeHash,data});
   }return entries;
  },{region,verifyRuntime});
  for(const entry of entries){assert.equal(entry.pixelHash,entry.decodedHash,`${region}/${entry.role}: PNG roundtrip changed pixels`);if(verifyRuntime)assert.equal(entry.pixelHash,entry.runtimeHash,`${region}/${entry.role}: preserved generator differs from product art`);const{name,data,...meta}={name:`skin-${region}-${entry.role}.png`,...entry};const target=activeRegions.has(region)?output:reportDir;await fs.writeFile(path.join(target,name),Buffer.from(data.split(',')[1],'base64'));report.files.push({...meta,file:path.relative(workspace,path.join(target,name)),runtimeAsset:activeRegions.has(region)});}
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);console.log(JSON.stringify({exported:report.files.length,runtimeAssets:report.files.filter(f=>f.runtimeAsset).length,runtimeCompared:verifyRuntime,allPixelsIdentical:true,report:path.join(reportDir,'report.json')}));
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.stack);}finally{await browser.close();await fs.writeFile(path.join(reportDir,'report.json'),JSON.stringify(report,null,2));}
