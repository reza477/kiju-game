import * as T from '../vendor/three.module.js';

// Refresh after posing, even when a city is off screen. Bounds live in the
// instance meshes' local space, so both the main and shadow cameras can cull
// independently. A broad human-sized margin contains hands, tools and cloth.
export function updateCitizenBounds(citizens){
 const state=citizens.visibilityBounds??={box:new T.Box3(),sphere:new T.Sphere(),point:new T.Vector3()};
 state.box.makeEmpty();
 for(const route of citizens.routes){
  if(!route.activity)continue; // Storeys hidden by inspection have no instances.
  state.box.expandByPoint(state.point.set(route.x,route.y,route.z));
 }
 if(state.box.isEmpty())state.sphere.set(state.point.set(0,0,0),0);
 else state.box.expandByScalar(2.2*citizens.humanScale).getBoundingSphere(state.sphere);
 for(const mesh of Object.values(citizens.instances)){
  mesh.boundingSphere??=new T.Sphere();mesh.boundingSphere.copy(state.sphere);mesh.frustumCulled=true;
 }
}
