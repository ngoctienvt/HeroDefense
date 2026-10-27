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
uniform float uRadius, uCrash, uHeight, uThick, uTime, uLinear, uSpan, uBend;
varying vec2 vUv; varying float vY;
void main() {
  float a = uv.x * 6.2831853;
  float h = 1.0 + .18 * sin(7.0 * a) + .1 * sin(13.0 * a + 1.0) + .07 * sin(5.0 * a + uTime * 3.0);
  h = mix(h, 1.0, uCrash * .8);
  vec2 pr = mix(uv2, uv3, uCrash);
  float r = max(.05, uRadius + pr.x * uThick);
  float y = pr.y * h * uHeight;
  vUv = uv; vY = pr.y / 1.62;
  vec3 ring = vec3(r * cos(a), y, r * sin(a));
  float side = uv.x * 2.0 - 1.0;
  vec3 wall = vec3(pr.x * uThick - uBend * side * side, y, side * uSpan * .5);
  gl_Position = worldViewProjection * vec4(mix(ring, wall, uLinear), 1.0);
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

// Neutral guard bubble shared by every element: soft white fresnel rim, one slow glass sheen band and a dissolve edge for
// the break. No flowing/water noise on the surface, so it reads the same over fire, wood or ice heroes.
const GUARD_FRAGMENT = `precision highp float;
varying vec3 vNormal, vWorld, vLocal;
uniform vec3 cameraPosition;
uniform float uTime, uAlpha, uDissolve;
${PALETTE}${NOISE}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(normalize(vNormal), v)), 2.2);
  float crack = fbm(vLocal.xz * 5.0 + vLocal.y * 3.0);
  if (crack < uDissolve) discard;
  float edge = 1.0 - smoothstep(0.0, .09, crack - uDissolve) ;
  float sweep = fract(uTime * .22) * 3.0 - 1.5;
  float sheen = 1.0 - smoothstep(0.0, .16, abs(dot(vLocal.xy, vec2(.8, .6)) * 2.0 - sweep));
  float rim = smoothstep(.55, .85, fres);
  vec3 color = mix(uBody, uEdge, fres);
  color = mix(color, uFoam, max(rim * .7, max(sheen * .45, edge * uDissolve * 4.0)));
  float foot = smoothstep(-.5, -.38, vLocal.y);
  float alpha = (fres * .5 + rim * .35 + sheen * .12 * (1.0 - fres) + .04 + edge * .4 * step(.001, uDissolve)) * foot;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * uAlpha);
}`;

// Basic attack: crescent of water across the front half (local +V = forward), sweeping right -> left.
const CLEAVE_FRAGMENT = `precision highp float;
varying vec2 vUv;
uniform float uTime, uAlpha, uHead, uTail, uArc;
${PALETTE}${NOISE}${MASK}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p), ang = atan(p.x, p.y);
  float H = uArc;
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


// Ribbon from A (u=0) to B (u=1) on a stretched ground plane: bolts, chains, sound/vital threads.
// uHead/uTail sweep it like the slash; uWave wobbles the centre line; uTaper 1 narrows it to a point at B.
const LINK_FRAGMENT = `precision highp float;
varying vec2 vUv;
uniform float uTime, uAlpha, uHead, uTail, uWave, uTaper;
${PALETTE}${NOISE}${MASK}
void main() {
  float s = vUv.x;
  if (s > uHead || s < uTail) discard;
  float local = (s - uTail) / max(.001, uHead - uTail);
  float centre = .5 + sin(s * 21.0 - uTime * 16.0) * uWave * .22;
  float halfW = mix(1.0, 1.0 - s, uTaper) * (.35 + .65 * smoothstep(0.0, .3, local));
  float d = (vUv.y - centre) / max(.02, halfW * .5);
  float band = 1.0 - smoothstep(.62, 1.0, abs(d));
  if (band <= 0.0) discard;
  float n = fbm(vec2(s * 14.0 - uTime * 6.0, d * 2.0));
  vec3 color = mix(uDeep, uBody, smoothstep(.25, .6, n + (1.0 - abs(d)) * .35));
  color = mix(color, uEdge, smoothstep(.55, .72, n) * .6);
  float core = 1.0 - smoothstep(.0, .38, abs(d));
  color = mix(color, uFoam, core * step(.3, n + core * .4) * smoothstep(.0, .6, local));
  color = mix(color, uInk, smoothstep(.72, .95, abs(d)) * .7);
  gl_FragColor = vec4(color, band * uAlpha * kitMask(vUv));
}`;

// Solid cast object (Kim Tra's real-time bell, more to come): opaque, depth-writing, lit with the same three hard
// toon steps as the sprites from a key light above and in front (uLightDir, wrapped so no side goes black). COLOR_0.g marks raised cast parts (polished highlight).
// uReveal grows the object top-down out of a glowing seam (forming); uBurn dissolves it into embers; uFlash = slam glint.
// Engraving is drawn here from the local shape (bell: lower meander band, panel frames, shoulder clouds) so the mesh
// stays light; uEngrave 0 turns it off for other solids.
const SOLID_VERTEX = `precision highp float;
attribute vec3 position; attribute vec3 normal; attribute vec4 color;
uniform mat4 world, worldViewProjection;
varying vec3 vNormal, vWorld, vLocal; varying vec4 vColor;
void main() {
  vLocal = position; vColor = color;
  vWorld = (world * vec4(position, 1.0)).xyz;
  vNormal = normalize((world * vec4(normal, 0.0)).xyz);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

const SOLID_CUT = `
uniform float uReveal, uBurn, uTop;
// < 0 = cut away. Seam distance in local units, used for the glowing edge.
float solidCut(vec3 p, out float seam) {
  float n = fbm(p.xz * 7.0 + p.y * 5.0);
  float level = uTop - uReveal * (uTop + .12) + (n - .5) * .08;
  float reveal = p.y - level;
  float burn = n + p.y * .15 - uBurn * 1.25;
  seam = min(reveal * 6.0, burn * 5.0);
  return min(reveal, burn);
}`;

const SOLID_FRAGMENT = `precision highp float;
varying vec3 vNormal, vWorld, vLocal; varying vec4 vColor;
uniform vec3 cameraPosition, uLightDir;
uniform float uTime, uFlash, uEngrave;
${PALETTE}${NOISE}${SOLID_CUT}
float engraving(vec3 p) {
  float a = atan(p.z, p.x) / 6.2831853 + .5;
  float h = p.y, line = 0.0;
  // thunder meander band above the lip hoop
  if (h > .075 && h < .245) {
    vec2 c = vec2(a * 40.0, (h - .075) / .17 * 2.0);
    vec2 f = abs(fract(c) - .5);
    float sq = max(f.x, f.y);
    line = max(line, step(.44, sq) * .6 + (1.0 - smoothstep(.03, .06, abs(fract(sq * 3.0) - .5))) * step(sq, .4));
  }
  // frames around the four boss panels between the hoops (panels centred on 45 deg + k * 90 deg)
  if (h > .30 && h < .64) {
    float pa = fract(a * 4.0) - .5, w = .17;
    float vert = (1.0 - smoothstep(.006, .016, abs(abs(pa) - w))) * step(.31, h) * step(h, .63);
    float hor = (1.0 - smoothstep(.003, .008, min(abs(h - .315), abs(h - .625)))) * step(abs(pa), w);
    line = max(line, max(vert, hor));
    // cloud scrolls in the strips between panels
    float between = smoothstep(.2, .22, abs(pa));
    line = max(line, between * (1.0 - smoothstep(.04, .09, abs(sin(h * 40.0 + sin(a * 75.0) * 1.4)))) * .7);
  }
  // shoulder clouds
  if (h > .70 && h < .9) line = max(line, (1.0 - smoothstep(.05, .1, abs(sin(a * 56.5 + sin(h * 25.0) * 1.6)))) * .6);
  return line * uEngrave;
}
void main() {
  float seam;
  if (solidCut(vLocal, seam) < 0.0) discard;
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // wrapped (hemispheric-like) light so no side goes black; three hard steps: warm shadow, body, lit
  float wrap = .5 + .5 * dot(n, normalize(uLightDir));
  float grain = fbm(vLocal.xz * 9.0 + vLocal.y * 13.0);
  float shade = toon(wrap * .86 + (grain - .5) * .1);
  vec3 color = shade < .25 ? mix(uDeep, uBody, .45) : shade < .75 ? uBody : mix(uBody, uEdge, .6);
  float raised = vColor.g;
  vec3 h = normalize(normalize(uLightDir) + v);
  float spec = step(.9 - raised * .12, max(0.0, dot(n, h)));
  color = mix(color, uFoam, spec * (.45 + raised * .4));
  float fres = 1.0 - abs(dot(n, v));
  color = mix(color, uEdge, smoothstep(.55, .8, fres) * .5);
  color = mix(color, uInk, engraving(vLocal) * (1.0 - raised) * .55);
  float glow = 1.0 - smoothstep(.0, 1.0, seam);
  color = mix(color, uFoam, max(glow, uFlash * (.35 + .65 * fres)));
  gl_FragColor = vec4(color, 1.0);
}`;

// Inverted hull for the solid's ink contour: the same mesh pushed out along its normals, back faces only.
const INK_VERTEX = `precision highp float;
attribute vec3 position; attribute vec3 normal;
uniform mat4 worldViewProjection;
uniform float uInkWidth;
varying vec3 vLocal;
void main() { vLocal = position; gl_Position = worldViewProjection * vec4(position + normal * uInkWidth, 1.0); }`;

const INK_FRAGMENT = `precision highp float;
varying vec3 vLocal;
uniform float uTime;
${PALETTE}${NOISE}${SOLID_CUT}
void main() {
  float seam;
  if (solidCut(vLocal, seam) < 0.0) discard;
  gl_FragColor = vec4(uInk, 1.0);
}`;

// Weapon trail of a 3D hero model: a ribbon swept by two sockets on the weapon (base → tip). uv.x = age along the
// trail (0 newest .. 1 oldest), uv.y = 0 at the base socket .. 1 at the tip. Bright leading edge at the tip, ink lip,
// fbm streaks; fades with age. Positions are written in world space every frame by visual-hero-trail.ts.
const TRAIL_FRAGMENT = `precision highp float;
varying vec2 vUv;
uniform float uTime, uAlpha;
${PALETTE}${NOISE}
void main() {
  float age = vUv.x, w = vUv.y;
  float n = fbm(vec2(age * 7.0 - uTime * 4.0, w * 3.5));
  // body fades with age and toward the base; streaks of the noise break it into two hard alpha steps
  float body = smoothstep(.0, .35, w) * (1.0 - smoothstep(.35, 1.0, age + (n - .5) * .25));
  float alpha = body * (n > .45 ? .9 : .55);
  if (alpha < .04) discard;
  vec3 color = mix(uBody, uEdge, smoothstep(.25, .7, w));
  float lead = smoothstep(.62, .92, w) * (1.0 - smoothstep(.0, .55, age));
  color = mix(color, uFoam, lead);
  color = mix(color, uInk, smoothstep(.95, 1.0, w) * .6 + (1.0 - smoothstep(.0, .08, w)) * .4);
  gl_FragColor = vec4(color, clamp(alpha + lead * .1, 0.0, 1.0) * uAlpha);
}`;

export interface KitShaderSource { vertex: string; fragment: string; attributes: string[]; uniforms: string[] }

const PALETTE_UNIFORMS = ['uDeep', 'uBody', 'uEdge', 'uFoam', 'uInk'];

export const KIT_SHADER_SOURCES = {
  kitGround: { vertex: FLAT_VERTEX, fragment: GROUND_FRAGMENT, attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'uTime', 'uAlpha', 'uFill', 'uRim', 'uSwirl', 'uRings', 'uBand', 'uSpiral', ...PALETTE_UNIFORMS] },
  kitWall: { vertex: WALL_VERTEX, fragment: WALL_FRAGMENT, attributes: ['position', 'uv', 'uv2', 'uv3'],
    uniforms: ['worldViewProjection', 'uRadius', 'uCrash', 'uHeight', 'uThick', 'uTime', 'uAlpha', 'uDissolve', 'uLinear', 'uSpan', 'uBend', ...PALETTE_UNIFORMS] },
  kitCrust: { vertex: FLAT_VERTEX, fragment: ICE_FRAGMENT, attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'uTime', 'uAlpha', 'uSpread', 'uShatter', ...PALETTE_UNIFORMS] },
  kitShell: { vertex: WARD_VERTEX, fragment: WARD_FRAGMENT, attributes: ['position', 'normal'],
    uniforms: ['world', 'worldViewProjection', 'cameraPosition', 'uTime', 'uAlpha', 'uDissolve', ...PALETTE_UNIFORMS] },
  kitGuard: { vertex: WARD_VERTEX, fragment: GUARD_FRAGMENT, attributes: ['position', 'normal'],
    uniforms: ['world', 'worldViewProjection', 'cameraPosition', 'uTime', 'uAlpha', 'uDissolve', ...PALETTE_UNIFORMS] },
  kitSlash: { vertex: FLAT_VERTEX, fragment: CLEAVE_FRAGMENT, attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'uTime', 'uAlpha', 'uHead', 'uTail', 'uArc', ...PALETTE_UNIFORMS] },
  kitLink: { vertex: FLAT_VERTEX, fragment: LINK_FRAGMENT, attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'uTime', 'uAlpha', 'uHead', 'uTail', 'uWave', 'uTaper', ...PALETTE_UNIFORMS] },
  kitTrail: { vertex: FLAT_VERTEX, fragment: TRAIL_FRAGMENT, attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'uTime', 'uAlpha', ...PALETTE_UNIFORMS] },
  kitSolid: { vertex: SOLID_VERTEX, fragment: SOLID_FRAGMENT, attributes: ['position', 'normal', 'color'],
    uniforms: ['world', 'worldViewProjection', 'cameraPosition', 'uLightDir', 'uTime', 'uFlash', 'uEngrave', 'uReveal', 'uBurn',
      'uTop', ...PALETTE_UNIFORMS] },
  kitInk: { vertex: INK_VERTEX, fragment: INK_FRAGMENT, attributes: ['position', 'normal'],
    uniforms: ['worldViewProjection', 'uInkWidth', 'uTime', 'uReveal', 'uBurn', 'uTop', ...PALETTE_UNIFORMS] },
} satisfies Record<string, KitShaderSource>;
