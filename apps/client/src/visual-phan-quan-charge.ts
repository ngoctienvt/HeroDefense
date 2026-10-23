import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { PhanQuanArt } from './visual-phan-quan-art.js';
import { PHAN_QUAN as P, PQ_CAPS, LEDGER_SIZE, LEDGER_LIFT, ledgerCharge } from './visual-phan-quan-timeline.js';
type Charge = { source: string; origin: Vector3; direction?: Vector3; age: number; windup: number; reduced: boolean;
  floor: Layer; ledger?: Mesh; arc?: Mesh };
export class PhanQuanCharge {
  private pool: LayerPool; private active: Charge[] = [];
  constructor(scene: Scene, private pieces: PhanQuanArt) {
    let serial = 0;
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitSlash', 'phanquan', `phan-quan-charge-${serial++}`), PQ_CAPS.casts, 'phan-quan-charge');
  }
  begin(source: string, origin: Vector3, direction: Vector3 | undefined, windup: number, reduced: boolean): void {
    this.cancel(source); const floor = this.pool.acquire(); if (!floor) return;
    floor.mesh.position.set(origin.x, .06, origin.z); floor.mesh.scaling.setAll(P.radius * 2 / 1.03);
    if (direction) floor.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    floor.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    this.active.push({ source, origin: origin.clone(), direction, age: 0, windup, reduced, floor });
  }
  tick(dt: number, time: number): void {
    for (const c of [...this.active]) {
      c.age += dt; if (c.age > c.windup + .3) { this.cancel(c.source); continue; }
      const pose = ledgerCharge(c.age, c.windup), m = c.floor.material;
      m.setFloat('uTime', c.reduced ? 0 : time); m.setFloat('uAlpha', c.direction ? .42 * pose.alpha : 0);
      m.setFloat('uArc', Math.PI / 2); m.setFloat('uHead', 1); m.setFloat('uTail', 0);
      if (c.direction) {
        c.arc ??= this.pieces.art.planes.acquire('arc', true);
        if (c.arc) this.pieces.placeArc(c.arc, c.origin, c.direction, 1, .5 * pose.alpha);
      }
      c.ledger ??= this.pieces.art.planes.acquire('ledger'); if (c.ledger) {
        const scale = c.reduced ? 1 : pose.scale;
        this.pieces.art.frame(c.ledger, 'ledger', c.reduced ? 2 : pose.frame);
        this.pieces.art.place(c.ledger, 'ledger', c.origin, LEDGER_SIZE * scale, undefined, LEDGER_LIFT); c.ledger.visibility = pose.alpha;
      }
    }
  }
  cancel(source: string): void {
    this.active = this.active.filter(c => {
      if (c.source !== source) return true;
      this.pool.release(c.floor); this.pieces.art.planes.release(c.ledger); this.pieces.art.planes.release(c.arc); return false;
    });
  }
  clear(): void { for (const c of [...this.active]) this.cancel(c.source); this.pool.releaseAll(); }
}
