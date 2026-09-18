import * as T from '../vendor/three.module.js';

// Keep the original batch as canonical CPU storage: saved scenery addresses its
// original instance indices. Only render storage is partitioned into local cells.
// The cells share ordinary geometry buffers; wind attributes are per-cell copies.
export function partitionStaticInstances(source, items, {cellSize=96, padding=2}={}) {
  if (!source.isInstancedMesh || items.length !== source.count) throw new Error('Spatial instance storage must match its original items.');
  if (!Number.isFinite(cellSize) || !Number.isFinite(padding) || !(cellSize > 0) || !(padding >= 0)) throw new Error('Spatial cell size and padding must be finite positive bounds.');
  const container = new T.Group(); container.name = source.name+' spatial cells';
  container.userData.noBatch = true;
  container.position.copy(source.position); container.quaternion.copy(source.quaternion); container.scale.copy(source.scale);
  container.visible = source.visible;
  const cells = new Map(), slots = new Array(items.length), matrix = new T.Matrix4(), colour = new T.Color();
  items.forEach((item,index) => {
    const x=item.windRoot?.[0]??item.x, z=item.windRoot?.[2]??item.z;
    const key=Math.floor(x/cellSize)+','+Math.floor(z/cellSize);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(index);
  });
  const chunks=[];
  for (const [key,indices] of cells) {
    const geometry=new T.BufferGeometry();
    if (source.geometry.index) geometry.setIndex(source.geometry.index);
    for (const [name,attribute] of Object.entries(source.geometry.attributes)) {
      if (!attribute.isInstancedBufferAttribute) { geometry.setAttribute(name,attribute); continue; }
      const array=new attribute.array.constructor(indices.length*attribute.itemSize);
      for (let local=0;local<indices.length;local++) {
        const first=indices[local]*attribute.itemSize;
        array.set(attribute.array.subarray(first,first+attribute.itemSize),local*attribute.itemSize);
      }
      geometry.setAttribute(name,new T.InstancedBufferAttribute(array,attribute.itemSize,attribute.normalized,attribute.meshPerAttribute));
    }
    geometry.boundingBox=source.geometry.boundingBox?.clone()??null;
    geometry.boundingSphere=source.geometry.boundingSphere?.clone()??null;
    const mesh=new T.InstancedMesh(geometry,source.material,indices.length); mesh.name=source.name;
    mesh.castShadow=source.castShadow; mesh.receiveShadow=source.receiveShadow; mesh.frustumCulled=source.frustumCulled;
    mesh.customDepthMaterial=source.customDepthMaterial; mesh.customDistanceMaterial=source.customDistanceMaterial;
    mesh.renderOrder=source.renderOrder; mesh.layers.mask=source.layers.mask;
    mesh.userData={...source.userData,spatialBatch:source.name,spatialCell:key,spatialIndices:Object.freeze(indices.slice())};
    for(let local=0;local<indices.length;local++) {
      const index=indices[local]; source.getMatrixAt(index,matrix); mesh.setMatrixAt(local,matrix);
      if(source.instanceColor){source.getColorAt(index,colour);mesh.setColorAt(local,colour);}
      slots[index]=Object.freeze({mesh,index:local});
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingBox(); mesh.boundingBox.expandByScalar(padding);
    mesh.computeBoundingSphere(); mesh.boundingSphere.radius+=padding;
    chunks.push(mesh);container.add(mesh);
  }
  Object.freeze(slots); Object.freeze(chunks);
  const dirtyMatrices=new Set(),dirtyColours=new Set();
  const originalSetMatrix=source.setMatrixAt,originalSetColour=source.setColorAt;
  source.setMatrixAt=function(index,value){
    const slot=slots[index];if(!slot)throw new RangeError('Unknown scenery instance '+index);
    originalSetMatrix.call(this,index,value);slot.mesh.setMatrixAt(slot.index,value);dirtyMatrices.add(slot.mesh);
  };
  source.setColorAt=function(index,value){
    const slot=slots[index];if(!slot)throw new RangeError('Unknown scenery instance '+index);
    originalSetColour.call(this,index,value);slot.mesh.setColorAt(slot.index,value);dirtyColours.add(slot.mesh);
  };
  const forwardUploads=(attribute,dirty,key)=>Object.defineProperty(attribute,'needsUpdate',{
    set(value){if(value){this.version++;for(const mesh of dirty)mesh[key].needsUpdate=true;dirty.clear();}}
  });
  forwardUploads(source.instanceMatrix,dirtyMatrices,'instanceMatrix');
  if(source.instanceColor)forwardUploads(source.instanceColor,dirtyColours,'instanceColor');
  // Destruction hides and restores the same original matrices. Retain the full
  // original cell bounds, including wind padding, while individual slots hide.
  for(const property of ['castShadow','receiveShadow','frustumCulled','material','customDepthMaterial','customDistanceMaterial']){
    let value=source[property];
    Object.defineProperty(source,property,{configurable:true,get(){return value;},set(next){value=next;for(const mesh of chunks)mesh[property]=next;}});
  }
  let visible=source.visible,count=source.count;
  Object.defineProperty(source,'visible',{configurable:true,get(){return visible;},set(value){visible=value;container.visible=value;}});
  Object.defineProperty(source,'count',{configurable:true,get(){return count;},set(value){
    count=Math.max(0,Math.min(items.length,Math.floor(value)));
    for(const mesh of chunks){const indices=mesh.userData.spatialIndices;let n=0;while(n<indices.length&&indices[n]<count)n++;mesh.count=n;}
  }});
  Object.defineProperty(source,'spatialSlots',{value:slots});
  Object.defineProperty(source,'spatialChunks',{value:chunks});
  return container;
}
