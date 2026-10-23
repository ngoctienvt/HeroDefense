import { debug } from './debug.js';
import type { KitPainted } from './visual-kit-painted.js';
import raw from './visual-tier6-art-manifest.json';

/** Codex stylized sheets of Phục Hy (raw in assets/vfx-source/tier56-codex-art/raw); runtime webp + layout in the tier-6 manifest. */
interface ArtMeta { url: string; columns: number; rows: number; frames: number; anchorY: number;
  width: number; height: number; groundRadiusFactor: number }
const manifest: Readonly<Record<string, ArtMeta>> = raw;

/**
 * Painted-plane ids → source asset and draw pass.
 * `world`: under monsters and heroes like terrain (the array and its pillars are the battlefield itself); actors always draw over it.
 * `foreground`: over monsters, under heroes and health (the thin causality ropes stay readable on a crowd).
 * `wake` is the oblique pillar sheet and stands up facing the camera; the others lie flat.
 */
export const FUXI_ART = {
  wake: { asset: 'bagua-awakening-sheet', pass: 'world' },
  array: { asset: 'primordial-bagua-array', pass: 'world' },
  current: { asset: 'bagua-inward-current-sheet', pass: 'world' },
  release: { asset: 'bagua-release-sheet', pass: 'world' },
  rope: { asset: 'causality-string', pass: 'foreground' },
  node: { asset: 'causality-node-sheet', pass: 'world' },
} as const;
export type FuxiArtId = keyof typeof FUXI_ART;

export function artMeta(id: FuxiArtId): ArtMeta | undefined {
  return manifest[FUXI_ART[id].asset];
}

/** Idempotent; a missing manifest entry is logged once per id and the layer simply never appears. */
export function prepareFuxiArt(painted: KitPainted, ids: readonly FuxiArtId[] = Object.keys(FUXI_ART) as FuxiArtId[]): void {
  for (const id of ids) {
    const meta = artMeta(id);
    if (!meta) { debug('visual.kit.asset.missing', { asset: FUXI_ART[id].asset, owner: 'fuxi' }); continue; }
    painted.prepare(id, meta.url, FUXI_ART[id].pass === 'foreground' ? { foreground: true } : { depthAlways: true });
  }
}

/** Plane scale (x, y) of a camera-facing sheet `width` units wide; height keeps the cell's own aspect. */
export function billboardScale(id: FuxiArtId, width: number): { x: number; y: number } {
  const meta = artMeta(id);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}

/** Plane scale of a flat decal whose farthest occupied texel lands on `diameter / 2` (manifest radius calibration). */
export function groundScale(id: FuxiArtId, diameter: number): { x: number; y: number } {
  const meta = artMeta(id);
  const width = diameter / (meta?.groundRadiusFactor || 1);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}
