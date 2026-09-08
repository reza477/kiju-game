import * as T from '../vendor/three.module.js';
import {surfaceSet} from './surface-library.js';
import {HDRLoader} from '../vendor/HDRLoader.js';

const textures = new Map();
const materials = new Map();
const geometries = new Map();
export const animatedWindows = new Set();

export function random(seed = 15) {
  let value = seed >>> 0;
  return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function surfaceTexture(kind) {
  if (textures.has(kind)) return textures.get(kind);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  const rng = random([...kind].reduce((sum, ch) => sum + ch.charCodeAt(0), 41));
  c.fillStyle = '#cacac5';
  c.fillRect(0, 0, size, size);
  if (['brick', 'stone', 'pavement', 'roof'].includes(kind)) {
    const rows = kind === 'brick' ? 22 : kind === 'roof' ? 26 : kind === 'pavement' ? 18 : 13;
    const h = size / rows, w = h * (kind === 'roof' ? 1.3 : 2.1);
    c.fillStyle = kind === 'pavement' ? '#777973' : '#81827f';
    c.fillRect(0, 0, size, size);
    for (let row = 0; row <= rows; row++) {
      for (let col = -1; col < size / w + 1; col++) {
        const shade = 157 + Math.floor(rng() * 64);
        c.fillStyle = `rgb(${shade},${shade},${shade - 3})`;
        const x = col * w + (row % 2 ? w / 2 : 0), y = row * h;
        c.fillRect(x + 1, y + 1, w - 2, h - 2);
        c.fillStyle = '#ffffff28';c.fillRect(x + 1, y + 1, w - 2, 1.6);
        c.fillStyle = '#10171727';c.fillRect(x + 1, y + h - 3, w - 2, 2);
      }
    }
  } else if (kind === 'wood') {
    for (let i = 0; i < 16; i++) {
      const shade = 145 + rng() * 65;
      c.fillStyle = `rgb(${shade},${shade},${shade - 10})`;c.fillRect(i * 32 + 1, 0, 30, size);
      c.strokeStyle = '#302e2330';c.lineWidth = .8;
      for (let j = 0; j < 11; j++) {c.beginPath();c.moveTo(i * 32 + j * 3, 0);c.bezierCurveTo(i * 32 + j * 3 + 6, 160, i * 32 + j * 3 - 7, 350, i * 32 + j * 3, size);c.stroke();}
    }
  } else if (kind === 'skin') {
    const gradient=c.createLinearGradient(0,0,size,0);gradient.addColorStop(0,'#a9acaa');gradient.addColorStop(.5,'#bfc1bb');gradient.addColorStop(1,'#a9acaa');c.fillStyle=gradient;c.fillRect(0,0,size,size);
    // Restrained tendon striation follows the form instead of tiled pebble scales.
    for(let i=0;i<38;i++){const x=rng()*size;c.strokeStyle=i%3?'#555f6210':'#e5e7d913';c.lineWidth=.5+rng();c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x-8,150,x+12,350,x,size);c.stroke();}
  } else if (kind === 'foliage') {
    c.fillStyle='#76836a';c.fillRect(0,0,size,size);
    for(let i=0;i<2600;i++){
      const x=rng()*size,y=rng()*size,shade=118+rng()*112;
      c.save();c.translate(x,y);c.rotate(rng()*Math.PI);
      c.fillStyle=`rgb(${shade},${shade+Math.min(10,255-shade)},${shade-7})`;
      c.beginPath();c.ellipse(0,0,3+rng()*6,1.5+rng()*3,0,0,Math.PI*2);c.fill();
      c.strokeStyle='#f1f7d22a';c.lineWidth=.6;c.beginPath();c.moveTo(-4,0);c.lineTo(4,0);c.stroke();c.restore();
    }
  } else if (kind === 'fabric') {
    c.fillStyle = '#ddd7c3';c.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 64) {c.fillStyle = '#68634e28';c.fillRect(x, 0, 2, size);c.fillStyle = '#fff8e825';c.fillRect(x + 4, 0, 2, size);}
    for (let y = 0; y < size; y += 4) {c.fillStyle = '#564c3020';c.fillRect(0, y, size, .6);}
  } else if (['metal', 'copper', 'gold'].includes(kind)) {
    c.fillStyle = '#d1d4cf';c.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 128) {c.fillStyle = '#66727140';c.fillRect(x, 0, 2, size);for(let y=10;y<size;y+=64){c.fillStyle='#6a777075';c.beginPath();c.arc(x+7,y,2,0,Math.PI*2);c.fill();}}
    for (let i = 0; i < 1400; i++) {c.strokeStyle = `rgba(40,60,60,${rng() * .06})`;const x=rng()*size,y=rng()*size;c.beginPath();c.moveTo(x,y);c.lineTo(x+rng()*30,y+.3);c.stroke();}
  } else if (kind === 'window' || kind === 'glass') {
    const grad = c.createLinearGradient(0, 0, size, size);grad.addColorStop(0, '#cddce1');grad.addColorStop(.45, '#82979d');grad.addColorStop(.46, '#a1b3b6');grad.addColorStop(1, '#728889');c.fillStyle=grad;c.fillRect(0,0,size,size);
    c.fillStyle='#fffbe734';c.beginPath();c.moveTo(0,0);c.lineTo(110,0);c.lineTo(size,390);c.lineTo(size,size);c.fill();
  }
  const noiseCount = ['grass', 'terrain', 'soil', 'foliage'].includes(kind) ? 39000 : 11000;
  for (let i = 0; i < noiseCount; i++) {
    const light=rng()>.5;c.fillStyle=light?'rgba(255,255,239,0.07)':'rgba(20,34,27,0.09)';
    const n=['grass','terrain'].includes(kind)?1+rng()*4:1.2;
    c.fillRect(rng()*size,rng()*size,n,n);
  }
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;
  textures.set(kind, tex);return tex;
}

const defaults = {
  stone:0xa0aaa9,brick:0xaf735a,plaster:0xe0d6b8,roof:0x3a5965,copper:0x639c91,
  metal:0x51616b,wood:0x927550,glass:0x739ca8,window:0xc3e0df,pavement:0x9dada6,
  foliage:0x4c8351,soil:0x766047,fabric:0xe8d6aa,gold:0xc89b4d,grass:0x89a867,
  terrain:0x91a878,water:0x4e9fa7,skin:0x657c69,bone:0xcfbd94
};

export function getMaterial(kind='stone', color, options={}) {
  color ??= defaults[kind] ?? defaults.stone;
  const key=kind+':'+color+':'+JSON.stringify(options);
  if(materials.has(key))return materials.get(key);
  const metallic=['metal','gold','copper'].includes(kind);
  const glazed=['glass','window'].includes(kind);
  const mapped=!['water','bone'].includes(kind);
  const scanName=({stone:'stone',brick:'brick',plaster:'plaster',roof:'roof',wood:'wood',metal:'metal',bark:'bark',rock:'rock'})[kind];
  const scan=scanName?surfaceSet(scanName):null;
  const texture=scan?.map??(mapped?surfaceTexture(kind):null);
  const m=new T.MeshStandardMaterial({color,map:texture,
    roughness:scan?1:metallic?.43:glazed?.22:kind==='skin'?.83:.92,
    metalness:metallic?.68:glazed?.24:0,
    normalMap:scan?.normalMap??null,normalScale:new T.Vector2(.55,.55),roughnessMap:scan?.roughnessMap??null,
    bumpMap:!scan&&mapped&&!glazed?texture:null,
    bumpScale:kind==='skin'?.055:kind==='brick'||kind==='stone'?.035:kind==='roof'?.022:.008,
    ...options});
  if(kind==='window'){m.emissive.set(0xffbf67);m.emissiveIntensity=.13;animatedWindows.add(m);}
  m.userData.shared=true;if(scan)m.userData.surfaceScale=scan.scale;
  m.name=`${kind} ${new T.Color(color).getHexString()}`;materials.set(key,m);return m;
}

export function setWindowLighting(strength) {for(const m of animatedWindows)m.emissiveIntensity=strength;}
function geom(key,create){if(!geometries.has(key)){const g=create();g.userData.shared=true;geometries.set(key,g);}return geometries.get(key);}
function resolve(m){return m?.isMaterial?m:getMaterial('stone',m);}
function mesh(group,geometry,m,x,y,z){const material=resolve(m);if(material.userData.surfaceScale)geometry=geom(`metric:${geometry.uuid}:${material.userData.surfaceScale}`,()=>metricUV(geometry.clone(),material.userData.surfaceScale));const obj=new T.Mesh(geometry,material);obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;group.add(obj);return obj;}
// Metres-per-tile projections are baked into mesh UVs, so brickwork keeps its
// scale on thin walls and never swims when an entire carrier walks or rotates.
function metricUV(geometry,scale){const p=geometry.attributes.position,n=geometry.attributes.normal;if(!p||!n)return geometry;const uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));if(y>x&&y>z){uv[i*2]=p.getX(i)/scale;uv[i*2+1]=-p.getZ(i)/scale;}else if(x>z){uv[i*2]=p.getZ(i)/scale;uv[i*2+1]=p.getY(i)/scale;}else{uv[i*2]=p.getX(i)/scale;uv[i*2+1]=p.getY(i)/scale;}}geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.userData.metricUV=true;return geometry;}
export function box(g,w,h,d,m,x=0,y=0,z=0){return mesh(g,geom(`b:${w}:${h}:${d}`,()=>new T.BoxGeometry(w,h,d)),m,x,y,z);}
export function cylinder(g,rTop,rBottom,h,m,x=0,y=0,z=0,segments=16){return mesh(g,geom(`c:${rTop}:${rBottom}:${h}:${segments}`,()=>new T.CylinderGeometry(rTop,rBottom,h,segments)),m,x,y,z);}
export function cone(g,r,h,m,x=0,y=0,z=0,segments=16){return cylinder(g,0,r,h,m,x,y,z,segments);}
export function sphere(g,r,m,x=0,y=0,z=0,sx=1,sy=1,sz=1){const o=mesh(g,geom('s:'+r,()=>new T.SphereGeometry(r,24,16)),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
export function beam(g,a,b,r,m){const direction=new T.Vector3(...b).sub(new T.Vector3(...a));const o=cylinder(g,r,r,direction.length(),m,...a,10);o.position.addScaledVector(direction,.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());return o;}

// Merge each material into one draw while keeping animated groups and hit proxies separate.
export function batchStatic(group) {
  group.updateMatrixWorld(true);
  const inverse=group.matrixWorld.clone().invert(),buckets=new Map(),originals=[];
  group.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||o.userData.noBatch||!o.visible||Array.isArray(o.material)||!o.material.visible)return;
    let ancestor=o.parent;while(ancestor&&ancestor!==group){if(ancestor.userData.noBatch)return;ancestor=ancestor.parent;}
    const m=o.material;
    if(!buckets.has(m))buckets.set(m,[]);
    const local=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld);
    const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(local);
    if(m.userData.surfaceScale)metricUV(g,m.userData.surfaceScale);
    buckets.get(m).push(g);originals.push(o);
  });
  for(const [material,pieces] of buckets){
    let count=0;for(const g of pieces)count+=g.attributes.position.count;
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2);let v=0;
    for(const g of pieces){const a=g.attributes;positions.set(a.position.array,v*3);if(a.normal)normals.set(a.normal.array,v*3);if(a.uv)uvs.set(a.uv.array,v*2);v+=a.position.count;g.dispose();}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setAttribute('uv',new T.BufferAttribute(uvs,2));geometry.computeBoundingSphere();
    const merged=new T.Mesh(geometry,material);merged.castShadow=true;merged.receiveShadow=true;merged.userData.batched=true;group.add(merged);
  }
  for(const o of originals){o.removeFromParent();if(!o.geometry.userData.shared)o.geometry.dispose();}
  return group;
}

export function disposeGroup(group){group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();if(o.material&&!Array.isArray(o.material)&&!o.material.userData.shared)o.material.dispose();});}

export function createEnvironment(renderer) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');
  const gradient=c.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#5286ad');gradient.addColorStop(.4,'#bfd6df');gradient.addColorStop(.51,'#e3dcc1');gradient.addColorStop(.52,'#8a9b73');gradient.addColorStop(1,'#435849');c.fillStyle=gradient;c.fillRect(0,0,512,256);
  const glow=c.createRadialGradient(105,95,1,105,95,65);glow.addColorStop(0,'rgba(255,242,211,1)');glow.addColorStop(.12,'rgba(255,236,198,.8)');glow.addColorStop(1,'rgba(255,230,180,0)');c.fillStyle=glow;c.fillRect(0,0,512,256);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.mapping=T.EquirectangularReflectionMapping;
  const generator=new T.PMREMGenerator(renderer);const target=generator.fromEquirectangular(texture);texture.dispose();generator.dispose();return target;
}

export async function loadDaylightEnvironment(renderer){
 const texture=await new HDRLoader().loadAsync(new URL('../assets/materials/daylight.hdr',import.meta.url).href);
 texture.mapping=T.EquirectangularReflectionMapping;
 const generator=new T.PMREMGenerator(renderer);const target=generator.fromEquirectangular(texture);texture.dispose();generator.dispose();return target;
}
