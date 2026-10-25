import { debug } from './debug.js';
import type { KitPainted } from './visual-kit-painted.js';
import raw from './visual-tier6-art-manifest.json';

/** Codex stylized sheets of Đế Tuấn (raw in assets/vfx-source/tier56-codex-art/raw); runtime webp + layout in the tier-6 manifest. */
interface ArtMeta { url: string; columns: number; rows: number; frames: number; anchorY: number;
  width: number; height: number; groundRadiusFactor: number }
const manifest: Readonly<Record<string, ArtMeta>> = raw;

/**
 * Painted-plane ids → source asset and draw pass.
 * `foreground`: over monsters and the ground, but under heroes and health (the caster and allies stay crisp).
 * `world`: ground decals and the wreath behind the caster; actors (group 2) always draw over it.
 */
export const DE_TUAN_ART = {
  converge: { asset: 'ten-crows-convergence-sheet', pass: 'foreground' },
  sword: { asset: 'emperor-solar-sword', pass: 'foreground' },
  burst: { asset: 'emperor-sunburst-sheet', pass: 'foreground' },
  burstFlat: { asset: 'emperor-sunburst-sheet', pass: 'world' },
  form: { asset: 'solar-emperor-form-sheet', pass: 'world' },
  crow: { asset: 'crow-burst-sheet', pass: 'foreground' },
  hit: { asset: 'emperor-empowered-hit', pass: 'foreground' },
  ground: { asset: 'solar-emperor-ground', pass: 'world' },
} as const;
export type DeTuanArtId = keyof typeof DE_TUAN_ART;

export function artMeta(id: DeTuanArtId): ArtMeta | undefined {
  return manifest[DE_TUAN_ART[id].asset];
}

/** Idempotent; a missing manifest entry is logged once per id and the layer simply never appears. */
export function prepareDeTuanArt(painted: KitPainted, ids: readonly DeTuanArtId[] = Object.keys(DE_TUAN_ART) as DeTuanArtId[]): void {
  for (const id of ids) {
    const meta = artMeta(id);
    if (!meta) { debug('visual.kit.asset.missing', { asset: DE_TUAN_ART[id].asset, owner: 'detuan' }); continue; }
    painted.prepare(id, meta.url, DE_TUAN_ART[id].pass === 'foreground' ? { foreground: true } : { depthAlways: true });
  }
}

/** Plane scale (x, y) of a camera-facing sheet `width` units wide; height keeps the cell's own aspect. */
export function billboardScale(id: DeTuanArtId, width: number): { x: number; y: number } {
  const meta = artMeta(id);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}

/** Plane scale of a flat decal whose farthest occupied texel lands on `diameter / 2` (manifest radius calibration). */
export function groundScale(id: DeTuanArtId, diameter: number): { x: number; y: number } {
  const meta = artMeta(id);
  const width = diameter / (meta?.groundRadiusFactor || 1);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}
