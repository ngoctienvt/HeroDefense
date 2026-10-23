import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { TinhVeArt } from './visual-tinh-ve-art.js';
import { TINH_CAPS, stoneCharge } from './visual-tinh-ve-timeline.js';

type Charge = { source: string; at: Vector3; age: number; windup: number; reduced: boolean; floor: Layer; mesh?: Mesh; grains: number };
export class TinhVeCharge {
  private pool: LayerPool; private active: Charge[] = [];
  constructor(scene: Scene, private pieces: TinhVeArt, private bank: KitFxBank) {
    let serial = 0;
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'tinhve', `tinh-ve-charge-${serial++}`), TINH_CAPS.charges, 'tinh-ve-charge');
  }
  begin(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.cancel(source); const floor = this.pool.acquire(); if (!floor) return;
    floor.mesh.position.set(at.x, .06, at.z); floor.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    this.active.push({ source, at: at.clone(), age: 0, windup, reduced, floor, grains: 0 });
  }
  tick(dt: number, time: number): void {
    for (const c of [...this.active]) {
      c.age += dt; if (c.age > c.windup + .3) { this.cancel(c.source); continue; }
      const pose = stoneCharge(c.age, c.windup, c.reduced), m = c.floor.material;
      c.floor.mesh.scaling.setAll(3.4); m.setFloat('uTime', c.reduced ? 0 : time); m.setFloat('uAlpha', .55 * pose.alpha);
      m.setFloat('uFill', .15); m.setFloat('uRim', .65); m.setFloat('uBand', 0); m.setFloat('uRings', .2);
      m.setFloat('uSwirl', c.reduced ? 0 : .8); m.setFloat('uSpiral', c.reduced ? 0 : pose.power);
      c.mesh ??= this.pieces.art.planes.acquire('call'); if (c.mesh) {
        this.pieces.art.frame(c.mesh, 'call', pose.frame); this.pieces.art.place(c.mesh, 'call', c.at, 4.5 * pose.scale);
        c.mesh.visibility = pose.alpha;
      }
      const grains = Math.floor(Math.min(c.age, c.windup) * 16);
      if (!c.reduced && grains > c.grains) this.bank.spray('tinhve').rise(c.at, 1.1, Math.min(2, grains - c.grains));
      c.grains = grains;
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
