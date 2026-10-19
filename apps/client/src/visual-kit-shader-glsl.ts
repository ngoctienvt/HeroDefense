/**
 * Runtime GLSL for the kit's stable-shape layers (toon-stepped, palette-driven).
 *
 * Fixed style ingredients, NOT switchable by any uniform: three hard toon steps, dark ink contour,
 * bright foam/rim edge and fbm noise that breaks perfect geometry. Recipes only tune parameters.
 * Optional `uMask` slot (compiled only when a mask texture is passed, defines MASK): its alpha
 * channel multiplies the layer's alpha so a hero can carve a signature motif into ground/shell/slash.
 */
export const KIT_MASK_DEFINE = 'MASK';

const PALETTE = `
uniform vec3 uDeep, uBody, uEdge, uFoam, uInk;
`;

const MASK = `
#ifdef MASK
uniform sampler2D uMask;
float kitMask(vec2 uv) { return texture2D(uMask, uv).a; }
#else
float kitMask(vec2 uv) { return 1.0; }
#endif
`;

const NOISE = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = .5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 7.1; a *= .5; }
  return v;
}
// Three hard toon steps, matching the cel-shaded hero sprites.
float toon(float v) { return v < .38 ? 0.0 : v < .66 ? .5 : 1.0; }
`;

const FLAT_VERTEX = `precision highp float;
attribute vec3 position; attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;

// Flat disc: telegraph, aura, flood floor, feet swirl. uBand 0 = full pool, 1 = ring band only.
// Saturated water + dark ink contour so it reads as water on the bright battlefield, not a grey film.
const GROUND_FRAGMENT = `precision highp float;
varying vec2 vUv;
uniform float uTime, uAlpha, uFill, uRim, uSwirl, uRings, uBand, uSpiral;
${PALETTE}${NOISE}${MASK}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  float spin = uSwirl * uTime * (1.4 - r);
  vec2 q = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * p;
  float n = fbm(q * 2.6 + vec2(uTime * .12, -uTime * .1));
  float n2 = fbm(q * 5.5 + n * 1.4 - uTime * .25);
  float caustic = pow(1.0 - abs(n2 * 2.0 - 1.0), 7.0);
  vec3 color = mix(uDeep, uBody, smoothstep(.32, .62, n));
  color = mix(color, uEdge, caustic * .85);
  // Spiral currents drawn as soft foam streaks.
  float spiral = smoothstep(.86, .95, sin(a * 3.0 + r * 9.0 - uTime * (1.2 + uSwirl * .6) + n * 3.0)) * smoothstep(.25, .5, r) * uSpiral;
  color = mix(color, uFoam, spiral * .55);
  float inner = mix(1.0, smoothstep(.42, .72, r), uBand);
  float rr = r + .018 * sin(a * 13.0 + uTime * 2.2) + .012 * sin(a * 29.0 - uTime * 3.1);
  float foam = smoothstep(.875, .905, rr) * (1.0 - smoothstep(.962, .985, rr));
  foam *= .65 + .35 * step(.32, vnoise(vec2(a * 11.0 + uTime * 1.6, 2.0)));
  float ink = smoothstep(.975, .99, r) * (1.0 - smoothstep(.995, 1.0, r));
  float ripple = smoothstep(.94, 1.0, sin(r * 24.0 - uTime * 4.0)) * uRings * (1.0 - r) * inner;
  color = mix(color, uFoam, max(foam * uRim, ripple * .7));
  color = mix(color, uInk, ink * uRim);
  float alpha = inner * uFill * (.55 + .3 * n) + inner * caustic * .3 * uFill + spiral * .45 * inner * uFill
    + foam * uRim + ink * .7 * uRim + ripple * .4;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * uAlpha * kitMask(vUv));
}`;

// Tsunami wall: a lofted ring. uv.x = angle fraction, uv.y = profile t,
// uv2 = standing profile (dr, z), uv3 = crashed profile (dr, z).
const WALL_VERTEX = `precision highp float;
attribute vec3 position; attribute vec2 uv; attribute vec2 uv2; attribute vec2 uv3;
uniform mat4 worldViewProjection;
uniform float uRadius, uCrash, uHeight, uThick, uTime;
varying vec2 vUv; varying float vY;
void main() {
  float a = uv.x * 6.2831853;
  float h = 1.0 + .18 * sin(7.0 * a) + .1 * sin(13.0 * a + 1.0) + .07 * sin(5.0 * a + uTime * 3.0);
  h = mix(h, 1.0, uCrash * .8);
  vec2 pr = mix(uv2, uv3, uCrash);
  float r = max(.05, uRadius + pr.x * uThick);
  float y = pr.y * h * uHeight;
  vUv = uv; vY = pr.y / 1.62;
  gl_Position = worldViewProjection * vec4(r * cos(a), y, r * sin(a), 1.0);
}`;

const WALL_FRAGMENT = `precision highp float;
varying vec2 vUv; varying float vY;
uniform float uTime, uAlpha, uDissolve, uCrash;
${PALETTE}${NOISE}
void main() {
  float a = vUv.x * 6.2831853, t = vUv.y;
  vec2 around = vec2(cos(a), sin(a));
  float sheet = fbm(around * 9.0 + vec2(0.0, vY * 2.5 - uTime * 1.8));
  float white = fbm(around * 5.0 + vec2(uTime * .7, t * 1.5));
  if (white < uDissolve) discard;
  // Height-lit body: dark foot, translucent teal near the top where light passes through the crest.
  vec3 color = mix(uDeep, uBody, smoothstep(0.0, .65, vY));
  color = mix(color, uEdge, smoothstep(.55, .95, vY) * .65);
  color = mix(color, uEdge, smoothstep(.62, .7, sheet) * .45);
  // Profile t: 0-.2 inner back slope, .22-.58 crest + curling lip, rest is the outward face.
  float back = 1.0 - smoothstep(.12, .22, t);
  float crest = smoothstep(.2, .28, t) * (1.0 - smoothstep(.52, .62, t));
  float face = smoothstep(.55, .66, t);
  float foam = crest * smoothstep(.32, .42, white);
  foam = max(foam, face * smoothstep(.55, .72, white) * smoothstep(.35, .7, vY));
  // Crashing: the dark body breaks into churning whitewater instead of a dark ring.
  color = mix(color, mix(uEdge, uFoam, .35), uCrash * .7);
  foam = max(foam, uCrash * smoothstep(.3, .55, white));
  color = mix(color, uFoam, foam);
  float alpha = back * .55 + crest * .95 + face * .9 + (1.0 - back - crest - face) * .9;
  alpha = clamp(alpha, 0.0, 1.0) * (1.0 - uCrash * .45) * mix(1.0, smoothstep(.25, .5, white), uCrash);
  gl_FragColor = vec4(color, alpha * uAlpha);
}`;

// Black ice floor: glossy dark sheet, sparse thin cracks, frost at the rim, gaps open between plates on shatter.
const ICE_FRAGMENT = `precision highp float;
varying vec2 vUv;
uniform float uTime, uAlpha, uSpread, uShatter;
${PALETTE}${NOISE}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p), a = atan(p.y, p.x);
  float edge = uSpread * (.93 + .07 * vnoise(vec2(a * 5.0, 1.0)));
  if (r > edge) discard;
  vec2 g = p * 4.2, cell = floor(g), id = cell, other = cell;
  float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 c = cell + vec2(x, y);
    float d = length(g - c - hash2(c));
    if (d < d1) { d2 = d1; other = id; d1 = d; id = c; } else if (d < d2) { d2 = d; other = c; }
  }
  float seed = hash(id);
  float gap = d2 - d1;
  if (seed < uShatter || gap < uShatter * .16) discard;
  // Only some plate borders crack; radial cracks run from the impact point.
  float crackEdge = step(.45, hash(id + other)) * (1.0 - smoothstep(.015, .035, gap));
  // Lines where fract(...) is near 0/1, i.e. |fract - .5| close to .5; a few irregular spokes only.
  float spoke = abs(fract(a / 6.2831853 * 7.0 + .45 * fbm(p * 2.2)) - .5);
  float radial = smoothstep(.482, .494, spoke) * smoothstep(.1, .3, r) * step(.35, hash(vec2(floor(a / 6.2831853 * 7.0 + .45 * fbm(p * 2.2)), 3.0)));
  float cloud = fbm(p * 3.0 + seed);
  vec3 color = mix(uDeep, uBody, smoothstep(.35, .75, cloud));
  float sweep = fract(uTime * .35) * 3.0 - 1.5;
  float sheen = 1.0 - smoothstep(0.0, .07, abs(dot(p, vec2(.83, .55)) - sweep));
  float frost = smoothstep(.7, 1.0, r / max(edge, .001)) * smoothstep(.55, .75, fbm(p * 9.0));
  color = mix(color, uEdge, max(max(crackEdge * .85, radial * .75), max(sheen * .35, frost * .7)));
  float rim = smoothstep(edge - .025, edge, r);
  color = mix(color, uEdge, rim);
  gl_FragColor = vec4(color, (.72 + .28 * max(max(crackEdge, radial), max(frost, rim))) * uAlpha);
}`;

const WARD_VERTEX = `precision highp float;
attribute vec3 position; attribute vec3 normal;
uniform mat4 world, worldViewProjection;
varying vec3 vNormal, vWorld, vLocal;
void main() {
  vLocal = position;
  vWorld = (world * vec4(position, 1.0)).xyz;
  vNormal = normalize((world * vec4(normal, 0.0)).xyz);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

// Shell: fresnel rim + spiral currents flowing upward.
const WARD_FRAGMENT = `precision highp float;
varying vec3 vNormal, vWorld, vLocal;
uniform vec3 cameraPosition;
uniform float uTime, uAlpha, uDissolve;
${PALETTE}${NOISE}${MASK}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(normalize(vNormal), v)), 2.0);
  float a = atan(vLocal.z, vLocal.x);
  float flow = fbm(vec2(a * 2.5 + vLocal.y * 3.0 - uTime * 1.6, vLocal.y * 2.0 - uTime * .8));
  if (flow < uDissolve) discard;
  float streak = smoothstep(.58, .66, flow);
  vec3 color = mix(uBody, uEdge, toon(fres + flow * .3));
  color = mix(color, uFoam, streak * (.4 + .6 * fres));
  float foot = smoothstep(-.5, -.35, vLocal.y);
  float alpha = (fres * .8 + streak * .35 + .06) * foot;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * uAlpha * kitMask(vec2(a / 6.2831853 + .5, vLocal.y + .5)));
}`;

// Basic attack: crescent of water across the front half (local +V = forward), sweeping right -> left.
const CLEAVE_FRAGMENT = `precision highp float;
varying vec2 vUv;
uniform float uTime, uAlpha, uHead, uTail;
${PALETTE}${NOISE}${MASK}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p), ang = atan(p.x, p.y);
  const float H = 1.72;
  if (abs(ang) > H) discard;
  float s = 1.0 - (ang + H) / (2.0 * H);
  if (s > uHead || s < uTail) discard;
  float span = max(.001, uHead - uTail), local = (s - uTail) / span;
  float width = .2 * smoothstep(0.0, .4, local) + .04;
  float d = r - .78;
  float band = 1.0 - smoothstep(width * .55, width, abs(d));
  if (band <= 0.0) discard;
  float n = fbm(vec2(ang * 7.0 - uTime * 7.0, r * 9.0));
  vec3 color = mix(uDeep, uBody, smoothstep(.3, .65, n + (d / width) * .4));
  color = mix(color, uEdge, smoothstep(.62, .72, n) * .7);
  float crest = smoothstep(.25, .75, d / width);
  float head = smoothstep(.8, 1.0, local);
  color = mix(color, uFoam, max(crest * step(.33, n), head * .85));
  float ink = smoothstep(.75, .95, abs(d) / width) * .6;
  color = mix(color, uInk, ink * (1.0 - crest));
  gl_FragColor = vec4(color, band * (.88 + .12 * n) * uAlpha * kitMask(vUv));
}`;

export interface KitShaderSource { vertex: string; fragment: string; attributes: string[]; uniforms: string[] }

const PALETTE_UNIFORMS = ['uDeep', 'uBody', 'uEdge', 'uFoam', 'uInk'];

export const KIT_SHADER_SOURCES = {
  kitGround: { vertex: FLAT_VERTEX, fragment: GROUND_FRAGMENT, attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'uTime', 'uAlpha', 'uFill', 'uRim', 'uSwirl', 'uRings', 'uBand', 'uSpiral', ...PALETTE_UNIFORMS] },
  kitWall: { vertex: WALL_VERTEX, fragment: WALL_FRAGMENT, attributes: ['position', 'uv', 'uv2', 'uv3'],
    uniforms: ['worldViewProjection', 'uRadius', 'uCrash', 'uHeight', 'uThick', 'uTime', 'uAlpha', 'uDissolve', ...PALETTE_UNIFORMS] },
  kitCrust: { vertex: FLAT_VERTEX, fragment: ICE_FRAGMENT, attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'uTime', 'uAlpha', 'uSpread', 'uShatter', ...PALETTE_UNIFORMS] },
  kitShell: { vertex: WARD_VERTEX, fragment: WARD_FRAGMENT, attributes: ['position', 'normal'],
    uniforms: ['world', 'worldViewProjection', 'cameraPosition', 'uTime', 'uAlpha', 'uDissolve', ...PALETTE_UNIFORMS] },
  kitSlash: { vertex: FLAT_VERTEX, fragment: CLEAVE_FRAGMENT, attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'uTime', 'uAlpha', 'uHead', 'uTail', ...PALETTE_UNIFORMS] },
} satisfies Record<string, KitShaderSource>;
