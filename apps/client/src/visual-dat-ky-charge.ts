import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { createShellLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { farDirection } from './visual-kit-billboard.js';
import { DK_CAPS, foxCharge } from './visual-dat-ky-timeline.js';
import type { FoxArt } from './visual-dat-ky-art.js';
interface Charge { at: Vector3; age: number; windup: number; reduced: boolean; tails?: Mesh; shell?: Layer }
export class FoxCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(private scene: Scene, private art: FoxArt) {
    let serial = 0; this.pool = new LayerPool(() => {
      const layer = createShellLayer(scene, 'peach', `fox-charge-${serial++}`, 16);
      for (const [name, rgb] of Object.entries({ uDeep: [.165, .082, .188], uBody: [.482, .18, .431], uEdge: [.824, .36, .604], uFoam: [.96, .72, .82], uInk: [.055, .025, .075] })) layer.material.setColor3(name, new Color3(rgb[0], rgb[1], rgb[2]));
      return layer;
    }, DK_CAPS.casts, 'fox-charge');
  }
  begin(id: string, at: Vector3, windup: number, reduced: boolean): void { this.cancel(id); if (this.entries.size < DK_CAPS.casts) this.entries.set(id, { at: at.clone(), windup, reduced, age: 0 }); }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.shell) this.pool.release(p.shell); this.art.paint.planes.release(p?.tails); this.entries.delete(id); }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
      const state = foxCharge(p.age, p.windup, p.reduced);
      p.tails ??= this.art.paint.planes.acquire('tails');
      if (p.tails) { this.art.paint.frame(p.tails, 'tails', state.frame); this.art.paint.place(p.tails, 'tails', p.at, 4.8 * state.width, 4.8, .5); p.tails.visibility = state.alpha; }
      p.shell ??= this.pool.acquire();
      if (p.shell) {
        p.shell.mesh.position.copyFrom(p.at.add(farDirection(this.scene).scale(.55))).addInPlace(new Vector3(0, 1.2, 0));
        p.shell.mesh.scaling.set(2.2 * state.width, 2.3 * state.width, 1);
        p.shell.material.setFloat('uTime', p.reduced ? 0 : time); p.shell.material.setFloat('uAlpha', state.alpha * .12); p.shell.material.setFloat('uDissolve', .25);
      }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}
