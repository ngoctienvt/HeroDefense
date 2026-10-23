import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { screenUp } from './visual-kit-billboard.js';
import { cameraLook } from './visual-de-tuan-strip.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { TramHuongArt } from './visual-tram-huong-art.js';
import { TRAM_HUONG as T, TH_CAPS, lampCharge } from './visual-tram-huong-timeline.js';
type Charge = { source: string; origin: Vector3; aim: Vector3; windup: number; age: number; reduced: boolean;
  border: Layer; core: Layer; lamp?: Mesh; axe?: Mesh };

export class TramHuongCharge {
  private active: Charge[] = []; private pool: LayerPool;
  constructor(private scene: Scene, private art: TramHuongArt) {
    let serial = 0;
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'tramhuong', `tram-huong-charge-${serial++}`), TH_CAPS.casts * 2, 'tram-huong-charge');
  }
  begin(source: string, origin: Vector3, aim: Vector3, windup: number, reduced: boolean): void {
    this.cancel(source); const border = this.pool.acquire(), core = this.pool.acquire();
    if (!border || !core) { if (border) this.pool.release(border); if (core) this.pool.release(core); return; }
    border.mesh.position.set(aim.x, .055, aim.z); border.mesh.scaling.setAll(T.radius * 2);
    core.mesh.position.set(origin.x, .06, origin.z);
    this.active.push({ source, origin: origin.clone(), aim: aim.clone(), windup, age: 0, reduced, border, core });
  }
  tick(dt: number, time: number): void {
    for (const c of [...this.active]) {
      c.age += dt; if (c.age > c.windup + .3) { this.cancel(c.source); continue; }
      const pose = lampCharge(c.age, c.windup, c.reduced);
      for (const layer of [c.border, c.core]) {
        const m = layer.material;
        m.setFloat('uTime', c.reduced ? 0 : time); m.setFloat('uAlpha', .8 * pose.alpha);
        m.setFloat('uFill', layer === c.border ? 0 : .2); m.setFloat('uRim', layer === c.border ? 1 : .4);
        m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSpiral', layer === c.border ? 0 : .45);
        m.setFloat('uSwirl', c.reduced ? 0 : .8);
      }
      c.core.mesh.scaling.setAll(2.6 * pose.scale);
      const up = screenUp(this.scene), side = Vector3.Cross(cameraLook(this.scene), up).normalize();
      // h03Q plane is 8.03u; the visible upper body occupies ~5–6u. Keep the
      // lamp beside that shoulder, in the skill pass underneath the hero.
      const shoulder = c.origin.add(side.scale(2.25)).add(up.scale(3.65));
      c.lamp ??= this.art.art.planes.acquire('lamp');
      if (c.lamp) {
        this.art.art.frame(c.lamp, 'lamp', pose.frame);
        this.art.art.place(c.lamp, 'lamp', shoulder, 2.8 * pose.scale); c.lamp.visibility = pose.alpha;
      }
      c.axe ??= this.art.art.planes.acquire('axe');
      if (c.axe) {
        this.art.art.frame(c.axe, 'axe', pose.frame);
        this.art.art.place(c.axe, 'axe', c.aim, 7.4, 7.4, 6); c.axe.visibility = pose.alpha * .8;
      }
    }
  }
  cancel(source: string): void {
    this.active = this.active.filter(c => {
      if (c.source !== source) return true;
      this.pool.release(c.border); this.pool.release(c.core);
      this.art.art.planes.release(c.lamp); this.art.art.planes.release(c.axe); return false;
    });
  }
  clear(): void { for (const c of [...this.active]) this.cancel(c.source); this.pool.releaseAll(); }
}
