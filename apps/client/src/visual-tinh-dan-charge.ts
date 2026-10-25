import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { LayerPool, createGroundLayer, type Layer } from './visual-kit-layers.js';
import type { LotusArt } from './visual-tinh-dan-art.js';
import { TINH as T, TD_CAPS, lotusCharge } from './visual-tinh-dan-timeline.js';
interface Charge { at: Vector3; age: number; windup: number; reduced: boolean; layer?: Layer; aura?: Mesh }
export class LotusCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(scene: Scene, private art: LotusArt) { let i = 0; this.pool = new LayerPool(() => {
    const l = createGroundLayer(scene, 'kitGround', 'gold', `lotus-windup-${i++}`);
    for (const [key, c] of Object.entries({ uDeep: [.176, .125, .071], uBody: [.24, .56, .69], uEdge: [.886, .71, .306], uFoam: [1, .945, .776], uInk: [.07, .08, .08] })) l.material.setColor3(key, new Color3(c[0], c[1], c[2])); return l;
  }, TD_CAPS.casts, 'lotus-windup'); }
  begin(id: string, at: Vector3, windup: number, reduced: boolean): void { this.cancel(id); if (this.entries.size < TD_CAPS.casts) this.entries.set(id, { at: at.clone(), age: 0, windup, reduced }); }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.layer) this.pool.release(p.layer); this.art.paint.planes.release(p?.aura); this.entries.delete(id); }
  tick(dt: number, time: number): void { for (const [id, p] of this.entries) {
    p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
    const s = lotusCharge(p.age, p.windup, p.reduced); p.layer ??= this.pool.acquire();
    if (p.layer) { const { mesh, material: m } = p.layer; mesh.position.set(p.at.x, .045, p.at.z); mesh.scaling.set(T.radius * 2, 1, T.radius * 2);
      m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', s.alpha * .55); m.setFloat('uFill', s.fill); m.setFloat('uRim', .7); m.setFloat('uBand', 0); m.setFloat('uSwirl', .4); m.setFloat('uSpiral', .25); }
    p.aura ??= this.art.paint.planes.acquire('aura'); if (p.aura) { this.art.paint.frame(p.aura, 'aura', s.frame); this.art.paint.place(p.aura, 'aura', p.at, 3.4 * s.scale, 3.4 * s.scale, 1.2); p.aura.visibility = s.alpha; }
  } }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}
