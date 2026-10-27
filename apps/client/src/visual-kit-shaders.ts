import { Effect } from '@babylonjs/core/Materials/effect.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { KIT_MASK_DEFINE, KIT_SHADER_SOURCES } from './visual-kit-shader-glsl.js';
import { setPalette, type KitPaletteName } from './visual-kit-palettes.js';

/**
 * Kit shader factory. Every material is alpha-blended, depth-write off, and driven only by uniforms set
 * per frame. The GLSL (toon / ink / foam / fbm ingredients) lives in visual-kit-shader-glsl.ts.
 */
export type KitShader = keyof typeof KIT_SHADER_SOURCES;

export interface KitMaterialOptions {
  /** Optional motif/mask texture; its alpha multiplies the layer alpha (kitGround, kitSlash, kitShell). Not for kitSolid/kitInk. */
  mask?: BaseTexture;
}

let registered = false;
/** Opaque, depth-writing shaders (solid cast objects and their ink hull); every other kit layer is blended. */
const SOLID = new Set<KitShader>(['kitSolid', 'kitInk']);
/** Key light for solids: above, a little left and toward the default camera (+Z), so the side facing the player is lit. */
const KEY_LIGHT = new Vector3(-.5, 1, .6).normalize();

function register(): void {
  if (registered) return;
  for (const [name, source] of Object.entries(KIT_SHADER_SOURCES)) {
    Effect.ShadersStore[`${name}VertexShader`] = source.vertex;
    Effect.ShadersStore[`${name}FragmentShader`] = source.fragment;
  }
  registered = true;
}

/** New material per effect instance (uniforms are per instance); pool the meshes that own them. */
export function kitMaterial(scene: Scene, shader: KitShader, palette: KitPaletteName, id: string,
  options: KitMaterialOptions = {}): ShaderMaterial {
  register();
  const source = KIT_SHADER_SOURCES[shader];
  const masked = options.mask !== undefined;
  const material = new ShaderMaterial(`kit-${shader}-${id}`, scene, shader, {
    attributes: source.attributes,
    uniforms: source.uniforms,
    samplers: masked ? ['uMask'] : [],
    defines: masked ? [KIT_MASK_DEFINE] : [],
    needAlphaBlending: !SOLID.has(shader),
  });
  material.backFaceCulling = shader === 'kitShell' || SOLID.has(shader);
  material.disableDepthWrite = !SOLID.has(shader);
  if (shader === 'kitInk') { material.cullBackFaces = false; material.setFloat('uInkWidth', .012); }
  if (SOLID.has(shader)) {
    // Opaque cast objects: reveal fully, no burn; uTop = local height of the object's top (bell: 1.25 with the loop).
    material.setFloat('uReveal', 1); material.setFloat('uBurn', 0); material.setFloat('uTop', 1.25);
    if (shader === 'kitSolid') {
      material.setFloat('uFlash', 0); material.setFloat('uEngrave', 1);
      material.setVector3('uLightDir', KEY_LIGHT);
    }
  }
  material.onError = (_effect, errors) => debug('visual.kit.shader.error', { shader, errors });
  material.setFloat('uAlpha', 1);
  material.setFloat('uTime', 0);
  if (shader === 'kitWall') { material.setFloat('uLinear', 0); material.setFloat('uSpan', 1); material.setFloat('uBend', 0); }
  if (shader === 'kitGround') { material.setFloat('uBand', 0); material.setFloat('uSpiral', 1); }
  if (shader === 'kitGuard') material.setFloat('uDissolve', 0);
  if (shader === 'kitSlash') material.setFloat('uArc', 1.72);
  if (shader === 'kitLink') { material.setFloat('uHead', 1); material.setFloat('uTail', 0); material.setFloat('uWave', 0); material.setFloat('uTaper', 0); }
  if (options.mask) material.setTexture('uMask', options.mask);
  setPalette(material, palette);
  return material;
}
