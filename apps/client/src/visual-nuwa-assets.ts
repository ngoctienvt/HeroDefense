import { debug } from './debug.js';
import type { KitPainted } from './visual-kit-painted.js';
import raw from './visual-tier6-art-manifest.json';

/** Codex stylized sheets of Nữ Oa (raw in assets/vfx-source/tier56-codex-art/raw); runtime webp + layout in the tier-6 manifest. */
interface ArtMeta { url: string; columns: number; rows: number; frames: number; anchorY: number;
  width: number; height: number; groundRadiusFactor: number }
const manifest: Readonly<Record<string, ArtMeta>> = raw;

/**
 * Painted-plane ids → source asset and draw pass.
 * `foreground`: over monsters and the ground but under heroes and health, so Nữ Oa, allies and HP bars stay crisp.
 * `world`: flat decals under every actor.
 */
export const NUWA_ART = {
  rift: { asset: 'mending-heaven-sheet', pass: 'foreground' },
  rain: { asset: 'five-color-stone-rain-sheet', pass: 'foreground' },
  hit: { asset: 'five-color-stone-hit-sheet', pass: 'foreground' },
  mark: { asset: 'five-color-stone-hit-sheet', pass: 'world' },
} as const;
export type NuwaArtId = keyof typeof NUWA_ART;

export function artMeta(id: NuwaArtId): ArtMeta | undefined {
  return manifest[NUWA_ART[id].asset];
}

/** Idempotent; a missing manifest entry is logged and the layer simply never appears. */
export function prepareNuwaArt(painted: KitPainted): void {
  for (const id of Object.keys(NUWA_ART) as NuwaArtId[]) {
    const meta = artMeta(id);
    if (!meta) { debug('visual.kit.asset.missing', { asset: NUWA_ART[id].asset, owner: 'nuwa' }); continue; }
    painted.prepare(id, meta.url, NUWA_ART[id].pass === 'foreground' ? { foreground: true } : { depthAlways: true });
  }
}

/** Plane scale of a camera-facing sheet `width` units wide; height keeps the cell's own aspect. */
export function billboardScale(id: NuwaArtId, width: number): { x: number; y: number } {
  const meta = artMeta(id);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}

/** Plane scale of a flat decal whose farthest occupied texel lands on `diameter / 2`. */
export function groundScale(id: NuwaArtId, diameter: number): { x: number; y: number } {
  const meta = artMeta(id);
  const width = diameter / (meta?.groundRadiusFactor || 1);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}
