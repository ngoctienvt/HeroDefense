import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Tier3Art } from './visual-tier3-art.js';
import { farDirection, screenUp } from './visual-kit-billboard.js';
import { NT_CAPS, NA_TRA as N, NT_FORM_CLOSE, nezhaFormPose } from './visual-na-tra-timeline.js';
import { debug } from './debug.js';
import layout from './visual-na-tra-layout.json';
interface Form { at: Vector3; remaining: number; age: number; fresh: boolean; touched: boolean; reduced: boolean; close?: number; arms?: Mesh; wheels: (Mesh | undefined)[] }
/** Personal silhouette/feet accents behind the hero; the R5 boosted attack/passive assets are deliberately excluded. */
export class NaTraForm {
  private entries = new Map<string, Form>(); private art: Tier3Art<'form' | 'ring'>;
  constructor(private scene: Scene) { this.art = new Tier3Art(scene, 'na-tra', { form: layout.form, ring: layout.ring }, [], NT_CAPS.forms * 3); }
  prepare(): void { this.art.prepare(); }
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    let p = this.entries.get(id);
    if (!p) { if (this.entries.size >= NT_CAPS.forms) return;
      p = { at: at.clone(), remaining, age: 0, fresh: remaining >= N.formLife - .2, touched: true, reduced, wheels: [] }; this.entries.set(id, p);
      debug('visual.na-tra.form.seen', { remaining, fresh: p.fresh, reduced }); }
    p.at.copyFrom(at); p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (!p.touched && p.close === undefined) { p.close = 0; debug('visual.na-tra.form.extinguish', {}); }
      if (p.close !== undefined) p.close += dt;
      if (p.close !== undefined && p.close >= NT_FORM_CLOSE) { this.release(p); this.entries.delete(id); continue; }
      const state = nezhaFormPose(p.remaining, p.age, p.close, p.reduced, p.fresh); p.touched = false;
      p.arms ??= this.art.planes.acquire('form');
      if (p.arms) { this.art.frame(p.arms, 'form', state.frame); this.art.place(p.arms, 'form', p.at, 4.6 * state.width, 4.8, .65); p.arms.visibility = state.alpha; }
      const right = Vector3.Cross(screenUp(this.scene), farDirection(this.scene)).normalize();
      for (let i = 0; i < 2; i++) {
        p.wheels[i] ??= this.art.planes.acquire('ring'); const wheel = p.wheels[i]; if (!wheel) continue;
        this.art.frame(wheel, 'ring', p.reduced ? 0 : (i ? 7 - state.wheel : state.wheel));
        this.art.place(wheel, 'ring', p.at.add(right.scale(i ? .48 : -.48)), .95 * state.scale, undefined, .14); wheel.visibility = state.alpha * .82;
      }
    }
  }
  private release(p: Form): void { this.art.planes.release(p.arms); for (const wheel of p.wheels) this.art.planes.release(wheel); }
  clear(): void { for (const p of this.entries.values()) this.release(p); this.entries.clear(); this.art.clear(); }
}
