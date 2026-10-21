"""Static CPU authoring previews, not gameplay or independent art review."""
from pathlib import Path
import argparse,json,struct,io
import numpy as np
from PIL import Image,ImageDraw
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--input',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();a.output_dir.mkdir(parents=True,exist_ok=True)
raw=a.input.read_bytes();n=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+n]);binary=raw[28+n:]
def acc(i):
 x=d['accessors'][i];v=d['bufferViews'][x['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3}[x['type']];dt=np.dtype({5126:'<f4',5125:'<u4'}[x['componentType']]);return np.ndarray((x['count'],w),dt,binary,offset=v.get('byteOffset',0)+x.get('byteOffset',0),strides=(v.get('byteStride',w*dt.itemsize),dt.itemsize))
pr=d['meshes'][0]['primitives'][0];v=acc(pr['attributes']['POSITION']);uv=acc(pr['attributes']['TEXCOORD_0']);faces=acc(pr['indices']).reshape(-1,3);norm=acc(pr['attributes']['NORMAL'])[faces].mean(1);norm/=np.maximum(np.linalg.norm(norm,axis=1)[:,None],1e-20)
im=d['images'][d['textures'][d['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']];bv=d['bufferViews'][im['bufferView']];texture=np.array(Image.open(io.BytesIO(binary[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB'));fuv=uv[faces].mean(1)%1;rgb=texture[np.minimum(texture.shape[0]-1,(fuv[:,1]*texture.shape[0]).astype(int)),np.minimum(texture.shape[1]-1,(fuv[:,0]*texture.shape[1]).astype(int))]/255
used=np.unique(faces);center=(v[used].min(0)+v[used].max(0))/2;light=np.array([-.5,.8,1]);light/=np.linalg.norm(light);shade=.38+.62*np.maximum(0,norm@light);colors=np.clip((rgb**2.2*shade[:,None])**(1/2.2)*255,0,255).astype('u1')
for name,eye in [('three-quarter',[.85,.30,.9]),('side',[1,.12,.02]),('rear',[-.8,.25,-.9])]:
 dst=a.output_dir/(name+'.png')
 if dst.exists():raise FileExistsError('Choose a new preview directory')
 eye=np.array(eye,dtype=float);eye/=np.linalg.norm(eye);right=np.cross([0,1,0],eye);right/=np.linalg.norm(right);up=np.cross(eye,right);q=(v-center)@np.stack([right,up,eye],axis=1);scale=min(1160/np.ptp(q[used,0]),790/np.ptp(q[used,1]));xy=q[:,:2]*[scale,-scale]+[640,470]
 image=Image.new('RGB',(1280,960),(228,225,216));draw=ImageDraw.Draw(image)
 for i in np.argsort(q[faces,2].mean(1)):
  if norm[i]@eye<-.02:continue
  draw.polygon([tuple(p) for p in xy[faces[i]]],fill=tuple(colors[i]))
 draw.text((20,20),'STATIC CPU AUTHORING PREVIEW / original Meshy albedo / no normal map, animation, game lighting or art acceptance',fill=(20,20,20));image.save(dst)
