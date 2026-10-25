import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { SaNgoTinhArt } from './visual-sa-ngo-tinh-art.js';
import { SA_CAPS, sandCharge } from './visual-sa-ngo-tinh-timeline.js';

type Charge = { source: string; at: Vector3; age: number; windup: number; reduced: boolean; floor: Layer; staff?: Mesh; grains: number };

export class SaNgoTinhCharge {
  private pool: LayerPool; private active: Charge[] = [];
  constructor(scene: Scene, private pieces: SaNgoTinhArt, private bank: KitFxBank) {
    let serial = 0;
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'sangotinh', `sa-ngo-tinh-charge-${serial++}`),
      SA_CAPS.charges, 'sa-ngo-tinh-charge');
  }
  begin(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.cancel(source); const floor = this.pool.acquire(); if (!floor) return;
    floor.mesh.position.set(at.x, .06, at.z); floor.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    this.active.push({ source, at: at.clone(), age: 0, windup, reduced, floor, grains: 0 });
  }
  tick(dt: number, time: number): void {
    for (const c of [...this.active]) {
      c.age += dt;
      if (c.age > c.windup + .3) { this.cancel(c.source); continue; }
      const pose = sandCharge(c.age, c.windup, c.reduced), m = c.floor.material;
      c.floor.mesh.scaling.setAll(4.2);
      m.setFloat('uTime', c.reduced ? 0 : time); m.setFloat('uAlpha', .65 * pose.alpha);
      m.setFloat('uFill', .14 + .25 * pose.power); m.setFloat('uRim', .75); m.setFloat('uBand', 0);
      m.setFloat('uRings', .6); m.setFloat('uSwirl', c.reduced ? 0 : 1.5); m.setFloat('uSpiral', c.reduced ? 0 : .8);
      c.staff ??= this.pieces.art.planes.acquire('chant');
      if (c.staff) {
        this.pieces.art.frame(c.staff, 'chant', pose.frame);
        this.pieces.art.place(c.staff, 'chant', c.at, 5 * pose.scale); c.staff.visibility = pose.alpha;
      }
      const grains = Math.floor(Math.min(c.age, c.windup) * 24);
      if (!c.reduced && grains > c.grains) this.bank.spray('sangotinh').rise(c.at, 1.4, Math.min(3, grains - c.grains));
      c.grains = grains;
    }
  }
  cancel(source: string): void {
    this.active = this.active.filter(c => {
      if (c.source !== source) return true;
      this.pool.release(c.floor); this.pieces.art.planes.release(c.staff); return false;
    });
  }
  clear(): void { for (const c of [...this.active]) this.cancel(c.source); this.pool.releaseAll(); }
}
