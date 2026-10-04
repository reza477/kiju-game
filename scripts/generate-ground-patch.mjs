// Reproducible project-authored ground material. Node's standard library only.
// No downloaded photographs, generation service, browser or modelling tool.
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {deflateSync,inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {GROUND_PATCH as area} from '../src/ground-patch.js';
import {terrainNoise,shoreDistance,bankWidth,smoothstep} from '../src/terrain.js';

const width=area.width,height=area.height,count=width*height,colour=new Float32Array(count*3),heightField=new Float32Array(count),rough=new Float32Array(count);
const woodland=new Float32Array(count),grassy=new Float32Array(count),bank=new Float32Array(count),wet=new Float32Array(count);
const dx=(area.maxX-area.minX)/width,dz=(area.maxZ-area.minZ)/height;
const roots=[[2.3642589105,-119.4757756311,6,4.8],[3.730055457,-116.9792930363,5.8,5.2],[24.6273684315,-117.100318079,7.3,5.9],[-51.3532261597,-116.312297853,5.4,4.8],[-42.1749242116,-103.2620989485,6.6,5.1],[-62.4282861594,-130.558318156,4.8,4.1]];
const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
let seed=0x57ba2026;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function mixColour(i,value,amount){const j=i*3;for(let c=0;c<3;c++)colour[j+c]=mix(colour[j+c],value[c],amount);}
for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const i=row*width+col,x=area.minX+(col+.5)*dx,z=area.minZ+(row+.5)*dz;
  const broad=terrainNoise(x*.19+6,z*.23-3),mid=terrainNoise(x*.63-4,z*.58+11),fine=terrainNoise(x*3.7+21,z*3.4-9);
  const d=shoreDistance(x,z),beach=bankWidth(x,z),waterline=-3+(beach+3)*.61;
  wet[i]=1-smoothstep(waterline-.3,waterline+2.4,d);
  bank[i]=(1-smoothstep(waterline+1.4,beach+5+(broad-.5)*4,d))*(1-wet[i]*.72);
  let floor=0;
  for(const[cx,cz,rx,rz]of roots){const distance=((x-cx)/rx)**2+((z-cz)/rz)**2;floor=Math.max(floor,1-smoothstep(.20,.97,distance+(mid-.5)*.22));}
  woodland[i]=floor;
  grassy[i]=smoothstep(.36,.69,broad*.73+mid*.27)*(1-bank[i]*.94)*(1-floor*.83)*(1-wet[i]);
  const earthy=[97,93,67],meadow=[86,104,61],litter=[74,69,47],shingle=[109,113,100];
  for(let c=0;c<3;c++)colour[i*3+c]=earthy[c];
  mixColour(i,meadow,grassy[i]*.88);mixColour(i,litter,floor*.89);mixColour(i,shingle,bank[i]*.75);
  mixColour(i,[48,59,41],wet[i]*.84);
  // Low-contrast mineral aggregates carry the soil between authored strokes.
  const grain=(fine-.5)*10+(mid-.5)*6;
  for(let c=0;c<3;c++)colour[i*3+c]+=grain;
  heightField[i]=(mid-.5)*.025+(fine-.5)*.017+grassy[i]*.020;
  rough[i]=mix(.94,.73,wet[i]);
}
function indexAt(x,z){return Math.floor((z-area.minZ)/dz)*width+Math.floor((x-area.minX)/dx);}
function valid(x,z){return x>area.minX+.6&&x<area.maxX-.6&&z>area.minZ+.6&&z<area.maxZ-.6;}
// Raster a tapered ellipse with an irregular edge. Shapes are drawn in metres,
// not repeated tile coordinates, so there is no visible texture grid or stamp.
function dab(x,z,rx,rz,angle,rgb,lift,opacity=1,hardness=.5,power=2){
  const cs=Math.cos(angle),sn=Math.sin(angle),reach=Math.max(rx,rz)*1.10;
  const x0=Math.max(0,Math.floor((x-reach-area.minX)/dx)),x1=Math.min(width-1,Math.ceil((x+reach-area.minX)/dx));
  const z0=Math.max(0,Math.floor((z-reach-area.minZ)/dz)),z1=Math.min(height-1,Math.ceil((z+reach-area.minZ)/dz));
  for(let row=z0;row<=z1;row++)for(let col=x0;col<=x1;col++){
    const wx=area.minX+(col+.5)*dx-x,wz=area.minZ+(row+.5)*dz-z,u=(wx*cs+wz*sn)/rx,v=(-wx*sn+wz*cs)/rz;
    const radius=power===2?u*u+v*v:Math.abs(u)**power+Math.abs(v)**power;if(radius>=1)continue;
    const i=row*width+col,weight=(1-smoothstep(hardness,1,radius))*opacity;
    mixColour(i,rgb,weight);heightField[i]+=lift*(1-radius)*weight;
  }
}
// Tufts are small overlapping curved strokes inside irregular root-connected
// clusters. Their negative space reveals soil rather than a uniform green mat.
for(let n=0;n<8800;n++){
  const x=mix(area.minX,area.maxX,random()),z=mix(area.minZ,area.maxZ,random());if(!valid(x,z))continue;
  const i=indexAt(x,z);if(random()>grassy[i]*.84+woodland[i]*.11*(1-wet[i]))continue;
  const angle=random()*Math.PI*2,spread=.17+random()*.29,tone=random();
  const blade=[87+tone*21,105+tone*20,55+tone*13];
  dab(x,z,spread*.97,spread*.73,angle,[59,70,39],-.013,.38);
  for(let b=0;b<3+Math.floor(random()*4);b++){
    const turn=angle+(random()-.5)*1.8,length=.22+random()*.47,offset=(random()-.5)*spread;
    dab(x+Math.cos(turn)*length*.22+offset,z+Math.sin(turn)*length*.22, .053+random()*.035,length,turn+Math.PI/2,blade,.025,.60,.30);
  }
}
// Angular flat shingle and soil aggregates use varied forms/scales. These are
// only centimetres of optical relief: the physical walking mesh is untouched.
for(let n=0;n<14000;n++){
  const x=mix(area.minX,area.maxX,random()),z=mix(area.minZ,area.maxZ,random());if(!valid(x,z))continue;
  const i=indexAt(x,z),seam=smoothstep(.38,.67,terrainNoise(x*.24+12,z*.31-3));
  const density=.014+bank[i]*(.16+seam*.64)+(1-grassy[i])*(.020+seam*.048);
  if(random()>density*(1-wet[i]*.90))continue;
  const size=.08+random()**2*.31,aspect=.44+random()*.48,angle=random()*Math.PI,light=random(),power=1.25+random()*.55;
  const stone=[94+light*29,99+light*27,88+light*26];
  dab(x,z,size*1.12,size*aspect*1.12,angle,[67,65,49],-.018,.33,.75,power);
  dab(x-.02,z-.01,size,size*aspect,angle,stone,.033+size*.06,.64,.67,power);
}
// Litter clusters sit below the six unchanged trees: muted leaf blades,
// broken needles and twig fragments, rather than a brown circular decal.
for(let n=0;n<16000;n++){
  const x=mix(area.minX,area.maxX,random()),z=mix(area.minZ,area.maxZ,random());if(!valid(x,z))continue;
  const i=indexAt(x,z);if(random()>woodland[i]*(1-wet[i])*.82)continue;
  const leaf=random()>.27,angle=random()*Math.PI*2,tone=random(),length=leaf?.11+random()*.21:.22+random()*.41;
  dab(x,z,leaf?.06+random()*.055:.027,length,angle,[91+tone*36,76+tone*24,43+tone*19],leaf?.017:.021,.72,.35);
}
const albedo=new Uint8Array(count*4),relief=new Uint8Array(count*4);
for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const i=row*width+col,j=i*4;
  const left=heightField[row*width+Math.max(0,col-1)],right=heightField[row*width+Math.min(width-1,col+1)];
  const north=heightField[Math.max(0,row-1)*width+col],south=heightField[Math.min(height-1,row+1)*width+col];
  const sx=clamp((right-left)/(2*dx),-.55,.55),sz=clamp((south-north)/(2*dz),-.55,.55);
  for(let c=0;c<3;c++)albedo[j+c]=Math.round(clamp(colour[i*3+c],0,255));
  albedo[j+3]=Math.round(rough[i]*255);
  relief[j]=Math.round((.5+sx*.5)*255);relief[j+1]=Math.round((.5+sz*.5)*255);
  const pit=Math.max(0,(left+right+north+south)*.25-heightField[i]);
  relief[j+2]=Math.round((1-clamp(pit*4,0,.14))*255);relief[j+3]=255;
}
// Minimal deterministic RGBA PNG encoder; standard chunks, no timestamps.
const table=new Uint32Array(256);for(let n=0;n<256;n++){let v=n;for(let b=0;b<8;b++)v=(v&1)?0xedb88320^(v>>>1):v>>>1;table[n]=v;}
function crc(bytes){let v=0xffffffff;for(const b of bytes)v=table[(v^b)&255]^(v>>>8);return(v^0xffffffff)>>>0;}
function chunk(type,data){const tag=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);tag.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([tag,data])),data.length+8);return out;}
function png(data){
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const stride=width*4,raw=Buffer.alloc((stride+1)*height);
  for(let row=0;row<height;row++){
    const input=row*stride,output=row*(stride+1);raw[output]=1;
    for(let c=0;c<stride;c++)raw[output+1+c]=(data[input+c]-(c>=4?data[input+c-4]:0)+256)&255;
  }
  const compressed=deflateSync(raw,{level:9}),decodedRows=inflateSync(compressed),decoded=Buffer.alloc(data.length);
  for(let row=0;row<height;row++)for(let c=0;c<stride;c++){const i=row*stride+c;decoded[i]=(decodedRows[row*(stride+1)+1+c]+(c>=4?decoded[i-4]:0))&255;}
  if(!decoded.equals(Buffer.from(data)))throw new Error('Lossless PNG Sub-filter round trip changed texture pixels');
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',compressed),chunk('IEND',Buffer.alloc(0))]);
}
const check=process.argv.includes('--check'),directory=new URL('../assets/materials/',import.meta.url);if(!check)await mkdir(directory,{recursive:true});
const files=[];
for(const[name,data]of[['westbank-ground-colour.png',albedo],['westbank-ground-relief.png',relief]]){const bytes=png(data),file=new URL(name,directory);if(check){if(!bytes.equals(await readFile(file)))throw new Error('Ground material is not reproducible: '+name);}else await writeFile(file,bytes);files.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
console.log(JSON.stringify({generator:fileURLToPath(import.meta.url),verifiedOnly:check,area,seed:'0x57ba2026',textures:files,losslessPngRoundTrip:true,estimatedMipBytes:2*width*height*4*4/3,physicalGeometryChanged:false},null,2));
