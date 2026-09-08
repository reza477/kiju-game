// A shared, deterministic breeze field. Time is seconds; x/z are world metres.
// x/z in the result are horizontal drift in metres/second; gust is bounded 0..1.
export function windAt(time, x = 0, z = 0, out = {}) {
  const gust = .5 + .30 * Math.sin(time * .17 - x * .006 + z * .009) + .20 * Math.sin(time * .071 + x * .003 - z * .008);
  const angle = .57 + Math.sin(time * .027) * .19 + Math.sin(x * .004 + z * .003) * .07;
  const speed = .32 + gust * .83;
  out.x = Math.cos(angle) * speed; out.z = Math.sin(angle) * speed; out.gust = gust; return out;
}

// Exact shader counterpart: result.xy is horizontal drift, result.z is gust.
export const WIND_GLSL = `
vec3 worldWind(float time, vec2 p) {
  float gust = .5 + .30 * sin(time * .17 - p.x * .006 + p.y * .009) + .20 * sin(time * .071 + p.x * .003 - p.y * .008);
  float angle = .57 + sin(time * .027) * .19 + sin(p.x * .004 + p.y * .003) * .07;
  float speed = .32 + gust * .83;
  return vec3(cos(angle) * speed, sin(angle) * speed, gust);
}
`;
