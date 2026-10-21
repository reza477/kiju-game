"""Coherent paw material charts using only the unchanged original foot atlas."""
from pathlib import Path
import argparse,json,struct,hashlib,datetime,sys,io
p=argparse.ArgumentParser(description=__doc__)
for key in ['input','source','neutral','output','report']:p.add_argument('--'+key,type=Path,required=True)
p.add_argument('--deps',type=Path);a=p.parse_args()
if a.deps:sys.path.insert(0,str(a.deps.resolve()))
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import binary_erosion,distance_transform_cdt
for path in [a.output,a.report]:
 if path.exists():raise FileExistsError(path)
 path.parent.mkdir(parents=True,exist_ok=True)
start=datetime.datetime.now(datetime.timezone.utc).isoformat();sha=lambda b:hashlib.sha256(b).hexdigest()
def load(path):
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];return raw,json.loads(raw[20:20+n]),raw[28+n:]
def acc(d,b,i):
 x=d['accessors'][i];v=d['bufferViews'][x['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[x['type']];dt=np.dtype({5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[x['componentType']]);return np.ndarray((x['count'],w),dt,b,offset=v.get('byteOffset',0)+x.get('byteOffset',0),strides=(v.get('byteStride',w*dt.itemsize),dt.itemsize))
raw,d,b=load(a.input);source_raw,sd,sb=load(a.source);neutral_raw,nd,nb=load(a.neutral)
assert sha(raw)=='ea3f0dff1a2cef1d6061a3a06492eb157892897d953315ed658c72da477494ea'
pr=d['meshes'][0]['primitives'][0];sp=sd['meshes'][0]['primitives'][0];np0=nd['meshes'][0]['primitives'][0]
source_v=acc(sd,sb,sp['attributes']['POSITION']);source_uv=acc(sd,sb,sp['attributes']['TEXCOORD_0']);source_f=acc(sd,sb,sp['indices']).reshape(-1,3)
source_n=np.cross(source_v[source_f[:,1]]-source_v[source_f[:,0]],source_v[source_f[:,2]]-source_v[source_f[:,0]]);source_n/=np.maximum(np.linalg.norm(source_n,axis=1)[:,None],1e-12)
source_axis=np.argmax(abs(source_n),axis=1);source_sign=np.take_along_axis(source_n,source_axis[:,None],axis=1).ravel()>0
posed=acc(nd,nb,np0['attributes']['POSITION']).astype(float);uv=acc(d,b,pr['attributes']['TEXCOORD_0']).copy();original_uv=uv.copy();res=1024
charts=[];paw_records=[]
for key,record in d['meshes'][0]['extras']['visibleContactHulls'].items():
 ids=np.array(record['visibleVertexIds']);face_ids=ids.reshape(-1,3);points=posed[ids];low=points.min(0);high=points.max(0)
 normal=np.cross(posed[face_ids[:,1]]-posed[face_ids[:,0]],posed[face_ids[:,2]]-posed[face_ids[:,0]]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-15)
 axis=np.argmax(abs(normal),axis=1);sign=np.take_along_axis(normal,axis[:,None],axis=1).ravel()>0
 front=key.startswith('front');side=-1 if key.endswith('Left')else 1
 foot=(source_v[:,1]<-.32)&(source_v[:,0]*side>.13)&((source_v[:,2]>0)==front);foot_faces=foot[source_f].all(1)
 source_ids=np.array(record['sourceVertexIds']).reshape(-1,3);chart_assignments=[]
 for direction in range(3):
  for positive in [False,True]:
   selected=np.flatnonzero((axis==direction)&(sign==positive))
   if not len(selected):continue
   matching=np.flatnonzero(foot_faces&(source_n[:,direction]*(1 if positive else -1)>.15))
   if not len(matching):raise RuntimeError('Missing source foot surface: '+key)
   mask_image=Image.new('1',(res,res),0);draw=ImageDraw.Draw(mask_image)
   for f in matching:draw.polygon([tuple(q*(res-1))for q in source_uv[source_f[f]]],fill=1)
   mask=binary_erosion(np.array(mask_image,dtype=bool),iterations=2,border_value=0)
   # Include rounded faces with a positive directional component; the strict
   # dominant-axis source mask discarded most dorsal skin and selected tiny
   # texture patches. Target chart boundaries remain fixed and deterministic.
   # A single rectangle is wholly contained in actual matching foot texels.
   # Search three mild aspect ratios; erosion leaves an 8px atlas gutter.
   best=None
   for aspect in [.5,1.,2.]:
    scaled=np.array(Image.fromarray(mask).resize((int(res/aspect),res),Image.Resampling.NEAREST))
    distance=distance_transform_cdt(scaled,metric='chessboard');y,x=np.unravel_index(distance.argmax(),distance.shape);radius=int(distance[y,x])-1
    if radius<2:continue
    x0=int(np.ceil((x-radius)*aspect));x1=int(np.floor((x+radius)*aspect));y0=y-radius;y1=y+radius
    if x1<=x0 or not mask[y0:y1+1,x0:x1+1].all():continue
    area=(x1-x0)*(y1-y0)
    if best is None or area>best[0]:best=(area,x0,y0,x1,y1)
   if best is None:raise RuntimeError('No padded coherent source patch: '+key+str(direction)+str(positive))
   _,x0,y0,x1,y1=best;uv_low=np.array([x0+.5,y0+.5])/res;uv_high=np.array([x1-.5,y1-.5])/res
   assert np.min((uv_high-uv_low)*2048)>=32, 'Insufficient original material detail: '+key
   # Six box directions are top, sole and four side charts. Their boundaries
   # follow dominant surface direction. Every shared position in one chart
   # uses the same analytic UV, replacing independent triangle assignments.
   horizontal,vertical={0:(2,1),1:(0,2),2:(0,1)}[direction]
   chart_vertices=face_ids[selected].reshape(-1);q=(posed[chart_vertices]-low)/np.maximum(high-low,1e-12)
   s=q[:,horizontal];t=q[:,vertical]
   if (direction==0 and positive)or(direction==2 and not positive):s=1-s
   if direction==1 and not positive:t=1-t
   mapped=uv_low+np.stack([s,t],axis=1)*(uv_high-uv_low);uv[chart_vertices]=mapped.astype('<f4')
   label=('top'if positive else'sole')if direction==1 else('side_'+str(direction)+('positive'if positive else'negative'))
   charts.append({'paw':key,'chart':label,'sourceFaceCount':len(matching),'hullFaceCount':len(selected),'uvBounds':[uv_low.tolist(),uv_high.tolist()],'sourceAtlasPatchPixels2048':((uv_high-uv_low)*2048).tolist(),'sourcePatchCompletelyInsideFootMask':True})
   for f in selected:chart_assignments.append((int(f),label))
 record['uvStrategy']='Coherent top/sole/side charts sample padded rectangles entirely within matching original Meshy foot-atlas regions; no image pixels changed.'
 paw_records.append({'paw':key,'faceCharts':[label for _,label in sorted(chart_assignments)]})
appended=np.concatenate([r['visibleVertexIds']for r in d['meshes'][0]['extras']['visibleContactHulls'].values()]);changed=np.flatnonzero(np.any(uv!=original_uv,axis=1));assert np.isin(changed,appended).all()
binary=bytearray(b);access=d['accessors'][pr['attributes']['TEXCOORD_0']];view=d['bufferViews'][access['bufferView']];offset=view.get('byteOffset',0)+access.get('byteOffset',0);stride=view.get('byteStride',8)
for i in changed:struct.pack_into('<ff',binary,offset+int(i)*stride,*uv[i])
d['meshes'][0]['extras']['pawUVProjection']={'version':1,'method':'Original foot material in coherent box-direction charts','sourceSha256':sha(source_raw),'neutralGeometrySha256':sha(neutral_raw),'charts':charts,'faceCharts':paw_records,'positionsNormalsWeightsIndicesAndImageBytesUnchanged':True}
encoded=json.dumps(d,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary.extend(b'\0'*((-len(binary))%4));output=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary;a.output.write_bytes(output)
report={'startedAt':start,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':sys.argv,'inputSha256':sha(raw),'sourceSha256':sha(source_raw),'neutralSha256':sha(neutral_raw),'generatorSha256':sha(Path(__file__).read_bytes()),'output':str(a.output),'outputSha256':sha(output),'bytes':len(output),'changedAppendedUVVertices':len(changed),'normalsChanged':0,'charts':charts,'limitations':['Paw silhouette and coarse geometry remain unchanged.','UVs coherently reuse original foot material patches; they do not reconstruct exact original toe illustration correspondence.','Native PBR comparison and full preservation checks are required before promotion.']};a.report.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
