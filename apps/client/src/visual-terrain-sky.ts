import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Effect } from '@babylonjs/core/Materials/effect.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { buildCloudsAndBirds } from './visual-terrain-clouds.js';
import { buildDistantSpires } from './visual-terrain-spires.js';

/**
 * Noon sky, sun and cloud sea around the floating island. Everything here is far from the action,
 * never pickable, depth-tested but not depth-writing, and lit only by its own textures.
 * Babylon LH, camera at +z: screen-left is world +x, screen-up is world -z. The sun sits upper-left,
 * matching the rim light on the hero sprites. The default camera looks down, so sky and sun show
 * only when zoomed out or tilted toward the horizon.
 */
export const SKY = {
  top: '#5f92c4', horizon: '#c9dde9', below: '#a8c3d6',
  sunDirection: new Vector3(.55, .2, -.82).normalize(),
};

const VERTEX = `
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = worldViewProjection * vec4(position, 1.0); }`;

const FRAGMENT = `
precision highp float;
varying vec3 vDir;
uniform vec3 uTop, uHorizon, uBelow, uSunDir;
void main() {
  float h = vDir.y;
  // Three hard-ish bands keep the hand-painted look instead of a smooth photographic ramp.
  float t = clamp(h * 1.6, 0., 1.);
  vec3 col = mix(uHorizon, uTop, floor(t * 5.) / 5. * .5 + t * .5);
  col = mix(col, uBelow, smoothstep(0., -.18, h));
  float sun = max(dot(normalize(vDir), uSunDir), 0.);
  col += vec3(1., .86, .55) * (pow(sun, 9.) * .35 + pow(sun, 60.) * .5);
  gl_FragColor = vec4(col, 1.0);
}`;

let registered = false;
function register(): void {
  if (registered) return;
  Effect.ShadersStore['islandSkyVertexShader'] = VERTEX;
  Effect.ShadersStore['islandSkyFragmentShader'] = FRAGMENT;
  registered = true;
}

function sunTexture(scene: Scene): DynamicTexture {
  const texture = new DynamicTexture('island-sun', { width: 512, height: 512 }, scene, true);
  const c = texture.getContext() as unknown as CanvasRenderingContext2D;
  c.clearRect(0, 0, 512, 512);
  // Pale moon-like disc inside a wide soft halo: reads as a hazy sun through mist.
  const halo = c.createRadialGradient(256, 256, 30, 256, 256, 256);
  halo.addColorStop(0, 'rgba(255,250,235,.95)'); halo.addColorStop(.22, 'rgba(255,248,225,.5)');
  halo.addColorStop(.55, 'rgba(255,240,210,.16)'); halo.addColorStop(1, 'rgba(255,235,200,0)');
  c.fillStyle = halo; c.fillRect(0, 0, 512, 512);
  const disc = c.createRadialGradient(256, 256, 40, 256, 256, 74);
  disc.addColorStop(0, '#ffffff'); disc.addColorStop(.85, '#fff7e0'); disc.addColorStop(1, 'rgba(255,247,224,0)');
  c.fillStyle = disc; c.beginPath(); c.arc(256, 256, 74, 0, Math.PI * 2); c.fill();
  texture.hasAlpha = true; texture.update(true);
  return texture;
}

function overlayMaterial(scene: Scene, name: string, texture: DynamicTexture, additive: boolean): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.Black(); material.specularColor = Color3.Black();
  // Alpha comes from the diffuse texture; opacityTexture would read luminance and turn the whole plane opaque.
  material.diffuseTexture = texture; material.useAlphaFromDiffuseTexture = true; material.emissiveTexture = texture;
  material.disableLighting = true; material.backFaceCulling = false; material.disableDepthWrite = true;
  if (additive) material.alphaMode = Engine.ALPHA_ADD;
  return material;
}

export interface IslandSky {
  /** Advance drift and keep the sun glued to the camera's far field. */
  update(dt: number, cameraPosition: Vector3, reducedMotion: boolean): void;
  dispose(): void;
}

export function buildSky(scene: Scene): IslandSky {
  register();
  const horizon = Color3.FromHexString(SKY.horizon);
  scene.clearColor = new Color4(horizon.r, horizon.g, horizon.b, 1);
  scene.fogMode = Scene.FOGMODE_NONE;

  const dome = MeshBuilder.CreateSphere('island-sky', { diameter: 3200, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
  const domeMaterial = new ShaderMaterial('island-sky', scene, 'islandSky', { attributes: ['position'], uniforms: ['worldViewProjection', 'uTop', 'uHorizon', 'uBelow', 'uSunDir'] });
  domeMaterial.setColor3('uTop', Color3.FromHexString(SKY.top)); domeMaterial.setColor3('uHorizon', horizon);
  domeMaterial.setColor3('uBelow', Color3.FromHexString(SKY.below)); domeMaterial.setVector3('uSunDir', SKY.sunDirection);
  domeMaterial.backFaceCulling = false; domeMaterial.disableDepthWrite = true;
  domeMaterial.onError = (_effect, errors) => debug('terrain.shader-error', { shader: 'sky', errors });
  dome.material = domeMaterial; dome.isPickable = false; dome.infiniteDistance = true; dome.applyFog = false;

  const sunTex = sunTexture(scene), sun = MeshBuilder.CreatePlane('island-sun', { size: 420 }, scene);
  sun.material = overlayMaterial(scene, 'island-sun', sunTex, true);
  sun.billboardMode = Mesh.BILLBOARDMODE_ALL; sun.isPickable = false; sun.applyFog = false;

  const creatures = buildCloudsAndBirds(scene);
  const spires = buildDistantSpires(scene);
  debug('terrain.sky-built', { sunElevation: Math.round(Math.asin(SKY.sunDirection.y) * 180 / Math.PI) });

  let time = 0;
  return {
    update(dt, cameraPosition, reducedMotion) {
      sun.position.copyFrom(cameraPosition).addInPlace(SKY.sunDirection.scale(900));
      if (reducedMotion) return;
      time += dt;
      creatures.update(dt, time);
      sunTex.wAng = time * .02;
    },
    dispose() {
      creatures.dispose(); spires.dispose();
      for (const mesh of [dome, sun]) mesh.dispose(false, false);
      for (const material of [domeMaterial, sun.material]) material?.dispose();
      sunTex.dispose();
    },
  };
}
