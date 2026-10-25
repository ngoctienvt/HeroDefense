import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { farDirection, screenUp } from './visual-kit-billboard.js';
import type { DharmaArt } from './visual-duong-tang-art.js';
import { chantState, DUONG_TANG as D, DT_CAPS } from './visual-duong-tang-timeline.js';
interface Charge { aim: Vector3; origin?: Vector3; age: number; windup: number; reduced: boolean; layer?: Layer; chant?: Mesh }
/** Actual aim keeps a fixed R6 rim. Filling/chant grows with windup and the shader clock advances every frame. */
export class DharmaCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(private scene: Scene, private art: DharmaArt) {
    let serial = 0; this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'gold', `sutra-charge-${serial++}`), DT_CAPS.charge, 'sutra-charge');
  }
  begin(id: string, origin: Vector3 | undefined, aim: Vector3, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.entries.size >= DT_CAPS.charge) return;
    this.entries.set(id, { origin: origin?.clone(), aim: aim.clone(), windup, reduced, age: 0 });
  }
  cancel(id: string): void {
    const p = this.entries.get(id); if (p?.layer) this.pool.release(p.layer);
    this.art.paint.planes.release(p?.chant); this.entries.delete(id);
  }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
      const state = chantState(p.age, p.windup, p.reduced);
      p.layer ??= this.pool.acquire();
      if (p.layer) {
        const { mesh, material: m } = p.layer;
        mesh.position.set(p.aim.x, .045, p.aim.z); mesh.scaling.set(D.radius * 2, 1, D.radius * 2); mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
        m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', state.alpha * .6);
        m.setFloat('uFill', state.fill); m.setFloat('uRim', .8); m.setFloat('uBand', 0);
        m.setFloat('uRings', .18); m.setFloat('uSpiral', .15); m.setFloat('uSwirl', .3);
      }
      if (p.origin) {
        p.chant ??= this.art.paint.planes.acquire('chant'); if (!p.chant) continue;
        const right = Vector3.Cross(screenUp(this.scene), farDirection(this.scene)).normalize();
        const shoulder = p.origin.add(right.scale(1.45));
        this.art.paint.frame(p.chant, 'chant', state.frame); this.art.paint.place(p.chant, 'chant', shoulder, state.size, undefined, 3.2);
        p.chant.visibility = state.alpha;
      }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}
