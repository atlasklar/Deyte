/* Fragment shaders for the coach orb and the landing page's liquid backdrop. */

const NOISE = `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}
`;

/**
 * A glowing liquid sphere. uEnergy: 0 idle → 1 thinking (faster flow, brighter
 * halo). uMix: 0 molten bronze → 1 sapphire.
 */
export const ORB_FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uEnergy;
uniform float uMix;
${NOISE}
vec3 blob(vec2 p, vec2 c, float r, vec3 col) {
  vec2 d = p - c;
  return col * exp(-dot(d, d) / (r * r));
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float r = length(uv);
  float ang = atan(uv.y, uv.x);
  float e = uEnergy;
  float t = uTime * (0.22 + 0.55 * e);

  // Breathing, slightly liquid silhouette
  float R = 0.31 + 0.008 * sin(uTime * 0.9) + 0.012 * e;
  R += (0.005 + 0.010 * e) * sin(ang * 3.0 + t * 2.0) + (0.003 + 0.007 * e) * sin(ang * 5.0 - t * 1.6);

  vec2 p = uv / R;
  float d = length(p);
  float z = sqrt(max(0.0, 1.0 - d * d));
  vec3 n = normalize(vec3(p, z + 0.0001));

  vec3 bronze = vec3(1.0, 0.50, 0.32);
  vec3 ember = vec3(1.0, 0.32, 0.22);
  vec3 champagne = vec3(1.0, 0.86, 0.76);
  vec3 sapph = vec3(0.26, 0.45, 1.0);
  vec3 ice = vec3(0.60, 0.84, 1.0);

  // Liquid warp, wrapped around the sphere
  vec2 q = p * (0.9 + 0.25 * z);
  vec2 w = vec2(fbm(q * 1.6 + vec2(t * 0.6, -t * 0.4)), fbm(q * 1.6 + vec2(-t * 0.5, t * 0.7) + 4.7)) - 0.5;
  q += w * (0.55 + 0.25 * e);

  // Coloured lights drifting inside the glass
  vec3 c = vec3(0.06, 0.035, 0.035);
  c += blob(q, vec2(sin(t * 0.9) * 0.45, cos(t * 0.7) * 0.40), 0.78, bronze * 1.05);
  c += blob(q, vec2(cos(t * 0.6 + 2.0) * 0.50, sin(t * 0.8 + 1.0) * 0.45), 0.60, ember * 0.85);
  c += blob(q, vec2(sin(t * 0.5 + 4.0) * 0.55, cos(t * 0.9 + 3.0) * 0.50), 0.72, sapph * (0.55 + 0.9 * uMix));
  c += blob(q, vec2(cos(t * 1.1 + 5.0) * 0.40, sin(t * 0.6 + 2.0) * 0.40), 0.45, ice * (0.25 + 0.7 * uMix));
  c += blob(q, vec2(-0.22, 0.28) + 0.12 * vec2(sin(t), cos(t * 0.8)), 0.38, champagne * 0.4);

  // Fine filaments for the liquid-metal feel
  float f = fbm(q * 2.4 + w * 2.0 + t * 0.35);
  c *= 0.72 + 0.62 * f;

  // Lighting: soft key, glassy highlight, luminous rim
  vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
  c *= 0.82 + 0.32 * max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
  float fres = pow(1.0 - z, 2.4);
  vec3 rimCol = mix(vec3(1.0, 0.62, 0.48), vec3(0.55, 0.70, 1.0), 0.5 + 0.5 * sin(ang + t * 1.2));
  c += rimCol * fres * (0.7 + 0.5 * e);
  c += vec3(1.0, 0.96, 0.92) * spec * 0.4;
  c *= 1.0 + 0.25 * e;
  c = 1.0 - exp(-c * 1.3);

  float inside = smoothstep(1.0, 0.982, d);

  // Halo, faded to nothing before the canvas edge
  float outer = max(r - R, 0.0);
  float halo = exp(-outer * (11.0 - 3.0 * e)) * (0.34 + 0.32 * e) + exp(-outer * 4.0) * (0.07 + 0.08 * e);
  halo *= smoothstep(0.5, 0.34, r);
  vec3 haloCol = mix(vec3(1.0, 0.45, 0.30), vec3(0.36, 0.50, 1.0), clamp(0.5 + 0.4 * sin(ang - t * 0.8) + (uMix - 0.5) * 0.6, 0.0, 1.0));

  vec3 rgb = c * inside + haloCol * halo * (1.0 - inside);
  float a = clamp(inside + halo * (1.0 - inside), 0.0, 1.0);
  gl_FragColor = vec4(min(rgb, vec3(1.0)), a);
}
`;
