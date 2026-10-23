import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { NguuMaVuongArt } from './visual-nguu-ma-vuong-art.js';
import { NGUU_MA_VUONG as N, NM_CAPS, hornCharge } from './visual-nguu-ma-vuong-timeline.js';
type Charge = { source: string; at: Vector3; age: number; windup: number; reduced: boolean;
  border: Layer; core: Layer; mesh?: Mesh };
export class NguuMaVuongCharge {
  private pool: LayerPool; private active: Charge[] = [];
  constructor(scene: Scene, private pieces: NguuMaVuongArt) {
    let serial = 0;
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'nguumavuong', `nguu-ma-vuong-charge-${serial++}`), NM_CAPS.casts * 2, 'nguu-ma-vuong-charge');
  }
  begin(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.cancel(source); const border = this.pool.acquire(), core = this.pool.acquire();
    if (!border || !core) { if (border) this.pool.release(border); if (core) this.pool.release(core); return; }
    border.mesh.position.set(at.x, .055, at.z); border.mesh.scaling.setAll(N.radius * 2);
    core.mesh.position.set(at.x, .06, at.z); border.mesh.alphaIndex = core.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    this.active.push({ source, at: at.clone(), age: 0, windup, reduced, border, core });
  }
  tick(dt: number, time: number): void {
    for (const c of [...this.active]) {
      c.age += dt; if (c.age > c.windup + .3) { this.cancel(c.source); continue; }
      const pose = hornCharge(c.age, c.windup, c.reduced);
      for (const layer of [c.border, c.core]) {
        const m = layer.material; m.setFloat('uTime', c.reduced ? 0 : time); m.setFloat('uAlpha', .75 * pose.alpha);
        m.setFloat('uFill', layer === c.border ? 0 : .22); m.setFloat('uRim', layer === c.border ? 1 : .4);
        m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSwirl', c.reduced ? 0 : 1.1); m.setFloat('uSpiral', layer === c.border ? 0 : .5);
      }
      c.core.mesh.scaling.setAll(3 * pose.scale);
      c.mesh ??= this.pieces.art.planes.acquire('charge'); if (c.mesh) {
        this.pieces.art.frame(c.mesh, 'charge', pose.frame);
        this.pieces.art.place(c.mesh, 'charge', c.at, 5.3 * pose.scale); c.mesh.visibility = pose.alpha;
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
