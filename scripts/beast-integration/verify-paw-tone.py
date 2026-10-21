"""Audit a one-chart UV-only replacement and preservation of every other asset byte."""
from pathlib import Path
import argparse, collections, copy, datetime, hashlib, json, struct, sys
p = argparse.ArgumentParser(description=__doc__)
for key in ('input', 'candidate', 'active', 'report'):
    p.add_argument('--' + key, type=Path, required=True)
p.add_argument('--deps', type=Path)
a = p.parse_args()
if a.deps: sys.path.insert(0, str(a.deps.resolve()))
import numpy as np
start = datetime.datetime.now(datetime.timezone.utc).isoformat()
assert not a.report.exists()
sha = lambda value: hashlib.sha256(value).hexdigest()
def load(path):
    raw = path.read_bytes(); n = struct.unpack_from('<I', raw, 12)[0]
    return raw, json.loads(raw[20:20+n]), raw[28+n:]
def acc(d,b,i):
    e=d['accessors'][i];v=d['bufferViews'][e['bufferView']]
    w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[e['type']]
    dt=np.dtype({5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[e['componentType']])
    return np.ndarray((e['count'],w),dt,b,offset=v.get('byteOffset',0)+e.get('byteOffset',0),strides=(v.get('byteStride',w*dt.itemsize),dt.itemsize))
old,od,ob=load(a.input);new,nd,nb=load(a.candidate);op=od['meshes'][0]['primitives'][0];np0=nd['meshes'][0]['primitives'][0]
oa={k:acc(od,ob,i)for k,i in op['attributes'].items()};na={k:acc(nd,nb,i)for k,i in np0['attributes'].items()}
checks={k+'Exact':bool(np.array_equal(v,na[k]))for k,v in oa.items()if k!='TEXCOORD_0'}
checks.update({k+'Original85568PrefixExact':bool(np.array_equal(v[:85568],na[k][:85568]))for k,v in oa.items()})
checks['allIndicesExact']=bool(np.array_equal(acc(od,ob,op['indices']),acc(nd,nb,np0['indices'])))
checks['all66NodesExact']=od['nodes']==nd['nodes'];checks['skinsMetadataExact']=od['skins']==nd['skins']
checks['all66InverseBindsExact']=bool(np.array_equal(acc(od,ob,od['skins'][0]['inverseBindMatrices']),acc(nd,nb,nd['skins'][0]['inverseBindMatrices'])))
checks['materialsTexturesSamplersExact']=all(od.get(k)==nd.get(k)for k in ['materials','textures','samplers','images'])
oldprojection=od['meshes'][0]['extras']['pawUVProjection'];projection=nd['meshes'][0]['extras']['pawUVProjection']
labels={r['paw']:r['faceCharts']for r in oldprojection['faceCharts']}
record=od['meshes'][0]['extras']['visibleContactHulls']['frontLeft']
selected=np.array(record['visibleVertexIds']).reshape(-1,3)[np.array(labels['frontLeft'])=='side_2positive'].reshape(-1)
changed=np.flatnonzero(np.any(oa['TEXCOORD_0']!=na['TEXCOORD_0'],axis=1))
checks['exactlyIntended42UVEntriesChanged']=len(selected)==42 and np.array_equal(np.sort(selected),changed)
checks['chartTopologyExact']=oldprojection['faceCharts']==projection['faceCharts']
entry=od['accessors'][op['attributes']['TEXCOORD_0']];view=od['bufferViews'][entry['bufferView']]
offset=view.get('byteOffset',0)+entry.get('byteOffset',0);stride=view.get('byteStride',8);allowed=np.zeros(len(ob),dtype=bool)
for i in selected:allowed[offset+int(i)*stride:offset+int(i)*stride+8]=True
checks['allOtherBinaryBytesExact']=len(ob)==len(nb) and bool(np.array_equal(np.frombuffer(ob,'u1')[~allowed],np.frombuffer(nb,'u1')[~allowed]))
normalized=copy.deepcopy(nd);np1=normalized['meshes'][0]['extras']['pawUVProjection'];np1.pop('tonalOverride')
for i,chart in enumerate(np1['charts']):
    if chart['paw']=='frontLeft' and chart['chart']=='side_2positive':np1['charts'][i]=copy.deepcopy(oldprojection['charts'][i])
checks['allOtherJSONExact']=normalized==od
checks['backContourMetadataExact']=od['meshes'][0]['extras']['backContourCorrection']==nd['meshes'][0]['extras']['backContourCorrection']
seams=[]
for name,r in nd['meshes'][0]['extras']['visibleContactHulls'].items():
    ids=np.array(r['visibleVertexIds']).reshape(-1,3);src=np.array(r['sourceVertexIds']).reshape(-1,3);uv=na['TEXCOORD_0'][ids];edges=collections.defaultdict(list)
    for f,(source,tex)in enumerate(zip(src,uv)):
        for i,j in [(0,1),(1,2),(2,0)]:
            order=[i,j]if source[i]<source[j]else[j,i]
            edges[tuple(sorted([int(source[i]),int(source[j])]))].append((tex[order],labels[name][f]))
    inside=0;boundary=0;bad=0;discontinuous=0
    for sides in edges.values():
        assert len(sides)==2
        jump=float(np.linalg.norm(sides[0][0]-sides[1][0],axis=1).max());discontinuous+=jump>1/2048
        if sides[0][1]==sides[1][1]:inside+=1;bad+=jump>0
        else:boundary+=1
    ab=uv[:,1]-uv[:,0];ac=uv[:,2]-uv[:,0];area=abs(ab[:,0]*ac[:,1]-ab[:,1]*ac[:,0])
    checks[name+'UVNondegenerate']=bool((area>1e-12).all());checks[name+'ChartContinuityExact']=bad==0
    seams.append({'paw':name,'sameChartEdges':inside,'chartBoundaryEdges':boundary,'sameChartDiscontinuities':bad,'discontinuousOverOneTexel':int(discontinuous),'minimumTwiceUVTriangleArea':float(area.min())})
image_hashes=[]
for image in od['images']:
    v=od['bufferViews'][image['bufferView']];o=v.get('byteOffset',0);image_hashes.append(sha(ob[o:o+v['byteLength']]))
active=a.active.read_bytes();checks['activeStillExactV12b']=active==old
result={'startedAt':start,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':sys.argv,'verifierSha256':sha(Path(__file__).read_bytes()),'inputSha256':sha(old),'candidateSha256':sha(new),'candidateBytes':len(new),'activeSha256':sha(active),'changedUVVertices':len(changed),'checks':checks,'seams':seams,'originalPBRHashes':image_hashes,'limitations':['Exact geometry and skin data preservation establishes unchanged shape/contact numerics; no new runtime test or native appearance approval is claimed.','The existing directional chart boundaries remain; only the one bright material patch is replaced.']}
a.report.write_text(json.dumps(result,indent=2)+'\n')
assert all(checks.values()),[k for k,v in checks.items()if not v]
print(json.dumps({'candidateSha256':result['candidateSha256'],'changedUVVertices':len(changed),'allChecksPassed':True,'seams':seams}))
