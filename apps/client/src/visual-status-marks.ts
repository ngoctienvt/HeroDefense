import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { KitPainted } from './visual-kit-painted.js';

/**
 * Game-wide status marks from the shared Codex inventory (asset-shared-status.md): one neutral silver
 * silhouette per effect, tinted per use (buff gold, debuff red). Data only; add a row + its
 * `/assets/vfx-status-<kind>.webp` for a new effect instead of a hero-specific marker.
 */
export const STATUS_MARKS = {
  /** sunder / armorCuts on an enemy. */
  'armor-break': { tint: [1, .58, .5], hero: false, x: 0 },
  /** Movement `slow` on an enemy (Như Lai's five-finger zone: only enemies inside an active zone in the same area). Art: vfx-status-slow.webp. */
  'slow': { tint: [.82, .66, 1], hero: false, x: .6 },
  /** empower.attackBonus / haste.attackBonus > 0 on an ally. */
  'attack-up': { tint: [1, .86, .52], hero: true, x: -.48 },
  /** empower.armorPierce > 0 on an ally. */
  'armor-pierce-up': { tint: [1, .86, .52], hero: true, x: .48 },
  /** critBlessing.chance / berserk.critChance > 0 on an ally (Hiên Viên's blessing). Art: assets/vfx-source/hienvien/process-art.py. */
  'critical-up': { tint: [1, .86, .52], hero: true, x: -1.44 },
  /** haste.amount / berserk.attackSpeed > 0 on an ally (attack speed only). Art: assets/vfx-source/hienvien/process-art.py. */
  'haste': { tint: [1, .86, .52], hero: true, x: 1.44 },
  /** `sealed` on an enemy: its skills are locked. Art: shared-seal-mark. */
  'seal': { tint: [.8, .68, 1], hero: false, x: -.6 },
  /** `attackWeak` on an enemy: its damage is reduced. Art: shared-attack-down-mark. */
  'attack-down': { tint: [.82, .66, 1], hero: false, x: 1.2 },
  /** `pureLand` on an enemy: it takes extra damage. Art: shared-vulnerable-mark. */
  'vulnerable': { tint: [1, .58, .52], hero: false, x: -1.2 },
  /** `ward.reduction > 0` on an ally (damage taken is reduced, not absorbed). Art: shared-damage-reduction-mark. */
  'damage-reduction': { tint: [1, .86, .52], hero: true, x: 0 },
  /** `berserk.remaining > 0` on an ally without its own frenzy art. Art: shared-berserk-mark. */
  'berserk': { tint: [1, .72, .4], hero: true, x: -.96 },
  /** `root > 0` on an enemy: it cannot move. Art: shared-root-mark. Second row above the first enemy row. */
  'root': { tint: [.62, .9, .6], hero: false, x: -.6, row: 1 },
  /** `burn` on an enemy (damage over time). Art: shared-burn-mark. */
  'burn': { tint: [1, .6, .36], hero: false, x: .6, row: 1 },
  /** `poison` on an enemy (damage over time). Art: shared-poison-mark. */
  'poison': { tint: [.62, .9, .5], hero: false, x: -1.2, row: 1 },
  /** `soulLink` on an enemy (damage is shared with its group). Art: shared-soul-link-mark. */
  'soul-link': { tint: [.6, .84, 1], hero: false, x: 1.2, row: 1 },
  /** `armorBuff` on an enemy (extra armour). Art: shared-armor-up-mark. */
  'armor-up': { tint: [1, .86, .52], hero: false, x: 0, row: 1 },
} as const satisfies Record<string, { tint: readonly [number, number, number]; hero: boolean; x: number; row?: number }>;

export type StatusMarkKind = keyof typeof STATUS_MARKS;

/** Head heights: enemy marks sit where the old sunder icon did; ally marks clear the hero health bar (≈ 4.3). */
export const STATUS_MARK_HEIGHT = { enemy: 2.9, hero: 4.85 } as const;
export const STATUS_MARK_SIZE = .8;
/** Extra height of a second enemy row (a mark with `row: 1`), so a crowded enemy keeps every mark readable. */
export const STATUS_MARK_ROW_STEP = .75;

export function isStatusMarkKind(kind: string): kind is StatusMarkKind {
  return Object.prototype.hasOwnProperty.call(STATUS_MARKS, kind);
}

/** Fixed slot per kind (never re-packed when another mark comes or goes): height + offset along screen right. */
export function statusMarkSlot(kind: StatusMarkKind): { y: number; side: number } {
  const row: { hero: boolean; x: number; row?: number } = STATUS_MARKS[kind];
  return { y: (row.hero ? STATUS_MARK_HEIGHT.hero : STATUS_MARK_HEIGHT.enemy) + (row.row ?? 0) * STATUS_MARK_ROW_STEP, side: row.x };
}

/** One billboard per (kind, actor) while the snapshot keeps calling `mark`; untouched marks return to the pool on tick. */
export class StatusMarks {
  private art: KitPainted;
  private live = new Map<string, { mesh: Mesh; touched: boolean }>();
  private right = new Vector3(1, 0, 0);

  constructor(private scene: Scene, capacity = 160) {
    this.art = new KitPainted(scene, capacity, 'status-marks');
  }

  private prepare(kind: StatusMarkKind): void {
    // Foreground pass: readable over the monster crowd, still under hero bodies and health bars.
    this.art.prepare(kind, `/assets/vfx-status-${kind}.webp`, { foreground: true, tint: STATUS_MARKS[kind].tint });
  }

  mark(kind: StatusMarkKind, id: string, at: Vector3): void {
    const key = `${kind}:${id}`;
    let entry = this.live.get(key);
    if (!entry) {
      this.prepare(kind);
      const mesh = this.art.acquire(kind);
      if (!mesh) return;
      mesh.scaling.setAll(STATUS_MARK_SIZE);
      entry = { mesh, touched: true };
      this.live.set(key, entry);
      debug('visual.status-mark.show', { kind });
    }
    entry.touched = true;
    const slot = statusMarkSlot(kind);
    entry.mesh.position.set(at.x + this.right.x * slot.side, at.y + slot.y, at.z + this.right.z * slot.side);
  }

  tick(): void {
    const camera = this.scene.activeCamera;
    if (camera) camera.getDirectionToRef(Vector3.Right(), this.right);
    for (const [key, entry] of this.live) {
      if (entry.touched) { entry.touched = false; continue; }
      this.art.release(entry.mesh);
      this.live.delete(key);
    }
  }

  clear(): void {
    this.live.clear();
    this.art.clear();
  }
}
