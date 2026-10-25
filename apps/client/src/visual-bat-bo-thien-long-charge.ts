import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { LayerPool, createGroundLayer, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { DragonArt } from './visual-bat-bo-thien-long-art.js';
import { THIEN_LONG as T, BT_CAPS, dragonCharge, type DragonDirection } from './visual-bat-bo-thien-long-timeline.js';
interface Charge { at: Vector3; dir: DragonDirection; age: number; windup: number; reduced: boolean; layer?: Layer; bow?: Mesh }
export class DragonCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(scene: Scene, private art: DragonArt) { let i = 0; this.pool = new LayerPool(() => {
    const l = createGroundLayer(scene, 'kitLink', 'jade', `dragon-windup-${i++}`);
    for (const [key, c] of Object.entries({ uDeep: [.118, .18, .118], uBody: [.18, .478, .333], uEdge: [.31, .753, .553], uFoam: [1, .949, .761], uInk: [.04, .07, .04] })) l.material.setColor3(key, new Color3(c[0], c[1], c[2])); return l;
  }, BT_CAPS.casts, 'dragon-windup'); }
  begin(id: string, at: Vector3, dir: DragonDirection, windup: number, reduced: boolean): void { this.cancel(id); if (this.entries.size < BT_CAPS.casts) this.entries.set(id, { at: at.clone(), dir, age: 0, windup, reduced }); }
  cancel(id: string): void { const p = this.entries.get(id); if (p?.layer) this.pool.release(p.layer); this.art.paint.planes.release(p?.bow); this.entries.delete(id); }
  tick(dt: number, time: number): void { for (const [id, p] of this.entries) {
    p.age += dt; if (p.age > p.windup + .3) { this.cancel(id); continue; }
    const s = dragonCharge(p.age, p.windup, p.reduced); p.layer ??= this.pool.acquire();
    if (p.layer) { const { mesh, material: m } = p.layer; mesh.position.set(p.at.x + p.dir.x * T.length / 2, .045, p.at.z + p.dir.z * T.length / 2);
      mesh.rotation.y = -Math.atan2(p.dir.z, p.dir.x); mesh.scaling.set(T.length, 1, T.width * (.4 + .6 * s.scale)); mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', s.alpha * .4); m.setFloat('uHead', s.head); m.setFloat('uTail', 0); m.setFloat('uWave', 0); m.setFloat('uTaper', .2); }
    p.bow ??= this.art.paint.planes.acquire('bow'); if (p.bow) { this.art.placeBow(p.bow, p.at, p.dir, 2 * s.scale); this.art.paint.frame(p.bow, 'bow', s.frame); p.bow.visibility *= s.alpha; }
  } }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); }
}
