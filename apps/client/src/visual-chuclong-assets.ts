import { debug } from './debug.js';
import type { KitPainted } from './visual-kit-painted.js';
import raw from './visual-tier6-art-manifest.json';

/** Codex stylized sheets of Chúc Long (raw in assets/vfx-source/tier56-codex-art/raw); runtime webp + layout in the tier-6 manifest. */
interface ArtMeta { url: string; columns: number; rows: number; frames: number; anchorY: number;
  width: number; height: number; groundRadiusFactor: number }
const manifest: Readonly<Record<string, ArtMeta>> = raw;

/**
 * Painted-plane ids → source asset and draw pass.
 * `foreground`: over monsters and the ground, under heroes and health: short hits that must read on a crowded lane.
 * `world`: drawn with the actors (heroes always on top) and not clipped by the ground: the held night eye and gift rings.
 * `ground`: flat decals under the actors (default depth), for holds that last seconds.
 * The same sheet appears in two passes where a layer changes role (eye: foreground while it opens, world while it holds).
 */
export const CHUCLONG_ART = {
  eyeFg: { asset: 'dragon-eye-eclipse-sheet', pass: 'foreground' },
  eyeWorld: { asset: 'dragon-eye-eclipse-sheet', pass: 'world' },
  dayEye: { asset: 'blazing-daybreak-sheet', pass: 'foreground' },
  wave: { asset: 'eternal-night-wave-sheet', pass: 'foreground' },
  impact: { asset: 'daybreak-impact-sheet', pass: 'foreground' },
  burn: { asset: 'dragon-solar-burn-sheet', pass: 'ground' },
  giftStrip: { asset: 'time-gift-ribbon', pass: 'foreground' },
  giftSheet: { asset: 'time-gift-sheet', pass: 'world' },
} as const;
export type ChuclongArtId = keyof typeof CHUCLONG_ART;

export function artMeta(id: ChuclongArtId): ArtMeta | undefined {
  return manifest[CHUCLONG_ART[id].asset];
}

/** Idempotent; a missing manifest entry is logged once per id and the layer simply never appears. */
export function prepareChuclongArt(painted: KitPainted, ids: readonly ChuclongArtId[] = Object.keys(CHUCLONG_ART) as ChuclongArtId[]): void {
  for (const id of ids) {
    const meta = artMeta(id);
    if (!meta) { debug('visual.kit.asset.missing', { asset: CHUCLONG_ART[id].asset, owner: 'chuclong' }); continue; }
    const pass = CHUCLONG_ART[id].pass;
    painted.prepare(id, meta.url, pass === 'foreground' ? { foreground: true } : pass === 'world' ? { depthAlways: true } : {});
  }
}

/** Plane scale (x, y) of a camera-facing sheet `width` units wide; height keeps the cell's own aspect. */
export function billboardScale(id: ChuclongArtId, width: number): { x: number; y: number } {
  const meta = artMeta(id);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}

/** Plane scale of a flat decal whose farthest occupied texel lands on `diameter / 2` (manifest radius calibration). */
export function groundScale(id: ChuclongArtId, diameter: number): { x: number; y: number } {
  const meta = artMeta(id);
  const width = diameter / (meta?.groundRadiusFactor || 1);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}
