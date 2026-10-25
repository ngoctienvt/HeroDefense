import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';

import type { HeavenArt } from './visual-duong-tien-art.js';
import { DTN_CAPS, DUONG_TIEN as D, heavenCharge, type Point } from './visual-duong-tien-timeline.js';
interface Charge { at: Vector3; dir: Point; age: number; windup: number; reduced: boolean; lane?: Layer; eye?: Mesh }
export class HeavenCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(scene: Scene, private art: HeavenArt) {
    let serial = 0; this.pool = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'gold', `eye-charge-${serial++}`), DTN_CAPS.charge, 'eye-charge');
  }
  begin(id: string, at: Vector3, dir: Point, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.entries.size < DTN_CAPS.charge) this.entries.set(id, { at: at.clone(), dir, windup, reduced, age: 0 });
  }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.lane) this.pool.release(p.lane); this.art.paint.planes.release(p?.eye); this.entries.delete(id); }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
      const state = heavenCharge(p.age, p.windup, p.reduced); p.lane ??= this.pool.acquire();
      if (p.lane) {
        const { mesh, material: m } = p.lane; mesh.position.set(p.at.x + p.dir.x * D.length / 2, .045, p.at.z + p.dir.z * D.length / 2);
        mesh.rotation.y = -Math.atan2(p.dir.z, p.dir.x); mesh.scaling.set(D.length, 1, D.width * (.4 + .6 * state.scale)); mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
        m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', state.alpha * .4); m.setFloat('uHead', state.head); m.setFloat('uTail', 0); m.setFloat('uWave', 0); m.setFloat('uTaper', .25);
      }
      p.eye ??= this.art.paint.planes.acquire('eye');
      if (p.eye) { this.art.paint.frame(p.eye, 'eye', state.frame); this.art.placeEye(p.eye, p.at, 1.8 * state.scale); p.eye.visibility = state.alpha; }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}


