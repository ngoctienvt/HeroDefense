import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { LY_TINH as L, LT_CAPS, pagodaCast } from './visual-ly-tinh-timeline.js';
import type { PagodaArt } from './visual-ly-tinh-art.js';
interface Cast { origin?: Vector3; aim: Vector3; windup: number; age: number; reduced: boolean; toss?: Mesh; layer?: Layer }
export class PagodaCharge {
  private entries = new Map<string, Cast>(); private pool: LayerPool;
  constructor(scene: Scene, private art: PagodaArt) {
    let serial = 0; this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'gold', `pagoda-charge-${serial++}`), LT_CAPS.casts, 'pagoda-charge');
  }
  begin(id: string, origin: Vector3 | undefined, aim: Vector3, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.entries.size < LT_CAPS.casts) this.entries.set(id, { origin: origin?.clone(), aim: aim.clone(), windup, reduced, age: 0 });
  }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.layer) this.pool.release(p.layer); this.art.paint.planes.release(p?.toss); this.entries.delete(id); }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
      const state = pagodaCast(p.age, p.windup, p.reduced); p.layer ??= this.pool.acquire();
      if (p.layer) {
        const { mesh, material: m } = p.layer; mesh.position.set(p.aim.x, .045, p.aim.z); mesh.scaling.set(L.radius * 2, 1, L.radius * 2); mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
        m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', state.alpha * .6); m.setFloat('uFill', state.fill);
        m.setFloat('uRim', .7); m.setFloat('uBand', 0); m.setFloat('uRings', .12); m.setFloat('uSwirl', .25); m.setFloat('uSpiral', .12);
      }
      if (p.origin) {
        p.toss ??= this.art.paint.planes.acquire('toss'); if (!p.toss) continue;
        this.art.paint.frame(p.toss, 'toss', state.frame); this.art.paint.place(p.toss, 'toss', this.art.palm(p.origin), 2 * state.scale, undefined, state.lift); p.toss.visibility = state.alpha;
      }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}
