import * as T from '../vendor/three.module.js';

// Direct delta-mush data are declared in the GLB. This edits one actor's actual
// standard geometry before rendering, raycasts and saddle fitting. No shader
// substitution, proxy mesh, triangle removal or modified skin weights.
export function createNativeSkinCorrective(mesh) {
  const declaration=mesh.userData.nativeQuadruped?.surfaceCorrective;
  if(!declaration)return null;
  const source=mesh.geometry,sp=source.attributes.position,sn=source.attributes.normal;
  const si=source.attributes.skinIndex,sw=source.attributes.skinWeight,mask=source.attributes[declaration.maskAttribute];
  const rest=source.attributes[declaration.restAttribute],bindNormal=source.attributes[declaration.bindNormalAttribute];
  const moments=mesh.skeleton.bones.map((_,i)=>source.attributes[declaration.momentAttributePrefix+i]);
  if(declaration.version!==1||!mask||!rest||!bindNormal||moments.some(a=>!a))throw Error('Incomplete declared surface corrective');
  const geometry=new T.BufferGeometry();geometry.setIndex(source.index.clone());
  // Corrective tables stay on the immutable CPU source geometry. The actor's
  // render geometry exposes only attributes consumed by the standard shader.
  // Own every uploaded attribute, including immutable UV/skin/index buffers,
  // so disposing this geometry cannot invalidate another actor's shared VBO.
  for(const[name,attribute]of Object.entries(source.attributes))if(!name.startsWith('_mush_'))geometry.setAttribute(name,attribute.clone());
  for(const group of source.groups)geometry.addGroup(group.start,group.count,group.materialIndex);
  geometry.setDrawRange(source.drawRange.start,source.drawRange.count);geometry.userData={...source.userData,nativeSurfaceCorrective:true};
  geometry.boundingBox=source.boundingBox?.clone()??null;geometry.boundingSphere=source.boundingSphere?.clone()??null;
  mesh.geometry=geometry;const position=geometry.attributes.position,normal=geometry.attributes.normal;
  position.setUsage(T.DynamicDrawUsage);normal.setUsage(T.DynamicDrawUsage);
  const map=new Map(),first=[],inverse=new Uint32Array(sp.count),duplicates=[];
  for(let i=0;i<sp.count;i++){const key=sp.getX(i)+','+sp.getY(i)+','+sp.getZ(i);let u=map.get(key);if(u===undefined){u=first.length;map.set(key,u);first.push(i);duplicates.push([]);}inverse[i]=u;duplicates[u].push(i);}
  const active=first.map((id,u)=>({id,u,mask:mask.getX(id)})).filter(item=>item.mask>0);
  for(const item of active){item.inverse=new Float64Array(9);item.terms=[];for(let bone=0;bone<moments.length;bone++){const a=moments[bone],o=item.id*4;if(a.array[o+3]>1e-12)item.terms.push([bone,a.array[o],a.array[o+1],a.array[o+2],a.array[o+3]]);}}
  // Cache disjoint active-only source views once; no source or protected writes.
  const resetRanges=[],resetVertices=active.flatMap(item=>duplicates[item.u]).sort((a,b)=>a-b);
  for(let at=0;at<resetVertices.length;){const start=resetVertices[at++];let end=start+1;while(at<resetVertices.length&&resetVertices[at]===end){end++;at++;}resetRanges.push({offset:start*3,position:sp.array.subarray(start*3,end*3),normal:sn.array.subarray(start*3,end*3)});}
  const triangles=source.index.array,normalFaces=[];
  for(let fi=0;fi<triangles.length;fi+=3)if(mask.getX(triangles[fi])>0||mask.getX(triangles[fi+1])>0||mask.getX(triangles[fi+2])>0)normalFaces.push([inverse[triangles[fi]],inverse[triangles[fi+1]],inverse[triangles[fi+2]]]);
  const needed=[...new Set([...normalFaces.flat(),...active.map(item=>item.u)])];
  const palette=mesh.skeleton.bones.map(()=>new T.Matrix4()),A=new Float64Array(first.length*12),posed=new Float64Array(first.length*3),geometric=new Float64Array(first.length*3);
  let disposed=false,last={updates:0,activeVertices:active.reduce((s,v)=>s+duplicates[v.u].length,0),activeWeldedVertices:active.length,declared:true},totalMs=0;
  // The per-frame loops below read flat typed arrays instead of attribute
  // getters and per-vertex objects. This is the same arithmetic in the same
  // order as the declared corrective, so every position and normal it writes
  // is bit-for-bit what the earlier loops wrote; it only costs a third as much.
  for(const attribute of[sp,sn,rest,bindNormal,position,normal])if(!attribute.isBufferAttribute||attribute.isInterleavedBufferAttribute||attribute.normalized||attribute.itemSize!==3)throw Error('Unsupported surface corrective attribute layout');
  if(si.itemSize!==4||sw.itemSize!==4||si.normalized||sw.normalized)throw Error('Unsupported surface corrective skin layout');
  const spa=sp.array,sna=sn.array,swa=sw.array,sia=si.array,resta=rest.array,binda=bindNormal.array,pa=position.array,na=normal.array;
  const P=new Float64Array(palette.length*16),neededU=Int32Array.from(needed),neededId=Int32Array.from(needed,u=>first[u]);
  const count=active.length,activeId=Int32Array.from(active,item=>item.id),activeU=Int32Array.from(active,item=>item.u),activeMask=Float64Array.from(active,item=>item.mask),inverses=new Float64Array(count*9);
  const termStart=new Int32Array(count+1),duplicateStart=new Int32Array(count+1);
  for(let k=0;k<count;k++){termStart[k+1]=termStart[k]+active[k].terms.length;duplicateStart[k+1]=duplicateStart[k]+duplicates[active[k].u].length;}
  // Moments are Float32 in the asset, so Float32 storage holds them exactly
  // and halves what the hot loop streams through each frame.
  const termBone=new Uint16Array(termStart[count]),termValue=new Float32Array(termStart[count]*4),duplicateId=new Int32Array(duplicateStart[count]);
  for(let k=0;k<count;k++){
    active[k].terms.forEach(([bone,x,y,z,w],n)=>{const t=termStart[k]+n;termBone[t]=bone*16;termValue.set([x,y,z,w],t*4);});
    duplicateId.set(duplicates[active[k].u],duplicateStart[k]);
  }
  const faceIds=Int32Array.from(normalFaces.flat(),u=>u*3);
  // Math.hypot as V8 computes it: scale by the largest magnitude, Kahan-sum
  // the squares, scale back. Inlined because the builtin allocates per call
  // and the normals need it about 120,000 times a frame.
  function hypot3(x,y,z){
    const ax=Math.abs(x),ay=Math.abs(y),az=Math.abs(z);let max=0;if(ax>max)max=ax;if(ay>max)max=ay;if(az>max)max=az;
    if(!(max>0&&max<Infinity))return Math.hypot(x,y,z);
    let n=ax/max,summand=n*n,sum=summand,compensation=(sum-0)-summand;
    n=ay/max;summand=n*n-compensation;let preliminary=sum+summand;compensation=(preliminary-sum)-summand;sum=preliminary;
    n=az/max;summand=n*n-compensation;preliminary=sum+summand;
    return Math.sqrt(preliminary)*max;
  }
  function reset(){if(disposed)return;for(const range of resetRanges){position.array.set(range.position,range.offset);normal.array.set(range.normal,range.offset);}}
  function update(){
    if(disposed)return;const started=performance.now();
    for(let b=0;b<palette.length;b++)P.set(palette[b].copy(mesh.bindMatrixInverse).multiply(mesh.skeleton.bones[b].matrixWorld).multiply(mesh.skeleton.boneInverses[b]).multiply(mesh.bindMatrix).elements,b*16);
    // Row-major3x4 blended affine map, matching SkinnedMesh.applyBoneTransform.
    for(let n=0;n<neededU.length;n++){
      const id=neededId[n],u=neededU[n],o=u*12,w4=id*4;
      let a0=0,a1=0,a2=0,a3=0,a4=0,a5=0,a6=0,a7=0,a8=0,a9=0,a10=0,a11=0;
      for(let lane=0;lane<4;lane++){const weight=swa[w4+lane];if(!weight)continue;const m=sia[w4+lane]*16;
        // Same lane/row/column accumulation order as the original nested loop.
        a0+=weight*P[m];a1+=weight*P[m+4];a2+=weight*P[m+8];a3+=weight*P[m+12];
        a4+=weight*P[m+1];a5+=weight*P[m+5];a6+=weight*P[m+9];a7+=weight*P[m+13];
        a8+=weight*P[m+2];a9+=weight*P[m+6];a10+=weight*P[m+10];a11+=weight*P[m+14];
      }
      A[o]=a0;A[o+1]=a1;A[o+2]=a2;A[o+3]=a3;A[o+4]=a4;A[o+5]=a5;A[o+6]=a6;A[o+7]=a7;A[o+8]=a8;A[o+9]=a9;A[o+10]=a10;A[o+11]=a11;
      const x=spa[id*3],y=spa[id*3+1],z=spa[id*3+2],k=u*3;
      posed[k]=a0*x+a1*y+a2*z+a3;posed[k+1]=a4*x+a5*y+a6*z+a7;posed[k+2]=a8*x+a9*y+a10*z+a11;
    }
    let minDet=Infinity,maxDisplacement=0,maxPreDisplacement=0,maxReplayError=0;
    for(let k=0;k<count;k++){
      const id=activeId[k],u=activeU[k],o=u*12,weight=activeMask[k];let smoothedX=0,smoothedY=0,smoothedZ=0;
      for(let t=termStart[k],end=termStart[k+1];t<end;t++){const m=termBone[t],v=t*4,x=termValue[v],y=termValue[v+1],z=termValue[v+2],w=termValue[v+3];
        smoothedX+=P[m]*x+P[m+4]*y+P[m+8]*z+P[m+12]*w;smoothedY+=P[m+1]*x+P[m+5]*y+P[m+9]*z+P[m+13]*w;smoothedZ+=P[m+2]*x+P[m+6]*y+P[m+10]*z+P[m+14]*w;}
      const a=A[o],b=A[o+1],c=A[o+2],d=A[o+4],e=A[o+5],f=A[o+6],g=A[o+8],h=A[o+9],i=A[o+10];
      const det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);minDet=Math.min(minDet,Math.abs(det));if(Math.abs(det)<1e-10)throw Error('Surface corrective inverse skin is singular');
      const i0=(e*i-f*h)/det,i1=(c*h-b*i)/det,i2=(b*f-c*e)/det,i3=(f*g-d*i)/det,i4=(a*i-c*g)/det,i5=(c*d-a*f)/det,i6=(d*h-e*g)/det,i7=(b*g-a*h)/det,i8=(a*e-b*d)/det,iv=k*9;
      inverses[iv]=i0;inverses[iv+1]=i1;inverses[iv+2]=i2;inverses[iv+3]=i3;inverses[iv+4]=i4;inverses[iv+5]=i5;inverses[iv+6]=i6;inverses[iv+7]=i7;inverses[iv+8]=i8;
      const rx=resta[id*3],ry=resta[id*3+1],rz=resta[id*3+2],deltaX=(smoothedX-(a*rx+b*ry+c*rz+A[o+3]))*weight,deltaY=(smoothedY-(d*rx+e*ry+f*rz+A[o+7]))*weight,deltaZ=(smoothedZ-(g*rx+h*ry+i*rz+A[o+11]))*weight;
      const preX=i0*deltaX+i1*deltaY+i2*deltaZ,preY=i3*deltaX+i4*deltaY+i5*deltaZ,preZ=i6*deltaX+i7*deltaY+i8*deltaZ;
      maxDisplacement=Math.max(maxDisplacement,hypot3(deltaX,deltaY,deltaZ));maxPreDisplacement=Math.max(maxPreDisplacement,hypot3(preX,preY,preZ));
      for(let n=duplicateStart[k],end=duplicateStart[k+1];n<end;n++){const v=duplicateId[n]*3;pa[v]=spa[v]+preX;pa[v+1]=spa[v+1]+preY;pa[v+2]=spa[v+2]+preZ;}
      // Use storedFloat32 prepositions for all subsequent geometric normals.
      const x=pa[id*3],y=pa[id*3+1],z=pa[id*3+2],p=u*3;
      const actualX=a*x+b*y+c*z+A[o+3];maxReplayError=Math.max(maxReplayError,Math.abs(actualX-(posed[p]+deltaX)));posed[p]=actualX;
      const actualY=d*x+e*y+f*z+A[o+7];maxReplayError=Math.max(maxReplayError,Math.abs(actualY-(posed[p+1]+deltaY)));posed[p+1]=actualY;
      const actualZ=g*x+h*y+i*z+A[o+11];maxReplayError=Math.max(maxReplayError,Math.abs(actualZ-(posed[p+2]+deltaZ)));posed[p+2]=actualZ;
    }
    geometric.fill(0);
    for(let face=0;face<faceIds.length;face+=3){const a=faceIds[face],b=faceIds[face+1],c=faceIds[face+2];
      const ax=posed[b]-posed[a],ay=posed[b+1]-posed[a+1],az=posed[b+2]-posed[a+2],bx=posed[c]-posed[a],by=posed[c+1]-posed[a+1],bz=posed[c+2]-posed[a+2],nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
      geometric[a]+=nx;geometric[a+1]+=ny;geometric[a+2]+=nz;
      geometric[b]+=nx;geometric[b+1]+=ny;geometric[b+2]+=nz;
      geometric[c]+=nx;geometric[c+1]+=ny;geometric[c+2]+=nz;
    }
    for(let k=0;k<count;k++){
      const u=activeU[k],o=u*12,p=u*3,iv=k*9,t=activeMask[k],len=hypot3(geometric[p],geometric[p+1],geometric[p+2]);if(len<1e-20)throw Error('Degenerate corrective normal neighborhood');
      const gx=geometric[p]/len,gy=geometric[p+1]/len,gz=geometric[p+2]/len;
      const a0=A[o],a1=A[o+1],a2=A[o+2],a4=A[o+4],a5=A[o+5],a6=A[o+6],a8=A[o+8],a9=A[o+9],a10=A[o+10];
      const i0=inverses[iv],i1=inverses[iv+1],i2=inverses[iv+2],i3=inverses[iv+3],i4=inverses[iv+4],i5=inverses[iv+5],i6=inverses[iv+6],i7=inverses[iv+7],i8=inverses[iv+8];
      for(let n=duplicateStart[k],end=duplicateStart[k+1];n<end;n++){
        const v=duplicateId[n]*3,sx=sna[v],sy=sna[v+1],sz=sna[v+2],bx=binda[v],by=binda[v+1],bz=binda[v+2];
        const rx=a0*sx+a1*sy+a2*sz,ry=a4*sx+a5*sy+a6*sz,rz=a8*sx+a9*sy+a10*sz,qx=a0*bx+a1*by+a2*bz,qy=a4*bx+a5*by+a6*bz,qz=a8*bx+a9*by+a10*bz;
        const rl=hypot3(rx,ry,rz),ql=hypot3(qx,qy,qz),nx=gx+rx/rl-qx/ql,ny=gy+ry/rl-qy/ql,nz=gz+rz/rl-qz/ql;
        // Pinned shader multiplies normal by the same blended skin matrix.
        // Invert THAT map, not the geometric normal of preposed geometry.
        const px=i0*nx+i1*ny+i2*nz,py=i3*nx+i4*ny+i5*nz,pz=i6*nx+i7*ny+i8*nz,l=hypot3(px,py,pz);
        const x=(1-t)*sx+t*(px/l),y=(1-t)*sy+t*(py/l),z=(1-t)*sz+t*(pz/l),q=hypot3(x,y,z);
        na[v]=x/q;na[v+1]=y/q;na[v+2]=z/q;
      }
    }
    position.needsUpdate=true;normal.needsUpdate=true;const ms=performance.now()-started;totalMs+=ms;
    last={...last,updates:last.updates+1,lastMilliseconds:ms,averageMilliseconds:totalMs/(last.updates+1),minAbsSkinDeterminant:minDet,maxCorrectedMeshDisplacement:maxDisplacement,maxPrepositionDisplacement:maxPreDisplacement,maxFloat32ReplayError:maxReplayError};
  }
  return{reset,update,status:()=>({...last,disposed}),dispose(){if(disposed)return;disposed=true;mesh.geometry=source;geometry.dispose();map.clear();}};
}
