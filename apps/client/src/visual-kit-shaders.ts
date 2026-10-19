import { Effect } from '@babylonjs/core/Materials/effect.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
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
  /** Optional motif/mask texture; its alpha multiplies the layer alpha (kitGround, kitSlash, kitShell). */
  mask?: BaseTexture;
}

let registered = false;

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
    needAlphaBlending: true,
  });
  material.backFaceCulling = shader === 'kitShell';
  material.disableDepthWrite = true;
  material.onError = (_effect, errors) => debug('visual.kit.shader.error', { shader, errors });
  material.setFloat('uAlpha', 1);
  material.setFloat('uTime', 0);
  if (shader === 'kitGround') { material.setFloat('uBand', 0); material.setFloat('uSpiral', 1); }
  if (options.mask) material.setTexture('uMask', options.mask);
  setPalette(material, palette);
  return material;
}
