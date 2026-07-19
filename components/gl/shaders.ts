// One WebGL2 program shared by every story — see build.md §3.7.
export const VERTEX_SRC = `#version 300 es
void main() {
  vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FRAGMENT_SRC = `#version 300 es
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;   // 0..1, y up
uniform vec3  u_accent;    // story accent, linearized 0..1 rgb
uniform float u_field;     // 0 = ink, 1 = cream
uniform int   u_story;     // 0..9, plus 10 = overture warp (setup-only, build4 §2.2)
uniform int   u_pattern;   // club pattern id
uniform float u_progress;  // phase progress 0..1
uniform float u_fade;      // story crossfade 0..1
out vec4 frag;

const vec3 INK   = vec3(0.059, 0.059, 0.059);   // #0f0f0f
const vec3 CREAM = vec3(1.000, 0.965, 0.878);   // #fff6e0

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

// Accent runner (build4 §2.1): returns 1.0 on the stripe/ring whose index
// the runner is currently crossing. idx = which band this fragment is in;
// n = band count. The runner sweeps continuously (not stepped) and wraps
// with a 25% rest gap.
float runner(float idx, float n, float t) {
  float pos = mod(t * 2.2, n * 1.25);          // 2.2 bands/sec, wraps past the end
  return smoothstep(1.0, 0.0, abs(idx - pos)); // soft one-band-wide highlight
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;               // 0..1
  vec2 p  = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;  // centered, aspect-correct
  vec3 base = mix(INK, CREAM, u_field);
  vec3 col = base;
  float d = distance(uv, u_pointer);

  if (u_story == 0) {            // THE YEAR: diagonal stripe band, accent runner (build4 §2.1)
    float band = smoothstep(0.19, 0.18, uv.y) + 0.5 * smoothstep(0.91, 0.92, uv.y);
    float sIdx = floor((p.x + p.y) * 22.0);
    float stripe = step(0.5, fract((p.x + p.y) * 11.0));
    vec3 stripeCol = mix(base, CREAM * 0.92, stripe * 0.85);
    stripeCol = mix(stripeCol, u_accent, stripe * runner(sIdx, 30.0, u_time) * 0.9);
    col = mix(col, stripeCol, band);
  } else if (u_story == 1) {     // MOMENTS: warm paper grain + breathing vignette
    col -= (fbm(p * 5.0 + u_time * 0.02) - 0.5) * 0.035;
    col -= smoothstep(0.45, 1.1, length(p)) * 0.06 * (0.8 + 0.2 * sin(u_time * 0.4));
  } else if (u_story == 2) {     // BUILT: stripe circle, accent runner (build4 §2.1)
    vec2 c = vec2(-0.30, -0.75);
    float inCircle = smoothstep(0.68, 0.66, length(p - c));
    float sIdx = floor(uv.x * 16.0);
    float stripe = step(0.5, fract(uv.x * 8.0));
    vec3 sc = mix(base, CREAM * 0.92, stripe * 0.8);
    sc = mix(sc, u_accent, stripe * runner(sIdx, 22.0, u_time) * 0.9);
    col = mix(col, sc, inCircle);
  } else if (u_story == 3) {     // PEOPLE: quarter-rings, accent runner (build4 §2.1)
    vec2 c = vec2(-0.42, -0.95);                  // anchor: bottom-left, off-frame
    float r = length(p - c);
    float rIdx = floor(r * 14.0);
    float ring = step(0.5, fract(r * 7.0));
    float mask = smoothstep(1.15, 0.55, r);       // fade out past ~half the frame
    vec3 ringCol = mix(base, INK, ring * 0.88);
    ringCol = mix(ringCol, u_accent, ring * runner(rIdx, 16.0, u_time) * 0.95);
    col = mix(col, ringCol, mask);
  } else if (u_story == 4) {     // YOUR EVENTS: constellation — twinkling attendance stars
    vec2 cell = floor(p * 10.0); vec2 fp = fract(p * 10.0);
    float star = smoothstep(0.06, 0.0, length(fp - 0.5 - 0.3 * (vec2(hash(cell), hash(cell + 7.0)) - 0.5)));
    float tw = 0.5 + 0.5 * sin(u_time * (1.0 + hash(cell) * 2.0) + hash(cell) * 6.28);
    col += u_accent * star * tw * 0.35;
  } else if (u_story == 5) {     // STANDING: stamp shockwave rings on reveal
    float ring = abs(length(p) - u_progress * 1.2);
    col -= smoothstep(0.06, 0.0, ring) * 0.10 * (1.0 - u_progress);
    col -= (fbm(p * 4.0) - 0.5) * 0.03;
  } else if (u_story == 6) {     // YOUR CHAPTER: green aurora flow, left to right
    float a = fbm(vec2(p.x * 2.0 - u_time * 0.06, p.y * 3.0));
    col += u_accent * smoothstep(0.55, 0.9, a) * 0.16;
  } else if (u_story == 7) {     // YOUR CLUB: full-bleed accent + pattern + iridescent foil
    col = u_accent * mix(0.72, 1.0, uv.y);
    float pat = 0.0;
    vec2 q = p * 16.0;
    if (u_pattern == 0)      pat = max(smoothstep(0.9, 1.0, abs(fract(q.x) - 0.5) * 2.0),
                                       smoothstep(0.9, 1.0, abs(fract(q.y) - 0.5) * 2.0));
    else if (u_pattern == 1) pat = smoothstep(0.85, 1.0, sin(length(p - vec2(0.0, -1.2)) * 40.0) * 0.5 + 0.5);
    else if (u_pattern == 2) pat = smoothstep(0.35, 0.25, length(fract(q * 0.75) - 0.5));
    else                     pat = smoothstep(0.85, 1.0, sin((p.x + p.y) * 45.0) * 0.5 + 0.5);
    col = mix(col, INK, pat * 0.13);
    vec3 iri = 0.5 + 0.5 * cos(6.2832 * (d * 2.2 - u_time * 0.08 + vec3(0.0, 0.33, 0.67)));
    col += iri * exp(-3.5 * d) * 0.18;                 // thin-film foil chasing the pointer
  } else if (u_story == 8) {     // WHAT'S NEXT: cream field, rising ember motes in green
    vec2 e = fract(p * 4.0 - vec2(0.0, u_time * 0.05));
    float m = smoothstep(0.05, 0.0, length(e - 0.5)) * step(0.72, hash(floor(p * 4.0 - vec2(0.0, u_time * 0.05))));
    col -= vec3(0.02) * fbm(p * 5.0);
    col = mix(col, u_accent, m * 0.5);
  } else if (u_story == 9) {     // SUMMARY: near-still vignette + four faint orbiting dots
    col -= smoothstep(0.5, 1.15, length(p)) * 0.08;
    for (int i = 0; i < 4; i++) {
      float ang = u_time * 0.1 + float(i) * 1.5708;
      vec3 dotc = i == 0 ? vec3(0.26, 0.52, 0.96) : i == 1 ? vec3(0.92, 0.26, 0.21)
                : i == 2 ? vec3(0.98, 0.67, 0.00) : vec3(0.20, 0.66, 0.33);
      col += dotc * exp(-9.0 * distance(p, 0.42 * vec2(cos(ang), sin(ang)))) * 0.08;
    }
  } else if (u_story == 10) {    // OVERTURE: full-screen checker×ring warp (build4 §2.2)
    vec2 c1 = vec2(0.0, 0.55 * sin(u_time * 0.21));
    float d1 = length(p - c1);
    // radial displacement wave: checker cells bend around the moving center
    vec2 warped = p + normalize(p - c1 + 1e-4) * 0.10 * sin(d1 * 18.0 - u_time * 1.6);
    float cx = step(0.5, fract(warped.x * 5.0));
    float cy = step(0.5, fract(warped.y * 5.0));
    float checker = abs(cx - cy);              // 1.0 on alternating cells
    float rings = step(0.5, fract(d1 * 9.0 - u_time * 0.35));
    float fig = mix(checker, rings, smoothstep(0.75, 0.2, d1)); // rings near center, checker out
    col = mix(CREAM * 0.96, INK, fig * 0.92);
  }

  col = mix(base, col, u_fade);
  frag = vec4(col, 1.0);
}`;

export function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export const ACCENT_HEX = {
  blue: "#4285f4",
  red: "#ea4335",
  yellow: "#faab00",
  green: "#34a853",
} as const;

export function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  if (!vs) return null;
  gl.shaderSource(vs, VERTEX_SRC);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    gl.deleteShader(vs);
    return null;
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fs) return null;
  gl.shaderSource(fs, FRAGMENT_SRC);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}
