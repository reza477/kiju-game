// This fixed route set belongs to the southern-bend pilot, not a game feature.
export const profiles = [
  {name:'desktop',viewport:{width:1440,height:960},deviceScaleFactor:1,mobile:false,quality:'high'},
  {name:'phone-portrait',viewport:{width:390,height:844},deviceScaleFactor:2,mobile:true,quality:'performance'},
  {name:'phone-landscape',viewport:{width:844,height:390},deviceScaleFactor:2,mobile:true,quality:'performance'},
];
export const pilotConfig = {
  schema:1, initial:{x:-45,z:-93}, tolerance:1.6,
  routes:[
    {name:'woodland-west-east',waypoints:[[-53,-114],[-61,-131],[-42,-130],[-29,-105],[4,-108],[19,-122],[24,-113],[4,-96],[-45,-93]]},
    {name:'shore-rock-bend',waypoints:[[-31.7,-100],[-35,-115],[-28,-137],[-10,-133],[-4.4,-120.3],[5,-103],[18,-98],[-45,-93]]},
    {name:'foundry-resource-approach',waypoints:[[-10,-102],[16,-86],[52,-76]],resourceId:'ruins',returnWaypoints:[[3,-57],[-38,-80],[-45,-93]]},
  ],
  captures:[
    {name:'desktop-normal',profile:'desktop',position:{x:-45,z:-93},camera:{yaw:.72,pitch:.6,zoom:76}},
    {name:'desktop-reverse',profile:'desktop',position:{x:-62,z:-133},camera:{yaw:.72+Math.PI,pitch:.6,zoom:76}},
    {name:'desktop-close',profile:'desktop',position:{x:-12,z:-101},camera:{yaw:.15,pitch:.68,zoom:52}},
    {name:'phone-portrait',profile:'phone-portrait',position:{x:-45,z:-93},camera:{yaw:.72,pitch:.6,zoom:76}},
    {name:'phone-landscape',profile:'phone-landscape',position:{x:-45,z:-93},camera:{yaw:.72,pitch:.6,zoom:76}},
  ],
};

// Resolve one camera-relative native direction. Release/repress at every goal;
// the observer stops its promise, never the game's movement or simulation.
export function nextNativeSegment(position, waypoint, yaw, tolerance=1.6) {
  const dx=waypoint[0]-position.x,dz=waypoint[1]-position.z;
  if(Math.hypot(dx,dz)<=tolerance)return null;
  const right=dx*Math.cos(yaw)-dz*Math.sin(yaw),forward=-dx*Math.sin(yaw)-dz*Math.cos(yaw);
  return Math.abs(right)>Math.abs(forward)
    ? {direction:right>0?'right':'left',distance:Math.min(24,Math.abs(right))}
    : {direction:forward>0?'up':'down',distance:Math.min(24,Math.abs(forward))};
}

export function validatePilotConfig(config) {
  if(config.schema!==1||config.routes.length!==3||config.captures.length!==5)throw Error('Pilot requires schema 1, three routes and five capture cases.');
  if(!Number.isFinite(config.tolerance)||config.tolerance<.5||config.tolerance>2)throw Error('Invalid waypoint tolerance.');
  const point=values=>{if(values.length!==2||!values.every(Number.isFinite)||values.some(value=>Math.abs(value)>180))throw Error('Invalid bounded pilot waypoint.');};
  point([config.initial.x,config.initial.z]);
  for(const route of config.routes){if(!/^[a-z-]+$/.test(route.name)||!route.waypoints.length)throw Error('Invalid pilot route.');for(const p of [...route.waypoints,...route.returnWaypoints||[]])point(p);}
  if(new Set(config.routes.map(r=>r.name)).size!==3)throw Error('Route names must differ.');
  if(config.routes.filter(r=>r.resourceId==='ruins').length!==1)throw Error('Exactly one native foundry resource route is required.');
  for(const c of config.captures){if(!profiles.some(p=>p.name===c.profile)||!/^[-a-z]+$/.test(c.name))throw Error('Invalid capture name/profile.');point([c.position.x,c.position.z]);if(!Object.values(c.camera).every(Number.isFinite)||c.camera.pitch<.16||c.camera.pitch>1.3||c.camera.zoom<10||c.camera.zoom>330)throw Error('Invalid capture camera.');}
  if(new Set(config.captures.map(c=>c.name)).size!==5)throw Error('Capture names must differ.');
  return config;
}
