import type { Scene } from '@babylonjs/core/scene.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { LayerPool, createGroundLayer, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { BlizzardArt } from './visual-ung-long-art.js';
import { UNG_LONG as U, UL_CAPS, frostCharge } from './visual-ung-long-timeline.js';
export function frostLayer(scene: Scene, name: string): Layer {
  const l = createGroundLayer(scene, 'kitGround', 'ice', name);
  for (const [key, rgb] of Object.entries({ uDeep: [.059, .133, .212], uBody: [.176, .36, .525], uEdge: [.435, .663, .847], uFoam: [.8, .914, .969], uInk: [.025, .055, .09] }))
    l.material.setColor3(key, new Color3(rgb[0], rgb[1], rgb[2]));
  return l;
}
interface Charge { at: Vector3; origin?: Vector3; age: number; windup: number; reduced: boolean; layer?: Layer; wings?: Mesh }
export class BlizzardCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(scene: Scene, private art: BlizzardArt) { let i = 0; this.pool = new LayerPool(() => frostLayer(scene, `ice-windup-${i++}`), UL_CAPS.casts, 'ice-windup'); }
  begin(id: string, at: Vector3, origin: Vector3 | undefined, windup: number, reduced: boolean): void {
    this.cancel(id); if (this.entries.size < UL_CAPS.casts) this.entries.set(id, { at: at.clone(), origin: origin?.clone(), age: 0, windup, reduced });
  }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.layer) this.pool.release(p.layer); this.art.paint.planes.release(p?.wings); this.entries.delete(id); }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
      const s = frostCharge(p.age, p.windup, p.reduced); p.layer ??= this.pool.acquire();
      if (p.layer) { const { mesh, material: m } = p.layer; mesh.position.set(p.at.x, .045, p.at.z); mesh.scaling.set(U.radius * 2, 1, U.radius * 2); mesh.alphaIndex = GROUND_ALPHA_INDEX;
        m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', s.alpha * .55); m.setFloat('uFill', s.fill);
        m.setFloat('uRim', .65); m.setFloat('uBand', 0); m.setFloat('uRings', .1); m.setFloat('uSwirl', .5); m.setFloat('uSpiral', .25); }
      if (p.origin) { p.wings ??= this.art.paint.planes.acquire('wings');
        if (p.wings) { this.art.paint.frame(p.wings, 'wings', s.frame); this.art.paint.place(p.wings, 'wings', p.origin, 5.2 * s.scale, 5.2 * s.scale, .2); p.wings.visibility = s.alpha; } }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}
