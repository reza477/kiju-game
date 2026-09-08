// Visual carrier identities remain separate from the three combat factions.
export const CARRIER_VARIANTS=Object.freeze({
  cyborg:Object.freeze({faction:'kaiju',name:'Ironbound Titan',label:'Cyborg titan',description:'An armored, augmented giant carrying a vertical Gothic citadel.'}),
  flesh:Object.freeze({faction:'kaiju',name:'Bloodroot Titan',label:'Flesh titan',description:'A living giant of muscle and bone, burdened with a towering castle.'}),
  standard:Object.freeze({faction:'crawler',name:'Crown Crawler',label:'Armored crawler',description:'The original broad tracked city, built in brick, iron and brass.'}),
  drill:Object.freeze({faction:'crawler',name:'Bastion Borer',label:'Drill crawler',description:'A long rectangular city with a giant rotating spiral drill at its prow.'}),
  horizontal:Object.freeze({faction:'airship',name:'Saffron Voyager',label:'Horizontal airship',description:'A domed city suspended between four long horizontal envelopes.'}),
  vertical:Object.freeze({faction:'airship',name:'Sky Lantern Court',label:'Upright balloon city',description:'Four tall rounded balloons lift a domed city on visible suspension lines.'})
});
export const VARIANTS_BY_FACTION=Object.freeze({kaiju:Object.freeze(['cyborg','flesh']),crawler:Object.freeze(['standard','drill']),airship:Object.freeze(['horizontal','vertical'])});
export const DEFAULT_VARIANTS=Object.freeze({kaiju:'cyborg',crawler:'standard',airship:'horizontal'});
export function normalizeVariant(faction,variant){return CARRIER_VARIANTS[variant]?.faction===faction?variant:DEFAULT_VARIANTS[faction];}
export function variantFootprint(faction,variant){return faction==='crawler'&&variant==='drill'?{x:.85,z:1.32}:{x:1,z:1};}
