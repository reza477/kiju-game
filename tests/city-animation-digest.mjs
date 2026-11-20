// A digest of everything a city's animation writes, for all six carriers: every node's world matrix,
// every citizen instance matrix and colour, and every geometry attribute rewritten in the frame (the
// beast's corrected skin, its harness). Run it before and after a change that must not alter what the
// game computes; the two outputs must be identical. It runs in Node, with no graphics chip, and takes
// about a minute.
//
// Usage: node tests/city-animation-digest.mjs <out.json> [frames] [variant,variant]
//   then: cmp before.json after.json
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {installCPUCarrierEnvironment} from './beast-integration-cpu.mjs';
const out=process.argv[2],frames=+(process.argv[3]||150),only=process.argv[4]?.split(',');
const restore=installCPUCarrierEnvironment();
const assets=await import('../src/meshy-carriers.js');await assets.loadMeshyCarriers();
const {makeCity,animateCity,setCityRings}=await import('../src/carriers.js'),{placeCity}=await import('../src/scene.js'),sim=await import('../src/simulation.js');
const {animateWeapons}=await import('../src/armaments.js');
function populate(city,faction,variant){const state=sim.createGame(faction,variant);state.rings=2;const extra=state.buildings.flatMap((b,i)=>b?[]:[i]);for(const i of extra)state.buildings[i]={type:i%5===0?'cannon':i%3===0?'workshop':'housing',level:1+i%2,remaining:0};state.towerOrder?.push(...extra);setCityRings(city,2,state.buildings,state.towerOrder);return state;}
const rows=[],timing={};
for(const [faction,variant] of [['kaiju','flesh'],['kaiju','cyborg'],['crawler','standard'],['crawler','drill'],['airship','horizontal'],['airship','vertical']]){
  if(only&&!only.includes(variant))continue;
  const city=makeCity(faction,false,2,variant);try{populate(city,faction,variant);}catch(error){console.log('populate',variant,error.message);}
  const versions=new Map();let x=20,z=-30,ms=0;
  for(let frame=0;frame<frames;frame++){
    const moving=frame>=10&&frame<frames*.6,heading=.4+.3*Math.sin(frame/40);if(moving){x+=Math.sin(heading)*.11;z+=Math.cos(heading)*.11;}
    const t=performance.now();placeCity(city,x,z,heading);animateCity(city,2+frame/60,moving,28);animateWeapons(city,null,2+frame/60);ms+=performance.now()-t;
    city.root.updateMatrixWorld(true);
    const hash=createHash('sha256');let nodes=0,instances=0,rewritten=0;
    city.root.traverse(o=>{
      nodes++;hash.update(Float64Array.from(o.matrixWorld.elements));hash.update(o.visible?'v':'h');
      if(o.isInstancedMesh){instances+=o.count;hash.update(String(o.count));hash.update(Buffer.from(o.instanceMatrix.array.buffer,o.instanceMatrix.array.byteOffset,o.count*16*4));if(o.instanceColor)hash.update(Buffer.from(o.instanceColor.array.buffer,o.instanceColor.array.byteOffset,o.count*o.instanceColor.itemSize*4));if(o.morphTexture)hash.update(Buffer.from(o.morphTexture.image.data.buffer,o.morphTexture.image.data.byteOffset,o.morphTexture.image.data.byteLength));}
      if(o.isSkinnedMesh)for(const bone of o.skeleton.bones)hash.update(Float64Array.from(bone.matrixWorld.elements));
      if(o.geometry)for(const [name,attribute] of Object.entries(o.geometry.attributes)){const key=o.uuid+name,before=versions.get(key);versions.set(key,attribute.version);if(before!==undefined&&before!==attribute.version){rewritten++;hash.update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));}}
    });
    if(frame%5===0||frame<3)rows.push([variant,frame,nodes,instances,rewritten,hash.digest('hex').slice(0,20)]);
  }
  timing[variant]=+(ms/frames).toFixed(2);
  city.meshyCarrier?.controller?.dispose?.();
}
restore();
writeFileSync(out,JSON.stringify(rows));
console.log(JSON.stringify({rows:rows.length,animateMsPerFrame:timing,all:createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0,16)}));
