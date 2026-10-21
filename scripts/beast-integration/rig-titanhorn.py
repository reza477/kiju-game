"""Fit the real Meshy beast to the preserved flesh rig; author one textured GLB."""
from pathlib import Path
import argparse,sys,json,struct,hashlib,datetime,copy,time
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--mesh',type=Path,required=True)
parser.add_argument('--rig',type=Path,required=True)
parser.add_argument('--inventory',type=Path,help='Optional historical inventory consistency check; the original GLB is authoritative')
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--report',type=Path,required=True)
parser.add_argument('--deps',type=Path)
parser.add_argument('--pose',type=Path,required=True,help='Actual neutral controller matrices from export-authoring-pose.mjs')
parser.add_argument('--display-rig',type=Path,required=True,help='Measured two-link display chains; original contact rig remains exact')
parser.add_argument('--elbow-fairing',action='store_true',help='Round only the visible forelimb elbow transition below the fixed saddle envelope')
args=parser.parse_args()
if args.deps:sys.path.insert(0,str(args.deps.resolve()))
import numpy as np
from scipy.spatial import ConvexHull,cKDTree
from scipy.interpolate import PchipInterpolator
from scipy.sparse import csr_matrix,diags
started=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.perf_counter()
for p in [args.output,args.report]:
 if p.exists():raise FileExistsError('Choose a new output: '+str(p))
 p.parent.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def load(p):
 raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];return raw,json.loads(raw[20:20+n]),raw[28+n:]
def accessor(d,b,i):
 a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];dt=np.dtype({5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]);w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 return np.ndarray((a['count'],w),dtype=dt,buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*dt.itemsize),dt.itemsize)).copy()
mesh_raw,md,mb=load(args.mesh);rig_raw,rd,rb=load(args.rig)
mp=md['meshes'][0]['primitives'][0];rp=rd['meshes'][0]['primitives'][0]
source=accessor(md,mb,mp['attributes']['POSITION']).astype(float);uv=accessor(md,mb,mp['attributes']['TEXCOORD_0']);faces=accessor(md,mb,mp['indices']).reshape(-1,3)
old={k:accessor(rd,rb,i) for k,i in rp['attributes'].items()};old_v=old['POSITION'];old_j=old['JOINTS_0'];old_w=old['WEIGHTS_0']
if args.inventory:
 inventory=json.loads(args.inventory.read_text(encoding='utf-8-sig'));assert inventory['source']['sha256']==sha(rig_raw)
bones={int(rd['nodes'][node]['name'][5:]):{'index':i} for i,node in enumerate(rd['skins'][0]['joints'])}
assert sorted(bones)==list(range(54))
bi=lambda name:bones[name]['index']
smooth=lambda a,b,x:np.clip((x-a)/(b-a),0,1)**2*(3-2*np.clip((x-a)/(b-a),0,1))
pose=json.loads(args.pose.read_text(encoding='utf-8-sig'))
pose_bones={int(b['name'][5:]):b for b in pose['joints']};assert len(pose_bones)==54
bp=lambda name:np.array(pose_bones[name]['position'])
pose_matrices=np.array([b['skinMatrix'] for b in pose['joints']]).reshape(-1,4,4).transpose(0,2,1)
display_rig=json.loads(args.display_rig.read_text(encoding='utf-8-sig'))
assert display_rig['version']==1 and display_rig['originalJointCount']==54
assert len(display_rig['chains'])==4
display_names=[name for chain in display_rig['chains'] for name in chain['joints']]
assert len(display_names)==12 and len(set(display_names))==12
display_indices={name:54+i for i,name in enumerate(display_names)}
joint_count=54+len(display_names)
pose_matrices=np.concatenate([pose_matrices,np.repeat(np.eye(4)[None],len(display_names),axis=0)])
display_chains={chain['key']:chain for chain in display_rig['chains']}
for chain in display_rig['chains']:
 root=bp(int(chain['sourceRoot'][5:]))+chain['rootOffset']
 end=bp(int(chain['sourceEnd'][5:]))+chain['endOffset']
 upper,lower=chain['lengths'];delta=end-root;distance=np.linalg.norm(delta);direction=delta/distance
 assert upper>0 and lower>0 and abs(upper-lower)<distance<upper+lower
 pole=np.array(chain['pole'],dtype=float);pole-=np.dot(pole,direction)*direction;pole/=np.linalg.norm(pole)
 along=(upper*upper-lower*lower+distance*distance)/(2*distance)
 hinge=root+direction*along+pole*np.sqrt(max(0,upper*upper-along*along))
 chain['neutralPositions']={'root':root.tolist(),'hinge':hinge.tolist(),'end':end.tolist()}
 chain['neutralWorldQuaternions']=[[0,0,0,1]]*3
def mixed_matrices(j,w):return (pose_matrices[j]*w[:,:,None,None]).sum(1)
def transform_points(v,m):return np.einsum('nij,nj->ni',m[:,:3,:3],v)+m[:,:3,3]
posed_old_v=transform_points(old_v,mixed_matrices(old_j,old_w))
# Preserve the supplied silhouette. This first fit uses the existing body-fit
# units, then smoothly fits the independently posed limbs to the exact joints.
# The stock creature has a longer pelvis-to-shoulder span than the carried
# city's rig. Fit that span continuously before moving individual limbs,
# keeping the source head/horns and the tail endpoint exactly where they were.
back_z=PchipInterpolator([-.953,-.75,-.55,-.45,-.3,-.1,.1,.34],[ -1.28655,-.94,-.53,-.40,-.22,-.01,.18,.459])
# Seat the rear dorsal armour under the unchanged two crown decks. This only
# compresses the upper back behind the shoulder, not the belly or hero skull.
def body_fit(points):
 result=points*np.array([1.43,1.535,1.35])+[.035,.816,0]
 result[:,2]=np.where(points[:,2]<.34,back_z(points[:,2]),result[:,2])
 rear=1-smooth(-.32,.10,result[:,2]);result[:,0]-=points[:,0]*.22*rear
 result[:,0]-=.17*result[:,2]
 rear_seat=1-smooth(-.16,.20,result[:,2]);result[:,1]-=np.maximum(result[:,1]-.84,0)*.25*rear_seat
 return result
fitted=body_fit(source)
body=fitted.copy();weights=np.zeros((len(source),joint_count),dtype=float)
spine=[(1,-.42),(9,-.23),(8,.036),(7,.275),(6,.325),(31,.55),(30,.78),(29,.92)]
for i,p in enumerate(body):
 z=p[2]
 if z<=spine[0][1]:weights[i,bi(spine[0][0])]=1
 elif z>=spine[-1][1]:weights[i,bi(spine[-1][0])]=1
 else:
  for (a,za),(b,zb) in zip(spine,spine[1:]):
   if za<=z<=zb:
    t=float(smooth(za,zb,z));weights[i,bi(a)]=1-t;weights[i,bi(b)]=t;break
# The horns, muzzle and facial armour move as one coherent skull.
head=smooth(.39,.62,source[:,2]);weights*=1-head[:,None];weights[:,bi(29)]+=head
# The rear-right shin also lies behind z=-.58. Only the elevated central
# appendage is tail; assigning tail bones by z alone shreds the rear thigh.
tail=smooth(-.58,-.75,source[:,2])*smooth(-.08,.035,source[:,1])*(1-smooth(.12,.20,np.abs(source[:,0]-.045)));weights*=1-tail[:,None]
tail_z=np.array([-.55,-.65,-.76,-.85,-.91,-.96,-1.00]);tail_names=[16,15,14,13,12,11,10]
for i,t in enumerate(tail):
 if t<=0:continue
 z=source[i,2];j=min(len(tail_names)-2,max(0,int(np.searchsorted(-tail_z,-z)-1)));u=float(smooth(tail_z[j],tail_z[j+1],z));weights[i,bi(tail_names[j])]+=t*(1-u);weights[i,bi(tail_names[j+1])]+=t*u
chains={
 'frontLeft':{'names':[35,34,33,32],'points':[[-.17,.15,.34],[-.245,-.12,.42],[-.255,-.35,.53],[-.27,-.455,.59]],'paw':[40,41],'side':-1,'front':True},
 'frontRight':{'names':[40,39,38,37],'points':[[.17,.15,.34],[.25,-.12,.20],[.26,-.35,.29],[.26,-.455,.35]],'paw':[45,46],'side':1,'front':True},
 'rearLeft':{'names':[5,4,28,27,26,25],'points':[[-.21,.08,-.47],[-.23,-.12,-.46],[-.235,-.25,-.46],[-.235,-.34,-.46],[-.255,-.42,-.45],[-.255,-.465,-.43]],'paw':[16,17],'side':-1,'front':False},
 'rearRight':{'names':[3,2,22,21,20,19],'points':[[.23,.08,-.50],[.245,-.12,-.53],[.245,-.25,-.59],[.265,-.34,-.615],[.28,-.42,-.60],[.28,-.465,-.59]],'paw':[8,9],'side':1,'front':False}}
for name,c in chains.items():
 points=np.array(c['points']);target=np.array([bp(n) for n in c['names']]);distances=[]
 for k,(a,b) in enumerate(zip(points,points[1:])):
  delta=b-a;t=np.clip((source-a)@delta/np.dot(delta,delta),0,1);projected=a+t[:,None]*delta;d2=((source-projected)**2).sum(1);distances.append(d2)
 distances=np.stack(distances,axis=1);dist=np.sqrt(distances.min(1))
 # A monotone height-section map keeps full calf/thigh cross sections through
 # the rig's tight hock bend. Blending several independently rotated short
 # segments collapsed the original muscles into overlapping sharp sheets.
 source_y=np.clip(source[:,1],points[-1,1],points[0,1])
 source_curve=PchipInterpolator(points[::-1,1],points[::-1],axis=0)
 source_center=source_curve(source_y)
 # The authored display hinge sits inside the muscle. Height-monotone sections
 # preserve full cross sections, with small source-profile offsets retained
 # between shoulder/hip, hinge, paw and the unchanged original toe endpoint.
 t=(points[0,1]-source_y)/(points[0,1]-points[-1,1])
 display=display_chains[name];positions=display['neutralPositions']
 anchor_y=np.array([points[0,1],-.12,-.35,points[-1,1]])
 source_anchors=PchipInterpolator(points[::-1,1],points[::-1],axis=0)(anchor_y)
 reference_curve=PchipInterpolator(anchor_y[::-1],source_anchors[::-1],axis=0)
 source_reference=reference_curve(source_y)
 target_anchors=np.array([positions['root'],positions['hinge'],positions['end'],target[-1]])
 assert (np.diff(target_anchors[:,1])<0).all(), 'Non-monotone neutral anatomy: '+name
 target_curve=PchipInterpolator(anchor_y[::-1],target_anchors[::-1],axis=0)
 target_center=target_curve(source_y)+(source_center-source_reference)*[1.30,0,1.30]
 calf=1-smooth(-.28,-.10,source[:,1])
 radial_offset=(source-source_center)*np.stack([1.30+.12*calf,np.full(len(source),1.535),1.30+.42*calf],axis=1)
 # Transport whole cross sections with the continuous centreline. Leaving them
 # horizontal flattened the forward-bent thigh into a ribbon in neutral pose.
 source_tangent=source_curve.derivative()(source_y)
 target_tangent=target_curve.derivative()(source_y)+(source_tangent-reference_curve.derivative()(source_y))*[1.30,0,1.30]
 source_tangent/=np.maximum(np.linalg.norm(source_tangent,axis=1)[:,None],1e-12)
 target_tangent/=np.maximum(np.linalg.norm(target_tangent,axis=1)[:,None],1e-12)
 turn=np.cross(source_tangent,target_tangent);cosine=(source_tangent*target_tangent).sum(1)
 assert cosine.min()>-.999, 'Opposed section tangents: '+name
 first_cross=np.cross(turn,radial_offset)
 radial_offset+=first_cross+np.cross(turn,first_cross)/np.maximum(1+cosine,1e-12)[:,None]
 mapped=target_center+radial_offset
 # Only the new visible anatomy uses these stable display joints. The original
 # contact solver, all54 original bones, and visible paw hull weights are exact.
 hinge_mix=smooth(-.02,-.22,source_y);end_mix=smooth(-.26,-.405,source_y)
 influence=np.zeros_like(weights)
 upper_index,hinge_index,end_index=[display_indices[n] for n in display['joints']]
 influence[:,upper_index]=1-hinge_mix
 influence[:,hinge_index]=hinge_mix*(1-end_mix)
 influence[:,end_index]=hinge_mix*end_mix
 region=(source[:,0]*c['side']>0)&((source[:,2]>0)==c['front'])
 # A low belly is not a foot: every influence remains inside its anatomical
 # chain-distance envelope. The former low-y override incorrectly assigned
 # the whole abdomen quadrant to the corresponding leg.
 lower=smooth(-.08,-.29,source[:,1]);radial=1-smooth(.17+.025*lower,.24+.025*lower,dist)
 medial=smooth(.05-.025*lower,.15-.06*lower,source[:,0]*c['side'])
 axial=smooth(.06,.16,source[:,2]) if c['front'] else 1-smooth(-.27,-.15,source[:,2])
 amount=radial*medial*axial*(1-smooth(.02,.24,source[:,1]))*region
 fitted=fitted*(1-amount[:,None])+mapped*amount[:,None];weights=weights*(1-amount[:,None])+influence*amount[:,None]
 c['region']=region;c['blend']=amount;c['distance']=dist
 c['terminalDistance']=np.sqrt(distances[:,-2:].min(1))
# The solid terminal hulls preserve visible source contacts exactly. New lower
# foot geometry is fitted inside those hulls; its upper leg/ankle retains the
# real source mesh and atlas, so no detached contact-only proxy is introduced.
paw_records={};hull_vertices=[];hull_uv=[];hull_j=[];hull_w=[];hull_faces=[];hull_source_ids=[];hull_offset=len(old_v)+len(source)
interior_contact_source=np.full(len(source),-1,dtype=int)
for name,c in chains.items():
 ids=np.flatnonzero(np.where(np.isin(old_j,c['paw']),old_w,0).sum(1)>=.4);points=old_v[ids];hull=ConvexHull(points);f=hull.simplices.copy();cross=np.cross(points[f[:,1]]-points[f[:,0]],points[f[:,2]]-points[f[:,0]]);flip=(cross*hull.equations[:,:3]).sum(1)<0;f[flip]=f[flip][:,[0,2,1]]
 posed_points=posed_old_v[ids];posed_hull=ConvexHull(posed_points)
 # Hull faces get independent UV corners sampled from one nearby source
 # triangle each. Interpolating unrelated nearest UV vertices crossed atlas
 # islands and created the conspicuous white/black paw streaks in v1.
 source_ids=ids[f.reshape(-1)];hf=np.arange(len(source_ids)).reshape(-1,3)
 foot_mask=c['region']&(source[:,1]<-.28)&(c['terminalDistance']<.19)
 foot=np.flatnonzero(foot_mask)
 foot_faces=np.flatnonzero(foot_mask[faces].all(1))
 if not len(foot_faces):raise RuntimeError('No coherent source paw UV region: '+name)
 centers=fitted[faces[foot_faces]].mean(1);near_faces=cKDTree(centers).query(posed_points[f].mean(1))[1]
 paw_uv=uv[faces[foot_faces[near_faces]]].reshape(-1,2)
 center=posed_points[posed_hull.vertices].mean(0);q=fitted[foot]-center;den=q@posed_hull.equations[:,:3].T;numer=-(center@posed_hull.equations[:,:3].T+posed_hull.equations[:,3]);ratio=np.where(den>1e-10,numer[None,:]/np.maximum(den,1e-10),np.inf).min(1);inside=center+q*np.minimum(1,np.maximum(0,ratio*.94))[:,None]
 mix=smooth(-.28,-.39,source[foot,1])*(1-smooth(.12,.19,c['terminalDistance'][foot]));fitted[foot]=fitted[foot]*(1-mix[:,None])+inside*mix[:,None]
 # These deliberately interior vertices follow the nearest actual source paw
 # influence; the visible hull keeps the exact source four-weight combination.
 near=cKDTree(posed_points).query(fitted[foot])[1];pw=np.zeros((len(foot),joint_count))
 for k in range(4):np.add.at(pw,(np.arange(len(foot)),old_j[ids[near],k]),old_w[ids[near],k])
 # A nearby weight tuple does not guarantee that an invented interior point
 # stays inside a skinned hull, particularly when it contains elbow influence.
 # Low interior foot vertices therefore copy actual source contact samples.
 # The visible hull remains unchanged and encloses these terminal copies.
 contact_mix=np.maximum(smooth(-.29,-.36,source[foot,1]),1-smooth(bp(c['names'][-2])[1]+.02,bp(c['names'][-2])[1]+.14,fitted[foot,1]))
 fitted[foot]=fitted[foot]*(1-contact_mix[:,None])+posed_points[near]*contact_mix[:,None]
 weights[foot]=weights[foot]*(1-contact_mix[:,None])+pw*contact_mix[:,None]
 exact=contact_mix>=1-1e-10;interior_contact_source[foot[exact]]=ids[near[exact]]
 visible_ids=np.arange(hull_offset,hull_offset+len(source_ids));paw_records[name]={'jointIndices':c['paw'],'sourceVertexIds':source_ids.tolist(),'visibleVertexIds':visible_ids.tolist(),'triangles':len(hf),'exactSourcePositionsAndWeights':True,'uvStrategy':'Each face transfers all three corners of one nearby Meshy foot triangle.','interiorFootVertices':len(foot),'maximumInteriorFootSourceDistance':float(c['terminalDistance'][foot].max())}
 hull_vertices.append(old_v[source_ids]);hull_uv.append(paw_uv);hull_j.append(old_j[source_ids]);hull_w.append(old_w[source_ids]);hull_faces.append(hf+hull_offset);hull_source_ids.extend(source_ids.tolist());hull_offset+=len(source_ids)
# Fair only the transition between limbs and torso. The original UV topology
# and atlas remain intact; welded UV duplicates receive identical fairing.
_,weld=np.unique(np.round(source,7),axis=0,return_inverse=True);weld_count=weld.max()+1
weld_faces=weld[faces];rows=np.concatenate([weld_faces[:,0],weld_faces[:,1],weld_faces[:,2],weld_faces[:,1],weld_faces[:,2],weld_faces[:,0]]);cols=np.concatenate([weld_faces[:,1],weld_faces[:,2],weld_faces[:,0],weld_faces[:,0],weld_faces[:,1],weld_faces[:,2]])
adjacency=csr_matrix((np.ones(len(rows)),(rows,cols)),shape=(weld_count,weld_count));degree=np.asarray(adjacency.sum(1)).ravel();neighbours=diags(1/np.maximum(degree,1))@adjacency
counts=np.bincount(weld);fair_mask=np.maximum.reduce([4*c['blend']*(1-c['blend']) for c in chains.values()])
fair_mask*=smooth(-.30,-.20,source[:,1])*(1-smooth(.20,.29,source[:,1]))*(1-smooth(.34,.46,source[:,2]))
fair_mask[interior_contact_source>=0]=0
group_mask=np.bincount(weld,weights=fair_mask)/counts
def fair(values,steps,amount,mask=None):
 active_mask=group_mask if mask is None else np.bincount(weld,weights=mask)/counts
 grouped=np.zeros((weld_count,values.shape[1]));np.add.at(grouped,weld,values);grouped/=counts[:,None]
 for _ in range(steps):grouped+=(neighbours@grouped-grouped)*(active_mask*amount)[:,None]
 return grouped[weld]
weights=fair(weights,20,.28)
# The source's compact elbow became a sharp rim when fitted to the longer
# display forelimb. Spread only this local transition. The top of this mask
# is below the lowest fixed pannier and its bottom excludes every exact paw.
elbow_mask=smooth(.75,.98,np.maximum(chains['frontLeft']['blend'],chains['frontRight']['blend']))
elbow_mask*=smooth(-.285,-.225,source[:,1])*(1-smooth(-.015,.06,source[:,1]))*(1-smooth(.78,.85,fitted[:,1]))
elbow_mask[interior_contact_source>=0]=0
weights/=np.maximum(weights.sum(1)[:,None],1e-20);j=np.argsort(weights,axis=1)[:,-4:][:,::-1];w=np.take_along_axis(weights,j,axis=1);retained=w.sum(1);w/=np.maximum(retained[:,None],1e-20)
exact_interior=np.flatnonzero(interior_contact_source>=0);j[exact_interior]=old_j[interior_contact_source[exact_interior]];w[exact_interior]=old_w[interior_contact_source[exact_interior]]
body_matrices=mixed_matrices(j,w)
# Preserve the already well-received face and horns in their actual neutral
# posed location; the lower torso/limbs are authored directly in pose space.
head_reference=source*np.array([1.43,1.75,1.35])+[.035,.475601*1.75,0];head_reference[:,0]-=.17*head_reference[:,2]
posed_head=transform_points(head_reference,body_matrices);preserve_head=smooth(.35,.57,source[:,2])*smooth(-.08,.16,source[:,1])
fitted=fitted*(1-preserve_head[:,None])+posed_head*preserve_head[:,None]
before_fair=fitted.copy();fitted=fair(fitted,120,.42);fair_displacement=np.linalg.norm(fitted-before_fair,axis=1)
# Upper flanks sit inside the unchanged pannier envelope. A smooth round
# compression preserves a curved torso instead of cutting platform-shaped
# notches into it. Head/horns ahead of the saddle and lower limbs stay broad.
saddle_band=smooth(-.68,-.55,fitted[:,2])*(1-smooth(.55,.68,fitted[:,2]))*smooth(.72,.92,fitted[:,1])
centre_x=.325/16;rounded_x=centre_x+.27*np.tanh((fitted[:,0]-centre_x)/.27)
fitted[:,0]=fitted[:,0]*(1-saddle_band)+rounded_x*saddle_band
# The fixed lower-right rear pannier occupies this small haunch band. Relieve
# only its inner skin margin with a smooth inset, not the whole creature.
haunch=smooth(.73,.86,fitted[:,1])*(1-smooth(.95,1.12,fitted[:,1]))*smooth(-.52,-.43,fitted[:,2])*(1-smooth(-.21,-.13,fitted[:,2]))
haunch_delta=np.maximum(fitted[:,0]-.39,0)*haunch;fitted[:,0]-=haunch_delta
elbow_before=fitted.copy()
if args.elbow_fairing:
 # Work after the complete saddle fit: applying its nonlinear flank mapping
 # later could amplify this bounded local correction into a larger change.
 elbow_target=fair(fitted,100,.28,elbow_mask);elbow_delta=elbow_target-fitted
 elbow_delta[elbow_mask<=0]=0
 elbow_delta*=np.minimum(1,.022/np.maximum(np.linalg.norm(elbow_delta,axis=1),1e-20))[:,None]
 fitted+=elbow_delta
 # Change the handoff only after completing the original neutral surface fit.
 # Otherwise its weights also alter the source-head preservation blend and
 # move vertices outside the intended local geometric correction.
 elbow_weights=fair(weights,24,.35,elbow_mask);weights[elbow_mask>0]=elbow_weights[elbow_mask>0]
 weights/=np.maximum(weights.sum(1)[:,None],1e-20);j=np.argsort(weights,axis=1)[:,-4:][:,::-1];w=np.take_along_axis(weights,j,axis=1);retained=w.sum(1);w/=np.maximum(retained[:,None],1e-20)
 j[exact_interior]=old_j[interior_contact_source[exact_interior]];w[exact_interior]=old_w[interior_contact_source[exact_interior]]
 body_matrices=mixed_matrices(j,w)
elbow_displacement=np.linalg.norm(fitted-elbow_before,axis=1)
body_inverse=np.linalg.inv(body_matrices);rest_fitted=transform_points(fitted,body_inverse)
rest_fitted[exact_interior]=old_v[interior_contact_source[exact_interior]]
v=np.concatenate([old_v,rest_fitted,*hull_vertices]).astype('<f4');all_uv=np.concatenate([old['TEXCOORD_0'],uv,*hull_uv]).astype('<f4');all_j=np.concatenate([old_j,j,*hull_j]).astype('u1');all_w=np.concatenate([old_w,w,*hull_w]).astype('<f4');all_f=np.concatenate([faces+len(old_v),*hull_faces]).astype('<u4')
all_matrices=mixed_matrices(all_j,all_w);posed_v=transform_points(v,all_matrices)
# Smooth normals across UV duplicates while preserving their texture coordinates.
n=np.zeros_like(v);cross=np.cross(posed_v[all_f[:,1]]-posed_v[all_f[:,0]],posed_v[all_f[:,2]]-posed_v[all_f[:,0]])
for k in range(3):np.add.at(n,all_f[:,k],cross)
_,inverse=np.unique(np.round(source,7),axis=0,return_inverse=True);group=np.zeros((inverse.max()+1,3));np.add.at(group,inverse,n[len(old_v):len(old_v)+len(source)]);n[len(old_v):len(old_v)+len(source)]=group[inverse];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-20);n[:len(old_v)]=old['NORMAL']
# UV-only hull duplicates share their exact source-vertex normal across faces.
hull_start=len(old_v)+len(source);ids=np.array(hull_source_ids);_,inverse=np.unique(ids,return_inverse=True);group=np.zeros((inverse.max()+1,3));np.add.at(group,inverse,n[hull_start:]);n[hull_start:]=group[inverse];n[hull_start:]/=np.maximum(np.linalg.norm(n[hull_start:],axis=1)[:,None],1e-20)
# Three's skin-normal path multiplies by the weighted skin matrix. Inverse
# that same 3x3 map so the displayed neutral normals match the desired surface,
# rather than inheriting false creases from the deliberately inverse-fit bind.
n[len(old_v):]=np.linalg.solve(all_matrices[len(old_v):,:3,:3],n[len(old_v):,:,None])[:,:,0];n[len(old_v):]/=np.maximum(np.linalg.norm(n[len(old_v):],axis=1)[:,None],1e-20)
assert np.isfinite(v).all() and np.isfinite(n).all() and np.isfinite(all_w).all()
doc=copy.deepcopy(rd);doc['bufferViews']=[];doc['accessors']=[];binary=bytearray()
def view(data):
 while len(binary)%4:binary.append(0)
 i=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(data)});binary.extend(data);return i
def append(array,component,type_name):
 a=np.ascontiguousarray(array);entry={'bufferView':view(a.tobytes()),'componentType':component,'count':len(a),'type':type_name}
 if type_name=='VEC3':entry.update(min=a.min(0).astype(float).tolist(),max=a.max(0).astype(float).tolist())
 i=len(doc['accessors']);doc['accessors'].append(entry);return i
attrs={'POSITION':append(v,5126,'VEC3'),'NORMAL':append(n.astype('<f4'),5126,'VEC3'),'TEXCOORD_0':append(all_uv,5126,'VEC2'),'JOINTS_0':append(all_j,5121,'VEC4'),'WEIGHTS_0':append(all_w,5126,'VEC4')};indices=append(all_f.reshape(-1,1),5125,'SCALAR')
original_ibm=accessor(rd,rb,rd['skins'][0]['inverseBindMatrices']);extra_ibm=[]
armature=next(i for i,node in enumerate(doc['nodes']) if node.get('name')=='SmartRigArmature')
assert all(key not in doc['nodes'][armature] for key in ['matrix','translation','rotation','scale'])
for chain in display_rig['chains']:
 positions=[np.array(chain['neutralPositions'][key]) for key in ['root','hinge','end']]
 first=len(doc['nodes']);doc['nodes'][armature]['children'].append(first)
 for k,(name,position) in enumerate(zip(chain['joints'],positions)):
  node={'name':name,'translation':(position if k==0 else position-positions[k-1]).tolist()}
  if k<2:node['children']=[first+k+1]
  doc['nodes'].append(node);doc['skins'][0]['joints'].append(first+k)
  inverse_bind=np.eye(4);inverse_bind[:3,3]=-position;extra_ibm.append(inverse_bind.T.reshape(-1))
ibm=np.concatenate([original_ibm,np.array(extra_ibm)]).astype('<f4')
assert np.array_equal(ibm[:54],original_ibm)
doc['skins'][0]['inverseBindMatrices']=append(ibm,5126,'MAT4')
doc['materials']=copy.deepcopy(md['materials']);doc['materials'][0]['name']='Titanhorn original Meshy 2K PBR';doc['textures']=copy.deepcopy(md['textures']);doc['samplers']=copy.deepcopy(md.get('samplers',[]));doc['images']=copy.deepcopy(md['images']);image_hashes=[]
for image in doc['images']:
 b=md['bufferViews'][image['bufferView']];image_bytes=mb[b.get('byteOffset',0):b.get('byteOffset',0)+b['byteLength']];image_hashes.append(sha(image_bytes));image['bufferView']=view(image_bytes)
doc['meshes'][0]['primitives']=[{'attributes':attrs,'indices':indices,'material':0,'mode':4}];doc['meshes'][0]['extras']={'authoredFlesh':True,'riggedBeast':True,'newMeshyBeast':True,'sourceContactVertices':len(old_v),'sourceContactSha256':sha(rig_raw),'meshSourceSha256':sha(mesh_raw),'contactStrategy':'Visible closed paw hulls use exact source position/joint/weight duplicates with Meshy UV transfer; original full contact prefix remains unchanged.','visibleContactHulls':paw_records,'interiorContactCopies':{'sourceVertexIds':interior_contact_source[exact_interior].tolist(),'visibleVertexIds':(exact_interior+len(old_v)).tolist(),'exactSourcePositionsAndWeights':True},'displayLimbRig':display_rig};doc['buffers']=[{'byteLength':len(binary)}];doc['asset']['generator']='Colossus Wake / real Titanhorn Meshy mesh / original contact rig plus stable anatomical display chains'
encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary.extend(b'\0'*((-len(binary))%4));out=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary;args.output.write_bytes(out)
visible=np.unique(all_f);sections=[]
for z in [-.2,-.1,0,.02,.1,.259375,-.203125]:
 rows=fitted[(np.abs(fitted[:,2]-z)<.02)&(fitted[:,1]>.55)]
 sections.append({'bodyZ':z,'cityRigZ':z*16-12,'vertices':len(rows),'bounds':None if not len(rows) else [rows.min(0).tolist(),rows.max(0).tolist()]})
report={'startedAt':started,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seconds':time.perf_counter()-tick,'command':' '.join(sys.argv),'meshInput':str(args.mesh),'meshInputSha256':sha(mesh_raw),'rigInput':str(args.rig),'rigInputSha256':sha(rig_raw),'neutralPoseInput':str(args.pose),'neutralPoseInputSha256':sha(args.pose.read_bytes()),'displayRigInput':str(args.display_rig),'displayRigInputSha256':sha(args.display_rig.read_bytes()),'generatorSha256':sha(Path(__file__).read_bytes()),'output':str(args.output),'outputSha256':sha(out),'outputBytes':len(out),'sourceContactVertices':len(old_v),'visibleBodyVertices':len(source),'visibleBodyTriangles':len(faces),'visibleContactVertices':len(hull_source_ids),'visibleContactTriangles':sum(len(f) for f in hull_faces),'totalTriangles':len(all_f),'totalVertices':len(v),'totalJoints':joint_count,'visibleBindBounds':[v[visible].min(0).tolist(),v[visible].max(0).tolist()],'visibleNeutralBounds':[posed_v[visible].min(0).tolist(),posed_v[visible].max(0).tolist()],'maximumDiscardedWeightMass':float((1-retained).max()),'weightSumMaxError':float(np.abs(all_w.sum(1)-1).max()),'texturesSha256':image_hashes,'meshExtras':doc['meshes'][0]['extras'],'torsoSections':sections,'originalBoneNodesUnchanged':all(doc['nodes'][i]==rd['nodes'][i] for i in rd['skins'][0]['joints']),'originalInverseBindsUnchanged':bool(np.array_equal(ibm[:54],original_ibm)),'sourceFilesUnchanged':sha(args.mesh.read_bytes())==sha(mesh_raw) and sha(args.rig.read_bytes())==sha(rig_raw),'limitations':['Authoring output only: actual runtime motion, combat, native rendering and art acceptance are separate evidence.','Visible anatomy is authored in the real neutral controller pose; original54 contact joints are retained and12 display-only joints appended.','Visible terminal contacts use exact original source hulls; their transferred Meshy UVs can stretch locally.','Saddle clearance, deforming belts and limb continuity require checks using actual runtime poses.']}
elbow_changed=elbow_displacement>1e-10
report['elbowFairing']={'enabled':args.elbow_fairing,'changedVertices':int(elbow_changed.sum()),'maximumModelDisplacement':float(elbow_displacement.max()),'changedNeutralBounds':None if not elbow_changed.any() else [elbow_before[elbow_changed].min(0).tolist(),elbow_before[elbow_changed].max(0).tolist()],'originalUVsUnchanged':True,'displayRootsLengthsUnchanged':True}
args.report.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['output','outputSha256','outputBytes','totalTriangles','totalVertices','totalJoints','visibleNeutralBounds','maximumDiscardedWeightMass','weightSumMaxError','originalBoneNodesUnchanged','originalInverseBindsUnchanged','elbowFairing']}))
