import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { ChungQuyArt } from './visual-chung-quy-art.js';
import { CHUNG_QUY as C, CQ_CAPS, sealCharge } from './visual-chung-quy-timeline.js';
type Charge = { source: string; origin: Vector3; aim: Vector3; age: number; windup: number; reduced: boolean;
  border: Layer; core: Layer; mesh?: Mesh };
export class ChungQuyCharge {
  private pool: LayerPool; private active: Charge[] = [];
  constructor(scene: Scene, private pieces: ChungQuyArt) {
    let serial = 0;
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'chungquy', `chung-quy-charge-${serial++}`), CQ_CAPS.casts * 2, 'chung-quy-charge');
  }
  begin(source: string, origin: Vector3, aim: Vector3, windup: number, reduced: boolean): void {
    this.cancel(source); const border = this.pool.acquire(), core = this.pool.acquire();
    if (!border || !core) { if (border) this.pool.release(border); if (core) this.pool.release(core); return; }
    border.mesh.position.set(aim.x, .06, aim.z); border.mesh.scaling.setAll(C.radius * 2);
    core.mesh.position.set(origin.x, .065, origin.z);
    border.mesh.alphaIndex = core.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    this.active.push({ source, origin: origin.clone(), aim: aim.clone(), age: 0, windup, reduced, border, core });
  }
  tick(dt: number, time: number): void {
    for (const c of [...this.active]) {
      c.age += dt; if (c.age > c.windup + .3) { this.cancel(c.source); continue; }
      const pose = sealCharge(c.age, c.windup);
      const scale = c.reduced ? 1 : pose.scale;
      for (const layer of [c.border, c.core]) {
        const m = layer.material; m.setFloat('uTime', c.reduced ? 0 : time); m.setFloat('uAlpha', .8 * pose.alpha);
        m.setFloat('uFill', layer === c.border ? 0 : .22); m.setFloat('uRim', layer === c.border ? 1 : .4);
        m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSwirl', c.reduced ? 0 : .6); m.setFloat('uSpiral', 0);
      }
      c.core.mesh.scaling.setAll(2.8 * scale);
      c.mesh ??= this.pieces.art.planes.acquire('talisman'); if (c.mesh) {
        this.pieces.art.crop(c.mesh, 'talisman');
        this.pieces.art.place(c.mesh, 'talisman', c.origin, 3.3 * scale, .8 * scale, .9);
        c.mesh.visibility = pose.alpha;
      }
    }
  }
  cancel(source: string): void {
    this.active = this.active.filter(c => {
      if (c.source !== source) return true;
      this.pool.release(c.border); this.pool.release(c.core); this.pieces.art.planes.release(c.mesh); return false;
    });
  }
  clear(): void { for (const c of [...this.active]) this.cancel(c.source); this.pool.releaseAll(); }
}
