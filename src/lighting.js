// One lighting description is shared by the sky, physical lights, fog and
// output transform. Positions are offsets from the directional light target.
export const LIGHTING_PRESETS = Object.freeze({
  day: Object.freeze({
    top:0x467fab,bottom:0xd8e0d9,fog:0xc2d1d0,fogDensity:.00105,
    sun:0xffe0b7,sunPosition:Object.freeze([-65,78,65]),intensity:3.25,
    skyLight:0xc1d9ee,groundLight:0x71766b,ambient:.80,
    rim:0xa7c8e4,rimIntensity:.86,environment:.58,
    exposure:1.0,windows:.12,bloom:.23,localLight:0,uplight:0,
    sunDisc:7.0,scattering:.24,cloud:0xe8ecdf,cloudShade:0x93acb8,
    cloudOpacity:.57,mist:0xc6d7d3,mistOpacity:.26
  }),
  dusk: Object.freeze({
    top:0x60799b,bottom:0xdbc7ae,fog:0xb3bec1,fogDensity:.00112,
    sun:0xffbe7c,sunPosition:Object.freeze([-95,43,42]),intensity:2.75,
    skyLight:0xaebbd9,groundLight:0x77715e,ambient:.72,
    rim:0x93b2d3,rimIntensity:.88,environment:.39,
    exposure:1.04,windows:.9,bloom:.29,localLight:5.6,uplight:36,
    sunDisc:5.3,scattering:.48,cloud:0xf1d4b0,cloudShade:0x8193ac,
    cloudOpacity:.62,mist:0xc2cbd0,mistOpacity:.32
  }),
  night: Object.freeze({
    top:0x122b46,bottom:0x496878,fog:0x314c61,fogDensity:.0015,
    sun:0xb9d5fa,sunPosition:Object.freeze([65,72,-70]),intensity:1.10,
    skyLight:0x91aed1,groundLight:0x4b5a65,ambient:.60,
    rim:0x97b6da,rimIntensity:.88,environment:.16,
    exposure:1.06,windows:2.15,bloom:.34,localLight:9,uplight:58,
    sunDisc:1.45,scattering:.055,cloud:0x7e99ad,cloudShade:0x294555,
    cloudOpacity:.26,mist:0x668698,mistOpacity:.28
  })
});

export function getLightingPreset(mode='day') {
  return LIGHTING_PRESETS[mode] ?? LIGHTING_PRESETS.day;
}
