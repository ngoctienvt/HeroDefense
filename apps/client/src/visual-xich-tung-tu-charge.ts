import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { LayerPool, createShellLayer, type Layer } from './visual-kit-layers.js';
import type { DewGourd } from './visual-xich-tung-tu-gourd.js';
import { XT_CAPS, gourdPose } from './visual-xich-tung-tu-timeline.js';
interface Charge { at: Vector3; age: number; windup: number; reduced: boolean; closing: boolean; layer?: Layer; mesh?: Mesh }
export class DewCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(scene: Scene, private gourd: DewGourd) { let i = 0; this.pool = new LayerPool(() => createShellLayer(scene, 'gold', `dew-charge-${i++}`, 12), XT_CAPS.casts, 'dew-charge'); }
  begin(id: string, at: Vector3, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.entries.size < XT_CAPS.casts) this.entries.set(id, { at: at.clone(), age: 0, windup, reduced, closing: false });
  }
  resolve(id: string, at: Vector3 | undefined, reduced: boolean): void {
    this.cancel(id); if (at && this.entries.size < XT_CAPS.casts) this.entries.set(id, { at: at.clone(), age: 0, windup: .25, reduced, closing: true });
  }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.layer) this.pool.release(p.layer); this.gourd.release(p?.mesh); this.entries.delete(id); }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > (p.closing ? .34 : p.windup + .3)) { this.cancel(id); continue; }
      const s = gourdPose(p.age, p.windup, p.closing, p.reduced); p.mesh ??= this.gourd.acquire();
      if (p.mesh) this.gourd.place(p.mesh, p.at, s.scale, s.turn, s.alpha);
      if (!p.closing) { p.layer ??= this.pool.acquire();
        if (p.layer) { const { mesh, material: m } = p.layer; mesh.position.set(p.at.x, 1.4, p.at.z); mesh.scaling.set(.7 * s.scale, .85 * s.scale, .7 * s.scale);
          m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', s.alpha * .28); m.setFloat('uFill', s.fill); m.setFloat('uRim', .4); } }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); this.gourd.clear(); }
}
