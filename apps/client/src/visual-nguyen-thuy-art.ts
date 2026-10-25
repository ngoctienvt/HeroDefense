import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { KitPainted } from './visual-kit-painted.js';
import manifest from './visual-tier6-art-manifest.json';

/** Painted slots of Nguyên Thủy: one material each; `foreground` draws above monsters and below heroes/HP. */
export const NT_ART = {
  banner: { asset: 'primordial-banner-cast-sheet', foreground: true },
  sword: { asset: 'chaos-sword-stream', foreground: true },
  rend: { asset: 'void-rend-sheet', foreground: true },
  rendGround: { asset: 'void-rend-sheet', foreground: false },
  breakSheet: { asset: 'boss-defense-break-sheet', foreground: true },
  sigil: { asset: 'primordial-banner-cast-sheet', foreground: false },
} as const;
export type NtArtSlot = keyof typeof NT_ART;

interface Meta { url: string; columns: number; rows: number; frames: number; anchorY: number; width: number; height: number }
const sheets: Readonly<Record<string, Meta>> = manifest;

export function ntMeta(slot: NtArtSlot): Meta | undefined { return sheets[NT_ART[slot].asset]; }

/** Registers every Nguyên Thủy sheet on `art` once (idempotent); logs a missing manifest entry instead of throwing. */
export function prepareNtArt(art: KitPainted): void {
  for (const [slot, def] of Object.entries(NT_ART)) {
    const meta = sheets[def.asset];
    if (!meta) { debug('visual.kit.asset.missing', { asset: def.asset, owner: 'nguyenthuy' }); continue; }
    art.prepare(`nt-${slot}`, meta.url, def.foreground ? { foreground: true } : { depthAlways: true });
  }
}

export const ntId = (slot: NtArtSlot): string => `nt-${slot}`;

/** Camera-facing sheet cell of `size` world units wide whose art touches the ground at `feet`. */
export function placeBillboard(mesh: Mesh, slot: NtArtSlot, feet: Vector3, size: number, up: Vector3, lift = 0): void {
  const meta = ntMeta(slot);
  if (!meta) return;
  const height = size * meta.height / meta.width;
  mesh.scaling.set(size, height, 1);
  mesh.position.copyFrom(billboardCenter(feet, height, meta.anchorY, up, lift));
}

/** Atlas cell of the current frame. */
export function setFrame(art: KitPainted, mesh: Mesh, slot: NtArtSlot, frame: number): void {
  const meta = ntMeta(slot);
  if (meta) art.frame(mesh, Math.max(0, Math.min(meta.frames - 1, frame)), meta.columns, meta.rows);
}
