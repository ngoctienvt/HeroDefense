import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { debug } from './debug.js';
import raw from './visual-kit-palettes.json';

/**
 * Shader palettes, RGB 0..1. visual-kit-palettes.json is the single source for the TS runtime and the
 * Blender authoring scripts (assets/vfx-source/kit/vfx_kit.py). `ice` feeds kitCrust, which only reads
 * deep/body/edge; its foam and ink entries exist so every palette has the same keys.
 */
export type Rgb = readonly [number, number, number];
export const PALETTE_KEYS = ['deep', 'body', 'edge', 'foam', 'ink'] as const;
export type KitPalette = Readonly<Record<(typeof PALETTE_KEYS)[number], Rgb>>;

const UNIFORMS: Record<(typeof PALETTE_KEYS)[number], string> = {
  deep: 'uDeep', body: 'uBody', edge: 'uEdge', foam: 'uFoam', ink: 'uInk',
};

/** Returns a list of problems (empty = valid). Pure so the manifest test can reuse it. */
export function validatePalette(palette: unknown): string[] {
  const problems: string[] = [];
  const entries = (palette ?? {}) as Record<string, unknown>;
  for (const key of PALETTE_KEYS) {
    const value = entries[key];
    const ok = Array.isArray(value) && value.length === 3
      && value.every(channel => typeof channel === 'number' && channel >= 0 && channel <= 1);
    if (!ok) problems.push(`${key} must be [r,g,b] within 0..1`);
  }
  return problems;
}

const palettes = new Map<string, KitPalette>();
for (const [name, palette] of Object.entries(raw.materials)) {
  const problems = validatePalette(palette);
  if (problems.length > 0) { debug('visual.kit.palette.invalid', { palette: name, problems }); continue; }
  palettes.set(name, palette as unknown as KitPalette);
}

export type KitPaletteName = keyof typeof raw.materials;

export function getPalette(name: KitPaletteName): KitPalette {
  const palette = palettes.get(name);
  if (!palette) throw new Error(`kit palette "${name}" is missing or invalid`);
  return palette;
}

/** Writes the palette into the material's uniforms. */
export function setPalette(material: ShaderMaterial, name: KitPaletteName): void {
  const palette = getPalette(name);
  for (const key of PALETTE_KEYS) material.setVector3(UNIFORMS[key], new Vector3(...palette[key]));
}

export const PALETTE_UNIFORMS: readonly string[] = PALETTE_KEYS.map(key => UNIFORMS[key]);
