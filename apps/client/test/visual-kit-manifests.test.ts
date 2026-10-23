import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { ATLASES, validateAtlas } from '../src/visual-kit-atlas-manifest.js';
import { PALETTE_KEYS, validatePalette } from '../src/visual-kit-palettes.js';

const ROOT = resolve(__dirname, '../../..');

describe('kit atlas manifest', () => {
  it('registers every manifest entry as valid, with unique ids', () => {
    const ids = atlases.atlases.map(atlas => atlas.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ATLASES.keys()].sort()).toEqual([...ids].sort());
  });

  it('keeps frames within tile capacity and capacity > 0', () => {
    for (const atlas of atlases.atlases) {
      expect(validateAtlas(atlas), atlas.id).toEqual([]);
      const [columns, rows] = atlas.tile.split('x').map(Number);
      expect(atlas.frames).toBeLessThanOrEqual(columns * rows);
      expect(atlas.size).toBe(`${columns * atlas.cell}x${rows * atlas.cell}`);
    }
  });

  it('rejects broken entries', () => {
    expect(validateAtlas({ ...atlases.atlases[0], frames: 99 })).toContain('frames exceed tile capacity');
    expect(validateAtlas({ ...atlases.atlases[0], tile: 'x' })).toContain('tile must look like 4x4');
    expect(validateAtlas({ ...atlases.atlases[0], capacity: 0 })).toContain('capacity must be > 0');
    expect(validateAtlas({})).not.toEqual([]);
  });

  it('accepts finite camera offsets at or below ground level without dropping painted atlases', () => {
    for (const targetZ of [0, -1]) expect(validateAtlas({ ...atlases.atlases[0], targetZ })).toEqual([]);
    for (const targetZ of [NaN, Infinity, undefined])
      expect(validateAtlas({ ...atlases.atlases[0], targetZ })).toContain('targetZ must be finite');
  });

  it('points at runtime WebP files and source frame folders that exist', () => {
    for (const atlas of atlases.atlases) {
      expect(existsSync(resolve(ROOT, 'apps/client/public', atlas.url.replace(/^\//, ''))), atlas.url).toBe(true);
      const dir = resolve(ROOT, atlas.framesDir);
      expect(existsSync(dir), atlas.framesDir).toBe(true);
      expect(readdirSync(dir).filter(name => /^frame-\d+\.png$/.test(name))).toHaveLength(atlas.frames);
    }
  });
});

describe('kit palettes', () => {
  it('every shader palette has all keys with RGB inside 0..1', () => {
    for (const [name, palette] of Object.entries(palettes.materials)) {
      expect(validatePalette(palette), name).toEqual([]);
      expect(Object.keys(palette).sort()).toEqual([...PALETTE_KEYS].sort());
    }
    expect(validatePalette({ deep: [0, 0, 2] })).not.toEqual([]);
  });

  it('keeps the exact Cộng Công shader values from before the extraction', () => {
    expect(palettes.materials.blackwater).toEqual({
      deep: [.018, .115, .185], body: [.040, .300, .430], edge: [.250, .720, .820],
      foam: [.900, .985, 1.0], ink: [.010, .060, .095],
    });
    expect(palettes.materials.ice.deep).toEqual([.045, .150, .230]);
    expect(palettes.materials.ice.body).toEqual([.150, .400, .520]);
    expect(palettes.materials.ice.edge).toEqual([.820, .960, 1.0]);
  });

  it('keeps the Blender toon steps as (shadow, mid, light) triples in 0..1', () => {
    for (const [name, steps] of Object.entries(palettes.blender.congcong)) {
      expect(steps.length, name).toBeGreaterThan(0);
      for (const step of steps) expect(step.every(channel => channel >= 0 && channel <= 1)).toBe(true);
    }
    expect(palettes.blender.congcong.rock).toHaveLength(3);
  });

  it('defines every element of the flipbook library with toon triples and single-colour accents', () => {
    for (const element of ['kim', 'moc', 'thuy', 'hoa', 'tho']) {
      const group = palettes.blender[`lib_${element}` as keyof typeof palettes.blender] as Record<string, number[][]>;
      for (const part of ['solid', 'fluid', 'accent']) expect(group[part], `${element}.${part}`).toHaveLength(3);
      for (const part of ['glow', 'rim', 'outline']) expect(group[part], `${element}.${part}`).toHaveLength(1);
      for (const step of Object.values(group).flat()) expect(step.every(channel => channel >= 0 && channel <= 1)).toBe(true);
    }
  });

  it('ships four archetypes per element in the atlas manifest', () => {
    for (const element of ['kim', 'moc', 'thuy', 'hoa', 'tho']) {
      for (const archetype of ['burst', 'shards', 'pillar', 'hit']) {
        expect(atlases.atlases.some(atlas => atlas.id === `lib-${element}-${archetype}`), `${element}-${archetype}`).toBe(true);
      }
    }
  });
});
