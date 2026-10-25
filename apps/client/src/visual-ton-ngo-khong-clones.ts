import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { debug } from './debug.js';
import { freshClone, MONKEY_CAPS } from './visual-ton-ngo-khong-timeline.js';
import type { MonkeyArt } from './visual-ton-ngo-khong-art.js';
interface Clone { at: Vector3; remaining: number; reduced: boolean; touched: boolean }
/** Tracks actual server units; never creates clone bodies or offsets from aim. */
export class MonkeyClones {
  private clones = new Map<string, Clone>();
  constructor(private art: MonkeyArt) {}
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!id || !Number.isFinite(remaining) || remaining <= 0 || ![at.x, at.y, at.z].every(Number.isFinite)) return;
    let clone = this.clones.get(id);
    if (!clone) {
      if (this.clones.size >= MONKEY_CAPS.clones) return;
      clone = { at: at.clone(), remaining, reduced, touched: true }; this.clones.set(id, clone);
      // A late snapshot/reconnect enters silently, while a fresh six-second unit has a real birth.
      if (freshClone(remaining)) this.art.play('puff', at, 2.4, .48, reduced);
      debug('visual.ton-ngo-khong.clone.seen', { birth: freshClone(remaining), reduced });
    }
    clone.at.copyFrom(at); clone.remaining = remaining; clone.reduced = reduced; clone.touched = true;
  }
  endFrame(): void {
    for (const [id, clone] of this.clones) {
      if (!clone.touched) { this.art.play('unravel', clone.at, 2.2, .48, clone.reduced); this.clones.delete(id);
        debug('visual.ton-ngo-khong.clone.removed', {}); }
      else clone.touched = false;
    }
  }
  clear(): void { this.clones.clear(); }
}
