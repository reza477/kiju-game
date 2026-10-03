// Bounded preparation of two already allocated effect materials. Three r185's
// public compile(object,camera,targetScene) submits programs without drawing or
// waiting for completion. Unlike compileAsync it leaves no pending poll that
// can outlive a lost context. Normal rendering still owns readiness and errors.
export function createMovementPreparation(renderer, meshes) {
  let attemptedKey=null;
  const status={attempts:0,submissionMs:0,error:null};
  return {
    status,
    invalidate(){attemptedKey=null;},
    prepare(scene,camera,target,key){
      if(attemptedKey===key||renderer.getContext().isContextLost())return false;
      attemptedKey=key;
      const previous=renderer.getRenderTarget(),started=performance.now();
      status.attempts++;status.error=null;
      try{
        renderer.setRenderTarget(target);
        for(const mesh of meshes)renderer.compile(mesh,camera,scene);
      }catch(error){
        status.error=String(error?.message||error);
        // A preparation failure must not prevent ordinary Begin/Continue. Keep
        // it visible and retry only on a real configuration/context change.
        console.error('Movement material preparation failed:',error);
      }finally{
        renderer.setRenderTarget(previous);
        status.submissionMs=performance.now()-started;
      }
      return true;
    }
  };
}
