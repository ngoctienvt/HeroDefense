import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { LayerPool, createGroundLayer, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { ND_CAPS, NGU_DAO as N, samsaraCharge } from './visual-ngu-dao-timeline.js';
import type { SamsaraArt } from './visual-ngu-dao-art.js';
interface Charge { origin?: Vector3; aim: Vector3; age: number; windup: number; reduced: boolean; layer?: Layer; wheel?: Mesh }
export class SamsaraCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(scene: Scene, private art: SamsaraArt) {
    let serial = 0; this.pool = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'jade', `samsara-warning-${serial++}`);
      for (const [name, rgb] of Object.entries({ uDeep: [.06, .1, .14], uBody: [.13, .22, .29], uEdge: [.24, .55, .58], uFoam: [.56, .89, .84], uInk: [.02, .04, .06] })) layer.material.setColor3(name, new Color3(rgb[0], rgb[1], rgb[2]));
      return layer;
    }, ND_CAPS.casts, 'samsara-warning');
  }
  begin(id: string, origin: Vector3 | undefined, aim: Vector3, windup: number, reduced: boolean): void { this.cancel(id); if (this.entries.size < ND_CAPS.casts) this.entries.set(id, { origin: origin?.clone(), aim: aim.clone(), windup, reduced, age: 0 }); }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.layer) this.pool.release(p.layer); this.art.paint.planes.release(p?.wheel); this.entries.delete(id); }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
      const state = samsaraCharge(p.age, p.windup, p.reduced); p.layer ??= this.pool.acquire();
      if (p.layer) { const { mesh, material: m } = p.layer; mesh.position.set(p.aim.x, .045, p.aim.z); mesh.scaling.set(N.radius * 2, 1, N.radius * 2); mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
        m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', state.alpha * .6); m.setFloat('uFill', state.fill); m.setFloat('uRim', .65);
        m.setFloat('uBand', 0); m.setFloat('uRings', .1); m.setFloat('uSwirl', .25); m.setFloat('uSpiral', .12); }
      if (p.origin) { p.wheel ??= this.art.paint.planes.acquire('wheel');
        if (p.wheel) { this.art.paint.frame(p.wheel, 'wheel', state.frame); this.art.paint.place(p.wheel, 'wheel', p.origin, 5 * state.scale, 5 * state.scale, .3); p.wheel.visibility = state.alpha; } }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}
