import { Effect } from '@babylonjs/core/Materials/effect.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector2 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { enemyRoute, enemyRouteFor } from '../../../packages/game-core/src/battlefield-layout.js';

/**
 * Stylized ground: two cel-painted tiles plus a low-resolution world mask.
 *   mask.r = worn path along the enemy routes, mask.b = broad light/dark patches.
 * Grass rim and stone lip come from the island mesh edge distance (uv2.x, world units).
 * Unlit by design: mid-value earth keeps hero sprites and additive VFX readable on top.
 */
const MASK_ORIGIN = { x: -52, z: -50 }, MASK_SIZE = { x: 104, z: 100 }, MASK_PX = 512;
const TILE_WORLD = 10;
const GRASS_EDGE = 4.0, STONE_EDGE = 1.2;

const VERTEX = `
attribute vec3 position;
attribute vec2 uv2;
uniform mat4 worldViewProjection;
varying vec2 vWorld;
varying float vEdge;
void main() {
  vWorld = position.xz;
  vEdge = uv2.x;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 vWorld;
varying float vEdge;
uniform sampler2D uDirt, uGrass, uMask;
uniform vec2 uMaskOrigin, uMaskSize;
uniform float uTile, uGrassEdge, uStoneEdge, uTime;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  vec3 dirtA = texture2D(uDirt, vWorld / uTile).rgb;
  // A rotated, rescaled second sample breaks visible tile repetition at far zoom.
  vec2 rot = vec2(vWorld.x * .8 - vWorld.y * .6, vWorld.x * .6 + vWorld.y * .8);
  vec3 dirtB = texture2D(uDirt, rot / (uTile * 1.7) + .37).rgb;
  vec3 dirt = mix(dirtA, dirtB, .35);
  vec3 mask = texture2D(uMask, (vWorld - uMaskOrigin) / uMaskSize).rgb;
  float worn = smoothstep(.46, .54, mask.r);           // hard cel edge on the trodden path
  dirt = mix(dirt, dirt * vec3(1.16, 1.11, .97) + .035, worn);
  dirt *= .9 + .2 * mask.b;
  vec3 grass = texture2D(uGrass, vWorld / (uTile * .5)).rgb;
  // Muted, slightly cool earth with soft grass patches: less saturated than flat cel colour.
  float luma = dot(dirt, vec3(.3, .59, .11));
  dirt = mix(dirt, vec3(luma) * vec3(1.0, .97, .93), .22);
  float grassPatch = smoothstep(.62, .78, vnoise(vWorld * .09 + 3.7) * .6 + mask.b * .5);
  dirt = mix(dirt, grass * .92, grassPatch * (1.0 - worn) * .85);
  vec3 stone = vec3(.64, .58, .52) * (.92 + .16 * texture2D(uGrass, vWorld / 4.).r);
  float inGrass = 1.0 - smoothstep(uGrassEdge - .08, uGrassEdge + .08, vEdge);
  float inStone = 1.0 - smoothstep(uStoneEdge - .06, uStoneEdge + .06, vEdge);
  vec3 col = mix(dirt, grass, inGrass);
  col = mix(col, stone, inStone);
  // Ink line where grass meets dirt and where the lip meets the grass.
  float line = max(1.0 - smoothstep(0., .1, abs(vEdge - uGrassEdge)), 1.0 - smoothstep(0., .08, abs(vEdge - uStoneEdge)));
  col = mix(col, col * .45, line * .85);
  // Drifting cloud shadows: slow, soft, cool darkening that makes the ground feel alive under the sky.
  float shade = smoothstep(.5, .75, vnoise(vWorld * .018 + vec2(uTime * .012, uTime * .006)) * .7 + vnoise(vWorld * .05 - uTime * .01) * .3);
  col = mix(col, col * vec3(.78, .84, .95), shade * .55);
  gl_FragColor = vec4(col, 1.0);
}`;

let registered = false;
function register(): void {
  if (registered) return;
  Effect.ShadersStore['islandGroundVertexShader'] = VERTEX;
  Effect.ShadersStore['islandGroundFragmentShader'] = FRAGMENT;
  registered = true;
}

/** Paint the macro mask in world space: worn enemy routes (R) and soft light/dark patches (B). */
function paintMask(scene: Scene, laneCount: number): DynamicTexture {
  const texture = new DynamicTexture('island-ground-mask', { width: MASK_PX, height: MASK_PX }, scene, true);
  const c = texture.getContext() as unknown as CanvasRenderingContext2D;
  const px = (x: number, z: number): [number, number] => [(x - MASK_ORIGIN.x) / MASK_SIZE.x * MASK_PX, (z - MASK_ORIGIN.z) / MASK_SIZE.z * MASK_PX];
  c.fillStyle = '#000'; c.fillRect(0, 0, MASK_PX, MASK_PX);
  c.globalCompositeOperation = 'lighter';
  let seed = 41; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) { // broad blotches, mean .5 so they brighten and darken the earth
    const [x, y] = [rnd() * MASK_PX, rnd() * MASK_PX], r = 30 + rnd() * 70;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const level = Math.round(60 + rnd() * 70);
    g.addColorStop(0, `rgba(0,0,${level},.5)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.lineCap = 'round'; c.lineJoin = 'round';
  const stroke = (points: { x: number; z: number }[], width: number, alpha: number) => {
    c.strokeStyle = `rgba(255,0,0,${alpha})`; c.lineWidth = width * MASK_PX / MASK_SIZE.x;
    c.beginPath(); points.forEach((p, i) => { const [x, y] = px(p.x, p.z); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke();
  };
  for (let lane = 0; lane < laneCount; lane++) {
    const route = enemyRoute(laneCount, lane);
    stroke(route, 7, .35); stroke(route, 4, .5); // two passes: soft shoulder + bright core
  }
  const bossRoute = enemyRouteFor(['ground-mask-lane'], 'party');
  stroke(bossRoute, 8, .35); stroke(bossRoute, 4.5, .5);
  texture.update(false);
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  return texture;
}

export interface IslandGround { material: ShaderMaterial; dispose: () => void }

export function createIslandGround(scene: Scene, laneCount: number, _zone = 0): IslandGround {
  register();
  const material = new ShaderMaterial('island-ground', scene, 'islandGround', {
    attributes: ['position', 'uv2'],
    uniforms: ['worldViewProjection', 'uMaskOrigin', 'uMaskSize', 'uTile', 'uGrassEdge', 'uStoneEdge', 'uTime'],
    samplers: ['uDirt', 'uGrass', 'uMask'],
  });
  const load = (name: string, url: string) => new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
    () => debug('terrain.texture-ready', { asset: name }),
    (message) => debug('terrain.texture-fallback', { asset: name, message }));
  const dirt = load('ground-dirt', '/assets/terrain/ground-dirt.webp');
  const grass = load('ground-grass', '/assets/terrain/ground-grass.webp');
  for (const t of [dirt, grass]) { t.anisotropicFilteringLevel = 4; }
  const mask = paintMask(scene, laneCount);
  material.setTexture('uDirt', dirt); material.setTexture('uGrass', grass); material.setTexture('uMask', mask);
  material.setVector2('uMaskOrigin', new Vector2(MASK_ORIGIN.x, MASK_ORIGIN.z));
  material.setVector2('uMaskSize', new Vector2(MASK_SIZE.x, MASK_SIZE.z));
  material.setFloat('uTile', TILE_WORLD); material.setFloat('uGrassEdge', GRASS_EDGE); material.setFloat('uStoneEdge', STONE_EDGE);
  material.setFloat('uTime', 0);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let time = 0;
  const tick = scene.onBeforeRenderObservable.add(() => {
    if (reduced.matches) return;
    time += scene.getEngine().getDeltaTime() / 1000; material.setFloat('uTime', time);
  });
  material.backFaceCulling = false; // winding is not relied on; the top is only ever seen from above
  material.onError = (_effect, errors) => debug('terrain.shader-error', { errors });
  return { material, dispose: () => { scene.onBeforeRenderObservable.remove(tick); material.dispose(false, false); dirt.dispose(); grass.dispose(); mask.dispose(); } };
}
