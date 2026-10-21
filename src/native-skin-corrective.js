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
  const transform=(m,x,y,z,w=1)=>[m[0]*x+m[4]*y+m[8]*z+m[12]*w,m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w];
  function reset(){if(disposed)return;for(const range of resetRanges){position.array.set(range.position,range.offset);normal.array.set(range.normal,range.offset);}}
  function update(){
    if(disposed)return;const started=performance.now();
    for(let b=0;b<palette.length;b++)palette[b].copy(mesh.bindMatrixInverse).multiply(mesh.skeleton.bones[b].matrixWorld).multiply(mesh.skeleton.boneInverses[b]).multiply(mesh.bindMatrix);
    // Row-major3x4 blended affine map, matching SkinnedMesh.applyBoneTransform.
    for(const u of needed){
      const id=first[u],o=u*12;A.fill(0,o,o+12);
      for(let lane=0;lane<4;lane++){const weight=sw.array[id*4+lane];if(!weight)continue;const m=palette[si.array[id*4+lane]].elements;
        // Same lane/row/column accumulation order as the original nested loop.
        A[o]+=weight*m[0];A[o+1]+=weight*m[4];A[o+2]+=weight*m[8];A[o+3]+=weight*m[12];
        A[o+4]+=weight*m[1];A[o+5]+=weight*m[5];A[o+6]+=weight*m[9];A[o+7]+=weight*m[13];
        A[o+8]+=weight*m[2];A[o+9]+=weight*m[6];A[o+10]+=weight*m[10];A[o+11]+=weight*m[14];
      }
      const x=sp.getX(id),y=sp.getY(id),z=sp.getZ(id);for(let r=0;r<3;r++)posed[u*3+r]=A[o+r*4]*x+A[o+r*4+1]*y+A[o+r*4+2]*z+A[o+r*4+3];
    }
    let minDet=Infinity,maxDisplacement=0,maxPreDisplacement=0,maxReplayError=0;
    for(const item of active){
      const{id,u}=item,o=u*12;let smoothedX=0,smoothedY=0,smoothedZ=0;
      for(const[bone,x,y,z,w]of item.terms){const m=palette[bone].elements;smoothedX+=m[0]*x+m[4]*y+m[8]*z+m[12]*w;smoothedY+=m[1]*x+m[5]*y+m[9]*z+m[13]*w;smoothedZ+=m[2]*x+m[6]*y+m[10]*z+m[14]*w;}
      const a=A[o],b=A[o+1],c=A[o+2],d=A[o+4],e=A[o+5],f=A[o+6],g=A[o+8],h=A[o+9],i=A[o+10];
      const det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);minDet=Math.min(minDet,Math.abs(det));if(Math.abs(det)<1e-10)throw Error('Surface corrective inverse skin is singular');
      const inv=item.inverse;inv[0]=(e*i-f*h)/det;inv[1]=(c*h-b*i)/det;inv[2]=(b*f-c*e)/det;inv[3]=(f*g-d*i)/det;inv[4]=(a*i-c*g)/det;inv[5]=(c*d-a*f)/det;inv[6]=(d*h-e*g)/det;inv[7]=(b*g-a*h)/det;inv[8]=(a*e-b*d)/det;
      const rx=rest.getX(id),ry=rest.getY(id),rz=rest.getZ(id),deltaX=(smoothedX-(a*rx+b*ry+c*rz+A[o+3]))*item.mask,deltaY=(smoothedY-(d*rx+e*ry+f*rz+A[o+7]))*item.mask,deltaZ=(smoothedZ-(g*rx+h*ry+i*rz+A[o+11]))*item.mask;
      const preX=inv[0]*deltaX+inv[1]*deltaY+inv[2]*deltaZ,preY=inv[3]*deltaX+inv[4]*deltaY+inv[5]*deltaZ,preZ=inv[6]*deltaX+inv[7]*deltaY+inv[8]*deltaZ;
      maxDisplacement=Math.max(maxDisplacement,Math.hypot(deltaX,deltaY,deltaZ));maxPreDisplacement=Math.max(maxPreDisplacement,Math.hypot(preX,preY,preZ));
      for(const v of duplicates[u]){position.array[v*3]=sp.array[v*3]+preX;position.array[v*3+1]=sp.array[v*3+1]+preY;position.array[v*3+2]=sp.array[v*3+2]+preZ;}
      // Use storedFloat32 prepositions for all subsequent geometric normals.
      const x=position.getX(id),y=position.getY(id),z=position.getZ(id);
      const actualX=A[o]*x+A[o+1]*y+A[o+2]*z+A[o+3];maxReplayError=Math.max(maxReplayError,Math.abs(actualX-(posed[u*3]+deltaX)));posed[u*3]=actualX;
      const actualY=A[o+4]*x+A[o+5]*y+A[o+6]*z+A[o+7];maxReplayError=Math.max(maxReplayError,Math.abs(actualY-(posed[u*3+1]+deltaY)));posed[u*3+1]=actualY;
      const actualZ=A[o+8]*x+A[o+9]*y+A[o+10]*z+A[o+11];maxReplayError=Math.max(maxReplayError,Math.abs(actualZ-(posed[u*3+2]+deltaZ)));posed[u*3+2]=actualZ;
    }
    geometric.fill(0);
    for(const[a,b,c]of normalFaces){const ax=posed[b*3]-posed[a*3],ay=posed[b*3+1]-posed[a*3+1],az=posed[b*3+2]-posed[a*3+2],bx=posed[c*3]-posed[a*3],by=posed[c*3+1]-posed[a*3+1],bz=posed[c*3+2]-posed[a*3+2],nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
      geometric[a*3]+=nx;geometric[a*3+1]+=ny;geometric[a*3+2]+=nz;
      geometric[b*3]+=nx;geometric[b*3+1]+=ny;geometric[b*3+2]+=nz;
      geometric[c*3]+=nx;geometric[c*3+1]+=ny;geometric[c*3+2]+=nz;
    }
    for(const item of active){const{id,u,inverse:iv}=item,o=u*12,k=u*3,len=Math.hypot(geometric[k],geometric[k+1],geometric[k+2]);if(len<1e-20)throw Error('Degenerate corrective normal neighborhood');const gx=geometric[k]/len,gy=geometric[k+1]/len,gz=geometric[k+2]/len;
      for(const v of duplicates[u]){const sx=sn.getX(v),sy=sn.getY(v),sz=sn.getZ(v),bx=bindNormal.getX(v),by=bindNormal.getY(v),bz=bindNormal.getZ(v),rx=A[o]*sx+A[o+1]*sy+A[o+2]*sz,ry=A[o+4]*sx+A[o+5]*sy+A[o+6]*sz,rz=A[o+8]*sx+A[o+9]*sy+A[o+10]*sz,qx=A[o]*bx+A[o+1]*by+A[o+2]*bz,qy=A[o+4]*bx+A[o+5]*by+A[o+6]*bz,qz=A[o+8]*bx+A[o+9]*by+A[o+10]*bz,rl=Math.hypot(rx,ry,rz),ql=Math.hypot(qx,qy,qz),nx=gx+rx/rl-qx/ql,ny=gy+ry/rl-qy/ql,nz=gz+rz/rl-qz/ql;
        // Pinned shader multiplies normal by the same blended skin matrix.
        // Invert THAT map, not the geometric normal of preposed geometry.
        const px=iv[0]*nx+iv[1]*ny+iv[2]*nz,py=iv[3]*nx+iv[4]*ny+iv[5]*nz,pz=iv[6]*nx+iv[7]*ny+iv[8]*nz,l=Math.hypot(px,py,pz),t=item.mask;
        const x=T.MathUtils.lerp(sn.getX(v),px/l,t),y=T.MathUtils.lerp(sn.getY(v),py/l,t),z=T.MathUtils.lerp(sn.getZ(v),pz/l,t),q=Math.hypot(x,y,z);normal.setXYZ(v,x/q,y/q,z/q);
      }
    }
    position.needsUpdate=true;normal.needsUpdate=true;const ms=performance.now()-started;totalMs+=ms;
    last={...last,updates:last.updates+1,lastMilliseconds:ms,averageMilliseconds:totalMs/(last.updates+1),minAbsSkinDeterminant:minDet,maxCorrectedMeshDisplacement:maxDisplacement,maxPrepositionDisplacement:maxPreDisplacement,maxFloat32ReplayError:maxReplayError};
  }
  return{reset,update,status:()=>({...last,disposed}),dispose(){if(disposed)return;disposed=true;mesh.geometry=source;geometry.dispose();map.clear();}};
}
