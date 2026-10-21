// A shared painterly light rig: warm limestone sunlight, cool slate fill and
// uncluttered atmospheric depth. Every mode uses the same readable exposure.
export const LIGHTING_PRESETS = Object.freeze({
  day: Object.freeze({
    top:0x53677f,bottom:0xc5c6b6,fog:0xa5b0b3,fogDensity:.00085,
    sun:0xffd8a0,sunPosition:Object.freeze([-65,78,65]),intensity:2.70,
    skyLight:0xb0bfdc,groundLight:0x737568,ambient:.80,
    rim:0xc0cee7,rimIntensity:.62,environment:.42,
    exposure:1.03,windows:.21,bloom:.13,localLight:0,uplight:0,
    sunDisc:4.2,scattering:.15,cloud:0xd8d8c6,cloudShade:0x727f97,
    cloudOpacity:.52,mist:0xa9b6bb,mistOpacity:.17
  }),
  dusk: Object.freeze({
    top:0x525575,bottom:0xc4a184,fog:0x9b9aa8,fogDensity:.00096,
    sun:0xffb777,sunPosition:Object.freeze([-95,43,42]),intensity:2.30,
    skyLight:0xb0b7d6,groundLight:0x716a63,ambient:.81,
    rim:0xb8c5e7,rimIntensity:.78,environment:.37,
    exposure:1.07,windows:1.05,bloom:.19,localLight:5.6,uplight:36,
    sunDisc:3.4,scattering:.26,cloud:0xdec3a3,cloudShade:0x686a88,
    cloudOpacity:.55,mist:0xa8a4b8,mistOpacity:.22
  }),
  night: Object.freeze({
    top:0x202b4b,bottom:0x56647e,fog:0x45536e,fogDensity:.00114,
    sun:0xc4d0ff,sunPosition:Object.freeze([65,72,-70]),intensity:1.24,
    skyLight:0x9caccd,groundLight:0x555d6b,ambient:.70,
    rim:0xb6c6eb,rimIntensity:.82,environment:.19,
    exposure:1.09,windows:1.85,bloom:.24,localLight:9,uplight:58,
    sunDisc:1.25,scattering:.04,cloud:0x8591aa,cloudShade:0x3a4664,
    cloudOpacity:.24,mist:0x76859e,mistOpacity:.17
  })
});

export function getLightingPreset(mode='day') {
  return LIGHTING_PRESETS[mode] ?? LIGHTING_PRESETS.day;
}
