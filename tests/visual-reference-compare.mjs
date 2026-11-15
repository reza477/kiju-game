// Compares two folders written by tests/visual-reference-capture.mjs, pixel by pixel.
// Usage: node tests/visual-reference-compare.mjs <beforeDir> <afterDir> [--diff <dir>] [--tolerance <levels>] [--allow <fraction>]
// Exit code 1 when any picture differs beyond the allowance.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {PNG}=require(path.join(path.dirname(require.resolve('playwright-core/package.json')),'lib/utilsBundle.js'));
const args=process.argv.slice(2),option=name=>{const at=args.indexOf(name);return at<0?null:args.splice(at,2)[1];};
const diffDir=option('--diff'),tolerance=Number(option('--tolerance')??0),allow=Number(option('--allow')??0),[before,after]=args;
if(!before||!after)throw new Error('Usage: visual-reference-compare.mjs <beforeDir> <afterDir>');
if(diffDir)await fs.mkdir(diffDir,{recursive:true});
const files=(await fs.readdir(before)).filter(name=>name.endsWith('.png')).sort(),rows=[];let failed=false;
for(const file of files){
  let b;try{b=PNG.sync.read(await fs.readFile(path.join(after,file)));}catch{rows.push({file,missing:true});failed=true;continue;}
  const a=PNG.sync.read(await fs.readFile(path.join(before,file)));
  if(a.width!==b.width||a.height!==b.height){rows.push({file,size:[a.width,a.height,b.width,b.height]});failed=true;continue;}
  let differing=0,over=0,largest=0,sum=0;const diff=diffDir?new PNG({width:a.width,height:a.height}):null;
  for(let i=0;i<a.data.length;i+=4){
    const d=Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2]));
    if(d){differing++;sum+=d;if(d>largest)largest=d;if(d>tolerance)over++;}
    if(diff){const grey=(a.data[i]+a.data[i+1]+a.data[i+2])/12;diff.data[i]=d?255:grey;diff.data[i+1]=d?Math.max(0,255-d*24):grey;diff.data[i+2]=d?0:grey;diff.data[i+3]=255;}
  }
  const pixels=a.width*a.height,row={file,pixels,differing,share:+(differing/pixels*100).toFixed(4),overTolerance:over,largest,meanOfDiffering:differing?+(sum/differing).toFixed(2):0};
  rows.push(row);if(over/pixels>allow)failed=true;
  if(diff&&differing)await fs.writeFile(path.join(diffDir,file),PNG.sync.write(diff));
}
for(const row of rows)console.log(row.missing?`${row.file}: missing in after`:row.size?`${row.file}: size changed ${row.size}`:`${row.file.padEnd(34)} ${row.differing===0?'identical':`${row.differing} pixels differ (${row.share}%), largest ${row.largest}/255, mean ${row.meanOfDiffering}${tolerance?`, ${row.overTolerance} over tolerance ${tolerance}`:''}`}`);
console.log(failed?'DIFFERENT':'OK');process.exitCode=failed?1:0;
