// Presentation-owned cargo displacement, deliberately outside the save schema.
// The scene resolver synchronously poses the current simulation time/placement
// and caches identical native pose inputs. It must never call weaponStatus.
const bindings=new WeakMap(),resolving=new WeakSet();
const flesh=state=>state?.faction==='kaiju'&&state.variant==='flesh';

export function bindFleshCargoPose(state,resolver){
 if(!state||typeof state!=='object'||typeof resolver!=='function')throw new TypeError('Cargo pose requires a state and synchronous resolver');
 bindings.set(state,resolver);
}
export function clearFleshCargoPose(state){bindings.delete(state);}
export function fleshCargoOffset(state){
 if(!flesh(state)||!bindings.has(state))return 0;
 if(resolving.has(state))throw new Error('Cargo pose resolver cannot request weapon status recursively');
 resolving.add(state);
 try{
  const offset=bindings.get(state)(state);
  if(!Number.isFinite(offset))throw new Error('Cargo pose must resolve a finite vertical offset in rig units');
  return offset;
 }finally{resolving.delete(state);}
}
