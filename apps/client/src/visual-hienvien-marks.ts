import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { motion } from './visual-kit-timeline.js';

type Entry = { at: Vector3; age: number; phase: number; reduced: boolean; touched: boolean; ring?: Layer };
const MAX_BLESSINGS = 20, RING_SIZE = 3.6, POP = .14;

/**
 * Imperial blessing aura on every ally the snapshot reports with `critBlessing` (only h01F grants it):
 * a slow gold rune ring under the feet. The +crit / +haste icons are the game-wide shared marks
 * (`critical-up`, `haste` in visual-status-marks.ts), fed by battlefield.ts. Gone the first untouched frame.
 */
export class HienvienMarks {
  private entries = new Map<string, Entry>();
  private rings: LayerPool;

  constructor(scene: Scene) {
    let serial = 0;
    this.rings = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'xuanyuan', `hienvien-bless-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      const m = layer.material;
      m.setFloat('uFill', .14); m.setFloat('uRim', 1); m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSpiral', 0);
      return layer;
    }, MAX_BLESSINGS, 'hienvien-blessing');
  }

  mark(id: string, at: Vector3, reduced: boolean): void {
    let entry = this.entries.get(id);
    if (!entry) {
      if (this.entries.size >= MAX_BLESSINGS) return;
      entry = { at: at.clone(), age: 0, phase: this.entries.size * 1.3, reduced, touched: true };
      this.entries.set(id, entry);
    }
    entry.at.copyFrom(at); entry.reduced = reduced; entry.touched = true;
    entry.ring ??= this.rings.acquire();
  }

  tick(dt: number, time: number): void {
    for (const [id, entry] of this.entries) {
      if (!entry.touched) { this.free(entry); this.entries.delete(id); continue; }
      entry.touched = false;
      entry.age += dt;
      if (!entry.ring) continue;
      const pop = entry.reduced ? 1 : motion.impactOvershoot(Math.min(1, entry.age / POP));
      entry.ring.mesh.position.set(entry.at.x, .04, entry.at.z);
      entry.ring.mesh.scaling.set(RING_SIZE * pop, 1, RING_SIZE * pop);
      entry.ring.mesh.setEnabled(true);
      const m = entry.ring.material;
      m.setFloat('uTime', time); m.setFloat('uSwirl', entry.reduced ? 0 : 1.4);
      m.setFloat('uAlpha', entry.reduced ? .7 : .7 + .15 * Math.sin(time * 5 + entry.phase));
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) this.free(entry);
    this.entries.clear();
    this.rings.releaseAll();
  }

  private free(entry: Entry): void {
    if (entry.ring) this.rings.release(entry.ring);
    entry.ring = undefined;
  }
}
