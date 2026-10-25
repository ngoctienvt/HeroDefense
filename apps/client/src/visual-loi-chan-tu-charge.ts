import type { Scene } from '@babylonjs/core/scene.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { LC_CAPS, LOI, stormCharge } from './visual-loi-chan-tu-timeline.js';
import type { StormArt } from './visual-loi-chan-tu-art.js';
/** Hero-local actual gold/violet palette; shared shader geometry, no shared palette mutation. */
export function stormLayer(scene: Scene, id: string): Layer {
  const layer = createGroundLayer(scene, 'kitGround', 'netherfire', id);
  for (const [name, values] of Object.entries({ uDeep: [.102, .086, .188], uBody: [.247, .208, .439], uEdge: [.49, .357, .839], uFoam: [.949, .78, .267], uInk: [.055, .035, .09] }))
    layer.material.setColor3(name, new Color3(values[0], values[1], values[2]));
  return layer;
}
interface Charge { at: Vector3; windup: number; age: number; reduced: boolean; layer?: Layer; cloud?: Mesh }
export class StormCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(scene: Scene, private art: StormArt) {
    let serial = 0; this.pool = new LayerPool(() => stormLayer(scene, `storm-charge-${serial++}`), LC_CAPS.casts, 'storm-charge');
  }
  begin(id: string, at: Vector3, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.entries.size < LC_CAPS.casts) this.entries.set(id, { at: at.clone(), windup, reduced, age: 0 });
  }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.layer) this.pool.release(p.layer); this.art.paint.planes.release(p?.cloud); this.entries.delete(id); }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
      const s = stormCharge(p.age, p.windup, p.reduced); p.layer ??= this.pool.acquire();
      if (p.layer) {
        const { mesh, material: m } = p.layer; mesh.position.set(p.at.x, .045, p.at.z); mesh.scaling.set(LOI.radius * 2, 1, LOI.radius * 2); mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
        m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', s.alpha); m.setFloat('uFill', s.fill);
        m.setFloat('uRim', .8); m.setFloat('uBand', 0); m.setFloat('uRings', .1); m.setFloat('uSwirl', .3); m.setFloat('uSpiral', .15);
      }
      p.cloud ??= this.art.paint.planes.acquire('cloud');
      if (p.cloud) { this.art.paint.frame(p.cloud, 'cloud', s.frame); this.art.paint.place(p.cloud, 'cloud', p.at, LOI.radius * 1.8 * s.scale, undefined, 6); p.cloud.visibility = s.alpha; }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}
