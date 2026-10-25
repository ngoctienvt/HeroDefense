import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KhongTuocArt } from './visual-khong-tuoc-art.js';
import { fanFrame, KHONG_TUOC as K } from './visual-khong-tuoc-timeline.js';
import { motion, sweep } from './visual-kit-timeline.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
interface Charge { id: string; at: Vector3; windup: number; age: number; reduced: boolean; fan?: Mesh; core: Layer; border: Layer }
export class KhongTuocCharge {
  private pool: LayerPool;
  private live: Charge[] = [];
  constructor(scene: Scene, private art: KhongTuocArt) {
    let serial = 0;
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'peacock', `peacock-charge-${serial++}`), 16, 'peacock-charge');
  }
  begin(id: string, at: Vector3, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.live.length >= 8 || !Number.isFinite(windup) || windup <= 0) return;
    const core = this.pool.acquire(), border = this.pool.acquire();
    if (!core || !border) { if (core) this.pool.release(core); if (border) this.pool.release(border); return; }
    const fan = this.art.planes.acquire('fan');
    this.live.push({ id, at: at.clone(), windup, age: 0, reduced, core, border, fan });
  }
  cancel(id: string): void {
    for (let i = this.live.length - 1; i >= 0; i--) if (this.live[i].id === id) this.remove(i);
  }
  private remove(i: number): void {
    const p = this.live[i]; this.art.planes.release(p.fan); this.pool.release(p.core); this.pool.release(p.border); this.live.splice(i, 1);
  }
  tick(dt: number, time: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]; p.age += dt;
      if (p.age > p.windup + .3) { this.remove(i); continue; }
      const t = p.reduced ? 1 : motion.settle(sweep(p.age, 0, p.windup));
      for (const [layer, outer] of [[p.core, false], [p.border, true]] as const) {
        layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
        layer.mesh.position.set(p.at.x, .06, p.at.z);
        layer.mesh.scaling.setAll(outer ? K.radius * 2 : 2.5 + 2 * t);
        const m = layer.material; m.setFloat('uAlpha', outer ? .62 : .2 + .5 * t);
        m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uFill', 0); m.setFloat('uRim', 1);
        m.setFloat('uRings', 0); m.setFloat('uBand', 0); m.setFloat('uSwirl', outer || p.reduced ? 0 : .45);
      }
      p.fan ??= this.art.planes.acquire('fan');
      if (p.fan) this.art.fan(p.fan, p.at, fanFrame(p.age, p.windup, p.reduced), .35 + .6 * t, p.reduced ? 1 : .78 + .22 * t);
    }
  }
  clear(): void { while (this.live.length) this.remove(this.live.length - 1); }
}
