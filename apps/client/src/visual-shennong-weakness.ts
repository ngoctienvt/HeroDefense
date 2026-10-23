import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import type { KitPainted } from './visual-kit-painted.js';
import { frameSn, placeSn, snId } from './visual-shennong-art.js';
import { WEAK_OUTRO, weakFrame } from './visual-shennong-timeline.js';

type Entry = { at: Vector3; age: number; leaving?: number; reduced: boolean; touched: boolean; mesh?: Mesh };
/** Marks alive at once: a packed zone can hold dozens of monsters; beyond this the first ones seen win. */
const MAX_MARKS = 32;
const MARK_WIDTH = 1.25, MARK_LIFT = 1;

/**
 * Wilting leaf and herb smoke over each monster the server reports with `attackWeak` inside a grove (it refreshes
 * the status every tick, so the mark holds while it is reported and fades the first frame it is not).
 * Foreground pass: it floats above the head of the monster, over the crowd and under heroes and health bars.
 */
export class ShennongWeakness {
  private entries = new Map<string, Entry>();
  private up = Vector3.Up();
  private capLogged = false;

  constructor(private scene: Scene, private art: KitPainted) {}

  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (![at.x, at.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    let entry = this.entries.get(id);
    if (!entry) {
      if (this.entries.size >= MAX_MARKS) {
        if (!this.capLogged) { this.capLogged = true; debug('visual.shennong.cap', { layer: 'weakness' }); }
        return;
      }
      entry = { at: at.clone(), age: 0, reduced, touched: true };
      this.entries.set(id, entry);
    }
    entry.at.copyFrom(at); entry.reduced = reduced; entry.touched = true; entry.leaving = undefined;
  }

  tick(dt: number): void {
    this.up = screenUp(this.scene);
    for (const [id, entry] of this.entries) {
      if (entry.touched) entry.touched = false;
      else entry.leaving = (entry.leaving ?? 0) + dt;
      if ((entry.leaving ?? 0) >= WEAK_OUTRO) { this.art.release(entry.mesh); this.entries.delete(id); continue; }
      entry.age += dt;
      entry.mesh ??= this.art.acquire(snId('weak'));
      if (!entry.mesh) continue;
      placeSn(entry.mesh, 'weak', entry.at, MARK_WIDTH, this.up, MARK_LIFT);
      frameSn(this.art, entry.mesh, 'weak', weakFrame(entry.age, entry.leaving, entry.reduced));
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) this.art.release(entry.mesh);
    this.entries.clear(); this.capLogged = false;
  }
}
