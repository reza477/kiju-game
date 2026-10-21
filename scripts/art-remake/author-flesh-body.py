"""Author the v4 anatomical flesh body around the preserved source rig."""
from pathlib import Path
import sys,json,struct,time,hashlib,datetime,argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo',type=Path,default=Path(__file__).resolve().parents[2])
parser.add_argument('--input',type=Path,help='Source GLB; defaults to REPO/assets/carriers/meshy/flesh.glb')
parser.add_argument('--inventory',type=Path,required=True,help='JSON emitted by inventory-carrier.mjs for this input')
parser.add_argument('--output-dir',type=Path,required=True,help='New generated outputs; never the original source directory')
parser.add_argument('--deps',type=Path,help='Optional isolated pip --target directory')
args=parser.parse_args();ROOT=args.repo.resolve();SOURCE=(args.input or ROOT/'assets/carriers/meshy/flesh.glb').resolve();HERE=args.output_dir.resolve();HERE.mkdir(parents=True,exist_ok=True)
if args.deps:sys.path.insert(0,str(args.deps.resolve()))
if (HERE/'authored-flesh-v4-prototype.glb').exists():raise FileExistsError('Choose a fresh output directory; existing output is preserved')
import numpy as np
from skimage.measure import marching_cubes
from scipy.spatial import ConvexHull
import trimesh
from PIL import Image,ImageDraw

started=time.perf_counter(); raw=SOURCE.read_bytes(); original_sha=hashlib.sha256(raw).hexdigest();jl=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jl]);binary=raw[28+jl:]
dtypes={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'};widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def accessor(i):
 a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];dt=np.dtype(dtypes[a['componentType']]);w=widths[a['type']]
 return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*dt.itemsize),dt.itemsize)).copy()
primitive=doc['meshes'][0]['primitives'][0];attrs=primitive['attributes'];old_v=accessor(attrs['POSITION']);old_n=accessor(attrs['NORMAL']);old_uv=accessor(attrs['TEXCOORD_0']);old_j=accessor(attrs['JOINTS_0']);old_w=accessor(attrs['WEIGHTS_0']);old_f=accessor(primitive['indices']).reshape(-1,3)
inventory=json.loads(args.inventory.read_text(encoding='utf-8-sig'));assert inventory['source']['sha256']==original_sha,'Inventory source hash differs';bone_list=inventory['meshes'][0]['bones'];bones={b['name']:{'index':b['index'],'point':np.array(b['bindWorldPosition'],dtype=np.float32)} for b in bone_list}
def b(name):return bones[f'Bone_{name:03d}']
def bp(name):return b(name)['point']
def skin(*pairs):return{b(name)['index']:weight for name,weight in pairs}
parts=[];detail=[];skin_color=np.array([.36,.245,.145],dtype=np.float32);horn_color=np.array([.72,.60,.40],dtype=np.float32)
def ellipsoid(name,center,radius,weights,color=None,rotation=None,blend=.065):
 parts.append({'name':name,'kind':'ellipsoid','center':np.array(center,dtype=np.float32),'radius':np.array(radius,dtype=np.float32),'weights':weights,'color':skin_color.copy() if color is None else np.array(color,dtype=np.float32),'rotation':np.eye(3,dtype=np.float32) if rotation is None else np.array(rotation,dtype=np.float32),'blend':blend})
def segment(name,a,c,r0,r1,weights_a,weights_b,color=None,blend=.045):
 parts.append({'name':name,'kind':'segment','a':np.array(a,dtype=np.float32),'c':np.array(c,dtype=np.float32),'r0':float(r0),'r1':float(r1),'weights_a':weights_a,'weights_b':weights_b,'color':skin_color.copy() if color is None else np.array(color,dtype=np.float32),'blend':blend})

# Broad torso follows the actual bent bind pose, with distinct mass centres.
ellipsoid('ribcage',[.045,1.055,-.015],[.34,.335,.57],skin((9,.65),(6,.35)))
ellipsoid('belly',[.055,.845,-.075],[.285,.235,.455],skin((9,.8),(1,.2)),[.47,.35,.225])
ellipsoid('pelvis',[.165,.955,-.36],[.305,.255,.285],skin((1,.65),(9,.35)))
ellipsoid('shoulder hump',[-.025,1.255,.285],[.305,.285,.415],skin((6,.8),(9,.2)),[.30,.23,.145])
ellipsoid('neck',[-.05,1.24,.615],[.245,.26,.30],skin((6,.35),(31,.4),(29,.25)),[.34,.25,.155])
for name,root in [('left haunch',5),('right haunch',3)]:
 p=bp(root).copy();p[1]-=.035;ellipsoid(name,p,[.235,.29,.27],skin((root,.8),(1,.2)),[.34,.23,.14])
for name,root in [('left deltoid',35),('right deltoid',40)]:
 p=bp(root).copy();p[1]+=.08;p[0]+=-.025 if root==35 else .025;ellipsoid(name,p,[.215,.285,.235],skin((root,.82),(6,.18)),[.315,.225,.14])

# Tapered segments retain the inspected limb bends. New surfaces stop above the
# original contacts, and new geometry never takes >=.4 paw-joint weight.
chains=[('front left',[35,34,33],[.145,.10,.065]),('front right',[40,39,38],[.145,.10,.065]),('rear left',[5,4,28,27,26],[.17,.13,.10,.075,.06]),('rear right',[3,2,22,21,20],[.17,.13,.10,.075,.06])]
paw_names={33,38,26,20}
for label,chain,radii in chains:
 for k,(a,c) in enumerate(zip(chain,chain[1:])):
  end=skin((a,.68),(c,.32)) if c in paw_names else skin((c,1))
  segment(f'{label} segment {a}-{c}',bp(a),bp(c),radii[k],radii[k+1],skin((a,1)),end)
 # A deliberate kneecap gives a readable articulation instead of a tube.
 p=bp(chain[1]);ellipsoid(label+' joint',p,[radii[1]*1.06,radii[1]*1.12,radii[1]],skin((chain[1],1)),[.29,.21,.13],blend=.025)

# Skull, cheek planes, lower jaw, muzzle and supraorbital brows.
head=skin((29,1));ellipsoid('skull',[-.064,1.255,.875],[.19,.205,.28],head,[.37,.265,.17])
# Restore the upper cranial mass crossed by the unchanged combat rays. This
# follows the original nape joint rather than moving the attack or its target.
ellipsoid('upper cranial crest',[-.064,1.42,.66],[.20,.20,.20],skin((53,.85),(29,.15)),[.33,.235,.145],blend=.065)
ellipsoid('nasal bridge',[-.055,1.155,1.055],[.15,.15,.215],head,[.40,.29,.18])
ellipsoid('muzzle',[-.055,1.067,1.106],[.163,.108,.17],head,[.39,.275,.17],blend=.028)
parts[-1]['exponent']=3.1
ellipsoid('lower jaw',[-.055,.982,1.095],[.15,.075,.16],head,[.385,.265,.17],blend=.035)
for side in [-1,1]:
 ellipsoid(f'cheek {side}',[-.064+side*.145,1.145,.925],[.10,.115,.145],head,[.29,.195,.115],blend=.035)
 ellipsoid(f'brow {side}',[-.064+side*.155,1.286,1.018],[.09,.073,.13],head,[.30,.215,.13],blend=.025)
 angle=side*.42;rot=[[np.cos(angle),-np.sin(angle),0],[np.sin(angle),np.cos(angle),0],[0,0,1]]
 ellipsoid(f'ear {side}',[-.064+side*.245,1.365,.755],[.14,.055,.085],head,[.32,.22,.145],rot,blend=.02)
 horn_points=[[-.064+side*.15,1.40,.75],[-.064+side*.235,1.48,.78],[-.064+side*.30,1.555,.88],[-.064+side*.315,1.59,1.00]]
 for k in range(3):segment(f'horn {side} {k}',horn_points[k],horn_points[k+1],[.064,.05,.029][k],[.05,.029,.003][k],head,head,horn_color,blend=.012)

tail=[16,15,14,13,12,11,10];tail_radii=[.125,.11,.085,.066,.05,.036,.018]
for k,(a,c) in enumerate(zip(tail,tail[1:])):segment(f'tail {a}-{c}',bp(a),bp(c),tail_radii[k],tail_radii[k+1],skin((a,1)),skin((c,1)),[.30,.22,.135],blend=.025)

def field_part(p,part,with_t=False):
 if part['kind']=='ellipsoid':
  q=(p-part['center'])@part['rotation'];q=q/part['radius'];power=part.get('exponent',2);d=((np.abs(q)**power).sum(-1)**(1/power)-1)*part['radius'].min();return(d,np.zeros(d.shape,dtype=np.float32)) if with_t else d
 axis=part['c']-part['a'];length2=np.dot(axis,axis);q=p-part['a'];t=np.clip((q*axis).sum(-1)/length2,0,1);delta=q-t[...,None]*axis;r=part['r0']+(part['r1']-part['r0'])*t;d=np.sqrt((delta*delta).sum(-1))-r;return(d,t) if with_t else d
def smooth_union(a,c,k):
 h=np.clip((k-np.abs(a-c))/k,0,1);return np.minimum(a,c)-h*h*k*.25

pitch=.012;lo=np.array([-.80,-.035,-1.34],dtype=np.float32);hi=np.array([.83,1.735,1.335],dtype=np.float32);axes=[np.arange(lo[i],hi[i]+pitch,pitch,dtype=np.float32) for i in range(3)];shape=tuple(len(a) for a in axes);grid=np.stack(np.meshgrid(*axes,indexing='ij'),axis=-1);field=np.full(shape,10,dtype=np.float32)
for part in parts:field=smooth_union(field,field_part(grid,part),part['blend'])
# A fine mouth crease separates lip and lower jaw but keeps the cheek connected.
mouth={'kind':'ellipsoid','center':np.array([-.055,1.017,1.145],dtype=np.float32),'radius':np.array([.155,.012,.135],dtype=np.float32),'rotation':np.eye(3,dtype=np.float32)}
field=np.maximum(field,-field_part(grid,mouth));del grid
v,f,n,_=marching_cubes(field,0,spacing=(pitch,pitch,pitch),allow_degenerate=False);v+=lo;mesh=trimesh.Trimesh(vertices=v,faces=f,process=False);mesh.fix_normals();v=np.array(mesh.vertices,dtype=np.float32);f=np.array(mesh.faces,dtype=np.uint32);n=np.array(mesh.vertex_normals,dtype=np.float32)

# Explicit component influence fields. No nearest shredded triangle transfer.
influence=np.zeros((len(v),54),dtype=np.float32);colors=np.zeros((len(v),3),dtype=np.float32);total=np.zeros(len(v),dtype=np.float32)
for part in parts:
 d,t=field_part(v,part,True);w=np.exp(np.clip(-np.abs(d)/.027,-60,0));total+=w;colors+=w[:,None]*part['color']
 if part['kind']=='ellipsoid':
  for joint,weight in part['weights'].items():influence[:,joint]+=w*weight
 else:
  for joint,weight in part['weights_a'].items():influence[:,joint]+=w*(1-t)*weight
  for joint,weight in part['weights_b'].items():influence[:,joint]+=w*t*weight
colors/=np.maximum(total[:,None],1e-12);influence/=np.maximum(influence.sum(1)[:,None],1e-12)
# Broad paint follows anatomy: warmer belly and darker dorsal shoulders, with
# gentle large-scale variation. It deliberately contains no high-frequency noise.
variation=.025*np.sin(v[:,2]*7+v[:,0]*3)*np.sin(v[:,1]*5);colors=np.clip(colors+variation[:,None]*np.array([1,.8,.5]),0,1)
j=np.argsort(influence,axis=1)[:,-4:][:,::-1];w=np.take_along_axis(influence,j,axis=1);retained=w.sum(1);w/=np.maximum(retained[:,None],1e-12);j=j.astype(np.uint8);w=w.astype(np.float32)

def small_ellipsoid(center,radii,color):
 global v,f,n,j,w,colors
 obj=trimesh.creation.uv_sphere(radius=1,count=[16,24]);obj.apply_scale(radii);obj.apply_translation(center);start=len(v);v=np.concatenate([v,np.array(obj.vertices,dtype=np.float32)]);f=np.concatenate([f,np.array(obj.faces,dtype=np.uint32)+start]);n=np.concatenate([n,np.array(obj.vertex_normals,dtype=np.float32)]);j=np.concatenate([j,np.tile([b(29)['index'],0,0,0],(len(obj.vertices),1)).astype(np.uint8)]);w=np.concatenate([w,np.tile([1,0,0,0],(len(obj.vertices),1)).astype(np.float32)]);colors=np.concatenate([colors,np.tile(color,(len(obj.vertices),1)).astype(np.float32)])
for side in [-1,1]:
 small_ellipsoid([-.064+side*.210,1.230,1.075],[.027,.029,.03],[.022,.012,.008])
 small_ellipsoid([-.064+side*.232,1.230,1.082],[.008,.012,.014],[.55,.245,.035])
 small_ellipsoid([-.064+side*.240,1.230,1.085],[.004,.009,.006],[.005,.003,.002])
 small_ellipsoid([-.055+side*.082,1.102,1.274],[.025,.019,.013],[.035,.022,.013])

# Preserve all source vertices byte-for-byte as the indexed contact pool. Only
# clean convex paw hull triangles are visible. Keeping source vertex IDs retains exact
# sole sample/strike indices; no live gameplay state or rig data changes here.
paw_ids=np.array([8,9,16,17,40,41,45,46]);paw_faces=[];paw_hulls={}
for paw_name,paw_joints in {'rearRight':[8,9],'rearLeft':[16,17],'frontLeft':[40,41],'frontRight':[45,46]}.items():
 ids=np.flatnonzero(np.where(np.isin(old_j,paw_joints),old_w,0).sum(1)>=.4);points=old_v[ids];hull=ConvexHull(points);local=hull.simplices.copy();cross=np.cross(points[local[:,1]]-points[local[:,0]],points[local[:,2]]-points[local[:,0]]);flip=(cross*hull.equations[:,:3]).sum(1)<0;local[flip]=local[flip][:,[0,2,1]];faces=ids[local];paw_faces.append(faces);paw_hulls[paw_name]={'jointIndices':paw_joints,'vertexIndices':np.unique(faces).tolist(),'triangles':len(faces)}
patch_faces=np.concatenate(paw_faces).astype(np.uint32);patch_vertices=np.unique(patch_faces);paw_normals=np.zeros_like(old_n)
for faces in paw_faces:
 cross=np.cross(old_v[faces[:,1]]-old_v[faces[:,0]],old_v[faces[:,2]]-old_v[faces[:,0]])
 for corner in range(3):np.add.at(paw_normals,faces[:,corner],cross)
paw_normals/=np.maximum(np.linalg.norm(paw_normals,axis=1)[:,None],1e-12);old_n[patch_vertices]=paw_normals[patch_vertices]
offset=len(old_v);new_uv=np.stack([v[:,0]/1.7+.5,v[:,2]/2.7+.5],axis=1).astype(np.float32)
all_v=np.concatenate([old_v,v]);all_n=np.concatenate([old_n,n]);all_uv=np.concatenate([old_uv,new_uv]);all_j=np.concatenate([old_j,j]);all_w=np.concatenate([old_w,w]);all_c=np.concatenate([np.tile([.16,.095,.045],(len(old_v),1)),colors]).astype(np.float32);all_f=np.concatenate([patch_faces,f+offset]).astype(np.uint32)
visible_ids=np.unique(all_f);visible_mesh=trimesh.Trimesh(vertices=all_v,faces=all_f,process=False)

def preview(name,eye):
 eye=np.array(eye,dtype=float);eye/=np.linalg.norm(eye);right=np.cross([0,1,0],eye);right/=np.linalg.norm(right);up=np.cross(eye,right);p=(all_v-[.02,.84,-.01])@np.stack([right,up,eye],axis=1);used=p[visible_ids];scale=min(1180/np.ptp(used[:,0]),850/np.ptp(used[:,1]));xy=p[:,:2]*[scale,-scale]+[640,490];normals=all_n[all_f].mean(1);normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12);light=np.array([-.5,.8,1]);light/=np.linalg.norm(light);shade=.32+.68*np.maximum(0,normals@light);color=np.clip((all_c[all_f].mean(1)*shade[:,None])**(1/2.2)*255,0,255).astype(np.uint8);image=Image.new('RGB',(1280,960),(227,224,213));draw=ImageDraw.Draw(image)
 for i in np.argsort(p[all_f,2].mean(1)):
  if normals[i]@eye<-.05:continue
  draw.polygon([tuple(q) for q in xy[all_f[i]]],fill=tuple(color[i]))
 draw.text((20,20),'NEW anatomical SDF prototype / preserved source rig + paw patches / CPU preview only',fill=(30,30,30));image.save(HERE/(name+'.png'))
preview('authored-flesh-v4-three-quarter',[.85,.27,.75]);preview('authored-flesh-v4-side',[1,.16,.05]);preview('authored-flesh-v4-rear',[-.75,.24,-.85])

# Save an isolated valid glTF clone with one primitive and the exact source rig.
# Old binary remains byte-identical; new attributes are appended as new views.
bin_chunks=bytearray(binary)
def append_attribute(array,component_type,type_name):
 while len(bin_chunks)%4:bin_chunks.append(0)
 data=np.ascontiguousarray(array).tobytes();view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(bin_chunks),'byteLength':len(data)});bin_chunks.extend(data);access=len(doc['accessors']);entry={'bufferView':view,'componentType':component_type,'count':len(array),'type':type_name}
 if type_name=='VEC3' and component_type==5126:entry.update(min=np.min(array,axis=0).astype(float).tolist(),max=np.max(array,axis=0).astype(float).tolist())
 doc['accessors'].append(entry);return access
new_attrs={'POSITION':append_attribute(all_v.astype('<f4'),5126,'VEC3'),'NORMAL':append_attribute(all_n.astype('<f4'),5126,'VEC3'),'TEXCOORD_0':append_attribute(all_uv.astype('<f4'),5126,'VEC2'),'JOINTS_0':append_attribute(all_j.astype('u1'),5121,'VEC4'),'WEIGHTS_0':append_attribute(all_w.astype('<f4'),5126,'VEC4'),'COLOR_0':append_attribute(all_c.astype('<f4'),5126,'VEC3')};new_indices=append_attribute(all_f.reshape(-1,1).astype('<u4'),5125,'SCALAR');doc['materials']=[{'name':'Warm painted organic hide','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':.82},'doubleSided':False}];doc['meshes'][0]['primitives']=[{'attributes':new_attrs,'indices':new_indices,'material':0,'mode':4}];doc['meshes'][0]['extras']={'authoredFlesh':True,'sourceContactVertices':len(old_v),'sourceContactSha256':original_sha};doc['buffers'][0]['byteLength']=len(bin_chunks);encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);bin_chunks.extend(b'\0'*((-len(bin_chunks))%4));glb=struct.pack('<III',0x46546C67,2,28+len(encoded)+len(bin_chunks))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+struct.pack('<II',len(bin_chunks),0x004E4942)+bin_chunks;(HERE/'authored-flesh-v4-prototype.glb').write_bytes(glb)
visible_mesh.export(HERE/'authored-flesh-v4-prototype.ply')
report={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seconds':time.perf_counter()-started,'sourceSha256':original_sha,'prototypeSha256':hashlib.sha256(glb).hexdigest(),'sourceRigUnchanged':True,'sourceContactPoolCount':len(old_v),'preservedPawHulls':paw_hulls,'sourceVisiblePawTriangles':len(patch_faces),'sourceVisiblePawVertices':len(patch_vertices),'sdfVertices':len(v),'totalVertices':len(all_v),'visibleTriangles':len(all_f),'visibleBounds':[all_v[visible_ids].min(0).tolist(),all_v[visible_ids].max(0).tolist()],'sourceBounds':[old_v.min(0).tolist(),old_v.max(0).tolist()],'maximumDiscardedNewInfluenceMass':float((1-retained).max()),'newWeightSumMaximumError':float(np.abs(w.sum(1)-1).max()),'newPawWeightMax':float(np.where(np.isin(j,paw_ids),w,0).sum(1).max()),'finite':bool(np.isfinite(all_v).all() and np.isfinite(all_n).all() and np.isfinite(all_w).all()),'sourceAssetUnchanged':hashlib.sha256(SOURCE.read_bytes()).hexdigest()==original_sha,'limitations':['Static CPU prototype only, no real browser/runtime/art review.','Original vertices remain as an unrendered contact pool; only clean convex paw hulls made from exact original vertices are visible.','New topology and color are authored; no original UV atlas transfer to new body.','Runtime integration must skip the old shredded-mesh smoothing step for this authored body.','Skin deformation, contact sample stability and strike anchors require actual rig tests before use.'],'forms':[p['name'] for p in parts]};(HERE/'authored-flesh-v4-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
