import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitPainted } from './visual-kit-painted.js';

/**
 * Painted slots of Thần Nông: one material each. `foreground` = above monsters, below heroes/HP (burst, stream, weakness);
 * `world` = drawn under every actor with the ground never clipping it (vessel hold, mist, roots, tree replay);
 * `ground` = decal. Sheets with `shennong` urls are the Codex raw realigned by assets/vfx-source/shennong/process-art.py.
 */
export const SN_ART = {
  potFg: { url: '/assets/vfx-shennong-cauldron.webp', columns: 4, rows: 4, width: 334, height: 467, anchorY: .940043, foreground: true },
  pot: { url: '/assets/vfx-shennong-cauldron.webp', columns: 4, rows: 4, width: 334, height: 467, anchorY: .940043 },
  mist: { url: '/assets/vfx-shennong-mist.webp', columns: 4, rows: 2, width: 464, height: 499, anchorY: .8998 },
  roots: { url: '/assets/vfx-shennong-roots.webp', columns: 4, rows: 4, width: 342, height: 397, anchorY: 264 / 397 },
  weak: { url: '/assets/vfx-shennong-weakness.webp', columns: 8, rows: 4, width: 177, height: 467, anchorY: .920771, foreground: true },
  grove: { url: '/assets/vfx-tier6-herbal-grove-ground.webp', columns: 1, rows: 1, width: 830, height: 830, anchorY: .5 },
  stream: { url: '/assets/vfx-tier6-herbal-life-stream.webp', columns: 1, rows: 1, width: 1382, height: 461, anchorY: .5, foreground: true },
  tree: { url: '/assets/vfx-tier6-ancient-medicinal-tree.webp', columns: 1, rows: 1, width: 830, height: 830, anchorY: .943466 },
} as const;
export type SnSlot = keyof typeof SN_ART;
/** The grove decal's farthest opaque texel sits at this fraction of its half-width (measured on the encoded WebP). */
export const GROVE_RADIUS_FACTOR = .94457;

type Def = (typeof SN_ART)[SnSlot];
export const snId = (slot: SnSlot): string => `sn-${slot}`;

/** Registers every Thần Nông sheet on `art` once (idempotent: KitPainted skips known ids). */
export function prepareSnArt(art: KitPainted): void {
  for (const [slot, def] of Object.entries(SN_ART) as [SnSlot, Def][])
    art.prepare(snId(slot), def.url, 'foreground' in def ? { foreground: true } : { depthAlways: true });
}

/** Camera-facing sheet cell `width` units wide whose art touches the ground at `feet`. */
export function placeSn(mesh: Mesh, slot: SnSlot, feet: Vector3, width: number, up: Vector3, lift = 0): { width: number; height: number } {
  const def = SN_ART[slot];
  const height = width * def.height / def.width;
  mesh.scaling.set(width, height, 1);
  mesh.position.copyFrom(billboardCenter(feet, height, def.anchorY, up, lift));
  return { width, height };
}

/** Atlas cell of `frame` (clamped). */
export function frameSn(art: KitPainted, mesh: Mesh, slot: SnSlot, frame: number): void {
  const def = SN_ART[slot];
  art.frame(mesh, Math.max(0, Math.min(def.columns * def.rows - 1, frame)), def.columns, def.rows);
}
