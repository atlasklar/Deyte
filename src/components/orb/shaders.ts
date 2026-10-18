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
 * The coach: a glossy liquid creature. Its body is a few blobs melted
 * together that drift and breathe; two glowing capsule eyes blink, glance
 * around and look where you look.
 * uEnergy 0 idle → 1 thinking · uMix 0 ember → 1 sapphire
 * uLook (-1..1, -1..1) gaze · uOpen 0 closed → 1 open (blinks) · uSquint 0..1
 */
export const ORB_FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uEnergy;
uniform float uMix;
uniform vec2 uLook;
uniform float uOpen;
uniform float uSquint;
${NOISE}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float body(vec2 p, float t, float e) {
  float breathe = 1.0 + 0.018 * sin(uTime * 1.3);
  p /= breathe;
  // Lean slightly toward where it's looking
  p -= uLook * vec2(0.018, 0.012);
  float wob = 0.6 + 0.8 * e;
  float d = length(p) - 0.215;
  vec2 c1 = vec2(cos(t * 0.9), sin(t * 1.1)) * 0.085 * wob;
  vec2 c2 = vec2(cos(t * 0.7 + 2.1), sin(t * 0.8 + 1.3)) * 0.095 * wob;
  vec2 c3 = vec2(cos(t * 1.2 + 4.0), sin(t * 0.6 + 3.1)) * 0.08 * wob;
  d = smin(d, length(p - c1) - 0.15, 0.11);
  d = smin(d, length(p - c2) - 0.14, 0.11);
  d = smin(d, length(p - c3) - 0.13, 0.11);
  // A hint of a chin so it reads as a creature, not a ball
  d = smin(d, length((p - vec2(0.0, -0.06)) * vec2(0.9, 1.25)) - 0.2, 0.08);
  return d;
}
vec3 blob(vec2 p, vec2 c, float r, vec3 col) {
  vec2 d = p - c;
  return col * exp(-dot(d, d) / (r * r));
}
float capsule(vec2 p, float w, float h) {
  p = abs(p);
  p.y = max(p.y - h, 0.0);
  return length(p) - w;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float e = uEnergy;
  float t = uTime * (0.35 + 0.7 * e);
  float d = body(uv, t, e);

  // Fake 3D: normal from the distance field's slope, flatter in the middle
  vec2 eps = vec2(0.0015, 0.0);
  vec2 g = vec2(body(uv + eps.xy, t, e) - body(uv - eps.xy, t, e), body(uv + eps.yx, t, e) - body(uv - eps.yx, t, e));
  float depth = clamp(-d / 0.16, 0.0, 1.0);
  float z = sqrt(1.0 - (1.0 - depth) * (1.0 - depth));
  vec3 n = normalize(vec3(normalize(g + 1e-6) * (1.0 - z), z + 0.0001));

  vec3 ember = vec3(1.0, 0.36, 0.24);
  vec3 coral = vec3(1.0, 0.56, 0.42);
  vec3 cream = vec3(1.0, 0.88, 0.80);
  vec3 sapph = vec3(0.30, 0.46, 1.0);
  vec3 violet = vec3(0.56, 0.40, 1.0);

  vec2 q = uv * 2.6;
  vec2 w = vec2(fbm(q * 1.3 + vec2(t * 0.5, -t * 0.4)), fbm(q * 1.3 + vec2(-t * 0.4, t * 0.6) + 4.7)) - 0.5;
  q += w * 0.9;
  // Jewel-toned body: warm crown, violet-blue belly, colour drifting through
  vec3 c = mix(vec3(0.10, 0.05, 0.22), vec3(0.42, 0.10, 0.10), smoothstep(-0.28, 0.22, uv.y));
  c += blob(q, vec2(sin(t * 0.8) * 0.5, cos(t * 0.6) * 0.45 + 0.25), 0.75, coral * 0.75);
  c += blob(q, vec2(cos(t * 0.5 + 2.0) * 0.55, sin(t * 0.7 + 1.0) * 0.5), 0.6, ember * 0.6);
  c += blob(q, vec2(sin(t * 0.45 + 4.0) * 0.6, cos(t * 0.8 + 3.0) * 0.4 - 0.35), 0.75, mix(sapph, violet, 0.5 + 0.3 * sin(t * 0.3)) * (0.45 + 0.7 * uMix));
  c += blob(q, vec2(-0.3, 0.55) + 0.1 * vec2(sin(t), cos(t * 0.8)), 0.4, cream * 0.18);
  c *= 0.7 + 0.6 * fbm(q * 2.2 + w * 2.0 + t * 0.3);

  // Glossy lighting
  vec3 L = normalize(vec3(-0.45, 0.6, 0.7));
  c *= 0.78 + 0.34 * max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 36.0);
  float fres = pow(1.0 - z, 2.2);
  vec3 rim = mix(vec3(1.0, 0.6, 0.5), vec3(0.55, 0.65, 1.0), 0.5 + 0.5 * sin(atan(uv.y, uv.x) + t));
  c += rim * fres * (0.55 + 0.4 * e);
  c += vec3(1.0, 0.97, 0.94) * spec * 0.7;
  c = 1.0 - exp(-c * 1.15);

  // Eyes: soft glowing capsules that blink, squint and look around
  vec2 look = uLook * vec2(0.075, 0.05);
  vec2 ec = vec2(0.0, 0.035) + look;
  float open = clamp(uOpen, 0.04, 1.15) * (1.0 - 0.6 * uSquint);
  float h = 0.024 * open;
  vec2 pe = uv - ec;
  float spread = 0.068 + 0.006 * uSquint;
  float de = min(capsule(pe - vec2(-spread, 0.0), 0.019, h), capsule(pe - vec2(spread, 0.0), 0.019, h));
  float eye = smoothstep(0.003, -0.002, de);
  float eyeGlow = exp(-max(de, 0.0) * 55.0) * 0.6;
  vec3 eyeCol = mix(vec3(1.0, 0.97, 0.93), vec3(0.85, 0.92, 1.0), uMix * 0.5);
  float inside = smoothstep(0.002, -0.002, d);
  c = mix(c, eyeCol, eye * inside);
  c += eyeCol * eyeGlow * inside * (1.0 - eye);

  // Halo, fading out before the canvas edge
  float r = length(uv);
  float outer = max(d, 0.0);
  float halo = exp(-outer * (12.0 - 3.0 * e)) * (0.30 + 0.30 * e) + exp(-outer * 4.0) * (0.06 + 0.07 * e);
  halo *= smoothstep(0.5, 0.33, r);
  vec3 haloCol = mix(vec3(1.0, 0.45, 0.32), vec3(0.42, 0.48, 1.0), clamp(0.5 + 0.4 * sin(atan(uv.y, uv.x) - t * 0.8) + (uMix - 0.5) * 0.6, 0.0, 1.0));

  vec3 rgb = c * inside + haloCol * halo * (1.0 - inside);
  float a = clamp(inside + halo * (1.0 - inside), 0.0, 1.0);
  gl_FragColor = vec4(min(rgb, vec3(1.0)), a);
}
`;
