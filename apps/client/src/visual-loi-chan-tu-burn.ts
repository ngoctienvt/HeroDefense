import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { StormArt } from './visual-loi-chan-tu-art.js';
import { BURN_CLOSE, LC_CAPS, staticBurnPose } from './visual-loi-chan-tu-timeline.js';
import { debug } from './debug.js';
interface Burn { at: Vector3; remaining: number; reduced: boolean; touched: boolean; close?: number; mesh?: Mesh }
/** Root verifies burn.casterId → h00T; this presents electric residue without touching other heroes' fire burns. */
export class StormBurn {
  private entries = new Map<string, Burn>();
  constructor(private art: StormArt) {}
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    let p = this.entries.get(id);
    if (!p) { if (this.entries.size >= LC_CAPS.burn) return;
      p = { at: at.clone(), remaining, reduced, touched: true }; this.entries.set(id, p);
      debug('visual.loi-chan-tu.burn.seen', { remaining, reduced }); }
    p.at.copyFrom(at); p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number): void {
    for (const [id, p] of this.entries) {
      if (!p.touched && p.close === undefined) { p.close = 0; debug('visual.loi-chan-tu.burn.discharge', {}); }
      if (p.close !== undefined) p.close += dt;
      if (p.close !== undefined && p.close >= BURN_CLOSE) { this.art.paint.planes.release(p.mesh); this.entries.delete(id); continue; }
      const state = staticBurnPose(p.remaining, p.close, p.reduced); p.touched = false;
      p.mesh ??= this.art.paint.planes.acquire('burn'); if (!p.mesh) continue;
      this.art.paint.frame(p.mesh, 'burn', state.frame); this.art.paint.place(p.mesh, 'burn', p.at, 2.25 * state.scale, undefined, .1); p.mesh.visibility = state.alpha;
    }
  }
  clear(): void { for (const p of this.entries.values()) this.art.paint.planes.release(p.mesh); this.entries.clear(); }
}
