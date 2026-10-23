import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { TieuBachLongArt } from './visual-tieu-bach-long-art.js';
import { GALE_CAPS, galeCharge } from './visual-tieu-bach-long-timeline.js';

type Charge = { source: string; at: Vector3; age: number; windup: number; reduced: boolean; floor: Layer; mesh?: Mesh; leaves: number };
export class TieuBachLongCharge {
  private pool: LayerPool; private active: Charge[] = [];
  constructor(scene: Scene, private pieces: TieuBachLongArt, private bank: KitFxBank) {
    let serial = 0;
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'tieubachlong', `tieu-bach-long-charge-${serial++}`),
      GALE_CAPS.charges, 'tieu-bach-long-charge');
  }
  begin(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.cancel(source); const floor = this.pool.acquire(); if (!floor) return;
    floor.mesh.position.set(at.x, .06, at.z); floor.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    this.active.push({ source, at: at.clone(), age: 0, windup, reduced, floor, leaves: 0 });
  }
  tick(dt: number, time: number): void {
    for (const c of [...this.active]) {
      c.age += dt; if (c.age > c.windup + .3) { this.cancel(c.source); continue; }
      const pose = galeCharge(c.age, c.windup, c.reduced), m = c.floor.material;
      c.floor.mesh.scaling.setAll(3.4);
      m.setFloat('uTime', c.reduced ? 0 : time); m.setFloat('uAlpha', .6 * pose.alpha);
      m.setFloat('uFill', .12); m.setFloat('uRim', .75); m.setFloat('uBand', 0); m.setFloat('uRings', .3);
      m.setFloat('uSwirl', c.reduced ? 0 : 1.5); m.setFloat('uSpiral', c.reduced ? 0 : pose.power);
      c.mesh ??= this.pieces.art.planes.acquire('charge'); if (c.mesh) {
        this.pieces.art.frame(c.mesh, 'charge', pose.frame);
        this.pieces.art.place(c.mesh, 'charge', c.at, 5 * pose.scale, 5 * pose.scale, 1.15); c.mesh.visibility = pose.alpha;
      }
      const leaves = Math.floor(Math.min(c.age, c.windup) * 16);
      if (!c.reduced && leaves > c.leaves) this.bank.spray('tieubachlong').rise(c.at, 1.2, Math.min(2, leaves - c.leaves));
      c.leaves = leaves;
    }
  }
  cancel(source: string): void {
    this.active = this.active.filter(c => {
      if (c.source !== source) return true;
      this.pool.release(c.floor); this.pieces.art.planes.release(c.mesh); return false;
    });
  }
  clear(): void { for (const c of [...this.active]) this.cancel(c.source); this.pool.releaseAll(); }
}
