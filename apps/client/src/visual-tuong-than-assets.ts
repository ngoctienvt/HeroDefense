import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitPainted } from './visual-kit-painted.js';
import raw from './visual-tier6-art-manifest.json';

/** Codex stylized sheets of Tướng Thần (raw in assets/vfx-source/tier56-codex-art/raw); runtime webp + layout in the tier-6 manifest. */
interface ArtMeta { url: string; columns: number; rows: number; frames: number; anchorY: number;
  width: number; height: number; groundRadiusFactor: number }
const manifest: Readonly<Record<string, ArtMeta>> = raw;

/**
 * Painted-plane ids → source asset and draw pass.
 * `foreground`: over monsters and the ground, under heroes/summons and health (transient shapes: crest, drain, summon ring, hit).
 * `world`: ground decals, ripples and eddies; actors always draw over them.
 * The awakening sheet is a SIDE-VIEW crest: it is a camera-facing billboard, never laid flat.
 */
export const TUONG_THAN_ART = {
  crest: { asset: 'bloodsea-awakening-sheet', pass: 'foreground' },
  ripple: { asset: 'bloodsea-awakening-sheet', pass: 'world' },
  ground: { asset: 'bloodsea-ground', pass: 'world' },
  eddy: { asset: 'bloodsea-current-sheet', pass: 'world' },
  drain: { asset: 'blood-drain-ribbon', pass: 'foreground' },
  summon: { asset: 'blood-general-summon-sheet', pass: 'foreground' },
  hit: { asset: 'blood-general-hit-sheet', pass: 'foreground' },
} as const;
export type TuongThanArtId = keyof typeof TUONG_THAN_ART;

export function artMeta(id: TuongThanArtId): ArtMeta | undefined {
  return manifest[TUONG_THAN_ART[id].asset];
}

/** Idempotent; a missing manifest entry is logged once per id and that layer simply never appears. */
export function prepareTuongThanArt(painted: KitPainted, ids: readonly TuongThanArtId[] = Object.keys(TUONG_THAN_ART) as TuongThanArtId[]): void {
  for (const id of ids) {
    const meta = artMeta(id);
    if (!meta) { debug('visual.kit.asset.missing', { asset: TUONG_THAN_ART[id].asset, owner: 'tuongthan' }); continue; }
    painted.prepare(id, meta.url, TUONG_THAN_ART[id].pass === 'foreground' ? { foreground: true } : { depthAlways: true });
  }
}

/** Plane scale (x, y) of a camera-facing sheet `width` units wide; height keeps the cell's own aspect. */
export function billboardScale(id: TuongThanArtId, width: number): { x: number; y: number } {
  const meta = artMeta(id);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}

/** Plane scale of a flat decal whose farthest occupied texel lands on `diameter / 2` (manifest radius calibration). */
export function groundScale(id: TuongThanArtId, diameter: number): { x: number; y: number } {
  const meta = artMeta(id);
  const width = diameter / (meta?.groundRadiusFactor || 1);
  return { x: width, y: meta ? width * meta.height / meta.width : width };
}

/** Camera-facing sheet cell `width` wide whose art touches the ground at `feet` (`lift` raises it along screen-up). */
export function placeBillboard(mesh: Mesh, id: TuongThanArtId, feet: Vector3, width: number, up: Vector3, lift = 0): void {
  const scale = billboardScale(id, width);
  mesh.scaling.set(scale.x, scale.y, 1);
  mesh.position.copyFrom(billboardCenter(feet, scale.y, artMeta(id)?.anchorY ?? .5, up, lift));
}

/** Atlas cell of `frame`. */
export function setFrame(painted: KitPainted, mesh: Mesh, id: TuongThanArtId, frame: number): void {
  const meta = artMeta(id);
  if (meta) painted.frame(mesh, Math.max(0, Math.min(meta.frames - 1, frame)), meta.columns, meta.rows);
}
