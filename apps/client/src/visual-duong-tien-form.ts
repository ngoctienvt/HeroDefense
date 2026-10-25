import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { HeavenArt } from './visual-duong-tien-art.js';
import { DTN_CAPS, DUONG_TIEN as D, FORM_CLOSE, warGodPose } from './visual-duong-tien-timeline.js';
import { debug } from './debug.js';
interface Form { at: Vector3; remaining: number; age: number; fresh: boolean; reduced: boolean; touched: boolean; closing?: number; mesh?: Mesh }
/** Root supplies own-ability provenance; generic berserk from another hero never enters this marker. */
export class WarGodForm {
  private entries = new Map<string, Form>();
  constructor(private art: HeavenArt) {}
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    let p = this.entries.get(id);
    if (!p) { if (this.entries.size >= DTN_CAPS.forms) return;
      p = { at: at.clone(), remaining, age: 0, fresh: remaining >= D.formLife - .2, reduced, touched: true }; this.entries.set(id, p);
      debug('visual.duong-tien.form.seen', { fresh: p.fresh, remaining, reduced }); }
    p.at.copyFrom(at); p.remaining = remaining; p.reduced = reduced; p.touched = true; p.closing = undefined;
  }
  tick(dt: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt;
      if (!p.touched && p.closing === undefined) { p.closing = 0; debug('visual.duong-tien.form.fold', {}); }
      if (p.closing !== undefined) p.closing += dt;
      if (p.closing !== undefined && p.closing >= FORM_CLOSE) { this.art.paint.planes.release(p.mesh); this.entries.delete(id); continue; }
      const state = warGodPose(p.remaining, p.age, p.closing, p.reduced, p.fresh); p.touched = false;
      p.mesh ??= this.art.paint.planes.acquire('aura'); if (!p.mesh) continue;
      this.art.paint.frame(p.mesh, 'aura', state.frame); this.art.paint.place(p.mesh, 'aura', p.at, 4 * state.width, 4);
      p.mesh.visibility = state.alpha;
    }
  }
  clear(): void { for (const p of this.entries.values()) this.art.paint.planes.release(p.mesh); this.entries.clear(); }
}
