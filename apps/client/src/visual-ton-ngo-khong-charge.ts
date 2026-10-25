import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { motion, sweep } from './visual-kit-timeline.js';
import { MONKEY, MONKEY_CAPS, type Point } from './visual-ton-ngo-khong-timeline.js';
interface Charge { at: Vector3; dir: Point; windup: number; age: number; reduced: boolean; layer?: Layer }
/** Charge is a bounded lane beneath the raised Ruyi, never a circular damage area. */
export function monkeyChargeState(age: number, windup: number, reduced: boolean, time: number) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { length: MONKEY.length * (.18 + .82 * power), width: MONKEY.width * (.5 + .5 * power),
    alpha: .1 + .22 * power, head: .3 + .7 * power, time: reduced ? 0 : time };
}
export class MonkeyCharge {
  private charges = new Map<string, Charge>(); private pool: LayerPool;
  constructor(scene: Scene) {
    let serial = 0;
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'gold', `monkey-charge-${serial++}`), MONKEY_CAPS.casts, 'monkey-charge');
  }
  begin(id: string, at: Vector3, dir: Point, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.charges.size >= MONKEY_CAPS.casts) return;
    this.charges.set(id, { at: at.clone(), dir, windup, reduced, age: 0 });
  }
  cancel(id: string): void {
    const charge = this.charges.get(id); if (charge?.layer) this.pool.release(charge.layer); this.charges.delete(id);
  }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.charges) {
      p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
      p.layer ??= this.pool.acquire(); if (!p.layer) continue;
      const s = monkeyChargeState(p.age, p.windup, p.reduced, time), { mesh, material: m } = p.layer;
      mesh.position.set(p.at.x + p.dir.x * s.length / 2, .045, p.at.z + p.dir.z * s.length / 2);
      mesh.rotation.y = -Math.atan2(p.dir.z, p.dir.x); mesh.scaling.set(s.length, 1, s.width);
      mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      m.setFloat('uTime', s.time); m.setFloat('uAlpha', s.alpha); m.setFloat('uHead', s.head);
      m.setFloat('uTail', 0); m.setFloat('uWave', p.reduced ? 0 : .08); m.setFloat('uTaper', .35);
    }
  }
  clear(): void { this.charges.clear(); this.pool.releaseAll(); }
}
