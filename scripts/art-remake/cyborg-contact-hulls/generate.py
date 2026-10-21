"""Generate four source-index contact hulls; the original GLB is read only."""
from pathlib import Path
import sys,json,struct,hashlib,datetime,argparse
HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[2]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--packages',type=Path,default=ROOT/'artifacts/art-remake/mesh-experiments/python')
parser.add_argument('--output',type=Path,default=ROOT/'src/cyborg-contact-hulls.js')
args=parser.parse_args();sys.path.insert(0,str(args.packages))
import numpy as np
from scipy.spatial import ConvexHull
raw=(ROOT/'assets/carriers/meshy/cyborg.glb').read_bytes(); jl=struct.unpack_from('<I',raw,12)[0]; doc=json.loads(raw[20:20+jl]); binary=raw[28+jl:]
dtypes={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'};widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def accessor(index):
 a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];dt=np.dtype(dtypes[a['componentType']]);w=widths[a['type']]
 return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*dt.itemsize),dt.itemsize)).copy()
primitive=doc['meshes'][0]['primitives'][0];a=primitive['attributes'];pos=accessor(a['POSITION']);skin=accessor(a['JOINTS_0']);weight=accessor(a['WEIGHTS_0']);tri=accessor(primitive['indices']).reshape(-1,3)
bone_names=[doc['nodes'][i]['name'].replace(':','') for i in doc['skins'][0]['joints']];boot_top=float(pos[:,1].min()+(pos[:,1].max()-pos[:,1].min())*.2353)
source={'path':'assets/carriers/meshy/cyborg.glb','sha256':hashlib.sha256(raw).hexdigest(),'vertices':len(pos),'triangles':len(tri),'jointNames':bone_names}
out={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':source,'method':'scipy.spatial.ConvexHull of original weighted terminal vertex positions. Triangle indices refer directly to original vertex IDs. No weights or positions synthesized. Outward face winding uses Qhull normals. UV split vertices with exactly identical position are collapsed by Qhull; animation validation checks any resulting weight differences.','bootTop':boot_top,'regions':{}}
pools={'source':source,'regions':{}}
for side in ['Left','Right']:
 for kind in ['Hand','Boot']:
  key=side.lower()+kind
  names=[n for n in bone_names if n.startswith('mixamorig'+side) and (('Hand' in n) if kind=='Hand' else any(q in n for q in ['Leg','Foot','Toe']))]
  joints=[bone_names.index(n) for n in names];influence=np.sum(np.where(np.isin(skin,joints),weight,0),axis=1)
  # Hull includes the exact prior displayed terminal boundary; the stricter
  # contact pool used by soleIndices is stored independently and unchanged.
  mask=(influence>.34) if kind=='Hand' else ((influence>.4)&(pos[:,1]<=boot_top+.015))
  contact=(influence>=.99999) if kind=='Hand' else ((influence>.4)&(pos[:,1]<boot_top))
  ids=np.flatnonzero(mask);hull=ConvexHull(pos[ids].astype(float));faces=ids[hull.simplices].copy()
  for i,f in enumerate(faces):
   if np.dot(np.cross(pos[f[1]]-pos[f[0]],pos[f[2]]-pos[f[0]]),hull.equations[i,:3])<0: faces[i]=f[[0,2,1]]
  unique=np.unique(faces);edges={}
  for f in faces:
   for x,y in zip(f,np.roll(f,-1)):
    edge=tuple(sorted((int(x),int(y))));edges[edge]=edges.get(edge,0)+1
  assert all(n==2 for n in edges.values());assert len(unique)-len(edges)+len(faces)==2
  source_render_ids=np.unique(tri[np.all(mask[tri],axis=1)])
  out['regions'][key]={'jointIndices':joints,'jointNames':names,'sourceCandidateCount':len(ids),'hullVertexCount':len(unique),'triangleCount':len(faces),'closedManifold':True,'eulerCharacteristic':2,'volume':hull.volume,'bounds':{'min':pos[ids].min(0).tolist(),'max':pos[ids].max(0).tolist()},'vertexIndices':unique.tolist(),'triangleIndices':faces.reshape(-1).tolist(),'positions':pos[unique].tolist(),'skinIndices':skin[unique].tolist(),'skinWeights':weight[unique].tolist()}
  pools['regions'][key]={'hullCandidateVertexIndices':ids.tolist(),'sourceRenderedVertexIndices':source_render_ids.tolist(),'contactVertexIndices':np.flatnonzero(contact).tolist()}

# Endpoint IDs were derived independently by vendored Three using the adapter's
# pure-hand projection. Verify immutable source and membership before export.
assert source['sha256']=='790b50caabb5b0d33635281e62a9c5b9a050ffb1870171e8f8c111675bd92f45'
palms={'leftHand':57876,'rightHand':56711}
for key,id in palms.items(): assert id in out['regions'][key]['vertexIndices'] and id in pools['regions'][key]['contactVertexIndices']
signature={'sha256':source['sha256'],'vertexCount':source['vertices'],'triangleCount':source['triangles'],'palmContactVertexIndices':palms}
regions={key:{'vertexIndices':r['vertexIndices'],'triangleIndices':r['triangleIndices'],'positions':r['positions'],'contactVertexIndex':palms.get(key)} for key,r in out['regions'].items()}
text='// Generated from the untouched private cyborg.glb. SHA-256: '+source['sha256']+'\n'
text+='// Regenerate with scripts/art-remake/cyborg-contact-hulls/generate.py (SciPy).\n'
text+='// Indices address ORIGINAL source vertices. Preserve the original contact pool.\n'
text+='// Four closed convex terminal surfaces; exact source weights are read at integration.\n'
text+='export const CYBORG_CONTACT_SOURCE = Object.freeze('+json.dumps(signature,separators=(',',':'))+');\n'
text+='export const CYBORG_CONTACT_HULLS = Object.freeze({\n'
text+=',\n'.join('  '+json.dumps(key)+': Object.freeze('+json.dumps(value,separators=(',',':'))+')' for key,value in regions.items())
text+='\n});\n'
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(text,encoding='utf8')
print(json.dumps({'output':str(args.output),'source':signature,'hullVertices':sum(len(v['vertexIndices']) for v in regions.values()),'triangles':sum(len(v['triangleIndices'])//3 for v in regions.values())},indent=2))
