import { Engine } from '@babylonjs/core/Engines/engine.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { LayerPool, createShellLayer, type Layer } from './visual-kit-layers.js';
import { COMBAT_DRAW_GROUP, configureCombatDrawOrder } from './visual-kit-draw-order.js';
import { ringCharge, NT_CAPS } from './visual-na-tra-timeline.js';
import type { NaTraArt } from './visual-na-tra-art.js';
interface Cast { at: Vector3; windup: number; age: number; reduced: boolean; ring?: Mesh; shell?: Layer }
/** Personal charge hugs the raised ring at the upper arm; it is not a circle at aim or a damage region. */
export class NaTraCharge {
  private entries = new Map<string, Cast>(); private pool: LayerPool;
  constructor(scene: Scene, private art: NaTraArt) {
    configureCombatDrawOrder(scene); let serial = 0;
    this.pool = new LayerPool(() => {
      const layer = createShellLayer(scene, 'lava', `qiankun-charge-${serial++}`, 16);
      layer.mesh.renderingGroupId = COMBAT_DRAW_GROUP.skill; layer.material.depthFunction = Engine.ALWAYS; return layer;
    }, NT_CAPS.casts, 'qiankun-charge');
  }
  begin(id: string, at: Vector3, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.entries.size < NT_CAPS.casts) this.entries.set(id, { at: at.clone(), windup, reduced, age: 0 });
  }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.shell) this.pool.release(p.shell); this.art.paint.planes.release(p?.ring); this.entries.delete(id); }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
      const state = ringCharge(p.age, p.windup, p.reduced), at = this.art.castPoint(p.at);
      p.ring ??= this.art.paint.planes.acquire('ring');
      if (p.ring) { this.art.paint.frame(p.ring, 'ring', state.frame); this.art.paint.place(p.ring, 'ring', at, 1.9 * state.scale); p.ring.visibility = state.alpha; }
      p.shell ??= this.pool.acquire();
      if (p.shell) {
        p.shell.mesh.position.copyFrom(at); p.shell.mesh.scaling.setAll(1.4 * state.scale);
        p.shell.material.setFloat('uTime', p.reduced ? 0 : time); p.shell.material.setFloat('uAlpha', state.alpha * .2); p.shell.material.setFloat('uDissolve', .24);
      }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}
