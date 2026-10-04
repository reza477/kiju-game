// Pack a metre-scaled turf/soil surface into the unused channels of the ground's
// existing seamless detail texture. The caller's R grain and all input bytes
// stay untouched, so the separately constructed river texture is unaffected.
// Output G/B are optical X/Z slopes, A is a grass-stroke/soil-clod tonal mask.
// This is material relief only: no displacement or world placement information.
export function packValleyDetail(source,size){
  if(!Number.isInteger(size)||size<16||source.length!==size*size*4)throw new Error('Invalid valley ground detail buffer');
  const data=new Uint8Array(source),metres=16,pixelsPerMetre=size/metres;
  let seed=0x673aa93d;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const wrap=v=>(v%size+size)%size;
  for(let i=0;i<size*size;i++)data[i*4+3]=118+Math.round((source[i*4]-135)*.13);
  function stroke(x,z,rx,rz,angle,tone,opacity){
    const cs=Math.cos(angle),sn=Math.sin(angle),reach=Math.max(rx,rz)*pixelsPerMetre;
    const cx=x*pixelsPerMetre,cz=z*pixelsPerMetre;
    for(let row=Math.floor(cz-reach);row<=Math.ceil(cz+reach);row++)for(let col=Math.floor(cx-reach);col<=Math.ceil(cx+reach);col++){
      const px=(col+.5-cx)/pixelsPerMetre,pz=(row+.5-cz)/pixelsPerMetre;
      const u=(px*cs+pz*sn)/rx,v=(-px*sn+pz*cs)/rz,r=u*u+v*v;if(r>=1)continue;
      const i=(wrap(row)*size+wrap(col))*4+3,t=(1-r)*opacity;
      data[i]=Math.round(data[i]+(tone-data[i])*t);
    }
  }
  // Unequal colonies create metre-scale negative space from actual blade
  // forms. There are no broad coloured circles beneath them. Their roots and
  // tapering tips break the contour, instead of evenly dusting every pixel.
  for(let colony=0;colony<10;colony++){
    const cx=random()*metres,cz=random()*metres,axis=random()*Math.PI*2;
    const spread=.85+random()*1.05,stretch=.43+random()*.44,clumps=12+Math.floor(random()*13);
    for(let clump=0;clump<clumps;clump++){
      const theta=random()*Math.PI*2,radius=Math.sqrt(random())*spread;
      const along=Math.cos(theta)*radius,across=Math.sin(theta)*radius*stretch;
      const x=cx+Math.cos(axis)*along-Math.sin(axis)*across,z=cz+Math.sin(axis)*along+Math.cos(axis)*across;
      const angle=axis+(random()-.5)*3.3,blades=3+Math.floor(random()*5),root=.12+random()*.19;
      stroke(x,z,root*1.4,root,angle,77,.54);
      for(let blade=0;blade<blades;blade++){
        const a=angle+(random()-.5)*2.8,length=.19+random()*.40,reach=length*.55;
        stroke(x+Math.cos(a)*reach,z+Math.sin(a)*reach,.041+random()*.031,length,a+Math.PI/2,176+random()*37,.82);
      }
    }
  }
  // Small embedded clods break the intervening soil without pale pebble dots.
  for(let clod=0;clod<290;clod++){
    const x=random()*metres,z=random()*metres,angle=random()*Math.PI,size=.045+random()*.095;
    stroke(x,z,size,size*(.52+random()*.42),angle,143+random()*20,.55);
  }
  const spacing=metres/size;
  for(let row=0;row<size;row++)for(let col=0;col<size;col++){
    const i=(row*size+col)*4;
    const left=data[(row*size+wrap(col-1))*4+3],right=data[(row*size+wrap(col+1))*4+3];
    const north=data[(wrap(row-1)*size+col)*4+3],south=data[(wrap(row+1)*size+col)*4+3];
    // A maximum few centimetres of optical relief, with an explicit slope cap.
    const sx=Math.max(-.25,Math.min(.25,(right-left)/255*.10/(2*spacing)));
    const sz=Math.max(-.25,Math.min(.25,(south-north)/255*.10/(2*spacing)));
    data[i+1]=Math.round((.5+sx*.5)*255);data[i+2]=Math.round((.5+sz*.5)*255);
  }
  return data;
}
