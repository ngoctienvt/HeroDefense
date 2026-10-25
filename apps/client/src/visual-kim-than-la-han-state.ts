import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { CompassionArt } from './visual-kim-than-la-han-art.js';
import { KH_CAPS, VOW_CLOSE, vowFrame, vowExit } from './visual-kim-than-la-han-timeline.js';
import { debug } from './debug.js';
interface Mark { at: Vector3; remaining: number; active: boolean; reduced: boolean; touched: boolean; close?: number; back?: Mesh; front?: Mesh; body?: Mesh }
/** Two touched channels let vow fold while real active-body state unfolds. Neither channel emits activation. */
export class ImmortalState {
  private entries = new Map<string, Mark>();
  constructor(private art: CompassionArt) {}
  mark(id: string, at: Vector3, remaining: number, activeRemaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, remaining, activeRemaining].every(Number.isFinite)) return;
    const active = activeRemaining > 0, clock = active ? activeRemaining : remaining; if (clock <= 0) return;
    const key = `${id}:${active ? 'body' : 'vow'}`; let p = this.entries.get(key);
    if (!p) { if (this.entries.size >= KH_CAPS.marks) return; p = { at: at.clone(), remaining: clock, active, reduced, touched: true }; this.entries.set(key, p); debug('visual.kim-than-la-han.state.seen', { active, remaining: clock, reduced }); }
    p.at.copyFrom(at); p.remaining = clock; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number): void { for (const [id, p] of this.entries) {
    if (!p.touched && p.close === undefined) { p.close = 0; debug('visual.kim-than-la-han.state.fold', { active: p.active }); }
    if (p.close !== undefined) p.close += dt;
    if (p.close !== undefined && p.close >= VOW_CLOSE) { this.release(p); this.entries.delete(id); continue; }
    p.touched = false; const frame = vowFrame(p.remaining, p.active, p.close, p.reduced), s = vowExit(p.close, p.reduced);
    if (p.active) { p.body ??= this.art.paint.planes.acquire('body'); if (p.body) {
      this.art.paint.frame(p.body, 'body', frame); this.art.paint.place(p.body, 'body', p.at, 2.05 * s.scale, 2.05 * s.scale, .02); p.body.rotation.z = s.fold * .18; p.body.visibility = s.alpha; } }
    else {
      p.back ??= this.art.paint.planes.acquire('back'); p.front ??= this.art.paint.planes.acquire('front');
      for (const [mesh, key] of [[p.back, 'back'], [p.front, 'front']] as const) if (mesh) {
        this.art.paint.frame(mesh, key, frame); this.art.paint.place(mesh, key, p.at, 2.55 * s.scale, 2.55 * (1 - s.fold * .4), .03);
        mesh.rotation.z = (key === 'front' ? 1 : -1) * s.fold * .18; mesh.visibility = s.alpha * (key === 'front' ? .8 : .9); }
    }
  } }
  private release(p: Mark): void { this.art.paint.planes.release(p.back); this.art.paint.planes.release(p.front); this.art.paint.planes.release(p.body); }
  clear(): void { for (const p of this.entries.values()) this.release(p); this.entries.clear(); }
}
