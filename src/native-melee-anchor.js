import * as T from '../vendor/three.module.js';
import {captureImpactAnchor} from './impact-anchor.js';

// These points belong to the imported animal's visible anatomy. Simulation
// still chooses the opponent, range, attack event, contact time and damage.
export function nativeMeleeStart(city){
  if(!city.meshyCarrier?.instance?.capabilities?.nativeQuadruped)return null;
  const point=city.meshyCarrier.controller.status()?.strikeSurfacePoint;
  return point?.length===3&&point.every(Number.isFinite)?new T.Vector3().fromArray(point):null;
}

export function nativeMeleeAnchor(source,target){
  const start=nativeMeleeStart(source);if(!start)return null;
  const shoulder=source.meshyCarrier.instance.body.getObjectByName('frontleg');
  if(!shoulder?.isBone)return null;
  const shoulderPoint=shoulder.getWorldPosition(new T.Vector3());
  const foot=source.meshyCarrier.instance.body.getObjectByName('frontleg2');
  const limb=source.meshyCarrier.controller.status()?.legs?.find(leg=>leg.key==='frontRight');
  const reach=limb&&foot?limb.lengths.reduce((sum,length)=>sum+length,0)+start.distanceTo(foot.getWorldPosition(new T.Vector3())):0;
  const centre=target.root.getWorldPosition(new T.Vector3()),sourceCentre=source.root.getWorldPosition(new T.Vector3());
  const direction=centre.clone().sub(sourceCentre);direction.y=0;direction.normalize();
  const right=new T.Vector3(direction.z,0,-direction.x),width=target.faction==='kaiju'?1.4:6;
  const lateral=T.MathUtils.clamp(start.clone().sub(sourceCentre).dot(right),-width,width);
  const ray=new T.Raycaster(),origin=start.clone(),aim=centre.clone().addScaledVector(right,lateral);
  // Cast at anatomical height first. The old upright-kaiju heights send a
  // quadruped's swipe over its opponent's back and onto a distant roof.
  // Prefer the actual imported body; ordinary hulls retain their own geometry.
  const targets=target.meshyCarrier?.renderMeshes?.length?target.meshyCarrier.renderMeshes:[target.root];
  const visible=hit=>{
    for(let object=hit.object;object;object=object.parent)if(!object.visible)return false;
    const material=hit.object.material;
    return material&&!Array.isArray(material)&&material.visible&&!(material.transparent&&material.opacity<.2)&&!hit.object.userData.enemy&&hit.object.userData.slot===undefined;
  };
  let nearest=null,nearestDistance=Infinity;
  for(const rise of[0,2,-2,4,6,8]){
    origin.y=aim.y=shoulderPoint.y+rise;
    ray.set(origin,aim.clone().sub(origin).normalize());
    const hit=ray.intersectObjects(targets,true).find(visible);
    if(hit){
      const distance=hit.point.distanceTo(shoulderPoint);
      if(distance<nearestDistance){nearest=hit;nearestDistance=distance;}
      if(distance<=reach)return captureImpactAnchor(hit);
    }
  }
  return nearest?captureImpactAnchor(nearest):null;
}

// Incoming attacks need the new low animal's anatomy too. Use the real skin
// around its head, chest and hips instead of upright-kaiju height constants.
// The anchor remains an indexed material surface and follows later animation.
export function nativeBodyImpactAnchor(target, start) {
  const adapter = target.meshyCarrier;
  if (!adapter?.instance?.capabilities?.nativeQuadruped) return null;
  target.root.updateMatrixWorld(true);
  const ray = new T.Raycaster(); let nearest = null, distance = Infinity;
  for (const name of ['head', 'chest', 'Hips']) {
    const bone = adapter.instance.body.getObjectByName(name);
    if (!bone?.isBone) continue;
    const aim = bone.getWorldPosition(new T.Vector3()), direction = aim.sub(start);
    if (direction.lengthSq() < 1e-12) continue;
    ray.set(start, direction.normalize());
    const hit = ray.intersectObjects(adapter.renderMeshes, true).find(hit => {
      for (let object = hit.object; object; object = object.parent) if (!object.visible) return false;
      const material = hit.object.material;
      return material && !Array.isArray(material) && material.visible && !(material.transparent && material.opacity < .2);
    });
    if (hit && hit.distance < distance) {nearest = hit; distance = hit.distance;}
  }
  return nearest ? captureImpactAnchor(nearest) : null;
}
